const mongoose = require('mongoose');
const { PURCHASE_CHAT_SENDER_ROLE_VALUES } = require('../constants/purchaseChatSenderRole');
const { AMENDMENT_MESSAGE_TYPE_VALUES } = require('../constants/amendmentMessageType');

const purchaseTeamChatMessageSchema = new mongoose.Schema(
  {
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
    },
    purchaseTeamMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    senderUserId: { type: String, required: true, trim: true },
    senderRole: { type: String, required: true, enum: PURCHASE_CHAT_SENDER_ROLE_VALUES },
    type: { type: String, required: true, enum: AMENDMENT_MESSAGE_TYPE_VALUES, default: 'text' },
    text: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true },
    fileName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

purchaseTeamChatMessageSchema.index({
  inquiryId: 1,
  purchaseTeamMemberId: 1,
  createdAt: 1,
});

const PurchaseTeamChatMessage = mongoose.model(
  'PurchaseTeamChatMessage',
  purchaseTeamChatMessageSchema
);

module.exports = PurchaseTeamChatMessage;
