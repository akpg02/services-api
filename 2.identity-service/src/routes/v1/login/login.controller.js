const { updateUser } = require('../../../models/user.model');
const { fetchToken, deleteToken } = require('../../../models/token.model');
const { logger, publishEvent, isEmail } = require('@gaeservices/common');
const { loginSchema } = require('../../../schemes/login');
const { generateTokens } = require('../../../utils/generate-token');
const {
  getUserByEmail,
  getUserByUsername,
} = require('../../../services/auth.service');

exports.login = async (req, res) => {
  logger.info('POST /auth/login');
  const cookies = req.cookies;
  try {
    const { value, error } = loginSchema(req.body);
    if (error) {
      logger.warn(
        'Login Validation failed',
        error.details.map((d) => d.message)
      );
      return res
        .status(400)
        .json({ success: false, message: error.details.map((d) => d.message) });
    }

    const { username, password } = value;

    const user = isEmail(username)
      ? await getUserByEmail(username)
      : await getUserByUsername(username);

    if (!user) {
      logger.warn('User not found during login');
      return res.status(400).json({
        success: false,
        message: 'Username and/or password is incorrect',
      });
    }

    // valid password?
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
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
      await user.save();
    }

    // Update User model
    await updateUser(user._id, { isActive: true, lastActiveAt: new Date() });

    // Generate tokens only afer all validations and updates have succeeded
    const { accessToken } = await generateTokens(res, user);

    // check if refreshToken exists in the cookies of the user
    const existingToken = await fetchToken(cookies?.refreshToken);

    // if it does, delete the old cookie
    if (existingToken) {
      await deleteToken(existingToken.token);
    }

    // TODO: publish event?

    return res.status(200).json({ accessToken });
  } catch (error) {
    logger.error('Login error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
