const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const healthRoutes = require('./routes/health.routes');
const itemRoutes = require('./routes/item.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Twelve-Factor Factor XI: Logs as event streams to stdout
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'
  )
);

// Serve static dashboard UI
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/', healthRoutes); // /healthz va /readyz
app.use('/api/items', itemRoutes);

// Root path fallback nếu không dùng static
app.get('/api/info', (req, res) => {
  res.json({
    app: 'PaaS Managed Database Evaluation API',
    description: 'Đề tài 8: Phát triển ứng dụng PaaS có cơ sở dữ liệu được quản lý và đánh giá gánh nặng vận hành',
    endpoints: {
      liveness: '/healthz',
      readiness: '/readyz',
      items: '/api/items',
    },
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint không tồn tại' });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

module.exports = app;

