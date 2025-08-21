const { ApiFeatures, logger } = require('@gaeservices/common');
const {
  fetchAllDevices,
  revokeTrustedDevice,
  revokeAllTrustedDevices,
} = require('../../../models/trusted-device.model');

exports.listDevices = async (req, res) => {
  const userId = req.user.id;
  const features = new ApiFeatures(fetchAllDevices(userId), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  let devices = await features.query;
  res.json({ count: devices.length, data: devices });
};

exports.revokeDevice = async (req, res) => {
  const userId = req.user.id;
  const { deviceId } = req.params;
  try {
    await revokeTrustedDevice(userId, deviceId);
  } catch (err) {
    logger.error('Error while revoking a device', err);
    return res.status(400).json({ success: false, error: err });
  }
  return res.status(204).json({ success: true });
};

exports.revokeAll = async (req, res) => {
  const userId = req.user.id;
  try {
    await revokeAllTrustedDevices(userId);
  } catch (error) {
    logger.error('Error while revoking all device', err);
    return res.status(400).json({ success: false, error: err });
  }
  res.status(204).json({ success: true });
};
