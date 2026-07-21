'use client';

// Add / edit / remove goals and tweak the key inputs that drive the engine.
// Every change calls onChange so the parent can recompute the plan live. §10.4.
import { useState } from 'react';
import type { Goal, GoalKind, UserProfile } from '@/lib/types';

const KINDS: GoalKind[] = ['emergency', 'school', 'roth', '401k', 'brokerage', 'custom'];

interface Props {
  goals: Goal[];
  profile: UserProfile;
  allocatableCash: number;
  emergencyMonths: number;
  onGoalsChange: (goals: Goal[]) => void;
  onProfileChange: (profile: UserProfile) => void;
  onAllocatableChange: (cash: number) => void;
  onEmergencyMonthsChange: (months: number) => void;
}

export default function GoalEditor({
  goals,
  profile,
  allocatableCash,
  emergencyMonths,
  onGoalsChange,
  onProfileChange,
  onAllocatableChange,
  onEmergencyMonthsChange,
}: Props) {
  const [newLabel, setNewLabel] = useState('');

  function updateGoal(id: string, patch: Partial<Goal>) {
    onGoalsChange(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function removeGoal(id: string) {
    onGoalsChange(goals.filter((g) => g.id !== id));
  }

  function addGoal() {
    const label = newLabel.trim();
    if (!label) return;
    const nextPriority = goals.length
      ? Math.max(...goals.map((g) => g.priority)) + 1
      : 1;
    onGoalsChange([
      ...goals,
      { id: `g-${Date.now()}`, label, priority: nextPriority, kind: 'custom' },
    ]);
    setNewLabel('');
  }

  return (
    <div className="bg-card border border-line shadow-card p-5 space-y-4">
      <h3 className="font-display font-semibold text-lg">Adjust inputs — plan recomputes live</h3>

      {/* Engine drivers */}
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Allocatable cash ($)"
          value={allocatableCash}
          onChange={onAllocatableChange}
        />
        <NumberField
          label="Emergency months (3–6)"
          value={emergencyMonths}
          min={1}
          max={12}
          onChange={(v) => onEmergencyMonthsChange(Math.min(12, Math.max(1, v)))}
        />
        <NumberField
          label="Summer expenses / mo ($)"
          value={profile.essentialMonthlyExpenses}
          onChange={(v) => onProfileChange({ ...profile, essentialMonthlyExpenses: v })}
        />
        <NumberField
          label="School-year expenses / mo ($)"
          value={profile.schoolYearMonthlyExpenses ?? 0}
          onChange={(v) =>
            onProfileChange({ ...profile, schoolYearMonthlyExpenses: v })
          }
        />
        <NumberField
          label="Current emergency fund ($)"
          value={profile.hasEmergencyFund}
          onChange={(v) => onProfileChange({ ...profile, hasEmergencyFund: v })}
        />
        <NumberField
          label="Roth contributed this year ($)"
          value={profile.rothContributedThisYear}
          onChange={(v) => onProfileChange({ ...profile, rothContributedThisYear: v })}
        />
        <label className="flex flex-col text-xs text-ink-2 gap-1">
          401(k) match realistically vests?
          <select
            className="bg-card border border-line px-2 py-1.5 text-sm text-ink focus:border-moss"
            value={profile.employer401kVests ? 'yes' : 'no'}
            onChange={(e) =>
              onProfileChange({ ...profile, employer401kVests: e.target.value === 'yes' })
            }
          >
            <option value="no">No (e.g. Amazon intern)</option>
            <option value="yes">Yes</option>
          </select>
        </label>
      </div>

      {/* Goals list */}
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-faint">Goals</p>
        {goals
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((g) => (
            <div key={g.id} className="flex items-center gap-2">
              <input
                className="flex-1 bg-card border border-line px-2 py-1 text-sm focus:border-moss"
                value={g.label}
                onChange={(e) => updateGoal(g.id, { label: e.target.value })}
              />
              <select
                className="bg-card border border-line px-1.5 py-1 text-xs focus:border-moss"
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
                className="w-24 bg-card border border-line px-2 py-1 text-xs font-mono focus:border-moss"
                value={g.targetAmount ?? ''}
                onChange={(e) =>
                  updateGoal(g.id, {
                    targetAmount: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
              <button
                onClick={() => removeGoal(g.id)}
                className="text-faint hover:text-bad text-sm px-1"
                aria-label="Remove goal"
              >
                ✕
              </button>
            </div>
          ))}
        <div className="flex items-center gap-2 pt-1">
          <input
            className="flex-1 bg-card border border-line px-2 py-1 text-sm focus:border-moss"
            placeholder="Add a goal…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          />
          <button
            onClick={addGoal}
            className="bg-moss text-paper px-3 py-1.5 text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col text-xs text-ink-2 gap-1">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        className="bg-card border border-line px-2 py-1.5 text-sm text-ink focus:border-moss"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
