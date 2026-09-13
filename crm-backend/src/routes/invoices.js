const express = require('express');
const prisma = require('../lib/prisma');
const { parseBigIntFields } = require('../lib/bigint');
const { requireAuth } = require('../middleware/auth');
const loyaltyService = require('../services/loyaltyService');
const communicationService = require('../services/communicationService');
const notificationService = require('../services/notificationService');

const router = express.Router();
router.use(requireAuth);

// ════════════════════════════════════════════
// GET /stats
// ════════════════════════════════════════════
router.get('/stats', async (_req, res) => {
  try {
    const [total, paid, pending, overdue, points] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { amount: true }, _count: true }),
      prisma.invoice.count({ where: { paymentStatus: 'PAID' } }),
      prisma.invoice.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.invoice.count({ where: { paymentStatus: 'OVERDUE' } }),
      prisma.invoice.aggregate({ _sum: { loyaltyPointsEarned: true } }),
    ]);
    return res.json({
      success: true,
      data: {
        totalAmount: total._sum.amount || 0n,
        totalInvoices: total._count,
        paidInvoices: paid,
        pendingInvoices: pending,
        overdueInvoices: overdue,
        totalLoyaltyPoints: points._sum.loyaltyPointsEarned || 0,
      },
    });
  } catch (error) {
    console.error('[invoices/stats]', error.message);
    return res.status(500).json({ success: false, message: 'خطا در دریافت آمار فاکتورها' });
  }
});

// ════════════════════════════════════════════
// GET /
// ════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 20));
    const where = {};
    if (req.query.customerId) where.customerId = req.query.customerId;
    if (req.query.paymentStatus) where.paymentStatus = req.query.paymentStatus;
    if (req.query.paymentType) where.paymentType = req.query.paymentType;
    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { customer: { select: { id: true, fullName: true, mobile: true, company: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);
    const items = rows.map((row) => ({
      ...row,
      customerName: row.customer.fullName,
      loyalty: { totalPoints: row.loyaltyPointsEarned },
    }));
    return res.json({ success: true, data: { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } } });
  } catch (error) {
    console.error('[invoices/list]', error.message);
    return res.status(500).json({ success: false, message: 'خطا در دریافت فاکتورها' });
  }
});

// ════════════════════════════════════════════
// GET /:id
// ════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  const data = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { customer: true, coupon: { include: { offer: true } } } });
  if (!data) return res.status(404).json({ success: false, message: 'فاکتور یافت نشد' });
  return res.json({ success: true, data });
});

// ════════════════════════════════════════════
// POST / — Create invoice
// ════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const { invoiceNumber, customerId, paymentType = 'CREDIT', paymentStatus = 'PENDING', source = 'MANUAL', paymentDate, delayDays = 0 } = req.body;
    if (!invoiceNumber || !customerId || req.body.amount == null) {
      return res.status(400).json({ success: false, message: 'شماره فاکتور، مشتری و مبلغ الزامی است' });
    }
    if (!['CASH', 'CREDIT'].includes(paymentType) || !['PAID', 'PENDING', 'OVERDUE'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'نوع یا وضعیت پرداخت نامعتبر است' });
    }
    const amount = parseBigIntFields({ amount: req.body.amount }, ['amount']).amount;
    if (amount <= 0n) return res.status(400).json({ success: false, message: 'مبلغ باید بیشتر از صفر باشد' });
    
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error('مشتری یافت نشد');
      const duplicate = await tx.invoice.findUnique({ where: { invoiceNumber: String(invoiceNumber).trim() } });
      if (duplicate) throw new Error('شماره فاکتور قبلاً ثبت شده است');
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: String(invoiceNumber).trim(),
          customerId,
          amount,
          paymentType,
          paymentStatus,
          source,
          delayDays: Math.max(0, Number(delayDays) || 0),
          paymentDate: paymentStatus === 'PAID' ? (paymentDate ? new Date(paymentDate) : new Date()) : null,
        },
      });
      const loyalty = await loyaltyService.processInvoice(tx, invoice, customer);
      const saved = await tx.invoice.findUnique({ where: { id: invoice.id }, include: { customer: true } });
      return { invoice: saved, loyalty };
    });

    // ─── 🔔 نوتیفیکیشن ───
    const customerForNotif = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { assignedToId: true, fullName: true },
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    const sentUserIds = new Set();

    // 1. به کاربر تخصیص‌داده‌شده (اگه وجود داشته باشه)
    if (customerForNotif?.assignedToId) {
      await notificationService.create({
        type: notificationService.NOTIFICATION_TYPES.INVOICE_CREATED,
        title: '📄 فاکتور جدید',
        message: `فاکتور #${invoiceNumber} به مبلغ ${Number(amount).toLocaleString('fa-IR')} ریال برای مشتری "${customerForNotif.fullName}" ثبت شد`,
        link: `/invoices/${result.invoice.id}`,
        userId: customerForNotif.assignedToId,
        data: { invoiceId: result.invoice.id, invoiceNumber, amount: Number(amount) },
      });
      sentUserIds.add(customerForNotif.assignedToId);
    }

    // 2. به ادمین‌ها (فقط اونایی که قبلاً نوتیفیکیشن نگرفتن)
    for (const admin of admins) {
      if (sentUserIds.has(admin.id)) continue;
      
      await notificationService.create({
        type: notificationService.NOTIFICATION_TYPES.INVOICE_CREATED,
        title: '📄 فاکتور جدید ثبت شد',
        message: `فاکتور #${invoiceNumber} به مبلغ ${Number(amount).toLocaleString('fa-IR')} ریال توسط ${req.user.firstName} ${req.user.lastName} ثبت شد`,
        link: `/invoices/${result.invoice.id}`,
        userId: admin.id,
        data: { invoiceId: result.invoice.id, invoiceNumber, amount: Number(amount) },
      });
    }

    const sms = await communicationService.sendInvoicePointsSms({
      invoice: result.invoice,
      customer: result.invoice.customer,
      points: result.loyalty.totalPoints,
      walletCredit: result.loyalty.walletCredit,
    }).catch((smsError) => ({ success: false, error: smsError.message }));

    return res.status(201).json({
      success: true,
      message: 'فاکتور، مزایای وفاداری و اعلان امتیاز ثبت شد',
      data: { ...result, communication: sms },
    });
  } catch (error) {
    const expected = ['مشتری یافت نشد', 'شماره فاکتور قبلاً ثبت شده است'];
    if (expected.includes(error.message) || error instanceof TypeError) {
      return res.status(error.message.includes('قبلاً') ? 409 : 400).json({ success: false, message: error.message });
    }
    console.error('[invoices/create]', error.message);
    return res.status(500).json({ success: false, message: 'خطا در ثبت فاکتور' });
  }
});

