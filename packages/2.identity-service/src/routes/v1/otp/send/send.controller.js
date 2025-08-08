const { findUserByEmailOrPhone } = require('../../../../models/auth.model');
const Queue = require('bull');
const { sendSMS } = require('../../../../utils/sms');
const { logger } = require('@gaeservices/common');
const { sendOTPSchema } = require('../../../../schemes/otp');
const {
  generateVerificationCode,
} = require('../../../../utils/generate-token');

const emailQueue = new Queue('emailQueue');

exports.sendOTP = async (req, res) => {
  logger.info('Send OTP endpoint');
  try {
    const { value, error } = sendOTPSchema(req.body);
    if (error) {
      const messages = error.details.map((d) => d.message);
      logger.warn('Validation error', messages);
      return res.status(400).json({ success: false, message: messages });
    }
    const { email, phone } = value;

    const user = await findUserByEmailOrPhone(email, phone);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    const otp = generateVerificationCode();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    if (email) {
      await emailQueue.add('sendOTPEmail', {
        email: user.email,
        otpCode: otp,
      });
    } else if (phone) {
      await sendSMS(phone, `Your OTP code is ${otp}`);
    }
    res.status(200).json({
      success: true,
      message: `OTP sent via ${email ? 'email' : 'SMS'}`,
    });
  } catch (error) {
    logger.error('Error occurred while sending OTP code', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
