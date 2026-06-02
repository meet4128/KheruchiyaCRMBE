const express = require('express');
const { servePasswordPage } = require('./passwordFormHandlers');

const router = express.Router();

/** Local dev when only Node serves the site (production email links use /api/v1/auth/*-form). */
router.get('/set-password', servePasswordPage('invite'));
router.get('/reset-password', servePasswordPage('reset'));

module.exports = router;
