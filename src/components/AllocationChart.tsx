'use client';

// The allocation as a donut pie chart. See §4/§10.4.
// Hand-rolled SVG (like the plain-div stacked bar this replaced): each slice
// is a path with a CSS-transitioned transform, so hovering/clicking a slice —
// or its legend row — smoothly pops it outward along its mid-angle. Colors are
// a CVD-validated categorical palette in fixed slot order (never cycled). The
// legend below doubles as the direct-label layer; the donut hole shows the
// hovered slice (or the total at rest).
import { useState } from 'react';
import type { AllocationResult } from '@/lib/types';

// Fixed slot order — validated adjacent-pair CVD ΔE ≥ 8, normal ΔE ≥ 15.
const BUCKET_COLORS: Record<string, string> = {
  emergency: '#2a78d6', // blue
  school: '#008300', // green
  roth: '#e87ba4', // magenta
  '401k': '#eda100', // yellow
  brokerage: '#1baf7a', // aqua
  cash: '#eb6834', // orange
};

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Donut geometry (viewBox units). The 8px margin absorbs the hover pop.
const SIZE = 240;
const C = SIZE / 2;
const R_OUTER = 104;
const R_INNER = 68;
const POP = 7; // hover translate distance along the slice's mid-angle

// Point on a circle where 0° is 12 o'clock and angles run clockwise.
function polar(r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

// A filled donut segment from `start` to `end` degrees.
function donutArc(
  start: number,
  end: number,
  rInner = R_INNER,
  rOuter = R_OUTER,
): string {
  const sweep = Math.min(end - start, 359.99);
  end = start + sweep;
  const [x1, y1] = polar(rOuter, start);
  const [x2, y2] = polar(rOuter, end);
  const [x3, y3] = polar(rInner, end);
  const [x4, y4] = polar(rInner, start);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export default function AllocationChart({ result }: { result: AllocationResult }) {
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const funded = result.steps.filter((s) => s.amount > 0);
  const total = funded.reduce((sum, s) => sum + s.amount, 0);

  // Build slice geometry: [startAngle, endAngle) per funded bucket.
  let cursor = 0;
  const slices = funded.map((step) => {
    const start = cursor;
    const sweep = (step.amount / total) * 360;
    cursor += sweep;
    const mid = start + sweep / 2;
    return { step, start, end: cursor, mid };
  });

  const shown = active ?? pinned;
  const hovered = shown !== null ? funded[shown] : null;

  return (
    <div className="bg-card border border-line shadow-card p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-display font-semibold text-lg">Allocation</h3>
        <span className="font-mono text-sm text-ink-2">
          {usd(total)} <span className="text-faint">allocated</span>
        </span>
      </div>

      {funded.length === 0 ? (
        <p className="text-sm text-faint">No allocatable cash yet.</p>
      ) : (
        <>
          <div
            className="relative"
            role="img"
            aria-label={`Allocation: ${funded
              .map((s) => `${s.label} ${usd(s.amount)}`)
              .join(', ')}`}
          >
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="mx-auto h-60 w-full"
              onMouseLeave={() => setActive(null)}
            >
              {/* Visual layer: animated, pointer-transparent. */}
              {slices.map(({ step, start, end, mid }, i) => {
                const popped = shown === i;
                const rad = ((mid - 90) * Math.PI) / 180;
                const dx = Math.cos(rad) * POP;
                const dy = Math.sin(rad) * POP;
                return (
                  <path
                    key={step.bucket}
                    d={donutArc(start, end)}
                    fill={BUCKET_COLORS[step.bucket]}
                    stroke="#fffdf8"
                    strokeWidth={2}
                    pointerEvents="none"
                    className="transition-transform duration-200 ease-out motion-reduce:transition-none"
                    style={{
                      transform: popped ? `translate(${dx}px, ${dy}px)` : undefined,
                    }}
                  />
                );
              })}
              {/* Hit layer: invisible, STATIC (never moves with the pop), and
                  slightly over-sized so the pop can't strand the cursor in a
                  dead zone or straddle two slices — hover handoff stays crisp. */}
              {slices.map(({ step, start, end }, i) => (
                <path
                  key={`hit-${step.bucket}`}
                  d={donutArc(start, end, R_INNER - POP, R_OUTER + POP + 2)}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setPinned((prev) => (prev === i ? null : i))}
                >
                  <title>{`${step.label}: ${usd(step.amount)}`}</title>
                </path>
              ))}
            </svg>
            {/* Donut-hole readout: hovered slice, or the total at rest. Sized
                to stay inside the hole (diameter 2×R_INNER ≈ 136px at h-60). */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[7.5rem] text-center">
                {hovered ? (
                  <>
                    <div className="font-display font-semibold text-xl text-ink leading-tight">
                      {usd(hovered.amount)}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-faint leading-tight line-clamp-2 mt-0.5">
                      {hovered.label} · {Math.round((hovered.amount / total) * 100)}%
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-display font-semibold text-2xl text-ink leading-tight">
                      {usd(total)}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-faint mt-0.5">
                      allocated
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Legend doubles as the direct-label layer and a second hover target. */}
          <div className="mt-4 grid gap-x-8 gap-y-0.5 sm:grid-cols-2">
            {funded.map((step, i) => (
              <button
                key={step.bucket}
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setPinned((prev) => (prev === i ? null : i))}
                className={`flex items-baseline justify-between gap-3 text-sm text-left px-1.5 py-1 -mx-1.5 transition-colors ${
                  shown === i ? 'bg-paper/80' : ''
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-2.5 h-2.5 shrink-0 transition-transform motion-reduce:transition-none"
                    style={{
                      backgroundColor: BUCKET_COLORS[step.bucket],
                      transform: shown === i ? 'scale(1.35)' : undefined,
                    }}
                  />
                  <span className="text-ink-2 truncate">{step.label}</span>
                </span>
                <span className="font-mono text-ink whitespace-nowrap">
                  {usd(step.amount)}
                  <span className="text-faint text-xs ml-1.5">
                    {Math.round((step.amount / total) * 100)}%
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
