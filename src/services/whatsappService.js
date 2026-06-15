const WhatsappMessage = require('../models/WhatsappMessage');
const { WHATSAPP_MESSAGE_DIRECTION } = require('../constants/whatsappMessageDirection');
const { AMENDMENT_MESSAGE_TYPE } = require('../constants/amendmentMessageType');
const amendmentService = require('./amendmentService');
const { storeInboundMedia } = require('../utils/whatsappInboundMedia');
const { log } = require('../utils/logger');
const AppError = require('../utils/AppError');

const MAX_LIMIT = 100;

const waTimestampFromUnix = (timestamp) => {
  if (!timestamp) return undefined;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000);
};

const publicBaseUrl = () => {
  const base = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  return base;
};

const resolvePublicUrl = (mediaUrl) => {
  if (!mediaUrl) return null;
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  const base = publicBaseUrl();
  if (!base) {
    throw new AppError(
      'PUBLIC_BASE_URL is required to send document/image messages via WhatsApp',
      503
    );
  }
  const path = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`;
  return `${base}${path}`;
};

/**
 * @param {object} body
 * @returns {Array<object>}
 */
const parseInboundMessages = (body) => {
  const results = [];
  if (!body || body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
    return results;
  }

  for (const entry of body.entry) {
    const changes = entry?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (change?.field !== 'messages' || !change.value) continue;
      const messages = change.value.messages;
      if (!Array.isArray(messages)) continue;

      for (const msg of messages) {
        const base = {
          id: msg.id,
          from: msg.from,
          timestamp: String(msg.timestamp ?? ''),
        };

        if (msg?.type === 'text' && msg.text?.body != null) {
          results.push({
            ...base,
            type: AMENDMENT_MESSAGE_TYPE.TEXT,
            text: msg.text.body,
          });
        } else if (msg?.type === 'document' && msg.document) {
          results.push({
            ...base,
            type: AMENDMENT_MESSAGE_TYPE.DOCUMENT,
            text: msg.document.caption || '',
            fileName: msg.document.filename,
            mimeType: msg.document.mime_type,
            mediaId: msg.document.id,
          });
        } else if (msg?.type === 'image' && msg.image) {
          results.push({
            ...base,
            type: AMENDMENT_MESSAGE_TYPE.IMAGE,
            text: msg.image.caption || '',
            mimeType: msg.image.mime_type,
            mediaId: msg.image.id,
          });
        }
      }
    }
  }

  return results;
};

/**
 * @param {object} body
 * @returns {Array<{ wamid: string, status: string, recipientId?: string, timestamp?: string, errors?: object[] }>}
 */
const parseDeliveryStatuses = (body) => {
  const results = [];
  if (!body || body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
    return results;
  }

  for (const entry of body.entry) {
    const changes = entry?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (change?.field !== 'messages' || !change.value) continue;
      const statuses = change.value.statuses;
      if (!Array.isArray(statuses)) continue;

      for (const status of statuses) {
        if (!status?.id || !status?.status) continue;
        results.push({
          wamid: status.id,
          status: status.status,
          recipientId: status.recipient_id,
          timestamp: String(status.timestamp ?? ''),
          errors: status.errors,
        });
      }
    }
  }

  return results;
};

const formatDeliveryError = (errors) => {
  const first = errors?.[0];
  if (!first) return undefined;
  const code = first.code != null ? String(first.code) : '';
  const detail = first.message || first.title || first.error_data?.details || 'Delivery failed';
  return code ? `${code}: ${detail}` : detail;
};

const applyDeliveryStatuses = async (statuses) => {
  for (const s of statuses) {
    const deliveryError = s.status === 'failed' ? formatDeliveryError(s.errors) : undefined;

    await WhatsappMessage.findOneAndUpdate(
      { wamid: s.wamid },
      {
        $set: {
          deliveryStatus: s.status,
          statusUpdatedAt: waTimestampFromUnix(s.timestamp) || new Date(),
          ...(deliveryError ? { deliveryError } : {}),
        },
      }
    );

    if (s.status === 'failed') {
      log.error('[WhatsApp delivery failed]', {
        wamid: s.wamid,
        recipient: s.recipientId,
        error: deliveryError,
        errors: s.errors,
      });
    } else {
      log.info('[WhatsApp delivery status]', {
        wamid: s.wamid,
        status: s.status,
        recipient: s.recipientId,
      });
    }
  }
};

const buildWhatsappMessageFields = (m) => ({
  wamid: m.id,
  direction: WHATSAPP_MESSAGE_DIRECTION.INBOUND,
  peerPhone: m.from,
  type: m.type,
  text: m.text || '',
  mediaUrl: m.mediaUrl,
  fileName: m.fileName,
  mimeType: m.mimeType,
  waTimestamp: waTimestampFromUnix(m.timestamp),
});

const persistGlobalWhatsappMessage = async (m) => {
  await WhatsappMessage.findOneAndUpdate(
    { wamid: m.id },
    { $setOnInsert: buildWhatsappMessageFields(m) },
    { upsert: true }
  );
};

const persistInboundToAmendmentSession = async (m, active) => {
  if (!active) return false;

  await amendmentService.saveSessionMessage({
    inquiryId: active.inquiryId,
    sessionId: active.sessionId,
    direction: WHATSAPP_MESSAGE_DIRECTION.INBOUND,
    senderType: 'customer',
    type: m.type,
    text: m.text || '',
    mediaUrl: m.mediaUrl,
    fileName: m.fileName,
    mimeType: m.mimeType,
    wamid: m.id,
    peerPhone: m.from,
    waTimestamp: waTimestampFromUnix(m.timestamp),
  });
  return true;
};

const enrichInboundMedia = async (m, active) => {
  if (!m.mediaId) {
    return m;
  }

  try {
    const stored = await storeInboundMedia({
      mediaId: m.mediaId,
      mimeType: m.mimeType,
      fileName: m.fileName,
      peerPhone: m.from,
      inquiryId: active?.inquiryId,
      sessionId: active?.sessionId,
    });
    return { ...m, ...stored };
  } catch (err) {
    log.error('[WhatsApp media] inbound download failed', {
      mediaId: m.mediaId,
      from: m.from,
      message: err.message,
    });
    return m;
  }
};

const persistInboundMessages = async (messages) => {
  for (const m of messages) {
    const active = await amendmentService.findActiveSessionByPeer(m.from);
    const enriched = await enrichInboundMedia(m, active);
    await persistGlobalWhatsappMessage(enriched);
    await persistInboundToAmendmentSession(enriched, active);
  }
};

const persistOutboundMessage = async ({
  wamid,
  to,
  text,
  type = 'text',
  mediaUrl,
  fileName,
  mimeType,
}) => {
  await WhatsappMessage.findOneAndUpdate(
    { wamid },
    {
      $setOnInsert: {
        wamid,
        direction: WHATSAPP_MESSAGE_DIRECTION.OUTBOUND,
        peerPhone: to,
        type,
        text: text || '',
        mediaUrl,
        fileName,
        mimeType,
        waTimestamp: new Date(),
      },
    },
    { upsert: true }
  );
};

const processInboundWebhook = async (body) => {
  const statuses = parseDeliveryStatuses(body);
  if (statuses.length > 0) {
    await applyDeliveryStatuses(statuses);
  }

  const messages = parseInboundMessages(body);
  if (messages.length > 0) {
    await persistInboundMessages(messages);
    for (const m of messages) {
      log.info('[WhatsApp inbound]', {
        id: m.id,
        from: m.from,
        type: m.type,
        preview: (m.text || m.fileName || '').slice(0, 120),
      });
    }
    return;
  }

  if (statuses.length > 0) {
    return;
  }

  if (body?.entry?.length) {
    log.info('[WhatsApp webhook] received unsupported or empty messages payload');
  }
};

const graphMessagesUrl = () => {
  const version = process.env.WHATSAPP_API_VERSION || 'v25.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new AppError('WhatsApp phone number ID is not configured', 503);
  }
  return `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
};

