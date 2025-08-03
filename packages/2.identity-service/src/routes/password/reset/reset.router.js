const express = require('express');
const resetController = require('./reset.controller');

const resetRouter = express.Router();
resetRouter.route('/').post(resetController.resetPassword);

module.exports = { resetRouter };
