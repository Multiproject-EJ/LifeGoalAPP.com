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
  headline: string;
  missionStatement: string;
  primaryObjective: string;
  supportingObjective: string;
  fieldProtocol: string;
  caretakerSignal: string;
  commandTeam: readonly IslandMissionBriefingOfficer[];
}

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
  'headline' | 'missionStatement' | 'primaryObjective' | 'supportingObjective' | 'fieldProtocol' | 'caretakerSignal'
>;

const AUTHORED_MISSIONS: Readonly<Record<number, MissionCopy>> = Object.freeze({
  1: {
    headline: 'Restore a shared language',
    missionStatement: 'The island is speaking through damaged signals. Rebuild The Concord, listen before acting, and help the community separate warning from fear.',
    primaryObjective: 'Recover and restore all nine Concord fragments.',
    supportingObjective: 'Reopen the five communal landmarks without silencing their keepers.',
    fieldProtocol: 'Observe first. Translate meaning, not merely words.',
    caretakerSignal: 'We have waited a long time to be understood without being corrected.',
  },
  2: {
    headline: 'Question the Last Word',
    missionStatement: 'Pebble Bay has turned a useful warning into an unquestionable command. Restore public gathering places and help the Tidefolk test what the sacred board predicts.',
    primaryObjective: 'Restore the bay landmarks and investigate the second sun.',
    supportingObjective: 'Give the caretaker room to ask one forbidden question.',
    fieldProtocol: 'Treat prophecy as evidence to examine, never an order to obey.',
    caretakerSignal: 'A warning can save us. A warning no one may question can own us.',
  },
  3: {
    headline: 'Open the Frostwell',
    missionStatement: 'Frostwild survives above an immense frozen ocean. Help its builders drill through the ice, install the fishery and reservoir, and make hidden abundance flow again.',
    primaryObjective: 'Earn drill spins and reach the 500-metre water layer.',
    supportingObjective: 'Fund the Iceworks and restore fish and fresh-water circulation.',
    fieldProtocol: 'Protect the route while the offshore auger is under load.',
    caretakerSignal: 'The water is not gone. It is waiting beneath everything we fear to break.',
  },
  4: {
    headline: 'Repair without erasing',
    missionStatement: 'Driftwood Isle has preserved every remnant and postponed every tomorrow. Restore its working halls while helping the Menders carry memory forward instead of sealing it away.',
    primaryObjective: 'Rebuild the public repair network.',
    supportingObjective: 'Turn one protected remnant into a useful shared place.',
    fieldProtocol: 'Nothing repaired here should require forgetting who came before.',
    caretakerSignal: 'We know how to mend every object except the future.',
  },
  5: {
    headline: 'Return every voice',
    missionStatement: 'Crown of Tides is forcing many voices into one safe chorus. Restore the landmarks, enter the Arena with diplomatic intent, and help the guardian hear difference without hearing danger.',
    primaryObjective: 'Restore the four outer landmarks and complete the Arena audience.',
    supportingObjective: 'Separate the guardian\'s true signal from the borrowed voice beneath it.',
    fieldProtocol: 'Victory is recognition, not domination.',
    caretakerSignal: 'We still sing beautifully. We have forgotten how to sing alone.',
  },
  8: {
    headline: 'Wake the Everblossom',
    missionStatement: 'The botanical kingdom has beauty in abundance but its living systems have stopped exchanging energy. Restore each landmark family and reconnect springs, roots, glasshouses and pollinators.',
    primaryObjective: 'Restore the five Everblossom landmark families.',
    supportingObjective: 'Keep the 36-tile pilgrimage route open beneath the growing canopy.',
    fieldProtocol: 'Cultivate variety; do not force every living system into symmetry.',
    caretakerSignal: 'A garden can be perfectly arranged and still forget how to grow.',
  },
  9: {
    headline: 'Stabilize the deep forge',
    missionStatement: 'The lava kingdom draws power from a crater far below the route. Restore its suspended steel works and stabilize the machinery without sealing the volcano or cooling its living heart.',
    primaryObjective: 'Reconnect the crater-spanning forge systems.',
    supportingObjective: 'Keep every landmark anchored while the deep engine cycles.',
    fieldProtocol: 'Work with the pressure. Never mistake containment for control.',
    caretakerSignal: 'The mountain is not angry. It is carrying more power than our old structures can share.',
  },
  10: {
    headline: 'Bring back the Heartlight',
    missionStatement: 'Rootheart\'s builders still have craft, water and community, but their great engine is silent. Recover its scattered mechanisms and restore the causal chain from falling water to a city full of warm light.',
    primaryObjective: 'Collect all eight Powerworks components around the route.',
    supportingObjective: 'Fund the waterworks frame, Heartwheel dynamo and Heartlight network.',
    fieldProtocol: 'Keep the Arena clear. Every gear, cable and lantern must tell one physical story.',
    caretakerSignal: 'We remember the sound of every workshop lighting up together.',
  },
  13: {
    headline: 'Carve the Canyon Spiral',
    missionStatement: 'Cactus Canyon stands on a monumental stone pillar, but its summit railway has no safe route to the settlements below. Collect frontier dynamite and cut a passenger gallery downward through the mountain itself.',
    primaryObjective: 'Collect dynamite caches placed around the summit route.',
    supportingObjective: 'Blast all sixteen rock-cut sections and connect Union Station to the canyon-floor stop.',
    fieldProtocol: 'One controlled blast opens one section. Keep civilians and the summit train clear until every charge is accounted for.',
    caretakerSignal: 'The mountain can carry us—if every cut follows the stone instead of fighting it.',
  },
});

const AUTHORED_MISSION_NAMES: Readonly<Partial<Record<number, string>>> = Object.freeze({
  // Island 010's production world has moved beyond the legacy journey label
  // "Lagoon Haven". Keep the briefing aligned with the world the player sees
  // without changing global island naming in this bounded mission slice.
  10: 'Rootheart Canopy City',
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
