/**
 * Settings Service — مدیریت تنظیمات سیستم
 * 
 * ضرایب امتیازدهی از دیتابیس خوانده می‌شوند، نه کد سخت‌کد شده.
 * این امکان را می‌دهد مدیر بازاریابی بدون نیاز به برنامه‌نویس
 * قوانین را تغییر دهد.
 */

const prisma = require('../lib/prisma');

// ─── کلیدهای پیش‌فرض ───
const DEFAULT_SETTINGS = {
  // قوانین امتیازدهی
  purchaseRialPerPoint:       { value: '1000000',       label: 'ریال خرید به ازای هر امتیاز',             group: 'loyalty' },
  cashBonusPoints:            { value: '50',            label: 'امتیاز اضافه خرید نقدی',                    group: 'loyalty' },
  financialBonusPoints:      { value: '20',            label: 'امتیاز اضافه پرداخت بدون تاخیر',           group: 'loyalty' },
  walletConversionThreshold: { value: '1000',          label: 'حداقل امتیاز برای تبدیل به ریال',          group: 'loyalty' },
  walletRialPerConversion:   { value: '500000',        label: 'ریال به ازای هر تبدیل کیف پول',            group: 'loyalty' },
  pointExpiryDays:            { value: '365',           label: 'مدت اعتبار امتیاز (روز)',                  group: 'loyalty' },
  referralRewardPoints:      { value: '250',           label: 'پاداش معرفی موفق',                         group: 'loyalty' },
  projectReferralPoints:     { value: '300',           label: 'پاداش معرفی پروژه تأییدشده',               group: 'loyalty' },
  churnInRiskMultiplier:     { value: '1.5',           label: 'ضریب هشدار ریزش',                           group: 'retention' },
  churnConfirmedMultiplier:  { value: '2.5',           label: 'ضریب ریزش قطعی',                            group: 'retention' },
  churnInactiveDays:         { value: '90',            label: 'حد غیرفعالی مشتری تک‌خرید (روز)',           group: 'retention' },
  reactivationWindowSize:    { value: '250',           label: 'ظرفیت پنجره فعال‌سازی مجدد',                group: 'retention' },
  memberOtpExpiryMinutes:    { value: '3',             label: 'اعتبار رمز یک‌بارمصرف عضو (دقیقه)',        group: 'member' },
  // CSAT
  csatTokenExpiryDays:       { value: '7',             label: 'مهلت لینک CSAT (روز)',                     group: 'csat' },
  csatLowScoreThreshold:     { value: '2',             label: 'آستانه امتیاز پایین CSAT',                  group: 'csat' },
};

/**
 * دریافت یک تنظیم
 * اگر وجود نداشت → پیش‌فرض برگردان
 */
async function get(key, db = prisma) {
  const setting = await db.setting.findUnique({ where: { key } });
  if (setting) return setting.value;
  const def = DEFAULT_SETTINGS[key];
  return def ? def.value : null;
}

/**
 * دریافت تنظیمات یک گروه (مثلاً loyalty)
 * خروجی: { purchaseRialPerPoint: '1000000', ... }
 */
async function getGroup(group, db = prisma) {
  const dbSettings = await db.setting.findMany({ where: { group } });
  const result = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (DEFAULT_SETTINGS[key].group !== group) continue;
    const found = dbSettings.find((s) => s.key === key);
    result[key] = found ? found.value : DEFAULT_SETTINGS[key].value;
  }
  return result;
}

/**
 * دریافت تمام تنظیمات (گروه‌بندی شده)
 */
async function getAll() {
  const dbSettings = await prisma.setting.findMany();
  const result = {};
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const found = dbSettings.find((s) => s.key === key);
    if (!result[def.group]) result[def.group] = [];
    result[def.group].push({
      key,
      value: found ? found.value : def.value,
      label: def.label,
      isCustom: !!found, // آیا کاربر تغییر داده
    });
  }
  return result;
}

/**
 * بروزرسانی تنظیمات (فقط ADMIN)
 * @param {object} data — { key: value, ... }
 */
async function updateGroup(group, data) {
  const results = [];
  for (const [key, value] of Object.entries(data)) {
    // بررسی وجود کلید
    if (!DEFAULT_SETTINGS[key] || DEFAULT_SETTINGS[key].group !== group) continue;
    // upsert
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value), label: DEFAULT_SETTINGS[key].label, group },
    });
    results.push(setting);
  }
  return results;
}

/**
 * دریافت قوانین امتیازدهی به صورت عددی
 * این تابع جایگزین مقادیر سخت‌کد شده در محاسبه امتیاز است.
 */
async function getLoyaltyRules(db = prisma) {
  const settings = await getGroup('loyalty', db);
  return {
    purchaseRialPerPoint:       parseInt(settings.purchaseRialPerPoint, 10)       || 1000000,
    cashBonusPoints:            parseInt(settings.cashBonusPoints, 10)            || 50,
    financialBonusPoints:      parseInt(settings.financialBonusPoints, 10)      || 20,
    walletConversionThreshold: parseInt(settings.walletConversionThreshold, 10) || 1000,
    walletRialPerConversion:   parseInt(settings.walletRialPerConversion, 10)   || 500000,
    pointExpiryDays:            parseInt(settings.pointExpiryDays, 10)            || 365,
    referralRewardPoints:      parseInt(settings.referralRewardPoints, 10)       || 250,
    projectReferralPoints:     parseInt(settings.projectReferralPoints, 10)      || 300,
  };
}

module.exports = {
  get,
  getGroup,
  getAll,
  updateGroup,
  getLoyaltyRules,
  DEFAULT_SETTINGS,
};
