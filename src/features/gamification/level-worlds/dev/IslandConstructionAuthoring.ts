import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  Island3DQuality,
  Island5LandmarkId,
} from './island5ThreePilotContract';
import type { ConstructionChoreography } from './RobotConstructionTheatre';
import { resolveIslandConstructionScaffoldProfile } from './IslandConstructionScaffold';

export type IslandConstructionPreviewMode = 'current' | 'target';

export type IslandConstructionFactoryOptions = {
  constructionPreview?: IslandConstructionPreviewMode;
};

type ConstructionRigKind =
  | 'cradle-hoist'
  | 'facade-platform'
  | 'alignment-rail'
  | 'archive-lift'
  | 'commissioning-crane';

export type IslandLandmarkConstructionProfile = {
  worldSourceNumber: number;
  landmarkId: Island5LandmarkId;
  label: string;
  rigKind: ConstructionRigKind;
  stageNames: readonly [string, string, string, string, string];
  choreography: ConstructionChoreography;
};

const WORLD_LANDMARK_LABELS: Readonly<Record<number, Readonly<Record<Island5LandmarkId, string>>>> = {
  2: { boss: 'Solspire Palace', hatchery: 'Cloudnest Conservatory', habit: 'Winged Resolve Court', wisdom: 'Skybound Archive', event: 'Astral Gate' },
  3: { boss: 'Aurora Keep', hatchery: 'Snowfeather Roost', habit: 'Hearthguard Yard', wisdom: 'Frostfire Archive', event: 'Moonwell Observatory' },
  4: { boss: 'Crown Citadel', hatchery: 'Coral Cradle', habit: 'Tidekeeper Hall', wisdom: 'Pearl Archive', event: 'Concord Arena' },
  5: { boss: 'Sunwheel Arena', hatchery: 'Egg Grotto Hatchery', habit: 'Open-Air Habit Lodge', wisdom: 'Star Archive Library', event: 'Tideglass Oracle' },
  6: { boss: "Noctyra's Moon Gate", hatchery: 'Moon-Nest Conservatory', habit: 'Constellation Court', wisdom: 'Midnight Archive', event: 'Violet Rift Observatory' },
  7: { boss: 'Pearl Throne Palace', hatchery: 'Nautilus Hatchery Grotto', habit: 'Living Reef Sanctuary', wisdom: 'Tidemind Archive', event: 'Compass Current Portal' },
  8: { boss: 'Blossom Crown Citadel', hatchery: 'Tulip Glasshouse Hatchery', habit: 'Sunflower Rhythm Pavilion', wisdom: 'Orchid Crystal Archive', event: 'Leafroof Garden Hall' },
  9: { boss: 'Heartshaft Crucible', hatchery: 'Blastglass Incubator', habit: 'The Great Fuse', wisdom: 'Memory Press', event: 'Seismic Switchyard' },
  10: { boss: 'Rootheart Arena', hatchery: 'Acorn Cradle Hatchery', habit: 'Canopy Rhythm Lodge', wisdom: 'Spiralwood Library', event: 'Firefly Pulley Workshop' },
  14: { boss: 'Royal Honeycomb Palace', hatchery: "Queen's Nursery Hatchery", habit: 'Pollinator Yard', wisdom: 'Hive Archives', event: 'Nectar Trials Pavilion' },
  20: { boss: 'Crucible Citadel', hatchery: 'Magma Crucible Hatchery', habit: 'Fire Path Sanctum', wisdom: 'Obsidian Archive', event: 'Ashen Trialworks' },
};

const LANDMARK_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['foundation and nest bed', 'protective shell and supports', 'incubation chamber', 'handling and climate systems', 'hatch light and identity details'],
  habit: ['practice court and approach', 'working hall and columns', 'roof and shelter', 'rhythm or training apparatus', 'signal light and finishing details'],
  event: ['instrument foundation', 'chamber and access frame', 'canopy and alignment structure', 'primary mechanism', 'calibration energy and final optics'],
  wisdom: ['archive foundation', 'reading hall and structural stacks', 'roof and tower enclosure', 'books, instruments, and access systems', 'archive light and crown details'],
  boss: ['ceremonial court', 'lower palace or arena body', 'major towers, wings, and gateways', 'central ceremonial mechanism', 'crown, core, and victory light'],
};

const LANDMARK_RIGS: Readonly<Record<Island5LandmarkId, ConstructionRigKind>> = {
  hatchery: 'cradle-hoist',
  habit: 'facade-platform',
  event: 'alignment-rail',
  wisdom: 'archive-lift',
  boss: 'commissioning-crane',
};

const HONEYCOMB_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['amber nursery plinth and brood bed', 'royal egg shell and honeycomb supports', 'brood wings and crown ring', 'incubation cells and nursery mechanisms', 'queen-bee crest, flowers, and hatch lights'],
  habit: ['hexagonal practice court and nectar paths', 'pollinator planters and bee totem', 'golden pergola and shelter ring', 'discipline stations and shared-work apparatus', 'honey lanterns, flowers, and completion halo'],
  event: ['nectar trial plinth and ceremonial floor', 'trial columns and participant ring', 'purple canopy and golden crown rail', 'nectar core and crossed trial hammers', 'royal banners and bee victory crest'],
  wisdom: ['archive plinth and reading threshold', 'hexagonal reading hall and cell walls', 'upper archive tower and hive dome', 'open book, reading pods, and knowledge cells', 'wisdom crown, purple glazing, and archivist bee'],
  boss: ['royal honey court and processional stairs', 'lower palace keep and honeycomb walls', 'turrets, domes, and upper royal silhouette', 'palace windows, banners, and hive mechanisms', 'queen-bee crown, victory lamps, and royal halo'],
};

