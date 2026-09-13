const prisma = require('../lib/prisma');
const settingsService = require('./settingsService');

const MAX_POINTS = 2_000_000_000;

function boundedInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(MAX_POINTS, Math.floor(parsed)));
}

function conditionMatches(conditions = {}, context = {}) {
  const amount = BigInt(context.amount || 0);
  if (conditions.minAmount && amount < BigInt(conditions.minAmount)) return false;
  if (conditions.maxAmount && amount > BigInt(conditions.maxAmount)) return false;
  if (conditions.paymentType && conditions.paymentType !== context.paymentType) return false;
  if (conditions.paymentStatus && conditions.paymentStatus !== context.paymentStatus) return false;
  if (conditions.maxDelayDays != null && Number(context.delayDays || 0) > Number(conditions.maxDelayDays)) return false;
  if (Array.isArray(conditions.tierCodes) && conditions.tierCodes.length > 0 && !conditions.tierCodes.includes(context.tierCode)) return false;
  return true;
}

/**
 * Pure calculation used by both the route layer and unit tests.
 * All monetary values are passed as bigint/string to avoid precision loss.
 */
function calculateInvoiceBenefits({
  amount,
  paymentType = 'CREDIT',
  paymentStatus = 'PENDING',
  delayDays = 0,
  tierCode = 'BASE',
  tierMultiplier = 1,
  settings,
  rules = [],
}) {
  const amountBigInt = BigInt(amount || 0);
  const rialPerPoint = BigInt(Math.max(1, boundedInt(settings.purchaseRialPerPoint, 1_000_000)));
  const basePoints = Number(amountBigInt / rialPerPoint);
  const entries = [{ code: 'PURCHASE_BASE', title: 'امتیاز پایه خرید', points: basePoints }];

  if (paymentType === 'CASH') {
    entries.push({ code: 'CASH_BONUS', title: 'بونوس پرداخت نقدی', points: boundedInt(settings.cashBonusPoints, 50) });
  }
  if (paymentStatus === 'PAID' && Number(delayDays || 0) <= 0) {
    entries.push({ code: 'ON_TIME_BONUS', title: 'بونوس تسویه به‌موقع', points: boundedInt(settings.financialBonusPoints, 20) });
  }

  const context = { amount: amountBigInt, paymentType, paymentStatus, delayDays, tierCode };
  let multiplier = Math.max(1, Number(tierMultiplier) || 1);
  let walletCredit = 0n;

  for (const rule of rules) {
    if (!rule.isActive || !conditionMatches(rule.conditions || {}, context)) continue;
    const action = rule.action || {};
    if (action.type === 'POINTS_FIXED') {
      entries.push({ code: rule.code, title: rule.title, points: boundedInt(action.value) });
    } else if (action.type === 'POINTS_PER_AMOUNT') {
      const unit = BigInt(Math.max(1, boundedInt(action.rialPerPoint, 1_000_000)));
      const earned = Number(amountBigInt / unit) * Math.max(1, boundedInt(action.value, 1));
      entries.push({ code: rule.code, title: rule.title, points: boundedInt(earned) });
    } else if (action.type === 'MULTIPLIER') {
      multiplier *= Math.max(1, Number(action.value) || 1);
    } else if (action.type === 'CASHBACK_PERCENT') {
      const basisPoints = Math.max(0, Math.min(10_000, Math.floor(Number(action.value) * 100)));
      let credit = (amountBigInt * BigInt(basisPoints)) / 10_000n;
      if (action.cap) credit = credit > BigInt(action.cap) ? BigInt(action.cap) : credit;
      walletCredit += credit;
    }
    if (!rule.stackable) break;
  }

  const rawPoints = entries.reduce((sum, item) => sum + item.points, 0);
  const totalPoints = boundedInt(rawPoints * multiplier);

  return {
    basePoints,
    multiplier,
    totalPoints,
    walletCredit,
    entries,
  };
}

async function activeRules(tx, now = new Date()) {
  return tx.loyaltyRule.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { priority: 'asc' },
  });
}

