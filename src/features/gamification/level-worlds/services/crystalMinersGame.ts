/** Deterministic merge-and-drop engine. All currency/state writes belong to the action service. */
export const MINER_COLUMNS = 5;
export const MINER_SLOTS = 25;
export const MINER_ROWS = 28;
export const MINER_MAX_TIER = 20;
export const MINER_LEVEL_COUNT = 40;
export const MINER_WIDTH = 300;
export const MINER_HEIGHT = 1120;
export const MINER_STEP = 1 / 60;
export const MINER_MAX_STEPS = 2400;
export const MINER_BLOCK_TOP = 116;
export const MINER_BLOCK_HEIGHT = 29;
export function minerBlockY(block: MinerBlock): number { return block.kind === 'treasure' ? MINER_HEIGHT - 64 : MINER_BLOCK_TOP + Math.floor(block.id / MINER_COLUMNS) * MINER_BLOCK_HEIGHT; }

export interface MinerBlock { id: number; hp: number; maxHp: number; kind: 'ticket' | 'spawner' | 'balloon' | 'ember' | 'stone' | 'ore' | 'crystal' | 'treasure' | 'ice' | 'brick' | 'iron' | 'tnt' | 'gift' | 'boss' | 'deflector' }
export interface MinerReceipt { ticketDrops: number; dig: number; ore: number; broken: number; treasures: number; cleared: boolean; rewardProgress: number; score: number; depth: number; gifts: number; milestoneRewards: string[] }
export interface MinerEventTrack { levelsCleared: number; claimedMilestones: number[] }
export const EMPTY_MINER_EVENT_TRACK: MinerEventTrack = { levelsCleared: 0, claimedMilestones: [] };
export const MINER_EVENT_MILESTONES = [
  { levels: 1, name: 'First discovery', label: '25 dice', icon: '🎲', dice: 25, essence: 0, tickets: 0, mystery: false },
  { levels: 10, name: 'Treasure falls', label: '200 dice', icon: '🎲', dice: 200, essence: 0, tickets: 0, mystery: false },
  { levels: 15, name: 'Sealed surprise', label: 'Mystery gift', icon: '🎁', dice: 0, essence: 0, tickets: 0, mystery: true },
  { levels: 20, name: 'Keep exploring', label: '20 drop tickets', icon: '▰', dice: 0, essence: 0, tickets: 20, mystery: false },
  { levels: 30, name: 'Deep fortune', label: '500 dice', icon: '🎲', dice: 500, essence: 0, tickets: 0, mystery: false },
  { levels: 35, name: 'Island fortune', label: '5,000 Essence', icon: '✦', dice: 0, essence: 5000, tickets: 0, mystery: false },
  { levels: 40, name: 'The grand vault', label: '1,500 dice', icon: '🎲', dice: 1500, essence: 0, tickets: 0, mystery: false },
] as const;
/** Stable per-player surprise: retrying or changing islands cannot reroll it. */
export function resolveMinerMilestoneReward(milestone: typeof MINER_EVENT_MILESTONES[number], playerId: string) {
  if (!milestone.mystery) return { dice: milestone.dice, essence: milestone.essence, tickets: milestone.tickets, label: milestone.label as string };
  let hash = 2166136261;
  for (const char of playerId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return [
    { dice: 150, essence: 0, tickets: 0, label: 'Mystery gift: 150 dice!' },
    { dice: 0, essence: 1000, tickets: 0, label: 'Mystery gift: 1,000 Essence!' },
    { dice: 0, essence: 0, tickets: 15, label: 'Mystery gift: 15 drop tickets!' },
  ][hash % 3];
}
export interface CrystalMinersProgress {
  version: 7; dropTickets: number; forgeLevel: number; revision: number; level: number; ore: number; tools: number[]; blocks: MinerBlock[];
  digs: number; bought: number; totalOre: number; totalTreasures: number; updatedAtMs: number;
  lastReceipt: MinerReceipt | null; giftsWaiting: number; totalScore: number; bestScore: number;
  eventTrack: MinerEventTrack; superGiftSlots: number[]; superGiftsWaiting: number; giftsGenerated: number;
}
export interface MinerBody { id: number; tier: number; lane: number; x: number; y: number; vx: number; vy: number; angle: number; hits: number; cooldown: number; active: boolean }
export interface MinerHit { blockId: number; x: number; y: number; broken: boolean; kind: MinerBlock['kind']; step: number }
export interface MinerFrame { step: number; bodies: MinerBody[]; blocks: MinerBlock[]; hits: MinerHit[] }
export interface MinerSimulation { ticketDrops: number; spawnedTools: number; frames: MinerFrame[]; blocks: MinerBlock[]; ore: number; broken: number; treasures: number; cleared: boolean; score: number; depth: number; gifts: number }
export const MINER_GROUP_MERGE_LEVEL = 25;
export type MinerCommand = {kind:'merge_group'; tier:number} | { kind: 'upgrade' } | { kind: 'trash'; slot: number } | { kind: 'buy' } | { kind: 'open'; slot: number } | { kind: 'gift' } | { kind: 'move'; from: number; to: number } | { kind: 'dig' } | { kind: 'claim'; milestone: number };

export const MINER_TIER_NAMES = ['Copper spade', 'Iron spade', 'Steel pick', 'Jade pick', 'Crystal pick', 'Sunsteel pick', 'Amethyst drill', 'Aurora drill', 'Starforged drill', 'Prism core', 'Solar core', 'Moonstone core', 'Nebula hammer', 'Comet hammer', 'Nova hammer', 'Astral breaker', 'Cosmic breaker', 'Galaxy drill', 'Infinity drill', 'Celestial core'];
export const MINER_TIER_COLORS = ['#eeac6b', '#b6d5e1', '#74bbef', '#63e4bb', '#b596ff', '#ffe28b', '#ef91f2', '#6af1f7', '#f6adff', '#f9f5cf', '#ffd889', '#b7c9ff', '#e5abfa', '#a6f2e3', '#ffabbd', '#f8ea9b', '#a9cffc', '#d2a2ff', '#f6bbde', '#ffffff'];
/** Upper tiers keep improving without one lucky gift trivializing the whole campaign. */
export function minerToolPower(tier: number): number { return Math.round(Math.pow(2, Math.min(6, tier - 1)) * Math.pow(1.25, Math.max(0, tier - 7))); }
export const MINER_FORGE_UNLOCKS = [1, 5, 10, 20, 30] as const;
export function minerForgeCost(progress: CrystalMinersProgress): number { return 90 * Math.pow(2, progress.forgeLevel); }
export function upgradeMinerForge(progress: CrystalMinersProgress): CrystalMinersProgress | null {
  if (progress.forgeLevel >= MINER_FORGE_UNLOCKS.length || progress.level < MINER_FORGE_UNLOCKS[progress.forgeLevel] || progress.ore < minerForgeCost(progress)) return null;
  return { ...progress, forgeLevel: progress.forgeLevel + 1, ore: progress.ore - minerForgeCost(progress) };
}
/** Read-only pacing guidance. Ticket balance never changes physics or payout odds. */
export function getMinerReadiness(progress: CrystalMinersProgress) {
  const target = minerToolPower(minerRecommendedTier(progress.level)) * 2;
  const lanePower = Array.from({length:MINER_COLUMNS},(_,lane)=>progress.tools.reduce((sum,t,index)=>sum+(index%MINER_COLUMNS===lane && t>0 ? minerToolPower(t) : 0),0));
  return { lanePower, readyLanes: lanePower.filter(power=>power>=target).length, targetPower:target,
    neededLanes:minerChestsRequired(progress.level), stage:isMinerBossCavern(progress.level)?'boss':minerChestsRequired(progress.level)===2?'approach':'normal', nextBoss:Math.min(40,Math.ceil(progress.level/10)*10) };
}
export function minerBuyCost(progress: CrystalMinersProgress): number { return (14 + Math.min(46, Math.floor(progress.bought / 4) * 2)) * (1 + Math.floor((progress.level - 1) / 10)); }
export function isMinerRewardCavern(level: number): boolean { return level >= 10 && level <= MINER_LEVEL_COUNT && level % 10 === 0; }
export function isMinerBossCavern(level: number): boolean { return isMinerRewardCavern(level); }
export function minerChestsRequired(level: number): number { return level % 10 === 8 || level % 10 === 9 ? 2 : 1; }
export const MINER_CHEST_REWARDS = [
  { ore: 35, gifts: 0, label: '35 ore', color: '#d8ac72' },
  { ore: 55, gifts: 0, label: '55 ore', color: '#d3e5ed' },
  { ore: 25, gifts: 1, label: '25 ore + gift', color: '#d5a4f6' },
  { ore: 80, gifts: 0, label: '80 ore', color: '#91e5bd' },
  { ore: 100, gifts: 0, label: '100 ore', color: '#ffe697' },
] as const;
export function minerRecommendedTier(level: number): number { return Math.min(9, 1 + Math.floor((level - 1) / 5) + (minerChestsRequired(level) === 2 || isMinerBossCavern(level) ? 1 : 0)); }
export function minerBuyTier(level: number): number { return Math.min(6, 1 + Math.floor((level - 1) / 7)); }

export function createMinerBlocks(level: number, layoutVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 7): MinerBlock[] {
  const legacy = layoutVersion === 1;
  return Array.from({ length: MINER_COLUMNS * MINER_ROWS }, (_, id) => {
    const row = Math.floor(id / MINER_COLUMNS);
    const column = id % MINER_COLUMNS;
    const hash = (id * 37 + level * 17) % 101;
    // Every tenth cavern is a generous freefall round: every lane has reachable
    // prizes and soft seams. Coverage matters more than an overpowered tool.
    if (legacy ? level > 1 && level % 5 === 1 : isMinerRewardCavern(level)) {
      const treasure = row === MINER_ROWS - 1 && (layoutVersion >= 3 || column % 2 === 0);
      if (layoutVersion >= 3 && row === 8 && column === 2) {
        const hp = Math.ceil((layoutVersion >= 5 ? 90 : 48) * Math.pow(layoutVersion >= 5 ? 1.16 : 1.13, level - 1));
        return { id, kind: 'boss', hp, maxHp: hp };
      }
      const prizeRow = row % 4 === 2;
      const kind: MinerBlock['kind'] = layoutVersion>=7 && row===22 && column===2 ? 'ticket' : treasure ? 'treasure' : row === (layoutVersion >= 6 ? 14 : 10) || row === 22 ? 'gift' : column % 2 === 0 ? 'crystal' : 'ore';
      return { id, kind, hp: layoutVersion >= 6 && row >= 9 && row <= 13 ? 0 : treasure || prizeRow ? 1 : 0, maxHp: 1 };
    }
    const isBossHall = (legacy ? level % 5 === 0 : layoutVersion === 2 && (level % 5 === 0 || level % 10 === 9)) && row >= MINER_ROWS - 4 && row < MINER_ROWS - 1;
    const bossCell = isBossHall && row === MINER_ROWS - 2 && column === 2;
    const deflector = layoutVersion >= 4 && level % 4 === 3 && row === 12 && column === level % 5;
    const special:MinerBlock['kind']|null=layoutVersion>=7 ? level%10===6&&row===19&&column===level%5?'ticket':level%10===4&&row===15&&column===level%5?'spawner':level>=3&&row===6&&column===(level+1)%5?'balloon':level>=5&&row===18&&column===(level+2)%5?'ember':null : null;
    const kind: MinerBlock['kind'] = special ?? (deflector ? 'deflector' : bossCell ? 'boss' : row === MINER_ROWS - 1 && (layoutVersion >= 3 || column % 2 === 0) ? 'treasure'
      : row > 2 && hash % 19 === 0 ? 'gift'
      : row > 2 && hash % 17 === 0 ? 'tnt'
      : row > 5 && hash % 9 === 0 ? 'iron'
      : hash % 7 === 0 ? 'crystal'
      : hash % 5 === 0 ? 'ore'
      : Math.floor(row / 5) % 3 === 0 ? 'ice'
      : Math.floor(row / 5) % 3 === 1 ? 'brick' : 'stone');
    const hardness = kind === 'boss' ? 20 : kind === 'iron' ? 2.2 : kind === 'ice' ? .65 : kind === 'tnt' || kind === 'gift' ? .4 : 1;
    const maxHp = layoutVersion >= 3 && (kind === 'treasure' || kind === 'deflector' || kind === 'ticket' || kind === 'spawner' || kind === 'balloon') ? 1 : Math.max(1, Math.ceil((layoutVersion >= 3 && minerChestsRequired(level) === 2 ? layoutVersion >= 5 ? 2.5 : 1.35 : 1) * (1 + row * .17) * Math.pow(legacy || layoutVersion >= 5 ? 1.16 : 1.13, Math.min(level - 1, legacy ? 35 : 39)) * hardness));
    const gap = row > 1 && row < MINER_ROWS - 1 && (hash < 11 || (row % 9 === 5 && column === (level + row) % 5));
    // Authored lane shelves alternate impacts with visible stretches of freefall.
    const rhythm = (row + column * 2 + level) % 7;
    const scenicGap = layoutVersion >= 4 && row > 1 && row < MINER_ROWS - 1 &&
      (rhythm === 2 || rhythm === 3 || (minerChestsRequired(level) === 1 && rhythm === 6));
    return { id, kind, hp: kind !== 'deflector' && (!special && (gap || scenicGap || (isBossHall && !bossCell))) ? 0 : maxHp, maxHp };
  });
}
export function createCrystalMinersProgress(): CrystalMinersProgress {
  return { version: 7, dropTickets: 0, forgeLevel: 0, revision: 0, level: 1, ore: 42, eventTrack: { levelsCleared: 0, claimedMilestones: [] }, superGiftSlots: [], superGiftsWaiting: 0, giftsGenerated: 5,
    tools: [-1, -1, -2, -1, -1, 1, 1, 1, 1, 1, ...Array(15).fill(0)],
    blocks: createMinerBlocks(1), digs: 0, bought: 0, totalOre: 0, totalTreasures: 0, updatedAtMs: 0, lastReceipt: null, giftsWaiting: 0, totalScore: 0, bestScore: 0 };
}

/** Event keys are save checkpoints, not separate careers. The newest whole workshop
 * follows the player across islands and event rotations, including spent ore. */
export function getCrystalMinersCareer(checkpoints: Record<string, CrystalMinersProgress>): CrystalMinersProgress | null {
  let latest: CrystalMinersProgress | null = null;
  for (const progress of Object.values(checkpoints)) {
    if (!latest || progress.revision > latest.revision || (progress.revision === latest.revision && progress.updatedAtMs > latest.updatedAtMs)) latest = progress;
  }
  return latest;
}

/** Wrapped values hide the result; opening rolls once in the canonical action. */
export function rollMinerGiftTier(buyTier: number, superGift: boolean, roll: number): number {
  const r = Math.max(0,Math.min(.999999,Number.isFinite(roll)?roll:0));
  let tier = buyTier;
  if (superGift) {
    if (r >= .85) tier += 5 + Math.floor((r-.85)/.15*6);
    else if (r >= .5) tier += 3 + Math.floor((r-.5)/.35*2);
    else if (r >= .1) tier += 1 + Math.floor((r-.1)/.4*2);
  } else {
    if (r >= .995) tier += 5 + Math.floor((r-.995)/.005*6);
    else if (r >= .96) tier += 3 + Math.floor((r-.96)/.035*2);
    else if (r >= .93) tier = Math.max(1,1 + Math.floor((r-.93)/.03*Math.max(1,buyTier-1)));
    else if (r >= .7) tier += 1 + Math.floor((r-.7)/.23*2);
  }
  return Math.min(MINER_MAX_TIER,Math.max(1,tier));
}
export function openMinerGift(progress: CrystalMinersProgress, slot: number, roll = .75): CrystalMinersProgress | null {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MINER_SLOTS || progress.tools[slot] >= 0) return null;
  const tools = [...progress.tools]; tools[slot] = rollMinerGiftTier(minerBuyTier(progress.level),progress.superGiftSlots.includes(slot),roll);
  return { ...progress, tools, superGiftSlots: progress.superGiftSlots.filter(i=>i!==slot) };
}
export function claimWaitingMinerGift(progress: CrystalMinersProgress): CrystalMinersProgress | null {
  const slot = progress.tools.indexOf(0);
  if (slot < 0 || progress.giftsWaiting < 1) return null;
  const tools = [...progress.tools]; tools[slot] = -1;
  const isSuper = progress.superGiftsWaiting > 0;
  return { ...progress, tools, giftsWaiting: progress.giftsWaiting - 1,
    superGiftsWaiting: progress.superGiftsWaiting - (isSuper?1:0), superGiftSlots:isSuper?[...progress.superGiftSlots,slot]:progress.superGiftSlots };
}
/** Stable box rarity at dig settlement; revisiting/reloading cannot reroll boxes. */
export function minerGiftRarityRoll(ordinal: number): number {
  let hash = Math.imul(ordinal ^ 0x9e3779b9,0x85ebca6b);hash ^= hash>>>16;hash=Math.imul(hash,0xc2b2ae35);hash^=hash>>>16;
  return (hash>>>0)/4294967296;
}
export const MINER_LEAGUES = [
  { name: 'Copper', threshold: 0, color: '#deac7e' }, { name: 'Silver', threshold: 500, color: '#c5dce2' },
  { name: 'Gold', threshold: 1800, color: '#f1d179' }, { name: 'Emerald', threshold: 4500, color: '#83e5bc' },
  { name: 'Diamond', threshold: 10000, color: '#abeafb' },
] as const;
export function getMinerLeague(score: number) {
  let index = 0; while (index < MINER_LEAGUES.length - 1 && score >= MINER_LEAGUES[index + 1].threshold) index += 1;
  return { ...MINER_LEAGUES[index], index, next: MINER_LEAGUES[index + 1] ?? null };
}
/** Empty cells move, equal tiers merge, unlike tiers swap. Invalid commands are inert. */
export function arrangeMinerTools(progress: CrystalMinersProgress, from: number, to: number): CrystalMinersProgress | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= MINER_SLOTS || to >= MINER_SLOTS || from === to || progress.tools[from] <= 0 || progress.tools[to] < 0) return null;
  const tools = [...progress.tools];
  if (tools[from] === tools[to]) {
    if (tools[from] === MINER_MAX_TIER) return null;
    tools[to] += 1; tools[from] = 0;
  } else { [tools[from], tools[to]] = [tools[to], tools[from]]; }
  return { ...progress, tools };
}

