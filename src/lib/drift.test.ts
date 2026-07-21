import { describe, it, expect } from 'vitest';
import { computeDrift, observedMonthlySpend } from './drift';
import type { Goal, Transaction, UserProfile } from './types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    monthlyIncome: 6000,
    essentialMonthlyExpenses: 2000,
    hasEmergencyFund: 0,
    employer401kVests: false,
    rothContributedThisYear: 0,
    workState: 'WA',
    internshipEndsSoon: false,
    startDate: '2026-06-01',
    endDate: '2026-08-21',
    payFrequency: 'biweekly',
    paycheckAmount: 3000,
    ...overrides,
  };
}

const schoolGoal: Goal = {
  id: 'school',
  label: 'School-year expenses',
  targetAmount: 3000,
  priority: 2,
  kind: 'school',
};

// One month of transactions (2026-07) spending `spend` total plus a transfer
// and an income row that must both be excluded from observed spend.
function makeTxns(spend: number): Transaction[] {
  return [
    { date: '2026-07-01', description: 'AMAZON PAYROLL', amount: 3000, category: 'income' },
    { date: '2026-07-02', description: 'Rent', amount: -spend / 2, category: 'rent' },
    { date: '2026-07-10', description: 'Safeway', amount: -spend / 2, category: 'groceries' },
    { date: '2026-07-12', description: 'To savings', amount: -500, category: 'transfer' },
  ];
}

describe('observedMonthlySpend', () => {
  it('sums outflows, excludes transfers and income, averages over months', () => {
    expect(observedMonthlySpend(makeTxns(2600))).toBe(2600);
  });

  it('averages across distinct months', () => {
    const txns: Transaction[] = [
      { date: '2026-06-05', description: 'Rent', amount: -2000, category: 'rent' },
      { date: '2026-07-05', description: 'Rent', amount: -1000, category: 'rent' },
    ];
    expect(observedMonthlySpend(txns)).toBe(1500);
  });
});

describe('computeDrift', () => {
  it('returns null with no transactions', () => {
    expect(computeDrift(makeProfile(), [schoolGoal], [])).toBeNull();
  });

  it('reports the monthly delta between observed and planned spend', () => {
    // planned 2000/mo, observed 2600/mo -> +600/mo over plan
    const drift = computeDrift(makeProfile(), [schoolGoal], makeTxns(2600))!;
    expect(drift.plannedMonthlySpend).toBe(2000);
    expect(drift.observedMonthlySpend).toBe(2600);
    expect(drift.monthlyDelta).toBe(600);
    // biweekly: 600 / (26/12) ≈ 277
    expect(drift.perPaycheckDelta).toBe(277);
  });

  it('pushes milestones later when spending over plan', () => {
    const drift = computeDrift(makeProfile(), [schoolGoal], makeTxns(3600))!;
    expect(drift.monthlyDelta).toBe(1600);
    // Over-spend must delay or kill at least one milestone.
    expect(drift.shifts.length).toBeGreaterThan(0);
    for (const s of drift.shifts) {
      if (s.projectedWeek !== null && s.plannedWeek > 0) {
        expect(s.projectedWeek).toBeGreaterThanOrEqual(s.plannedWeek);
      }
    }
  });

  it('spending exactly to plan produces zero shifts', () => {
    const drift = computeDrift(makeProfile(), [schoolGoal], makeTxns(2000))!;
    expect(drift.monthlyDelta).toBe(0);
    expect(drift.perPaycheckDelta).toBe(0);
    expect(drift.shifts).toHaveLength(0);
  });

  it('projected total in drops by the per-paycheck delta times paychecks', () => {
    const drift = computeDrift(makeProfile(), [schoolGoal], makeTxns(2600))!;
    // 2026-06-01..2026-08-21 biweekly = 6 paychecks
    expect(drift.plannedTotalIn).toBe(3000 * 6);
    expect(drift.projectedTotalIn).toBe((3000 - 277) * 6);
  });

  it('still reports spend drift when the profile has no timeline fields', () => {
    const profile = makeProfile({ startDate: undefined, endDate: undefined });
    const drift = computeDrift(profile, [schoolGoal], makeTxns(2600))!;
    expect(drift.monthlyDelta).toBe(600);
    expect(drift.plannedTotalIn).toBeNull();
    expect(drift.shifts).toHaveLength(0);
  });

  it('a milestone can drop out entirely under heavy over-spend', () => {
    // Spend so far above plan that the roth never completes in the window.
    const drift = computeDrift(
      makeProfile({ essentialMonthlyExpenses: 500 }),
      [schoolGoal],
      makeTxns(6000),
    )!;
    const killed = drift.shifts.filter((s) => s.projectedWeek === null);
    expect(killed.length).toBeGreaterThan(0);
  });
});
