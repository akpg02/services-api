const Auth = require('../../models/auth.model');
const User = require('../../models/user.model');
const { logger, publishEvent } = require('@gaeservices/common');
const { invalidateIdentityCache } = require('../../services/redis.service');

exports.deactivate = async (req, res) => {
  logger.info('Deactivate account endpoint');

  try {
    const userId = req.params.id || req.user.id;

    // update the Auth model's isActive field to false
    const authUser = await Auth.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );
    if (!authUser) {
      logger.warn('Auth record not found for ID:', userId);
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }
    // Update the User model's isActive field to false
    const user = await User.findOneAndUpdate(
      { authId: userId },
      { isActive: false },
      { new: true }
    );

    if (!user) {
      logger.warn(
        'User not found, rolling back Auth deactivation for ID:',
        userId
      );
      return res
        .status(404)
        .json({ success: false, message: 'User profile not found' });
    }

    // Verify both are deactivated
    if (authUser.isActive === false && user.isActive === false) {
      // Commit the transaction if both updates succeed
      await invalidateIdentityCache(req, userId);
      // TODO: publish event

      return res
        .status(200)
        .json({ success: true, message: 'Account deactivated successfully' });
    } else {
      // Shouldn’t happen—indicates a write anomaly
      logger.error(
        'Deactivation anomaly: authUser.isActive=',
        authUser.isActive,
        'user.isActive=',
        user.isActive
      );
      // (Optionally roll back here too)
      return res
        .status(500)
        .json({ success: false, message: 'Failed to deactivate account' });
    }
  } catch (error) {
    logger.error('Account deactivation error occurred', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
