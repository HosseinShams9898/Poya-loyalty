# اصلاحات نسخه 3.3

این نسخه ادامه ممیزی Production-readiness نسخه 3.2 است.

## ایرادهای قطعی رفع‌شده

1. **خرابی صفحه جزئیات مشتری:** Route مشتری هنوز relation حذف‌شده `representativeAccount` را از Prisma درخواست می‌کرد. این include حذف شد.
2. **Import ناقص مشتریان سپیدار:** مشتریان حسابداری بدون شماره موبایل قبلاً Skip می‌شدند. فیلد `Customer.mobile` nullable شد تا همه حساب‌های مشتری وارد شوند؛ ورود OTP فقط برای اعضایی که موبایل معتبر دارند فعال می‌ماند.
3. **تشخیص اشتباه فاکتور تسویه‌شده:** نبود فیلد `RemainingAmount` قبلاً به صفر تبدیل می‌شد و می‌توانست فاکتور نسیه را Paid تلقی کند. اکنون فقط داده صریح وضعیت/مانده/دریافت برای Paid شدن پذیرفته می‌شود؛ در حالت مبهم، فاکتور `PENDING` می‌ماند.
4. **آثار CRM در اعلان‌ها:** ثابت‌های `NEW_LEAD`, `LEAD_STAGE_CHANGE`, `LEAD_WON`, `LEAD_LOST` از Notification Service حذف شدند.
5. **Migration موبایل:** دستور `ALTER COLUMN mobile DROP NOT NULL` به Migration واقعی Prisma اضافه شد.
6. **پاک‌سازی nomenclature:** مقدار legacy `SHIPMENT` از توضیح sourceType تراکنش امتیاز حذف شد.

## اعتبارسنجی انجام‌شده

- `node --check` روی فایل‌های Backend تغییرکرده: موفق.
- جست‌وجوی static برای relation و notification typeهای CRM اصلاح‌شده: بدون نتیجه.

## مواردی که هنوز برای تأیید Production لازم‌اند

- اجرای `prisma migrate deploy` روی PostgreSQL آزمایشی/کپی دیتابیس واقعی.
- اجرای `prisma validate` و `prisma generate` در محیطی که دانلود/اجرای Prisma Engine محدود نشود.
- `npm run build` کامل Frontend.
- تست با پاسخ واقعی Web Service سپیدار، خصوصاً schema فیلدهای پرداخت، تاریخ و برگشت از فروش.
- پیاده‌سازی/تأیید جریان برگشت از فروش و معکوس‌کردن امتیاز در صورت ارائه endpoint مربوطه توسط سپیدار.