// ════════════════════════════════════════════
// PATCH /:id — ویرایش فاکتور
// ════════════════════════════════════════════
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceNumber, customerId, amount, paymentType, paymentStatus, paymentDate, delayDays, source } = req.body;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'فاکتور یافت نشد' });
    }

    if (invoiceNumber && invoiceNumber !== existing.invoiceNumber) {
      const duplicate = await prisma.invoice.findUnique({
        where: { invoiceNumber: String(invoiceNumber).trim() },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'شماره فاکتور قبلاً ثبت شده است' });
      }
    }

    const data = {};
    if (invoiceNumber !== undefined) data.invoiceNumber = String(invoiceNumber).trim();
    if (customerId !== undefined) data.customerId = customerId;
    if (amount !== undefined) {
      const parsedAmount = parseBigIntFields({ amount }, ['amount']).amount;
      if (parsedAmount <= 0n) {
        return res.status(400).json({ success: false, message: 'مبلغ باید بیشتر از صفر باشد' });
      }
      data.amount = parsedAmount;
    }
    if (paymentType !== undefined) {
      if (!['CASH', 'CREDIT'].includes(paymentType)) {
        return res.status(400).json({ success: false, message: 'نوع پرداخت نامعتبر است' });
      }
      data.paymentType = paymentType;
    }
    if (paymentStatus !== undefined) {
      if (!['PAID', 'PENDING', 'OVERDUE'].includes(paymentStatus)) {
        return res.status(400).json({ success: false, message: 'وضعیت پرداخت نامعتبر است' });
      }
      data.paymentStatus = paymentStatus;
      if (paymentStatus === 'PAID') {
        data.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      } else {
        data.paymentDate = null;
      }
    }
    if (delayDays !== undefined) data.delayDays = Math.max(0, Number(delayDays) || 0);
    if (source !== undefined) data.source = source;

    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: { customer: true },
    });

    if (paymentType !== undefined || paymentStatus !== undefined || amount !== undefined) {
      const purchasePoints = Math.floor(Number(invoice.amount) / 1000000);
      let bonusPoints = 0;
      if (invoice.paymentType === 'CASH') bonusPoints += 50;
      if (invoice.paymentStatus === 'PAID' && invoice.delayDays === 0) bonusPoints += 20;
      const totalPoints = purchasePoints + bonusPoints;

      await prisma.invoice.update({
        where: { id },
        data: {
          loyaltyPointsEarned: totalPoints,
          loyaltyProcessedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: 'فاکتور با موفقیت ویرایش شد',
      data: invoice,
    });
  } catch (error) {
    console.error('[invoices/update] خطا:', error);
    res.status(500).json({ success: false, message: error.message || 'خطا در ویرایش فاکتور' });
  }
});

// ════════════════════════════════════════════
// DELETE /:id — حذف فاکتور
// ════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'فاکتور یافت نشد' });
    }
    await prisma.invoice.delete({ where: { id } });
    res.json({ success: true, message: 'فاکتور با موفقیت حذف شد' });
  } catch (error) {
    console.error('[invoices/delete] خطا:', error);
    res.status(500).json({ success: false, message: error.message || 'خطا در حذف فاکتور' });
  }
});

module.exports = router;