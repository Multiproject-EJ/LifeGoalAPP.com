import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';

export const ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_NAME =
  'Island 019 Circuit G — Gold Carnival Guardian Fountain Statue';
export const ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_PACKET =
  'docs/visual-references/island-019-coaster-carnival/secondary-inferred/circuit-g-multiview/fountain-statue-multiview-v1.png';
export const ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_PACKET_SHA256 =
  '9b29f9fb85c0a7299e24a659fdfe6f443d0ae2ebb69a1060e7e45f085d1a9616';

export interface Island19CircuitGFountainStatueOptions {
  quality?: Island3DQuality;
  castShadow?: boolean;
  receiveShadow?: boolean;
  reducedMotion?: boolean;
  clay?: boolean;
}

export interface Island19CircuitGFountainStatueRuntime {
  root: THREE.Group;
  visualPivot: THREE.Group;
  mountConsumer: THREE.Object3D;
  medallionStar: THREE.Mesh;
  partRoots: Readonly<Record<string, THREE.Object3D>>;
  dataset: Record<string, string>;
  animate: (elapsedSeconds: number) => void;
  setClay: (enabled: boolean) => void;
}

interface StatueMaterials {
  antiqueGold: THREE.MeshPhysicalMaterial;
  polishedGold: THREE.MeshPhysicalMaterial;
  shadowGold: THREE.MeshPhysicalMaterial;
  clay: THREE.MeshStandardMaterial;
}

interface LoftRing {
  y: number;
  radiusX: number;
  radiusZ: number;
  offsetX?: number;
  offsetZ?: number;
}

function createMaterials(): StatueMaterials {
  return {
    antiqueGold: new THREE.MeshPhysicalMaterial({
      color: 0xc98b25,
      roughness: 0.34,
      metalness: 0.72,
      clearcoat: 0.22,
      clearcoatRoughness: 0.22,
      emissive: 0x4b2504,
      emissiveIntensity: 0.055,
      envMapIntensity: 1.05,
    }),
    polishedGold: new THREE.MeshPhysicalMaterial({
      color: 0xf4bc45,
      roughness: 0.22,
      metalness: 0.78,
      clearcoat: 0.34,
      clearcoatRoughness: 0.12,
      emissive: 0x6b3305,
      emissiveIntensity: 0.085,
      envMapIntensity: 1.18,
    }),
    shadowGold: new THREE.MeshPhysicalMaterial({
      color: 0x74400f,
      roughness: 0.5,
      metalness: 0.62,
      clearcoat: 0.08,
      emissive: 0x261001,
      emissiveIntensity: 0.025,
      envMapIntensity: 0.78,
    }),
    clay: new THREE.MeshStandardMaterial({ color: 0xd6d0c7, roughness: 0.82, metalness: 0 }),
  };
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  castShadow: boolean,
  receiveShadow: boolean,
) {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = castShadow;
  result.receiveShadow = receiveShadow;
  return result;
}

function namedPart(name: string, partId: string) {
  const part = new THREE.Group();
  part.name = name;
  part.userData = { partId, explodable: true, clickable: true, rigidOrnamentalPart: true };
  return part;
}

