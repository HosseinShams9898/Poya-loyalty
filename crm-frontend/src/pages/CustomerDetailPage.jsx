import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Phone, Building2, MapPin, Crown, Sparkles, Wallet, ShoppingBag, Copy, ScrollText, Gift, Target, Users, Plus, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';
import { customerService, loyaltyService } from '../api/api';
import { Badge, Button, Card, ErrorState, Spinner } from '../components/common/UI';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { copyToClipboard, formatDateTime, formatRial, toFa, cn } from '../utils/ui';
import { showToast } from '../utils/toast';

const statuses = { 
  NEW: ['جدید', 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'], 
  ACTIVE: ['فعال', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'], 
  IN_RISK: ['در معرض ریزش', 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'], 
  CHURNED: ['ریزش‌کرده', 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'] 
};

// ─── مودال اصلاح امتیاز ───
function AdjustPointsModal({ open, customer, onClose, onSuccess }) {
  const [points, setPoints] = useState('');
  const [type, setType] = useState('ADD');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pointsNum = Number(points);
    if (!pointsNum || pointsNum <= 0) {
      showToast('تعداد امتیاز معتبر وارد کنید', 'error');
      return;
    }

    setLoading(true);
    try {
      const finalPoints = type === 'ADD' ? pointsNum : -pointsNum;
      await loyaltyService.adjustPoints(customer.id, {
        points: finalPoints,
        description: reason || (type === 'ADD' ? 'افزایش دستی امتیاز' : 'کاهش دستی امتیاز'),
      });
      showToast(type === 'ADD' ? `${pointsNum} امتیاز اضافه شد` : `${pointsNum} امتیاز کسر شد`);
      onSuccess();
      onClose();
      setPoints('');
      setReason('');
    } catch (err) {
      showToast(err?.message || 'خطا در اصلاح امتیاز', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">اصلاح امتیاز</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400">امتیاز فعلی</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{toFa(customer.totalPoints || 0)}</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نوع عملیات</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('ADD')}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors',
                  type === 'ADD' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}
              >
                ➕ افزایش
              </button>
              <button
                type="button"
                onClick={() => setType('REMOVE')}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors',
                  type === 'REMOVE' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}
              >
                ➖ کاهش
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">تعداد امتیاز *</label>
            <input
              type="number"
              value={points}
              onChange={e => setPoints(e.target.value)}
              placeholder="مثلاً ۱۰۰"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              dir="ltr"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">توضیحات</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="دلیل اصلاح امتیاز..."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || !points}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors',
                points ? (type === 'ADD' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700') : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              {loading ? 'در حال ثبت...' : (type === 'ADD' ? 'افزایش امتیاز' : 'کسر امتیاز')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── صفحه اصلی ───
export default function CustomerDetailPage() {
  const { id } = useParams(); 
  const navigate = useNavigate(); 
  const [member, setMember] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const load = useCallback(() => { 
    setLoading(true); 
    customerService.getById(id)
      .then(r => setMember(r.data || r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false)); 
  }, [id]); 
  
  useEffect(load, [load]);

  const nextTarget = useMemo(() => { 
    const current = Number(member?.lifetimePoints || 0); 
    const targets = [1500, 3500, 7000]; 
    return targets.find(t => t > current) || current; 
  }, [member]);

  if (loading) return <Spinner className="py-24"/>; 
  if (error || !member) return <ErrorState message={error || 'عضو پیدا نشد'} onRetry={load}/>;

  const st = statuses[member.status] || statuses.NEW; 
  const progress = Math.min(100, Math.round(Number(member.lifetimePoints || 0) / Math.max(1, nextTarget) * 100));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/members')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowRight className="w-5 h-5"/>
        </button>
        <Breadcrumbs custom={member.fullName}/>
      </div>

      <section className="rounded-3xl bg-slate-950 text-white p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_5%_10%,rgba(14,165,233,.28),transparent_28%),radial-gradient(circle_at_90%_100%,rgba(124,58,237,.32),transparent_30%)]"/>
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center text-2xl font-black shadow-xl">
              {member.fullName?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">{member.fullName}</h1>
                <Badge color={st[1]}>{st[0]}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="flex gap-1"><Building2 className="w-3.5 h-3.5"/>{member.company || 'بدون شرکت'}</span>
                <span className="flex gap-1"><MapPin className="w-3.5 h-3.5"/>{member.city || '—'}</span>
                <span className="flex gap-1" dir="ltr"><Phone className="w-3.5 h-3.5"/>{member.mobile}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Phone}>تماس</Button>
            <Button icon={Plus} onClick={() => setAdjustModalOpen(true)}>
              اصلاح امتیاز
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Sparkles} label="امتیاز قابل مصرف" value={toFa(member.totalPoints)} tone="amber"/>
        <Stat icon={Wallet} label="اعتبار کیف پول" value={`${formatRial(member.walletBalance)} ریال`} tone="emerald"/>
        <Stat icon={ShoppingBag} label="ارزش کل خرید" value={`${formatRial(member.totalPurchase)} ریال`} tone="sky"/>
        <Stat icon={Crown} label="سطح عضویت" value={member.tier?.title || 'همراه'} tone="violet"/>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-black">مسیر عضویت</h2>
              <p className="text-xs text-slate-400 mt-1">امتیاز طول عمر و پیشرفت سطح</p>
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs font-black" style={{color: member.tier?.color, backgroundColor: `${member.tier?.color}18`}}>
              {member.tier?.title}
            </span>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">{toFa(member.lifetimePoints)} امتیاز طول عمر</span>
              <b>{progress < 100 ? `${toFa(nextTarget - Number(member.lifetimePoints || 0))} تا سطح بعد` : 'بالاترین مسیر فعلی'}</b>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-l from-sky-500 to-violet-600" style={{width: `${progress}%`}}/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5">
            <Fact label="کسب‌شده کل" value={toFa(member.lifetimePoints)}/>
            <Fact label="مصرف‌شده" value={toFa(member.redeemedPoints)}/>
            <Fact label="منقضی‌شده" value={toFa(member.expiredPoints)}/>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-black">هویت باشگاه</h2>
          <div className="space-y-3 mt-4">
            <Info label="شماره عضویت" value={member.membershipNo} copy/>
            <Info label="کد معرفی" value={member.referralCode} copy/>
            <Info label="کانال ترجیحی" value={member.preferredChannel === 'SMS' ? 'پیامک' : member.preferredChannel}/>
            <Info label="تاریخ عضویت" value={formatDateTime(member.joinedAt || member.createdAt)}/>
          </div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-brand-500"/>
            <h2 className="font-black">آخرین گردش امتیاز</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(member.pointTransactions || []).length ? 
              (member.pointTransactions || []).slice(0, 8).map(t => {
                const positive = Number(t.points) > 0;
                return (
                  <div key={t.id} className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>
                      {positive ? <ArrowDownLeft className="w-4 h-4"/> : <ArrowUpRight className="w-4 h-4"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{t.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{formatDateTime(t.createdAt)}</div>
                    </div>
                    <b className={positive ? 'text-emerald-600' : 'text-violet-600'}>{positive ? '+' : ''}{toFa(t.points)}</b>
                  </div>
                );
              }) : <EmptyLine text="هنوز گردش امتیازی ثبت نشده است"/>
            }
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-fuchsia-500"/>
              <h2 className="font-black">مأموریت‌ها</h2>
            </div>
            <div className="space-y-3 mt-4">
              {(member.missionProgress || []).slice(0, 3).map(p => {
                const m = p.mission;
                const pct = Math.min(100, Math.round(Number(p.progress) / Number(m.targetValue) * 100));
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold">{m.title}</span>
                      <span className="text-fuchsia-600">{toFa(pct)}٪</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-2">
                      <div className="h-full bg-fuchsia-500 rounded-full" style={{width: `${pct}%`}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Gift className="w-4 h-4 text-violet-500"/>
                <div className="text-xl font-black mt-2">{toFa((member.redemptions || []).length)}</div>
                <div className="text-[10px] text-slate-400">پاداش دریافت‌شده</div>
              </div>
              <div>
                <Users className="w-4 h-4 text-sky-500"/>
                <div className="text-xl font-black mt-2">{toFa((member.referralsMade || []).length)}</div>
                <div className="text-[10px] text-slate-400">معرفی ثبت‌شده</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* مودال اصلاح امتیاز */}
      <AdjustPointsModal
        open={adjustModalOpen}
        customer={member}
        onClose={() => setAdjustModalOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  const c = { 
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', 
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', 
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300', 
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300' 
  }[tone];
  
  return (
    <Card className="p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c}`}>
        <Icon className="w-4 h-4"/>
      </div>
      <div className="text-lg font-black mt-3 truncate">{value}</div>
      <div className="text-[10px] text-slate-400 mt-1">{label}</div>
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
      <div className="text-[10px] text-slate-400">{label}</div>
      <b className="text-xs mt-1 block">{value}</b>
    </div>
  );
}

function Info({ label, value, copy }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold flex items-center gap-1" dir={copy ? 'ltr' : undefined}>
        {value || '—'}
        {copy && (
          <button onClick={() => copyToClipboard(value).then(() => showToast('کپی شد'))}>
            <Copy className="w-3 h-3 text-slate-400"/>
          </button>
        )}
      </span>
    </div>
  );
}

function EmptyLine({ text }) {
  return <div className="p-8 text-center text-xs text-slate-400">{text}</div>;
}