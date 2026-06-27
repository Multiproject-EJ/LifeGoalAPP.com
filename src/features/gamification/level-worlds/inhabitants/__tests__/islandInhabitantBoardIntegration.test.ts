// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from '../../services/__tests__/testHarness';

const boardSource = readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');

function includes(expected: string) { assert(boardSource.includes(expected), `Missing ${expected}`); }
function notIncludes(forbidden: string) { assert(!boardSource.includes(forbidden), `Forbidden ${forbidden}`); }

export const islandInhabitantBoardIntegrationTests: TestCase[] = [
  { name: 'board integrates Island 1 Caretaker as an automatic top-ring tile encounter and dev-only manual action', run: () => {
    includes('runtimeState.currentIslandNumber === 1');
    includes('const ISLAND_ONE_CARETAKER_TILE_INDEX = 0;');
    includes('rollResult.hopSequence.includes(ISLAND_ONE_CARETAKER_TILE_INDEX)');
    includes("openCaretakerFlow('caretaker_tile_pass')");
    includes("openCaretakerFlow('dev_hud')");
    includes('🧙 Talk to Caretaker');
    notIncludes('island-run-board__topbar-menu-item--caretaker');
  } },
  { name: 'board resolves caretaker content through registries at runtime', run: () => {
    includes("getIslandInhabitantDefinition('luma-caretaker')");
    includes("getIslandInhabitantTopics(1, 'luma-caretaker')");
    includes('getIslandConversationDefinition(topic.conversationId)');
    includes('caretakerConversations.length === caretakerTopics.length');
  } },
  { name: 'board caretaker flow no longer uses collision blockers', run: () => {
    notIncludes('mapIslandInhabitantFlowBlockers({');
    notIncludes('isIslandInhabitantFlowBlocked(caretakerFlowBlockers)');
    notIncludes('Caretaker is unavailable while another island activity is open.');
    includes('setIsIslandInhabitantFlowOpen(true)');
  } },
  { name: 'board keeps existing egg-ready topbar cleanup separate from caretaker activation', run: () => {
    includes('if (!showTopbarMenu || !showEggReadyBanner) return;');
    includes('setShowEggReadyBanner(false);');
  } },
  { name: 'board opens and closes IslandInhabitantFlow presentation-only', run: () => {
    includes('<IslandInhabitantFlow');
    includes('setIsIslandInhabitantFlowOpen(true)');
    includes('setIsIslandInhabitantFlowOpen(false)');
    includes("closeReason === 'missing_content'");
    includes('The island has been listening for footsteps like yours.');
    includes('backgroundArtSrc={resolvedCaretakerBackgroundArtSrc}');
  } },
  { name: 'board integration does not add prohibited automatic or persistence behavior', run: () => {
    ['localStorage.setItem(\'island_inhabitant', 'sessionStorage.setItem(\'island_inhabitant', 'completeCaretaker', 'rewardCaretaker', 'persistIslandRunRuntimeStatePatch({ caretaker'].forEach(notIncludes);
  } },
];
