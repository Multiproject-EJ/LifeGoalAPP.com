export type IslandNarrativePriority = 'major' | 'short' | 'ambient';
export type IslandNarrativeRepeatPolicy = 'once' | 'repeatable';
export type IslandNarrativeSurface = 'story_reader' | 'dialogue_sheet' | 'toast' | 'expedition_phone';
export type IslandNarrativeStopId = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
/**
 * `island_mission` is the free narrative wrapper around canonical gameplay.
 * `full_story` is optional Pro Story Mode content and never drives progression.
 */
export type IslandNarrativeTrack = 'island_mission' | 'full_story';

export type IslandNarrativeTrigger =
  | { kind: 'island_entered'; islandNumber: number }
  | { kind: 'arrival_closed'; islandNumber: number }
  | { kind: 'stop_opened'; islandNumber: number; stopId: IslandNarrativeStopId }
  | { kind: 'stop_completed'; islandNumber: number; stopId: IslandNarrativeStopId }
  | { kind: 'landmark_level_completed'; islandNumber: number; stopId: IslandNarrativeStopId; level: 1 | 2 | 3 }
  | { kind: 'landmarks_restored_majority'; islandNumber: number; threshold: number }
  | { kind: 'boss_challenge_started'; islandNumber: number }
  | { kind: 'boss_midpoint'; islandNumber: number }
  | { kind: 'technology_fragment_collected'; islandNumber: number; technologyId: string; collectedCount: number }
  | { kind: 'boss_eligible'; islandNumber: number }
  | { kind: 'boss_resolved'; islandNumber: number }
  | { kind: 'island_clear_travel_ready'; islandNumber: number };

export interface IslandNarrativeCharacter {
  id: string;
  displayName: string;
  role?: string;
  portraitSrc?: string;
}

export interface IslandNarrativeBeat {
  id: string;
  track: IslandNarrativeTrack;
  trigger: IslandNarrativeTrigger;
  speakerId?: string;
  text?: string;
  secondaryText?: string;
  /** Display-only mission heading used by command-device surfaces. */
  headline?: string;
  /** Display-only objective copy; never interpreted as gameplay authority. */
  objectiveText?: string;
  priority: IslandNarrativePriority;
  repeatPolicy: IslandNarrativeRepeatPolicy;
  surface: IslandNarrativeSurface;
  episodePath?: string;
  displayCtaText?: string;
}

/** Authoring shape before a definition-level track helper stamps the track. */
export type IslandNarrativeBeatDraft = Omit<IslandNarrativeBeat, 'track'>;

export interface IslandNarrativeDefinition {
  version: 1;
  islandNumber: number;
  islandName: string;
  civilizationName: string;
  characters: IslandNarrativeCharacter[];
  beats: IslandNarrativeBeat[];
}
