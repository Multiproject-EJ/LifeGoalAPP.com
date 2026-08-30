import {
  createCrownDice,
  createSolarOrreryTargets,
  createTreasuryOrganSequence,
  rerollCrownDice,
  resolvePrismCascade,
  resolveVaultCasinoVirtualCashPayout,
  resolveVaultCasinoGameForClaim,
  resolveVaultCasinoRotation,
  scoreCrownDice,
  scoreSolarOrrery,
  scoreTreasuryOrgan,
  turnCrownDie,
  VAULT_CASINO_CLOSED_LOOP_POLICY,
  VAULT_CASINO_GAME_DEFINITIONS,
  VAULT_CASINO_GAME_IDS,
} from '../islandRunVaultCasino';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunVaultCasinoTests: TestCase[] = [
  {
    name: 'vault casino policy permits in-game cash-out and bounded repeat play',
    run: () => {
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.entrySource, 'island-run-earned', 'Expected Island Run-earned entry');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.rewards, 'virtual-only', 'Expected virtual-only rewards');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.directAttemptPurchaseEnabled, false, 'Expected no direct attempt purchase');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.virtualCashOutEnabled, true, 'Expected virtual cash-out');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.virtualCashOutDestination, 'in-game-cash', 'Expected winnings to enter the game economy');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.realMoneyCashOutEnabled, false, 'Expected no real-money cash-out');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.adjacentMicrotransactions, 'allowed', 'Expected the wider game economy to permit microtransactions');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.repeatPurchasesEnabled, true, 'Expected the wider economy to permit repeat purchases');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.highAggregateSpendPossible, true, 'Expected substantial aggregate spend to be possible');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.externalValueTransferEnabled, false, 'Expected no external value transfer');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.boundedRoundRequired, true, 'Expected every round to remain bounded');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.sessionLoop, 'repeatable-bounded', 'Expected replayable bounded sessions');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.sessionEndRequired, true, 'Expected every casino session to end');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.honestOutcomePresentationRequired, true, 'Expected honest outcome presentation');
      assertEqual(VAULT_CASINO_CLOSED_LOOP_POLICY.automaticSequences, 'bounded-only', 'Expected bounded automatic sequences');
    },
  },
  {
    name: 'vault casino virtual cash-out scales by result and remains in bounded tiers',
    run: () => {
      const standard = resolveVaultCasinoVirtualCashPayout({ tier: 'standard', score: 40, maxScore: 100, summary: 'Standard' });
      const grand = resolveVaultCasinoVirtualCashPayout({ tier: 'grand', score: 70, maxScore: 100, summary: 'Grand' });
      const sovereign = resolveVaultCasinoVirtualCashPayout({ tier: 'sovereign', score: 100, maxScore: 100, summary: 'Sovereign' });
      assertEqual(standard >= 120 && standard <= 300, true, 'Expected standard cash-out within its tier');
      assertEqual(grand >= 500 && grand <= 1_000, true, 'Expected grand cash-out within its tier');
      assertEqual(sovereign, 2_500, 'Expected a perfect sovereign result to reach the tier maximum');
      assertEqual(standard < grand && grand < sovereign, true, 'Expected stronger tiers to cash out more');
    },
  },
  {
    name: 'vault casino catalog exposes five distinct prototype formats',
    run: () => {
      assertEqual(VAULT_CASINO_GAME_DEFINITIONS.length, 5, 'Expected five Vault Casino prototypes');
      assertEqual(new Set(VAULT_CASINO_GAME_IDS).size, 5, 'Expected every game ID to be unique');
      assertEqual(
        new Set(VAULT_CASINO_GAME_DEFINITIONS.map((definition) => definition.format)).size,
        5,
        'Expected five distinct game formats',
      );
    },
  },
  {
    name: 'vault casino rotation is deterministic and permits at most five claims',
    run: () => {
      const islandFour = resolveVaultCasinoRotation(4);
      assertDeepEqual(islandFour, resolveVaultCasinoRotation(4), 'Expected stable rotation for the same island');
      assertEqual(new Set(islandFour).size, 5, 'Expected one occurrence of every prototype in a rotation');
      islandFour.forEach((gameId, claimCount) => {
        assertEqual(
          resolveVaultCasinoGameForClaim({ effectiveIslandNumber: 4, claimCount }),
          gameId,
          `Expected claim ${claimCount + 1} to resolve to its rotation game`,
        );
      });
      assertEqual(
        resolveVaultCasinoGameForClaim({ effectiveIslandNumber: 4, claimCount: 5 }),
        null,
        'Expected no sixth game claim',
      );
    },
  },
  {
    name: 'crown dice is deterministic, bounded, and preserves held dice',
    run: () => {
      const dice = createCrownDice(41);
      assertDeepEqual(dice, createCrownDice(41), 'Expected seeded dice to be deterministic');
      assertEqual(dice.every((value) => value >= 1 && value <= 6), true, 'Expected ordinary six-sided dice');
      assertEqual(new Set(dice).size > 1, true, 'Expected the opening hand to contain visual variety');
      const rerolled = rerollCrownDice({ dice, heldIndices: [0, 3], seed: 41, rerollIndex: 1 });
      assertEqual(rerolled[0], dice[0], 'Expected first held die to remain unchanged');
      assertEqual(rerolled[3], dice[3], 'Expected second held die to remain unchanged');
      assertEqual(turnCrownDie([1, 2, 3, 4, 6], 4)[4], 1, 'Expected crown turn to wrap six to one');
      assertEqual(scoreCrownDice([6, 6, 6, 6, 6]).score, 100, 'Expected five matching jewels to score the maximum');
    },
  },
  {
    name: 'solar orrery scores exact seeded alignment as sovereign',
    run: () => {
      const targets = createSolarOrreryTargets(73);
      const result = scoreSolarOrrery(targets, targets);
      assertEqual(result.score, 100, 'Expected exact alignment to score 100');
      assertEqual(result.tier, 'sovereign', 'Expected exact alignment to earn sovereign tier');
    },
  },
  {
    name: 'prism cascade is deterministic and keeps every route inside its seven lanes',
    run: () => {
      const first = resolvePrismCascade(19, [-1, 1, 0]);
      const second = resolvePrismCascade(19, [-1, 1, 0]);
      assertDeepEqual(first, second, 'Expected the same mirrors and seed to make the same route');
      assertEqual(first.lanes.every((lane) => lane >= -3 && lane <= 3), true, 'Expected every crystal lane to stay in bounds');
      assertEqual(first.result.score >= 20 && first.result.score <= 100, true, 'Expected a bounded result score');
    },
  },
  {
    name: 'treasury organ uses a short deterministic sequence and exact answers score fully',
    run: () => {
      const sequence = createTreasuryOrganSequence(29);
      assertEqual(sequence.length, 5, 'Expected a five-note default sequence');
      assertDeepEqual(sequence, createTreasuryOrganSequence(29), 'Expected the same seed to repeat the sequence');
      assertEqual(sequence.every((note) => note >= 0 && note <= 4), true, 'Expected notes to address the five pipes');
      const result = scoreTreasuryOrgan(sequence, sequence);
      assertEqual(result.score, result.maxScore, 'Expected an exact answer to score fully');
      assertEqual(result.tier, 'sovereign', 'Expected an exact answer to earn sovereign tier');
    },
  },
];
