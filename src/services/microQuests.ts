import type { BalanceAxisKey, BalanceSnapshot } from './balanceScore';
import type { HabitV2Row } from './habitsV2';
import { XP_REWARDS } from '../types/gamification';

export type MicroQuestSource = 'balance' | 'habit' | 'focus';
export type MicroQuestStatus = 'active' | 'completed';

export type MicroQuest = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  status: MicroQuestStatus;
  source: MicroQuestSource;
  axisKey?: BalanceAxisKey;
  habitId?: string;
  completedAt?: string;
};

export type MicroQuestState = {
  date: string;
  quests: MicroQuest[];
  bonusAwarded: boolean;
  bonusAwardedAt?: string;
};

const STORAGE_PREFIX = 'lifegoal_micro_quests';

const BALANCE_QUESTS: Record<BalanceAxisKey, Array<{ title: string; description: string }>> = {
  agency: [
    {
      title: 'Agency micro-quest: make one decisive move',
      description: 'Pick a goal and take one 10-minute action that moves it forward.',
    },
    {
      title: 'Agency micro-quest: choose the next step',
      description: 'Name the most important task for today and block 15 minutes for it.',
    },
  ],
  awareness: [
    {
      title: 'Awareness micro-quest: log one signal',
      description: 'Notice one pattern, emotion, or trigger and jot it down in one sentence.',
    },
    {
      title: 'Awareness micro-quest: 60-second pause',
      description: 'Take a 60-second breath break and label the feeling you notice.',
    },
  ],
  rationality: [
    {
      title: 'Rationality micro-quest: open a doubt',
      description: 'Answer “What might I be wrong about?” with one honest line.',
    },
    {
      title: 'Rationality micro-quest: test an assumption',
      description: 'Write one assumption and a quick way to check it this week.',
    },
  ],
  vitality: [
    {
      title: 'Vitality micro-quest: energize for 10 minutes',
      description: 'Move, stretch, or walk for 10 minutes to reset your energy.',
    },
    {
      title: 'Vitality micro-quest: refuel',
      description: 'Hydrate, snack, or rest for five minutes to support your body.',
    },
  ],
};

