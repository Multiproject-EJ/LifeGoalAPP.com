import * as THREE from 'three';
import { WONDER_RIDE_SPEED_SCALE } from '../../dev/island19WonderRidePacing';
import { createWonderRideCameraFilter } from '../../dev/island19WonderRideCamera';
import { createIsland19SkyAmbience } from '../../dev/Island19SkyAmbience';
import { createIsland19ParkDetails } from '../../dev/Island19ParkDetails';
import {
  ISLAND_19_SOURCE_LOFT_PART_IDS,
  ISLAND_19_SOURCE_LOFT_PATH_OWNER,
  createIsland19CoasterCarnivalSourceLoftWorld,
} from '../../dev/Island19CoasterCarnivalSourceLoftWorld';
import {
  ISLAND_19_HYBRID_PHONE_PLATE,
  ISLAND_19_WONDER_DIAMOND_GALLERY_BACKDROP,
  ISLAND_19_WONDER_GOLD_VAULT_BACKDROP,
  ISLAND_19_WONDER_SEA_CAVE_BACKDROP,
  createIsland19CoasterCarnivalHybridOverlay,
} from '../../dev/Island19CoasterCarnivalHybridOverlay';
import {
  ISLAND_19_CIRCUIT_F_PATH_OWNER,
  ISLAND_19_CIRCUIT_F_REPRESENTATIVE_PART_IDS,
  createIsland19CircuitFRoutePath,
  createIsland19CoasterCarnivalCircuitFWorld,
} from '../../dev/Island19CoasterCarnivalCircuitFWorld';
import {
  createIsland19CoasterCarnivalCircuitGBoardPlaza,
} from '../../dev/Island19CoasterCarnivalCircuitGBoardPlaza';
import {
  ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_PACKET_SHA256,
  createIsland19CoasterCarnivalCircuitGFountainStatue,
} from '../../dev/Island19CoasterCarnivalCircuitGFountainStatue';
import { createIslandStagedRestorationThreePresentation } from '../../dev/IslandStagedRestorationThreePresentation';
import { assert, assertEqual, type TestCase } from './testHarness';

