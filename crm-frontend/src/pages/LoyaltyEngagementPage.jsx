import { useEffect, useMemo, useState } from 'react';
import { Target, UsersRound, UserPlus, Repeat2, BadgeCheck, Plus, ArrowUpLeft, Activity, Pencil, Trash2 } from 'lucide-react';
import { loyaltyAdminService } from '../api/api';
import { PageHeader } from '../components/common/Breadcrumbs';
import { Badge, Button, Card, SkeletonCard } from '../components/common/UI';
import { toFa } from '../utils/ui';
import { showToast } from '../utils/toast';
import MissionFormModal from '../components/engagement/MissionFormModal';
import SegmentFormModal from '../components/engagement/SegmentFormModal';
import DeleteMissionModal from '../components/engagement/DeleteMissionModal';
import DeleteSegmentModal from '../components/engagement/DeleteSegmentModal';
import { useNavigate } from 'react-router-dom';

const missionIcons = { PURCHASE_COUNT: Repeat2, PURCHASE_AMOUNT: Target, REFERRAL: UserPlus, PROFILE: BadgeCheck };

// ============================================================
// تابع تبدیل معیارهای JSON به متن خوانا با وضعیت‌های فارسی
// ============================================================
function formatCriteria(criteria) {
  if (!criteria) return 'همه اعضا';
  
  let obj = criteria;
  if (typeof criteria === 'string') {
    try {
      obj = JSON.parse(criteria);
    } catch {
      return criteria;
    }
  }
  
  // 🔄 تبدیل مقادیر وضعیت به فارسی
  const statusMap = {
    'ACTIVE': 'فعال',
    'IN_RISK': 'در معرض ریزش',
    'CHURNED': 'ریزش کرده',
    'NEW': 'جدید',
    'SUSPENDED': 'معلق',
    'CLOSED': 'بسته شده',
  };
  
  const labels = {
    status: 'وضعیت',
    memberStatus: 'وضعیت عضویت',
    minLifetimePoints: 'حداقل امتیاز طول عمر',
    maxLifetimePoints: 'حداکثر امتیاز طول عمر',
    minTotalPurchase: 'حداقل مبلغ خرید',
    maxDaysSinceLast: 'حداکثر روز از آخرین فعالیت',
    minInvoicesCount: 'حداقل تعداد فاکتور',
    maxInvoicesCount: 'حداکثر تعداد فاکتور',
  };
  
  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      const label = labels[key] || key;
      // 🔄 اگر مقدار یک وضعیت بود، به فارسی تبدیل کن
      let displayValue = value;
      if (key === 'status' || key === 'memberStatus') {
        displayValue = statusMap[value] || value;
      }
      parts.push(`${label}: ${displayValue}`);
    }
  }
  
  return parts.length > 0 ? parts.join(' | ') : 'همه اعضا';
}

