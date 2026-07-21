'use client';

// The allocation as a donut pie chart: one slice per funded bucket, with the
// total allocatable amount in the center. Colors stay consistent with the rest
// of the app (SurplusSplitter, flow visuals).
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AllocationResult } from '@/lib/types';

export const BUCKET_COLORS: Record<string, string> = {
  emergency: '#0ea5e9', // sky
  school: '#8b5cf6', // violet
  roth: '#10b981', // emerald
  '401k': '#f59e0b', // amber
  brokerage: '#6366f1', // indigo
  cash: '#64748b', // slate
};

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function AllocationChart({ result }: { result: AllocationResult }) {
  const funded = result.steps.filter((s) => s.amount > 0);
  const data = funded.map((s) => ({
    name: s.label,
    bucket: s.bucket,
    value: s.amount,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-semibold text-sm mb-1 text-gray-900">Your allocation</h3>
      <p className="text-xs text-gray-500 mb-2">
        How this run&apos;s {usd(result.totalAllocatable)} is divided.
      </p>

      {funded.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No allocatable cash yet.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-1/2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [usd(Number(value)), String(name)]}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="90%"
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive
                >
                  {data.map((d) => (
                    <Cell key={d.bucket} fill={BUCKET_COLORS[d.bucket]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-widest text-gray-500">
                Total
              </span>
              <span className="text-xl font-bold text-gray-900 tabular-nums">
                {usd(result.totalAllocatable)}
              </span>
            </div>
          </div>

          {/* Legend with amounts + share */}
          <div className="flex-1 w-full space-y-2">
            {funded.map((step) => {
              const pct =
                result.totalAllocatable > 0
                  ? Math.round((step.amount / result.totalAllocatable) * 100)
                  : 0;
              return (
                <div key={step.bucket} className="flex items-center gap-2.5 text-sm">
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: BUCKET_COLORS[step.bucket] }}
                  />
                  <span className="text-gray-700 flex-1 truncate">{step.label}</span>
                  <span className="text-gray-500 text-xs tabular-nums">{pct}%</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {usd(step.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
