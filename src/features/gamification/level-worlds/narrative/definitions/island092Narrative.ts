import type { IslandNarrativeDefinition } from '../islandNarrativeTypes';
import { defineNarrativeTrack } from '../islandNarrativeTrack';

/**
 * Island 92 — "Spellbound Bay", home of The Everbound.
 *
 * Reaction-beats only (see island002Narrative.ts header). First authored island
 * of the Mastery/Identity zone; see `docs/ISLAND_ZONE_73_96_IDENTITY_HARVEST.md`
 * for the zone map and the two-layer authoring rule.
 *
 * Lesson seam: autopilot. The Bay runs perfectly on enchantments its people cast
 * on themselves so long ago that nobody remembers casting them. Nothing is wrong;
 * nothing is chosen. Guardian Vess bound herself so she would never have to decide
 * again, and can no longer tell which of her actions are hers.
 *
 * The island deliberately resolves on *awake inside the spell*, not *free of it* —
 * the seam is that noticing the automatic is where choosing starts, not a victory
 * over it. The Stillpoint (mystery stop) carries the thesis as an experiment the
 * player can actually run: hold your gaze on a mark, and notice that the slip
 * roughly ten seconds later is not something you did.
 */
export const island092NarrativeDefinition = {
  version: 1,
  islandNumber: 92,
  islandName: 'Spellbound Bay',
  civilizationName: 'The Everbound',
  characters: [
    { id: 'wick', displayName: 'Wick', role: 'Young lamp-tender and first-contact guide.' },
    { id: 'orla', displayName: 'Mistress Orla', role: 'Spellwright elder and keeper of the unbinding runes.' },
    { id: 'bramm', displayName: 'Bramm', role: 'Harbour cook and warm supporting citizen.' },
    { id: 'vess', displayName: 'Vess the Everbound', role: 'Spellwright guardian, bound by her own hand.' },
    { id: 'ivo', displayName: 'Captain Ivo', role: 'Compass Expedition voice.' },
  ],
  beats: defineNarrativeTrack('island_mission', [
    { id: 'I092-B01', trigger: { kind: 'stop_opened', islandNumber: 92, stopId: 'hatchery' }, speakerId: 'bramm', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Waking Cradle has not stirred in years. Nothing here begins on its own anymore.' },
    { id: 'I092-B02', trigger: { kind: 'stop_completed', islandNumber: 92, stopId: 'hatchery' }, speakerId: 'wick', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'It stirred. Nobody told it to.' },
    { id: 'I092-B03', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'hatchery', level: 1 }, surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'A charm slips loose from the cradle rail.' },
    { id: 'I092-B04', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'hatchery', level: 2 }, speakerId: 'orla', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'That cradle was warded to keep things predictable.' },
    { id: 'I092-B05', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'hatchery', level: 3 }, speakerId: 'wick', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'It could hold something unplanned again.' },

    { id: 'I092-B06', trigger: { kind: 'stop_opened', islandNumber: 92, stopId: 'habit' }, speakerId: 'wick', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'Walk the lamp round with me. My feet know it. I have never once chosen it.' },
    { id: 'I092-B07', trigger: { kind: 'stop_completed', islandNumber: 92, stopId: 'habit' }, speakerId: 'wick', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'Same round as always. First time I noticed I was walking it.' },
    { id: 'I092-B08', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'habit', level: 1 }, speakerId: 'bramm', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Folk are looking down at their own feet.' },
    { id: 'I092-B09', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'habit', level: 2 }, speakerId: 'wick', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'I took a different turning tonight. It felt loud.' },
    { id: 'I092-B10', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'habit', level: 3 }, surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The lamps are lit in a new order tonight.' },

    { id: 'I092-B11', trigger: { kind: 'stop_opened', islandNumber: 92, stopId: 'mystery' }, speakerId: 'orla', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Stillpoint. Fix your eyes on the mark and hold them there. Just hold.' },
    { id: 'I092-B12', trigger: { kind: 'stop_completed', islandNumber: 92, stopId: 'mystery' }, speakerId: 'orla', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'Your gaze slipped. Did you tell it to?' },
    { id: 'I092-B13', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'mystery', level: 1 }, surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The mark on the Stillpoint wall grows clearer.' },
    { id: 'I092-B14', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'mystery', level: 2 }, speakerId: 'orla', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'Ten seconds. In four hundred years nobody has held it longer.' },
    { id: 'I092-B15', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'mystery', level: 3 }, surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Islanders sit at the Stillpoint now, failing, and laughing about it.' },

    { id: 'I092-B16', trigger: { kind: 'stop_opened', islandNumber: 92, stopId: 'wisdom' }, speakerId: 'orla', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'The Unbinding Table asks which of your habits you remember choosing.' },
    { id: 'I092-B17', trigger: { kind: 'stop_completed', islandNumber: 92, stopId: 'wisdom' }, speakerId: 'orla', surface: 'dialogue_sheet', priority: 'major', repeatPolicy: 'once', text: 'Vess is not enchanting us. She enchanted herself, and forgot she was the one holding the wand.', secondaryText: 'Show her the hand, not the spell.' },
    { id: 'I092-B18', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'wisdom', level: 1 }, speakerId: 'orla', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'Dust lifts off the old unbinding runes.' },
    { id: 'I092-B19', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'wisdom', level: 2 }, speakerId: 'orla', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'A spell you cannot remember casting still answers to you.' },
    { id: 'I092-B20', trigger: { kind: 'landmark_level_completed', islandNumber: 92, stopId: 'wisdom', level: 3 }, speakerId: 'wick', surface: 'dialogue_sheet', priority: 'short', repeatPolicy: 'once', text: 'We are asking each other what we actually chose.' },

    { id: 'I092-B21', trigger: { kind: 'landmarks_restored_majority', islandNumber: 92, threshold: 3 }, speakerId: 'bramm', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: 'The Bay is full of people pausing mid-step.' },
    { id: 'I092-B22', trigger: { kind: 'boss_challenge_started', islandNumber: 92 }, speakerId: 'wick', surface: 'toast', priority: 'short', repeatPolicy: 'once', text: 'Do not break her spell. Show her she is the one holding it.' },
    { id: 'I092-B23', trigger: { kind: 'boss_midpoint', islandNumber: 92 }, speakerId: 'vess', surface: 'toast', priority: 'ambient', repeatPolicy: 'once', text: '...I did not choose this... did I choose this...?' },
    { id: 'I092-B24', trigger: { kind: 'boss_eligible', islandNumber: 92 }, speakerId: 'orla', surface: 'dialogue_sheet', priority: 'major', repeatPolicy: 'once', text: 'She is looking at her own hand now. She will hear you.', secondaryText: 'Not free of the spell — awake inside it.' },
  ]),
} satisfies IslandNarrativeDefinition;
