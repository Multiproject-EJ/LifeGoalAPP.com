import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  RobotFamilyMetrics,
  RobotFamilyModel,
  RobotEmotion,
  RobotMotion,
  RobotPartManifest,
  RobotQuality,
  RobotRole,
} from './RobotFamilyThreeModel';

export const CONSTRUCTION_PHASES = [
  'arrive',
  'survey',
  'foundation',
  'frame',
  'assemble',
  'finish',
  'reveal',
] as const;

export type ConstructionPhase = (typeof CONSTRUCTION_PHASES)[number];
export type ConstructionToolId =
  | 'hammer'
  | 'wrench'
  | 'drill'
  | 'welder'
  | 'circular-saw'
  | 'paint-sprayer'
  | 'screwdriver'
  | 'measuring-laser'
  | 'clamp'
  | 'cable-reel';
export type ConstructionMaterialId =
  | 'beam-stack'
  | 'panel-stack'
  | 'timber-stack'
  | 'pipe-bundle'
  | 'cable-coil'
  | 'bolt-crate'
  | 'island-blocks';

export interface ConstructionChoreography {
  /** Stable authored identity for QA telemetry and island-specific motion. */
  styleId: string;
  /** Rotates the six legal stations so landmark families do not share a path. */
  stationOffset: number;
  /** Seconds per one-robot relocation baton. */
  relocationSeconds?: number;
  /** Optional phase-specific route rotation for landmark-shaped work stories. */
  phaseStationOffsets?: Partial<Record<ConstructionPhase, number>>;
  /** Lets a landmark's crew circle clockwise or counter-clockwise. */
  stationStep?: -1 | 1;
  phaseTools?: Partial<Record<ConstructionPhase, Partial<Record<RobotRole, ConstructionToolId>>>>;
  phaseMaterials?: Partial<Record<ConstructionPhase, readonly ConstructionMaterialId[]>>;
}

export const CONSTRUCTION_COMPONENT_IDS = [
  'construction-theatre-root', 'construction-tool-library', 'construction-material-library',
  'construction-tool-hammer', 'construction-tool-wrench', 'construction-tool-drill',
  'construction-tool-welder', 'construction-tool-circular-saw', 'construction-tool-paint-sprayer',
  'construction-tool-screwdriver', 'construction-tool-measuring-laser', 'construction-tool-clamp',
  'construction-tool-cable-reel', 'construction-material-beam-stack', 'construction-material-panel-stack',
  'construction-material-timber-stack', 'construction-material-pipe-bundle', 'construction-material-cable-coil',
  'construction-material-bolt-crate', 'construction-material-island-blocks',
  'construction-workpiece-heavy-beam', 'construction-workpiece-manager-blueprint',
  'construction-workpiece-mini-panel',
  'construction-fx-dust-cloud-system', 'construction-fx-ground-dust-system', 'construction-fx-spark-system',
  'construction-fx-tool-trail-system', 'construction-fx-delivery-orbit-system',
] as const;

export interface ConstructionPresentation {
  active: boolean;
  working?: boolean;
  phase?: ConstructionPhase;
  progress: number;
  sequence?: number;
  cloudCover?: number;
  choreography?: ConstructionChoreography;
}

export interface ConstructionTheatreMetrics extends RobotFamilyMetrics {
  visibleDrawCalls: number;
  visibleTriangles: number;
}

export interface RobotConstructionTheatre {
  root: THREE.Group;
  tools: Record<ConstructionToolId, THREE.Group>;
  materials: Record<ConstructionMaterialId, THREE.Group>;
  metrics: ConstructionTheatreMetrics;
  partManifest: RobotPartManifest;
  presentation: ConstructionPresentation & { phase: ConstructionPhase; sequence: number };
  setTargetEnvelope: (radius: number, height: number) => void;
  setCrewScale: (scale: number) => void;
  setPresentation: (presentation: ConstructionPresentation) => void;
  update: (elapsedSeconds: number, deltaSeconds: number, reducedMotion?: boolean) => void;
  dispose: () => void;
}

export const CONSTRUCTION_TOOLS: ReadonlyArray<{ id: ConstructionToolId; label: string }> = [
  { id: 'hammer', label: 'Impact hammer' },
  { id: 'wrench', label: 'Torque wrench' },
  { id: 'drill', label: 'Power drill' },
  { id: 'welder', label: 'Arc welder' },
  { id: 'circular-saw', label: 'Circular saw' },
  { id: 'paint-sprayer', label: 'Paint sprayer' },
  { id: 'screwdriver', label: 'Precision driver' },
  { id: 'measuring-laser', label: 'Measuring laser' },
  { id: 'clamp', label: 'Assembly clamp' },
  { id: 'cable-reel', label: 'Cable reel' },
];

export const CONSTRUCTION_MATERIALS: ReadonlyArray<{ id: ConstructionMaterialId; label: string }> = [
  { id: 'beam-stack', label: 'Structural beams' },
  { id: 'panel-stack', label: 'Shell panels' },
  { id: 'timber-stack', label: 'Timber pack' },
  { id: 'pipe-bundle', label: 'Pipe bundle' },
  { id: 'cable-coil', label: 'Cable coil' },
  { id: 'bolt-crate', label: 'Fastener crate' },
  { id: 'island-blocks', label: 'Island blocks' },
];

const PHASE_CONFIG: Record<ConstructionPhase, {
  tools: ConstructionToolId[];
  materials: ConstructionMaterialId[];
  cloud: number;
  buildingStage: number;
  motions: Record<RobotRole, RobotMotion>;
}> = {
  arrive: {
    tools: ['cable-reel', 'measuring-laser'], materials: ['beam-stack', 'island-blocks'], cloud: 0.08, buildingStage: 0,
    motions: { 'heavy-worker': 'carry', 'project-manager': 'listen', 'mini-artist': 'carry' },
  },
  survey: {
    tools: ['measuring-laser', 'clamp'], materials: ['beam-stack', 'island-blocks'], cloud: 0.18, buildingStage: 0,
    motions: { 'heavy-worker': 'inspect', 'project-manager': 'direct', 'mini-artist': 'inspect' },
  },
  foundation: {
    tools: ['hammer', 'drill', 'clamp'], materials: ['beam-stack', 'island-blocks', 'bolt-crate'], cloud: 0.56, buildingStage: 1,
    motions: { 'heavy-worker': 'lift', 'project-manager': 'direct', 'mini-artist': 'work' },
  },
  frame: {
    tools: ['welder', 'wrench', 'clamp'], materials: ['beam-stack', 'panel-stack', 'pipe-bundle'], cloud: 0.68, buildingStage: 2,
    motions: { 'heavy-worker': 'lift', 'project-manager': 'inspect', 'mini-artist': 'work' },
  },
  assemble: {
    tools: ['drill', 'screwdriver', 'circular-saw', 'cable-reel'], materials: ['panel-stack', 'timber-stack', 'cable-coil'], cloud: 0.72, buildingStage: 3,
    motions: { 'heavy-worker': 'work', 'project-manager': 'direct', 'mini-artist': 'work' },
  },
  finish: {
    tools: ['paint-sprayer', 'screwdriver', 'measuring-laser'], materials: ['panel-stack', 'bolt-crate'], cloud: 0.46, buildingStage: 4,
    motions: { 'heavy-worker': 'inspect', 'project-manager': 'inspect', 'mini-artist': 'paint' },
  },
  reveal: {
    tools: [], materials: [], cloud: 0.06, buildingStage: 5,
    motions: { 'heavy-worker': 'celebrate', 'project-manager': 'celebrate', 'mini-artist': 'celebrate' },
  },
};

interface ConstructionWorkStation {
  /** Normalized against the real landmark radius/height. Local +Z faces the camera. */
  position: readonly [number, number, number];
  /** Physical point on the landmark that this station is working toward. */
  contact: readonly [number, number, number];
}

const ROLE_WORK_RIG: Record<RobotRole, {
  stations: readonly ConstructionWorkStation[];
  relocationOffset: number;
  presenceScale: number;
}> = {
  'heavy-worker': {
    stations: [
      { position: [-1.08, 0.3, 0.58], contact: [-0.44, 0.2, 0.24] },
      { position: [-1.02, 0.62, 0.18], contact: [-0.42, 0.52, 0.08] },
      { position: [-0.82, 0.92, -0.32], contact: [-0.34, 0.76, -0.12] },
      { position: [0.08, 1.04, -0.72], contact: [0.02, 0.84, -0.3] },
      { position: [0.94, 0.54, -0.28], contact: [0.4, 0.44, -0.1] },
      { position: [-0.86, 0.46, 0.48], contact: [-0.34, 0.38, 0.2] },
    ],
    relocationOffset: 0.08,
    presenceScale: 0.84,
  },
  'project-manager': {
    stations: [
      { position: [0.98, 0.84, 0.48], contact: [0.36, 0.54, 0.2] },
      { position: [0.18, 1.2, -0.4], contact: [0.04, 0.82, -0.16] },
      { position: [-0.82, 0.94, -0.18], contact: [-0.3, 0.68, -0.08] },
      { position: [-0.16, 0.56, 0.72], contact: [-0.06, 0.42, 0.3] },
      { position: [0.88, 0.7, -0.46], contact: [0.34, 0.58, -0.18] },
      { position: [0.74, 1.06, 0.08], contact: [0.28, 0.76, 0.04] },
    ],
    relocationOffset: 0.41,
    presenceScale: 0.86,
  },
  'mini-artist': {
    stations: [
      { position: [1.14, 0.42, 0.62], contact: [0.46, 0.3, 0.26] },
      { position: [1.02, 0.82, 0.38], contact: [0.42, 0.66, 0.16] },
      { position: [0.74, 1.14, -0.14], contact: [0.3, 0.86, -0.06] },
      { position: [-0.32, 1.22, -0.48], contact: [-0.12, 0.9, -0.2] },
      { position: [-1.02, 0.7, 0.08], contact: [-0.42, 0.56, 0.04] },
      { position: [0.18, 0.58, 0.72], contact: [0.08, 0.46, 0.3] },
    ],
    relocationOffset: 0.72,
    presenceScale: 0.92,
  },
};

