import { useState, useEffect } from 'react';
import { X, UsersRound, Plus } from 'lucide-react';
import { cn } from '../../utils/ui';
import { loyaltyAdminService } from '../../api/api';
import { showToast } from '../../utils/toast';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'فعال' },
  { value: 'IN_RISK', label: 'در معرض ریزش' },
  { value: 'CHURNED', label: 'ریزش کرده' },
  { value: 'NEW', label: 'جدید' },
];

const MEMBER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'فعال' },
  { value: 'SUSPENDED', label: 'معلق' },
  { value: 'CLOSED', label: 'بسته شده' },
];

const CRITERIA_FIELDS = [
  { value: 'status', label: 'وضعیت مشتری', type: 'select', options: STATUS_OPTIONS },
  { value: 'memberStatus', label: 'وضعیت عضویت', type: 'select', options: MEMBER_STATUS_OPTIONS },
  { value: 'minLifetimePoints', label: 'حداقل امتیاز طول عمر', type: 'number' },
  { value: 'maxLifetimePoints', label: 'حداکثر امتیاز طول عمر', type: 'number' },
  { value: 'minTotalPurchase', label: 'حداقل مبلغ خرید (ریال)', type: 'number' },
  { value: 'maxDaysSinceLast', label: 'حداکثر روز از آخرین فعالیت', type: 'number' },
  { value: 'minInvoicesCount', label: 'حداقل تعداد فاکتور', type: 'number' },
  { value: 'maxInvoicesCount', label: 'حداکثر تعداد فاکتور', type: 'number' },
];

export default function SegmentFormModal({ open, onClose, onSuccess, segment = null }) {
  const isEdit = !!segment;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    color: '#0EA5E9',
    criteria: {},
    isDynamic: true,
  });

  useEffect(() => {
    if (segment) {
      // Parse کردن criteria از String به Object
      let criteria = {};
      try {
        criteria = typeof segment.criteria === 'string' 
          ? JSON.parse(segment.criteria) 
          : (segment.criteria || {});
      } catch {
        criteria = {};
      }

      setForm({
        code: segment.code || '',
        title: segment.title || '',
        description: segment.description || '',
        color: segment.color || '#0EA5E9',
        criteria: criteria,
        isDynamic: segment.isDynamic !== undefined ? segment.isDynamic : true,
      });
    } else {
      setForm({
        code: '',
        title: '',
        description: '',
        color: '#0EA5E9',
        criteria: {},
        isDynamic: true,
      });
    }
  }, [segment, open]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCriteriaChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      criteria: { ...prev.criteria, [field]: value }
    }));
  };

  const isValid = form.code.trim() && form.title.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const payload = {
        code: form.code,
        title: form.title,
        description: form.description,
        color: form.color,
        criteria: JSON.stringify(form.criteria),
        isDynamic: Boolean(form.isDynamic),
      };

      if (isEdit) {
        await loyaltyAdminService.updateSegment(segment.id, payload);
        showToast('بخش با موفقیت ویرایش شد');
      } else {
        await loyaltyAdminService.createSegment(payload);
        showToast('بخش جدید با موفقیت ایجاد شد');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'خطا در ذخیره بخش', 'error');
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
              <UsersRound className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEdit ? 'ویرایش بخش' : 'بخش جدید'}
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
                placeholder="مثلاً VIP"
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
                placeholder="مثلاً اعضای ویژه"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">توضیحات</label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="توضیحات بخش..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">رنگ</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={e => handleChange('color', e.target.value)}
                className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              />
              <input
                type="text"
                value={form.color}
                onChange={e => handleChange('color', e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
              />
            </div>
          </div>

          {/* Criteria */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">معیارهای بخش</label>
            <div className="space-y-2">
              {CRITERIA_FIELDS.map(cf => (
                <div key={cf.value} className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 w-1/3">{cf.label}</label>
                  {cf.type === 'select' ? (
                    <select
                      value={form.criteria[cf.value] || ''}
                      onChange={e => handleCriteriaChange(cf.value, e.target.value || undefined)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                    >
                      <option value="">انتخاب نشده</option>
                      {cf.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={form.criteria[cf.value] || ''}
                      onChange={e => handleCriteriaChange(cf.value, e.target.value ? Number(e.target.value) : undefined)}
                      placeholder={cf.label}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                      dir="ltr"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Is Dynamic */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isDynamic"
              checked={form.isDynamic}
              onChange={e => handleChange('isDynamic', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isDynamic" className="text-sm text-slate-700 dark:text-slate-300">
              بخش پویا (به‌روزرسانی خودکار)
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
              {loading ? 'در حال ذخیره...' : (isEdit ? 'ویرایش بخش' : 'ایجاد بخش')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}