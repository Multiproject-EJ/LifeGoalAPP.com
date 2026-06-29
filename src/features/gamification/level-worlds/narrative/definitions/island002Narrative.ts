import type { IslandNarrativeDefinition } from '../islandNarrativeTypes';

/**
 * Island 2 — "Pebble Bay", home of The Tidefolk.
 *
 * Authored from docs/design/island-002-narrative-proposal.md §7 (approved).
 * Reaction-beats only: stop opened/completed, landmark level reactions,
 * majority-restored, and boss-challenge framing. These fire through the
 * island-agnostic reaction layer (`islandNarrativeReactionDispatch.ts`); there
 * is no per-island controller code. Illustrated arrival/finale/resolution
 * episodes are intentionally deferred (need art + legacy-flow generalization).
 *
 * Continuity: Pebble Bay is "clue 2" of the Great Drift arc — the guardian
 * Maelis stopped the tides out of fear, and the same shaped interruption from
 * Island 1 recurs here. Lesson seam: consistency (gentle repeated motion).
 */
export const island002NarrativeDefinition = {
  version: 1,
  islandNumber: 2,
  islandName: 'Pebble Bay',
  civilizationName: 'The Tidefolk',
  characters: [
    { id: 'sela', displayName: 'Sela', role: 'Young tide-reader and first-contact guide.' },
    { id: 'bryn', displayName: 'Keeper Bryn', role: 'Lantern-and-tide keeper; the bay’s wisdom figure.' },
    { id: 'tobin', displayName: 'Tobin', role: 'Net-mender and warm supporting citizen.' },
    { id: 'maelis', displayName: 'Maelis the Tideward', role: 'Ancient tide-guardian holding her breath.' },
    { id: 'ivo', displayName: 'Captain Ivo', role: 'Compass Expedition voice.' },
  ],
  beats: [
    // Hatchery — "The Tide-Cradle"
    {
      id: 'I002-B01',
      trigger: { kind: 'stop_opened', islandNumber: 2, stopId: 'hatchery' },
      speakerId: 'tobin',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The Tide-Cradle has gone quiet — help me warm one pool again.',
    },
    {
      id: 'I002-B02',
      trigger: { kind: 'stop_completed', islandNumber: 2, stopId: 'hatchery' },
      speakerId: 'sela',
      surface: 'toast',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'One pool stirs. The cradle remembers the water.',
    },
    {
      id: 'I002-B03',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'hatchery', level: 1 },
      speakerId: 'tobin',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'A little warmth comes back to the stones.',
    },
    {
      id: 'I002-B04',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'hatchery', level: 2 },
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'Something in the shallows is listening.',
    },
    {
      id: 'I002-B05',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'hatchery', level: 3 },
      speakerId: 'sela',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The Tide-Cradle could welcome a bond again.',
    },

    // Habit — "The Turning Stones"
    {
      id: 'I002-B06',
      trigger: { kind: 'stop_opened', islandNumber: 2, stopId: 'habit' },
      speakerId: 'sela',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'Turn one stone with me. Small, but the bay needs the motion.',
    },
    {
      id: 'I002-B07',
      trigger: { kind: 'stop_completed', islandNumber: 2, stopId: 'habit' },
      speakerId: 'sela',
      surface: 'toast',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'One steady turn is enough for today.',
    },
    {
      id: 'I002-B08',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'habit', level: 1 },
      speakerId: 'tobin',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'Folk are drifting back to the Turning Stones.',
    },
    {
      id: 'I002-B09',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'habit', level: 2 },
      speakerId: 'sela',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'They are keeping the rhythm together again.',
    },
    {
      id: 'I002-B10',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'habit', level: 3 },
      speakerId: 'sela',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'The shore turns like it used to.',
    },

    // Mystery — "The Tide Pools"
    {
      id: 'I002-B11',
      trigger: { kind: 'stop_opened', islandNumber: 2, stopId: 'mystery' },
      speakerId: 'tobin',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The Tide Pools are calm enough to read. Come listen to the water.',
    },
    {
      id: 'I002-B12',
      trigger: { kind: 'stop_completed', islandNumber: 2, stopId: 'mystery' },
      speakerId: 'tobin',
      surface: 'toast',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'A pool clears. We added one lantern to the pools.',
    },
    {
      id: 'I002-B13',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'mystery', level: 1 },
      speakerId: 'tobin',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'The pools are gathering folk again.',
    },
    {
      id: 'I002-B14',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'mystery', level: 2 },
      speakerId: 'sela',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'These pools were never just for fishing.',
    },
    {
      id: 'I002-B15',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'mystery', level: 3 },
      speakerId: 'tobin',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'A tide-bell rings over the pools.',
    },

    // Wisdom — "The Lantern Walk"
    {
      id: 'I002-B16',
      trigger: { kind: 'stop_opened', islandNumber: 2, stopId: 'wisdom' },
      speakerId: 'bryn',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The Lantern Walk asks what your stillness is protecting.',
    },
    {
      id: 'I002-B17',
      trigger: { kind: 'stop_completed', islandNumber: 2, stopId: 'wisdom' },
      speakerId: 'bryn',
      surface: 'dialogue_sheet',
      priority: 'major',
      repeatPolicy: 'once',
      text: 'Maelis is not attacking. She is holding her breath.',
      secondaryText: 'Help her let it go, gently.',
    },
    {
      id: 'I002-B18',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'wisdom', level: 1 },
      speakerId: 'bryn',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'One more lantern lit along the walk.',
    },
    {
      id: 'I002-B19',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'wisdom', level: 2 },
      speakerId: 'bryn',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'This stopped tide was shaped by someone.',
    },
    {
      id: 'I002-B20',
      trigger: { kind: 'landmark_level_completed', islandNumber: 2, stopId: 'wisdom', level: 3 },
      speakerId: 'sela',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'We stop hiding what the water told us.',
    },

    // Aggregate + Boss — "The Breathing Basin"
    {
      id: 'I002-B21',
      trigger: { kind: 'landmarks_restored_majority', islandNumber: 2, threshold: 3 },
      speakerId: 'tobin',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'Folk are back on the shore, turning stones.',
    },
    {
      id: 'I002-B22',
      trigger: { kind: 'boss_challenge_started', islandNumber: 2 },
      speakerId: 'sela',
      surface: 'toast',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'Free her breath — do not fight the tide.',
    },
    {
      id: 'I002-B23',
      trigger: { kind: 'boss_midpoint', islandNumber: 2 },
      speakerId: 'maelis',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: '...the wave... it never came...',
    },
  ],
} satisfies IslandNarrativeDefinition;
