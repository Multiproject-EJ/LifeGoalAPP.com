import { TILE_ANCHORS_36 } from '../islandBoardLayout';
import {
  buildIsland5AmbienceLayout,
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
  ISLAND_3D_TOKEN_HOP_ARC_HEIGHT,
  ISLAND_3D_TILE_IMPACT_DURATION_MS,
  ISLAND_CAMERA_TOUR_STEPS,
  ISLAND_5_CAMERA_PRESETS,
  ISLAND_5_LANDMARKS,
  resolveIsland3DQuality,
  resolveIsland3DLandingImpact,
  summarizeIsland3DPerformance,
} from '../../dev/island5ThreePilotContract';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const island5ThreePilotContractTests: TestCase[] = [
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
      assert(pilotSource.includes('new THREE.PlaneGeometry(68, 68, qualityProfile.oceanGridSegments'), 'ocean must use the quality-scaled deforming grid');
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
    name: 'defines reusable overview, orbit, survey and five landmark camera presets',
    run: () => {
      assertEqual(ISLAND_5_CAMERA_PRESETS.length, 9, 'camera rig should expose nine reusable presets');
      assertEqual(new Set(ISLAND_5_CAMERA_PRESETS.map((preset) => preset.id)).size, 9, 'camera preset ids must be unique');
      ['overview', 'survey', 'orbit-left', 'orbit-right', 'boss', 'hatchery', 'habit', 'wisdom', 'event'].forEach((id) => {
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
      assert(boardSource.includes('cameraFocusPreset={buildCameraFocusRequest?.preset ?? null}'), 'the live 3D board must receive the active Build landmark focus');
      assert(boardSource.includes("transition: previousStopId === null ? 'standard' : 'quick'"), 'landmark-to-landmark Build handoff should use the quick camera path');
      assert(pilotSource.includes("cameraFocusTransition === 'quick' ? 0.48 : 0.82"), 'the actual 3D camera should shorten Build handoff timing without changing its preset geometry');
      assert(modalSource.includes('onBuildActivePart={onBuildActivePart}') && modalSource.includes('onBuildActivePart(activeStopIndex)'), 'the existing canonical build callback must remain the action owner');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState/.test(modalSource), 'presentational modal must not add a gameplay persistence path');
    },
  },
  {
    name: 'keeps the workbench internal while routing Island 5 actual 3D through the canonical live shell',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pageSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/IslandTemplateKitPage.tsx', 'utf8');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const mainSource = fsMod.readFileSync('src/main.tsx', 'utf8');
      assert(pageSource.includes("requestedMode === '3d'"), 'camera kit route should accept mode=3d');
      assert(pageSource.includes('requestedLevelParam === null ? Number.NaN'), 'clean profiler URL must default to L3 instead of coercing a missing level to L0');
      assert(pageSource.includes('<Island5ThreePilot buildLevel={buildLevel} />'), 'the internal workbench should retain its direct 3D mount');
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
      assert(boardSource.includes('const canUseIsland5Three = islandArtPreviewNumber === 5'), 'production 3D route must remain constrained to Island 5');
      assert(boardSource.includes('() => !isIslandVisualPreview || isIsland5ThreePreviewRequested'), 'normal Island 5 gameplay should default to 3D while QA previews remain explicit');
      assert(boardSource.includes('presentation="embedded"'), 'real UI shell must hide workbench-only profiler and camera panels');
      assert(pilotSource.includes('qualityOverride?: Island3DQualitySelection'), 'embedded renderer should accept a presentation-only dev quality override');
      assert(pilotSource.includes('qualityOverride ?? qualitySelection'), 'dev override should take precedence without changing production auto selection');
      assert(boardSource.includes('3D quality') && boardSource.includes('Force High to judge phone smoothness.'), 'the live dev menu should expose the phone quality selector');
      assert(boardSource.includes('qualityOverride={isDevModeEnabled ? devIsland5ThreeQuality : undefined}'), 'quality override must be dev-mode only');
      assert(boardSource.includes('tokenIndex={tokenIndex}'), 'embedded renderer must read the canonical token index already owned by the live board');
      assert(boardSource.includes('pendingHopSequence={pendingHopSequence}'), 'embedded renderer must consume the canonical roll hop sequence without deriving movement');
      assert(boardSource.includes('landmarkBuildLevels={isIslandVisualPreview ? undefined : island5ThreeBuildLevels}'), 'production landmarks must read their individual canonical build levels');
      assert(boardSource.includes("handleStopOpenRequest(landmarkId === 'event' ? 'mystery' : landmarkId)"), '3D landmark taps must reuse the canonical stop-opening dispatcher');
      assert(boardSource.includes('onRendererUnavailable={() => setIsIsland5ThreeEnabled(false)}'), 'WebGL failure must reveal the mounted 2D fallback');
      assert(boardSource.indexOf('<BoardStage') < boardSource.indexOf('shouldRenderIsland5Three ?'), 'canonical BoardStage must remain mounted beneath the production visual layer');
      assert(pilotSource.includes('landmarkBuildLevels?.[landmark.id] ?? buildLevel'), 'renderer must resolve each landmark level without inventing gameplay state');
      assert(pilotSource.includes('onLandmarkClickRef.current?.(landmarkId)'), 'renderer interactions must delegate landmark actions back to the live shell');
      assert(pilotSource.includes('ISLAND_CAMERA_TOUR_STEPS'), 'pilot should expose the reusable semantic island tour');
      assert(pilotSource.includes('controlPosition'), 'cinematic transitions should follow elevated Bezier arcs');
      assert(pilotSource.includes('progress * progress * progress'), 'cinematic transitions should use zero-velocity smootherstep endpoints');
      assert(pilotSource.includes('if (activeTour) return;'), 'device profiling and the cinematic tour must be mutually exclusive');
      assert(pilotSource.includes('ISLAND_3D_PROFILE_DURATION_MS'), 'pilot should run the canonical 30-second evidence window');
      assert(pilotSource.includes("document.addEventListener('visibilitychange'"), 'profiler should reject background-tab evidence');
      assert(pilotSource.includes('summarizeIsland3DPerformance'), 'profiler should use the pure tested summary contract');
      assert(pilotSource.includes("profileSchema: 'island-5-m7-v1'"), 'physical-device evidence should carry a stable schema id');
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
