import { cn } from '../../utils/ui';

export default function ActionColumn({ title, icon: Icon, color, count, loading, children }) {
  return (
    <div className="flex flex-col bg-slate-50/50 dark:bg-surface-850 rounded-2xl border border-slate-100 dark:border-slate-800 min-h-[400px]">
      <div className={cn('flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800', color)}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        <span className={cn(
          'inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold transition-all',
          loading ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 animate-pulse' : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm'
        )}>
          {loading ? '...' : (count || 0).toLocaleString('fa-IR')}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[600px]">{children}</div>
    </div>
  );
}
