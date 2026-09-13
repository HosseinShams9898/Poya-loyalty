const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const communicationService = require('./communicationService');
const notificationService = require('./notificationService');
const CSAT_BASE_URL = process.env.CSAT_BASE_URL || 'https://app.domain.com/csat';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

async function createCsatToken({ customerId, customerName, customerMobile, feedbackId = null, assignedToId = null }) {
  const token = uuidv4();
  const csat = await prisma.csatToken.create({ data: { customerId, feedbackId, assignedToId, token, status: 'PENDING', expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS) } });
  let smsResult = null;
  if (customerMobile) {
    const link = `${CSAT_BASE_URL}/${token}`;
    const message = `${customerName || 'مشتری گرامی'}، لطفاً رضایت خود را از ۱ تا ۵ ثبت کنید: ${link}`;
    try { smsResult = await communicationService.sendTrackedSms({ customerId, mobile: customerMobile, body: message, messageType: 'CSAT' }); } catch (e) { console.error('[csatService] SMS:', e.message); }
  }
  return { csatId: csat.id, token, expiresAt: csat.expiresAt, smsResult };
}

async function getTokenInfo(token) {
  const csat = await prisma.csatToken.findUnique({ where: { token }, include: { customer: { select: { fullName: true, company: true } }, feedback: { select: { subject: true, createdAt: true } } } });
  if (!csat) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
  if (csat.expiresAt < new Date()) return { valid: false, reason: 'TOKEN_EXPIRED' };
  if (csat.status === 'SUBMITTED') return { valid: false, reason: 'ALREADY_SUBMITTED' };
  return { valid: true, data: { token: csat.token, status: csat.status, customerName: csat.customer?.fullName, company: csat.customer?.company, subject: csat.feedback?.subject, createdAt: csat.feedback?.createdAt, expiresAt: csat.expiresAt } };
}

async function submitScore(token, score) {
  const numScore = parseInt(score, 10);
  if (!Number.isInteger(numScore) || numScore < 1 || numScore > 5) return { success: false, error: 'امتیاز باید بین ۱ تا ۵ باشد' };
  const csat = await prisma.csatToken.findUnique({ where: { token }, include: { customer: { select: { fullName: true } } } });
  if (!csat) return { success: false, error: 'توکن نامعتبر' };
  if (csat.expiresAt < new Date()) return { success: false, error: 'توکن منقضی شده' };
  if (csat.status === 'SUBMITTED') return { success: false, error: 'امتیاز قبلاً ثبت شده' };
  await prisma.$transaction(async (tx) => {
    await tx.csatToken.update({ where: { token }, data: { score: numScore, status: 'SUBMITTED' } });
    const stats = await tx.csatToken.aggregate({ where: { customerId: csat.customerId, status: 'SUBMITTED', score: { not: null } }, _avg: { score: true }, _count: { score: true } });
    await tx.customer.update({ where: { id: csat.customerId }, data: { csatAverage: stats._avg.score || numScore, csatResponses: stats._count.score } });
  });
  if (numScore <= 2) {
    try {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
      if (admins.length) await notificationService.notifyMultiple({ type: notificationService.NOTIFICATION_TYPES.SYSTEM, title: 'رضایت مشتری پایین', message: `مشتری «${csat.customer?.fullName || 'نامشخص'}» امتیاز ${numScore}/۵ داده است.`, link: `/members/${csat.customerId}`, data: { csatToken: token, score: numScore, customerId: csat.customerId }, sendPush: true, sendSMS: false, urgency: 'high' }, admins.map(a => a.id));
    } catch (e) { console.error('[csatService] notification:', e.message); }
  }
  return { success: true, score: numScore, message: 'از بازخورد شما سپاسگزاریم.' };
}

async function getStats() {
  const [total, submitted, avgScore, distribution] = await Promise.all([
    prisma.csatToken.count(),
    prisma.csatToken.count({ where: { status: 'SUBMITTED' } }),
    prisma.csatToken.aggregate({ where: { status: 'SUBMITTED', score: { not: null } }, _avg: { score: true } }),
    prisma.csatToken.groupBy({ by: ['score'], where: { status: 'SUBMITTED', score: { not: null } }, _count: { score: true }, orderBy: { score: 'asc' } }),
  ]);
  return { total, submitted, pending: total - submitted, responseRate: total ? Math.round((submitted / total) * 100) : 0, averageScore: Number((avgScore._avg.score || 0).toFixed(2)), distribution };
}
module.exports = { createCsatToken, getTokenInfo, submitScore, getStats };
