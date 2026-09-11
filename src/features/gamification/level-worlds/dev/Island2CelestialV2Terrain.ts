import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';


/** Parent-owned meadow boundary used by attached gardens and water outlets. */
export const celestialMeadowContour = (angle: number, seed: number) => 1 + .043 * Math.sin(angle * 3 + seed)
  + .032 * Math.cos(angle * 7 - seed * 1.7) + .018 * Math.sin(angle * 13 + seed * 2.1);
export function resolveCelestialMeadowEdge(radius: number, seed: number, angle: number, inset = 0, topY = .36) {
  const r = radius * celestialMeadowContour(angle, seed) - inset;
  return new THREE.Vector3(Math.cos(angle) * r, topY, Math.sin(angle) * r * (radius > 5 ? .89 : .93));
}

/** Continuous fractured strata; every cap edge shares its cliff attachment. */
export function createCelestialSkyRoot(
  radius: number, depth: number, seed: number, quality: Island3DQuality,
  materials: Island2CelestialMaterials, topY = 0.36,
) {
  const root = new THREE.Group();
  root.name = radius > 5 ? 'ISLAND_2_MAIN_SKY_ROOT' : 'ISLAND_2_LANDMARK_SKY_ROOT';
  root.userData.skyRootTop = topY;
  const count = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;
  const zRatio = radius > 5 ? .89 : .93;
  const contour = (angle: number) => celestialMeadowContour(angle, seed);
  // Family 2 builds a volume from interlocking polygonal cliff columns.
  // Their independent shoulders, fissures and broken ends survive every view;
  // no angular sheet runs directly from the full cap to a common needle tip.
  const resolution = quality === 'high' ? (radius > 5 ? 46 : radius > 1.5 ? 36 : 26)
    : quality === 'medium' ? (radius > 5 ? 36 : 28) : 24;
  const marching = new MarchingCubes(resolution, materials.cliff, false, false, 30000);
  marching.isolation = 0;
  const halfX = radius * 1.42, halfZ = radius * zRatio * 1.42;
  const halfY = depth * .62 + .4, centreY = topY - depth * .5;
  const outerCount = radius > 5 ? 4 : radius > 1.5 ? 2 : 1;
  const columns = Array.from({ length: outerCount + 1 }, (_, i) => {
    const angle = (i - 1) / outerCount * Math.PI * 2 + seed * .73;
    const spread = i === 0 ? 0 : radius * (.43 + .035 * Math.sin(seed + i));
    const width = radius * (i === 0 ? (radius < 1.5 ? .78 : .57) : .43 + .065 * Math.sin(i * 1.7 + seed));
    const columnDepth = depth * (i === 0 ? .92 : .67 + .27 * (.5 + .5 * Math.sin(i * 2.13 + seed)));
    const sides = 5 + i % 3;
    return { x: Math.cos(angle) * spread, z: Math.sin(angle) * spread * zRatio,
      width, depth: columnDepth, phase: seed + i * 1.9,
      planes: Array.from({ length: sides }, (_, face) => {
        const a = face / sides * Math.PI * 2 + seed * .29 + i * .36;
        return { x: Math.cos(a), z: Math.sin(a), breadth: .9 + .14 * Math.sin(face * 2.7 + i + seed) };
      }),
    };
  });
  const widthAt = (t: number, phase: number) => {
    // Each face crosses a different oblique fault. Broad vertical masses
    // alternate with short inward fractures instead of concentric tiers.
    const shoulder = .33 + .10 * Math.sin(phase);
    const knee = .73 + .09 * Math.cos(phase * 1.4);
    if (t < shoulder) return 1 - .12 * t / shoulder;
    if (t < shoulder + .14) return THREE.MathUtils.lerp(.88, .69, (t - shoulder) / .14);
    if (t < knee) return THREE.MathUtils.lerp(.69, .64, (t - shoulder - .14) / Math.max(.05, knee - shoulder - .14));
    return Math.max(.19, THREE.MathUtils.lerp(.64, .23 + .075 * Math.sin(phase), (t - knee) / (1 - knee)));
  };
  for (let iz = 0; iz < resolution; iz++) {
    const z = (iz / resolution * 2 - 1) * halfZ;
    for (let iy = 0; iy < resolution; iy++) {
      const y = (iy / resolution * 2 - 1) * halfY + centreY;
      const belowCap = topY - y;
      for (let ix = 0; ix < resolution; ix++) {
        const x = (ix / resolution * 2 - 1) * halfX;
        const angle = Math.atan2(z / zRatio, x);
        const radial = Math.hypot(x, z / zRatio);
        const shoulderDepth = depth * (.36 + .055 * Math.sin(angle * 3 + seed));
        const shoulderT = THREE.MathUtils.clamp(belowCap / shoulderDepth, 0, 1);
        const shoulderWidth = radius * contour(angle) * (1 - .23 * shoulderT)
          - radius * .055 * Math.sin(angle * 5 + seed) * shoulderT;
        // Continuous full-width shoulders support the meadow, then break into
        // the offset columns below; there is no projecting cylindrical plate.
        let inside = Math.min(shoulderWidth - radial,
          belowCap - .055, shoulderDepth - belowCap);
        for (const column of columns) {
          const t = belowCap / column.depth;
          if (t < -.04 || t > 1.18) continue;
          const lateral = Math.sin(Math.max(0, t) * Math.PI * .85);
          const dx = x - column.x - radius * .105 * lateral * Math.sin(column.phase);
          const dz = z - column.z - radius * .085 * lateral * Math.cos(column.phase);
          let section = Infinity;
          for (const plane of column.planes) {
            const obliqueT = Math.max(0, t + .13 * (dx * plane.z - dz * plane.x) / column.width);
            const facePhase = column.phase + .9 * plane.x + .7 * plane.z;
            const width = column.width * widthAt(obliqueT, facePhase);
            section = Math.min(section, width * plane.breadth - dx * plane.x - dz * plane.z);
          }
          // A sloping fracture cuts the terminal face while neighbouring
          // columns continue lower. These are substantial cliffs, not cones.
          const brokenEnd = column.depth - belowCap + dx * .32 * Math.sin(column.phase) + dz * .28 * Math.cos(column.phase);
          const rock = Math.min(section, brokenEnd, belowCap - .055);
          inside = Math.max(inside, rock);
        }
        marching.field[iz * resolution * resolution + iy * resolution + ix] = inside;
      }
    }
  }
  marching.update();
  if (marching.count <= 0 || marching.count >= 90000) throw new Error('Celestial cliff extraction exceeded its geometry budget');
  const rockGeometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(marching.count * 3);
  const uv = new Float32Array(marching.count * 2);
  for (let i = 0; i < marching.count; i++) {
    const x = marching.positionArray[i * 3] * halfX;
    const y = marching.positionArray[i * 3 + 1] * halfY + centreY;
    const z = marching.positionArray[i * 3 + 2] * halfZ;
    vertices.set([x, y, z], i * 3); uv.set([x / radius, y / depth], i * 2);
  }
  rockGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  rockGeometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  rockGeometry.computeVertexNormals();
  marching.geometry.dispose();
  const rock = new THREE.Mesh(rockGeometry, materials.cliff);
  rock.name = 'CELESTIAL_V2_INTERLOCKING_CLIFF_VOLUME';
  rock.castShadow = quality === 'high'; rock.receiveShadow = true;
  root.add(rock);
  const position: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2, r = radius * contour(a);
    position.push(Math.cos(a) * r, topY - .055, Math.sin(a) * r * zRatio);
  }

  const capPositions = [0, topY, 0];
  const capIndices: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2, r = radius * contour(a);
    capPositions.push(Math.cos(a) * r, topY, Math.sin(a) * r * zRatio);
  }
  for (let i = 0; i < count; i++) capPositions.push(position[i * 3], position[i * 3 + 1], position[i * 3 + 2]);
  for (let i = 0; i < count; i++) {
    const a = 1 + i, b = 1 + (i + 1) % count;
    capIndices.push(0, b, a, a, b, a + count, b, b + count, a + count);
  }
  const capGeometry = new THREE.BufferGeometry();
  capGeometry.setAttribute('position', new THREE.Float32BufferAttribute(capPositions, 3));
  capGeometry.setIndex(capIndices); capGeometry.computeVertexNormals();
  const cap = new THREE.Mesh(capGeometry, materials.grass);
  cap.name = 'CELESTIAL_V2_ATTACHED_MEADOW_CAP'; cap.receiveShadow = true;
  root.add(cap);
  return root;
}
