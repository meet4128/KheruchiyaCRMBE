const AMENDMENT_TYPE = Object.freeze({
  RE_ISSUE: 're_issue',
  CANCELATION: 'cancelation',
  BOOKING: 'booking',
});

const AMENDMENT_TYPE_VALUES = Object.values(AMENDMENT_TYPE);

const AMENDMENT_ID_PREFIX = Object.freeze({
  [AMENDMENT_TYPE.RE_ISSUE]: 'TAIR',
  [AMENDMENT_TYPE.CANCELATION]: 'TCAN',
  [AMENDMENT_TYPE.BOOKING]: 'TBOOK',
});

module.exports = {
  AMENDMENT_TYPE,
  AMENDMENT_TYPE_VALUES,
  AMENDMENT_ID_PREFIX,
};
