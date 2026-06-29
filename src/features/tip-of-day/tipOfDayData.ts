/**
 * tipOfDayData — loads the signals the Tip of the Day needs and assembles the
 * day's deck. Bridges the IO layer (habits, logs, AI, persistence) to the pure
 * deck builder in tipOfDayContent.ts.
 *
 * Mirrors the adherence/demo loading already used in features/ai-coach/AiCoach.tsx
 * so behaviour stays consistent across the app.
 */

import type { Session } from '@supabase/supabase-js';

import {
  getDemoHabitLogsForRange,
  getDemoHabitsForUser,
} from '../../services/demoData';
import { isDemoSession } from '../../services/demoSession';
import {
  listHabitLogsForRangeMultiV2,
  listHabitsV2,
  type HabitLogV2Row,
  type HabitV2Row,
} from '../../services/habitsV2';
import { recordTipShown } from '../../services/tipOfDayLog';
import { listRecentHabitInsights } from '../../services/habitInsights';
import { getScheduledCountForWindow } from '../habits/scheduleInterpreter';
import { assessHabitHealth } from '../habits/habitHealth';
import { formatInsightsForPrompt, summarizeInsights } from '../habits/habitInsightModel';
import { enrichReshapeDeck } from './tipOfDayAi';
import {
  buildReshapeDeck,
  selectTipDeck,
  type TipDeck,
  type TipHabitInput,
  type TipHealthInput,
} from './tipOfDayContent';

const normalizeDateOnly = (date: Date): string => date.toISOString().split('T')[0];

function calcPercentage(completed: number, scheduled: number): number {
  if (scheduled <= 0) return 0;
  return Math.round((completed / scheduled) * 100);
}

function toTipHabit(habit: HabitV2Row): TipHabitInput {
  return {
    id: habit.id,
    title: habit.title,
    emoji: habit.emoji ?? null,
    habitEnvironment: habit.habit_environment ?? null,
    habitIntent: habit.habit_intent ?? null,
  };
}

export interface TipOfDayResult {
  deck: TipDeck;
  source: 'openai' | 'fallback';
}

/**
 * Build today's Tip of the Day for the given session, recording it to the log.
 * Returns null only when there is no usable session at all (the deck builder
 * itself always produces a deck, even with zero habits).
 */
export async function buildTipOfDayForSession(
  session: Session | null | undefined,
  now: Date = new Date(),
): Promise<TipOfDayResult | null> {
  const userId = session?.user?.id;
  if (!userId) return null;

  const isDemo = isDemoSession(session);

  const habits: HabitV2Row[] = isDemo
    ? (getDemoHabitsForUser(userId) as unknown as HabitV2Row[])
    : (await listHabitsV2()).data ?? [];

  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);
  const start30 = new Date(endDate);
  start30.setDate(start30.getDate() - 29);
  start30.setHours(0, 0, 0, 0);
  const start7 = new Date(endDate);
  start7.setDate(start7.getDate() - 6);
  start7.setHours(0, 0, 0, 0);

  const start30Iso = normalizeDateOnly(start30);
  const start7Iso = normalizeDateOnly(start7);
  const endIso = normalizeDateOnly(endDate);
  const referenceIso = normalizeDateOnly(now);
  const habitIds = habits.map((h) => h.id);

  let logs: HabitLogV2Row[] = [];
  if (habitIds.length > 0) {
    if (isDemo) {
      logs = getDemoHabitLogsForRange(habitIds, start30Iso, endIso) as unknown as HabitLogV2Row[];
    } else {
      const { data, error } = await listHabitLogsForRangeMultiV2({
        userId,
        habitIds,
        startDate: start30Iso,
        endDate: endIso,
      });
      if (error) {
        console.warn('Tip of the Day: failed to load habit logs:', error.message ?? error);
      }
      logs = data ?? [];
    }
  }

  const completedLogs = logs.filter((log) => log.done);

  const tipHabits = habits.map(toTipHabit);
  const health: TipHealthInput[] = habits.map((habit) => {
    const habitLogs = completedLogs.filter((log) => log.habit_id === habit.id);
    const scheduled7 = getScheduledCountForWindow(habit, 7, endDate);
    const completed7 = habitLogs.filter((log) => log.date >= start7Iso).length;
    const percentage = calcPercentage(completed7, scheduled7);
    const lastCompletedOn = habitLogs.reduce<string | null>(
      (latest, log) => (latest === null || log.date > latest ? log.date : latest),
      null,
    );

    return {
      habitId: habit.id,
      assessment: assessHabitHealth({
        adherence7: { scheduledCount: scheduled7, percentage },
        lastCompletedOn,
        referenceDateISO: referenceIso,
      }),
      adherencePercent: scheduled7 > 0 ? percentage : null,
      hasEnoughSignal: scheduled7 >= 2,
    };
  });

  const deck = selectTipDeck({ habits: tipHabits, health, date: now });

  let source: 'openai' | 'fallback' = 'fallback';
  let finalDeck = deck;
  if (deck.variation === 'reshape_struggling' && deck.habitId) {
    const habit = tipHabits.find((h) => h.id === deck.habitId);
    const habitHealth = health.find((h) => h.habitId === deck.habitId);
    if (habit && habitHealth) {
      // Close the loop: fold the user's own captured cues into the deck and the
      // AI prompt so the tip reflects why this habit actually slips for them.
      const insights = await listRecentHabitInsights(userId, habit.id, 10);
      const summary = summarizeInsights(insights);
      const promptHint = formatInsightsForPrompt(summary);
      const cueHint = summary.topCues.slice(0, 3).map((cue) => cue.label).join(', ') || null;

      const baseDeck = cueHint ? buildReshapeDeck({ habit, health: habitHealth, cueHint }) : deck;
      const enriched = await enrichReshapeDeck(baseDeck, habit, habitHealth, promptHint);
      finalDeck = enriched.deck;
      source = enriched.source;
    }
  }

  void recordTipShown({
    userId,
    variation: finalDeck.variation,
    habitId: finalDeck.habitId,
    payload: finalDeck,
    source,
    shownOn: referenceIso,
  });

  return { deck: finalDeck, source };
}
