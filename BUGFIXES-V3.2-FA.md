# اصلاحات نسخه 3.2

## اصلاحات بحرانی

1. فایل پاک‌سازی CRM قبلاً با نام `cleanup_crm.sql` کنار migration قرار داشت. Prisma Migrate فقط فایل `migration.sql` هر migration را اجرا می‌کند؛ بنابراین پاک‌سازی تضمین‌شده نبود. دستورات DROP و حذف ستون‌های CRM اکنون مستقیماً داخل `prisma/migrations/20260911_loyalty_only_sepidar/migration.sql` قرار گرفته‌اند.

2. تحلیل Retention قبلاً از `Invoice.createdAt` استفاده می‌کرد. برای فاکتورهای تاریخی واردشده از سپیدار، این تاریخ زمان Import بود نه تاریخ واقعی خرید و باعث محاسبه غلط ریسک ریزش می‌شد. اکنون `invoiceDate` اولویت دارد و `createdAt` فقط fallback است.

3. Sync فاکتور سپیدار مقاوم‌تر شد: چند نام متداول برای تاریخ و مبلغ پشتیبانی می‌شود، تاریخ نامعتبر کنترل می‌شود، و وضعیت پرداخت/نوع پرداخت با داده‌های باقی‌مانده و دریافتی پایدارتر محاسبه می‌شود.

## اعتبارسنجی انجام‌شده

- `node --check src/services/sepidarService.js` پاس شد.
- `node --check src/services/retentionService.js` پاس شد.
- وجود دستورات CRM cleanup در migration واقعی Prisma کنترل شد.

## موردی که هنوز برای تأیید Production لازم است

Build کامل و `prisma validate/migrate` باید در محیطی با نصب کامل dependencyها و یک PostgreSQL آزمایشی اجرا شود. این مورد وابسته به محیط است و در این بسته به عنوان «تأییدشده در Production» ادعا نشده است.
