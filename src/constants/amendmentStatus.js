const AMENDMENT_STATUS = Object.freeze({
  FOLLOWUP: 'followup',
  PENDING: 'pending',
  LOSS: 'loss',
  COMPLETED: 'completed',
});

const AMENDMENT_STATUS_VALUES = Object.values(AMENDMENT_STATUS);

module.exports = {
  AMENDMENT_STATUS,
  AMENDMENT_STATUS_VALUES,
};
