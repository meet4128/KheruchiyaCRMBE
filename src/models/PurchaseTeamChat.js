const mongoose = require('mongoose');

const purchaseTeamChatSchema = new mongoose.Schema(
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
    createdBy: { type: String, required: true, trim: true },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
  }
);

purchaseTeamChatSchema.index({ inquiryId: 1, purchaseTeamMemberId: 1 }, { unique: true });
purchaseTeamChatSchema.index({ inquiryId: 1, lastMessageAt: -1 });
purchaseTeamChatSchema.index({ purchaseTeamMemberId: 1, lastMessageAt: -1 });

const PurchaseTeamChat = mongoose.model('PurchaseTeamChat', purchaseTeamChatSchema);

module.exports = PurchaseTeamChat;
