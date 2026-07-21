'use client';

// Onboarding: a chat gathers the intern's situation while a live WORKING PLAN
// sits on the right. The plan is EDITABLE two ways: the LLM overwrites it from
// chat responses (summary + profile + goals it updates every turn), and the
// intern can type into any field directly — no LLM required. Once the intern is
// happy, they press "Continue to my plan" and THAT profile+goals is what gets
// sent forward to the engine (/ingest -> /plan). A skip button loads the sample
// profile so the demo always works offline (no Bedrock access needed). See §10.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel';
import WorkingPlanEditor from '@/components/WorkingPlanEditor';
import { getTransactions, setGoals, setProfile } from '@/lib/storage';
import { deriveEssentialMonthly, deriveMonthlyIncome } from '@/lib/categorize';
import { SAMPLE_GOALS, SAMPLE_PROFILE } from '@/lib/sample';
import type { UserProfile, WorkingPlan } from '@/lib/types';

// A blank profile the intern can fill in by hand if they'd rather not chat.
const EMPTY_PROFILE: UserProfile = {
  monthlyIncome: 0,
  essentialMonthlyExpenses: 0,
  schoolYearMonthlyExpenses: 0,
  hasEmergencyFund: 0,
  employer401kVests: false,
  rothContributedThisYear: 0,
  workState: '',
  internshipEndsSoon: false,
};

const EMPTY_PLAN: WorkingPlan = {
  summary: '',
  profile: EMPTY_PROFILE,
  goals: [],
  complete: false,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<WorkingPlan | null>(null);

  // If a statement was uploaded in step 1 (Get started), pre-fill the working
  // plan with the income and internship essentials derived from it, so neither
  // we nor the model re-asks for what the CSV already answered. Storage is only
  // readable after mount, hence the intentional post-mount setState.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const txns = getTransactions();
    if (!txns.length) return;
    const income = deriveMonthlyIncome(txns);
    const essential = deriveEssentialMonthly(txns);
    if (income <= 0 && essential <= 0) return;
    setPlan((prev) =>
      prev ?? {
        ...EMPTY_PLAN,
        profile: {
          ...EMPTY_PROFILE,
          monthlyIncome: Math.max(0, income),
          essentialMonthlyExpenses: Math.max(0, essential),
        },
      },
    );
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The Continue button unlocks when the LLM marks the plan complete OR the
  // intern has manually entered the essentials (income + at least one expense).
  const manuallyReady =
    !!plan &&
    plan.profile.monthlyIncome > 0 &&
    (plan.profile.essentialMonthlyExpenses > 0 ||
      (plan.profile.schoolYearMonthlyExpenses ?? 0) > 0);
  const canContinue = !!plan && (plan.complete || manuallyReady);

  // Send the current working plan forward to the engine.
  function continueToPlan() {
    if (!plan) return;
    setProfile(plan.profile);
    setGoals(plan.goals);
    router.push('/plan');
  }

  function useSample() {
    setProfile(SAMPLE_PROFILE);
    setGoals(SAMPLE_GOALS);
    router.push('/plan');
  }

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss mb-3">
          Step 02 · Goals
        </p>
        <h1 className="font-display font-semibold text-3xl tracking-tight">
          Let&apos;s set up your goals
        </h1>
        <p className="text-sm text-ink-2 mt-2 max-w-2xl leading-relaxed">
          Chat on the left, or edit the plan on the right directly — whichever
          you prefer. When it looks right, continue to your allocation.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 rise" style={{ animationDelay: '0.1s' }}>
        <ChatPanel plan={plan} onPlanUpdate={setPlan} />

        {/* Live, editable working plan */}
        <div className="bg-card border border-line shadow-card p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-display font-semibold text-lg">
              Your working plan
            </h3>
            {plan?.complete && (
              <span className="font-mono text-xs text-good font-semibold uppercase tracking-wider">
                Ready ✓
              </span>
            )}
          </div>

          {!plan ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-2 leading-relaxed">
                As you chat, I&apos;ll summarize your situation and goals here —
                income, summer vs. school-year expenses, emergency fund, Roth,
                and more. You can also fill it in yourself.
              </p>
              <button
                onClick={() => setPlan(EMPTY_PLAN)}
                className="text-sm text-moss font-semibold hover:underline underline-offset-2"
              >
                Or start filling it in manually →
              </button>
            </div>
          ) : (
            <WorkingPlanEditor plan={plan} onChange={setPlan} />
          )}

          <button
            onClick={continueToPlan}
            disabled={!canContinue}
            className="w-full bg-moss text-paper px-4 py-2.5 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {canContinue
              ? 'Continue to my plan →'
              : 'Add your income & expenses to continue'}
          </button>
          {plan && !canContinue && (
            <p className="text-xs text-faint leading-relaxed">
              Enter at least your monthly income and expenses (chat or type them
              in) — including how they differ between the summer and the school
              year.
            </p>
          )}
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 rise"
        style={{ animationDelay: '0.2s' }}
      >
        <p className="text-xs text-faint">
          Short on time or no Bedrock access? Skip the chat and start from a
          realistic sample.
        </p>
        <button
          onClick={useSample}
          className="shrink-0 border border-moss text-moss px-4 py-2 text-sm font-semibold hover:bg-moss hover:text-paper transition-colors"
        >
          Skip &amp; use sample profile
        </button>
      </div>
    </div>
  );
}
