const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const loyaltyService = require('../services/loyaltyService');
const notificationService = require('../services/notificationService');

const router = express.Router();
router.use(requireAuth);

const managerOnly = requireRole('ADMIN', 'LOYALTY_MANAGER');

// ════════════════════════════════════════════
// POST /maintenance/expire-points
// ════════════════════════════════════════════
router.post('/maintenance/expire-points', managerOnly, async (_req, res) => {
  const data = await loyaltyService.expireDuePoints();
  return res.json({ success: true, message: 'پردازش انقضای امتیازها انجام شد', data });
});

function cleanText(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

function segmentWhere(criteria = {}) {
  const where = {};
  if (criteria.status) where.status = criteria.status;
  if (criteria.memberStatus) where.memberStatus = criteria.memberStatus;
  if (criteria.minLifetimePoints != null) where.lifetimePoints = { ...(where.lifetimePoints || {}), gte: Number(criteria.minLifetimePoints) };
  if (criteria.maxLifetimePoints != null) where.lifetimePoints = { ...(where.lifetimePoints || {}), lte: Number(criteria.maxLifetimePoints) };
  if (criteria.minTotalPurchase != null) where.totalPurchase = { ...(where.totalPurchase || {}), gte: BigInt(criteria.minTotalPurchase) };
  if (criteria.maxDaysSinceLast != null) where.daysSinceLast = { ...(where.daysSinceLast || {}), lte: Number(criteria.maxDaysSinceLast) };
  if (criteria.minDaysSinceLast != null) where.daysSinceLast = { ...(where.daysSinceLast || {}), gte: Number(criteria.minDaysSinceLast) };
  if (criteria.maxInvoicesCount != null) where.invoicesCount = { ...(where.invoicesCount || {}), lte: Number(criteria.maxInvoicesCount) };
  if (criteria.minInvoicesCount != null) where.invoicesCount = { ...(where.invoicesCount || {}), gte: Number(criteria.minInvoicesCount) };
  return where;
}

// ════════════════════════════════════════════
// GET /dashboard
// ════════════════════════════════════════════
router.get('/dashboard', async (_req, res) => {
  try {
    const [
      memberCount,
      activeMembers,
      memberAggregates,
      redemptionCount,
      fulfilledCount,
      tierRows,
      tiers,
      recentRedemptions,
      transactionCount,
      transactions,  // ← به جای monthlyData - دیتای خام تراکنش‌ها
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { memberStatus: 'ACTIVE', status: { not: 'CHURNED' } } }),
      prisma.customer.aggregate({ _sum: { totalPoints: true, lifetimePoints: true, walletBalance: true, totalPurchase: true } }),
      prisma.rewardRedemption.count(),
      prisma.rewardRedemption.count({ where: { status: 'FULFILLED' } }),
      prisma.customer.groupBy({ by: ['tierId'], _count: true }),
      prisma.loyaltyTier.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.rewardRedemption.findMany({ include: { customer: true, reward: true }, orderBy: { requestedAt: 'desc' }, take: 6 }),
      prisma.pointTransaction.count(),
      // ✅ دیتای خام تراکنش‌ها برای ۶ ماه اخیر
      prisma.pointTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          },
        },
        select: {
          createdAt: true,
          type: true,
          points: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    const tierDistribution = tiers.map((tier) => ({
      ...tier,
      members: tierRows.find((row) => row.tierId === tier.id)?._count || 0,
    }));

    return res.json({
      success: true,
      data: {
        kpis: {
          memberCount,
          activeMembers,
          activeRate: memberCount ? Math.round((activeMembers / memberCount) * 100) : 0,
          spendablePoints: memberAggregates._sum.totalPoints || 0,
          lifetimePoints: memberAggregates._sum.lifetimePoints || 0,
          walletLiability: memberAggregates._sum.walletBalance || 0n,
          totalPurchase: memberAggregates._sum.totalPurchase || 0n,
          redemptionCount,
          redemptionFulfillmentRate: redemptionCount ? Math.round((fulfilledCount / redemptionCount) * 100) : 0,
          transactionCount,
        },
        tierDistribution,
        recentRedemptions,
        transactions,  // ← ارسال دیتای خام به فرانت‌اند
      },
    });
  } catch (error) {
    console.error('[loyalty/dashboard]', error.message);
    return res.status(500).json({ success: false, message: 'خطا در دریافت داشبورد باشگاه' });
  }
});
// ════════════════════════════════════════════
// GET /tiers
// ════════════════════════════════════════════
router.get('/tiers', async (_req, res) => {
  const data = await prisma.loyaltyTier.findMany({ include: { _count: { select: { customers: true } } }, orderBy: { sortOrder: 'asc' } });
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// POST /tiers
// ════════════════════════════════════════════
router.post('/tiers', managerOnly, async (req, res) => {
  const { code, title, description, color, minPoints, multiplier, benefits, sortOrder, audienceType = 'CONTRACTOR' } = req.body;
  if (!cleanText(code, 32) || !cleanText(title, 80)) return res.status(400).json({ success: false, message: 'کد و عنوان سطح الزامی است' });
  const data = await prisma.loyaltyTier.create({
    data: {
      code: cleanText(code, 32).toUpperCase(),
      title: cleanText(title, 80),
      description: cleanText(description, 500) || null,
      audienceType: ['CONTRACTOR', 'REPRESENTATIVE', 'ALL'].includes(audienceType) ? audienceType : 'CONTRACTOR',
      color: cleanText(color, 16) || '#64748B',
      minPoints: Math.max(0, Number(minPoints) || 0),
      multiplier: Math.max(1, Number(multiplier) || 1),
      benefits: Array.isArray(benefits) ? benefits : [],
      sortOrder: Number(sortOrder) || 0,
    },
  });
  return res.status(201).json({ success: true, data });
});

// ════════════════════════════════════════════
// PATCH /tiers/:id
// ════════════════════════════════════════════
router.patch('/tiers/:id', managerOnly, async (req, res) => {
  const allowed = ['title', 'description', 'color', 'minPoints', 'multiplier', 'benefits', 'sortOrder', 'isActive', 'audienceType'];
  const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const result = await prisma.loyaltyTier.update({ where: { id: req.params.id }, data });
  return res.json({ success: true, data: result });
});

// ════════════════════════════════════════════
// GET /rules
// ════════════════════════════════════════════
router.get('/rules', async (_req, res) => {
  const data = await prisma.loyaltyRule.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] });
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// POST /rules
// ════════════════════════════════════════════
router.post('/rules', managerOnly, async (req, res) => {
  const { code, title, description, eventType, conditions = {}, action = {}, priority = 100, stackable = true, startsAt, endsAt } = req.body;
  if (!code || !title || !eventType || !action.type) return res.status(400).json({ success: false, message: 'اطلاعات قانون کامل نیست' });
  const data = await prisma.loyaltyRule.create({
    data: {
      code: cleanText(code, 48).toUpperCase(),
      title: cleanText(title, 120),
      description: cleanText(description, 500) || null,
      eventType: cleanText(eventType, 48),
      conditions: JSON.stringify(conditions),
      action: JSON.stringify(action),
      priority: Number(priority) || 100,
      stackable: Boolean(stackable),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
  return res.status(201).json({ success: true, data });
});

// ════════════════════════════════════════════
// PATCH /rules/:id
// ════════════════════════════════════════════
router.patch('/rules/:id', managerOnly, async (req, res) => {
  const allowed = ['title', 'description', 'eventType', 'conditions', 'action', 'priority', 'stackable', 'isActive', 'startsAt', 'endsAt'];
  const rawData = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const data = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (key === 'conditions' || key === 'action') {
      data[key] = typeof value === 'string' ? value : JSON.stringify(value);
    } else {
      data[key] = value;
    }
  }
  const result = await prisma.loyaltyRule.update({ where: { id: req.params.id }, data });
  return res.json({ success: true, data: result });
});

// ════════════════════════════════════════════
// DELETE /rules/:id
// ════════════════════════════════════════════
router.delete('/rules/:id', managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.loyaltyRule.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'قانون یافت نشد' });
    }
    await prisma.loyaltyRule.delete({ where: { id } });
    return res.json({ success: true, message: 'قانون با موفقیت حذف شد' });
  } catch (error) {
    console.error('[loyalty/rules/delete] خطا:', error);
    return res.status(500).json({ success: false, message: error.message || 'خطا در حذف قانون' });
  }
});

