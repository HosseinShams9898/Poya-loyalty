import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, Gift, Target, History, Users, Crown, Wallet, Sparkles, 
  Bell, LogOut, ArrowLeft, CheckCircle2, Copy, Send, Truck, 
  Package, Headphones, Zap, Gem, ChevronLeft, ArrowDownLeft, 
  ArrowUpRight, ArrowLeftRight, ClipboardList, PhoneCall,
  Plus, X, AlertTriangle, MessageSquare, Star, ClockAlert
} from 'lucide-react';
import { memberService } from '../api/api';
import { formatRial, formatDateTime, toFa, copyToClipboard } from '../utils/ui';
import { showToast } from '../utils/toast';

const nav = [
  { id:'home', label:'خانه', icon:Home },
  { id:'request', label:'استعلام خرید', icon:ClipboardList },
  { id:'rewards', label:'پاداش‌ها', icon:Gift },
  { id:'missions', label:'مأموریت‌ها', icon:Target },
  { id:'history', label:'گردش امتیاز', icon:History },
  { id:'referral', label:'معرفی', icon:Users },
  { id:'feedback', label:'بازخورد و شکایت', icon:Headphones },
];
const rewardIcons = { truck:Truck, wallet:Wallet, package:Package, headphones:Headphones, zap:Zap, gem:Gem };

