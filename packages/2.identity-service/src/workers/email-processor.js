const Queue = require('bull');
const { logger } = require('../../../0.common/utils/logger');
const {
  sendPasswordResetEmail,
  sendResetSuccessEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendEmailChangeSuccessConfirmation,
  sendUsernameChangeConfirmation,
} = require('../email/email');

const emailQueue = new Queue('emailQueue');

// Process password reset email jobs
emailQueue.process('sendPasswordResetEmail', async (job) => {
  logger.info('Workers thread is working - Password reset queue');
  try {
    await sendPasswordResetEmail(job.data.email, job.data.resetUrl);
    logger.info(`Password reset email sent to ${job.data.email}`);
  } catch (error) {
    logger.error(`Error sending password reset email: ${error.message}`);
    throw error;
  }
});

emailQueue.process('sendResetSuccessEmail', async (job) => {
  logger.info('Workers thread is working - Password reset successful queue');
  try {
    await sendResetSuccessEmail(job.data.email);
    logger.info(`Reset email sent to ${job.data.email}`);
  } catch (error) {
    logger.error(`Error sending reset success email: ${error.message}`);
    throw error;
  }
});

emailQueue.process('sendVerificationEmail', async (job) => {
  logger.info('Workers thread is working - Email verification queue');
  try {
    await sendVerificationEmail(job.data.email, job.data.verificationToken);
    logger.info(`Email verification sent to ${job.data.email}`);
  } catch (error) {
    logger.error(`Error sending email verification email: ${error.message}`);
    throw error;
  }
});

emailQueue.process('sendWelcomeEmail', async (job) => {
  logger.info('Workers thread is working - Welcome email queue');
  try {
    await sendWelcomeEmail(job.data.email, job.data.username);
    logger.info(`Welcome email sent to ${job.data.email}`);
  } catch (error) {
    logger.error(`Error sending welcome email: ${error.message}`);
    throw error;
  }
});

emailQueue.process('sendEmailChangeSuccessConfirmation', async (job) => {
  logger.info('Workers thread is working - Welcome email queue');
  try {
    await sendEmailChangeSuccessConfirmation(job.data.email, job.data.username);
    logger.info(`Email changge notification sent to ${job.data.email}`);
  } catch (error) {
    logger.error(`Error sending welcome email: ${error.message}`);
    throw error;
  }
});

emailQueue.process('sendUsernameChangeConfirmation', async (job) => {
  logger.info('Workers thread is working - Welcome email queue');
  try {
    await sendUsernameChangeConfirmation(job.data.email, job.data.username);
    logger.info(`Username change confirmation email sent to ${job.data.email}`);
  } catch (error) {
    logger.error(`Error sending welcome email: ${error.message}`);
    throw error;
  }
});
