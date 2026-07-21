// Paycheck timeline simulator (feature 1.1). Pure — no I/O, no LLM, no Date.now().
// Given the internship's start/end dates, pay frequency, and per-paycheck amount,
// it simulates the allocation waterfall filling up paycheck by paycheck and
// reports when each bucket completes ("Emergency fund complete July 18 · Roth
// maxed by week 10"). It reuses allocate() for every paycheck so the timeline
// can never disagree with the plan.

import {
  allocate,
  DEFAULT_EMERGENCY_MONTHS,
  ROTH_IRA_ANNUAL_LIMIT_2026,
  SCHOOL_YEAR_MONTHS_COVERED,
} from './engine';
import {
  DEFAULT_SURPLUS_SPLIT,
  type AllocationBucket,
  type Goal,
  type PayFrequency,
  type SurplusSplit,
  type UserProfile,
} from './types';

// One paycheck's landing date and the cumulative allocation state after it.
export interface TimelinePoint {
  date: string; // ISO (YYYY-MM-DD)
  week: number; // 1-based week of the internship this paycheck lands in
  paycheckIndex: number; // 1-based
  cumulativeIn: number; // total allocatable received so far
  // Cumulative dollars sitting in each bucket after this paycheck.
  buckets: Record<AllocationBucket, number>;
}

// A bucket that finishes filling during the simulated window.
export interface TimelineMilestone {
  bucket: AllocationBucket;
  label: string;
  date: string; // ISO date of the paycheck that completed it
  week: number;
  paycheckIndex: number;
  target: number; // the bucket's cap that was reached
}

export interface TimelineResult {
  points: TimelinePoint[];
  milestones: TimelineMilestone[];
  paycheckCount: number;
  totalIn: number; // sum of all simulated paychecks
  // Buckets that never completed in the window (still filling at the end),
  // with how much more they need. Surplus buckets (uncapped) never appear.
  unfinished: { bucket: AllocationBucket; label: string; remaining: number }[];
}

const DAY_MS = 86_400_000;

// Parse an ISO date (YYYY-MM-DD) as UTC midnight so date math is DST-proof.
function parseISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// Paycheck dates from start to end inclusive. Weekly/biweekly step by days;
// semimonthly lands on the 1st and 15th; monthly lands on the start's
// day-of-month (clamped into short months).
export function paycheckDates(
  startISO: string,
  endISO: string,
  frequency: PayFrequency,
): string[] {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];

  const dates: string[] = [];

  if (frequency === 'weekly' || frequency === 'biweekly') {
    const step = (frequency === 'weekly' ? 7 : 14) * DAY_MS;
    for (let t = start; t <= end; t += step) dates.push(toISO(t));
    return dates;
  }

  if (frequency === 'semimonthly') {
    const s = new Date(start);
    let y = s.getUTCFullYear();
    let m = s.getUTCMonth();
    // Walk 1st/15th boundaries from the start month until past the end.
    for (;;) {
      for (const day of [1, 15]) {
        const t = Date.UTC(y, m, day);
        if (t > end) return dates;
        if (t >= start) dates.push(toISO(t));
      }
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }

  // monthly: same day-of-month as the start, clamped to each month's length.
  const s = new Date(start);
  const dom = s.getUTCDate();
  let y = s.getUTCFullYear();
  let m = s.getUTCMonth();
  for (;;) {
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const t = Date.UTC(y, m, Math.min(dom, daysInMonth));
    if (t > end) return dates;
    if (t >= start) dates.push(toISO(t));
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
}

/**
 * Simulate the waterfall filling paycheck by paycheck.
 *
 * Each paycheck's cumulative total is run through the SAME allocate() the plan
 * page uses, so the final point of the timeline always equals the plan for the
 * same inputs. Milestones fire on the first paycheck where a capped bucket
 * (emergency / school / roth) reaches its cap.
 */
export function simulateTimeline(
  profile: UserProfile,
  goals: Goal[],
  emergencyMonths: number = DEFAULT_EMERGENCY_MONTHS,
  surplusSplit: SurplusSplit = DEFAULT_SURPLUS_SPLIT,
): TimelineResult | null {
  const { startDate, endDate, paycheckAmount } = profile;
  const frequency = profile.payFrequency ?? 'biweekly';
  if (!startDate || !endDate || !paycheckAmount || paycheckAmount <= 0) return null;

  const dates = paycheckDates(startDate, endDate, frequency);
  if (dates.length === 0) return null;

  const startMs = parseISO(startDate);
  const points: TimelinePoint[] = [];
  const milestones: TimelineMilestone[] = [];
  const completed = new Set<AllocationBucket>();

  dates.forEach((date, i) => {
    const cumulativeIn = paycheckAmount * (i + 1);
    const result = allocate(profile, goals, cumulativeIn, emergencyMonths, surplusSplit);

    const buckets = {} as Record<AllocationBucket, number>;
    for (const step of result.steps) buckets[step.bucket] = step.amount;

    const week = Math.floor((parseISO(date) - startMs) / (7 * DAY_MS)) + 1;
    points.push({ date, week, paycheckIndex: i + 1, cumulativeIn, buckets });

    for (const step of result.steps) {
      if (step.capReached && !completed.has(step.bucket)) {
        completed.add(step.bucket);
        milestones.push({
          bucket: step.bucket,
          label: step.label,
          date,
          week,
          paycheckIndex: i + 1,
          target: step.amount,
        });
      }
    }
  });

  // Anything capped that never completed: report how much is still missing,
  // judged from the FINAL paycheck's allocation.
  const last = allocate(
    profile,
    goals,
    paycheckAmount * dates.length,
    emergencyMonths,
    surplusSplit,
  );
  const unfinished = last.steps
    .filter((s) => !completed.has(s.bucket))
    .map((s) => {
      if (s.bucket === 'emergency') {
        const basis =
          profile.schoolYearMonthlyExpenses && profile.schoolYearMonthlyExpenses > 0
            ? profile.schoolYearMonthlyExpenses
            : profile.essentialMonthlyExpenses;
        const target = basis * emergencyMonths;
        const remaining = Math.max(0, target - profile.hasEmergencyFund - s.amount);
        return { bucket: s.bucket, label: s.label, remaining };
      }
      if (s.bucket === 'school') {
        const target =
          profile.schoolYearMonthlyExpenses && profile.schoolYearMonthlyExpenses > 0
            ? SCHOOL_YEAR_MONTHS_COVERED * profile.schoolYearMonthlyExpenses
            : goals.find((g) => g.kind === 'school')?.targetAmount ?? 0;
        return { bucket: s.bucket, label: s.label, remaining: Math.max(0, target - s.amount) };
      }
      if (s.bucket === 'roth') {
        const room = Math.max(
          0,
          ROTH_IRA_ANNUAL_LIMIT_2026 - profile.rothContributedThisYear,
        );
        return { bucket: s.bucket, label: s.label, remaining: Math.max(0, room - s.amount) };
      }
      return null; // surplus buckets are uncapped — never "unfinished"
    })
    .filter((u): u is NonNullable<typeof u> => u !== null && u.remaining > 0);

  return {
    points,
    milestones,
    paycheckCount: dates.length,
    totalIn: paycheckAmount * dates.length,
    unfinished,
  };
}
