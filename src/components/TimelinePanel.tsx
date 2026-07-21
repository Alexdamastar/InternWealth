'use client';

// Feature 1.1 wrapper: owns the paycheck-timeline INPUTS (dates, frequency,
// per-paycheck amount) and renders the TimelineChart when the simulator has
// enough to run. The profile is the single source of truth — edits flow up via
// onProfileChange, so the plan page persists them like every other field.
import { useMemo } from 'react';
import { simulateTimeline } from '@/lib/timeline';
import type { Goal, PayFrequency, SurplusSplit, UserProfile } from '@/lib/types';
import TimelineChart from '@/components/TimelineChart';

const FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'semimonthly', label: '1st & 15th' },
  { value: 'monthly', label: 'Monthly (most common)' },
];

interface Props {
  profile: UserProfile;
  goals: Goal[];
  emergencyMonths: number;
  surplusSplit: SurplusSplit;
  onProfileChange: (profile: UserProfile) => void;
}

export default function TimelinePanel({
  profile,
  goals,
  emergencyMonths,
  surplusSplit,
  onProfileChange,
}: Props) {
  const timeline = useMemo(
    () => simulateTimeline(profile, goals, emergencyMonths, surplusSplit),
    [profile, goals, emergencyMonths, surplusSplit],
  );

  function patch(p: Partial<UserProfile>) {
    onProfileChange({ ...profile, ...p });
  }

  return (
    <div className="space-y-4">
      {/* Inputs: compact row above the chart, same field style as GoalEditor. */}
      <div className="bg-card border border-line shadow-card p-5">
        <h3 className="font-display font-semibold text-lg mb-1">
          When does the money arrive?
        </h3>
        <p className="text-sm text-ink-2 mb-4 leading-relaxed">
          Add your internship dates and per-paycheck take-home to see the plan
          play out over the summer instead of as one lump sum.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-xs text-ink-2 gap-1">
            Start date
            <input
              type="date"
              className="bg-card border border-line px-2 py-1.5 text-sm text-ink font-mono focus:border-moss"
              value={profile.startDate ?? ''}
              onChange={(e) => patch({ startDate: e.target.value || undefined })}
            />
          </label>
          <label className="flex flex-col text-xs text-ink-2 gap-1">
            End date
            <input
              type="date"
              className="bg-card border border-line px-2 py-1.5 text-sm text-ink font-mono focus:border-moss"
              value={profile.endDate ?? ''}
              onChange={(e) => patch({ endDate: e.target.value || undefined })}
            />
          </label>
          <label className="flex flex-col text-xs text-ink-2 gap-1">
            Pay frequency
            <select
              className="bg-card border border-line px-2 py-1.5 text-sm text-ink focus:border-moss"
              value={profile.payFrequency ?? 'biweekly'}
              onChange={(e) => patch({ payFrequency: e.target.value as PayFrequency })}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-ink-2 gap-1">
            Take-home per paycheck ($)
            <input
              type="text"
              inputMode="numeric"
              className="bg-card border border-line px-2 py-1.5 text-sm text-ink font-mono focus:border-moss"
              value={profile.paycheckAmount ?? ''}
              placeholder="3200"
              onChange={(e) => {
                const digits = e.target.value.replace(/[^0-9]/g, '');
                patch({
                  paycheckAmount: digits === '' ? undefined : parseInt(digits, 10),
                });
              }}
            />
          </label>
        </div>
      </div>

      {timeline && <TimelineChart timeline={timeline} />}
    </div>
  );
}
