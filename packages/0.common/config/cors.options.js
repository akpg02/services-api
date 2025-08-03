const { allowedOrigins } = require('./allowed.origins');

const corsOptions = {
  origin: (origin, callback) => {
    // `!origin` allows tools (Postman, curl) that send no Origin header
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      // !origin (remove when in production)
      callback(null, true);
    } else {
      callback(new Error(`Howdeee - Not allowed by CORS`));
    }
  },
  credentials: true, // allow browsers to send cookies
  optionsSuccessStatus: 200, // legacy browsers
};

module.exports = { corsOptions };
