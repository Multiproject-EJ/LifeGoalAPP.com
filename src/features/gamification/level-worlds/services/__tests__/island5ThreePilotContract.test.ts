import { TILE_ANCHORS_36 } from '../islandBoardLayout';
import * as THREE from 'three';
import {
  buildIsland5AmbienceLayout,
  buildIsland3DRadialTileMeshData,
  buildIsland5TileTransforms,
  CROWN_CITADEL_DESIGN_LOCK,
  CROWN_CITADEL_DETAIL_PROFILES,
  CROWN_CITADEL_LEVEL_SCALES,
  getIsland3DTokenHopPosition,
  getIsland3DTileImpactPose,
  getIsland3DRendererPixelRatio,
  getIsland5TokenGroundPosition,
  ISLAND_3D_QUALITY_PROFILES,
  ISLAND_3D_PERFORMANCE_TARGETS,
  ISLAND_3D_PROFILE_DURATION_MS,
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_IDLE_OVERVIEW_DELAY_MS,
  ISLAND_3D_IDLE_OVERVIEW_DURATION_SCALE,
  ISLAND_3D_TOKEN_HOP_ARC_HEIGHT,
  ISLAND_3D_TILE_IMPACT_DURATION_MS,
  ISLAND_CAMERA_TOUR_STEPS,
  ISLAND_5_CAMERA_PRESETS,
  ISLAND_5_LANDMARKS,
  resolveIsland3DQuality,
  resolveIsland3DRadialTileGeometry,
  resolveIsland3DLandingImpact,
  summarizeIsland3DPerformance,
  shouldFadeCentralLandmarkForCamera,
} from '../../dev/island5ThreePilotContract';
import {
  buildIsland1Landmark,
  buildIsland1CloudLayout,
  buildIsland1MountainLayout,
  createIsland1WorldMaterials,
  getIsland1AmbienceLifeBudget,
  ISLAND_1_CLOUD_MINIMUM_Y,
  ISLAND_1_OCEAN_SURFACE_Y,
} from '../../dev/Island1ThreeWorld';
import {
  createIsland2WorldMaterials as createIsland5SunshoreWorldMaterials,
  createIsland5SunwheelArena,
  ISLAND_5_SUNWHEEL_OPENING_PRESENTATION_BASELINE_LEVEL,
} from '../../dev/Island2ThreeWorld';
import { createIsland3FrostmoonMaterials } from '../../dev/Island3FrostmoonThreeWorld';
import {
  createFrostwellIceworks,
  FROSTWELL_OFFSHORE_POSITION,
  FROSTWELL_PLATFORM_RADIUS,
} from '../../dev/FrostwellIceworksThreeModel';
import {
  isIsland6RouteCorridorClear,
  ISLAND_6_ROUTE_CLEARANCE_INNER_RADIUS,
  ISLAND_6_ROUTE_CLEARANCE_OUTER_RADIUS,
} from '../../dev/Island6MoonveilThreeWorld';
import {
  collectIsland7RuntimePartManifest,
  isIsland7RouteCorridorClear,
  ISLAND_7_RUNTIME_PART_IDS,
  ISLAND_7_ROUTE_CLEARANCE_INNER_RADIUS,
  ISLAND_7_ROUTE_CLEARANCE_OUTER_RADIUS,
  registerIsland7RuntimePart,
} from '../../dev/Island7UnderwaterThreeWorld';
import {
  buildIsland8EverblossomLandmark,
  collectIsland8RuntimePartManifest,
  createIsland8EverblossomMaterials,
  isIsland8RouteCorridorClear,
  ISLAND_8_FLOWER_BORDER_INNER_RADIUS,
  ISLAND_8_FLOWER_BORDER_MAX_FOOTPRINT,
  ISLAND_8_FLOWER_BORDER_OUTER_RADIUS,
  ISLAND_8_ROUTE_CLEARANCE_INNER_RADIUS,
  ISLAND_8_ROUTE_CLEARANCE_OUTER_RADIUS,
  ISLAND_8_RUNTIME_PART_IDS,
  registerIsland8RuntimePart,
} from '../../dev/Island8EverblossomThreeWorld';
import {
  buildIsland9HeartshaftLandmark,
  collectIsland9RuntimePartManifest,
  createIsland9HeartshaftMaterials,
  isIsland9RouteCorridorClear,
  ISLAND_9_ROUTE_CLEARANCE_INNER_RADIUS,
  ISLAND_9_ROUTE_CLEARANCE_OUTER_RADIUS,
  ISLAND_9_RUNTIME_PART_IDS,
  registerIsland9RuntimePart,
} from '../../dev/Island9HeartshaftThreeWorld';
import { resolveIslandRunTileRewardObjectKind } from '../../dev/IslandRunTileRewardThreeObjects';
import {
  ISLAND_RUN_AUTO_ROLL_HOLD_MS,
  resolveIslandRunMaxMultiplierThrowCadence,
  resolveIslandRunDiceHoldIntent,
} from '../islandRunDiceThrowPresentation';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const island5ThreePilotContractTests: TestCase[] = [
  {
    name: 'gives First Light a monumental L3 oak and a mission-ready noble council table',
    run: () => {
      const materials = createIsland1WorldMaterials();
      const habit = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'habit');
      const boss = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'boss');
      assert(Boolean(habit) && Boolean(boss), 'First Light needs both its Rhythm Tree and central Sun Court definitions');
      const l2Tree = buildIsland1Landmark(habit!, 2, 'low', materials);
      const l3Tree = buildIsland1Landmark(habit!, 3, 'low', materials);
      const l2Height = new THREE.Box3().setFromObject(l2Tree).getSize(new THREE.Vector3()).y;
      const l3Height = new THREE.Box3().setFromObject(l3Tree).getSize(new THREE.Vector3()).y;
      assert(l3Height > l2Height * 1.25, 'the completed ancient oak must become a materially grander landmark, not a recoloured L2 tree');
      const oak = l3Tree.children[0];
      assertEqual(oak.userData.heroIdentity, 'glorious-old-giant-oak', 'the L3 tree needs a stable hero identity for camera and story QA');

      const sunCourt = buildIsland1Landmark(boss!, 3, 'low', materials);
      const briefing = sunCourt.children[0]?.userData.missionBriefing;
      assert(Boolean(briefing), 'the completed Sun Court must expose stable council-table mission metadata');
      assertEqual(briefing.seatCount, 8, 'the noble council chamber should retain one player seat and seven council seats');
      assertEqual(briefing.tableCenter.length, 3, 'mission camera authority needs a stable table-center anchor');
      assertEqual(briefing.playerSeat.length, 3, 'mission camera authority needs a stable player-seat anchor');

      [l2Tree, l3Tree, sunCourt].forEach((root) => root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      }));
      Object.values(materials).forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
    },
  },
  {
    name: 'gives Island 005 a Level-2-quality opening arena and four additive restoration silhouettes',
    run: () => {
      assertEqual(ISLAND_5_SUNWHEEL_OPENING_PRESENTATION_BASELINE_LEVEL, 2, 'the Island 005 opening composition must declare its richer visual baseline');
      const materials = createIsland5SunshoreWorldMaterials();
      const levels = [0, 1, 2, 3] as const;
      const heights = levels.map((level) => {
        const arena = createIsland5SunwheelArena(level, 'low', materials);
        assertEqual(arena.userData.sculptRuntime.buildLevel, level, `visual metadata must retain canonical build level ${level}`);
        assertEqual(arena.userData.sculptRuntime.presentationBaselineLevel, 2, 'the richer visual baseline may not masquerade as gameplay progress');
        assert(arena.userData.sculptRuntime.clickable, 'the Sunwheel arena must remain part-addressable and clickable');
        assert(Boolean(arena.getObjectByName('ISLAND_5_SUNWHEEL_TIDEGLASS_FLOOR')), 'every level needs the complete tideglass arena floor');
        if (level === 0) {
          assert(!arena.getObjectByName('ISLAND_5_SUNWHEEL_SIGNAL_POST_L1'), 'unfunded opening presentation must not include the funded L1 signal posts');
        }
        if (level === 3) {
          assert(Boolean(arena.getObjectByName('ISLAND_5_SUNWHEEL_RESTORED_CROWN_HALO')), 'restored L3 needs a clearly additive premium crown halo');
        }
        const height = new THREE.Box3().setFromObject(arena).getSize(new THREE.Vector3()).y;
        arena.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
        return height;
      });
      assert(heights[1] > heights[0], 'L1 signal architecture must rise above the opening arena');
      assert(heights[2] > heights[1], 'L2 crown arches must rise above L1');
      assert(heights[3] > heights[2], 'L3 restored halo and crown fins must rise above L2');
      Object.values(materials).forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
    },
  },
  {
    name: 'reserves hard throws for max-multiplier cadence while hold only arms auto-roll',
    run: () => {
      assertEqual(resolveIslandRunDiceHoldIntent({ heldForMs: ISLAND_RUN_AUTO_ROLL_HOLD_MS - 1, autoRollActivated: false }), 'normal', 'releasing before auto-roll remains a normal throw');
      assertEqual(resolveIslandRunDiceHoldIntent({ heldForMs: ISLAND_RUN_AUTO_ROLL_HOLD_MS, autoRollActivated: false }), 'auto', 'the long hold belongs to auto-roll');
      assertEqual(resolveIslandRunDiceHoldIntent({ heldForMs: 0, autoRollActivated: true }), 'auto', 'an activated auto-roll cannot degrade into a release throw');

      const firstAtMax = resolveIslandRunMaxMultiplierThrowCadence({
        isAtMaxAvailableMultiplier: true,
        firstMaxThrowPending: true,
        consecutiveMaxMultiplierRolls: 0,
      });
      assertEqual(firstAtMax.throwStrength, 'hard', 'the first roll after reaching available max celebrates with one hard throw');
      let cadence = firstAtMax;
      for (let roll = 2; roll <= 9; roll += 1) {
        cadence = resolveIslandRunMaxMultiplierThrowCadence({
          isAtMaxAvailableMultiplier: true,
          firstMaxThrowPending: cadence.nextFirstMaxThrowPending,
          consecutiveMaxMultiplierRolls: cadence.nextConsecutiveMaxMultiplierRolls,
        });
        assertEqual(cadence.throwStrength, 'normal', `continued max roll ${roll} stays restrained`);
      }
      cadence = resolveIslandRunMaxMultiplierThrowCadence({
        isAtMaxAvailableMultiplier: true,
        firstMaxThrowPending: cadence.nextFirstMaxThrowPending,
        consecutiveMaxMultiplierRolls: cadence.nextConsecutiveMaxMultiplierRolls,
      });
      assertEqual(cadence.throwStrength, 'hard', 'the tenth continued max roll repeats the hard celebration');
      const reset = resolveIslandRunMaxMultiplierThrowCadence({
        isAtMaxAvailableMultiplier: false,
        firstMaxThrowPending: false,
        consecutiveMaxMultiplierRolls: cadence.nextConsecutiveMaxMultiplierRolls,
      });
      assertEqual(reset.nextConsecutiveMaxMultiplierRolls, 0, 'leaving max resets the rare-throw streak');
    },
  },
  {
    name: 'fades the central landmark only when it blocks an outer-landmark inspection ray',
    run: () => {
      assert(shouldFadeCentralLandmarkForCamera({ cameraPosition: [0, 6, 2], focusPosition: [0, 1, -5] }), 'a camera looking through the centre must fade the boss');
      assert(!shouldFadeCentralLandmarkForCamera({ cameraPosition: [0, 9, 2], focusPosition: [0, 8, -5] }), 'a ray passing above the central landmark must remain opaque');
      assert(!shouldFadeCentralLandmarkForCamera({ cameraPosition: [-4, 6, -2], focusPosition: [-5, 1, -5] }), 'a clear same-side view must leave the boss opaque');
    },
  },
  {
    name: 'wires all 3D islands to stable landmark hit targets and the canonical dice launcher callback',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const diceSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/board/IslandRunDiceLaunchOverlay.tsx', 'utf8');
      assert(pilotSource.includes('createLandmarkHitTarget(landmark)'), 'every landmark needs a stable forgiving 3D tap proxy');
      assert(pilotSource.includes('resolveLandmarkIdFromIntersection'), 'landmark routing must survive merged or nested meshes');
      assert(pilotSource.includes('makeLandmarkMaterialsIndependent(landmarkRoot)'), 'central transparency may not fade materials shared with other landmarks');
      assert(diceSource.includes('pointer input') && diceSource.includes('<BoardDice3D'), 'the visible dice must be a pointer-transparent layer above WebGL');
      assert(
        diceSource.includes("throwStrength !== 'hard'")
          && diceSource.includes('onTopBarImpactRef.current?.()')
          && boardSource.includes("triggerImpactHaptic('strong'"),
        'only the rare hard top-bar collision frame needs a native-capable haptic impact',
      );
      assert(boardSource.includes('faces={rollingDiceFaces}') && boardSource.includes('onRollComplete={() =>'), 'the 3D dice must reuse the canonical result and completion clock');
      assert(!boardSource.includes('showEggReadyBanner') && boardSource.includes('Open hatchery.'), 'egg readiness should stay in persistent Hatchery access instead of reopening an automatic modal');
      assert(boardSource.includes("requestActiveStopTransition(null, 'hatchery_landmark_door_non_blocking')"), 'landing on the Hatchery door must not repeatedly open the full remote-egg modal');
    },
  },
  {
    name: 'keeps Frostwell Iceworks north in the ocean, route-clear, clickable, and state-driven',
    run: async () => {
      assertEqual(FROSTWELL_OFFSHORE_POSITION.x, 0, 'the Iceworks should stay centred on the north sightline');
      assert(FROSTWELL_OFFSHORE_POSITION.z < 0, 'the Iceworks must remain north of Frostmoon');
      assert(
        Math.abs(FROSTWELL_OFFSHORE_POSITION.z) - FROSTWELL_PLATFORM_RADIUS > ISLAND_3D_ROUTE_RADIUS + 1,
        'the detached ice platform must remain safely beyond the canonical tile route',
      );
      const materials = createIsland3FrostmoonMaterials();
      const runtime = createFrostwellIceworks('low', materials);
      assert(runtime.root.userData.sculptRuntime.clickable, 'the Iceworks runtime must remain explicitly clickable');
      assertEqual(runtime.hitTarget.userData.signatureMissionId, 'frostwell-iceworks', 'the forgiving hit target must route to the Frostwell mission');
      const operating = runtime.root.getObjectByName('FROSTWELL_OPERATING_FISHERY_AND_RESERVOIR');
      assert(Boolean(operating) && !operating!.visible, 'the fishery machinery must remain hidden while drilling');
      runtime.setPresentation({ metersDrilled: 500, built: true, constructionSequence: 1 });
      assert(Boolean(operating?.visible), 'funding must reveal the operating fishery and freshwater reservoir');
      runtime.animate(123.4);
      assert(runtime.root.getObjectByName('FROSTWELL_BORE_OPENING') !== undefined, 'the 50m bore needs a readable physical opening');
      assert(runtime.root.getObjectByName('FROSTWELL_CATCH_SORTING_BIN') !== undefined, 'the completed mission needs a visible fish output');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(pilotSource.includes('clickableSignatureMissions') && pilotSource.includes('onSignatureMissionClickRef.current?.()'), 'Iceworks ray hits must open the signature mission UI');
      assert(pilotSource.includes("applyPreset('frostwell', 0.9)") && pilotSource.includes("activeInspectionPreset === 'frostwell'"), 'Frostwell needs its own camera and central-landmark fade');
      assert(
        boardSource.includes('isIslandVisualPreview && islandArtPreviewNumber !== 3 && islandArtPreviewNumber !== 10')
          && boardSource.includes("islandArtPreviewNumber === 3\n                      ? openFrostwellMission"),
        'Island 003 visual QA must retain the real 3D hit-to-modal path',
      );
      assert(boardSource.includes('Deliberately keep the special Frostwell inspection camera active'), 'closing the tray must leave the rig available for unobstructed 3D inspection');
      assert(boardSource.includes('frostwell-mission-modal__wheel-hub') && boardSource.includes('spinFrostwellDrillWheel'), 'the lower half-wheel hub must route through canonical wheel authority');
      assert(boardSource.includes("params.get('frostwellMissionState')") && boardSource.includes("frostwellMissionState === 'constructing'"), 'development proof mode must cover the construction POOF without creating gameplay state');
      runtime.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      Object.values(materials).forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
    },
  },
  {
    name: 'keeps Island 009 volcanic scenery outside the route and gives every L1 L2 L3 landmark a distinct additive silhouette',
    run: async () => {
      assert(isIsland9RouteCorridorClear(ISLAND_9_ROUTE_CLEARANCE_INNER_RADIUS - 0.2, 0, 0.16), 'the open shaft may remain inside the route with clearance');
      assert(!isIsland9RouteCorridorClear(3.4, 0, 0.01), 'foundry scenery may not enter the canonical tile centreline');
      assert(isIsland9RouteCorridorClear(ISLAND_9_ROUTE_CLEARANCE_OUTER_RADIUS + 0.2, 0, 0.16), 'outer caldera scenery may begin beyond the protected route');
      const materials = createIsland9HeartshaftMaterials();
      const levelHeightsByLandmark = new Map<string, number[]>();
      const l3Silhouettes: string[] = [];
      for (const landmark of ISLAND_5_LANDMARKS) {
        const heights: number[] = [];
        for (const level of [1, 2, 3] as const) {
          const root = buildIsland9HeartshaftLandmark(landmark, level, 'low', materials);
          const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
          heights.push(size.y);
          if (level === 3) l3Silhouettes.push(`${size.x.toFixed(2)}:${size.y.toFixed(2)}:${size.z.toFixed(2)}`);
          root.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
        }
        levelHeightsByLandmark.set(landmark.id, heights);
      }
      levelHeightsByLandmark.forEach((heights, id) => {
        assert(heights[1] > heights[0] && heights[2] > heights[1], `${id} must grow additively at L1, L2 and L3`);
      });
      assertEqual(new Set(l3Silhouettes).size, 5, 'all five Heartshaft L3 landmark bounds need distinct silhouettes');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const worldSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island9HeartshaftThreeWorld.ts', 'utf8');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(worldSource.includes("shaftWall.name = 'ISLAND_9_DEEP_SHAFT_WALL'"), 'Island 009 needs a real open descending shaft wall');
      assert(worldSource.includes("ringPivot.name = 'ISLAND_9_IGNITION_RING_PIVOT'"), 'Heartshaft L3 needs its open suspended ignition ring');
      assert(worldSource.includes("const cycle = (elapsed * 0.12) % 1"), 'Island 009 needs the reactive foundry ambience sequence');
      assert(worldSource.includes('sharedWater.visible = false'), 'Island 009 must remain landlocked with no ocean plane');
      assert(pilotSource.includes('isHeartshaftCrucible && island9HeartshaftMaterials'), 'Island 009 must reuse the shared renderer shell');
    },
  },
  {
    name: 'exports the Island 009 action-ready runtime hierarchy',
    run: () => {
      const root = new THREE.Group();
      root.name = 'ISLAND_9_ACTION_READY_TEST_ROOT';
      root.userData.sculptRuntime = {
        clickable: true,
        explodable: true,
        parts: ISLAND_9_RUNTIME_PART_IDS.map((partId) => {
          const pivot = new THREE.Object3D();
          pivot.name = `ISLAND_9_${partId.toUpperCase()}_PIVOT`;
          root.add(pivot);
          return registerIsland9RuntimePart(partId, pivot, 'contract-test');
        }),
        sockets: { focus: 'ISLAND_9_TEST_FOCUS_SOCKET' },
        colliders: [{ id: 'test-trigger', type: 'box', isTrigger: true }],
        destructionGroups: [{ id: 'static-world', breakable: false }],
      };
      const manifest = collectIsland9RuntimePartManifest([root]);
      assertEqual(new Set(manifest.parts.map((part) => part.name)).size, ISLAND_9_RUNTIME_PART_IDS.length, 'every Island 009 runtime part needs a stable selectable ID');
      assert(root.userData.sculptRuntime.clickable && root.userData.sculptRuntime.explodable, 'Island 009 roots must expose click and exploded-review intent');
      assert(root.userData.sculptRuntime.sockets.focus, 'Island 009 roots need a named focus socket');
      assert(root.userData.sculptRuntime.colliders.length > 0, 'Island 009 roots need collider intent');
    },
  },
  {
    name: 'keeps Island 008 botanical scenery outside the route and all five L3 silhouettes distinct',
    run: async () => {
      assert(isIsland8RouteCorridorClear(ISLAND_8_ROUTE_CLEARANCE_INNER_RADIUS - 0.2, 0, 0.16), 'inner citadel gardens may remain inside the route with clearance');
      assert(!isIsland8RouteCorridorClear(3.4, 0, 0.01), 'Everblossom scenery may not enter the canonical tile centreline');
      assert(isIsland8RouteCorridorClear(ISLAND_8_ROUTE_CLEARANCE_OUTER_RADIUS + 0.2, 0, 0.16), 'outer garden beds may begin beyond the route with clearance');
      assert(
        ISLAND_8_FLOWER_BORDER_INNER_RADIUS - ISLAND_8_FLOWER_BORDER_MAX_FOOTPRINT >= ISLAND_8_ROUTE_CLEARANCE_OUTER_RADIUS,
        'the inner flower-border row must remain beyond the protected tile corridor',
      );
      assert(
        isIsland8RouteCorridorClear(ISLAND_8_FLOWER_BORDER_OUTER_RADIUS, 0, ISLAND_8_FLOWER_BORDER_MAX_FOOTPRINT),
        'the outer flower-border row must preserve route clearance at full petal footprint',
      );
      const materials = createIsland8EverblossomMaterials();
      const roots = ISLAND_5_LANDMARKS.map((landmark) => buildIsland8EverblossomLandmark(landmark, 3, 'low', materials));
      const silhouettes = roots.map((root) => {
        const bounds = new THREE.Box3().setFromObject(root);
        const size = bounds.getSize(new THREE.Vector3());
        return `${size.x.toFixed(2)}:${size.y.toFixed(2)}:${size.z.toFixed(2)}`;
      });
      assertEqual(new Set(silhouettes).size, 5, 'all five Everblossom L3 landmarks need distinct bounding silhouettes');
      const citadel = roots.find((root) => root.name.includes('BOSS'))!;
      const citadelHeight = new THREE.Box3().setFromObject(citadel).getSize(new THREE.Vector3()).y;
      const satelliteHeights = roots.filter((root) => root !== citadel).map((root) => new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y);
      assert(citadelHeight > Math.max(...satelliteHeights), 'Blossom Crown Citadel must remain the dominant vertical landmark');
      roots.forEach((root) => root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
          objectMaterials.forEach((material) => material.dispose());
        }
      }));
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const worldSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island8EverblossomThreeWorld.ts', 'utf8');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(worldSource.includes("root.name = 'ISLAND_8_BLOSSOM_CROWN_CITADEL'"), 'Island 008 needs its unique central citadel factory');
      assert(worldSource.includes("outerCrown"), 'Citadel L3 needs a monumental open crown silhouette');
      assert(worldSource.includes("root.name = 'ISLAND_8_SUNFLOWER_RHYTHM_PAVILION'"), 'Habit must remain an open sunflower pavilion');
      assert(worldSource.includes("root.name = 'ISLAND_8_LEAFROOF_GARDEN_HALL'"), 'Mystery must retain a broad leafroof silhouette');
      assert(worldSource.includes("root.name = 'ISLAND_8_ORCHID_CRYSTAL_ARCHIVE'"), 'Wisdom must retain a faceted orchid-crystal silhouette');
      assert(worldSource.includes("butterflyRoot.name = 'ISLAND_8_BUTTERFLY_DEPTH_LAYERS'"), 'Everblossom needs quality-scaled butterfly depth layers');
      assert(worldSource.includes("waterfallRoot.name = 'ISLAND_8_SPRING_WATERFALL_NETWORK'"), 'Everblossom needs visible spring and waterfall motion');
      assert(worldSource.includes("border.name = 'ISLAND_8_TILE_RING_FLOWER_BORDER'"), 'Everblossom needs a deliberate flower border outside the tile ring');
      assert(pilotSource.includes("isEverblossomKingdom || isAbyssalPearlKingdom") || pilotSource.includes("isAbyssalPearlKingdom || isEverblossomKingdom"), 'Island 008 must participate in shared renderer conditionals without a separate gameplay shell');
      assert(pilotSource.includes("new URLSearchParams(window.location.search).get('island3dMapStripped') === '1'"), 'Island 008 must retain deterministic map-stripped evidence mode');
    },
  },
  {
    name: 'exports the Island 008 action-ready runtime hierarchy',
    run: () => {
      const root = new THREE.Group();
      root.name = 'ISLAND_8_ACTION_READY_TEST_ROOT';
      root.userData.sculptRuntime = {
        clickable: true,
        explodable: true,
        parts: ISLAND_8_RUNTIME_PART_IDS.map((partId) => {
          const pivot = new THREE.Object3D();
          pivot.name = `ISLAND_8_${partId.toUpperCase()}_PIVOT`;
          root.add(pivot);
          return registerIsland8RuntimePart(partId, pivot, 'contract-test');
        }),
        sockets: { focus: 'ISLAND_8_TEST_FOCUS_SOCKET' },
        colliders: [{ id: 'test-trigger', type: 'box', isTrigger: true }],
        destructionGroups: [{ id: 'static-world', breakable: false }],
      };
      const manifest = collectIsland8RuntimePartManifest([root]);
      assertEqual(new Set(manifest.parts.map((part) => part.name)).size, ISLAND_8_RUNTIME_PART_IDS.length, 'every Island 008 runtime part needs a stable selectable ID');
      assert(root.userData.sculptRuntime.clickable && root.userData.sculptRuntime.explodable, 'Island 008 roots must expose click and exploded-review intent');
      assert(root.userData.sculptRuntime.sockets.focus, 'Island 008 roots need a named focus socket');
      assert(root.userData.sculptRuntime.colliders.length > 0, 'Island 008 roots need collider intent');
    },
  },
  {
    name: 'exports the Island 007 action-ready runtime hierarchy from built Three objects',
    run: () => {
      const root = new THREE.Group();
      root.name = 'ISLAND_7_ACTION_READY_TEST_ROOT';
      root.userData.sculptRuntime = {
        clickable: true,
        explodable: true,
        parts: ISLAND_7_RUNTIME_PART_IDS.map((partId) => {
          const pivot = new THREE.Object3D();
          pivot.name = `ISLAND_7_${partId.toUpperCase()}_PIVOT`;
          root.add(pivot);
          return registerIsland7RuntimePart(partId, pivot, 'contract-test');
        }),
        sockets: { focus: 'ISLAND_7_TEST_FOCUS_SOCKET' },
        colliders: [{ id: 'test-trigger', type: 'box', isTrigger: true }],
        destructionGroups: [{ id: 'static-world', breakable: false }],
      };
      const manifest = collectIsland7RuntimePartManifest([root]);
      assertEqual(new Set(manifest.parts.map((part) => part.name)).size, ISLAND_7_RUNTIME_PART_IDS.length, 'every specified runtime part needs a stable selectable ID');
      assert(manifest.parts.every((part) => part.kind === 'part' && part.nodeName), 'runtime records must identify their backing pivot node');
      assert(root.userData.sculptRuntime.clickable && root.userData.sculptRuntime.explodable, 'the hierarchy must expose click and exploded-review intent');
      assert(root.userData.sculptRuntime.sockets.focus, 'action-ready roots need a named focus socket');
      assert(root.userData.sculptRuntime.colliders.length > 0, 'action-ready roots need collider intent');
      assert(root.userData.sculptRuntime.destructionGroups.length > 0, 'action-ready roots need explicit destruction grouping');
    },
  },
  {
    name: 'keeps Abyssal Pearl scenery outside the protected route and preserves adaptive living-water systems',
    run: async () => {
      assert(isIsland7RouteCorridorClear(ISLAND_7_ROUTE_CLEARANCE_INNER_RADIUS - 0.2, 0, 0.16), 'inner palace gardens may remain inside the route with clearance');
      assert(!isIsland7RouteCorridorClear(3.4, 0, 0.01), 'underwater coral may not enter the canonical tile centreline');
      assert(isIsland7RouteCorridorClear(ISLAND_7_ROUTE_CLEARANCE_OUTER_RADIUS + 0.2, 0, 0.16), 'outer reef gardens may begin beyond the route with clearance');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const worldSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island7UnderwaterThreeWorld.ts', 'utf8');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(worldSource.includes("root.name = 'ISLAND_7_FISH_SCHOOLS'"), 'Island 007 needs independently animated fish schools');
      assert(worldSource.includes("root.name = 'ISLAND_7_BUBBLE_FIELD'"), 'Island 007 needs a quality-scaled bubble field');
      assert(worldSource.includes("surface.name = 'ISLAND_7_WATER_SURFACE_CEILING'"), 'Island 007 needs a readable animated water-surface ceiling');
      assert(worldSource.includes("submarineOrbit.name = 'ISLAND_7_SUBMARINE_ORBIT'"), 'Island 007 needs its distinctive fantasy submarine ambience');
      assert(worldSource.includes("animatedKelp.name = 'ISLAND_7_ANIMATED_KELP_GARDEN'"), 'animated kelp must remain outside static geometry compaction');
      assert(worldSource.includes("quality === 'high' ? 96 : quality === 'medium' ? 58 : 28"), 'bubble density must scale across all three device tiers');
      assert(worldSource.includes('new THREE.InstancedMesh(geometry, materials.bubble, count)'), 'bubble ambience must stay one instanced draw-call family');
      assert(worldSource.includes("'ISLAND_7_PORTAL_VORTEX_RING'"), 'the Compass Current needs a preserved animated outer vortex');
      assert(worldSource.includes("'ISLAND_7_PORTAL_INNER_VORTEX'"), 'the Compass Current needs a counter-rotating inner vortex');
      assert(worldSource.includes('portalVortexRings.forEach'), 'portal current depth must animate without per-frame scene traversal');
      assert(worldSource.includes('isIsland7RouteCorridorClear(fanX, fanZ, scale * 0.34)'), 'architectural sea fans must independently clear the canonical route');
      assert(worldSource.includes('const surfaceUpdateInterval'), 'water-surface deformation must be cadence-limited per quality tier');
      assert(worldSource.includes('const focusView = cameraPosition.distanceTo(cameraTarget) < 13.5'), 'underwater landmark focus must cull distant transparent ambience by camera semantics');
      assert(worldSource.includes('const sideOrbitView = !focusView'), 'side-orbit cameras must cull only off-camera hero fauna before the geometry budget is sampled');
      assert(pilotSource.includes('livingAmbience.updateView?.(camera.position, controls.target);'), 'view culling must receive the active camera target without reading gameplay state');
      assert(pilotSource.includes("new URLSearchParams(window.location.search).get('island3dMapStripped') === '1'"), 'the Gauntlet must expose a deterministic map-stripped evidence route');
      assert(pilotSource.includes('if (object instanceof THREE.Points)'), 'map-stripped structural evidence must hide particles instead of flattening them into opaque clay');
      assert(pilotSource.includes('new THREE.MeshNormalMaterial'), 'map-stripped evidence must expose form and facing without authored maps or PBR response');
      assert(pilotSource.includes('opacity: sourceMaterial.transparent'), 'map-stripped evidence must preserve transparent envelope depth rather than occluding the island');
      assert(!pilotSource.includes('scene.overrideMaterial = evidenceOverrideMaterial'), 'map-stripped evidence must not use one opaque scene override that blanks the water volume');
      assert(worldSource.includes('bubblePosition.set('), 'bubble animation must reuse scratch vectors instead of allocating per bubble per frame');
      assert(!worldSource.includes('shaft.position.x +='), 'light shafts must use absolute time-based motion without cumulative drift');
      assert(!worldSource.includes('fish.position.y +='), 'foreground fish must not accumulate frame-rate-dependent vertical drift');
      assert(!worldSource.includes('jelly.rotation.y +='), 'jellyfish rotation must remain elapsed-time based across frame rates');
      assert(pilotSource.includes("'/assets/islands/island-007/background/abyssal-cavern-backdrop-v1.webp'"), 'underwater depth backdrop must remain an optimized WebP asset');
      assert(pilotSource.includes('ISLAND_7_TILE_BORDER_BATCH_'), 'the clean underwater route needs restrained, instanced gilded edging');
      assert(pilotSource.includes('createTileBorderMeshGeometry(tileGeometry)'), 'all 36 underwater tiles must share one border geometry');
      assert(pilotSource.includes('ISLAND_7_TILE_SURFACE_BATCH_'), 'underwater tile surfaces must remain batched while preserving landing impacts');
      assert(pilotSource.includes('object instanceof THREE.LineSegments'), 'generic scene cleanup must dispose shared line geometry and materials');
    },
  },
  {
    name: 'keeps Moonveil scenery outside the protected 36-tile route corridor',
    run: async () => {
      assert(isIsland6RouteCorridorClear(ISLAND_6_ROUTE_CLEARANCE_INNER_RADIUS - 0.2, 0, 0.18), 'inner sanctuary scenery may remain inside the route with clearance');
      assert(!isIsland6RouteCorridorClear(3.4, 0, 0.01), 'no scenery footprint may occupy the canonical route centreline');
      assert(isIsland6RouteCorridorClear(ISLAND_6_ROUTE_CLEARANCE_OUTER_RADIUS + 0.2, 0, 0.18), 'bridge and exterior architecture may begin outside the route with clearance');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const moonveilSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island6MoonveilThreeWorld.ts', 'utf8');
      assert(!pilotSource.includes('ISLAND_6_ASTRAL_TILE_SIGIL'), 'non-semantic astral sigils must not decorate playable tile tops');
      assert(moonveilSource.includes('if (!isMainShelf) addRing'), 'architectural shelf trim must not cross the main playable route');
      assert(moonveilSource.includes('terrace.position.y = isMainShelf ? 0.24 : 0.36'), 'main shelf terrace must remain below the real tile blocks');
      assert(pilotSource.includes('createIslandRunTileRewardThreeObjects'), 'canonical tile-bound reward projections must remain available after scenery cleanup');
    },
  },
  {
    name: 'maps canonical board tiles to presentation-only 3D reward identities',
    run: () => {
      assertEqual(resolveIslandRunTileRewardObjectKind({ tileType: 'free_ticket', isActiveDoorCluster: false }), 'golden_event_ticket', 'ticket tiles need a readable golden ticket');
      assertEqual(resolveIslandRunTileRewardObjectKind({ tileType: 'currency', isActiveDoorCluster: false }), 'essence_crystal', 'currency tiles keep the canonical Essence identity');
      assertEqual(resolveIslandRunTileRewardObjectKind({ tileType: 'micro', isActiveDoorCluster: false }), 'universal_reward_token', 'ordinary reward progress may use the Universal Reward Token visual language');
      assertEqual(resolveIslandRunTileRewardObjectKind({ tileType: 'landmark_door', isActiveDoorCluster: true }), 'active_landmark_door', 'only the active door cluster gets a door sigil');
      assertEqual(resolveIslandRunTileRewardObjectKind({ tileType: 'landmark_door', isActiveDoorCluster: false }), null, 'inactive doors must not imply a collectible reward');
    },
  },
  {
    name: 'gives First Light Kingdom quality-scaled springs, cascades, foam and fauna',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const worldSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island1ThreeWorld.ts', 'utf8');
      assert(worldSource.includes('const cascadeCount = lifeBudget.cascadeCount;'), 'First Light should source cascade density from the audited quality budget');
      assert(worldSource.includes("springPools.name = 'ISLAND_1_CRYSTAL_SPRING_POOLS'"), 'each cascade needs a visible spring source on the island');
      assert(worldSource.includes("plungeFoam.name = 'ISLAND_1_WATERFALL_PLUNGE_FOAM'"), 'waterfalls need animated contact foam at sea level');
      assert(worldSource.includes("flowHighlights.name = 'ISLAND_1_CASCADE_FLOW_HIGHLIGHTS'"), 'water motion should read down the complete course, not as a static blue plane');
      assert(worldSource.includes('const birdCount ='), 'First Light needs airborne fauna above the island');
      assert(worldSource.includes('const butterflyCount ='), 'First Light gardens need close-range fauna');
      assert(worldSource.includes('const fishCount ='), 'the inner lagoon needs visible aquatic life on capable phones');
      assert(worldSource.includes("springRipples.name = 'ISLAND_1_SPRING_SOURCE_RIPPLES'"), 'spring sources need a readable medium-speed ripple rhythm');
      assert(worldSource.includes("dawnMotes.name = 'ISLAND_1_DAWN_GARDEN_MOTES'"), 'capable phones need one draw-call atmospheric garden life');
      assert(worldSource.includes('ISLAND_1_SHORELINE_WAVE_FRONT_'), 'the ocean edge needs broken moving wave fronts rather than one mechanical full ring');
      assert(worldSource.includes("islet.name = 'ISLAND_1_OCEAN_ROOTED_SEA_STACK'"), 'distant First Light islands must visibly root into the shared ocean instead of levitating');
      assert(!worldSource.includes('addFloatingIslet'), 'First Light must not reintroduce levitating background islands');
      assert(worldSource.includes('animate: (elapsed) =>'), 'water and fauna should share the one ambience animation clock');
    },
  },
  {
    name: 'scales the First Light life rhythm without removing essential water motion on Low',
    run: async () => {
      const low = getIsland1AmbienceLifeBudget('low');
      const medium = getIsland1AmbienceLifeBudget('medium');
      const high = getIsland1AmbienceLifeBudget('high');
      assertEqual(low.cascadeCount, 6, 'Low must retain the essential living-water identity');
      assertEqual(low.shorelineWaveCount, 1, 'Low should retain one restrained shoreline wave front');
      assertEqual(low.dawnMoteCount, 0, 'Low should remove optional micro-atmosphere');
      assertEqual(low.skiffCount, 1, 'Low should retain one readable inhabited-world anchor');
      assert(medium.cascadeCount > low.cascadeCount, 'Medium should add water detail');
      assert(high.shorelineWaveCount > medium.shorelineWaveCount, 'High should receive richer broken shoreline motion');
      assert(high.dawnMoteCount > medium.dawnMoteCount, 'High should receive the fuller dawn-mote field');
      assert(high.skiffCount > medium.skiffCount, 'High should receive the fuller distant sun-skiff fleet');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const viewUpdateIndex = pilotSource.indexOf('livingAmbience.updateView?.(camera.position, controls.target);');
      const reducedMotionIndex = pilotSource.indexOf('if (!isReducedMotion) {', viewUpdateIndex);
      const animateIndex = pilotSource.indexOf('livingAmbience.animate(elapsed);', reducedMotionIndex);
      assert(viewUpdateIndex >= 0 && viewUpdateIndex < reducedMotionIndex, 'camera-side scenery culling must still run in reduced-motion mode');
      assert(reducedMotionIndex >= 0 && reducedMotionIndex < animateIndex, 'decorative ambience must remain inside the reduced-motion guard');
    },
  },
  {
    name: 'keeps First Light clouds safely elevated around all 360 degrees and budgets a distant mountain horizon',
    run: () => {
      const lowClouds = buildIsland1CloudLayout('low');
      const mediumClouds = buildIsland1CloudLayout('medium');
      const highClouds = buildIsland1CloudLayout('high');
      assertEqual(lowClouds.length, 4, 'Low should keep one cloud anchor in every broad viewing quadrant');
      assertEqual(mediumClouds.length, 6, 'Medium should add a fuller sky ring');
      assertEqual(highClouds.length, 8, 'High should receive the complete cloud ring');
      highClouds.forEach((cloud) => {
        assert(cloud.minimumY >= ISLAND_1_CLOUD_MINIMUM_Y, 'every cloud lower bound must stay above the audited sky clearance plane');
        assert(cloud.minimumY > ISLAND_1_OCEAN_SURFACE_Y + 5.5, 'cloud geometry must remain physically separated from the ocean even during vertical drift');
      });
      const cloudQuadrants = new Set(lowClouds.map((cloud) => Math.floor(((cloud.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 2))));
      assertEqual(cloudQuadrants.size, 4, 'even Low must cover the complete orbit instead of putting all clouds behind one camera');

      const lowMountains = buildIsland1MountainLayout('low');
      const mediumMountains = buildIsland1MountainLayout('medium');
      const highMountains = buildIsland1MountainLayout('high');
      assertEqual(lowMountains.length, 4, 'Low should preserve a readable distant archipelago with restrained geometry');
      assertEqual(mediumMountains.length, 6, 'Medium should add horizon variety');
      assertEqual(highMountains.length, 8, 'High should receive the full distant mountain archipelago');
      highMountains.forEach((mountain) => {
        assert(mountain.radius >= 20, 'mountains must remain far beyond the island foreground');
        assert(mountain.radius < 30, 'mountains must remain safely inside the normal camera orbit');
        assert(mountain.height >= 1.08, 'distant peaks must remain readable at phone scale');
      });
      assertDeepEqual(buildIsland1CloudLayout('high'), highClouds, 'cloud placement must remain deterministic across renders');
      assertDeepEqual(buildIsland1MountainLayout('high'), highMountains, 'mountain placement must remain deterministic across renders');
    },
  },
  {
    name: 'lets repeated rolls keep their framing and restores overview only after idle',
    run: async () => {
      assert(ISLAND_3D_IDLE_OVERVIEW_DELAY_MS >= 3_000, 'overview drift should wait long enough for another roll to interrupt it');
      assert(ISLAND_3D_IDLE_OVERVIEW_DURATION_SCALE >= 2.5, 'idle return should be substantially slower than a normal camera cut');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(pilotSource.includes('idleOverviewAt = now + ISLAND_3D_IDLE_OVERVIEW_DELAY_MS'), 'landing should schedule a delayed overview instead of snapping out immediately');
      assert(pilotSource.includes('idleOverviewAt = null;\n        transition = null;'), 'a new roll must cancel any pending idle overview');
      assert(pilotSource.includes("applyPreset('overview', ISLAND_3D_IDLE_OVERVIEW_DURATION_SCALE)"), 'idle framing should use the deliberately slow drift');
      assert(boardSource.includes('cameraOverviewRequestVersion={threeCameraOverviewRequestVersion}'), 'live board must connect its overview request to the 3D renderer');
      assert(boardSource.includes('setThreeCameraOverviewRequestVersion((current) => current + 1)'), 'magnifier presses must remain repeatable even when already in overview mode');
      assert(boardSource.includes('aria-label="Zoom out to the full island overview"'), 'magnifier needs an accurate accessible action label');
      assert(pilotSource.includes("preset: 'survey',"), 'magnifier must select the widest full-island camera preset');
    },
  },
  {
    name: 'builds deterministic symmetrical chateau gardens outside the playable route',
    run: () => {
      const lowLayout = buildIsland5AmbienceLayout(ISLAND_3D_QUALITY_PROFILES.low);
      const mediumLayout = buildIsland5AmbienceLayout(ISLAND_3D_QUALITY_PROFILES.medium);
      const highLayout = buildIsland5AmbienceLayout(ISLAND_3D_QUALITY_PROFILES.high);
      assertEqual(lowLayout.length, 40, 'Low should keep a deliberate but restrained formal garden');
      assertEqual(mediumLayout.length, 88, 'Medium should add denser parterres without arbitrary scatter');
      assertEqual(highLayout.length, 168, 'High should receive the complete chateau-garden population');
      assertDeepEqual(
        buildIsland5AmbienceLayout(ISLAND_3D_QUALITY_PROFILES.high),
        highLayout,
        'ambience placement must remain deterministic across renders',
      );
      highLayout.forEach((point) => {
        assert(Math.hypot(point.position[0], point.position[2]) > 4.3, 'garden scenery must stay outside the canonical route corridor');
      });
      const east = highLayout[0];
      const west = highLayout[4];
      assertEqual(east.kind, west.kind, 'opposite parterre points should use the same clipped planting');
      assert(Math.abs(east.position[0] + west.position[0]) < 0.00001, 'formal garden x positions should mirror through the island center');
      assert(Math.abs(east.position[2] + west.position[2]) < 0.00001, 'formal garden z positions should mirror through the island center');
      assertEqual(ISLAND_3D_QUALITY_PROFILES.low.birdFlockCount, 0, 'Low should remove airborne wildlife animation');
      assert(ISLAND_3D_QUALITY_PROFILES.high.cloudWispCount > ISLAND_3D_QUALITY_PROFILES.low.cloudWispCount, 'strong phones should receive richer parallax atmosphere');
      assert(ISLAND_3D_QUALITY_PROFILES.high.waterSparkleCount > ISLAND_3D_QUALITY_PROFILES.medium.waterSparkleCount, 'water life should scale with phone tier');
    },
  },
  {
    name: 'scales living ocean and maritime ambience from calm Low to a High armada',
    run: async () => {
      const low = ISLAND_3D_QUALITY_PROFILES.low;
      const medium = ISLAND_3D_QUALITY_PROFILES.medium;
      const high = ISLAND_3D_QUALITY_PROFILES.high;
      assertEqual(low.oceanGridSegments, 12, 'Low should keep a small deforming ocean grid');
      assertEqual(low.oceanWaveBandCount, 2, 'Low should keep only two batched wave bands');
      assertEqual(low.oceanUpdateFps, 20, 'Low ocean animation should be cadence-limited');
      assertEqual(low.coastalStrataDetail, 24, 'Low should retain a readable but restrained rock edge');
      assertEqual(low.shoreBreakLayerCount, 1, 'Low should keep one batched breaker layer per coast');
      assertEqual(medium.coastalStrataDetail, 56, 'Medium should add a fuller layered cliff silhouette');
      assertEqual(medium.shoreBreakLayerCount, 2, 'Medium should keep two breaker layers per coast');
      assertEqual(high.coastalStrataDetail, 96, 'High should receive the complete coastal rock strata');
      assertEqual(high.shoreBreakLayerCount, 3, 'High should receive three breaker layers per coast');
      assertEqual(low.distantShipCount, 0, 'Low should spend no geometry budget on distant ships');
      assertEqual(medium.distantShipCount, 2, 'Medium should retain a flagship and one escort');
      assertEqual(high.distantShipCount, 4, 'High should show a flagship, two escorts and a pirate brig');
      assert(high.oceanGridSegments > medium.oceanGridSegments, 'High should receive smoother ocean deformation');
      assert(high.oceanWaveBandCount > medium.oceanWaveBandCount, 'High should receive more depth bands');
      assert(high.oceanUpdateFps > medium.oceanUpdateFps, 'High should animate the ocean more fluidly');

      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilotSource.includes('isAbyssalPearlKingdom ? 1 : qualityProfile.oceanGridSegments'), 'ordinary islands must retain the quality-scaled ocean grid while Island 007 skips the hidden grid cost');
      assert(pilotSource.includes("waveBands.name = 'ISLAND_5_OCEAN_WAVE_BANDS'"), 'traveling wave bands should remain one addressable instanced layer');
      assert(pilotSource.includes('function createErodedCoastalCylinderGeometry'), 'terrain plates should use deterministic erosion instead of perfect cylinders');
      assert(pilotSource.includes("strata.name = 'ISLAND_5_INSTANCED_COASTAL_ROCK_STRATA'"), 'layered coastal rocks should remain one instanced draw-call family');
      assert(pilotSource.includes("shallows.name = 'ISLAND_5_COASTAL_SHALLOWS'"), 'coastal water should carry an independently art-directable shallow shelf');
      assert(pilotSource.includes("shoreBreakers.name = 'ISLAND_5_INSTANCED_SHORE_BREAKERS'"), 'coast-aware breaker crests should remain one instanced animation family');
      assert(pilotSource.includes('shoreline.animate(elapsed)'), 'coastal breakers should animate inside the existing reduced-motion-gated ambience loop');
      assert(pilotSource.includes('positions.needsUpdate = true'), 'ocean displacement must update the existing GPU buffer rather than recreate geometry');
      assert(pilotSource.includes('function createIsland5DistantFleet'), 'maritime life should remain an independently art-directable ambience system');
      assert(pilotSource.includes("armada.name = 'ISLAND_5_ROYAL_ARMADA'"), 'High and Medium need a separately addressable royal fleet');
      assert(pilotSource.includes("pirateBrig.name = 'ISLAND_5_PIRATE_BRIG'"), 'High needs a distinct opposing pirate silhouette');
      assert(pilotSource.includes("compactStaticGeometry(armada, 'ISLAND5_ROYAL_ARMADA')"), 'armada ships should be material-batched before phone rendering');
      assert(pilotSource.includes('const presenceSeed'), 'bird flocks should appear occasionally instead of remaining permanent orbit clutter');
      assert(pilotSource.includes('if (!isReducedMotion)'), 'continuous ambience must remain behind the reduced-motion gate');
    },
  },
  {
    name: 'builds one deterministic actual-3D tile transform for every canonical Spark36 anchor',
    run: () => {
      const transforms = buildIsland5TileTransforms(TILE_ANCHORS_36);
      assertEqual(transforms.length, 36, '3D pilot must preserve all 36 canonical tiles');
      assertEqual(new Set(transforms.map((transform) => transform.id)).size, 36, '3D tile ids should remain unique');
      assertEqual(transforms.filter((transform) => transform.isKeyTile).length, 6, 'six evenly spaced key tiles should remain visually marked');
      transforms.forEach((transform) => {
        assert(Number.isFinite(transform.position[0]) && Number.isFinite(transform.position[2]), `tile ${transform.id} position must be finite`);
        assert(Number.isFinite(transform.rotationYRad), `tile ${transform.id} rotation must be finite`);
      });
    },
  },
  {
    name: 'fits tapered 3D tile blocks inside their radial sectors without inner-ring overlap',
    run: async () => {
      const geometry = resolveIsland3DRadialTileGeometry(TILE_ANCHORS_36.length);
      const halfSectorAngle = Math.PI / geometry.tileCount;
      const availableInnerWidth = 2 * geometry.innerRadius * Math.tan(halfSectorAngle);
      const availableOuterWidth = 2 * geometry.outerRadius * Math.tan(halfSectorAngle);
      assert(geometry.innerWidth < geometry.outerWidth, 'the inner short edge must be narrower than the outer short edge');
      assert(geometry.innerWidth < availableInnerWidth, 'the inner edge must leave a positive neighbour joint');
      assert(geometry.outerWidth < availableOuterWidth, 'the outer edge must leave a positive neighbour joint');
      assert(Math.abs((availableInnerWidth - geometry.innerWidth) - geometry.jointGap) < 0.000001, 'inner joint must match the shared clearance');
      assert(Math.abs((availableOuterWidth - geometry.outerWidth) - geometry.jointGap) < 0.000001, 'outer joint must match the shared clearance');

      const peakImpact = getIsland3DTileImpactPose(76, 1.5);
      assert((geometry.innerWidth * peakImpact.scaleXZ) < availableInnerWidth, 'maximum landing squash must not recreate inner overlap');
      assert((geometry.outerWidth * peakImpact.scaleXZ) < availableOuterWidth, 'maximum landing squash must not recreate outer overlap');

      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilotSource.includes("facetedGeometry.name = 'ISLAND_SHARED_RADIAL_TILE_TRAPEZOID'"), 'all three worlds must use the one shared tapered geometry');
      assert(!pilotSource.includes('new THREE.BoxGeometry(0.62, 0.18, 0.92)'), 'the overlapping rectangular tile geometry must remain retired');
    },
  },
  {
    name: 'keeps every radial tile face outward so the top surface remains visible',
    run: () => {
      const mesh = buildIsland3DRadialTileMeshData(TILE_ANCHORS_36.length);
      const normalForTriangle = (offset: number): readonly [number, number, number] => {
        const [ia, ib, ic] = mesh.indices.slice(offset, offset + 3);
        const vertex = (index: number) => mesh.positions.slice(index * 3, index * 3 + 3);
        const [ax, ay, az] = vertex(ia);
        const [bx, by, bz] = vertex(ib);
        const [cx, cy, cz] = vertex(ic);
        const ab = [bx - ax, by - ay, bz - az];
        const ac = [cx - ax, cy - ay, cz - az];
        return [
          (ab[1] * ac[2]) - (ab[2] * ac[1]),
          (ab[2] * ac[0]) - (ab[0] * ac[2]),
          (ab[0] * ac[1]) - (ab[1] * ac[0]),
        ];
      };

      assert(normalForTriangle(0)[1] < 0, 'bottom face must point downward');
      assert(normalForTriangle(6)[1] > 0, 'top face must point upward toward the game camera');
      assert(normalForTriangle(12)[2] < 0, 'outer wall must point away from the ring');
      assert(normalForTriangle(18)[0] > 0, 'right wall must point outward');
      assert(normalForTriangle(24)[2] > 0, 'inner wall must point toward the ring centre');
      assert(normalForTriangle(30)[0] < 0, 'left wall must point outward');
    },
  },
  {
    name: 'maps canonical token indices onto the 3D route with a grounded hop arc',
    run: () => {
      const transforms = buildIsland5TileTransforms(TILE_ANCHORS_36);
      const tileZero = getIsland5TokenGroundPosition(transforms, 0);
      const wrappedTileZero = getIsland5TokenGroundPosition(transforms, 36);
      const previousTile = getIsland5TokenGroundPosition(transforms, -1);
      assertEqual(wrappedTileZero[0], tileZero[0], 'token lookup should wrap with the canonical board length');
      assertEqual(wrappedTileZero[2], tileZero[2], 'wrapped token lookup should preserve canonical z position');
      assertEqual(previousTile[0], getIsland5TokenGroundPosition(transforms, 35)[0], 'negative token indices should wrap safely');
      const destination = getIsland5TokenGroundPosition(transforms, 1);
      const hopStart = getIsland3DTokenHopPosition(tileZero, destination, 0);
      const hopMidpoint = getIsland3DTokenHopPosition(tileZero, destination, 0.5);
      const hopEnd = getIsland3DTokenHopPosition(tileZero, destination, 1);
      assertEqual(hopStart[0], tileZero[0], 'hop must begin on the canonical current tile');
      assertEqual(hopEnd[0], destination[0], 'hop must finish on the canonical destination tile');
      assert(hopMidpoint[1] >= tileZero[1] + ISLAND_3D_TOKEN_HOP_ARC_HEIGHT - 0.001, 'mid-hop piece should lift clearly above the route');
    },
  },
  {
    name: 'keeps weighted landings grounded and gives the visible 3D renderer one completion clock',
    run: async () => {
      assertEqual(resolveIsland3DLandingImpact(undefined), 'standard', 'workbench and ordinary fallback landings stay restrained');
      assertEqual(resolveIsland3DLandingImpact('currency'), 'standard', 'currency tiles use the normal landing beat');
      assertEqual(resolveIsland3DLandingImpact('chest'), 'special', 'chests receive the stronger final landing');
      assertEqual(resolveIsland3DLandingImpact('landmark_door'), 'special', 'landmark doors receive the stronger final landing');
      assertEqual(resolveIsland3DLandingImpact('hazard'), 'hazard', 'hazards retain a distinct forceful response');

      const impactStart = getIsland3DTileImpactPose(0, 1);
      const impactCompression = getIsland3DTileImpactPose(ISLAND_3D_TILE_IMPACT_DURATION_MS * 0.18, 1);
      const impactEnd = getIsland3DTileImpactPose(ISLAND_3D_TILE_IMPACT_DURATION_MS, 1);
      assertEqual(impactStart.yOffset, 0, 'tile response starts at its authored transform');
      assert(impactCompression.yOffset < 0, 'impact briefly depresses the landed tile');
      assert(impactCompression.scaleY < 1, 'impact compresses tile height rather than moving board topology');
      assertEqual(impactEnd.yOffset, 0, 'tile response returns exactly to its authored transform');
      assertEqual(impactEnd.scaleY, 1, 'tile response returns to canonical scale');

      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(pilotSource.includes('if (!isRolling && pendingHopSequence === null)'), '3D token must ignore the canonical early destination while the dice roll owns presentation');
      assert(pilotSource.includes('const tileMeshes = new Map'), 'tile response must reuse existing Three meshes instead of React gameplay mirrors');
      assert(pilotSource.includes('ISLAND_3D_SPECIAL_HOP_ARC_BOOST'), 'special tiles should strengthen one continuous grounded hop instead of starting a second hover hop');
      assert(!pilotSource.includes('ISLAND_3D_SPECIAL_LANDING_SPLIT'), 'the unstable split landing clock must stay retired');
      assert(pilotSource.includes('activeTokenSettle.position[1] + pose.yOffset'), 'the settled token must follow the responding tile surface without hovering above it');
      assert(pilotSource.includes('onHopSequenceCompleteRef.current?.()'), 'the visible 3D renderer must signal its own true completion');
      assert(boardSource.includes('isRolling={isRolling}'), 'live shell must pass its existing presentation guard into the 3D renderer');
      assert(boardSource.includes('landingTileType={landmarkDoorTileMap[tokenIndex]?.tileType}'), 'special landing strength must derive from the canonical tile map');
      assert(boardSource.includes('pendingHopSequence={shouldRenderIsland5Three ? null : pendingHopSequence}'), 'the hidden 2D board must not run a competing hop clock while 3D is visible');
      assert(boardSource.includes('onHopSequenceComplete={handleHopSequencePresentationComplete}'), 'the visible 3D renderer must release the canonical presentation barrier');
    },
  },
  {
    name: 'keeps five stable Island 5 landmark identities and mirrored satellite massing',
    run: () => {
      assertEqual(ISLAND_5_LANDMARKS.length, 5, 'pilot should expose central boss plus four satellite landmarks');
      assertEqual(new Set(ISLAND_5_LANDMARKS.map((landmark) => landmark.id)).size, 5, 'landmark ids must be unique');
      const hatchery = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'hatchery');
      const habit = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'habit');
      const wisdom = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'wisdom');
      const event = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'event');
      assert(hatchery && habit && wisdom && event, 'all four satellite landmarks should exist');
      assertEqual(hatchery?.position[0], -(habit?.position[0] ?? 0), 'rear satellites should mirror across the island center');
      assertEqual(wisdom?.position[0], -(event?.position[0] ?? 0), 'front satellites should mirror across the island center');
      assertEqual(hatchery?.position[2], habit?.position[2], 'rear satellite depth should match');
      assertEqual(wisdom?.position[2], event?.position[2], 'front satellite depth should match');
    },
  },
  {
    name: 'defines reusable overview, orbit, survey, five landmarks, and the Frostwell inspection preset',
    run: () => {
      assertEqual(ISLAND_5_CAMERA_PRESETS.length, 11, 'camera rig should expose eleven reusable presets');
      assertEqual(new Set(ISLAND_5_CAMERA_PRESETS.map((preset) => preset.id)).size, 11, 'camera preset ids must be unique');
      ['overview', 'survey', 'orbit-left', 'orbit-right', 'frostwell', 'powerworks', 'boss', 'hatchery', 'habit', 'wisdom', 'event'].forEach((id) => {
        assert(ISLAND_5_CAMERA_PRESETS.some((preset) => preset.id === id), `missing camera preset ${id}`);
      });
      ISLAND_5_CAMERA_PRESETS.forEach((preset) => {
        assert(preset.durationMs >= 800 && preset.durationMs <= 1200, `${preset.id} transition should remain professionally paced`);
      });
      assertEqual(ISLAND_CAMERA_TOUR_STEPS.length, 10, 'cinematic tour should retain a deliberate ten-shot sequence');
      assertEqual(ISLAND_CAMERA_TOUR_STEPS[0]?.preset, 'overview', 'tour should establish the island before moving closer');
      assertEqual(ISLAND_CAMERA_TOUR_STEPS[ISLAND_CAMERA_TOUR_STEPS.length - 1]?.preset, 'overview', 'tour should resolve back to the canonical overview');
      ['survey', 'orbit-left', 'orbit-right', 'boss', 'hatchery', 'habit', 'wisdom', 'event'].forEach((id) => {
        assert(ISLAND_CAMERA_TOUR_STEPS.some((step) => step.preset === id), `cinematic tour must visit ${id}`);
      });
      ISLAND_CAMERA_TOUR_STEPS.forEach((step) => {
        assert(step.holdMs >= 700 && step.holdMs <= 1200, `${step.preset} hold should remain readable without stalling`);
      });
    },
  },
  {
    name: 'summarizes a deterministic 30-second profile against quality-specific phone targets',
    run: () => {
      assertEqual(ISLAND_3D_PROFILE_DURATION_MS, 30_000, 'device evidence run should remain long enough to expose recurring frame spikes');
      assert(ISLAND_3D_PERFORMANCE_TARGETS.high.minAverageFps > ISLAND_3D_PERFORMANCE_TARGETS.low.minAverageFps, 'high tier should have a stricter average FPS target');
      assert(ISLAND_3D_PERFORMANCE_TARGETS.low.slowFrameMs > ISLAND_3D_PERFORMANCE_TARGETS.high.slowFrameMs, 'slow-frame threshold should respect each tier target');

      const highPass = summarizeIsland3DPerformance(Array.from({ length: 1_800 }, () => 16.67), 'high');
      assertEqual(highPass.rating, 'pass', 'stable 60 FPS should pass High');
      assert(highPass.averageFps >= 59.9, '60 FPS profile should summarize near 60 FPS');
      assertEqual(highPass.slowFrameCount, 0, 'stable 60 FPS should have no slow frames');

      const highReview = summarizeIsland3DPerformance(Array.from({ length: 1_460 }, () => 20.55), 'high');
      assertEqual(highReview.rating, 'review', 'stable sub-50 FPS High should require review rather than pass');

      const highFail = summarizeIsland3DPerformance(Array.from({ length: 600 }, () => 50), 'high');
      assertEqual(highFail.rating, 'fail', '20 FPS High should fail the physical-device gate');
      assertEqual(highFail.severeJankCount, 0, 'exactly 50 ms is the severe-jank boundary, not above it');

      const lowPass = summarizeIsland3DPerformance(Array.from({ length: 938 }, () => 32), 'low');
      assertEqual(lowPass.rating, 'pass', 'stable 30+ FPS should pass Low');
      assertEqual(summarizeIsland3DPerformance([], 'medium').rating, 'fail', 'empty evidence can never pass');
    },
  },
  {
    name: 'keeps Crown Citadel identity stable while embellishment scales by phone quality',
    run: async () => {
      assertEqual(CROWN_CITADEL_DESIGN_LOCK.silhouette, 'central-crowned-keep-plus-four-corner-spires', 'all tiers need the same hero silhouette');
      assertEqual(CROWN_CITADEL_DESIGN_LOCK.levelStory.length, 3, 'Citadel should have a coherent L1-L3 restoration story');
      assertEqual(CROWN_CITADEL_LEVEL_SCALES[1][1], 1, 'Citadel L1 should retain its authored foundation scale');
      assertEqual(CROWN_CITADEL_LEVEL_SCALES[2][1], 1, 'Citadel L2 should retain its authored operational scale');
      assert(CROWN_CITADEL_LEVEL_SCALES[3][0] > CROWN_CITADEL_LEVEL_SCALES[2][0], 'restored Citadel should become visibly wider at L3');
      assert(CROWN_CITADEL_LEVEL_SCALES[3][1] >= 1.2, 'restored Citadel should gain clear vertical dominance at L3');
      assert(CROWN_CITADEL_DETAIL_PROFILES.low.radialSegments < CROWN_CITADEL_DETAIL_PROFILES.high.radialSegments, 'strong phones should receive smoother curved architecture');
      assertEqual(CROWN_CITADEL_DETAIL_PROFILES.low.textureSize, 0, 'low tier should avoid runtime architectural texture memory');
      assertEqual(CROWN_CITADEL_DETAIL_PROFILES.medium.textureSize, 128, 'medium tier should use a restrained surface-map budget');
      assertEqual(CROWN_CITADEL_DETAIL_PROFILES.high.textureSize, 256, 'high tier should receive the full procedural surface maps');
      assertEqual(CROWN_CITADEL_DETAIL_PROFILES.low.balustradePosts, 0, 'low tier should remove tiny balustrade geometry');
      assert(CROWN_CITADEL_DETAIL_PROFILES.high.balustradePosts >= 16, 'high tier should retain the embellishment layer');
      assertEqual(CROWN_CITADEL_DETAIL_PROFILES.low.reefAccentCount, 0, 'low tier should remove tiny restored-reef geometry');
      assert(CROWN_CITADEL_DETAIL_PROFILES.high.reefAccentCount >= 12, 'high tier should make the L3 reef restoration readable');
      assert(!CROWN_CITADEL_DETAIL_PROFILES.low.roofRibs && CROWN_CITADEL_DETAIL_PROFILES.high.roofRibs, 'gold roof ribs should be quality-scaled ornament, not silhouette authority');

      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const citadelSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/CrownCitadelThreeModel.ts', 'utf8');
      assert(citadelSource.includes("root.name = 'CROWN_CITADEL_MODEL'"), 'hero landmark should be a separately addressable model');
      assert(citadelSource.includes("prism.name = 'CROWN_CITADEL_VOICE_PRISM'"), 'restored Citadel should carry the Voice Prism story motif');
      assert(citadelSource.includes('compactStaticGeometry(root)'), 'embellishment should be material-batched before it reaches the phone renderer');
      assert(citadelSource.includes('addRestorationReefAccents'), 'L3 should carry a quality-scaled reef and pearl restoration layer');
      assert(citadelSource.includes('addRestoredFacadeArchitecture'), 'L3 should add a layered ceremonial facade rather than scaling plain walls');
      assert(citadelSource.includes('addRestoredDrumGallery'), 'L3 should add readable window bands and a central gallery');
      assert(citadelSource.includes('addRestoredRoofTracery'), 'L3 should enrich the hero roof with gold ribs and dormer ornament');
      assert(citadelSource.includes('addRestoredFlyingButtresses'), 'L3 should connect the keep and corner towers with restored structural detail');
      assert(citadelSource.includes('restored: level === 3'), 'tower facade embellishment must remain exclusive to the restored L3 state');
      assert(citadelSource.includes('const lowerWindow'), 'restored corner towers should add a second readable window tier');
      assert(citadelSource.includes('if (level === 1)'), 'L1 must be authored as a foundation state rather than only shrinking L3');
      assert(citadelSource.includes('if (level === 3)'), 'L3 must add its restored crown state explicitly');
    },
  },
  {
    name: 'adapts quality conservatively without changing geometry authority',
    run: () => {
      assertEqual(resolveIsland3DQuality('auto', { deviceMemoryGb: 2, hardwareConcurrency: 2 }).id, 'low', 'weak device should select low');
      assertEqual(resolveIsland3DQuality('auto', { deviceMemoryGb: 6, hardwareConcurrency: 6, devicePixelRatio: 2 }).id, 'medium', 'mid device should select medium');
      assertEqual(resolveIsland3DQuality('auto', { deviceMemoryGb: 8, hardwareConcurrency: 8, devicePixelRatio: 2 }).id, 'high', 'strong device should select high');
      assertEqual(resolveIsland3DQuality('auto', { deviceMemoryGb: 16, hardwareConcurrency: 12, prefersReducedMotion: true }).id, 'low', 'reduced motion should default to the calm low-cost profile');
      assertEqual(getIsland3DRendererPixelRatio(ISLAND_3D_QUALITY_PROFILES.low, 3), 1, 'low DPR must cap at 1');
      assertEqual(getIsland3DRendererPixelRatio(ISLAND_3D_QUALITY_PROFILES.medium, 3), 1.5, 'medium DPR must cap at 1.5');
      assertEqual(getIsland3DRendererPixelRatio(ISLAND_3D_QUALITY_PROFILES.high, 3), 2, 'high DPR must cap at 2');
      assertEqual(getIsland3DRendererPixelRatio(ISLAND_3D_QUALITY_PROFILES.high, 3, 1.4), 1.4, 'a world may reserve fill-rate with a stricter DPR cap');
    },
  },
  {
    name: 'authors Tidekeeper Hall as three distinct water-first architectural tiers',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const habitStart = pilotSource.indexOf('function createHabitLandmark');
      const wisdomStart = pilotSource.indexOf('function createWisdomLandmark');
      assert(habitStart >= 0 && wisdomStart > habitStart, 'Tidekeeper source section should remain independently addressable');
      const habitSource = pilotSource.slice(habitStart, wisdomStart);
      assert(habitSource.includes('if (level === 1)'), 'Tidekeeper L1 must preserve an authored compact starting hall');
      assert(habitSource.includes('if (level === 2)'), 'Tidekeeper L2 must be an authored transformation rather than a scale step');
      assert(habitSource.includes('const tidePool'), 'upper Tidekeeper tiers must retain active water at their centre');
      assert(habitSource.includes('const dome = new THREE.Mesh'), 'Tidekeeper L2 must complete the purple ribbed rotunda');
      assert(habitSource.includes('const grandDome = new THREE.Mesh'), 'Tidekeeper L3 must add its broader palace dome explicitly');
      assert(habitSource.includes('addTidekeeperFacadeArcade'), 'upper tiers should carry a readable gold-and-window facade system');
      assert(habitSource.includes('addTidekeeperPavilion'), 'Tidekeeper L3 should carry four subordinate domed pavilions');
      assert(habitSource.includes('addTidekeeperCrescent'), 'Tidekeeper upgrades should retain the approved tidal-crescent motif');
    },
  },
  {
    name: 'authors Concord Arena as an open sports venue instead of another palace',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const eventStart = pilotSource.indexOf('function createEventLandmark');
      const textureStart = pilotSource.indexOf("type CitadelTexturePattern");
      assert(eventStart >= 0 && textureStart > eventStart, 'Concord Arena source section should remain independently addressable');
      const eventSource = pilotSource.slice(eventStart, textureStart);
      assert(eventSource.includes('addArenaField'), 'every Arena level must preserve a visible playing field');
      assert(eventSource.includes('addArenaStandRing'), 'Arena upgrades must add real spectator tiers');
      assert(eventSource.includes('addArenaTunnel'), 'Arena progression should retain a player-entry tunnel');
      assert(eventSource.includes('addArenaScoreboard'), 'operational and championship tiers need a score display');
      assert(eventSource.includes('addArenaFloodlight'), 'L3 should add championship lighting infrastructure');
      assert(eventSource.includes('if (level >= 2)') && eventSource.includes('if (level >= 3)'), 'Arena levels must remain additive authored states');
      assert(!eventSource.includes('addLandmarkTower'), 'Arena must not reuse the four-spire palace template');
      assert(!eventSource.includes('SphereGeometry'), 'Arena must keep its central pitch open instead of adding a dome');
    },
  },
  {
    name: 'authors Pearl Archive as a shelf-lined library instead of another domed palace',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const wisdomStart = pilotSource.indexOf('function createWisdomLandmark');
      const arenaHelperStart = pilotSource.indexOf('function addArenaGoal');
      assert(wisdomStart >= 0 && arenaHelperStart > wisdomStart, 'Pearl Archive source section should remain independently addressable');
      const wisdomSource = pilotSource.slice(wisdomStart, arenaHelperStart);
      assert(wisdomSource.includes('addArchiveShelfWall'), 'every Archive tier must make stored knowledge visible');
      assert(wisdomSource.includes('addArchiveGableRoof'), 'Archive upgrades should use a wide gabled library silhouette');
      assert(wisdomSource.includes('addArchiveCodex'), 'Archive progression should retain the pearl-codex focal motif');
      assert(wisdomSource.includes('addArchiveEntrance'), 'operational Archive tiers need a ceremonial reading entrance');
      assert(wisdomSource.includes('if (level === 1)') && wisdomSource.includes('const grand = level >= 3'), 'Archive levels must remain authored progression states');
      assert(wisdomSource.includes('scrollColumn'), 'restored Archive should carry scroll-column facade detail');
      assert(!wisdomSource.includes('addLandmarkTower'), 'Archive must not reuse the four-spire palace template');
      assert(!wisdomSource.includes('SphereGeometry'), 'Archive must not rebuild the rejected central dome');
    },
  },
  {
    name: 'gives every Level 1 landmark crafted architecture without changing its approved scale',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const citadelSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/CrownCitadelThreeModel.ts', 'utf8');
      [
        'addHatcheryFoundationDetail',
        'addTidekeeperHallFoundationDetail',
        'addArchiveFoundationDetail',
        'addArenaPracticeGroundDetail',
      ].forEach((helper) => {
        assert(pilotSource.includes(`function ${helper}`), `${helper} should remain an independently art-directable L1 detail layer`);
      });
      assert(pilotSource.includes("if (level === 1) addHatcheryFoundationDetail"), 'Coral Cradle detail must remain exclusive to its L1 foundation state');
      assert(pilotSource.includes('addTidekeeperHallFoundationDetail(group, materials, quality)'), 'Tidekeeper Hall L1 should retain its crafted facade and roof edging');
      assert(pilotSource.includes('addArchiveFoundationDetail(group, materials, quality)'), 'Pearl Archive L1 should retain its reading bays and processional threshold');
      assert(pilotSource.includes("if (level === 1) addArenaPracticeGroundDetail"), 'Concord Arena L1 should retain its low practice-ground seating and team markers');
      assert(citadelSource.includes('function addFoundationStageArchitecture'), 'Crown Citadel L1 should retain its ceremonial foundation architecture');
      assert(citadelSource.includes('addFoundationStageArchitecture(root, materials, quality, towerPositions)'), 'Citadel foundation detail must be assembled in the authored L1 branch');
      assertDeepEqual(CROWN_CITADEL_LEVEL_SCALES[1], [1, 1, 1], 'Level 1 Citadel size must remain exactly approved');
      assert(pilotSource.includes('Math.round(profile.shorelineDetail / 4)'), 'formal-garden ring segments must remain integral for clean WebGL geometry');
      assert(!pilotSource.includes("level === 1 ? 0.52 : level === 2 ? 0.76 : 1"), 'detail upgrades must never restore rejected scale-only corner progression');
    },
  },
  {
    name: 'uses the live Island 5 board as the Build visual without creating a second renderer',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const modalSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/BuildModalV2.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(!pilotSource.includes('Island5LandmarkBuildPreview'), 'Build mode must not create a duplicate Island 5 WebGL renderer');
      assert(!modalSource.includes('BuildModalV2ArtworkImage'), 'Build overlay must not cover the real board with standalone landmark artwork');
      assert(modalSource.includes('bm2-build-mode') && modalSource.includes('bm2-dock'), 'Build mode should be a transparent live-board overlay with a compact dock');
      assert(boardSource.includes("if (stopId === 'mystery') return 'event'"), 'Build camera should resolve Mystery to the authored Concord Arena preset');
      assert(boardSource.includes('cameraFocusPreset={threeCameraFocusPreset}'), 'the live 3D board must receive Build and ordinary landmark focus requests');
      assert(boardSource.includes("transition: previousStopId === null ? 'standard' : 'quick'"), 'landmark-to-landmark Build handoff should use the quick camera path');
      assert(pilotSource.includes("cameraFocusTransition === 'quick' ? 0.48 : 0.82"), 'the actual 3D camera should shorten Build handoff timing without changing its preset geometry');
      assert(modalSource.includes('onBuildActivePart={onBuildActivePart}') && modalSource.includes('onBuildActivePart(activeStopIndex)'), 'the existing canonical build callback must remain the action owner');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState/.test(modalSource), 'presentational modal must not add a gameplay persistence path');
    },
  },
  {
    name: 'keeps the workbench internal while routing authored actual-3D worlds through the canonical live shell',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pageSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/IslandTemplateKitPage.tsx', 'utf8');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const island1Source = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island1ThreeWorld.ts', 'utf8');
      const island2Source = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island2ThreeWorld.ts', 'utf8');
      const celestialSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island2CelestialThreeWorld.ts', 'utf8');
      const frostmoonSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts', 'utf8');
      const moonveilSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island6MoonveilThreeWorld.ts', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const routingSource = fsMod.readFileSync('src/features/gamification/level-worlds/services/islandRun3DWorldRouting.ts', 'utf8');
      const mainSource = fsMod.readFileSync('src/main.tsx', 'utf8');
      assert(pageSource.includes("requestedMode === '3d'"), 'camera kit route should accept mode=3d');
      assert(pageSource.includes('requestedLevelParam === null ? Number.NaN'), 'clean profiler URL must default to L3 instead of coercing a missing level to L0');
      assert(pageSource.includes('worldSourceNumber={initialState.worldSourceNumber}'), 'the internal workbench should keep runtime identity separate from its authored visual source');
      assert(pageSource.includes('[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(islandParam)'), 'the workbench should expose all ten authored islands for repeatable landmark QA');
      assert(mainSource.includes("const ISLAND_TEMPLATE_KIT_PATH = '/dev/island-template-kit'"), 'workbench must retain its explicit dev route');
      assert(mainSource.includes("VITE_ISLAND_3D_PROFILE_ENABLED === 'true'"), 'native/LAN profiler bundle must require an explicit internal build flag');
      assert(mainSource.includes('import.meta.env.PROD && !ISLAND_3D_PROFILER_BUILD_ENABLED'), 'internal profiler bundle must not register the production service worker');
      assert(pilotSource.includes('new THREE.WebGLRenderer'), 'pilot should use an actual GPU renderer');
      assert(pilotSource.includes('new OrbitControls'), 'pilot should provide touch and pointer orbit controls');
      assert(pilotSource.includes("root.name = 'ISLAND_5_LIVING_AMBIENCE'"), 'all M13 scenery should stay under one removable ambience root');
      assert(pilotSource.includes('buildIsland5AmbienceLayout(profile)'), 'living scenery should use the deterministic quality-budgeted garden contract');
      assert(pilotSource.includes("ISLAND_5_SKY_DOME_SRC = '/assets/islands/island-005/background/sky-dome-v2.webp'"), '3D view should use the optimized panoramic WebP sky');
      assert(pilotSource.includes("get('island3dQuality')"), 'internal QA should be able to force Low, Medium or High without changing production auto-selection');
      const skyStats = fsMod.statSync('public/assets/islands/island-005/background/sky-dome-v2.webp');
      assert(skyStats.size <= 250_000, 'runtime sky must remain within the 250 KB mobile budget');
      assert(pilotSource.includes("root.name = 'ISLAND_5_PLAYER_TOKEN'"), '3D route must carry a separately addressable player piece');
      assert(pilotSource.includes('computeHopDurations(pendingHopSequence.length, movementSpeedFactor)'), '3D piece must reuse canonical visual hop timing');
      assert(pilotSource.includes('getIsland3DTokenHopPosition'), '3D movement must use the tested grounded hop arc');
      assert(pilotSource.includes("presentation = 'workbench'"), 'live-shell use must opt into the stripped embedded presentation explicitly');
      assert(boardSource.includes('const Island5ThreeScene = lazy'), 'live shell should not eagerly load the Three.js scene');
      assert(boardSource.includes("params.get('island3dPreview') === '1'"), 'internal QA should expose a deterministic Island 5 preview URL');
      assert(boardSource.includes('resolveIslandRun3DWorldRoute(islandArtPreviewNumber)'), 'production 3D routing must use the explicit runtime-to-authored-world contract');
      assert(boardSource.includes('const island3DWorldNumber = island3DWorldRoute?.worldSourceNumber ?? null;'), 'all runtime islands without an assigned authored world must retain the existing fallback');
      assert(boardSource.includes('islandNumber={islandArtPreviewNumber}') && boardSource.includes('worldSourceNumber={island3DWorldNumber ?? 5}'), 'the shared renderer must keep gameplay identity separate from the selected authored world');
      assert(routingSource.includes('runtimeIslandNumber: 2, worldSourceNumber: 2') && routingSource.includes('runtimeIslandNumber: 3, worldSourceNumber: 3'), 'Islands 002 and 003 must route their dedicated Celestial and Frostmoon world packs');
      assert(routingSource.includes('runtimeIslandNumber: 4, worldSourceNumber: 4') && routingSource.includes('runtimeIslandNumber: 5, worldSourceNumber: 5'), 'the citadel and tropical arena worlds must retain stable Island 004/005 identities');
      assert(routingSource.includes('runtimeIslandNumber: 6, worldSourceNumber: 6'), 'Island 006 must route its dedicated Moonveil Nexus world pack');
      assert(pilotSource.includes('color: 0x4d91c8') && pilotSource.includes('color: 0x72c9e8'), 'Island 1 must use its authored blue route and key-tile palette instead of inheriting Island 5 purple');
      assert(boardSource.includes('() => !isIslandVisualPreview || isIsland5ThreePreviewRequested'), 'normal Island 5 gameplay should default to 3D while QA previews remain explicit');
      assert(boardSource.includes('presentation="embedded"'), 'real UI shell must hide workbench-only profiler and camera panels');
      assert(pilotSource.includes('qualityOverride?: Island3DQualitySelection'), 'embedded renderer should accept a presentation-only dev quality override');
      assert(pilotSource.includes('qualityOverride ?? productionQualitySelection'), 'dev override should take precedence without changing production auto selection');
      assert(pilotSource.includes('ISLAND_1_LANDMARK_LABELS[preset.id'), 'Island 001 workbench focus controls must use First Light landmark labels');
      assert(pilotSource.includes('ISLAND_2_CELESTIAL_LANDMARK_LABELS[preset.id') && pilotSource.includes('ISLAND_3_FROSTMOON_LANDMARK_LABELS[preset.id'), 'Islands 002 and 003 workbench focus controls must expose their authored landmark names');
      assert(pilotSource.includes('ISLAND_6_MOONVEIL_LANDMARK_LABELS[preset.id'), 'Island 006 workbench focus controls must expose its authored Moonveil landmark names');
      assert(celestialSource.includes("boss: 'Solspire Palace'") && celestialSource.includes("hatchery: 'Cloudnest Conservatory'"), 'Island 002 must retain its palace and cloudnest identities');
      assert(celestialSource.includes('function createSolspirePalace') && celestialSource.includes('function createCloudnest') && celestialSource.includes('function createAstralGate'), 'Island 002 needs distinct procedural landmark families');
      assert(celestialSource.includes("cloud.name = 'ISLAND_2_CLOUD_FLOOR_CLUSTER'") && celestialSource.includes("ribbon.name = 'ISLAND_2_CLOUD_WATERFALL'"), 'Island 002 must carry cloud-floor depth and animated waterfalls');
      assert(celestialSource.includes("shelf.name = radius > 5 ? 'ISLAND_2_MAIN_SKY_ROOT'") && celestialSource.includes("heart.name = 'ISLAND_2_DEEP_ROOT_HEART'"), 'Island 002 must preserve its tapered main sky-root instead of reverting to a flat coastal plate');
      assert(celestialSource.includes("cascadeRoot.name = 'ISLAND_2_LIVING_SPRING_CASCADE'") && celestialSource.includes("'ISLAND_2_PRINCIPAL_SKY_WATERFALL'"), 'Island 002 must retain the authored spring-to-sky waterfall composition');
      assert(celestialSource.includes("airship.name = 'ISLAND_2_CELESTIAL_AIRSHIP'") && celestialSource.includes("propeller.name = 'ISLAND_2_AIRSHIP_PROPELLER'"), 'Island 002 must retain its quality-scaled moving airship silhouette');
      assert(celestialSource.includes('function createDistantSkyIslet') && celestialSource.includes('const archetype = index % 6'), 'Island 002 distant sky islands must use varied authored silhouettes rather than one repeated islet');
      assert(frostmoonSource.includes("boss: 'Aurora Keep'") && frostmoonSource.includes("hatchery: 'Snowfeather Roost'"), 'Island 003 must retain its alpine keep and snowy hatchery identities');
      assert(frostmoonSource.includes('function createAuroraKeep') && frostmoonSource.includes('function createSnowfeatherRoost') && frostmoonSource.includes('function createMoonwellObservatory'), 'Island 003 needs distinct procedural landmark families');
      assert(frostmoonSource.includes("snowPoints.name = 'ISLAND_3_FALLING_SNOW'") && frostmoonSource.includes("ribbon.name = 'ISLAND_3_AURORA_RIBBON'"), 'Island 003 must carry living snowfall and aurora ambience');
      assert(moonveilSource.includes('boss: "Noctyra\'s Moon Gate"') && moonveilSource.includes("hatchery: 'Moon-Nest Conservatory'"), 'Island 006 must retain its Noctyra/Moon Gate and moon-nest identities');
      assert(moonveilSource.includes('function createMoonGate') && moonveilSource.includes('function createMoonNest') && moonveilSource.includes('function createVioletRift'), 'Island 006 needs distinct procedural landmark families');
      assert(moonveilSource.includes("root.name = 'ISLAND_6_MOONVEIL_LIVING_AMBIENCE'") && moonveilSource.includes("nebula.name = 'ISLAND_6_VIOLET_NEBULA'"), 'Island 006 must carry its dark-neon living void and spiral-nebula ambience');
      assert(moonveilSource.includes('addEnergyFall') && moonveilSource.includes('createDistantShard'), 'Island 006 must retain animated energy falls and varied distant floating fragments');
      assert(pilotSource.includes('firstLightFocusOverrides') && pilotSource.includes('boss: { position:') && pilotSource.includes('event: { position:'), 'Island 001 must keep authored front-facing focus cameras for every landmark family');
      assert(island1Source.includes("boss: 'Aureon’s Sun Court'"), 'Island 001 center identity must remain aligned with its Aureon/Sun Court manifest');
      assert(island1Source.includes('function addScaffoldTower') && island1Source.includes('function addConstructionCrane'), 'Island 001 L1/L2 states must use authored construction geometry');
      assert(island1Source.includes('function createRhythmTree') && island1Source.includes('function createStarArchive') && island1Source.includes('function createEchoObservatory'), 'each Island 001 outer family must keep its own authored procedural factory');
      assert(island1Source.includes('function createSunCourt') && !island1Source.includes('function createMoonGate'), 'Island 001 center must remain the low First Light Sun Court instead of Island 006 Moon Gate contamination');
      assert(island1Source.includes('const eggCount = level === 1 ? 0 : 4'), 'Lantern Hatchery must preserve the reference-locked skeletal L1 and operational L2/L3 egg stages');
      assert(island1Source.includes('new THREE.ExtrudeGeometry(leftPageShape') && island1Source.includes('const canopyShape = new THREE.Shape()'), 'Archive book and Observatory canopy must remain authored volumetric identity geometry');
      assert(island1Source.includes('celestial: new THREE.MeshPhysicalMaterial'), 'Echo Lens hero globe must retain its distinct layered celestial material');
      assert(island1Source.includes('side: THREE.DoubleSide'), 'Island 001 banners and thin emblems must remain visible in rear-angle QA');
      assert(!island1Source.includes('const levelScale = level === 1'), 'Island 001 progression must not regress to scale-only level changes');
      assert(island2Source.includes("boss: 'Sunwheel Arena'") && island2Source.includes("hatchery: 'Egg Grotto Hatchery'"), 'Island 002 must retain its tropical landmark identity lock');
      assert(island2Source.includes('function createEggGrotto') && island2Source.includes('function createHabitLodge') && island2Source.includes('function createStarArchive') && island2Source.includes('function createTideglassOracle') && island2Source.includes('function createIsland5SunwheelArena'), 'Island 002 must keep five distinct procedural landmark factories');
      assert(island2Source.includes("wave.name = 'ISLAND_2_SHORE_WAVE'") && island2Source.includes("fall.name = 'ISLAND_2_WATERFALL'"), 'Island 002 must retain animated shoreline and waterfall systems');
      assert(island2Source.includes("bird.name = 'ISLAND_2_BIRD'") && island2Source.includes("turtle.name = 'ISLAND_2_TURTLE'"), 'Island 002 must preserve quality-scaled tropical fauna');
      assert(!island2Source.includes('const levelScale = level === 1'), 'Island 002 progression must not regress to scale-only level changes');
      assert(boardSource.includes('3D quality') && boardSource.includes('Force High to judge phone smoothness.'), 'the live dev menu should expose the phone quality selector');
      assert(boardSource.includes('qualityOverride={isDevModeEnabled ? devIsland5ThreeQuality : undefined}'), 'quality override must be dev-mode only');
      assert(boardSource.includes('tokenIndex={tokenIndex}'), 'embedded renderer must read the canonical token index already owned by the live board');
      assert(boardSource.includes('pendingHopSequence={pendingHopSequence}'), 'embedded renderer must consume the canonical roll hop sequence without deriving movement');
      assert(boardSource.includes('landmarkBuildLevels={isIslandVisualPreview ? undefined : island5ThreeBuildLevels}'), 'production landmarks must read their individual canonical build levels');
      assert(boardSource.includes("handleLandmarkOpenRequest(landmarkId === 'event' ? 'mystery' : landmarkId)"), '3D landmark taps must reuse the shared landmark-opening dispatcher');
      assert(boardSource.includes('handleStopOpenRequest(stopId);'), 'the shared landmark dispatcher must delegate ordinary stops to the canonical stop-opening path');
      assert(boardSource.includes('onRendererUnavailable={() => setIsIsland5ThreeEnabled(false)}'), 'WebGL failure must reveal the mounted 2D fallback');
      assert(boardSource.indexOf('<BoardStage') < boardSource.indexOf('shouldRenderIsland5Three ?'), 'canonical BoardStage must remain mounted beneath the production visual layer');
      assert(pilotSource.includes('landmarkBuildLevels?.[landmark.id] ?? buildLevel'), 'renderer must resolve each landmark level without inventing gameplay state');
      assert(pilotSource.includes('onLandmarkClickRef.current?.(landmarkId)'), 'renderer interactions must delegate landmark actions back to the live shell');
      assert(pilotSource.includes('ISLAND_CAMERA_TOUR_STEPS'), 'pilot should expose the reusable semantic island tour');
      assert(pilotSource.includes('controlPosition'), 'cinematic transitions should follow elevated Bezier arcs');
      assert(pilotSource.includes('progress * progress * progress'), 'cinematic transitions should use zero-velocity smootherstep endpoints');
      assert(pilotSource.includes('if (activeTour) return;'), 'device profiling and the cinematic tour must be mutually exclusive');
      assert(pilotSource.includes('ISLAND_3D_PROFILE_DURATION_MS'), 'pilot should run the canonical 30-second evidence window');
      assert(pilotSource.includes("{ atMs: 19_500, preset: 'orbit-right' }"), 'the profile must sample the historically most expensive right orbit rather than reporting only overview maxima');
      assert(pilotSource.includes("document.addEventListener('visibilitychange'"), 'profiler should reject background-tab evidence');
      assert(pilotSource.includes('summarizeIsland3DPerformance'), 'profiler should use the pure tested summary contract');
      assert(pilotSource.includes('refreshNormalizedP95Ms'), 'profiler should distinguish 60 Hz missed-vsync bands from continuous-frame timing without weakening the raw target');
      assert(pilotSource.includes("profileSchema: 'island-3d-m7-v1'"), 'physical-device evidence should carry one stable schema id across authored island world packs');
      assert(pilotSource.includes('navigator.share'), 'completed phone evidence should be shareable without developer tools');
      assert(pilotSource.includes("gl.getExtension('WEBGL_debug_renderer_info')"), 'device evidence should record the available GPU renderer identity');
      assert(pilotSource.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"), 'pilot should honor reduced motion');
      assert(pilotSource.includes('createCitadelPatternTexture'), 'high-tier Citadel materials should receive deterministic runtime surface maps');
      assert(pilotSource.includes('textures.forEach((texture) => texture.dispose())'), 'procedural surface maps must be disposed with the scene');
      assert(pilotSource.includes('createHatcheryLandmark(builtLevel, quality, materials)'), 'Coral Cradle must author level-specific geometry rather than scaling one mesh');
      assert(pilotSource.includes('createHabitLandmark(builtLevel, quality, materials)'), 'Tidekeeper Hall must author level-specific geometry rather than scaling one mesh');
      assert(pilotSource.includes('createWisdomLandmark(builtLevel, quality, materials)'), 'Pearl Archive must author level-specific geometry rather than scaling one mesh');
      assert(pilotSource.includes('createEventLandmark(builtLevel, quality, materials)'), 'Concord Arena must author level-specific geometry rather than scaling one mesh');
      assert(!pilotSource.includes("level === 1 ? 0.52 : level === 2 ? 0.76 : 1"), 'the rejected scale-only corner progression must not return');
      assert(pilotSource.includes('compactStaticGeometry(building'), 'advanced corner architecture must be material-batched before phone rendering');
      assert(pilotSource.includes('addArchedEntrance') && pilotSource.includes('addGoldBalustrade') && pilotSource.includes('addCoralCrown'), 'L3 corners should retain the approved entrance, gold and reef-restoration language');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|islandRunStateActions/.test(pilotSource), 'visual pilot must not write gameplay state');
    },
  },
];
