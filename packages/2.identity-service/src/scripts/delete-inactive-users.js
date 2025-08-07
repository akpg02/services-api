const cron = require('node-cron');
const Auth = require('../models/auth.model');
const User = require('../models/user.model');

const INACTIVITY_LIMIT = 180 * 24 * 60 * 60 * 1000;

const deleteInactiveUsers = async () => {
  console.log('Running Cleanup:  Deleting Inactive Users...');

  const thresholdDate = new Date(Date.now() - INACTIVITY_LIMIT);

  // Find inactive users
  const inactiveUsers = await Auth.fetchInactiveUsers(thresholdDate);

  for (const user of inactiveUsers) {
    console.log(`Deleting inactive user: ${user.username}`);

    // Delete associated User Profile & Orders
    await User.findOneAndDelete({ authId: user._id });
    //await Order.deleteMany({ user: user._id });

    // Delete Auth record
    await Auth.findByIdAndDelete(user._id);
  }
  console.log(`Deleted ${inactiveUsers.length} inactive users`);
};

cron.schedule('0 0 * * *', deleteInactiveUsers, {
  scheduled: true,
  timezone: 'UTC',
});

module.exports = deleteInactiveUsers;
