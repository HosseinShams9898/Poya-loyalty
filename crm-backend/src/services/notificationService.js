/**
 * Notification Service — دیسپچر مرکزی اعلان‌ها
 */

const prisma = require('../lib/prisma');
const smsService = require('./smsService');
const pushService = require('./pushService');

// ──────────────────────────────────────────────
// انواع اعلان
// ──────────────────────────────────────────────
const NOTIFICATION_TYPES = {
  // سرنخ
  
  // فاکتور
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_OVERDUE: 'INVOICE_OVERDUE',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  
  // تعامل
  FOLLOWUP_DUE: 'FOLLOWUP_DUE',
  FOLLOWUP_OVERDUE: 'FOLLOWUP_OVERDUE',
  
  // وفاداری
  LOYALTY_EARNED: 'LOYALTY_EARNED',
  LOYALTY_REDEEMED: 'LOYALTY_REDEEMED',
  LOYALTY_MILESTONE: 'LOYALTY_MILESTONE',
  REWARD_APPROVED: 'REWARD_APPROVED',
  REWARD_FULFILLED: 'REWARD_FULFILLED',
  
  // ریزش
  CHURN_RISK: 'CHURN_RISK',
  CHURN_CONFIRMED: 'CHURN_CONFIRMED',
  
  // سیستم
  SYSTEM: 'SYSTEM',
};

// ──────────────────────────────────────────────
// توابع اصلی
// ──────────────────────────────────────────────

/**
 * ایجاد یک اعلان در دیتابیس
 */
async function create(data) {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || null,
      data: data.data ? JSON.stringify(data.data) : null,
      isRead: false,
    },
  });
}

/**
 * ایجاد اعلان برای چند کاربر
 */
async function createForUsers(userIds, data) {
  const notifications = userIds.map(userId => ({
    userId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link || null,
    data: data.data ? JSON.stringify(data.data) : null,
    isRead: false,
  }));

  return prisma.notification.createMany({
    data: notifications,
  });
}

/**
 * ارسال اعلان کامل (DB + Push + SMS)
 */
async function notify({
  type,
  title,
  message,
  userId,
  link = null,
  data = {},
  sendSMS = false,
  sendPush = true,
  urgency = 'normal',
}) {
  const result = {
    dbSaved: false,
    notificationId: null,
    pushResults: null,
    smsResult: null,
  };

  try {
    // ─── مرحله ۱: ثبت در دیتابیس ───
    const notification = await create({
      userId,
      type,
      title,
      message,
      link,
      data,
    });
    result.dbSaved = true;
    result.notificationId = notification.id;

    // ─── مرحله ۲: ارسال Web Push ───
    if (sendPush && pushService.isConfigured && pushService.isConfigured()) {
      try {
        const subscriptions = await prisma.pushSubscription.findMany({
          where: { userId, active: true },
        });

        if (subscriptions.length > 0) {
          const pushPayload = {
            title,
            body: message,
            url: link || '/notifications',
            data: {
              notificationId: notification.id,
              type,
              ...data,
            },
          };

          const pushResult = await pushService.sendBulkPush(
            subscriptions.map((s) => ({
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dhKey, auth: s.authKey },
            })),
            pushPayload,
            { urgency }
          );
          result.pushResults = pushResult;

          if (pushResult.expiredSubscriptions?.length > 0) {
            await prisma.pushSubscription.updateMany({
              where: {
                endpoint: { in: pushResult.expiredSubscriptions },
              },
              data: { active: false },
            });
          }
        }
      } catch (pushError) {
        console.error('[notificationService] خطا در ارسال Push:', pushError.message);
      }
    }

    // ─── مرحله ۳: ارسال پیامک ───
    if (sendSMS) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { mobile: true },
        });

        if (user?.mobile) {
          const smsText = message;
          result.smsResult = await smsService.sendSMS(user.mobile, smsText);
        } else {
          result.smsResult = { skipped: true, reason: 'no_mobile' };
        }
      } catch (smsError) {
        console.error('[notificationService] خطا در ارسال پیامک:', smsError.message);
        result.smsResult = { success: false, error: smsError.message };
      }
    }

    return result;
  } catch (error) {
    console.error('[notificationService] خطای کلی در notify():', error);
    throw error;
  }
}

/**
 * ارسال اعلان به چند کاربر
 */
async function notifyMultiple(params, userIds) {
  const results = await Promise.allSettled(
    userIds.map((userId) => notify({ ...params, userId }))
  );

  return results.map((r, i) => ({
    userId: userIds[i],
    success: r.status === 'fulfilled',
    result: r.status === 'fulfilled' ? r.value : { error: r.reason?.message },
  }));
}

/**
 * علامت‌گذاری اعلان‌ها به عنوان خوانده‌شده
 */
async function markAsRead(userId, notificationIds = []) {
  const where = { userId, isRead: false };
  if (notificationIds.length > 0) {
    where.id = { in: notificationIds };
  }
  return prisma.notification.updateMany({ where, data: { isRead: true } });
}

/**
 * حذف اعلان
 */
async function deleteNotification(notificationId, userId) {
  return prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

/**
 * دریافت اعلان‌های کاربر
 */
async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const where = { userId };
  if (unreadOnly) where.isRead = false;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * شمارش اعلان‌های خوانده‌نشده
 */
async function getUnreadCount(userId) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

module.exports = {
  create,
  createForUsers,
  notify,
  notifyMultiple,
  markAsRead,
  deleteNotification,
  getUserNotifications,
  getUnreadCount,
  NOTIFICATION_TYPES,
};