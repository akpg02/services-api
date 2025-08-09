const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

const SUPPORTED_VERSIONS = ['v1'];
const LATEST = SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.length - 1];

function ensureVersion(ver) {
  if (!SUPPORTED_VERSIONS.includes(ver)) {
    const err = new Error(`Unsupported doc version: ${ver}`);
    err.status = 404;
    throw err;
  }
}

function bundledPath(ver) {
  // controller is in src/routes/docs/, specs at src/docs/openapi/<ver>/bundled.yaml
  return path.join(__dirname, '../../../docs/openapi', ver, 'bundled.yaml');
}

function loadYaml(ver) {
  ensureVersion(ver);
  const file = bundledPath(ver);
  if (!fs.existsSync(file)) return null;
  return YAML.load(file);
}

// GET /docs/swagger/:ver
exports.swaggerDocVersioned = (req, res, next) => {
  try {
    const ver = req.params.ver || LATEST;
    const spec = loadYaml(ver);
    if (!spec) {
      return res.status(404).json({ message: `OpenAPI ${ver} spec not found` });
    }
    // swaggerUi.setup returns a middleware
    return swaggerUi.setup(spec)(req, res, next);
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || 'Error loading Swagger spec' });
  }
};

// GET /docs/redoc/:ver
exports.redocVersioned = (req, res) => {
  try {
    const ver = req.params.ver || LATEST;
    ensureVersion(ver);

    const file = bundledPath(ver);
    if (!fs.existsSync(file)) {
      return res
        .status(404)
        .json({ message: `OpenAPI ${ver} spec not found.` });
    }

    const nonce = res.locals.nonce;
    const specUrl = `/docs/openapi/${ver}/bundled.yaml`;

    return res.render('redoc', { nonce, specUrl });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || 'Error rendering ReDoc' });
  }
};

exports.redirectRedocLatest = (_req, res) =>
  res.redirect(302, `/docs/redoc/${LATEST}`);

exports.redirectSwaggerLatest = (_req, res) =>
  res.redirect(302, `/docs/swagger/${LATEST}`);
