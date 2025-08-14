const express = require('express');
const oauthController = require('./oauth.controller');

const oauthRouter = express.Router();
loginRouter.route('/').post(oauthController.oauthLogin);

module.exports = { oauthRouter };
