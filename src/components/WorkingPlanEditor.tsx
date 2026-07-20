'use client';

// The live "working plan" panel shown beside the onboarding chat. It is fully
// EDITABLE: the intern can type into any field directly (no LLM required), and
// the LLM can also overwrite it from chat responses (see ChatPanel /api/chat).
// It is a controlled component — the onboarding page owns the WorkingPlan state
// and passes value + onChange, so LLM updates and manual edits share one source
// of truth.
import type { Goal, GoalKind, WorkingPlan } from '@/lib/types';

const KINDS: GoalKind[] = ['emergency', 'school', 'roth', '401k', 'brokerage', 'custom'];

interface Props {
  plan: WorkingPlan;
  onChange: (plan: WorkingPlan) => void;
}

export default function WorkingPlanEditor({ plan, onChange }: Props) {
  const p = plan.profile;

  function patchProfile(patch: Partial<WorkingPlan['profile']>) {
    onChange({ ...plan, profile: { ...p, ...patch } });
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    onChange({
      ...plan,
      goals: plan.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    });
  }

  function removeGoal(id: string) {
    onChange({ ...plan, goals: plan.goals.filter((g) => g.id !== id) });
  }

  function addGoal() {
    const nextPriority = plan.goals.length
      ? Math.max(...plan.goals.map((g) => g.priority)) + 1
      : 1;
    onChange({
      ...plan,
      goals: [
        ...plan.goals,
        { id: `g-manual-${plan.goals.length}-${nextPriority}`, label: 'New goal', priority: nextPriority, kind: 'custom' },
      ],
    });
  }

  return (
    <div className="space-y-4">
      {/* Editable summary (Markdown source the LLM writes / the user tweaks) */}
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        Summary (you can edit this)
        <textarea
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 min-h-20 resize-y"
          value={plan.summary}
          placeholder="A short recap of your situation and goals…"
          onChange={(e) => onChange({ ...plan, summary: e.target.value })}
        />
      </label>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Num label="Monthly income ($)" value={p.monthlyIncome} onChange={(v) => patchProfile({ monthlyIncome: v })} />
        <Num
          label="Summer expenses / mo ($)"
          value={p.essentialMonthlyExpenses}
          onChange={(v) => patchProfile({ essentialMonthlyExpenses: v })}
        />
        <Num
          label="School-year expenses / mo ($)"
          value={p.schoolYearMonthlyExpenses ?? 0}
          onChange={(v) => patchProfile({ schoolYearMonthlyExpenses: v })}
        />
        <Num
          label="Current emergency fund ($)"
          value={p.hasEmergencyFund}
          onChange={(v) => patchProfile({ hasEmergencyFund: v })}
        />
        <Num
          label="Roth contributed this year ($)"
          value={p.rothContributedThisYear}
          onChange={(v) => patchProfile({ rothContributedThisYear: v })}
        />
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Work state
          <input
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
            value={p.workState}
            placeholder="WA"
            onChange={(e) => patchProfile({ workState: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          401(k) match realistically vests?
          <select
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
            value={p.employer401kVests ? 'yes' : 'no'}
            onChange={(e) => patchProfile({ employer401kVests: e.target.value === 'yes' })}
          >
            <option value="no">No (e.g. Amazon intern)</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Internship ending soon?
          <select
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
            value={p.internshipEndsSoon ? 'yes' : 'no'}
            onChange={(e) => patchProfile({ internshipEndsSoon: e.target.value === 'yes' })}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      {/* Editable goals */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">Goals</p>
        {plan.goals
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((g) => (
            <div key={g.id} className="flex items-center gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
                value={g.label}
                onChange={(e) => updateGoal(g.id, { label: e.target.value })}
              />
              <select
                className="border border-gray-300 rounded-md px-1.5 py-1 text-xs"
                value={g.kind}
                onChange={(e) => updateGoal(g.id, { kind: e.target.value as GoalKind })}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="target $"
                className="w-20 border border-gray-300 rounded-md px-2 py-1 text-xs"
                value={g.targetAmount ?? ''}
                onChange={(e) =>
                  updateGoal(g.id, {
                    targetAmount: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
              <button
                onClick={() => removeGoal(g.id)}
                className="text-gray-400 hover:text-red-600 text-sm px-1"
                aria-label="Remove goal"
              >
                ✕
              </button>
            </div>
          ))}
        <button
          onClick={addGoal}
          className="text-xs text-indigo-600 hover:underline pt-1"
        >
          + Add a goal
        </button>
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <input
        type="number"
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
