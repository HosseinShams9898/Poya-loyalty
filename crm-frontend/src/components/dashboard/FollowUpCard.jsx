import { Phone, Calendar } from 'lucide-react';
import { daysUntil, cn } from '../../utils/ui';

export default function FollowUpCard({ interaction, onClick }) {
  const daysLeft = daysUntil(interaction.nextFollowUpDate);
  const isToday = daysLeft === 0;
  const isOverdue = daysLeft < 0;
  return (
    <button
      onClick={() => onClick?.(interaction)}
      className={cn(
        'w-full text-right bg-white dark:bg-surface-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800',
        'hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-card-hover dark:hover:shadow-lg',
        'transition-all duration-200 hover:translate-x-[-2px]',
        isOverdue && 'border-r-4 border-r-red-400'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
          <Phone className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{interaction.lead?.fullName || 'نامشخص'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate" dir="ltr">{interaction.lead?.mobile}</div>
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-2 leading-relaxed">{interaction.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium',
          isToday ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
          isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        )}>
          <Calendar className="w-3 h-3" />
          {isToday ? 'امروز' : isOverdue ? `${Math.abs(daysLeft).toLocaleString('fa-IR')} روز تأخیر` : `${daysLeft.toLocaleString('fa-IR')} روز دیگر`}
        </span>
        <span className="text-slate-400 dark:text-slate-500">
          {interaction.lead?.stage === 'INQUIRY' ? 'استعلام' : interaction.lead?.stage === 'CONSULTING' ? 'مشاوره' : interaction.lead?.stage === 'PROFORMA' ? 'پیش‌فاکتور' : interaction.lead?.stage === 'WON' ? 'موفق' : interaction.lead?.stage === 'LOST' ? 'ناموفق' : '—'}
        </span>
      </div>
    </button>
  );
}
