const crypto = require('crypto');
const AuthToken = require('../models/AuthToken');
const AppError = require('../utils/AppError');
const { AUTH_TOKEN_PURPOSE, AUTH_TOKEN_PURPOSE_VALUES } = require('../constants/authTokenPurpose');
const { messages } = require('../locales');

const RAW_TOKEN_BYTES = 32;
const RAW_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function defaultTtlMsFor(purpose) {
  return purpose === AUTH_TOKEN_PURPOSE.RESET ? RESET_TTL_MS : INVITE_TTL_MS;
}

function generateRawToken() {
  return crypto.randomBytes(RAW_TOKEN_BYTES).toString('hex');
}

function hashRawToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function assertValidPurpose(purpose) {
  if (!AUTH_TOKEN_PURPOSE_VALUES.includes(purpose)) {
    throw new AppError(messages.errors.authTokenPurposeInvalid, 400);
  }
}

/**
 * Issues a new single-use token for a given user + purpose.
 * Returns { rawToken, doc } — the raw token is ONLY ever sent in the email link;
 * only its sha256 is stored.
 */
async function issueToken({ userId, purpose, ttlMs, createdBy } = {}) {
  if (!userId) throw new AppError(messages.errors.authTokenUserIdRequired, 400);
  assertValidPurpose(purpose);

  const rawToken = generateRawToken();
  const tokenHash = hashRawToken(rawToken);
  const expiresAt = new Date(Date.now() + (ttlMs || defaultTtlMsFor(purpose)));

  const doc = await AuthToken.create({
    userId,
    purpose,
    tokenHash,
    expiresAt,
    createdBy,
  });

  return { rawToken, doc };
}

/**
 * Verifies a raw token: checks format, hash match, purpose, expiry, single-use.
 * Returns the token doc on success; throws AppError(400/401/410) otherwise.
 */
async function verifyToken({ rawToken, purpose } = {}) {
  if (typeof rawToken !== 'string' || !RAW_TOKEN_PATTERN.test(rawToken)) {
    throw new AppError(messages.errors.authTokenInvalid, 400);
  }
  assertValidPurpose(purpose);

  const tokenHash = hashRawToken(rawToken);
  const token = await AuthToken.findOne({ tokenHash, purpose });
  if (!token) {
    throw new AppError(messages.errors.authTokenInvalid, 400);
  }
  if (token.usedAt) {
    throw new AppError(messages.errors.authTokenAlreadyUsed, 410);
  }
  if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
    throw new AppError(messages.errors.authTokenExpired, 410);
  }

  return token;
}

/**
 * Marks a token as consumed (single-use). Idempotent if already used.
 */
async function consumeToken(tokenId) {
  if (!tokenId) return null;
  return AuthToken.findOneAndUpdate(
    { _id: tokenId, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
}

/**
 * Invalidates all other open tokens for a user + purpose (no-op for usedAt rows).
 * Optional `exceptId` keeps a newly-minted token alive.
 */
async function invalidateOtherTokens({ userId, purpose, exceptId } = {}) {
  if (!userId) return { matchedCount: 0, modifiedCount: 0 };
  assertValidPurpose(purpose);

  const filter = { userId, purpose, usedAt: { $exists: false } };
  if (exceptId) filter._id = { $ne: exceptId };

  const res = await AuthToken.updateMany(filter, { $set: { usedAt: new Date() } });
  return {
    matchedCount: res.matchedCount ?? res.n ?? 0,
    modifiedCount: res.modifiedCount ?? res.nModified ?? 0,
  };
}

module.exports = {
  issueToken,
  verifyToken,
  consumeToken,
  invalidateOtherTokens,
  hashRawToken,
  generateRawToken,
  INVITE_TTL_MS,
  RESET_TTL_MS,
};
