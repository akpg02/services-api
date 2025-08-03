const User = require('../../models/user.model');
const RefreshToken = require('../../models/token.model');
const { logger, publishEvent, isEmail } = require('@gaeservices/common');
const { loginSchema } = require('../../schemes/login');
const { generateTokens } = require('../../utils/generate-token');
const {
  getUserByEmail,
  getUserByUsername,
} = require('../../services/auth.service');

exports.login = async (req, res) => {
  logger.info('Login endpoint');
  const cookies = req.cookies;
  try {
    const { value, error } = loginSchema(req.body);
    if (error) {
      logger.warn(
        'Validation error',
        error.details.map((d) => d.message)
      );
      return res
        .status(400)
        .json({ success: false, message: error.details.map((d) => d.message) });
    }

    const { username, password } = value;
    const isValidEmail = isEmail(username);
    const user = !isValidEmail
      ? await getUserByUsername(username)
      : await getUserByEmail(username);

    if (!user) {
      logger.warn('Username and/or password is incorrect');
      return res.status(400).json({
        success: false,
        message: 'Username and/or password is incorrect',
      });
    }

    // valid password?
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn('Invalid password');
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
    await User.findOneAndUpdate(
      { authId: user._id },
      { isActive: true, lastActiveAt: new Date() },
      { new: true }
    );

    // Generate tokens only afer all validations and updates have succeeded
    const { accessToken } = await generateTokens(res, user);

    // check if refreshToken exists in the cookies of the user
    const existingToken = await RefreshToken.findOne({
      token: cookies?.refreshToken,
    });

    // if it does, delete the old cookie
    if (existingToken) {
      await RefreshToken.deleteOne({ token: existingToken.token });
    }

    // TODO: publish event?

    return res.status(200).json({ accessToken });
  } catch (error) {
    logger.error('Login error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
