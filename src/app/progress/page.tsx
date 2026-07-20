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
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Progress</h1>
        <p className="text-sm text-gray-600">
          No snapshots saved yet. Build a plan and click{' '}
          <strong>Save snapshot</strong> on the{' '}
          <Link href="/plan" className="text-indigo-600 hover:underline">
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Progress</h1>
        <p className="text-sm text-gray-600">
          {previous
            ? 'Latest snapshot vs. the one before it.'
            : 'Your first snapshot. Save another after editing goals to see deltas.'}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>
            Latest: {new Date(latest.createdAt).toLocaleString()}
          </span>
          {previous && (
            <span>
              Previous: {new Date(previous.createdAt).toLocaleString()}
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2">Bucket</th>
              <th className="py-2 text-right">Latest</th>
              {previous && <th className="py-2 text-right">Previous</th>}
              {previous && <th className="py-2 text-right">Δ</th>}
            </tr>
          </thead>
          <tbody>
            {BUCKETS.map((b) => {
              const now = amountFor(latest, b);
              const before = previous ? amountFor(previous, b) : 0;
              const delta = now - before;
              return (
                <tr key={b} className="border-b border-gray-50">
                  <td className="py-2 capitalize">{b}</td>
                  <td className="py-2 text-right font-medium">{usd(now)}</td>
                  {previous && (
                    <td className="py-2 text-right text-gray-500">{usd(before)}</td>
                  )}
                  {previous && (
                    <td
                      className={`py-2 text-right font-medium ${
                        delta > 0
                          ? 'text-emerald-600'
                          : delta < 0
                            ? 'text-red-600'
                            : 'text-gray-400'
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

      <p className="text-xs text-gray-500">
        {snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'} saved locally.
      </p>
      <Link href="/plan" className="text-sm text-indigo-600 hover:underline">
        ← Back to plan
      </Link>
    </div>
  );
}
