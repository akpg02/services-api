const express = require('express');
const profileController = require('./profile.controller');

const profileRouter = express.Router();
profileRouter.route('/').get(profileController.profile);

module.exports = { profileRouter };
