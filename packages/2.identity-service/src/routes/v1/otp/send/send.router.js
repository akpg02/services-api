const express = require('express');
const otpSendController = require('./send.controller');

const otpSendRouter = express.Router();
otpSendRouter.route('/').post(otpSendController.sendOTP);

module.exports = { otpSendRouter };
