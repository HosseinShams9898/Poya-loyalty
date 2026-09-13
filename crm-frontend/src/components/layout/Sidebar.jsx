import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Crown, Gift, SlidersHorizontal, Target, ScrollText, Megaphone, FileText, FileSpreadsheet, Bell, Settings, LogOut, X, Smartphone, Radar, Headphones, Database } from 'lucide-react';
import { cn } from '../../utils/ui';
import { useAuth } from '../../context/AuthContext';

const clubItems = [
  { to:'/dashboard', label:'مرکز فرمان', icon:LayoutDashboard }, { to:'/members', label:'اعضای باشگاه', icon:Users },
  { to:'/tiers', label:'سطوح عضویت', icon:Crown }, { to:'/rewards', label:'پاداش و درخواست‌ها', icon:Gift },
  { to:'/loyalty-rules', label:'قوانین وفاداری', icon:SlidersHorizontal }, { to:'/engagement', label:'تعامل و شخصی‌سازی', icon:Target },
  { to:'/loyalty-ledger', label:'دفتر کل امتیاز', icon:ScrollText }, { to:'/campaigns', label:'کمپین‌ها و پیشنهادها', icon:Megaphone },
  { to:'/retention', label:'رادار حفظ مشتری', icon:Radar },
];
const serviceItems = [{ to:'/invoices', label:'تراکنش‌های خرید', icon:FileText }, { to:'/voice-of-customer', label:'صدای مشتری', icon:Headphones }, { to:'/reports', label:'ورود و خروجی داده', icon:FileSpreadsheet }, { to:'/notifications', label:'اعلان‌ها', icon:Bell, badge:'unread' }];
const adminItems = [{ to:'/integration/sepidar', label:'اتصال به سپیدار', icon:Database }, { to:'/users', label:'کاربران', icon:Users }, { to:'/settings', label:'تنظیمات', icon:Settings }];

export default function Sidebar({ open, onClose, unreadCount = 0 }) {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const link = item => { const Icon=item.icon; const count=item.badge==='unread'?unreadCount:0; return <NavLink key={item.to} to={item.to} onClick={onClose} className={({isActive}) => cn('group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all', isActive?'bg-gradient-to-l from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-500/20':'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')}>{({isActive}) => <><span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', isActive?'bg-white/15':'bg-slate-100 dark:bg-slate-800')}><Icon className={cn('w-3.5 h-3.5', isActive?'text-white':'text-slate-500 dark:text-slate-400')}/></span><span className="flex-1">{item.label}</span>{count>0&&<span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{count.toLocaleString('fa-IR')}</span>}</>}</NavLink>; };
  return <><div onClick={onClose} className={cn('fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden', open?'block':'hidden')}/><aside className={cn('fixed top-0 right-0 z-50 h-full w-72 bg-white dark:bg-surface-900 border-l border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0', open?'translate-x-0':'translate-x-full')}>
    <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-brand-500/20"><Crown className="w-5 h-5"/></div><div><div className="text-sm font-black text-slate-900 dark:text-white">باشگاه پویا</div><div className="text-[10px] text-slate-400">Loyalty OS · B2B</div></div></div><button onClick={onClose} className="lg:hidden p-2 text-slate-400"><X className="w-5 h-5"/></button></div>
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1"><SectionLabel>باشگاه مشتریان</SectionLabel>{clubItems.map(link)}<div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800"><SectionLabel>عملیات باشگاه</SectionLabel>{serviceItems.map(link)}</div>{user?.role==='ADMIN'&&<div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800"><SectionLabel>مدیریت</SectionLabel>{adminItems.map(link)}</div>}</nav>
    <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0"><div className="grid grid-cols-1 gap-2 mb-2"><button onClick={() => navigate('/club/login')} className="px-2 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-[10px] font-bold flex items-center justify-center gap-1"><Smartphone className="w-3.5 h-3.5"/>پنل عضو</button></div><div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-violet-600 text-white flex items-center justify-center text-xs font-black">{user?.firstName?.[0]}{user?.lastName?.[0]}</div><div className="flex-1 min-w-0"><div className="text-xs font-black truncate text-slate-900 dark:text-white">{user?.firstName} {user?.lastName}</div><div className="text-[9px] text-slate-400">مدیر باشگاه</div></div><button onClick={handleLogout} title="خروج" className="p-2 text-slate-400 hover:text-red-500"><LogOut className="w-4 h-4"/></button></div><div className="text-[9px] text-center text-slate-400 mt-2">نسخه ۳.۰ · Loyalty OS + Sepidar</div></div>
  </aside></>;
}

function SectionLabel({children}) { return <div className="px-3 mb-2 text-[9px] font-black text-slate-400 tracking-wider">{children}</div>; }
