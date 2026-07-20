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
import { getTaxProfile, setTaxProfile, getProfile } from '@/lib/storage';
import type { TaxProfile } from '@/lib/types';

// Seed the calculator from any existing tax profile, else fall back to the
// onboarding profile (its monthly income + work state) so the intern doesn't
// re-enter everything.
function initialTaxProfile(): TaxProfile {
  const saved = getTaxProfile();
  if (saved) return saved;
  const p = getProfile();
  return {
    grossMonthlyIncome: p?.monthlyIncome ?? 8000,
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

  if (!ready || !tax) return <p className="text-sm text-gray-500">Loading the tax estimator…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tax &amp; take-home estimator</h1>
        <p className="text-sm text-gray-600 max-w-2xl">
          Interns are usually <strong>over-withheld</strong> — payroll assumes you earn your
          summer wage all year, so you get a chunk back as a refund. Enter your numbers to see
          your real monthly take-home (which feeds your plan) and your likely refund.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <TaxCalculator value={tax} onChange={setTax} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Your monthly take-home is saved and used as post-tax income on your plan.
        </p>
        <Link
          href="/plan"
          className="shrink-0 bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          Use it in my plan →
        </Link>
      </div>
    </div>
  );
}
