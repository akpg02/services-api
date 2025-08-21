require('dotenv').config();
const { connectToDB } = require('./database/db');
const { logger } = require('@gaeservices/common');
const http = require('http');
const app = require('./app');

process.on('uncaughtException', (reason, promise) => {
  console.log('reason: ', reason, 'promise', promise);
  logger.error('Uncaught Exception at', promise, 'reason', reason);
});

const PORT = process.env.PORT || 8014;

let server = null;

async function startServer() {
  try {
    // connect to DB
    connectToDB();

    // Start http servcer
    server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info(`Audit Log service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Audit Log server connection error', err);
    process.exit(1);
  }
}

startServer();

process.on('unhandledRejection', (reason, promise) => {
  console.log('reason: ', reason, 'promise', promise);
  logger.error('Unhandled Rejection at', promise, 'reason:', reason);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', (reason, promise) => {
  console.log('reason: ', reason, 'promise', promise);
  logger.error('SIGTERM', promise, 'reason:', reason);
  server.close(() => {
    console.log('Server closed. Exiting...');
  });
});
