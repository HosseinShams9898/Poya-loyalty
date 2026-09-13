import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, TrendingUp, CheckCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { invoiceService } from '../api/api';
import { showToast } from '../utils/toast';
import { Spinner, EmptyState, ErrorState, Badge, Card, Button, SkeletonTable } from '../components/common/UI';
import { PageHeader } from '../components/common/Breadcrumbs';
import { cn, toFa } from '../utils/ui';
import { toPersianDateTime } from '../utils/dateUtils';
import AddInvoiceModal from '../components/invoices/AddInvoiceModal';
import DeleteInvoiceModal from '../components/invoices/DeleteInvoiceModal';

const payTypeCfg = { 
  CASH: { label: 'نقدی', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' }, 
  CREDIT: { label: 'اعتباری', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' } 
};

const payStatusCfg = {
  PAID: { label: 'تسویه', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  PENDING: { label: 'در انتظار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
  OVERDUE: { label: 'سررسید', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500' },
};

const sourceCfg = {
  MANUAL: { label: 'دستی', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  SEPIDAR_API: { label: 'سپیدار', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true); 
    setError(null);
    try {
      const [invRes, statRes] = await Promise.all([
        invoiceService.list({ pageSize: 50 }),
        invoiceService.getStats(),
      ]);
      
      console.log('📊 Invoice response:', invRes);
      
      // پشتیبانی از هر دو ساختار { data: [] } و { data: { items: [] } }
      let invoicesData = [];
      if (Array.isArray(invRes?.data)) {
        invoicesData = invRes.data;
      } else if (invRes?.data?.items) {
        invoicesData = invRes.data.items;
      } else if (Array.isArray(invRes)) {
        invoicesData = invRes;
      }
      
      console.log('📊 Invoices count:', invoicesData.length);
      
      setInvoices(invoicesData);
      setStats(statRes?.data || null);
    } catch (e) { 
      console.error('خطا در دریافت فاکتورها:', e);
      setError(e.message); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = invoices.filter(inv =>
    !search || 
    inv.invoiceNumber?.includes(search) || 
    inv.customer?.fullName?.includes(search) ||
    inv.customerName?.includes(search)
  );

  // ===== ویرایش فاکتور =====
  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setEditModalOpen(true);
  };

  // ===== حذف فاکتور =====
  const handleDelete = (invoice) => {
    setSelectedInvoice(invoice);
    setDeleteModalOpen(true);
  };

  // ===== ویرایش فاکتور =====
  const handleUpdateInvoice = async (data) => {
    try {
      await invoiceService.update(selectedInvoice.id, data);
      await fetchInvoices();
      setEditModalOpen(false);
      setSelectedInvoice(null);
      showToast('فاکتور با موفقیت ویرایش شد');
    } catch (error) {
      console.error('خطا در ویرایش:', error);
      throw error;
    }
  };

  // ===== حذف فاکتور =====
  const handleDeleteInvoice = async () => {
    try {
      await invoiceService.remove(selectedInvoice.id);
      await fetchInvoices();
      setDeleteModalOpen(false);
      setSelectedInvoice(null);
      showToast('فاکتور با موفقیت حذف شد');
    } catch (error) {
      console.error('خطا در حذف:', error);
      showToast(error?.message || 'خطا در حذف فاکتور', 'error');
    }
  };

  const statCards = stats ? [
    { label: 'مجموع فاکتورها', value: toFa(stats.total?.count || stats.totalInvoices || 0), icon: FileText, color: 'brand' },
    { label: 'مبلغ کل (ریال)', value: toFa(stats.total?.amount || stats.totalAmount || 0), icon: TrendingUp, color: 'emerald' },
    { label: 'تسویه شده', value: toFa(stats.paid?.count || stats.paidInvoices || 0), icon: CheckCircle, color: 'sky' },
    { label: 'در انتظار', value: toFa(stats.pending?.count || stats.pendingInvoices || 0), icon: Clock, color: 'violet' },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="فاکتورها"
        subtitle="ثبت و مدیریت فاکتورهای فروش + محاسبه امتیاز"
        icon={FileText}
        actions={
          <Button onClick={() => setModalOpen(true)} icon={Plus}>
            ثبت فاکتور
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            const colorMap = {
              brand: { bg: 'bg-brand-50 dark:bg-brand-900/30', iconBg: 'bg-brand-100 dark:bg-brand-900/50', iconColor: 'text-brand-600 dark:text-brand-400' },
              emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400' },
              sky: { bg: 'bg-sky-50 dark:bg-sky-900/30', iconBg: 'bg-sky-100 dark:bg-sky-900/50', iconColor: 'text-sky-600 dark:text-sky-400' },
              violet: { bg: 'bg-violet-50 dark:bg-violet-900/30', iconBg: 'bg-violet-100 dark:bg-violet-900/50', iconColor: 'text-violet-600 dark:text-violet-400' },
            };
            const c = colorMap[s.color];
            return (
              <div key={i} className={cn('p-4 rounded-xl border border-slate-100 dark:border-slate-800 card-lift', c.bg)}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', c.iconBg)}>
                  <Icon className={cn('w-4.5 h-4.5', c.iconColor)} />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white tnum">{s.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</div>
              </div>
            );
          })}
        </div>
      )}

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو شماره فاکتور یا نام مشتری..."
            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>
      </Card>

      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchInvoices} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="فاکتوری یافت نشد"
          description="فاکتور جدید ثبت کنید یا فیلترها را تغییر دهید"
          action={<Button onClick={() => setModalOpen(true)} icon={Plus} variant="outline" size="sm">ثبت فاکتور</Button>}
        />
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">شماره</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">مشتری</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">مبلغ (ریال)</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">نوع</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">وضعیت</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">تاریخ</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.map(inv => {
                  const tc = payTypeCfg[inv.paymentType] || payTypeCfg.CASH;
                  const sc = payStatusCfg[inv.paymentStatus] || payStatusCfg.PENDING;
                  const customerName = inv.customer?.fullName || inv.customerName || '—';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs tnum text-slate-700 dark:text-slate-200">{inv.invoiceNumber || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{customerName}</td>
                      <td className="px-4 py-3 font-mono tnum text-slate-700 dark:text-slate-200">{toFa(inv.amount)}</td>
                      <td className="px-4 py-3"><Badge color={tc.color} dot={tc.dot}>{tc.label}</Badge></td>
                      <td className="px-4 py-3"><Badge color={sc.color} dot={sc.dot}>{sc.label}</Badge></td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{toPersianDateTime(inv.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(inv)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="ویرایش"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddInvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => fetchInvoices()}
      />

<AddInvoiceModal
  open={editModalOpen}
  mode="edit"
  invoice={selectedInvoice}
  onClose={() => { setEditModalOpen(false); setSelectedInvoice(null); }}
  onUpdated={handleUpdateInvoice}
/>

      <DeleteInvoiceModal
        open={deleteModalOpen}
        invoice={selectedInvoice}
        onClose={() => { setDeleteModalOpen(false); setSelectedInvoice(null); }}
        onConfirm={handleDeleteInvoice}
      />
    </div>
  );
}