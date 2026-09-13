import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../utils/ui';

// ════════════════════════════════════════════════════════════
// ConfirmDialog — برای عملیات‌های مخرب (حذف، غیرفعال‌سازی، ...)
// ════════════════════════════════════════════════════════════
export default function ConfirmDialog({
  open,
  title = 'تایید عملیات',
  message,
  confirmText = 'تایید',
  cancelText = 'انصراف',
  variant = 'danger', // danger | primary | warning
  onConfirm,
  onCancel,
  icon: Icon = AlertTriangle,
}) {
  // Escape for close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const variantConfig = {
    danger: { iconBg: 'bg-red-100 dark:bg-red-900/40', iconColor: 'text-red-600 dark:text-red-400', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', btn: 'bg-amber-600 hover:bg-amber-700' },
    primary: { iconBg: 'bg-brand-100 dark:bg-brand-900/40', iconColor: 'text-brand-600 dark:text-brand-400', btn: 'bg-brand-600 hover:bg-brand-700' },
  };
  const c = variantConfig[variant];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <button onClick={onCancel} className="absolute top-3 left-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', c.iconBg)}>
            <Icon className={cn('w-6 h-6', c.iconColor)} />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors shadow-sm', c.btn)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
