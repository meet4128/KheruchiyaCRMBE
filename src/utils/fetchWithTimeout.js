const AppError = require('./AppError');
const { getOutboundFetchTimeoutMs } = require('../config/httpTimeouts');

/**
 * Wrapper around global fetch that aborts after a bounded timeout.
 *
 * Without this, a slow or unreachable upstream (e.g. Meta Graph API) keeps the
 * request open until nginx / Cloudflare time out and return an opaque 502/504.
 * Here it fails fast as an operational AppError so the API responds with clean
 * JSON and the worker is freed.
 *
 * @param {string} url
 * @param {RequestInit} [options] Passed through to fetch (do not set `signal`; it is managed here).
 * @param {{ timeoutMs?: number, label?: string }} [config]
 * @returns {Promise<Response>}
 */
const fetchWithTimeout = async (url, options = {}, { timeoutMs, label = 'Upstream' } = {}) => {
  const limit = timeoutMs ?? getOutboundFetchTimeoutMs();

  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(limit) });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new AppError(`${label} request timed out after ${limit}ms`, 504);
    }
    throw new AppError(`${label} request failed: ${err.message}`, 502);
  }
};

module.exports = fetchWithTimeout;
