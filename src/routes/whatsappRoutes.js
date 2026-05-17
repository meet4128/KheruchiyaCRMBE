const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const validateWhatsappSend = require('../middlewares/validateWhatsappSend');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();

router.post('/send', authMiddleware, validateWhatsappSend, whatsappController.sendText);

module.exports = router;
