const express = require('express');
const changeEmailController = require('./email.controller');
const {
  emailUpdateLimiter,
} = require('../../../../middlewares/ratelimiter.middleware');

const changeEmailRouter = express.Router();
changeEmailRouter
  .route('/')
  .patch(emailUpdateLimiter, changeEmailController.email);

module.exports = { changeEmailRouter };
