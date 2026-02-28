import {
  DICE_PACK_DEFINITIONS,
  DicePackId,
  MYSTERY_BOX_DICE_TIERS,
  MYSTERY_BOX_TOKEN_TIERS,
} from '../constants/economy';
import {
  normalizeHabitGameId,
  type HabitGameId,
  type LegacyHabitGameId,
} from '../types/habitGames';

const STORAGE_KEY_CURRENCIES = 'gol_game_currencies';
const STORAGE_KEY_EVENTS = 'gol_game_events_log';
const STORAGE_KEY_SESSIONS = 'gol_game_sessions_log';
const MAX_EVENTS = 500;
const MAX_SESSIONS = 200;

const RANDOM_BUFFER = new Uint32Array(1);

export type GameSource =
  | 'lucky_roll'
  | 'task_tower'
  | 'shooter_blitz'
  | 'vision_quest'
  | 'wheel_of_wins'
  | 'dice_packs'
  | 'daily_treats';

type LegacyGameSource = 'pomodoro_sprint';

export interface GameRewardEvent {
  id: string;
  userId: string;
  source: GameSource;
  currency: 'gold' | 'xp' | 'dice' | 'game_tokens' | 'hearts';
  amount: number; // positive = earn, negative = spend
  context: string;
  timestamp: string; // ISO
}

export interface GameCurrencyBalance {
  dice: number;
  gameTokens: number;
  hearts: number;
}

export interface GameSessionEvent {
  gameId: HabitGameId;
  action: 'enter' | 'exit' | 'complete' | 'reward';
  timestamp: string;
  metadata?: Record<string, unknown>;
}


export interface LegacyAliasSunsetReadiness {
  userId: string;
  legacyRewardSourceRows: number;
  legacySessionGameIdRows: number;
  hasLegacyAliases: boolean;
  scannedAt: string;
}


export interface LegacyAliasSunsetRollup {
  scannedUserCount: number;
  usersWithLegacyAliases: string[];
  totalLegacyRewardSourceRows: number;
  totalLegacySessionGameIdRows: number;
  hasLegacyAliases: boolean;
  scannedAt: string;
}


const LEGACY_GAME_SOURCE_ALIASES: Record<LegacyGameSource, GameSource> = {
  pomodoro_sprint: 'shooter_blitz',
};

type StoredRewardEvent = Omit<GameRewardEvent, 'source'> & { source: GameSource | LegacyGameSource };
type StoredSessionEvent = Omit<GameSessionEvent, 'gameId'> & { gameId: HabitGameId | LegacyHabitGameId };

function normalizeGameSource(source: GameSource | LegacyGameSource): GameSource {
  if (source === 'pomodoro_sprint') {
    return LEGACY_GAME_SOURCE_ALIASES.pomodoro_sprint;
  }
  return source;
}

function normalizeGameId(gameId: HabitGameId | LegacyHabitGameId): HabitGameId {
  return normalizeHabitGameId(gameId);
}

function normalizeRewardEvent(event: StoredRewardEvent): GameRewardEvent {
  return {
    ...event,
    source: normalizeGameSource(event.source),
  };
}

function normalizeSessionEvent(event: StoredSessionEvent): GameSessionEvent {
  return {
    ...event,
    gameId: normalizeGameId(event.gameId),
  };
}

const getSecureRandomFloat = (): number => {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(RANDOM_BUFFER);
    return RANDOM_BUFFER[0] / (0xffffffff + 1);
  }
  return Math.random();
};

const getRandomIntInclusive = (min: number, max: number): number => {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  return Math.floor(getSecureRandomFloat() * (safeMax - safeMin + 1)) + safeMin;
};

const selectWeightedTier = <T extends { weight: number; min: number; max: number; label: string }>(
  tiers: readonly T[]
): T => {
  const totalWeight = tiers.reduce((sum, tier) => sum + tier.weight, 0);
  let random = getSecureRandomFloat() * totalWeight;

  for (const tier of tiers) {
    random -= tier.weight;
    if (random <= 0) {
      return tier;
    }
  }

  return tiers[tiers.length - 1];
};

