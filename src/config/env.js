require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  PLATFORM: process.env.RENDER ? 'Render PaaS' : (process.env.FLY_APP_NAME ? 'Fly.io PaaS' : 'Local / Custom'),
  
  // Flag dung cho thi nghiem Rollback (Factor IX & resilience test)
  // Neu SIMULATE_FAILURE=true, ung dung se danh rot health check hoac crash ngay khi khoi dong
  SIMULATE_FAILURE: process.env.SIMULATE_FAILURE === 'true',
};

// Mask sensitive connection string khi log
const getSafeDbUrl = () => {
  if (!env.DATABASE_URL) return 'None (Not configured)';
  try {
    const url = new URL(env.DATABASE_URL);
    return `${url.protocol}//${url.username}:****@${url.host}${url.pathname}`;
  } catch {
    return 'Invalid-URL-Format';
  }
};

module.exports = {
  env,
  getSafeDbUrl,
};

