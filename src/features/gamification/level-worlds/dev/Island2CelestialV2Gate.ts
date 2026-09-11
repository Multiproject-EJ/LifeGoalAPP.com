import * as THREE from 'three';
import { addCelestialV2Finish } from './Island2CelestialV2Finish';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';

export const CELESTIAL_GATE_FOOTPRINT_RADIUS = 1.43;

type Point = [number, number, number];

/** Supported, inclined arrival portal; the world owns the board-facing root transform. */
export function createCelestialV2Gate(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2CelestialMaterials): THREE.Group {
  const root = new THREE.Group(); root.name = `ISLAND_2_ASTRAL_GATE_V2_L${level}`;
  const segments = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;
  const ringCentre = new THREE.Vector3(0, 1.76, -0.12);
  const ringRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, -0.20));
  function phase(n: number) { const item = new THREE.Group(); item.name = `GATE_FUNDED_L${n}`; root.add(item); return item; }
  function mesh(parent: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, at: Point = [0, 0, 0], stage = 2) {
    const item = new THREE.Mesh(geometry, material); item.name = name; item.position.set(...at); item.userData.constructionStage = stage;
    item.castShadow = quality === 'high'; item.receiveShadow = true; parent.add(item); return item;
  }
  function box(parent: THREE.Group, name: string, size: Point, at: Point, material: THREE.Material = materials.ivory, stage = 1) {
    return mesh(parent, name, new THREE.BoxGeometry(...size), material, at, stage);
  }
  function drum(parent: THREE.Group, name: string, radius: number, height: number, at: Point, material: THREE.Material = materials.ivory, stage = 1) {
    return mesh(parent, name, new THREE.CylinderGeometry(radius, radius, height, segments), material, at, stage);
  }
  function annulus(parent: THREE.Group, name: string, outer: number, inner: number, depth: number, z: number, material: THREE.Material, stage = 3) {
    const shape = new THREE.Shape(); shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
    return mesh(parent, name, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: segments / 2 }), material, [0, 0, z - depth / 2], stage);
  }
  function tube(parent: THREE.Group, name: string, points: THREE.Vector3[], radius: number, material: THREE.Material = materials.gold, stage = 2) {
    return mesh(parent, name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, radius, quality === 'low' ? 5 : 8, false), material, [0, 0, 0], stage);
  }
  function ringPoint(angle: number, radius: number, depth = 0) {
    return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, depth).applyQuaternion(ringRotation).add(ringCentre);
  }
  function frame(parent: THREE.Group, name: string) {
    const item = new THREE.Group(); item.name = name; item.position.copy(ringCentre); item.quaternion.copy(ringRotation); parent.add(item); return item;
  }
  // Closed polygonal sections give the structural arms visible front, back, and side faces.
  function sweptPier(parent: THREE.Group, name: string, path: THREE.Vector3[], widths: number[], depth: number, material: THREE.Material, stage = 2) {
    const positions: number[] = [], indices: number[] = [];
    for (let i = 0; i < path.length; i += 1) {
      const tangent = path[Math.min(i + 1, path.length - 1)].clone().sub(path[Math.max(0, i - 1)]).normalize();
      const across = new THREE.Vector3(tangent.y, -tangent.x, 0).normalize();
      for (const [side, front] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = path[i].clone().addScaledVector(across, side * widths[i] / 2); p.z += front * depth / 2; positions.push(p.x, p.y, p.z);
      }
    }
    for (let row = 0; row < path.length - 1; row += 1) for (let corner = 0; corner < 4; corner += 1) {
      const a = row * 4 + corner, b = row * 4 + (corner + 1) % 4, c = b + 4, d = a + 4; indices.push(a, b, c, a, c, d);
    }
    indices.push(0, 2, 1, 0, 3, 2); const end = (path.length - 1) * 4; indices.push(end, end + 1, end + 2, end, end + 2, end + 3);
    for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return mesh(parent, name, geometry, material, [0, 0, 0], stage);
  }

  const first = phase(1);
  drum(first, 'GATE_BROAD_FOUNDATION', CELESTIAL_GATE_FOOTPRINT_RADIUS, 0.12, [0, 0.06, 0], materials.ivoryShade);
  drum(first, 'GATE_TERRACED_ARRIVAL_BASE', 1.32, 0.19, [0, 0.215, 0], materials.ivoryShade);
  drum(first, 'GATE_ARRIVAL_TERRACE', 1.39, 0.09, [0, 0.355, 0]);
  drum(first, 'GATE_INLAID_LANDING', 0.91, 0.017, [0, 0.408, 0.26], materials.ivory);
  const landingRim = mesh(first, 'GATE_GOLD_ARRIVAL_INLAY', new THREE.TorusGeometry(0.80, 0.018, 6, segments), materials.gold, [0, 0.42, 0.26]); landingRim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i += 1) {
    const front = 1.72 - i * 0.113, height = 0.047 * (i + 1);
    box(first, `GATE_BROAD_ARRIVAL_STAIR_${i}`, [1.06, height, front - 0.92], [0, 0.12 + height / 2, (front + 0.92) / 2]);
  }
  for (const side of [-1, 1]) {
    tube(first, `GATE_STAIR_CONTINUOUS_HANDRAIL_${side}`, [new THREE.Vector3(side * 0.59, 0.32, 1.63), new THREE.Vector3(side * 0.59, 0.62, 1.02)], 0.031, materials.ivory);
    for (let i = 0; i < 3; i += 1) box(first, `GATE_STAIR_RAIL_POST_${side}_${i}`, [0.055, 0.17, 0.055], [side * 0.59, 0.225 + i * 0.13, 1.62 - i * 0.28]);
    const x = side * 1.08, z = 0.34;
    box(first, `GATE_CRYSTAL_PYLON_PLINTH_${side}`, [0.43, 0.18, 0.43], [x, 0.49, z], materials.ivoryShade);
    box(first, `GATE_CRYSTAL_PYLON_BOOT_${side}`, [0.36, 0.22, 0.36], [x, 0.66, z]);
    box(first, `GATE_CRYSTAL_PYLON_GOLD_SOLE_${side}`, [0.37, 0.04, 0.37], [x, 0.79, z], materials.gold);
  }
  // Contacts use the final inclined frame, so the ring rests on both saddles without gaps.
  for (const [index, angle] of [Math.PI * 1.26, Math.PI * 1.74].entries()) {
    const contact = ringPoint(angle, 1.205);
    const base = new THREE.Vector3(contact.x, 0.40, contact.z);
    box(first, `GATE_RING_CRADLE_FOOT_${index}`, [0.44, 0.095, 0.45], [base.x, 0.4475, base.z], materials.ivoryShade);
    sweptPier(first, `GATE_LOAD_BEARING_RING_CRADLE_${index}`, [base.clone().setY(0.46), base.clone().setY(contact.y * 0.69 + 0.14), contact], [0.38, 0.25, 0.24], 0.30, materials.ivory);
    const saddle = mesh(first, `GATE_RING_CRADLE_GOLD_SADDLE_${index}`, new THREE.BoxGeometry(0.25, 0.08, 0.27), materials.gold, [contact.x, contact.y, contact.z]);
    saddle.quaternion.copy(ringRotation); saddle.rotateZ(angle - Math.PI / 2);
  }
  // A complete low perimeter makes the arrival platform legible from the reverse side.
  const balustradePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i += 1) {
    const angle = 0.55 + i / 16 * (Math.PI * 2 - 1.10), x = Math.sin(angle) * 1.28, z = Math.cos(angle) * 1.28;
    box(first, `GATE_TERRACE_BALUSTRADE_POST_${i}`, [0.05, 0.18, 0.05], [x, 0.49, z]); balustradePoints.push(new THREE.Vector3(x, 0.59, z));
  }
  tube(first, 'GATE_TERRACE_COMPLETE_CURVED_RAIL', balustradePoints, 0.029, materials.ivory);

  if (level >= 2) {
    const second = phase(2), portal = frame(second, 'GATE_SUPPORTED_INCLINED_FRAME');
    annulus(portal, 'GATE_SOLID_IVORY_ANNULAR_BODY', 1.25, 1.025, 0.22, 0, materials.ivory);
    for (const side of [-1, 1]) {
      annulus(portal, `GATE_SAPPHIRE_RECESSED_FRAME_BAND_${side}`, 1.198, 1.085, 0.018, side * 0.117, materials.sapphire);
      annulus(portal, `GATE_OUTER_GOLD_STRUCTURAL_RIM_${side}`, 1.255, 1.212, 0.038, side * 0.119, materials.gold);
      annulus(portal, `GATE_INNER_GOLD_APERTURE_RIM_${side}`, 1.085, 1.008, 0.060, side * 0.122, materials.gold);
      for (let i = 0; i < 16; i += 1) {
        const angle = i / 16 * Math.PI * 2;
        const key = mesh(portal, `GATE_FRAME_INSET_GOLD_KEY_${side}_${i}`, new THREE.OctahedronGeometry(0.034, 0), materials.gold, [Math.cos(angle) * 1.146, Math.sin(angle) * 1.146, side * 0.139], 3);
        key.scale.set(0.65, 1.50, 0.28); key.rotation.z = angle - Math.PI / 2;
      }
    }
    // External shoulders connect the crystal boots to the ring's lower flanks.
    for (const side of [-1, 1]) {
      const contact = ringPoint(side < 0 ? Math.PI * 1.07 : Math.PI * 1.93, 1.23);
      sweptPier(second, `GATE_TAPERED_OUTER_FRAME_SHOULDER_${side}`, [new THREE.Vector3(side * 1.10, 0.78, 0.34), new THREE.Vector3(side * 1.16, 1.00, 0.18), contact], [0.19, 0.16, 0.11], 0.16, materials.ivory, 3);
    }
  }
  if (level >= 3) {
    const third = phase(3);
    for (const side of [-1, 1]) {
      const x = side * 1.08, z = 0.34;
      // Authored faceted crystal: broad six-sided grounded shaft, asymmetric pointed crown.
      const profile = [new THREE.Vector2(0.14, 0), new THREE.Vector2(0.155, 0.19), new THREE.Vector2(0.13, 0.58), new THREE.Vector2(0.07, 0.78), new THREE.Vector2(0, 0.98)];
      const crystal = mesh(third, `GATE_GROUNDED_SAPPHIRE_CRYSTAL_${side}`, new THREE.LatheGeometry(profile, 6), materials.sapphireLight, [x, 0.81, z], 4); crystal.rotation.y = Math.PI / 6;
      for (const facing of [-1, 1]) sweptPier(third, `GATE_CRYSTAL_IVORY_CLAW_${side}_${facing}`, [new THREE.Vector3(x + facing * 0.12, 0.79, z), new THREE.Vector3(x + facing * 0.18, 1.10, z), new THREE.Vector3(x + facing * 0.11, 1.46, z)], [0.09, 0.065, 0.025], 0.085, materials.ivory, 4);
    }
    const energy = frame(third, 'GATE_CONTAINED_PORTAL_ENERGY');
    const surface = mesh(energy, 'GATE_VIOLET_PORTAL_DEPTH_VOLUME', new THREE.SphereGeometry(1.002, segments, quality === 'low' ? 16 : 24), materials.crystal, [0, 0, 0], 5);
    surface.scale.z = 0.065; surface.castShadow = false;
    const calibration = new THREE.Group(); calibration.name = 'GATE_LOCAL_CALIBRATION_RING_PIVOT'; calibration.userData.celestialMotion = true;
    calibration.userData.celestialSpin = { axis: 'z', speed: 0.06 }; energy.add(calibration);
    for (const side of [-1, 1]) {
      annulus(calibration, `GATE_INNER_CALIBRATION_TRACK_${side}`, 0.995, 0.965, 0.022, side * 0.086, materials.gold, 5);
      for (let i = 0; i < 4; i += 1) {
        const angle = i / 4 * Math.PI * 2;
        mesh(calibration, `GATE_CALIBRATION_INDEX_${side}_${i}`, new THREE.OctahedronGeometry(0.044, 0), materials.gold, [Math.cos(angle) * 0.98, Math.sin(angle) * 0.98, side * 0.094], 5);
      }
    }
  }
  addCelestialV2Finish(root, 'gate', materials);
  return root;
}
