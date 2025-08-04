const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Load the single combined OpenAPI spec
function loadYaml() {
  const filePath = path.join(__dirname, '../../docs/openapi/bundled.yaml');
  console.log('Loading OpenAPI spec from:', filePath);

  if (fs.existsSync(filePath)) {
    return YAML.load(filePath);
  }
  return null;
}

// Serve Swagger UI at /docs/swagger
router.use('/swagger', swaggerUi.serve, (req, res, next) => {
  const swaggerSpec = loadYaml();
  if (!swaggerSpec) {
    return res.status(500).json({ message: 'OpenAPI spec not found.' });
  }

  return swaggerUi.setup(swaggerSpec)(req, res, next);
});

// Serve ReDoc at /docs/redoc (using pre-bundled HTML)
router.use('/redoc', (req, res) => {
  const filePath = path.join(__dirname, '../../docs/redoc/index.html');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).json({ message: 'ReDoc HTML not found.' });
  }
});

module.exports = router;
