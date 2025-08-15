const trustedDeviceDB = require('./trusted-device.mongo');

async function fetchAllDevices(userId) {
  return await trustedDeviceDB
    .find({ user: userId })
    .select(
      'deviceId label lastUsedAt createdAt expiresAt revokedAt ipAtIssue'
    );
}

async function revokeTrustedDevice(userId, deviceId) {
  return await trustedDeviceDB.findOneAndUpdate(
    { user: userId, deviceId },
    { revokedAt: new Date() }
  );
}

async function revokeAllTrustedDevices(userId) {
  return await trustedDeviceDB.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

module.exports = {
  fetchAllDevices,
  revokeTrustedDevice,
  revokeAllTrustedDevices,
};
