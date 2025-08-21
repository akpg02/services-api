const { findByPasswordResetToken } = require('../../../../models/auth.model');
const { deleteAllUserTokens } = require('../../../../models/token.model');
const crypto = require('crypto');
const Queue = require('bull');
const { logger } = require('@gaeservices/common');
const { resetPasswordSchema } = require('../../../../schemes/password');

const emailQueue = new Queue('emailQueue');

exports.resetPassword = async (req, res) => {
  logger.info('Reset password endpoint');
  const { error } = resetPasswordSchema(req.body);
  if (error) {
    logger.warn(
      'Validation error',
      error.details.map((d) => d.message)
    );
    return res
      .status(400)
      .json({ success: false, message: error.details.map((d) => d.message) });
  }
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const auth = await findByPasswordResetToken(hashedToken);

    if (!auth) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired token' });
    }
    // check if the new password is the same as the current password
    const isSamePassword = await auth.comparePassword(password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must not be the same as the current password',
      });
    }

    auth.password = password;
    auth.passwordResetToken = undefined;
    auth.passwordResetExpiresAt = undefined;
    await auth.save();

    // Revoke all old refresh-tokens for this user
    await deleteAllUserTokens(auth._id);

    // Clear any lingering cookie on client side
    res.clearCookie('refreshToken');

    await emailQueue.add('sendResetSuccessEmail', { email: auth.email });

    return res
      .status(200)
      .json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error occurred', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