async function evaluateTier(tx, customerId, lifetimePoints) {
  const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { customerType: true } });
  const audienceType = customer?.customerType === 'REPRESENTATIVE' ? 'REPRESENTATIVE' : 'CONTRACTOR';
  const tier = await tx.loyaltyTier.findFirst({
    where: { isActive: true, audienceType: { in: [audienceType, 'ALL'] }, minPoints: { lte: lifetimePoints } },
    orderBy: [{ minPoints: 'desc' }, { sortOrder: 'desc' }],
  });
  if (tier) {
    await tx.customer.update({ where: { id: customerId }, data: { tierId: tier.id } });
  }
  return tier;
}

async function consumePointLots(tx, customerId, points, now = new Date()) {
  let remaining = Math.max(0, Number(points) || 0);
  const where = {
    customerId,
    type: { in: ['EARN', 'REFUND', 'ADJUST'] },
    remainingPoints: { gt: 0 },
    expiredAt: null,
  };
  const [datedLots, permanentLots] = await Promise.all([
    tx.pointTransaction.findMany({
      where: { ...where, expiresAt: { gt: now } },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
    }),
    tx.pointTransaction.findMany({ where: { ...where, expiresAt: null }, orderBy: { createdAt: 'asc' } }),
  ]);
  const lots = [...datedLots, ...permanentLots];
  for (const lot of lots) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, lot.remainingPoints);
    await tx.pointTransaction.update({ where: { id: lot.id }, data: { remainingPoints: { decrement: used } } });
    remaining -= used;
  }
  // Imported opening balances may not have lot-level history; customer balance remains authoritative.
  return Math.max(0, Number(points) - remaining);
}

