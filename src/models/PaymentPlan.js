const mongoose = require('mongoose');
const { PAYMENT_MODE_VALUES } = require('../constants/paymentMode');

/**
 * Installment row — one per row in the "Payment Terms Finalised" table.
 * `status` is a free-text label computed on the frontend (e.g. "On Time" / "Late")
 * from dueDate vs receivedDate, so it is stored as-is.
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
    // Account-team verification state (drives the "Unverified" queue on the Accounting screen).
    // Every sales submit/update resets this to false; account-role users verify/un-verify.
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

/** Unverified queue: list plans awaiting account verification, newest submission first. */
paymentPlanSchema.index({ verified: 1, updatedAt: -1 });

const PaymentPlan = mongoose.model('PaymentPlan', paymentPlanSchema);

module.exports = PaymentPlan;
