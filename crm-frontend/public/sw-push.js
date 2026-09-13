/**
 * Push Notification Service Worker
 * این فایل رویدادهای Push را دریافت و به‌صورت نوتیفیکیشن نمایش می‌دهد.
 * 
 * نکته: vite-plugin-pwa سرویس ورکر اصلی (workbox) را تولید می‌کند.
 * این فایل رویداد push و notificationclick را مدیریت می‌کند.
 * از طریق importScripts به سرویس ورکر اصلی متصل می‌شود.
 */

// ─── رنگ‌های برند ───
const BRAND_COLOR = '#0EA5E9';

// ─── آیکون پیش‌فرض ───
const DEFAULT_ICON = '/icons/icon-192x192.png';
const DEFAULT_BADGE = '/icons/badge-72x72.png';

// ─── رویداد Push ───
self.addEventListener('push', (event) => {
  let data = {
    title: 'اعلان جدید',
    body: '',
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    url: '/notifications',
  };

  if (event.data) {
    try {
      const parsed = JSON.parse(event.data.text());
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_BADGE,
    dir: 'rtl',
    lang: 'fa',
    tag: data.tag || `notif-${Date.now()}`,
    renotify: true,
    requireInteraction: data.urgency === 'high',
    data: {
      url: data.url || '/notifications',
      notificationId: data.notificationId || null,
      timestamp: data.timestamp || Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── کلیک روی نوتیفیکیشن ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // اگر تب باشگاه از قبل باز باشد → روی آن فوکوس کن و ناوبری کن
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      //否则 باز کن
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ─── بستن نوتیفیکیشن ───
self.addEventListener('notificationclose', (event) => {
  // در آینده می‌توان آماری ثبت کرد
  const notifData = event.notification.data;
  if (notifData?.notificationId) {
    console.log(`[sw-push] نوتیفیکیشن ${notifData.notificationId} بسته شد`);
  }
});
