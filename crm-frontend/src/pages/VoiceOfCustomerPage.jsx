import { useEffect, useState } from 'react';
import { Headphones, MessageSquareText, Lightbulb, TriangleAlert, Star, PhoneCall, MessagesSquare, Plus, ClockAlert, CheckCircle, Clock, XCircle } from 'lucide-react';
import { feedbackService } from '../api/api';
import { PageHeader } from '../components/common/Breadcrumbs';
import { Avatar, Badge, Button, Card, SkeletonCard } from '../components/common/UI';
import { formatDateTime, toFa } from '../utils/ui';
import { showToast } from '../utils/toast';

const typeMap = {
  COMPLAINT: ['انتقاد/شکایت', 'bg-red-100 text-red-700', TriangleAlert],
  SUGGESTION: ['پیشنهاد', 'bg-amber-100 text-amber-700', Lightbulb],
  SURVEY: ['نظرسنجی', 'bg-violet-100 text-violet-700', Star],
  CALL_NOTE: ['یادداشت تماس', 'bg-sky-100 text-sky-700', PhoneCall]
};

const statusMap = {
  OPEN: { label: 'باز', color: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: 'در حال پیگیری', color: 'bg-amber-100 text-amber-700' },
  RESOLVED: { label: 'حل‌شده', color: 'bg-emerald-100 text-emerald-700' },
  CLOSED: { label: 'بسته', color: 'bg-slate-100 text-slate-700' }
};

const channelMap = {
  PHONE: 'تلفنی',
  SMS: 'پیامک',
  WEB: 'وب',
  HEPIKAL: 'هپی‌کال',
  IN_PERSON: 'حضوری',
};