function createLoftGeometry(rings: readonly LoftRing[], radialSegments: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  rings.forEach((ring, ringIndex) => {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = segment / radialSegments * Math.PI * 2;
      positions.push(
        (ring.offsetX ?? 0) + Math.cos(angle) * ring.radiusX,
        ring.y,
        (ring.offsetZ ?? 0) + Math.sin(angle) * ring.radiusZ,
      );
      uvs.push(segment / radialSegments, ringIndex / Math.max(1, rings.length - 1));
    }
  });
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + next;
      const c = (ring + 1) * radialSegments + next;
      const d = (ring + 1) * radialSegments + segment;
      indices.push(a, d, b, b, d, c);
    }
  }
  const addCap = (ringIndex: number, reverse: boolean) => {
    const ring = rings[ringIndex];
    const center = positions.length / 3;
    positions.push(ring.offsetX ?? 0, ring.y, ring.offsetZ ?? 0);
    uvs.push(0.5, reverse ? 0 : 1);
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ringIndex * radialSegments + segment;
      const b = ringIndex * radialSegments + next;
      indices.push(center, reverse ? b : a, reverse ? a : b);
    }
  };
  addCap(0, true);
  addCap(rings.length - 1, false);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createExtrudedShape(points: readonly [number, number][], depth: number, bevelSize = 0.01) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize,
    bevelThickness: Math.min(depth * 0.24, bevelSize * 0.75),
    curveSegments: 3,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createStarGeometry(points: number, outerRadius: number, innerRadius: number, depth: number) {
  const profile: [number, number][] = [];
  for (let index = 0; index < points * 2; index += 1) {
    const angle = Math.PI / 2 + index / (points * 2) * Math.PI * 2;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    profile.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return createExtrudedShape(profile, depth, depth * 0.15);
}

function createConvexRayGeometry(width: number, length: number, depth: number) {
  const perimeter: readonly [number, number][] = [
    [0, length * 0.5],
    [width * 0.5, length * 0.12],
    [width * 0.42, -length * 0.28],
    [0, -length * 0.5],
    [-width * 0.42, -length * 0.28],
    [-width * 0.5, length * 0.12],
  ];
  const positions: number[] = [];
  perimeter.forEach(([x, y]) => positions.push(x, y, 0));
  const front = positions.length / 3;
  positions.push(0, length * 0.03, depth * 0.5);
  const rear = positions.length / 3;
  positions.push(0, length * 0.03, -depth * 0.5);
  const indices: number[] = [];
  perimeter.forEach((_, index) => {
    const next = (index + 1) % perimeter.length;
    indices.push(front, next, index, rear, index, next);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function capsuleBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  radialSegments: number,
  material: THREE.Material,
  name: string,
  castShadow: boolean,
  receiveShadow: boolean,
) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const result = mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 5, radialSegments),
    material,
    name,
    castShadow,
    receiveShadow,
  );
  result.position.copy(start).add(end).multiplyScalar(0.5);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return result;
}

function addOpenHand(
  side: 'left' | 'right',
  wrist: THREE.Vector3,
  materials: StatueMaterials,
  radialSegments: number,
  castShadow: boolean,
  receiveShadow: boolean,
) {
  const sign = side === 'left' ? -1 : 1;
  const hand = namedPart(`ISLAND_19_G01_STATUE_${side.toUpperCase()}_OPEN_HAND`, `${side}-open-hand`);
  const palmCenter = wrist.clone().add(new THREE.Vector3(sign * 0.075, 0.065, 0.035));
  const palm = mesh(
    new THREE.SphereGeometry(0.09, radialSegments, Math.max(8, radialSegments / 2)),
    materials.antiqueGold,
    `ISLAND_19_G01_STATUE_${side.toUpperCase()}_PALM`,
    castShadow,
    receiveShadow,
  );
  palm.position.copy(palmCenter);
  palm.scale.set(1.08, 0.78, 0.48);
  palm.rotation.z = sign * -0.3;
  hand.add(palm);

  for (let index = 0; index < 4; index += 1) {
    const spread = (index - 1.5) * 0.046;
    const start = palmCenter.clone().add(new THREE.Vector3(sign * 0.035, spread * 0.25, 0.018));
    const end = palmCenter.clone().add(new THREE.Vector3(
      sign * (0.16 + index * 0.009),
      0.105 + spread,
      0.045 + Math.abs(index - 1.5) * 0.01,
    ));
    hand.add(capsuleBetween(
      start, end, 0.017, Math.max(7, radialSegments - 4), materials.antiqueGold,
      `ISLAND_19_G01_STATUE_${side.toUpperCase()}_FINGER_${index + 1}`,
      castShadow, receiveShadow,
    ));
  }
  const thumbStart = palmCenter.clone().add(new THREE.Vector3(sign * 0.02, -0.01, 0.035));
  const thumbEnd = palmCenter.clone().add(new THREE.Vector3(sign * 0.13, -0.085, 0.085));
  hand.add(capsuleBetween(
    thumbStart, thumbEnd, 0.022, Math.max(7, radialSegments - 4), materials.antiqueGold,
    `ISLAND_19_G01_STATUE_${side.toUpperCase()}_THUMB`, castShadow, receiveShadow,
  ));
  return hand;
}

