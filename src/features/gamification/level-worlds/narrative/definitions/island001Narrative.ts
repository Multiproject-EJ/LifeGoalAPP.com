import type { IslandNarrativeDefinition } from '../islandNarrativeTypes';

export const island001NarrativeDefinition = {
  version: 1,
  islandNumber: 1,
  islandName: 'Luma Isle',
  civilizationName: 'The Lumin',
  characters: [
    {
      id: 'miri',
      displayName: 'Miri',
      role: 'Local routekeeper and first-contact guide.',
      portraitSrc: '/islands/001/story/portraits/miri.webp',
    },
    {
      id: 'sava',
      displayName: 'Elder Sava',
      role: 'Memory keeper and former dragon-route engineer.',
      portraitSrc: '/islands/001/story/portraits/sava.webp',
    },
    {
      id: 'poko',
      displayName: 'Poko',
      role: 'Hatchery tinkerer and warm supporting citizen.',
      portraitSrc: '/islands/001/story/portraits/poko.webp',
    },
    {
      id: 'ivo',
      displayName: 'Captain Ivo',
      role: 'Compass Expedition voice.',
      portraitSrc: '/islands/001/story/portraits/ivo.webp',
    },
    {
      id: 'noctyra',
      displayName: 'Noctyra',
      role: 'Black Crystal Dragon and guardian of Luma Isle.',
      portraitSrc: '/islands/001/story/portraits/noctyra.webp',
    },
  ],
  beats: [
    {
      id: 'I001-B02',
      trigger: { kind: 'island_entered', islandNumber: 1 },
      surface: 'story_reader',
      priority: 'major',
      repeatPolicy: 'once',
      episodePath: '/islands/001/story/arrival/manifest.json',
    },
    {
      id: 'I001-B03',
      trigger: { kind: 'arrival_closed', islandNumber: 1 },
      speakerId: 'miri',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'Start small. Help us wake one gentle place.',
    },
    {
      id: 'I001-B04',
      trigger: { kind: 'stop_opened', islandNumber: 1, stopId: 'hatchery' },
      speakerId: 'poko',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The Hatchery is quiet, not gone. Help me wake one cradle.',
    },
    {
      id: 'I001-B24',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'hatchery', level: 1 },
      speakerId: 'miri',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'The island noticed.',
    },
    {
      id: 'I001-B26',
      trigger: { kind: 'boss_eligible', islandNumber: 1 },
      speakerId: 'sava',
      surface: 'dialogue_sheet',
      priority: 'major',
      repeatPolicy: 'once',
      text: 'The five lights are speaking again. Now we ask, not attack.',
      secondaryText: 'Aim for the crystal around her, not the heart inside it.',
    },
    {
      id: 'I001-B29',
      trigger: { kind: 'boss_resolved', islandNumber: 1 },
      surface: 'story_reader',
      priority: 'major',
      repeatPolicy: 'once',
      episodePath: '/islands/001/story/resolution/manifest.json',
    },
    {
      id: 'I001-B30',
      trigger: { kind: 'island_clear_travel_ready', islandNumber: 1 },
      speakerId: 'miri',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The route is open because we opened it together.',
      displayCtaText: 'Follow the restored route',
    },

    // ----------------------------------------------------------------------
    // AUTHORED — not yet wired into useIslandNarrativeOpeningFlow.
    //
    // The beats above (B02/B03/B04/B24/B26/B29/B30) are live. The beats below
    // are read-only content authored from docs/design/island-001-narrative-
    // vertical-slice.md §7/§9. They become active once the controller is
    // taught to watch their triggers (see
    // docs/plans/island-001-narrative-beat-wiring-plan.md, PRs 1–4). Adding
    // them here is additive and inert: the controller looks up beats by id, so
    // unwired beats never fire.
    //
    // Note: slice B06 (Hatchery L1 reaction) is intentionally omitted — the
    // shipped B24 already fires on the Hatchery Level 1 transition.
    // ----------------------------------------------------------------------

    // Hatchery (Stop 1) — completion + remaining build levels
    {
      id: 'I001-B05',
      trigger: { kind: 'stop_completed', islandNumber: 1, stopId: 'hatchery' },
      speakerId: 'miri',
      surface: 'toast',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'One cradle light answers — the Hatchery is waking.',
    },
    {
      id: 'I001-B07',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'hatchery', level: 2 },
      speakerId: 'poko',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'Something small is listening.',
    },
    {
      id: 'I001-B08',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'hatchery', level: 3 },
      speakerId: 'miri',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The Hatchery feels like a welcome again.',
    },

    // Habit (Stop 2) — "Routekeeper Steps"
    {
      id: 'I001-B09',
      trigger: { kind: 'stop_opened', islandNumber: 1, stopId: 'habit' },
      speakerId: 'miri',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'Relight the Routekeeper Steps with one steady action.',
    },
    {
      id: 'I001-B10',
      trigger: { kind: 'stop_completed', islandNumber: 1, stopId: 'habit' },
      speakerId: 'miri',
      surface: 'toast',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'One steady action is enough for today.',
    },
    {
      id: 'I001-B11',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'habit', level: 1 },
      speakerId: 'poko',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'Citizens test the lantern lines again.',
    },
    {
      id: 'I001-B12',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'habit', level: 2 },
      speakerId: 'miri',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'They are working together again.',
    },
    {
      id: 'I001-B13',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'habit', level: 3 },
      speakerId: 'miri',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'The route chime rings clearly.',
    },

    // Mystery (Stop 3) — "Gathering Grounds"
    {
      id: 'I001-B14',
      trigger: { kind: 'stop_opened', islandNumber: 1, stopId: 'mystery' },
      speakerId: 'poko',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The Gathering Grounds are ready for a restoration practice.',
    },
    {
      id: 'I001-B15',
      trigger: { kind: 'stop_completed', islandNumber: 1, stopId: 'mystery' },
      speakerId: 'poko',
      surface: 'toast',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'Citizens add a lantern to the grounds.',
    },
    {
      id: 'I001-B16',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'mystery', level: 1 },
      speakerId: 'poko',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'Benches and banners return.',
    },
    {
      id: 'I001-B17',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'mystery', level: 2 },
      speakerId: 'miri',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'This was never just a plaza.',
    },
    {
      id: 'I001-B18',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'mystery', level: 3 },
      speakerId: 'poko',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'A festival bell test rings out.',
    },

    // Wisdom (Stop 4) — "Listening Terrace"
    {
      id: 'I001-B19',
      trigger: { kind: 'stop_opened', islandNumber: 1, stopId: 'wisdom' },
      speakerId: 'sava',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'The Listening Terrace asks what protection has become.',
    },
    {
      id: 'I001-B20',
      trigger: { kind: 'stop_completed', islandNumber: 1, stopId: 'wisdom' },
      speakerId: 'sava',
      surface: 'dialogue_sheet',
      priority: 'major',
      repeatPolicy: 'once',
      text: 'Noctyra is not calling for battle. She is stuck on warning.',
      secondaryText: 'Aim to free her, not to fight her.',
    },
    {
      id: 'I001-B21',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'wisdom', level: 1 },
      speakerId: 'sava',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'Dust covers less of the maps now.',
    },
    {
      id: 'I001-B22',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'wisdom', level: 2 },
      speakerId: 'sava',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'That interruption was shaped by someone.',
    },
    {
      id: 'I001-B23',
      trigger: { kind: 'landmark_level_completed', islandNumber: 1, stopId: 'wisdom', level: 3 },
      speakerId: 'miri',
      surface: 'dialogue_sheet',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'We stop hiding the map.',
    },

    // Aggregate + Boss (Stop 5) framing
    {
      id: 'I001-B25',
      trigger: { kind: 'landmarks_restored_majority', islandNumber: 1, threshold: 3 },
      speakerId: 'poko',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'People are coming outside again.',
    },
    {
      id: 'I001-B27',
      trigger: { kind: 'boss_challenge_started', islandNumber: 1 },
      speakerId: 'miri',
      surface: 'toast',
      priority: 'short',
      repeatPolicy: 'once',
      text: 'Break the corrupted crystal — not the dragon.',
    },
    {
      id: 'I001-B28',
      trigger: { kind: 'boss_midpoint', islandNumber: 1 },
      speakerId: 'noctyra',
      surface: 'toast',
      priority: 'ambient',
      repeatPolicy: 'once',
      text: 'Too much noise. Protect the small lights.',
    },
  ],
} satisfies IslandNarrativeDefinition;
