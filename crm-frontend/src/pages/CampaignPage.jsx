import { useState, useEffect } from 'react';
import { Send, Megaphone, Users, Trophy, AlertTriangle, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { campaignService } from '../api/api';
import { cn, toFa, formatDateTime } from '../utils/ui';
import { Card, SkeletonCard, Button } from '../components/common/UI';
import { PageHeader } from '../components/common/Breadcrumbs';
import { showToast } from '../utils/toast';
import DeleteCampaignModal from '../components/campaigns/DeleteCampaignModal';

// ─── تنظیمات مخاطب ───
const AUDIENCES = [
  { value: 'ALL_ACTIVE', label: 'همه مشتریان فعال', icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-700' },
  { value: 'GOLD', label: 'مشتریان سطح طلایی', icon: Trophy, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700' },
  { value: 'AT_RISK', label: 'مشتریان در معرض ریزش', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700' },
];

const STATUS_CONFIG = {
  DRAFT:     { label: 'پیش‌نویس', icon: Loader2, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700' },
  SENDING:   { label: 'در حال ارسال', icon: Send, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  COMPLETED: { label: 'تکمیل شده', icon: CheckCircle, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  FAILED:    { label: 'ناموفق', icon: AlertTriangle, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
};

export default function CampaignPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [form, setForm] = useState({ title: '', message: '', audienceType: 'ALL_ACTIVE' });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await campaignService.list();
      const campaignsData = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('خطا در دریافت کمپین‌ها:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      showToast('عنوان و متن پیامک الزامی است', 'warning');
      return;
    }
    setSending(true);
    try {
      await campaignService.create(form);
      showToast('کمپین با موفقیت ارسال شد', 'success');
      setForm({ title: '', message: '', audienceType: 'ALL_ACTIVE' });
      setShowForm(false);
      fetchCampaigns();
    } catch (error) {
      console.error('خطا در ارسال کمپین:', error);
      showToast(error?.message || 'خطا در ارسال کمپین', 'error');
    }
    setSending(false);
  };

  // ===== حذف کمپین =====
  const handleDelete = (campaign) => {
    setSelectedCampaign(campaign);
    setDeleteModalOpen(true);
  };

  const handleDeleteCampaign = async () => {
    try {
      await campaignService.remove(selectedCampaign.id);
      showToast('کمپین با موفقیت حذف شد');
      setDeleteModalOpen(false);
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch (error) {
      console.error('خطا در حذف کمپین:', error);
      showToast(error?.message || 'خطا در حذف کمپین', 'error');
    }
  };

  return (
    <div className='space-y-6 animate-fade-in'>
      <PageHeader
        title="کمپین‌های بازاریابی"
        subtitle="ارسال پیامک گروهی به مشتریان"
        icon={Megaphone}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              showForm
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20'
            )}
          >
            <Plus className='w-4 h-4' />
            {showForm ? 'انصراف' : 'کمپین جدید'}
          </button>
        }
      />

      {/* فرم ایجاد کمپین */}
      {showForm && (
        <Card className='p-5 sm:p-6 border-2 border-dashed border-brand-200 dark:border-brand-800 bg-brand-50/30 dark:bg-brand-900/10'>
          <div className='flex items-center gap-2 mb-5'>
            <div className='w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center'>
              <Megaphone className='w-5 h-5 text-brand-600 dark:text-brand-400' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-slate-900 dark:text-white'>ایجاد کمپین جدید</h3>
              <p className='text-xs text-slate-500 dark:text-slate-400'>پیامک به گروهی از مشتریان ارسال می‌شود</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'>عنوان کمپین</label>
              <input
                type='text'
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder='مثلاً: جشنواره تخفیف نوروز'
                className='w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all placeholder:text-slate-400'
              />
            </div>

            <div>
              <div className='flex items-center justify-between mb-1.5'>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300'>متن پیامک</label>
                <span className={cn('text-xs tnum', form.message.length > 70 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500')}>
                  {toFa(form.message.length)}/۷۰
                </span>
              </div>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder='متن پیامک خود را بنویسید...'
                rows={3}
                className='w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none placeholder:text-slate-400'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>مخاطبان</label>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                {AUDIENCES.map((a) => {
                  const Icon = a.icon;
                  const selected = form.audienceType === a.value;
                  return (
                    <button
                      key={a.value}
                      type='button'
                      onClick={() => setForm((f) => ({ ...f, audienceType: a.value }))}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-right',
                        selected
                          ? `${a.bg} ${a.border}`
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-surface-800'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', selected ? a.bg : 'bg-slate-50 dark:bg-slate-700')}>
                        <Icon className={cn('w-4.5 h-4.5', selected ? a.color : 'text-slate-400 dark:text-slate-500')} />
                      </div>
                      <span className={cn('text-sm font-medium', selected ? a.color : 'text-slate-600 dark:text-slate-300')}>
                        {a.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className='flex items-center gap-3 pt-2'>
              <button
                type='submit'
                disabled={sending || !form.title.trim() || !form.message.trim()}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all',
                  sending || !form.title.trim() || !form.message.trim()
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25'
                )}
              >
                {sending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Send className='w-4 h-4' />}
                {sending ? 'در حال ارسال...' : 'ارسال کمپین'}
              </button>
              <button
                type='button'
                onClick={() => { setShowForm(false); setForm({ title: '', message: '', audienceType: 'ALL_ACTIVE' }); }}
                className='px-4 py-3 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
              >
                انصراف
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* لیست کمپین‌ها */}
      <div className='space-y-3'>
        <h2 className='text-sm font-bold text-slate-700 dark:text-slate-200'>کمپین‌های اخیر</h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className='p-8 text-center'>
            <Megaphone className='w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3' />
            <p className='text-sm text-slate-400 dark:text-slate-500'>هنوز کمپینی ایجاد نشده</p>
          </Card>
        ) : (
          campaigns.map((camp) => {
            const stCfg = STATUS_CONFIG[camp.status] || STATUS_CONFIG.DRAFT;
            const StIcon = stCfg.icon;
            const audienceInfo = AUDIENCES.find((a) => a.value === camp.audienceType);
            const successRate = camp.totalRecipients > 0 ? Math.round((camp.sentCount / camp.totalRecipients) * 100) : 0;

            return (
              <Card key={camp.id} className='p-4 sm:p-5 hover:shadow-md transition-shadow card-lift group'>
                <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <h3 className='text-sm font-bold text-slate-900 dark:text-white truncate'>{camp.title}</h3>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', stCfg.bg, stCfg.color)}>
                        <StIcon className={cn('w-3 h-3', camp.status === 'SENDING' && 'animate-spin')} />
                        {stCfg.label}
                      </span>
                    </div>
                    <p className='text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2'>{camp.message}</p>
                    <div className='flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500'>
                      {audienceInfo && <span className='flex items-center gap-1'>{audienceInfo.label}</span>}
                      <span>{formatDateTime(camp.createdAt)}</span>
                      {camp.creator && <span>توسط {camp.creator.firstName} {camp.creator.lastName}</span>}
                    </div>
                  </div>

                  <div className='flex items-center gap-6 sm:gap-8 shrink-0'>
                    <div className='text-center'>
                      <div className='text-lg font-bold text-slate-900 dark:text-white tnum'>{toFa(camp.sentCount)}</div>
                      <div className='text-[10px] text-slate-400 dark:text-slate-500'>ارسال شده</div>
                    </div>
                    <div className='text-center'>
                      <div className={cn('text-lg font-bold tnum', camp.failedCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white')}>{toFa(camp.failedCount)}</div>
                      <div className='text-[10px] text-slate-400 dark:text-slate-500'>ناموفق</div>
                    </div>
                    <div className='text-center'>
                      <div className='text-lg font-bold text-brand-600 dark:text-brand-400 tnum'>{toFa(successRate)}%</div>
                      <div className='text-[10px] text-slate-400 dark:text-slate-500'>نرخ موفقیت</div>
                    </div>
                  </div>

                  {/* دکمه حذف */}
                  <button
                    onClick={() => handleDelete(camp)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="حذف کمپین"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* مودال حذف */}
      <DeleteCampaignModal
        open={deleteModalOpen}
        campaign={selectedCampaign}
        onClose={() => { setDeleteModalOpen(false); setSelectedCampaign(null); }}
        onConfirm={handleDeleteCampaign}
      />
    </div>
  );
}