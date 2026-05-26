const mongoose = require('mongoose');
const { AUTH_TOKEN_PURPOSE_VALUES } = require('../constants/authTokenPurpose');

/**
 * Single-use, hashed-at-rest token used for "Set your password" (invite) and
 * "Forgot password" (reset) flows.
 *
 * The raw token is only ever sent in the email link; only its sha256 hash is
 * persisted, so even a DB leak cannot be replayed.
 *
 * `expiresAt` doubles as a Mongo TTL index — expired rows are auto-removed.
 */
const authTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: AUTH_TOKEN_PURPOSE_VALUES,
      required: true,
    },
    tokenHash: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true }
);

authTokenSchema.index({ tokenHash: 1 }, { unique: true });
authTokenSchema.index({ userId: 1, purpose: 1, usedAt: 1 });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthToken = mongoose.model('AuthToken', authTokenSchema);

module.exports = AuthToken;
