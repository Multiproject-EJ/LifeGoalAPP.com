export type LandmarkKeeperId = 'hatchery' | 'habit' | 'arena' | 'wisdom';
export type LandmarkWhisperStopId = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';

export interface LandmarkKeeperIdentity {
  characterName?: string;
  title?: string;
  roleLabel?: string;
  landmarkLabel?: string;
  icon?: string;
  toneHints?: readonly string[];
}

export interface LandmarkKeeperIslandIdentityOverride extends LandmarkKeeperIdentity {
  islandId: string;
  keeperRole: LandmarkKeeperId;
}

export interface LandmarkKeeperDefinition {
  id: LandmarkKeeperId;
  speakerName: string;
  purpose: string;
  landmarkLabel: string;
  landmarkIcon: string;
  identity?: LandmarkKeeperIdentity;
  fallbackLines: readonly string[];
}

export interface LandmarkWhisperPayload {
  id: string;
  keeperId: LandmarkKeeperId;
  speakerName: string;
  text: string;
  supportingLabel: 'Landmark Whisper';
  variant: 'landmark_whisper';
  landmarkLabel: string;
  landmarkIcon: string;
  characterName?: string;
  title?: string;
  roleLabel?: string;
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
    identity: {
      characterName: 'Ori of the Shells',
      roleLabel: 'Hatchery Keeper',
      landmarkLabel: 'Hatchery',
      icon: '🥚',
    },
    purpose: 'Comments on eggs, hatching, creature progress, egg status, and creature anticipation.',
    landmarkLabel: 'Hatchery',
    landmarkIcon: '🥚',
    fallbackLines: [
      'Warmth is doing its quiet work.',
      'Not every miracle hurries.',
      'The shell is still closed, but the story inside is moving.',
      'A small heartbeat is learning the dark.',
      'The nest remembers every gentle hour.',
      'Little claws, little dreams, still gathering strength.',
      'The egg is quiet because it is busy becoming.',
      'Keep the lantern low. This one likes patient light.',
    ],
  },
  habit: {
    id: 'habit',
    speakerName: 'The Habit Keeper',
    identity: {
      characterName: 'Mira of the Path',
      roleLabel: 'Habit Keeper',
      landmarkLabel: 'Habit Grove',
      icon: '🌿',
    },
    purpose: 'Cheers habit progress and gives non-shaming encouragement when the path needs warmth.',
    landmarkLabel: 'Habit Grove',
    landmarkIcon: '🌿',
    fallbackLines: [
      'That repeat is becoming a road.',
      'You did not just check a box. You strengthened the path.',
      'Small effort, honestly repeated, is how a life starts to turn.',
      'You showed up with enough. Enough can carry a day.',
      'The path notices steady feet, not perfect ones.',
      'One clear repeat is a real stone in the road.',
      'This is how change learns your name: one return at a time.',
      'A simple habit kept honestly has weight.',
      'You gave the day a handle. That matters.',
      'Quiet consistency is still consistency.',
    ],
  },
  arena: {
    id: 'arena',
    speakerName: 'The Arena Keeper',
    identity: {
      characterName: 'Brann of the Gate',
      roleLabel: 'Arena Keeper',
      landmarkLabel: 'Arena',
      icon: '🏟️',
    },
    purpose: 'Welcomes real resources earned beyond the run when they are brought into Island Run.',
    landmarkLabel: 'Arena',
    landmarkIcon: '🏟️',
    fallbackLines: [
      'What you earned beyond the island has crossed the gate: {resources}.',
      'The arena accepts real effort only. Yours has arrived: {resources}.',
      'I counted it at the gate. {resources} now belongs to the run.',
      'No hollow prizes pass this arch. This is yours: {resources}.',
      'The gate opens for earned things. Enter with {resources}.',
      'Your work came bearing proof: {resources}.',
      'Stand tall. What you earned has arrived: {resources}.',
      'The island ledger is clear. Earned and delivered: {resources}.',
    ],
  },
  wisdom: {
    id: 'wisdom',
    speakerName: 'The Wisdom Keeper',
    identity: {
      characterName: 'Elow of the Lantern',
      roleLabel: 'Wisdom Keeper',
      landmarkLabel: 'Wisdom Landmark',
      icon: '🕯️',
    },
    purpose: 'Offers short, grounded reflections using safe static wisdom for the MVP.',
    landmarkLabel: 'Wisdom Landmark',
    landmarkIcon: '🕯️',
    fallbackLines: [
      'A priority is not always the loudest thing. Sometimes it is the quiet thing asking to be chosen.',
      'Balance is not equal effort everywhere. It is noticing where the cost is becoming too high.',
      'Your habits are small doors. Your goals enter through them.',
      'Attention is a lantern. Aim it where you want roots to grow.',
      'A goal can guide without shouting. Let it point, then take one true step.',
      'When everything asks for more, choose what protects the life you are building.',
      'Tradeoffs are not failures. They are the shape of choosing.',
      'The wheel does not need equal spokes today. It needs one honest adjustment.',
      'Effort has a direction. Pause long enough to name it.',
      'When one part of life keeps whispering, give it a kind moment of attention.',
      'A smaller promise kept can steady a larger dream.',
      'Some days wisdom is not adding more. It is making room for what matters.',
      'Choose the next step by the life it serves, not the noise around it.',
      'The right pace still asks for movement. The right rest still protects the journey.',
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

export function getLandmarkKeeperFallbackRoleLabel(keeper: Pick<LandmarkKeeperDefinition, 'speakerName'>): string {
  return keeper.speakerName.replace(/^The /, '');
}

export function resolveLandmarkKeeperIdentity(
  keeperId: LandmarkKeeperId,
  options: { islandId?: string; overrides?: readonly LandmarkKeeperIslandIdentityOverride[] } = {},
): LandmarkKeeperIdentity {
  const keeper = LANDMARK_KEEPERS[keeperId];
  const override = options.overrides?.find((item) => item.keeperRole === keeperId && item.islandId === options.islandId);
  return {
    roleLabel: keeper.identity?.roleLabel ?? getLandmarkKeeperFallbackRoleLabel(keeper),
    landmarkLabel: keeper.identity?.landmarkLabel ?? keeper.landmarkLabel,
    icon: keeper.identity?.icon ?? keeper.landmarkIcon,
    ...keeper.identity,
    ...override,
  };
}

function buildPayload(keeperId: LandmarkKeeperId, text: string, reason: string): LandmarkWhisperPayload {
  const keeper = LANDMARK_KEEPERS[keeperId];
  const identity = resolveLandmarkKeeperIdentity(keeperId);
  return {
    id: `landmark-whisper:${keeperId}:${reason}`,
    keeperId,
    speakerName: identity.characterName ?? keeper.speakerName,
    text,
    supportingLabel: 'Landmark Whisper',
    variant: 'landmark_whisper',
    landmarkLabel: identity.landmarkLabel ?? keeper.landmarkLabel,
    landmarkIcon: identity.icon ?? keeper.landmarkIcon,
    characterName: identity.characterName,
    title: identity.title,
    roleLabel: identity.roleLabel ?? getLandmarkKeeperFallbackRoleLabel(keeper),
    durationMs: LANDMARK_WHISPER_DURATION_MS,
  };
}

export function buildHatcheryWhisper(context: HatcheryWhisperContext, seed = ''): LandmarkWhisperPayload {
  const lines = context.isEggReady
    ? [
      'The shell is thin now. Something brave is pressing toward the light.',
      'Listen close. This one is almost ready to meet you.',
      'A little life has learned the shape of the world from inside the shell.',
      'The nest is holding its breath. The moment is close.',
      'Tiny feet are testing the edge of the shell.',
      'This egg is ready. Keep your hands gentle and your eyes open.',
      'The last quiet before hatching is the deepest quiet.',
      'Something bright is tapping from the inside.',
    ]
    : context.hasActiveEgg
      ? LANDMARK_KEEPERS.hatchery.fallbackLines
      : [
        'The nests are quiet today. Quiet is allowed.',
        'Bring an egg when you are ready. I will keep the warmth waiting.',
        'An empty cradle is still a promise of care.',
        'No shell rests here yet, but the lanterns are trimmed.',
        'The hatchery waits softly. Little life should never be rushed.',
      ];
  return buildPayload('hatchery', chooseLine(lines, seed), context.isEggReady ? 'egg-ready' : context.hasActiveEgg ? 'egg-warming' : 'no-egg');
}

export function buildHabitWhisper(context: HabitWhisperContext, seed = ''): LandmarkWhisperPayload {
  const lines = context.hasTodayProgress
    ? LANDMARK_KEEPERS.habit.fallbackLines
    : [
      'One missed step does not own the road.',
      'Come back gently. The path does not punish returners.',
      'Do the next honest thing, not the perfect thing.',
      'A restart is still a step with your name on it.',
      'The road is patient when you return with care.',
      'Begin small enough that beginning is possible.',
      'You do not need to recover the whole week. Just meet this moment.',
      'No drama needed. Place one foot where it can truly land.',
      'The path is still here. Take the part you can take.',
      'Honest effort fits in imperfect days.',
    ];
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
  const resourceSummary = parts.join(', ');
  const text = parts.length > 0
    ? chooseLine(LANDMARK_KEEPERS.arena.fallbackLines, seed).replace('{resources}', resourceSummary)
    : chooseLine(LANDMARK_KEEPERS.arena.fallbackLines, seed).replace('{resources}', 'earned rewards');
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
