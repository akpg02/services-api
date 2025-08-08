const { fetchUserById, fetchAllUsers } = require('../../../models/user.model');
const mongoose = require('mongoose');
const { ApiFeatures, logger } = require('@gaeservices/common');

exports.all = async (req, res) => {
  logger.info('Get all users endpoint');
  try {
    // Single-user path
    if (req.params.id) {
      const id = req.params.id;

      if (!mongoose.isValidObjectId(id)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid user ID' });
      }
      // 2) Fetch by ID + populate
      const user = await fetchUserById(id);

      // 3) Not found?
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: 'User not found' });
      }

      // 4) Cache & return
      const cacheKey = `users:getuser:${id}`;
      await req.redisClient.setex(
        cacheKey,
        300,
        JSON.stringify({ count: 1, data: [user] })
      );
      return res.json({ count: 1, data: [user] });
    }
    // Multi-user path
    const cacheKey = 'users:getusers';
    const cached = await req.redisClient.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit for ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }

    const features = new ApiFeatures(fetchAllUsers(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate()
      .populate({
        path: 'authId',
        match: { isActive: true }, // only fetch users with an active account
        select: '-password -emailVerificationToken -passwordResetToken -__v',
      });

    let users = await features.query;

    const result = { count: users.length, data: users };

    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
    return res.json(result);
  } catch (error) {
    logger.error('Get all users error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
