// services/customerNotificationService.js
const prisma = require('../lib/prisma');

/**
 * ایجاد نوتیفیکیشن برای مشتری (بدون نیاز به userId)
 */
async function createForCustomer(data) {
  try {
    const notification = await prisma.customerNotification.create({
      data: {
        customerId: data.customerId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        data: data.data ? JSON.stringify(data.data) : null,
        isRead: false,
      },
    });
    console.log(`✅ نوتیفیکیشن برای مشتری ${data.customerId} ایجاد شد:`, notification.id);
    return notification;
  } catch (error) {
    console.error('❌ خطا در ایجاد نوتیفیکیشن مشتری:', error);
    throw error;
  }
}

/**
 * ایجاد نوتیفیکیشن برای چند مشتری
 */
async function createForCustomers(customerIds, data) {
  const notifications = customerIds.map(customerId => ({
    customerId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link || null,
    data: data.data ? JSON.stringify(data.data) : null,
    isRead: false,
  }));

  return prisma.customerNotification.createMany({
    data: notifications,
  });
}

/**
 * دریافت نوتیفیکیشن‌های یک مشتری
 */
async function getCustomerNotifications(customerId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const where = { customerId };
  if (unreadOnly) where.isRead = false;

  const [items, total] = await Promise.all([
    prisma.customerNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customerNotification.count({ where }),
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
 * شمارش نوتیفیکیشن‌های خوانده‌نشده مشتری
 */
async function getUnreadCount(customerId) {
  return prisma.customerNotification.count({
    where: { customerId, isRead: false },
  });
}

/**
 * علامت‌گذاری نوتیفیکیشن به عنوان خوانده‌شده
 */
async function markAsRead(notificationId, customerId) {
  return prisma.customerNotification.updateMany({
    where: { id: notificationId, customerId },
    data: { isRead: true },
  });
}

/**
 * علامت‌گذاری همه نوتیفیکیشن‌های مشتری به عنوان خوانده‌شده
 */
async function markAllAsRead(customerId) {
  return prisma.customerNotification.updateMany({
    where: { customerId, isRead: false },
    data: { isRead: true },
  });
}

module.exports = {
  createForCustomer,
  createForCustomers,
  getCustomerNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};