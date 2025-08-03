exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles is an array of strings
    const exists = roles.some((role) => req.user.role.includes(role));
    if (!exists) {
      return res.status(401).json({
        success: false,
        message: 'Not Authorized',
      });
    }
    next();
  };
