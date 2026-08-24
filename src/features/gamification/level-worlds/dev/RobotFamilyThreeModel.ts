import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export type RobotRole = 'heavy-worker' | 'project-manager' | 'mini-artist';
export type RobotQuality = 'low' | 'high';
export type RobotMotion = 'idle' | 'listen' | 'work' | 'lift' | 'carry' | 'direct' | 'inspect' | 'paint' | 'celebrate';
export type RobotEmotion = 'focused' | 'friendly' | 'curious' | 'concerned' | 'delighted';
export type RobotBrainState = 'calm' | 'curious' | 'focused' | 'energized';
export type RobotAddonId = 'autonomous-arm' | 'holder' | 'lifter' | 'projector' | 'artist-tray' | 'brush';

export const ROBOT_ROLES: ReadonlyArray<{ id: RobotRole; label: string; purpose: string }> = [
  { id: 'heavy-worker', label: 'Heavy Worker', purpose: 'Doors, hauling and heavy lifting' },
  { id: 'project-manager', label: 'Project Manager / PA', purpose: 'Plans, coordinates and communicates' },
  { id: 'mini-artist', label: 'Mini Job Robot / Artist', purpose: 'Half-scale creative and precision helper' },
];

export const ROBOT_MOTIONS: ReadonlyArray<{ id: RobotMotion; label: string }> = [
  { id: 'idle', label: 'Idle hover' },
  { id: 'listen', label: 'Listen' },
  { id: 'work', label: 'Work' },
  { id: 'lift', label: 'Lift / install' },
  { id: 'carry', label: 'Carry / stabilize' },
  { id: 'direct', label: 'Direct project' },
  { id: 'inspect', label: 'Inspect work' },
  { id: 'paint', label: 'Paint / detail' },
  { id: 'celebrate', label: 'Celebrate' },
];

export const ROBOT_BRAIN_STATES: ReadonlyArray<{ id: RobotBrainState; label: string }> = [
  { id: 'calm', label: 'Calm waveform' },
  { id: 'curious', label: 'Curious network' },
  { id: 'focused', label: 'Focused progress' },
  { id: 'energized', label: 'Energized spiral' },
];

export const ROBOT_EMOTIONS: ReadonlyArray<{ id: RobotEmotion; label: string }> = [
  { id: 'focused', label: 'Focused' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'curious', label: 'Curious' },
  { id: 'concerned', label: 'Concerned' },
  { id: 'delighted', label: 'Delighted' },
];

export const ROBOT_ADDONS: ReadonlyArray<{ id: RobotAddonId; label: string }> = [
  { id: 'autonomous-arm', label: 'Autonomous arm' },
  { id: 'holder', label: 'Universal holder' },
  { id: 'lifter', label: 'Cargo lifter' },
  { id: 'projector', label: 'Hologram projector' },
  { id: 'artist-tray', label: 'Artist tray' },
  { id: 'brush', label: 'Brush / stylus' },
];

export const ROBOT_FAMILY_SCALE = {
  'heavy-worker': 1.18,
  'project-manager': 1,
  'mini-artist': 0.5,
} as const satisfies Record<RobotRole, number>;

interface RobotMaterials {
  white: THREE.MeshPhysicalMaterial;
  whiteDeep: THREE.MeshPhysicalMaterial;
  visorRim: THREE.MeshPhysicalMaterial;
  finShell: THREE.MeshPhysicalMaterial;
  visor: THREE.MeshPhysicalMaterial;
  dome: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshPhysicalMaterial;
  goldGlass: THREE.MeshPhysicalMaterial;
  gunmetal: THREE.MeshPhysicalMaterial;
  hoverBlue: THREE.MeshPhysicalMaterial;
  cyan: THREE.MeshStandardMaterial;
  mint: THREE.MeshStandardMaterial;
  cyanGlass: THREE.MeshPhysicalMaterial;
  glowComposite: THREE.MeshBasicMaterial;
  hoverGlowFace: THREE.ShaderMaterial;
  jointComposite: THREE.MeshStandardMaterial;
  lodComposite: THREE.MeshStandardMaterial;
  clay: THREE.MeshStandardMaterial;
}

interface BrainRig {
  root: THREE.Group;
  visuals: Record<RobotBrainState, THREE.Group>;
  core: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
}

interface FaceMarkConfig {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY?: number;
  rotationZ?: number;
}

interface FaceEyeAssembly {
  root: THREE.Group;
  mainEyes: THREE.InstancedMesh;
  eyeConfigs: ReadonlyArray<FaceMarkConfig>;
  pupils?: THREE.InstancedMesh;
  pupilConfigs?: ReadonlyArray<FaceMarkConfig>;
}

interface FaceRig extends FaceEyeAssembly {
  role: RobotRole;
  brows?: THREE.InstancedMesh;
  browConfigs: ReadonlyArray<FaceMarkConfig>;
  mouth: THREE.Object3D;
  mouthHomePosition: THREE.Vector3;
  gaze: THREE.Vector2;
  focus: THREE.Vector2 | null;
}

interface MemberRig {
  role: RobotRole;
  root: THREE.Group;
  body: THREE.Group;
  face: FaceRig;
  mouth: THREE.Object3D;
  articulated: THREE.Object3D[];
  joints: Record<string, THREE.Object3D>;
  brain?: BrainRig;
  liftLoad?: THREE.Group;
  baseY: number;
}

export interface RobotFamilyMetrics {
  meshes: number;
  triangles: number;
  materials: number;
  sockets: number;
  drawCalls: number;
}

export interface RobotPartManifest {
  model: string;
  parts: Array<{
    name: string;
    kind: string;
    module: string;
    triangles: number;
  }>;
  unnamedMeshes: number;
  integralMeshes: number;
}

export interface RobotFamilyModel {
  root: THREE.Group;
  members: Record<RobotRole, THREE.Group>;
  sockets: Record<string, THREE.Object3D>;
  addons: Record<RobotAddonId, THREE.Group>;
  metrics: RobotFamilyMetrics;
  partManifest: RobotPartManifest;
  motion: RobotMotion;
  memberMotions: Record<RobotRole, RobotMotion>;
  emotion: RobotEmotion;
  memberEmotions: Record<RobotRole, RobotEmotion | null>;
  brainState: RobotBrainState;
  setMotion: (motion: RobotMotion) => void;
  setMemberMotion: (role: RobotRole, motion: RobotMotion) => void;
  setEmotion: (emotion: RobotEmotion) => void;
  setMemberEmotion: (role: RobotRole, emotion: RobotEmotion | null) => void;
  setExternalRootMotion: (enabled: boolean) => void;
  setFaceFocus: (role: RobotRole, x: number, y: number) => void;
  clearFaceFocus: (role?: RobotRole) => void;
  setBrainState: (state: RobotBrainState) => void;
  setExploded: (amount: number) => void;
  setWireframe: (enabled: boolean) => void;
  setClay: (enabled: boolean) => void;
  setAddonVisible: (addon: RobotAddonId, visible: boolean) => void;
  update: (elapsedSeconds: number, deltaSeconds: number, reducedMotion?: boolean) => void;
  dispose: () => void;
}

const DEG = Math.PI / 180;

