const express = require('express');
const whatsappWebhookController = require('../controllers/whatsappWebhookController');
const verifyWhatsappSignature = require('../middlewares/verifyWhatsappSignature');

const router = express.Router();

router.get('/', whatsappWebhookController.verifyWebhook);
router.post('/', verifyWhatsappSignature, whatsappWebhookController.receiveWebhook);

module.exports = router;
