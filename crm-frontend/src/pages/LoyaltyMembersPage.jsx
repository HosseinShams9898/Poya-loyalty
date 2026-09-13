import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, UserPlus, Wallet, Sparkles, Building2, ChevronLeft, ShieldCheck, X } from 'lucide-react';
import { customerService } from '../api/api';
import { PageHeader } from '../components/common/Breadcrumbs';
import { Badge, Card, SkeletonTable, Button, EmptyState } from '../components/common/UI';
import { formatRial, formatDateTime, toFa } from '../utils/ui';
import { showToast } from '../utils/toast';

const statusMap = {
  NEW: ['جدید', 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'],
  ACTIVE: ['فعال', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'],
  IN_RISK: ['در معرض ریزش', 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'],
  CHURNED: ['ریزش کرده', 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'],
};

// ─── مودال افزودن عضو ───
function AddMemberModal({ open, onClose, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    mobile: '',
    company: '',
    customerType: 'CONTRACTOR',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.mobile) {
      showToast('نام و موبایل الزامی است', 'error');
      return;
    }

    setLoading(true);
    try {
      await customerService.create(form);
      showToast('عضو با موفقیت اضافه شد');
      onAdded();
      onClose();
      setForm({ fullName: '', mobile: '', company: '', customerType: 'CONTRACTOR' });
    } catch (err) {
      showToast(err?.message || 'خطا در افزودن عضو', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">افزودن عضو جدید</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نام کامل *</label>
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">موبایل *</label>
            <input
              type="tel"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
              dir="ltr"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">شرکت</label>
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نوع مشتری</label>
            <select
              name="customerType"
              value={form.customerType}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm focus:ring-2 focus:ring-brand-500/30 outline-none text-slate-900 dark:text-white"
            >
              <option value="CONTRACTOR">پیمانکار</option>
              <option value="REPRESENTATIVE">نماینده</option>
              <option value="END_CUSTOMER">مشتری نهایی</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'در حال ثبت...' : 'افزودن عضو'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── صفحه اصلی ───
export default function LoyaltyMembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await customerService.list({ pageSize: 100 });
      setMembers(response?.data?.items || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = useMemo(() => members.filter((member) => {
    const query = search.trim();
    const matchesSearch = !query || [member.fullName, member.mobile, member.company, member.membershipNo].some(value => value?.includes(query));
    return matchesSearch && (status === 'ALL' || member.status === status);
  }), [members, search, status]);

  const totals = useMemo(() => ({
    active: members.filter(m => m.status === 'ACTIVE').length,
    points: members.reduce((sum, m) => sum + Number(m.totalPoints || 0), 0),
    wallet: members.reduce((sum, m) => sum + Number(m.walletBalance || 0), 0),
  }), [members]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="اعضای باشگاه"
        subtitle="شناخت، سطح‌بندی و مدیریت ارزش هر عضو"
        icon={Users}
        actions={
          <Button icon={UserPlus} onClick={() => setAddModalOpen(true)}>
            عضو جدید
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Users} label="کل اعضا" value={toFa(members.length)} color="sky" />
        <MiniStat icon={ShieldCheck} label="اعضای فعال" value={toFa(totals.active)} color="emerald" />
        <MiniStat icon={Sparkles} label="مانده امتیاز" value={toFa(totals.points)} color="amber" />
        <MiniStat icon={Wallet} label="تعهد کیف پول" value={`${formatRial(totals.wallet)} ریال`} color="violet" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو نام، شرکت، موبایل یا شماره عضویت..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {[['ALL', 'همه'], ['ACTIVE', 'فعال'], ['NEW', 'جدید'], ['IN_RISK', 'در معرض ریزش'], ['CHURNED', 'ریزش‌کرده']].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${status === value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="عضوی پیدا نشد" description="عبارت جستجو یا فیلتر را تغییر دهید." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                  {['عضو', 'شماره عضویت', 'سطح', 'امتیاز', 'کیف پول', 'وضعیت ارتباط', 'آخرین فعالیت', ''].map(title => (
                    <th key={title} className="text-right px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-300">{title}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(member => {
                  const st = statusMap[member.status] || statusMap.NEW;
                  return (
                    <tr
                      key={member.id}
                      onClick={() => navigate(`/members/${member.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center font-black">
                            {member.fullName?.[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{member.fullName}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              {member.company || 'بدون شرکت'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500" dir="ltr">{member.membershipNo || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 font-bold text-xs" style={{ color: member.tier?.color }}>
                          <i className="w-2 h-2 rounded-full" style={{ backgroundColor: member.tier?.color }} />
                          {member.tier?.title || 'همراه'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900 dark:text-white">{toFa(member.totalPoints || 0)}</div>
                        <div className="text-[10px] text-slate-400">از {toFa(member.lifetimePoints || member.totalPoints || 0)} کل</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatRial(member.walletBalance || 0)}</td>
                      <td className="px-4 py-3"><Badge color={st[1]}>{st[0]}</Badge></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(member.lastActivityAt || member.updatedAt)}</td>
                      <td className="px-4 py-3"><ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-brand-500" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AddMemberModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={fetchMembers}
      />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  const colors = {
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
  };
  return (
    <Card className="p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 truncate">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </Card>
  );
}