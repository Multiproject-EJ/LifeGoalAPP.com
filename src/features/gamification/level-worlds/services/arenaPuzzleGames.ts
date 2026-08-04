export interface ConcordCategory {
  id: string;
  title: string;
  words: readonly string[];
  reveal: string;
}

export interface ConcordPuzzle {
  id: string;
  briefing: string;
  categories: readonly ConcordCategory[];
}

export const CONCORD_PUZZLES: readonly ConcordPuzzle[] = [
  {
    id: 'first-contact',
    briefing: 'Three channels are tangled. Find the four signals belonging to each channel.',
    categories: [
      { id: 'navigation', title: 'Find a direction', words: ['COMPASS', 'CHART', 'BEACON', 'SEXTANT'], reveal: 'Navigation instruments' },
      { id: 'growth', title: 'Begin small, become alive', words: ['SEED', 'ROOT', 'BLOOM', 'GROVE'], reveal: 'Stages and places of growth' },
      { id: 'connection', title: 'Carry a message', words: ['SIGNAL', 'CHANNEL', 'RELAY', 'LINK'], reveal: 'Ways to connect' },
    ],
  },
  {
    id: 'world-materials',
    briefing: 'The island archive mixed three environments. Restore the records.',
    categories: [
      { id: 'sky', title: 'Above the atmosphere', words: ['COMET', 'ORBIT', 'NEBULA', 'ECLIPSE'], reveal: 'Sky phenomena' },
      { id: 'water', title: 'Where the tide moves', words: ['REEF', 'CURRENT', 'LAGOON', 'TIDE'], reveal: 'Water and coast' },
      { id: 'forge', title: 'Shape strong material', words: ['ANVIL', 'EMBER', 'HAMMER', 'ALLOY'], reveal: 'The forge' },
    ],
  },
  {
    id: 'living-rhythm',
    briefing: 'Sort the caretaker’s memories into time, sound and shelter.',
    categories: [
      { id: 'time', title: 'Measures and moments', words: ['MINUTE', 'HOUR', 'DAWN', 'SEASON'], reveal: 'Ways to mark time' },
      { id: 'sound', title: 'Things you can hear', words: ['ECHO', 'CHIME', 'RHYTHM', 'WHISPER'], reveal: 'Sounds and patterns' },
      { id: 'shelter', title: 'A protected place', words: ['HARBOR', 'NEST', 'HAVEN', 'CABIN'], reveal: 'Places of shelter' },
    ],
  },
  {
    id: 'island-craft',
    briefing: 'A storm scattered the workshop index. Reconnect weather, writing and tools.',
    categories: [
      { id: 'weather', title: 'Changes in the air', words: ['MIST', 'GALE', 'RAIN', 'FROST'], reveal: 'Weather conditions' },
      { id: 'writing', title: 'Make words visible', words: ['INK', 'PAGE', 'QUILL', 'VERSE'], reveal: 'Writing and poetry' },
      { id: 'tools', title: 'Shape and measure', words: ['CHISEL', 'LEVEL', 'SAW', 'DRILL'], reveal: 'Workshop tools' },
    ],
  },
  {
    id: 'quiet-strength',
    briefing: 'The caretaker recorded courage, rest and light on one channel. Separate them.',
    categories: [
      { id: 'courage', title: 'Stand your ground', words: ['BRAVE', 'NERVE', 'GRIT', 'VALOR'], reveal: 'Forms of courage' },
      { id: 'rest', title: 'Become still', words: ['PAUSE', 'SLEEP', 'CALM', 'STILL'], reveal: 'Rest and stillness' },
      { id: 'light', title: 'Push back darkness', words: ['GLOW', 'SPARK', 'FLAME', 'RAY'], reveal: 'Sources and signs of light' },
    ],
  },
  {
    id: 'expedition-kit',
    briefing: 'Sort the expedition manifest into journeys, containers and command notes.',
    categories: [
      { id: 'journeys', title: 'Move through the world', words: ['TRAIL', 'ROUTE', 'VOYAGE', 'TREK'], reveal: 'Ways to journey' },
      { id: 'containers', title: 'Carry your supplies', words: ['CHEST', 'CRATE', 'FLASK', 'POUCH'], reveal: 'Supply containers' },
      { id: 'orders', title: 'Know what comes next', words: ['ORDER', 'BRIEF', 'PLAN', 'GUIDE'], reveal: 'Mission directions' },
    ],
  },
];

export interface LexiconStep {
  clue: string;
  answer: string;
  options: readonly string[];
}

export interface LexiconPuzzle {
  id: string;
  start: string;
  destination: string;
  dispatch: string;
  steps: readonly LexiconStep[];
}

