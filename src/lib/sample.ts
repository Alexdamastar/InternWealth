// Sample profile + goals for the zero-setup demo path. Numbers reflect a
// realistic Amazon SWE intern (~$9k/mo, WA, 401k match won't vest). See §14.
import type { Goal, UserProfile } from './types';

export const SAMPLE_PROFILE: UserProfile = {
  monthlyIncome: 9000,
  essentialMonthlyExpenses: 2600, // summer in a HCOL city: rent + groceries + transport + subs
  schoolYearMonthlyExpenses: 1400, // back at school: cheaper rent, meal plan, no HCOL premium
  hasEmergencyFund: 1500,
  employer401kVests: false, // Amazon: 3-yr cliff, interns never vest
  rothContributedThisYear: 0,
  workState: 'WA',
  internshipEndsSoon: true,
};

export const SAMPLE_GOALS: Goal[] = [
  {
    id: 'g-emergency',
    label: '3-month emergency fund',
    priority: 1,
    kind: 'emergency',
  },
  {
    id: 'g-school',
    label: 'School-year expenses (rent + tuition gap + laptop)',
    targetAmount: 6000,
    priority: 2,
    kind: 'school',
  },
  {
    id: 'g-roth',
    label: 'Roth IRA (low-tax-year advantage)',
    priority: 3,
    kind: 'roth',
  },
  {
    id: 'g-brokerage',
    label: 'Taxable brokerage (long-term)',
    priority: 5,
    kind: 'brokerage',
  },
];
