import type { IslandNarrativeDefinition } from '../islandNarrativeTypes';

/**
 * Island 3 — "Coconut Cove", home of The Covefolk.
 *
 * Reaction-beats only (see island002Narrative.ts header). Great Drift arc:
 * clue 3 — the shaped interruption was "planted" here as a silence in the
 * grove. Lesson seam: generosity / gratitude (abundance is shared; fear of
 * scarcity starves the grove). Guardian Tamba curled up and stopped shaking
 * the trees, hoarding against a famine that never came.
 */
export const island003NarrativeDefinition = {
  version: 1,
  islandNumber: 3,
  islandName: 'Coconut Cove',
  civilizationName: 'The Covefolk',
  characters: [
    { id: 'pip', displayName: 'Pip', role: 'Young coconut-climber and first-contact guide.' },
    { id: 'liko', displayName: 'Grandmother Liko', role: 'Grove elder and storykeeper.' },
    { id: 'nuru', displayName: 'Nuru', role: 'Fruit-stall keeper and warm supporting citizen.' },
    { id: 'tamba', displayName: 'Tamba the Grovekeeper', role: 'Giant canopy guardian curled in fear.' },
    { id: 'ivo', displayName: 'Captain Ivo', role: 'Compass Expedition voice.' },
  ],
  beats: [
    { id: 'I003-B01', trigger: { kind: 'stop_opened', islandNumber: 3, stopId: 'hatchery' }, speakerId: 'nuru', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Sprout Nursery has gone still — help me wake one seedling.' },
    { id: 'I003-B02', trigger: { kind: 'stop_completed', islandNumber: 3, stopId: 'hatchery' }, speakerId: 'pip', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'A sprout uncurls. The nursery remembers.' },
    { id: 'I003-B03', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'hatchery', level: 1 }, speakerId: 'nuru', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Green creeps back into the nursery.' },
    { id: 'I003-B04', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'hatchery', level: 2 }, surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Something small rustles in the leaves.' },
    { id: 'I003-B05', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'hatchery', level: 3 }, speakerId: 'pip', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The nursery could cradle a new bond again.' },

    { id: 'I003-B06', trigger: { kind: 'stop_opened', islandNumber: 3, stopId: 'habit' }, speakerId: 'pip', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'Climb one tree with me. The grove needs tending, daily.' },
    { id: 'I003-B07', trigger: { kind: 'stop_completed', islandNumber: 3, stopId: 'habit' }, speakerId: 'pip', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'One tree tended is enough for today.' },
    { id: 'I003-B08', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'habit', level: 1 }, speakerId: 'nuru', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Folk are climbing the groves again.' },
    { id: 'I003-B09', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'habit', level: 2 }, speakerId: 'pip', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'We are tending the rows together again.' },
    { id: 'I003-B10', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'habit', level: 3 }, speakerId: 'pip', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The canopy gives like it used to.' },

    { id: 'I003-B11', trigger: { kind: 'stop_opened', islandNumber: 3, stopId: 'mystery' }, speakerId: 'nuru', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Shade Circle is cool and calm. Come sit and breathe.' },
    { id: 'I003-B12', trigger: { kind: 'stop_completed', islandNumber: 3, stopId: 'mystery' }, speakerId: 'nuru', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'A breeze returns. We hung one lantern in the shade.' },
    { id: 'I003-B13', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'mystery', level: 1 }, speakerId: 'nuru', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The shade is gathering folk again.' },
    { id: 'I003-B14', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'mystery', level: 2 }, speakerId: 'pip', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'This circle was never just for resting.' },
    { id: 'I003-B15', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'mystery', level: 3 }, speakerId: 'nuru', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'A husk-drum sounds under the palms.' },

    { id: 'I003-B16', trigger: { kind: 'stop_opened', islandNumber: 3, stopId: 'wisdom' }, speakerId: 'liko', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Story Stump asks what your grasping is guarding.' },
    { id: 'I003-B17', trigger: { kind: 'stop_completed', islandNumber: 3, stopId: 'wisdom' }, speakerId: 'liko', surface: 'dialogue_sheet', priority: 'major', repeatPolicy: 'once', text: 'Tamba is not hoarding. He fears the grove will run dry.', secondaryText: 'Show him it still gives.' },
    { id: 'I003-B18', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'wisdom', level: 1 }, speakerId: 'liko', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Dust leaves the old story-carvings.' },
    { id: 'I003-B19', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'wisdom', level: 2 }, speakerId: 'liko', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'This silence was planted here on purpose.' },
    { id: 'I003-B20', trigger: { kind: 'landmark_level_completed', islandNumber: 3, stopId: 'wisdom', level: 3 }, speakerId: 'pip', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'We share what the grove tells us again.' },

    { id: 'I003-B21', trigger: { kind: 'landmarks_restored_majority', islandNumber: 3, threshold: 3 }, speakerId: 'nuru', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Folk are back in the groves, sharing the haul.' },
    { id: 'I003-B22', trigger: { kind: 'boss_challenge_started', islandNumber: 3 }, speakerId: 'pip', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'Show him the grove still gives — do not take.' },
    { id: 'I003-B23', trigger: { kind: 'boss_midpoint', islandNumber: 3 }, speakerId: 'tamba', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: '...so little left... I held it all...' },
  ],
} satisfies IslandNarrativeDefinition;
