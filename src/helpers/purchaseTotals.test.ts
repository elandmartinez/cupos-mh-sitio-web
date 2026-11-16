import { describe, expect, it } from 'vitest';
import { computePurchaseTotals } from './purchaseTotals';

const amount = (value: number | null) => ({ amount: value });

describe('computePurchaseTotals', () => {
  it('sums payments and extra fees separately', () => {
    const totals = computePurchaseTotals([amount(40), amount(25)], [amount(15)], 100);
    expect(totals.amount_paid_so_far).toBe(65);
    expect(totals.extra_charges_total).toBe(15);
  });

  it('treats null amounts and a null fee as zero', () => {
    const totals = computePurchaseTotals([amount(null)], [amount(null)], null);
    expect(totals.amount_paid_so_far).toBe(0);
    expect(totals.extra_charges_total).toBe(0);
    expect(totals.is_fully_paid).toBe(false);
  });

  it('is fully paid when received covers the agreed fee', () => {
    expect(computePurchaseTotals([amount(100)], [], 100).is_fully_paid).toBe(true);
  });

  it('counts an extra fee as owed, not received', () => {
    const totals = computePurchaseTotals([amount(100)], [amount(15)], 100);
    expect(totals.extra_charges_total).toBe(15);
    expect(totals.amount_paid_so_far).toBe(100);
    expect(totals.is_fully_paid).toBe(false); // 115 owed, 100 paid
  });

  it('stays pending when nothing is owed', () => {
    expect(computePurchaseTotals([], [], null).is_fully_paid).toBe(false);
  });
});
