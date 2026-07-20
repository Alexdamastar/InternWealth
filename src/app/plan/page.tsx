'use client';

// The plan page: runs the deterministic engine CLIENT-SIDE (instant), renders the
// allocation waterfall + step rationales + a live goal editor, and fetches an
// LLM narrative that gracefully falls back to engine rationales. See §10.4.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { allocate, DEFAULT_EMERGENCY_MONTHS } from '@/lib/engine';
import { DEFAULT_SURPLUS_SPLIT } from '@/lib/types';
import {
  deriveEssentialMonthly,
  deriveMonthlyIncome,
  deriveSpendingByCategory,
} from '@/lib/categorize';
import {
  getGoals,
  getProfile,
  getTransactions,
  getTaxProfile,
  setGoals as persistGoals,
  setProfile as persistProfile,
  makeSnapshot,
  saveSnapshot,
} from '@/lib/storage';
import { SAMPLE_GOALS, SAMPLE_PROFILE } from '@/lib/sample';
import type {
  AllocationResult,
  Goal,
  SurplusSplit,
  TxCategory,
  UserProfile,
} from '@/lib/types';
import AllocationChart from '@/components/AllocationChart';
import GoalEditor from '@/components/GoalEditor';
import SurplusSplitter from '@/components/SurplusSplitter';
import Markdown from '@/components/Markdown';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Allocatable cash = monthly income − essential monthly expenses (one month's
// surplus). A reasonable default; the user can override in the editor. When a
// post-tax take-home is provided (from the tax estimator) it is used in place
// of gross monthly income, so the plan allocates real, after-tax dollars.
function defaultAllocatable(profile: UserProfile, takeHomeMonthly?: number): number {
  const income =
    takeHomeMonthly && takeHomeMonthly > 0 ? takeHomeMonthly : profile.monthlyIncome;
  return Math.max(0, Math.round(income - profile.essentialMonthlyExpenses));
}

export default function PlanPage() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(SAMPLE_PROFILE);
  const [goals, setGoals] = useState<Goal[]>(SAMPLE_GOALS);
  const [allocatable, setAllocatable] = useState<number>(0);
  // Post-tax monthly take-home from the tax estimator, if computed. Drives the
  // allocatable default in place of gross income.
  const [takeHomeMonthly, setTakeHomeMonthly] = useState<number | undefined>(undefined);
  const [emergencyMonths, setEmergencyMonths] = useState<number>(DEFAULT_EMERGENCY_MONTHS);
  const [surplusSplit, setSurplusSplit] = useState<SurplusSplit>(DEFAULT_SURPLUS_SPLIT);
  const [spending, setSpending] = useState<Record<TxCategory, number>>(
    () => deriveSpendingByCategory([]),
  );

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainState, setExplainState] = useState<'idle' | 'loading' | 'done' | 'fallback'>(
    'idle',
  );

  // Load persisted state (or fall back to sample) on mount. Intentional
  // post-mount setState: this data lives in browser storage and is only
  // readable client-side, so it cannot be set during render/SSR.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const p = getProfile() ?? SAMPLE_PROFILE;
    const g = getGoals();
    const txns = getTransactions();

    // If transactions exist, refine derived profile numbers from them.
    const refined: UserProfile = { ...p };
    if (txns.length) {
      const income = deriveMonthlyIncome(txns);
      const essential = deriveEssentialMonthly(txns);
      if (income > 0) refined.monthlyIncome = income;
      if (essential > 0) refined.essentialMonthlyExpenses = essential;
      setSpending(deriveSpendingByCategory(txns));
    }

    // Use the post-tax take-home from the tax estimator when available.
    const takeHome = getTaxProfile()?.takeHomeMonthly;

    setProfile(refined);
    setGoals(g.length ? g : SAMPLE_GOALS);
    setTakeHomeMonthly(takeHome && takeHome > 0 ? takeHome : undefined);
    setAllocatable(defaultAllocatable(refined, takeHome));
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Deterministic recompute — instant, no LLM.
  const result: AllocationResult = useMemo(
    () => allocate(profile, goals, allocatable, emergencyMonths, surplusSplit),
    [profile, goals, allocatable, emergencyMonths, surplusSplit],
  );

  // Persist edits.
  useEffect(() => {
    if (!ready) return;
    persistProfile(profile);
    persistGoals(goals);
  }, [ready, profile, goals]);

  async function generateExplanation() {
    setExplainState('loading');
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocation: result,
          goals,
          profile,
          spendingByCategory: spending,
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
        setExplainState('done');
      } else {
        setExplainState('fallback');
      }
    } catch {
      setExplainState('fallback');
    }
  }

  function save() {
    saveSnapshot(makeSnapshot(profile, goals, result, spending));
    alert('Snapshot saved. View changes over time on the Progress page.');
  }

  if (!ready) return <p className="text-sm text-gray-500">Loading your plan…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your allocation plan</h1>
          <p className="text-sm text-gray-600">
            Deterministic math from the guide — the LLM never computes a dollar amount.
          </p>
        </div>
        <button
          onClick={save}
          className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Save snapshot
        </button>
      </div>

      {takeHomeMonthly ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
          Using your <strong>post-tax take-home</strong> of {usd(takeHomeMonthly)}/mo from the{' '}
          <Link href="/tax" className="underline font-medium">
            tax estimator
          </Link>{' '}
          as your income — so this plan allocates real, after-tax dollars.
        </div>
      ) : (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          This uses your <strong>gross</strong> monthly income. For after-tax accuracy, run the{' '}
          <Link href="/tax" className="underline font-medium">
            tax estimator
          </Link>{' '}
          first — interns are usually over-withheld, so your real take-home differs.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Allocatable this run" value={usd(result.totalAllocatable)} />
        <Stat
          label={takeHomeMonthly ? 'Monthly take-home (post-tax)' : 'Monthly income (gross)'}
          value={usd(takeHomeMonthly ?? profile.monthlyIncome)}
        />
        <Stat label="Essential expenses (derived)" value={usd(profile.essentialMonthlyExpenses)} />
      </div>

      <AllocationChart result={result} />

      {/* Post-Roth surplus decision: split cash / brokerage / 401(k) */}
      <SurplusSplitter
        surplus={result.surplus}
        split={surplusSplit}
        amounts={result.surplusAmounts}
        options={result.surplusOptions}
        onChange={setSurplusSplit}
      />

      {/* Step-by-step rationales — render with zero LLM calls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-3">Step-by-step reasoning</h3>
        <ol className="space-y-3">
          {result.steps.map((step, i) => (
            <li key={step.bucket} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{step.label}</span>
                  <span
                    className={`text-sm font-semibold ${
                      step.amount > 0 ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {usd(step.amount)}
                    {step.capReached && (
                      <span className="ml-1 text-xs text-emerald-600 font-normal">
                        (cap reached)
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{step.rationale}</p>
              </div>
            </li>
          ))}
        </ol>

        {result.warnings.length > 0 && (
          <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 p-3">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-sm text-amber-800">
                ⚠ {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* LLM narrative with graceful fallback */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Plain-English explanation</h3>
          <button
            onClick={generateExplanation}
            disabled={explainState === 'loading'}
            className="bg-indigo-600 text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            {explainState === 'loading' ? 'Generating…' : 'Generate explanation'}
          </button>
        </div>
        {explainState === 'done' && explanation && (
          <Markdown content={explanation} className="text-sm text-gray-700 space-y-2 leading-relaxed" />
        )}
        {explainState === 'fallback' && (
          <div className="text-sm text-gray-700 space-y-1">
            <p className="text-gray-500 italic mb-2">
              The LLM was unavailable (check your AWS / Bedrock access) — showing
              the deterministic reasoning instead:
            </p>
            {result.steps
              .filter((s) => s.amount > 0)
              .map((s) => (
                <p key={s.bucket}>
                  <strong>{s.label}:</strong> {s.rationale}
                </p>
              ))}
            <p className="text-xs text-gray-500 pt-2">
              This is educational only, not licensed financial advice.
            </p>
          </div>
        )}
        {explainState === 'idle' && (
          <p className="text-sm text-gray-500">
            Click generate for a narrative, or read the step reasoning above — the
            plan is complete without it.
          </p>
        )}
      </div>

      <GoalEditor
        goals={goals}
        profile={profile}
        allocatableCash={allocatable}
        emergencyMonths={emergencyMonths}
        onGoalsChange={setGoals}
        onProfileChange={setProfile}
        onAllocatableChange={setAllocatable}
        onEmergencyMonthsChange={setEmergencyMonths}
      />

      <div className="flex gap-3">
        <Link href="/ingest" className="text-sm text-indigo-600 hover:underline">
          ← Transactions
        </Link>
        <Link href="/progress" className="text-sm text-indigo-600 hover:underline">
          Progress →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}
