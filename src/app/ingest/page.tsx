'use client';

// /ingest — connect a bank via Plaid, or upload / paste / load-sample bank
// transactions. CSV rows are categorized by LLM if a key exists (else the
// deterministic local fallback); Plaid rows arrive already categorized by a
// deterministic mapping table. Preview, chart, persist for the plan page.
// See TECHNICAL_PLAN.md §6.

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { parseCsv } from '@/lib/csv';
import {
  categorizeLocal,
  deriveMonthlyIncome,
  deriveSpendingByCategory,
} from '@/lib/categorize';
import { setTransactions } from '@/lib/storage';
import SpendingChart from '@/components/SpendingChart';
import PlaidLinkButton from '@/components/PlaidLinkButton';
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

  // Plaid transactions arrive already categorized (deterministic PFC mapping
  // server-side), so they skip the categorize step entirely.
  const onPlaidTransactions = useCallback((incoming: Transaction[], label: string) => {
    setTxns(incoming);
    setTransactions(incoming);
    setStatus(`Loaded ${incoming.length} transactions from ${label}.`);
  }, []);

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss mb-3">
          Step 02 · Transactions
        </p>
        <h1 className="font-display font-semibold text-3xl tracking-tight">
          Where your money went
        </h1>
        <p className="text-sm text-ink-2 mt-2 max-w-2xl leading-relaxed">
          Connect your bank, upload a CSV statement, paste rows, or load the
          sample. We categorize each transaction (via Claude on Bedrock if your
          AWS access is available, otherwise a built-in keyword categorizer)
          and summarize your spending.
        </p>
      </header>

      <section
        className="bg-card border border-line shadow-card p-5 space-y-5 rise"
        style={{ animationDelay: '0.1s' }}
      >
        <PlaidLinkButton
          onTransactions={onPlaidTransactions}
          onStatus={setStatus}
          disabled={busy}
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">
            <span className="mr-2 font-mono text-xs uppercase tracking-wider text-faint">
              CSV file
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              disabled={busy}
              className="text-sm text-ink-2 file:mr-3 file:border file:border-moss file:bg-transparent file:px-3 file:py-1.5 file:text-moss file:font-semibold file:text-sm hover:file:bg-moss hover:file:text-paper file:transition-colors file:cursor-pointer"
            />
          </label>
          <button
            onClick={onLoadSample}
            disabled={busy}
            className="border border-ink/25 px-4 py-2 text-sm font-semibold hover:border-ink hover:bg-paper transition-colors disabled:opacity-50"
          >
            Load sample statement
          </button>
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-faint mb-1.5">
            Or paste CSV rows
          </label>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder="Date,Description,Amount&#10;2026-07-01,SAFEWAY,-42.10"
            className="w-full bg-paper/60 border border-line p-3 text-sm font-mono placeholder:text-faint focus:border-moss"
            disabled={busy}
          />
          <button
            onClick={onPaste}
            disabled={busy}
            className="mt-2 bg-moss text-paper px-4 py-2 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors disabled:opacity-50"
          >
            Parse pasted text
          </button>
        </div>

        {status && (
          <p className="text-sm text-ink-2 font-mono border-t border-line pt-3">
            {status}
          </p>
        )}
      </section>

      {txns.length > 0 && (
        <>
          <section className="grid gap-px sm:grid-cols-3 bg-line border border-line shadow-card">
            <Stat label="Est. monthly income" value={usd(monthlyIncome)} />
            <Stat label="Total outflow (period)" value={usd(totalOutflow)} />
            <Stat label="Transactions" value={String(txns.length)} />
          </section>

          {spendingByCategory && <SpendingChart spendingByCategory={spendingByCategory} />}

          <section className="bg-card border border-line shadow-card p-5">
            <h3 className="font-display font-semibold text-lg mb-3">
              Every transaction
            </h3>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-faint border-b border-ink/60 sticky top-0 bg-card">
                  <tr className="font-mono text-xs uppercase tracking-wider">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Description</th>
                    <th className="py-2 pr-3 font-medium text-right">Amount</th>
                    <th className="py-2 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="py-1.5 pr-3 whitespace-nowrap text-faint font-mono text-xs">
                        {t.date}
                      </td>
                      <td className="py-1.5 pr-3">{t.description}</td>
                      <td
                        className={`py-1.5 pr-3 text-right whitespace-nowrap font-mono tabular-nums ${
                          t.amount < 0 ? 'text-ink' : 'text-good'
                        }`}
                      >
                        {usd(t.amount)}
                      </td>
                      <td className="py-1.5">
                        <span className="inline-block border border-line bg-paper/70 px-2 py-0.5 text-xs text-ink-2">
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
              className="inline-block bg-moss text-paper px-7 py-3 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors shadow-card"
            >
              Next: estimate your taxes →
            </Link>
            <Link href="/plan" className="text-sm text-faint hover:text-ink underline">
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
    <div className="bg-card p-5">
      <div className="font-mono text-xs uppercase tracking-wider text-faint mb-1.5">
        {label}
      </div>
      <div className="font-display font-semibold text-2xl">{value}</div>
    </div>
  );
}
