const mongoose = require('mongoose');
const { WHATSAPP_DELIVERY_STATUS_VALUES } = require('../constants/whatsappDeliveryStatus');
const { WHATSAPP_MESSAGE_TYPE_VALUES } = require('../constants/whatsappSendType');
const { WHATSAPP_MESSAGE_DIRECTIONS } = require('../constants/whatsappMessageDirection');

const whatsappMessageSchema = new mongoose.Schema(
  {
    wamid: { type: String, required: true, trim: true },
    direction: { type: String, required: true, enum: WHATSAPP_MESSAGE_DIRECTIONS },
    peerPhone: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{10,15}$/,
    },
    /** Inquiry this message belongs to — stamped on send / inbound attribution */
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry' },
    /** Amendment session active when the message was attributed */
    sessionId: { type: String, trim: true },
    type: {
      type: String,
      required: true,
      enum: WHATSAPP_MESSAGE_TYPE_VALUES,
      default: 'text',
    },
    text: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true },
    fileName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    waTimestamp: { type: Date },
    deliveryStatus: {
      type: String,
      enum: WHATSAPP_DELIVERY_STATUS_VALUES,
    },
    deliveryError: { type: String, trim: true },
    statusUpdatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

/** Meta message id — idempotent webhook retries */
whatsappMessageSchema.index({ wamid: 1 }, { unique: true });

/** Conversation list + thread queries */
whatsappMessageSchema.index({ peerPhone: 1, createdAt: -1 });

/** Per-inquiry isolated thread queries (scoped Q&A chat) */
whatsappMessageSchema.index({ peerPhone: 1, inquiryId: 1, createdAt: -1 });

const WhatsappMessage = mongoose.model('WhatsappMessage', whatsappMessageSchema);

module.exports = WhatsappMessage;
