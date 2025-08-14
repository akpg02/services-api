const { logger } = require('../utils/logger');

exports.authenticateRequest = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role']
    ? JSON.parse(req.headers['x-user-role'])
    : [];

  if (!userId || role?.length < 1) {
    logger.warn(`Access attempted without user ID`);
    return res.status(401).json({
      success: false,
      message: 'Authentication required! Please login to continue',
    });
  }
  req.user = { id: userId, role: role };
  next();
};

exports.restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required!',
      });
    }

    const hasAccess = allowedRoles.some((role) => req.user.role.includes(role));
    if (!hasAccess) {
      return res.status(403).json({
        // 403 is more appropriate here
        success: false,
        message: 'Not Authorized',
      });
    }
    next();
  };
};
