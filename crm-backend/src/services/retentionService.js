const prisma = require('../lib/prisma');
const notificationService = require('./notificationService');

const DAY_MS = 86_400_000;

function daysBetween(a, b) {
  return Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS));
}

function analyzePurchasePattern(invoiceDates, now = new Date(), options = {}) {
  const inRiskMultiplier = Number(options.inRiskMultiplier || 1.5);
  const churnMultiplier = Number(options.churnMultiplier || 2.5);
  const inactiveDays = Number(options.inactiveDays || 90);
  const dates = invoiceDates.map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime())).sort((a, b) => a - b);

  if (dates.length === 0) {
    return { avgDaysBetween: null, daysSinceLast: null, thresholdDays: inactiveDays, status: 'NEW', analyzable: false };
  }

  const daysSinceLast = daysBetween(dates[dates.length - 1], now);
  if (dates.length === 1) {
    return { avgDaysBetween: null, daysSinceLast, thresholdDays: inactiveDays, status: daysSinceLast >= inactiveDays ? 'CHURNED' : 'ACTIVE', analyzable: false };
  }

  const intervals = dates.slice(1).map((date, index) => Math.max(1, daysBetween(dates[index], date)));
  const avgDaysBetween = Math.max(1, Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length));
  const thresholdDays = Math.max(1, Math.ceil(avgDaysBetween * inRiskMultiplier));
  const churnDays = Math.max(thresholdDays + 1, Math.ceil(avgDaysBetween * churnMultiplier));
  const status = daysSinceLast >= churnDays ? 'CHURNED' : daysSinceLast >= thresholdDays ? 'IN_RISK' : 'ACTIVE';
  return { avgDaysBetween, daysSinceLast, thresholdDays, churnDays, status, analyzable: true };
}

async function getRules(db = prisma) {
  const rows = await db.setting.findMany({ where: { key: { in: ['churnInRiskMultiplier', 'churnConfirmedMultiplier', 'churnInactiveDays', 'reactivationWindowSize'] } } });
  const settings = Object.fromEntries(rows.map((row) => [row.key, Number(row.value)]));
  return {
    inRiskMultiplier: settings.churnInRiskMultiplier || 1.5,
    churnMultiplier: settings.churnConfirmedMultiplier || 2.5,
    inactiveDays: settings.churnInactiveDays || 90,
    reactivationWindowSize: settings.reactivationWindowSize || 250,
    runAt: '02:00',
  };
}

async function notifyAssignedRep(customer, analysis) {
  let userIds = customer.assignedToId ? [customer.assignedToId] : [];
  if (userIds.length === 0) {
    const managers = await prisma.user.findMany({ where: { status: 'ACTIVE', role: { in: ['ADMIN', 'LOYALTY_MANAGER'] } }, select: { id: true } });
    userIds = managers.map((user) => user.id);
  }
  if (userIds.length === 0) return [];
  return notificationService.notifyMultiple({
    type: analysis.status === 'CHURNED' ? notificationService.NOTIFICATION_TYPES.CHURN_CONFIRMED : notificationService.NOTIFICATION_TYPES.CHURN_RISK,
    title: analysis.status === 'CHURNED' ? 'مشتری غیرفعال شد' : 'هشدار هوشمند ریزش مشتری',
    message: `${customer.fullName} پس از ${analysis.daysSinceLast} روز خرید نکرده؛ الگوی معمول او ${analysis.avgDaysBetween || 'نامشخص'} روز است.`,
    link: `/retention?customer=${customer.id}`,
    data: { customerId: customer.id, customerName: customer.fullName, ...analysis },
    sendPush: true,
    sendSMS: false,
    urgency: 'high',
  }, userIds);
}

async function runRetentionAnalysis(now = new Date()) {
  const rules = await getRules();
  const customers = await prisma.customer.findMany({
    where: { memberStatus: 'ACTIVE' },
    include: { invoices: { select: { invoiceDate: true, createdAt: true }, orderBy: { createdAt: 'asc' } } },
  });
  const summary = { processed: customers.length, active: 0, atRisk: 0, churned: 0, newlyAlerted: 0, runAt: now.toISOString(), rules };

  for (const customer of customers) {
    const analysis = analyzePurchasePattern(customer.invoices.map((invoice) => invoice.invoiceDate || invoice.createdAt), now, rules);
    summary[analysis.status === 'IN_RISK' ? 'atRisk' : analysis.status === 'CHURNED' ? 'churned' : 'active'] += 1;
    const transitioned = analysis.status !== customer.status && ['IN_RISK', 'CHURNED'].includes(analysis.status);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        avgDaysBetween: analysis.avgDaysBetween,
        daysSinceLast: analysis.daysSinceLast,
        churnThresholdDays: analysis.thresholdDays,
        status: analysis.status,
        churnDetectedAt: transitioned ? now : customer.churnDetectedAt,
      },
    });
    if (transitioned) {
      await notifyAssignedRep(customer, analysis).catch((error) => console.error('[retention/notify]', error.message));
      summary.newlyAlerted += 1;
    }
  }
  return summary;
}

async function getReport() {
  const [rules, atRisk, atRiskCount, churned, active, total] = await Promise.all([
    getRules(),
    prisma.customer.findMany({ where: { status: 'IN_RISK', memberStatus: 'ACTIVE' }, include: { tier: true, assignedTo: { select: { id: true, firstName: true, lastName: true } } }, orderBy: [{ daysSinceLast: 'desc' }], take: 100 }),
    prisma.customer.count({ where: { status: 'IN_RISK', memberStatus: 'ACTIVE' } }),
    prisma.customer.count({ where: { status: 'CHURNED', memberStatus: 'ACTIVE' } }),
    prisma.customer.count({ where: { status: 'ACTIVE', memberStatus: 'ACTIVE' } }),
    prisma.customer.count({ where: { memberStatus: 'ACTIVE' } }),
  ]);
  return { rules, counts: { total, active, atRisk: atRiskCount, churned }, atRiskCustomers: atRisk };
}

async function getReactivationWindow(limit) {
  const rules = await getRules();
  const take = Math.max(1, Math.min(250, Number(limit) || rules.reactivationWindowSize));
  const customers = await prisma.customer.findMany({
    where: { status: { in: ['CHURNED', 'IN_RISK'] }, memberStatus: 'ACTIVE' },
    include: { tier: true, assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: [{ totalPurchase: 'desc' }, { daysSinceLast: 'desc' }],
    take,
  });
  return { capacity: 250, count: customers.length, customers };
}

module.exports = { analyzePurchasePattern, getRules, runRetentionAnalysis, getReport, getReactivationWindow };
