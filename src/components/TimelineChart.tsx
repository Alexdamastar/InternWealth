'use client';

// Feature 1.1 — the paycheck timeline. A stacked area chart of the waterfall
// filling paycheck by paycheck, plus the milestone story ("Emergency fund
// complete July 18 · Roth maxed by week 10"). Change-over-time = stacked area;
// bucket colors reuse the CVD-validated categorical slots from the donut so
// identity is consistent across the page. Milestone chips carry the exact
// dates — the chart shows shape, the chips show the story.
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

const STACK_ORDER: AllocationBucket[] = [
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

// "2026-07-18" -> "Jul 18" (UTC, so the label matches the ISO date exactly).
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

  const data = points.map((p) => ({
    date: shortDate(p.date),
    ...p.buckets,
  }));

  // Only stack buckets that ever receive a dollar, in waterfall order.
  const activeBuckets = STACK_ORDER.filter((b) =>
    points.some((p) => p.buckets[b] > 0),
  );

  return (
    <div className="bg-card border border-line shadow-card p-5">
      <div className="flex items-baseline justify-between mb-1 gap-3 flex-wrap">
        <h3 className="font-display font-semibold text-lg">Paycheck timeline</h3>
        <span className="font-mono text-sm text-ink-2">
          {paycheckCount} paychecks <span className="text-faint">·</span> {usd(totalIn)}{' '}
          <span className="text-faint">total</span>
        </span>
      </div>
      <p className="text-sm text-ink-2 mb-4 leading-relaxed">
        How your allocation fills up, paycheck by paycheck — same waterfall math,
        played forward through the summer.
      </p>

      {/* The milestone story — the headline feature. */}
      {(milestones.length > 0 || unfinished.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {milestones.map((m) => (
            <span
              key={m.bucket}
              className="inline-flex items-center gap-2 border border-line bg-paper/70 px-2.5 py-1 text-xs"
            >
              <span
                className="inline-block w-2 h-2"
                style={{ backgroundColor: BUCKET_COLORS[m.bucket] }}
              />
              <span className="text-ink-2">{BUCKET_LABELS[m.bucket]}</span>
              <span className="font-mono font-semibold text-good">
                ✓ {shortDate(m.date)}
              </span>
              <span className="font-mono text-faint">wk {m.week}</span>
            </span>
          ))}
          {unfinished.map((u) => (
            <span
              key={u.bucket}
              className="inline-flex items-center gap-2 border border-line bg-paper/70 px-2.5 py-1 text-xs"
            >
              <span
                className="inline-block w-2 h-2"
                style={{ backgroundColor: BUCKET_COLORS[u.bucket] }}
              />
              <span className="text-ink-2">{BUCKET_LABELS[u.bucket]}</span>
              <span className="font-mono text-warn-text">
                {usd(u.remaining)} short by summer&apos;s end
              </span>
            </span>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="date"
            fontSize={11}
            stroke="#8a857a"
            tickLine={false}
            axisLine={{ stroke: '#e5ddca' }}
          />
          <YAxis
            tickFormatter={(v) => usd(Number(v))}
            fontSize={11}
            stroke="#8a857a"
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) => [
              usd(Number(v)),
              BUCKET_LABELS[name as AllocationBucket] ?? String(name),
            ]}
            contentStyle={{
              background: '#fffdf8',
              border: '1px solid #e5ddca',
              borderRadius: 0,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
          />
          {activeBuckets.map((b) => (
            <Area
              key={b}
              dataKey={b}
              stackId="waterfall"
              stroke={BUCKET_COLORS[b]}
              strokeWidth={2}
              fill={BUCKET_COLORS[b]}
              fillOpacity={0.1}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend (>= 2 series get one; identity never rides on color alone). */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
        {activeBuckets.map((b) => (
          <span key={b} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
            <span
              className="inline-block w-2.5 h-2.5"
              style={{ backgroundColor: BUCKET_COLORS[b] }}
            />
            {BUCKET_LABELS[b]}
          </span>
        ))}
      </div>
    </div>
  );
}