const generateEventId = (): string => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const safeLocalStorage =
  typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;

export function loadCurrencyBalance(userId: string): GameCurrencyBalance {
  if (!safeLocalStorage) {
    return { dice: 0, gameTokens: 0, hearts: 0 };
  }

  try {
    const stored = safeLocalStorage.getItem(`${STORAGE_KEY_CURRENCIES}_${userId}`);
    if (!stored) {
      return { dice: 0, gameTokens: 0, hearts: 0 };
    }

    const parsed = JSON.parse(stored) as GameCurrencyBalance;
    return {
      dice: Math.max(0, parsed.dice || 0),
      gameTokens: Math.max(0, parsed.gameTokens || 0),
      hearts: Math.max(0, parsed.hearts || 0),
    };
  } catch (error) {
    console.warn('Failed to load game currency balance:', error);
    return { dice: 0, gameTokens: 0, hearts: 0 };
  }
}

export function saveCurrencyBalance(userId: string, balance: GameCurrencyBalance): void {
  if (!safeLocalStorage) return;

  try {
    safeLocalStorage.setItem(`${STORAGE_KEY_CURRENCIES}_${userId}`, JSON.stringify(balance));
  } catch (error) {
    console.warn('Failed to save game currency balance:', error);
  }
}

export function awardDice(
  userId: string,
  amount: number,
  source: GameSource,
  context: string
): GameCurrencyBalance {
  const balance = loadCurrencyBalance(userId);
  balance.dice += amount;

  saveCurrencyBalance(userId, balance);

  logRewardEvent({
    id: generateEventId(),
    userId,
    source,
    currency: 'dice',
    amount,
    context,
    timestamp: new Date().toISOString(),
  });

  return balance;
}

export function deductDice(userId: string, amount: number, context: string): GameCurrencyBalance {
  const balance = loadCurrencyBalance(userId);
  balance.dice = Math.max(0, balance.dice - amount);

  saveCurrencyBalance(userId, balance);

  logRewardEvent({
    id: generateEventId(),
    userId,
    source: 'lucky_roll',
    currency: 'dice',
    amount: -amount,
    context,
    timestamp: new Date().toISOString(),
  });

  return balance;
}

export function awardGameTokens(
  userId: string,
  amount: number,
  source: GameSource,
  context: string
): GameCurrencyBalance {
  const balance = loadCurrencyBalance(userId);
  balance.gameTokens += amount;

  saveCurrencyBalance(userId, balance);

  logRewardEvent({
    id: generateEventId(),
    userId,
    source,
    currency: 'game_tokens',
    amount,
    context,
    timestamp: new Date().toISOString(),
  });

  return balance;
}

export function deductGameTokens(userId: string, amount: number, context: string): GameCurrencyBalance {
  const balance = loadCurrencyBalance(userId);
  balance.gameTokens = Math.max(0, balance.gameTokens - amount);

  saveCurrencyBalance(userId, balance);

  logRewardEvent({
    id: generateEventId(),
    userId,
    source: 'lucky_roll',
    currency: 'game_tokens',
    amount: -amount,
    context,
    timestamp: new Date().toISOString(),
  });

  return balance;
}

export function awardHearts(
  userId: string,
  amount: number,
  source: GameSource,
  context: string
): GameCurrencyBalance {
  const balance = loadCurrencyBalance(userId);
  balance.hearts += amount;

  saveCurrencyBalance(userId, balance);

  logRewardEvent({
    id: generateEventId(),
    userId,
    source,
    currency: 'hearts',
    amount,
    context,
    timestamp: new Date().toISOString(),
  });

  return balance;
}

