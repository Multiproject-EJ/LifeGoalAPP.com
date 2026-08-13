import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island3FrostmoonMaterials } from './Island3FrostmoonThreeWorld';
import { FROSTWELL_DEPTH_METERS } from '../services/islandRunSignatureMissions';

const FROSTWELL_PROGRESS_LIGHT_COUNT = 20;

export interface FrostwellIceworksPresentation {
  metersDrilled: number;
  built: boolean;
  constructionSequence: number;
  constructionPreviewLoop?: boolean;
}

export interface FrostwellIceworksRuntime {
  root: THREE.Group;
  hitTarget: THREE.Object3D;
  setPresentation: (presentation: FrostwellIceworksPresentation) => void;
  animate: (elapsed: number) => void;
}

export const FROSTWELL_OFFSHORE_POSITION = Object.freeze({ x: 0, y: -0.33, z: -9.4 });
export const FROSTWELL_PLATFORM_RADIUS = 2.05;

function tubeBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 8,
) {
  const delta = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), segments), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function createPipePath(points: THREE.Vector3[], radius: number, material: THREE.Material, segments: number) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(8, segments), radius, 6, false),
    material,
  );
}

function createFish(material: THREE.Material) {
  const fish = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), material);
  body.scale.set(1.65, 0.72, 0.76);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.13, 3), material);
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -0.13;
  fish.add(body, tail);
  return fish;
}

