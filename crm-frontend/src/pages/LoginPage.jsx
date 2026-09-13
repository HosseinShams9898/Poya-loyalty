import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/ui';
import { Eye, EyeOff, Building2, Shield, TrendingUp, Users, Award, Sparkles, Lock, Smartphone, ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ identifier: '', password: '', remember: true });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirect = params.get('redirect') || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.identifier, form.password);
      if (form.remember) {
        localStorage.setItem('crm_remember', form.identifier);
      } else {
        localStorage.removeItem('crm_remember');
      }
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'خطا در ورود');
    } finally { setLoading(false); }
  };

  const features = [
    { icon: TrendingUp, title: 'موتور وفاداری', desc: 'قوانین امتیاز و کش‌بک خودکار' },
    { icon: Users, title: 'شناخت اعضا', desc: 'سطح، کیف پول و رفتار خرید' },
    { icon: Award, title: 'پاداش و مأموریت', desc: 'تعامل مستمر و قابل اندازه‌گیری' },
    { icon: Shield, title: 'امنیت اطلاعات', desc: 'احراز هویت و دسترسی نقشی' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-surface-900">
      {/* ════════ Right side — Form ════════ */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 order-2 sm:order-1">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo (mobile) */}
          <div className="sm:hidden text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-brand-500/25">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">پویا پلاستیک</h1>
          </div>

          <div className="bg-white dark:bg-surface-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">ورود مدیر باشگاه</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">به مرکز مدیریت وفاداری خوش آمدید.</p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 mb-4 flex items-center gap-2 animate-shake">
                <span className="w-1 h-1 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ایمیل یا شماره موبایل</label>
                <div className="relative">
                  <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.identifier}
                    onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
                    placeholder="admin@loyalty.com یا 0912..."
                    required
                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">رمز عبور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                    dir="ltr"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember + forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={e => setForm(p => ({ ...p, remember: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">مرا به خاطر بسپار</span>
                </label>
                <button type="button" className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium">
                  فراموشی رمز؟
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 flex items-center justify-center gap-2',
                  loading ? 'bg-brand-400' : 'bg-gradient-to-l from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 active:scale-[0.98]'
                )}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  <>
                    ورود به مرکز باشگاه
                    <ChevronLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                برای پیش‌نمایش: هر ایمیل و رمزی وارد کنید
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            با ورود، شرایط استفاده و حریم خصوصی را می‌پذیرید
          </p>
        </div>
      </div>

      {/* ════════ Left side — Brand showcase ════════ */}
      <div className="hidden sm:flex sm:flex-1 relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 order-1 sm:order-2">
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-96 h-96 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-2xl bg-white/5 rotate-12 backdrop-blur-sm" />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-12 lg:p-16 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="text-base font-bold">پویا پلاستیک</div>
              <div className="text-xs text-brand-200">باشگاه مشتریان B2B</div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
            وفاداری هوشمند
            <br />
            <span className="text-brand-200">فراتر از CRM</span>
          </h2>
          <p className="text-brand-100 text-sm leading-relaxed mb-8 max-w-md">
            پلتفرم یکپارچه سطح‌بندی، امتیاز، پاداش، مأموریت و شخصی‌سازی برای مشتریان سازمانی
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 hover:translate-y-[-2px]"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold mb-0.5">{f.title}</div>
                  <div className="text-xs text-brand-200 leading-relaxed">{f.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Trust badge */}
          <div className="mt-8 flex items-center gap-3 text-xs text-brand-200">
            <Shield className="w-4 h-4" />
            <span>احراز هویت امن + دسترسی نقشی</span>
            <span className="opacity-50">|</span>
            <span>پشتیبانی ۲۴/۷</span>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-l from-amber-400 via-emerald-400 to-brand-400" />
      </div>
    </div>
  );
}