export function deductHearts(userId: string, amount: number, context: string): GameCurrencyBalance {
  const balance = loadCurrencyBalance(userId);
  balance.hearts = Math.max(0, balance.hearts - amount);

  saveCurrencyBalance(userId, balance);

  logRewardEvent({
    id: generateEventId(),
    userId,
    source: 'dice_packs',
    currency: 'hearts',
    amount: -amount,
    context,
    timestamp: new Date().toISOString(),
  });

  return balance;
}

export function purchaseDicePack(
  userId: string,
  packId: DicePackId
): {
  success: boolean;
  balance: GameCurrencyBalance;
  diceAwarded: number;
  tokensAwarded: number;
  tier?: string;
} {
  const pack = DICE_PACK_DEFINITIONS.find((p) => p.id === packId);
  if (!pack) {
    return {
      success: false,
      balance: loadCurrencyBalance(userId),
      diceAwarded: 0,
      tokensAwarded: 0,
    };
  }

  const balance = loadCurrencyBalance(userId);

  // Check if user has enough hearts
  if (balance.hearts < pack.heartCost) {
    return {
      success: false,
      balance,
      diceAwarded: 0,
      tokensAwarded: 0,
    };
  }

  // Deduct hearts
  balance.hearts -= pack.heartCost;

  let diceAwarded: number = pack.diceCount;
  let tokensAwarded: number = pack.tokenCount;
  let tier: string | undefined;

  // Handle mystery box with smart distribution
  if (packId === 'mystery') {
    const guaranteedFloor = getMysteryBoxGuaranteedFloor(userId);

    let diceTier = selectWeightedTier(MYSTERY_BOX_DICE_TIERS);
    let tokenTier = selectWeightedTier(MYSTERY_BOX_TOKEN_TIERS);

    // Apply pity timer
    if (guaranteedFloor === 'good') {
      const goodOrBetterDice = MYSTERY_BOX_DICE_TIERS.slice(2); // Good, Great, Amazing, Jackpot
      diceTier = selectWeightedTier(goodOrBetterDice);
      const goodOrBetterTokens = MYSTERY_BOX_TOKEN_TIERS.slice(2);
      tokenTier = selectWeightedTier(goodOrBetterTokens);
    } else if (guaranteedFloor === 'decent') {
      const decentOrBetterDice = MYSTERY_BOX_DICE_TIERS.slice(1); // Decent and above
      diceTier = selectWeightedTier(decentOrBetterDice);
      const decentOrBetterTokens = MYSTERY_BOX_TOKEN_TIERS.slice(1);
      tokenTier = selectWeightedTier(decentOrBetterTokens);
    }

    diceAwarded = getRandomIntInclusive(diceTier.min, diceTier.max) as number;
    tokensAwarded = getRandomIntInclusive(tokenTier.min, tokenTier.max) as number;
    tier = `${diceTier.label} (${diceAwarded} dice, ${tokensAwarded} tokens)`;
  }

  // Award dice and tokens
  balance.dice += diceAwarded;
  balance.gameTokens += tokensAwarded;

  saveCurrencyBalance(userId, balance);

  // Log events
  logRewardEvent({
    id: generateEventId(),
    userId,
    source: 'dice_packs',
    currency: 'hearts',
    amount: -pack.heartCost,
    context: `Purchased ${pack.label}`,
    timestamp: new Date().toISOString(),
  });

  logRewardEvent({
    id: generateEventId(),
    userId,
    source: 'dice_packs',
    currency: 'dice',
    amount: diceAwarded,
    context: `${pack.label} reward${tier ? ` - ${tier}` : ''}`,
    timestamp: new Date().toISOString(),
  });

  logRewardEvent({
    id: generateEventId(),
    userId,
    source: 'dice_packs',
    currency: 'game_tokens',
    amount: tokensAwarded,
    context: `${pack.label} reward${tier ? ` - ${tier}` : ''}`,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    balance,
    diceAwarded,
    tokensAwarded,
    tier,
  };
}

export function logRewardEvent(event: GameRewardEvent): void {
  if (!safeLocalStorage) return;

  try {
    const stored = safeLocalStorage.getItem(STORAGE_KEY_EVENTS);
    const events: GameRewardEvent[] = stored ? JSON.parse(stored) : [];

    const normalizedEvent = normalizeRewardEvent(event);

    events.push(normalizedEvent);

    // Keep last MAX_EVENTS events
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }

    safeLocalStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
  } catch (error) {
    console.warn('Failed to log reward event:', error);
  }
}

