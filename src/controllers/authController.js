const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const Member = require('../models/Member');
const passwordService = require('../services/passwordService');
const generateTokenPair = require('../utils/generateToken').generateTokenPair;
const {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  getAccessTokenExpiresInSeconds,
} = require('../utils/jwtUtils');
const { messages } = require('../locales');
const { log } = require('../utils/logger');
const { MEMBER_INVITATION_STATUS } = require('../constants/memberInvitationStatus');
const {
  AUTH_ROLE,
  AUTH_ROLE_VALUES,
  ACCOUNT_DEPARTMENT_ALIASES,
} = require('../constants/authRole');

const ALLOWED_LOGIN_ROLES = AUTH_ROLE_VALUES;

/**
 * Derives the JWT role from a Member's departmentRoles[] (case-insensitive).
 * Maps department → role using the canonical table in constants/authRole.js.
 * First-match wins; fallback is `user`.
 */
function deriveRoleFromMember(member) {
  const roles = Array.isArray(member?.departmentRoles) ? member.departmentRoles : [];
  for (const r of roles) {
    const d = String(r?.department || '')
      .trim()
      .toLowerCase();
    if (!d) continue;
    if (d === 'admin') return AUTH_ROLE.ADMIN;
    if (d === 'sales') return AUTH_ROLE.SALES;
    if (d === 'purchase') return AUTH_ROLE.PURCHASE;
    if (ACCOUNT_DEPARTMENT_ALIASES.has(d)) return AUTH_ROLE.ACCOUNT;
  }
  return AUTH_ROLE.USER;
}

function memberCanLogIn(member) {
  if (!member) return false;
  if (member.invitationStatus !== MEMBER_INVITATION_STATUS.ACTIVE) return false;
  if (member.employmentStatus && member.employmentStatus !== 'active') return false;
  if (!member.passwordHash) return false;
  return true;
}

async function realLogin(req, res, { email, password }) {
  const member = await Member.findOne({ personalEmail: String(email).toLowerCase().trim() }).select(
    '+passwordHash +tokenVersion departmentRoles invitationStatus employmentStatus fullName personalEmail'
  );

  if (!memberCanLogIn(member)) {
    log.warn(`login.failed reason=ineligible email=${email}`);
    return res.status(401).json({
      status: 'fail',
      data: { message: messages.auth.invalidCredentials },
    });
  }

  const ok = await passwordService.comparePassword(password, member.passwordHash);
  if (!ok) {
    log.warn(`login.failed reason=badPassword email=${email}`);
    return res.status(401).json({
      status: 'fail',
      data: { message: messages.auth.invalidCredentials },
    });
  }

  const role = deriveRoleFromMember(member);
  // Absolute session deadline: the client must re-authenticate 15 min after login.
  // Both tokens carry it and expire at it, and refresh-token refuses to extend past it.
  const expiresIn = getAccessTokenExpiresInSeconds();
  const sessionExp = Math.floor(Date.now() / 1000) + expiresIn;
  const userPayload = {
    id: String(member._id),
    email: member.personalEmail,
    role,
    tokenVersion: member.tokenVersion || 0,
    sessionExp,
  };
  const accessToken = signAccessToken(userPayload);
  const refreshToken = signRefreshToken(userPayload, { expiresIn });

  member.lastLoginAt = new Date();
  await member.save();

  log.info(`login.success member=${member._id} role=${role}`);

  return res.status(200).json({
    status: 'success',
    data: {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: userPayload.id,
        email: userPayload.email,
        role: userPayload.role,
        fullName: member.fullName,
        invitationStatus: member.invitationStatus,
      },
    },
  });
}

function devLogin(req, res) {
  const { userId = 'dev-user', email = 'dev@example.com', role = 'user' } = req.body || {};
  const normalizedRole = String(role).trim().toLowerCase();

  if (!ALLOWED_LOGIN_ROLES.includes(normalizedRole)) {
    return res.status(422).json({
      status: 'fail',
      data: {
        message: messages.auth.invalidRole,
        allowedRoles: ALLOWED_LOGIN_ROLES,
      },
    });
  }

  const userPayload = { id: userId, email, role: normalizedRole };
  const { accessToken, refreshToken, expiresIn } = generateTokenPair(userPayload);

  return res.status(200).json({
    status: 'success',
    data: {
      accessToken,
      refreshToken,
      expiresIn,
      user: userPayload,
    },
  });
}

