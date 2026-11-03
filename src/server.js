const app = require('./app');
const { env, getSafeDbUrl } = require('./config/env');
const { disconnectDb } = require('./services/db');

const server = app.listen(env.PORT, () => {
  console.log('========================================================');
  console.log(`🚀 Server đang chạy tại: http://localhost:${env.PORT}`);
  console.log(`📦 Môi trường (NODE_ENV): ${env.NODE_ENV}`);
  console.log(`🌐 Nền tảng (Platform) : ${env.PLATFORM}`);
  console.log(`🏷️  Phiên bản (Version)  : ${env.APP_VERSION}`);
  console.log(`🗄️  Database URL       : ${getSafeDbUrl()}`);
  console.log(`🩺 Health check        : http://localhost:${env.PORT}/healthz`);
  console.log(`🩺 Readiness check     : http://localhost:${env.PORT}/readyz`);
  console.log(`📋 API Items           : http://localhost:${env.PORT}/api/items`);
  console.log('========================================================');
});

// ============================================================================
// Twelve-Factor App - Factor IX: Disposability (Graceful Shutdown)
// Đảm bảo tiến trình phản hồi nhanh với tín hiệu tắt (SIGTERM/SIGINT) từ PaaS
// ============================================================================
function gracefulShutdown(signal) {
  console.log(`\n🛑 Nhận tín hiệu ${signal}. Bắt đầu quá trình Graceful Shutdown...`);

  server.close(async () => {
    console.log('🔒 HTTP Server đã dừng nhận request mới.');
    try {
      await disconnectDb();
      console.log('✅ Đã giải phóng toàn bộ tài nguyên. Thoát tiến trình an toàn.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Lỗi trong quá trình shutdown:', err);
      process.exit(1);
    }
  });

  // Buộc tắt sau 10 giây nếu các kết nối bị treo
  setTimeout(() => {
    console.error('⚠️ Quá thời gian chờ shutdown (10s), buộc dừng tiến trình!');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