export default function LoyaltyEngagementPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('missions');
  const [missions, setMissions] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  
  // States for modals
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [missionEditModalOpen, setMissionEditModalOpen] = useState(false);
  const [missionDeleteModalOpen, setMissionDeleteModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [segmentEditModalOpen, setSegmentEditModalOpen] = useState(false);
  const [segmentDeleteModalOpen, setSegmentDeleteModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      loyaltyAdminService.getMissions(),
      loyaltyAdminService.getSegments()
    ]).then(([a, b]) => {
      let missionsData = Array.isArray(a?.data) ? a.data : (a?.data?.items || []);
      let segmentsData = Array.isArray(b?.data) ? b.data : (b?.data?.items || []);
      setMissions(missionsData);
      setSegments(segmentsData);
    }).catch(err => {
      console.error('Error fetching data:', err);
      setMissions([]);
      setSegments([]);
    }).finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const participation = useMemo(() => missions.reduce((s, m) => s + Number(m._count?.participants || 0), 0), [missions]);

  // ===== Mission handlers =====
  const handleMissionEdit = (mission) => {
    setSelectedMission(mission);
    setMissionEditModalOpen(true);
  };

  const handleMissionDelete = (mission) => {
    setSelectedMission(mission);
    setMissionDeleteModalOpen(true);
  };

  const handleMissionDeleteConfirm = async () => {
    try {
      await loyaltyAdminService.deleteMission(selectedMission.id);
      await fetchData();
      setMissionDeleteModalOpen(false);
      setSelectedMission(null);
      showToast('مأموریت با موفقیت حذف شد');
    } catch (error) {
      console.error('Error deleting mission:', error);
      showToast(error?.message || 'خطا در حذف مأموریت', 'error');
    }
  };

  // ===== Segment handlers =====
  const handleSegmentEdit = (segment) => {
    setSelectedSegment(segment);
    setSegmentEditModalOpen(true);
  };

  const handleSegmentDelete = (segment) => {
    setSelectedSegment(segment);
    setSegmentDeleteModalOpen(true);
  };

  const handleSegmentDeleteConfirm = async () => {
    try {
      await loyaltyAdminService.deleteSegment(selectedSegment.id);
      await fetchData();
      setSegmentDeleteModalOpen(false);
      setSelectedSegment(null);
      showToast('بخش با موفقیت حذف شد');
    } catch (error) {
      console.error('Error deleting segment:', error);
      showToast(error?.message || 'خطا در حذف بخش', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="تعامل و شخصی‌سازی" 
        subtitle="مأموریت‌های انگیزشی و بخش‌بندی هوشمند اعضا" 
        icon={Target} 
        actions={
          <Button 
            icon={Plus} 
            onClick={() => tab === 'missions' ? setMissionModalOpen(true) : setSegmentModalOpen(true)}
          >
            {tab === 'missions' ? 'مأموریت جدید' : 'بخش جدید'}
          </Button>
        } 
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <QuickStat icon={Target} value={toFa(missions.length)} label="مأموریت فعال" color="violet" />
        <QuickStat icon={Activity} value={toFa(participation)} label="مشارکت ثبت‌شده" color="emerald" />
        <QuickStat icon={UsersRound} value={toFa(segments.length)} label="بخش هدف" color="sky" />
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <Tab active={tab === 'missions'} onClick={() => setTab('missions')}>مأموریت‌ها</Tab>
        <Tab active={tab === 'segments'} onClick={() => setTab('segments')}>بخش‌های مشتری</Tab>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i}/>)}</div>
      ) : tab === 'missions' ? (
        <div className="grid md:grid-cols-2 gap-4">
          {missions.map(m => {
            const Icon = missionIcons[m.actionType] || Target;
            const progress = Number(m.participants?.[0]?.progress || 0);
            const pct = Math.min(100, Math.round(progress / Number(m.targetValue || 1) * 100));
            return (
              <div key={m.id} className="group relative">
                <Card className="p-5 card-lift">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <Icon className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between gap-2">
                        <h3 className="font-black text-slate-900 dark:text-white">{m.title}</h3>
                        <Badge color={m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                          {m.isActive ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-6">{m.description}</p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">نمونه پیشرفت عضو</span>
                      <b className="text-violet-600">{toFa(pct)}٪</b>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-violet-500 to-fuchsia-500" style={{ width: `${pct}%` }}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <Fact label="هدف" value={toFa(m.targetValue)} />
                    <Fact label="پاداش" value={`${toFa(m.rewardPoints)} امتیاز`} />
                    <Fact label="مشارکت" value={toFa(m._count?.participants || 0)} />
                  </div>
                </Card>
                
                {/* دکمه‌های Edit و Delete - روی هاور نمایش داده میشن */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMissionEdit(m)}
                    className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    title="ویرایش مأموریت"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMissionDelete(m)}
                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    title="حذف مأموریت"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {segments.map(segment => (
            <div key={segment.id} className="group relative">
              <Card className="p-5 card-lift">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: segment.color || '#0EA5E9' }}>
                    <UsersRound className="w-5 h-5"/>
                  </div>
                  <Badge>{segment.isDynamic ? 'پویا' : 'دستی'}</Badge>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white mt-4">{segment.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-6 min-h-12">{segment.description}</p>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-black" style={{ color: segment.color || '#0EA5E9' }}>
                      {toFa(segment.memberCount || 0)}
                    </div>
                    <div className="text-[10px] text-slate-400">عضو در این بخش</div>
                  </div>
                  <button 
  onClick={() => navigate(`/campaigns`)}
  className="text-xs font-bold text-brand-600 flex items-center gap-1"
>
  ساخت پیشنهاد <ArrowUpLeft className="w-3.5 h-3.5"/>
</button>
                </div>
                
                {/* ✅ نمایش معیار عضویت به صورت خوانا با وضعیت‌های فارسی */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-[10px] text-slate-400 mb-1">معیار عضویت</div>
                  <code className="text-[10px] text-slate-600 dark:text-slate-300 break-all" dir="ltr">
                    {formatCriteria(segment.criteria)}
                  </code>
                </div>
              </Card>
              
              {/* دکمه‌های Edit و Delete - روی هاور نمایش داده میشن */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleSegmentEdit(segment)}
                  className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  title="ویرایش بخش"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleSegmentDelete(segment)}
                  className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  title="حذف بخش"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals for Missions */}
      <MissionFormModal
        open={missionModalOpen}
        onClose={() => setMissionModalOpen(false)}
        onSuccess={fetchData}
      />

      <MissionFormModal
        open={missionEditModalOpen}
        mission={selectedMission}
        onClose={() => { setMissionEditModalOpen(false); setSelectedMission(null); }}
        onSuccess={() => {
          setMissionEditModalOpen(false);
          setSelectedMission(null);
          fetchData();
        }}
      />

      <DeleteMissionModal
        open={missionDeleteModalOpen}
        mission={selectedMission}
        onClose={() => { setMissionDeleteModalOpen(false); setSelectedMission(null); }}
        onConfirm={handleMissionDeleteConfirm}
      />

      {/* Modals for Segments */}
      <SegmentFormModal
        open={segmentModalOpen}
        onClose={() => setSegmentModalOpen(false)}
        onSuccess={fetchData}
      />

      <SegmentFormModal
        open={segmentEditModalOpen}
        segment={selectedSegment}
        onClose={() => { setSegmentEditModalOpen(false); setSelectedSegment(null); }}
        onSuccess={() => {
          setSegmentEditModalOpen(false);
          setSelectedSegment(null);
          fetchData();
        }}
      />

      <DeleteSegmentModal
        open={segmentDeleteModalOpen}
        segment={selectedSegment}
        onClose={() => { setSegmentDeleteModalOpen(false); setSelectedSegment(null); }}
        onConfirm={handleSegmentDeleteConfirm}
      />
    </div>
  );
}

function Tab({ active, children, ...props }) {
  return (
    <button 
      {...props} 
      className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${active ? 'border-brand-500 text-brand-600 dark:text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-xs font-black text-slate-800 dark:text-white mt-1">{value}</div>
    </div>
  );
}

function QuickStat({ icon: Icon, value, label, color }) {
  const c = { 
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300'
  }[color];
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c}`}>
        <Icon className="w-4 h-4"/>
      </div>
      <div>
        <div className="text-xl font-black text-slate-900 dark:text-white">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </Card>
  );
}