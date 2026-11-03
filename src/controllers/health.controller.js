const { env } = require('../config/env');
const { checkDbHealth } = require('../services/db');

// Thống kê uptime
const startTime = Date.now();

/**
 * Liveness Probe: /healthz
 * Kiểm tra xem tiến trình Node.js có còn sống không
 */
async function getLiveness(req, res) {
  // Nếu bật cờ giả lập lỗi (phục vụ thí nghiệm Rollback)
  if (env.SIMULATE_FAILURE) {
    return res.status(500).json({
      status: 'DOWN',
      message: 'SIMULATION: Ứng dụng gặp sự cố nghiêm trọng (Simulated Failure for Rollback Test)',
      version: env.APP_VERSION,
      timestamp: new Date().toISOString(),
    });
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  return res.status(200).json({
    status: 'UP',
    version: env.APP_VERSION,
    platform: env.PLATFORM,
    uptimeSeconds,
    memory: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Readiness Probe: /readyz
 * Kiểm tra xem ứng dụng đã sẵn sàng nhận traffic từ Load Balancer / Platform Routing chưa
 * (Yêu cầu Managed Database phải kết nối thành công)
 */
async function getReadiness(req, res) {
  if (env.SIMULATE_FAILURE) {
    return res.status(503).json({
      status: 'NOT_READY',
      reason: 'SIMULATE_FAILURE flag is active',
      timestamp: new Date().toISOString(),
    });
  }

  const dbHealth = await checkDbHealth();

  if (!dbHealth.connected) {
    return res.status(503).json({
      status: 'NOT_READY',
      database: dbHealth,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    status: 'READY',
    version: env.APP_VERSION,
    platform: env.PLATFORM,
    database: dbHealth,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getLiveness,
  getReadiness,
};
