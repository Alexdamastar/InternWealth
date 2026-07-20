'use client';

// Deterministic tax + take-home estimator (see src/lib/tax.ts). Mirrors the IRS
// Tax Withholding Estimator, but the intern enters the numbers here and pure
// math produces the result — no LLM ever touches a tax figure. Its computed
// monthly take-home is saved to the tax profile so /plan can allocate post-tax
// dollars. Controlled component: parent owns the TaxProfile and passes value +
// onChange, so the estimate and any downstream plan share one source of truth.
import { useMemo } from 'react';
import { estimateTaxes, MODELED_STATES, type FilingStatus } from '@/lib/tax';
import type { TaxProfile } from '@/lib/types';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

interface Props {
  value: TaxProfile;
  onChange: (next: TaxProfile) => void;
}

export default function TaxCalculator({ value, onChange }: Props) {
  const result = useMemo(
    () =>
      estimateTaxes({
        grossMonthlyIncome: value.grossMonthlyIncome,
        monthsWorked: value.monthsWorked,
        filingStatus: value.filingStatus,
        workState: value.workState,
        homeState: value.homeState,
      }),
    [value],
  );

  // Keep the persisted take-home in sync with the live estimate, but only write
  // when it actually changes (avoids an update loop).
  function patch(p: Partial<TaxProfile>) {
    const next = { ...value, ...p };
    const r = estimateTaxes({
      grossMonthlyIncome: next.grossMonthlyIncome,
      monthsWorked: next.monthsWorked,
      filingStatus: next.filingStatus,
      workState: next.workState,
      homeState: next.homeState,
    });
    onChange({ ...next, takeHomeMonthly: Math.round(r.monthlyTakeHome) });
  }

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        <Money
          label="Gross monthly pay ($)"
          value={value.grossMonthlyIncome}
          onChange={(v) => patch({ grossMonthlyIncome: v })}
        />
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Months you&apos;ll work
          <input
            type="text"
            inputMode="numeric"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
            value={String(value.monthsWorked)}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '');
              patch({ monthsWorked: digits === '' ? 0 : Math.min(12, parseInt(digits, 10)) });
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Filing status
          <select
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
            value={value.filingStatus}
            onChange={(e) => patch({ filingStatus: e.target.value as FilingStatus })}
          >
            <option value="single">Single</option>
            <option value="married_jointly">Married, filing jointly</option>
          </select>
        </label>
        <div />
        <StateSelect
          label="Work state (where you intern)"
          value={value.workState}
          onChange={(v) => patch({ workState: v })}
        />
        <StateSelect
          label="Home state (legal residence)"
          value={value.homeState}
          onChange={(v) => patch({ homeState: v })}
        />
      </div>

      {/* Headline results */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Monthly take-home"
          value={usd(result.monthlyTakeHome)}
          hint="What lands in your account each month"
          accent
        />
        <Stat
          label="Total take-home"
          value={usd(result.totalTakeHome)}
          hint={`Across ${value.monthsWorked || 0} month${value.monthsWorked === 1 ? '' : 's'}`}
        />
        <Stat
          label="Likely federal refund"
          value={usd(Math.max(0, result.federalRefund))}
          hint="Over-withheld because pay is annualized"
        />
        <Stat
          label="Effective tax rate"
          value={pct(result.effectiveTaxRate)}
          hint="Total tax owed ÷ what you earn"
        />
      </div>

      {/* Breakdown */}
      <div className="text-sm">
        <p className="text-xs font-medium text-gray-500 mb-1">Breakdown (for the internship)</p>
        <dl className="divide-y divide-gray-100 border border-gray-200 rounded-md">
          <Row k="Gross earned" v={usd(result.actualGrossEarned)} />
          <Row k="Federal income tax (owed)" v={`- ${usd(result.federalActuallyOwed)}`} />
          <Row
            k="Federal tax withheld"
            v={usd(result.federalWithheld)}
            sub={`Refund of ${usd(Math.max(0, result.federalRefund))} at filing`}
          />
          <Row k="FICA (Social Security + Medicare)" v={`- ${usd(result.fica)}`} />
          <Row
            k={`State income tax${result.workState.code && result.homeState.code && result.workState.code !== result.homeState.code ? ' (net of credit)' : ''}`}
            v={`- ${usd(result.totalStateOwed)}`}
            sub={
              result.stateStillOwedAtFiling > 0
                ? `${usd(result.stateStillOwedAtFiling)} owed to ${result.homeState.name} at filing`
                : undefined
            }
          />
        </dl>
      </div>

      {/* Notes / caveats */}
      {result.notes.length > 0 && (
        <ul className="space-y-1.5">
          {result.notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-600">
              <span aria-hidden className="text-gray-400">
                •
              </span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-gray-400">
        This mirrors the{' '}
        <a
          className="underline"
          href="https://www.irs.gov/individuals/tax-withholding-estimator"
          target="_blank"
          rel="noreferrer"
        >
          IRS Tax Withholding Estimator
        </a>
        . Estimates only, not tax advice.
      </p>
    </div>
  );
}

function StateSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <select
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select state…</option>
        {MODELED_STATES.map((s) => (
          <option key={s.code} value={s.code}>
            {s.code} — {s.name}
            {s.kind === 'none' ? ' (no income tax)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

// A money input with NO spinner arrows (text field constrained to digits).
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

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        accent ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${accent ? 'text-indigo-700' : 'text-gray-900'}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Row({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div>
        <dt className="text-gray-700">{k}</dt>
        {sub && <p className="text-[11px] text-amber-700">{sub}</p>}
      </div>
      <dd className="font-medium text-gray-900 tabular-nums">{v}</dd>
    </div>
  );
}
