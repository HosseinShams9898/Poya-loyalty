import { useState, useEffect } from 'react';
import { X, Gift, Plus, Truck, Wallet, Package, Headphones, Zap, Gem } from 'lucide-react';
import { cn } from '../../utils/ui';
import { loyaltyAdminService } from '../../api/api';
import { showToast } from '../../utils/toast';

const ICON_OPTIONS = [
  { value: 'gift', label: 'هدیه', icon: Gift },
  { value: 'truck', label: 'حمل', icon: Truck },
  { value: 'wallet', label: 'کیف پول', icon: Wallet },
  { value: 'package', label: 'بسته', icon: Package },
  { value: 'headphones', label: 'پشتیبانی', icon: Headphones },
  { value: 'zap', label: 'اولویت', icon: Zap },
  { value: 'gem', label: 'ویژه', icon: Gem },
];

const FULFILLMENT_MODES = [
  { value: 'MANUAL', label: 'دستی' },
  { value: 'COUPON', label: 'کد تخفیف' },
  { value: 'WALLET', label: 'کیف پول' },
];

const REWARD_TYPES = [
  { value: 'CREDIT', label: 'اعتبار' },
  { value: 'DISCOUNT', label: 'تخفیف' },
  { value: 'SERVICE', label: 'خدمات' },
  { value: 'GIFT', label: 'هدیه' },
  { value: 'SHIPPING', label: 'حمل' },
  { value: 'EXPERIENCE', label: 'تجربه' },
];

export default function RewardFormModal({ open, onClose, onSuccess, reward = null, tiers = [] }) {
  const isEdit = !!reward;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    type: 'GIFT',
    costPoints: 0,
    cashValue: '',
    stock: '',
    imageIcon: 'gift',
    eligibleTierId: '',
    validityDays: 30,
    fulfillmentMode: 'MANUAL',
    isFeatured: false,
  });

  useEffect(() => {
    if (reward) {
      setForm({
        code: reward.code || '',
        title: reward.title || '',
        description: reward.description || '',
        type: reward.type || 'GIFT',
        costPoints: reward.costPoints || 0,
        cashValue: reward.cashValue || '',
        stock: reward.stock !== null && reward.stock !== undefined ? String(reward.stock) : '',
        imageIcon: reward.imageIcon || 'gift',
        eligibleTierId: reward.eligibleTierId || '',
        validityDays: reward.validityDays || 30,
        fulfillmentMode: reward.fulfillmentMode || 'MANUAL',
        isFeatured: reward.isFeatured || false,
      });
    } else {
      setForm({
        code: '',
        title: '',
        description: '',
        type: 'GIFT',
        costPoints: 0,
        cashValue: '',
        stock: '',
        imageIcon: 'gift',
        eligibleTierId: '',
        validityDays: 30,
        fulfillmentMode: 'MANUAL',
        isFeatured: false,
      });
    }
  }, [reward, open]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isValid = form.code.trim() && form.title.trim() && form.costPoints > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        costPoints: Number(form.costPoints),
        cashValue: form.cashValue ? Number(form.cashValue) : null,
        stock: form.stock ? Number(form.stock) : null,
        validityDays: Number(form.validityDays) || 30,
      };

      if (isEdit) {
        await loyaltyAdminService.updateReward(reward.id, payload);
        showToast('پاداش با موفقیت ویرایش شد');
      } else {
        await loyaltyAdminService.createReward(payload);
        showToast('پاداش جدید با موفقیت ایجاد شد');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'خطا در ذخیره پاداش', 'error');
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
              <Gift className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEdit ? 'ویرایش پاداش' : 'پاداش جدید'}
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
                placeholder="مثلاً SHIP-50"
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
                placeholder="مثلاً تخفیف حمل"
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
              placeholder="توضیحات کامل پاداش..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Type & Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نوع</label>
              <select
                value={form.type}
                onChange={e => handleChange('type', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              >
                {REWARD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">آیکون</label>
              <select
                value={form.imageIcon}
                onChange={e => handleChange('imageIcon', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              >
                {ICON_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cost Points & Cash Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                امتیاز مورد نیاز <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.costPoints}
                onChange={e => handleChange('costPoints', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">ارزش ریالی</label>
              <input
                type="number"
                value={form.cashValue}
                onChange={e => handleChange('cashValue', e.target.value)}
                placeholder="مثلاً ۲۵۰۰۰۰۰"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
              />
            </div>
          </div>

          {/* Stock & Validity Days */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">موجودی</label>
              <input
                type="number"
                value={form.stock}
                onChange={e => handleChange('stock', e.target.value)}
                placeholder="خالی = نامحدود"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">اعتبار (روز)</label>
              <input
                type="number"
                value={form.validityDays}
                onChange={e => handleChange('validityDays', Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
                dir="ltr"
                min="1"
                required
              />
            </div>
          </div>

          {/* Eligible Tier & Fulfillment Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">سطح مورد نیاز</label>
              <select
                value={form.eligibleTierId}
                onChange={e => handleChange('eligibleTierId', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              >
                <option value="">همه سطوح</option>
                {tiers.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نوع تحویل</label>
              <select
                value={form.fulfillmentMode}
                onChange={e => handleChange('fulfillmentMode', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              >
                {FULFILLMENT_MODES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFeatured"
              checked={form.isFeatured}
              onChange={e => handleChange('isFeatured', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isFeatured" className="text-sm text-slate-700 dark:text-slate-300">
              پاداش ویژه (نمایش در بالای لیست)
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
              {loading ? 'در حال ذخیره...' : (isEdit ? 'ویرایش پاداش' : 'ایجاد پاداش')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}