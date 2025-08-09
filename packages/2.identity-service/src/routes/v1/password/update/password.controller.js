const { findUserById } = require('../../../../models/auth.model');
const { deleteAllUserTokens } = require('../../../../models/token.model');
const { changePasswordSchema } = require('../../../../schemes/password');
const { logger, publishEvent } = require('@gaeservices/common');

exports.password = async (req, res) => {
  logger.info('Update password endpoint');
  try {
    const { error } = changePasswordSchema(req.body);

    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    //extract old and new password
    const { currentPassword, newPassword } = req.body;

    // locate  current logged in user
    const user = await findUserById(req.user.id);

    if (!user) {
      logger.warn('User not found');
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }
    // valid password?
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      logger.warn('Invalid password');
      return res.status(400).json({
        success: false,
        message: 'Invalid password',
      });
    }

    user.password = newPassword;
    await user.save();

    await deleteAllUserTokens(req.user.id);

    // TODO: Publish event?

    return res
      .status(200)
      .json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Update pasword error: ', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
