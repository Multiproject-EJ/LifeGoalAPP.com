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
  /** Dev evidence only: keep the side section visible at 0m. */
  cutawayPreview?: boolean;
  /** Dev evidence only: repeat the final 450m-to-500m drilling beat. */
  cutawayPreviewLoop?: boolean;
  /** Dev evidence only: freeze the final drilling beat at an exact second. */
  cutawayPreviewTimeSeconds?: number;
  /** Dev evidence only: inspect the section from fixed review angles. */
  cutawayEvidenceView?: 'front' | 'left' | 'right' | 'rear';
}

export interface FrostwellIceworksRuntime {
  root: THREE.Group;
  hitTarget: THREE.Object3D;
  setPresentation: (presentation: FrostwellIceworksPresentation) => void;
  setInspectionActive: (active: boolean) => void;
  animate: (elapsed: number) => void;
  getCutawayCameraPose: () => { position: THREE.Vector3; target: THREE.Vector3 } | null;
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

function createHelicalAugerGeometry(length: number, radius: number, turns: number, quality: Island3DQuality) {
  const pointCount = quality === 'high' ? 96 : quality === 'medium' ? 64 : 38;
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= pointCount; index += 1) {
    const t = index / pointCount;
    const angle = t * Math.PI * 2 * turns;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, -t * length, Math.sin(angle) * radius));
  }
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    pointCount,
    quality === 'low' ? 0.035 : 0.045,
    quality === 'high' ? 8 : 6,
    false,
  );
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
      'snow-burst-particles', 'warm-practical-system', 'under-ice-cutaway-stage',
      'ice-strata-array', 'strata-seam-array', 'volumetric-bore', 'segmented-auger-shaft', 'helical-auger-bit',
      'bore-score-helix', 'ice-chip-debris-system', 'freshwater-lens', 'freshwater-ripple-array',
      'water-proximity-cue', 'breakthrough-burst-system', 'cutaway-side-camera-socket',
      'surface-lift-headhouse', 'deep-fishery-processing-hall', 'people-lift-shaft', 'people-lift-cage',
      'fish-cargo-lift-shaft', 'fish-cargo-lift-cage', 'under-ice-fishing-winch', 'under-ice-net',
      'under-ice-fish-school',
    ],
    sockets: {
      drill: 'FROSTWELL_DRILL_PIVOT',
      net: 'FROSTWELL_NET_CARRIER_SOCKET',
      water: 'FROSTWELL_WATER_PIPE_SOCKET',
      cutawayCamera: 'FROSTWELL_CUTAWAY_SIDE_CAMERA_SOCKET',
      cutter: 'FROSTWELL_HELICAL_AUGER_BIT',
      freshwater: 'FROSTWELL_FRESHWATER_LENS',
      peopleLift: 'FROSTWELL_PEOPLE_LIFT_CAGE',
      fishLift: 'FROSTWELL_FISH_CARGO_LIFT_CAGE',
      deepFishery: 'FROSTWELL_DEEP_FISHERY_PROCESSING_HALL',
      fishingNet: 'FROSTWELL_UNDERICE_FISHING_NET',
    },
  };

  const steel = new THREE.MeshPhysicalMaterial({ color: 0x253846, roughness: 0.4, metalness: 0.76, clearcoat: 0.14, clearcoatRoughness: 0.52 });
  const steelLight = new THREE.MeshPhysicalMaterial({ color: 0x86a8bd, roughness: 0.29, metalness: 0.66, clearcoat: 0.2, clearcoatRoughness: 0.38 });
  const copper = new THREE.MeshPhysicalMaterial({ color: 0xcf7734, roughness: 0.3, metalness: 0.72, clearcoat: 0.24, clearcoatRoughness: 0.32 });
  const signal = new THREE.MeshStandardMaterial({ color: 0x68f5df, emissive: 0x16a99a, emissiveIntensity: 0.85, roughness: 0.24 });
  const waterFlow = new THREE.MeshPhysicalMaterial({ color: 0x54d8f4, emissive: 0x137ca3, emissiveIntensity: 0.72, roughness: 0.06, transmission: 0.18, transparent: true, opacity: 0.9 });
  const reservoirGlass = new THREE.MeshPhysicalMaterial({ color: 0x9cecff, roughness: 0.08, metalness: 0.06, transmission: 0.36, transparent: true, opacity: 0.52, thickness: 0.22, clearcoat: 0.9, depthWrite: false });
  const boreDark = new THREE.MeshStandardMaterial({ color: 0x071722, roughness: 0.38, metalness: 0.18, emissive: 0x073a50, emissiveIntensity: 0.45 });
  const fishMaterial = new THREE.MeshStandardMaterial({ color: 0xff9d55, emissive: 0x6b2912, emissiveIntensity: 0.2, roughness: 0.55 });
  const rope = new THREE.MeshStandardMaterial({ color: 0x3b3030, roughness: 0.88 });
  const burstMaterial = new THREE.MeshPhysicalMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0, roughness: 0.45, depthWrite: false });
  const sectionFrameMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x315f74,
    emissive: 0x102f40,
    emissiveIntensity: 0.32,
    roughness: 0.5,
    metalness: 0.08,
    transparent: true,
    opacity: 0.66,
    depthWrite: false,
  });
  const sectionEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x365b6c,
    emissive: 0x102733,
    emissiveIntensity: 0.24,
    roughness: 0.62,
    metalness: 0.16,
  });
  const cutawayIceMaterials = [0xcceff8, 0xb2e1ef, 0x95d3e7, 0x78bdd8, 0x5c9fbe].map((color, index) => new THREE.MeshPhysicalMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(0.1),
    emissiveIntensity: 0.18,
    roughness: 0.16 + index * 0.04,
    transparent: true,
    opacity: 0.8 + index * 0.025,
    metalness: 0.02,
    transmission: quality === 'low' ? 0.04 : 0.12,
    thickness: 0.22,
    clearcoat: 0.38,
    clearcoatRoughness: 0.22,
    side: THREE.DoubleSide,
  }));
  const strataSeamMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9f4ff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const freshwaterMaterial = new THREE.MeshStandardMaterial({
    color: 0x168eaa,
    emissive: 0x086985,
    emissiveIntensity: 0.94,
    roughness: 0.08,
    transparent: true,
    opacity: 0.92,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const proximityMaterial = new THREE.MeshBasicMaterial({
    color: 0x59ddf4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const boreScoreMaterial = new THREE.MeshBasicMaterial({
    color: 0x8de9f5,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const iceChipMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xdff8ff,
    emissive: 0x68b8ce,
    emissiveIntensity: 0.24,
    roughness: 0.28,
    transmission: quality === 'low' ? 0 : 0.12,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const breakthroughMaterial = new THREE.MeshBasicMaterial({
    color: 0x7cecff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
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

  // Volumetric side-cutaway stage. Canonical 500m remains gameplay authority;
  // the 6.4-world-unit section is an explicitly compressed presentation scale.
  const cutawayRoot = new THREE.Group();
  cutawayRoot.name = 'FROSTWELL_UNDER_ICE_CUTAWAY_STAGE';
  cutawayRoot.position.set(-0.58, 0.3, -0.08);
  cutawayRoot.visible = false;
  cutawayRoot.userData.cinematicDepthMeters = FROSTWELL_DEPTH_METERS;
  cutawayRoot.userData.compressedWorldDepth = 6.4;

  const sectionFrame = new THREE.Group();
  sectionFrame.name = 'FROSTWELL_CUTAWAY_SECTION_FRAME';
  const sectionBack = new THREE.Mesh(new THREE.BoxGeometry(4.05, 6.55, 0.12), sectionFrameMaterial);
  sectionBack.name = 'FROSTWELL_TRANSLUCENT_SECTION_BACK';
  sectionBack.position.set(0, -3.05, -0.7);
  sectionFrame.add(sectionBack);
  [-1, 1].forEach((side) => {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6.55, 1.42), sectionEdgeMaterial);
    sideRail.name = `FROSTWELL_SECTION_EDGE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    sideRail.position.set(side * 2.02, -3.05, -0.02);
    sectionFrame.add(sideRail);
  });
  const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.14, 1.42), sectionEdgeMaterial);
  bottomRail.name = 'FROSTWELL_SECTION_EDGE_BOTTOM';
  bottomRail.position.set(0, -6.32, -0.02);
  sectionFrame.add(bottomRail);
  cutawayRoot.add(sectionFrame);

  const strataRoot = new THREE.Group();
  strataRoot.name = 'FROSTWELL_ICE_STRATA_ARRAY';
  const strataLayers: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhysicalMaterial>[] = [];
  for (let index = 0; index < cutawayIceMaterials.length; index += 1) {
    const layer = new THREE.Mesh(
      new THREE.BoxGeometry(3.86 - index * 0.08, 1.02, 1.18),
      cutawayIceMaterials[index],
    );
    layer.name = `FROSTWELL_ICE_STRATUM_${index + 1}`;
    layer.position.set((index % 2 ? -1 : 1) * 0.035, -0.55 - index * 1.08, 0);
    layer.userData.depthBandMeters = [0, 100, 200, 300, 400][index];
    strataRoot.add(layer);
    strataLayers.push(layer);
  }
  const upperSlab = new THREE.Mesh(new THREE.BoxGeometry(4, 0.34, 1.28), frostMaterials.ice);
  upperSlab.name = 'FROSTWELL_VOLUMETRIC_SURFACE_ICE_SLAB';
  upperSlab.position.y = 0.08;
  strataRoot.add(upperSlab);
  const strataSeams = new THREE.Group();
  strataSeams.name = 'FROSTWELL_STRATA_SEAM_ARRAY';
  for (let index = 0; index < 5; index += 1) {
    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(3.76 - index * 0.07, 0.035, 1.24),
      strataSeamMaterial.clone(),
    );
    seam.name = `FROSTWELL_STRATA_SEAM_${index + 1}`;
    seam.position.set((index % 2 ? -1 : 1) * 0.035, -1.08 - index * 1.08, 0.04);
    strataSeams.add(seam);
  }
  strataRoot.add(strataSeams);
  const strataInclusions = new THREE.Group();
  strataInclusions.name = 'FROSTWELL_ICE_INCLUSION_ARRAY';
  const inclusionMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8fbff,
    emissive: 0x4e9eb5,
    emissiveIntensity: 0.16,
    roughness: 0.24,
    transmission: quality === 'low' ? 0 : 0.18,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const inclusionCount = quality === 'high' ? 18 : quality === 'medium' ? 12 : 7;
  for (let index = 0; index < inclusionCount; index += 1) {
    const inclusion = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.055 + index % 3 * 0.018, 0),
      inclusionMaterial,
    );
    inclusion.name = `FROSTWELL_ICE_INCLUSION_${index + 1}`;
    inclusion.position.set(
      -1.58 + (index * 0.83 % 3.16),
      -0.58 - (index % 5) * 1.08 + (index % 2 ? 0.2 : -0.14),
      0.61 + (index % 3) * 0.025,
    );
    inclusion.rotation.set(index * 0.34, index * 0.52, index * 0.21);
    inclusion.scale.set(1.7, 0.46, 0.72);
    strataInclusions.add(inclusion);
  }
  strataRoot.add(strataInclusions);
  const depthGauge = new THREE.Group();
  depthGauge.name = 'FROSTWELL_COMPRESSED_DEPTH_GAUGE';
  for (let index = 0; index < 6; index += 1) {
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(index % 5 === 0 ? 0.34 : 0.2, 0.045, 0.085),
      index % 5 === 0 ? copper : steelLight,
    );
    tick.name = `FROSTWELL_DEPTH_TICK_${index + 1}`;
    tick.position.set(-1.78, -0.16 - index * 1.08, 0.72);
    depthGauge.add(tick);
  }
  strataRoot.add(depthGauge);
  cutawayRoot.add(strataRoot);

  const waterLens = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 2.9, 6, segments), freshwaterMaterial);
  waterLens.name = 'FROSTWELL_FRESHWATER_LENS';
  waterLens.rotation.z = Math.PI / 2;
  waterLens.position.set(0, -5.82, 0.04);
  waterLens.scale.z = 0.86;
  cutawayRoot.add(waterLens);
  const freshwaterRipples = new THREE.Group();
  freshwaterRipples.name = 'FROSTWELL_FRESHWATER_RIPPLE_ARRAY';
  for (let index = 0; index < 3; index += 1) {
    const rippleMaterial = proximityMaterial.clone();
    rippleMaterial.opacity = 0.28 - index * 0.055;
    const ripple = new THREE.Mesh(
      new THREE.TorusGeometry(0.52 + index * 0.24, 0.025, 6, segments + 4),
      rippleMaterial,
    );
    ripple.name = `FROSTWELL_FRESHWATER_RIPPLE_${index + 1}`;
    ripple.position.set(0, -5.82 - index * 0.045, 0.7);
    ripple.scale.x = 1.72;
    freshwaterRipples.add(ripple);
  }
  cutawayRoot.add(freshwaterRipples);

  const boreGeometry = new THREE.CylinderGeometry(0.29, 0.34, 5.75, segments, 1, true);
  boreGeometry.translate(0, -5.75 / 2, 0);
  const cutawayBoreMaterial = boreDark.clone();
  cutawayBoreMaterial.transparent = true;
  cutawayBoreMaterial.opacity = 0.34;
  cutawayBoreMaterial.depthWrite = false;
  cutawayBoreMaterial.side = THREE.DoubleSide;
  const cutawayBore = new THREE.Mesh(boreGeometry, cutawayBoreMaterial);
  cutawayBore.name = 'FROSTWELL_VOLUMETRIC_BORE';
  cutawayBore.position.set(0, 0.18, 0.66);
  cutawayBore.scale.y = 0.02;
  cutawayRoot.add(cutawayBore);
  const boreScore = new THREE.Mesh(
    createHelicalAugerGeometry(5.62, 0.345, 13.5, quality),
    boreScoreMaterial,
  );
  boreScore.name = 'FROSTWELL_BORE_SCORE_HELIX';
  boreScore.position.set(0, 0.12, 0.67);
  boreScore.scale.y = 0.02;
  cutawayRoot.add(boreScore);

  const segmentedShaft = new THREE.Group();
  segmentedShaft.name = 'FROSTWELL_SEGMENTED_AUGER_SHAFT';
  segmentedShaft.position.set(0, 0.32, 0.72);
  const shaftSegments: THREE.Mesh[] = [];
  const shaftSegmentLength = 1.03;
  for (let index = 0; index < 6; index += 1) {
    const geometry = new THREE.CylinderGeometry(0.085, 0.085, shaftSegmentLength, 10);
    geometry.translate(0, -shaftSegmentLength / 2, 0);
    const segment = new THREE.Mesh(geometry, steelLight);
    segment.name = `FROSTWELL_AUGER_SHAFT_SEGMENT_${index + 1}`;
    segment.position.y = -index * shaftSegmentLength;
    segment.visible = false;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.025, 6, 12), copper);
    collar.name = `FROSTWELL_AUGER_SHAFT_COLLAR_${index + 1}`;
    collar.rotation.x = Math.PI / 2;
    segment.add(collar);
    segmentedShaft.add(segment);
    shaftSegments.push(segment);
  }
  cutawayRoot.add(segmentedShaft);

  const augerBitRoot = new THREE.Group();
  augerBitRoot.name = 'FROSTWELL_HELICAL_AUGER_BIT';
  augerBitRoot.position.set(0, -0.2, 0.72);
  const augerCoreGeometry = new THREE.CylinderGeometry(0.09, 0.12, 1.08, 10);
  augerCoreGeometry.translate(0, -0.54, 0);
  const augerCore = new THREE.Mesh(augerCoreGeometry, steelLight);
  const helicalFlights = new THREE.Mesh(createHelicalAugerGeometry(1.08, 0.24, 3.2, quality), copper);
  helicalFlights.name = 'FROSTWELL_VOLUMETRIC_HELICAL_FLIGHTS';
  const cuttingCrown = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.34, 10), copper);
  cuttingCrown.name = 'FROSTWELL_AUGER_CUTTING_CROWN';
  cuttingCrown.position.y = -1.18;
  cuttingCrown.rotation.z = Math.PI;
  augerBitRoot.add(augerCore, helicalFlights, cuttingCrown);
  const cutterTaskLight = new THREE.PointLight(
    0xffa85c,
    quality === 'high' ? 1.55 : quality === 'medium' ? 1.1 : 0.72,
    3.4,
    1.8,
  );
  cutterTaskLight.name = 'FROSTWELL_CUTTER_TASK_LIGHT';
  cutterTaskLight.position.set(0.18, -0.9, 1.02);
  augerBitRoot.add(cutterTaskLight);
  cutawayRoot.add(augerBitRoot);

  const iceChipDebris = new THREE.Group();
  iceChipDebris.name = 'FROSTWELL_ICE_CHIP_DEBRIS_SYSTEM';
  const iceChips: THREE.Mesh<THREE.TetrahedronGeometry, THREE.MeshPhysicalMaterial>[] = [];
  const iceChipCount = quality === 'high' ? 16 : quality === 'medium' ? 10 : 6;
  for (let index = 0; index < iceChipCount; index += 1) {
    const chip = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.045 + index % 3 * 0.016, 0),
      iceChipMaterial.clone(),
    );
    chip.name = `FROSTWELL_ICE_CHIP_${index + 1}`;
    chip.userData.phase = index / iceChipCount;
    chip.userData.angle = index / iceChipCount * Math.PI * 2;
    chip.userData.radius = 0.18 + index % 4 * 0.045;
    iceChipDebris.add(chip);
    iceChips.push(chip);
  }
  cutawayRoot.add(iceChipDebris);

  const proximityGlow = new THREE.Mesh(new THREE.CircleGeometry(0.56, segments), proximityMaterial);
  proximityGlow.name = 'FROSTWELL_WATER_PROXIMITY_CUE';
  proximityGlow.position.set(0, -5.52, 0.7);
  cutawayRoot.add(proximityGlow);
  const breakthroughBurst = new THREE.Group();
  breakthroughBurst.name = 'FROSTWELL_BREAKTHROUGH_BURST_SYSTEM';
  const breakthroughDroplets: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  const breakthroughCount = quality === 'high' ? 18 : quality === 'medium' ? 12 : 7;
  for (let index = 0; index < breakthroughCount; index += 1) {
    const droplet = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 + index % 3 * 0.014, 6, 4),
      breakthroughMaterial.clone(),
    );
    droplet.name = `FROSTWELL_BREAKTHROUGH_DROPLET_${index + 1}`;
    droplet.userData.angle = index / breakthroughCount * Math.PI * 2;
    droplet.userData.speed = 0.65 + index % 5 * 0.11;
    breakthroughBurst.add(droplet);
    breakthroughDroplets.push(droplet);
  }
  cutawayRoot.add(breakthroughBurst);
  const freshwaterBounceLight = new THREE.PointLight(
    0x35d9ff,
    quality === 'high' ? 1.7 : quality === 'medium' ? 1.15 : 0.72,
    4.8,
    1.7,
  );
  freshwaterBounceLight.name = 'FROSTWELL_FRESHWATER_BOUNCE_LIGHT';
  freshwaterBounceLight.position.set(0, -5.55, 1.75);
  cutawayRoot.add(freshwaterBounceLight);
  const rigPracticalLight = new THREE.PointLight(
    0xffb36b,
    quality === 'high' ? 1.05 : 0.68,
    4,
    1.8,
  );
  rigPracticalLight.name = 'FROSTWELL_RIG_PRACTICAL_LIGHT';
  rigPracticalLight.position.set(0.48, 1.72, 1.15);
  cutawayRoot.add(rigPracticalLight);
  const sideCameraSocket = new THREE.Object3D();
  sideCameraSocket.name = 'FROSTWELL_CUTAWAY_SIDE_CAMERA_SOCKET';
  // A shallow three-quarter side view keeps the section readable while proving
  // that the layers, shaft, bore, and water lens have real extrusion depth.
  sideCameraSocket.position.set(3.2, -1.45, 15.0);
  cutawayRoot.add(sideCameraSocket);

  // Completed-state industrial section. The fishery itself sits beside the
  // freshwater at the bottom; the surface building is only its lift
  // headhouse. People and wet catch use independent shafts.
  const deepFishery = new THREE.Group();
  deepFishery.name = 'FROSTWELL_DEEP_FISHERY_PROCESSING_HALL';
  deepFishery.visible = false;
  const deepFloor = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.12, 1.02), steel);
  deepFloor.name = 'FROSTWELL_DEEP_FISHERY_FLOOR';
  deepFloor.position.set(0, -5.48, 0.5);
  const deepHallShell = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.72, 0.72), frostMaterials.timberDark);
  deepHallShell.name = 'FROSTWELL_DEEP_FISHERY_HALL_SHELL';
  deepHallShell.position.set(-0.66, -5.04, 0.48);
  const deepHallRoof = new THREE.Mesh(new THREE.ConeGeometry(0.86, 0.38, 4), copper);
  deepHallRoof.name = 'FROSTWELL_DEEP_FISHERY_COPPER_ROOF';
  deepHallRoof.rotation.y = Math.PI / 4;
  deepHallRoof.scale.z = 0.46;
  deepHallRoof.position.set(-0.66, -4.48, 0.48);
  const deepHallWindow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.035), frostMaterials.windowGlow);
  deepHallWindow.name = 'FROSTWELL_DEEP_FISHERY_WARM_WINDOW';
  deepHallWindow.position.set(-0.5, -4.98, 0.855);
  const deepHallDoor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.56, 0.045), steelLight);
  deepHallDoor.name = 'FROSTWELL_DEEP_FISHERY_LIFT_LOBBY_DOOR';
  deepHallDoor.position.set(-1.05, -5.11, 0.86);
  deepFishery.add(deepFloor, deepHallShell, deepHallRoof, deepHallWindow, deepHallDoor);

  const liftTopY = -0.42;
  const liftBottomY = -5.03;
  const createLiftShaft = (name: string, x: number) => {
    const shaft = new THREE.Group();
    shaft.name = name;
    [-0.18, 0.18].forEach((offset) => {
      const rail = tubeBetween(
        new THREE.Vector3(x + offset, liftTopY + 0.3, 0.82),
        new THREE.Vector3(x + offset, liftBottomY - 0.28, 0.82),
        0.035,
        steelLight,
        7,
      );
      rail.name = `${name}_${offset < 0 ? 'LEFT' : 'RIGHT'}_GUIDE_RAIL`;
      shaft.add(rail);
    });
    for (let index = 0; index < 6; index += 1) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.05), copper);
      brace.name = `${name}_BRACE_${index + 1}`;
      brace.position.set(x, liftTopY - index * 0.9, 0.82);
      shaft.add(brace);
    }
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 7, segments), copper);
    wheel.name = `${name}_WINCH_WHEEL`;
    wheel.position.set(x, -0.18, 0.82);
    wheel.rotation.y = Math.PI / 2;
    shaft.add(wheel);
    return { shaft, wheel };
  };
  const peopleShaftRuntime = createLiftShaft('FROSTWELL_PEOPLE_LIFT_SHAFT', -1.42);
  const fishShaftRuntime = createLiftShaft('FROSTWELL_FISH_CARGO_LIFT_SHAFT', 1.42);
  deepFishery.add(peopleShaftRuntime.shaft, fishShaftRuntime.shaft);

  const peopleLiftCage = new THREE.Group();
  peopleLiftCage.name = 'FROSTWELL_PEOPLE_LIFT_CAGE';
  const peopleLiftFloor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), steel);
  const peopleLiftRoof = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.44), copper);
  peopleLiftRoof.position.y = 0.62;
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.58, 5), steelLight);
    upright.position.set(xSide * 0.19, 0.31, zSide * 0.19);
    peopleLiftCage.add(upright);
  }));
  const workerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 4, 7), frostMaterials.indigo);
  workerBody.name = 'FROSTWELL_LIFT_WORKER_BODY';
  workerBody.position.y = 0.23;
  const workerHead = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), frostMaterials.windowGlow);
  workerHead.name = 'FROSTWELL_LIFT_WORKER_HEAD';
  workerHead.position.y = 0.5;
  peopleLiftCage.add(peopleLiftFloor, peopleLiftRoof, workerBody, workerHead);
  peopleLiftCage.position.set(-1.42, liftTopY, 0.82);
  deepFishery.add(peopleLiftCage);

  const fishCargoLiftCage = new THREE.Group();
  fishCargoLiftCage.name = 'FROSTWELL_FISH_CARGO_LIFT_CAGE';
  const cargoFloor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.48), steel);
  const cargoBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.3, 8, 1, true), copper);
  cargoBasket.name = 'FROSTWELL_WET_CATCH_BASKET';
  cargoBasket.position.y = 0.2;
  fishCargoLiftCage.add(cargoFloor, cargoBasket);
  for (let index = 0; index < 3; index += 1) {
    const fish = createFish(fishMaterial);
    fish.name = `FROSTWELL_CARGO_LIFT_FISH_${index + 1}`;
    fish.position.set(-0.1 + index * 0.1, 0.31 + index % 2 * 0.05, 0);
    fish.rotation.y = index * 0.7;
    fishCargoLiftCage.add(fish);
  }
  fishCargoLiftCage.position.set(1.42, liftBottomY, 0.82);
  deepFishery.add(fishCargoLiftCage);

  const fishingWinch = new THREE.Group();
  fishingWinch.name = 'FROSTWELL_UNDERICE_FISHING_WINCH';
  fishingWinch.position.set(0.38, -5.3, 0.82);
  const fishingDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, segments), copper);
  fishingDrum.name = 'FROSTWELL_UNDERICE_FISHING_DRUM';
  fishingDrum.rotation.z = Math.PI / 2;
  fishingWinch.add(fishingDrum);
  const fishingNet = new THREE.Group();
  fishingNet.name = 'FROSTWELL_UNDERICE_FISHING_NET';
  const netCable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 5), rope);
  netCable.position.y = -0.36;
  const netBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.13, 0.34, 10, 1, true), steelLight);
  netBasket.name = 'FROSTWELL_UNDERICE_NET_BASKET';
  netBasket.position.y = -0.8;
  fishingNet.add(netCable, netBasket);
  for (let index = 0; index < 3; index += 1) {
    const fish = createFish(fishMaterial);
    fish.name = `FROSTWELL_NET_CAUGHT_FISH_${index + 1}`;
    fish.position.set(-0.12 + index * 0.12, -0.75 + index % 2 * 0.07, 0);
    fishingNet.add(fish);
  }
  fishingWinch.add(fishingNet);
  deepFishery.add(fishingWinch);

  const underIceFish: THREE.Group[] = [];
  const underIceFishSchool = new THREE.Group();
  underIceFishSchool.name = 'FROSTWELL_UNDERICE_FISH_SCHOOL';
  const underIceFishCount = quality === 'low' ? 4 : 7;
  for (let index = 0; index < underIceFishCount; index += 1) {
    const fish = createFish(fishMaterial);
    fish.name = `FROSTWELL_UNDERICE_FISH_${index + 1}`;
    fish.userData.phase = index / underIceFishCount * Math.PI * 2;
    underIceFishSchool.add(fish);
    underIceFish.push(fish);
  }
  deepFishery.add(underIceFishSchool);
  cutawayRoot.add(deepFishery);
  root.add(cutawayRoot);

  const operating = new THREE.Group();
  operating.name = 'FROSTWELL_OPERATING_FISHERY_AND_RESERVOIR';
  operating.visible = false;
  const fishery = new THREE.Group();
  fishery.name = 'FROSTWELL_SURFACE_LIFT_HEADHOUSE';
  fishery.position.set(0.55, 0.48, -0.62);
  const shed = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.9, 0.94), frostMaterials.timberDark);
  shed.name = 'FROSTWELL_SURFACE_LIFT_HEADHOUSE_SHELL';
  shed.position.y = 0.46;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.97, 0.58, 4), copper);
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
  let cutawayProgress = 0;
  let targetCutawayProgress = 0;
  let transitionFromProgress = 0;
  let transitionStartedAt: number | null = null;
  let hasPresentation = false;
  let breakthroughStartedAt: number | null = null;
  let lastSequence = 0;
  let burstStartedAt: number | null = null;
  let lastElapsed = 0;
  let inspectionActive = false;
  const applyCutawayProgress = (progress: number) => {
    cutawayProgress = THREE.MathUtils.clamp(progress, 0, 1);
    progressLights.forEach((lamp, index) => { lamp.material = index < Math.ceil(progress * progressLights.length) ? signal : steelLight; });
    drillPivot.position.y = -progress * 0.42;
    const bitRootY = 0.1 - progress * 4.88;
    const bitTipY = bitRootY - 1.18;
    augerBitRoot.position.y = bitRootY;
    cutawayBore.scale.y = THREE.MathUtils.clamp(Math.abs(bitTipY) / 5.75, 0.02, 1);
    boreScore.scale.y = cutawayBore.scale.y;
    const visibleShaftDepth = Math.max(0, -bitRootY + 0.28);
    shaftSegments.forEach((segment, index) => {
      const segmentStart = index * shaftSegmentLength;
      const segmentProgress = THREE.MathUtils.clamp(
        (visibleShaftDepth - segmentStart) / shaftSegmentLength,
        0,
        1,
      );
      segment.visible = segmentProgress > 0.001;
      segment.scale.y = Math.max(0.001, segmentProgress);
    });
    const waterApproach = THREE.MathUtils.smoothstep(progress, 0.68, 1);
    proximityMaterial.opacity = waterApproach * 0.68;
    freshwaterMaterial.emissiveIntensity = 0.94 + waterApproach * 0.76;
    freshwaterRipples.children.forEach((ripple, index) => {
      const material = (ripple as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = waterApproach * (0.32 - index * 0.055);
    });
    strataLayers.forEach((layer, index) => {
      layer.material.opacity = 0.8 + index * 0.025 + waterApproach * (index === strataLayers.length - 1 ? 0.06 : 0);
    });
  };
  const setPresentation = (next: FrostwellIceworksPresentation) => {
    const normalizedMeters = Math.max(0, Math.min(FROSTWELL_DEPTH_METERS, Math.floor(next.metersDrilled)));
    const progress = normalizedMeters / FROSTWELL_DEPTH_METERS;
    const previousTargetProgress = targetCutawayProgress;
    const justCommissioned = next.built && !presentation.built && progress >= 1 && previousTargetProgress < 1;
    targetCutawayProgress = progress;
    presentation = { ...next, metersDrilled: normalizedMeters };
    operating.visible = next.built;
    deepFishery.visible = next.built;
    cutawayRoot.visible = next.built
      ? inspectionActive
      : progress > 0 || next.cutawayPreview === true;
    if (justCommissioned) {
      transitionFromProgress = cutawayProgress;
      transitionStartedAt = lastElapsed;
      breakthroughStartedAt = lastElapsed + 1.8;
    } else if (!hasPresentation || next.built || progress <= previousTargetProgress) {
      transitionStartedAt = null;
      applyCutawayProgress(progress);
    } else {
      transitionFromProgress = cutawayProgress;
      transitionStartedAt = lastElapsed;
      if (progress >= 1 && previousTargetProgress < 1) breakthroughStartedAt = lastElapsed + 1.8;
    }
    hasPresentation = true;
    if (next.constructionSequence > lastSequence) burstStartedAt = lastElapsed;
    lastSequence = next.constructionSequence;
  };

  return {
    root,
    hitTarget,
    setPresentation,
    setInspectionActive: (active) => {
      inspectionActive = active;
      cutawayRoot.visible = presentation.built
        ? active
        : targetCutawayProgress > 0 || presentation.cutawayPreview === true;
    },
    getCutawayCameraPose: () => {
      // The getter is queried only by the explicit Frostwell inspection
      // preset. Reveal the completed lower fishery before returning its pose;
      // the world runtime hides it again when inspection closes.
      if (presentation.built) cutawayRoot.visible = true;
      if (!cutawayRoot.visible) return null;
      root.updateMatrixWorld(true);
      const reviewPosition = presentation.cutawayEvidenceView === 'left'
        ? new THREE.Vector3(-4.6, -1.2, 14.4)
        : presentation.cutawayEvidenceView === 'right'
          ? new THREE.Vector3(5, -1.35, 14.4)
          : presentation.cutawayEvidenceView === 'rear'
            ? new THREE.Vector3(-2.4, -1, -14.2)
            : null;
      return {
        position: reviewPosition
          ? cutawayRoot.localToWorld(reviewPosition)
          : sideCameraSocket.getWorldPosition(new THREE.Vector3()),
        target: cutawayRoot.localToWorld(new THREE.Vector3(0, -1.45, 0.12)),
      };
    },
    animate: (elapsed) => {
      lastElapsed = elapsed;
      const cutawayPreviewClock = Number.isFinite(presentation.cutawayPreviewTimeSeconds)
        ? presentation.cutawayPreviewTimeSeconds!
        : presentation.cutawayPreviewLoop
          ? elapsed
          : null;
      const cutawayPreviewCycle = cutawayPreviewClock === null
        ? null
        : ((cutawayPreviewClock % 5.2) + 5.2) % 5.2;
      const motionElapsed = cutawayPreviewClock ?? elapsed;
      if (cutawayPreviewCycle !== null) {
        const descentT = THREE.MathUtils.clamp((cutawayPreviewCycle - 0.8) / 1.8, 0, 1);
        const easedDescentT = descentT * descentT * (3 - 2 * descentT);
        applyCutawayProgress(THREE.MathUtils.lerp(0.9, 1, easedDescentT));
      } else if (transitionStartedAt !== null) {
        const transitionT = THREE.MathUtils.clamp((elapsed - transitionStartedAt) / 1.8, 0, 1);
        const easedT = transitionT * transitionT * (3 - 2 * transitionT);
        applyCutawayProgress(THREE.MathUtils.lerp(transitionFromProgress, targetCutawayProgress, easedT));
        if (transitionT >= 1) transitionStartedAt = null;
      }
      const drilling = transitionStartedAt !== null || (!presentation.built && (cutawayPreviewCycle !== null
        ? cutawayPreviewCycle < 2.6
        : targetCutawayProgress > 0.001
          && (targetCutawayProgress < 1 || cutawayProgress < targetCutawayProgress - 0.001)));
      if (drilling) {
        drillPivot.rotation.y = motionElapsed * 3.6;
        drillPivot.position.y = -cutawayProgress * 0.42 + Math.sin(motionElapsed * 8) * 0.0018;
        winch.rotation.x = motionElapsed * 1.8;
        segmentedShaft.rotation.y = motionElapsed * 3.6;
        augerBitRoot.rotation.y = motionElapsed * 5.2;
        cutawayBore.material.emissiveIntensity = 0.42 + Math.sin(motionElapsed * 3.4) * 0.08;
        cutterTaskLight.intensity = (quality === 'high' ? 1.55 : quality === 'medium' ? 1.1 : 0.72)
          * (0.9 + Math.sin(motionElapsed * 7.2) * 0.1);
        proximityMaterial.opacity = THREE.MathUtils.smoothstep(cutawayProgress, 0.68, 1)
          * (0.58 + Math.sin(motionElapsed * 2.1) * 0.1);
        freshwaterRipples.children.forEach((ripple, index) => {
          const pulse = 0.96 + Math.sin(motionElapsed * 1.7 + index * 0.85) * 0.055;
          ripple.scale.set(1.72 * pulse, pulse, pulse);
        });
        iceChips.forEach((chip, index) => {
          const cycle = (motionElapsed * (0.72 + index % 3 * 0.08) + chip.userData.phase) % 1;
          const radius = chip.userData.radius * (0.55 + cycle);
          chip.position.set(
            Math.cos(chip.userData.angle + motionElapsed * 1.8) * radius,
            augerBitRoot.position.y - 1.08 + cycle * 0.46,
            0.72 + Math.sin(chip.userData.angle + motionElapsed * 1.4) * radius,
          );
          chip.rotation.set(motionElapsed * 2.1 + index, motionElapsed * 2.8 - index, motionElapsed * 1.7);
          chip.material.opacity = Math.sin(cycle * Math.PI) * 0.72;
        });
      } else if (!presentation.built) {
        cutterTaskLight.intensity = quality === 'high' ? 0.72 : 0.44;
        progressLights.forEach((lamp, index) => { lamp.scale.setScalar(0.84 + Math.sin(elapsed * 4 + index * 0.3) * 0.16); });
        iceChips.forEach((chip) => { chip.material.opacity = 0; });
      }
      const previewBreakthroughT = cutawayPreviewCycle === null
        ? null
        : THREE.MathUtils.clamp((cutawayPreviewCycle - 2.6) / 1.25, 0, 1);
      if (previewBreakthroughT !== null || breakthroughStartedAt !== null) {
        const breakthroughT = previewBreakthroughT
          ?? THREE.MathUtils.clamp((elapsed - (breakthroughStartedAt ?? elapsed)) / 1.25, 0, 1);
        if (previewBreakthroughT !== null ? cutawayPreviewCycle! >= 2.6 : elapsed >= (breakthroughStartedAt ?? elapsed)) {
          breakthroughDroplets.forEach((droplet, index) => {
            const angle = droplet.userData.angle;
            const radial = breakthroughT * droplet.userData.speed;
            droplet.position.set(
              Math.cos(angle) * radial,
              -5.72 + Math.sin(breakthroughT * Math.PI) * (0.35 + index % 4 * 0.08),
              0.72 + Math.sin(angle) * radial * 0.48,
            );
            droplet.scale.setScalar(0.7 + breakthroughT * 0.8);
            droplet.material.opacity = Math.sin(breakthroughT * Math.PI) * 0.86;
          });
        }
        if (previewBreakthroughT === null && breakthroughT >= 1) breakthroughStartedAt = null;
      } else {
        breakthroughDroplets.forEach((droplet) => { droplet.material.opacity = 0; });
      }
      if (presentation.built) {
        const operationElapsed = motionElapsed;
        winch.rotation.x = operationElapsed * 1.2;
        carriers.forEach((carrier, index) => {
          const t = (operationElapsed * 0.16 + index / carriers.length) % 1;
          if (t < 0.5) carrier.position.set(0, 1.55 - t * 3.4, 0);
          else carrier.position.set((t - 0.5) * 1.55, -0.15 + (t - 0.5) * 3.4, -0.08 * (t - 0.5));
          carrier.rotation.y = Math.sin(operationElapsed * 1.2 + index) * 0.08;
        });
        flowSlugs.forEach((slug, index) => {
          const rawT = (Number.isFinite(operationElapsed) ? operationElapsed : 0) * 0.23 + index / flowSlugs.length;
          const t = Math.min(0.999999, ((rawT % 1) + 1) % 1);
          // Parameter-space sampling is deliberate here. Arc-length sampling
          // can race its lazy cache during hot reloads while the scene is
          // already animating on iOS/WebGL; this path only needs a stable
          // visible pulse, not physically uniform flow speed.
          slug.position.copy(waterCurve.getPoint(t));
          slug.scale.setScalar(0.72 + Math.sin(operationElapsed * 3 + index) * 0.14);
        });
        tankWater.scale.y = 0.9 + Math.sin(operationElapsed * 0.8) * 0.08;
        tankGauge.scale.y = 0.88 + Math.sin(operationElapsed * 0.8) * 0.08;
        conveyorWheel.rotation.x = operationElapsed * 1.4;
        const liftCycle = 0.5 - Math.cos(operationElapsed * 0.72) * 0.5;
        const easedLiftCycle = liftCycle * liftCycle * (3 - 2 * liftCycle);
        peopleLiftCage.position.y = THREE.MathUtils.lerp(liftTopY, liftBottomY, easedLiftCycle);
        fishCargoLiftCage.position.y = THREE.MathUtils.lerp(liftBottomY, liftTopY, easedLiftCycle);
        peopleShaftRuntime.wheel.rotation.x = operationElapsed * 1.35;
        fishShaftRuntime.wheel.rotation.x = -operationElapsed * 1.35;
        fishingDrum.rotation.x = operationElapsed * 1.8;
        fishingNet.position.y = Math.sin(operationElapsed * 0.84) * 0.2;
        fishingNet.rotation.z = Math.sin(operationElapsed * 0.63) * 0.08;
        underIceFish.forEach((fish, index) => {
          const phase = fish.userData.phase + operationElapsed * (0.34 + index % 3 * 0.025);
          fish.position.set(
            Math.cos(phase) * (0.58 + index % 3 * 0.12),
            -5.82 + Math.sin(phase * 1.7) * 0.13,
            0.72 + Math.sin(phase) * 0.2,
          );
          fish.rotation.y = -phase + Math.PI / 2;
        });
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
