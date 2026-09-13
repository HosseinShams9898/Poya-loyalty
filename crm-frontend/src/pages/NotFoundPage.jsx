import { useNavigate } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in px-4">
      <div className="text-center max-w-md">
        {/* Big 404 with gradient */}
        <div className="relative mb-6">
          <div className="text-[120px] sm:text-[160px] font-black leading-none bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent">
            ۴۰۴
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <SearchX className="w-24 h-24 text-slate-200 dark:text-slate-800" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">صفحه مورد نظر یافت نشد</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          ممکن است آدرس اشتباه وارد شده باشد یا صفحه حذف شده باشد. می‌توانید به داشبورد برگردید.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-brand-600 to-brand-500 text-white text-sm font-bold hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/25 transition-all active:scale-95"
        >
          <Home className="w-4 h-4" />
          بازگشت به داشبورد
        </button>
      </div>
    </div>
  );
}
