export interface ResolveIslandTimerHydrationResult {
  islandStartedAtMs: number;
  islandExpiresAtMs: number;
  timeLeftSec: number;
  isIslandTimerPendingStart: boolean;
  shouldAutoAdvanceOnHydration: boolean;
}

export function resolveIslandTimerHydrationState(options: {
  islandRunContractV2Enabled: boolean;
  persistedStartedAtMs: number;
  persistedExpiresAtMs: number;
  nowMs: number;
  defaultDurationMs: number;
}): ResolveIslandTimerHydrationResult {
  const startedAtMs = Number.isFinite(options.persistedStartedAtMs) ? options.persistedStartedAtMs : 0;
  const expiresAtMs = Number.isFinite(options.persistedExpiresAtMs) ? options.persistedExpiresAtMs : 0;
  const hasPersistedTimer = startedAtMs > 0 || expiresAtMs > 0;

  if (options.islandRunContractV2Enabled) {
    if (!hasPersistedTimer) {
      const nextExpiresAtMs = options.nowMs + Math.max(0, options.defaultDurationMs);
      return {
        islandStartedAtMs: options.nowMs,
        islandExpiresAtMs: nextExpiresAtMs,
        timeLeftSec: Math.max(0, Math.ceil((nextExpiresAtMs - options.nowMs) / 1000)),
        isIslandTimerPendingStart: false,
        shouldAutoAdvanceOnHydration: false,
      };
    }

    return {
      islandStartedAtMs: startedAtMs,
      islandExpiresAtMs: expiresAtMs,
      timeLeftSec: Math.max(0, Math.ceil((expiresAtMs - options.nowMs) / 1000)),
      isIslandTimerPendingStart: false,
      shouldAutoAdvanceOnHydration: false,
    };
  }

  if (expiresAtMs > 0 && expiresAtMs > options.nowMs) {
    return {
      islandStartedAtMs: startedAtMs,
      islandExpiresAtMs: expiresAtMs,
      timeLeftSec: Math.max(0, Math.ceil((expiresAtMs - options.nowMs) / 1000)),
      isIslandTimerPendingStart: false,
      shouldAutoAdvanceOnHydration: false,
    };
  }

  if (expiresAtMs > 0) {
    return {
      islandStartedAtMs: startedAtMs,
      islandExpiresAtMs: expiresAtMs,
      timeLeftSec: 0,
      isIslandTimerPendingStart: false,
      shouldAutoAdvanceOnHydration: true,
    };
  }

  if (startedAtMs <= 0 && expiresAtMs <= 0) {
    return {
      islandStartedAtMs: 0,
      islandExpiresAtMs: 0,
      timeLeftSec: 0,
      isIslandTimerPendingStart: true,
      shouldAutoAdvanceOnHydration: false,
    };
  }

  const fallbackExpiresAtMs = options.nowMs + Math.max(0, options.defaultDurationMs);
  return {
    islandStartedAtMs: options.nowMs,
    islandExpiresAtMs: fallbackExpiresAtMs,
    timeLeftSec: Math.max(0, Math.ceil((fallbackExpiresAtMs - options.nowMs) / 1000)),
    isIslandTimerPendingStart: false,
    shouldAutoAdvanceOnHydration: false,
  };
}

export function shouldAutoAdvanceIslandOnTimerExpiry(options: {
  islandRunContractV2Enabled: boolean;
  isIslandTimerPendingStart: boolean;
  timeLeftSec: number;
  showTravelOverlay: boolean;
}): boolean {
  if (options.islandRunContractV2Enabled) return false;
  if (options.isIslandTimerPendingStart) return false;
  if (options.timeLeftSec > 0) return false;
  if (options.showTravelOverlay) return false;
  return true;
}
