import {
  deriveBuildModalV2ViewModel,
  resolveBuildLevelCompletionPresentation,
  resolveBuildModalV2LandmarkArt,
} from '../islandRunBuildModalV2ViewModel';
import { normalizeIslandArtManifest, type IslandArtManifest } from '../islandArtManifest';
import type { IslandRunContractV2BuildState } from '../islandRunContractV2EssenceBuild';
import { assert, assertEqual, type TestCase } from './testHarness';

const build = (buildLevel: number, spentEssence = 0, requiredEssence = 50): IslandRunContractV2BuildState => ({ buildLevel, spentEssence, requiredEssence });
const stopPlan = [
  { stopId: 'hatchery', title: 'Hatchery' },
  { stopId: 'habit', title: 'Habit' },
  { stopId: 'mystery', title: 'Mystery' },
  { stopId: 'wisdom', title: 'Wisdom' },
  { stopId: 'boss', title: 'Boss' },
] as const;

function vm(
  states: IslandRunContractV2BuildState[],
  essenceAvailable = 999,
  islandArtManifest: IslandArtManifest | null = null,
  discountRate = 0,
) {
  return deriveBuildModalV2ViewModel({
    stopBuildStateByIndex: states,
    islandStopPlan: stopPlan,
    essenceAvailable,
    islandArtManifest,
    discountRate,
  });
}

const manifest = normalizeIslandArtManifest({
  version: 2,
  coordinateSpace: { width: 1000, height: 1000 },
  landmarks: [{ stopIndex: 0, x: 1, y: 1, width: 10, height: 10, levels: ['hatchery-l1.webp'] }],
  scenery: [{ id: 'battle-center', src: 'arena.webp', x: 1, y: 1, width: 10, height: 10 }],
  boss: { id: 'boss', images: { idle: 'boss.webp', defeated: 'defeated.webp' } },
}, 1)!;

