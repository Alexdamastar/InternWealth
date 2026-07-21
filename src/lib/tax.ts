// Pure, deterministic tax estimator for InternWealth. No I/O, no LLM, no async.
// Mirrors what the IRS Tax Withholding Estimator does — federal income tax +
// FICA (+ a curated set of state estimates) — but driven entirely by the
// intern's own inputs so the LLM never touches a tax number.
//
// The intern-specific value-add is ANNUALIZATION. Payroll withholding tables
// treat each paycheck as if you earned at that rate ALL YEAR, so an intern
// earning a high summer wage for only a few months is typically OVER-withheld
// on federal tax and gets a refund. We model both:
//   - what actually gets withheld (annualized rate x months worked), and
//   - what they will actually owe (tax on their ACTUAL, lower total earnings),
// and surface the difference (the likely refund).
//
// Dual-state: your RESIDENT (home) state taxes ALL your income, but gives a
// credit for tax paid to the state you WORKED in. The practical net is that you
// pay the HIGHER of the two states' rates. If your home-state rate exceeds your
// work-state rate — and the home state didn't withhold from an out-of-state
// summer job — you OWE the difference at filing (you're under-withheld there).
//
// IMPORTANT: every figure here is an ESTIMATE based on 2025 federal tax tables
// and simplified/flat state rates. It is NOT tax advice. For an authoritative
// number, use the IRS Tax Withholding Estimator:
// https://www.irs.gov/individuals/tax-withholding-estimator

export type FilingStatus = 'single' | 'married_jointly';

// The tax year whose tables these constants reflect. Bump this and the numbers
// below when newer IRS figures are published.
export const TAX_YEAR = 2025;

// FICA (payroll tax). NOT annualized and NOT refundable via withholding
// mismatch — it's a flat percentage of ACTUAL wages earned.
export const SOCIAL_SECURITY_RATE = 0.062;
export const SOCIAL_SECURITY_WAGE_BASE = 176_100; // 2025 cap; interns rarely hit it
export const MEDICARE_RATE = 0.0145; // no wage cap

// 2025 federal standard deduction by filing status.
const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15_000,
  married_jointly: 30_000,
};

// If you CAN be claimed as a dependent on someone else's return (common for
// students / first-time interns still claimed by a parent), your standard
// deduction is capped: it's the GREATER of $1,350 or your earned income + $450,
// but never more than the normal standard deduction. This is the one "About
// you" question that materially changes an intern's federal tax, so we model it.
const DEPENDENT_MIN_DEDUCTION = 1_350;
const DEPENDENT_EARNED_INCOME_BUMP = 450;

// The standard deduction actually available, accounting for the dependent cap.
function standardDeductionFor(
  status: FilingStatus,
  earnedIncome: number,
  canBeClaimedAsDependent: boolean,
): number {
  const regular = STANDARD_DEDUCTION[status];
  if (!canBeClaimedAsDependent) return regular;
  const capped = Math.max(DEPENDENT_MIN_DEDUCTION, Math.max(0, earnedIncome) + DEPENDENT_EARNED_INCOME_BUMP);
  return Math.min(regular, capped);
}

// 2025 federal income-tax brackets by filing status. Each entry is
// [upperBound, rate]; the last bound is Infinity.
type Bracket = [upper: number, rate: number];

const FEDERAL_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    [11_925, 0.1],
    [48_475, 0.12],
    [103_350, 0.22],
    [197_300, 0.24],
    [250_525, 0.32],
    [626_350, 0.35],
    [Infinity, 0.37],
  ],
  married_jointly: [
    [23_850, 0.1],
    [96_950, 0.12],
    [206_700, 0.22],
    [394_600, 0.24],
    [501_050, 0.32],
    [751_600, 0.35],
    [Infinity, 0.37],
  ],
};

// How confident we are in a given state's rate.
//   'none'     — state has no wage income tax (exact).
//   'flat'     — state uses a single flat rate (exact rate, applied simply).
//   'estimate' — progressive state; we use a rough effective rate (labeled).
//   'unknown'  — not modeled; treated as 0 and flagged so we don't mislead.
export type StateRateKind = 'none' | 'flat' | 'estimate' | 'unknown';

export interface StateTax {
  code: string;
  name: string;
  rate: number; // effective decimal rate applied to taxable wages
  kind: StateRateKind;
}

