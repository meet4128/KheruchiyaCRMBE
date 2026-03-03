const { signToken } = require('./jwtUtils');

/**
 * Helper to generate a JWT for a given user payload.
 * Keeps token creation logic in one place so controllers stay thin.
 *
 * @param {Object} userPayload - Minimal user info to embed in the token (e.g. { id, email, role }).
 * @param {Object} [options] - Optional jwt sign options (overrides defaults).
 * @returns {string} signed JWT
 */
const generateToken = (userPayload, options = {}) => signToken(userPayload, options);

module.exports = generateToken;

