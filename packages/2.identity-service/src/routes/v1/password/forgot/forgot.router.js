const express = require('express');
const forgotController = require('./forgot.controller');
const {
  forgotPasswordLimiter,
} = require('../../../../middlewares/ratelimiter.middleware');

const forgotRouter = express.Router();
forgotRouter
  .route('/')
  .post(forgotPasswordLimiter, forgotController.forgotPassword);

module.exports = { forgotRouter };
