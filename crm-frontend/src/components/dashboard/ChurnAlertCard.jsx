import { AlertTriangle, Clock } from 'lucide-react';
import { daysSince, customerStatusConfig, cn } from '../../utils/ui';

export default function ChurnAlertCard({ customer, onClick }) {
  const days = daysSince(customer.lastPurchaseDate || customer.createdAt);
  const statusCfg = customerStatusConfig[customer.status] || customerStatusConfig.ACTIVE;
  return (
    <button
      onClick={() => onClick?.(customer)}
      className={cn(
        'w-full text-right bg-white dark:bg-surface-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800',
        'hover:border-red-300 dark:hover:border-red-700 hover:shadow-card-hover dark:hover:shadow-lg',
        'transition-all duration-200 hover:translate-x-[-2px]',
        'border-r-4 border-r-red-400'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{customer.fullName}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate" dir="ltr">{customer.company || customer.mobile}</div>
        </div>
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', statusCfg.color)}>
          {statusCfg.label}
        </span>
      </div>
      {customer.daysSinceLast != null && (
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{customer.daysSinceLast.toLocaleString('fa-IR')} روز بدون خرید</span>
        </div>
      )}
      {customer.totalPurchase > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          خرید کل: <span className="font-mono font-semibold text-slate-900 dark:text-white">{Number(customer.totalPurchase).toLocaleString('fa-IR')}</span> ریال
        </div>
      )}
    </button>
  );
}
