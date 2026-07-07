const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/requireRoles');
const validateAmendmentFinalize = require('../middlewares/validateAmendmentFinalize');
const validateAmendmentNote = require('../middlewares/validateAmendmentNote');
const validateAmendmentMessagesQuery = require('../middlewares/validateAmendmentMessagesQuery');
const { validateReminderCreate } = require('../middlewares/validateReminder');
const amendmentController = require('../controllers/amendmentController');
const reminderController = require('../controllers/reminderController');
const { uploadAmendmentSessionFile } = require('../middlewares/uploadAmendmentSessionFile');

const router = express.Router({ mergeParams: true });

const salesOrAdmin = [authMiddleware, requireRoles('sales', 'admin')];

router.post(
  '/finalize',
  ...salesOrAdmin,
  validateAmendmentFinalize,
  amendmentController.finalizeAmendment
);
router.get('/', ...salesOrAdmin, amendmentController.listAmendments);

router.get(
  '/session/:sessionId/messages',
  ...salesOrAdmin,
  validateAmendmentMessagesQuery,
  amendmentController.getSessionMessages
);
router.post(
  '/session/:sessionId/notes',
  ...salesOrAdmin,
  validateAmendmentNote,
  amendmentController.addSessionNote
);
router.post(
  '/session/:sessionId/uploads',
  ...salesOrAdmin,
  uploadAmendmentSessionFile,
  amendmentController.uploadSessionFile
);

router.get(
  '/:amendmentId/messages',
  ...salesOrAdmin,
  validateAmendmentMessagesQuery,
  amendmentController.getAmendmentMessages
);
router.get('/:amendmentId/notes', ...salesOrAdmin, amendmentController.getAmendmentNotes);

// Follow-up reminder (calendar event) for a finalized amendment
router.post(
  '/:amendmentId/reminders',
  ...salesOrAdmin,
  validateReminderCreate,
  reminderController.createReminder
);

router.get('/:amendmentId', ...salesOrAdmin, amendmentController.getAmendment);

module.exports = router;
