/**
 * تنظیمات PM2 — اجرای دائمی بک‌اند
 * 
 * استفاده:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'pouya-loyalty-backend',
      script: 'src/server.js',
      cwd: '/opt/pouya-loyalty/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      error_file: '/var/log/pouya-loyalty/error.log',
      out_file: '/var/log/pouya-loyalty/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
