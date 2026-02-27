export type IslandDynamicStopKind =
  | 'habit_action'
  | 'checkin_reflection'
  | 'utility_support'
  | 'event_challenge'
  | 'mini_game';

export interface IslandStopPlanEntry {
  stopId: 'hatchery' | 'minigame' | 'market' | 'utility' | 'boss';
  tileIndex: number;
  title: string;
  description: string;
  kind: 'fixed_hatchery' | 'fixed_boss' | IslandDynamicStopKind;
  isBehaviorStop: boolean;
}

const DYNAMIC_STOP_POOL: Array<{
  kind: IslandDynamicStopKind;
  title: string;
  description: string;
  isBehaviorStop: boolean;
}> = [
  {
    kind: 'habit_action',
    title: '✅ Action Stop',
    description: 'Complete one habit/action objective to stabilize momentum.',
    isBehaviorStop: true,
  },
  {
    kind: 'checkin_reflection',
    title: '🧭 Check-in Stop',
    description: 'Run a quick check-in/reflection to calibrate your next moves.',
    isBehaviorStop: true,
  },
  {
    kind: 'utility_support',
    title: '🧰 Utility Stop',
    description: 'Take a utility/support action (shield, cleanup, reroute, prep).',
    isBehaviorStop: false,
  },
  {
    kind: 'event_challenge',
    title: '⚡ Event Stop',
    description: 'Resolve a challenge event with risk/reward tradeoffs.',
    isBehaviorStop: false,
  },
  {
    kind: 'mini_game',
    title: '🎮 Mini-game Stop',
    description: 'Trigger an island mini-game challenge from this stop.',
    isBehaviorStop: false,
  },
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pickUniqueIndices(seedBase: number, count: number, max: number) {
  const selected = new Set<number>();
  let cursor = 0;

  while (selected.size < count && cursor < 500) {
    const candidate = Math.floor(seededRandom(seedBase + cursor * 1.37) * max);
    selected.add(candidate);
    cursor += 1;
  }

  return Array.from(selected).slice(0, count);
}

export function generateIslandStopPlan(islandNumber: number): IslandStopPlanEntry[] {
  const safeIsland = Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;

  // Three dynamic stop slots map to stop ids minigame/market/utility on tiles 4/8/12.
  const dynamicIndices = pickUniqueIndices(97 + safeIsland * 13, 3, DYNAMIC_STOP_POOL.length);
  let selected = dynamicIndices.map((idx) => DYNAMIC_STOP_POOL[idx]);

  // Constraint: each island must contain at least one real-life behavior stop.
  if (!selected.some((entry) => entry.isBehaviorStop)) {
    selected[0] = DYNAMIC_STOP_POOL[safeIsland % 2 === 0 ? 0 : 1];
  }

  return [
    {
      stopId: 'hatchery',
      tileIndex: 0,
      title: '🥚 Hatchery Stop',
      description: 'Set one egg and track stage progression over time.',
      kind: 'fixed_hatchery',
      isBehaviorStop: false,
    },
    {
      stopId: 'minigame',
      tileIndex: 4,
      title: selected[0].title,
      description: selected[0].description,
      kind: selected[0].kind,
      isBehaviorStop: selected[0].isBehaviorStop,
    },
    {
      stopId: 'market',
      tileIndex: 8,
      title: selected[1].title,
      description: selected[1].description,
      kind: selected[1].kind,
      isBehaviorStop: selected[1].isBehaviorStop,
    },
    {
      stopId: 'utility',
      tileIndex: 12,
      title: selected[2].title,
      description: selected[2].description,
      kind: selected[2].kind,
      isBehaviorStop: selected[2].isBehaviorStop,
    },
    {
      stopId: 'boss',
      tileIndex: 16,
      title: '👑 Boss Stop',
      description: 'Boss trial closes the island and unlocks the next island.',
      kind: 'fixed_boss',
      isBehaviorStop: false,
    },
  ];
}