async function qualifyReferral(tx, customer, settings) {
  const referral = await tx.referral.findFirst({
    where: { referredCustomerId: customer.id, status: 'JOINED' },
    include: { referrer: true },
  });
  if (!referral) return null;
  const rewardPoints = boundedInt(settings.referralRewardPoints, 250);
  const balanceAfter = referral.referrer.totalPoints + rewardPoints;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + boundedInt(settings.pointExpiryDays, 365));
  await tx.referral.update({ where: { id: referral.id }, data: { status: 'REWARDED', qualifiedAt: new Date(), rewardedAt: new Date(), rewardPoints } });
  await tx.customer.update({ where: { id: referral.referrerId }, data: { totalPoints: balanceAfter, lifetimePoints: { increment: rewardPoints } } });
  await tx.pointTransaction.create({
    data: { customerId: referral.referrerId, type: 'EARN', sourceType: 'REFERRAL', sourceId: referral.id, points: rewardPoints, remainingPoints: rewardPoints, balanceAfter, expiresAt, description: `پاداش معرفی موفق ${customer.fullName}` },
  });
  const mission = await tx.mission.findFirst({ where: { isActive: true, actionType: 'REFERRAL' } });
  if (mission) {
    const progress = await tx.customerMission.upsert({
      where: { customerId_missionId: { customerId: referral.referrerId, missionId: mission.id } },
      create: { customerId: referral.referrerId, missionId: mission.id, progress: 1 },
      update: { progress: { increment: 1 } },
    });
    if (progress.progress >= mission.targetValue && progress.status === 'IN_PROGRESS') await tx.customerMission.update({ where: { id: progress.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
  }
  await evaluateTier(tx, referral.referrerId, referral.referrer.lifetimePoints + rewardPoints);
  return referral.id;
}

async function processInvoice(tx, invoice, customer) {
  if (invoice.loyaltyProcessedAt) {
    return { totalPoints: invoice.loyaltyPointsEarned, walletCredit: 0n, alreadyProcessed: true };
  }

  const settings = await settingsService.getLoyaltyRules(tx);
  const rules = await activeRules(tx);
  const tier = customer.tierId
    ? await tx.loyaltyTier.findUnique({ where: { id: customer.tierId } })
    : null;

  const result = calculateInvoiceBenefits({
    amount: invoice.amount,
    paymentType: invoice.paymentType,
    paymentStatus: invoice.paymentStatus,
    delayDays: invoice.delayDays,
    tierCode: tier?.code || 'BASE',
    tierMultiplier: tier?.multiplier || 1,
    settings,
    rules,
  });

  const newPointBalance = customer.totalPoints + result.totalPoints;
  const newLifetimePoints = customer.lifetimePoints + result.totalPoints;
  const newWalletBalance = customer.walletBalance + result.walletCredit;

  await tx.customer.update({
    where: { id: customer.id },
    data: {
      totalPurchase: { increment: invoice.amount },
      invoicesCount: { increment: 1 },
      totalPoints: newPointBalance,
      lifetimePoints: newLifetimePoints,
      walletBalance: newWalletBalance,
      status: 'ACTIVE',
      lastActivityAt: invoice.createdAt,
    },
  });

  if (result.totalPoints > 0) {
    const expiryDays = boundedInt(settings.pointExpiryDays, 365);
    const expiresAt = new Date(invoice.createdAt);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    await tx.pointTransaction.create({
      data: {
        customerId: customer.id,
        type: 'EARN',
        sourceType: 'INVOICE',
        sourceId: invoice.id,
        points: result.totalPoints,
        remainingPoints: result.totalPoints,
        balanceAfter: newPointBalance,
        description: `امتیاز فاکتور ${invoice.invoiceNumber}`,
        expiresAt,
        metadata: JSON.stringify({
          multiplier: result.multiplier,
          entries: result.entries,
        })
      },
    });
  }

  if (result.walletCredit > 0n) {
    await tx.walletTransaction.create({
      data: {
        customerId: customer.id,
        type: 'CREDIT',
        sourceType: 'CASHBACK',
        sourceId: invoice.id,
        amount: result.walletCredit,
        balanceAfter: newWalletBalance,
        description: `کش‌بک فاکتور ${invoice.invoiceNumber}`,
      },
    });
  }

  await tx.invoice.update({
    where: { id: invoice.id },
    data: { loyaltyPointsEarned: result.totalPoints, loyaltyProcessedAt: new Date() },
  });

  const newTier = await evaluateTier(tx, customer.id, newLifetimePoints);
  await progressPurchaseMissions(tx, customer.id, invoice.amount);
  if (invoice.paymentStatus === 'PAID') await qualifyReferral(tx, customer, settings);

  return { ...result, tier: newTier };
}

async function progressPurchaseMissions(tx, customerId, amount) {
  const now = new Date();
  const missions = await tx.mission.findMany({
    where: {
      isActive: true,
      actionType: { in: ['PURCHASE_COUNT', 'PURCHASE_AMOUNT'] },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
  });

  for (const mission of missions) {
    const increment = mission.actionType === 'PURCHASE_COUNT'
      ? 1
      : Number(BigInt(amount) / 1_000_000n);
    const current = await tx.customerMission.upsert({
      where: { customerId_missionId: { customerId, missionId: mission.id } },
      create: { customerId, missionId: mission.id, progress: increment },
      update: { progress: { increment } },
    });
    const progress = current.progress;
    if (progress >= mission.targetValue && current.status === 'IN_PROGRESS') {
      await tx.customerMission.update({
        where: { id: current.id },
        data: { status: 'COMPLETED', completedAt: now },
      });
    }
  }
}

async function redeemReward(customerId, rewardId) {
  return prisma.$transaction(async (tx) => {
    const [customer, reward] = await Promise.all([
      tx.customer.findUnique({ where: { id: customerId }, include: { tier: true } }),
      tx.reward.findUnique({ where: { id: rewardId }, include: { eligibleTier: true } }),
    ]);
    if (!customer || customer.memberStatus !== 'ACTIVE') throw new Error('عضو فعال یافت نشد');
    if (!reward || !reward.isActive) throw new Error('این پاداش در دسترس نیست');
    const now = new Date();
    if (reward.startsAt && reward.startsAt > now) throw new Error('زمان دریافت این پاداش نرسیده است');
    if (reward.endsAt && reward.endsAt < now) throw new Error('مهلت دریافت این پاداش پایان یافته است');
    if (reward.stock != null && reward.stock <= 0) throw new Error('موجودی پاداش به پایان رسیده است');
    if (customer.totalPoints < reward.costPoints) throw new Error('امتیاز قابل‌مصرف کافی نیست');
    if (reward.eligibleTier && (!customer.tier || customer.tier.sortOrder < reward.eligibleTier.sortOrder)) {
      throw new Error(`این پاداش مخصوص سطح ${reward.eligibleTier.title} و بالاتر است`);
    }

    const balanceAfter = customer.totalPoints - reward.costPoints;
    await consumePointLots(tx, customerId, reward.costPoints);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + reward.validityDays);
    const redemption = await tx.rewardRedemption.create({
      data: {
        customerId,
        rewardId,
        pointsCost: reward.costPoints,
        cashValue: reward.cashValue,
        expiresAt,
      },
      include: { reward: true },
    });
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalPoints: balanceAfter,
        redeemedPoints: { increment: reward.costPoints },
        lastActivityAt: now,
      },
    });
    await tx.pointTransaction.create({
      data: {
        customerId,
        type: 'REDEEM',
        sourceType: 'REWARD',
        sourceId: redemption.id,
        points: -reward.costPoints,
        balanceAfter,
        description: `دریافت پاداش «${reward.title}»`,
      },
    });
    await tx.reward.update({
      where: { id: rewardId },
      data: {
        redeemedCount: { increment: 1 },
        ...(reward.stock != null && { stock: { decrement: 1 } }),
      },
    });
    return redemption;
  });
}

