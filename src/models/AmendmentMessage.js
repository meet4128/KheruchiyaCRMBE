const mongoose = require('mongoose');
const { WHATSAPP_MESSAGE_DIRECTIONS } = require('../constants/whatsappMessageDirection');
const { AMENDMENT_MESSAGE_TYPE_VALUES } = require('../constants/amendmentMessageType');

const amendmentMessageSchema = new mongoose.Schema(
  {
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', required: true },
    sessionId: { type: String, trim: true },
    amendmentId: { type: String, trim: true },
    direction: { type: String, required: true, enum: WHATSAPP_MESSAGE_DIRECTIONS },
    senderType: {
      type: String,
      required: true,
      enum: ['employee', 'customer', 'system'],
    },
    type: { type: String, required: true, enum: AMENDMENT_MESSAGE_TYPE_VALUES, default: 'text' },
    text: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true },
    fileName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    // Index (unique + sparse) is declared explicitly below — keep it off the field
    // definition too, or Mongoose warns "Duplicate schema index on {wamid:1}".
    wamid: { type: String, trim: true },
    peerPhone: { type: String, trim: true },
    createdBy: { type: String, trim: true },
    waTimestamp: { type: Date },
  },
  {
    timestamps: true,
  }
);

amendmentMessageSchema.index({ sessionId: 1, createdAt: 1 });
amendmentMessageSchema.index({ amendmentId: 1, createdAt: 1 });
amendmentMessageSchema.index({ wamid: 1 }, { unique: true, sparse: true });

const AmendmentMessage = mongoose.model('AmendmentMessage', amendmentMessageSchema);

module.exports = AmendmentMessage;