export const LEXICON_PUZZLES: readonly LexiconPuzzle[] = [
  {
    id: 'cold-to-warm',
    start: 'COLD',
    destination: 'WARM',
    dispatch: 'Turn a cold signal into a warm welcome. Change exactly one letter per step.',
    steps: [
      { clue: 'A rope or cable', answer: 'CORD', options: ['CORD', 'GOLD', 'BOLD', 'COLA'] },
      { clue: 'A greeting or playing rectangle', answer: 'CARD', options: ['CARD', 'CORE', 'CORN', 'CURD'] },
      { clue: 'A protected hospital section', answer: 'WARD', options: ['WARD', 'HARD', 'CART', 'CARE'] },
      { clue: 'The opposite of cold', answer: 'WARM', options: ['WARM', 'WARN', 'WORD', 'WARP'] },
    ],
  },
  {
    id: 'head-to-tail',
    start: 'HEAD',
    destination: 'TAIL',
    dispatch: 'Carry the message from head to tail without breaking the relay.',
    steps: [
      { clue: 'To recover or make whole', answer: 'HEAL', options: ['HEAL', 'HEAR', 'HEAP', 'HEED'] },
      { clue: 'A blue-green colour', answer: 'TEAL', options: ['TEAL', 'HEEL', 'REAL', 'SEAL'] },
      { clue: 'To communicate in words', answer: 'TELL', options: ['TELL', 'TEAM', 'TEAR', 'DEAL'] },
      { clue: 'Having greater height', answer: 'TALL', options: ['TALL', 'TOLL', 'WELL', 'BELL'] },
      { clue: 'The rear part of an animal', answer: 'TAIL', options: ['TAIL', 'FALL', 'WALL', 'TALK'] },
    ],
  },
  {
    id: 'mind-to-song',
    start: 'MIND',
    destination: 'SONG',
    dispatch: 'Turn a quiet thought into a signal the whole Arena can hear.',
    steps: [
      { clue: 'Caring and helpful', answer: 'KIND', options: ['KIND', 'MEND', 'MINE', 'WIND'] },
      { clue: 'A royal ruler', answer: 'KING', options: ['KING', 'BIND', 'WIND', 'KINS'] },
      { clue: 'A circular band', answer: 'RING', options: ['RING', 'WING', 'SING', 'DING'] },
      { clue: 'Use your voice musically', answer: 'SING', options: ['SING', 'RANG', 'DING', 'WING'] },
      { clue: 'A piece of music with words', answer: 'SONG', options: ['SONG', 'SUNG', 'SINK', 'WING'] },
    ],
  },
  {
    id: 'sand-to-road',
    start: 'SAND',
    destination: 'ROAD',
    dispatch: 'Turn a handful of shore into a route across the island.',
    steps: [
      { clue: 'A group that plays music', answer: 'BAND', options: ['BAND', 'SEND', 'SANK', 'SANE'] },
      { clue: 'To curve instead of staying straight', answer: 'BEND', options: ['BEND', 'BOND', 'BANE', 'BIND'] },
      { clue: 'A small ornament with a hole', answer: 'BEAD', options: ['BEAD', 'BOND', 'BIND', 'BAND'] },
      { clue: 'To understand written words', answer: 'READ', options: ['READ', 'HEAD', 'LEAD', 'DEAD'] },
      { clue: 'A route made for travel', answer: 'ROAD', options: ['ROAD', 'HEAD', 'LEAD', 'DEAD'] },
    ],
  },
  {
    id: 'calm-to-bold',
    start: 'CALM',
    destination: 'BOLD',
    dispatch: 'Carry a quiet signal forward until it becomes brave enough to be heard.',
    steps: [
      { clue: 'To speak to someone from a distance', answer: 'CALL', options: ['CALL', 'PALM', 'CALF', 'BALM'] },
      { clue: 'A round object used in many games', answer: 'BALL', options: ['BALL', 'FALL', 'MALL', 'TALL'] },
      { clue: 'A metal object that rings', answer: 'BELL', options: ['BELL', 'BILL', 'BAIL', 'BULL'] },
      { clue: 'Something worn around the waist', answer: 'BELT', options: ['BELT', 'WELL', 'SELL', 'TELL'] },
      { clue: 'A threaded metal fastener', answer: 'BOLT', options: ['BOLT', 'MELT', 'BENT', 'BEST'] },
      { clue: 'Brave, confident or visually strong', answer: 'BOLD', options: ['BOLD', 'BOUT', 'BELT', 'BOOT'] },
    ],
  },
  {
    id: 'soft-to-hard',
    start: 'SOFT',
    destination: 'HARD',
    dispatch: 'Strengthen a gentle signal one careful change at a time.',
    steps: [
      { clue: 'A room directly beneath a roof', answer: 'LOFT', options: ['LOFT', 'SOOT', 'SIFT', 'SORT'] },
      { clue: 'Unable to find the way', answer: 'LOST', options: ['LOST', 'LIFT', 'LEFT', 'LOOT'] },
      { clue: 'The price of something', answer: 'COST', options: ['COST', 'MOST', 'LEST', 'LIST'] },
      { clue: 'The actors chosen for a performance', answer: 'CAST', options: ['CAST', 'COAT', 'LOST', 'HOST'] },
      { clue: 'A small wheeled vehicle', answer: 'CART', options: ['CART', 'COST', 'MAST', 'FAST'] },
      { clue: 'A piece of stiff paper', answer: 'CARD', options: ['CARD', 'CARE', 'CARS', 'PART'] },
      { clue: 'Firm; the opposite of soft', answer: 'HARD', options: ['HARD', 'BARD', 'LARD', 'CARE'] },
    ],
  },
];

