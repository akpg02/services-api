const express = require('express');
const docsController = require('./docs.controller');

const router = express.Router();

// Serve Swagger UI at /docs/swagger
router.use(
  '/swagger',
  require('swagger-ui-express').serve,
  docsController.swaggerDoc
);

// Serve ReDoc at /docs/redoc (using pre-bundled HTML)
router.get('/redoc', docsController.redoc);

module.exports = router;
