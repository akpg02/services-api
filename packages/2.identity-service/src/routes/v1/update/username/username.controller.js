const Queue = require('bull');
const {
  findUserByEmailOrUsername,
  findUserById,
} = require('../../../../models/auth.model');
const { deleteAllUserTokens } = require('../../../../models/token.model');
const { changeUsernameSchema } = require('../../../../schemes/username');
const { logger, publishEvent } = require('@gaeservices/common');

const emailQueue = new Queue('emailQueue');

exports.username = async (req, res) => {
  logger.info('Update username endpoint');
  try {
    const { error } = changeUsernameSchema(req.body);
    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    const { newUsername, currentPassword } = req.body;

    // Find the currently authenticated user by ID (provided by the protect middleware)
    const user = await findUserById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Verify the provided current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Incorrect current password' });
    }

    // check if username is already taken
    const existingUser = await findUserByEmailOrUsername(newUsername);
    if (existingUser && existingUser._id.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Username is unavailable.',
      });
    }

    user.username = newUsername;
    await user.save();

    await deleteAllUserTokens(req.user.id);

    await emailQueue.add('sendUsernameChangeConfirmation', {
      email: user.email,
    });
    logger.info(`Queued confirmation email for ${newUsername}`);

    // TODO: publish event?
    return res
      .status(200)
      .json({ success: true, message: 'Username updated successfully' });
  } catch (error) {
    logger.error('Update username error: ', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