/** One pass over the selected tier: no cascade, no cost, no movement of an odd leftover. */
export function mergeMinerToolGroup(progress:CrystalMinersProgress,tier:number):CrystalMinersProgress|null {
  if(progress.level<MINER_GROUP_MERGE_LEVEL || !Number.isInteger(tier) || tier<1 || tier>=MINER_MAX_TIER)return null;
  const slots=progress.tools.flatMap((value,index)=>value===tier?[index]:[]);
  if(slots.length<2)return null;
  const tools=[...progress.tools];
  for(let i=0;i+1<slots.length;i+=2){tools[slots[i]]=0;tools[slots[i+1]]=tier+1;}
  return {...progress,tools};
}
/** No salvage refund; keep one item so an empty wallet cannot strand the player. */
export function discardMinerTool(progress: CrystalMinersProgress, slot: number): CrystalMinersProgress | null {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MINER_SLOTS || progress.tools[slot] <= 0 || progress.tools.filter(Boolean).length <= 1) return null;
  const tools = [...progress.tools]; tools[slot] = 0;
  return { ...progress, tools };
}
export function buyMinerTool(progress: CrystalMinersProgress): CrystalMinersProgress | null {
  const slot = progress.tools.indexOf(0);
  const cost = minerBuyCost(progress);
  if (slot < 0 || progress.ore < cost) return null;
  const tools = [...progress.tools]; tools[slot] = minerBuyTier(progress.level);
  return { ...progress, tools, ore: progress.ore - cost, bought: progress.bought + 1 };
}