const HONEYCOMB_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'honeycomb-queens-nursery-cradle-hoist', stationOffset: 0, stationStep: 1, relocationSeconds: 1.48,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 2 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'wrench', 'project-manager': 'clamp', 'mini-artist': 'welder' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'panel-stack', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  habit: {
    styleId: 'honeycomb-pollinator-yard-facade', stationOffset: 2, stationStep: -1, relocationSeconds: 1.42,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  event: {
    styleId: 'honeycomb-nectar-trials-alignment-rail', stationOffset: 5, stationStep: 1, relocationSeconds: 1.36,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 3, finish: 1 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'wrench', 'project-manager': 'clamp', 'mini-artist': 'welder' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  wisdom: {
    styleId: 'honeycomb-hive-archives-book-lift', stationOffset: 3, stationStep: -1, relocationSeconds: 1.62,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 0 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'wrench', 'project-manager': 'clamp', 'mini-artist': 'welder' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'panel-stack', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  boss: {
    styleId: 'honeycomb-royal-palace-commissioning', stationOffset: 4, stationStep: 1, relocationSeconds: 1.5,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'panel-stack', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
};

const FROSTMOON_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['frozen plinth and sled runners', 'icewood roost ribs and windbreak', 'snow-loaded feather roof', 'heated nest cradle and vent wheel', 'feather lantern and frost-crystal clamps'],
  habit: ['packed-snow court and timber sleepers', 'hearthguard posts and shield walls', 'indigo shelter roof and snow braces', 'training dummies and warming braziers', 'yard banners and ice-lantern commissioning'],
  event: ['moonwell footing and alignment sled', 'observatory drum and icewood access frame', 'snow canopy and telescope cradle', 'moon lens, gears, and tracking rail', 'violet optics and frost-crystal calibration'],
  wisdom: ['archive stone ring and book-sled dock', 'timber stacks and insulated reading hall', 'round indigo roof and frostfire chimney', 'book lift, shelves, and hearth mechanism', 'frostfire crown light and brass index marks'],
  boss: ['aurora court and keep foundations', 'lower keep walls and icewood gates', 'snow towers, bridges, and indigo roofs', 'aurora focusing engine and hoist works', 'keep crown, beacon crystals, and victory light'],
};

const FROSTMOON_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'frostmoon-roost-sled-hoist',
    stationOffset: 0,
    relocationSeconds: 1.58,
    phaseTools: {
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
    },
    phaseMaterials: {
      foundation: ['timber-stack', 'island-blocks', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'cable-coil'],
      assemble: ['timber-stack', 'panel-stack', 'cable-coil'],
    },
  },
  habit: {
    styleId: 'frostmoon-hearthguard-yard',
    stationOffset: 3,
    relocationSeconds: 1.7,
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' },
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' },
      assemble: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'screwdriver' },
    },
    phaseMaterials: {
      foundation: ['timber-stack', 'island-blocks', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'panel-stack'],
      assemble: ['timber-stack', 'panel-stack', 'bolt-crate'],
    },
  },
  event: {
    styleId: 'frostmoon-moonwell-alignment',
    stationOffset: 5,
    relocationSeconds: 1.46,
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'drill', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'beam-stack', 'bolt-crate'],
      frame: ['beam-stack', 'pipe-bundle', 'cable-coil'],
      assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'],
    },
  },
  wisdom: {
    styleId: 'frostmoon-archive-book-lift',
    stationOffset: 4,
    relocationSeconds: 1.78,
    phaseTools: {
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'timber-stack', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'panel-stack'],
      assemble: ['timber-stack', 'panel-stack', 'cable-coil'],
    },
  },
  boss: {
    styleId: 'frostmoon-aurora-keep-commissioning',
    stationOffset: 4,
    relocationSeconds: 1.52,
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'drill' },
      frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'circular-saw', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'beam-stack', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'pipe-bundle'],
      assemble: ['timber-stack', 'panel-stack', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
};

const CROWN_TIDES_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['reefstone basin and tide-channel footing', 'pearl posts and coral cradle ribs', 'open hatchery sanctuary and shell crown', 'water gates, cradle hoist, and climate pipes', 'hatch lanterns and living-coral commissioning'],
  habit: ['driftwood sleepers and tidal court', 'patched hall walls and pearl pilasters', 'purple sail roof and gold ridge braces', 'training rails, tide wheel, and rope tackle', 'hall crest, signal pennants, and window lights'],
  event: ['open arena pitch, drainage bed, and entry lane', 'low spectator terraces and team tunnels', 'canopy spars, rails, and viewing platform', 'scoreboard, goals, and floodlight rig', 'team standards, trophy plinth, and match lights'],
  wisdom: ['reading terrace and shelf-wall footing', 'archive wings, shelves, and scroll columns', 'gabled roofs, balcony, and gold cornices', 'book lift, lamps, and codex mechanism', 'knowledge rays, pearl beacons, and archive seal'],
  boss: ['floodgate court and bridge foundations', 'citadel walls, portal frame, and buttresses', 'tower caps, upper wings, and crown deck', 'floodgate machinery, tide pipes, and prism hoist', 'royal crown, Voice Prism, and victory beacon'],
};

const CROWN_TIDES_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'crown-tides-coral-cradle-hoist',
    stationOffset: 0,
    stationStep: 1,
    relocationSeconds: 1.62,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 1, finish: 2 },
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'wrench', 'project-manager': 'clamp', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'pipe-bundle', 'bolt-crate'],
      frame: ['timber-stack', 'pipe-bundle', 'cable-coil'],
      assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
  habit: {
    styleId: 'crown-tides-tidekeeper-sail-rig',
    stationOffset: 3,
    stationStep: -1,
    relocationSeconds: 1.76,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 1 },
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' },
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' },
      assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'clamp', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['timber-stack', 'island-blocks', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'cable-coil'],
      assemble: ['timber-stack', 'panel-stack', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
  event: {
    styleId: 'crown-tides-concord-arena-fitout',
    stationOffset: 5,
    stationStep: 1,
    relocationSeconds: 1.42,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 3, finish: 1 },
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'timber-stack', 'bolt-crate'],
      frame: ['beam-stack', 'pipe-bundle', 'cable-coil'],
      assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
  wisdom: {
    styleId: 'crown-tides-pearl-archive-lift',
    stationOffset: 4,
    stationStep: -1,
    relocationSeconds: 1.84,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 0 },
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' },
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'timber-stack', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'panel-stack'],
      assemble: ['timber-stack', 'panel-stack', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
  boss: {
    styleId: 'crown-tides-citadel-floodgate-commissioning',
    stationOffset: 4,
    stationStep: 1,
    relocationSeconds: 1.54,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'drill' },
      frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'beam-stack', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'pipe-bundle'],
      assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
};