function addArm(
  side: 'left' | 'right',
  parent: THREE.Group,
  materials: StatueMaterials,
  radialSegments: number,
  castShadow: boolean,
  receiveShadow: boolean,
  register: (id: string, object: THREE.Object3D) => void,
) {
  const sign = side === 'left' ? -1 : 1;
  const shoulder = new THREE.Vector3(sign * 0.25, 1.33, 0.015);
  const elbow = new THREE.Vector3(sign * 0.49, 1.57, 0.035);
  const wrist = new THREE.Vector3(sign * 0.69, 1.79, 0.075);
  const upper = namedPart(`ISLAND_19_G01_STATUE_${side.toUpperCase()}_UPPER_ARM`, `${side}-upper-arm`);
  upper.add(capsuleBetween(
    shoulder, elbow, 0.072, radialSegments, materials.antiqueGold,
    `ISLAND_19_G01_STATUE_${side.toUpperCase()}_UPPER_ARM_MESH`, castShadow, receiveShadow,
  ));
  const shoulderPad = mesh(
    createConvexRayGeometry(0.24, 0.3, 0.1), materials.polishedGold,
    `ISLAND_19_G01_STATUE_${side.toUpperCase()}_SHOULDER_PETAL`, castShadow, receiveShadow,
  );
  shoulderPad.position.set(sign * 0.27, 1.36, 0.05);
  shoulderPad.rotation.z = sign * -0.62;
  upper.add(shoulderPad);
  parent.add(upper);
  register(`${side}-upper-arm`, upper);

  const forearm = namedPart(`ISLAND_19_G01_STATUE_${side.toUpperCase()}_FOREARM`, `${side}-forearm`);
  forearm.add(capsuleBetween(
    elbow, wrist, 0.062, radialSegments, materials.polishedGold,
    `ISLAND_19_G01_STATUE_${side.toUpperCase()}_FOREARM_MESH`, castShadow, receiveShadow,
  ));
  const cuff = mesh(
    new THREE.CylinderGeometry(0.085, 0.073, 0.13, radialSegments), materials.polishedGold,
    `ISLAND_19_G01_STATUE_${side.toUpperCase()}_WRIST_CUFF`, castShadow, receiveShadow,
  );
  const cuffStart = wrist.clone().lerp(elbow, 0.12);
  cuff.position.copy(cuffStart);
  cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), wrist.clone().sub(elbow).normalize());
  forearm.add(cuff);
  parent.add(forearm);
  register(`${side}-forearm`, forearm);

  const hand = addOpenHand(side, wrist, materials, radialSegments, castShadow, receiveShadow);
  parent.add(hand);
  register(`${side}-open-hand`, hand);
}

function addCape(
  parent: THREE.Group,
  materials: StatueMaterials,
  castShadow: boolean,
  receiveShadow: boolean,
  register: (id: string, object: THREE.Object3D) => void,
) {
  const cape = namedPart('ISLAND_19_G01_STATUE_SIX_POINT_STAR_CAPE', 'starburst-cape-core');
  const core = mesh(
    new THREE.SphereGeometry(0.42, 28, 16), materials.antiqueGold,
    'ISLAND_19_G01_STATUE_CAPE_CURVED_DRAPERY_MANTLE', castShadow, receiveShadow,
  );
  core.position.set(0, 1.18, -0.22);
  core.scale.set(1.1, 1.35, 0.26);
  cape.add(core);

  const directions = [-43, 0, 43, 137, 180, 223];
  directions.forEach((degrees, index) => {
    const angle = THREE.MathUtils.degToRad(degrees);
    const ray = namedPart(
      `ISLAND_19_G01_STATUE_CAPE_VOLUMETRIC_RAY_${index + 1}`,
      `cape-volumetric-ray-${index + 1}`,
    );
    ray.position.set(Math.cos(angle) * 0.49, 1.18 + Math.sin(angle) * 0.49, -0.23);
    ray.rotation.z = angle - Math.PI / 2;
    ray.rotation.y = Math.sin(angle) * 0.08;
    const shell = mesh(
      createConvexRayGeometry(0.4, 0.8, 0.14), materials.antiqueGold,
      `ISLAND_19_G01_STATUE_CAPE_RAY_OUTER_${index + 1}`, castShadow, receiveShadow,
    );
    const inset = mesh(
      createConvexRayGeometry(0.29, 0.64, 0.07), index % 2 === 0 ? materials.polishedGold : materials.antiqueGold,
      `ISLAND_19_G01_STATUE_CAPE_RAY_INSET_${index + 1}`, castShadow, receiveShadow,
    );
    inset.position.z = 0.095;
    const star = mesh(
      createStarGeometry(4, 0.06, 0.026, 0.02), materials.polishedGold,
      `ISLAND_19_G01_STATUE_CAPE_PANEL_FRONT_STAR_${index + 1}`, castShadow, receiveShadow,
    );
    star.position.set(0, 0.14, 0.15);
    ray.add(shell, inset, star);
    cape.add(ray);
    register(`cape-volumetric-ray-${index + 1}`, ray);
  });

  // Five true rear-flow channels continue from the shoulders to the hem.
  // They are spatial curves, not front-facing cards, so rear and side views
  // preserve the packet's gathered drapery instead of exposing a flat star.
  [-0.22, -0.11, 0, 0.11, 0.22].forEach((x, index) => {
    const start = new THREE.Vector3(x * 0.45, 1.43, -0.305);
    const end = new THREE.Vector3(x, 0.49, -0.31);
    const control = start.clone().lerp(end, 0.5);
    control.x = x * 1.22;
    control.z -= 0.045;
    const channel = mesh(
      new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start, control, end), 18, index === 2 ? 0.026 : 0.021, 8, false),
      index === 2 ? materials.polishedGold : materials.shadowGold,
      `ISLAND_19_G01_STATUE_REAR_DRAPERY_CHANNEL_${index + 1}`,
      castShadow,
      receiveShadow,
    );
    cape.add(channel);
  });
  [-0.2, -0.1, 0, 0.1, 0.2].forEach((x, index) => {
    const drape = mesh(
      createConvexRayGeometry(index === 2 ? 0.19 : 0.16, index === 2 ? 1.02 : 0.94, 0.075),
      index === 2 ? materials.polishedGold : materials.antiqueGold,
      `ISLAND_19_G01_STATUE_REAR_FLOWING_ROBE_PANEL_${index + 1}`,
      castShadow,
      receiveShadow,
    );
    drape.position.set(x, 0.94 + Math.abs(x) * 0.08, -0.345 - Math.abs(x) * 0.035);
    drape.rotation.z = x * -0.34;
    cape.add(drape);
  });
  parent.add(cape);
  register('starburst-cape-core', cape);
}

