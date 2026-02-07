export type ScratchSymbol = {
  emoji: string;
  name: string;
  weight: number;
  needed: number;
};

export type ScratchCardState = {
  cycleIndex: number;
  dayInCycle: number;
  symbolCounts: Record<string, number>;
  revealedSymbols: Record<number, ScratchSymbol>;
  cycleMonth: number;
  cycleYear: number;
  lastOpenedDate?: string;
  lastOpenedDay?: number;
};

export type ScratchCardResult = {
  cycle: number;
  day: number;
  symbol: ScratchSymbol;
  numbers: number[];
  numberReward: number | null;
  symbolReward: string | null;
  goldReward: number;
};

export type RevealCardResult = ScratchCardResult;

export type ScratchCardStoredState = {
  version: number;
  savedAt: string;
  state: ScratchCardState;
};

export const DEFAULT_SYMBOLS: ScratchSymbol[] = [
  { emoji: '🎁', name: 'gift', weight: 5, needed: 3 },
  { emoji: '🍀', name: 'clover', weight: 5, needed: 3 },
  { emoji: '🎈', name: 'balloon', weight: 4, needed: 4 },
  { emoji: '🌟', name: 'star', weight: 3, needed: 5 },
  { emoji: '💎', name: 'gem', weight: 3, needed: 5 },
  { emoji: '🔔', name: 'bell', weight: 3, needed: 6 },
  { emoji: '⚡', name: 'lightning', weight: 2, needed: 7 },
  { emoji: '🎉', name: 'party', weight: 2, needed: 7 },
  { emoji: '🏆', name: 'trophy', weight: 1, needed: 8 },
  { emoji: '🧸', name: 'teddy', weight: 1, needed: 9 },
  { emoji: '👑', name: 'crown', weight: 1, needed: 10 },
  { emoji: '🧑‍🎄', name: 'santa', weight: 1, needed: 10 },
];

const RANDOM_BUFFER = new Uint32Array(1);
const STORAGE_VERSION = 2;
const STORAGE_KEY = 'lifegoal:daily-treats:scratch-card';
const NUMBER_MATCH_GOLD_MULTIPLIER = 10;
const SYMBOL_STREAK_GOLD_REWARD = 150;

const safeLocalStorage = (() => {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Scratch card storage unavailable.', error);
    return null;
  }
})();

const createInitialScratchCardState = (): ScratchCardState => {
  const now = new Date();
  return {
    cycleIndex: 1,
    dayInCycle: 1,
    symbolCounts: {},
    revealedSymbols: {},
    cycleMonth: now.getMonth(),
    cycleYear: now.getFullYear(),
    lastOpenedDate: undefined,
    lastOpenedDay: undefined,
  };
};

const getSecureRandomFloat = () => {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(RANDOM_BUFFER);
    return RANDOM_BUFFER[0] / (0xffffffff + 1);
  }

  return Math.random();
};

export const getRandomIntInclusive = (min: number, max: number) => {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  return Math.floor(getSecureRandomFloat() * (safeMax - safeMin + 1)) + safeMin;
};

const getStorageKey = (userId?: string) => (userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY);

const isValidScratchCardState = (value: unknown): value is ScratchCardState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as ScratchCardState;
  return (
    typeof state.cycleIndex === 'number' &&
    Number.isFinite(state.cycleIndex) &&
    typeof state.dayInCycle === 'number' &&
    Number.isFinite(state.dayInCycle) &&
    typeof state.symbolCounts === 'object' &&
    state.symbolCounts !== null
  );
};

const normalizeScratchCardState = (state: ScratchCardState): ScratchCardState => {
  const now = new Date();
  const resolved: ScratchCardState = {
    ...state,
    symbolCounts: state.symbolCounts ?? {},
    revealedSymbols: state.revealedSymbols ?? {},
    cycleMonth: Number.isFinite(state.cycleMonth) ? state.cycleMonth : now.getMonth(),
    cycleYear: Number.isFinite(state.cycleYear) ? state.cycleYear : now.getFullYear(),
    lastOpenedDate: state.lastOpenedDate ?? undefined,
    lastOpenedDay: Number.isFinite(state.lastOpenedDay) ? state.lastOpenedDay : undefined,
  };
  return resolved;
};

const getMonthDelta = (fromYear: number, fromMonth: number, toYear: number, toMonth: number) =>
  (toYear - fromYear) * 12 + (toMonth - fromMonth);

export const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const hasOpenedToday = (state: ScratchCardState, now = new Date()) =>
  state.lastOpenedDate === getLocalDateKey(now);

const syncScratchCardState = (state: ScratchCardState, now = new Date()) => {
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();
  const todayDay = now.getDate();
  const monthDelta = getMonthDelta(state.cycleYear, state.cycleMonth, todayYear, todayMonth);

  if (monthDelta !== 0) {
    state.cycleIndex = Math.max(1, state.cycleIndex + monthDelta);
    state.cycleYear = todayYear;
    state.cycleMonth = todayMonth;
    state.dayInCycle = todayDay;
    state.symbolCounts = {};
    state.revealedSymbols = {};
    state.lastOpenedDate = undefined;
    state.lastOpenedDay = undefined;
    return;
  }

  state.dayInCycle = todayDay;
};

