import {
  shouldRenderActiveStopModal,
  shouldRenderFirstRunCelebration,
  shouldRenderPerfectCompanionHint,
} from '../islandRunModalVisibility';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunModalVisibilityTests: TestCase[] = [
  {
    name: 'body-portaled Island Run popups stay in the viewport and above the game layer',
    run: async () => {
      // A popup the board counts as open but the player cannot see hides the
      // controller and disables the Shop, which reads as a frozen game.
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const levelWorldsCss = fsMod.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      const mapCss = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunSolarMapOverlay.css', 'utf8');
      const appCss = fsMod.readFileSync('src/index.css', 'utf8');
      const gameLayerZ = Number(/\.level-worlds-entry-modal \{[^}]*z-index: (\d+)/.exec(appCss)?.[1]);
      const portalZ = Number(/body > \.island-run-overlay-root\.island-stop-modal-backdrop \{\s*z-index: (\d+)/.exec(levelWorldsCss)?.[1]);
      assert(gameLayerZ > 0 && portalZ > gameLayerZ, 'Shop and Bonus Encounter portals render above the game layer');
      assert(boardSource.includes('{showShopPanel && typeof document !== \'undefined\' && createPortal(')
        && boardSource.includes('{showEncounterModal && typeof document !== \'undefined\' ? createPortal(('), 'Shop and Bonus Encounter are body portals covered by that rule');
      assert(/\.island-run-solar-map-overlay \{\s*position: fixed;\s*inset: 0;/.test(mapCss), 'the Island Map root is a viewport-anchored overlay');
      assert(/\.island-run-board__topbar-menu-panel \{\s*max-height:[^;]+;\s*overflow-y: auto;/.test(levelWorldsCss), 'the board menu scrolls so Exit Island Run stays reachable');
    },
  },
  {
    name: 'arrival story outranks first-run and active-stop modals',
    run: () => {
      assertEqual(shouldRenderFirstRunCelebration({
        requested: true,
        storyReaderOpen: true,
      }), false, 'first-run celebration should wait behind story');
      assertEqual(shouldRenderActiveStopModal({
        hasActiveStop: true,
        storyReaderOpen: true,
        firstRunCelebrationOpen: true,
      }), false, 'active stop should wait behind story and first-run setup');
    },
  },
  {
    name: 'active stop appears after story and first-run setup close',
    run: () => {
      assertEqual(shouldRenderActiveStopModal({
        hasActiveStop: true,
        storyReaderOpen: false,
        firstRunCelebrationOpen: false,
      }), true, 'active stop should render when higher-priority modals are closed');
    },
  },
  {
    name: 'companion hint waits for hatch reveal and creature card',
    run: () => {
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: true,
        creatureCardOpen: false,
      }), false, 'hint should wait behind hatch reveal');
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: false,
        creatureCardOpen: true,
      }), false, 'hint should wait behind creature card');
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: false,
        creatureCardOpen: false,
      }), true, 'hint should appear after reveal surfaces close');
    },
  },
];
