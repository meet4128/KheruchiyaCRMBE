const express = require('express');
const inquiryController = require('../controllers/inquiryController');
const validateInquiry = require('../middlewares/validateInquiry');
const validateInquiryQuery = require('../middlewares/validateInquiryQuery');
const validateInquiryPhoneQuery = require('../middlewares/validateInquiryPhoneQuery');
const validateInquiryAssign = require('../middlewares/validateInquiryAssign');
const validateInquiryStatus = require('../middlewares/validateInquiryStatus');
const validateQnaRead = require('../middlewares/validateQnaRead');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');

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
router.get(
  '/by-phone',
  authMiddleware,
  validateInquiryPhoneQuery,
  inquiryController.getInquiriesByPhone
);
router.get('/:id', authMiddleware, inquiryController.getInquiryById);
router.patch(
  '/:id/assign',
  authMiddleware,
  requireRoles('admin', 'sales'),
  validateInquiryAssign,
  inquiryController.assignInquiry
);
router.patch(
  '/:id/status',
  authMiddleware,
  requireRoles('admin', 'sales'),
  validateInquiryStatus,
  inquiryController.updateInquiryStatus
);
router.post('/:inquiryId/qna/read', authMiddleware, validateQnaRead, inquiryController.markQnaRead);
router.use('/:inquiryId/amendments', amendmentRoutes);
router.use('/:inquiryId/purchase-chats', purchaseTeamChatRoutes);
router.use('/:inquiryId/payment-plan', paymentRoutes);

module.exports = router;
