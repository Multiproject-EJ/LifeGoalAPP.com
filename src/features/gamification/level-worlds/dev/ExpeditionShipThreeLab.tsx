import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  createExpeditionShipThreeModel,
  type ExpeditionShipPose,
  type ExpeditionShipQuality,
} from './ExpeditionShipThreeModel';
import './ExpeditionShipThreeLab.css';

function readPose(): ExpeditionShipPose {
  const value = new URLSearchParams(window.location.search).get('pose');
  return value === 'docked' || value === 'flight' ? value : 'expedition';
}

function readQuality(): ExpeditionShipQuality {
  return new URLSearchParams(window.location.search).get('quality') === 'low' ? 'low' : 'high';
}

function readOrbit() {
  const value = Number.parseFloat(new URLSearchParams(window.location.search).get('orbit') || '0');
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, -180, 180) : 0;
}

export type ExpeditionShipPov =
  | 'orbit'
  | 'overview'
  | 'fabrication'
  | 'fabrication-window'
  | 'creature-habitat'
  | 'under-tree'
  | 'canopy'
  | 'balcony-down'
  | 'balcony-across'
  | 'port-haven-balcony'
  | 'starboard-haven-balcony'
  | 'steering-house'
  | 'administration'
  | 'roof'
  | 'underside';

