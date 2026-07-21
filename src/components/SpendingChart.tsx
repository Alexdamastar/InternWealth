'use client';

// Horizontal bar chart of spending (absolute outflows) by category. See §7.
// This is a magnitude ("how much per category") chart, so per the dataviz
// method it uses ONE sequential hue — not a rainbow of categorical colors.
// Category identity is carried by the row label, value by the bar length +
// direct label at the tip.

import {
  Bar,
  BarChart,
  LabelList,
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

// One-hue ordinal ramp (moss family, dark→light with rank). All steps clear
// 2:1 on the card surface; the direct value labels carry exact numbers.
const RAMP = ['#0e4530', '#175e40', '#2b7a55', '#47946d', '#67ad88'];

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
    .sort((a, b) => b.value - a.value)
    .map((d, i) => ({ ...d, fill: RAMP[Math.min(i, RAMP.length - 1)] }));

  return (
    <div className="bg-card border border-line shadow-card p-5">
      <h3 className="font-display font-semibold text-lg mb-3">
        Spending by category
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-faint">No spending to show yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => usd(Number(v))}
              fontSize={11}
              stroke="#8a857a"
              tickLine={false}
              axisLine={{ stroke: '#e5ddca' }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={104}
              fontSize={12}
              stroke="#57534a"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v) => usd(Number(v))}
              cursor={{ fill: 'rgba(23,94,64,0.06)' }}
              contentStyle={{
                background: '#fffdf8',
                border: '1px solid #e5ddca',
                borderRadius: 0,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
            />
            <Bar dataKey="value" barSize={18} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: React.ReactNode) => usd(Number(v))}
                style={{
                  fill: '#57534a',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
