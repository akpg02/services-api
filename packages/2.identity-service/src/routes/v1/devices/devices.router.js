const express = require('express');
const deviceController = require('./devices.controller');

const deviceRouter = express.Router();

deviceRouter
  .route('/')
  .get(deviceController.listDevices)
  .delete(deviceController.revokeAll);

deviceRouter.route('/:deviceId').delete(deviceController.revokeDevice);

module.exports = { deviceRouter };
