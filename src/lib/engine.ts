// Pure allocation engine for InternWealth. No I/O, no LLM, no async.
// Implements a deterministic financial "waterfall" in strict priority order:
//   emergency -> school -> roth -> [surplus split]
// where the post-Roth surplus is SPLIT by the intern across three destinations
// in any proportion:  cash | brokerage | 401k
// so the UI can render a full waterfall + the tradeoff decision with zero LLM.
// See TECHNICAL_PLAN.md and the intern finance guide ("Advanced Case: Using a
// Roth 401(k) as Extra Roth Space").

import {
  DEFAULT_SURPLUS_SPLIT,
  type AllocationBucket,
  type AllocationResult,
  type AllocationStep,
  type Goal,
  type SurplusChoice,
  type SurplusOption,
  type SurplusSplit,
  type UserProfile,
} from './types';

export const DEFAULT_EMERGENCY_MONTHS = 3;

// CONFIRMED correct by the user.
export const ROTH_IRA_ANNUAL_LIMIT_2026 = 7500;

// 401(k) early-withdrawal penalty, surfaced in the surplus tradeoffs.
export const EARLY_WITHDRAWAL_PENALTY_PCT = 10;

const SURPLUS_CHOICES: SurplusChoice[] = ['cash', 'brokerage', '401k'];

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/**
 * Split a whole-dollar `total` across the three surplus destinations using the
 * given relative weights. Uses the largest-remainder method so the parts sum
 * EXACTLY to `total` (no rounding drift — the dollar invariant stays exact).
 * If all weights are zero, the whole total falls back to the brokerage.
 */
export function splitSurplus(total: number, split: SurplusSplit): SurplusSplit {
  const result: SurplusSplit = { cash: 0, brokerage: 0, '401k': 0 };
  if (total <= 0) return result;

  const weights = SURPLUS_CHOICES.map((c) => Math.max(0, split[c] ?? 0));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  if (weightSum <= 0) {
    result.brokerage = total;
    return result;
  }

  // Ideal (fractional) dollar amounts, then floor and hand out the remaining
  // cents-of-a-dollar to the largest fractional remainders.
  const ideal = SURPLUS_CHOICES.map((c, i) => (total * weights[i]) / weightSum);
  const floored = ideal.map((v) => Math.floor(v));
  let assigned = floored.reduce((a, b) => a + b, 0);
  let leftoverUnits = total - assigned;

  const order = SURPLUS_CHOICES.map((c, i) => ({ i, frac: ideal[i] - floored[i] })).sort(
    (a, b) => b.frac - a.frac,
  );
  for (const { i } of order) {
    if (leftoverUnits <= 0) break;
    floored[i] += 1;
    leftoverUnits -= 1;
    assigned += 1;
  }

  SURPLUS_CHOICES.forEach((c, i) => {
    result[c] = floored[i];
  });
  return result;
}

