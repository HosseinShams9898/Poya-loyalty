const express = require('express');
const prisma = require('../lib/prisma');
const memberAuthService = require('../services/memberAuthService');
const loyaltyService = require('../services/loyaltyService');
const smsService = require('../services/smsService');
const { requireMember } = require('../middleware/memberAuth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/auth/request-otp', rateLimit({ windowMs: 10 * 60_000, max: 5, key: (req) => `${req.ip}:${req.body.mobile || ''}`, message: 'درخواست کد بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید' }), async (req, res) => {
  try {
    const data = await memberAuthService.requestOtp(req.body.mobile);
    return res.json({ success: true, message: 'در صورت وجود عضویت فعال، کد ورود ارسال شد', data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/auth/verify-otp', rateLimit({ windowMs: 10 * 60_000, max: 10 }), async (req, res) => {
  try {
    const data = await memberAuthService.verifyOtp(req.body.mobile, req.body.code);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
});

router.use(requireMember);

router.get('/me', async (req, res) => {
  const data = await loyaltyService.memberSummary(req.member.id);
  return res.json({ success: true, data });
});

router.get('/transactions', async (req, res) => {
  const [points, wallet] = await Promise.all([
    prisma.pointTransaction.findMany({ where: { customerId: req.member.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.walletTransaction.findMany({ where: { customerId: req.member.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  return res.json({ success: true, data: { points, wallet } });
});

router.post('/wallet/convert', async (req, res) => {
  try {
    const data = await loyaltyService.convertPointsToWallet(req.member.id, req.body.points);
    return res.json({ success: true, message: 'امتیاز به اعتبار ریالی کیف پول تبدیل شد', data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/rewards', async (req, res) => {
  const member = await prisma.customer.findUnique({ where: { id: req.member.id }, include: { tier: true } });
  const now = new Date();
  const items = await prisma.reward.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: { eligibleTier: true },
    orderBy: [{ isFeatured: 'desc' }, { costPoints: 'asc' }],
  });
  return res.json({
    success: true,
    data: items.map((item) => ({
      ...item,
      canRedeem: member.totalPoints >= item.costPoints && (item.stock == null || item.stock > 0) &&
        (!item.eligibleTier || (member.tier && member.tier.sortOrder >= item.eligibleTier.sortOrder)),
    })),
  });
});

router.post('/rewards/:id/redeem', async (req, res) => {
  try {
    const data = await loyaltyService.redeemReward(req.member.id, req.params.id);
    return res.status(201).json({ success: true, message: 'درخواست پاداش ثبت شد', data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/redemptions', async (req, res) => {
  const data = await prisma.rewardRedemption.findMany({
    where: { customerId: req.member.id },
    include: { reward: true },
    orderBy: { requestedAt: 'desc' },
  });
  return res.json({ success: true, data });
});

router.get('/missions', async (req, res) => {
  const now = new Date();
  const missions = await prisma.mission.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: { participants: { where: { customerId: req.member.id } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: missions });
});

router.post('/missions/:id/claim', async (req, res) => {
  try {
    const data = await loyaltyService.claimMission(req.member.id, req.params.id);
    return res.json({ success: true, message: 'پاداش مأموریت دریافت شد', data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/referrals', async (req, res) => {
  const referrals = await prisma.referral.findMany({ where: { referrerId: req.member.id }, orderBy: { createdAt: 'desc' } });
  const customer = await prisma.customer.findUnique({ where: { id: req.member.id }, select: { referralCode: true } });
  return res.json({ success: true, data: { referralCode: customer.referralCode, referrals } });
});

router.post('/referrals', async (req, res) => {
  const referredMobile = smsService.normalizePhone(req.body.mobile);
  if (!referredMobile || referredMobile === req.member.mobile) {
    return res.status(400).json({ success: false, message: 'شماره معرفی‌شده معتبر نیست' });
  }
  const duplicate = await prisma.referral.findFirst({ where: { referrerId: req.member.id, referredMobile } });
  if (duplicate) return res.status(409).json({ success: false, message: 'این شماره قبلاً معرفی شده است' });
  const data = await prisma.referral.create({ data: { referrerId: req.member.id, referredMobile } });
  return res.status(201).json({ success: true, message: 'دعوت ثبت شد', data });
});

module.exports = router;