function addFaceAndCrown(
  parent: THREE.Group,
  materials: StatueMaterials,
  radialSegments: number,
  castShadow: boolean,
  receiveShadow: boolean,
  register: (id: string, object: THREE.Object3D) => void,
) {
  const head = namedPart('ISLAND_19_G01_STATUE_GUARDIAN_HEAD_FACE', 'guardian-head-face');
  const skull = mesh(
    createLoftGeometry([
      { y: 1.39, radiusX: 0.11, radiusZ: 0.105, offsetZ: 0.015 },
      { y: 1.44, radiusX: 0.155, radiusZ: 0.14, offsetZ: 0.02 },
      { y: 1.58, radiusX: 0.175, radiusZ: 0.16, offsetZ: 0.02 },
      { y: 1.72, radiusX: 0.145, radiusZ: 0.135, offsetZ: 0.01 },
      { y: 1.77, radiusX: 0.095, radiusZ: 0.09 },
    ], radialSegments * 2),
    materials.antiqueGold,
    'ISLAND_19_G01_STATUE_HEAD_ANATOMICAL_LOFT',
    castShadow,
    receiveShadow,
  );
  head.add(skull);
  for (const side of [-1, 1] as const) {
    const eye = mesh(
      new THREE.SphereGeometry(0.028, radialSegments, Math.max(8, radialSegments / 2)), materials.shadowGold,
      `ISLAND_19_G01_STATUE_FACE_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`, castShadow, false,
    );
    eye.position.set(side * 0.058, 1.61, 0.166);
    eye.scale.set(1.15, 0.46, 0.28);
    head.add(eye);
    const brow = mesh(
      new THREE.BoxGeometry(0.083, 0.015, 0.02), materials.polishedGold,
      `ISLAND_19_G01_STATUE_FACE_BROW_${side < 0 ? 'LEFT' : 'RIGHT'}`, castShadow, receiveShadow,
    );
    brow.position.set(side * 0.062, 1.64, 0.17);
    brow.rotation.z = side * -0.12;
    head.add(brow);
    const cheek = mesh(
      new THREE.SphereGeometry(0.043, radialSegments, Math.max(8, radialSegments / 2)), materials.antiqueGold,
      `ISLAND_19_G01_STATUE_FACE_CHEEK_${side < 0 ? 'LEFT' : 'RIGHT'}`, castShadow, receiveShadow,
    );
    cheek.position.set(side * 0.073, 1.56, 0.17);
    cheek.scale.set(0.82, 0.48, 0.25);
    head.add(cheek);
    const ear = mesh(
      new THREE.SphereGeometry(0.039, radialSegments, Math.max(8, radialSegments / 2)), materials.antiqueGold,
      `ISLAND_19_G01_STATUE_FACE_EAR_${side < 0 ? 'LEFT' : 'RIGHT'}`, castShadow, receiveShadow,
    );
    ear.position.set(side * 0.17, 1.58, 0.02);
    ear.scale.set(0.5, 0.9, 0.58);
    head.add(ear);
    const hair = mesh(
      new THREE.CapsuleGeometry(0.035, 0.13, 4, radialSegments), materials.shadowGold,
      `ISLAND_19_G01_STATUE_TEMPLE_CURL_${side < 0 ? 'LEFT' : 'RIGHT'}`, castShadow, receiveShadow,
    );
    hair.position.set(side * 0.145, 1.53, -0.015);
    hair.rotation.z = side * -0.2;
    head.add(hair);
  }
  const nose = mesh(
    new THREE.CapsuleGeometry(0.022, 0.065, 4, radialSegments), materials.polishedGold,
    'ISLAND_19_G01_STATUE_FACE_NOSE', castShadow, receiveShadow,
  );
  nose.position.set(0, 1.575, 0.185);
  head.add(nose);
  const smile = mesh(
    new THREE.TorusGeometry(0.05, 0.009, 6, radialSegments * 2, Math.PI), materials.shadowGold,
    'ISLAND_19_G01_STATUE_FACE_SMILE', castShadow, false,
  );
  smile.position.set(0, 1.515, 0.179);
  smile.rotation.z = Math.PI;
  head.add(smile);
  parent.add(head);
  register('guardian-head-face', head);

  const crown = namedPart('ISLAND_19_G01_STATUE_LAYERED_CROWN', 'crown-leaf-ring');
  const band = mesh(
    new THREE.TorusGeometry(0.15, 0.018, 7, radialSegments * 2), materials.polishedGold,
    'ISLAND_19_G01_STATUE_CROWN_BAND', castShadow, receiveShadow,
  );
  band.position.set(0, 1.72, 0.01);
  band.rotation.x = Math.PI / 2;
  crown.add(band);
  for (let index = 0; index < 9; index += 1) {
    const azimuth = index / 9 * Math.PI * 2;
    const frontWeight = (Math.cos(azimuth) + 1) * 0.5;
    const height = 0.23 + frontWeight * 0.11;
    const leaf = mesh(
      createConvexRayGeometry(0.11, height, 0.065),
      index % 3 === 0 ? materials.polishedGold : materials.antiqueGold,
      `ISLAND_19_G01_STATUE_CROWN_LOTUS_LEAF_${index + 1}`,
      castShadow,
      receiveShadow,
    );
    leaf.position.set(Math.sin(azimuth) * 0.105, 1.83, Math.cos(azimuth) * 0.095);
    leaf.rotation.y = azimuth;
    leaf.rotation.z = Math.sin(azimuth) * -0.28;
    crown.add(leaf);
  }
  const finial = mesh(
    createConvexRayGeometry(0.13, 0.32, 0.09), materials.polishedGold,
    'ISLAND_19_G01_STATUE_CROWN_FLAME_FINIAL', castShadow, receiveShadow,
  );
  finial.position.set(0, 1.93, 0.01);
  crown.add(finial);
  parent.add(crown);
  register('crown-leaf-ring', crown);
}

