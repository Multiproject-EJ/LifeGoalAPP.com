// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from '../../services/__tests__/testHarness';

const boardSource = readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');

function includes(expected: string) { assert(boardSource.includes(expected), `Missing ${expected}`); }
function notIncludes(forbidden: string) { assert(!boardSource.includes(forbidden), `Forbidden ${forbidden}`); }

export const islandInhabitantBoardIntegrationTests: TestCase[] = [
  { name: 'board integrates the island Caretaker as an automatic tile encounter and dev-only manual action on every island', run: () => {
    includes('const ISLAND_CARETAKER_TILE_INDEX = 0;');
    includes('currentIndex === ISLAND_CARETAKER_TILE_INDEX');
    includes('hasIslandCaretakerConcordContent(runtimeStateRef.current.currentIslandNumber)');
    includes("openCaretakerFlow('caretaker_tile_land')");
    includes("openCaretakerFlow('caretaker_board_tap')");
    includes("openCaretakerFlow('dev_hud')");
    includes('caretakerTileIndex={shouldShowCaretakerTalkAction ? ISLAND_CARETAKER_TILE_INDEX : null}');
    includes('caretakerBubbleText={caretakerBoardBubbleText}');
    includes('🧙 Talk to Caretaker');
    notIncludes('island-run-board__topbar-menu-item--caretaker');
    notIncludes('ISLAND_ONE_CARETAKER_TILE_INDEX');
  } },
  { name: 'board resolves caretaker Concord content per current island at runtime', run: () => {
    includes('getIslandCaretakerConcordContent(runtimeState.currentIslandNumber)');
    includes('caretakerConversations.length === caretakerTopics.length');
    includes('islandName={caretakerConcordContent?.islandName}');
    includes('islandStatusLabel={caretakerInhabitant.civilizationName}');
    notIncludes("getIslandInhabitantDefinition('luma-caretaker')");
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
    includes('setCaretakerBoardBubbleText(preConcordMessage)');
    includes('backgroundArtSrc={resolvedCaretakerBackgroundArtSrc}');
  } },
  { name: 'board integration does not add prohibited automatic or persistence behavior', run: () => {
    ['localStorage.setItem(\'island_inhabitant', 'sessionStorage.setItem(\'island_inhabitant', 'completeCaretaker', 'rewardCaretaker', 'persistIslandRunRuntimeStatePatch({ caretaker'].forEach(notIncludes);
  } },
];
