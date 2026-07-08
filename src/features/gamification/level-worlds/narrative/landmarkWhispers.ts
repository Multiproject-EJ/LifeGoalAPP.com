export type LandmarkKeeperId = 'hatchery' | 'habit' | 'arena' | 'wisdom';
export type LandmarkWhisperStopId = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';

export interface LandmarkKeeperDefinition {
  id: LandmarkKeeperId;
  speakerName: string;
  purpose: string;
  fallbackLines: readonly string[];
}

export interface LandmarkWhisperPayload {
  id: string;
  keeperId: LandmarkKeeperId;
  speakerName: string;
  text: string;
  supportingLabel: 'Landmark Whisper';
  durationMs: number;
}

export interface HatcheryWhisperContext {
  hasActiveEgg: boolean;
  isEggReady: boolean;
}

export interface HabitWhisperContext {
  hasTodayProgress: boolean;
}

export interface ArenaTransferContext {
  dice?: number;
  essence?: number;
  tickets?: number;
  creatureTreats?: number;
  rewards?: number;
}

export interface ArenaTransferWhisperBundle extends ArenaTransferContext {
  id: string;
  source: 'daily_treats' | 'reward_claim' | 'inventory_sync' | 'manual_seam';
  createdAtMs: number;
}

export const LANDMARK_WHISPER_DURATION_MS = 7200;

export const LANDMARK_KEEPERS: Record<LandmarkKeeperId, LandmarkKeeperDefinition> = {
  hatchery: {
    id: 'hatchery',
    speakerName: 'The Hatchery Keeper',
    purpose: 'Comments on eggs, hatching, creature progress, egg status, and creature anticipation.',
    fallbackLines: [
      'This egg is listening before it cracks.',
      'Something inside is almost ready.',
      'A quiet shell can still hold a loud little life.',
      'No rush. Some creatures need a little more warmth.',
    ],
  },
  habit: {
    id: 'habit',
    speakerName: 'The Habit Keeper',
    purpose: 'Cheers habit progress and gives non-shaming encouragement when the path needs warmth.',
    fallbackLines: [
      'That streak is becoming a path.',
      'You showed up. That matters more than perfect.',
      'One missed step does not erase the road.',
      'Small repeats become real strength.',
      'Today does not need to be dramatic. Just honest.',
    ],
  },
  arena: {
    id: 'arena',
    speakerName: 'The Arena Keeper',
    purpose: 'Welcomes real resources earned beyond the run when they are brought into Island Run.',
    fallbackLines: [
      'Good work outside the island. I have brought your rewards in.',
      'The arena received what you earned beyond the run.',
      'Progress made elsewhere still counts here.',
    ],
  },
  wisdom: {
    id: 'wisdom',
    speakerName: 'The Wisdom Keeper',
    purpose: 'Offers short, grounded reflections using safe static wisdom for the MVP.',
    fallbackLines: [
      'Your goals are not separate islands. What you strengthen in one place changes the weather elsewhere.',
      'Do not only ask what is urgent. Ask what keeps becoming important.',
      'A priority is not proven by how loudly it calls, but by what you keep returning to.',
      'Balance is not doing everything equally. It is noticing what is starting to cost too much.',
    ],
  },
};

function chooseLine(lines: readonly string[], seed: string): string {
  const source = seed || 'landmark-whisper';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return lines[hash % lines.length] ?? lines[0] ?? '';
}

function buildPayload(keeperId: LandmarkKeeperId, text: string, reason: string): LandmarkWhisperPayload {
  const keeper = LANDMARK_KEEPERS[keeperId];
  return {
    id: `landmark-whisper:${keeperId}:${reason}`,
    keeperId,
    speakerName: keeper.speakerName,
    text,
    supportingLabel: 'Landmark Whisper',
    durationMs: LANDMARK_WHISPER_DURATION_MS,
  };
}

export function buildHatcheryWhisper(context: HatcheryWhisperContext, seed = ''): LandmarkWhisperPayload {
  const lines = context.isEggReady
    ? ['Something inside is ready to meet the island.', 'The shell is quiet, but the moment is close.']
    : context.hasActiveEgg
      ? LANDMARK_KEEPERS.hatchery.fallbackLines
      : ['No rush. Some creatures need a little more warmth.', 'The cradle is ready when a new little life arrives.'];
  return buildPayload('hatchery', chooseLine(lines, seed), context.isEggReady ? 'egg-ready' : context.hasActiveEgg ? 'egg-warming' : 'no-egg');
}

