const crypto = require('crypto');
const { AMENDMENT_ID_PREFIX } = require('../constants/amendmentType');

/**
 * @param {string} amendmentType - re_issue | cancelation | booking
 * @returns {string} e.g. TAIR59733107042
 */
const generateAmendmentId = (amendmentType) => {
  const prefix = AMENDMENT_ID_PREFIX[amendmentType] || 'TAMD';
  const timePart = Date.now().toString().slice(-8);
  const randomPart = crypto.randomInt(1000, 9999).toString();
  return `${prefix}${timePart}${randomPart}`;
};

module.exports = generateAmendmentId;