export const SIGNAL_PATH_GRID_SIZE = 5;

export interface SignalPathPuzzle {
  id: string;
  path: readonly number[];
  markerSteps: readonly number[];
  title: string;
}

const indexAt = (row: number, column: number) => row * SIGNAL_PATH_GRID_SIZE + column;

const BASE_SIGNAL_PATH_PUZZLES: readonly SignalPathPuzzle[] = [
  {
    id: 'spiral',
    title: 'Spiral Channel',
    path: [
      indexAt(0, 0), indexAt(0, 1), indexAt(0, 2), indexAt(0, 3), indexAt(0, 4),
      indexAt(1, 4), indexAt(2, 4), indexAt(3, 4), indexAt(4, 4), indexAt(4, 3),
      indexAt(4, 2), indexAt(4, 1), indexAt(4, 0), indexAt(3, 0), indexAt(2, 0),
      indexAt(1, 0), indexAt(1, 1), indexAt(1, 2), indexAt(1, 3), indexAt(2, 3),
      indexAt(3, 3), indexAt(3, 2), indexAt(3, 1), indexAt(2, 1), indexAt(2, 2),
    ],
    markerSteps: [0, 6, 12, 18, 24],
  },
  {
    id: 'river',
    title: 'River Relay',
    path: [
      indexAt(0, 0), indexAt(1, 0), indexAt(2, 0), indexAt(3, 0), indexAt(4, 0),
      indexAt(4, 1), indexAt(3, 1), indexAt(2, 1), indexAt(1, 1), indexAt(0, 1),
      indexAt(0, 2), indexAt(1, 2), indexAt(2, 2), indexAt(3, 2), indexAt(4, 2),
      indexAt(4, 3), indexAt(3, 3), indexAt(2, 3), indexAt(1, 3), indexAt(0, 3),
      indexAt(0, 4), indexAt(1, 4), indexAt(2, 4), indexAt(3, 4), indexAt(4, 4),
    ],
    markerSteps: [0, 5, 11, 17, 24],
  },
  {
    id: 'switchback',
    title: 'Sky Switchback',
    path: [
      indexAt(4, 0), indexAt(4, 1), indexAt(3, 1), indexAt(3, 0), indexAt(2, 0),
      indexAt(2, 1), indexAt(1, 1), indexAt(1, 0), indexAt(0, 0), indexAt(0, 1),
      indexAt(0, 2), indexAt(1, 2), indexAt(2, 2), indexAt(3, 2), indexAt(4, 2),
      indexAt(4, 3), indexAt(4, 4), indexAt(3, 4), indexAt(3, 3), indexAt(2, 3),
      indexAt(2, 4), indexAt(1, 4), indexAt(1, 3), indexAt(0, 3), indexAt(0, 4),
    ],
    markerSteps: [0, 6, 12, 18, 24],
  },
];

type GridTransform = 'identity' | 'mirror-x' | 'mirror-y' | 'rotate-180';

function transformGridIndex(index: number, size: number, transform: GridTransform): number {
  const row = Math.floor(index / size);
  const column = index % size;
  if (transform === 'mirror-x') return (row * size) + (size - 1 - column);
  if (transform === 'mirror-y') return ((size - 1 - row) * size) + column;
  if (transform === 'rotate-180') return ((size - 1 - row) * size) + (size - 1 - column);
  return index;
}