const FOCUS_QUESTS = [
  {
    title: 'Game of Life micro-quest: quick balance check',
    description: 'Scan the four axes and choose one tiny adjustment for tomorrow.',
  },
  {
    title: 'Game of Life micro-quest: coach check-in',
    description: 'Ask your Game of Life coach for one small adjustment you can try.',
  },
  {
    title: 'Game of Life micro-quest: celebrate a win',
    description: 'Write down one small win from today to reinforce momentum.',
  },
];

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}_${userId}`;

const getVariantIndex = (seed: string, size: number) => {
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) {
    total += seed.charCodeAt(i);
  }
  return total % size;
};

const normalizeDate = (date: Date) => date.toISOString().slice(0, 10);

const buildBalanceQuest = (dateISO: string, snapshot: BalanceSnapshot | null): MicroQuest => {
  const axisKey: BalanceAxisKey = snapshot?.nextFocus?.key ?? 'agency';
  const variants = BALANCE_QUESTS[axisKey];
  const variant = variants[getVariantIndex(`${dateISO}-${axisKey}`, variants.length)];

  return {
    id: `${dateISO}-balance-${axisKey}`,
    title: variant.title,
    description: variant.description,
    xpReward: XP_REWARDS.MICRO_QUEST,
    status: 'active',
    source: 'balance',
    axisKey,
  };
};

const buildHabitQuest = (dateISO: string, habits: HabitV2Row[]): MicroQuest => {
  const activeHabits = habits.filter((habit) => !habit.archived);
  const habit = activeHabits[0];
  if (!habit) {
    return {
      id: `${dateISO}-habit-foundation`,
      title: 'Habit micro-quest: set a 2-minute starter habit',
      description: 'Pick one tiny habit you can do today to support your Game of Life balance.',
      xpReward: XP_REWARDS.MICRO_QUEST,
      status: 'active',
      source: 'habit',
    };
  }

  return {
    id: `${dateISO}-habit-${habit.id}`,
    title: `Habit micro-quest: ${habit.emoji ? `${habit.emoji} ` : ''}${habit.title}`,
    description: 'Complete this habit once today to keep your Game of Life momentum steady.',
    xpReward: XP_REWARDS.MICRO_QUEST,
    status: 'active',
    source: 'habit',
    habitId: habit.id,
  };
};

const buildFocusQuest = (dateISO: string): MicroQuest => {
  const variant = FOCUS_QUESTS[getVariantIndex(`${dateISO}-focus`, FOCUS_QUESTS.length)];
  return {
    id: `${dateISO}-focus`,
    title: variant.title,
    description: variant.description,
    xpReward: XP_REWARDS.MICRO_QUEST,
    status: 'active',
    source: 'focus',
  };
};

const createDailyQuests = (
  dateISO: string,
  snapshot: BalanceSnapshot | null,
  habits: HabitV2Row[],
): MicroQuest[] => [
  buildBalanceQuest(dateISO, snapshot),
  buildHabitQuest(dateISO, habits),
  buildFocusQuest(dateISO),
];

export const loadMicroQuestState = (userId: string): MicroQuestState | null => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) return null;
    return JSON.parse(stored) as MicroQuestState;
  } catch (error) {
    console.error('Failed to load micro-quest state:', error);
    return null;
  }
};

const saveMicroQuestState = (userId: string, state: MicroQuestState) => {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
};

export const ensureMicroQuestState = (
  userId: string,
  snapshot: BalanceSnapshot | null,
  habits: HabitV2Row[],
  date = new Date(),
): MicroQuestState => {
  const dateISO = normalizeDate(date);
  const stored = loadMicroQuestState(userId);

  if (stored && stored.date === dateISO && stored.quests.length > 0) {
    return stored;
  }

  const quests = createDailyQuests(dateISO, snapshot, habits);
  const nextState: MicroQuestState = {
    date: dateISO,
    quests,
    bonusAwarded: false,
  };

  saveMicroQuestState(userId, nextState);
  return nextState;
};

export const completeMicroQuest = (
  userId: string,
  questId: string,
): {
  state: MicroQuestState | null;
  quest: MicroQuest | null;
  bonusAwarded: boolean;
  didComplete: boolean;
} => {
  const current = loadMicroQuestState(userId);
  if (!current) {
    return { state: null, quest: null, bonusAwarded: false, didComplete: false };
  }

  let bonusAwarded = false;
  let didComplete = false;
  const quests = current.quests.map((quest) => {
    if (quest.id !== questId || quest.status === 'completed') {
      return quest;
    }
    didComplete = true;
    return {
      ...quest,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
    };
  });

  const updatedQuest = quests.find((quest) => quest.id === questId) ?? null;
  const completedCount = quests.filter((quest) => quest.status === 'completed').length;

  const shouldAwardBonus = !current.bonusAwarded && completedCount >= 2;
  const nextState: MicroQuestState = {
    ...current,
    quests,
    bonusAwarded: current.bonusAwarded || shouldAwardBonus,
    bonusAwardedAt: current.bonusAwardedAt ?? (shouldAwardBonus ? new Date().toISOString() : undefined),
  };

  if (shouldAwardBonus) {
    bonusAwarded = true;
  }

  saveMicroQuestState(userId, nextState);
  return { state: nextState, quest: updatedQuest, bonusAwarded, didComplete };
};

export const countCompletedMicroQuests = (state: MicroQuestState | null) => {
  if (!state) return 0;
  return state.quests.filter((quest) => quest.status === 'completed').length;
};

export const getMicroQuestDateLabel = (state: MicroQuestState | null, today = new Date()) => {
  if (!state) return 'Today';
  const todayISO = normalizeDate(today);
  return state.date === todayISO ? 'Today' : state.date;
};
