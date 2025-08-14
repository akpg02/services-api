const express = require('express');
const { createLog } = require('./create.controller');
const { authenticateRequest, restrictTo } = require('@gaeservices/common');

const router = express.Router();
router.use(authenticateRequest, restrictTo('admin'));
router.post('/', createLog);

module.exports = router;
