/**
 * Reflection curriculum adapter for the Mystery-stop "Behavior stop" check-in
 * (rendered by `IslandRunReflectionComposer`).
 *
 * Historically the composer drew from a fixed pool of 6 hardcoded prompts, so
 * every island reshuffled the same 6 cards — repetitive by island ~7. This
 * adapter instead sources each island's check-in cards from the already-authored
 * 120-island Compass Book curriculum, so the *questions* asked at the Behavior
 * stop are genuinely different island-to-island and follow the same six-chapter
 * life arc (audit → values → vision → direction → commitment → habits).
 *
 * Design (see `docs/gameplay/DEFAULT_CURRICULUM_120_ISLANDS.md`, Tier A):
 *   - Each island's card set = one chapter "core question" card (arc continuity)
 *     plus up to 3 per-island facet cards derived from that island's Compass
 *     activity blocks (per-island specificity). Always ≥ 2 cards so the
 *     elimination tournament in the composer always has something to judge.
 *   - Compass blocks were authored for a richer block editor, not a 2-answer
 *     tournament, so this adapter maps each block to a fresh reflective *prompt*
 *     (the part that kills repetition) with a tasteful pair of stance answers
 *     matched to the block type — it never truncates an N-option choice into two
 *     misleading buttons.
 *   - Islands outside 1..120 (e.g. no authored activity) fall back to the legacy
 *     6-prompt rotation so behaviour degrades gracefully rather than throwing.
 *
 * Pure — no React, no Supabase, no browser APIs — so it is unit-testable under a
 * plain tsc compile. Imports the compass-book *content* module directly (not the
 * barrel) to avoid dragging in React/Supabase-bound logic, mirroring
 * `compass-book/logic/islandFragment.ts`.
 */

import type { JournalEntryType } from '../../../../lib/database.types';
import type {
  CompassBlockDefinition,
  CompassBlockType,
  CompassBookActivityDefinition,
  CompassBookChapterDefinition,
} from '../../../compass-book/types';
import {
  getActivityForIsland,
  getChapterDefinition,
} from '../../../compass-book/content/compassBookCurriculum';

export type ReflectionPrompt = {
  id: string;
  title: string;
  prompt: string;
  suggestedType: Extract<JournalEntryType, 'quick' | 'life_wheel'>;
  category: string | null;
  buttonAnswers: [string, string];
  effortBonusHint: string;
};

/**
 * Legacy fallback pool — the original 6 hardcoded prompts. Retained only for
 * islands with no authored Compass activity (out of the 1..120 range) so those
 * islands keep working exactly as before.
 */
export const LEGACY_REFLECTION_PROMPTS: ReflectionPrompt[] = [
  {
    id: 'momentum',
    title: 'Momentum Check',
    prompt:
      'Which island card feels most true right now: protecting your current momentum, or changing direction before the day drifts?',
    suggestedType: 'quick',
    category: null,
    buttonAnswers: ['Protect the spark ✨', 'Change the current 🌊'],
    effortBonusHint: 'Type what would make that answer feel real, and add one emotion you notice.',
  },
  {
    id: 'health',
    title: 'Health Recalibration',
    prompt:
      'Which card deserves the check-in today: your body asking for care, or your energy asking for a smarter pace?',
    suggestedType: 'life_wheel',
    category: 'Health',
    buttonAnswers: ['Care for my body 🌿', 'Pace my energy 🔋'],
    effortBonusHint: 'Add what your body needs and the emotion underneath it.',
  },
  {
    id: 'career',
    title: 'Career Focus',
    prompt:
      'Which card should win this round: one useful work step, or one boundary that makes better work possible?',
    suggestedType: 'life_wheel',
    category: 'Career',
    buttonAnswers: ['Ship one useful step 🚀', 'Protect the boundary 🛡️'],
    effortBonusHint: 'Type the step or boundary, then add how you want to feel after it.',
  },
  {
    id: 'relationships',
    title: 'Connection Check',
    prompt:
      'Which card matters more today: reaching toward someone, or listening more honestly to what a relationship needs?',
    suggestedType: 'life_wheel',
    category: 'Relationships',
    buttonAnswers: ['Reach out warmly 🤝', 'Listen beneath words 💙'],
    effortBonusHint: 'Name the person or situation, and add the emotion you want to bring.',
  },
  {
    id: 'growth',
    title: 'Growth Lens',
    prompt:
      'Which card is stronger right now: learning from what happened, or choosing the belief you want to practice next?',
    suggestedType: 'life_wheel',
    category: 'Personal Growth',
    buttonAnswers: ['Learn from the clue 🧭', 'Practice the belief 🌱'],
    effortBonusHint: 'Type the lesson or belief, and add the feeling you want to grow with it.',
  },
  {
    id: 'finance',
    title: 'Resource Check',
    prompt:
      'Which card should guide your resources today: creating a little more stability, or spending attention with intention?',
    suggestedType: 'life_wheel',
    category: 'Finance',
    buttonAnswers: ['Create stability 🪙', 'Spend attention wisely 🎯'],
    effortBonusHint: 'Add one money/resource move and the emotion you want around it.',
  },
];

/** Max facet cards drawn from a single island's activity blocks. */
const MAX_ACTIVITY_CARDS = 3;
/** Max total cards per island (chapter card + facets), keeps the tournament snappy. */
const MAX_CARDS_PER_ISLAND = 4;

/**
 * Block types that make a meaningful reflective card. Excludes `review` and
 * `confirmation` (book-only sealing affordances, not reflective prompts).
 */
