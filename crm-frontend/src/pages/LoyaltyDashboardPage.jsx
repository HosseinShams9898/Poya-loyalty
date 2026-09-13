import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Sparkles, Wallet, Gift, ArrowLeft, TrendingUp, ShieldCheck,
  Crown, CircleDollarSign, Activity, ChevronLeft,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { loyaltyAdminService } from '../api/api';
import { Card, SkeletonCard, Badge } from '../components/common/UI';
import { formatRial, toFa } from '../utils/ui';

const redemptionStatus = {
  REQUESTED: ['در انتظار بررسی', 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'],
  APPROVED: ['تأیید شده', 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'],
  FULFILLED: ['تحویل شده', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'],
};
const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function convertToPersianMonth(isoMonth) {
  if (!isoMonth) return '';
  const monthNum = parseInt(isoMonth.split('-')[1]);
  return persianMonths[monthNum - 1] || isoMonth;
}

export default function LoyaltyDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

 useEffect(() => {
  console.log('🔄 [Dashboard] شروع دریافت دیتا...');
  
  loyaltyAdminService.getDashboard()
    .then((response) => {
      const rawData = response.data;
      
      // ✅ محاسبه دیتای ماهانه از تراکنش‌های خام
      if (rawData?.transactions && rawData.transactions.length > 0) {
        const monthlyMap = {};
        const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
        
        rawData.transactions.forEach(tx => {
          const date = new Date(tx.createdAt);
          // تبدیل به شمسی
          const persianMonthIndex = date.toLocaleDateString('fa-IR', { month: 'long' });
          const persianYear = date.toLocaleDateString('fa-IR', { year: 'numeric' });
          const key = `${persianYear}-${persianMonthIndex}`;
          
          if (!monthlyMap[key]) {
            monthlyMap[key] = { month: persianMonthIndex, earned: 0, redeemed: 0 };
          }
          
          if (tx.type === 'EARN') {
            monthlyMap[key].earned += tx.points;
          } else if (tx.type === 'REDEEM') {
            monthlyMap[key].redeemed += Math.abs(tx.points);
          }
        });
        
        rawData.monthly = Object.values(monthlyMap);
      } else {
        rawData.monthly = [];
      }
      
      console.log('✅ [Dashboard] data.monthly:', rawData?.monthly);
      console.log('✅ [Dashboard] data.transactions:', rawData?.transactions);
      setData(rawData);
    })
    .catch((error) => {
      console.error('❌ [Dashboard] خطا:', error);
    })
    .finally(() => {
      setLoading(false);
      console.log('🏁 [Dashboard] بارگذاری تمام شد');
    });
}, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const k = data?.kpis || {};
  const monthly = data?.monthly || []; // ✅ بدون ماک - آرایه خالی
  const tiers = data?.tierDistribution || [];
  const pieTotal = tiers.reduce((sum, tier) => sum + Number(tier.members || 0), 0);

  const kpis = [
    { 
      label: 'اعضای فعال', 
      value: toFa(k.activeMembers || 0), 
      note: `${toFa(k.activeRate || 0)}٪ نرخ فعالیت`, 
      icon: Users, 
      color: 'from-sky-500 to-blue-600' 
    },
    { 
      label: 'امتیاز قابل مصرف', 
      value: toFa(k.spendablePoints || 0), 
      note: `${toFa(k.transactionCount || 0)} گردش ثبت‌شده`, 
      icon: Sparkles, 
      color: 'from-amber-400 to-orange-500' 
    },
    { 
      label: 'تعهد کیف پول', 
      value: `${formatRial(k.walletLiability || 0)} ریال`, 
      note: 'مانده قابل مصرف اعضا', 
      icon: Wallet, 
      color: 'from-emerald-500 to-teal-600' 
    },
    { 
      label: 'درخواست پاداش', 
      value: toFa(k.redemptionCount || 0), 
      note: `${toFa(k.redemptionFulfillmentRate || 0)}٪ تحویل موفق`, 
      icon: Gift, 
      color: 'from-violet-500 to-purple-700' 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 sm:p-8 shadow-2xl shadow-slate-900/15">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,.34),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(124,58,237,.28),transparent_30%),radial-gradient(circle_at_60%_100%,rgba(16,185,129,.18),transparent_35%)]" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full border border-white/10" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-sky-100 mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> مرکز فرمان وفاداری B2B
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">باشگاه مشتریان پویا پلاستیک</h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-7">تصویر زنده‌ای از مشارکت اعضا، ارزش مالی امتیازها و اثربخشی برنامه‌های وفاداری.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => navigate('/members')} 
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-sky-50 transition-colors"
            >
              مشاهده اعضا <ArrowLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigate('/rewards')} 
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-bold hover:bg-white/15 transition-colors"
            >
              مدیریت پاداش‌ها <Gift className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-5 card-lift overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-[.07] bg-gradient-to-br ${item.color}`} />
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-lg mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tnum truncate">{item.value}</div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">{item.label}</div>
              <div className="text-xs text-slate-400 mt-1">{item.note}</div>
            </Card>
          );
        })}
      </div>

      {/* Chart & Tier Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">جریان امتیاز باشگاه</h2>
              <p className="text-xs text-slate-400 mt-1">مقایسه امتیاز صادرشده و مصرف‌شده در شش ماه اخیر</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-sky-500" />کسب‌شده
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-violet-500" />مصرف‌شده
              </span>
            </div>
          </div>
          <div className="h-72" dir="ltr">
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earnedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#0EA5E9" stopOpacity={0.35}/>
                      <stop offset="1" stopColor="#0EA5E9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="redeemedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#8B5CF6" stopOpacity={0.24}/>
                      <stop offset="1" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} width={40} />
                  <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #E2E8F0', fontFamily: 'Vazirmatn', direction: 'rtl' }} />
                  <Area type="monotone" dataKey="earned" stroke="#0EA5E9" strokeWidth={3} fill="url(#earnedFill)" />
                  <Area type="monotone" dataKey="redeemed" stroke="#8B5CF6" strokeWidth={3} fill="url(#redeemedFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                داده‌ای برای نمایش وجود ندارد
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">ترکیب سطوح</h2>
              <p className="text-xs text-slate-400 mt-1">توزیع اعضای باشگاه</p>
            </div>
            <Crown className="w-5 h-5 text-amber-500" />
          </div>
          <div className="h-48 relative" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={tiers} 
                  dataKey="members" 
                  nameKey="title" 
                  innerRadius={55} 
                  outerRadius={78} 
                  paddingAngle={4} 
                  stroke="none"
                >
                  {tiers.map(t => <Cell key={t.id} fill={t.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{toFa(pieTotal)}</span>
              <span className="text-[10px] text-slate-400">عضو</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {tiers.map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span className="flex items-center gap-1.5">
                  <i className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.title}
                </span>
                <b>{toFa(t.members)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Redemptions & Health */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">آخرین درخواست‌های پاداش</h2>
              <p className="text-xs text-slate-400 mt-1">درخواست‌هایی که به توجه تیم باشگاه نیاز دارند</p>
            </div>
            <button 
              onClick={() => navigate('/rewards')} 
              className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1"
            >
              مشاهده همه <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(data?.recentRedemptions || []).map((item) => {
              const status = redemptionStatus[item.status] || redemptionStatus.REQUESTED;
              return (
                <div key={item.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                    <Gift className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.customer?.fullName}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {item.reward?.title} · {toFa(item.pointsCost)} امتیاز
                    </div>
                  </div>
                  <Badge color={status[1]}>{status[0]}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-surface-800">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-bold">سلامت برنامه</h3>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white mt-5">
              {toFa(k.activeRate || 0)}<span className="text-lg text-slate-400">٪</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-6">
              نرخ فعالیت اعضا در محدوده مطلوب است. بیشترین فرصت رشد در فعال‌سازی اعضای سطح همراه دیده می‌شود.
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-brand-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">ارزش خرید اعضا</h3>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-4">
              {formatRial(k.totalPurchase || 0)} ریال
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
              <Activity className="w-3.5 h-3.5" /> برآورد تجمیعی اعضای باشگاه
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}