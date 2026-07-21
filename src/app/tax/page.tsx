'use client';

// /tax — a deterministic tax + take-home estimator (see src/lib/tax.ts). The
// intern enters gross pay, internship length, filing status, and their work +
// home states; pure math computes federal income tax (annualized withholding vs.
// actual liability, so the likely over-withholding refund is surfaced), FICA,
// and dual-state income tax. The computed monthly take-home is saved to the tax
// profile and used by /plan as the post-tax income the allocation runs against.
// No LLM is involved. Mirrors the IRS Tax Withholding Estimator.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TaxCalculator from '@/components/TaxCalculator';
import { getTaxProfile, setTaxProfile, getProfile, getTransactions } from '@/lib/storage';
import { deriveMonthlyIncome } from '@/lib/categorize';
import type { TaxProfile } from '@/lib/types';

// Seed the calculator from any existing tax profile, else fall back to the
// onboarding profile + ingested transactions (monthly income + work state) so
// the intern doesn't re-enter what earlier steps already know.
function initialTaxProfile(): TaxProfile {
  const saved = getTaxProfile();
  if (saved) return saved;
  const p = getProfile();
  // Prefer income derived from ingested transactions (matches what /plan uses),
  // falling back to the stated onboarding income, then a sensible default.
  const txns = getTransactions();
  const derived = txns.length ? deriveMonthlyIncome(txns) : 0;
  const grossMonthlyIncome = derived > 0 ? derived : p?.monthlyIncome && p.monthlyIncome > 0 ? p.monthlyIncome : 8000;
  return {
    grossMonthlyIncome: Math.round(grossMonthlyIncome),
    monthsWorked: 3,
    filingStatus: 'single',
    workState: p?.workState ?? '',
    homeState: '',
  };
}

export default function TaxPage() {
  const [ready, setReady] = useState(false);
  const [tax, setTax] = useState<TaxProfile | null>(null);

  // Browser-only storage read after mount (avoids SSR/CSR mismatch).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTax(initialTaxProfile());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist on every change so the take-home is available to /plan.
  useEffect(() => {
    if (!ready || !tax) return;
    setTaxProfile(tax);
  }, [ready, tax]);

  if (!ready || !tax) return <p className="text-sm text-faint font-mono">Loading the tax estimator…</p>;

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss mb-3">
          Step 03 · Tax
        </p>
        <h1 className="font-display font-semibold text-3xl tracking-tight">
          Tax &amp; take-home estimator
        </h1>
        <p className="text-sm text-ink-2 mt-2 max-w-2xl leading-relaxed">
          Interns are usually <strong className="text-ink">over-withheld</strong> — payroll
          assumes you earn your summer wage all year, so you get a chunk back as a refund. Enter
          your numbers to see your real monthly take-home (which feeds your plan) and your likely
          refund.
        </p>
      </header>

      <section
        className="bg-card border border-line shadow-card p-5 rise"
        style={{ animationDelay: '0.1s' }}
      >
        <TaxCalculator value={tax} onChange={setTax} />
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-faint">
          Your monthly take-home is saved and used as post-tax income on your plan.
        </p>
        <Link
          href="/plan"
          className="shrink-0 bg-moss text-paper px-7 py-3 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors shadow-card"
        >
          Use it in my plan →
        </Link>
      </div>
    </div>
  );
}