const CARDABLE_BLOCK_TYPES: ReadonlySet<CompassBlockType> = new Set([
  'single_choice',
  'multi_choice',
  'ranking',
  'scale',
  'emotion_choice',
  'short_text',
  'sentence_completion',
  'reflection',
  'experiment',
  'check_in',
]);

/** Two contrasting "stance" answers matched to the block type. */
function deriveButtonAnswers(block: CompassBlockDefinition): [string, string] {
  switch (block.type) {
    case 'scale': {
      // The authored min/max labels are contrastive by design ("Struggling" /
      // "Thriving", "Floor" / "Comfortable") — reuse them when present.
      const low = block.minLabel?.trim();
      const high = block.maxLabel?.trim();
      return [low || 'Lower than I want 📉', high || 'Right where it should be 📈'];
    }
    case 'emotion_choice':
      return ['I can feel which one 💗', 'It keeps shifting 🌗'];
    case 'single_choice':
    case 'multi_choice':
    case 'ranking':
      return ['I can name it now ✍️', 'Still narrowing it down 🔍'];
    case 'experiment':
      return ["I'll try it this week 🚀", 'Not yet — just noting it 📝'];
    case 'check_in':
      return ['Checked in honestly ✅', 'I need another pass 🔁'];
    default:
      // short_text, sentence_completion, reflection.
      return ['That lands for me 💡', 'Let me sit with it 🤔'];
  }
}

/** Prompt without its per-area suffix or "(optional)" tail — used for display. */
function cleanPrompt(prompt: string): string {
  return prompt.replace(/\s*\(optional\)\s*$/i, '').trim();
}

/** Collapse per-area / optional variants to one key so 8 area-scales dedupe to 1 card. */
function promptStem(prompt: string): string {
  const stem = cleanPrompt(prompt).split(' — ')[0];
  return stem.trim().toLowerCase();
}

/** A short facet title derived from the block prompt (≤ ~5 words). */
function deriveCardTitle(block: CompassBlockDefinition): string {
  const stem = cleanPrompt(block.prompt)
    .split(' — ')[0]
    .replace(/[?.]+\s*$/, '')
    .trim();
  const words = stem.split(/\s+/);
  const short = words.length > 6 ? `${words.slice(0, 6).join(' ')}…` : stem;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/** The chapter-level "core question" card — arc continuity across the 20-island stretch. */
function buildChapterCard(chapter: CompassBookChapterDefinition): ReflectionPrompt {
  return {
    id: `${chapter.id}.core`,
    title: chapter.title,
    prompt: chapter.coreQuestion,
    suggestedType: 'quick',
    category: chapter.title,
    buttonAnswers: ['This is my focus right now 🎯', 'Still finding the thread 🧭'],
    effortBonusHint: `Add a sentence on how ${chapter.title.toLowerCase()} feels today, and one emotion.`,
  };
}

/** Per-island facet cards derived from the island's Compass activity blocks. */
function buildActivityCards(
  activity: CompassBookActivityDefinition,
  chapter: CompassBookChapterDefinition,
): ReflectionPrompt[] {
  const seenStems = new Set<string>();
  const cards: ReflectionPrompt[] = [];

  for (const block of activity.blocks) {
    if (!CARDABLE_BLOCK_TYPES.has(block.type)) continue;
    const stem = promptStem(block.prompt);
    if (seenStems.has(stem)) continue;
    seenStems.add(stem);

    cards.push({
      id: `${activity.id}.${block.questionId}`,
      title: deriveCardTitle(block),
      prompt: cleanPrompt(block.prompt),
      suggestedType: 'quick',
      category: chapter.title,
      buttonAnswers: deriveButtonAnswers(block),
      effortBonusHint: `Add a sentence about ${activity.shortTitle.toLowerCase()} and one emotion you notice.`,
    });

    if (cards.length >= MAX_ACTIVITY_CARDS) break;
  }

  return cards;
}

/** Deterministic rotation so which cards meet first varies by island. */
function rotate<T>(items: T[], by: number): T[] {
  if (items.length <= 1) return items;
  const offset = ((by % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

/**
 * The ordered check-in cards for an island's Behavior stop. Always returns ≥ 2
 * cards so the composer's elimination tournament always has a real choice.
 */
export function getReflectionCardsForIsland(islandNumber: number): ReflectionPrompt[] {
  const activity = getActivityForIsland(islandNumber);
  if (!activity) {
    // Out of the authored 1..120 range — keep the legacy behaviour.
    return rotate(LEGACY_REFLECTION_PROMPTS, islandNumber);
  }

  const chapter = getChapterDefinition(activity.chapterId);
  const activityCards = buildActivityCards(activity, chapter);
  const cards: ReflectionPrompt[] = [buildChapterCard(chapter), ...activityCards];

  // Safety net: every activity has ≥ 1 block, but if none were cardable we still
  // guarantee a second card so the tournament is never a no-op.
  if (cards.length < 2) {
    cards.push({
      id: `${activity.id}.facet`,
      title: activity.shortTitle,
      prompt: activity.description ?? activity.title,
      suggestedType: 'quick',
      category: chapter.title,
      buttonAnswers: ['That fits today ✅', 'Not quite yet 🤔'],
      effortBonusHint: `Add a sentence about ${activity.shortTitle.toLowerCase()} and one emotion you notice.`,
    });
  }

  return rotate(cards.slice(0, MAX_CARDS_PER_ISLAND), islandNumber);
}
