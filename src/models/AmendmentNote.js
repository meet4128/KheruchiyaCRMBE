const mongoose = require('mongoose');

const amendmentNoteSchema = new mongoose.Schema(
  {
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', required: true },
    sessionId: { type: String, trim: true },
    amendmentId: { type: String, trim: true },
    text: { type: String, required: true, trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  }
);

amendmentNoteSchema.index({ sessionId: 1, createdAt: 1 });
amendmentNoteSchema.index({ amendmentId: 1, createdAt: 1 });

const AmendmentNote = mongoose.model('AmendmentNote', amendmentNoteSchema);

module.exports = AmendmentNote;
