/**
 * Hepikal SMS Service
 * ارسال پیامک از طریق API هپی‌کال
 * Docs: https://docs.hepikal.com
 * 
 * حالت‌های اجرا:
 *   - Development: فقط لاگ (Dry Run) - پیامکی ارسال نمی‌شود
 *   - Production: ارسال واقعی از طریق API هپی‌کال
 */

 const axios = require('axios');

 // ──────────────────────────────────────────────
 // Config — از .env خوانده می‌شود
 // ──────────────────────────────────────────────
 const NODE_ENV = process.env.NODE_ENV || 'development';
 const IS_DEVELOPMENT = NODE_ENV === 'development';
 const IS_PRODUCTION = NODE_ENV === 'production';
 
 const HEPIKAL_BASE_URL = process.env.HEPIKAL_BASE_URL || 'https://api.hepikal.com/v1';
 const HEPIKAL_API_KEY  = process.env.HEPIKAL_API_KEY;
 const HEPIKAL_SENDER   = process.env.HEPIKAL_SENDER || '3000XXXXX';
 
 // محدودیت‌های عملیاتی
 const MAX_RETRIES        = 3;
 const RETRY_DELAY_MS     = 1000;
 const RATE_LIMIT_PER_SEC = 30;
 
 /**
  * تاخیر بین ریکوئست‌ها برای رعایت Rate Limit
  */
 const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
 
 /**
  * نرمال‌سازی شماره تلفن ایرانی
  * ورودی‌های ممکن: 09121234567, +989121234567, 00989121234567, 9121234567
  * خروجی: 09121234567
  */
 function normalizePhone(raw) {
   if (!raw) return null;
   let cleaned = String(raw).replace(/[^0-9]/g, '');
 
   if (cleaned.startsWith('98') && cleaned.length === 12) {
     cleaned = '0' + cleaned.substring(2);
   }
   if (cleaned.startsWith('0098')) {
     cleaned = '0' + cleaned.substring(4);
   }
   if (cleaned.startsWith('+98')) {
     cleaned = '0' + cleaned.substring(3);
   }
 
   if (/^09[0-9]{9}$/.test(cleaned)) {
     return cleaned;
   }
 
   return null;
 }
 
 // ──────────────────────────────────────────────
 // ارسال پیامک
 // ──────────────────────────────────────────────
 
 /**
  * ارسال پیامک به یک شماره
  * @param {string} to       — شماره گیرنده (مثلاً 09121234567)
  * @param {string} message  — متن پیامک
  * @param {object} options  — گزینه‌های اضافی
  * @returns {Promise<object>} نتیجه ارسال
  */
 async function sendSMS(to, message, options = {}) {
   // ==============================================
   // 🔵 حالت DEVELOPMENT: فقط لاگ کن، پیامک ارسال نکن
   // ==============================================
   if (IS_DEVELOPMENT) {
     console.log(`[smsService] 🔵 DEVELOPMENT MODE - DRY RUN`);
     console.log(`   📱 به: ${to}`);
     console.log(`   📝 متن: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
     console.log(`   ✅ شبیه‌سازی ارسال موفق (پیامکی ارسال نشد)`);
     
     return {
       success: true,
       dryRun: true,
       to,
       messageId: `dry_${Date.now()}`,
       status: 'simulated',
       mode: 'development',
     };
   }
 
   // ==============================================
   // 🔴 حالت PRODUCTION: ارسال واقعی
   // ==============================================
   if (!process.env.HEPIKAL_API_KEY || process.env.HEPIKAL_API_KEY === 'your-hepikal-api-key') {
    console.log(`[smsService] 🔵 DEMO MODE - NO SMS SENT`);
    console.log(`   📱 به: ${to}`);
    console.log(`   📝 متن: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    console.log(`   ✅ شبیه‌سازی ارسال موفق (پیامکی ارسال نشد)`);
    
    return {
      success: true,
      dryRun: true,
      to,
      messageId: `demo_${Date.now()}`,
      status: 'simulated',
      mode: 'demo',
    };
  }
 
   const cleanNumber = normalizePhone(to);
   if (!cleanNumber) {
     throw new Error(`شماره نامعتبر: ${to}`);
   }
 
   const payload = {
     receptor: cleanNumber,
     message,
     sender: options.sender || HEPIKAL_SENDER,
     type: options.type || 1,
     date: options.sendAt || null,
     localid: options.localId || null,
   };
 
   let lastError;
   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
     try {
       const response = await axios.post(
         `${HEPIKAL_BASE_URL}/sms/send`,
         payload,
         {
           headers: {
             'Content-Type': 'application/json',
             'apikey': HEPIKAL_API_KEY,
           },
           timeout: 10000,
         }
       );
 
       const result = response.data;
       console.log(`[smsService] ✅ پیامک ارسال شد → messageId: ${result?.messageId || 'N/A'}, to: ${cleanNumber}`);
 
       return {
         success: true,
         dryRun: false,
         messageId: result?.messageId || result?.id,
         status: result?.status || 'sent',
         cost: result?.cost || null,
         to: cleanNumber,
         mode: 'production',
       };
     } catch (error) {
       lastError = error;
       const status = error.response?.status;
       const data = error.response?.data;
 
       if (status && status >= 400 && status < 500 && status !== 429) {
         console.error(`[smsService] ❌ خطای کلاینت (${status}):`, data?.message || error.message);
         throw new Error(`خطای هپی‌کال: ${data?.message || error.message}`);
       }
 
       if (status === 429) {
         const retryAfter = parseInt(error.response?.headers?.['retry-after']) || 2;
         console.warn(`[smsService] ⏳ Rate Limit — صبر ${retryAfter}s و تلاش مجدد (${attempt}/${MAX_RETRIES})`);
         await sleep(retryAfter * 1000);
         continue;
       }
 
       console.warn(`[smsService] ⚠️ تلاش ${attempt}/${MAX_RETRIES} ناموفق:`, error.message);
       if (attempt < MAX_RETRIES) {
         await sleep(RETRY_DELAY_MS * attempt);
       }
     }
   }
 
   throw new Error(`ارسال پیامک پس از ${MAX_RETRIES} تلاش ناموفق بود: ${lastError?.message}`);
 }
 
 /**
  * ارسال پیامک به چند شماره (بچ)
  * @param {string[]} recipients — آرایه شماره‌ها
  * @param {string}   message    — متن پیامک
  * @param {object}   options    — گزینه‌های اضافی
  * @returns {Promise<object>} خلاصه نتایج ارسال
  */
 async function sendBulkSMS(recipients, message, options = {}) {
   // ==============================================
   // 🔵 حالت DEVELOPMENT: فقط لاگ کن، پیامک ارسال نکن
   // ==============================================
   if (IS_DEVELOPMENT) {
     console.log(`[smsService] 🔵 DEVELOPMENT MODE - DRY RUN`);
     console.log(`   📱 تعداد گیرندگان: ${recipients.length}`);
     console.log(`   📝 متن: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
     console.log(`   📋 لیست شماره‌ها: ${recipients.join(', ')}`);
     console.log(`   ✅ شبیه‌سازی ارسال بچ (پیامکی ارسال نشد)`);
     
     return {
       total: recipients.length,
       sent: recipients.length,
       failed: 0,
       details: recipients.map(to => ({ to, success: true, dryRun: true })),
       mode: 'development',
     };
   }
 
   // ==============================================
   // 🔴 حالت PRODUCTION: ارسال واقعی
   // ==============================================
  if (!process.env.HEPIKAL_API_KEY || process.env.HEPIKAL_API_KEY === 'your-hepikal-api-key') {
  console.log(`[smsService] 🔵 DEMO MODE - BULK SMS`);
  console.log(`   📱 تعداد گیرندگان: ${recipients.length}`);
  console.log(`   📝 متن: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
  console.log(`   ✅ شبیه‌سازی ارسال بچ (پیامکی ارسال نشد)`);
  
  return {
    total: recipients.length,
    sent: recipients.length,
    failed: 0,
    details: recipients.map(to => ({ to, success: true, dryRun: true })),
    mode: 'demo',
  };
}
 
   const results = {
     total: recipients.length,
     sent: 0,
     failed: 0,
     details: [],
     mode: 'production',
   };
 
   for (let i = 0; i < recipients.length; i++) {
     const to = recipients[i];
     try {
       const result = await sendSMS(to, message, options);
       results.sent++;
       results.details.push({ to, success: true, messageId: result.messageId });
     } catch (error) {
       results.failed++;
       results.details.push({ to, success: false, error: error.message });
       console.error(`[smsService] ❌ خطا در ارسال به ${to}:`, error.message);
     }
 
     if (i < recipients.length - 1) {
       await sleep(Math.ceil(1000 / RATE_LIMIT_PER_SEC));
     }
   }
 
   console.log(`[smsService] 📊 ارسال بچ کامل: ${results.sent}/${results.total} موفق`);
   return results;
 }
 
 /**
  * دریافت وضعیت پیامک
  * @param {string} messageId — شناسه پیامک
  * @returns {Promise<object>} وضعیت پیامک
  */
 async function getStatus(messageId) {
   if (IS_DEVELOPMENT) {
     return { messageId, status: 'delivered', dryRun: true, mode: 'development' };
   }
 
   if (!process.env.HEPIKAL_API_KEY || process.env.HEPIKAL_API_KEY === 'your-hepikal-api-key') {
  return { messageId, status: 'delivered', dryRun: true, mode: 'demo' };
}
 
   try {
     const response = await axios.get(`${HEPIKAL_BASE_URL}/sms/status`, {
       params: { messageId },
       headers: { 'apikey': HEPIKAL_API_KEY },
       timeout: 5000,
     });
     return response.data;
   } catch (error) {
     console.error(`[smsService] ❌ خطا در دریافت وضعیت ${messageId}:`, error.message);
     throw error;
   }
 }
 
 /**
  * بررسی اعتبار حساب هپی‌کال
  * @returns {Promise<object>} اطلاعات اعتبار
  */
 async function checkCredit() {
   if (IS_DEVELOPMENT) {
     return { credit: Infinity, currency: 'IRR', dryRun: true, mode: 'development' };
   }
 
  if (!process.env.HEPIKAL_API_KEY || process.env.HEPIKAL_API_KEY === 'your-hepikal-api-key') {
  return { messageId, status: 'delivered', dryRun: true, mode: 'demo' };
}
 
   try {
     const response = await axios.get(`${HEPIKAL_BASE_URL}/account/credit`, {
       headers: { 'apikey': HEPIKAL_API_KEY },
       timeout: 5000,
     });
     return response.data;
   } catch (error) {
     console.error('[smsService] ❌ خطا در بررسی اعتبار:', error.message);
     throw error;
   }
 }
 
 module.exports = {
   sendSMS,
   sendBulkSMS,
   getStatus,
   checkCredit,
   normalizePhone,
 };