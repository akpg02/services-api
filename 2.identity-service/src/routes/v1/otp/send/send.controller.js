const Queue = require('bull');
const { logger } = require('@gaeservices/common');
const { sendOTPSchema } = require('../../../../schemes/otp');
const { sendSMS, getUserForOTP, hashOTP } = require('../../../../utils/sms');
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

    const user = await getUserForOTP(value);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    const otp = generateVerificationCode();
    const digest = hashOTP(otp, user._id);

    user.otp = digest;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateModifiedOnly: true });

    const destEmail = value.email || user.email;
    const destPhone = value.phone || user.phone;

    if (value.phone || (!value.email && destPhone)) {
      await sendSMS(destPhone, `YOur OTP code is ${otp}`);
      logger.info(`OTP send via SMS to ${destPhone}`);
      return res
        .status(200)
        .json({ success: true, message: 'OTP sent via SMS' });
    }

    if (destEmail) {
      await emailQueue.add('sendOTPEmail', { email: destEmail, otpCode: otp });
      logger.info(`OTP queued via email to ${destEmail}`);
      return res
        .status(200)
        .json({ success: true, message: 'OTP sent via email' });
    }
    // username provided but no usable contact info
    return res.status(400).json({
      success: false,
      message:
        'No deliverable contact found. Please provide email or phone on file.',
    });
  } catch (err) {
    logger.error('Error occurred while sending OTP code', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
