const {
  INQUIRY_NUMBER_PREFIX,
  INQUIRY_NUMBER_FALLBACK_PREFIX,
  INQUIRY_NUMBER_TIMEZONE,
  INQUIRY_SEQUENCE_MIN_WIDTH,
} = require('../constants/inquiryNumber');

/** Booking-type code, e.g. 'Flight Booking' → 'FT'. Unknown types → 'IN'. */
const resolvePrefix = (typeOfBooking) =>
  INQUIRY_NUMBER_PREFIX[typeOfBooking] || INQUIRY_NUMBER_FALLBACK_PREFIX;

/**
 * Indian financial-year segment for a date (April 1 → March 31 boundary), as the
 * last 2 digits of the start year followed by the last 2 of the end year.
 * Example: 2026-07-30 (Asia/Kolkata) → FY 2026–27 → '2627'.
 *
 * @param {Date} [date=new Date()]
 * @returns {string} 4-digit FY segment
 */
const getFinancialYearSegment = (date = new Date()) => {
  // Resolve calendar year/month in the configured timezone so the Apr–Mar
  // boundary is consistent regardless of server timezone.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INQUIRY_NUMBER_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year').value);
  const month = Number(parts.find((p) => p.type === 'month').value);

  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
};

/** Zero-pads the sequence to the minimum width; grows naturally beyond it. */
const formatSequence = (seq) => String(seq).padStart(INQUIRY_SEQUENCE_MIN_WIDTH, '0');

/**
 * Builds the human-readable inquiry number `PREFIX/FY/SEQ` (e.g. `FT/2627/001`).
 *
 * @param {Object} args
 * @param {string} args.typeOfBooking - Drives the prefix
 * @param {number} args.seq - Running sequence value (already obtained atomically)
 * @param {Date} [args.date=new Date()] - Creation time (drives the FY segment)
 * @returns {string}
 */
const buildInquiryNumber = ({ typeOfBooking, seq, date = new Date() }) =>
  `${resolvePrefix(typeOfBooking)}/${getFinancialYearSegment(date)}/${formatSequence(seq)}`;

module.exports = {
  resolvePrefix,
  getFinancialYearSegment,
  formatSequence,
  buildInquiryNumber,
};
