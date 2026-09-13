/**
 * Campaign Service — ماژول کمپین و آفرهای بازاریابی
 */

 const prisma = require('../lib/prisma');
 const smsService = require('./smsService');
 
 // آستانه مشتری طلایی
 const GOLD_MIN_POINTS = parseInt(process.env.GOLD_MIN_POINTS, 10) || 2000;
 
 // انواع مخاطب
 const AUDIENCE_TYPES = {
   ALL_ACTIVE: 'ALL_ACTIVE',
   GOLD: 'GOLD',
   AT_RISK: 'AT_RISK',
 };
 
 const AUDIENCE_LABELS = {
   [AUDIENCE_TYPES.ALL_ACTIVE]: 'همه مشتریان فعال',
   [AUDIENCE_TYPES.GOLD]: 'مشتریان سطح طلایی',
   [AUDIENCE_TYPES.AT_RISK]: 'مشتریان در معرض ریزش',
 };
 
 async function createCampaign({ title, message, audienceType, createdBy }) {
   if (!AUDIENCE_TYPES[audienceType]) {
     throw new Error(`نوع مخاطب نامعتبر: ${audienceType}`);
   }
 
   // ۱. پیدا کردن مخاطبان
   const where = {};
   switch (audienceType) {
     case AUDIENCE_TYPES.ALL_ACTIVE:
       where.status = 'ACTIVE';
       where.mobile = { not: '' };
       break;
     case AUDIENCE_TYPES.GOLD:
       where.status = 'ACTIVE';
       where.totalPoints = { gte: GOLD_MIN_POINTS };
       where.mobile = { not: '' };
       break;
     case AUDIENCE_TYPES.AT_RISK:
       where.status = 'IN_RISK';
       where.mobile = { not: '' };
       break;
   }
 
   const customers = await prisma.customer.findMany({
     where,
     select: { id: true, fullName: true, mobile: true },
   });
 
   if (customers.length === 0) {
     throw new Error('هیچ مخاطبی یافت نشد');
   }
 
   // ۲. ایجاد رکورد کمپین
   const campaign = await prisma.campaign.create({
     data: {
       title,
       message,
       audienceType,
       status: 'SENDING',
       totalRecipients: customers.length,
       sentCount: 0,
       failedCount: 0,
       createdBy,
     },
   });
 
   // ۳. ارسال پیامک
   let smsResult = { sent: 0, failed: 0 };
   try {
     const phoneNumbers = customers.map((c) => c.mobile).filter(Boolean);
     smsResult = await smsService.sendBulkSMS(phoneNumbers, message);
 
     await prisma.campaign.update({
       where: { id: campaign.id },
       data: {
         status: 'COMPLETED',
         sentCount: smsResult.sent || 0,
         failedCount: smsResult.failed || 0,
         completedAt: new Date(),
       },
     });
 
     console.log(`[campaignService] ✅ کمپین «${title}»: ${smsResult.sent}/${smsResult.total} ارسال شد`);
   } catch (smsError) {
     console.error('[campaignService] ❌ خطا در ارسال پیامک:', smsError.message);
     
     await prisma.campaign.update({
       where: { id: campaign.id },
       data: {
         status: 'FAILED',
         failedCount: customers.length,
         completedAt: new Date(),
       },
     });
     
     return {
       id: campaign.id,
       title,
       audienceType,
       audienceLabel: AUDIENCE_LABELS[audienceType],
       totalRecipients: customers.length,
       sentCount: 0,
       failedCount: customers.length,
       status: 'FAILED',
     };
   }
 
   return {
     id: campaign.id,
     title,
     audienceType,
     audienceLabel: AUDIENCE_LABELS[audienceType],
     totalRecipients: customers.length,
     sentCount: smsResult.sent || 0,
     failedCount: smsResult.failed || 0,
     status: 'COMPLETED',
   };
 }
 
 async function listCampaigns({ page = 1, limit = 20 } = {}) {
   const [items, total] = await Promise.all([
     prisma.campaign.findMany({
       orderBy: { createdAt: 'desc' },
       skip: (page - 1) * limit,
       take: limit,
       include: {
         creator: { select: { id: true, firstName: true, lastName: true } },
       },
     }),
     prisma.campaign.count(),
   ]);
 
   return {
     items,
     total,
     page,
     limit,
     totalPages: Math.ceil(total / limit),
   };
 }
 
 module.exports = {
   createCampaign,
   listCampaigns,
   AUDIENCE_TYPES,
   AUDIENCE_LABELS,
 };