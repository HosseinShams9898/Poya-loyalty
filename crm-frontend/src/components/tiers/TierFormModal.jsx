import { useState, useEffect } from 'react';
import { X, Crown, Plus } from 'lucide-react';
import { cn } from '../../utils/ui';
import { loyaltyAdminService } from '../../api/api';
import { showToast } from '../../utils/toast';

const AUDIENCE_TYPES = [
  { value: 'CONTRACTOR', label: 'پیمانکاران' },
  { value: 'REPRESENTATIVE', label: 'نمایندگان' },
  { value: 'ALL', label: 'همه' },
];

export default function TierFormModal({ open, onClose, onSuccess, tier = null }) {
  const isEdit = !!tier;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    audienceType: 'CONTRACTOR',
    description: '',
    color: '#64748B',
    minPoints: 0,
    multiplier: 1,
    benefits: [],
    sortOrder: 0,
  });
  const [benefitInput, setBenefitInput] = useState('');

  useEffect(() => {
    if (tier) {
      let benefits = [];
      try {
        benefits = typeof tier.benefits === 'string' ? JSON.parse(tier.benefits) : (tier.benefits || []);
      } catch {
        benefits = [];
      }
      setForm({
        code: tier.code || '',
        title: tier.title || '',
        audienceType: tier.audienceType || 'CONTRACTOR',
        description: tier.description || '',
        color: tier.color || '#64748B',
        minPoints: tier.minPoints || 0,
        multiplier: tier.multiplier || 1,
        benefits: benefits,
        sortOrder: tier.sortOrder || 0,
      });
    } else {
      setForm({
        code: '',
        title: '',
        audienceType: 'CONTRACTOR',
        description: '',
        color: '#64748B',
        minPoints: 0,
        multiplier: 1,
        benefits: [],
        sortOrder: 0,
      });
    }
    setBenefitInput('');
  }, [tier, open]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setForm(prev => ({
        ...prev,
        benefits: [...prev.benefits, benefitInput.trim()]
      }));
      setBenefitInput('');
    }
  };

  const removeBenefit = (index) => {
    setForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const isValid = form.code.trim() && form.title.trim() && form.minPoints >= 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        benefits: form.benefits,
        sortOrder: Number(form.sortOrder) || 0,
        minPoints: Number(form.minPoints) || 0,
        multiplier: Number(form.multiplier) || 1,
      };

      if (isEdit) {
        await loyaltyAdminService.updateTier(tier.id, payload);
        showToast('سطح با موفقیت ویرایش شد');
      } else {
        await loyaltyAdminService.createTier(payload);
        showToast('سطح جدید با موفقیت ایجاد شد');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'خطا در ذخیره سطح', 'error');
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
              <Crown className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEdit ? 'ویرایش سطح عضویت' : 'تعریف سطح جدید'}
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
                کد سطح <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={e => handleChange('code', e.target.value.toUpperCase())}
                placeholder="مثلاً GOLD"
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
                placeholder="مثلاً طلایی"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Audience Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نوع مخاطب</label>
            <select
              value={form.audienceType}
              onChange={e => handleChange('audienceType', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
            >
              {AUDIENCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
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

          {/* Min Points & Multiplier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                حداقل امتیاز <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.minPoints}
                onChange={e => handleChange('minPoints', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                ضریب امتیاز <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={form.multiplier}
                onChange={e => handleChange('multiplier', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                min="1"
                required
              />
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">ترتیب نمایش</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={e => handleChange('sortOrder', Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              dir="ltr"
              min="0"
            />
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">مزایا</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={benefitInput}
                onChange={e => setBenefitInput(e.target.value)}
                placeholder="مثلاً ۲۰٪ تخفیف حمل"
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
              />
              <button
                type="button"
                onClick={addBenefit}
                className="px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.benefits.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.benefits.map((benefit, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300"
                  >
                    {benefit}
                    <button
                      type="button"
                      onClick={() => removeBenefit(index)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              {loading ? 'در حال ذخیره...' : (isEdit ? 'ویرایش سطح' : 'ایجاد سطح')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}