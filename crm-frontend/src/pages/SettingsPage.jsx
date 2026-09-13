import { useState, useEffect } from 'react';
import { Save, RotateCcw, Settings, Gift, CheckCircle, Loader2, Info } from 'lucide-react';
import { settingsService } from '../api/api';
import { cn, toFa, formatRial } from '../utils/ui';
import { Card } from '../components/common/UI';
import { PageHeader } from '../components/common/Breadcrumbs';
import { showToast } from '../utils/toast';

// ─── فیلدهای تنظیمات ───
const FIELDS = [
  {
    key: 'purchaseRialPerPoint',
    label: 'ریال خرید به ازای هر ۱ امتیاز',
    hint: 'هر چند ریال خرید = ۱ امتیاز. مثلاً ۱,۰۰۰,۰۰۰',
    type: 'currency',
  },
  {
    key: 'cashBonusPoints',
    label: 'امتیاز اضافه خرید نقدی',
    hint: 'امتیاز ثابت اضافه هنگام پرداخت نقدی',
    type: 'number',
  },
  {
    key: 'financialBonusPoints',
    label: 'امتیاز اضافه پرداخت سر وقت',
    hint: 'امتیاز ثابت هنگام تسویه بدون تاخیر',
    type: 'number',
  },
  {
    key: 'walletConversionThreshold',
    label: 'حداقل امتیاز برای تبدیل',
    hint: 'حداقل امتیاز برای تبدیل به ریال در کیف پول',
    type: 'number',
  },
  {
    key: 'walletRialPerConversion',
    label: 'ریال به ازای هر تبدیل',
    hint: 'مبلغ ریالی به ازای هر بار تبدیل امتیاز',
    type: 'currency',
  },
  {
    key: 'projectReferralPoints',
    label: 'امتیاز معرفی پروژه تأییدشده',
    hint: 'پس از تأیید پروژه ثبت‌شده در پرتال نماینده',
    type: 'number',
  },
];