/** Normalize a split to percentages that sum to 100 (for display/persistence). */
export function normalizeSplit(split: SurplusSplit): SurplusSplit {
  const weights = SURPLUS_CHOICES.map((c) => Math.max(0, split[c] ?? 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return { ...DEFAULT_SURPLUS_SPLIT };
  const out: SurplusSplit = { cash: 0, brokerage: 0, '401k': 0 };
  SURPLUS_CHOICES.forEach((c, i) => {
    out[c] = Math.round((weights[i] / sum) * 100);
  });
  return out;
}

/**
 * Build the three deterministic tradeoff options for the post-Roth surplus.
 * These describe cash vs. brokerage vs. 401(k) so the intern can make an
 * informed split. The 401(k) option only makes sense once the Roth IRA is
 * maxed (which is exactly when a surplus exists in this engine).
 */
export function surplusOptions(surplus: number): SurplusOption[] {
  const amt = usd(surplus);
  return [
    {
      choice: 'cash',
      label: `Keep some of the ${amt} as cash`,
      pros: [
        'Maximum immediate optionality — spend or move it any day, instantly.',
        'No market risk and nothing to sell.',
      ],
      cons: [
        'No long-term growth; inflation slowly erodes its purchasing power.',
        'You give up the compounding you would get by investing early.',
      ],
    },
    {
      choice: 'brokerage',
      label: `Invest some of the ${amt} in a taxable brokerage`,
      pros: [
        'Grows over time, unlike idle cash.',
        'More accessible than a 401(k): you can sell your positions whenever you want.',
      ],
      cons: [
        'Less accessible than cash — you must sell first, and markets are closed on weekends and holidays.',
        'Earnings are always taxed (capital gains) when you sell.',
      ],
    },
    {
      choice: '401k',
      label: `Contribute some of the ${amt} to a Roth 401(k)`,
      pros: [
        'Rolls into your Roth IRA later without counting against the annual limit — extra tax-free Roth space during a low-income year.',
        'Qualified withdrawals are tax-free, unlike a brokerage where earnings are always taxed.',
      ],
      cons: [
        'Least accessible: intended to stay invested until retirement.',
        `A ${EARLY_WITHDRAWAL_PENALTY_PCT}% early-withdrawal penalty (plus taxes) generally applies if you take gains out before age 59½.`,
        'Requires you to execute a rollover after the internship (paperwork/admin).',
      ],
    },
  ];
}

/**
 * Allocate `allocatableCash` across the priority waterfall.
 *
 * Mandatory priority order (each consumes remaining cash until exhausted):
 *   1. Emergency fund (HYSA)
 *   2. School-year expenses
 *   3. Roth IRA (up to the annual limit minus already-contributed)
 *
 * Whatever remains after the Roth IRA is the SURPLUS. The surplus is not an
 * automatic step — the intern SPLITS it across cash / brokerage / 401(k) via
 * `surplusSplit` (relative weights; the engine normalizes and distributes whole
 * dollars exactly). Any mix is allowed, e.g. 50% cash + 50% 401(k).
 *
 * 401(k) vesting caveat: if `profile.employer401kVests !== true` and any surplus
 * is routed to the 401(k), a warning is pushed explaining the match may not vest
 * (e.g. Amazon's multi-year vesting). The Roth-401(k)-as-extra-Roth-space
 * strategy can still make sense with no vested match, so it is allowed — the
 * warning just informs the decision.
 *
 * The steps array always contains all buckets in a stable order so the UI can
 * render a full waterfall. Invariant: sum(steps.amount) + leftover ===
 * allocatableCash (exact for whole-dollar cash). Negative cash is treated as 0.
 */
export function allocate(
  profile: UserProfile,
  goals: Goal[],
  allocatableCash: number,
  emergencyMonths: number = DEFAULT_EMERGENCY_MONTHS,
  surplusSplit: SurplusSplit = DEFAULT_SURPLUS_SPLIT,
): AllocationResult {
  const totalAllocatable = Math.max(0, allocatableCash);
  let remaining = totalAllocatable;
  const warnings: string[] = [];

  // 1. Emergency fund (HYSA)
  // Size the emergency fund against SCHOOL-YEAR expenses when we know them: the
  // fund exists to cover you when you are NOT earning the (HCOL, summer) intern
  // paycheck, and interns typically spend far less back at school. Fall back to
  // the internship-time essentials if a school-year figure wasn't gathered.
  const emergencyMonthlyBasis =
    profile.schoolYearMonthlyExpenses && profile.schoolYearMonthlyExpenses > 0
      ? profile.schoolYearMonthlyExpenses
      : profile.essentialMonthlyExpenses;
  const emergencyTarget = emergencyMonthlyBasis * emergencyMonths;
  const emergencyNeed = Math.max(0, emergencyTarget - profile.hasEmergencyFund);
  const emergencyAmount = Math.min(emergencyNeed, remaining);
  remaining -= emergencyAmount;

  // 2. School-year expenses
  const schoolGoal = goals.find((g) => g.kind === 'school');
  const schoolTarget = schoolGoal?.targetAmount ?? 0;
  const schoolAmount = Math.min(remaining, schoolTarget);
  remaining -= schoolAmount;

  // 3. Roth IRA
  const rothRoom = Math.max(
    0,
    ROTH_IRA_ANNUAL_LIMIT_2026 - profile.rothContributedThisYear,
  );
  const rothAmount = Math.min(remaining, rothRoom);
  remaining -= rothAmount;

  // Everything left after the Roth IRA is the surplus the intern splits.
  const surplus = remaining;
  const normalized = normalizeSplit(surplusSplit);
  const amounts = splitSurplus(surplus, surplusSplit);
  remaining = 0;

  // Vesting warning applies when a match wouldn't realistically vest AND the
  // intern actually routed money into the 401(k).
  const vests = profile.employer401kVests === true;
  if (!vests && amounts['401k'] > 0) {
    warnings.push(
      "401(k) match may not vest before you leave (e.g. Amazon's multi-year vesting) — skipping per the guide.",
    );
  }

  // "Show the math" (4.1): the exact arithmetic behind each amount, actual
  // inputs substituted, one line per formula in evaluation order. These are
  // the engine's real intermediates — if the code changes, these change.
  const surplusWeightSum = SURPLUS_CHOICES.reduce(
    (a, c) => a + Math.max(0, surplusSplit[c] ?? 0),
    0,
  );
  const splitMath = (choice: SurplusChoice): string[] => [
    `Surplus: ${usd(totalAllocatable)} in − ${usd(emergencyAmount)} emergency − ${usd(schoolAmount)} school − ${usd(rothAmount)} Roth = ${usd(surplus)}.`,
    surplusWeightSum > 0
      ? `Your ${choice} share: ${usd(surplus)} × ${normalized[choice]}% (your split) = ${usd(amounts[choice])}${
          surplus > 0 ? ', with largest-remainder rounding so the dollars stay exact' : ''
        }.`
      : `All weights are 0, so the entire surplus defaults to brokerage.`,
  ];

  const steps: AllocationStep[] = [
    {
      bucket: 'emergency',
      label: 'Emergency fund (HYSA)',
      amount: emergencyAmount,
      capReached: emergencyNeed > 0 && emergencyAmount >= emergencyNeed,
      math: [
        `Target: ${emergencyMonths} months × ${usd(emergencyMonthlyBasis)} (${
          profile.schoolYearMonthlyExpenses && profile.schoolYearMonthlyExpenses > 0
            ? 'school-year'
            : 'monthly'
        } expenses) = ${usd(emergencyTarget)}.`,
        `Still needed: ${usd(emergencyTarget)} target − ${usd(profile.hasEmergencyFund)} already saved = ${usd(emergencyNeed)}.`,
        `Allocated: the smaller of ${usd(emergencyNeed)} needed and ${usd(totalAllocatable)} available = ${usd(emergencyAmount)}.`,
      ],
      rationale:
        `Build a ${emergencyMonths}-month emergency fund first. The 3-6 month ` +
        `emergency-fund rule protects you from surprise expenses and job gaps; ` +
        `target is ${emergencyMonths} x ${usd(emergencyMonthlyBasis)} = ` +
        `${usd(emergencyTarget)}, sized against your ` +
        `${
          profile.schoolYearMonthlyExpenses && profile.schoolYearMonthlyExpenses > 0
            ? 'school-year'
            : 'monthly'
        } expenses — the fund is there for when you are NOT earning the ` +
        `internship paycheck, and you likely spend less back at school than in a ` +
        `high-cost city over the summer. Keep it in a high-yield savings account ` +
        `(HYSA) so it stays liquid and safe while still earning interest.`,
    },
    {
      bucket: 'school',
      label: 'School-year expenses',
      amount: schoolAmount,
      capReached: schoolTarget > 0 && schoolAmount >= schoolTarget,
      math: [
        `Remaining after emergency fund: ${usd(totalAllocatable)} − ${usd(emergencyAmount)} = ${usd(totalAllocatable - emergencyAmount)}.`,
        schoolTarget > 0
          ? `Allocated: the smaller of your ${usd(schoolTarget)} goal and ${usd(totalAllocatable - emergencyAmount)} remaining = ${usd(schoolAmount)}.`
          : `No school-year goal set, so nothing is reserved here (${usd(0)}).`,
      ],
      rationale:
        schoolGoal && schoolTarget > 0
          ? `Set aside ${usd(schoolTarget)} to cover tuition gaps, rent, and tech ` +
            `for the upcoming school year before investing — near-term ` +
            `obligations come before long-term growth.`
          : `No school-year goal was set, so nothing is reserved here. If you ` +
            `have tuition gaps, rent, or tech costs coming up, cover those ` +
            `before investing.`,
    },
    {
      bucket: 'roth',
      label: 'Roth IRA',
      amount: rothAmount,
      capReached: rothRoom > 0 && rothAmount >= rothRoom,
      math: [
        `Room left: ${usd(ROTH_IRA_ANNUAL_LIMIT_2026)} annual limit − ${usd(profile.rothContributedThisYear)} already contributed = ${usd(rothRoom)}.`,
        `Remaining after school-year expenses: ${usd(totalAllocatable)} − ${usd(emergencyAmount)} − ${usd(schoolAmount)} = ${usd(totalAllocatable - emergencyAmount - schoolAmount)}.`,
        `Allocated: the smaller of ${usd(rothRoom)} room and ${usd(totalAllocatable - emergencyAmount - schoolAmount)} remaining = ${usd(rothAmount)}.`,
      ],
      rationale:
        `Contribute up to the Roth IRA annual limit (${usd(ROTH_IRA_ANNUAL_LIMIT_2026)}), ` +
        `with ${usd(rothRoom)} of room left this year. Intern years are among the ` +
        `lowest-tax years of a SWE career, so paying tax now and letting the ` +
        `money grow tax-free is a big long-term advantage.`,
    },
    // The three surplus destinations. Any mix is allowed; the split determines
    // how the ${surplus} is divided across them.
    {
      bucket: '401k',
      label: 'Roth 401(k) (extra Roth space)',
      amount: amounts['401k'],
      math: splitMath('401k'),
      rationale:
        amounts['401k'] > 0
          ? `You routed ${usd(amounts['401k'])} of your ${usd(surplus)} surplus into a ` +
            `Roth 401(k). It can be rolled into your Roth IRA later without ` +
            `counting against the annual limit — extra tax-free space during a ` +
            `low-income year. Note the ${EARLY_WITHDRAWAL_PENALTY_PCT}% early-withdrawal ` +
            `penalty, and that ${vests ? 'your match vests' : 'your employer match likely will not vest'}.`
          : `No surplus routed here. A Roth 401(k) is only worth considering ` +
            `once your Roth IRA is maxed, as extra tax-free Roth space.`,
    },
    {
      bucket: 'brokerage',
      label: 'Taxable brokerage',
      amount: amounts.brokerage,
      math: splitMath('brokerage'),
      rationale:
        amounts.brokerage > 0
          ? `You routed ${usd(amounts.brokerage)} of your ${usd(surplus)} surplus into a ` +
            `taxable brokerage. It grows unlike idle cash and stays sellable at ` +
            `will, though earnings are taxed and it is less liquid than cash.`
          : `No surplus routed here this run.`,
    },
    {
      bucket: 'cash',
      label: 'Keep as cash',
      amount: amounts.cash,
      math: splitMath('cash'),
      rationale:
        amounts.cash > 0
          ? `You kept ${usd(amounts.cash)} of your ${usd(surplus)} surplus as cash for ` +
            `maximum immediate optionality. It stays fully liquid, but earns ` +
            `little and misses out on long-term growth.`
          : `No surplus kept as cash this run.`,
    },
  ];

  return {
    totalAllocatable,
    steps,
    leftover: remaining,
    warnings,
    surplus,
    surplusSplit: normalized,
    surplusAmounts: amounts,
    surplusOptions: surplus > 0 ? surplusOptions(surplus) : [],
  };
}

// Stable display order for the waterfall (mandatory buckets, then the surplus
// destinations). Exposed so the UI and tests share one source of truth.
export const BUCKET_ORDER: AllocationBucket[] = [
  'emergency',
  'school',
  'roth',
  '401k',
  'brokerage',
  'cash',
];
