/**
 * Formatted inquiry number (`PREFIX/FY/SEQ`, e.g. `FT/2627/001`) configuration.
 *
 * The prefix is derived from `typeOfBooking`. Adding a future booking type only
 * needs a one-line addition to INQUIRY_NUMBER_PREFIX — no other code changes.
 */

/** typeOfBooking → prefix code. Unknown/future types fall back to IN. */
const INQUIRY_NUMBER_PREFIX = Object.freeze({
  'Flight Booking': 'FT',
  'Hotel Booking': 'HT',
});

/** Prefix used when typeOfBooking has no explicit mapping (placeholder). */
const INQUIRY_NUMBER_FALLBACK_PREFIX = 'IN';

/**
 * Timezone used to decide the Indian financial-year boundary (Apr 1 → Mar 31)
 * so a booking made just before/after midnight lands in the correct FY.
 */
const INQUIRY_NUMBER_TIMEZONE = 'Asia/Kolkata';

/** Zero-padded minimum width of the running sequence (grows naturally past it). */
const INQUIRY_SEQUENCE_MIN_WIDTH = 3;

/** _id of the single shared counter document in the `counters` collection. */
const INQUIRY_NUMBER_COUNTER_ID = 'inquiryNumber';

module.exports = {
  INQUIRY_NUMBER_PREFIX,
  INQUIRY_NUMBER_FALLBACK_PREFIX,
  INQUIRY_NUMBER_TIMEZONE,
  INQUIRY_SEQUENCE_MIN_WIDTH,
  INQUIRY_NUMBER_COUNTER_ID,
};
