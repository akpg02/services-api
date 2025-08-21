const { logger } = require('../../../0.common/utils/logger');
const { sender, transport } = require('./mailtrap.config');
const {
  VERIFICATION_EMAIL_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  EMAIL_CHANGE_SUCCESS_TEMPLATE,
  USERNAME_CHANGE_SUCCESS_TEMPLATE,
  OTP_EMAIL_TEMPLATE,
} = require('./email-templates');

exports.sendVerificationEmail = async (email, verificationToken) => {
  try {
    const response = await transport.sendMail({
      from: sender,
      to: email,
      subject: 'Verify Your Email',
      html: VERIFICATION_EMAIL_TEMPLATE.replace(
        '{verificationCode}',
        verificationToken
      ),
    });

    if (!response.accepted || response.accepted.length === 0) {
      logger.error('Email was not accepted by the SMTP server', response);
      throw new Error('Email was not accepted by the SMTP server');
    }

    logger.info('Email sent successfully', response);
    return response;
  } catch (error) {
    logger.error(`Error sending verification email: ${error}`);
    throw new Error(`Error sending verification email: ${error}`);
  }
};

exports.sendOTPEmail = async (email, otpCode) => {
  try {
    const response = await transport.sendMail({
      from: sender,
      to: email,
      subject: 'Your OTP Code',
      html: OTP_EMAIL_TEMPLATE.replace('{otpCode}', otpCode),
    });

    if (!response.accepted || response.accepted.length === 0) {
      logger.error('Email was not accepted by the SMTP server', response);
      throw new Error('Email was not accepted by the SMTP server');
    }

    logger.info('Email sent successfully', response);
    return response;
  } catch (error) {
    logger.error(`Error sending otp email: ${error}`);
    throw new Error(`Error sending otp email: ${error}`);
  }
};

exports.sendWelcomeEmail = async (email, name) => {
  try {
    const response = await transport.sendMail({
      from: sender,
      to: email,
      subject: 'Welcome!',
      html: WELCOME_EMAIL_TEMPLATE.replace('{name}', name),
    });

    if (!response.accepted || response.accepted.length === 0) {
      logger.error('Email was not accepted by the SMTP server', response);
      throw new Error('Email was not accepted by the SMTP server');
    }

    logger.info('Email sent successfully', response);
    return response;
  } catch (error) {
    logger.error(`Error sending welcome email: ${error}`);
    throw new Error(`Error sending welcome email: ${error}`);
  }
};

exports.sendPasswordResetEmail = async (email, resetURL) => {
  try {
    const response = await transport.sendMail({
      from: sender,
      to: email,
      subject: 'Password Reset Request',
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', resetURL),
    });

    if (!response.accepted || response.accepted.length === 0) {
      logger.error('Email was not accepted by the SMTP server', response);
      throw new Error('Email was not accepted by the SMTP server');
    }

    logger.info('Email sent successfully', response);
    return response;
  } catch (error) {
    logger.error(`Error sending password reset request email: ${error}`);
    throw new Error(`Error sending password reset request email: ${error}`);
  }
};

exports.sendResetSuccessEmail = async (email) => {
  try {
    const response = await transport.sendMail({
      from: sender,
      to: email,
      subject: 'Password Reset Confirmation',
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    });

    if (!response.accepted || response.accepted.length === 0) {
      logger.error('Email was not accepted by the SMTP server', response);
      throw new Error('Email was not accepted by the SMTP server');
    }

    logger.info('Email sent successfully', response);
    return response;
  } catch (error) {
    logger.error(`Error sending password reset successful email: ${error}`);
    throw new Error(`Error sending password reset request email: ${error}`);
  }
};

exports.sendEmailChangeSuccessConfirmation = async (email) => {
  try {
    const response = await transport.sendMail({
      from: sender,
      to: email,
      subject: 'Email change Confirmation',
      html: EMAIL_CHANGE_SUCCESS_TEMPLATE,
    });

    if (!response.accepted || response.accepted.length === 0) {
      logger.error('Email was not accepted by the SMTP server', response);
      throw new Error('Email was not accepted by the SMTP server');
    }

    logger.info('Email sent successfully', response);
    return response;
  } catch (error) {
    logger.error(`Error sending email update  email: ${error}`);
    throw new Error(`Error sending email update request email: ${error}`);
  }
};

exports.sendUsernameChangeConfirmation = async (email, name, newUsername) => {
  try {
    const response = await transport.sendMail({
      from: sender,
      to: email,
      subject: 'Username Update Confirmation',
      html: USERNAME_CHANGE_SUCCESS_TEMPLATE.replace(
        '{name}',
        name,
        '{newUsername}',
        newUsername
      ),
    });

    if (!response.accepted || response.accepted.length === 0) {
      logger.error('Email was not accepted by the SMTP server', response);
      throw new Error('Email was not accepted by the SMTP server');
    }

    logger.info('Email sent successfully', response);
    return response;
  } catch (error) {
    logger.error(
      `Error sending username change email successful email: ${error}`
    );
    throw new Error(
      `Error sending username change email request email: ${error}`
    );
  }
};
