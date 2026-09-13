import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { cn } from '../../utils/ui';

// ════════════════════════════════════════════════════════════
// Breadcrumbs — برای مسیریابی و آگاهی از موقعیت صفحه
// ════════════════════════════════════════════════════════════
const ROUTE_LABELS = {
  '/dashboard': 'مرکز فرمان باشگاه',
  '/members': 'اعضای باشگاه',
  '/tiers': 'سطوح عضویت',
  '/rewards': 'پاداش‌ها',
  '/loyalty-rules': 'قوانین وفاداری',
  '/engagement': 'تعامل و شخصی‌سازی',
  '/loyalty-ledger': 'دفتر کل امتیاز',
  '/customers': 'اعضای باشگاه',
  '/invoices': 'فاکتورها',
  '/campaigns': 'کمپین‌ها',
  '/reports': 'گزارش‌گیری',
  '/notifications': 'اعلان‌ها',
  '/admin-dashboard': 'داشبورد مدیریتی',
  '/settings': 'تنظیمات',
  '/users': 'کاربران',
};

export default function Breadcrumbs({ custom }) {
  const location = useLocation();
  const path = location.pathname;

  const segments = path.split('/').filter(Boolean);
  const crumbs = [];
  let acc = '';
  for (let i = 0; i < segments.length; i++) {
    acc += '/' + segments[i];
    const label = ROUTE_LABELS[acc] || (i === segments.length - 1 ? 'جزئیات' : segments[i]);
    crumbs.push({ path: acc, label, isLast: i === segments.length - 1 });
  }

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
      <Link to="/dashboard" className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex items-center gap-1">
          <ChevronLeft className="w-3 h-3 text-slate-300 dark:text-slate-600" />
          {c.isLast ? (
            <span className={cn('font-medium text-slate-700 dark:text-slate-200')}>{custom || c.label}</span>
          ) : (
            <Link to={c.path} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

// PageHeader — عنوان صفحه با breadcrumb و actions
export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-5">
      <Breadcrumbs />
      <div className="flex items-start justify-between flex-wrap gap-3 mt-2">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-900/20 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
