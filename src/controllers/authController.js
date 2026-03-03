const generateToken = require('../utils/generateToken');

/**
 * Dev / simple login endpoint for issuing JWTs.
 * In a real app, this would validate credentials against a user store.
 */
const login = (req, res) => {
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

