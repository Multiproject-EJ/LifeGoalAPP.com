import type {
  IslandNarrativeBeat,
  IslandNarrativeBeatDraft,
  IslandNarrativeDefinition,
  IslandNarrativeTrack,
} from './islandNarrativeTypes';

export type IslandNarrativePlaybackContext = 'game_loop' | 'story_mode';

export const ISLAND_NARRATIVE_TRACK_COPY: Readonly<Record<IslandNarrativeTrack, {
  playerFacingName: string;
  accessLabel: string;
  purpose: string;
}>> = {
  island_mission: {
    playerFacingName: 'Island Mission',
    accessLabel: 'Included',
    purpose: 'Explains mechanics, the main mission, immediate commands, and brief story moments inside the free game loop.',
  },
  full_story: {
    playerFacingName: 'Full Story Mode',
    accessLabel: 'Pro',
    purpose: 'Provides the complete long-form island story, deeper character scenes, mysteries, and optional choices.',
  },
};

/**
 * Stamps one explicit track onto an authored group. Definitions may combine
 * multiple groups, but every runtime beat always carries its own track.
 */
export function defineNarrativeTrack(
  track: IslandNarrativeTrack,
  beats: readonly IslandNarrativeBeatDraft[],
): IslandNarrativeBeat[] {
  return beats.map((beat) => ({ ...beat, track }));
}

/**
 * The game loop always receives the included Island Mission track. Full Story
 * Mode is a separate Pro surface; it is never injected into ordinary rolls,
 * landmarks, rewards, or island-clear progression.
 */
export function canPlayNarrativeTrack(input: {
  track: IslandNarrativeTrack;
  context: IslandNarrativePlaybackContext;
  isPro: boolean;
}): boolean {
  if (input.context === 'game_loop') return input.track === 'island_mission';
  return input.isPro && input.track === 'full_story';
}

export function listNarrativeBeatsForPlayback(
  definition: IslandNarrativeDefinition,
  input: { context: IslandNarrativePlaybackContext; isPro: boolean },
): IslandNarrativeBeat[] {
  return definition.beats.filter((beat) => canPlayNarrativeTrack({
    track: beat.track,
    context: input.context,
    isPro: input.isPro,
  }));
}

export function getNarrativeBeatForPlayback(
  definition: IslandNarrativeDefinition | null | undefined,
  beatId: string,
  input: { context: IslandNarrativePlaybackContext; isPro: boolean },
): IslandNarrativeBeat | null {
  if (!definition) return null;
  const beat = definition.beats.find((entry) => entry.id === beatId) ?? null;
  if (!beat) return null;
  return canPlayNarrativeTrack({ track: beat.track, ...input }) ? beat : null;
}