/** Fixed-step simulation. Replay is presentation; the service settles this exact outcome before animation. */
export function simulateMinerDig(progress: CrystalMinersProgress, captureFrames = true): MinerSimulation {
  const blocks = progress.blocks.map(block => ({ ...block }));
  const bodies: MinerBody[] = progress.tools.flatMap((tier, id) => tier > 0 ? [{
    id, tier, lane: id % MINER_COLUMNS, x: (id % MINER_COLUMNS) * 60 + 30, y: -10 - Math.floor(id / MINER_COLUMNS) * 26,
    vx: 0, vy: 30, angle: id * 0.7,
    hits: 9 + tier * 5 + progress.forgeLevel * 2, cooldown: 0, active: true,
  }] : []);
  const frames: MinerFrame[] = [];
  let ticketDrops=0;let spawnedTools=0;
  let ore = 0; let broken = 0; let treasures = 0; let gifts = 0; let depth = 0; let hits: MinerHit[] = [];
  const capture = (step: number) => {
    if (captureFrames) frames.push({ step, bodies: bodies.map(b => ({ ...b })), blocks: blocks.map(b => ({ ...b })), hits });
    hits = [];
  };
  const breakBlock = (block: MinerBlock, step: number) => {
    block.hp = 0; broken += 1;
    ore += block.kind === 'boss' ? 120 : block.kind === 'treasure' ? MINER_CHEST_REWARDS[block.id % MINER_COLUMNS].ore : block.kind === 'gift' ? 5 : block.kind === 'crystal' ? 14 : block.kind === 'ore' ? 8 : 3;
    if (block.kind === 'treasure') { depth = MINER_ROWS; treasures += 1; gifts += MINER_CHEST_REWARDS[block.id % MINER_COLUMNS].gifts; }
    if (block.kind === 'gift') gifts += 1;
    if(block.kind==='ticket')ticketDrops++;
    if(block.kind==='spawner'&&bodies.length<30){const tier=minerBuyTier(progress.level);const lane=block.id%MINER_COLUMNS;bodies.push({id:MINER_SLOTS+block.id,tier,lane,x:lane*60+30,y:minerBlockY(block)+15,vx:0,vy:120,angle:0,hits:6+tier*2,cooldown:.12,active:true});spawnedTools++;}
    if(block.kind==='balloon')gifts++;
    const row = Math.floor(block.id / MINER_COLUMNS); const column = block.id % MINER_COLUMNS;
    hits.push({ blockId: block.id, x: column * 60 + 30, y: minerBlockY(block), broken: true, kind: block.kind, step });
    if (block.kind === 'tnt') {
      for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
        const r = row + dr; const c = column + dc;
        if (r < 0 || r >= MINER_ROWS || c < 0 || c >= MINER_COLUMNS) continue;
        const neighbor = blocks[r * MINER_COLUMNS + c];
        if (neighbor.hp > 0 && neighbor.kind === 'boss') neighbor.hp = Math.max(1, neighbor.hp - Math.ceil(neighbor.maxHp * .15));
        else if (neighbor.hp > 0) breakBlock(neighbor, step);
      }
    }
  };
  capture(0);
  for (let step = 1; step <= MINER_MAX_STEPS; step += 1) {
    for (const body of bodies) {
      if (!body.active) continue;
      body.cooldown = Math.max(0, body.cooldown - MINER_STEP);
      body.vy = Math.min(440, body.vy + 650 * MINER_STEP);
      const previousY = body.y;
      // Ordinary impacts never change lanes. Only a marked deflector changes
      // the target lane; horizontal easing makes that exceptional turn readable.
      body.vx = ((body.lane * 60 + 30) - body.x) * 12;
      body.x += body.vx * MINER_STEP; body.y += body.vy * MINER_STEP;
      body.angle += (body.vx >= 0 ? 1 : -1) * MINER_STEP * 5;
      if (body.x < 12 || body.x > MINER_WIDTH - 12) {
        body.x = Math.max(12, Math.min(MINER_WIDTH - 12, body.x)); body.vx *= -0.9;
      }
      if (body.vy > 0 && body.cooldown === 0) {
        const column = body.lane;
        for (let row = 0; row < MINER_ROWS; row += 1) {
          const guardian = blocks[row * MINER_COLUMNS + 2];
          const block = guardian.kind === 'boss' && guardian.hp > 0 ? guardian : blocks[row * MINER_COLUMNS + column];
          const top = minerBlockY(block);
          if (block.hp <= 0 || previousY + 10 > top + 9 || body.y + 10 < top) continue;
          block.hp = Math.max(0, block.hp - minerToolPower(body.tier));
          body.hits -= 1; body.cooldown = 0.10; body.y = top - 11;
          body.vy = -(125 + body.tier * 7);

          const destroyed = block.hp === 0;
          if (destroyed) {
            breakBlock(block, step);
            if (block.kind === 'deflector') body.lane += body.lane === MINER_COLUMNS - 1 ? -1 : 1;
            else if (['ore','crystal','gift','treasure','ticket','spawner','balloon'].includes(block.kind)) body.vy = 200;
            else body.vy = -75;
          }
          else hits.push({ blockId: block.id, x: body.x, y: top, broken: false, kind: block.kind, step });
          if (body.hits <= 0) body.active = false;
          break;
        }
      }
      depth = Math.max(depth, Math.min(MINER_ROWS, Math.max(0, Math.floor((body.y - MINER_BLOCK_TOP) / (MINER_HEIGHT - 64 - MINER_BLOCK_TOP) * MINER_ROWS))));
      if (body.y > MINER_HEIGHT + 30) body.active = false;
    }
    if (step % 3 === 0 || !bodies.some(b => b.active)) capture(step);
    if (!bodies.some(b => b.active)) break;
  }
  return { ticketDrops, spawnedTools, frames, blocks, ore, broken, treasures, gifts, depth, score: broken * 10 + treasures * 150 + gifts * 40 + depth * 5, cleared: blocks.filter(b => b.kind === 'treasure' && b.hp === 0).length >= minerChestsRequired(progress.level) && !blocks.some(b => b.kind === 'boss' && b.hp > 0) };
}

