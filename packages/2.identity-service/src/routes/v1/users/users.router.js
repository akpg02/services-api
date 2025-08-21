const express = require('express');
const usersController = require('./users.controller');

const usersRouter = express.Router();
usersRouter.route('/').post(usersController.all);

module.exports = { usersRouter };