const PHASE_PRIMARY_STATION: Record<ConstructionPhase, Record<RobotRole, number>> = {
  arrive: { 'heavy-worker': 0, 'project-manager': 0, 'mini-artist': 0 },
  survey: { 'heavy-worker': 2, 'project-manager': 0, 'mini-artist': 2 },
  foundation: { 'heavy-worker': 0, 'project-manager': 2, 'mini-artist': 0 },
  frame: { 'heavy-worker': 1, 'project-manager': 1, 'mini-artist': 1 },
  assemble: { 'heavy-worker': 2, 'project-manager': 0, 'mini-artist': 1 },
  finish: { 'heavy-worker': 2, 'project-manager': 1, 'mini-artist': 2 },
  reveal: { 'heavy-worker': 0, 'project-manager': 0, 'mini-artist': 0 },
};

const PHASE_ROLE_TOOLS: Record<ConstructionPhase, Partial<Record<RobotRole, ConstructionToolId>>> = {
  arrive: { 'heavy-worker': 'cable-reel', 'project-manager': 'measuring-laser' },
  survey: { 'heavy-worker': 'clamp', 'project-manager': 'measuring-laser' },
  foundation: { 'heavy-worker': 'hammer', 'project-manager': 'clamp', 'mini-artist': 'drill' },
  frame: { 'heavy-worker': 'wrench', 'project-manager': 'clamp', 'mini-artist': 'welder' },
  assemble: { 'heavy-worker': 'circular-saw', 'project-manager': 'cable-reel', 'mini-artist': 'screwdriver' },
  finish: { 'heavy-worker': 'measuring-laser', 'project-manager': 'screwdriver', 'mini-artist': 'paint-sprayer' },
  reveal: {},
};

const ROLE_ORDER: readonly RobotRole[] = ['heavy-worker', 'project-manager', 'mini-artist'];
const RELOCATION_SLOT_SECONDS = 1.72;
const REST_EXPRESSION_SECONDS = 15;
const REST_EMOTIONS: readonly RobotEmotion[] = ['friendly', 'curious', 'focused', 'delighted', 'concerned'];

interface ConstructionOccupancyProfile {
  /** Horizontal body radius as a fraction of the active landmark radius. */
  radius: number;
  /** Vertical half-height as a fraction of the active landmark height. */
  halfHeight: number;
  fallbackAngle: number;
}

/**
 * Conservative presentation colliders for the three very different robot
 * silhouettes. They keep bodies outside the landmark shell while tools and
 * hands are still free to reach the authored contact points.
 */
const ROLE_OCCUPANCY_PROFILE: Record<RobotRole, ConstructionOccupancyProfile> = {
  'heavy-worker': { radius: 0.2, halfHeight: 0.15, fallbackAngle: -2.35 },
  'project-manager': { radius: 0.16, halfHeight: 0.13, fallbackAngle: 1.5 },
  'mini-artist': { radius: 0.1, halfHeight: 0.09, fallbackAngle: 0.28 },
};

interface ToolWorkProfile {
  /** Local point seated inside the robot hand. */
  grip: readonly [number, number, number];
  /** Local point that creates contact, sparks, paint, or the measuring beam. */
  tip: readonly [number, number, number];
  sweep: number;
}

const TOOL_WORK_PROFILES: Record<ConstructionToolId, ToolWorkProfile> = {
  hammer: { grip: [0, -0.18, 0], tip: [0, 0.42, 0], sweep: 0.15 },
  wrench: { grip: [0, -0.18, 0], tip: [0, 0.46, 0], sweep: 0.08 },
  drill: { grip: [0, -0.18, 0], tip: [0.7, 0.23, 0], sweep: 0.035 },
  welder: { grip: [0, -0.18, 0], tip: [0, 0.76, 0], sweep: 0.045 },
  'circular-saw': { grip: [0, -0.18, 0], tip: [0, 0.5, 0], sweep: 0.075 },
  'paint-sprayer': { grip: [0, -0.18, 0], tip: [0.56, 0.24, 0], sweep: 0.06 },
  screwdriver: { grip: [0, -0.18, 0], tip: [0, 0.74, 0], sweep: 0.04 },
  'measuring-laser': { grip: [0, -0.18, 0], tip: [0.42, 0.2, 0], sweep: 0.025 },
  clamp: { grip: [0, -0.18, 0], tip: [0, 0.48, 0], sweep: 0.035 },
  'cable-reel': { grip: [0, -0.18, 0], tip: [0, 0.44, 0], sweep: 0.03 },
};

const TOOL_CONTACT_VIBRATION: Partial<Record<ConstructionToolId, { frequency: number; amplitude: number }>> = {
  hammer: { frequency: 9, amplitude: 0.014 },
  drill: { frequency: 16, amplitude: 0.006 },
  welder: { frequency: 12, amplitude: 0.003 },
  'circular-saw': { frequency: 14, amplitude: 0.009 },
  screwdriver: { frequency: 8, amplitude: 0.0035 },
};

function dampAngle(current: number, target: number, response: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * response;
}

const TOOL_GOLD = 0xd69224;
const TOOL_DARK = 0x26323c;
const TOOL_WHITE = 0xdfe9ec;
const TOOL_CYAN = 0x62e7ff;

interface ColoredPart {
  geometry: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
}

function mergeParts(parts: ColoredPart[]): THREE.BufferGeometry {
  const prepared = parts.map(({ geometry, color, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
    geometry.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    ));
    const vertexColor = new THREE.Color(color);
    const colors = new Float32Array((geometry.getAttribute('position')?.count ?? 0) * 3);
    for (let index = 0; index < colors.length; index += 3) {
      colors[index] = vertexColor.r;
      colors[index + 1] = vertexColor.g;
      colors[index + 2] = vertexColor.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  });
  const merged = mergeGeometries(prepared, false);
  if (!merged) throw new Error('Could not merge construction theatre geometry');
  return merged;
}

function makeToolGeometry(id: ConstructionToolId, quality: RobotQuality): THREE.BufferGeometry {
  const radial = quality === 'high' ? 16 : 8;
  const handle = () => new THREE.CylinderGeometry(0.07, 0.08, 0.72, radial);
  const parts: ColoredPart[] = [{ geometry: handle(), color: TOOL_DARK, position: [0, -0.18, 0] }];
  switch (id) {
    case 'hammer':
      parts.push({ geometry: new THREE.BoxGeometry(0.58, 0.22, 0.22), color: TOOL_WHITE, position: [0, 0.3, 0] });
      break;
    case 'wrench':
      parts.push({ geometry: new THREE.TorusGeometry(0.2, 0.065, 6, radial), color: TOOL_GOLD, position: [0, 0.32, 0], rotation: [Math.PI / 2, 0, 0] });
      break;
    case 'drill':
      parts.push({ geometry: new THREE.BoxGeometry(0.42, 0.3, 0.28), color: TOOL_WHITE, position: [0.12, 0.23, 0] });
      parts.push({ geometry: new THREE.ConeGeometry(0.07, 0.42, radial), color: TOOL_CYAN, position: [0.48, 0.23, 0], rotation: [0, 0, -Math.PI / 2] });
      break;
    case 'welder':
      parts.push({ geometry: new THREE.CylinderGeometry(0.13, 0.17, 0.34, radial), color: TOOL_GOLD, position: [0, 0.28, 0] });
      parts.push({ geometry: new THREE.ConeGeometry(0.05, 0.34, radial), color: TOOL_CYAN, position: [0, 0.58, 0] });
      break;
    case 'circular-saw':
      parts.push({ geometry: new THREE.CylinderGeometry(0.31, 0.31, 0.08, radial), color: TOOL_WHITE, position: [0, 0.24, 0], rotation: [Math.PI / 2, 0, 0] });
      parts.push({ geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.12, radial), color: TOOL_GOLD, position: [0, 0.24, 0], rotation: [Math.PI / 2, 0, 0] });
      break;
    case 'paint-sprayer':
      parts.push({ geometry: new THREE.SphereGeometry(0.2, radial, radial / 2), color: TOOL_WHITE, position: [0, 0.2, 0] });
      parts.push({ geometry: new THREE.CylinderGeometry(0.045, 0.08, 0.48, radial), color: TOOL_CYAN, position: [0.28, 0.24, 0], rotation: [0, 0, -Math.PI / 2] });
      break;
    case 'screwdriver':
      parts.push({ geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.55, radial), color: TOOL_GOLD, position: [0, 0.44, 0] });
      break;
    case 'measuring-laser':
      parts.push({ geometry: new THREE.BoxGeometry(0.36, 0.28, 0.24), color: TOOL_WHITE, position: [0, 0.2, 0] });
      parts.push({ geometry: new THREE.CylinderGeometry(0.055, 0.055, 0.22, radial), color: TOOL_CYAN, position: [0.28, 0.2, 0], rotation: [0, 0, -Math.PI / 2] });
      break;
    case 'clamp':
      parts.push({ geometry: new THREE.TorusGeometry(0.25, 0.07, 6, radial, Math.PI * 1.35), color: TOOL_GOLD, position: [0, 0.2, 0], rotation: [Math.PI / 2, 0, 0] });
      break;
    case 'cable-reel':
      parts.push({ geometry: new THREE.CylinderGeometry(0.28, 0.28, 0.28, radial), color: TOOL_GOLD, position: [0, 0.18, 0], rotation: [Math.PI / 2, 0, 0] });
      parts.push({ geometry: new THREE.TorusGeometry(0.19, 0.055, 6, radial), color: TOOL_CYAN, position: [0, 0.18, 0.16] });
      break;
  }
  return mergeParts(parts);
}

