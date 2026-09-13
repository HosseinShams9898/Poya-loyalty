import { useEffect, useState } from 'react';
import { Database, RefreshCw, PlugZap, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { integrationService } from '../api/api';

export default function SepidarIntegrationPage(){
  const [status,setStatus]=useState(null); const [busy,setBusy]=useState(''); const [result,setResult]=useState(null); const [error,setError]=useState('');
  const load=async()=>{try{const r=await integrationService.status();setStatus(r.data||r)}catch(e){setError(e.message)}};
  useEffect(()=>{load()},[]);
  const run=async(type,fn)=>{setBusy(type);setError('');setResult(null);try{const r=await fn();setResult(r.data||r);await load()}catch(e){setError(e.message)}finally{setBusy('')}};
  return <div className="p-4 md:p-6 space-y-5" dir="rtl">
    <div><h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Database className="w-6 h-6"/>اتصال به حسابداری سپیدار</h1><p className="text-sm text-slate-500 mt-1">همگام‌سازی امن مشتریان و فاکتورهای فروش با وب‌سرویس رسمی سپیدار</p></div>
    <div className="grid md:grid-cols-4 gap-3">
      <Card label="روش اتصال" value="REST API / JSON" icon={PlugZap}/><Card label="نسخه API" value={status?.generationVersion||112} icon={ShieldCheck}/><Card label="Integration ID" value={status?.integrationId||'تنظیم نشده'} icon={Database}/><Card label="وضعیت تنظیمات" value={status?.configured?'کامل':'ناقص'} icon={status?.configured?CheckCircle2:AlertTriangle}/>
    </div>
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-900 p-5">
      <div className="text-sm font-black mb-3">تنظیمات اتصال</div>
      <div className="grid md:grid-cols-2 gap-3 text-xs"><Info k="آدرس سرویس" v={status?.baseURL||'-'}/><Info k="حالت" v="فقط خواندن از سپیدار"/><Info k="ثبت مشتری" v="بر اساس شناسه حسابداری + موبایل"/><Info k="ثبت فاکتور" v="ضدتکرار با InvoiceID سپیدار"/></div>
      {!status?.configured&&<div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs leading-6">برای اتصال واقعی، مقادیر SEPIDAR_INTEGRATION_ID، SEPIDAR_USERNAME، SEPIDAR_PASSWORD و SEPIDAR_PUBLIC_KEY_XML در فایل env سرور تکمیل شوند.</div>}
    </div>
    <div className="grid md:grid-cols-4 gap-3">
      <Btn disabled={busy} onClick={()=>run('test',integrationService.test)} icon={PlugZap} text={busy==='test'?'در حال تست...':'تست اتصال'}/>
      <Btn disabled={busy} onClick={()=>run('customers',integrationService.syncCustomers)} icon={RefreshCw} text={busy==='customers'?'در حال دریافت...':'همگام‌سازی مشتریان'}/>
      <Btn disabled={busy} onClick={()=>run('invoices',integrationService.syncInvoices)} icon={RefreshCw} text={busy==='invoices'?'در حال دریافت...':'همگام‌سازی فاکتورها'}/>
      <Btn disabled={busy} onClick={()=>run('all',integrationService.syncAll)} icon={RefreshCw} text={busy==='all'?'در حال همگام‌سازی...':'همگام‌سازی کامل'}/>
    </div>
    {error&&<div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs">{error}</div>}
    {result&&<pre className="p-4 rounded-2xl bg-slate-950 text-emerald-300 text-xs overflow-auto direction-ltr text-left">{JSON.stringify(result,null,2)}</pre>}
  </div>
}
function Card({label,value,icon:Icon}){return <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-900 p-4"><Icon className="w-5 h-5 text-slate-500 mb-3"/><div className="text-[10px] text-slate-400">{label}</div><div className="text-sm font-black mt-1 text-slate-900 dark:text-white">{String(value)}</div></div>}
function Info({k,v}){return <div className="flex justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><span className="text-slate-500">{k}</span><b className="text-slate-800 dark:text-white break-all">{v}</b></div>}
function Btn({onClick,disabled,icon:Icon,text}){return <button disabled={disabled} onClick={onClick} className="p-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"><Icon className="w-4 h-4"/>{text}</button>}
