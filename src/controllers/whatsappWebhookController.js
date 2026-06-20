const asyncHandler = require('../utils/asyncHandler');
const { log } = require('../utils/logger');
const whatsappService = require('../services/whatsappService');

/**
 * Meta webhook verification (GET).
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
const verifyWebhook = asyncHandler(async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    return res.sendStatus(503);
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/**
 * Meta webhook events (POST). Respond immediately; process async.
 */
const receiveWebhook = asyncHandler(async (req, res) => {
  log.info('[WhatsApp webhook] POST received', {
    object: req.body?.object,
    entries: req.body?.entry?.length ?? 0,
  });
  res.sendStatus(200);

  const body = req.body;
  setImmediate(() => {
    whatsappService.processInboundWebhook(body).catch((err) => {
      log.error('[WhatsApp webhook] process error', err);
    });
  });
});

module.exports = { verifyWebhook, receiveWebhook };
