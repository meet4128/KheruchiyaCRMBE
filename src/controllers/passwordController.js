const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Member = require('../models/Member');
const authTokenService = require('../services/authTokenService');
const passwordService = require('../services/passwordService');
const emailService = require('../services/emailService');
const { messages } = require('../locales');
const { log } = require('../utils/logger');
const { resolveAppBaseUrlFromRequest } = require('../utils/requestBaseUrl');
const { AUTH_TOKEN_PURPOSE } = require('../constants/authTokenPurpose');
const { MEMBER_INVITATION_STATUS } = require('../constants/memberInvitationStatus');

function maskEmail(email) {
  if (typeof email !== 'string') return '';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  if (!user || user.length <= 1) return `*@${domain}`;
  const visible = user[0];
  return `${visible}${'*'.repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

/**
 * GET /api/v1/auth/token/validate?token=...&purpose=invite|reset
 * Public — used by the frontend to render a friendly page before showing the form.
 * Never reveals the full email; returns masked form like "a***@example.com".
 */
const validateTokenQuery = asyncHandler(async (req, res) => {
  const { token: rawToken, purpose } = req.query;

  const token = await authTokenService.verifyToken({ rawToken, purpose });
  const member = await Member.findById(token.userId).select('personalEmail invitationStatus');
  if (!member) {
    throw new AppError(messages.errors.authTokenInvalid, 400);
  }

  res.status(200).json({
    status: 'success',
    data: {
      valid: true,
      purpose,
      email: maskEmail(member.personalEmail),
      expiresAt: token.expiresAt,
    },
  });
});

/**
 * POST /api/v1/auth/set-password
 * Public — completes the invite flow: { token, password } → bcrypt → mark active.
 */
const setPassword = asyncHandler(async (req, res) => {
  const { token: rawToken, password } = req.body;

  const token = await authTokenService.verifyToken({
    rawToken,
    purpose: AUTH_TOKEN_PURPOSE.INVITE,
  });

  const member = await Member.findById(token.userId).select('+passwordHash');
  if (!member) {
    throw new AppError(messages.errors.authTokenInvalid, 400);
  }

  const passwordHash = await passwordService.hashPassword(password);
  member.passwordHash = passwordHash;
  member.invitationStatus = MEMBER_INVITATION_STATUS.ACTIVE;
  member.passwordSetAt = new Date();
  await member.save();

  await authTokenService.consumeToken(token._id);
  await authTokenService.invalidateOtherTokens({
    userId: member._id,
    purpose: AUTH_TOKEN_PURPOSE.INVITE,
    exceptId: token._id,
  });

  log.info(`password.set member=${member._id}`);

  res.status(200).json({
    status: 'success',
    data: { message: messages.auth.passwordSet },
  });
});

/**
 * POST /api/v1/auth/forgot-password { email }
 * Public — ALWAYS returns 200 to prevent email enumeration.
 * If a member exists and is active, issues a 'reset' token and emails the link.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  log.info(`password.reset.requested email=${email}`);

  const ack = () =>
    res.status(200).json({
      status: 'success',
      data: { message: messages.auth.forgotPasswordAck },
    });

  const member = await Member.findOne({ personalEmail: email });
  if (!member) {
    return ack();
  }
  if (member.invitationStatus !== MEMBER_INVITATION_STATUS.ACTIVE) {
    return ack();
  }
  if (member.employmentStatus && member.employmentStatus !== 'active') {
    return ack();
  }

  await authTokenService.invalidateOtherTokens({
    userId: member._id,
    purpose: AUTH_TOKEN_PURPOSE.RESET,
  });

  const { rawToken, doc: tokenDoc } = await authTokenService.issueToken({
    userId: member._id,
    purpose: AUTH_TOKEN_PURPOSE.RESET,
  });

  const link = emailService.buildResetLink(rawToken, resolveAppBaseUrlFromRequest(req));
  try {
    await emailService.sendResetEmail({
      to: member.personalEmail,
      fullName: member.fullName,
      link,
      expiresAt: tokenDoc.expiresAt,
    });
  } catch (err) {
    log.error('password.reset.email.failed', err?.message || err);
  }

  return ack();
});

/**
 * POST /api/v1/auth/reset-password { token, password }
 * Public — completes the forgot-password flow.
 * On success bumps Member.tokenVersion to invalidate all prior JWTs.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token: rawToken, password } = req.body;

  const token = await authTokenService.verifyToken({
    rawToken,
    purpose: AUTH_TOKEN_PURPOSE.RESET,
  });

  const member = await Member.findById(token.userId).select('+passwordHash');
  if (!member) {
    throw new AppError(messages.errors.authTokenInvalid, 400);
  }

  if (member.passwordHash) {
    const same = await passwordService.comparePassword(password, member.passwordHash);
    if (same) {
      throw new AppError(messages.validation.failed, 422, [
        { field: 'password', message: messages.validation.password.sameAsOld },
      ]);
    }
  }

  const passwordHash = await passwordService.hashPassword(password);
  member.passwordHash = passwordHash;
  member.passwordResetAt = new Date();
  member.tokenVersion = (member.tokenVersion || 0) + 1;
  await member.save();

  await authTokenService.consumeToken(token._id);
  await authTokenService.invalidateOtherTokens({
    userId: member._id,
    purpose: AUTH_TOKEN_PURPOSE.RESET,
    exceptId: token._id,
  });

  log.info(`password.reset.completed member=${member._id} tokenVersion=${member.tokenVersion}`);

  res.status(200).json({
    status: 'success',
    data: { message: messages.auth.passwordReset },
  });
});

module.exports = {
  validateTokenQuery,
  setPassword,
  forgotPassword,
  resetPassword,
  maskEmail,
};
