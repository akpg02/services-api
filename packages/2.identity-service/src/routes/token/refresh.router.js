const express = require('express');
const refreshTokenController = require('./refresh.controller');

const refreshTokenRouter = express.Router();
refreshTokenRouter.route('/').post(refreshTokenController.refreshToken);

module.exports = { refreshTokenRouter };
