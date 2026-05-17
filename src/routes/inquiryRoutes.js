const express = require('express');
const inquiryController = require('../controllers/inquiryController');
const validateInquiry = require('../middlewares/validateInquiry');
const validateInquiryQuery = require('../middlewares/validateInquiryQuery');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Validation-first rule: auth → validation → controller
const amendmentRoutes = require('./amendmentRoutes');

router.post('/', authMiddleware, validateInquiry, inquiryController.createInquiry);
router.get('/', authMiddleware, validateInquiryQuery, inquiryController.getInquiries);
router.get('/:id', authMiddleware, inquiryController.getInquiryById);
router.use('/:inquiryId/amendments', amendmentRoutes);

module.exports = router;
