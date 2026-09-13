import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCircle, Star, Wallet, ChevronLeft } from 'lucide-react';
import { customerService } from '../api/api';
import { Spinner, EmptyState, ErrorState, Badge, Card, SkeletonCard } from '../components/common/UI';
import { PageHeader } from '../components/common/Breadcrumbs';
import { customerStatusConfig, cn, toFa } from '../utils/ui';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { pageSize: 50 };
      if (statusFilter) params.status = statusFilter;
      const r = await customerService.list(params);
      setCustomers(r?.data?.items || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = customers.filter(c =>
    !search || c.fullName?.includes(search) || c.mobile?.includes(search) || c.company?.includes(search)
  );

  const statusList = ['', 'ACTIVE', 'IN_RISK', 'CHURNED', 'NEW'];
  const statusCounts = statusList.reduce((acc, s) => {
    acc[s] = s ? customers.filter(c => c.status === s).length : customers.length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="مشتریان"
        subtitle="مدیریت مشتریان و وضعیت ریزش"
        icon={UserCircle}
      />

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو نام، موبایل، شرکت..."
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 flex-wrap mt-3">
          {statusList.map(s => {
            const cfg = s ? customerStatusConfig[s] : { label: 'همه', dot: 'bg-slate-400' };
            return (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                  statusFilter === s ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {s && <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />}
                {cfg.label}
                <span className={cn(
                  'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold',
                  statusFilter === s ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                )}>
                  {toFa(statusCounts[s] || 0)}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetch} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCircle} title="مشتری‌ای یافت نشد" description="فیلترها را تغییر دهید" />
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">مشتری</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">وضعیت</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">خرید کل</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">امتیاز</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">کیف پول</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.map(c => {
                  const sc = customerStatusConfig[c.status] || customerStatusConfig.ACTIVE;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{c.fullName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">{c.company || c.mobile} — {c.city}</div>
                      </td>
                      <td className="px-4 py-3"><Badge color={sc.color} dot={sc.dot}>{sc.label}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs tnum text-slate-700 dark:text-slate-200">{Number(c.totalPurchase).toLocaleString('fa-IR')} ریال</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs"><Star className="w-3 h-3 text-amber-500" />{toFa(c.totalPoints)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Wallet className="w-3 h-3" />{toFa(c.walletBalance)}</span>
                      </td>
                      <td className="px-4 py-3"><ChevronLeft className="w-4 h-4 text-slate-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(c => {
              const sc = customerStatusConfig[c.status] || customerStatusConfig.ACTIVE;
              return (
                <div key={c.id} className="p-4 space-y-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => navigate(`/customers/${c.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{c.fullName}</div>
                    <Badge color={sc.color} dot={sc.dot}>{sc.label}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">{c.company || c.mobile}</div>
                  <div className="flex gap-4 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300"><Star className="w-3 h-3 text-amber-500" />{toFa(c.totalPoints)} امتیاز</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Wallet className="w-3 h-3" />{toFa(c.walletBalance)} ریال</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
