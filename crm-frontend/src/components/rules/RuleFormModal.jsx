import { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Plus } from 'lucide-react';
import { cn } from '../../utils/ui';
import { loyaltyAdminService } from '../../api/api';
import { showToast } from '../../utils/toast';

const EVENT_TYPES = [
  { value: 'PURCHASE', label: 'خرید' },
  { value: 'INVOICE_PAID', label: 'پرداخت فاکتور' },
  { value: 'TIER_CHANGED', label: 'تغییر سطح' },
  { value: 'REFERRAL', label: 'معرفی' },
];

const ACTION_TYPES = [
  { value: 'POINTS_FIXED', label: 'امتیاز ثابت' },
  { value: 'POINTS_PER_AMOUNT', label: 'امتیاز به ازای مبلغ' },
  { value: 'MULTIPLIER', label: 'ضریب' },
  { value: 'CASHBACK_PERCENT', label: 'کش‌بک درصدی' },
];

export default function RuleFormModal({ open, onClose, onSuccess, rule = null }) {
  const isEdit = !!rule;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    eventType: 'PURCHASE',
    conditions: {},
    action: { type: 'POINTS_FIXED', value: 10 },
    priority: 100,
    stackable: true,
    isActive: true,
  });

  useEffect(() => {
    if (rule) {
      // Parse کردن conditions و action از String به Object
      let conditions = {};
      let action = {};
      try {
        conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : (rule.conditions || {});
      } catch {
        conditions = {};
      }
      try {
        action = typeof rule.action === 'string' ? JSON.parse(rule.action) : (rule.action || {});
      } catch {
        action = {};
      }
  
      setForm({
        code: rule.code || '',
        title: rule.title || '',
        description: rule.description || '',
        eventType: rule.eventType || 'PURCHASE',
        conditions: conditions,
        action: action,
        priority: rule.priority || 100,
        stackable: rule.stackable !== undefined ? rule.stackable : true,
        isActive: rule.isActive !== undefined ? rule.isActive : true,
      });
    } else {
      setForm({
        code: '',
        title: '',
        description: '',
        eventType: 'PURCHASE',
        conditions: {},
        action: { type: 'POINTS_FIXED', value: 10 },
        priority: 100,
        stackable: true,
        isActive: true,
      });
    }
  }, [rule, open]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleActionChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      action: { ...prev.action, [field]: value }
    }));
  };

  const handleConditionChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      conditions: { ...prev.conditions, [field]: value }
    }));
  };

  const isValid = form.code.trim() && form.title.trim() && form.eventType;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        priority: Number(form.priority) || 100,
        stackable: Boolean(form.stackable),
        isActive: Boolean(form.isActive),
      };

      if (isEdit) {
        await loyaltyAdminService.updateRule(rule.id, payload);
        showToast('قانون با موفقیت ویرایش شد');
      } else {
        await loyaltyAdminService.createRule(payload);
        showToast('قانون جدید با موفقیت ایجاد شد');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'خطا در ذخیره قانون', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEdit ? 'ویرایش قانون' : 'قانون جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Code & Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                کد <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={e => handleChange('code', e.target.value.toUpperCase())}
                placeholder="مثلاً HIGH_VALUE"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                عنوان <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="مثلاً بونوس خرید عمده"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">توضیحات</label>
            <input
              type="text"
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="توضیحات مختصر..."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              نوع رویداد <span className="text-red-500">*</span>
            </label>
            <select
              value={form.eventType}
              onChange={e => handleChange('eventType', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Conditions */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">شرایط (اختیاری)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={form.conditions.minAmount || ''}
                onChange={e => handleConditionChange('minAmount', e.target.value)}
                placeholder="حداقل مبلغ (ریال)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
              />
              <select
                value={form.conditions.paymentType || ''}
                onChange={e => handleConditionChange('paymentType', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              >
                <option value="">همه نوع پرداخت</option>
                <option value="CASH">نقدی</option>
                <option value="CREDIT">اعتباری</option>
              </select>
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              نوع پاداش <span className="text-red-500">*</span>
            </label>
            <select
              value={form.action.type}
              onChange={e => handleActionChange('type', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
            >
              {ACTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Action Value */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              مقدار <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.action.value || ''}
              onChange={e => handleActionChange('value', Number(e.target.value))}
              placeholder="مثلاً ۱۰"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              dir="ltr"
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* Priority & Stackable */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                اولویت <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.priority}
                onChange={e => handleChange('priority', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">قابل تجمیع</label>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => handleChange('stackable', true)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    form.stackable ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  بله
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('stackable', false)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    !form.stackable ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  خیر
                </button>
              </div>
            </div>
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={e => handleChange('isActive', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
              فعال
            </label>
          </div>

          {/* Actions */}
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
              disabled={!isValid || loading}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors',
                isValid ? 'bg-brand-600 hover:bg-brand-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              {loading ? 'در حال ذخیره...' : (isEdit ? 'ویرایش قانون' : 'ایجاد قانون')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}