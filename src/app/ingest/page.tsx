'use client';

// /ingest — connect a bank via Plaid, or upload / paste / load-sample bank
// transactions. CSV rows are categorized by LLM if a key exists (else the
// deterministic local fallback); Plaid rows arrive already categorized by a
// deterministic mapping table. Preview, chart, persist for the plan page.
// See TECHNICAL_PLAN.md §6.

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  // useSearchParams (inside IngestContent) requires a Suspense boundary on a
  // prerendered route — see docs/use-search-params.md.
  return (
    <Suspense fallback={<p className="text-sm text-faint font-mono">Loading…</p>}>
      <IngestContent />
    </Suspense>
  );
}

function IngestContent() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [pasted, setPasted] = useState('');
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  // Bank-first layout: Plaid is the hero when configured; the CSV path is a
  // collapsed secondary option. Until availability is known we show neither
  // hero nor fallback prominence flips (no layout flash).
  const [plaid, setPlaid] = useState<{ available: boolean; linked: boolean } | null>(null);
  // ?connect=1 (landing-page CTA) opens the Link flow as soon as it's ready.
  const autoConnect = useSearchParams().get('connect') === '1';

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

  const onPlaidState = useCallback(
    (state: { available: boolean; linked: boolean }) => setPlaid(state),
    [],
  );

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss mb-3">
          Step 01 · Get started
        </p>
        <h1 className="font-display font-semibold text-3xl tracking-tight">
          Where your money went
        </h1>
        <p className="text-sm text-ink-2 mt-2 max-w-2xl leading-relaxed">
          Connect your bank and your transactions flow in already categorized —
          or bring a CSV statement if you prefer. Either way, everything stays
          on this machine.
        </p>
      </header>

      {/* Primary: connect your bank (hero card). Falls back to CSV-first
          prominence automatically when Plaid isn't configured. */}
      {plaid?.available !== false && (
        <section
          className="bg-card border-2 border-moss/50 shadow-card p-6 space-y-3 rise"
          style={{ animationDelay: '0.1s' }}
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-moss mb-1">
              Fastest way in
            </p>
            <h2 className="font-display font-semibold text-xl tracking-tight">
              {plaid?.linked ? 'Your bank is linked' : 'Connect your bank'}
            </h2>
            <p className="text-sm text-ink-2 mt-1 max-w-xl leading-relaxed">
              {plaid?.linked
                ? 'Pull the latest transactions any time — new spending flows straight into your plan.'
                : 'One-time link via Plaid pulls up to 6 months of transactions, already categorized — no statement exports, no file wrangling.'}
            </p>
          </div>
          <PlaidLinkButton
            onTransactions={onPlaidTransactions}
            onStatus={setStatus}
            onStateChange={onPlaidState}
            disabled={busy}
            hero
            autoOpen={autoConnect}
          />
        </section>
      )}

      {/* Secondary: CSV upload / paste / sample. Collapsed behind a disclosure
          when the bank path is available; expanded when it's the only path. */}
      <section
        className="bg-card border border-line shadow-card rise"
        style={{ animationDelay: '0.16s' }}
      >
        <details open={plaid?.available === false} className="group">
          <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-3 select-none">
            <div>
              <h2 className="font-display font-semibold text-lg tracking-tight">
                Use a statement instead
              </h2>
              <p className="text-sm text-faint mt-0.5">
                Upload a CSV export, paste rows, or load the sample statement.
              </p>
            </div>
            <span className="font-mono text-xs text-moss shrink-0">
              <span className="group-open:hidden">show ▸</span>
              <span className="hidden group-open:inline">hide ▾</span>
            </span>
          </summary>

          <div className="px-5 pb-5 space-y-5 border-t border-line pt-5">
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
          </div>
        </details>
      </section>

      {status && (
        <p className="text-sm text-ink-2 font-mono bg-card border border-line shadow-card px-5 py-3">
          {status}
        </p>
      )}

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
              href="/onboarding"
              className="inline-block bg-moss text-paper px-7 py-3 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors shadow-card"
            >
              Continue to Goals →
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