const SUNSHORE_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['grotto basin and warm-sand nest bed', 'bamboo cradle ribs and shellstone windbreak', 'palm-shell canopy and hatch chamber', 'incubation fans, water pipes, and egg turner', 'sun lantern, shell charms, and hatch beacon'],
  habit: ['beach pad, rollers, and open-air approach', 'bamboo lodge posts and turquoise lashings', 'palm roof, shade sails, and rain channels', 'habit boards, rhythm rails, and training stations', 'sun flags, shell lamps, and welcome crest'],
  event: ['tidepool footing and oracle alignment marks', 'shellstone chamber and bamboo access frame', 'tideglass canopy and lens cradle', 'water clock, prism wheel, and tracking rail', 'oracle glow, horizon marks, and final optics'],
  wisdom: ['star terrace and shellstone archive footing', 'bamboo shelf halls and reading stacks', 'stargazer roof, balcony, and shade canopy', 'book lift, telescope, and constellation mechanism', 'star lanterns, brass index, and archive seal'],
  boss: ['sunwheel court and beach drainage bed', 'arena terraces, gates, and shellstone tunnels', 'bamboo towers, shade sails, and upper deck', 'sunwheel scoreboard, goals, and victory mechanism', 'champion banners, crown fire, and arena beacon'],
};

const SUNSHORE_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'sunshore-egg-grotto-cradle-rig',
    stationOffset: 0,
    stationStep: 1,
    relocationSeconds: 1.48,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 1 },
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' },
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'timber-stack', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'cable-coil'],
      assemble: ['timber-stack', 'panel-stack', 'pipe-bundle'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
  habit: {
    styleId: 'sunshore-open-air-lodge-lashing',
    stationOffset: 2,
    stationStep: -1,
    relocationSeconds: 1.56,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'drill' },
      assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['timber-stack', 'island-blocks', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'cable-coil'],
      assemble: ['timber-stack', 'panel-stack', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
  event: {
    styleId: 'sunshore-tideglass-oracle-alignment',
    stationOffset: 5,
    stationStep: 1,
    relocationSeconds: 1.44,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 2 },
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'drill', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'pipe-bundle', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'pipe-bundle'],
      assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
  wisdom: {
    styleId: 'sunshore-star-archive-lift',
    stationOffset: 3,
    stationStep: -1,
    relocationSeconds: 1.72,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 0 },
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' },
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'timber-stack', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'panel-stack'],
      assemble: ['timber-stack', 'panel-stack', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
  boss: {
    styleId: 'sunshore-sunwheel-arena-commissioning',
    stationOffset: 1,
    stationStep: 1,
    relocationSeconds: 1.38,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: {
      foundation: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'drill' },
      frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' },
    },
    phaseMaterials: {
      foundation: ['island-blocks', 'timber-stack', 'bolt-crate'],
      frame: ['timber-stack', 'beam-stack', 'pipe-bundle'],
      assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'],
      finish: ['panel-stack', 'cable-coil', 'bolt-crate'],
    },
  },
};

const MOONVEIL_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['moon-nest plinth and levitation anchors', 'arcframe crescent ribs and alloy cradle', 'violet glass canopy and conservatory shell', 'lunar incubator, star pipes, and orbit rails', 'constellation lights and moon-nest beacon'],
  habit: ['constellation grid and calibration footing', 'alloy court pylons and neon access frames', 'moon-sail canopy and floating brace ring', 'training nodes, rhythm emitters, and score rail', 'court glyphs, violet lamps, and signal crown'],
  event: ['rift footing and observatory datum ring', 'midnight drum and floating access rails', 'violet lens canopy and arcframe cradle', 'rift aperture, tracking gears, and prism drive', 'horizon glyphs and final neon calibration'],
  wisdom: ['midnight plinth and archive alignment grid', 'alloy stack halls and luminous shelf frames', 'dark-moon roof and levitating balcony', 'codex lift, star map, and memory conduits', 'archive sigils and constellation crown'],
  boss: ['moon-gate court and anchor foundations', 'portal pylons, lower gates, and alloy buttresses', 'arc wings, upper bridge, and crescent towers', 'rift engine, calibration rings, and gate drive', 'Noctyra crest, violet core, and victory beacon'],
};

const MOONVEIL_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'moonveil-moon-nest-levitation-rig', stationOffset: 0, stationStep: 1, relocationSeconds: 1.5,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'wrench' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'welder' },
    },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  habit: {
    styleId: 'moonveil-constellation-court-calibration', stationOffset: 2, stationStep: -1, relocationSeconds: 1.42,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 2 },
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'welder', 'project-manager': 'measuring-laser', 'mini-artist': 'wrench' },
      assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  event: {
    styleId: 'moonveil-violet-rift-optics', stationOffset: 5, stationStep: 1, relocationSeconds: 1.66,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 0 },
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' },
      assemble: { 'heavy-worker': 'drill', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' },
    },
    phaseMaterials: { foundation: ['island-blocks', 'pipe-bundle', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  wisdom: {
    styleId: 'moonveil-midnight-archive-lift', stationOffset: 3, stationStep: -1, relocationSeconds: 1.8,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 3, finish: 1 },
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' },
      frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'wrench' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' },
    },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'panel-stack', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  boss: {
    styleId: 'moonveil-noctyra-gate-commissioning', stationOffset: 4, stationStep: 1, relocationSeconds: 1.54,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: {
      foundation: { 'heavy-worker': 'drill', 'project-manager': 'clamp', 'mini-artist': 'measuring-laser' },
      frame: { 'heavy-worker': 'welder', 'project-manager': 'measuring-laser', 'mini-artist': 'wrench' },
      assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
      finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' },
    },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
};

const ABYSSAL_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['nautilus basin and buoyant footing', 'living-coral ribs and pearl cradle', 'shell grotto canopy and nursery chamber', 'current pumps, egg turner, and bubble rails', 'pearl lanterns and hatch-current beacon'],
  habit: ['reef terrace and sanctuary approach', 'coral columns and kelp-bound shelter frame', 'living canopy and pearl roof fans', 'current rails, rhythm shells, and habitat stations', 'reef lights, sanctuary crest, and fish-call chimes'],
  event: ['current portal footing and compass datum', 'pearl pylons and nautilus access chamber', 'coral arch, buoyant rails, and lens canopy', 'compass turbine, current rings, and portal drive', 'navigation pearls and final current calibration'],
  wisdom: ['tide terrace and archive anchor bed', 'shell stacks and coral reading halls', 'pearl dome, balcony, and kelp shade', 'memory shells, current lift, and chart mechanism', 'tide glyphs and archive luminescence'],
  boss: ['throne court and reef foundations', 'palace shell, pearl gates, and coral buttresses', 'upper fins, nautilus towers, and crown bridge', 'tidal engine, throne lift, and current conduits', 'pearl crown, royal core, and victory glow'],
};

