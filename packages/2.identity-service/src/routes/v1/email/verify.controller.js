const { findByVerificationToken } = require('../../../models/auth.model');
const Queue = require('bull');
const { logger, publishEvent } = require('@gaeservices/common');
const { verifyEmailSchema } = require('../../../schemes/email');

const emailQueue = new Queue('emailQueue');

exports.verifyEmail = async (req, res) => {
  logger.info('Verify email endpoint');
  try {
    const { error } = verifyEmailSchema(req.body);

    if (error) {
      logger.warn(
        'Validation error',
        error.details.map((d) => d.message)
      );
      return res
        .status(400)
        .json({ success: false, message: error.details.map((d) => d.message) });
    }

    const { code } = req.body;

    const auth = await findByVerificationToken(code);

    if (!auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
    }

    // if it's email-change, swap pending -> active
    const isChangeFlow = Boolean(auth.pendingEmail);
    if (isChangeFlow) {
      auth.email = auth.pendingEmail;
      auth.pendingEmail = undefined;
    } else {
      // Otherwise it's first-time registration
      auth.emailVerified = true;
    }

    // always cleear token fields
    auth.emailVerificationToken = undefined;
    auth.verifcationTokenExpiresAt = undefined;
    await auth.save();

    if (isChangeFlow) {
      await emailQueue.add('sendEmailChangeConfirmation', {
        email: auth.email,
        username: auth.username,
      });
    } else {
      await emailQueue.add('sendWelcomeEmail', {
        email: auth.email,
        username: auth.username,
      });
    }

    // TODO: publish event?

    res.status(200).json({
      success: true,
      message: isChangeFlow
        ? 'Your new email address has been confirmed.'
        : 'Email verified successfully. Welcome aboard!',
      data: {
        id: auth._id,
        username: auth.username,
        email: auth.email,
        role: auth.role,
      },
    });
  } catch (error) {
    logger.error('Verify email error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
