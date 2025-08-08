const express = require('express');
const usernameController = require('./username.controller');
const {
  usernameUpdateLimiter,
} = require('../../../../middlewares/ratelimiter.middleware');

const usernameRouter = express.Router();
usernameRouter
  .route('/')
  .patch(usernameUpdateLimiter, usernameController.username);

module.exports = { usernameRouter };
