import type { IslandNarrativeSeenState } from '../narrative/islandNarrativeSeenState';
import { getIslandDisplayName } from './islandNames';

export const ISLAND_MISSION_BRIEFING_ROUTE_FRACTION = 0.5;

export interface IslandMissionBriefingTrigger {
  beatId: string;
  islandNumber: number;
  cycleIndex: number;
  triggerTileIndex: number;
}

export interface IslandMissionBriefingOfficer {
  id: 'ceo' | 'field' | 'diplomacy' | 'engineering' | 'habitats';
  name: string;
  role: string;
  initials: string;
  portraitSrc?: string;
}

export interface IslandMissionBriefingPresentation {
  islandNumber: number;
  islandName: string;
  organization: string;
  progressKind: IslandMissionProgressKind;
  headline: string;
  missionStatement: string;
  primaryObjective: string;
  supportingObjective: string;
  fieldProtocol: string;
  caretakerSignal: string;
  commandTeam: readonly IslandMissionBriefingOfficer[];
}

export type IslandMissionProgressKind =
  | 'first_light_assembly'
  | 'celestial_redocking'
  | 'frostwell_iceworks'
  | 'arena_guardian'
  | 'rootheart_powerworks'
  | 'sunken_sands_treasure'
  | 'cactus_canyon_spiral'
  | 'fishermans_fishing'
  | 'great_honeyfall_coronation'
  | 'planned_signature'
  | 'standard_landmarks';

const COMMAND_TEAM: readonly IslandMissionBriefingOfficer[] = Object.freeze([
  {
    id: 'ceo',
    name: 'Aurelia Vey',
    role: 'CEO · Universe Association',
    initials: 'AV',
  },
  {
    id: 'field',
    name: 'Captain Ivo',
    role: 'Field Operations',
    initials: 'CI',
    portraitSrc: '/islands/001/story/portraits/ivo.webp',
  },
  {
    id: 'diplomacy',
    name: 'Nia Sol',
    role: 'Diplomatic Relations',
    initials: 'NS',
  },
  {
    id: 'engineering',
    name: 'Torren Vale',
    role: 'Restoration Systems',
    initials: 'TV',
  },
  {
    id: 'habitats',
    name: 'Amara Moss',
    role: 'Habitats & Civilian Care',
    initials: 'AM',
  },
]);

type MissionCopy = Pick<
  IslandMissionBriefingPresentation,
  'progressKind' | 'headline' | 'missionStatement' | 'primaryObjective' | 'supportingObjective' | 'fieldProtocol' | 'caretakerSignal'
>;

