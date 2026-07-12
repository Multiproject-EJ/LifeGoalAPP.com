/**
 * Shadow Quests: a weekly optional micro-challenge derived from the player's
 * shadow card (their least-played archetype). Completing quests "warms up" the
 * shadow card through ember levels — the gameplay loop the card levels were
 * designed for, without touching the game economy or any Supabase schema.
 *
 * Persistence is local-only (localStorage, per user), matching the Day Zero
 * onboarding pattern. Quest selection is deterministic per card + ISO week so
 * the same quest shows on every device/visit within a week.
 */

import type { ArchetypeCard } from './archetypeDeck';

export type ShadowQuest = {
  id: string;
  cardId: string;
  weekKey: string;
  kind: 'play' | 'growth' | 'notice';
  title: string;
  description: string;
};

export type ShadowQuestCompletion = {
  cardId: string;
  weekKey: string;
  questId: string;
  completedAt: string;
};

export type ShadowProgress = {
  completions: number;
  /** Ember level 0-3. At 3 the shadow has "stepped into the light". */
  level: number;
  label: string;
};

export const SHADOW_MAX_LEVEL = 3;

const LEVEL_LABELS = ['Unplayed', 'Stirring', 'Waking', 'In the light'] as const;

/** ISO-8601 week key, e.g. "2026-W28". Weeks start on Monday. */
export function getIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // Sunday → 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // Thursday decides the ISO year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Builds the quest for a card + week. Rotates between three quest kinds so a
 * long-lived shadow card doesn't repeat the same ask every week.
 */
export function buildShadowQuestForWeek(card: ArchetypeCard, weekKey: string): ShadowQuest {
  const variants: Array<Pick<ShadowQuest, 'kind' | 'title' | 'description'>> = [
    {
      kind: 'play',
      title: `Play your ${card.name} card once`,
      description: `${card.drive}. Find one small, low-stakes moment this week to act from that energy — even for five minutes.`,
    },
    {
      kind: 'growth',
      title: `Borrow the ${card.name}'s move`,
      description: `${card.growthStrategy}. Try it once this week and notice what changes.`,
    },
    {
      kind: 'notice',
      title: `Spot the missing ${card.name}`,
      description: `Notice one moment this week where a little ${card.name} energy (${(card.strengths[0] ?? 'its strength').toLowerCase()}) would have helped. One line in your journal is enough.`,
    },
  ];

  const variant = variants[hashString(`${card.id}:${weekKey}`) % variants.length];
  return {
    id: `${card.id}:${weekKey}:${variant.kind}`,
    cardId: card.id,
    weekKey,
    ...variant,
  };
}

export function getShadowProgress(
  completions: readonly ShadowQuestCompletion[],
  cardId: string,
): ShadowProgress {
  const count = completions.filter((entry) => entry.cardId === cardId).length;
  const level = Math.min(count, SHADOW_MAX_LEVEL);
  return { completions: count, level, label: LEVEL_LABELS[level] };
}

// ─── Local persistence ──────────────────────────────────────────────────────

const STORAGE_PREFIX = 'lifegoal.shadow_quests.v1.';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadShadowQuestCompletions(userId: string | null): ShadowQuestCompletion[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completions?: ShadowQuestCompletion[] };
    return Array.isArray(parsed.completions) ? parsed.completions : [];
  } catch {
    return [];
  }
}

function saveShadowQuestCompletions(userId: string, completions: ShadowQuestCompletion[]): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify({ completions }));
  } catch {
    // Storage full/blocked — the quest simply won't persist.
  }
}

export function completeShadowQuest(
  userId: string,
  quest: ShadowQuest,
): ShadowQuestCompletion[] {
  const completions = loadShadowQuestCompletions(userId);
  if (completions.some((entry) => entry.questId === quest.id)) return completions;
  const next = [
    ...completions,
    {
      cardId: quest.cardId,
      weekKey: quest.weekKey,
      questId: quest.id,
      completedAt: new Date().toISOString(),
    },
  ];
  saveShadowQuestCompletions(userId, next);
  return next;
}

export function uncompleteShadowQuest(
  userId: string,
  quest: ShadowQuest,
): ShadowQuestCompletion[] {
  const completions = loadShadowQuestCompletions(userId);
  const next = completions.filter((entry) => entry.questId !== quest.id);
  if (next.length !== completions.length) saveShadowQuestCompletions(userId, next);
  return next;
}
