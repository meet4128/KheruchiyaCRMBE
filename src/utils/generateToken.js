const {
  signAccessToken,
  signRefreshToken,
  getAccessTokenExpiresInSeconds,
  getRefreshTokenExpiresInSeconds,
} = require('./jwtUtils');

/**
 * Generates access token for a user payload.
 *
 * @param {Object} userPayload - Minimal user info (e.g. { id, email, role }).
 * @param {Object} [options] - Optional jwt sign options.
 * @returns {string} signed access JWT
 */
const generateToken = (userPayload, options = {}) => signAccessToken(userPayload, options);

/**
 * Generates both access and refresh tokens for login/refresh flow.
 *
 * Stamps an absolute session deadline (`sessionExp`) into both tokens, driven by
 * the refresh-token lifetime (default 7d). The short-lived access token (15 min)
 * can be rotated via the refresh token until that deadline; after it the client
 * must log in again. `expiresIn` is the access-token lifetime the client uses to
 * know when to refresh.
 *
 * @param {Object} userPayload - Minimal user info (e.g. { id, email, role }).
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
const generateTokenPair = (userPayload) => {
  const expiresIn = getAccessTokenExpiresInSeconds();
  const sessionExp = Math.floor(Date.now() / 1000) + getRefreshTokenExpiresInSeconds();
  const payload = { ...userPayload, sessionExp };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    expiresIn,
  };
};

module.exports = generateToken;
module.exports.generateTokenPair = generateTokenPair;
