import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ShieldCheck, Sparkles, ArrowLeft, Crown } from 'lucide-react';
import { memberService } from '../api/api';

export default function MemberLoginPage() {
  const [step, setStep] = useState('mobile'); const [mobile, setMobile] = useState('09121111111'); const [code, setCode] = useState(''); const [demoCode, setDemoCode] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const navigate = useNavigate();
  const request = async e => { e.preventDefault(); setLoading(true); setError(''); try { const r = await memberService.requestOtp(mobile); setDemoCode(r.data?.demoCode || '123456'); setStep('code'); } catch(err) { setError(err.message); } finally { setLoading(false); } };
  const verify = async e => { e.preventDefault(); setLoading(true); setError(''); try { const r = await memberService.verifyOtp(mobile, code); localStorage.setItem('member_access_token', r.data?.access_token || r.data?.accessToken || 'demo-member-token'); navigate('/club'); } catch(err) { setError(err.message); } finally { setLoading(false); } };
  return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(14,165,233,.3),transparent_28%),radial-gradient(circle_at_85%_85%,rgba(124,58,237,.32),transparent_30%)]"/>
    <div className="relative w-full max-w-md">
      <div className="text-center mb-6"><div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center shadow-2xl shadow-sky-500/20"><Crown className="w-8 h-8"/></div><h1 className="text-2xl font-black mt-4">باشگاه مشتریان پویا</h1><p className="text-sm text-slate-400 mt-1">امتیازها و مزایای همکاری شما</p></div>
      <div className="rounded-3xl bg-white text-slate-900 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">{step === 'mobile' ? <Smartphone className="w-5 h-5"/> : <ShieldCheck className="w-5 h-5"/>}</div><div><h2 className="font-black">{step === 'mobile' ? 'ورود اعضا' : 'تأیید شماره موبایل'}</h2><p className="text-xs text-slate-400 mt-0.5">{step === 'mobile' ? 'شماره ثبت‌شده در باشگاه را وارد کنید' : `کد ارسال‌شده به ${mobile}`}</p></div></div>
        {error && <div className="mb-4 rounded-xl bg-red-50 text-red-600 text-xs p-3">{error}</div>}
        <form onSubmit={step === 'mobile' ? request : verify} className="space-y-4">
          {step === 'mobile' ? <input value={mobile} onChange={e => setMobile(e.target.value)} required pattern="09[0-9]{9}" dir="ltr" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-center tracking-widest font-bold outline-none focus:ring-2 focus:ring-sky-500/30" placeholder="0912 123 4567"/> : <><input value={code} onChange={e => setCode(e.target.value)} autoFocus required maxLength={6} dir="ltr" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-center tracking-[.55em] text-xl font-black outline-none focus:ring-2 focus:ring-sky-500/30" placeholder="------"/>{demoCode && <button type="button" onClick={() => setCode(demoCode)} className="w-full rounded-xl bg-amber-50 text-amber-700 p-3 text-xs"><Sparkles className="w-3.5 h-3.5 inline ml-1"/>کد دمو: <b dir="ltr">{demoCode}</b> — برای درج کلیک کنید</button>}</>}
          <button disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-l from-sky-600 to-violet-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20">{loading ? 'چند لحظه...' : step === 'mobile' ? 'دریافت کد ورود' : 'ورود به باشگاه'}<ArrowLeft className="w-4 h-4"/></button>
          {step === 'code' && <button type="button" onClick={() => setStep('mobile')} className="w-full text-xs text-slate-400">ویرایش شماره موبایل</button>}
        </form>
      </div>
      <button onClick={() => navigate('/login')} className="w-full mt-4 text-xs text-slate-400 hover:text-white">ورود کارکنان و مدیر باشگاه</button>
    </div>
  </div>;
}