const AUTHORED_MISSIONS: Readonly<Record<number, MissionCopy>> = Object.freeze({
  1: {
    progressKind: 'first_light_assembly',
    headline: 'First Light Assembly',
    missionStatement: 'First Light has no chamber where the whole island can be heard. Recover twenty finite dynamite charges, excavate one shared civic hall beneath the circular route, and restore the four outer landmarks so the community can convene.',
    primaryObjective: 'Collect and detonate all twenty Assembly Crater charges.',
    supportingObjective: 'Raise Hatchery, Habit, Event Arena and Wisdom to Level 3. The Assembly replaces a separate Boss landmark on Island 001.',
    fieldProtocol: 'One controlled blast at a time. Protect the route above while every charge widens and deepens the same excavation.',
    caretakerSignal: 'Give us a place where disagreement can become understanding instead of distance.',
  },
  2: {
    progressKind: 'celestial_redocking',
    headline: 'The Great Re-Docking',
    missionStatement: 'Celestial Sky Kingdom is drifting apart. Winch its four tethered landmark platforms back to the central kingdom and lock every docking collar safely into place.',
    primaryObjective: 'Dock all four celestial platforms.',
    supportingObjective: 'Restore the five island landmarks.',
    fieldProtocol: 'One platform locks after each five completed rolls; the canonical route never moves.',
    caretakerSignal: 'Bring our districts close enough to share one sky again.',
  },
  3: {
    progressKind: 'frostwell_iceworks',
    headline: 'Open the Frostwell',
    missionStatement: 'Frostwild survives above an immense frozen ocean. Help its builders drill through the ice, install the fishery and reservoir, and make hidden abundance flow again.',
    primaryObjective: 'Earn drill spins and reach the 500-metre water layer.',
    supportingObjective: 'Fund the Iceworks and restore fish and fresh-water circulation.',
    fieldProtocol: 'Protect the route while the offshore auger is under load.',
    caretakerSignal: 'The water is not gone. It is waiting beneath everything we fear to break.',
  },
  4: {
    progressKind: 'planned_signature',
    headline: 'Raise the Broken Causeway',
    missionStatement: 'Crown Citadel has lost the bridges joining its four outer districts to the central court. Recover the masonry and raise three causeway spans from the water.',
    primaryObjective: 'Raise all three causeway spans.',
    supportingObjective: 'Restore the five citadel landmarks.',
    fieldProtocol: 'Reconnect the districts without moving or obstructing the canonical route.',
    caretakerSignal: 'A citadel cannot govern people it can no longer reach.',
  },
  5: {
    progressKind: 'arena_guardian',
    headline: 'Defeat the Arena Guardian',
    missionStatement: 'Sunshore Arena is held by its guardian. Restore the island landmarks, enter the civic arena and win the final audience.',
    primaryObjective: 'Defeat the Arena guardian.',
    supportingObjective: 'Restore all five island landmarks.',
    fieldProtocol: 'The guardian remains the final canonical landmark objective.',
    caretakerSignal: 'Restore the shore, then meet our guardian in the arena.',
  },
  6: {
    progressKind: 'planned_signature',
    headline: 'Rephase the Moon Mirrors',
    missionStatement: 'Moonveil Nexus has lost the beam chain that stabilizes its central moon core. Rotate five great mirrors back into alignment and restore the lunar circuit.',
    primaryObjective: 'Align all five moon mirrors.',
    supportingObjective: 'Restore the five Nexus landmarks.',
    fieldProtocol: 'Each mirror must hold alignment before the next beam is formed.',
    caretakerSignal: 'Let the mirrors speak to one another again.',
  },
  7: {
    progressKind: 'planned_signature',
    headline: 'Restore the Breathline',
    missionStatement: 'Abyssal Pearl Kingdom is losing pressure across its living domes. Reconnect the Breathline through four districts and return oxygen to the pearl heart.',
    primaryObjective: 'Restore pressure to all four districts.',
    supportingObjective: 'Restore the five underwater landmarks.',
    fieldProtocol: 'Repressurize one district at a time and protect the returning fauna.',
    caretakerSignal: 'Give every district room to breathe again.',
  },
  8: {
    progressKind: 'planned_signature',
    headline: 'The Great Pollination',
    missionStatement: 'The botanical kingdom has beauty in abundance but its living systems have stopped exchanging energy. Restore each landmark family and reconnect springs, roots, glasshouses and pollinators.',
    primaryObjective: 'Restore the five Everblossom landmark families.',
    supportingObjective: 'Keep the 36-tile pilgrimage route open beneath the growing canopy.',
    fieldProtocol: 'Cultivate variety; do not force every living system into symmetry.',
    caretakerSignal: 'A garden can be perfectly arranged and still forget how to grow.',
  },
  9: {
    progressKind: 'planned_signature',
    headline: 'Restart the Ignition Chain',
    missionStatement: 'The lava kingdom draws power from a crater far below the route. Restore its suspended steel works and stabilize the machinery without sealing the volcano or cooling its living heart.',
    primaryObjective: 'Reconnect the crater-spanning forge systems.',
    supportingObjective: 'Keep every landmark anchored while the deep engine cycles.',
    fieldProtocol: 'Work with the pressure. Never mistake containment for control.',
    caretakerSignal: 'The mountain is not angry. It is carrying more power than our old structures can share.',
  },
  10: {
    progressKind: 'rootheart_powerworks',
    headline: 'Restore the Rootheart Powerworks',
    missionStatement: 'Rootheart\'s builders still have craft, water and community, but their great engine is silent. Recover its scattered mechanisms and restore the causal chain from falling water to a city full of warm light.',
    primaryObjective: 'Collect all eight Powerworks components around the route.',
    supportingObjective: 'Fund the waterworks frame, Heartwheel dynamo and Heartlight network.',
    fieldProtocol: 'Keep the Arena clear. Every gear, cable and lantern must tell one physical story.',
    caretakerSignal: 'We remember the sound of every workshop lighting up together.',
  },
  11: {
    progressKind: 'standard_landmarks',
    headline: 'Reopen the First Light Route',
    missionStatement: 'The preserved First Light settlement now serves a later expedition route. Restore its landmarks and reopen the complete civic circuit without repeating the one-time Concord recovery.',
    primaryObjective: 'Complete the five landmark objectives.',
    supportingObjective: 'Raise all five landmarks to Level 3.',
    fieldProtocol: 'Preserve the original First Light world while runtime Island 011 keeps its own progression identity.',
    caretakerSignal: 'The first route can guide a new expedition without becoming the same journey twice.',
  },
  12: {
    progressKind: 'sunken_sands_treasure',
    headline: 'Find the Sunscarab',
    missionStatement: 'Sunken Sands hides its first royal treasure beneath the route. Search the ruins through twenty completed rolls, reveal the chamber and claim the Sunscarab Token.',
    primaryObjective: 'Search the ruins for twenty completed rolls.',
    supportingObjective: 'Claim the Sunscarab and restore the five landmarks.',
    fieldProtocol: 'Every accepted canonical roll advances the search once.',
    caretakerSignal: 'The first treasure is not lost. It is waiting to be read correctly.',
  },
  13: {
    progressKind: 'cactus_canyon_spiral',
    headline: 'Carve the Canyon Spiral',
    missionStatement: 'Cactus Canyon stands on a monumental stone pillar, but its summit railway has no safe route to the settlements below. Collect frontier dynamite and cut a passenger gallery downward through the mountain itself.',
    primaryObjective: 'Collect dynamite caches placed around the summit route.',
    supportingObjective: 'Blast all sixteen rock-cut sections and connect Union Station to the canyon-floor stop.',
    fieldProtocol: 'One controlled blast opens one section. Keep civilians and the summit train clear until every charge is accounted for.',
    caretakerSignal: 'The mountain can carry us—if every cut follows the stone instead of fighting it.',
  },
  14: {
    progressKind: 'great_honeyfall_coronation',
    headline: 'Awaken the Great Honeyfall',
    missionStatement: 'Honeycomb Kingdom\'s royal reservoir is dry. Recover four royal nectar charges from the glowing honeycomb route, pour each charge into the palace pressure chamber, and build toward one glorious release.',
    primaryObjective: 'Collect four royal nectar charges and fill the royal reservoir.',
    supportingObjective: 'Restore the five Honeycomb landmarks while the Honey Egg couriers prepare the coronation flow.',
    fieldProtocol: 'One nectar charge commissions one reservoir stage. Watch the pressure, then stand clear when the fourth wax seal breaks.',
    caretakerSignal: 'Fill it slowly. The final drop will wake every Honeyfall in the kingdom.',
  },
  16: {
    progressKind: 'fishermans_fishing',
    headline: 'The Hundred-Kilo Catch',
    missionStatement: 'The Fisherman’s Village needs a full market catch from its central pond. Recover the village rod, cast from marked shore tiles and reel every catch in by hand—but watch the water carefully.',
    primaryObjective: 'Catch 100 kg / 220.5 lb of fish.',
    supportingObjective: 'Restore the five village landmarks after the pond disturbance.',
    fieldProtocol: 'Land on the rod first. Fishing spots then cast into the central pond; the catch only counts after the reel is completed.',
    caretakerSignal: 'The old fishers say the pond has a bottom. None of them sound certain.',
  },
});

