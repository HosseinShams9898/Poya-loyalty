import { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, CalendarDays, Edit, Plus } from 'lucide-react';
import { cn } from '../../utils/ui';
import { customerService, invoiceService } from '../../api/api';
import { showToast } from '../../utils/toast';
import SimplePersianDatePicker from '../common/SimplePersianDatePicker';

export default function AddInvoiceModal({
  open,
  mode = 'add',
  invoice = null,
  onClose,
  onCreated,
  onUpdated,
}) {
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    invoiceNumber: '',
    amount: '',
    paymentType: 'CASH',
    paymentStatus: 'PAID',
    paymentDate: null,
    delayDays: 0,
    source: 'MANUAL',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  useEffect(() => {
    if (mode === 'edit' && invoice) {
      console.log('📝 Editing invoice:', invoice);
      
      let paymentDate = null;
      if (invoice.paymentDate) {
        paymentDate = new Date(invoice.paymentDate);
      }
      
      setForm({
        customerId: invoice.customerId || invoice.customer?.id || '',
        invoiceNumber: invoice.invoiceNumber || '',
        amount: invoice.amount ? String(invoice.amount) : '',
        paymentType: invoice.paymentType || 'CASH',
        paymentStatus: invoice.paymentStatus || 'PAID',
        paymentDate: paymentDate,
        delayDays: invoice.delayDays || 0,
        source: invoice.source || 'MANUAL',
      });
    } else if (mode === 'add') {
      setForm({
        customerId: '',
        invoiceNumber: '',
        amount: '',
        paymentType: 'CASH',
        paymentStatus: 'PAID',
        paymentDate: null,
        delayDays: 0,
        source: 'MANUAL',
      });
    }
  }, [mode, invoice, open]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await customerService.list({ pageSize: 100 });
      const customersData = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
      setCustomers(customersData);
    } catch (error) {
      console.error('خطا در دریافت مشتریان:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const totalPoints =
    Math.floor(Number(form.amount || 0) / 1000000) +
    (form.paymentType === 'CASH' ? 50 : 0) +
    (form.paymentStatus === 'PAID' && Number(form.delayDays || 0) === 0 ? 20 : 0);

  const isValid = form.customerId && form.amount && Number(form.amount) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      const payload = {
        customerId: form.customerId,
        invoiceNumber: form.invoiceNumber || undefined,
        amount: Number(form.amount),
        paymentType: form.paymentType,
        paymentStatus: form.paymentStatus,
        delayDays: Number(form.delayDays) || 0,
        source: 'MANUAL',
      };

      if (form.paymentStatus === 'PAID' && form.paymentDate) {
        const year = form.paymentDate.getFullYear();
        const month = String(form.paymentDate.getMonth() + 1).padStart(2, '0');
        const day = String(form.paymentDate.getDate()).padStart(2, '0');
        payload.paymentDate = `${year}-${month}-${day}`;
      }

      if (mode === 'edit') {
        await onUpdated(payload);
        showToast('فاکتور با موفقیت ویرایش شد');
      } else {
        const res = await invoiceService.create(payload);
        setResult(res?.data?.loyalty || { totalPoints });
        showToast('فاکتور با موفقیت ثبت شد');
        if (onCreated) onCreated(res);
      }
      onClose();
    } catch (err) {
      console.error(err);
      const msg = mode === 'edit' ? 'خطا در ویرایش فاکتور' : 'خطا در ثبت فاکتور';
      showToast(err?.message || msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = mode === 'edit';
  const Icon = isEdit ? Edit : Plus;
  const title = isEdit ? 'ویرایش فاکتور' : 'ثبت فاکتور دستی';
  const buttonText = isEdit ? 'ذخیره تغییرات' : 'ثبت فاکتور';
  const buttonColor = isEdit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-brand-600 hover:bg-brand-700';
  const iconBg = isEdit ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-brand-50 dark:bg-brand-900/30';
  const iconColor = isEdit ? 'text-blue-600 dark:text-blue-400' : 'text-brand-600 dark:text-brand-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">MANUAL</span>
                <span className="text-xs text-slate-400">منبع: ورود دستی</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Success State */}
        {result && !isEdit ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">فاکتور با موفقیت ثبت شد</h4>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
              {result.totalPoints?.toLocaleString('fa-IR') || totalPoints.toLocaleString('fa-IR')} امتیاز به مشتری اضافه شد
            </p>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">امتیاز خرید (هر ۱M ریال = ۱ امتیاز)</span>
                <span className="font-bold text-slate-900 dark:text-white">{Math.floor(Number(form.amount) / 1000000).toLocaleString('fa-IR')}</span>
              </div>
              {form.paymentType === 'CASH' && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">بن نقدی</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">+۵۰</span>
                </div>
              )}
              {form.paymentStatus === 'PAID' && Number(form.delayDays) === 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">خوش‌حسابی</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">+۲۰</span>
                </div>
              )}
              <div className="flex justify-between border-t border-emerald-200 dark:border-emerald-800/30 pt-2">
                <span className="font-bold text-slate-900 dark:text-white">مجموع امتیاز</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base">
                  {result.totalPoints?.toLocaleString('fa-IR') || totalPoints.toLocaleString('fa-IR')}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setResult(null); onClose(); }}
              className="mt-6 px-6 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >بستن</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                انتخاب مشتری <span className="text-red-500">*</span>
              </label>
              <select
                value={form.customerId}
                onChange={e => handleChange('customerId', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                disabled={loadingCustomers}
              >
                <option value="">انتخاب مشتری از لیست...</option>
                {loadingCustomers ? (
                  <option disabled>در حال بارگذاری...</option>
                ) : (
                  customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} {c.company ? `(${c.company})` : ''} - {c.mobile}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                شماره فاکتور
              </label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={e => handleChange('invoiceNumber', e.target.value)}
                placeholder="INV-1404-XXX"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                dir="ltr"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                مبلغ فاکتور (ریال) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={e => handleChange('amount', e.target.value)}
                placeholder="مثلاً ۴۵۰,۰۰۰,۰۰۰"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                dir="ltr"
              />
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">نوع پرداخت</label>
              <div className="flex gap-3">
                {[
                  { value: 'CASH', label: 'نقدی', desc: 'پرداخت در لحظه' },
                  { value: 'CREDIT', label: 'اعتباری', desc: 'پرداخت شرایطی' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex-1 cursor-pointer rounded-xl border-2 p-3 transition-all text-center',
                      form.paymentType === opt.value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={opt.value}
                      checked={form.paymentType === opt.value}
                      onChange={e => handleChange('paymentType', e.target.value)}
                      className="sr-only"
                    />
                    <div className={cn(
                      'text-sm font-bold',
                      form.paymentType === opt.value ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'
                    )}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                وضعیت تسویه
              </label>
              <select
                value={form.paymentStatus}
                onChange={e => handleChange('paymentStatus', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 dark:text-white"
              >
                <option value="PAID">تسویه شده</option>
                <option value="PENDING">در انتظار</option>
                <option value="OVERDUE">سررسید گذشته</option>
              </select>
            </div>

            {/* Payment Date - با SimplePersianDatePicker */}
            {form.paymentStatus === 'PAID' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" /> تاریخ پرداخت
                  </span>
                </label>
                <SimplePersianDatePicker
                  value={form.paymentDate}
                  onChange={(date) => handleChange('paymentDate', date)}
                  placeholder="انتخاب تاریخ پرداخت"
                />
              </div>
            )}

            {/* Delay Days */}
            {form.paymentStatus === 'OVERDUE' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">روزهای تأخیر</label>
                <input
                  type="number"
                  value={form.delayDays}
                  onChange={e => handleChange('delayDays', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white"
                  dir="ltr"
                />
              </div>
            )}

            {/* Points Preview */}
            {Number(form.amount) > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">پیش‌نمایش امتیاز وفاداری</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">امتیاز خرید</span>
                    <span className="font-medium text-slate-900 dark:text-white">{Math.floor(Number(form.amount) / 1000000).toLocaleString('fa-IR')}</span>
                  </div>
                  {form.paymentType === 'CASH' && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">بن نقدی</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">+۵۰</span>
                    </div>
                  )}
                  {form.paymentStatus === 'PAID' && Number(form.delayDays) === 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">خوش‌حسابی</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">+۲۰</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold">
                    <span className="text-slate-700 dark:text-slate-300">مجموع</span>
                    <span className="text-brand-700 dark:text-brand-400">{totalPoints.toLocaleString('fa-IR')} امتیاز</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!isValid || submitting}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors',
                  isValid ? buttonColor : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                )}
              >
                {submitting ? (isEdit ? 'در حال ویرایش...' : 'در حال ثبت...') : buttonText}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}