exports.healthStatus = async (req, res) => {
  try {
    res.status(200).json({
      status: 'OK',
      uptime: process.uptime(),
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
      pid: process.pid,
      service: process.env.SERVICE_NAME || 'unknown',
    });
  } catch (error) {
    res.status(503).json({
      satus: 'FAIL',
      error: error.message || 'Health check failed',
    });
  }
};
