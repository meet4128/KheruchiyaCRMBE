/**
 * Payment modes for an installment (UI "Mode" dropdown).
 * Empty/unset is allowed until the payment is actually received.
 */
const PAYMENT_MODE = Object.freeze({
  CASH: 'Cash',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
});

const PAYMENT_MODE_VALUES = Object.values(PAYMENT_MODE);

module.exports = {
  PAYMENT_MODE,
  PAYMENT_MODE_VALUES,
};