// ════════════════════════════════════════════
// GET /rewards
// ════════════════════════════════════════════
router.get('/rewards', async (req, res) => {
  const where = req.query.active === 'true' ? { isActive: true } : {};
  const data = await prisma.reward.findMany({ where, include: { eligibleTier: true, _count: { select: { redemptions: true } } }, orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }] });
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// POST /rewards
// ════════════════════════════════════════════
router.post('/rewards', managerOnly, async (req, res) => {
  const { code, title, description, type, costPoints, cashValue, stock, imageIcon, eligibleTierId, validityDays, fulfillmentMode, isFeatured } = req.body;
  if (!code || !title || !type || Number(costPoints) < 0) return res.status(400).json({ success: false, message: 'اطلاعات پاداش کامل نیست' });
  const data = await prisma.reward.create({
    data: {
      code: cleanText(code, 48).toUpperCase(),
      title: cleanText(title, 120),
      description: cleanText(description, 700) || null,
      type: cleanText(type, 32),
      costPoints: Number(costPoints),
      cashValue: cashValue == null ? null : BigInt(cashValue),
      stock: stock == null || stock === '' ? null : Number(stock),
      imageIcon: cleanText(imageIcon, 32) || 'gift',
      eligibleTierId: eligibleTierId || null,
      validityDays: Math.max(1, Number(validityDays) || 30),
      fulfillmentMode: cleanText(fulfillmentMode, 24) || 'MANUAL',
      isFeatured: Boolean(isFeatured),
    },
  });
  return res.status(201).json({ success: true, data });
});

