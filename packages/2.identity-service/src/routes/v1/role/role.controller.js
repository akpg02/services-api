const { updateUserRole } = require('../../../models/auth.model');
const { updateUserRoleSchema } = require('../../../schemes/role');
const { logger, publishEvent } = require('@gaeservices/common');

exports.role = async (req, res) => {
  logger.info('Update user role endpoint');
  try {
    const { error } = updateUserRoleSchema(req.body);
    if (error) {
      logger.warn(
        'Validation error',
        error.details.map((d) => d.message)
      );
      return res
        .status(400)
        .json({ success: false, message: error.details.map((d) => d.message) });
    }
    // find and update the user role
    const user = await updateUserRole(req.params.id, req.body.role);
    if (!user) {
      logger.warn('User not found');
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }
    // TODO: publish event?
    return res
      .status(200)
      .json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    logger.error('Error occurred while updating role', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
