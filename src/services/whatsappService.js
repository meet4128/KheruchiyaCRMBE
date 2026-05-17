const WhatsappMessage = require('../models/WhatsappMessage');
const { WHATSAPP_MESSAGE_DIRECTION } = require('../constants/whatsappMessageDirection');
const { log } = require('../utils/logger');
const AppError = require('../utils/AppError');

const MAX_LIMIT = 100;

/**
 * Walks WhatsApp Cloud API webhook payload and returns normalized inbound text messages.
 * @param {object} body - Parsed JSON body
 * @returns {Array<{ id: string, from: string, text: string, timestamp: string }>}
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
        if (msg?.type === 'text' && msg.text?.body != null) {
          results.push({
            id: msg.id,
            from: msg.from,
            text: msg.text.body,
            timestamp: String(msg.timestamp ?? ''),
          });
        }
      }
    }
  }

  return results;
};

const waTimestampFromUnix = (timestamp) => {
  if (!timestamp) return undefined;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000);
};

/**
 * Persists inbound messages (idempotent on wamid).
 * @param {Array<{ id: string, from: string, text: string, timestamp: string }>} messages
 */
const persistInboundMessages = async (messages) => {
  for (const m of messages) {
    await WhatsappMessage.findOneAndUpdate(
      { wamid: m.id },
      {
        $setOnInsert: {
          wamid: m.id,
          direction: WHATSAPP_MESSAGE_DIRECTION.INBOUND,
          peerPhone: m.from,
          type: 'text',
          text: m.text,
          waTimestamp: waTimestampFromUnix(m.timestamp),
        },
      },
      { upsert: true }
    );
  }
};

/**
 * Persists outbound message after Graph API accept.
 * @param {{ wamid: string, to: string, text: string }} params
 */
const persistOutboundMessage = async ({ wamid, to, text }) => {
  await WhatsappMessage.findOneAndUpdate(
    { wamid },
    {
      $setOnInsert: {
        wamid,
        direction: WHATSAPP_MESSAGE_DIRECTION.OUTBOUND,
        peerPhone: to,
        type: 'text',
        text,
        waTimestamp: new Date(),
      },
    },
    { upsert: true }
  );
};

/**
 * Async processing after webhook 200 — persist + log.
 * @param {object} body - Parsed webhook JSON
 * @returns {Promise<void>}
 */
const processInboundWebhook = async (body) => {
  const messages = parseInboundMessages(body);
  if (messages.length > 0) {
    await persistInboundMessages(messages);
    for (const m of messages) {
      log.info('[WhatsApp inbound]', { id: m.id, from: m.from, preview: m.text.slice(0, 120) });
    }
    return;
  }
  if (body?.entry?.length) {
    log.info('[WhatsApp webhook] received non-text or empty messages payload');
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

/**
 * Sends a plain text WhatsApp message via Cloud API and persists on success.
 * @param {{ to: string, text: string }} params - `to` = E.164 without leading +
 * @returns {Promise<object>} Graph API JSON (message id, etc.)
 */
const sendTextMessage = async ({ to, text }) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    throw new AppError('WhatsApp access token is not configured', 503);
  }

  const url = graphMessagesUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
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
    await persistOutboundMessage({ wamid, to, text });
  }

  return data;
};

/**
 * Lists WhatsApp conversations (one row per peer phone, latest message first).
 * @param {Object} queryParams
 * @returns {Promise<{ items: object[], page: number, limit: number, totalItems: number, totalPages: number }>}
 */
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

/**
 * Message thread for a single peer phone.
 * @param {string} peerPhone
 * @param {Object} queryParams
 */
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
  persistInboundMessages,
  persistOutboundMessage,
  processInboundWebhook,
  sendTextMessage,
  getConversations,
  getMessagesByPeer,
};
