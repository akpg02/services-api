const { findUserByEmailOrPhone } = require('../../../../models/auth.model');
const { logger } = require('@gaeservices/common');
const { verifyOTPScheme } = require('../../../../schemes/otp');

exports.verifyOTP = async (req, res) => {
  logger.info('Verify OTP endpoint');
  try {
    const { value, error } = verifyOTPScheme(req.body);
    if (error) {
      const messages = error.details.map((d) => d.message);
      logger.warn('Validation error', messages);
      return res.status(400).json({ success: false, message: messages });
    }
    const { email, phone, otp } = value;

    const user = await findUserByEmailOrPhone(email, phone, {
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired OTP' });

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const tempUser = {
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const { accessToken, refreshToken } = await generateTokens(res, tempUser);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(200).json({ success: true, accessToken });
  } catch (error) {
    logger.error('Error occurred while verifying OTP code', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
