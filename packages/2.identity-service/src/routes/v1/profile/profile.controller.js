const { findUserWithAuthId } = require('../../../models/user.model');
const { logger } = require('@gaeservices/common');

exports.profile = async (req, res) => {
  logger.info('Get a user endpoint');
  try {
    const userId = req.params.id || req.user.id;

    const cacheKey = `user:${userId}`;
    const cachedUser = await req.redisClient.get(cacheKey);

    if (cachedUser) {
      return res.json(JSON.parse(cachedUser));
    }

    // Use the auth ID (from req.user.authId provided by the authentication middleware)
    const includeRole = false;
    const profile = await findUserWithAuthId(userId, { includeRole });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(profile));
    return res.json(profile);
  } catch (error) {
    logger.error('Get profile error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