const AUTHORED_MISSION_NAMES: Readonly<Partial<Record<number, string>>> = Object.freeze({
  1: 'First Light Kingdom',
  2: 'Celestial Sky Kingdom',
  3: 'Frostmoon Haven',
  4: 'Crown Citadel',
  5: 'Sunshore Arena',
  6: 'Moonveil Nexus',
  7: 'Abyssal Pearl Kingdom',
  8: 'The Everblossom Kingdom',
  9: 'The Heartshaft Crucible',
  10: 'Rootheart Canopy City',
  11: 'First Light Kingdom',
  12: 'Sunken Sands',
  13: 'Cactus Canyon',
  14: 'Honeycomb Kingdom',
  16: "Fisherman's Village",
});

function padIsland(islandNumber: number): string {
  return String(Math.max(1, Math.floor(islandNumber))).padStart(3, '0');
}

export function getIslandMissionBriefingBeatId(cycleIndex: number, islandNumber: number): string {
  return `MISSION-BRIEFING-C${Math.max(0, Math.floor(cycleIndex))}-I${padIsland(islandNumber)}`;
}

export function resolveIslandMissionBriefingTrigger(options: {
  islandNumber: number;
  cycleIndex: number;
  tileCount: number;
  hopSequence: readonly number[];
  narrativeSeenState: IslandNarrativeSeenState;
}): IslandMissionBriefingTrigger | null {
  const islandNumber = Math.max(1, Math.floor(options.islandNumber));
  const cycleIndex = Math.max(0, Math.floor(options.cycleIndex));
  // Island 1's first visit already has a mandatory Central Command order and
  // Concord acquisition sequence. A second automatic briefing would overlap it.
  if (islandNumber === 1 && cycleIndex === 0) return null;

  const tileCount = Math.max(1, Math.floor(options.tileCount));
  const triggerTileIndex = Math.floor(tileCount * ISLAND_MISSION_BRIEFING_ROUTE_FRACTION) % tileCount;
  if (!options.hopSequence.includes(triggerTileIndex)) return null;

  const beatId = getIslandMissionBriefingBeatId(cycleIndex, islandNumber);
  if (typeof options.narrativeSeenState?.beats?.[beatId] === 'number') return null;
  return { beatId, islandNumber, cycleIndex, triggerTileIndex };
}

