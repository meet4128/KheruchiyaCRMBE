const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

const DEFAULT_ROUNDS = 12;
const MIN_ROUNDS = 10;
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const STRENGTH_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

function getRounds() {
  const raw = parseInt(process.env.BCRYPT_ROUNDS, 10);
  if (!Number.isFinite(raw) || raw < MIN_ROUNDS) return DEFAULT_ROUNDS;
  return raw;
}

/**
 * Enforces the documented password policy (Phase 0):
 *   - 8..128 characters
 *   - at least one letter AND one digit
 * Throws AppError(422) with a 'password' field error on failure.
 */
function assertStrong(plain) {
  if (typeof plain !== 'string' || plain.length < MIN_LENGTH || plain.length > MAX_LENGTH) {
    throw new AppError(messages.validation.failed, 422, [
      { field: 'password', message: messages.validation.password.lengthInvalid },
    ]);
  }
  if (!STRENGTH_PATTERN.test(plain)) {
    throw new AppError(messages.validation.failed, 422, [
      { field: 'password', message: messages.validation.password.strengthInvalid },
    ]);
  }
}

async function hashPassword(plain) {
  assertStrong(plain);
  return bcrypt.hash(plain, getRounds());
}

async function comparePassword(plain, hash) {
  if (typeof plain !== 'string' || typeof hash !== 'string' || hash.length === 0) {
    return false;
  }
  return bcrypt.compare(plain, hash);
}

module.exports = {
  assertStrong,
  hashPassword,
  comparePassword,
  MIN_LENGTH,
  MAX_LENGTH,
};
