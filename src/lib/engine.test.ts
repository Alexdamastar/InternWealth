import { describe, it, expect } from 'vitest';
import {
  allocate,
  BUCKET_ORDER,
  DEFAULT_EMERGENCY_MONTHS,
  normalizeSplit,
  ROTH_IRA_ANNUAL_LIMIT_2026,
  splitSurplus,
  surplusOptions,
} from './engine';
import type { Goal, SurplusSplit, UserProfile } from './types';

const VEST_WARNING =
  "401(k) match may not vest before you leave (e.g. Amazon's multi-year vesting) — skipping per the guide.";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    monthlyIncome: 6000,
    essentialMonthlyExpenses: 1000,
    hasEmergencyFund: 0,
    employer401kVests: false,
    rothContributedThisYear: 0,
    workState: 'WA',
    internshipEndsSoon: false,
    ...overrides,
  };
}

const schoolGoal = (targetAmount?: number): Goal => ({
  id: 'school',
  label: 'School-year expenses',
  targetAmount,
  priority: 2,
  kind: 'school',
});

const split = (cash: number, brokerage: number, k401: number): SurplusSplit => ({
  cash,
  brokerage,
  '401k': k401,
});

// Mandatory priority first, then the three surplus destinations.
const EXPECTED_ORDER = ['emergency', 'school', 'roth', '401k', 'brokerage', 'cash'];

// Helper to pull a step amount by bucket name (order-independent lookups).
function amt(result: ReturnType<typeof allocate>, bucket: string): number {
  return result.steps.find((s) => s.bucket === bucket)!.amount;
}

function assertInvariant(cash: number, ...args: Parameters<typeof allocate>) {
  const result = allocate(...args);
  const sum = result.steps.reduce((acc, s) => acc + s.amount, 0);
  expect(sum + result.leftover).toBeCloseTo(cash, 6);
}

describe('splitSurplus', () => {
  it('splits proportionally and sums EXACTLY to the total', () => {
    const parts = splitSurplus(10000, split(25, 50, 25));
    expect(parts.cash).toBe(2500);
    expect(parts.brokerage).toBe(5000);
    expect(parts['401k']).toBe(2500);
    expect(parts.cash + parts.brokerage + parts['401k']).toBe(10000);
  });

  it('handles indivisible totals with no drift (largest-remainder)', () => {
    // 100 split three even ways cannot divide cleanly; parts must still sum to 100.
    const parts = splitSurplus(100, split(1, 1, 1));
    expect(parts.cash + parts.brokerage + parts['401k']).toBe(100);
  });

  it('all-zero weights fall back to brokerage', () => {
    const parts = splitSurplus(500, split(0, 0, 0));
    expect(parts.brokerage).toBe(500);
    expect(parts.cash).toBe(0);
    expect(parts['401k']).toBe(0);
  });

  it('zero total -> all zero', () => {
    const parts = splitSurplus(0, split(1, 1, 1));
    expect(parts).toEqual({ cash: 0, brokerage: 0, '401k': 0 });
  });
});

describe('normalizeSplit', () => {
  it('normalizes weights to percentages summing ~100', () => {
    const n = normalizeSplit(split(1, 1, 2));
    expect(n.cash + n.brokerage + n['401k']).toBe(100);
    expect(n['401k']).toBe(50);
  });
});

