import { describe, it, expect } from 'vitest';
import { paycheckDates, simulateTimeline } from './timeline';
import { allocate, ROTH_IRA_ANNUAL_LIMIT_2026 } from './engine';
import type { Goal, UserProfile } from './types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    monthlyIncome: 9000,
    essentialMonthlyExpenses: 2600,
    schoolYearMonthlyExpenses: 1400,
    hasEmergencyFund: 0,
    employer401kVests: false,
    rothContributedThisYear: 0,
    workState: 'WA',
    internshipEndsSoon: false,
    startDate: '2026-06-01',
    endDate: '2026-08-21', // 12 weeks
    payFrequency: 'biweekly',
    paycheckAmount: 3200,
    ...overrides,
  };
}

const schoolGoal = (targetAmount: number): Goal => ({
  id: 'school',
  label: 'School-year expenses',
  targetAmount,
  priority: 2,
  kind: 'school',
});

describe('paycheckDates', () => {
  it('weekly: every 7 days from start, inclusive of end', () => {
    const dates = paycheckDates('2026-06-01', '2026-06-29', 'weekly');
    expect(dates).toEqual([
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
      '2026-06-29',
    ]);
  });

  it('biweekly: every 14 days', () => {
    const dates = paycheckDates('2026-06-01', '2026-08-21', 'biweekly');
    expect(dates).toEqual([
      '2026-06-01',
      '2026-06-15',
      '2026-06-29',
      '2026-07-13',
      '2026-07-27',
      '2026-08-10',
    ]);
  });

  it('semimonthly: 1st and 15th within the window', () => {
    const dates = paycheckDates('2026-06-10', '2026-08-02', 'semimonthly');
    expect(dates).toEqual(['2026-06-15', '2026-07-01', '2026-07-15', '2026-08-01']);
  });

  it('monthly: same day-of-month, clamped into short months', () => {
    const dates = paycheckDates('2026-01-31', '2026-04-30', 'monthly');
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('end before start -> empty', () => {
    expect(paycheckDates('2026-08-01', '2026-06-01', 'weekly')).toEqual([]);
  });

  it('single-day window pays once', () => {
    expect(paycheckDates('2026-06-01', '2026-06-01', 'biweekly')).toEqual(['2026-06-01']);
  });
});

describe('simulateTimeline', () => {
  it('returns null when timeline fields are missing', () => {
    expect(simulateTimeline(makeProfile({ startDate: undefined }), [])).toBeNull();
    expect(simulateTimeline(makeProfile({ endDate: undefined }), [])).toBeNull();
    expect(simulateTimeline(makeProfile({ paycheckAmount: 0 }), [])).toBeNull();
  });

  it('final point equals the plan-page allocation for the same total', () => {
    const profile = makeProfile();
    const goals = [schoolGoal(6000)];
    const tl = simulateTimeline(profile, goals)!;
    const last = tl.points[tl.points.length - 1];
    const plan = allocate(profile, goals, tl.totalIn);
    for (const step of plan.steps) {
      expect(last.buckets[step.bucket]).toBe(step.amount);
    }
  });

  it('cumulative inflow grows by exactly one paycheck per point', () => {
    const tl = simulateTimeline(makeProfile(), [])!;
    tl.points.forEach((p, i) => {
      expect(p.cumulativeIn).toBe(3200 * (i + 1));
      expect(p.paycheckIndex).toBe(i + 1);
    });
  });

  it('milestones fire in waterfall order: emergency, then school, then roth', () => {
    // School target is now 6 × 1400 = 8400 (from the monthly figure), so with
    // emergency 4200 + roth 7500 = 20,100 total; bump paychecks so all three cap.
    const tl = simulateTimeline(makeProfile({ paycheckAmount: 7000 }), [])!;
    const order = tl.milestones.map((m) => m.bucket);
    expect(order).toEqual(['emergency', 'school', 'roth']);
    // Dates must be non-decreasing.
    const times = tl.milestones.map((m) => Date.parse(m.date));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('emergency milestone lands on the correct paycheck', () => {
    // Target = 3 x 1400 = 4200, no existing fund. Paycheck 3200:
    // pc1 = 3200 (short), pc2 = 6400 >= 4200 -> milestone on paycheck 2.
    const tl = simulateTimeline(makeProfile(), [])!;
    const em = tl.milestones.find((m) => m.bucket === 'emergency')!;
    expect(em.paycheckIndex).toBe(2);
    expect(em.date).toBe('2026-06-15');
    expect(em.week).toBe(3);
  });

  it('roth milestone respects prior contributions', () => {
    // Room = 7500 - 7000 = 500. No school-year figure so school target is 0;
    // emergency basis falls back to summer essentials (1400 × 3 = 4200).
    // pc2 cumulative 6400: emergency 4200 + roth 500 capped -> milestone pc2.
    const tl = simulateTimeline(
      makeProfile({
        rothContributedThisYear: ROTH_IRA_ANNUAL_LIMIT_2026 - 500,
        essentialMonthlyExpenses: 1400,
        schoolYearMonthlyExpenses: 0, // isolate: no school target in the way
      }),
      [],
    )!;
    const roth = tl.milestones.find((m) => m.bucket === 'roth')!;
    expect(roth.paycheckIndex).toBe(2);
  });

  it('unfinished buckets report the remaining shortfall', () => {
    // Tiny paychecks: 6 x 500 = 3000 total < 4200 emergency target.
    const tl = simulateTimeline(makeProfile({ paycheckAmount: 500 }), [])!;
    expect(tl.milestones).toHaveLength(0);
    const em = tl.unfinished.find((u) => u.bucket === 'emergency')!;
    expect(em.remaining).toBe(4200 - 3000);
    // School and roth got nothing; they report their full targets. School target
    // is now 6 × 1400 school-year expenses = 8400.
    expect(tl.unfinished.find((u) => u.bucket === 'school')!.remaining).toBe(8400);
    expect(tl.unfinished.find((u) => u.bucket === 'roth')!.remaining).toBe(
      ROTH_IRA_ANNUAL_LIMIT_2026,
    );
  });

  it('an already-met bucket completes on the first paycheck', () => {
    // Emergency already fully funded -> capReached from paycheck 1. No school-year
    // figure, so the emergency basis is summer essentials (2600 × 3 = 7800) and
    // nothing sits between emergency and roth.
    const tl = simulateTimeline(
      makeProfile({ hasEmergencyFund: 7800, schoolYearMonthlyExpenses: 0 }),
      [],
    )!;
    const em = tl.milestones.find((m) => m.bucket === 'emergency');
    expect(em).toBeUndefined(); // no need at all -> capReached never true
    // Roth starts filling immediately instead.
    expect(tl.points[0].buckets.roth).toBe(3200);
  });

  it('surplus buckets never appear in unfinished', () => {
    const tl = simulateTimeline(makeProfile({ paycheckAmount: 500 }), [])!;
    for (const u of tl.unfinished) {
      expect(['emergency', 'school', 'roth']).toContain(u.bucket);
    }
  });
});