export function buildHabitWhisper(context: HabitWhisperContext, seed = ''): LandmarkWhisperPayload {
  const lines = context.hasTodayProgress
    ? ['That streak is becoming a path.', 'You showed up. That matters more than perfect.', 'Small repeats become real strength.']
    : ['One missed step does not erase the road.', 'Today does not need to be dramatic. Just honest.', 'A gentle restart still counts as care.'];
  return buildPayload('habit', chooseLine(lines, seed), context.hasTodayProgress ? 'progress' : 'encouragement');
}

export function buildWisdomWhisper(seed = ''): LandmarkWhisperPayload {
  return buildPayload('wisdom', chooseLine(LANDMARK_KEEPERS.wisdom.fallbackLines, seed), 'static-reflection');
}

export function buildArenaTransferWhisper(context: ArenaTransferContext, seed = ''): LandmarkWhisperPayload | null {
  const dice = Math.max(0, Math.floor(context.dice ?? 0));
  const essence = Math.max(0, Math.floor(context.essence ?? 0));
  const tickets = Math.max(0, Math.floor(context.tickets ?? 0));
  const creatureTreats = Math.max(0, Math.floor(context.creatureTreats ?? 0));
  const rewards = Math.max(0, Math.floor(context.rewards ?? 0));
  if (dice + essence + tickets + creatureTreats + rewards <= 0) return null;
  const parts = [
    dice > 0 ? `+${dice} dice` : null,
    essence > 0 ? `+${essence} essence` : null,
    tickets > 0 ? `+${tickets} tickets` : null,
    creatureTreats > 0 ? `+${creatureTreats} creature ${creatureTreats === 1 ? 'treat' : 'treats'}` : null,
    rewards > 0 ? `+${rewards} rewards` : null,
  ].filter(Boolean);
  const text = parts.length > 0
    ? `Your outside effort crossed the bridge: ${parts.join(', ')}.`
    : chooseLine(LANDMARK_KEEPERS.arena.fallbackLines, seed);
  return buildPayload('arena', text, 'real-transfer');
}

export function buildLandmarkWhisperForStop(
  stopId: LandmarkWhisperStopId | null,
  context: { hatchery: HatcheryWhisperContext; habit: HabitWhisperContext; seed?: string },
): LandmarkWhisperPayload | null {
  if (stopId === 'hatchery') return buildHatcheryWhisper(context.hatchery, context.seed ?? stopId);
  if (stopId === 'habit') return buildHabitWhisper(context.habit, context.seed ?? stopId);
  if (stopId === 'wisdom') return buildWisdomWhisper(context.seed ?? stopId);
  return null;
}

export function buildArenaTransferWhisperFromRewardBundle(
  bundle: Partial<ArenaTransferWhisperBundle> | null | undefined,
  seed = '',
): LandmarkWhisperPayload | null {
  if (!bundle) return null;
  return buildArenaTransferWhisper(
    {
      dice: bundle.dice,
      essence: bundle.essence,
      tickets: bundle.tickets,
      creatureTreats: bundle.creatureTreats,
      rewards: bundle.rewards,
    },
    seed || bundle.id,
  );
}

const ARENA_TRANSFER_WHISPER_STORAGE_PREFIX = 'lifegoal:island-run:arena-transfer-whisper:';

function getArenaTransferWhisperStorageKey(userId: string): string {
  return `${ARENA_TRANSFER_WHISPER_STORAGE_PREFIX}${userId}`;
}

export function queueArenaTransferWhisperBundle(userId: string, bundle: Omit<ArenaTransferWhisperBundle, 'id' | 'createdAtMs'> & { id?: string; createdAtMs?: number }): void {
  if (typeof window === 'undefined' || !userId) return;
  const normalized: ArenaTransferWhisperBundle = {
    ...bundle,
    id: bundle.id ?? `${bundle.source}:${Date.now()}`,
    createdAtMs: bundle.createdAtMs ?? Date.now(),
  };
  if (!buildArenaTransferWhisperFromRewardBundle(normalized)) return;
  try {
    window.localStorage.setItem(getArenaTransferWhisperStorageKey(userId), JSON.stringify(normalized));
  } catch {
    // Presentation-only cue; ignore storage failures.
  }
}

export function consumeArenaTransferWhisperBundle(userId: string): ArenaTransferWhisperBundle | null {
  if (typeof window === 'undefined' || !userId) return null;
  const key = getArenaTransferWhisperStorageKey(userId);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    window.localStorage.removeItem(key);
    const parsed = JSON.parse(raw) as Partial<ArenaTransferWhisperBundle>;
    if (!buildArenaTransferWhisperFromRewardBundle(parsed)) return null;
    return parsed as ArenaTransferWhisperBundle;
  } catch {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
    return null;
  }
}
