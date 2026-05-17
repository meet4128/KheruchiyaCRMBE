const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const validateWhatsappSend = require('../middlewares/validateWhatsappSend');
const validateWhatsappConversationQuery = require('../middlewares/validateWhatsappConversationQuery');
const validateWhatsappMessagesQuery = require('../middlewares/validateWhatsappMessagesQuery');
const validateWhatsappPeerParam = require('../middlewares/validateWhatsappPeerParam');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();

router.get(
  '/conversations',
  authMiddleware,
  validateWhatsappConversationQuery,
  whatsappController.getConversations
);
router.get(
  '/conversations/:peerPhone/messages',
  authMiddleware,
  validateWhatsappPeerParam,
  validateWhatsappMessagesQuery,
  whatsappController.getMessages
);
router.post('/send', authMiddleware, validateWhatsappSend, whatsappController.sendText);

module.exports = router;