export function settleMinerDig(progress: CrystalMinersProgress, simulation: MinerSimulation): CrystalMinersProgress {
  const level = Math.min(MINER_LEVEL_COUNT, progress.level + (simulation.cleared ? 1 : 0));
  const tools = [...progress.tools]; let giftsWaiting = progress.giftsWaiting + simulation.gifts;
  let superGiftsWaiting = progress.superGiftsWaiting;
  for(let i=0;i<simulation.gifts;i++)if(minerGiftRarityRoll(progress.giftsGenerated+i+1)<.05)superGiftsWaiting++;
  const superGiftSlots=[...progress.superGiftSlots];
  for (let i = 0; i < tools.length && giftsWaiting > 0; i += 1) if (tools[i] === 0) {
    tools[i] = -1; giftsWaiting -= 1;
    if(superGiftsWaiting>0){superGiftSlots.push(i);superGiftsWaiting--;}
  }
  return { ...progress, dropTickets:progress.dropTickets+simulation.ticketDrops, level, tools, giftsWaiting, superGiftSlots, superGiftsWaiting, giftsGenerated:progress.giftsGenerated+simulation.gifts, totalScore: progress.totalScore + simulation.score, bestScore: Math.max(progress.bestScore, simulation.score), blocks: simulation.cleared && progress.level < MINER_LEVEL_COUNT ? createMinerBlocks(level) : simulation.blocks,
    eventTrack: { ...progress.eventTrack, levelsCleared: Math.min(MINER_LEVEL_COUNT, Math.max(progress.eventTrack.levelsCleared, progress.level - 1) + (simulation.cleared ? 1 : 0)) },
    digs: progress.digs + 1, ore: progress.ore + simulation.ore, totalOre: progress.totalOre + simulation.ore,
    totalTreasures: progress.totalTreasures + simulation.treasures,
    lastReceipt: { ticketDrops:simulation.ticketDrops, dig: progress.digs + 1, ore: simulation.ore, broken: simulation.broken,
      treasures: simulation.treasures, cleared: simulation.cleared, rewardProgress: 0, score: simulation.score, depth: simulation.depth, gifts: simulation.gifts, milestoneRewards: [] } };
}

