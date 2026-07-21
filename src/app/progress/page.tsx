'use client';

// NICE-TO-HAVE (§10.5): diff the latest snapshot vs the previous one and show
// per-bucket deltas. Purely local — reads saved snapshots from storage.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSnapshots } from '@/lib/storage';
import type { AllocationBucket, Snapshot } from '@/lib/types';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const BUCKETS: AllocationBucket[] = ['emergency', 'school', 'roth', '401k', 'brokerage', 'cash'];

const BUCKET_LABELS: Record<AllocationBucket, string> = {
  emergency: 'Emergency fund',
  school: 'School-year expenses',
  roth: 'Roth IRA',
  '401k': '401(k)',
  brokerage: 'Brokerage',
  cash: 'Cash',
};

function amountFor(snap: Snapshot, bucket: AllocationBucket): number {
  return snap.result.steps.find((s) => s.bucket === bucket)?.amount ?? 0;
}

export default function ProgressPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    // Intentional: snapshots live in localStorage, only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshots(getSnapshots());
  }, []);

  if (snapshots.length === 0) {
    return (
      <div className="rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss mb-3">
          Step 04 · Progress
        </p>
        <h1 className="font-display font-semibold text-3xl tracking-tight mb-3">
          Progress
        </h1>
        <p className="text-sm text-ink-2 max-w-xl leading-relaxed">
          No snapshots saved yet. Build a plan and click{' '}
          <strong className="text-ink">Save snapshot</strong> on the{' '}
          <Link
            href="/plan"
            className="text-moss font-semibold hover:underline underline-offset-2"
          >
            Plan page
          </Link>
          , then adjust your goals and save again to see how your allocation
          changes over time.
        </p>
      </div>
    );
  }

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss mb-3">
          Step 04 · Progress
        </p>
        <h1 className="font-display font-semibold text-3xl tracking-tight">
          Progress
        </h1>
        <p className="text-sm text-ink-2 mt-2">
          {previous
            ? 'Latest snapshot vs. the one before it.'
            : 'Your first snapshot. Save another after editing goals to see deltas.'}
        </p>
      </header>

      <div
        className="bg-card border border-line shadow-card p-5 rise"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="flex flex-wrap justify-between gap-2 font-mono text-xs text-faint mb-4">
          <span>Latest: {new Date(latest.createdAt).toLocaleString()}</span>
          {previous && (
            <span>Previous: {new Date(previous.createdAt).toLocaleString()}</span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-faint border-b border-ink/60 font-mono text-xs uppercase tracking-wider">
              <th className="py-2 font-medium">Bucket</th>
              <th className="py-2 text-right font-medium">Latest</th>
              {previous && <th className="py-2 text-right font-medium">Previous</th>}
              {previous && <th className="py-2 text-right font-medium">Δ</th>}
            </tr>
          </thead>
          <tbody>
            {BUCKETS.map((b) => {
              const now = amountFor(latest, b);
              const before = previous ? amountFor(previous, b) : 0;
              const delta = now - before;
              return (
                <tr key={b} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5">{BUCKET_LABELS[b]}</td>
                  <td className="py-2.5 text-right font-mono font-semibold tabular-nums">
                    {usd(now)}
                  </td>
                  {previous && (
                    <td className="py-2.5 text-right font-mono text-faint tabular-nums">
                      {usd(before)}
                    </td>
                  )}
                  {previous && (
                    <td
                      className={`py-2.5 text-right font-mono font-semibold tabular-nums ${
                        delta > 0 ? 'text-good' : delta < 0 ? 'text-bad' : 'text-faint'
                      }`}
                    >
                      {delta > 0 ? '+' : ''}
                      {usd(delta)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-xs text-faint">
        {snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'} saved locally.
      </p>
      <Link
        href="/plan"
        className="inline-block text-sm text-moss font-semibold hover:underline underline-offset-2"
      >
        ← Back to plan
      </Link>
    </div>
  );
}
