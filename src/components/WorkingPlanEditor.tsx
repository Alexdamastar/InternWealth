'use client';

// The live "working plan" panel shown beside the onboarding chat. The intern can
// type into most fields directly (no LLM required), and the LLM can also overwrite
// the plan from chat responses (see ChatPanel /api/chat). It is a controlled
// component — the onboarding page owns the WorkingPlan state and passes value +
// onChange, so LLM updates and manual edits share one source of truth.
//
// Two things are intentionally NOT freely editable here:
//   - The SUMMARY is now a rendered, READ-ONLY recap. It's the assistant's
//     plain-English narrative (Markdown), so we render it rather than exposing the
//     raw source in a textarea.
//   - The four CORE goal buckets (emergency, school, roth, brokerage) are
//     PERMANENT: they always appear as rows, can't be removed, and their category
//     can't be changed. The intern can still edit their label and target amount.
import type { Goal, GoalKind, WorkingPlan } from '@/lib/types';
import Markdown from '@/components/Markdown';

// Kinds offered in the (non-core) goal category dropdown.
const KINDS: GoalKind[] = ['emergency', 'school', 'roth', '401k', 'brokerage', 'custom'];

// The permanent buckets, in canonical priority order (priorities 1..4), with the
// default labels used when the plan doesn't yet have a goal of that kind.
const CORE_KINDS = ['emergency', 'school', 'roth', 'brokerage'] as const;
type CoreKind = (typeof CORE_KINDS)[number];
const isCoreKind = (k: GoalKind): k is CoreKind =>
  (CORE_KINDS as readonly GoalKind[]).includes(k);
const CORE_LABELS: Record<CoreKind, string> = {
  emergency: 'Emergency fund (HYSA)',
  school: 'School-year expenses',
  roth: 'Roth IRA',
  brokerage: 'Taxable brokerage',
};

// 50 US states + DC, as 2-letter codes for the work-state dropdown.
const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

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

  // Upsert a core bucket by kind: update the existing goal of that kind if present,
  // otherwise add it (a synthesized default row becomes real on first edit). Core
  // kinds keep their canonical priority (1..4).
  function upsertCoreGoal(kind: CoreKind, patch: Partial<Goal>) {
    const idx = plan.goals.findIndex((g) => g.kind === kind);
    if (idx >= 0) {
      onChange({
        ...plan,
        goals: plan.goals.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
      });
      return;
    }
    const priority = CORE_KINDS.indexOf(kind) + 1;
    const newGoal: Goal = {
      id: `core-${kind}`,
      label: CORE_LABELS[kind],
      priority,
      kind,
      ...patch,
    };
    onChange({ ...plan, goals: [...plan.goals, newGoal] });
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

  // Guarantee one row per core kind, in canonical order — reusing the existing goal
  // if the plan already has one, otherwise synthesizing a stable default row.
  const coreRows: Goal[] = CORE_KINDS.map((kind, i) => {
    const existing = plan.goals.find((g) => g.kind === kind);
    return (
      existing ?? {
        id: `core-${kind}`,
        label: CORE_LABELS[kind as CoreKind],
        targetAmount: undefined,
        priority: i + 1,
        kind,
      }
    );
  });

  // Everything else (401k / custom) rendered after the core rows, by priority.
  const nonCoreGoals = plan.goals
    .filter((g) => !isCoreKind(g.kind))
    .slice()
    .sort((a, b) => a.priority - b.priority);

  const hasSummary = plan.summary.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Read-only recap the assistant writes / updates as you chat (rendered Markdown). */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Summary</span>
        <span className="text-[11px] text-gray-400">
          The assistant writes and updates this as you chat.
        </span>
        <div className="max-h-64 overflow-y-auto bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-800">
          {hasSummary ? (
            <Markdown content={plan.summary} />
          ) : (
            <p className="text-gray-400">Your recap will appear here as you chat.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Money label="Monthly income ($)" value={p.monthlyIncome} onChange={(v) => patchProfile({ monthlyIncome: v })} />
        <Money
          label="Summer expenses / mo ($)"
          value={p.essentialMonthlyExpenses}
          onChange={(v) => patchProfile({ essentialMonthlyExpenses: v })}
        />
        <Money
          label="School-year expenses / mo ($)"
          value={p.schoolYearMonthlyExpenses ?? 0}
          onChange={(v) => patchProfile({ schoolYearMonthlyExpenses: v })}
        />
        <Money
          label="Current emergency fund ($)"
          value={p.hasEmergencyFund}
          onChange={(v) => patchProfile({ hasEmergencyFund: v })}
        />
        <Money
          label="Roth contributed this year ($)"
          value={p.rothContributedThisYear}
          onChange={(v) => patchProfile({ rothContributedThisYear: v })}
        />
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Work state
          <select
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
            value={p.workState}
            onChange={(e) => patchProfile({ workState: e.target.value })}
          >
            <option value="">Select state…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
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

      {/* Goals — the four core buckets are always present and permanent; extra
          goals ('401k' / 'custom') follow and are fully editable/removable. */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">Goals</p>

        {coreRows.map((g) => (
          <div key={g.id} className="flex items-center gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
              value={g.label}
              onChange={(e) => upsertCoreGoal(g.kind as CoreKind, { label: e.target.value })}
            />
            {/* Locked category — core buckets can't change kind or be removed. */}
            <span className="border border-gray-200 bg-gray-50 rounded-md px-1.5 py-1 text-xs text-gray-500">
              {g.kind}
            </span>
            <TargetInput
              value={g.targetAmount}
              onChange={(v) => upsertCoreGoal(g.kind as CoreKind, { targetAmount: v })}
            />
          </div>
        ))}

        {nonCoreGoals.map((g) => (
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
            <TargetInput
              value={g.targetAmount}
              onChange={(v) => updateGoal(g.id, { targetAmount: v })}
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

// A money input with NO spinner arrows: a text field constrained to digits. The
// parsed integer is passed up (empty -> 0).
function Money({
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
        type="text"
        inputMode="numeric"
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
        value={Number.isFinite(value) ? String(value) : '0'}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '');
          onChange(digits === '' ? 0 : parseInt(digits, 10));
        }}
      />
    </label>
  );
}

// The per-goal target-$ field: same no-spinner text approach, but empty clears the
// target (undefined) rather than forcing 0.
function TargetInput({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="target $"
      className="w-20 border border-gray-300 rounded-md px-2 py-1 text-xs"
      value={value ?? ''}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '');
        onChange(digits === '' ? undefined : parseInt(digits, 10));
      }}
    />
  );
}
