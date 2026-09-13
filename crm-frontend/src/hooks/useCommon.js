import { useState, useEffect, useCallback } from 'react';

// ════════════════════════════════════════════════════════════
// useKeyboardShortcuts — ثبت میانبرهای کیبورد
//  shortcut: { combo: 'mod+k', handler: fn, preventDefault: true }
//  mod = Cmd در مک و Ctrl در ویندوز/لینوکس
// ════════════════════════════════════════════════════════════
function matchCombo(e, combo) {
  const parts = combo.toLowerCase().split('+');
  const wantsMod = parts.includes('mod');
  const wantsShift = parts.includes('shift');
  const wantsAlt = parts.includes('alt');
  const key = parts[parts.length - 1];

  const modPressed = e.metaKey || e.ctrlKey;
  if (wantsMod !== modPressed) return false;
  if (wantsShift !== e.shiftKey) return false;
  if (wantsAlt !== e.altKey) return false;
  if (key === 'escape') return e.key === 'Escape';
  if (key === 'enter') return e.key === 'Enter';
  return e.key.toLowerCase() === key;
}

export function useKeyboardShortcuts(shortcuts = []) {
  useEffect(() => {
    const handler = (e) => {
      // نادیده گرفتن وقتی در فیلد تایپ هستیم (مگر Escape)
      const target = e.target;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      for (const s of shortcuts) {
        if (matchCombo(e, s.combo)) {
          if (s.preventDefault !== false) e.preventDefault();
          if (s.allowInInput || (!isTyping || s.combo.toLowerCase().includes('escape'))) {
            s.handler(e);
            break;
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

// ════════════════════════════════════════════════════════════
// useTheme — مدیریت dark/light mode با ذخیره در localStorage
// ════════════════════════════════════════════════════════════
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('crm_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('crm_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggleTheme, setTheme };
}

// ════════════════════════════════════════════════════════════
// useLocalStorage — persistent state
// ════════════════════════════════════════════════════════════
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue];
}

// ════════════════════════════════════════════════════════════
// useMediaQuery — responsive helpers
// ════════════════════════════════════════════════════════════
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ════════════════════════════════════════════════════════════
// useClickOutside — برای بستن dropdown‌ها
// ════════════════════════════════════════════════════════════
export function useClickOutside(handler, enabled = true) {
  const ref = useCallback((node) => {
    if (!enabled || !node) return;
    const listener = (e) => {
      if (!node.contains(e.target)) handler(e);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, enabled]);
  return ref;
}
