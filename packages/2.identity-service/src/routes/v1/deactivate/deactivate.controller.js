const mongoose = require('mongoose');
const { deactivateAuthId } = require('../../../models/auth.model');
const { deactivateUserId } = require('../../../models/user.model');
const { logger, publishEvent } = require('@gaeservices/common');
const { invalidateIdentityCache } = require('../../../services/redis.service');

exports.deactivate = async (req, res) => {
  logger.info('Deactivate account endpoint');
  const userId = req.params.id || req.user.id;
  const session = await mongoose.startSession();
  try {
    let resultAuth, resultUser;

    await session.withTransaction(async () => {
      resultAuth = await deactivateAuthId(userId, { session });
      if (!resultAuth) {
        throw new Error('Auth record not found');
      }

      resultUser = await deactivateUserId(userId, { session });
      if (!resultUser) {
        throw new Error('User profile not found');
      }

      // other write-events, logs, etc. can also go here...
      // TODO: publish event
    });

    await invalidateIdentityCache(userId);
    return res
      .status(200)
      .json({ success: true, message: 'Account deactivated successfully' });
  } catch (err) {
    logger.error('Deactivation transaction failed', err.message);
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};
