/** Member marital status — model + Joi (Phase 2) */
const MEMBER_MARITAL_STATUS = Object.freeze({
  MARRIED: 'married',
  UNMARRIED: 'unmarried',
  WIDOW: 'widow',
});

const MEMBER_MARITAL_STATUS_VALUES = Object.values(MEMBER_MARITAL_STATUS);

module.exports = { MEMBER_MARITAL_STATUS, MEMBER_MARITAL_STATUS_VALUES };
