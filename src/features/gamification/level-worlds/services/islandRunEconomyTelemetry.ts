export type IslandRunEconomyDirection = 'inflow' | 'outflow' | 'counter';

export const ISLAND_RUN_ECONOMY_SOURCES = {
  rewardBarDice: 'reward_bar_dice',
  stickerCompletionBonusDice: 'sticker_completion_bonus_dice',
  luckyRollDice: 'lucky_roll_dice',
  spaceExcavatorMilestoneDice: 'space_excavator_milestone_dice',
  passiveRegenDice: 'passive_regen_dice',
  dailyTreatDice: 'daily_treat_dice',
  welcomePackDice: 'welcome_pack_dice',
  firstSessionTutorialDice: 'first_session_tutorial_dice',
  firstRunStarterDice: 'first_run_starter_dice',
  devAdminGrantDice: 'dev_admin_grant_dice',
  tokenHopDice: 'token_hop_dice',
  eggRewardDice: 'egg_reward_dice',
  creatureFormUpgradeDice: 'creature_form_upgrade_dice',
  unknownDiceDelta: 'unknown_dice_delta',
} as const;

export const ISLAND_RUN_ECONOMY_SINKS = {
  rollSpendDice: 'roll_spend_dice',
  ticketSpend: 'event_ticket_spend',
  unknownDiceDelta: 'unknown_dice_delta',
} as const;

export const ISLAND_RUN_ECONOMY_COUNTERS = {
  rewardBarClaims: 'reward_bar_claims',
  rewardBarChainedClaims: 'reward_bar_chained_claims',
  eventTicketsEarned: 'event_tickets_earned',
  eventTicketsSpent: 'event_tickets_spent',
  multiplierUse: 'multiplier_use',
  rewardBarTierReached: 'reward_bar_tier_reached',
  creatureFormShardSpend: 'creature_form_shard_spend',
} as const;

export type IslandRunEconomySource = typeof ISLAND_RUN_ECONOMY_SOURCES[keyof typeof ISLAND_RUN_ECONOMY_SOURCES];
export type IslandRunEconomySink = typeof ISLAND_RUN_ECONOMY_SINKS[keyof typeof ISLAND_RUN_ECONOMY_SINKS];
export type IslandRunEconomyCounter = typeof ISLAND_RUN_ECONOMY_COUNTERS[keyof typeof ISLAND_RUN_ECONOMY_COUNTERS];
export type IslandRunEconomyMetric = IslandRunEconomySource | IslandRunEconomySink | IslandRunEconomyCounter;

export interface IslandRunEconomyTelemetryEvent {
  direction: IslandRunEconomyDirection;
  metric: IslandRunEconomyMetric;
  amount: number;
  atMs: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface IslandRunEconomyTelemetryReport {
  sessionId: string;
  startedAtMs: number;
  updatedAtMs: number;
  diceInflowBySource: Partial<Record<IslandRunEconomySource, number>>;
  diceOutflowBySink: Partial<Record<IslandRunEconomySink, number>>;
  counters: Partial<Record<IslandRunEconomyCounter, number>>;
  totalDiceInflow: number;
  totalDiceOutflow: number;
  netDiceDelta: number;
  averageMultiplierUsed: number;
  highestMultiplierUsed: number;
  rewardBarTierReached: number;
  events: IslandRunEconomyTelemetryEvent[];
}

export interface IslandRunEconomyTelemetrySnapshot {
  timestamp: string;
  sessionId: string;
  totalInflow: number;
  totalOutflow: number;
  netDiceDelta: number;
  inflowBySource: Partial<Record<IslandRunEconomySource, number>>;
  outflowBySink: Partial<Record<IslandRunEconomySink, number>>;
  rewardBarClaims: number;
  chainedClaims: number;
  rewardBarTierReached: number;
  averageMultiplier: number;
  highestMultiplier: number;
  ticketsEarned: number;
  ticketsSpent: number;
}

interface IslandRunEconomyTelemetryLedgerState {
  sessionId: string;
  startedAtMs: number;
  updatedAtMs: number;
  diceInflowBySource: Map<IslandRunEconomySource, number>;
  diceOutflowBySink: Map<IslandRunEconomySink, number>;
  counters: Map<IslandRunEconomyCounter, number>;
  multiplierTotal: number;
  multiplierSamples: number;
  highestMultiplierUsed: number;
  rewardBarTierReached: number;
  events: IslandRunEconomyTelemetryEvent[];
}

const DEFAULT_SESSION_ID = 'default';
const ledgers = new Map<string, IslandRunEconomyTelemetryLedgerState>();

function normalizeSessionId(sessionId?: string): string {
  const trimmed = typeof sessionId === 'string' ? sessionId.trim() : '';
  return trimmed || DEFAULT_SESSION_ID;
}

function normalizeAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.floor(amount));
}