const ABYSSAL_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'abyssal-nautilus-buoyant-cradle', stationOffset: 0, stationStep: 1, relocationSeconds: 1.62,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 2 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'wrench', 'project-manager': 'clamp', 'mini-artist': 'welder' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'pipe-bundle', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  habit: {
    styleId: 'abyssal-living-reef-sanctuary-bind', stationOffset: 2, stationStep: -1, relocationSeconds: 1.74,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  event: {
    styleId: 'abyssal-compass-current-portal', stationOffset: 5, stationStep: 1, relocationSeconds: 1.46,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 0 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' }, assemble: { 'heavy-worker': 'drill', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' } },
    phaseMaterials: { foundation: ['island-blocks', 'pipe-bundle', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  wisdom: {
    styleId: 'abyssal-tidemind-shell-lift', stationOffset: 3, stationStep: -1, relocationSeconds: 1.86,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 3, finish: 1 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'wrench', 'project-manager': 'clamp', 'mini-artist': 'welder' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'pipe-bundle', 'bolt-crate'], frame: ['beam-stack', 'panel-stack', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  boss: {
    styleId: 'abyssal-pearl-throne-commissioning', stationOffset: 4, stationStep: 1, relocationSeconds: 1.58,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'clamp', 'mini-artist': 'measuring-laser' }, frame: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
};

const EVERBLOSSOM_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['tulip bed and glasshouse root footing', 'pale-wood ribs and vinebound cradle', 'petal glass canopy and nursery shell', 'irrigation stems, egg turner, and pollen fans', 'tulip lanterns and hatch-bloom crown'],
  habit: ['sunflower court and rootwood sleepers', 'pavilion posts and woven vine walls', 'leaf shade roof and petal canopy', 'rhythm drums, training rails, and seed stations', 'sunflower lamps, banners, and rhythm crest'],
  event: ['garden hall roots and path foundation', 'leafroof columns and pale-wood access frame', 'branch canopy, blossom balcony, and vine rails', 'garden lift, water wheel, and pollinator mechanism', 'firefly flowers and hall beacon'],
  wisdom: ['orchid terrace and crystal-root footing', 'archive stems, shelf halls, and vine stairs', 'orchid canopy, balcony, and petal roof', 'book lift, prism flowers, and index mechanism', 'crystal blooms and archive crown'],
  boss: ['blossom court and citadel root bed', 'lower petal walls, gates, and trunk buttresses', 'flower towers, branch bridges, and crown canopy', 'saplight engine, bloom lift, and irrigation heart', 'Blossom Crown, royal flower, and victory glow'],
};

const EVERBLOSSOM_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'everblossom-tulip-glasshouse-weave', stationOffset: 0, stationStep: 1, relocationSeconds: 1.6,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  habit: {
    styleId: 'everblossom-sunflower-pavilion-lashing', stationOffset: 2, stationStep: -1, relocationSeconds: 1.48,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 2 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'drill' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['timber-stack', 'island-blocks', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  event: {
    styleId: 'everblossom-leafroof-garden-rig', stationOffset: 5, stationStep: 1, relocationSeconds: 1.7,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 3, finish: 1 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'pipe-bundle'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  wisdom: {
    styleId: 'everblossom-orchid-archive-lift', stationOffset: 3, stationStep: -1, relocationSeconds: 1.82,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 0 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'panel-stack'], assemble: ['timber-stack', 'panel-stack', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  boss: {
    styleId: 'everblossom-blossom-crown-commissioning', stationOffset: 4, stationStep: 1, relocationSeconds: 1.56,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'measuring-laser', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'pipe-bundle'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
};

const HEARTSHAFT_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['blastglass pit and heatproof footing', 'black-iron cradle and furnace ribs', 'slagglass hood and insulated incubator shell', 'ember vents, egg turner, and pressure lines', 'hatch flame, warning gauges, and blastglass crown'],
  habit: ['fuse trench and shock-absorbing sleepers', 'iron pylons and reinforced practice bay', 'blast shield roof and exhaust braces', 'great fuse, timing rails, and training switches', 'hazard lamps, charge marks, and ignition crest'],
  event: ['switchyard bed and seismic anchor grid', 'iron gantries and access frames', 'overhead rails, crane braces, and signal deck', 'seismic switches, drive rods, and relay engine', 'warning beacons and final load calibration'],
  wisdom: ['memory-press plinth and cooling channels', 'archive frames, plate stacks, and iron halls', 'press roof, exhaust tower, and service bridge', 'memory rollers, stamp engine, and retrieval lift', 'index lights, engraved plates, and archive seal'],
  boss: ['crucible court and magma foundations', 'furnace walls, iron gates, and lower stacks', 'chimneys, crane bridges, and upper blast shields', 'heartshaft engine, molten channels, and core press', 'crucible crown, master flame, and victory beacon'],
};

const HEARTSHAFT_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'heartshaft-blastglass-incubator-rig', stationOffset: 0, stationStep: 1, relocationSeconds: 1.38,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  habit: {
    styleId: 'heartshaft-great-fuse-assembly', stationOffset: 2, stationStep: -1, relocationSeconds: 1.32,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 2 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'measuring-laser', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'welder' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  event: {
    styleId: 'heartshaft-seismic-switchyard-rail', stationOffset: 5, stationStep: 1, relocationSeconds: 1.46,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 3, finish: 1 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'measuring-laser', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  wisdom: {
    styleId: 'heartshaft-memory-press-lift', stationOffset: 3, stationStep: -1, relocationSeconds: 1.7,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 0 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'welder' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'panel-stack', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  boss: {
    styleId: 'heartshaft-crucible-core-commissioning', stationOffset: 4, stationStep: 1, relocationSeconds: 1.5,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'clamp', 'mini-artist': 'measuring-laser' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'measuring-laser', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' } },
    phaseMaterials: { foundation: ['island-blocks', 'beam-stack', 'bolt-crate'], frame: ['beam-stack', 'pipe-bundle', 'cable-coil'], assemble: ['panel-stack', 'pipe-bundle', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
};

const ROOTHEART_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['acorn bed and root cradle footing', 'rootwood ribs and sapbound shell frame', 'leaf cap and nursery canopy', 'seed turner, sap pipes, and warming pulley', 'firefly lamps and acorn hatch crown'],
  habit: ['canopy deck and branch sleepers', 'rhythm lodge posts and woven bark walls', 'leafroof shelter and rope bridges', 'drums, practice rails, and saplight stations', 'canopy pennants and rhythm lanterns'],
  event: ['workshop roots and pulley anchor bed', 'bamboo frames and branch gantries', 'leaf canopy, hoist bridge, and rope rails', 'firefly pulleys, lift drums, and transfer crane', 'workshop signals and final saplight calibration'],
  wisdom: ['spiral root terrace and library footing', 'curved shelf trunks and reading platforms', 'spiralwood roof, canopy balcony, and branch stairs', 'book hoist, index wheel, and vine lift', 'firefly script, wisdom lanterns, and library crown'],
  boss: ['rootheart court and arena foundations', 'bark terraces, gates, and trunk buttresses', 'branch towers, canopy sails, and upper bridges', 'arena lift, score drum, and rootheart mechanism', 'champion leaves, saplight crown, and victory fireflies'],
};

const ROOTHEART_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: {
    styleId: 'rootheart-acorn-cradle-hoist', stationOffset: 0, stationStep: 1, relocationSeconds: 1.64,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 2 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  habit: {
    styleId: 'rootheart-canopy-rhythm-lashing', stationOffset: 2, stationStep: -1, relocationSeconds: 1.52,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'drill' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'wrench', 'project-manager': 'measuring-laser', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['timber-stack', 'island-blocks', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  event: {
    styleId: 'rootheart-firefly-pulley-workshop', stationOffset: 5, stationStep: 1, relocationSeconds: 1.42,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 3, finish: 1 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'pipe-bundle'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  wisdom: {
    styleId: 'rootheart-spiralwood-library-lift', stationOffset: 3, stationStep: -1, relocationSeconds: 1.84,
    phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 0 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'panel-stack'], assemble: ['timber-stack', 'panel-stack', 'cable-coil'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
  boss: {
    styleId: 'rootheart-arena-canopy-commissioning', stationOffset: 4, stationStep: 1, relocationSeconds: 1.56,
    phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 },
    phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'circular-saw', 'project-manager': 'measuring-laser', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' } },
    phaseMaterials: { foundation: ['island-blocks', 'timber-stack', 'bolt-crate'], frame: ['timber-stack', 'beam-stack', 'cable-coil'], assemble: ['timber-stack', 'panel-stack', 'pipe-bundle'], finish: ['panel-stack', 'cable-coil', 'bolt-crate'] },
  },
};

const LAVA_LABYRINTH_STAGE_STORIES: Readonly<Record<Island5LandmarkId, readonly [string, string, string, string, string]>> = {
  hatchery: ['buried furnace bed and slag channel', 'black-iron egg cradle and heat ribs', 'magma egg shell and vent crown', 'incubation bellows, gauges, and handling rail', 'hatch flame, crack glow, and brass commissioning seal'],
  habit: ['fire-path court and choice markers', 'obsidian columns and open arch ring', 'iron shelter crown and smoke vents', 'practice braziers and calm-focus stations', 'steady flame halo and discipline banners'],
  event: ['trial floor and ash drainage bed', 'vent towers and participant frame', 'iron rail canopy and heat shields', 'trial gate, pressure drums, and focus mechanism', 'Blaze Trials standards and calibrated forge lights'],
  wisdom: ['archive plinth and cooled threshold', 'obsidian vault and reading recesses', 'stepped keep and iron crown', 'wisdom steles, index wheel, and book lift', 'brass archive seal and ember-script illumination'],
  boss: ['buried arena plinth and four gate landings', 'curtain labyrinth, buttresses, and lower keep', 'Crucible tower, gate arches, and flame crown', 'Iron Skiff davit, navigation gatehouses, and molten escape channel', 'Pyre Sentinel socket, magnetic extraction cradle, and victory beacon'],
};

const LAVA_LABYRINTH_CHOREOGRAPHY: Readonly<Record<Island5LandmarkId, ConstructionChoreography>> = {
  hatchery: { styleId: 'lava-labyrinth-magma-crucible-hoist', stationOffset: 0, stationStep: 1, relocationSeconds: 1.46, phaseStationOffsets: { foundation: 0, frame: 1, assemble: 3, finish: 2 }, phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'drill' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } }, phaseMaterials: { foundation: ['island-blocks','beam-stack','bolt-crate'], frame: ['beam-stack','pipe-bundle','cable-coil'], assemble: ['panel-stack','pipe-bundle','cable-coil'], finish: ['panel-stack','cable-coil','bolt-crate'] } },
  habit: { styleId: 'lava-labyrinth-fire-path-forgeframe', stationOffset: 2, stationStep: -1, relocationSeconds: 1.38, phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 }, phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'drill' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'paint-sprayer' } }, phaseMaterials: { foundation: ['island-blocks','beam-stack','bolt-crate'], frame: ['beam-stack','panel-stack','cable-coil'], assemble: ['panel-stack','pipe-bundle','cable-coil'], finish: ['panel-stack','cable-coil','bolt-crate'] } },
  event: { styleId: 'lava-labyrinth-ashen-trialworks-rail', stationOffset: 5, stationStep: 1, relocationSeconds: 1.34, phaseStationOffsets: { foundation: 0, frame: 2, assemble: 3, finish: 1 }, phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'wrench', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' } }, phaseMaterials: { foundation: ['island-blocks','beam-stack','bolt-crate'], frame: ['beam-stack','pipe-bundle','cable-coil'], assemble: ['panel-stack','pipe-bundle','cable-coil'], finish: ['panel-stack','cable-coil','bolt-crate'] } },
  wisdom: { styleId: 'lava-labyrinth-obsidian-archive-lift', stationOffset: 3, stationStep: -1, relocationSeconds: 1.58, phaseStationOffsets: { foundation: 0, frame: 1, assemble: 2, finish: 0 }, phaseTools: { foundation: { 'heavy-worker': 'drill', 'project-manager': 'measuring-laser', 'mini-artist': 'clamp' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'clamp', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' } }, phaseMaterials: { foundation: ['island-blocks','beam-stack','bolt-crate'], frame: ['beam-stack','panel-stack','cable-coil'], assemble: ['panel-stack','pipe-bundle','cable-coil'], finish: ['panel-stack','cable-coil','bolt-crate'] } },
  boss: { styleId: 'lava-labyrinth-crucible-citadel-commissioning', stationOffset: 4, stationStep: 1, relocationSeconds: 1.44, phaseStationOffsets: { foundation: 0, frame: 2, assemble: 1, finish: 3 }, phaseTools: { foundation: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'measuring-laser' }, frame: { 'heavy-worker': 'welder', 'project-manager': 'measuring-laser', 'mini-artist': 'wrench' }, assemble: { 'heavy-worker': 'cable-reel', 'project-manager': 'wrench', 'mini-artist': 'screwdriver' }, finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'wrench', 'mini-artist': 'welder' } }, phaseMaterials: { foundation: ['island-blocks','beam-stack','bolt-crate'], frame: ['beam-stack','pipe-bundle','cable-coil'], assemble: ['panel-stack','pipe-bundle','cable-coil'], finish: ['panel-stack','cable-coil','bolt-crate'] } },
};

function resolveConstructionChoreography(
  worldSourceNumber: number,
  landmarkId: Island5LandmarkId,
  rigKind: ConstructionRigKind,
): ConstructionChoreography {
  if (worldSourceNumber === 3) return FROSTMOON_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 4) return CROWN_TIDES_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 5) return SUNSHORE_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 6) return MOONVEIL_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 7) return ABYSSAL_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 8) return EVERBLOSSOM_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 9) return HEARTSHAFT_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 10) return ROOTHEART_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 14) return HONEYCOMB_CHOREOGRAPHY[landmarkId];
  if (worldSourceNumber === 20) return LAVA_LABYRINTH_CHOREOGRAPHY[landmarkId];
  return {
    styleId: `world-${worldSourceNumber}-${landmarkId}-${rigKind}`,
    stationOffset: (['boss', 'hatchery', 'habit', 'wisdom', 'event'] as Island5LandmarkId[]).indexOf(landmarkId),
  };
}

