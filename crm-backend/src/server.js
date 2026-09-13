/**
 * باشگاه مشتریان پویا — Backend Server
 * 
 * اجرا: npm run dev
 */

// Load env vars FIRST, before any other require
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { bigintMiddleware } = require('./lib/bigint');

const authMiddleware = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const invoiceRoutes = require('./routes/invoices');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const csatRoutes = require('./routes/csat');
const campaignRoutes = require('./routes/campaigns');
const settingsRoutes = require('./routes/settings');
const statsRoutes = require('./routes/stats');
const reportsRoutes = require('./routes/reports');
const loyaltyRoutes = require('./routes/loyalty');
const memberRoutes = require('./routes/member');
const retentionRoutes = require('./routes/retention');
const feedbackRoutes = require('./routes/feedback');
const communicationRoutes = require('./routes/communications');
const integrationRoutes = require('./routes/integration');
const schedulerService = require('./services/schedulerService');
const prisma = require('./lib/prisma'); // ✅ اضافه کن

const app = express();
const PORT = process.env.PORT || 4000;
console.log('🔍 FRONTEND_URL from env:', process.env.FRONTEND_URL);
// ─── Middleware ───
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map((value) => value.trim()).filter(Boolean);
  /*
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('مبدأ درخواست مجاز نیست'));
  },
  credentials: true,
}));
*/
app.use(cors({
  origin: true,
  credentials: true
}))
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '1mb', verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// BigInt serialization middleware
app.use(bigintMiddleware);

// ─── Health ───
app.get('/api/v1/health', (_req, res) => {
  res.json({ 
    success: true, 
    message: 'باشگاه مشتریان مستقل فعال است', 
    version: '3.0.0', 
    modules: ['loyalty', 'retention', 'campaigns', 'member-portal', 'sepidar-rest', 'sepidar-excel'], 
    timestamp: new Date().toISOString() 
  });
});

// ─── Routes ───
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/csat', csatRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/stats', statsRoutes);

// Invoice routes BEFORE reports (reports also mounts on /invoices for import/export)
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/invoices', reportsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/loyalty', loyaltyRoutes);
app.use('/api/v1/member', memberRoutes);
app.use('/api/v1/retention', retentionRoutes);
// سازگاری با آدرس‌های نسخه قدیم دمو
app.use('/api/v1/churn', retentionRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/communications', communicationRoutes);
app.use('/api/v1/integration', integrationRoutes);

app.use('/api/v1', (_req, res) => {
  res.status(404).json({ success: false, message: 'مسیر درخواستی یافت نشد' });
});

// ─── Error Handler ───
app.use((err, _req, res, _next) => {
  console.error('[server] خطا:', err.message);
  res.status(500).json({
    success: false,
    message: 'خطای سرور',
    ...(process.env.NODE_ENV === 'development' && { debug: err.message }),
  });
});

// ─── Start Server ───
async function startServer() {
  try {
    // ✅ اتصال به دیتابیس قبل از شروع
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    app.listen(PORT, () => {
      console.log(`\n  ╔════════════════════════════════════════╗`);
      console.log(`  ║  باشگاه مشتریان پویا           ║`);
      console.log(`  ║  Port: ${PORT}                          ║`);
      console.log(`  ║  Env:  ${process.env.NODE_ENV || 'development'}                       ║`);
      console.log(`  ╚════════════════════════════════════════╝\n`);
      schedulerService.startScheduler();
    });
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }
}

// ✅ برای Vercel: فقط در صورت اجرای مستقیم شروع کن
if (require.main === module) {
  startServer();
}

// ✅ برای Vercel: app رو export کن
module.exports = app;