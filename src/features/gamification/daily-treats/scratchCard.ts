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
};

export type ScratchCardResult = {
  cycle: number;
  day: number;
  symbol: ScratchSymbol;
  numbers: number[];
  numberReward: number | null;
  symbolReward: string | null;
};

export type RestDayResult = {
  rest: true;
  nextCycleStartsIn: string;
};

export type RevealCardResult = ScratchCardResult | RestDayResult;

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

export const countdownToNextCycle = (dayInCycle: number, restDays = 2) => {
  const now = new Date();
  const daysUntilNextCycle = Math.max(restDays, 0) + (25 - dayInCycle + 1);
  const nextCycleDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilNextCycle,
  );
  const diffMs = Math.max(nextCycleDate.getTime() - now.getTime(), 0);
  const hours = Math.floor(diffMs / 3600000) % 24;
  const minutes = Math.floor(diffMs / 60000) % 60;
  const seconds = Math.floor(diffMs / 1000) % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
};

export const revealScratchCard = (
  state: ScratchCardState,
  symbols: ScratchSymbol[] = DEFAULT_SYMBOLS,
  restDays = 2,
): RevealCardResult => {
  if (state.dayInCycle > 25) {
    return {
      rest: true,
      nextCycleStartsIn: countdownToNextCycle(state.dayInCycle, restDays),
    };
  }

  const symbol = pickWeightedSymbol(symbols);
  const { numbers, reward } = generateNumbers();

  state.symbolCounts[symbol.name] = (state.symbolCounts[symbol.name] ?? 0) + 1;
  let symbolReward: string | null = null;

  if (state.symbolCounts[symbol.name] >= symbol.needed) {
    symbolReward = symbol.name;
    state.symbolCounts[symbol.name] = 0;
  }

  const card: ScratchCardResult = {
    cycle: state.cycleIndex,
    day: state.dayInCycle,
    symbol,
    numbers,
    numberReward: reward,
    symbolReward,
  };

  state.dayInCycle += 1;

  if (state.dayInCycle > 25 + restDays) {
    state.cycleIndex += 1;
    state.dayInCycle = 1;
  }

  return card;
};