const buildGraphBody = ({ to, type, text, mediaUrl, fileName }) => {
  const base = { messaging_product: 'whatsapp', to };

  if (type === AMENDMENT_MESSAGE_TYPE.TEXT) {
    return { ...base, type: 'text', text: { body: text } };
  }

  const link = resolvePublicUrl(mediaUrl);
  if (type === AMENDMENT_MESSAGE_TYPE.DOCUMENT) {
    return {
      ...base,
      type: 'document',
      document: {
        link,
        caption: text || undefined,
        filename: fileName || undefined,
      },
    };
  }
  if (type === AMENDMENT_MESSAGE_TYPE.IMAGE) {
    return {
      ...base,
      type: 'image',
      image: {
        link,
        caption: text || undefined,
      },
    };
  }

  throw new AppError('Unsupported WhatsApp message type', 422);
};

/**
 * @param {{ to: string, type?: string, text?: string, sessionId?: string, inquiryId?: string, mediaUrl?: string, fileName?: string, userId?: string }} params
 */
const sendMessage = async ({
  to,
  type = AMENDMENT_MESSAGE_TYPE.TEXT,
  text = '',
  sessionId,
  inquiryId,
  mediaUrl,
  fileName,
  userId,
}) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    throw new AppError('WhatsApp access token is not configured', 503);
  }

  if (type !== AMENDMENT_MESSAGE_TYPE.TEXT && !mediaUrl) {
    throw new AppError('mediaUrl is required for document or image messages', 422);
  }

  if (sessionId && inquiryId && userId) {
    await amendmentService.registerActiveSession(inquiryId, sessionId, to, userId);
  }

  const url = graphMessagesUrl();
  const graphBody = buildGraphBody({ to, type, text, mediaUrl, fileName });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(graphBody),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data?.error?.message || res.statusText || 'Graph API error';
    throw new AppError(
      `WhatsApp send failed: ${detail}`,
      res.status >= 400 && res.status < 600 ? 502 : 502
    );
  }

  const wamid = data?.messages?.[0]?.id;
  if (wamid) {
    log.info('[WhatsApp send accepted by Meta]', { wamid, to, type });
    await persistOutboundMessage({ wamid, to, text, type, mediaUrl, fileName });
    if (sessionId && inquiryId) {
      await amendmentService.saveSessionMessage({
        inquiryId,
        sessionId,
        direction: WHATSAPP_MESSAGE_DIRECTION.OUTBOUND,
        senderType: 'employee',
        type,
        text: text || '',
        mediaUrl,
        fileName,
        mimeType: undefined,
        wamid,
        peerPhone: to,
        createdBy: userId,
        waTimestamp: new Date(),
      });
    }
  }

  return data;
};

