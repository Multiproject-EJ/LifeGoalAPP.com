import { buildDualTrackOverlayViewModel } from '../dualTrackOverlayAdapter';
import { assert, assertEqual, type TestCase } from './testHarness';

export const dualTrackOverlayAdapterTests: TestCase[] = [
  {
    name: 'returns placeholder-safe real life ladder with shared card states',
    run: () => {
      const viewModel = buildDualTrackOverlayViewModel({ islandNumber: 4, rewardBarProgress: 3, rewardBarThreshold: 10 });

      assertEqual(viewModel.title, 'My Quest & Game Progress', 'Expected updated overlay title');
      assertEqual(viewModel.realLifeTrack.length, 5, 'Expected five real-life placeholder cards');
      assertEqual(viewModel.realLifeTrack[0].position, 'achieved', 'Expected first real-life card to be achieved');
      assertEqual(viewModel.realLifeTrack[2].position, 'current', 'Expected third real-life card to be current');
      assertEqual(viewModel.realLifeTrack[3].position, 'next', 'Expected fourth real-life card to be next');
      assertEqual(viewModel.realLifeTrack[4].position, 'locked', 'Expected fifth real-life card to be locked');
      assertEqual(viewModel.realLifeTrack[4].icon, '?', 'Expected locked real-life card to hide details behind question mark');
      assert(viewModel.realLifeTrack.every((card) => card.track === 'real_life'), 'Expected all real-life cards to be tagged real_life');
    },
  },
  {
    name: 'derives game ladder from current island without invalid future labels',
    run: () => {
      const viewModel = buildDualTrackOverlayViewModel({
        islandNumber: 120,
        islandDisplayName: 'Final Horizon',
        rewardBarProgress: 9,
        rewardBarThreshold: 10,
      });

      assertEqual(viewModel.gameTrack[0].title, 'Island 119', 'Expected previous island card for island 120');
      assertEqual(viewModel.gameTrack[1].title, 'Island 120', 'Expected current island card for island 120');
      assertEqual(viewModel.gameTrack[1].subtitle, 'Final Horizon', 'Expected supplied current island display name');
      assertEqual(viewModel.gameTrack[1].progressLabel, '90% current progress', 'Expected current island progress label');
      assertEqual(viewModel.gameTrack.some((card) => card.title === 'Island 121'), false, 'Expected no invalid island 121 card');
      assertEqual(viewModel.gameTrack[viewModel.gameTrack.length - 1]?.position, 'locked', 'Expected final card to remain a locked future placeholder');
    },
  },
  {
    name: 'clamps invalid island and progress inputs safely',
    run: () => {
      const viewModel = buildDualTrackOverlayViewModel({ islandNumber: -8, rewardBarProgress: 500, rewardBarThreshold: 100 });

      assertEqual(viewModel.gameTrack[1].title, 'Island 1', 'Expected invalid island number to clamp to island 1');
      assertEqual(viewModel.gameTrack[1].progressLabel, '100% current progress', 'Expected progress to clamp to 100%');
      assertEqual(viewModel.centerSpine.progressPercent, 100, 'Expected center spine progress to clamp to 100%');
    },
  },
];
