// <define:import.meta.env>
var define_import_meta_env_default = {};

// src/features/gamification/level-worlds/services/crystalMinersCourses.ts
function minerCourseProfile(level2) {
  const boss = level2 % 10 === 0;
  const rows = boss ? 18 + Math.floor(level2 / 10) * 2 : 6 + Math.floor((level2 - 1) * 18 / 38);
  const recipe = level2 <= 2 ? "first_fall" : boss ? "reward_rain" : level2 >= 24 && (level2 % 4 === 0 || level2 === 39) ? "linked_vault" : level2 % 10 >= 8 ? "two_paths" : level2 === 4 || level2 % 4 === 1 ? "reinforcement" : level2 >= 7 && level2 % 4 === 3 ? "route_choice" : level2 >= 5 && level2 % 4 === 2 ? "demolition" : "soft_cascade";
  return { rows, height: 116 + rows * 29 + 180, recipe, requiredChests: level2 % 10 === 8 || level2 % 10 === 9 ? 2 : 1 };
}
function createAuthoredMinerBlocks(level2, targetPower) {
  const { rows, recipe } = minerCourseProfile(level2);
  const boss = level2 % 10 === 0, chapter = Math.floor((level2 - 1) / 10);
  const blocks = Array.from({ length: 140 }, (_, id2) => ({ id: id2, kind: id2 >= 135 ? "treasure" : "stone", hp: id2 >= 135 ? 1 : 0, maxHp: 1 }));
  const pressure = level2 <= 3 ? 0.7 : 2.5 + Math.min(8.5, (level2 - 4) * 0.25);
  const hardness = { ice: 0.55, iron: 2.1, obsidian: 1.65, tnt: 0.35, gift: 0.45, gate: 3 };
  const oneHit = /* @__PURE__ */ new Set(["treasure", "ticket", "spawner", "balloon", "deflector", "charger", "key"]);
  const put = (row, lane, kind, hp) => {
    const id2 = Math.min(26, Math.max(0, row)) * 5 + (lane + 5) % 5;
    const maxHp = hp ?? (oneHit.has(kind) ? 1 : Math.max(1, Math.ceil(targetPower * pressure * (0.8 + row / rows * 0.6) * (hardness[kind] ?? 1))));
    blocks[id2] = { id: id2, kind, hp: maxHp, maxHp };
    return id2;
  };
  if (boss) {
    const stage = level2 / 10;
    for (let row = 2; row < rows; row++) for (let lane = 0; lane < 5; lane++) {
      if (row >= 7 && row <= 12) continue;
      const prize = stage === 1 ? (row + lane) % 4 === 0 : stage === 2 ? row % 5 === 1 || lane % 2 === 0 && row % 5 === 3 : stage === 3 ? row % 4 === 2 && lane !== row % 5 : (row + lane * 2) % 5 <= 1;
      if (prize) put(row, lane, (row + lane) % 3 === 0 ? "crystal" : "ore", 1);
    }
    put(8, 2, "boss", Math.ceil(targetPower * (140 + stage * 35)));
    for (let lane = 0; lane < 5; lane++) put(rows - 3 + (lane + stage) % 2, lane, stage === 3 && lane % 2 === 0 ? "balloon" : "gift", 1);
    put(rows - 5, (stage * 2 + 1) % 5, "ticket");
    if (stage >= 2) put(rows - 7, (stage + 3) % 5, "charger");
    return blocks;
  }
  for (let row = 0; row < rows; row++) for (let lane = 0; lane < 5; lane++) {
    const hash = (row * 43 + lane * 29 + level2 * 19 + row * lane * 7) % 101;
    if (hash > 45 + level2 * 0.6 || row % 5 === 3) continue;
    let kind = row % 3 === 0 ? "ice" : level2 >= 3 && row % 3 === 1 ? "brick" : "stone";
    if (hash % 9 === 0) kind = "ore";
    else if (level2 >= 3 && hash % 13 === 0) kind = "crystal";
    else if (level2 >= 5 && row > 2 && hash % 17 === 0) kind = "iron";
    else if (level2 >= 21 && row > rows / 2 && hash % 19 === 0) kind = "obsidian";
    put(row, lane, kind);
  }
  const focus = (Math.floor(level2 / 4) + level2 * 2) % 5;
  const middle = Math.max(2, Math.floor(rows * 0.46));
  if (level2 <= 2) for (let lane = 0; lane < 5; lane++) put(1 + (lane + level2) % 3, lane, "ore", 1);
  if (level2 >= 2) put(rows - 2, (focus + 2) % 5, "gift");
  if (recipe === "demolition") {
    const r = Math.min(rows - 4, middle);
    put(r, focus, "tnt");
    put(r, (focus + 1) % 5, "iron");
    put(r + 1, focus, "iron");
    if (level2 >= 18) put(r + 1, (focus + 1) % 5, "tnt");
    put(r + 2, focus, "gift");
  }
  if (recipe === "reinforcement" || level2 === 4) {
    put(middle, focus, "spawner");
    put(middle + 2, focus, "iron");
    put(middle + 3, focus, "crystal");
  }
  if (recipe === "route_choice") {
    const destination = focus === 4 ? 3 : focus + 1;
    put(middle, focus, "deflector");
    put(middle + 2, destination, "crystal");
    put(middle + 3, destination, "gift");
  }
  if (level2 >= 7 && level2 % 3 === 1) put(2 + level2 % Math.max(1, rows - 5), (focus + 3) % 5, "balloon");
  if (level2 >= 11) put(Math.min(rows - 2, 3 + level2 % (rows - 3)), (focus + 1) % 5, "ember");
  if (level2 >= 16 && (level2 % 3 === 1 || recipe === "two_paths")) put(Math.max(2, Math.floor(rows * 0.6) - level2 % 3), (focus + 4) % 5, "charger");
  if (recipe === "linked_vault") {
    put(Math.floor(rows * 0.3), focus, "key");
    put(Math.floor(rows * 0.68), (focus + 1) % 5, "gate");
    put(Math.floor(rows * 0.74), (focus + 3) % 5, "gate");
    put(rows - 2, (focus + 3) % 5, "crystal");
  }
  if (level2 % 10 === 6) put(Math.min(rows - 2, Math.floor(rows * (0.45 + chapter * 0.1))), (chapter * 2 + Math.floor(level2 / 3)) % 5, "ticket");
  return blocks;
}

// src/features/gamification/level-worlds/services/crystalMinersGame.ts
var MINER_COLUMNS = 5;
var MINER_SLOTS = 25;
var MINER_ROWS = 28;
var MINER_MAX_TIER = 20;
var MINER_LEVEL_COUNT = 40;
var MINER_WIDTH = 300;
var MINER_HEIGHT = 1120;
var MINER_STEP = 1 / 60;
var MINER_MAX_STEPS = 2400;
var MINER_BLOCK_TOP = 116;
var MINER_BLOCK_HEIGHT = 29;
function minerCourseHeight(level2, layoutVersion = 10) {
  return layoutVersion < 10 ? MINER_HEIGHT : minerCourseProfile(level2).height;
}
function minerBlockY(block, level2 = 40, layoutVersion = 9) {
  return block.kind === "treasure" ? minerCourseHeight(level2, layoutVersion) - 64 : MINER_BLOCK_TOP + Math.floor(block.id / MINER_COLUMNS) * MINER_BLOCK_HEIGHT;
}
var MINER_EVENT_MILESTONES = [
  { levels: 1, name: "First discovery", label: "25 dice", icon: "\u{1F3B2}", dice: 25, essence: 0, tickets: 0, mystery: false },
  { levels: 10, name: "Treasure falls", label: "200 dice", icon: "\u{1F3B2}", dice: 200, essence: 0, tickets: 0, mystery: false },
  { levels: 15, name: "Sealed surprise", label: "Mystery gift", icon: "\u{1F381}", dice: 0, essence: 0, tickets: 0, mystery: true },
  { levels: 20, name: "Keep exploring", label: "20 drop tickets", icon: "\u25B0", dice: 0, essence: 0, tickets: 20, mystery: false },
  { levels: 30, name: "Deep fortune", label: "500 dice", icon: "\u{1F3B2}", dice: 500, essence: 0, tickets: 0, mystery: false },
  { levels: 35, name: "Island fortune", label: "5,000 Essence", icon: "\u2726", dice: 0, essence: 5e3, tickets: 0, mystery: false },
  { levels: 40, name: "The grand vault", label: "1,500 dice", icon: "\u{1F3B2}", dice: 1500, essence: 0, tickets: 0, mystery: false }
];
function resolveMinerMilestoneReward(milestone, playerId) {
  if (!milestone.mystery) return { dice: milestone.dice, essence: milestone.essence, tickets: milestone.tickets, label: milestone.label };
  let hash = 2166136261;
  for (const char of playerId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return [
    { dice: 150, essence: 0, tickets: 0, label: "Mystery gift: 150 dice!" },
    { dice: 0, essence: 1e3, tickets: 0, label: "Mystery gift: 1,000 Essence!" },
    { dice: 0, essence: 0, tickets: 15, label: "Mystery gift: 15 drop tickets!" }
  ][hash % 3];
}
var MINER_GROUP_MERGE_LEVEL = 25;
function minerToolPower(tier) {
  return Math.pow(2, Math.max(0, Math.min(MINER_MAX_TIER, tier) - 1));
}
function minerImpactBudget(tier, forgeLevel) {
  return 6 + tier * 3 + forgeLevel * 2;
}
var MINER_FORGE_UNLOCKS = [1, 5, 10, 20, 30];
function minerForgeCost(progress) {
  return 90 * Math.pow(2, progress.forgeLevel);
}
function upgradeMinerForge(progress) {
  if (progress.forgeLevel >= MINER_FORGE_UNLOCKS.length || progress.level < MINER_FORGE_UNLOCKS[progress.forgeLevel] || progress.ore < minerForgeCost(progress)) return null;
  return { ...progress, forgeLevel: progress.forgeLevel + 1, ore: progress.ore - minerForgeCost(progress) };
}
function getMinerReadiness(progress) {
  const target = minerToolPower(minerRecommendedTier(progress.level)) * 2;
  const lanePower = Array.from({ length: MINER_COLUMNS }, (_, lane) => progress.tools.reduce((sum, t, index) => sum + (index % MINER_COLUMNS === lane && t > 0 ? minerToolPower(t) : 0), 0));
  const guardianHp = progress.blocks.find((b) => b.kind === "boss")?.hp ?? 0;
  const laneResistance = Array.from({ length: MINER_COLUMNS }, (_, lane) => progress.blocks.reduce((sum, b) => sum + (b.id % MINER_COLUMNS === lane && b.kind !== "boss" ? b.hp : 0), 0) + guardianHp / MINER_COLUMNS);
  const laneCapacity = Array.from({ length: MINER_COLUMNS }, (_, lane) => progress.tools.reduce((sum, t, index) => sum + (index % MINER_COLUMNS === lane && t > 0 ? minerToolPower(t) * Math.max(0, minerImpactBudget(t, progress.forgeLevel) - progress.blocks.filter((b) => b.id % MINER_COLUMNS === lane && b.hp > 0).length / 2) : 0), 0));
  return {
    lanePower,
    laneCapacity,
    laneResistance,
    readyLanes: laneCapacity.filter((capacity, lane) => capacity > 0 && capacity >= laneResistance[lane] * 1.15).length,
    targetPower: target,
    neededLanes: minerChestsRequired(progress.level),
    stage: isMinerBossCavern(progress.level) ? "boss" : minerChestsRequired(progress.level) === 2 ? "approach" : "normal",
    nextBoss: Math.min(40, Math.ceil(progress.level / 10) * 10)
  };
}
function minerBuyCost(progress) {
  return (14 + Math.min(46, Math.floor(progress.bought / 4) * 2)) * (1 + Math.floor((progress.level - 1) / 10));
}
function isMinerRewardCavern(level2) {
  return level2 >= 10 && level2 <= MINER_LEVEL_COUNT && level2 % 10 === 0;
}
function isMinerBossCavern(level2) {
  return isMinerRewardCavern(level2);
}
function minerChestsRequired(level2) {
  return level2 % 10 === 8 || level2 % 10 === 9 ? 2 : 1;
}
var MINER_CHEST_REWARDS = [
  { ore: 35, gifts: 0, label: "35 ore", color: "#d8ac72" },
  { ore: 55, gifts: 0, label: "55 ore", color: "#d3e5ed" },
  { ore: 25, gifts: 1, label: "25 ore + gift", color: "#d5a4f6" },
  { ore: 80, gifts: 0, label: "80 ore", color: "#91e5bd" },
  { ore: 100, gifts: 0, label: "100 ore", color: "#ffe697" }
];
function minerBlockOre(block, level2, layoutVersion = 10) {
  const base = block.kind === "boss" ? 120 : block.kind === "treasure" ? MINER_CHEST_REWARDS[block.id % 5].ore : block.kind === "gift" ? 5 : block.kind === "crystal" ? 14 : block.kind === "ore" ? 8 : 3;
  return base * (layoutVersion >= 10 && block.kind !== "treasure" ? 1 + Math.floor((level2 - 1) / 10) : 1);
}
function minerRecommendedTier(level2) {
  return Math.min(14, 1 + Math.floor((level2 - 1) / 3) + (minerChestsRequired(level2) === 2 || isMinerBossCavern(level2) ? 1 : 0));
}
function minerBuyTier(level2) {
  return Math.min(10, 1 + Math.floor((level2 - 1) / 4));
}
function createMinerBlocks(level2, layoutVersion = 10) {
  if (layoutVersion >= 10) return createAuthoredMinerBlocks(level2, minerToolPower(minerRecommendedTier(level2)));
  const legacy = layoutVersion === 1;
  return Array.from({ length: MINER_COLUMNS * MINER_ROWS }, (_, id2) => {
    const row = Math.floor(id2 / MINER_COLUMNS);
    const column = id2 % MINER_COLUMNS;
    const hash = (id2 * 37 + level2 * 17) % 101;
    if (legacy ? level2 > 1 && level2 % 5 === 1 : isMinerRewardCavern(level2)) {
      const treasure = row === MINER_ROWS - 1 && (layoutVersion >= 3 || column % 2 === 0);
      if (layoutVersion >= 3 && row === 8 && column === 2) {
        const hp = Math.ceil((layoutVersion >= 9 ? 1.5 + level2 * 0.02 : 1) * (layoutVersion >= 5 ? 90 : 48) * Math.pow(layoutVersion >= 5 ? 1.16 : 1.13, level2 - 1));
        return { id: id2, kind: "boss", hp, maxHp: hp };
      }
      const prizeRow = row % 4 === 2;
      const kind2 = layoutVersion >= 7 && row === 22 && column === 2 ? "ticket" : treasure ? "treasure" : row === (layoutVersion >= 6 ? 14 : 10) || row === 22 ? "gift" : column % 2 === 0 ? "crystal" : "ore";
      return { id: id2, kind: kind2, hp: layoutVersion >= 6 && row >= 9 && row <= 13 ? 0 : treasure || prizeRow ? 1 : 0, maxHp: 1 };
    }
    const isBossHall = (legacy ? level2 % 5 === 0 : layoutVersion === 2 && (level2 % 5 === 0 || level2 % 10 === 9)) && row >= MINER_ROWS - 4 && row < MINER_ROWS - 1;
    const bossCell = isBossHall && row === MINER_ROWS - 2 && column === 2;
    const deflector = layoutVersion >= 4 && level2 % 4 === 3 && row === 12 && column === level2 % 5;
    const special = layoutVersion >= 7 ? level2 % 10 === 6 && row === 19 && column === level2 % 5 ? "ticket" : level2 % 10 === 4 && row === 15 && column === level2 % 5 ? "spawner" : level2 >= 3 && row === 6 && column === (level2 + 1) % 5 ? "balloon" : level2 >= 5 && row === 18 && column === (level2 + 2) % 5 ? "ember" : null : null;
    const kind = special ?? (deflector ? "deflector" : bossCell ? "boss" : row === MINER_ROWS - 1 && (layoutVersion >= 3 || column % 2 === 0) ? "treasure" : layoutVersion >= 8 && level2 >= 21 && row > 8 && hash % 13 === 0 ? "obsidian" : row > 2 && hash % 19 === 0 ? "gift" : row > 2 && hash % 17 === 0 ? "tnt" : row > 5 && hash % 9 === 0 ? "iron" : hash % 7 === 0 ? "crystal" : hash % 5 === 0 ? "ore" : Math.floor(row / 5) % 3 === 0 ? "ice" : Math.floor(row / 5) % 3 === 1 ? "brick" : "stone");
    const hardness = kind === "boss" ? 20 : kind === "obsidian" ? 1.6 : kind === "iron" ? 2.2 : kind === "ice" ? 0.65 : kind === "tnt" || kind === "gift" ? 0.4 : 1;
    const maxHp = layoutVersion >= 3 && (kind === "treasure" || kind === "deflector" || kind === "ticket" || kind === "spawner" || kind === "balloon") ? 1 : Math.max(1, Math.ceil((layoutVersion >= 3 && minerChestsRequired(level2) === 2 ? layoutVersion >= 5 ? 2.5 : 1.35 : 1) * (1 + row * 0.17) * Math.pow(legacy || layoutVersion >= 5 ? 1.16 : 1.13, Math.min(level2 - 1, legacy ? 35 : 39)) * hardness * (layoutVersion >= 9 ? 1 + Math.min(minerChestsRequired(level2) === 2 ? level2 >= 38 ? 0.55 : 1.2 : 2, (level2 - 1) * 0.1) : 1)));
    const gap = row > 1 && row < MINER_ROWS - 1 && (hash < 11 || row % 9 === 5 && column === (level2 + row) % 5);
    const rhythm = (row + column * 2 + level2) % 7;
    const scenicGap = layoutVersion >= 4 && row > 1 && row < MINER_ROWS - 1 && (rhythm === 2 || rhythm === 3 || minerChestsRequired(level2) === 1 && rhythm === 6);
    return { id: id2, kind, hp: kind !== "deflector" && (!special && (gap || scenicGap || isBossHall && !bossCell)) ? 0 : maxHp, maxHp };
  });
}
function createCrystalMinersProgress() {
  return {
    version: 10,
    layoutVersion: 10,
    dropTickets: 0,
    forgeLevel: 0,
    revision: 0,
    level: 1,
    ore: 42,
    eventTrack: { levelsCleared: 0, claimedMilestones: [] },
    superGiftSlots: [],
    superGiftsWaiting: 0,
    giftsGenerated: 5,
    tools: [-1, -1, -2, -1, -1, 1, 1, 1, 1, 1, ...Array(15).fill(0)],
    blocks: createMinerBlocks(1),
    digs: 0,
    bought: 0,
    totalOre: 0,
    totalTreasures: 0,
    updatedAtMs: 0,
    lastReceipt: null,
    giftsWaiting: 0,
    totalScore: 0,
    bestScore: 0
  };
}
function getCrystalMinersCareer(checkpoints) {
  let latest = null;
  for (const progress of Object.values(checkpoints)) {
    if (!latest || progress.revision > latest.revision || progress.revision === latest.revision && progress.updatedAtMs > latest.updatedAtMs) latest = progress;
  }
  return latest;
}
function isMinerCampaignComplete(progress) {
  return progress.eventTrack.levelsCleared >= MINER_LEVEL_COUNT && MINER_EVENT_MILESTONES.every((m) => progress.eventTrack.claimedMilestones.includes(m.levels));
}
function startMinerSeason(career) {
  const fresh = createCrystalMinersProgress();
  return {
    ...fresh,
    revision: career.revision,
    updatedAtMs: career.updatedAtMs,
    dropTickets: career.dropTickets,
    digs: career.digs,
    bought: career.bought,
    totalOre: career.totalOre,
    totalTreasures: career.totalTreasures,
    totalScore: career.totalScore,
    bestScore: career.bestScore,
    giftsGenerated: Math.max(fresh.giftsGenerated, career.giftsGenerated)
  };
}
function resolveCrystalMinersProgressForEvent(checkpoints, eventId2) {
  const career = getCrystalMinersCareer(checkpoints);
  if (!career || !isMinerCampaignComplete(career)) return career;
  if (checkpoints[eventId2] === career) return career;
  let season = minerSeasonCache.get(career);
  if (!season) {
    season = startMinerSeason(career);
    minerSeasonCache.set(career, season);
  }
  return season;
}
var minerSeasonCache = /* @__PURE__ */ new WeakMap();
function rollMinerGiftTier(buyTier, superGift, roll) {
  const r = Math.max(0, Math.min(0.999999, Number.isFinite(roll) ? roll : 0));
  let tier = buyTier;
  if (superGift) {
    if (r >= 0.85) tier += 5 + Math.floor((r - 0.85) / 0.15 * 6);
    else if (r >= 0.5) tier += 3 + Math.floor((r - 0.5) / 0.35 * 2);
    else if (r >= 0.1) tier += 1 + Math.floor((r - 0.1) / 0.4 * 2);
  } else {
    if (r >= 0.995) tier += 5 + Math.floor((r - 0.995) / 5e-3 * 6);
    else if (r >= 0.96) tier += 3 + Math.floor((r - 0.96) / 0.035 * 2);
    else if (r >= 0.93) tier = Math.max(1, 1 + Math.floor((r - 0.93) / 0.03 * Math.max(1, buyTier - 1)));
    else if (r >= 0.7) tier += 1 + Math.floor((r - 0.7) / 0.23 * 2);
  }
  return Math.min(MINER_MAX_TIER, Math.max(1, tier));
}
function openMinerGift(progress, slot, roll = 0.75) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MINER_SLOTS || progress.tools[slot] >= 0) return null;
  const tools = [...progress.tools];
  tools[slot] = rollMinerGiftTier(minerBuyTier(progress.level), progress.superGiftSlots.includes(slot), roll);
  return { ...progress, tools, superGiftSlots: progress.superGiftSlots.filter((i) => i !== slot) };
}
function claimWaitingMinerGift(progress) {
  const slot = progress.tools.indexOf(0);
  if (slot < 0 || progress.giftsWaiting < 1) return null;
  const tools = [...progress.tools];
  tools[slot] = -1;
  const isSuper = progress.superGiftsWaiting > 0;
  return {
    ...progress,
    tools,
    giftsWaiting: progress.giftsWaiting - 1,
    superGiftsWaiting: progress.superGiftsWaiting - (isSuper ? 1 : 0),
    superGiftSlots: isSuper ? [...progress.superGiftSlots, slot] : progress.superGiftSlots
  };
}
function minerGiftRarityRoll(ordinal) {
  let hash = Math.imul(ordinal ^ 2654435769, 2246822507);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
function isMinerMergePair(tools, from, to) {
  return Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= 0 && from < tools.length && to < tools.length && from !== to && tools[from] > 0 && tools[from] < MINER_MAX_TIER && tools[from] === tools[to];
}
function arrangeMinerTools(progress, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= MINER_SLOTS || to >= MINER_SLOTS || from === to || progress.tools[from] <= 0 || progress.tools[to] < 0) return null;
  const tools = [...progress.tools];
  if (tools[from] === tools[to]) {
    if (tools[from] === MINER_MAX_TIER) return null;
    tools[to] += 1;
    tools[from] = 0;
  } else {
    [tools[from], tools[to]] = [tools[to], tools[from]];
  }
  return { ...progress, tools };
}
function mergeMinerToolGroup(progress, tier) {
  if (progress.level < MINER_GROUP_MERGE_LEVEL || !Number.isInteger(tier) || tier < 1 || tier >= MINER_MAX_TIER) return null;
  const slots = progress.tools.flatMap((value, index) => value === tier ? [index] : []);
  if (slots.length < 2) return null;
  const tools = [...progress.tools];
  for (let i = 0; i + 1 < slots.length; i += 2) {
    tools[slots[i]] = 0;
    tools[slots[i + 1]] = tier + 1;
  }
  return { ...progress, tools };
}
function discardMinerTool(progress, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MINER_SLOTS || progress.tools[slot] <= 0 || progress.tools.filter(Boolean).length <= 1) return null;
  const tools = [...progress.tools];
  tools[slot] = 0;
  return { ...progress, tools };
}
function buyMinerTool(progress) {
  const slot = progress.tools.indexOf(0);
  const cost = minerBuyCost(progress);
  if (slot < 0 || progress.ore < cost) return null;
  const tools = [...progress.tools];
  tools[slot] = minerBuyTier(progress.level);
  return { ...progress, tools, ore: progress.ore - cost, bought: progress.bought + 1 };
}
function simulateMinerDig(progress, captureFrames = true) {
  const blocks = progress.blocks.map((block) => ({ ...block }));
  const bodies = progress.tools.flatMap((tier, id2) => tier > 0 ? [{
    id: id2,
    tier,
    lane: id2 % MINER_COLUMNS,
    x: id2 % MINER_COLUMNS * 60 + 30,
    y: -10 - Math.floor(id2 / MINER_COLUMNS) * 26,
    vx: 0,
    vy: 30,
    angle: id2 * 0.7,
    hits: minerImpactBudget(tier, progress.forgeLevel),
    cooldown: 0,
    active: true
  }] : []);
  const courseHeight = minerCourseHeight(progress.level, progress.layoutVersion ?? 10);
  const blockY = (block) => minerBlockY(block, progress.level, progress.layoutVersion ?? 10);
  const frames = [];
  const guardian = blocks.find((block) => block.kind === "boss" && block.hp > 0);
  let battleStart = -1;
  let bossAttack;
  let bossShots = 0;
  let bossDestroyed = 0;
  const chargeSteps = 150 - Math.floor(progress.level / 10) * 12;
  const fireSteps = 27;
  const reloadSteps = 162 - Math.floor(progress.level / 10) * 12;
  let ticketDrops = 0;
  let spawnedTools = 0;
  let chargesCollected = 0;
  let impactsRestored = 0;
  let keysCollected = 0;
  let gatesOpened = 0;
  let ore = 0;
  let broken = 0;
  let treasures = 0;
  let gifts = 0;
  let depth = 0;
  let hits = [];
  const capture = (step) => {
    if (captureFrames) frames.push({ step, bodies: bodies.map((b) => ({ ...b })), blocks: blocks.map((b) => ({ ...b })), hits, bossAttack: bossAttack ? { ...bossAttack } : void 0 });
    hits = [];
  };
  const breakBlock = (block, step, source) => {
    block.hp = 0;
    broken += 1;
    ore += minerBlockOre(block, progress.level, progress.layoutVersion ?? 10);
    if (block.kind === "treasure") {
      depth = MINER_ROWS;
      treasures += 1;
      gifts += MINER_CHEST_REWARDS[block.id % MINER_COLUMNS].gifts;
    }
    if (block.kind === "gift") gifts += 1;
    if (block.kind === "ticket") ticketDrops++;
    if (block.kind === "spawner" && bodies.length < 30) {
      const tier = Math.max(minerBuyTier(progress.level), (source?.tier ?? 1) - 1);
      const lane = block.id % MINER_COLUMNS;
      bodies.push({ id: MINER_SLOTS + block.id, tier, lane, x: lane * 60 + 30, y: blockY(block) + 15, vx: 0, vy: 120, angle: 0, hits: 6 + tier * 2, cooldown: 0.12, active: true });
      spawnedTools++;
    }
    if (block.kind === "balloon") gifts++;
    if (block.kind === "charger" && source) {
      const restored = Math.max(0, Math.min(6, minerImpactBudget(source.tier, progress.forgeLevel) - source.hits));
      source.hits += restored;
      chargesCollected++;
      impactsRestored += restored;
    }
    if (block.kind === "key") {
      keysCollected++;
      for (const gate of blocks) if (gate.kind === "gate" && gate.hp > 0) {
        gatesOpened++;
        breakBlock(gate, step);
      }
    }
    const row = Math.floor(block.id / MINER_COLUMNS);
    const column = block.id % MINER_COLUMNS;
    hits.push({ blockId: block.id, x: column * 60 + 30, y: blockY(block), broken: true, kind: block.kind, step });
    if (block.kind === "tnt") {
      for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
        const r = row + dr;
        const c = column + dc;
        if (r < 0 || r >= MINER_ROWS || c < 0 || c >= MINER_COLUMNS) continue;
        const neighbor = blocks[r * MINER_COLUMNS + c];
        if (neighbor.hp > 0 && neighbor.kind === "boss") neighbor.hp = Math.max(1, neighbor.hp - Math.ceil(neighbor.maxHp * 0.15));
        else if (neighbor.hp > 0) breakBlock(neighbor, step, source);
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
      body.vx = (body.lane * 60 + 30 - body.x) * 12;
      body.x += body.vx * MINER_STEP;
      body.y += body.vy * MINER_STEP;
      body.angle += (body.vx >= 0 ? 1 : -1) * MINER_STEP * 5;
      if (body.x < 12 || body.x > MINER_WIDTH - 12) {
        body.x = Math.max(12, Math.min(MINER_WIDTH - 12, body.x));
        body.vx *= -0.9;
      }
      if (body.vy > 0 && body.cooldown === 0) {
        const column = body.lane;
        for (let row = 0; row < MINER_ROWS; row += 1) {
          const guardian2 = blocks[row * MINER_COLUMNS + 2];
          const block = guardian2.kind === "boss" && guardian2.hp > 0 ? guardian2 : blocks[row * MINER_COLUMNS + column];
          const top = blockY(block);
          if (block.hp <= 0 || previousY + 10 > top + 9 || body.y + 10 < top) continue;
          block.hp = Math.max(0, block.hp - minerToolPower(body.tier));
          body.hits -= 1;
          body.cooldown = 0.1;
          body.y = top - 11;
          body.vy = block.kind === "boss" ? -85 : -60;
          const destroyed = block.hp === 0;
          if (destroyed) {
            breakBlock(block, step, body);
            if (block.kind === "deflector") body.lane += body.lane === MINER_COLUMNS - 1 ? -1 : 1;
            else if (["ore", "crystal", "gift", "treasure", "ticket", "spawner", "balloon", "charger", "key", "gate"].includes(block.kind)) body.vy = 200;
            else body.vy = 135;
          } else hits.push({ blockId: block.id, x: body.x, y: top, broken: false, kind: block.kind, step });
          if (body.hits <= 0) body.active = false;
          break;
        }
      }
      depth = Math.max(depth, Math.min(MINER_ROWS, Math.max(0, Math.floor((body.y - MINER_BLOCK_TOP) / (courseHeight - 64 - MINER_BLOCK_TOP) * MINER_ROWS))));
      if (body.y > courseHeight + 30) body.active = false;
    }
    if (guardian && guardian.hp > 0) {
      if (battleStart < 0 && bodies.some((body) => body.active && body.y >= blockY(guardian) - 100)) battleStart = step;
      if (battleStart >= 0) {
        const cycle = chargeSteps + fireSteps + reloadSteps;
        const age = step - battleStart;
        const shot = Math.floor(age / cycle);
        const beat = age % cycle;
        const lane = (Math.floor(progress.level / 10) + progress.digs * 3 + shot * 2) % MINER_COLUMNS;
        const phase = beat < chargeSteps ? "charge" : beat < chargeSteps + fireSteps ? "fire" : "reload";
        if (beat === chargeSteps) {
          const victims = bodies.filter((body) => body.active && body.lane === lane);
          victims.forEach((body) => {
            body.active = false;
          });
          bossShots++;
          bossDestroyed += victims.length;
          bossAttack = { lane, phase, shot, destroyed: victims.length, progress: 1 };
        } else bossAttack = {
          lane,
          phase,
          shot,
          destroyed: bossAttack?.shot === shot ? bossAttack.destroyed : 0,
          progress: phase === "charge" ? beat / chargeSteps : phase === "reload" ? (beat - chargeSteps - fireSteps) / reloadSteps : 1
        };
      }
    } else bossAttack = void 0;
    if (step % 3 === 0 || !bodies.some((b) => b.active)) capture(step);
    if (!bodies.some((b) => b.active)) break;
  }
  return { courseHeight, chargesCollected, impactsRestored, keysCollected, gatesOpened, bossShots, bossDestroyed, ticketDrops, spawnedTools, frames, blocks, ore, broken, treasures, gifts, depth, score: broken * 10 + treasures * 150 + gifts * 40 + depth * 5, cleared: blocks.filter((b) => b.kind === "treasure" && b.hp === 0).length >= minerChestsRequired(progress.level) && !blocks.some((b) => b.kind === "boss" && b.hp > 0) };
}
function settleMinerDig(progress, simulation) {
  const level2 = Math.min(MINER_LEVEL_COUNT, progress.level + (simulation.cleared ? 1 : 0));
  const tools = [...progress.tools];
  let giftsWaiting = progress.giftsWaiting + simulation.gifts;
  let superGiftsWaiting = progress.superGiftsWaiting;
  for (let i = 0; i < simulation.gifts; i++) if (minerGiftRarityRoll(progress.giftsGenerated + i + 1) < 0.05) superGiftsWaiting++;
  const superGiftSlots = [...progress.superGiftSlots];
  for (let i = 0; i < tools.length && giftsWaiting > 0; i += 1) if (tools[i] === 0) {
    tools[i] = -1;
    giftsWaiting -= 1;
    if (superGiftsWaiting > 0) {
      superGiftSlots.push(i);
      superGiftsWaiting--;
    }
  }
  return {
    ...progress,
    layoutVersion: simulation.cleared && progress.level < MINER_LEVEL_COUNT ? 10 : progress.layoutVersion ?? 10,
    dropTickets: progress.dropTickets + simulation.ticketDrops,
    level: level2,
    tools,
    giftsWaiting,
    superGiftSlots,
    superGiftsWaiting,
    giftsGenerated: progress.giftsGenerated + simulation.gifts,
    totalScore: progress.totalScore + simulation.score,
    bestScore: Math.max(progress.bestScore, simulation.score),
    blocks: simulation.cleared && progress.level < MINER_LEVEL_COUNT ? createMinerBlocks(level2) : simulation.blocks,
    eventTrack: { ...progress.eventTrack, levelsCleared: Math.min(MINER_LEVEL_COUNT, Math.max(progress.eventTrack.levelsCleared, progress.level - 1) + (simulation.cleared ? 1 : 0)) },
    digs: progress.digs + 1,
    ore: progress.ore + simulation.ore,
    totalOre: progress.totalOre + simulation.ore,
    totalTreasures: progress.totalTreasures + simulation.treasures,
    lastReceipt: {
      ticketDrops: simulation.ticketDrops,
      dig: progress.digs + 1,
      ore: simulation.ore,
      broken: simulation.broken,
      treasures: simulation.treasures,
      cleared: simulation.cleared,
      rewardProgress: 0,
      score: simulation.score,
      depth: simulation.depth,
      gifts: simulation.gifts,
      milestoneRewards: []
    }
  };
}
var integer = (value, fallback = 0, max = Number.MAX_SAFE_INTEGER) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : fallback;
function sanitizeCrystalMinersProgressByEvent(value, fallback = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!key || key.length > 200 || !raw || typeof raw !== "object") continue;
    const input = raw;
    if (input.version !== 1 && input.version !== 2 && input.version !== 3 && input.version !== 4 && input.version !== 5 && input.version !== 6 && input.version !== 7 && input.version !== 8 && input.version !== 9 && input.version !== 10 || !Array.isArray(input.tools) || input.tools.length !== MINER_SLOTS || !input.tools.every((t) => Number.isInteger(t) && t >= -MINER_MAX_TIER && t <= MINER_MAX_TIER) || !input.tools.some((t) => t !== 0) || !Array.isArray(input.blocks) || input.blocks.length !== MINER_ROWS * MINER_COLUMNS) continue;
    const level2 = Math.max(1, integer(input.level, 1, MINER_LEVEL_COUNT));
    const savedLayout = input.version === 10 ? input.layoutVersion ?? 10 : input.version;
    if (!Number.isInteger(savedLayout) || savedLayout < 1 || savedLayout > 10) continue;
    const expected = createMinerBlocks(level2, savedLayout);
    const matchesLayout = (layout) => input.blocks.every((b, i) => b && b.id === i && b.kind === layout[i].kind && b.maxHp === layout[i].maxHp && Number.isInteger(b.hp) && b.hp >= 0 && b.hp <= b.maxHp);
    if (!matchesLayout(expected) && !matchesLayout(createMinerBlocks(level2))) continue;
    const receipt = input.lastReceipt;
    const levelsCleared = Math.max(level2 - 1, integer(input.eventTrack?.levelsCleared, 0, MINER_LEVEL_COUNT));
    const claimedMilestones = Array.from(new Set(Array.isArray(input.eventTrack?.claimedMilestones) ? input.eventTrack.claimedMilestones.filter((n) => MINER_EVENT_MILESTONES.some((m) => m.levels === n && n <= levelsCleared)) : []));
    const admittedLayout = matchesLayout(expected) ? savedLayout : 10;
    const migratedBlocks = input.blocks;
    result[key] = {
      version: 10,
      layoutVersion: admittedLayout,
      dropTickets: integer(input.dropTickets),
      forgeLevel: integer(input.forgeLevel, 0, MINER_FORGE_UNLOCKS.length),
      revision: integer(input.revision),
      level: level2,
      ore: integer(input.ore),
      eventTrack: { levelsCleared, claimedMilestones },
      superGiftSlots: Array.from(new Set(Array.isArray(input.superGiftSlots) ? input.superGiftSlots.filter((i) => Number.isInteger(i) && i >= 0 && i < MINER_SLOTS && input.tools[i] < 0) : [])),
      superGiftsWaiting: Math.min(integer(input.giftsWaiting), integer(input.superGiftsWaiting)),
      giftsGenerated: integer(input.giftsGenerated, 5),
      tools: [...input.tools],
      blocks: migratedBlocks.map((b) => ({ ...b })),
      digs: integer(input.digs),
      bought: integer(input.bought),
      totalOre: integer(input.totalOre),
      totalTreasures: integer(input.totalTreasures),
      updatedAtMs: integer(input.updatedAtMs),
      lastReceipt: receipt && typeof receipt === "object" ? { ticketDrops: integer(receipt.ticketDrops, 0, 5), dig: integer(receipt.dig), ore: integer(receipt.ore), broken: integer(receipt.broken, 0, MINER_ROWS * MINER_COLUMNS), treasures: integer(receipt.treasures, 0, 5), cleared: receipt.cleared === true, rewardProgress: integer(receipt.rewardProgress), score: integer(receipt.score), depth: integer(receipt.depth, 0, MINER_ROWS), gifts: integer(receipt.gifts), milestoneRewards: Array.isArray(receipt.milestoneRewards) ? receipt.milestoneRewards.filter((s) => typeof s === "string" && s.length < 150).slice(0, 7) : [] } : null,
      giftsWaiting: integer(input.giftsWaiting),
      totalScore: integer(input.totalScore),
      bestScore: integer(input.bestScore)
    };
  }
  return Object.fromEntries(Object.entries(result).sort(([, a], [, b]) => a.revision - b.revision || a.updatedAtMs - b.updatedAtMs).slice(-32));
}
function mergeCrystalMinersProgressByEvent(remote, local) {
  const merged = { ...remote };
  for (const [key, progress] of Object.entries(local)) {
    const previous = merged[key];
    if (!previous || progress.revision > previous.revision || progress.revision === previous.revision && progress.updatedAtMs > previous.updatedAtMs) merged[key] = progress;
  }
  return merged;
}

// src/features/gamification/level-worlds/services/crystalMinersReplay.ts
function createMinerReplayCamera(frames, height = MINER_HEIGHT) {
  let y = 0;
  return frames.map((frame) => {
    const survivors = frame.bodies.filter((body) => body.active);
    const focus = survivors.reduce((leader, body) => !leader || body.y > leader.y ? body : leader, void 0);
    const toolId = focus?.id ?? null;
    const target = focus ? Math.max(0, Math.min(height - 386, focus.y - 210)) : y;
    const returning = target < y - 60;
    y += (target - y) * 0.19;
    if (focus) y = Math.max(y, Math.min(height - 386, focus.y - 300));
    return { y, toolId, returning };
  });
}
function createMinerVisualEvents(frames, times) {
  return frames.flatMap((frame, i) => Array.from(new Map(frame.hits.map((hit) => [`${hit.step}-${hit.blockId}`, hit])).values()).map((hit) => ({
    hit,
    at: times[i] ?? 0,
    duration: hit.broken ? 700 : 220,
    priority: hit.broken && ["ticket", "gift", "balloon", "spawner", "charger", "key", "gate", "boss", "treasure"].includes(hit.kind) ? 3 : hit.broken ? 2 : 1
  })));
}
function minerVisibleEffects(events, elapsed, cameraY, limit = 32) {
  return events.filter((e) => e.at <= elapsed && elapsed - e.at < e.duration && e.hit.y >= cameraY - 70 && e.hit.y <= cameraY + 456).sort((a, b) => b.priority - a.priority || b.at - a.at).slice(0, Math.max(0, Math.min(32, limit))).sort((a, b) => a.at - b.at).map((e) => e.hit);
}
function createMinerReplayTiming(frames) {
  if (frames.length < 2) return { times: [0], duration: 0, travelDuration: 0, celebrationMs: 0, fastFrom: -1 };
  const baseDuration = Math.min(26e3, Math.max(5e3, frames[frames.length - 1].step / 60 * 650));
  const interval = baseDuration / (frames.length - 1);
  let lastChest = -1;
  frames.forEach((frame, index) => {
    if (frame.hits.some((h) => h.kind === "treasure" && h.broken)) lastChest = index;
  });
  const candidate = lastChest + Math.ceil(700 / interval);
  const fastFrom = lastChest >= 0 && (frames.length - 1 - candidate) * interval > 1800 ? candidate : -1;
  const times = [0];
  for (let i = 1; i < frames.length; i++) times.push(times[i - 1] + interval / (fastFrom >= 0 && i >= fastFrom ? 2.25 : 1));
  const finalBlastHold = frames[frames.length - 1].bossAttack?.phase === "fire" ? 600 : 0;
  const travelDuration = times[times.length - 1] + finalBlastHold;
  const celebrationMs = lastChest >= 0 ? 1100 : 0;
  return { times, travelDuration, celebrationMs, duration: travelDuration + celebrationMs, fastFrom };
}
function minerReplayFrameAt(times, elapsedMs) {
  let low = 0, high = times.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (times[mid] <= elapsedMs) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, low);
}

// src/features/gamification/level-worlds/services/__tests__/testHarness.ts
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
function assertEqual(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} (expected ${String(expected)}, received ${String(actual)})`);
  }
}
function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message} (expected ${expectedJson}, received ${actualJson})`);
  }
}
function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    }
  };
}
function installWindowWithStorage(storage) {
  const sessionStorage = createMemoryStorage();
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storage,
      sessionStorage,
      location: { pathname: "/app", search: "", hash: "" }
    },
    configurable: true,
    writable: true
  });
}

// src/features/gamification/level-worlds/services/__tests__/crystalMinersProgression.test.ts
var fleet = (level2, tier, count = 15) => ({ ...createCrystalMinersProgress(), level: level2, forgeLevel: 5, blocks: createMinerBlocks(level2), tools: [...Array(count).fill(tier), ...Array(25 - count).fill(0)] });
var crystalMinersProgressionTests = [
  { name: "early courses have fewer obstacles and less depth than late courses", run: () => {
    const count = (level2) => createMinerBlocks(level2).filter((b) => b.hp > 0 && b.kind !== "treasure").length;
    assert(count(1) <= 15, "first course has at most fifteen obstacles");
    assert(count(39) >= 60, "late course has a visibly richer field");
    assert(count(39) > count(1) * 4, "distinct early/late density");
    assert(minerCourseHeight(1) < minerCourseHeight(39) * 0.55, "short onboarding shaft");
    for (let level2 = 1; level2 <= 40; level2++) {
      const blocks = createMinerBlocks(level2);
      assertEqual(blocks.length, 140, "stable save shape");
      assertEqual(blocks.filter((b) => b.kind === "treasure" && b.hp === 1).length, 5, "five finish lines");
      assert(blocks.filter((b) => b.hp > 0).every((b) => b.kind === "treasure" || 116 + Math.floor(b.id / 5) * 29 < minerCourseHeight(level2) - 180), "space before chests");
      assert(blocks.filter((b) => b.kind === "ticket" && b.hp > 0).length <= 1, "bounded ticket reward");
    }
    assertEqual(minerCourseHeight(1, 9), 1120, "old geometry remains unchanged");
  } },
  { name: "encounter recipes vary lanes and stage introductions instead of repeating one special row", run: () => {
    const levels = Array.from({ length: 40 }, (_, i) => i + 1);
    const recipes = new Set(levels.map((l) => minerCourseProfile(l).recipe));
    assert(recipes.size >= 7, "distinct encounter recipes");
    for (const [kind, minLevel] of [["iron", 4], ["ember", 11], ["charger", 16], ["key", 24]]) assert(levels.filter((l) => l < minLevel).every((l) => !createMinerBlocks(l).some((b) => b.kind === kind && b.hp > 0)), `${kind} introduced after basics`);
    for (const kind of ["ticket", "spawner", "charger", "key"]) {
      const positions = levels.flatMap((l) => createMinerBlocks(l).filter((b) => b.kind === kind && b.hp > 0).map((b) => b.id));
      assert(new Set(positions).size >= 3, `${kind} changes depth/lane`);
    }
    assertEqual(new Set([10, 20, 30, 40].map((l) => JSON.stringify(createMinerBlocks(l).filter((b) => b.hp > 0).map((b) => [b.id, b.kind])))).size, 4, "four distinct reward falls");
  } },
  { name: "every merge increases combined digging capacity and every forge rank improves endurance", run: () => {
    for (let tier = 1; tier < 20; tier++) for (let forge = 0; forge <= 5; forge++) {
      const before = 2 * minerToolPower(tier) * minerImpactBudget(tier, forge);
      const after = minerToolPower(tier + 1) * minerImpactBudget(tier + 1, forge);
      assert(after > before, `tier ${tier} merge must improve capacity`);
      if (forge < 5) assert(minerImpactBudget(tier, forge + 1) > minerImpactBudget(tier, forge), "forge improves all tool tiers");
    }
  } },
  { name: "weak racks fail late courses while invested racks clear with bounded attempts and replay time", run: () => {
    for (const level2 of [16, 24, 28, 38, 39, 40]) {
      const target = minerRecommendedTier(level2);
      const weak = simulateMinerDig(fleet(level2, Math.max(1, target - 4)), false);
      assert(!weak.cleared, `under-equipped fleet fails level ${level2}`);
      let p = fleet(level2, target + 1);
      let cleared = false;
      for (let i = 0; i < 3; i++) {
        const strong = simulateMinerDig(p);
        assert(createMinerReplayTiming(strong.frames).travelDuration <= 26600, "bounded replay even on tough terrain");
        p = settleMinerDig(p, strong);
        if (strong.cleared) {
          cleared = true;
          break;
        }
      }
      assert(cleared, `invested fleet clears level ${level2} within three drops`);
    }
  } },
  { name: "readiness reflects remaining terrain and forge investment without touching outcomes", run: () => {
    const p = fleet(39, 12);
    const before = JSON.stringify(p);
    const weak = getMinerReadiness({ ...p, forgeLevel: 0 });
    const strong = getMinerReadiness(p);
    assert(strong.laneCapacity.every((v, i) => v > weak.laneCapacity[i]), "forge improves capacity estimate");
    assertDeepEqual(strong.laneResistance, weak.laneResistance, "difficulty never depends on investment or wallet");
    assertEqual(JSON.stringify(p), before, "guidance read only");
    const damaged = getMinerReadiness({ ...p, blocks: p.blocks.map((b) => ({ ...b, hp: 0 })) });
    assertEqual(damaged.readyLanes, 5, "cleared terrain recognized");
  } },
  { name: "a key opens both linked gates once and its saved unlock survives reload", run: () => {
    const p = fleet(24, 12, 5);
    p.blocks = p.blocks.map((b) => ({ ...b, hp: ["key", "gate", "treasure"].includes(b.kind) ? b.hp : 0 }));
    const sim = simulateMinerDig(p);
    assertEqual(sim.keysCollected, 1, "key found");
    assertEqual(sim.gatesOpened, 2, "both gates unlocked");
    assert(sim.frames.flatMap((f) => f.hits).filter((h) => h.broken && h.kind === "gate").length === 2, "one unlock burst per gate");
    const saved = sanitizeCrystalMinersProgressByEvent({ p: { ...p, blocks: sim.blocks } }).p;
    assert(saved, "exact damaged recipe accepted");
    assertEqual(simulateMinerDig(saved, false).keysCollected, 0, "key cannot be reclaimed");
    assertEqual(simulateMinerDig(saved, false).gatesOpened, 0, "gate unlock cannot be replayed");
  } },
  { name: "gates can be broken without a key; chargers and spawners improve only the current drop", run: () => {
    const p = fleet(28, 14, 5);
    p.blocks = p.blocks.map((b) => ({ ...b, hp: b.kind === "gate" || b.kind === "treasure" ? b.hp : 0 }));
    const sim = simulateMinerDig(p, false);
    assert(sim.blocks.filter((b) => b.kind === "gate").every((b) => b.hp === 0), "strong tools can brute-force a gate");
    assertEqual(sim.keysCollected, 0, "no key needed");
    const charge = fleet(16, 8, 5);
    charge.blocks = charge.blocks.map((b) => ({ ...b, hp: ["charger", "treasure"].includes(b.kind) ? b.hp : 0 }));
    const charged = simulateMinerDig(charge, false);
    assertEqual(charged.chargesCollected, 1, "one charger consumed");
    assert(charged.impactsRestored > 0 && charged.impactsRestored <= 6, "restoration bounded by capacity");
    assertDeepEqual(settleMinerDig(charge, charged).tools.slice(0, 5), charge.tools.slice(0, 5), "charge never upgrades permanent tier");
    const spawn = fleet(4, 10, 5);
    const spawned = simulateMinerDig(spawn);
    assertEqual(spawned.spawnedTools, 1, "one reinforcement");
    assert(spawned.frames.some((f) => f.bodies.some((b) => b.id >= 25 && b.tier === 9)), "reinforcement scales with triggering tool");
    assert(spawned.frames.every((f) => f.bodies.length <= 30), "temporary-body budget");
  } },
  { name: "impact retention survives skipped frames, expires by age and prioritizes rewards within a fixed cap", run: () => {
    const base = simulateMinerDig(fleet(1, 3)).frames[0];
    const hits = Array.from({ length: 50 }, (_, i) => ({ blockId: i, x: 30, y: 150, step: i, kind: i === 0 ? "ticket" : "stone", broken: i === 0 }));
    const events = createMinerVisualEvents([{ ...base, hits }], [100]);
    const collision = createMinerVisualEvents([{ ...base, hits: [hits[1], hits[1], { ...hits[1], broken: true }] }], [0]);
    assertEqual(collision.length, 1, "simultaneous impacts share one stable visual identity");
    assert(collision[0].hit.broken, "breaking impact replaces earlier flashes");
    assertEqual(minerVisibleEffects(events, 99, 0).length, 0, "future events not visible");
    const visible = minerVisibleEffects(events, 200, 0);
    assertEqual(visible.length, 32, "hard visual cap");
    assert(visible.some((h) => h.kind === "ticket"), "special survives ordinary hit crowding");
    assertEqual(minerVisibleEffects(events, 500, 0).length, 1, "reward persists across missed frames after ordinary hits expire");
    assertEqual(minerVisibleEffects(events, 800, 0).length, 0, "all effects expire");
    assertEqual(minerVisibleEffects(events, 200, 1e3).length, 0, "offscreen effects culled");
    assertEqual(minerVisibleEffects(events, Infinity, 0).length, 0, "reduced motion skips effects");
  } },
  { name: "new-save reload and repeated legacy admission preserve every active board exactly", run: () => {
    for (const version of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const p = { ...fleet(28, 13), version, layoutVersion: version, blocks: createMinerBlocks(28, version), ore: 987, dropTickets: 8 };
      const target = p.blocks.find((b) => b.hp > 1);
      target.hp = Math.max(1, Math.floor(target.hp / 3));
      p.blocks[135].hp = 0;
      const admitted = sanitizeCrystalMinersProgressByEvent({ p }).p;
      assert(admitted, `layout ${version} admitted`);
      assertDeepEqual(admitted.blocks, p.blocks, "all damage and open chests exact");
      assertEqual(admitted.layoutVersion, version, "geometry retained");
      assertDeepEqual(sanitizeCrystalMinersProgressByEvent({ p: admitted }).p, admitted, "reload stable");
    }
  } }
];

// src/features/gamification/games/crystal-miners/crystalMinersThemes.ts
var MINER_THEMES = [
  { id: "grove", name: "Emerald Roots", top: "#163d35", bottom: "#071c21", glow: "#80e5a6", rock: "#496f60", edge: "#1b3834", accent: "#b8d9a0" },
  { id: "glacier", name: "Frostglass Cavern", top: "#213e66", bottom: "#0c1733", glow: "#a3eaff", rock: "#55869f", edge: "#253e60", accent: "#bdecff" },
  { id: "ember", name: "Emberforge", top: "#542d30", bottom: "#211326", glow: "#ff9252", rock: "#895449", edge: "#462730", accent: "#ffc388" },
  { id: "ruins", name: "Sunken Gold", top: "#174a58", bottom: "#0b233a", glow: "#75dbdb", rock: "#747864", edge: "#354e50", accent: "#efd19a" },
  { id: "amethyst", name: "Amethyst Hollow", top: "#442c60", bottom: "#1a1533", glow: "#d6a0ff", rock: "#77548e", edge: "#362648", accent: "#edc4ff" },
  { id: "cosmos", name: "Starlight Rift", top: "#252653", bottom: "#100f25", glow: "#9bbcff", rock: "#555782", edge: "#292b4e", accent: "#dfd5ff" }
];
function getMinerTheme(level2) {
  return MINER_THEMES[(Math.max(1, Math.floor(level2)) - 1) % MINER_THEMES.length];
}

// src/features/gamification/level-worlds/services/eventGameTicketEconomy.ts
var EVENT_GAME_PLAYS_PER_TICKET = Object.freeze({
  feeding_frenzy: 1,
  lucky_spin: 1,
  space_excavator: 1,
  companion_feast: 1,
  skybound_expedition: 1,
  journey_disc_arena: 1,
  momentum_matrix: 1,
  concord_categories: 1,
  lexicon_relay: 1,
  signal_path: 1,
  twin_sigils: 1,
  crystal_miners: 3
});
var quantity = (n) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
function eventGamePlaysAvailable(gameId, eventTickets, savedPlays = 0) {
  return quantity(eventTickets) * EVENT_GAME_PLAYS_PER_TICKET[gameId] + quantity(savedPlays);
}
function spendEventGamePlay(gameId, eventTickets, savedPlays = 0) {
  if (quantity(savedPlays) > 0) return { ticketsSpent: 0, savedPlays: quantity(savedPlays) - 1 };
  if (quantity(eventTickets) < 1) return null;
  return { ticketsSpent: 1, savedPlays: EVENT_GAME_PLAYS_PER_TICKET[gameId] - 1 };
}
function eventGamePackPlays(gameId, serverPackTickets) {
  return eventGamePlaysAvailable(gameId, serverPackTickets);
}

// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// supabase/defaultCredentials.json
var defaultCredentials_default = {
  url: "https://muanayogiboxooftkyny.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YW5heW9naWJveG9vZnRreW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgxNzMsImV4cCI6MjA3Nzk1NDE3M30.jJdaGXC1LEOZU9yPl-o5G2PF80OlmtNm0W4Vx5Fj1X8"
};

// src/lib/supabaseClient.ts
var cachedClient = null;
var activeSession = null;
var SUPABASE_AUTH_USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function readEnvValue(keys) {
  const env = define_import_meta_env_default;
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
function resolveSupabaseUrl() {
  const configuredUrl = readEnvValue(["VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  if (configuredUrl) return configuredUrl;
  return defaultCredentials_default.url?.trim() || null;
}
function resolveSupabaseAnonKey() {
  const configuredAnonKey = readEnvValue(["VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  if (configuredAnonKey) return configuredAnonKey;
  return defaultCredentials_default.anonKey?.trim() || null;
}
function hasSupabaseCredentials() {
  return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey());
}
function hasActiveSupabaseSession() {
  return Boolean(activeSession);
}
function canUseSupabaseData() {
  return hasSupabaseCredentials() && hasActiveSupabaseSession();
}
function isSupabaseAuthUserId(userId) {
  return typeof userId === "string" && SUPABASE_AUTH_USER_ID_PATTERN.test(userId);
}
function canUseSupabaseDataForUser(userId) {
  return canUseSupabaseData() && isSupabaseAuthUserId(userId) && activeSession?.user?.id === userId;
}
function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = resolveSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase credentials are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment."
    );
  }
  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    }
  });
  return cachedClient;
}

// src/services/service-health/types.ts
var ALL_SERVICES = [
  "auth",
  "database",
  "storage",
  "realtime",
  "edgeFunctions"
];
var systemClock = () => Date.now();

// src/services/service-health/errorTranslation.ts
var CATEGORY_DEFINITIONS = {
  offline: {
    code: "SVC_OFFLINE",
    severity: "warning",
    retryable: true,
    safeLocalMode: true,
    title: "You are offline",
    explanation: "No internet connection was detected. Your work on this device is safe and will sync automatically when you reconnect."
  },
  timeout: {
    code: "SVC_TIMEOUT",
    severity: "warning",
    retryable: true,
    safeLocalMode: true,
    title: "Cloud services are slow to respond",
    explanation: "The cloud did not answer in time. Your work is saved on this device and syncing will retry automatically."
  },
  quota_exceeded: {
    code: "SVC_QUOTA_EXCEEDED",
    severity: "error",
    retryable: false,
    safeLocalMode: true,
    title: "Cloud sync is temporarily limited",
    explanation: "Cloud services are temporarily limited. Your work on this device is safe, supported features keep working, and everything will sync when full service returns."
  },
  project_restricted: {
    code: "SVC_PROJECT_RESTRICTED",
    severity: "critical",
    retryable: false,
    safeLocalMode: true,
    title: "Cloud services are temporarily unavailable",
    explanation: "Cloud services are temporarily unavailable. Your work on this device is safe and will sync automatically when services return."
  },
  maintenance: {
    code: "SVC_MAINTENANCE",
    severity: "warning",
    retryable: true,
    safeLocalMode: true,
    title: "Scheduled maintenance in progress",
    explanation: "Cloud services are undergoing maintenance. Supported features keep working on this device and everything will sync afterwards."
  },
  auth_expired: {
    code: "AUTH_SESSION_EXPIRED",
    severity: "warning",
    retryable: false,
    safeLocalMode: true,
    title: "Your session expired",
    explanation: "Please sign in again to keep your account in sync. Work saved on this device is not lost."
  },
  invalid_credentials: {
    code: "AUTH_INVALID_CREDENTIALS",
    severity: "info",
    retryable: false,
    safeLocalMode: false,
    title: "Sign-in failed",
    explanation: "The email or password did not match. Please try again."
  },
  permission_denied: {
    code: "AUTH_PERMISSION_DENIED",
    severity: "error",
    retryable: false,
    safeLocalMode: false,
    title: "Action not allowed",
    explanation: "Your account does not have permission for this action."
  },
  storage_unavailable: {
    code: "SVC_STORAGE_UNAVAILABLE",
    severity: "warning",
    retryable: true,
    safeLocalMode: true,
    title: "File uploads are delayed",
    explanation: "Cloud file storage is temporarily unavailable. Uploads are kept on this device and will finish automatically later."
  },
  realtime_unavailable: {
    code: "SVC_REALTIME_UNAVAILABLE",
    severity: "info",
    retryable: true,
    safeLocalMode: true,
    title: "Live updates are paused",
    explanation: "Live updates are temporarily paused. Everything else keeps working and updates resume automatically."
  },
  edge_function_unavailable: {
    code: "SVC_EDGE_FUNCTION_UNAVAILABLE",
    severity: "warning",
    retryable: true,
    safeLocalMode: true,
    title: "Some cloud features are unavailable",
    explanation: "A cloud feature is temporarily unavailable. Local features keep working and the feature returns automatically."
  },
  rate_limited: {
    code: "SVC_RATE_LIMITED",
    severity: "warning",
    retryable: true,
    safeLocalMode: true,
    title: "Syncing is slowing down briefly",
    explanation: "The cloud asked us to slow down. Syncing continues automatically in a moment; nothing is lost."
  },
  conflict: {
    code: "SYNC_CONFLICT",
    severity: "warning",
    retryable: false,
    safeLocalMode: true,
    title: "A change needs review",
    explanation: "This item was changed on another device. The newer version was kept; nothing was deleted."
  },
  user_limit_reached: {
    code: "USER_DATA_LIMIT_REACHED",
    severity: "warning",
    retryable: false,
    safeLocalMode: false,
    title: "Storage limit reached for this feature",
    explanation: "This item was not saved because your account reached the maximum amount of stored data for this feature. Delete items you no longer need and try again."
  },
  unknown: {
    code: "SVC_UNKNOWN",
    severity: "error",
    retryable: true,
    safeLocalMode: true,
    title: "Something went wrong in the cloud",
    explanation: "An unexpected cloud problem occurred. Your work on this device is safe and syncing will retry automatically."
  }
};
function readStatus(error) {
  for (const candidate of [error.status, error.statusCode]) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && /^\d+$/.test(candidate)) return Number(candidate);
  }
  if (typeof error.code === "number" && error.code >= 100 && error.code < 600) return error.code;
  return null;
}
function collectText(error) {
  return [error.message, error.error_description, error.details, String(error.code ?? ""), error.name].filter(Boolean).join(" | ").toLowerCase();
}
function matchesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}
function classifyProviderError(error, options = {}) {
  const providerError = error && typeof error === "object" ? error : { message: String(error) };
  const text = collectText(providerError);
  const status = readStatus(providerError);
  if (options.networkOnline === false) return "offline";
  if (matchesAny(text, ["failed to fetch", "networkerror", "network request failed", "load failed", "fetch failed", "err_internet_disconnected"])) {
    return "offline";
  }
  if (matchesAny(text, ["abort", "timeout", "timed out", "deadline exceeded", "etimedout", "57014"])) {
    return "timeout";
  }
  if (matchesAny(text, ["user_data_limit_exceeded"])) {
    return "user_limit_reached";
  }
  if (status === 540 || matchesAny(text, ["quota", "exceeded the limit", "egress limit", "usage limit", "db_size", "disk quota", "over_request_rate_limit_quota"])) {
    return "quota_exceeded";
  }
  if (matchesAny(text, ["project is paused", "project paused", "project not found", "project is restricted", "project restricted", "suspended"])) {
    return "project_restricted";
  }
  if (status === 503 || matchesAny(text, ["maintenance", "service unavailable"])) {
    return "maintenance";
  }
  if (matchesAny(text, ["invalid login credentials", "invalid_grant", "email not confirmed", "invalid password", "user not found"])) {
    return "invalid_credentials";
  }
  if (matchesAny(text, ["jwt expired", "refresh_token_not_found", "invalid refresh token", "session expired", "refresh token", "token is expired"])) {
    return "auth_expired";
  }
  if (status === 401) {
    return options.service === "auth" ? "invalid_credentials" : "auth_expired";
  }
  if (status === 429 || matchesAny(text, ["rate limit", "too many requests", "over_request_rate_limit"])) {
    return "rate_limited";
  }
  if (status === 403 || matchesAny(text, ["permission denied", "row-level security", "rls", "not authorized", "42501"])) {
    return "permission_denied";
  }
  if (status === 409 || matchesAny(text, ["conflict", "duplicate key", "23505", "version mismatch"])) {
    return "conflict";
  }
  if (options.service === "storage" || matchesAny(text, ["bucket", "storage/"])) {
    return "storage_unavailable";
  }
  if (options.service === "realtime" || matchesAny(text, ["realtime", "websocket", "channel error"])) {
    return "realtime_unavailable";
  }
  if (options.service === "edgeFunctions" || matchesAny(text, ["edge function", "functionsfetcherror", "functionshttperror", "functionsrelayerror"])) {
    return "edge_function_unavailable";
  }
  if (status !== null && status >= 500) {
    return "unknown";
  }
  return "unknown";
}
function translateProviderError(error, options = {}) {
  const category = classifyProviderError(error, options);
  const definition = CATEGORY_DEFINITIONS[category];
  const providerError = error && typeof error === "object" ? error : { message: String(error) };
  const status = readStatus(providerError);
  return {
    ...definition,
    category,
    service: options.service,
    technicalDetail: [
      providerError.name,
      status !== null ? `status=${status}` : null,
      providerError.message ?? String(error)
    ].filter(Boolean).join(" ")
  };
}
function isAppError(value) {
  return Boolean(
    value && typeof value === "object" && typeof value.code === "string" && typeof value.category === "string" && typeof value.title === "string" && typeof value.explanation === "string"
  );
}

// src/services/service-health/circuitBreaker.ts
var CircuitBreaker = class {
  failureThreshold;
  baseCooldownMs;
  cooldownBackoffFactor;
  maxCooldownMs;
  clock;
  consecutiveFailures = 0;
  openedAt = null;
  openCycles = 0;
  probeInFlight = false;
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.baseCooldownMs = options.cooldownMs ?? 3e4;
    this.cooldownBackoffFactor = options.cooldownBackoffFactor ?? 2;
    this.maxCooldownMs = options.maxCooldownMs ?? 5 * 6e4;
    this.clock = options.clock ?? systemClock;
  }
  get state() {
    if (this.openedAt === null) return "closed";
    return this.clock() - this.openedAt >= this.currentCooldownMs() ? "half-open" : "open";
  }
  get failureCount() {
    return this.consecutiveFailures;
  }
  currentCooldownMs() {
    const scaled = this.baseCooldownMs * Math.pow(this.cooldownBackoffFactor, Math.max(0, this.openCycles - 1));
    return Math.min(scaled, this.maxCooldownMs);
  }
  /**
   * Whether a request should be attempted right now. In half-open state only
   * a single probe is admitted at a time.
   */
  canRequest() {
    const state2 = this.state;
    if (state2 === "closed") return true;
    if (state2 === "open") return false;
    if (this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }
  recordSuccess() {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.openCycles = 0;
    this.probeInFlight = false;
  }
  recordFailure() {
    this.probeInFlight = false;
    this.consecutiveFailures += 1;
    if (this.openedAt !== null) {
      this.openedAt = this.clock();
      this.openCycles += 1;
      return;
    }
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = this.clock();
      this.openCycles = 1;
    }
  }
  /** Force-close (e.g. network came back and a probe confirmed recovery). */
  reset() {
    this.recordSuccess();
  }
};

// src/services/service-health/boundedLog.ts
var BoundedLog = class {
  maxEntries;
  sampleRate;
  aggregationWindowMs;
  clock;
  entries = [];
  sampleCounters = /* @__PURE__ */ new Map();
  droppedBySampling = 0;
  constructor(options = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? 200);
    this.sampleRate = Math.max(1, options.sampleRate ?? 1);
    this.aggregationWindowMs = options.aggregationWindowMs ?? 5e3;
    this.clock = options.clock ?? systemClock;
  }
  push(key, data) {
    const now = this.clock();
    const last = this.entries[this.entries.length - 1];
    if (last && last.key === key && now - Date.parse(last.at) <= this.aggregationWindowMs) {
      last.count += 1;
      last.data = data;
      return;
    }
    if (this.sampleRate > 1) {
      const seen = (this.sampleCounters.get(key) ?? 0) + 1;
      this.sampleCounters.set(key, seen);
      if (seen % this.sampleRate !== 1) {
        this.droppedBySampling += 1;
        return;
      }
    }
    this.entries.push({ at: new Date(now).toISOString(), key, count: 1, data });
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }
  list(limit = this.maxEntries) {
    return this.entries.slice(-Math.max(1, limit));
  }
  get size() {
    return this.entries.length;
  }
  get sampledOutCount() {
    return this.droppedBySampling;
  }
  clear() {
    this.entries = [];
    this.sampleCounters.clear();
    this.droppedBySampling = 0;
  }
};

// src/services/service-health/serviceHealthManager.ts
var DEGRADED_AFTER_FAILURES = 1;
var ServiceHealthManager = class {
  clock;
  recoveryProbeIntervalMs;
  services = /* @__PURE__ */ new Map();
  breakers = /* @__PURE__ */ new Map();
  probes = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  eventLog = new BoundedLog({
    maxEntries: 150
  });
  networkOnline = true;
  accountActionRequired = false;
  localPersistenceFailed = false;
  lastSuccessAt = null;
  lastCheckAt = null;
  incidentMessage = null;
  recoveryTimer = null;
  recoveryProbeRunning = false;
  constructor(options = {}) {
    this.clock = options.clock ?? systemClock;
    this.recoveryProbeIntervalMs = options.recoveryProbeIntervalMs ?? 45e3;
    for (const service of ALL_SERVICES) {
      this.services.set(service, { state: "unknown", lastError: null, lastChangeAt: null });
      this.breakers.set(
        service,
        new CircuitBreaker({
          failureThreshold: options.failureThreshold ?? 5,
          cooldownMs: options.cooldownMs ?? 3e4,
          clock: this.clock
        })
      );
    }
  }
  // ── Reporting ────────────────────────────────────────────────────────────
  reportSuccess(service) {
    const record = this.record(service);
    this.breaker(service).recordSuccess();
    this.lastSuccessAt = this.clock();
    this.lastCheckAt = this.lastSuccessAt;
    if (record.state !== "healthy" || record.lastError) {
      record.state = "healthy";
      record.lastError = null;
      record.lastChangeAt = this.clock();
      this.eventLog.push(`recovered:${service}`, { service, detail: "service recovered" });
      this.notify();
    }
  }
  /**
   * Report a provider failure. Returns the translated AppError so callers can
   * surface it (never the raw error) to their own flows.
   */
  reportFailure(service, error) {
    const appError = isAppError(error) ? error : translateProviderError(error, { service, networkOnline: this.networkOnline });
    const record = this.record(service);
    const breaker = this.breaker(service);
    this.lastCheckAt = this.clock();
    const countsAgainstHealth = appError.category !== "invalid_credentials" && appError.category !== "permission_denied" && appError.category !== "conflict";
    if (countsAgainstHealth) {
      breaker.recordFailure();
      const nextState = breaker.state !== "closed" || !appError.retryable ? "unavailable" : breaker.failureCount >= DEGRADED_AFTER_FAILURES ? "degraded" : record.state;
      if (record.state !== nextState || record.lastError?.code !== appError.code) {
        record.state = nextState;
        record.lastError = appError;
        record.lastChangeAt = this.clock();
        this.eventLog.push(`failure:${service}:${appError.code}`, {
          service,
          detail: appError.technicalDetail ?? appError.code
        });
        this.notify();
      } else {
        record.lastError = appError;
      }
    }
    if (appError.category === "auth_expired") {
      this.setAccountActionRequired(true);
    }
    return appError;
  }
  /** Gate a request through the service's circuit breaker (Part 11). */
  canRequest(service) {
    if (!this.networkOnline) return false;
    return this.breaker(service).canRequest();
  }
  // ── External signals ─────────────────────────────────────────────────────
  setNetworkOnline(online) {
    if (this.networkOnline === online) return;
    this.networkOnline = online;
    this.eventLog.push(`network:${online ? "online" : "offline"}`, {
      detail: online ? "network restored" : "network lost"
    });
    if (online) {
      for (const breaker of this.breakers.values()) breaker.reset();
      void this.runRecoveryProbes();
    }
    this.notify();
  }
  /** Session must be re-established (expired/blocked). Never bypassed locally. */
  setAccountActionRequired(required) {
    if (this.accountActionRequired === required) return;
    this.accountActionRequired = required;
    this.notify();
  }
  /** Local persistence itself failed — the one state we cannot paper over. */
  setLocalPersistenceFailed(failed2) {
    if (this.localPersistenceFailed === failed2) return;
    this.localPersistenceFailed = failed2;
    this.notify();
  }
  /** Externally published incident message (Part 12). */
  setIncidentMessage(message) {
    if (this.incidentMessage === message) return;
    this.incidentMessage = message;
    this.notify();
  }
  // ── Probes / recovery (Part 10) ──────────────────────────────────────────
  registerProbe(service, probe) {
    this.probes.set(service, probe);
  }
  /** Probe currently unhealthy services (circuit-gated; never a storm). */
  async runRecoveryProbes() {
    if (this.recoveryProbeRunning || !this.networkOnline) return;
    this.recoveryProbeRunning = true;
    try {
      for (const [service, probe] of this.probes) {
        const record = this.record(service);
        if (record.state === "healthy") continue;
        if (!this.breaker(service).canRequest()) continue;
        try {
          const healthy = await probe();
          if (healthy) {
            this.reportSuccess(service);
          } else {
            this.breaker(service).recordFailure();
          }
        } catch (error) {
          this.reportFailure(service, error);
        }
      }
      this.lastCheckAt = this.clock();
    } finally {
      this.recoveryProbeRunning = false;
    }
  }
  /** Periodically probe for recovery while anything is unhealthy. */
  startRecoveryMonitor() {
    if (this.recoveryTimer !== null) return;
    const tick = () => {
      this.recoveryTimer = setTimeout(async () => {
        const anyUnhealthy = Array.from(this.services.values()).some(
          (record) => record.state === "degraded" || record.state === "unavailable"
        );
        if (anyUnhealthy) {
          await this.runRecoveryProbes();
        }
        this.recoveryTimer = null;
        tick();
      }, this.recoveryProbeIntervalMs);
    };
    tick();
  }
  stopRecoveryMonitor() {
    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
  // ── Snapshot / subscription ──────────────────────────────────────────────
  getSnapshot() {
    const services = {};
    for (const service of ALL_SERVICES) {
      services[service] = this.record(service).state;
    }
    return {
      overall: this.computeMode(),
      services,
      lastSuccessAt: this.lastSuccessAt ? new Date(this.lastSuccessAt).toISOString() : null,
      lastCheckAt: this.lastCheckAt ? new Date(this.lastCheckAt).toISOString() : null,
      incidentCode: this.currentIncidentCode(),
      networkOnline: this.networkOnline,
      incidentMessage: this.incidentMessage
    };
  }
  getLastError(service) {
    return this.record(service).lastError;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  // ── Internals ────────────────────────────────────────────────────────────
  computeMode() {
    if (this.localPersistenceFailed) return "UNSAFE";
    if (!this.networkOnline) return "OFFLINE";
    if (this.accountActionRequired) return "ACCOUNT_ACTION_REQUIRED";
    const records = Array.from(this.services.values());
    const errors = records.map((record) => record.lastError).filter((error) => Boolean(error));
    if (errors.some((error) => error.category === "maintenance")) return "MAINTENANCE";
    const core = [this.record("auth"), this.record("database")];
    if (core.every((record) => record.state === "unavailable")) return "OFFLINE";
    if (records.some((record) => record.state === "degraded" || record.state === "unavailable")) {
      return "DEGRADED";
    }
    return "ONLINE";
  }
  currentIncidentCode() {
    const severityRank = { critical: 3, error: 2, warning: 1, info: 0 };
    let dominant = null;
    for (const record of this.services.values()) {
      if (record.state === "healthy" || !record.lastError) continue;
      if (!dominant || severityRank[record.lastError.severity] > severityRank[dominant.severity]) {
        dominant = record.lastError;
      }
    }
    return dominant?.code ?? null;
  }
  record(service) {
    const record = this.services.get(service);
    if (!record) throw new Error(`Unknown service: ${service}`);
    return record;
  }
  breaker(service) {
    const breaker = this.breakers.get(service);
    if (!breaker) throw new Error(`Unknown service: ${service}`);
    return breaker;
  }
  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
      }
    }
  }
};
var sharedManager = null;
function getServiceHealthManager() {
  if (!sharedManager) {
    sharedManager = new ServiceHealthManager();
  }
  return sharedManager;
}

// src/services/service-health/capabilities.ts
var noCloud = {
  network: false,
  cloud: false,
  auth: false,
  realtime: false,
  storage: false,
  edgeFunctions: false
};
function capability(id2, label, requires, whenUnavailable) {
  return { id: id2, label, requires: { ...noCloud, ...requires }, whenUnavailable };
}
var FEATURE_CAPABILITIES = [
  // Works locally, syncs later.
  capability("habit_completion", "Habit check-ins", { cloud: true }, "local"),
  capability("journal", "Journal", { cloud: true }, "local"),
  capability("todos", "To-dos", { cloud: true }, "local"),
  capability("goals", "Goals", { cloud: true }, "local"),
  capability("checkins", "Daily check-ins", { cloud: true }, "local"),
  capability("timers", "Timers", {}, "local"),
  capability("notes_drafts", "Notes & drafts", {}, "local"),
  capability("island_run", "Island Run", { cloud: true }, "local"),
  capability("cached_creatures", "Creature collection (cached)", {}, "local"),
  // Usable now; resulting writes queue.
  capability("image_upload", "Image uploads", { network: true, cloud: true, storage: true }, "queue"),
  capability("runtime_checkpoint", "Game checkpoints", { cloud: true }, "queue"),
  capability("settings_sync", "Settings sync", { cloud: true }, "queue"),
  // Paused until services return.
  capability("purchases", "Purchases", { network: true, cloud: true, auth: true, edgeFunctions: true }, "pause"),
  capability("subscriptions", "Subscriptions", { network: true, cloud: true, auth: true, edgeFunctions: true }, "pause"),
  capability("ai_coach", "AI Coach", { network: true, cloud: true, edgeFunctions: true }, "pause"),
  capability("ai_generation", "AI generation", { network: true, cloud: true, edgeFunctions: true }, "pause"),
  capability("multiplayer", "Multiplayer & leaderboards", { network: true, cloud: true, realtime: true }, "pause"),
  capability("marketplace", "Marketplace", { network: true, cloud: true, auth: true }, "pause"),
  // Hard-blocked for integrity — never granted from local state.
  capability("premium_grant", "Premium unlocks", { network: true, cloud: true, auth: true }, "block"),
  capability("economy_settlement", "Currency settlement", { network: true, cloud: true, auth: true }, "block"),
  capability("account_ownership", "Account & ownership changes", { network: true, cloud: true, auth: true }, "block")
];
var capabilityById = new Map(FEATURE_CAPABILITIES.map((entry) => [entry.id, entry]));

// src/services/service-health/guardedCloudCall.ts
function timeoutError(timeoutMs) {
  const error = new Error(`Cloud request timed out after ${timeoutMs}ms`);
  error.name = "TimeoutError";
  return error;
}
async function guardedCloudCall(service, call, options = {}) {
  const manager = options.manager ?? getServiceHealthManager();
  if (!manager.canRequest(service)) {
    const lastError = manager.getLastError(service) ?? translateProviderError(new Error("Circuit open; request skipped locally."), { service });
    return { ok: false, error: lastError, skipped: true };
  }
  const timeoutMs = options.timeoutMs ?? 12e3;
  try {
    const data = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs);
      call().then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
    manager.reportSuccess(service);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: manager.reportFailure(service, error), skipped: false };
  }
}

// src/features/journal/constants.ts
var DEFAULT_JOURNAL_TYPE = "standard";

// src/types/aiCoach.ts
var DEFAULT_AI_COACH_ACCESS = {
  goals: true,
  goalEvolution: true,
  habits: true,
  journaling: true,
  reflections: true,
  visionBoard: true,
  lifeStage: false
};

// src/services/demoData.ts
var DEMO_USER_ID = "demo-user-0001";
var DEMO_USER_NAME = "Demo Creator";
var DEFAULT_HABIT_ENVIRONMENT = "In my workspace, with my laptop and a clear mind. No distractions, no interruptions.";
var STORAGE_KEY = "lifegoalapp-demo-db-v1";
var structuredCloneFn = typeof globalThis.structuredClone === "function" ? globalThis.structuredClone : void 0;
function clone(value) {
  if (structuredCloneFn) {
    return structuredCloneFn(value);
  }
  return JSON.parse(JSON.stringify(value));
}
function createId(prefix) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${random}`;
}
var today = /* @__PURE__ */ new Date();
var iso = (date) => date.toISOString();
var isoDateOnly = (date) => date.toISOString().slice(0, 10);
function createDemoHabit(seed2) {
  const type = seed2.type ?? "boolean";
  const doneIshThreshold = seed2.doneIshThreshold ?? 80;
  return {
    id: seed2.id,
    user_id: DEMO_USER_ID,
    title: seed2.title,
    emoji: null,
    type,
    status: "active",
    target_num: seed2.targetNum ?? null,
    target_unit: seed2.targetUnit ?? null,
    schedule: seed2.schedule,
    allow_skip: null,
    start_date: null,
    archived: false,
    created_at: seed2.createdAt ?? iso(/* @__PURE__ */ new Date()),
    paused_at: null,
    paused_reason: null,
    resume_on: null,
    deactivated_at: null,
    deactivated_reason: null,
    autoprog: {
      tier: "standard",
      baseSchedule: seed2.schedule,
      baseTarget: seed2.targetNum ?? null,
      lastShiftAt: null,
      lastShiftType: null
    },
    domain_key: seed2.domainKey ?? null,
    goal_id: seed2.goalId,
    habit_environment: seed2.habitEnvironment ?? DEFAULT_HABIT_ENVIRONMENT,
    done_ish_config: {
      booleanPartialEnabled: true,
      quantityThresholdPercent: type === "quantity" ? doneIshThreshold : 80,
      durationThresholdPercent: type === "duration" ? doneIshThreshold : 80
    },
    environment_context: null,
    environment_score: null,
    environment_risk_tags: [],
    environment_last_audited_at: null,
    habit_intent: "build",
    duration_mode: "none",
    duration_value: null,
    duration_unit: null,
    duration_start_at: null,
    duration_end_at: null,
    on_duration_end: null
  };
}
var defaultState = {
  profile: {
    displayName: DEMO_USER_NAME,
    onboardingComplete: false,
    islandRunFirstRunClaimed: false,
    dailyHeartsClaimedDayKey: null,
    aiCoachAccess: DEFAULT_AI_COACH_ACCESS
  },
  goals: [
    {
      id: createId("goal"),
      user_id: DEMO_USER_ID,
      title: "Launch the LifeGoal beta cohort",
      description: "Invite 25 early adopters, gather feedback, and iterate on the habit tracker experience.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 4)),
      target_date: iso(new Date(today.getFullYear(), today.getMonth() + 1, 15)),
      progress_notes: "Beta content is finalized. Scheduling 1:1 kickoff calls next week and preparing support docs for onboarding.",
      status_tag: "on_track",
      life_wheel_category: null,
      secondary_life_wheel_categories: [],
      start_date: null,
      timing_notes: null,
      estimated_duration_days: null,
      why_it_matters: null,
      priority_level: null,
      weekly_workload_target: null,
      plan_quality_score: null,
      plan_quality_breakdown: null,
      environment_context: null,
      environment_score: null,
      environment_last_audited_at: null,
      goal_strategy_type: "standard"
    },
    {
      id: createId("goal"),
      user_id: DEMO_USER_ID,
      title: "Design the 2024 vision board refresh",
      description: "Collect inspiring imagery, craft narrative captions, and share with accountability partners.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 12)),
      target_date: iso(new Date(today.getFullYear(), today.getMonth() + 2, 1)),
      progress_notes: "Gathered 60% of imagery, but workshop facilitation partner is double-booked. Need a backup facilitator.",
      status_tag: "off_track",
      life_wheel_category: null,
      secondary_life_wheel_categories: [],
      start_date: null,
      timing_notes: null,
      estimated_duration_days: null,
      why_it_matters: null,
      priority_level: null,
      weekly_workload_target: null,
      plan_quality_score: null,
      plan_quality_breakdown: null,
      environment_context: null,
      environment_score: null,
      environment_last_audited_at: null,
      goal_strategy_type: "standard"
    },
    {
      id: createId("goal"),
      user_id: DEMO_USER_ID,
      title: "Archive the pilot insights playbook",
      description: "Synthesize interviews, share top 10 learnings, and distribute the retrospective deck to the team.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 3, 22)),
      target_date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 30)),
      progress_notes: "Deliverables shipped! Scheduling a celebration retro and exporting learnings to Notion.",
      status_tag: "achieved",
      life_wheel_category: null,
      secondary_life_wheel_categories: [],
      start_date: null,
      timing_notes: null,
      estimated_duration_days: null,
      why_it_matters: null,
      priority_level: null,
      weekly_workload_target: null,
      plan_quality_score: null,
      plan_quality_breakdown: null,
      environment_context: null,
      environment_score: null,
      environment_last_audited_at: null,
      goal_strategy_type: "standard"
    }
  ],
  habits: [],
  habitLogs: [],
  visionImages: [],
  visionImageTags: [],
  checkins: [],
  notificationPreferences: null,
  telemetryPreferences: {
    user_id: DEMO_USER_ID,
    telemetry_enabled: true,
    created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    updated_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1))
  },
  telemetryEvents: [
    {
      id: "demo-tel-001",
      user_id: DEMO_USER_ID,
      event_type: "onboarding_completed",
      metadata: { source: "game_of_life_onboarding" },
      occurred_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      dedupe_key: null
    },
    {
      id: "demo-tel-002",
      user_id: DEMO_USER_ID,
      event_type: "intervention_accepted",
      metadata: { interventionType: "habit_downshift", option: "Try a 5-minute version" },
      occurred_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10)),
      dedupe_key: null
    },
    {
      id: "demo-tel-003",
      user_id: DEMO_USER_ID,
      event_type: "balance_shift",
      metadata: { harmonyStatus: "rebalancing", fromAxis: "Agency", toAxis: "Vitality" },
      occurred_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
      dedupe_key: null
    },
    {
      id: "demo-tel-004",
      user_id: DEMO_USER_ID,
      event_type: "micro_quest_completed",
      metadata: { questId: "demo-quest-01", questTitle: "3-day streak on morning habit" },
      occurred_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      dedupe_key: null
    },
    {
      id: "demo-tel-005",
      user_id: DEMO_USER_ID,
      event_type: "intervention_accepted",
      metadata: { interventionType: "reflection_prompt", option: "Explore why this habit feels hard" },
      occurred_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)),
      dedupe_key: null
    }
  ],
  goalReflections: [],
  journalEntries: [],
  actions: [],
  projects: [],
  projectTasks: []
};
(function seedRelatedData() {
  const goalLaunch = defaultState.goals[0];
  const goalVision = defaultState.goals[1];
  const goalArchive = defaultState.goals[2];
  const morningRitualId = createId("habit");
  const outreachHabitId = createId("habit");
  const visionBoardId = createId("habit");
  defaultState.habits = [
    createDemoHabit({
      id: morningRitualId,
      goalId: goalLaunch.id,
      title: "Morning focus ritual",
      schedule: { mode: "daily" },
      domainKey: "career",
      habitEnvironment: "At my desk with coffee, before checking email. Quiet space with morning light and my journal ready."
    }),
    createDemoHabit({
      id: outreachHabitId,
      goalId: goalLaunch.id,
      title: "Reach out to a beta tester",
      schedule: { mode: "specific_days", days: ["mon", "wed", "fri"] },
      domainKey: "relationships",
      habitEnvironment: "Using Slack or email after morning standup. Have my list of potential testers ready and template message prepared."
    }),
    createDemoHabit({
      id: visionBoardId,
      goalId: goalVision.id,
      title: "Source a new inspiration image",
      schedule: { mode: "specific_days", days: ["sat"] },
      domainKey: "creativity",
      habitEnvironment: "Saturday morning with tea, browsing Pinterest or Unsplash. Looking for images that resonate with my goals."
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Hydrate with water",
      schedule: { mode: "daily" },
      domainKey: "health",
      type: "quantity",
      targetNum: 80,
      targetUnit: "oz",
      doneIshThreshold: 75,
      habitEnvironment: "Keep water bottle on my desk at all times. Track with marks on the bottle. Refill during breaks."
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Midday stretch walk",
      schedule: { mode: "specific_days", days: ["mon", "tue", "wed", "thu", "fri"] },
      domainKey: "health",
      type: "duration",
      targetNum: 15,
      targetUnit: "minutes",
      doneIshThreshold: 80,
      habitEnvironment: "Outside loop around the block at 2pm. Fresh air, no phone, just movement and thinking."
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Inbox zero sweep",
      schedule: { mode: "specific_days", days: ["mon", "tue", "wed", "thu"] },
      domainKey: "career"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Review tomorrow's priorities",
      schedule: { mode: "daily" },
      domainKey: "mindset"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Capture product insight",
      schedule: { mode: "specific_days", days: ["mon", "wed", "fri"] },
      domainKey: "career"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Update roadmap milestone",
      schedule: { mode: "specific_days", days: ["mon"] },
      domainKey: "career"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Host accountability check-in",
      schedule: { mode: "specific_days", days: ["wed"] },
      domainKey: "relationships"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Share progress update with community",
      schedule: { mode: "specific_days", days: ["fri"] },
      domainKey: "community"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Schedule deep work block",
      schedule: { mode: "specific_days", days: ["tue", "thu"] },
      domainKey: "career"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Strength training circuit",
      schedule: { mode: "specific_days", days: ["tue", "thu"] },
      domainKey: "health"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Digital sunset ritual",
      schedule: { mode: "daily" },
      domainKey: "wellness"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Sleep by 10:30 routine",
      schedule: { mode: "daily" },
      domainKey: "wellness"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalLaunch.id,
      title: "Balanced breakfast prep",
      schedule: { mode: "daily" },
      domainKey: "health"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "Reflect in vision journal",
      schedule: { mode: "specific_days", days: ["sun"] },
      domainKey: "personal_growth"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "Curate mood board snippet",
      schedule: { mode: "specific_days", days: ["thu"] },
      domainKey: "creativity"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "Capture photo inspiration",
      schedule: { mode: "specific_days", days: ["sat", "sun"] },
      domainKey: "creativity"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "Schedule creative play session",
      schedule: { mode: "specific_days", days: ["sat"] },
      domainKey: "fun"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "Sketch storyboard concept",
      schedule: { mode: "specific_days", days: ["tue"] },
      domainKey: "creativity"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "Practice gratitude note",
      schedule: { mode: "daily" },
      domainKey: "mindset"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "10-minute mindful breathing",
      schedule: { mode: "daily" },
      domainKey: "personal_growth"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "Write 3 lines in reflection journal",
      schedule: { mode: "daily" },
      domainKey: "personal_growth"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalVision.id,
      title: "Plan weekend adventure",
      schedule: { mode: "specific_days", days: ["thu"] },
      domainKey: "fun"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalArchive.id,
      title: "Review financial dashboard",
      schedule: { mode: "specific_days", days: ["mon"] },
      domainKey: "finances"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalArchive.id,
      title: "Reconcile budget entries",
      schedule: { mode: "specific_days", days: ["fri"] },
      domainKey: "finances"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalArchive.id,
      title: "Offer mentorship comment",
      schedule: { mode: "specific_days", days: ["wed"] },
      domainKey: "giving_back"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalArchive.id,
      title: "Declutter workspace reset",
      schedule: { mode: "specific_days", days: ["fri"] },
      domainKey: "environment"
    }),
    createDemoHabit({
      id: createId("habit"),
      goalId: goalArchive.id,
      title: "Tend to plant watering",
      schedule: { mode: "specific_days", days: ["wed"] },
      domainKey: "environment"
    })
  ];
  const start = new Date(today);
  start.setDate(start.getDate() - 27);
  for (let i = 0; i < 28; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateIso = date.toISOString().slice(0, 10);
    let morningState;
    let morningDone;
    let morningPercentage;
    if (i % 7 === 2) {
      morningState = "missed";
      morningDone = false;
      morningPercentage = 0;
    } else if (i % 11 === 3) {
      morningState = "skipped";
      morningDone = false;
      morningPercentage = 0;
    } else if (i % 5 === 1) {
      morningState = "doneIsh";
      morningDone = false;
      morningPercentage = 80 + Math.floor(Math.random() * 15);
    } else {
      morningState = "done";
      morningDone = true;
      morningPercentage = 100;
    }
    let outreachState;
    let outreachDone;
    let outreachPercentage;
    if (i % 3 === 0) {
      if (i % 9 === 0) {
        outreachState = "doneIsh";
        outreachDone = false;
        outreachPercentage = 85 + Math.floor(Math.random() * 10);
      } else if (i % 6 === 3) {
        outreachState = "skipped";
        outreachDone = false;
        outreachPercentage = 0;
      } else {
        outreachState = "done";
        outreachDone = true;
        outreachPercentage = 100;
      }
    } else {
      outreachState = "missed";
      outreachDone = false;
      outreachPercentage = 0;
    }
    const morningNote = i === 1 ? "Coach suggested moving this ritual 30 min earlier, before checking phone \u2014 tried it today and felt more focused. Updated environment: coffee prepped the night before." : null;
    defaultState.habitLogs.push(
      {
        id: createId("habit-log"),
        habit_id: morningRitualId,
        user_id: DEMO_USER_ID,
        ts: iso(date),
        date: dateIso,
        value: null,
        done: morningDone,
        note: morningNote,
        mood: null,
        progress_state: morningState,
        completion_percentage: morningPercentage,
        logged_stage: null
      },
      {
        id: createId("habit-log"),
        habit_id: outreachHabitId,
        user_id: DEMO_USER_ID,
        ts: iso(date),
        date: dateIso,
        value: null,
        done: outreachDone,
        note: null,
        mood: null,
        progress_state: outreachState,
        completion_percentage: outreachPercentage,
        logged_stage: null
      }
    );
  }
  defaultState.visionImages = [
    {
      id: createId("vision"),
      user_id: DEMO_USER_ID,
      image_path: null,
      image_url: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80",
      image_source: "url",
      caption: "Morning deep work setup to stay consistent with focus ritual.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 5)),
      file_path: null,
      file_format: null,
      vision_type: "habit",
      review_interval_days: 21,
      last_reviewed_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 20)),
      linked_goal_ids: [goalLaunch.id],
      linked_habit_ids: [morningRitualId]
    },
    {
      id: createId("vision"),
      user_id: DEMO_USER_ID,
      image_path: null,
      image_url: "https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=800&q=80",
      image_source: "url",
      caption: "Community celebration after the beta launch milestone.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 20)),
      file_path: null,
      file_format: null,
      vision_type: "goal",
      review_interval_days: 30,
      last_reviewed_at: null,
      linked_goal_ids: [goalLaunch.id],
      linked_habit_ids: [outreachHabitId]
    }
  ];
  defaultState.checkins = [
    {
      id: createId("checkin"),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      scores: {
        spirituality_community: 5,
        finance_wealth: 6,
        love_relations: 5,
        fun_creativity: 5,
        career_development: 7,
        health_fitness: 6,
        family_friends: 5,
        living_spaces: 6
      }
    },
    {
      id: createId("checkin"),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      scores: {
        spirituality_community: 6,
        finance_wealth: 6,
        love_relations: 6,
        fun_creativity: 6,
        career_development: 8,
        health_fitness: 7,
        family_friends: 6,
        living_spaces: 7
      }
    },
    {
      id: createId("checkin"),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
      scores: {
        spirituality_community: 3,
        finance_wealth: 8,
        love_relations: 4,
        fun_creativity: 3,
        career_development: 9,
        health_fitness: 4,
        family_friends: 4,
        living_spaces: 4
      }
    }
  ];
  defaultState.notificationPreferences = {
    user_id: DEMO_USER_ID,
    habit_reminders_enabled: true,
    habit_reminder_time: "08:00",
    checkin_nudges_enabled: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
    subscription: null,
    created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 12)),
    updated_at: iso(new Date(today.getFullYear(), today.getMonth(), 2))
  };
  defaultState.goalReflections = [
    {
      id: createId("reflection"),
      goal_id: goalLaunch.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)).slice(0, 10),
      confidence: 4,
      highlight: "Completed onboarding playbook recordings and received strong feedback from the first beta captain.",
      challenge: "Need to coordinate calendar slots with three testers who have limited availability this week.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6))
    },
    {
      id: createId("reflection"),
      goal_id: goalLaunch.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)).slice(0, 10),
      confidence: 5,
      highlight: "Shipped revised habit tracker walkthrough and booked 5 new intro calls.",
      challenge: "Document follow-up questions so we can convert interest into active beta signups.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3))
    },
    {
      id: createId("reflection"),
      goal_id: goalLaunch.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 19)).slice(0, 10),
      confidence: 4,
      highlight: "Wrapped partner onboarding guides and scheduled joint announcement with marketing.",
      challenge: "Need a final review of the pricing FAQ before we hit publish.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 19))
    },
    {
      id: createId("reflection"),
      goal_id: goalLaunch.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth() - 2, 21)).slice(0, 10),
      confidence: 3,
      highlight: "Outlined migration checklist and synced with engineering on rollout blockers.",
      challenge: "Still clarifying analytics requirements with two stakeholders.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 21))
    },
    {
      id: createId("reflection"),
      goal_id: goalVision.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8)).slice(0, 10),
      confidence: 3,
      highlight: "Gathered quotes for printing the updated vision board and drafted storytelling script.",
      challenge: "Still missing imagery for the community impact section and facilitator backup.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8))
    },
    {
      id: createId("reflection"),
      goal_id: goalVision.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 7)).slice(0, 10),
      confidence: 4,
      highlight: "Finalized the mood board color palette and secured three new contributor stories.",
      challenge: "Need approval on licensing terms for two photos sourced from the community.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 7))
    },
    {
      id: createId("reflection"),
      goal_id: goalVision.id,
      user_id: DEMO_USER_ID,
      entry_date: iso(new Date(today.getFullYear(), today.getMonth() - 2, 11)).slice(0, 10),
      confidence: 2,
      highlight: "Mapped storytelling outline and flagged where we need additional imagery.",
      challenge: "Waiting on legal review for featuring partner logos in the board.",
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 11))
    }
  ];
  defaultState.journalEntries = [
    {
      id: createId("journal"),
      user_id: DEMO_USER_ID,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
      entry_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
      title: "Certainty spike",
      content: "I have no doubt this launch will be perfect and I am absolutely certain the plan cannot be wrong.",
      mood: "confident",
      tags: ["certainty", "momentum"],
      is_private: true,
      attachments: null,
      linked_goal_ids: [goalLaunch.id],
      linked_habit_ids: [outreachHabitId],
      type: DEFAULT_JOURNAL_TYPE,
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
      irrational_fears: null,
      training_solutions: null,
      concrete_steps: null,
      friction_tag: null,
      ai_suggested_prompt_id: null
    },
    {
      id: createId("journal"),
      user_id: DEMO_USER_ID,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      entry_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      title: "All or nothing push",
      content: "This has to work, no matter what. It feels like the only way forward and I cannot fail.",
      mood: "anxious",
      tags: ["pressure", "focus"],
      is_private: true,
      attachments: null,
      linked_goal_ids: [goalVision.id],
      linked_habit_ids: [visionBoardId],
      type: DEFAULT_JOURNAL_TYPE,
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
      irrational_fears: null,
      training_solutions: null,
      concrete_steps: null,
      friction_tag: null,
      ai_suggested_prompt_id: null
    },
    {
      id: createId("journal"),
      user_id: DEMO_USER_ID,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      entry_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      title: "Beta kickoff energy",
      content: "Hosted three intro calls and felt the cohort's excitement. Captured five new insight threads to unpack tomorrow.",
      mood: "excited",
      tags: ["beta", "momentum"],
      is_private: true,
      attachments: null,
      linked_goal_ids: [goalLaunch.id],
      linked_habit_ids: [morningRitualId, outreachHabitId],
      type: DEFAULT_JOURNAL_TYPE,
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
      irrational_fears: null,
      training_solutions: null,
      concrete_steps: null,
      friction_tag: null,
      ai_suggested_prompt_id: null
    },
    {
      id: createId("journal"),
      user_id: DEMO_USER_ID,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      entry_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      title: "Vision sprint reflection",
      content: "Spent the afternoon curating the board refresh. Loved the deep purple palette that emerged and tagged next steps for the mood boards.",
      mood: "happy",
      tags: ["vision", "creative flow"],
      is_private: true,
      attachments: null,
      linked_goal_ids: [goalVision.id],
      linked_habit_ids: [visionBoardId],
      type: DEFAULT_JOURNAL_TYPE,
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
      irrational_fears: null,
      training_solutions: null,
      concrete_steps: null,
      friction_tag: null,
      ai_suggested_prompt_id: null
    },
    {
      id: createId("journal"),
      user_id: DEMO_USER_ID,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      entry_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      title: "Integrating pilot learnings",
      content: "Documented the post-pilot insights. Noticed a confidence dip midweek when decisions piled up, but feel steady after the walk-and-talk debrief.",
      mood: "neutral",
      tags: ["reflection", "pilot"],
      is_private: true,
      attachments: null,
      linked_goal_ids: [goalArchive.id],
      linked_habit_ids: [visionBoardId],
      type: DEFAULT_JOURNAL_TYPE,
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
      irrational_fears: null,
      training_solutions: null,
      concrete_steps: null,
      friction_tag: null,
      ai_suggested_prompt_id: null
    }
  ];
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  defaultState.actions = [
    {
      id: createId("action"),
      user_id: DEMO_USER_ID,
      title: "Review beta feedback report",
      category: "must_do",
      completed: false,
      completed_at: null,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      expires_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)),
      migrated_to_project_id: null,
      project_id: null,
      order_index: 0,
      notes: "Focus on the top 5 pain points",
      xp_awarded: 0
    },
    {
      id: createId("action"),
      user_id: DEMO_USER_ID,
      title: "Schedule intro call with potential partner",
      category: "must_do",
      completed: false,
      completed_at: null,
      created_at: iso(today),
      expires_at: iso(threeDaysFromNow),
      migrated_to_project_id: null,
      project_id: null,
      order_index: 1,
      notes: null,
      xp_awarded: 0
    },
    {
      id: createId("action"),
      user_id: DEMO_USER_ID,
      title: "Organize digital photo library",
      category: "nice_to_do",
      completed: false,
      completed_at: null,
      created_at: iso(today),
      expires_at: iso(threeDaysFromNow),
      migrated_to_project_id: null,
      project_id: null,
      order_index: 0,
      notes: "Low priority but would be nice",
      xp_awarded: 0
    },
    {
      id: createId("action"),
      user_id: DEMO_USER_ID,
      title: "Plan website redesign",
      category: "project",
      completed: false,
      completed_at: null,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      expires_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)),
      migrated_to_project_id: null,
      project_id: null,
      order_index: 0,
      notes: "This might need to become a full project",
      xp_awarded: 0
    }
  ];
  const demoProjectId = createId("project");
  defaultState.projects = [
    {
      id: demoProjectId,
      user_id: DEMO_USER_ID,
      title: "Launch Marketing Campaign",
      description: "Create and execute a social media marketing campaign for the beta launch",
      status: "active",
      priority: "high",
      goal_id: goalLaunch.id,
      start_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
      target_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14)),
      completed_at: null,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
      updated_at: iso(today),
      archived_at: null,
      color: "#3b82f6",
      icon: "\u{1F680}",
      order_index: 0,
      xp_reward: 150
    },
    {
      id: createId("project"),
      user_id: DEMO_USER_ID,
      title: "Build Community Forum",
      description: "Set up a community discussion space for beta users",
      status: "planning",
      priority: "medium",
      goal_id: goalLaunch.id,
      start_date: null,
      target_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())),
      completed_at: null,
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)),
      updated_at: iso(today),
      archived_at: null,
      color: "#10b981",
      icon: "\u{1F4AC}",
      order_index: 1,
      xp_reward: 100
    }
  ];
  defaultState.projectTasks = [
    {
      id: createId("task"),
      project_id: demoProjectId,
      user_id: DEMO_USER_ID,
      title: "Define target audience",
      description: "Research and document the ideal customer profile",
      status: "done",
      parent_task_id: null,
      depends_on_task_id: null,
      completed: true,
      completed_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      due_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)),
      order_index: 0,
      estimated_hours: 3,
      actual_hours: 2.5
    },
    {
      id: createId("task"),
      project_id: demoProjectId,
      user_id: DEMO_USER_ID,
      title: "Create content calendar",
      description: "Plan 2 weeks of social media content",
      status: "in_progress",
      parent_task_id: null,
      depends_on_task_id: null,
      completed: false,
      completed_at: null,
      due_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)),
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4)),
      updated_at: iso(today),
      order_index: 1,
      estimated_hours: 5,
      actual_hours: null
    },
    {
      id: createId("task"),
      project_id: demoProjectId,
      user_id: DEMO_USER_ID,
      title: "Design social media graphics",
      description: "Create branded images for posts",
      status: "todo",
      parent_task_id: null,
      depends_on_task_id: null,
      completed: false,
      completed_at: null,
      due_date: isoDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)),
      created_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)),
      updated_at: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3)),
      order_index: 2,
      estimated_hours: 8,
      actual_hours: null
    }
  ];
})();
function normalizeGoalRow(goal) {
  let statusTag = goal.status_tag ?? "on_track";
  if (statusTag === "blocked" || statusTag === "off-track") {
    statusTag = "off_track";
  }
  return {
    ...goal,
    description: goal.description ?? null,
    target_date: goal.target_date ?? null,
    progress_notes: goal.progress_notes ?? null,
    status_tag: statusTag,
    why_it_matters: goal.why_it_matters ?? null,
    priority_level: goal.priority_level ?? null,
    weekly_workload_target: goal.weekly_workload_target ?? null,
    plan_quality_score: goal.plan_quality_score ?? null,
    plan_quality_breakdown: goal.plan_quality_breakdown ?? null,
    environment_context: goal.environment_context ?? null,
    environment_score: goal.environment_score ?? null,
    environment_last_audited_at: goal.environment_last_audited_at ?? null,
    goal_strategy_type: goal.goal_strategy_type ?? "standard"
  };
}
function normalizeHabitRow(habit) {
  return {
    ...habit,
    status: habit.status ?? (habit.archived ? "archived" : "active"),
    paused_at: habit.paused_at ?? null,
    paused_reason: habit.paused_reason ?? null,
    resume_on: habit.resume_on ?? null,
    deactivated_at: habit.deactivated_at ?? null,
    deactivated_reason: habit.deactivated_reason ?? null,
    habit_environment: habit.habit_environment ?? DEFAULT_HABIT_ENVIRONMENT,
    done_ish_config: habit.done_ish_config ?? {
      booleanPartialEnabled: true,
      quantityThresholdPercent: 80,
      durationThresholdPercent: 80
    },
    environment_context: habit.environment_context ?? null,
    environment_score: habit.environment_score ?? null,
    environment_risk_tags: habit.environment_risk_tags ?? [],
    environment_last_audited_at: habit.environment_last_audited_at ?? null,
    habit_intent: habit.habit_intent ?? "build",
    duration_mode: habit.duration_mode ?? "none",
    duration_value: habit.duration_value ?? null,
    duration_unit: habit.duration_unit ?? null,
    duration_start_at: habit.duration_start_at ?? null,
    duration_end_at: habit.duration_end_at ?? null,
    on_duration_end: habit.on_duration_end ?? null
  };
}
function loadState() {
  if (typeof window === "undefined") {
    return clone(defaultState);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }
    const parsed = JSON.parse(raw);
    const goals = (parsed.goals ?? clone(defaultState.goals)).map(normalizeGoalRow);
    const profile = {
      ...defaultState.profile,
      ...parsed.profile ?? {}
    };
    return {
      profile,
      goals,
      habits: (parsed.habits ?? clone(defaultState.habits)).map(normalizeHabitRow),
      habitLogs: parsed.habitLogs ?? clone(defaultState.habitLogs),
      visionImages: parsed.visionImages ?? clone(defaultState.visionImages),
      visionImageTags: parsed.visionImageTags ?? clone(defaultState.visionImageTags),
      checkins: parsed.checkins ?? clone(defaultState.checkins),
      notificationPreferences: parsed.notificationPreferences ?? clone(defaultState.notificationPreferences),
      telemetryPreferences: parsed.telemetryPreferences ?? clone(defaultState.telemetryPreferences),
      telemetryEvents: parsed.telemetryEvents ?? clone(defaultState.telemetryEvents),
      goalReflections: parsed.goalReflections ?? clone(defaultState.goalReflections),
      journalEntries: (parsed.journalEntries ?? clone(defaultState.journalEntries)).map(normalizeJournalEntryRow),
      actions: parsed.actions ?? clone(defaultState.actions),
      projects: parsed.projects ?? clone(defaultState.projects),
      projectTasks: parsed.projectTasks ?? clone(defaultState.projectTasks)
    };
  } catch (error) {
    console.warn("Unable to parse demo data state, falling back to defaults.", error);
    return clone(defaultState);
  }
}
var state = loadState();
function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Unable to persist demo data to localStorage.", error);
  }
}
function updateState(updater) {
  state = updater(state);
  persist();
}
function getDemoTelemetryPreference(userId) {
  if (state.telemetryPreferences?.user_id !== userId) {
    return null;
  }
  return clone(state.telemetryPreferences);
}
function addDemoTelemetryEvent(payload) {
  const record = {
    id: payload.id ?? createId("telemetry"),
    user_id: payload.user_id,
    event_type: payload.event_type,
    metadata: payload.metadata ?? {},
    occurred_at: payload.occurred_at ?? (/* @__PURE__ */ new Date()).toISOString(),
    dedupe_key: payload.dedupe_key ?? null
  };
  updateState((current) => ({ ...current, telemetryEvents: [record, ...current.telemetryEvents] }));
  return clone(record);
}
function normalizeJournalEntryRow(entry) {
  return {
    ...entry,
    friction_tag: entry.friction_tag ?? null,
    ai_suggested_prompt_id: entry.ai_suggested_prompt_id ?? null
  };
}

// src/services/telemetry.ts
var preferenceCache = /* @__PURE__ */ new Map();
var MAX_TELEMETRY_WRITES_PER_SESSION = 1e3;
var MAX_TELEMETRY_WRITES_PER_MINUTE = 60;
var telemetryDropLog = new BoundedLog({
  maxEntries: 100,
  aggregationWindowMs: 3e4
});
var sessionWriteCount = 0;
var minuteWindowStart = 0;
var minuteWindowCount = 0;
var telemetryDedupeCache = /* @__PURE__ */ new Set();
function normalizeTelemetryDedupeKey(options) {
  const databaseKey = options.dedupeKey?.trim() || null;
  return {
    databaseKey,
    cacheKey: databaseKey ? `${options.userId}:${options.eventType}:${databaseKey}` : null
  };
}
function takeTelemetryWriteBudget(eventType, now = Date.now()) {
  if (sessionWriteCount >= MAX_TELEMETRY_WRITES_PER_SESSION) {
    telemetryDropLog.push(`budget:session:${eventType}`, { eventType, reason: "session_cap" });
    return false;
  }
  if (now - minuteWindowStart >= 6e4) {
    minuteWindowStart = now;
    minuteWindowCount = 0;
  }
  if (minuteWindowCount >= MAX_TELEMETRY_WRITES_PER_MINUTE) {
    telemetryDropLog.push(`budget:minute:${eventType}`, { eventType, reason: "minute_cap" });
    return false;
  }
  sessionWriteCount += 1;
  minuteWindowCount += 1;
  return true;
}
function toSafeError(appError) {
  const error = new Error(appError.explanation);
  error.name = appError.code;
  return error;
}
async function fetchTelemetryPreference(userId) {
  if (!canUseSupabaseDataForUser(userId)) {
    const demoPreference = getDemoTelemetryPreference(userId);
    return { data: demoPreference, error: null };
  }
  const supabase = getSupabaseClient();
  const result = await guardedCloudCall("database", async () => {
    const { data, error } = await supabase.from("telemetry_preferences").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data ?? null;
  });
  if (!result.ok) {
    return { data: null, error: toSafeError(result.error) };
  }
  return { data: result.data, error: null };
}
async function isTelemetryEnabled(userId) {
  const cached = preferenceCache.get(userId);
  if (typeof cached === "boolean") {
    return cached;
  }
  const { data } = await fetchTelemetryPreference(userId);
  const enabled = data?.telemetry_enabled ?? false;
  preferenceCache.set(userId, enabled);
  return enabled;
}
async function recordTelemetryEvent(options) {
  const telemetryEnabled = await isTelemetryEnabled(options.userId);
  if (!telemetryEnabled) {
    return { data: null, error: null };
  }
  const dedupe = normalizeTelemetryDedupeKey(options);
  if (dedupe.cacheKey && telemetryDedupeCache.has(dedupe.cacheKey)) {
    return { data: null, error: null };
  }
  if (!canUseSupabaseDataForUser(options.userId)) {
    const data = addDemoTelemetryEvent({
      user_id: options.userId,
      event_type: options.eventType,
      metadata: options.metadata ?? {},
      dedupe_key: dedupe.databaseKey
    });
    if (dedupe.cacheKey) telemetryDedupeCache.add(dedupe.cacheKey);
    return { data, error: null };
  }
  if (!takeTelemetryWriteBudget(options.eventType)) {
    return { data: null, error: null };
  }
  const supabase = getSupabaseClient();
  const result = await guardedCloudCall("database", async () => {
    const payload = {
      user_id: options.userId,
      event_type: options.eventType,
      metadata: options.metadata ?? {},
      dedupe_key: dedupe.databaseKey
    };
    if (dedupe.databaseKey) {
      const { error: error2 } = await supabase.from("telemetry_events").upsert(payload, {
        onConflict: "user_id,event_type,dedupe_key",
        ignoreDuplicates: true
      });
      if (error2) throw error2;
      return null;
    }
    const { data, error } = await supabase.from("telemetry_events").insert(payload).select().maybeSingle();
    if (error) throw error;
    return data;
  });
  if (!result.ok) {
    telemetryDropLog.push(`cloud:${result.error.category}:${options.eventType}`, {
      eventType: options.eventType,
      reason: result.error.code
    });
    return { data: null, error: null };
  }
  if (dedupe.cacheKey) telemetryDedupeCache.add(dedupe.cacheKey);
  return { data: result.data ?? null, error: null };
}

// src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
var ISLAND_RUN_ENTRY_DEBUG_PARAM = "islandRunEntryDebug";
var ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY = "island_run_entry_debug_buffer_v1";
var ISLAND_RUN_ENTRY_DEBUG_MAX_BUFFER_ITEMS = 200;
var ISLAND_RUN_ENTRY_DEBUG_MAX_NETWORK_ITEMS = 80;
function getLocationSnapshot() {
  if (typeof window === "undefined") {
    return {
      pathname: "",
      search: "",
      hash: ""
    };
  }
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash
  };
}
function readDebugBuffer() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeDebugBuffer(entries) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = entries.slice(-ISLAND_RUN_ENTRY_DEBUG_MAX_BUFFER_ITEMS);
    window.sessionStorage.setItem(ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY, JSON.stringify(trimmed));
  } catch {
  }
}
function collectNetworkEntries() {
  if (typeof window === "undefined" || typeof window.performance === "undefined") {
    return [];
  }
  const resources = window.performance.getEntriesByType("resource").filter((entry) => {
    if (!("name" in entry) || typeof entry.name !== "string") return false;
    return entry.name.includes("supabase.co") || entry.name.includes("/rest/v1/") || entry.name.includes("island_run_runtime_state");
  }).slice(-ISLAND_RUN_ENTRY_DEBUG_MAX_NETWORK_ITEMS).map((entry) => ({
    name: entry.name,
    initiatorType: entry.initiatorType,
    startTime: Number(entry.startTime.toFixed(2)),
    duration: Number(entry.duration.toFixed(2)),
    transferSize: entry.transferSize
  }));
  return resources;
}
var islandRunRuntimeSnapshotProvider = null;
function collectEnvironmentSnapshot() {
  if (typeof window === "undefined") {
    return {
      userAgent: "unknown",
      language: "unknown",
      viewport: {
        width: 0,
        height: 0,
        devicePixelRatio: 1
      },
      screen: {
        width: 0,
        height: 0
      }
    };
  }
  return {
    userAgent: window.navigator.userAgent,
    language: window.navigator.language,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    },
    screen: {
      width: window.screen?.width ?? 0,
      height: window.screen?.height ?? 0
    }
  };
}
function collectRuntimeSnapshot() {
  try {
    return islandRunRuntimeSnapshotProvider?.();
  } catch (error) {
    return {
      runtimeSnapshotError: error instanceof Error ? error.message : typeof error === "string" ? error : "unknown_runtime_snapshot_error"
    };
  }
}
function collectDebugEvidence() {
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    location: getLocationSnapshot(),
    visibilityState: typeof document === "undefined" ? "unknown" : document.visibilityState,
    environment: collectEnvironmentSnapshot(),
    runtimeSnapshot: collectRuntimeSnapshot(),
    events: readDebugBuffer(),
    network: collectNetworkEntries()
  };
}
function createDebugRunId(scenario) {
  const normalizedScenario = scenario.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const safeScenario = normalizedScenario || "island-run-login";
  return `${safeScenario}-${Date.now().toString(36)}`;
}
function isIslandRunEntryDebugEnabled(search) {
  const effectiveSearch = typeof search === "string" ? search : typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(effectiveSearch);
  return params.get(ISLAND_RUN_ENTRY_DEBUG_PARAM) === "1";
}
function logIslandRunEntryDebug(stage, payload) {
  const entry = {
    stage,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...getLocationSnapshot(),
    payload
  };
  const nextBuffer = [...readDebugBuffer(), entry];
  writeDebugBuffer(nextBuffer);
  if (isIslandRunEntryDebugEnabled()) {
    console.info("[IslandRunEntryDebug]", {
      ...entry,
      ...payload ?? {}
    });
  }
}
function findNextEventIndex(events, startIndex, predicate) {
  for (let index = Math.max(0, startIndex); index < events.length; index += 1) {
    if (predicate(events[index])) {
      return index;
    }
  }
  return -1;
}
function getLatestRuntimeStateEvent(events, stage) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].stage === stage) {
      return events[index];
    }
  }
  return null;
}
function summarizeRuntimeVerification(events) {
  const hydrationEvent = getLatestRuntimeStateEvent(events, "island_run_runtime_hydration_result");
  const persistEvent = getLatestRuntimeStateEvent(events, "runtime_state_persist_success");
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    latestHydrationResult: hydrationEvent ? {
      timestamp: hydrationEvent.timestamp,
      source: hydrationEvent.payload?.source,
      currentIslandNumber: hydrationEvent.payload?.currentIslandNumber,
      bossTrialResolvedIslandNumber: hydrationEvent.payload?.bossTrialResolvedIslandNumber,
      cycleIndex: hydrationEvent.payload?.cycleIndex,
      tokenIndex: hydrationEvent.payload?.tokenIndex,
      spinTokens: hydrationEvent.payload?.spinTokens,
      dicePool: hydrationEvent.payload?.dicePool
    } : void 0,
    latestPersistSuccess: persistEvent ? {
      timestamp: persistEvent.timestamp,
      currentIslandNumber: persistEvent.payload?.currentIslandNumber,
      bossTrialResolvedIslandNumber: persistEvent.payload?.bossTrialResolvedIslandNumber,
      cycleIndex: persistEvent.payload?.cycleIndex,
      tokenIndex: persistEvent.payload?.tokenIndex,
      spinTokens: persistEvent.payload?.spinTokens,
      dicePool: persistEvent.payload?.dicePool
    } : void 0
  };
}
function assertProgressionSequence(events, mode = "table", scope = "full_buffer") {
  const checks = [];
  let cursor = 0;
  const expect = (name, predicate, detail) => {
    const matchedEventIndex = findNextEventIndex(events, cursor, predicate);
    const passed = matchedEventIndex >= 0;
    checks.push({
      name,
      passed,
      detail,
      matchedEventIndex: passed ? matchedEventIndex : void 0
    });
    if (passed) {
      cursor = matchedEventIndex + 1;
    }
  };
  expect(
    "baseline_reset_persist",
    (event) => event.stage === "runtime_state_persist_success" && event.payload?.currentIslandNumber === 1 && event.payload?.bossTrialResolvedIslandNumber === null,
    "Expected persist success with island=1 and boss marker null."
  );
  expect(
    "boss_marker_persist",
    (event) => event.stage === "runtime_state_persist_success" && event.payload?.currentIslandNumber === 1 && event.payload?.bossTrialResolvedIslandNumber === 1,
    "Expected persist success with island=1 and boss marker=1."
  );
  expect(
    "advance_island_persist",
    (event) => event.stage === "runtime_state_persist_success" && event.payload?.currentIslandNumber === 2 && event.payload?.bossTrialResolvedIslandNumber === null,
    "Expected persist success with island=2 and boss marker null."
  );
  expect(
    "refresh_hydration_marker_state",
    (event) => mode === "table" ? event.stage === "runtime_state_hydrate_query_success" && event.payload?.currentIslandNumber === 2 && event.payload?.bossTrialResolvedIslandNumber === null : (event.stage === "runtime_state_hydrate_skipped_remote" || event.stage === "runtime_state_hydrate_query_error" || event.stage === "runtime_state_hydrate_no_row") && event.payload?.fallbackCurrentIslandNumber === 2 && event.payload?.fallbackBossTrialResolvedIslandNumber === null,
    mode === "table" ? "Expected table hydration success with island=2 and boss marker null after refresh." : "Expected fallback hydration event with fallback island=2 and fallback boss marker null after refresh."
  );
  return {
    passed: checks.every((check) => check.passed),
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    mode,
    scope,
    checks
  };
}
function summarizeProgressionAssertionReport(report) {
  const failedChecks = report.checks.filter((check) => !check.passed).map((check) => check.name);
  const passedChecks = report.checks.length - failedChecks.length;
  return {
    passed: report.passed,
    mode: report.mode,
    scope: report.scope,
    generatedAt: report.generatedAt,
    totalChecks: report.checks.length,
    passedChecks,
    failedChecks,
    summaryLine: report.passed ? `PASS [${report.mode}] ${passedChecks}/${report.checks.length} checks` : `FAIL [${report.mode}] ${passedChecks}/${report.checks.length} checks | failed: ${failedChecks.join(", ")}`
  };
}
function isProgressionRelevantEvent(event) {
  return event.stage.startsWith("runtime_state_");
}
function findRunWindow(events, ref) {
  const defaultWindow = {
    startIndex: 0,
    endIndex: events.length,
    matchedRunId: void 0,
    matchedScenario: void 0
  };
  const normalizedRef = typeof ref === "string" ? ref.trim() : "";
  if (!normalizedRef) {
    return defaultWindow;
  }
  let startIndex = -1;
  let matchedRunId;
  let matchedScenario;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.stage !== "repro_run_started") continue;
    const runId = typeof event.payload?.runId === "string" ? event.payload.runId : void 0;
    const scenario = typeof event.payload?.scenario === "string" ? event.payload.scenario : void 0;
    if (runId === normalizedRef || scenario === normalizedRef) {
      startIndex = index;
      matchedRunId = runId;
      matchedScenario = scenario;
      break;
    }
  }
  if (startIndex < 0) {
    return defaultWindow;
  }
  let endIndex = events.length;
  for (let index = startIndex + 1; index < events.length; index += 1) {
    if (events[index].stage === "repro_run_started") {
      endIndex = index;
      break;
    }
  }
  return {
    startIndex,
    endIndex,
    matchedRunId,
    matchedScenario
  };
}
function filterProgressionRunEvents(events, ref) {
  const runWindow = findRunWindow(events, ref);
  const filteredEvents = events.slice(runWindow.startIndex, runWindow.endIndex).filter((event) => isProgressionRelevantEvent(event));
  return {
    ...runWindow,
    filteredEvents
  };
}
function installGlobalDebugListeners() {
  if (typeof window === "undefined") return;
  if (window.__islandRunEntryDebugListenersInstalled) return;
  window.__islandRunEntryDebugListenersInstalled = true;
  window.addEventListener("error", (event) => {
    logIslandRunEntryDebug("window_error", {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error instanceof Error ? event.error.stack : void 0,
      errorName: event.error instanceof Error ? event.error.name : void 0,
      runtimeSnapshot: collectRuntimeSnapshot()
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    logIslandRunEntryDebug("window_unhandled_rejection", {
      reason: reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "unknown_rejection_reason",
      stack: reason instanceof Error ? reason.stack : void 0,
      errorName: reason instanceof Error ? reason.name : void 0,
      runtimeSnapshot: collectRuntimeSnapshot()
    });
  });
  document.addEventListener("visibilitychange", () => {
    logIslandRunEntryDebug("document_visibility_change", {
      visibilityState: document.visibilityState
    });
  });
  window.addEventListener("pageshow", () => {
    logIslandRunEntryDebug("window_pageshow", {
      visibilityState: document.visibilityState
    });
  });
  window.addEventListener("pagehide", () => {
    logIslandRunEntryDebug("window_pagehide", {
      visibilityState: document.visibilityState
    });
  });
}
function installDebugWindowHelpers() {
  if (typeof window === "undefined") return;
  if (!isIslandRunEntryDebugEnabled()) return;
  if (window.__islandRunEntryDebugDump && window.__islandRunEntryDebugClear && window.__islandRunEntryDebugEvidence && window.__islandRunEntryDebugAssertProgressionSequence && window.__islandRunEntryDebugAssertProgressionSummary && window.__islandRunEntryDebugExportProgressionBundle && window.__islandRunEntryDebugFilterProgressionRun) {
    return;
  }
  installGlobalDebugListeners();
  window.__islandRunEntryDebugDump = () => readDebugBuffer();
  window.__islandRunEntryDebugClear = () => writeDebugBuffer([]);
  window.__islandRunEntryDebugEvidence = () => collectDebugEvidence();
  window.__islandRunEntryDebugMark = (label, payload) => {
    logIslandRunEntryDebug("manual_mark", {
      label,
      ...payload
    });
  };
  window.__islandRunEntryDebugStartRun = (scenario) => {
    const runId = createDebugRunId(scenario);
    logIslandRunEntryDebug("repro_run_started", { scenario, runId });
    return runId;
  };
  window.__islandRunEntryDebugMarkCheckpoint = (checkpoint, payload) => {
    logIslandRunEntryDebug("repro_checkpoint", {
      checkpoint,
      ...payload
    });
  };
  window.__islandRunEntryDebugAssertProgressionSequence = (mode = "table") => {
    return assertProgressionSequence(readDebugBuffer(), mode, "full_buffer");
  };
  window.__islandRunEntryDebugAssertProgressionSummary = (mode = "table") => {
    const report = assertProgressionSequence(readDebugBuffer(), mode, "full_buffer");
    const summary = summarizeProgressionAssertionReport(report);
    console.info("[IslandRunEntryDebugAssertionSummary]", summary.summaryLine, summary);
    return summary;
  };
  window.__islandRunEntryDebugExportProgressionBundle = (mode = "table", ref) => {
    const buffer = readDebugBuffer();
    const runScoped = filterProgressionRunEvents(buffer, ref);
    const hasRunFilterRef = typeof ref === "string" && ref.trim().length > 0;
    const hasMatchedRunWindow = Boolean(runScoped.matchedRunId || runScoped.matchedScenario);
    const filterApplied = hasRunFilterRef;
    const filterMatched = hasRunFilterRef && hasMatchedRunWindow;
    const scope = filterMatched ? "run_filtered" : "full_buffer";
    const scopedEvents = scope === "run_filtered" ? runScoped.filteredEvents : void 0;
    const report = assertProgressionSequence(scopedEvents ?? buffer, mode, scope);
    const summary = summarizeProgressionAssertionReport(report);
    const evidence = collectDebugEvidence();
    const bundle = {
      mode,
      scope,
      summary,
      evidence: {
        ...evidence,
        events: scopedEvents ?? evidence.events
      },
      runFilterRef: ref,
      filterApplied,
      filterMatched,
      matchedRunId: runScoped.matchedRunId,
      matchedScenario: runScoped.matchedScenario,
      filteredEventCount: scopedEvents?.length
    };
    console.info("[IslandRunEntryDebugProgressionBundle]", {
      mode,
      scope,
      runFilterRef: ref,
      filterApplied,
      filterMatched,
      matchedRunId: runScoped.matchedRunId,
      matchedScenario: runScoped.matchedScenario,
      summaryLine: summary.summaryLine,
      generatedAt: evidence.generatedAt,
      eventCount: bundle.evidence.events.length,
      networkCount: evidence.network.length
    });
    return bundle;
  };
  window.__islandRunEntryDebugRuntimeStateSummary = () => summarizeRuntimeVerification(readDebugBuffer());
  window.__islandRunEntryDebugFilterProgressionRun = (ref, mode = "table") => {
    const buffer = readDebugBuffer();
    const { filteredEvents, matchedRunId, matchedScenario } = filterProgressionRunEvents(buffer, ref);
    const hasRunFilterRef = typeof ref === "string" && ref.trim().length > 0;
    const hasMatchedRunWindow = Boolean(matchedRunId || matchedScenario);
    const filterApplied = hasRunFilterRef;
    const filterMatched = hasRunFilterRef && hasMatchedRunWindow;
    const scope = filterMatched ? "run_filtered" : "full_buffer";
    const report = assertProgressionSequence(filteredEvents, mode, scope);
    const result = {
      ref,
      filterApplied,
      filterMatched,
      matchedRunId,
      matchedScenario,
      mode,
      scope,
      eventCount: filteredEvents.length,
      events: filteredEvents,
      report
    };
    console.info("[IslandRunEntryDebugProgressionRunFilter]", {
      ref,
      mode,
      scope,
      filterApplied,
      filterMatched,
      matchedRunId,
      matchedScenario,
      eventCount: filteredEvents.length,
      passed: report.passed
    });
    return result;
  };
  logIslandRunEntryDebug("debug_helpers_installed", {
    visibilityState: typeof document === "undefined" ? "unknown" : document.visibilityState
  });
}
installGlobalDebugListeners();
installDebugWindowHelpers();

// src/features/gamification/level-worlds/services/crystalMinersTelemetry.ts
var CRYSTAL_MINERS_BALANCE_VERSION = "2026-09-19.6";
function fingerprint(value) {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n.toString(16);
}
function minerErrorDetails(error) {
  const name = error instanceof Error && ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError"].includes(error.name) ? error.name : "Error";
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const locations = (stack.match(/[A-Za-z0-9_.-]+\.(?:tsx?|jsx?):\d+:\d+/g) ?? []).slice(0, 5).join("|");
  return { error_name: name, error_fingerprint: fingerprint(name + stack), error_locations: locations };
}
function createMinerObserver(options) {
  const playId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const openedAt = Date.now();
  let prep = {};
  const seen = /* @__PURE__ */ new Set();
  const emit = (stage, data = {}, key) => {
    try {
      const c = options.context();
      const p = c.progress;
      const dedupeKey = key ?? `cm:${playId}:${stage}:${p.revision}`;
      if (seen.has(dedupeKey)) return;
      if (seen.size >= 256) seen.delete(seen.values().next().value);
      seen.add(dedupeKey);
      const metadata = { schema_version: 1, game_id: "crystal_miners", balance_version: CRYSTAL_MINERS_BALANCE_VERSION, stage: `crystal_miners_${stage}`, play_id: playId, event_id: options.eventId, event_type: options.eventId.split(":")[0], island_number: c.island, level: p.level, career_revision: p.revision, total_digs: p.digs, tickets: c.tickets, dice: c.dice, ore: p.ore, forge_level: p.forgeLevel, elapsed_ms: Date.now() - openedAt, ...data };
      const record = { stage: metadata.stage, dedupeKey, metadata };
      if (options.emit) {
        options.emit(record);
        return;
      }
      logIslandRunEntryDebug(record.stage, metadata);
      if (options.remoteEnabled) void recordTelemetryEvent({ userId: options.userId, eventType: "island_run_gameplay_event", metadata, dedupeKey }).catch(() => {
      });
    } catch {
    }
  };
  return {
    observe(stage) {
      try {
        emit(stage, { ...prep });
        if (stage === "opened" && options.context().tickets < 1) emit("ticket_pause", { source: "entry" });
      } catch {
      }
    },
    accepted(command, before, after, simulation, durationMs, syncPending) {
      if (command.kind !== "dig") {
        prep[`prep_${command.kind}`] = (prep[`prep_${command.kind}`] ?? 0) + 1;
        prep.prep_ore_spent = (prep.prep_ore_spent ?? 0) + Math.max(0, before.ore - after.ore);
        if (command.kind === "open") {
          const key = `gift_tier_${after.tools[command.slot]}`;
          prep[key] = (prep[key] ?? 0) + 1;
          if (before.superGiftSlots.includes(command.slot)) prep.super_gifts_opened = (prep.super_gifts_opened ?? 0) + 1;
        }
        if (command.kind === "merge_group") prep.prep_merge = (prep.prep_merge ?? 0) + Math.floor(before.tools.filter((t) => t === command.tier).length / 2);
        if (command.kind === "move" && before.tools[command.from] === before.tools[command.to]) prep.prep_merge = (prep.prep_merge ?? 0) + 1;
      }
      if (simulation) {
        const readiness = getMinerReadiness(before);
        emit("attempt", { ...prep, ticket_cost: 1, ticket_unit: "drop", drops_per_event_ticket: EVENT_GAME_PLAYS_PER_TICKET.crystal_miners, event_tickets_spent: before.dropTickets > 0 ? 0 : 1, saved_drop_tickets: after.dropTickets, level: before.level, next_level: after.level, attempt_id: `${options.eventId}:${after.revision}`, outcome: simulation.cleared ? "cleared" : "retry", level_kind: before.level % 10 === 0 ? "boss_rewards" : minerChestsRequired(before.level) === 2 ? "hard_approach" : "normal", buy_tier: minerBuyTier(before.level), highest_tier: Math.max(0, ...before.tools), tool_count: before.tools.filter((t) => t > 0).length, layout_version: before.layoutVersion ?? 10, course_recipe: (before.layoutVersion ?? 10) >= 10 ? minerCourseProfile(before.level).recipe : "legacy", course_height: minerCourseHeight(before.level, before.layoutVersion ?? 10), remaining_blocks: before.blocks.filter((b) => b.hp > 0 && b.kind !== "treasure").length, lane_capacity: readiness.laneCapacity, lane_resistance: readiness.laneResistance, charges_collected: simulation.chargesCollected, impacts_restored: simulation.impactsRestored, keys_collected: simulation.keysCollected, gates_opened: simulation.gatesOpened, lane_power: readiness.lanePower, ready_lanes: readiness.readyLanes, chests_required: minerChestsRequired(before.level), chests_reached: simulation.blocks.filter((b) => b.kind === "treasure" && b.hp === 0).length, new_chests: simulation.treasures, blocks_broken: simulation.broken, ore_gained: simulation.ore, gifts_gained: simulation.gifts, drop_tickets_gained: simulation.ticketDrops, spawned_tools: simulation.spawnedTools, boss_shots: simulation.bossShots, boss_tools_destroyed: simulation.bossDestroyed, score: simulation.score, depth: simulation.depth, ore_before: before.ore, forge_before: before.forgeLevel, guardian_hp_remaining: simulation.blocks.find((b) => b.kind === "boss")?.hp ?? 0, action_ms: Math.max(0, durationMs), simulation_ms: (simulation.frames[simulation.frames.length - 1]?.step ?? 0) / 60 * 1e3, sync_pending: syncPending, milestones_claimed: after.eventTrack.claimedMilestones.filter((n) => !before.eventTrack.claimedMilestones.includes(n)) }, `cm:attempt:${options.eventId}:${after.revision}`);
        prep = {};
        try {
          if (options.context().tickets < 1) emit("ticket_pause", { source: "after_drop" });
        } catch {
        }
      } else if (command.kind === "upgrade" || command.kind === "claim") emit(command.kind, { ore_spent: before.ore - after.ore, sync_pending: syncPending }, `cm:${command.kind}:${options.eventId}:${after.revision}`);
      if (syncPending) emit("sync_pending", { operation: command.kind }, `cm:sync:${options.eventId}:${after.revision}`);
    },
    rejected(command, reason) {
      if (reason === "invalid_save") emit("error", { operation: command.kind, error_name: "InvalidSavedWorkshop", error_code: "CM_INVALID_SAVE" });
      try {
        emit("blocked", { operation: command.kind, reason }, `cm:blocked:${playId}:${options.context().progress.revision}:${command.kind}:${reason}`);
      } catch {
      }
    },
    failure(error, operation) {
      emit("error", { operation, ...minerErrorDetails(error) });
    }
  };
}

// src/services/crystalMinersAnalytics.ts
function summarizeMinerTelemetry(events, filter) {
  const levels = /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set();
  const errors = /* @__PURE__ */ new Map();
  let blocked = 0, returns = 0, offers = 0;
  for (const row of events) {
    const m = row.metadata ?? {};
    if (m.game_id !== "crystal_miners") continue;
    if (filter?.balanceVersion && m.balance_version !== filter.balanceVersion) continue;
    if (filter?.layoutVersion && m.layout_version !== filter.layoutVersion) continue;
    if (m.stage === "crystal_miners_ticket_pause" || m.stage === "crystal_miners_blocked" && m.reason === "insufficient_tickets") blocked++;
    if (m.stage === "crystal_miners_resources_earn") returns++;
    if (m.stage === "crystal_miners_resources_tickets" || m.stage === "crystal_miners_resources_shop") offers++;
    if (m.stage === "crystal_miners_error" || m.stage === "crystal_miners_sync_pending") {
      const key2 = String(m.operation ?? "unknown") + ": " + String(m.error_name ?? "sync pending");
      errors.set(key2, (errors.get(key2) ?? 0) + 1);
    }
    if (m.stage !== "crystal_miners_attempt" || m.schema_version !== 1) continue;
    const key = row.user_id + ":" + String(m.attempt_id ?? row.id);
    if (seen.has(key)) continue;
    seen.add(key);
    const n = (k) => typeof m[k] === "number" && Number.isFinite(m[k]) ? Math.max(0, m[k]) : 0;
    const level2 = n("level");
    if (level2 < 1 || level2 > 40) continue;
    const entry = levels.get(level2) ?? { level: level2, attempts: 0, clears: 0, ore: 0, chests: 0, forge: 0, highestTier: 0, prepOre: 0, dryDrops: 0 };
    entry.prepOre += n("prep_ore_spent");
    entry.dryDrops += n("ore_gained") === 0 ? 1 : 0;
    entry.attempts++;
    entry.clears += m.outcome === "cleared" ? 1 : 0;
    entry.ore += n("ore_gained");
    entry.chests += n("new_chests");
    entry.forge += n("forge_before");
    entry.highestTier += n("highest_tier");
    levels.set(level2, entry);
  }
  return { levels: [...levels.values()].sort((a, b) => a.level - b.level), blocked, returns, offers, errors: [...errors].map(([reason, count]) => ({ reason, count })) };
}

// src/config/islandRunFeatureFlags.ts
var DEFAULT_FLAGS = Object.freeze({
  islandRunEventEngineEnabled: false,
  islandRunShooterBlitzBossEnabled: true,
  islandRunRhythmBossEnabled: true,
  islandRunVisionQuestMysteryEnabled: true,
  islandRunPartnerWheelEnabled: false,
  todaysOfferSpinEntryEnabled: true,
  islandRunEarlyFeaturedCreaturePoolEnabled: false,
  islandRunPreIslandLuckyRollEnabled: false,
  combinedJourneyRewardsEnabled: false,
  islandRunFirstPlayerFunnelScaffoldingEnabled: false,
  minigameTicketPurchasesReady: false,
  journeyDiscArenaEnabled: true
});
var currentFlags = { ...DEFAULT_FLAGS };
function isIslandRunFeatureEnabled(key) {
  return currentFlags[key];
}

// src/features/gamification/level-worlds/services/journeyDiscArmory.ts
var JOURNEY_DISC_WEAPON_IDS = Object.freeze([
  "ram_fin",
  "aegis_ring",
  "pulse_vane"
]);
var JOURNEY_DISC_WEAPON_NAMES = Object.freeze({
  ram_fin: "Comet Fin",
  aegis_ring: "Aegis Ring",
  pulse_vane: "Pulse Vane"
});
var level = (value) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(5, Math.floor(value))) : 0;
function createJourneyDiscArmory(nowMs = Date.now()) {
  return {
    version: 1,
    rank: 1,
    weaponLevels: { ram_fin: 1, aegis_ring: 0, pulse_vane: 0 },
    highestGuardianTierDefeated: 0,
    updatedAtMs: Math.max(0, Math.floor(nowMs))
  };
}
function sanitizeJourneyDiscArmory(value, fallback = createJourneyDiscArmory(0)) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback, weaponLevels: { ...fallback.weaponLevels } };
  const candidate = value;
  const rawLevels = candidate.weaponLevels && typeof candidate.weaponLevels === "object" && !Array.isArray(candidate.weaponLevels) ? candidate.weaponLevels : {};
  const guardianTier = level(candidate.highestGuardianTierDefeated);
  return {
    version: 1,
    rank: Math.max(1, Math.min(3, level(candidate.rank))),
    weaponLevels: {
      ram_fin: Math.max(1, level(rawLevels.ram_fin)),
      aegis_ring: level(rawLevels.aegis_ring),
      pulse_vane: level(rawLevels.pulse_vane)
    },
    highestGuardianTierDefeated: Math.min(3, guardianTier),
    updatedAtMs: typeof candidate.updatedAtMs === "number" && Number.isFinite(candidate.updatedAtMs) ? Math.max(0, Math.floor(candidate.updatedAtMs)) : fallback.updatedAtMs
  };
}
function mergeJourneyDiscArmory(remote, local) {
  return {
    version: 1,
    rank: Math.max(remote.rank, local.rank),
    weaponLevels: {
      ram_fin: Math.max(remote.weaponLevels.ram_fin, local.weaponLevels.ram_fin),
      aegis_ring: Math.max(remote.weaponLevels.aegis_ring, local.weaponLevels.aegis_ring),
      pulse_vane: Math.max(remote.weaponLevels.pulse_vane, local.weaponLevels.pulse_vane)
    },
    highestGuardianTierDefeated: Math.max(remote.highestGuardianTierDefeated, local.highestGuardianTierDefeated),
    updatedAtMs: Math.max(remote.updatedAtMs, local.updatedAtMs)
  };
}

// src/features/gamification/level-worlds/services/islandRunArenaCatalog.ts
var ARENA_GAME_CATALOG = Object.freeze([
  {
    id: "journey_disc_arena",
    displayName: "Journey Disc Arena",
    shortName: "Disc Arena",
    icon: "\u25C9",
    family: "reaction",
    familyLabel: "3D battle",
    description: "Deploy energized relic discs, trigger Surges and knock rivals beyond the ring.",
    availability: "exhibition",
    estimatedSeconds: [20, 45],
    artSrc: null,
    accent: "#5af4ff",
    isNew: true
  },
  {
    id: "feeding_frenzy",
    displayName: "Island Workshop",
    shortName: "Workshop",
    icon: "\u{1F6E0}\uFE0F",
    family: "planning",
    familyLabel: "Planning",
    description: "Fit route materials together and build valuable structures.",
    availability: "active_event",
    estimatedSeconds: [60, 180],
    artSrc: null,
    accent: "#f6b84a"
  },
  {
    id: "lucky_spin",
    displayName: "Fortune Engine",
    shortName: "Fortune",
    icon: "\u2726",
    family: "reaction",
    familyLabel: "Timing",
    description: "Read the engine, react quickly and chase a matching signal.",
    availability: "active_event",
    estimatedSeconds: [45, 120],
    artSrc: null,
    accent: "#d28cff"
  },
  {
    id: "space_excavator",
    displayName: "Space Excavator",
    shortName: "Excavator",
    icon: "\u25C7",
    family: "logic",
    familyLabel: "Deduction",
    description: "Use clues to uncover relics without wasting your dig sites.",
    availability: "active_event",
    estimatedSeconds: [60, 180],
    iconSrc: "/assets/icons/Eventgame_excavator.webp",
    artSrc: null,
    accent: "#59c9ff"
  },
  {
    id: "companion_feast",
    displayName: "Companion Feast",
    shortName: "Feast",
    icon: "\u2748",
    family: "planning",
    familyLabel: "Merge",
    description: "Plan a chain of merges and build the island\u2019s grand feast.",
    availability: "active_event",
    estimatedSeconds: [60, 180],
    artSrc: null,
    accent: "#ff8d7b"
  },
  {
    id: "skybound_expedition",
    displayName: "Skybound Academy",
    shortName: "Skybound",
    icon: "\u2708\uFE0F",
    family: "reaction",
    familyLabel: "3D flight",
    description: "Launch, steer and upgrade five aircraft through Pilot Academy checkrides.",
    availability: "active_event",
    estimatedSeconds: [45, 180],
    iconSrc: "/assets/event-games/skybound-academy/skybound-academy-icon-v1.png",
    artSrc: null,
    accent: "#65ddff",
    isNew: true
  },
  {
    id: "crystal_miners",
    displayName: "Crystal Miners",
    shortName: "Miners",
    icon: "\u26CF",
    family: "planning",
    familyLabel: "Merge & mine",
    description: "Merge stronger tools. Drop into the crystal depths and uncover buried treasure.",
    availability: "exhibition",
    estimatedSeconds: [30, 180],
    iconSrc: "/assets/event-games/crystal-miners/icon.svg",
    artSrc: "/assets/event-games/crystal-miners/cover.svg",
    accent: "#77e9c0",
    isNew: true
  },
  {
    id: "momentum_matrix",
    displayName: "Momentum Matrix",
    shortName: "Matrix",
    icon: "\u2726",
    family: "spatial",
    familyLabel: "Spatial",
    description: "Place route fragments and stabilize complete corridors.",
    availability: "exhibition",
    estimatedSeconds: [90, 240],
    artSrc: "/assets/event-games/momentum-matrix/momentum-matrix-hero.webp",
    accent: "#6fe8ff"
  },
  {
    id: "concord_categories",
    displayName: "Concord Categories",
    shortName: "Categories",
    icon: "\u25C8",
    family: "word",
    familyLabel: "Word links",
    description: "Find three hidden connections among twelve incoming signals.",
    availability: "exhibition",
    estimatedSeconds: [60, 120],
    artSrc: null,
    accent: "#f3c969",
    isNew: true
  },
  {
    id: "lexicon_relay",
    displayName: "Lexicon Relay",
    shortName: "Relay",
    icon: "A\u2197",
    family: "word",
    familyLabel: "Word ladder",
    description: "Change one letter at a time to carry meaning across the relay.",
    availability: "exhibition",
    estimatedSeconds: [45, 100],
    artSrc: null,
    accent: "#9fddff",
    isNew: true
  },
  {
    id: "signal_path",
    displayName: "Signal Path",
    shortName: "Path",
    icon: "\u2301",
    family: "spatial",
    familyLabel: "Route",
    description: "Trace every cell while reaching the numbered beacons in order.",
    availability: "exhibition",
    estimatedSeconds: [45, 90],
    artSrc: null,
    accent: "#76f0d0",
    isNew: true
  },
  {
    id: "twin_sigils",
    displayName: "Twin Sigils",
    shortName: "Sigils",
    icon: "\u25D0",
    family: "logic",
    familyLabel: "Logic",
    description: "Balance light and shadow without making a run of three.",
    availability: "exhibition",
    estimatedSeconds: [90, 180],
    artSrc: null,
    accent: "#c1a6ff",
    isNew: true
  }
]);
var ARENA_GAME_IDS = Object.freeze(
  ARENA_GAME_CATALOG.map((game) => game.id)
);
var ARENA_GAME_ID_SET = new Set(ARENA_GAME_IDS);
function isArenaGameId(value) {
  return typeof value === "string" && ARENA_GAME_ID_SET.has(value);
}
function getArenaGameDefinition(gameId) {
  return ARENA_GAME_CATALOG.find((game) => game.id === gameId);
}

// src/features/gamification/level-worlds/services/journeyDiscArenaIslandIntegration.ts
var ISLAND_EVENT_GRID_SLOT_COUNT = 12;
function resolveIslandEventGridOrder(options) {
  const availableIds = [...new Set(options.availableIds.filter((id2) => id2.length > 0))];
  const available = new Set(availableIds);
  const resolved = [];
  const seen = /* @__PURE__ */ new Set();
  (options.preferredIds ?? []).forEach((id2) => {
    if (!available.has(id2) || seen.has(id2)) return;
    seen.add(id2);
    resolved.push(id2);
  });
  availableIds.forEach((id2) => {
    if (seen.has(id2)) return;
    seen.add(id2);
    resolved.push(id2);
  });
  return resolved;
}
function resolveIslandEventGridSlots(options) {
  const visibleExhibitions = (options.exhibitions ?? []).filter((exhibition) => !options.journeyDiscReplacesTimedEvent || exhibition.gameId !== "journey_disc_arena");
  const requestedSlotCount = Math.max(
    options.templates.length + visibleExhibitions.length,
    Math.floor(options.slotCount ?? ISLAND_EVENT_GRID_SLOT_COUNT)
  );
  const slots = options.templates.map((template) => {
    const isActiveTemplate = template.eventId === options.activeEventType;
    if (options.journeyDiscReplacesTimedEvent && isActiveTemplate) {
      return {
        kind: "journey_disc",
        id: "journey_disc_arena",
        orderId: template.eventId,
        displayName: "Journey Disc Arena",
        icon: "\u25C9",
        active: true
      };
    }
    return {
      kind: "event",
      id: template.eventId,
      orderId: template.eventId,
      eventId: template.eventId,
      displayName: template.displayName,
      icon: template.icon,
      active: !options.journeyDiscReplacesTimedEvent && isActiveTemplate
    };
  });
  visibleExhibitions.forEach((exhibition) => {
    slots.push({
      kind: "exhibition",
      id: `exhibition-${exhibition.gameId}`,
      orderId: exhibition.gameId,
      gameId: exhibition.gameId,
      displayName: exhibition.displayName,
      icon: exhibition.icon,
      active: false
    });
  });
  const orderedIds = resolveIslandEventGridOrder({
    availableIds: slots.map((slot) => slot.orderId),
    preferredIds: options.orderedIds
  });
  const rankById = new Map(orderedIds.map((id2, index) => [id2, index]));
  slots.sort((left, right) => (rankById.get(left.orderId) ?? Number.MAX_SAFE_INTEGER) - (rankById.get(right.orderId) ?? Number.MAX_SAFE_INTEGER));
  const completedSlots = [...slots];
  while (completedSlots.length < requestedSlotCount) {
    completedSlots.push({ kind: "empty", id: `empty-${completedSlots.length}` });
  }
  return completedSlots;
}

// src/features/gamification/level-worlds/services/islandRunActionMutex.ts
var actionMutexes = /* @__PURE__ */ new Map();
var actionBarriers = /* @__PURE__ */ new Map();
function waitForActionBarrierToClear(userId) {
  return actionBarriers.get(userId)?.waitForClear ?? Promise.resolve();
}
function withIslandRunActionLock(userId, work) {
  const previous = actionMutexes.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => void 0).then(async () => {
    await waitForActionBarrierToClear(userId);
    return work();
  });
  const tail = next.catch(() => void 0);
  actionMutexes.set(userId, tail);
  void tail.finally(() => {
    if (actionMutexes.get(userId) === tail) {
      actionMutexes.delete(userId);
    }
  });
  return next;
}
function __resetIslandRunActionMutexesForTests() {
  actionMutexes.clear();
  for (const barrier of actionBarriers.values()) {
    barrier.resolve();
  }
  actionBarriers.clear();
}

// src/features/gamification/level-worlds/services/islandRunConcordProgress.ts
function union(ledger, limit) {
  return [.../* @__PURE__ */ new Set([...ledger?.["1"] ?? [], ...ledger?.["5"] ?? []])].filter((n) => Number.isInteger(n) && n >= 0 && n < limit).sort((a, b) => a - b);
}
var getConcordCollectedSlots = (ledger) => union(ledger, 9);

// src/services/demoSession.ts
function isDemoSession(session2) {
  if (!session2) {
    return false;
  }
  return session2.user?.id === DEMO_USER_ID;
}

// src/features/gamification/level-worlds/services/islandRunDeviceSession.ts
var STORAGE_KEY_PREFIX = "island_run_device_session_id";
function buildStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}_${userId}`;
}
function createDeviceSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `island-run-device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function getIslandRunDeviceSessionId(userId) {
  if (!userId) {
    return createDeviceSessionId();
  }
  if (typeof window === "undefined") {
    return createDeviceSessionId();
  }
  const storageKey = buildStorageKey(userId);
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.trim().length > 0) {
      return existing;
    }
    const next = createDeviceSessionId();
    window.localStorage.setItem(storageKey, next);
    return next;
  } catch {
    return createDeviceSessionId();
  }
}

// src/features/gamification/level-worlds/services/islandRunEconomy.ts
var ISLAND_RUN_DEFAULT_STARTING_DICE = 30;

// src/features/gamification/level-worlds/services/islandRunCommitActionService.ts
async function commitIslandRunRuntimeSnapshot(options) {
  const { client, deviceSessionId, expectedVersion, payload, clientActionId: incomingClientActionId } = options;
  const nextVersion = Math.max(0, Math.floor(expectedVersion)) + 1;
  const clientActionId = typeof incomingClientActionId === "string" && incomingClientActionId.trim().length > 0 ? incomingClientActionId : typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `island-run-action-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  if (typeof client.rpc !== "function") {
    return { status: "error", error: { message: "island_run_commit_action RPC is unavailable on this client.", code: "missing_commit_action_rpc" } };
  }
  const { data: rpcData, error: rpcError } = await client.rpc("island_run_commit_action", {
    p_device_session_id: deviceSessionId,
    p_expected_runtime_version: expectedVersion,
    p_action_type: "runtime_snapshot_upsert",
    p_action_payload: payload,
    p_client_action_id: clientActionId
  });
  if (rpcError) {
    return { status: "error", error: rpcError };
  }
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  const status = typeof row?.status === "string" ? row.status : null;
  if (status === "applied") {
    return {
      status: "applied",
      nextVersion: typeof row.runtime_version === "number" ? row.runtime_version : nextVersion
    };
  }
  if (status === "conflict") {
    return { status: "conflict" };
  }
  if (status === "invalid") {
    return { status: "error", error: { message: row?.server_message ?? "Invalid commit action payload.", code: "invalid_commit_action" } };
  }
  return { status: "error", error: { message: row?.server_message ?? "Unknown commit action status.", code: "unknown_commit_action_status" } };
}

// src/features/gamification/level-worlds/services/islandRunContractV2EssenceBuild.ts
function initStopBuildStatesForIsland(effectiveIslandNumber2) {
  return Array.from({ length: 5 }, (_, stopIndex) => ({
    requiredEssence: getStopUpgradeCost({ islandNumber: effectiveIslandNumber2, stopIndex, currentBuildLevel: 0 }),
    spentEssence: 0,
    buildLevel: 0
  }));
}
function getIslandEssenceMultiplier(islandNumber) {
  const safe = Math.max(1, Math.floor(islandNumber));
  const tier = Math.floor((safe - 1) / 10);
  return Math.pow(1.5, tier);
}
var STOP_UPGRADE_BASE_COSTS = [50, 120, 300];
function getStopUpgradeCost(options) {
  const { islandNumber, stopIndex, currentBuildLevel } = options;
  const baseCost = STOP_UPGRADE_BASE_COSTS[Math.min(currentBuildLevel, STOP_UPGRADE_BASE_COSTS.length - 1)] ?? 300;
  const stopScale = stopIndex === 4 ? 4 : 1 + 0.4 * Math.max(0, stopIndex);
  const islandScale = getIslandEssenceMultiplier(islandNumber);
  return Math.max(1, Math.floor(baseCost * stopScale * islandScale));
}

// src/features/gamification/level-worlds/services/islandRunStopTickets.ts
var STOP_COUNT = 5;
function sanitizeStopTicketsPaidByIsland(stopTicketsPaidByIsland) {
  if (!stopTicketsPaidByIsland || typeof stopTicketsPaidByIsland !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(stopTicketsPaidByIsland)) {
    if (!Array.isArray(value)) continue;
    const seen = /* @__PURE__ */ new Set();
    const cleaned = [];
    for (const raw of value) {
      const idx = Math.floor(raw);
      if (!Number.isFinite(idx)) continue;
      if (idx <= 0 || idx >= STOP_COUNT) continue;
      if (seen.has(idx)) continue;
      seen.add(idx);
      cleaned.push(idx);
    }
    cleaned.sort((a, b) => a - b);
    if (cleaned.length > 0) out[key] = cleaned;
  }
  return out;
}

// src/features/gamification/level-worlds/narrative/islandNarrativeSeenState.ts
function createEmptyIslandNarrativeSeenState() {
  return { beats: {}, episodes: {} };
}
function sanitizeTimestampMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [key, ts] of Object.entries(value)) {
    if (typeof ts === "number" && Number.isFinite(ts)) out[key] = ts;
  }
  return out;
}
function sanitizeIslandNarrativeSeenState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyIslandNarrativeSeenState();
  }
  const candidate = value;
  return {
    beats: sanitizeTimestampMap(candidate.beats),
    episodes: sanitizeTimestampMap(candidate.episodes)
  };
}
function mergeTimestampMaps(left, right) {
  const merged = { ...left };
  for (const [key, ts] of Object.entries(right)) {
    merged[key] = typeof merged[key] === "number" ? Math.max(merged[key], ts) : ts;
  }
  return merged;
}
function mergeIslandNarrativeSeenState(a, b) {
  const left = sanitizeIslandNarrativeSeenState(a);
  const right = sanitizeIslandNarrativeSeenState(b);
  return {
    beats: mergeTimestampMaps(left.beats, right.beats),
    episodes: mergeTimestampMaps(left.episodes, right.episodes)
  };
}

// src/features/gamification/level-worlds/services/islandRunBonusTile.ts
var BONUS_CHARGE_TARGET = 8;
var BONUS_CYCLE_LENGTH = BONUS_CHARGE_TARGET + 1;
function clampBonusCharge(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(BONUS_CHARGE_TARGET, Math.floor(value)));
}
function sanitizeBonusTileChargeByIsland(bonusTileChargeByIsland) {
  const nextMap = {};
  if (!bonusTileChargeByIsland || typeof bonusTileChargeByIsland !== "object") return nextMap;
  for (const [islandKey, innerRaw] of Object.entries(bonusTileChargeByIsland)) {
    if (!innerRaw || typeof innerRaw !== "object") continue;
    const innerCopy = {};
    for (const [idxKey, chargeRaw] of Object.entries(innerRaw)) {
      const idx = Number(idxKey);
      if (!Number.isFinite(idx) || idx < 0) continue;
      if (typeof chargeRaw !== "number" || !Number.isFinite(chargeRaw)) continue;
      const normalized = clampBonusCharge(chargeRaw);
      if (normalized > 0) innerCopy[Math.floor(idx)] = normalized;
    }
    nextMap[islandKey] = innerCopy;
  }
  return nextMap;
}

// src/features/gamification/level-worlds/services/spaceExcavatorCampaignProgress.ts
var SPACE_EXCAVATOR_CAMPAIGN_MILESTONES = [
  { id: "clear_1", pointsRequired: 1, rewardKind: "essence", rewardLabel: "+25 Essence", reward: { essence: 25 } },
  { id: "clear_2", pointsRequired: 2, rewardKind: "dice", rewardLabel: "+5 Dice", reward: { dicePool: 5 } },
  { id: "clear_3", pointsRequired: 3, rewardKind: "shards", rewardLabel: "+1 Shard", reward: { shards: 1 } },
  { id: "clear_5", pointsRequired: 5, rewardKind: "essence", rewardLabel: "+75 Essence", reward: { essence: 75 } },
  { id: "clear_10", pointsRequired: 10, rewardKind: "bundle", rewardLabel: "+25 Dice +3 Shards", reward: { dicePool: 25, shards: 3 } },
  { id: "clear_15", pointsRequired: 15, rewardKind: "essence", rewardLabel: "+150 Essence", reward: { essence: 150 } },
  { id: "clear_20", pointsRequired: 20, rewardKind: "bundle", rewardLabel: "+20 Dice +2 Shards", reward: { dicePool: 20, shards: 2 } },
  { id: "clear_25", pointsRequired: 25, rewardKind: "dice", rewardLabel: "+35 Dice", reward: { dicePool: 35 } },
  { id: "clear_30", pointsRequired: 30, rewardKind: "shards", rewardLabel: "+5 Shards", reward: { shards: 5 } },
  { id: "clear_35", pointsRequired: 35, rewardKind: "bundle", rewardLabel: "+60 Dice +8 Shards +300 Essence", reward: { dicePool: 60, shards: 8, essence: 300 } }
];
var SPACE_EXCAVATOR_DEFAULT_CAMPAIGN_TOTAL_POINTS = 35;
var SPACE_EXCAVATOR_CAMPAIGN_TOTAL_POINTS = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES[SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.length - 1]?.pointsRequired ?? SPACE_EXCAVATOR_DEFAULT_CAMPAIGN_TOTAL_POINTS;
function resolveSpaceExcavatorClaimedMilestoneIds(options) {
  const claimed = new Set(
    (options.claimedMilestoneIds ?? []).filter(
      (id2) => SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.some((milestone) => milestone.id === id2)
    )
  );
  return Array.from(claimed).sort((left, right) => {
    const leftIndex = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.findIndex((milestone) => milestone.id === left);
    const rightIndex = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.findIndex((milestone) => milestone.id === right);
    return leftIndex - rightIndex;
  });
}

// src/features/gamification/level-worlds/services/companionFeastGame.ts
var COMPANION_FEAST_FOOD_TIERS = Object.freeze([
  { tier: 0, id: "moon_berry", name: "Moon Berry", emoji: "\u{1FAD0}", radius: 13, mergeScore: 0, color: "#4c6ef5" },
  { tier: 1, id: "ember_cherry", name: "Ember Cherry", emoji: "\u{1F352}", radius: 17, mergeScore: 2, color: "#e0475f" },
  { tier: 2, id: "sun_plum", name: "Sun Plum", emoji: "\u{1F351}", radius: 22, mergeScore: 5, color: "#f2a65a" },
  { tier: 3, id: "glow_apple", name: "Glow Apple", emoji: "\u{1F34E}", radius: 28, mergeScore: 9, color: "#d64550" },
  { tier: 4, id: "honey_bun", name: "Honey Bun", emoji: "\u{1F96F}", radius: 34, mergeScore: 14, color: "#c98a2c" },
  { tier: 5, id: "cheese_moon", name: "Cheese Moon", emoji: "\u{1F9C0}", radius: 41, mergeScore: 21, color: "#e9b949" },
  { tier: 6, id: "tide_pie", name: "Tide Pie", emoji: "\u{1F967}", radius: 49, mergeScore: 30, color: "#b07b4f" },
  { tier: 7, id: "hearth_pumpkin", name: "Hearth Pumpkin", emoji: "\u{1F383}", radius: 58, mergeScore: 42, color: "#e07b2f" },
  { tier: 8, id: "stew_cauldron", name: "Stew Cauldron", emoji: "\u{1F372}", radius: 68, mergeScore: 58, color: "#7a5c3e" },
  { tier: 9, id: "royal_cake", name: "Royal Cake", emoji: "\u{1F382}", radius: 79, mergeScore: 80, color: "#d98cb3" },
  { tier: 10, id: "grand_feast", name: "Grand Feast", emoji: "\u2728", radius: 91, mergeScore: 120, color: "#f3d16b" }
]);
var COMPANION_FEAST_MAX_TIER = COMPANION_FEAST_FOOD_TIERS.length - 1;
var COMPANION_FEAST_BOWL_WIDTH = 360;
var COMPANION_FEAST_BOWL_HEIGHT = 520;
var COMPANION_FEAST_DEFAULT_PHYSICS = Object.freeze({
  width: COMPANION_FEAST_BOWL_WIDTH,
  height: COMPANION_FEAST_BOWL_HEIGHT,
  gravity: 1900,
  restitution: 0.18,
  airDrag: 0.985
});
var COMPANION_FEAST_CHAIN_MULTIPLIERS = Object.freeze([
  1,
  1.25,
  1.5,
  2,
  2.5,
  3
]);
var COMPANION_FEAST_FEVER_IDLE = Object.freeze({
  charge: 0,
  activeMsRemaining: 0
});
var COMPANION_FEAST_RESULT_TIERS = Object.freeze([
  { id: "nibble", label: "Nibble", emoji: "\u{1F37D}\uFE0F", minScore: 0, rewardDice: 1 },
  { id: "snack", label: "Hearty Snack", emoji: "\u{1F963}", minScore: 320, rewardDice: 2 },
  { id: "banquet", label: "Banquet", emoji: "\u{1F372}", minScore: 830, rewardDice: 3 },
  { id: "grand_feast", label: "Grand Feast", emoji: "\u2728", minScore: 1820, rewardDice: 5 },
  // Culminating prize: reachable only with sustained chains or a Fever run.
  { id: "legendary_feast", label: "Legendary Feast", emoji: "\u{1F451}", minScore: 3300, rewardDice: 8 }
]);

// src/features/gamification/level-worlds/services/companionFeastProgression.ts
var COMPANION_FEAST_LEVELS = Object.freeze([
  { levelIndex: 0, levelNumber: 1, id: "first_cheese", name: "First Cheese", goalTier: 5, flavor: "Merge fruit until the first Cheese Moon \u{1F9C0} rises over the bowl." },
  { levelIndex: 1, levelNumber: 2, id: "tide_pie_trial", name: "Tide Pie Trial", goalTier: 6, flavor: "Stack the harvest higher \u2014 bake a Tide Pie \u{1F967} from the swells." },
  { levelIndex: 2, levelNumber: 3, id: "pumpkin_harvest", name: "Pumpkin Harvest", goalTier: 7, flavor: "Grow the feast into a glowing Hearth Pumpkin \u{1F383}." },
  { levelIndex: 3, levelNumber: 4, id: "cauldron_keeper", name: "Cauldron Keeper", goalTier: 8, flavor: "Simmer everything together into the Stew Cauldron \u{1F372}." },
  { levelIndex: 4, levelNumber: 5, id: "royal_baker", name: "Royal Baker", goalTier: 9, flavor: "Layer a Royal Cake \u{1F382} worthy of the island court." },
  { levelIndex: 5, levelNumber: 6, id: "grand_feast", name: "Grand Feast", goalTier: 10, flavor: "Summon the legendary Grand Feast \u2728 and feed every creature." }
]);
var COMPANION_FEAST_MAX_LEVEL_INDEX = COMPANION_FEAST_LEVELS.length - 1;
var COMPANION_FEAST_REWARD_BAR_MILESTONES = Object.freeze([
  { id: "feast_1", pointsRequired: 1, rewardLabel: "+3 Dice", reward: { dicePool: 3 } },
  { id: "feast_2", pointsRequired: 2, rewardLabel: "+40 Essence", reward: { essence: 40 } },
  { id: "feast_3", pointsRequired: 3, rewardLabel: "+1 Shard", reward: { shards: 1 } },
  { id: "feast_4", pointsRequired: 4, rewardLabel: "+8 Dice +60 Essence", reward: { dicePool: 8, essence: 60 } },
  { id: "feast_5", pointsRequired: 5, rewardLabel: "+2 Shards +100 Essence", reward: { shards: 2, essence: 100 } },
  { id: "feast_6", pointsRequired: 6, rewardLabel: "+20 Dice +4 Shards +200 Essence", reward: { dicePool: 20, shards: 4, essence: 200 } }
]);
var COMPANION_FEAST_REWARD_BAR_TOTAL_POINTS = COMPANION_FEAST_REWARD_BAR_MILESTONES[COMPANION_FEAST_REWARD_BAR_MILESTONES.length - 1]?.pointsRequired ?? 0;
function resolveCompanionFeastClaimedMilestoneIds(options) {
  const claimed = new Set(
    (options.claimedMilestoneIds ?? []).filter(
      (id2) => COMPANION_FEAST_REWARD_BAR_MILESTONES.some((milestone) => milestone.id === id2)
    )
  );
  return Array.from(claimed).sort((left, right) => {
    const leftIndex = COMPANION_FEAST_REWARD_BAR_MILESTONES.findIndex((milestone) => milestone.id === left);
    const rightIndex = COMPANION_FEAST_REWARD_BAR_MILESTONES.findIndex((milestone) => milestone.id === right);
    return leftIndex - rightIndex;
  });
}

// src/features/gamification/level-worlds/services/islandRunOpeningGames.ts
var OPENING_GAMES_CAMPAIGN_KEY = "0:2:campaign";
var OPENING_GAMES_CEREMONY_KEY = "0:2:opening";
var OPENING_GAMES_TEAM_ROLL_TARGET = 12;
var integer2 = (value) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
var timestamp = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
var id = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 160 ? value : null;
var first = (a, b) => a === null ? b : b === null ? a : Math.min(a, b);
function createOpeningGamesCampaignMarker(layout) {
  return { missionId: "opening-games-campaign", version: 1, layout, updatedAtMs: 0 };
}
function sanitizeOpeningGamesCampaignMarker(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw;
  if (value.missionId !== "opening-games-campaign" || value.version !== 1 || value.layout !== "legacy" && value.layout !== "opening-games-v1") return null;
  return { ...createOpeningGamesCampaignMarker(value.layout), updatedAtMs: integer2(value.updatedAtMs) };
}
function usesOpeningGamesCampaign(ledger) {
  return sanitizeOpeningGamesCampaignMarker(ledger[OPENING_GAMES_CAMPAIGN_KEY])?.layout === "opening-games-v1";
}
function mergeOpeningGamesCampaignMarkers(a, b) {
  return { ...createOpeningGamesCampaignMarker(a.layout === "legacy" || b.layout === "legacy" ? "legacy" : "opening-games-v1"), updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs) };
}
function createOpeningGamesCeremonyProgress() {
  return {
    missionId: "host-the-first-games",
    version: 1,
    rollsCompleted: 0,
    venuesPreparedAtMs: null,
    teamsWelcomedAtMs: null,
    beaconLitAtMs: null,
    completedAtMs: null,
    activeAttemptId: null,
    settledAttemptIds: [],
    firstTicketBoostEventId: null,
    updatedAtMs: 0
  };
}
function sanitizeOpeningGamesCeremonyProgress(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return createOpeningGamesCeremonyProgress();
  const value = raw;
  if (value.missionId !== "host-the-first-games" || value.version !== 1) return createOpeningGamesCeremonyProgress();
  const venues = timestamp(value.venuesPreparedAtMs);
  const rollsCompleted = Math.min(OPENING_GAMES_TEAM_ROLL_TARGET, integer2(value.rollsCompleted));
  const teams = venues === null || rollsCompleted < OPENING_GAMES_TEAM_ROLL_TARGET ? null : timestamp(value.teamsWelcomedAtMs);
  const beacon = teams === null ? null : timestamp(value.beaconLitAtMs);
  const completed = beacon === null ? null : timestamp(value.completedAtMs);
  const settled = Array.from(new Set(Array.isArray(value.settledAttemptIds) ? value.settledAttemptIds.map(id).filter((s) => s !== null) : [])).sort();
  const attempt = id(value.activeAttemptId);
  return {
    missionId: "host-the-first-games",
    version: 1,
    rollsCompleted,
    venuesPreparedAtMs: venues,
    teamsWelcomedAtMs: teams,
    beaconLitAtMs: beacon,
    completedAtMs: completed,
    activeAttemptId: beacon !== null && completed === null && attempt && !settled.includes(attempt) ? attempt : null,
    settledAttemptIds: settled,
    firstTicketBoostEventId: completed === null ? null : id(value.firstTicketBoostEventId),
    updatedAtMs: integer2(value.updatedAtMs)
  };
}
function resolveOpeningGamesCeremony(ledger) {
  return sanitizeOpeningGamesCeremonyProgress(ledger[OPENING_GAMES_CEREMONY_KEY]);
}
function mergeOpeningGamesCeremonyProgress(a, b) {
  const newer = a.updatedAtMs === b.updatedAtMs ? (a.activeAttemptId ?? "") >= (b.activeAttemptId ?? "") ? a : b : a.updatedAtMs > b.updatedAtMs ? a : b;
  const settledAttemptIds = Array.from(/* @__PURE__ */ new Set([...a.settledAttemptIds, ...b.settledAttemptIds])).sort();
  return sanitizeOpeningGamesCeremonyProgress({
    ...newer,
    rollsCompleted: Math.max(a.rollsCompleted, b.rollsCompleted),
    venuesPreparedAtMs: first(a.venuesPreparedAtMs, b.venuesPreparedAtMs),
    teamsWelcomedAtMs: first(a.teamsWelcomedAtMs, b.teamsWelcomedAtMs),
    beaconLitAtMs: first(a.beaconLitAtMs, b.beaconLitAtMs),
    completedAtMs: first(a.completedAtMs, b.completedAtMs),
    settledAttemptIds,
    firstTicketBoostEventId: [a.firstTicketBoostEventId, b.firstTicketBoostEventId].filter((value) => value !== null).sort()[0] ?? null,
    activeAttemptId: newer.activeAttemptId && !settledAttemptIds.includes(newer.activeAttemptId) ? newer.activeAttemptId : null
  });
}
function resolveOpeningGamesAccess(ledger, islandNumber) {
  const legacy = !usesOpeningGamesCampaign(ledger);
  const progress = resolveOpeningGamesCeremony(ledger);
  return {
    ordinaryEvents: legacy || progress.completedAtMs !== null,
    inauguralRound: !legacy && islandNumber === 2 && progress.beaconLitAtMs !== null && progress.completedAtMs === null,
    orientation: !legacy && islandNumber === 1
  };
}

// src/features/gamification/level-worlds/services/islandRunVaultRush.ts
var VAULT_RUSH_MAX_CLAIMS_PER_ISLAND = 5;
function clampClaimCount(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(VAULT_RUSH_MAX_CLAIMS_PER_ISLAND, Math.floor(value)));
}
function sanitizeVaultRushClaimsByIsland(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const sanitized = {};
  for (const [islandKey, count] of Object.entries(value)) {
    const effectiveIslandNumber2 = Number(islandKey);
    if (!Number.isFinite(effectiveIslandNumber2) || effectiveIslandNumber2 < 1) continue;
    const normalizedCount = clampClaimCount(count);
    if (normalizedCount > 0) sanitized[String(Math.floor(effectiveIslandNumber2))] = normalizedCount;
  }
  return sanitized;
}

// src/features/gamification/level-worlds/services/island17Awakening.ts
var TITAN_EYE_TARGET = [1, 3];
var TITAN_TEETH_TARGET = [2, 0, 1];
var TITAN_LENS_TARGET = 4;
function sanitizeTitanAwakening(raw, legacyComplete = false) {
  const r = raw && typeof raw === "object" ? raw : {};
  const int = (v, max) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
  const phase = int(r.phase, 6);
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 3).filter((v, i) => v === i) : [];
  const prefix = [];
  for (const v of ingredients) {
    if (v !== prefix.length) break;
    prefix.push(v);
  }
  return {
    version: 1,
    phase,
    revision: int(r.revision, Number.MAX_SAFE_INTEGER),
    ingredients: phase >= 1 ? [0, 1, 2] : prefix,
    eyes: phase >= 3 ? [...TITAN_EYE_TARGET] : [int(r.eyes?.[0], 3), int(r.eyes?.[1], 3)],
    teeth: phase >= 4 ? [...TITAN_TEETH_TARGET] : [int(r.teeth?.[0], 2), int(r.teeth?.[1], 2), int(r.teeth?.[2], 2)],
    lens: phase >= 5 ? TITAN_LENS_TARGET : int(r.lens, 7),
    legacyComplete: r.legacyComplete === true || legacyComplete
  };
}
function mergeTitanAwakening(a, b) {
  const winner = a.phase !== b.phase ? a.phase > b.phase ? a : b : a.revision !== b.revision ? a.revision > b.revision ? a : b : JSON.stringify(a) >= JSON.stringify(b) ? a : b;
  return sanitizeTitanAwakening({ ...winner, legacyComplete: a.legacyComplete || b.legacyComplete });
}

// src/features/onboarding/worldPortalAccess.ts
var WORLD_PORTAL_ISLAND = 40;
var WORLD_PORTAL_EVENT_ID = "island-040-caretaker-world-portal-v1";
var WORLD_PORTAL_COUNCIL_BRIEF = Object.freeze({
  eventId: WORLD_PORTAL_EVENT_ID,
  islandNumber: WORLD_PORTAL_ISLAND,
  participants: "All island caretakers",
  title: "The Meeting Between Worlds",
  beats: Object.freeze([
    "All caretakers gather on Island 40, with remote links where needed.",
    "They reflect on the small choices and discoveries the player has made.",
    "They offer the portal: a way to carry those discoveries into everyday life.",
    "The player accepts the tool; canonical ownership is recorded once before presentation.",
    "Today opens with editable suggestions, only using answers the player has agreed to use."
  ]),
  replay: "Replay the meeting without granting ownership or rewards again.",
  existingLaterPlayers: "Offer a recoverable council invitation; never require replaying forty islands."
});

// src/features/gamification/level-worlds/services/worldPortalProgress.ts
var WORLD_PORTAL_KEY = WORLD_PORTAL_EVENT_ID;
function sanitizeWorldPortalProgress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value;
  if (record.missionId !== "world-portal" || record.version !== 1 || typeof record.acceptedAtMs !== "number" || !Number.isSafeInteger(record.acceptedAtMs) || record.acceptedAtMs <= 0) return null;
  return {
    missionId: "world-portal",
    version: 1,
    acceptedAtMs: record.acceptedAtMs,
    updatedAtMs: record.acceptedAtMs
  };
}
function mergeWorldPortalProgress(a, b) {
  const left = sanitizeWorldPortalProgress(a), right = sanitizeWorldPortalProgress(b);
  if (!left) return right;
  if (!right) return left;
  return left.acceptedAtMs <= right.acceptedAtMs ? left : right;
}

// src/features/gamification/level-worlds/services/arenaJourney.ts
var ARENA_JOURNEY_KEY = "arena-journey-v1";
var ARENA_INTRODUCTIONS = {
  signal_path: 2,
  crystal_miners: 3,
  journey_disc_arena: 6
};
var timestamp2 = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
function sanitizeArenaJourney(value) {
  const raw = value && typeof value === "object" ? value : {};
  const introduced = {}, played = {};
  for (const id2 of ARENA_GAME_IDS) {
    if (ARENA_INTRODUCTIONS[id2] && timestamp2(raw.introduced?.[id2])) introduced[id2] = raw.introduced[id2];
    if (introduced[id2] && timestamp2(raw.played?.[id2])) played[id2] = raw.played[id2];
  }
  const comparisons = {};
  for (const a of ARENA_GAME_IDS) for (const b of ARENA_GAME_IDS) {
    if (a >= b) continue;
    const key = arenaComparisonKey(a, b), vote = raw.comparisons?.[key];
    if (vote && (vote.winner === a || vote.winner === b) && timestamp2(vote.at)) comparisons[key] = vote;
  }
  const attempt = raw.signalAttempt;
  const stadium = raw.stadium;
  const stadiumAttempt = stadium?.attempt;
  return {
    missionId: "arena-journey",
    version: 1,
    updatedAtMs: timestamp2(raw.updatedAtMs) ? raw.updatedAtMs : 0,
    introduced,
    played,
    comparisons,
    stadium: stadium && /^\d+:\d+:\d+$/.test(stadium.key) && stadium.key.length < 100 && timestamp2(stadium.startedAtMs) ? {
      key: stadium.key,
      startedAtMs: stadium.startedAtMs,
      playedAtMs: timestamp2(stadium.playedAtMs) ? stadium.playedAtMs : null,
      completedAtMs: timestamp2(stadium.playedAtMs) && timestamp2(stadium.completedAtMs) ? stadium.completedAtMs : null,
      attempt: stadiumAttempt && !!ARENA_INTRODUCTIONS[stadiumAttempt.gameId] && typeof stadiumAttempt.eventId === "string" && stadiumAttempt.eventId.length <= 160 && Number.isFinite(stadiumAttempt.baseline) && stadiumAttempt.baseline >= 0 ? { gameId: stadiumAttempt.gameId, eventId: stadiumAttempt.eventId, baseline: stadiumAttempt.baseline } : null
    } : null,
    signalAttempt: attempt && typeof attempt.id === "string" && attempt.id.length <= 100 && Number.isInteger(attempt.island) && attempt.island >= 2 && typeof attempt.eventId === "string" && attempt.eventId.length <= 160 ? attempt : null
  };
}
function mergeArenaJourney(a, b) {
  const newer = a.updatedAtMs >= b.updatedAtMs ? a : b;
  const next = sanitizeArenaJourney({ ...newer, introduced: { ...a.introduced, ...b.introduced }, played: { ...a.played, ...b.played } });
  for (const id2 of ARENA_GAME_IDS) {
    if (a.introduced[id2] && b.introduced[id2]) next.introduced[id2] = Math.min(a.introduced[id2], b.introduced[id2]);
    if (a.played[id2] && b.played[id2]) next.played[id2] = Math.min(a.played[id2], b.played[id2]);
  }
  for (const key of /* @__PURE__ */ new Set([...Object.keys(a.comparisons), ...Object.keys(b.comparisons)])) {
    const left = a.comparisons[key], right = b.comparisons[key];
    next.comparisons[key] = !left ? right : !right || left.at >= right.at ? left : right;
  }
  if (a.stadium && b.stadium && a.stadium.key === b.stadium.key && next.stadium) {
    next.stadium.playedAtMs = a.stadium.playedAtMs ?? b.stadium.playedAtMs;
    next.stadium.completedAtMs = a.stadium.completedAtMs ?? b.stadium.completedAtMs;
  }
  return next;
}
function arenaComparisonKey(a, b) {
  return [a, b].sort().join(":");
}

// src/features/gamification/level-worlds/services/islandRunTileReservations.ts
var PRODUCTION_TILE_COUNT = 36;
var fraction = (index) => index / PRODUCTION_TILE_COUNT;
var LANDMARK_CLUSTER_FRACTIONS = [
  fraction(31),
  fraction(32),
  fraction(33),
  fraction(4),
  fraction(5),
  fraction(6),
  fraction(13),
  fraction(14),
  fraction(15),
  fraction(22),
  fraction(23),
  fraction(24)
];
var SYSTEM_FRACTIONS = [
  fraction(19),
  // Traffic Light
  0.35,
  // Build Discount
  0.85,
  // Living Ticket
  fraction(17),
  // caretaker card station
  fraction(34),
  // normal encounter
  0.275,
  // seasonal / rare encounter A
  0.775
  // seasonal / rare encounter B
];

// src/features/gamification/level-worlds/services/islandRunMoonwellThermal.ts
var timestamp3 = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
function sanitizeMoonwellThermalProgress(raw) {
  const heatedAtMs = timestamp3(raw.heatedAtMs);
  return {
    missionId: "moonwell-thermal",
    version: 1,
    heatCollectedAtMs: timestamp3(raw.heatCollectedAtMs) ?? heatedAtMs,
    heatedAtMs,
    updatedAtMs: timestamp3(raw.updatedAtMs) ?? 0
  };
}
function mergeMoonwellThermalProgress(a, b) {
  const earliest = (x, y) => x === null ? y : y === null ? x : Math.min(x, y);
  return {
    missionId: "moonwell-thermal",
    version: 1,
    heatCollectedAtMs: earliest(a.heatCollectedAtMs, b.heatCollectedAtMs),
    heatedAtMs: earliest(a.heatedAtMs, b.heatedAtMs),
    updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
  };
}

// src/features/gamification/level-worlds/services/islandRunSignatureMissions.ts
var FROSTWELL_DEPTH_METERS = 500;
var FROSTWELL_DRILL_TILE_INDICES = Object.freeze([8, 17, 27]);
var FROSTWELL_SPIN_METERS = Object.freeze([15, 20, 25, 30, 40, 50, 60, 75]);
var CELESTIAL_REDOCKING_ROLL_TARGET = 20;
var ROOTHEART_POWERWORKS_MAX_STAGE = 3;
var ROOTHEART_POWERWORKS_BASE_STAGE_COSTS = Object.freeze([600, 900, 1500]);
var ROOTHEART_POWER_COMPONENTS = Object.freeze([
  { id: "root-bearing", tileIndex: 1, label: "Root bearing" },
  { id: "paddle-ring", tileIndex: 8, label: "Paddle ring" },
  { id: "brass-axle", tileIndex: 11, label: "Brass axle" },
  { id: "water-gate", tileIndex: 16, label: "Water gate" },
  { id: "dynamo-coil", tileIndex: 21, label: "Dynamo coil" },
  { id: "flywheel-governor", tileIndex: 26, label: "Flywheel governor" },
  { id: "sapglass-capacitor", tileIndex: 29, label: "Sapglass capacitor" },
  { id: "lantern-relay", tileIndex: 35, label: "Lantern relay" }
]);
var SUNKEN_SANDS_TREASURE_ROLL_TARGET = 20;
var SUNKEN_SANDS_FIRST_TREASURE_ID = "sunscarab-token";
var FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET = 10;
var FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES = Object.freeze([
  0,
  1,
  3,
  7,
  10,
  13,
  17,
  21,
  26,
  29
]);
var FIRST_LIGHT_ASSEMBLY_LEGACY_TILE_INDICES = [
  0,
  1,
  2,
  3,
  7,
  8,
  9,
  10,
  11,
  13,
  16,
  17,
  18,
  20,
  21,
  25,
  26,
  27,
  28,
  29
];
var CACTUS_CANYON_SPIRAL_MAX_SEGMENTS = 16;
var CACTUS_CANYON_DYNAMITE_CACHE_FRACTIONS = Object.freeze([
  1 / 36,
  8 / 36,
  10 / 36,
  17 / 36,
  20 / 36,
  26 / 36,
  28 / 36,
  35 / 36
]);
var CACTUS_CANYON_DYNAMITE_CACHE_AMOUNTS = Object.freeze([1, 1, 3, 1, 1, 3, 1, 1]);
var GREAT_HONEYFALL_MAX_STAGE = 4;
var LAVA_LABYRINTH_ISLAND_NUMBER = 20;
var GREAT_HONEYFALL_NECTAR_TILE_FRACTIONS = Object.freeze([
  2 / 36,
  11 / 36,
  20 / 36,
  29 / 36
]);
var LIVING_COMPASS_MAX_STAGE = 5;
var LIVING_COMPASS_GLYPH_TILE_FRACTIONS = Object.freeze([
  2 / 36,
  9 / 36,
  16 / 36,
  25 / 36,
  34 / 36
]);
var STAGED_RESTORATION_MISSIONS = Object.freeze({
  17: {
    islandNumber: 17,
    missionId: "rebuild-the-titans-spine",
    pickupKind: "titan_soul_bolt",
    pickupLabel: "Titan Bone",
    actionLabel: "Restore Spine Section",
    stageLabel: "Spine Sections Restored",
    stageCount: 8,
    chargeCostPerStage: 1,
    preferredPickupFractions: [0 / 36, 3 / 36, 8 / 36, 11 / 36, 18 / 36, 20 / 36, 26 / 36, 29 / 36]
  },
  4: {
    islandNumber: 4,
    missionId: "broken-causeway",
    pickupKind: "causeway_masonry",
    pickupLabel: "Masonry Spark",
    actionLabel: "Raise Causeway Span",
    stageLabel: "Causeway Spans",
    stageCount: 3,
    chargeCostPerStage: 2,
    preferredPickupFractions: [1 / 36, 8 / 36, 11 / 36, 20 / 36, 26 / 36, 35 / 36]
  },
  16: {
    islandNumber: 16,
    missionId: "moon-mirrors",
    pickupKind: "moon_mirror_lens",
    pickupLabel: "Moon Lens",
    actionLabel: "Align Next Mirror",
    stageLabel: "Mirrors Aligned",
    stageCount: 5,
    chargeCostPerStage: 1,
    preferredPickupFractions: [2 / 36, 10 / 36, 18 / 36, 26 / 36, 35 / 36]
  },
  7: {
    islandNumber: 7,
    missionId: "breathline",
    pickupKind: "breathline_pressure_pearl",
    pickupLabel: "Pressure Pearl",
    actionLabel: "Pressurize District",
    stageLabel: "Districts Breathing",
    stageCount: 4,
    chargeCostPerStage: 1,
    preferredPickupFractions: [3 / 36, 11 / 36, 20 / 36, 28 / 36]
  },
  8: {
    islandNumber: 8,
    missionId: "jungle-expedition-living-compass",
    pickupKind: "wayfinder_glyph",
    pickupLabel: "Wayfinder Glyph",
    actionLabel: "Awaken Next Compass Seal",
    stageLabel: "Compass Seals Awakened",
    stageCount: LIVING_COMPASS_MAX_STAGE,
    chargeCostPerStage: 1,
    preferredPickupFractions: LIVING_COMPASS_GLYPH_TILE_FRACTIONS
  },
  9: {
    islandNumber: 9,
    missionId: "ignition-chain",
    pickupKind: "ignition_core",
    pickupLabel: "Ignition Core",
    actionLabel: "Fire Next Mechanism",
    stageLabel: "Systems Ignited",
    stageCount: 8,
    chargeCostPerStage: 1,
    preferredPickupFractions: [0 / 36, 3 / 36, 8 / 36, 11 / 36, 18 / 36, 20 / 36, 26 / 36, 29 / 36]
  },
  18: {
    islandNumber: 18,
    missionId: "great-pollination",
    pickupKind: "pollination_pollen_light",
    pickupLabel: "Pollen Light",
    actionLabel: "Awaken Garden Family",
    stageLabel: "Gardens Blooming",
    stageCount: 5,
    chargeCostPerStage: 1,
    preferredPickupFractions: [1 / 36, 8 / 36, 16 / 36, 25 / 36, 35 / 36]
  },
  20: {
    islandNumber: 20,
    missionId: "escape-lava-labyrinth",
    pickupKind: "heatshield_plate",
    pickupLabel: "Heatshield Plate",
    actionLabel: "Forge Iron Skiff System",
    stageLabel: "Escape Systems Ready",
    stageCount: 4,
    chargeCostPerStage: 2,
    preferredPickupFractions: [2 / 36, 7 / 36, 11 / 36, 16 / 36, 20 / 36, 25 / 36, 29 / 36, 35 / 36]
  },
  19: {
    islandNumber: 19,
    missionId: "restart-wonder-circuit",
    pickupKind: "golden_ride_ticket",
    pickupLabel: "Coaster Section Order",
    actionLabel: "Install Coaster Section",
    stageLabel: "Coaster Sections Installed",
    stageCount: 3,
    chargeCostPerStage: 2,
    preferredPickupFractions: [2 / 36, 8 / 36, 14 / 36, 20 / 36, 27 / 36, 34 / 36]
  }
});
function getStagedRestorationMissionDescriptorById(missionId) {
  if (missionId === "forge-four-firebridges") return STAGED_RESTORATION_MISSIONS[20] ?? null;
  return Object.values(STAGED_RESTORATION_MISSIONS).find((descriptor) => descriptor.missionId === missionId) ?? null;
}
var COASTER_SECTION_BASE_PRICES = Object.freeze([700, 1e3, 1600]);
var COASTER_SECTION_NAMES = Object.freeze(["Lift hill & station", "Super-speed drop", "Double spiral"]);
var COASTER_DIRECTOR_TILE_FRACTIONS = Object.freeze([8 / 36, 27 / 36]);
var FISHERMANS_VILLAGE_FISH_TARGET_KG = 100;
var FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG = FISHERMANS_VILLAGE_FISH_TARGET_KG;
var FISHERMANS_VILLAGE_ASSISTED_CASTS_AFTER_MISS = 2;
var FISHERMANS_VILLAGE_ROD_TILE_INDICES = Object.freeze([2, 8, 11, 17, 26, 35]);
function finiteInteger(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
}
function sanitizeNonNegativeTileIndices(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((candidate) => finiteInteger(candidate, -1)).filter((candidate) => candidate >= 0))).sort((a, b) => a - b);
}
var ROOTHEART_COMPONENT_IDS = new Set(
  ROOTHEART_POWER_COMPONENTS.map((component) => component.id)
);
function sanitizeRootheartComponentIds(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  value.forEach((raw) => {
    if (typeof raw !== "string" || !ROOTHEART_COMPONENT_IDS.has(raw)) return;
    const id2 = raw;
    if (!result.includes(id2)) result.push(id2);
  });
  return ROOTHEART_POWER_COMPONENTS.map((component) => component.id).filter((id2) => result.includes(id2));
}
function sanitizeIslandRunSignatureMissionProgress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  Object.entries(value).forEach(([key, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const record = raw;
    if (key === WORLD_PORTAL_KEY || record.missionId === "world-portal") {
      const portal = sanitizeWorldPortalProgress(record);
      if (key === WORLD_PORTAL_KEY && portal) result[key] = portal;
      return;
    }
    if (record.missionId === "arena-journey") {
      if (key === ARENA_JOURNEY_KEY && record.version === 1) result[key] = sanitizeArenaJourney(record);
      return;
    }
    if (record.missionId === "opening-games-campaign") {
      const marker = sanitizeOpeningGamesCampaignMarker(record);
      if (key === OPENING_GAMES_CAMPAIGN_KEY && marker) result[key] = marker;
      return;
    }
    if (record.missionId === "host-the-first-games") {
      if (key === OPENING_GAMES_CEREMONY_KEY && record.version === 1) result[key] = sanitizeOpeningGamesCeremonyProgress(record);
      return;
    }
    if (record.missionId === "moonwell-thermal" && /^\d+:3:moonwell$/.test(key)) {
      result[key] = sanitizeMoonwellThermalProgress(record);
      return;
    }
    const stagedDescriptor = getStagedRestorationMissionDescriptorById(record.missionId ?? record.mission_id);
    if (stagedDescriptor) {
      const claimedRaw = record.claimedPickupTileIndices ?? record.claimed_pickup_tile_indices;
      const pickupTarget = stagedDescriptor.stageCount * stagedDescriptor.chargeCostPerStage;
      const claimedPickupTileIndices = Array.isArray(claimedRaw) ? Array.from(new Set(claimedRaw.map((candidate) => finiteInteger(candidate, -1)).filter((candidate) => candidate >= 0))).sort((a, b) => a - b).slice(0, pickupTarget) : [];
      const chargesEarned = Math.max(
        claimedPickupTileIndices.length,
        Math.min(pickupTarget, Math.max(0, finiteInteger(record.chargesEarned ?? record.charges_earned)))
      );
      const activatedStages = Math.max(0, Math.min(
        stagedDescriptor.stageCount,
        finiteInteger(record.activatedStages ?? record.activated_stages)
      ));
      const chargesSpent = Math.max(
        activatedStages * stagedDescriptor.chargeCostPerStage,
        Math.min(chargesEarned, Math.max(0, finiteInteger(record.chargesSpent ?? record.charges_spent)))
      );
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const startedAtRaw = record.startedAtMs ?? record.started_at_ms;
      const finaleCompletedAtRaw = record.finaleCompletedAtMs ?? record.finale_completed_at_ms;
      const updatedAtRaw2 = record.updatedAtMs ?? record.updated_at_ms;
      result[key] = {
        missionId: stagedDescriptor.missionId,
        ...stagedDescriptor.islandNumber === 17 ? { titanAwakening: sanitizeTitanAwakening(record.titanAwakening, !record.titanAwakening && activatedStages >= 8) } : {},
        version: 1,
        claimedPickupTileIndices,
        chargesEarned,
        chargesSpent,
        activatedStages,
        lastActivatedStage: activatedStages > 0 ? activatedStages : null,
        startedAtMs: typeof startedAtRaw === "number" && Number.isFinite(startedAtRaw) ? Math.max(0, startedAtRaw) : stagedDescriptor.islandNumber === LAVA_LABYRINTH_ISLAND_NUMBER ? null : 0,
        finaleCompletedAtMs: typeof finaleCompletedAtRaw === "number" && Number.isFinite(finaleCompletedAtRaw) ? Math.max(0, finaleCompletedAtRaw) : null,
        completedAtMs: typeof completedAtRaw === "number" && Number.isFinite(completedAtRaw) ? Math.max(0, completedAtRaw) : activatedStages >= stagedDescriptor.stageCount ? 0 : null,
        updatedAtMs: typeof updatedAtRaw2 === "number" && Number.isFinite(updatedAtRaw2) ? Math.max(0, updatedAtRaw2) : 0
      };
      return;
    }
    if (record.missionId === "fishermans-village-fishing" || record.mission_id === "fishermans-village-fishing") {
      const pendingRaw = record.pendingCatch ?? record.pending_catch;
      const pendingRecord = pendingRaw && typeof pendingRaw === "object" && !Array.isArray(pendingRaw) ? pendingRaw : null;
      const pendingKind = pendingRecord?.kind;
      const pendingCatch = pendingRecord && (pendingKind === "nothing" || pendingKind === "small" || pendingKind === "medium" || pendingKind === "large" || pendingKind === "colossal") ? {
        catchId: Math.max(1, finiteInteger(pendingRecord.catchId ?? pendingRecord.catch_id, 1)),
        kind: pendingKind,
        kilograms: Math.max(0, finiteInteger(pendingRecord.kilograms)),
        pullsRequired: Math.max(1, finiteInteger(pendingRecord.pullsRequired ?? pendingRecord.pulls_required, 1)),
        tileIndex: Math.max(0, finiteInteger(pendingRecord.tileIndex ?? pendingRecord.tile_index)),
        ...pendingRecord.assisted === true ? { assisted: true } : {}
      } : null;
      const timestamp4 = (camel, snake) => {
        const candidate = record[camel] ?? record[snake];
        return typeof candidate === "number" && Number.isFinite(candidate) ? Math.max(0, candidate) : null;
      };
      const fishCaughtKg = Math.max(0, Math.min(
        FISHERMANS_VILLAGE_FISH_TARGET_KG,
        finiteInteger(record.fishCaughtKg ?? record.fish_caught_kg)
      ));
      result[key] = {
        missionId: "fishermans-village-fishing",
        version: 1,
        rodCollectedAtMs: timestamp4("rodCollectedAtMs", "rod_collected_at_ms"),
        castsCompleted: Math.max(0, finiteInteger(record.castsCompleted ?? record.casts_completed)),
        successfulCatches: Math.max(0, finiteInteger(record.successfulCatches ?? record.successful_catches)),
        fishCaughtKg,
        pendingCatch,
        assistedCastsRemaining: Math.max(0, Math.min(
          FISHERMANS_VILLAGE_ASSISTED_CASTS_AFTER_MISS,
          finiteInteger(record.assistedCastsRemaining ?? record.assisted_casts_remaining)
        )),
        dragonTriggeredAtMs: timestamp4("dragonTriggeredAtMs", "dragon_triggered_at_ms") ?? (fishCaughtKg >= FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG ? 0 : null),
        repairCompletedAtMs: timestamp4("repairCompletedAtMs", "repair_completed_at_ms"),
        completedAtMs: timestamp4("completedAtMs", "completed_at_ms") ?? (fishCaughtKg >= FISHERMANS_VILLAGE_FISH_TARGET_KG ? 0 : null),
        updatedAtMs: Math.max(0, finiteInteger(record.updatedAtMs ?? record.updated_at_ms))
      };
      return;
    }
    if (record.missionId === "celestial-great-redocking" || record.mission_id === "celestial-great-redocking") {
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const updatedAtRaw2 = record.updatedAtMs ?? record.updated_at_ms;
      const rollsCompleted = Math.max(0, Math.min(
        CELESTIAL_REDOCKING_ROLL_TARGET,
        finiteInteger(record.rollsCompleted ?? record.rolls_completed)
      ));
      result[key] = {
        missionId: "celestial-great-redocking",
        version: 1,
        rollsCompleted,
        completedAtMs: typeof completedAtRaw === "number" && Number.isFinite(completedAtRaw) ? Math.max(0, completedAtRaw) : rollsCompleted >= CELESTIAL_REDOCKING_ROLL_TARGET ? 0 : null,
        updatedAtMs: typeof updatedAtRaw2 === "number" && Number.isFinite(updatedAtRaw2) ? Math.max(0, updatedAtRaw2) : 0
      };
      return;
    }
    if (record.missionId === "first-light-assembly-crater" || record.mission_id === "first-light-assembly-crater") {
      const claimedRaw = record.claimedDynamiteTileIndices ?? record.claimed_dynamite_tile_indices;
      const claimedDynamiteTileIndices = Array.isArray(claimedRaw) ? FIRST_LIGHT_ASSEMBLY_LEGACY_TILE_INDICES.filter((tileIndex) => claimedRaw.some((candidate) => finiteInteger(candidate, -1) === tileIndex)) : [];
      const chargesDetonated = Math.max(0, Math.min(
        claimedDynamiteTileIndices.length,
        FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
        record.version === 2 ? finiteInteger(record.chargesDetonated ?? record.charges_detonated) : Math.floor(finiteInteger(record.chargesDetonated ?? record.charges_detonated) / 2)
      ));
      const startedAtRaw = record.startedAtMs ?? record.started_at_ms;
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const updatedAtRaw2 = record.updatedAtMs ?? record.updated_at_ms;
      const lastSectorRaw = record.lastDetonatedSector ?? record.last_detonated_sector;
      const mandateRaw = record.mandateSignedAtMs ?? record.mandate_signed_at_ms;
      result[key] = {
        missionId: "first-light-assembly-crater",
        version: 2,
        claimedDynamiteTileIndices,
        chargesDetonated,
        lastDetonatedSector: typeof lastSectorRaw === "number" && Number.isFinite(lastSectorRaw) ? Math.max(0, Math.min(FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET - 1, Math.floor(lastSectorRaw))) : null,
        mandateSignedAtMs: chargesDetonated >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET && typeof mandateRaw === "number" && Number.isFinite(mandateRaw) && mandateRaw >= 0 ? mandateRaw : null,
        startedAtMs: typeof startedAtRaw === "number" && Number.isFinite(startedAtRaw) ? Math.max(0, startedAtRaw) : claimedDynamiteTileIndices.length > 0 ? 0 : null,
        completedAtMs: typeof completedAtRaw === "number" && Number.isFinite(completedAtRaw) ? Math.max(0, completedAtRaw) : chargesDetonated >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET ? 0 : null,
        updatedAtMs: typeof updatedAtRaw2 === "number" && Number.isFinite(updatedAtRaw2) ? Math.max(0, updatedAtRaw2) : 0
      };
      return;
    }
    if (record.missionId === "great-honeyfall-coronation" || record.mission_id === "great-honeyfall-coronation") {
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const updatedAtRaw2 = record.updatedAtMs ?? record.updated_at_ms;
      const activatedReservoirs = Math.max(0, Math.min(
        GREAT_HONEYFALL_MAX_STAGE,
        finiteInteger(record.activatedReservoirs ?? record.activated_reservoirs)
      ));
      result[key] = {
        missionId: "great-honeyfall-coronation",
        version: 1,
        nectarChargesEarned: Math.max(0, finiteInteger(record.nectarChargesEarned ?? record.nectar_charges_earned)),
        nectarChargesSpent: Math.max(0, finiteInteger(record.nectarChargesSpent ?? record.nectar_charges_spent)),
        claimedNectarTileIndices: sanitizeNonNegativeTileIndices(
          record.claimedNectarTileIndices ?? record.claimed_nectar_tile_indices
        ),
        activatedReservoirs,
        lastActivatedReservoir: activatedReservoirs > 0 ? activatedReservoirs : null,
        completedAtMs: typeof completedAtRaw === "number" && Number.isFinite(completedAtRaw) ? Math.max(0, completedAtRaw) : activatedReservoirs >= GREAT_HONEYFALL_MAX_STAGE ? 0 : null,
        updatedAtMs: typeof updatedAtRaw2 === "number" && Number.isFinite(updatedAtRaw2) ? Math.max(0, updatedAtRaw2) : 0
      };
      return;
    }
    if (record.missionId === "cactus-canyon-spiral-rail" || record.mission_id === "cactus-canyon-spiral-rail") {
      const completedAtRaw = record.completedAtMs ?? record.completed_at_ms;
      const startedAtRaw = record.startedAtMs ?? record.started_at_ms;
      const updatedAtRaw2 = record.updatedAtMs ?? record.updated_at_ms;
      const lastBlastRaw = record.lastBlastSegments ?? record.last_blast_segments ?? record.lastSpinSegments ?? record.last_spin_segments;
      const segmentsExcavated = Math.max(0, Math.min(
        CACTUS_CANYON_SPIRAL_MAX_SEGMENTS,
        finiteInteger(record.segmentsExcavated ?? record.segments_excavated)
      ));
      result[key] = {
        missionId: "cactus-canyon-spiral-rail",
        version: 2,
        segmentsExcavated,
        // Version 1 awarded wheel spins. Treat every remaining legacy spin as
        // one stick so an in-progress save can continue without losing value.
        dynamiteEarned: Math.max(0, finiteInteger(
          record.dynamiteEarned ?? record.dynamite_earned ?? record.spinsEarned ?? record.spins_earned
        )),
        dynamiteSpent: Math.max(0, finiteInteger(
          record.dynamiteSpent ?? record.dynamite_spent ?? record.spinsUsed ?? record.spins_used
        )),
        claimedDynamiteTileIndices: sanitizeNonNegativeTileIndices(
          record.claimedDynamiteTileIndices ?? record.claimed_dynamite_tile_indices
        ),
        lastBlastSegments: typeof lastBlastRaw === "number" && Number.isFinite(lastBlastRaw) ? Math.max(0, Math.floor(lastBlastRaw)) : null,
        startedAtMs: typeof startedAtRaw === "number" && Number.isFinite(startedAtRaw) ? Math.max(0, startedAtRaw) : segmentsExcavated > 0 ? 0 : null,
        completedAtMs: typeof completedAtRaw === "number" && Number.isFinite(completedAtRaw) ? Math.max(0, completedAtRaw) : segmentsExcavated >= CACTUS_CANYON_SPIRAL_MAX_SEGMENTS ? 0 : null,
        updatedAtMs: typeof updatedAtRaw2 === "number" && Number.isFinite(updatedAtRaw2) ? Math.max(0, updatedAtRaw2) : 0
      };
      return;
    }
    if (record.missionId === "sunken-sands-first-treasure" || record.mission_id === "sunken-sands-first-treasure") {
      const revealedAtRaw = record.revealedAtMs ?? record.revealed_at_ms;
      const claimedAtRaw = record.claimedAtMs ?? record.claimed_at_ms;
      const updatedAtRaw2 = record.updatedAtMs ?? record.updated_at_ms;
      const rollsCompleted = Math.max(0, Math.min(
        SUNKEN_SANDS_TREASURE_ROLL_TARGET,
        finiteInteger(record.rollsCompleted ?? record.rolls_completed)
      ));
      result[key] = {
        missionId: "sunken-sands-first-treasure",
        version: 1,
        treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
        rollsCompleted,
        revealedAtMs: typeof revealedAtRaw === "number" && Number.isFinite(revealedAtRaw) ? Math.max(0, revealedAtRaw) : rollsCompleted >= SUNKEN_SANDS_TREASURE_ROLL_TARGET ? 0 : null,
        claimedAtMs: typeof claimedAtRaw === "number" && Number.isFinite(claimedAtRaw) ? Math.max(0, claimedAtRaw) : null,
        updatedAtMs: typeof updatedAtRaw2 === "number" && Number.isFinite(updatedAtRaw2) ? Math.max(0, updatedAtRaw2) : 0
      };
      return;
    }
    if (record.missionId === "rootheart-powerworks" || record.mission_id === "rootheart-powerworks") {
      const activatedAtRaw = record.activatedAtMs ?? record.activated_at_ms;
      const updatedAtRaw2 = record.updatedAtMs ?? record.updated_at_ms;
      result[key] = {
        missionId: "rootheart-powerworks",
        version: 1,
        collectedComponentIds: sanitizeRootheartComponentIds(
          record.collectedComponentIds ?? record.collected_component_ids
        ),
        buildStage: Math.max(0, Math.min(
          ROOTHEART_POWERWORKS_MAX_STAGE,
          finiteInteger(record.buildStage ?? record.build_stage)
        )),
        essenceSpent: Math.max(0, finiteInteger(record.essenceSpent ?? record.essence_spent)),
        activatedAtMs: typeof activatedAtRaw === "number" && Number.isFinite(activatedAtRaw) ? Math.max(0, activatedAtRaw) : null,
        updatedAtMs: typeof updatedAtRaw2 === "number" && Number.isFinite(updatedAtRaw2) ? Math.max(0, updatedAtRaw2) : 0
      };
      return;
    }
    const legacyRolls = finiteInteger(record.rollsCompleted ?? record.rolls_completed);
    const metersDrilled = record.metersDrilled ?? record.meters_drilled;
    const builtAtRaw = record.builtAtMs ?? record.built_at_ms;
    const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
    const lastSpinRaw = record.lastSpinMeters ?? record.last_spin_meters;
    const normalizedMetersDrilled = Math.max(0, Math.min(
      FROSTWELL_DEPTH_METERS,
      typeof metersDrilled === "number" && Number.isFinite(metersDrilled) ? Math.floor(metersDrilled) : Math.floor(Math.max(0, legacyRolls) * 2.5)
    ));
    const normalizedUpdatedAtMs = typeof updatedAtRaw === "number" && Number.isFinite(updatedAtRaw) ? Math.max(0, updatedAtRaw) : 0;
    result[key] = {
      missionId: "frostwell-iceworks",
      version: 2,
      metersDrilled: normalizedMetersDrilled,
      spinsEarned: Math.max(0, finiteInteger(record.spinsEarned ?? record.spins_earned)),
      spinsUsed: Math.max(0, finiteInteger(record.spinsUsed ?? record.spins_used)),
      lastSpinMeters: typeof lastSpinRaw === "number" && Number.isFinite(lastSpinRaw) ? Math.max(0, Math.floor(lastSpinRaw)) : null,
      builtAtMs: typeof builtAtRaw === "number" && Number.isFinite(builtAtRaw) ? Math.max(0, builtAtRaw) : normalizedMetersDrilled >= FROSTWELL_DEPTH_METERS ? Math.max(1, normalizedUpdatedAtMs) : null,
      updatedAtMs: normalizedUpdatedAtMs
    };
  });
  return result;
}
function mergeIslandRunSignatureMissionProgress(remote, local) {
  const merged = {};
  (/* @__PURE__ */ new Set([...Object.keys(remote), ...Object.keys(local)])).forEach((key) => {
    let a = remote[key];
    let b = local[key];
    if (key === WORLD_PORTAL_KEY) {
      const portal = mergeWorldPortalProgress(a, b);
      if (portal) merged[key] = portal;
      return;
    }
    if (a?.missionId === "first-light-assembly-crater" && a.version !== 2) {
      a = sanitizeIslandRunSignatureMissionProgress({ [key]: a })[key];
    }
    if (b?.missionId === "first-light-assembly-crater" && b.version !== 2) {
      b = sanitizeIslandRunSignatureMissionProgress({ [key]: b })[key];
    }
    if (!a) {
      merged[key] = b;
      return;
    }
    if (!b) {
      merged[key] = a;
      return;
    }
    if (a.missionId === "arena-journey" || b.missionId === "arena-journey") {
      merged[key] = mergeArenaJourney(sanitizeArenaJourney(a), sanitizeArenaJourney(b));
      return;
    }
    if (a.missionId === "opening-games-campaign" || b.missionId === "opening-games-campaign") {
      merged[key] = a.missionId === "opening-games-campaign" && b.missionId === "opening-games-campaign" ? mergeOpeningGamesCampaignMarkers(a, b) : a.missionId === "opening-games-campaign" ? a : b;
      return;
    }
    if (a.missionId === "host-the-first-games" || b.missionId === "host-the-first-games") {
      merged[key] = a.missionId === "host-the-first-games" && b.missionId === "host-the-first-games" ? mergeOpeningGamesCeremonyProgress(a, b) : a.missionId === "host-the-first-games" ? a : b;
      return;
    }
    if (a.missionId === "moonwell-thermal" && b.missionId === "moonwell-thermal") {
      merged[key] = mergeMoonwellThermalProgress(a, b);
      return;
    }
    const stagedA = getStagedRestorationMissionDescriptorById(a.missionId);
    const stagedB = getStagedRestorationMissionDescriptorById(b.missionId);
    if (stagedA || stagedB) {
      if (!stagedA) {
        merged[key] = b;
        return;
      }
      if (!stagedB) {
        merged[key] = a;
        return;
      }
      if (stagedA.missionId !== stagedB.missionId) {
        merged[key] = a.updatedAtMs >= b.updatedAtMs ? a : b;
        return;
      }
      const left = a;
      const right = b;
      const claimedPickupTileIndices = Array.from(/* @__PURE__ */ new Set([
        ...left.claimedPickupTileIndices,
        ...right.claimedPickupTileIndices
      ])).sort((x, y) => x - y);
      const activatedStages = Math.max(left.activatedStages, right.activatedStages);
      const chargesEarned = Math.max(left.chargesEarned, right.chargesEarned, claimedPickupTileIndices.length);
      const chargesSpent = Math.max(
        left.chargesSpent,
        right.chargesSpent,
        activatedStages * stagedA.chargeCostPerStage
      );
      const completedAtMs = left.completedAtMs === null ? right.completedAtMs : right.completedAtMs === null ? left.completedAtMs : Math.min(left.completedAtMs, right.completedAtMs);
      const startedAtMs = left.startedAtMs == null ? right.startedAtMs ?? null : right.startedAtMs == null ? left.startedAtMs : Math.min(left.startedAtMs, right.startedAtMs);
      const finaleCompletedAtMs = left.finaleCompletedAtMs == null ? right.finaleCompletedAtMs ?? null : right.finaleCompletedAtMs == null ? left.finaleCompletedAtMs : Math.min(left.finaleCompletedAtMs, right.finaleCompletedAtMs);
      merged[key] = {
        missionId: stagedA.missionId,
        ...stagedA.islandNumber === 17 ? { titanAwakening: mergeTitanAwakening(
          sanitizeTitanAwakening(left.titanAwakening, !left.titanAwakening && left.activatedStages >= 8),
          sanitizeTitanAwakening(right.titanAwakening, !right.titanAwakening && right.activatedStages >= 8)
        ) } : {},
        version: 1,
        claimedPickupTileIndices,
        chargesEarned,
        chargesSpent,
        activatedStages,
        lastActivatedStage: activatedStages > 0 ? activatedStages : null,
        startedAtMs,
        finaleCompletedAtMs,
        completedAtMs,
        updatedAtMs: Math.max(left.updatedAtMs, right.updatedAtMs)
      };
      return;
    }
    if (a.missionId === "fishermans-village-fishing" || b.missionId === "fishermans-village-fishing") {
      if (a.missionId !== "fishermans-village-fishing") {
        merged[key] = b;
        return;
      }
      if (b.missionId !== "fishermans-village-fishing") {
        merged[key] = a;
        return;
      }
      const earliest = (left, right) => left === null ? right : right === null ? left : Math.min(left, right);
      const latest2 = a.updatedAtMs >= b.updatedAtMs ? a : b;
      const fishCaughtKg = Math.max(a.fishCaughtKg, b.fishCaughtKg);
      merged[key] = {
        missionId: "fishermans-village-fishing",
        version: 1,
        rodCollectedAtMs: earliest(a.rodCollectedAtMs, b.rodCollectedAtMs),
        castsCompleted: Math.max(a.castsCompleted, b.castsCompleted),
        successfulCatches: Math.max(a.successfulCatches, b.successfulCatches),
        fishCaughtKg,
        pendingCatch: latest2.fishCaughtKg < fishCaughtKg ? null : latest2.pendingCatch,
        assistedCastsRemaining: latest2.assistedCastsRemaining ?? 0,
        dragonTriggeredAtMs: earliest(a.dragonTriggeredAtMs, b.dragonTriggeredAtMs),
        repairCompletedAtMs: earliest(a.repairCompletedAtMs, b.repairCompletedAtMs),
        completedAtMs: earliest(a.completedAtMs, b.completedAtMs),
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
      };
      return;
    }
    if (a.missionId === "celestial-great-redocking" || b.missionId === "celestial-great-redocking") {
      if (a.missionId !== "celestial-great-redocking") {
        merged[key] = b;
        return;
      }
      if (b.missionId !== "celestial-great-redocking") {
        merged[key] = a;
        return;
      }
      const completedAtMs = a.completedAtMs === null ? b.completedAtMs : b.completedAtMs === null ? a.completedAtMs : Math.min(a.completedAtMs, b.completedAtMs);
      merged[key] = {
        missionId: "celestial-great-redocking",
        version: 1,
        rollsCompleted: Math.max(a.rollsCompleted, b.rollsCompleted),
        completedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
      };
      return;
    }
    if (a.missionId === "first-light-assembly-crater" || b.missionId === "first-light-assembly-crater") {
      if (a.missionId !== "first-light-assembly-crater") {
        merged[key] = b;
        return;
      }
      if (b.missionId !== "first-light-assembly-crater") {
        merged[key] = a;
        return;
      }
      const claimedDynamiteTileIndices = FIRST_LIGHT_ASSEMBLY_LEGACY_TILE_INDICES.filter((tileIndex) => a.claimedDynamiteTileIndices.includes(tileIndex) || b.claimedDynamiteTileIndices.includes(tileIndex));
      const chargesDetonated = Math.min(
        claimedDynamiteTileIndices.length,
        FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
        Math.max(a.chargesDetonated, b.chargesDetonated)
      );
      const completedAtMs = a.completedAtMs === null ? b.completedAtMs : b.completedAtMs === null ? a.completedAtMs : Math.min(a.completedAtMs, b.completedAtMs);
      const latest2 = a.updatedAtMs >= b.updatedAtMs ? a : b;
      merged[key] = {
        missionId: "first-light-assembly-crater",
        version: 2,
        claimedDynamiteTileIndices,
        chargesDetonated,
        lastDetonatedSector: latest2.lastDetonatedSector,
        mandateSignedAtMs: chargesDetonated >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET ? a.mandateSignedAtMs == null ? b.mandateSignedAtMs ?? null : b.mandateSignedAtMs == null ? a.mandateSignedAtMs : Math.min(a.mandateSignedAtMs, b.mandateSignedAtMs) : null,
        startedAtMs: a.startedAtMs === null ? b.startedAtMs : b.startedAtMs === null ? a.startedAtMs : Math.min(a.startedAtMs, b.startedAtMs),
        completedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
      };
      return;
    }
    if (a.missionId === "great-honeyfall-coronation" || b.missionId === "great-honeyfall-coronation") {
      if (a.missionId !== "great-honeyfall-coronation") {
        merged[key] = b;
        return;
      }
      if (b.missionId !== "great-honeyfall-coronation") {
        merged[key] = a;
        return;
      }
      const completedAtMs = a.completedAtMs === null ? b.completedAtMs : b.completedAtMs === null ? a.completedAtMs : Math.min(a.completedAtMs, b.completedAtMs);
      const activatedReservoirs = Math.max(a.activatedReservoirs, b.activatedReservoirs);
      merged[key] = {
        missionId: "great-honeyfall-coronation",
        version: 1,
        nectarChargesEarned: Math.max(a.nectarChargesEarned, b.nectarChargesEarned),
        nectarChargesSpent: Math.max(a.nectarChargesSpent, b.nectarChargesSpent),
        claimedNectarTileIndices: Array.from(/* @__PURE__ */ new Set([
          ...a.claimedNectarTileIndices ?? [],
          ...b.claimedNectarTileIndices ?? []
        ])).sort((x, y) => x - y),
        activatedReservoirs,
        lastActivatedReservoir: activatedReservoirs > 0 ? activatedReservoirs : null,
        completedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
      };
      return;
    }
    if (a.missionId === "sunken-sands-first-treasure" || b.missionId === "sunken-sands-first-treasure") {
      if (a.missionId !== "sunken-sands-first-treasure") {
        merged[key] = b;
        return;
      }
      if (b.missionId !== "sunken-sands-first-treasure") {
        merged[key] = a;
        return;
      }
      const earliestTimestamp = (left, right) => left === null ? right : right === null ? left : Math.min(left, right);
      merged[key] = {
        missionId: "sunken-sands-first-treasure",
        version: 1,
        treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
        rollsCompleted: Math.max(a.rollsCompleted, b.rollsCompleted),
        revealedAtMs: earliestTimestamp(a.revealedAtMs, b.revealedAtMs),
        claimedAtMs: earliestTimestamp(a.claimedAtMs, b.claimedAtMs),
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
      };
      return;
    }
    if (a.missionId === "cactus-canyon-spiral-rail" || b.missionId === "cactus-canyon-spiral-rail") {
      if (a.missionId !== "cactus-canyon-spiral-rail") {
        merged[key] = b;
        return;
      }
      if (b.missionId !== "cactus-canyon-spiral-rail") {
        merged[key] = a;
        return;
      }
      const completedAtMs = a.completedAtMs === null ? b.completedAtMs : b.completedAtMs === null ? a.completedAtMs : Math.min(a.completedAtMs, b.completedAtMs);
      const latest2 = a.updatedAtMs >= b.updatedAtMs ? a : b;
      merged[key] = {
        missionId: "cactus-canyon-spiral-rail",
        version: 2,
        segmentsExcavated: Math.max(a.segmentsExcavated, b.segmentsExcavated),
        dynamiteEarned: Math.max(a.dynamiteEarned, b.dynamiteEarned),
        dynamiteSpent: Math.max(a.dynamiteSpent, b.dynamiteSpent),
        claimedDynamiteTileIndices: Array.from(/* @__PURE__ */ new Set([
          ...a.claimedDynamiteTileIndices ?? [],
          ...b.claimedDynamiteTileIndices ?? []
        ])).sort((x, y) => x - y),
        lastBlastSegments: latest2.lastBlastSegments,
        startedAtMs: a.startedAtMs === null ? b.startedAtMs : b.startedAtMs === null ? a.startedAtMs : Math.min(a.startedAtMs, b.startedAtMs),
        completedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
      };
      return;
    }
    if (a.missionId === "rootheart-powerworks" || b.missionId === "rootheart-powerworks") {
      if (a.missionId !== "rootheart-powerworks") {
        merged[key] = b;
        return;
      }
      if (b.missionId !== "rootheart-powerworks") {
        merged[key] = a;
        return;
      }
      const activatedAtMs = a.activatedAtMs === null ? b.activatedAtMs : b.activatedAtMs === null ? a.activatedAtMs : Math.min(a.activatedAtMs, b.activatedAtMs);
      merged[key] = {
        missionId: "rootheart-powerworks",
        version: 1,
        collectedComponentIds: ROOTHEART_POWER_COMPONENTS.map((component) => component.id).filter((id2) => a.collectedComponentIds.includes(id2) || b.collectedComponentIds.includes(id2)),
        buildStage: Math.max(a.buildStage, b.buildStage),
        essenceSpent: Math.max(a.essenceSpent, b.essenceSpent),
        activatedAtMs,
        updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
      };
      return;
    }
    if (a.missionId !== "frostwell-iceworks" || b.missionId !== "frostwell-iceworks") {
      merged[key] = a.updatedAtMs >= b.updatedAtMs ? a : b;
      return;
    }
    const builtAtMs = a.builtAtMs === null ? b.builtAtMs : b.builtAtMs === null ? a.builtAtMs : Math.min(a.builtAtMs, b.builtAtMs);
    const latest = a.updatedAtMs >= b.updatedAtMs ? a : b;
    merged[key] = {
      missionId: "frostwell-iceworks",
      version: 2,
      metersDrilled: Math.max(a.metersDrilled, b.metersDrilled),
      spinsEarned: Math.max(a.spinsEarned, b.spinsEarned),
      spinsUsed: Math.max(a.spinsUsed, b.spinsUsed),
      lastSpinMeters: latest.lastSpinMeters,
      builtAtMs,
      updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs)
    };
  });
  return merged;
}

// src/features/gamification/level-worlds/services/islandRunVaultCollection.ts
var VAULT_ISLAND_UNLOCK_MISSION_ID = "broken-causeway";
function isVaultIslandCollectionUnlocked(missionProgressByIsland) {
  const ledger = missionProgressByIsland ?? {};
  const hasLegacyUnlock = Object.values(ledger).some((progress) => progress.missionId === VAULT_ISLAND_UNLOCK_MISSION_ID && typeof progress.completedAtMs === "number" && Number.isFinite(progress.completedAtMs) && progress.completedAtMs >= 0);
  if (hasLegacyUnlock) return true;
  if (!usesOpeningGamesCampaign(ledger)) return false;
  return Object.entries(ledger).some(([key, progress]) => /^(0|[1-9]\d*):4$/.test(key) && progress.missionId === "celestial-great-redocking" && progress.version === 1 && Number.isFinite(progress.rollsCompleted) && progress.rollsCompleted >= CELESTIAL_REDOCKING_ROLL_TARGET && typeof progress.completedAtMs === "number" && Number.isFinite(progress.completedAtMs) && progress.completedAtMs >= 0);
}

// src/features/gamification/level-worlds/services/islandRunFeatureAccess.ts
var GRADUAL_PUZZLE_INTRODUCTION_ISLAND = 3;
var GRADUAL_EGG_INTRODUCTION_ISLAND = 4;
function resolveIslandRunFeatureAccess(context) {
  const ledger = context.signatureMissionProgressByIsland ?? {};
  const gradual = usesOpeningGamesCampaign(ledger);
  const island = Number.isFinite(context.currentIslandNumber) ? Math.floor(context.currentIslandNumber) : 0;
  const validIsland = island >= 1;
  const beginnerIsland = island === 1;
  const games = resolveOpeningGamesAccess(ledger, island);
  const ceremony = resolveOpeningGamesCeremony(ledger);
  const vault = isVaultIslandCollectionUnlocked(ledger);
  return {
    gradual,
    // The caretaker is a story actor, not a persistent board NPC. Island008's
    // Compass handover owns his future ceremony-only presentation separately.
    caretakerBoard: false,
    arenaOrientation: gradual && island === 1,
    welcomeCheckIn: validIsland && island < GRADUAL_EGG_INTRODUCTION_ISLAND,
    // Presentation, progress accumulation and claims share this policy.
    rewardChannel: validIsland && !beginnerIsland && (!gradual || island >= 2 && ceremony.beaconLitAtMs !== null),
    eventLauncher: validIsland && !beginnerIsland && (!gradual || island >= 2 && (games.ordinaryEvents || games.inauguralRound)),
    ordinaryEvents: validIsland && !beginnerIsland && (!gradual || island >= 2 && games.ordinaryEvents),
    inauguralRound: gradual && validIsland && games.inauguralRound,
    puzzleCollection: gradual ? island >= GRADUAL_PUZZLE_INTRODUCTION_ISLAND : !Number.isFinite(context.currentIslandNumber) || island >= 2,
    trafficLight: !beginnerIsland && (!gradual || island >= GRADUAL_PUZZLE_INTRODUCTION_ISLAND),
    eggs: island >= GRADUAL_EGG_INTRODUCTION_ISLAND,
    dailyWheel: !beginnerIsland && (!gradual || vault),
    vault
  };
}

// src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts
function isRewardChannelAvailable(state2, islandNumber = state2.currentIslandNumber) {
  return resolveIslandRunFeatureAccess({
    currentIslandNumber: islandNumber ?? 0,
    signatureMissionProgressByIsland: state2.signatureMissionProgressByIsland
  }).rewardChannel;
}
var TIMED_EVENT_SEQUENCE = [
  {
    // Player-facing identity is "Island Workshop" (block-placement puzzle);
    // the internal `feeding_frenzy` ids are preserved so persisted event
    // records, ladders, stickers, and ticket balances stay valid.
    templateId: "feeding_frenzy",
    eventType: "feeding_frenzy",
    ladderId: "feeding_frenzy_ladder_v1",
    stickerId: "feeding_frenzy_sticker",
    icon: "\u{1F6E0}\uFE0F",
    durationMs: 8 * 60 * 60 * 1e3
    // 8 hours
  },
  {
    templateId: "lucky_spin",
    eventType: "lucky_spin",
    ladderId: "lucky_spin_ladder_v1",
    stickerId: "lucky_spin_sticker",
    icon: "\u{1F3B0}",
    durationMs: 24 * 60 * 60 * 1e3
    // 24 hours
  },
  {
    templateId: "space_excavator",
    eventType: "space_excavator",
    ladderId: "space_excavator_ladder_v1",
    stickerId: "space_excavator_sticker",
    icon: "\u{1F680}",
    durationMs: 24 * 60 * 60 * 1e3
    // 1 day
  },
  {
    templateId: "companion_feast",
    eventType: "companion_feast",
    ladderId: "companion_feast_ladder_v1",
    stickerId: "companion_feast_sticker",
    icon: "\u{1F43E}",
    durationMs: 4 * 24 * 60 * 60 * 1e3
    // 4 days
  },
  {
    templateId: "skybound_expedition",
    eventType: "skybound_expedition",
    ladderId: "skybound_expedition_ladder_v1",
    stickerId: "skybound_gold_wings_sticker",
    icon: "\u2708\uFE0F",
    durationMs: 3 * 24 * 60 * 60 * 1e3
    // 3 days
  }
];
var FEEDING_TILE_PROGRESS = {
  chest: 2,
  micro: 1,
  currency: 1
};
var REWARD_BAR_CURATED_TARGET_SEQUENCE = [
  5,
  // tier 0: quick first fill
  10,
  // tier 1: fast second goal
  15,
  // tier 2: still approachable
  30,
  // tier 3: first stretch
  35,
  // tier 4: slight breather
  45,
  // tier 5: medium goal
  55,
  // tier 6: medium stretch
  150,
  // tier 7: first big milestone
  50,
  // tier 8: breather after the big milestone
  75,
  // tier 9: medium recovery wave
  150,
  // tier 10: second big milestone
  75,
  // tier 11: breather wave
  75,
  // tier 12: breather hold
  75,
  // tier 13: breather hold
  100,
  // tier 14: pre-mega step-up
  725
  // tier 15: rare mega milestone
];
var REWARD_BAR_TAIL_LINEAR_STEP = 35;
var REWARD_BAR_TAIL_QUADRATIC_STEP = 5;
var MAX_ESCALATION_TIER_FOR_THRESHOLD_MATH = 1e4;
function resolveEscalatingThreshold(tier) {
  const safeTier = Math.min(
    MAX_ESCALATION_TIER_FOR_THRESHOLD_MATH,
    Math.max(0, Math.floor(tier))
  );
  if (safeTier < REWARD_BAR_CURATED_TARGET_SEQUENCE.length) {
    return REWARD_BAR_CURATED_TARGET_SEQUENCE[safeTier];
  }
  const tailTier = safeTier - (REWARD_BAR_CURATED_TARGET_SEQUENCE.length - 1);
  const finalCuratedThreshold = REWARD_BAR_CURATED_TARGET_SEQUENCE[REWARD_BAR_CURATED_TARGET_SEQUENCE.length - 1];
  return Math.floor(
    finalCuratedThreshold + tailTier * REWARD_BAR_TAIL_LINEAR_STEP + tailTier * tailTier * REWARD_BAR_TAIL_QUADRATIC_STEP
  );
}
function applyMultiplierToProgress(baseProgress, multiplier) {
  const safeMultiplier = Math.max(1, Math.floor(multiplier));
  return Math.floor(baseProgress * safeMultiplier);
}
function getTemplateIndexFromEventId(eventId2) {
  if (!eventId2) return -1;
  const templateId = eventId2.split(":")[0];
  return TIMED_EVENT_SEQUENCE.findIndex((template) => template.templateId === templateId);
}
function buildTimedEvent(template, nowMs, version) {
  return {
    eventId: `${template.templateId}:${nowMs}`,
    eventType: template.eventType,
    startedAtMs: nowMs,
    expiresAtMs: nowMs + template.durationMs,
    version: Math.max(1, Math.floor(version))
  };
}
function getTemplateForEvent(event) {
  const idx = getTemplateIndexFromEventId(event?.eventId);
  if (idx >= 0) return TIMED_EVENT_SEQUENCE[idx];
  return TIMED_EVENT_SEQUENCE[0];
}
function resetEventBoundRewardBarState(options) {
  const template = getTemplateForEvent(options.event);
  return {
    ...options.state,
    rewardBarProgress: 0,
    rewardBarThreshold: resolveEscalatingThreshold(0),
    rewardBarClaimCountInEvent: 0,
    rewardBarEscalationTier: 0,
    rewardBarLastClaimAtMs: null,
    rewardBarBoundEventId: options.event.eventId,
    rewardBarLadderId: template.ladderId,
    activeTimedEventProgress: {
      feedingActions: 0,
      tokensEarned: 0,
      milestonesClaimed: 0
    }
  };
}
function ensureIslandRunContractV2ActiveTimedEvent(options) {
  const nowMs = Math.floor(options.nowMs);
  const current = options.state.activeTimedEvent;
  if (!current) {
    const nextEvent = buildTimedEvent(TIMED_EVENT_SEQUENCE[0], nowMs, 1);
    const nextState = resetEventBoundRewardBarState({ state: { ...options.state, activeTimedEvent: nextEvent }, event: nextEvent });
    return { state: nextState, eventChanged: true };
  }
  if (current.expiresAtMs <= nowMs) {
    const previousIdx = getTemplateIndexFromEventId(current.eventId);
    const nextIdx = previousIdx < 0 ? 0 : (previousIdx + 1) % TIMED_EVENT_SEQUENCE.length;
    const nextEvent = buildTimedEvent(TIMED_EVENT_SEQUENCE[nextIdx], nowMs, current.version + 1);
    const nextState = resetEventBoundRewardBarState({ state: { ...options.state, activeTimedEvent: nextEvent }, event: nextEvent });
    return { state: nextState, eventChanged: true };
  }
  if (options.state.rewardBarBoundEventId !== current.eventId) {
    return {
      state: resetEventBoundRewardBarState({ state: options.state, event: current }),
      eventChanged: true
    };
  }
  const template = getTemplateForEvent(current);
  if (options.state.rewardBarLadderId !== template.ladderId) {
    return {
      state: {
        ...options.state,
        rewardBarLadderId: template.ladderId
      },
      eventChanged: false
    };
  }
  return {
    state: options.state,
    eventChanged: false
  };
}
var ENCOUNTER_REWARD_BAR_PROGRESS = 3;
var EVENT_MINIGAME_REWARD_BAR_PROGRESS = 4;
function resolveIslandRunContractV2RewardBarProgressDelta(source) {
  if (source.kind === "creature_feed") {
    return { progressDelta: 4, feedingActionDelta: 1 };
  }
  if (source.kind === "encounter_resolve") {
    return { progressDelta: ENCOUNTER_REWARD_BAR_PROGRESS, feedingActionDelta: 1 };
  }
  if (source.kind === "event_minigame_complete") {
    return { progressDelta: EVENT_MINIGAME_REWARD_BAR_PROGRESS, feedingActionDelta: 1 };
  }
  const tileProgress = FEEDING_TILE_PROGRESS[source.tileType] ?? 0;
  if (tileProgress > 0) {
    return { progressDelta: tileProgress, feedingActionDelta: 1 };
  }
  return { progressDelta: 0, feedingActionDelta: 0 };
}
function applyIslandRunContractV2RewardBarProgress(options) {
  if (!isRewardChannelAvailable(options.state)) return options.state;
  const ensured = ensureIslandRunContractV2ActiveTimedEvent({ state: options.state, nowMs: options.nowMs }).state;
  const delta = resolveIslandRunContractV2RewardBarProgressDelta(options.source);
  if (delta.progressDelta < 1) return ensured;
  const effectiveProgress = applyMultiplierToProgress(delta.progressDelta, options.multiplier ?? 1);
  return {
    ...ensured,
    rewardBarProgress: Math.max(0, Math.floor(ensured.rewardBarProgress)) + effectiveProgress,
    activeTimedEventProgress: {
      ...ensured.activeTimedEventProgress,
      feedingActions: Math.max(0, Math.floor(ensured.activeTimedEventProgress.feedingActions)) + delta.feedingActionDelta
    }
  };
}

// src/features/life-wheel/lifeWheelTaxonomy.ts
var LIFE_WHEEL_AREA_TAXONOMY = [
  { area: "Health", checkinKey: "health_fitness", label: "Body & Energy", shortLabel: "Health", emoji: "\u{1FAB7}" },
  { area: "Mind", checkinKey: "spirituality_community", label: "Mind, Meaning & Awareness", shortLabel: "Mind", emoji: "\u{1F9E0}" },
  { area: "Work", checkinKey: "career_development", label: "Work, Growth & Productivity", shortLabel: "Work", emoji: "\u{1F3AF}" },
  { area: "Money", checkinKey: "finance_wealth", label: "Money & Admin", shortLabel: "Money", emoji: "\u{1F4B5}" },
  { area: "Love", checkinKey: "love_relations", label: "Love & Relationships", shortLabel: "Love", emoji: "\u{1F48C}" },
  { area: "Connections", checkinKey: "family_friends", label: "Family, Friends & Connection", shortLabel: "Connections", emoji: "\u{1F91D}" },
  { area: "Home", checkinKey: "living_spaces", label: "Home & Environment", shortLabel: "Home", emoji: "\u{1F3E0}" },
  { area: "Fun", checkinKey: "fun_creativity", label: "Joy, Play & Creativity", shortLabel: "Fun", emoji: "\u{1F389}" }
];
var LIFE_WHEEL_AREAS = LIFE_WHEEL_AREA_TAXONOMY.map((entry) => entry.area);
var AREA_BY_NAME = LIFE_WHEEL_AREA_TAXONOMY.reduce((acc, entry) => {
  acc[entry.area] = entry;
  return acc;
}, {});
var AREA_BY_CHECKIN_KEY = LIFE_WHEEL_AREA_TAXONOMY.reduce((acc, entry) => {
  acc[entry.checkinKey] = entry;
  return acc;
}, {});

// src/features/gamification/level-worlds/services/islandContentManifest.ts
var MAX_ISLANDS = 120;

// src/features/gamification/level-worlds/services/islandRunArenaCreaturePresentation.ts
var ISLAND_RUN_ARENA_INTERVAL = 5;
var ISLAND_RUN_ORDINARY_BOSS_EXCEPTION_ISLANDS = Object.freeze([15]);
var ISLAND_RUN_ORDINARY_BOSS_EXCEPTION_SET = new Set(ISLAND_RUN_ORDINARY_BOSS_EXCEPTION_ISLANDS);
var ISLAND_RUN_ARENA_CREATURE_COUNT = MAX_ISLANDS / ISLAND_RUN_ARENA_INTERVAL - ISLAND_RUN_ORDINARY_BOSS_EXCEPTION_ISLANDS.length;
function isIslandRunArenaIsland(islandNumber) {
  return Number.isInteger(islandNumber) && islandNumber >= ISLAND_RUN_ARENA_INTERVAL && islandNumber <= MAX_ISLANDS && islandNumber % ISLAND_RUN_ARENA_INTERVAL === 0 && !ISLAND_RUN_ORDINARY_BOSS_EXCEPTION_SET.has(islandNumber);
}

// src/features/gamification/level-worlds/services/islandRunArenaCreatureRoster.ts
var ARENA_IDENTITIES = [
  [5, "rare-crown-drifter", "Crown Drifter"],
  [10, "arena-reefback-champion", "Reefback Champion"],
  [20, "arena-cloudhorn-regent", "Cloudhorn Regent"],
  [25, "arena-moss-titan", "Moss Titan"],
  [30, "arena-moonveil-lynx", "Moonveil Lynx"],
  [35, "arena-stormglass-roc", "Stormglass Roc"],
  [40, "arena-sunken-oracle", "Sunken Oracle"],
  [45, "arena-ironbloom-golem", "Ironbloom Golem"],
  [50, "arena-aurora-leviathan", "Aurora Leviathan"],
  [55, "arena-cinderwing-matriarch", "Cinderwing Matriarch"],
  [60, "arena-prismjaw-sentinel", "Prismjaw Sentinel"],
  [65, "arena-starroot-behemoth", "Starroot Behemoth"],
  [70, "arena-tidal-crown-serpent", "Tidal Crown Serpent"],
  [75, "arena-clockwork-chimera", "Clockwork Chimera"],
  [80, "arena-dreamfen-stag", "Dreamfen Stag"],
  [85, "arena-thunderreef-manta", "Thunderreef Manta"],
  [90, "arena-lumen-drake", "Lumen Drake"],
  [95, "arena-obsidian-bloom-warden", "Obsidian Bloom Warden"],
  [100, "arena-celestial-tortoise", "Celestial Tortoise"],
  [105, "arena-voidgarden-sphinx", "Voidgarden Sphinx"],
  [110, "arena-solstice-phoenix", "Solstice Phoenix"],
  [115, "arena-infinity-kirin", "Infinity Kirin"],
  [120, "arena-first-light-colossus", "First Light Colossus"]
];
var ISLAND_RUN_ARENA_CREATURE_ROSTER = ARENA_IDENTITIES.map(
  ([islandNumber, creatureId, name]) => ({
    arenaSlot: islandNumber / ISLAND_RUN_ARENA_INTERVAL - 1,
    islandNumber,
    creatureId,
    name,
    implementationStatus: islandNumber === 5 ? "implemented" : "planned"
  })
);
if (ISLAND_RUN_ARENA_CREATURE_ROSTER.length !== ISLAND_RUN_ARENA_CREATURE_COUNT || ISLAND_RUN_ARENA_CREATURE_ROSTER.some((entry) => !isIslandRunArenaIsland(entry.islandNumber)) || ISLAND_RUN_ARENA_CREATURE_ROSTER.some((entry) => entry.islandNumber > MAX_ISLANDS)) {
  throw new Error("Arena creature roster must match the arena cadence and its documented ordinary-Boss exceptions.");
}
var ARENA_CREATURE_IDS = new Set(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => entry.creatureId));
var ARENA_CREATURES_BY_ISLAND = new Map(ISLAND_RUN_ARENA_CREATURE_ROSTER.map((entry) => [entry.islandNumber, entry]));

// src/features/gamification/level-worlds/services/creatureCatalog.ts
var COMMON_CREATURES = [
  { id: "common-sproutling", imageKey: "common-sproutling", name: "Sproutling", tier: "common", habitat: "Zen Garden", affinity: "Builder", shipZone: "zen" },
  { id: "common-pebble-spirit", imageKey: "common-pebble-spirit", name: "Pebble Spirit", tier: "common", habitat: "Root Atrium", affinity: "Grounded", shipZone: "zen" },
  { id: "common-mossling", imageKey: "common-mossling", name: "Mossling", tier: "common", habitat: "Moss Gallery", affinity: "Nurturer", shipZone: "zen" },
  { id: "common-glowtail", imageKey: "common-glowtail", name: "Glowtail", tier: "common", habitat: "Hydro Deck", affinity: "Steady", shipZone: "zen" },
  { id: "common-drift-pup", imageKey: "common-drift-pup", name: "Drift Pup", tier: "common", habitat: "Zen Garden", affinity: "Explorer", shipZone: "zen" },
  { id: "common-bloom-mite", imageKey: "common-bloom-mite", name: "Bloom Mite", tier: "common", habitat: "Root Atrium", affinity: "Caregiver", shipZone: "zen" },
  { id: "common-stone-hopper", imageKey: "common-stone-hopper", name: "Stone Hopper", tier: "common", habitat: "Moss Gallery", affinity: "Builder", shipZone: "zen" },
  { id: "common-fern-fox", imageKey: "common-fern-fox", name: "Fern Fox", tier: "common", habitat: "Hydro Deck", affinity: "Mentor", shipZone: "zen" },
  { id: "common-dewling", imageKey: "common-dewling", name: "Dewling", tier: "common", habitat: "Zen Garden", affinity: "Peacemaker", shipZone: "zen" },
  { id: "common-root-whisp", imageKey: "common-root-whisp", name: "Root Whisp", tier: "common", habitat: "Root Atrium", affinity: "Steady", shipZone: "zen" },
  { id: "common-garden-puff", imageKey: "common-garden-puff", name: "Garden Puff", tier: "common", habitat: "Moss Gallery", affinity: "Nurturer", shipZone: "zen" },
  { id: "common-lichen-kit", imageKey: "common-lichen-kit", name: "Lichen Kit", tier: "common", habitat: "Hydro Deck", affinity: "Grounded", shipZone: "zen" },
  { id: "common-twilight-seed", imageKey: "common-twilight-seed", name: "Twilight Seed", tier: "common", habitat: "Zen Garden", affinity: "Dreamer", shipZone: "zen" },
  { id: "common-river-bud", imageKey: "common-river-bud", name: "River Bud", tier: "common", habitat: "Hydro Deck", affinity: "Caregiver", shipZone: "zen" },
  { id: "common-petal-scout", imageKey: "common-petal-scout", name: "Petal Scout", tier: "common", habitat: "Root Atrium", affinity: "Explorer", shipZone: "zen" }
];
var RARE_CREATURES = [
  { id: "rare-luma-hatchling", imageKey: "rare-luma-hatchling", name: "Luma Hatchling", tier: "rare", habitat: "Zen Garden", affinity: "Visionary", shipZone: "zen" },
  { id: "rare-nebula-wisp", imageKey: "rare-nebula-wisp", name: "Nebula Wisp", tier: "rare", habitat: "Astral Dome", affinity: "Explorer", shipZone: "cosmic" },
  { id: "rare-dewleaf-sprite", imageKey: "rare-dewleaf-sprite", name: "Dewleaf Sprite", tier: "rare", habitat: "Hydro Deck", affinity: "Guardian", shipZone: "zen" },
  { id: "rare-aurora-finch", imageKey: "rare-aurora-finch", name: "Aurora Finch", tier: "rare", habitat: "Sky Foundry", affinity: "Visionary", shipZone: "energy" },
  { id: "rare-ember-sprout", imageKey: "rare-ember-sprout", name: "Ember Sprout", tier: "rare", habitat: "Ember Lab", affinity: "Catalyst", shipZone: "energy" },
  { id: "rare-solar-pika", imageKey: "rare-solar-pika", name: "Solar Pika", tier: "rare", habitat: "Solar Orchard", affinity: "Champion", shipZone: "energy" },
  { id: "rare-comet-cub", imageKey: "rare-comet-cub", name: "Comet Cub", tier: "rare", habitat: "Engine Wing", affinity: "Strategist", shipZone: "energy" },
  { id: "rare-bloom-seraph", imageKey: "rare-bloom-seraph", name: "Bloom Seraph", tier: "rare", habitat: "Zen Garden", affinity: "Mentor", shipZone: "zen" },
  { id: "rare-shard-marten", imageKey: "rare-shard-marten", name: "Shard Marten", tier: "rare", habitat: "Sky Foundry", affinity: "Architect", shipZone: "energy" },
  { id: "rare-cinder-mouse", imageKey: "rare-cinder-mouse", name: "Cinder Mouse", tier: "rare", habitat: "Ember Lab", affinity: "Challenger", shipZone: "energy" },
  { id: "rare-tide-lantern", imageKey: "rare-tide-lantern", name: "Tide Lantern", tier: "rare", habitat: "Hydro Deck", affinity: "Peacemaker", shipZone: "zen" },
  { id: "rare-halo-staglet", imageKey: "rare-halo-staglet", name: "Halo Staglet", tier: "rare", habitat: "Solar Orchard", affinity: "Guardian", shipZone: "energy" },
  { id: "rare-gear-wing", imageKey: "rare-gear-wing", name: "Gear Wing", tier: "rare", habitat: "Engine Wing", affinity: "Builder", shipZone: "energy" },
  { id: "rare-mirage-pup", imageKey: "rare-mirage-pup", name: "Mirage Pup", tier: "rare", habitat: "Astral Dome", affinity: "Creator", shipZone: "cosmic" },
  { id: "rare-crown-drifter", imageKey: "rare-crown-drifter", name: "Crown Drifter", tier: "rare", habitat: "Sky Foundry", affinity: "Explorer", shipZone: "energy" }
];
var MYTHIC_CREATURES = [
  { id: "mythic-starhorn-seraph", imageKey: "mythic-starhorn-seraph", name: "Starhorn Seraph", tier: "mythic", habitat: "Astral Dome", affinity: "Oracle", shipZone: "cosmic" },
  { id: "mythic-voidlight-familiar", imageKey: "mythic-voidlight-familiar", name: "Voidlight Familiar", tier: "mythic", habitat: "Dream Observatory", affinity: "Visionary", shipZone: "cosmic" },
  { id: "mythic-sunflare-kirin", imageKey: "mythic-sunflare-kirin", name: "Sunflare Kirin", tier: "mythic", habitat: "Aurora Bridge", affinity: "Radiant", shipZone: "cosmic" },
  { id: "mythic-dreamroot-ancient", imageKey: "mythic-dreamroot-ancient", name: "Dreamroot Ancient", tier: "mythic", habitat: "Star Archive", affinity: "Sage", shipZone: "cosmic" },
  { id: "mythic-celest-pup", imageKey: "mythic-celest-pup", name: "Celest Pup", tier: "mythic", habitat: "Astral Dome", affinity: "Cosmic", shipZone: "cosmic" },
  { id: "mythic-lux-leviathan", imageKey: "mythic-lux-leviathan", name: "Lux Leviathan", tier: "mythic", habitat: "Aurora Bridge", affinity: "Commander", shipZone: "cosmic" },
  { id: "mythic-orbit-vulpine", imageKey: "mythic-orbit-vulpine", name: "Orbit Vulpine", tier: "mythic", habitat: "Dream Observatory", affinity: "Explorer", shipZone: "cosmic" },
  { id: "mythic-astral-titanet", imageKey: "mythic-astral-titanet", name: "Astral Titanet", tier: "mythic", habitat: "Star Archive", affinity: "Architect", shipZone: "cosmic" },
  { id: "mythic-solstice-sylph", imageKey: "mythic-solstice-sylph", name: "Solstice Sylph", tier: "mythic", habitat: "Aurora Bridge", affinity: "Creator", shipZone: "cosmic" },
  { id: "mythic-echo-phoenix", imageKey: "mythic-echo-phoenix", name: "Echo Phoenix", tier: "mythic", habitat: "Dream Observatory", affinity: "Champion", shipZone: "cosmic" },
  { id: "mythic-nightbloom-drake", imageKey: "mythic-nightbloom-drake", name: "Nightbloom Drake", tier: "mythic", habitat: "Astral Dome", affinity: "Rebel", shipZone: "cosmic" },
  { id: "mythic-prism-warden", imageKey: "mythic-prism-warden", name: "Prism Warden", tier: "mythic", habitat: "Star Archive", affinity: "Guardian", shipZone: "cosmic" },
  { id: "mythic-aurora-maned-cat", imageKey: "mythic-aurora-maned-cat", name: "Aurora Maned Cat", tier: "mythic", habitat: "Aurora Bridge", affinity: "Visionary", shipZone: "cosmic" },
  { id: "mythic-cosmos-songbird", imageKey: "mythic-cosmos-songbird", name: "Cosmos Songbird", tier: "mythic", habitat: "Dream Observatory", affinity: "Sage", shipZone: "cosmic" },
  { id: "mythic-infinity-sprite", imageKey: "mythic-infinity-sprite", name: "Infinity Sprite", tier: "mythic", habitat: "Astral Dome", affinity: "Oracle", shipZone: "cosmic" }
];
var CREATURE_CATALOG = [
  ...COMMON_CREATURES,
  ...RARE_CREATURES,
  ...MYTHIC_CREATURES
];

// src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts
var DICE_REGEN_LEVEL_BANDS = [
  { minLevel: 1, maxDice: 30, regenIntervalMinutes: 8 },
  { minLevel: 5, maxDice: 50, regenIntervalMinutes: 10 },
  { minLevel: 10, maxDice: 75, regenIntervalMinutes: 10 },
  { minLevel: 20, maxDice: 100, regenIntervalMinutes: 10 },
  { minLevel: 40, maxDice: 125, regenIntervalMinutes: 9 },
  { minLevel: 75, maxDice: 150, regenIntervalMinutes: 8 },
  { minLevel: 125, maxDice: 200, regenIntervalMinutes: 7 }
];
function resolveDiceRegenConfig(playerLevel, bonusMaxDice = 0) {
  const safeLevel = Number.isFinite(playerLevel) ? Math.max(1, Math.floor(playerLevel)) : 1;
  const safeBonus = Number.isFinite(bonusMaxDice) ? Math.max(0, Math.floor(bonusMaxDice)) : 0;
  let selected = DICE_REGEN_LEVEL_BANDS[0];
  for (const band of DICE_REGEN_LEVEL_BANDS) {
    if (safeLevel >= band.minLevel) {
      selected = band;
    } else {
      break;
    }
  }
  return {
    maxDice: selected.maxDice + safeBonus,
    regenIntervalMinutes: selected.regenIntervalMinutes
  };
}

// src/features/gamification/level-worlds/services/fortuneEngineEconomyModel.ts
var FORTUNE_ENGINE_PRIZE_LADDER = Object.freeze([
  {
    id: "fortune_1",
    pointsRequired: 60,
    rewardLabel: "50 Dice",
    reward: { dicePool: 50 }
  },
  {
    id: "fortune_2",
    pointsRequired: 180,
    rewardLabel: "100 Dice + Core piece",
    reward: { dicePool: 100, coreFragments: 1 }
  },
  {
    id: "fortune_3",
    pointsRequired: 360,
    rewardLabel: "200 Dice + 3 Event Tickets",
    reward: { dicePool: 200, eventTickets: 3 }
  },
  {
    id: "fortune_4",
    pointsRequired: 700,
    rewardLabel: "350 Dice + Core piece",
    reward: { dicePool: 350, essence: 120, coreFragments: 1 }
  },
  {
    id: "fortune_5",
    pointsRequired: 1200,
    rewardLabel: "600 Dice + 5 Event Tickets",
    reward: { dicePool: 600, eventTickets: 5, coreFragments: 1 }
  },
  {
    id: "fortune_6",
    pointsRequired: 2e3,
    rewardLabel: "1,000 Dice",
    reward: { dicePool: 1e3, essence: 250, shards: 2 }
  },
  {
    id: "fortune_7",
    pointsRequired: 3e3,
    rewardLabel: "1,500 Dice + Core piece",
    reward: { dicePool: 1500, coreFragments: 1, shards: 4 }
  },
  {
    id: "fortune_8",
    pointsRequired: 4500,
    rewardLabel: "2,000 Dice + 2 Core pieces",
    reward: { dicePool: 2e3, coreFragments: 2, essence: 500, shards: 6 }
  }
]);
var FORTUNE_ENGINE_TOTAL_TRACK_DICE = FORTUNE_ENGINE_PRIZE_LADDER.reduce(
  (total, milestone) => total + Math.max(0, Math.floor(milestone.reward.dicePool ?? 0)),
  0
);
function safeWhole(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}
function resolveRewardBarTicketPayoutForTier(tier) {
  const safeTier = safeWhole(tier);
  return safeTier % 4 === 2 ? 6 + safeTier : 0;
}
function projectRewardBarClaimsFromProgress(progress) {
  const available = Math.max(0, Number.isFinite(progress) ? progress : 0);
  let progressSpent = 0;
  let claims = 0;
  let tickets = 0;
  for (let tier = 0; tier < REWARD_BAR_CURATED_TARGET_SEQUENCE.length; tier += 1) {
    const threshold = REWARD_BAR_CURATED_TARGET_SEQUENCE[tier] ?? 0;
    if (progressSpent + threshold > available) break;
    progressSpent += threshold;
    claims += 1;
    tickets += resolveRewardBarTicketPayoutForTier(tier);
  }
  return { claims, tickets, progressSpent };
}
function projectFortuneEngineEconomy(input) {
  const level2 = Math.max(1, safeWhole(input.playerLevel, 1));
  const durationDays = Math.max(1, safeWhole(input.eventDurationDays, 1));
  const refillsPerDay = safeWhole(input.regenRefillsPerDay);
  const regenConfig = resolveDiceRegenConfig(level2);
  const passiveRegenDice = regenConfig.maxDice * refillsPerDay * durationDays;
  const dailyTreatDice = input.dailyTreatDice.slice(0, durationDays).reduce((total, amount) => total + safeWhole(amount), 0);
  const otherAppDice = safeWhole(input.otherAppDice ?? 0);
  const boardDiceOpportunity = passiveRegenDice + dailyTreatDice + otherAppDice;
  const progressPerDie = Number.isFinite(input.expectedBoardProgressPerDie) ? Math.max(0, input.expectedBoardProgressPerDie ?? 0) : 1.1;
  const expectedRewardBarProgress = Math.floor(boardDiceOpportunity * progressPerDie);
  const rewardBar = projectRewardBarClaimsFromProgress(expectedRewardBarProgress);
  const freeGoldenLaunches = durationDays * safeWhole(input.goldenLaunchesPerDay ?? 1);
  const initialLaunches = safeWhole(input.startingEventTickets ?? 3) + rewardBar.tickets + freeGoldenLaunches;
  const projectedLaunches = initialLaunches + safeWhole(input.milestoneTicketReturns ?? 8);
  const expectedPointsPerRun = Number.isFinite(input.expectedEventPointsPerRun) ? Math.max(0, input.expectedEventPointsPerRun ?? 0) : 110;
  const expectedEventPoints = Math.floor(projectedLaunches * expectedPointsPerRun);
  const finalMilestonePoints = FORTUNE_ENGINE_PRIZE_LADDER[FORTUNE_ENGINE_PRIZE_LADDER.length - 1]?.pointsRequired ?? 0;
  return {
    passiveRegenDice,
    dailyTreatDice,
    otherAppDice,
    boardDiceOpportunity,
    expectedRewardBarProgress,
    rewardBarClaims: rewardBar.claims,
    rewardBarTickets: rewardBar.tickets,
    freeGoldenLaunches,
    initialLaunches,
    projectedLaunches,
    expectedEventPoints,
    finalMilestonePoints,
    finalMilestoneReachRatio: finalMilestonePoints > 0 ? expectedEventPoints / finalMilestonePoints : 0
  };
}
var FORTUNE_ENGINE_REFERENCE_PROJECTION = projectFortuneEngineEconomy({
  playerLevel: 1,
  eventDurationDays: 2,
  regenRefillsPerDay: 2,
  dailyTreatDice: [25, 35],
  expectedBoardProgressPerDie: 1.1,
  expectedEventPointsPerRun: 110,
  startingEventTickets: 3,
  goldenLaunchesPerDay: 1,
  milestoneTicketReturns: 8
});

// src/features/gamification/level-worlds/services/fortuneEngineProgression.ts
var FORTUNE_CORE_FRAGMENT_COUNT = 9;
var FORTUNE_CORE_FRAGMENTS = Object.freeze([
  { fragmentId: 0, name: "Dawn Cog", icon: "\u{1F305}" },
  { fragmentId: 1, name: "Star Bearing", icon: "\u2B50" },
  { fragmentId: 2, name: "Tide Spring", icon: "\u{1F30A}" },
  { fragmentId: 3, name: "Ember Gear", icon: "\u{1F525}" },
  { fragmentId: 4, name: "Heart of the Engine", icon: "\u{1F4A0}" },
  { fragmentId: 5, name: "Gale Flywheel", icon: "\u{1F32A}\uFE0F" },
  { fragmentId: 6, name: "Root Anchor", icon: "\u{1F33F}" },
  { fragmentId: 7, name: "Moon Pendulum", icon: "\u{1F319}" },
  { fragmentId: 8, name: "Aurora Key", icon: "\u{1F511}" }
]);
function resolveFortuneCoreFragmentIds(fragmentIds) {
  if (!Array.isArray(fragmentIds)) return [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of fragmentIds) {
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const id2 = Math.floor(raw);
    if (id2 >= 0 && id2 < FORTUNE_CORE_FRAGMENT_COUNT) seen.add(id2);
  }
  return Array.from(seen).sort((a, b) => a - b);
}
var FORTUNE_ENGINE_MILESTONES = Object.freeze(
  FORTUNE_ENGINE_PRIZE_LADDER.map((milestone) => ({
    ...milestone,
    reward: { ...milestone.reward }
  }))
);
var FORTUNE_ENGINE_TRACK_TOTAL_POINTS = FORTUNE_ENGINE_MILESTONES[FORTUNE_ENGINE_MILESTONES.length - 1]?.pointsRequired ?? 0;
function resolveFortuneEngineClaimedMilestoneIds(options) {
  const claimed = new Set(
    (options.claimedMilestoneIds ?? []).filter(
      (id2) => FORTUNE_ENGINE_MILESTONES.some((milestone) => milestone.id === id2)
    )
  );
  return Array.from(claimed).sort((left, right) => {
    const leftIndex = FORTUNE_ENGINE_MILESTONES.findIndex((milestone) => milestone.id === left);
    const rightIndex = FORTUNE_ENGINE_MILESTONES.findIndex((milestone) => milestone.id === right);
    return leftIndex - rightIndex;
  });
}

// src/features/gamification/level-worlds/services/islandRunGrantIdUtils.ts
function normalizeGrantIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((grantId) => typeof grantId === "string" && grantId.trim().length > 0).map((grantId) => grantId.trim()))).sort((a, b) => a.localeCompare(b));
}

// src/features/gamification/level-worlds/services/momentumMatrixGame.ts
var MOMENTUM_MATRIX_GRID_SIZE = 8;
var MOMENTUM_MATRIX_CELL_COUNT = MOMENTUM_MATRIX_GRID_SIZE * MOMENTUM_MATRIX_GRID_SIZE;
var MOMENTUM_MATRIX_SHAPES = [
  { id: "spark", label: "Spark", cells: [[0, 0]] },
  { id: "vector_2", label: "Short vector", cells: [[0, 0], [0, 1]] },
  { id: "vector_3", label: "Long vector", cells: [[0, 0], [0, 1], [0, 2]] },
  { id: "drop_3", label: "Drop vector", cells: [[0, 0], [1, 0], [2, 0]] },
  { id: "corner_3", label: "Corner", cells: [[0, 0], [1, 0], [1, 1]] },
  { id: "square_4", label: "Navigation square", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: "turn_4", label: "Wide turn", cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: "zig_4", label: "Signal zig", cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: "tee_4", label: "Course fork", cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: "beam_4", label: "Stable beam", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] }
];
function getMomentumMatrixShape(shapeId) {
  return MOMENTUM_MATRIX_SHAPES.find((shape) => shape.id === shapeId) ?? null;
}

// src/features/gamification/level-worlds/services/islandRunTechCollection.ts
var TECH_COLLECTION_GRID_SIZE = 3;
var TECH_COLLECTION_CELL_COUNT = TECH_COLLECTION_GRID_SIZE * TECH_COLLECTION_GRID_SIZE;

// src/features/gamification/level-worlds/services/islandTechnologyFragmentVisuals.ts
var CONCORD_FRAGMENT_PLACEHOLDERS = [
  "\u{1F4A0}",
  "\u{1F537}",
  "\u{1F539}",
  "\u{1F9FF}",
  "\u2699\uFE0F",
  "\u{1F52E}",
  "\u{1F48E}",
  "\u{1F300}",
  "\u2728"
];
var CONCORD_FRAGMENT_IMAGE_SRC_BY_SLOT = Array.from(
  { length: TECH_COLLECTION_CELL_COUNT },
  (_, index) => `/tech/Concord_frag${index + 1}.webp`
);
var ISLAND_5_CONCORD_FRAGMENT_VISUALS = Object.freeze(
  Object.fromEntries(
    CONCORD_FRAGMENT_PLACEHOLDERS.map((placeholder, index) => [
      index,
      {
        placeholder,
        fallbackEmoji: placeholder,
        imageSrc: CONCORD_FRAGMENT_IMAGE_SRC_BY_SLOT[index],
        ariaLabel: `Technology fragment available: Concord fragment ${index + 1}`,
        alt: `Concord fragment ${index + 1}`
      }
    ])
  )
);
var VISUALS_BY_ISLAND = Object.freeze({
  5: ISLAND_5_CONCORD_FRAGMENT_VISUALS
});

// src/features/gamification/level-worlds/services/islandTechnologyFragmentPlacements.ts
var ISLAND_5_CONCORD_FRAGMENT_PLACEMENTS = Object.freeze([
  { tileIndex: 2, fragmentSlot: 0 },
  { tileIndex: 3, fragmentSlot: 1 },
  { tileIndex: 10, fragmentSlot: 2 },
  { tileIndex: 7, fragmentSlot: 3 },
  { tileIndex: 16, fragmentSlot: 4 },
  { tileIndex: 21, fragmentSlot: 5 },
  { tileIndex: 25, fragmentSlot: 6 },
  { tileIndex: 29, fragmentSlot: 7 },
  { tileIndex: 18, fragmentSlot: 8 }
]);
var PLACEMENTS_BY_ISLAND = Object.freeze({
  5: ISLAND_5_CONCORD_FRAGMENT_PLACEMENTS
});

// src/features/gamification/level-worlds/services/islandRunConcordRollProtection.ts
var CONCORD_SOFT_PITY_MISS_ROLLS = 7;
var CONCORD_HARD_PITY_MISS_ROLLS = 10;
var CONCORD_COMPLETION_ROLL_CAP = 55;
var CONCORD_COLLECTION_ROLL_SCHEDULE = Object.freeze([
  { roll: 3, minimumCollected: 1 },
  { roll: 16, minimumCollected: 2 },
  { roll: 22, minimumCollected: 3 },
  { roll: 28, minimumCollected: 4 },
  { roll: 34, minimumCollected: 5 },
  { roll: 40, minimumCollected: 6 },
  { roll: 45, minimumCollected: 7 },
  { roll: 50, minimumCollected: 8 },
  { roll: CONCORD_COMPLETION_ROLL_CAP, minimumCollected: 9 }
]);
var EMPTY_STATE = Object.freeze({
  rollsTaken: 0,
  rollsSinceFragment: 0
});
function clampCount(value, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}
function sanitizeConcordRollProtectionState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...EMPTY_STATE };
  const candidate = value;
  return {
    rollsTaken: clampCount(candidate.rollsTaken),
    rollsSinceFragment: clampCount(candidate.rollsSinceFragment, CONCORD_HARD_PITY_MISS_ROLLS)
  };
}
function normalizeCollectedSlots(values) {
  return new Set(
    values.map((value) => Math.floor(value)).filter((value) => Number.isFinite(value) && value >= 0 && value < 9)
  );
}
function resolveInitialConcordRollProtectionState(collectedSlots) {
  const collectedCount = normalizeCollectedSlots(collectedSlots).size;
  if (collectedCount <= 0) return { ...EMPTY_STATE };
  if (collectedCount >= 9) {
    return { rollsTaken: CONCORD_COMPLETION_ROLL_CAP, rollsSinceFragment: 0 };
  }
  const matchingCheckpoint = CONCORD_COLLECTION_ROLL_SCHEDULE.find(
    (checkpoint) => checkpoint.minimumCollected === collectedCount
  );
  return {
    rollsTaken: matchingCheckpoint?.roll ?? 0,
    rollsSinceFragment: CONCORD_SOFT_PITY_MISS_ROLLS - 1
  };
}
function mergeConcordRollProtectionState(remote, local) {
  const safeRemote = sanitizeConcordRollProtectionState(remote);
  const safeLocal = sanitizeConcordRollProtectionState(local);
  if (safeLocal.rollsTaken > safeRemote.rollsTaken) return safeLocal;
  if (safeRemote.rollsTaken > safeLocal.rollsTaken) return safeRemote;
  return {
    rollsTaken: safeLocal.rollsTaken,
    // A reset to zero means one side already observed a pickup on this roll.
    rollsSinceFragment: Math.min(safeLocal.rollsSinceFragment, safeRemote.rollsSinceFragment)
  };
}

// src/features/gamification/level-worlds/services/islandRunCreatureArenaBattle.ts
var ISLAND_RUN_ARENA_BATTLE_VERSION = 1;
var ISLAND_RUN_ARENA_MAX_SHIELDS = 3;
var ISLAND_RUN_ARENA_MAX_FOCUS = 3;
function sanitizeIslandRunArenaBattleState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value;
  if (candidate.version !== ISLAND_RUN_ARENA_BATTLE_VERSION) return null;
  if (typeof candidate.islandNumber !== "number" || !Number.isInteger(candidate.islandNumber)) return null;
  if (!isIslandRunArenaIsland(candidate.islandNumber)) return null;
  if (typeof candidate.opponentCreatureId !== "string" || candidate.opponentCreatureId.trim().length === 0) return null;
  if (typeof candidate.turnNumber !== "number" || !Number.isInteger(candidate.turnNumber) || candidate.turnNumber < 1) return null;
  if (candidate.phase !== "awaiting_command" && candidate.phase !== "victory" && candidate.phase !== "defeat") return null;
  if (candidate.opponentIntent !== "quick_attack" && candidate.opponentIntent !== "heavy_attack" && candidate.opponentIntent !== "guard" && candidate.opponentIntent !== "charge_power" && candidate.opponentIntent !== "release_power") return null;
  if (typeof candidate.rngState !== "number" || !Number.isInteger(candidate.rngState)) return null;
  if (!candidate.player || typeof candidate.player !== "object" || Array.isArray(candidate.player)) return null;
  if (!candidate.opponent || typeof candidate.opponent !== "object" || Array.isArray(candidate.opponent)) return null;
  const player = candidate.player;
  const opponent = candidate.opponent;
  const numericFields = [player.hp, player.maxHp, player.focus, player.shieldCharges, opponent.hp, opponent.maxHp];
  if (numericFields.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))) return null;
  const playerMaxHp = clampInteger(player.maxHp, 1, 1e4);
  const opponentMaxHp = clampInteger(opponent.maxHp, 1, 1e4);
  return {
    version: ISLAND_RUN_ARENA_BATTLE_VERSION,
    islandNumber: candidate.islandNumber,
    opponentCreatureId: candidate.opponentCreatureId.trim(),
    turnNumber: candidate.turnNumber,
    phase: candidate.phase,
    player: {
      hp: clampInteger(player.hp, 0, playerMaxHp),
      maxHp: playerMaxHp,
      focus: clampInteger(player.focus, 0, ISLAND_RUN_ARENA_MAX_FOCUS),
      shieldCharges: clampInteger(player.shieldCharges, 0, ISLAND_RUN_ARENA_MAX_SHIELDS)
    },
    opponent: {
      hp: clampInteger(opponent.hp, 0, opponentMaxHp),
      maxHp: opponentMaxHp
    },
    opponentIntent: candidate.opponentIntent,
    rngState: candidate.rngState >>> 0
  };
}
var clampInteger = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
};

// src/features/gamification/level-worlds/services/skyboundExpeditionFlight.ts
var SKYBOUND_FULL_ROLL_RAD = Math.PI * 2;
var SKYBOUND_STARTER_UPGRADES = {
  launcher: 0,
  airframe: 0,
  engine: 0
};

// src/features/gamification/level-worlds/services/skyboundPilotAcademy.ts
var SKYBOUND_STARTER_TICKETS = 30;
var SKYBOUND_MAX_ASSEMBLY_LEVEL = 4;
var SKYBOUND_AIRCRAFT_RANKS = [
  { id: "cadet", rank: 1, title: "Cadet", callsign: "Paperwing", aircraftId: "toy_glider", aircraftName: "Toy Glider", launchMethod: "Academy slingshot", lesson: "Launch control", theme: "Meadow Campus", accent: "#61e7f2", rewardTickets: 3 },
  { id: "trainee", rank: 2, title: "Trainee", callsign: "Kestrel", aircraftId: "prop_trainer", aircraftName: "Prop Trainer", launchMethod: "Short runway", lesson: "Flight energy", theme: "Coastal Airfield", accent: "#68baff", rewardTickets: 4 },
  { id: "aviator", rank: 3, title: "Aviator", callsign: "Vortex", aircraftId: "jet_trainer", aircraftName: "Jet Trainer", launchMethod: "Runway boost", lesson: "Boost timing", theme: "Sunset Canyon", accent: "#ffbd68", rewardTickets: 4 },
  { id: "elite", rank: 4, title: "Elite", callsign: "Tempest", aircraftId: "storm_interceptor", aircraftName: "Storm Interceptor", launchMethod: "Launch catapult", lesson: "Storm mastery", theme: "Thunder Range", accent: "#bb8cff", rewardTickets: 5 },
  { id: "ace", rank: 5, title: "Ace", callsign: "Goldwing", aircraftId: "goldwing_fighter", aircraftName: "Goldwing Fighter", launchMethod: "Afterburner launch", lesson: "Gold Wings exam", theme: "Stratosphere", accent: "#ffe36d", rewardTickets: 0 }
];
var standards = (prefix, distance, rings, salvage, hazards = 1) => [
  { id: `${prefix}-distance`, kind: "distance", label: `Reach ${distance}m`, target: distance },
  rings > 0 ? { id: `${prefix}-rings`, kind: "rings", label: `Clear ${rings} rings`, target: rings } : { id: `${prefix}-salvage`, kind: "salvage", label: `Collect ${salvage} crests`, target: salvage },
  { id: `${prefix}-hazards`, kind: "hazards", label: hazards === 0 ? "Perfect safety" : `No more than ${hazards} impact`, target: hazards }
];
var SKYBOUND_LESSONS = [
  { id: "cadet_launch", rankId: "cadet", index: 0, globalIndex: 0, name: "First Hop", shortName: "Hop", briefing: "Leave the grass, hold a shallow climb, and see how far the fuselage can travel.", instructorTip: "Pull low, release near 30\u201335\xB0, and keep the field in sight.", levelId: "meadow", goalDistance: 360, standards: standards("cadet-launch", 120, 0, 3, 0), exam: false },
  { id: "cadet_gates", rankId: "cadet", index: 1, globalIndex: 1, name: "Low Gates", shortName: "Gates", briefing: "Stay inside the 5\u201322m ground-school corridor through the first gate.", instructorTip: "Small steering inputs preserve speed and ground clearance.", levelId: "meadow", goalDistance: 360, standards: [{ id: "cadet-gates-distance", kind: "distance", label: "Reach 200m", target: 200 }, { id: "cadet-gates-rings", kind: "rings", label: "Clear 1 low gate", target: 1 }, { id: "cadet-gates-salvage", kind: "salvage", label: "Collect 4 crests", target: 4 }], exam: false },
  { id: "cadet_weather", rankId: "cadet", index: 2, globalIndex: 2, name: "Field Crosswind", shortName: "Wind", briefing: "Use Stabilizer against the practice-field fans without touching the grass.", instructorTip: "Stabilize briefly; holding it costs speed.", levelId: "meadow", goalDistance: 330, standards: [{ id: "cadet-weather-distance", kind: "distance", label: "Reach 250m", target: 250 }, { id: "cadet-weather-flow", kind: "flow", label: "Hold Flow for 3s", target: 3 }, { id: "cadet-weather-hazards", kind: "hazards", label: "No more than 1 impact", target: 1 }], exam: false },
  { id: "cadet_exam", rankId: "cadet", index: 3, globalIndex: 3, name: "Cadet Checkride", shortName: "Exam", briefing: "Combine sling power, low flight, gates, and a safe ground-school line.", instructorTip: "A shallow departure and tiny corrections beat a dramatic climb.", levelId: "meadow", goalDistance: 360, standards: standards("cadet-exam", 310, 2, 4), exam: true },
  { id: "trainee_runway", rankId: "trainee", index: 0, globalIndex: 4, name: "Runway Start", shortName: "Runway", briefing: "Bring the Kestrel Prop Trainer cleanly off the coastal runway.", instructorTip: "Build power before pitching up.", levelId: "coast", goalDistance: 430, standards: standards("trainee-runway", 380, 1, 4), exam: false },
  { id: "trainee_energy", rankId: "trainee", index: 1, globalIndex: 5, name: "Energy Turns", shortName: "Energy", briefing: "Trade altitude for speed through the cliff markers.", instructorTip: "Dive gently before the long climb.", levelId: "coast", goalDistance: 510, standards: [{ id: "trainee-energy-distance", kind: "distance", label: "Reach 460m", target: 460 }, { id: "trainee-energy-flow", kind: "flow", label: "Hold Flow for 4s", target: 4 }, { id: "trainee-energy-hazards", kind: "hazards", label: "No more than 1 impact", target: 1 }], exam: false },
  { id: "trainee_landing", rankId: "trainee", index: 2, globalIndex: 6, name: "Landing Pattern", shortName: "Pattern", briefing: "Fly beyond 520m, then make a controlled touchdown before the final marker.", instructorTip: "Lower the nose, level the wings, and let Stabilizer settle the last descent.", levelId: "coast", goalDistance: 580, standards: [{ id: "trainee-pattern-distance", kind: "distance", label: "Reach the 520m landing zone", target: 520 }, { id: "trainee-pattern-landing", kind: "landing", label: "Controlled touchdown", target: 1 }, { id: "trainee-pattern-hazards", kind: "hazards", label: "Perfect safety", target: 0 }], exam: false },
  { id: "trainee_exam", rankId: "trainee", index: 3, globalIndex: 7, name: "Prop Checkride", shortName: "Exam", briefing: "Prove runway, energy, and precision handling.", instructorTip: "Save boost for the canyon exit.", levelId: "coast", goalDistance: 650, standards: standards("trainee-exam", 600, 3, 6), exam: true },
  { id: "aviator_launch", rankId: "aviator", index: 0, globalIndex: 8, name: "Jet Launch", shortName: "Launch", briefing: "Learn the Vortex trainer\u2019s faster runway-boost departure.", instructorTip: "Keep the nose nearly level until clear.", levelId: "canyon", goalDistance: 720, standards: standards("aviator-launch", 660, 2, 6), exam: false },
  { id: "aviator_boost", rankId: "aviator", index: 1, globalIndex: 9, name: "Boost Gates", shortName: "Boost", briefing: "Chain boost rings without emptying the drive reserve.", instructorTip: "Pulse boost between rings.", levelId: "canyon", goalDistance: 800, standards: standards("aviator-boost", 740, 3, 7), exam: false },
  { id: "aviator_dive", rankId: "aviator", index: 2, globalIndex: 10, name: "Precision Dive", shortName: "Dive", briefing: "Descend through the low canyon gates, then recover.", instructorTip: "Start the recovery before the final low gate.", levelId: "canyon", goalDistance: 880, standards: standards("aviator-dive", 820, 4, 7), exam: false },
  { id: "aviator_exam", rankId: "aviator", index: 3, globalIndex: 11, name: "Jet Checkride", shortName: "Exam", briefing: "Complete a fast technical canyon line.", instructorTip: "Speed is useful only when you own the next turn.", levelId: "canyon", goalDistance: 880, standards: standards("aviator-exam", 830, 4, 8), exam: true },
  { id: "elite_catapult", rankId: "elite", index: 0, globalIndex: 12, name: "Catapult Start", shortName: "Catapult", briefing: "Launch the Tempest Interceptor directly into heavy weather.", instructorTip: "Correct the first gust immediately.", levelId: "storm", goalDistance: 1020, standards: standards("elite-catapult", 950, 3, 8), exam: false },
  { id: "elite_crosswind", rankId: "elite", index: 1, globalIndex: 13, name: "Crosswind Canyon", shortName: "Crosswind", briefing: "Hold the center line while the range pushes sideways.", instructorTip: "Counter-bank, then let the aircraft settle.", levelId: "storm", goalDistance: 1100, standards: [{ id: "elite-crosswind-distance", kind: "distance", label: "Reach 1030m", target: 1030 }, { id: "elite-crosswind-flow", kind: "flow", label: "Hold Flow for 6s", target: 6 }, { id: "elite-crosswind-hazards", kind: "hazards", label: "No more than 1 impact", target: 1 }], exam: false },
  { id: "elite_storm", rankId: "elite", index: 2, globalIndex: 14, name: "Storm Corridor", shortName: "Storm", briefing: "Read lightning spires and weave through the safe corridor.", instructorTip: "Never boost into an unseen gap.", levelId: "storm", goalDistance: 1180, standards: standards("elite-storm", 1110, 5, 9), exam: false },
  { id: "elite_exam", rankId: "elite", index: 3, globalIndex: 15, name: "Interceptor Checkride", shortName: "Exam", briefing: "Master launch, wind, damage control, and storm navigation.", instructorTip: "A clean line beats a reckless fast one.", levelId: "storm", goalDistance: 1260, standards: standards("elite-exam", 1200, 5, 10), exam: true },
  { id: "ace_afterburner", rankId: "ace", index: 0, globalIndex: 16, name: "Afterburner Launch", shortName: "Launch", briefing: "Take the Goldwing into the upper atmosphere.", instructorTip: "Let the launch rail aim you before boosting.", levelId: "stratosphere", goalDistance: 1340, standards: standards("ace-launch", 1270, 4, 10), exam: false },
  { id: "ace_supersonic", rankId: "ace", index: 1, globalIndex: 17, name: "Supersonic Gates", shortName: "Speed", briefing: "Fly a high-speed sequence above the cloud deck.", instructorTip: "Commit to one smooth arc through each trio.", levelId: "stratosphere", goalDistance: 1440, standards: [{ id: "ace-speed-distance", kind: "distance", label: "Reach 1370m", target: 1370 }, { id: "ace-speed-flow", kind: "flow", label: "Hold Flow for 8s", target: 8 }, { id: "ace-speed-hazards", kind: "hazards", label: "No more than 1 impact", target: 1 }], exam: false },
  { id: "ace_formation", rankId: "ace", index: 2, globalIndex: 18, name: "Gold Formation", shortName: "Formation", briefing: "Trace the ceremonial Gold Wings formation route.", instructorTip: "Follow the gold crests; they draw the ideal path.", levelId: "stratosphere", goalDistance: 1540, standards: [{ id: "ace-formation-distance", kind: "distance", label: "Reach 1470m", target: 1470 }, { id: "ace-formation-salvage", kind: "salvage", label: "Collect 12 gold crests", target: 12 }, { id: "ace-formation-hazards", kind: "hazards", label: "Perfect safety", target: 0 }], exam: false },
  { id: "ace_exam", rankId: "ace", index: 3, globalIndex: 19, name: "Final Wings Exam", shortName: "Final", briefing: "Complete the Academy\u2019s ultimate course and earn your wings.", instructorTip: "Use everything the five ranks taught you.", levelId: "stratosphere", goalDistance: 1660, standards: standards("ace-exam", 1600, 7, 12), exam: true }
];
var SKYBOUND_CADET_LESSONS = SKYBOUND_LESSONS.filter((lesson) => lesson.rankId === "cadet");
var normalizeWhole = (value) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
var unique = (values) => [...new Set(values)];
var blankAssemblyLevels = () => ({ cadet: 0, trainee: 0, aviator: 0, elite: 0, ace: 0 });
var boundedAssemblyLevel = (value) => Math.max(0, Math.min(SKYBOUND_MAX_ASSEMBLY_LEVEL, normalizeWhole(typeof value === "number" ? value : 0)));
function createSkyboundAcademyProgress(tickets = SKYBOUND_STARTER_TICKETS) {
  return { tickets: normalizeWhole(tickets), sorties: 0, academyXp: 0, completedLessonIds: [], aceLessonIds: [], promotedRankIds: ["cadet"], medalRankIds: [], aircraftAssemblyLevels: blankAssemblyLevels(), certificateAwarded: false };
}
function getSkyboundLesson(lessonId) {
  return SKYBOUND_LESSONS.find((lesson) => lesson.id === lessonId) ?? SKYBOUND_LESSONS[0];
}
function sanitizeSkyboundAcademyProgress(value) {
  const fallback = createSkyboundAcademyProgress();
  if (!value || typeof value !== "object") return fallback;
  const source = value;
  const lessons = new Set(SKYBOUND_LESSONS.map((lesson) => lesson.id));
  const ranks = new Set(SKYBOUND_AIRCRAFT_RANKS.map((rank) => rank.id));
  const completedLessonIds = unique((source.completedLessonIds ?? []).filter((id2) => lessons.has(id2)));
  const sourceAssembly = source.aircraftAssemblyLevels;
  const aircraftAssemblyLevels = blankAssemblyLevels();
  for (const rank of SKYBOUND_AIRCRAFT_RANKS) {
    if (sourceAssembly) {
      aircraftAssemblyLevels[rank.id] = boundedAssemblyLevel(sourceAssembly[rank.id]);
      continue;
    }
    const completedForRank = completedLessonIds.filter((id2) => getSkyboundLesson(id2).rankId === rank.id);
    aircraftAssemblyLevels[rank.id] = completedForRank.some((id2) => getSkyboundLesson(id2).index >= 2) ? 4 : boundedAssemblyLevel(completedForRank.length);
  }
  return {
    tickets: normalizeWhole(source.tickets ?? fallback.tickets),
    sorties: normalizeWhole(source.sorties ?? 0),
    academyXp: normalizeWhole(source.academyXp ?? 0),
    completedLessonIds,
    aceLessonIds: unique((source.aceLessonIds ?? []).filter((id2) => lessons.has(id2))),
    promotedRankIds: unique(["cadet", ...(source.promotedRankIds ?? []).filter((id2) => ranks.has(id2))]),
    medalRankIds: unique((source.medalRankIds ?? []).filter((id2) => ranks.has(id2))),
    aircraftAssemblyLevels,
    certificateAwarded: source.certificateAwarded === true
  };
}

// src/features/gamification/level-worlds/services/skyboundAcademyStorage.ts
var boundedLevel = (value) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(5, Math.floor(value))) : 0;
function createSkyboundAcademySave() {
  return { progress: createSkyboundAcademyProgress(), upgrades: { ...SKYBOUND_STARTER_UPGRADES }, salvage: 0 };
}
function sanitizeSkyboundAcademySave(value) {
  const fallback = createSkyboundAcademySave();
  if (!value || typeof value !== "object") return fallback;
  const source = value;
  const upgrades = source.upgrades;
  return { progress: sanitizeSkyboundAcademyProgress(source.progress), upgrades: { launcher: boundedLevel(upgrades?.launcher), airframe: boundedLevel(upgrades?.airframe), engine: boundedLevel(upgrades?.engine) }, salvage: typeof source.salvage === "number" && Number.isFinite(source.salvage) ? Math.max(0, Math.floor(source.salvage)) : fallback.salvage };
}
function createSkyboundAcademyEventProgress(nowMs = Date.now()) {
  const save = createSkyboundAcademySave();
  return { ...save, progress: { ...save.progress, tickets: 0 }, salvage: 0, activeAttemptId: null, activeLessonId: null, settledAttemptIds: [], bestFlightScore: 0, updatedAtMs: Math.max(0, Math.floor(nowMs)) };
}
function sanitizeSkyboundAcademyEventProgress(value) {
  const fallback = createSkyboundAcademyEventProgress(0);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const source = value;
  const save = sanitizeSkyboundAcademySave(source);
  const lessonIds = new Set(SKYBOUND_LESSONS.map((lesson) => lesson.id));
  return { ...save, progress: { ...save.progress, tickets: 0 }, activeAttemptId: typeof source.activeAttemptId === "string" && source.activeAttemptId.trim() ? source.activeAttemptId.trim() : null, activeLessonId: typeof source.activeLessonId === "string" && lessonIds.has(source.activeLessonId) ? source.activeLessonId : null, settledAttemptIds: Array.isArray(source.settledAttemptIds) ? Array.from(new Set(source.settledAttemptIds.filter((id2) => typeof id2 === "string" && id2.trim().length > 0))).slice(-80) : [], bestFlightScore: typeof source.bestFlightScore === "number" && Number.isFinite(source.bestFlightScore) ? Math.max(0, Math.floor(source.bestFlightScore)) : 0, updatedAtMs: typeof source.updatedAtMs === "number" && Number.isFinite(source.updatedAtMs) ? Math.max(0, Math.floor(source.updatedAtMs)) : 0 };
}

// src/features/gamification/level-worlds/services/islandRunVaultProgress.ts
var VAULT_ISLAND_UPGRADE_IDS = [
  "limestone-works",
  "grand-palace",
  "treasury-depths",
  "golden-crownworks",
  "shark-patrol",
  "laser-grid",
  "guardian-frigate"
];
var VAULT_ISLAND_UPGRADES = [
  {
    id: "limestone-works",
    category: "construction",
    name: "Limestone Works",
    shortName: "Stone",
    description: "Dress the gifted stone structure in warm-cut limestone and open the royal garden level.",
    cost: 300,
    prerequisiteIds: [],
    rewardDice: 50,
    rewardShards: 0
  },
  {
    id: "grand-palace",
    category: "construction",
    name: "Grand Palace",
    shortName: "Palace",
    description: "Raise the monumental second storey, twin domes, and the ceremonial stair hall.",
    cost: 900,
    prerequisiteIds: ["limestone-works"],
    rewardDice: 100,
    rewardShards: 10
  },
  {
    id: "treasury-depths",
    category: "construction",
    name: "Treasury Depths",
    shortName: "Vault",
    description: "Excavate the split descent, private casino floor, and deep museum treasury.",
    cost: 1800,
    prerequisiteIds: ["grand-palace"],
    rewardDice: 150,
    rewardShards: 25
  },
  {
    id: "golden-crownworks",
    category: "construction",
    name: "Golden Crownworks",
    shortName: "Crown",
    description: "Cast the parapets, dome ribs, and sovereign roofline in engraved solid gold.",
    cost: 3200,
    prerequisiteIds: ["treasury-depths"],
    rewardDice: 200,
    rewardShards: 50
  },
  {
    id: "shark-patrol",
    category: "security",
    name: "Shark Patrol",
    shortName: "Sharks",
    description: "Deploy a circling three-shark patrol through the crystalline outer lagoon.",
    cost: 700,
    prerequisiteIds: ["limestone-works"],
    rewardDice: 30,
    rewardShards: 0
  },
  {
    id: "laser-grid",
    category: "security",
    name: "Prismatic Laser Grid",
    shortName: "Lasers",
    description: "Install animated jewel pylons and a sweeping perimeter detection lattice.",
    cost: 1500,
    prerequisiteIds: ["grand-palace"],
    rewardDice: 60,
    rewardShards: 10
  },
  {
    id: "guardian-frigate",
    category: "security",
    name: "Guardian Frigate",
    shortName: "Frigate",
    description: "Commission the gilded royal frigate to hold station beyond the harbour mouth.",
    cost: 2400,
    prerequisiteIds: ["grand-palace", "shark-patrol"],
    rewardDice: 100,
    rewardShards: 25
  }
];
var upgradeById = new Map(VAULT_ISLAND_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
function sanitizeVaultIslandProgress(value) {
  const record = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  const requestedIds = Array.isArray(record.purchasedUpgradeIds) ? new Set(record.purchasedUpgradeIds.filter((id2) => typeof id2 === "string" && VAULT_ISLAND_UPGRADE_IDS.includes(id2))) : /* @__PURE__ */ new Set();
  return {
    purchasedUpgradeIds: VAULT_ISLAND_UPGRADE_IDS.filter((id2) => requestedIds.has(id2))
  };
}
function mergeVaultIslandProgress(remote, local) {
  return sanitizeVaultIslandProgress({
    purchasedUpgradeIds: [
      ...sanitizeVaultIslandProgress(remote).purchasedUpgradeIds,
      ...sanitizeVaultIslandProgress(local).purchasedUpgradeIds
    ]
  });
}

// src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
var EGG_REWARD_RARITY_ROLL_DENOMINATOR = 500;
var EGG_REWARD_RARITY_THRESHOLD = 5;
function getIslandRunLuckyRollSessionKey(cycleIndex, targetIslandNumber) {
  const safeCycleIndex = Number.isFinite(cycleIndex) ? Math.max(0, Math.floor(cycleIndex)) : 0;
  const safeTargetIslandNumber = Number.isFinite(targetIslandNumber) ? Math.max(1, Math.floor(targetIslandNumber)) : 1;
  return `${safeCycleIndex}:${safeTargetIslandNumber}`;
}
var ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATES = [
  "not_started",
  "awaiting_first_orders",
  "awaiting_first_roll",
  "first_fragment_collected",
  "first_roll_consumed",
  "first_essence_reward_claimed",
  "build_prompt_visible",
  "build_modal_opened",
  "hatchery_l1_built",
  "hatchery_l1_celebrated",
  "normal_play_until_low_dice",
  "first_creature_pack_available",
  "first_creature_pack_opened",
  "first_creature_pack_claimed",
  "complete"
];
var ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE = "not_started";
var ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATE_SET = new Set(ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATES);
var ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATE_RANK = new Map(
  ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATES.map((state2, index) => [state2, index])
);
function sanitizeIslandRunFirstSessionTutorialState(value, fallback = ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE) {
  return typeof value === "string" && ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATE_SET.has(value) ? value : fallback;
}
function compareIslandRunFirstSessionTutorialStates(left, right) {
  return (ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATE_RANK.get(left) ?? 0) - (ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATE_RANK.get(right) ?? 0);
}
var ISLAND_RUN_RUNTIME_STATE_TABLE = "island_run_runtime_state";
var ISLAND_RUN_REMOTE_BACKOFF_MS = 60 * 1e3;
var CONTRACT_V2_STOP_COUNT = 5;
var DEFAULT_STOP_BUILD_REQUIRED_ESSENCE = 100;
var DEFAULT_REWARD_BAR_THRESHOLD = 10;
var TECH_COLLECTION_GRID_CELL_COUNT = 9;
var TECH_COLLECTION_LINE_COUNT = 8;
function sanitizeIslandIndexLedger(ledger, maxExclusive) {
  if (!ledger || typeof ledger !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(ledger)) {
    if (!Array.isArray(value)) continue;
    const seen = /* @__PURE__ */ new Set();
    const cleaned = [];
    for (const raw of value) {
      const idx = Math.floor(raw);
      if (!Number.isFinite(idx) || idx < 0 || idx >= maxExclusive) continue;
      if (seen.has(idx)) continue;
      seen.add(idx);
      cleaned.push(idx);
    }
    cleaned.sort((a, b) => a - b);
    if (cleaned.length > 0) out[key] = cleaned;
  }
  return out;
}
function hasAllIslandOneTechnologySlots(recordLike) {
  const ledger = recordLike.techCollectionByIsland;
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) return false;
  const slots = getConcordCollectedSlots(ledger);
  if (!Array.isArray(slots)) return false;
  const slotSet = /* @__PURE__ */ new Set();
  for (const raw of slots) {
    const idx = Math.floor(Number(raw));
    if (Number.isFinite(idx) && idx >= 0 && idx < TECH_COLLECTION_GRID_CELL_COUNT) slotSet.add(idx);
  }
  return Array.from({ length: TECH_COLLECTION_GRID_CELL_COUNT }, (_, idx) => idx).every((idx) => slotSet.has(idx));
}
function isEstablishedBeyondIslandOne(recordLike) {
  if (typeof recordLike.currentIslandNumber === "number" && recordLike.currentIslandNumber > 1) return true;
  const completed = recordLike.completedStopsByIsland;
  if (!completed || typeof completed !== "object" || Array.isArray(completed)) return false;
  return Object.keys(completed).some((key) => Number(key) > 1);
}
function sanitizeTechnologyUnlocksById(value, fallback = {}, compatibilityRecord) {
  const out = { ...fallback };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const concord = value["the-concord"];
    if (concord && typeof concord === "object" && !Array.isArray(concord)) {
      const builtAtMs = concord.builtAtMs;
      out["the-concord"] = {
        builtAtMs: typeof builtAtMs === "number" && Number.isFinite(builtAtMs) && builtAtMs > 0 ? Math.floor(builtAtMs) : 1,
        active: concord.active !== false
      };
    }
    const storyFastMode = value["story-fast-mode"];
    if (storyFastMode && typeof storyFastMode === "object" && !Array.isArray(storyFastMode)) {
      const builtAtMs = storyFastMode.builtAtMs;
      out["story-fast-mode"] = {
        builtAtMs: typeof builtAtMs === "number" && Number.isFinite(builtAtMs) && builtAtMs > 0 ? Math.floor(builtAtMs) : 1,
        active: storyFastMode.active !== false
      };
    }
  }
  if (!out["the-concord"] && compatibilityRecord && (hasAllIslandOneTechnologySlots(compatibilityRecord) || value == null && isEstablishedBeyondIslandOne(compatibilityRecord))) {
    out["the-concord"] = { builtAtMs: 1, active: true };
  }
  return out;
}
function mergeTechnologyUnlocksById(remote, local) {
  const out = {};
  const remoteConcord = remote?.["the-concord"];
  const localConcord = local?.["the-concord"];
  if (remoteConcord || localConcord) {
    const builtAtMs = Math.min(remoteConcord?.builtAtMs ?? Number.POSITIVE_INFINITY, localConcord?.builtAtMs ?? Number.POSITIVE_INFINITY);
    out["the-concord"] = {
      builtAtMs: Number.isFinite(builtAtMs) ? builtAtMs : 1,
      active: Boolean(remoteConcord?.active ?? localConcord?.active ?? true)
    };
  }
  const remoteStoryFastMode = remote?.["story-fast-mode"];
  const localStoryFastMode = local?.["story-fast-mode"];
  if (remoteStoryFastMode || localStoryFastMode) {
    const builtAtMs = Math.min(
      remoteStoryFastMode?.builtAtMs ?? Number.POSITIVE_INFINITY,
      localStoryFastMode?.builtAtMs ?? Number.POSITIVE_INFINITY
    );
    out["story-fast-mode"] = {
      builtAtMs: Number.isFinite(builtAtMs) ? builtAtMs : 1,
      active: Boolean(remoteStoryFastMode?.active ?? localStoryFastMode?.active ?? true)
    };
  }
  return out;
}
function mergeIslandIndexLedgerByUnion(remote, local) {
  const out = {};
  const islandKeys = /* @__PURE__ */ new Set([
    ...Object.keys(remote ?? {}),
    ...Object.keys(local ?? {})
  ]);
  islandKeys.forEach((islandKey) => {
    const unionSet = /* @__PURE__ */ new Set([
      ...remote?.[islandKey] ?? [],
      ...local?.[islandKey] ?? []
    ]);
    const merged = Array.from(unionSet).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    if (merged.length > 0) out[islandKey] = merged;
  });
  return out;
}
var runtimeCommitCoordinatorByUser = /* @__PURE__ */ new Map();
var runtimeCommitAttemptCounter = 0;
function resetIslandRunRuntimeCommitCoordinatorForTests() {
  runtimeCommitCoordinatorByUser.clear();
  runtimeCommitAttemptCounter = 0;
}
function getRuntimeCommitCoordinator(userId) {
  const existing = runtimeCommitCoordinatorByUser.get(userId);
  if (existing) return existing;
  const created = {
    syncState: "idle",
    inFlightCount: 0,
    inFlightActionIds: /* @__PURE__ */ new Set(),
    parkedActionId: null,
    parkedRecord: null,
    parkedConflictMode: "merge",
    parkedReason: null
  };
  runtimeCommitCoordinatorByUser.set(userId, created);
  return created;
}
function buildRuntimeCommitAttemptId(userId) {
  runtimeCommitAttemptCounter += 1;
  return `runtime-commit-${userId}-${Date.now()}-${runtimeCommitAttemptCounter}`;
}
function hashRuntimeCommitPayload(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function buildDeterministicRuntimeActionUuid(input) {
  const hex = [0, 1, 2, 3].map((salt) => hashRuntimeCommitPayload(`${salt}:${input}`)).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function stableRuntimeCommitStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableRuntimeCommitStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entryValue]) => `${JSON.stringify(key)}:${stableRuntimeCommitStringify(entryValue)}`);
  return `{${entries.join(",")}}`;
}
function getRuntimeGameplayPayload(record) {
  const { runtimeVersion: _runtimeVersion, ...gameplayPayload } = record;
  return gameplayPayload;
}
function areIslandRunGameStateRecordsGameplayEqual(left, right) {
  return stableRuntimeCommitStringify(getRuntimeGameplayPayload(left)) === stableRuntimeCommitStringify(getRuntimeGameplayPayload(right));
}
function buildRuntimeClientActionId(userId, record) {
  const runtimeVersion = Math.max(0, Math.floor(record.runtimeVersion));
  return buildDeterministicRuntimeActionUuid(
    `${userId}:${runtimeVersion}:${stableRuntimeCommitStringify(getRuntimeGameplayPayload(record))}`
  );
}
function deriveIslandRunContractV2StopType(index) {
  switch (index) {
    case 0:
      return "hatchery";
    case 1:
      return "habit";
    case 2:
      return "mystery";
    case 3:
      return "wisdom";
    case 4:
    default:
      return "boss";
  }
}
function getDefaultStopStatesByIndex() {
  return Array.from({ length: CONTRACT_V2_STOP_COUNT }, (_, index) => ({
    objectiveComplete: false,
    buildComplete: false,
    accessUnlocked: index === 0
  }));
}
function getDefaultStopBuildStateByIndex() {
  return Array.from({ length: CONTRACT_V2_STOP_COUNT }, () => ({
    requiredEssence: DEFAULT_STOP_BUILD_REQUIRED_ESSENCE,
    spentEssence: 0,
    buildLevel: 0
  }));
}
function toStopStateEntry(value, index = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { objectiveComplete: false, buildComplete: false, accessUnlocked: index === 0 };
  }
  const candidate = value;
  const completedAtMs = typeof candidate.completedAtMs === "number" && Number.isFinite(candidate.completedAtMs) ? candidate.completedAtMs : void 0;
  const postponedAtMs = typeof candidate.postponedAtMs === "number" && Number.isFinite(candidate.postponedAtMs) ? candidate.postponedAtMs : candidate.postponedAtMs === null ? null : void 0;
  const objectiveComplete = candidate.objectiveComplete === true;
  return {
    objectiveComplete,
    buildComplete: candidate.buildComplete === true,
    ...candidate.completionDiceAwarded === true ? { completionDiceAwarded: true } : {},
    accessUnlocked: index === 0 || objectiveComplete || candidate.accessUnlocked === true,
    ...postponedAtMs !== void 0 && !objectiveComplete ? { postponedAtMs } : {},
    ...typeof completedAtMs === "number" ? { completedAtMs } : {}
  };
}
function toStopBuildStateEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      requiredEssence: DEFAULT_STOP_BUILD_REQUIRED_ESSENCE,
      spentEssence: 0,
      buildLevel: 0
    };
  }
  const candidate = value;
  return {
    requiredEssence: typeof candidate.requiredEssence === "number" && Number.isFinite(candidate.requiredEssence) ? Math.max(0, Math.floor(candidate.requiredEssence)) : DEFAULT_STOP_BUILD_REQUIRED_ESSENCE,
    spentEssence: typeof candidate.spentEssence === "number" && Number.isFinite(candidate.spentEssence) ? Math.max(0, Math.floor(candidate.spentEssence)) : 0,
    buildLevel: typeof candidate.buildLevel === "number" && Number.isFinite(candidate.buildLevel) ? Math.max(0, Math.floor(candidate.buildLevel)) : 0
  };
}
function getStorageKey(userId) {
  return `island_run_runtime_state_${userId}`;
}
function getRemoteBackoffStorageKey(userId) {
  return `${getStorageKey(userId)}_remote_backoff_until`;
}
function getPendingWriteStorageKey(userId) {
  return `${getStorageKey(userId)}_pending_write`;
}
function getPendingWriteConflictModeStorageKey(userId) {
  return `${getPendingWriteStorageKey(userId)}_conflict_mode`;
}
function getNormalizedRuntimeStateError(error) {
  return {
    message: typeof error?.message === "string" ? error.message.trim().toLowerCase() : "",
    code: typeof error?.code === "string" ? error.code.trim().toLowerCase() : ""
  };
}
function isTransportLikeRuntimeStateError(error) {
  if (!error) return false;
  const normalizedError = getNormalizedRuntimeStateError(error);
  const normalizedMessage = normalizedError.message;
  const normalizedCode = normalizedError.code;
  if (!normalizedMessage && !normalizedCode) return true;
  return [
    normalizedMessage === "load failed",
    normalizedMessage === "failed to fetch",
    normalizedMessage.includes("networkerror"),
    normalizedMessage.includes("network request failed"),
    normalizedMessage.includes("fetch failed"),
    normalizedMessage.includes("load failed"),
    normalizedCode === "failed_to_fetch",
    normalizedCode === "network_error"
  ].some(Boolean);
}
function isSchemaMismatchRuntimeStateError(error) {
  if (!error) return false;
  const normalizedError = getNormalizedRuntimeStateError(error);
  const normalizedMessage = normalizedError.message;
  const normalizedCode = normalizedError.code;
  return [
    normalizedCode === "42703",
    normalizedCode === "pgrst204",
    normalizedMessage.includes("does not exist"),
    normalizedMessage.includes("could not find the"),
    normalizedMessage.includes("schema cache")
  ].some(Boolean);
}
function getRemoteBackoffUntil(userId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getRemoteBackoffStorageKey(userId));
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      window.localStorage.removeItem(getRemoteBackoffStorageKey(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function setRemoteBackoffUntil(userId, backoffUntil) {
  if (typeof window === "undefined") return;
  try {
    const storageKey = getRemoteBackoffStorageKey(userId);
    if (backoffUntil === null) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, String(backoffUntil));
  } catch {
  }
}
function activateRemoteBackoff(userId) {
  const backoffUntil = Date.now() + ISLAND_RUN_REMOTE_BACKOFF_MS;
  setRemoteBackoffUntil(userId, backoffUntil);
  return backoffUntil;
}
function getRuntimeStateDebugFields(record) {
  return {
    currentIslandNumber: record.currentIslandNumber,
    bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
    cycleIndex: record.cycleIndex,
    tokenIndex: record.tokenIndex,
    spinTokens: record.spinTokens,
    dicePool: record.dicePool
  };
}
function getDefaultRecord() {
  const nowMs = Date.now();
  return {
    runtimeVersion: 0,
    firstRunClaimed: false,
    firstSessionTutorialState: ISLAND_RUN_FIRST_SESSION_TUTORIAL_INITIAL_STATE,
    dailyHeartsClaimedDayKey: null,
    onboardingDisplayNameLoopCompleted: false,
    welcomePackClaimed: false,
    welcomePackRewardBundleClaimed: false,
    storyPrologueSeen: false,
    narrativeSeenState: createEmptyIslandNarrativeSeenState(),
    audioEnabled: true,
    musicEnabled: true,
    sfxEnabled: true,
    currentIslandNumber: 1,
    cycleIndex: 0,
    bossTrialResolvedIslandNumber: null,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: {},
    eggRewardInventory: [],
    islandStartedAtMs: nowMs,
    islandExpiresAtMs: nowMs + 48 * 60 * 60 * 1e3,
    islandShards: 0,
    tokenIndex: 0,
    spinTokens: 0,
    dicePool: ISLAND_RUN_DEFAULT_STARTING_DICE,
    bonusMaxDice: 0,
    shardTierIndex: 0,
    shardClaimCount: 0,
    shields: 0,
    shards: 0,
    diamonds: 3,
    creatureTreatInventory: {
      basic: 3,
      favorite: 1,
      rare: 0
    },
    companionBonusLastVisitKey: null,
    completedStopsByIsland: {},
    vaultRushClaimsByIsland: {},
    vaultIslandProgress: { purchasedUpgradeIds: [] },
    stopTicketsPaidByIsland: {},
    bonusTileChargeByIsland: {},
    techCollectionByIsland: {},
    concordRollProtectionState: { rollsTaken: 0, rollsSinceFragment: 0 },
    techCollectionRewardedLinesByIsland: {},
    technologyUnlocksById: {},
    signatureMissionProgressByIsland: {},
    marketOwnedBundlesByIsland: {},
    creatureCollection: [],
    activeCompanionId: null,
    selectedPlayerPieceId: null,
    perfectCompanionIds: [],
    perfectCompanionReasons: {},
    perfectCompanionComputedAtMs: null,
    perfectCompanionModelVersion: null,
    perfectCompanionComputedCycleIndex: null,
    activeStopIndex: 0,
    activeStopType: "hatchery",
    stopStatesByIndex: getDefaultStopStatesByIndex(),
    stopBuildStateByIndex: getDefaultStopBuildStateByIndex(),
    bossState: {
      unlocked: false,
      objectiveComplete: false,
      buildComplete: false,
      arenaBattle: null
    },
    essence: 0,
    essenceLifetimeEarned: 0,
    essenceLifetimeSpent: 0,
    diceRegenState: null,
    rewardBarProgress: 0,
    rewardBarThreshold: DEFAULT_REWARD_BAR_THRESHOLD,
    rewardBarClaimCountInEvent: 0,
    rewardBarEscalationTier: 0,
    rewardBarLastClaimAtMs: null,
    rewardBarBoundEventId: null,
    rewardBarLadderId: null,
    activeTimedEvent: null,
    activeTimedEventProgress: {
      feedingActions: 0,
      tokensEarned: 0,
      milestonesClaimed: 0
    },
    stickerProgress: {
      fragments: 0
    },
    stickerInventory: {},
    lastEssenceDriftLost: 0,
    minigameTicketsByEvent: {},
    arenaFirstTicketBoostClaimedByEvent: {},
    luckyRollSessionsByMilestone: {},
    spaceExcavatorProgressByEvent: {},
    companionFeastProgressByEvent: {},
    fortuneEngineProgressByEvent: {},
    skyboundAcademyProgressByEvent: {},
    journeyDiscArenaProgressByEvent: {},
    journeyDiscArmory: createJourneyDiscArmory(0),
    crystalMinersProgressByEvent: {},
    momentumMatrixProgressByEvent: {}
  };
}
function toCreatureCollectionEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value;
  if (typeof candidate.creatureId !== "string" || !candidate.creatureId.trim()) return null;
  const copies = typeof candidate.copies === "number" && Number.isFinite(candidate.copies) ? Math.max(1, Math.floor(candidate.copies)) : 1;
  const firstCollectedAtMs = typeof candidate.firstCollectedAtMs === "number" && Number.isFinite(candidate.firstCollectedAtMs) ? candidate.firstCollectedAtMs : Date.now();
  const lastCollectedAtMs = typeof candidate.lastCollectedAtMs === "number" && Number.isFinite(candidate.lastCollectedAtMs) ? candidate.lastCollectedAtMs : firstCollectedAtMs;
  const lastCollectedIslandNumber = typeof candidate.lastCollectedIslandNumber === "number" && Number.isFinite(candidate.lastCollectedIslandNumber) ? Math.max(1, Math.floor(candidate.lastCollectedIslandNumber)) : 1;
  const bondXp = typeof candidate.bondXp === "number" && Number.isFinite(candidate.bondXp) ? Math.max(0, Math.floor(candidate.bondXp)) : 0;
  const derivedBondLevel = Math.floor(bondXp / 3) + 1;
  const bondLevel = typeof candidate.bondLevel === "number" && Number.isFinite(candidate.bondLevel) ? Math.max(1, Math.floor(candidate.bondLevel), derivedBondLevel) : derivedBondLevel;
  const lastFedAtMs = typeof candidate.lastFedAtMs === "number" && Number.isFinite(candidate.lastFedAtMs) ? candidate.lastFedAtMs : null;
  const claimedBondMilestones = Array.isArray(candidate.claimedBondMilestones) ? Array.from(
    new Set(candidate.claimedBondMilestones.filter((milestone) => typeof milestone === "number" && Number.isFinite(milestone)).map((milestone) => Math.max(1, Math.floor(milestone))))
  ).sort((a, b) => a - b) : [];
  const formLevel = typeof candidate.formLevel === "number" && Number.isFinite(candidate.formLevel) ? Math.min(3, Math.max(1, Math.floor(candidate.formLevel))) : null;
  const claimedFormRewards = Array.isArray(candidate.claimedFormRewards) ? Array.from(
    new Set(candidate.claimedFormRewards.filter((milestone) => typeof milestone === "number" && Number.isFinite(milestone)).map((milestone) => Math.min(3, Math.max(1, Math.floor(milestone)))))
  ).sort((a, b) => a - b) : null;
  const grantIds = normalizeGrantIds(candidate.grantIds);
  return {
    creatureId: candidate.creatureId,
    copies,
    firstCollectedAtMs,
    lastCollectedAtMs,
    lastCollectedIslandNumber,
    bondXp,
    bondLevel,
    lastFedAtMs,
    claimedBondMilestones,
    ...formLevel !== null ? { formLevel } : {},
    ...claimedFormRewards !== null ? { claimedFormRewards } : {},
    ...grantIds.length > 0 ? { grantIds } : {}
  };
}
function stableEggRewardInventoryStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableEggRewardInventoryStringify(entry)).join(",")}]`;
  }
  return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entryValue]) => `${JSON.stringify(key)}:${stableEggRewardInventoryStringify(entryValue)}`).join(",")}}`;
}
function resolveDuplicateEggRewardInventoryEntry(existing, candidate) {
  const existingStatusRank = existing.status === "opened" ? 1 : 0;
  const candidateStatusRank = candidate.status === "opened" ? 1 : 0;
  if (candidateStatusRank !== existingStatusRank) {
    return candidateStatusRank > existingStatusRank ? candidate : existing;
  }
  const existingOpenedAtMs = existing.openedAtMs ?? 0;
  const candidateOpenedAtMs = candidate.openedAtMs ?? 0;
  if (candidateOpenedAtMs !== existingOpenedAtMs) {
    return candidateOpenedAtMs > existingOpenedAtMs ? candidate : existing;
  }
  if (candidate.grantedAtMs !== existing.grantedAtMs) {
    return candidate.grantedAtMs > existing.grantedAtMs ? candidate : existing;
  }
  const candidateStable = stableEggRewardInventoryStringify(candidate);
  const existingStable = stableEggRewardInventoryStringify(existing);
  return candidateStable > existingStable ? candidate : existing;
}
function toEggRewardInventoryEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value;
  const eggRewardId = typeof candidate.eggRewardId === "string" ? candidate.eggRewardId.trim() : "";
  const sourceSessionKey = typeof candidate.sourceSessionKey === "string" ? candidate.sourceSessionKey.trim() : "";
  const sourceRunId = typeof candidate.sourceRunId === "string" ? candidate.sourceRunId.trim() : "";
  const sourceRewardId = typeof candidate.sourceRewardId === "string" ? candidate.sourceRewardId.trim() : "";
  if (!eggRewardId || !sourceSessionKey || !sourceRunId || !sourceRewardId) return null;
  if (candidate.source !== "treasure_path" && candidate.source !== "egg_pack" && candidate.source !== "creature_arena") return null;
  if (candidate.eggTier !== "common" && candidate.eggTier !== "rare") return null;
  if (candidate.resolverVersion !== "treasure_path_egg_v1" && candidate.resolverVersion !== "egg_pack_v1" && candidate.resolverVersion !== "creature_arena_locked_v1") return null;
  if (candidate.status !== "unopened" && candidate.status !== "opened") return null;
  if (candidate.rarityRollDenominator !== EGG_REWARD_RARITY_ROLL_DENOMINATOR || candidate.rarityThreshold !== EGG_REWARD_RARITY_THRESHOLD) {
    return null;
  }
  if (typeof candidate.tileId !== "number" || !Number.isFinite(candidate.tileId) || typeof candidate.cycleIndex !== "number" || !Number.isFinite(candidate.cycleIndex) || typeof candidate.targetIslandNumber !== "number" || !Number.isFinite(candidate.targetIslandNumber) || typeof candidate.eggSeed !== "number" || !Number.isFinite(candidate.eggSeed) || typeof candidate.rarityRoll !== "number" || !Number.isFinite(candidate.rarityRoll) || typeof candidate.grantedAtMs !== "number" || !Number.isFinite(candidate.grantedAtMs)) {
    return null;
  }
  const openedAtMs = typeof candidate.openedAtMs === "number" && Number.isFinite(candidate.openedAtMs) ? Math.max(0, Math.floor(candidate.openedAtMs)) : candidate.openedAtMs === null ? null : void 0;
  if (typeof openedAtMs === "undefined") return null;
  const openedCreatureId = typeof candidate.openedCreatureId === "string" && candidate.openedCreatureId.trim().length > 0 ? candidate.openedCreatureId.trim() : void 0;
  const lockedCreatureId = typeof candidate.lockedCreatureId === "string" && candidate.lockedCreatureId.trim().length > 0 ? candidate.lockedCreatureId.trim() : void 0;
  if (candidate.source === "creature_arena" && (!lockedCreatureId || candidate.resolverVersion !== "creature_arena_locked_v1")) return null;
  if (candidate.source !== "creature_arena" && lockedCreatureId) return null;
  return {
    eggRewardId,
    source: candidate.source,
    sourceSessionKey,
    sourceRunId,
    sourceRewardId,
    tileId: Math.max(0, Math.floor(candidate.tileId)),
    cycleIndex: Math.max(0, Math.floor(candidate.cycleIndex)),
    targetIslandNumber: Math.max(0, Math.floor(candidate.targetIslandNumber)),
    eggTier: candidate.eggTier,
    eggSeed: Math.max(0, Math.floor(candidate.eggSeed)),
    rarityRoll: Math.max(0, Math.floor(candidate.rarityRoll)),
    rarityRollDenominator: EGG_REWARD_RARITY_ROLL_DENOMINATOR,
    rarityThreshold: EGG_REWARD_RARITY_THRESHOLD,
    resolverVersion: candidate.resolverVersion,
    status: candidate.status,
    grantedAtMs: Math.max(0, Math.floor(candidate.grantedAtMs)),
    openedAtMs,
    ...openedCreatureId ? { openedCreatureId } : {},
    ...lockedCreatureId ? { lockedCreatureId } : {}
  };
}
function sanitizeEggRewardInventory(value, fallback = []) {
  if (!Array.isArray(value)) return [...fallback];
  const byEggRewardId = /* @__PURE__ */ new Map();
  for (const rawEntry of value) {
    const entry = toEggRewardInventoryEntry(rawEntry);
    if (!entry) continue;
    const existing = byEggRewardId.get(entry.eggRewardId);
    byEggRewardId.set(
      entry.eggRewardId,
      existing ? resolveDuplicateEggRewardInventoryEntry(existing, entry) : entry
    );
  }
  return Array.from(byEggRewardId.values()).sort((a, b) => {
    if (a.grantedAtMs !== b.grantedAtMs) return a.grantedAtMs - b.grantedAtMs;
    if (a.eggRewardId === b.eggRewardId) return 0;
    return a.eggRewardId < b.eggRewardId ? -1 : 1;
  });
}
function mergeEggRewardInventory(remote, local) {
  return sanitizeEggRewardInventory([...remote, ...local]);
}
function toRecord(value, fallback) {
  const eggTierRaw = value.activeEggTier;
  const activeEggTier = eggTierRaw === "common" || eggTierRaw === "rare" || eggTierRaw === "mythic" ? eggTierRaw : fallback.activeEggTier;
  const normalizedActiveStopIndex = typeof value.activeStopIndex === "number" && Number.isFinite(value.activeStopIndex) ? Math.max(0, Math.min(CONTRACT_V2_STOP_COUNT - 1, Math.floor(value.activeStopIndex))) : fallback.activeStopIndex;
  const stopStatesByIndex = Array.isArray(value.stopStatesByIndex) ? Array.from({ length: CONTRACT_V2_STOP_COUNT }, (_, index) => toStopStateEntry(value.stopStatesByIndex?.[index], index)) : fallback.stopStatesByIndex;
  const stopBuildStateByIndex = Array.isArray(value.stopBuildStateByIndex) ? Array.from({ length: CONTRACT_V2_STOP_COUNT }, (_, index) => toStopBuildStateEntry(value.stopBuildStateByIndex?.[index])) : fallback.stopBuildStateByIndex;
  const techCollectionByIsland = value.techCollectionByIsland !== null && typeof value.techCollectionByIsland === "object" && !Array.isArray(value.techCollectionByIsland) ? sanitizeIslandIndexLedger(value.techCollectionByIsland, TECH_COLLECTION_GRID_CELL_COUNT) : fallback.techCollectionByIsland;
  const rawConcordRollProtectionState = value.concordRollProtectionState ?? value.concord_roll_protection_state;
  const concordRollProtectionState = rawConcordRollProtectionState === void 0 ? resolveInitialConcordRollProtectionState(getConcordCollectedSlots(techCollectionByIsland)) : sanitizeConcordRollProtectionState(rawConcordRollProtectionState);
  return {
    runtimeVersion: typeof value.runtimeVersion === "number" && Number.isFinite(value.runtimeVersion) ? Math.max(0, Math.floor(value.runtimeVersion)) : fallback.runtimeVersion,
    firstRunClaimed: typeof value.firstRunClaimed === "boolean" ? value.firstRunClaimed : fallback.firstRunClaimed,
    firstSessionTutorialState: sanitizeIslandRunFirstSessionTutorialState(
      value.firstSessionTutorialState,
      fallback.firstSessionTutorialState
    ),
    dailyHeartsClaimedDayKey: typeof value.dailyHeartsClaimedDayKey === "string" || value.dailyHeartsClaimedDayKey === null ? value.dailyHeartsClaimedDayKey : fallback.dailyHeartsClaimedDayKey,
    onboardingDisplayNameLoopCompleted: typeof value.onboardingDisplayNameLoopCompleted === "boolean" ? value.onboardingDisplayNameLoopCompleted : fallback.onboardingDisplayNameLoopCompleted,
    welcomePackClaimed: typeof value.welcomePackClaimed === "boolean" ? value.welcomePackClaimed : fallback.welcomePackClaimed,
    welcomePackRewardBundleClaimed: typeof value.welcomePackRewardBundleClaimed === "boolean" ? value.welcomePackRewardBundleClaimed : fallback.welcomePackRewardBundleClaimed,
    storyPrologueSeen: typeof value.storyPrologueSeen === "boolean" ? value.storyPrologueSeen : fallback.storyPrologueSeen,
    narrativeSeenState: value.narrativeSeenState !== null && typeof value.narrativeSeenState === "object" && !Array.isArray(value.narrativeSeenState) ? sanitizeIslandNarrativeSeenState(value.narrativeSeenState) : fallback.narrativeSeenState,
    audioEnabled: typeof value.audioEnabled === "boolean" ? value.audioEnabled : fallback.audioEnabled,
    musicEnabled: typeof value.musicEnabled === "boolean" ? value.musicEnabled : typeof value.audioEnabled === "boolean" ? value.audioEnabled : fallback.musicEnabled,
    sfxEnabled: typeof value.sfxEnabled === "boolean" ? value.sfxEnabled : typeof value.audioEnabled === "boolean" ? value.audioEnabled : fallback.sfxEnabled,
    currentIslandNumber: typeof value.currentIslandNumber === "number" && Number.isFinite(value.currentIslandNumber) ? Math.max(1, Math.floor(value.currentIslandNumber)) : fallback.currentIslandNumber,
    cycleIndex: typeof value.cycleIndex === "number" && Number.isFinite(value.cycleIndex) ? Math.max(0, Math.floor(value.cycleIndex)) : fallback.cycleIndex,
    bossTrialResolvedIslandNumber: typeof value.bossTrialResolvedIslandNumber === "number" && Number.isFinite(value.bossTrialResolvedIslandNumber) ? Math.max(1, Math.floor(value.bossTrialResolvedIslandNumber)) : value.bossTrialResolvedIslandNumber === null ? null : fallback.bossTrialResolvedIslandNumber,
    activeEggTier,
    activeEggSetAtMs: typeof value.activeEggSetAtMs === "number" && Number.isFinite(value.activeEggSetAtMs) ? value.activeEggSetAtMs : value.activeEggSetAtMs === null ? null : fallback.activeEggSetAtMs,
    activeEggHatchDurationMs: typeof value.activeEggHatchDurationMs === "number" && Number.isFinite(value.activeEggHatchDurationMs) ? value.activeEggHatchDurationMs : value.activeEggHatchDurationMs === null ? null : fallback.activeEggHatchDurationMs,
    activeEggIsDormant: typeof value.activeEggIsDormant === "boolean" ? value.activeEggIsDormant : fallback.activeEggIsDormant,
    perIslandEggs: value.perIslandEggs !== null && typeof value.perIslandEggs === "object" && !Array.isArray(value.perIslandEggs) ? value.perIslandEggs : fallback.perIslandEggs,
    eggRewardInventory: sanitizeEggRewardInventory(
      value.eggRewardInventory,
      fallback.eggRewardInventory
    ),
    islandStartedAtMs: typeof value.islandStartedAtMs === "number" && Number.isFinite(value.islandStartedAtMs) ? value.islandStartedAtMs : fallback.islandStartedAtMs,
    islandExpiresAtMs: typeof value.islandExpiresAtMs === "number" && Number.isFinite(value.islandExpiresAtMs) ? value.islandExpiresAtMs : fallback.islandExpiresAtMs,
    islandShards: typeof value.islandShards === "number" && Number.isFinite(value.islandShards) ? Math.max(0, Math.floor(value.islandShards)) : fallback.islandShards,
    tokenIndex: typeof value.tokenIndex === "number" && Number.isFinite(value.tokenIndex) ? Math.max(0, Math.floor(value.tokenIndex)) : fallback.tokenIndex,
    spinTokens: typeof value.spinTokens === "number" && Number.isFinite(value.spinTokens) ? Math.max(0, Math.floor(value.spinTokens)) : fallback.spinTokens,
    dicePool: typeof value.dicePool === "number" && Number.isFinite(value.dicePool) ? Math.max(0, Math.floor(value.dicePool)) : fallback.dicePool,
    bonusMaxDice: typeof value.bonusMaxDice === "number" && Number.isFinite(value.bonusMaxDice) ? Math.max(0, Math.floor(value.bonusMaxDice)) : fallback.bonusMaxDice,
    shardTierIndex: typeof value.shardTierIndex === "number" && Number.isFinite(value.shardTierIndex) ? Math.max(0, Math.floor(value.shardTierIndex)) : fallback.shardTierIndex,
    shardClaimCount: typeof value.shardClaimCount === "number" && Number.isFinite(value.shardClaimCount) ? Math.max(0, Math.floor(value.shardClaimCount)) : fallback.shardClaimCount,
    shields: typeof value.shields === "number" && Number.isFinite(value.shields) ? Math.max(0, Math.floor(value.shields)) : fallback.shields,
    shards: typeof value.shards === "number" && Number.isFinite(value.shards) ? Math.max(0, Math.floor(value.shards)) : fallback.shards,
    diamonds: typeof value.diamonds === "number" && Number.isFinite(value.diamonds) ? Math.max(0, Math.floor(value.diamonds)) : fallback.diamonds,
    creatureTreatInventory: value.creatureTreatInventory !== null && typeof value.creatureTreatInventory === "object" && !Array.isArray(value.creatureTreatInventory) ? {
      basic: typeof value.creatureTreatInventory.basic === "number" && Number.isFinite(value.creatureTreatInventory.basic) ? Math.max(0, Math.floor(value.creatureTreatInventory.basic)) : fallback.creatureTreatInventory.basic,
      favorite: typeof value.creatureTreatInventory.favorite === "number" && Number.isFinite(value.creatureTreatInventory.favorite) ? Math.max(0, Math.floor(value.creatureTreatInventory.favorite)) : fallback.creatureTreatInventory.favorite,
      rare: typeof value.creatureTreatInventory.rare === "number" && Number.isFinite(value.creatureTreatInventory.rare) ? Math.max(0, Math.floor(value.creatureTreatInventory.rare)) : fallback.creatureTreatInventory.rare
    } : fallback.creatureTreatInventory,
    companionBonusLastVisitKey: typeof value.companionBonusLastVisitKey === "string" || value.companionBonusLastVisitKey === null ? value.companionBonusLastVisitKey : fallback.companionBonusLastVisitKey,
    completedStopsByIsland: value.completedStopsByIsland !== null && typeof value.completedStopsByIsland === "object" && !Array.isArray(value.completedStopsByIsland) ? Object.fromEntries(
      Object.entries(value.completedStopsByIsland).map(([islandKey, stops]) => [
        islandKey,
        Array.isArray(stops) ? stops.filter((stop) => typeof stop === "string") : []
      ])
    ) : fallback.completedStopsByIsland,
    vaultRushClaimsByIsland: sanitizeVaultRushClaimsByIsland(
      value.vaultRushClaimsByIsland ?? value.vault_rush_claims_by_island
    ),
    vaultIslandProgress: sanitizeVaultIslandProgress(
      value.vaultIslandProgress ?? value.vault_island_progress
    ),
    stopTicketsPaidByIsland: value.stopTicketsPaidByIsland !== null && typeof value.stopTicketsPaidByIsland === "object" && !Array.isArray(value.stopTicketsPaidByIsland) ? sanitizeStopTicketsPaidByIsland(value.stopTicketsPaidByIsland) : fallback.stopTicketsPaidByIsland,
    bonusTileChargeByIsland: value.bonusTileChargeByIsland !== null && typeof value.bonusTileChargeByIsland === "object" && !Array.isArray(value.bonusTileChargeByIsland) ? sanitizeBonusTileChargeByIsland(value.bonusTileChargeByIsland) : fallback.bonusTileChargeByIsland,
    techCollectionByIsland,
    concordRollProtectionState,
    techCollectionRewardedLinesByIsland: value.techCollectionRewardedLinesByIsland !== null && typeof value.techCollectionRewardedLinesByIsland === "object" && !Array.isArray(value.techCollectionRewardedLinesByIsland) ? sanitizeIslandIndexLedger(value.techCollectionRewardedLinesByIsland, TECH_COLLECTION_LINE_COUNT) : fallback.techCollectionRewardedLinesByIsland,
    technologyUnlocksById: sanitizeTechnologyUnlocksById(
      value.technologyUnlocksById ?? value.technology_unlocks_by_id,
      fallback.technologyUnlocksById,
      value
    ),
    signatureMissionProgressByIsland: sanitizeIslandRunSignatureMissionProgress(
      value.signatureMissionProgressByIsland ?? value.signature_mission_progress_by_island
    ),
    marketOwnedBundlesByIsland: value.marketOwnedBundlesByIsland !== null && typeof value.marketOwnedBundlesByIsland === "object" && !Array.isArray(value.marketOwnedBundlesByIsland) ? Object.fromEntries(
      Object.entries(value.marketOwnedBundlesByIsland).map(([islandKey, bundles]) => [
        islandKey,
        bundles !== null && typeof bundles === "object" && !Array.isArray(bundles) ? {
          dice_bundle: Boolean(bundles.dice_bundle),
          heart_bundle: Boolean(bundles.heart_bundle),
          heart_boost_bundle: Boolean(bundles.heart_boost_bundle)
        } : {
          dice_bundle: false,
          heart_bundle: false,
          heart_boost_bundle: false
        }
      ])
    ) : fallback.marketOwnedBundlesByIsland,
    creatureCollection: Array.isArray(value.creatureCollection) ? value.creatureCollection.map((entry) => toCreatureCollectionEntry(entry)).filter((entry) => entry !== null) : fallback.creatureCollection,
    activeCompanionId: typeof value.activeCompanionId === "string" || value.activeCompanionId === null ? value.activeCompanionId : fallback.activeCompanionId,
    selectedPlayerPieceId: typeof value.selectedPlayerPieceId === "string" || value.selectedPlayerPieceId === null ? value.selectedPlayerPieceId : fallback.selectedPlayerPieceId,
    perfectCompanionIds: Array.isArray(value.perfectCompanionIds) ? value.perfectCompanionIds.filter((id2) => typeof id2 === "string" && id2.trim().length > 0) : fallback.perfectCompanionIds,
    perfectCompanionReasons: value.perfectCompanionReasons !== null && typeof value.perfectCompanionReasons === "object" && !Array.isArray(value.perfectCompanionReasons) ? Object.fromEntries(
      Object.entries(value.perfectCompanionReasons).map(([creatureId, reason]) => [
        creatureId,
        reason !== null && typeof reason === "object" && !Array.isArray(reason) ? {
          strength: Array.isArray(reason.strength) ? reason.strength.filter((item) => typeof item === "string" && item.trim().length > 0) : [],
          weaknessSupport: Array.isArray(reason.weaknessSupport) ? reason.weaknessSupport.filter((item) => typeof item === "string" && item.trim().length > 0) : [],
          zoneMatch: Boolean(reason.zoneMatch)
        } : {
          strength: [],
          weaknessSupport: [],
          zoneMatch: false
        }
      ])
    ) : fallback.perfectCompanionReasons,
    perfectCompanionComputedAtMs: typeof value.perfectCompanionComputedAtMs === "number" && Number.isFinite(value.perfectCompanionComputedAtMs) ? value.perfectCompanionComputedAtMs : value.perfectCompanionComputedAtMs === null ? null : fallback.perfectCompanionComputedAtMs,
    perfectCompanionModelVersion: typeof value.perfectCompanionModelVersion === "string" || value.perfectCompanionModelVersion === null ? value.perfectCompanionModelVersion : fallback.perfectCompanionModelVersion,
    perfectCompanionComputedCycleIndex: typeof value.perfectCompanionComputedCycleIndex === "number" && Number.isFinite(value.perfectCompanionComputedCycleIndex) ? Math.max(0, Math.floor(value.perfectCompanionComputedCycleIndex)) : value.perfectCompanionComputedCycleIndex === null ? null : fallback.perfectCompanionComputedCycleIndex,
    activeStopIndex: normalizedActiveStopIndex,
    activeStopType: value.activeStopType === "hatchery" || value.activeStopType === "habit" || value.activeStopType === "mystery" || value.activeStopType === "wisdom" || value.activeStopType === "boss" ? value.activeStopType : deriveIslandRunContractV2StopType(normalizedActiveStopIndex),
    stopStatesByIndex,
    stopBuildStateByIndex,
    bossState: value.bossState !== null && typeof value.bossState === "object" && !Array.isArray(value.bossState) ? {
      unlocked: Boolean(value.bossState.unlocked),
      objectiveComplete: Boolean(value.bossState.objectiveComplete),
      buildComplete: Boolean(value.bossState.buildComplete),
      ...typeof value.bossState.completedAtMs === "number" && Number.isFinite(value.bossState.completedAtMs) ? { completedAtMs: value.bossState.completedAtMs } : {},
      arenaBattle: sanitizeIslandRunArenaBattleState(value.bossState.arenaBattle)
    } : fallback.bossState,
    essence: typeof value.essence === "number" && Number.isFinite(value.essence) ? Math.max(0, Math.floor(value.essence)) : fallback.essence,
    essenceLifetimeEarned: typeof value.essenceLifetimeEarned === "number" && Number.isFinite(value.essenceLifetimeEarned) ? Math.max(0, Math.floor(value.essenceLifetimeEarned)) : fallback.essenceLifetimeEarned,
    essenceLifetimeSpent: typeof value.essenceLifetimeSpent === "number" && Number.isFinite(value.essenceLifetimeSpent) ? Math.max(0, Math.floor(value.essenceLifetimeSpent)) : fallback.essenceLifetimeSpent,
    diceRegenState: value.diceRegenState !== null && typeof value.diceRegenState === "object" && !Array.isArray(value.diceRegenState) && typeof value.diceRegenState.maxDice === "number" && Number.isFinite(value.diceRegenState.maxDice) && typeof value.diceRegenState.regenRatePerHour === "number" && Number.isFinite(value.diceRegenState.regenRatePerHour) && typeof value.diceRegenState.lastRegenAtMs === "number" && Number.isFinite(value.diceRegenState.lastRegenAtMs) ? {
      maxDice: Math.max(0, Math.floor(value.diceRegenState.maxDice)),
      regenRatePerHour: Math.max(0, value.diceRegenState.regenRatePerHour),
      lastRegenAtMs: value.diceRegenState.lastRegenAtMs
    } : value.diceRegenState === null ? null : fallback.diceRegenState,
    rewardBarProgress: typeof value.rewardBarProgress === "number" && Number.isFinite(value.rewardBarProgress) ? Math.max(0, Math.floor(value.rewardBarProgress)) : fallback.rewardBarProgress,
    rewardBarThreshold: typeof value.rewardBarThreshold === "number" && Number.isFinite(value.rewardBarThreshold) ? Math.max(1, Math.floor(value.rewardBarThreshold)) : fallback.rewardBarThreshold,
    rewardBarClaimCountInEvent: typeof value.rewardBarClaimCountInEvent === "number" && Number.isFinite(value.rewardBarClaimCountInEvent) ? Math.max(0, Math.floor(value.rewardBarClaimCountInEvent)) : fallback.rewardBarClaimCountInEvent,
    rewardBarEscalationTier: typeof value.rewardBarEscalationTier === "number" && Number.isFinite(value.rewardBarEscalationTier) ? Math.max(0, Math.floor(value.rewardBarEscalationTier)) : fallback.rewardBarEscalationTier,
    rewardBarLastClaimAtMs: typeof value.rewardBarLastClaimAtMs === "number" && Number.isFinite(value.rewardBarLastClaimAtMs) ? value.rewardBarLastClaimAtMs : value.rewardBarLastClaimAtMs === null ? null : fallback.rewardBarLastClaimAtMs,
    rewardBarBoundEventId: typeof value.rewardBarBoundEventId === "string" || value.rewardBarBoundEventId === null ? value.rewardBarBoundEventId : fallback.rewardBarBoundEventId,
    rewardBarLadderId: typeof value.rewardBarLadderId === "string" ? value.rewardBarLadderId : value.rewardBarLadderId === null ? null : fallback.rewardBarLadderId,
    activeTimedEvent: value.activeTimedEvent !== null && typeof value.activeTimedEvent === "object" && !Array.isArray(value.activeTimedEvent) && typeof value.activeTimedEvent.eventId === "string" && typeof value.activeTimedEvent.eventType === "string" && typeof value.activeTimedEvent.startedAtMs === "number" && Number.isFinite(value.activeTimedEvent.startedAtMs) && typeof value.activeTimedEvent.expiresAtMs === "number" && Number.isFinite(value.activeTimedEvent.expiresAtMs) && typeof value.activeTimedEvent.version === "number" && Number.isFinite(value.activeTimedEvent.version) ? {
      eventId: value.activeTimedEvent.eventId,
      eventType: value.activeTimedEvent.eventType,
      startedAtMs: value.activeTimedEvent.startedAtMs,
      expiresAtMs: value.activeTimedEvent.expiresAtMs,
      version: Math.max(0, Math.floor(value.activeTimedEvent.version))
    } : value.activeTimedEvent === null ? null : fallback.activeTimedEvent,
    activeTimedEventProgress: value.activeTimedEventProgress !== null && typeof value.activeTimedEventProgress === "object" && !Array.isArray(value.activeTimedEventProgress) ? {
      feedingActions: typeof value.activeTimedEventProgress.feedingActions === "number" && Number.isFinite(value.activeTimedEventProgress.feedingActions) ? Math.max(0, Math.floor(value.activeTimedEventProgress.feedingActions)) : fallback.activeTimedEventProgress.feedingActions,
      tokensEarned: typeof value.activeTimedEventProgress.tokensEarned === "number" && Number.isFinite(value.activeTimedEventProgress.tokensEarned) ? Math.max(0, Math.floor(value.activeTimedEventProgress.tokensEarned)) : fallback.activeTimedEventProgress.tokensEarned,
      milestonesClaimed: typeof value.activeTimedEventProgress.milestonesClaimed === "number" && Number.isFinite(value.activeTimedEventProgress.milestonesClaimed) ? Math.max(0, Math.floor(value.activeTimedEventProgress.milestonesClaimed)) : fallback.activeTimedEventProgress.milestonesClaimed
    } : fallback.activeTimedEventProgress,
    stickerProgress: value.stickerProgress !== null && typeof value.stickerProgress === "object" && !Array.isArray(value.stickerProgress) ? {
      fragments: typeof value.stickerProgress.fragments === "number" && Number.isFinite(value.stickerProgress.fragments) ? Math.max(0, Math.floor(value.stickerProgress.fragments)) : fallback.stickerProgress.fragments,
      ...typeof value.stickerProgress.guaranteedAt === "number" && Number.isFinite(value.stickerProgress.guaranteedAt) ? { guaranteedAt: Math.max(0, Math.floor(value.stickerProgress.guaranteedAt)) } : {},
      ...typeof value.stickerProgress.pityCounter === "number" && Number.isFinite(value.stickerProgress.pityCounter) ? { pityCounter: Math.max(0, Math.floor(value.stickerProgress.pityCounter)) } : {}
    } : fallback.stickerProgress,
    stickerInventory: value.stickerInventory !== null && typeof value.stickerInventory === "object" && !Array.isArray(value.stickerInventory) ? Object.fromEntries(
      Object.entries(value.stickerInventory).filter(([key, count]) => typeof key === "string" && typeof count === "number" && Number.isFinite(count)).map(([key, count]) => [key, Math.max(0, Math.floor(count))])
    ) : fallback.stickerInventory,
    lastEssenceDriftLost: typeof value.lastEssenceDriftLost === "number" && Number.isFinite(value.lastEssenceDriftLost) ? Math.max(0, Math.floor(value.lastEssenceDriftLost)) : fallback.lastEssenceDriftLost,
    minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(
      value.minigameTicketsByEvent,
      fallback.minigameTicketsByEvent
    ),
    arenaFirstTicketBoostClaimedByEvent: sanitizeBooleanRecord(
      value.arenaFirstTicketBoostClaimedByEvent,
      fallback.arenaFirstTicketBoostClaimedByEvent
    ),
    luckyRollSessionsByMilestone: sanitizeIslandRunLuckyRollSessionsByMilestone(
      value.luckyRollSessionsByMilestone,
      fallback.luckyRollSessionsByMilestone
    ),
    spaceExcavatorProgressByEvent: sanitizeSpaceExcavatorProgressByEvent(
      value.spaceExcavatorProgressByEvent,
      fallback.spaceExcavatorProgressByEvent
    ),
    companionFeastProgressByEvent: sanitizeCompanionFeastProgressByEvent(
      value.companionFeastProgressByEvent,
      fallback.companionFeastProgressByEvent
    ),
    fortuneEngineProgressByEvent: sanitizeFortuneEngineProgressByEvent(
      value.fortuneEngineProgressByEvent,
      fallback.fortuneEngineProgressByEvent
    ),
    skyboundAcademyProgressByEvent: sanitizeSkyboundAcademyProgressByEvent(
      value.skyboundAcademyProgressByEvent,
      fallback.skyboundAcademyProgressByEvent
    ),
    journeyDiscArenaProgressByEvent: sanitizeJourneyDiscArenaProgressByEvent(
      value.journeyDiscArenaProgressByEvent,
      fallback.journeyDiscArenaProgressByEvent
    ),
    journeyDiscArmory: sanitizeJourneyDiscArmory(
      value.journeyDiscArmory,
      fallback.journeyDiscArmory
    ),
    crystalMinersProgressByEvent: sanitizeCrystalMinersProgressByEvent(value.crystalMinersProgressByEvent, fallback.crystalMinersProgressByEvent),
    momentumMatrixProgressByEvent: sanitizeMomentumMatrixProgressByEvent(
      value.momentumMatrixProgressByEvent,
      fallback.momentumMatrixProgressByEvent
    )
  };
}
function sanitizeMinigameTicketsByEvent(value, fallback) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }
  const result = {};
  for (const [eventId2, rawCount] of Object.entries(value)) {
    if (typeof rawCount !== "number" || !Number.isFinite(rawCount)) continue;
    const count = Math.max(0, Math.floor(rawCount));
    if (count > 0) {
      result[eventId2] = count;
    }
  }
  return result;
}
function sanitizeBooleanRecord(value, fallback) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }
  const result = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof key === "string" && key.trim() && rawValue === true) {
      result[key] = true;
    }
  }
  return result;
}
var LUCKY_ROLL_SESSION_STATUSES = /* @__PURE__ */ new Set(["active", "completed", "banked", "expired"]);
var LUCKY_ROLL_REWARD_TYPES = /* @__PURE__ */ new Set(["dice", "essence", "shards", "egg", "diamonds", "sticker", "minigame_ticket", "gold", "game_tokens", "unknown"]);
function sanitizeLuckyRollRewardEntries(value) {
  if (!Array.isArray(value)) return [];
  const rewards = [];
  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const entry = rawEntry;
    if (typeof entry.rewardId !== "string" || entry.rewardId.trim().length === 0) continue;
    if (typeof entry.tileId !== "number" || !Number.isFinite(entry.tileId)) continue;
    if (typeof entry.amount !== "number" || !Number.isFinite(entry.amount)) continue;
    const rewardType = typeof entry.rewardType === "string" && LUCKY_ROLL_REWARD_TYPES.has(entry.rewardType) ? entry.rewardType : "unknown";
    const metadata = entry.metadata !== null && typeof entry.metadata === "object" && !Array.isArray(entry.metadata) ? entry.metadata : void 0;
    rewards.push({
      rewardId: entry.rewardId.trim(),
      tileId: Math.max(0, Math.floor(entry.tileId)),
      rewardType,
      amount: Math.max(0, Math.floor(entry.amount)),
      ...typeof entry.eventId === "string" && entry.eventId.trim().length > 0 ? { eventId: entry.eventId.trim() } : {},
      ...metadata ? { metadata } : {}
    });
  }
  return rewards;
}
function sanitizeClaimedTileIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((tileId) => typeof tileId === "number" && Number.isFinite(tileId)).map((tileId) => Math.max(0, Math.floor(tileId)))
  )).sort((a, b) => a - b);
}
function sanitizeIslandRunLuckyRollSessionsByMilestone(value, fallback = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }
  const result = {};
  for (const rawSession of Object.values(value)) {
    if (!rawSession || typeof rawSession !== "object" || Array.isArray(rawSession)) continue;
    const session2 = rawSession;
    if (typeof session2.runId !== "string" || session2.runId.trim().length === 0) continue;
    if (typeof session2.targetIslandNumber !== "number" || !Number.isFinite(session2.targetIslandNumber)) continue;
    if (typeof session2.cycleIndex !== "number" || !Number.isFinite(session2.cycleIndex)) continue;
    const targetIslandNumber = Math.max(1, Math.floor(session2.targetIslandNumber));
    const cycleIndex = Math.max(0, Math.floor(session2.cycleIndex));
    const key = getIslandRunLuckyRollSessionKey(cycleIndex, targetIslandNumber);
    const status = typeof session2.status === "string" && LUCKY_ROLL_SESSION_STATUSES.has(session2.status) ? session2.status : "active";
    const startedAtMs = typeof session2.startedAtMs === "number" && Number.isFinite(session2.startedAtMs) ? Math.max(0, Math.floor(session2.startedAtMs)) : 0;
    const updatedAtMs = typeof session2.updatedAtMs === "number" && Number.isFinite(session2.updatedAtMs) ? Math.max(0, Math.floor(session2.updatedAtMs)) : startedAtMs;
    const sanitized = {
      status,
      runId: session2.runId.trim(),
      targetIslandNumber,
      cycleIndex,
      position: typeof session2.position === "number" && Number.isFinite(session2.position) ? Math.max(0, Math.floor(session2.position)) : 0,
      rollsUsed: typeof session2.rollsUsed === "number" && Number.isFinite(session2.rollsUsed) ? Math.max(0, Math.floor(session2.rollsUsed)) : 0,
      claimedTileIds: sanitizeClaimedTileIds(session2.claimedTileIds),
      pendingRewards: sanitizeLuckyRollRewardEntries(session2.pendingRewards),
      bankedRewards: sanitizeLuckyRollRewardEntries(session2.bankedRewards),
      startedAtMs,
      bankedAtMs: typeof session2.bankedAtMs === "number" && Number.isFinite(session2.bankedAtMs) ? Math.max(0, Math.floor(session2.bankedAtMs)) : null,
      updatedAtMs
    };
    const existing = result[key];
    if (!existing || sanitized.updatedAtMs >= existing.updatedAtMs) {
      result[key] = sanitized;
    }
  }
  return result;
}
function mergeLuckyRollSessionsByMilestone(remote, local) {
  const merged = { ...remote };
  for (const [key, localSession] of Object.entries(local)) {
    const remoteSession = merged[key];
    if (!remoteSession || localSession.updatedAtMs > remoteSession.updatedAtMs) {
      merged[key] = localSession;
    }
  }
  return merged;
}
function sanitizeSpaceExcavatorTileIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((n) => Number.isFinite(n)).map((n) => Math.max(0, Math.floor(n))))).sort((a, b) => a - b);
}
function sanitizeSpaceExcavatorClaimedMilestoneIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id2) => typeof id2 === "string" && id2.trim().length > 0)));
}
function sanitizeSpaceExcavatorProgressByEvent(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };
  const out = {};
  for (const [eventId2, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    if (!Array.isArray(raw.treasureTileIds) || !Array.isArray(raw.dugTileIds) || !Array.isArray(raw.foundTreasureTileIds)) continue;
    const treasureTileIds = sanitizeSpaceExcavatorTileIds(raw.treasureTileIds);
    const dugTileIds = sanitizeSpaceExcavatorTileIds(raw.dugTileIds);
    const foundTreasureTileIds = sanitizeSpaceExcavatorTileIds(raw.foundTreasureTileIds);
    const objectTileIds = sanitizeSpaceExcavatorTileIds(raw.objectTileIds).length > 0 ? sanitizeSpaceExcavatorTileIds(raw.objectTileIds) : treasureTileIds;
    const bonusBombTileIds = sanitizeSpaceExcavatorTileIds(raw.bonusBombTileIds).filter((tileId) => tileId < Math.max(1, Math.floor(raw.boardSize ?? 5)) ** 2);
    const hardTileIds = sanitizeSpaceExcavatorTileIds(raw.hardTileIds).filter((tileId) => tileId < Math.max(1, Math.floor(raw.boardSize ?? 5)) ** 2).filter((tileId) => !objectTileIds.includes(tileId) && !bonusBombTileIds.includes(tileId));
    const hardTileSet = new Set(hardTileIds);
    const rawHardHitByTileId = raw.hardTileHitCountByTileId && typeof raw.hardTileHitCountByTileId === "object" && !Array.isArray(raw.hardTileHitCountByTileId) ? raw.hardTileHitCountByTileId : {};
    const hardTileHitCountByTileId = Object.entries(rawHardHitByTileId).reduce((acc, [tileIdKey, rawHitCount]) => {
      const tileId = Math.max(0, Math.floor(Number(tileIdKey)));
      if (!hardTileSet.has(tileId)) return acc;
      const parsed = Number.isFinite(rawHitCount) ? Math.max(0, Math.min(2, Math.floor(rawHitCount))) : 0;
      if (parsed > 0) acc[tileId] = parsed;
      return acc;
    }, {});
    const crackedTileIds = sanitizeSpaceExcavatorTileIds(raw.crackedTileIds).filter((tileId) => hardTileSet.has(tileId)).filter((tileId) => (hardTileHitCountByTileId[tileId] ?? 0) > 0 && (hardTileHitCountByTileId[tileId] ?? 0) < 2);
    const bonusBombTileIdSet = new Set(bonusBombTileIds);
    const objectTileIdSet = new Set(objectTileIds);
    const triggeredBonusBombTileIds = sanitizeSpaceExcavatorTileIds(raw.triggeredBonusBombTileIds).filter((tileId) => bonusBombTileIdSet.has(tileId));
    const revealedObjectTileIds = sanitizeSpaceExcavatorTileIds(raw.revealedObjectTileIds).length > 0 ? sanitizeSpaceExcavatorTileIds(raw.revealedObjectTileIds) : dugTileIds.filter((tileId) => objectTileIdSet.has(tileId));
    const completedBoardCount = Math.max(0, Math.floor(raw.completedBoardCount ?? 0));
    const eventProgressPoints = Math.max(0, Math.floor(raw.eventProgressPoints ?? completedBoardCount));
    const claimedMilestoneIds = resolveSpaceExcavatorClaimedMilestoneIds({
      eventProgressPoints,
      claimedMilestoneIds: sanitizeSpaceExcavatorClaimedMilestoneIds(raw.claimedMilestoneIds)
    });
    out[eventId2] = {
      eventId: eventId2,
      boardIndex: Math.max(0, Math.floor(raw.boardIndex ?? 0)),
      boardSize: Math.max(1, Math.floor(raw.boardSize ?? 5)),
      treasureCount: Math.max(0, Math.floor(raw.treasureCount ?? objectTileIds.length)),
      treasureTileIds,
      objectId: typeof raw.objectId === "string" && raw.objectId ? raw.objectId : "legacy_relic",
      objectName: typeof raw.objectName === "string" && raw.objectName ? raw.objectName : "Hidden Relic",
      objectTier: typeof raw.objectTier === "string" ? raw.objectTier : void 0,
      objectIcon: typeof raw.objectIcon === "string" ? raw.objectIcon : void 0,
      objectTileIds,
      bonusBombTileIds,
      hardTileIds,
      crackedTileIds,
      hardTileHitCountByTileId,
      triggeredBonusBombTileIds,
      revealedObjectTileIds,
      dugTileIds,
      foundTreasureTileIds,
      completedBoardCount,
      eventProgressPoints,
      claimedMilestoneIds,
      status: raw.status === "completed" ? "completed" : raw.status === "board_complete" || raw.status === "won" ? "board_complete" : "active",
      updatedAtMs: Number.isFinite(raw.updatedAtMs) ? Math.max(0, Math.floor(raw.updatedAtMs)) : Date.now()
    };
  }
  return out;
}
function mergeSpaceExcavatorProgressByEvent(remote, local) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(remote), ...Object.keys(local)]);
  const merged = {};
  keys.forEach((eventId2) => {
    const remoteProgress = remote[eventId2];
    const localProgress = local[eventId2];
    if (!remoteProgress || !localProgress) {
      merged[eventId2] = localProgress ?? remoteProgress;
      return;
    }
    const base = localProgress.updatedAtMs >= remoteProgress.updatedAtMs ? localProgress : remoteProgress;
    const eventProgressPoints = Math.max(remoteProgress.eventProgressPoints, localProgress.eventProgressPoints);
    merged[eventId2] = {
      ...base,
      triggeredBonusBombTileIds: Array.from(/* @__PURE__ */ new Set([
        ...remoteProgress.triggeredBonusBombTileIds,
        ...localProgress.triggeredBonusBombTileIds
      ])).sort((a, b) => a - b),
      completedBoardCount: Math.max(remoteProgress.completedBoardCount, localProgress.completedBoardCount),
      eventProgressPoints,
      claimedMilestoneIds: resolveSpaceExcavatorClaimedMilestoneIds({
        eventProgressPoints,
        claimedMilestoneIds: [...remoteProgress.claimedMilestoneIds, ...localProgress.claimedMilestoneIds]
      })
    };
  });
  return merged;
}
function sanitizeCompanionFeastProgressByEvent(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const out = {};
  for (const [eventId2, rawValue] of Object.entries(value)) {
    if (!eventId2.trim() || !rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) continue;
    const raw = rawValue;
    const toCount = (input) => typeof input === "number" && Number.isFinite(input) ? Math.max(0, Math.floor(input)) : 0;
    out[eventId2] = {
      levelIndex: toCount(raw.levelIndex),
      feastPoints: toCount(raw.feastPoints),
      highestTierReached: toCount(raw.highestTierReached),
      bestScore: toCount(raw.bestScore),
      cumulativeScore: toCount(raw.cumulativeScore),
      totalFruitDropped: toCount(raw.totalFruitDropped),
      claimedMilestoneIds: resolveCompanionFeastClaimedMilestoneIds({
        claimedMilestoneIds: Array.isArray(raw.claimedMilestoneIds) ? raw.claimedMilestoneIds.filter((id2) => typeof id2 === "string") : []
      }),
      updatedAtMs: typeof raw.updatedAtMs === "number" && Number.isFinite(raw.updatedAtMs) ? Math.max(0, Math.floor(raw.updatedAtMs)) : Date.now()
    };
  }
  return out;
}
function mergeCompanionFeastProgressByEvent(remote, local) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(remote), ...Object.keys(local)]);
  const merged = {};
  keys.forEach((eventId2) => {
    const remoteProgress = remote[eventId2];
    const localProgress = local[eventId2];
    if (!remoteProgress || !localProgress) {
      merged[eventId2] = localProgress ?? remoteProgress;
      return;
    }
    const base = localProgress.updatedAtMs >= remoteProgress.updatedAtMs ? localProgress : remoteProgress;
    merged[eventId2] = {
      ...base,
      levelIndex: Math.max(remoteProgress.levelIndex, localProgress.levelIndex),
      feastPoints: Math.max(remoteProgress.feastPoints, localProgress.feastPoints),
      highestTierReached: Math.max(remoteProgress.highestTierReached, localProgress.highestTierReached),
      bestScore: Math.max(remoteProgress.bestScore, localProgress.bestScore),
      cumulativeScore: Math.max(remoteProgress.cumulativeScore ?? 0, localProgress.cumulativeScore ?? 0),
      totalFruitDropped: Math.max(remoteProgress.totalFruitDropped, localProgress.totalFruitDropped),
      claimedMilestoneIds: resolveCompanionFeastClaimedMilestoneIds({
        claimedMilestoneIds: [...remoteProgress.claimedMilestoneIds, ...localProgress.claimedMilestoneIds]
      })
    };
  });
  return merged;
}
var MOMENTUM_MATRIX_ROUTE_KINDS = ["focus", "growth", "care", "beacon"];
var MOMENTUM_MATRIX_MISSION_DIRECTIONS = ["focus", "energy", "reset"];
function sanitizeMomentumMatrixCount(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
function sanitizeMomentumMatrixRun(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value;
  if (typeof raw.runId !== "string" || !raw.runId.trim()) return null;
  if (!Array.isArray(raw.board) || raw.board.length !== MOMENTUM_MATRIX_CELL_COUNT) return null;
  if (!Array.isArray(raw.tray) || raw.tray.length !== 3) return null;
  const board = raw.board.map((cell) => cell === null || typeof cell === "string" && MOMENTUM_MATRIX_ROUTE_KINDS.includes(cell) ? cell : null);
  const tray = raw.tray.map((piece) => {
    if (piece === null) return null;
    if (!piece || typeof piece !== "object" || Array.isArray(piece)) return null;
    const candidate = piece;
    if (typeof candidate.pieceId !== "string" || typeof candidate.shapeId !== "string" || !getMomentumMatrixShape(candidate.shapeId) || typeof candidate.routeKind !== "string" || !MOMENTUM_MATRIX_ROUTE_KINDS.includes(candidate.routeKind)) {
      return null;
    }
    return {
      pieceId: candidate.pieceId,
      shapeId: candidate.shapeId,
      routeKind: candidate.routeKind
    };
  });
  const missionDirection = typeof raw.missionDirection === "string" && MOMENTUM_MATRIX_MISSION_DIRECTIONS.includes(raw.missionDirection) ? raw.missionDirection : "focus";
  const beaconIndex = Math.min(
    MOMENTUM_MATRIX_CELL_COUNT - 1,
    sanitizeMomentumMatrixCount(raw.beaconIndex)
  );
  return {
    version: 1,
    runId: raw.runId,
    board,
    tray,
    rngState: Math.max(1, sanitizeMomentumMatrixCount(raw.rngState)),
    score: sanitizeMomentumMatrixCount(raw.score),
    combo: sanitizeMomentumMatrixCount(raw.combo),
    bestCombo: sanitizeMomentumMatrixCount(raw.bestCombo),
    corridorsStabilized: sanitizeMomentumMatrixCount(raw.corridorsStabilized),
    beaconsAligned: sanitizeMomentumMatrixCount(raw.beaconsAligned),
    beaconIndex,
    missionDirection,
    status: raw.status === "game_over" ? "game_over" : "active",
    startedAtMs: sanitizeMomentumMatrixCount(raw.startedAtMs),
    updatedAtMs: sanitizeMomentumMatrixCount(raw.updatedAtMs)
  };
}
function sanitizeMomentumMatrixProgressByEvent(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };
  const out = {};
  for (const [eventId2, rawValue] of Object.entries(value)) {
    if (!eventId2.trim() || !rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) continue;
    const raw = rawValue;
    out[eventId2] = {
      activeRun: sanitizeMomentumMatrixRun(raw.activeRun),
      bestScore: sanitizeMomentumMatrixCount(raw.bestScore),
      totalScore: sanitizeMomentumMatrixCount(raw.totalScore),
      corridorsStabilized: sanitizeMomentumMatrixCount(raw.corridorsStabilized),
      beaconsAligned: sanitizeMomentumMatrixCount(raw.beaconsAligned),
      runsStarted: sanitizeMomentumMatrixCount(raw.runsStarted),
      runsCompleted: sanitizeMomentumMatrixCount(raw.runsCompleted),
      updatedAtMs: sanitizeMomentumMatrixCount(raw.updatedAtMs)
    };
  }
  return out;
}
function mergeMomentumMatrixProgressByEvent(remote, local) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(remote), ...Object.keys(local)]);
  const merged = {};
  keys.forEach((eventId2) => {
    const remoteProgress = remote[eventId2];
    const localProgress = local[eventId2];
    if (!remoteProgress || !localProgress) {
      merged[eventId2] = localProgress ?? remoteProgress;
      return;
    }
    const latest = localProgress.updatedAtMs >= remoteProgress.updatedAtMs ? localProgress : remoteProgress;
    merged[eventId2] = {
      ...latest,
      bestScore: Math.max(remoteProgress.bestScore, localProgress.bestScore),
      totalScore: Math.max(remoteProgress.totalScore, localProgress.totalScore),
      corridorsStabilized: Math.max(remoteProgress.corridorsStabilized, localProgress.corridorsStabilized),
      beaconsAligned: Math.max(remoteProgress.beaconsAligned, localProgress.beaconsAligned),
      runsStarted: Math.max(remoteProgress.runsStarted, localProgress.runsStarted),
      runsCompleted: Math.max(remoteProgress.runsCompleted, localProgress.runsCompleted)
    };
  });
  return merged;
}
function sanitizeFortuneEngineProgressByEvent(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const out = {};
  for (const [eventId2, rawValue] of Object.entries(value)) {
    if (!eventId2.trim() || !rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) continue;
    const raw = rawValue;
    const toCount = (input) => typeof input === "number" && Number.isFinite(input) ? Math.max(0, Math.floor(input)) : 0;
    out[eventId2] = {
      eventPoints: toCount(raw.eventPoints),
      fragmentIds: resolveFortuneCoreFragmentIds(raw.fragmentIds),
      claimedMilestoneIds: resolveFortuneEngineClaimedMilestoneIds({
        claimedMilestoneIds: Array.isArray(raw.claimedMilestoneIds) ? raw.claimedMilestoneIds.filter((id2) => typeof id2 === "string") : []
      }),
      totalLaunches: toCount(raw.totalLaunches),
      bestRunScore: toCount(raw.bestRunScore),
      goldenLaunchDayKey: typeof raw.goldenLaunchDayKey === "string" && raw.goldenLaunchDayKey.trim() ? raw.goldenLaunchDayKey : null,
      goldenStreakCount: toCount(raw.goldenStreakCount),
      fragmentPityCount: toCount(raw.fragmentPityCount),
      finaleCompleted: raw.finaleCompleted === true,
      updatedAtMs: typeof raw.updatedAtMs === "number" && Number.isFinite(raw.updatedAtMs) ? Math.max(0, Math.floor(raw.updatedAtMs)) : Date.now()
    };
  }
  return out;
}
function mergeFortuneEngineProgressByEvent(remote, local) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(remote), ...Object.keys(local)]);
  const merged = {};
  keys.forEach((eventId2) => {
    const remoteProgress = remote[eventId2];
    const localProgress = local[eventId2];
    if (!remoteProgress || !localProgress) {
      merged[eventId2] = localProgress ?? remoteProgress;
      return;
    }
    const base = localProgress.updatedAtMs >= remoteProgress.updatedAtMs ? localProgress : remoteProgress;
    merged[eventId2] = {
      ...base,
      eventPoints: Math.max(remoteProgress.eventPoints, localProgress.eventPoints),
      fragmentIds: resolveFortuneCoreFragmentIds([...remoteProgress.fragmentIds, ...localProgress.fragmentIds]),
      claimedMilestoneIds: resolveFortuneEngineClaimedMilestoneIds({
        claimedMilestoneIds: [...remoteProgress.claimedMilestoneIds, ...localProgress.claimedMilestoneIds]
      }),
      totalLaunches: Math.max(remoteProgress.totalLaunches, localProgress.totalLaunches),
      bestRunScore: Math.max(remoteProgress.bestRunScore, localProgress.bestRunScore),
      goldenStreakCount: Math.max(remoteProgress.goldenStreakCount ?? 0, localProgress.goldenStreakCount ?? 0),
      fragmentPityCount: Math.max(remoteProgress.fragmentPityCount ?? 0, localProgress.fragmentPityCount ?? 0),
      finaleCompleted: remoteProgress.finaleCompleted || localProgress.finaleCompleted
    };
  });
  return merged;
}
function sanitizeSkyboundAcademyProgressByEvent(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const out = {};
  for (const [eventId2, rawProgress] of Object.entries(value)) {
    if (!eventId2.trim()) continue;
    out[eventId2] = sanitizeSkyboundAcademyEventProgress(rawProgress);
  }
  return out;
}
function mergeSkyboundAcademyProgressByEvent(remote, local) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(remote), ...Object.keys(local)]);
  const merged = {};
  keys.forEach((eventId2) => {
    const remoteProgress = remote[eventId2];
    const localProgress = local[eventId2];
    if (!remoteProgress || !localProgress) {
      merged[eventId2] = localProgress ?? remoteProgress;
      return;
    }
    const latest = localProgress.updatedAtMs >= remoteProgress.updatedAtMs ? localProgress : remoteProgress;
    merged[eventId2] = {
      ...latest,
      progress: {
        ...latest.progress,
        tickets: 0,
        sorties: Math.max(remoteProgress.progress.sorties, localProgress.progress.sorties),
        academyXp: Math.max(remoteProgress.progress.academyXp, localProgress.progress.academyXp),
        completedLessonIds: Array.from(/* @__PURE__ */ new Set([...remoteProgress.progress.completedLessonIds, ...localProgress.progress.completedLessonIds])),
        aceLessonIds: Array.from(/* @__PURE__ */ new Set([...remoteProgress.progress.aceLessonIds, ...localProgress.progress.aceLessonIds])),
        promotedRankIds: Array.from(/* @__PURE__ */ new Set([...remoteProgress.progress.promotedRankIds, ...localProgress.progress.promotedRankIds])),
        medalRankIds: Array.from(/* @__PURE__ */ new Set([...remoteProgress.progress.medalRankIds, ...localProgress.progress.medalRankIds])),
        certificateAwarded: remoteProgress.progress.certificateAwarded || localProgress.progress.certificateAwarded
      },
      upgrades: {
        launcher: Math.max(remoteProgress.upgrades.launcher, localProgress.upgrades.launcher),
        airframe: Math.max(remoteProgress.upgrades.airframe, localProgress.upgrades.airframe),
        engine: Math.max(remoteProgress.upgrades.engine, localProgress.upgrades.engine)
      },
      bestFlightScore: Math.max(remoteProgress.bestFlightScore, localProgress.bestFlightScore),
      settledAttemptIds: Array.from(/* @__PURE__ */ new Set([...remoteProgress.settledAttemptIds, ...localProgress.settledAttemptIds])).slice(-80)
    };
  });
  return merged;
}
function sanitizeJourneyDiscArenaProgressByEvent(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };
  const out = {};
  const count = (input) => typeof input === "number" && Number.isFinite(input) ? Math.max(0, Math.floor(input)) : 0;
  for (const [eventId2, rawValue] of Object.entries(value)) {
    if (!eventId2.trim() || !rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) continue;
    const raw = rawValue;
    const rank = count(raw.rank);
    out[eventId2] = {
      eventPoints: count(raw.eventPoints),
      bestRoundScore: count(raw.bestRoundScore),
      roundsStarted: count(raw.roundsStarted),
      roundsCompleted: count(raw.roundsCompleted),
      victories: count(raw.victories),
      totalDiscsDeployed: count(raw.totalDiscsDeployed),
      rank: rank >= 3 ? 3 : rank >= 2 ? 2 : 1,
      claimedMilestoneIds: Array.isArray(raw.claimedMilestoneIds) ? Array.from(new Set(raw.claimedMilestoneIds.filter((id2) => typeof id2 === "string"))) : [],
      bankedRoundIds: Array.isArray(raw.bankedRoundIds) ? Array.from(new Set(raw.bankedRoundIds.filter((id2) => typeof id2 === "string" && Boolean(id2.trim())))).slice(-80) : [],
      updatedAtMs: count(raw.updatedAtMs)
    };
  }
  return out;
}
function mergeJourneyDiscArenaProgressByEvent(remote, local) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(remote), ...Object.keys(local)]);
  const merged = {};
  keys.forEach((eventId2) => {
    const remoteProgress = remote[eventId2];
    const localProgress = local[eventId2];
    if (!remoteProgress || !localProgress) {
      merged[eventId2] = localProgress ?? remoteProgress;
      return;
    }
    const latest = localProgress.updatedAtMs >= remoteProgress.updatedAtMs ? localProgress : remoteProgress;
    merged[eventId2] = {
      ...latest,
      eventPoints: Math.max(remoteProgress.eventPoints, localProgress.eventPoints),
      bestRoundScore: Math.max(remoteProgress.bestRoundScore, localProgress.bestRoundScore),
      roundsStarted: Math.max(remoteProgress.roundsStarted, localProgress.roundsStarted),
      roundsCompleted: Math.max(remoteProgress.roundsCompleted, localProgress.roundsCompleted),
      victories: Math.max(remoteProgress.victories, localProgress.victories),
      totalDiscsDeployed: Math.max(remoteProgress.totalDiscsDeployed, localProgress.totalDiscsDeployed),
      rank: Math.max(remoteProgress.rank, localProgress.rank),
      claimedMilestoneIds: Array.from(/* @__PURE__ */ new Set([...remoteProgress.claimedMilestoneIds, ...localProgress.claimedMilestoneIds])),
      bankedRoundIds: Array.from(/* @__PURE__ */ new Set([...remoteProgress.bankedRoundIds, ...localProgress.bankedRoundIds])).slice(-80)
    };
  });
  return merged;
}
function mergeStringArrayByUnion(left = [], right = []) {
  return Array.from(/* @__PURE__ */ new Set([...left, ...right]));
}
var PER_ISLAND_EGG_STATUS_PRECEDENCE = {
  incubating: 0,
  ready: 1,
  sold: 2,
  collected: 3
};
function mergePerIslandEggEntryForConflict(remote, local) {
  if (!remote) return local;
  if (!local) return remote;
  if (remote.setAtMs !== local.setAtMs) {
    return local.setAtMs > remote.setAtMs ? local : remote;
  }
  const remoteRank = PER_ISLAND_EGG_STATUS_PRECEDENCE[remote.status] ?? 0;
  const localRank = PER_ISLAND_EGG_STATUS_PRECEDENCE[local.status] ?? 0;
  const winner = localRank >= remoteRank ? local : remote;
  const loser = winner === local ? remote : local;
  return {
    ...winner,
    location: winner.location ?? loser.location,
    openedAt: winner.openedAt ?? loser.openedAt,
    animalCollectedAtMs: winner.animalCollectedAtMs ?? loser.animalCollectedAtMs
  };
}
function mergePerIslandEggsForConflict(remote, local) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(remote ?? {}), ...Object.keys(local ?? {})]);
  const merged = {};
  keys.forEach((key) => {
    const entry = mergePerIslandEggEntryForConflict(remote?.[key], local?.[key]);
    if (entry) merged[key] = entry;
  });
  return merged;
}
var EMPTY_ACTIVE_EGG_GROUP = {
  activeEggTier: null,
  activeEggSetAtMs: null,
  activeEggHatchDurationMs: null,
  activeEggIsDormant: false
};
function readActiveEggGroup(record) {
  if (record.activeEggTier === null || typeof record.activeEggSetAtMs !== "number" || !Number.isFinite(record.activeEggSetAtMs)) {
    return null;
  }
  return {
    activeEggTier: record.activeEggTier,
    activeEggSetAtMs: record.activeEggSetAtMs,
    activeEggHatchDurationMs: record.activeEggHatchDurationMs,
    activeEggIsDormant: record.activeEggIsDormant
  };
}
function mergeActiveEggFieldsForConflict(options) {
  const { remote, local, mergedPerIslandEggs } = options;
  const localGroup = readActiveEggGroup(local);
  const remoteGroup = readActiveEggGroup(remote);
  if (!localGroup && !remoteGroup) return EMPTY_ACTIVE_EGG_GROUP;
  const candidateSide = localGroup && (!remoteGroup || localGroup.activeEggSetAtMs >= remoteGroup.activeEggSetAtMs) ? local : remote;
  const candidateGroup = candidateSide === local ? localGroup : remoteGroup;
  if (!candidateGroup) return EMPTY_ACTIVE_EGG_GROUP;
  const candidateIslandKey = String(candidateSide.currentIslandNumber);
  const ledgerEntry = mergedPerIslandEggs[candidateIslandKey];
  if (ledgerEntry && ledgerEntry.setAtMs === candidateGroup.activeEggSetAtMs && (ledgerEntry.status === "collected" || ledgerEntry.status === "sold")) {
    return EMPTY_ACTIVE_EGG_GROUP;
  }
  return candidateGroup;
}
function mergeCreatureCollection(remote, local) {
  const byCreatureId = /* @__PURE__ */ new Map();
  [...remote, ...local].forEach((entry) => {
    const existing = byCreatureId.get(entry.creatureId);
    if (!existing) {
      byCreatureId.set(entry.creatureId, entry);
      return;
    }
    const bondXp = Math.max(existing.bondXp, entry.bondXp);
    byCreatureId.set(entry.creatureId, {
      creatureId: existing.creatureId,
      copies: Math.max(existing.copies, entry.copies),
      firstCollectedAtMs: Math.min(existing.firstCollectedAtMs, entry.firstCollectedAtMs),
      lastCollectedAtMs: Math.max(existing.lastCollectedAtMs, entry.lastCollectedAtMs),
      lastCollectedIslandNumber: Math.max(existing.lastCollectedIslandNumber, entry.lastCollectedIslandNumber),
      bondXp,
      bondLevel: Math.max(existing.bondLevel, entry.bondLevel, Math.floor(bondXp / 3) + 1),
      lastFedAtMs: Math.max(existing.lastFedAtMs ?? 0, entry.lastFedAtMs ?? 0) || null,
      claimedBondMilestones: Array.from(/* @__PURE__ */ new Set([
        ...existing.claimedBondMilestones,
        ...entry.claimedBondMilestones
      ])).sort((a, b) => a - b),
      formLevel: Math.max(existing.formLevel ?? 1, entry.formLevel ?? 1),
      claimedFormRewards: Array.from(/* @__PURE__ */ new Set([
        ...existing.claimedFormRewards ?? [],
        ...entry.claimedFormRewards ?? []
      ])).sort((a, b) => a - b),
      grantIds: mergeStringArrayByUnion(existing.grantIds, entry.grantIds)
    });
  });
  return Array.from(byCreatureId.values()).sort((a, b) => b.lastCollectedAtMs - a.lastCollectedAtMs);
}
function mergeRecordForConflict(options) {
  const { remote, local } = options;
  const sameLandmarkVisit = remote.currentIslandNumber === local.currentIslandNumber && remote.cycleIndex === local.cycleIndex && remote.islandStartedAtMs === local.islandStartedAtMs;
  const mergedStopStatesByIndex = sameLandmarkVisit ? local.stopStatesByIndex.map((entry, index) => remote.stopStatesByIndex[index]?.completionDiceAwarded === true ? { ...entry, completionDiceAwarded: true } : entry) : local.stopStatesByIndex;
  const mergedPerIslandEggs = mergePerIslandEggsForConflict(remote.perIslandEggs, local.perIslandEggs);
  const mergedCompletedStopsByIsland = {
    ...remote.completedStopsByIsland,
    ...local.completedStopsByIsland
  };
  Object.keys(mergedCompletedStopsByIsland).forEach((islandKey) => {
    mergedCompletedStopsByIsland[islandKey] = mergeStringArrayByUnion(
      remote.completedStopsByIsland[islandKey] ?? [],
      local.completedStopsByIsland[islandKey] ?? []
    );
  });
  const mergedStopTicketsPaidByIsland = {
    ...remote.stopTicketsPaidByIsland,
    ...local.stopTicketsPaidByIsland
  };
  Object.keys(mergedStopTicketsPaidByIsland).forEach((islandKey) => {
    const unionSet = /* @__PURE__ */ new Set([
      ...remote.stopTicketsPaidByIsland[islandKey] ?? [],
      ...local.stopTicketsPaidByIsland[islandKey] ?? []
    ]);
    mergedStopTicketsPaidByIsland[islandKey] = Array.from(unionSet).sort((a, b) => a - b);
  });
  const mergedBonusTileChargeByIsland = {};
  const bonusIslandKeys = /* @__PURE__ */ new Set([
    ...Object.keys(remote.bonusTileChargeByIsland ?? {}),
    ...Object.keys(local.bonusTileChargeByIsland ?? {})
  ]);
  bonusIslandKeys.forEach((islandKey) => {
    const remoteInner = remote.bonusTileChargeByIsland?.[islandKey] ?? {};
    const localInner = local.bonusTileChargeByIsland?.[islandKey] ?? {};
    const remoteIsExplicitReset = Object.prototype.hasOwnProperty.call(remote.bonusTileChargeByIsland ?? {}, islandKey) && Object.keys(remoteInner).length === 0;
    const localIsExplicitReset = Object.prototype.hasOwnProperty.call(local.bonusTileChargeByIsland ?? {}, islandKey) && Object.keys(localInner).length === 0;
    if (remoteIsExplicitReset || localIsExplicitReset) {
      mergedBonusTileChargeByIsland[islandKey] = {};
      return;
    }
    const innerKeys = /* @__PURE__ */ new Set([
      ...Object.keys(remoteInner),
      ...Object.keys(localInner)
    ]);
    const innerMerged = {};
    innerKeys.forEach((idxKey) => {
      const idx = Number(idxKey);
      if (!Number.isFinite(idx) || idx < 0) return;
      const r = clampBonusCharge(remoteInner[idx]);
      const l = clampBonusCharge(localInner[idx]);
      const merged = Math.max(r, l);
      if (merged > 0) innerMerged[Math.floor(idx)] = merged;
    });
    if (Object.keys(innerMerged).length > 0) mergedBonusTileChargeByIsland[islandKey] = innerMerged;
  });
  const mergedMarketOwnedBundlesByIsland = {
    ...remote.marketOwnedBundlesByIsland,
    ...local.marketOwnedBundlesByIsland
  };
  Object.keys(mergedMarketOwnedBundlesByIsland).forEach((islandKey) => {
    mergedMarketOwnedBundlesByIsland[islandKey] = {
      dice_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.dice_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.dice_bundle),
      heart_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.heart_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.heart_bundle),
      heart_boost_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.heart_boost_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.heart_boost_bundle)
    };
  });
  return {
    ...remote,
    ...local,
    runtimeVersion: remote.runtimeVersion,
    stopStatesByIndex: mergedStopStatesByIndex,
    welcomePackClaimed: local.welcomePackClaimed || remote.welcomePackClaimed,
    welcomePackRewardBundleClaimed: local.welcomePackRewardBundleClaimed || remote.welcomePackRewardBundleClaimed,
    narrativeSeenState: mergeIslandNarrativeSeenState(remote.narrativeSeenState, local.narrativeSeenState),
    firstSessionTutorialState: compareIslandRunFirstSessionTutorialStates(local.firstSessionTutorialState, remote.firstSessionTutorialState) >= 0 ? local.firstSessionTutorialState : remote.firstSessionTutorialState,
    ...mergeActiveEggFieldsForConflict({ remote, local, mergedPerIslandEggs }),
    perIslandEggs: mergedPerIslandEggs,
    eggRewardInventory: mergeEggRewardInventory(remote.eggRewardInventory, local.eggRewardInventory),
    creatureTreatInventory: {
      basic: Math.max(remote.creatureTreatInventory.basic, local.creatureTreatInventory.basic),
      favorite: Math.max(remote.creatureTreatInventory.favorite, local.creatureTreatInventory.favorite),
      rare: Math.max(remote.creatureTreatInventory.rare, local.creatureTreatInventory.rare)
    },
    companionBonusLastVisitKey: local.companionBonusLastVisitKey ?? remote.companionBonusLastVisitKey,
    completedStopsByIsland: mergedCompletedStopsByIsland,
    vaultRushClaimsByIsland: Object.fromEntries(
      Array.from(/* @__PURE__ */ new Set([
        ...Object.keys(remote.vaultRushClaimsByIsland ?? {}),
        ...Object.keys(local.vaultRushClaimsByIsland ?? {})
      ])).map((islandKey) => [
        islandKey,
        Math.max(
          remote.vaultRushClaimsByIsland?.[islandKey] ?? 0,
          local.vaultRushClaimsByIsland?.[islandKey] ?? 0
        )
      ])
    ),
    vaultIslandProgress: mergeVaultIslandProgress(
      remote.vaultIslandProgress,
      local.vaultIslandProgress
    ),
    stopTicketsPaidByIsland: mergedStopTicketsPaidByIsland,
    bonusTileChargeByIsland: mergedBonusTileChargeByIsland,
    techCollectionByIsland: mergeIslandIndexLedgerByUnion(remote.techCollectionByIsland, local.techCollectionByIsland),
    concordRollProtectionState: mergeConcordRollProtectionState(
      remote.concordRollProtectionState,
      local.concordRollProtectionState
    ),
    techCollectionRewardedLinesByIsland: mergeIslandIndexLedgerByUnion(
      remote.techCollectionRewardedLinesByIsland,
      local.techCollectionRewardedLinesByIsland
    ),
    technologyUnlocksById: mergeTechnologyUnlocksById(remote.technologyUnlocksById, local.technologyUnlocksById),
    signatureMissionProgressByIsland: mergeIslandRunSignatureMissionProgress(
      remote.signatureMissionProgressByIsland,
      local.signatureMissionProgressByIsland
    ),
    marketOwnedBundlesByIsland: mergedMarketOwnedBundlesByIsland,
    creatureCollection: mergeCreatureCollection(remote.creatureCollection, local.creatureCollection),
    perfectCompanionIds: local.perfectCompanionIds.length > 0 ? local.perfectCompanionIds : remote.perfectCompanionIds,
    perfectCompanionReasons: Object.keys(local.perfectCompanionReasons).length > 0 ? local.perfectCompanionReasons : remote.perfectCompanionReasons,
    perfectCompanionComputedAtMs: local.perfectCompanionComputedAtMs ?? remote.perfectCompanionComputedAtMs,
    perfectCompanionModelVersion: local.perfectCompanionModelVersion ?? remote.perfectCompanionModelVersion,
    perfectCompanionComputedCycleIndex: local.perfectCompanionComputedCycleIndex ?? remote.perfectCompanionComputedCycleIndex,
    stickerInventory: {
      ...remote.stickerInventory,
      ...local.stickerInventory
    },
    lastEssenceDriftLost: Math.max(local.lastEssenceDriftLost, remote.lastEssenceDriftLost),
    minigameTicketsByEvent: mergeMinigameTicketsByEvent({
      remote: remote.minigameTicketsByEvent,
      local: local.minigameTicketsByEvent,
      remoteCompanionFeastProgress: remote.companionFeastProgressByEvent,
      localCompanionFeastProgress: local.companionFeastProgressByEvent,
      remoteSpaceExcavatorProgress: remote.spaceExcavatorProgressByEvent,
      localSpaceExcavatorProgress: local.spaceExcavatorProgressByEvent,
      remoteCrystalMinersProgress: remote.crystalMinersProgressByEvent,
      localCrystalMinersProgress: local.crystalMinersProgressByEvent,
      remoteMomentumMatrixProgress: remote.momentumMatrixProgressByEvent,
      localMomentumMatrixProgress: local.momentumMatrixProgressByEvent,
      remoteSkyboundProgress: remote.skyboundAcademyProgressByEvent,
      localSkyboundProgress: local.skyboundAcademyProgressByEvent
    }),
    arenaFirstTicketBoostClaimedByEvent: {
      ...remote.arenaFirstTicketBoostClaimedByEvent,
      ...local.arenaFirstTicketBoostClaimedByEvent
    },
    luckyRollSessionsByMilestone: mergeLuckyRollSessionsByMilestone(
      remote.luckyRollSessionsByMilestone,
      local.luckyRollSessionsByMilestone
    ),
    spaceExcavatorProgressByEvent: mergeSpaceExcavatorProgressByEvent(
      remote.spaceExcavatorProgressByEvent,
      local.spaceExcavatorProgressByEvent
    ),
    companionFeastProgressByEvent: mergeCompanionFeastProgressByEvent(
      remote.companionFeastProgressByEvent,
      local.companionFeastProgressByEvent
    ),
    fortuneEngineProgressByEvent: mergeFortuneEngineProgressByEvent(
      remote.fortuneEngineProgressByEvent,
      local.fortuneEngineProgressByEvent
    ),
    skyboundAcademyProgressByEvent: mergeSkyboundAcademyProgressByEvent(
      remote.skyboundAcademyProgressByEvent,
      local.skyboundAcademyProgressByEvent
    ),
    journeyDiscArenaProgressByEvent: mergeJourneyDiscArenaProgressByEvent(
      remote.journeyDiscArenaProgressByEvent,
      local.journeyDiscArenaProgressByEvent
    ),
    journeyDiscArmory: mergeJourneyDiscArmory(remote.journeyDiscArmory, local.journeyDiscArmory),
    crystalMinersProgressByEvent: mergeCrystalMinersProgressByEvent(remote.crystalMinersProgressByEvent, local.crystalMinersProgressByEvent),
    momentumMatrixProgressByEvent: mergeMomentumMatrixProgressByEvent(
      remote.momentumMatrixProgressByEvent,
      local.momentumMatrixProgressByEvent
    )
  };
}
function resolveIslandRunRecordForConflict(options) {
  const { remote, local, conflictMode } = options;
  if (conflictMode === "replace") {
    return {
      ...local,
      runtimeVersion: remote.runtimeVersion
    };
  }
  return mergeRecordForConflict({ remote, local });
}
function mergeMinigameTicketsByEvent(options) {
  const { remote, local } = options;
  const keys = /* @__PURE__ */ new Set([...Object.keys(remote), ...Object.keys(local)]);
  const merged = {};
  keys.forEach((key) => {
    const remoteCount = remote[key] ?? 0;
    const localCount = local[key] ?? 0;
    const remoteFeastDrops = options.remoteCompanionFeastProgress?.[key]?.totalFruitDropped ?? 0;
    const localFeastDrops = options.localCompanionFeastProgress?.[key]?.totalFruitDropped ?? 0;
    const remoteDigs = (options.remoteSpaceExcavatorProgress?.[key]?.dugTileIds.length ?? 0) + (options.remoteSpaceExcavatorProgress?.[key]?.completedBoardCount ?? 0);
    const localDigs = (options.localSpaceExcavatorProgress?.[key]?.dugTileIds.length ?? 0) + (options.localSpaceExcavatorProgress?.[key]?.completedBoardCount ?? 0);
    const remoteMatrixRuns = options.remoteMomentumMatrixProgress?.[key]?.runsStarted ?? 0;
    const localMatrixRuns = options.localMomentumMatrixProgress?.[key]?.runsStarted ?? 0;
    const remoteSkyboundSorties = options.remoteSkyboundProgress?.[key]?.progress.sorties ?? 0;
    const localSkyboundSorties = options.localSkyboundProgress?.[key]?.progress.sorties ?? 0;
    const remoteMinerDigs = options.remoteCrystalMinersProgress?.[key]?.digs ?? 0;
    const localMinerDigs = options.localCrystalMinersProgress?.[key]?.digs ?? 0;
    const localSpentMoreActions = localMinerDigs > remoteMinerDigs || localFeastDrops > remoteFeastDrops || localDigs > remoteDigs || localMatrixRuns > remoteMatrixRuns || localSkyboundSorties > remoteSkyboundSorties;
    const remoteSpentMoreActions = remoteMinerDigs > localMinerDigs || remoteFeastDrops > localFeastDrops || remoteDigs > localDigs || remoteMatrixRuns > localMatrixRuns || remoteSkyboundSorties > localSkyboundSorties;
    const count = localSpentMoreActions && !remoteSpentMoreActions ? localCount : remoteSpentMoreActions && !localSpentMoreActions ? remoteCount : Math.max(remoteCount, localCount);
    if (count > 0) merged[key] = count;
  });
  return merged;
}
function toRemoteRow(record, runtimeVersion, deviceSessionId) {
  return {
    user_id: null,
    runtime_version: runtimeVersion,
    first_run_claimed: record.firstRunClaimed,
    first_session_tutorial_state: record.firstSessionTutorialState,
    daily_hearts_claimed_day_key: record.dailyHeartsClaimedDayKey,
    onboarding_display_name_loop_completed: record.onboardingDisplayNameLoopCompleted,
    welcome_pack_claimed: record.welcomePackClaimed,
    welcome_pack_reward_bundle_claimed: record.welcomePackRewardBundleClaimed,
    story_prologue_seen: record.storyPrologueSeen,
    narrative_seen_state: record.narrativeSeenState,
    audio_enabled: record.audioEnabled,
    music_enabled: record.musicEnabled,
    sfx_enabled: record.sfxEnabled,
    current_island_number: record.currentIslandNumber,
    cycle_index: record.cycleIndex,
    boss_trial_resolved_island_number: record.bossTrialResolvedIslandNumber,
    active_egg_tier: record.activeEggTier,
    active_egg_set_at_ms: record.activeEggSetAtMs,
    active_egg_hatch_duration_ms: record.activeEggHatchDurationMs,
    active_egg_is_dormant: record.activeEggIsDormant,
    per_island_eggs: record.perIslandEggs,
    egg_reward_inventory: record.eggRewardInventory,
    island_started_at_ms: record.islandStartedAtMs,
    island_expires_at_ms: record.islandExpiresAtMs,
    island_shards: record.islandShards,
    token_index: record.tokenIndex,
    spin_tokens: record.spinTokens,
    dice_pool: record.dicePool,
    bonus_max_dice: record.bonusMaxDice,
    shard_tier_index: record.shardTierIndex,
    shard_claim_count: record.shardClaimCount,
    shields: record.shields,
    shards: record.shards,
    diamonds: record.diamonds,
    creature_treat_inventory: record.creatureTreatInventory,
    companion_bonus_last_visit_key: record.companionBonusLastVisitKey,
    completed_stops_by_island: record.completedStopsByIsland,
    vault_rush_claims_by_island: record.vaultRushClaimsByIsland,
    vault_island_progress: record.vaultIslandProgress,
    stop_tickets_paid_by_island: record.stopTicketsPaidByIsland,
    bonus_tile_charge_by_island: record.bonusTileChargeByIsland,
    tech_collection_by_island: record.techCollectionByIsland,
    concord_roll_protection_state: record.concordRollProtectionState,
    tech_collection_rewarded_lines_by_island: record.techCollectionRewardedLinesByIsland,
    technology_unlocks_by_id: record.technologyUnlocksById,
    signature_mission_progress_by_island: record.signatureMissionProgressByIsland,
    market_owned_bundles_by_island: record.marketOwnedBundlesByIsland,
    creature_collection: record.creatureCollection,
    active_companion_id: record.activeCompanionId,
    selected_player_piece_id: record.selectedPlayerPieceId,
    perfect_companion_ids: record.perfectCompanionIds,
    perfect_companion_reasons: record.perfectCompanionReasons,
    perfect_companion_computed_at_ms: record.perfectCompanionComputedAtMs,
    perfect_companion_model_version: record.perfectCompanionModelVersion,
    perfect_companion_computed_cycle_index: record.perfectCompanionComputedCycleIndex,
    active_stop_index: record.activeStopIndex,
    active_stop_type: record.activeStopType,
    stop_states_by_index: record.stopStatesByIndex,
    stop_build_state_by_index: record.stopBuildStateByIndex,
    boss_state: record.bossState,
    essence: record.essence,
    essence_lifetime_earned: record.essenceLifetimeEarned,
    essence_lifetime_spent: record.essenceLifetimeSpent,
    dice_regen_state: record.diceRegenState ?? null,
    reward_bar_progress: record.rewardBarProgress,
    reward_bar_threshold: record.rewardBarThreshold,
    reward_bar_claim_count_in_event: record.rewardBarClaimCountInEvent,
    reward_bar_escalation_tier: record.rewardBarEscalationTier,
    reward_bar_last_claim_at_ms: record.rewardBarLastClaimAtMs,
    reward_bar_bound_event_id: record.rewardBarBoundEventId,
    reward_bar_ladder_id: record.rewardBarLadderId ?? null,
    active_timed_event: record.activeTimedEvent,
    active_timed_event_progress: record.activeTimedEventProgress,
    sticker_progress: record.stickerProgress,
    sticker_inventory: record.stickerInventory,
    last_essence_drift_lost: record.lastEssenceDriftLost,
    minigame_tickets_by_event: record.minigameTicketsByEvent,
    arena_first_ticket_boost_claimed_by_event: record.arenaFirstTicketBoostClaimedByEvent,
    lucky_roll_sessions_by_milestone: record.luckyRollSessionsByMilestone,
    space_excavator_progress_by_event: record.spaceExcavatorProgressByEvent,
    companion_feast_progress_by_event: record.companionFeastProgressByEvent,
    fortune_engine_progress_by_event: record.fortuneEngineProgressByEvent,
    skybound_academy_progress_by_event: record.skyboundAcademyProgressByEvent,
    journey_disc_arena_progress_by_event: record.journeyDiscArenaProgressByEvent,
    journey_disc_armory: record.journeyDiscArmory,
    crystal_miners_progress_by_event: record.crystalMinersProgressByEvent,
    momentum_matrix_progress_by_event: record.momentumMatrixProgressByEvent,
    last_writer_device_session_id: deviceSessionId,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function readIslandRunGameStateRecord(session2) {
  const fallback = getDefaultRecord();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(getStorageKey(session2.user.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return toRecord(parsed, fallback);
  } catch {
    return fallback;
  }
}
async function hydrateIslandRunGameStateRecordWithSource(options) {
  const { session: session2, client, forceRemote = false } = options;
  const fallback = readIslandRunGameStateRecord(session2);
  if (isDemoSession(session2) || !client) {
    logIslandRunEntryDebug("runtime_state_hydrate_skipped_remote", {
      userId: session2.user.id,
      reason: isDemoSession(session2) ? "demo_session" : "missing_client",
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber
    });
    return { record: fallback, source: "fallback_demo_or_no_client" };
  }
  const remoteBackoffUntil = getRemoteBackoffUntil(session2.user.id);
  if (!forceRemote && remoteBackoffUntil !== null) {
    logIslandRunEntryDebug("runtime_state_hydrate_skipped_remote", {
      userId: session2.user.id,
      reason: "remote_backoff_active",
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber
    });
    return { record: fallback, source: "fallback_backoff_active" };
  }
  logIslandRunEntryDebug("runtime_state_hydrate_query_start", {
    userId: session2.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    ...getRuntimeStateDebugFields(fallback),
    fallbackCurrentIslandNumber: fallback.currentIslandNumber,
    fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber
  });
  const { data, error } = await client.from(ISLAND_RUN_RUNTIME_STATE_TABLE).select("runtime_version,first_run_claimed,first_session_tutorial_state,daily_hearts_claimed_day_key,onboarding_display_name_loop_completed,welcome_pack_claimed,welcome_pack_reward_bundle_claimed,story_prologue_seen,narrative_seen_state,audio_enabled,music_enabled,sfx_enabled,current_island_number,cycle_index,boss_trial_resolved_island_number,active_egg_tier,active_egg_set_at_ms,active_egg_hatch_duration_ms,active_egg_is_dormant,per_island_eggs,egg_reward_inventory,island_started_at_ms,island_expires_at_ms,island_shards,token_index,spin_tokens,dice_pool,bonus_max_dice,shard_tier_index,shard_claim_count,shields,shards,diamonds,creature_treat_inventory,companion_bonus_last_visit_key,completed_stops_by_island,vault_rush_claims_by_island,vault_island_progress,stop_tickets_paid_by_island,bonus_tile_charge_by_island,tech_collection_by_island,concord_roll_protection_state,tech_collection_rewarded_lines_by_island,technology_unlocks_by_id,signature_mission_progress_by_island,market_owned_bundles_by_island,creature_collection,active_companion_id,selected_player_piece_id,perfect_companion_ids,perfect_companion_reasons,perfect_companion_computed_at_ms,perfect_companion_model_version,perfect_companion_computed_cycle_index,active_stop_index,active_stop_type,stop_states_by_index,stop_build_state_by_index,boss_state,essence,essence_lifetime_earned,essence_lifetime_spent,dice_regen_state,reward_bar_progress,reward_bar_threshold,reward_bar_claim_count_in_event,reward_bar_last_claim_at_ms,reward_bar_escalation_tier,reward_bar_bound_event_id,reward_bar_ladder_id,active_timed_event,active_timed_event_progress,sticker_progress,sticker_inventory,last_essence_drift_lost,minigame_tickets_by_event,arena_first_ticket_boost_claimed_by_event,lucky_roll_sessions_by_milestone,space_excavator_progress_by_event,companion_feast_progress_by_event,fortune_engine_progress_by_event,skybound_academy_progress_by_event,journey_disc_arena_progress_by_event,journey_disc_armory,momentum_matrix_progress_by_event,crystal_miners_progress_by_event").eq("user_id", session2.user.id).maybeSingle();
  if (error) {
    if (isSchemaMismatchRuntimeStateError(error)) {
      const { data: legacyData, error: legacyError } = await client.from(ISLAND_RUN_RUNTIME_STATE_TABLE).select("*").eq("user_id", session2.user.id).maybeSingle();
      if (!legacyError && legacyData) {
        const legacyHydratedRecord = toRecord(
          {
            runtimeVersion: legacyData.runtime_version ?? 0,
            firstRunClaimed: legacyData.first_run_claimed,
            firstSessionTutorialState: legacyData.first_session_tutorial_state,
            dailyHeartsClaimedDayKey: legacyData.daily_hearts_claimed_day_key,
            onboardingDisplayNameLoopCompleted: legacyData.onboarding_display_name_loop_completed ?? false,
            welcomePackClaimed: legacyData.welcome_pack_claimed ?? false,
            welcomePackRewardBundleClaimed: legacyData.welcome_pack_reward_bundle_claimed ?? false,
            storyPrologueSeen: legacyData.story_prologue_seen ?? false,
            narrativeSeenState: sanitizeIslandNarrativeSeenState(
              legacyData.narrative_seen_state
            ),
            audioEnabled: legacyData.audio_enabled ?? true,
            musicEnabled: typeof legacyData.music_enabled === "boolean" ? legacyData.music_enabled : void 0,
            sfxEnabled: typeof legacyData.sfx_enabled === "boolean" ? legacyData.sfx_enabled : void 0,
            currentIslandNumber: legacyData.current_island_number ?? fallback.currentIslandNumber,
            cycleIndex: legacyData.cycle_index ?? 0,
            bossTrialResolvedIslandNumber: legacyData.boss_trial_resolved_island_number,
            activeEggTier: legacyData.active_egg_tier,
            activeEggSetAtMs: legacyData.active_egg_set_at_ms,
            activeEggHatchDurationMs: legacyData.active_egg_hatch_duration_ms,
            activeEggIsDormant: legacyData.active_egg_is_dormant,
            perIslandEggs: legacyData.per_island_eggs ?? {},
            eggRewardInventory: sanitizeEggRewardInventory(
              legacyData.egg_reward_inventory,
              fallback.eggRewardInventory
            ),
            islandStartedAtMs: legacyData.island_started_at_ms,
            islandExpiresAtMs: legacyData.island_expires_at_ms,
            islandShards: legacyData.island_shards ?? 0,
            tokenIndex: legacyData.token_index ?? 0,
            spinTokens: legacyData.spin_tokens ?? 0,
            dicePool: legacyData.dice_pool ?? fallback.dicePool,
            bonusMaxDice: legacyData.bonus_max_dice ?? fallback.bonusMaxDice,
            shardTierIndex: legacyData.shard_tier_index ?? 0,
            shardClaimCount: legacyData.shard_claim_count ?? 0,
            shields: legacyData.shields ?? 0,
            shards: legacyData.shards ?? 0,
            diamonds: legacyData.diamonds ?? 3,
            creatureTreatInventory: legacyData.creature_treat_inventory ?? fallback.creatureTreatInventory,
            companionBonusLastVisitKey: legacyData.companion_bonus_last_visit_key ?? null,
            completedStopsByIsland: legacyData.completed_stops_by_island ?? {},
            vaultRushClaimsByIsland: sanitizeVaultRushClaimsByIsland(
              legacyData.vault_rush_claims_by_island
            ),
            vaultIslandProgress: sanitizeVaultIslandProgress(
              legacyData.vault_island_progress
            ),
            stopTicketsPaidByIsland: sanitizeStopTicketsPaidByIsland(
              legacyData.stop_tickets_paid_by_island ?? {}
            ),
            bonusTileChargeByIsland: sanitizeBonusTileChargeByIsland(
              legacyData.bonus_tile_charge_by_island ?? {}
            ),
            techCollectionByIsland: sanitizeIslandIndexLedger(
              legacyData.tech_collection_by_island ?? {},
              TECH_COLLECTION_GRID_CELL_COUNT
            ),
            concordRollProtectionState: legacyData.concord_roll_protection_state,
            techCollectionRewardedLinesByIsland: sanitizeIslandIndexLedger(
              legacyData.tech_collection_rewarded_lines_by_island ?? {},
              TECH_COLLECTION_LINE_COUNT
            ),
            technologyUnlocksById: sanitizeTechnologyUnlocksById(
              legacyData.technology_unlocks_by_id,
              fallback.technologyUnlocksById,
              {
                techCollectionByIsland: legacyData.tech_collection_by_island,
                currentIslandNumber: legacyData.current_island_number,
                completedStopsByIsland: legacyData.completed_stops_by_island
              }
            ),
            signatureMissionProgressByIsland: sanitizeIslandRunSignatureMissionProgress(
              legacyData.signature_mission_progress_by_island
            ),
            marketOwnedBundlesByIsland: legacyData.market_owned_bundles_by_island ?? {},
            creatureCollection: legacyData.creature_collection ?? [],
            activeCompanionId: legacyData.active_companion_id ?? null,
            selectedPlayerPieceId: legacyData.selected_player_piece_id ?? null,
            perfectCompanionIds: legacyData.perfect_companion_ids ?? fallback.perfectCompanionIds,
            perfectCompanionReasons: legacyData.perfect_companion_reasons ?? fallback.perfectCompanionReasons,
            perfectCompanionComputedAtMs: legacyData.perfect_companion_computed_at_ms ?? fallback.perfectCompanionComputedAtMs,
            perfectCompanionModelVersion: legacyData.perfect_companion_model_version ?? fallback.perfectCompanionModelVersion,
            perfectCompanionComputedCycleIndex: legacyData.perfect_companion_computed_cycle_index ?? fallback.perfectCompanionComputedCycleIndex,
            activeStopIndex: legacyData.active_stop_index ?? fallback.activeStopIndex,
            activeStopType: legacyData.active_stop_type ?? fallback.activeStopType,
            stopStatesByIndex: legacyData.stop_states_by_index ?? fallback.stopStatesByIndex,
            stopBuildStateByIndex: legacyData.stop_build_state_by_index ?? fallback.stopBuildStateByIndex,
            bossState: legacyData.boss_state ?? fallback.bossState,
            essence: legacyData.essence ?? fallback.essence,
            essenceLifetimeEarned: legacyData.essence_lifetime_earned ?? fallback.essenceLifetimeEarned,
            essenceLifetimeSpent: legacyData.essence_lifetime_spent ?? fallback.essenceLifetimeSpent,
            diceRegenState: legacyData.dice_regen_state ?? fallback.diceRegenState,
            rewardBarProgress: legacyData.reward_bar_progress ?? fallback.rewardBarProgress,
            rewardBarThreshold: legacyData.reward_bar_threshold ?? fallback.rewardBarThreshold,
            rewardBarClaimCountInEvent: legacyData.reward_bar_claim_count_in_event ?? fallback.rewardBarClaimCountInEvent,
            rewardBarEscalationTier: legacyData.reward_bar_escalation_tier ?? fallback.rewardBarEscalationTier,
            rewardBarLastClaimAtMs: legacyData.reward_bar_last_claim_at_ms ?? fallback.rewardBarLastClaimAtMs,
            rewardBarBoundEventId: legacyData.reward_bar_bound_event_id ?? fallback.rewardBarBoundEventId,
            rewardBarLadderId: legacyData.reward_bar_ladder_id ?? fallback.rewardBarLadderId,
            activeTimedEvent: legacyData.active_timed_event ?? fallback.activeTimedEvent,
            activeTimedEventProgress: legacyData.active_timed_event_progress ?? fallback.activeTimedEventProgress,
            stickerProgress: legacyData.sticker_progress ?? fallback.stickerProgress,
            stickerInventory: legacyData.sticker_inventory ?? fallback.stickerInventory,
            lastEssenceDriftLost: legacyData.last_essence_drift_lost ?? fallback.lastEssenceDriftLost,
            minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(
              legacyData.minigame_tickets_by_event,
              fallback.minigameTicketsByEvent
            ),
            arenaFirstTicketBoostClaimedByEvent: sanitizeBooleanRecord(
              legacyData.arena_first_ticket_boost_claimed_by_event,
              fallback.arenaFirstTicketBoostClaimedByEvent
            ),
            luckyRollSessionsByMilestone: sanitizeIslandRunLuckyRollSessionsByMilestone(
              legacyData.lucky_roll_sessions_by_milestone,
              fallback.luckyRollSessionsByMilestone
            ),
            spaceExcavatorProgressByEvent: sanitizeSpaceExcavatorProgressByEvent(
              legacyData.space_excavator_progress_by_event,
              fallback.spaceExcavatorProgressByEvent
            ),
            companionFeastProgressByEvent: sanitizeCompanionFeastProgressByEvent(
              legacyData.companion_feast_progress_by_event,
              fallback.companionFeastProgressByEvent
            ),
            fortuneEngineProgressByEvent: sanitizeFortuneEngineProgressByEvent(
              legacyData.fortune_engine_progress_by_event,
              fallback.fortuneEngineProgressByEvent
            ),
            skyboundAcademyProgressByEvent: sanitizeSkyboundAcademyProgressByEvent(
              legacyData.skybound_academy_progress_by_event,
              fallback.skyboundAcademyProgressByEvent
            ),
            journeyDiscArenaProgressByEvent: sanitizeJourneyDiscArenaProgressByEvent(
              legacyData.journey_disc_arena_progress_by_event,
              fallback.journeyDiscArenaProgressByEvent
            ),
            journeyDiscArmory: sanitizeJourneyDiscArmory(
              legacyData.journey_disc_armory,
              fallback.journeyDiscArmory
            ),
            crystalMinersProgressByEvent: sanitizeCrystalMinersProgressByEvent(legacyData.crystal_miners_progress_by_event, fallback.crystalMinersProgressByEvent),
            momentumMatrixProgressByEvent: sanitizeMomentumMatrixProgressByEvent(
              legacyData.momentum_matrix_progress_by_event,
              fallback.momentumMatrixProgressByEvent
            )
          },
          fallback
        );
        if (legacyHydratedRecord.runtimeVersion > fallback.runtimeVersion && typeof window !== "undefined") {
          try {
            window.localStorage.setItem(getStorageKey(session2.user.id), JSON.stringify(legacyHydratedRecord));
          } catch {
          }
        }
        setRemoteBackoffUntil(session2.user.id, null);
        logIslandRunEntryDebug("runtime_state_hydrate_query_success", {
          userId: session2.user.id,
          source: "table_legacy_wildcard",
          ...getRuntimeStateDebugFields(legacyHydratedRecord)
        });
        return { record: legacyHydratedRecord, source: "table" };
      }
    }
    const remoteBackoffTriggered = isTransportLikeRuntimeStateError(error) || isSchemaMismatchRuntimeStateError(error);
    const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session2.user.id) : null;
    logIslandRunEntryDebug("runtime_state_hydrate_query_error", {
      userId: session2.user.id,
      message: error.message,
      code: error.code ?? null,
      remoteBackoffTriggered,
      remoteBackoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber
    });
    return { record: fallback, source: "fallback_query_error" };
  }
  if (!data) {
    logIslandRunEntryDebug("runtime_state_hydrate_no_row", {
      userId: session2.user.id,
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber
    });
    return { record: fallback, source: "fallback_no_row" };
  }
  const hydratedRecord = toRecord(
    {
      runtimeVersion: data.runtime_version ?? 0,
      firstRunClaimed: data.first_run_claimed,
      firstSessionTutorialState: data.first_session_tutorial_state,
      dailyHeartsClaimedDayKey: data.daily_hearts_claimed_day_key,
      onboardingDisplayNameLoopCompleted: data.onboarding_display_name_loop_completed ?? false,
      welcomePackClaimed: data.welcome_pack_claimed ?? false,
      welcomePackRewardBundleClaimed: data.welcome_pack_reward_bundle_claimed ?? false,
      storyPrologueSeen: data.story_prologue_seen ?? false,
      narrativeSeenState: sanitizeIslandNarrativeSeenState(
        data.narrative_seen_state
      ),
      audioEnabled: data.audio_enabled ?? true,
      musicEnabled: typeof data.music_enabled === "boolean" ? data.music_enabled : void 0,
      sfxEnabled: typeof data.sfx_enabled === "boolean" ? data.sfx_enabled : void 0,
      currentIslandNumber: data.current_island_number ?? fallback.currentIslandNumber,
      cycleIndex: data.cycle_index ?? 0,
      bossTrialResolvedIslandNumber: data.boss_trial_resolved_island_number,
      activeEggTier: data.active_egg_tier,
      activeEggSetAtMs: data.active_egg_set_at_ms,
      activeEggHatchDurationMs: data.active_egg_hatch_duration_ms,
      activeEggIsDormant: data.active_egg_is_dormant,
      perIslandEggs: data.per_island_eggs ?? {},
      eggRewardInventory: sanitizeEggRewardInventory(
        data.egg_reward_inventory,
        fallback.eggRewardInventory
      ),
      islandStartedAtMs: data.island_started_at_ms,
      islandExpiresAtMs: data.island_expires_at_ms,
      islandShards: data.island_shards ?? 0,
      tokenIndex: data.token_index ?? 0,
      spinTokens: data.spin_tokens ?? 0,
      dicePool: data.dice_pool ?? fallback.dicePool,
      bonusMaxDice: data.bonus_max_dice ?? fallback.bonusMaxDice,
      shardTierIndex: data.shard_tier_index ?? 0,
      shardClaimCount: data.shard_claim_count ?? 0,
      shields: data.shields ?? 0,
      shards: data.shards ?? 0,
      diamonds: data.diamonds ?? 3,
      creatureTreatInventory: data.creature_treat_inventory ?? fallback.creatureTreatInventory,
      companionBonusLastVisitKey: data.companion_bonus_last_visit_key ?? null,
      completedStopsByIsland: data.completed_stops_by_island ?? {},
      vaultRushClaimsByIsland: sanitizeVaultRushClaimsByIsland(
        data.vault_rush_claims_by_island
      ),
      vaultIslandProgress: sanitizeVaultIslandProgress(
        data.vault_island_progress
      ),
      stopTicketsPaidByIsland: sanitizeStopTicketsPaidByIsland(
        data.stop_tickets_paid_by_island ?? {}
      ),
      bonusTileChargeByIsland: sanitizeBonusTileChargeByIsland(
        data.bonus_tile_charge_by_island ?? {}
      ),
      techCollectionByIsland: sanitizeIslandIndexLedger(
        data.tech_collection_by_island ?? {},
        TECH_COLLECTION_GRID_CELL_COUNT
      ),
      concordRollProtectionState: data.concord_roll_protection_state,
      techCollectionRewardedLinesByIsland: sanitizeIslandIndexLedger(
        data.tech_collection_rewarded_lines_by_island ?? {},
        TECH_COLLECTION_LINE_COUNT
      ),
      technologyUnlocksById: sanitizeTechnologyUnlocksById(
        data.technology_unlocks_by_id,
        fallback.technologyUnlocksById,
        {
          techCollectionByIsland: data.tech_collection_by_island,
          currentIslandNumber: data.current_island_number,
          completedStopsByIsland: data.completed_stops_by_island
        }
      ),
      signatureMissionProgressByIsland: sanitizeIslandRunSignatureMissionProgress(
        data.signature_mission_progress_by_island
      ),
      marketOwnedBundlesByIsland: data.market_owned_bundles_by_island ?? {},
      creatureCollection: data.creature_collection ?? [],
      activeCompanionId: data.active_companion_id ?? null,
      selectedPlayerPieceId: data.selected_player_piece_id ?? null,
      perfectCompanionIds: data.perfect_companion_ids ?? fallback.perfectCompanionIds,
      perfectCompanionReasons: data.perfect_companion_reasons ?? fallback.perfectCompanionReasons,
      perfectCompanionComputedAtMs: data.perfect_companion_computed_at_ms ?? fallback.perfectCompanionComputedAtMs,
      perfectCompanionModelVersion: data.perfect_companion_model_version ?? fallback.perfectCompanionModelVersion,
      perfectCompanionComputedCycleIndex: data.perfect_companion_computed_cycle_index ?? fallback.perfectCompanionComputedCycleIndex,
      activeStopIndex: data.active_stop_index ?? fallback.activeStopIndex,
      activeStopType: data.active_stop_type ?? fallback.activeStopType,
      stopStatesByIndex: data.stop_states_by_index ?? fallback.stopStatesByIndex,
      stopBuildStateByIndex: data.stop_build_state_by_index ?? fallback.stopBuildStateByIndex,
      bossState: data.boss_state ?? fallback.bossState,
      essence: data.essence ?? fallback.essence,
      essenceLifetimeEarned: data.essence_lifetime_earned ?? fallback.essenceLifetimeEarned,
      essenceLifetimeSpent: data.essence_lifetime_spent ?? fallback.essenceLifetimeSpent,
      diceRegenState: data.dice_regen_state ?? fallback.diceRegenState,
      rewardBarProgress: data.reward_bar_progress ?? fallback.rewardBarProgress,
      rewardBarThreshold: data.reward_bar_threshold ?? fallback.rewardBarThreshold,
      rewardBarClaimCountInEvent: data.reward_bar_claim_count_in_event ?? fallback.rewardBarClaimCountInEvent,
      rewardBarEscalationTier: data.reward_bar_escalation_tier ?? fallback.rewardBarEscalationTier,
      rewardBarLastClaimAtMs: data.reward_bar_last_claim_at_ms ?? fallback.rewardBarLastClaimAtMs,
      rewardBarBoundEventId: data.reward_bar_bound_event_id ?? fallback.rewardBarBoundEventId,
      rewardBarLadderId: data.reward_bar_ladder_id ?? fallback.rewardBarLadderId,
      activeTimedEvent: data.active_timed_event ?? fallback.activeTimedEvent,
      activeTimedEventProgress: data.active_timed_event_progress ?? fallback.activeTimedEventProgress,
      stickerProgress: data.sticker_progress ?? fallback.stickerProgress,
      stickerInventory: data.sticker_inventory ?? fallback.stickerInventory,
      lastEssenceDriftLost: data.last_essence_drift_lost ?? fallback.lastEssenceDriftLost,
      minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(
        data.minigame_tickets_by_event,
        fallback.minigameTicketsByEvent
      ),
      arenaFirstTicketBoostClaimedByEvent: sanitizeBooleanRecord(
        data.arena_first_ticket_boost_claimed_by_event,
        fallback.arenaFirstTicketBoostClaimedByEvent
      ),
      luckyRollSessionsByMilestone: sanitizeIslandRunLuckyRollSessionsByMilestone(
        data.lucky_roll_sessions_by_milestone,
        fallback.luckyRollSessionsByMilestone
      ),
      spaceExcavatorProgressByEvent: sanitizeSpaceExcavatorProgressByEvent(
        data.space_excavator_progress_by_event,
        fallback.spaceExcavatorProgressByEvent
      ),
      companionFeastProgressByEvent: sanitizeCompanionFeastProgressByEvent(
        data.companion_feast_progress_by_event,
        fallback.companionFeastProgressByEvent
      ),
      fortuneEngineProgressByEvent: sanitizeFortuneEngineProgressByEvent(
        data.fortune_engine_progress_by_event,
        fallback.fortuneEngineProgressByEvent
      ),
      skyboundAcademyProgressByEvent: sanitizeSkyboundAcademyProgressByEvent(
        data.skybound_academy_progress_by_event,
        fallback.skyboundAcademyProgressByEvent
      ),
      journeyDiscArenaProgressByEvent: sanitizeJourneyDiscArenaProgressByEvent(
        data.journey_disc_arena_progress_by_event,
        fallback.journeyDiscArenaProgressByEvent
      ),
      journeyDiscArmory: sanitizeJourneyDiscArmory(
        data.journey_disc_armory,
        fallback.journeyDiscArmory
      ),
      crystalMinersProgressByEvent: sanitizeCrystalMinersProgressByEvent(data.crystal_miners_progress_by_event, fallback.crystalMinersProgressByEvent),
      momentumMatrixProgressByEvent: sanitizeMomentumMatrixProgressByEvent(
        data.momentum_matrix_progress_by_event,
        fallback.momentumMatrixProgressByEvent
      )
    },
    fallback
  );
  if (hydratedRecord.runtimeVersion > fallback.runtimeVersion && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(getStorageKey(session2.user.id), JSON.stringify(hydratedRecord));
    } catch {
    }
  }
  setRemoteBackoffUntil(session2.user.id, null);
  logIslandRunEntryDebug("runtime_state_hydrate_query_success", {
    userId: session2.user.id,
    source: "table",
    ...getRuntimeStateDebugFields(hydratedRecord)
  });
  return { record: hydratedRecord, source: "table" };
}
async function writeIslandRunGameStateRecord(options) {
  const {
    session: session2,
    client,
    record,
    skipQueueReplay = false,
    triggerSource = "runtime_state_write",
    conflictMode = "merge"
  } = options;
  const existingLocalRecord = readIslandRunGameStateRecord(session2);
  const localRecord = {
    ...record,
    runtimeVersion: Math.max(record.runtimeVersion, existingLocalRecord.runtimeVersion)
  };
  const hasPendingWrite = (() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(getPendingWriteStorageKey(session2.user.id)) !== null;
    } catch {
      return false;
    }
  })();
  if (!hasPendingWrite && areIslandRunGameStateRecordsGameplayEqual(existingLocalRecord, localRecord)) {
    if (localRecord.runtimeVersion > existingLocalRecord.runtimeVersion && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(getStorageKey(session2.user.id), JSON.stringify(localRecord));
      } catch {
      }
    }
    logIslandRunEntryDebug("runtime_state_persist_noop_skipped", {
      userId: session2.user.id,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord)
    });
    return { ok: true };
  }
  const runtimeBaseVersion = Math.max(0, Math.floor(localRecord.runtimeVersion));
  const clientActionId = buildRuntimeClientActionId(session2.user.id, localRecord);
  const coordinator = getRuntimeCommitCoordinator(session2.user.id);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(getStorageKey(session2.user.id), JSON.stringify(localRecord));
    } catch {
    }
  }
  const enqueuePendingWrite = (pendingRecord, pendingConflictMode = conflictMode) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(getPendingWriteStorageKey(session2.user.id), JSON.stringify(pendingRecord));
      window.localStorage.setItem(
        getPendingWriteConflictModeStorageKey(session2.user.id),
        pendingConflictMode
      );
    } catch {
    }
  };
  const readPendingWrite = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(getPendingWriteStorageKey(session2.user.id));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return toRecord(parsed, getDefaultRecord());
    } catch {
      return null;
    }
  };
  const readPendingWriteConflictMode = () => {
    if (typeof window === "undefined") return "merge";
    try {
      return window.localStorage.getItem(getPendingWriteConflictModeStorageKey(session2.user.id)) === "replace" ? "replace" : "merge";
    } catch {
      return "merge";
    }
  };
  const clearPendingWrite = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(getPendingWriteStorageKey(session2.user.id));
      window.localStorage.removeItem(getPendingWriteConflictModeStorageKey(session2.user.id));
    } catch {
    }
  };
  const parkCommitAction = (reason, parkedRecord, parkedConflictMode = conflictMode) => {
    coordinator.parkedReason = reason;
    coordinator.parkedActionId = buildRuntimeClientActionId(session2.user.id, parkedRecord);
    coordinator.parkedRecord = parkedRecord;
    coordinator.parkedConflictMode = parkedConflictMode;
  };
  if (isDemoSession(session2) || !client) {
    enqueuePendingWrite(localRecord);
    logIslandRunEntryDebug("runtime_state_persist_skipped_remote", {
      userId: session2.user.id,
      reason: isDemoSession(session2) ? "demo_session" : "missing_client",
      ...getRuntimeStateDebugFields(localRecord)
    });
    return { ok: true };
  }
  const deviceSessionId = getIslandRunDeviceSessionId(session2.user.id);
  const remoteBackoffUntil = getRemoteBackoffUntil(session2.user.id);
  if (remoteBackoffUntil !== null) {
    coordinator.syncState = "blocked_remote_backoff";
    parkCommitAction("backoff", localRecord);
    enqueuePendingWrite(localRecord);
    logIslandRunEntryDebug("runtime_state_commit_blocked", {
      userId: session2.user.id,
      reason: "remote_backoff_active",
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: true,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord)
    });
    logIslandRunEntryDebug("runtime_state_commit_parked", {
      userId: session2.user.id,
      reason: "remote_backoff_active",
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: true,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord)
    });
    logIslandRunEntryDebug("runtime_state_persist_skipped_remote", {
      userId: session2.user.id,
      reason: "remote_backoff_active",
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      ...getRuntimeStateDebugFields(localRecord)
    });
    return { ok: true };
  }
  if (coordinator.inFlightActionIds.has(clientActionId) || coordinator.parkedActionId === clientActionId) {
    logIslandRunEntryDebug("runtime_state_commit_blocked", {
      userId: session2.user.id,
      reason: "duplicate_client_action_id",
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: true,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord)
    });
    return { ok: true };
  }
  if (coordinator.inFlightCount > 0) {
    parkCommitAction("single_flight", localRecord);
    enqueuePendingWrite(localRecord);
    logIslandRunEntryDebug("runtime_state_commit_parked", {
      userId: session2.user.id,
      reason: "single_flight_inflight",
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: true,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord)
    });
    return { ok: true };
  }
  logIslandRunEntryDebug("runtime_state_persist_start", {
    userId: session2.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    clientActionId,
    commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
    runtimeBaseVersion,
    inFlightCount: coordinator.inFlightCount,
    syncState: coordinator.syncState,
    isPersistBlocked: false,
    triggerSource,
    ...getRuntimeStateDebugFields(localRecord),
    runtimeVersion: localRecord.runtimeVersion
  });
  if (!skipQueueReplay) {
    const pendingWrite = readPendingWrite();
    if (pendingWrite) {
      const pendingConflictMode = readPendingWriteConflictMode();
      const resumedActionId = buildRuntimeClientActionId(session2.user.id, pendingWrite);
      logIslandRunEntryDebug("runtime_state_commit_resumed", {
        userId: session2.user.id,
        reason: "pending_write_replay",
        clientActionId: resumedActionId,
        commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
        runtimeBaseVersion: pendingWrite.runtimeVersion,
        inFlightCount: coordinator.inFlightCount,
        syncState: coordinator.syncState,
        isPersistBlocked: false,
        triggerSource,
        ...getRuntimeStateDebugFields(pendingWrite)
      });
      const replayResult = await writeIslandRunGameStateRecord({
        session: session2,
        client,
        record: pendingWrite,
        skipQueueReplay: true,
        triggerSource: "queue_replay",
        conflictMode: pendingConflictMode
      });
      if (replayResult.ok) {
        clearPendingWrite();
      } else {
        return replayResult;
      }
    }
  }
  coordinator.inFlightCount += 1;
  coordinator.inFlightActionIds.add(clientActionId);
  coordinator.syncState = "committing";
  const tryConditionalWrite = async (candidate) => {
    const expectedVersion = Math.max(0, Math.floor(candidate.runtimeVersion));
    const commitAttemptId = buildRuntimeCommitAttemptId(session2.user.id);
    logIslandRunEntryDebug("runtime_state_commit_attempt", {
      userId: session2.user.id,
      clientActionId,
      commitAttemptId,
      runtimeBaseVersion: expectedVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: false,
      triggerSource,
      ...getRuntimeStateDebugFields(candidate)
    });
    const payload = toRemoteRow(candidate, expectedVersion + 1, deviceSessionId);
    const commitResult = await commitIslandRunRuntimeSnapshot({
      client,
      deviceSessionId,
      expectedVersion,
      payload,
      clientActionId
    });
    if (commitResult.status === "applied" && typeof commitResult.nextVersion === "number") {
      return { status: "ok", nextVersion: commitResult.nextVersion };
    }
    if (commitResult.status === "conflict") {
      return { status: "conflict" };
    }
    return {
      status: "error",
      error: commitResult.error ?? { message: "Unknown commit action error.", code: "unknown_commit_action_error" }
    };
  };
  try {
    let persistedRecord = localRecord;
    let writeResult = await tryConditionalWrite(localRecord);
    if (writeResult.status === "conflict") {
      const latest = await hydrateIslandRunGameStateRecordWithSource({ session: session2, client });
      if (latest.source === "table") {
        const merged = resolveIslandRunRecordForConflict({
          remote: latest.record,
          local: localRecord,
          conflictMode
        });
        writeResult = await tryConditionalWrite(merged);
        if (writeResult.status === "ok") {
          persistedRecord = merged;
        }
      } else {
        writeResult = {
          status: "error",
          error: {
            message: "Runtime state conflict detected and latest server row could not be loaded.",
            code: "runtime_conflict_remote_unavailable"
          }
        };
      }
    }
    if (writeResult.status === "error") {
      const { error } = writeResult;
      const conflictRecoveryGateTriggered = getNormalizedRuntimeStateError(error).code === "runtime_conflict_remote_unavailable";
      const remoteBackoffTriggered = conflictRecoveryGateTriggered || isTransportLikeRuntimeStateError(error) || isSchemaMismatchRuntimeStateError(error);
      const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session2.user.id) : null;
      if (conflictRecoveryGateTriggered) {
        coordinator.syncState = "blocked_conflict_recovery";
      } else if (remoteBackoffTriggered) {
        coordinator.syncState = "blocked_remote_backoff";
      }
      logIslandRunEntryDebug("runtime_state_persist_error", {
        userId: session2.user.id,
        message: error.message,
        code: error.code ?? null,
        remoteBackoffTriggered,
        remoteBackoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
        clientActionId,
        commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
        runtimeBaseVersion,
        inFlightCount: coordinator.inFlightCount,
        syncState: coordinator.syncState,
        isPersistBlocked: remoteBackoffTriggered,
        triggerSource,
        ...getRuntimeStateDebugFields(localRecord)
      });
      if (remoteBackoffTriggered) {
        parkCommitAction(conflictRecoveryGateTriggered ? "conflict_recovery" : "backoff", localRecord);
        enqueuePendingWrite(localRecord);
        logIslandRunEntryDebug("runtime_state_commit_blocked", {
          userId: session2.user.id,
          reason: conflictRecoveryGateTriggered ? "conflict_recovery_gate_active" : "remote_backoff_active",
          backoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
          clientActionId,
          commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
          runtimeBaseVersion,
          inFlightCount: coordinator.inFlightCount,
          syncState: coordinator.syncState,
          isPersistBlocked: true,
          triggerSource,
          ...getRuntimeStateDebugFields(localRecord)
        });
        return { ok: true };
      }
      enqueuePendingWrite(localRecord);
      return { ok: false, errorMessage: error.message ?? "Unknown runtime state persistence error." };
    }
    if (writeResult.status !== "ok") {
      return { ok: false, errorMessage: "Runtime state persistence did not reach a terminal success state." };
    }
    setRemoteBackoffUntil(session2.user.id, null);
    const hasNewerParkedRecord = Boolean(
      coordinator.parkedRecord && coordinator.parkedActionId && coordinator.parkedActionId !== clientActionId
    );
    if (!hasNewerParkedRecord) {
      clearPendingWrite();
    }
    if (typeof window !== "undefined") {
      try {
        const currentLocal = readIslandRunGameStateRecord(session2);
        const localGameplayIsNewer = hasNewerParkedRecord && !areIslandRunGameStateRecordsGameplayEqual(currentLocal, persistedRecord);
        const persisted = {
          ...localGameplayIsNewer ? currentLocal : persistedRecord,
          runtimeVersion: Math.max(currentLocal.runtimeVersion, writeResult.nextVersion)
        };
        window.localStorage.setItem(getStorageKey(session2.user.id), JSON.stringify(persisted));
      } catch {
      }
    }
    coordinator.syncState = "idle";
    logIslandRunEntryDebug("runtime_state_persist_success", {
      userId: session2.user.id,
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: false,
      triggerSource,
      ...getRuntimeStateDebugFields(persistedRecord),
      runtimeVersion: writeResult.nextVersion
    });
    if (hasNewerParkedRecord && coordinator.parkedRecord && coordinator.parkedActionId) {
      const resumedRecord = coordinator.parkedRecord;
      const resumedActionId = coordinator.parkedActionId;
      const resumedReason = coordinator.parkedReason;
      const resumedConflictMode = coordinator.parkedConflictMode;
      coordinator.parkedRecord = null;
      coordinator.parkedActionId = null;
      coordinator.parkedConflictMode = "merge";
      coordinator.parkedReason = null;
      const currentLocalAtResume = readIslandRunGameStateRecord(session2);
      logIslandRunEntryDebug("runtime_state_parked_resume_debug", {
        userId: session2.user.id,
        clientActionId: resumedActionId,
        resumedRuntimeVersion: resumedRecord.runtimeVersion,
        currentLocalRuntimeVersion: currentLocalAtResume.runtimeVersion,
        syncState: coordinator.syncState,
        resumedTokenIndex: resumedRecord.tokenIndex,
        currentLocalTokenIndex: currentLocalAtResume.tokenIndex,
        resumedDicePool: resumedRecord.dicePool,
        currentLocalDicePool: currentLocalAtResume.dicePool,
        resumedEssence: resumedRecord.essence,
        currentLocalEssence: currentLocalAtResume.essence,
        reason: resumedReason === "single_flight" ? "single_flight_drain" : "backoff_expired"
      });
      logIslandRunEntryDebug("runtime_state_commit_resumed", {
        userId: session2.user.id,
        reason: resumedReason === "single_flight" ? "single_flight_drain" : "backoff_expired",
        clientActionId: resumedActionId,
        commitAttemptId: buildRuntimeCommitAttemptId(session2.user.id),
        runtimeBaseVersion: resumedRecord.runtimeVersion,
        inFlightCount: coordinator.inFlightCount,
        syncState: coordinator.syncState,
        isPersistBlocked: false,
        triggerSource: "resume_from_parked_action",
        ...getRuntimeStateDebugFields(resumedRecord)
      });
      const nextTriggerSource = resumedReason === "single_flight" ? "resume_after_single_flight" : "resume_after_backoff";
      if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
        window.setTimeout(() => {
          void writeIslandRunGameStateRecord({
            session: session2,
            client,
            record: resumedRecord,
            skipQueueReplay: true,
            triggerSource: nextTriggerSource,
            conflictMode: resumedConflictMode
          });
        }, 0);
      } else {
        void Promise.resolve().then(
          () => writeIslandRunGameStateRecord({
            session: session2,
            client,
            record: resumedRecord,
            skipQueueReplay: true,
            triggerSource: nextTriggerSource,
            conflictMode: resumedConflictMode
          })
        );
      }
    }
    return { ok: true };
  } finally {
    coordinator.inFlightActionIds.delete(clientActionId);
    if (coordinator.inFlightCount <= 0) {
      logIslandRunEntryDebug("runtime_state_commit_coordinator_inflight_underflow", {
        userId: session2.user.id,
        clientActionId,
        runtimeBaseVersion,
        inFlightCount: coordinator.inFlightCount,
        syncState: coordinator.syncState,
        triggerSource
      });
      coordinator.inFlightCount = 0;
    } else {
      coordinator.inFlightCount -= 1;
    }
    if (coordinator.inFlightCount === 0) {
      coordinator.syncState = "idle";
    }
  }
}

// src/features/gamification/level-worlds/services/islandRunStateStore.ts
var slotsByUser = /* @__PURE__ */ new Map();
function getSlot(session2) {
  const userId = session2.user.id;
  let slot = slotsByUser.get(userId);
  if (!slot) {
    slot = {
      snapshot: readIslandRunGameStateRecord(session2),
      listeners: /* @__PURE__ */ new Set()
    };
    slotsByUser.set(userId, slot);
  }
  return slot;
}
function publish(slot, next) {
  if (slot.snapshot === next) return;
  const prev = slot.snapshot;
  slot.snapshot = next;
  if (prev.tokenIndex !== next.tokenIndex) {
    logIslandRunEntryDebug("island_run_state_store_publish_token_index_change", {
      tokenIndexBefore: prev.tokenIndex,
      tokenIndexAfter: next.tokenIndex,
      runtimeVersionBefore: prev.runtimeVersion,
      runtimeVersionAfter: next.runtimeVersion
    });
  }
  for (const listener of Array.from(slot.listeners)) {
    try {
      listener();
    } catch (err) {
      console.warn("[IslandRunStateStore] subscriber threw:", err);
    }
  }
}
function getIslandRunStateSnapshot(session2) {
  return getSlot(session2).snapshot;
}
function subscribeIslandRunState(session2, listener) {
  const slot = getSlot(session2);
  slot.listeners.add(listener);
  return () => {
    slot.listeners.delete(listener);
  };
}
async function commitIslandRunState(options) {
  const { session: session2, client, record, triggerSource, conflictMode } = options;
  const slot = getSlot(session2);
  publish(slot, record);
  return writeIslandRunGameStateRecord({
    session: session2,
    client,
    record,
    triggerSource: triggerSource ?? "state_store_commit",
    conflictMode
  });
}
function refreshIslandRunStateFromLocal(session2) {
  const slot = getSlot(session2);
  const fresh = readIslandRunGameStateRecord(session2);
  logIslandRunEntryDebug("island_run_state_store_refresh_from_local", {
    userId: session2.user.id,
    tokenIndexBefore: slot.snapshot.tokenIndex,
    tokenIndexAfter: fresh.tokenIndex,
    runtimeVersionBefore: slot.snapshot.runtimeVersion,
    runtimeVersionAfter: fresh.runtimeVersion
  });
  publish(slot, fresh);
}
function __resetIslandRunStateStoreForTests() {
  slotsByUser.clear();
}

// src/features/gamification/level-worlds/services/islandRunEventEngine.ts
function recordEventProgress(options) {
  return applyIslandRunContractV2RewardBarProgress(options);
}
function recordEventMinigameCompletion(options) {
  return recordEventProgress({
    state: options.state,
    source: { kind: "event_minigame_complete", minigameId: options.minigameId },
    nowMs: options.nowMs,
    multiplier: options.multiplier
  });
}

// src/features/gamification/level-worlds/services/islandRunEconomyTelemetry.ts
var ISLAND_RUN_ECONOMY_SOURCES = {
  constructionLevelDice: "construction_level_dice",
  landmarkCompletionDice: "landmark_completion_dice",
  rewardBarDice: "reward_bar_dice",
  stickerCompletionBonusDice: "sticker_completion_bonus_dice",
  luckyRollDice: "lucky_roll_dice",
  spaceExcavatorMilestoneDice: "space_excavator_milestone_dice",
  crystalMinersMilestoneDice: "crystal_miners_milestone_dice",
  companionFeastMilestoneDice: "companion_feast_milestone_dice",
  fortuneEngineMilestoneDice: "fortune_engine_milestone_dice",
  fortuneEngineFinaleDice: "fortune_engine_finale_dice",
  passiveRegenDice: "passive_regen_dice",
  dailyTreatDice: "daily_treat_dice",
  dailySpinDice: "daily_spin_dice",
  welcomePackDice: "welcome_pack_dice",
  firstSessionTutorialDice: "first_session_tutorial_dice",
  firstRunStarterDice: "first_run_starter_dice",
  devAdminGrantDice: "dev_admin_grant_dice",
  tokenHopDice: "token_hop_dice",
  eggRewardDice: "egg_reward_dice",
  bossTrialDice: "boss_trial_dice",
  creatureFormUpgradeDice: "creature_form_upgrade_dice",
  signatureTreasureDice: "signature_treasure_dice",
  signatureMissionFinaleDice: "signature_mission_finale_dice",
  fullRestorationDice: "full_restoration_dice",
  unknownDiceDelta: "unknown_dice_delta"
};
var DEFAULT_SESSION_ID = "default";
var ledgers = /* @__PURE__ */ new Map();
function normalizeSessionId(sessionId) {
  const trimmed = typeof sessionId === "string" ? sessionId.trim() : "";
  return trimmed || DEFAULT_SESSION_ID;
}
function normalizeAmount(amount) {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.floor(amount));
}
function getLedger(sessionId, nowMs = Date.now()) {
  const key = normalizeSessionId(sessionId);
  const existing = ledgers.get(key);
  if (existing) return existing;
  const ledger = {
    sessionId: key,
    startedAtMs: Math.floor(nowMs),
    updatedAtMs: Math.floor(nowMs),
    diceInflowBySource: /* @__PURE__ */ new Map(),
    diceOutflowBySink: /* @__PURE__ */ new Map(),
    counters: /* @__PURE__ */ new Map(),
    multiplierTotal: 0,
    multiplierSamples: 0,
    highestMultiplierUsed: 0,
    rewardBarTierReached: 0,
    events: []
  };
  ledgers.set(key, ledger);
  return ledger;
}
function addToMap(map, key, amount) {
  map.set(key, (map.get(key) ?? 0) + amount);
}
function recordEvent(ledger, event) {
  ledger.updatedAtMs = Math.max(ledger.updatedAtMs, event.atMs);
  ledger.events.push(event);
}
function recordIslandRunDiceInflow(options) {
  const amount = normalizeAmount(options.amount);
  if (amount < 1) return;
  const atMs = Math.floor(options.atMs ?? Date.now());
  const ledger = getLedger(options.sessionId, atMs);
  addToMap(ledger.diceInflowBySource, options.source, amount);
  recordEvent(ledger, {
    direction: "inflow",
    metric: options.source,
    amount,
    atMs,
    sessionId: ledger.sessionId,
    metadata: options.metadata
  });
}

// src/features/gamification/level-worlds/services/islandRunCrystalMinersActions.ts
var EMPTY_PROGRESS = createCrystalMinersProgress();
function applyCrystalMinersAction(options) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const startedAt = Date.now();
    const reject = (failureReason) => {
      options.observer?.rejected(options.command, failureReason);
      return { ok: false, failureReason };
    };
    const current = getIslandRunStateSnapshot(options.session);
    const event = current.activeTimedEvent;
    const nowMs = options.nowMs ?? Date.now();
    if (!event || event.eventId !== options.eventId || event.expiresAtMs <= nowMs) return reject("event_expired");
    const career = resolveCrystalMinersProgressForEvent(current.crystalMinersProgressByEvent, options.eventId) ?? EMPTY_PROGRESS;
    const progress = sanitizeCrystalMinersProgressByEvent({ career }).career;
    if (!progress) return reject("invalid_save");
    if (options.expectedRevision !== progress.revision) return reject("stale_action");
    const tickets = current.minigameTicketsByEvent[options.eventId] ?? 0;
    let nextProgress = null;
    let simulation;
    let playSpend = null;
    let rewardState = null;
    let milestoneReward;
    switch (options.command.kind) {
      case "merge_group":
        if (progress.level < MINER_GROUP_MERGE_LEVEL) return reject("group_merge_locked");
        nextProgress = mergeMinerToolGroup(progress, options.command.tier);
        if (!nextProgress) return reject("no_merge_pairs");
        break;
      case "claim": {
        const target = options.command.milestone;
        milestoneReward = MINER_EVENT_MILESTONES.find((m) => m.levels === target);
        if (!milestoneReward || progress.eventTrack.levelsCleared < target) return reject("milestone_locked");
        if (progress.eventTrack.claimedMilestones.includes(target)) return reject("already_claimed");
        nextProgress = {
          ...progress,
          ore: progress.ore,
          eventTrack: { ...progress.eventTrack, claimedMilestones: [...progress.eventTrack.claimedMilestones, target] }
        };
        break;
      }
      case "upgrade":
        nextProgress = upgradeMinerForge(progress);
        if (!nextProgress) return reject(progress.forgeLevel >= MINER_FORGE_UNLOCKS.length ? "forge_max" : progress.level < MINER_FORGE_UNLOCKS[progress.forgeLevel] ? "forge_locked" : "insufficient_ore");
        break;
      case "trash":
        nextProgress = discardMinerTool(progress, options.command.slot);
        if (!nextProgress) return reject(progress.tools.filter(Boolean).length <= 1 ? "last_tool" : "invalid_tool");
        break;
      case "open":
        nextProgress = openMinerGift(progress, options.command.slot, Math.random());
        break;
      case "gift":
        nextProgress = claimWaitingMinerGift(progress);
        break;
      case "buy":
        nextProgress = buyMinerTool(progress);
        if (!nextProgress) return reject(progress.tools.includes(0) ? "insufficient_ore" : "deck_full");
        break;
      case "move":
        nextProgress = arrangeMinerTools(progress, options.command.from, options.command.to);
        if (!nextProgress) return reject("invalid_move");
        break;
      case "dig":
        if (progress.eventTrack.levelsCleared >= MINER_LEVEL_COUNT) return reject("campaign_complete");
        if (!progress.tools.some((t) => t > 0)) return reject("open_gifts_first");
        playSpend = spendEventGamePlay("crystal_miners", tickets, progress.dropTickets);
        if (!playSpend) return reject("insufficient_tickets");
        simulation = simulateMinerDig(progress);
        nextProgress = { ...settleMinerDig(progress, simulation), dropTickets: playSpend.savedPlays + simulation.ticketDrops };
        if (simulation.broken > 0) rewardState = recordEventMinigameCompletion({ state: current, minigameId: "crystal_miners", nowMs });
        nextProgress.lastReceipt.rewardProgress = Math.max(0, (rewardState?.rewardBarProgress ?? current.rewardBarProgress) - current.rewardBarProgress);
        break;
    }
    if (!nextProgress) return reject("invalid_action");
    const milestones = milestoneReward ? [milestoneReward] : simulation ? MINER_EVENT_MILESTONES.filter((m) => nextProgress.eventTrack.levelsCleared >= m.levels && !nextProgress.eventTrack.claimedMilestones.includes(m.levels)) : [];
    const prizes = milestones.map((m) => resolveMinerMilestoneReward(m, options.session.user.id));
    const prize = prizes.reduce((total, p) => ({ dice: total.dice + p.dice, essence: total.essence + p.essence, tickets: total.tickets + p.tickets }), { dice: 0, essence: 0, tickets: 0 });
    if (simulation) {
      nextProgress.eventTrack = { ...nextProgress.eventTrack, claimedMilestones: [...nextProgress.eventTrack.claimedMilestones, ...milestones.map((m) => m.levels)] };
      nextProgress.lastReceipt.milestoneRewards = prizes.map((p) => p.label);
    }
    nextProgress.dropTickets += prize.tickets;
    const next = {
      ...current,
      ...rewardState ?? {},
      runtimeVersion: current.runtimeVersion + 1,
      dicePool: current.dicePool + (prize?.dice ?? 0),
      essence: current.essence + (prize?.essence ?? 0),
      essenceLifetimeEarned: current.essenceLifetimeEarned + (prize?.essence ?? 0),
      minigameTicketsByEvent: playSpend?.ticketsSpent ? { ...current.minigameTicketsByEvent, [options.eventId]: tickets - playSpend.ticketsSpent } : current.minigameTicketsByEvent,
      crystalMinersProgressByEvent: {
        ...current.crystalMinersProgressByEvent,
        [options.eventId]: { ...nextProgress, revision: progress.revision + 1, updatedAtMs: nowMs }
      }
    };
    const persistence = await commitIslandRunState({ session: options.session, client: options.client, record: next, triggerSource: `crystal_miners_${options.command.kind}` });
    if (prize.dice > 0) recordIslandRunDiceInflow({ source: ISLAND_RUN_ECONOMY_SOURCES.crystalMinersMilestoneDice, amount: prize.dice, sessionId: options.session.user.id, metadata: { eventId: options.eventId, levels: milestones.map((m) => m.levels).join(",") } });
    options.observer?.accepted(options.command, progress, next.crystalMinersProgressByEvent[options.eventId], simulation, Date.now() - startedAt, !persistence.ok);
    return { ok: true, simulation, syncPending: !persistence.ok, rewardLabel: options.command.kind === "claim" ? prizes[0]?.label : void 0 };
  }).catch((error) => {
    options.observer?.failure(error, options.command.kind);
    throw error;
  });
}
function createCrystalMinersBridge(options) {
  const observer = createMinerObserver({ userId: options.session.user.id, eventId: options.eventId, remoteEnabled: Boolean(options.client), context: () => {
    const state2 = getIslandRunStateSnapshot(options.session);
    return { progress: getCrystalMinersCareer(state2.crystalMinersProgressByEvent) ?? EMPTY_PROGRESS, tickets: eventGamePlaysAvailable("crystal_miners", state2.minigameTicketsByEvent[options.eventId] ?? 0, getCrystalMinersCareer(state2.crystalMinersProgressByEvent)?.dropTickets ?? 0), dice: state2.dicePool, island: state2.currentIslandNumber };
  } });
  return {
    observe: observer.observe,
    reportError: observer.failure,
    subscribe: (listener) => subscribeIslandRunState(options.session, listener),
    getProgress: () => resolveCrystalMinersProgressForEvent(getIslandRunStateSnapshot(options.session).crystalMinersProgressByEvent, options.eventId) ?? EMPTY_PROGRESS,
    getDice: () => getIslandRunStateSnapshot(options.session).dicePool,
    getTickets: () => {
      const state2 = getIslandRunStateSnapshot(options.session);
      return eventGamePlaysAvailable("crystal_miners", state2.minigameTicketsByEvent[options.eventId] ?? 0, getCrystalMinersCareer(state2.crystalMinersProgressByEvent)?.dropTickets ?? 0);
    },
    getEventTrack: () => (resolveCrystalMinersProgressForEvent(getIslandRunStateSnapshot(options.session).crystalMinersProgressByEvent, options.eventId) ?? EMPTY_PROGRESS).eventTrack,
    getExpiresAt: () => {
      const event = getIslandRunStateSnapshot(options.session).activeTimedEvent;
      return event?.eventId === options.eventId ? event.expiresAtMs : 0;
    },
    act: (command, expectedRevision) => applyCrystalMinersAction({ ...options, command, expectedRevision, observer })
  };
}

// src/features/gamification/level-worlds/services/islandRunMissionBriefing.ts
var COMMAND_TEAM = Object.freeze([
  {
    id: "ceo",
    name: "Aurelia Vey",
    role: "CEO \xB7 Universe Association",
    initials: "AV"
  },
  {
    id: "field",
    name: "Captain Ivo",
    role: "Field Operations",
    initials: "CI",
    portraitSrc: "/islands/001/story/portraits/ivo.webp"
  },
  {
    id: "diplomacy",
    name: "Nia Sol",
    role: "Diplomatic Relations",
    initials: "NS"
  },
  {
    id: "engineering",
    name: "Torren Vale",
    role: "Restoration Systems",
    initials: "TV"
  },
  {
    id: "habitats",
    name: "Amara Moss",
    role: "Habitats & Civilian Care",
    initials: "AM"
  }
]);
var AUTHORED_MISSIONS = Object.freeze({
  1: {
    progressKind: "first_light_assembly",
    headline: "Build the Diplomatic Peace Signing Assembly",
    missionStatement: "Collect dynamite as you explore Island 001. Use it to excavate and create the Diplomatic Peace Signing Assembly: a shared place where the island can gather and sign for peace.",
    primaryObjective: "Collect ten charges and detonate three batches: 3, 5, then 2.",
    supportingObjective: "Raise Hatchery, Habit, Event Arena and Wisdom to Level 3. The Assembly replaces a separate Boss landmark on Island 001.",
    fieldProtocol: "One controlled blast at a time. Protect the route above while every charge widens and deepens the same excavation.",
    caretakerSignal: "Give us a place where disagreement can become understanding instead of distance."
  },
  2: {
    progressKind: "celestial_redocking",
    headline: "The Great Re-Docking",
    missionStatement: "Celestial Sky Kingdom is drifting apart. Winch its four tethered landmark platforms back to the central kingdom and lock every docking collar safely into place.",
    primaryObjective: "Dock all four celestial platforms.",
    supportingObjective: "Restore the five island landmarks.",
    fieldProtocol: "One platform locks after each five completed rolls; the canonical route never moves.",
    caretakerSignal: "Bring our districts close enough to share one sky again."
  },
  3: {
    progressKind: "frostwell_iceworks",
    headline: "Open the Frostwell",
    missionStatement: "Frostwild survives above an immense frozen ocean. Help its builders drill through the ice so the fishery and reservoir can start the instant the water layer is reached.",
    primaryObjective: "Earn drill spins and reach the 500-metre water layer.",
    supportingObjective: "At 500 metres, commission the Iceworks automatically and restore fish and fresh-water circulation.",
    fieldProtocol: "Protect the route while the offshore auger is under load.",
    caretakerSignal: "The water is not gone. It is waiting beneath everything we fear to break."
  },
  4: {
    progressKind: "staged_restoration",
    headline: "Raise the Broken Causeway",
    missionStatement: "Crown Citadel has lost the bridges joining its four outer districts to the central court. Recover the masonry and raise three causeway spans from the water.",
    primaryObjective: "Raise all three causeway spans.",
    supportingObjective: "Restore the five citadel landmarks.",
    fieldProtocol: "Reconnect the districts without moving or obstructing the canonical route.",
    caretakerSignal: "A citadel cannot govern people it can no longer reach."
  },
  5: {
    progressKind: "arena_guardian",
    headline: "Defeat the Arena Guardian",
    missionStatement: "Sunshore Arena is held by its guardian. Restore the island landmarks, enter the civic arena and win the final audience.",
    primaryObjective: "Defeat the Arena guardian.",
    supportingObjective: "Restore all five island landmarks.",
    fieldProtocol: "The guardian remains the final canonical landmark objective.",
    caretakerSignal: "Restore the shore, then meet our guardian in the arena."
  },
  16: {
    progressKind: "staged_restoration",
    headline: "Rephase the Moon Mirrors",
    missionStatement: "Moonveil Nexus has lost the beam chain that stabilizes its central moon core. Rotate five great mirrors back into alignment and restore the lunar circuit.",
    primaryObjective: "Align all five moon mirrors.",
    supportingObjective: "Restore the five Nexus landmarks.",
    fieldProtocol: "Each mirror must hold alignment before the next beam is formed.",
    caretakerSignal: "Let the mirrors speak to one another again."
  },
  7: {
    progressKind: "staged_restoration",
    headline: "Restore the Breathline",
    missionStatement: "Abyssal Pearl Kingdom is losing pressure across its living domes. Reconnect the Breathline through four districts and return oxygen to the pearl heart.",
    primaryObjective: "Restore pressure to all four districts.",
    supportingObjective: "Restore the five underwater landmarks.",
    fieldProtocol: "Repressurize one district at a time and protect the returning fauna.",
    caretakerSignal: "Give every district room to breathe again."
  },
  8: {
    progressKind: "staged_restoration",
    headline: "Awaken the Living Compass",
    missionStatement: "Five Wayfinder seals lie dormant across the lost city. Recover their glyphs and wake the temple network so its gathered energy can reach the sky and call down the Compass Book.",
    primaryObjective: "Awaken all five Living Compass seals.",
    supportingObjective: "Restore the jungle landmarks while keeping the 36-tile expedition route open.",
    fieldProtocol: "Follow the old paths in order. Each awakened seal teaches the next ruin how to answer.",
    caretakerSignal: "When every direction speaks as one, the sky will return what the city protected."
  },
  9: {
    progressKind: "staged_restoration",
    headline: "Restart the Ignition Chain",
    missionStatement: "The lava kingdom draws power from a crater far below the route. Restore its suspended steel works and stabilize the machinery without sealing the volcano or cooling its living heart.",
    primaryObjective: "Reconnect the crater-spanning forge systems.",
    supportingObjective: "Keep every landmark anchored while the deep engine cycles.",
    fieldProtocol: "Work with the pressure. Never mistake containment for control.",
    caretakerSignal: "The mountain is not angry. It is carrying more power than our old structures can share."
  },
  10: {
    progressKind: "rootheart_powerworks",
    headline: "Restore the Rootheart Powerworks",
    missionStatement: "Rootheart's builders still have craft, water and community, but their great engine is silent. Recover its scattered mechanisms and restore the causal chain from falling water to a city full of warm light.",
    primaryObjective: "Collect all eight Powerworks components around the route.",
    supportingObjective: "Fund the waterworks frame, Heartwheel dynamo and Heartlight network.",
    fieldProtocol: "Keep the Arena clear. Every gear, cable and lantern must tell one physical story.",
    caretakerSignal: "We remember the sound of every workshop lighting up together."
  },
  11: {
    progressKind: "standard_landmarks",
    headline: "Reopen the First Light Route",
    missionStatement: "The preserved First Light settlement now serves a later expedition route. Restore its landmarks and reopen the complete civic circuit without repeating the one-time Concord recovery.",
    primaryObjective: "Complete the five landmark objectives.",
    supportingObjective: "Raise all five landmarks to Level 3.",
    fieldProtocol: "Preserve the original First Light world while runtime Island 011 keeps its own progression identity.",
    caretakerSignal: "The first route can guide a new expedition without becoming the same journey twice."
  },
  12: {
    progressKind: "sunken_sands_treasure",
    headline: "Find the Sunscarab",
    missionStatement: "Sunken Sands hides its first royal treasure beneath the route. Search the ruins through twenty completed rolls, reveal the chamber and claim the Sunscarab Token.",
    primaryObjective: "Search the ruins for twenty completed rolls.",
    supportingObjective: "Claim the Sunscarab and restore the five landmarks.",
    fieldProtocol: "Every accepted canonical roll advances the search once.",
    caretakerSignal: "The first treasure is not lost. It is waiting to be read correctly."
  },
  13: {
    progressKind: "cactus_canyon_spiral",
    headline: "Carve the Canyon Spiral",
    missionStatement: "Cactus Canyon stands on a monumental stone pillar, but its summit railway has no safe route to the settlements below. Collect frontier dynamite and cut a passenger gallery downward through the mountain itself.",
    primaryObjective: "Collect dynamite caches placed around the summit route.",
    supportingObjective: "Blast all sixteen rock-cut sections and connect Union Station to the canyon-floor stop.",
    fieldProtocol: "One controlled blast opens one section. Keep civilians and the summit train clear until every charge is accounted for.",
    caretakerSignal: "The mountain can carry us\u2014if every cut follows the stone instead of fighting it."
  },
  14: {
    progressKind: "great_honeyfall_coronation",
    headline: "Awaken the Great Honeyfall",
    missionStatement: "Honeycomb Kingdom's royal reservoir is dry. Recover four royal nectar charges from the glowing honeycomb route, pour each charge into the palace pressure chamber, and build toward one glorious release.",
    primaryObjective: "Collect four royal nectar charges and fill the royal reservoir.",
    supportingObjective: "Restore the five Honeycomb landmarks while the Honey Egg couriers prepare the coronation flow.",
    fieldProtocol: "One nectar charge commissions one reservoir stage. Watch the pressure, then stand clear when the fourth wax seal breaks.",
    caretakerSignal: "Fill it slowly. The final drop will wake every Honeyfall in the kingdom."
  },
  6: {
    progressKind: "fishermans_fishing",
    headline: "The Hundred-Kilo Catch",
    missionStatement: "The Fisherman\u2019s Village needs a full market catch from its central pond. Land at one of the rod stations around the shore and reel every catch in by hand\u2014but watch the water carefully.",
    primaryObjective: "Land three great catches: 100 kg / 220.5 lb of fish.",
    supportingObjective: "Restore the five village landmarks after the pond disturbance.",
    fieldProtocol: "Every \u{1F3A3} landing is a cast: swipe up when the needle is in the green. Wait too long and the rod overswings into the ground; after a miss, your next two casts are sure things.",
    caretakerSignal: "The old fishers say the pond has a bottom. None of them sound certain."
  },
  20: {
    progressKind: "staged_restoration",
    headline: "Escape the Lava Labyrinth",
    missionStatement: "Central Command orders: build the Lava Labyrinth. The Forge Keepers will meet you at the Obsidian Gate. First solve the restored Level-3 labyrinth. Its final gate triggers an emergency extraction order: recover eight newly revealed Heatshield Plates, forge a compact Iron Skiff at the summit, then ride the molten outflow to the waiting Expedition Ship.",
    primaryObjective: "After the labyrinth is solved, recover eight Heatshield Plates and forge all four Iron Skiff systems.",
    supportingObjective: "Launch from the summit, steer through three glowing junctions, descend the front lavafall and reach the magnetic extraction cradle.",
    fieldProtocol: "The long escape mission remains locked until the ordinary island is fully restored. Once launched: left and right steer, hold forward for speed, and trust the guided current to prevent a failed extraction loop.",
    caretakerSignal: "The shortest path burns. The mindful path carries us home."
  },
  18: {
    progressKind: "staged_restoration",
    headline: "The Great Pollination",
    missionStatement: "The botanical kingdom has beauty in abundance but its living systems have stopped exchanging energy. Restore each landmark family and reconnect springs, roots, glasshouses and pollinators.",
    primaryObjective: "Restore the five Everblossom landmark families.",
    supportingObjective: "Keep the 36-tile pilgrimage route open beneath the growing canopy.",
    fieldProtocol: "Cultivate variety; do not force every living system into symmetry.",
    caretakerSignal: "A garden can be perfectly arranged and still forget how to grow."
  },
  19: {
    progressKind: "staged_restoration",
    headline: "Gift the Wonder Coaster",
    missionStatement: "Coaster Carnival has every stall and lantern, but no coaster. The Theme Park Director waits at the \u{1F3A9} kiosk with a request: build and gift the park its Wonder Express. The coaster is expensive, so earn Money around the island, then order it section by section from the Director or your phone.",
    primaryObjective: "Order and install all three coaster sections, then take the first ride.",
    supportingObjective: "Restore the five carnival landmarks while you raise the coaster fund.",
    fieldProtocol: "Land on a \u{1F3A9} Director tile to talk. Each order spends Money; install the delivered section before ordering the next. Choose a front or middle wagon, and keep your eyes open. The Director is hiding something below the park.",
    caretakerSignal: "Courage is not the absence of the drop. It is choosing to ride again with your eyes open."
  },
  15: {
    progressKind: "standard_landmarks",
    headline: "The Aurora That Learned to Move",
    missionStatement: "A guardian froze the aurora to save her people\u2014and the palace has not changed since. Restore its four living rooms, then help Nivara let the sky move again.",
    primaryObjective: "Reawaken the Frost Nest, Ice Bastion, Aurora Observatory, and Crystal Oracle\u2014then enter the Frozen Throne.",
    supportingObjective: "Carry each room's living light into the Boss Hall and release the Held Dawn without breaking what the ice protected.",
    fieldProtocol: "Move with patience. Clarity guides; it does not control.",
    caretakerSignal: "We survived the storm. Now we need permission to live after it."
  },
  17: {
    progressKind: "staged_restoration",
    headline: "The Titan's Last Thought",
    missionStatement: "The Titan's spine lies in pieces across the island. Collect the eight lost bones on the tiles \u2014 each one flies home and rebuilds its section \u2014 then brew the summoning potion and unlock the skull that rises from the abyss.",
    primaryObjective: "Collect the eight Titan bones to rebuild the spine, then summon the skull and release the spirit within.",
    supportingObjective: "Restore the five landmarks of Titan's Rest.",
    fieldProtocol: "Land on or pass a bone and its spine section rebuilds itself on the spot. Then brew, pour and tinker: the skull opens one mechanism at a time. Puzzle attempts are free and your progress saves.",
    caretakerSignal: "Even what is broken can carry us again."
  }
});
var AUTHORED_MISSION_NAMES = Object.freeze({
  1: "First Light Kingdom",
  2: "Celestial Sky Kingdom",
  3: "Frostmoon Haven",
  4: "Crown Citadel",
  5: "Sunshore Arena",
  6: "Fisherman's Village",
  7: "Abyssal Pearl Kingdom",
  8: "Jungle Expedition",
  9: "The Heartshaft Crucible",
  10: "Rootheart Canopy City",
  11: "First Light Kingdom",
  12: "Sunken Sands",
  13: "Cactus Canyon",
  14: "Honeycomb Kingdom",
  16: "Moonveil Nexus",
  20: "Lava Labyrinth",
  18: "The Everblossom Kingdom",
  19: "Coaster Carnival",
  15: "Crystal Glacier Citadel",
  17: "Titan's Rest"
});

// src/features/gamification/level-worlds/services/islandRunIslandMetadata.ts
var ISLAND_RUN_CANONICAL_SPECIAL_ISLAND_NUMBERS = [
  5,
  12,
  18,
  24,
  30,
  36,
  42,
  48,
  54,
  60,
  66,
  72,
  78,
  84,
  90,
  96,
  102,
  108,
  114,
  120
];
var SPECIAL_ISLAND_NUMBERS = new Set(ISLAND_RUN_CANONICAL_SPECIAL_ISLAND_NUMBERS);
var ISLAND_RUN_MILESTONE_INTERVAL = 10;
var LUCKY_ROLL_RARE_CONFIG_ID = "rare_island_pre_island_v1";
var POST_RARE_LUCKY_ROLL_CONFIG_ID = "rare_island_post_rare_completion_v1";
var TREASURE_PATH_MILESTONE_CONFIG_ID = "treasure_path_post_island_milestone_v1";
var TREASURE_PATH_MILESTONE_TIERS_BY_ISLAND = /* @__PURE__ */ new Map([
  [5, "intro"],
  [20, "early"],
  [30, "rare"],
  [60, "rare"],
  [90, "rare"],
  [120, "rare"]
]);
function normalizeIslandNumber(islandNumber) {
  if (!Number.isFinite(islandNumber)) return 1;
  return Math.max(1, Math.floor(islandNumber));
}
function getIslandRunRarity(islandNumber) {
  const normalizedIslandNumber = normalizeIslandNumber(islandNumber);
  if (!SPECIAL_ISLAND_NUMBERS.has(normalizedIslandNumber)) return "normal";
  if (normalizedIslandNumber % ISLAND_RUN_MILESTONE_INTERVAL === 0) return "rare";
  return "seasonal";
}
function getIslandRunIslandMetadata(islandNumber) {
  const normalizedIslandNumber = normalizeIslandNumber(islandNumber);
  const rarity = getIslandRunRarity(normalizedIslandNumber);
  const isSpecial = rarity !== "normal";
  const isMilestone = normalizedIslandNumber % ISLAND_RUN_MILESTONE_INTERVAL === 0;
  const luckyRollTrigger = rarity === "rare" ? "pre_island" : "none";
  const postRareLuckyRollTrigger = rarity === "rare" ? "post_rare_completion" : "none";
  const treasurePathMilestoneTier = TREASURE_PATH_MILESTONE_TIERS_BY_ISLAND.get(normalizedIslandNumber);
  const treasurePathMilestoneTrigger = treasurePathMilestoneTier ? "post_island_milestone_completion" : "none";
  return {
    islandNumber: normalizedIslandNumber,
    rarity,
    isSpecial,
    isMilestone,
    luckyRollTrigger,
    postRareLuckyRollTrigger,
    treasurePathMilestoneTrigger,
    ...treasurePathMilestoneTier ? { treasurePathMilestoneTier } : {},
    ...luckyRollTrigger === "pre_island" ? { luckyRollConfigId: LUCKY_ROLL_RARE_CONFIG_ID } : {},
    ...postRareLuckyRollTrigger === "post_rare_completion" ? { postRareLuckyRollConfigId: POST_RARE_LUCKY_ROLL_CONFIG_ID } : {},
    ...treasurePathMilestoneTrigger === "post_island_milestone_completion" ? { treasurePathMilestoneConfigId: TREASURE_PATH_MILESTONE_CONFIG_ID } : {}
  };
}

// src/features/gamification/level-worlds/services/islandRunPreIslandLuckyRollGate.ts
var BLOCKING_STATUSES = /* @__PURE__ */ new Set([
  "required_missing_session",
  "required_active",
  "required_completed_unbanked",
  "expired_or_blocked"
]);
function normalizeIslandNumber2(islandNumber) {
  return Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;
}
function normalizeCycleIndex(cycleIndex) {
  return Number.isFinite(cycleIndex) ? Math.max(0, Math.floor(cycleIndex)) : 0;
}
function resolveIslandRunPreIslandLuckyRollGate(options) {
  const islandNumber = normalizeIslandNumber2(options.islandNumber);
  const cycleIndex = normalizeCycleIndex(options.cycleIndex);
  const metadata = getIslandRunIslandMetadata(islandNumber);
  if (!options.featureEnabled || metadata.luckyRollTrigger !== "pre_island") {
    return {
      status: "not_required",
      isRequired: false,
      blocksIslandStart: false,
      islandNumber,
      cycleIndex,
      sessionKey: null,
      luckyRollSession: null
    };
  }
  const sessionKey = getIslandRunLuckyRollSessionKey(cycleIndex, islandNumber);
  const luckyRollSession = options.luckyRollSessionsByMilestone?.[sessionKey] ?? null;
  let status;
  switch (luckyRollSession?.status) {
    case void 0:
      status = "required_missing_session";
      break;
    case "active":
      status = "required_active";
      break;
    case "completed":
      status = "required_completed_unbanked";
      break;
    case "banked":
      status = "satisfied_banked";
      break;
    case "expired":
      status = "expired_or_blocked";
      break;
    default:
      status = "expired_or_blocked";
      break;
  }
  return {
    status,
    isRequired: true,
    blocksIslandStart: BLOCKING_STATUSES.has(status),
    islandNumber,
    cycleIndex,
    sessionKey,
    luckyRollSession
  };
}

// src/features/gamification/level-worlds/services/spaceExcavatorObjects.ts
var SPACE_EXCAVATOR_OBJECT_SHAPES = Object.freeze([
  Object.freeze({
    objectId: "ancient_coin",
    name: "Ancient Coin",
    tier: "common",
    icon: "\u{1FA99}",
    tileOffsets: Object.freeze([[0, 0], [1, 0]])
  }),
  Object.freeze({
    objectId: "lost_compass",
    name: "Lost Compass",
    tier: "uncommon",
    icon: "\u{1F9ED}",
    tileOffsets: Object.freeze([[0, 0], [1, 0], [0, 1]])
  }),
  Object.freeze({
    objectId: "crystal_shard",
    name: "Crystal Shard",
    tier: "rare",
    icon: "\u{1F52E}",
    tileOffsets: Object.freeze([[0, 0], [0, 1], [0, 2], [1, 2]])
  }),
  Object.freeze({
    objectId: "micro_satellite_cluster",
    name: "Micro Satellite Cluster",
    tier: "common",
    icon: "\u{1F6F0}\uFE0F",
    tileOffsets: Object.freeze([[0, 0], [2, 0], [0, 2], [2, 2]])
  }),
  Object.freeze({
    objectId: "fossil_fragments",
    name: "Fossil Fragments",
    tier: "uncommon",
    icon: "\u{1F9B4}",
    tileOffsets: Object.freeze([[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]])
  }),
  Object.freeze({
    objectId: "moon_key",
    name: "Moon Key",
    tier: "epic",
    icon: "\u{1F5DD}\uFE0F",
    tileOffsets: Object.freeze([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]])
  })
]);

// src/features/gamification/level-worlds/services/journeyDiscArenaProgression.ts
var JOURNEY_DISC_ARENA_MILESTONES = Object.freeze([
  { id: "disc_1", points: 60, icon: "\u{1F3B2}", label: "15 dice", reward: { dice: 15 } },
  { id: "disc_2", points: 160, icon: "\u2161", label: "Rank 2 + unlock Aegis", reward: { rank: 2, armoryUpgrade: "aegis_ring" } },
  { id: "disc_3", points: 300, icon: "\u25C9", label: "2 battle tickets + Comet Lv. 2", reward: { eventTickets: 2, armoryUpgrade: "ram_fin" } },
  { id: "disc_4", points: 560, icon: "\u2162", label: "Rank 3 + unlock Pulse", reward: { rank: 3, armoryUpgrade: "pulse_vane" } },
  { id: "disc_5", points: 900, icon: "\u265C", label: "50 dice + Aegis Lv. 2", reward: { dice: 50, armoryUpgrade: "aegis_ring" } },
  { id: "disc_6", points: 1350, icon: "\u{1F48E}", label: "1 diamond + Pulse Lv. 2", reward: { diamonds: 1, armoryUpgrade: "pulse_vane" } }
]);

// src/features/gamification/level-worlds/services/journeyDiscArenaGame.ts
var JOURNEY_DISC_ARENA_FIXED_STEP_SECONDS = 1 / 60;
var RANK_STATS = Object.freeze({
  1: Object.freeze({
    rank: 1,
    name: "Kindled",
    maxShield: 74,
    maxSpin: 100,
    mass: 1,
    radius: 0.68,
    drive: 5.3,
    maxSpeed: 6.6,
    impact: 1,
    stability: 0.86,
    spinDrainPerSecond: 3.2,
    moduleSlots: 1
  }),
  2: Object.freeze({
    rank: 2,
    name: "Resonant",
    maxShield: 98,
    maxSpin: 112,
    mass: 1.16,
    radius: 0.74,
    drive: 5.45,
    maxSpeed: 6.85,
    impact: 1.18,
    stability: 1.02,
    spinDrainPerSecond: 2.95,
    moduleSlots: 1
  }),
  3: Object.freeze({
    rank: 3,
    name: "Ascendant",
    maxShield: 128,
    maxSpin: 126,
    mass: 1.34,
    radius: 0.81,
    drive: 5.6,
    maxSpeed: 7.1,
    impact: 1.38,
    stability: 1.2,
    spinDrainPerSecond: 2.7,
    moduleSlots: 2
  })
});
var JOURNEY_DISC_ARENA_MODULES = Object.freeze({
  ram_fin: Object.freeze({
    id: "ram_fin",
    name: "Comet Fin",
    description: "A forward energy fin that converts speed into stronger impacts.",
    shieldDelta: 0,
    massDelta: 0.04,
    driveDelta: 0,
    maxSpeedDelta: 0.1,
    impactDelta: 0.2,
    stabilityDelta: -0.02
  }),
  aegis_ring: Object.freeze({
    id: "aegis_ring",
    name: "Aegis Ring",
    description: "A wider shield rail that absorbs hits but makes the disc less agile.",
    shieldDelta: 16,
    massDelta: 0.1,
    driveDelta: -0.2,
    maxSpeedDelta: -0.25,
    impactDelta: 0,
    stabilityDelta: 0.16
  }),
  pulse_vane: Object.freeze({
    id: "pulse_vane",
    name: "Pulse Vane",
    description: "An energy sail that accelerates quickly at the cost of a thinner shield.",
    shieldDelta: -5,
    massDelta: -0.03,
    driveDelta: 0.48,
    maxSpeedDelta: 0.38,
    impactDelta: 0.04,
    stabilityDelta: -0.08
  })
});

// src/features/gamification/level-worlds/services/islandRunVaultCasino.ts
var VAULT_CASINO_CLOSED_LOOP_POLICY = Object.freeze({
  entrySource: "island-run-earned",
  rewards: "virtual-only",
  directAttemptPurchaseEnabled: false,
  virtualCashOutEnabled: true,
  virtualCashOutDestination: "in-game-cash",
  realMoneyCashOutEnabled: false,
  adjacentMicrotransactions: "allowed",
  repeatPurchasesEnabled: true,
  highAggregateSpendPossible: true,
  externalValueTransferEnabled: false,
  boundedRoundRequired: true,
  sessionLoop: "repeatable-bounded",
  sessionEndRequired: true,
  honestOutcomePresentationRequired: true,
  automaticSequences: "bounded-only"
});
var VAULT_CASINO_GAME_DEFINITIONS = Object.freeze([
  {
    id: "vault-rush",
    name: "Vault Rush",
    shortName: "Rush",
    description: "Reveal treasury doors until three matching figures answer the lock.",
    accent: "#43d9ff",
    format: "Memory and reveal"
  },
  {
    id: "crown-dice",
    name: "Crown Dice",
    shortName: "Dice",
    description: "Keep gemstone dice, reroll twice, then turn one face with the crown.",
    accent: "#ff5678",
    format: "Set building"
  },
  {
    id: "solar-orrery",
    name: "Solar Orrery",
    shortName: "Orrery",
    description: "Stop three celestial rings and focus their light through the sun crystal.",
    accent: "#ffc94e",
    format: "Timing and alignment"
  },
  {
    id: "prism-cascade",
    name: "Prism Cascade",
    shortName: "Prism",
    description: "Set three mirror gates, then release one crystal through the cascade.",
    accent: "#4fe8d1",
    format: "Planning and physics"
  },
  {
    id: "treasury-organ",
    name: "Treasury Organ",
    shortName: "Organ",
    description: "Listen to the jeweled pipes and answer their short ceremonial sequence.",
    accent: "#b984ff",
    format: "Memory and rhythm"
  }
]);

// src/features/gamification/level-worlds/services/islandRunStateActions.ts
var ISLAND_RUN_FIRST_SESSION_TUTORIAL_ALLOWED_NEXT = ISLAND_RUN_FIRST_SESSION_TUTORIAL_STATES.reduce((acc, state2, index, states) => {
  acc[state2] = states[index + 1] ? [states[index + 1]] : [];
  return acc;
}, {});
function applyTimedEventTicketTileGrant(options) {
  const { session: session2, client, eventId: eventId2, amount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session2);
  const canonicalEventId = typeof eventId2 === "string" ? eventId2.trim() : "";
  const applied = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
  if (!canonicalEventId || applied < 1) {
    return { record: current, applied: 0, eventId: canonicalEventId };
  }
  const currentBucket = Math.max(0, Math.floor(current.minigameTicketsByEvent?.[canonicalEventId] ?? 0));
  const next = {
    ...current,
    runtimeVersion: current.runtimeVersion + 1,
    minigameTicketsByEvent: {
      ...current.minigameTicketsByEvent,
      [canonicalEventId]: currentBucket + applied
    }
  };
  void commitIslandRunState({
    session: session2,
    client,
    record: next,
    triggerSource: triggerSource ?? "timed_event_ticket_tile_grant"
  });
  return { record: next, applied, eventId: canonicalEventId };
}
var ISLAND_RUN_MAX_ISLAND = 120;
function effectiveIslandNumber(resolvedIsland, cycleIndex) {
  return resolvedIsland + cycleIndex * ISLAND_RUN_MAX_ISLAND;
}
function buildTravelLuckyRollRunId(sessionKey, nowMs) {
  const randomSuffix = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `island-run-lucky-roll:${sessionKey}:${nowMs}:${randomSuffix}`;
}
function resolveIslandRunTravelState(options) {
  const {
    current,
    nextIsland,
    startTimer,
    nowMs,
    getIslandDurationMs,
    islandRunContractV2Enabled
  } = options;
  const wraps = nextIsland > ISLAND_RUN_MAX_ISLAND;
  const resolvedIsland = wraps ? (nextIsland - 1) % ISLAND_RUN_MAX_ISLAND + 1 : Math.max(1, nextIsland);
  const nextCycleIndex = wraps ? current.cycleIndex + 1 : current.cycleIndex;
  const oldIslandKey = String(current.currentIslandNumber);
  const newIslandKey = String(resolvedIsland);
  const currentPerIslandEggs = current.perIslandEggs ?? {};
  const updatedPerIslandEggs = { ...currentPerIslandEggs };
  const hasActiveEgg = current.activeEggTier !== null && current.activeEggSetAtMs !== null && current.activeEggHatchDurationMs !== null;
  if (hasActiveEgg) {
    const setAtMs = current.activeEggSetAtMs;
    const hatchAtMs = setAtMs + current.activeEggHatchDurationMs;
    const isReady = nowMs >= hatchAtMs;
    updatedPerIslandEggs[oldIslandKey] = {
      tier: current.activeEggTier,
      setAtMs,
      hatchAtMs,
      status: isReady ? "ready" : "incubating",
      location: currentPerIslandEggs[oldIslandKey]?.location === "spaceship" ? "spaceship" : isReady ? "dormant" : "island"
    };
  }
  const newIslandEntry = updatedPerIslandEggs[newIslandKey];
  let restoredActiveEgg = null;
  let nextActiveEggTier = null;
  let nextActiveEggSetAtMs = null;
  let nextActiveEggHatchDurationMs = null;
  let nextActiveEggIsDormant = false;
  if (newIslandEntry && (newIslandEntry.status === "incubating" || newIslandEntry.status === "ready")) {
    const isNowReady = nowMs >= newIslandEntry.hatchAtMs;
    const isDormant = isNowReady || newIslandEntry.location === "dormant";
    restoredActiveEgg = {
      tier: newIslandEntry.tier,
      setAtMs: newIslandEntry.setAtMs,
      hatchAtMs: newIslandEntry.hatchAtMs,
      isDormant
    };
    nextActiveEggTier = newIslandEntry.tier;
    nextActiveEggSetAtMs = newIslandEntry.setAtMs;
    nextActiveEggHatchDurationMs = newIslandEntry.hatchAtMs - newIslandEntry.setAtMs;
    nextActiveEggIsDormant = isDormant;
  }
  let nextStopStatesByIndex = current.stopStatesByIndex;
  let nextStopBuildStateByIndex = current.stopBuildStateByIndex;
  let nextActiveStopIndex = current.activeStopIndex;
  let nextActiveStopType = current.activeStopType;
  if (islandRunContractV2Enabled) {
    nextStopStatesByIndex = Array.from({ length: 5 }, () => ({
      objectiveComplete: false,
      buildComplete: false
    }));
    nextStopBuildStateByIndex = initStopBuildStatesForIsland(
      effectiveIslandNumber(resolvedIsland, nextCycleIndex)
    );
    nextActiveStopIndex = 0;
    nextActiveStopType = "hatchery";
  }
  const preIslandLuckyRollGate = resolveIslandRunPreIslandLuckyRollGate({
    featureEnabled: isIslandRunFeatureEnabled("islandRunPreIslandLuckyRollEnabled"),
    islandNumber: resolvedIsland,
    cycleIndex: nextCycleIndex,
    luckyRollSessionsByMilestone: current.luckyRollSessionsByMilestone
  });
  const shouldCreatePreIslandLuckyRollSession = preIslandLuckyRollGate.status === "required_missing_session" && preIslandLuckyRollGate.sessionKey !== null;
  const nextLuckyRollSessionsByMilestone = shouldCreatePreIslandLuckyRollSession ? {
    ...current.luckyRollSessionsByMilestone,
    [preIslandLuckyRollGate.sessionKey]: {
      status: "active",
      runId: buildTravelLuckyRollRunId(preIslandLuckyRollGate.sessionKey, nowMs),
      targetIslandNumber: resolvedIsland,
      cycleIndex: nextCycleIndex,
      position: 0,
      rollsUsed: 0,
      claimedTileIds: [],
      pendingRewards: [],
      bankedRewards: [],
      startedAtMs: nowMs,
      bankedAtMs: null,
      updatedAtMs: nowMs
    }
  } : current.luckyRollSessionsByMilestone;
  const shouldKeepTimerPendingForPreIslandLuckyRoll = preIslandLuckyRollGate.blocksIslandStart;
  const effectiveStartTimer = startTimer && !shouldKeepTimerPendingForPreIslandLuckyRoll;
  const durationMs = getIslandDurationMs(resolvedIsland);
  const islandStartedAtMs = effectiveStartTimer ? nowMs : 0;
  const islandExpiresAtMs = effectiveStartTimer ? nowMs + durationMs : 0;
  const next = {
    ...current,
    completedStopsByIsland: {
      ...current.completedStopsByIsland,
      [oldIslandKey]: []
    },
    stopTicketsPaidByIsland: {
      ...current.stopTicketsPaidByIsland ?? {},
      [oldIslandKey]: []
    },
    bonusTileChargeByIsland: {
      ...current.bonusTileChargeByIsland ?? {},
      [oldIslandKey]: {}
    },
    perIslandEggs: updatedPerIslandEggs,
    activeEggTier: nextActiveEggTier,
    activeEggSetAtMs: nextActiveEggSetAtMs,
    activeEggHatchDurationMs: nextActiveEggHatchDurationMs,
    activeEggIsDormant: nextActiveEggIsDormant,
    stopStatesByIndex: nextStopStatesByIndex,
    stopBuildStateByIndex: nextStopBuildStateByIndex,
    activeStopIndex: nextActiveStopIndex,
    activeStopType: nextActiveStopType,
    luckyRollSessionsByMilestone: nextLuckyRollSessionsByMilestone,
    currentIslandNumber: resolvedIsland,
    cycleIndex: nextCycleIndex,
    bossTrialResolvedIslandNumber: null,
    islandStartedAtMs,
    islandExpiresAtMs,
    runtimeVersion: current.runtimeVersion + 1
  };
  return {
    record: next,
    resolvedIsland,
    nextCycleIndex,
    restoredActiveEgg
  };
}

// src/features/gamification/level-worlds/services/islandRunMinigameLauncherService.ts
function resolveEventMinigameCompletionId(options) {
  if (!options.completed || options.launchSource !== "timed_event") return null;
  if (options.minigameId === "island_workshop") return "island_workshop";
  if (options.minigameId === "lucky_spin") return "lucky_spin";
  if (options.minigameId === "space_excavator") return "space_excavator";
  if (options.minigameId === "companion_feast") return "companion_feast";
  if (options.minigameId === "momentum_matrix") return "momentum_matrix";
  if (options.minigameId === "journey_disc_arena") return "journey_disc_arena";
  if (options.minigameId === "concord_categories") return "concord_categories";
  if (options.minigameId === "lexicon_relay") return "lexicon_relay";
  if (options.minigameId === "signal_path") return "signal_path";
  if (options.minigameId === "twin_sigils") return "twin_sigils";
  return null;
}
function shouldResolveEventArenaStopOnMinigameComplete(options) {
  return options.completed && options.launchSource === "timed_event" && options.minigameId === "crystal_miners" || resolveEventMinigameCompletionId(options) !== null;
}

// src/features/gamification/level-worlds/services/__tests__/crystalMiners.test.ts
var session = { user: { id: "crystal-miners-test", user_metadata: {} } };
var eventId = "space_excavator:100";
async function seed(tickets = 3) {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  __resetIslandRunActionMutexesForTests();
  installWindowWithStorage(createMemoryStorage());
  const base = readIslandRunGameStateRecord(session);
  await writeIslandRunGameStateRecord({ session, client: null, record: {
    ...base,
    currentIslandNumber: 2,
    activeTimedEvent: { eventId, eventType: "space_excavator", startedAtMs: 100, expiresAtMs: 1e5, version: 1 },
    rewardBarBoundEventId: eventId,
    minigameTicketsByEvent: { [eventId]: tickets }
  } });
  refreshIslandRunStateFromLocal(session);
}
var action = (command, expectedRevision = 0, nowMs = 500) => applyCrystalMinersAction({ session, client: null, eventId, command, expectedRevision, nowMs });
var crystalMinersTests = [
  ...crystalMinersProgressionTests,
  { name: "balance analysis separates versions and layouts and exposes investment and unrewarding drops", run: () => {
    const row = (id2, version, layout, ore) => ({ id: id2, user_id: "test", event_type: "island_run_gameplay_event", occurred_at: "2026-09-19T00:00:00Z", metadata: { game_id: "crystal_miners", schema_version: 1, stage: "crystal_miners_attempt", attempt_id: id2, level: 39, balance_version: version, layout_version: layout, ore_gained: ore, prep_ore_spent: 120, outcome: "retry" } });
    const result = summarizeMinerTelemetry([row("a", "old", 9, 0), row("b", "new", 9, 0), row("c", "new", 10, 0), row("d", "new", 10, 200)], { balanceVersion: "new", layoutVersion: 10 });
    assertEqual(result.levels[0].attempts, 2, "old balance/layout excluded");
    assertEqual(result.levels[0].prepOre, 240, "preparation investment recorded");
    assertEqual(result.levels[0].dryDrops, 1, "zero-reward attempts visible");
  } },
  { name: "merge anticipation identifies only valid pairs without changing the rack", run: () => {
    const tools = [7, 7, 8, 0, -1, 20, 20];
    const before = [...tools];
    assert(isMinerMergePair(tools, 0, 1), "matching tools light up");
    for (const pair of [[0, 0], [0, 2], [0, 3], [0, 4], [5, 6], [-1, 1], [0, 99]]) assert(!isMinerMergePair(tools, pair[0], pair[1]), "same slot, swap, empty, gifts, capped or invalid targets never promise a merge");
    assertDeepEqual(tools, before, "hover never mutates investment");
  } },
  { name: "six authored cave themes rotate predictably throughout the campaign", run: () => {
    assertEqual(new Set(MINER_THEMES.map((t) => t.id)).size, 6, "six distinct environments");
    for (let level2 = 1; level2 <= 40; level2++) {
      const theme = getMinerTheme(level2);
      assertEqual(theme, getMinerTheme(level2 + 6), "stable six-cavern rotation");
      if (level2 > 1) assert(theme.id !== getMinerTheme(level2 - 1).id, "adjacent caverns differ");
    }
  } },
  { name: "new chest rewards remain visible for 1.1 seconds before results", run: () => {
    const simulation = simulateMinerDig({ ...createCrystalMinersProgress(), tools: Array(25).fill(7) });
    const timing = createMinerReplayTiming(simulation.frames);
    assert(simulation.treasures > 0, "fixture reaches chests");
    assertEqual(timing.celebrationMs, 1100, "readable reward hold");
    assertEqual(timing.duration - timing.travelDuration, 1100, "results wait after final descent");
    assertEqual(minerReplayFrameAt(timing.times, timing.travelDuration + 500), simulation.frames.length - 1, "opened chests stay on final frame throughout hold");
    const failure = simulateMinerDig({ ...createCrystalMinersProgress(), level: 39, blocks: createMinerBlocks(39), tools: [1, ...Array(24).fill(0)] });
    assertEqual(createMinerReplayTiming(failure.frames).celebrationMs, 0, "no fake chest celebration on failure");
  } },
  { name: "legacy terrain keeps exact damage and permanent investment until its next level", run: () => {
    const blocks = createMinerBlocks(28, 8);
    const target = blocks.find((b) => b.hp > 1 && b.kind !== "boss");
    target.hp = Math.floor(target.maxHp / 2);
    blocks[135].hp = 0;
    const old = { ...createCrystalMinersProgress(), version: 8, level: 28, blocks, tools: [14, ...Array(24).fill(0)], forgeLevel: 4, ore: 987, dropTickets: 11 };
    const p = sanitizeCrystalMinersProgressByEvent({ career: old }).career;
    assertEqual(p.version, 10, "current schema");
    assertEqual(p.blocks[135].hp, 0, "opened path never resealed");
    assertEqual(p.blocks[target.id].hp, Math.ceil(p.blocks[target.id].maxHp * target.hp / target.maxHp), "relative damage retained");
    assertEqual(p.tools[0], 14, "tool retained");
    assertEqual(p.dropTickets, 11, "funded plays retained");
    assertEqual(p.ore, 987, "ore retained");
    assertEqual(p.forgeLevel, 4, "forge retained");
  } },
  { name: "late stone difficulty requires equipment without a long rebound wait", run: () => {
    const run = (tier) => simulateMinerDig({ ...createCrystalMinersProgress(), level: 39, forgeLevel: 5, blocks: createMinerBlocks(39), tools: [...Array(10).fill(tier), ...Array(15).fill(0)] });
    const weak = run(7), strong = run(11);
    assert(!weak.cleared, "weak tools still fail");
    assert(strong.broken > weak.broken, "investment breaks more obstacles");
    assert(strong.frames[strong.frames.length - 1].step < 20 * 60, "late rack resolves in under twenty simulation seconds");
    const seam = (tier) => {
      const blocks = createMinerBlocks(39).map((b2) => ({ ...b2, hp: 0 }));
      blocks[50] = { id: 50, kind: "stone", hp: 999999, maxHp: 999999 };
      return simulateMinerDig({ ...createCrystalMinersProgress(), level: 39, tools: [tier, ...Array(24).fill(0)], blocks }).frames.flatMap((f) => f.hits).filter((h) => h.blockId === 50).slice(0, 2);
    };
    const a = seam(7), b = seam(14);
    assertEqual(a[1].step - a[0].step, b[1].step - b[0].step, "stronger tools do not bounce longer");
  } },
  { name: "guardian charges, can miss an empty lane, reloads and wipes a later occupied lane", run: () => {
    const p = { ...createCrystalMinersProgress(), level: 40, forgeLevel: 5, tools: [0, 9, ...Array(23).fill(0)], blocks: createMinerBlocks(40).map((b) => ({ ...b, hp: b.kind === "boss" ? b.hp : 0 })) };
    const run = simulateMinerDig(p), attacks = run.frames.flatMap((f) => f.bossAttack ? [f.bossAttack] : []);
    assert(attacks.some((a) => a.phase === "charge" && a.lane === 4), "first target marked before firing");
    assert(attacks.some((a) => a.phase === "fire" && a.shot === 0 && a.destroyed === 0), "first shot may miss");
    assert(attacks.some((a) => a.phase === "reload"), "reload exposed");
    assert(attacks.some((a) => a.phase === "fire" && a.shot === 1 && a.lane === 1 && a.destroyed === 1), "next charged shot removes target lane");
    const timing = createMinerReplayTiming(run.frames);
    assertEqual(timing.duration - timing.times[timing.times.length - 1], 600, "last-tool blast stays visible before result");
    assertEqual(run.bossShots, 2, "two actual shots");
    assertEqual(run.bossDestroyed, 1, "one temporary falling tool lost");
    assertDeepEqual(settleMinerDig(p, run).tools, p.tools, "permanent investments survive weapon hit");
    assertDeepEqual(simulateMinerDig(p, false).blocks, run.blocks, "headless and replay outcomes identical");
  } },
  { name: "guardian weapon removes every live tool in its lane and leaves other lanes intact", run: () => {
    const p = { ...createCrystalMinersProgress(), level: 40, tools: Array(25).fill(7), blocks: createMinerBlocks(40).map((b) => ({ ...b, hp: b.kind === "boss" ? b.hp * 100 : 0 })) };
    const run = simulateMinerDig(p);
    const f = run.frames.find((f2) => f2.bossAttack?.phase === "fire");
    assertEqual(f.bossAttack.destroyed, 5, "entire first target lane hit");
    assert(f.bodies.filter((b) => b.lane === 4).every((b) => !b.active), "target lane eliminated");
    assert(f.bodies.filter((b) => b.lane !== 4).some((b) => b.active), "other lanes remain in play");
  } },
  { name: "killing the guardian cancels its charge and prevents further shots", run: () => {
    const p = { ...createCrystalMinersProgress(), level: 10, tools: Array(25).fill(7), blocks: createMinerBlocks(10) };
    const run = simulateMinerDig(p);
    assert(run.cleared, "strong rack defeats guardian");
    assertEqual(run.bossShots, 0, "killed before first shot");
    assert(run.frames.some((f) => f.bossAttack?.phase === "charge"), "charge actually began");
    assert(run.frames.filter((f) => f.blocks.find((b) => b.kind === "boss").hp === 0).every((f) => !f.bossAttack), "no attack after death");
  } },
  { name: "rare obsidian arrives in deep caverns and old damage and tools survive migration", run: () => {
    assert(!createMinerBlocks(20).some((b) => b.kind === "obsidian"), "not an early material");
    assert(createMinerBlocks(39).some((b) => b.kind === "obsidian" && b.hp > 0), "late rare seams");
    const old = { ...createCrystalMinersProgress(), version: 7, level: 39, tools: [12, ...Array(24).fill(0)], ore: 876, blocks: createMinerBlocks(39, 7) };
    const target = createMinerBlocks(39).find((b) => b.kind === "obsidian");
    old.blocks[target.id].hp = 0;
    const saved = sanitizeCrystalMinersProgressByEvent({ career: old }).career;
    assertEqual(saved.version, 10, "migrated");
    assertEqual(saved.blocks[target.id].hp, 0, "broken stone does not respawn as obsidian");
    assertEqual(saved.ore, 876, "ore retained");
    assertDeepEqual(saved.tools, old.tools, "tools retained");
  } },
  { name: "rare ticket blocks award one exact saved drop once in the atomic dig", run: async () => {
    await seed();
    const before = getIslandRunStateSnapshot(session);
    const p = { ...createCrystalMinersProgress(), level: 6, blocks: createMinerBlocks(6).map((b) => ({ ...b, hp: b.kind === "ticket" ? 1 : 0 })), tools: Array(25).fill(5) };
    assertEqual(p.blocks.filter((b) => b.kind === "ticket").length, 1, "one rare ticket block");
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...before, crystalMinersProgressByEvent: { [eventId]: p } } });
    refreshIslandRunStateFromLocal(session);
    const results = await Promise.all([action({ kind: "dig" }), action({ kind: "dig" })]);
    const result = results.find((r) => r.ok);
    assertEqual(result.simulation?.ticketDrops, 1, "one earned drop");
    const saved = getCrystalMinersCareer(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent);
    assertEqual(saved.dropTickets, 3, "two funded remainder plus one reward, no triple conversion");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    assertEqual(getCrystalMinersCareer(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent).dropTickets, 3, "reload preserves without regrant");
  } },
  { name: "spawners add bounded temporary picks in their own lane without changing the saved rack", run: () => {
    const p = { ...createCrystalMinersProgress(), level: 4, tools: Array(25).fill(5), blocks: createMinerBlocks(4).map((b) => ({ ...b, hp: b.kind === "spawner" ? 1 : 0 })) };
    const simulation = simulateMinerDig(p);
    assertEqual(simulation.spawnedTools, 1, "one bonus pick");
    assert(simulation.frames.every((f) => f.bodies.length <= 30), "bounded simulation size");
    const spawned = simulation.frames.flatMap((f) => f.bodies).filter((b) => b.id >= 25);
    assert(spawned.length > 0, "spawn is visible in replay");
    assert(spawned.every((b) => b.lane === 4), "spawn stays in its source lane");
    assertDeepEqual(settleMinerDig(p, simulation).tools, p.tools, "temporary pick is not a permanent free tool");
  } },
  { name: "group merge unlocks at 25, performs one pass and preserves odd tools, gifts and resources", run: () => {
    const p = { ...createCrystalMinersProgress(), level: 25, tools: [7, 7, 7, 7, 7, 8, 8, -1, ...Array(17).fill(0)] };
    assertEqual(mergeMinerToolGroup({ ...p, level: 24 }, 7), null, "locked before cavern 25");
    const merged = mergeMinerToolGroup(p, 7);
    assertDeepEqual(merged.tools.slice(0, 8), [0, 8, 0, 8, 7, 8, 8, -1], "pairs merge once with untouched odd remainder and other tier");
    assertEqual(merged.ore, p.ore, "free merge");
    assertEqual(merged.dropTickets, p.dropTickets, "no play spend");
    assertEqual(p.tools[0], 7, "input immutable");
    assertEqual(mergeMinerToolGroup(p, 20), null, "max tier cannot exceed ceiling");
    assertEqual(mergeMinerToolGroup(p, 6), null, "no pair rejected");
  } },
  { name: "group merge is revision-locked, saved and cannot repeat on duplicate commands", run: async () => {
    await seed();
    const before = getIslandRunStateSnapshot(session);
    const p = { ...createCrystalMinersProgress(), level: 25, blocks: createMinerBlocks(25), tools: [7, 7, 7, 7, 7, ...Array(20).fill(0)] };
    assertEqual((await action({ kind: "merge_group", tier: 1 })).failureReason, "group_merge_locked", "canonical unlock enforced");
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...before, crystalMinersProgressByEvent: { [eventId]: p } } });
    refreshIslandRunStateFromLocal(session);
    const results = await Promise.all([action({ kind: "merge_group", tier: 7 }), action({ kind: "merge_group", tier: 7 })]);
    assertEqual(results.filter((r) => r.ok).length, 1, "one action");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    const saved = getIslandRunStateSnapshot(session);
    assertDeepEqual(saved.crystalMinersProgressByEvent[eventId].tools.slice(0, 5), [0, 8, 0, 8, 7], "odd leftover and upgrades survive reload");
    assertEqual(saved.minigameTicketsByEvent[eventId], 3, "no ticket spend");
  } },
  { name: "replay speeds only a long tail after the last reachable chest and keeps its reveal", run: () => {
    const make = (chests) => Array.from({ length: 301 }, (_, i) => ({ step: i * 6, bodies: [], blocks: [], hits: chests.includes(i) ? [{ blockId: 135, x: 0, y: 1e3, broken: true, kind: "treasure", step: i * 6 }] : [] }));
    const failed2 = createMinerReplayTiming(make([]));
    assertEqual(failed2.fastFrom, -1, "no chest means no spoiler acceleration");
    const one = createMinerReplayTiming(make([100]));
    assert(one.fastFrom > 100, "reveal stays normal speed");
    assert(one.times[one.fastFrom] - one.times[100] >= 650, "chest reveal held");
    assert(one.duration < failed2.duration, "long dead tail shortened");
    const more = createMinerReplayTiming(make([100, 240]));
    assert(more.fastFrom > 240, "do not accelerate while another tool will reach a chest");
    assertEqual(createMinerReplayTiming(make([295])).fastFrom, -1, "short tail left alone");
    for (let i = 0; i < one.times.length; i++) {
      assertEqual(minerReplayFrameAt(one.times, one.times[i]), i, "every frame remains on the timeline");
      if (i > 0) assert(one.times[i] > one.times[i - 1], "ordered frames");
    }
  } },
  { name: "game-specific funding quantities apply equally to earned and purchased event tickets", run: () => {
    assertEqual(eventGamePlaysAvailable("crystal_miners", 2), 6, "two earned tickets fund six drops");
    assertEqual(eventGamePackPlays("crystal_miners", 10), 30, "ten-ticket paid pack funds thirty drops");
    assertEqual(eventGamePackPlays("space_excavator", 10), 10, "other game quantities preserved");
    assertDeepEqual(spendEventGamePlay("crystal_miners", 1, 0), { ticketsSpent: 1, savedPlays: 2 }, "one budget unit funds three distinct drops");
    assertEqual(spendEventGamePlay("crystal_miners", NaN, 0), null, "invalid balances cannot fund plays");
  } },
  { name: "funded drop remainder survives reload and cannot spend the shared budget twice", run: async () => {
    await seed(1);
    assert((await action({ kind: "dig" })).ok, "first drop funded");
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId], 0, "shared ticket consumed once");
    assertEqual(getCrystalMinersCareer(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent).dropTickets, 2, "two drops saved");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    const results = await Promise.all([action({ kind: "dig" }, 1), action({ kind: "dig" }, 1)]);
    assertEqual(results.filter((r) => r.ok).length, 1, "one concurrent drop accepted");
    assertEqual(getCrystalMinersCareer(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent).dropTickets, 1, "only one saved drop consumed");
    assert((await action({ kind: "dig" }, 2)).ok, "last funded drop works without shared tickets");
    assertEqual((await action({ kind: "dig" }, 3)).failureReason, "insufficient_tickets", "fourth drop requires more earning");
  } },
  { name: "reward-bar grid includes Crystal Miners once with its own image icon", run: () => {
    const exhibitions = ARENA_GAME_CATALOG.filter((g) => g.availability === "exhibition").map((g) => ({ gameId: g.id, displayName: g.displayName, icon: g.iconSrc ?? g.icon }));
    for (const replaces of [false, true]) {
      const slots = resolveIslandEventGridSlots({ templates: [], exhibitions, activeEventType: null, journeyDiscReplacesTimedEvent: replaces });
      const miners = slots.filter((s) => s.kind === "exhibition" && s.gameId === "crystal_miners");
      assertEqual(miners.length, 1, "registered once, including chapter replacement grids");
      assert(miners[0].kind === "exhibition" && miners[0].icon.endsWith("/crystal-miners/icon.svg"), "uses dedicated icon asset");
    }
  } },
  { name: "canonical attempt emits one bounded summary after settlement, aggregating preparation and duplicate blocks", run: async () => {
    await seed();
    const rows = [];
    const context = () => {
      const state2 = getIslandRunStateSnapshot(session);
      return { progress: getCrystalMinersCareer(state2.crystalMinersProgressByEvent) ?? createCrystalMinersProgress(), tickets: eventGamePlaysAvailable("crystal_miners", state2.minigameTicketsByEvent[eventId] ?? 0, getCrystalMinersCareer(state2.crystalMinersProgressByEvent)?.dropTickets ?? 0), dice: state2.dicePool, island: state2.currentIslandNumber };
    };
    const observer = createMinerObserver({ userId: session.user.id, eventId, remoteEnabled: false, context, emit: (r) => rows.push(r) });
    const run = (command, expectedRevision = context().progress.revision) => applyCrystalMinersAction({ session, client: null, eventId, command, expectedRevision, nowMs: 500, observer });
    observer.observe("opened");
    observer.observe("opened");
    await run({ kind: "open", slot: 0 });
    await run({ kind: "buy" });
    await run({ kind: "move", from: 5, to: 6 });
    assertEqual(rows.length, 1, "preparation emits no per-click cloud traffic");
    const rev = context().progress.revision;
    await run({ kind: "dig" });
    await run({ kind: "dig" }, rev);
    await run({ kind: "dig" }, rev);
    const attempts = rows.filter((r) => r.stage === "crystal_miners_attempt");
    assertEqual(attempts.length, 1, "one accepted attempt");
    assertEqual(rows.filter((r) => r.stage === "crystal_miners_blocked").length, 1, "duplicate rejection coalesces");
    const m = attempts[0].metadata;
    assertEqual(m.prep_buy, 1, "buy count");
    assertEqual(m.prep_merge, 1, "merge count");
    assertEqual(m.prep_open, 1, "gift count");
    assertEqual(m.tickets, 8, "post-spend drop wallet");
    assertEqual(m.career_revision, context().progress.revision, "committed revision");
    assertEqual(m.level, 1, "attempt level before advance");
    assertEqual(m.ticket_cost, 1, "transparent cost");
    assert(Array.isArray(m.lane_power) && m.lane_power.length === 5, "five lane strength values");
    assertEqual(m.layout_version, 10, "authored layout cohort");
    assertEqual(m.course_recipe, "first_fall", "encounter identity");
    assert(Array.isArray(m.lane_capacity) && m.lane_capacity.length === 5, "investment capacity captured");
    assertEqual(m.charges_collected, 0, "new mechanics recorded without per-hit telemetry");
  } },
  { name: "ticket exhaustion is observed even when the empty-wallet Drop button is disabled", run: () => {
    const rows = [];
    const p = createCrystalMinersProgress();
    const observer = createMinerObserver({ userId: "test", eventId, remoteEnabled: false, context: () => ({ progress: p, tickets: 0, dice: 0, island: 2 }), emit: (r) => rows.push(r) });
    observer.observe("opened");
    observer.observe("opened");
    assertEqual(rows.filter((r) => r.stage === "crystal_miners_ticket_pause").length, 1, "one real empty-wallet entry pause");
  } },
  { name: "mining error reports redact raw messages and reporting failures never interrupt observation", run: () => {
    const error = new TypeError("secret-token private-email@example.test");
    error.stack = "TypeError: secret-token\n at action (https://private.example/app.tsx:42:3?token=private)";
    const details = minerErrorDetails(error);
    const json = JSON.stringify(details);
    assert(!json.includes("secret-token") && !json.includes("private-email") && !json.includes("private.example"), "no secrets, message or URL");
    assertEqual(details.error_locations, "app.tsx:42:3", "source location retained");
    const p = createCrystalMinersProgress();
    const observer = createMinerObserver({ userId: "test", eventId, remoteEnabled: false, context: () => ({ progress: p, tickets: 0, dice: 0, island: 1 }), emit: () => {
      throw new Error("telemetry down");
    } });
    observer.observe("opened");
    observer.failure(error, "render");
  } },
  { name: "balance analytics separate real attempts, duplicates, ticket shortages and errors", run: () => {
    const row = (id2, metadata) => ({ id: id2, user_id: "test", event_type: "island_run_gameplay_event", occurred_at: "2026-09-19T00:00:00Z", metadata: { game_id: "crystal_miners", schema_version: 1, ...metadata } });
    const a = { stage: "crystal_miners_attempt", attempt_id: "one", level: 38, outcome: "retry", ore_gained: 20, new_chests: 1, highest_tier: 8, forge_before: 4 };
    const data = summarizeMinerTelemetry([row("1", a), row("2", a), row("3", { ...a, attempt_id: "two", outcome: "cleared" }), row("4", { stage: "crystal_miners_blocked", reason: "insufficient_tickets" }), row("5", { stage: "crystal_miners_error", operation: "dig", error_name: "TypeError" }), row("6", { stage: "crystal_miners_resources_earn" })]);
    assertEqual(data.levels[0].attempts, 2, "duplicates excluded");
    assertEqual(data.levels[0].clears, 1, "clear numerator");
    assertEqual(data.blocked, 1, "ticket pause tracked");
    assertEqual(data.returns, 1, "main-loop return tracked");
    assertEqual(data.errors.length, 1, "errors separate");
  } },
  { name: "every course ends in five finish-line chests, including boss and reward levels", run: () => {
    for (let level2 = 1; level2 <= 40; level2++) {
      const chests = createMinerBlocks(level2).filter((b) => b.kind === "treasure");
      assertEqual(chests.length, 5, "one chest per path");
      assert(chests.every((b) => Math.floor(b.id / 5) === 27 && b.hp > 0), "all chests are alive in the bottom row");
    }
  } },
  { name: "finishing a cavern automatically banks its once-only prize with the dig", run: async () => {
    await seed();
    const current = getIslandRunStateSnapshot(session);
    const p = createCrystalMinersProgress();
    p.tools = Array(25).fill(6);
    p.blocks = p.blocks.map((b) => ({ ...b, hp: b.id === 135 ? 1 : 0 }));
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...current, crystalMinersProgressByEvent: { [eventId]: p } } });
    refreshIslandRunStateFromLocal(session);
    const results = await Promise.all([action({ kind: "dig" }), action({ kind: "dig" })]);
    assertEqual(results.filter((r) => r.ok).length, 1, "one duplicate accepted");
    const after = getIslandRunStateSnapshot(session);
    const progress = after.crystalMinersProgressByEvent[eventId];
    assertEqual(progress.level, 2, "next cavern ready");
    assertEqual(after.dicePool, current.dicePool + 25, "prize automatically banked");
    assertDeepEqual(progress.eventTrack.claimedMilestones, [1], "claim saved with dig");
    assertDeepEqual(progress.lastReceipt?.milestoneRewards, ["25 dice"], "result presents banked prize");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    assertEqual((await action({ kind: "claim", milestone: 1 }, 1)).failureReason, "already_claimed", "no extra claim after reload");
    assertEqual(getIslandRunStateSnapshot(session).dicePool, after.dicePool, "no extra grant");
  } },
  { name: "new event retains journey and once-only prizes with permanent equipment", run: async () => {
    await seed();
    const current = getIslandRunStateSnapshot(session);
    const p = { ...createCrystalMinersProgress(), revision: 7, level: 4, blocks: createMinerBlocks(4), eventTrack: { levelsCleared: 3, claimedMilestones: [1] } };
    const newId = "skybound_expedition:900";
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...current, crystalMinersProgressByEvent: { [eventId]: p }, activeTimedEvent: { eventId: newId, eventType: "skybound_expedition", startedAtMs: 900, expiresAtMs: 1e5, version: 2 }, minigameTicketsByEvent: { [newId]: 3 } } });
    refreshIslandRunStateFromLocal(session);
    const bridge = createCrystalMinersBridge({ session, client: null, eventId: newId });
    assertEqual(bridge.getProgress().level, 4, "career cavern retained");
    assertEqual(bridge.getEventTrack().levelsCleared, 3, "journey retained");
    assertEqual((await applyCrystalMinersAction({ session, client: null, eventId: newId, command: { kind: "claim", milestone: 1 }, expectedRevision: 7, nowMs: 1e3 })).failureReason, "already_claimed", "rotation cannot duplicate career prizes");
    await applyCrystalMinersAction({ session, client: null, eventId: newId, command: { kind: "open", slot: 0 }, expectedRevision: 7, nowMs: 1e3 });
    assertEqual(bridge.getEventTrack().levelsCleared, 3, "first new-event action keeps journey");
    assertDeepEqual(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId].eventTrack.claimedMilestones, [1], "old claim history retained");
  } },
  { name: "legacy workshop saves gain an empty reward track without losing upgrades", run: () => {
    const p = createCrystalMinersProgress();
    const { eventTrack, ...legacy } = p;
    const restored = sanitizeCrystalMinersProgressByEvent({ [eventId]: legacy })[eventId];
    assertDeepEqual(restored.tools, p.tools, "tools intact");
    assertDeepEqual(restored.eventTrack, { levelsCleared: 0, claimedMilestones: [] }, "compatible default");
    const bad = { ...p, eventTrack: { levelsCleared: 1, claimedMilestones: [1, 1, 3, 999] } };
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({ [eventId]: bad })[eventId].eventTrack.claimedMilestones, [1], "invalid/future claim ids rejected");
  } },
  { name: "permanent workshop survives actual island travel and multiple event rotations", run: async () => {
    await seed();
    await action({ kind: "move", from: 5, to: 6 });
    await action({ kind: "buy" }, 1);
    await action({ kind: "dig" }, 2);
    const before = getIslandRunStateSnapshot(session);
    const career = getCrystalMinersCareer(before.crystalMinersProgressByEvent);
    const travelled = resolveIslandRunTravelState({ current: before, nextIsland: 2, startTimer: true, nowMs: 600, getIslandDurationMs: () => 864e5, islandRunContractV2Enabled: true }).record;
    assertDeepEqual(getCrystalMinersCareer(travelled.crystalMinersProgressByEvent), career, "canonical travel preserves entire investment");
    const nextEvent = "companion_feast:700";
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...travelled, activeTimedEvent: { eventId: nextEvent, eventType: "companion_feast", startedAtMs: 700, expiresAtMs: 2e5, version: 2 }, rewardBarBoundEventId: nextEvent, rewardBarProgress: 0, minigameTicketsByEvent: { ...travelled.minigameTicketsByEvent, [nextEvent]: 4 } } });
    refreshIslandRunStateFromLocal(session);
    const bridge = createCrystalMinersBridge({ session, client: null, eventId: nextEvent });
    assertDeepEqual(bridge.getProgress(), career, "new event opens the same career without re-seeding");
    const dig = await applyCrystalMinersAction({ session, client: null, eventId: nextEvent, command: { kind: "dig" }, expectedRevision: career.revision, nowMs: 800 });
    assert(dig.ok, "new event dig works");
    const after = getIslandRunStateSnapshot(session);
    assertEqual(after.minigameTicketsByEvent[nextEvent], 4, "saved funded drop used before another event ticket");
    assertEqual(after.minigameTicketsByEvent[eventId], 2, "old bucket untouched");
    assertEqual(bridge.getProgress().tools[6], 2, "merged tool retained");
    assertEqual(bridge.getProgress().bought, 1, "purchase investment retained");
    assertEqual(bridge.getProgress().digs, 2, "career continues");
    assert(after.rewardBarProgress > 0, "new reward bar credited");
    assertEqual((await action({ kind: "dig" }, bridge.getProgress().revision, 900)).failureReason, "event_expired", "stale window cannot spend new tickets");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    assertDeepEqual(bridge.getProgress(), getCrystalMinersCareer(after.crystalMinersProgressByEvent), "cross-event career survives reload");
  } },
  { name: "checkpoint pruning always retains newest workshop even under an old event key", run: () => {
    const p = createCrystalMinersProgress();
    const checkpoints = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`event:${i}`, { ...p, revision: i, updatedAtMs: i }]));
    checkpoints["event:0"] = { ...p, revision: 100, ore: 1, updatedAtMs: 100 };
    const saved = sanitizeCrystalMinersProgressByEvent(checkpoints);
    assertEqual(Object.keys(saved).length, 32, "bounded archive");
    assertEqual(getCrystalMinersCareer(saved)?.ore, 1, "newest spend never lost");
  } },
  { name: "opening gifts is deterministic and never destroys another slot", run: () => {
    const p = createCrystalMinersProgress();
    const opened = openMinerGift(p, 2);
    assertEqual(opened.tools[2], 2, "gift reveals tier");
    assertEqual(opened.ore, p.ore, "opening costs no ore");
    assertEqual(openMinerGift(opened, 2), null, "cannot open twice");
    assertEqual(arrangeMinerTools(p, 0, 1), null, "unopened gifts do not merge");
  } },
  { name: "boss cavern includes one full-width guardian ahead of treasure", run: () => {
    const blocks = createMinerBlocks(10);
    assertEqual(blocks.filter((b) => b.kind === "boss").length, 1, "one guardian");
    const boss = blocks.find((b) => b.kind === "boss");
    assert(boss.id < blocks.find((b) => b.kind === "treasure").id, "boss above treasure");
    const p = { ...createCrystalMinersProgress(), level: 10, blocks, tools: [...Array(25).fill(8)] };
    const sim = simulateMinerDig(p, false);
    assertEqual(sim.blocks[boss.id].hp, 0, "powerful team defeats guardian");
    assert(sim.treasures > 0, "treasure behind guardian accessible");
  } },
  { name: "reward cavern offers soft prizes and freefall in every lane at level ten", run: () => {
    const blocks = createMinerBlocks(10);
    assert(!blocks.some((b) => b.hp > 0 && ["iron", "stone"].includes(b.kind)), "only guardian blocks the reward course");
    for (let col = 0; col < 5; col++) assert(blocks.filter((b) => b.id % 5 === col && b.hp > 0).length >= 4, "every lane rewards coverage");
    const p = { ...createCrystalMinersProgress(), level: 10, blocks, tools: [...Array(15).fill(minerRecommendedTier(10) + 1), ...Array(10).fill(0)] };
    const sim = simulateMinerDig(p, false);
    assert(sim.broken >= 20, "modest distributed tools collect most prizes");
    assert(sim.gifts >= 5, "generous gift haul");
    assert(sim.treasures >= 1, "ordinary tools reach treasure");
    const settled = settleMinerDig(p, sim);
    assertDeepEqual(settled.tools.slice(0, 10), p.tools.slice(0, 10), "rewards never consume the upgraded fleet");
  } },
  { name: "all forty levels have the requested reward cadence and a rising difficulty curve", run: () => {
    const rewardLevels = [];
    let previousHardness = 0;
    for (let level2 = 1; level2 <= 40; level2++) {
      const blocks = createMinerBlocks(level2);
      if (isMinerRewardCavern(level2)) {
        rewardLevels.push(level2);
        assert(blocks.filter((b) => b.hp === 0).length > 90, "reward course mostly freefall");
        const sim = simulateMinerDig({ ...createCrystalMinersProgress(), level: level2, blocks: blocks.map((b) => b.kind === "boss" ? { ...b, hp: 0 } : b), tools: [...Array(10).fill(2), ...Array(15).fill(0)] }, false);
        assert(sim.broken >= 20 && sim.treasures === 5, "modest tools collect generous rewards even at level forty");
      } else {
        const base = blocks.find((b) => b.kind === "stone" && b.hp > 0);
        assert(Boolean(base), "ordinary terrain present");
        const normalized = blocks.reduce((sum, b) => sum + b.maxHp * (b.hp > 0 ? 1 : 0), 0);
        assert(normalized >= previousHardness * 0.65, "authored resistance follows rising chapter progression without an accidental collapse");
        previousHardness = normalized;
      }
    }
    assertDeepEqual(rewardLevels, [10, 20, 30, 40], "exact reward cadence");
    const late = { ...createCrystalMinersProgress(), level: 39, blocks: createMinerBlocks(39) };
    const weak = simulateMinerDig({ ...late, tools: Array(25).fill(1) }, false);
    const strong = simulateMinerDig({ ...late, tools: Array(25).fill(minerRecommendedTier(39)) }, false);
    assert(strong.broken > weak.broken * 3, "upgrades materially improve late-game penetration");
    assert(strong.depth > weak.depth, "strong fleet gets deeper");
    assert(minerBuyTier(39) > minerBuyTier(1), "shop improves along journey");
    assert(minerRecommendedTier(39) > minerRecommendedTier(1), "recommended tools rise");
  } },
  { name: "all milestone rewards pay exact main-game balances once, including mystery, tickets and money", run: async () => {
    await seed(0);
    const base = getIslandRunStateSnapshot(session);
    const p = { ...createCrystalMinersProgress(), level: 40, blocks: createMinerBlocks(40).map((b) => ({ ...b, hp: 0 })), eventTrack: { levelsCleared: 40, claimedMilestones: [] } };
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...base, crystalMinersProgressByEvent: { [eventId]: p } } });
    refreshIslandRunStateFromLocal(session);
    let revision = 0;
    let dice = base.dicePool;
    let essence = base.essence;
    let tickets = 0;
    for (const milestone of MINER_EVENT_MILESTONES) {
      const reward = resolveMinerMilestoneReward(milestone, session.user.id);
      assert((await action({ kind: "claim", milestone: milestone.levels }, revision++)).ok, "claim succeeds without entry ticket");
      dice += reward.dice;
      essence += reward.essence;
      tickets += reward.tickets;
      const state2 = getIslandRunStateSnapshot(session);
      assertEqual(state2.dicePool, dice, "exact dice");
      assertEqual(state2.essence, essence, "exact money");
      assertEqual(state2.crystalMinersProgressByEvent[eventId].dropTickets, tickets, "exact game-specific drop tickets");
      assertEqual(state2.minigameTicketsByEvent[eventId] ?? 0, 0, "drop rewards cannot be multiplied or spent in other games");
      __resetIslandRunStateStoreForTests();
      refreshIslandRunStateFromLocal(session);
      assertEqual((await action({ kind: "claim", milestone: milestone.levels }, revision)).failureReason, "already_claimed", "reload does not regrant");
    }
    assertEqual((await action({ kind: "dig" }, revision)).failureReason, "campaign_complete", "no farming after final level");
    assertEqual(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId].dropTickets, tickets, "completed journey cannot consume tickets");
  } },
  { name: "level forty finishes with its open chests and never creates level forty-one", run: () => {
    const p = { ...createCrystalMinersProgress(), level: 40, blocks: createMinerBlocks(40), eventTrack: { levelsCleared: 39, claimedMilestones: [1, 10, 15, 20, 30, 35] }, tools: Array(25).fill(minerRecommendedTier(40) + 1) };
    let current = p;
    for (let i = 0; i < 4 && current.eventTrack.levelsCleared < 40; i++) current = settleMinerDig(current, simulateMinerDig(current, false));
    assertEqual(current.eventTrack.levelsCleared, 40, "final completion counted");
    assertEqual(current.level, 40, "capped course");
    assert(current.blocks.filter((b) => b.kind === "treasure").some((b) => b.hp === 0), "opened grand vault retained");
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({ done: current }).done, current, "finished journey persists");
  } },
  { name: "old terrain migrates without losing ore, merged tools, or chest damage", run: () => {
    const old = { ...createCrystalMinersProgress(), version: 1, level: 6, ore: 999, tools: Array(25).fill(4), blocks: createMinerBlocks(6, 1), eventTrack: { levelsCleared: 0, claimedMilestones: [] } };
    old.blocks[135].hp = 0;
    const migrated = sanitizeCrystalMinersProgressByEvent({ old }).old;
    assertEqual(migrated.version, 10, "new campaign version");
    assertEqual(migrated.ore, 999, "investment retained");
    assertDeepEqual(migrated.tools, old.tools, "upgrades retained");
    assertEqual(migrated.blocks[135].hp, 0, "opened chest retained");
    assertEqual(migrated.eventTrack.levelsCleared, 5, "prior levels recognized");
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({ old: migrated }).old, migrated, "migration stable after reload");
  } },
  { name: "normal finish needs one chest; the two hard approaches need two; all paths have distinct prizes", run: () => {
    for (let level2 = 1; level2 <= 40; level2++) {
      const needed = level2 % 10 === 8 || level2 % 10 === 9 ? 2 : 1;
      assertEqual(minerChestsRequired(level2), needed, "authored chest requirement");
      const p = { ...createCrystalMinersProgress(), level: level2, tools: Array(25).fill(0), blocks: createMinerBlocks(level2).map((b) => ({ ...b, hp: b.kind === "treasure" ? 1 : 0 })) };
      p.blocks[135].hp = 0;
      assertEqual(simulateMinerDig(p, false).cleared, needed === 1, "one chest normal only");
      p.blocks[136].hp = 0;
      assert(simulateMinerDig(p, false).cleared, "two chests pass hard approach");
    }
    assertEqual(new Set(MINER_CHEST_REWARDS.map((r) => r.label)).size, 5, "all lane rewards differ");
    for (let col = 0; col < 5; col++) {
      const p = createCrystalMinersProgress();
      p.tools = Array(25).fill(0);
      p.tools[col] = 1;
      p.blocks = p.blocks.map((b) => ({ ...b, hp: b.id === 135 + col ? 1 : 0 }));
      const sim = simulateMinerDig(p, false);
      assertEqual(sim.ore, MINER_CHEST_REWARDS[col].ore, "path pays advertised ore");
      assertEqual(sim.gifts, MINER_CHEST_REWARDS[col].gifts, "path pays advertised gift");
    }
  } },
  { name: "each tenth-level guardian gates all five lanes before the reward fall", run: () => {
    for (const level2 of [10, 20, 30, 40]) {
      const blocks = createMinerBlocks(level2);
      assertEqual(blocks.filter((b) => b.kind === "boss").length, 1, "one guardian");
      const p = { ...createCrystalMinersProgress(), level: level2, blocks, tools: [...Array(5).fill(1), ...Array(20).fill(0)] };
      const weak = simulateMinerDig(p, false);
      assertEqual(weak.treasures, 0, "weak tools cannot bypass guardian by outer lanes");
      assert(!weak.cleared, "live boss prevents clear");
      const strong = simulateMinerDig({ ...p, tools: Array(25).fill(minerRecommendedTier(level2) + 1) }, false);
      assert(strong.cleared, "strong fleet defeats boss and reaches finish");
    }
    for (const level2 of [8, 9, 18, 19, 28, 29, 38, 39]) assert(!createMinerBlocks(level2).some((b) => b.kind === "boss"), "approaches are hard terrain, not extra bosses");
  } },
  { name: "a properly upgraded fleet can finish every authored level within eight drops", run: () => {
    for (let level2 = 1; level2 <= 40; level2++) {
      let p = { ...createCrystalMinersProgress(), level: level2, blocks: createMinerBlocks(level2), eventTrack: { levelsCleared: level2 - 1, claimedMilestones: [] }, tools: [...Array(15).fill(minerRecommendedTier(level2) + 1), ...Array(10).fill(0)] };
      let cleared = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const sim = simulateMinerDig(p, false);
        p = settleMinerDig(p, sim);
        if (sim.cleared) {
          cleared = true;
          break;
        }
      }
      assert(cleared, `level ${level2} is reachable with a suitably upgraded fleet`);
    }
  } },
  { name: "version-two active boards stay intact; subsequent caverns use five finish paths", run: () => {
    const old = { ...createCrystalMinersProgress(), version: 2, level: 20, blocks: createMinerBlocks(20, 2), eventTrack: { levelsCleared: 19, claimedMilestones: [1, 10, 15] } };
    const saved = sanitizeCrystalMinersProgressByEvent({ old }).old;
    assertDeepEqual(saved.blocks, old.blocks, "legacy active board remains intact");
    assertEqual(saved.layoutVersion, 2, "legacy geometry retained");
    const next = settleMinerDig({ ...saved, tools: Array(25).fill(18) }, simulateMinerDig({ ...saved, tools: Array(25).fill(18) }, false));
    assertEqual(next.layoutVersion, 10, "next board adopts new geometry");
    assertEqual(next.blocks.filter((b) => b.kind === "treasure" && b.hp > 0).length, 5, "new board has five unopened chests");
    assertDeepEqual(saved.eventTrack.claimedMilestones, [1, 10, 15], "already paid claims retained");
  } },
  { name: "ordinary tools hold their chosen lane through every impact and reward", run: () => {
    const p = { ...createCrystalMinersProgress(), tools: Array(25).fill(4) };
    const sim = simulateMinerDig(p);
    for (const frame of sim.frames) for (const body of frame.bodies) assertEqual(body.x, body.id % 5 * 60 + 30, "normal impacts never change lane");
    assert(sim.treasures >= 1, "lane control still reaches finish line");
  } },
  { name: "only a rare marked deflector redirects a falling tool", run: () => {
    const p = { ...createCrystalMinersProgress(), level: 7, blocks: createMinerBlocks(7), tools: Array(25).fill(0) };
    const ramp = p.blocks.find((b) => b.kind === "deflector");
    assert(Boolean(ramp), "authored rare ramp");
    p.blocks = p.blocks.map((b) => ({ ...b, hp: b.kind === "deflector" || b.kind === "treasure" ? 1 : 0 }));
    p.tools[ramp.id % 5] = 4;
    const sim = simulateMinerDig(p);
    const final = sim.frames[sim.frames.length - 1].bodies[0];
    const destination = ramp.id % 5 === 4 ? 3 : ramp.id % 5 + 1;
    assertEqual(final.lane, destination, "arrow redirects to adjacent lane");
    assert(Math.abs(final.x - (destination * 60 + 30)) < 1, "settles in new lane");
    assertEqual(sim.blocks[135 + destination].hp, 0, "redirected path chest collected");
    assertEqual(sim.blocks[135 + ramp.id % 5].hp, 1, "original path chest untouched");
  } },
  { name: "hot-updated older workshops cannot lose tools when the next drop saves new terrain", run: async () => {
    await seed();
    const current = getIslandRunStateSnapshot(session);
    const p = { ...createCrystalMinersProgress(), version: 3, tools: Array(25).fill(5), blocks: createMinerBlocks(1, 3) };
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...current, crystalMinersProgressByEvent: { [eventId]: p } } });
    refreshIslandRunStateFromLocal(session);
    assert((await action({ kind: "dig" })).ok, "old workshop accepts new drop");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    const saved = getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId];
    assertEqual(saved.version, 10, "current schema saved");
    assert(saved.tools.every((t) => t === 5), "fleet retained after reload");
    const transitional = { ...saved, version: 3 };
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({ transitional }).transitional, saved, "exact current terrain accepted during schema transition");
  } },
  { name: "trash removes only the chosen tool without refunds and protects the last item", run: async () => {
    const p = createCrystalMinersProgress();
    const discarded = discardMinerTool(p, 5);
    assertEqual(discarded.tools[5], 0, "chosen tool removed");
    assertDeepEqual(discarded.tools.filter(Boolean), p.tools.filter((t, i) => Boolean(t) && i !== 5), "other items retained");
    assertEqual(discarded.ore, p.ore, "no refund");
    assertEqual(discardMinerTool({ ...p, tools: [1, ...Array(24).fill(0)] }, 0), null, "last item protected");
    assertEqual(discardMinerTool(p, 0), null, "wrapped gifts must first open");
    await seed();
    const results = await Promise.all([action({ kind: "trash", slot: 5 }), action({ kind: "trash", slot: 5 })]);
    assertEqual(results.filter((r) => r.ok).length, 1, "duplicate trash applied once");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    assertEqual(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId].tools[5], 0, "trash persists");
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId], 3, "trashing costs no ticket");
  } },
  { name: "forge upgrades spend only ore, respect level unlocks and persist with the career", run: async () => {
    await seed();
    const current = getIslandRunStateSnapshot(session);
    const p = { ...createCrystalMinersProgress(), ore: 1e3 };
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...current, crystalMinersProgressByEvent: { [eventId]: p } } });
    refreshIslandRunStateFromLocal(session);
    const result = await action({ kind: "upgrade" });
    assert(result.ok, "first forge upgrade");
    let saved = getIslandRunStateSnapshot(session);
    assertEqual(saved.crystalMinersProgressByEvent[eventId].forgeLevel, 1, "one rank");
    assertEqual(saved.crystalMinersProgressByEvent[eventId].ore, 910, "exact displayed ore cost");
    assertEqual(saved.dicePool, current.dicePool, "no dice spent");
    assertEqual(saved.minigameTicketsByEvent[eventId], 3, "no tickets spent");
    assertEqual((await action({ kind: "upgrade" }, 1)).failureReason, "forge_locked", "next rank requires level five");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    saved = getIslandRunStateSnapshot(session);
    assertEqual(getCrystalMinersCareer(saved.crystalMinersProgressByEvent)?.forgeLevel, 1, "career rank survives reload");
    const unupgraded = simulateMinerDig(p);
    const upgraded = simulateMinerDig({ ...p, forgeLevel: 1 });
    assertEqual(upgraded.frames[0].bodies[0].hits, unupgraded.frames[0].bodies[0].hits + 2, "every tool gets two extra impacts");
    assertEqual(upgradeMinerForge({ ...p, ore: minerForgeCost(p) - 1 }), null, "no ore overdraft");
    assertEqual(upgradeMinerForge({ ...p, level: 40, forgeLevel: 5 }), null, "rank cap");
  } },
  { name: "readiness spots critical two-lane approaches without changing outcome or cost", run: () => {
    const p = { ...createCrystalMinersProgress(), level: 9, blocks: createMinerBlocks(9), tools: [6, ...Array(24).fill(0)] };
    const hint = getMinerReadiness(p);
    assertEqual(hint.stage, "approach", "critical approach detected");
    assertEqual(hint.neededLanes, 2, "two lanes needed");
    assertEqual(hint.readyLanes, 1, "concentrated fleet lacks second lane");
    assertEqual(hint.nextBoss, 10, "upcoming boss visible");
    const before = JSON.stringify(p);
    getMinerReadiness(p);
    assertEqual(JSON.stringify(p), before, "guidance cannot alter physics or costs");
  } },
  { name: "normal and super gifts honor buying-tier odds, low rolls and rare five-to-ten-tier upgrades", run: () => {
    assertEqual(rollMinerGiftTier(6, false, 0.5), 6, "usual buying tier");
    assertEqual(rollMinerGiftTier(6, false, 0.8), 7, "ordinary better tool");
    assertEqual(rollMinerGiftTier(6, false, 0.93), 1, "rare low tier can be one");
    assertEqual(rollMinerGiftTier(6, false, 0.995), 11, "jackpot starts five above");
    assertEqual(rollMinerGiftTier(6, false, 0.99999), 16, "jackpot reaches ten above");
    let regularHigh = 0, superHigh = 0, regularBase = 0;
    for (let i = 0; i < 1e4; i++) {
      const roll = (i + 0.5) / 1e4;
      const ordinary = rollMinerGiftTier(6, false, roll);
      if (ordinary >= 11) regularHigh++;
      if (ordinary === 6) regularBase++;
      if (rollMinerGiftTier(6, true, roll) >= 11) superHigh++;
    }
    assertEqual(regularBase, 7e3, "70 percent usual");
    assertEqual(regularHigh, 50, "half-percent ordinary jackpot");
    assertEqual(superHigh, 1500, "15 percent super jackpot");
    assertEqual(rollMinerGiftTier(18, true, 0.999), 20, "safe tier ceiling");
  } },
  { name: "super gift opening consumes its marker and cannot reroll after reload", run: async () => {
    await seed();
    const current = getIslandRunStateSnapshot(session);
    const p = { ...createCrystalMinersProgress(), superGiftSlots: [0] };
    await writeIslandRunGameStateRecord({ session, client: null, record: { ...current, crystalMinersProgressByEvent: { [eventId]: p } } });
    refreshIslandRunStateFromLocal(session);
    assert((await action({ kind: "open", slot: 0 })).ok, "gift opens");
    const opened = getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId];
    assert(!opened.superGiftSlots.includes(0), "box consumed");
    assert(opened.tools[0] >= 1 && opened.tools[0] <= 11, "valid super reward");
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    assertEqual((await action({ kind: "open", slot: 0 }, 1)).ok, false, "second opening blocked");
    assertEqual(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId].tools[0], opened.tools[0], "rolled item persists");
  } },
  { name: "camera returns upward to remaining live tools after its first tool finishes", run: () => {
    const simulation = simulateMinerDig({ ...createCrystalMinersProgress(), tools: [4, 4, ...Array(23).fill(0)] });
    const base = simulation.frames[0];
    const bodies = base.bodies.map((b, i) => ({ ...b, active: true, y: i === 0 ? 1050 : 200 }));
    const frames = [...Array(20).fill({ ...base, bodies }), ...Array(15).fill({ ...base, bodies: bodies.map((b, i) => ({ ...b, active: i !== 0 })) })];
    const camera = createMinerReplayCamera(frames);
    assertEqual(camera[19].toolId, 0, "follows leading live tool");
    assertEqual(camera[20].toolId, 1, "switches to survivor");
    assert(camera[20].returning, "signals upward return");
    assert(camera[34].y < camera[19].y - 300, "camera returns up the shaft");
    assert(camera.every((c) => Number.isFinite(c.y) && c.y >= 0), "camera positions safe");
  } },
  { name: "camera follows overtaking leaders immediately and keeps fast descents in view", run: () => {
    const base = simulateMinerDig({ ...createCrystalMinersProgress(), tools: [4, 4, ...Array(23).fill(0)] }).frames[0];
    const frame = (positions) => ({ ...base, bodies: base.bodies.map((body, i) => ({ ...body, active: true, y: positions[i] })) });
    const frames = [frame([300, 100]), frame([310, 620]), frame([850, 700]), frame([860, 1e3])];
    const camera = createMinerReplayCamera(frames);
    assertDeepEqual(camera.map((c) => c.toolId), [0, 1, 0, 1], "camera switches on every overtake instead of sticking to a slower tool");
    frames.forEach((f, i) => assert(Math.max(...f.bodies.map((b) => b.y)) - camera[i].y <= 300, "fastest descent stays within the camera safe area"));
  } },
  { name: "complete forty-level campaigns use canonical upgrades, gift openings, tickets and automatic milestone wallets", run: async () => {
    for (const buysPerDig of [2, 8]) {
      await seed(3);
      const start = getIslandRunStateSnapshot(session);
      const originalRandom = Math.random;
      let randomIndex = buysPerDig * 1e4;
      Math.random = () => minerGiftRarityRoll(++randomIndex);
      try {
        const progress = () => getCrystalMinersCareer(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent) ?? createCrystalMinersProgress();
        const run = async (command) => {
          const result = await action(command, progress().revision);
          assert(result.ok, `campaign action ${command.kind} succeeds: ${result.failureReason ?? "ok"}`);
          return result;
        };
        const clearedLevels = [];
        const returnsAt = [];
        const attempts = {};
        for (let attempt = 0; attempt < 180 && progress().eventTrack.levelsCleared < 40; attempt++) {
          for (let slot = 0; slot < 25; slot++) if (progress().tools[slot] < 0) await run({ kind: "open", slot });
          let p = progress();
          if (p.forgeLevel < 5 && p.level >= MINER_FORGE_UNLOCKS[p.forgeLevel] && p.ore >= minerForgeCost(p)) await run({ kind: "upgrade" });
          for (let pass = 0; pass < 30; pass++) {
            p = progress();
            let pair = null;
            for (let tier = 1; tier < MINER_MAX_TIER && !pair; tier++) for (let from = 0; from < 25 && !pair; from++) if (p.tools[from] === tier) {
              for (let to = from + 1; to < 25; to++) if (p.tools[to] === tier && (from % 5 === to % 5 || p.tools.filter(Boolean).length >= 23)) {
                pair = [from, to];
                break;
              }
            }
            if (!pair) break;
            await run({ kind: "move", from: pair[0], to: pair[1] });
          }
          for (let buy = 0; buy < buysPerDig; buy++) {
            p = progress();
            if (!p.tools.includes(0) || p.ore < minerBuyCost(p)) break;
            await run({ kind: "buy" });
          }
          for (let gift = 0; gift < 25 && progress().giftsWaiting > 0 && progress().tools.includes(0); gift++) {
            await run({ kind: "gift" });
            for (let slot = 0; slot < 25; slot++) if (progress().tools[slot] < 0) await run({ kind: "open", slot });
          }
          const before = getIslandRunStateSnapshot(session);
          if (eventGamePlaysAvailable("crystal_miners", before.minigameTicketsByEvent[eventId] ?? 0, progress().dropTickets) < 1) {
            returnsAt.push(progress().level);
            assertEqual((await action({ kind: "dig" }, progress().revision)).failureReason, "insufficient_tickets", "real pause at exhausted ticket balance");
            applyTimedEventTicketTileGrant({ session, client: null, eventId, amount: 5, triggerSource: "test_modeled_island_earning" });
          }
          const level2 = progress().level;
          attempts[String(level2)] = (attempts[String(level2)] ?? 0) + 1;
          const result = await run({ kind: "dig" });
          if (result.simulation?.cleared) clearedLevels.push(level2);
          if (level2 % 10 === 0) {
            __resetIslandRunStateStoreForTests();
            refreshIslandRunStateFromLocal(session);
          }
        }
        const end = getIslandRunStateSnapshot(session);
        const career = progress();
        assertEqual(career.eventTrack.levelsCleared, 40, "all forty playable through real actions");
        assertDeepEqual(clearedLevels, Array.from({ length: 40 }, (_, i) => i + 1), "no level skipped");
        assertDeepEqual(career.eventTrack.claimedMilestones, [1, 10, 15, 20, 30, 35, 40], "all milestones automatically paid once");
        const prizes = MINER_EVENT_MILESTONES.map((m) => resolveMinerMilestoneReward(m, session.user.id));
        assertEqual(end.dicePool, start.dicePool + prizes.reduce((n, p) => n + p.dice, 0), "exact final dice wallet");
        assertEqual(end.essence, start.essence + prizes.reduce((n, p) => n + p.essence, 0), "exact final money wallet");
        assert(returnsAt.length > 0, "natural earning pauses occur");
        assert(career.forgeLevel >= 3, "policy keeps investing in forge");
        assert(career.digs >= (buysPerDig === 2 ? 48 : 44) && career.digs < 80, "upgrading policy meets meaningful resistance without an excessive grind");
        assert((attempts["38"] ?? 0) > 1 || (attempts["39"] ?? 0) > 1, "fixed hard approaches still demand repeat preparation");
        console.log("CANONICAL_CAMPAIGN", JSON.stringify({ buysPerDig, drops: career.digs, forgeLevel: career.forgeLevel, ore: career.ore, highestTier: Math.max(...career.tools), returnsAt, attempts, diceReward: end.dicePool - start.dicePool, essenceReward: end.essence - start.essence }));
      } finally {
        Math.random = originalRandom;
      }
    }
  } },
  { name: "matching tools merge; unlike tools swap; empty destinations move", run: () => {
    const p = createCrystalMinersProgress();
    const merged = arrangeMinerTools(p, 5, 6);
    assertEqual(merged.tools[6], 2, "same tier upgrades");
    assertEqual(merged.tools[5], 0, "source consumed");
    const swapped = arrangeMinerTools(merged, 6, 7);
    assertEqual(swapped.tools[7], 2, "different tiers swap");
    assertEqual(swapped.tools[6], 1, "swap preserves other");
    const moved = arrangeMinerTools(swapped, 7, 24);
    assertEqual(moved.tools[24], 2, "empty slot moves");
    assertEqual(moved.tools[7], 0, "source empty");
    assertEqual(p.tools[5], 1, "input untouched");
  } },
  { name: "invalid and maximum-tier merges do not destroy tools", run: () => {
    const p = createCrystalMinersProgress();
    for (const [from, to] of [[-1, 2], [0, 25], [1.5, 2], [5, 5], [24, 0]]) assertEqual(arrangeMinerTools(p, from, to), null, "invalid rejected");
    p.tools[0] = MINER_MAX_TIER;
    p.tools[1] = MINER_MAX_TIER;
    assertEqual(arrangeMinerTools(p, 0, 1), null, "max tier preserved");
  } },
  { name: "purchases cost exactly the displayed ore, and cannot overfill or overdraft", run: () => {
    const p = createCrystalMinersProgress();
    const bought = buyMinerTool(p);
    assertEqual(bought.ore, p.ore - minerBuyCost(p), "correct price");
    assertEqual(buyMinerTool({ ...p, ore: 0 }), null, "no overdraft");
    assertEqual(buyMinerTool({ ...p, tools: Array(25).fill(1) }), null, "full rack rejected");
  } },
  { name: "simulation is deterministic, bounded, non-mutating and produces damage", run: () => {
    const p = createCrystalMinersProgress();
    const before = JSON.stringify(p);
    const a = simulateMinerDig(p);
    const b = simulateMinerDig(p);
    assertDeepEqual(a, b, "same inputs replay exactly");
    assertEqual(JSON.stringify(p), before, "input unchanged");
    assert(a.broken > 0, "first dig breaks terrain");
    assert(a.ore > 0, "mining earns ore");
    assert(a.frames[a.frames.length - 1].step <= MINER_MAX_STEPS, "bounded");
    assert(a.blocks.every((x, i) => x.hp <= p.blocks[i].hp), "damage only decreases hp");
  } },
  { name: "repeated expeditions can recover all treasures and advance a cavern", run: () => {
    let p = createCrystalMinersProgress();
    p.tools = Array(25).fill(4);
    let cleared = false;
    for (let i = 0; i < 6; i++) {
      const sim = simulateMinerDig(p, false);
      p = settleMinerDig(p, sim);
      if (sim.cleared) {
        cleared = true;
        break;
      }
    }
    assert(cleared, "well-upgraded deck reaches all treasures");
    assertEqual(p.level, 2, "one cavern advancement");
    assert(p.totalTreasures >= 1 && p.totalTreasures <= 5, "at least one finish-line chest recovered");
    assertDeepEqual(p.blocks, createMinerBlocks(2), "next cavern starts with its authored terrain");
  } },
  { name: "save sanitizer rejects malformed decks and forged terrain", run: () => {
    const p = createCrystalMinersProgress();
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({ [eventId]: p }), { [eventId]: p }, "valid roundtrip");
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({ bad: { ...p, tools: [Infinity] } }), {}, "bad deck rejected");
    const blocks = p.blocks.map((x) => ({ ...x }));
    blocks[0].kind = "treasure";
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({ bad: { ...p, blocks } }), {}, "forged treasure rejected");
  } },
  { name: "conflict winner is an entire newer snapshot, without resurrecting spent ore", run: () => {
    const a = { ...createCrystalMinersProgress(), ore: 99, revision: 1 };
    const b = { ...a, ore: 1, revision: 2 };
    assertEqual(mergeCrystalMinersProgressByEvent({ [eventId]: a }, { [eventId]: b })[eventId].ore, 1, "newer low balance wins");
    assertEqual(mergeCrystalMinersProgressByEvent({ [eventId]: b }, { [eventId]: a })[eventId].revision, 2, "stale write ignored");
  } },
  { name: "one atomic dig spends one ticket, persists damage and credits event progress", run: async () => {
    await seed();
    const before = getIslandRunStateSnapshot(session);
    const result = await action({ kind: "dig" });
    assert(result.ok, "dig succeeds");
    const after = getIslandRunStateSnapshot(session);
    assertEqual(after.minigameTicketsByEvent[eventId], 2, "one ticket spent");
    assert(after.rewardBarProgress > before.rewardBarProgress, "event reward bar credited");
    assertEqual(after.crystalMinersProgressByEvent[eventId].digs, 1, "one dig saved");
    assertEqual(after.dicePool, before.dicePool + (result.simulation?.cleared ? 25 : 0), "only the first-clear milestone can grant dice");
    const stored = readIslandRunGameStateRecord(session);
    assertDeepEqual(stored.crystalMinersProgressByEvent, after.crystalMinersProgressByEvent, "full save persisted");
  } },
  { name: "duplicate/concurrent commands use compare-and-set, spending and rewarding once", run: async () => {
    await seed();
    const results = await Promise.all([action({ kind: "dig" }), action({ kind: "dig" })]);
    assertEqual(results.filter((r) => r.ok).length, 1, "one action accepted");
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId], 2, "single spend");
    const before = JSON.stringify(getIslandRunStateSnapshot(session));
    assertEqual((await action({ kind: "dig" })).ok, false, "replay rejected");
    assertEqual(JSON.stringify(getIslandRunStateSnapshot(session)), before, "replay inert");
  } },
  { name: "out of tickets does not change any canonical state", run: async () => {
    await seed(0);
    const before = JSON.stringify(getIslandRunStateSnapshot(session));
    assertEqual((await action({ kind: "dig" })).failureReason, "insufficient_tickets", "reason");
    assertEqual(JSON.stringify(getIslandRunStateSnapshot(session)), before, "no mutation");
  } },
  { name: "expired and mismatched events cannot spend or reward", run: async () => {
    await seed();
    assertEqual((await action({ kind: "dig" }, 0, 100001)).failureReason, "event_expired", "expired blocked");
    const result = await applyCrystalMinersAction({ session, client: null, eventId: "old-event", command: { kind: "dig" }, expectedRevision: 0, nowMs: 500 });
    assertEqual(result.ok, false, "wrong event blocked");
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId], 3, "tickets intact");
  } },
  { name: "reload preserves rack, block damage, spend and receipt without another grant", run: async () => {
    await seed();
    await action({ kind: "move", from: 5, to: 6 });
    await action({ kind: "dig" }, 1);
    const expected = getIslandRunStateSnapshot(session);
    __resetIslandRunStateStoreForTests();
    refreshIslandRunStateFromLocal(session);
    const restored = getIslandRunStateSnapshot(session);
    assertDeepEqual(restored.crystalMinersProgressByEvent, expected.crystalMinersProgressByEvent, "exact resume");
    assertEqual(restored.rewardBarProgress, expected.rewardBarProgress, "no extra reward");
  } },
  { name: "remote conflict cannot restore tickets spent by a newer mining action", run: async () => {
    await seed();
    const old = getIslandRunStateSnapshot(session);
    await action({ kind: "dig" });
    const fresh = getIslandRunStateSnapshot(session);
    for (const [remote, local] of [[old, fresh], [fresh, old]]) {
      const merged = resolveIslandRunRecordForConflict({ remote, local, conflictMode: "merge" });
      assertEqual(merged.minigameTicketsByEvent[eventId], 2, "spent ticket stays spent");
      assertEqual(merged.crystalMinersProgressByEvent[eventId].digs, 1, "latest dig retained");
    }
  } },
  { name: "exit can resolve an Arena objective without double-crediting event rewards", run: () => {
    const options = { launchSource: "timed_event", minigameId: "crystal_miners", completed: true };
    assertEqual(resolveEventMinigameCompletionId(options), null, "no callback reward");
    assertEqual(shouldResolveEventArenaStopOnMinigameComplete(options), true, "objective accepted");
    assertEqual(shouldResolveEventArenaStopOnMinigameComplete({ ...options, completed: false }), false, "abandon no completion");
  } }
];

// src/features/gamification/level-worlds/services/islandRunArenaPreferences.ts
var ARENA_DISABLED_FRACTION = 0.25;
var DEFAULT_ARENA_MINIGAME_PREFERENCES = {
  rankedEventIds: [...ARENA_GAME_IDS],
  disabledEventIds: []
};
function shouldExposeArenaTimedEvent(options) {
  return options.isAdmin || options.isLocalDevelopment && options.isDevModeEnabled;
}
function getArenaDisabledLimit(totalGames = ARENA_GAME_IDS.length) {
  return Math.max(0, Math.floor(Math.max(0, totalGames) * ARENA_DISABLED_FRACTION));
}
function normalizeArenaPreferences(value) {
  const input = value && typeof value === "object" ? value : {};
  const rankedEventIds = Array.isArray(input.rankedEventIds) ? input.rankedEventIds.filter(isArenaGameId) : [];
  const uniqueRanked = Array.from(new Set(rankedEventIds));
  ARENA_GAME_IDS.forEach((eventId2) => {
    if (!uniqueRanked.includes(eventId2)) uniqueRanked.push(eventId2);
  });
  const disabledLimit = getArenaDisabledLimit(ARENA_GAME_IDS.length);
  const disabledEventIds = Array.isArray(input.disabledEventIds) ? Array.from(new Set(input.disabledEventIds.filter(isArenaGameId))).slice(0, disabledLimit) : [];
  return {
    rankedEventIds: uniqueRanked,
    disabledEventIds
  };
}
function moveArenaEvent(preferences, eventId2, direction, allowedGameIds = ARENA_GAME_IDS) {
  const normalized = normalizeArenaPreferences(preferences);
  const currentIndex = normalized.rankedEventIds.indexOf(eventId2);
  const visible = normalized.rankedEventIds.filter((id2) => allowedGameIds.includes(id2));
  const visibleIndex = visible.indexOf(eventId2);
  const neighbor = visible[visibleIndex + direction];
  const nextIndex = neighbor ? normalized.rankedEventIds.indexOf(neighbor) : currentIndex;
  if (currentIndex < 0 || currentIndex === nextIndex) return normalized;
  const rankedEventIds = [...normalized.rankedEventIds];
  [rankedEventIds[currentIndex], rankedEventIds[nextIndex]] = [
    rankedEventIds[nextIndex],
    rankedEventIds[currentIndex]
  ];
  return { ...normalized, rankedEventIds };
}
function toggleArenaEvent(preferences, eventId2, allowedGameIds = ARENA_GAME_IDS) {
  const normalized = normalizeArenaPreferences(preferences);
  const isDisabled = normalized.disabledEventIds.includes(eventId2);
  if (isDisabled) {
    return {
      preferences: {
        ...normalized,
        disabledEventIds: normalized.disabledEventIds.filter((id2) => id2 !== eventId2)
      },
      changed: true,
      reason: null
    };
  }
  if (normalized.disabledEventIds.filter((id2) => allowedGameIds.includes(id2)).length >= getArenaDisabledLimit(allowedGameIds.length)) {
    return {
      preferences: normalized,
      changed: false,
      reason: `You can pause ${getArenaDisabledLimit(allowedGameIds.length)} of your ${allowedGameIds.length} introduced Arena games (25%). Turn another game back on first.`
    };
  }
  return {
    preferences: {
      ...normalized,
      disabledEventIds: [...normalized.disabledEventIds, eventId2]
    },
    changed: true,
    reason: null
  };
}
function resolveArenaSessionPace(preferences, eventId2, allowedGameIds = ARENA_GAME_IDS) {
  const normalized = normalizeArenaPreferences(preferences);
  if (normalized.disabledEventIds.includes(eventId2)) return null;
  const enabled = normalized.rankedEventIds.filter((id2) => allowedGameIds.includes(id2) && !normalized.disabledEventIds.includes(id2));
  const index = enabled.indexOf(eventId2);
  if (index < 0) return "fast";
  const edgeSize = Math.max(1, Math.floor(enabled.length * 0.25));
  if (index < edgeSize) return "full";
  if (index >= enabled.length - edgeSize) return "flash";
  return "fast";
}
function getArenaPreferenceRows(preferences, allowedGameIds = ARENA_GAME_IDS) {
  const normalized = normalizeArenaPreferences(preferences);
  return normalized.rankedEventIds.map((eventId2, index) => {
    const game = getArenaGameDefinition(eventId2);
    return {
      eventId: eventId2,
      rank: index + 1,
      disabled: normalized.disabledEventIds.includes(eventId2),
      pace: resolveArenaSessionPace(normalized, eventId2, allowedGameIds),
      icon: game.icon,
      displayName: game.displayName,
      artSrc: game.artSrc,
      catalogKind: game.availability === "exhibition" ? "exhibition" : "rotation"
    };
  });
}

// src/features/gamification/level-worlds/services/__tests__/islandRunArenaPreferences.test.ts
function assert2(condition, message) {
  if (!condition) throw new Error(message);
}
var islandRunArenaPreferencesTests = [
  { name: "introduced subset owns pacing, adjacent moves and pause capacity", run() {
    const ids = ["signal_path", "crystal_miners"];
    assert2(resolveArenaSessionPace(DEFAULT_ARENA_MINIGAME_PREFERENCES, "signal_path", ["signal_path"]) === "full", "first game has no hidden-game short timer");
    const moved = moveArenaEvent(DEFAULT_ARENA_MINIGAME_PREFERENCES, "signal_path", -1, ids);
    assert2(moved.rankedEventIds.indexOf("signal_path") < moved.rankedEventIds.indexOf("crystal_miners"), "moves past hidden entries");
    assert2(!toggleArenaEvent(DEFAULT_ARENA_MINIGAME_PREFERENCES, "signal_path", ["signal_path"]).changed, "cannot pause only introduced game");
  } },
  {
    name: "timed event games stay admin-only except in an explicitly unlocked local QA session",
    run: () => {
      assert2(shouldExposeArenaTimedEvent({ isAdmin: true, isDevModeEnabled: false, isLocalDevelopment: false }), "admins should see Arena events");
      assert2(shouldExposeArenaTimedEvent({ isAdmin: false, isDevModeEnabled: true, isLocalDevelopment: true }), "local dev mode should expose Arena events for QA");
      assert2(!shouldExposeArenaTimedEvent({ isAdmin: false, isDevModeEnabled: true, isLocalDevelopment: false }), "production guests must not gain Arena event access from dev-mode state");
      assert2(!shouldExposeArenaTimedEvent({ isAdmin: false, isDevModeEnabled: false, isLocalDevelopment: true }), "local guests must explicitly unlock dev mode");
    }
  },
  {
    name: "normalization restores each canonical game exactly once",
    run: () => {
      const result = normalizeArenaPreferences({
        rankedEventIds: ["lucky_spin", "lucky_spin", "unknown"],
        disabledEventIds: ["lucky_spin", "space_excavator"]
      });
      assert2(result.rankedEventIds.length === ARENA_GAME_IDS.length, "expected every canonical Arena game");
      assert2(new Set(result.rankedEventIds).size === ARENA_GAME_IDS.length, "expected no duplicate games");
      assert2(result.disabledEventIds.length === 2, "expected the 25% disabled cap");
    }
  },
  {
    name: "only 25% of canonical Arena games can be disabled",
    run: () => {
      assert2(getArenaDisabledLimit() === 3, "expected three disabled slots for twelve games");
      const first2 = toggleArenaEvent(DEFAULT_ARENA_MINIGAME_PREFERENCES, "lucky_spin");
      assert2(first2.changed, "first pause should succeed");
      const second = toggleArenaEvent(first2.preferences, "feeding_frenzy");
      assert2(second.changed, "second pause should succeed");
      const third = toggleArenaEvent(second.preferences, "signal_path");
      assert2(third.changed, "third pause should succeed");
      const fourth = toggleArenaEvent(third.preferences, "crystal_miners");
      assert2(!fourth.changed, "fourth pause should be refused");
      assert2(Boolean(fourth.reason), "refusal should explain the cap");
    }
  },
  {
    name: "ranking produces full, middle-fast, and flash pacing",
    run: () => {
      const rows = getArenaPreferenceRows(DEFAULT_ARENA_MINIGAME_PREFERENCES);
      assert2(rows.map((row) => row.pace).join(",") === "full,full,full,fast,fast,fast,fast,fast,fast,flash,flash,flash", "unexpected pace tiers");
      assert2(resolveArenaSessionPace(DEFAULT_ARENA_MINIGAME_PREFERENCES, "twin_sigils") === "flash", "last game should flash");
    }
  },
  {
    name: "moving a game changes its pace and paused games have no session",
    run: () => {
      const moved = moveArenaEvent(DEFAULT_ARENA_MINIGAME_PREFERENCES, "companion_feast", -1);
      const movedAgain = moveArenaEvent(moved, "companion_feast", -1);
      const movedToTop = moveArenaEvent(movedAgain, "companion_feast", -1);
      assert2(resolveArenaSessionPace(movedToTop, "companion_feast") === "full", "promoted game should become full");
      const paused = toggleArenaEvent(movedToTop, "lucky_spin").preferences;
      assert2(resolveArenaSessionPace(paused, "lucky_spin") === null, "paused game should not launch");
    }
  }
];

// crystal-miners-runner.ts
var failed = 0;
for (const test of [...crystalMinersTests, ...islandRunArenaPreferencesTests]) {
  try {
    await test.run();
    console.log("PASS", test.name);
  } catch (error) {
    failed++;
    console.error("FAIL", test.name, error);
  }
}
if (failed) process.exitCode = 1;