// Curated table. The nine no-income-tax states are exact. Flat-tax states use
// their real single rate. A handful of common intern destinations with
// progressive brackets use a rough EFFECTIVE estimate for a modest income —
// clearly labeled 'estimate'. Anything not listed is 'unknown' (treated as 0).
const STATE_TABLE: StateTax[] = [
  // No wage income tax (exact).
  { code: 'AK', name: 'Alaska', rate: 0, kind: 'none' },
  { code: 'FL', name: 'Florida', rate: 0, kind: 'none' },
  { code: 'NV', name: 'Nevada', rate: 0, kind: 'none' },
  { code: 'NH', name: 'New Hampshire', rate: 0, kind: 'none' }, // taxes only interest/dividends, not wages
  { code: 'SD', name: 'South Dakota', rate: 0, kind: 'none' },
  { code: 'TN', name: 'Tennessee', rate: 0, kind: 'none' },
  { code: 'TX', name: 'Texas', rate: 0, kind: 'none' },
  { code: 'WA', name: 'Washington', rate: 0, kind: 'none' },
  { code: 'WY', name: 'Wyoming', rate: 0, kind: 'none' },
  // Flat-rate states (exact rate).
  { code: 'AZ', name: 'Arizona', rate: 0.025, kind: 'flat' },
  { code: 'CO', name: 'Colorado', rate: 0.044, kind: 'flat' },
  { code: 'IL', name: 'Illinois', rate: 0.0495, kind: 'flat' },
  { code: 'IN', name: 'Indiana', rate: 0.0305, kind: 'flat' },
  { code: 'KY', name: 'Kentucky', rate: 0.04, kind: 'flat' },
  { code: 'MA', name: 'Massachusetts', rate: 0.05, kind: 'flat' },
  { code: 'MI', name: 'Michigan', rate: 0.0425, kind: 'flat' },
  { code: 'NC', name: 'North Carolina', rate: 0.045, kind: 'flat' },
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307, kind: 'flat' },
  { code: 'UT', name: 'Utah', rate: 0.0455, kind: 'flat' },
  // Progressive states — rough effective estimates for a modest income.
  { code: 'CA', name: 'California', rate: 0.05, kind: 'estimate' },
  { code: 'NY', name: 'New York', rate: 0.055, kind: 'estimate' },
  { code: 'NJ', name: 'New Jersey', rate: 0.04, kind: 'estimate' },
  { code: 'VA', name: 'Virginia', rate: 0.05, kind: 'estimate' },
  { code: 'GA', name: 'Georgia', rate: 0.05, kind: 'estimate' },
  { code: 'MD', name: 'Maryland', rate: 0.05, kind: 'estimate' },
  { code: 'MN', name: 'Minnesota', rate: 0.06, kind: 'estimate' },
  { code: 'OR', name: 'Oregon', rate: 0.08, kind: 'estimate' },
  { code: 'WI', name: 'Wisconsin', rate: 0.05, kind: 'estimate' },
  { code: 'OH', name: 'Ohio', rate: 0.03, kind: 'estimate' },
  { code: 'DC', name: 'District of Columbia', rate: 0.06, kind: 'estimate' },
];

const STATE_BY_CODE: Record<string, StateTax> = Object.fromEntries(
  STATE_TABLE.map((s) => [s.code, s]),
);

// Look up a state's tax treatment. Unknown / empty codes return an 'unknown'
// entry with a 0 rate so callers can flag "state not modeled" instead of
// silently pretending there's no tax.
export function lookupState(code: string | undefined | null): StateTax {
  const c = (code ?? '').trim().toUpperCase();
  if (!c) return { code: '', name: 'Not specified', rate: 0, kind: 'unknown' };
  return STATE_BY_CODE[c] ?? { code: c, name: c, rate: 0, kind: 'unknown' };
}

// The states we model, for populating dropdowns (sorted by name).
export const MODELED_STATES: StateTax[] = [...STATE_TABLE].sort((a, b) =>
  a.name.localeCompare(b.name),
);

/** Federal income tax on a given amount of taxable income (post-deduction). */
export function federalTax(taxableIncome: number, status: FilingStatus): number {
  let income = Math.max(0, taxableIncome);
  if (income === 0) return 0;
  const brackets = FEDERAL_BRACKETS[status];
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of brackets) {
    if (income <= 0) break;
    const slice = Math.min(income, upper - lower);
    tax += slice * rate;
    income -= slice;
    lower = upper;
  }
  return tax;
}

export interface TaxInputs {
  grossMonthlyIncome: number; // gross pay per month, before any tax
  monthsWorked: number; // length of the internship in months (e.g. 3 for 12 weeks)
  filingStatus: FilingStatus;
  workState: string; // 2-letter code where the internship is
  homeState: string; // 2-letter code of legal residence (may equal workState)

  // --- Optional refinements (default to the intern-typical value if omitted) ---
  // Can someone else (usually a parent) claim you as a dependent? Caps the
  // standard deduction. Default false.
  canBeClaimedAsDependent?: boolean;
  // Other taxable income with NO withholding — taxable scholarships, interest,
  // dividends, etc. Added to taxable income; it can leave you UNDER-withheld.
  // Annual total for 2025. Default 0.
  otherTaxableIncome?: number;
  // Pre-tax contributions made OUTSIDE payroll (traditional IRA / HSA). Reduces
  // taxable income. Annual total for 2025. Default 0.
  preTaxContributions?: number;
}

