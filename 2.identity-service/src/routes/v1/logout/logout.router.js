const express = require('express');
const logoutController = require('./logout.controller');

const logoutRouter = express.Router();
logoutRouter.route('/').post(logoutController.logout);

module.exports = { logoutRouter };
