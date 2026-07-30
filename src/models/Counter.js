const mongoose = require('mongoose');

/**
 * Generic atomic counter. One document per named sequence (e.g. `inquiryNumber`),
 * incremented via `$inc` so concurrent readers never receive the same value.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