const integer = (value: unknown, fallback = 0, max = Number.MAX_SAFE_INTEGER): number => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : fallback;
/** Validate entire board/deck before admitting a save; never allow corrupted data to create tools or rewards. */
export function sanitizeCrystalMinersProgressByEvent(value: unknown, fallback: Record<string, CrystalMinersProgress> = {}): Record<string, CrystalMinersProgress> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const result: Record<string, CrystalMinersProgress> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!key || key.length > 200 || !raw || typeof raw !== 'object') continue;
    const input = raw as Omit<Partial<CrystalMinersProgress>, 'version'> & { version?: number };
    if ((input.version !== 1 && input.version !== 2 && input.version !== 3 && input.version !== 4 && input.version !== 5 && input.version !== 6 && input.version !== 7) || !Array.isArray(input.tools) || input.tools.length !== MINER_SLOTS
      || !input.tools.every(t => Number.isInteger(t) && t >= -MINER_MAX_TIER && t <= MINER_MAX_TIER) || !input.tools.some(t => t !== 0)
      || !Array.isArray(input.blocks) || input.blocks.length !== MINER_ROWS * MINER_COLUMNS) continue;
    const level = Math.max(1, integer(input.level, 1, MINER_LEVEL_COUNT));
    const expected = createMinerBlocks(level, input.version as 1 | 2 | 3 | 4 | 5 | 6 | 7);
    const matchesLayout = (layout: MinerBlock[]) => input.blocks!.every((b, i) => b && b.id === i && b.kind === layout[i].kind && b.maxHp === layout[i].maxHp && Number.isInteger(b.hp) && b.hp >= 0 && b.hp <= b.maxHp);
    // A development hot update can finish a dig with new terrain before the
    // old in-memory schema marker refreshes. Still require an exact valid layout.
    if (!matchesLayout(expected) && !matchesLayout(createMinerBlocks(level))) continue;
    const receipt = input.lastReceipt;
    const levelsCleared = Math.max(level - 1, integer(input.eventTrack?.levelsCleared, 0, MINER_LEVEL_COUNT));
    const claimedMilestones = Array.from(new Set(Array.isArray(input.eventTrack?.claimedMilestones) ? input.eventTrack.claimedMilestones.filter(n => MINER_EVENT_MILESTONES.some(m => m.levels === n && n <= levelsCleared)) : []));
    const migratedBlocks = input.version !== 7 ? createMinerBlocks(level).map((b,i)=> {
      const old = input.blocks![i];
      return {...b, hp: b.kind !== old.kind ? b.hp : old.hp === 0 ? 0 : Math.ceil(b.maxHp * old.hp / old.maxHp)};
    }) : input.blocks;
    result[key] = { version: 7, dropTickets: integer(input.dropTickets), forgeLevel: integer(input.forgeLevel, 0, MINER_FORGE_UNLOCKS.length), revision: integer(input.revision), level, ore: integer(input.ore),
      eventTrack: { levelsCleared, claimedMilestones },
      superGiftSlots: Array.from(new Set(Array.isArray(input.superGiftSlots)?input.superGiftSlots.filter(i=>Number.isInteger(i)&&i>=0&&i<MINER_SLOTS&&input.tools![i]<0):[])),
      superGiftsWaiting: Math.min(integer(input.giftsWaiting),integer(input.superGiftsWaiting)), giftsGenerated:integer(input.giftsGenerated,5),
      tools: [...input.tools], blocks: migratedBlocks.map(b => ({ ...b })), digs: integer(input.digs), bought: integer(input.bought),
      totalOre: integer(input.totalOre), totalTreasures: integer(input.totalTreasures), updatedAtMs: integer(input.updatedAtMs),
      lastReceipt: receipt && typeof receipt === 'object' ? { ticketDrops:integer(receipt.ticketDrops,0,5), dig: integer(receipt.dig), ore: integer(receipt.ore), broken: integer(receipt.broken, 0, MINER_ROWS * MINER_COLUMNS), treasures: integer(receipt.treasures, 0, 5), cleared: receipt.cleared === true, rewardProgress: integer(receipt.rewardProgress), score: integer(receipt.score), depth: integer(receipt.depth, 0, MINER_ROWS), gifts: integer(receipt.gifts), milestoneRewards: Array.isArray(receipt.milestoneRewards) ? receipt.milestoneRewards.filter((s): s is string=>typeof s==='string'&&s.length<150).slice(0,7) : [] } : null,
      giftsWaiting: integer(input.giftsWaiting), totalScore: integer(input.totalScore), bestScore: integer(input.bestScore) };
  }
  // Prune by career revision, not event-key insertion order: revisiting an old
  // event checkpoint must never drop the player's newest investment.
  return Object.fromEntries(Object.entries(result).sort(([, a], [, b]) => a.revision - b.revision || a.updatedAtMs - b.updatedAtMs).slice(-32));
}
export function mergeCrystalMinersProgressByEvent(remote: Record<string, CrystalMinersProgress>, local: Record<string, CrystalMinersProgress>): Record<string, CrystalMinersProgress> {
  const merged = { ...remote };
  for (const [key, progress] of Object.entries(local)) {
    const previous = merged[key];
    // Whole snapshot wins. Never maximize ore/tools independently: doing so resurrects spent material.
    if (!previous || progress.revision > previous.revision || (progress.revision === previous.revision && progress.updatedAtMs > previous.updatedAtMs)) merged[key] = progress;
  }
  return merged;
}
