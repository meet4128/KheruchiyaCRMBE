const { signAccessToken, signRefreshToken, getAccessTokenExpiresInSeconds } = require('./jwtUtils');

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
 * Stamps an absolute session deadline (`sessionExp`) into both tokens so the
 * session cannot be extended past the access-token lifetime (15 min) — after
 * that the client must log in again. Both tokens expire at the deadline.
 *
 * @param {Object} userPayload - Minimal user info (e.g. { id, email, role }).
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
const generateTokenPair = (userPayload) => {
  const expiresIn = getAccessTokenExpiresInSeconds();
  const payload = { ...userPayload, sessionExp: Math.floor(Date.now() / 1000) + expiresIn };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload, { expiresIn }),
    expiresIn,
  };
};

module.exports = generateToken;
module.exports.generateTokenPair = generateTokenPair;