export default function MemberPortalPage() {
  const [tab, setTab] = useState('home');
  const [me, setMe] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [referrals, setReferrals] = useState({ referrals: [] });
  const [requests, setRequests] = useState([]);
  const [requestForm, setRequestForm] = useState({
    requestType:'INQUIRY',
    productTitle:'یونولیت سقفی',
    quantity:'',
    unit:'مترمکعب',
    projectName:'',
    city:'',
    description:''
  });
  const [requesting, setRequesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviteMobile, setInviteMobile] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('member_access_token')) {
      navigate('/club/login', { replace: true });
      return;
    }
    Promise.all([
      memberService.me(),
      memberService.rewards(),
      memberService.transactions(),
      memberService.referrals(),
      memberService.purchaseRequests()
    ]).then(([a,b,c,d,e]) => {
      setMe(a.data);
      setRewards(b.data || []);
      setTransactions(c.data?.points || c.data || []);
      setReferrals(d.data || { referrals:[] });
      setRequests(e.data || []);
    }).catch(() => navigate('/club/login')).finally(() => setLoading(false));
  }, [navigate]);

  const redeem = async reward => {
    if (!reward.canRedeem && Number(me?.totalPoints) < Number(reward.costPoints)) return;
    await memberService.redeem(reward.id);
    setMe(v => ({ ...v, totalPoints: Number(v.totalPoints) - Number(reward.costPoints) }));
    showToast('درخواست پاداش ثبت شد؛ وضعیت آن را از باشگاه اطلاع می‌دهیم');
  };

  const claim = async progress => {
    await memberService.claimMission(progress.mission.id);
    showToast('پاداش مأموریت به امتیازهای شما اضافه شد');
  };

  const invite = async e => {
    e.preventDefault();
    if (!inviteMobile) return;
    await memberService.invite(inviteMobile);
    setReferrals(v => ({
      ...v,
      referrals: [
        { id:`new-${Date.now()}`, referredMobile:inviteMobile, status:'INVITED', createdAt:new Date().toISOString(), rewardPoints:0 },
        ...(v.referrals || [])
      ]
    }));
    setInviteMobile('');
    showToast('دعوت‌نامه ثبت شد');
  };

  const createRequest = async e => {
    e.preventDefault();
    if (!requestForm.productTitle) return;
    setRequesting(true);
    try {
      const response = await memberService.createPurchaseRequest({
        ...requestForm,
        quantity: requestForm.quantity ? Number(requestForm.quantity) : null
      });
      setRequests(items => [response.data, ...items]);
      setRequestForm({
        requestType:'INQUIRY',
        productTitle:'یونولیت سقفی',
        quantity:'',
        unit:'مترمکعب',
        projectName:'',
        city:'',
        description:''
      });
      showToast(response.message || 'درخواست شما ثبت شد');
    } catch(error) {
      showToast(error.message, 'error');
    } finally {
      setRequesting(false);
    }
  };

  const convertPoints = async () => {
    try {
      const response = await memberService.convertPoints(1000);
      setMe(v => ({
        ...v,
        totalPoints: response.data.pointBalanceAfter,
        walletBalance: response.data.walletBalanceAfter
      }));
      showToast(response.message);
    } catch(error) {
      showToast(error.message, 'error');
    }
  };

  const logout = () => {
    localStorage.removeItem('member_access_token');
    navigate('/club/login');
  };

  if (loading || !me) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-sky-400 rounded-full animate-spin mx-auto"/>
          <p className="text-sm text-slate-400 mt-4">در حال آماده‌سازی باشگاه شما...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24 sm:pb-8" dir="rtl">
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-violet-600 flex items-center justify-center">
              <Crown className="w-4 h-4"/>
            </div>
            <div>
              <div className="text-xs font-black">باشگاه پویا</div>
              <div className="text-[9px] text-slate-400">پنل اعضا</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-xl hover:bg-white/10">
              <Bell className="w-4 h-4"/>
            </button>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-white/10 text-slate-400">
              <LogOut className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto sm:px-4 sm:grid sm:grid-cols-[210px_1fr] gap-5 sm:py-5">
        <aside className="hidden sm:block">
          <div className="sticky top-21 rounded-2xl bg-white p-3 shadow-card border border-slate-200 space-y-1">
            {nav.map(n => <NavButton key={n.id} item={n} active={tab === n.id} onClick={() => setTab(n.id)}/>)}
          </div>
        </aside>

        <main className="p-4 sm:p-0 space-y-4">
          {tab === 'home' && <HomeTab me={me} rewards={rewards} setTab={setTab} convertPoints={convertPoints}/>}
          {tab === 'request' && <RequestTab items={requests} form={requestForm} setForm={setRequestForm} submit={createRequest} submitting={requesting}/>}
          {tab === 'rewards' && <RewardsTab rewards={rewards} points={me.totalPoints} redeem={redeem}/>}
          {tab === 'missions' && <MissionsTab progress={me.missionProgress || []} claim={claim}/>}
          {tab === 'history' && <HistoryTab items={transactions}/>}
          {tab === 'referral' && <ReferralTab data={referrals} inviteMobile={inviteMobile} setInviteMobile={setInviteMobile} invite={invite}/>}
          {tab === 'feedback' && <FeedbackTab />}
        </main>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white border-t border-slate-200 px-2 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] flex justify-start overflow-x-auto shadow-2xl">
        {nav.map(n => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className={`min-w-[4.5rem] flex flex-col items-center gap-1 text-[9px] font-bold ${tab === n.id ? 'text-violet-600' : 'text-slate-400'}`}
          >
            <n.icon className="w-5 h-5"/>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// HOME TAB
// ──────────────────────────────────────────────────────────────
function HomeTab({ me, rewards, setTab, convertPoints }) {
  const nextMin = Number(me.nextTier?.minPoints || Number(me.lifetimePoints) + Number(me.pointsToNextTier || 0));
  const currentMin = Number(me.tier?.minPoints || 0);
  const progress = me.nextTier
    ? Math.min(100, Math.max(0, Math.round((Number(me.lifetimePoints) - currentMin) / (nextMin - currentMin) * 100)))
    : 100;

  return (
    <>
      <section className="rounded-3xl bg-slate-950 text-white p-5 sm:p-7 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,.3),transparent_30%),radial-gradient(circle_at_90%_100%,rgba(124,58,237,.35),transparent_33%)]"/>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">سلام {me.fullName} 👋</p>
              <h1 className="text-lg sm:text-xl font-black mt-1">{me.company}</h1>
            </div>
            <span
              className="px-3 py-1.5 rounded-full text-xs font-black border"
              style={{
                color: me.tier?.color,
                borderColor: `${me.tier?.color}55`,
                backgroundColor: `${me.tier?.color}18`
              }}
            >
              سطح {me.tier?.title}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <Sparkles className="w-4 h-4 text-amber-300"/>
              <div className="text-3xl font-black mt-2">{toFa(me.totalPoints)}</div>
              <div className="text-[10px] text-slate-400">امتیاز قابل مصرف</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <Wallet className="w-4 h-4 text-emerald-300"/>
              <div className="text-xl sm:text-2xl font-black mt-2 truncate">{formatRial(me.walletBalance)}</div>
              <div className="text-[10px] text-slate-400">اعتبار کیف پول (ریال)</div>
            </div>
          </div>

          <button
            disabled={Number(me.totalPoints) < 1000}
            onClick={convertPoints}
            className="mt-3 w-full py-2.5 rounded-xl bg-white/10 border border-white/10 text-xs font-black disabled:opacity-40"
          >
            <ArrowLeftRight className="w-4 h-4 inline ml-1"/>
            تبدیل ۱٬۰۰۰ امتیاز به ۵۰۰٬۰۰۰ ریال
          </button>

          {me.nextTier && (
            <div className="mt-5">
              <div className="flex justify-between text-[11px] text-slate-300 mb-2">
                <span>مسیر تا سطح {me.nextTier.title}</span>
                <b>{toFa(me.pointsToNextTier)} امتیاز دیگر</b>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-l from-sky-400 to-violet-500" style={{ width: `${progress}%` }}/>
              </div>
            </div>
          )}
        </div>
      </section>

      {Number(me.expiringPoints) > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <History className="w-4 h-4"/>
          </div>
          <div className="flex-1">
            <div className="text-xs font-black">{toFa(me.expiringPoints)} امتیاز در آستانه انقضا</div>
            <div className="text-[10px] text-amber-700 mt-1">با انتخاب پاداش، از امتیازها استفاده کنید.</div>
          </div>
          <button onClick={() => setTab('rewards')} className="text-xs font-black">
            مشاهده <ChevronLeft className="w-3 h-3 inline"/>
          </button>
        </div>
      )}

      <section>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="font-black">پیشنهاد مناسب شما</h2>
            <p className="text-xs text-slate-400 mt-1">قابل دریافت با امتیاز فعلی</p>
          </div>
          <button onClick={() => setTab('rewards')} className="text-xs font-bold text-violet-600">همه پاداش‌ها</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {rewards.filter(r => r.canRedeem || Number(me.totalPoints) >= Number(r.costPoints)).slice(0,2).map(r => (
            <RewardMini key={r.id} reward={r}/>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm">شماره عضویت</h3>
            <div className="font-mono text-xs text-slate-500 mt-1" dir="ltr">{me.membershipNo}</div>
          </div>
          <button
            onClick={() => copyToClipboard(me.membershipNo).then(() => showToast('شماره عضویت کپی شد'))}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-500"
          >
            <Copy className="w-4 h-4"/>
          </button>
        </div>
      </section>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// REQUEST TAB
// ──────────────────────────────────────────────────────────────
function RequestTab({ items, form, setForm, submit, submitting }) {
  const statuses = {
    NEW: ['ثبت‌شده', 'bg-sky-100 text-sky-700'],
    CONTACTED: ['تماس گرفته شد', 'bg-violet-100 text-violet-700'],
    QUOTED: ['پیش‌فاکتور صادر شد', 'bg-amber-100 text-amber-700'],
    CONVERTED: ['تبدیل به خرید', 'bg-emerald-100 text-emerald-700'],
    CLOSED: ['بسته', 'bg-slate-100 text-slate-600']
  };
  const change = (key, value) => setForm({ ...form, [key]: value });

  return (
    <>
      <SectionTitle title="استعلام و درخواست خرید" subtitle="بدون پرداخت اینترنتی؛ درخواست را ثبت کنید تا کارشناس همان روز تماس بگیرد"/>

      <div className="rounded-3xl bg-slate-950 text-white p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(14,165,233,.32),transparent_35%),radial-gradient(circle_at_90%_100%,rgba(124,58,237,.35),transparent_35%)]"/>
        <div className="relative flex gap-3 items-start">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center">
            <PhoneCall className="w-5 h-5 text-sky-300"/>
          </div>
          <div>
            <h2 className="font-black">قیمت نهایی پس از بررسی پروژه</h2>
            <p className="text-xs text-slate-300 leading-6 mt-1">
              به‌دلیل تغییر قیمت مواد اولیه و تخفیف‌های نقدی، حجمی و پروژه‌ای، کارشناس بهترین شرایط را اعلام می‌کند.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="نوع درخواست">
            <select value={form.requestType} onChange={e => change('requestType', e.target.value)} className="field">
              <option value="INQUIRY">استعلام قیمت</option>
              <option value="PURCHASE">درخواست خرید</option>
            </select>
          </Field>
          <Field label="محصول">
            <select value={form.productTitle} onChange={e => change('productTitle', e.target.value)} className="field">
              <option>یونولیت سقفی</option>
              <option>یونولیت دیواری</option>
              <option>پنل سه‌بعدی (3D Panel)</option>
              <option>یونولیت بسته‌بندی</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="مقدار تقریبی">
            <input type="number" min="0" value={form.quantity} onChange={e => change('quantity', e.target.value)} placeholder="مثلاً ۸۰" className="field"/>
          </Field>
          <Field label="واحد">
            <select value={form.unit} onChange={e => change('unit', e.target.value)} className="field">
              <option>مترمکعب</option>
              <option>مترمربع</option>
              <option>عدد</option>
              <option>بار</option>
            </select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="نام پروژه">
            <input value={form.projectName} onChange={e => change('projectName', e.target.value)} placeholder="اختیاری" className="field"/>
          </Field>
          <Field label="شهر پروژه">
            <input value={form.city} onChange={e => change('city', e.target.value)} placeholder="مثلاً سیرجان" className="field"/>
          </Field>
        </div>

        <Field label="توضیحات">
          <textarea rows="3" value={form.description} onChange={e => change('description', e.target.value)} placeholder="ابعاد، دانسیته، زمان تحویل یا شرایط حمل..." className="field resize-none"/>
        </Field>

        <button disabled={submitting} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-black">
          <Send className="w-4 h-4 inline ml-1"/>
          {submitting ? 'در حال ثبت...' : 'ثبت و دریافت کد پیگیری'}
        </button>
      </form>

      <section>
        <h2 className="font-black mb-3">درخواست‌های اخیر</h2>
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-xs text-slate-400">هنوز درخواستی ثبت نشده است.</div>
          ) : (
            items.map(item => {
              const state = statuses[item.status] || statuses.NEW;
              return (
                <div key={item.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-slate-400">{item.trackingCode || 'در انتظار کد'} · {formatDateTime(item.createdAt)}</div>
                      <h3 className="text-sm font-black mt-1">{item.productTitle}</h3>
                    </div>
                    <span className={`h-fit px-2 py-1 rounded-full text-[10px] font-bold ${state[1]}`}>{state[0]}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-3">
                    {item.quantity ? `${toFa(item.quantity)} ${item.unit || ''}` : 'مقدار پس از تماس مشخص می‌شود'}
                    {item.projectName ? ` · پروژه ${item.projectName}` : ''}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label}
      <div className="mt-2 [&_.field]:w-full [&_.field]:rounded-xl [&_.field]:border [&_.field]:border-slate-200 [&_.field]:bg-white [&_.field]:px-3 [&_.field]:py-2.5 [&_.field]:text-sm [&_.field]:outline-none focus-within:[&_.field]:ring-2 focus-within:[&_.field]:ring-violet-500/20">
        {children}
      </div>
    </label>
  );
}

// ──────────────────────────────────────────────────────────────
// REWARDS TAB
// ──────────────────────────────────────────────────────────────
function RewardsTab({ rewards, points, redeem }) {
  return (
    <>
      <SectionTitle title="فروشگاه پاداش" subtitle={`موجودی شما: ${toFa(points)} امتیاز`}/>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rewards.map(r => {
          const Icon = rewardIcons[r.imageIcon] || Gift;
          const can = Boolean(r.canRedeem) || Number(points) >= Number(r.costPoints);
          return (
            <div key={r.id} className="rounded-2xl bg-white p-4 border border-slate-200 flex flex-col">
              <div className="flex justify-between">
                <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Icon className="w-5 h-5"/>
                </div>
                {r.isFeatured && <span className="text-[9px] bg-amber-100 text-amber-700 h-fit px-2 py-1 rounded-full font-bold">ویژه</span>}
              </div>
              <h3 className="font-black text-sm mt-3">{r.title}</h3>
              <p className="text-[11px] text-slate-500 leading-5 mt-1 flex-1">{r.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <div>
                  <b className="text-violet-600">{toFa(r.costPoints)}</b>
                  <span className="text-[9px] text-slate-400 mr-1">امتیاز</span>
                </div>
                <button
                  disabled={!can}
                  onClick={() => redeem(r)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black ${can ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  {can ? 'دریافت پاداش' : 'امتیاز ناکافی'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// MISSIONS TAB
// ──────────────────────────────────────────────────────────────
function MissionsTab({ progress, claim }) {
  return (
    <>
      <SectionTitle title="مأموریت‌های من" subtitle="فعالیت کنید و امتیاز اضافه بگیرید"/>
      <div className="space-y-3">
        {progress.map(p => {
          const m = p.mission;
          const pct = Math.min(100, Math.round(Number(p.progress) / Number(m.targetValue) * 100));
          const complete = ['COMPLETED','CLAIMED'].includes(p.status) || pct >= 100;
          return (
            <div key={p.id} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center">
                  <Target className="w-5 h-5"/>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <h3 className="font-black text-sm">{m.title}</h3>
                    <span className="text-xs font-black text-fuchsia-600">+{toFa(m.rewardPoints)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{m.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-l from-fuchsia-500 to-violet-500 rounded-full" style={{width: `${pct}%`}}/>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                  <span>{toFa(p.progress)} از {toFa(m.targetValue)}</span>
                  <span>{toFa(pct)}٪</span>
                </div>
              </div>
              {complete && p.status !== 'CLAIMED' && (
                <button onClick={() => claim(p)} className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black">
                  <CheckCircle2 className="w-4 h-4 inline ml-1"/>
                  دریافت جایزه مأموریت
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// HISTORY TAB
// ──────────────────────────────────────────────────────────────
function HistoryTab({ items }) {
  return (
    <>
      <SectionTitle title="گردش امتیاز" subtitle="همه افزایش‌ها و مصرف‌های شما"/>
      <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {items.map(i => {
          const positive = Number(i.points) > 0;
          return (
            <div key={i.id} className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>
                {positive ? <ArrowDownLeft className="w-4 h-4"/> : <ArrowUpRight className="w-4 h-4"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{i.description}</div>
                <div className="text-[10px] text-slate-400 mt-1">{formatDateTime(i.createdAt)}</div>
              </div>
              <div className={`font-black ${positive ? 'text-emerald-600' : 'text-violet-600'}`}>
                {positive ? '+' : ''}{toFa(i.points)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// REFERRAL TAB
// ──────────────────────────────────────────────────────────────
function ReferralTab({ data, inviteMobile, setInviteMobile, invite }) {
  const code = data.referralCode || 'REZA1001';
  return (
    <>
      <SectionTitle title="معرفی همکار" subtitle="با معرفی مشتری سازمانی جدید امتیاز بگیرید"/>

      <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-sky-600 text-white p-6 text-center">
        <Users className="w-9 h-9 mx-auto"/>
        <h3 className="font-black mt-3">کد دعوت اختصاصی شما</h3>
        <div className="mt-4 inline-flex items-center gap-3 bg-white/15 border border-white/20 rounded-2xl px-5 py-3">
          <b className="font-mono text-lg tracking-wider" dir="ltr">{code}</b>
          <button onClick={() => copyToClipboard(code).then(() => showToast('کد دعوت کپی شد'))}>
            <Copy className="w-4 h-4"/>
          </button>
        </div>
        <p className="text-xs text-violet-100 mt-4 leading-6">پس از اولین خرید موفق عضو معرفی‌شده، ۲۵۰ امتیاز دریافت می‌کنید.</p>
      </div>

      <form onSubmit={invite} className="rounded-2xl bg-white border border-slate-200 p-4">
        <label className="text-xs font-bold">ارسال دعوت با موبایل</label>
        <div className="flex gap-2 mt-2">
          <input
            value={inviteMobile}
            onChange={e => setInviteMobile(e.target.value)}
            placeholder="09xxxxxxxxx"
            dir="ltr"
            className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          <button className="w-11 rounded-xl bg-slate-950 text-white flex items-center justify-center">
            <Send className="w-4 h-4"/>
          </button>
        </div>
      </form>

      <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100">
        {(data.referrals || []).map(r => (
          <div key={r.id} className="p-4 flex justify-between">
            <div>
              <div className="text-xs font-bold" dir="ltr">{r.referredMobile}</div>
              <div className="text-[10px] text-slate-400 mt-1">{formatDateTime(r.createdAt)}</div>
            </div>
            <span className={`text-[10px] font-bold h-fit px-2 py-1 rounded-full ${r.status === 'QUALIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {r.status === 'QUALIFIED' ? `واجد شرایط · +${toFa(r.rewardPoints)}` : r.status === 'JOINED' ? 'عضو شده' : 'دعوت‌شده'}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// FEEDBACK TAB — با CSAT و تاریخچه کامل
// ──────────────────────────────────────────────────────────────
function FeedbackTab() {
  const [form, setForm] = useState({
    type: 'COMPLAINT',
    subject: '',
    description: '',
    channel: 'WEB',
  });
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // دریافت تاریخچه بازخوردها
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await memberService.getFeedbacks();
        console.log('📦 تاریخچه بازخوردها:', res.data);
        setHistory(res.data || []);
        
        // استخراج نوتیفیکیشن‌های CSAT از تاریخچه
        const csatNotifs = (res.data || [])
          .filter(item => item.status === 'RESOLVED' && item.csatLink)
          .map(item => ({
            id: item.id,
            title: '⭐ نظر شما برای ما ارزشمند است',
            message: `بازخورد "${item.subject}" حل شد. لطفاً به خدمات ما امتیاز دهید.`,
            link: item.csatLink,
            feedbackId: item.id,
            createdAt: item.updatedAt,
          }));
        setNotifications(csatNotifs);
      } catch (error) {
        console.error('خطا در دریافت تاریخچه:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      showToast('عنوان و شرح بازخورد الزامی است', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await memberService.createFeedback(form);
      setHistory(prev => [res.data, ...prev]);
      setForm({ type: 'COMPLAINT', subject: '', description: '', channel: 'WEB' });
      showToast('بازخورد شما با موفقیت ثبت شد. کارشناسان ما بررسی می‌کنند.');
    } catch (error) {
      showToast(error.message || 'خطا در ثبت بازخورد', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabels = {
    OPEN: 'در انتظار بررسی',
    IN_PROGRESS: 'در حال پیگیری',
    RESOLVED: '✅ حل شده',
    CLOSED: 'بسته شده',
  };
  const statusColors = {
    OPEN: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-sky-100 text-sky-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-slate-100 text-slate-600',
  };

  const hasCsatNotifications = notifications.length > 0;

  return (
    <>
      <SectionTitle title="بازخورد و شکایت" subtitle="نظرات و انتقادات خود را با ما در میان بگذارید"/>

      {/* 📣 CSAT Notifications - بالای صفحه */}
      {hasCsatNotifications && (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div key={notif.id} className="rounded-2xl bg-gradient-to-r from-violet-50 to-sky-50 border border-violet-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-violet-500 text-violet-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{notif.title}</div>
                  <p className="text-xs text-slate-500">{notif.message}</p>
                </div>
              </div>
              <a
                href={notif.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <Star className="w-3 h-3 fill-white" />
                امتیازدهی
              </a>
            </div>
          ))}
        </div>
      )}

      {/* فرم ثبت بازخورد */}
      <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="نوع بازخورد">
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="field"
            >
              <option value="COMPLAINT">شکایت</option>
              <option value="SUGGESTION">پیشنهاد</option>
              <option value="SURVEY">نظرسنجی</option>
            </select>
          </Field>
          <Field label="کانال تماس">
            <select
              value={form.channel}
              onChange={e => setForm({ ...form, channel: e.target.value })}
              className="field"
            >
              <option value="WEB">وبسایت</option>
              <option value="PHONE">تلفنی</option>
              <option value="SMS">پیامک</option>
              <option value="IN_PERSON">حضوری</option>
            </select>
          </Field>
        </div>

        <Field label="عنوان">
          <input
            required
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            placeholder="خلاصه موضوع..."
            className="field"
          />
        </Field>

        <Field label="شرح کامل">
          <textarea
            required
            rows="4"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="توضیحات کامل مشکل یا پیشنهاد خود را بنویسید..."
            className="field resize-none"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-black"
        >
          <Send className="w-4 h-4 inline ml-1"/>
          {submitting ? 'در حال ثبت...' : 'ثبت بازخورد'}
        </button>
      </form>

      {/* 📋 تاریخچه بازخوردها با CSAT */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm">تاریخچه بازخوردهای شما</h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showHistory ? 'بستن' : `مشاهده (${toFa(history.length)})`}
            </button>
          </div>

          {showHistory && (
            <div className="space-y-2">
              {history.map(item => {
                // ✅ بررسی کامل شرایط
                const hasCsatLink = item.csatLink && item.csatLink !== null;
                const hasScore = item.score && item.score > 0;
                const isResolved = item.status === 'RESOLVED';
                const canRate = isResolved && hasCsatLink && !hasScore;

                return (
                  <div key={item.id} className="rounded-2xl bg-white border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold">{item.subject}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{formatDateTime(item.createdAt)}</div>
                      </div>
                      <Badge color={statusColors[item.status] || statusColors.OPEN}>
                        {statusLabels[item.status] || item.status}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{item.description}</p>

                    {/* ✅ دکمه CSAT برای بازخوردهای حل‌شده و بدون امتیاز */}
                    {canRate && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-violet-500 fill-violet-500" />
                          <span className="text-xs text-slate-600">به خدمات ما امتیاز دهید</span>
                        </div>
                        <a
                          href={item.csatLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors flex items-center gap-1"
                        >
                          <Star className="w-3 h-3 fill-white" />
                          امتیازدهی
                        </a>
                      </div>
                    )}

                    {/* ✅ نمایش امتیاز ثبت شده */}
                    {hasScore && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          امتیاز شما: {toFa(item.score)} از ۵
                        </span>
                      </div>
                    )}

                    {/* وضعیت حل شده بدون CSAT (امتیاز قبلاً داده شده یا لینک منقضی) */}
                    {isResolved && !hasCsatLink && !hasScore && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          مشکل شما حل شده است
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✅ اضافه کردن لودینگ برای تاریخچه */}
      {loadingHistory && (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin mx-auto"/>
          <p className="text-xs text-slate-400 mt-2">در حال دریافت تاریخچه...</p>
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ──────────────────────────────────────────────────────────────
function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h1 className="text-xl font-black">{title}</h1>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold ${active ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      <Icon className="w-4 h-4"/>
      {item.label}
      {active && <ArrowLeft className="w-3 h-3 mr-auto"/>}
    </button>
  );
}

function RewardMini({ reward }) {
  const Icon = rewardIcons[reward.imageIcon] || Gift;
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
        <Icon className="w-5 h-5"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-black truncate">{reward.title}</div>
        <div className="text-[10px] text-violet-600 mt-1">{toFa(reward.costPoints)} امتیاز</div>
      </div>
      <ChevronLeft className="w-4 h-4 text-slate-300"/>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// BADGE
// ──────────────────────────────────────────────────────────────
function Badge({ color, children }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${color}`}>
      {children}
    </span>
  );
}