export interface CameraProbe {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const POV_LABELS: Record<Exclude<ExpeditionShipPov, 'orbit'>, string> = {
  overview: 'Cutaway overview',
  fabrication: 'Fabrication deck',
  'fabrication-window': 'Fabrication forward glass',
  'creature-habitat': 'Creature habitat',
  'under-tree': 'Under tree POV',
  canopy: 'Tree terrace observatory',
  'balcony-down': 'Balcony looking down',
  'balcony-across': 'Balcony looking across',
  'port-haven-balcony': 'Port garden balcony',
  'starboard-haven-balcony': 'Starboard garden balcony',
  'steering-house': 'Steering house',
  administration: 'Administration',
  roof: 'Roof systems',
  underside: 'Lower drive',
};

const POV_DESCRIPTIONS: Record<Exclude<ExpeditionShipPov, 'orbit'>, string> = {
  overview: 'exterior cutaway · not first-person',
  fabrication: 'true interior probe · retractable garage workshop',
  'fabrication-window': 'true interior probe · looking outward through panoramic pressure glass',
  'creature-habitat': 'true interior probe · premium creature commons',
  'under-tree': 'true interior probe · garden floor',
  canopy: 'true interior probe · reclined beneath the oak canopy',
  'balcony-down': 'true interior probe · upper deck',
  'balcony-across': 'true interior probe · upper gallery',
  'port-haven-balcony': 'true standing POV · port Haven terrace',
  'starboard-haven-balcony': 'true standing POV · starboard Haven terrace',
  'steering-house': 'true interior probe · sealed panoramic helm',
  administration: 'true interior probe · sealed rear administration suite',
  roof: 'exterior evidence · roof systems',
  underside: 'exterior evidence · propulsion and legs',
};

const POV_CAMERA: Record<Exclude<ExpeditionShipPov, 'orbit'>, {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}> = {
  overview: {position: [0.18, 0.22, 6.65], target: [0, 0.06, 0.5], fov: 38},
  // Stand in a clear starboard aisle and look across the room. A centreline
  // camera is technically inside the deck, but the telescoping keel fills the
  // frame and hides the workshop/creature program it is meant to inspect.
  fabrication: {position: [-0.62, -0.95, 0.74], target: [0.12, -1.2, -0.52], fov: 64},
  'fabrication-window': {position: [0.12, -0.96, 0.58], target: [0.12, -0.9, 2.8], fov: 72},
  'creature-habitat': {position: [0.12, -0.54, 0.58], target: [0.16, -0.68, -0.66], fov: 60},
  'under-tree': {position: [0.98, -0.16, 0.42], target: [0, 0.66, -0.06], fov: 76},
  canopy: {position: [0, 1.14, 0.26], target: [0, 1.28, 3], fov: 76},
  'balcony-down': {position: [-1.05, 1.36, 0.9], target: [0, -0.3, 0], fov: 68},
  'balcony-across': {position: [1.1, 1.28, 0.95], target: [-1.1, 0.86, -0.3], fov: 70},
  'port-haven-balcony': {position: [-3.55, 0.18, 0.45], target: [-0.3, 0.3, -0.04], fov: 74},
  'starboard-haven-balcony': {position: [3.55, 0.18, 0.45], target: [0.3, 0.3, -0.04], fov: 74},
  'steering-house': {position: [2.56, 1.22, 0.9], target: [2.56, 1.18, 3.2], fov: 68},
  administration: {position: [-2.56, 1.22, -0.9], target: [-2.56, 1.18, -3.2], fov: 68},
  roof: {position: [7.4, 8.8, 7.2], target: [0, 0.2, 0], fov: 38},
  underside: {position: [6.8, -5.9, 7.4], target: [0, -0.72, 0], fov: 40},
};

const POV_MODEL_ANCHORS: Partial<Record<Exclude<ExpeditionShipPov, 'orbit'>, [string, string]>> = {
  fabrication: ['FABRICATION_DECK_POV', 'FABRICATION_DECK_LOOK'],
  'fabrication-window': ['FABRICATION_WINDOW_POV', 'FABRICATION_WINDOW_LOOK'],
  'creature-habitat': ['CREATURE_HABITAT_POV', 'CREATURE_HABITAT_LOOK'],
  'under-tree': ['SANCTUARY_FLOOR_POV', 'SANCTUARY_FLOOR_LOOK'],
  canopy: ['SANCTUARY_CANOPY_POV', 'SANCTUARY_CANOPY_LOOK'],
  'balcony-down': ['UPPER_BALCONY_DOWN_POV', 'UPPER_BALCONY_DOWN_LOOK'],
  'balcony-across': ['UPPER_BALCONY_ACROSS_POV', 'UPPER_BALCONY_ACROSS_LOOK'],
  'port-haven-balcony': ['PORT_HAVEN_BALCONY_POV', 'PORT_HAVEN_BALCONY_LOOK'],
  'starboard-haven-balcony': ['STARBOARD_HAVEN_BALCONY_POV', 'STARBOARD_HAVEN_BALCONY_LOOK'],
  'steering-house': ['STEERING_HOUSE_POV', 'STEERING_HOUSE_LOOK'],
  administration: ['ADMINISTRATION_POV', 'ADMINISTRATION_LOOK'],
};

function readPov(): ExpeditionShipPov {
  const query = new URLSearchParams(window.location.search);
  const value = query.get('pov');
  if (value && value in POV_LABELS) return value as Exclude<ExpeditionShipPov, 'orbit'>;
  return query.get('view') === 'interior' ? 'overview' : 'orbit';
}

function readCameraProbe(): CameraProbe | null {
  const query = new URLSearchParams(window.location.search);
  const values = ['cx', 'cy', 'cz', 'tx', 'ty', 'tz', 'fov'].map((name) => Number.parseFloat(query.get(name) || ''));
  if (values.some((value) => !Number.isFinite(value))) return null;
  const [cx, cy, cz, tx, ty, tz, fov] = values;
  return {
    position: [cx, cy, cz],
    target: [tx, ty, tz],
    fov: THREE.MathUtils.clamp(fov, 24, 100),
  };
}

function readNumber(name: string, fallback: number) {
  const value = Number.parseFloat(new URLSearchParams(window.location.search).get(name) || '');
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : fallback;
}

function readOptionalNumber(name: string) {
  const raw = new URLSearchParams(window.location.search).get(name);
  if (raw === null) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : null;
}

function replaceQuery(values: Record<string, string>) {
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
  window.history.replaceState(null, '', url);
}

const POSE_LABELS: Record<ExpeditionShipPose, string> = {
  docked: 'Haven',
  expedition: 'Walker',
  flight: 'Fast space',
};

export interface ExpeditionShipCanvasProps {
  pose: ExpeditionShipPose;
  quality: ExpeditionShipQuality;
  orbitDegrees: number;
  thrust: number;
  boost: number;
  hover: number;
  walk: number;
  stabilize: number;
  transformProgress: number | null;
  pov: ExpeditionShipPov;
  cameraProbe: CameraProbe | null;
  onOrbitChange: (orbitDegrees: number) => void;
}

export function ExpeditionShipCanvas({
  pose,
  quality,
  orbitDegrees,
  thrust,
  boost,
  hover,
  walk,
  stabilize,
  transformProgress,
  pov,
  cameraProbe,
  onOrbitChange,
}: ExpeditionShipCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbitDragRef = useRef<{
    mode: 'orbit' | 'look';
    startX: number;
    startY: number;
    startOrbit: number;
    startYaw: number;
    startPitch: number;
    moved: boolean;
  } | null>(null);
  const interiorLookRef = useRef({yaw: 0, pitch: 0});
  const settingsRef = useRef({pose, orbitDegrees, thrust, boost, hover, walk, stabilize, poseProgress: transformProgress, pov, cameraProbe});
  settingsRef.current = {pose, orbitDegrees, thrust, boost, hover, walk, stabilize, poseProgress: transformProgress, pov, cameraProbe};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: quality === 'high',
      alpha: true,
      powerPreference: 'high-performance',
      // Dev evidence seam: permits deterministic canvas export without affecting production surfaces.
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = quality === 'high';
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070c12');
    scene.fog = new THREE.FogExp2('#080f16', 0.022);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);

