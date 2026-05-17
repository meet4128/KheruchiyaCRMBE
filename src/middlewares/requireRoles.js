const { messages } = require('../locales');

/**
 * Express middleware: require JWT user to have one of the given roles (case-insensitive).
 * Use after `authMiddleware` so `req.user` is set.
 */
const requireRoles = (...allowed) => {
  const normalized = allowed.map((r) => String(r).toLowerCase());
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !normalized.includes(String(role).toLowerCase())) {
      return res.status(403).json({
        status: 'fail',
        data: { message: messages.auth.insufficientRole },
      });
    }
    next();
  };
};

module.exports = requireRoles;
