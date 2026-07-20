'use client';

// Onboarding: a chat gathers the intern's situation while a live WORKING PLAN
// sits on the right. The plan is EDITABLE two ways: the LLM overwrites it from
// chat responses (summary + profile + goals it updates every turn), and the
// intern can type into any field directly — no LLM required. Once the intern is
// happy, they press "Continue to my plan" and THAT profile+goals is what gets
// sent forward to the engine (/ingest -> /plan). A skip button loads the sample
// profile so the demo always works offline (no API key needed). See §10.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel';
import WorkingPlanEditor from '@/components/WorkingPlanEditor';
import { setGoals, setProfile } from '@/lib/storage';
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
    router.push('/ingest');
  }

  function useSample() {
    setProfile(SAMPLE_PROFILE);
    setGoals(SAMPLE_GOALS);
    router.push('/ingest');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Let&apos;s set up your goals</h1>
        <p className="text-sm text-gray-600">
          Chat on the left, or edit the plan on the right directly — whichever you
          prefer. When it looks right, continue to your allocation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChatPanel plan={plan} onPlanUpdate={setPlan} />

        {/* Live, editable working plan */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Your working plan</h3>
            {plan?.complete && (
              <span className="text-xs text-emerald-600 font-medium">Ready ✓</span>
            )}
          </div>

          {!plan ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                As you chat, I&apos;ll summarize your situation and goals here — income,
                summer vs. school-year expenses, emergency fund, Roth, and more. You
                can also fill it in yourself.
              </p>
              <button
                onClick={() => setPlan(EMPTY_PLAN)}
                className="text-sm text-indigo-600 hover:underline"
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
            className="w-full bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {canContinue ? 'Continue to my plan →' : 'Add your income & expenses to continue'}
          </button>
          {plan && !canContinue && (
            <p className="text-xs text-gray-500">
              Enter at least your monthly income and expenses (chat or type them in) —
              including how they differ between the summer and the school year.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Short on time or no API key? Skip the chat and start from a realistic sample.
        </p>
        <button
          onClick={useSample}
          className="shrink-0 bg-white border border-indigo-600 text-indigo-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-indigo-50"
        >
          Skip &amp; use sample profile
        </button>
      </div>
    </div>
  );
}
