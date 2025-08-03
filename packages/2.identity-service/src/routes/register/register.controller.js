const Queue = require('bull');
const Auth = require('../../models/auth.model');
const User = require('../../models/user.model');
const { registerSchema } = require('../../schemes/register');
const {
  publishEvent,
  logger,
  invalidateCache,
} = require('@gaeservices/common');
const {
  generateTokens,
  generateVerificationCode,
} = require('../../utils/generate-token');

const emailQueue = new Queue('emailQueue');

exports.register = async (req, res) => {
  logger.info('Registration endpoint');
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

    let existing = await Auth.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      logger.warn('User already exists');
      return res
        .status(400)
        .json({ success: false, message: 'User already exists' });
    }
    // Create email verification token
    // const randomBytes = await Promise.resolve(crypto.randomBytes(20));
    // const randomCharacters = randomBytes.toString('hex');
    const emailVerificationToken = generateVerificationCode();

    // Create Auth entry inside the transaction
    const authUser = await Auth.create({
      email,
      username,
      password,
      phone,
      isActive: true,
      emailVerificationToken,
      verifcationTokenExpiresAt: Date.now() + 1 * 60 * 60 * 1000,
    });

    logger.warn('Auth user saved', authUser._id);

    // Create User Profile entry inside the transaction
    let user;
    try {
      user = await User.create({
        authId: authUser.id,
        profile: {
          firstname,
          lastname,
          avatar,
          bio,
        },
      });
      logger.warn('User profile saved', user._id);
    } catch (error) {
      logger.error('User creation failed, rolling back Auth', error);
      // delete the orphaned Auth doc
      await Auth.deleteOne({ _id: authUser.id });
      // rethrow so outer handles the response
      throw error;
    }

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
