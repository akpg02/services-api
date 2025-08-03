const swaggerUi = require('swagger-ui-express');
const express = require('express');
const docsController = require('./docs.controller');

const router = express.Router();

// Serve Swagger UI at /docs/swagger
router.use('/swagger', swaggerUi.serve, docsController.swaggerDoc);

// Serve ReDoc at /docs/redoc (using pre-bundled HTML)
router.use('/redoc', docsController.redoc);

module.exports = router;
