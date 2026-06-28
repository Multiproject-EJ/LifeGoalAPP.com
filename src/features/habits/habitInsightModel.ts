/**
 * habitInsightModel — pure helpers + constants for habit insight capture.
 *
 * No React, no IO, so it is trivially unit-testable. The IO service lives in
 * services/habitInsights.ts and the capture UI in HabitInsightCaptureSheet.tsx.
 *
 * Insights are quick "what got in the way?" captures (cue chips + optional note)
 * logged when a struggling habit is skipped on the Today screen. summarizeInsights
 * / formatInsightsForPrompt turn a batch of them into a compact signal the Tip of
 * the Day reshape AI can quote back to the user.
 */

export interface CueChip {
  /** Stable value stored in the DB (lowercase, no spaces). */
  value: string;
  /** Short label shown on the chip. */
  label: string;
  /** Optional emoji prefix. */
  emoji?: string;
}

export interface CueChipGroup {
  title: string;
  chips: CueChip[];
}

/** The cue chip catalogue, grouped for the capture sheet. */
export const CUE_CHIP_GROUPS: CueChipGroup[] = [
  {
    title: 'How I felt',
    chips: [
      { value: 'tired', label: 'Tired', emoji: '😴' },
      { value: 'bored', label: 'Bored', emoji: '🥱' },
      { value: 'stressed', label: 'Stressed', emoji: '😣' },
      { value: 'anxious', label: 'Anxious', emoji: '😟' },
      { value: 'low_energy', label: 'Low energy', emoji: '🔋' },
      { value: 'unmotivated', label: 'Unmotivated', emoji: '😐' },
    ],
  },
  {
    title: 'What was happening',
    chips: [
      { value: 'out_of_time', label: 'Out of time', emoji: '⏳' },
      { value: 'forgot', label: 'Forgot', emoji: '🧠' },
      { value: 'scrolling', label: 'On my phone', emoji: '📱' },
      { value: 'distracted', label: 'Distracted', emoji: '🤹' },
      { value: 'too_hard', label: 'Felt too hard', emoji: '🧗' },
      { value: 'interrupted', label: 'Interrupted', emoji: '🚧' },
    ],
  },
];

const CUE_LABEL_BY_VALUE: Map<string, string> = new Map(
  CUE_CHIP_GROUPS.flatMap((group) => group.chips).map((chip) => [chip.value, chip.label]),
);

/** Human label for a stored cue value (falls back to the raw value). */
export function cueLabel(value: string): string {
  return CUE_LABEL_BY_VALUE.get(value) ?? value.replace(/_/g, ' ');
}

export interface HabitInsightRecord {
  cueTags: string[];
  note: string | null;
  capturedOn: string;
}

export interface InsightSummary {
  /** Cue tags ranked by how often they appear, most frequent first. */
  topCues: Array<{ value: string; label: string; count: number }>;
  /** Most recent free-text notes (newest first), de-duplicated and trimmed. */
  notes: string[];
  /** Total number of insights summarised. */
  total: number;
}

/**
 * Summarise a batch of insights into ranked cues + recent notes. Input order is
 * not assumed; notes are returned newest-first by capturedOn.
 */
export function summarizeInsights(insights: HabitInsightRecord[], maxNotes = 3): InsightSummary {
  const counts = new Map<string, number>();
  for (const insight of insights) {
    for (const tag of insight.cueTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const topCues = Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: cueLabel(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const seen = new Set<string>();
  const notes: string[] = [];
  for (const insight of [...insights].sort((a, b) => b.capturedOn.localeCompare(a.capturedOn))) {
    const note = insight.note?.trim();
    if (!note) continue;
    const key = note.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push(note);
    if (notes.length >= maxNotes) break;
  }

  return { topCues, notes, total: insights.length };
}

/**
 * Render a summary as a compact line for the AI prompt, or null when there is
 * nothing meaningful to add.
 */
export function formatInsightsForPrompt(summary: InsightSummary): string | null {
  if (summary.total === 0 || (summary.topCues.length === 0 && summary.notes.length === 0)) {
    return null;
  }

  const parts: string[] = [];
  if (summary.topCues.length > 0) {
    const cues = summary.topCues
      .slice(0, 4)
      .map((cue) => (cue.count > 1 ? `${cue.label} (x${cue.count})` : cue.label))
      .join(', ');
    parts.push(`Self-reported cues when it slips: ${cues}.`);
  }
  if (summary.notes.length > 0) {
    parts.push(`Their notes: ${summary.notes.map((note) => `"${note}"`).join(' ')}`);
  }
  return parts.join(' ');
}
