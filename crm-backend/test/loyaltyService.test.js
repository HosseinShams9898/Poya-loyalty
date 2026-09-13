const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInvoiceBenefits, conditionMatches } = require('../src/services/loyaltyService');

const settings = {
  purchaseRialPerPoint: 1_000_000,
  cashBonusPoints: 50,
  financialBonusPoints: 20,
};

test('فاکتور نقدی تسویه‌شده امتیاز پایه و دو بونوس می‌گیرد', () => {
  const result = calculateInvoiceBenefits({ amount: 450_000_000n, paymentType: 'CASH', paymentStatus: 'PAID', delayDays: 0, settings });
  assert.equal(result.basePoints, 450);
  assert.equal(result.totalPoints, 520);
  assert.deepEqual(result.entries.map(item => item.code), ['PURCHASE_BASE', 'CASH_BONUS', 'ON_TIME_BONUS']);
});

test('سطح طلایی و بونوس خرید عمده به شکل تجمیعی اعمال می‌شوند', () => {
  const result = calculateInvoiceBenefits({
    amount: '1200000000', paymentType: 'CREDIT', paymentStatus: 'PAID', tierCode: 'GOLD', tierMultiplier: 1.25, settings,
    rules: [{ code: 'HIGH_VALUE', title: 'خرید عمده', isActive: true, stackable: true, conditions: { minAmount: '1000000000' }, action: { type: 'POINTS_FIXED', value: 200 } }],
  });
  assert.equal(result.totalPoints, 1775);
  assert.equal(result.multiplier, 1.25);
});

test('کش‌بک نیم درصد با سقف ریالی و BigInt محاسبه می‌شود', () => {
  const result = calculateInvoiceBenefits({
    amount: 3_000_000_000n, paymentType: 'CASH', paymentStatus: 'PAID', tierCode: 'DIAMOND', settings,
    rules: [{ code: 'VIP_CASHBACK', title: 'کش‌بک', isActive: true, stackable: true, conditions: { paymentType: 'CASH', tierCodes: ['GOLD', 'DIAMOND'] }, action: { type: 'CASHBACK_PERCENT', value: 0.5, cap: '10000000' } }],
  });
  assert.equal(result.walletCredit, 10_000_000n);
});

test('قانون ناسازگار با شرایط فاکتور اجرا نمی‌شود', () => {
  assert.equal(conditionMatches({ paymentType: 'CASH', minAmount: '1000000000' }, { paymentType: 'CREDIT', amount: '2000000000' }), false);
  assert.equal(conditionMatches({ maxDelayDays: 0 }, { delayDays: 4, amount: 0 }), false);
});

test('قانون غیرتجمیعی زنجیره قوانین را متوقف می‌کند', () => {
  const result = calculateInvoiceBenefits({
    amount: 100_000_000n, settings,
    rules: [
      { code: 'FIRST', title: 'اول', isActive: true, stackable: false, conditions: {}, action: { type: 'POINTS_FIXED', value: 30 } },
      { code: 'SECOND', title: 'دوم', isActive: true, stackable: true, conditions: {}, action: { type: 'POINTS_FIXED', value: 999 } },
    ],
  });
  assert.equal(result.totalPoints, 130);
});
