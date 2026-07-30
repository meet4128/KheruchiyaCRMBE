const mongoose = require('mongoose');
const { PAYMENT_MODE_VALUES } = require('../constants/paymentMode');
const {
  PAYMENT_VERIFICATION_STATUS,
  PAYMENT_VERIFICATION_STATUS_VALUES,
} = require('../constants/paymentVerificationStatus');

/**
 * Installment row — one per row in the "Payment Terms Finalised" table. Its
 * Mongo `_id` is the stable **paymentId** exposed to the client and used by the
 * account team to verify this specific installment.
 *
 * `status` is a free-text label computed on the frontend (e.g. "On Time" / "Late")
 * from dueDate vs receivedDate, so it is stored as-is. `verificationStatus` is the
 * account-team gate: PENDING until verified, VERIFIED once approved (then locked).
 */
const installmentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, set: (v) => (v === '' || v === null ? undefined : v) },
    receivedDate: { type: Date, set: (v) => (v === '' || v === null ? undefined : v) },
    mode: {
      type: String,
      enum: PAYMENT_MODE_VALUES,
      set: (v) => (v === '' || v === null ? undefined : v),
      default: undefined,
    },
    status: { type: String, trim: true, default: '' },
    paymentProofUrl: { type: String, trim: true, default: '' },
    // Account-team verification of THIS installment (drives the "Unverified" queue).
    verificationStatus: {
      type: String,
      enum: PAYMENT_VERIFICATION_STATUS_VALUES,
      default: PAYMENT_VERIFICATION_STATUS.PENDING,
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

/** Payment plan / terms for an inquiry — one document per inquiry (upsert on save). */
const paymentPlanSchema = new mongoose.Schema(
  {
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
      unique: true,
    },
    travelDate: { type: Date, set: (v) => (v === '' || v === null ? undefined : v) },
    bookingType: { type: String, trim: true, default: '' },
    totalAmount: { type: Number, required: true, min: 0 },
    numberOfInstallments: { type: Number, required: true, min: 1 },
    paymentReceivedTillNow: { type: Number, min: 0, default: 0 },
    installments: { type: [installmentSchema], default: [] },
    // Plan-level roll-up of per-installment verification: true only when every
    // installment is VERIFIED. Derived on save/verify — the amendment "won" gate
    // and the account "Unverified" queue read it. Never set directly by the client.
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: String, trim: true },
    createdBy: { type: String, required: true, trim: true },
    updatedBy: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

/** Unverified queue: find plans with any PENDING installment, newest submission first. */
paymentPlanSchema.index({ 'installments.verificationStatus': 1, updatedAt: -1 });

const PaymentPlan = mongoose.model('PaymentPlan', paymentPlanSchema);

module.exports = PaymentPlan;
