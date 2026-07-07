const mongoose = require('mongoose');
const { CHECKLIST_PRIORITY_VALUES } = require('../constants/checklistPriority');
const { REMINDER_STATUS, REMINDER_STATUS_VALUES } = require('../constants/reminderStatus');

/**
 * Follow-up reminder / calendar event.
 *
 * Standalone collection (not embedded) so the calendar can range-query by
 * `remindAt` and filter by `agent` across all inquiries. Created via the
 * follow-up dialog after an amendment is finalized with action `put_follow_up`.
 */
const reminderSchema = new mongoose.Schema(
  {
    // Context links
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', required: true },
    // Amendment business id (e.g. TAIR12345), matches Amendment.amendmentId
    amendmentId: { type: String, required: true, trim: true },
    sessionId: { type: String, trim: true },

    // Follow-up details
    note: { type: String, trim: true, default: '' },
    // First occurrence, stored in UTC (client sends ISO 8601 with offset)
    remindAt: { type: Date, required: true },
    // RFC 5545 RRULE string (e.g. "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10"); empty = single occurrence
    recurrenceRule: { type: String, trim: true, default: '' },

    // People
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    inLoopUsers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
      default: [],
    },

    priority: {
      type: String,
      enum: CHECKLIST_PRIORITY_VALUES,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: REMINDER_STATUS_VALUES,
      default: REMINDER_STATUS.PENDING,
    },

    // Audit — userId string, matching the codebase convention (createdBy)
    createdBy: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  }
);

// ─── Performance indexes ─────────────────────────────────────────────────────

/** Calendar range queries + per-agent filtering */
reminderSchema.index({ remindAt: 1 });
reminderSchema.index({ agent: 1, remindAt: 1 });
reminderSchema.index({ inquiryId: 1, createdAt: -1 });
reminderSchema.index({ status: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;