describe('allocate', () => {
  it('exports the expected constants', () => {
    expect(DEFAULT_EMERGENCY_MONTHS).toBe(3);
    expect(ROTH_IRA_ANNUAL_LIMIT_2026).toBe(7500);
    expect(BUCKET_ORDER).toEqual(EXPECTED_ORDER);
  });

  it('always returns all buckets in the stable display order', () => {
    const result = allocate(makeProfile(), [], 100000);
    expect(result.steps.map((s) => s.bucket)).toEqual(EXPECTED_ORDER);
  });

  it('no cash (0) -> all steps zero, leftover 0, no surplus, no crash', () => {
    const result = allocate(makeProfile(), [], 0);
    expect(result.steps.map((s) => s.bucket)).toEqual(EXPECTED_ORDER);
    for (const step of result.steps) {
      expect(step.amount).toBe(0);
    }
    expect(result.leftover).toBe(0);
    expect(result.totalAllocatable).toBe(0);
    expect(result.surplus).toBe(0);
    expect(result.surplusOptions).toHaveLength(0);
  });

  it('negative cash is treated as 0', () => {
    const result = allocate(makeProfile(), [], -500);
    expect(result.totalAllocatable).toBe(0);
    for (const step of result.steps) {
      expect(step.amount).toBe(0);
    }
    expect(result.leftover).toBe(0);
  });

  it('cash < emergency need -> everything to emergency, later steps 0, leftover 0', () => {
    // target = 1000 * 3 = 3000, cash 500
    const result = allocate(makeProfile(), [], 500);
    expect(amt(result, 'emergency')).toBe(500);
    expect(result.steps[0].capReached).toBe(false);
    expect(amt(result, 'school')).toBe(0);
    expect(amt(result, 'roth')).toBe(0);
    expect(amt(result, 'brokerage')).toBe(0);
    expect(amt(result, 'cash')).toBe(0);
    expect(result.leftover).toBe(0);
    expect(result.surplus).toBe(0);
  });

  it('emergency already funded -> emergency step 0, cash flows to school/roth', () => {
    const profile = makeProfile({ hasEmergencyFund: 3000 }); // target 3000
    const result = allocate(profile, [schoolGoal(800)], 5000);
    expect(amt(result, 'emergency')).toBe(0);
    expect(amt(result, 'school')).toBe(800);
    expect(amt(result, 'roth')).toBe(4200); // 5000 - 800, within roth room 7500
    expect(result.steps.find((s) => s.bucket === 'roth')!.capReached).toBe(false);
  });

  it('roth respects annual limit minus already-contributed', () => {
    const profile = makeProfile({
      hasEmergencyFund: 3000, // emergency funded
      rothContributedThisYear: 5000, // room = 2500
    });
    const result = allocate(profile, [], 100000);
    const roth = result.steps.find((s) => s.bucket === 'roth')!;
    expect(roth.amount).toBe(2500);
    expect(roth.capReached).toBe(true);
  });

  // --- Surplus decision (the reframed 401k / brokerage / cash SPLIT) ---

  it('surplus exists only after the Roth IRA is maxed', () => {
    const profile = makeProfile({ hasEmergencyFund: 3000 }); // emergency funded
    // 5000 all fits within Roth room -> no surplus
    const noSurplus = allocate(profile, [], 5000);
    expect(noSurplus.surplus).toBe(0);
    expect(noSurplus.surplusOptions).toHaveLength(0);
    // 20000: 7500 to roth, 12500 surplus
    const withSurplus = allocate(profile, [], 20000);
    expect(withSurplus.surplus).toBe(12500);
    expect(withSurplus.surplusOptions).toHaveLength(3);
  });

  it('defaults surplus to the taxable brokerage', () => {
    const profile = makeProfile({ hasEmergencyFund: 3000 });
    const result = allocate(profile, [], 20000);
    expect(amt(result, 'brokerage')).toBe(12500);
    expect(amt(result, 'cash')).toBe(0);
    expect(amt(result, '401k')).toBe(0);
  });

  it('routes the full surplus to cash when the split says so', () => {
    const profile = makeProfile({ hasEmergencyFund: 3000 });
    const result = allocate(profile, [], 20000, DEFAULT_EMERGENCY_MONTHS, split(100, 0, 0));
    expect(amt(result, 'cash')).toBe(12500);
    expect(amt(result, 'brokerage')).toBe(0);
    expect(amt(result, '401k')).toBe(0);
  });

  it('supports a MIXED split, e.g. half cash + half 401k', () => {
    const profile = makeProfile({ hasEmergencyFund: 3000 });
    const result = allocate(profile, [], 20000, DEFAULT_EMERGENCY_MONTHS, split(50, 0, 50));
    expect(amt(result, 'cash')).toBe(6250);
    expect(amt(result, '401k')).toBe(6250);
    expect(amt(result, 'brokerage')).toBe(0);
    // still exact
    expect(amt(result, 'cash') + amt(result, '401k')).toBe(result.surplus);
  });

  it('supports a three-way cash/brokerage/401k split summing to the surplus', () => {
    const profile = makeProfile({ hasEmergencyFund: 3000 });
    const result = allocate(profile, [], 20000, DEFAULT_EMERGENCY_MONTHS, split(20, 30, 50));
    const total = amt(result, 'cash') + amt(result, 'brokerage') + amt(result, '401k');
    expect(total).toBe(12500);
    expect(amt(result, '401k')).toBe(6250);
  });

  it('non-vesting employer -> vesting warning ONLY when 401k gets surplus', () => {
    const profile = makeProfile({ employer401kVests: false, hasEmergencyFund: 3000 });
    const to401k = allocate(profile, [], 20000, DEFAULT_EMERGENCY_MONTHS, split(0, 0, 100));
    expect(to401k.warnings).toContain(VEST_WARNING);
    // Default (brokerage) split routes nothing to 401k -> no warning.
    const toBrokerage = allocate(profile, [], 20000);
    expect(toBrokerage.warnings).not.toContain(VEST_WARNING);
  });

  it('vesting employer -> no vesting warning even when 401k gets surplus', () => {
    const profile = makeProfile({ employer401kVests: true, hasEmergencyFund: 3000 });
    const result = allocate(profile, [], 20000, DEFAULT_EMERGENCY_MONTHS, split(0, 0, 100));
    expect(result.warnings).not.toContain(VEST_WARNING);
    expect(result.warnings).toHaveLength(0);
  });

  it('surplusOptions covers cash / brokerage / 401k with pros and cons', () => {
    const opts = surplusOptions(10000);
    expect(opts.map((o) => o.choice)).toEqual(['cash', 'brokerage', '401k']);
    for (const o of opts) {
      expect(o.pros.length).toBeGreaterThan(0);
      expect(o.cons.length).toBeGreaterThan(0);
    }
    // The 401k option must mention the 10% early-withdrawal penalty.
    const k401 = opts.find((o) => o.choice === '401k')!;
    expect(k401.cons.join(' ')).toMatch(/10%/);
  });

  it('large surplus -> divides across the split; invariant holds exactly', () => {
    const profile = makeProfile({ hasEmergencyFund: 0 });
    const goals = [schoolGoal(2000)];
    const cash = 250000;
    const result = allocate(profile, goals, cash, DEFAULT_EMERGENCY_MONTHS, split(10, 60, 30));
    expect(amt(result, 'emergency')).toBe(3000);
    expect(amt(result, 'school')).toBe(2000);
    expect(amt(result, 'roth')).toBe(7500);
    const surplus = cash - 3000 - 2000 - 7500;
    expect(result.surplus).toBe(surplus);
    expect(amt(result, 'cash') + amt(result, 'brokerage') + amt(result, '401k')).toBe(surplus);
    expect(result.leftover).toBe(0);
    const sum = result.steps.reduce((a, s) => a + s.amount, 0);
    expect(sum + result.leftover).toBe(cash);
  });

  it('no school goal -> school step 0 with rationale', () => {
    const result = allocate(makeProfile({ hasEmergencyFund: 3000 }), [], 4000);
    expect(amt(result, 'school')).toBe(0);
    expect(result.steps.find((s) => s.bucket === 'school')!.rationale.toLowerCase()).toContain(
      'no school',
    );
  });

  it('sizes the emergency fund against school-year expenses when provided', () => {
    // summer essentials 1000/mo, but school-year is only 400/mo -> 3 * 400 = 1200
    const profile = makeProfile({ schoolYearMonthlyExpenses: 400 });
    const result = allocate(profile, [], 100000);
    expect(amt(result, 'emergency')).toBe(1200);
    expect(result.steps[0].rationale).toContain('school-year');
  });

  it('falls back to internship essentials when no school-year figure is set', () => {
    const profile = makeProfile(); // 1000/mo, no schoolYearMonthlyExpenses
    const result = allocate(profile, [], 100000);
    expect(amt(result, 'emergency')).toBe(3000); // 3 * 1000
  });

  it('ignores a zero/blank school-year figure and uses internship essentials', () => {
    const profile = makeProfile({ schoolYearMonthlyExpenses: 0 });
    const result = allocate(profile, [], 100000);
    expect(amt(result, 'emergency')).toBe(3000);
  });

  it('configurable emergencyMonths (3-6)', () => {
    const profile = makeProfile(); // 1000/mo essentials
    const result = allocate(profile, [], 100000, 6);
    expect(amt(result, 'emergency')).toBe(6000);
    expect(result.steps[0].capReached).toBe(true);
  });

  it('invariant holds across a range of cash values and splits', () => {
    const splits = [split(100, 0, 0), split(0, 100, 0), split(0, 0, 100), split(33, 33, 34), split(1, 2, 3)];
    for (const cash of [0, 100, 3000, 5001, 12346, 999999]) {
      for (const s of splits) {
        assertInvariant(cash, makeProfile(), [schoolGoal(1200)], cash, DEFAULT_EMERGENCY_MONTHS, s);
      }
    }
  });
});

