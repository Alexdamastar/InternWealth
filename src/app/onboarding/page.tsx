'use client';

// Onboarding: a chat gathers the intern's situation while the LLM maintains a
// live WORKING PLAN on the right (summary + profile + goals it updates every
// turn). The intern watches the plan take shape; once the LLM marks it complete
// and the intern agrees it looks good, they press "Continue to my plan" — THAT
// is when the profile+goals are saved and sent forward to the engine (/ingest ->
// /plan). A skip button loads the sample profile so the demo always works
// offline (no API key needed). See §10.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel';
import Markdown from '@/components/Markdown';
import { setGoals, setProfile } from '@/lib/storage';
import { SAMPLE_GOALS, SAMPLE_PROFILE } from '@/lib/sample';
import type { WorkingPlan } from '@/lib/types';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function OnboardingPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<WorkingPlan | null>(null);

  // Send the current working plan forward to the engine. Only reachable once the
  // LLM has marked the plan complete and the intern presses Continue.
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

  const p = plan?.profile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Let&apos;s set up your goals</h1>
        <p className="text-sm text-gray-600">
          Chat on the left; watch your plan build on the right. When it looks
          right, continue to your allocation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChatPanel onPlanUpdate={setPlan} />

        {/* Live working plan the LLM maintains on the side */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Your working plan</h3>
            {plan?.complete && (
              <span className="text-xs text-emerald-600 font-medium">Ready ✓</span>
            )}
          </div>

          {!plan ? (
            <p className="text-sm text-gray-500">
              As you chat, I&apos;ll summarize your situation and goals here — income,
              summer vs. school-year expenses, emergency fund, Roth, and more.
            </p>
          ) : (
            <div className="space-y-4">
              {plan.summary && (
                <Markdown
                  content={plan.summary}
                  className="text-sm text-gray-700 space-y-2"
                />
              )}

              {p && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <Field label="Monthly income" value={usd(p.monthlyIncome)} />
                  <Field label="Summer expenses" value={usd(p.essentialMonthlyExpenses)} />
                  <Field
                    label="School-year expenses"
                    value={
                      p.schoolYearMonthlyExpenses && p.schoolYearMonthlyExpenses > 0
                        ? usd(p.schoolYearMonthlyExpenses)
                        : '—'
                    }
                  />
                  <Field label="Emergency fund" value={usd(p.hasEmergencyFund)} />
                  <Field label="Roth so far" value={usd(p.rothContributedThisYear)} />
                  <Field label="Work state" value={p.workState || '—'} />
                  <Field label="401(k) vests?" value={p.employer401kVests ? 'Yes' : 'No'} />
                  <Field
                    label="Ending soon?"
                    value={p.internshipEndsSoon ? 'Yes' : 'No'}
                  />
                </dl>
              )}

              {plan.goals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Goals</p>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
                    {plan.goals
                      .slice()
                      .sort((a, b) => a.priority - b.priority)
                      .map((g) => (
                        <li key={g.id}>
                          {g.label}
                          {g.targetAmount ? ` — ${usd(g.targetAmount)}` : ''}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={continueToPlan}
            disabled={!plan?.complete}
            className="w-full bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {plan?.complete ? 'Continue to my plan →' : 'Keep chatting to finish your plan'}
          </button>
          {plan && !plan.complete && (
            <p className="text-xs text-gray-500">
              I&apos;ll enable this once we&apos;ve covered the essentials — including how
              your expenses differ between the summer and the school year.
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-gray-100 pb-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