export const SIGNAL_PATH_PUZZLES: readonly SignalPathPuzzle[] = BASE_SIGNAL_PATH_PUZZLES.flatMap((puzzle) => (
  (['identity', 'mirror-x', 'mirror-y', 'rotate-180'] as const).map((transform, variantIndex) => ({
    ...puzzle,
    id: `${puzzle.id}-${variantIndex + 1}`,
    path: puzzle.path.map((index) => transformGridIndex(index, SIGNAL_PATH_GRID_SIZE, transform)),
  }))
));

export type TwinSigilValue = 0 | 1;

export interface TwinSigilPuzzle {
  id: string;
  size: number;
  solution: readonly TwinSigilValue[];
  givens: Readonly<Record<number, TwinSigilValue>>;
}

const BASE_TWIN_SIGIL_PUZZLE: TwinSigilPuzzle =
  {
    id: 'first-balance',
    size: 6,
    solution: [
      0, 0, 1, 0, 1, 1,
      0, 0, 1, 1, 0, 1,
      1, 1, 0, 0, 1, 0,
      0, 1, 0, 0, 1, 1,
      1, 0, 1, 1, 0, 0,
      1, 1, 0, 1, 0, 0,
    ],
    givens: {
      0: 0, 1: 0, 3: 0, 5: 1,
      6: 0, 7: 0, 10: 0,
      12: 1, 14: 0, 16: 1,
      19: 1, 21: 0, 23: 1,
      26: 1, 28: 0,
      30: 1, 33: 1, 35: 0,
    },
  };

function buildTwinSigilVariant(
  id: string,
  transform: GridTransform,
  invert: boolean,
): TwinSigilPuzzle {
  const size = BASE_TWIN_SIGIL_PUZZLE.size;
  const solution = Array.from<TwinSigilValue>({ length: size ** 2 });
  const givens: Record<number, TwinSigilValue> = {};
  BASE_TWIN_SIGIL_PUZZLE.solution.forEach((value, index) => {
    solution[transformGridIndex(index, size, transform)] = invert ? (value === 1 ? 0 : 1) : value;
  });
  Object.entries(BASE_TWIN_SIGIL_PUZZLE.givens).forEach(([rawIndex, value]) => {
    const transformedIndex = transformGridIndex(Number(rawIndex), size, transform);
    givens[transformedIndex] = invert ? (value === 1 ? 0 : 1) : value;
  });
  return { id, size, solution, givens };
}

export const TWIN_SIGIL_PUZZLES: readonly TwinSigilPuzzle[] = [
  buildTwinSigilVariant('first-balance', 'identity', false),
  buildTwinSigilVariant('moon-balance', 'identity', true),
  buildTwinSigilVariant('east-mirror', 'mirror-x', false),
  buildTwinSigilVariant('west-mirror', 'mirror-x', true),
  buildTwinSigilVariant('sky-mirror', 'mirror-y', false),
  buildTwinSigilVariant('turning-balance', 'rotate-180', true),
];

export function selectPuzzleByIsland<T>(puzzles: readonly T[], islandNumber: number): T {
  const safeIsland = Math.max(1, Math.floor(islandNumber));
  return puzzles[(safeIsland - 1) % puzzles.length]!;
}

export function selectPuzzleForSession<T>(
  puzzles: readonly T[],
  islandNumber: number,
  sessionSeed: string,
): T {
  const safeIsland = Math.max(1, Math.floor(islandNumber));
  let hash = safeIsland;
  for (let index = 0; index < sessionSeed.length; index += 1) {
    hash = (Math.imul(hash, 33) + sessionSeed.charCodeAt(index)) >>> 0;
  }
  return puzzles[hash % puzzles.length]!;
}

export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  const next = [...items];
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = (Math.imul(state, 31) + seed.charCodeAt(index)) >>> 0;
  }
  for (let index = next.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [next[index], next[target]] = [next[target]!, next[index]!];
  }
  return next;
}

export function isConcordSelectionCorrect(puzzle: ConcordPuzzle, words: readonly string[]): ConcordCategory | null {
  const evaluation = evaluateConcordSelection(puzzle, words);
  return evaluation.kind === 'exact' ? evaluation.category : null;
}

export type ConcordSelectionEvaluation =
  | { kind: 'exact'; category: ConcordCategory }
  | { kind: 'one-away'; category: ConcordCategory }
  | { kind: 'miss' };

