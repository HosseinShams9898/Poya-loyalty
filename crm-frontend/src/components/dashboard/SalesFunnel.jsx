import { useMemo } from 'react';
import { cn, toFa } from '../../utils/ui';

// ════════════════════════════════════════════════════════════
// SalesFunnel — نمودار قیف فروش بصری
// ورودی: [{ stage: 'INQUIRY', count: 12 }, ...]
// ════════════════════════════════════════════════════════════
const STAGE_META = [
  { stage: 'INQUIRY', label: 'استعلام', color: 'bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300' },
  { stage: 'CONSULTING', label: 'مشاوره', color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  { stage: 'PROFORMA', label: 'پیش‌فاکتور', color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  { stage: 'WON', label: 'موفق', color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
];

export default function SalesFunnel({ data = [], loading = false }) {
  // آماده‌سازی داده‌ها — اطمینان از وجود تمام مراحل
  const stages = useMemo(() => {
    return STAGE_META.map(meta => {
      const item = data.find(d => d.stage === meta.stage) || { stage: meta.stage, count: 0 };
      return { ...meta, count: item.count || 0 };
    });
  }, [data]);

  const total = stages.reduce((sum, s) => sum + s.count, 0);
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  if (loading) {
    return (
      <div className="space-y-3">
        {STAGE_META.map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const widthPct = total > 0 ? (s.count / maxCount) * 100 : 0;
        const conversionRate = i > 0 && stages[i - 1].count > 0
          ? Math.round((s.count / stages[i - 1].count) * 100)
          : null;
        const dropoff = i > 0 && stages[i - 1].count > 0
          ? Math.round(((stages[i - 1].count - s.count) / stages[i - 1].count) * 100)
          : null;

        return (
          <div key={s.stage} className="group">
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', s.color)} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{s.label}</span>
                {conversionRate !== null && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    ({conversionRate > 0 ? '+' : ''}{toFa(conversionRate)}٪)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold tnum', s.text)}>{toFa(s.count)}</span>
                {total > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 tnum">
                    ({toFa(Math.round((s.count / total) * 100))}٪)
                  </span>
                )}
              </div>
            </div>
            <div className={cn('relative h-10 rounded-lg overflow-hidden', s.bg)}>
              <div
                className={cn('absolute inset-y-0 right-0 transition-all duration-500 ease-out flex items-center px-3', s.color)}
                style={{ width: `${Math.max(widthPct, s.count > 0 ? 8 : 0)}%` }}
              >
                <span className="text-[11px] font-bold text-white whitespace-nowrap">
                  {s.count > 0 && toFa(s.count)}
                </span>
              </div>
              {/* نرخ افت */}
              {dropoff !== null && dropoff > 0 && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500">
                  -{toFa(dropoff)}٪ افت
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* خلاصه */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
        <span className="text-xs text-slate-500 dark:text-slate-400">نرخ تبدیل کل</span>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tnum">
          {total > 0 && stages[0].count > 0
            ? `${toFa(Math.round((stages[3].count / stages[0].count) * 100))}٪`
            : '۰٪'
          }
        </span>
      </div>
    </div>
  );
}