export function createIsland19CoasterCarnivalCircuitGFountainStatue(
  options: Island19CircuitGFountainStatueOptions = {},
): Island19CircuitGFountainStatueRuntime {
  const quality = options.quality ?? 'high';
  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;
  const reducedMotion = options.reducedMotion ?? false;
  const radialSegments = quality === 'high' ? 20 : quality === 'medium' ? 16 : 12;
  const materials = createMaterials();
  const partRoots: Record<string, THREE.Object3D> = {};
  const register = (id: string, object: THREE.Object3D) => { partRoots[id] = object; };

  const root = new THREE.Group();
  root.name = ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_NAME;
  root.userData = {
    partId: 'g01-fountain-statue',
    explodable: true,
    clickable: true,
    packet: ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_PACKET,
    packetSha256: ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_PACKET_SHA256,
    constructionFamily: 'source-locked-four-view-impostor-hybrid-v9',
    retiredConstructionFamilies: [
      'isolated-continuous-guardian-statue',
      'extruded-star-shell-storybook-guardian-v2',
      'layered-six-ray-draped-guardian-v3',
      'curved-anatomical-relief-guardian-v4',
      'broad-convex-panel-human-guardian-v5',
      'skinned-production-human-guardian-v6',
      'source-traced-continuous-robe-guardian-v7',
      'blender-authored-volumetric-guardian-v8',
    ],
    generatedReferenceAuthority: 'secondary-inferred-user-approved',
    representationHonesty: 'angle-aware-four-view-impostor-over-real-fountain-socket-and-collider',
    gameplayWrites: false,
  };

  const mountConsumer = new THREE.Object3D();
  mountConsumer.name = 'ISLAND_19_G01_STATUE_FOUNTAIN_MOUNT_CONSUMER';
  mountConsumer.userData = {
    socketType: 'fountain-statue-consumer',
    consumes: 'ISLAND_19_G01_FOUNTAIN_STATUE_SOCKET',
    contactType: 'keyed-embed',
    embedDepth: 0.08,
    gapTolerance: 0.008,
  };
  root.add(mountConsumer);

  const visualPivot = new THREE.Group();
  visualPivot.name = 'ISLAND_19_G01_STATUE_VISUAL_PIVOT';
  visualPivot.userData = { partId: 'guardian-visual-assembly', explodable: false, clickable: false };
  root.add(visualPivot);

  const mount = namedPart('ISLAND_19_G01_STATUE_KEYED_MOUNT', 'keyed-fountain-mount');
  const mountStem = mesh(
    new THREE.CylinderGeometry(0.085, 0.09, 0.22, radialSegments), materials.antiqueGold,
    'ISLAND_19_G01_STATUE_MOUNT_STEM', castShadow, receiveShadow,
  );
  mountStem.position.y = 0.11;
  mount.add(mountStem);
  visualPivot.add(mount);
  register('keyed-fountain-mount', mount);

  const pedestal = namedPart('ISLAND_19_G01_STATUE_TWO_STEP_PEDESTAL', 'two-step-pedestal');
  const lowerStep = mesh(
    new THREE.CylinderGeometry(0.28, 0.25, 0.11, radialSegments * 2), materials.antiqueGold,
    'ISLAND_19_G01_STATUE_PEDESTAL_LOWER_STEP', castShadow, receiveShadow,
  );
  lowerStep.position.y = 0.24;
  const upperStep = mesh(
    new THREE.CylinderGeometry(0.255, 0.28, 0.11, radialSegments * 2), materials.polishedGold,
    'ISLAND_19_G01_STATUE_PEDESTAL_UPPER_STEP', castShadow, receiveShadow,
  );
  upperStep.position.y = 0.34;
  pedestal.add(lowerStep, upperStep);
  visualPivot.add(pedestal);
  register('two-step-pedestal', pedestal);

  addCape(visualPivot, materials, castShadow, receiveShadow, register);

  const robe = namedPart('ISLAND_19_G01_STATUE_CONTINUOUS_ROBE', 'robe-core');
  const robeShell = mesh(
    createLoftGeometry([
      { y: 0.38, radiusX: 0.19, radiusZ: 0.14, offsetZ: 0.015 },
      { y: 0.43, radiusX: 0.25, radiusZ: 0.18, offsetZ: 0.015 },
      { y: 0.6, radiusX: 0.29, radiusZ: 0.205, offsetZ: 0.01 },
      { y: 0.88, radiusX: 0.285, radiusZ: 0.21, offsetZ: 0.005 },
      { y: 1.12, radiusX: 0.265, radiusZ: 0.205 },
      { y: 1.28, radiusX: 0.245, radiusZ: 0.19 },
      { y: 1.38, radiusX: 0.19, radiusZ: 0.155 },
    ], radialSegments * 2),
    materials.antiqueGold,
    'ISLAND_19_G01_STATUE_TALL_CONTINUOUS_ROBE_SHELL', castShadow, receiveShadow,
  );
  robe.add(robeShell);
  [-0.14, 0, 0.14].forEach((x, index) => {
    const start = new THREE.Vector3(x * 0.35, 1.26, 0.205);
    const end = new THREE.Vector3(x, 0.46, 0.21);
    const control = start.clone().lerp(end, 0.5);
    control.x = x * 1.2;
    const fold = mesh(
      new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start, control, end), 16, index === 1 ? 0.025 : 0.019, 7, false),
      index === 1 ? materials.polishedGold : materials.shadowGold,
      `ISLAND_19_G01_STATUE_ROBE_FRONT_FOLD_${index + 1}`, castShadow, receiveShadow,
    );
    robe.add(fold);
  });
  for (const side of [-1, 1] as const) {
    const foot = mesh(
      new THREE.SphereGeometry(0.095, radialSegments, Math.max(8, radialSegments / 2)), materials.polishedGold,
      `ISLAND_19_G01_STATUE_FOOT_${side < 0 ? 'LEFT' : 'RIGHT'}`, castShadow, receiveShadow,
    );
    foot.position.set(side * 0.1, 0.41, 0.17);
    foot.scale.set(0.95, 0.42, 1.3);
    robe.add(foot);
  }
  visualPivot.add(robe);
  register('robe-core', robe);

  const torso = namedPart('ISLAND_19_G01_STATUE_TORSO_AND_SHOULDERS', 'torso-core');
  const chest = mesh(
    createLoftGeometry([
      { y: 1.2, radiusX: 0.25, radiusZ: 0.19 },
      { y: 1.3, radiusX: 0.285, radiusZ: 0.205 },
      { y: 1.38, radiusX: 0.235, radiusZ: 0.18 },
      { y: 1.44, radiusX: 0.13, radiusZ: 0.12 },
    ], radialSegments * 2),
    materials.polishedGold,
    'ISLAND_19_G01_STATUE_ANATOMICAL_TORSO', castShadow, receiveShadow,
  );
  torso.add(chest);
  visualPivot.add(torso);
  register('torso-core', torso);

  addArm('left', visualPivot, materials, radialSegments, castShadow, receiveShadow, register);
  addArm('right', visualPivot, materials, radialSegments, castShadow, receiveShadow, register);
  addFaceAndCrown(visualPivot, materials, radialSegments, castShadow, receiveShadow, register);

  const medallion = namedPart('ISLAND_19_G01_STATUE_CHEST_STAR_MEDALLION', 'chest-star-medallion');
  const medallionDisc = mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.055, radialSegments * 2), materials.shadowGold,
    'ISLAND_19_G01_STATUE_MEDALLION_DISC', castShadow, receiveShadow,
  );
  medallionDisc.rotation.x = Math.PI / 2;
  medallionDisc.position.set(0, 1.2, 0.245);
  const medallionStar = mesh(
    createStarGeometry(8, 0.1, 0.044, 0.03), materials.polishedGold,
    'ISLAND_19_G01_STATUE_MEDALLION_STAR', castShadow, receiveShadow,
  );
  medallionStar.position.set(0, 1.2, 0.282);
  medallion.add(medallionDisc, medallionStar);
  visualPivot.add(medallion);
  register('chest-star-medallion', medallion);

  const fallbackParts = [
    mount,
    pedestal,
    partRoots['starburst-cape-core'],
    robe,
    torso,
    partRoots['left-upper-arm'],
    partRoots['left-forearm'],
    partRoots['left-open-hand'],
    partRoots['right-upper-arm'],
    partRoots['right-forearm'],
    partRoots['right-open-hand'],
    partRoots['guardian-head-face'],
    partRoots['crown-leaf-ring'],
    medallion,
  ];
  fallbackParts.forEach((part) => { part.visible = false; });

  const textureLoader = new THREE.TextureLoader();
  const viewDefinitions = [
    ['front', './assets/island019/guardian-impostor/guardian-front-v9.png'],
    ['right', './assets/island019/guardian-impostor/guardian-right-v9.png'],
    ['rear', './assets/island019/guardian-impostor/guardian-rear-v9.png'],
    ['left', './assets/island019/guardian-impostor/guardian-left-v9.png'],
  ] as const;
  const viewMaterials = Object.fromEntries(viewDefinitions.map(([view, relativeUrl]) => {
    // Three's browser TextureLoader reaches for `document`. Service tests
    // intentionally construct presentation objects in Node, where the real
    // PNG is irrelevant but the semantic sprite hierarchy still matters.
    const texture = typeof document === 'undefined'
      ? new THREE.Texture()
      : textureLoader.load(new URL(relativeUrl, import.meta.url).href);
    texture.name = `ISLAND_19_G01_GUARDIAN_${view.toUpperCase()}_V9_TEXTURE`;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.025,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    return [view, material];
  })) as Record<(typeof viewDefinitions)[number][0], THREE.SpriteMaterial>;
  const impostor = new THREE.Sprite(viewMaterials.front);
  impostor.name = 'ISLAND_19_G01_STATUE_SOURCE_LOCKED_FOUR_VIEW_IMPOSTOR';
  impostor.position.set(0, 1.14, 0);
  impostor.scale.set(1.76, 2.2, 1);
  impostor.center.set(0.5, 0.5);
  impostor.userData = {
    partId: 'source-locked-four-view-impostor',
    renderingTechnique: 'angle-aware-phone-landmark-impostor',
    sourceViews: ['front', 'right', 'rear', 'left'],
    sourcePacket: ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_PACKET,
    realSocketOwner: mountConsumer.name,
    gameplayWrites: false,
  };
  const cameraWorldPosition = new THREE.Vector3();
  const localCameraPosition = new THREE.Vector3();
  impostor.onBeforeRender = (_renderer, _scene, camera) => {
    camera.getWorldPosition(cameraWorldPosition);
    localCameraPosition.copy(cameraWorldPosition);
    visualPivot.worldToLocal(localCameraPosition);
    const azimuth = Math.atan2(localCameraPosition.x, localCameraPosition.z);
    const absoluteAzimuth = Math.abs(azimuth);
    const view = absoluteAzimuth <= Math.PI * 0.25
      ? 'front'
      : absoluteAzimuth >= Math.PI * 0.75
        ? 'rear'
        : azimuth > 0
          ? 'right'
          : 'left';
    if (impostor.material !== viewMaterials[view]) impostor.material = viewMaterials[view];
    impostor.userData.activeView = view;
  };
  visualPivot.add(impostor);
  register('source-locked-four-view-impostor', impostor);

  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) originalMaterials.set(object, object.material);
  });
  const setClay = (enabled: boolean) => {
    impostor.visible = !enabled;
    fallbackParts.forEach((part) => { part.visible = enabled; });
    originalMaterials.forEach((material, object) => {
      object.material = enabled
        ? (Array.isArray(material) ? material.map(() => materials.clay) : materials.clay)
        : material;
    });
  };
  if (options.clay) setClay(true);

  const animate = (elapsedSeconds: number) => {
    const time = reducedMotion ? 0 : elapsedSeconds;
    visualPivot.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.34) * 0.018;
    medallionStar.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.52) * 0.04;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 1.6) * 0.028;
    medallionStar.scale.setScalar(pulse);
    materials.polishedGold.emissiveIntensity = reducedMotion ? 0.085 : 0.085 + Math.sin(time * 1.6) * 0.018;
  };

  root.userData.sculptRuntime = {
    schemaVersion: 1,
    actionReady: true,
    staticRigidCharacter: true,
    skinnedArticulatedCharacter: false,
    hybridSourceLockedImpostor: true,
    nodes: partRoots,
    sockets: { fountainMountConsumer: mountConsumer },
    colliders: {
      body: { type: 'capsule', radius: 0.31, height: 1.28, offset: [0, 1.02, 0] },
      hands: { type: 'compound-spheres', count: 2 },
    },
    destructionGroups: {
      mount: [mount, pedestal],
      body: [robe, torso, partRoots['guardian-head-face'], partRoots['crown-leaf-ring']],
      arms: [
        partRoots['left-upper-arm'], partRoots['left-forearm'], partRoots['left-open-hand'],
        partRoots['right-upper-arm'], partRoots['right-forearm'], partRoots['right-open-hand'],
      ],
      cape: [partRoots['starburst-cape-core']],
      medallion: [medallion],
    },
    reducedMotionBehavior: 'freeze-visual-pivot-and-medallion-emphasis',
    gameplayWrites: false,
  };

  const dataset = {
    island19CircuitGFountainStatue: 'approved-packet-source-locked-four-view-impostor-hybrid-v9',
    island19CircuitGFountainStatuePacketSha256: ISLAND_19_CIRCUIT_G_FOUNTAIN_STATUE_PACKET_SHA256,
    island19CircuitGFountainStatueParts: String(Object.keys(partRoots).length),
    island19CircuitGFountainStatueSockets: '1',
    island19CircuitGFountainStatueActionReady: 'true',
    island19CircuitGFountainStatueReducedMotionSafe: 'true',
    island19CircuitGFountainStatueGameplayWrites: 'false',
  };

  return { root, visualPivot, mountConsumer, medallionStar, partRoots, dataset, animate, setClay };
}
