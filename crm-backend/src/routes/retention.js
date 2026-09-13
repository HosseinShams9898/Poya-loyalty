const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const retentionService = require('../services/retentionService');

const router = express.Router();
router.use(requireAuth);

// ─── GET /rules — دریافت قوانین ریزش ───
router.get('/rules', async (_req, res) => {
  try {
    const data = await retentionService.getRules();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[retention/rules] خطا:', error);
    return res.status(500).json({ success: false, message: 'خطا در دریافت قوانین' });
  }
});

// ─── GET /report — گزارش ریزش ───
router.get('/report', async (_req, res) => {
  try {
    const data = await retentionService.getReport();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[retention/report] خطا:', error);
    return res.status(500).json({ success: false, message: 'خطا در دریافت گزارش' });
  }
});

// ─── GET /reactivation — پنجره فعال‌سازی مجدد ───
router.get('/reactivation', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 250;
    const data = await retentionService.getReactivationWindow(limit);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[retention/reactivation] خطا:', error);
    return res.status(500).json({ success: false, message: 'خطا در دریافت پنجره فعال‌سازی' });
  }
});

// ─── POST /run — اجرای تحلیل ریزش ───
router.post('/run', requireRole('ADMIN', 'LOYALTY_MANAGER'), async (_req, res) => {
  try {
    const data = await retentionService.runRetentionAnalysis();
    return res.json({ 
      success: true, 
      message: 'تحلیل رفتار خرید و هشدارهای ریزش اجرا شد', 
      data 
    });
  } catch (error) {
    console.error('[retention/run] خطا:', error);
    return res.status(500).json({ success: false, message: 'خطا در اجرای تحلیل ریزش' });
  }
});

// ─── POST /reactivation/campaign — ایجاد کمپین فعال‌سازی مجدد ───
router.post('/reactivation/campaign', requireRole('ADMIN', 'LOYALTY_MANAGER'), async (req, res) => {
  try {
    const window = await retentionService.getReactivationWindow(req.body.limit);
    
    // ✅ اصلاح: channels رو به JSON String تبدیل کن
    const campaign = await prisma.campaign.create({
      data: {
        title: String(req.body.title || 'کمپین فعال‌سازی مجدد ۲۵۰ مشتری').slice(0, 120),
        message: String(req.body.message || 'برای ادامه همکاری، پیشنهاد اختصاصی شما در باشگاه پویا فعال شد.').slice(0, 500),
        audienceType: 'AT_RISK',
        channels: JSON.stringify(['SMS', 'PUSH']),  // ← تبدیل به JSON String
        status: 'DRAFT',
        totalRecipients: window.count || window?.length || 1,
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({ 
      success: true, 
      message: `کمپین بازگشت برای ${window.count || window?.length || 0} مشتری آماده شد`, 
      data: campaign 
    });
  } catch (error) {
    console.error('[retention/campaign] خطا:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'خطا در ایجاد کمپین فعال‌سازی مجدد' 
    });
  }
});

// ─── POST /customers/:id/reactivate — فعال‌سازی مجدد یک مشتری ───
router.post('/customers/:id/reactivate', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({ 
      where: { id: req.params.id } 
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'مشتری یافت نشد' 
      });
    }

    // بررسی دسترسی برای SALES_REP
    if (req.user.role === 'SALES_REP' && customer.assignedToId && customer.assignedToId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'این مشتری به کارشناس دیگری تخصیص دارد' 
      });
    }

    const data = await prisma.customer.update({
      where: { id: customer.id },
      data: { 
        status: 'ACTIVE', 
        reactivatedAt: new Date(), 
        lastActivityAt: new Date() 
      },
    });

    return res.json({ 
      success: true, 
      message: 'مشتری به چرخه پیگیری فعال بازگشت', 
      data 
    });
  } catch (error) {
    console.error('[retention/reactivate] خطا:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'خطا در فعال‌سازی مجدد مشتری' 
    });
  }
});

module.exports = router;