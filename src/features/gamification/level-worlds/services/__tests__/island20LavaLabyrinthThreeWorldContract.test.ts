import * as THREE from 'three';
import {
  ISLAND_3D_QUALITY_PROFILES,
  ISLAND_5_LANDMARKS,
} from '../../dev/island5ThreePilotContract';
import {
  buildIsland20LavaLabyrinthLandmark,
  collectIsland20EscapeRouteClearanceViolations,
  collectIsland20RuntimePartManifest,
  createIsland20LavaFlowOverlay,
  createIsland20LavaLabyrinthLivingAmbience,
  createIsland20LavaLabyrinthMaterials,
  isIsland20RouteCorridorClear,
  ISLAND_20_HYBRID_ENVIRONMENT_PLATE,
  ISLAND_20_AUTHORED_CITY_GLB,
  ISLAND_20_AUTHORED_CITY_SCALE,
  ISLAND_20_LAVA_FLOW_ADDITIONAL_DRAW_CALLS,
  ISLAND_20_LAVA_FLOW_ADDITIONAL_TRIANGLES,
  ISLAND_20_LAVA_VOLUME_ADDITIONAL_DRAW_CALLS_MAX,
  ISLAND_20_LAVA_VOLUME_ADDITIONAL_TRIANGLES_MAX,
  ISLAND_20_RUNTIME_PART_IDS,
} from '../../dev/Island20LavaLabyrinthThreeWorld';
import { assert, assertEqual, type TestCase } from './testHarness';

function disposeRoot(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.InstancedMesh) {
      object.geometry.dispose();
    }
  });
}

function measureVisibleRuntime(roots: THREE.Object3D[]) {
  let drawCalls = 0;
  let triangles = 0;
  roots.forEach((root) => {
    root.updateMatrixWorld(true);
    root.traverse((object) => {
      let cursor: THREE.Object3D | null = object;
      while (cursor) {
        if (!cursor.visible) return;
        cursor = cursor.parent;
      }
      if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh || object instanceof THREE.Points)) return;
      drawCalls += 1;
      const positionCount = object.geometry.attributes.position?.count ?? 0;
      const indexCount = object.geometry.index?.count ?? 0;
      const instanceCount = object instanceof THREE.InstancedMesh ? object.count : 1;
      triangles += Math.floor((indexCount || positionCount) / 3) * instanceCount;
    });
  });
  return { drawCalls, triangles };
}

