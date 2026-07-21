import { describe, it, expect } from 'vitest';
import {
  estimateTaxes,
  federalTax,
  lookupState,
  MEDICARE_RATE,
  SOCIAL_SECURITY_RATE,
  type TaxInputs,
} from './tax';

function makeInputs(overrides: Partial<TaxInputs> = {}): TaxInputs {
  return {
    grossMonthlyIncome: 8000,
    monthsWorked: 3,
    filingStatus: 'single',
    workState: 'WA',
    homeState: 'WA',
    ...overrides,
  };
}

describe('federalTax', () => {
  it('is zero for zero or negative taxable income', () => {
    expect(federalTax(0, 'single')).toBe(0);
    expect(federalTax(-5000, 'single')).toBe(0);
  });

  it('taxes entirely within the 10% bracket at 10%', () => {
    // $10,000 < single 10% bound ($11,925)
    expect(federalTax(10_000, 'single')).toBeCloseTo(1000, 6);
  });

  it('applies brackets marginally across the 10% and 12% bands', () => {
    // $20,000 single: 11,925 @ 10% + (20,000-11,925) @ 12%
    const expected = 11_925 * 0.1 + (20_000 - 11_925) * 0.12;
    expect(federalTax(20_000, 'single')).toBeCloseTo(expected, 6);
  });

  it('married brackets are wider than single', () => {
    expect(federalTax(20_000, 'married_jointly')).toBeLessThan(
      federalTax(20_000, 'single'),
    );
  });
});

describe('lookupState', () => {
  it('marks no-income-tax states exactly', () => {
    const wa = lookupState('WA');
    expect(wa.kind).toBe('none');
    expect(wa.rate).toBe(0);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(lookupState(' ca ').code).toBe('CA');
  });

  it('returns an unknown entry (rate 0) for unmodeled codes', () => {
    const zz = lookupState('ZZ');
    expect(zz.kind).toBe('unknown');
    expect(zz.rate).toBe(0);
  });

  it('treats empty input as unspecified', () => {
    expect(lookupState('').kind).toBe('unknown');
    expect(lookupState(undefined).kind).toBe('unknown');
  });
});

describe('estimateTaxes — annualization / over-withholding', () => {
  it('computes gross earned vs. annualized gross', () => {
    const r = estimateTaxes(makeInputs({ grossMonthlyIncome: 8000, monthsWorked: 3 }));
    expect(r.actualGrossEarned).toBe(24_000);
    expect(r.annualizedGross).toBe(96_000);
  });

  it('withholds more federal tax than is actually owed (refund) for a short internship', () => {
    const r = estimateTaxes(makeInputs({ grossMonthlyIncome: 8000, monthsWorked: 3 }));
    expect(r.federalWithheld).toBeGreaterThan(r.federalActuallyOwed);
    expect(r.federalRefund).toBeCloseTo(r.federalWithheld - r.federalActuallyOwed, 6);
    expect(r.federalRefund).toBeGreaterThan(0);
  });

  it('flags the likely federal refund in the notes', () => {
    const r = estimateTaxes(makeInputs());
    expect(r.notes.some((n) => /refund/i.test(n))).toBe(true);
  });

  it('federal owed uses actual earnings and the standard deduction', () => {
    const r = estimateTaxes(makeInputs({ grossMonthlyIncome: 8000, monthsWorked: 3 }));
    expect(r.federalActuallyOwed).toBeCloseTo(federalTax(24_000 - 15_000, 'single'), 6);
  });
});

describe('estimateTaxes — FICA', () => {
  it('is a flat percentage of actual wages, not annualized', () => {
    const r = estimateTaxes(makeInputs({ grossMonthlyIncome: 8000, monthsWorked: 3 }));
    const expected = 24_000 * (SOCIAL_SECURITY_RATE + MEDICARE_RATE);
    expect(r.fica).toBeCloseTo(expected, 6);
  });
});

describe('estimateTaxes — dual state', () => {
  it('no state tax when both work and home states have none', () => {
    const r = estimateTaxes(makeInputs({ workState: 'WA', homeState: 'WA' }));
    expect(r.totalStateOwed).toBe(0);
    expect(r.stateStillOwedAtFiling).toBe(0);
  });

  it('pays the higher of the two state rates', () => {
    // Work in WA (0%), live in CA (~5% estimate).
    const r = estimateTaxes(makeInputs({ workState: 'WA', homeState: 'CA' }));
    const ca = lookupState('CA');
    expect(r.totalStateOwed).toBeCloseTo(24_000 * ca.rate, 6);
  });

  it('owes the home state at filing when home rate exceeds work rate', () => {
    // Work WA (0%, nothing withheld), live CA (~5%): owe the full CA amount.
    const r = estimateTaxes(makeInputs({ workState: 'WA', homeState: 'CA' }));
    expect(r.workStateWithheld).toBe(0);
    expect(r.stateStillOwedAtFiling).toBeCloseTo(r.totalStateOwed, 6);
    expect(r.notes.some((n) => /owe/i.test(n))).toBe(true);
  });

  it('does not owe extra at filing when work rate >= home rate', () => {
    // Work CA (~5%, withheld), live WA (0%): work state already covers it.
    const r = estimateTaxes(makeInputs({ workState: 'CA', homeState: 'WA' }));
    expect(r.stateStillOwedAtFiling).toBe(0);
  });

  it('flags unmodeled states without pretending tax is zero silently', () => {
    const r = estimateTaxes(makeInputs({ workState: 'ZZ', homeState: 'ZZ' }));
    expect(r.notes.some((n) => /ZZ/.test(n))).toBe(true);
  });
});

