// ════════════════════════════════════════════════════════════
// Skeleton — بارگذاری تدریجی بهتر از spinner
// ════════════════════════════════════════════════════════════
import { cn } from '../../utils/ui';

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn('bg-white dark:bg-surface-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800', className)}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-3 border-b border-slate-50 dark:border-slate-800/50 flex gap-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Spinner — برای حالت‌های فشرده
// ════════════════════════════════════════════════════════════
export function Spinner({ className, size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn('border-3 border-slate-200 dark:border-slate-700 border-t-brand-500 rounded-full animate-spin', sizes[size])}></div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// EmptyState — نسخه بهبودیافته با CTA و illustration
// ════════════════════════════════════════════════════════════
export function EmptyState({ icon: Icon, title, description, action, illustration }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      {illustration || (Icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-brand-100 dark:bg-brand-900/30 rounded-full blur-xl opacity-50"></div>
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
            <Icon className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
        </div>
      ))}
      <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ErrorState
// ════════════════════════════════════════════════════════════
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-3">
        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm text-red-600 dark:text-red-400 mb-3 font-medium">{message || 'خطا در دریافت اطلاعات'}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium px-4 py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors">
          تلاش مجدد
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Badge — با dot indicator اختیاری
// ════════════════════════════════════════════════════════════
export function Badge({ children, color = 'bg-slate-100 text-slate-700', dot, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', color, className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// Card — با variants
// ════════════════════════════════════════════════════════════
export function Card({ children, className, hover = false, padded = false }) {
  return (
    <div className={cn(
      'bg-white dark:bg-surface-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-800',
      hover && 'card-lift hover:shadow-card-hover cursor-pointer',
      padded && 'p-5',
      className,
    )}>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Avatar — با gradient color بر اساس نام
// ════════════════════════════════════════════════════════════
import { getInitials, getAvatarColor } from '../../utils/ui';

export function Avatar({ name = '', size = 'md', className }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };
  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shrink-0',
      getAvatarColor(name),
      sizes[size],
      className,
    )}>
      {getInitials(name) || '؟'}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Button — با variants و sizes
// ════════════════════════════════════════════════════════════
export function Button({ children, variant = 'primary', size = 'md', className, icon: Icon, loading, ...props }) {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
    secondary: 'bg-white dark:bg-surface-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700',
    ghost: 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm',
    outline: 'border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
    xl: 'px-6 py-3 text-base gap-2',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      ) : null}
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// StatCard — KPI کارت با trend
// ════════════════════════════════════════════════════════════
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({ title, value, sub, icon: Icon, color = 'brand', trend, trendLabel = 'نسبت به ماه قبل', className }) {
  const colorMap = {
    brand: { bg: 'bg-brand-50 dark:bg-brand-900/30', iconBg: 'bg-brand-100 dark:bg-brand-900/50', iconColor: 'text-brand-600 dark:text-brand-400', valueColor: 'text-slate-900 dark:text-white' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400', valueColor: 'text-slate-900 dark:text-white' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600 dark:text-amber-400', valueColor: 'text-slate-900 dark:text-white' },
    red: { bg: 'bg-red-50 dark:bg-red-900/30', iconBg: 'bg-red-100 dark:bg-red-900/50', iconColor: 'text-red-600 dark:text-red-400', valueColor: 'text-slate-900 dark:text-white' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/30', iconBg: 'bg-violet-100 dark:bg-violet-900/50', iconColor: 'text-violet-600 dark:text-violet-400', valueColor: 'text-slate-900 dark:text-white' },
    sky: { bg: 'bg-sky-50 dark:bg-sky-900/30', iconBg: 'bg-sky-100 dark:bg-sky-900/50', iconColor: 'text-sky-600 dark:text-sky-400', valueColor: 'text-slate-900 dark:text-white' },
  };
  const c = colorMap[color] || colorMap.brand;

  return (
    <div className={cn('rounded-xl p-4 border border-slate-100 dark:border-slate-800 card-lift', c.bg, className)}>
      <div className="flex items-start justify-between mb-2">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.iconBg)}>
          {Icon && <Icon className={cn('w-5 h-5', c.iconColor)} />}
        </div>
        {trend !== null && trend !== undefined && (
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold',
            trend >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
          )}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toLocaleString('fa-IR')}٪
          </span>
        )}
      </div>
      <p className={cn('text-2xl font-bold tnum', c.valueColor)}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{title}</p>
      {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      {trend !== null && trend !== undefined && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">{trendLabel}</p>
      )}
    </div>
  );
}
