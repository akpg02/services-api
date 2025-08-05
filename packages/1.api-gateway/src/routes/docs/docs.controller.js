const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

//
// Compute the absolute path to your bundled spec once:
//
const docsDir = path.join(__dirname, '..', '..', 'docs', 'openapi');
const bundledSpecPath = path.join(docsDir, 'bundled.yaml');

function loadYaml() {
  console.log('Loading OpenAPI spec from:', bundledSpecPath);
  return fs.existsSync(bundledSpecPath) ? YAML.load(bundledSpecPath) : null;
}

exports.swaggerDoc = (req, res, next) => {
  const swaggerSpec = loadYaml();
  if (!swaggerSpec) {
    return res.status(500).json({ message: 'OpenAPI spec not found.' });
  }
  // swaggerUi.setup returns a middleware function:
  return swaggerUi.setup(swaggerSpec)(req, res, next);
};

exports.redoc = (req, res) => {
  // just re-use the same bundledSpecPath for existence checking
  if (!fs.existsSync(bundledSpecPath)) {
    return res.status(500).json({ message: 'OpenAPI spec not found.' });
  }

  // This is the URL your static middleware will serve:
  const specUrl = '/docs/openapi/bundled.yaml';

  // The nonce you generated in your CSP middleware:
  const nonce = res.locals.nonce;

  return res.render('redoc', { specUrl, nonce });
};
