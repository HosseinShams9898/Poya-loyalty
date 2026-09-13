import { useToasts } from '../../utils/toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../utils/ui';

// ════════════════════════════════════════════════════════════
// ToastContainer — نوتیفیکیشن‌های موقت با آیکون و انیمیشن بهتر
// ════════════════════════════════════════════════════════════
const TOAST_CONFIG = {
  success: { icon: CheckCircle, bg: 'bg-emerald-500', iconColor: 'text-white' },
  error: { icon: XCircle, bg: 'bg-red-500', iconColor: 'text-white' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500', iconColor: 'text-white' },
  info: { icon: Info, bg: 'bg-brand-500', iconColor: 'text-white' },
};

export default function ToastContainer() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none no-print">
      {toasts.map((t) => {
        const cfg = TOAST_CONFIG[t.type] || TOAST_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-up',
              'min-w-[280px] max-w-md',
              cfg.bg
            )}
          >
            <Icon className={cn('w-5 h-5 shrink-0', cfg.iconColor)} />
            <span className="flex-1">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
