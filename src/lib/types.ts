// Shared types for InternWealth. See TECHNICAL_PLAN.md §5.

export type AccountType = 'checking' | 'savings' | 'unknown';

export type TxCategory =
  | 'income'
  | 'transfer'
  | 'rent'
  | 'groceries'
  | 'dining_out'
  | 'transport'
  | 'subscriptions'
  | 'shopping'
  | 'fees'
  | 'other';

export const TX_CATEGORIES: TxCategory[] = [
  'income',
  'transfer',
  'rent',
  'groceries',
  'dining_out',
  'transport',
  'subscriptions',
  'shopping',
  'fees',
  'other',
];

export interface Transaction {
  date: string; // ISO
  description: string;
  amount: number; // + inflow, - outflow
  category?: TxCategory; // filled by LLM or keyword fallback
}

export interface UserProfile {
  monthlyIncome: number; // derived or stated
  essentialMonthlyExpenses: number; // during the internship (often HCOL summer)
  // Essential monthly expenses during the SCHOOL YEAR. Interns usually spend far
  // less back at school than while working in a high-cost-of-living city over the
  // summer, so the emergency fund is sized against THIS number (what you actually
  // need to cover when you're not earning an Amazon paycheck). Optional: falls
  // back to essentialMonthlyExpenses when not provided.
  schoolYearMonthlyExpenses?: number;
  hasEmergencyFund: number; // current HYSA balance
  employer401kVests: boolean; // realistically vests? (Amazon caveat -> usually false)
  rothContributedThisYear: number;
  workState: string; // e.g. "WA", "CA", "NY"
  internshipEndsSoon: boolean;
}

// Inputs the intern gives the tax calculator. Persisted so the estimate (and
// the take-home it feeds into the plan) survives navigation. `takeHomeMonthly`
// is the calculator's output that the plan reads as post-tax income.
export interface TaxProfile {
  grossMonthlyIncome: number;
  monthsWorked: number;
  filingStatus: 'single' | 'married_jointly';
  workState: string;
  homeState: string;
  // Optional refinements from the IRS-style questions worth asking an intern.
  // Can a parent (or anyone) claim you as a dependent? Caps the standard
  // deduction — common for students. Defaults false when absent.
  canBeClaimedAsDependent?: boolean;
  // Net profit from a side hustle / freelance / gig work for the year. Carries
  // ~15.3% self-employment tax with no withholding. Defaults 0.
  selfEmploymentProfit?: number;
  // Annual non-wage taxable income with no withholding (taxable scholarships,
  // interest, dividends). Defaults 0.
  otherTaxableIncome?: number;
  // Annual pre-tax contributions made outside payroll (traditional IRA / HSA).
  // Defaults 0.
  preTaxContributions?: number;
  // The most recently computed monthly take-home, saved so /plan can use it as
  // the allocatable-income basis without recomputing. Undefined until computed.
  takeHomeMonthly?: number;
}

export type GoalKind =
  | 'emergency'
  | 'school'
  | 'roth'
  | '401k'
  | 'brokerage'
  | 'custom';

export interface Goal {
  id: string;
  label: string; // e.g. "3-month emergency fund"
  targetAmount?: number;
  priority: number; // lower = higher priority
  kind: GoalKind;
}

export type AllocationBucket =
  | 'emergency'
  | 'school'
  | 'roth'
  | '401k'
  | 'brokerage'
  | 'cash';

// After the Roth IRA is maxed, any remaining surplus is a USER DECISION, not an
// automatic step. The intern SPLITS the extra money across three destinations
// in whatever proportion they like (e.g. some cash + some 401k):
//   - 'cash'      keep it liquid (most optionality, no growth)
//   - 'brokerage' taxable investing (grows, sellable, but taxed on gains)
//   - '401k'      Roth 401(k) as extra Roth space, rolled into the Roth IRA
//                 later (tax-free growth, least accessible, 10% early penalty)
// See the guide's "Advanced Case: Using a Roth 401(k) as Extra Roth Space".
export type SurplusChoice = 'cash' | 'brokerage' | '401k';

// A split of the surplus across the three destinations. Values are relative
// weights (any non-negative numbers — the engine normalizes them). Using 0-100
// as percentages is the natural fit for the UI sliders, but the engine does not
// require them to sum to 100.
export type SurplusSplit = Record<SurplusChoice, number>;

// Sensible default: all surplus to the taxable brokerage.
export const DEFAULT_SURPLUS_SPLIT: SurplusSplit = { cash: 0, brokerage: 100, '401k': 0 };

export interface AllocationStep {
  bucket: AllocationBucket;
  label: string;
  amount: number; // dollars allocated this run
  rationale: string; // deterministic string from engine
  capReached?: boolean;
}

// A single tradeoff option shown for the post-Roth surplus decision. The engine
// produces these deterministically so the UI can render the choice with no LLM.
export interface SurplusOption {
  choice: SurplusChoice;
  label: string;
  pros: string[];
  cons: string[];
}

export interface AllocationResult {
  totalAllocatable: number;
  steps: AllocationStep[];
  leftover: number;
  warnings: string[]; // e.g. "401k match may not vest (Amazon)"
  // The post-Roth surplus, the split applied to it, and the tradeoff options.
  // `surplusOptions` is populated whenever a surplus exists so the UI can
  // present the tradeoffs alongside the split controls.
  surplus: number;
  surplusSplit: SurplusSplit; // the (normalized) split actually applied
  surplusAmounts: SurplusSplit; // dollars routed to each destination
  surplusOptions: SurplusOption[];
}

export interface Snapshot {
  createdAt: string;
  profile: UserProfile;
  goals: Goal[];
  result: AllocationResult;
  spendingByCategory: Record<TxCategory, number>;
}

// Chat message shape shared by onboarding UI and /api/chat.
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// A running, human-readable summary the LLM maintains ON THE SIDE as the
// onboarding conversation progresses — a "working plan" the intern can watch
// take shape. It is Markdown prose (never numbers the engine must own), plus the
// structured profile+goals extracted so far. When the intern says it looks good,
// they press Continue and this profile+goals is what gets sent forward to the
// engine. `complete` is the LLM's own signal that it has gathered enough to
// proceed. See the onboarding flow.
export interface WorkingPlan {
  summary: string; // Markdown the UI renders live in the side panel
  profile: UserProfile;
  goals: Goal[];
  complete: boolean;
}
