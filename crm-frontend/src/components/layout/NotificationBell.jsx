import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, CheckCheck, X, AlertTriangle, UserPlus, CreditCard, Clock, Gift, Info } from 'lucide-react';
import { notificationService, pushService as pushApi } from '../../api/api';
import { cn, toFa, formatDateTime } from '../../utils/ui';
import { showToast } from '../../utils/toast';

// ─── تنظیمات Push ───
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || null;

// ─── تنظیمات آیکون/رنگ بر اساس نوع اعلان ───
const TYPE_CONFIG = {
  CHURNED_ALERT:      { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  IN_RISK_ALERT:      { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  FOLLOW_UP_REMINDER: { icon: Clock,        color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  NEW_LEAD:           { icon: UserPlus,     color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  LOYALTY_MILESTONE:  { icon: Gift,         color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  INVOICE_CREATED:    { icon: CreditCard,   color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },
  PAYMENT_RECEIVED:   { icon: CreditCard,   color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
  SYSTEM:             { icon: Info,          color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
};
const DEFAULT_TYPE = { icon: Bell, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };

// ─── ابزار تبدیل base64 → Uint8Array ───
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [pushStatus, setPushStatus] = useState('idle'); // idle | requesting | subscribed | error
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // ─── دریافت تعداد و لیست اعلان‌ها ───
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.count ?? 0);
    } catch {}
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.list({ limit: 5 });
      setNotifications(res.data?.items || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const iv = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(iv);
  }, [fetchUnreadCount]);

  // ─── بستن dropdown با کلیک بیرون ───
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ─── باز کردن dropdown + بارگذاری لیست ───
  const handleBellClick = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    fetchRecent();
  };

  // ─── ثبت Push Subscription ───
  const requestPushPermission = async () => {
    if (pushStatus === 'requesting') return;
    setPushStatus('requesting');

    try {
      // ۱. درخواست اجازه مرورگر
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        showToast('برای دریافت نوتیفیکیشن اجازه دسترسی لازم است', 'warning');
        setPushStatus('error');
        return;
      }

      // ۲. دریافت کلید VAPID
      let applicationServerKey = VAPID_KEY;
      if (!applicationServerKey) {
        try {
          const res = await pushApi.getPublicKey();
          applicationServerKey = res.data?.publicKey;
        } catch {
          showToast('کلید Push در دسترس نیست', 'error');
          setPushStatus('error');
          return;
        }
      }

      if (!applicationServerKey) {
        showToast('کلید VAPID تنظیم نشده', 'error');
        setPushStatus('error');
        return;
      }

      // ۳. ثبت Service Worker
      const registration = await navigator.serviceWorker.ready;

      // ۴. ساخت Subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
      });

      // ۵. ارسال به بک‌اند
      await pushApi.subscribe({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys.p256dh,
          auth: subscription.toJSON().keys.auth,
        },
      });

      setPushStatus('subscribed');
      showToast('نوتیفیکیشن مرورگر فعال شد', 'success');
    } catch (error) {
      console.error('[NotificationBell] خطا در ثبت Push:', error);
      showToast('خطا در فعال‌سازی نوتیفیکیشن', 'error');
      setPushStatus('error');
    }
  };

  // ─── علامت‌گذاری خوانده‌شده ───
  const handleMarkRead = async (notifId, e) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(notifId);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  // ─── ناوبری به صفحه اعلان‌ها ───
  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  // ─── آیا دکمه اجازه نمایش داده شود؟ ───
  const showPermissionButton = permission === 'default' || pushStatus === 'error';
  const isSubscribed = pushStatus === 'subscribed';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* دکمه زنگوله */}
      <button
        onClick={handleBellClick}
        className={cn(
          'relative p-2 rounded-lg transition-colors duration-200',
          'hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30'
        )}
        aria-label='اعلان‌ها'
      >
        {isSubscribed ? (
          <Bell className='w-5 h-5 text-brand-500 dark:text-brand-400' />
        ) : (
          <Bell className='w-5 h-5 text-slate-600 dark:text-slate-300' />
        )}
        {unreadCount > 0 && (
          <span className='absolute top-0.5 left-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse'>
            {unreadCount > 99 ? '۹۹+' : toFa(unreadCount)}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className='fixed inset-0 z-40 lg:hidden' onClick={() => setOpen(false)} />

          {/* پنل */}
          <div
            className={cn(
              'absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-surface-800 rounded-2xl shadow-2xl',
              'border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-slide-down',
              'max-h-[85vh] flex flex-col'
            )}
          >
            {/* هدر */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50'>
              <h3 className='text-sm font-bold text-slate-900 dark:text-white'>اعلان‌ها</h3>
              <div className='flex items-center gap-1'>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className='flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 px-2 py-1 rounded-md hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors'
                  >
                    <CheckCheck className='w-3.5 h-3.5' />
                    همه خوانده‌شود
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className='p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>

            {/* دکمه فعال‌سازی Push */}
            {showPermissionButton && (
              <div className='px-4 py-3 bg-brand-50 dark:bg-brand-900/30 border-b border-brand-100 dark:border-brand-800'>
                <button
                  onClick={requestPushPermission}
                  disabled={pushStatus === 'requesting'}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
                    'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
                    'transition-colors duration-150 disabled:opacity-60 disabled:cursor-wait'
                  )}
                >
                  {pushStatus === 'requesting' ? (
                    <>
                      <span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      در حال فعال‌سازی...
                    </>
                  ) : (
                    <>
                      <BellOff className='w-4 h-4' />
                      فعال‌سازی نوتیفیکیشن مرورگر
                    </>
                  )}
                </button>
                <p className='text-[11px] text-brand-600/70 dark:text-brand-400/80 mt-1.5 text-center leading-relaxed'>
                  با فعال‌سازی، اعلان‌های مهم حتی وقتی صفحه باز نیست دریافت می‌شوند
                </p>
              </div>
            )}

            {/* وضعیت فعال */}
            {isSubscribed && (
              <div className='px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-100 dark:border-emerald-800'>
                <p className='text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 justify-center'>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                  نوتیفیکیشن مرورگر فعال است
                </p>
              </div>
            )}

            {/* لیست اعلان‌ها */}
            <div className='flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700'>
              {loading ? (
                <div className='flex items-center justify-center py-12'>
                  <span className='w-6 h-6 border-2 border-brand-200 dark:border-brand-800 border-t-brand-500 rounded-full animate-spin' />
                </div>
              ) : notifications.length === 0 ? (
                <div className='py-12 text-center'>
                  <Bell className='w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3' />
                  <p className='text-sm text-slate-400 dark:text-slate-500'>اعلان جدیدی وجود ندارد</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const cfg = TYPE_CONFIG[notif.type] || DEFAULT_TYPE;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'flex gap-3 px-4 py-3 transition-colors duration-150 cursor-pointer',
                        'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                        !notif.isRead && 'bg-brand-50/40 dark:bg-brand-900/20'
                      )}
                      onClick={() => { setOpen(false); navigate('/notifications'); }}
                    >
                      {/* آیکون */}
                      <div className={cn('shrink-0 w-9 h-9 rounded-xl flex items-center justify-center', cfg.bg)}>
                        <Icon className={cn('w-4.5 h-4.5', cfg.color)} />
                      </div>

                      {/* محتوا */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <p className={cn('text-sm truncate', notif.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white font-semibold')}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <button
                              onClick={(e) => handleMarkRead(notif.id, e)}
                              className='shrink-0 p-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-600 text-slate-300 hover:text-brand-500 dark:text-slate-500 transition-colors'
                              title='خوانده‌شده'
                            >
                              <Check className='w-3.5 h-3.5' />
                            </button>
                          )}
                        </div>
                        <p className='text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2 leading-relaxed'>{notif.message}</p>
                        <p className='text-[10px] text-slate-300 dark:text-slate-600 mt-1.5'>{formatDateTime(notif.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* فوتر */}
            <div className='border-t border-slate-100 dark:border-slate-700 px-4 py-2.5 bg-slate-50/40 dark:bg-slate-800/50'>
              <button
                onClick={handleViewAll}
                className='w-full text-center text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors'
              >
                مشاهده همه اعلان‌ها
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
