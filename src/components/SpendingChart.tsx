'use client';

// Horizontal bar chart of spending (absolute outflows) by category.
// Only categories with >0 spending are shown. See §7.

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TxCategory } from '@/lib/types';

const CATEGORY_LABELS: Record<TxCategory, string> = {
  income: 'Income',
  transfer: 'Transfers',
  rent: 'Rent',
  groceries: 'Groceries',
  dining_out: 'Dining out',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  shopping: 'Shopping',
  fees: 'Fees',
  other: 'Other',
};

// Brand-neutral categorical palette (indigo-forward to match the app accent).
const COLORS = [
  '#4f46e5',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
];

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function SpendingChart({
  spendingByCategory,
}: {
  spendingByCategory: Record<TxCategory, number>;
}) {
  const data = (Object.entries(spendingByCategory) as [TxCategory, number][])
    .filter(([, value]) => value > 0)
    .map(([category, value]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      value: Math.round(value),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-3">Spending by category</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No spending to show yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          >
            <XAxis type="number" tickFormatter={(v) => usd(Number(v))} fontSize={12} />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v) => usd(Number(v))}
              cursor={{ fill: 'rgba(79,70,229,0.06)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
