const trustedDeviceDB = require('../../../models/trusted-device.mongo');

exports.listDevices = async (req, res) => {
  const userId = req.user.id;
  const devices = await trustedDeviceDB
    .find({ user: userId })
    .select(
      'deviceId label lastUsedAt createdAt expiresAt revokedAt ipAtIssue'
    );
  res.json({ success: true, devices });
};

exports.revokeDevice = async (req, res) => {
  const userId = req.user.id;
  const { deviceId } = req.params;
  await trustedDeviceDB.findOneAndUpdate(
    { user: userId, deviceId },
    { revokedAt: new Date() }
  );
  res.json({ success: true });
};

exports.revokeAll = async (req, res) => {
  const userId = req.user.id;
  await trustedDeviceDB.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  res.json({ success: true });
};
