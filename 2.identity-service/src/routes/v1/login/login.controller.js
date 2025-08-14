const { updateUser } = require('../../../models/user.model');
const { fetchToken, deleteToken } = require('../../../models/token.model');
const { logger, publishEvent, isEmail } = require('@gaeservices/common');
const { loginSchema } = require('../../../schemes/login');
const { generateTokens } = require('../../../utils/generate-token');
const {
  getUserByEmail,
  getUserByUsername,
} = require('../../../services/auth.service');
const { issueLoginOTP } = require('../../../services/otp.service');

exports.login = async (req, res) => {
  logger.info('POST /auth/login');
  try {
    const { value, error } = loginSchema(req.body);
    if (error) {
      const messages = error.details.map((d) => d.message);
      logger.warn('Login Validation failed', messages);
      return res.status(400).json({ success: false, message: messages });
    }

    const { username, password } = value;

    const lookup = isEmail(username) ? getUserByEmail : getUserByUsername;
    const user = await lookup(username);

    if (!user) {
      logger.warn('User not found during login');
      return res.status(400).json({
        success: false,
        message: 'Username and/or password is incorrect',
      });
    }

    // valid password?
    const ok = await user.comparePassword(password);
    if (!ok) {
      logger.warn('Invalid password attempt');
      return res.status(400).json({
        success: false,
        message: 'Username and/or password is incorrect',
      });
    }

    // Reactivate user if they were inactive
    if (!user.isActive) {
      user.isActive = true;
      // update last activity timestamp
      user.lastActiveAt = new Date();
      await user.save({ validateModifiedOnly: true });
    }
    // Update User model
    await updateUser(user._id, { isActive: true, lastActiveAt: new Date() });

    // OTP step
    const via = user.phone ? 'sms' : 'email';
    const sent = await issueLoginOTP(user, { via });

    return res.status(202).json({
      success: true,
      requiresOTP: true,
      delivery: sent.via,
      to: sent.destination,
      hint: 'Submit OTP to /v1/auth/otp/verify to complete login',
    });
  } catch (error) {
    logger.error('Login error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
