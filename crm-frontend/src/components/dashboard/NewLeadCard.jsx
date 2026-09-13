import { UserPlus, Clock } from 'lucide-react';
import { formatRelative, leadSourceConfig } from '../../utils/ui';

export default function NewLeadCard({ lead, onClick }) {
  const source = leadSourceConfig[lead.source] || { label: 'نامشخص', icon: '❓' };
  return (
    <button
      onClick={() => onClick?.(lead)}
      className="w-full text-right bg-white dark:bg-surface-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-card-hover dark:hover:shadow-lg transition-all duration-200 hover:translate-x-[-2px]"
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{lead.fullName}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate" dir="ltr">{lead.mobile}</div>
        </div>
      </div>
      {lead.company && <p className="text-xs text-slate-600 dark:text-slate-300 truncate mb-2">{lead.company}</p>}
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <Clock className="w-3 h-3" />{formatRelative(lead.createdAt)}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
          <span>{source.icon}</span>{source.label}
        </span>
      </div>
      {lead.estimatedValue > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          ارزش تخمینی: <span className="font-mono font-semibold text-slate-900 dark:text-white">{Number(lead.estimatedValue).toLocaleString('fa-IR')}</span> ریال
        </div>
      )}
    </button>
  );
}
