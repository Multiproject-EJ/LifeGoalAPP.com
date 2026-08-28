import type { IslandTileMapEntry } from './islandBoardTileMap';
import type { VisibleTechnologyFragment } from './islandTechnologyFragmentVisuals';

export interface IslandBoardTileInfo {
  title: string;
  description: string;
}

export interface ResolveIslandBoardTileInfoOptions {
  entry?: IslandTileMapEntry;
  isStop?: boolean;
  isDormant?: boolean;
  isEncounterCompleted?: boolean;
  livingTicketGrowthProgress?: number;
  technologyFragment?: VisibleTechnologyFragment;
  trafficLightCharge?: number;
  trafficLightChargeTarget?: number;
}

const LANDMARK_TITLES: Record<NonNullable<IslandTileMapEntry['doorStopId']>, string> = {
  hatchery: 'Hatchery Passage',
  habit: 'Habit Passage',
  mystery: 'Event Arena Passage',
  wisdom: 'Wisdom Passage',
  boss: 'Boss Passage',
};

/** Presentation-only board glossary used by the tap-to-inspect tile popover. */
export function resolveIslandBoardTileInfo(options: ResolveIslandBoardTileInfoOptions): IslandBoardTileInfo {
  const {
    entry,
    isStop = false,
    isDormant = false,
    isEncounterCompleted = false,
    livingTicketGrowthProgress = 1,
    technologyFragment,
    trafficLightCharge = 0,
    trafficLightChargeTarget = 8,
  } = options;

  if (technologyFragment) {
    return {
      title: 'Concord Fragment',
      description: 'Land here to recover this technology fragment for the Concord grid.',
    };
  }

  if (isDormant) {
    return {
      title: 'Dormant Signal',
      description: 'This route powers on after the first Concord field order.',
    };
  }

  if (entry?.signatureMissionKind === 'first_light_dynamite') {
    return {
      title: 'Assembly Dynamite',
      description: 'Land here to detonate one charge and deepen the Assembly excavation.',
    };
  }
  if (entry?.signatureMissionKind === 'frostwell_drill') {
    return {
      title: 'Frostwell Drill',
      description: 'Land here to run a drill spin for the Frostwell mission.',
    };
  }
  if (entry?.signatureMissionKind === 'rootheart_power_component') {
    return {
      title: 'Powerworks Component',
      description: 'Land here to recover a component for the Rootheart Powerworks.',
    };
  }
  if (entry?.signatureMissionKind === 'cactus_canyon_dynamite') {
    const amount = Math.max(1, Math.floor(entry.signatureMissionAmount ?? 1));
    return {
      title: 'Canyon Dynamite',
      description: `Land here to collect ${amount} dynamite stick${amount === 1 ? '' : 's'} for the canyon mission.`,
    };
  }
  if (entry?.signatureMissionKind === 'great_honeyfall_nectar') {
    return {
      title: 'Royal Nectar',
      description: 'Land here to collect nectar for the Great Honeyfall mission.',
    };
  }
  if (entry?.signatureMissionKind === 'fishermans_rod') {
    return {
      title: 'Pond Fishing Rod',
      description: 'Land here to cast into the central pond, then reel in whatever takes the hook.',
    };
  }
  const restorationCopy = entry?.signatureMissionKind === 'causeway_masonry'
    ? ['Masonry Spark', 'Recover this charged masonry to raise the next Broken Causeway span.']
    : entry?.signatureMissionKind === 'moon_mirror_lens'
      ? ['Moon Lens', 'Recover this lens to align the next mirror in Moonveil’s beam circuit.']
      : entry?.signatureMissionKind === 'breathline_pressure_pearl'
        ? ['Pressure Pearl', 'Recover this pearl to pressurize the next underwater district.']
        : entry?.signatureMissionKind === 'pollination_pollen_light'
          ? ['Pollen Light', 'Recover this living light to awaken the next garden family.']
          : entry?.signatureMissionKind === 'ignition_core'
            ? ['Ignition Core', 'Recover this core to fire the next mechanism in the volcanic chain.']
            : null;
  if (restorationCopy) return { title: restorationCopy[0], description: restorationCopy[1] };

  if (isStop) {
    return {
      title: 'Route Marker',
      description: 'A board marker pointing toward one of the island landmarks.',
    };
  }

  switch (entry?.tileType) {
    case 'currency':
      return { title: 'Essence Cache', description: 'Land here to collect money for landmark passes and construction.' };
    case 'chest':
      return { title: 'Supply Chest', description: 'Land here for a larger money reward and event-bar progress.' };
    case 'hazard':
      return { title: 'Hazard', description: 'Landing here costs some money. Shields can protect your expedition.' };
    case 'micro':
      return { title: 'Reward Spark', description: 'Land here for a small money reward and event-bar progress.' };
    case 'encounter':
      return isEncounterCompleted
        ? { title: 'Encounter Complete', description: 'This one-time island challenge has already been resolved.' }
        : { title: 'Island Encounter', description: 'Land here to begin a one-time island challenge.' };
    case 'card':
      return { title: 'Caretaker Clue', description: 'Land here to reveal a short clue from the island caretaker.' };
    case 'landmark_door':
      return {
        title: entry.doorStopId ? LANDMARK_TITLES[entry.doorStopId] : 'Landmark Passage',
        description: 'Land here to enter or inspect this island landmark. Locked passages may offer a door challenge.',
      };
    case 'traffic_light': {
      const target = Math.max(1, Math.floor(trafficLightChargeTarget));
      const charge = Math.max(0, Math.min(target, Math.floor(trafficLightCharge)));
      return {
        title: 'Traffic Light Bonus',
        description: charge >= target
          ? 'Fully charged. Land here to unlock the bonus coin flip.'
          : `Pass this tile to add a light. Current charge: ${charge}/${target}.`,
      };
    }
    case 'build_discount':
      return { title: 'Build Rush', description: 'Land here to start a temporary 25% landmark construction discount.' };
    case 'free_ticket': {
      const progress = Math.max(0, Math.min(1, livingTicketGrowthProgress));
      return progress >= 1
        ? { title: 'Living Event Ticket', description: 'Land here to collect a ticket for the active timed event.' }
        : { title: 'Ticket Sprout', description: `The event ticket is regrowing — ${Math.floor(progress * 100)}% ready.` };
    }
    default:
      return { title: 'Board Tile', description: 'Explore the route and land here to discover its effect.' };
  }
}
