/** Inquiry status values — used in model, validation, and service */
const INQUIRY_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const INQUIRY_STATUS_VALUES = Object.values(INQUIRY_STATUS);

module.exports = { INQUIRY_STATUS, INQUIRY_STATUS_VALUES };
