// Client-side persistence via localStorage. No server, no auth. See §2.
// The Anthropic API key is kept in sessionStorage (not localStorage) so it is
// dropped when the tab closes and is never persisted to disk long-term.

import type { AllocationResult, Goal, Snapshot, Transaction, UserProfile } from './types';

const KEYS = {
  apiKey: 'internwealth:apiKey',
  profile: 'internwealth:profile',
  goals: 'internwealth:goals',
  transactions: 'internwealth:transactions',
  snapshots: 'internwealth:snapshots',
} as const;

const isBrowser = () => typeof window !== 'undefined';

// ---- API key (sessionStorage; never localStorage, never logged) ----
export function getApiKey(): string | null {
  if (!isBrowser()) return null;
  return window.sessionStorage.getItem(KEYS.apiKey);
}

export function setApiKey(key: string): void {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(KEYS.apiKey, key.trim());
}

export function clearApiKey(): void {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(KEYS.apiKey);
}

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