export const loadScratchCardState = (userId?: string): ScratchCardState => {
  if (!safeLocalStorage) return createInitialScratchCardState();

  try {
    const stored = safeLocalStorage.getItem(getStorageKey(userId));
    if (!stored) return createInitialScratchCardState();
    const parsed = JSON.parse(stored) as ScratchCardStoredState | ScratchCardState;
    if ('state' in parsed && isValidScratchCardState(parsed.state)) {
      const normalized = normalizeScratchCardState(parsed.state);
      syncScratchCardState(normalized);
      saveScratchCardState(normalized, userId);
      return normalized;
    }
    if (isValidScratchCardState(parsed)) {
      const normalized = normalizeScratchCardState(parsed);
      syncScratchCardState(normalized);
      saveScratchCardState(normalized, userId);
      return normalized;
    }
    return createInitialScratchCardState();
  } catch (error) {
    console.warn('Scratch card state load failed.', error);
    return createInitialScratchCardState();
  }
};

export const saveScratchCardState = (state: ScratchCardState, userId?: string) => {
  if (!safeLocalStorage) return;
  try {
    const payload: ScratchCardStoredState = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };
    safeLocalStorage.setItem(getStorageKey(userId), JSON.stringify(payload));
  } catch (error) {
    console.warn('Scratch card state save failed.', error);
  }
};

export const resetScratchCardState = (userId?: string) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.warn('Scratch card state reset failed.', error);
  }
};

export const pickWeightedSymbol = (symbols: ScratchSymbol[]) => {
  const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = getSecureRandomFloat() * totalWeight;

  for (const symbol of symbols) {
    if (roll < symbol.weight) {
      return symbol;
    }
    roll -= symbol.weight;
  }

  return symbols[0];
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const advanceCycleMonth = (year: number, month: number) => {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
};

const ensureCycleWithinMonth = (state: ScratchCardState) => {
  const totalDays = getDaysInMonth(state.cycleYear, state.cycleMonth);
  state.dayInCycle = Math.min(state.dayInCycle, totalDays);
};

export const generateNumbers = (count = 5, min = 1, max = 10) => {
  const numbers = Array.from({ length: count }, () => getRandomIntInclusive(min, max));
  const tallies = numbers.reduce<Record<number, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  const match = Object.keys(tallies).find((key) => tallies[Number(key)] >= 3);

  return {
    numbers,
    reward: match ? Number(match) : null,
  };
};

export const revealScratchCardWithPersistence = (
  userId?: string,
  symbols: ScratchSymbol[] = DEFAULT_SYMBOLS,
): RevealCardResult => {
  const state = loadScratchCardState(userId);
  const result = revealScratchCard(state, symbols);
  saveScratchCardState(state, userId);
  return result;
};

export const revealScratchCard = (
  state: ScratchCardState,
  symbols: ScratchSymbol[] = DEFAULT_SYMBOLS,
): RevealCardResult => {
  return (
    revealScratchCardForDay(state, state.dayInCycle, symbols) ?? {
      cycle: state.cycleIndex,
      day: state.dayInCycle,
      symbol: state.revealedSymbols[state.dayInCycle] ?? pickWeightedSymbol(symbols),
      numbers: [],
      numberReward: null,
      symbolReward: null,
      goldReward: 0,
    }
  );
};

export const revealScratchCardForDayWithPersistence = (
  userId: string | undefined,
  day: number,
  symbols: ScratchSymbol[] = DEFAULT_SYMBOLS,
): RevealCardResult | null => {
  const state = loadScratchCardState(userId);
  const result = revealScratchCardForDay(state, day, symbols);
  if (!result) return null;
  saveScratchCardState(state, userId);
  return result;
};

export const revealScratchCardForDay = (
  state: ScratchCardState,
  day: number,
  symbols: ScratchSymbol[] = DEFAULT_SYMBOLS,
): RevealCardResult | null => {
  ensureCycleWithinMonth(state);
  const totalDays = getDaysInMonth(state.cycleYear, state.cycleMonth);
  const targetDay = Math.min(Math.max(1, day), totalDays);

  if (targetDay > state.dayInCycle) return null;

  if (state.revealedSymbols[targetDay]) {
    return {
      cycle: state.cycleIndex,
      day: targetDay,
      symbol: state.revealedSymbols[targetDay],
      numbers: [],
      numberReward: null,
      symbolReward: null,
      goldReward: 0,
    };
  }

  const symbol = pickWeightedSymbol(symbols);
  const { numbers, reward } = generateNumbers();

  state.symbolCounts[symbol.name] = (state.symbolCounts[symbol.name] ?? 0) + 1;
  state.revealedSymbols[targetDay] = symbol;
  if (targetDay === state.dayInCycle) {
    state.lastOpenedDate = getLocalDateKey(new Date());
    state.lastOpenedDay = targetDay;
  }
  let symbolReward: string | null = null;

  if (state.symbolCounts[symbol.name] >= symbol.needed) {
    symbolReward = symbol.name;
    state.symbolCounts[symbol.name] = 0;
  }

  const goldReward =
    (reward ? reward * NUMBER_MATCH_GOLD_MULTIPLIER : 0) +
    (symbolReward ? SYMBOL_STREAK_GOLD_REWARD : 0);

  return {
    cycle: state.cycleIndex,
    day: targetDay,
    symbol,
    numbers,
    numberReward: reward,
    symbolReward,
    goldReward,
  };
};