describe('show-the-math (step.math)', () => {
  it('every step carries at least one math line', () => {
    const result = allocate(makeProfile(), [schoolGoal(1200)], 20000);
    for (const step of result.steps) {
      expect(step.math.length).toBeGreaterThan(0);
    }
  });

  it('emergency math shows the real target, saved offset, and min()', () => {
    // 3 × $1,400 school-year − $1,000 saved = $3,200 (the FEATURES.md example)
    const profile = makeProfile({
      schoolYearMonthlyExpenses: 1400,
      hasEmergencyFund: 1000,
    });
    const [emergency] = allocate(profile, [], 20000).steps;
    expect(emergency.math[0]).toBe(
      'target = 3 months × $1,400 (school-year expenses) = $4,200',
    );
    expect(emergency.math[1]).toBe(
      'still needed = $4,200 target − $1,000 already saved = $3,200',
    );
    expect(emergency.math[2]).toBe(
      'allocated = min($3,200 needed, $20,000 available) = $3,200',
    );
  });

  it('roth math substitutes the annual limit and prior contributions', () => {
    const profile = makeProfile({ rothContributedThisYear: 2000 });
    const result = allocate(profile, [], 20000);
    const roth = result.steps.find((s) => s.bucket === 'roth')!;
    expect(roth.math[0]).toBe(
      'room left = $7,500 annual limit − $2,000 already contributed = $5,500',
    );
  });

  it('surplus math shows the waterfall subtraction and the split percentage', () => {
    const result = allocate(makeProfile(), [], 20000, 3, split(0, 100, 0));
    const brokerage = result.steps.find((s) => s.bucket === 'brokerage')!;
    expect(brokerage.math[0]).toContain('surplus =');
    expect(brokerage.math[1]).toContain('× 100% (your split)');
  });

  it('math amounts agree with the step amounts (no drift between prose and numbers)', () => {
    const result = allocate(makeProfile(), [schoolGoal(1200)], 12345, 3, split(1, 2, 3));
    for (const step of result.steps) {
      const last = step.math[step.math.length - 1];
      const usd = `$${Math.round(step.amount).toLocaleString('en-US')}`;
      expect(last).toContain(usd);
    }
  });
});
