const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const smsService = require('../services/smsService');
const loyaltyService = require('../services/loyaltyService');
const settingsService = require('../services/settingsService');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 20));
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.memberStatus) where.memberStatus = req.query.memberStatus;
    if (req.query.tierId) where.tierId = req.query.tierId;
    if (req.query.customerType) where.customerType = req.query.customerType;
    if (req.query.search?.trim()) {
      const search = req.query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { company: { contains: search, mode: 'insensitive' } },
        { membershipNo: { contains: search } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.customer.findMany({ where, include: { tier: true }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.customer.count({ where }),
    ]);
    return res.json({ success: true, data: { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } } });
  } catch (error) {
    console.error('[customers/list]', error.message);
    return res.status(500).json({ success: false, message: 'خطا در دریافت اعضا' });
  }
});

router.get('/stats/summary', async (_req, res) => {
  const [total, active, atRisk, churned, aggregates] = await Promise.all([
    prisma.customer.count(), prisma.customer.count({ where: { memberStatus: 'ACTIVE' } }),
    prisma.customer.count({ where: { status: 'IN_RISK' } }), prisma.customer.count({ where: { status: 'CHURNED' } }),
    prisma.customer.aggregate({ _sum: { totalPoints: true, walletBalance: true, totalPurchase: true } }),
  ]);
  return res.json({ success: true, data: { total, active, atRisk, churned, ...aggregates._sum } });
});

router.post('/', requireRole('ADMIN', 'LOYALTY_MANAGER'), async (req, res) => {
  const mobile = smsService.normalizePhone(req.body.mobile);
  if (!req.body.fullName?.trim() || !mobile) return res.status(400).json({ success: false, message: 'نام و شماره موبایل معتبر الزامی است' });
  const exists = await prisma.customer.findUnique({ where: { mobile } });
  if (exists) return res.status(409).json({ success: false, message: 'این شماره قبلاً عضو شده است' });
  const customerType = ['CONTRACTOR', 'REPRESENTATIVE', 'END_CUSTOMER'].includes(req.body.customerType) ? req.body.customerType : 'CONTRACTOR';
  const tierAudience = customerType === 'REPRESENTATIVE' ? 'REPRESENTATIVE' : 'CONTRACTOR';
  const baseTier = await prisma.loyaltyTier.findFirst({ where: { isActive: true, audienceType: { in: [tierAudience, 'ALL'] } }, orderBy: { minPoints: 'asc' } });
  const data = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        fullName: String(req.body.fullName).trim().slice(0, 120), mobile, company: req.body.company?.trim() || null,
        city: req.body.city?.trim() || null, province: req.body.province?.trim() || null, tierId: baseTier?.id || null,
        customerType, assignedToId: req.body.assignedToId || null,
        status: 'NEW', memberStatus: 'ACTIVE', marketingConsent: req.body.marketingConsent !== false,
      },
      include: { tier: true },
    });
    const invitation = await tx.referral.findFirst({ where: { referredMobile: mobile, status: 'INVITED' }, orderBy: { createdAt: 'asc' } });
    if (invitation) await tx.referral.update({ where: { id: invitation.id }, data: { referredCustomerId: customer.id, status: 'JOINED' } });
    return customer;
  });
  return res.status(201).json({ success: true, message: 'عضو جدید ایجاد شد', data });
});

router.get('/:id', async (req, res) => {
  const data = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      tier: true,
      invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      pointTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      walletTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      redemptions: { include: { reward: true }, orderBy: { requestedAt: 'desc' }, take: 10 },
      missionProgress: { include: { mission: true }, orderBy: { updatedAt: 'desc' }, take: 10 },
      referralsMade: { orderBy: { createdAt: 'desc' }, take: 10 },
      csatTokens: { where: { status: 'SUBMITTED' }, orderBy: { createdAt: 'desc' }, take: 10 },
      feedbacks: { orderBy: { createdAt: 'desc' }, take: 20 },
      communicationMessages: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!data) return res.status(404).json({ success: false, message: 'عضو یافت نشد' });
  return res.json({ success: true, data });
});

router.patch('/:id', requireRole('ADMIN', 'LOYALTY_MANAGER'), async (req, res) => {
  const allowed = ['fullName', 'company', 'city', 'province', 'birthDate', 'anniversaryDate', 'preferredChannel', 'marketingConsent', 'memberStatus', 'tierId', 'customerType', 'assignedToId'];
  const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (data.birthDate) data.birthDate = new Date(data.birthDate);
  if (data.anniversaryDate) data.anniversaryDate = new Date(data.anniversaryDate);
  const result = await prisma.customer.update({ where: { id: req.params.id }, data, include: { tier: true } });
  return res.json({ success: true, data: result });
});

router.post('/:id/points/adjust', requireRole('ADMIN', 'LOYALTY_MANAGER'), async (req, res) => {
  const points = Number(req.body.points);
  const description = String(req.body.description || '').trim();
  if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 1_000_000 || description.length < 3) {
    return res.status(400).json({ success: false, message: 'مقدار امتیاز و دلیل اصلاح معتبر نیست' });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: req.params.id } });
      if (!customer) throw new Error('عضو یافت نشد');
      const balanceAfter = customer.totalPoints + points;
      if (balanceAfter < 0) throw new Error('مانده امتیاز نمی‌تواند منفی شود');
      if (points < 0) await loyaltyService.consumePointLots(tx, customer.id, -points);
      await tx.customer.update({
        where: { id: customer.id },
        data: { totalPoints: balanceAfter, ...(points > 0 && { lifetimePoints: { increment: points } }) },
      });
      const expiryDays = Number(await settingsService.get('pointExpiryDays', tx)) || 365;
      const expiresAt = points > 0 ? new Date(Date.now() + expiryDays * 86400000) : null;
      return tx.pointTransaction.create({
        data: { customerId: customer.id, type: 'ADJUST', sourceType: 'MANUAL', points, remainingPoints: points > 0 ? points : null, balanceAfter, description, actorUserId: req.user.id, expiresAt },
      });
    });
    return res.json({ success: true, message: 'اصلاح امتیاز ثبت شد', data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
