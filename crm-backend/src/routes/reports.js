/**
 * روت‌های گزارش‌گیری و تبادل اکسل
 * GET  /reports/invoices-export   → خروجی اکسل فاکتورها
 * GET  /reports/sample-excel      → دانلود فایل نمونه
 * POST /reports/import            → ورود گروهی فاکتور از اکسل
 */

 const express = require('express');
 const router = express.Router();
 const multer = require('multer');
 const path = require('path');
 
 const { requireAuth, requireRole } = require('../middleware/auth');
 const excelService = require('../services/excelService');
 
 // --- Multer Config (فایل در حافظه ذخیره می‌شود) ---
 const storage = multer.memoryStorage();
 const upload = multer({
   storage,
   fileFilter: (req, file, cb) => {
     const ext = path.extname(file.originalname).toLowerCase();
     if (ext === '.xlsx') {
       cb(null, true);
     } else {
       cb(new Error('فقط فایل اکسل (.xlsx) قابل قبول است.'));
     }
   },
   limits: {
     fileSize: 5 * 1024 * 1024, // حداکثر ۵ مگابایت
   },
 });
 
 // ════════════════════════════════════════════
 // ۱. خروجی اکسل — GET /reports/invoices-export
 // ════════════════════════════════════════════
 router.get('/invoices-export', requireAuth, async (req, res) => {
   try {
     const { from, to } = req.query;
 
     const buffer = await excelService.exportInvoicesToExcel({
       fromDate: from || undefined,
       toDate: to || undefined,
     });
 
     const now = new Date();
     const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
     const fileName = `invoices-export-${dateStr}.xlsx`;
 
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
     res.setHeader('Content-Length', buffer.length);
     res.send(buffer);
 
   } catch (err) {
     console.error('[excel export] خطا:', err);
     res.status(500).json({ success: false, message: 'خطا در تولید فایل اکسل' });
   }
 });
 
 // ════════════════════════════════════════════
 // ۲. فایل نمونه — GET /reports/sample-excel
 // ════════════════════════════════════════════
 router.get('/sample-excel', requireAuth, async (_req, res) => {
   try {
     const buffer = await excelService.generateSampleExcel();
 
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     res.setHeader('Content-Disposition', 'attachment; filename="sample-import-template.xlsx"');
     res.setHeader('Content-Length', buffer.length);
     res.send(buffer);
 
   } catch (err) {
     console.error('[excel sample] خطا:', err);
     res.status(500).json({ success: false, message: 'خطا در تولید فایل نمونه' });
   }
 });
 
 // ════════════════════════════════════════════
 // ۳. ورود گروهی — POST /reports/import
 // ════════════════════════════════════════════
 router.post('/import', requireAuth, upload.single('file'), async (req, res) => {
   try {
     if (!req.file) {
       return res.status(400).json({ success: false, message: 'فایلی آپلود نشده است.' });
     }
 
     const results = await excelService.importInvoicesFromExcel(req.file.buffer);
 
     res.json({
       success: true,
       message: `تعداد ${results.success} فاکتور ثبت شد، ${results.errors.length} خطا`,
       data: {
         successCount: results.success,
         errorCount: results.errors.length,
         errors: results.errors,
       },
     });
 
   } catch (err) {
     console.error('[excel import] خطا:', err);
 
     if (err.name === 'MulterError') {
       return res.status(400).json({ success: false, message: err.message });
     }
 
     res.status(500).json({ success: false, message: 'خطا در پردازش فایل اکسل' });
   }
 });
 
 module.exports = router;