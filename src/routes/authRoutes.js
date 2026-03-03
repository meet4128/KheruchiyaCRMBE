const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Dev/basic login for issuing access + refresh tokens
router.post('/login', authController.login);

// Refresh access token using refresh token
router.post('/refresh-token', authController.refreshToken);

// Get current user (requires auth)
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
