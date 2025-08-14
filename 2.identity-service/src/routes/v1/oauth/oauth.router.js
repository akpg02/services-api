const express = require('express');
const oauthController = require('./oauth.controller');

const oauthRouter = express.Router();
oauthRouter.route('/').post(oauthController.oauthLogin);

module.exports = { oauthRouter };
