const { allowedOrigins } = require('../config/allowed.origins');

const credentials = (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    // allow this origin to send cookies/auth headers
    res.header('Access-Control-Allow-Credentials', 'true');
    // explicitly allow only that origin
    res.header('Access-Control-Allow-Origin', origin);
  }
  next();
};

module.exports = { credentials };
