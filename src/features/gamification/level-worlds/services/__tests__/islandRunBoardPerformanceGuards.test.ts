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
    name: 'token and camera animation frames bypass full BoardStage React renders',
    run: () => {
      const tokenAnimation = readSource('src/features/gamification/level-worlds/components/board/useTokenAnimation.ts');
      const token = readSource('src/features/gamification/level-worlds/components/board/BoardToken.tsx');
      const camera = readSource('src/features/gamification/level-worlds/components/board/useBoardCamera.ts');
      const stage = readSource('src/features/gamification/level-worlds/components/board/BoardStage.tsx');
      const css = readSource('src/features/gamification/level-worlds/LevelWorlds.css');
      const tokenFrameLoop = tokenAnimation.slice(tokenAnimation.indexOf('function animLoop'), tokenAnimation.indexOf('if (progress >= 1)'));
      const cameraFrameLoop = camera.slice(camera.indexOf('const tick = useCallback'), camera.indexOf('const ensureAnimating'));
      assert(tokenFrameLoop.includes('emitFrame({'), 'token rAF must write to the imperative frame sink');
      assert(!tokenFrameLoop.includes('setAnimState('), 'token rAF must not update React state per frame');
      assert(cameraFrameLoop.includes('emitFrame({'), 'camera rAF must write to the imperative frame sink');
      assert(!cameraFrameLoop.includes('setCamera('), 'camera rAF must not update React state per frame');
      assert(stage.includes('onFrame: applyCameraFrame'), 'BoardStage must connect camera frames to compositor transforms');
      assert(stage.includes('onFrame: applyTokenFrame'), 'BoardStage must connect token frames to its imperative renderer');
      assert(token.includes('memo(forwardRef'), 'unrelated BoardStage renders must not overwrite the live token transform');
      assert(!css.includes('will-change: transform, left, top;'), 'token motion must not promote layout-driving left/top animation');
    },
  },
  {
    name: 'player token stays on the rendered tile route from first paint through landing',
    run: () => {
      const stage = readSource('src/features/gamification/level-worlds/components/board/BoardStage.tsx');
      const token = readSource('src/features/gamification/level-worlds/components/board/BoardToken.tsx');
      const css = readSource('src/features/gamification/level-worlds/LevelWorlds.css');
      assert(
        stage.includes('pendingHopSequence !== null')
        && stage.includes('pendingHopSequence === lastHopSequenceRef.current'),
        'an initial null pending sequence must not suppress the first snap to the active tile',
      );
      assert(
        stage.includes('}, [tokenIndex, anchors, movementSpeedFactor, pendingHopSequence, toScreen]);'),
        'token position must resync when responsive board-to-screen geometry changes',
      );
      assert(
        !stage.includes('SPARK36_TILE_THICKNESS_PX')
        && !stage.includes('transform: `translateZ(${isSpark36'),
        'the token route must share the tile-anchor plane instead of receiving a separate perspective projection',
      );
      assert(
        !css.includes('.island-token--zband-back  { scale:')
        && token.includes('scale(var(--token-depth-scale, 1)) scaleX('),
        'depth styling must scale the ship artwork without scaling the positioned token root',
      );
    },
  },
  {
    name: 'traffic-light coin assets are decoded before the compositor flip',
    run: () => {
      const prototype = readSource('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
      const css = readSource('src/features/gamification/level-worlds/LevelWorlds.css');
      assert(prototype.includes('TRAFFIC_LIGHT_ANIMATION_IMAGE_SRCS.map'), 'traffic-light art must be prefetched before the modal opens');
      assert(prototype.includes("image.decoding = 'async'"), 'traffic-light art must decode asynchronously before use');
      assert(css.includes('.island-coin--flipping .island-coin__face'), 'coin flip must have a Safari-safe face rendering profile');
      assert(css.includes('filter: none;'), 'rotating coin faces must not re-rasterize drop-shadow filters each frame');
    },
  },
  {
    name: 'Island 1 buildings preserve the camera-kit doubling ladder',
    run: () => {
      const manifest = JSON.parse(readSource('public/assets/islands/island-001/island-art.json')) as {
        landmarks?: Array<{ levelScales?: number[] }>;
      };
      assert(
        manifest.landmarks?.every((landmark) => (
          landmark.levelScales?.[0] === 0.275
          && landmark.levelScales?.[1] === 0.55
          && landmark.levelScales?.[2] === 1.1
        )) ?? false,
        'Island 1 buildings must double from L1 to L2 and again from L2 to L3 while preserving the approved L3 maximum',
      );
    },
  },
  {
    name: 'final-camera scenery bypasses the legacy world squash during migration',
    run: () => {
      const stage = readSource('src/features/gamification/level-worlds/components/board/BoardStage.tsx');
      const artLayers = readSource('src/features/gamification/level-worlds/components/board/IslandArtLayers.tsx');
      const css = readSource('src/features/gamification/level-worlds/LevelWorlds.css');
      const manifest = JSON.parse(readSource('public/assets/islands/island-001/island-art.json')) as {
        scenery?: Array<{ assetCameraMode?: string; src?: string; x?: number; y?: number }>;
      };
      const arena = manifest.scenery?.find((entry) => entry.src?.includes('moon-arena-final-camera'));
      assert(stage.includes('renderMode="world-final"'), 'BoardStage must provide an untransformed final-camera world root');
      assert(stage.includes('renderMode="world-legacy"'), 'BoardStage must keep a compatibility root for unconverted world assets');
      assert(artLayers.includes('shouldRenderWorldAsset(scenery.assetCameraMode)'), 'Scenery must route by its own camera contract');
      assert(css.includes('[data-render-mode="world-final"] {\n  transform: none;'), 'Final-camera world art must not receive a runtime squash');
      assert(arena?.assetCameraMode === 'final-angle', 'Island 1 arena must declare its baked final camera');
      assert(arena?.x === 700 && arena.y === 800, 'Island 1 arena must use the immutable scene center anchor');
    },
  },
  {
    name: 'decorative island art stays below the interactive tile route on WebKit',
    run: () => {
      const css = readSource('src/features/gamification/level-worlds/LevelWorlds.css');
      const artStageCss = css.slice(
        css.indexOf('.island-run-board__art-camera-stage {'),
        css.indexOf('.island-run-board__camera-stage {'),
      );
      assert(artStageCss.includes('z-index: 2;'), 'world art must remain below the gameplay camera stage');
      assert(
        artStageCss.includes('transform-style: flat;'),
        'world art must flatten child z-indices so iOS WebKit cannot composite scenery over tiles',
      );
      assert(
        css.includes('.island-run-board__camera-stage {\n  position: absolute;')
        && css.includes('z-index: 3;'),
        'the interactive tile route must keep the higher sibling stacking plane',
      );
    },
  },
  {
    name: 'traffic-light meter reserves green for its single fully charged state',
    run: () => {
      const tileGrid = readSource('src/features/gamification/level-worlds/components/board/BoardTileGrid.tsx');
      assert(
        tileGrid.includes('trafficLightCharge >= Math.max(1, trafficLightChargeTarget);'),
        'the traffic-light tile must not turn green on the penultimate charge',
      );
      assert(
        tileGrid.includes('const greenLightStart = Math.max(1, trafficLightChargeTarget);'),
        'only the final meter pip may be green',
      );
      assert(
        !tileGrid.includes('trafficLightChargeTarget - 1'),
        'no second green traffic-light state may remain',
      );
    },
  },
  {
    name: 'discovery fog never blurs the moving gameplay camera stage',
    run: () => {
      const prototype = readSource('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
      const artLayers = readSource('src/features/gamification/level-worlds/components/board/IslandArtLayers.tsx');
      const css = readSource('src/features/gamification/level-worlds/LevelWorlds.css');
      const discoveryBackgroundCss = css.slice(
        css.indexOf('.island-run-board__background-layer'),
        css.indexOf('.island-run-board__bg {'),
      );
      const devPanelStart = prototype.indexOf('<div id="island-run-dev-panel">');
      const visualCaptureControl = prototype.indexOf('aria-label="Visual capture"', devPanelStart);
      const firstDevHudGrid = prototype.indexOf('className="island-run-prototype__hud-grid"', devPanelStart);
      assert(prototype.includes('island-run-board__background-layer'), 'Background must have a dedicated discovery layer');
      assert(prototype.includes('Clean art view: On'), 'DEV MODE must expose the clean-art master switch');
      assert(
        devPanelStart >= 0 && visualCaptureControl > devPanelStart && visualCaptureControl < firstDevHudGrid,
        'Visual capture must be the first control in the expanded DEV panel',
      );
      assert(css.includes('.island-run-prototype__visual-capture-row {\n  position: sticky;'), 'Visual capture must remain reachable while the DEV panel scrolls');
      assert(artLayers.includes('data-discovery-state={getDiscoveryState(landmark.stopIndex)}'), 'Landmark art must consume visual discovery state');
      assert(!discoveryBackgroundCss.includes('backdrop-filter:'), 'Discovery fog must not add a costly live backdrop filter');
      assert(!css.includes('.island-run-board__camera-stage {\n  filter:'), 'Moving tiles/token stage must never receive the discovery filter');
      assert(css.includes('.island-run-board--discovery-fog .island-run-board__background-layer'), 'Only the static background layer should receive full-frame softening');
    },
  },
];
