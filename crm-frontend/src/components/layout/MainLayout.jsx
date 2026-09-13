import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from '../common/CommandPalette';
import SupportWidget from '../common/SupportWidget';
import { useTheme, useKeyboardShortcuts } from '../../hooks/useCommon';
import { notificationService } from '../../api/api';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, toggleTheme } = useTheme();

  // دریافت تعداد اعلان‌های خوانده‌نشده
  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.count ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 60000);
    return () => clearInterval(iv);
  }, [fetchUnread]);

  // میانبرهای کیبورد
  useKeyboardShortcuts([
    { combo: 'mod+k', handler: () => setPaletteOpen(true) },
    { combo: 'mod+b', handler: () => setSidebarOpen(o => !o), allowInInput: false },
    { combo: 'escape', handler: () => { setSidebarOpen(false); setPaletteOpen(false); }, allowInInput: true },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-900 transition-colors duration-200">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadCount={unreadCount}
      />
      <div className="lg:mr-72 transition-all duration-300">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating support widget */}
      <SupportWidget />

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
    </div>
  );
}
