const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Dev/basic login for issuing JWTs
router.post('/login', authController.login);

module.exports = router;


