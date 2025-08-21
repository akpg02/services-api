require('dotenv').config();
const deleteInactiveUsers = require('./scripts/delete-inactive-users');
const { connectToDB } = require('./database/db');
const { logger } = require('@gaeservices/common');
const http = require('http');
const app = require('./app');

process.on('uncaughtException', (reason, promise) => {
  console.log('reason: ', reason, 'promise', promise);
  logger.error('Uncaught Exception at', promise, 'reason', reason);
});

const PORT = process.env.PORT || 8001;

async function startServer() {
  try {
    // connect to DB
    connectToDB();

    // start inactivity cleanup task
    deleteInactiveUsers();

    // Start http servcer
    http.createServer(app).listen(PORT, () => {
      logger.info(`Identity service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Identity server connection error', err);
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
