import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Users, Briefcase, Crown, Gift, Target, ScrollText, SlidersHorizontal, FileText,
  Bell, Megaphone, BarChart3, Settings, FileSpreadsheet, Plus,
  Sun, Moon, Command as CommandIcon, CornerDownLeft, ArrowUp, ArrowDown,
} from 'lucide-react';
import { cn } from '../../utils/ui';

// ════════════════════════════════════════════════════════════
// CommandPalette — دسترسی سریع با Cmd/Ctrl + K (استاندارد مدرن)
// ════════════════════════════════════════════════════════════
const NAV_COMMANDS = [
  { id: 'nav-dashboard', label: 'مرکز فرمان باشگاه', hint: 'KPI وفاداری', icon: LayoutDashboard, path: '/dashboard', group: 'باشگاه مشتریان' },
  { id: 'nav-members', label: 'اعضای باشگاه', hint: 'سطح، امتیاز و کیف پول', icon: Users, path: '/members', group: 'باشگاه مشتریان' },
  { id: 'nav-tiers', label: 'سطوح عضویت', hint: 'نردبان وفاداری', icon: Crown, path: '/tiers', group: 'باشگاه مشتریان' },
  { id: 'nav-rewards', label: 'پاداش‌ها', hint: 'کاتالوگ و درخواست‌ها', icon: Gift, path: '/rewards', group: 'باشگاه مشتریان' },
  { id: 'nav-rules', label: 'قوانین وفاداری', hint: 'امتیاز و کش‌بک', icon: SlidersHorizontal, path: '/loyalty-rules', group: 'باشگاه مشتریان' },
  { id: 'nav-engagement', label: 'تعامل و شخصی‌سازی', hint: 'مأموریت و بخش‌ها', icon: Target, path: '/engagement', group: 'باشگاه مشتریان' },
  { id: 'nav-ledger', label: 'دفتر کل امتیاز', hint: 'گردش و حسابرسی', icon: ScrollText, path: '/loyalty-ledger', group: 'باشگاه مشتریان' },
  { id: 'nav-invoices', label: 'فاکتورها', hint: 'مدیریت فاکتور', icon: FileText, path: '/invoices', group: 'صفحات' },
  { id: 'nav-campaigns', label: 'کمپین‌ها', hint: 'بازاریابی پیامکی', icon: Megaphone, path: '/campaigns', group: 'صفحات' },
  { id: 'nav-reports', label: 'گزارش‌گیری اکسل', hint: 'خروجی/ورود اکسل', icon: FileSpreadsheet, path: '/reports', group: 'صفحات' },
  { id: 'nav-notifications', label: 'اعلان‌ها', hint: 'مرکز اعلان‌ها', icon: Bell, path: '/notifications', group: 'صفحات' },
  { id: 'nav-admin', label: 'داشبورد مدیریتی', hint: 'KPI و نمودارها', icon: BarChart3, path: '/admin-dashboard', group: 'صفحات' },
  { id: 'nav-settings', label: 'تنظیمات', hint: 'قوانین امتیازدهی', icon: Settings, path: '/settings', group: 'صفحات' },
];

export default function CommandPalette({ open, onClose, onToggleTheme, theme }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const commands = useMemo(() => {
    const list = [...NAV_COMMANDS];
    if (onToggleTheme) {
      list.unshift({
        id: 'theme-toggle',
        label: theme === 'dark' ? 'روشن کردن پوسته' : 'تیره کردن پوسته',
        hint: 'تغییر تم',
        icon: theme === 'dark' ? Sun : Moon,
        action: onToggleTheme,
        group: 'تنظیمات',
      });
    }
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.hint?.toLowerCase().includes(q) ||
      c.group?.toLowerCase().includes(q)
    );
  }, [query, onToggleTheme, theme]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, commands.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = commands[activeIndex];
        if (cmd) {
          if (cmd.path) { navigate(cmd.path); onClose(); }
          else if (cmd.action) { cmd.action(); onClose(); }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, commands, activeIndex, navigate, onClose]);

  if (!open) return null;

  const grouped = commands.reduce((acc, c) => {
    if (!acc[c.group]) acc[c.group] = [];
    acc[c.group].push(c);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="جستجو یا اجرای دستور..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {commands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              نتیجه‌ای برای «{query}» یافت نشد
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{group}</div>
                {items.map(cmd => {
                  flatIndex++;
                  const isActive = flatIndex === activeIndex;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      onClick={() => {
                        if (cmd.path) { navigate(cmd.path); onClose(); }
                        else if (cmd.action) { cmd.action(); onClose(); }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors',
                        isActive ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isActive ? 'bg-brand-100 dark:bg-brand-900/50' : 'bg-slate-100 dark:bg-slate-700'
                      )}>
                        <Icon className={cn('w-4 h-4', isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{cmd.label}</div>
                        {cmd.hint && <div className="text-xs text-slate-400 truncate">{cmd.hint}</div>}
                      </div>
                      {isActive && <CornerDownLeft className="w-4 h-4 text-brand-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700"><ArrowUp className="w-3 h-3 inline" /></kbd><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700"><ArrowDown className="w-3 h-3 inline" /></kbd> جابجایی</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">↵</kbd> انتخاب</span>
          </div>
          <span className="flex items-center gap-1"><CommandIcon className="w-3 h-3" /> Command Palette</span>
        </div>
      </div>
    </div>
  );
}