export const ISLAND_LANDMARK_CONSTRUCTION_PROFILES: readonly IslandLandmarkConstructionProfile[] = (
  Object.entries(WORLD_LANDMARK_LABELS).flatMap(([worldSourceNumber, labels]) => (
    (Object.keys(labels) as Island5LandmarkId[]).map((landmarkId) => ({
      worldSourceNumber: Number(worldSourceNumber),
      landmarkId,
      label: labels[landmarkId],
      rigKind: LANDMARK_RIGS[landmarkId],
      stageNames: Number(worldSourceNumber) === 3
        ? FROSTMOON_STAGE_STORIES[landmarkId]
        : Number(worldSourceNumber) === 4
          ? CROWN_TIDES_STAGE_STORIES[landmarkId]
          : Number(worldSourceNumber) === 5
            ? SUNSHORE_STAGE_STORIES[landmarkId]
            : Number(worldSourceNumber) === 6
              ? MOONVEIL_STAGE_STORIES[landmarkId]
              : Number(worldSourceNumber) === 7
                ? ABYSSAL_STAGE_STORIES[landmarkId]
                : Number(worldSourceNumber) === 8
                  ? EVERBLOSSOM_STAGE_STORIES[landmarkId]
                  : Number(worldSourceNumber) === 9
                    ? HEARTSHAFT_STAGE_STORIES[landmarkId]
                    : Number(worldSourceNumber) === 10
                      ? ROOTHEART_STAGE_STORIES[landmarkId]
                    : Number(worldSourceNumber) === 14
                      ? HONEYCOMB_STAGE_STORIES[landmarkId]
                    : Number(worldSourceNumber) === 20
                      ? LAVA_LABYRINTH_STAGE_STORIES[landmarkId]
                      : LANDMARK_STAGE_STORIES[landmarkId],
      choreography: resolveConstructionChoreography(
        Number(worldSourceNumber),
        landmarkId,
        LANDMARK_RIGS[landmarkId],
      ),
    }))
  ))
);

