const express = require('express');
const registerController = require('./register.controller');

const registerRouter = express.Router();
registerRouter.route('/').post(registerController.register);

module.exports = { registerRouter };
