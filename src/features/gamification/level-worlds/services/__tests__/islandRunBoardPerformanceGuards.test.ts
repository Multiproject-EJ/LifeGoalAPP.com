// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from './testHarness';

const readSource = (path: string) => readFileSync(path, 'utf8');

export const islandRunBoardPerformanceGuardTests: TestCase[] = [
  {
    name: 'dice tumble stays on the compositor instead of updating React on an interval',
    run: () => {
      const dice = readSource('src/features/gamification/level-worlds/components/board/BoardDice3D.tsx');
      const css = readSource('src/features/gamification/level-worlds/LevelWorlds.css');
      assert(!dice.includes('setInterval('), 'dice animation must not schedule recurring React state updates');
      assert(css.includes('@keyframes board-dice-3d-tumble'), 'dice tumble must be driven by CSS transforms');
      assert(css.includes('animation: board-dice-3d-tumble 520ms linear infinite;'), 'rolling dice must use the compositor tumble animation');
    },
  },
  {
    name: 'phone boards and modal-owned boards suspend decorative continuous motion',
    run: () => {
      const prototype = readSource('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
      const stage = readSource('src/features/gamification/level-worlds/components/board/BoardStage.tsx');
      const particles = readSource('src/features/gamification/level-worlds/components/board/BoardParticles.tsx');
      const css = readSource('src/features/gamification/level-worlds/LevelWorlds.css');
      assert(prototype.includes("doesModalOwnAttention ? 'island-run-board--attention-paused' : ''"), 'board must expose attention ownership to CSS');
      assert(stage.includes('isPaused={isInteractionPaused}'), 'stage must pause its canvas particle loop behind modals');
      assert(particles.includes("window.matchMedia('(max-width: 720px), (pointer: coarse), (prefers-reduced-motion: reduce)')"), 'particles must stay disabled on phone/coarse/reduced-motion devices');
      assert(css.includes('@media (max-width: 720px), (hover: none)'), 'phone board must have a lightweight-motion profile');
      assert(css.includes('.island-run-board__stage-wrapper--paused .island-run-board__particles'), 'paused stage must hide its particle canvas');
    },
  },
  {
    name: 'Island 1 early building levels remain legible on the phone board',
    run: () => {
      const manifest = JSON.parse(readSource('public/assets/islands/island-001/island-art.json')) as {
        landmarks?: Array<{ levelScales?: number[] }>;
      };
      assert(
        manifest.landmarks?.every((landmark) => landmark.levelScales?.[0] === 0.5 && landmark.levelScales?.[1] === 0.78) ?? false,
        'Island 1 L1/L2 buildings must retain the phone-validated visible scale ladder',
      );
    },
  },
];
