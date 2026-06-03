/**
 * HTTP / reverse-proxy timeout settings (env-driven).
 * Align nginx proxy_read_timeout with HTTP_REQUEST_TIMEOUT_MS.
 */

const DEFAULT_REQUEST_MS = 120_000; // 2 min — API JSON + DB
const DEFAULT_WEBHOOK_MS = 180_000; // 3 min — inbound WhatsApp + media fetch
const DEFAULT_SERVER_SOCKET_MS = 125_000; // slightly above request timeout
const MIN_MS = 5_000;
const MAX_MS = 600_000;

function parseMs(value, fallback) {
  const n = parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, MIN_MS), MAX_MS);
}

function getRequestTimeoutMs() {
  return parseMs(process.env.HTTP_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_MS);
}

function getWebhookRequestTimeoutMs() {
  return parseMs(process.env.HTTP_WEBHOOK_REQUEST_TIMEOUT_MS, DEFAULT_WEBHOOK_MS);
}

function getServerSocketTimeoutMs() {
  return parseMs(process.env.HTTP_SERVER_TIMEOUT_MS, DEFAULT_SERVER_SOCKET_MS);
}

function getTrustProxySetting() {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw === undefined || raw === '') {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const hops = parseInt(raw, 10);
  return Number.isFinite(hops) && hops >= 0 ? hops : 1;
}

module.exports = {
  getRequestTimeoutMs,
  getWebhookRequestTimeoutMs,
  getServerSocketTimeoutMs,
  getTrustProxySetting,
  DEFAULT_REQUEST_MS,
  DEFAULT_WEBHOOK_MS,
};
