const express = require('express');
const swaggerUi = require('swagger-ui-express');
const docsController = require('./docs.controller');

const router = express.Router();

// Serve Swagger UI at /docs/swagger
router.use('/swagger', swaggerUi.serve);

router.get('/swagger/:ver', docsController.swaggerDocVersioned);
router.get('/swagger', docsController.redirectSwaggerLatest);

// Serve ReDoc at /docs/redoc (using pre-bundled HTML)
router.get('/redoc/:ver', docsController.redocVersioned);
router.get('/redoc', docsController.redirectRedocLatest);

module.exports = router;
