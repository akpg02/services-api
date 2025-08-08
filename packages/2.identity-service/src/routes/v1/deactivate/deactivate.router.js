const express = require('express');
const deactivateController = require('./deactivate.controller');
const {
  protect,
  restrictTo,
} = require('../../../middlewares/index.middleware');

const deactivateRouter = express.Router();

deactivateRouter.use(protect);
deactivateRouter.route('/deactivate').put(deactivateController.deactivate);

deactivateRouter.use(restrictTo('admin'));
deactivateRouter.route('/:id/deactivate').put(deactivateController.deactivate);

module.exports = deactivateRouter;
