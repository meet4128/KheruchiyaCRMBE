const generateToken = require('../utils/generateToken');

/**
 * Dev / simple login endpoint for issuing JWTs.
 * In production, real auth (password verification, user store) must be implemented.
 */
const login = (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      status: 'error',
      message: 'Login not implemented. Implement proper authentication before deploying to production.',
    });
  }

  const { userId = 'dev-user', email = 'dev@example.com', role = 'user' } = req.body || {};

  const userPayload = { id: userId, email, role };
  const token = generateToken(userPayload);

  res.status(200).json({
    status: 'success',
    data: {
      token,
      user: userPayload,
    },
  });
};

module.exports = { login };

