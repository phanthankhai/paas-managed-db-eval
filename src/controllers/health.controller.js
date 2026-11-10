const { env } = require('../config/env');
const { checkDbHealth } = require('../services/db');

// Thống kê uptime
const startTime = Date.now();

// Biến trạng thái runtime phục vụ mô phỏng trực tiếp từ Dashboard / Test API
let runtimeSimulateFailure = false;

function isFailureSimulated() {
  return runtimeSimulateFailure || env.SIMULATE_FAILURE;
}

/**
 * Liveness Probe: /healthz
 * Kiểm tra xem tiến trình Node.js có còn sống không
 */
async function getLiveness(req, res) {
  // Nếu bật cờ giả lập lỗi (phục vụ thí nghiệm Rollback)
  if (isFailureSimulated()) {
    return res.status(500).json({
      status: 'DOWN',
      message: 'SIMULATION: Ứng dụng gặp sự cố nghiêm trọng (Simulated Failure for Rollback Test)',
      version: env.APP_VERSION,
      simulated: true,
      timestamp: new Date().toISOString(),
    });
  }

  const uptimeSeconds = Math.floor(process.uptime ? process.uptime() : (Date.now() - startTime) / 1000);
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
  if (isFailureSimulated()) {
    return res.status(503).json({
      status: 'NOT_READY',
      reason: 'SIMULATE_FAILURE is active (Simulated DB Outage for Rollback & Resilience Test)',
      simulated: true,
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

/**
 * POST /api/simulate-failure - Kích hoạt / Bật tắt giả lập lỗi tức thì phục vụ demo UI & Test
 */
async function toggleSimulateFailure(req, res) {
  const { enable } = req.body || {};
  if (typeof enable === 'boolean') {
    runtimeSimulateFailure = enable;
  } else {
    runtimeSimulateFailure = !runtimeSimulateFailure;
  }

  return res.json({
    success: true,
    simulateFailure: isFailureSimulated(),
    message: isFailureSimulated()
      ? 'Đã KÍCH HOẠT giả lập sự cố. /healthz trả về 500, /readyz trả về 503 để Router PaaS chặn traffic.'
      : 'Đã TẮT giả lập sự cố. Hệ thống trở về trạng thái hoạt động bình thường.',
  });
}

/**
 * GET /api/simulate-failure - Lấy trạng thái giả lập hiện tại
 */
async function getSimulateFailureStatus(req, res) {
  return res.json({
    success: true,
    simulateFailure: isFailureSimulated(),
    envFlag: env.SIMULATE_FAILURE,
    runtimeFlag: runtimeSimulateFailure,
  });
}

module.exports = {
  getLiveness,
  getReadiness,
  toggleSimulateFailure,
  getSimulateFailureStatus,
};