// ════════════════════════════════════════════
// PATCH /rewards/:id
// ════════════════════════════════════════════
router.patch('/rewards/:id', managerOnly, async (req, res) => {
  const allowed = ['title', 'description', 'type', 'costPoints', 'cashValue', 'stock', 'imageIcon', 'eligibleTierId', 'validityDays', 'fulfillmentMode', 'isFeatured', 'isActive', 'startsAt', 'endsAt'];
  const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (data.cashValue != null) data.cashValue = BigInt(data.cashValue);
  const result = await prisma.reward.update({ where: { id: req.params.id }, data });
  return res.json({ success: true, data: result });
});

// ════════════════════════════════════════════
// DELETE /rewards/:id
// ════════════════════════════════════════════
router.delete('/rewards/:id', managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.reward.findUnique({
      where: { id },
      include: { redemptions: { where: { status: { not: 'CANCELLED' } } } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'پاداش یافت نشد' });
    }
    if (existing.redemptions.length > 0) {
      return res.status(400).json({ success: false, message: 'این پاداش دارای درخواست‌های فعال است و قابل حذف نیست' });
    }
    await prisma.reward.delete({ where: { id } });
    return res.json({ success: true, message: 'پاداش با موفقیت حذف شد' });
  } catch (error) {
    console.error('[loyalty/rewards/delete] خطا:', error);
    return res.status(500).json({ success: false, message: error.message || 'خطا در حذف پاداش' });
  }
});

