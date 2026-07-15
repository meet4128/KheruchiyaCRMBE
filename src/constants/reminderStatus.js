/** Reminder / follow-up status values — used in model, validation & swagger.
 *  Kept UPPER_SNAKE to match INQUIRY_STATUS (see constants/inquiryStatus.js). */
const REMINDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  FOLLOWUP: 'FOLLOWUP',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const REMINDER_STATUS_VALUES = Object.values(REMINDER_STATUS);

module.exports = {
  REMINDER_STATUS,
  REMINDER_STATUS_VALUES,
};
