import { useState, useEffect } from 'react';
import { X, Target, Plus } from 'lucide-react';
import { cn } from '../../utils/ui';
import { loyaltyAdminService } from '../../api/api';
import { showToast } from '../../utils/toast';

const ACTION_TYPES = [
  { value: 'PURCHASE_COUNT', label: 'تعداد خرید' },
  { value: 'PURCHASE_AMOUNT', label: 'مبلغ خرید' },
  { value: 'REFERRAL', label: 'معرفی' },
  { value: 'PROFILE', label: 'تکمیل پروفایل' },
];

export default function MissionFormModal({ open, onClose, onSuccess, mission = null }) {
  const isEdit = !!mission;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    actionType: 'PURCHASE_COUNT',
    targetValue: 1,
    rewardPoints: 0,
    badge: '',
    isActive: true,
  });

  useEffect(() => {
    if (mission) {
      setForm({
        code: mission.code || '',
        title: mission.title || '',
        description: mission.description || '',
        actionType: mission.actionType || 'PURCHASE_COUNT',
        targetValue: mission.targetValue || 1,
        rewardPoints: mission.rewardPoints || 0,
        badge: mission.badge || '',
        isActive: mission.isActive !== undefined ? mission.isActive : true,
      });
    } else {
      setForm({
        code: '',
        title: '',
        description: '',
        actionType: 'PURCHASE_COUNT',
        targetValue: 1,
        rewardPoints: 0,
        badge: '',
        isActive: true,
      });
    }
  }, [mission, open]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isValid = form.code.trim() && form.title.trim() && form.targetValue > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        targetValue: Number(form.targetValue),
        rewardPoints: Number(form.rewardPoints) || 0,
        isActive: Boolean(form.isActive),
      };

      if (isEdit) {
        await loyaltyAdminService.updateMission(mission.id, payload);
        showToast('مأموریت با موفقیت ویرایش شد');
      } else {
        await loyaltyAdminService.createMission(payload);
        showToast('مأموریت جدید با موفقیت ایجاد شد');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'خطا در ذخیره مأموریت', 'error');
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
              <Target className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEdit ? 'ویرایش مأموریت' : 'مأموریت جدید'}
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
                placeholder="مثلاً THREE-PURCHASES"
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
                placeholder="مثلاً سه خرید پیاپی"
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
              placeholder="توضیحات کامل مأموریت..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              نوع عمل <span className="text-red-500">*</span>
            </label>
            <select
              value={form.actionType}
              onChange={e => handleChange('actionType', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
            >
              {ACTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Target Value & Reward Points */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                مقدار هدف <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.targetValue}
                onChange={e => handleChange('targetValue', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                امتیاز پاداش <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.rewardPoints}
                onChange={e => handleChange('rewardPoints', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                min="0"
                required
              />
            </div>
          </div>

          {/* Badge */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نشان (Badge)</label>
            <input
              type="text"
              value={form.badge}
              onChange={e => handleChange('badge', e.target.value)}
              placeholder="مثلاً repeat, target, users"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              dir="ltr"
            />
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
              {loading ? 'در حال ذخیره...' : (isEdit ? 'ویرایش مأموریت' : 'ایجاد مأموریت')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}