import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, Search, LogOut, User as UserIcon, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import ThemeToggle from '../common/ThemeToggle';
import Breadcrumbs from '../common/Breadcrumbs';
import { cn } from '../../utils/ui';

export default function Topbar({ onMenuClick, theme, onToggleTheme, onOpenPalette }) {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="h-16 glass sticky top-0 z-30">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left section — menu + breadcrumb */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="منو"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb on desktop */}
          <div className="hidden md:block flex-1 min-w-0">
            <Breadcrumbs />
          </div>

          {/* Greeting on mobile */}
          <div className="md:hidden">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">سلام، {user?.firstName || 'کاربر'}</h1>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Command palette trigger */}
          <button
            onClick={onOpenPalette}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors group"
            title="جستجوی سریع"
          >
            <Search className="w-3.5 h-3.5" />
            <span>جستجو</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-[10px] font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600">⌘K</kbd>
          </button>

          {/* Mobile search icon */}
          <button
            onClick={onOpenPalette}
            className="sm:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            aria-label="جستجو"
          >
            <Search className="w-5 h-5" />
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          {/* Notifications */}
          <NotificationBell />

          {/* Separator */}
          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700" />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(user?.firstName?.[0] || '')}{(user?.lastName?.[0] || '')}
              </div>
              <div className="hidden lg:block text-right leading-tight">
                <div className="text-xs font-bold text-slate-900 dark:text-white">{user?.firstName} {user?.lastName}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {user?.role === 'ADMIN' ? 'مدیر سیستم' : user?.role === 'SALES_REP' ? 'کارشناس فروش' : user?.role}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden lg:block" />
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-surface-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-slide-down">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold">
                        {(user?.firstName?.[0] || '')}{(user?.lastName?.[0] || '')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate" dir="ltr">{user?.email}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => { setShowDropdown(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <SettingsIcon className="w-4 h-4 text-slate-400" />
                        تنظیمات حساب
                      </button>
                    )}
                    <button
                      onClick={() => { setShowDropdown(false); navigate('/notifications'); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      پروفایل من
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-1">
                    <button
                      onClick={() => { logout(); navigate('/login'); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      خروج از حساب
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