export function markIslandMissionBriefingSeen(
  narrativeSeenState: IslandNarrativeSeenState,
  trigger: IslandMissionBriefingTrigger | null,
  seenAtMs: number,
): IslandNarrativeSeenState {
  if (!trigger) return narrativeSeenState;
  return {
    episodes: { ...narrativeSeenState.episodes },
    beats: {
      ...narrativeSeenState.beats,
      [trigger.beatId]: Math.max(0, Math.floor(seenAtMs)),
    },
  };
}

export function getIslandMissionBriefingPresentation(islandNumber: number): IslandMissionBriefingPresentation {
  const safeIslandNumber = Math.max(1, Math.floor(islandNumber));
  const islandName = AUTHORED_MISSION_NAMES[safeIslandNumber] ?? getIslandDisplayName(safeIslandNumber);
  const authored = AUTHORED_MISSIONS[safeIslandNumber];
  const fallback: MissionCopy = {
    progressKind: 'standard_landmarks',
    headline: `Establish trust on ${islandName}`,
    missionStatement: `The Concord confirms a community under strain on ${islandName}. Restore its shared landmarks, learn what its warning protects, and leave the local civilization more capable than when the expedition arrived.`,
    primaryObjective: 'Restore the island\'s five landmark stages.',
    supportingObjective: 'Listen to the caretaker and identify the island-specific restoration need.',
    fieldProtocol: 'Local knowledge leads. Expedition technology supports rather than replaces it.',
    caretakerSignal: 'If you are here to help, begin by noticing what we refused to abandon.',
  };
  return {
    islandNumber: safeIslandNumber,
    islandName,
    organization: 'Universe Association · Compass Expedition',
    commandTeam: COMMAND_TEAM,
    ...(authored ?? fallback),
  };
}
