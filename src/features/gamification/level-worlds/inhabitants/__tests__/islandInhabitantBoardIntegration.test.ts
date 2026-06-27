// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from '../../services/__tests__/testHarness';

const boardSource = readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');

function includes(expected: string) { assert(boardSource.includes(expected), `Missing ${expected}`); }
function notIncludes(forbidden: string) { assert(!boardSource.includes(forbidden), `Forbidden ${forbidden}`); }

export const islandInhabitantBoardIntegrationTests: TestCase[] = [
  { name: 'board integrates one Island 1 Talk to Caretaker topbar menu action', run: () => {
    includes('runtimeState.currentIslandNumber === 1');
    includes('Talk to Caretaker');
    includes('island-run-board__topbar-menu-item--caretaker');
    includes('type="button"');
    includes('aria-label="Talk to Caretaker"');
  } },
  { name: 'board resolves caretaker content through registries at runtime', run: () => {
    includes("getIslandInhabitantDefinition('luma-caretaker')");
    includes("getIslandInhabitantTopics(1, 'luma-caretaker')");
    includes('getIslandConversationDefinition(topic.conversationId)');
    includes('caretakerConversations.length === caretakerTopics.length');
  } },
  { name: 'board gates caretaker flow with pure collision helper', run: () => {
    includes('mapIslandInhabitantFlowBlockers({');
    ['isStoryReaderOpen', 'isNarrativeDialogueOpen', 'isActiveStopOpen', 'isBuildOpen', 'isShopOpen', 'isMarketOpen', 'isSanctuaryOpen', 'isMinigameOpen', 'isBossOpen', 'isTravelOpen', 'isClearCelebrationOpen', 'isClaimOpen', 'isPurchasePromptOpen', 'isOutOfDicePromptOpen', 'isBoardMoving', 'isInhabitantFlowOpen'].forEach(includes);
    includes('Caretaker is unavailable while another island activity is open.');
  } },
  { name: 'board opens and closes IslandInhabitantFlow presentation-only', run: () => {
    includes('<IslandInhabitantFlow');
    includes('setIsCaretakerFlowOpenPending(true)');
    includes('setIsIslandInhabitantFlowOpen(true)');
    includes('setIsIslandInhabitantFlowOpen(false)');
    includes("closeReason === 'missing_content'");
    includes('The island has been listening for footsteps like yours.');
    includes('backgroundArtSrc={resolvedCaretakerBackgroundArtSrc}');
  } },
  { name: 'board integration does not add prohibited automatic or persistence behavior', run: () => {
    ['localStorage.setItem(\'island_inhabitant', 'sessionStorage.setItem(\'island_inhabitant', 'autoOpenCaretaker', 'completeCaretaker', 'rewardCaretaker', 'persistIslandRunRuntimeStatePatch({ caretaker'].forEach(notIncludes);
  } },
];
