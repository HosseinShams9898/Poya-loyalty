const crypto = require('crypto');
const express = require('express');
const prisma = require('../lib/prisma');
const smsService = require('../services/smsService');
const communicationService = require('../services/communicationService');

const router = express.Router();

function validSignature(req) {
  const secret = process.env.HEPIKAL_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const supplied = String(req.headers['x-hepikal-signature'] || '');
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody || Buffer.from(JSON.stringify(req.body))).digest('hex');
  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

router.post('/hepikal/webhook', async (req, res) => {
  if (!validSignature(req)) return res.status(401).json({ success: false, message: 'امضای وب‌هوک معتبر نیست' });
  const event = String(req.body.event || req.body.type || '').toLowerCase();
  const externalId = String(req.body.messageId || req.body.id || '').trim() || null;

  if (event.includes('delivery') || event.includes('status')) {
    await communicationService.updateDeliveryStatus({ externalId, status: req.body.status, rawPayload: req.body });
    return res.json({ success: true });
  }

  const mobile = smsService.normalizePhone(req.body.from || req.body.mobile || req.body.sender);
  const body = String(req.body.message || req.body.text || '').trim();
  if (!mobile || !body) return res.status(400).json({ success: false, message: 'شماره فرستنده و متن پیام الزامی است' });
  if (externalId) {
    const duplicate = await prisma.communicationMessage.findUnique({ where: { externalId } });
    if (duplicate) return res.json({ success: true, duplicate: true });
  }
  const customer = await prisma.customer.findUnique({ where: { mobile } });
  const lowered = body.toLowerCase();
  const type = lowered.includes('شکایت') || lowered.includes('انتقاد') ? 'COMPLAINT' : lowered.includes('پیشنهاد') ? 'SUGGESTION' : 'CALL_NOTE';
  const message = await prisma.$transaction(async (tx) => {
    const saved = await tx.communicationMessage.create({ data: { externalId, customerId: customer?.id || null, direction: 'INBOUND', channel: 'HEPIKAL_SMS', messageType: type, mobile, body, deliveryStatus: 'RECEIVED', rawPayload: req.body } });
    await tx.customerFeedback.create({ data: { customerId: customer?.id || null, type, channel: 'HEPIKAL', subject: type === 'COMPLAINT' ? 'انتقاد دریافتی از هپی‌کال' : type === 'SUGGESTION' ? 'پیشنهاد دریافتی از هپی‌کال' : 'پیام دریافتی مشتری', description: body, priority: type === 'COMPLAINT' ? 'HIGH' : 'NORMAL', sourceMessageId: saved.id } });
    return saved;
  });
  return res.status(201).json({ success: true, data: { id: message.id, customerMatched: Boolean(customer) } });
});

module.exports = router;
