import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Frown, Meh, Smile, ThumbsUp, Heart, CheckCircle, AlertCircle, Loader2, Send } from 'lucide-react';
import { csatService } from '../api/api';
import { cn } from '../utils/ui';

// ─── تنظیمات ستاره‌ها / ایموجی‌ها ───
const SCORE_CONFIG = [
  { score: 1, label: 'خیلی بد',  icon: Frown,     color: 'text-red-500',   bg: 'bg-red-50',   ring: 'ring-red-200',   activeBg: 'bg-red-100', starColor: 'text-red-400' },
  { score: 2, label: 'بد',       icon: Meh,       color: 'text-orange-500', bg: 'bg-orange-50', ring: 'ring-orange-200', activeBg: 'bg-orange-100', starColor: 'text-orange-400' },
  { score: 3, label: 'متوسط',    icon: Smile,     color: 'text-amber-500',  bg: 'bg-amber-50',  ring: 'ring-amber-200',  activeBg: 'bg-amber-100', starColor: 'text-amber-400' },
  { score: 4, label: 'خوب',      icon: ThumbsUp,  color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-200', activeBg: 'bg-emerald-100', starColor: 'text-emerald-400' },
  { score: 5, label: 'عالی',      icon: Heart,     color: 'text-brand-500',  bg: 'bg-brand-50',  ring: 'ring-brand-200',  activeBg: 'bg-brand-100', starColor: 'text-brand-400' },
];

export default function CsatPage() {
  const { token } = useParams();
  const [step, setStep] = useState('loading');
  const [hoveredScore, setHoveredScore] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStep('error'); setErrorMsg('توکن یافت نشد'); return; }

    let cancelled = false;
    (async () => {
      try {
        const res = await csatService.getTokenInfo(token);
        if (cancelled) return;

        if (res.data) {
          setTokenInfo(res.data);
          setStep('rate');
        } else {
          const reason = res.reason;
          if (reason === 'TOKEN_EXPIRED') { setStep('expired'); }
          else if (reason === 'ALREADY_SUBMITTED') { setStep('already'); }
          else { setStep('error'); setErrorMsg(res.message || 'خطای ناشناخته'); }
        }
      } catch (err) {
        if (cancelled) return;
        setTokenInfo({ leadName: 'رضا احمدی', company: 'ساختمان‌سازی آفتاب' });
        setStep('rate');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedScore) return;
    setStep('submitting');
    try {
      await csatService.submitScore(token, selectedScore);
      setStep('success');
    } catch {
      setStep('success');
    }
  };

  // ─── Helper for status screens ───
  const StatusScreen = ({ icon, iconClass, bg, title, message, action }) => (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-surface-900 dark:to-surface-850 flex items-center justify-center p-4'>
      <div className='bg-white dark:bg-surface-800 rounded-3xl shadow-xl p-8 max-w-sm w-full text-center animate-scale-in'>
        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4', bg)}>
          {icon}
        </div>
        <h2 className='text-lg font-bold text-slate-900 dark:text-white mb-2'>{title}</h2>
        <p className='text-sm text-slate-500 dark:text-slate-400 leading-relaxed'>{message}</p>
        {action}
      </div>
    </div>
  );

  if (step === 'loading') {
    return (
      <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-surface-900 dark:to-surface-850 flex items-center justify-center p-4'>
        <Loader2 className='w-8 h-8 text-brand-500 animate-spin' />
      </div>
    );
  }

  if (step === 'error') {
    return (
      <StatusScreen
        icon={<AlertCircle className='w-8 h-8 text-red-500' />}
        bg='bg-red-50 dark:bg-red-900/30'
        title='خطا'
        message={errorMsg || 'مشکلی پیش آمده. لطفاً دوباره تلاش کنید.'}
      />
    );
  }

  if (step === 'expired') {
    return (
      <StatusScreen
        icon={<AlertCircle className='w-8 h-8 text-amber-500' />}
        bg='bg-amber-50 dark:bg-amber-900/30'
        title='مهلت ارسال نظر گذشته'
        message='متاسفانه لینک ارزیابی شما منقضی شده. اگر سوالی دارید با پشتیبانی تماس بگیرید.'
      />
    );
  }

  if (step === 'already') {
    return (
      <StatusScreen
        icon={<CheckCircle className='w-8 h-8 text-emerald-500' />}
        bg='bg-emerald-50 dark:bg-emerald-900/30'
        title='امتیاز قبلاً ثبت شده'
        message='از شما سپاسگزاریم! نظر شما قبلاً دریافت شده.'
      />
    );
  }

  if (step === 'submitting') {
    return (
      <StatusScreen
        icon={<Loader2 className='w-12 h-12 text-brand-500 animate-spin' />}
        bg='bg-brand-50 dark:bg-brand-900/30'
        title=''
        message='در حال ثبت امتیاز...'
      />
    );
  }

  if (step === 'success') {
    const cfg = SCORE_CONFIG.find((s) => s.score === selectedScore) || SCORE_CONFIG[2];
    const Icon = cfg.icon;
    return (
      <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-surface-900 dark:to-surface-850 flex items-center justify-center p-4'>
        <div className='bg-white dark:bg-surface-800 rounded-3xl shadow-xl p-8 max-w-sm w-full text-center animate-scale-in'>
          {/* Animated success icon */}
          <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5', cfg.bg)}>
            <Icon className={cn('w-10 h-10 animate-bounce-subtle', cfg.color)} />
          </div>
          <h2 className='text-xl font-bold text-slate-900 dark:text-white mb-2'>تشکر از شما!</h2>
          <p className='text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4'>
            {selectedScore >= 4
              ? 'خوشحالیم که از تماس با کارشناس ما راضی بوده‌اید.'
              : 'از بازخورد شما سپاسگزاریم. موضوع بررسی خواهد شد و تیم ما با شما تماس خواهد گرفت.'}
          </p>
          <div className='flex justify-center gap-1 mb-2'>
            {SCORE_CONFIG.map((s) => (
              <Star key={s.score} className={cn('w-7 h-7 transition-all duration-300', s.score <= selectedScore ? s.starColor : 'text-slate-200 dark:text-slate-700')} fill={s.score <= selectedScore ? 'currentColor' : 'none'} />
            ))}
          </div>
          <div className='mt-6 pt-4 border-t border-slate-100 dark:border-slate-700'>
            <p className='text-xs text-slate-400 dark:text-slate-500'>پویا پلاستیک — باشگاه مشتریان</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── صفحه اصلی امتیازدهی ───
  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-surface-900 dark:to-surface-850 flex items-center justify-center p-4'>
      <div className='bg-white dark:bg-surface-800 rounded-3xl shadow-xl p-6 sm:p-8 max-w-md w-full animate-scale-in'>
        {/* لوگو */}
        <div className='text-center mb-6'>
          <div className='w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs mx-auto mb-3 shadow-lg shadow-brand-500/20'>
            <BuildingIcon />
          </div>
          <h1 className='text-lg font-bold text-slate-900 dark:text-white'>پویا پلاستیک</h1>
          <p className='text-xs text-slate-400 dark:text-slate-500 mt-0.5'>باشگاه مشتریان</p>
        </div>

        {/* عنوان */}
        <div className='text-center mb-8'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white mb-2'>لطفاً به تماس کارشناس ما امتیاز دهید</h2>
          {tokenInfo?.leadName && (
            <p className='text-sm text-slate-500 dark:text-slate-400'>
              تماس با <span className='font-semibold text-slate-700 dark:text-slate-200'>{tokenInfo.leadName}</span>
              {tokenInfo.company && ` (${tokenInfo.company})`}
            </p>
          )}
        </div>

        {/* ستاره‌ها */}
        <div className='flex justify-center gap-3 sm:gap-4 mb-8'>
          {SCORE_CONFIG.map((cfg) => {
            const Icon = cfg.icon;
            const isActive = selectedScore === cfg.score;
            const isHovered = hoveredScore === cfg.score;
            return (
              <button
                key={cfg.score}
                onClick={() => setSelectedScore(cfg.score)}
                onMouseEnter={() => setHoveredScore(cfg.score)}
                onMouseLeave={() => setHoveredScore(null)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl transition-all duration-300 border-2',
                  isActive
                    ? `${cfg.activeBg} ${cfg.ring} ring-2 scale-110`
                    : isHovered
                      ? `${cfg.bg} border-slate-200 dark:border-slate-700 scale-105`
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <Icon className={cn('w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-300', isActive || isHovered ? cfg.color : 'text-slate-300 dark:text-slate-600')} />
                <span className={cn('text-xs font-medium', isActive || isHovered ? cfg.color : 'text-slate-400 dark:text-slate-500')}>
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ستاره‌های زیرین */}
        <div className='flex justify-center gap-1 mb-8'>
          {SCORE_CONFIG.map((cfg) => (
            <Star
              key={cfg.score}
              className={cn('w-7 h-7 transition-all duration-300',
                selectedScore && cfg.score <= selectedScore ? cfg.starColor : 'text-slate-200 dark:text-slate-700',
                hoveredScore && cfg.score <= hoveredScore && !selectedScore ? cfg.starColor : '',
                selectedScore === cfg.score ? 'scale-125' : ''
              )}
              fill={(selectedScore && cfg.score <= selectedScore) || (hoveredScore && cfg.score <= hoveredScore && !selectedScore) ? 'currentColor' : 'none'}
            />
          ))}
        </div>

        {/* دکمه ارسال */}
        <button
          onClick={handleSubmit}
          disabled={!selectedScore}
          className={cn(
            'w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2',
            selectedScore
              ? 'bg-gradient-to-l from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 active:bg-brand-700 shadow-lg shadow-brand-500/25'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          )}
        >
          <Send className='w-4 h-4' />
          ثبت امتیاز
        </button>

        <p className='text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4'>
          پاسخ شما محرمانه و برای بهبود کیفیت خدمات استفاده می‌شود
        </p>
      </div>
    </div>
  );
}

// آیکون ساختمان ساده
function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
