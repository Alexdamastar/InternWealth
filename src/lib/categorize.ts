// Deterministic keyword categorizer + spending derivations. See §6.
// This is the fallback when the LLM is unavailable — the app MUST work offline.

import type { Transaction, TxCategory } from './types';
import { TX_CATEGORIES } from './types';

// Ordered rule list. First match wins, so order matters:
//   income/transfer first (esp. positive amounts), then specific merchants,
//   with income-like 'amazon payroll'/'relocation' BEFORE generic 'amazon'.
type Rule = { category: TxCategory; keywords: string[] };

const RULES: Rule[] = [
  {
    category: 'income',
    keywords: [
      'payroll',
      'direct deposit',
      'salary',
      'amazon.com payroll',
      'amazon payroll',
      'stipend',
      'relocation',
      'paycheck',
    ],
  },
  {
    category: 'transfer',
    keywords: ['transfer', 'venmo', 'zelle', 'withdrawal to', 'ach'],
  },
  {
    category: 'rent',
    keywords: ['rent', 'apartment', 'property', 'leasing', 'landlord'],
  },
  {
    category: 'groceries',
    keywords: [
      'grocery',
      'safeway',
      'trader joe',
      'whole foods',
      'costco',
      'kroger',
      'qfc',
      'market',
    ],
  },
  {
    category: 'dining_out',
    keywords: [
      'restaurant',
      'coffee',
      'starbucks',
      'chipotle',
      'doordash',
      'uber eats',
      'ubereats',
      'grubhub',
      'mcdonald',
      'cafe',
      'pizza',
      'bar ',
    ],
  },
  {
    category: 'transport',
    keywords: [
      'uber',
      'lyft',
      'gas',
      'shell',
      'chevron',
      'transit',
      'orca',
      'parking',
      'fuel',
    ],
  },
  {
    category: 'subscriptions',
    keywords: [
      'netflix',
      'spotify',
      'hulu',
      'disney',
      'prime',
      'icloud',
      'adobe',
      'github',
      'subscription',
      'gym',
    ],
  },
  {
    category: 'shopping',
    keywords: ['amazon', 'amzn', 'target', 'best buy', 'walmart', 'apple store', 'nike'],
  },
  {
    category: 'fees',
    keywords: ['fee', 'atm', 'interest charge', 'overdraft', 'service charge'],
  },
];

/** Categorize a single transaction deterministically. */
function categorizeOne(txn: Transaction): TxCategory {
  const desc = (txn.description ?? '').toLowerCase();

  // Positive amounts that look like a paycheck are income even if the merchant
  // keyword (e.g. 'amazon') would otherwise map to shopping.
  if (txn.amount > 0) {
    for (const kw of RULES[0].keywords) {
      if (desc.includes(kw)) return 'income';
    }
  }

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (desc.includes(kw)) return rule.category;
    }
  }

  return 'other';
}

export function categorizeLocal(txns: Transaction[]): Transaction[] {
  return txns.map((t) => ({ ...t, category: categorizeOne(t) }));
}

/** Number of distinct YYYY-MM periods present (min 1). */
export function distinctMonths(txns: Transaction[]): number {
  const months = new Set<string>();
  for (const t of txns) {
    const m = (t.date ?? '').slice(0, 7); // YYYY-MM
    if (/^\d{4}-\d{2}$/.test(m)) months.add(m);
  }
  return Math.max(1, months.size);
}

/** Sum of ABSOLUTE outflows (negative amounts) per category. Every key present. */
export function deriveSpendingByCategory(txns: Transaction[]): Record<TxCategory, number> {
  const out = {} as Record<TxCategory, number>;
  for (const c of TX_CATEGORIES) out[c] = 0;

  for (const t of txns) {
    if (t.amount < 0) {
      const cat: TxCategory = t.category ?? 'other';
      out[cat] += Math.abs(t.amount);
    }
  }
  return out;
}

/** Sum of positive 'income' inflows / distinct months (min 1). Rounded. */
export function deriveMonthlyIncome(txns: Transaction[]): number {
  let total = 0;
  for (const t of txns) {
    if (t.category === 'income' && t.amount > 0) total += t.amount;
  }
  return Math.round(total / distinctMonths(txns));
}

/** (rent+groceries+transport+subscriptions outflows) / distinct months (min 1). Rounded. */
export function deriveEssentialMonthly(txns: Transaction[]): number {
  const essential: TxCategory[] = ['rent', 'groceries', 'transport', 'subscriptions'];
  let total = 0;
  for (const t of txns) {
    if (t.amount < 0 && t.category && essential.includes(t.category)) {
      total += Math.abs(t.amount);
    }
  }
  return Math.round(total / distinctMonths(txns));
}
