const express = require('express');
const otpVerifyController = require('./verify.controller');

const otpVerifyRouter = express.Router();
otpVerifyRouter.route('/').post(otpVerifyController.verifyOTP);

module.exports = { otpVerifyRouter };
