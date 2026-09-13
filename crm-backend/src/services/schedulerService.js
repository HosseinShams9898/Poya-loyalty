const retentionService = require('./retentionService');
const loyaltyService = require('./loyaltyService');

const DAY_MS = 86_400_000;
let timer = null;
let interval = null;

async function runNightlyJobs() {
  const startedAt = new Date();
  console.log(`[scheduler] شروع تحلیل شبانه در ${startedAt.toISOString()}`);
  const [retention, expiry] = await Promise.allSettled([
    retentionService.runRetentionAnalysis(startedAt),
    loyaltyService.expireDuePoints(startedAt),
  ]);
  if (retention.status === 'rejected') console.error('[scheduler/retention]', retention.reason?.message);
  if (expiry.status === 'rejected') console.error('[scheduler/expiry]', expiry.reason?.message);
  return { retention, expiry };
}

function millisecondsUntil(hour = 2, minute = 0, now = new Date()) {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function startScheduler() {
  if (timer || interval || process.env.ENABLE_SCHEDULER === 'false' || process.env.NODE_ENV === 'test') return;
  const delay = millisecondsUntil(2, 0);
  timer = setTimeout(async () => {
    await runNightlyJobs();
    interval = setInterval(runNightlyJobs, DAY_MS);
    interval.unref?.();
  }, delay);
  timer.unref?.();
  console.log(`[scheduler] تحلیل ریزش و انقضای امتیاز برای ساعت 02:00 برنامه‌ریزی شد`);
}

function stopScheduler() {
  if (timer) clearTimeout(timer);
  if (interval) clearInterval(interval);
  timer = null;
  interval = null;
}

module.exports = { millisecondsUntil, runNightlyJobs, startScheduler, stopScheduler };
