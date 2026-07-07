/** Reminder / calendar-event lifecycle status values — used in model & validation */
const REMINDER_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  DISMISSED: 'dismissed',
  SNOOZED: 'snoozed',
});

const REMINDER_STATUS_VALUES = Object.values(REMINDER_STATUS);

module.exports = {
  REMINDER_STATUS,
  REMINDER_STATUS_VALUES,
};
