import { boardRendererContractV1Fixtures } from '../islandRunBoardRendererContractV1.fixtures';
import { assertBoardRendererContractV1 } from '../islandRunBoardRendererContractV1';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunBoardRendererContractV1Tests: TestCase[] = [
  {
    name: 'fixtures conform to BoardRendererContractV1 shape',
    run: () => {
      Object.values(boardRendererContractV1Fixtures).forEach((fixture) => {
        assertBoardRendererContractV1(fixture);
      });
      assertEqual(Object.keys(boardRendererContractV1Fixtures).length, 6, 'Expected six frozen renderer fixtures.');
    },
  },
  {
    name: 'reward-claimable fixture exposes claim gate as true',
    run: () => {
      assert(boardRendererContractV1Fixtures.rewardClaimable.ui.flags.canClaimReward, 'Expected claimable fixture to expose canClaimReward=true');
    },
  },
  {
    name: 'low-essence fixture disables spend gate',
    run: () => {
      assertEqual(boardRendererContractV1Fixtures.lowEssence.ui.flags.canSpendEssence, false, 'Expected lowEssence fixture canSpendEssence=false');
    },
  },
  {
    name: 'mid-move fixture includes deterministic movement preview',
    run: () => {
      const preview = boardRendererContractV1Fixtures.midMovePreview.token.movementPreview;
      assert(preview, 'Expected movement preview in midMovePreview fixture.');
      assertEqual(preview?.pathTileIndices.join(','), '9,10,11', 'Expected stable movement preview indices for future Spark snapshot tests.');
    },
  },
];
