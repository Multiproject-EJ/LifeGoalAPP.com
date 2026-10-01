import * as THREE from 'three';
import { assert, assertEqual, type TestCase } from './testHarness';
import {
  TRAVEL_INTERLUDE_DURATION_MS,
  TRAVEL_INTERLUDE_FALLBACK_MS,
  TRAVEL_INTERLUDE_REDUCED_MOTION_DURATION_MS,
  TRAVEL_INTERLUDE_VIGNETTES,
  resolveTravelInterludePlan,
  resolveTravelInterludeRouteProgress,
  resolveTravelInterludeVignette,
} from '../islandTravelInterlude';
import { getIslandDisplayName } from '../islandNames';
import { getVoyageIslandArt } from '../islandVoyageMap';
import { createShipTravelInteriorScene } from '../../dev/ShipTravelInteriorScene';

const LEVEL_WORLDS = 'src/features/gamification/level-worlds';

async function readSource(path: string): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  return fsMod.readFileSync(`${LEVEL_WORLDS}/${path}`, 'utf8');
}

export const islandTravelInterludeTests: TestCase[] = [
  {
    name: 'travel interlude: consecutive trips rotate through the cozy vignettes',
    run: () => {
      const seen = new Set<string>();
      for (let to = 2; to <= 121; to += 1) {
        const vignette = resolveTravelInterludeVignette(to);
        assert(TRAVEL_INTERLUDE_VIGNETTES.includes(vignette), `known vignette for ${to}`);
        assert(vignette !== resolveTravelInterludeVignette(to + 1), `trip to ${to} and ${to + 1} differ`);
        seen.add(vignette);
      }
      assertEqual(seen.size, TRAVEL_INTERLUDE_VIGNETTES.length, 'every vignette appears');
    },
  },
  {
    name: 'travel interlude: the plan links the island you left to the one you fly to',
    run: () => {
      const plan = resolveTravelInterludePlan({ fromIslandNumber: 4, toIslandNumber: 5, reducedMotion: false });
      assertEqual(plan.from.islandNumber, 4, 'from island');
      assertEqual(plan.to.islandNumber, 5, 'to island');
      assertEqual(plan.from.name, getIslandDisplayName(4), 'from name');
      assertEqual(plan.to.name, getIslandDisplayName(5), 'to name');
      assertEqual(plan.to.art, getVoyageIslandArt(5), 'voyage portrait art for the destination');
      assertEqual(plan.durationMs, TRAVEL_INTERLUDE_DURATION_MS, 'full duration');
      assert(plan.caption.length > 0, 'cozy caption');
      const wrap = resolveTravelInterludePlan({ fromIslandNumber: 120, toIslandNumber: 1, reducedMotion: true });
      assertEqual(wrap.to.islandNumber, 1, 'campaign wrap goes back to Island 1');
      assertEqual(wrap.durationMs, TRAVEL_INTERLUDE_REDUCED_MOTION_DURATION_MS, 'reduced motion is shorter');
      assert(TRAVEL_INTERLUDE_FALLBACK_MS > TRAVEL_INTERLUDE_DURATION_MS, 'fallback outlasts the scene');
    },
  },
  {
    name: 'travel interlude: the route ship eases from the old island to the new one',
    run: () => {
      assertEqual(resolveTravelInterludeRouteProgress(0, 6000), 0, 'starts at the old island');
      assertEqual(resolveTravelInterludeRouteProgress(6000, 6000), 1, 'ends at the new island');
      assertEqual(resolveTravelInterludeRouteProgress(9000, 6000), 1, 'clamped after the end');
      assertEqual(resolveTravelInterludeRouteProgress(3000, 6000), 0.5, 'halfway at mid-scene');
      assert(resolveTravelInterludeRouteProgress(600, 6000) < 0.1, 'eases out of the dock');
      assertEqual(resolveTravelInterludeRouteProgress(10, 0), 1, 'zero duration finishes immediately');
    },
  },
  {
    name: 'travel interlude: each vignette frames a drifting planet on a phone screen',
    run: () => {
      for (const vignette of TRAVEL_INTERLUDE_VIGNETTES) {
        for (const quality of ['high', 'low'] as const) {
          const interior = createShipTravelInteriorScene(vignette, quality);
          const planets = interior.scene.getObjectByName('TRAVEL_DRIFTING_PLANETS');
          assert(planets && planets.children.length >= 2, `${vignette}: planets outside the glass`);
          const hero = planets!.children[0]!;
          const projectAt = (progress: number) => {
            interior.update({ elapsedSeconds: progress * 6.5, progress, reducedMotion: false, aspect: 390 / 844 });
            interior.camera.updateMatrixWorld();
            return hero.getWorldPosition(new THREE.Vector3()).project(interior.camera);
          };
          const mid = projectAt(0.5);
          assert(mid.z < 1 && Math.abs(mid.x) < 1 && Math.abs(mid.y) < 1,
            `${vignette}/${quality}: hero planet in view mid-scene (${mid.x.toFixed(2)}, ${mid.y.toFixed(2)})`);
          const drift = Math.abs(projectAt(1).x - projectAt(0).x);
          assert(drift > 0.2, `${vignette}/${quality}: the planet slides past the glass (${drift.toFixed(2)})`);
          // Reduced motion: a still camera.
          interior.update({ elapsedSeconds: 0, progress: 0, reducedMotion: true, aspect: 1 });
          const still = interior.camera.position.clone();
          interior.update({ elapsedSeconds: 5, progress: 0.9, reducedMotion: true, aspect: 1 });
          assert(still.distanceTo(interior.camera.position) < 1e-9, `${vignette}: reduced motion holds the camera`);
          assert(interior.scene.getObjectByName('TRAVEL_GREAT_TREE'), `${vignette}: the Great Tree`);
          assert(interior.scene.getObjectByName('TRAVEL_TREEHOUSE_DECK'), `${vignette}: the tree-house deck`);
          interior.dispose();
        }
      }
    },
  },
  {
    name: 'travel interlude: board travel runs the canonical action under the scene; the scene writes nothing',
    run: async () => {
      const board = await readSource('components/IslandRunBoardPrototype.tsx');
      const start = board.indexOf('const startTravel = () => {');
      const body = board.slice(start, board.indexOf('window.setTimeout(() => {\n      setShowIslandClearCelebration(false);', start));
      assert(start > 0 && body.includes('resolveTravelInterludePlan('), 'travel builds an interlude plan');
      assert(body.includes('performIslandTravel(nextIsland'), 'canonical travel still runs');
      assert(body.includes('TRAVEL_INTERLUDE_FALLBACK_MS'), 'a fallback finishes a stalled scene');
      assert(body.includes("kind: 'island_travel_arrival'"), 'arrival story still follows');
      assert(!body.includes('setShowTravelOverlay(true)'), 'the old text card no longer covers celebration travel');
      for (const file of ['components/IslandTravelInterlude.tsx', 'dev/ShipTravelInteriorScene.ts']) {
        const source = await readSource(file);
        assert(!/islandRunStateActions|persistIslandRunRuntimeStatePatch|commitIslandRunState/.test(source), `${file} is presentation only`);
      }
      const component = await readSource('components/IslandTravelInterlude.tsx');
      assert(component.includes('createPortal(') && component.includes('useControllerShopScrollLock()'), 'portal + scroll lock');
      const css = await readSource('components/IslandTravelInterlude.css');
      assert(/\.island-travel-interlude \{[^}]*position: fixed;[^}]*inset: 0;/.test(css), 'viewport-anchored overlay');
    },
  },
];