export function createFrostwellIceworks(
  quality: Island3DQuality,
  frostMaterials: Island3FrostmoonMaterials,
): FrostwellIceworksRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_3_FROSTWELL_ICEWORKS_OFFSHORE_ROOT';
  // North-ocean placement: centred behind Frostmoon in the locked overview.
  // Rotate the locally east-pointing umbilical so it reaches south toward the
  // island while the facility itself remains clearly detached offshore.
  root.position.set(FROSTWELL_OFFSHORE_POSITION.x, FROSTWELL_OFFSHORE_POSITION.y, FROSTWELL_OFFSHORE_POSITION.z);
  root.rotation.y = -Math.PI / 2;
  root.userData.signatureMissionId = 'frostwell-iceworks';
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    parts: [
      'sea-ice-platform', 'platform-cracks', 'drill-rig', 'drill-pivot', 'winch-pivot',
      'bore-opening', 'progress-light-ring', 'fishery-building', 'fishery-roof', 'freshwater-reservoir',
      'reservoir-water-column', 'tank-band-array', 'net-conveyor', 'carrier-array',
      'catch-sorting-bin', 'water-pipe-network', 'water-flow-system', 'service-umbilical', 'construction-burst',
      'snow-burst-particles', 'warm-practical-system',
    ],
    sockets: {
      drill: 'FROSTWELL_DRILL_PIVOT',
      net: 'FROSTWELL_NET_CARRIER_SOCKET',
      water: 'FROSTWELL_WATER_PIPE_SOCKET',
    },
  };

  const steel = new THREE.MeshStandardMaterial({ color: 0x283846, roughness: 0.42, metalness: 0.78 });
  const steelLight = new THREE.MeshStandardMaterial({ color: 0x708ca0, roughness: 0.34, metalness: 0.7 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87035, roughness: 0.38, metalness: 0.78 });
  const signal = new THREE.MeshStandardMaterial({ color: 0x68f5df, emissive: 0x16a99a, emissiveIntensity: 0.85, roughness: 0.24 });
  const waterFlow = new THREE.MeshPhysicalMaterial({ color: 0x54d8f4, emissive: 0x137ca3, emissiveIntensity: 0.72, roughness: 0.06, transmission: 0.18, transparent: true, opacity: 0.9 });
  const reservoirGlass = new THREE.MeshPhysicalMaterial({ color: 0x9cecff, roughness: 0.08, metalness: 0.06, transmission: 0.36, transparent: true, opacity: 0.52, thickness: 0.22, clearcoat: 0.9, depthWrite: false });
  const boreDark = new THREE.MeshStandardMaterial({ color: 0x071722, roughness: 0.38, metalness: 0.18, emissive: 0x073a50, emissiveIntensity: 0.45 });
  const fishMaterial = new THREE.MeshStandardMaterial({ color: 0xff9d55, emissive: 0x6b2912, emissiveIntensity: 0.2, roughness: 0.55 });
  const rope = new THREE.MeshStandardMaterial({ color: 0x3b3030, roughness: 0.88 });
  const burstMaterial = new THREE.MeshPhysicalMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0, roughness: 0.45, depthWrite: false });
  const segments = quality === 'high' ? 18 : quality === 'medium' ? 12 : 8;

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(FROSTWELL_PLATFORM_RADIUS, 1.82, 0.34, segments + 4), frostMaterials.ice);
  platform.name = 'FROSTWELL_DETACHED_SEA_ICE_PLATFORM';
  platform.position.y = 0.08;
  const snowCap = new THREE.Mesh(new THREE.CylinderGeometry(1.93, 2.01, 0.13, segments + 4), frostMaterials.snow);
  snowCap.name = 'FROSTWELL_SEA_ICE_SNOW_CAP';
  snowCap.position.y = 0.3;
  root.add(platform, snowCap);

  const crackCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4;
  const platformCracks = new THREE.Group();
  platformCracks.name = 'FROSTWELL_PLATFORM_CRACKS';
  for (let i = 0; i < crackCount; i += 1) {
    const angle = i / crackCount * Math.PI * 2 + 0.35;
    const crack = tubeBetween(
      new THREE.Vector3(Math.cos(angle) * 0.35, 0.375, Math.sin(angle) * 0.35),
      new THREE.Vector3(Math.cos(angle + 0.1) * (1.25 + i % 3 * 0.17), 0.378, Math.sin(angle + 0.1) * (1.25 + i % 3 * 0.17)),
      0.018,
      frostMaterials.crystal,
      5,
    );
    crack.name = `FROSTWELL_PLATFORM_CRACK_${i + 1}`;
    platformCracks.add(crack);
  }
  root.add(platformCracks);

  // A slim non-walkable umbilical keeps the offshore platform visually linked
  // to Frostmoon while ending outside the protected 36-tile board.
  const umbilical = new THREE.Group();
  umbilical.name = 'FROSTWELL_PIPE_AND_SERVICE_PIER_UMBILICAL';
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.56), frostMaterials.timberDark);
  deck.position.set(3.08, 0.36, -0.05);
  umbilical.add(deck);
  for (let i = 0; i < 8; i += 1) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.72), frostMaterials.timber);
    sleeper.position.set(1.8 + i * 0.37, 0.43, -0.05);
    umbilical.add(sleeper);
  }
  const pipePath = [new THREE.Vector3(1.42, 0.65, 0.19), new THREE.Vector3(2.2, 0.83, 0.19), new THREE.Vector3(3.5, 0.68, 0.19), new THREE.Vector3(4.42, 0.54, 0.13)];
  umbilical.add(createPipePath(pipePath, 0.09, copper, segments));
  root.add(umbilical);

  const drillSite = new THREE.Group();
  drillSite.name = 'FROSTWELL_DRILL_SITE';
  drillSite.position.set(-0.58, 0.38, -0.08);
  const drillDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.22, 12), steel);
  drillDeck.position.y = 0.12;
  const boreOpening = new THREE.Group();
  boreOpening.name = 'FROSTWELL_BORE_OPENING';
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.08, segments), boreDark);
  bore.position.y = 0.255;
  const boreRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.065, 7, segments), signal);
  boreRim.rotation.x = Math.PI / 2;
  boreRim.position.y = 0.305;
  const boreWater = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.035, segments), waterFlow);
  boreWater.position.y = 0.305;
  boreOpening.add(bore, boreRim, boreWater);
  drillSite.add(drillDeck, boreOpening);
  const tower = new THREE.Group();
  tower.name = 'FROSTWELL_A_FRAME_DRILL_TOWER';
  [[-0.48, -0.42], [0.48, -0.42], [-0.48, 0.42], [0.48, 0.42]].forEach(([x, z]) => {
    tower.add(tubeBetween(new THREE.Vector3(x, 0.16, z), new THREE.Vector3(x * 0.28, 2.75, z * 0.28), 0.055, steel, 7));
  });
  for (let y = 0.65; y < 2.6; y += 0.48) {
    tower.add(tubeBetween(new THREE.Vector3(-0.42 + y * 0.06, y, -0.37 + y * 0.04), new THREE.Vector3(0.42 - y * 0.06, y, -0.37 + y * 0.04), 0.035, copper, 6));
  }
  const crownBeam = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.15, 0.58), steelLight);
  crownBeam.position.y = 2.72;
  tower.add(crownBeam);
  drillSite.add(tower);

  const drillPivot = new THREE.Group();
  drillPivot.name = 'FROSTWELL_DRILL_PIVOT';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 2.45, 10), steelLight);
  shaft.position.y = 1.42;
  const auger = new THREE.Mesh(new THREE.ConeGeometry(0.31, 0.72, 10), copper);
  auger.position.y = 0.08;
  auger.rotation.z = Math.PI;
  drillPivot.add(shaft, auger);
  drillSite.add(drillPivot);
  const winch = new THREE.Group();
  winch.name = 'FROSTWELL_WINCH_PIVOT';
  const winchWheel = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.065, 8, segments), copper);
  winchWheel.rotation.y = Math.PI / 2;
  winch.add(winchWheel);
  winch.position.set(0.5, 2.28, 0.06);
  drillSite.add(winch);

  const progressLights: THREE.Mesh[] = [];
  const progressLightRing = new THREE.Group();
  progressLightRing.name = 'FROSTWELL_PROGRESS_LIGHT_RING';
  for (let i = 0; i < FROSTWELL_PROGRESS_LIGHT_COUNT; i += 1) {
    const angle = i / FROSTWELL_PROGRESS_LIGHT_COUNT * Math.PI * 2;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), i < 1 ? signal : steelLight);
    lamp.position.set(Math.cos(angle) * 0.72, 0.31, Math.sin(angle) * 0.72);
    lamp.name = `FROSTWELL_PROGRESS_LIGHT_${i + 1}`;
    progressLightRing.add(lamp);
    progressLights.push(lamp);
  }
  drillSite.add(progressLightRing);
  root.add(drillSite);

  const operating = new THREE.Group();
  operating.name = 'FROSTWELL_OPERATING_FISHERY_AND_RESERVOIR';
  operating.visible = false;
  const fishery = new THREE.Group();
  fishery.position.set(0.55, 0.48, -0.62);
  const shed = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.9, 0.94), frostMaterials.timberDark);
  shed.name = 'FROSTWELL_FISHERY_BUILDING';
  shed.position.y = 0.46;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.97, 0.58, 4), frostMaterials.indigo);
  roof.name = 'FROSTWELL_FISHERY_ROOF';
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.72;
  roof.position.y = 1.12;
  const warmWindow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.025), frostMaterials.windowGlow);
  warmWindow.name = 'FROSTWELL_WARM_PRACTICAL_SYSTEM';
  warmWindow.position.set(0.22, 0.57, 0.452);
  const fisherySign = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), signal);
  fisherySign.name = 'FROSTWELL_FISHERY_BEACON';
  fisherySign.rotation.y = Math.PI / 2;
  fisherySign.position.set(0.655, 0.73, 0.04);
  fishery.add(shed, roof, warmWindow, fisherySign);
  operating.add(fishery);

  const tankRoot = new THREE.Group();
  tankRoot.name = 'FROSTWELL_FRESHWATER_RESERVOIR';
  tankRoot.position.set(0.88, 0.48, 0.69);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.61, 1.48, segments, 1, true), reservoirGlass);
  tank.position.y = 0.79;
  const tankWater = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.62, segments), waterFlow);
  tankWater.name = 'FROSTWELL_RESERVOIR_WATER_COLUMN';
  tankWater.position.y = 0.43;
  const tankTop = new THREE.Mesh(new THREE.ConeGeometry(0.61, 0.42, segments), copper);
  tankTop.position.y = 1.73;
  const tankGauge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.02, 0.09), waterFlow);
  tankGauge.name = 'FROSTWELL_RESERVOIR_LEVEL_GAUGE';
  tankGauge.position.set(0.57, 0.82, 0.04);
  const tankBase = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.16, segments), steel);
  tankBase.position.y = 0.05;
  tankRoot.add(tank, tankWater, tankTop, tankGauge, tankBase);
  const tankBandArray = new THREE.Group();
  tankBandArray.name = 'FROSTWELL_TANK_BAND_ARRAY';
  for (let i = 0; i < 4; i += 1) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.575, 0.038, 6, segments), copper);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.25 + i * 0.4;
    band.name = `FROSTWELL_TANK_BAND_${i + 1}`;
    tankBandArray.add(band);
  }
  tankRoot.add(tankBandArray);
  operating.add(tankRoot);

  const conveyor = new THREE.Group();
  conveyor.name = 'FROSTWELL_NET_CONVEYOR_PIVOT';
  conveyor.position.set(0.05, 0.42, -1.25);
  conveyor.add(tubeBetween(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 2.08, 0), 0.055, steel, 7));
  conveyor.add(tubeBetween(new THREE.Vector3(0, 2.08, 0), new THREE.Vector3(1.08, 2.08, -0.08), 0.055, steel, 7));
  const conveyorWheel = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.065, 8, segments), copper);
  conveyorWheel.name = 'FROSTWELL_NET_CONVEYOR_WHEEL';
  conveyorWheel.position.set(0.02, 2.08, 0);
  conveyorWheel.rotation.y = Math.PI / 2;
  conveyor.add(conveyorWheel);
  const carriers: THREE.Group[] = [];
  const carrierArray = new THREE.Group();
  carrierArray.name = 'FROSTWELL_CARRIER_ARRAY';
  const carrierCount = quality === 'low' ? 4 : 6;
  for (let i = 0; i < carrierCount; i += 1) {
    const carrier = new THREE.Group();
    carrier.name = `FROSTWELL_NET_CARRIER_${i + 1}`;
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 5), rope);
    line.position.y = -0.26;
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.22, 8, 1, true), copper);
    bucket.position.y = -0.62;
    carrier.add(line, bucket);
    if (i % 2 === 0) {
      const fish = createFish(fishMaterial);
      fish.scale.setScalar(1.35);
      fish.position.set(0, -0.54, 0);
      carrier.add(fish);
    }
    carrierArray.add(carrier);
    carriers.push(carrier);
  }
  conveyor.add(carrierArray);
  operating.add(conveyor);

  const catchBin = new THREE.Group();
  catchBin.name = 'FROSTWELL_CATCH_SORTING_BIN';
  catchBin.position.set(0.9, 0.48, -1.15);
  const catchCrate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.3, 0.5), frostMaterials.timber);
  catchCrate.position.y = 0.18;
  catchBin.add(catchCrate);
  for (let i = 0; i < 4; i += 1) {
    const fish = createFish(fishMaterial);
    fish.scale.setScalar(1.5);
    fish.position.set(-0.23 + i * 0.15, 0.39 + i % 2 * 0.04, -0.08 + i % 2 * 0.16);
    fish.rotation.y = i % 2 ? 0.28 : -0.25;
    catchBin.add(fish);
  }
  operating.add(catchBin);

  const waterPipePoints = [
    new THREE.Vector3(-0.58, 0.52, -0.04),
    new THREE.Vector3(-0.2, 1.18, 0.12),
    new THREE.Vector3(0.28, 1.68, 0.34),
    new THREE.Vector3(0.69, 1.58, 0.58),
    new THREE.Vector3(0.88, 1.16, 0.69),
  ];
  const waterCurve = new THREE.CatmullRomCurve3(waterPipePoints);
  const waterPipe = createPipePath(waterPipePoints, 0.12, waterFlow, segments);
  waterPipe.name = 'FROSTWELL_WATER_PIPE_NETWORK';
  operating.add(waterPipe);
  waterPipePoints.slice(1, -1).forEach((point, index) => {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 10), copper);
    collar.name = `FROSTWELL_PIPE_COLLAR_${index + 1}`;
    collar.position.copy(point);
    collar.rotation.x = Math.PI / 2;
    operating.add(collar);
  });
  const flowSlugs: THREE.Mesh[] = [];
  const waterFlowSystem = new THREE.Group();
  waterFlowSystem.name = 'FROSTWELL_WATER_FLOW_SYSTEM';
  for (let i = 0; i < (quality === 'low' ? 3 : 6); i += 1) {
    const slug = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 5), waterFlow);
    slug.name = `FROSTWELL_WATER_FLOW_SLUG_${i + 1}`;
    waterFlowSystem.add(slug);
    flowSlugs.push(slug);
  }
  operating.add(waterFlowSystem);
  root.add(operating);

  const burst = new THREE.Group();
  burst.name = 'FROSTWELL_CONSTRUCTION_POOF';
  const burstPuffs: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>[] = [];
  const burstParticles = new THREE.Group();
  burstParticles.name = 'FROSTWELL_SNOW_BURST_PARTICLES';
  const burstCount = quality === 'high' ? 22 : quality === 'medium' ? 14 : 8;
  for (let i = 0; i < burstCount; i += 1) {
    const puffMaterial = burstMaterial.clone();
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.15 + i % 3 * 0.055, 7, 5), puffMaterial);
    const angle = i / burstCount * Math.PI * 2;
    puff.userData.angle = angle;
    puff.userData.radius = 0.3 + (i % 5) * 0.16;
    puff.name = `FROSTWELL_CONSTRUCTION_PUFF_${i + 1}`;
    burstParticles.add(puff);
    burstPuffs.push(puff);
  }
  burst.add(burstParticles);
  root.add(burst);

  const hitTarget = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.15, 3.6, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false }),
  );
  hitTarget.name = 'FROSTWELL_SIGNATURE_MISSION_HIT_TARGET';
  hitTarget.position.set(0, 1.58, 0);
  hitTarget.userData.signatureMissionId = 'frostwell-iceworks';
  root.add(hitTarget);

  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child !== hitTarget) {
      child.castShadow = quality !== 'low';
      child.receiveShadow = true;
    }
  });

  let presentation: FrostwellIceworksPresentation = { metersDrilled: 0, built: false, constructionSequence: 0 };
  let lastSequence = 0;
  let burstStartedAt: number | null = null;
  let lastElapsed = 0;
  const setPresentation = (next: FrostwellIceworksPresentation) => {
    const normalizedMeters = Math.max(0, Math.min(FROSTWELL_DEPTH_METERS, Math.floor(next.metersDrilled)));
    const progress = normalizedMeters / FROSTWELL_DEPTH_METERS;
    presentation = { ...next, metersDrilled: normalizedMeters };
    operating.visible = next.built;
    progressLights.forEach((lamp, index) => { lamp.material = index < Math.ceil(progress * progressLights.length) ? signal : steelLight; });
    drillPivot.position.y = -progress * 0.42;
    if (next.constructionSequence > lastSequence) burstStartedAt = lastElapsed;
    lastSequence = next.constructionSequence;
  };

  return {
    root,
    hitTarget,
    setPresentation,
    animate: (elapsed) => {
      lastElapsed = elapsed;
      const drilling = !presentation.built && presentation.metersDrilled < FROSTWELL_DEPTH_METERS;
      if (drilling) {
        drillPivot.rotation.y = elapsed * 3.6;
        drillPivot.position.y += Math.sin(elapsed * 8) * 0.0018;
        winch.rotation.x = elapsed * 1.8;
      } else if (!presentation.built) {
        progressLights.forEach((lamp, index) => { lamp.scale.setScalar(0.84 + Math.sin(elapsed * 4 + index * 0.3) * 0.16); });
      }
      if (presentation.built) {
        winch.rotation.x = elapsed * 1.2;
        carriers.forEach((carrier, index) => {
          const t = (elapsed * 0.16 + index / carriers.length) % 1;
          if (t < 0.5) carrier.position.set(0, 1.55 - t * 3.4, 0);
          else carrier.position.set((t - 0.5) * 1.55, -0.15 + (t - 0.5) * 3.4, -0.08 * (t - 0.5));
          carrier.rotation.y = Math.sin(elapsed * 1.2 + index) * 0.08;
        });
        flowSlugs.forEach((slug, index) => {
          const rawT = (Number.isFinite(elapsed) ? elapsed : 0) * 0.23 + index / flowSlugs.length;
          const t = Math.min(0.999999, ((rawT % 1) + 1) % 1);
          // Parameter-space sampling is deliberate here. Arc-length sampling
          // can race its lazy cache during hot reloads while the scene is
          // already animating on iOS/WebGL; this path only needs a stable
          // visible pulse, not physically uniform flow speed.
          slug.position.copy(waterCurve.getPoint(t));
          slug.scale.setScalar(0.72 + Math.sin(elapsed * 3 + index) * 0.14);
        });
        tankWater.scale.y = 0.9 + Math.sin(elapsed * 0.8) * 0.08;
        tankGauge.scale.y = 0.88 + Math.sin(elapsed * 0.8) * 0.08;
        conveyorWheel.rotation.x = elapsed * 1.4;
      }
      const previewBurstT = presentation.constructionPreviewLoop ? (elapsed % 2.2) / 1.35 : null;
      if (burstStartedAt !== null || (previewBurstT !== null && previewBurstT <= 1)) {
        const t = previewBurstT !== null ? Math.min(1, previewBurstT) : Math.min(1, (elapsed - (burstStartedAt ?? elapsed)) / 1.35);
        burstPuffs.forEach((puff, index) => {
          const outward = puff.userData.radius * (0.4 + t * 1.5);
          puff.position.set(
            Math.cos(puff.userData.angle) * outward,
            0.48 + Math.sin(t * Math.PI) * (0.9 + index % 3 * 0.16),
            Math.sin(puff.userData.angle) * outward,
          );
          puff.scale.setScalar(0.55 + t * 1.6);
          puff.material.opacity = Math.sin(t * Math.PI) * 0.72;
        });
        if (t >= 1 && !presentation.constructionPreviewLoop) burstStartedAt = null;
      } else {
        burstPuffs.forEach((puff) => { puff.material.opacity = 0; });
      }
    },
  };
}
