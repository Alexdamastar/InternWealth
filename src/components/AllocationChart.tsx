'use client';

// The allocation as a single stacked horizontal bar. See §4/§10.4.
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AllocationResult } from '@/lib/types';

const BUCKET_COLORS: Record<string, string> = {
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
  // Build a single-row stacked bar: one key per bucket.
  const row: Record<string, number | string> = { name: 'Plan' };
  for (const step of result.steps) row[step.bucket] = step.amount;

  const funded = result.steps.filter((s) => s.amount > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-3">Allocation waterfall</h3>
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={[row]} layout="vertical" stackOffset="none">
          <XAxis type="number" tickFormatter={(v) => usd(Number(v))} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={(value: unknown) => usd(Number(value))} />
          {result.steps.map((step) => (
            <Bar key={step.bucket} dataKey={step.bucket} stackId="a" name={step.label}>
              <Cell fill={BUCKET_COLORS[step.bucket]} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-3 mt-3">
        {funded.map((step) => (
          <div key={step.bucket} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: BUCKET_COLORS[step.bucket] }}
            />
            <span className="text-gray-700">{step.label}</span>
            <span className="font-medium">{usd(step.amount)}</span>
          </div>
        ))}
        {funded.length === 0 && (
          <p className="text-xs text-gray-500">No allocatable cash yet.</p>
        )}
      </div>
    </div>
  );
}