async function claimMission(customerId, missionId) {
  return prisma.$transaction(async (tx) => {
    const progress = await tx.customerMission.findUnique({
      where: { customerId_missionId: { customerId, missionId } },
      include: { mission: true, customer: true },
    });
    if (!progress || progress.status !== 'COMPLETED') throw new Error('این مأموریت هنوز قابل دریافت نیست');
    const balanceAfter = progress.customer.totalPoints + progress.mission.rewardPoints;
    await tx.customerMission.update({ where: { id: progress.id }, data: { status: 'CLAIMED', claimedAt: new Date() } });
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalPoints: balanceAfter,
        lifetimePoints: { increment: progress.mission.rewardPoints },
      },
    });
    await tx.pointTransaction.create({
      data: {
        customerId,
        type: 'EARN',
        sourceType: 'MISSION',
        sourceId: progress.id,
        points: progress.mission.rewardPoints,
        remainingPoints: progress.mission.rewardPoints,
        balanceAfter,
        description: `پاداش مأموریت «${progress.mission.title}»`,
      },
    });
    await evaluateTier(tx, customerId, progress.customer.lifetimePoints + progress.mission.rewardPoints);
    return { points: progress.mission.rewardPoints, balanceAfter };
  });
}

async function convertPointsToWallet(customerId, requestedPoints) {
  const points = Number(requestedPoints);
  if (!Number.isInteger(points) || points <= 0) throw new Error('تعداد امتیاز برای تبدیل معتبر نیست');
  return prisma.$transaction(async (tx) => {
    const [customer, settings] = await Promise.all([
      tx.customer.findUnique({ where: { id: customerId } }),
      settingsService.getLoyaltyRules(tx),
    ]);
    if (!customer || customer.memberStatus !== 'ACTIVE') throw new Error('عضو فعال یافت نشد');
    const threshold = Math.max(1, Number(settings.walletConversionThreshold) || 1000);
    const rialPerConversion = BigInt(Math.max(1, Number(settings.walletRialPerConversion) || 500000));
    if (points < threshold || points % threshold !== 0) throw new Error(`امتیاز باید مضربی از ${threshold} باشد`);
    if (customer.totalPoints < points) throw new Error('امتیاز قابل مصرف کافی نیست');
    const conversions = points / threshold;
    const walletCredit = BigInt(conversions) * rialPerConversion;
    const pointBalanceAfter = customer.totalPoints - points;
    const walletBalanceAfter = customer.walletBalance + walletCredit;
    await consumePointLots(tx, customer.id, points);
    const walletTransaction = await tx.walletTransaction.create({
      data: { customerId: customer.id, type: 'CREDIT', sourceType: 'POINT_CONVERSION', amount: walletCredit, balanceAfter: walletBalanceAfter, description: `تبدیل ${points} امتیاز به اعتبار ریالی` },
    });
    await tx.customer.update({ where: { id: customer.id }, data: { totalPoints: pointBalanceAfter, redeemedPoints: { increment: points }, walletBalance: walletBalanceAfter, lastActivityAt: new Date() } });
    await tx.pointTransaction.create({
      data: { customerId: customer.id, type: 'REDEEM', sourceType: 'WALLET', sourceId: walletTransaction.id, points: -points, balanceAfter: pointBalanceAfter, description: `تبدیل امتیاز به ${walletCredit.toString()} ریال اعتبار کیف پول` },
    });
    return { convertedPoints: points, walletCredit, pointBalanceAfter, walletBalanceAfter, walletTransactionId: walletTransaction.id };
  });
}

