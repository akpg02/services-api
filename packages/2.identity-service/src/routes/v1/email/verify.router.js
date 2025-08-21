const express = require('express');
const verifyEmailController = require('./verify.controller');

const verifyEmailRouter = express.Router();
verifyEmailRouter.route('/').post(verifyEmailController.verifyEmail);

module.exports = { verifyEmailRouter };