function createTool(id: ConstructionToolId, quality: RobotQuality, material: THREE.Material): THREE.Group {
  const root = new THREE.Group();
  root.name = `construction-tool-${id}`;
  root.userData.constructionPart = { id, kind: 'tool' };
  const mesh = new THREE.Mesh(makeToolGeometry(id, quality), material);
  mesh.name = `${root.name}-mesh`;
  mesh.castShadow = true;
  mesh.userData.constructionPart = root.userData.constructionPart;
  root.add(mesh);
  return root;
}

function materialGeometry(id: ConstructionMaterialId, quality: RobotQuality): THREE.BufferGeometry {
  const radial = quality === 'high' ? 14 : 7;
  if (id === 'pipe-bundle') return new THREE.CylinderGeometry(0.08, 0.08, 1.15, radial);
  if (id === 'cable-coil') return new THREE.TorusGeometry(0.28, 0.07, 6, radial);
  if (id === 'island-blocks') return new THREE.DodecahedronGeometry(0.22, quality === 'high' ? 1 : 0);
  if (id === 'bolt-crate') return new THREE.BoxGeometry(0.46, 0.34, 0.42);
  return new THREE.BoxGeometry(id === 'beam-stack' ? 0.18 : 0.64, id === 'beam-stack' ? 1.25 : 0.12, id === 'timber-stack' ? 0.16 : 0.42);
}

function createMaterialStack(id: ConstructionMaterialId, quality: RobotQuality, material: THREE.Material): THREE.Group {
  const root = new THREE.Group();
  root.name = `construction-material-${id}`;
  root.userData.constructionPart = { id, kind: 'material' };
  const geometry = materialGeometry(id, quality);
  const count = quality === 'high' ? 5 : 3;
  const instances = new THREE.InstancedMesh(geometry, material, count);
  instances.name = `${root.name}-instances`;
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const row = index % 3;
    const layer = Math.floor(index / 3);
    matrix.compose(
      new THREE.Vector3((row - 1) * 0.22, layer * 0.25, 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(id === 'pipe-bundle' || id === 'beam-stack' ? 0 : Math.PI / 2, 0, id === 'beam-stack' ? Math.PI / 2 : 0)),
      new THREE.Vector3(1, 1, 1),
    );
    instances.setMatrixAt(index, matrix);
  }
  instances.castShadow = true;
  instances.userData.constructionPart = root.userData.constructionPart;
  root.add(instances);
  return root;
}