export const island20LavaLabyrinthThreeWorldContractTests: TestCase[] = [
  {
    name: 'keeps the retired plate shader deterministic while the live family uses physical lava geometry',
    run: async () => {
      const texture = new THREE.DataTexture(new Uint8Array([255, 72, 4, 255]), 1, 1, THREE.RGBAFormat);
      texture.needsUpdate = true;
      const overlay = createIsland20LavaFlowOverlay(texture);
      assertEqual(overlay.root.name, 'ISLAND_20_LAVA_FLOW_AND_HEAT_OVERLAY', 'the live plate effect must remain addressable');
      assertEqual(overlay.root.renderOrder, -10_000, 'the effect must render behind live board geometry');
      assertEqual(overlay.root.userData.flowDirection, 'gravity-down-and-centre-outward', 'surface channels and cliff falls need authored directions');
      assertEqual(overlay.root.userData.heatIllumination, 'molten-pixel-local-bounce', 'heat must illuminate local basalt rather than tinting the whole screen');
      assertEqual(ISLAND_20_LAVA_FLOW_ADDITIONAL_DRAW_CALLS, 1, 'the full-screen lava pass must cost exactly one draw call');
      assertEqual(ISLAND_20_LAVA_FLOW_ADDITIONAL_TRIANGLES, 2, 'the full-screen lava pass must remain one quad');
      assertEqual(ISLAND_20_LAVA_VOLUME_ADDITIONAL_DRAW_CALLS_MAX, 0, 'the final v3 correction must add no calls above the accepted v2 scene');
      assertEqual(ISLAND_20_LAVA_VOLUME_ADDITIONAL_TRIANGLES_MAX, 0, 'the final v3 correction must add no geometry above the accepted v2 scene');
      overlay.animate(6, false);
      assertEqual(overlay.root.material.uniforms.uElapsed.value, 6, 'normal motion must be elapsed-time driven');
      assertEqual(overlay.root.material.uniforms.uMotionMix.value, 1, 'normal motion must enable directional flow');
      overlay.animate(12, true);
      assertEqual(overlay.root.material.uniforms.uElapsed.value, 0, 'reduced motion must return to one deterministic pose');
      assertEqual(overlay.root.material.uniforms.uMotionMix.value, 0, 'reduced motion must disable advected ribbons and shimmer');
      assert(overlay.root.material.fragmentShader.includes('float heatHalo'), 'the shader must derive heat bounce from neighbouring molten pixels');
      assert(overlay.root.material.fragmentShader.includes('distanceAlongFlow * 118.0 - uElapsed * 5.4'), 'the shader must encode directional travel rather than brightness-only pulsing');
      assert(overlay.root.material.fragmentShader.includes('float coolingEdge'), 'the molten field must separate its hot core from darker cooling crust');

      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const worldSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island20LavaLabyrinthThreeWorld.ts', 'utf8');
      assert(!pilotSource.includes('createIsland20LavaFlowOverlay(scene.background)'), 'the actual-3D family must not reinstall the retired camera-locked plate shader');
      assert(!pilotSource.includes('lavaLabyrinthFlowOverlay?.animate'), 'the live renderer must animate physical lava through the world runtime instead of a screen quad');
      assert(pilotSource.includes("get('island20LavaTime')"), 'the Gauntlet needs a deterministic t0/t6 evidence clock');
      assert(pilotSource.includes("get('island3dReducedMotion') === '1'"), 'the Gauntlet needs a deterministic development-only reduced-motion evidence switch');
      assert(pilotSource.includes('material.emissiveIntensity = base + thermalContact'), 'the live route must receive heat through its existing materials without another draw call');
      assert(pilotSource.includes("physical-lava-contact-plus-live-forge-lights-and-tile-emissive-response"), 'runtime evidence must identify the actual-3D heat-lighting contract');
      assert(worldSource.includes('ISLAND_20_AUTHORED_DIRECTIONAL_LAVA_SHADER'), 'the authored Blender canals need their own UV-independent directional flow material');
      assert(worldSource.includes('vec2 verticalUv') && worldSource.includes('uElapsed * 0.42'), 'vertical authored lava must visibly advect under gravity instead of only pulsing brightness');
      assert(worldSource.includes('float cooledRaft') && worldSource.includes('float hotCore'), 'authored lava must separate cooled crust rafts from narrow hot fissures');
      assert(worldSource.includes('float lavaFbm') && worldSource.includes('vec2 warpedUv'), 'authored lava must use multi-scale domain warping rather than regular candy stripes');
      assert(worldSource.includes('position + normal * mix(fallingWave, horizontalWave, horizontalSurface)'), 'authored canals and falls need physical surface displacement rather than texture-only motion');
      assert(worldSource.includes('ISLAND20_LAVA_OCTAVES') && worldSource.includes('lavaNoiseOctaves(quality)'), 'lava FBM cost must scale with the selected mobile quality profile');
      assert(worldSource.includes('two-frequency-vertex-displacement-with-derived-wave-normals'), 'the magma sea must advertise its physical wave and normal response for runtime evidence');
      assert(worldSource.includes('basePosition') && worldSource.includes('thermalElapsed * 0.23'), 'localized canal heat must drift across nearby masonry instead of only pulsing in place');
      assert(worldSource.includes('#include <tonemapping_fragment>') && worldSource.includes('#include <colorspace_fragment>'), 'custom lava shaders must participate in renderer tone mapping and output color conversion');

      overlay.root.geometry.dispose();
      overlay.root.material.dispose();
      texture.dispose();
    },
  },
  {
    name: 'uses one visible actual-3D volcanic environment without the retired source-led plate',
    run: () => {
      assertEqual(
        ISLAND_20_HYBRID_ENVIRONMENT_PLATE,
        '/assets/islands/island-020/background/lava-labyrinth-environment-plate-v001.webp',
        'the retired comparison plate must keep a stable project-bound path',
      );
      const materials = createIsland20LavaLabyrinthMaterials('low');
      assert(materials.magmaCore instanceof THREE.MeshStandardMaterial, 'the river hot core must retain lit PBR response instead of using an un-tonemapped basic neon strip');
      assertEqual(materials.magmaCore.toneMapped, true, 'the river hot core must pass through the renderer tone map');
      const scene = new THREE.Scene();
      const ambience = createIsland20LavaLabyrinthLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.low, materials);
      assertEqual(
        ambience.root.userData.representationFamily,
        'rectilinear-terraced-lava-city-glb-v10',
        'runtime diagnostics must identify the promoted authored multipart construction family',
      );
      assertEqual(ISLAND_20_AUTHORED_CITY_GLB, '/assets/islands/island-020/models/lava-labyrinth-v10-rectilinear-city.glb', 'runtime must load the quality-gated authored city asset');
      assertEqual(ISLAND_20_AUTHORED_CITY_SCALE, 0.42, 'the authored city must leave the canonical route and mission pickups visually readable');
      assertEqual(ambience.root.userData.authoredCity.replacementScope, 'central-citadel-and-labyrinth-visuals-only', 'the GLB must not replace canonical route or mission services');
      assertEqual(ambience.root.userData.environmentPlateAllowed, false, 'the actual-3D family must forbid a runtime environment plate');
      assert(
        String(ambience.root.userData.lavaLookDevelopment.surface).includes('cooled-crust-rafts'),
        'runtime diagnostics must identify the layered crust/hot-fissure surface system',
      );
      [
        'ISLAND_20_ACTUAL_3D_CONTINUOUS_VOLCANIC_WORLD',
        'ISLAND_20_CANONICAL_ROUTE_CONTEXT',
        'ISLAND_20_VOLCANIC_HORIZON',
        'ISLAND_20_STONE_CIRCULATION_NETWORK',
      ].forEach((name) => {
        const node = ambience.root.getObjectByName(name);
        assert(Boolean(node), `${name} must exist in the live volumetric hierarchy`);
        assertEqual(node?.visible, true, `${name} must render in the actual-3D family`);
      });
      assert(Boolean(ambience.root.getObjectByName('ISLAND_20_ACTUAL_3D_TERRAIN_VOLUME')), 'the world must include one closed terrain volume');
      assert(Boolean(ambience.root.getObjectByName('ISLAND_20_OUTER_MOLTEN_CATCHBASINS')), 'the world must terminate its physical rivers in irregular molten catchbasins rather than a racetrack ring');
      assert(Boolean(ambience.root.getObjectByName('ISLAND_20_IRREGULAR_PHYSICAL_MAGMA_SEA')), 'the cliff waterfalls must terminate in a physical magma sea instead of darkness or a camera-locked plate');
      assertEqual(
        ((ambience.root.getObjectByName('ISLAND_20_IRREGULAR_PHYSICAL_MAGMA_SEA') as THREE.Mesh)?.material as THREE.Material).name,
        'ISLAND_20_MAGMA_SEA_CELLULAR_FLOW_SHADER',
        'the magma sea must use animated cellular fractures instead of a repeated stripe texture',
      );
      const magmaSea = ambience.root.getObjectByName('ISLAND_20_IRREGULAR_PHYSICAL_MAGMA_SEA') as THREE.Mesh;
      const magmaSeaMaterial = magmaSea.material as THREE.ShaderMaterial;
      assertEqual(magmaSeaMaterial.defines?.ISLAND20_LAVA_OCTAVES, 2, 'low quality must use the bounded two-octave lava shader');
      assert(magmaSeaMaterial.vertexShader.includes('float waveHeight'), 'the physical magma sea must displace its grid surface in the vertex shader');
      assertEqual(magmaSea.userData.surfaceMotion, 'two-frequency-vertex-displacement-with-derived-wave-normals', 'runtime evidence must identify the sea surface motion model');
      const liveLava = ambience.root.getObjectByName('ISLAND_20_ACTUAL_3D_RECESSED_LAVA_NETWORK');
      assert(Boolean(liveLava), 'the approved runtime hierarchy must retain the named physical lava-network part');
      assertEqual(liveLava?.visible, true, 'physical rivers and cliff falls must remain live in the actual-3D family');
      assertEqual(liveLava?.userData.volumeScope, 'surface-rivers-and-cliff-falls', 'lava diagnostics must identify the complete physical flow scope');
      assertEqual(liveLava?.userData.flowDirection, 'crucible-outward-then-gravity-down', 'lava must flow out from the Citadel and then obey gravity');
      assert(
        Boolean(liveLava?.getObjectByName('ISLAND_20_RECESSED_LAVA_CHANNEL_1_BED')),
        'the live actual-3D layer must own recessed channel beds beneath the molten surface',
      );
      assertEqual(
        ambience.root.getObjectByName('ISLAND_20_IRON_SKIFF_ESCAPE_MISSION')?.visible,
        true,
        'the real mission machinery stays live above the volumetric island',
      );
      disposeRoot(ambience.root);
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'authors five distinct clickable Lava Labyrinth families across additive L0-L3 states',
    run: () => {
      const materials = createIsland20LavaLabyrinthMaterials('low');
      const l3Bounds: string[] = [];
      ISLAND_5_LANDMARKS.forEach((landmark) => {
        const levels = ([0, 1, 2, 3] as const).map((level) => {
          const root = buildIsland20LavaLabyrinthLandmark(landmark, level, 'low', materials);
          assert(root.userData.sculptRuntime?.clickable, `${landmark.id} must remain clickable`);
          assert(Boolean(root.getObjectByName(`ISLAND_20_${landmark.id.toUpperCase()}_FOCUS_SOCKET`)), `${landmark.id} needs a focus socket`);
          if (landmark.id === 'boss' && level === 3) {
            assert(Boolean(root.getObjectByName('ISLAND_20_LEVEL_3_ESCAPE_LABYRINTH')), 'boss L3 needs the dedicated escape labyrinth');
            assert(Boolean(root.getObjectByName('ISLAND_20_SUMMIT_IRON_SKIFF_LAUNCH_DAVIT')), 'boss L3 needs the summit launch silhouette');
            const maze = root.getObjectByName('ISLAND_20_MESH_FIRST_ORTHOGONAL_LABYRINTH');
            assert(Boolean(maze), 'boss L3 needs the dense mesh-first orthogonal maze');
            assertEqual(maze?.userData.navigation?.topology, 'deterministic-perfect-maze', 'the Level-3 labyrinth must be a connected navigable maze rather than decorative rails');
            assertEqual(maze?.userData.navigation?.cells, 81, 'boss L3 must expose the full 9x9 navigation field');
            [1, 2, 3].forEach((junction) => assert(Boolean(root.getObjectByName(`ISLAND_20_L3_JUNCTION_${junction}_GATEHOUSE`)), `boss L3 needs readable junction ${junction}`));
          }
          const bounds = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
          disposeRoot(root);
          return bounds;
        });
        assert(levels[1].y > levels[0].y, `${landmark.id} L1 must rise above its level-zero forge plot`);
        assert(levels[3].y > levels[1].y, `${landmark.id} L3 must add a taller identity silhouette`);
        l3Bounds.push(`${levels[3].x.toFixed(2)}:${levels[3].y.toFixed(2)}:${levels[3].z.toFixed(2)}`);
      });
      assertEqual(new Set(l3Bounds).size, 5, 'all five L3 landmark families need distinct visible bounds');
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'protects the canonical route and exposes all 32 approved runtime parts',
    run: () => {
      assert(isIsland20RouteCorridorClear(0, 0, 2.1), 'the central citadel footprint must remain inside the route');
      assert(!isIsland20RouteCorridorClear(3.4, 0, 0.12), 'the canonical 36-stop route annulus must remain clear');
      assert(isIsland20RouteCorridorClear(5.4, 0, 0.25), 'outer volcanic scenery may sit beyond the route');
      const materials = createIsland20LavaLabyrinthMaterials('low');
      const scene = new THREE.Scene();
      const ambience = createIsland20LavaLabyrinthLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.low, materials);
      const landmarks = ISLAND_5_LANDMARKS.map((landmark) => buildIsland20LavaLabyrinthLandmark(landmark, 3, 'low', materials));
      const manifest = collectIsland20RuntimePartManifest([ambience.root, ...landmarks]);
      const partNames = new Set(manifest.parts.map((part) => part.name));
      assertEqual(partNames.size, 32, 'the approved hierarchy must retain exactly 32 named runtime parts');
      ISLAND_20_RUNTIME_PART_IDS.forEach((id) => assert(partNames.has(id), `runtime manifest must include ${id}`));
      [ambience.root, ...landmarks].forEach(disposeRoot);
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'builds four cumulative Iron Skiff systems and completes a forgiving three-junction escape run',
    run: () => {
      const materials = createIsland20LavaLabyrinthMaterials('low');
      const scene = new THREE.Scene();
      const ambience = createIsland20LavaLabyrinthLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.low, materials);
      const systems = [1, 2, 3, 4].map((index) => ambience.root.getObjectByName(`ISLAND_20_IRON_SKIFF_STAGE_${index}`));
      assert(systems.every(Boolean), 'all four independently named Iron Skiff systems must exist');
      ambience.setIronSkiffStage(2);
      assertEqual(systems[0]?.visible, true, 'stage one hull remains assembled');
      assertEqual(systems[1]?.visible, true, 'stage two heatshields assemble');
      assertEqual(systems[2]?.visible, false, 'stage three steering remains unbuilt');
      ambience.setIronSkiffStage(4, true);
      assertEqual(ambience.root.getObjectByName('ISLAND_20_IRON_SKIFF_COMPLETE_BATCH')?.visible, true, 'completion collapses the assembled systems into the mobile-budget batch');
      assert(systems.every((system) => !system?.visible), 'the completed batch retires the more expensive progressive system meshes');
      assertEqual(ambience.root.getObjectByName('ISLAND_20_EXPEDITION_EXTRACTION_SHIP')?.visible, true, 'stage four reveals the extraction ship');
      [1, 2, 3].forEach((index) => assert(Boolean(ambience.root.getObjectByName(`ISLAND_20_NAVIGATION_GATE_${index}`)), `escape route needs junction ${index}`));
      ambience.updateIronSkiffNavigation({ active: true, steering: 1, throttle: 1, sequence: 1 });
      for (let frame = 1; frame <= 620; frame += 1) ambience.animate(frame / 60);
      assertEqual(ambience.consumeIronSkiffCompletion(), true, 'guided current guarantees extraction without a fail loop');
      assertEqual(ambience.consumeIronSkiffCompletion(), false, 'completion can only be consumed once');
      ambience.updateIronSkiffNavigation({ active: true, steering: 1, throttle: 1, sequence: 1 });
      ambience.animate(11);
      assertEqual(ambience.consumeIronSkiffCompletion(), false, 'a delayed React frame cannot repeat the same extraction sequence');
      assertEqual(ambience.root.userData.missionPresentation.missionId, 'escape-lava-labyrinth', 'runtime reports the final mission identity');
      ambience.root.updateMatrixWorld(true);
      assertEqual(collectIsland20EscapeRouteClearanceViolations(ambience.root).length, 0, 'static maze gates must preserve the canonical board route');
      disposeRoot(ambience.root);
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'settles the Iron Skiff extraction synchronously for reduced motion',
    run: () => {
      const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { matchMedia: () => ({ matches: true }) },
      });
      try {
        const materials = createIsland20LavaLabyrinthMaterials('low');
        const scene = new THREE.Scene();
        const ambience = createIsland20LavaLabyrinthLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.low, materials);
        ambience.setIronSkiffStage(4);
        ambience.updateIronSkiffNavigation({ active: true, steering: -1, throttle: 0, sequence: 1 });
        ambience.animate(0);
        assertEqual(ambience.consumeIronSkiffCompletion(), true, 'reduced motion must synchronously settle at the extraction cradle');
        assertEqual(ambience.root.userData.missionPresentation.progress, 1, 'reduced motion exposes the deterministic completed pose');
        disposeRoot(ambience.root);
        Object.values(materials).forEach((material) => material.dispose());
      } finally {
        if (originalWindowDescriptor) Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
        else Reflect.deleteProperty(globalThis, 'window');
      }
    },
  },
  {
    name: 'temporarily replaces the footer with hold steering and throttle controls without adding gameplay writes',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const controllerSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/LavaSkiffControllerAdapter.tsx', 'utf8');
      const boardSource = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const pilotSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const templateSource = fsMod.readFileSync('src/features/gamification/level-worlds/dev/IslandTemplateKitPage.tsx', 'utf8');
      assert(controllerSource.includes("onPointerDown") && controllerSource.includes("onPointerUp"), 'touch steering must remain active only while held');
      assert(controllerSource.includes("'ArrowLeft'") && controllerSource.includes("'ArrowRight'") && controllerSource.includes("'ArrowUp'"), 'keyboard controls mirror the three visible controller actions');
      assert(controllerSource.includes("heldRef.current.forward ? 1 : 0"), 'forward throttle must be hold-to-accelerate rather than a hidden toggle');
      assert(!controllerSource.includes('persistIslandRunRuntimeStatePatch') && !controllerSource.includes('islandRunStateActions'), 'presentation controls must not own gameplay writes');
      assert(boardSource.includes('lavaSkiffNavigation.active ? (') && boardSource.includes('<LavaSkiffControllerAdapter'), 'the footer must swap only while the skiff run is active');
      assert(boardSource.includes('onIsland20SkiffRunComplete={handleLavaSkiffRunComplete}'), 'the controller must restore after the runtime reports extraction');
      assert(boardSource.includes('startLavaLabyrinthEscapeMission({ session, client })'), 'ordinary labyrinth completion must launch the long mission through the canonical action');
      assert(boardSource.includes('completeLavaLabyrinthEscapeMission({ session, client })'), 'the rendered extraction must commit through the canonical action');
      assert(boardSource.includes('isBaseIslandFinishedForDeparture') && boardSource.includes('isLavaLabyrinthFinaleComplete'), 'Island 020 departure must require both the ordinary clear and the special finale');
      assert(boardSource.includes("entry.signatureMissionKind === 'heatshield_plate'"), 'the board must control Heatshield Plate visibility from mission launch state');
      assert(pilotSource.includes('consumeIronSkiffCompletion?.()'), 'the renderer must deliver a one-shot extraction completion back to React');
      assert(templateSource.includes('Launch escape') && templateSource.includes('island20SkiffNavigation={'), 'the development island must expose a complete interactive Skiff proof instead of a static mission pose');
    },
  },
  {
    name: 'keeps every completed Lava Labyrinth quality tier inside the mobile scene budget',
    run: () => {
      (['low', 'medium', 'high'] as const).forEach((quality) => {
        const materials = createIsland20LavaLabyrinthMaterials(quality);
        const scene = new THREE.Scene();
        const ambience = createIsland20LavaLabyrinthLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES[quality], materials);
        ambience.setIronSkiffStage(4);
        for (let frame = 1; frame <= 90; frame += 1) ambience.animate(frame / 60);
        const landmarks = ISLAND_5_LANDMARKS.map((landmark) => buildIsland20LavaLabyrinthLandmark(landmark, 3, quality, materials));
        const measurement = measureVisibleRuntime([ambience.root, ...landmarks]);
        assert(measurement.drawCalls <= 170, `${quality} Lava Labyrinth must stay at or below 170 authored draw calls (got ${measurement.drawCalls})`);
        assert(measurement.triangles <= 190_000, `${quality} Lava Labyrinth must stay at or below 190k authored triangles (got ${measurement.triangles})`);
        [ambience.root, ...landmarks].forEach(disposeRoot);
        Object.values(materials).forEach((material) => material.dispose());
      });
    },
  },
];