    const hemisphere = new THREE.HemisphereLight('#b9d9eb', '#130b06', 0.62);
    scene.add(hemisphere);
    const key = new THREE.DirectionalLight('#ffe6c2', 4.15);
    key.position.set(-6, 8, 7);
    key.castShadow = quality === 'high';
    key.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.radius = quality === 'high' ? 4 : 2;
    key.shadow.blurSamples = quality === 'high' ? 12 : 4;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#6db6e8', 0.72);
    fill.position.set(7, 0.5, 4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight('#83d8ff', 2.65);
    rim.position.set(1, 5, -8);
    scene.add(rim);
    const lowerDeckAmbientLight = new THREE.AmbientLight('#a9c9dc', 0);
    scene.add(lowerDeckAmbientLight);
    // The lower inhabited decks use local architectural practicals instead of
    // the exterior's broad key. Their positions move between workshop and
    // creature levels but remain deterministic for evidence captures.
    const lowerDeckWarmLight = new THREE.PointLight('#ffb16a', 0, 3.8, 1.8);
    lowerDeckWarmLight.position.set(-0.9, -0.7, 0.05);
    scene.add(lowerDeckWarmLight);
    const lowerDeckCyanLight = new THREE.PointLight('#50c9ef', 0, 3.4, 1.9);
    lowerDeckCyanLight.position.set(1.05, -0.72, -0.45);
    scene.add(lowerDeckCyanLight);
    const lowerDeckHeroTarget = new THREE.Object3D();
    lowerDeckHeroTarget.position.set(0, -1.12, -0.43);
    scene.add(lowerDeckHeroTarget);
    const lowerDeckHeroLight = new THREE.SpotLight('#ffd0a0', 0, 4.6, 0.54, 0.68, 1.45);
    lowerDeckHeroLight.position.set(0.1, -0.62, 0.78);
    lowerDeckHeroLight.target = lowerDeckHeroTarget;
    scene.add(lowerDeckHeroLight);
    const workshopFloorTarget = new THREE.Object3D();
    workshopFloorTarget.position.set(0, -1.5, -0.36);
    scene.add(workshopFloorTarget);
    const workshopFloorLight = new THREE.SpotLight('#ffbd7d', 0, 4.8, 0.76, 0.72, 1.2);
    workshopFloorLight.position.set(-0.12, -0.73, 0.84);
    workshopFloorLight.target = workshopFloorTarget;
    scene.add(workshopFloorLight);

    // A deterministic deep-space field gives the panoramic command windows
    // honest visual context without introducing an image asset or capture
    // variance. It remains subtle in Haven exterior evidence.
    const starPositions = new Float32Array(360 * 3);
    let starSeed = 0x8f3a2d17;
    const nextStarRandom = () => {
      starSeed = (Math.imul(starSeed, 1664525) + 1013904223) >>> 0;
      return starSeed / 4294967296;
    };
    for (let index = 0; index < 360; index += 1) {
      const azimuth = nextStarRandom() * Math.PI * 2;
      const vertical = nextStarRandom() * 1.76 - 0.88;
      const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical));
      const radius = 19 + nextStarRandom() * 1.4;
      starPositions[index * 3] = Math.cos(azimuth) * radial * radius;
      starPositions[index * 3 + 1] = vertical * radius;
      starPositions[index * 3 + 2] = Math.sin(azimuth) * radial * radius;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: '#d7efff',
      size: quality === 'high' ? 0.07 : 0.055,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    starField.name = 'DETERMINISTIC_PANORAMIC_STAR_FIELD';
    scene.add(starField);

