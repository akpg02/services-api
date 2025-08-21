const { logger } = require('@gaeservices/common');

exports.authenticateRequest = async (req, res, next) => {
  const username = req.headers['x-user-username'];
  const role = req.headers['x-user-role']
    ? JSON.parse(req.headers['x-user-role'])
    : [];

  if (!username || role?.length < 1) {
    logger.warn(`Access attempted without username`);
    return res.status(401).json({
      success: false,
      message: 'Authentication required! Please login to continue',
    });
  }
  req.user = { username, role };
  res.locals.user = { username, role };
  next();
};
