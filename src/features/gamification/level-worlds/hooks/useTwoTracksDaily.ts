import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  advanceTwoTracksLedger,
  dismissTwoTracksBalanceNudge,
  gameActivitySignature,
  markTwoTracksSparkSeen,
  parseTwoTracksLedger,
  twoTracksDayKey,
  type TwoTracksDailyLedger,
  type TwoTracksGameActivitySource,
  type TwoTracksToday,
} from '../services/twoTracksDaily';

// Presentational per-viewer checkpoint (like the earned-XP floor). It holds
// only day keys, counters and a numeric activity signature: no habit text.
const PREFIX = 'lifegoal:two-tracks:daily:v1:';

function readLedger(userId: string): TwoTracksDailyLedger | null {
  try { return parseTwoTracksLedger(window.localStorage.getItem(PREFIX + userId)); } catch { return null; }
}

function writeLedger(userId: string, ledger: TwoTracksDailyLedger): void {
  try { window.localStorage.setItem(PREFIX + userId, JSON.stringify(ledger)); } catch { /* private mode */ }
}

export type TwoTracksDailyBinding = {
  today: TwoTracksToday | null;
  /** Lifetime spark XP for the Combined Journey Level. */
  sparkXp: number;
  /** Call once today's spark animation has played. */
  markSparkSeen: () => void;
  /** Hide today's balance nudge. */
  dismissBalanceNudge: () => void;
};

/**
 * Observes the canonical Island Run record (read-only) and today's habit
 * check-ins to answer "did both tracks move today?". Must stay mounted while
 * the player plays so yesterday's last signature becomes today's baseline.
 */
export function useTwoTracksDaily(
  userId: string | null,
  gameRecord: TwoTracksGameActivitySource | null | undefined,
  lifeStepsToday: number | null,
): TwoTracksDailyBinding {
  const gameSig = gameActivitySignature(gameRecord);
  const [state, setState] = useState<{ owner: string; ledger: TwoTracksDailyLedger; today: TwoTracksToday } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const day = twoTracksDayKey();
    const { ledger, today } = advanceTwoTracksLedger(readLedger(userId), {
      day, gameSig, lifeStepsToday: lifeStepsToday ?? 0,
    });
    writeLedger(userId, ledger);
    setState({ owner: userId, ledger, today });
  }, [userId, gameSig, lifeStepsToday]);

  const markSparkSeen = useCallback(() => {
    if (!userId) return;
    const current = readLedger(userId);
    if (!current) return;
    const day = twoTracksDayKey();
    const next = markTwoTracksSparkSeen(current, day);
    writeLedger(userId, next);
    setState((prev) => (prev && prev.owner === userId
      ? { owner: userId, ledger: next, today: { ...prev.today, sparkPending: false } } : prev));
  }, [userId]);

  const dismissBalanceNudge = useCallback(() => {
    if (!userId) return;
    const current = readLedger(userId);
    if (!current) return;
    const next = dismissTwoTracksBalanceNudge(current, twoTracksDayKey());
    writeLedger(userId, next);
    setState((prev) => (prev && prev.owner === userId
      ? { owner: userId, ledger: next, today: { ...prev.today, balanceNudge: null } } : prev));
  }, [userId]);

  return useMemo(() => {
    const owned = state && state.owner === userId ? state : null;
    return {
      // Until today's habit logs have loaded, don't claim the life side is empty.
      today: owned && lifeStepsToday !== null ? owned.today : null,
      sparkXp: owned?.ledger.sparkXp ?? 0,
      markSparkSeen,
      dismissBalanceNudge,
    };
  }, [state, userId, lifeStepsToday, markSparkSeen, dismissBalanceNudge]);
}
