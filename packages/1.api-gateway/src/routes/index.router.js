const express = require('express');
const router = express.Router();

const healthRoutes = require('./health/health.router');
const docsRoutes = require('./docs/docs.router');

router.use('/health', healthRoutes);
router.use('/docs', docsRoutes);

module.exports = router;
