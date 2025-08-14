const rateLimit = require('express-rate-limit');

exports.usernameUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    status: 'fail',
    message: 'Too many username changes, please try again later.',
    key: 'username-update-limit',
  },
  keyGenerator: (req) => req.user.id, // Limit per user
});

exports.emailUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  message: {
    status: 'fail',
    message: 'Too many email changes, please try again later.',
    key: 'email-update-limit',
  },
  keyGenerator: (req) => req.user.id, // Limit per user
});

exports.forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    'Too mnay password reset requests from this IP, please try again later',
});
