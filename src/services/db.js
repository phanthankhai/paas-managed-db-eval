const { PrismaClient } = require('@prisma/client');
const { env } = require('../config/env');

let prisma = null;
let isConnected = false;

if (env.DATABASE_URL) {
  prisma = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
}

/**
 * Kiểm tra kết nối cơ sở dữ liệu (phục vụ Readiness Probe)
 */
async function checkDbHealth() {
  if (!prisma) {
    if (env.DEV_MOCK_DB) {
      return {
        connected: true,
        message: 'Chế độ Local Mock In-Memory DB (Đang bật DEV_MOCK_DB=true)',
        latencyMs: 1,
      };
    }
    return {
      connected: false,
      message: 'Chưa cấu hình DATABASE_URL (hãy cung cấp connection string của PostgreSQL)',
      latencyMs: 0,
    };
  }

  const startTime = Date.now();
  try {
    // Ping DB bằng raw query SELECT 1
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    isConnected = true;
    return {
      connected: true,
      message: 'Kết nối Managed PostgreSQL hoạt động bình thường',
      latencyMs,
    };
  } catch (error) {
    isConnected = false;
    return {
      connected: false,
      message: error.message,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Đóng kết nối database một cách an toàn (Graceful Shutdown - Twelve-Factor Factor IX)
 */
async function disconnectDb() {
  if (prisma) {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed cleanly.');
  }
}

module.exports = {
  prisma,
  checkDbHealth,
  disconnectDb,
};

