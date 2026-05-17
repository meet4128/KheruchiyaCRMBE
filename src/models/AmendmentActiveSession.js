const mongoose = require('mongoose');

/**
 * Maps live WhatsApp chat (pre-finalize) to inquiry + sessionId for webhook routing.
 */
const amendmentActiveSessionSchema = new mongoose.Schema(
  {
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', required: true },
    sessionId: { type: String, required: true, trim: true },
    peerPhone: { type: String, trim: true, match: /^\d{10,15}$/ },
    createdBy: { type: String, required: true, trim: true },
    finalizedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

amendmentActiveSessionSchema.index({ sessionId: 1 }, { unique: true });
amendmentActiveSessionSchema.index({ peerPhone: 1, finalizedAt: 1 });

const AmendmentActiveSession = mongoose.model(
  'AmendmentActiveSession',
  amendmentActiveSessionSchema
);

module.exports = AmendmentActiveSession;
