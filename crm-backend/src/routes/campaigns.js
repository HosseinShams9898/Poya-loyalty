/**
 * Campaign Routes — کمپین‌های بازاریابی
 */

 const express = require('express');
 const campaignService = require('../services/campaignService');
 const { requireAuth, requireRole } = require('../middleware/auth');
 const prisma = require('../lib/prisma');
 
 const router = express.Router();
 
 // ════════════════════════════════════════════
 // POST /api/v1/campaigns — ایجاد و ارسال کمپین
 // ════════════════════════════════════════════
 router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
   try {
     const { title, message, audienceType } = req.body;
 
     if (!title || !message || !audienceType) {
       return res.status(400).json({
         success: false,
         message: 'فیلدهای title, message و audienceType الزامی هستند',
       });
     }
 
     const result = await campaignService.createCampaign({
       title,
       message,
       audienceType,
       createdBy: req.user.id,
     });
 
     return res.status(201).json({ success: true, data: result });
   } catch (error) {
     console.error('[campaigns] خطا در ایجاد کمپین:', error);
     const status = error.message.includes('یافت نشد') ? 404 : 500;
     return res.status(status).json({ success: false, message: error.message });
   }
 });
 
 // ════════════════════════════════════════════
 // GET /api/v1/campaigns — لیست کمپین‌ها
 // ════════════════════════════════════════════
 router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
   try {
     const { page = '1', limit = '20' } = req.query;
     const result = await campaignService.listCampaigns({
       page: parseInt(page),
       limit: parseInt(limit),
     });
     return res.json({ success: true, data: result });
   } catch (error) {
     console.error('[campaigns] خطا در لیست:', error);
     return res.status(500).json({ success: false, message: 'خطا در دریافت کمپین‌ها' });
   }
 });
 
 // ════════════════════════════════════════════
 // GET /api/v1/campaigns/:id — دریافت یک کمپین
 // ════════════════════════════════════════════
 router.get('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
   try {
     const { id } = req.params;
 
     const campaign = await prisma.campaign.findUnique({
       where: { id },
       include: {
         creator: {
           select: { id: true, firstName: true, lastName: true },
         },
       },
     });
 
     if (!campaign) {
       return res.status(404).json({
         success: false,
         message: 'کمپین یافت نشد',
       });
     }
 
     return res.json({ success: true, data: campaign });
   } catch (error) {
     console.error('[campaigns] خطا در دریافت کمپین:', error);
     return res.status(500).json({ success: false, message: 'خطا در دریافت کمپین' });
   }
 });
 
 // ════════════════════════════════════════════
 // PUT /api/v1/campaigns/:id — ویرایش کمپین
 // ════════════════════════════════════════════
 router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
   try {
     const { id } = req.params;
     const { title, message, audienceType } = req.body;
 
     const existing = await prisma.campaign.findUnique({
       where: { id },
     });
 
     if (!existing) {
       return res.status(404).json({
         success: false,
         message: 'کمپین یافت نشد',
       });
     }
 
     // فقط کمپین‌های DRAFT قابل ویرایش هستند
     if (existing.status !== 'DRAFT') {
       return res.status(400).json({
         success: false,
         message: 'فقط کمپین‌های پیش‌نویس قابل ویرایش هستند',
       });
     }
 
     const data = {};
     if (title !== undefined) data.title = title;
     if (message !== undefined) data.message = message;
     if (audienceType !== undefined) data.audienceType = audienceType;
 
     const campaign = await prisma.campaign.update({
       where: { id },
       data,
       include: {
         creator: {
           select: { id: true, firstName: true, lastName: true },
         },
       },
     });
 
     return res.json({ success: true, data: campaign });
   } catch (error) {
     console.error('[campaigns] خطا در ویرایش کمپین:', error);
     return res.status(500).json({ success: false, message: 'خطا در ویرایش کمپین' });
   }
 });
 
 // ════════════════════════════════════════════
 // DELETE /api/v1/campaigns/:id — حذف کمپین
 // ════════════════════════════════════════════
 router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
   try {
     const { id } = req.params;
 
     const existing = await prisma.campaign.findUnique({
       where: { id },
     });
 
     if (!existing) {
       return res.status(404).json({
         success: false,
         message: 'کمپین یافت نشد',
       });
     }
 
     // کمپین‌های در حال ارسال قابل حذف نیستند
     if (existing.status === 'SENDING') {
       return res.status(400).json({
         success: false,
         message: 'کمپین در حال ارسال قابل حذف نیست',
       });
     }
 
     await prisma.campaign.delete({
       where: { id },
     });
 
     return res.json({
       success: true,
       message: 'کمپین با موفقیت حذف شد',
     });
   } catch (error) {
     console.error('[campaigns] خطا در حذف کمپین:', error);
     return res.status(500).json({ success: false, message: 'خطا در حذف کمپین' });
   }
 });
 
 module.exports = router;