// ════════════════════════════════════════════
// GET /redemptions
// ════════════════════════════════════════════
router.get('/redemptions', async (req, res) => {
  const where = req.query.status ? { status: req.query.status } : {};
  const data = await prisma.rewardRedemption.findMany({
    where,
    include: { customer: { include: { tier: true } }, reward: true },
    orderBy: { requestedAt: 'desc' },
    take: 200,
  });
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// PATCH /redemptions/:id/status
// ════════════════════════════════════════════
router.patch('/redemptions/:id/status', managerOnly, async (req, res) => {
  const nextStatus = req.body.status;
  const allowed = ['APPROVED', 'FULFILLED', 'CANCELLED'];
  if (!allowed.includes(nextStatus)) return res.status(400).json({ success: false, message: 'وضعیت نامعتبر است' });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.rewardRedemption.findUnique({ where: { id: req.params.id }, include: { customer: true, reward: true } });
      if (!item) throw new Error('درخواست یافت نشد');
      const transitions = { REQUESTED: ['APPROVED', 'CANCELLED'], APPROVED: ['FULFILLED', 'CANCELLED'], FULFILLED: [], CANCELLED: [] };
      if (!transitions[item.status]?.includes(nextStatus)) throw new Error('تغییر وضعیت مجاز نیست');
      const now = new Date();
      if (nextStatus === 'CANCELLED') {
        const balanceAfter = item.customer.totalPoints + item.pointsCost;
        await tx.customer.update({ where: { id: item.customerId }, data: { totalPoints: balanceAfter, redeemedPoints: { decrement: item.pointsCost } } });
        await tx.pointTransaction.create({
          data: { customerId: item.customerId, type: 'REFUND', sourceType: 'REWARD', sourceId: item.id, points: item.pointsCost, remainingPoints: item.pointsCost, balanceAfter, description: `برگشت امتیاز پاداش «${item.reward.title}»` },
        });
        await tx.reward.update({ where: { id: item.rewardId }, data: { redeemedCount: { decrement: 1 }, ...(item.reward.stock != null && { stock: { increment: 1 } }) } });
      }
      if (nextStatus === 'FULFILLED' && item.reward.fulfillmentMode === 'WALLET' && item.cashValue && item.cashValue > 0n) {
        const walletAfter = item.customer.walletBalance + item.cashValue;
        await tx.customer.update({ where: { id: item.customerId }, data: { walletBalance: walletAfter } });
        await tx.walletTransaction.create({
          data: { customerId: item.customerId, type: 'CREDIT', sourceType: 'REWARD', sourceId: item.id, amount: item.cashValue, balanceAfter: walletAfter, description: `اعتبار پاداش «${item.reward.title}»` },
        });
      }
      return tx.rewardRedemption.update({
        where: { id: item.id },
        data: {
          status: nextStatus,
          fulfillmentNote: cleanText(req.body.note, 500) || item.fulfillmentNote,
          ...(nextStatus === 'APPROVED' && { approvedAt: now }),
          ...(nextStatus === 'FULFILLED' && { fulfilledAt: now }),
          ...(nextStatus === 'CANCELLED' && { cancelledAt: now }),
        },
        include: { customer: true, reward: true },
      });
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ════════════════════════════════════════════
// GET /missions
// ════════════════════════════════════════════
router.get('/missions', async (_req, res) => {
  const data = await prisma.mission.findMany({ include: { _count: { select: { participants: true } } }, orderBy: { createdAt: 'desc' } });
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// POST /missions
// ════════════════════════════════════════════
router.post('/missions', managerOnly, async (req, res) => {
  const { code, title, description, actionType, targetValue, rewardPoints, badge, startsAt, endsAt } = req.body;
  if (!code || !title || !description || !actionType || Number(targetValue) < 1) return res.status(400).json({ success: false, message: 'اطلاعات مأموریت کامل نیست' });
  const data = await prisma.mission.create({
    data: {
      code: cleanText(code, 48).toUpperCase(),
      title: cleanText(title, 120),
      description: cleanText(description, 700),
      actionType,
      targetValue: Number(targetValue),
      rewardPoints: Math.max(0, Number(rewardPoints) || 0),
      badge: cleanText(badge, 32) || null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
  return res.status(201).json({ success: true, data });
});

// ════════════════════════════════════════════
// PATCH /missions/:id
// ════════════════════════════════════════════
router.patch('/missions/:id', managerOnly, async (req, res) => {
  const allowed = ['title', 'description', 'actionType', 'targetValue', 'rewardPoints', 'badge', 'isActive', 'startsAt', 'endsAt'];
  const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const result = await prisma.mission.update({ where: { id: req.params.id }, data });
  return res.json({ success: true, data: result });
});

// ════════════════════════════════════════════
// DELETE /missions/:id
// ════════════════════════════════════════════
router.delete('/missions/:id', managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.mission.findUnique({
      where: { id },
      include: { participants: { take: 1 } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'مأموریت یافت نشد' });
    }
    if (existing.participants.length > 0) {
      return res.status(400).json({ success: false, message: 'این مأموریت دارای مشارکت فعال است و قابل حذف نیست' });
    }
    await prisma.mission.delete({ where: { id } });
    return res.json({ success: true, message: 'مأموریت با موفقیت حذف شد' });
  } catch (error) {
    console.error('[loyalty/missions/delete] خطا:', error);
    return res.status(500).json({ success: false, message: error.message || 'خطا در حذف مأموریت' });
  }
});

// ════════════════════════════════════════════
// GET /segments
// ════════════════════════════════════════════
router.get('/segments', async (_req, res) => {
  const segments = await prisma.loyaltySegment.findMany({ orderBy: { createdAt: 'asc' } });
  const data = await Promise.all(segments.map(async (segment) => ({
    ...segment,
    memberCount: await prisma.customer.count({ where: segmentWhere(segment.criteria) }),
  })));
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// POST /segments
// ════════════════════════════════════════════
router.post('/segments', managerOnly, async (req, res) => {
  const { code, title, description, color, criteria = {}, isDynamic = true } = req.body;
  if (!code || !title) return res.status(400).json({ success: false, message: 'کد و عنوان بخش الزامی است' });
  const criteriaJson = typeof criteria === 'string' ? criteria : JSON.stringify(criteria);
  const data = await prisma.loyaltySegment.create({
    data: {
      code: cleanText(code, 48).toUpperCase(),
      title: cleanText(title, 120),
      description: cleanText(description, 500) || null,
      color: cleanText(color, 16) || '#0EA5E9',
      criteria: criteriaJson,
      isDynamic: Boolean(isDynamic),
    },
  });
  return res.status(201).json({ success: true, data });
});

// ════════════════════════════════════════════
// PATCH /segments/:id
// ════════════════════════════════════════════
router.patch('/segments/:id', managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['title', 'description', 'color', 'criteria', 'isDynamic', 'isActive'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'criteria') {
          data[key] = typeof req.body[key] === 'string' ? req.body[key] : JSON.stringify(req.body[key]);
        } else {
          data[key] = req.body[key];
        }
      }
    }
    const existing = await prisma.loyaltySegment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'بخش یافت نشد' });
    }
    const result = await prisma.loyaltySegment.update({ where: { id }, data });
    return res.json({ success: true, data: result, message: 'بخش با موفقیت ویرایش شد' });
  } catch (error) {
    console.error('[loyalty/segments/update] خطا:', error);
    return res.status(500).json({ success: false, message: error.message || 'خطا در ویرایش بخش' });
  }
});

// ════════════════════════════════════════════
// DELETE /segments/:id
// ════════════════════════════════════════════
router.delete('/segments/:id', managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.loyaltySegment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'بخش یافت نشد' });
    }
    await prisma.loyaltySegment.delete({ where: { id } });
    return res.json({ success: true, message: 'بخش با موفقیت حذف شد' });
  } catch (error) {
    console.error('[loyalty/segments/delete] خطا:', error);
    return res.status(500).json({ success: false, message: error.message || 'خطا در حذف بخش' });
  }
});

