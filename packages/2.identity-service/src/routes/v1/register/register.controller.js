const Queue = require('bull');
const { registerSchema } = require('../../../schemes/register');
const {
  findUserByEmailOrUsername,
  registerUser,
} = require('../../../models/auth.model');
const {
  publishEvent,
  logger,
  invalidateCache,
} = require('@gaeservices/common');
const {
  generateTokens,
  generateVerificationCode,
} = require('../../../utils/generate-token');

const emailQueue = new Queue('emailQueue');

exports.register = async (req, res) => {
  logger.info('POST /auth/register');
  try {
    // validate schema
    const { value, error } = registerSchema(req.body);
    if (error) {
      const messages = error.details.map((d) => d.message);
      logger.warn('Validation error', messages);
      return res.status(400).json({ success: false, message: messages });
    }
    const {
      username,
      email,
      password,
      firstname,
      lastname,
      phone,
      avatar,
      bio,
    } = value;

    let existing = await findUserByEmailOrUsername(email, username);
    if (existing) {
      logger.warn('User already exists');
      return res
        .status(400)
        .json({ success: false, message: 'User already exists' });
    }
    // Create email verification token
    const emailVerificationToken = generateVerificationCode();

    // Create user in User DB and Auth DB
    const { user } = await registerUser({
      email,
      username,
      password,
      phone,
      profile: { firstname, lastname, avatar, bio },
      emailVerificationToken,
      verifcationTokenExpiresAt,
    });

    await invalidateCache(req.redisClient, 'gateway', user._id.toString());

    const { accessToken, refreshToken } = await generateTokens(res, user);

    await emailQueue.add('sendVerificationEmail', {
      email: authUser.email,
      verificationToken: emailVerificationToken,
    });

    logger.info(`Queued verification email for ${authUser.email}`);

    // TODO: publish event?

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Registration error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
