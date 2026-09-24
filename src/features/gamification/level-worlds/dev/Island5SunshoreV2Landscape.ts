import * as THREE from 'three';
import type { Island2WorldMaterials } from './Island2ThreeWorld';
import type { Island3DQuality } from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

const CENTERS = [[-4.36, -3.9], [4.36, -3.9], [-4.36, 3.9], [4.36, 3.9]] as const;

/** Union envelope keeps the existing main island and all four landmark plots. */
export function sunshoreCoastRadius(angle: number) {
  const x = Math.cos(angle), z = Math.sin(angle);
  let radius = 6.18;
  for (const [cx, cz] of CENTERS) {
    const projection = cx * x + cz * z;
    const discriminant = 2.47 ** 2 - (cx * cx + cz * cz - projection ** 2);
    if (discriminant >= 0) radius = Math.max(radius, projection + Math.sqrt(discriminant));
  }
  return radius + Math.sin(angle * 13 + .4) * .12 + Math.sin(angle * 23) * .045;
}

export function createSunshoreCoastSurface(segments: number, rings: readonly (readonly [number, number])[], cap: boolean, radiusAtAngle: (angle: number) => number = sunshoreCoastRadius) {
  const position: number[] = [], uv: number[] = [], indices: number[] = [];
  for (const [scale, y] of rings) for (let i = 0; i <= segments; i++) {
    const a = i / segments * Math.PI * 2, r = radiusAtAngle(a) * scale;
    // Undulating exposed strata break the stacked-disc silhouette; grass stays level.
    const relief = (!cap || y < 0) && y < .27 ? .085 * Math.sin(a * 5 + scale * 11) + .04 * Math.sin(a * 11) : 0;
    position.push(Math.cos(a) * r, y + relief, Math.sin(a) * r);
    uv.push(Math.cos(a) * r * .15, Math.sin(a) * r * .15);
  }
  for (let ring = 0; ring < rings.length - 1; ring++) for (let i = 0; i < segments; i++) {
    const a = ring * (segments + 1) + i, b = a + segments + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  if (cap) {
    const center = position.length / 3; position.push(0, rings[0][1], 0); uv.push(0, 0);
    for (let i = 0; i < segments; i++) indices.push(center, i + 1, i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createSunshoreV2Landscape(m: Island2WorldMaterials, quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'SUNSHORE_V2_LIMESTONE_COAST';
  const segments = quality === 'low' ? 96 : 160;
  const parts: [string, THREE.BufferGeometry, THREE.Material][] = [
    ['SAND_APRON', createSunshoreCoastSurface(segments, [[1, .265], [1.035, -.18], [1.05, -.6]], true), m.sand],
    ['UPPER_LIMESTONE', createSunshoreCoastSurface(segments, [[1.006, .19], [1.02, .07], [1.012, -.05]], false), m.rock],
    ['LOWER_LIMESTONE', createSunshoreCoastSurface(segments, [[1.021, -.12], [1.04, -.3], [1.046, -.48]], false), m.rock],
    ['GRASS_INTERIOR', createSunshoreCoastSurface(segments, [[.88, .295], [.91, .282]], true), m.garden],
  ];
  for (const [name, geometry, material] of parts) {
    const surface = new THREE.Mesh(geometry, material); surface.name = `SUNSHORE_V2_${name}`;
    surface.receiveShadow = true; root.add(surface);
  }
  const rocks = new THREE.Group(); rocks.name = 'SUNSHORE_V2_COASTAL_CRAGS';
  const count = quality === 'low' ? 44 : quality === 'medium' ? 70 : 100;
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2 + .018 * Math.sin(i * 7);
    // Keep the front landing cove open for the dock.
    if (Math.abs(a - Math.PI / 2) < .14 || Math.sin(a * 5 + .4) > .88) continue;
    const r = sunshoreCoastRadius(a) * (.985 + .028 * Math.sin(i * 3.7));
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), i % 5 ? m.rock : m.sand);
    rock.name = `SUNSHORE_V2_CRAG_${i}`;
    rock.position.set(Math.cos(a) * r, -.05 + .12 * Math.sin(i * 2.3), Math.sin(a) * r);
    rock.scale.set(.28 + (i % 4) * .11, .28 + (i % 3) * .13, .26 + (i % 5) * .06);
    rock.rotation.set(i * .14, a, .09 * Math.sin(i)); rock.castShadow = quality !== 'low'; rock.receiveShadow = true;
    if (i % 9 === 0) { rock.scale.multiplyScalar(1.65); rock.position.y += .12; }
    rocks.add(rock);
  }
  compactStaticGeometry(rocks, 'SUNSHORE_V2_CRAGS'); root.add(rocks);
  const paths = new THREE.Group(); paths.name = 'SUNSHORE_LANDMARK_FOOTPATHS';
  for (const [cx, cz] of CENTERS) {
    const r = Math.hypot(cx, cz);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(cx / r * 4.35, .31, cz / r * 4.35),
      new THREE.Vector3(cx - Math.sign(cx) * 1.35, .31, cz + 1.85),
      new THREE.Vector3(cx, .31, cz + 1.48));
    let previousStone: THREE.Vector3 | null = null;
    for (let i = 0; i < 21; i++) {
      const at = curve.getPoint(i / 20);
      // Dressing remains outside the protected circular route.
      if (Math.hypot(at.x, at.z) < 4.35 || (previousStone && previousStone.distanceTo(at) < .64)) continue;
      previousStone = at.clone();
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(.22, .25, .035, 7), i % 3 ? m.sand : m.rock);
      stone.name = 'LANDMARK_STEPPING_STONE'; stone.position.copy(at);
      stone.scale.set(1.3, 1, .85); stone.rotation.y = i * .71; paths.add(stone);
    }
  }
  compactStaticGeometry(paths, 'SUNSHORE_PATHS'); root.add(paths);

  // Submerged reef heads form shallow-water depth cues outside the playable coast.
  const reef = new THREE.Group(); reef.name = 'SUNSHORE_V2_SUBMERGED_REEF';
  const patches = [[-9, 4, 1.5], [9.4, 6, 1.2], [-4.5, 11.6, 1.7], [4, 12.3, 1.1],
    [10.5, -1.4, 1.6], [-10.1, -3.2, 1.1], [6, -9.8, 1.2], [-2.7, -10.4, 1.8]] as const;
  patches.forEach(([cx, cz, spread], patch) => {
    const count = (quality === 'low' ? 5 : 10) + patch % 4;
    for (let i = 0; i < count; i++) {
      const a = i * 2.399 + patch, radius = Math.sqrt(i / count) * spread;
      const x = cx + Math.cos(a) * radius, z = cz + Math.sin(a) * radius * .65;
      if (Math.hypot(x,z) < sunshoreCoastRadius(Math.atan2(z,x)) + .55) continue;
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.22 + (i % 4) * .075, quality === 'low' ? 0 : 1), (i + patch) % 4 ? m.leafDark : m.rock);
      head.name = `SUNSHORE_V2_REEF_PATCH_${patch}_HEAD_${i}`;
      head.position.set(x, -.95 - .07 * Math.sin(i * 1.7), z);
      head.scale.set(1.35,.5 + i % 3 * .08,.85); head.rotation.y=a; reef.add(head);
    }
  });
  compactStaticGeometry(reef, 'SUNSHORE_V2_REEF');root.add(reef);
  root.userData.sculptRuntime = {modelId:'sunshore-v2-coast',clickable:true,explodable:true,sockets:{dock:[0,-.18,6.3]},colliders:[],destructionGroups:[{id:'terrain',breakable:false}]};
  return root;
}