export function evaluateConcordSelection(
  puzzle: ConcordPuzzle,
  words: readonly string[],
  excludedCategoryIds: readonly string[] = [],
): ConcordSelectionEvaluation {
  if (words.length !== 4 || new Set(words).size !== 4) return { kind: 'miss' };
  const selected = new Set(words);
  const availableCategories = puzzle.categories.filter((category) => !excludedCategoryIds.includes(category.id));
  const exact = availableCategories.find((category) => category.words.every((word) => selected.has(word)));
  if (exact) return { kind: 'exact', category: exact };
  const oneAway = availableCategories.find((category) => (
    category.words.filter((word) => selected.has(word)).length === 3
  ));
  return oneAway ? { kind: 'one-away', category: oneAway } : { kind: 'miss' };
}

export function differsByOneLetter(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let differences = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) differences += 1;
  }
  return differences === 1;
}

export function resolveLexiconPuzzleForSession(
  puzzle: LexiconPuzzle,
  sessionSeconds: number | null,
): LexiconPuzzle {
  const maximumSteps = sessionSeconds !== null && sessionSeconds <= 20
    ? 3
    : sessionSeconds !== null && sessionSeconds <= 60
      ? 4
      : puzzle.steps.length;
  if (puzzle.steps.length <= maximumSteps) return puzzle;
  const firstStepIndex = puzzle.steps.length - maximumSteps;
  return {
    ...puzzle,
    start: puzzle.steps[firstStepIndex - 1]?.answer ?? puzzle.start,
    steps: puzzle.steps.slice(firstStepIndex),
  };
}

export function isSignalPathStepValid(current: number, next: number, size = SIGNAL_PATH_GRID_SIZE): boolean {
  const currentRow = Math.floor(current / size);
  const currentColumn = current % size;
  const nextRow = Math.floor(next / size);
  const nextColumn = next % size;
  return Math.abs(currentRow - nextRow) + Math.abs(currentColumn - nextColumn) === 1;
}

export interface TwinSigilValidation {
  complete: boolean;
  valid: boolean;
  invalidRows: number[];
  invalidColumns: number[];
}

function lineIsValid(line: readonly (TwinSigilValue | null)[], requireComplete: boolean): boolean {
  if (requireComplete && line.some((value) => value === null)) return false;
  const half = line.length / 2;
  const light = line.filter((value) => value === 1).length;
  const shadow = line.filter((value) => value === 0).length;
  if (light > half || shadow > half) return false;
  if (requireComplete && (light !== half || shadow !== half)) return false;
  for (let index = 0; index <= line.length - 3; index += 1) {
    const a = line[index];
    if (a !== null && a === line[index + 1] && a === line[index + 2]) return false;
  }
  return true;
}

export function validateTwinSigilBoard(board: readonly (TwinSigilValue | null)[], size: number): TwinSigilValidation {
  const complete = board.length === size * size && board.every((value) => value !== null);
  const invalidRows: number[] = [];
  const invalidColumns: number[] = [];
  for (let row = 0; row < size; row += 1) {
    const values = board.slice(row * size, (row + 1) * size);
    if (!lineIsValid(values, complete)) invalidRows.push(row);
  }
  for (let column = 0; column < size; column += 1) {
    const values = Array.from({ length: size }, (_, row) => board[(row * size) + column] ?? null);
    if (!lineIsValid(values, complete)) invalidColumns.push(column);
  }
  if (complete) {
    const rows = Array.from({ length: size }, (_, row) => board.slice(row * size, (row + 1) * size).join(''));
    const columns = Array.from({ length: size }, (_, column) => (
      Array.from({ length: size }, (_, row) => board[(row * size) + column]).join('')
    ));
    rows.forEach((row, index) => {
      if (rows.indexOf(row) !== index && !invalidRows.includes(index)) invalidRows.push(index);
    });
    columns.forEach((column, index) => {
      if (columns.indexOf(column) !== index && !invalidColumns.includes(index)) invalidColumns.push(index);
    });
  }
  return {
    complete,
    valid: complete && invalidRows.length === 0 && invalidColumns.length === 0,
    invalidRows,
    invalidColumns,
  };
}

export function resolveArenaMastery(input: {
  completionRatio: number;
  mistakes: number;
  hints: number;
  elapsedSeconds: number;
  parSeconds: number;
}): { mastery: number; stars: 1 | 2 | 3 } {
  const completion = Math.max(0, Math.min(1, input.completionRatio));
  const accuracyPenalty = Math.max(0, input.mistakes) * 5;
  const hintPenalty = Math.max(0, input.hints) * 8;
  const paceBonus = completion >= 1 && input.elapsedSeconds <= input.parSeconds ? 8 : 0;
  const mastery = Math.max(10, Math.min(100, Math.round((completion * 92) + paceBonus - accuracyPenalty - hintPenalty)));
  return { mastery, stars: mastery >= 85 ? 3 : mastery >= 58 ? 2 : 1 };
}
