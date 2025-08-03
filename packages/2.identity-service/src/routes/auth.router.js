const express = require('express');
const passport = require('passport');
const { loginRouter } = require('./login/login.router');
const { registerRouter } = require('./register/register.router');
const { verifyEmailRouter } = require('./email/verify.router');
const { forgotRouter } = require('./password/forgot/forgot.router');
const { resetRouter } = require('./password/reset/reset.router');
const { logoutRouter } = require('./logout/logout.router');
const { refreshTokenRouter } = require('./token/refresh.router');
const { otpSendRouter } = require('./otp/send/send.router');
const { otpVerifyRouter } = require('./otp/verify/verify.router');
const { oauthCallback } = require('./oauth/callback.controller');

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