export interface TaxResult {
  // Echoed inputs / derived headline figures.
  taxYear: number;
  actualGrossEarned: number; // gross for the months actually worked
  annualizedGross: number; // what the payroll table assumes (gross x 12)
  standardDeduction: number; // deduction actually applied (post dependent cap)
  otherTaxableIncome: number; // echoed: non-wage income with no withholding
  preTaxContributions: number; // echoed: pre-tax contributions reducing taxable income

  // Federal income tax.
  federalWithheld: number; // withheld across the internship (annualized rate)
  federalActuallyOwed: number; // tax on ACTUAL earnings
  federalRefund: number; // withheld - owed (positive = refund back to you)

  // FICA (Social Security + Medicare). Flat on actual wages; not refundable.
  fica: number;

  // State income tax (dual-state aware).
  workState: StateTax;
  homeState: StateTax;
  workStateWithheld: number; // withheld by the work state over the internship
  totalStateOwed: number; // net state liability = higher of the two rates
  stateStillOwedAtFiling: number; // extra owed to the home state (0 if none)

  // Bottom line.
  monthlyTakeHome: number; // net pay per month DURING the internship
  totalTakeHome: number; // net pay across the whole internship
  effectiveTaxRate: number; // total tax (owed) / actual gross, as a decimal
  estimatedRefund: number; // net cash back at filing (federal refund - state still owed)

  notes: string[]; // caveats: estimate labels, unknown states, dual-state owe, etc.
}

/**
 * Estimate an intern's taxes and take-home pay from their own inputs.
 *
 * Federal withholding is annualized (the over-withholding effect); FICA is a
 * flat percentage of actual wages; state tax is dual-state aware (resident
 * state taxes everything with a credit for the work state, so you pay the
 * higher rate, and owe the difference at filing if the home rate is higher).
 *
 * All amounts are whole-dollar-friendly but returned unrounded; round at the
 * display edge. Zero/negative inputs are clamped so the function never throws.
 */