export default function VoiceOfCustomerPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'COMPLAINT',
    channel: 'PHONE',
    subject: '',
    description: ''
  });

  const fetchData = () => {
    Promise.all([feedbackService.list(), feedbackService.stats()])
      .then(([a, b]) => {
        setItems(a.data || []);
        setStats(b.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await feedbackService.create(form);
      setItems(prev => [r.data, ...prev]);
      setShowForm(false);
      setForm({ type: 'COMPLAINT', channel: 'PHONE', subject: '', description: '' });
      showToast(r.message);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // ===== تغییر وضعیت بازخورد =====
  const updateStatus = async (id, status) => {
    try {
      const response = await feedbackService.update(id, { status });
      // بروزرسانی لیست
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, status } : item
      ));
      showToast(`وضعیت به "${statusMap[status].label}" تغییر کرد`);
    } catch (error) {
      showToast(error.message || 'خطا در تغییر وضعیت', 'error');
    }
  };

  if (loading) return <div className="grid md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}</div>;

  const kpis = [
    ['بازخورد ثبت‌شده', stats?.total, MessagesSquare, 'text-sky-600 bg-sky-50'],
    ['پرونده باز', stats?.open, TriangleAlert, 'text-red-600 bg-red-50'],
    ['عبور از SLA', stats?.breached || 0, ClockAlert, 'text-orange-600 bg-orange-50'],
    ['میانگین CSAT', `${toFa(stats?.csatAverage || 0)} / ۵`, Star, 'text-violet-600 bg-violet-50']
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="صدای مشتری و هپی‌کال"
        subtitle="مرکز یکپارچه تماس تلفنی، انتقاد، پیشنهاد، نظرسنجی و پیام‌های دوسویه"
        icon={Headphones}
        actions={<Button icon={Plus} onClick={() => setShowForm(true)}>ثبت بازخورد</Button>}
      />

      <Card className="p-6 bg-slate-950 text-white border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(14,165,233,.3),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(124,58,237,.28),transparent_32%)]"/>
        <div className="relative grid lg:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-sky-200 font-bold">ارتباط دوسویه و قابل رهگیری</div>
            <h2 className="text-2xl font-black mt-2">هر پیام و تماس، بخشی از پروفایل مشتری است</h2>
            <p className="text-sm text-slate-300 leading-7 mt-2">
              پیام ورودی از طریق سامانه پیامکی با موبایل مشتری تطبیق داده می‌شود؛
              شکایت‌های بحرانی حداکثر ۲ ساعت و موارد عادی حداکثر ۲۴ ساعت برای پاسخ اولیه فرصت دارند.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Feature icon={PhoneCall} title="CSAT بعد از تماس" text="ارسال پیامک خودکار و ثبت میانگین در پروفایل"/>
            <Feature icon={ClockAlert} title="SLA شکایات" text="موعد پاسخ، هشدار تأخیر و زمان حل قابل رهگیری"/>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(([label, value, Icon, color]) => (
          <Card key={label} className="p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5"/>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-4">
              {typeof value === 'number' ? toFa(value) : value}
            </div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-black text-slate-900 dark:text-white">صندوق صدای مشتری</h3>
          <p className="text-xs text-slate-400 mt-1">همه کانال‌ها در یک صف عملیاتی با موعد پاسخ مشخص</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map(item => {
            const [label, color, Icon] = typeMap[item.type] || typeMap.CALL_NOTE;
            const channelLabel = channelMap[item.channel] || item.channel;
            const statusInfo = statusMap[item.status] || statusMap.OPEN;
            
            // تعیین وضعیت‌های قابل تغییر
            const nextStatuses = [];
            if (item.status === 'OPEN') {
              nextStatuses.push({ value: 'IN_PROGRESS', label: 'شروع پیگیری' });
            } else if (item.status === 'IN_PROGRESS') {
              nextStatuses.push({ value: 'RESOLVED', label: 'ثبت حل' });
            } else if (item.status === 'RESOLVED') {
              nextStatuses.push({ value: 'CLOSED', label: 'بستن' });
            }

            return (
              <div key={item.id} className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm text-slate-900 dark:text-white">{item.subject}</b>
                    <Badge color={color}>{label}</Badge>
                    <Badge>{channelLabel}</Badge>
                    {item.slaBreached && <Badge color="bg-red-100 text-red-700">SLA نقض شده</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 leading-6 mt-1">{item.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Avatar name={item.customer?.fullName} size="xs"/>
                    <span className="text-[11px] text-slate-400">
                      {item.customer?.fullName} · {item.customer?.company}
                    </span>
                    {item.dueAt && (
                      <span className={`text-[10px] ${item.slaBreached ? 'text-red-600' : 'text-slate-400'}`}>
                        · مهلت پاسخ: {formatDateTime(item.dueAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
                  
                  {/* دکمه‌های تغییر وضعیت */}
                  <div className="flex flex-col gap-1 mt-2">
                    {nextStatuses.map(ns => (
                      <button
                        key={ns.value}
                        onClick={() => updateStatus(item.id, ns.value)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-500 hover:text-white transition-colors whitespace-nowrap"
                      >
                        {ns.label}
                      </button>
                    ))}
                    {/* اگر وضعیت نهایی بود، دکمه‌ای نمایش نده */}
                    {item.status === 'CLOSED' && (
                      <span className="text-[10px] text-slate-400">✓ بسته شده</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* مودال ثبت بازخورد */}
      {showForm && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-black text-lg text-slate-900 dark:text-white">ثبت بازخورد مشتری</h3>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Select
                label="نوع"
                value={form.type}
                onChange={v => setForm({ ...form, type: v })}
                options={[
                  ['COMPLAINT', 'انتقاد/شکایت'],
                  ['SUGGESTION', 'پیشنهاد'],
                  ['SURVEY', 'نظرسنجی'],
                  ['CALL_NOTE', 'یادداشت تماس']
                ]}
              />
              <Select
                label="کانال"
                value={form.channel}
                onChange={v => setForm({ ...form, channel: v })}
                options={[
                  ['PHONE', 'تلفنی'],
                  ['HEPIKAL', 'هپی‌کال'],
                  ['SMS', 'پیامک'],
                  ['WEB', 'وب'],
                  ['IN_PERSON', 'حضوری']
                ]}
              />
            </div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mt-4">
              عنوان
              <input
                required
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent p-3 outline-none focus:border-brand-500"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mt-4">
              شرح
              <textarea
                required
                rows="4"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent p-3 outline-none focus:border-brand-500"
              />
            </label>
            <div className="flex gap-2 justify-end mt-5">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>انصراف</Button>
              <Button type="submit">ثبت در پرونده</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
      <Icon className="w-5 h-5 text-sky-300"/>
      <div className="font-black text-sm mt-3">{title}</div>
      <div className="text-[11px] text-slate-300 leading-5 mt-1">{text}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
      {label}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 p-3 outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}