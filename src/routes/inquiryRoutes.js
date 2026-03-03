const express = require('express');
const inquiryController = require('../controllers/inquiryController');
const validateInquiry = require('../middlewares/validateInquiry');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Validation-first rule: auth → validation → controller
router.post('/', authMiddleware, validateInquiry, inquiryController.createInquiry);
router.get('/', authMiddleware, inquiryController.getInquiries);

module.exports = router;
