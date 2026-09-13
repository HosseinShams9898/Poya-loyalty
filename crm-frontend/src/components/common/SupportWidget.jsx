import { useState, useEffect } from 'react';
import { MessageCircle, X, Phone, Mail, Clock } from 'lucide-react';
import { cn, buildWhatsAppLink } from '../../utils/ui';

// ════════════════════════════════════════════════════════════
// SupportWidget — دکمه شناور پشتیبانی (الگوی رایج ایرانی)
// شامل WhatsApp + تماس + ایمیل
// ════════════════════════════════════════════════════════════
const SUPPORT_PHONE = '02123456789'; // شماره پشتیبانی — قابل تنظیم
const SUPPORT_MOBILE = '09121234567'; // موبایل پشتیبانی
const SUPPORT_EMAIL = 'support@pouyaplastic.ir';

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // نمایش hint پس از ۵ ثانیه
  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 5000);
    const t2 = setTimeout(() => setShowHint(false), 12000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed bottom-5 left-5 z-40 no-print">
      {/* Panel */}
      {open && (
        <div className="absolute bottom-16 left-0 w-72 bg-white dark:bg-surface-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-up">
          <div className="bg-gradient-to-l from-emerald-500 to-emerald-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">پشتیبانی پویا پلاستیک</h3>
                <p className="text-xs text-emerald-100 mt-0.5">همین حالا پاسخگو هستیم</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-2">
            {/* WhatsApp */}
            <a
              href={buildWhatsAppLink(SUPPORT_MOBILE, 'سلام، از طریق باشگاه مشتریان پویا پیام می‌دهم.')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">واتساپ</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">سریع‌ترین راه ارتباطی</div>
              </div>
            </a>
            {/* Phone */}
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                <Phone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">تماس تلفنی</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 tnum" dir="ltr">{SUPPORT_PHONE}</div>
              </div>
            </a>
            {/* Email */}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Mail className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">ایمیل</div>
                <div className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">{SUPPORT_EMAIL}</div>
              </div>
            </a>
            {/* Hours */}
            <div className="flex items-center gap-2 px-3 py-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              شنبه تا چهارشنبه ۸ تا ۱۷
            </div>
          </div>
        </div>
      )}

      {/* Hint bubble */}
      {showHint && !open && (
        <div className="absolute bottom-2 left-14 bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 px-3 py-2 animate-fade-in max-w-[200px]">
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">سوالی دارید؟ روی این دکمه کلیک کنید 💬</p>
          <button onClick={() => setShowHint(false)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-[10px] flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500">
            ×
          </button>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => { setOpen(!open); setShowHint(false); }}
        className={cn(
          'w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300',
          'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
          'hover:scale-110 active:scale-95',
          open && 'rotate-90'
        )}
        aria-label="پشتیبانی"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" fill="currentColor" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>
    </div>
  );
}