function getLedger(sessionId?: string, nowMs = Date.now()): IslandRunEconomyTelemetryLedgerState {
  const key = normalizeSessionId(sessionId);
  const existing = ledgers.get(key);
  if (existing) return existing;
  const ledger: IslandRunEconomyTelemetryLedgerState = {
    sessionId: key,
    startedAtMs: Math.floor(nowMs),
    updatedAtMs: Math.floor(nowMs),
    diceInflowBySource: new Map(),
    diceOutflowBySink: new Map(),
    counters: new Map(),
    multiplierTotal: 0,
    multiplierSamples: 0,
    highestMultiplierUsed: 0,
    rewardBarTierReached: 0,
    events: [],
  };
  ledgers.set(key, ledger);
  return ledger;
}

function addToMap<T extends string>(map: Map<T, number>, key: T, amount: number): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function recordEvent(ledger: IslandRunEconomyTelemetryLedgerState, event: IslandRunEconomyTelemetryEvent): void {
  ledger.updatedAtMs = Math.max(ledger.updatedAtMs, event.atMs);
  ledger.events.push(event);
}

export function recordIslandRunDiceInflow(options: {
  source: IslandRunEconomySource;
  amount: number;
  sessionId?: string;
  atMs?: number;
  metadata?: Record<string, unknown>;
}): void {
  const amount = normalizeAmount(options.amount);
  if (amount < 1) return;
  const atMs = Math.floor(options.atMs ?? Date.now());
  const ledger = getLedger(options.sessionId, atMs);
  addToMap(ledger.diceInflowBySource, options.source, amount);
  recordEvent(ledger, {
    direction: 'inflow',
    metric: options.source,
    amount,
    atMs,
    sessionId: ledger.sessionId,
    metadata: options.metadata,
  });
}

export function recordIslandRunDiceOutflow(options: {
  sink: IslandRunEconomySink;
  amount: number;
  sessionId?: string;
  atMs?: number;
  metadata?: Record<string, unknown>;
}): void {
  const amount = normalizeAmount(options.amount);
  if (amount < 1) return;
  const atMs = Math.floor(options.atMs ?? Date.now());
  const ledger = getLedger(options.sessionId, atMs);
  addToMap(ledger.diceOutflowBySink, options.sink, amount);
  recordEvent(ledger, {
    direction: 'outflow',
    metric: options.sink,
    amount,
    atMs,
    sessionId: ledger.sessionId,
    metadata: options.metadata,
  });
}

export function recordIslandRunEconomyCounter(options: {
  counter: IslandRunEconomyCounter;
  amount?: number;
  sessionId?: string;
  atMs?: number;
  metadata?: Record<string, unknown>;
}): void {
  const amount = normalizeAmount(options.amount ?? 1);
  if (amount < 1) return;
  const atMs = Math.floor(options.atMs ?? Date.now());
  const ledger = getLedger(options.sessionId, atMs);
  addToMap(ledger.counters, options.counter, amount);
  recordEvent(ledger, {
    direction: 'counter',
    metric: options.counter,
    amount,
    atMs,
    sessionId: ledger.sessionId,
    metadata: options.metadata,
  });
}

export function recordIslandRunMultiplierUsed(options: {
  multiplier: number;
  sessionId?: string;
  atMs?: number;
  metadata?: Record<string, unknown>;
}): void {
  const multiplier = normalizeAmount(options.multiplier);
  if (multiplier < 1) return;
  const atMs = Math.floor(options.atMs ?? Date.now());
  const ledger = getLedger(options.sessionId, atMs);
  ledger.multiplierTotal += multiplier;
  ledger.multiplierSamples += 1;
  ledger.highestMultiplierUsed = Math.max(ledger.highestMultiplierUsed, multiplier);
  recordIslandRunEconomyCounter({
    counter: ISLAND_RUN_ECONOMY_COUNTERS.multiplierUse,
    amount: 1,
    sessionId: ledger.sessionId,
    atMs,
    metadata: { ...options.metadata, multiplier },
  });
}

