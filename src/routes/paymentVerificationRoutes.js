const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');
const validateUnverifiedPaymentsQuery = require('../middlewares/validateUnverifiedPaymentsQuery');
const validatePaymentVerification = require('../middlewares/validatePaymentVerification');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Verification queue is owned by the Account team (admin retains oversight access).
const accountOrAdmin = [authMiddleware, requireRoles('account', 'admin')];

// Validation-first rule: auth → validation → controller
// Cross-inquiry list of received-but-unverified payments (Accounting → Unverified screen).
router.get(
  '/unverified',
  ...accountOrAdmin,
  validateUnverifiedPaymentsQuery,
  paymentController.getUnverifiedPayments
);

// Account-team verify/un-verify of an inquiry's payment plan. Verifying is the gate
// that lets sales mark the amendment as won (see amendmentService.finalizeAmendment).
router.patch(
  '/:inquiryId/verify',
  ...accountOrAdmin,
  validatePaymentVerification,
  paymentController.verifyPayment
);

module.exports = router;