const sendTextMessage = async ({ to, text, sessionId, inquiryId, userId }) =>
  sendMessage({
    to,
    type: AMENDMENT_MESSAGE_TYPE.TEXT,
    text,
    sessionId,
    inquiryId,
    userId,
  });

const getConversations = async (queryParams = {}) => {
  const { page = 1, limit = 10, search } = queryParams;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const matchStage = {};
  if (search) {
    const sanitized = String(search)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    matchStage.peerPhone = new RegExp(sanitized);
  }

  const pipeline = [
    ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$peerPhone',
        peerPhone: { $first: '$peerPhone' },
        lastMessage: { $first: '$$ROOT' },
        lastActivityAt: { $first: '$createdAt' },
        messageCount: { $sum: 1 },
      },
    },
    { $sort: { lastActivityAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: 'totalItems' }],
        items: [{ $skip: skip }, { $limit: limitNum }],
      },
    },
  ];

  const [result] = await WhatsappMessage.aggregate(pipeline);
  const totalItems = result?.metadata?.[0]?.totalItems ?? 0;
  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    items: result?.items ?? [],
    page: pageNum,
    limit: limitNum,
    totalItems,
    totalPages,
  };
};

const MESSAGE_SORT_FIELDS = ['createdAt', 'waTimestamp'];

const getMessagesByPeer = async (peerPhone, queryParams = {}) => {
  const { page = 1, limit = 50, sort = 'createdAt' } = queryParams;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const rawSort = String(sort || '').trim();
  const direction = rawSort.startsWith('-') ? -1 : 1;
  const field = rawSort.replace(/^-/, '').trim() || 'createdAt';
  const safeSort = MESSAGE_SORT_FIELDS.includes(field) ? { [field]: direction } : { createdAt: 1 };

  const filter = { peerPhone };

  const [items, totalItems] = await Promise.all([
    WhatsappMessage.find(filter).skip(skip).limit(limitNum).sort(safeSort).lean(),
    WhatsappMessage.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    items,
    peerPhone,
    page: pageNum,
    limit: limitNum,
    totalItems,
    totalPages,
  };
};

module.exports = {
  parseInboundMessages,
  parseDeliveryStatuses,
  persistInboundMessages,
  persistOutboundMessage,
  applyDeliveryStatuses,
  processInboundWebhook,
  sendMessage,
  sendTextMessage,
  getConversations,
  getMessagesByPeer,
};