    // Docked fabrication glass needs an exterior scale cue, not a black void.
    // This procedural vista is lab scenery beyond the real transparent wall;
    // it is never baked into the ship or its glass material.
    const vistaCanvas = document.createElement('canvas');
    vistaCanvas.width = 768;
    vistaCanvas.height = 384;
    const vistaContext = vistaCanvas.getContext('2d');
    if (!vistaContext) throw new Error('Unable to create fabrication vista texture');
    const skyGradient = vistaContext.createLinearGradient(0, 0, 0, vistaCanvas.height);
    skyGradient.addColorStop(0, '#69b9e3');
    skyGradient.addColorStop(0.5, '#bad9df');
    skyGradient.addColorStop(1, '#466d72');
    vistaContext.fillStyle = skyGradient;
    vistaContext.fillRect(0, 0, vistaCanvas.width, vistaCanvas.height);
    vistaContext.fillStyle = '#506f72';
    vistaContext.beginPath();
    vistaContext.moveTo(0, 275);
    vistaContext.lineTo(90, 220);
    vistaContext.lineTo(160, 254);
    vistaContext.lineTo(255, 178);
    vistaContext.lineTo(330, 244);
    vistaContext.lineTo(425, 195);
    vistaContext.lineTo(510, 252);
    vistaContext.lineTo(620, 205);
    vistaContext.lineTo(768, 266);
    vistaContext.lineTo(768, 384);
    vistaContext.lineTo(0, 384);
    vistaContext.closePath();
    vistaContext.fill();
    vistaContext.fillStyle = '#28484b';
    vistaContext.beginPath();
    vistaContext.moveTo(0, 305);
    vistaContext.lineTo(120, 260);
    vistaContext.lineTo(220, 302);
    vistaContext.lineTo(350, 246);
    vistaContext.lineTo(485, 300);
    vistaContext.lineTo(640, 252);
    vistaContext.lineTo(768, 302);
    vistaContext.lineTo(768, 384);
    vistaContext.lineTo(0, 384);
    vistaContext.closePath();
    vistaContext.fill();
    const vistaTexture = new THREE.CanvasTexture(vistaCanvas);
    vistaTexture.colorSpace = THREE.SRGBColorSpace;
    vistaTexture.minFilter = THREE.LinearFilter;
    const vistaMaterial = new THREE.MeshBasicMaterial({
      map: vistaTexture,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    const fabricationVista = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), vistaMaterial);
    fabricationVista.name = 'FABRICATION_DOCKED_EXTERIOR_VISTA';
    fabricationVista.position.set(0, 0.5, 12);
    fabricationVista.renderOrder = -4;
    fabricationVista.visible = false;
    scene.add(fabricationVista);

