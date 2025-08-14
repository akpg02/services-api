const express = require('express');
const changePasswordController = require('./password.controller');

const changePasswordRouter = express.Router();
changePasswordRouter.route('/').post(changePasswordController.password);

module.exports = { changePasswordRouter };