describe('estimateTaxes — dependent standard-deduction cap', () => {
  it('caps the deduction at earned income + $450 for a dependent', () => {
    // $6,000 earned -> capped deduction = 6,000 + 450 = 6,450 (< $15,000).
    const r = estimateTaxes(
      makeInputs({ grossMonthlyIncome: 2000, monthsWorked: 3, canBeClaimedAsDependent: true }),
    );
    expect(r.standardDeduction).toBe(6_450);
    expect(r.federalActuallyOwed).toBeCloseTo(federalTax(6_000 - 6_450, 'single'), 6);
  });

  it('never exceeds the regular standard deduction even for a dependent', () => {
    // High earned income -> cap would be huge, but clamped to $15,000.
    const r = estimateTaxes(
      makeInputs({ grossMonthlyIncome: 8000, monthsWorked: 3, canBeClaimedAsDependent: true }),
    );
    expect(r.standardDeduction).toBe(15_000);
  });

  it('a dependent owes at least as much federal tax as a non-dependent', () => {
    const dep = estimateTaxes(makeInputs({ canBeClaimedAsDependent: true }));
    const nonDep = estimateTaxes(makeInputs({ canBeClaimedAsDependent: false }));
    expect(dep.federalActuallyOwed).toBeGreaterThanOrEqual(nonDep.federalActuallyOwed);
  });

  it('does not change what payroll withholds (only the liability)', () => {
    const dep = estimateTaxes(makeInputs({ canBeClaimedAsDependent: true }));
    const nonDep = estimateTaxes(makeInputs({ canBeClaimedAsDependent: false }));
    expect(dep.federalWithheld).toBeCloseTo(nonDep.federalWithheld, 6);
  });
});

describe('estimateTaxes — other income & pre-tax contributions', () => {
  it('other taxable income raises the liability and lowers the refund', () => {
    const base = estimateTaxes(makeInputs());
    const withOther = estimateTaxes(makeInputs({ otherTaxableIncome: 5000 }));
    expect(withOther.federalActuallyOwed).toBeGreaterThan(base.federalActuallyOwed);
    expect(withOther.federalRefund).toBeLessThan(base.federalRefund);
    expect(withOther.otherTaxableIncome).toBe(5000);
  });

  it('pre-tax contributions lower the liability and raise the refund', () => {
    const base = estimateTaxes(makeInputs());
    const withPreTax = estimateTaxes(makeInputs({ preTaxContributions: 4000 }));
    expect(withPreTax.federalActuallyOwed).toBeLessThan(base.federalActuallyOwed);
    expect(withPreTax.federalRefund).toBeGreaterThan(base.federalRefund);
    expect(withPreTax.preTaxContributions).toBe(4000);
  });

  it('flags an under-withholding (owe-at-filing) situation in the notes', () => {
    // Large untaxed non-wage income can flip the refund negative.
    const r = estimateTaxes(
      makeInputs({ grossMonthlyIncome: 2000, monthsWorked: 2, otherTaxableIncome: 40_000 }),
    );
    expect(r.federalRefund).toBeLessThan(0);
    expect(r.notes.some((n) => /owe/i.test(n))).toBe(true);
  });

  it('always includes an assumptions note', () => {
    const r = estimateTaxes(makeInputs());
    expect(r.notes.some((n) => /Assumes:/i.test(n))).toBe(true);
  });
});

describe('estimateTaxes — take-home & bottom line', () => {
  it('monthly take-home is gross minus monthly withholding', () => {
    const r = estimateTaxes(makeInputs({ grossMonthlyIncome: 8000, monthsWorked: 3, workState: 'WA' }));
    expect(r.monthlyTakeHome).toBeGreaterThan(0);
    expect(r.monthlyTakeHome).toBeLessThan(8000);
    expect(r.totalTakeHome).toBeCloseTo(r.monthlyTakeHome * 3, 6);
  });

  it('effective tax rate is between 0 and 1 and rises with income', () => {
    const low = estimateTaxes(makeInputs({ grossMonthlyIncome: 4000 }));
    const high = estimateTaxes(makeInputs({ grossMonthlyIncome: 12_000 }));
    expect(low.effectiveTaxRate).toBeGreaterThanOrEqual(0);
    expect(high.effectiveTaxRate).toBeGreaterThan(low.effectiveTaxRate);
    expect(high.effectiveTaxRate).toBeLessThan(1);
  });

  it('clamps zero income to zero everything without throwing', () => {
    const r = estimateTaxes(makeInputs({ grossMonthlyIncome: 0, monthsWorked: 0 }));
    expect(r.actualGrossEarned).toBe(0);
    expect(r.fica).toBe(0);
    expect(r.monthlyTakeHome).toBe(0);
    expect(r.effectiveTaxRate).toBe(0);
  });

  it('a higher-tax home state reduces the net refund via state owed', () => {
    const noState = estimateTaxes(makeInputs({ workState: 'WA', homeState: 'WA' }));
    const caHome = estimateTaxes(makeInputs({ workState: 'WA', homeState: 'CA' }));
    expect(caHome.estimatedRefund).toBeLessThan(noState.estimatedRefund);
  });
});