const PROFILE_BY_KEY = new Map(
  ISLAND_LANDMARK_CONSTRUCTION_PROFILES.map((profile) => [
    `${profile.worldSourceNumber}:${profile.landmarkId}`,
    profile,
  ]),
);

export function resolveIslandLandmarkConstructionProfile(
  worldSourceNumber: number,
  landmarkId: Island5LandmarkId,
) {
  return PROFILE_BY_KEY.get(`${worldSourceNumber}:${landmarkId}`) ?? null;
}

function inheritedName(entry: THREE.Object3D, root: THREE.Object3D) {
  const names: string[] = [];
  let cursor: THREE.Object3D | null = entry;
  while (cursor) {
    // The landmark root often contains words such as CROWN, GATE, ARCHIVE,
    // or HATCHERY. Applying that label to every descendant collapses the
    // entire building into one reveal stage, so only part/group semantics
    // below the root participate in stage inference.
    if (cursor !== root && cursor.name) names.push(cursor.name.toLowerCase());
    if (cursor === root) break;
    cursor = cursor.parent;
  }
  if (entry instanceof THREE.Mesh) {
    const materials = Array.isArray(entry.material) ? entry.material : [entry.material];
    materials.forEach((material) => {
      if (material.name) names.push(material.name.toLowerCase());
    });
  }
  return names.join(' ');
}

