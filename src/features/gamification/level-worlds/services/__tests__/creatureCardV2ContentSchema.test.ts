import {
  listCreatureCardV2ContentIssues,
  normalizeCreatureCardV2ContentDraft,
  validateCreatureCardV2ContentDraft,
} from '../creatureCardV2ContentSchema';
import { assert, assertEqual, type TestCase } from './testHarness';

export const creatureCardV2ContentSchemaTests: TestCase[] = [
  {
    name: 'valid minimal draft passes validation without runtime state dependencies',
    run: () => {
      const draft = {
        creatureId: 'common-sproutling',
      };
      assertEqual(validateCreatureCardV2ContentDraft(draft), true, 'minimal valid draft should pass');
      assertEqual(listCreatureCardV2ContentIssues(draft).length, 0, 'valid draft should not produce issues');
    },
  },
  {
    name: 'empty and unknown creatureId are flagged',
    run: () => {
      const missing = listCreatureCardV2ContentIssues({ creatureId: '   ' });
      assert(missing.some((issue) => issue.code === 'missing_creature_id'), 'empty creatureId should be flagged as missing');

      const unknown = listCreatureCardV2ContentIssues({ creatureId: 'unknown_creature' });
      assert(unknown.some((issue) => issue.code === 'unknown_creature_id'), 'unknown creatureId should be flagged');
    },
  },
  {
    name: 'duplicate variant ids are flagged',
    run: () => {
      const issues = listCreatureCardV2ContentIssues({
        creatureId: 'common-sproutling',
        variants: [
          { variantId: 'spring_2026', editionType: 'seasonal' },
          { variantId: 'spring_2026', editionType: 'promo' },
        ],
      });
      assert(issues.some((issue) => issue.code === 'duplicate_variant_id'), 'duplicate variantId should be flagged');
    },
  },
  {
    name: 'empty ability names and descriptions are flagged',
    run: () => {
      const issues = listCreatureCardV2ContentIssues({
        creatureId: 'common-sproutling',
        abilities: [
          { id: 'a1', name: '   ', description: '   ' },
        ],
      });
      assert(issues.some((issue) => issue.code === 'empty_ability_name'), 'empty ability name should be flagged');
      assert(issues.some((issue) => issue.code === 'empty_ability_description'), 'empty ability description should be flagged');
    },
  },
  {
    name: 'empty strengths/weaknesses are normalized away consistently',
    run: () => {
      const normalized = normalizeCreatureCardV2ContentDraft({
        creatureId: 'common-sproutling',
        tags: {
          strengths: ['  ', '', 'speed'],
          weaknesses: [' ', ''],
        },
      });

      assertEqual(normalized.tags?.strengths?.length, 1, 'only non-empty strengths should remain after normalization');
      assertEqual(normalized.tags?.strengths?.[0], 'speed', 'strength value should be preserved after trim');
      assertEqual(normalized.tags?.weaknesses, undefined, 'all-empty weaknesses should normalize to undefined');
    },
  },
];
