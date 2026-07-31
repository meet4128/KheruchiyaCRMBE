const mongoose = require('mongoose');

/**
 * Per-user, per-inquiry Q&A read marker. Stores when a user last opened an
 * inquiry's WhatsApp Q&A thread. Inbound messages that arrive after `lastReadAt`
 * are counted as unread for that user (see inquiryService.attachUnreadCounts).
 *
 * Read-state is per user by design: two agents can have different unread counts
 * for the same inquiry. It lives server-side so it survives across devices.
 */
const qnaReadStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
    },
    lastReadAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
  }
);

/** One marker per (user, inquiry) — upserted on each Q&A open. */
qnaReadStateSchema.index({ userId: 1, inquiryId: 1 }, { unique: true });

const QnaReadState = mongoose.model('QnaReadState', qnaReadStateSchema);

module.exports = QnaReadState;
