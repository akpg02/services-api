const allowedOrigins = [
  process.env.CLIENT_URL, // the frontend domain that will access the api
  `http://127.0.0.1:5500`, // !live server (remove when in production)
  `http://localhost:8000`, //  !(remove when in production)
  `http://localhost:8001`,
];

module.exports = { allowedOrigins };
