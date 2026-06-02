const { resolveAppBaseUrl } = require('../config/validateEnv');
const { log } = require('./logger');

/**
 * Resolves public base URL for email links: env first, then incoming request Host
 * (for cPanel/BigRock when APP_BASE_URL is not injected into process.env).
 */
function resolveAppBaseUrlFromRequest(req) {
  const fromEnv = resolveAppBaseUrl();
  if (fromEnv) return fromEnv;
  if (!req) return null;

  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  if (!host || /^localhost(:\d+)?$/i.test(host) || host.startsWith('127.0.0.1')) {
    return null;
  }

  const proto = (req.get('x-forwarded-proto') || (req.secure ? 'https' : req.protocol) || 'https')
    .split(',')[0]
    .trim();

  const base = `${proto}://${host}`.replace(/\/+$/, '');

  if (process.env.NODE_ENV === 'production') {
    log.warn(
      `[config] APP_BASE_URL not set — using request host for email links: ${base}. Set APP_BASE_URL in hosting env for reliability.`
    );
  }

  return base;
}

module.exports = { resolveAppBaseUrlFromRequest };
