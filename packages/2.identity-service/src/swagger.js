// swagger.js
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const YAML = require('yamljs');

module.exports = (app) => {
  const swaggerDocument = YAML.load(path.join(__dirname, 'swagger'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
