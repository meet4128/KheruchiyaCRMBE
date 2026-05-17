const generateTokenPair = require('../utils/generateToken').generateTokenPair;
const {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  getAccessTokenExpiresInSeconds,
} = require('../utils/jwtUtils');
const { messages } = require('../locales');

const ALLOWED_LOGIN_ROLES = ['admin', 'sales', 'purchase', 'user'];

/**
 * Dev / simple login endpoint for issuing access + refresh tokens.
 * In production, real auth (password verification, user store) must be implemented.
 */
const login = (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      status: 'error',
      message: messages.auth.loginNotImplemented,
    });
  }

  const { userId = 'dev-user', email = 'dev@example.com', role = 'user' } = req.body || {};
  const normalizedRole = String(role).trim().toLowerCase();

  if (!ALLOWED_LOGIN_ROLES.includes(normalizedRole)) {
    return res.status(422).json({
      status: 'fail',
      data: {
        message: messages.auth.invalidRole,
        allowedRoles: ALLOWED_LOGIN_ROLES,
      },
    });
  }

  const userPayload = { id: userId, email, role: normalizedRole };
  const { accessToken, refreshToken, expiresIn } = generateTokenPair(userPayload);

  res.status(200).json({
    status: 'success',
    data: {
      accessToken,
      refreshToken,
      expiresIn,
      user: userPayload,
    },
  });
};

/**
 * Refresh token endpoint. Validates refresh token and returns new access + refresh tokens.
 */
const refreshToken = (req, res) => {
  const { refreshToken: token } = req.body || {};

  if (!token) {
    return res.status(400).json({
      status: 'fail',
      data: { message: messages.auth.refreshTokenRequired },
    });
  }

  try {
    const decoded = verifyRefreshToken(token);

    // Ensure it's a refresh token (we embed type: 'refresh' in payload)
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'fail',
        data: { message: messages.auth.invalidRefreshToken },
      });
    }

    const userPayload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    const accessToken = signAccessToken(userPayload);
    const newRefreshToken = signRefreshToken(userPayload);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: getAccessTokenExpiresInSeconds(),
        user: userPayload,
      },
    });
  } catch (_err) {
    return res.status(401).json({
      status: 'fail',
      data: { message: messages.auth.invalidOrExpiredRefreshToken },
    });
  }
};

/**
 * Get current user from JWT (protected route).
 */
const getMe = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
};

module.exports = { login, refreshToken, getMe };
