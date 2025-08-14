const express = require('express');
const healthController = require('./health.controller');

const router = express.Router();

router.route('/').get(healthController.healthStatus);

module.exports = router;
