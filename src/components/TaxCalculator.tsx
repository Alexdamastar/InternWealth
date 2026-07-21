'use client';

// Deterministic tax + take-home estimator (see src/lib/tax.ts). Mirrors the IRS
// Tax Withholding Estimator, but the intern enters the numbers here and pure
// math produces the result — no LLM ever touches a tax figure. Its computed
// monthly take-home is saved to the tax profile so /plan can allocate post-tax
// dollars. Controlled component: parent owns the TaxProfile and passes value +
// onChange, so the estimate and any downstream plan share one source of truth.
import { useMemo, useState } from 'react';
import { estimateTaxes, MODELED_STATES, type FilingStatus, type TaxInputs } from '@/lib/tax';
import type { TaxProfile } from '@/lib/types';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

// Map the persisted profile to engine inputs (the optional refinements default
// to their intern-typical value inside the engine when omitted).
function toInputs(p: TaxProfile): TaxInputs {
  return {
    grossMonthlyIncome: p.grossMonthlyIncome,
    monthsWorked: p.monthsWorked,
    filingStatus: p.filingStatus,
    workState: p.workState,
    homeState: p.homeState,
    canBeClaimedAsDependent: p.canBeClaimedAsDependent,
    selfEmploymentProfit: p.selfEmploymentProfit,
    otherTaxableIncome: p.otherTaxableIncome,
    preTaxContributions: p.preTaxContributions,
  };
}

interface Props {
  value: TaxProfile;
  onChange: (next: TaxProfile) => void;
}

export default function TaxCalculator({ value, onChange }: Props) {
  // Advanced (non-wage income / pre-tax) is opt-in — most interns leave it off.
  const [showAdvanced, setShowAdvanced] = useState(
    () =>
      Boolean(value.selfEmploymentProfit) ||
      Boolean(value.otherTaxableIncome) ||
      Boolean(value.preTaxContributions),
  );
  const result = useMemo(() => estimateTaxes(toInputs(value)), [value]);

  // Keep the persisted take-home in sync with the live estimate, but only write
  // when it actually changes (avoids an update loop).
  function patch(p: Partial<TaxProfile>) {
    const next = { ...value, ...p };
    const r = estimateTaxes(toInputs(next));
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
        <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wider text-faint">
          Months you&apos;ll work
          <input
            type="text"
            inputMode="numeric"
            className="bg-paper/60 border border-line px-2 py-1.5 text-sm text-ink focus:border-moss"
            value={String(value.monthsWorked)}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '');
              patch({ monthsWorked: digits === '' ? 0 : Math.min(12, parseInt(digits, 10)) });
            }}
          />
        </label>
        <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wider text-faint">
          Filing status
          <select
            className="bg-paper/60 border border-line px-2 py-1.5 text-sm text-ink focus:border-moss"
            value={value.filingStatus}
            onChange={(e) => patch({ filingStatus: e.target.value as FilingStatus })}
          >
            <option value="single">Single</option>
            <option value="married_jointly">Married, filing jointly</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wider text-faint">
          Can a parent claim you as a dependent?
          <select
            className="bg-paper/60 border border-line px-2 py-1.5 text-sm text-ink focus:border-moss"
            value={value.canBeClaimedAsDependent ? 'yes' : 'no'}
            onChange={(e) => patch({ canBeClaimedAsDependent: e.target.value === 'yes' })}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
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

      {/* Advanced (opt-in): non-wage income + pre-tax contributions */}
      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="font-mono text-xs uppercase tracking-wider text-moss hover:text-moss-deep"
        >
          {showAdvanced ? '− Hide' : '+ Add'} a side hustle, other income, or pre-tax contributions
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 mt-3">
            <Money
              label="Side hustle / freelance profit for the year ($)"
              value={value.selfEmploymentProfit ?? 0}
              onChange={(v) => patch({ selfEmploymentProfit: v })}
            />
            <Money
              label="Other taxable income for the year ($)"
              value={value.otherTaxableIncome ?? 0}
              onChange={(v) => patch({ otherTaxableIncome: v })}
            />
            <Money
              label="Pre-tax IRA/HSA contributions ($)"
              value={value.preTaxContributions ?? 0}
              onChange={(v) => patch({ preTaxContributions: v })}
            />
            <p className="col-span-2 text-[11px] text-faint leading-relaxed">
              Side hustle profit = freelance, gig, or contractor income minus business expenses;
              it carries ~15.3% self-employment tax with nothing withheld. Other income = taxable
              scholarships, interest, or dividends. Pre-tax contributions to a traditional IRA or
              HSA lower your taxable income. Leave any at 0 if they don&apos;t apply.
            </p>
          </div>
        )}
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
        <p className="font-mono text-xs uppercase tracking-wider text-faint mb-1.5">
          Breakdown (for the internship)
        </p>
        <dl className="divide-y divide-line border border-line">
          <Row k="Gross earned (wages)" v={usd(result.actualGrossEarned)} />
          {result.selfEmploymentProfit > 0 && (
            <Row k="Side hustle profit" v={usd(result.selfEmploymentProfit)} />
          )}
          <Row
            k="Federal income tax (owed)"
            v={`- ${usd(result.federalActuallyOwed - result.selfEmploymentTax)}`}
          />
          <Row
            k="Federal tax withheld"
            v={usd(result.federalWithheld)}
            sub={
              result.federalRefund >= 0
                ? `Refund of ${usd(result.federalRefund)} at filing`
                : `You'll owe ${usd(-result.federalRefund)} at filing`
            }
          />
          <Row k="FICA (Social Security + Medicare)" v={`- ${usd(result.fica)}`} />
          {result.selfEmploymentTax > 0 && (
            <Row
              k="Self-employment tax"
              v={`- ${usd(result.selfEmploymentTax)}`}
              sub="~15.3% on side hustle profit — nothing withheld, owed at filing"
            />
          )}
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
            <li key={i} className="flex gap-2 text-xs text-ink-2 leading-relaxed">
              <span aria-hidden className="text-moss">
                •
              </span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-faint">
        This mirrors the{' '}
        <a
          className="text-moss underline hover:text-moss-deep"
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
    <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wider text-faint">
      {label}
      <select
        className="bg-paper/60 border border-line px-2 py-1.5 text-sm text-ink focus:border-moss"
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
    <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wider text-faint">
      {label}
      <input
        type="text"
        inputMode="numeric"
        className="bg-paper/60 border border-line px-2 py-1.5 text-sm text-ink focus:border-moss"
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
      className={`border p-3 ${
        accent ? 'border-moss/30 bg-moss/5' : 'border-line bg-card'
      }`}
    >
      <p className="font-mono text-xs uppercase tracking-wider text-faint">{label}</p>
      <p
        className={`font-display text-lg font-semibold ${
          accent ? 'text-moss' : 'text-ink'
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-faint mt-0.5">{hint}</p>}
    </div>
  );
}

function Row({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div>
        <dt className="text-ink-2">{k}</dt>
        {sub && <p className="text-[11px] text-warn-text">{sub}</p>}
      </div>
      <dd className="font-medium text-ink tabular-nums">{v}</dd>
    </div>
  );
}
