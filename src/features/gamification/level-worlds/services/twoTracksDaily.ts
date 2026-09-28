/**
 * Two Tracks — the daily "both tracks" check.
 *
 * A day counts as a "both tracks" day when the player took at least one life
 * step (a habit check-in) AND at least one game step (a roll or a build).
 * Completing both fires the spark into the spine and adds a small, streaked
 * Journey XP bonus to the Combined Journey Level.
 *
 * This module is pure; the per-viewer ledger it advances is a presentational
 * checkpoint (like the earned-XP floor), never gameplay state or a reward
 * authority. Game steps are detected by watching a read-only activity
 * signature of the canonical Island Run record change across the day.
 */

/** Journey XP for each day both tracks moved. */
export const TWO_TRACKS_SPARK_XP = 10;
/** Extra XP per consecutive both-tracks day, capped so streaks stay a nudge. */
export const TWO_TRACKS_STREAK_STEP_XP = 2;
export const TWO_TRACKS_STREAK_CAP = 7;

export type TwoTracksGameActivitySource = {
  currentIslandNumber: number;
  cycleIndex: number;
  tokenIndex: number;
  essenceLifetimeSpent: number;
};

export type TwoTracksDailyLedger = {
  version: 1;
  /** Local day key (YYYY-MM-DD) the baseline belongs to. */
  day: string;
  /** Game activity signature at the start of `day` (last one seen before it). */
  baselineSig: string | null;
  /** Latest game activity signature observed. */
  lastSig: string | null;
  /** Last day both tracks moved. */
  lastBothDay: string | null;
  /** Consecutive both-tracks days ending at `lastBothDay`. */
  streak: number;
  /** Lifetime both-tracks days. */
  bothDays: number;
  /** Lifetime spark bonus XP (streak-weighted). */
  sparkXp: number;
  /** Day whose spark animation has already been shown. */
  sparkSeenDay: string | null;
  /** Last day each track moved (balance nudge). */
  lastLifeDay?: string | null;
  lastGameDay?: string | null;
  /** Day the balance nudge was dismissed. */
  nudgeDismissedDay?: string | null;
};

/** A track this many days (or more) behind the other gets a gentle nudge. */
export const TWO_TRACKS_BALANCE_NUDGE_DAYS = 2;

export type TwoTracksBalanceNudge = {
  /** The track that has fallen behind. */
  lane: 'life' | 'game';
  /** Days since the lagging track last moved. */
  daysBehind: number;
};

export type TwoTracksToday = {
  lifeDone: boolean;
  gameDone: boolean;
  bothDone: boolean;
  /** True when today's spark has been earned but not yet shown. */
  sparkPending: boolean;
  /** Streak including today when today is done, else the live streak from yesterday. */
  streak: number;
  /** XP today's spark added (0 until both are done). */
  sparkXpToday: number;
  /** Set when one track moved today but the other has been idle for days. */
  balanceNudge: TwoTracksBalanceNudge | null;
};

