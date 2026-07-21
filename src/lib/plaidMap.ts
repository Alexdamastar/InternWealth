// Pure mapping from Plaid transactions to InternWealth Transactions.
// Deterministic — Plaid's personal_finance_category (PFC) is mapped by table,
// and anything unmapped falls back to the same keyword categorizer the CSV
// path uses. No LLM involved anywhere in the Plaid import.

import type { Transaction, TxCategory } from './types';
import { categorizeLocal } from './categorize';

// The subset of Plaid's Transaction shape we consume. Structural so tests
// don't have to build the full SDK object.
export interface PlaidTxLike {
  date: string; // posted date, YYYY-MM-DD
  authorized_date?: string | null; // when the user actually made it — preferred
  name: string;
  merchant_name?: string | null;
  amount: number; // Plaid convention: positive = money LEAVING the account
  pending: boolean;
  personal_finance_category?: { primary: string; detailed: string } | null;
}

// PFC detailed categories that override the primary-level mapping.
const PFC_DETAILED: Record<string, TxCategory> = {
  FOOD_AND_DRINK_GROCERIES: 'groceries',
  // Streaming and gym charges are recurring — the app treats them as
  // subscriptions (they count toward essential monthly spend).
  ENTERTAINMENT_TV_AND_MOVIES: 'subscriptions',
  ENTERTAINMENT_MUSIC_AND_AUDIO: 'subscriptions',
  PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS: 'subscriptions',
};

// PFC primary → app category. Anything absent falls through to the keyword
// categorizer (and ultimately 'other'). RENT_AND_UTILITIES maps to 'rent'
// because utilities are essential spend and the app has no separate bucket.
const PFC_PRIMARY: Record<string, TxCategory> = {
  INCOME: 'income',
  TRANSFER_IN: 'transfer',
  TRANSFER_OUT: 'transfer',
  RENT_AND_UTILITIES: 'rent',
  FOOD_AND_DRINK: 'dining_out',
  TRANSPORTATION: 'transport',
  GENERAL_MERCHANDISE: 'shopping',
  BANK_FEES: 'fees',
};

function pfcCategory(pfc: PlaidTxLike['personal_finance_category']): TxCategory | undefined {
  if (!pfc) return undefined;
  return PFC_DETAILED[pfc.detailed] ?? PFC_PRIMARY[pfc.primary];
}

/**
 * Map Plaid transactions to app Transactions:
 *  - drops pending transactions (details can still change; statements only
 *    contain posted activity, so this matches the CSV path)
 *  - flips the sign (Plaid: positive = outflow; app: positive = inflow)
 *  - categorizes via PFC table, keyword fallback for the rest
 *  - sorts ascending by date
 */
export function mapPlaidTransactions(plaidTxns: PlaidTxLike[]): Transaction[] {
  const mapped: Transaction[] = [];
  const uncategorized: number[] = []; // indexes into `mapped`

  for (const p of plaidTxns) {
    if (p.pending) continue;
    const amount = Math.round(-p.amount * 100) / 100;
    if (!amount) continue;
    const txn: Transaction = {
      date: p.authorized_date ?? p.date,
      description: (p.merchant_name ?? p.name ?? '').trim(),
      amount,
    };
    const category = pfcCategory(p.personal_finance_category);
    if (category) txn.category = category;
    else uncategorized.push(mapped.length);
    mapped.push(txn);
  }

  for (const i of uncategorized) {
    mapped[i] = categorizeLocal([mapped[i]])[0];
  }

  return mapped.sort((a, b) => a.date.localeCompare(b.date));
}
