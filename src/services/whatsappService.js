const { log } = require('../utils/logger');
const AppError = require('../utils/AppError');

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

/**
 * Async processing after webhook 200 (logging; extend with DB / realtime later).
 * @param {object} body - Parsed webhook JSON
 * @returns {Promise<void>}
 */
const processInboundWebhook = async (body) => {
  const messages = parseInboundMessages(body);
  for (const m of messages) {
    log.info('[WhatsApp inbound]', { id: m.id, from: m.from, preview: m.text.slice(0, 120) });
  }
  if (messages.length === 0 && body?.entry?.length) {
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
 * Sends a plain text WhatsApp message via Cloud API.
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

  return data;
};

module.exports = {
  parseInboundMessages,
  processInboundWebhook,
  sendTextMessage,
};
