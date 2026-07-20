'use client';

// The allocation as a single stacked horizontal bar. See §4/§10.4.
// Rendered with plain divs (a one-row stack needs no chart lib): 24px tall,
// 2px surface gaps between segments, direct-labeled legend below. Colors are
// a CVD-validated categorical palette in fixed slot order (never cycled).
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

export default function AllocationChart({ result }: { result: AllocationResult }) {
  const funded = result.steps.filter((s) => s.amount > 0);
  const total = funded.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="bg-card border border-line shadow-card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Allocation</h3>
        <span className="font-mono text-sm text-ink-2">
          {usd(total)} <span className="text-faint">allocated</span>
        </span>
      </div>

      {funded.length === 0 ? (
        <p className="text-sm text-faint">No allocatable cash yet.</p>
      ) : (
        <>
          {/* The stack: one flex row, 2px surface gaps, 4px rounded data-end */}
          <div
            className="flex h-6 w-full gap-[2px] overflow-hidden rounded-r"
            role="img"
            aria-label={`Allocation: ${funded
              .map((s) => `${s.label} ${usd(s.amount)}`)
              .join(', ')}`}
          >
            {funded.map((step) => (
              <div
                key={step.bucket}
                title={`${step.label}: ${usd(step.amount)}`}
                style={{
                  width: `${(step.amount / total) * 100}%`,
                  backgroundColor: BUCKET_COLORS[step.bucket],
                }}
              />
            ))}
          </div>

          {/* Legend doubles as the direct-label layer (relief for light hues). */}
          <div className="mt-4 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {funded.map((step) => (
              <div
                key={step.bucket}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-2.5 h-2.5 shrink-0"
                    style={{ backgroundColor: BUCKET_COLORS[step.bucket] }}
                  />
                  <span className="text-ink-2 truncate">{step.label}</span>
                </span>
                <span className="font-mono text-ink whitespace-nowrap">
                  {usd(step.amount)}
                  <span className="text-faint text-xs ml-1.5">
                    {Math.round((step.amount / total) * 100)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
