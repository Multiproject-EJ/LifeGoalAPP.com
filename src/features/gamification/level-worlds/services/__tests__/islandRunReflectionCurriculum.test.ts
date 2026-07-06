/**
 * Tests for the Behavior-stop reflection curriculum adapter. Verifies the
 * check-in cards are now sourced per-island from the Compass Book curriculum
 * (fixing the "same 6 cards forever" repetition) while still always giving the
 * elimination tournament ≥ 2 cards to judge.
 */
import {
  getReflectionCardsForIsland,
  LEGACY_REFLECTION_PROMPTS,
} from '../islandRunReflectionCurriculum';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunReflectionCurriculumTests: TestCase[] = [
  {
    name: 'every authored island (1..120) yields at least two check-in cards',
    run: () => {
      for (let island = 1; island <= 120; island += 1) {
        const cards = getReflectionCardsForIsland(island);
        assert(cards.length >= 2, `island ${island} should have ≥2 cards, got ${cards.length}`);
        assert(cards.length <= 4, `island ${island} should have ≤4 cards, got ${cards.length}`);
      }
    },
  },
  {
    name: 'card ids are unique within an island (no duplicate contenders)',
    run: () => {
      for (let island = 1; island <= 120; island += 1) {
        const ids = getReflectionCardsForIsland(island).map((c) => c.id);
        assertEqual(new Set(ids).size, ids.length, `island ${island} has duplicate card ids`);
      }
    },
  },
  {
    name: 'every card is well-formed (title, prompt, two answers, hint)',
    run: () => {
      for (let island = 1; island <= 120; island += 1) {
        for (const card of getReflectionCardsForIsland(island)) {
          assert(card.title.trim().length > 0, `island ${island} card has empty title`);
          assert(card.prompt.trim().length > 0, `island ${island} card has empty prompt`);
          assert(card.buttonAnswers.length === 2, `island ${island} card needs exactly 2 answers`);
          assert(
            card.buttonAnswers[0].trim().length > 0 && card.buttonAnswers[1].trim().length > 0,
            `island ${island} card has an empty answer`,
          );
          assert(card.effortBonusHint.trim().length > 0, `island ${island} card has empty hint`);
          assert(
            card.prompt.indexOf('(optional)') === -1,
            `island ${island} card prompt should be cleaned of "(optional)"`,
          );
        }
      }
    },
  },
  {
    name: 'content actually varies across islands (not the same 6 cards reshuffled)',
    run: () => {
      // The old bug: island prompts were a rotation of one 6-item pool, so the
      // set of distinct prompts across all islands was tiny. Assert we now see
      // many distinct prompts spanning the six-chapter arc.
      const distinctPrompts = new Set<string>();
      for (let island = 1; island <= 120; island += 1) {
        for (const card of getReflectionCardsForIsland(island)) distinctPrompts.add(card.prompt);
      }
      assert(
        distinctPrompts.size > 60,
        `expected many distinct prompts across 120 islands, got ${distinctPrompts.size}`,
      );
    },
  },
  {
    name: 'chapter theme shifts between chapters (island 1 vs island 41 differ)',
    run: () => {
      const wheel = getReflectionCardsForIsland(1).map((c) => c.category);
      const horizon = getReflectionCardsForIsland(41).map((c) => c.category);
      assert(wheel.includes('The Living Wheel'), 'island 1 should be tagged Living Wheel');
      assert(horizon.includes('The Living Horizon'), 'island 41 should be tagged Living Horizon');
    },
  },
  {
    name: 'a given island is deterministic (same cards each call)',
    run: () => {
      const a = getReflectionCardsForIsland(7).map((c) => c.id).join('|');
      const b = getReflectionCardsForIsland(7).map((c) => c.id).join('|');
      assertEqual(a, b, 'island 7 card set should be stable across calls');
    },
  },
  {
    name: 'out-of-range islands fall back to the legacy prompt pool',
    run: () => {
      const cards = getReflectionCardsForIsland(0);
      assertEqual(cards.length, LEGACY_REFLECTION_PROMPTS.length, 'island 0 falls back to legacy');
      const legacyIds = new Set(LEGACY_REFLECTION_PROMPTS.map((p) => p.id));
      for (const card of cards) {
        assert(legacyIds.has(card.id), `unexpected legacy fallback card id ${card.id}`);
      }
    },
  },
];
