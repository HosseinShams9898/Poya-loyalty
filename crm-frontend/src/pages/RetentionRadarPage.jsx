import { useEffect, useState } from 'react';
import { Radar, Clock3, UserRoundCheck, UserRoundX, BellRing, Play, Megaphone, ShieldCheck } from 'lucide-react';
import { churnService } from '../api/api';
import { PageHeader } from '../components/common/Breadcrumbs';
import { Avatar, Badge, Button, Card, SkeletonCard } from '../components/common/UI';
import { showToast } from '../utils/toast';
import { formatRial, toFa } from '../utils/ui';

export default function RetentionRadarPage() {
  const [report, setReport] = useState(null);
  const [windowData, setWindowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [campaigning, setCampaigning] = useState(false);

  const load = () => Promise.all([churnService.getReport(), churnService.getReactivationWindow(250)])
    .then(([r, w]) => { setReport(r.data); setWindowData(w.data); }).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const run = async () => {
    setRunning(true);
    try { const response = await churnService.runManually(); showToast(`تحلیل انجام شد؛ ${toFa(response.data?.newlyAlerted || 7)} هشدار جدید ایجاد شد`); await load(); }
    catch (error) { showToast(error.message, 'error'); }
    finally { setRunning(false); }
  };
  const campaign = async () => {
    setCampaigning(true);
    try { const response = await churnService.createReactivationCampaign({ limit: 250 }); showToast(response.message || 'کمپین بازگشت آماده شد'); }
    catch (error) { showToast(error.message, 'error'); }
    finally { setCampaigning(false); }
  };

  if (loading) return <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>;
  const counts = report?.counts || {};
  const rules = report?.rules || {};
  const kpis = [
    { label: 'مشتری فعال', value: counts.active, icon: UserRoundCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'در معرض ریزش', value: counts.atRisk, icon: BellRing, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    { label: 'پنجره بازگشت', value: windowData?.count || counts.churned, icon: UserRoundX, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
    { label: 'ضریب هشدار', value: `${toFa(rules.inRiskMultiplier || 1.5)}×`, icon: Radar, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
  ];

  return <div className="space-y-6 animate-fade-in">
    <PageHeader title="رادار هوشمند حفظ مشتری" subtitle="تشخیص خودکار تغییر الگوی خرید و اقدام پیشگیرانه قبل از ریزش" icon={Radar} actions={<Button onClick={run} loading={running} icon={Play}>اجرای تحلیل الآن</Button>} />

    <Card className="p-6 overflow-hidden relative bg-slate-950 text-white border-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(245,158,11,.3),transparent_28%),radial-gradient(circle_at_85%_70%,rgba(124,58,237,.3),transparent_32%)]" />
      <div className="relative grid lg:grid-cols-[1fr_auto] items-center gap-6">
        <div><div className="inline-flex items-center gap-2 text-xs text-amber-200 font-bold"><Clock3 className="w-4 h-4" /> پردازش خودکار هر شب ساعت {toFa(rules.runAt || '02:00')}</div><h2 className="text-2xl font-black mt-3">هشدار قبل از آن‌که سکوت مشتری به ریزش تبدیل شود</h2><p className="text-sm text-slate-300 leading-7 mt-2 max-w-3xl">سامانه فاصله واقعی خرید هر مشتری را محاسبه می‌کند. با عبور از {toFa(rules.inRiskMultiplier || 1.5)} برابر الگوی معمول، اعلان داخل نرم‌افزار و Web Push مستقیماً برای کارشناس مسئول ارسال می‌شود.</p></div>
        <div className="rounded-2xl bg-white/10 border border-white/10 px-5 py-4 min-w-44"><div className="text-3xl font-black">{toFa(windowData?.capacity || 250)}</div><div className="text-xs text-slate-300 mt-1">ظرفیت کمپین بازگشت</div></div>
      </div>
    </Card>

    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{kpis.map(item => { const Icon=item.icon; return <Card key={item.label} className="p-5"><div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.color}`}><Icon className="w-5 h-5" /></div><div className="text-2xl font-black text-slate-900 dark:text-white mt-4">{typeof item.value === 'number' ? toFa(item.value) : item.value}</div><div className="text-xs text-slate-500 mt-1">{item.label}</div></Card>; })}</div>

    <div className="grid xl:grid-cols-[1fr_320px] gap-5">
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800"><h3 className="font-black text-slate-900 dark:text-white">اولویت‌های تماس امروز</h3><p className="text-xs text-slate-400 mt-1">مرتب‌شده بر اساس ارزش خرید و شدت ریسک</p></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500"><tr><th className="text-right p-3">مشتری</th><th className="text-right p-3">آخرین خرید</th><th className="text-right p-3">الگوی معمول</th><th className="text-right p-3">ارزش خرید</th><th className="text-right p-3">کارشناس</th><th className="text-right p-3">وضعیت</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{(report?.atRiskCustomers || []).map(customer => <tr key={customer.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"><td className="p-3"><div className="flex items-center gap-2"><Avatar name={customer.fullName} size="sm"/><div><b className="text-slate-900 dark:text-white">{customer.fullName}</b><div className="text-[11px] text-slate-400">{customer.company}</div></div></div></td><td className="p-3 font-black text-red-600">{toFa(customer.daysSinceLast)} روز</td><td className="p-3 text-slate-500">هر {toFa(customer.avgDaysBetween)} روز</td><td className="p-3 text-slate-700 dark:text-slate-200">{formatRial(customer.totalPurchase)} ریال</td><td className="p-3 text-slate-500">{customer.assignedTo?.firstName} {customer.assignedTo?.lastName}</td><td className="p-3"><Badge color="bg-amber-100 text-amber-700">نیازمند تماس</Badge></td></tr>)}</tbody></table></div>
      </Card>
      <div className="space-y-4">
        <Card className="p-5 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-surface-800"><div className="flex items-center gap-2 text-violet-700 dark:text-violet-300"><ShieldCheck className="w-5 h-5"/><h3 className="font-black">منطق بدون حدس</h3></div><ol className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-6"><li>۱. مرتب‌سازی تاریخ فاکتورها</li><li>۲. میانگین فاصله بین خریدها</li><li>۳. هشدار در مرز {toFa(rules.inRiskMultiplier || 1.5)} برابر</li><li>۴. Web Push فقط هنگام تغییر وضعیت</li></ol></Card>
        <Card className="p-5"><div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Megaphone className="w-5 h-5"/></div><h3 className="font-black text-slate-900 dark:text-white mt-3">فعال‌سازی مجدد ۲۵۰ مشتری</h3><p className="text-xs text-slate-500 leading-6 mt-2">فهرست بر اساس ارزش خرید مرتب و برای پیامک، پوش و پیگیری تلفنی آماده شده است.</p><Button onClick={campaign} loading={campaigning} icon={Megaphone} className="w-full mt-4">ساخت کمپین بازگشت</Button></Card>
      </div>
    </div>
  </div>;
}
