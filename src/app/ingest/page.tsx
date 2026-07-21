'use client';

// /ingest — upload / paste / load-sample bank transactions, categorize them
// (LLM if a key exists, else deterministic local fallback), preview, chart,
// and persist for the plan page. See TECHNICAL_PLAN.md §6.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { parseCsv } from '@/lib/csv';
import {
  categorizeLocal,
  deriveMonthlyIncome,
  deriveSpendingByCategory,
} from '@/lib/categorize';
import { setTransactions } from '@/lib/storage';
import SpendingChart from '@/components/SpendingChart';
import type { Transaction, TxCategory } from '@/lib/types';

const CATEGORY_LABELS: Record<TxCategory, string> = {
  income: 'Income',
  transfer: 'Transfer',
  rent: 'Rent',
  groceries: 'Groceries',
  dining_out: 'Dining out',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  shopping: 'Shopping',
  fees: 'Fees',
  other: 'Other',
};

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/** Categorize via the API route (LLM on Bedrock) with a local fallback. */
async function categorize(txns: Transaction[]): Promise<Transaction[]> {
  try {
    const res = await fetch('/api/categorize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transactions: txns }),
    });
    const data = (await res.json()) as { transactions?: Transaction[] };
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      return data.transactions;
    }
  } catch {
    // fall through
  }
  return categorizeLocal(txns);
}

export default function IngestPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [pasted, setPasted] = useState('');
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const spendingByCategory = useMemo(
    () => (txns.length ? deriveSpendingByCategory(txns) : null),
    [txns],
  );
  const monthlyIncome = useMemo(
    () => (txns.length ? deriveMonthlyIncome(txns) : 0),
    [txns],
  );
  const totalOutflow = useMemo(
    () => txns.reduce((sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum), 0),
    [txns],
  );

  async function ingest(text: string, label: string) {
    setBusy(true);
    setStatus(`Parsing ${label}…`);
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setStatus('No usable transactions found. Check the file format (needs Date, Description, Amount).');
      setBusy(false);
      return;
    }
    setStatus(`Categorizing ${parsed.length} transactions…`);
    const categorized = await categorize(parsed);
    setTxns(categorized);
    setTransactions(categorized);
    setStatus(`Loaded ${categorized.length} transactions from ${label}.`);
    setBusy(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await ingest(text, file.name);
  }

  async function onPaste() {
    if (!pasted.trim()) {
      setStatus('Paste some CSV rows first.');
      return;
    }
    await ingest(pasted, 'pasted text');
  }

  async function onLoadSample() {
    try {
      const res = await fetch('/sample-statement.csv');
      const text = await res.text();
      await ingest(text, 'sample statement');
    } catch {
      setStatus('Could not load the sample statement.');
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Transactions</h1>
        <p className="text-gray-600 text-sm max-w-2xl">
          Upload a CSV bank statement, paste rows, or load the sample. We categorize
          each transaction (via Claude on Bedrock if your AWS access is available,
          otherwise a built-in keyword categorizer) and summarize your spending.
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">
            <span className="mr-2">CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              disabled={busy}
              className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100"
            />
          </label>
          <button
            onClick={onLoadSample}
            disabled={busy}
            className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Load sample statement
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Or paste CSV rows</label>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder="Date,Description,Amount&#10;2026-07-01,SAFEWAY,-42.10"
            className="w-full rounded-md border border-gray-300 p-2 text-sm font-mono"
            disabled={busy}
          />
          <button
            onClick={onPaste}
            disabled={busy}
            className="mt-2 bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Parse pasted text
          </button>
        </div>

        {status && <p className="text-sm text-gray-600">{status}</p>}
      </section>

      {txns.length > 0 && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Stat label="Est. monthly income" value={usd(monthlyIncome)} />
            <Stat label="Total outflow (period)" value={usd(totalOutflow)} />
            <Stat label="Transactions" value={String(txns.length)} />
          </section>

          {spendingByCategory && <SpendingChart spendingByCategory={spendingByCategory} />}

          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Transactions</h3>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Date</th>
                    <th className="py-1.5 pr-3 font-medium">Description</th>
                    <th className="py-1.5 pr-3 font-medium text-right">Amount</th>
                    <th className="py-1.5 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-600">{t.date}</td>
                      <td className="py-1.5 pr-3">{t.description}</td>
                      <td
                        className={`py-1.5 pr-3 text-right whitespace-nowrap tabular-nums ${
                          t.amount < 0 ? 'text-gray-900' : 'text-green-700'
                        }`}
                      >
                        {usd(t.amount)}
                      </td>
                      <td className="py-1.5">
                        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {t.category ? CATEGORY_LABELS[t.category] : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex items-center gap-4">
            <Link
              href="/tax"
              className="inline-block bg-indigo-600 text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-indigo-700"
            >
              Next: estimate your taxes →
            </Link>
            <Link href="/plan" className="text-sm text-gray-500 hover:text-gray-700 underline">
              Skip to plan
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
