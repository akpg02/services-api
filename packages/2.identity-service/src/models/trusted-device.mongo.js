const mongoose = require('mongoose');

const trustedDeviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auth',
      index: true,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    tokenHash: { type: String, required: true },
    uaHash: { type: String, required: true },
    label: { type: String },
    ipAtIssue: { type: String },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

trustedDeviceSchema.index({ user: 1, deviceId: 1 }, { unique: true });
trustedDeviceSchema.index({ user: 1, expiresAt: 1 });
trustedDeviceSchema.index({ user: 1, revokedAt: 1 });

module.exports = mongoose.model('TrustedDevice', trustedDeviceSchema);