function disposeSlice(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export const island19CoasterCarnivalRepresentativeSliceTests: TestCase[] = [
  {
    name: 'renders every physical train wheel in two per-car batches without changing its spun transform',
    run: () => {
      const world = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low' });
      let meshes = 0;
      let triangles = 0;
      world.train.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        meshes += 1;
        triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3
          * (node instanceof THREE.InstancedMesh ? node.count : 1);
      });
      assertEqual(meshes, 24, 'train render calls halve without hiding wheels');
      assertEqual(triangles, 8656, 'all original train triangles are retained');
      for (const progress of [0, 0.19, 0.62, 0.82, 0.999]) {
        world.setTrainProgress(progress);
        world.train.children.forEach((car, carIndex) => {
          const batches = ['TYRES', 'FLANGES'].map(part => car.getObjectByName(`ISLAND_19_D023_CARRIAGE_${carIndex + 1}_WHEELS_${part}`) as THREE.InstancedMesh);
          assert(batches.every(batch => batch?.count === 4), 'both materials render all four wheel contacts');
          const pivots = car.children.filter(child => child.name.includes('_WHEEL_PIVOT_'));
          pivots.forEach((pivot, index) => {
            batches.forEach((batch, part) => {
              const originalChild = new THREE.Object3D();
              originalChild.rotation.z = Math.PI / 2;
              if (part === 1) originalChild.position.x = Math.sign(pivot.position.x) * 0.045;
              originalChild.updateMatrix();
              const expected = new THREE.Matrix4().multiplyMatrices(pivot.matrix, originalChild.matrix);
              const actual = new THREE.Matrix4();
              batch.getMatrixAt(index, actual);
              assert(actual.elements.every((value, i) => Math.abs(value - expected.elements[i]) < 0.000001), 'instanced transform matches the original moving pivot × child matrix');
              assert(batch.boundingBox!.containsPoint(pivot.position), 'rotating contacts remain inside the conservative culling box');
            });
          });
        });
      }
      for (const wagon of ['front', 'middle', null] as const) {
        world.setRiderPovActive(wagon);
        world.train.children.forEach(car => {
          car.children.filter(child => child instanceof THREE.InstancedMesh).forEach(batch => {
            assertEqual(batch.parent, car, 'wheel visibility follows its physical carriage in either POV');
          });
        });
      }
      const wheelBatches: THREE.InstancedMesh[] = [];
      let releasedInstances = 0;
      world.train.traverse(node => {
        if (node instanceof THREE.InstancedMesh && node.userData.animatedWheelBatch) {
          wheelBatches.push(node);
          node.addEventListener('dispose', () => { releasedInstances += 1; });
        }
      });
      disposeSlice(world.root);
      assertEqual(releasedInstances, 8, 'geometry-only island teardown releases all eight instance-matrix buffers');
      wheelBatches.forEach(batch => batch.geometry.dispose());
      assertEqual(releasedInstances, 8, 'repeated geometry cleanup cannot redispose the wheel batches');
    },
  },
  {
    name: 'batches deterministic park details outside the board and rider envelope',
    run: () => {
      const path = createIsland19CircuitFRoutePath();
      const high = createIsland19ParkDetails(path, 'high');
      const low = createIsland19ParkDetails(path, 'low');
      assertEqual(high.userData.gameplayAuthority, false, 'park art cannot mutate gameplay');
      assertEqual(high.children.length, 3, 'all park details use three material batches');
      assert(high.userData.triangles < 12000, 'detail layer has a bounded triangle cost');
      assert(low.userData.triangles < high.userData.triangles, 'Low reduces actual flower geometry');
      assert(high.userData.accepted.length >= 15, 'multiple districts have accepted details');
      assert(high.userData.accepted.some((item: {name: string}) => item.name === 'front-ticket-window'), 'primary phone ticket frontage is actually mounted');
      assertEqual(JSON.stringify(high.userData.accepted), JSON.stringify(low.userData.accepted), 'quality does not move placements');
      for (const item of high.userData.accepted) {
        const center = new THREE.Vector3(...item.center as [number, number, number]);
        if (center.y - item.radius < 1.8) assert(Math.hypot(center.x,center.z)-item.radius >= 3.95, 'low scenery clears protected board');
        const bounds = item.bounds ? new THREE.Box3(new THREE.Vector3(...item.bounds[0] as [number,number,number]),new THREE.Vector3(...item.bounds[1] as [number,number,number])) : null;
        for(let i=0;i<1500;i++) assert(bounds ? bounds.distanceToPoint(path.getPointAt(i/1500)) >= 1.65 : path.getPointAt(i/1500).distanceTo(center) >= item.radius+1.65, 'accepted detail clears physical ride envelope');
      }
      const again = createIsland19ParkDetails(path, 'high');
      assertEqual(JSON.stringify(again.userData), JSON.stringify(high.userData), 'no random placement or accumulated animation');
      disposeSlice(high); disposeSlice(low); disposeSlice(again);
    },
  },
  {
    name: 'builds the approved Circuit G board packet as exactly 36 canonical meshes with zero route violations',
    run: () => {
      (['low', 'medium', 'high'] as const).forEach((quality) => {
        const board = createIsland19CoasterCarnivalCircuitGBoardPlaza({ quality, reducedMotion: true });
        assert(board.diagnostics.valid, `${quality} Circuit G board diagnostics must pass: ${board.diagnostics.routeViolations.join(', ')}`);
        assertEqual(board.diagnostics.tileCount, 36, `${quality} board exposes exactly 36 tile meshes`);
        assertEqual(board.diagnostics.uniqueTileIndices, 36, `${quality} board exposes every canonical tile index exactly once`);
        assertEqual(board.diagnostics.routeViolations.length, 0, `${quality} gardens, parapet and sockets must not overlap the canonical route`);
        assert(board.diagnostics.fountainClearance > 0.7, `${quality} center fountain keeps protected clearance from the tile loop`);
        assertEqual(board.diagnostics.generatedLabelsAuthoritative, false, `${quality} generated packet labels never become gameplay data`);
        assert(Boolean(board.root.getObjectByName('ISLAND_19_G01_UNOBSTRUCTED_CENTER_FOUNTAIN')), `${quality} center fountain is real named geometry`);
        assert(Boolean(board.root.getObjectByName('ISLAND_19_G01_CASTLE_PORTAL_SOCKET')), `${quality} future castle assembly has a stable portal socket`);
        assertEqual(board.coasterClearanceSockets.length, 2, `${quality} future coaster has two protected board overpass corridors`);
        assertEqual(board.tileMeshes.map((tile) => tile.userData.tileIndex).sort((a, b) => a - b).join(','), Array.from({ length: 36 }, (_, index) => index).join(','), `${quality} visual tile ordering is one-to-one with canonical indices`);
        assertEqual(board.root.userData.sculptRuntime?.partRoots.length, 6, `${quality} board exposes six stable explodable structural roots including the guardian`);
        assertEqual(board.root.userData.sculptRuntime?.sockets.length, 4, `${quality} castle, coaster, and keyed statue assembly sockets are explicit`);
        assertEqual(board.root.userData.sculptRuntime?.actionReady, true, `${quality} structural hierarchy is marked action-ready without owning gameplay writes`);
        const foundation = board.root.getObjectByName('ISLAND_19_G01_RAISED_BOARD_FOUNDATION');
        assertEqual(foundation?.userData.partId, 'raised-board-slab', `${quality} slab is a named independent assembly part`);
        assertEqual(board.tileRoot.userData.clickable, true, `${quality} canonical route owns stable future hit targets`);
        assert(Boolean(board.fountain.getObjectByName('ISLAND_19_G01_FOUNTAIN_EIGHT_JETS')?.userData.attachment), `${quality} fountain jet array records its basin attachment contract`);
        assert(Boolean(board.fountain.getObjectByName('ISLAND_19_G01_FOUNTAIN_STATUE_SOCKET')), `${quality} fountain exposes one frozen keyed statue socket`);
        assert(Boolean(board.fountain.getObjectByName('ISLAND_19_G01_STATUE_GUARDIAN_HEAD_FACE')), `${quality} guardian has a real named head and face module`);
        assert(Boolean(board.fountain.getObjectByName('ISLAND_19_G01_STATUE_LEFT_OPEN_HAND')), `${quality} guardian has a complete named left open hand`);
        assert(Boolean(board.fountain.getObjectByName('ISLAND_19_G01_STATUE_RIGHT_OPEN_HAND')), `${quality} guardian has a complete named right open hand`);
        assert(Boolean(board.fountain.getObjectByName('ISLAND_19_G01_STATUE_SIX_POINT_STAR_CAPE')), `${quality} guardian has a joined all-angle starburst cape module`);
        assert(!board.fountain.getObjectByName('ISLAND_19_G01_FOUNTAIN_GOLD_STATUE_BODY'), `${quality} retired primitive statue body is absent`);
        assertEqual(board.fountainStatue.dataset.island19CircuitGFountainStatuePacketSha256, ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_PACKET_SHA256, `${quality} runtime identifies the approved immutable statue packet`);
        disposeSlice(board.root);
      });
    },
  },
  {
    name: 'mounts Circuit G only behind its evidence flag and keeps it presentation-only',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island19CoasterCarnivalCircuitGBoardPlaza.ts', 'utf8');
      const statueSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island19CoasterCarnivalCircuitGFountainStatue.ts', 'utf8');
      const cliffRootSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island19CoasterCarnivalCircuitGCliffRoot.ts', 'utf8');
      assert(pilotSource.includes("get('island19CircuitGBoard') === '1'"), 'Circuit G board remains an explicit preview until its visual gate passes');
      assert(pilotSource.includes('createIsland19CoasterCarnivalCircuitGBoardPlaza'), 'live renderer can mount the approved Circuit G board module');
      assert(pilotSource.includes("canvas.dataset.island19FullWorld = 'circuit-g-g01-board-plaza-mounted'"), 'browser evidence identifies the isolated g01 module');
      assert(pilotSource.includes("get('island3dEvidenceAzimuth')"), 'browser evidence supports deterministic front, side, and rear azimuth capture');
      assert(pilotSource.includes("get('island3dEvidenceDistanceScale')"), 'browser evidence supports deterministic landmark framing distance');
      assert(pilotSource.includes('canvas.dataset.evidenceAzimuth'), 'captured evidence records its requested azimuth');
      assert(pilotSource.includes('!isCircuitGBoardPreviewEnabled && !isMapStrippedEvidenceEnabled'), 'Circuit E plate remains the rollback fallback outside Circuit G preview');
      assert(pilotSource.includes("'source-locked-hybrid-overview'"), 'the normal Island 019 overview exposes its hybrid representation mode explicitly');
      assert(pilotSource.includes('data-island-19-presentation={island19PresentationMode}'), 'the rendered Island 019 surface publishes its current representation mode for PWA diagnostics');
      assert(pilotSource.includes('Interactive Island 19 Coaster Carnival hybrid overview; source-matched carnival artwork with real Three.js gameplay and Wonder Express ride geometry'), 'the hybrid overview is not announced to assistive technology as a completed all-angle 3D world');
      assert(pilotSource.includes("'wonder-express-3d-pov'"), 'the real Wonder Express camera path retains a distinct 3D presentation mode');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|localStorage/.test(boardSource), 'Circuit G board module owns no gameplay writes or local state mirror');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|localStorage/.test(statueSource), 'Circuit G guardian submodule owns no gameplay writes or local state mirror');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|localStorage/.test(cliffRootSource), 'Circuit G cliff/root module owns no gameplay writes or local state mirror');
      assert(cliffRootSource.includes("island19CircuitGGameplayWrites: 'false'"), 'g02 publishes its presentation-only contract in runtime diagnostics');
      assert(boardSource.includes("canonicalAuthority: 'TILE_ANCHORS_36'"), 'every rendered tile records canonical transform authority');
      assert(boardSource.includes('generatedLabelAuthoritative: false'), 'generated packet glyphs are explicitly non-authoritative');
    },
  },
  {
    name: 'builds the approved Circuit G fountain guardian as an action-ready four-view submodule with reduced-motion freeze',
    run: () => {
      const moving = createIsland19CoasterCarnivalCircuitGFountainStatue({ quality: 'low', reducedMotion: false });
      assertEqual(moving.root.userData.sculptRuntime?.actionReady, true, 'guardian exposes an action-ready hierarchy');
      assertEqual(moving.root.userData.sculptRuntime?.staticRigidCharacter, true, 'guardian honestly exposes its source-traced ornamental construction');
      assertEqual(moving.root.userData.sculptRuntime?.skinnedArticulatedCharacter, false, 'guardian does not claim a skeleton that the rigid statue does not own');
      assert(Object.keys(moving.partRoots).length >= 17, 'guardian exposes at least seventeen semantic part roots instead of one fused primitive');
      assert(Boolean(moving.partRoots['guardian-head-face']), 'guardian face is independently addressable');
      assert(Boolean(moving.partRoots['left-open-hand']) && Boolean(moving.partRoots['right-open-hand']), 'both complete open-hand assemblies are independently addressable');
      assert(Boolean(moving.partRoots['starburst-cape-core']), 'joined starburst cape is independently addressable');
      assertEqual(moving.root.userData.constructionFamily, 'source-locked-four-view-impostor-hybrid-v9', 'guardian uses the source-facing hybrid precedent for a phone-scale ornamental landmark');
      assertEqual(moving.root.userData.sculptRuntime?.hybridSourceLockedImpostor, true, 'guardian labels its angle-aware hybrid rendering technique honestly');
      assert(moving.root.userData.retiredConstructionFamilies.includes('layered-six-ray-draped-guardian-v3'), 'the side-view-failed slab family remains explicitly retired');
      assert(moving.root.userData.retiredConstructionFamilies.includes('curved-anatomical-relief-guardian-v4'), 'the spike-cape family remains explicitly retired');
      assert(moving.root.userData.retiredConstructionFamilies.includes('broad-convex-panel-human-guardian-v5'), 'the exhausted low-relief toy family remains explicitly retired');
      assert(moving.root.userData.retiredConstructionFamilies.includes('skinned-production-human-guardian-v6'), 'the hard-vetoed caretaker-rig family remains explicitly retired');
      assert(moving.root.userData.retiredConstructionFamilies.includes('source-traced-continuous-robe-guardian-v7'), 'the cross-view-collapsed source-traced family remains explicitly retired');
      assert(moving.root.userData.retiredConstructionFamilies.includes('blender-authored-volumetric-guardian-v8'), 'the identity-failed Blender family remains explicitly retired');
      assert(Boolean(moving.partRoots['source-locked-four-view-impostor']), 'source-facing guardian view owner is independently addressable');
      assert(Boolean(moving.root.getObjectByName('ISLAND_19_G01_STATUE_CAPE_CURVED_DRAPERY_MANTLE')), 'guardian rear mantle is a real curved loft volume');
      assert(Boolean(moving.root.getObjectByName('ISLAND_19_G01_STATUE_CAPE_VOLUMETRIC_RAY_1')), 'guardian star cape exposes a volumetric tapered ray');
      moving.animate(0);
      const startRotation = moving.visualPivot.rotation.y;
      moving.animate(4);
      assert(Math.abs(moving.visualPivot.rotation.y - startRotation) > 0.005, 'elapsed time drives restrained statue emphasis');
      disposeSlice(moving.root);

      const reduced = createIsland19CoasterCarnivalCircuitGFountainStatue({ quality: 'low', reducedMotion: true });
      reduced.animate(0);
      const frozenPivot = reduced.visualPivot.rotation.y;
      const frozenStar = reduced.medallionStar.rotation.z;
      reduced.animate(30);
      assertEqual(reduced.visualPivot.rotation.y, frozenPivot, 'reduced motion freezes guardian pivot emphasis');
      assertEqual(reduced.medallionStar.rotation.z, frozenStar, 'reduced motion freezes medallion emphasis');
      assertEqual(reduced.dataset.island19CircuitGFountainStatueGameplayWrites, 'false', 'guardian remains presentation-only');
      disposeSlice(reduced.root);
    },
  },
  {
    name: 'builds the approved Circuit F oversized root, open sea cave, complete ride phases, and real railway systems at every tier',
    run: () => {
      (['low', 'medium', 'high'] as const).forEach((quality) => {
        const world = createIsland19CoasterCarnivalCircuitFWorld({ quality, reducedMotion: true });
        assert(world.diagnostics.valid, `${quality} Circuit F diagnostics must pass: ${world.diagnostics.errors.join(', ')}`);
        assertEqual(world.diagnostics.pathOwner, ISLAND_19_CIRCUIT_F_PATH_OWNER, `${quality} all ride consumers share the explicit Bézier-section owner`);
        assert(world.diagnostics.pathLength > 70, `${quality} complete surface, cavern and ocean route must remain substantial`);
        assertEqual(world.diagnostics.rootScaleAgainstStandard, 1.35, `${quality} island root keeps the approved oversized envelope`);
        assert(world.diagnostics.rootSectorCount >= 64, `${quality} root keeps enough all-angle azimuth sectors`);
        assertEqual(world.diagnostics.rootRingCount, 8, `${quality} root keeps eight independently authored depth rings`);
        assert(world.diagnostics.openSeaCaveFaceCount >= 4, `${quality} cliff shell must contain a real open sea-cave sector`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G02_BATCHED_INDEXED_FACETED_CLIFF_SHELL')), `${quality} Circuit G g02 replaces the smooth disk with a named faceted shell`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G02_BATCHED_COLUMNAR_ESCARPMENT_MANTLE')), `${quality} g02 uses one batched rock mantle instead of one draw call per cliff stone`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G02_PHYSICALLY_OPEN_SEA_CAVE_RIM_AND_THROAT')), `${quality} g02 sea cave has a thickness-bearing rim and throat`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G02_OPEN_INTERIOR_CAVERN_RECEIVING_SHELL')), `${quality} g02 provides a real cavern receiving shell for the later treasure module`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G02_CARVED_FRONT_GATEWAY_AND_APRON')), `${quality} replacement g02 has a phone-readable carved front gateway and projecting apron`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G02_TWIN_ANIMATED_WATERFALL_RIBBONS')), `${quality} replacement g02 has the source-facing twin waterfall system`);
        (['ROOF', 'REAR', 'LEFT', 'RIGHT'] as const).forEach((segment) => {
          assert(Boolean(world.root.getObjectByName(`ISLAND_19_G02_CAVERN_SEGMENT_${segment}`)), `${quality} replacement g02 exposes independently removable ${segment.toLowerCase()} cavern geometry`);
        });
        assertEqual(world.dataset.island19CircuitGModule, 'g02-cliff-root', `${quality} combined runtime identifies the active Circuit G module`);
        assertEqual(world.dataset.island19CircuitGG02ReplacementDecision, 'd014', `${quality} combined runtime identifies the approved replacement-family decision`);
        assert(Number(world.dataset.island19CircuitGRootDrawCalls) <= 12, `${quality} replacement g02 remains inside its twelve-call module budget`);
        assert(Number(world.dataset.island19CircuitGRootTriangles) <= 45_000, `${quality} g02 root remains inside its triangle budget`);
        assertEqual(world.dataset.island19CircuitGWaterfallRibbons, '6', `${quality} waterfalls use six layered ribbons in one instanced draw system`);
        assertEqual(world.dataset.island19CircuitGCavernSegments, '4', `${quality} sectional cavern owns four removable segments`);
        assert(Number(world.dataset.island19CircuitGGatewayClearWidth) >= 2.7, `${quality} carved gateway retains a broad physical opening`);
        assertEqual(world.dataset.island19CircuitGSocketCount, '8', `${quality} g02 exposes every frozen assembly socket`);
        assertEqual(world.dataset.island19CircuitGGameplayWrites, 'false', `${quality} g02 remains presentation-only`);
        assertEqual(world.dataset.island19CircuitGOceanLevel, '-5.05', `${quality} shoreline stays at the sea-cave sill instead of drowning the deep cliff`);
        const ocean = world.root.getObjectByName('ISLAND_19_CIRCUIT_F_OCEAN');
        const caveSocket = world.root.getObjectByName('ISLAND_19_G02_SEA_CAVE_BREACH_SOCKET');
        assertEqual(ocean?.position.y, -5.05, `${quality} ocean exposes the source-proportioned monolithic cliff depth`);
        assert(Math.abs((caveSocket?.position.z ?? 99) + 0.82) < 0.001, `${quality} g02 sea-cave breach aligns with the Wonder Express exit vector`);
        assert(world.diagnostics.portalSideMargin >= 0.25, `${quality} four-car envelope clears portal sides`);
        assert(world.diagnostics.portalTopMargin >= 0.25, `${quality} four-car envelope clears portal top`);
        assertEqual(world.diagnostics.boardRouteViolations.length, 0, `${quality} train envelope clears the canonical center board at board height`);
        assertEqual(world.diagnostics.phaseCoverage.length, 10, `${quality} route includes the second-level grand vault as well as surface and ocean phases`);
        assertEqual(world.root.userData.representativePartIds.length, ISLAND_19_CIRCUIT_F_REPRESENTATIVE_PART_IDS.length, `${quality} runtime declares the twelve approved macro parts`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_LEFT_OUTER_RAIL')), `${quality} left outer rail is real geometry`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_RIGHT_OUTER_RAIL')), `${quality} right outer rail is real geometry`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_TRACK_TIES')), `${quality} track ties remain a separate repeated system`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_INSTANCED_RAIL_FASTENERS')), `${quality} track exposes a batched rail-to-sleeper contact system`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_LOAD_PATH_SUPPORTS')), `${quality} supports remain a separate load-path system`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_I_SOURCE_CREST_SUPPORT_LATTICE')), `${quality} Circuit I adds the source-readable crest tower and diagonal-brace system`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_I_DEEP_UNDERSEA_GLASS_TUBE')), `${quality} d017 adds the deep undersea tube assembly`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_I_TRANSPARENT_UNDERSEA_PRESSURE_SHELL')), `${quality} the undersea journey has a real transparent pressure shell`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_I_INSTANCED_UNDERSEA_PRESSURE_RINGS')), `${quality} the glass shell is held by repeated structural rings`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_I_UNDERSEA_TUBE_SEAFLOOR_SUPPORTS')), `${quality} the undersea tube has visible seabed load paths`);
        assert(world.getRideFrame(0.82).position.y < -5.05, `${quality} sea-cave phase descends below the established ocean plane`);
        assert(world.getRideFrame(0.78).position.y < -5.05 - 1.6, `${quality} complete tube crown remains below the ocean during the panorama`);
        assert(world.getRideFrame(0.99).position.y > -2.0, `${quality} return phase authors a real ascent back toward the park`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_OPEN_SEA_CAVE_RIM')), `${quality} sea-cave breach has an authored wet rim`);
        assertEqual(world.board.diagnostics.tileCount, 36, `${quality} oversized ride world mounts the approved canonical center board`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G01_UNOBSTRUCTED_CENTER_FOUNTAIN')), `${quality} Circuit F uses the finished Circuit G fountain instead of its retired placeholder disc`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G01_STATUE_SOURCE_LOCKED_FOUR_VIEW_IMPOSTOR')), `${quality} accepted guardian remains mounted in the combined world`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_FERRIS_WHEEL_PIVOT')), `${quality} all-angle ride world includes the animated Ferris landmark`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_DROP_CARRIAGE_PIVOT')), `${quality} all-angle ride world includes the animated drop carriage`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_CAROUSEL_PIVOT')), `${quality} all-angle ride world includes the animated carousel`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_F_INSTANCED_PARK_TREE_CROWNS')), `${quality} park dressing remains batched at phone scale`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR_RUNTIME')), `${quality} Circuit I owns a stable asynchronous exterior mount without replacing the board or ride`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G01_INSTANCED_GARDEN_CURBS')), `${quality} repeated center-board gardens render as a stable instance batch`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_G01_INSTANCED_PARAPET_BLOCKS_0')), `${quality} repeated center-board parapets render as stable instance batches`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_H_OCEAN_VISTA_BATCH_00')), `${quality} static ocean scenery is consolidated by material`);
        assert(Boolean(world.root.getObjectByName('ISLAND_19_CIRCUIT_H_CAROUSEL_ROTATING_BATCH_00')), `${quality} the carousel keeps one animated pivot around consolidated render geometry`);
        assertEqual(world.board.tileRoot.visible, false, `${quality} assembled Circuit H does not double-render the Pilot-owned canonical 36 gameplay tiles`);
        assertEqual(world.dataset.island19CircuitHDecision, 'd015', `${quality} combined runtime identifies the explicit Blender-atlas approval`);
        assertEqual(world.dataset.island19CircuitHStaticBudget, '60000-triangles,3-draw-calls', `${quality} runtime exposes the bounded static exterior budget`);
        const waterfall = world.root.getObjectByName('ISLAND_19_G02_TWIN_ANIMATED_WATERFALL_RIBBONS');
        world.animate(0);
        const frozenWaterfallY = waterfall?.position.y;
        world.animate(19);
        assertEqual(waterfall?.position.y, frozenWaterfallY, `${quality} reduced motion freezes waterfall translation at a deterministic pose`);
        disposeSlice(world.root);
      });
    },
  },
  {
    name: 'keeps the Circuit I Blender atlas exterior local, batched, presentation-only, and physically open for the train',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const loaderSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island19CoasterCarnivalAtlasExterior.ts', 'utf8');
      const worldSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island19CoasterCarnivalCircuitFWorld.ts', 'utf8');
      const buildSource = fsMod.readFileSync('scripts/blender/build_island019_atlas_exterior.py', 'utf8');
      const report = JSON.parse(fsMod.readFileSync('.img2threejs/island-019-coaster-carnival/grand-grotto-build-report-d019-r01.json', 'utf8'));
      assert(fsMod.existsSync('public/assets/islands/island-019/coaster-carnival-exterior-v009.glb'), 'current palace-clearance GLB is bundled locally');
      assert(fsMod.existsSync('public/assets/islands/island-019/coaster-carnival-exterior-atlas-v008.png'), 'current palette atlas is bundled locally');
      assert(loaderSource.includes('coaster-carnival-exterior-v009.glb'), 'live loader uses the tested current export, not retired v004');
      assert(report.revision === 'r02' && report.status === 'bounded-correction-built-awaiting-runtime-quality-lord', 'Circuit I records its one bounded correction explicitly');
      assertEqual(report.decisionId, 'd016+d017+d018+d019', 'build report traces the approved exterior and integrated grand-grotto revisions');
      assertEqual(report.staticMeshCount, 1, 'static exterior is consolidated into one mesh');
      assertEqual(report.materialCount, 3, 'static exterior uses the bounded rock, paint and metal hierarchy on one atlas');
      assert(report.triangles <= report.triangleBudget, 'static exterior remains inside its 60k triangle ceiling');
      assert(report.expectedStaticDrawCalls <= report.drawCallBudget, 'static exterior remains inside its three-call ceiling');
      assertEqual(report.gameplayWrites, false, 'Blender build owns no gameplay writes');
      assertEqual(report.boardGeometryOwned, false, 'Blender build does not replace the canonical board');
      assertEqual(report.wonderExpressRouteOwned, false, 'Blender build does not replace the Wonder Express spline');
      assertEqual(report.purposeBuiltRailPortalOwned, true, 'Blender exterior owns the building void around the Three.js rail');
      assert(report.palacePortalClearWidth >= 1.85 && report.palacePortalClearHeight >= 2.7 && report.palacePortalDepth >= 2, 'palace opening records train-sized width, height and wall thickness');
      assert(loaderSource.includes('GLTFLoader'), 'runtime uses the established local GLB loader path');
      assert(loaderSource.includes("representation: 'local-blender-three-material-single-atlas-static-exterior'"), 'runtime labels the materially different representation honestly');
      assert(loaderSource.includes('boardGeometryOwned: false') && loaderSource.includes('wonderExpressRouteOwned: false'), 'runtime publishes board and ride ownership boundaries');
      assert(buildSource.includes('ISLAND_19_CIRCUIT_I_STATIC_BATCH'), 'Blender build emits the required consolidated render node');
      assert(buildSource.includes('CIRCUIT_I_PALACE_PORTAL_LEFT_JAMB') && buildSource.includes('CIRCUIT_I_PALACE_PORTAL_RIGHT_JAMB') && buildSource.includes('CIRCUIT_I_PALACE_PORTAL_LINTEL'), 'palace mass is constructed around the railway opening instead of covering it');
      assert(worldSource.includes('atlasExterior.root.userData.ready === true'), 'procedural fallback remains visible until the GLB is actually ready');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|localStorage/.test(loaderSource), 'Circuit H loader adds no gameplay write or UI state mirror');
    },
  },
  {
    name: 'exposes distinct front and middle wagon frames and freezes the Wonder Express under reduced motion',
    run: () => {
      const movingWorld = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low', reducedMotion: false });
      const front = movingWorld.getRideFrame(0.72, 'front');
      const middle = movingWorld.getRideFrame(0.72, 'middle');
      assert(front.position.distanceTo(middle.position) > 0.2, 'front and middle wagon sockets must not collapse to one camera point');
      assert(Math.abs(front.quaternion.length() - 1) < 0.0001, 'front wagon orientation remains normalized');
      assert(Math.abs(middle.quaternion.length() - 1) < 0.0001, 'middle wagon orientation remains normalized');
      const movingCar = movingWorld.train.children[0];
      const undercarriageSocket = movingCar.getObjectByName('ISLAND_19_CIRCUIT_F_CARRIAGE_1_UNDERCARRIAGE');
      assert(Boolean(undercarriageSocket?.userData.renderedByCarriageBatch), 'Wonder Express carriages preserve the named undercarriage socket around consolidated physical geometry');
      const movingWheel = movingCar.getObjectByName('ISLAND_19_CIRCUIT_F_CARRIAGE_1_WHEEL_PIVOT_FRONT_RIGHT')!;
      assert(Boolean(movingWheel), 'Wonder Express carriages expose named wheel contact pivots');
      const frontRiderSocket = movingWorld.root.getObjectByName('ISLAND_19_CIRCUIT_I_FRONT_CAR_RIDER_CAMERA_SOCKET');
      const middleRiderSocket = movingWorld.root.getObjectByName('ISLAND_19_CIRCUIT_I_MIDDLE_CAR_RIDER_CAMERA_SOCKET');
      assert(Boolean(frontRiderSocket && middleRiderSocket), 'front and middle POVs are named physical carriage-seat sockets');
      const frontCameraPosition = movingWorld.getRiderCameraPosition(0.82, 'front');
      const socketWorldPosition = frontRiderSocket!.getWorldPosition(new THREE.Vector3());
      assert(frontCameraPosition.distanceTo(socketWorldPosition) < 0.0001, 'front POV camera position is the actual moving front-car socket');
      const movingFerris = movingWorld.root.getObjectByName('ISLAND_19_CIRCUIT_F_FERRIS_WHEEL_PIVOT')!;
      movingWorld.animate(0);
      const movingStart = movingCar.position.clone();
      const movingWheelStart = movingWheel.rotation.x;
      const movingFerrisStart = movingFerris.rotation.z;
      movingWorld.animate(8);
      assert(movingStart.distanceTo(movingCar.position) > 0.5, 'elapsed time advances the train on the one canonical presentation path');
      assert(Math.abs(movingWheel.rotation.x - movingWheelStart) > 0.5, 'elapsed distance rotates the Wonder Express wheel assemblies');
      assert(Math.abs(movingFerris.rotation.z - movingFerrisStart) > 0.2, 'elapsed time animates the Ferris wheel landmark');
      disposeSlice(movingWorld.root);

      const reducedWorld = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low', reducedMotion: true });
      const reducedCar = reducedWorld.train.children[0];
      const reducedFerris = reducedWorld.root.getObjectByName('ISLAND_19_CIRCUIT_F_FERRIS_WHEEL_PIVOT')!;
      const reducedStart = reducedCar.position.clone();
      reducedWorld.animate(0);
      const reducedFerrisStart = reducedFerris.rotation.z;
      reducedWorld.animate(25);
      assert(reducedStart.distanceTo(reducedCar.position) < 0.0001, 'reduced motion freezes automatic train movement');
      assertEqual(reducedFerris.rotation.z, reducedFerrisStart, 'reduced motion freezes Ferris landmark motion');
      disposeSlice(reducedWorld.root);
    },
  },
  {
    name: 'builds the Wonder Circuit mission as dispatch, lift-hill, and loop-launch systems before the victory ride',
    run: async () => {
      const presentation = createIslandStagedRestorationThreePresentation({ islandNumber: 19, stageCount: 3, quality: 'low' });
      presentation.update({ islandNumber: 19, stageCount: 3, activatedStages: 3, constructionSequence: 1 }, true);
      assert(Boolean(presentation.root.getObjectByName('ISLAND_19_WONDER_CIRCUIT_DISPATCH_STATION')), 'stage one restores the real dispatch system');
      assert(Boolean(presentation.root.getObjectByName('ISLAND_19_WONDER_CIRCUIT_LIFT_HILL_POWER')), 'stage two restores the lift-hill traction relays');
      assert(Boolean(presentation.root.getObjectByName('ISLAND_19_WONDER_CIRCUIT_LOOP_LAUNCH')), 'stage three arms the loop launch');
      assert(Boolean(presentation.root.getObjectByName('ISLAND_19_WONDER_EXPRESS_VICTORY_RIDE_BEACON')), 'completed circuit exposes the victory-ride beacon');
      disposeSlice(presentation.root);

      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilotSource.includes("startWonderRideRef.current('front')") && pilotSource.includes("startWonderRideRef.current('middle')"), 'mission finale offers explicit front and middle wagon choices');
      assert(pilotSource.includes('getRideFrame(routeProgress, activeWonderRide.wagon)'), 'POV camera follows the canonical Wonder Express path owner');
      assert(pilotSource.includes('getRiderCameraPosition(routeProgress, activeWonderRide.wagon)'), 'POV camera occupies the physical selected-carriage seat socket');
      assert(pilotSource.includes('island19CircuitFWorld.train.visible = true'), 'the physical train and its nose/restraint remain visible during rider POV');
      assert(pilotSource.includes('const transitionVeilOpacity = 0'), 'the continuous physical ride never masks scene changes with a veil');
      assert(pilotSource.includes('island19CircuitFWorld.getRidePhaseStops()'), 'reduced-motion viewpoints follow the actual revised route phases');
      assert(!pilotSource.includes('const sleeperContact = Math.pow('), 'rider POV has no artificial sleeper shake');
      assert(pilotSource.includes('if (!activeWonderRide && !activeTrainRide) controls.update();'), 'orbit constraints cannot overwrite either ride camera');
      assert(pilotSource.includes("canvas.dataset.island19WonderRideContact = '0.000'"), 'reduced motion explicitly removes sleeper contact movement');
      assert(pilotSource.includes("requestedWonderRideProgressParam === null"), 'omitting the evidence progress parameter runs the complete Wonder Express instead of freezing at dispatch');
      assert(pilotSource.includes("island19WonderRideMission = 'restart-wonder-circuit-victory-lap'"), 'browser evidence identifies the canonical mission finale');
      assert(pilotSource.includes('island-5-three-pilot__wonder-ride-announcement'), 'Wonder Express owns one dedicated assistive announcement channel');
      assert(pilotSource.includes('aria-atomic="true"'), 'ride phase announcements are atomic instead of exposing a changing countdown');
      assert(pilotSource.includes('wonderRideExitButtonRef.current?.focus({ preventScroll: true })'), 'keyboard focus moves to the ride exit control when a wagon starts');
      assert(pilotSource.includes('returnButton?.focus({ preventScroll: true })'), 'keyboard focus returns to the selected wagon after the ride');
      assert(!pilotSource.includes('className="island-5-three-pilot__train-ride-hud" role="status" aria-live="polite">\n          <div>\n            <span>{activeWonderRideCopy.eyebrow}</span>'), 'the one-second Wonder Express countdown is not exposed as a live region');
    },
  },
  {
    name: 'uses one continuous physical island and ocean without ride image plates',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      [
        ISLAND_19_WONDER_GOLD_VAULT_BACKDROP,
        ISLAND_19_WONDER_DIAMOND_GALLERY_BACKDROP,
        ISLAND_19_WONDER_SEA_CAVE_BACKDROP,
      ].forEach((publicPath) => {
        assert(fsMod.existsSync(`public${publicPath}`), `${publicPath} must remain a bundled local ride asset`);
      });
      assert(!pilotSource.includes('island19GoldVaultBackdrop'), 'gold is physical geometry, never a scene background');
      assert(!pilotSource.includes('island19DiamondGalleryBackdrop'), 'diamond gallery is physical geometry');
      assert(!pilotSource.includes('island19SeaCaveBackdrop'), 'sea cave never swaps a backdrop');
      assert(!pilotSource.includes('island19OceanRevealBackdrop'), 'ocean is the same physical ocean as overview');
      assert(pilotSource.includes('scene.fog === activeWonderRide.returnFog'), 'ride fog cannot mutate the saved overview fog instance');
      assert(pilotSource.includes('controls.target.lerp(scenicFocus.point, 0.65 * scenicFocus.weight)'), 'balcony turns toward the real treasure floor without moving the seat');
      assert(pilotSource.includes('getRideFrame(routeProgress, activeWonderRide.wagon)'), 'premium plates never replace the canonical 3D track camera authority');
      const world = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low' });
      const retained = ['ISLAND_19_CIRCUIT_F_OCEAN', 'ISLAND_19_CIRCUIT_I_ATLAS_EXTERIOR_RUNTIME', 'ISLAND_19_CIRCUIT_F_TRAVERSABLE_TREASURE_CAVERN', 'ISLAND_19_CIRCUIT_I_DEEP_UNDERSEA_GLASS_TUBE'];
      for (const u of world.getRidePhaseStops()) {
        world.setRidePhaseVisibility(world.getRideFrame(u).phase);
        retained.forEach(name => assert(world.root.getObjectByName(name)?.visible, name + ' remains in every phase'));
      }
      const ocean = world.root.getObjectByName(retained[0]) as THREE.Mesh;
      assertEqual(ocean.geometry.userData.rideApertureCount, 2, 'water surface has physical descent and ascent apertures');
      assertEqual(new Set(world.getRidePhaseStops().map(u => world.getRideFrame(u).phase)).size, 10, 'reduced-motion stops cover all ten phases');
      disposeSlice(world.root);
    },
  },
  {
    name: 'shared Wonder Express route is tangent-continuous and wide enough for its physical tunnel',
    run: () => {
      const path = createIsland19CircuitFRoutePath();
      path.curves.forEach((segment, index) => {
        const curve = segment as THREE.CubicBezierCurve3;
        const next = path.curves[(index + 1) % path.curves.length] as THREE.CubicBezierCurve3;
        assert(curve.v3.distanceTo(next.v0) < 1e-8, 'route join is connected');
        assert(curve.v3.clone().sub(curve.v2).distanceTo(next.v1.clone().sub(next.v0)) < 1e-8, 'both sides share the same derivative');
        for (let sample = 0; sample <= 500; sample += 1) {
          const t = sample / 500;
          const derivative = curve.v1.clone().sub(curve.v0).multiplyScalar(3 * (1-t)**2)
            .addScaledVector(curve.v2.clone().sub(curve.v1), 6 * (1-t) * t)
            .addScaledVector(curve.v3.clone().sub(curve.v2), 3 * t*t);
          const acceleration = curve.v2.clone().add(curve.v0).addScaledVector(curve.v1, -2).multiplyScalar(6*(1-t))
            .addScaledVector(curve.v3.clone().add(curve.v1).addScaledVector(curve.v2, -2), 6*t);
          const radius = derivative.length()**3 / derivative.clone().cross(acceleration).length();
          assert(radius > (curve.v0.y < 1.43 && index > 10 ? 1.8 : 1.2), 'curve ' + index + ' radius ' + radius + ' clears swept geometry');
        }
      });
    },
  },
  {
    name: 'Wonder Express uses gradual dispatch, powered lift, gravity acceleration and scenic brakes',
    run: () => {
      const world = createIsland19CoasterCarnivalCircuitFWorld({quality: 'low'});
      const { samples, sampleAtTime, durationSeconds } = world.pacing;
      assert(samples.every(s => Number.isFinite(s.speed) && s.speed > 0 && s.speed <= 5.8 * WONDER_RIDE_SPEED_SCALE), 'speed envelope is finite and bounded');
      assert(durationSeconds > 40 && durationSeconds < 50, 'the express ride is materially faster than the former 86-second lap');
      assert(samples[0].speed < .75 && samples[samples.length-1].speed < .75, 'station ends remain deliberately slow');
      const fast = samples.filter(s => s.mode === 'gravity-run').map(s => s.speed);
      const lift = samples.filter(s => s.mode === 'chain-lift' && world.getRideFrame(s.progress).phase === 'source-crest').map(s => s.speed);
      assert(Math.max(...fast) > Math.max(...lift)*2, 'gravity drops run meaningfully faster than powered climb');
      for (let i=1;i<samples.length;i++) {
        const acceleration = (samples[i].speed-samples[i-1].speed)/(samples[i].seconds-samples[i-1].seconds);
        assert(acceleration >= -1.151 * WONDER_RIDE_SPEED_SCALE**2 && acceleration < 4.31 * WONDER_RIDE_SPEED_SCALE**2, 'time-scaled acceleration and braking stay bounded');
      }
      let previous=0;
      for(let seconds=0;seconds<durationSeconds;seconds+=.1){
        const pose=sampleAtTime(seconds);
        assert(pose.progress>=previous && pose.progress<=1, 'elapsed-time mapping advances monotonically');
        previous=pose.progress;
      }
      assert(Math.abs(sampleAtTime(durationSeconds).progress-1)<1e-7, 'paced journey reaches the station seam');
      const hall=world.root.getObjectByName('ISLAND_19_D019_GRAND_TREASURE_GROTTO')!;
      assert(hall.userData.physicalCavity, 'second-level room is a persistent physical cavity');
      const balcony=world.getRidePhaseStops().find(u=>world.getRideFrame(u).phase==='grand-vault')!;
      const height=world.getRideFrame(balcony).position.y-hall.userData.floorY;
      assert(height>6, 'balcony overlooks the treasure floor from more than six metres above');
      assert(Boolean(hall.getObjectByName('ISLAND_19_D019_GROTTO_BALCONY_LOAD_PIERS')), 'balcony is carried by real piers');
      disposeSlice(world.root);
    },
  },
  {
    name: 'steadies camera rotation and supplies a persistent reduced-motion-safe climb sky',
    run: () => {
      const filter = createWonderRideCameraFilter();
      const axis = new THREE.Vector3(0,1,0);
      let previous = 0, previousVelocity = 0, oldAngle = 0, oldVelocity = 0;
      let jitter = 0, oldJitter = 0;
      for(let i=0;i<240;i++) {
        const targetAngle = i / 60 * .2 + (i % 2 ? .06 : -.06);
        const target = new THREE.Quaternion().setFromAxisAngle(axis,targetAngle);
        const angle = new THREE.Euler().setFromQuaternion(filter.update(target,1/60)).y;
        const nextOld = THREE.MathUtils.lerp(oldAngle,targetAngle,1-Math.exp(-12/60));
        if(i>30) {
          jitter += Math.abs(angle-previous-previousVelocity);
          oldJitter += Math.abs(nextOld-oldAngle-oldVelocity);
        }
        previousVelocity=angle-previous;
        oldVelocity=nextOld-oldAngle;
        previous=angle;
        oldAngle=nextOld;
      }
      assert(jitter < oldJitter * .4, 'two-stage camera substantially rejects frame-to-frame rotation noise');
      const frozen = new THREE.Quaternion().setFromAxisAngle(axis,.5);
      assert(filter.update(frozen,0,true).angleTo(frozen)<1e-6,'fixed and reduced-motion viewpoints snap deterministically');
      const sky=createIsland19SkyAmbience(true);
      const plane=sky.root.getObjectByName('ISLAND_19_D020_DISTANT_SKY_COURIER')!;
      const start=plane.position.clone();
      sky.animate(50);
      assert(plane.position.equals(start),'reduced motion freezes sky flight');
      assert(plane.position.y>30,'sky courier stays distant above the entire ride');
      const clouds=sky.root.getObjectByName('ISLAND_19_D020_HIGH_CUMULUS') as THREE.InstancedMesh;
      assertEqual(clouds.count,48,'climb sky has eight small batched cloud clusters');
      disposeSlice(sky.root);
    },
  },
  {
    name: 'ships the approved all-angle Island 019 by default with an explicit hybrid diagnostic fallback',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const circuitFSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island19CoasterCarnivalCircuitFWorld.ts', 'utf8');
      assert(pilotSource.includes("get('island19CircuitF') !== '0'"), 'the approved live island must not require a preview query flag');
      assert(pilotSource.includes("'all-angle-3d-world'"), 'ordinary live presentation identifies the all-angle world');
      assert(pilotSource.includes('createIsland19CoasterCarnivalCircuitFWorld'), 'live renderer keeps the all-angle ride world ready for preview and mission use');
      assert(pilotSource.includes("canvas.dataset.island19CircuitIReady = String(atlasData?.ready === true)"), 'live evidence distinguishes a loaded Circuit I GLB from its safe procedural fallback');
      assert(pilotSource.includes("'circuit-i-source-identity-exterior-with-deep-undersea-wonder-express'"), 'live evidence identifies the approved Circuit I representation');
      assert(pilotSource.includes('island19CircuitFWorld.root.visible = isCircuitFPreviewEnabled'), 'production overview mounts the default all-angle world');
      assert(pilotSource.includes('island19CircuitFWorld.root.visible = true'), 'mission activation reveals the full ride world');
      assert(pilotSource.includes('isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.3 : 1'), 'Circuit F and Circuit G restore canonical route blocks to normal visual scale');
      assert(pilotSource.includes('!isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled) tileRewardObjects.root.scale.setScalar(0.62)'), 'Circuit F and Circuit G restore tile reward presentation to normal canonical scale');
      assert(pilotSource.includes('!isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled) playerPiece.root.scale.multiplyScalar(0.62)'), 'Circuit F and Circuit G restore the live token to normal canonical scale');
      assert(pilotSource.includes('!isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled && !isMapStrippedEvidenceEnabled'), 'Circuit E plate remains the rollback fallback outside Circuit F and Circuit G previews');
      assert(pilotSource.includes("position: [1.25, 17.3, 31.7] as const"), 'production overview keeps the live Three.js overlay on the closer Island 019 establishing camera');
      assert(pilotSource.includes("activePreset === 'survey' ? '172% auto' : '112% auto'"), 'production overview enlarges the source-locked plate without replacing the dedicated board survey');
      assert(pilotSource.includes("activePreset === 'survey' ? 'center 43%' : 'center 10%'"), 'production overview trades surplus lower ocean for a larger readable island while retaining crest sky');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|localStorage/.test(circuitFSource), 'Circuit F world remains presentation-only with no gameplay writes');
      assert(circuitFSource.includes("type Island19CircuitFWagon = 'front' | 'middle'"), 'Circuit F explicitly supports front and middle wagon camera contracts');
      assert(circuitFSource.includes("'gold-vault'") && circuitFSource.includes("'diamond-gallery'") && circuitFSource.includes("'ocean-reveal'"), 'Circuit F route declares treasure and ocean mission phases');
    },
  },
  {
    name: 'keeps the Circuit D source-loft root, closed railway, open portal, topology, route clearance, and nine-part manifest valid at every tier',
    run: () => {
      (['low', 'medium', 'high'] as const).forEach((quality) => {
        const world = createIsland19CoasterCarnivalSourceLoftWorld({ quality });
        assert(world.diagnostics.valid, `${quality} Circuit D diagnostics must pass: ${world.diagnostics.errors.join(', ')}`);
        assert(world.diagnostics.stationCount >= 56, `${quality} loft must keep at least 56 authored stations`);
        assertEqual(world.diagnostics.sectionBoundaryVertices, 8, `${quality} every runner uses an eight-vertex boundary loop`);
        assert(world.diagnostics.maximumStationSpacing <= 0.35, `${quality} visible station spacing remains bounded`);
        assert(world.diagnostics.seamDistance <= 0.001, `${quality} circuit seam must remain closed`);
        assert(world.diagnostics.seamTangentDot >= 0.995, `${quality} circuit seam tangent must remain continuous`);
        assertEqual(world.diagnostics.nonManifoldEdges, 0, `${quality} root and capped lofts must be manifold`);
        assert(world.diagnostics.rootSectorCount >= 48, `${quality} root must keep at least 48 azimuth sectors`);
        assertEqual(world.diagnostics.rootRingCount, 7, `${quality} root must keep seven independently authored rings`);
        assert(world.diagnostics.rootDepthToTopWidthRatio >= 0.32, `${quality} root must remain deeply volumetric`);
        assert(world.diagnostics.portalSideMargin >= 0.25, `${quality} carriage envelope must clear portal sides`);
        assert(world.diagnostics.portalTopMargin >= 0.2, `${quality} carriage envelope must clear portal top`);
        assert(world.diagnostics.portalBottomMargin >= 0.2, `${quality} carriage envelope must clear portal floor`);
        assert(world.diagnostics.landmarkMinimumSeparation >= 2.5, `${quality} five source-positioned landmark masses must remain distinct`);
        assertEqual(world.diagnostics.routeViolations.length, 0, `${quality} support footings must clear the canonical route`);
        assert(world.diagnostics.manifestValid, `${quality} runtime part manifest must remain complete`);
        assertEqual(world.parts.length, ISLAND_19_SOURCE_LOFT_PART_IDS.length, `${quality} blockout has exactly nine approved macro parts`);
        disposeSlice(world.root);
      });
    },
  },
  {
    name: 'derives elapsed train motion and swept-envelope samples from the one arc-length circuit owner',
    run: () => {
      const world = createIsland19CoasterCarnivalSourceLoftWorld({ quality: 'low' });
      const start = world.getTrainPose(0);
      const moved = world.getTrainPose(2.5);
      assert(start.position.distanceTo(moved.position) > 0.5, 'elapsed time must advance the train along the circuit');
      assert(Math.abs(start.quaternion.length() - 1) < 0.0001, 'train pose quaternion must remain normalized');
      const envelope = Array.from({ length: 64 }, (_, index) => world.sectionTable.getFrameAtU(index / 64));
      assertEqual(envelope.length, 64, 'diagnostic envelope honors its bounded sample count');
      assert(envelope.every((sample) => Number.isFinite(sample.position.x) && Number.isFinite(sample.position.y) && Number.isFinite(sample.position.z)), 'every swept-envelope sample must remain finite');
      assertEqual(world.root.userData.sculptRuntime?.pathOwner, ISLAND_19_SOURCE_LOFT_PATH_OWNER, 'all ride consumers share the Circuit D section-table path owner');
      disposeSlice(world.root);
    },
  },
  {
    name: 'animates all five Circuit E overlay systems and freezes them deterministically for reduced motion',
    run: () => {
      const sourceWorld = createIsland19CoasterCarnivalSourceLoftWorld({ quality: 'low' });
      const overlay = createIsland19CoasterCarnivalHybridOverlay({
        quality: 'low',
        getTrainPose: sourceWorld.getTrainPose,
      });
      const ferris = overlay.root.getObjectByName('island19-hybrid-ferris-wheel-pivot');
      const drop = overlay.root.getObjectByName('island19-hybrid-drop-carriage-pivot');
      const carousel = overlay.root.getObjectByName('island19-hybrid-carousel-pivot');
      const train = overlay.root.getObjectByName('island19-hybrid-train-car-0');
      assert(Boolean(ferris && drop && carousel && train), 'hybrid overlay must expose the four named ride pivots');
      overlay.animate(0, false);
      const startTrain = train!.position.clone();
      const startFerris = ferris!.rotation.z;
      const startDrop = drop!.position.y;
      overlay.animate(3.25, false);
      assert(startTrain.distanceTo(train!.position) > 0.5, 'Wonder Train must move along the real Circuit D distance owner');
      assert(Math.abs(ferris!.rotation.z - startFerris) > 0.1, 'Ferris wheel pivot must move with elapsed time');
      assert(Math.abs(drop!.position.y - startDrop) > 0.1, 'drop carriage must move with elapsed time');
      assert(Math.abs(carousel!.rotation.y) > 0.1, 'carousel pivot must move with elapsed time');
      overlay.animate(5, true);
      const reducedFerris = ferris!.rotation.z;
      const reducedDrop = drop!.position.y;
      const reducedTrain = train!.position.clone();
      overlay.animate(25, true);
      assertEqual(ferris!.rotation.z, reducedFerris, 'reduced motion freezes the Ferris wheel');
      assertEqual(drop!.position.y, reducedDrop, 'reduced motion freezes the drop carriage');
      assert(reducedTrain.distanceTo(train!.position) < 0.0001, 'reduced motion freezes the train pose');
      assertEqual(overlay.dataset.island19HybridPlate, ISLAND_19_HYBRID_PHONE_PLATE, 'runtime identifies the admitted phone plate');
      assertEqual(overlay.root.userData.sculptRuntime?.dynamicOwners.length, 5, 'runtime declares five genuine animated overlay owners');
      assertEqual(overlay.dataset.island19HybridBuildAnchors, '5', 'runtime mounts one construction anchor for every canonical landmark');
      disposeSlice(overlay.root);
      disposeSlice(sourceWorld.root);
    },
  },
  {
    name: 'renders honest L1, L2, and L3 construction stages for Island 019 landmarks',
    run: () => {
      const sourceWorld = createIsland19CoasterCarnivalSourceLoftWorld({ quality: 'low' });
      const levels = { boss: 1, hatchery: 2, habit: 3, wisdom: 0, event: 3 } as const;
      const overlay = createIsland19CoasterCarnivalHybridOverlay({
        quality: 'low',
        buildLevels: levels,
        getTrainPose: sourceWorld.getTrainPose,
      });
      assert(Boolean(overlay.root.getObjectByName('island19-hybrid-boss-l1-foundation')), 'L1 boss exposes its foundation stage');
      assert(!overlay.root.getObjectByName('island19-hybrid-boss-l2-beam'), 'L1 boss does not leak L2 framing');
      assert(Boolean(overlay.root.getObjectByName('island19-hybrid-hatchery-l2-beam')), 'L2 hatchery exposes its framing stage');
      assert(!overlay.root.getObjectByName('island19-hybrid-hatchery-l3-crown'), 'L2 hatchery does not leak commissioning crown');
      assert(Boolean(overlay.root.getObjectByName('island19-hybrid-habit-l3-crown')), 'L3 habit exposes its commissioning crown');
      assert(Boolean(overlay.root.getObjectByName('island19-hybrid-event-l3-crown')), 'L3 event exposes its commissioning crown');
      assert(!overlay.root.getObjectByName('island19-hybrid-wisdom-l1-foundation'), 'L0 wisdom has no visible built stage');
      assertEqual(overlay.root.userData.sculptRuntime?.buildOwners.length, 5, 'runtime declares all five canonical build owners');
      disposeSlice(overlay.root);
      disposeSlice(sourceWorld.root);
    },
  },
  {
    name: 'mounts Circuit E in the live shell while retaining Circuit D only as plate-free geometry proof',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const worldSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island19CoasterCarnivalSourceLoftWorld.ts', 'utf8');
      const hybridSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island19CoasterCarnivalHybridOverlay.ts', 'utf8');
      assert(pilotSource.includes('createIsland19CoasterCarnivalSourceLoftWorld'), 'Island 019 must retain Circuit D as geometry proof and train-distance authority');
      assert(pilotSource.includes('createIsland19CoasterCarnivalHybridOverlay'), 'Island 019 must mount the admitted Circuit E overlay');
      assert(pilotSource.includes("canvas.dataset.island19RepresentativeVariant = 'circuit-e-source-locked-hybrid'"), 'browser evidence must identify the active hybrid representation');
      assert(pilotSource.includes('backgroundImage: `url(${ISLAND_19_HYBRID_PHONE_PLATE})`'), 'normal runtime must mount the admitted clean phone plate');
      assert(pilotSource.includes('island19FullWorld.root.visible = isMapStrippedEvidenceEnabled'), 'Circuit D must be visible only in geometry-proof mode');
      assert(pilotSource.includes('geometryProofTrain.visible = isMapStrippedEvidenceEnabled'), 'the world-space train must not float over the source-facing plate');
      assert(pilotSource.includes('routeGlow.visible = !isCoasterCarnival'), 'the generic route glow must start hidden before Island 019 first frame');
      assert(pilotSource.includes('routeGlow.visible = showPlayableRoute && !isCoasterCarnival'), 'the generic flat route glow must not cover the source-authored plaza');
      assert(pilotSource.includes("canvas.dataset.island19FullWorld = 'mounted'"), 'browser evidence must expose the mounted full world');
      assert(pilotSource.includes('island19PortalMinimumSideMargin'), 'browser evidence must expose positive portal-clearance proof');
      assert(pilotSource.includes('island19LandmarksDistinct'), 'browser evidence must expose five-landmark macro proof');
      assert(!/TubeGeometry|CatmullRomCurve3|CubicBezierCurve3|QuadraticBezierCurve3/.test(worldSource), 'Circuit D visible geometry must not use a prohibited curve-owned shell');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|localStorage/.test(worldSource), 'the procedural world must stay presentation-only');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState|localStorage/.test(hybridSource), 'the hybrid overlay must stay presentation-only');
    },
  },
];