export const islandRunBuildModalV2ViewModelTests: TestCase[] = [
  {
    name: 'level completion presentation only appears when a landmark advances',
    run: () => {
      assertEqual(resolveBuildLevelCompletionPresentation({ title: 'Hatchery', previousBuildLevel: 0, nextBuildLevel: 0 }), null, 'Partial funding should not celebrate a level');
      const upgraded = resolveBuildLevelCompletionPresentation({ title: 'Hatchery', previousBuildLevel: 0, nextBuildLevel: 1 });
      assertEqual(upgraded?.heading, 'Hatchery · Level 1', 'Level completion should name the completed level concisely');
      assertEqual(upgraded?.body, 'Level 2 is ready.', 'Level completion should make the next action obvious');
      assertEqual(upgraded?.isFullyBuilt, false, 'Level 1 should not be reported as fully built');
      const restored = resolveBuildLevelCompletionPresentation({ title: 'Hatchery', previousBuildLevel: 2, nextBuildLevel: 3 });
      assertEqual(restored?.heading, 'Hatchery restored', 'Final level should use the full restoration message');
      assertEqual(restored?.isFullyBuilt, true, 'Level 3 should be reported as fully built');
    },
  },
  {
    name: 'focused view model resolves sequential active landmark states',
    run: () => {
      assertEqual(vm([build(0), build(0), build(0), build(0), build(0)]).activeLandmark?.title, 'Hatchery', 'Fresh island should focus Hatchery');
      assertEqual(vm([build(1), build(0), build(0), build(0), build(0)]).activeLandmark?.targetLevel, 2, 'Hatchery L1 complete should focus Hatchery L2');
      assertEqual(vm([build(1), build(1), build(1), build(1), build(1)]).activeLandmark?.targetLevel, 2, 'All L1 complete should focus the first missing L2');
      assertEqual(vm([build(3), build(3), build(0), build(3), build(3)]).activeLandmark?.stopIndex, 2, 'Uneven state should pick earliest missing landmark target');
      assertEqual(vm([build(3), build(3), build(3), build(3), build(3)]).sequentialBuildView.isFullyBuilt, true, 'Fully built state should be complete');
    },
  },
  {
    name: 'parts expose five controls with complete active locked status and actual next tap cost',
    run: () => {
      const view = vm([build(0, 20, 100), build(0), build(0), build(0), build(0)], 20);
      assertEqual(view.parts.length, 5, 'Incomplete target should render five part controls');
      assertEqual(view.parts[0].status, 'complete', 'Part 1 should be complete at first threshold');
      assertEqual(view.parts[1].status, 'active', 'Exactly next unfinished part should be active');
      assertEqual(view.parts.filter((part) => part.status === 'active').length, 1, 'Exactly one part should be active');
      assertEqual(view.parts[2].status, 'locked', 'Future part should be locked');
      assertEqual(view.activeLandmark?.nextTapCost, 20, 'Next tap cost should use canonical spend-step formula');
      assertEqual(view.activeLandmark?.canAffordNextTap, true, 'Essence balance should afford next tap');
    },
  },
  {
    name: 'missing or invalid progress safely renders part 1 active',
    run: () => {
      const view = vm([build(0, Number.NaN, Number.NaN), build(0), build(0), build(0), build(0)]);
      assertEqual(view.parts[0].status, 'active', 'Invalid progress should normalize to Part 1 active');
    },
  },
  {
    name: 'Build Rush uses the discounted wallet cost for labels and affordability',
    run: () => {
      const discounted = vm([build(1, 0, 120), build(1), build(1), build(1), build(1)], 18, null, 0.25);
      assertEqual(discounted.activeLandmark?.nextTapCost, 24, 'Nominal tap should still fund 24 progress');
      assertEqual(discounted.activeLandmark?.nextTapEssenceCost, 18, '25% Build Rush should deduct 18 Money');
      assertEqual(discounted.activeLandmark?.canAffordNextTap, true, '18 Money should afford the discounted tap');

      const short = vm([build(1, 0, 120), build(1), build(1), build(1), build(1)], 17, null, 0.25);
      assertEqual(short.activeLandmark?.canAffordNextTap, false, '17 Money should not afford an 18 Money discounted tap');
    },
  },
  {
    name: 'hero level rail and image resolution handle fallback and boss arena art',
    run: () => {
      const hatchery = vm([build(0), build(0), build(0), build(0), build(0)], 999, manifest);
      assertEqual(hatchery.activeLandmark?.imageSrc, '/assets/islands/island-001/hatchery-l1.webp', 'Hatchery should use manifest landmark art');
      assertEqual(hatchery.levelRail[0].status, 'current', 'Level 1 should be current');
      assertEqual(hatchery.levelRail[1].status, 'locked', 'Level 2 should be locked');
      const bossArt = resolveBuildModalV2LandmarkArt({ manifest, stopIndex: 4, stopId: 'boss', title: 'Boss', targetLevel: 3, currentBuildLevel: 2 });
      assertEqual(bossArt.imageSrc, '/assets/islands/island-001/arena.webp', 'Boss construction should use battle arena scenery');
      const fallback = resolveBuildModalV2LandmarkArt({ manifest: null, stopIndex: 3, stopId: 'wisdom', title: 'Wisdom', targetLevel: 1, currentBuildLevel: 0 });
      assert(!fallback.imageSrc && fallback.imageIsPlaceholder, 'Missing manifest should use placeholder fallback');
    },
  },
  {
    name: 'live-board Build presentation stays compact and level celebrations never block construction',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const modalSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/BuildModalV2.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const cssSource = fsMod.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');

      assert(modalSource.includes('role="region"') && !modalSource.includes('aria-modal="true"'), 'Build should be a non-modal live-board construction region');
      assert(!modalSource.includes('<img') && !modalSource.includes('<canvas'), 'Build overlay should leave all landmark rendering to the real board');
      assert(boardSource.includes('BUILD_LEVEL_COMPLETION_AUTO_DISMISS_MS = 2_400'), 'level celebration should have a short bounded dwell');
      assert(boardSource.includes('role="status"') && !boardSource.includes('bm2-level-complete__continue'), 'level celebration should announce itself without a blocking continue button');
      assert(cssSource.includes('.bm2-build-mode') && cssSource.includes('pointer-events: none;'), 'transparent Build space should not become an invisible full-screen input blocker');
      assert(cssSource.includes('.bm2-level-complete__timer'), 'auto-dismiss celebration should show its remaining dwell visually');
    },
  },
];