export function getRewardHistory(userId: string, limit?: number): GameRewardEvent[] {
  if (!safeLocalStorage) return [];

  try {
    const stored = safeLocalStorage.getItem(STORAGE_KEY_EVENTS);
    if (!stored) return [];

    const events: StoredRewardEvent[] = JSON.parse(stored) as StoredRewardEvent[];
    let hasLegacyAliases = false;

    const normalizedEvents = events.map((event) => {
      const normalizedEvent = normalizeRewardEvent(event);
      if (normalizedEvent.source !== event.source) {
        hasLegacyAliases = true;
      }
      return normalizedEvent;
    });

    if (hasLegacyAliases) {
      safeLocalStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(normalizedEvents));
    }

    const userEvents = normalizedEvents.filter((event) => event.userId === userId);

    if (limit) {
      return userEvents.slice(-limit);
    }

    return userEvents;
  } catch (error) {
    console.warn('Failed to get reward history:', error);
    return [];
  }
}

export function getActiveMultipliers(userId: string): {
  coinBonus: number;
  xpBonus: number;
  streakBonus: number;
} {
  // Stub for now - will be connected when Vision Quest is built
  return { coinBonus: 0, xpBonus: 0, streakBonus: 0 };
}

export function applyMultipliers(baseCoins: number, userId: string): number {
  const multipliers = getActiveMultipliers(userId);
  return Math.floor(baseCoins * (1 + multipliers.coinBonus));
}

export function getMysteryBoxGuaranteedFloor(userId: string): 'decent' | 'good' | null {
  const history = getRewardHistory(userId);

  // Count mystery box purchases
  const mysteryBoxPurchases = history.filter(
    (e) => e.source === 'dice_packs' && e.context.includes('Mystery Box')
  );

  // First 3 mystery boxes guaranteed ≥ decent
  if (mysteryBoxPurchases.length < 3) {
    return 'decent';
  }

  // Check if user hasn't played in 7+ days
  const lastPlayDate = history.length > 0 ? new Date(history[history.length - 1].timestamp) : null;
  if (lastPlayDate) {
    const daysSinceLastPlay = (Date.now() - lastPlayDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPlay >= 7) {
      return 'good';
    }
  }

  return null;
}

export function logGameSession(userId: string, event: GameSessionEvent): void {
  if (!safeLocalStorage) return;

  try {
    const stored = safeLocalStorage.getItem(`${STORAGE_KEY_SESSIONS}_${userId}`);
    const sessions: GameSessionEvent[] = stored ? JSON.parse(stored) : [];

    const normalizedEvent = normalizeSessionEvent(event);

    sessions.push(normalizedEvent);

    // Keep last MAX_SESSIONS events
    if (sessions.length > MAX_SESSIONS) {
      sessions.splice(0, sessions.length - MAX_SESSIONS);
    }

    safeLocalStorage.setItem(`${STORAGE_KEY_SESSIONS}_${userId}`, JSON.stringify(sessions));
  } catch (error) {
    console.warn('Failed to log game session:', error);
  }
}

