const jwt = require('jsonwebtoken');
const { messages } = require('../locales');

// Fail fast in production if secrets are missing
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    throw new Error(messages.config.jwtSecretRequired);
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.trim() === '') {
    throw new Error(messages.config.jwtRefreshSecretRequired);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev_jwt_refresh_secret';

// Access token: short-lived, used for API auth (default 15m)
const JWT_ACCESS_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';
// Refresh token: long-lived, used only to get new access tokens (default 7d)
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const signToken = (payload, options = {}) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN, ...options });

const signAccessToken = (payload, options = {}) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN, ...options });

const signRefreshToken = (payload, options = {}) =>
  jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    ...options,
  });

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);

const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET);

/** Parse JWT expiry string (e.g. "15m", "1h", "7d") to seconds */
const parseExpiryToSeconds = (str) => {
  const match = String(str || '')
    .trim()
    .match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return 900; // default 15 min
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return val * (multipliers[unit] || 60);
};

/** Access token expiry in seconds (for API response) */
const getAccessTokenExpiresInSeconds = () => parseExpiryToSeconds(JWT_ACCESS_EXPIRES_IN);

module.exports = {
  signToken,
  signAccessToken,
  signRefreshToken,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  JWT_ACCESS_EXPIRES_IN,
  getAccessTokenExpiresInSeconds,
};
