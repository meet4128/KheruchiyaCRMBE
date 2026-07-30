/**
 * Per-installment account-verification state.
 *
 * PENDING  — submitted by sales, awaiting account verification (editable).
 * VERIFIED — approved by the account team; locked (not editable from the client).
 *
 * A plan's roll-up `verified` flag is true only when every installment is VERIFIED.
 */
const PAYMENT_VERIFICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
});

const PAYMENT_VERIFICATION_STATUS_VALUES = Object.values(PAYMENT_VERIFICATION_STATUS);

module.exports = {
  PAYMENT_VERIFICATION_STATUS,
  PAYMENT_VERIFICATION_STATUS_VALUES,
};
