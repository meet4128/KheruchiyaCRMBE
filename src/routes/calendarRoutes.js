const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');
const validateCalendarQuery = require('../middlewares/validateCalendarQuery');
const reminderController = require('../controllers/reminderController');

const router = express.Router();

const salesOrAdmin = [authMiddleware, requireRoles('sales', 'admin')];

// Validation-first rule: auth → validation → controller
// Calendar read: reminder occurrences expanded within a date range.
router.get(
  '/events',
  ...salesOrAdmin,
  validateCalendarQuery,
  reminderController.listCalendarEvents
);

module.exports = router;
