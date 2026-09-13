/**
 * Notification Routes
 * API اعلان‌ها — شامل ثبت Push Subscription و مدیریت اعلان‌ها
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const pushService = require('../services/pushService');
const notificationService = require('../services/notificationService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ──────────────────────────────────────────────
// POST /api/v1/notifications/subscribe
// ثبت یا بروزرسانی Push Subscription کلاینت
// ──────────────────────────────────────────────
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user.id;

    // اعتبارسنجی
    const validation = pushService.validateSubscription({ endpoint, keys });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const { p256dh, auth } = keys;

    // اطلاعات مرورگر / دستگاه
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientInfo = {
      userAgent,
      ip: req.ip || req.connection?.remoteAddress,
      registeredAt: new Date().toISOString(),
    };

    // Upsert: اگر قبلاً این endpoint برای این کاربر ثبت شده → بروزرسانی
    // اگر برای کاربر دیگری ثبت شده → غیرفعال‌کردن قدیمی + ایجاد جدید
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      if (existing.userId === userId) {
        // بروزرسانی subscription موجود کاربر
        await prisma.pushSubscription.update({
          where: { endpoint },
          data: {
            p256dhKey: p256dh,
            authKey: auth,
            active: true,
            clientInfo: clientInfo,
          },
        });

        return res.json({
          success: true,
          message: 'اشتراک بروزرسانی شد',
        });
      } else {
        // endpoint متعلق به کاربر دیگر → غیرفعال‌سازی قدیمی
        await prisma.pushSubscription.update({
          where: { endpoint },
          data: { active: false },
        });
      }
    }

    // ایجاد subscription جدید
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dhKey: p256dh,
        authKey: auth,
        active: true,
        clientInfo: clientInfo,
      },
    });

    console.log(`[notifications] Push Subscription ثبت شد → user: ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'اشتراک با موفقیت ثبت شد',
    });
  } catch (error) {
    console.error('[notifications] خطا در subscribe:', error);
    return res.status(500).json({
      success: false,
      message: 'خطا در ثبت اشتراک',
    });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/v1/notifications/subscribe
// لغو Push Subscription
// ──────────────────────────────────────────────
router.delete('/subscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'endpoint الزامی است',
      });
    }

    await prisma.pushSubscription.updateMany({
      where: { endpoint, userId },
      data: { active: false },
    });

    console.log(`[notifications] Push Subscription لغو شد → user: ${userId}`);

    return res.json({
      success: true,
      message: 'اشتراک با موفقیت لغو شد',
    });
  } catch (error) {
    console.error('[notifications] خطا در unsubscribe:', error);
    return res.status(500).json({
      success: false,
      message: 'خطا در لغو اشتراک',
    });
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/notifications
// لیست اعلان‌های کاربر با صفحه‌بندی
// ──────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = '1', limit = '20', unread_only = 'false' } = req.query;
    const userId = req.user.id;

    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unread_only === 'true',
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[notifications] خطا در لیست اعلان‌ها:', error);
    return res.status(500).json({
      success: false,
      message: 'خطا در دریافت اعلان‌ها',
    });
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/notifications/unread-count
// تعداد اعلان‌های خوانده‌نشده
// ──────────────────────────────────────────────
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('[notifications] خطا در unread-count:', error);
    return res.status(500).json({
      success: false,
      message: 'خطا در دریافت تعداد',
    });
  }
});

// ──────────────────────────────────────────────
// PUT /api/v1/notifications/:id/read
// علامت‌گذاری یک اعلان به عنوان خوانده‌شده
// ──────────────────────────────────────────────
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await notificationService.markAsRead(req.user.id, [req.params.id]);
    return res.json({
      success: true,
      message: 'خوانده‌شده',
    });
  } catch (error) {
    console.error('[notifications] خطا در markAsRead:', error);
    return res.status(500).json({
      success: false,
      message: 'خطا در علامت‌گذاری',
    });
  }
});

// ──────────────────────────────────────────────
// PUT /api/v1/notifications/read-all
// علامت‌گذاری همه اعلان‌ها به عنوان خوانده‌شده
// ──────────────────────────────────────────────
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await notificationService.markAsRead(req.user.id, []);
    return res.json({
      success: true,
      message: 'همه اعلان‌ها خوانده‌شده شدند',
    });
  } catch (error) {
    console.error('[notifications] خطا در read-all:', error);
    return res.status(500).json({
      success: false,
      message: 'خطا در علامت‌گذاری',
    });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/v1/notifications/:id
// حذف یک اعلان
// ──────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.user.id);

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'اعلان یافت نشد',
      });
    }

    return res.json({
      success: true,
      message: 'اعلان حذف شد',
    });
  } catch (error) {
    console.error('[notifications] خطا در حذف اعلان:', error);
    return res.status(500).json({
      success: false,
      message: 'خطا در حذف اعلان',
    });
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/notifications/push-public-key
// دریافت کلید عمومی VAPID برای کلاینت
// ──────────────────────────────────────────────
router.get('/push-public-key', (_req, res) => {
  const publicKey = pushService.getPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      message: 'Web Push تنظیم نشده — کلیدهای VAPID موجود نیست',
    });
  }
  return res.json({
    success: true,
    data: { publicKey },
  });
});

module.exports = router;
