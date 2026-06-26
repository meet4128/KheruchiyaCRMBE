const express = require('express');
const inquiryController = require('../controllers/inquiryController');
const validateInquiry = require('../middlewares/validateInquiry');
const validateInquiryQuery = require('../middlewares/validateInquiryQuery');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Validation-first rule: auth → validation → controller
const amendmentRoutes = require('./amendmentRoutes');
const purchaseTeamChatRoutes = require('./purchaseTeamChatRoutes');
const paymentRoutes = require('./paymentRoutes');

router.post('/', authMiddleware, validateInquiry, inquiryController.createInquiry);
router.get('/', authMiddleware, validateInquiryQuery, inquiryController.getInquiries);
router.get(
  '/checklist-priority-defaults',
  authMiddleware,
  inquiryController.getChecklistPriorityDefaults
);
router.get('/:id', authMiddleware, inquiryController.getInquiryById);
router.use('/:inquiryId/amendments', amendmentRoutes);
router.use('/:inquiryId/purchase-chats', purchaseTeamChatRoutes);
router.use('/:inquiryId/payment-plan', paymentRoutes);

module.exports = router;
