const express = require('express');
const settingsService = require('../services/settingsService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/settings — تمام تنظیمات (گروه‌بندی شده)
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const data = await settingsService.getAll();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[settings] خطا در getAll:', error);
    return res.status(500).json({ success: false, message: 'خطا در دریافت تنظیمات' });
  }
});

// GET /api/v1/settings/loyalty — قوانین امتیازدهی
router.get('/loyalty', requireAuth, async (req, res) => {
  try {
    const data = await settingsService.getLoyaltyRules();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[settings] خطا در getLoyalty:', error);
    return res.status(500).json({ success: false, message: 'خطا در دریافت قوانین' });
  }
});

// PUT /api/v1/settings/loyalty — بروزرسانی قوانین (ADMIN)
router.put('/loyalty', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const {
      purchaseRialPerPoint, cashBonusPoints, financialBonusPoints,
      walletConversionThreshold, walletRialPerConversion,
      pointExpiryDays, referralRewardPoints,
      projectReferralPoints,
    } = req.body;

    const data = {
      purchaseRialPerPoint,
      cashBonusPoints,
      financialBonusPoints,
      walletConversionThreshold,
      walletRialPerConversion,
      pointExpiryDays,
      referralRewardPoints,
      projectReferralPoints,
    };

    // حذف فیلدهای null/undefined
    Object.keys(data).forEach((k) => data[k] == null && delete data[k]);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'حداقل یک فیلد ارسال کنید' });
    }

    const results = await settingsService.updateGroup('loyalty', data);
    return res.json({
      success: true,
      message: 'تنظیمات ذخیره شد',
      data: results.map((r) => ({ key: r.key, value: r.value })),
    });
  } catch (error) {
    console.error('[settings] خطا در updateLoyalty:', error);
    return res.status(500).json({ success: false, message: 'خطا در ذخیره تنظیمات' });
  }
});

router.put('/retention', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const allowed = ['churnInRiskMultiplier', 'churnConfirmedMultiplier', 'churnInactiveDays', 'reactivationWindowSize'];
  const data = Object.fromEntries(Object.entries(req.body).filter(([key, value]) => allowed.includes(key) && value != null));
  if (Object.keys(data).length === 0) return res.status(400).json({ success: false, message: 'حداقل یک تنظیم حفظ مشتری ارسال کنید' });
  const results = await settingsService.updateGroup('retention', data);
  return res.json({ success: true, message: 'تنظیمات رادار حفظ مشتری ذخیره شد', data: results });
});

module.exports = router;
