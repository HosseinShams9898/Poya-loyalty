import { useEffect, useMemo, useState } from 'react';
import { Crown, Gem, Sparkles, TrendingUp, Users, Check, ArrowLeft, Plus } from 'lucide-react';
import { loyaltyAdminService } from '../api/api';
import { PageHeader } from '../components/common/Breadcrumbs';
import { Card, SkeletonCard, Button } from '../components/common/UI';
import { toFa } from '../utils/ui';
import TierFormModal from '../components/tiers/TierFormModal';

export default function LoyaltyTiersPage() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchTiers = () => {
    setLoading(true);
    loyaltyAdminService.getTiers()
      .then(r => {
        let tiersData = [];
        if (Array.isArray(r?.data)) {
          tiersData = r.data;
        } else if (r?.data?.items) {
          tiersData = r.data.items;
        } else if (Array.isArray(r)) {
          tiersData = r;
        }
        console.log('📊 Tiers data:', tiersData);
        setTiers(tiersData);
      })
      .catch(err => {
        console.error('Error fetching tiers:', err);
        setTiers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchTiers, []);

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.sortOrder - b.sortOrder), [tiers]);
  const contractorTiers = sorted.filter(tier => (tier.audienceType || 'CONTRACTOR') === 'CONTRACTOR');
  const representativeTiers = sorted.filter(tier => tier.audienceType === 'REPRESENTATIVE');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="سطوح عضویت" 
        subtitle="مسیر رشد اعضا و مزایای قابل لمس در هر سطح" 
        icon={Crown} 
        actions={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            تعریف سطح جدید
          </Button>
        } 
      />

      <Card className="p-5 sm:p-6 overflow-hidden relative bg-slate-950 text-white border-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(14,165,233,.28),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(124,58,237,.3),transparent_32%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="text-xs text-sky-200 font-bold mb-2">نردبان وفاداری</div>
            <h2 className="text-xl sm:text-2xl font-black">هر خرید، عضو را به مزیت بعدی نزدیک می‌کند</h2>
            <p className="text-sm text-slate-300 mt-2 leading-7">سطح‌بندی بر اساس امتیاز طول عمر انجام می‌شود؛ ضریب کسب امتیاز و مزایا با رشد عضو بیشتر می‌شود.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <HeroStat label="سطح فعال" value={toFa(sorted.length)} />
            <HeroStat label="اعضای سطح‌بندی‌شده" value={toFa(sorted.reduce((s, t) => s + Number(t._count?.customers || t.members || 0), 0))} />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="space-y-7">
          <TierGroup title="مسیر پیمانکاران" subtitle="پایه، نقره‌ای، طلایی و ویژه" tiers={contractorTiers} />
          <TierGroup title="مسیر نمایندگان" subtitle="C، B، A و ممتاز" tiers={representativeTiers} />
        </div>
      )}

      <Card className="p-5">
        <h3 className="font-bold text-slate-900 dark:text-white">منطق پیشنهادی ارتقای سطح</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-7">ارتقا بلافاصله پس از عبور از حد امتیاز طول عمر و در مسیر متناسب با نوع مشتری انجام می‌شود؛ پیمانکار هرگز وارد سطوح نمایندگی نمی‌شود و بالعکس.</p>
      </Card>

      {/* مودال تعریف سطح جدید */}
      <TierFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchTiers}
      />
    </div>
  );
}

function TierGroup({ title, subtitle, tiers }) {
  // اگر tiers آرایه نباشه یا خالی باشه
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return (
      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-black text-slate-900 dark:text-white">{title}</h2>
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          </div>
          <span className="text-xs font-bold text-slate-500">۰ سطح</span>
        </div>
        <Card className="p-8 text-center text-slate-400 text-sm">
          هیچ سطحی برای این مسیر تعریف نشده است
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="font-black text-slate-900 dark:text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <span className="text-xs font-bold text-slate-500">{toFa(tiers.length)} سطح</span>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {tiers.map((tier, index) => {
          const next = tiers[index + 1];
          // Parse benefits
          let benefits = [];
          try {
            benefits = typeof tier.benefits === 'string' ? JSON.parse(tier.benefits) : (tier.benefits || []);
          } catch {
            benefits = [];
          }

          return (
            <Card key={tier.id} className="overflow-hidden card-lift flex flex-col">
              <div className="h-2" style={{ backgroundColor: tier.color || '#64748B' }} />
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${tier.color || '#64748B'}, ${tier.color || '#64748B'}bb)` }}>
                    {index === tiers.length - 1 ? <Gem className="w-6 h-6" /> : <Crown className="w-6 h-6" />}
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">فعال</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-4">{tier.title}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-5">{tier.description || ''}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Metric label="شروع از" value={`${toFa(tier.minPoints)} امتیاز`} />
                  <Metric label="ضریب کسب" value={`${toFa(tier.multiplier)}×`} />
                </div>
                <div className="mt-5 space-y-2.5">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: tier.color || '#64748B' }}>
                        <Check className="w-2.5 h-2.5" />
                      </span>
                      {typeof benefit === 'string' ? benefit : benefit.title || benefit}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {toFa(tier._count?.customers || tier.members || 0)} عضو
                </span>
                {next ? (
                  <span className="font-bold flex items-center gap-1" style={{ color: next.color || '#64748B' }}>
                    تا {next.title} <ArrowLeft className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="font-bold text-violet-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> بالاترین سطح
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/10 p-3 min-w-32">
      <div className="text-xl font-black">{value}</div>
      <div className="text-[11px] text-slate-300 mt-1">{label}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-xs font-black text-slate-800 dark:text-white mt-1">{value}</div>
    </div>
  );
}