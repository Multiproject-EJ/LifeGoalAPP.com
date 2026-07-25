/**
 * Comeback celebration — the "nice to see you back" reward granted when someone
 * returns after being away for a stretch of days.
 *
 * The visit stamp lives in localStorage next to the currency balances this
 * grants into (see `gameRewards`), so a return is measured per device rather
 * than per account. A device with no stamp yet is treated as a first run: the
 * stamp is written and nothing is celebrated, so a fresh install never opens
 * with a "welcome back".
 */

import { awardDice, awardGameTokens, CURRENCY_UPDATE_EVENT } from './gameRewards';

const STORAGE_KEY_COMEBACK = 'gol_comeback_visits';

/** Shortest absence that earns a celebration. Same-day and next-day returns are ordinary. */
export const COMEBACK_MIN_DAYS_AWAY = 2;

export const COMEBACK_BASE_DICE = 150;
export const COMEBACK_BASE_GAME_TOKENS = 5;
export const COMEBACK_DICE_PER_EXTRA_DAY = 40;
export const COMEBACK_GAME_TOKENS_PER_EXTRA_DAY = 1;
/** Ceilings keep a months-long absence from minting a fortune. */
export const COMEBACK_MAX_DICE = 500;
export const COMEBACK_MAX_GAME_TOKENS = 15;

export interface ComebackReward {
  dice: number;
  gameTokens: number;
}

export interface ComebackCelebration {
  daysAway: number;
  lastVisitDate: string;
  reward: ComebackReward;
}

interface ComebackVisitRecord {
  lastVisitDate: string;
  lastCelebratedDate?: string;
}

type ComebackVisitStore = Record<string, ComebackVisitRecord>;

function readStore(): ComebackVisitStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_COMEBACK);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as ComebackVisitStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ComebackVisitStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_COMEBACK, JSON.stringify(store));
  } catch {
    // A full or blocked quota must never break app start.
  }
}

export function toComebackDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whole days between two `YYYY-MM-DD` keys, counted at local midnight. */
export function daysBetweenDateKeys(fromDateKey: string, toDateKey: string): number {
  const from = new Date(`${fromDateKey}T00:00:00`);
  const to = new Date(`${toDateKey}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function computeComebackReward(daysAway: number): ComebackReward {
  const extraDays = Math.max(0, daysAway - COMEBACK_MIN_DAYS_AWAY);
  return {
    dice: Math.min(COMEBACK_MAX_DICE, COMEBACK_BASE_DICE + extraDays * COMEBACK_DICE_PER_EXTRA_DAY),
    gameTokens: Math.min(
      COMEBACK_MAX_GAME_TOKENS,
      COMEBACK_BASE_GAME_TOKENS + extraDays * COMEBACK_GAME_TOKENS_PER_EXTRA_DAY,
    ),
  };
}

/**
 * Reports what a return today would earn without recording anything. Useful for
 * previews and tests; `startComebackCelebration` is what app start should call.
 */
export function peekComebackCelebration(
  userId: string,
  todayDateKey = toComebackDateKey(),
): ComebackCelebration | null {
  if (!userId) return null;
  const record = readStore()[userId];
  if (!record?.lastVisitDate) return null;
  if (record.lastCelebratedDate === todayDateKey) return null;

  const daysAway = daysBetweenDateKeys(record.lastVisitDate, todayDateKey);
  if (daysAway < COMEBACK_MIN_DAYS_AWAY) return null;

  return { daysAway, lastVisitDate: record.lastVisitDate, reward: computeComebackReward(daysAway) };
}

/** Records that the user was here today without granting anything. */
export function markComebackVisit(userId: string, todayDateKey = toComebackDateKey()): void {
  if (!userId) return;
  const store = readStore();
  store[userId] = { ...store[userId], lastVisitDate: todayDateKey };
  writeStore(store);
}

/**
 * Grants the comeback reward when one is due and returns it for display, or
 * returns null after simply stamping the visit.
 *
 * The grant happens here rather than on a "collect" tap so the modal can state
 * the reward in the past tense — it is already in the balance by the time the
 * gift box opens, and closing the modal early cannot lose it. Stamping today as
 * both the visit and the celebration makes a reload a no-op.
 */
export function startComebackCelebration(
  userId: string,
  todayDateKey = toComebackDateKey(),
): ComebackCelebration | null {
  if (!userId) return null;

  const celebration = peekComebackCelebration(userId, todayDateKey);
  if (!celebration) {
    markComebackVisit(userId, todayDateKey);
    return null;
  }

  const context = `Welcome back after ${celebration.daysAway} days`;
  awardDice(userId, celebration.reward.dice, 'comeback_bonus', context);
  awardGameTokens(userId, celebration.reward.gameTokens, 'comeback_bonus', context);

  const store = readStore();
  store[userId] = { lastVisitDate: todayDateKey, lastCelebratedDate: todayDateKey };
  writeStore(store);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CURRENCY_UPDATE_EVENT, { detail: { userId } }));
  }

  return celebration;
}

/** Test/support seam: forget a user's visit history. */
export function resetComebackVisits(userId: string): void {
  const store = readStore();
  delete store[userId];
  writeStore(store);
}
