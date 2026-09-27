/**
 * Player activity heartbeat — counts play (sessions, visible minutes, rolls,
 * builds, islands completed) per local day and flushes small deltas to the
 * clamped `record_player_activity` RPC. Counts only; no content. Gameplay is
 * observed read-only from the canonical Island Run record.
 */

export type PlayerActivitySnapshot = {
  currentIslandNumber: number;
  cycleIndex: number;
  tokenIndex: number;
  essenceLifetimeSpent: number;
};

export type PlayerActivityDelta = {
  day: string;
  island: number;
  cycle: number;
  sessions: number;
  activeSeconds: number;
  rolls: number;
  builds: number;
  islandsCompleted: number;
};

/** A gap longer than this while hidden starts a new session. */
export const PLAYER_SESSION_GAP_MS = 30 * 60 * 1000;
/** One tick never credits more than this, so a sleeping device can't add hours. */
export const PLAYER_ACTIVITY_MAX_TICK_MS = 30 * 1000;

export type PlayerActivityTracker = {
  observe: (snapshot: PlayerActivitySnapshot | null | undefined) => void;
  /** Credit visible time since the last tick. */
  tick: (nowMs: number, visible: boolean) => void;
  /** Call when the app becomes visible; starts a session after a long gap. */
  resume: (nowMs: number) => void;
  hide: (nowMs: number) => void;
  /** Take the pending deltas (null when there is nothing to send). */
  drain: (day: string) => PlayerActivityDelta | null;
};

export function createPlayerActivityTracker(startMs: number): PlayerActivityTracker {
  let previous: PlayerActivitySnapshot | null = null;
  let lastTickMs = startMs;
  let hiddenAtMs: number | null = null;
  let sessions = 1;
  let activeMs = 0;
  let rolls = 0;
  let builds = 0;
  let islandsCompleted = 0;

  const valid = (s: PlayerActivitySnapshot) =>
    [s.currentIslandNumber, s.cycleIndex, s.tokenIndex, s.essenceLifetimeSpent].every((n) => Number.isFinite(n));

  return {
    observe(snapshot) {
      if (!snapshot || !valid(snapshot)) return;
      if (previous) {
        const sameIsland = snapshot.currentIslandNumber === previous.currentIslandNumber
          && snapshot.cycleIndex === previous.cycleIndex;
        if (snapshot.cycleIndex > previous.cycleIndex) {
          islandsCompleted += 1;
        } else if (snapshot.cycleIndex === previous.cycleIndex && snapshot.currentIslandNumber > previous.currentIslandNumber) {
          islandsCompleted += Math.min(3, snapshot.currentIslandNumber - previous.currentIslandNumber);
        }
        if (sameIsland && snapshot.tokenIndex !== previous.tokenIndex) rolls += 1;
        if (snapshot.essenceLifetimeSpent > previous.essenceLifetimeSpent) builds += 1;
      }
      previous = { ...snapshot };
    },
    tick(nowMs, visible) {
      const elapsed = Math.max(0, nowMs - lastTickMs);
      if (visible) activeMs += Math.min(elapsed, PLAYER_ACTIVITY_MAX_TICK_MS);
      lastTickMs = nowMs;
    },
    resume(nowMs) {
      if (hiddenAtMs !== null && nowMs - hiddenAtMs >= PLAYER_SESSION_GAP_MS) sessions += 1;
      hiddenAtMs = null;
      lastTickMs = nowMs;
    },
    hide(nowMs) {
      hiddenAtMs = nowMs;
    },
    drain(day) {
      const activeSeconds = Math.floor(activeMs / 1000);
      if (!previous || (sessions === 0 && activeSeconds === 0 && rolls === 0 && builds === 0 && islandsCompleted === 0)) {
        return null;
      }
      const delta: PlayerActivityDelta = {
        day,
        island: previous.currentIslandNumber,
        cycle: previous.cycleIndex,
        sessions,
        activeSeconds,
        rolls,
        builds,
        islandsCompleted,
      };
      sessions = 0;
      activeMs -= activeSeconds * 1000;
      rolls = 0;
      builds = 0;
      islandsCompleted = 0;
      return delta;
    },
  };
}

/** 'missing' means the RPC isn't deployed yet (migration not applied): stop trying this session. */
export type PlayerActivitySendResult = 'ok' | 'failed' | 'missing';

export async function sendPlayerActivity(delta: PlayerActivityDelta): Promise<PlayerActivitySendResult> {
  try {
    const { getSupabaseClient } = await import('../lib/supabaseClient');
    // The RPC ships with this feature; generated types pick it up on the next codegen.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = getSupabaseClient() as any;
    const { error } = await client.rpc('record_player_activity', {
      p_day: delta.day,
      p_island: delta.island,
      p_cycle: delta.cycle,
      p_sessions: delta.sessions,
      p_active_seconds: delta.activeSeconds,
      p_rolls: delta.rolls,
      p_builds: delta.builds,
      p_islands_completed: delta.islandsCompleted,
    });
    if (!error) return 'ok';
    const code = String((error as { code?: string }).code ?? '');
    return code === 'PGRST202' || code === '42883' ? 'missing' : 'failed';
  } catch {
    return 'failed';
  }
}
