const jwt = require('jsonwebtoken');
const Auth = require('../models/auth.model');
const { logger } = require('@gaeservices/common');

exports.protect = async (req, res, next) => {
  // get token
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ success: false, message: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];

  // verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    logger.warn('JWT verification failed', err);
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
  // load user
  const user = await Auth.findById(decoded.id);
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: 'User no longer exists' });
  }
  // check password change
  if (user.changePasswordAfter(decoded.iat)) {
    return res.status(401).json({
      success: false,
      message: 'Password was changed. Please login again.',
    });
  }
  // attach to request and proceed
  req.user = {
    id: user._id,
    username: user.username,
    role: user.role,
  };
  res.locals.user = req.user;
  next();
};