    const model = createExpeditionShipThreeModel(quality);
    model.root.scale.setScalar(1.02);
    scene.add(model.root);
    const lowerDeckExcludedLights: Array<{light: THREE.Light; intensity: number}> = [];
    const collectLowerDeckExcludedLights = (name: string) => {
      model.root.getObjectByName(name)?.traverse((object) => {
        if ('isLight' in object && object.isLight) {
          const light = object as THREE.Light;
          lowerDeckExcludedLights.push({light, intensity: light.intensity});
        }
      });
    };
    collectLowerDeckExcludedLights('INTERIOR_PRACTICAL_LIGHTS');
    collectLowerDeckExcludedLights('SANCTUARY_WARM_INTERIOR_LIGHT');
    collectLowerDeckExcludedLights('GREAT_TREE_UPLIGHT');
    const lowerDeckEmissiveMaterials: Array<{material: THREE.MeshStandardMaterial; intensity: number}> = [];
    const lowerDeckEmissiveMaterialSet = new Set<THREE.Material>();
    model.root.traverse((object) => {
      if (!('isMesh' in object) || !object.isMesh) return;
      const mesh = object as THREE.Mesh;
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      meshMaterials.forEach((material) => {
        if (
          'emissiveIntensity' in material
          && typeof material.emissiveIntensity === 'number'
          && material.emissiveIntensity >= 1
          && !lowerDeckEmissiveMaterialSet.has(material)
        ) {
          lowerDeckEmissiveMaterialSet.add(material);
          lowerDeckEmissiveMaterials.push({
            material: material as THREE.MeshStandardMaterial,
            intensity: material.emissiveIntensity,
          });
        }
      });
    });
    const steeringShoulderSectionCut = [
      model.root.getObjectByName('RIGHT_OUTER_SHELL'),
      model.root.getObjectByName('STARBOARD_GRIP_SHOULDER_YOKE'),
    ].filter((object): object is THREE.Object3D => Boolean(object));
    const administrationShoulderSectionCut = [
      model.root.getObjectByName('LEFT_OUTER_SHELL'),
      model.root.getObjectByName('PORT_GRIP_SHOULDER_YOKE'),
    ].filter((object): object is THREE.Object3D => Boolean(object));
    const lowerDeckSectionCut = [
      model.root.getObjectByName('CENTRE_SHELL_LOWER_SILL'),
      model.root.getObjectByName('LANDING_KEEL'),
      model.root.getObjectByName('GARAGE_BELLY'),
      model.root.getObjectByName('CENTRAL_KEEL_DRIVE'),
      // The room-owned pressure cheeks now replace the controller fairings in
      // lower-deck inspection. Section both shoulders so a free-look turn
      // cannot reveal white exterior hull fragments through the interior.
      model.root.getObjectByName('LEFT_OUTER_SHELL'),
      model.root.getObjectByName('RIGHT_OUTER_SHELL'),
      model.root.getObjectByName('LEFT_WING_PIVOT'),
      model.root.getObjectByName('RIGHT_WING_PIVOT'),
      model.root.getObjectByName('PORT_GRIP_SHOULDER_YOKE'),
      model.root.getObjectByName('STARBOARD_GRIP_SHOULDER_YOKE'),
    ].filter((object): object is THREE.Object3D => Boolean(object));
    // Lower-deck probes section the Zen commons for sightline clearance. The
    // creature landscape supplies its own pressure-ceiling cassette, so this
    // no longer exposes the apartment galleries as the room's "ceiling".
    const lowerDeckGardenSectionCut = [
      model.root.getObjectByName('GARDEN_ATRIUM'),
      model.root.getObjectByName('DECK_02_ZEN_GARDEN_COMMONS'),
      model.root.getObjectByName('ATRIUM_OCCUPIED_DECKS'),
      model.root.getObjectByName('DECK_03_MIXED_USE_RESIDENTIAL_RING'),
      model.root.getObjectByName('interior-open-room-portal-frame-instances'),
      model.root.getObjectByName('interior-pressure-bulkhead-instances'),
      model.root.getObjectByName('interior-atrium-stair-flight-instances'),
      model.root.getObjectByName('interior-panorama-lift-shaft-instances'),
    ].filter((object): object is THREE.Object3D => Boolean(object));
    const fabricationOverheadSectionCut = [
      model.root.getObjectByName('DECK_01_PREMIUM_CREATURE_HABITAT'),
    ].filter((object): object is THREE.Object3D => Boolean(object));
    const creatureUnderfloorSectionCut = [
      // The workshop ceiling and bronze machine wall previously bled upward
      // through the creature floor. Hide the retractable industrial cassette
      // only while standing in the sanctuary; every exterior and workshop
      // view still receives the complete transforming deck.
      model.root.getObjectByName('DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE'),
    ].filter((object): object is THREE.Object3D => Boolean(object));

    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: '#082c3a', roughness: 0.22, metalness: 0.08,
      transmission: 0.08, clearcoat: 0.65, clearcoatRoughness: 0.12,
      transparent: true, opacity: 0.86,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(34, 26, 1, 1), waterMaterial);
    water.name = 'WATER_SURFACE_PREVIEW';
    water.rotation.x = -Math.PI / 2;
    water.position.y = -3.02;
    water.receiveShadow = true;
    scene.add(water);

    const waterGrid = new THREE.GridHelper(26, 34, '#1d7188', '#113d4b');
    waterGrid.position.y = -3;
    (waterGrid.material as THREE.Material).transparent = true;
    (waterGrid.material as THREE.Material).opacity = 0.15;
    scene.add(waterGrid);

    let frame = 0;
    let disposed = false;
    let previousPov = settingsRef.current.pov;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.75 : 1.15);
      const width = Math.max(1, Math.round(rect.width * pixelRatio));
      const height = Math.max(1, Math.round(rect.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) renderer.setSize(width, height, false);
      camera.aspect = rect.width / Math.max(1, rect.height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const start = performance.now();
    const runtimeQuery = new URLSearchParams(window.location.search);
    const shouldCaptureCanvas = runtimeQuery.get('capture') === '1';
    const requestedTime = runtimeQuery.get('time');
    const parsedTime = requestedTime === null ? null : Number(requestedTime);
    const deterministicTime = parsedTime !== null && Number.isFinite(parsedTime) ? Math.max(0, parsedTime) : null;
    const render = (now: number) => {
      if (disposed) return;
      const timeSeconds = (now - start) / 1000;
      const presentationTimeSeconds = deterministicTime ?? timeSeconds;
      const settings = settingsRef.current;
      if (settings.pov !== previousPov) {
        interiorLookRef.current = {yaw: 0, pitch: 0};
        previousPov = settings.pov;
      }
      model.update({timeSeconds: presentationTimeSeconds, ...settings});
      if (settings.pov === 'steering-house') {
        steeringShoulderSectionCut.forEach((object) => { object.visible = false; });
      } else if (settings.pov === 'administration') {
        administrationShoulderSectionCut.forEach((object) => { object.visible = false; });
      }
      const fabricationProbe = settings.pov === 'fabrication' || settings.pov === 'fabrication-window';
      const lowerDeckProbe = fabricationProbe || settings.pov === 'creature-habitat';
      const showFabricationVista = fabricationProbe && settings.pose === 'docked';
      fabricationVista.visible = showFabricationVista;
      starField.visible = !showFabricationVista;
      lowerDeckExcludedLights.forEach(({light, intensity}) => {
        light.intensity = lowerDeckProbe ? 0 : intensity;
      });
      lowerDeckEmissiveMaterials.forEach(({material, intensity}) => {
        material.emissiveIntensity = lowerDeckProbe
          ? intensity * (settings.pov === 'creature-habitat' ? 0.28 : 0.4)
          : intensity;
      });
      lowerDeckSectionCut.forEach((object) => { object.visible = !lowerDeckProbe; });
      lowerDeckGardenSectionCut.forEach((object) => { object.visible = !lowerDeckProbe; });
      fabricationOverheadSectionCut.forEach((object) => { object.visible = !fabricationProbe; });
      creatureUnderfloorSectionCut.forEach((object) => { object.visible = settings.pov !== 'creature-habitat'; });
      const isInteriorView = settings.cameraProbe !== null || settings.pov !== 'orbit';
      hemisphere.intensity = lowerDeckProbe ? 0.82 : isInteriorView ? 1.35 : 0.62;
      key.intensity = lowerDeckProbe ? (settings.pov === 'creature-habitat' ? 0.48 : 0.62) : isInteriorView ? 2.25 : 4.15;
      fill.intensity = lowerDeckProbe ? 0.54 : isInteriorView ? 1.75 : 0.72;
      rim.intensity = lowerDeckProbe ? 0.68 : isInteriorView ? 1.15 : 2.65;
      const sanctuaryProbe = settings.pov === 'creature-habitat';
      lowerDeckAmbientLight.color.set(sanctuaryProbe ? '#b8caa6' : '#d6c2a8');
      lowerDeckAmbientLight.intensity = lowerDeckProbe ? (sanctuaryProbe ? 2.6 : 2.2) : 0;
      lowerDeckWarmLight.intensity = lowerDeckProbe ? (sanctuaryProbe ? 0.75 : 2.2) : 0;
      lowerDeckCyanLight.intensity = lowerDeckProbe ? (sanctuaryProbe ? 0.35 : 0.18) : 0;
      lowerDeckHeroLight.intensity = lowerDeckProbe ? (sanctuaryProbe ? 2.4 : 4.8) : 0;
      workshopFloorLight.intensity = fabricationProbe ? 4.2 : 0;
      const lowerDeckLightY = fabricationProbe ? -1.18 : -0.82;
      lowerDeckWarmLight.position.y = lowerDeckLightY;
      lowerDeckCyanLight.position.y = lowerDeckLightY - 0.04;
      lowerDeckHeroLight.position.y = lowerDeckLightY + 0.48;
      lowerDeckHeroTarget.position.y = lowerDeckLightY - 0.02;
      renderer.toneMappingExposure = lowerDeckProbe ? (sanctuaryProbe ? 1.12 : 1.18) : isInteriorView ? 1.18 : 0.94;
      if (settings.cameraProbe || settings.pov !== 'orbit') {
        const cameraPreset = settings.cameraProbe ?? POV_CAMERA[settings.pov as Exclude<ExpeditionShipPov, 'orbit'>];
        camera.near = 0.025;
        camera.fov = cameraPreset.fov;
        const anchorNames = settings.cameraProbe ? undefined : POV_MODEL_ANCHORS[settings.pov as Exclude<ExpeditionShipPov, 'orbit'>];
        const positionAnchor = anchorNames ? model.root.getObjectByName(anchorNames[0]) : undefined;
        const targetAnchor = anchorNames ? model.root.getObjectByName(anchorNames[1]) : undefined;
        if (positionAnchor && targetAnchor) {
          positionAnchor.getWorldPosition(camera.position);
          const target = targetAnchor.getWorldPosition(new THREE.Vector3());
          const direction = target.sub(camera.position).normalize();
          direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), interiorLookRef.current.yaw);
          const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
          direction.applyAxisAngle(right, interiorLookRef.current.pitch);
          camera.lookAt(camera.position.clone().add(direction));
        } else {
          camera.position.set(...cameraPreset.position);
          const target = new THREE.Vector3(...cameraPreset.target);
          const direction = target.sub(camera.position).normalize();
          direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), interiorLookRef.current.yaw);
          const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
          direction.applyAxisAngle(right, interiorLookRef.current.pitch);
          camera.lookAt(camera.position.clone().add(direction));
        }
      } else {
        camera.near = 0.1;
        camera.fov = 35;
        const angle = THREE.MathUtils.degToRad(settings.orbitDegrees);
        const baseDistance = settings.pose === 'docked' ? 11.8 : settings.pose === 'flight' ? 11.4 : 11.6;
        const distance = baseDistance * Math.max(1, 0.76 / Math.max(0.3, camera.aspect));
        camera.position.set(Math.sin(angle) * distance, settings.pose === 'docked' ? 2.8 : 2.65, Math.cos(angle) * distance);
        camera.lookAt(0, settings.pose === 'docked' ? -0.08 : 0.02, 0);
      }
      camera.updateProjectionMatrix();
      waterMaterial.color.setHSL(0.54 + Math.sin(presentationTimeSeconds * 0.18) * 0.005, 0.76, 0.16);
      renderer.render(scene, camera);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
      canvas.dataset.pose = settings.pose;
      canvas.dataset.presentationTime = String(presentationTimeSeconds);
      if (shouldCaptureCanvas && timeSeconds > 0.55 && !canvas.dataset.captureReady) {
        canvas.dataset.capture = canvas.toDataURL('image/png');
        canvas.dataset.captureReady = '1';
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      model.dispose();
      water.geometry.dispose();
      waterMaterial.dispose();
      waterGrid.geometry.dispose();
      (waterGrid.material as THREE.Material).dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      fabricationVista.geometry.dispose();
      vistaMaterial.dispose();
      vistaTexture.dispose();
      renderer.dispose();
    };
  }, [quality]);

  return (
    <canvas
      ref={canvasRef}
      className="expedition-ship-lab__canvas"
      aria-label={`${pose} expedition ship 3D preview`}
      title={pov === 'orbit' ? 'Drag to rotate · click to turn 30°' : 'Drag to look around inside'}
      onPointerDown={(event) => {
        orbitDragRef.current = {
          mode: pov === 'orbit' ? 'orbit' : 'look',
          startX: event.clientX,
          startY: event.clientY,
          startOrbit: orbitDegrees,
          startYaw: interiorLookRef.current.yaw,
          startPitch: interiorLookRef.current.pitch,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = orbitDragRef.current;
        if (!drag) return;
        const delta = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        if (Math.abs(delta) <= 3 && Math.abs(deltaY) <= 3) return;
        drag.moved = true;
        if (drag.mode === 'look') {
          interiorLookRef.current.yaw = THREE.MathUtils.clamp(drag.startYaw - delta * 0.0042, -1.22, 1.22);
          interiorLookRef.current.pitch = THREE.MathUtils.clamp(drag.startPitch - deltaY * 0.0035, -0.58, 0.58);
        } else {
          onOrbitChange(THREE.MathUtils.clamp(drag.startOrbit + delta * 0.42, -180, 180));
        }
      }}
      onPointerUp={(event) => {
        const drag = orbitDragRef.current;
        orbitDragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (drag?.mode === 'orbit' && !drag.moved) onOrbitChange(orbitDegrees >= 180 ? -150 : orbitDegrees + 30);
      }}
      onPointerCancel={() => { orbitDragRef.current = null; }}
    />
  );
}

