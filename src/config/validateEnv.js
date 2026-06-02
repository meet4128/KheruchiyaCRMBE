/**
 * Production email/auth env checks — logs clear warnings at startup (no secrets).
 */

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/** APP_BASE_URL first; PUBLIC_BASE_URL is accepted as fallback (same host on many deployments). */
function normalizeEnvBaseUrl(url) {
  let base = String(url).trim().replace(/\/+$/, '');
  if (isProduction() && base.startsWith('http://') && !/localhost|127\.0\.0\.1/i.test(base)) {
    base = `https://${base.slice('http://'.length)}`;
  }
  return base;
}

function resolveAppBaseUrl() {
  const candidates = [process.env.APP_BASE_URL, process.env.PUBLIC_BASE_URL];
  for (const value of candidates) {
    if (value && String(value).trim()) {
      return normalizeEnvBaseUrl(value);
    }
  }
  return null;
}

function getEmailConfigStatus() {
  const missing = [];
  if (!process.env.RESEND_API_KEY || !String(process.env.RESEND_API_KEY).trim()) {
    missing.push('RESEND_API_KEY');
  }
  const appBaseUrl = resolveAppBaseUrl();
  if (!appBaseUrl) {
    missing.push('APP_BASE_URL');
  }
  if (!process.env.EMAIL_FROM || !String(process.env.EMAIL_FROM).trim()) {
    missing.push('EMAIL_FROM');
  }

  return {
    configured: missing.length === 0,
    missing,
    appBaseUrl,
    appBaseUrlSource: appBaseUrl
      ? process.env.APP_BASE_URL?.trim()
        ? 'APP_BASE_URL'
        : 'PUBLIC_BASE_URL'
      : null,
    emailFromSet: Boolean(process.env.EMAIL_FROM && String(process.env.EMAIL_FROM).trim()),
    resendKeySet: Boolean(process.env.RESEND_API_KEY && String(process.env.RESEND_API_KEY).trim()),
  };
}

function logProductionEnvWarnings() {
  if (!isProduction()) return;

  const email = getEmailConfigStatus();
  if (!email.configured) {
    console.error(
      '[config] PRODUCTION email env incomplete (missing:',
      email.missing.join(', '),
      '). Invite/resend can still use the request Host header if APP_BASE_URL is missing — set APP_BASE_URL on the server for reliability.'
    );
  } else {
    console.log('[config] Production email config OK (RESEND_API_KEY, APP_BASE_URL, EMAIL_FROM).');
    console.log('[config] Invite links will use:', email.appBaseUrl);
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.error('[config] JWT_SECRET and JWT_REFRESH_SECRET are required in production.');
  }
}

module.exports = {
  isProduction,
  resolveAppBaseUrl,
  getEmailConfigStatus,
  logProductionEnvWarnings,
};
