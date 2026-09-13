import { Sun, Moon } from 'lucide-react';
import { cn } from '../../utils/ui';

// ════════════════════════════════════════════════════════════
// ThemeToggle — برای تغییر تم تیره/روشن
// ════════════════════════════════════════════════════════════
export default function ThemeToggle({ theme, onToggle, className }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300',
        'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300',
        'hover:scale-110 active:scale-95',
        className
      )}
      aria-label={isDark ? 'روشن کردن تم' : 'تیره کردن تم'}
      title={isDark ? 'روشن کردن تم' : 'تیره کردن تم'}
    >
      <div className="relative w-5 h-5">
        <Sun className={cn(
          'absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-300',
          isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        )} />
        <Moon className={cn(
          'absolute inset-0 w-5 h-5 text-indigo-400 transition-all duration-300',
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
        )} />
      </div>
    </button>
  );
}