export default function SettingsPage() {
  const [form, setForm] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // بارگذاری تنظیمات
  useEffect(() => {
    (async () => {
      try {
        const res = await settingsService.getLoyalty();
        const data = res.data || {};
        setForm(data);
        setOriginal(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  // تشخیص تغییر
  useEffect(() => {
    setDirty(JSON.stringify(form) !== JSON.stringify(original));
  }, [form, original]);

  // ذخیره
  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateLoyalty(form);
      setOriginal({ ...form });
      showToast('تنظیمات با موفقیت ذخیره شد', 'success');
    } catch {
      showToast('خطا در ذخیره تنظیمات', 'error');
    }
    setSaving(false);
  };

  // بازنشانی
   const handleReset = () => {
    setForm({ ...original });
  };

  // تغییر فیلد
  const handleChange = (key, value) => {
    const num = value === '' ? 0 : parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(num) && num >= 0) {
      setForm((f) => ({ ...f, [key]: num }));
    }
  };

  const formatValue = (key, value) => {
    if (value == null) return '';
    const field = FIELDS.find((f) => f.key === key);
    return field?.type === 'currency' ? toFa(value.toLocaleString()) : toFa(value);
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Loader2 className='w-6 h-6 text-brand-500 animate-spin' />
      </div>
    );
  }

  return (
    <div className='max-w-3xl mx-auto space-y-6 animate-fade-in'>
      <PageHeader
        title="تنظیمات قوانین امتیازدهی"
        subtitle="تغییر ضرایب بدون نیاز به برنامه‌نویس"
        icon={Settings}
      />

      {/* هشدار */}
      <div className='flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl'>
        <Info className='w-5 h-5 text-amber-500 shrink-0 mt-0.5' />
        <div className='text-sm text-amber-800 dark:text-amber-300 leading-relaxed'>
          <strong>توجه:</strong> تغییر این مقادیر بلافاصله اعمال می‌شود و روی محاسبه امتیاز تمام فاکتورهای جدید تاثیر می‌گذارد. فاکتورهای قبلی تغییر نمی‌کنند.
        </div>
      </div>

      {/* کارت‌های فیلدها */}
      <div className='space-y-4'>
        {FIELDS.map((field) => {
          const changed = form[field.key] !== original[field.key];
          return (
            <Card key={field.key} className={cn('p-4 sm:p-5 transition-all', changed && 'ring-2 ring-brand-500/30 border-brand-300 dark:border-brand-700')}>
              <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
                <div className='flex-1 min-w-0'>
                  <label className='text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2'>
                    {field.label}
                    {changed && <span className='px-1.5 py-0.5 text-[10px] bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 rounded-md font-bold'>تغییر</span>}
                  </label>
                  <p className='text-xs text-slate-400 dark:text-slate-500 mt-0.5'>{field.hint}</p>
                </div>

                <div className='relative w-full sm:w-48'>
                  {field.type === 'currency' && (
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none'>ریال</span>
                  )}
                  <input
                    type='text'
                    inputMode='numeric'
                    value={formatValue(field.key, form[field.key])}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl border text-left text-sm font-mono transition-all text-slate-900 dark:text-white',
                      changed
                        ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-900/20 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400'
                    )}
                    dir='ltr'
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* پیش‌نمایش محاسبه */}
      <Card className='p-5 bg-gradient-to-l from-brand-50 to-sky-50 dark:from-brand-900/30 dark:to-sky-900/30 border-brand-200 dark:border-brand-800'>
        <div className='flex items-center gap-2 mb-4'>
          <Gift className='w-5 h-5 text-brand-600 dark:text-brand-400' />
          <h3 className='text-sm font-bold text-slate-900 dark:text-white'>پیش‌نمایش محاسبه امتیاز</h3>
        </div>
        <div className='bg-white dark:bg-surface-800 rounded-xl p-4 space-y-3 text-sm'>
          <ExampleCalc form={form} />
        </div>
      </Card>

      {/* دکمه‌ها */}
      <div className='flex items-center gap-3 pt-2'>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all',
            saving || !dirty
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25'
          )}
        >
          {saving ? <Loader2 className='w-4 h-4 animate-spin' /> : <Save className='w-4 h-4' />}
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
        {dirty && (
          <button
            onClick={handleReset}
            className='flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
          >
            <RotateCcw className='w-4 h-4' />
            بازنشانی
          </button>
        )}
      </div>
    </div>
  );
}

// ─── کامپوننت پیش‌نمایش ───
function ExampleCalc({ form }) {
  const rial = 500000000; // ۵۰۰ میلیون
  const purchasePoints = Math.floor(rial / (form.purchaseRialPerPoint || 1000000));
  const cashBonus = form.cashBonusPoints || 0;
  const financialBonus = form.financialBonusPoints || 0;
  const total = purchasePoints + cashBonus + financialBonus;

  return (
    <>
      <p className='text-slate-500 dark:text-slate-400 mb-2'>فرض: فاکتور <span className='font-bold text-slate-700 dark:text-slate-200'>{toFa(formatRial(rial))} ریال</span> — نقدی — بدون تاخیر</p>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <CalcItem label='امتیاز خرید' value={toFa(purchasePoints)} color='text-slate-700 dark:text-slate-200' />
        <CalcItem label='بونوس نقدی' value={`+${toFa(cashBonus)}`} color='text-emerald-600 dark:text-emerald-400' />
        <CalcItem label='بونوس سر وقت' value={`+${toFa(financialBonus)}`} color='text-blue-600 dark:text-blue-400' />
        <CalcItem label='مجموع' value={toFa(total)} color='text-brand-600 dark:text-brand-400' bold />
      </div>
    </>
  );
}

function CalcItem({ label, value, color, bold }) {
  return (
    <div className='text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800'>
      <div className={cn('text-lg font-mono', color, bold && 'font-bold')}>{value}</div>
      <div className='text-[10px] text-slate-400 dark:text-slate-500 mt-0.5'>{label}</div>
    </div>
  );
}
