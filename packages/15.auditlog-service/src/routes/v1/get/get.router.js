const express = require('express');
const { getLogs, getLog } = require('./get.controller');
const { authenticateRequest, restrictTo } = require('@gaeservices/common');

const router = express.Router();
router.use(authenticateRequest, restrictTo('admin'));
router.get('/', getLogs);
router.get('/:id', getLog);

module.exports = router;
