const express = require('express');
const roleController = require('./role.controller');

const roleRouter = express.Router();
roleRouter.route('/').patch(roleController.role);

module.exports = { roleRouter };
