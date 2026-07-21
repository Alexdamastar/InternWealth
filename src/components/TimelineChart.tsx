'use client';

// Feature 1.1 — the paycheck timeline as a MILESTONE STRIP: one row per
// bucket, a bar spanning "starts filling → funded", with the completion date
// on the row. A stacked area of cumulative pay was a straight diagonal by
// construction (every dollar is always allocated somewhere), so the only real
// information — the order and timing of goals completing — IS this chart.
// Bucket colors reuse the CVD-validated categorical slots from the donut.
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

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

interface Row {
  bucket: AllocationBucket;
  startPct: number; // where the bar begins (first paycheck that funds it)
  endPct: number; // where it ends (completion, or the last paycheck)
  finalAmount: number; // dollars in the bucket at summer's end
  done?: { date: string; week: number }; // capped during the window
  remaining?: number; // capped bucket that never finished
  started: boolean; // received at least one dollar
}

export default function TimelineChart({ timeline }: { timeline: TimelineResult }) {
  const { points, milestones, unfinished, paycheckCount, totalIn } = timeline;
  const last = points[points.length - 1];

  const t0 = parseISO(points[0].date);
  const span = Math.max(1, parseISO(last.date) - t0);
  const pct = (iso: string) => ((parseISO(iso) - t0) / span) * 100;

  const rows: Row[] = ROW_ORDER.flatMap((bucket) => {
    const finalAmount = last.buckets[bucket] ?? 0;
    const shortfall = unfinished.find((u) => u.bucket === bucket)?.remaining;
    if (finalAmount <= 0 && !shortfall) return []; // never in play this summer

    const firstFunded = points.find((p) => p.buckets[bucket] > 0);
    const milestone = milestones.find((m) => m.bucket === bucket);
    const started = Boolean(firstFunded);
    return [
      {
        bucket,
        started,
        startPct: firstFunded ? pct(firstFunded.date) : 0,
        endPct: milestone ? pct(milestone.date) : 100,
        finalAmount,
        done: milestone ? { date: milestone.date, week: milestone.week } : undefined,
        remaining: shortfall,
      },
    ];
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
      <p className="text-sm text-ink-2 mb-5 leading-relaxed">
        When each goal starts filling and when it&apos;s funded — same waterfall
        math, played forward paycheck by paycheck.
      </p>

      <div
        role="img"
        aria-label={`Goal timeline: ${rows
          .map((r) =>
            r.done
              ? `${BUCKET_LABELS[r.bucket]} funded ${shortDate(r.done.date)}`
              : `${BUCKET_LABELS[r.bucket]} ${
                  r.remaining ? `${usd(r.remaining)} short` : 'filling all summer'
                }`,
          )
          .join(', ')}`}
      >
        {/* Time axis: a tick per paycheck, dates at the ends. */}
        <div className="ml-[7.5rem] mr-[10.5rem] relative h-5">
          {points.map((p) => (
            <span
              key={p.date}
              className="absolute top-1.5 h-1.5 w-px bg-faint/60"
              style={{ left: `${pct(p.date)}%` }}
            />
          ))}
          <span className="absolute left-0 top-0 font-mono text-[10px] text-faint -translate-x-1/2">
            {shortDate(points[0].date)}
          </span>
          <span className="absolute right-0 top-0 font-mono text-[10px] text-faint translate-x-1/2">
            {shortDate(last.date)}
          </span>
        </div>

        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.bucket} className="flex items-center gap-3">
              {/* Label */}
              <span className="w-[6.75rem] shrink-0 text-xs text-ink-2 text-right leading-tight">
                {BUCKET_LABELS[r.bucket]}
              </span>

              {/* Track + bar */}
              <div className="relative flex-1 h-4">
                <div className="absolute inset-y-[6px] inset-x-0 bg-line/50" />
                {r.started && (
                  <div
                    className="absolute inset-y-1 rounded-r-[3px]"
                    style={{
                      left: `${r.startPct}%`,
                      width: `${Math.max(1.5, r.endPct - r.startPct)}%`,
                      backgroundColor: BUCKET_COLORS[r.bucket],
                    }}
                  />
                )}
                {/* Completion flag */}
                {r.done && (
                  <span
                    className="absolute top-0 bottom-0 w-[2px]"
                    style={{
                      left: `calc(${r.endPct}% - 1px)`,
                      backgroundColor: BUCKET_COLORS[r.bucket],
                    }}
                  />
                )}
              </div>

              {/* Outcome */}
              <span className="w-[9.5rem] shrink-0 text-xs font-mono leading-tight">
                {r.done ? (
                  <>
                    <span className="text-good font-semibold">✓ {shortDate(r.done.date)}</span>
                    <span className="text-faint"> · wk {r.done.week} · {usd(r.finalAmount)}</span>
                  </>
                ) : r.remaining ? (
                  <span className="text-warn-text">
                    {usd(r.remaining)} short{r.started ? '' : ' — never starts'}
                  </span>
                ) : (
                  <span className="text-ink-2">
                    {usd(r.finalAmount)}
                    <span className="text-faint"> by summer&apos;s end</span>
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
