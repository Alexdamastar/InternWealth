// Plan-vs-reality drift (features 2.2 + 2.4 + 3.3 combined). Pure — no I/O,
// no LLM. Compares what the plan ASSUMES you spend (profile essentials)
// against what your statement actually SHOWS (categorized transactions), then
// re-runs the paycheck timeline with the spend-adjusted paycheck to show the
// downstream effect: "Roth maxes week 12 instead of week 10."
//
// All arithmetic here is deterministic; the UI renders these numbers verbatim.

import { distinctMonths } from './categorize';
import { simulateTimeline } from './timeline';
import { DEFAULT_EMERGENCY_MONTHS } from './engine';
import {
  DEFAULT_SURPLUS_SPLIT,
  type AllocationBucket,
  type Goal,
  type PayFrequency,
  type SurplusSplit,
  type Transaction,
  type UserProfile,
} from './types';

// How a capped bucket's completion moves when observed spending is applied.
export interface MilestoneShift {
  bucket: AllocationBucket;
  label: string;
  plannedWeek: number;
  plannedDate: string; // ISO
  // null = no longer completes within the internship window.
  projectedWeek: number | null;
  projectedDate: string | null;
  // Dollars still missing when it no longer completes (from the projected run).
  remaining?: number;
}

export interface DriftResult {
  // Observed, from the statement (per month, transfers excluded from spend).
  observedMonthlySpend: number;
  monthsObserved: number;
  // Assumed, from the profile.
  plannedMonthlySpend: number;
  // observed − planned; positive = spending more than the plan assumes.
  monthlyDelta: number;
  perPaycheckDelta: number;
  // Milestone comparison — only present when the profile has timeline fields.
  shifts: MilestoneShift[];
  // The projected end-of-summer total allocatable vs the planned one.
  plannedTotalIn: number | null;
  projectedTotalIn: number | null;
}

// Average paychecks per month for each frequency (52 weeks / 12 months, etc.).
const PAYCHECKS_PER_MONTH: Record<PayFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

/**
 * Observed spend per month: all outflows EXCEPT transfers (money moving
 * between your own accounts is not spending), averaged over the distinct
 * months present in the statement. Rounded to whole dollars.
 */
export function observedMonthlySpend(txns: Transaction[]): number {
  let total = 0;
  for (const t of txns) {
    if (t.amount < 0 && t.category !== 'transfer') total += Math.abs(t.amount);
  }
  return Math.round(total / distinctMonths(txns));
}

/**
 * Compute the drift between plan assumptions and observed transactions, and
 * (when the profile carries timeline fields) how each milestone moves if the
 * observed over/under-spend continues for the rest of the internship.
 *
 * Returns null when there are no transactions to observe — no data, no drift.
 */
export function computeDrift(
  profile: UserProfile,
  goals: Goal[],
  txns: Transaction[],
  emergencyMonths: number = DEFAULT_EMERGENCY_MONTHS,
  surplusSplit: SurplusSplit = DEFAULT_SURPLUS_SPLIT,
): DriftResult | null {
  if (txns.length === 0) return null;

  const observed = observedMonthlySpend(txns);
  const planned = profile.essentialMonthlyExpenses;
  const monthlyDelta = observed - planned;

  const frequency = profile.payFrequency ?? 'biweekly';
  const perPaycheckDelta = Math.round(monthlyDelta / PAYCHECKS_PER_MONTH[frequency]);

  const base: DriftResult = {
    observedMonthlySpend: observed,
    monthsObserved: distinctMonths(txns),
    plannedMonthlySpend: planned,
    monthlyDelta,
    perPaycheckDelta,
    shifts: [],
    plannedTotalIn: null,
    projectedTotalIn: null,
  };

  // Timeline comparison needs the paycheck fields; without them the spending
  // comparison alone still stands.
  const plannedTimeline = simulateTimeline(profile, goals, emergencyMonths, surplusSplit);
  if (!plannedTimeline || !profile.paycheckAmount) return base;

  const adjustedPaycheck = Math.max(0, profile.paycheckAmount - perPaycheckDelta);
  const projectedTimeline = simulateTimeline(
    { ...profile, paycheckAmount: adjustedPaycheck },
    goals,
    emergencyMonths,
    surplusSplit,
  );

  base.plannedTotalIn = plannedTimeline.totalIn;
  base.projectedTotalIn = projectedTimeline?.totalIn ?? 0;

  for (const planned of plannedTimeline.milestones) {
    const projected = projectedTimeline?.milestones.find(
      (m) => m.bucket === planned.bucket,
    );
    if (projected) {
      if (projected.week !== planned.week || projected.date !== planned.date) {
        base.shifts.push({
          bucket: planned.bucket,
          label: planned.label,
          plannedWeek: planned.week,
          plannedDate: planned.date,
          projectedWeek: projected.week,
          projectedDate: projected.date,
        });
      }
    } else {
      const unfinished = projectedTimeline?.unfinished.find(
        (u) => u.bucket === planned.bucket,
      );
      base.shifts.push({
        bucket: planned.bucket,
        label: planned.label,
        plannedWeek: planned.week,
        plannedDate: planned.date,
        projectedWeek: null,
        projectedDate: null,
        remaining: unfinished?.remaining,
      });
    }
  }

  // A milestone that completes in the projected run but not the planned one
  // (spending UNDER plan freeing cash) — surface those too.
  for (const projected of projectedTimeline?.milestones ?? []) {
    const inPlanned = plannedTimeline.milestones.some(
      (m) => m.bucket === projected.bucket,
    );
    if (!inPlanned) {
      base.shifts.push({
        bucket: projected.bucket,
        label: projected.label,
        plannedWeek: -1,
        plannedDate: '',
        projectedWeek: projected.week,
        projectedDate: projected.date,
      });
    }
  }

  return base;
}
