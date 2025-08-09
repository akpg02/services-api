const express = require('express');
const passport = require('passport');
const { loginRouter } = require('../v1/login/login.router');
const { registerRouter } = require('../v1/register/register.router');
const { verifyEmailRouter } = require('../v1/email/verify.router');
const { forgotRouter } = require('../v1/password/forgot/forgot.router');
const { resetRouter } = require('../v1/password/reset/reset.router');
const { logoutRouter } = require('../v1/logout/logout.router');
const { refreshTokenRouter } = require('../v1/token/refresh.router');
const { otpSendRouter } = require('../v1/otp/send/send.router');
const { otpVerifyRouter } = require('../v1/otp/verify/verify.router');
const { oauthCallback } = require('../v1/oauth/callback.controller');

const router = express.Router();

router.use('/login', loginRouter);
router.use('/register', registerRouter);
router.use('/verify-email', verifyEmailRouter);
router.use('/forgot-password', forgotRouter);
router.use('/reset-password/:token', resetRouter);

// Token handling
router.use('/logout', logoutRouter);
router.use('/refresh-token', refreshTokenRouter);

// OTP
router.use('/otp/send', otpSendRouter);
router.use('/otp/verify', otpVerifyRouter);

// OAuth2

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?oauthError=unauthorized',
  }),
  oauthCallback
);

router.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: '/login?oauthError=unauthorized',
  }),
  oauthCallback
);

router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: '/login?oauthError=unauthorized',
  }),
  oauthCallback
);

module.exports = router;
