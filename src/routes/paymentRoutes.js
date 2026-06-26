const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');
const validatePaymentPlan = require('../middlewares/validatePaymentPlan');
const paymentController = require('../controllers/paymentController');
const { uploadPaymentProofFile } = require('../middlewares/uploadPaymentProofFile');

const router = express.Router({ mergeParams: true });

const salesAccountOrAdmin = [authMiddleware, requireRoles('sales', 'account', 'admin')];

router.put('/', ...salesAccountOrAdmin, validatePaymentPlan, paymentController.savePaymentPlan);
router.get('/', ...salesAccountOrAdmin, paymentController.getPaymentPlan);
router.post(
  '/uploads',
  ...salesAccountOrAdmin,
  uploadPaymentProofFile,
  paymentController.uploadPaymentProof
);

module.exports = router;
