import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, AlertTriangle, UserPlus, Calendar, Gift, BellOff } from 'lucide-react';
import { notificationService } from '../api/api';
import { Spinner, EmptyState, Badge, Card } from '../components/common/UI';
import { PageHeader } from '../components/common/Breadcrumbs';
import { formatDateTime, priorityConfig, cn, toFa } from '../utils/ui';

const typeIcons = { CHURNED_ALERT: AlertTriangle, IN_RISK_ALERT: AlertTriangle, FOLLOW_UP_REMINDER: Calendar, NEW_LEAD: UserPlus, LOYALTY_MILESTONE: Gift };
const typeLabels = { CHURNED_ALERT: 'ریزش', IN_RISK_ALERT: 'هشدار', FOLLOW_UP_REMINDER: 'پیگیری', NEW_LEAD: 'سرنخ', LOYALTY_MILESTONE: 'وفاداری' };
const typeColors = {
  CHURNED_ALERT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  IN_RISK_ALERT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  FOLLOW_UP_REMINDER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  NEW_LEAD: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  LOYALTY_MILESTONE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await notificationService.list({ pageSize: 50 }); setNotifications(r?.data?.items || []); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const markAllRead = async () => { await notificationService.markAllAsRead(); fetch(); };
  const markOneRead = async (id) => { await notificationService.markAsRead(id); setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n)); };
  const removeOne = async (id) => { await notificationService.remove(id); setNotifications(prev => prev.filter(n => n.id !== id)); };

  const filtered = filter ? notifications.filter(n => !n.isRead) : notifications;
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="اعلان‌ها"
        subtitle={unread > 0 ? `${toFa(unread)} اعلان خوانده‌نشده` : 'اعلان جدیدی ندارید'}
        icon={Bell}
        actions={
          unread > 0 && (
            <button onClick={markAllRead} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors">
              <CheckCheck className="w-4 h-4" />خواندن همه
            </button>
          )
        }
      />

      <div className="flex gap-2">
        {[{ v: '', l: 'همه' }, { v: 'unread', l: `خوانده‌نشده (${toFa(unread)})` }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={cn('px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              filter === f.v ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700')}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? <Spinner className="py-12" /> : filtered.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="اعلانی وجود ندارد"
          description="اعلان‌های جدید در اینجا نمایش داده می‌شوند."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const Icon = typeIcons[n.type] || Bell;
            const tc = typeColors[n.type] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
            const pc = priorityConfig[n.priority] || priorityConfig.MEDIUM;
            return (
              <div key={n.id} className={cn(
                'bg-white dark:bg-surface-800 rounded-xl border p-4 transition-all card-lift',
                n.isRead ? 'border-slate-100 dark:border-slate-800' : 'border-brand-200 dark:border-brand-800 shadow-card bg-brand-50/30 dark:bg-brand-900/10'
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', tc)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className={cn('text-sm', n.isRead ? 'text-slate-600 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-white')}>{n.title}</h4>
                        <Badge color={pc.color}>{pc.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {!n.isRead && (
                          <button onClick={() => markOneRead(n.id)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-brand-500 transition-colors" title="خوانده‌شده">
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => removeOne(n.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 leading-relaxed">{n.message}</p>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
