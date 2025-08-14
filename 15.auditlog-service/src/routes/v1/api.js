const express = require('express');
const getRouter = require('./get/get.router');
const createRouter = require('./create/create.router');

const router = express.Router();
router.use('/audit-logs', getRouter);
router.use('/audit-logs', createRouter);

module.exports = router;
