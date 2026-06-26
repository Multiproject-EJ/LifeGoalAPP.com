import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import { isIslandInhabitantFlowBlocked, type IslandInhabitantFlowBlockers } from '../islandInhabitantFlowBlocking';

const blockerCases: Array<keyof IslandInhabitantFlowBlockers> = [
  'isStoryReaderOpen',
  'isNarrativeDialogueOpen',
  'isActiveStopOpen',
  'isBuildOpen',
  'isShopOpen',
  'isMarketOpen',
  'isSanctuaryOpen',
  'isMinigameOpen',
  'isBossOpen',
  'isTravelOpen',
  'isClearCelebrationOpen',
  'isClaimOpen',
  'isHatchRevealOpen',
  'isPurchasePromptOpen',
  'isOutOfDicePromptOpen',
  'isRewardDetailsOpen',
  'isPlaceholderOpen',
  'isBoardMoving',
  'isInhabitantFlowOpen',
  'isOtherModalOpen',
];

export const islandInhabitantFlowBlockingTests: TestCase[] = [
  { name: 'inhabitant flow blocker helper allows clear board state', run: () => assertEqual(isIslandInhabitantFlowBlocked({}), false, 'Expected no blockers') },
  { name: 'inhabitant flow blocker helper blocks every declared collision surface', run: () => {
    for (const key of blockerCases) {
      assert(isIslandInhabitantFlowBlocked({ [key]: true }), `Expected ${key} to block inhabitant flow`);
    }
  } },
  { name: 'inhabitant flow blocker helper is pure for falsey blockers', run: () => assertEqual(isIslandInhabitantFlowBlocked(Object.fromEntries(blockerCases.map((key) => [key, false]))), false, 'Expected false blockers not to block') },
];
