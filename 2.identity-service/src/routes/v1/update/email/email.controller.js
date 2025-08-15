const Queue = require('bull');
const {
  findUserById,
  findUserByEmailOrUsername,
} = require('../../../../models/auth.model');
const { deleteAllUserTokens } = require('../../../../models/token.model');
const { changeEmailSchema } = require('../../../../schemes/email');
const { logger, publishEvent } = require('@gaeservices/common');
const {
  generateVerificationCode,
} = require('../../../../utils/generate-token.utils');
const {
  invalidateIdentityCache,
} = require('../../../../services/redis.service');

const emailQueue = new Queue('emailQueue');

exports.email = async (req, res) => {
  logger.info('Update email address endpoint');
  try {
    const { error } = changeEmailSchema(req.body);
    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { newEmail, currentPassword } = req.body;
    const auth = await findUserById(req.user.id);
    if (!auth) {
      logger.warn('User not found');
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if the current password is correct
    const isValidPassword = await auth.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Incorrect current password' });
    }

    // check if email is already taken
    const existingUser = await findUserByEmailOrUsername(newEmail);
    if (existingUser && existingUser._id.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Email address is unavailable.',
      });
    }

    // clear any old tokens
    auth.emailVerificationToken = undefined;
    auth.verifcationTokenExpiresAt = undefined;

    auth.pendingEmail = newEmail;
    auth.email = newEmail;
    auth.emailVerified = false;

    // Generate & persist new verification token + expiry
    const emailVerificationToken = generateVerificationCode();
    auth.emailVerificationToken = emailVerificationToken;
    auth.verifcationTokenExpiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    // save everything
    await auth.save();
    await invalidateIdentityCache(req, auth._id.toString());
    await deleteAllUserTokens(req.user.id);

    await emailQueue.add('sendEmailChangeSuccessConfirmation', {
      email: newEmail,
      verificationToken: emailVerificationToken,
    });
    logger.info(`Queued verification email for ${newEmail}`);

    // TODO: publish event

    return res.status(200).json({
      success: true,
      message: 'Email updated successfully. Please verify your email address',
    });
  } catch (error) {
    logger.error('Update email error: ', error);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