/**
 * POST /api/v1/auth/login
 *
 * Dual-mode:
 *   - Real auth: { email, password } → looks up Member, bcrypt-verifies, returns tokens with tokenVersion.
 *   - Dev stub:  { userId, email?, role? } (no password) → synthetic tokens, NODE_ENV !== 'production' only.
 *     Used by existing integration tests and local development. Rejected in production.
 */
const login = asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (typeof body.password === 'string' && body.password.length > 0) {
    return realLogin(req, res, body);
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      status: 'error',
      message: messages.auth.loginNotImplemented,
    });
  }

  return devLogin(req, res);
});

/**
 * POST /api/v1/auth/refresh-token
 * Verifies the refresh token AND (if it carries tokenVersion + member-shaped id)
 * compares against the Member's current tokenVersion. Stale tokens → 401.
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body || {};

  if (!token) {
    return res.status(400).json({
      status: 'fail',
      data: { message: messages.auth.refreshTokenRequired },
    });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (_err) {
    return res.status(401).json({
      status: 'fail',
      data: { message: messages.auth.invalidOrExpiredRefreshToken },
    });
  }

  if (decoded.type !== 'refresh') {
    return res.status(401).json({
      status: 'fail',
      data: { message: messages.auth.invalidRefreshToken },
    });
  }

  // Absolute 15-min session window — a refresh token may rotate the access token
  // but never extend the session past the original login deadline. Past it → re-login.
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof decoded.sessionExp === 'number' && nowSec >= decoded.sessionExp) {
    log.warn(`refresh.rejected reason=sessionExpired`);
    return res.status(401).json({
      status: 'fail',
      data: { message: messages.auth.sessionExpired, code: 'SESSION_EXPIRED' },
    });
  }

  // tokenVersion check — only applies to real members (id is a Mongo ObjectId AND payload has tokenVersion)
  const idIsObjectId =
    typeof decoded.id === 'string' && mongoose.Types.ObjectId.isValid(decoded.id);
  if (idIsObjectId && Object.prototype.hasOwnProperty.call(decoded, 'tokenVersion')) {
    const member = await Member.findById(decoded.id).select(
      '+tokenVersion invitationStatus employmentStatus'
    );
    const memberStillEligible =
      member &&
      member.invitationStatus === MEMBER_INVITATION_STATUS.ACTIVE &&
      (!member.employmentStatus || member.employmentStatus === 'active') &&
      (member.tokenVersion || 0) === (decoded.tokenVersion || 0);
    if (!memberStillEligible) {
      log.warn(`refresh.rejected member=${decoded.id} reason=tokenVersion/eligibility`);
      return res.status(401).json({
        status: 'fail',
        data: { message: messages.auth.invalidOrExpiredRefreshToken },
      });
    }
  }

  const userPayload = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };
  if (Object.prototype.hasOwnProperty.call(decoded, 'tokenVersion')) {
    userPayload.tokenVersion = decoded.tokenVersion;
  }

  // Carry the original session deadline forward and cap the rotated tokens to the
  // time remaining in it, so the 15-min window is absolute and cannot slide.
  const remaining =
    typeof decoded.sessionExp === 'number'
      ? Math.max(1, decoded.sessionExp - nowSec)
      : getAccessTokenExpiresInSeconds();
  if (typeof decoded.sessionExp === 'number') {
    userPayload.sessionExp = decoded.sessionExp;
  }
  const tokenOptions = { expiresIn: remaining };

  const accessToken = signAccessToken(userPayload, tokenOptions);
  const newRefreshToken = signRefreshToken(userPayload, tokenOptions);

  res.status(200).json({
    status: 'success',
    data: {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: remaining,
      user: userPayload,
    },
  });
});

/**
 * GET /api/v1/auth/me (protected)
 * Echoes the JWT payload + (if a real member) invitationStatus + minimal fields.
 */
const getMe = asyncHandler(async (req, res) => {
  const base = { ...req.user };

  if (
    typeof base.id === 'string' &&
    mongoose.Types.ObjectId.isValid(base.id) &&
    Object.prototype.hasOwnProperty.call(base, 'tokenVersion')
  ) {
    const member = await Member.findById(base.id).select(
      'invitationStatus employmentStatus fullName personalEmail departmentRoles'
    );
    if (member) {
      base.fullName = member.fullName;
      base.invitationStatus = member.invitationStatus;
      base.employmentStatus = member.employmentStatus;
    }
  }

  res.status(200).json({
    status: 'success',
    data: { user: base },
  });
});

module.exports = { login, refreshToken, getMe, deriveRoleFromMember };
