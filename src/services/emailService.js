const { log } = require('../utils/logger');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

const APP_NAME = 'Kheruchiya CRM';
const INVITE_PATH = '/set-password';
const RESET_PATH = '/reset-password';
const DEFAULT_FROM = 'Kheruchiya CRM <no-reply@example.com>';

let resendClient = null;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getFrom() {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

function getAppBaseUrl() {
  const base = process.env.APP_BASE_URL;
  if (!base || base.trim() === '') {
    if (isProduction()) {
      throw new AppError(messages.config.appBaseUrlRequired, 500);
    }
    return 'http://localhost:3000';
  }
  return base.replace(/\/+$/, '');
}

function buildInviteLink(rawToken) {
  return `${getAppBaseUrl()}${INVITE_PATH}?token=${encodeURIComponent(rawToken)}`;
}

function buildResetLink(rawToken) {
  return `${getAppBaseUrl()}${RESET_PATH}?token=${encodeURIComponent(rawToken)}`;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim() === '') {
    if (isProduction()) {
      throw new AppError(messages.config.resendApiKeyRequired, 500);
    }
    return null;
  }
  if (!resendClient) {
    const { Resend } = require('resend');
    resendClient = new Resend(key);
  }
  return resendClient;
}

function resetClientForTests() {
  resendClient = null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inviteTemplate({ fullName, link, expiresAt }) {
  const safeName = escapeHtml(fullName || 'there');
  const safeLink = escapeHtml(link);
  const expiresLine = expiresAt
    ? `<p style="color:#555">This link expires on <strong>${escapeHtml(expiresAt.toUTCString())}</strong>.</p>`
    : '';
  const subject = `Welcome to ${APP_NAME} — set your password`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">
      <p>Hi ${safeName},</p>
      <p>An admin has created an account for you on <strong>${APP_NAME}</strong>.</p>
      <p>Click the button below to set your password and activate your account:</p>
      <p>
        <a href="${safeLink}" style="background:#1f6feb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">
          Set your password
        </a>
      </p>
      <p>If the button does not work, paste this link into your browser:</p>
      <p style="word-break:break-all"><a href="${safeLink}">${safeLink}</a></p>
      ${expiresLine}
      <p style="color:#888;font-size:12px">If you did not expect this email, you can safely ignore it.</p>
    </div>
  `;
  const text = `Hi ${fullName || 'there'},\n\nAn admin has created an account for you on ${APP_NAME}.\nSet your password: ${link}\n${expiresAt ? `This link expires on ${expiresAt.toUTCString()}.\n` : ''}\nIf you did not expect this email, ignore it.`;
  return { subject, html, text };
}

function resetTemplate({ fullName, link, expiresAt }) {
  const safeName = escapeHtml(fullName || 'there');
  const safeLink = escapeHtml(link);
  const expiresLine = expiresAt
    ? `<p style="color:#555">This link expires on <strong>${escapeHtml(expiresAt.toUTCString())}</strong>.</p>`
    : '';
  const subject = `${APP_NAME} — reset your password`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">
      <p>Hi ${safeName},</p>
      <p>We received a request to reset your <strong>${APP_NAME}</strong> password.</p>
      <p>Click the button below to choose a new password:</p>
      <p>
        <a href="${safeLink}" style="background:#1f6feb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">
          Reset password
        </a>
      </p>
      <p>If the button does not work, paste this link into your browser:</p>
      <p style="word-break:break-all"><a href="${safeLink}">${safeLink}</a></p>
      ${expiresLine}
      <p style="color:#888;font-size:12px">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;
  const text = `Hi ${fullName || 'there'},\n\nWe received a request to reset your ${APP_NAME} password.\nReset link: ${link}\n${expiresAt ? `This link expires on ${expiresAt.toUTCString()}.\n` : ''}\nIf you did not request this, ignore the email.`;
  return { subject, html, text };
}

async function deliver({ to, subject, html, text, kind }) {
  const client = getResend();
  if (!client) {
    log.info(`[email:${kind}] (dev fallback — no RESEND_API_KEY) to=${to} subject="${subject}"`);
    log.info(`[email:${kind}] text body:\n${text}`);
    return { id: null, devFallback: true };
  }

  try {
    const result = await client.emails.send({
      from: getFrom(),
      to,
      subject,
      html,
      text,
    });
    log.info(`[email:${kind}] sent to=${to} id=${result?.data?.id || result?.id || 'unknown'}`);
    return { id: result?.data?.id || result?.id || null, devFallback: false };
  } catch (err) {
    log.error(`[email:${kind}] send failed`, err?.message || err);
    throw new AppError(messages.errors.emailSendFailed, 502);
  }
}

async function sendInviteEmail({ to, fullName, link, expiresAt } = {}) {
  if (!to) throw new AppError(messages.errors.emailRecipientRequired, 400);
  if (!link) throw new AppError(messages.errors.emailLinkRequired, 400);
  const tpl = inviteTemplate({ fullName, link, expiresAt });
  return deliver({ to, ...tpl, kind: 'invite' });
}

async function sendResetEmail({ to, fullName, link, expiresAt } = {}) {
  if (!to) throw new AppError(messages.errors.emailRecipientRequired, 400);
  if (!link) throw new AppError(messages.errors.emailLinkRequired, 400);
  const tpl = resetTemplate({ fullName, link, expiresAt });
  return deliver({ to, ...tpl, kind: 'reset' });
}

module.exports = {
  sendInviteEmail,
  sendResetEmail,
  buildInviteLink,
  buildResetLink,
  getAppBaseUrl,
  resetClientForTests,
};
