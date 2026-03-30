import { listJournalEntries } from '../../../services/journal';
import { fetchGoals } from '../../../services/goals';
import { listHabitsV2 } from '../../../services/habitsV2';

export type InnerContextDomain = 'reflections' | 'habits' | 'goals' | 'journals' | 'vision_board' | 'traits';

export type AssembledInnerContext = {
  contextSlice: string;
  usedContextDomains: InnerContextDomain[];
  contextSignals: {
    habits: string[];
    goals: string[];
    journals: string[];
  };
};

function compact(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function clip(value: string, max = 140): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

async function loadHabitSignals(): Promise<string[]> {
  const result = await listHabitsV2({ includeInactive: true });
  if (result.error || !result.data) return [];
  return result.data
    .slice(0, 3)
    .map((habit) => {
      const name = compact(habit.title);
      const status = compact(habit.status);
      if (!name) return null;
      return `${name}${status ? ` (${status})` : ''}`;
    })
    .filter((value): value is string => Boolean(value));
}

async function loadGoalSignals(): Promise<string[]> {
  const result = await fetchGoals();
  if (result.error || !result.data) return [];
  return result.data
    .slice(0, 3)
    .map((goal) => {
      const title = compact(goal.title);
      if (!title) return null;
      const notes = compact(goal.timing_notes);
      return notes ? `${title} — ${clip(notes, 80)}` : title;
    })
    .filter((value): value is string => Boolean(value));
}

async function loadJournalSignals(): Promise<string[]> {
  const result = await listJournalEntries({ limit: 3 });
  if (result.error || !result.data) return [];
  return result.data
    .map((entry) => {
      const title = compact(entry.title);
      const content = compact(entry.content);
      if (title) return clip(title, 90);
      if (content) return clip(content, 90);
      return null;
    })
    .filter((value): value is string => Boolean(value));
}

export async function assembleInnerContext(input: {
  answers: Record<string, string>;
  requestedDomains: InnerContextDomain[];
}): Promise<AssembledInnerContext> {
  const used = new Set<InnerContextDomain>(['reflections']);
  const signals: AssembledInnerContext['contextSignals'] = {
    habits: [],
    goals: [],
    journals: [],
  };

  if (input.requestedDomains.includes('habits')) {
    signals.habits = await loadHabitSignals();
    if (signals.habits.length > 0) used.add('habits');
  }
  if (input.requestedDomains.includes('goals')) {
    signals.goals = await loadGoalSignals();
    if (signals.goals.length > 0) used.add('goals');
  }
  if (input.requestedDomains.includes('journals')) {
    signals.journals = await loadJournalSignals();
    if (signals.journals.length > 0) used.add('journals');
  }

  const usedContextDomains = Array.from(used);
  const lines = [
    `User answers: ${JSON.stringify(input.answers)}`,
    `Used domains: ${JSON.stringify(usedContextDomains)}`,
    signals.habits.length > 0 ? `Habit signals: ${JSON.stringify(signals.habits)}` : null,
    signals.goals.length > 0 ? `Goal signals: ${JSON.stringify(signals.goals)}` : null,
    signals.journals.length > 0 ? `Journal signals: ${JSON.stringify(signals.journals)}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    contextSlice: lines.join('\n'),
    usedContextDomains,
    contextSignals: signals,
  };
}
