const express = require('express');
const loginController = require('./login.controller');

const loginRouter = express.Router();
loginRouter.route('/').post(loginController.login);

module.exports = { loginRouter };
