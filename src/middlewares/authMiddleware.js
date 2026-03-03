const { verifyAccessToken } = require('../utils/jwtUtils');
const { messages } = require('../locales');

/**
 * Authentication middleware for protecting routes with JWT Bearer tokens.
 * Expects header: Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || req.headers.Authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'fail',
      data: { message: messages.auth.authenticationRequired },
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (_err) {
    return res.status(401).json({
      status: 'fail',
      data: { message: messages.auth.invalidOrExpiredToken },
    });
  }
};

module.exports = authMiddleware;
