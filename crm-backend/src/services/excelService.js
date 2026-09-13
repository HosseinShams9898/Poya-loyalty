/**
 * سرویس تبادل داده با اکسل
 * جایگزین اتصال به سپیدار (بدون API)
 * 
 * خروجی: فاکتورها → اکسل برای حسابداری
 * ورود: اکسل → ثبت گروهی فاکتور + محاسبه امتیاز
 */

 const ExcelJS = require('exceljs');
 const prisma = require('../lib/prisma');
 
 // === تنظیمات پیش‌فرض قوانین امتیازدهی ===
 async function getLoyaltySettings() {
   try {
     const settings = await prisma.setting.findMany({ where: { group: 'loyalty' } });
     const map = {};
     settings.forEach(s => { map[s.key] = isNaN(Number(s.value)) ? s.value : Number(s.value); });
     return {
       purchaseRialPerPoint: map.purchaseRialPerPoint || 1000000,
       cashBonusPoints: map.cashBonusPoints || 50,
       financialBonusPoints: map.financialBonusPoints || 20,
       walletConversionThreshold: map.walletConversionThreshold || 1000,
       walletRialPerConversion: map.walletRialPerConversion || 500000,
     };
   } catch {
     return {
       purchaseRialPerPoint: 1000000,
       cashBonusPoints: 50,
       financialBonusPoints: 20,
       walletConversionThreshold: 1000,
       walletRialPerConversion: 500000,
     };
   }
 }
 
 /**
  * محاسبه امتیاز برای یک فاکتور
  */
 async function calculateLoyalty(customerId, amount, paymentType, paymentStatus) {
   const settings = await getLoyaltySettings();
   const cleanAmount = Number(amount);
   const purchasePoints = Math.floor(cleanAmount / settings.purchaseRialPerPoint);
   const cashBonus = paymentType === 'CASH' ? settings.cashBonusPoints : 0;
   const financialBonus = (paymentStatus === 'PAID' && paymentType === 'CREDIT') ? settings.financialBonusPoints : 0;
   const totalPoints = purchasePoints + cashBonus + financialBonus;
   return { purchasePoints, cashBonus, financialBonus, totalPoints };
 }
 
 /**
  * اعمال امتیاز به مشتری (به‌روزرسانی کیف پول و امتیاز)
  */
 async function applyLoyalty(customerId, loyalty, amount) {
   const settings = await getLoyaltySettings();
   const customer = await prisma.customer.findUnique({ where: { id: customerId } });
   if (!customer) return;
 
   const cleanAmount = Number(amount);
   const newTotalPoints = Number(customer.totalPoints) + Number(loyalty.totalPoints);
   let walletAdd = 0;
   let conversions = 0;
 
   if (newTotalPoints >= settings.walletConversionThreshold) {
     conversions = Math.floor(newTotalPoints / settings.walletConversionThreshold);
     walletAdd = conversions * settings.walletRialPerConversion;
   }
 
   await prisma.customer.update({
     where: { id: customerId },
     data: {
       totalPoints: newTotalPoints - (conversions * settings.walletConversionThreshold),
       walletBalance: BigInt(Math.round(Number(customer.walletBalance) + walletAdd)),
       totalPurchase: { increment: BigInt(Math.round(cleanAmount)) },
       invoicesCount: { increment: 1 },
     },
   });
 
   return { walletAdd, conversions };
 }
 
 // ════════════════════════════════════════════
 // ۱. خروجی اکسل (Export)
 // ════════════════════════════════════════════
 async function exportInvoicesToExcel({ fromDate, toDate } = {}) {
   const where = {};
   if (fromDate || toDate) {
     where.createdAt = {};
     if (fromDate) where.createdAt.gte = new Date(fromDate);
     if (toDate) where.createdAt.lte = new Date(toDate);
   }
 
   let invoices = [];
   try {
     invoices = await prisma.invoice.findMany({
       where,
       include: { customer: { select: { fullName: true } } },
       orderBy: { createdAt: 'desc' },
     });
   } catch {
     // اگر دیتابیس در دسترس نبود → آرایه خالی
   }
 
   const workbook = new ExcelJS.Workbook();
   workbook.creator = 'پویا پلاستیک CRM';
   workbook.created = new Date();
 
   const sheet = workbook.addWorksheet('فاکتورها', {
     properties: { defaultColWidth: 20 },
     views: [{ rightToLeft: true }],
   });
 
   const headerFont = { name: 'B Nazanin', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
   const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
   const headerBorder = { style: 'thin', color: { argb: 'FF0369A1' } };
   const cellBorder = { style: 'thin', color: { argb: 'FFCBD5E1' } };
 
   // ردیف عنوان
   sheet.mergeCells('A1:F1');
   const titleCell = sheet.getCell('A1');
   titleCell.value = 'گزارش فاکتورها — باشگاه مشتریان پویا پلاستیک';
   titleCell.font = { name: 'B Nazanin', size: 14, bold: true, color: { argb: 'FF0F172A' } };
   titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
   sheet.getRow(1).height = 35;
 
   // ردیف فیلتر
   if (fromDate || toDate) {
     sheet.mergeCells('A2:F2');
     const filterCell = sheet.getCell('A2');
     const fromStr = fromDate ? new Date(fromDate).toLocaleDateString('fa-IR') : 'بدون محدودیت';
     const toStr = toDate ? new Date(toDate).toLocaleDateString('fa-IR') : 'بدون محدودیت';
     filterCell.value = `از: ${fromStr}  |  تا: ${toStr}`;
     filterCell.font = { name: 'B Nazanin', size: 10, color: { argb: 'FF64748B' } };
     filterCell.alignment = { horizontal: 'center' };
     sheet.getRow(2).height = 22;
   }
 
   // هدرها
   const headerRow = fromDate || toDate ? 3 : 2;
   const headers = ['ردیف', 'شماره فاکتور', 'نام مشتری', 'مبلغ (ریال)', 'نوع پرداخت', 'امتیاز کسب شده', 'تاریخ ثبت'];
   const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
 
   headers.forEach((h, i) => {
     const cell = sheet.getCell(`${columns[i]}${headerRow}`);
     cell.value = h;
     cell.font = headerFont;
     cell.fill = headerFill;
     cell.border = headerBorder;
     cell.alignment = { horizontal: 'center', vertical: 'middle' };
   });
   sheet.getRow(headerRow).height = 28;
 
   // داده‌ها
   const paymentTypeMap = { CASH: 'نقدی', CREDIT: 'اعتباری' };
 
   invoices.forEach((inv, idx) => {
     const row = headerRow + 1 + idx;
     const amount = Number(inv.amount);
     const loyalty = Math.floor(amount / 1000000);
 
     const values = [
       idx + 1,
       inv.invoiceNumber,
       inv.customer?.fullName || 'نامشخص',
       amount,
       paymentTypeMap[inv.paymentType] || inv.paymentType,
       loyalty,
       inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fa-IR') : '',
     ];
 
     values.forEach((v, i) => {
       const cell = sheet.getCell(`${columns[i]}${row}`);
       cell.value = v;
       cell.border = cellBorder;
       cell.alignment = { horizontal: 'center', vertical: 'middle' };
       if (i === 3) cell.numFmt = '#,##0';
     });
 
     if (idx % 2 === 0) {
       columns.forEach(col => {
         sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
       });
     }
   });
 
   // ردیف جمع
   if (invoices.length > 0) {
     const totalRow = headerRow + 1 + invoices.length;
     sheet.mergeCells(`A${totalRow}:C${totalRow}`);
     const totalCell = sheet.getCell(`A${totalRow}`);
     totalCell.value = `مجموع (${invoices.length} فاکتور)`;
     totalCell.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
     totalCell.alignment = { horizontal: 'center' };
 
     const amountCell = sheet.getCell(`D${totalRow}`);
     amountCell.value = { formula: `SUM(D${headerRow + 1}:D${headerRow + invoices.length})` };
     amountCell.font = { bold: true, size: 11, color: { argb: 'FF0EA5E9' } };
     amountCell.numFmt = '#,##0';
     amountCell.alignment = { horizontal: 'center' };
   }
 
   const buffer = await workbook.xlsx.writeBuffer();
   return Buffer.from(buffer);
 }
 
 // ════════════════════════════════════════════
 // ۲. ورود گروهی اکسل (Bulk Import)
 // ════════════════════════════════════════════
 async function importInvoicesFromExcel(fileBuffer) {
   const workbook = new ExcelJS.Workbook();
   await workbook.xlsx.load(fileBuffer);
 
   const sheet = workbook.worksheets[0];
   if (!sheet) throw new Error('فایل اکسل خالی است یا شیت ندارد.');
 
   const results = { success: 0, errors: [], errorRows: [] };
   const MAX_ROWS = 500;
 
   // ============================================================
   // تشخیص فرمت فایل
   // ============================================================
   let isTransposed = false;
 
   const sampleRows = [];
   for (let i = 1; i <= Math.min(3, sheet.rowCount); i++) {
     const row = sheet.getRow(i);
     const values = [];
     for (let j = 1; j <= Math.min(5, row.cellCount); j++) {
       values.push(row.getCell(j).value?.toString()?.trim() || '');
     }
     sampleRows.push(values);
   }
 
   console.log('[excelService] 📋 نمونه داده‌ها:', JSON.stringify(sampleRows, null, 2));
 
   const isTransposedCheck = sampleRows.length >= 2 &&
     sampleRows[0][0].includes('شماره فاکتور') &&
     (sampleRows[0][1].includes('INV-') || /^[A-Z0-9\-]+$/.test(sampleRows[0][1] || '')) &&
     sampleRows[1][0].includes('نام یا موبایل مشتری');
 
   const isStandardCheck = sampleRows.length >= 2 &&
     sampleRows[0][0].includes('شماره فاکتور') &&
     sampleRows[1][0].includes('INV-');
 
   if (isTransposedCheck) {
     isTransposed = true;
     console.log('[excelService] 🔄 فرمت چرخیده تشخیص داده شد');
   } else if (isStandardCheck) {
     console.log('[excelService] 📋 فرمت استاندارد تشخیص داده شد');
   } else {
     console.log('[excelService] ⚠️ فرمت ناشناخته، تلاش با فرمت استاندارد...');
   }
 
   // ============================================================
   // خواندن داده‌ها
   // ============================================================
   let rows = [];
 
   if (isTransposed) {
     console.log('[excelService] 🔄 خواندن داده‌ها با فرمت چرخیده...');
 
     const headers = [];
     for (let rowNum = 1; rowNum <= 5; rowNum++) {
       const row = sheet.getRow(rowNum);
       const header = row.getCell(1).value?.toString()?.trim() || '';
       if (header) {
         headers.push(header);
       }
     }
     console.log('[excelService] 📋 هدرها:', headers);
 
     const maxCol = sheet.columnCount;
     for (let col = 2; col <= maxCol; col++) {
       const values = [];
       for (let row = 1; row <= headers.length; row++) {
         const cellValue = sheet.getCell(col, row).value?.toString()?.trim() || '';
         values.push(cellValue);
       }
 
       const rowData = {};
       let hasData = false;
       headers.forEach((header, index) => {
         rowData[header] = values[index] || '';
         if (values[index]) hasData = true;
       });
 
       const invoiceNumber = rowData['شماره فاکتور'] || '';
       if (hasData && invoiceNumber && (invoiceNumber.includes('INV-') || invoiceNumber.length >= 5)) {
         const amountStr = rowData['مبلغ (ریال)'] || '0';
         const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;
         
         rows.push({
           invoiceNumber: invoiceNumber,
           customerIdentifier: rowData['نام یا موبایل مشتری'] || '',
           amount: amount,
           paymentType: (rowData['نوع پرداخت (CASH/CREDIT)'] || '').toUpperCase(),
           paymentStatus: (rowData['وضعیت (PAID/PENDING)'] || '').toUpperCase(),
         });
       }
     }
   } else {
     console.log('[excelService] 📋 خواندن داده‌ها با فرمت استاندارد...');
 
     const rowsData = [];
     sheet.eachRow((row, rowNumber) => {
       if (rowNumber === 1) return;
       if (rowNumber > MAX_ROWS + 1) return;
       rowsData.push({ rowNumber, values: row.values });
     });
 
     for (const { rowNumber, values } of rowsData) {
       const invoiceNumber = String(values[1] || '').trim();
       const customerIdentifier = String(values[2] || '').trim();
       const amount = Number(values[3]);
       const paymentType = String(values[4] || '').trim().toUpperCase();
       const paymentStatus = String(values[5] || '').trim().toUpperCase();
 
       if (invoiceNumber && customerIdentifier && amount > 0) {
         rows.push({
           rowNumber,
           invoiceNumber,
           customerIdentifier,
           amount,
           paymentType,
           paymentStatus,
         });
       }
     }
   }
 
   console.log(`[excelService] 📄 ${rows.length} فاکتور برای پردازش پیدا شد`);
 
   // ============================================================
   // پردازش هر فاکتور
   // ============================================================
   for (let i = 0; i < rows.length; i++) {
     const row = rows[i];
     const rowNumber = row.rowNumber || (i + 2);
 
     try {
       const { invoiceNumber, customerIdentifier, amount, paymentType, paymentStatus } = row;
 
       console.log(`[excelService] 📍 پردازش ردیف ${rowNumber}:`, { invoiceNumber, customerIdentifier, amount, paymentType, paymentStatus });
 
       if (!invoiceNumber) {
         results.errors.push({ row: rowNumber, message: 'شماره فاکتور خالی است' });
         continue;
       }
 
       if (!customerIdentifier || !amount || amount <= 0) {
         results.errors.push({ row: rowNumber, message: 'مشتری و مبلغ الزامی است' });
         continue;
       }
 
       // پیدا کردن مشتری
       let customer;
       try {
         if (/^09\d{9}$/.test(customerIdentifier)) {
           customer = await prisma.customer.findUnique({ where: { mobile: customerIdentifier } });
         }
         if (!customer) {
           customer = await prisma.customer.findFirst({ where: { fullName: customerIdentifier } });
         }
       } catch (error) {
         console.error('[excelService] خطا در جستجوی مشتری:', error.message);
       }
 
       if (!customer) {
         const randomMobile = '09' + Math.floor(Math.random() * 900000000 + 100000000).toString();
         customer = await prisma.customer.create({
           data: {
             fullName: customerIdentifier,
             mobile: randomMobile,
             status: 'NEW',
           },
         });
         console.log(`[excelService] 👤 مشتری جدید: ${customer.fullName} (${customer.mobile})`);
       }
 
       const existingInvoice = await prisma.invoice.findUnique({
         where: { invoiceNumber },
       });
 
       if (existingInvoice) {
         results.errors.push({ row: rowNumber, message: `شماره فاکتور ${invoiceNumber} قبلاً ثبت شده است` });
         continue;
       }
 
       const finalPaymentType = (paymentType === 'CASH' || paymentType === 'نقدی') ? 'CASH' : 'CREDIT';
       let finalPaymentStatus = 'PENDING';
       if (paymentStatus === 'PAID' || paymentStatus === 'تسویه') finalPaymentStatus = 'PAID';
       else if (paymentStatus === 'OVERDUE' || paymentStatus === 'سررسید') finalPaymentStatus = 'OVERDUE';
 
       const cleanAmount = Math.round(Number(amount));
       const loyalty = await calculateLoyalty(customer.id, cleanAmount, finalPaymentType, finalPaymentStatus);
       await applyLoyalty(customer.id, loyalty, cleanAmount);
 
       await prisma.invoice.create({
         data: {
           invoiceNumber,
           customerId: customer.id,
           amount: BigInt(cleanAmount),
           paymentType: finalPaymentType,
           paymentStatus: finalPaymentStatus,
           source: 'EXCEL_IMPORT',
           paymentDate: finalPaymentStatus === 'PAID' ? new Date() : null,
         },
       });
 
       results.success++;
       console.log(`[excelService] ✅ فاکتور ${invoiceNumber} ثبت شد`);
 
     } catch (error) {
       console.error(`[excelService] ❌ خطا در ردیف ${rowNumber}:`, error.message);
       results.errors.push({ row: rowNumber, message: error.message });
       results.errorRows.push(rowNumber);
     }
   }
 
   console.log(`[excelService] ✅ پردازش کامل: ${results.success} موفق، ${results.errors.length} خطا`);
   return results;
 }
 
/**
 * تولید فایل نمونه اکسل برای دانلود کاربر
 */
 async function generateSampleExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'پویا پلاستیک CRM';

  const sheet = workbook.addWorksheet('نمونه ورود فاکتور', {
    views: [{ rightToLeft: true }],
  });

  // ============================================================
  // 🟢 هدرها - دقیقاً مطابق با فرمت مورد انتظار
  // ============================================================
  const headers = [
    'شماره فاکتور',
    'نام یا موبایل مشتری',
    'مبلغ (ریال)',
    'نوع پرداخت (CASH/CREDIT)',
    'وضعیت (PAID/PENDING)'
  ];

  // ============================================================
  // 🟢 داده‌های نمونه - با داده‌های خودت
  // ============================================================
  const sampleData = [
    ['INV-1404-101', '09121111111', 450000000, 'CASH', 'PAID'],
    ['INV-1404-102', 'علی', 780000000, 'CREDIT', 'PENDING'],
    ['INV-1404-103', '09123333333', 1200000000, 'CASH', 'PAID'],
  ];

  // ============================================================
  // 🟢 استایل هدر
  // ============================================================
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } }; // آبی

  // نوشتن هدرها
  headers.forEach((h, i) => {
    const cell = sheet.getCell(1, i + 1); // ردیف 1، ستون i+1
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // تنظیم عرض ستون‌ها
  sheet.getColumn(1).width = 20; // شماره فاکتور
  sheet.getColumn(2).width = 25; // نام یا موبایل
  sheet.getColumn(3).width = 18; // مبلغ
  sheet.getColumn(4).width = 25; // نوع پرداخت
  sheet.getColumn(5).width = 22; // وضعیت

  // ============================================================
  // 🟢 نوشتن داده‌ها
  // ============================================================
  sampleData.forEach((row, rowIdx) => {
    const rowNum = rowIdx + 2; // از ردیف 2 شروع کن
    row.forEach((val, colIdx) => {
      const cell = sheet.getCell(rowNum, colIdx + 1);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // برای ستون مبلغ (ستون 3) عدد رو با فرمت هزارگان نشون بده
      if (colIdx === 2 && typeof val === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  });

  // ============================================================
  // 🟢 تولید فایل
  // ============================================================
  const buffer = await workbook.xlsx.writeBuffer();
  console.log('[excelService] ✅ فایل نمونه تولید شد');
  return Buffer.from(buffer);
}
 module.exports = {
   exportInvoicesToExcel,
   importInvoicesFromExcel,
   generateSampleExcel,
 };