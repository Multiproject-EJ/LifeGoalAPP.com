export type IslandNarrativePriority = 'major' | 'short' | 'ambient';
export type IslandNarrativeRepeatPolicy = 'once' | 'repeatable';
export type IslandNarrativeSurface = 'story_reader' | 'dialogue_sheet' | 'toast';
export type IslandNarrativeStopId = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';

export type IslandNarrativeTrigger =
  | { kind: 'island_entered'; islandNumber: number }
  | { kind: 'arrival_closed'; islandNumber: number }
  | { kind: 'stop_opened'; islandNumber: number; stopId: IslandNarrativeStopId }
  | { kind: 'stop_completed'; islandNumber: number; stopId: IslandNarrativeStopId }
  | { kind: 'landmark_level_completed'; islandNumber: number; stopId: IslandNarrativeStopId; level: 1 | 2 | 3 }
  | { kind: 'landmarks_restored_majority'; islandNumber: number; threshold: number }
  | { kind: 'boss_challenge_started'; islandNumber: number }
  | { kind: 'boss_midpoint'; islandNumber: number }
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
  trigger: IslandNarrativeTrigger;
  speakerId?: string;
  text?: string;
  secondaryText?: string;
  priority: IslandNarrativePriority;
  repeatPolicy: IslandNarrativeRepeatPolicy;
  surface: IslandNarrativeSurface;
  episodePath?: string;
  displayCtaText?: string;
}

export interface IslandNarrativeDefinition {
  version: 1;
  islandNumber: number;
  islandName: string;
  civilizationName: string;
  characters: IslandNarrativeCharacter[];
  beats: IslandNarrativeBeat[];
}