async function expireDuePoints(now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const lots = await tx.pointTransaction.findMany({
      where: { type: { in: ['EARN', 'REFUND', 'ADJUST'] }, remainingPoints: { gt: 0 }, expiredAt: null, expiresAt: { lte: now } },
      include: { customer: true },
      orderBy: { expiresAt: 'asc' },
    });
    let expiredPoints = 0;
    const balances = new Map();
    for (const lot of lots) {
      const currentBalance = balances.get(lot.customerId) ?? lot.customer.totalPoints;
      const amount = Math.min(lot.remainingPoints, currentBalance);
      const balanceAfter = currentBalance - amount;
      balances.set(lot.customerId, balanceAfter);
      await tx.pointTransaction.update({ where: { id: lot.id }, data: { remainingPoints: 0, expiredAt: now } });
      if (amount <= 0) continue;
      await tx.customer.update({ where: { id: lot.customerId }, data: { totalPoints: balanceAfter, expiredPoints: { increment: amount } } });
      await tx.pointTransaction.create({ data: { customerId: lot.customerId, type: 'EXPIRE', sourceType: 'SYSTEM', sourceId: lot.id, points: -amount, balanceAfter, description: 'انقضای امتیاز استفاده‌نشده' } });
      expiredPoints += amount;
    }
    return { lots: lots.length, expiredPoints };
  });
}

async function memberSummary(customerId) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      tier: true,
      missionProgress: { include: { mission: true }, orderBy: { updatedAt: 'desc' }, take: 6 },
      redemptions: { include: { reward: true }, orderBy: { requestedAt: 'desc' }, take: 5 },
    },
  });
  if (!customer) return null;
  const nextTier = await prisma.loyaltyTier.findFirst({
    where: { isActive: true, audienceType: { in: [customer.customerType === 'REPRESENTATIVE' ? 'REPRESENTATIVE' : 'CONTRACTOR', 'ALL'] }, minPoints: { gt: customer.lifetimePoints } },
    orderBy: { minPoints: 'asc' },
  });
  const expiring = await prisma.pointTransaction.aggregate({
    where: {
      customerId,
      type: 'EARN',
      expiredAt: null,
      expiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) },
    },
    _sum: { points: true },
  });
  return {
    ...customer,
    nextTier,
    pointsToNextTier: nextTier ? Math.max(0, nextTier.minPoints - customer.lifetimePoints) : 0,
    expiringPoints: expiring._sum.points || 0,
  };
}

module.exports = {
  calculateInvoiceBenefits,
  conditionMatches,
  processInvoice,
  evaluateTier,
  redeemReward,
  claimMission,
  convertPointsToWallet,
  memberSummary,
  consumePointLots,
  qualifyReferral,
  expireDuePoints,
};
