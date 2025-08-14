const { logger } = require('@gaeservices/common');
const { verifyOTPScheme } = require('../../../../schemes/otp');
const { getUserForOTP, hashOTP } = require('../../../../utils/sms');

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
    const isExpired =
      !user.otpExpires || new Date(user.otpExpires) < new Date();
    const isMatch = user.otp && user.otp === candidate;

    if (!isMatch || isExpired) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired OTP' });
    }

    // clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateModifiedOnly: true });

    const { accessToken } = await generateTokens(res, user);

    return res.status(200).json({ success: true, accessToken });
  } catch (error) {
    logger.error('Error occurred while verifying OTP code', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
