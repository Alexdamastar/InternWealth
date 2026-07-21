'use client';

// Plan vs. reality: what the plan assumes you spend vs. what your statement
// shows, and how each milestone moves if the difference continues. All
// numbers come from lib/drift.ts (pure); this component only renders them.

import { useMemo } from 'react';
import Link from 'next/link';
import { computeDrift } from '@/lib/drift';
import { ComputedBadge } from '@/components/Provenance';
import type { Goal, SurplusSplit, Transaction, UserProfile } from '@/lib/types';

const usd = (n: number) =>
  Math.abs(n).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

const monthDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

interface Props {
  profile: UserProfile;
  goals: Goal[];
  transactions: Transaction[];
  emergencyMonths: number;
  surplusSplit: SurplusSplit;
}

export default function DriftPanel({
  profile,
  goals,
  transactions,
  emergencyMonths,
  surplusSplit,
}: Props) {
  const drift = useMemo(
    () => computeDrift(profile, goals, transactions, emergencyMonths, surplusSplit),
    [profile, goals, transactions, emergencyMonths, surplusSplit],
  );

  if (!drift) return null;

  const over = drift.monthlyDelta > 0;
  const onPlan = drift.monthlyDelta === 0;

  return (
    <section className="bg-card border border-line shadow-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <h3 className="font-display font-semibold text-lg">Plan vs. reality</h3>
        <ComputedBadge />
      </div>
      <p className="text-sm text-ink-2 mb-4">
        Your plan assumes{' '}
        <strong className="text-ink">{usd(drift.plannedMonthlySpend)}/mo</strong> of
        essential spending; your statement shows{' '}
        <strong className="text-ink">{usd(drift.observedMonthlySpend)}/mo</strong>{' '}
        actually going out (everything but transfers)
        {' — '}
        {onPlan ? (
          <span className="text-good font-semibold">right on plan.</span>
        ) : (
          <strong className={over ? 'text-warn-text' : 'text-good'}>
            {usd(drift.monthlyDelta)}/mo {over ? 'over' : 'under'}
          </strong>
        )}
        {!onPlan && (
          <>
            {' '}
            (≈{usd(drift.perPaycheckDelta)} per paycheck
            {over ? ' less' : ' more'} to allocate).
          </>
        )}
      </p>

      {drift.shifts.length > 0 && (
        <div className="border-t border-line pt-3 space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-faint">
            If this continues
          </p>
          <ul className="space-y-1.5">
            {drift.shifts.map((s) => (
              <li key={s.bucket} className="text-sm text-ink-2">
                <strong className="text-ink">{s.label}:</strong>{' '}
                {s.projectedWeek === null ? (
                  <span className="text-warn-text">
                    no longer completes this internship
                    {s.remaining != null && <> — {usd(s.remaining)} short</>}
                    {' '}(was week {s.plannedWeek}, {monthDay(s.plannedDate)})
                  </span>
                ) : s.plannedWeek < 0 ? (
                  <span className="text-good">
                    now completes — week {s.projectedWeek} (
                    {monthDay(s.projectedDate!)})
                  </span>
                ) : (
                  <>
                    week {s.plannedWeek} ({monthDay(s.plannedDate)}) →{' '}
                    <span className={s.projectedWeek > s.plannedWeek ? 'text-warn-text' : 'text-good'}>
                      week {s.projectedWeek} ({monthDay(s.projectedDate!)})
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {drift.plannedTotalIn !== null && drift.projectedTotalIn !== null && !onPlan && (
        <p className="font-mono text-xs text-faint mt-3 border-t border-line pt-3">
          End-of-summer allocatable: {usd(drift.plannedTotalIn)} planned →{' '}
          {usd(drift.projectedTotalIn)} at the observed burn rate. Observed over{' '}
          {drift.monthsObserved} month{drift.monthsObserved === 1 ? '' : 's'} of
          transactions —{' '}
          <Link href="/ingest" className="text-moss hover:underline">
            refresh from your bank
          </Link>{' '}
          to update.
        </p>
      )}
    </section>
  );
}