// ════════════════════════════════════════════
// GET /transactions
// ════════════════════════════════════════════
router.get('/transactions', async (req, res) => {
  const where = req.query.customerId ? { customerId: req.query.customerId } : {};
  const data = await prisma.pointTransaction.findMany({
    where,
    include: { customer: { select: { id: true, fullName: true, mobile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// GET /offers
// ════════════════════════════════════════════
router.get('/offers', async (_req, res) => {
  const data = await prisma.loyaltyOffer.findMany({
    include: { segment: true, _count: { select: { coupons: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// POST /customers/:id/adjust — اصلاح امتیاز مشتری
// ════════════════════════════════════════════
router.post('/customers/:id/adjust', managerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { points, description } = req.body;

    // اعتبارسنجی
    if (points === undefined || points === null || Number(points) === 0) {
      return res.status(400).json({
        success: false,
        message: 'تعداد امتیاز معتبر وارد کنید (مثبت یا منفی)'
      });
    }

    const pointsNum = Number(points);
    if (!Number.isInteger(pointsNum)) {
      return res.status(400).json({
        success: false,
        message: 'تعداد امتیاز باید عدد صحیح باشد'
      });
    }

    // پیدا کردن مشتری
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'مشتری یافت نشد'
      });
    }

    // محاسبه امتیاز جدید
    const newTotalPoints = Math.max(0, customer.totalPoints + pointsNum);
    const newLifetimePoints = pointsNum > 0 
      ? customer.lifetimePoints + pointsNum 
      : customer.lifetimePoints;

    // بروزرسانی در تراکنش
    const result = await prisma.$transaction(async (tx) => {
      // بروزرسانی مشتری
      const updated = await tx.customer.update({
        where: { id },
        data: {
          totalPoints: newTotalPoints,
          lifetimePoints: newLifetimePoints,
          lastActivityAt: new Date(),
        },
      });

      // ثبت تراکنش امتیاز
      await tx.pointTransaction.create({
        data: {
          customerId: id,
          type: 'ADJUST',
          sourceType: 'MANUAL',
          points: pointsNum,
          remainingPoints: pointsNum > 0 ? pointsNum : 0,
          balanceAfter: newTotalPoints,
          description: description || (pointsNum > 0 ? 'افزایش دستی امتیاز' : 'کاهش دستی امتیاز'),
          actorUserId: req.user.id,
          createdAt: new Date(),
        },
      });

      return updated;
    });

    // ─── 🔔 نوتیفیکیشن ───
    // ✅ استفاده از assignedToId به جای userId
    const customerForNotif = await prisma.customer.findUnique({
      where: { id },
      select: { assignedToId: true, fullName: true },
    });

    if (customerForNotif?.assignedToId) {
      await notificationService.create({
        type: pointsNum > 0
          ? notificationService.NOTIFICATION_TYPES.LOYALTY_EARNED
          : notificationService.NOTIFICATION_TYPES.LOYALTY_REDEEMED,
        title: pointsNum > 0 ? '⭐ امتیاز اضافه شد' : '📉 امتیاز کسر شد',
        message: pointsNum > 0
          ? `${pointsNum} امتیاز به کیف پول شما اضافه شد`
          : `${Math.abs(pointsNum)} امتیاز از کیف پول شما کسر شد`,
        link: `/members/${id}`,
        userId: customerForNotif.assignedToId,
        data: { customerId: id, points: pointsNum },
      });
    }

    return res.json({
      success: true,
      message: pointsNum > 0 
        ? `${pointsNum} امتیاز با موفقیت اضافه شد` 
        : `${Math.abs(pointsNum)} امتیاز با موفقیت کسر شد`,
      data: {
        customer: result,
        adjustedPoints: pointsNum,
        newBalance: result.totalPoints,
      },
    });
  } catch (error) {
    console.error('[loyalty/adjust-points] خطا:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'خطا در اصلاح امتیاز'
    });
  }
});

// ════════════════════════════════════════════
// GET /transactions/export — خروجی اکسل دفتر کل
// ════════════════════════════════════════════
router.get('/transactions/export', managerOnly, async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const where = req.query.customerId ? { customerId: req.query.customerId } : {};
    
    const transactions = await prisma.pointTransaction.findMany({
      where,
      include: {
        customer: {
          select: { id: true, fullName: true, mobile: true, company: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('دفتر کل امتیاز');

    // تعریف ستون‌ها
    worksheet.columns = [
      { header: 'شناسه', key: 'id', width: 25 },
      { header: 'نوع', key: 'type', width: 15 },
      { header: 'مشتری', key: 'customer', width: 25 },
      { header: 'موبایل', key: 'mobile', width: 15 },
      { header: 'شرکت', key: 'company', width: 20 },
      { header: 'شرح', key: 'description', width: 40 },
      { header: 'منبع', key: 'sourceType', width: 20 },
      { header: 'تغییر', key: 'points', width: 15 },
      { header: 'مانده بعد', key: 'balanceAfter', width: 15 },
      { header: 'تاریخ', key: 'createdAt', width: 20 },
    ];

    // اضافه کردن ردیف‌ها
    for (const t of transactions) {
      worksheet.addRow({
        id: t.id,
        type: t.type === 'EARN' ? 'کسب' : t.type === 'REDEEM' ? 'مصرف' : t.type === 'ADJUST' ? 'اصلاح' : t.type === 'EXPIRE' ? 'انقضا' : 'برگشت',
        customer: t.customer?.fullName || '—',
        mobile: t.customer?.mobile || '—',
        company: t.customer?.company || '—',
        description: t.description || '',
        sourceType: t.sourceType || 'MANUAL',
        points: t.points,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt.toLocaleDateString('fa-IR'),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('[loyalty/transactions/export] خطا:', error);
    res.status(500).json({ success: false, message: error.message || 'خطا در خروجی اکسل' });
  }
});

module.exports = router;