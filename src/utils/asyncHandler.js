/**
 * Wraps async route handlers to forward rejected promises to Express error middleware.
 * Eliminates redundant try-catch blocks in controllers.
 *
 * @param {Function} fn - Async handler (req, res, next) => Promise
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
