import {
  DICE_PACK_DEFINITIONS,
  DicePackId,
  MYSTERY_BOX_DICE_TIERS,
  MYSTERY_BOX_TOKEN_TIERS,
} from '../constants/economy';
import type { HabitGameId } from '../types/habitGames';

const STORAGE_KEY_CURRENCIES = 'gol_game_currencies';
const STORAGE_KEY_EVENTS = 'gol_game_events_log';
const STORAGE_KEY_SESSIONS = 'gol_game_sessions_log';
const MAX_EVENTS = 500;
const MAX_SESSIONS = 200;

const RANDOM_BUFFER = new Uint32Array(1);

export type GameSource = 'lucky_roll' | 'task_tower' | 'pomodoro_sprint' | 'vision_quest' | 'wheel_of_wins' | 'dice_packs' | 'daily_treats';

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

    events.push(event);

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

    const events: GameRewardEvent[] = JSON.parse(stored);
    const userEvents = events.filter((e) => e.userId === userId);

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

    sessions.push(event);

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

    const sessions: GameSessionEvent[] = JSON.parse(stored);

    if (limit) {
      return sessions.slice(-limit);
    }

    return sessions;
  } catch (error) {
    console.warn('Failed to get game session history:', error);
    return [];
  }
}
