const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * GET /api/v1/health
 * Basic liveness - returns 200 if the server is up.
 */
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness - returns 200 if the server and DB are ready to accept traffic.
 */
router.get('/ready', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbReady = dbState === 1; // 1 = connected

  if (!dbReady) {
    return res.status(503).json({
      status: 'error',
      data: {
        ready: false,
        database: dbState === 0 ? 'disconnected' : dbState === 2 ? 'connecting' : 'disconnecting',
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      ready: true,
      database: 'connected',
    },
  });
});

module.exports = router;