export default function ExpeditionShipThreeLab() {
  const initial = useMemo(() => {
    const pose = readPose();
    const travelDefaults = pose === 'flight';
    const query = new URLSearchParams(window.location.search);
    return {
      pose,
      quality: readQuality(),
      orbit: readOrbit(),
      thrust: readNumber('thrust', travelDefaults ? 0.42 : 0),
      boost: readNumber('boost', 0),
      hover: readNumber('hover', travelDefaults ? 0.72 : 0),
      walk: readNumber('walk', 0),
      stabilize: readNumber('stabilize', 0.72),
      transformProgress: readOptionalNumber('transform'),
      pov: readPov(),
      cameraProbe: readCameraProbe(),
      isolate: query.get('isolate') === '1',
      capture: query.get('capture') === '1',
    };
  }, []);
  const [pose, setPose] = useState<ExpeditionShipPose>(initial.pose);
  const [orbit, setOrbit] = useState(initial.orbit);
  const [thrust, setThrust] = useState(initial.thrust);
  const [boost, setBoost] = useState(initial.boost);
  const [hover, setHover] = useState(initial.hover);
  const [walk, setWalk] = useState(initial.walk);
  const [stabilize, setStabilize] = useState(initial.stabilize);
  const [transformProgress, setTransformProgress] = useState<number | null>(initial.transformProgress);
  const [pov, setPov] = useState<ExpeditionShipPov>(initial.pov);
  const interior = pov !== 'orbit';

  const changePose = (nextPose: ExpeditionShipPose) => {
    setPose(nextPose);
    setTransformProgress(null);
    replaceQuery({pose: nextPose});
  };
  const changeOrbit = (nextOrbit: number) => {
    setOrbit(nextOrbit);
    setPov('orbit');
    replaceQuery({orbit: String(nextOrbit), view: 'exterior', pov: 'orbit'});
  };
  const showPov = (nextPov: Exclude<ExpeditionShipPov, 'orbit'>) => {
    setPov(nextPov);
    const nextPose: ExpeditionShipPose = nextPov === 'underside' ? 'expedition' : 'docked';
    replaceQuery({view: nextPov === 'roof' || nextPov === 'underside' ? 'exterior' : 'interior', pose: nextPose, pov: nextPov});
    setPose(nextPose);
  };

  return (
    <main className={`expedition-ship-lab${initial.isolate ? ' expedition-ship-lab--isolate' : ''}${initial.capture ? ' expedition-ship-lab--capture' : ''}`}>
      {!initial.isolate && !initial.capture && (
        <header className="expedition-ship-lab__header">
          <div>
            <p>HabitGame vehicle lab</p>
            <h1>The Expedition Ship</h1>
            <span>150 m controller sanctuary · protected Zen core · tri-drive macro rig v3</span>
          </div>
          <div className="expedition-ship-lab__pose-controls" aria-label="Ship configuration">
            {(['docked', 'expedition', 'flight'] as ExpeditionShipPose[]).map((candidate) => (
              <button key={candidate} type="button" className={candidate === pose ? 'is-active' : ''} onClick={() => changePose(candidate)}>
                {POSE_LABELS[candidate]}
              </button>
            ))}
          </div>
        </header>
      )}

      <section className="expedition-ship-lab__stage">
        <ExpeditionShipCanvas pose={pose} quality={initial.quality} orbitDegrees={orbit} thrust={thrust} boost={boost} hover={hover} walk={walk} stabilize={stabilize} transformProgress={transformProgress} pov={pov} cameraProbe={initial.cameraProbe} onOrbitChange={changeOrbit} />
        <div className="expedition-ship-lab__badge">
          <strong>{interior ? POV_LABELS[pov] : POSE_LABELS[pose]}</strong>
          <span>{pov !== 'orbit' ? POV_DESCRIPTIONS[pov] : `${initial.quality} quality · orbit ${orbit}°`}</span>
        </div>
        {!initial.isolate && !initial.capture && (
          <div className="expedition-ship-lab__orbit" aria-label="Inspection angle">
            {[-30, 0, 30, 90, 180].map((value) => (
              <button key={value} type="button" className={!interior && value === orbit ? 'is-active' : ''} onClick={() => changeOrbit(value)}>
                {value === 0 ? 'Front' : value === 180 ? 'Rear' : `${value}°`}
              </button>
            ))}
            {(Object.keys(POV_LABELS) as Array<Exclude<ExpeditionShipPov, 'orbit'>>).map((candidate) => (
              <button key={candidate} type="button" className={pov === candidate ? 'is-active' : ''} onClick={() => showPov(candidate)}>
                {POV_LABELS[candidate]}
              </button>
            ))}
          </div>
        )}
      </section>

      {!initial.isolate && !initial.capture && (
        <section className="expedition-ship-lab__systems" aria-label="Presentation systems">
          <label>
            <span>Drag / lever rotation</span>
            <input type="range" min="-180" max="180" step="1" value={orbit} onChange={(event) => changeOrbit(Number(event.currentTarget.value))} />
          </label>
          <label>
            <span>Travel thrust</span>
            <input type="range" min="0" max="1" step="0.01" value={thrust} onChange={(event) => setThrust(Number(event.currentTarget.value))} />
          </label>
          <label>
            <span>Transformation sequence</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={transformProgress ?? (pose === 'docked' ? 0 : pose === 'expedition' ? 0.5 : 1)}
              onChange={(event) => {
                const next = Number(event.currentTarget.value);
                setTransformProgress(next);
                replaceQuery({transform: next.toFixed(3)});
              }}
            />
          </label>
          <label>
            <span>Boost</span>
            <input type="range" min="0" max="1" step="0.01" value={boost} onChange={(event) => setBoost(Number(event.currentTarget.value))} />
          </label>
          <label>
            <span>Hover / water downwash</span>
            <input type="range" min="0" max="1" step="0.01" value={hover} onChange={(event) => setHover(Number(event.currentTarget.value))} />
          </label>
          <label>
            <span>Walking gait</span>
            <input type="range" min="0" max="1" step="0.01" value={walk} onChange={(event) => setWalk(Number(event.currentTarget.value))} />
          </label>
          <label>
            <span>Leg stabilization rockets</span>
            <input type="range" min="0" max="1" step="0.01" value={stabilize} onChange={(event) => setStabilize(Number(event.currentTarget.value))} />
          </label>
          <article>
            <b>Environment contract</b>
            <p>The ship emits origin, radius, strength and phase. This preview maps it to water rings; islands can map it to snow, leaves, dust or heat haze.</p>
          </article>
        </section>
      )}
    </main>
  );
}
