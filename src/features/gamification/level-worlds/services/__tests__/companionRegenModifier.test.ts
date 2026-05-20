import type { ArchetypeHand, HandCard } from '../../../../identity/archetypes/archetypeHandBuilder';
import type { CreatureCollectionRuntimeEntry, IslandRunGameStateRecord } from '../islandRunGameStateStore';
import {
  capCompanionRegenBoostPct,
  PHASE_1_COMPANION_REGEN_BOOST_CAP_PCT,
  resolveCompanionRegenModifier,
  resolveEffectiveRegenIntervalMs,
} from '../companionRegenModifier';
import { PERSONALITY_QUESTION_BANK } from '../../../../identity/personalityTestData';
import { assertEqual, type TestCase } from './testHarness';

function collectionEntry(
  creatureId: string,
  overrides: Partial<CreatureCollectionRuntimeEntry> = {},
): CreatureCollectionRuntimeEntry {
  return {
    creatureId,
    copies: 1,
    firstCollectedAtMs: 0,
    lastCollectedAtMs: 0,
    lastCollectedIslandNumber: 1,
    bondXp: 0,
    bondLevel: 1,
    lastFedAtMs: null,
    claimedBondMilestones: [],
    ...overrides,
  };
}

function record(
  activeCompanionId: string | null,
  creatureCollection: CreatureCollectionRuntimeEntry[] = [],
): Pick<IslandRunGameStateRecord, 'activeCompanionId' | 'creatureCollection'> {
  return {
    activeCompanionId,
    creatureCollection,
  };
}

function handCard(id: string, role: HandCard['role']): HandCard {
  return {
    card: {
      id,
      name: id,
      suit: 'mind',
      icon: '',
      color: '',
      traitWeights: {},
      drive: '',
      orientation: 'inward',
      timeFocus: 'present',
      riskTolerance: 'moderate',
      strengths: [],
      weaknesses: [],
      stressBehavior: '',
      growthStrategy: '',
    },
    score: 1,
    role,
    level: role === 'shadow' ? 0 : 1,
  };
}

function completeAnswers(): Record<string, number> {
  return Object.fromEntries(PERSONALITY_QUESTION_BANK.map((question) => [question.id, 3]));
}

function completeHand(): ArchetypeHand {
  return {
    dominant: handCard('builder', 'dominant'),
    secondary: handCard('guardian', 'secondary'),
    supports: [handCard('caregiver', 'support'), handCard('explorer', 'support')],
    shadow: handCard('rebel', 'shadow'),
  };
}

export const companionRegenModifierTests: TestCase[] = [
  {
    name: 'no companion resolves to no regen bonus',
    run: () => {
      const modifier = resolveCompanionRegenModifier({ record: record(null) });
      assertEqual(modifier.cappedBoostPct, 0, 'Expected no boost without an active companion');
      assertEqual(modifier.isOwned, false, 'Expected no owned companion');
    },
  },
  {
    name: 'unowned or stale active companion resolves to no regen bonus',
    run: () => {
      const modifier = resolveCompanionRegenModifier({
        record: record('common-sproutling', [collectionEntry('rare-luma-hatchling')]),
      });
      assertEqual(modifier.cappedBoostPct, 0, 'Expected no boost for unowned active companion');
      assertEqual(modifier.activeCompanionId, null, 'Expected stale companion to be ignored safely');
    },
  },
  {
    name: 'owned common companion receives Phase 1 rarity regen bonus',
    run: () => {
      const modifier = resolveCompanionRegenModifier({
        record: record('common-sproutling', [collectionEntry('common-sproutling')]),
      });
      assertEqual(modifier.cappedBoostPct, 0.02, 'Expected common companion 2% boost');
      assertEqual(modifier.matchPct, 0, 'Expected no match boost without complete questionnaire');
    },
  },
  {
    name: 'owned rare companion receives Phase 1 rarity regen bonus',
    run: () => {
      const modifier = resolveCompanionRegenModifier({
        record: record('rare-luma-hatchling', [collectionEntry('rare-luma-hatchling')]),
      });
      assertEqual(modifier.cappedBoostPct, 0.03, 'Expected rare companion 3% boost');
    },
  },
  {
    name: 'owned mythic companion receives Phase 1 rarity regen bonus',
    run: () => {
      const modifier = resolveCompanionRegenModifier({
        record: record('mythic-starhorn-seraph', [collectionEntry('mythic-starhorn-seraph')]),
      });
      assertEqual(modifier.cappedBoostPct, 0.04, 'Expected mythic companion 4% boost');
    },
  },
  {
    name: 'Phase 1 regen boost cap is enforced',
    run: () => {
      assertEqual(
        capCompanionRegenBoostPct(0.25),
        PHASE_1_COMPANION_REGEN_BOOST_CAP_PCT,
        'Expected cap to clamp oversized boosts to 10%',
      );
      assertEqual(
        resolveEffectiveRegenIntervalMs({ baseRegenIntervalMs: 480_000, companionBoostPct: 0.25 }),
        432_000,
        'Expected capped 10% interval reduction',
      );
    },
  },
  {
    name: 'incomplete archetype questionnaire gates match bonus but keeps owned base companion bonus',
    run: () => {
      const modifier = resolveCompanionRegenModifier({
        record: record('common-sproutling', [collectionEntry('common-sproutling')]),
        personalityContext: {
          answers: { [PERSONALITY_QUESTION_BANK[0]!.id]: 3 },
          archetypeHand: completeHand(),
        },
      });
      assertEqual(modifier.rarityPct, 0.02, 'Expected safe owned base rarity boost');
      assertEqual(modifier.matchPct, 0, 'Expected no match boost for incomplete questionnaire');
      assertEqual(modifier.cappedBoostPct, 0.02, 'Expected only base rarity boost');
    },
  },
  {
    name: 'complete dominant archetype match adds gated match bonus',
    run: () => {
      const modifier = resolveCompanionRegenModifier({
        record: record('common-sproutling', [collectionEntry('common-sproutling')]),
        personalityContext: {
          answers: completeAnswers(),
          archetypeHand: completeHand(),
        },
      });
      assertEqual(modifier.matchPct, 0.02, 'Expected dominant affinity match boost');
      assertEqual(modifier.cappedBoostPct, 0.04, 'Expected rarity plus dominant match boost');
    },
  },
];
