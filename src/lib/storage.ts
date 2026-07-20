// Client-side persistence via localStorage. No server, no auth. See §2.
// LLM auth happens server-side via the machine's AWS credentials (Bedrock), so
// there is no API key to store in the browser at all.

import type { AllocationResult, Goal, Snapshot, Transaction, UserProfile } from './types';

const KEYS = {
  profile: 'internwealth:profile',
  goals: 'internwealth:goals',
  transactions: 'internwealth:transactions',
  snapshots: 'internwealth:snapshots',
} as const;

const isBrowser = () => typeof window !== 'undefined';

// ---- Generic JSON helpers ----
function readJSON<T>(key: string): T | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ---- Profile / goals / transactions ----
export const getProfile = () => readJSON<UserProfile>(KEYS.profile);
export const setProfile = (p: UserProfile) => writeJSON(KEYS.profile, p);

export const getGoals = () => readJSON<Goal[]>(KEYS.goals) ?? [];
export const setGoals = (g: Goal[]) => writeJSON(KEYS.goals, g);

export const getTransactions = () => readJSON<Transaction[]>(KEYS.transactions) ?? [];
export const setTransactions = (t: Transaction[]) => writeJSON(KEYS.transactions, t);

// ---- Snapshots ----
export function getSnapshots(): Snapshot[] {
  return readJSON<Snapshot[]>(KEYS.snapshots) ?? [];
}

export function saveSnapshot(snapshot: Snapshot): void {
  const all = getSnapshots();
  all.push(snapshot);
  writeJSON(KEYS.snapshots, all);
}

export function makeSnapshot(
  profile: UserProfile,
  goals: Goal[],
  result: AllocationResult,
  spendingByCategory: Snapshot['spendingByCategory'],
): Snapshot {
  return {
    createdAt: new Date().toISOString(),
    profile,
    goals,
    result,
    spendingByCategory,
  };
}
