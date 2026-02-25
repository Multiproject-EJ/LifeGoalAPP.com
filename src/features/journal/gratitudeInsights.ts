import type { JournalEntry } from '../../services/journal';

export type GratitudeWeeklySummary = {
  totalEntries: number;
  totalMoments: number;
  topThemes: string[];
  suggestedThankYouTarget: string | null;
  daysPracticedThisMonth: number;
  bestStreakDays: number;
};

const PERSON_PATTERN = /(grateful\s+for:|thankful\s+for|appreciate)\s*([^\n.!,;:]{2,40})/gi;

function extractTargetsFromContent(content: string): string[] {
  const matches: string[] = [];
  for (const match of content.matchAll(PERSON_PATTERN)) {
    const raw = (match[2] ?? '').trim();
    if (!raw) continue;
    const cleaned = raw
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length >= 2) matches.push(cleaned);
  }
  return matches;
}


function toIsoDateOnly(value: string): string {
  return value.slice(0, 10);
}

function calculateBestStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  const uniqueDays = Array.from(new Set(entries.map((entry) => toIsoDateOnly(entry.entry_date)))).sort();
  let best = 1;
  let current = 1;

  for (let i = 1; i < uniqueDays.length; i += 1) {
    const prev = new Date(uniqueDays[i - 1]);
    const next = new Date(uniqueDays[i]);
    const diffDays = Math.round((next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

export function buildGratitudeWeeklySummary(entries: JournalEntry[]): GratitudeWeeklySummary {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyEntries = entries.filter((entry) => new Date(entry.entry_date) >= weekAgo);

  const themeCounts = new Map<string, number>();
  const targetCounts = new Map<string, number>();

  weeklyEntries.forEach((entry) => {
    entry.tags?.forEach((tag) => {
      const normalized = tag.trim().toLowerCase();
      if (!normalized) return;
      themeCounts.set(normalized, (themeCounts.get(normalized) ?? 0) + 1);
    });

    extractTargetsFromContent(entry.content).forEach((target) => {
      const normalized = target.toLowerCase();
      targetCounts.set(normalized, (targetCounts.get(normalized) ?? 0) + 1);
    });
  });

  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);

  const suggestedThankYouTarget = [...targetCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const totalMoments = weeklyEntries.reduce((count, entry) => {
    const structuredMoments = entry.content.match(/grateful\s+for:/gi)?.length ?? 0;
    if (structuredMoments > 0) return count + structuredMoments;

    const freeformFallback = entry.content.trim().length > 0 ? 1 : 0;
    return count + freeformFallback;
  }, 0);


  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthDays = new Set(
    entries
      .filter((entry) => {
        const date = new Date(entry.entry_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .map((entry) => toIsoDateOnly(entry.entry_date)),
  );

  const daysPracticedThisMonth = monthDays.size;
  const bestStreakDays = calculateBestStreak(entries);

  return {
    totalEntries: weeklyEntries.length,
    totalMoments,
    topThemes,
    suggestedThankYouTarget,
    daysPracticedThisMonth,
    bestStreakDays,
  };
}

export function buildThankYouDraft(target: string | null): string {
  if (!target) {
    return 'Thank you for being part of my week. I appreciate your support and the calm, positive impact you have had on me.';
  }

  return `Hey ${target}, just wanted to say thank you. You made a real difference for me this week, and I truly appreciate your support.`;
}
