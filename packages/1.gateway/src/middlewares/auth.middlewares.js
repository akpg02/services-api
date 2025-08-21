const jwt = require('jsonwebtoken');
const { logger } = require('@gaeservices/common');

const validateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Access attempt without valid token');
    return res
      .status(401)
      .json({ success: false, message: 'Authentication required' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid token');
      return res
        .status(429)
        .json({ success: false, message: 'Invalid token!' });
    }
    req.user = user;
    next();
  });
};

const validateTokenFromCookie = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    logger.warn('Access attempt without valid token');
    return res
      .status(401)
      .json({ success: false, message: 'No token provided!' });
  }
  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    logger.error('Invalid token');
    return res.status(429).json({ success: false, message: 'Invalid token!' });
  }
};

module.exports = { validateToken, validateTokenFromCookie };
