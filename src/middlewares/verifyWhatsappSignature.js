const crypto = require('crypto');
const { log } = require('../utils/logger');

function isHubSignatureValid(expectedHex, receivedHex) {
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(receivedHex, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Validates Meta `X-Hub-Signature-256` against raw body (requires `req.rawBody` from express.json verify).
 * When WHATSAPP_APP_SECRET is unset, verification is skipped (local/dev only — set secret in production).
 */
const verifyWhatsappSignature = (req, res, next) => {
  const appSecret = (process.env.WHATSAPP_APP_SECRET || '').trim();

  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      log.warn('WHATSAPP_APP_SECRET is not set; webhook signatures are not verified');
    }
    return next();
  }

  const signature = req.get('X-Hub-Signature-256');
  if (!signature || !signature.startsWith('sha256=')) {
    log.warn('[WhatsApp webhook] rejected: missing X-Hub-Signature-256 header');
    return res.sendStatus(403);
  }

  const rawBody = req.rawBody;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    log.warn('[WhatsApp webhook] rejected: raw body not available for signature check');
    return res.sendStatus(403);
  }

  const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const receivedHex = signature.slice('sha256='.length);

  if (!isHubSignatureValid(expectedHex, receivedHex)) {
    log.warn(
      '[WhatsApp webhook] rejected: signature mismatch (check WHATSAPP_APP_SECRET matches Meta App Secret)'
    );
    return res.sendStatus(403);
  }

  return next();
};

module.exports = verifyWhatsappSignature;
