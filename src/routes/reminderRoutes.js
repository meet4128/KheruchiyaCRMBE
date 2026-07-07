const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');
const { validateReminderUpdate } = require('../middlewares/validateReminder');
const validateReminderStatus = require('../middlewares/validateReminderStatus');
const reminderController = require('../controllers/reminderController');

const router = express.Router();

const salesOrAdmin = [authMiddleware, requireRoles('sales', 'admin')];

// Validation-first rule: auth → validation → controller
router.get('/:id', ...salesOrAdmin, reminderController.getReminder);
router.patch('/:id', ...salesOrAdmin, validateReminderUpdate, reminderController.updateReminder);
router.patch(
  '/:id/status',
  ...salesOrAdmin,
  validateReminderStatus,
  reminderController.updateReminderStatus
);
router.delete('/:id', ...salesOrAdmin, reminderController.deleteReminder);

module.exports = router;
