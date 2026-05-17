const mongoose = require('mongoose');
const { AMENDMENT_TYPE_VALUES } = require('../constants/amendmentType');
const { AMENDMENT_STATUS_VALUES } = require('../constants/amendmentStatus');

const amendmentSchema = new mongoose.Schema(
  {
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', required: true },
    amendmentId: { type: String, required: true, trim: true },
    amendmentType: { type: String, required: true, enum: AMENDMENT_TYPE_VALUES },
    status: { type: String, required: true, enum: AMENDMENT_STATUS_VALUES },
    amountCharged: { type: Number, min: 0 },
    sessionId: { type: String, trim: true },
    createdBy: { type: String, required: true, trim: true },
    processedAt: { type: Date, required: true },
    chatLockedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

amendmentSchema.index({ amendmentId: 1 }, { unique: true });
amendmentSchema.index({ inquiryId: 1, createdAt: -1 });
amendmentSchema.index({ inquiryId: 1, status: 1 });

const Amendment = mongoose.model('Amendment', amendmentSchema);

module.exports = Amendment;
