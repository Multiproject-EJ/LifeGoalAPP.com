import * as THREE from 'three';
import {
  ISLAND_3D_QUALITY_PROFILES,
  ISLAND_5_LANDMARKS,
} from '../../dev/island5ThreePilotContract';
import {
  buildIsland18JungleExpeditionLandmark,
  collectIsland18RuntimePartManifest,
  createIsland18JungleExpeditionLivingAmbience,
  createIsland18JungleExpeditionMaterials,
  getIsland18StormFlashPlan,
  ISLAND_18_LIVING_COMPASS_MAX_STAGE,
  ISLAND_18_RUNTIME_PART_IDS,
  ISLAND_18_STORM_FLASH_COUNT_WEIGHTS,
  ISLAND_18_WEATHER_CYCLE_SECONDS,
} from '../../dev/Island18JungleExpeditionThreeWorld';
import { assert, assertEqual, type TestCase } from './testHarness';

function disposeRoot(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.InstancedMesh || object instanceof THREE.LineSegments)) return;
    object.geometry.dispose();
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

export const island18JungleExpeditionThreeWorldContractTests: TestCase[] = [
  {
    name: 'builds the Jungle Expedition horizon from visible procedural 3D layers without image-mapped sky geometry',
    run: () => {
      const materials = createIsland18JungleExpeditionMaterials();
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x75c9c5, 0.003);
      const primarySky = new THREE.HemisphereLight(0xdaf6d8, 0x173b26, 1.58);
      primarySky.name = 'ISLAND_18_PRIMARY_SKY_LIGHT';
      const primarySun = new THREE.DirectionalLight(0xffdda6, 3.75);
      primarySun.name = 'ISLAND_18_PRIMARY_SUN_LIGHT';
      const turquoiseBounce = new THREE.DirectionalLight(0x8de8dc, 0.46);
      turquoiseBounce.name = 'ISLAND_18_TURQUOISE_SKY_BOUNCE_LIGHT';
      scene.add(primarySky, primarySun, turquoiseBounce);
      const runtime = createIsland18JungleExpeditionLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.high, materials);
      const skyDome = runtime.root.getObjectByName('ISLAND_18_PROCEDURAL_SKY_DOME');
      const cloudField = runtime.root.getObjectByName('ISLAND_18_CLOUD_DEPTH_FIELD');
      const depthIslands = runtime.root.getObjectByName('ISLAND_18_DEPTH_ISLAND_NETWORK');
      const jungleBasin = runtime.root.getObjectByName('ISLAND_18_CONTINUOUS_JUNGLE_BASIN');
      const basinMesh = runtime.root.getObjectByName('ISLAND_18_CONTINUOUS_JUNGLE_BASIN_MESH');
      const basinCanopy = runtime.root.getObjectByName('ISLAND_18_BASIN_CANOPY_DEPTH');
      const basinCanopyVolume = runtime.root.getObjectByName('ISLAND_18_BASIN_CANOPY_VOLUME');
      const basinRivers = runtime.root.getObjectByName('ISLAND_18_BASIN_RIVER_NETWORK');
      const basinFauna = runtime.root.getObjectByName('ISLAND_18_EXOTIC_BASIN_FAUNA_ECOLOGY');
      const residentNetwork = runtime.root.getObjectByName('ISLAND_18_JUNGLE_RESIDENT_WORK_NETWORK');
      const aerialFauna = runtime.root.getObjectByName('ISLAND_18_EXOTIC_AERIAL_FAUNA_BATCH');
      const weatherField = runtime.root.getObjectByName('ISLAND_18_WEATHER_RAIN_LIGHTNING_AND_SUNRAY_FIELD');
      const frontDepthSector = runtime.root.getObjectByName('ISLAND_18_FRONT_DEPTH_SECTOR');
      const rearDepthSector = runtime.root.getObjectByName('ISLAND_18_REAR_DEPTH_SECTOR');
      const eastDepthSector = runtime.root.getObjectByName('ISLAND_18_EAST_DEPTH_SECTOR');
      const westDepthSector = runtime.root.getObjectByName('ISLAND_18_WEST_DEPTH_SECTOR');
      const rearCloudField = runtime.root.getObjectByName('ISLAND_18_REAR_CLOUD_DEPTH_FIELD');
      const eastCloudField = runtime.root.getObjectByName('ISLAND_18_EAST_CLOUD_DEPTH_FIELD');
      const westCloudField = runtime.root.getObjectByName('ISLAND_18_WEST_CLOUD_DEPTH_FIELD');
      const sun = runtime.root.getObjectByName('ISLAND_18_WORLD_SPACE_SUN');
      const sunCore = runtime.root.getObjectByName('ISLAND_18_WORLD_SPACE_SUN_CORE');
      assert(skyDome instanceof THREE.Mesh, 'the sky is a real world-space dome mesh');
      assert(cloudField instanceof THREE.Group && cloudField.visible, 'the cloud banks are a visible batched depth field');
      assert(depthIslands instanceof THREE.Group && depthIslands.visible, 'the floating ruin horizon is visible in the gameplay view');
      assert(jungleBasin instanceof THREE.Group && jungleBasin.visible, 'the Lost City stands inside a continuous jungle basin');
      assert(basinMesh instanceof THREE.Mesh, 'the jungle floor and distant canopy are authored as real batched 3D geometry');
      assert(Number(basinCanopy?.userData.treeCount ?? 0) >= 14, 'the surrounding valley includes a quality-scaled canopy layer');
      assert(Number(basinCanopy?.userData.forestCarpetCount ?? 0) >= 40, 'the valley floor is covered by a dense low-poly forest carpet');
      assert(Number(basinCanopy?.userData.canopyBlanketRings ?? 0) >= 6, 'the forest carpet uses layered canopy rings with river clearings');
      assert(Number(basinCanopy?.userData.heroStreamBankPlantCount ?? 0) >= 24, 'the foreground current keeps dense authored 3D planting along both banks');
      assert(Number(basinCanopy?.userData.heroStreamRelicCount ?? 0) >= 24, 'the hero river is framed by a dense procession of wet lost-city relics');
      assert(Number(basinCanopy?.userData.heroStreamRiverbedPebbleCount ?? 0) >= 20, 'the clear hero river reveals a submerged lost-city pebble bed');
      assert(Number(basinCanopy?.userData.heroStreamRootCount ?? 0) >= 14, 'the hero river carries readable strangler roots along both banks');
      assert(Number(basinCanopy?.userData.heroStreamReedCount ?? 0) >= 28, 'the hero river uses a deep three-dimensional reed layer instead of a flat bank edge');
      assert(Number(basinCanopy?.userData.heroStreamBloomCount ?? 0) >= 18, 'the hero river punctuates its foliage with readable exotic orchid color');
      assert(Number(basinCanopy?.userData.heroStreamLilyPadCount ?? 0) >= 12, 'the catch pool carries a readable layer of procedural three-dimensional lily pads');
      assert(Number(basinCanopy?.userData.heroStreamLotusBudCount ?? 0) >= 5, 'the lily field includes raised lotus color rather than a flat green scatter');
      assert(Number(basinCanopy?.userData.riverTerraceCount ?? 0) >= 10, 'the foreground stream descends between two stacked lost-city garden terraces');
      const riverGateClearance = basinCanopy?.userData.riverGateClearance as { width?: number; height?: number; radius?: number } | undefined;
      assert((riverGateClearance?.width ?? 0) >= 1.1 && (riverGateClearance?.height ?? 0) >= 1.8, 'the broken river gate preserves an open water channel between its piers');
      assert((riverGateClearance?.radius ?? 0) >= 9.3, 'the river gate remains outside the protected tile route');
      assert(basinCanopyVolume instanceof THREE.Points && Number(basinCanopyVolume.userData.clusterCount ?? 0) >= 500, 'the basin adds a moving procedural 3D canopy volume without image assets');
      assert(basinRivers instanceof THREE.Mesh, 'the central waterfalls feed a procedural 3D river network');
      assert((basinRivers as THREE.Mesh).geometry.getAttribute('color')?.count > 200, 'the streams carry bright banks, deep moving current, and turquoise shallows in authored geometry');
      assert(Number(basinRivers?.userData.foregroundStream?.width ?? 0) >= 3.4, 'the camera-facing stream stays broad enough to read through the dense foreground jungle');
      assert(Number(basinRivers?.userData.foregroundStream?.lagoonRadius ?? 0) >= 2.5, 'the stream opens into a visible reflective lagoon before the hero cascade');
      assert(Number(basinRivers?.userData.foregroundStream?.catchPoolRadius ?? 0) >= 2.6, 'the hero cascade lands in a broad turquoise catch pool');
      assert(Number(basinRivers?.userData.foregroundStream?.rippleCount ?? 0) >= 9, 'the foreground water carries nested three-dimensional surface ripples');
      assert(Number(runtime.root.userData.heroRiverCascadeCount ?? 0) >= 5, 'the foreground stream descends through a readable five-step cascade sequence');
      const catchPoolPosition = basinRivers?.userData.foregroundStream?.catchPoolPosition as number[] | undefined;
      assert(Array.isArray(catchPoolPosition) && catchPoolPosition.length === 3 && catchPoolPosition[2] >= 12, 'the catch pool stays on the visible outer-basin waterline');
      const basinFaunaSpecies = basinFauna?.userData.species as string[] | undefined;
      assert(Array.isArray(basinFaunaSpecies) && basinFaunaSpecies.length >= 12, 'the basin contains a batched ecology of at least twelve distinct exotic species');
      ['golden-jaguar', 'greater-capybara', 'spectacled-caiman', 'brown-throated-sloth'].forEach((species) => {
        assert(basinFaunaSpecies?.includes(species) === true, `the foreground ecology includes the ${species}`);
      });
      assert(Number(basinFauna?.userData.minimumRouteRadius ?? 0) >= 6.5, 'ground fauna remain outside the protected board route');
      assert(Number(basinFauna?.userData.readableForegroundCount ?? 0) >= 12, 'high quality keeps the entire ground ecology in the camera-facing river corridor');
      assertEqual(basinFauna?.userData.batchedInto, basinMesh?.name, 'ground fauna add no separate scenery draw call');
      assert(Array.isArray(basinFauna?.userData.motionLoops) && basinFauna.userData.motionLoops.length >= 8, 'the ecology owns several distinct motion families instead of one shared bob');
      const residentRoles = residentNetwork?.userData.roles as string[] | undefined;
      assert(Array.isArray(residentRoles) && new Set(residentRoles).size === 4, 'the lived-in jungle preserves four distinct resident roles at every quality');
      ['river-gatherer', 'temple-conservator', 'expedition-cartographer', 'canopy-gardener'].forEach((role) => {
        assert(residentRoles?.includes(role) === true, `the resident network includes the ${role}`);
      });
      assert(Number(residentNetwork?.userData.individualCount ?? 0) >= 6, 'high quality keeps a small working community rather than one token figure');
      assert(Number(residentNetwork?.userData.minimumRouteRadius ?? 0) >= 5, 'resident work stations remain outside the protected board route');
      assertEqual(residentNetwork?.userData.batchedInto, basinMesh?.name, 'resident geometry adds no separate scenery draw call');
      assert(Array.isArray(residentNetwork?.userData.workLoops) && residentNetwork.userData.workLoops.length === 4, 'each resident role owns a readable everyday work loop');
      runtime.animate(9, false);
      assertEqual((materials.basinGround.userData.residentWorkTime as { value?: number } | undefined)?.value, 9, 'the resident work network receives the live ambience clock');
      assertEqual((materials.basinGround.userData.residentWorkMotion as { value?: number } | undefined)?.value, 1, 'resident work motion stays active in the ordinary world');
      assertEqual((materials.basinGround.userData.faunaMotionTime as { value?: number } | undefined)?.value, 9, 'the exotic ecology receives the live ambience clock');
      assertEqual((materials.basinGround.userData.faunaMotionAmount as { value?: number } | undefined)?.value, 1, 'ground fauna motion stays active in the ordinary world');
      runtime.animate(9, true);
      assertEqual((materials.basinGround.userData.residentWorkMotion as { value?: number } | undefined)?.value, 0, 'reduced motion settles residents into their authored work poses');
      assertEqual((materials.basinGround.userData.faunaMotionAmount as { value?: number } | undefined)?.value, 0, 'reduced motion settles the exotic ecology into authored poses');
      assert(aerialFauna instanceof THREE.InstancedMesh && aerialFauna.count >= 18, 'the high-quality sky carries a moving batched flock of birds, butterflies, hummingbirds, and dragonflies');
      assert(weatherField instanceof THREE.LineSegments, 'rain, lightning, and sun shafts share one dynamic weather field');
      assertEqual(jungleBasin?.userData.environmentReading, 'lost-city-above-continuous-jungle-valley', 'the environment contract is grounded in jungle terrain');
      assert(sun instanceof THREE.Object3D && sun.visible, 'the sun keeps a world-space anchor rather than following the camera');
      assert(sunCore instanceof THREE.Mesh, 'the world-space sun has procedural solid geometry');
      assertEqual(sun?.userData.proceduralGlowSurface, 'ISLAND_18_WORLD_SPACE_SUN_CORE', 'the sun glow is a real 3D world-space surface');
      const skyMesh = skyDome as THREE.Mesh;
      const skyMaterial = Array.isArray(skyMesh.material) ? skyMesh.material[0] : skyMesh.material;
      assert(skyMaterial instanceof THREE.MeshBasicMaterial && skyMaterial.vertexColors, 'the dome carries a procedural vertex-color gradient');
      assertEqual((skyMaterial as THREE.MeshBasicMaterial).map, null, 'the procedural sky dome does not use a 2D texture map');
      const sunCoreMesh = sunCore as THREE.Mesh;
      const sunCoreMaterial = Array.isArray(sunCoreMesh.material) ? sunCoreMesh.material[0] : sunCoreMesh.material;
      assert(sunCoreMaterial instanceof THREE.MeshBasicMaterial && sunCoreMaterial.map === null, 'the sun core is procedural geometry rather than a billboard image');
      assertEqual(materials.ruinStone.bumpMap?.name, 'ISLAND_18_MOSSY_RUIN_STONE_RELIEF', 'ruin relief is generated in memory');
      assertEqual(materials.water.map?.name, 'ISLAND_18_WATER_ALBEDO', 'surface water uses its procedural in-memory texture');
      assertEqual(materials.waterfall.map?.name, 'ISLAND_18_WATERFALL_ALBEDO', 'waterfalls use a separately tiled procedural texture');
      assert((materials.water.map?.repeat.y ?? 10) < (materials.waterfall.map?.repeat.y ?? 0), 'surface water avoids the waterfall texture repetition that created striped pools');
      runtime.updateView?.(new THREE.Vector3(0, 15, -25), new THREE.Vector3(0, 0, 0));
      assertEqual(frontDepthSector?.visible, false, 'the front depth sector clears the rear camera');
      assertEqual(rearDepthSector?.visible, true, 'the rear depth sector surrounds the reverse survey');
      assertEqual(cloudField?.visible, false, 'front cloud strata clear the reverse survey');
      assertEqual(rearCloudField?.visible, true, 'rear cloud strata preserve atmospheric depth around 360 degrees');
      runtime.updateView?.(new THREE.Vector3(24, 10, 0), new THREE.Vector3(0, 0, 0));
      assertEqual(eastDepthSector?.visible, true, 'the east survey receives its own ruin depth sector');
      assertEqual(eastCloudField?.visible, true, 'the east survey receives its own cloud depth sector');
      runtime.updateView?.(new THREE.Vector3(-24, 10, 0), new THREE.Vector3(0, 0, 0));
      assertEqual(westDepthSector?.visible, true, 'the west survey receives its own ruin depth sector');
      assertEqual(westCloudField?.visible, true, 'the west survey receives its own cloud depth sector');
      runtime.updateView?.(new THREE.Vector3(0, 15, 25), new THREE.Vector3(0, 0, 0));
      assertEqual(frontDepthSector?.visible, true, 'the front depth sector returns with the gameplay camera');
      disposeRoot(runtime.root);
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'cycles from a long clear jungle rest through storm rain lightning and a gradual sunbreak',
    run: () => {
      const materials = createIsland18JungleExpeditionMaterials();
      const scene = new THREE.Scene();
      const weatherFog = new THREE.FogExp2(0x75c9c5, 0.003);
      scene.fog = weatherFog;
      const primarySky = new THREE.HemisphereLight(0xa8e7ff, 0x1f442f, 1.16);
      primarySky.name = 'ISLAND_18_PRIMARY_SKY_LIGHT';
      const primarySun = new THREE.DirectionalLight(0xfff1bf, 2.35);
      primarySun.name = 'ISLAND_18_PRIMARY_SUN_LIGHT';
      scene.add(primarySky, primarySun);
      const runtime = createIsland18JungleExpeditionLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.high, materials);
      const weatherField = runtime.root.getObjectByName('ISLAND_18_WEATHER_RAIN_LIGHTNING_AND_SUNRAY_FIELD');
      const lightning = runtime.root.getObjectByName('ISLAND_18_WEATHER_LIGHTNING_FLASH') as THREE.PointLight | undefined;
      const skyDome = runtime.root.getObjectByName('ISLAND_18_PROCEDURAL_SKY_DOME') as THREE.Mesh | undefined;
      const practicalHalos = runtime.root.getObjectByName('ISLAND_18_PRACTICAL_LIGHT_HALO_FIELD') as THREE.InstancedMesh | undefined;
      const junglePathPool = runtime.root.getObjectByName('ISLAND_18_JUNGLE_PATH_PRACTICAL_POOL') as THREE.PointLight | undefined;
      runtime.animate(20, false);
      assertEqual(runtime.root.userData.weatherPhase, 'clear-rest', 'the weather cycle begins with a long clear breathing interval');
      assertEqual(weatherField?.visible, false, 'clear rest does not waste a weather draw call');
      const clearSunIntensity = primarySun.intensity;
      const clearSkyDomeLuminance = ((skyDome?.material as THREE.MeshBasicMaterial | undefined)?.color.getHSL({ h: 0, s: 0, l: 0 }).l ?? 0);
      const clearAmberIntensity = materials.amber.emissiveIntensity;
      const clearCloudOpacity = materials.cloud.opacity;
      const clearFogDensity = weatherFog.density;
      const clearHaloOpacity = (practicalHalos?.material as THREE.MeshBasicMaterial | undefined)?.opacity ?? 0;
      const clearPracticalPoolIntensity = junglePathPool?.intensity ?? 0;
      assert(Number(runtime.root.userData.weatherMix?.daylightBlue ?? 0) > 0.95, 'clear rest opens into an explicitly light-blue daylight sky');
      assertEqual(practicalHalos?.count, 9, 'one batched 3D halo field covers temple lanterns and landmark torches');
      assertEqual(runtime.root.userData.practicalLightNetwork?.pooledLightCount, 4, 'high quality keeps four local no-shadow practical light pools');
      runtime.animate(74, false);
      assertEqual(runtime.root.userData.weatherPhase, 'cloud-gathering', 'cloud banks gather gradually before the storm');
      assert(Number(runtime.root.userData.weatherMix?.cloudCover ?? 0) > 0, 'the gathering phase visibly increases cloud cover');
      runtime.animate(111.2, false);
      assertEqual(runtime.root.userData.weatherPhase, 'rain-and-lightning', 'the darkening resolves into a rain phase');
      assertEqual(weatherField?.visible, true, 'the rain field becomes visible only during active weather');
      assert((lightning?.intensity ?? 0) > 6, 'the first rain burst includes a readable lightning flash');
      runtime.animate(115.5, false);
      assert(primarySun.intensity < clearSunIntensity * 0.5, 'the storm materially darkens the island key light between lightning flashes');
      assert(primarySky.intensity < 0.8, 'the jungle hemisphere also falls into a readable storm dusk');
      assert(materials.cloud.opacity > clearCloudOpacity + 0.35, 'clear blue rest keeps cloud layers translucent before the storm banks gather');
      assert(weatherFog.density > clearFogDensity * 2, 'the storm grows a materially deeper teal rain atmosphere around the jungle layers');
      assert(Number(runtime.root.userData.weatherMix?.daylightBlue ?? 1) < 0.1, 'the daylight blue recedes before the rain reaches full strength');
      assert(materials.amber.emissiveIntensity > clearAmberIntensity + 0.9, 'lanterns torches and lit interiors strengthen their emissive response in storm darkness');
      assert(((practicalHalos?.material as THREE.MeshBasicMaterial | undefined)?.opacity ?? 0) > clearHaloOpacity + 0.14, 'the 3D practical halos bloom naturally as the sky darkens');
      assert((junglePathPool?.intensity ?? 0) > clearPracticalPoolIntensity + 0.75, 'the landmark practical pool throws more warm light during the storm');
      assert(((skyDome?.material as THREE.MeshBasicMaterial | undefined)?.color.getHSL({ h: 0, s: 0, l: 0 }).l ?? 1) < clearSkyDomeLuminance * 0.7, 'the procedural sky dome darkens materially before rainfall');
      const stormSunIntensity = primarySun.intensity;
      const stormFogDensity = weatherFog.density;
      runtime.animate(138, false);
      assertEqual(runtime.root.userData.weatherPhase, 'sunbreak', 'sun shafts open after the rainfall');
      assert(Number(runtime.root.userData.weatherMix?.sunBreak ?? 0) > 0.5, 'the sunbreak grows gradually rather than snapping on');
      assert(primarySun.intensity > stormSunIntensity * 1.8, 'the returning sun restores a warm high-energy key across the wet jungle');
      assert(weatherFog.density < stormFogDensity * 0.7, 'the sunbreak burns the heavy rain haze back into transparent warm depth');
      runtime.animate(166, false);
      assertEqual(runtime.root.userData.weatherPhase, 'clear-recovery', 'the sky returns to clear blue before the cycle repeats');
      assertEqual(weatherField?.visible, false, 'the clear recovery hides rain and ray geometry');
      assert(materials.cloud.opacity < 0.25, 'the recovered clear sky remains open instead of washing the world in untone-mapped cloud white');
      assert(Number(runtime.root.userData.weatherMix?.daylightBlue ?? 0) > 0.95, 'the post-rain recovery restores the light-blue daylight state');
      runtime.animate(111.2, true);
      assertEqual(runtime.root.userData.weatherPhase, 'clear-rest', 'reduced motion holds a calm clear composition');
      assertEqual(ISLAND_18_WEATHER_CYCLE_SECONDS, 180, 'the full weather story leaves a long calm interval between storms');
      disposeRoot(runtime.root);
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'seeds one to five lightning events per storm with one or two as the normal outcome',
    run: () => {
      const weightTotal = ISLAND_18_STORM_FLASH_COUNT_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
      assert(Math.abs(weightTotal - 1) < 0.000001, 'lightning count weights form a complete probability distribution');
      assert(ISLAND_18_STORM_FLASH_COUNT_WEIGHTS[0] + ISLAND_18_STORM_FLASH_COUNT_WEIGHTS[1] >= 0.79, 'one or two flashes own at least 79 percent of the authored probability mass');
      const plans = Array.from({ length: 128 }, (_, cycleIndex) => getIsland18StormFlashPlan(cycleIndex));
      const counts = plans.map((plan) => plan.flashCount);
      assertEqual(Math.min(...counts), 1, 'the deterministic cycle includes one-flash storms');
      assertEqual(Math.max(...counts), 5, 'the deterministic cycle occasionally reaches five-flash storms');
      assert(counts.filter((count) => count <= 2).length / counts.length > 0.75, 'more than three quarters of sampled storms remain in the normal one-to-two-flash range');
      assert(plans.every((plan) => plan.centers.length === plan.flashCount), 'every storm plan supplies exactly one timed event per selected flash');
      assertEqual(getIsland18StormFlashPlan(0).flashCount, 2, 'the default visual evidence cycle demonstrates the common two-flash storm');
      assert(Math.abs(getIsland18StormFlashPlan(0).centers[0] - 111.2) < 0.000001, 'the default lightning evidence timestamp remains deterministic');
    },
  },
  {
    name: 'authors five distinct clickable Jungle Expedition landmarks with additive L1 L2 L3 silhouettes',
    run: () => {
      const materials = createIsland18JungleExpeditionMaterials();
      const l3Bounds: string[] = [];
      ISLAND_5_LANDMARKS.forEach((landmark) => {
        const levels = ([0, 1, 2, 3] as const).map((level) => {
          const root = buildIsland18JungleExpeditionLandmark(landmark, level, 'low', materials);
          assert(root.userData.sculptRuntime?.clickable, `${landmark.id} remains a clickable shared-board landmark`);
          assert(Boolean(root.getObjectByName(`ISLAND_18_${landmark.id.toUpperCase()}_FOCUS_SOCKET`)), `${landmark.id} exposes a stable camera focus socket`);
          const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
          disposeRoot(root);
          return size;
        });
        assert(levels[1].y > levels[0].y, `${landmark.id} L1 rises above its foundation plot`);
        assert(levels[3].y > levels[1].y, `${landmark.id} L3 adds a taller identity silhouette`);
        l3Bounds.push(`${levels[3].x.toFixed(2)}:${levels[3].y.toFixed(2)}:${levels[3].z.toFixed(2)}`);
      });
      assertEqual(new Set(l3Bounds).size, 5, 'all five L3 landmark families have distinct world-space bounds');
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'stages the Living Compass as five readable beats and reserves Emerald Zenith motion for the finale',
    run: () => {
      const materials = createIsland18JungleExpeditionMaterials();
      const scene = new THREE.Scene();
      const runtime = createIsland18JungleExpeditionLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.low, materials);
      const glyph1 = runtime.root.getObjectByName('ISLAND_18_WAYFINDER_GLYPH_1');
      const vineGate = runtime.root.getObjectByName('ISLAND_18_JUNGLE_PATH_VINE_GATE_1');
      const bridge = runtime.root.getObjectByName('ISLAND_18_ROPE_SKYBRIDGE_1');
      const compassRing = runtime.root.getObjectByName('ISLAND_18_LIVING_COMPASS_RING_1');
      const shockwave = runtime.root.getObjectByName('ISLAND_18_ZENITH_SHOCKWAVE');
      const beam = runtime.root.getObjectByName('ISLAND_18_ZENITH_SKY_BEAM');
      const wayfinder = runtime.root.getObjectByName('ISLAND_18_ZENITH_WAYFINDER_CONSTELLATION');
      const waterCrown = runtime.root.getObjectByName('ISLAND_18_ZENITH_SUSPENDED_WATER_CROWN');
      const junglePulseRings = runtime.root.getObjectByName('ISLAND_18_ZENITH_JUNGLE_PULSE_RING_BATCH');
      assert(Boolean(glyph1 && vineGate && bridge && compassRing && shockwave && beam && wayfinder && waterCrown && junglePulseRings), 'all five mission animation systems expose stable named roots');

      runtime.setLivingCompassStage({ activatedStages: 1, constructionSequence: 1 }, true);
      runtime.animate(1.2, false);
      assertEqual(glyph1?.visible, true, 'the first Wayfinder Glyph wakes on stage one');
      assertEqual(compassRing?.visible, false, 'compass rings remain reserved until stage four');
      assertEqual(shockwave?.visible, false, 'the Emerald Zenith shockwave cannot leak into an ordinary seal activation');

      const closedVineY = vineGate?.position.y ?? 0;
      runtime.setLivingCompassStage({ activatedStages: 2, constructionSequence: 2 }, true);
      runtime.animate(2.8, false);
      assert((vineGate?.position.y ?? 0) > closedVineY, 'stage two physically parts the Jungle Path vine gate');
      const slackBridgeY = bridge?.position.y ?? 0;
      runtime.setLivingCompassStage({ activatedStages: 3, constructionSequence: 3 }, true);
      runtime.animate(4.4, false);
      assert((bridge?.position.y ?? 0) > slackBridgeY, 'stage three tensions the rope skybridge');
      runtime.setLivingCompassStage({ activatedStages: 4, constructionSequence: 4 }, true);
      runtime.animate(6.1, false);
      assertEqual(compassRing?.visible, true, 'stage four assembles the Living Compass rings');
      assertEqual(beam?.visible, false, 'the sky beam still waits for the fifth seal');

      runtime.setLivingCompassStage({ activatedStages: 5, constructionSequence: 5, completed: true }, true);
      runtime.animate(11, false);
      assertEqual(shockwave?.visible, true, 'the fifth seal unleashes the Emerald Zenith shockwave');
      assertEqual(beam?.visible, true, 'the fifth seal opens the emerald sky beam');
      runtime.animate(12, true);
      assertEqual(shockwave?.visible, false, 'reduced motion removes the rapid finale shockwave');
      assertEqual(beam?.visible, true, 'reduced motion retains the completed finale composition');
      runtime.setLivingCompassStage({ activatedStages: 5, constructionSequence: 5, completed: true }, true);
      runtime.animate(22, false);
      assertEqual(wayfinder?.visible, true, 'the completed Zenith keeps its living wayfinder constellation');
      assertEqual(waterCrown?.visible, true, 'the completed Zenith keeps its suspended water crown');
      assertEqual(junglePulseRings?.visible, true, 'the completed Zenith leaves luminous pulse rings across the jungle');
      assertEqual(ISLAND_18_LIVING_COMPASS_MAX_STAGE, 5, 'mission stage count remains canonical');
      disposeRoot(runtime.root);
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'keeps the final Lost City ornament and guardian identity inside the staged construction model',
    run: () => {
      const materials = createIsland18JungleExpeditionMaterials();
      const boss = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === 'boss');
      assert(Boolean(boss), 'boss landmark definition is available');
      const root = buildIsland18JungleExpeditionLandmark(boss!, 3, 'high', materials, {
        constructionPreview: 'target',
      });
      [
        'ISLAND_18_TEMPLE_LOST_CITY_STONE_ORNAMENT_BATCH',
        'ISLAND_18_TEMPLE_LOST_CITY_METAL_ORNAMENT_BATCH',
        'ISLAND_18_TEMPLE_LOST_CITY_BANNER_BATCH',
        'ISLAND_18_TEMPLE_GUARDIAN_CROWN_CENTRAL_CROWN_RAY_3',
        'ISLAND_18_TEMPLE_REAR_PROCESSIONAL_GALLERY',
        'ISLAND_18_TEMPLE_REAR_LEFT_ARCHIVE_TOWER',
      ].forEach((name) => {
        assert(Boolean(root.getObjectByName(name)), `${name} remains a named construction-stage element`);
      });
      let constructionProfileId: string | undefined;
      root.traverse((object) => {
        const constructionRig = object.userData.constructionRig as { profileId?: string } | undefined;
        if (constructionRig?.profileId) constructionProfileId = constructionRig.profileId;
      });
      assertEqual(constructionProfileId, 'jungle-ruin-vineworks', 'Island 018 construction uses its dark rootwood and emerald vinework rig');
      disposeRoot(root);
      const productionRoot = buildIsland18JungleExpeditionLandmark(boss!, 3, 'high', materials);
      assert(Boolean(productionRoot.getObjectByName('ISLAND_18_BOSS_STATIC_STRUCTURE')), 'optimized L3 temple retains its merged structural batch');
      assert(Boolean(productionRoot.getObjectByName('ISLAND_18_BOSS_STATIC_EMISSIVE_ACCENTS')), 'optimized L3 temple retains one merged vertex-colored emissive batch');
      ['EAST', 'WEST'].forEach((side) => {
        const tunnel = productionRoot.getObjectByName(`ISLAND_18_TEMPLE_${side}_ROUTE_TUNNEL`);
        const floor = productionRoot.getObjectByName(`ISLAND_18_TEMPLE_${side}_ROUTE_TUNNEL_ROUTE_FLOOR`);
        const clearance = tunnel?.userData.routeClearance as { axis?: string; width?: number; height?: number; includesRouteFloor?: boolean } | undefined;
        assert(tunnel instanceof THREE.Group, `${side.toLowerCase()} precinct keeps a named open route tunnel after production batching`);
        assert(floor instanceof THREE.Group, `${side.toLowerCase()} tunnel preserves the board surface through the structure`);
        assertEqual(clearance?.axis, 'z', `${side.toLowerCase()} tunnel follows the board tangent through the precinct`);
        assert((clearance?.width ?? 0) >= 1.1 && (clearance?.height ?? 0) >= 1.4, `${side.toLowerCase()} tunnel reserves visible route clearance`);
        assertEqual(clearance?.includesRouteFloor, true, `${side.toLowerCase()} tunnel explicitly carries the route floor`);
      });
      disposeRoot(productionRoot);
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'keeps the complete Jungle Expedition world inside the mobile authored-geometry budget',
    run: () => {
      (['low', 'medium', 'high'] as const).forEach((quality) => {
        const materials = createIsland18JungleExpeditionMaterials();
        const scene = new THREE.Scene();
        const ambience = createIsland18JungleExpeditionLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES[quality], materials);
        ambience.setLivingCompassStage({ activatedStages: 5, constructionSequence: 5, completed: true });
        ambience.animate(12, true);
        const residentNetwork = ambience.root.getObjectByName('ISLAND_18_JUNGLE_RESIDENT_WORK_NETWORK');
        const basinFauna = ambience.root.getObjectByName('ISLAND_18_EXOTIC_BASIN_FAUNA_ECOLOGY');
        assert(Array.isArray(residentNetwork?.userData.roles) && residentNetwork.userData.roles.length === 4, `${quality} preserves all four resident professions`);
        assert(Number(residentNetwork?.userData.individualCount ?? 0) >= 4, `${quality} keeps a lived-in resident community`);
        assert(Number(basinFauna?.userData.individualCount ?? 0) >= 6, `${quality} keeps at least six distinct readable ground animals`);
        assert(Number(basinFauna?.userData.minimumRouteRadius ?? 0) >= 6.5, `${quality} fauna preserve route clearance`);
        const landmarks = ISLAND_5_LANDMARKS.map((landmark) => (
          buildIsland18JungleExpeditionLandmark(landmark, 3, quality, materials)
        ));
        const measurement = measureVisibleRuntime([ambience.root, ...landmarks]);
        assert(measurement.drawCalls <= 175, `${quality} Island 018 stays at or below 175 authored draw calls (got ${measurement.drawCalls})`);
        assert(measurement.triangles < 180_000, `${quality} Island 018 stays below 180k authored triangles (got ${measurement.triangles})`);
        const manifest = collectIsland18RuntimePartManifest([ambience.root, ...landmarks]);
        const partNames = new Set(manifest.parts.map((part) => part.name));
        ['floating-cliff-and-temple-terraces', 'board-route-corridor', 'lost-city-temple-shell', 'living-compass-mechanism', 'emerald-zenith-fx'].forEach((part) => {
          assert(partNames.has(part), `runtime manifest includes ${part}`);
        });
        assertEqual(ISLAND_18_RUNTIME_PART_IDS.length, 20, 'the production inventory keeps twenty independently reviewable parts');
        [ambience.root, ...landmarks].forEach(disposeRoot);
        Object.values(materials).forEach((material) => material.dispose());
      });
    },
  },
];
