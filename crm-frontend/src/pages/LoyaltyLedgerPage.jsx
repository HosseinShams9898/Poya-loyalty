import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Search, ArrowDownLeft, ArrowUpRight, RotateCcw, Hourglass, Download } from 'lucide-react';
import { loyaltyAdminService } from '../api/api';
import { PageHeader } from '../components/common/Breadcrumbs';
import { Badge, Button, Card, SkeletonTable } from '../components/common/UI';
import { formatDateTime, toFa } from '../utils/ui';
import { showToast } from '../utils/toast';

const types = { 
  EARN: ['کسب', ArrowDownLeft, 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'], 
  REDEEM: ['مصرف', ArrowUpRight, 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'], 
  ADJUST: ['اصلاح', RotateCcw, 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'], 
  EXPIRE: ['انقضا', Hourglass, 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'], 
  REFUND: ['برگشت', RotateCcw, 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'] 
};

export default function LoyaltyLedgerPage() {
  const [items, setItems] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [query, setQuery] = useState(''); 
  const [filter, setFilter] = useState('ALL');
  const [exporting, setExporting] = useState(false);

  // ===== دریافت داده‌ها =====
  const fetchData = () => {
    setLoading(true);
    loyaltyAdminService.getTransactions()
      .then(r => {
        let data = Array.isArray(r?.data) ? r.data : (r?.data?.items || []);
        setItems(data);
      })
      .catch(err => {
        console.error('Error fetching transactions:', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  // ===== خروجی اکسل =====
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await loyaltyAdminService.exportLedger();
      
      if (response?.data instanceof Blob) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const url = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger-export-${dateStr}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('فایل اکسل با موفقیت دانلود شد');
      } else {
        showToast('خطا در دریافت فایل اکسل', 'error');
      }
    } catch (error) {
      console.error('Error exporting ledger:', error);
      showToast(error?.message || 'خطا در خروجی اکسل', 'error');
    } finally {
      setExporting(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter(i => {
      const typeMatch = filter === 'ALL' || i.type === filter;
      const queryMatch = !query || 
        i.customer?.fullName?.includes(query) || 
        i.customer?.company?.includes(query) || 
        i.description?.includes(query);
      return typeMatch && queryMatch;
    });
  }, [items, query, filter]);

  const earned = items.filter(i => Number(i.points) > 0).reduce((s, i) => s + Number(i.points), 0);
  const spent = Math.abs(items.filter(i => Number(i.points) < 0).reduce((s, i) => s + Number(i.points), 0));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="دفتر کل امتیاز" 
        subtitle="ردپای شفاف و حسابرسی‌پذیر همه تغییرات امتیاز" 
        icon={ScrollText} 
        actions={
          <Button 
            variant="secondary" 
            icon={Download} 
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'در حال خروجی...' : 'خروجی'}
          </Button>
        } 
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <Summary label="تراکنش نمایش‌داده‌شده" value={toFa(filtered.length)} tone="slate"/>
        <Summary label="امتیاز صادرشده" value={`+${toFa(earned)}`} tone="emerald"/>
        <Summary label="امتیاز مصرف‌شده" value={`-${toFa(spent)}`} tone="violet"/>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="جستجو عضو یا شرح تراکنش..." 
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[['ALL','همه'],['EARN','کسب'],['REDEEM','مصرف'],['ADJUST','اصلاح'],['EXPIRE','انقضا']].map(([v, l]) => (
              <button 
                key={v} 
                onClick={() => setFilter(v)} 
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${filter === v ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <SkeletonTable rows={6} cols={7}/>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  {['نوع','عضو','شرح','منبع','تغییر','مانده بعد','زمان'].map(h => (
                    <th key={h} className="p-4 text-right text-xs text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                      هیچ تراکنشی یافت نشد
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => {
                    const [label, Icon, color] = types[item.type] || types.ADJUST;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-4">
                          <Badge color={color}>
                            <Icon className="w-3 h-3"/>
                            {label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <b>{item.customer?.fullName || '—'}</b>
                          <div className="text-xs text-slate-400">{item.customer?.company}</div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="truncate">{item.description}</div>
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-mono" dir="ltr">
                          {item.sourceType || 'MANUAL'}
                        </td>
                        <td className={`p-4 text-base font-black ${Number(item.points) >= 0 ? 'text-emerald-600' : 'text-violet-600'}`}>
                          {Number(item.points) > 0 ? '+' : ''}{toFa(item.points)}
                        </td>
                        <td className="p-4 font-black">{toFa(item.balanceAfter)}</td>
                        <td className="p-4 text-xs text-slate-500">{formatDateTime(item.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Summary({ label, value, tone }) { 
  const c = { 
    slate: 'text-slate-900 dark:text-white', 
    emerald: 'text-emerald-600', 
    violet: 'text-violet-600' 
  }[tone]; 
  return (
    <Card className="p-4">
      <div className={`text-2xl font-black ${c}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </Card>
  );
}