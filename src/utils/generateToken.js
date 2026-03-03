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
 * @param {Object} userPayload - Minimal user info (e.g. { id, email, role }).
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
const generateTokenPair = (userPayload) => ({
  accessToken: signAccessToken(userPayload),
  refreshToken: signRefreshToken(userPayload),
  expiresIn: getAccessTokenExpiresInSeconds(),
});

module.exports = generateToken;
module.exports.generateTokenPair = generateTokenPair;