function createMaterials(): RobotMaterials {
  return {
    white: new THREE.MeshPhysicalMaterial({ color: 0xe7ebee, roughness: 0.19, metalness: 0.01, clearcoat: 0.98, clearcoatRoughness: 0.065, sheen: 0.08, sheenColor: 0xcfe7ff, envMapIntensity: 1.08 }),
    whiteDeep: new THREE.MeshPhysicalMaterial({ color: 0xaab6c1, roughness: 0.28, metalness: 0.16, clearcoat: 0.68, clearcoatRoughness: 0.12, envMapIntensity: 1.1 }),
    visorRim: new THREE.MeshPhysicalMaterial({ color: 0x8c9baa, roughness: 0.17, metalness: 0.72, clearcoat: 0.82, clearcoatRoughness: 0.075, envMapIntensity: 1.25 }),
    finShell: new THREE.MeshPhysicalMaterial({ color: 0xeaf7fb, vertexColors: true, emissive: 0x082738, emissiveIntensity: 0.16, roughness: 0.075, metalness: 0, transmission: 0.58, transparent: true, opacity: 0.76, ior: 1.46, thickness: 0.16, attenuationColor: new THREE.Color(0x86dcff), attenuationDistance: 0.72, clearcoat: 0.98, clearcoatRoughness: 0.045, envMapIntensity: 1.16, side: THREE.DoubleSide, depthWrite: false }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x010817, roughness: 0.1, metalness: 0.02, clearcoat: 0.38, clearcoatRoughness: 0.075, specularIntensity: 0.27, envMapIntensity: 0.46 }),
    dome: new THREE.MeshPhysicalMaterial({ color: 0xf3fbff, roughness: 0.018, metalness: 0, transmission: 0.94, transparent: true, opacity: 0.38, ior: 1.48, thickness: 0.3, attenuationColor: new THREE.Color(0xd6edff), attenuationDistance: 2.2, clearcoat: 1, clearcoatRoughness: 0.018, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }),
    gold: new THREE.MeshPhysicalMaterial({ color: 0xd48d18, roughness: 0.2, metalness: 0.9, clearcoat: 0.35, clearcoatRoughness: 0.08 }),
    goldGlass: new THREE.MeshPhysicalMaterial({
      color: 0x8f3f00,
      roughness: 0.042,
      metalness: 0,
      transmission: 0.42,
      transparent: true,
      opacity: 0.72,
      ior: 1.47,
      thickness: 0.32,
      attenuationColor: new THREE.Color(0xe67b0a),
      attenuationDistance: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    gunmetal: new THREE.MeshPhysicalMaterial({ color: 0x202b38, roughness: 0.31, metalness: 0.82, clearcoat: 0.18 }),
    hoverBlue: new THREE.MeshPhysicalMaterial({ color: 0x05245a, roughness: 0.56, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.34, envMapIntensity: 0.08 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x74eaff, emissive: 0x099bc7, emissiveIntensity: 1.8, roughness: 0.18, metalness: 0.05, toneMapped: false }),
    mint: new THREE.MeshStandardMaterial({ color: 0x79f5d9, emissive: 0x119f7f, emissiveIntensity: 1.75, roughness: 0.18, toneMapped: false }),
    cyanGlass: new THREE.MeshPhysicalMaterial({ color: 0x45dfff, emissive: 0x126f9c, emissiveIntensity: 1.7, transmission: 0.36, transparent: true, opacity: 0.72, roughness: 0.08, metalness: 0.1, depthWrite: false }),
    glowComposite: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    hoverGlowFace: new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * vec2(1.0, 1.65);
          float radius = length(p);
          float mask = 1.0 - smoothstep(0.34, 0.52, radius);
          float whiteCore = 1.0 - smoothstep(0.0, 0.18, radius);
          float cyanCore = 1.0 - smoothstep(0.12, 0.38, radius);
          vec3 deepBlue = vec3(0.01, 0.22, 0.72);
          vec3 cyan = vec3(0.16, 0.86, 1.0);
          vec3 color = mix(deepBlue, cyan, cyanCore);
          color = mix(color, vec3(0.92, 1.0, 1.0), whiteCore * 0.9);
          gl_FragColor = vec4(color, mask * 0.98);
        }
      `,
    }),
    jointComposite: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.72, envMapIntensity: 1.25 }),
    lodComposite: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.38, envMapIntensity: 1.05 }),
    clay: new THREE.MeshStandardMaterial({ color: 0x66737d, roughness: 0.76, metalness: 0 }),
  };
}

function namePart<T extends THREE.Object3D>(part: T, name: string, role: RobotRole | 'shared', kind: string): T {
  part.name = name;
  part.userData.robotPart = { name, role, kind, clickable: true, explodable: true };
  return part;
}

function addMesh(
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  role: RobotRole | 'shared',
  position: readonly [number, number, number] = [0, 0, 0],
  rotation: readonly [number, number, number] = [0, 0, 0],
  scale: readonly [number, number, number] = [1, 1, 1],
): THREE.Mesh {
  const mesh = namePart(new THREE.Mesh(geometry, material), name, role, 'mesh');
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.homePosition = mesh.position.clone();
  parent.add(mesh);
  return mesh;
}

interface ColoredGeometryPart {
  geometry: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
}

function mergeColoredParts(parts: ColoredGeometryPart[]): THREE.BufferGeometry {
  const geometries = parts.map(({ geometry, color, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    geometry.applyMatrix4(matrix);
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
  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error('Could not merge robot geometry parts');
  return merged;
}

function consolidateLowStaticMeshes(
  body: THREE.Group,
  role: RobotRole,
  names: readonly string[],
  material: THREE.Material,
) {
  body.updateWorldMatrix(true, true);
  const bodyInverse = body.matrixWorld.clone().invert();
  const geometries: THREE.BufferGeometry[] = [];

  names.forEach((name) => {
    const object = body.getObjectByName(name);
    if (!(object instanceof THREE.Mesh)) return;
    object.updateWorldMatrix(true, false);
    const materialList = Array.isArray(object.material) ? object.material : [object.material];
    const sourceMaterial = materialList[0];
    const sourceColor = 'color' in sourceMaterial && sourceMaterial.color instanceof THREE.Color
      ? sourceMaterial.color
      : new THREE.Color(0xffffff);
    const instanceCount = object instanceof THREE.InstancedMesh ? object.count : 1;
    for (let instance = 0; instance < instanceCount; instance += 1) {
      const geometry = object.geometry.clone();
      const relative = bodyInverse.clone().multiply(object.matrixWorld);
      if (object instanceof THREE.InstancedMesh) {
        const instanceMatrix = new THREE.Matrix4();
        object.getMatrixAt(instance, instanceMatrix);
        relative.multiply(instanceMatrix);
      }
      geometry.applyMatrix4(relative);
      if (!geometry.getAttribute('color')) {
        const colorValues = new Float32Array((geometry.getAttribute('position')?.count ?? 0) * 3);
        for (let offset = 0; offset < colorValues.length; offset += 3) {
          colorValues[offset] = sourceColor.r;
          colorValues[offset + 1] = sourceColor.g;
          colorValues[offset + 2] = sourceColor.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colorValues, 3));
      }
      geometries.push(geometry);
    }
    const parent = object.parent;
    parent?.remove(object);
    if (parent) {
      const placeholder = namePart(new THREE.Group(), name, role, 'integrated-phone-detail');
      placeholder.userData = { ...object.userData, integratedInto: `${role}-phone-static-composite` };
      parent.add(placeholder);
    }
  });

  if (geometries.length < 2) return;
  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error(`Could not consolidate ${role} phone static geometry`);
  const mesh = addMesh(body, `${role}-phone-static-composite`, merged, material, role);
  mesh.userData.v18ConstructionLod = 'static-shell-service-and-trim-consolidated-with-animated-face-and-joints-preserved';
}

function materialColor(material: THREE.Material, fallback: THREE.ColorRepresentation): THREE.ColorRepresentation {
  return 'color' in material && material.color instanceof THREE.Color ? material.color : fallback;
}

function addInstancedPart(
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  role: RobotRole | 'shared',
  matrices: THREE.Matrix4[],
): THREE.InstancedMesh {
  const mesh = namePart(new THREE.InstancedMesh(geometry, material, matrices.length), name, role, 'instanced-mesh');
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function composeMatrix(
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
  scale: readonly [number, number, number] = [1, 1, 1],
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
}

function createSocket(parent: THREE.Object3D, sockets: Record<string, THREE.Object3D>, id: string, position: readonly [number, number, number], rotation: readonly [number, number, number] = [0, 0, 0]) {
  const socket = namePart(new THREE.Group(), id, 'shared', 'socket');
  socket.position.set(...position);
  socket.rotation.set(...rotation);
  socket.userData.socket = { id, compatible: [...ROBOT_ADDONS.map((entry) => entry.id)] };
  parent.add(socket);
  sockets[id] = socket;
  return socket;
}

function sphere(quality: RobotQuality, widthSegments?: number, heightSegments?: number) {
  const segments = quality === 'high' ? 36 : 14;
  return new THREE.SphereGeometry(1, widthSegments ?? segments, heightSegments ?? Math.round(segments * 0.7));
}

function createManagerPearShellGeometry(quality: RobotQuality) {
  const geometry = sphere(quality, quality === 'high' ? 37 : 16, quality === 'high' ? 26 : 11);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const lower = Math.max(0, -y);
    const upper = Math.max(0, y);
    const cheek = 1 + 0.085 * (1 - y * y) - 0.12 * lower * lower - 0.035 * upper;
    const chinDrop = 1 - 0.17 * lower;
    const frontRound = z > 0 ? 1 + 0.035 * (1 - y * y) : 1;
    const visorX = Math.abs(x) / 0.92;
    const visorY = Math.abs(y - 0.04) / 0.68;
    const visorMetric = visorX ** 4 + visorY ** 4;
    const visorSeat = z > 0 && visorMetric < 1
      ? 0.16 * (1 - THREE.MathUtils.smoothstep(visorMetric, 0.16, 1))
      : 0;
    position.setXYZ(index, x * cheek, y * chinDrop, (z - visorSeat) * frontRound);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createHeavyLoadShellGeometry(quality: RobotQuality) {
  const geometry = sphere(quality, quality === 'high' ? 36 : 16, quality === 'high' ? 24 : 11);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const lower = Math.max(0, -y);
    const upper = Math.max(0, y);
    const shoulderBarrel = 1 + 0.13 * (1 - Math.min(1, Math.abs(y - 0.12) * 1.45));
    const lowerTaper = 1 - 0.16 * lower * lower;
    const crownTaper = 1 - 0.07 * upper * upper;
    position.setXYZ(
      index,
      x * shoulderBarrel * lowerTaper * crownTaper,
      y * (1 - 0.045 * lower),
      z * (0.97 + 0.055 * (1 - y * y) - 0.035 * lower),
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createMiniMakerShellGeometry(quality: RobotQuality) {
  const geometry = sphere(quality, quality === 'high' ? 32 : 16, quality === 'high' ? 22 : 11);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const lower = Math.max(0, -y);
    const cheek = 1 + 0.07 * (1 - y * y);
    position.setXYZ(index, x * cheek * (1 - 0.1 * lower * lower), y * (1 - 0.035 * lower), z * (1 + 0.035 * (1 - y * y)));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createManagerHoverCrescentGeometry(quality: RobotQuality, radius: number) {
  const profile = [
    new THREE.Vector2(0, radius * 0.31),
    new THREE.Vector2(radius * 0.48, radius * 0.27),
    new THREE.Vector2(radius * 0.9, radius * 0.08),
    new THREE.Vector2(radius * 0.86, radius * -0.12),
    new THREE.Vector2(radius * 0.56, radius * -0.24),
    new THREE.Vector2(0, radius * -0.27),
  ];
  return new THREE.LatheGeometry(profile, quality === 'high' ? 56 : 18);
}

function capsule(quality: RobotQuality, radius = 0.16, length = 0.42) {
  const segments = quality === 'high' ? 12 : 5;
  return new THREE.CapsuleGeometry(radius, length, quality === 'high' ? 8 : 3, segments);
}

function createRing(parent: THREE.Object3D, name: string, role: RobotRole, material: THREE.Material, position: readonly [number, number, number], scale: readonly [number, number, number], rotation: readonly [number, number, number] = [0, 0, 0], quality: RobotQuality = 'high') {
  return addMesh(parent, name, new THREE.TorusGeometry(1, 0.13, quality === 'high' ? 10 : 5, quality === 'high' ? 32 : 16), material, role, position, rotation, scale);
}

function createExtrudedPlate(
  points: ReadonlyArray<readonly [number, number]>,
  depth: number,
  quality: RobotQuality,
) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: quality === 'high' ? 12 : 5,
    bevelEnabled: true,
    bevelSegments: quality === 'high' ? 2 : 1,
    bevelSize: quality === 'high' ? 0.025 : 0.015,
    bevelThickness: quality === 'high' ? 0.018 : 0.01,
  });
  geometry.translate(0, 0, -depth * 0.5);
  return mergeVertices(geometry, 1e-5);
}

function createManagerFinPlate(quality: RobotQuality) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.04, -0.21);
  shape.bezierCurveTo(0.2, -0.34, 0.58, -0.31, 0.88, -0.14);
  shape.quadraticCurveTo(1.04, -0.055, 1.17, 0.035);
  shape.quadraticCurveTo(0.98, 0.16, 0.72, 0.27);
  shape.bezierCurveTo(0.43, 0.39, 0.13, 0.35, -0.03, 0.22);
  shape.quadraticCurveTo(-0.13, 0.02, -0.04, -0.21);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.24,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: quality === 'high' ? 3 : 1,
    bevelSize: quality === 'high' ? 0.045 : 0.024,
    bevelThickness: quality === 'high' ? 0.04 : 0.02,
  });
  geometry.translate(0, 0, -0.12);
  return mergeVertices(geometry, 1e-5);
}

function createRoundedRectanglePlate(width: number, height: number, radius: number, depth: number, quality: RobotQuality) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: quality === 'high' ? 12 : 5,
    bevelEnabled: true,
    bevelSegments: quality === 'high' ? 3 : 1,
    bevelSize: quality === 'high' ? 0.035 : 0.02,
    bevelThickness: quality === 'high' ? 0.025 : 0.015,
  });
  geometry.translate(0, 0, -depth * 0.5);
  return mergeVertices(geometry, 1e-5);
}

function bendManagerFrontPanel(
  geometry: THREE.BufferGeometry,
  width: number,
  height: number,
  edgeDepth: number,
  verticalDepth: number,
) {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  for (let index = 0; index < position.count; index += 1) {
    const normalizedX = Math.min(1, Math.abs(position.getX(index)) / halfWidth);
    const normalizedY = Math.min(1, Math.abs(position.getY(index)) / halfHeight);
    const shellRecess = edgeDepth * normalizedX ** 2 + verticalDepth * normalizedY ** 2;
    position.setZ(index, position.getZ(index) - shellRecess);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createManagerConformingVisorGeometry(
  width: number,
  height: number,
  depth: number,
  edgeDepth: number,
  verticalDepth: number,
  quality: RobotQuality,
) {
  const radialSegments = quality === 'high' ? 9 : 4;
  const angularSegments = quality === 'high' ? 64 : 24;
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const positions: number[] = [];
  const indices: number[] = [];

  const surfaceDepth = (x: number, y: number) => (
    -edgeDepth * (x / halfWidth) ** 2 - verticalDepth * (y / halfHeight) ** 2
  );
  const addSurface = (back: boolean) => {
    const start = positions.length / 3;
    positions.push(0, 0, back ? -depth : 0);
    for (let ring = 1; ring <= radialSegments; ring += 1) {
      const radius = ring / radialSegments;
      for (let segment = 0; segment < angularSegments; segment += 1) {
        const angle = segment / angularSegments * Math.PI * 2;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const x = halfWidth * Math.sign(cosine) * Math.sqrt(Math.abs(cosine)) * radius;
        const y = halfHeight * Math.sign(sine) * Math.sqrt(Math.abs(sine)) * radius;
        positions.push(x, y, surfaceDepth(x, y) - (back ? depth : 0));
      }
    }
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const current = start + 1 + segment;
      const next = start + 1 + (segment + 1) % angularSegments;
      indices.push(...(back ? [start, next, current] : [start, current, next]));
    }
    for (let ring = 1; ring < radialSegments; ring += 1) {
      const inner = start + 1 + (ring - 1) * angularSegments;
      const outer = inner + angularSegments;
      for (let segment = 0; segment < angularSegments; segment += 1) {
        const next = (segment + 1) % angularSegments;
        if (back) {
          indices.push(inner + segment, outer + next, outer + segment, inner + segment, inner + next, outer + next);
        } else {
          indices.push(inner + segment, outer + segment, outer + next, inner + segment, outer + next, inner + next);
        }
      }
    }
    return start;
  };

  const frontStart = addSurface(false);
  const backStart = addSurface(true);
  const frontOuter = frontStart + 1 + (radialSegments - 1) * angularSegments;
  const backOuter = backStart + 1 + (radialSegments - 1) * angularSegments;
  for (let segment = 0; segment < angularSegments; segment += 1) {
    const next = (segment + 1) % angularSegments;
    indices.push(
      frontOuter + segment, backOuter + segment, backOuter + next,
      frontOuter + segment, backOuter + next, frontOuter + next,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createManagerShellSurfaceGeometry(quality: RobotQuality, materials: RobotMaterials) {
  const segments = quality === 'high' ? 22 : 12;
  const radialSegments = quality === 'high' ? 6 : 4;
  const parts: ColoredGeometryPart[] = [];
  const addSeam = (points: THREE.Vector3[], color = materials.whiteDeep.color, radius = 0.012) => {
    parts.push({
      geometry: new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points, false, 'centripetal'),
        segments,
        radius,
        radialSegments,
        false,
      ),
      color,
    });
  };

  for (const side of [-1, 1] as const) {
    addSeam([
      new THREE.Vector3(side * 0.92, 0.54, 0.46),
      new THREE.Vector3(side * 1.08, 0.45, 0.08),
      new THREE.Vector3(side * 1.14, 0.34, -0.18),
      new THREE.Vector3(side * 1.03, 0.3, -0.6),
      new THREE.Vector3(side * 0.78, 0.38, -0.82),
    ]);
    addSeam([
      new THREE.Vector3(side * 0.94, -0.45, 0.43),
      new THREE.Vector3(side * 1.03, -0.52, 0.08),
      new THREE.Vector3(side * 0.96, -0.55, -0.42),
      new THREE.Vector3(side * 0.69, -0.5, -0.79),
    ], materials.gunmetal.color, 0.009);
  }
  addSeam([
    new THREE.Vector3(0, 0.76, -0.7),
    new THREE.Vector3(0, 0.55, -0.93),
    new THREE.Vector3(0, 0.22, -1.065),
    new THREE.Vector3(0, -0.2, -1.06),
    new THREE.Vector3(0, -0.58, -0.85),
  ], materials.gunmetal.color, 0.01);

  return mergeColoredParts(parts);
}

function createManagerRearServiceGeometry(quality: RobotQuality, materials: RobotMaterials) {
  const ringSegments = quality === 'high' ? 32 : 18;
  const parts: ColoredGeometryPart[] = [
    { geometry: createRoundedRectanglePlate(0.74, 0.61, 0.16, 0.075, quality), color: materials.gunmetal.color, position: [0, -0.035, -1.078] },
    { geometry: createRoundedRectangleFrame(0.84, 0.7, 0.19, 0.7, 0.56, 0.13, 0.075, quality), color: materials.whiteDeep.color, position: [0, -0.035, -1.112] },
    { geometry: new THREE.TorusGeometry(0.215, 0.047, quality === 'high' ? 9 : 5, ringSegments), color: materials.visorRim.color, position: [0, 0.035, -1.155] },
    { geometry: new THREE.TorusGeometry(0.145, 0.03, quality === 'high' ? 8 : 5, ringSegments), color: materials.gold.color, position: [0, 0.035, -1.184] },
    { geometry: new THREE.CylinderGeometry(0.105, 0.105, 0.072, ringSegments), color: materials.hoverBlue.color, position: [0, 0.035, -1.205], rotation: [90 * DEG, 0, 0] },
    { geometry: new THREE.CylinderGeometry(0.057, 0.057, 0.08, ringSegments), color: materials.cyan.color, position: [0, 0.035, -1.225], rotation: [90 * DEG, 0, 0] },
    { geometry: new THREE.BoxGeometry(0.31, 0.045, 0.035), color: materials.whiteDeep.color, position: [0, -0.225, -1.185] },
    { geometry: new THREE.BoxGeometry(0.17, 0.33, 0.045), color: materials.gunmetal.color, position: [0, 0.55, -0.93] },
    { geometry: createRoundedRectanglePlate(0.25, 0.17, 0.045, 0.045, quality), color: materials.gold.color, position: [0, 0.72, -0.91] },
  ];

  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    parts.push({
      geometry: new THREE.CylinderGeometry(0.026, 0.026, 0.052, quality === 'high' ? 10 : 6),
      color: index % 2 === 0 ? materials.whiteDeep.color : materials.gold.color,
      position: [Math.cos(angle) * 0.31, 0.035 + Math.sin(angle) * 0.245, -1.176],
      rotation: [90 * DEG, 0, 0],
    });
  }
  for (const side of [-1, 1] as const) {
    parts.push(
      { geometry: new THREE.BoxGeometry(0.085, 0.3, 0.045), color: materials.gold.color, position: [side * 0.27, -0.02, -1.175] },
      { geometry: new THREE.SphereGeometry(0.045, quality === 'high' ? 12 : 7, quality === 'high' ? 8 : 5), color: materials.cyan.color, position: [side * 0.27, 0.205, -1.19] },
      { geometry: new THREE.BoxGeometry(0.13, 0.035, 0.042), color: materials.visorRim.color, position: [side * 0.22, -0.285, -1.17] },
    );
  }
  return mergeColoredParts(parts);
}

function createManagerHoverBaffleGeometry(quality: RobotQuality, radius: number, materials: RobotMaterials) {
  const segments = quality === 'high' ? 40 : 20;
  const parts: ColoredGeometryPart[] = [
    { geometry: new THREE.TorusGeometry(radius * 0.68, radius * 0.055, quality === 'high' ? 9 : 5, segments), color: materials.hoverBlue.color, position: [0, radius * -0.235, 0], rotation: [90 * DEG, 0, 0], scale: [1, 1, 0.88] },
    { geometry: new THREE.TorusGeometry(radius * 0.49, radius * 0.043, quality === 'high' ? 8 : 5, segments), color: materials.gunmetal.color, position: [0, radius * -0.253, 0], rotation: [90 * DEG, 0, 0], scale: [1, 1, 0.9] },
    { geometry: new THREE.TorusGeometry(radius * 0.3, radius * 0.035, quality === 'high' ? 7 : 4, segments), color: materials.cyan.color, position: [0, radius * -0.27, 0], rotation: [90 * DEG, 0, 0], scale: [1, 1, 0.92] },
    { geometry: new THREE.CylinderGeometry(radius * 0.22, radius * 0.18, radius * 0.095, segments), color: materials.hoverBlue.color, position: [0, radius * -0.28, 0] },
  ];
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const ventRadius = radius * 0.58;
    parts.push({
      geometry: new THREE.BoxGeometry(radius * 0.115, radius * 0.025, radius * 0.26),
      color: materials.gunmetal.color,
      position: [Math.sin(angle) * ventRadius, radius * -0.245, Math.cos(angle) * ventRadius * 0.88],
      rotation: [0, angle, 0],
    });
  }
  return mergeColoredParts(parts);
}

function createRoundedRectangleFrame(
  outerWidth: number,
  outerHeight: number,
  outerRadius: number,
  innerWidth: number,
  innerHeight: number,
  innerRadius: number,
  depth: number,
  quality: RobotQuality,
) {
  const shape = new THREE.Shape();
  const outerHalfWidth = outerWidth * 0.5;
  const outerHalfHeight = outerHeight * 0.5;
  shape.moveTo(-outerHalfWidth + outerRadius, -outerHalfHeight);
  shape.lineTo(outerHalfWidth - outerRadius, -outerHalfHeight);
  shape.quadraticCurveTo(outerHalfWidth, -outerHalfHeight, outerHalfWidth, -outerHalfHeight + outerRadius);
  shape.lineTo(outerHalfWidth, outerHalfHeight - outerRadius);
  shape.quadraticCurveTo(outerHalfWidth, outerHalfHeight, outerHalfWidth - outerRadius, outerHalfHeight);
  shape.lineTo(-outerHalfWidth + outerRadius, outerHalfHeight);
  shape.quadraticCurveTo(-outerHalfWidth, outerHalfHeight, -outerHalfWidth, outerHalfHeight - outerRadius);
  shape.lineTo(-outerHalfWidth, -outerHalfHeight + outerRadius);
  shape.quadraticCurveTo(-outerHalfWidth, -outerHalfHeight, -outerHalfWidth + outerRadius, -outerHalfHeight);

  const hole = new THREE.Path();
  const innerHalfWidth = innerWidth * 0.5;
  const innerHalfHeight = innerHeight * 0.5;
  hole.moveTo(-innerHalfWidth + innerRadius, -innerHalfHeight);
  hole.quadraticCurveTo(-innerHalfWidth, -innerHalfHeight, -innerHalfWidth, -innerHalfHeight + innerRadius);
  hole.lineTo(-innerHalfWidth, innerHalfHeight - innerRadius);
  hole.quadraticCurveTo(-innerHalfWidth, innerHalfHeight, -innerHalfWidth + innerRadius, innerHalfHeight);
  hole.lineTo(innerHalfWidth - innerRadius, innerHalfHeight);
  hole.quadraticCurveTo(innerHalfWidth, innerHalfHeight, innerHalfWidth, innerHalfHeight - innerRadius);
  hole.lineTo(innerHalfWidth, -innerHalfHeight + innerRadius);
  hole.quadraticCurveTo(innerHalfWidth, -innerHalfHeight, innerHalfWidth - innerRadius, -innerHalfHeight);
  hole.lineTo(-innerHalfWidth + innerRadius, -innerHalfHeight);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: quality === 'high' ? 12 : 5,
    bevelEnabled: true,
    bevelSegments: quality === 'high' ? 3 : 1,
    bevelSize: quality === 'high' ? 0.025 : 0.015,
    bevelThickness: quality === 'high' ? 0.018 : 0.01,
  });
  geometry.translate(0, 0, -depth * 0.5);
  return mergeVertices(geometry, 1e-5);
}

function createHeavyCanopyFrameGeometry(quality: RobotQuality, materials: RobotMaterials) {
  const parts: ColoredGeometryPart[] = [
    {
      geometry: new THREE.TorusGeometry(1, 0.075, quality === 'high' ? 9 : 6, quality === 'high' ? 36 : 18),
      color: materials.gold.color,
      position: [0, 0.67, 0.31],
      rotation: [90 * DEG, 0, 0],
      scale: [0.98, 0.82, 0.98],
    },
    {
      geometry: new THREE.TorusGeometry(1, 0.035, quality === 'high' ? 7 : 5, quality === 'high' ? 32 : 16),
      color: materials.gunmetal.color,
      position: [0, 0.625, 0.31],
      rotation: [90 * DEG, 0, 0],
      scale: [0.88, 0.74, 0.88],
    },
    {
      geometry: new THREE.TorusGeometry(1, 0.026, quality === 'high' ? 7 : 5, quality === 'high' ? 32 : 16),
      color: materials.gold.color,
      position: [0, 0.87, 0.31],
      rotation: [90 * DEG, 0, 0],
      scale: [0.72, 0.56, 0.72],
    },
    {
      geometry: new THREE.TorusGeometry(1, 0.022, quality === 'high' ? 7 : 5, quality === 'high' ? 28 : 14),
      color: materials.gold.color,
      position: [0, 1.02, 0.31],
      rotation: [90 * DEG, 0, 0],
      scale: [0.48, 0.34, 0.48],
    },
  ];
  for (const x of [-0.72, -0.36, 0, 0.36, 0.72]) {
    const frontDepth = 0.53 + Math.sqrt(Math.max(0, 0.88 ** 2 - x ** 2)) * 0.76;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, 0.68, frontDepth),
      new THREE.Vector3(x * 0.52, 0.99, 1.08),
      new THREE.Vector3(x * 0.12, 1.12, 0.57),
    );
    parts.push({
      geometry: new THREE.TubeGeometry(curve, quality === 'high' ? 12 : 7, quality === 'high' ? 0.026 : 0.024, quality === 'high' ? 7 : 5, false),
      color: materials.gold.color,
    });
  }
  return mergeColoredParts(parts);
}

function createHoverCore(parent: THREE.Object3D, role: RobotRole, quality: RobotQuality, materials: RobotMaterials, accent: THREE.Material, y: number, radius: number, integratedCrescent = false) {
  const root = namePart(new THREE.Group(), `${role}-hover-core`, role, 'hover-core');
  root.position.y = y;
  parent.add(root);
  if (integratedCrescent) {
    const housing = addMesh(root, `${role}-hover-housing`, createManagerHoverCrescentGeometry(quality, radius), materials.hoverBlue, role, [0, 0, -0.03], [0, 0, 0], [1.08, 1, 0.9]);
    housing.userData.v12IntegratedHoverCrescent = 'squashed-volumetric-crescent-overlapped-by-lower-white-shell';
    housing.userData.v13HoverCrescentCoat = 'glossy-dark-blue-shell-with-white-chin-overlap';
    housing.userData.v15HoverLenticularCrossSection = 'closed-lathed-lenticular-volume-embedded-beneath-white-chin';
    const wrappedGlowMaterial = new THREE.MeshBasicMaterial({ color: 0x0bbcff, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const wrappedGlow = addMesh(root, `${role}-v15-hover-wrapped-glow`, sphere(quality, quality === 'high' ? 30 : 16, quality === 'high' ? 18 : 10), wrappedGlowMaterial, role, [0, -0.09, 0.025], [0, 0, 0], [radius * 0.64, radius * 0.12, radius * 0.5]);
    wrappedGlow.renderOrder = 2;
    wrappedGlow.castShadow = false;
    wrappedGlow.receiveShadow = false;
    wrappedGlow.userData.explodeWithParent = true;
    const hoverLight = addMesh(root, `${role}-hover-light`, new THREE.CircleGeometry(1, quality === 'high' ? 48 : 24), materials.hoverGlowFace, role, [0, radius * -0.29, 0], [90 * DEG, 0, 0], [radius * 0.66, radius * 0.66, 1]);
    hoverLight.renderOrder = 3;
    hoverLight.userData.v13HoverHotspotFalloff = 'deep-blue-to-cyan-to-white-nested-volume-with-vent-streaks';
    hoverLight.userData.v15HoverEmitter = 'underside-facing-emitter-nested-inside-closed-underbody-volume';
    const baffles = addMesh(root, `${role}-v16-hover-baffle-and-vent-system`, createManagerHoverBaffleGeometry(quality, radius, materials), quality === 'high' ? materials.jointComposite : materials.lodComposite, role);
    baffles.userData.v16ProtectedHoverCore = 'nested-concentric-baffles-twelve-radial-vents-dark-cavity-and-recessed-emissive-core';
    baffles.userData.explodeWithParent = true;
  } else {
    addMesh(root, `${role}-hover-housing`, new THREE.CylinderGeometry(radius, radius * 0.8, 0.18, quality === 'high' ? 40 : 18), materials.gunmetal, role, [0, 0, 0], [0, 0, 0]);
    addMesh(root, `${role}-hover-light`, new THREE.CylinderGeometry(radius * 0.77, radius * 0.58, 0.08, quality === 'high' ? 40 : 18), accent, role, [0, -0.09, 0]);
  }
  const glowMaterial = new THREE.MeshBasicMaterial({ color: accent === materials.mint ? 0x5affe0 : 0x55ddff, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending });
  const hoverGlow = addMesh(root, `${role}-hover-glow`, new THREE.CylinderGeometry(radius * 0.82, radius * 1.28, 0.46, 32, 1, true), glowMaterial, role, [0, -0.28, 0]);
  hoverGlow.castShadow = false;
  hoverGlow.receiveShadow = false;
  hoverGlow.userData.presentationEffect = true;
  return root;
}

function createFaceMark(parent: THREE.Object3D, name: string, role: RobotRole, material: THREE.Material, position: readonly [number, number, number], scale: readonly [number, number, number], rotationZ = 0) {
  const mark = addMesh(parent, name, sphere('high', 24, 16), material, role, position, [0, 0, rotationZ], scale);
  mark.renderOrder = 4;
  return mark;
}

function createFaceMarkPair(
  parent: THREE.Object3D,
  role: RobotRole,
  quality: RobotQuality,
  material: THREE.Material,
  configs: ReadonlyArray<FaceMarkConfig>,
): FaceEyeAssembly {
  const rig = namePart(new THREE.Group(), `${role}-eye-pair-rig`, role, 'face-rig');
  parent.add(rig);
  const mainEyes = addInstancedPart(
    rig,
    `${role}-eye-pair`,
    sphere(quality, quality === 'high' ? 24 : 14, quality === 'high' ? 16 : 10),
    material,
    role,
    configs.map((config) => composeMatrix(config.position, [0, 0, config.rotationZ ?? 0], config.scale)),
  );
  mainEyes.renderOrder = 4;
  return { root: rig, mainEyes, eyeConfigs: configs };
}

function createHeavyEyePair(
  parent: THREE.Object3D,
  quality: RobotQuality,
  material: THREE.Material,
  configs: ReadonlyArray<FaceMarkConfig>,
): FaceEyeAssembly {
  const role: RobotRole = 'heavy-worker';
  const rig = namePart(new THREE.Group(), `${role}-eye-pair-rig`, role, 'face-rig');
  parent.add(rig);
  const eyeShape = new THREE.Shape();
  eyeShape.moveTo(-0.72, 0.78);
  eyeShape.lineTo(0.72, 0.58);
  eyeShape.quadraticCurveTo(0.78, 0.5, 0.72, 0.28);
  eyeShape.lineTo(0.55, -0.52);
  eyeShape.quadraticCurveTo(0.48, -0.8, 0.18, -0.84);
  eyeShape.lineTo(-0.22, -0.8);
  eyeShape.quadraticCurveTo(-0.58, -0.72, -0.64, -0.38);
  eyeShape.lineTo(-0.72, 0.78);
  const eyeGeometry = quality === 'high'
    ? new THREE.ExtrudeGeometry(eyeShape, { depth: 0.08, steps: 1, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.035, bevelThickness: 0.025 })
    : new THREE.ShapeGeometry(eyeShape, 6);
  eyeGeometry.center();
  const mainEyes = addInstancedPart(
    rig,
    `${role}-eye-pair`,
    eyeGeometry,
    material,
    role,
    configs.map((config) => composeMatrix(config.position, [0, 0, config.rotationZ ?? 0], config.scale)),
  );
  mainEyes.renderOrder = 4;
  return { root: rig, mainEyes, eyeConfigs: configs };
}

function createManagerEyePair(parent: THREE.Object3D, quality: RobotQuality, materials: RobotMaterials): FaceEyeAssembly {
  const role: RobotRole = 'project-manager';
  const rig = namePart(new THREE.Group(), `${role}-eye-pair-rig`, role, 'face-rig');
  parent.add(rig);
  const positions: Array<readonly [number, number, number]> = [[-0.5, 0.2, 0.91], [0.5, 0.2, 0.91]];
  const eyeConfigs: ReadonlyArray<FaceMarkConfig> = positions.map((position) => ({
    position,
    scale: [0.23, 0.23, 0.06],
    rotationY: position[0] < 0 ? -20 * DEG : 20 * DEG,
  }));
  const pupilConfigs: ReadonlyArray<FaceMarkConfig> = positions.map(([x, y, z]) => ({ position: [x + 0.022, y + 0.03, z + 0.012], scale: [0.055, 0.055, 0.012] }));
  const mainEyes = addInstancedPart(
    rig,
    `${role}-eye-ring-pair`,
    new THREE.TorusGeometry(1, 0.13, quality === 'high' ? 10 : 6, quality === 'high' ? 32 : 16),
    materials.cyan,
    role,
    eyeConfigs.map((config) => composeMatrix(config.position, [0, config.rotationY ?? 0, 0], config.scale)),
  );
  const pupils = addInstancedPart(
    rig,
    `${role}-pupil-pair`,
    sphere(quality),
    materials.cyan,
    role,
    pupilConfigs.map((config) => composeMatrix(config.position, [0, 0, 0], config.scale)),
  );
  mainEyes.renderOrder = 4;
  pupils.renderOrder = 5;
  rig.userData.v14FaceLandmarks = 'smaller-eye-rings-with-reference-locked-wide-friendly-spacing';
  return { root: rig, mainEyes, eyeConfigs, pupils, pupilConfigs };
}

function createSmile(parent: THREE.Object3D, role: RobotRole, material: THREE.Material, position: readonly [number, number, number], scale = 1) {
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-0.18 * scale, 0.04 * scale, 0),
    new THREE.Vector3(-0.07 * scale, -0.12 * scale, 0),
    new THREE.Vector3(0.07 * scale, -0.12 * scale, 0),
    new THREE.Vector3(0.18 * scale, 0.04 * scale, 0),
  );
  return addMesh(parent, `${role}-smile`, new THREE.TubeGeometry(curve, 18, 0.025 * scale, 8, false), material, role, position);
}

function createManagerCapsuleSmile(parent: THREE.Object3D, quality: RobotQuality, material: THREE.Material) {
  const role: RobotRole = 'project-manager';
  const rig = namePart(new THREE.Group(), `${role}-smile`, role, 'animated-capsule-smile');
  rig.position.set(0, -0.1, 0.99);
  parent.add(rig);
  addMesh(
    rig,
    `${role}-smile-capsule-light`,
    new THREE.CapsuleGeometry(0.06, 0.15, quality === 'high' ? 7 : 4, quality === 'high' ? 12 : 7),
    material,
    role,
    [0, 0, 0],
    [0, 0, 90 * DEG],
    [1, 1, 0.16],
  );
  rig.userData.v13CapsuleSmile = 'short-soft-cyan-capsule-preserving-expression-rig-scaling-and-flip';
  rig.userData.v14CapsuleMouth = 'reference-width-capsule-preserving-expression-rig-scaling-and-flip';
  return rig;
}

function createFaceRig(
  parent: THREE.Object3D,
  role: RobotRole,
  quality: RobotQuality,
  material: THREE.Material,
  eyes: FaceEyeAssembly,
  mouth: THREE.Object3D,
): FaceRig {
  const browLiftByRole: Record<RobotRole, number> = {
    'heavy-worker': 0.19,
    'project-manager': 0.27,
    'mini-artist': 0.29,
  };
  const browScaleByRole: Record<RobotRole, readonly [number, number, number]> = {
    'heavy-worker': [0.64, 0.58, 0.4],
    'project-manager': [0.92, 0.88, 0.16],
    'mini-artist': [1.04, 0.94, 0.5],
  };
  const browConfigs: ReadonlyArray<FaceMarkConfig> = eyes.eyeConfigs.map((eye, index) => ({
    position: [eye.position[0], eye.position[1] + browLiftByRole[role], eye.position[2] + (role === 'project-manager' ? 0.025 : 0.055)],
    scale: browScaleByRole[role],
    rotationZ: (90 + (index === 0 ? -1 : 1) * (role === 'heavy-worker' ? 9 : 3)) * DEG,
  }));
  const brows = quality === 'high'
    ? addInstancedPart(
      parent,
      `${role}-animated-brow-pair`,
      new THREE.CapsuleGeometry(0.045, 0.2, 4, 8),
      material,
      role,
      browConfigs.map((config) => composeMatrix(config.position, [0, 0, config.rotationZ ?? 0], config.scale)),
    )
    : undefined;
  if (brows) brows.renderOrder = 5;
  return {
    ...eyes,
    role,
    brows,
    browConfigs,
    mouth,
    mouthHomePosition: mouth.position.clone(),
    gaze: new THREE.Vector2(),
    focus: null,
  };
}

function updateFaceRig(
  face: FaceRig,
  motion: RobotMotion,
  emotion: RobotEmotion,
  elapsedSeconds: number,
  response: number,
  reducedMotion: boolean,
  roleIndex: number,
) {
  const expression: Record<RobotEmotion, { eyeX: number; eyeY: number; eyeTilt: number; mouthX: number; mouthY: number; mouthFlip: boolean; mouthOffsetY: number; browLift: number; browTilt: number }> = {
    focused: { eyeX: 1.08, eyeY: 0.72, eyeTilt: 0.06, mouthX: 0.92, mouthY: 0.72, mouthFlip: false, mouthOffsetY: 0, browLift: -0.025, browTilt: 0.16 },
    friendly: { eyeX: 1, eyeY: 1, eyeTilt: 0, mouthX: 1, mouthY: 1, mouthFlip: false, mouthOffsetY: 0, browLift: 0, browTilt: 0 },
    curious: { eyeX: 0.92, eyeY: 1.18, eyeTilt: -0.025, mouthX: 0.82, mouthY: 0.84, mouthFlip: false, mouthOffsetY: 0.012, browLift: 0.065, browTilt: 0.055 },
    concerned: { eyeX: 0.9, eyeY: 1.12, eyeTilt: -0.13, mouthX: 0.9, mouthY: 0.82, mouthFlip: true, mouthOffsetY: -0.025, browLift: 0.035, browTilt: -0.18 },
    delighted: { eyeX: 1.2, eyeY: 0.58, eyeTilt: -0.04, mouthX: 1.38, mouthY: 1.48, mouthFlip: false, mouthOffsetY: 0.025, browLift: 0.095, browTilt: -0.13 },
  };
  const automaticGaze: Record<RobotMotion, readonly [number, number]> = {
    idle: [0, 0],
    listen: [0.08, 0.28],
    work: [face.role === 'heavy-worker' ? 0 : -0.18, -0.32],
    lift: [0, 0.22],
    carry: [0, -0.22],
    direct: [0.58, 0.08],
    inspect: [0.42, -0.2],
    paint: [face.role === 'mini-artist' ? -0.62 : 0.2, -0.3],
    celebrate: [0, 0.26],
  };
  const microGazeX = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.72 + roleIndex * 2.3) * 0.12;
  const microGazeY = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.51 + roleIndex * 1.7) * 0.055;
  const desiredGaze = face.focus ?? new THREE.Vector2(
    automaticGaze[motion][0] + microGazeX,
    automaticGaze[motion][1] + microGazeY,
  );
  face.gaze.lerp(desiredGaze, response);

  const blinkCycle = 3.45 + roleIndex * 0.37;
  const blinkPhase = reducedMotion ? 1 : (elapsedSeconds + roleIndex * 0.74) % blinkCycle;
  const blink = blinkPhase < 0.18
    ? 0.08 + 0.92 * Math.abs(Math.cos((blinkPhase / 0.18) * Math.PI))
    : 1;
  const config = expression[emotion];
  const motionSquint = motion === 'work' || motion === 'inspect' || motion === 'paint' ? 0.9 : 1;
  const eyeShift = face.role === 'project-manager' ? 0.018 : 0.032;

  face.eyeConfigs.forEach((eye, index) => {
    const side = index === 0 ? -1 : 1;
    face.mainEyes.setMatrixAt(index, composeMatrix(
      [eye.position[0] + face.gaze.x * eyeShift, eye.position[1] + face.gaze.y * eyeShift, eye.position[2]],
      [0, eye.rotationY ?? 0, (eye.rotationZ ?? 0) + side * config.eyeTilt],
      [eye.scale[0] * config.eyeX, Math.max(0.014, eye.scale[1] * config.eyeY * motionSquint * blink), eye.scale[2]],
    ));
  });
  face.mainEyes.instanceMatrix.needsUpdate = true;

  if (face.pupils && face.pupilConfigs) {
    face.pupilConfigs.forEach((pupil, index) => {
      face.pupils!.setMatrixAt(index, composeMatrix(
        [pupil.position[0] + face.gaze.x * 0.075, pupil.position[1] + face.gaze.y * 0.07, pupil.position[2]],
        [0, 0, 0],
        [pupil.scale[0] * config.eyeX, Math.max(0.006, pupil.scale[1] * config.eyeY * blink), pupil.scale[2]],
      ));
    });
    face.pupils.instanceMatrix.needsUpdate = true;
  }

  if (face.brows) {
    face.brows.visible = !(
      (face.role === 'project-manager' || face.role === 'heavy-worker')
      && emotion === 'friendly'
    );
    face.browConfigs.forEach((brow, index) => {
      const side = index === 0 ? -1 : 1;
      const curiousOffset = emotion === 'curious' && index === 1 ? 0.07 : 0;
      face.brows!.setMatrixAt(index, composeMatrix(
        [brow.position[0] + face.gaze.x * 0.01, brow.position[1] + config.browLift + curiousOffset, brow.position[2]],
        [0, 0, (brow.rotationZ ?? 0) + side * config.browTilt],
        brow.scale,
      ));
    });
    face.brows.instanceMatrix.needsUpdate = true;
  }

  const mouthPulse = reducedMotion || motion !== 'listen' ? 1 : 1 + Math.sin(elapsedSeconds * 4.2) * 0.13;
  const referenceFriendlyMouthY = face.role === 'project-manager' && emotion === 'friendly' ? 0.9 : 1;
  face.mouth.scale.set(config.mouthX, config.mouthY * mouthPulse * referenceFriendlyMouthY, 1);
  face.mouth.position.copy(face.mouthHomePosition);
  face.mouth.position.y += config.mouthOffsetY + (motion === 'listen' ? 0.018 : 0);
  face.mouth.rotation.x = config.mouthFlip ? Math.PI : 0;
  face.mouth.rotation.z = THREE.MathUtils.lerp(face.mouth.rotation.z, face.gaze.x * -0.045, response);
}

function createJoint(parent: THREE.Object3D, name: string, role: RobotRole, quality: RobotQuality, materials: RobotMaterials, position: readonly [number, number, number], accent: THREE.Material = materials.gold) {
  const pivot = namePart(new THREE.Group(), name, role, 'joint-pivot');
  pivot.position.set(...position);
  parent.add(pivot);
  addMesh(
    pivot,
    `${name}-joint-assembly`,
    mergeColoredParts([
      {
        geometry: new THREE.CylinderGeometry(0.24, 0.24, 0.22, quality === 'high' ? 28 : 12),
        color: materials.gunmetal.color,
        rotation: [0, 0, 90 * DEG],
      },
      {
        geometry: new THREE.TorusGeometry(1, 0.13, quality === 'high' ? 10 : 6, quality === 'high' ? 32 : 14),
        color: materialColor(accent, materials.gold.color),
        position: [0.12, 0, 0],
        rotation: [0, 90 * DEG, 0],
        scale: [0.22, 0.22, 0.22],
      },
    ]),
    materials.jointComposite,
    role,
  );
  return pivot;
}

function createHeavyWorkerArm(
  parent: THREE.Object3D,
  name: string,
  quality: RobotQuality,
  materials: RobotMaterials,
  side: -1 | 1,
  origin: readonly [number, number, number],
  accent: THREE.Material,
) {
  const role: RobotRole = 'heavy-worker';
  const elbowPosition: readonly [number, number, number] = [side * 0.1, -0.46, 0];
  const upperMid: readonly [number, number, number] = [side * 0.05, -0.23, 0];
  const upperRotation = side * 12 * DEG;
  const wristPosition: readonly [number, number, number] = [side * 0.12, -0.68, 0.035];
  const forearmMid: readonly [number, number, number] = [side * 0.06, -0.34, 0.018];
  const forearmRotation = side * 10 * DEG;

  const shoulder = quality === 'low'
    ? namePart(new THREE.Group(), `${name}-shoulder`, role, 'joint-pivot')
    : createJoint(parent, `${name}-shoulder`, role, quality, materials, origin, accent);
  if (quality === 'low') {
    shoulder.position.set(...origin);
    parent.add(shoulder);
  }

  const upperGeometry = mergeColoredParts([
    {
      geometry: capsule('low', 0.15, 0.3),
      color: materials.white.color,
      position: upperMid,
      rotation: [0, 0, upperRotation],
    },
    {
      geometry: new THREE.CylinderGeometry(0.082, 0.082, 0.42, 8),
      color: materials.gunmetal.color,
      position: [upperMid[0], upperMid[1], -0.145],
      rotation: [0, 0, upperRotation],
    },
    {
      geometry: new THREE.CylinderGeometry(0.082, 0.082, 0.42, 8),
      color: materials.gunmetal.color,
      position: [upperMid[0], upperMid[1], 0.145],
      rotation: [0, 0, upperRotation],
    },
    {
      geometry: new THREE.BoxGeometry(0.24, 0.31, 0.34),
      color: materials.whiteDeep.color,
      position: [side * 0.035, -0.08, 0],
      rotation: [0, 0, upperRotation],
    },
    {
      geometry: new THREE.BoxGeometry(0.16, 0.11, 0.37),
      color: materials.gold.color,
      position: [side * 0.055, -0.18, 0],
      rotation: [0, 0, upperRotation],
    },
    {
      geometry: new THREE.BoxGeometry(0.27, 0.075, 0.36),
      color: materials.gunmetal.color,
      position: [side * 0.045, -0.285, 0],
      rotation: [0, 0, upperRotation],
    },
    {
      geometry: new THREE.BoxGeometry(0.19, 0.105, 0.39),
      color: materials.gold.color,
      position: [side * 0.072, -0.36, 0],
      rotation: [0, 0, upperRotation],
    },
  ]);
  const upper = addMesh(
    shoulder,
    quality === 'low' ? `${name}-shoulder-upper-lod` : `${name}-upper-shell`,
    upperGeometry,
    quality === 'low' ? materials.lodComposite : materials.jointComposite,
    role,
  );

  const elbow = quality === 'low'
    ? namePart(new THREE.Group(), `${name}-elbow`, role, 'joint-pivot')
    : createJoint(shoulder, `${name}-elbow`, role, quality, materials, elbowPosition, accent);
  if (quality === 'low') {
    elbow.position.set(...elbowPosition);
    shoulder.add(elbow);
  }

  const forearmGeometry = mergeColoredParts([
    {
      geometry: capsule('low', 0.415, 0.43),
      color: materials.white.color,
      position: forearmMid,
      rotation: [0, 0, forearmRotation],
      scale: [1.08, 1, 1.02],
    },
    {
      geometry: new THREE.CylinderGeometry(0.33, 0.33, 0.14, 12),
      color: materials.gold.color,
      position: [side * 0.1, -0.52, 0.02],
      rotation: [0, 0, forearmRotation],
    },
    {
      geometry: new THREE.CylinderGeometry(0.282, 0.282, 0.175, 12),
      color: materials.gunmetal.color,
      position: [side * 0.115, -0.57, 0.025],
      rotation: [0, 0, forearmRotation],
    },
    {
      geometry: createRoundedRectanglePlate(0.155, 0.56, 0.045, 0.055, quality),
      color: materials.whiteDeep.color,
      position: [forearmMid[0], forearmMid[1], 0.275],
      rotation: [0, 0, forearmRotation],
    },
    {
      geometry: createRoundedRectanglePlate(0.085, 0.29, 0.055, 0.035, quality),
      color: materials.gold.color,
      position: [side * 0.07, -0.25, 0.302],
      rotation: [0, 0, forearmRotation],
    },
    {
      geometry: new THREE.CylinderGeometry(0.374, 0.374, 0.055, 16),
      color: materials.gunmetal.color,
      position: [side * 0.032, -0.18, 0.018],
      rotation: [0, 0, forearmRotation],
      scale: [1, 1, 0.96],
    },
    {
      geometry: new THREE.CylinderGeometry(0.378, 0.378, 0.045, 16),
      color: materials.gold.color,
      position: [side * 0.086, -0.455, 0.023],
      rotation: [0, 0, forearmRotation],
      scale: [1, 1, 0.96],
    },
    {
      geometry: createRoundedRectanglePlate(0.19, 0.18, 0.052, 0.045, quality),
      color: materials.gunmetal.color,
      position: [side * 0.045, -0.4, 0.315],
      rotation: [0, 0, forearmRotation],
    },
    {
      geometry: createRoundedRectanglePlate(0.1, 0.105, 0.06, 0.028, quality),
      color: materials.gold.color,
      position: [side * 0.062, -0.41, 0.348],
      rotation: [0, 0, forearmRotation],
    },
  ]);
  const forearm = addMesh(
    elbow,
    quality === 'low' ? `${name}-elbow-forearm-lod` : `${name}-forearm-shell`,
    forearmGeometry,
    quality === 'low' ? materials.lodComposite : materials.jointComposite,
    role,
  );

  const wrist = quality === 'low'
    ? namePart(new THREE.Group(), `${name}-wrist`, role, 'joint-pivot')
    : createJoint(elbow, `${name}-wrist`, role, quality, materials, wristPosition, accent);
  if (quality === 'low') {
    wrist.position.set(...wristPosition);
    elbow.add(wrist);
  } else {
    wrist.getObjectByName(`${name}-wrist-joint-assembly`)?.scale.setScalar(0.74);
  }

  const hand = namePart(new THREE.Group(), `${name}-hand-root`, role, 'hand-pivot');
  hand.position.set(side * 0.1, -0.07, 0);
  hand.scale.setScalar(1.28);
  hand.scale.multiplyScalar(1.109375);
  wrist.add(hand);
  const gripperParts: ColoredGeometryPart[] = [
    {
      geometry: sphere('low'),
      color: materials.gunmetal.color,
      position: [side * 0.035, -0.06, 0],
      scale: [0.31, 0.235, 0.265],
    },
    {
      geometry: sphere('low'),
      color: materials.whiteDeep.color,
      position: [side * 0.015, -0.035, 0.16],
      scale: [0.3, 0.225, 0.105],
    },
    {
      geometry: new THREE.CylinderGeometry(0.058, 0.058, 0.48, 10),
      color: materials.gold.color,
      position: [side * 0.08, -0.185, 0],
      rotation: [90 * DEG, 0, 0],
    },
  ];
  const digitOffsets = [-1.5, -0.5, 0.5, 1.5];
  const digitPivots: THREE.Group[] = [];
  const loadDigitCapsule = (radius: number, length: number) => (
    quality === 'low'
      ? new THREE.CapsuleGeometry(radius, length, 2, 4)
      : capsule('low', radius, length)
  );
  digitOffsets.forEach((offset, index) => {
    const spread = offset * 0.1;
    const isThumb = index === (side < 0 ? 3 : 0);
    const rootX = side * (isThumb ? 0.13 : 0.08);
    const rootY = isThumb ? -0.12 : -0.22 - Math.abs(offset) * 0.012;
    const rootZ = spread * 0.72;
    const proximalRotation = side * (isThumb ? 58 : 8 + offset * 7) * DEG;
    const distalRotation = side * (isThumb ? 82 : 31 + offset * 9) * DEG;
    const digitPivot = new THREE.Group();
    digitPivot.name = `${name}-digit-${index + 1}-pivot`;
    digitPivot.position.set(rootX, rootY, rootZ);
    digitPivot.userData.articulation = { axis: 'z', curlDegrees: isThumb ? 34 : 46, digit: index + 1 };
    hand.add(digitPivot);
    digitPivots.push(digitPivot);
    gripperParts.push(
      {
        geometry: loadDigitCapsule(isThumb ? 0.07 : 0.064, isThumb ? 0.17 : 0.2),
        color: materials.gunmetal.color,
        position: [rootX + side * (isThumb ? 0.07 : 0.025), rootY - (isThumb ? 0.08 : 0.105), rootZ],
        rotation: [offset * 3 * DEG, 0, proximalRotation],
      },
      {
        geometry: sphere('low'),
        color: materials.gold.color,
        position: [rootX + side * (isThumb ? 0.16 : 0.07), rootY - (isThumb ? 0.17 : 0.215), rootZ],
        scale: [0.067, 0.067, 0.067],
      },
      {
        geometry: loadDigitCapsule(isThumb ? 0.06 : 0.055, isThumb ? 0.14 : 0.17),
        color: materials.gunmetal.color,
        position: [rootX + side * (isThumb ? 0.235 : 0.125), rootY - (isThumb ? 0.255 : 0.31), rootZ],
        rotation: [offset * 4 * DEG, 0, distalRotation],
      },
      {
        geometry: loadDigitCapsule(isThumb ? 0.046 : 0.043, isThumb ? 0.065 : 0.08),
        color: materials.whiteDeep.color,
        position: [rootX + side * (isThumb ? 0.3 : 0.18), rootY - (isThumb ? 0.335 : 0.39), rootZ],
        rotation: [offset * 4 * DEG, 0, distalRotation],
      },
    );
  });
  const handMesh = addMesh(
    hand,
    quality === 'low' ? `${name}-wrist-open-gripper-lod` : `${name}-articulated-open-gripper`,
    mergeColoredParts(gripperParts),
    quality === 'low' ? materials.lodComposite : materials.jointComposite,
    role,
  );
  handMesh.userData.collectiveGrip = true;
  hand.userData.digitPivots = digitPivots.map((pivot) => pivot.name);
  hand.userData.v8HandArchitecture = 'broad-palm-gold-knuckle-rail-four-curled-two-link-digits';
  hand.userData.v9LoadHandArchitecture = 'oversized-load-palm-deep-forearm-four-curled-digits';
  hand.userData.v10StructuralArmDrop = 'lower-hanging-shoulder-chain-segmented-forearm-object-centered-lift';
  hand.userData.v10StructuralIdleFraming = 'reference-width-load-palm-with-inward-idle-shoulder-articulation';
  upper.userData.articulated = true;
  forearm.userData.articulated = true;
  forearm.userData.v10StructuralCuff = 'dual-circumferential-bands-front-service-inset';
  return { shoulder, elbow, wrist, palm: hand };
}

function createArm(parent: THREE.Object3D, name: string, role: RobotRole, quality: RobotQuality, materials: RobotMaterials, side: -1 | 1, origin: readonly [number, number, number], size = 1, accent: THREE.Material = materials.gold, handScale = 1) {
  if (role === 'heavy-worker') return createHeavyWorkerArm(parent, name, quality, materials, side, origin, accent);
  const span = 1;
  const upperLength = 0.44 * size * span;
  const shoulder = quality === 'low'
    ? namePart(new THREE.Group(), `${name}-shoulder`, role, 'joint-pivot')
    : createJoint(parent, `${name}-shoulder`, role, quality, materials, origin, accent);
  if (quality === 'low') {
    shoulder.position.set(...origin);
    parent.add(shoulder);
    addMesh(
      shoulder,
      `${name}-shoulder-upper-lod`,
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.24, 0.24, 0.22, 12), color: materials.gunmetal.color, rotation: [0, 0, 90 * DEG] },
        { geometry: new THREE.TorusGeometry(1, 0.13, 6, 14), color: materialColor(accent, materials.gold.color), position: [0.12, 0, 0], rotation: [0, 90 * DEG, 0], scale: [0.22, 0.22, 0.22] },
        { geometry: capsule(quality, 0.16 * size, upperLength), color: materials.white.color, position: [side * 0.37 * size * span, -0.05 * size, 0], rotation: [0, 0, side * 72 * DEG] },
      ]),
      materials.lodComposite,
      role,
    );
  }
  shoulder.rotation.z = side * -18 * DEG;
  const upper = quality === 'high'
    ? addMesh(
      shoulder,
      `${name}-upper-shell`,
      capsule(quality, 0.16 * size, upperLength),
      materials.white,
      role,
      [side * 0.37 * size * span, -0.05 * size, 0],
      [0, 0, side * 72 * DEG],
    )
    : shoulder.getObjectByName(`${name}-shoulder-upper-lod`)!;
  const elbow = quality === 'low'
    ? namePart(new THREE.Group(), `${name}-elbow`, role, 'joint-pivot')
    : createJoint(shoulder, `${name}-elbow`, role, quality, materials, [side * 0.72 * size * span, -0.13 * size, 0], accent);
  if (quality === 'low') {
    elbow.position.set(side * 0.72 * size * span, -0.13 * size, 0);
    shoulder.add(elbow);
    addMesh(
      elbow,
      `${name}-elbow-forearm-lod`,
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.24, 0.24, 0.22, 12), color: materials.gunmetal.color, rotation: [0, 0, 90 * DEG] },
        { geometry: new THREE.TorusGeometry(1, 0.13, 6, 14), color: materialColor(accent, materials.gold.color), position: [0.12, 0, 0], rotation: [0, 90 * DEG, 0], scale: [0.22, 0.22, 0.22] },
        { geometry: capsule(quality, 0.18 * size, 0.42 * size * span), color: materials.whiteDeep.color, position: [side * 0.34 * size * span, -0.04 * size, 0], rotation: [0, 0, side * 74 * DEG] },
      ]),
      materials.lodComposite,
      role,
    );
  }
  elbow.rotation.z = side * 128 * DEG;
  const forearm = quality === 'high'
    ? addMesh(elbow, `${name}-forearm-shell`, capsule(quality, 0.18 * size, 0.42 * size * span), materials.whiteDeep, role, [side * 0.34 * size * span, -0.04 * size, 0], [0, 0, side * 74 * DEG])
    : elbow.getObjectByName(`${name}-elbow-forearm-lod`)!;
  const wrist = quality === 'low'
    ? namePart(new THREE.Group(), `${name}-wrist`, role, 'joint-pivot')
    : createJoint(elbow, `${name}-wrist`, role, quality, materials, [side * 0.68 * size * span, -0.09 * size, 0.38 * size * span], accent);
  if (quality === 'low') {
    wrist.position.set(side * 0.68 * size * span, -0.09 * size, 0.38 * size * span);
    elbow.add(wrist);
  }
  if (role === 'mini-artist' && quality === 'high') {
    const miniJointAssemblies: Array<readonly [THREE.Object3D, string]> = [
      [shoulder, `${name}-shoulder-joint-assembly`],
      [elbow, `${name}-elbow-joint-assembly`],
      [wrist, `${name}-wrist-joint-assembly`],
    ];
    miniJointAssemblies.forEach(([joint, assemblyName]) => {
      joint.getObjectByName(assemblyName)?.scale.setScalar(0.76);
    });
  }
  const hand = namePart(new THREE.Group(), `${name}-hand-root`, role, 'hand-pivot');
  hand.position.set(side * 0.22 * size * span, 0, 0);
  wrist.add(hand);
  const fingerGeometry = capsule(quality, 0.045 * handScale, 0.25 * handScale);
  const fingerOffsets = [-0.19, -0.065, 0.065, 0.19];
  if (quality === 'low') {
    const wristAndHand = mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(0.24, 0.24, 0.22, 12), color: materials.gunmetal.color, rotation: [0, 0, 90 * DEG] },
      { geometry: new THREE.TorusGeometry(1, 0.13, 6, 14), color: materialColor(accent, materials.gold.color), position: [0.12, 0, 0], rotation: [0, 90 * DEG, 0], scale: [0.22, 0.22, 0.22] },
      { geometry: sphere(quality), color: materials.gunmetal.color, position: [side * 0.22 * size, 0, 0], scale: [0.22 * handScale, 0.18 * handScale, 0.14 * handScale] },
      ...fingerOffsets.map((offset, index) => ({
        geometry: capsule(quality, 0.035 * handScale, 0.16 * handScale),
        color: materials.gunmetal.color,
        position: [side * (0.38 * size + Math.abs(offset) * 0.14), offset * handScale, index % 2 ? 0.035 : -0.025] as const,
        rotation: [0, 0, side * (62 + offset * 55) * DEG] as const,
      })),
    ]);
    addMesh(wrist, `${name}-wrist-open-gripper-lod`, wristAndHand, materials.lodComposite, role);
  } else {
    addMesh(hand, `${name}-palm`, sphere(quality), materials.gunmetal, role, [0, 0, 0], [0, 0, 0], [0.22 * handScale, 0.18 * handScale, 0.14 * handScale]);
    addInstancedPart(
      hand,
      `${name}-open-gripper-digits`,
      fingerGeometry,
      materials.gunmetal,
      role,
      fingerOffsets.map((offset, index) => composeMatrix(
        [side * (0.18 * size + Math.abs(offset) * 0.14), offset * handScale, index % 2 ? 0.035 : -0.025],
        [0, 0, side * (62 + offset * 55) * DEG],
      )),
    );
  }
  upper.userData.articulated = true;
  forearm.userData.articulated = true;
  return { shoulder, elbow, wrist, palm: hand };
}

function createAutonomousArm(parent: THREE.Object3D, name: string, role: RobotRole, quality: RobotQuality, materials: RobotMaterials, side: -1 | 1, position: readonly [number, number, number]) {
  const isHeavy = role === 'heavy-worker';
  const upperLength = isHeavy ? 0.34 : 0.62;
  const upperPosition: readonly [number, number, number] = [side * (isHeavy ? 0.1 : 0.16), isHeavy ? 0.28 : 0.48, 0];
  const elbowPosition: readonly [number, number, number] = [side * (isHeavy ? 0.18 : 0.31), isHeavy ? 0.54 : 0.95, 0];
  const forearmLength = isHeavy ? 0.3 : 0.55;
  const forearmPosition: readonly [number, number, number] = [side * (isHeavy ? 0.1 : 0.18), isHeavy ? 0.22 : 0.38, 0];
  const createCompactCrownJoint = (jointParent: THREE.Object3D, jointName: string, jointPosition: readonly [number, number, number]) => {
    const pivot = namePart(new THREE.Group(), jointName, role, 'joint-pivot');
    pivot.position.set(...jointPosition);
    jointParent.add(pivot);
    addMesh(
      pivot,
      `${jointName}-compact-gimbal`,
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.15, 0.15, 0.13, quality === 'high' ? 14 : 8), color: materials.gunmetal.color, rotation: [0, 0, 90 * DEG] },
        { geometry: new THREE.TorusGeometry(0.155, 0.035, quality === 'high' ? 7 : 5, quality === 'high' ? 14 : 9), color: materials.gold.color, position: [side * 0.075, 0, 0], rotation: [0, 90 * DEG, 0] },
        { geometry: new THREE.CylinderGeometry(0.065, 0.065, 0.16, quality === 'high' ? 10 : 7), color: materials.whiteDeep.color, position: [0, 0.1, 0] },
      ]),
      quality === 'high' ? materials.jointComposite : materials.lodComposite,
      role,
    );
    return pivot;
  };
  const root = quality === 'low'
    ? namePart(new THREE.Group(), `${name}-base`, role, 'joint-pivot')
    : isHeavy
      ? createCompactCrownJoint(parent, `${name}-base`, position)
      : createJoint(parent, `${name}-base`, role, quality, materials, position);
  if (quality === 'low') {
    root.position.set(...position);
    parent.add(root);
    addMesh(
      root,
      `${name}-base-upper-lod`,
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.24, 0.24, 0.22, 12), color: materials.gunmetal.color, rotation: [0, 0, 90 * DEG] },
        { geometry: new THREE.TorusGeometry(1, 0.13, 6, 14), color: materials.gold.color, position: [0.12, 0, 0], rotation: [0, 90 * DEG, 0], scale: [0.22, 0.22, 0.22] },
        { geometry: capsule(quality, 0.16, upperLength), color: materials.white.color, position: upperPosition, rotation: [0, 0, side * -18 * DEG] },
      ]),
      materials.lodComposite,
      role,
    );
  }
  root.scale.setScalar(role === 'heavy-worker' ? 1.18 : 0.86);
  root.rotation.z = side * -25 * DEG;
  const heavyUpperLinkGeometry = isHeavy
    ? mergeColoredParts([
      { geometry: capsule('low', 0.09, upperLength), color: materials.white.color, position: [upperPosition[0], upperPosition[1], -0.105], rotation: [0, 0, side * -18 * DEG] },
      { geometry: capsule('low', 0.09, upperLength), color: materials.white.color, position: [upperPosition[0], upperPosition[1], 0.105], rotation: [0, 0, side * -18 * DEG] },
      { geometry: capsule('low', 0.045, upperLength * 0.82), color: materials.gunmetal.color, position: [upperPosition[0] + side * 0.015, upperPosition[1], 0], rotation: [0, 0, side * -18 * DEG] },
      { geometry: new THREE.CylinderGeometry(0.155, 0.155, 0.09, quality === 'high' ? 12 : 8), color: materials.gold.color, position: [side * 0.025, 0.04, 0], rotation: [0, 0, 90 * DEG] },
      {
        geometry: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.015, 0.06, -0.145),
          new THREE.Vector3(side * 0.075, 0.27, -0.18),
          new THREE.Vector3(side * 0.16, 0.49, -0.13),
        ]), 6, 0.021, 4, false),
        color: materials.gold.color,
      },
    ])
    : null;
  const upper = quality === 'high'
    ? addMesh(
      root,
      `${name}-upper`,
      heavyUpperLinkGeometry ?? capsule(quality, 0.16, upperLength),
      heavyUpperLinkGeometry ? materials.jointComposite : materials.white,
      role,
      heavyUpperLinkGeometry ? [0, 0, 0] : upperPosition,
      heavyUpperLinkGeometry ? [0, 0, 0] : [0, 0, side * -18 * DEG],
    )
    : root.getObjectByName(`${name}-base-upper-lod`)!;
  const elbow = quality === 'low'
    ? namePart(new THREE.Group(), `${name}-elbow`, role, 'joint-pivot')
    : isHeavy
      ? createCompactCrownJoint(root, `${name}-elbow`, elbowPosition)
      : createJoint(root, `${name}-elbow`, role, quality, materials, elbowPosition);
  if (quality === 'low') {
    elbow.position.set(...elbowPosition);
    root.add(elbow);
  }
  elbow.scale.setScalar(isHeavy ? 1 : 0.84);
  const heavyForearmLinkGeometry = isHeavy
    ? mergeColoredParts([
      { geometry: capsule('low', 0.078, forearmLength), color: materials.whiteDeep.color, position: [forearmPosition[0], forearmPosition[1], -0.1], rotation: [0, 0, side * -28 * DEG] },
      { geometry: capsule('low', 0.078, forearmLength), color: materials.whiteDeep.color, position: [forearmPosition[0], forearmPosition[1], 0.1], rotation: [0, 0, side * -28 * DEG] },
      { geometry: capsule('low', 0.04, forearmLength * 0.78), color: materials.gunmetal.color, position: [forearmPosition[0], forearmPosition[1], 0], rotation: [0, 0, side * -28 * DEG] },
      { geometry: new THREE.CylinderGeometry(0.13, 0.13, 0.08, quality === 'high' ? 12 : 8), color: materials.gold.color, position: [side * 0.205, 0.42, 0], rotation: [0, 0, 90 * DEG] },
      {
        geometry: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.015, 0.035, -0.13),
          new THREE.Vector3(side * 0.075, 0.22, -0.17),
          new THREE.Vector3(side * 0.2, 0.41, -0.115),
        ]), 5, 0.019, 4, false),
        color: materials.gold.color,
      },
    ])
    : null;
  const clawGeometry = mergeColoredParts([
    { geometry: sphere(quality, quality === 'high' ? 20 : 12, quality === 'high' ? 14 : 8), color: materials.gunmetal.color, position: [side * (isHeavy ? 0.23 : 0.37), isHeavy ? 0.46 : 0.78, 0], scale: [0.1, 0.1, 0.1] },
    {
      geometry: new THREE.TorusGeometry(0.115, 0.027, quality === 'high' ? 6 : 4, quality === 'high' ? 12 : 8),
      color: materials.gold.color,
      position: [side * (isHeavy ? 0.245 : 0.39), isHeavy ? 0.485 : 0.805, 0],
      rotation: [0, 90 * DEG, 0],
    },
    ...[-1, 0, 1].map((index) => ({
      geometry: capsule(quality, isHeavy ? 0.044 : 0.036, isHeavy ? 0.23 : 0.26),
      color: materials.gunmetal.color,
      position: isHeavy
        ? [side * (0.27 + Math.abs(index) * 0.045) + index * 0.035, 0.325 + Math.abs(index) * 0.012, index * 0.11] as const
        : [side * (0.46 + Math.abs(index) * 0.055), 0.96 - Math.abs(index) * 0.018, index * 0.13] as const,
      rotation: [index * (isHeavy ? 18 : 16) * DEG, 0, side * (isHeavy ? 18 : -24) * DEG] as const,
    })),
    ...[-1, 0, 1].map((index) => ({
      geometry: new THREE.CylinderGeometry(0.052, 0.052, 0.035, quality === 'high' ? 8 : 6),
      color: materials.gold.color,
      position: isHeavy
        ? [side * (0.255 + Math.abs(index) * 0.04) + index * 0.03, 0.425 + Math.abs(index) * 0.01, index * 0.095] as const
        : [side * (0.445 + Math.abs(index) * 0.048), 0.9 - Math.abs(index) * 0.014, index * 0.105] as const,
      rotation: [90 * DEG, 0, 0] as const,
    })),
    ...[-1, 0, 1].map((index) => ({
      geometry: new THREE.ConeGeometry(
        isHeavy ? (index === 0 ? 0.055 : 0.028) : 0.044,
        isHeavy ? (index === 0 ? 0.2 : 0.08) : 0.09,
        quality === 'high' ? 8 : 5,
      ),
      color: isHeavy && index !== 0 ? materials.gunmetal.color : materials.gold.color,
      position: isHeavy
        ? [side * (0.29 + Math.abs(index) * 0.055) + index * 0.045, index === 0 ? 0.12 : 0.2, index * 0.15] as const
        : [side * (0.55 + Math.abs(index) * 0.075), 1.09 - Math.abs(index) * 0.025, index * 0.155] as const,
      rotation: [isHeavy ? Math.PI + index * 12 * DEG : index * 20 * DEG, 0, side * (isHeavy ? 5 + Math.abs(index) * 8 : -41) * DEG] as const,
    })),
  ]);
  if (isHeavy) {
    const clawCenterX = side * 0.245;
    const clawCenterY = 0.485;
    clawGeometry.translate(-clawCenterX, -clawCenterY, 0);
    clawGeometry.scale(1.3, 1.3, 1.3);
    clawGeometry.translate(clawCenterX, clawCenterY, 0);
  }
  let forearm: THREE.Object3D;
  let tool: THREE.Object3D;
  if (quality === 'low') {
    const assembly = addMesh(
      elbow,
      `${name}-forearm-claw-lod`,
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.24, 0.24, 0.22, 12), color: materials.gunmetal.color, rotation: [0, 0, 90 * DEG] },
        { geometry: new THREE.TorusGeometry(1, 0.13, 6, 14), color: materials.gold.color, position: [0.12, 0, 0], rotation: [0, 90 * DEG, 0], scale: [0.22, 0.22, 0.22] },
        { geometry: capsule(quality, 0.14, forearmLength), color: materials.whiteDeep.color, position: forearmPosition, rotation: [0, 0, side * -28 * DEG] },
        { geometry: clawGeometry, color: materials.gunmetal.color },
      ]),
      materials.lodComposite,
      role,
    );
    forearm = assembly;
    tool = assembly;
  } else {
    forearm = addMesh(
      elbow,
      `${name}-forearm`,
      heavyForearmLinkGeometry ?? capsule(quality, 0.14, forearmLength),
      heavyForearmLinkGeometry ? materials.jointComposite : materials.whiteDeep,
      role,
      heavyForearmLinkGeometry ? [0, 0, 0] : forearmPosition,
      heavyForearmLinkGeometry ? [0, 0, 0] : [0, 0, side * -28 * DEG],
    );
    tool = addMesh(elbow, `${name}-three-digit-claw`, clawGeometry, materials.jointComposite, role);
  }
  upper.userData.articulated = true;
  forearm.userData.articulated = true;
  tool.userData.articulated = true;
  return { root, elbow };
}

function createManagerDome(parent: THREE.Object3D, quality: RobotQuality, materials: RobotMaterials) {
  const domeRoot = namePart(new THREE.Group(), 'project-manager-dome-root', 'project-manager', 'dome');
  domeRoot.position.set(0, 0.57, -0.05);
  parent.add(domeRoot);
  const domeGeometry = new THREE.SphereGeometry(1, quality === 'high' ? 48 : 22, quality === 'high' ? 24 : 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const dome = addMesh(domeRoot, 'project-manager-clear-dome', domeGeometry, materials.dome, 'project-manager', [0, 0, 0], [0, 0, 0], [1, 0.93, 0.96]);
  dome.renderOrder = 3;
  const domeSheenMaterial = new THREE.MeshBasicMaterial({ color: 0x94ddff, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const domeSheen = addMesh(domeRoot, 'project-manager-v14-dome-optical-sheen', domeGeometry, domeSheenMaterial, 'project-manager', [0, 0.015, 0.005], [0, 0, 0], [1.012, 0.945, 0.972]);
  domeSheen.renderOrder = 4;
  domeSheen.userData.explodeWithParent = true;
  const rim = addMesh(domeRoot, 'project-manager-dome-rim', new THREE.TorusGeometry(1, 0.055, quality === 'high' ? 9 : 5, quality === 'high' ? 36 : 18), materials.whiteDeep, 'project-manager', [0, -0.025, 0], [90 * DEG, 0, 0], [1.01, 0.92, 0.96]);
  rim.userData.v11DomeCradle = 'white-overlap-rim-with-clear-polycarbonate-thickness';

  dome.userData.v13DomeOpticalStack = 'thick-clear-polycarbonate-with-warm-key-and-cool-lower-refraction';
  dome.userData.v14DomeOpticalStack = 'narrower-taller-reference-locked-polycarbonate-envelope';
  dome.userData.v15DomeClosure = 'closed-hemispherical-optical-envelope-verified-from-top-profile-and-rear';
  const brainMaterial = new THREE.MeshStandardMaterial({ color: 0x168bdc, emissive: 0x0065bd, emissiveIntensity: 0.52, roughness: 0.21, metalness: 0.02, transparent: true, opacity: 0.58, toneMapped: true });
  const brainVolumeMaterial = new THREE.MeshStandardMaterial({ color: 0x003f7d, emissive: 0x00275a, emissiveIntensity: 0.28, roughness: 0.31, metalness: 0.02, transparent: true, opacity: 0.68, toneMapped: true, depthWrite: true });
  const brainRoot = namePart(new THREE.Group(), 'project-manager-brain-visualizer', 'project-manager', 'brain-state-rig');
  brainRoot.position.set(0, 0.3, 0.03);
  brainRoot.scale.set(1.1, 0.92, 1);
  domeRoot.add(brainRoot);

  const outerBrainGlowMaterial = new THREE.MeshBasicMaterial({ color: 0x006fe8, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: true });
  const innerBrainGlowMaterial = new THREE.MeshBasicMaterial({ color: 0x0b9fe0, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: true });
  const brainKernelMaterial = new THREE.MeshBasicMaterial({ color: 0x8defff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: true });
  const outerBrainGlow = addMesh(brainRoot, 'project-manager-v15-brain-outer-volume', sphere(quality, quality === 'high' ? 30 : 16, quality === 'high' ? 19 : 10), outerBrainGlowMaterial, 'project-manager', [0, -0.005, 0.02], [0, 0, 0], [0.66, 0.29, 0.5]);
  const innerBrainGlow = addMesh(brainRoot, 'project-manager-v15-brain-inner-volume', sphere(quality, quality === 'high' ? 28 : 14, quality === 'high' ? 17 : 9), innerBrainGlowMaterial, 'project-manager', [0, 0.015, 0.015], [0, 0, 0], [0.47, 0.22, 0.36]);
  const brainKernel = addMesh(brainRoot, 'project-manager-v15-brain-kernel', sphere(quality, quality === 'high' ? 26 : 14, quality === 'high' ? 16 : 9), brainKernelMaterial, 'project-manager', [0, 0.04, 0.01], [0, 0, 0], [0.18, 0.16, 0.16]);
  for (const volume of [outerBrainGlow, innerBrainGlow, brainKernel]) {
    volume.renderOrder = 2;
    volume.userData.explodeWithParent = true;
  }
  brainKernel.userData.v15BrainVolumetricKernel = 'nested-closed-energy-volumes-visible-through-full-turntable';

  const protectedCerebrum = addMesh(brainRoot, 'project-manager-v15-protected-cerebrum', mergeColoredParts([
    { geometry: sphere(quality, quality === 'high' ? 22 : 10, quality === 'high' ? 15 : 7), color: 0x064f9c, position: [-0.27, 0.02, -0.08], scale: [0.32, 0.23, 0.28] },
    { geometry: sphere(quality, quality === 'high' ? 22 : 10, quality === 'high' ? 15 : 7), color: 0x064f9c, position: [0.27, 0.02, -0.08], scale: [0.32, 0.23, 0.28] },
    { geometry: sphere(quality, quality === 'high' ? 20 : 9, quality === 'high' ? 14 : 6), color: 0x0874c9, position: [-0.18, 0.21, -0.04], scale: [0.27, 0.2, 0.24] },
    { geometry: sphere(quality, quality === 'high' ? 20 : 9, quality === 'high' ? 14 : 6), color: 0x0874c9, position: [0.18, 0.21, -0.04], scale: [0.27, 0.2, 0.24] },
    { geometry: sphere(quality, quality === 'high' ? 18 : 8, quality === 'high' ? 13 : 6), color: 0x22b9ef, position: [-0.3, -0.14, 0.02], scale: [0.19, 0.15, 0.2] },
    { geometry: sphere(quality, quality === 'high' ? 18 : 8, quality === 'high' ? 13 : 6), color: 0x22b9ef, position: [0.3, -0.14, 0.02], scale: [0.19, 0.15, 0.2] },
    { geometry: capsule(quality, 0.075, 0.23), color: 0xb6f7ff, position: [0, -0.2, -0.03], rotation: [0, 0, 0], scale: [0.85, 1, 0.85] },
    ...([-1, 1] as const).flatMap((side) => [
      { geometry: new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 0.48, 0.04, 0.11),
        new THREE.Vector3(side * 0.31, 0.2, 0.18),
        new THREE.Vector3(side * 0.1, 0.12, 0.16),
      ), quality === 'high' ? 18 : 9, 0.018, quality === 'high' ? 6 : 4, false), color: 0x002b62 },
      { geometry: new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 0.43, -0.12, 0.13),
        new THREE.Vector3(side * 0.28, -0.01, 0.2),
        new THREE.Vector3(side * 0.12, -0.08, 0.17),
      ), quality === 'high' ? 16 : 8, 0.015, quality === 'high' ? 6 : 4, false), color: 0x002b62 },
    ]),
  ]), brainVolumeMaterial, 'project-manager');
  protectedCerebrum.renderOrder = 2;
  protectedCerebrum.userData.v15ProtectedCerebrum = 'paired-closed-lobes-centered-under-dome-for-readable-front-side-and-rear-volume';

  const createState = (state: RobotBrainState, name: string, parts: ColoredGeometryPart[]) => {
    const stateRoot = namePart(new THREE.Group(), `project-manager-brain-${state}-state`, 'project-manager', 'brain-state');
    const visual = addMesh(stateRoot, name, mergeColoredParts(parts), brainMaterial, 'project-manager');
    visual.renderOrder = 4;
    stateRoot.scale.setScalar(0.78);
    stateRoot.position.set(0, 0.015, -0.12);
    stateRoot.visible = state === 'calm';
    brainRoot.add(stateRoot);
    return stateRoot;
  };
  const brainColor = materials.cyan.color;
  const brainVolume = addMesh(brainRoot, 'project-manager-brain-volumetric-energy-stack', mergeColoredParts([
    { geometry: sphere(quality, quality === 'high' ? 18 : 10, quality === 'high' ? 11 : 6), color: 0x005ed6, position: [0, -0.12, 0.24], scale: [0.72, 0.16, 0.34] },
    { geometry: sphere(quality, quality === 'high' ? 16 : 9, quality === 'high' ? 10 : 6), color: 0x007fe8, position: [0, -0.005, 0.28], scale: [0.61, 0.135, 0.3] },
    { geometry: sphere(quality, quality === 'high' ? 14 : 8, quality === 'high' ? 9 : 5), color: 0x18aee8, position: [0, 0.095, 0.32], scale: [0.48, 0.105, 0.24] },
    { geometry: new THREE.TorusGeometry(0.62, 0.032, quality === 'high' ? 9 : 5, quality === 'high' ? 44 : 22), color: 0x53e7ff, position: [0, -0.075, 0.34], rotation: [90 * DEG, 0, 0], scale: [1, 0.8, 1] },
    { geometry: sphere(quality, quality === 'high' ? 18 : 12, quality === 'high' ? 13 : 8), color: 0xb6f7ff, position: [0, 0.18, 0.36], scale: [0.12, 0.1, 0.1] },
  ]), brainVolumeMaterial, 'project-manager');
  brainVolume.scale.set(0.82, 0.82, 0.82);
  brainVolume.position.z = -0.035;
  brainVolume.renderOrder = 3;
  brainVolume.userData.v11VolumetricBrain = 'layered-horizontal-energy-discs-ring-and-pulsing-core-beneath-state-overlays';
  brainVolume.userData.v13LayeredBrainMass = 'broad-depth-ordered-blue-energy-plates-with-cyan-rim-arcs';
  brainVolume.userData.v15BrainStateCage = 'animated-state-graphics-nested-inside-volumetric-energy-kernel';
  const calmParts: ColoredGeometryPart[] = [
    { geometry: new THREE.TorusGeometry(0.56, 0.022, quality === 'high' ? 8 : 4, quality === 'high' ? 40 : 16), color: brainColor, position: [0, -0.015, 0.29], scale: [1, 0.38, 1] },
    { geometry: new THREE.TorusGeometry(0.38, 0.016, quality === 'high' ? 7 : 3, quality === 'high' ? 34 : 14), color: brainColor, position: [0, -0.005, 0.305], scale: [1, 0.34, 1] },
  ];
  for (let wave = -1; wave <= 1; wave += 1) {
    const points = Array.from({ length: 13 }, (_, index) => {
      const progress = index / 12;
      return new THREE.Vector3(
        THREE.MathUtils.lerp(-0.66, 0.66, progress),
        wave * 0.06 + Math.sin(progress * Math.PI * 3 + wave * 0.8) * 0.038,
        0.3 - Math.abs(wave) * 0.045,
      );
    });
    calmParts.push({ geometry: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), quality === 'high' ? 34 : 10, 0.018, quality === 'high' ? 7 : 3, false), color: brainColor });
  }

  const curiousNodes: Array<readonly [number, number, number]> = [
    [-0.5, -0.08, 0.3], [-0.28, 0.18, 0.31], [0, -0.02, 0.33],
    [0.27, 0.2, 0.3], [0.52, -0.06, 0.29], [0.08, 0.32, 0.25],
  ];
  const curiousParts: ColoredGeometryPart[] = curiousNodes.map((position, index) => ({
    geometry: sphere(quality, quality === 'high' ? 14 : 8, quality === 'high' ? 10 : 6), color: brainColor, position, scale: [index === 2 ? 0.075 : 0.055, index === 2 ? 0.075 : 0.055, 0.045],
  }));
  for (const [from, to] of [[0, 1], [1, 2], [1, 5], [2, 3], [2, 5], [3, 4], [3, 5]] as const) {
    const start = new THREE.Vector3(...curiousNodes[from]);
    const end = new THREE.Vector3(...curiousNodes[to]);
    curiousParts.push({ geometry: new THREE.TubeGeometry(new THREE.LineCurve3(start, end), quality === 'high' ? 4 : 3, 0.012, quality === 'high' ? 5 : 3, false), color: brainColor });
  }

  const focusedParts: ColoredGeometryPart[] = [
    { geometry: new THREE.TorusGeometry(0.48, 0.024, quality === 'high' ? 8 : 5, quality === 'high' ? 38 : 18), color: brainColor, position: [0, 0.05, 0.3], scale: [1, 0.72, 1] },
    { geometry: new THREE.TorusGeometry(0.34, 0.018, quality === 'high' ? 7 : 4, quality === 'high' ? 32 : 16), color: brainColor, position: [0, 0.05, 0.31], scale: [1, 0.72, 1] },
    { geometry: capsule('low', 0.025, 0.2), color: brainColor, position: [-0.08, 0.02, 0.36], rotation: [0, 0, -42 * DEG] },
    { geometry: capsule('low', 0.025, 0.34), color: brainColor, position: [0.11, 0.09, 0.36], rotation: [0, 0, 48 * DEG] },
  ];

  const spiralPointCount = quality === 'high' ? 46 : 24;
  const spiralPoints = Array.from({ length: spiralPointCount }, (_, index) => {
    const progress = index / (spiralPointCount - 1);
    const angle = progress * Math.PI * 5;
    const radius = 0.06 + progress * 0.48;
    return new THREE.Vector3(Math.cos(angle) * radius, 0.05 + Math.sin(angle) * radius * 0.66, 0.31);
  });
  const energizedParts: ColoredGeometryPart[] = [
    { geometry: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPoints), quality === 'high' ? 58 : 28, 0.022, quality === 'high' ? 7 : 4, false), color: brainColor },
    { geometry: sphere(quality, quality === 'high' ? 14 : 8, quality === 'high' ? 10 : 6), color: brainColor, position: [0, 0.05, 0.33], scale: [0.09, 0.09, 0.06] },
  ];

  const visuals: Record<RobotBrainState, THREE.Group> = {
    calm: createState('calm', 'project-manager-brain-wave-rings', calmParts),
    curious: createState('curious', 'project-manager-brain-node-network', curiousParts),
    focused: createState('focused', 'project-manager-brain-progress-check', focusedParts),
    energized: createState('energized', 'project-manager-brain-energy-spiral', energizedParts),
  };
  const brainCore = addMesh(brainRoot, 'project-manager-brain-core', sphere(quality, quality === 'high' ? 36 : 10, quality === 'high' ? 25 : 7), brainMaterial, 'project-manager', [0, 0.04, 0.18], [0, 0, 0], [0.13, 0.13, 0.13]);
  brainRoot.userData.v11FourStateBrain = 'calm-waveform-curious-network-focused-progress-check-energized-spiral';
  return { root: domeRoot, brain: { root: brainRoot, visuals, core: brainCore, material: brainMaterial } };
}

function addHeavyWorkerV2ServiceLayer(
  body: THREE.Group,
  quality: RobotQuality,
  materials: RobotMaterials,
  leftPalm: THREE.Group,
  rightPalm: THREE.Group,
) {
  const role: RobotRole = 'heavy-worker';
  const serviceRoot = namePart(new THREE.Group(), `${role}-v2-service-layer`, role, 'mechanical-service-layer');
  body.add(serviceRoot);

  const visorFrame = mergeColoredParts([
    { geometry: capsule('low', 0.035, 0.98), color: materials.whiteDeep.color, position: [0, 0.51, 0.985], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.62] },
    { geometry: capsule('low', 0.035, 0.98), color: materials.gunmetal.color, position: [0, -0.31, 0.995], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.62] },
    { geometry: capsule('low', 0.035, 0.6), color: materials.whiteDeep.color, position: [-0.7, 0.1, 0.975], rotation: [0, 0, -4 * DEG], scale: [1, 1, 0.62] },
    { geometry: capsule('low', 0.035, 0.6), color: materials.whiteDeep.color, position: [0.7, 0.1, 0.975], rotation: [0, 0, 4 * DEG], scale: [1, 1, 0.62] },
  ]);

  const canopyGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0.42),
    new THREE.Vector2(0.28, 0.4),
    new THREE.Vector2(0.55, 0.34),
    new THREE.Vector2(0.78, 0.23),
    new THREE.Vector2(0.92, 0.1),
    new THREE.Vector2(0.98, -0.02),
    new THREE.Vector2(0.88, -0.07),
    new THREE.Vector2(0.74, 0.04),
    new THREE.Vector2(0.52, 0.16),
    new THREE.Vector2(0.28, 0.24),
    new THREE.Vector2(0, 0.27),
  ], quality === 'high' ? 32 : 16);
  if (quality === 'high') {
    const canopyInnerWell = addMesh(
      serviceRoot,
      `${role}-v18-canopy-inner-optical-well`,
      sphere(quality, 32, 18),
      materials.gunmetal,
      role,
      [0, 0.73, 0.27],
      [0, 0, 0],
      [0.72, 0.23, 0.56],
    );
    canopyInnerWell.userData.explodeWithParent = true;
    const canopy = addMesh(serviceRoot, `${role}-v8-transparent-amber-canopy`, canopyGeometry, materials.goldGlass, role, [0, 0.72, 0.32], [0, 0, 0], [0.97, 1, 0.84]);
    canopy.scale.set(0.86, 0.94, 0.75);
    canopy.userData.profileDrivenCanopy = true;
    canopy.userData.segmentedBy = `${role}-gold-crown-band`;
    canopy.userData.v10AmberOptics = 'clear-amber-segmented-optical-glazing-with-deep-edge-attenuation';
    canopy.renderOrder = 3;
  }

  const cartridgeGeometry = mergeColoredParts([
    { geometry: sphere('low'), color: materials.whiteDeep.color, scale: [0.28, 0.34, 0.23] },
    { geometry: capsule('low', 0.07, 0.28), color: materials.gold.color, position: [0, 0.25, 0.02], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.8] },
    { geometry: capsule('low', 0.12, 0.24), color: materials.gunmetal.color, position: [0, -0.015, 0.235], scale: [1, 1, 0.62] },
    { geometry: new THREE.TorusGeometry(0.13, 0.035, 6, quality === 'high' ? 14 : 10), color: materials.gold.color, position: [0, 0.015, 0.31] },
    { geometry: new THREE.CylinderGeometry(0.07, 0.07, 0.055, quality === 'high' ? 10 : 7), color: materials.gunmetal.color, position: [0, 0.015, 0.31], rotation: [90 * DEG, 0, 0] },
    { geometry: capsule('low', 0.018, 0.1), color: materials.cyan.color, position: [0, -0.2, 0.315], rotation: [0, 0, 90 * DEG] },
  ]);
  const cartridgeMatrices = [-1, 1].map((side) => composeMatrix([side * 1.13, 0.29, 0.51], [0, side * -7 * DEG, side * -3 * DEG], [1, 1, 1]));

  const browBridgePlate = createExtrudedPlate([
    [-0.88, 0.53], [0.88, 0.53], [0.78, 0.39], [0.4, 0.34],
    [0.2, 0.405], [-0.2, 0.405], [-0.4, 0.34], [-0.78, 0.39],
  ], 0.09, quality);
  const leftCheekPlate = createExtrudedPlate([
    [-1.01, 0.2], [-0.91, 0.24], [-0.84, 0.12], [-0.86, -0.08],
    [-0.92, -0.22], [-1.0, -0.16],
  ], 0.055, quality);
  const rightCheekPlate = createExtrudedPlate([
    [1.01, 0.2], [0.91, 0.24], [0.84, 0.12], [0.86, -0.08],
    [0.92, -0.22], [1.0, -0.16],
  ], 0.055, quality);
  const bellyApronPlate = createExtrudedPlate([
    [-0.76, -0.45], [0.76, -0.45], [0.69, -0.76], [0.47, -0.9],
    [-0.47, -0.9], [-0.69, -0.76],
  ], 0.12, quality);
  const bellyInsetPlate = createExtrudedPlate([
    [-0.49, -0.55], [0.49, -0.55], [0.42, -0.75], [0.28, -0.82],
    [-0.28, -0.82], [-0.42, -0.75],
  ], 0.07, quality);
  const shoulderCarrierPlate = createExtrudedPlate([
    [-0.18, 0.29], [0.18, 0.29], [0.23, 0.24], [0.23, -0.24],
    [0.18, -0.29], [-0.18, -0.29], [-0.23, -0.24], [-0.23, 0.24],
  ], 0.38, quality);
  const shoulderInsetPlate = createExtrudedPlate([
    [-0.125, 0.21], [0.125, 0.21], [0.165, 0.17], [0.165, -0.17],
    [0.125, -0.21], [-0.125, -0.21], [-0.165, -0.17], [-0.165, 0.17],
  ], 0.43, quality);

  const frontServiceGeometry = mergeColoredParts([
    { geometry: browBridgePlate, color: materials.white.color, position: [0, 0, 1.005] },
    { geometry: leftCheekPlate, color: materials.whiteDeep.color, position: [0, 0, 0.965] },
    { geometry: rightCheekPlate, color: materials.whiteDeep.color, position: [0, 0, 0.965] },
    { geometry: bellyApronPlate, color: materials.whiteDeep.color, position: [0, 0, 0.98] },
    { geometry: bellyInsetPlate, color: materials.gunmetal.color, position: [0, 0, 1.075] },
    { geometry: capsule('low', 0.07, 0.62), color: materials.gunmetal.color, position: [0, 0.48, 0.87], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.86] },
    { geometry: capsule('low', 0.042, 0.34), color: materials.gold.color, position: [0, 0.54, 0.92], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.86] },
    { geometry: sphere('low'), color: materials.whiteDeep.color, position: [-1.02, 0.25, 0.43], rotation: [0, -8 * DEG, -8 * DEG], scale: [0.37, 0.43, 0.38] },
    { geometry: sphere('low'), color: materials.whiteDeep.color, position: [1.02, 0.25, 0.43], rotation: [0, 8 * DEG, 8 * DEG], scale: [0.37, 0.43, 0.38] },
    { geometry: new THREE.CylinderGeometry(0.27, 0.27, 0.13, quality === 'high' ? 12 : 10), color: materials.gunmetal.color, position: [-1.19, 0.25, 0.56], rotation: [0, 0, 90 * DEG] },
    { geometry: new THREE.CylinderGeometry(0.27, 0.27, 0.13, quality === 'high' ? 12 : 10), color: materials.gunmetal.color, position: [1.19, 0.25, 0.56], rotation: [0, 0, 90 * DEG] },
    { geometry: new THREE.TorusGeometry(0.265, 0.038, quality === 'high' ? 7 : 6, quality === 'high' ? 14 : 12), color: materials.gold.color, position: [-1.265, 0.25, 0.56], rotation: [0, 90 * DEG, 0] },
    { geometry: new THREE.TorusGeometry(0.265, 0.038, quality === 'high' ? 7 : 6, quality === 'high' ? 14 : 12), color: materials.gold.color, position: [1.265, 0.25, 0.56], rotation: [0, 90 * DEG, 0] },
    ...([-1, 1] as const).flatMap((side) => [
      { geometry: shoulderCarrierPlate.clone(), color: materials.whiteDeep.color, position: [side * 1.13, 0.31, 0.58] as const, rotation: [0, side * -7 * DEG, side * -3 * DEG] as const },
      { geometry: shoulderInsetPlate.clone(), color: materials.gunmetal.color, position: [side * 1.15, 0.29, 0.77] as const, rotation: [0, side * -7 * DEG, side * -3 * DEG] as const },
      { geometry: new THREE.BoxGeometry(0.36, 0.11, 0.46), color: materials.gold.color, position: [side * 1.14, 0.525, 0.76] as const, rotation: [0, side * -7 * DEG, side * -3 * DEG] as const },
      { geometry: new THREE.BoxGeometry(0.09, 0.36, 0.47), color: materials.gold.color, position: [side * 1.31, 0.28, 0.75] as const, rotation: [0, side * -7 * DEG, side * -3 * DEG] as const },
      { geometry: new THREE.BoxGeometry(0.18, 0.08, 0.055), color: materials.cyan.color, position: [side * 1.14, 0.22, 1.005] as const, rotation: [0, side * -7 * DEG, side * -3 * DEG] as const },
    ]),
    { geometry: capsule('low', 0.13, 0.3), color: materials.white.color, position: [-0.76, -0.07, 0.945], rotation: [0, -5 * DEG, -17 * DEG], scale: [1, 1, 0.56] },
    { geometry: capsule('low', 0.13, 0.3), color: materials.white.color, position: [0.76, -0.07, 0.945], rotation: [0, 5 * DEG, 17 * DEG], scale: [1, 1, 0.56] },
    { geometry: capsule('low', 0.075, 0.42), color: materials.whiteDeep.color, position: [0, -0.78, 0.83], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.78] },
    { geometry: capsule('low', 0.038, 0.21), color: materials.gold.color, position: [0, -0.75, 0.91], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.78] },
    { geometry: capsule('low', 0.14, 0.28), color: materials.whiteDeep.color, position: [-1.0, 0.2, 0.72], rotation: [0, -9 * DEG, -18 * DEG], scale: [1, 1, 0.72] },
    { geometry: capsule('low', 0.14, 0.28), color: materials.whiteDeep.color, position: [1.0, 0.2, 0.72], rotation: [0, 9 * DEG, 18 * DEG], scale: [1, 1, 0.72] },
    { geometry: new THREE.BoxGeometry(0.23, 0.09, 0.2), color: materials.gold.color, position: [-1.14, 0.33, 0.81], rotation: [0, -9 * DEG, -18 * DEG] },
    { geometry: new THREE.BoxGeometry(0.23, 0.09, 0.2), color: materials.gold.color, position: [1.14, 0.33, 0.81], rotation: [0, 9 * DEG, 18 * DEG] },
    { geometry: capsule('low', 0.11, 0.27), color: materials.gunmetal.color, position: [-0.68, -0.27, 0.965], rotation: [0, -5 * DEG, -17 * DEG], scale: [1, 1, 0.58] },
    { geometry: capsule('low', 0.11, 0.27), color: materials.gunmetal.color, position: [0.68, -0.27, 0.965], rotation: [0, 5 * DEG, 17 * DEG], scale: [1, 1, 0.58] },
    { geometry: new THREE.BoxGeometry(0.42, 0.2, 0.08), color: materials.white.color, position: [-0.47, -0.28, 1.0], rotation: [0, -4 * DEG, -12 * DEG] },
    { geometry: new THREE.BoxGeometry(0.42, 0.2, 0.08), color: materials.white.color, position: [0.47, -0.28, 1.0], rotation: [0, 4 * DEG, 12 * DEG] },
    { geometry: new THREE.BoxGeometry(0.29, 0.12, 0.07), color: materials.gunmetal.color, position: [-0.5, -0.38, 1.055], rotation: [0, -4 * DEG, -12 * DEG] },
    { geometry: new THREE.BoxGeometry(0.29, 0.12, 0.07), color: materials.gunmetal.color, position: [0.5, -0.38, 1.055], rotation: [0, 4 * DEG, 12 * DEG] },
    { geometry: new THREE.BoxGeometry(0.3, 0.2, 0.09), color: materials.whiteDeep.color, position: [-0.34, -0.72, 0.93], rotation: [0, -3 * DEG, -7 * DEG] },
    { geometry: new THREE.BoxGeometry(0.3, 0.2, 0.09), color: materials.whiteDeep.color, position: [0.34, -0.72, 0.93], rotation: [0, 3 * DEG, 7 * DEG] },
    { geometry: new THREE.BoxGeometry(1.12, 0.24, 0.14), color: materials.gunmetal.color, position: [0, -0.62, 0.94] },
    { geometry: new THREE.BoxGeometry(0.76, 0.29, 0.15), color: materials.gold.color, position: [0, -0.6, 1.005] },
    { geometry: new THREE.BoxGeometry(0.42, 0.23, 0.11), color: materials.whiteDeep.color, position: [0, -0.58, 1.095] },
    { geometry: new THREE.BoxGeometry(0.26, 0.13, 0.05), color: materials.gunmetal.color, position: [0, -0.58, 1.16] },
    { geometry: capsule('low', 0.085, 0.22), color: materials.gunmetal.color, position: [-0.56, -0.47, 0.955], rotation: [0, 0, -14 * DEG], scale: [1, 1, 0.6] },
    { geometry: capsule('low', 0.085, 0.22), color: materials.gunmetal.color, position: [0.56, -0.47, 0.955], rotation: [0, 0, 14 * DEG], scale: [1, 1, 0.6] },
    { geometry: new THREE.BoxGeometry(0.12, 0.24, 0.08), color: materials.gold.color, position: [-0.42, -0.55, 1.035] },
    { geometry: new THREE.BoxGeometry(0.12, 0.24, 0.08), color: materials.gold.color, position: [0.42, -0.55, 1.035] },
    ...[-0.2, 0, 0.2].map((x) => ({
      geometry: new THREE.BoxGeometry(0.08, 0.035, 0.035),
      color: materials.cyan.color,
      position: [x, -0.58, 1.19] as const,
    })),
    { geometry: capsule('low', 0.08, 0.18), color: materials.gunmetal.color, position: [-0.84, -0.59, 1.0], rotation: [0, -6 * DEG, -9 * DEG], scale: [1, 1, 0.62] },
    { geometry: capsule('low', 0.08, 0.18), color: materials.gunmetal.color, position: [0.84, -0.59, 1.0], rotation: [0, 6 * DEG, 9 * DEG], scale: [1, 1, 0.62] },
    { geometry: new THREE.BoxGeometry(0.08, 0.11, 0.035), color: materials.cyan.color, position: [-0.84, -0.59, 1.06], rotation: [0, 0, -9 * DEG] },
    { geometry: new THREE.BoxGeometry(0.08, 0.11, 0.035), color: materials.cyan.color, position: [0.84, -0.59, 1.06], rotation: [0, 0, 9 * DEG] },
    { geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.34, quality === 'high' ? 12 : 8), color: materials.gold.color, position: [-0.73, -0.57, 0.98] },
    { geometry: new THREE.CylinderGeometry(0.052, 0.052, 0.29, quality === 'high' ? 10 : 7), color: materials.gunmetal.color, position: [-0.84, -0.57, 0.97] },
    { geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.34, quality === 'high' ? 12 : 8), color: materials.gold.color, position: [0.73, -0.57, 0.98] },
    { geometry: new THREE.CylinderGeometry(0.052, 0.052, 0.29, quality === 'high' ? 10 : 7), color: materials.gunmetal.color, position: [0.84, -0.57, 0.97] },
    { geometry: new THREE.BoxGeometry(1.68, 0.105, 0.105), color: materials.gold.color, position: [0, -0.67, 1.12] },
    { geometry: new THREE.BoxGeometry(0.5, 0.3, 0.13), color: materials.gold.color, position: [0, -0.73, 1.14] },
    { geometry: new THREE.BoxGeometry(0.35, 0.18, 0.085), color: materials.gunmetal.color, position: [0, -0.72, 1.225] },
    { geometry: new THREE.BoxGeometry(0.33, 0.29, 0.13), color: materials.whiteDeep.color, position: [-0.63, -0.72, 1.14] },
    { geometry: new THREE.BoxGeometry(0.22, 0.16, 0.075), color: materials.gunmetal.color, position: [-0.63, -0.72, 1.225] },
    ...[0.52, 0.69, 0.86].flatMap((x) => [
      { geometry: new THREE.CylinderGeometry(0.056, 0.056, 0.3, quality === 'high' ? 10 : 7), color: materials.gunmetal.color, position: [x, -0.72, 1.18] as const },
      { geometry: new THREE.CylinderGeometry(0.068, 0.068, 0.055, quality === 'high' ? 10 : 7), color: materials.gold.color, position: [x, -0.545, 1.18] as const },
      { geometry: new THREE.CylinderGeometry(0.068, 0.068, 0.055, quality === 'high' ? 10 : 7), color: materials.gold.color, position: [x, -0.895, 1.18] as const },
    ]),
  ]);

  const rearSpineGeometry = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.72, 0.68, 0.08), color: materials.whiteDeep.color, position: [0, -0.02, -0.955] },
    { geometry: new THREE.BoxGeometry(0.54, 0.86, 0.13), color: materials.gunmetal.color, position: [0, 0.02, -1.01] },
    { geometry: new THREE.BoxGeometry(0.22, 1.02, 0.18), color: materials.gunmetal.color, position: [0, 0.16, -1.075] },
    { geometry: new THREE.BoxGeometry(0.28, 0.18, 0.2), color: materials.gold.color, position: [0, 0.59, -1.075] },
    { geometry: new THREE.BoxGeometry(0.38, 0.12, 0.19), color: materials.whiteDeep.color, position: [0, 0.42, -1.07] },
    { geometry: new THREE.BoxGeometry(0.62, 0.1, 0.15), color: materials.gold.color, position: [0, 0.12, -1.07] },
    { geometry: new THREE.BoxGeometry(0.12, 0.22, 0.2), color: materials.gold.color, position: [-0.34, 0.01, -1.06] },
    { geometry: new THREE.BoxGeometry(0.12, 0.22, 0.2), color: materials.gold.color, position: [0.34, 0.01, -1.06] },
  ]);

  const rearCanisterGeometry = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.96, 0.1, 0.18), color: materials.gunmetal.color, position: [0, -0.04, -1.1] },
    ...[-0.42, -0.22, 0.22, 0.42].flatMap((x) => [
      { geometry: new THREE.CylinderGeometry(0.082, 0.082, 0.43, quality === 'high' ? 10 : 7), color: materials.whiteDeep.color, position: [x, -0.08, -1.14] as const },
      { geometry: new THREE.CylinderGeometry(0.095, 0.095, 0.05, quality === 'high' ? 10 : 7), color: materials.gold.color, position: [x, 0.16, -1.14] as const },
      { geometry: new THREE.CylinderGeometry(0.095, 0.095, 0.05, quality === 'high' ? 10 : 7), color: materials.gold.color, position: [x, -0.32, -1.14] as const },
      { geometry: new THREE.BoxGeometry(0.035, 0.22, 0.03), color: materials.cyan.color, position: [x, -0.08, -1.235] as const },
    ]),
    { geometry: new THREE.BoxGeometry(0.12, 0.48, 0.16), color: materials.gold.color, position: [-0.56, -0.08, -1.1] },
    { geometry: new THREE.BoxGeometry(0.12, 0.48, 0.16), color: materials.gold.color, position: [0.56, -0.08, -1.1] },
  ]);

  const rearReactorGeometry = mergeColoredParts([
    { geometry: new THREE.TorusGeometry(0.29, 0.075, quality === 'high' ? 8 : 6, quality === 'high' ? 22 : 14), color: materials.gunmetal.color, position: [0, -0.39, -1.12] },
    { geometry: new THREE.TorusGeometry(0.21, 0.035, quality === 'high' ? 7 : 5, quality === 'high' ? 20 : 12), color: materials.gold.color, position: [0, -0.39, -1.17] },
    { geometry: new THREE.CylinderGeometry(0.145, 0.145, 0.09, quality === 'high' ? 16 : 10), color: materials.cyan.color, position: [0, -0.39, -1.19], rotation: [90 * DEG, 0, 0] },
    { geometry: new THREE.CylinderGeometry(0.065, 0.065, 0.11, quality === 'high' ? 14 : 9), color: materials.whiteDeep.color, position: [0, -0.39, -1.235], rotation: [90 * DEG, 0, 0] },
    ...Array.from({ length: quality === 'high' ? 8 : 4 }, (_, index) => {
      const angle = (index / (quality === 'high' ? 8 : 4)) * Math.PI * 2;
      return {
        geometry: new THREE.BoxGeometry(0.035, 0.09, 0.035),
        color: materials.cyan.color,
        position: [Math.cos(angle) * 0.245, -0.39 + Math.sin(angle) * 0.245, -1.205] as const,
        rotation: [0, 0, angle] as const,
      };
    }),
  ]);

  const serviceGeometries: THREE.BufferGeometry[] = [visorFrame, frontServiceGeometry, rearSpineGeometry, rearCanisterGeometry, rearReactorGeometry];
  if (quality === 'low') {
    serviceGeometries.push(mergeColoredParts([
      { geometry: canopyGeometry, color: materials.gold.color, position: [0, 0.72, 0.32], scale: [0.97, 1, 0.84] },
    ]));
    serviceGeometries.push(createHeavyCanopyFrameGeometry(quality, materials));
    cartridgeMatrices.forEach((matrix) => {
      const cartridge = cartridgeGeometry.clone();
      cartridge.applyMatrix4(matrix);
      serviceGeometries.push(cartridge);
    });
  }
  if (quality === 'low') {
    const staticServiceGeometry = mergeGeometries(serviceGeometries, false);
    if (!staticServiceGeometry) throw new Error('Could not merge Heavy Worker v3 phone service layer');
    addMesh(serviceRoot, `${role}-v3-integrated-service-hardware`, staticServiceGeometry, materials.jointComposite, role);
  } else {
    const frontWaistGeometry = mergeGeometries([visorFrame, frontServiceGeometry], false);
    if (!frontWaistGeometry) throw new Error('Could not merge Heavy Worker v3 front waist');
    const frontWaist = addMesh(serviceRoot, `${role}-v3-front-waist-system`, frontWaistGeometry, materials.jointComposite, role);
    frontWaist.scale.set(0.92, 0.92, 1);

    const spineGeometries: THREE.BufferGeometry[] = [rearSpineGeometry];
    cartridgeMatrices.forEach((matrix) => {
      const cartridge = cartridgeGeometry.clone();
      cartridge.applyMatrix4(matrix);
      spineGeometries.push(cartridge);
    });
    const spineGeometry = mergeGeometries(spineGeometries, false);
    if (!spineGeometry) throw new Error('Could not merge Heavy Worker v3 rear spine');
    addMesh(serviceRoot, `${role}-v3-rear-service-spine`, spineGeometry, materials.jointComposite, role);
    addMesh(serviceRoot, `${role}-v3-rear-canister-rack`, rearCanisterGeometry, materials.jointComposite, role);
    addMesh(serviceRoot, `${role}-v3-rear-reactor`, rearReactorGeometry, materials.jointComposite, role);
  }

  leftPalm.userData.v2FingerPinContract = 'gold knuckle pins are represented by the shared articulated digit hinge language';
  rightPalm.userData.v2FingerPinContract = 'gold knuckle pins are represented by the shared articulated digit hinge language';
  serviceRoot.userData.v10ShoulderDensity = 'rectangular-cartridge-gunmetal-inset-gold-perimeter-exposed-upper-rails';
  serviceRoot.userData.v10ServiceBelt = 'continuous-gold-rail-central-inset-left-utility-right-canister-bank';
  return serviceRoot;
}

function addHeavyWorkerV17ClosureLayer(
  body: THREE.Group,
  quality: RobotQuality,
  materials: RobotMaterials,
) {
  const role: RobotRole = 'heavy-worker';
  const closureRoot = namePart(new THREE.Group(), `${role}-v17-closure-layer`, role, 'mechanical-closure-layer');
  body.add(closureRoot);

  const rearCradleOuter = createRoundedRectanglePlate(0.94, 1.02, 0.23, 0.16, quality);
  const rearCradleInner = createRoundedRectanglePlate(0.7, 0.82, 0.18, 0.13, quality);
  const sideRootPlate = createRoundedRectanglePlate(0.72, 0.86, 0.2, 0.16, quality);
  const sideRootInset = createRoundedRectanglePlate(0.51, 0.63, 0.15, 0.12, quality);
  const dorsalDeckOuter = createRoundedRectanglePlate(0.46, 0.86, 0.14, 0.1, quality);
  const dorsalDeckInner = createRoundedRectanglePlate(0.29, 0.63, 0.1, 0.08, quality);
  const upperRearSpineOuter = createRoundedRectanglePlate(0.38, 0.68, 0.12, 0.12, quality);
  const upperRearSpineInner = createRoundedRectanglePlate(0.22, 0.49, 0.08, 0.09, quality);

  const closureParts: ColoredGeometryPart[] = [
    // The rear service hardware now nests into a stepped armored cradle instead
    // of reading as a flat cassette floating behind the spherical chassis.
    { geometry: rearCradleOuter, color: materials.whiteDeep.color, position: [0, 0.02, -0.87] },
    { geometry: rearCradleInner, color: materials.gunmetal.color, position: [0, 0.01, -0.965] },
    { geometry: capsule('low', 0.095, 0.76), color: materials.gunmetal.color, position: [0, 0.31, -0.99] },
    { geometry: capsule('low', 0.045, 0.52), color: materials.gold.color, position: [0, 0.34, -1.055] },
    { geometry: new THREE.BoxGeometry(0.38, 0.1, 0.13), color: materials.white.color, position: [0, 0.69, -0.93] },
    { geometry: new THREE.BoxGeometry(0.2, 0.08, 0.16), color: materials.cyan.color, position: [0, 0.69, -1.005] },
    // A shallow dorsal deck breaks the top silhouette without becoming a
    // decorative backpack. It visibly joins the crown sockets to the spine.
    { geometry: dorsalDeckOuter, color: materials.whiteDeep.color, position: [0, 1.325, -0.2], rotation: [90 * DEG, 0, 0] },
    { geometry: dorsalDeckInner, color: materials.gunmetal.color, position: [0, 1.382, -0.2], rotation: [90 * DEG, 0, 0] },
    { geometry: new THREE.BoxGeometry(0.15, 0.065, 0.18), color: materials.gold.color, position: [0, 1.424, 0.12] },
    ...[-0.2, 0, 0.2].map((z) => ({
      geometry: new THREE.CylinderGeometry(0.042, 0.042, 0.06, quality === 'high' ? 10 : 7),
      color: z === 0 ? materials.cyan.color : materials.gold.color,
      position: [0, 1.445, z - 0.22] as const,
    })),
    // The upper rear spine continues the recessed cassette toward the crown.
    { geometry: upperRearSpineOuter, color: materials.whiteDeep.color, position: [0, 0.72, -0.79] },
    { geometry: upperRearSpineInner, color: materials.gunmetal.color, position: [0, 0.72, -0.865] },
    { geometry: new THREE.BoxGeometry(0.11, 0.3, 0.07), color: materials.gold.color, position: [0, 0.73, -0.93] },
    { geometry: new THREE.BoxGeometry(0.08, 0.08, 0.05), color: materials.cyan.color, position: [0, 0.92, -0.97] },
    // Side shoulder keels bridge the forward cartridges into the rear shell.
    ...([-1, 1] as const).flatMap((side) => [
      { geometry: sideRootPlate.clone(), color: materials.whiteDeep.color, position: [side * 1.12, 0.18, -0.13] as const, rotation: [0, side * 90 * DEG, 0] as const },
      { geometry: sideRootInset.clone(), color: materials.gunmetal.color, position: [side * 1.2, 0.17, -0.12] as const, rotation: [0, side * 90 * DEG, 0] as const },
      { geometry: capsule('low', 0.045, 0.5), color: materials.gold.color, position: [side * 1.27, 0.16, -0.13] as const, rotation: [0, 0, 0] as const },
      { geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.08, quality === 'high' ? 12 : 8), color: materials.cyan.color, position: [side * 1.305, 0.37, -0.12] as const, rotation: [0, 0, 90 * DEG] as const },
      // The turnaround's exact profile is anchored by this large concentric
      // load gimbal, with the animated shoulder pivot nested inside it.
      { geometry: new THREE.CylinderGeometry(0.36, 0.36, 0.14, quality === 'high' ? 32 : 16), color: materials.gunmetal.color, position: [side * 1.17, 0.12, 0.58] as const, rotation: [0, 0, 90 * DEG] as const },
      { geometry: new THREE.TorusGeometry(0.355, 0.046, quality === 'high' ? 8 : 5, quality === 'high' ? 32 : 16), color: materials.gold.color, position: [side * 1.27, 0.12, 0.58] as const, rotation: [0, 90 * DEG, 0] as const },
      { geometry: sphere('low'), color: materials.whiteDeep.color, position: [side * 0.83, -0.08, -0.72] as const, scale: [0.3, 0.49, 0.16] as const },
      { geometry: sphere('low'), color: materials.gunmetal.color, position: [side * 0.83, -0.08, -0.855] as const, scale: [0.17, 0.32, 0.055] as const },
      { geometry: capsule('low', 0.026, 0.24), color: materials.gold.color, position: [side * 0.83, -0.08, -0.91] as const },
    ]),
    // A protected lower collar closes the body around the hover reactor.
    { geometry: new THREE.CylinderGeometry(0.76, 0.61, 0.22, quality === 'high' ? 36 : 18), color: materials.whiteDeep.color, position: [0, -1.43, 0.055] },
    { geometry: new THREE.TorusGeometry(0.64, 0.07, quality === 'high' ? 8 : 5, quality === 'high' ? 32 : 16), color: materials.gunmetal.color, position: [0, -1.53, 0.055], rotation: [90 * DEG, 0, 0] },
    { geometry: new THREE.TorusGeometry(0.49, 0.035, quality === 'high' ? 7 : 4, quality === 'high' ? 28 : 14), color: materials.gold.color, position: [0, -1.555, 0.055], rotation: [90 * DEG, 0, 0] },
    { geometry: capsule('low', 0.075, 0.68), color: materials.gunmetal.color, position: [0, -1.505, 0.69], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.62] },
    { geometry: capsule('low', 0.035, 0.48), color: materials.cyan.color, position: [0, -1.52, 0.755], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.62] },
    { geometry: capsule('low', 0.075, 0.68), color: materials.gunmetal.color, position: [0, -1.505, -0.58], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.62] },
    { geometry: capsule('low', 0.035, 0.48), color: materials.cyan.color, position: [0, -1.52, -0.645], rotation: [0, 0, 90 * DEG], scale: [1, 1, 0.62] },
    ...Array.from({ length: quality === 'high' ? 12 : 6 }, (_, index) => {
      const count = quality === 'high' ? 12 : 6;
      const angle = (index / count) * Math.PI * 2;
      return {
        geometry: new THREE.BoxGeometry(0.08, 0.09, 0.28),
        color: materials.gunmetal.color,
        position: [Math.cos(angle) * 0.44, -1.57, 0.055 + Math.sin(angle) * 0.44] as const,
        rotation: [0, -angle, 0] as const,
      };
    }),
    ...Array.from({ length: quality === 'high' ? 8 : 4 }, (_, index) => {
      const count = quality === 'high' ? 8 : 4;
      const angle = (index / count) * Math.PI * 2 + Math.PI / count;
      return {
        geometry: new THREE.BoxGeometry(0.045, 0.035, 0.12),
        color: materials.cyan.color,
        position: [Math.cos(angle) * 0.54, -1.615, 0.055 + Math.sin(angle) * 0.54] as const,
        rotation: [0, -angle, 0] as const,
      };
    }),
  ];

  const rearContourCurves = ([-1, 1] as const).map((side) => new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.78, 0.57, -0.72),
      new THREE.Vector3(side * 0.91, 0.22, -0.82),
      new THREE.Vector3(side * 0.86, -0.27, -0.8),
      new THREE.Vector3(side * 0.69, -0.61, -0.68),
    ]),
    quality === 'high' ? 16 : 8,
    0.032,
    quality === 'high' ? 7 : 4,
    false,
  ));
  rearContourCurves.forEach((geometry) => closureParts.push({ geometry, color: materials.gold.color }));

  const closureGeometry = mergeColoredParts(closureParts);
  const closureMesh = addMesh(closureRoot, `${role}-v17-360-closure-system`, closureGeometry, materials.jointComposite, role);
  closureMesh.userData.v17ClosureContract = 'rear-cradle-side-shoulder-keels-closed-underbody-baffles';
  return closureRoot;
}

function createHeavyWorker(quality: RobotQuality, materials: RobotMaterials, sockets: Record<string, THREE.Object3D>): MemberRig {
  const role: RobotRole = 'heavy-worker';
  const root = namePart(new THREE.Group(), role, role, 'member-root');
  root.scale.setScalar(ROBOT_FAMILY_SCALE[role]);
  root.userData.familyScale = ROBOT_FAMILY_SCALE[role];
  const body = namePart(new THREE.Group(), `${role}-body-root`, role, 'body-root');
  body.position.y = 2.14;
  root.add(body);
  const mainShell = addMesh(body, `${role}-main-shell`, createHeavyLoadShellGeometry(quality), materials.white, role, [0, 0.015, 0.025], [0, 0, 0], [1.22, 1.24, 1.01]);
  mainShell.userData.v9TorsoEnvelope = 'tall-dense-load-bearing-ovoid';
  mainShell.userData.v18TorsoEnvelope = 'broad-pear-load-chassis-with-shoulder-barrel-and-lower-reactor-taper';
  addMesh(body, `${role}-lower-shell`, sphere(quality, quality === 'high' ? 30 : 16, quality === 'high' ? 20 : 11), materials.whiteDeep, role, [0, -0.56, 0.015], [0, 0, 0], [1.18, 0.92, 0.97]);
  addMesh(body, `${role}-panel-seam-system`, new THREE.TorusGeometry(1, 0.055, quality === 'high' ? 8 : 5, quality === 'high' ? 40 : 20), materials.gunmetal, role, [0, -0.55, 0.035], [90 * DEG, 0, 0], [1.07, 1, 0.86]);
  // The worker reference reads as one uninterrupted, nearly flat black face
  // window. A shallow rounded plate keeps the legacy front-service hardware
  // behind the glass instead of letting the curved edge fall through it.
  const visor = addMesh(body, `${role}-curved-visor`, createRoundedRectanglePlate(
    1.62,
    0.78,
    0.2,
    0.065,
    quality,
  ), materials.visor, role, [0, 0.12, 1.12]);
  visor.renderOrder = 2;
  visor.userData.v10StructuralFaceRatio = 'compact-visor-close-set-eyes-subtle-animated-brows';
  visor.userData.v18ReferenceVisor = 'rounded-rectangular-black-glass-panel-deeply-seated-inside-armored-brow';
  const visorLip = addMesh(body, `${role}-v18-visor-shell-lip`, createRoundedRectangleFrame(
    1.72,
    0.88,
    0.25,
    1.62,
    0.78,
    0.2,
    0.04,
    quality,
  ), materials.visorRim, role, [0, 0.12, 1.17]);
  visorLip.userData.v18EmbeddedVisorLip = 'thin-metallic-gasket-overlapped-by-white-brow-and-cheek-armor';
  if (quality === 'high') {
    const canopyFrame = addMesh(body, `${role}-gold-crown-band`, createHeavyCanopyFrameGeometry(quality, materials), materials.jointComposite, role);
    canopyFrame.scale.set(0.94, 0.88, 0.9);
    canopyFrame.userData.v8CanopyFrame = 'rolled-base-hoop-five-front-ribs';
  } else {
    body.add(namePart(new THREE.Group(), `${role}-gold-crown-band`, role, 'integrated-low-detail'));
  }
  const eyeAssembly = createHeavyEyePair(body, quality, materials.cyan, [
    { position: [-0.26, 0.17, 1.09], scale: [0.18, 0.15, 1], rotationZ: -18 * DEG },
    { position: [0.26, 0.17, 1.09], scale: [0.18, 0.15, 1], rotationZ: 18 * DEG },
  ]);
  eyeAssembly.root.position.z = 0.16;
  const mouth = createSmile(body, role, materials.cyan, [0, -0.12, 1.255], 1.04);
  const face = createFaceRig(body, role, quality, materials.cyan, eyeAssembly, mouth);
  face.root.userData.v10AnimatedFaceContract = 'blink-gaze-five-emotions-preserved-after-compact-ratio-pass';
  const leftArm = createArm(body, `${role}-left`, role, quality, materials, -1, [-1.27, 0.12, 0.58], 1, materials.gold, 1.25);
  const rightArm = createArm(body, `${role}-right`, role, quality, materials, 1, [1.27, 0.12, 0.58], 1, materials.gold, 1.25);
  leftArm.shoulder.rotation.x = -12 * DEG;
  rightArm.shoulder.rotation.x = -12 * DEG;
  leftArm.shoulder.userData.v17ProfileClearance = 'forward-canted-neutral-load-arm';
  rightArm.shoulder.userData.v17ProfileClearance = 'forward-canted-neutral-load-arm';
  const crownLeft = createAutonomousArm(body, `${role}-crown-left`, role, quality, materials, -1, [-0.43, 0.86, 0]);
  const crownRight = createAutonomousArm(body, `${role}-crown-right`, role, quality, materials, 1, [0.43, 0.86, 0]);
  const serviceLayer = addHeavyWorkerV2ServiceLayer(body, quality, materials, leftArm.palm, rightArm.palm);
  const closureLayer = addHeavyWorkerV17ClosureLayer(body, quality, materials);
  const hoverCore = createHoverCore(root, role, quality, materials, materials.cyan, 0.53, 0.6);
  const hoverGlow = hoverCore.getObjectByName(`${role}-hover-glow`);
  if (hoverGlow) hoverGlow.visible = false;
  createSocket(body, sockets, `${role}:front-utility`, [0, -0.42, 0.92]);
  createSocket(body, sockets, `${role}:rear-utility`, [0, 0.08, -0.94], [0, Math.PI, 0]);
  createSocket(body, sockets, `${role}:crown-left`, [-0.43, 0.86, 0]);
  createSocket(body, sockets, `${role}:crown-right`, [0.43, 0.86, 0]);
  const liftLoadSocket = createSocket(body, sockets, `${role}:lift-load`, [0, 1.35, 1.02]);
  liftLoadSocket.userData.v9ObjectCenteredLift = true;
  const liftLoad = namePart(new THREE.Group(), `${role}-v9-lift-load-yoke`, role, 'interaction-load');
  liftLoad.position.copy(liftLoadSocket.position);
  liftLoad.visible = false;
  body.add(liftLoad);
  addMesh(
    liftLoad,
    `${role}-v9-lift-load-beam`,
    mergeColoredParts([
      { geometry: new THREE.BoxGeometry(2.62, 0.16, 0.2), color: materials.gunmetal.color },
      { geometry: new THREE.BoxGeometry(2.34, 0.08, 0.23), color: materials.gold.color, position: [0, 0.08, 0] },
      { geometry: new THREE.BoxGeometry(0.12, 0.26, 0.27), color: materials.cyan.color, position: [-1.14, 0, 0] },
      { geometry: new THREE.BoxGeometry(0.12, 0.26, 0.27), color: materials.cyan.color, position: [1.14, 0, 0] },
    ]),
    materials.jointComposite,
    role,
  );
  if (quality === 'low') {
    consolidateLowStaticMeshes(body, role, [
      `${role}-main-shell`,
      `${role}-lower-shell`,
      `${role}-panel-seam-system`,
      `${role}-v18-visor-shell-lip`,
      `${role}-v3-integrated-service-hardware`,
      `${role}-v17-360-closure-system`,
    ], materials.lodComposite);
  }
  return {
    role,
    root,
    body,
    face,
    mouth,
    articulated: [leftArm.shoulder, leftArm.elbow, rightArm.shoulder, rightArm.elbow, crownLeft.root, crownLeft.elbow, crownRight.root, crownRight.elbow, serviceLayer, closureLayer],
    joints: {
      leftShoulder: leftArm.shoulder,
      leftElbow: leftArm.elbow,
      rightShoulder: rightArm.shoulder,
      rightElbow: rightArm.elbow,
      crownLeftBase: crownLeft.root,
      crownLeftElbow: crownLeft.elbow,
      crownRightBase: crownRight.root,
      crownRightElbow: crownRight.elbow,
    },
    liftLoad,
    baseY: 0,
  };
}

function createProjectManager(quality: RobotQuality, materials: RobotMaterials, sockets: Record<string, THREE.Object3D>): MemberRig {
  const role: RobotRole = 'project-manager';
  const root = namePart(new THREE.Group(), role, role, 'member-root');
  root.userData.familyScale = ROBOT_FAMILY_SCALE[role];
  const body = namePart(new THREE.Group(), `${role}-body-root`, role, 'body-root');
  body.position.y = 2.16;
  root.add(body);
  const managerShell = addMesh(body, `${role}-main-shell`, createManagerPearShellGeometry(quality), materials.white, role, [0, -0.04, -0.02], [0, 0, 0], [1.25, 1.15, 1.06]);
  managerShell.userData.v11ShellEnvelope = 'authoritative-oblate-layered-orby-shell';
  managerShell.userData.v12ReferenceLockedEnvelope = 'broad-low-oblate-shell-measured-against-front-eye-level-crop';
  managerShell.userData.v13ContinuousPearShell = 'deformed-continuous-cheek-to-chin-volume-with-rolled-ceramic-highlight-flow';
  managerShell.userData.v14ContinuousPearShell = 'narrower-taller-reference-locked-pear-envelope';
  const visorWidth = 1.94;
  const visorHeight = 1.04;
  const visor = addMesh(body, `${role}-curved-visor`, createManagerConformingVisorGeometry(
    visorWidth,
    visorHeight,
    0.04,
    0.32,
    0.11,
    quality,
  ), materials.visor, role, [0, 0.13, 0.97]);
  visor.renderOrder = 2;
  visor.userData.v11VisorRecess = 'deep-wide-rounded-rectangle-with-white-shell-overlap';
  visor.userData.v15ConformingVisor = 'curved-front-panel-recessed-into-spherical-shell-with-edge-depth-following-cheek-contour';
  visor.userData.v16IntegratedVisorSurface = 'radially-tessellated-superellipse-with-continuous-compound-curvature-and-closed-sidewall';
  const visorLip = addMesh(body, `${role}-visor-shell-lip`, bendManagerFrontPanel(
    createRoundedRectangleFrame(2, 1.1, 0.51, 1.94, 1.04, 0.48, 0.035, quality),
    2,
    1.1,
    0.32,
    0.11,
  ), materials.visorRim, role, [0, 0.13, 0.985]);
  visorLip.userData.v11RecessedVisorLip = 'separate-beveled-shell-overlap-around-rounded-rectangle-aperture';
  visorLip.userData.v12OversizedVisorBezel = 'continuous-thin-shell-overlap-around-reference-proportioned-face-aperture';
  visorLip.userData.v13MetallicVisorLip = 'polished-silver-optical-rim-with-real-bevel-depth';
  const visorEdgeGlow = addMesh(body, `${role}-visor-inner-edge-glow`, bendManagerFrontPanel(
    createRoundedRectangleFrame(1.965, 1.065, 0.5, 1.925, 1.025, 0.465, 0.018, quality),
    1.965,
    1.065,
    0.315,
    0.108,
  ), materials.cyanGlass, role, [0, 0.13, 1]);
  visorEdgeGlow.renderOrder = 3;
  visorEdgeGlow.userData.v13BlueVisorRim = 'narrow-electric-blue-falloff-inside-metallic-lip';
  const managerCrest = addMesh(
    body,
    `${role}-v16-forehead-crest`,
    createExtrudedPlate([
      [-0.12, -0.075],
      [0.12, -0.075],
      [0.145, 0.015],
      [0.075, 0.105],
      [-0.075, 0.105],
      [-0.145, 0.015],
    ], 0.045, quality),
    materials.gold,
    role,
    [0, 0.69, 0.895],
  );
  managerCrest.userData.v16ManagerCrest = 'small-warm-gold-project-manager-identity-shield-centered-on-the-dome-visor-bridge';
  managerCrest.userData.explodeWithParent = true;
  const managerCheekSeams = addMesh(body, `${role}-v15-conforming-cheek-seams`, mergeColoredParts(
    ([-1, 1] as const).map((side) => ({
      geometry: new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 0.78, -0.28, 0.77),
        new THREE.Vector3(side * 0.94, -0.45, 0.62),
        new THREE.Vector3(side * 0.86, -0.65, 0.5),
      ), quality === 'high' ? 18 : 10, 0.012, quality === 'high' ? 6 : 4, false),
      color: materials.whiteDeep.color,
    })),
  ), materials.whiteDeep, role);
  managerCheekSeams.userData.v15ConformingServiceSeams = 'paired-lower-cheek-service-breaks-follow-shell-curvature-without-floating-cards';
  managerCheekSeams.userData.explodeWithParent = true;
  const managerShellSurface = addMesh(
    body,
    `${role}-v16-shell-panel-flow`,
    createManagerShellSurfaceGeometry(quality, materials),
    quality === 'high' ? materials.jointComposite : materials.lodComposite,
    role,
  );
  managerShellSurface.userData.v16ShellPanelBands = 'paired-shoulder-and-lower-service-seams-flow-continuously-from-front-cheeks-around-the-rear-shell';
  managerShellSurface.userData.explodeWithParent = true;
  if (quality === 'high') {
    const managerMicroHardware = addMesh(body, `${role}-v16-shell-micro-hardware`, mergeColoredParts(
      ([-1, 1] as const).flatMap((side) => [
        { geometry: sphere('low', 10, 7), color: materials.gunmetal.color, position: [side * 0.87, 0.5, 0.64] as const, scale: [0.028, 0.022, 0.016] as const },
        { geometry: sphere('low', 10, 7), color: materials.gunmetal.color, position: [side * 0.83, -0.62, 0.58] as const, scale: [0.026, 0.021, 0.015] as const },
        { geometry: sphere('low', 10, 7), color: materials.gunmetal.color, position: [side * 0.73, 0.48, -0.74] as const, scale: [0.028, 0.022, 0.016] as const },
        { geometry: sphere('low', 10, 7), color: materials.gunmetal.color, position: [side * 0.7, -0.58, -0.68] as const, scale: [0.026, 0.021, 0.015] as const },
      ]),
    ), materials.jointComposite, role);
    managerMicroHardware.userData.v16ShellMicroHardware = 'restrained-paired-front-and-rear-service-fasteners-follow-the-closed-shell-surface';
    managerMicroHardware.userData.explodeWithParent = true;
  }
  const dome = createManagerDome(body, quality, materials);
  const eyeAssembly = createManagerEyePair(body, quality, materials);
  const mouth = createManagerCapsuleSmile(body, quality, materials.cyan);
  const face = createFaceRig(body, role, quality, materials.cyan, eyeAssembly, mouth);
  const finCoreMaterial = new THREE.MeshBasicMaterial({ color: 0x20cfff, transparent: true, opacity: 0.56, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  for (const side of [-1, 1] as const) {
    const finRoot = namePart(new THREE.Group(), `${role}-${side < 0 ? 'left' : 'right'}-fin-root`, role, 'communication-fin-pivot');
    finRoot.position.set(side * 1.02, 0.015, -0.16);
    body.add(finRoot);
    const finCollarGeometry = mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(0.29, 0.27, 0.24, quality === 'high' ? 28 : 14), color: materials.gunmetal.color, position: [side * 0.02, 0, 0], rotation: [0, 0, 90 * DEG] },
      { geometry: new THREE.TorusGeometry(0.205, 0.04, quality === 'high' ? 9 : 5, quality === 'high' ? 28 : 14), color: materials.whiteDeep.color, position: [side * 0.13, 0, 0], rotation: [0, 90 * DEG, 0] },
      { geometry: new THREE.TorusGeometry(0.145, 0.035, quality === 'high' ? 8 : 5, quality === 'high' ? 24 : 12), color: materials.gunmetal.color, position: [side * 0.145, 0, 0], rotation: [0, 90 * DEG, 0] },
    ]);
    const fin = addMesh(finRoot, `${role}-${side < 0 ? 'left' : 'right'}-communication-fin`, finCollarGeometry, quality === 'high' ? materials.jointComposite : materials.lodComposite, role);
    fin.userData.v11FinArchitecture = 'tapered-plate-circular-hinge-integrated-light';
    fin.userData.v12RearwardFinHinge = 'posterior-hinge-overlapped-by-broad-shell-cheek';
    fin.userData.v15EmbeddedFinCollar = 'deep-three-layer-collar-with-explicit-shell-overlap-and-zero-air-gap';
    const finCollarFace = addMesh(
      finRoot,
      `${role}-${side < 0 ? 'left' : 'right'}-v16-fin-collar-face`,
      capsule(quality, 0.12, 0.38),
      materials.gunmetal,
      role,
      [side * 0.025, 0.015, 0.72],
      [0, 0, side * -2 * DEG],
      [0.72, 1, 0.5],
    );
    finCollarFace.userData.v16FinCollarFace = 'dark-vertical-service-pad-visibly-anchors-the-fin-between-shell-and-face-aperture';
    finCollarFace.userData.explodeWithParent = true;
    const finShellGeometry = mergeColoredParts([
      { geometry: createManagerFinPlate(quality), color: 0xdceaf2 },
    ]);
    const finShell = addMesh(finRoot, `${role}-${side < 0 ? 'left' : 'right'}-translucent-fin-shell`, finShellGeometry, materials.finShell, role, [side * 0.025, 0.005, 0], [0, 0, side * -3 * DEG], [side * 0.68, 1, 1.12]);
    finShell.renderOrder = 2;
    finShell.userData.v13SweptFinShells = 'softly-beveled-curved-translucent-petal-shell';
    finShell.userData.v14SweptFinShells = 'reduced-span-translucent-petal-shell-matched-to-normalized-front';
    const finCavity = addMesh(finRoot, `${role}-${side < 0 ? 'left' : 'right'}-v15-fin-light-core`, sphere('low', 16, 10), finCoreMaterial, role, [side * 0.48, -0.02, 0], [0, 0, side * -3 * DEG], [0.19, 0.105, 0.09]);
    finCavity.renderOrder = 3;
    finCavity.userData.v14FinCavityFalloff = 'independent-cyan-emissive-cavity-inside-translucent-fin-shell';
    finCavity.userData.v15ContainedFinCavity = 'luminous-core-centered-inside-thick-fin-shell-volume';
    const finLight = new THREE.PointLight(0x56eaff, 0.42, 0.72, 2.2);
    finLight.position.set(side * 0.34, -0.035, 0);
    finLight.name = `${role}-${side < 0 ? 'left' : 'right'}-fin-cavity-light`;
    finLight.userData.v13FinCavityFalloff = 'localized-cyan-light-transmitted-through-curved-fin-shell';
    finRoot.add(finLight);
  }
  const pointerPivot = namePart(new THREE.Group(), `${role}-pointer-pivot`, role, 'tool-pivot');
  pointerPivot.position.set(0.98, -0.24, 0.34);
  pointerPivot.rotation.z = -18 * DEG;
  pointerPivot.visible = false;
  body.add(pointerPivot);
  addMesh(pointerPivot, `${role}-pointer`, mergeColoredParts([
    { geometry: new THREE.CylinderGeometry(0.042, 0.052, 1.18, quality === 'high' ? 14 : 8), color: materials.gunmetal.color, position: [0, 0.48, 0] },
    { geometry: new THREE.CylinderGeometry(0.062, 0.062, 0.12, quality === 'high' ? 12 : 7), color: materials.gold.color, position: [0, 0.94, 0] },
    { geometry: new THREE.ConeGeometry(0.085, 0.22, quality === 'high' ? 16 : 8), color: materials.cyan.color, position: [0, 1.12, 0] },
  ]), quality === 'high' ? materials.jointComposite : materials.lodComposite, role);
  if (quality === 'high') {
    const rearPanel = addMesh(body, `${role}-v16-rear-service-panel`, createManagerRearServiceGeometry(quality, materials), materials.jointComposite, role);
    rearPanel.userData.v11RearShell = 'rounded-service-cassette-with-energy-port-locking-ring-rails-and-status-nodes';
    rearPanel.userData.v16RearEnergyPort = 'three-stage-protected-energy-port-with-radial-fasteners-status-nodes-service-spine-and-closed-panel-boundary';
    rearPanel.userData.explodeWithParent = true;
  }
  const managerHover = createHoverCore(root, role, quality, materials, materials.cyan, 1.3, 1.02, true);
  managerHover.userData.v15RearUnderbodyContinuity = 'closed-underbody-volume-shared-by-front-profile-rear-and-underside';
  createSocket(body, sockets, `${role}:left-side`, [-1.12, 0.05, 0.05], [0, 0, 90 * DEG]);
  createSocket(body, sockets, `${role}:right-side`, [1.12, 0.05, 0.05], [0, 0, -90 * DEG]);
  createSocket(body, sockets, `${role}:rear-utility`, [0, 0.02, -0.97], [0, Math.PI, 0]);
  createSocket(root, sockets, `${role}:underbody`, [0, 0.92, 0]);
  if (quality === 'low') {
    consolidateLowStaticMeshes(body, role, [
      `${role}-main-shell`,
      `${role}-visor-shell-lip`,
      `${role}-v16-forehead-crest`,
      `${role}-v15-conforming-cheek-seams`,
      `${role}-v16-shell-panel-flow`,
      `${role}-left-communication-fin`,
      `${role}-right-communication-fin`,
      `${role}-left-v16-fin-collar-face`,
      `${role}-right-v16-fin-collar-face`,
      `${role}-dome-rim`,
    ], materials.lodComposite);
  }
  return { role, root, body, face, mouth, articulated: [pointerPivot], joints: { pointer: pointerPivot, brain: dome.brain.root }, brain: dome.brain, baseY: 0 };
}

function createMiniArtist(quality: RobotQuality, materials: RobotMaterials, sockets: Record<string, THREE.Object3D>): MemberRig {
  const role: RobotRole = 'mini-artist';
  const root = namePart(new THREE.Group(), role, role, 'member-root');
  root.scale.setScalar(ROBOT_FAMILY_SCALE[role]);
  root.userData.familyScale = ROBOT_FAMILY_SCALE[role];
  const body = namePart(new THREE.Group(), `${role}-body-root`, role, 'body-root');
  body.position.y = 2.15;
  root.add(body);
  const miniShell = addMesh(body, `${role}-cute-main-shell`, createMiniMakerShellGeometry(quality), materials.white, role, [0, -0.02, 0], [0, 0, 0], [1.17, 1.12, 1.02]);
  miniShell.userData.v11HalfScaleCuteShell = 'compact-round-maker-chassis-with-large-face-ratio';
  miniShell.userData.v18HalfScaleMakerShell = 'compact-half-scale-maker-chassis-with-cheek-volume-and-lower-reactor-taper';
  addMesh(body, `${role}-lower-shell`, sphere(quality), materials.whiteDeep, role, [0, -0.43, 0], [0, 0, 0], [1.07, 0.6, 0.94]);
  createRing(body, `${role}-panel-seam-system`, role, materials.gunmetal, [0, -0.48, 0], [0.92, 0.9, 0.84], [90 * DEG, 0, 0], quality);
  const visor = addMesh(body, `${role}-curved-visor`, createManagerConformingVisorGeometry(
    1.7,
    0.9,
    0.04,
    0.22,
    0.085,
    quality,
  ), materials.visor, role, [0, 0.06, 1.085]);
  visor.renderOrder = 2;
  visor.userData.v18MakerVisor = 'compact-rounded-rectangle-seated-in-a-white-shell-aperture';
  const miniVisorLip = addMesh(body, `${role}-v18-visor-shell-lip`, bendManagerFrontPanel(
    createRoundedRectangleFrame(1.8, 1.0, 0.45, 1.7, 0.9, 0.41, 0.032, quality),
    1.8,
    1.0,
    0.22,
    0.085,
  ), materials.visorRim, role, [0, 0.06, 1.1]);
  miniVisorLip.userData.v18EmbeddedVisorLip = 'thin-metallic-rim-overlapped-by-the-maker-shell';
  const eyeAssembly = createFaceMarkPair(body, role, quality, materials.mint, [
    { position: [-0.31, 0.14, 1.14], scale: [0.125, 0.205, 0.04] },
    { position: [0.31, 0.14, 1.14], scale: [0.125, 0.205, 0.04] },
  ]);
  const mouth = createSmile(body, role, materials.mint, [0, -0.17, 1.145], 0.58);
  const face = createFaceRig(body, role, quality, materials.mint, eyeAssembly, mouth);
  const sensorRoot = namePart(new THREE.Group(), `${role}-sensor-cap-root`, role, 'sensor-cap');
  sensorRoot.position.set(0, 0.91, -0.03);
  body.add(sensorRoot);
  const cap = addMesh(sensorRoot, `${role}-clear-mint-cap`, new THREE.SphereGeometry(1, quality === 'high' ? 36 : 18, quality === 'high' ? 18 : 9, 0, Math.PI * 2, 0, Math.PI * 0.58), materials.dome, role, [0, 0, 0], [0, 0, 0], [0.7, 0.4, 0.64]);
  cap.renderOrder = 3;
  cap.userData.v11SensorCap = 'shallow-clear-cap-five-node-array';
  addInstancedPart(
    sensorRoot,
    `${role}-sensor-node-trio`,
    sphere(quality, quality === 'high' ? 14 : 8, quality === 'high' ? 10 : 6),
    materials.mint,
    role,
    [
      composeMatrix([0, 0.18, 0.55], [0, 0, 0], [0.12, 0.12, 0.07]),
      composeMatrix([-0.3, 0.11, 0.48], [0, -12 * DEG, 0], [0.1, 0.1, 0.06]),
      composeMatrix([0.3, 0.11, 0.48], [0, 12 * DEG, 0], [0.1, 0.1, 0.06]),
      composeMatrix([-0.18, 0.25, 0.35], [0, 0, 0], [0.075, 0.075, 0.05]),
      composeMatrix([0.18, 0.25, 0.35], [0, 0, 0], [0.075, 0.075, 0.05]),
    ],
  );
  const miniFinGeometry = sphere('low', 16, 10);
  const miniFinPair = addInstancedPart(
    body,
    `${role}-communication-fin-pair`,
    miniFinGeometry,
    materials.white,
    role,
    [
      composeMatrix([-1.14, 0.12, 0.02], [0, 0, -6 * DEG], [0.33, 0.21, 0.2]),
      composeMatrix([1.14, 0.12, 0.02], [0, 0, 6 * DEG], [0.33, 0.21, 0.2]),
    ],
  );
  miniFinPair.userData.v11MiniFinPair = 'small-rounded-family-communication-fins';
  addInstancedPart(
    body,
    `${role}-communication-fin-light-pair`,
    sphere(quality, quality === 'high' ? 14 : 8, quality === 'high' ? 10 : 6),
    materials.mint,
    role,
    [
      composeMatrix([-1.2, 0.08, 0.2], [0, 0, 0], [0.065, 0.09, 0.035]),
      composeMatrix([1.2, 0.08, 0.2], [0, 0, 0], [0.065, 0.09, 0.035]),
    ],
  );
  const leftArm = createArm(body, `${role}-left`, role, quality, materials, -1, [-0.98, -0.1, 0.48], 0.64, materials.mint, 0.7);
  const rightArm = createArm(body, `${role}-right`, role, quality, materials, 1, [0.98, -0.1, 0.48], 0.64, materials.mint, 0.7);
  const tray = addMesh(rightArm.palm, `${role}-artist-tray`, new THREE.CylinderGeometry(0.34, 0.31, 0.075, quality === 'high' ? 24 : 12), materials.gunmetal, role, [0.12, -0.06, 0.2], [0, 0, 0]);
  tray.userData.v11LevelConstraint = 'artist-tray-remains-level-during-paint-and-inspect';
  if (quality === 'high') {
    addMesh(tray, `${role}-paint-well-cyan`, new THREE.CylinderGeometry(0.075, 0.075, 0.025, 14), materials.cyan, role, [-0.1, 0.06, 0.1]);
    addMesh(tray, `${role}-paint-well-gold`, new THREE.CylinderGeometry(0.075, 0.075, 0.025, 14), materials.gold, role, [0.1, 0.06, -0.08]);
    addMesh(tray, `${role}-paint-well-mint`, new THREE.CylinderGeometry(0.065, 0.065, 0.025, 14), materials.mint, role, [0.12, 0.06, 0.12]);
  }
  const brush = addMesh(leftArm.palm, `${role}-brush-stylus`, mergeColoredParts([
    { geometry: new THREE.CylinderGeometry(0.032, 0.043, 0.68, 14), color: materials.gunmetal.color },
    { geometry: new THREE.CylinderGeometry(0.06, 0.05, 0.14, 14), color: materials.gold.color, position: [0, 0.39, 0] },
    { geometry: new THREE.CylinderGeometry(0.065, 0.065, 0.045, 14), color: materials.whiteDeep.color, position: [0, 0.31, 0] },
    { geometry: new THREE.ConeGeometry(0.075, 0.23, 14), color: materials.mint.color, position: [0, 0.56, 0] },
  ]), materials.jointComposite, role, [-0.08, 0.24, 0.12], [0, 0, -8 * DEG]);
  brush.userData.v11UprightBrush = 'gunmetal-handle-gold-ferrule-white-collar-mint-bristles';
  if (quality === 'high') {
    const cassette = addMesh(body, `${role}-rear-tool-cassette`, mergeColoredParts([
      { geometry: new THREE.BoxGeometry(0.8, 0.52, 0.12), color: materials.gunmetal.color, position: [0, -0.04, -0.97] },
      { geometry: createRoundedRectangleFrame(0.82, 0.54, 0.12, 0.66, 0.38, 0.08, 0.045, quality), color: materials.gold.color, position: [0, -0.04, -1.09] },
      { geometry: new THREE.BoxGeometry(0.61, 0.34, 0.08), color: materials.whiteDeep.color, position: [0, -0.04, -1.045] },
      ...[-0.2, 0.2].flatMap((x) => [-0.1, 0.1].map((y) => ({
        geometry: new THREE.CylinderGeometry(0.055, 0.055, 0.055, 10), color: materials.gunmetal.color,
        position: [x, y - 0.04, -1.105] as const, rotation: [90 * DEG, 0, 0] as const,
      }))),
      { geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.31, 10), color: materials.gold.color, position: [-0.33, -0.04, -1.105] },
      { geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.31, 10), color: materials.gold.color, position: [0.33, -0.04, -1.105] },
      { geometry: new THREE.BoxGeometry(0.36, 0.035, 0.03), color: materials.mint.color, position: [0, -0.23, -1.12] },
    ]), materials.jointComposite, role);
    cassette.userData.v11RearCassette = 'framed-four-socket-cassette-with-gold-canisters';
  }
  createHoverCore(root, role, quality, materials, materials.mint, 0.9, 0.62);
  createSocket(body, sockets, `${role}:front-utility`, [0, -0.46, 1.02]);
  createSocket(body, sockets, `${role}:rear-utility`, [0, 0, -1.02], [0, Math.PI, 0]);
  createSocket(leftArm.wrist, sockets, `${role}:left-hand`, [-0.02, 0, 0]);
  createSocket(rightArm.wrist, sockets, `${role}:right-hand`, [0.02, 0, 0]);
  if (quality === 'low') {
    consolidateLowStaticMeshes(body, role, [
      `${role}-cute-main-shell`,
      `${role}-lower-shell`,
      `${role}-panel-seam-system`,
      `${role}-v18-visor-shell-lip`,
      `${role}-communication-fin-pair`,
    ], materials.lodComposite);
  }
  return {
    role,
    root,
    body,
    face,
    mouth,
    articulated: [leftArm.shoulder, leftArm.elbow, rightArm.shoulder, rightArm.elbow, brush],
    joints: {
      leftShoulder: leftArm.shoulder,
      leftElbow: leftArm.elbow,
      rightShoulder: rightArm.shoulder,
      rightElbow: rightArm.elbow,
      brush,
      tray,
    },
    baseY: 0,
  };
}

function createAddonLibrary(quality: RobotQuality, materials: RobotMaterials): Record<RobotAddonId, THREE.Group> {
  const addons = {} as Record<RobotAddonId, THREE.Group>;
  const create = (id: RobotAddonId) => {
    const root = namePart(new THREE.Group(), `addon-${id}`, 'shared', 'addon');
    root.userData.addonId = id;
    root.visible = true;
    addons[id] = root;
    return root;
  };
  const autonomous = create('autonomous-arm');
  createAutonomousArm(autonomous, 'addon-autonomous-arm', 'project-manager', quality, materials, 1, [0, 0, 0]);
  const holder = create('holder');
  addMesh(holder, 'addon-holder-ring', new THREE.TorusGeometry(0.3, 0.08, 10, 28), materials.gunmetal, 'shared');
  for (const side of [-1, 1]) addMesh(holder, `addon-holder-jaw-${side}`, new THREE.BoxGeometry(0.12, 0.32, 0.12), materials.gold, 'shared', [side * 0.28, 0, 0]);
  const lifter = create('lifter');
  addMesh(lifter, 'addon-lifter-back', new THREE.BoxGeometry(0.5, 0.58, 0.16), materials.gunmetal, 'shared', [0, 0.16, 0]);
  for (const side of [-1, 1]) addMesh(lifter, `addon-lifter-fork-${side}`, new THREE.BoxGeometry(0.12, 0.12, 0.72), materials.gold, 'shared', [side * 0.18, -0.12, 0.3]);
  const projector = create('projector');
  addMesh(projector, 'addon-projector-body', new THREE.CylinderGeometry(0.18, 0.2, 0.32, 20), materials.gunmetal, 'shared');
  addMesh(projector, 'addon-projector-screen', new THREE.PlaneGeometry(0.78, 0.48), materials.cyanGlass, 'shared', [0, 0.5, 0.04]);
  const tray = create('artist-tray');
  addMesh(tray, 'addon-artist-tray-bowl', new THREE.CylinderGeometry(0.38, 0.32, 0.1, 24), materials.gunmetal, 'shared');
  const brush = create('brush');
  addMesh(brush, 'addon-brush-handle', new THREE.CylinderGeometry(0.04, 0.05, 0.72, 14), materials.gunmetal, 'shared');
  addMesh(brush, 'addon-brush-tip', new THREE.ConeGeometry(0.09, 0.25, 14), materials.mint, 'shared', [0, 0.48, 0]);
  return addons;
}

function collectMetrics(root: THREE.Object3D, sockets: Record<string, THREE.Object3D>): RobotFamilyMetrics {
  let meshes = 0;
  let triangles = 0;
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (let ancestor: THREE.Object3D | null = object; ancestor; ancestor = ancestor.parent) {
      if (!ancestor.visible) return;
    }
    meshes += 1;
    const geometry = object.geometry;
    const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
    triangles += (geometry.index ? geometry.index.count / 3 : (geometry.getAttribute('position')?.count ?? 0) / 3) * instances;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => materials.add(material));
  });
  return { meshes, triangles: Math.round(triangles), materials: materials.size, sockets: Object.keys(sockets).length, drawCalls: meshes };
}

function countTriangles(root: THREE.Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
    triangles += (object.geometry.index
      ? object.geometry.index.count / 3
      : (object.geometry.getAttribute('position')?.count ?? 0) / 3) * instances;
  });
  return Math.round(triangles);
}

export function createRobotFamilyModel(options: { quality?: RobotQuality; showAddonRack?: boolean } = {}): RobotFamilyModel {
  const quality = options.quality ?? 'high';
  const materials = createMaterials();
  const root = namePart(new THREE.Group(), 'habitgame-robot-family', 'shared', 'family-root');
  const sockets: Record<string, THREE.Object3D> = {};
  const heavy = createHeavyWorker(quality, materials, sockets);
  const manager = createProjectManager(quality, materials, sockets);
  const mini = createMiniArtist(quality, materials, sockets);
  heavy.root.position.x = -3.15;
  manager.root.position.x = 0;
  mini.root.position.x = 3.05;
  root.add(heavy.root, manager.root, mini.root);
  const rigs: Record<RobotRole, MemberRig> = { 'heavy-worker': heavy, 'project-manager': manager, 'mini-artist': mini };

  const addons = createAddonLibrary(quality, materials);
  const rack = namePart(new THREE.Group(), 'robot-addon-rack', 'shared', 'addon-rack');
  rack.position.set(0, -0.04, -1.5);
  Object.values(addons).forEach((addon, index) => {
    addon.position.set((index - 2.5) * 0.72, 0.28, 0);
    addon.scale.setScalar(0.55);
    rack.add(addon);
  });
  rack.visible = options.showAddonRack ?? false;
  root.add(rack);

  const explodedParts: Array<{ object: THREE.Object3D; home: THREE.Vector3 }> = [];
  root.traverse((object) => {
    if (!object.userData.robotPart?.explodable || object === root) return;
    const home = object.position.clone();
    explodedParts.push({ object, home });
  });

  let motion: RobotMotion = 'idle';
  const memberMotions: Record<RobotRole, RobotMotion> = {
    'heavy-worker': motion,
    'project-manager': motion,
    'mini-artist': motion,
  };
  let emotion: RobotEmotion = 'friendly';
  const memberEmotions: Record<RobotRole, RobotEmotion | null> = {
    'heavy-worker': null,
    'project-manager': null,
    'mini-artist': null,
  };
  let brainState: RobotBrainState = 'calm';
  let clayEnabled = false;
  let externalRootMotion = false;
  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) originalMaterials.set(object, object.material);
  });

  const model: RobotFamilyModel = {
    root,
    members: { 'heavy-worker': heavy.root, 'project-manager': manager.root, 'mini-artist': mini.root },
    sockets,
    addons,
    metrics: collectMetrics(root, sockets),
    partManifest: { model: 'habitgame-robot-family', parts: [], unnamedMeshes: 0, integralMeshes: 0 },
    motion,
    memberMotions,
    emotion,
    memberEmotions,
    brainState,
    setMotion(nextMotion) {
      motion = nextMotion;
      model.motion = nextMotion;
      Object.keys(memberMotions).forEach((role) => { memberMotions[role as RobotRole] = nextMotion; });
      const matchingBrainState: Record<RobotMotion, RobotBrainState> = {
        idle: 'calm',
        listen: 'curious',
        work: 'focused',
        lift: 'focused',
        carry: 'focused',
        direct: 'curious',
        inspect: 'focused',
        paint: 'focused',
        celebrate: 'energized',
      };
      model.setBrainState(matchingBrainState[nextMotion]);
    },
    setMemberMotion(role, nextMotion) {
      memberMotions[role] = nextMotion;
      if (role === 'project-manager') {
        const state: Record<RobotMotion, RobotBrainState> = {
          idle: 'calm', listen: 'curious', work: 'focused', lift: 'focused', carry: 'focused',
          direct: 'curious', inspect: 'focused', paint: 'focused', celebrate: 'energized',
        };
        model.setBrainState(state[nextMotion]);
      }
    },
    setEmotion(nextEmotion) {
      emotion = nextEmotion;
      model.emotion = nextEmotion;
    },
    setMemberEmotion(role, nextEmotion) {
      memberEmotions[role] = nextEmotion;
    },
    setExternalRootMotion(enabled) {
      externalRootMotion = enabled;
      root.userData.externalRootMotion = enabled;
    },
    setFaceFocus(role, x, y) {
      rigs[role].face.focus = new THREE.Vector2(
        THREE.MathUtils.clamp(x, -1, 1),
        THREE.MathUtils.clamp(y, -1, 1),
      );
    },
    clearFaceFocus(role) {
      if (role) {
        rigs[role].face.focus = null;
        return;
      }
      Object.values(rigs).forEach((rig) => { rig.face.focus = null; });
    },
    setBrainState(nextState) {
      brainState = nextState;
      model.brainState = nextState;
      const palette: Record<RobotBrainState, { color: number; emissive: number; opacity: number }> = {
        calm: { color: 0x008cff, emissive: 0x0047a8, opacity: 0.84 },
        curious: { color: 0xffc95c, emissive: 0xcc7610, opacity: 0.88 },
        focused: { color: 0x69f5ae, emissive: 0x149e69, opacity: 0.92 },
        energized: { color: 0xd87cff, emissive: 0x8a2dc7, opacity: 0.96 },
      };
      const brain = manager.brain;
      if (!brain) return;
      Object.entries(brain.visuals).forEach(([state, visual]) => { visual.visible = state === nextState; });
      brain.material.color.setHex(palette[nextState].color);
      brain.material.emissive.setHex(palette[nextState].emissive);
      brain.material.opacity = palette[nextState].opacity;
    },
    setExploded(amount) {
      const clamped = THREE.MathUtils.clamp(amount, 0, 1);
      explodedParts.forEach(({ object, home }) => {
        object.position.copy(home).multiplyScalar(1 + clamped * 0.9);
      });
    },
    setWireframe(enabled) {
      const seen = new Set<THREE.Material>();
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material) => {
          if (seen.has(material)) return;
          seen.add(material);
          if ('wireframe' in material) (material as THREE.MeshStandardMaterial).wireframe = enabled;
        });
      });
    },
    setClay(enabled) {
      clayEnabled = enabled;
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = clayEnabled ? materials.clay : (originalMaterials.get(object) ?? object.material);
      });
    },
    setAddonVisible(addon, visible) { addons[addon].visible = visible; },
    update(elapsedSeconds, deltaSeconds, reducedMotion = false) {
      if (!externalRootMotion) {
        const hoverAmplitude = reducedMotion ? 0 : 0.042;
        Object.values(rigs).forEach((rig, index) => {
          rig.root.position.y = rig.baseY + Math.sin(elapsedSeconds * 0.95 + index * 1.8) * hoverAmplitude;
        });
      }
      const response = 1 - Math.exp(-Math.max(deltaSeconds, 1 / 120) * (reducedMotion ? 5 : 9));
      Object.values(rigs).forEach((rig, index) => {
        updateFaceRig(
          rig.face,
          memberMotions[rig.role],
          memberEmotions[rig.role] ?? emotion,
          elapsedSeconds,
          response,
          reducedMotion,
          index,
        );
      });
      const aim = (joint: THREE.Object3D, zDegrees: number, oscillation = 0) => {
        const target = (zDegrees * DEG) + (reducedMotion ? 0 : oscillation);
        joint.rotation.z = THREE.MathUtils.lerp(joint.rotation.z, target, response);
      };

      const heavyPose: Record<RobotMotion, readonly [number, number, number, number, number, number, number, number]> = {
        idle: [12, 0, -12, 0, -10, 10, 10, -10],
        listen: [8, -15, -8, 15, -6, 14, 6, -14],
        work: [35, -55, -35, 55, 42, -42, -42, 42],
        // Raise the load arms outside the torso silhouette, then bend the
        // forearms upward. The previous +/-220 shoulder targets folded the
        // complete chain across the body and made it disappear in the fixed
        // front review camera.
        lift: [-150, -40, 150, 40, 58, -35, -58, 35],
        carry: [28, -45, -28, 45, 30, -18, -30, 18],
        direct: [-35, -55, 35, 55, 34, -22, -34, 22],
        inspect: [20, -45, -20, 45, 46, -26, -46, 26],
        paint: [35, -55, -35, 55, 28, -16, -28, 16],
        celebrate: [-115, -30, 115, 30, 68, -48, -68, 48],
      };
      const heavyMotion = memberMotions['heavy-worker'];
      const hp = heavyPose[heavyMotion];
      if (heavy.liftLoad) heavy.liftLoad.visible = heavyMotion === 'lift';
      const heavyPulse = ['work', 'lift', 'carry'].includes(heavyMotion) ? Math.sin(elapsedSeconds * 2.1) * 4 * DEG : 0;
      aim(heavy.joints.leftShoulder, hp[0], heavyPulse);
      aim(heavy.joints.leftElbow, hp[1], -heavyPulse * 0.7);
      aim(heavy.joints.rightShoulder, hp[2], -heavyPulse);
      aim(heavy.joints.rightElbow, hp[3], heavyPulse * 0.7);
      aim(heavy.joints.crownLeftBase, hp[4], heavyMotion === 'work' ? Math.sin(elapsedSeconds * 3.1) * 5 * DEG : 0);
      aim(heavy.joints.crownLeftElbow, hp[5]);
      aim(heavy.joints.crownRightBase, hp[6], heavyMotion === 'work' ? -Math.sin(elapsedSeconds * 3.1) * 5 * DEG : 0);
      aim(heavy.joints.crownRightElbow, hp[7]);

      const managerPointerTargets: Record<RobotMotion, number> = {
        idle: -12, listen: -6, work: -28, lift: -34, carry: -22,
        direct: -48, inspect: -18, paint: -36, celebrate: 18,
      };
      const managerMotion = memberMotions['project-manager'];
      manager.joints.pointer.visible = !['idle', 'listen'].includes(managerMotion);
      const directingSweep = ['direct', 'inspect'].includes(managerMotion) ? Math.sin(elapsedSeconds * 1.8) * 9 * DEG : 0;
      aim(manager.joints.pointer, managerPointerTargets[managerMotion], directingSweep);
      manager.body.rotation.z = THREE.MathUtils.lerp(manager.body.rotation.z, managerMotion === 'listen' ? -0.06 : 0, response);

      const miniPose: Record<RobotMotion, readonly [number, number, number, number, number]> = {
        idle: [62, 55, -62, -55, -6],
        listen: [55, 70, -55, -70, -4],
        work: [60, 85, -60, -85, -10],
        lift: [40, 65, -40, -65, -6],
        carry: [62, 92, -62, -92, -6],
        direct: [55, 35, -55, -35, -8],
        inspect: [58, 82, -58, -82, -6],
        paint: [64, 88, -64, -88, -8],
        celebrate: [-35, 30, 35, -30, 12],
      };
      const miniMotion = memberMotions['mini-artist'];
      const mp = miniPose[miniMotion];
      const brushStroke = miniMotion === 'paint' && !reducedMotion ? Math.sin(elapsedSeconds * 5.2) * 13 * DEG : 0;
      aim(mini.joints.leftShoulder, mp[0]);
      aim(mini.joints.leftElbow, mp[1], brushStroke * 0.3);
      aim(mini.joints.rightShoulder, mp[2]);
      aim(mini.joints.rightElbow, mp[3]);
      mini.body.updateWorldMatrix(true, true);
      const stabilizeTool = (tool: THREE.Object3D, worldTiltZ: number) => {
        const parentWorld = new THREE.Quaternion();
        tool.parent?.getWorldQuaternion(parentWorld);
        const desiredWorld = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, worldTiltZ));
        tool.quaternion.copy(parentWorld.invert().multiply(desiredWorld));
      };
      stabilizeTool(mini.joints.tray, 0);
      stabilizeTool(mini.joints.brush, (mp[4] * DEG) + brushStroke);

      const brain = manager.brain;
      if (brain) {
        const speed = brainState === 'energized' ? 1.9 : brainState === 'focused' ? 0.62 : 1.05;
        brain.root.rotation.y = reducedMotion ? 0 : Math.sin(elapsedSeconds * speed * 0.72) * 0.18;
        const activeBrainVisual = brain.visuals[brainState];
        if (activeBrainVisual) activeBrainVisual.rotation.z = reducedMotion ? 0 : Math.sin(elapsedSeconds * speed) * (brainState === 'energized' ? 0.34 : 0.14);
        const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsedSeconds * speed * 3.2) * (brainState === 'energized' ? 0.24 : 0.1);
        brain.core.scale.setScalar(0.09 * pulse);
      }

      const animateCelebration = !reducedMotion;
      heavy.body.rotation.y = THREE.MathUtils.lerp(heavy.body.rotation.y, heavyMotion === 'celebrate' && animateCelebration ? Math.sin(elapsedSeconds * 2.2) * 0.08 : 0, response);
      manager.body.rotation.y = THREE.MathUtils.lerp(manager.body.rotation.y, managerMotion === 'celebrate' && animateCelebration ? Math.sin(elapsedSeconds * 2.5 + 1) * 0.09 : 0, response);
      mini.body.rotation.y = THREE.MathUtils.lerp(mini.body.rotation.y, miniMotion === 'celebrate' && animateCelebration ? Math.sin(elapsedSeconds * 3 + 2) * 0.14 : 0, response);
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const disposableMaterials = new Set<THREE.Material>();
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material) => disposableMaterials.add(material));
      });
      Object.values(materials).forEach((material) => disposableMaterials.add(material));
      geometries.forEach((geometry) => geometry.dispose());
      disposableMaterials.forEach((material) => material.dispose());
    },
  };

  const componentNodes: Record<string, THREE.Object3D> = {
    'family-root': root,
    'heavy-root': heavy.root,
    'heavy-body': heavy.body,
    'heavy-shell-panels': root.getObjectByName('heavy-worker-lower-shell')!,
    'heavy-visor': root.getObjectByName('heavy-worker-curved-visor')!,
    'heavy-face-rig': heavy.face.root,
    'heavy-crown-band': root.getObjectByName('heavy-worker-gold-crown-band')!,
    'heavy-shoulder-pair': root.getObjectByName('heavy-worker-left-shoulder')!,
    'heavy-primary-limbs': root.getObjectByName('heavy-worker-right-shoulder')!,
    'heavy-crown-manipulators': root.getObjectByName('heavy-worker-crown-left-base')!,
    'heavy-projector': addons.projector,
    'heavy-rear-service-spine': root.getObjectByName('heavy-worker-v3-rear-service-spine') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'heavy-rear-reactor': root.getObjectByName('heavy-worker-v3-rear-reactor') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'heavy-rear-canister-rack': root.getObjectByName('heavy-worker-v3-rear-canister-rack') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'heavy-waist-service-band': root.getObjectByName('heavy-worker-v3-front-waist-system') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'heavy-shoulder-chest-bridge': root.getObjectByName('heavy-worker-v3-front-waist-system') ?? heavy.body,
    'heavy-crown-tool-claws': root.getObjectByName('heavy-worker-crown-left-three-digit-claw') ?? heavy.joints.crownLeftElbow,
    'heavy-face-expression-rig': heavy.face.root,
    'heavy-front-armor-shell-system': root.getObjectByName('heavy-worker-v3-front-waist-system') ?? heavy.body,
    'heavy-shoulder-root-integration': root.getObjectByName('heavy-worker-left-shoulder')!,
    'heavy-modular-service-belt': root.getObjectByName('heavy-worker-v3-front-waist-system') ?? heavy.body,
    'heavy-crown-linkage-mechanisms': root.getObjectByName('heavy-worker-crown-left-base')!,
    'heavy-macro-proportion-envelope': heavy.body,
    'heavy-raised-canopy-system': root.getObjectByName('heavy-worker-v8-transparent-amber-canopy') ?? heavy.body,
    'heavy-forearm-hand-scale-correction': root.getObjectByName('heavy-worker-left-hand-root')!,
    'heavy-torso-panel-segmentation': root.getObjectByName('heavy-worker-v3-front-waist-system') ?? heavy.body,
    'heavy-v8-chest-shell-continuity': root.getObjectByName('heavy-worker-v3-front-waist-system') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'heavy-v8-articulated-hand-system': root.getObjectByName('heavy-worker-left-hand-root')!,
    'heavy-v8-segmented-canopy-system': root.getObjectByName('heavy-worker-v8-transparent-amber-canopy') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'heavy-v9-load-forearm-hand-system': root.getObjectByName('heavy-worker-left-hand-root')!,
    'heavy-v9-torso-mass-envelope': root.getObjectByName('heavy-worker-main-shell')!,
    'heavy-v9-amber-canopy-material-system': root.getObjectByName('heavy-worker-v8-transparent-amber-canopy') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'heavy-v9-object-driven-lift-system': root.getObjectByName('heavy-worker-v9-lift-load-yoke')!,
    'heavy-v10-deep-amber-optics': root.getObjectByName('heavy-worker-v8-transparent-amber-canopy') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'heavy-v10-shoulder-cartridge-upper-arm-system': root.getObjectByName('heavy-worker-v3-front-waist-system') ?? root.getObjectByName('heavy-worker-left-shoulder')!,
    'heavy-v10-fixed-review-hand-framing': heavy.body,
    'heavy-v10-service-belt-detail-system': root.getObjectByName('heavy-worker-v3-front-waist-system') ?? root.getObjectByName('heavy-worker-v3-integrated-service-hardware')!,
    'manager-root': manager.root,
    'manager-body': manager.body,
    'manager-visor': root.getObjectByName('project-manager-curved-visor')!,
    'manager-face-rig': manager.face.root,
    'manager-dome': root.getObjectByName('project-manager-clear-dome')!,
    'manager-fin-pair': root.getObjectByName('project-manager-left-communication-fin')!,
    'manager-pointer': root.getObjectByName('project-manager-pointer')!,
    'manager-badge': root.getObjectByName('project-manager-forehead-badge') ?? root.getObjectByName('project-manager-dome-root')!,
    'manager-v11-oblate-shell-continuity': root.getObjectByName('project-manager-main-shell')!,
    'manager-v11-four-state-volumetric-brain': root.getObjectByName('project-manager-brain-visualizer')!,
    'manager-v11-fin-rear-underbody-system': root.getObjectByName('project-manager-left-communication-fin')!,
    'manager-v11-authoritative-animated-face': manager.face.root,
    'manager-v12-reference-locked-shell-envelope': root.getObjectByName('project-manager-main-shell')!,
    'manager-v12-oversized-visor-face-system': manager.face.root,
    'manager-v12-dome-cradle-layered-brain': root.getObjectByName('project-manager-brain-visualizer')!,
    'manager-v12-rearward-fin-hover-system': root.getObjectByName('project-manager-left-communication-fin')!,
    'manager-v13-continuous-pear-shell-surface': root.getObjectByName('project-manager-main-shell')!,
    'manager-v13-inset-visor-optical-rim': root.getObjectByName('project-manager-visor-shell-lip')!,
    'manager-v13-dome-optical-stack': root.getObjectByName('project-manager-clear-dome')!,
    'manager-v13-layered-brain-energy-volume': root.getObjectByName('project-manager-brain-volumetric-energy-stack')!,
    'manager-v13-swept-translucent-fin-system': root.getObjectByName('project-manager-left-translucent-fin-shell')!,
    'manager-v13-layered-hover-light-volume': root.getObjectByName('project-manager-hover-light')!,
    'manager-v14-continuous-pear-shell-surface': root.getObjectByName('project-manager-main-shell')!,
    'manager-v14-inset-visor-optical-rim': root.getObjectByName('project-manager-visor-shell-lip')!,
    'manager-v14-dome-optical-stack': root.getObjectByName('project-manager-clear-dome')!,
    'manager-v14-layered-brain-energy-volume': root.getObjectByName('project-manager-brain-volumetric-energy-stack')!,
    'manager-v14-swept-translucent-fin-system': root.getObjectByName('project-manager-left-translucent-fin-shell')!,
    'manager-v14-layered-hover-light-volume': root.getObjectByName('project-manager-hover-light')!,
    'manager-v15-continuous-underbody-crescent': root.getObjectByName('project-manager-hover-housing')!,
    'manager-v15-volumetric-brain-core': root.getObjectByName('project-manager-v15-brain-kernel')!,
    'manager-v15-embedded-fin-root-stack': root.getObjectByName('project-manager-left-communication-fin')!,
    'manager-v15-rear-underbody-continuity': root.getObjectByName('project-manager-hover-core')!,
    'manager-v16-shell-panel-bands': root.getObjectByName('project-manager-v16-shell-panel-flow')!,
    'manager-v16-shoulder-insets': root.getObjectByName('project-manager-v16-shell-panel-flow')!,
    'manager-v16-rear-energy-port': root.getObjectByName('project-manager-v16-rear-service-panel') ?? manager.body,
    'manager-v16-hover-baffles': root.getObjectByName('project-manager-v16-hover-baffle-and-vent-system')!,
    'mini-root': mini.root,
    'mini-body': mini.body,
    'mini-visor': root.getObjectByName('mini-artist-curved-visor')!,
    'mini-face-rig': mini.face.root,
    'mini-sensor-cap': root.getObjectByName('mini-artist-clear-mint-cap')!,
    'mini-arm-pair': root.getObjectByName('mini-artist-left-shoulder')!,
    'mini-artist-tray': root.getObjectByName('mini-artist-artist-tray')!,
    'mini-brush': root.getObjectByName('mini-artist-brush-stylus')!,
    'mini-v11-half-scale-cute-shell-system': root.getObjectByName('mini-artist-cute-main-shell')!,
    'mini-v11-mint-sensor-cap-node-system': root.getObjectByName('mini-artist-clear-mint-cap')!,
    'mini-v11-articulated-maker-arm-tool-system': root.getObjectByName('mini-artist-left-shoulder')!,
    'mini-v11-rear-cassette-underbody-reactor': root.getObjectByName('mini-artist-rear-tool-cassette') ?? root.getObjectByName('mini-artist-hover-core')!,
    'hover-system': root.getObjectByName('project-manager-hover-core')!,
    'addon-library': rack,
    'addon-autonomous-arm': addons['autonomous-arm'],
    'addon-holder': addons.holder,
    'addon-lifter': addons.lifter,
    'addon-canister-rack': root.getObjectByName('mini-artist-paint-well-gold') ?? root.getObjectByName('mini-artist-artist-tray')!,
    'joint-ring-system': root.getObjectByName('heavy-worker-left-shoulder-joint-assembly') ?? root.getObjectByName('heavy-worker-left-shoulder')!,
    'panel-seam-system': root.getObjectByName('project-manager-visor-shell-lip')!,
    'edge-light-system': root.getObjectByName('project-manager-dome-rim')!,
  };
  root.userData.sculptRuntime = {
    nodes: componentNodes,
    sockets,
    colliders: Object.fromEntries(Object.entries(model.members).map(([id, member]) => [id, { type: 'sphere', object: member }])),
    destructionGroups: Object.fromEntries(Object.entries(model.members).map(([id, member]) => [id, [member]])),
    addons,
    setExploded: model.setExploded,
    faceRigs: Object.fromEntries(Object.entries(rigs).map(([role, rig]) => [role, rig.face])),
    setFaceFocus: model.setFaceFocus,
    clearFaceFocus: model.clearFaceFocus,
    scaleContract: ROBOT_FAMILY_SCALE,
  };
  model.partManifest = {
    model: 'habitgame-robot-family',
    parts: Object.entries(componentNodes).map(([name, node]) => ({
      name,
      kind: String(node.userData.robotPart?.kind ?? 'component'),
      module: String(node.userData.robotPart?.role ?? 'shared'),
      triangles: countTriangles(node),
    })),
    unnamedMeshes: (() => {
      let count = 0;
      root.traverse((object) => {
        if (object instanceof THREE.Mesh && !object.name) count += 1;
      });
      return count;
    })(),
    integralMeshes: model.metrics.meshes,
  };
  root.userData.referenceLimitations = {
    managerRear: 0.85,
    managerUnderside: 0.8,
    heavyRear: 0.84,
    miniRear: 0.62,
    note: 'Manager geometry follows original Orby turnaround sources. Heavy rear structure follows the approved multi-view concept, while hidden service attachment interiors remain stylized inference; mini hidden surfaces remain generated reconstruction studies pending art-direction approval.',
  };
  return model;
}
