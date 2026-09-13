const prisma = require('../lib/prisma');
const smsService = require('./smsService');

async function logMessage(data, db = prisma) {
  return db.communicationMessage.create({ data });
}

async function sendTrackedSms({ customerId = null, mobile, body, messageType = 'GENERAL', externalId = null }) {
  const normalized = smsService.normalizePhone(mobile);
  if (!normalized) throw new Error('شماره موبایل معتبر نیست');

  let providerResult;
  try {
    providerResult = await smsService.sendSMS(normalized, body, { localId: externalId });
  } catch (error) {
    await logMessage({
      customerId,
      externalId: externalId || null,
      direction: 'OUTBOUND',
      channel: 'HEPIKAL_SMS',
      messageType,
      mobile: normalized,
      body,
      deliveryStatus: 'FAILED',
      rawPayload: { error: error.message },
    }).catch(() => null);
    throw error;
  }

  await logMessage({
    customerId,
    externalId: providerResult?.messageId || externalId || null,
    direction: 'OUTBOUND',
    channel: 'HEPIKAL_SMS',
    messageType,
    mobile: normalized,
    body,
    deliveryStatus: providerResult?.status === 'delivered' ? 'DELIVERED' : 'SENT',
    rawPayload: providerResult,
  }).catch((error) => console.error('[communication/log]', error.message));

  return providerResult;
}

async function sendInvoicePointsSms({ invoice, customer, points, walletCredit = 0n }) {
  const walletText = BigInt(walletCredit || 0) > 0n
    ? ` و ${Number(walletCredit).toLocaleString('fa-IR')} ریال اعتبار کیف پول`
    : '';
  const body = `عضو گرامی باشگاه پویا، فاکتور ${invoice.invoiceNumber} ثبت شد و ${Number(points || 0).toLocaleString('fa-IR')} امتیاز${walletText} دریافت کردید. مانده و پاداش‌ها در پنل باشگاه قابل مشاهده است.`;
  return sendTrackedSms({ customerId: customer.id, mobile: customer.mobile, body, messageType: 'INVOICE_POINTS' });
}

async function updateDeliveryStatus({ externalId, status, rawPayload }) {
  const map = { delivered: 'DELIVERED', sent: 'SENT', failed: 'FAILED', rejected: 'FAILED' };
  if (!externalId) return null;
  return prisma.communicationMessage.updateMany({
    where: { externalId },
    data: { deliveryStatus: map[String(status).toLowerCase()] || 'SENT', rawPayload },
  });
}

module.exports = { logMessage, sendTrackedSms, sendInvoicePointsSms, updateDeliveryStatus };
