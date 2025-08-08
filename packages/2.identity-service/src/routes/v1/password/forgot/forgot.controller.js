const { findUserByEmailOrPhone } = require('../../../../models/auth.model');
const Queue = require('bull');
const { logger, publishEvent } = require('@gaeservices/common');
const { forgotPasswordSchema } = require('../../../../schemes/password');

const emailQueue = new Queue('emailQueue');

exports.forgotPassword = async (req, res) => {
  logger.info('Forgot password endpoint');
  try {
    const { value, error } = forgotPasswordSchema(req.body);
    if (error) {
      logger.warn(
        'Validation error',
        error.details.map((d) => d.message)
      );
      return res
        .status(400)
        .json({ success: false, message: error.details.map((d) => d.message) });
    }
    const { email } = value;
    const auth = await findUserByEmailOrPhone(email);
    if (!auth) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }

    // generate reset token
    const resetToken = auth.createPasswordResetToken();

    await auth.save({ validateBeforeSave: false });

    // send email
    await emailQueue.add('sendPasswordResetEmail', {
      email: auth.email,
      resetUrl: `${process.env.CLIENT_URL}/reset-password/${resetToken}`,
    });

    // TODO: publish Event

    return res.status(200).json({
      success: true,
      message: 'Password reset link has been sent to your email',
    });
  } catch (error) {
    logger.error('Forgot password error occurred', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
