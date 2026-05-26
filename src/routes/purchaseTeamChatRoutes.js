const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');
const validatePurchaseChatCreate = require('../middlewares/validatePurchaseChatCreate');
const validatePurchaseChatMessage = require('../middlewares/validatePurchaseChatMessage');
const validatePurchaseChatListQuery = require('../middlewares/validatePurchaseChatListQuery');
const validateAmendmentMessagesQuery = require('../middlewares/validateAmendmentMessagesQuery');
const { uploadPurchaseChatFile } = require('../middlewares/uploadPurchaseChatFile');
const purchaseTeamChatController = require('../controllers/purchaseTeamChatController');

const router = express.Router({ mergeParams: true });

const chatRoles = [authMiddleware, requireRoles('sales', 'admin', 'purchase')];

router.get(
  '/',
  ...chatRoles,
  validatePurchaseChatListQuery,
  purchaseTeamChatController.listThreads
);

router.post(
  '/',
  ...chatRoles,
  requireRoles('sales', 'admin'),
  validatePurchaseChatCreate,
  purchaseTeamChatController.openThread
);

router.post(
  '/:purchaseTeamMemberId/uploads',
  ...chatRoles,
  uploadPurchaseChatFile,
  purchaseTeamChatController.uploadFile
);

router.get(
  '/:purchaseTeamMemberId/messages',
  ...chatRoles,
  validateAmendmentMessagesQuery,
  purchaseTeamChatController.getMessages
);

router.post(
  '/:purchaseTeamMemberId/messages',
  ...chatRoles,
  validatePurchaseChatMessage,
  purchaseTeamChatController.sendMessage
);

module.exports = router;