export function recordIslandRunRewardBarTierReached(options: {
  tier: number;
  sessionId?: string;
  atMs?: number;
  metadata?: Record<string, unknown>;
}): void {
  const tier = normalizeAmount(options.tier);
  if (tier < 1) return;
  const atMs = Math.floor(options.atMs ?? Date.now());
  const ledger = getLedger(options.sessionId, atMs);
  ledger.rewardBarTierReached = Math.max(ledger.rewardBarTierReached, tier);
  recordIslandRunEconomyCounter({
    counter: ISLAND_RUN_ECONOMY_COUNTERS.rewardBarTierReached,
    amount: 1,
    sessionId: ledger.sessionId,
    atMs,
    metadata: { ...options.metadata, tier },
  });
}

function mapToRecord<T extends string>(map: Map<T, number>): Partial<Record<T, number>> {
  return Array.from(map.entries()).reduce<Partial<Record<T, number>>>((record, [key, amount]) => {
    record[key] = amount;
    return record;
  }, {});
}

function sumMap(map: Map<string, number>): number {
  return Array.from(map.values()).reduce((total, amount) => total + amount, 0);
}

export function getIslandRunEconomyTelemetryReport(sessionId?: string): IslandRunEconomyTelemetryReport {
  const ledger = getLedger(sessionId);
  const totalDiceInflow = sumMap(ledger.diceInflowBySource);
  const totalDiceOutflow = sumMap(ledger.diceOutflowBySink);
  return {
    sessionId: ledger.sessionId,
    startedAtMs: ledger.startedAtMs,
    updatedAtMs: ledger.updatedAtMs,
    diceInflowBySource: mapToRecord(ledger.diceInflowBySource),
    diceOutflowBySink: mapToRecord(ledger.diceOutflowBySink),
    counters: mapToRecord(ledger.counters),
    totalDiceInflow,
    totalDiceOutflow,
    netDiceDelta: totalDiceInflow - totalDiceOutflow,
    averageMultiplierUsed: ledger.multiplierSamples > 0 ? ledger.multiplierTotal / ledger.multiplierSamples : 0,
    highestMultiplierUsed: ledger.highestMultiplierUsed,
    rewardBarTierReached: ledger.rewardBarTierReached,
    events: ledger.events.map((event) => ({ ...event, metadata: event.metadata ? { ...event.metadata } : undefined })),
  };
}

export function resetIslandRunEconomyTelemetry(sessionId?: string): void {
  if (sessionId === undefined) {
    ledgers.clear();
    return;
  }
  ledgers.delete(normalizeSessionId(sessionId));
}

export function getIslandRunEconomyTelemetrySnapshot(sessionId?: string, timestampMs = Date.now()): IslandRunEconomyTelemetrySnapshot {
  const report = getIslandRunEconomyTelemetryReport(sessionId);
  return {
    timestamp: new Date(timestampMs).toISOString(),
    sessionId: report.sessionId,
    totalInflow: report.totalDiceInflow,
    totalOutflow: report.totalDiceOutflow,
    netDiceDelta: report.netDiceDelta,
    inflowBySource: report.diceInflowBySource,
    outflowBySink: report.diceOutflowBySink,
    rewardBarClaims: report.counters[ISLAND_RUN_ECONOMY_COUNTERS.rewardBarClaims] ?? 0,
    chainedClaims: report.counters[ISLAND_RUN_ECONOMY_COUNTERS.rewardBarChainedClaims] ?? 0,
    rewardBarTierReached: report.rewardBarTierReached,
    averageMultiplier: report.averageMultiplierUsed,
    highestMultiplier: report.highestMultiplierUsed,
    ticketsEarned: report.counters[ISLAND_RUN_ECONOMY_COUNTERS.eventTicketsEarned] ?? 0,
    ticketsSpent: report.counters[ISLAND_RUN_ECONOMY_COUNTERS.eventTicketsSpent] ?? 0,
  };
}

export function formatIslandRunEconomyTelemetrySnapshot(sessionId?: string, timestampMs?: number): string {
  return JSON.stringify(getIslandRunEconomyTelemetrySnapshot(sessionId, timestampMs), null, 2);
}

export function formatIslandRunEconomyTelemetryReport(sessionId?: string): string {
  const report = getIslandRunEconomyTelemetryReport(sessionId);
  return JSON.stringify({
    sessionId: report.sessionId,
    diceInflowBySource: report.diceInflowBySource,
    diceOutflowBySink: report.diceOutflowBySink,
    counters: report.counters,
    totalDiceInflow: report.totalDiceInflow,
    totalDiceOutflow: report.totalDiceOutflow,
    netDiceDelta: report.netDiceDelta,
    averageMultiplierUsed: report.averageMultiplierUsed,
    highestMultiplierUsed: report.highestMultiplierUsed,
    rewardBarTierReached: report.rewardBarTierReached,
  }, null, 2);
}
