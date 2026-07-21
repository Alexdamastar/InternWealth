'use client';

// Feature 1.1 — the paycheck timeline, rendered as a plain milestone LIST.
// No chart: the simulator's story ("Roth IRA funded Aug 10, week 11") is
// strongest as dated line items. One row per bucket that's in play — funded
// date + week + amount, a shortfall warning, or the running total for
// uncapped buckets. Colors reuse the CVD-validated slots from the donut.
import type { TimelineResult } from '@/lib/timeline';
import type { AllocationBucket } from '@/lib/types';

// Same fixed slots as AllocationChart — color follows the bucket everywhere.
const BUCKET_COLORS: Record<string, string> = {
  emergency: '#2a78d6',
  school: '#008300',
  roth: '#e87ba4',
  '401k': '#eda100',
  brokerage: '#1baf7a',
  cash: '#eb6834',
};

const ROW_ORDER: AllocationBucket[] = [
  'emergency',
  'school',
  'roth',
  '401k',
  'brokerage',
  'cash',
];

const BUCKET_LABELS: Record<AllocationBucket, string> = {
  emergency: 'Emergency fund',
  school: 'School-year',
  roth: 'Roth IRA',
  '401k': 'Roth 401(k)',
  brokerage: 'Brokerage',
  cash: 'Cash',
};

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// "2026-07-18" -> "Jul 18" (UTC so the label matches the ISO date exactly).
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function TimelineChart({ timeline }: { timeline: TimelineResult }) {
  const { points, milestones, unfinished, paycheckCount, totalIn } = timeline;
  const last = points[points.length - 1];

  const rows = ROW_ORDER.flatMap((bucket) => {
    const finalAmount = last.buckets[bucket] ?? 0;
    const shortfall = unfinished.find((u) => u.bucket === bucket)?.remaining;
    if (finalAmount <= 0 && !shortfall) return []; // never in play this summer
    const milestone = milestones.find((m) => m.bucket === bucket);
    return [{ bucket, finalAmount, shortfall, milestone }];
  });

  return (
    <div className="bg-card border border-line shadow-card p-5">
      <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
        <h3 className="font-display font-semibold text-lg">Goal timeline</h3>
        <span className="font-mono text-sm text-ink-2">
          {paycheckCount} paychecks <span className="text-faint">·</span> {usd(totalIn)}{' '}
          <span className="text-faint">total</span>
        </span>
      </div>
      <p className="text-sm text-ink-2 mb-4 leading-relaxed">
        When each goal is funded — same waterfall math, played forward paycheck
        by paycheck.
      </p>

      <ul className="divide-y divide-line/70">
        {rows.map(({ bucket, finalAmount, shortfall, milestone }) => (
          <li key={bucket} className="flex items-baseline justify-between gap-3 py-2">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 shrink-0"
                style={{ backgroundColor: BUCKET_COLORS[bucket] }}
              />
              <span className="text-sm text-ink-2">{BUCKET_LABELS[bucket]}</span>
            </span>
            <span className="font-mono text-sm whitespace-nowrap">
              {milestone ? (
                <>
                  <span className="text-good font-semibold">
                    ✓ funded {shortDate(milestone.date)}
                  </span>
                  <span className="text-faint">
                    {' '}
                    · week {milestone.week} · {usd(finalAmount)}
                  </span>
                </>
              ) : shortfall ? (
                <span className="text-warn-text">
                  {usd(shortfall)} short by summer&apos;s end
                </span>
              ) : (
                <>
                  <span className="text-ink">{usd(finalAmount)}</span>
                  <span className="text-faint"> by summer&apos;s end</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
