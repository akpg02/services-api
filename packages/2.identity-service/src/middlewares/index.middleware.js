const { authenticateRequest } = require('./authenticate.middleware');
const { protect } = require('./protect.middleware');
const { restrictTo } = require('./restrict.middleware');

module.exports = {
  authenticateRequest,
  protect,
  restrictTo,
};