export function getGameSessionHistory(userId: string, limit?: number): GameSessionEvent[] {
  if (!safeLocalStorage) return [];

  try {
    const stored = safeLocalStorage.getItem(`${STORAGE_KEY_SESSIONS}_${userId}`);
    if (!stored) return [];

    const sessions: StoredSessionEvent[] = JSON.parse(stored) as StoredSessionEvent[];
    let hasLegacyAliases = false;

    const normalizedSessions = sessions.map((session) => {
      const normalizedSession = normalizeSessionEvent(session);
      if (normalizedSession.gameId !== session.gameId) {
        hasLegacyAliases = true;
      }
      return normalizedSession;
    });

    if (hasLegacyAliases) {
      safeLocalStorage.setItem(`${STORAGE_KEY_SESSIONS}_${userId}`, JSON.stringify(normalizedSessions));
    }

    if (limit) {
      return normalizedSessions.slice(-limit);
    }

    return normalizedSessions;
  } catch (error) {
    console.warn('Failed to get game session history:', error);
    return [];
  }
}



export function getLegacyAliasSunsetRollup(userIds: readonly string[]): LegacyAliasSunsetRollup {
  const scannedAt = new Date().toISOString();
  const uniqueUserIds = Array.from(new Set(userIds.filter((userId) => userId.trim().length > 0)));

  if (uniqueUserIds.length === 0) {
    return {
      scannedUserCount: 0,
      usersWithLegacyAliases: [],
      totalLegacyRewardSourceRows: 0,
      totalLegacySessionGameIdRows: 0,
      hasLegacyAliases: false,
      scannedAt,
    };
  }

  const summaries = uniqueUserIds.map((userId) => getLegacyAliasSunsetReadiness(userId));
  const usersWithLegacyAliases = summaries
    .filter((summary) => summary.hasLegacyAliases)
    .map((summary) => summary.userId);

  const totalLegacyRewardSourceRows = summaries.reduce((sum, summary) => {
    return sum + summary.legacyRewardSourceRows;
  }, 0);

  const totalLegacySessionGameIdRows = summaries.reduce((sum, summary) => {
    return sum + summary.legacySessionGameIdRows;
  }, 0);

  return {
    scannedUserCount: uniqueUserIds.length,
    usersWithLegacyAliases,
    totalLegacyRewardSourceRows,
    totalLegacySessionGameIdRows,
    hasLegacyAliases: usersWithLegacyAliases.length > 0,
    scannedAt,
  };
}


export function getLegacyAliasSunsetReadiness(userId: string): LegacyAliasSunsetReadiness {
  const summary: LegacyAliasSunsetReadiness = {
    userId,
    legacyRewardSourceRows: 0,
    legacySessionGameIdRows: 0,
    hasLegacyAliases: false,
    scannedAt: new Date().toISOString(),
  };

  if (!safeLocalStorage) {
    return summary;
  }

  try {
    const rewardStored = safeLocalStorage.getItem(STORAGE_KEY_EVENTS);
    if (rewardStored) {
      const rewardEvents: StoredRewardEvent[] = JSON.parse(rewardStored) as StoredRewardEvent[];
      summary.legacyRewardSourceRows = rewardEvents.reduce((count, event) => {
        return normalizeGameSource(event.source) !== event.source ? count + 1 : count;
      }, 0);
    }
  } catch (error) {
    console.warn('Failed to scan reward history for legacy aliases:', error);
  }

  try {
    const sessionStored = safeLocalStorage.getItem(`${STORAGE_KEY_SESSIONS}_${userId}`);
    if (sessionStored) {
      const sessions: StoredSessionEvent[] = JSON.parse(sessionStored) as StoredSessionEvent[];
      summary.legacySessionGameIdRows = sessions.reduce((count, session) => {
        return normalizeGameId(session.gameId) !== session.gameId ? count + 1 : count;
      }, 0);
    }
  } catch (error) {
    console.warn('Failed to scan session history for legacy aliases:', error);
  }

  summary.hasLegacyAliases =
    summary.legacyRewardSourceRows > 0 || summary.legacySessionGameIdRows > 0;

  return summary;
}
