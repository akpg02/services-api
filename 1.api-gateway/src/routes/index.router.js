const express = require('express');
const router = express.Router();

const healthRoutes = require('./health/health.router');
const docsRoutes = require('./docs/v1/docs.router');

router.use('/health', healthRoutes);

// Version is handled inside the docs router: /docs/redoc/:ver, /docs/swagger/:ver
router.use('/docs', docsRoutes);

module.exports = router;
