const express = require('express');
const authRoutes = require('./auth.router');
const userRoutes = require('./users.router');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

module.exports = router;
