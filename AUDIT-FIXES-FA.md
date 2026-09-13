# اصلاحات ممیزی نسخه 3.1

این نسخه در پاسخ به سه Failure ممیزی نسخه 3.0 تهیه شده است.

## Failure 1 — حذف ناقص CRM
- مدل‌ها، Routeها، Serviceها، صفحات و APIهای Lead / Project / Interaction حذف شدند.
- منطق SalesTarget / Business Operations / Representative Network حذف شد.
- Seed دیگر داده CRM یا فروش پروژه‌ای تولید نمی‌کند.

## Failure 2 — وابستگی پنهان CSAT به CRM
- CSAT دیگر Lead یا Interaction موقت ایجاد نمی‌کند.
- جریان جدید: Customer -> Feedback -> CsatToken.
- اعلان رضایت پایین به صفحه عضو باشگاه ارجاع می‌دهد، نه Lead.

## Failure 3 — باقی‌مانده‌های Business/Representative در Runtime
- Purchase Request، Shipment، Product Catalog، Representative Portal و سرویس‌های مرتبط حذف شدند.
- Stats به داشبورد آماری باشگاه مشتریان تبدیل شد.
- API client و Mock CRM حذف شدند.

## دیتابیس
فایل `cleanup_crm.sql` برای حذف فیزیکی جداول Legacy بعد از Backup اضافه شده است. این فایل مخرب است و فقط پس از تهیه Backup باید اجرا شود.

## وضعیت بررسی
- تمام فایل‌های JavaScript Backend با `node --check` بدون خطا بررسی شدند.
- جست‌وجوی نهایی برای Prisma call و routeهای CRM نتیجه‌ای نداشت.
- اجرای کامل `npm ci / prisma validate / npm test` در محیط ممیزی به علت timeout نصب وابستگی‌ها کامل نشد؛ بنابراین Build نهایی باید در محیط توسعه/ویندوز مقصد هم اجرا شود.
