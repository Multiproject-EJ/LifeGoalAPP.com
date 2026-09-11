import * as THREE from 'three';
import { addCelestialV2Finish } from './Island2CelestialV2Finish';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';
import { createCelestialTree } from './Island2CelestialV2Botany';

type Point = [number, number, number];
interface GlassVolume { id: string; x: number; z: number; radius: number; bottom: number; equator: number; rise: number }

/** Architecture is local +Z arrival; the existing world factory owns rotation. */
export function createCelestialV2Cloudnest(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2CelestialMaterials): THREE.Group {
  const root = new THREE.Group();
  root.name = `ISLAND_2_CLOUDNEST_V2_L${level}`;
  const segments = quality === 'high' ? 36 : quality === 'medium' ? 28 : 20;
  const main: GlassVolume = { id: 'MAIN', x: -0.16, z: -0.20, radius: 1.16, bottom: 0.52, equator: 1.05, rise: 1.20 };
  const annexes: GlassVolume[] = [
    { id: 'EAST_NURSERY', x: 1.10, z: -0.26, radius: 0.54, bottom: 0.52, equator: 0.89, rise: 0.63 },
    { id: 'WEST_NURSERY', x: -1.05, z: 0.54, radius: 0.46, bottom: 0.52, equator: 0.84, rise: 0.53 },
  ];

  function phase(n: number) {
    const group = new THREE.Group();
    group.name = `CLOUDNEST_FUNDED_L${n}`;
    root.add(group);
    return group;
  }
  function mesh(parent: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, at: Point = [0, 0, 0], stage = 2) {
    const result = new THREE.Mesh(geometry, material);
    result.name = name;
    result.position.set(...at);
    result.userData.constructionStage = stage;
    result.castShadow = quality === 'high' && material !== materials.conservatoryGlass;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  }
  function drum(parent: THREE.Group, name: string, radius: number, height: number, at: Point, material: THREE.Material = materials.ivory, stage = 1) {
    return mesh(parent, name, new THREE.CylinderGeometry(radius, radius, height, segments), material, at, stage);
  }
  function tube(parent: THREE.Group, name: string, points: THREE.Vector3[], radius: number, material: THREE.Material = materials.gold, stage = 3) {
    return mesh(parent, name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(8, points.length * 2), radius, quality === 'low' ? 5 : 7, false), material, [0, 0, 0], stage);
  }
  function ring(parent: THREE.Group, name: string, radius: number, y: number, x: number, z: number, thickness = 0.024, material: THREE.Material = materials.gold) {
    const result = mesh(parent, name, new THREE.TorusGeometry(radius, thickness, 6, segments), material, [x, y, z], 3);
    result.rotation.x = Math.PI / 2;
    return result;
  }
  function arch(parent: THREE.Group, name: string, width: number, height: number, depth: number, at: Point, angle = 0, material: THREE.Material = materials.ivory) {
    const frame = new THREE.Shape();
    const half = width / 2, pier = width * 0.17;
    frame.moveTo(-half, 0); frame.lineTo(-half, height); frame.lineTo(half, height); frame.lineTo(half, 0);
    frame.lineTo(half - pier, 0); frame.lineTo(half - pier, height * 0.52);
    frame.quadraticCurveTo(half - pier, height * 0.86, 0, height * 0.90);
    frame.quadraticCurveTo(-half + pier, height * 0.86, -half + pier, height * 0.52);
    frame.lineTo(-half + pier, 0); frame.closePath();
    const result = mesh(parent, name, new THREE.ExtrudeGeometry(frame, { depth, bevelEnabled: false, curveSegments: 8 }), material, at);
    result.rotation.y = angle;
    return result;
  }
  function inside(volume: GlassVolume, p: THREE.Vector3) {
    if (p.y < volume.bottom || p.y > volume.equator + volume.rise) return false;
    const radial = ((p.x - volume.x) ** 2 + (p.z - volume.z) ** 2) / volume.radius ** 2;
    return radial + (p.y <= volume.equator ? 0 : ((p.y - volume.equator) / volume.rise) ** 2) < 0.9999;
  }

  function glassShell(parent: THREE.Group, volume: GlassVolume, clipAgainst?: GlassVolume) {
    const positions: number[] = [], normals: number[] = [];
    function normalAt(p: THREE.Vector3, dome: boolean) {
      return new THREE.Vector3((p.x - volume.x) / volume.radius ** 2,
        dome ? (p.y - volume.equator) / volume.rise ** 2 : 0,
        (p.z - volume.z) / volume.radius ** 2).normalize();
    }
    function triangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, dome: boolean) {
      let polygon = [a, b, c];
      if (clipAgainst) {
        const clipped: THREE.Vector3[] = [];
        for (let i = 0; i < polygon.length; i += 1) {
          const start = polygon[i], end = polygon[(i + 1) % polygon.length];
          const startInside = inside(clipAgainst, start), endInside = inside(clipAgainst, end);
          if (!startInside) clipped.push(start);
          if (startInside !== endInside) {
            let lo = start.clone(), hi = end.clone();
            for (let step = 0; step < 12; step += 1) {
              const middle = lo.clone().lerp(hi, 0.5);
              if (inside(clipAgainst, middle) === startInside) lo = middle;
              else hi = middle;
            }
            clipped.push(lo.clone().lerp(hi, 0.5));
          }
        }
        polygon = clipped;
      }
      for (let i = 1; i < polygon.length - 1; i += 1) {
        const corners = [polygon[0], polygon[i], polygon[i + 1]];
        if (new THREE.Vector3().subVectors(corners[1], corners[0]).cross(new THREE.Vector3().subVectors(corners[2], corners[0])).lengthSq() < 1e-12) continue;
        corners.forEach(p => { positions.push(p.x, p.y, p.z); const n = normalAt(p, dome); normals.push(n.x, n.y, n.z); });
      }
    }
    const point = (angle: number, phi: number) => new THREE.Vector3(volume.x + Math.sin(angle) * Math.cos(phi) * volume.radius,
      volume.equator + Math.sin(phi) * volume.rise, volume.z + Math.cos(angle) * Math.cos(phi) * volume.radius);
    for (let side = 0; side < segments; side += 1) {
      const a = side / segments * Math.PI * 2, b = (side + 1) / segments * Math.PI * 2;
      const lowA = new THREE.Vector3(volume.x + Math.sin(a) * volume.radius, volume.bottom, volume.z + Math.cos(a) * volume.radius);
      const lowB = new THREE.Vector3(volume.x + Math.sin(b) * volume.radius, volume.bottom, volume.z + Math.cos(b) * volume.radius);
      triangle(lowA, lowB, point(b, 0), false); triangle(lowA, point(b, 0), point(a, 0), false);
      const verticalSegments = quality === 'low' ? 8 : 12;
      for (let row = 0; row < verticalSegments; row += 1) {
        const lo = row / verticalSegments * Math.PI / 2, hi = (row + 1) / verticalSegments * Math.PI / 2;
        triangle(point(a, lo), point(b, lo), point(b, hi), true);
        triangle(point(a, lo), point(b, hi), point(a, hi), true);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    mesh(parent, `CLOUDNEST_${volume.id}_CLEAR_GLAZING`, geometry, materials.conservatoryGlass, [0, 0, 0], 3);
  }

  function cage(parent: THREE.Group, volume: GlassVolume, count: number, clipAgainst?: GlassVolume) {
    for (let index = 0; index < count; index += 1) {
      const angle = (index + 0.5) / count * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 16; step += 1) {
        const phi = step / 16 * Math.PI / 2;
        points.push(new THREE.Vector3(volume.x + Math.sin(angle) * Math.cos(phi) * volume.radius,
          volume.equator + Math.sin(phi) * volume.rise, volume.z + Math.cos(angle) * Math.cos(phi) * volume.radius));
      }
      const visible: THREE.Vector3[] = [];
      points.forEach((p, i) => {
        if (clipAgainst && i > 0 && inside(clipAgainst, points[i - 1]) !== inside(clipAgainst, p)) {
          let a = points[i - 1].clone(), b = p.clone();
          const startsInside = inside(clipAgainst, a);
          for (let step = 0; step < 12; step += 1) {
            const middle = a.clone().lerp(b, 0.5);
            if (inside(clipAgainst, middle) === startsInside) a = middle;
            else b = middle;
          }
          visible.push(a.lerp(b, 0.5));
        }
        if (!clipAgainst || !inside(clipAgainst, p)) visible.push(p);
      });
      if (visible.length >= 2) tube(parent, `CLOUDNEST_${volume.id}_MERIDIAN_${index}`, visible, volume.id === 'MAIN' ? 0.020 : 0.017);
      const foot = new THREE.Vector3(volume.x + Math.sin(angle) * volume.radius, volume.bottom, volume.z + Math.cos(angle) * volume.radius);
      const top = new THREE.Vector3(foot.x, volume.equator, foot.z);
      if (volume.id !== 'MAIN' && (!clipAgainst || !inside(clipAgainst, foot))) tube(parent, `CLOUDNEST_${volume.id}_UPRIGHT_${index}`, [foot, top], 0.018);
    }
    ring(parent, `CLOUDNEST_${volume.id}_EQUATOR_RAIL`, volume.radius, volume.equator, volume.x, volume.z, 0.026);
    if (!clipAgainst) {
      for (const [index, phi] of [0.42, 0.87].entries()) ring(parent, `CLOUDNEST_${volume.id}_LATITUDE_${index}`, Math.cos(phi) * volume.radius,
        volume.equator + Math.sin(phi) * volume.rise, volume.x, volume.z, 0.016);
    }
  }

  function nest(parent: THREE.Group, name: string, at: Point, size: number, suspendedFrom?: Point) {
    if (suspendedFrom) tube(parent, `${name}_SUSPENSION`, [new THREE.Vector3(...suspendedFrom), new THREE.Vector3(at[0], at[1] + size * 0.22, at[2])], 0.009, materials.gold, 4);
    for (let i = 0; i < 3; i += 1) ring(parent, `${name}_WOVEN_BOWL_${i}`, size * (0.67 + i * 0.11), at[1] + i * size * 0.14, at[0], at[2], size * 0.10, materials.gold);
    const egg = mesh(parent, `${name}_EGG`, new THREE.SphereGeometry(size * 0.40, quality === 'low' ? 10 : 16, 10), materials.egg,
      [at[0], at[1] + size * 0.47, at[2]], 4);
    egg.scale.y = 1.35;
  }

  const first = phase(1);
  drum(first, 'CLOUDNEST_GARDEN_FOUNDATION', 1.73, 0.12, [0, 0.06, 0], materials.ivoryShade);
  drum(first, 'CLOUDNEST_INNER_ROOT_BED', 1.13, 0.33, [main.x, 0.275, main.z], materials.ivoryShade);
  for (let index = 0; index < 14; index += 1) {
    const angle = (index + 0.5) / 14 * Math.PI * 2;
    arch(first, `CLOUDNEST_CURVED_BASE_ARCADE_${index}`, 0.59, 0.33, 0.11,
      [main.x + Math.sin(angle) * 1.245, 0.13, main.z + Math.cos(angle) * 1.245], angle);
  }
  drum(first, 'CLOUDNEST_CURVED_GARDEN_BALCONY', 1.40, 0.095, [main.x, 0.48, main.z], materials.ivory);
  ring(first, 'CLOUDNEST_GARDEN_BALCONY_LIP', 1.38, 0.535, main.x, main.z, 0.029, materials.ivory);
  for (let i = 0; i < 6; i += 1) {
    const front = 1.76 - i * 0.115, height = 0.068 * (i + 1);
    mesh(first, `CLOUDNEST_ENTRANCE_STEP_${i}`, new THREE.BoxGeometry(0.76, height, front - 0.98), materials.ivory,
      [main.x, 0.12 + height / 2, (front + 0.98) / 2], 1);
  }
  for (const side of [-1, 1]) {
    tube(first, `CLOUDNEST_ENTRANCE_STAIR_RAIL_${side}`, [new THREE.Vector3(main.x + side * 0.42, 0.34, 1.72), new THREE.Vector3(main.x + side * 0.42, 0.72, 1.11)], 0.028, materials.ivory, 2);
  }
  drum(first, 'CLOUDNEST_LIVING_TREE_PLANTER', 0.46, 0.10, [-0.17, 0.57, -0.30], materials.ivoryShade);
  const tree = createCelestialTree({ kind: 'cloud-blossom', seed: 20260912, height: 1.28, spread: 0.45 }, quality, materials);
  tree.name = 'CLOUDNEST_ROOTED_CLOUD_TREE';
  tree.position.set(-0.17, 0.62, -0.30);
  first.add(tree);
  nest(first, 'CLOUDNEST_PRIMARY_CRADLE', [0.16, 0.63, 0.23], 0.23);
  const sockets = tree.userData.branchSockets as Point[];
  for (const [i, socketIndex] of [0, 6].entries()) {
    const anchor = new THREE.Vector3(...sockets[socketIndex]).add(tree.position);
    nest(first, `CLOUDNEST_BRANCH_HANGING_NEST_${i}`, [anchor.x, anchor.y - 0.43, anchor.z], 0.16, [anchor.x, anchor.y, anchor.z]);
  }
  for (let i = 0; i < 12; i += 1) {
    if (i % 3 !== 0) continue;
    const angle = (i + 0.5) / 12 * Math.PI * 2;
    tube(first, `CLOUDNEST_MAIN_UPRIGHT_${i}`, [new THREE.Vector3(main.x + Math.sin(angle) * main.radius, main.bottom, main.z + Math.cos(angle) * main.radius),
      new THREE.Vector3(main.x + Math.sin(angle) * main.radius, main.equator, main.z + Math.cos(angle) * main.radius)], 0.025);
  }

  if (level >= 2) {
    const second = phase(2);
    for (let i = 0; i < 12; i += 1) {
      if (i % 3 === 0) continue;
      const angle = (i + 0.5) / 12 * Math.PI * 2;
      tube(second, `CLOUDNEST_MAIN_UPRIGHT_${i}`, [new THREE.Vector3(main.x + Math.sin(angle) * main.radius, main.bottom, main.z + Math.cos(angle) * main.radius),
        new THREE.Vector3(main.x + Math.sin(angle) * main.radius, main.equator, main.z + Math.cos(angle) * main.radius)], 0.025);
    }
    glassShell(second, main);
    cage(second, main, 12);
    arch(second, 'CLOUDNEST_MAIN_ENTRY_COLLAR', 0.62, 0.62, 0.10, [main.x, 0.53, main.z + main.radius - 0.03], 0, materials.gold);
  }

  if (level >= 3) {
    const third = phase(3);
    for (const annex of annexes) {
      drum(third, `CLOUDNEST_${annex.id}_TERRACE`, annex.radius + 0.10, 0.13, [annex.x, 0.46, annex.z], materials.ivory);
      drum(third, `CLOUDNEST_${annex.id}_SUPPORT`, annex.radius + 0.06, 0.34, [annex.x, 0.27, annex.z], materials.ivoryShade);
      glassShell(third, annex, main);
      cage(third, annex, 8, main);
      nest(third, `CLOUDNEST_${annex.id}_NEST`, [annex.x, 0.60, annex.z], annex.radius * 0.37);
    }
    ring(third, 'CLOUDNEST_ROOF_CROWN_COLLAR', 0.115, 2.26, main.x, main.z, 0.026);
    const crown = mesh(third, 'CLOUDNEST_GOLD_CROWN', new THREE.OctahedronGeometry(0.10), materials.gold, [main.x, 2.40, main.z], 5);
    crown.scale.y = 1.25;
    let railRun: THREE.Vector3[] = [];
    let railRunIndex = 0;
    const finishRail = () => {
      if (railRun.length >= 2) tube(third, `CLOUDNEST_GARDEN_HANDRAIL_${railRunIndex++}`, railRun, 0.025, materials.ivory);
      railRun = [];
    };
    for (let i = 0; i < 18; i += 1) {
      const angle = 0.43 + i / 17 * (Math.PI * 2 - 0.86);
      const x = main.x + Math.sin(angle) * 1.37, z = main.z + Math.cos(angle) * 1.37;
      if (annexes.some(annex => Math.hypot(x - annex.x, z - annex.z) < annex.radius + 0.10)) { finishRail(); continue; }
      tube(third, `CLOUDNEST_GARDEN_BALCONY_POST_${i}`, [new THREE.Vector3(x, 0.53, z), new THREE.Vector3(x, 0.74, z)], 0.023, materials.ivory);
      railRun.push(new THREE.Vector3(x, 0.74, z));
    }
    finishRail();
  }
  addCelestialV2Finish(root, 'cloudnest', materials);
  return root;
}