/** Whole local days from `from` to `to` (both YYYY-MM-DD). */
export function twoTracksDaysBetween(from: string, to: string): number {
  const toMs = (key: string) => {
    const [year, month, date] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((toMs(to) - toMs(from)) / 86_400_000);
}

/**
 * The balance nudge: when one track moved today and the other has been idle
 * for at least TWO_TRACKS_BALANCE_NUDGE_DAYS, point the player at it. Never
 * shown before a track has any history, on a both-tracks day, or once
 * dismissed for the day.
 */
export function resolveTwoTracksBalanceNudge(
  ledger: Pick<TwoTracksDailyLedger, 'lastLifeDay' | 'lastGameDay' | 'nudgeDismissedDay'>,
  day: string,
  lifeDone: boolean,
  gameDone: boolean,
): TwoTracksBalanceNudge | null {
  if (lifeDone === gameDone || ledger.nudgeDismissedDay === day) return null;
  const lane: 'life' | 'game' = lifeDone ? 'game' : 'life';
  const lastDay = lane === 'game' ? ledger.lastGameDay : ledger.lastLifeDay;
  if (!lastDay) return null;
  const daysBehind = twoTracksDaysBetween(lastDay, day);
  return daysBehind >= TWO_TRACKS_BALANCE_NUDGE_DAYS ? { lane, daysBehind } : null;
}

/** Local calendar day key, e.g. 2026-09-27. */
export function twoTracksDayKey(ms: number = Date.now()): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function previousTwoTracksDayKey(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return twoTracksDayKey(new Date(year, month - 1, date - 1, 12).getTime());
}

/**
 * Read-only signature of game activity: any roll moves the token and any
 * build spends essence; island travel and new cycles also change it.
 */
export function gameActivitySignature(record: TwoTracksGameActivitySource | null | undefined): string | null {
  if (!record) return null;
  const parts = [record.currentIslandNumber, record.cycleIndex, record.tokenIndex, record.essenceLifetimeSpent];
  if (!parts.every((value) => Number.isFinite(value))) return null;
  return parts.map((value) => Math.floor(value)).join(':');
}

export function sparkXpForStreak(streak: number): number {
  const steps = Math.min(TWO_TRACKS_STREAK_CAP, Math.max(1, Math.floor(streak))) - 1;
  return TWO_TRACKS_SPARK_XP + steps * TWO_TRACKS_STREAK_STEP_XP;
}

export function createTwoTracksLedger(day: string, gameSig: string | null): TwoTracksDailyLedger {
  return {
    version: 1, day, baselineSig: gameSig, lastSig: gameSig,
    lastBothDay: null, streak: 0, bothDays: 0, sparkXp: 0, sparkSeenDay: null,
  };
}

/**
 * Advance the ledger with the latest observation. Pure: returns the next
 * ledger and today's check (callers persist the ledger).
 */
export function advanceTwoTracksLedger(
  previous: TwoTracksDailyLedger | null,
  observation: { day: string; gameSig: string | null; lifeStepsToday: number },
): { ledger: TwoTracksDailyLedger; today: TwoTracksToday } {
  const { day, gameSig } = observation;
  let ledger: TwoTracksDailyLedger = previous ? { ...previous } : createTwoTracksLedger(day, gameSig);

  if (ledger.day !== day) {
    // A new day: whatever we last saw becomes the baseline to beat.
    ledger.day = day;
    ledger.baselineSig = ledger.lastSig ?? gameSig;
  }
  if (ledger.baselineSig === null && gameSig !== null) ledger.baselineSig = gameSig;
  if (gameSig !== null) ledger.lastSig = gameSig;

  const lifeDone = observation.lifeStepsToday > 0;
  const gameDone = gameSig !== null && ledger.baselineSig !== null && gameSig !== ledger.baselineSig;
  const bothDone = lifeDone && gameDone;
  // Remember when each track last moved before today's update, so the nudge
  // measures the idle gap rather than today.
  const balanceNudge = resolveTwoTracksBalanceNudge(ledger, day, lifeDone, gameDone);
  if (lifeDone) ledger.lastLifeDay = day;
  if (gameDone) ledger.lastGameDay = day;

  let sparkXpToday = 0;
  if (bothDone && ledger.lastBothDay !== day) {
    ledger.streak = ledger.lastBothDay === previousTwoTracksDayKey(day) ? ledger.streak + 1 : 1;
    ledger.lastBothDay = day;
    ledger.bothDays += 1;
    ledger.sparkXp += sparkXpForStreak(ledger.streak);
  }
  if (ledger.lastBothDay === day) sparkXpToday = sparkXpForStreak(ledger.streak);

  const liveStreak = ledger.lastBothDay === day || ledger.lastBothDay === previousTwoTracksDayKey(day)
    ? ledger.streak : 0;

  return {
    ledger,
    today: {
      lifeDone,
      gameDone,
      bothDone,
      sparkPending: bothDone && ledger.sparkSeenDay !== day,
      streak: liveStreak,
      sparkXpToday,
      balanceNudge,
    },
  };
}

export function dismissTwoTracksBalanceNudge(ledger: TwoTracksDailyLedger, day: string): TwoTracksDailyLedger {
  return ledger.nudgeDismissedDay === day ? ledger : { ...ledger, nudgeDismissedDay: day };
}

export function markTwoTracksSparkSeen(ledger: TwoTracksDailyLedger, day: string): TwoTracksDailyLedger {
  return ledger.sparkSeenDay === day ? ledger : { ...ledger, sparkSeenDay: day };
}

export function parseTwoTracksLedger(raw: string | null): TwoTracksDailyLedger | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<TwoTracksDailyLedger>;
    if (value?.version !== 1 || typeof value.day !== 'string') return null;
    const count = (n: unknown) => (Number.isFinite(n) ? Math.max(0, Math.floor(n as number)) : 0);
    const str = (s: unknown) => (typeof s === 'string' ? s : null);
    return {
      version: 1,
      day: value.day,
      baselineSig: str(value.baselineSig),
      lastSig: str(value.lastSig),
      lastBothDay: str(value.lastBothDay),
      streak: count(value.streak),
      bothDays: count(value.bothDays),
      sparkXp: count(value.sparkXp),
      sparkSeenDay: str(value.sparkSeenDay),
      lastLifeDay: str(value.lastLifeDay),
      lastGameDay: str(value.lastGameDay),
      nudgeDismissedDay: str(value.nudgeDismissedDay),
    };
  } catch {
    return null;
  }
}
