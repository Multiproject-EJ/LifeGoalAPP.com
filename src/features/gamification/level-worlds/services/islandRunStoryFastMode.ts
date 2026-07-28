import type { IslandRunGameStateRecord } from './islandRunGameStateStore';

export const STORY_FAST_MODE_TECHNOLOGY_ID = 'story-fast-mode' as const;
export const STORY_FAST_MODE_DICE_THRESHOLD = 2_000;
export const STORY_FAST_MODE_MOVEMENT_SPEED_FACTOR = 1.55;
export const STORY_FAST_MODE_AUTO_ROLL_INTERVAL_MS = 1_300;
export const STORY_STANDARD_AUTO_ROLL_INTERVAL_MS = 2_300;

export type StoryFastModeSource = 'not-story' | 'locked' | 'pro' | 'earned';

export type StoryFastModeState = {
  active: boolean;
  permanentlyUnlocked: boolean;
  shouldPersistUnlock: boolean;
  source: StoryFastModeSource;
  diceRemaining: number;
  movementSpeedFactor: number;
  autoRollIntervalMs: number;
};

export function resolveStoryFastModeState(input: {
  isStoryJourney: boolean;
  isPro: boolean;
  dicePool: number;
  record: Pick<IslandRunGameStateRecord, 'technologyUnlocksById'>;
}): StoryFastModeState {
  const safeDicePool = Math.max(0, Math.floor(input.dicePool));
  const permanentlyUnlocked = Boolean(
    input.record.technologyUnlocksById?.[STORY_FAST_MODE_TECHNOLOGY_ID]?.active,
  );
  const reachedDiceThreshold = safeDicePool >= STORY_FAST_MODE_DICE_THRESHOLD;
  const shouldPersistUnlock = input.isStoryJourney
    && !input.isPro
    && !permanentlyUnlocked
    && reachedDiceThreshold;

  let source: StoryFastModeSource = 'locked';
  if (!input.isStoryJourney) source = 'not-story';
  else if (input.isPro) source = 'pro';
  else if (permanentlyUnlocked || reachedDiceThreshold) source = 'earned';

  const active = input.isStoryJourney && source !== 'locked';
  return {
    active,
    permanentlyUnlocked,
    shouldPersistUnlock,
    source,
    diceRemaining: Math.max(0, STORY_FAST_MODE_DICE_THRESHOLD - safeDicePool),
    movementSpeedFactor: active ? STORY_FAST_MODE_MOVEMENT_SPEED_FACTOR : 1,
    autoRollIntervalMs: active
      ? STORY_FAST_MODE_AUTO_ROLL_INTERVAL_MS
      : STORY_STANDARD_AUTO_ROLL_INTERVAL_MS,
  };
}
