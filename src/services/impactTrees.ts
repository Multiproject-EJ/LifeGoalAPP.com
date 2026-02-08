import { getBalanceWeekId } from './balanceScore';

export type ImpactTreeSource = 'weekly_closure' | 'streak_30' | 'seasonal_event' | 'manual';

export type ImpactTreeEntry = {
  id: string;
  date: string;
  source: ImpactTreeSource;
  amount: number;
  notes?: string;
  partnerBatchId?: string | null;
};

const LEDGER_STORAGE_KEY = 'lifegoal_tree_of_life_ledger';
const WEEKLY_AWARD_KEY = 'lifegoal_impact_trees_weekly_awards';

function getStorageKey(base: string, userId: string): string {
  return `${base}:${userId}`;
}

function readLedger(userId: string): ImpactTreeEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getStorageKey(LEDGER_STORAGE_KEY, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImpactTreeEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to read Tree of Life ledger.', error);
    return [];
  }
}

function writeLedger(userId: string, entries: ImpactTreeEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      getStorageKey(LEDGER_STORAGE_KEY, userId),
      JSON.stringify(entries),
    );
  } catch (error) {
    console.warn('Unable to persist Tree of Life ledger.', error);
  }
}

function readWeeklyAwards(userId: string): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getStorageKey(WEEKLY_AWARD_KEY, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to read Tree of Life weekly awards.', error);
    return [];
  }
}

function writeWeeklyAwards(userId: string, weeks: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      getStorageKey(WEEKLY_AWARD_KEY, userId),
      JSON.stringify(weeks),
    );
  } catch (error) {
    console.warn('Unable to persist Tree of Life weekly awards.', error);
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `impact-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getImpactTreeLedger(userId: string): { entries: ImpactTreeEntry[]; total: number } {
  const entries = readLedger(userId)
    .filter((entry) => entry && typeof entry.amount === 'number')
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return { entries, total };
}

export function hasWeeklyTreeAward(userId: string, referenceDate: Date): boolean {
  const weekId = getBalanceWeekId(referenceDate);
  const weeks = readWeeklyAwards(userId);
  return weeks.includes(weekId);
}

export function awardWeeklyClosureTree(
  userId: string,
  referenceDate: Date,
): {
  awarded: boolean;
  entry: ImpactTreeEntry | null;
  entries: ImpactTreeEntry[];
  total: number;
} {
  const weekId = getBalanceWeekId(referenceDate);
  const weeks = readWeeklyAwards(userId);
  const ledger = readLedger(userId);

  if (weeks.includes(weekId)) {
    const summary = getImpactTreeLedger(userId);
    return { awarded: false, entry: null, entries: summary.entries, total: summary.total };
  }

  const entry: ImpactTreeEntry = {
    id: createId(),
    date: referenceDate.toISOString(),
    source: 'weekly_closure',
    amount: 1,
    notes: 'Weekly closure ritual completed (Tree of Life watered).',
    partnerBatchId: null,
  };

  const nextEntries = [entry, ...ledger];
  writeLedger(userId, nextEntries);
  writeWeeklyAwards(userId, [...weeks, weekId]);

  const summary = getImpactTreeLedger(userId);

  return { awarded: true, entry, entries: summary.entries, total: summary.total };
}
