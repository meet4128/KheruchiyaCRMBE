const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');
const validateAmendmentSearchQuery = require('../middlewares/validateAmendmentSearchQuery');
const amendmentController = require('../controllers/amendmentController');

const router = express.Router();

const salesOrAdmin = [authMiddleware, requireRoles('sales', 'admin')];

// Validation-first rule: auth → validation → controller
// Global amendment search across all inquiries (Manage Amendment screen).
router.get(
  '/search',
  ...salesOrAdmin,
  validateAmendmentSearchQuery,
  amendmentController.searchAmendments
);

module.exports = router;
