import * as THREE from 'three';
import { addCelestialV2Finish } from './Island2CelestialV2Finish';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';
import palaceMeshPacket from './generated/island002-palace-roof.json';

type PalaceLevel = 1 | 2 | 3;
type Point = [number, number, number];

/** Connected royal keep family. +Z is the arrival; placement belongs to the world. */
export function createCelestialV2Palace(
  level: PalaceLevel,
  quality: Island3DQuality,
  materials: Island2CelestialMaterials,
): THREE.Group {
  const root = new THREE.Group();
  root.name = `ISLAND_2_SOLSPIRE_PALACE_V2_L${level}`;
  root.userData.palaceConstructionFamily = 'blender-continuous-roof-and-keep';
  const segments = quality === 'high' ? 24 : quality === 'medium' ? 16 : 12;

  function phase(value: PalaceLevel) {
    const group = new THREE.Group();
    group.name = `SOLSPIRE_FUNDED_L${value}`;
    group.userData.palaceBuildLevel = value;
    root.add(group);
    return group;
  }

  function part(parent: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: Point, stage = 2) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = quality === 'high';
    mesh.receiveShadow = true;
    mesh.userData.constructionStage = stage;
    parent.add(mesh);
    return mesh;
  }

  function addBlenderPhase(parent: THREE.Group, fundedLevel: PalaceLevel) {
    for (const authored of palaceMeshPacket.parts) {
      if (authored.phase !== fundedLevel) continue;
      // Factory calls own all their buffers. Preview disposal must never mutate
      // the funded scene or another construction target's generated geometry.
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(authored.position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(authored.normal, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(authored.uv, 2));
      geometry.setIndex(authored.index);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      part(parent, authored.name, geometry, materials[authored.material as keyof Island2CelestialMaterials], [0, 0, 0], authored.stage);
    }
  }

  function box(parent: THREE.Group, name: string, dimensions: Point, position: Point, material: THREE.Material = materials.ivory, stage = 2) {
    return part(parent, name, new THREE.BoxGeometry(...dimensions), material, position, stage);
  }

  function drum(parent: THREE.Group, name: string, radius: number, height: number, position: Point, material: THREE.Material = materials.ivory, stage = 2, sides = segments) {
    return part(parent, name, new THREE.CylinderGeometry(radius, radius, height, sides), material, position, stage);
  }

  function archProfile(width: number, height: number, bottom = 0) {
    const path = new THREE.Shape();
    const spring = bottom + height * 0.69;
    path.moveTo(-width / 2, bottom);
    path.lineTo(width / 2, bottom);
    path.lineTo(width / 2, spring);
    path.bezierCurveTo(width / 2, bottom + height * 0.90, width * 0.22, bottom + height, 0, bottom + height);
    path.bezierCurveTo(-width * 0.22, bottom + height, -width / 2, bottom + height * 0.90, -width / 2, spring);
    path.closePath();
    return path;
  }

  // Every residential bay is closed by recessed glazing behind a real masonry
  // aperture. This is a inhabited keep, never an open belfry or painted window.
  function windowBay(parent: THREE.Group, name: string, width: number, height: number, position: Point, rotationY = 0, depth = 0.075) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...position);
    group.rotation.y = rotationY;
    parent.add(group);
    const wall = new THREE.Shape();
    wall.moveTo(-width / 2, 0);
    wall.lineTo(width / 2, 0);
    wall.lineTo(width / 2, height);
    wall.lineTo(-width / 2, height);
    wall.closePath();
    const opening = archProfile(width * 0.54, height * 0.74, height * 0.12);
    wall.holes.push(new THREE.Path(opening.getPoints(quality === 'low' ? 5 : 8).reverse()));
    part(group, `${name}_MASONRY`, new THREE.ExtrudeGeometry(wall, { depth, bevelEnabled: false, curveSegments: 8 }), materials.ivory, [0, 0, 0]);
    part(group, `${name}_RECESSED_GLAZING`, new THREE.ShapeGeometry(opening, 8), materials.warmGlow, [0, 0, -0.016], 4);
    box(group, `${name}_MULLION`, [width * 0.035, height * 0.72, 0.028], [0, height * 0.48, -0.004], materials.gold, 4);
    box(group, `${name}_SILL`, [width * 0.69, height * 0.07, depth + 0.055], [0, height * 0.105, depth * 0.45], materials.ivoryShade);
    return group;
  }

  function room(parent: THREE.Group, name: string, width: number, height: number, depth: number, position: Point, frontBays = 2, sideBays = 2) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...position);
    parent.add(group);
    box(group, `${name}_FLOOR`, [width + 0.10, 0.10, depth + 0.10], [0, 0.05, 0], materials.ivoryShade, 1);
    box(group, `${name}_ROOF_SLAB`, [width + 0.12, 0.10, depth + 0.12], [0, height - 0.02, 0], materials.ivory, 3);
    for (const side of [-1, 1]) {
      for (let index = 0; index < frontBays; index += 1) {
        const x = -width / 2 + width * (index + 0.5) / frontBays;
        windowBay(group, `${name}_${side > 0 ? 'FRONT' : 'REAR'}_${index}`, width / frontBays, height - 0.10,
          [side * x, 0.10, side * (depth / 2 - 0.075)], side > 0 ? 0 : Math.PI);
      }
      for (let index = 0; index < sideBays; index += 1) {
        const z = -depth / 2 + depth * (index + 0.5) / sideBays;
        windowBay(group, `${name}_${side > 0 ? 'EAST' : 'WEST'}_${index}`, depth / sideBays, height - 0.10,
          [side * (width / 2 - 0.075), 0.10, -side * z], side * Math.PI / 2);
      }
    }
    return group;
  }

  function octagonalRoom(parent: THREE.Group, name: string, radius: number, height: number, position: Point) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...position);
    parent.add(group);
    const apothem = radius * Math.cos(Math.PI / 8);
    const width = radius * Math.sin(Math.PI / 8) * 2;
    drum(group, `${name}_LOWER_MASONRY`, radius, height * 0.19, [0, height * 0.095, 0], materials.ivory, 2, 8).rotation.y = Math.PI / 8;
    for (let face = 0; face < 8; face += 1) {
      const angle = face * Math.PI / 4;
      windowBay(group, `${name}_RESIDENTIAL_BAY_${face}`, width, height * 0.81,
        [Math.sin(angle) * (apothem - 0.06), height * 0.19, Math.cos(angle) * (apothem - 0.06)], angle, 0.06);
    }
    drum(group, `${name}_CORNICE`, radius * 1.10, 0.09, [0, height + 0.02, 0], materials.ivory, 3, 8).rotation.y = Math.PI / 8;
    return group;
  }

  function hipRoof(parent: THREE.Group, name: string, width: number, height: number, depth: number, position: Point) {
    // Low four-sided sloping roof ending in a broad flat terrace, not a nave.
    const geometry = new THREE.CylinderGeometry(0.54, 1, height, 4, 1);
    geometry.rotateY(Math.PI / 4);
    geometry.scale(width / Math.SQRT2, 1, depth / Math.SQRT2);
    return part(parent, name, geometry, materials.sapphire, [position[0], position[1] + height / 2, position[2]], 3);
  }

  function spireRoof(parent: THREE.Group, name: string, radius: number, height: number, position: Point) {
    const profile = [
      [0, 0], [radius, 0], [radius, 0.028], [radius * 0.88, height * 0.08],
      [radius * 0.69, height * 0.32], [radius * 0.40, height * 0.61],
      [radius * 0.13, height * 0.87], [radius * 0.035, height * 0.97], [0, height],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    part(parent, name, new THREE.LatheGeometry(profile, segments), materials.sapphire, position, 3);
    drum(parent, `${name}_EAVE`, radius * 0.96, 0.035, [position[0], position[1] + 0.023, position[2]], materials.gold, 3);
    const finial = part(parent, `${name}_FINIAL`, new THREE.OctahedronGeometry(radius * 0.095), materials.gold,
      [position[0], position[1] + height + radius * 0.08, position[2]], 5);
    finial.scale.y = 2;
  }

  function turret(parent: THREE.Group, name: string, x: number, z: number, bottom: number, bodyHeight: number, radius: number, roofHeight: number, includeRoof = true) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, bottom, z);
    parent.add(group);
    drum(group, `${name}_FOOT`, radius * 1.18, 0.12, [0, 0.06, 0], materials.ivoryShade, 1, 8);
    const plainHeight = bodyHeight * 0.46;
    drum(group, `${name}_LOWER_SHAFT`, radius, plainHeight, [0, plainHeight / 2, 0], materials.ivory, 2, 8).rotation.y = Math.PI / 8;
    octagonalRoom(group, `${name}_CHAMBER`, radius, bodyHeight - plainHeight, [0, plainHeight, 0]);
    if (includeRoof) spireRoof(group, `${name}_ROOF`, radius * 1.23, roofHeight, [0, bodyHeight + 0.07, 0]);
  }

  function balustrade(parent: THREE.Group, name: string, points: THREE.Vector3[], height: number, radius = 0.027) {
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      drum(parent, `${name}_BALUSTER_${i}`, radius, height, [p.x, p.y + height / 2, p.z], materials.ivory, 2, 6);
    }
    const rail = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, p.y + height, p.z)));
    part(parent, `${name}_HANDRAIL`, new THREE.TubeGeometry(rail, Math.max(12, points.length * 2), radius * 1.12, 5, false), materials.ivory, [0, 0, 0], 3);
  }

  const first = phase(1);
  drum(first, 'PALACE_LOWER_COURT', 1.78, 0.12, [0, 0.06, 0], materials.ivoryShade, 1);
  const terrace = new THREE.Shape();
  const notchAngle = 0.34;
  for (let i = 0; i <= 40; i += 1) {
    const angle = notchAngle + (Math.PI * 2 - notchAngle * 2) * i / 40;
    const x = Math.sin(angle) * 1.60;
    const z = Math.cos(angle) * 1.60;
    if (i === 0) terrace.moveTo(x, -z);
    else terrace.lineTo(x, -z);
  }
  terrace.lineTo(-Math.sin(notchAngle) * 1.60, -0.72);
  terrace.lineTo(Math.sin(notchAngle) * 1.60, -0.72);
  terrace.closePath();
  const terraceGeometry = new THREE.ExtrudeGeometry(terrace, { depth: 0.30, bevelEnabled: false });
  terraceGeometry.rotateX(-Math.PI / 2);
  part(first, 'PALACE_UPPER_COURT', terraceGeometry, materials.ivory, [0, 0.12, 0], 1);
  for (let step = 0; step < 7; step += 1) {
    const front = 1.69 - step * 0.125;
    const h = 0.044 * (step + 1);
    box(first, `PALACE_GRAND_STAIR_${step}`, [1.02, h, front - 0.71], [0, 0.12 + h / 2, (front + 0.71) / 2], materials.ivory, 1);
  }
  for (const side of [-1, 1]) {
    balustrade(first, `PALACE_STAIR_RAIL_${side}`, Array.from({ length: 7 }, (_, i) =>
      new THREE.Vector3(side * 0.55, 0.17 + i * 0.043, 1.60 - i * 0.12)), 0.20, 0.025);
  }
  const courtRail = Array.from({ length: 29 }, (_, i) => {
    const angle = 0.45 + i / 28 * (Math.PI * 2 - 0.90);
    return new THREE.Vector3(Math.sin(angle) * 1.52, 0.42, Math.cos(angle) * 1.52);
  });
  balustrade(first, 'PALACE_TERRACE_BALUSTRADE', courtRail, 0.22);

  // Two connected residential wings and a rear hall give L1 its own complete
  // palace identity. The front gate opens into this occupied architectural mass.
  for (const side of [-1, 1]) {
    const label = side < 0 ? 'WEST' : 'EAST';
    room(first, `PALACE_${label}_LOWER_WING`, 0.76, 0.86, 1.22, [side * 0.75, 0.42, -0.10], 2, 3);
    hipRoof(first, `PALACE_${label}_LOWER_HIP`, 0.86, 0.16, 1.32, [side * 0.75, 1.31, -0.10]);
  }
  room(first, 'PALACE_REAR_RESIDENCE', 1.34, 0.86, 0.43, [0, 0.42, -0.72], 3, 1);
  box(first, 'PALACE_REAR_TERRACE_CAP', [1.49, 0.12, 0.60], [0, 1.32, -0.72], materials.ivoryShade, 3);

  const gate = new THREE.Shape();
  gate.moveTo(-0.49, 0); gate.lineTo(-0.49, 1.00); gate.lineTo(0.49, 1.00); gate.lineTo(0.49, 0);
  gate.lineTo(0.31, 0); gate.lineTo(0.31, 0.56);
  gate.bezierCurveTo(0.31, 0.76, 0.13, 0.86, 0, 0.90);
  gate.bezierCurveTo(-0.13, 0.86, -0.31, 0.76, -0.31, 0.56);
  gate.lineTo(-0.31, 0); gate.closePath();
  part(first, 'PALACE_RECESSED_GATEWAY', new THREE.ExtrudeGeometry(gate, { depth: 0.34, bevelEnabled: false, curveSegments: 10 }), materials.ivory, [0, 0.42, 0.54]);
  part(first, 'PALACE_GOLD_DOUBLE_DOORS', new THREE.ShapeGeometry(archProfile(0.60, 0.88), 10), materials.gold, [0, 0.42, 0.565], 4);
  box(first, 'PALACE_DOOR_CENTRAL_STILE', [0.033, 0.80, 0.04], [0, 0.82, 0.59], materials.ivory, 4);
  box(first, 'PALACE_GATE_BALCONY_SLAB', [1.10, 0.12, 0.51], [0, 1.45, 0.61], materials.ivoryShade, 3);
  balustrade(first, 'PALACE_GATE_BALCONY', Array.from({ length: 9 }, (_, i) => new THREE.Vector3(-0.49 + i * 0.1225, 1.51, 0.85)), 0.20, 0.019);
  for (const side of [-1, 1]) {
    turret(first, `PALACE_${side < 0 ? 'WEST' : 'EAST'}_LOW_TURRET`, side * 1.15, 0.49, 0.42, 0.97, 0.16, 0.56);
  }

  if (level >= 2) {
    const second = phase(2);
    // A single authored masonry mass grows from the residential wings. Its
    // recessed windows were cut in Blender; there is no flat white middle shelf.
    addBlenderPhase(second, 2);
    for (const side of [-1, 1]) {
      const label = side < 0 ? 'WEST' : 'EAST';
      turret(second, `PALACE_${label}_MID_TURRET`, side * 0.70, -0.20, 1.20,
        side < 0 ? 1.16 : 1.01, 0.175, side < 0 ? 0.73 : 0.62, false);
    }
  }

  if (level >= 3) {
    const third = phase(3);
    addBlenderPhase(third, 3);
    for (const side of [-1, 1]) {
      turret(third, `PALACE_${side < 0 ? 'WEST' : 'EAST'}_REAR_TURRET`, side * 1.04, -0.76, 0.42,
        side < 0 ? 1.29 : 1.39, 0.17, side < 0 ? 0.59 : 0.70, false);
    }
  }

  addCelestialV2Finish(root, 'palace', materials);
  return root;
}