export function estimateTaxes(inputs: TaxInputs): TaxResult {
  const grossMonthly = Math.max(0, inputs.grossMonthlyIncome);
  const months = Math.max(0, inputs.monthsWorked);
  const status = inputs.filingStatus;
  const canBeClaimed = inputs.canBeClaimedAsDependent ?? false;
  const otherIncome = Math.max(0, inputs.otherTaxableIncome ?? 0);
  const preTax = Math.max(0, inputs.preTaxContributions ?? 0);

  const actualGross = grossMonthly * months;
  const annualizedGross = grossMonthly * 12;

  // --- Federal income tax (annualized withholding vs. actual liability) ---
  // Withholding basis: payroll uses a default W-4 — the FULL standard deduction,
  // wages only, annualized. It knows nothing about dependent status, outside
  // pre-tax contributions, or non-wage income, so those only move actual
  // liability (and therefore the refund), never what's withheld per paycheck.
  const withholdingDeduction = STANDARD_DEDUCTION[status];
  const federalIfFullYear = federalTax(annualizedGross - withholdingDeduction, status);
  const monthlyFederalWithheld = federalIfFullYear / 12;
  const federalWithheld = monthlyFederalWithheld * months;

  // Actual liability: apply the dependent-capped deduction, subtract pre-tax
  // contributions, and add non-wage taxable income.
  const filingDeduction = standardDeductionFor(status, actualGross, canBeClaimed);
  const federalTaxableIncome = actualGross + otherIncome - preTax - filingDeduction;
  const federalActuallyOwed = federalTax(federalTaxableIncome, status);
  const federalRefund = federalWithheld - federalActuallyOwed;

  // --- FICA: flat on actual wages, Social Security capped at the wage base ---
  const socialSecurity = Math.min(actualGross, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE;
  const medicare = actualGross * MEDICARE_RATE;
  const fica = socialSecurity + medicare;
  const monthlyFica = months > 0 ? fica / months : 0;

  // --- State income tax (dual-state) ---
  const work = lookupState(inputs.workState);
  const home = lookupState(inputs.homeState);
  // Resident state taxes all income but credits tax paid to the work state, so
  // the net rate is the HIGHER of the two.
  const netStateRate = Math.max(work.rate, home.rate);
  const totalStateOwed = actualGross * netStateRate;
  const workStateWithheld = actualGross * work.rate;
  // If the home rate is higher and the home state didn't withhold, that gap is
  // owed at filing (interns are usually under-withheld here).
  const stateStillOwedAtFiling = Math.max(0, totalStateOwed - workStateWithheld);

  // --- Bottom line ---
  // Monthly take-home reflects what actually lands in the account each month:
  // gross minus what's withheld that month (federal + FICA + WORK-state).
  const monthlyWorkStateWithheld = grossMonthly * work.rate;
  const monthlyTakeHome = Math.max(
    0,
    grossMonthly - monthlyFederalWithheld - monthlyFica - monthlyWorkStateWithheld,
  );
  const totalTakeHome = monthlyTakeHome * months;

  const totalTaxOwed = federalActuallyOwed + fica + totalStateOwed;
  // Effective rate is measured against total taxable income (wages + other),
  // so adding non-wage income doesn't look like a free lunch.
  const incomeBase = actualGross + otherIncome;
  const effectiveTaxRate = incomeBase > 0 ? totalTaxOwed / incomeBase : 0;
  // Net cash situation at filing: federal refund, less any state still owed.
  const estimatedRefund = federalRefund - stateStillOwedAtFiling;

  // --- Notes / caveats ---
  const notes: string[] = [];
  notes.push(
    `Estimate based on ${TAX_YEAR} federal tax tables and simplified state rates — not tax advice. ` +
      `For an exact figure use the IRS Tax Withholding Estimator.`,
  );
  if (federalRefund > 0) {
    notes.push(
      `Because withholding assumes you earn ${grossMonthly > 0 ? 'this much' : 'your monthly pay'} ` +
        `all year, you're likely over-withheld on federal tax and should get roughly ` +
        `$${Math.round(federalRefund).toLocaleString('en-US')} back as a refund.`,
    );
  } else if (federalRefund < 0) {
    notes.push(
      `Heads up: your income here withholds LESS federal tax than you'll owe — expect to owe ` +
        `about $${Math.round(-federalRefund).toLocaleString('en-US')} at filing. This usually ` +
        `happens when non-wage income (like a taxable scholarship) isn't withheld on, or you can ` +
        `be claimed as a dependent. Set that money aside now.`,
    );
  }
  if (canBeClaimed && filingDeduction < STANDARD_DEDUCTION[status]) {
    notes.push(
      `Because you can be claimed as a dependent, your standard deduction is capped at ` +
        `$${Math.round(filingDeduction).toLocaleString('en-US')} (not the full ` +
        `$${STANDARD_DEDUCTION[status].toLocaleString('en-US')}), so more of your pay is taxed.`,
    );
  }
  if (otherIncome > 0) {
    notes.push(
      `We added $${Math.round(otherIncome).toLocaleString('en-US')} of other taxable income ` +
        `(e.g. a taxable scholarship or interest). Nothing is withheld on it, so it lowers your ` +
        `refund or adds to what you owe.`,
    );
  }
  if (preTax > 0) {
    notes.push(
      `We subtracted $${Math.round(preTax).toLocaleString('en-US')} in pre-tax contributions ` +
        `(traditional IRA / HSA), which lowers your taxable income and your federal tax.`,
    );
  }
  // Be explicit about what we assume, so nothing is silently pretended.
  notes.push(
    `Assumes: not 65+ or blind, no dependents of your own, no self-employment/pension/` +
      `unemployment income, and the standard deduction (no itemizing). Adjust on the IRS ` +
      `estimator if any of those apply to you.`,
  );
  if (home.code && work.code && home.code !== work.code) {
    if (stateStillOwedAtFiling > 0) {
      notes.push(
        `Your home state (${home.name}) taxes at a higher rate than your work state ` +
          `(${work.name}). Since ${home.name} likely didn't withhold from a ${work.name} job, ` +
          `expect to owe about $${Math.round(stateStillOwedAtFiling).toLocaleString('en-US')} to ` +
          `${home.name} at filing — set this aside now.`,
      );
    } else {
      notes.push(
        `You worked in ${work.name} but live in ${home.name}. Your resident state credits ` +
          `tax paid to ${work.name}, so you generally won't be double-taxed — you pay the higher ` +
          `of the two rates.`,
      );
    }
  }
  for (const s of [work, home]) {
    if (s.kind === 'estimate') {
      notes.push(`${s.name} uses a progressive tax; we applied a rough effective rate as an estimate.`);
    } else if (s.kind === 'unknown' && s.code) {
      notes.push(`${s.code} isn't in our state table yet — its state income tax is shown as $0. Verify separately.`);
    }
  }

  return {
    taxYear: TAX_YEAR,
    actualGrossEarned: actualGross,
    annualizedGross,
    standardDeduction: filingDeduction,
    otherTaxableIncome: otherIncome,
    preTaxContributions: preTax,
    federalWithheld,
    federalActuallyOwed,
    federalRefund,
    fica,
    workState: work,
    homeState: home,
    workStateWithheld,
    totalStateOwed,
    stateStillOwedAtFiling,
    monthlyTakeHome,
    totalTakeHome,
    effectiveTaxRate,
    estimatedRefund,
    notes,
  };
}
