const express = require('express');
const authController = require('../controllers/authController');
const passwordController = require('../controllers/passwordController');
const authMiddleware = require('../middlewares/authMiddleware');
const validateTokenValidateQuery = require('../middlewares/validateTokenValidateQuery');
const validateSetPassword = require('../middlewares/validateSetPassword');
const validateForgotPassword = require('../middlewares/validateForgotPassword');
const validateResetPassword = require('../middlewares/validateResetPassword');
const { servePasswordPage } = require('./passwordFormHandlers');

const router = express.Router();

// GET HTML forms for email links (under /api/v1 so reverse proxy reaches Node, not Flutter)
router.get('/set-password-form', servePasswordPage('invite'));
router.get('/reset-password-form', servePasswordPage('reset'));

// Dev/basic login for issuing access + refresh tokens
router.post('/login', authController.login);

// Refresh access token using refresh token
router.post('/refresh-token', authController.refreshToken);

// Get current user (requires auth)
router.get('/me', authMiddleware, authController.getMe);

// ─── Password flow (public) ─────────────────────────────────────────────
// GET /api/v1/auth/token/validate?token=...&purpose=invite|reset
router.get('/token/validate', validateTokenValidateQuery, passwordController.validateTokenQuery);

// POST /api/v1/auth/set-password { token, password } — completes invite flow
router.post('/set-password', validateSetPassword, passwordController.setPassword);

// POST /api/v1/auth/forgot-password { email } — always 200 (no enumeration)
router.post('/forgot-password', validateForgotPassword, passwordController.forgotPassword);

// POST /api/v1/auth/reset-password { token, password } — bumps tokenVersion
router.post('/reset-password', validateResetPassword, passwordController.resetPassword);

module.exports = router;
