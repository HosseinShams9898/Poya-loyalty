const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzePurchasePattern } = require('../src/services/retentionService');
const { millisecondsUntil } = require('../src/services/schedulerService');

test('marks customer at risk after 1.5x the normal purchase interval', () => {
  const result = analyzePurchasePattern(
    ['2026-01-01T00:00:00Z', '2026-01-21T00:00:00Z', '2026-02-10T00:00:00Z'],
    new Date('2026-03-13T00:00:00Z'),
    { inRiskMultiplier: 1.5, churnMultiplier: 2.5 },
  );
  assert.equal(result.avgDaysBetween, 20);
  assert.equal(result.thresholdDays, 30);
  assert.equal(result.daysSinceLast, 31);
  assert.equal(result.status, 'IN_RISK');
});

test('marks customer churned after 2.5x the normal purchase interval', () => {
  const result = analyzePurchasePattern(
    ['2026-01-01T00:00:00Z', '2026-01-11T00:00:00Z', '2026-01-21T00:00:00Z'],
    new Date('2026-02-20T00:00:00Z'),
    { inRiskMultiplier: 1.5, churnMultiplier: 2.5 },
  );
  assert.equal(result.status, 'CHURNED');
  assert.equal(result.churnDays, 25);
});

test('scheduler calculates the next local 02:00 run', () => {
  const now = new Date(2026, 7, 14, 1, 30, 0, 0);
  assert.equal(millisecondsUntil(2, 0, now), 30 * 60 * 1000);
  const after = new Date(2026, 7, 14, 2, 30, 0, 0);
  assert.equal(millisecondsUntil(2, 0, after), 23.5 * 60 * 60 * 1000);
});
