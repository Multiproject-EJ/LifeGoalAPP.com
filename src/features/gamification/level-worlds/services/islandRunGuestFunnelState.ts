export const ISLAND_RUN_GUEST_FUNNEL_STATE_VERSION = 1;
export const ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY = 'islandRunGuestFunnelState.v1';

export type IslandRunGuestFunnelEntrySource = 'unknown' | 'landing_cta' | 'debug' | 'direct_island_run';
export type IslandRunGuestFunnelClaimStatus = 'guest' | 'claim_pending' | 'claimed' | 'claim_error';

export interface IslandRunGuestFunnelStateV1 {
  version: 1;
  guestId: string;
  createdAtMs: number;
  updatedAtMs: number;
  entrySource: IslandRunGuestFunnelEntrySource;
  displayName?: string;
  shipName?: string;
  shipStyleId?: string;
  hasSeenGuestTimeline: boolean;
  hasSeenSoftSavePromptAfterArena: boolean;
  hasSeenStrongSavePromptBeforeTravel: boolean;
  savePromptDismissals: number;
  claimStatus: IslandRunGuestFunnelClaimStatus;
  claimedUserId?: string;
}

export type IslandRunGuestFunnelStatePatch = Partial<
  Omit<IslandRunGuestFunnelStateV1, 'version' | 'guestId' | 'createdAtMs' | 'updatedAtMs'>
>;

const GAMEPLAY_FIELD_KEYS = new Set([
  'dice',
  'essence',
  'stopProgress',
  'buildProgress',
  'creatures',
  'creatureCollection',
  'eventTickets',
  'travelState',
  'currentIslandNumber',
  'runtimeState',
  'wallet',
  'position',
]);

function getBrowserLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage ?? null;
  } catch {
    return null;
  }
}

function nowMs(): number {
  return Date.now();
}

function createGuestId(): string {
  try {
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID === 'function') return `guest_${randomUUID.call(globalThis.crypto)}`;
  } catch {
    // Fall through to deterministic-safe random fallback for old browsers/tests.
  }
  return `guest_${Math.random().toString(36).slice(2)}_${nowMs().toString(36)}`;
}

function sanitizePatch(patch: IslandRunGuestFunnelStatePatch): IslandRunGuestFunnelStatePatch {
  return Object.fromEntries(Object.entries(patch).filter(([key]) => !GAMEPLAY_FIELD_KEYS.has(key))) as IslandRunGuestFunnelStatePatch;
}

export function createIslandRunGuestFunnelState(options: {
  entrySource?: IslandRunGuestFunnelEntrySource;
  now?: number;
  guestId?: string;
} = {}): IslandRunGuestFunnelStateV1 {
  const createdAtMs = options.now ?? nowMs();
  return {
    version: ISLAND_RUN_GUEST_FUNNEL_STATE_VERSION,
    guestId: options.guestId ?? createGuestId(),
    createdAtMs,
    updatedAtMs: createdAtMs,
    entrySource: options.entrySource ?? 'unknown',
    hasSeenGuestTimeline: false,
    hasSeenSoftSavePromptAfterArena: false,
    hasSeenStrongSavePromptBeforeTravel: false,
    savePromptDismissals: 0,
    claimStatus: 'guest',
  };
}

export function isIslandRunGuestFunnelStateV1(value: unknown): value is IslandRunGuestFunnelStateV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === 1
    && typeof candidate.guestId === 'string'
    && typeof candidate.createdAtMs === 'number'
    && typeof candidate.updatedAtMs === 'number'
    && typeof candidate.entrySource === 'string'
    && typeof candidate.hasSeenGuestTimeline === 'boolean'
    && typeof candidate.hasSeenSoftSavePromptAfterArena === 'boolean'
    && typeof candidate.hasSeenStrongSavePromptBeforeTravel === 'boolean'
    && typeof candidate.savePromptDismissals === 'number'
    && typeof candidate.claimStatus === 'string';
}

export function readIslandRunGuestFunnelState(options: {
  storage?: Storage | null;
  entrySource?: IslandRunGuestFunnelEntrySource;
  now?: number;
} = {}): IslandRunGuestFunnelStateV1 {
  const storage = options.storage === undefined ? getBrowserLocalStorage() : options.storage;
  if (!storage) return createIslandRunGuestFunnelState({ entrySource: options.entrySource, now: options.now });

  try {
    const raw = storage.getItem(ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isIslandRunGuestFunnelStateV1(parsed)) return parsed;
    }
  } catch {
    // Corrupted JSON/storage access recovers to a fresh UI-only funnel record.
  }

  const fresh = createIslandRunGuestFunnelState({ entrySource: options.entrySource, now: options.now });
  writeIslandRunGuestFunnelState(fresh, { storage });
  return fresh;
}

export function writeIslandRunGuestFunnelState(
  state: IslandRunGuestFunnelStateV1,
  options: { storage?: Storage | null } = {},
): IslandRunGuestFunnelStateV1 {
  const storage = options.storage === undefined ? getBrowserLocalStorage() : options.storage;
  if (!storage) return state;
  const sanitized: IslandRunGuestFunnelStateV1 = { ...state, version: 1 };
  try {
    storage.setItem(ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Best-effort UI persistence only; never block Island Run execution.
  }
  return sanitized;
}

export function patchIslandRunGuestFunnelState(
  patch: IslandRunGuestFunnelStatePatch,
  options: { storage?: Storage | null; now?: number; entrySource?: IslandRunGuestFunnelEntrySource } = {},
): IslandRunGuestFunnelStateV1 {
  const current = readIslandRunGuestFunnelState(options);
  const next: IslandRunGuestFunnelStateV1 = {
    ...current,
    ...sanitizePatch(patch),
    updatedAtMs: options.now ?? nowMs(),
  };
  return writeIslandRunGuestFunnelState(next, options);
}

export function markIslandRunGuestSavePromptDismissed(options: {
  prompt: 'soft_after_arena' | 'strong_before_travel';
  storage?: Storage | null;
  now?: number;
}): IslandRunGuestFunnelStateV1 {
  const current = readIslandRunGuestFunnelState(options);
  return patchIslandRunGuestFunnelState({
    hasSeenSoftSavePromptAfterArena: options.prompt === 'soft_after_arena' ? true : current.hasSeenSoftSavePromptAfterArena,
    hasSeenStrongSavePromptBeforeTravel: options.prompt === 'strong_before_travel' ? true : current.hasSeenStrongSavePromptBeforeTravel,
    savePromptDismissals: current.savePromptDismissals + 1,
  }, options);
}

export function __resetIslandRunGuestFunnelStateForTests(options: { storage?: Storage | null } = {}): void {
  const storage = options.storage === undefined ? getBrowserLocalStorage() : options.storage;
  try {
    storage?.removeItem(ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY);
  } catch {
    // Test/debug helper only.
  }
}
