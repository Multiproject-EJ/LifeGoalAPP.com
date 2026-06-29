import type { IslandNarrativeDefinition } from '../islandNarrativeTypes';

/**
 * Island 4 — "Driftwood Isle", home of The Driftfolk.
 *
 * Reaction-beats only. Great Drift arc: clue 4 — the shaped interruption was
 * carved into a piece of driftwood that drifted in from elsewhere ("broken by
 * a hand, not the sea"). Lesson seam: resilience / rebuilding after breakage
 * (a lapse is not the end — what breaks can be rebuilt). Guardian Garran froze
 * mid-build, mourning what the sea took.
 */
export const island004NarrativeDefinition = {
  version: 1,
  islandNumber: 4,
  islandName: 'Driftwood Isle',
  civilizationName: 'The Driftfolk',
  characters: [
    { id: 'wren', displayName: 'Wren', role: 'Young builder-scavenger and first-contact guide.' },
    { id: 'fenn', displayName: 'Old Fenn', role: 'Master mender and the isle’s wisdom figure.' },
    { id: 'bodie', displayName: 'Bodie', role: 'Salvager and warm supporting citizen.' },
    { id: 'garran', displayName: 'Garran the Driftwarden', role: 'Great shore-guardian frozen mid-build.' },
    { id: 'ivo', displayName: 'Captain Ivo', role: 'Compass Expedition voice.' },
  ],
  beats: [
    { id: 'I004-B01', trigger: { kind: 'stop_opened', islandNumber: 4, stopId: 'hatchery' }, speakerId: 'bodie', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Nesting Hollow has gone cold — help me line one nest again.' },
    { id: 'I004-B02', trigger: { kind: 'stop_completed', islandNumber: 4, stopId: 'hatchery' }, speakerId: 'wren', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'A nest holds. The hollow remembers warmth.' },
    { id: 'I004-B03', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'hatchery', level: 1 }, speakerId: 'bodie', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Driftwood settles back into the hollow.' },
    { id: 'I004-B04', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'hatchery', level: 2 }, surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Something stirs among the reeds.' },
    { id: 'I004-B05', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'hatchery', level: 3 }, speakerId: 'wren', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Nesting Hollow could hold a bond again.' },

    { id: 'I004-B06', trigger: { kind: 'stop_opened', islandNumber: 4, stopId: 'habit' }, speakerId: 'wren', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'Mend one piece with me. Small repairs, every day.' },
    { id: 'I004-B07', trigger: { kind: 'stop_completed', islandNumber: 4, stopId: 'habit' }, speakerId: 'wren', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'One mend is enough for today.' },
    { id: 'I004-B08', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'habit', level: 1 }, speakerId: 'bodie', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Folk are back at the Mending Bench.' },
    { id: 'I004-B09', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'habit', level: 2 }, speakerId: 'wren', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'We are rebuilding side by side again.' },
    { id: 'I004-B10', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'habit', level: 3 }, speakerId: 'wren', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The isle holds together like it used to.' },

    { id: 'I004-B11', trigger: { kind: 'stop_opened', islandNumber: 4, stopId: 'mystery' }, speakerId: 'bodie', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Tide Table is dry now. Come gather on the flats.' },
    { id: 'I004-B12', trigger: { kind: 'stop_completed', islandNumber: 4, stopId: 'mystery' }, speakerId: 'bodie', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'The flats fill. We set one lantern on the table.' },
    { id: 'I004-B13', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'mystery', level: 1 }, speakerId: 'bodie', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The flats are gathering folk again.' },
    { id: 'I004-B14', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'mystery', level: 2 }, speakerId: 'wren', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'This table was never just for sorting salvage.' },
    { id: 'I004-B15', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'mystery', level: 3 }, speakerId: 'bodie', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'A driftwood chime rings on the flats.' },

    { id: 'I004-B16', trigger: { kind: 'stop_opened', islandNumber: 4, stopId: 'wisdom' }, speakerId: 'fenn', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Wreck Archive asks what your stillness is mourning.' },
    { id: 'I004-B17', trigger: { kind: 'stop_completed', islandNumber: 4, stopId: 'wisdom' }, speakerId: 'fenn', surface: 'dialogue_sheet', priority: 'major', repeatPolicy: 'once', text: 'Garran is not frozen. He mourns what the sea took.', secondaryText: 'Help him build again.' },
    { id: 'I004-B18', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'wisdom', level: 1 }, speakerId: 'fenn', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Sand falls from the old wreck-charts.' },
    { id: 'I004-B19', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'wisdom', level: 2 }, speakerId: 'fenn', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'This was broken by a hand, not the sea.' },
    { id: 'I004-B20', trigger: { kind: 'landmark_level_completed', islandNumber: 4, stopId: 'wisdom', level: 3 }, speakerId: 'wren', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'We stop hiding the charts we salvaged.' },

    { id: 'I004-B21', trigger: { kind: 'landmarks_restored_majority', islandNumber: 4, threshold: 3 }, speakerId: 'bodie', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Folk are back on the shore, building again.' },
    { id: 'I004-B22', trigger: { kind: 'boss_challenge_started', islandNumber: 4 }, speakerId: 'wren', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'Help him build again — do not break what is left.' },
    { id: 'I004-B23', trigger: { kind: 'boss_midpoint', islandNumber: 4 }, speakerId: 'garran', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: '...all of it... washed away... why rebuild...' },
  ],
} satisfies IslandNarrativeDefinition;
