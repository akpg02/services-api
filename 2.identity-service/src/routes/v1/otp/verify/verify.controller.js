const { logger } = require('@gaeservices/common');
const { verifyOTPScheme } = require('../../../../schemes/otp');
const { getUserForOTP, hashOTP } = require('../../../../utils/sms.utils');
const { generateTokens } = require('../../../../utils/generate-token.utils');
const {
  rememberTrustedDevice,
} = require('../../../../utils/trusted-device.utils');

exports.verifyOTP = async (req, res) => {
  logger.info('Verify OTP endpoint');
  try {
    const { value, error } = verifyOTPScheme(req.body);
    if (error) {
      const messages = error.details.map((d) => d.message);
      logger.warn('OTP verify validation error', messages);
      return res.status(400).json({ success: false, message: messages });
    }

    const user = await getUserForOTP(value);
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired OTP' });

    // Compare hashed values
    const candidate = hashOTP(value.otp, user._id);
    const expired = !user.otpExpires || new Date(user.otpExpires) < Date.now();
    if (!user.otp || user.otp !== candidate || expired) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired OTP' });
    }

    // clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateModifiedOnly: true });

    // set trusted-device cookie if asked
    if (value.rememberDevice) {
      await rememberTrustedDevice(user, req, res, {
        label: value.deviceLabel,
      });
    }

    const { accessToken } = await generateTokens(res, user);
    return res.status(200).json({ success: true, accessToken });
  } catch (err) {
    logger.error('Error occurred while verifying OTP code', err.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
