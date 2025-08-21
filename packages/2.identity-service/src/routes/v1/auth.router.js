const express = require('express');
const passport = require('passport');
const { loginRouter } = require('../v1/login/login.router');
const { oauthRouter } = require('./oauth/oauth.router');
const { registerRouter } = require('../v1/register/register.router');
const { verifyEmailRouter } = require('../v1/email/verify.router');
const { forgotRouter } = require('../v1/password/forgot/forgot.router');
const { resetRouter } = require('../v1/password/reset/reset.router');
const { logoutRouter } = require('../v1/logout/logout.router');
const { refreshTokenRouter } = require('../v1/token/refresh.router');
const { otpSendRouter } = require('../v1/otp/send/send.router');
const { otpVerifyRouter } = require('../v1/otp/verify/verify.router');
const { oauthCallback } = require('../../services/oauth.service');
const { deviceRouter } = require('./devices/devices.router');

const router = express.Router();

router.use('/login', loginRouter);
router.use('/login/oauth', oauthRouter);
router.use('/register', registerRouter);
router.use('/verify-email', verifyEmailRouter);
router.use('/forgot-password', forgotRouter);
router.use('/reset-password/:token', resetRouter);

// Handle trusted devices
router.use('/devices', deviceRouter);

// Token handling
router.use('/logout', logoutRouter);
router.use('/refresh-token', refreshTokenRouter);

// OTP
router.use('/otp/send', otpSendRouter);
router.use('/otp/verification', otpVerifyRouter);

// OAuth2

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: true,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: true,
    failureRedirect: process.env.OAUTH_FAILURE_REDIRECT,
  }),
  oauthCallback
);

router.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: ['email'],
    session: true,
  })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    session: true,
    failureRedirect: process.env.OAUTH_FAILURE_REDIRECT,
  }),
  oauthCallback
);

router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: true,
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: true,
    failureRedirect: process.env.OAUTH_FAILURE_REDIRECT,
  }),
  oauthCallback
);

module.exports = router;
