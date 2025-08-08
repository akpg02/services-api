const express = require('express');
const healthController = require('./health.controller');

const healthRouter = express.Router();
healthRouter.route('/health').get(healthController.healthStatus);

module.exports = healthRouter;
