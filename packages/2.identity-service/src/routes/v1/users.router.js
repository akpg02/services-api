const express = require('express');
const deactivateRouter = require('./deactivate/deactivate.router');
const { protect, restrictTo } = require('../../middlewares/index.middleware');
const { profileRouter } = require('./profile/profile.router');
const { changePasswordRouter } = require('./password/update/password.router');
const { usernameRouter } = require('./update/username/username.router');
const { changeEmailRouter } = require('./update/email/email.router');

const { usersRouter } = require('./users/users.router');
const { roleRouter } = require('./role/role.router');

const router = express.Router();
router.use(protect);

// user routes
router.use('/me', profileRouter);
router.use('/', deactivateRouter);
router.use('/me/change-password', changePasswordRouter);
router.use('/me/change-username', usernameRouter);
router.use('/me/change-email', changeEmailRouter);

// admin routes
router.use(restrictTo('admin'));
router.use('/all', usersRouter);
router.use('/:id/profile', usersRouter);
router.use('/:id/role', roleRouter);

module.exports = router;
