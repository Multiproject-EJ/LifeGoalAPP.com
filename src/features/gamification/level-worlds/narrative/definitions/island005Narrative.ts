import type { IslandNarrativeDefinition } from '../islandNarrativeTypes';

/**
 * Island 5 — "Crown of Tides", home of The Reefborn. (Special / milestone
 * island — the first-arc culmination and the MVP finale.)
 *
 * Reaction-beats only. Great Drift arc: clue 5 / escalation — the Crown is a
 * tidal signal HUB that once relayed safe-route song to the whole region. The
 * interruption isn't merely appearing on each island; it is being *relayed
 * from somewhere far*, through the captured Crown. The guardian Thalassa is
 * caught broadcasting a "borrowed song". Lesson seam: integration — small
 * restored rhythms, joined together, become a song (the arc-1 thesis).
 */
export const island005NarrativeDefinition = {
  version: 1,
  islandNumber: 5,
  islandName: 'Crown of Tides',
  civilizationName: 'The Reefborn',
  characters: [
    { id: 'reev', displayName: 'Reev', role: 'Young reef-runner and first-contact guide.' },
    { id: 'cael', displayName: 'Elder Cael', role: 'The Tidesinger; keeper of the Crown’s song.' },
    { id: 'sprat', displayName: 'Sprat', role: 'Reef-diver and warm supporting citizen.' },
    { id: 'thalassa', displayName: 'Thalassa the Tide Sovereign', role: 'Great crowned guardian caught relaying a borrowed song.' },
    { id: 'ivo', displayName: 'Captain Ivo', role: 'Compass Expedition voice.' },
  ],
  beats: [
    { id: 'I005-B01', trigger: { kind: 'stop_opened', islandNumber: 5, stopId: 'hatchery' }, speakerId: 'sprat', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Coral Cradle has gone dark — help me light one polyp again.' },
    { id: 'I005-B02', trigger: { kind: 'stop_completed', islandNumber: 5, stopId: 'hatchery' }, speakerId: 'reev', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'A polyp glows. The cradle remembers the song.' },
    { id: 'I005-B03', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'hatchery', level: 1 }, speakerId: 'sprat', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Color seeps back into the coral.' },
    { id: 'I005-B04', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'hatchery', level: 2 }, surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Something glimmers deep in the reef.' },
    { id: 'I005-B05', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'hatchery', level: 3 }, speakerId: 'reev', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Coral Cradle could carry a bond again.' },

    { id: 'I005-B06', trigger: { kind: 'stop_opened', islandNumber: 5, stopId: 'habit' }, speakerId: 'reev', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'Keep one channel with me. The reef needs daily tending.' },
    { id: 'I005-B07', trigger: { kind: 'stop_completed', islandNumber: 5, stopId: 'habit' }, speakerId: 'reev', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'One channel kept is enough for today.' },
    { id: 'I005-B08', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'habit', level: 1 }, speakerId: 'sprat', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Folk are back tending the tide-channels.' },
    { id: 'I005-B09', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'habit', level: 2 }, speakerId: 'reev', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'We are keeping the reef in time together.' },
    { id: 'I005-B10', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'habit', level: 3 }, speakerId: 'reev', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The channels run clear like they used to.' },

    { id: 'I005-B11', trigger: { kind: 'stop_opened', islandNumber: 5, stopId: 'mystery' }, speakerId: 'sprat', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Singing Shallows are calm. Come hear the water.' },
    { id: 'I005-B12', trigger: { kind: 'stop_completed', islandNumber: 5, stopId: 'mystery' }, speakerId: 'sprat', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'A note returns. We lit one lantern in the shallows.' },
    { id: 'I005-B13', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'mystery', level: 1 }, speakerId: 'sprat', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The shallows are gathering folk again.' },
    { id: 'I005-B14', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'mystery', level: 2 }, speakerId: 'reev', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'These shallows were never just for diving.' },
    { id: 'I005-B15', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'mystery', level: 3 }, speakerId: 'sprat', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'A reef-bell rings through the shallows.' },

    { id: 'I005-B16', trigger: { kind: 'stop_opened', islandNumber: 5, stopId: 'wisdom' }, speakerId: 'cael', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Crown Archive asks whose song you are carrying.' },
    { id: 'I005-B17', trigger: { kind: 'stop_completed', islandNumber: 5, stopId: 'wisdom' }, speakerId: 'cael', surface: 'dialogue_sheet', priority: 'major', repeatPolicy: 'once', text: 'Thalassa is not drowning us. She carries a borrowed song.', secondaryText: 'Help her find her own again.' },
    { id: 'I005-B18', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'wisdom', level: 1 }, speakerId: 'cael', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Salt clears from the old song-tablets.' },
    { id: 'I005-B19', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'wisdom', level: 2 }, speakerId: 'cael', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The interruption is being sung from somewhere far.' },
    { id: 'I005-B20', trigger: { kind: 'landmark_level_completed', islandNumber: 5, stopId: 'wisdom', level: 3 }, speakerId: 'reev', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'We stop hiding what the Crown still hears.' },

    { id: 'I005-B21', trigger: { kind: 'landmarks_restored_majority', islandNumber: 5, threshold: 3 }, speakerId: 'sprat', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Folk are back on the reef, singing it awake.' },
    { id: 'I005-B22', trigger: { kind: 'boss_challenge_started', islandNumber: 5 }, speakerId: 'reev', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'Help her find her own song — do not silence the Crown.' },
    { id: 'I005-B23', trigger: { kind: 'boss_midpoint', islandNumber: 5 }, speakerId: 'thalassa', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: '...not my voice... it sings through me...' },
    { id: 'I005-B24', trigger: { kind: 'boss_eligible', islandNumber: 5 }, speakerId: 'cael', surface: 'dialogue_sheet', priority: 'major', repeatPolicy: 'once', text: 'The reef sings in time again. The Crown will answer now.', secondaryText: 'Free her voice — do not silence the song.' },
  ],
} satisfies IslandNarrativeDefinition;
