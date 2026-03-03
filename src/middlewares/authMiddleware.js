const { verifyToken } = require('../utils/jwtUtils');

/**
 * Authentication middleware for protecting routes with JWT Bearer tokens.
 * Expects header: Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || req.headers.Authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'fail',
      data: { message: 'Authentication required' },
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'fail',
      data: { message: 'Invalid or expired token' },
    });
  }
};

module.exports = authMiddleware;