function trianglesFor(object: THREE.Object3D, visibleOnly = false): number {
  let triangles = 0;
  object.traverse((entry) => {
    if (!(entry instanceof THREE.Mesh)) return;
    if (visibleOnly) {
      for (let ancestor: THREE.Object3D | null = entry; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
    }
    const count = entry.geometry.index ? entry.geometry.index.count / 3 : (entry.geometry.getAttribute('position')?.count ?? 0) / 3;
    triangles += count * (entry instanceof THREE.InstancedMesh ? entry.count : 1);
  });
  return Math.round(triangles);
}

function visibleDrawCalls(root: THREE.Object3D): number {
  let calls = 0;
  root.traverse((entry) => {
    if (!(entry instanceof THREE.Mesh || entry instanceof THREE.Points || entry instanceof THREE.LineSegments)) return;
    for (let ancestor: THREE.Object3D | null = entry; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
    calls += 1;
  });
  return calls;
}

function derivePhase(progress: number): ConstructionPhase {
  const index = Math.min(CONSTRUCTION_PHASES.length - 1, Math.floor(THREE.MathUtils.clamp(progress, 0, 0.9999) * CONSTRUCTION_PHASES.length));
  return CONSTRUCTION_PHASES[index];
}

export function createRobotConstructionTheatre(options: {
  family: RobotFamilyModel;
  quality?: RobotQuality;
  showBuildingEnvelope?: boolean;
}): RobotConstructionTheatre {
  const quality = options.quality ?? 'high';
  const family = options.family;
  const root = new THREE.Group();
  root.name = 'construction-theatre-root';

  const toolMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.72 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xdde7e8, roughness: 0.38, metalness: 0.12, clearcoat: 0.42 });
  const gold = new THREE.MeshStandardMaterial({ color: TOOL_GOLD, roughness: 0.28, metalness: 0.76 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x9a6238, roughness: 0.68, metalness: 0 });
  const cyan = new THREE.MeshStandardMaterial({ color: TOOL_CYAN, emissive: 0x0a8eb5, emissiveIntensity: 1.6, toneMapped: false });
  const materialsById: Record<ConstructionMaterialId, THREE.Material> = {
    'beam-stack': gold, 'panel-stack': white, 'timber-stack': timber, 'pipe-bundle': gold,
    'cable-coil': cyan, 'bolt-crate': white, 'island-blocks': white,
  };

  const toolLibrary = new THREE.Group();
  toolLibrary.name = 'construction-tool-library';
  const tools = {} as Record<ConstructionToolId, THREE.Group>;
  CONSTRUCTION_TOOLS.forEach(({ id }) => {
    tools[id] = createTool(id, quality, toolMaterial);
    toolLibrary.add(tools[id]);
  });
  root.add(toolLibrary);

  const materialLibrary = new THREE.Group();
  materialLibrary.name = 'construction-material-library';
  const materialStacks = {} as Record<ConstructionMaterialId, THREE.Group>;
  CONSTRUCTION_MATERIALS.forEach(({ id }) => {
    materialStacks[id] = createMaterialStack(id, quality, materialsById[id]);
    materialLibrary.add(materialStacks[id]);
  });
  root.add(materialLibrary);

  // These are the pieces the crew physically transports. They are separate
  // from the staging stacks so pickup/carry/install reads as a real action.
  const workpieceLibrary = new THREE.Group();
  workpieceLibrary.name = 'construction-workpiece-library';
  const createWorkpiece = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const workpiece = new THREE.Group();
    workpiece.name = name;
    workpiece.userData.constructionPart = { id: name, kind: 'workpiece' };
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${name}-mesh`;
    mesh.castShadow = true;
    mesh.userData.constructionPart = workpiece.userData.constructionPart;
    workpiece.add(mesh);
    workpieceLibrary.add(workpiece);
    return workpiece;
  };
  const heavyBeam = createWorkpiece(
    'construction-workpiece-heavy-beam',
    mergeParts([
      { geometry: new THREE.BoxGeometry(1.28, 0.16, 0.18), color: TOOL_GOLD },
      { geometry: new THREE.BoxGeometry(0.16, 0.3, 0.28), color: TOOL_DARK, position: [-0.46, 0, 0] },
      { geometry: new THREE.BoxGeometry(0.16, 0.3, 0.28), color: TOOL_DARK, position: [0.46, 0, 0] },
    ]),
    toolMaterial,
  );
  const blueprintMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x62e7ff,
    emissive: 0x0b86a8,
    emissiveIntensity: 1.15,
    roughness: 0.22,
    metalness: 0.08,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    toneMapped: false,
  });
  const managerBlueprint = createWorkpiece(
    'construction-workpiece-manager-blueprint',
    new THREE.BoxGeometry(0.62, 0.035, 0.42),
    blueprintMaterial,
  );
  const miniPanel = createWorkpiece(
    'construction-workpiece-mini-panel',
    mergeParts([
      { geometry: new THREE.BoxGeometry(0.48, 0.08, 0.38), color: 0xdde7e8 },
      { geometry: new THREE.BoxGeometry(0.29, 0.025, 0.2), color: TOOL_CYAN, position: [0, 0.055, 0] },
    ]),
    toolMaterial,
  );
  root.add(workpieceLibrary);

  const buildingRoot = new THREE.Group();
  buildingRoot.name = 'construction-building-envelope';
  const buildingParts: THREE.Object3D[] = [];
  const addBuildingPart = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    buildingRoot.add(mesh);
    buildingParts.push(mesh);
  };
  addBuildingPart('construction-building-foundation', new THREE.CylinderGeometry(1.3, 1.5, 0.28, quality === 'high' ? 24 : 12), gold, 0.03);
  addBuildingPart('construction-building-frame', mergeParts([
    ...([-0.92, 0.92] as const).flatMap((x) => ([-0.62, 0.62] as const).map((z) => ({ geometry: new THREE.BoxGeometry(0.13, 2.25, 0.13), color: TOOL_GOLD, position: [x, 1.12, z] as const }))),
    { geometry: new THREE.BoxGeometry(2.05, 0.14, 1.36), color: TOOL_GOLD, position: [0, 2.2, 0] },
  ]), toolMaterial, 0);
  addBuildingPart('construction-building-shell', mergeParts([
    { geometry: new THREE.BoxGeometry(1.82, 1.82, 1.18), color: 0xaec8cf },
    { geometry: new THREE.BoxGeometry(0.48, 0.78, 0.04), color: TOOL_DARK, position: [0, -0.5, 0.61] },
    { geometry: new THREE.BoxGeometry(0.42, 0.42, 0.04), color: TOOL_CYAN, position: [-0.52, 0.25, 0.61] },
    { geometry: new THREE.BoxGeometry(0.42, 0.42, 0.04), color: TOOL_CYAN, position: [0.52, 0.25, 0.61] },
  ]), toolMaterial, 1.15);
  addBuildingPart('construction-building-roof', new THREE.ConeGeometry(1.42, 0.72, 4), gold, 2.42);
  addBuildingPart('construction-building-finish-light', new THREE.TorusGeometry(0.72, 0.055, 8, quality === 'high' ? 36 : 18), cyan, 1.3);
  buildingParts[4].rotation.x = Math.PI / 2;
  buildingRoot.visible = options.showBuildingEnvelope ?? true;
  root.add(buildingRoot);

  // Construction dust must remain readable in both the bright island scene
  // and the dark look-dev lab. Unlit soft puffs also avoid shimmer from each
  // robot carrying a different local lighting normal through the cloud bank.
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xeaf5f1,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    toneMapped: false,
  });
  const cloudCount = quality === 'high' ? 20 : 12;
  const cloudMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.6, quality === 'high' ? 16 : 10, quality === 'high' ? 10 : 7),
    cloudMaterial,
    cloudCount,
  );
  cloudMesh.name = 'construction-fx-dust-cloud-system';
  cloudMesh.renderOrder = 5;
  cloudMesh.castShadow = false;
  cloudMesh.receiveShadow = false;
  root.add(cloudMesh);

  const groundDustGeometry = new THREE.BufferGeometry();
  const dustPoints = quality === 'high' ? 42 : 20;
  const groundPositions = new Float32Array(dustPoints * 3);
  for (let i = 0; i < dustPoints; i += 1) {
    const angle = i * 2.399963;
    const radius = 0.7 + (i % 9) * 0.2;
    groundPositions.set([Math.cos(angle) * radius, 0.05 + (i % 3) * 0.025, Math.sin(angle) * radius], i * 3);
  }
  groundDustGeometry.setAttribute('position', new THREE.BufferAttribute(groundPositions, 3));
  const groundDust = new THREE.Points(groundDustGeometry, new THREE.PointsMaterial({ color: 0xdce8e6, size: 0.14, transparent: true, opacity: 0.65, depthWrite: false }));
  groundDust.name = 'construction-fx-ground-dust-system';
  root.add(groundDust);

  const sparkGeometry = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array((quality === 'high' ? 28 : 14) * 3);
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({ color: 0xffc84f, size: 0.11, transparent: true, opacity: 0.95, toneMapped: false }));
  sparks.name = 'construction-fx-spark-system';
  root.add(sparks);

  const trailGeometry = new THREE.BufferGeometry();
  const trailPositions = new Float32Array(18 * 3);
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trails = new THREE.LineSegments(trailGeometry, new THREE.LineBasicMaterial({ color: 0x68ecff, transparent: true, opacity: 0.7, toneMapped: false }));
  trails.name = 'construction-fx-tool-trail-system';
  root.add(trails);

  const deliveryOrbit = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.025, 5, quality === 'high' ? 72 : 36), new THREE.MeshBasicMaterial({ color: 0x67e8ff, transparent: true, opacity: 0.38, toneMapped: false }));
  deliveryOrbit.name = 'construction-fx-delivery-orbit-system';
  deliveryOrbit.rotation.x = Math.PI / 2;
  deliveryOrbit.position.y = 0.32;
  root.add(deliveryOrbit);

  const homes = Object.fromEntries(Object.entries(family.members).map(([role, member]) => [role, {
    position: member.position.clone(),
    rotation: member.rotation.clone(),
    scale: member.scale.clone(),
  }])) as Record<RobotRole, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>;
  // Standalone look-dev defaults leave a readable building-sized gap. The
  // live modal replaces these values with the authored landmark envelope.
  const targetEnvelope = { radius: 2.65, height: 2.8 };
  const targetPosition = new THREE.Vector3();
  const targetScale = new THREE.Vector3();
  const stationPosition = new THREE.Vector3();
  const nextStationPosition = new THREE.Vector3();
  const contactPosition = new THREE.Vector3();
  const nextContactPosition = new THREE.Vector3();
  const toolGripWorld = new THREE.Vector3();
  const toolGripLocal = new THREE.Vector3();
  const toolGripOffset = new THREE.Vector3();
  const toolTipOffset = new THREE.Vector3();
  const toolLocalAxis = new THREE.Vector3();
  const toolAimDirection = new THREE.Vector3();
  const payloadGripWorld = new THREE.Vector3();
  const payloadGripLocal = new THREE.Vector3();
  const payloadStart = new THREE.Vector3();
  const payloadTarget = new THREE.Vector3();
  const payloadPosition = new THREE.Vector3();
  const cloudCenter = new THREE.Vector3();
  const rolePositions = Object.fromEntries(ROLE_ORDER.map((role) => [role, new THREE.Vector3()])) as Record<RobotRole, THREE.Vector3>;
  const roleContacts = Object.fromEntries(ROLE_ORDER.map((role) => [role, new THREE.Vector3()])) as Record<RobotRole, THREE.Vector3>;
  const roleToolGrips = Object.fromEntries(ROLE_ORDER.map((role) => [role, new THREE.Vector3()])) as Record<RobotRole, THREE.Vector3>;
  const roleToolTips = Object.fromEntries(ROLE_ORDER.map((role) => [role, new THREE.Vector3()])) as Record<RobotRole, THREE.Vector3>;
  const relocationStrength = Object.fromEntries(ROLE_ORDER.map((role) => [role, 0])) as Record<RobotRole, number>;
  const roleVisibility = Object.fromEntries(ROLE_ORDER.map((role) => [role, 1])) as Record<RobotRole, number>;
  const roleGripNodes: Record<RobotRole, THREE.Object3D> = {
    'heavy-worker': family.root.getObjectByName('heavy-worker-right-hand-root') ?? family.members['heavy-worker'],
    'project-manager': family.root.getObjectByName('project-manager-pointer-pivot') ?? family.members['project-manager'],
    'mini-artist': family.sockets['mini-artist:right-hand'] ?? family.members['mini-artist'],
  };
  const payloadGripNodes: Record<'heavy-worker' | 'mini-artist', readonly THREE.Object3D[]> = {
    'heavy-worker': [
      family.root.getObjectByName('heavy-worker-left-hand-root') ?? family.members['heavy-worker'],
      family.root.getObjectByName('heavy-worker-right-hand-root') ?? family.members['heavy-worker'],
    ],
    'mini-artist': [family.sockets['mini-artist:left-hand'] ?? family.members['mini-artist']],
  };
  const isRelocationPhase = (phase: ConstructionPhase) => (
    phase === 'foundation' || phase === 'frame' || phase === 'assemble' || phase === 'finish'
  );
  const resolveWorkingConfig = () => {
    const base = PHASE_CONFIG[presentation.phase];
    const toolOverrides = presentation.choreography?.phaseTools?.[presentation.phase];
    const assignedTools = toolOverrides
      ? { ...PHASE_ROLE_TOOLS[presentation.phase], ...toolOverrides }
      : PHASE_ROLE_TOOLS[presentation.phase];
    const visibleTools = Array.from(new Set([
      ...base.tools,
      ...Object.values(assignedTools).filter((tool): tool is ConstructionToolId => Boolean(tool)),
    ]));
    return {
      ...base,
      tools: visibleTools,
      materials: presentation.choreography?.phaseMaterials?.[presentation.phase] ?? base.materials,
      assignedTools,
    };
  };

  let presentation: RobotConstructionTheatre['presentation'] = {
    active: false,
    working: false,
    phase: 'arrive',
    progress: 0,
    sequence: 0,
  };
  let phaseAgeSeconds = 0;
  let snapCrewOnNextUpdate = false;
  let restingMotion = family.motion;
  let restingEmotion = family.emotion;
  let crewScale = 1;
  const occupancyRadius = (role: RobotRole) => (
    targetEnvelope.radius
    * ROLE_OCCUPANCY_PROFILE[role].radius
    * THREE.MathUtils.clamp(crewScale / 0.58, 0.18, 1.25)
  );
  const occupancyHalfHeight = (role: RobotRole) => (
    targetEnvelope.height
    * ROLE_OCCUPANCY_PROFILE[role].halfHeight
    * THREE.MathUtils.clamp(crewScale / 0.58, 0.18, 1.2)
  );
  const buildingShellRadiusAt = (position: THREE.Vector3, role: RobotRole) => {
    const normalizedHeight = THREE.MathUtils.clamp(position.y / targetEnvelope.height, 0, 1);
    // The broad lower shell is treated as nearly cylindrical. Near the roof,
    // the clearance contracts so legitimate upper-storey work remains
    // possible without ever placing the robot's body inside the landmark.
    const roofRelease = THREE.MathUtils.smoothstep(normalizedHeight, 0.64, 0.98);
    const shellRadius = targetEnvelope.radius * THREE.MathUtils.lerp(0.82, 0.34, roofRelease);
    return shellRadius + occupancyRadius(role);
  };
  const enforceConstructionOccupancy = (
    position: THREE.Vector3,
    role: RobotRole,
    roleIndex: number,
    targetSpace: boolean,
  ) => {
    let corrections = 0;
    // Keep a tiny positive clearance instead of snapping to the exact shell
    // boundary. Exact-boundary projection can retrigger several times in one
    // frame from floating-point drift and presents as a subtle robot tremor.
    const shellClearanceMargin = targetEnvelope.radius * 0.0015;
    // Resolve against the landmark first, then separate colliding workers by
    // moving the current worker around its legal shell. A direct Cartesian
    // push can force the worker back through the building and oscillate with
    // the next shell projection; the polar correction preserves its radius.
    for (let pass = 0; pass < 8; pass += 1) {
      const minimumShellRadius = buildingShellRadiusAt(position, role);
      const radialDistance = Math.hypot(position.x, position.z);
      if (radialDistance < minimumShellRadius + shellClearanceMargin * 0.25) {
        const angle = radialDistance > 0.0001
          ? Math.atan2(position.z, position.x)
          : ROLE_OCCUPANCY_PROFILE[role].fallbackAngle;
        const correctedRadius = minimumShellRadius + shellClearanceMargin;
        position.x = Math.cos(angle) * correctedRadius;
        position.z = Math.sin(angle) * correctedRadius;
        corrections += 1;
      }

      for (let otherIndex = 0; otherIndex < roleIndex; otherIndex += 1) {
        const otherRole = ROLE_ORDER[otherIndex];
        const otherPosition = targetSpace
          ? rolePositions[otherRole]
          : family.members[otherRole].position;
        const minimumVerticalDistance = occupancyHalfHeight(role) + occupancyHalfHeight(otherRole);
        if (Math.abs(position.y - otherPosition.y) >= minimumVerticalDistance) continue;
        const deltaX = position.x - otherPosition.x;
        const deltaZ = position.z - otherPosition.z;
        const horizontalDistance = Math.hypot(deltaX, deltaZ);
        const minimumHorizontalDistance = occupancyRadius(role) + occupancyRadius(otherRole);
        if (horizontalDistance >= minimumHorizontalDistance) continue;
        const clearanceMargin = targetEnvelope.radius * 0.006;
        const requiredSeparation = minimumHorizontalDistance + clearanceMargin;
        const otherRadius = Math.max(0.0001, Math.hypot(otherPosition.x, otherPosition.z));
        let currentRadius = Math.max(
          minimumShellRadius,
          Math.hypot(position.x, position.z),
          requiredSeparation - otherRadius + clearanceMargin,
        );
        const currentAngle = Math.atan2(position.z, position.x);
        const otherAngle = Math.atan2(otherPosition.z, otherPosition.x);
        const signedAngleDelta = Math.atan2(
          Math.sin(currentAngle - otherAngle),
          Math.cos(currentAngle - otherAngle),
        );
        const requiredAngle = Math.acos(THREE.MathUtils.clamp(
          (
            currentRadius * currentRadius
            + otherRadius * otherRadius
            - requiredSeparation * requiredSeparation
          ) / (2 * currentRadius * otherRadius),
          -1,
          1,
        ));
        const fallbackSign = (roleIndex + otherIndex) % 2 === 0 ? 1 : -1;
        const separationSign = Math.abs(signedAngleDelta) > 0.0001
          ? Math.sign(signedAngleDelta)
          : fallbackSign;
        const correctedAngle = otherAngle
          + separationSign * Math.max(Math.abs(signedAngleDelta), requiredAngle);
        // Guard the legal radius explicitly for the degenerate case where a
        // worker begins at the target origin during first-frame damping.
        currentRadius = Math.max(currentRadius, buildingShellRadiusAt(position, role));
        position.x = Math.cos(correctedAngle) * currentRadius;
        position.z = Math.sin(correctedAngle) * currentRadius;
        corrections += 1;
      }
    }
    return corrections;
  };
  const keepMiniatureCrewInPhoneForecourt = (position: THREE.Vector3, role: RobotRole) => {
    // The live Build modal uses a much smaller scale than the look-dev lab.
    // At that scale, legal rear/side stations can project completely beyond a
    // narrow phone crop even though their world-space occupancy is correct.
    // Preserve each role's own left/centre/right lane and station movement,
    // but fold the miniature crew into the camera-facing forecourt. Contacts
    // remain on the authored structure, so tools still reach toward real work.
    if (crewScale > 0.3) return;
    const radius = Math.hypot(position.x, position.z);
    if (radius <= 0.0001) return;
    const laneAngle = role === 'heavy-worker' ? -0.58 : role === 'mini-artist' ? 0.58 : 0;
    const stationAngle = Math.atan2(position.x, position.z);
    const stationDelta = Math.atan2(
      Math.sin(stationAngle - laneAngle),
      Math.cos(stationAngle - laneAngle),
    );
    const safeAngle = laneAngle + THREE.MathUtils.clamp(stationDelta * 0.28, -0.2, 0.2);
    position.x = Math.sin(safeAngle) * radius;
    position.z = Math.cos(safeAngle) * radius;
  };
  const applyPresentation = () => {
    root.visible = presentation.active;
    const config = resolveWorkingConfig();
    const isWorking = Boolean(presentation.active && presentation.working);
    CONSTRUCTION_TOOLS.forEach(({ id }) => { tools[id].visible = isWorking && config.tools.includes(id); });
    CONSTRUCTION_MATERIALS.forEach(({ id }) => { materialStacks[id].visible = isWorking && config.materials.includes(id); });
    heavyBeam.visible = isWorking && ['foundation', 'frame', 'assemble'].includes(presentation.phase);
    managerBlueprint.visible = isWorking && ['survey', 'foundation', 'frame', 'assemble', 'finish'].includes(presentation.phase);
    miniPanel.visible = isWorking && ['assemble', 'finish'].includes(presentation.phase);
    buildingParts.forEach((part, index) => { part.visible = presentation.active && index < config.buildingStage; });
    cloudMesh.visible = isWorking && config.cloud > 0.03;
    groundDust.visible = isWorking && config.cloud > 0.12;
    sparks.visible = isWorking && ['foundation', 'frame', 'assemble'].includes(presentation.phase);
    trails.visible = isWorking && config.tools.length > 0;
    // A static survey guide is useful; a continuously spinning ring made the
    // entire crew read like a loading indicator instead of builders.
    deliveryOrbit.visible = isWorking && presentation.phase === 'survey';
    if (presentation.active) {
      (Object.keys(config.motions) as RobotRole[]).forEach((role) => {
        family.setMemberMotion(role, isWorking ? config.motions[role] : role === 'project-manager' ? 'listen' : 'idle');
      });
      family.setEmotion(presentation.phase === 'reveal' ? 'delighted' : isWorking ? 'focused' : 'friendly');
    }
  };

  const theatre: RobotConstructionTheatre = {
    root,
    tools,
    materials: materialStacks,
    metrics: {
      meshes: 0, triangles: trianglesFor(root), materials: 0, sockets: 0, drawCalls: 0,
      visibleDrawCalls: 0, visibleTriangles: 0,
    },
    partManifest: { model: 'habitgame-construction-theatre', parts: [], unnamedMeshes: 0, integralMeshes: 0 },
    presentation,
    setTargetEnvelope(radius, height) {
      targetEnvelope.radius = THREE.MathUtils.clamp(radius, 0.75, 10);
      targetEnvelope.height = THREE.MathUtils.clamp(height, 1.2, 15);
    },
    setCrewScale(scale) {
      // The live build modal intentionally uses a truly miniature crew. Keep
      // the lower bound below that authored value; older clamps silently made
      // the heavy worker compete with the whole landmark at phone scale.
      crewScale = THREE.MathUtils.clamp(scale, 0.035, 1.25);
      const handledPropScale = THREE.MathUtils.lerp(1, crewScale, 0.72);
      CONSTRUCTION_TOOLS.forEach(({ id }) => tools[id].scale.setScalar(crewScale));
      CONSTRUCTION_MATERIALS.forEach(({ id }) => materialStacks[id].scale.setScalar(handledPropScale));
      heavyBeam.scale.setScalar(handledPropScale);
      managerBlueprint.scale.setScalar(crewScale);
      miniPanel.scale.setScalar(handledPropScale);
      root.userData.crewScale = crewScale;
    },
    setPresentation(next) {
      const previous = presentation;
      if (!previous.active && next.active) {
        restingMotion = family.motion;
        restingEmotion = family.emotion;
        snapCrewOnNextUpdate = true;
      }
      presentation = {
        active: next.active,
        working: Boolean(next.working),
        phase: next.phase ?? derivePhase(next.progress),
        progress: THREE.MathUtils.clamp(next.progress, 0, 1),
        sequence: next.sequence ?? 0,
        cloudCover: next.cloudCover,
        choreography: next.choreography,
      };
      theatre.presentation = presentation;
      family.setExternalRootMotion(presentation.active);
      if (
        previous.active !== presentation.active
        || previous.working !== presentation.working
        || previous.phase !== presentation.phase
        || previous.choreography?.styleId !== presentation.choreography?.styleId
      ) {
        if (
          previous.active
          && presentation.active
          && previous.choreography?.styleId !== presentation.choreography?.styleId
        ) snapCrewOnNextUpdate = true;
        phaseAgeSeconds = 0;
        applyPresentation();
      }
      if (previous.active && !presentation.active) {
        ROLE_ORDER.forEach((role) => family.setMemberEmotion(role, null));
        family.setMotion(restingMotion);
        family.setEmotion(restingEmotion);
      }
      theatre.metrics.visibleDrawCalls = visibleDrawCalls(root);
      theatre.metrics.visibleTriangles = trianglesFor(root, true);
    },
    update(elapsedSeconds, deltaSeconds, reducedMotion = false) {
      phaseAgeSeconds += Math.max(0, deltaSeconds);
      const snapCrewThisFrame = snapCrewOnNextUpdate;
      const response = 1 - Math.exp(-Math.max(deltaSeconds, 1 / 120) * (reducedMotion ? 5 : 8));
      const phaseIndex = CONSTRUCTION_PHASES.indexOf(presentation.phase);
      const isWorking = Boolean(presentation.working);
      const relocationSeconds = THREE.MathUtils.clamp(
        presentation.choreography?.relocationSeconds ?? RELOCATION_SLOT_SECONDS,
        1.3,
        2.4,
      );
      const relocationCycle = elapsedSeconds / relocationSeconds + presentation.sequence * 0.19;
      const relocationSlotIndex = Math.floor(relocationCycle);
      const relocationSlotProgress = relocationCycle - relocationSlotIndex;
      const activeRelocationRole = ROLE_ORDER[((relocationSlotIndex % ROLE_ORDER.length) + ROLE_ORDER.length) % ROLE_ORDER.length];
      const restExpressionCycle = elapsedSeconds / REST_EXPRESSION_SECONDS + presentation.sequence * 0.07;
      const restExpressionIndex = Math.floor(restExpressionCycle);
      const restExpressionProgress = restExpressionCycle - restExpressionIndex;
      const personalityRole = ROLE_ORDER[((restExpressionIndex % ROLE_ORDER.length) + ROLE_ORDER.length) % ROLE_ORDER.length];
      let targetOccupancyCorrections = 0;
      let actualOccupancyCorrections = 0;
      ROLE_ORDER.forEach((role) => {
        const member = family.members[role];
        const home = homes[role];
        let targetRotationY = home.rotation.y;
        let hasPersonalityBeat = false;
        let presenceScale = presentation.active ? ROLE_WORK_RIG[role].presenceScale * crewScale : 1;
        if (presentation.active) {
          const rig = ROLE_WORK_RIG[role];
          const roleIndex = ROLE_ORDER.indexOf(role);
          family.setMemberEmotion(
            role,
            isWorking
              ? null
              : REST_EMOTIONS[(restExpressionIndex + roleIndex) % REST_EMOTIONS.length],
          );
          if (role === 'project-manager' && !isWorking) {
            const restEmotion = REST_EMOTIONS[(restExpressionIndex + roleIndex) % REST_EMOTIONS.length];
            const restBrainState = restEmotion === 'friendly'
              ? 'calm'
              : restEmotion === 'curious'
                ? 'curious'
                : restEmotion === 'delighted'
                  ? 'energized'
                  : 'focused';
            if (family.brainState !== restBrainState) family.setBrainState(restBrainState);
          }
          const phaseStationOffset = Math.round(
            presentation.choreography?.phaseStationOffsets?.[presentation.phase] ?? 0,
          );
          const stationStep = presentation.choreography?.stationStep ?? 1;
          const baseStationIndex = (
            PHASE_PRIMARY_STATION[presentation.phase][role]
            + Math.round(presentation.choreography?.stationOffset ?? 0)
            + phaseStationOffset
            + rig.stations.length * 2
          ) % rig.stations.length;
          const relocates = isWorking && !reducedMotion && isRelocationPhase(presentation.phase);
          // A compact time-lapse cycle: hold long enough to read the task,
          // disappear into a local dust burst, then pop out at a different
          // floor/side of the structure. A shared baton keeps two specialists
          // visibly working while the third relocates, then hands off quickly.
          const roleIsRelocating = relocates && activeRelocationRole === role;
          const completedRoleMoves = Math.max(0, Math.floor((relocationSlotIndex + 2 - roleIndex) / ROLE_ORDER.length));
          const cycleProgress = roleIsRelocating ? relocationSlotProgress : 0;
          const stationShift = relocates ? completedRoleMoves * stationStep : 0;
          const fromStationIndex = (
            baseStationIndex + stationShift + rig.stations.length * 4
          ) % rig.stations.length;
          const toStationIndex = (
            fromStationIndex + (roleIsRelocating ? stationStep : 0) + rig.stations.length
          ) % rig.stations.length;
          const transitionProgress = roleIsRelocating
            ? THREE.MathUtils.smoothstep(cycleProgress, 0.68, 0.76)
            : 0;
          const transitionArc = roleIsRelocating && cycleProgress >= 0.62 && cycleProgress < 0.84
            ? Math.sin(THREE.MathUtils.clamp(transitionProgress, 0, 1) * Math.PI)
            : 0;
          const vanish = roleIsRelocating ? THREE.MathUtils.smoothstep(cycleProgress, 0.6, 0.68) : 0;
          const emerge = roleIsRelocating ? THREE.MathUtils.smoothstep(cycleProgress, 0.75, 0.84) : 1;
          const relocationVisibility = roleIsRelocating
            ? THREE.MathUtils.lerp(1, 0.08, vanish) * THREE.MathUtils.lerp(0.08, 1, emerge) / 0.08
            : 1;
          presenceScale *= THREE.MathUtils.clamp(relocationVisibility, 0.08, 1);
          relocationStrength[role] = roleIsRelocating
            ? THREE.MathUtils.smoothstep(cycleProgress, 0.54, 0.66)
              * (1 - THREE.MathUtils.smoothstep(cycleProgress, 0.83, 0.92))
            : 0;

          const fromStation = rig.stations[fromStationIndex];
          const toStation = rig.stations[toStationIndex];
          stationPosition.set(
            fromStation.position[0] * targetEnvelope.radius,
            fromStation.position[1] * targetEnvelope.height,
            fromStation.position[2] * targetEnvelope.radius,
          );
          nextStationPosition.set(
            toStation.position[0] * targetEnvelope.radius,
            toStation.position[1] * targetEnvelope.height,
            toStation.position[2] * targetEnvelope.radius,
          );
          contactPosition.set(
            fromStation.contact[0] * targetEnvelope.radius,
            fromStation.contact[1] * targetEnvelope.height,
            fromStation.contact[2] * targetEnvelope.radius,
          );
          nextContactPosition.set(
            toStation.contact[0] * targetEnvelope.radius,
            toStation.contact[1] * targetEnvelope.height,
            toStation.contact[2] * targetEnvelope.radius,
          );
          targetPosition.copy(stationPosition).lerp(nextStationPosition, transitionProgress);
          roleContacts[role].copy(contactPosition).lerp(nextContactPosition, transitionProgress);
          targetPosition.y += transitionArc * targetEnvelope.height * 0.11;

          if (!isWorking && !reducedMotion) {
            // Resting workers should remain fully readable at the phone edges.
            // Preserve their legal radius while easing the side component
            // toward the camera-facing +Z lane; a plain Cartesian inset would
            // push their bodies back through the landmark shell.
            const restingRadius = Math.hypot(targetPosition.x, targetPosition.z);
            targetPosition.x *= 0.84;
            targetPosition.z = Math.sqrt(Math.max(
              0,
              restingRadius * restingRadius - targetPosition.x * targetPosition.x,
            ));
            // Rest mode has one slow, continuous hover target owned entirely
            // by this theatre. It never competes with the showroom controller.
            targetPosition.y += Math.sin(elapsedSeconds * 0.42 + roleIndex * 1.9)
              * targetEnvelope.height * 0.004;
          }
          keepMiniatureCrewInPhoneForecourt(targetPosition, role);
          if (presentation.phase === 'arrive') {
            const arrival = THREE.MathUtils.smoothstep(phaseAgeSeconds, 0.05, 0.9);
            targetPosition.y += (1 - arrival) * targetEnvelope.height * 0.12;
            presenceScale *= THREE.MathUtils.lerp(0.92, 1, arrival);
          }
          // Rooftop stations may extend slightly above the building envelope,
          // but the build modal reserves its upper band for the title/header.
          // Keep ordinary work below that phone-safe ceiling; the short
          // personality greeting below may intentionally rise past it.
          const phoneSafeHeight = role === 'project-manager' ? 0.72 : role === 'heavy-worker' ? 0.84 : 0.86;
          targetPosition.y = Math.min(targetPosition.y, targetEnvelope.height * phoneSafeHeight);

          // Aim mainly at the physical contact point while retaining enough
          // camera-facing angle for the animated visor to remain readable.
          const workYaw = Math.atan2(
            roleContacts[role].x - targetPosition.x,
            roleContacts[role].z - targetPosition.z,
          );
          targetRotationY = workYaw * (role === 'project-manager' ? 0.56 : role === 'mini-artist' ? 0.48 : 0.72);
          hasPersonalityBeat = !isWorking
            && !reducedMotion
            && role === personalityRole
            && restExpressionProgress < 0.22;
          if (hasPersonalityBeat) {
            const beatProgress = THREE.MathUtils.clamp(restExpressionProgress / 0.22, 0, 1);
            const flyEnvelope = Math.sin(beatProgress * Math.PI);
            const spinProgress = THREE.MathUtils.smoothstep(beatProgress, 0.08, 0.78);
            targetPosition.y += targetEnvelope.height * 0.18 * flyEnvelope;
            targetPosition.z += targetEnvelope.radius * 0.68 * flyEnvelope;
            presenceScale *= 1 + flyEnvelope * 0.16;
            targetRotationY += spinProgress * Math.PI * 2;
            family.setMemberEmotion(role, beatProgress < 0.52 ? 'curious' : 'delighted');
            if (role === 'project-manager') {
              const beatBrainState = beatProgress < 0.52 ? 'curious' : 'energized';
              if (family.brainState !== beatBrainState) family.setBrainState(beatBrainState);
            }
          }
          targetOccupancyCorrections += enforceConstructionOccupancy(
            targetPosition,
            role,
            roleIndex,
            true,
          );
          rolePositions[role].copy(targetPosition);
        } else {
          targetPosition.copy(home.position);
          rolePositions[role].copy(home.position);
          roleContacts[role].set(0, targetEnvelope.height * 0.45, 0);
          relocationStrength[role] = 0;
        }
        roleVisibility[role] = presentation.active
          ? THREE.MathUtils.clamp(presenceScale / (ROLE_WORK_RIG[role].presenceScale * crewScale), 0.08, 1)
          : 1;
        targetScale.copy(home.scale).multiplyScalar(presenceScale);
        if (snapCrewThisFrame) {
          member.position.copy(targetPosition);
          member.rotation.y = targetRotationY;
          member.scale.copy(targetScale);
        } else {
          member.position.x = THREE.MathUtils.lerp(member.position.x, targetPosition.x, response);
          member.position.y = THREE.MathUtils.lerp(member.position.y, targetPosition.y, response);
          member.position.z = THREE.MathUtils.lerp(member.position.z, targetPosition.z, response);
          member.rotation.y = hasPersonalityBeat
            ? THREE.MathUtils.lerp(member.rotation.y, targetRotationY, response)
            : dampAngle(member.rotation.y, targetRotationY, response);
          member.scale.lerp(targetScale, response);
        }
        if (presentation.active) {
          actualOccupancyCorrections += enforceConstructionOccupancy(
            member.position,
            role,
            ROLE_ORDER.indexOf(role),
            false,
          );
        }
      });
      snapCrewOnNextUpdate = false;
      if (!presentation.active) {
        root.userData.constructionOccupancy = {
          schema: 'construction-occupancy-v1',
          active: false,
          pairViolations: 0,
          buildingViolations: 0,
        };
        return;
      }

      let pairViolations = 0;
      let buildingViolations = 0;
      let minimumPairClearance = Number.POSITIVE_INFINITY;
      let minimumBuildingClearance = Number.POSITIVE_INFINITY;
      ROLE_ORDER.forEach((role, roleIndex) => {
        const position = family.members[role].position;
        const shellClearance = Math.hypot(position.x, position.z) - buildingShellRadiusAt(position, role);
        minimumBuildingClearance = Math.min(minimumBuildingClearance, shellClearance);
        if (shellClearance < -0.001) buildingViolations += 1;
        for (let otherIndex = 0; otherIndex < roleIndex; otherIndex += 1) {
          const otherRole = ROLE_ORDER[otherIndex];
          const otherPosition = family.members[otherRole].position;
          const minimumVerticalDistance = occupancyHalfHeight(role) + occupancyHalfHeight(otherRole);
          if (Math.abs(position.y - otherPosition.y) >= minimumVerticalDistance) continue;
          const pairClearance = Math.hypot(
            position.x - otherPosition.x,
            position.z - otherPosition.z,
          ) - occupancyRadius(role) - occupancyRadius(otherRole);
          minimumPairClearance = Math.min(minimumPairClearance, pairClearance);
          if (pairClearance < -0.001) pairViolations += 1;
        }
      });
      root.userData.constructionOccupancy = {
        schema: 'construction-occupancy-v1',
        active: true,
        pairViolations,
        buildingViolations,
        minimumPairClearance: Number.isFinite(minimumPairClearance)
          ? Number(minimumPairClearance.toFixed(4))
          : null,
        minimumBuildingClearance: Number(minimumBuildingClearance.toFixed(4)),
        targetCorrections: targetOccupancyCorrections,
        actualCorrections: actualOccupancyCorrections,
      };

      const config = resolveWorkingConfig();
      const motionScale = reducedMotion ? 0 : 1;
      sparks.visible = isWorking && !reducedMotion && ['foundation', 'frame', 'assemble'].includes(presentation.phase);
      trails.visible = isWorking && !reducedMotion && config.tools.length > 0;
      const assignedTools = config.assignedTools;
      const assignedToolIds = new Set(Object.values(assignedTools));
      family.root.updateWorldMatrix(true, true);
      root.updateWorldMatrix(true, false);
      ROLE_ORDER.forEach((role) => {
        const toolId = assignedTools[role];
        const gripNode = roleGripNodes[role];
        gripNode.updateWorldMatrix(true, false);
        gripNode.getWorldPosition(toolGripWorld);
        toolGripLocal.copy(toolGripWorld);
        root.worldToLocal(toolGripLocal);
        roleToolGrips[role].copy(toolGripLocal);
        roleToolTips[role].copy(roleContacts[role]);
        if (!toolId || !tools[toolId].visible) return;
        const tool = tools[toolId];
        const profile = TOOL_WORK_PROFILES[toolId];
        const assignedToolScale = crewScale * roleVisibility[role];
        tool.scale.setScalar(assignedToolScale);
        toolGripOffset.fromArray(profile.grip).multiplyScalar(assignedToolScale);
        toolTipOffset.fromArray(profile.tip).multiplyScalar(assignedToolScale);
        toolLocalAxis.copy(toolTipOffset).sub(toolGripOffset).normalize();
        toolAimDirection.copy(roleContacts[role]).sub(toolGripLocal);
        if (toolAimDirection.lengthSq() > 0.0001) {
          // The work sweep changes aim around the fixed grip instead of
          // translating the whole tool away from the robot hand.
          const sweep = Math.sin(elapsedSeconds * (role === 'mini-artist' ? 5.2 : 2.6) + phaseIndex)
            * profile.sweep * motionScale;
          toolAimDirection.y += toolAimDirection.length() * sweep;
          toolAimDirection.normalize();
          tool.quaternion.setFromUnitVectors(toolLocalAxis, toolAimDirection);
        }
        toolGripOffset.fromArray(profile.grip).multiplyScalar(assignedToolScale).applyQuaternion(tool.quaternion);
        tool.position.copy(toolGripLocal).sub(toolGripOffset);
        const contactVibration = TOOL_CONTACT_VIBRATION[toolId];
        if (isWorking && !reducedMotion && contactVibration) {
          tool.position.addScaledVector(
            toolAimDirection,
            Math.sin(elapsedSeconds * contactVibration.frequency * Math.PI * 2)
              * targetEnvelope.radius * contactVibration.amplitude,
          );
        }
        toolTipOffset.fromArray(profile.tip).multiplyScalar(assignedToolScale).applyQuaternion(tool.quaternion);
        roleToolTips[role].copy(tool.position).add(toolTipOffset);
      });
      // Tools that are not in a robot's hand wait in two readable staging
      // bays. Nothing free-orbits the building.
      config.tools.filter((id) => !assignedToolIds.has(id)).forEach((id, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        tools[id].scale.setScalar(crewScale);
        tools[id].position.set(
          side * targetEnvelope.radius * 1.18,
          targetEnvelope.height * 0.12,
          targetEnvelope.radius * (0.62 - index * 0.18),
        );
        tools[id].rotation.set(0.18, side * 0.32, side * -0.42);
      });
      config.materials.forEach((id, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        materialStacks[id].position.set(
          side * targetEnvelope.radius * (1.16 + index * 0.04),
          targetEnvelope.height * 0.04 + Math.sin(elapsedSeconds * 1.2 + index) * targetEnvelope.height * 0.006 * motionScale,
          targetEnvelope.radius * (0.7 - index * 0.2),
        );
        materialStacks[id].rotation.y = side * 0.28;
      });

      const placeCarriedWorkpiece = (
        workpiece: THREE.Group,
        role: 'heavy-worker' | 'mini-artist',
        phaseActive: boolean,
        cycleOffset: number,
        start: readonly [number, number, number],
        rotation: readonly [number, number, number],
      ) => {
        const gripNodes = payloadGripNodes[role];
        payloadGripLocal.set(0, 0, 0);
        gripNodes.forEach((gripNode) => {
          gripNode.updateWorldMatrix(true, false);
          gripNode.getWorldPosition(payloadGripWorld);
          root.worldToLocal(payloadGripWorld);
          payloadGripLocal.add(payloadGripWorld);
        });
        payloadGripLocal.multiplyScalar(1 / gripNodes.length);
        payloadStart.set(
          start[0] * targetEnvelope.radius,
          start[1] * targetEnvelope.height,
          start[2] * targetEnvelope.radius,
        );
        payloadTarget.copy(roleContacts[role]);
        const cycle = reducedMotion ? 0.58 : (elapsedSeconds / 7.8 + cycleOffset + presentation.sequence * 0.037) % 1;
        const pickup = THREE.MathUtils.smoothstep(cycle, 0.07, 0.25);
        const install = THREE.MathUtils.smoothstep(cycle, 0.54, 0.8);
        if (cycle < 0.54) payloadPosition.copy(payloadStart).lerp(payloadGripLocal, pickup);
        else payloadPosition.copy(payloadGripLocal).lerp(payloadTarget, install);
        const travelArc = cycle < 0.54
          ? Math.sin(pickup * Math.PI)
          : Math.sin(install * Math.PI);
        payloadPosition.y += travelArc * targetEnvelope.height * (role === 'heavy-worker' ? 0.045 : 0.025) * motionScale;
        workpiece.position.copy(payloadPosition);
        workpiece.rotation.set(...rotation);
        workpiece.visible = phaseActive
          && roleVisibility[role] > 0.24
          && (reducedMotion || cycle < 0.89 || cycle > 0.96);
        workpiece.userData.payloadStage = cycle < 0.07
          ? 'pickup'
          : cycle < 0.54
            ? 'carry'
            : cycle < 0.82
              ? 'install'
              : 'reset';
      };
      placeCarriedWorkpiece(
        heavyBeam,
        'heavy-worker',
        isWorking && ['foundation', 'frame', 'assemble'].includes(presentation.phase),
        0.08,
        [-1.2, 0.14, 0.68],
        [0.08, 0.18, -0.08],
      );
      placeCarriedWorkpiece(
        miniPanel,
        'mini-artist',
        isWorking && ['assemble', 'finish'].includes(presentation.phase),
        0.56,
        [1.22, 0.12, 0.66],
        [-0.32, -0.18, 0.16],
      );

      // The manager keeps a readable live plan between their station and the
      // build contact. It shifts toward the mini during assembly, making the
      // coordination/handoff beat legible without another orbiting prop.
      managerBlueprint.position.copy(roleToolGrips['project-manager']).lerp(
        presentation.phase === 'assemble' ? rolePositions['mini-artist'] : roleContacts['project-manager'],
        presentation.phase === 'assemble' ? 0.34 : 0.22,
      );
      managerBlueprint.position.x -= targetEnvelope.radius * 0.06;
      managerBlueprint.position.y += targetEnvelope.height * (0.05 + Math.sin(elapsedSeconds * 1.7) * 0.006 * motionScale);
      managerBlueprint.rotation.set(-0.48, presentation.phase === 'assemble' ? -0.32 : 0.16, 0.08);
      managerBlueprint.visible = isWorking
        && roleVisibility['project-manager'] > 0.24
        && ['survey', 'foundation', 'frame', 'assemble', 'finish'].includes(presentation.phase);

      const cover = presentation.cloudCover ?? config.cloud;
      cloudMaterial.opacity = 0.08 + cover * 0.36;
      const matrix = new THREE.Matrix4();
      const roleCloudCount = Math.min(cloudCount, quality === 'high' ? 11 : 6);
      for (let index = 0; index < cloudCount; index += 1) {
        const isCentralVeil = index >= roleCloudCount;
        const clusterIndex = isCentralVeil ? index - roleCloudCount : Math.floor(index / ROLE_ORDER.length);
        const angle = clusterIndex * 2.399963 + index * 0.31;
        let relocating = 0;
        let spread = targetEnvelope.radius * (0.08 + (clusterIndex % 4) * 0.035);
        let pulse = 0;
        if (isCentralVeil) {
          // High-intensity build dust sits over the lower work surface, not
          // the robots' face lanes. This conceals installation transitions
          // while all three specialists remain readable around the edge.
          const veil = THREE.MathUtils.smoothstep(cover, 0.3, 0.72);
          cloudCenter.set(
            (clusterIndex % 2 === 0 ? -1 : 1) * targetEnvelope.radius * 0.16,
            targetEnvelope.height * (0.24 + (clusterIndex % 3) * 0.08),
            targetEnvelope.radius * (0.48 + (clusterIndex % 2) * 0.12),
          );
          spread = targetEnvelope.radius * (0.1 + (clusterIndex % 3) * 0.035);
          pulse = 0.06 + veil * 0.7
            + Math.sin(elapsedSeconds * 0.95 + index) * 0.04 * motionScale * veil;
        } else {
          const role = ROLE_ORDER[index % ROLE_ORDER.length];
          relocating = relocationStrength[role];
          cloudCenter.copy(relocating > 0.02 ? rolePositions[role] : roleContacts[role]);
          pulse = 0.24 + cover * 0.36 + relocating * 0.32
            + Math.sin(elapsedSeconds * 1.15 + index) * 0.045 * motionScale;
        }
        matrix.compose(
          new THREE.Vector3(
            cloudCenter.x + Math.cos(angle) * spread,
            cloudCenter.y + (clusterIndex % 3 - 1) * targetEnvelope.height * 0.035,
            cloudCenter.z + Math.sin(angle) * spread,
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(index * 0.17, angle, 0)),
          new THREE.Vector3(pulse * 1.2, pulse * 0.68, pulse),
        );
        cloudMesh.setMatrixAt(index, matrix);
      }
      cloudMesh.instanceMatrix.needsUpdate = true;
      groundDust.rotation.y = 0;
      groundDust.position.set(0, targetEnvelope.height * 0.01, targetEnvelope.radius * 0.08);
      groundDust.scale.setScalar(Math.max(0.7, targetEnvelope.radius / 2.4));
      deliveryOrbit.rotation.z = 0;
      deliveryOrbit.scale.setScalar(
        Math.max(0.7, targetEnvelope.radius / 1.5)
        * (presentation.phase === 'survey' ? 0.92 : 1),
      );

      const activeSparkRole: RobotRole = presentation.phase === 'foundation' ? 'heavy-worker' : 'mini-artist';
      const activeSparkContact = roleToolTips[activeSparkRole];
      const sparkAttribute = sparkGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < sparkAttribute.count; index += 1) {
        const age = (elapsedSeconds * 2.7 + index * 0.173 + phaseIndex * 0.11) % 1;
        const angle = index * 2.17 + phaseIndex;
        sparkAttribute.setXYZ(
          index,
          activeSparkContact.x + Math.cos(angle) * age * targetEnvelope.radius * 0.14,
          activeSparkContact.y + age * targetEnvelope.height * 0.18 - age * age * targetEnvelope.height * 0.13,
          activeSparkContact.z + Math.sin(angle) * age * targetEnvelope.radius * 0.14,
        );
      }
      sparkAttribute.needsUpdate = true;

      const trailAttribute = trailGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < trailAttribute.count; index += 2) {
        const role = ROLE_ORDER[(index / 2) % ROLE_ORDER.length];
        const toolId = assignedTools[role];
        const tool = toolId ? tools[toolId] : undefined;
        if (!tool) {
          trailAttribute.setXYZ(index, 0, 0, 0);
          trailAttribute.setXYZ(index + 1, 0, 0, 0);
          continue;
        }
        const toolTip = roleToolTips[role];
        trailAttribute.setXYZ(index, toolTip.x, toolTip.y, toolTip.z);
        trailAttribute.setXYZ(index + 1, roleContacts[role].x, roleContacts[role].y, roleContacts[role].z);
      }
      trailAttribute.needsUpdate = true;
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const disposableMaterials = new Set<THREE.Material>();
      root.traverse((entry) => {
        if (entry instanceof THREE.Mesh || entry instanceof THREE.Points || entry instanceof THREE.LineSegments) {
          geometries.add(entry.geometry);
          const list = Array.isArray(entry.material) ? entry.material : [entry.material];
          list.forEach((material) => disposableMaterials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      disposableMaterials.forEach((material) => material.dispose());
    },
  };

  root.traverse((entry) => {
    if (entry instanceof THREE.Mesh || entry instanceof THREE.Points || entry instanceof THREE.LineSegments) theatre.metrics.meshes += 1;
  });
  const materialSet = new Set<THREE.Material>();
  root.traverse((entry) => {
    if (!(entry instanceof THREE.Mesh || entry instanceof THREE.Points || entry instanceof THREE.LineSegments)) return;
    (Array.isArray(entry.material) ? entry.material : [entry.material]).forEach((material) => materialSet.add(material));
  });
  theatre.metrics.materials = materialSet.size;
  theatre.metrics.drawCalls = theatre.metrics.meshes;
  const componentNodes = Object.fromEntries(CONSTRUCTION_COMPONENT_IDS.map((id) => [id, root.getObjectByName(id)]).filter((entry) => entry[1])) as Record<string, THREE.Object3D>;
  root.userData.sculptRuntime = {
    nodes: componentNodes,
    presentationOnly: true,
  };
  theatre.partManifest = {
    model: 'habitgame-construction-theatre',
    parts: Object.entries(componentNodes).map(([name, node]) => ({
      name,
      kind: String(node.userData.constructionPart?.kind ?? 'construction-component'),
      module: 'construction-presentation',
      triangles: trianglesFor(node),
    })),
    unnamedMeshes: 0,
    integralMeshes: theatre.metrics.meshes,
  };
  applyPresentation();
  theatre.metrics.visibleDrawCalls = visibleDrawCalls(root);
  theatre.metrics.visibleTriangles = trianglesFor(root, true);
  return theatre;
}
