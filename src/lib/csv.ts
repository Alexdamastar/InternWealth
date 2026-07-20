// CSV / pasted-text parsing for bank statements. See TECHNICAL_PLAN.md §6.
// Tolerant of header aliases and two common shapes:
//   (a) Date, Description, Amount  (single signed amount column)
//   (b) Date, Description, Debit, Credit  (separate outflow/inflow columns)
// Sign convention: inflow positive, outflow negative. Never throws on bad rows.

import Papa from 'papaparse';
import type { Transaction } from './types';

type Row = Record<string, string>;

// Header alias groups. Matched case-insensitively against trimmed header names.
const DATE_ALIASES = ['date', 'transaction date', 'posted date', 'post date', 'trans date'];
const DESC_ALIASES = [
  'description',
  'details',
  'memo',
  'name',
  'narrative',
  'transaction',
  'payee',
  'note',
];
const AMOUNT_ALIASES = ['amount', 'value', 'transaction amount', 'amt'];
const DEBIT_ALIASES = ['debit', 'withdrawal', 'withdrawals', 'debit amount', 'money out'];
const CREDIT_ALIASES = ['credit', 'deposit', 'deposits', 'credit amount', 'money in'];
const TYPE_ALIASES = ['type', 'transaction type', 'debit/credit', 'dr/cr'];

/** Find the first header key in `row` whose normalized name matches any alias. */
function findKey(keys: string[], aliases: string[]): string | undefined {
  for (const key of keys) {
    const norm = key.trim().toLowerCase();
    if (aliases.includes(norm)) return key;
  }
  return undefined;
}

/** Parse a currency-ish string into a number, or null if not usable. */
function parseAmount(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Handle parentheses for negatives: (123.45) -> -123.45
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  // Strip currency symbols, thousands separators, spaces. Keep digits, . and -.
  s = s.replace(/[^0-9.\-]/g, '');
  if (!s || s === '-' || s === '.' || s === '-.') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/** Normalize a date string to YYYY-MM-DD when possible; else return the raw trimmed string. */
function normalizeDate(raw: string | undefined): string {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // Already ISO-ish: YYYY-MM-DD (optionally with time).
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // MM/DD/YYYY or M/D/YY (also accepts - or . separators).
  const mdy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (mdy) {
    const [, mm, dd, rawYy] = mdy;
    const yy = rawYy.length === 2 ? `20${rawYy}` : rawYy;
    const m = mm.padStart(2, '0');
    const d = dd.padStart(2, '0');
    return `${yy}-${m}-${d}`;
  }

  // Fall back to Date parsing (handles "Jun 15 2026", "15 Jun 2026", etc.).
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return s; // keep raw when we can't understand it
}

export function parseCsv(text: string): Transaction[] {
  if (!text || !text.trim()) return [];

  const result = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = Array.isArray(result.data) ? result.data : [];
  if (rows.length === 0) return [];

  // Determine header layout from the first row's keys.
  const headerKeys = Object.keys(rows[0] ?? {});
  const dateKey = findKey(headerKeys, DATE_ALIASES);
  const descKey = findKey(headerKeys, DESC_ALIASES);
  const amountKey = findKey(headerKeys, AMOUNT_ALIASES);
  const debitKey = findKey(headerKeys, DEBIT_ALIASES);
  const creditKey = findKey(headerKeys, CREDIT_ALIASES);
  const typeKey = findKey(headerKeys, TYPE_ALIASES);

  const txns: Transaction[] = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;

    const date = normalizeDate(dateKey ? row[dateKey] : undefined);
    const description = (descKey ? row[descKey] : '')?.toString().trim() ?? '';

    let amount: number | null = null;

    // Shape (b): separate debit/credit columns.
    if (debitKey || creditKey) {
      const debit = parseAmount(debitKey ? row[debitKey] : undefined);
      const credit = parseAmount(creditKey ? row[creditKey] : undefined);
      if (credit != null && credit !== 0) {
        amount = Math.abs(credit); // inflow positive
      } else if (debit != null && debit !== 0) {
        amount = -Math.abs(debit); // outflow negative
      }
    }

    // Shape (a): single amount column.
    if (amount == null && amountKey) {
      const parsed = parseAmount(row[amountKey]);
      if (parsed != null) {
        amount = parsed;
        // If a type column indicates direction and amounts are unsigned, infer.
        if (typeKey) {
          const type = (row[typeKey] ?? '').toString().trim().toLowerCase();
          if (/(debit|withdrawal|dr|out)/.test(type)) amount = -Math.abs(parsed);
          else if (/(credit|deposit|cr|in)/.test(type)) amount = Math.abs(parsed);
        }
      }
    }

    // Skip rows with no usable amount.
    if (amount == null || amount === 0 || Number.isNaN(amount)) continue;

    txns.push({ date, description, amount });
  }

  return txns;
}

/** Pasted text is just CSV too. */
export function parsePasted(text: string): Transaction[] {
  return parseCsv(text);
}