const STAGE_KEYWORDS: ReadonlyArray<readonly [number, RegExp]> = [
  [1, /foundation|base|plinth|terrace|court|floor|path|step|stair|root|bed|rail-sleeper/],
  [2, /wall|shell|column|pillar|post|lower|body|hall|frame|support|arch/],
  [3, /roof|dome|canopy|bridge|upper|wing|tower|gateway|rafter|branch/],
  [4, /book|shelf|lens|instrument|machine|gear|wheel|pulley|cradle|nest|workshop|altar|table|seat|portal/],
  [5, /light|glow|crystal|emissive|banner|crest|crown|finial|star|flower|petal|core|flame|spark/],
];

function resolveAuthoredStage(
  mesh: THREE.Mesh,
  root: THREE.Object3D,
  rootBounds: THREE.Box3,
) {
  const name = inheritedName(mesh, root);
  let keywordStage: number | null = null;
  STAGE_KEYWORDS.forEach(([stage, pattern]) => {
    if (pattern.test(name)) keywordStage = stage;
  });
  const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  const normalizedHeight = THREE.MathUtils.clamp(
    (center.y - rootBounds.min.y) / Math.max(0.001, rootBounds.max.y - rootBounds.min.y),
    0,
    1,
  );
  const heightStage = THREE.MathUtils.clamp(Math.floor(normalizedHeight * 5) + 1, 1, 5);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const hasFinalLight = materials.some((material) => {
    const candidate = material as THREE.MeshStandardMaterial & { transmission?: number };
    return material instanceof THREE.MeshBasicMaterial
      || (candidate.emissive instanceof THREE.Color
        && candidate.emissive.getHex() !== 0
        && candidate.emissiveIntensity > 0.6)
      || (candidate.transmission ?? 0) > 0.45;
  });
  if (hasFinalLight) return 5;
  return THREE.MathUtils.clamp(keywordStage ?? heightStage, 1, 5);
}

function beamBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  radialSegments: number,
) {
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments);
  geometry.applyMatrix4(new THREE.Matrix4().compose(
    start.clone().add(end).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    new THREE.Vector3(1, 1, 1),
  ));
  return geometry;
}

function box(
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  rotationY = 0,
) {
  const geometry = new THREE.BoxGeometry(...size);
  geometry.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  return geometry;
}

function merge(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Could not merge authored landmark construction rig');
  return merged;
}

function makeRigStage(
  root: THREE.Group,
  profile: IslandLandmarkConstructionProfile,
  stage: number,
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(merge(geometries), material);
  mesh.name = `ISLAND_RUN_${profile.worldSourceNumber}_${profile.landmarkId.toUpperCase()}_CONSTRUCTION_STAGE_${stage}`;
  mesh.castShadow = true;
  mesh.receiveShadow = stage < 5;
  mesh.userData.constructionStage = stage;
  mesh.userData.constructionTemporary = true;
  mesh.userData.constructionRig = profile.rigKind;
  root.add(mesh);
}

