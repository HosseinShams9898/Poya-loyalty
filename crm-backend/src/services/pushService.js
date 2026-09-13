/**
 * Web Push Service
 * ارسال نوتیفیکیشن Push به کلاینت‌های مرورگر با کتابخانه web-push
 * Docs: https://github.com/web-push-libs/web-push
 */

const webpush = require('web-push');

// ──────────────────────────────────────────────
// Config — از .env خوانده می‌شود
// ──────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || 'mailto:admin@pooyaplastic.com';

// تنظیم VAPID — باید قبل از هر ارسالی انجام شود
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[pushService] VAPID تنظیم شد ✓');
} else {
  console.warn('[pushService] کلیدهای VAPID تنظیم نشده — Web Push غیرفعال است');
}

// TTL پیش‌فرض: ۴ ساعت (秒)
const DEFAULT_TTL = 14400;

/**
 * تولید کلیدهای VAPID جدید (برای توسعه)
 * اجرا: node -e "require('./pushService').generateVapidKeys()"
 */
function generateVapidKeys() {
  const vapidKeys = webpush.generateVAPIDKeys();
  console.log('=== کلیدهای VAPID جدید ===');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log('این مقادیر را در .env قرار دهید.');
  return vapidKeys;
}

/**
 * ارسال نوتیفیکیشن Push به یک کلاینت
 * @param {object}   subscription — شیء PushSubscription کلاینت
 * @param {object}   payload      — محتوای نوتیفیکیشن
 * @param {string}   payload.title     — عنوان
 * @param {string}   payload.body       — متن
 * @param {string}   [payload.icon]     — آیکون (URL)
 * @param {string}   [payload.badge]    — بج (URL)
 * @param {string}   [payload.url]      — لینک کلیک
 * @param {object}   [payload.data]     — داده اضافی
 * @param {object}   [options]     — گزینه‌های ارسال
 * @param {number}   [options.ttl]      — عمر پیام (ثانیه)
 * @param {string}   [options.urgency]  — فوریت: normal | low | high
 * @returns {Promise<object>} نتیجه ارسال
 */
async function sendPush(subscription, payload, options = {}) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[pushService] Web Push غیرفعال — کلیدهای VAPID موجود نیست');
    return { success: false, reason: 'vapid_not_configured' };
  }

  if (!subscription || !subscription.endpoint) {
    console.warn('[pushService] subscription نامعتبر');
    return { success: false, reason: 'invalid_subscription' };
  }

  const pushPayload = {
    title: payload.title || 'اعلان جدید',
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    url: payload.url || '/',
    data: payload.data || {},
    timestamp: Date.now(),
  };

  const webpushOptions = {
    TTL: options.ttl || DEFAULT_TTL,
    urgency: options.urgency || 'normal',
    vapidDetails: {
      subject: VAPID_SUBJECT,
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
    },
  };

  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(pushPayload),
      webpushOptions
    );

    console.log(`[pushService] Push ارسال شد → ${subscription.endpoint.substring(0, 60)}...`);
    return {
      success: true,
      statusCode: result.statusCode,
    };
  } catch (error) {
    // خطای ۴۱۰ یا ۴۰۴ = کلاینت دیگر این subscription را ندارد → باید حذف شود
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.warn(`[pushService] Subscription منقضی شده (HTTP ${error.statusCode}) — باید از دیتابیس حذف شود`);
      return {
        success: false,
        reason: 'subscription_expired',
        statusCode: error.statusCode,
        endpoint: subscription.endpoint,
      };
    }

    console.error(`[pushService] خطا در ارسال Push:`, error.message);
    return {
      success: false,
      reason: 'send_error',
      error: error.message,
    };
  }
}

/**
 * ارسال نوتیفیکیشن به چند کلاینت (بچ)
 * @param {object[]} subscriptions — آرایه PushSubscription
 * @param {object}   payload       — محتوای نوتیفیکیشن
 * @param {object}   [options]     — گزینه‌های ارسال
 * @returns {Promise<object>} خلاصه نتایج
 */
async function sendBulkPush(subscriptions, payload, options = {}) {
  const results = {
    total: subscriptions.length,
    sent: 0,
    failed: 0,
    expiredSubscriptions: [], // subscriptions منقضی‌شده برای حذف از دیتابیس
  };

  // ارسال موازی با محدودیت (۱۰ همزمان)
  const BATCH_SIZE = 10;
  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const batch = subscriptions.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((sub) => sendPush(sub, payload, options))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        const value = result.value;
        if (value.success) {
          results.sent++;
        } else {
          results.failed++;
          if (value.reason === 'subscription_expired') {
            results.expiredSubscriptions.push(value.endpoint);
          }
        }
      } else {
        results.failed++;
      }
    }
  }

  console.log(`[pushService] ارسال بچ: ${results.sent}/${results.total} موفق`);
  if (results.expiredSubscriptions.length > 0) {
    console.log(`[pushService] ${results.expiredSubscriptions.length} subscription منقضی — باید حذف شوند`);
  }
  return results;
}

/**
 * اعتبارسنجی یک Push Subscription کلاینت
 * @param {object} subscription — شیء subscription کلاینت
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSubscription(subscription) {
  if (!subscription) {
    return { valid: false, error: 'subscription خالی است' };
  }
  if (!subscription.endpoint) {
    return { valid: false, error: 'endpoint الزامی است' };
  }
  if (!subscription.keys) {
    return { valid: false, error: 'keys الزامی است' };
  }
  if (!subscription.keys.p256dh) {
    return { valid: false, error: 'keys.p256dh الزامی است' };
  }
  if (!subscription.keys.auth) {
    return { valid: false, error: 'keys.auth الزامی است' };
  }
  return { valid: true };
}

module.exports = {
  sendPush,
  sendBulkPush,
  validateSubscription,
  generateVapidKeys,
  // صادر کردن کلید عمومی برای ارسال به کلاینت
  getPublicKey: () => VAPID_PUBLIC_KEY,
  isConfigured: () => !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
};
