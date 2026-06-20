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
      assertEqual(viewModel.gameTrack.some((card) => card.position === 'next'), false, 'Expected no next card past the final island');
      assertEqual(viewModel.gameTrack[viewModel.gameTrack.length - 1]?.position, 'locked', 'Expected final card to remain a locked future placeholder');
    },
  },
  {
    name: 'clamps invalid island and progress inputs safely',
    run: () => {
      const viewModel = buildDualTrackOverlayViewModel({ islandNumber: -8, rewardBarProgress: 500, rewardBarThreshold: 100 });

      assertEqual(viewModel.gameTrack[1].title, 'Island 1', 'Expected invalid island number to clamp to island 1');
      assertEqual(viewModel.gameTrack[1].progressLabel, '100% current progress', 'Expected progress to clamp to 100%');
      assert(
        viewModel.centerSpine.progressPercent >= 0 && viewModel.centerSpine.progressPercent <= 100,
        'Expected center spine journey progress to stay within 0..100',
      );
    },
  },
  {
    name: 'surfaces a read-only Combined Journey Level summary on the spine',
    run: () => {
      const fresh = buildDualTrackOverlayViewModel({ islandNumber: 1, rewardBarProgress: 0, rewardBarThreshold: 10 });
      assertEqual(fresh.journeyLevel.level, 1, 'Expected a fresh journey to start at level 1');
      assertEqual(fresh.journeyLevel.nextThresholdLevel, 2, 'Expected the next chest threshold to be level 2');
      assertEqual(fresh.centerSpine.label, 'Lv 1', 'Expected the spine label to show the journey level');
      assertEqual(fresh.journeyLevel.nextChestLabel, 'Next chest at Lv 2', 'Expected a next-chest caption');

      const progressed = buildDualTrackOverlayViewModel({
        islandNumber: 8,
        rewardBarProgress: 5,
        rewardBarThreshold: 10,
        realLife: {
          isAuthenticated: true,
          goals: [
            { id: 'g1', title: 'Run a 5k', status: 'completed' },
            { id: 'g2', title: 'Read 12 books', status: 'active' },
          ],
          habits: [{ id: 'h1', title: 'Meditate' }],
        },
      });
      assert(progressed.journeyLevel.level > fresh.journeyLevel.level, 'Expected real progress to raise the journey level');
      assertEqual(
        progressed.centerSpine.label,
        `Lv ${progressed.journeyLevel.level}`,
        'Expected spine label to track the derived level',
      );
    },
  },
  {
    name: 'exposes gallery island numbers for concrete game cards only',
    run: () => {
      const viewModel = buildDualTrackOverlayViewModel({ islandNumber: 5, rewardBarProgress: 2, rewardBarThreshold: 10 });

      const achieved = viewModel.gameTrack.find((card) => card.position === 'achieved');
      const current = viewModel.gameTrack.find((card) => card.position === 'current');
      const next = viewModel.gameTrack.find((card) => card.position === 'next');
      const locked = viewModel.gameTrack.find((card) => card.position === 'locked');

      assertEqual(achieved?.islandNumber, 4, 'Expected achieved card to expose previous island number');
      assertEqual(current?.islandNumber, 5, 'Expected current card to expose current island number');
      assertEqual(next?.islandNumber, 6, 'Expected next card to expose next island number');
      assertEqual(locked?.islandNumber, undefined, 'Expected locked future card to stay a mystery without an island number');
      assertEqual(current?.rewardPreviewLabel, 'Exploring now', 'Expected collectible current reward copy');
      assertEqual(achieved?.rewardPreviewLabel, 'Collected', 'Expected collectible achieved reward copy');
    },
  },
  {
    name: 'summarizes display-only gallery progress for the game track',
    run: () => {
      const start = buildDualTrackOverlayViewModel({ islandNumber: 1 });
      assertEqual(start.gameProgress.currentIsland, 1, 'Expected current island in gallery summary');
      assertEqual(start.gameProgress.collectedCount, 0, 'Expected zero collected islands at the start');
      assertEqual(start.gameProgress.totalCount, 120, 'Expected total island count in gallery summary');
      assertEqual(start.gameTrack[0].islandNumber, undefined, 'Expected the first-run foundation card to have no island number');

      const mid = buildDualTrackOverlayViewModel({ islandNumber: 12 });
      assertEqual(mid.gameProgress.collectedCount, 11, 'Expected collected count to trail the current island');
    },
  },
  {
    name: 'keeps real-life placeholders when unauthenticated or without data',
    run: () => {
      const unauth = buildDualTrackOverlayViewModel({
        realLife: { isAuthenticated: false, goals: [{ id: 'g1', title: 'Run a marathon' }] },
      });
      assertEqual(unauth.realLifeTrack.length, 5, 'Expected placeholder ladder when unauthenticated');
      assertEqual(unauth.realLifeProgress.source, 'placeholder', 'Expected placeholder source when unauthenticated');

      const emptyAuth = buildDualTrackOverlayViewModel({
        realLife: { isAuthenticated: true, goals: [], habits: [] },
      });
      assertEqual(emptyAuth.realLifeTrack.length, 5, 'Expected placeholder ladder when authenticated but empty');
      assertEqual(emptyAuth.realLifeProgress.source, 'placeholder', 'Expected placeholder source when authenticated but empty');
    },
  },
  {
    name: 'maps authenticated goals and habits into the real-life ladder',
    run: () => {
      const viewModel = buildDualTrackOverlayViewModel({
        realLife: {
          isAuthenticated: true,
          goals: [
            { id: 'g1', title: 'Finished launch', status: 'completed' },
            { id: 'g2', title: 'Ship the app', status: 'active' },
            { id: 'g3', title: 'Grow the team', status: 'in_progress' },
          ],
          habits: [{ id: 'h1', title: 'Morning run', emoji: '🏃' }],
        },
      });

      const achieved = viewModel.realLifeTrack.find((card) => card.position === 'achieved');
      const current = viewModel.realLifeTrack.find((card) => card.position === 'current');
      const next = viewModel.realLifeTrack.find((card) => card.position === 'next');
      const locked = viewModel.realLifeTrack.find((card) => card.position === 'locked');

      assertEqual(achieved?.title, 'Finished launch', 'Expected completed goal as achieved card');
      assertEqual(achieved?.source, 'goal', 'Expected achieved card sourced from goal data');
      assertEqual(current?.title, 'Ship the app', 'Expected first active goal as current focus');
      assertEqual(next?.title, 'Grow the team', 'Expected second active goal as next milestone');
      assertEqual(locked?.icon, '?', 'Expected locked future to stay a mystery');
      assertEqual(viewModel.realLifeProgress.source, 'data', 'Expected data source when goals/habits exist');
      assertEqual(viewModel.realLifeProgress.goalCount, 3, 'Expected goal count in real-life summary');
      assertEqual(viewModel.realLifeProgress.habitCount, 1, 'Expected habit count in real-life summary');
    },
  },
  {
    name: 'falls back to habit foundation when only habits exist',
    run: () => {
      const viewModel = buildDualTrackOverlayViewModel({
        realLife: {
          isAuthenticated: true,
          goals: [],
          habits: [
            { id: 'h1', title: 'Morning run' },
            { id: 'h2', title: 'Read 10 pages' },
          ],
        },
      });

      const achieved = viewModel.realLifeTrack.find((card) => card.position === 'achieved');
      const current = viewModel.realLifeTrack.find((card) => card.position === 'current');

      assertEqual(achieved?.source, 'habit', 'Expected habit-based achieved card without goals');
      assertEqual(current?.title, 'Daily Habits', 'Expected habit focus as current card without active goals');
      assertEqual(viewModel.realLifeProgress.source, 'data', 'Expected data source when habits exist');
    },
  },
];