function createCompactLandmarkRig(options: {
  profile: IslandLandmarkConstructionProfile;
  targetBounds: THREE.Box3;
  quality: Island3DQuality;
}) {
  const { profile, targetBounds } = options;
  const scaffoldProfile = resolveIslandConstructionScaffoldProfile(profile.worldSourceNumber);
  const root = new THREE.Group();
  root.name = `ISLAND_RUN_${scaffoldProfile.id.toUpperCase().replace(/-/g, '_')}_${profile.landmarkId.toUpperCase()}_${profile.rigKind.toUpperCase().replace(/-/g, '_')}`;
  root.userData.constructionStage = 1;
  root.userData.constructionTemporary = true;
  root.userData.constructionRig = {
    worldSourceNumber: profile.worldSourceNumber,
    landmarkId: profile.landmarkId,
    label: profile.label,
    rigKind: profile.rigKind,
    profileId: scaffoldProfile.id,
    localFacadeOnly: true,
  };

  const size = targetBounds.getSize(new THREE.Vector3());
  const center = targetBounds.getCenter(new THREE.Vector3());
  const width = Math.max(0.9, size.x * (profile.landmarkId === 'boss' ? 0.42 : 0.52));
  const height = Math.max(0.9, size.y * (profile.landmarkId === 'boss' ? 0.55 : 0.68));
  const frontZ = targetBounds.max.z + Math.max(0.08, size.z * 0.035);
  const sideX = center.x + size.x * 0.32;
  const floorY = targetBounds.min.y;
  const beamRadius = Math.max(0.018, Math.min(size.x, size.z) * 0.012);
  const segments = options.quality === 'high' ? 8 : 6;
  const primary = new THREE.MeshStandardMaterial({
    color: scaffoldProfile.primary,
    roughness: scaffoldProfile.metallic ? 0.3 : 0.68,
    metalness: scaffoldProfile.metallic ? 0.66 : 0.03,
  });
  const secondary = new THREE.MeshStandardMaterial({
    color: scaffoldProfile.secondary,
    roughness: scaffoldProfile.metallic ? 0.38 : 0.74,
    metalness: scaffoldProfile.metallic ? 0.38 : 0.02,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: scaffoldProfile.accent,
    emissive: scaffoldProfile.accent,
    emissiveIntensity: scaffoldProfile.motif === 'forge' || scaffoldProfile.motif === 'arc' ? 0.92 : 0.34,
    roughness: 0.3,
    metalness: scaffoldProfile.metallic ? 0.32 : 0.02,
    toneMapped: false,
  });

  // Stage 1: a short façade rail/sled. It occupies only the camera-facing
  // work zone and never wraps around the building.
  makeRigStage(root, profile, 1, [
    box([width * 1.16, beamRadius * 2.3, beamRadius * 4.2], [center.x, floorY + beamRadius, frontZ]),
    box([beamRadius * 4, beamRadius * 1.8, size.z * 0.26], [center.x - width * 0.34, floorY + beamRadius * 0.7, frontZ - size.z * 0.08]),
    box([beamRadius * 4, beamRadius * 1.8, size.z * 0.26], [center.x + width * 0.34, floorY + beamRadius * 0.7, frontZ - size.z * 0.08]),
  ], primary);

  // Stage 2: one asymmetric pair of service posts, deliberately not four
  // corners and not a perimeter cage.
  makeRigStage(root, profile, 2, [
    beamBetween(new THREE.Vector3(sideX, floorY, frontZ), new THREE.Vector3(sideX, floorY + height, frontZ), beamRadius, segments),
    beamBetween(new THREE.Vector3(sideX - width * 0.34, floorY, frontZ), new THREE.Vector3(sideX - width * 0.34, floorY + height * 0.72, frontZ), beamRadius, segments),
  ], primary);

  // Stage 3: a narrow deck and diagonal access brace.
  makeRigStage(root, profile, 3, [
    box([width * 0.7, beamRadius * 2, beamRadius * 5], [sideX - width * 0.17, floorY + height * 0.7, frontZ]),
    beamBetween(
      new THREE.Vector3(sideX - width * 0.34, floorY + height * 0.08, frontZ),
      new THREE.Vector3(sideX, floorY + height * 0.68, frontZ),
      beamRadius * 0.62,
      segments,
    ),
  ], secondary);

  const stageFour: THREE.BufferGeometry[] = [];
  if (profile.rigKind === 'cradle-hoist') {
    stageFour.push(
      beamBetween(new THREE.Vector3(sideX, floorY + height, frontZ), new THREE.Vector3(center.x, floorY + height, frontZ), beamRadius * 0.72, segments),
      beamBetween(new THREE.Vector3(center.x, floorY + height, frontZ), new THREE.Vector3(center.x, floorY + height * 0.48, frontZ), beamRadius * 0.42, segments),
      new THREE.SphereGeometry(width * 0.11, segments, Math.max(4, segments - 2)).translate(center.x, floorY + height * 0.42, frontZ),
    );
  } else if (profile.rigKind === 'alignment-rail') {
    const hoop = new THREE.TorusGeometry(width * 0.19, beamRadius * 0.72, Math.max(4, segments - 2), segments * 2);
    hoop.rotateX(Math.PI / 2);
    hoop.translate(center.x, floorY + height * 0.45, frontZ);
    stageFour.push(hoop, box([width * 0.26, beamRadius * 3, width * 0.18], [center.x, floorY + beamRadius * 2, frontZ]));
  } else if (profile.rigKind === 'archive-lift') {
    stageFour.push(
      beamBetween(new THREE.Vector3(sideX, floorY + height, frontZ), new THREE.Vector3(center.x - width * 0.2, floorY + height, frontZ), beamRadius * 0.7, segments),
      box([width * 0.32, beamRadius * 3.2, width * 0.22], [center.x - width * 0.2, floorY + height * 0.34, frontZ]),
    );
  } else if (profile.rigKind === 'commissioning-crane') {
    stageFour.push(
      beamBetween(new THREE.Vector3(sideX, floorY + height, frontZ), new THREE.Vector3(center.x - width * 0.32, floorY + height * 0.92, frontZ), beamRadius * 0.82, segments),
      box([width * 0.36, beamRadius * 3.6, width * 0.24], [center.x - width * 0.18, floorY + beamRadius * 2.2, frontZ]),
    );
  } else {
    stageFour.push(
      box([width * 0.68, beamRadius * 2.5, width * 0.18], [center.x, floorY + height * 0.48, frontZ]),
      beamBetween(new THREE.Vector3(center.x - width * 0.34, floorY + height * 0.48, frontZ), new THREE.Vector3(center.x + width * 0.34, floorY + height * 0.48, frontZ), beamRadius * 0.52, segments),
    );
  }
  makeRigStage(root, profile, 4, stageFour, secondary);

  const markerGeometry = scaffoldProfile.motif === 'cloud' || scaffoldProfile.motif === 'bloom'
    ? new THREE.SphereGeometry(width * 0.07, segments, Math.max(4, segments - 2)).scale(1.5, 0.72, 1)
    : scaffoldProfile.motif === 'rope' || scaffoldProfile.motif === 'bamboo'
      ? new THREE.BoxGeometry(width * 0.11, width * 0.16, width * 0.045)
      : new THREE.ConeGeometry(width * 0.065, width * 0.2, segments);
  markerGeometry.translate(sideX, floorY + height + width * 0.1, frontZ);
  makeRigStage(root, profile, 5, [markerGeometry], accent);

  root.userData.sculptRuntime = {
    presentationOnly: true,
    clickable: false,
    explodable: true,
    profileId: scaffoldProfile.id,
    partIds: root.children.map((child) => child.name),
  };
  return root;
}

export function applyIslandConstructionAuthoring(options: {
  root: THREE.Group;
  worldSourceNumber: number;
  landmarkId: Island5LandmarkId;
  quality: Island3DQuality;
  includeTemporaryRig: boolean;
}) {
  const profile = resolveIslandLandmarkConstructionProfile(options.worldSourceNumber, options.landmarkId);
  if (!profile) return null;
  options.root.updateWorldMatrix(true, true);
  const rootBounds = new THREE.Box3().setFromObject(options.root);
  const stageCounts: Record<number, number> = {};
  options.root.traverse((entry) => {
    if (!(entry instanceof THREE.Mesh) || entry.userData.constructionStage !== undefined) return;
    const stage = resolveAuthoredStage(entry, options.root, rootBounds);
    entry.userData.constructionStage = stage;
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
  });
  let rig: THREE.Group | null = null;
  if (options.includeTemporaryRig) {
    rig = createCompactLandmarkRig({ profile, targetBounds: rootBounds, quality: options.quality });
    options.root.add(rig);
  }
  options.root.userData.authoredConstruction = {
    schema: 'island-authored-construction-v1',
    worldSourceNumber: options.worldSourceNumber,
    landmarkId: options.landmarkId,
    label: profile.label,
    rigKind: profile.rigKind,
    stageNames: profile.stageNames,
    choreography: profile.choreography,
    stageCounts,
    temporaryRig: Boolean(rig),
  };
  return { profile, stageCounts, rig };
}
