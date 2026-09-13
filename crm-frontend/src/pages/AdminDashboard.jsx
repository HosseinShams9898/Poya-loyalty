import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Star, Users, Loader2, Target, RotateCcw, ReceiptText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { statsService } from '../api/api';
import { cn, toFa, formatRial, formatRialShort } from '../utils/ui';
import { Card } from '../components/common/UI';
import { PageHeader } from '../components/common/Breadcrumbs';

// ─── رنگ‌ها ───
const PIE_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#6B7280'];

const REASON_LABELS = {
  PRICE: 'قیمت بالا',
  COMPETITOR: 'رقابت',
  LOST_CONTACT: 'قطع ارتباط',
  OTHER: 'سایر',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await statsService.getCeoDashboard();
        setData(res.data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Loader2 className='w-8 h-8 text-brand-500 animate-spin' />
      </div>
    );
  }

  if (!data) return null;

  const { kpis, charts } = data;

  return (
    <div className='space-y-6 animate-fade-in'>
      <PageHeader
        title="داشبورد مدیریتی"
        subtitle="نمای کلی عملکرد کسب‌وکار"
        icon={Target}
      />

      {/* ۴ KPI */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <KpiCard
          title='فروش ماه جاری'
          value={formatRialShort(kpis.sales.total)}
          sub={`${toFa(kpis.sales.invoiceCount)} فاکتور`}
          trend={kpis.sales.growth}
          icon={DollarSign}
          color='emerald'
        />
        <KpiCard
          title='سهم فروش نقدی'
          value={`${toFa(kpis.cashShare.percentage)}%`}
          sub={formatRialShort(kpis.cashShare.amount)}
          trend={null}
          icon={DollarSign}
          color='sky'
          isCash
        />
        <KpiCard
          title='سرنخ‌های جدید'
          value={toFa(kpis.newLeads.count)}
          sub='این ماه'
          trend={null}
          icon={Users}
          color='violet'
        />
        <KpiCard
          title='رضایت مشتری'
          value={kpis.csat.average ? `${toFa(kpis.csat.average)}/۵` : '—'}
          sub={`${toFa(kpis.csat.totalResponses)} پاسخ`}
          trend={null}
          icon={Star}
          color='amber'
          isScore
        />
      </div>

      <div className='grid sm:grid-cols-2 gap-4'>
        <Card className='p-5 flex items-center gap-4'><div className='w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-600 flex items-center justify-center'><ReceiptText className='w-5 h-5'/></div><div><div className='text-xs text-slate-400'>مطالبات سررسیدگذشته</div><div className='text-lg font-black text-slate-900 dark:text-white mt-1'>{formatRialShort(kpis.receivables?.overdueAmount || 0)}</div><div className='text-[11px] text-red-500 mt-1'>{toFa(kpis.receivables?.overdueInvoices || 0)} فاکتور نیازمند اقدام</div></div></Card>
        <Card className='p-5 flex items-center gap-4'><div className='w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center'><RotateCcw className='w-5 h-5'/></div><div><div className='text-xs text-slate-400'>فعال‌سازی مجدد این ماه</div><div className='text-lg font-black text-slate-900 dark:text-white mt-1'>{toFa(kpis.reactivation?.count || 0)} مشتری</div><div className='text-[11px] text-emerald-600 mt-1'>خروجی مستقیم رادار حفظ مشتری</div></div></Card>
      </div>

      {/* نمودارها */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* نمودار خطی */}
        <Card className='lg:col-span-2 p-4 sm:p-5'>
          <div className="flex items-center justify-between mb-4">
            <h3 className='text-sm font-bold text-slate-900 dark:text-white'>روند فروش ۶ ماه اخیر</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
              <TrendingUp className="w-3 h-3" />
              روند صعودی
            </span>
          </div>
          <div className='h-64 sm:h-72' dir='ltr'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={charts.salesTrend} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id='salesGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='#0EA5E9' stopOpacity={0.3} />
                    <stop offset='100%' stopColor='#0EA5E9' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke='#E2E8F0' strokeOpacity={0.5} />
                <XAxis dataKey='monthShort' tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => [formatRial(value), 'فروش']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type='monotone'
                  dataKey='total'
                  stroke='#0EA5E9'
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#0EA5E9' }}
                  activeDot={{ r: 7 }}
                  fill='url(#salesGradient)'
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* نمودار دایره‌ای */}
        <Card className='p-4 sm:p-5'>
          <h3 className='text-sm font-bold text-slate-900 dark:text-white mb-4'>دلایل باخت فروش</h3>
          {charts.lostReasons.length === 0 ? (
            <div className='h-64 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500'>داده‌ای وجود ندارد</div>
          ) : (
            <div className='h-64' dir='ltr'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={charts.lostReasons}
                    dataKey='count'
                    nameKey='reason'
                    cx='50%'
                    cy='50%'
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ reason, percent }) => `${REASON_LABELS[reason] || reason} ${Math.round(percent)}%`}
                    labelLine={false}
                  >
                    {charts.lostReasons.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [toFa(value), REASON_LABELS[name] || name]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── KPI Card ───
function KpiCard({ title, value, sub, trend, icon: Icon, color, isCash, isScore }) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400', valueColor: 'text-emerald-700 dark:text-emerald-300' },
    sky:     { bg: 'bg-sky-50 dark:bg-sky-900/30',         iconBg: 'bg-sky-100 dark:bg-sky-900/50',         iconColor: 'text-sky-600 dark:text-sky-400',     valueColor: 'text-sky-700 dark:text-sky-300' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-900/30',   iconBg: 'bg-violet-100 dark:bg-violet-900/50',   iconColor: 'text-violet-600 dark:text-violet-400', valueColor: 'text-violet-700 dark:text-violet-300' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/30',     iconBg: 'bg-amber-100 dark:bg-amber-900/50',     iconColor: 'text-amber-600 dark:text-amber-400', valueColor: 'text-amber-700 dark:text-amber-300' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <Card className={cn('p-4 sm:p-5 card-lift', c.bg)}>
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-xs text-slate-500 dark:text-slate-400 mb-1'>{title}</p>
          <p className={cn('text-2xl font-bold tnum', c.valueColor)}>{value}</p>
          <p className='text-xs text-slate-400 dark:text-slate-500 mt-1'>{sub}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.iconBg)}>
          {isCash ? (
            <DollarSign className={cn('w-5 h-5', c.iconColor)} />
          ) : isScore ? (
            <Star className={cn('w-5 h-5', c.iconColor)} />
          ) : (
            <Icon className={cn('w-5 h-5', c.iconColor)} />
          )}
        </div>
      </div>
      {trend !== null && trend !== undefined && (
        <div className={cn('flex items-center gap-1 mt-3 text-xs font-medium', trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
          {trend >= 0 ? <TrendingUp className='w-3.5 h-3.5' /> : <TrendingDown className='w-3.5 h-3.5' />}
          <span>{trend >= 0 ? `+${toFa(trend)}%` : `${toFa(trend)}%`} نسبت به ماه قبل</span>
        </div>
      )}
    </Card>
  );
}
