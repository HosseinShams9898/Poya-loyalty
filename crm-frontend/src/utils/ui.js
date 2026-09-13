import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) { return twMerge(clsx(inputs)); }

export function toFa(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('fa-IR');
}

export function formatRial(r) { if (!r) return '۰'; return Number(r).toLocaleString('fa-IR'); }

// تبدیل ریال به تومان — نمایش خواناتر برای کاربر ایرانی
export function formatToman(r) {
  if (!r) return '۰';
  return Number(r / 10).toLocaleString('fa-IR');
}

// خلاصه‌سازی مبالغ بزرگ — مثل ۱.۲ میلیارد ریال
export function formatRialShort(r) {
  if (!r) return '۰';
  const n = Number(r);
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیون`;
  if (n >= 1e3) return `${(n / 1e3).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} هزار`;
  return n.toLocaleString('fa-IR');
}

export function formatDate(iso, o = {}) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fa-IR', { year:'numeric', month:'short', day:'numeric', ...o }); } catch { return iso; }
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('fa-IR', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return iso; }
}

// زمان نسبی به فارسی — مثل "۳ ساعت پیش"
export function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'همین الان';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min.toLocaleString('fa-IR')} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr.toLocaleString('fa-IR')} ساعت پیش`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day.toLocaleString('fa-IR')} روز پیش`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month.toLocaleString('fa-IR')} ماه پیش`;
  return `${Math.floor(month / 12).toLocaleString('fa-IR')} سال پیش`;
}

export function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ════════════════════════════════════════════════════════════
// اعتبارسنجی و فرمت موبایل ایرانی
// ════════════════════════════════════════════════════════════
export function normalizeMobile(input) {
  if (!input) return '';
  // حذف فاصله، خط تیره و کاراکترهای غیر عددی
  let s = String(input).replace(/[\s\-()_]/g, '').replace(/[^\d]/g, '');
  // تبدیل 98+ یا 0098 به 0
  if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  if (s.startsWith('0098')) s = '0' + s.slice(4);
  return s;
}

export function isValidIranMobile(input) {
  const m = normalizeMobile(input);
  return /^09\d{9}$/.test(m);
}

// نمایش خوانای موبایل: 0912 345 6789
export function formatIranMobile(input) {
  const m = normalizeMobile(input);
  if (m.length !== 11) return input;
  return `${m.slice(0, 4)} ${m.slice(4, 7)} ${m.slice(7)}`;
}

// ════════════════════════════════════════════════════════════
// Initials creator — برای avatar‌ها
// ════════════════════════════════════════════════════════════
export function getInitials(name = '') {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// رنگ avatar بر اساس نام — پالت دلخواه
export function getAvatarColor(name = '') {
  const palette = [
    'from-sky-400 to-sky-600',
    'from-violet-400 to-violet-600',
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600',
    'from-indigo-400 to-indigo-600',
    'from-teal-400 to-teal-600',
    'from-fuchsia-400 to-fuchsia-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

// ════════════════════════════════════════════════════════════
// Configs
// ════════════════════════════════════════════════════════════
export const leadStageConfig = {
  INQUIRY:    { label: 'استعلام',     color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400', dark: 'dark:bg-slate-800 dark:text-slate-300' },
  CONSULTING: { label: 'مشاوره',     color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', dark: 'dark:bg-blue-900/50 dark:text-blue-300' },
  PROFORMA:   { label: 'پیش‌فاکتور', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', dark: 'dark:bg-amber-900/50 dark:text-amber-300' },
  WON:        { label: 'موفق',       color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', dark: 'dark:bg-emerald-900/50 dark:text-emerald-300' },
  LOST:       { label: 'ناموفق',     color: 'bg-red-100 text-red-700', dot: 'bg-red-500', dark: 'dark:bg-red-900/50 dark:text-red-300' },
};

export const customerStatusConfig = {
  ACTIVE:  { label: 'فعال',          color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  IN_RISK: { label: 'در معرض ریزش', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  CHURNED: { label: 'ریزش کرده',    color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  DORMANT: { label: 'خوابیده',      color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  NEW:     { label: 'جدید',          color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
};

export const priorityConfig = {
  LOW:      { label: 'کم',     color: 'bg-slate-100 text-slate-700' },
  MEDIUM:   { label: 'متوسط',  color: 'bg-blue-100 text-blue-700' },
  HIGH:     { label: 'بالا',    color: 'bg-amber-100 text-amber-700' },
  CRITICAL: { label: 'بحرانی', color: 'bg-red-100 text-red-700' },
};

// منابع سرنخ
export const leadSourceConfig = {
  project:   { label: 'پروژه ساختمانی', icon: '🏗️' },
  representative: { label: 'نماینده', icon: '🤝' },
  direct_call: { label: 'تماس مستقیم', icon: '📞' },
  walk_in:   { label: 'حضوری',     icon: '🏪' },
  website:   { label: 'وب‌سایت',   icon: '🌐' },
  call:      { label: 'تماس',      icon: '📞' },
  instagram: { label: 'اینستاگرام', icon: '📷' },
  referral:  { label: 'معرفی',     icon: '🤝' },
};

// ════════════════════════════════════════════════════════════
// Storage helpers — برای favorites و recent
// ════════════════════════════════════════════════════════════
export function getFavorites(key = 'crm_favorites') {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

export function toggleFavorite(id, key = 'crm_favorites') {
  const list = getFavorites(key);
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(id);
  localStorage.setItem(key, JSON.stringify(list));
  return list;
}

export function isFavorite(id, key = 'crm_favorites') {
  return getFavorites(key).includes(id);
}

// ════════════════════════════════════════════════════════════
// Copy to clipboard — برای اشتراک‌گذاری
// ════════════════════════════════════════════════════════════
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    return true;
  }
}

// ════════════════════════════════════════════════════════════
// Generate WhatsApp deep link — برای تماس پشتیبانی
// ════════════════════════════════════════════════════════════
export function buildWhatsAppLink(phone, text = '') {
  const normalized = normalizeMobile(phone).replace(/^0/, '98');
  const msg = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${normalized}${msg}`;
}
