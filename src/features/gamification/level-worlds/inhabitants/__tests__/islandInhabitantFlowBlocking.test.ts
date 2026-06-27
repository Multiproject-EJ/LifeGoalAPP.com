import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import {
  isIslandInhabitantFlowBlocked,
  mapIslandInhabitantFlowBlockers,
  resolveIslandInhabitantFlowOpeningState,
  type IslandInhabitantFlowBlockers,
  type IslandInhabitantFlowPresentationState,
} from '../islandInhabitantFlowBlocking';

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

const presentationCases: Array<keyof IslandInhabitantFlowPresentationState> = [
  'isHostTopbarMenuOpen',
  'isOverviewCameraMode',
  'isHudExpanded',
  'areCameraControlsVisible',
  'isDebugPanelOpen',
  'isAudioMenuOpen',
];

export const islandInhabitantFlowBlockingTests: TestCase[] = [
  { name: 'inhabitant flow blocker helper allows clear board state', run: () => assertEqual(isIslandInhabitantFlowBlocked({}), false, 'Expected no blockers') },
  { name: 'inhabitant flow blocker helper blocks every declared collision surface', run: () => {
    for (const key of blockerCases) {
      assert(isIslandInhabitantFlowBlocked({ [key]: true }), `Expected ${key} to block inhabitant flow`);
    }
  } },
  { name: 'inhabitant flow blocker helper is pure for falsey blockers', run: () => assertEqual(isIslandInhabitantFlowBlocked(Object.fromEntries(blockerCases.map((key) => [key, false]))), false, 'Expected false blockers not to block') },
  { name: 'caretaker mapping does not block for top-bar menu, overview, HUD, controls, or debug presentation state', run: () => {
    for (const key of presentationCases) {
      const blockers = mapIslandInhabitantFlowBlockers({ [key]: true });
      assertEqual(isIslandInhabitantFlowBlocked(blockers), false, `Expected ${key} to remain presentation-only`);
    }
  } },
  { name: 'caretaker mapping keeps StoryReader and narrative dialogue as real blockers', run: () => {
    assert(isIslandInhabitantFlowBlocked(mapIslandInhabitantFlowBlockers({ isStoryReaderOpen: true })), 'Expected StoryReader to block');
    assert(isIslandInhabitantFlowBlocked(mapIslandInhabitantFlowBlockers({ isNarrativeDialogueOpen: true })), 'Expected narrative dialogue to block');
  } },
  { name: 'caretaker mapping keeps active stop, build, shop, market, sanctuary, and minigame as blockers', run: () => {
    for (const key of ['isActiveStopOpen', 'isBuildOpen', 'isShopOpen', 'isMarketOpen', 'isSanctuaryOpen', 'isMinigameOpen'] as const) {
      assert(isIslandInhabitantFlowBlocked(mapIslandInhabitantFlowBlockers({ [key]: true })), `Expected ${key} to block`);
    }
  } },
  { name: 'caretaker mapping keeps boss, travel, and island-clear surfaces as blockers', run: () => {
    for (const key of ['isBossOpen', 'isTravelOpen', 'isClearCelebrationOpen'] as const) {
      assert(isIslandInhabitantFlowBlocked(mapIslandInhabitantFlowBlockers({ [key]: true })), `Expected ${key} to block`);
    }
  } },
  { name: 'caretaker mapping keeps claim, reveal, purchase, and out-of-dice surfaces as blockers', run: () => {
    for (const key of ['isClaimOpen', 'isHatchRevealOpen', 'isPurchasePromptOpen', 'isOutOfDicePromptOpen', 'isRewardDetailsOpen', 'isPlaceholderOpen'] as const) {
      assert(isIslandInhabitantFlowBlocked(mapIslandInhabitantFlowBlockers({ [key]: true })), `Expected ${key} to block`);
    }
  } },
  { name: 'caretaker mapping keeps board movement and already-open inhabitant flow as blockers', run: () => {
    assert(isIslandInhabitantFlowBlocked(mapIslandInhabitantFlowBlockers({ isBoardMoving: true })), 'Expected board movement to block');
    assert(isIslandInhabitantFlowBlocked(mapIslandInhabitantFlowBlockers({ isInhabitantFlowOpen: true })), 'Expected duplicate inhabitant flow to block');
  } },
  { name: 'caretaker activation closes host menu and queues flow without simultaneous modal ownership', run: () => {
    const opening = resolveIslandInhabitantFlowOpeningState({ isHostTopbarMenuOpen: true });
    assertEqual(opening.isBlocked, false, 'Expected host menu not to block activation');
    assertEqual(opening.shouldCloseHostMenu, true, 'Expected activation to close the host menu first');
    assertEqual(opening.shouldQueueFlowOpen, true, 'Expected activation to queue the inhabitant flow after menu close');
  } },
  { name: 'caretaker activation does not queue opening when a real blocker exists', run: () => {
    const opening = resolveIslandInhabitantFlowOpeningState({ isHostTopbarMenuOpen: true, isStoryReaderOpen: true });
    assertEqual(opening.isBlocked, true, 'Expected StoryReader to block activation');
    assertEqual(opening.shouldCloseHostMenu, false, 'Expected blocked activation not to alter host menu ownership');
    assertEqual(opening.shouldQueueFlowOpen, false, 'Expected blocked activation not to open inhabitant flow');
  } },
];
