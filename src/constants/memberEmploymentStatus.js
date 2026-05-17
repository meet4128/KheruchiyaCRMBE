/** Member employment status — model + Joi (Phase 2) */
const MEMBER_EMPLOYMENT_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PROBATION: 'probation',
  CONTRACT: 'contract',
  TERMINATED: 'terminated',
});

const MEMBER_EMPLOYMENT_STATUS_VALUES = Object.values(MEMBER_EMPLOYMENT_STATUS);

module.exports = { MEMBER_EMPLOYMENT_STATUS, MEMBER_EMPLOYMENT_STATUS_VALUES };
