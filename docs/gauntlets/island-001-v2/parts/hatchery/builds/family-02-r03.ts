import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import { part, solid, disc, tube, createV2Palette, finishPart } from './Island1V2Kit';
import { terraceVolume, nurseryArcade, windingStair, enclosedPetal } from './Island1V2HatcheryGeometry';

/** Family02: joined nursery arcades and terraced courts, beneath seven enclosed lotus petals. */
export function createIsland1V2Hatchery(level: 1 | 2 | 3, quality: Island3DQuality, preview = false) {
  const root = new THREE.Group();
  root.name = 'ISLAND_001_V2_LOTUS_HATCHERY';
  const palette = createV2Palette();
  const segments = quality === 'low' ? 18 : 30;
  const terraces = part(root, 'hatchery-terraces', 1);
  const wings = part(root, 'hatchery-wings', 2);
  const conservatory = part(root, 'hatchery-conservatory', 3);
  const eggGroup = part(root, 'hatchery-egg', 4);
  const lowerCourt = [
    [-1.37, -0.55], [-1.14, -1.03], [-0.34, -1.12], [0.67, -1.08],
    [1.24, -0.83], [1.48, -0.19], [1.36, 0.57], [0.96, 1.13],
    [0.34, 1.28], [-0.54, 1.21], [-1.16, 0.83], [-1.47, 0.2],
  ] as const;
  terraceVolume(terraces, 'HATCHERY_CONNECTED_LIMESTONE_FOUNDATION', lowerCourt, 0.035, 0.235, palette.shade);
  terraceVolume(terraces, 'HATCHERY_LOWER_COURT_SURFACE', lowerCourt, 0.21, 0.26, palette.stone);

  // One irregular raised court, joined laterally to the low nursery roof; no radial plinth stack.
  const upperCourt = [
    [-0.68, -0.82], [0.51, -0.84], [0.78, -0.45], [0.77, 0.22],
    [0.45, 0.46], [-0.18, 0.53], [-0.67, 0.34], [-0.82, -0.21],
  ] as const;
  terraceVolume(terraces, 'HATCHERY_UPPER_COURT_RETAINING_MASS', upperCourt, 0.225, 1.035, palette.stone, 0.2);
  terraceVolume(terraces, 'HATCHERY_CONTINUOUS_EGG_COURT', upperCourt, 1.025, 1.075, palette.trim, 0.2);
  const middleBasin = [[-0.22, 0.38], [0.56, 0.36], [0.88, 0.58], [0.72, 0.77], [0.06, 0.79], [-0.32, 0.63]] as const;
  const lowerBasin = [[-0.31, 0.72], [0.43, 0.73], [0.57, 0.93], [0.25, 1.1], [-0.31, 1.08], [-0.45, 0.9]] as const;
  terraceVolume(terraces, 'HATCHERY_CASCADE_MIDDLE_RETAINING_BASIN', middleBasin, 0.225, 0.775, palette.stone);
  terraceVolume(terraces, 'HATCHERY_CASCADE_LOWER_RETAINING_BASIN', lowerBasin, 0.225, 0.455, palette.stone);
  terraceVolume(terraces, 'HATCHERY_MIDDLE_WATER_VOLUME', [[-0.14, 0.47], [0.52, 0.45], [0.73, 0.59], [0.61, 0.7], [0.08, 0.7], [-0.2, 0.59]], 0.776, 0.794, palette.water);
  terraceVolume(terraces, 'HATCHERY_LOWER_WATER_VOLUME', [[-0.26, 0.81], [0.36, 0.81], [0.45, 0.91], [0.2, 1.02], [-0.26, 1.0], [-0.35, 0.9]], 0.456, 0.474, palette.water);
  // Flat, volumetric macro water sheets locate the cascade without particle/detail dressing.
  const upperFall = solid(terraces, 'HATCHERY_UPPER_CASCADE', new THREE.BoxGeometry(0.48, 0.29, 0.024), palette.water, [0.24, 0.925, 0.469]);
  upperFall.rotation.y = -0.06;
  solid(terraces, 'HATCHERY_LOWER_CASCADE', new THREE.BoxGeometry(0.4, 0.32, 0.026), palette.water, [0.13, 0.631, 0.748]);

  windingStair(terraces, 'HATCHERY_WEST_WINDING_STAIR',
    [[-0.62, 1.1], [-0.68, 0.82], [-0.74, 0.53], [-0.92, 0.33], [-1.01, 0.135]],
    0.26, 1.075, 0.34, palette.trim, 18);
  windingStair(terraces, 'HATCHERY_EAST_WINDING_STAIR',
    [[1.13, 0.68], [1.25, 0.43], [1.27, 0.16], [1.1, -0.06], [0.9, -0.265]],
    0.26, 1.075, 0.32, palette.trim, 18);

  const west = part(wings, 'HATCHERY_WEST_NURSERY', 2);
  west.userData.buildLevel = 1;
  const westFootprint = [[-1.36, -0.55], [-1.13, -0.86], [-0.45, -0.85], [-0.43, 0.18], [-1.29, 0.21], [-1.42, 0.02]] as const;
  terraceVolume(west, 'WEST_NURSERY_FLOOR', westFootprint, 0.23, 0.29, palette.trim);
  nurseryArcade(west, 'WEST_NURSERY_BROAD_FRONT_ARCADE', 0.88, 0.715, 2, [-0.87, 0.285, 0.17], 0, palette.stone, 0.035);
  nurseryArcade(west, 'WEST_NURSERY_SIDE_ARCADE', 0.68, 0.715, 2, [-1.36, 0.285, -0.2], Math.PI / 2, palette.stone, 0.025);
  nurseryArcade(west, 'WEST_NURSERY_REAR_ARCADE', 0.7, 0.715, 2, [-0.79, 0.285, -0.805], Math.PI, palette.stone, 0.018);
  nurseryArcade(west, 'WEST_NURSERY_INNER_ARCADE', 0.99, 0.715, 2, [-0.46, 0.285, -0.315], -Math.PI / 2, palette.stone);
  // Chamfered rear corner and front corner connect the long walls into one credible shell.
  nurseryArcade(west, 'WEST_NURSERY_REAR_CORNER', 0.39, 0.715, 1, [-1.245, 0.285, -0.655], Math.PI * 0.295, palette.stone);
  nurseryArcade(west, 'WEST_NURSERY_FRONT_CORNER', 0.2, 0.715, 1, [-1.33, 0.285, 0.11], -Math.PI * 0.36, palette.stone);
  terraceVolume(west, 'WEST_NURSERY_CONTINUOUS_ROOF_TERRACE', westFootprint, 0.985, 1.075, palette.trim);

  // This is the second funded-level extension; the existing court, stair and west wing are unchanged.
  if (level >= 2) {
    const east = part(wings, 'HATCHERY_EAST_UPPER_NURSERY', 2);
    east.userData.buildLevel = 2;
    const eastFootprint = [[0.47, -0.89], [1.08, -0.94], [1.29, -0.7], [1.24, -0.28], [0.57, -0.245], [0.42, -0.52]] as const;
    terraceVolume(east, 'EAST_NURSERY_RETAINING_TERRACE', eastFootprint, 0.235, 1.08, palette.stone);
    nurseryArcade(east, 'EAST_NURSERY_FRONT_DOUBLE_ARCADE', 0.7, 0.61, 2, [0.9, 1.072, -0.27], 0.045, palette.stone, 0.025);
    nurseryArcade(east, 'EAST_NURSERY_SIDE_ARCADE', 0.44, 0.61, 1, [1.22, 1.072, -0.535], -Math.PI / 2, palette.stone, 0.022);
    nurseryArcade(east, 'EAST_NURSERY_REAR_ARCADE', 0.59, 0.61, 2, [0.785, 1.072, -0.9], Math.PI, palette.stone);
    nurseryArcade(east, 'EAST_NURSERY_INNER_ARCADE', 0.57, 0.61, 1, [0.49, 1.072, -0.59], Math.PI / 2, palette.stone);
    nurseryArcade(east, 'EAST_NURSERY_REAR_CORNER', 0.3, 0.61, 1, [1.145, 1.072, -0.785], -Math.PI / 4, palette.stone);
    terraceVolume(east, 'EAST_NURSERY_ROOF_TERRACE', eastFootprint, 1.657, 1.738, palette.trim);
    finishPart(east, preview);
  }

  const glass = palette.glass.clone();
  glass.color.setHex(0x72c8e7);
  glass.opacity = 0.42;
  // Paired surface topology remains visible even when the clay harness uses FrontSide override.
  glass.side = THREE.FrontSide;
  glass.depthWrite = false;
  for (let petal = 1; petal <= 7; petal++) {
    if (level === 1 && ![2, 4, 6].includes(petal)) continue;
    const theta = petal / 8 * Math.PI * 2;
    const height = 1.545 + 0.39 * (1 - Math.cos(theta)) * 0.5;
    const envelope = enclosedPetal(theta, height, segments);
    const mesh = solid(conservatory, `LOTUS_CLOSED_GLASS_PETAL_${petal}`, envelope.geometry, glass);
    mesh.userData.buildLevel = [2, 4, 6].includes(petal) ? 1 : 2;
    mesh.userData.explodeWithParent = true;
    for (const side of [-1, 1]) {
      const points = Array.from({ length: segments + 1 }, (_, i) => envelope.sample(i / segments, side, 0.004));
      const rib = tube(conservatory, `LOTUS_PETAL_${petal}_EDGE_${side}`, points, 0.014, palette.gold, segments);
      rib.userData.buildLevel = mesh.userData.buildLevel;
    }
  }

  disc(eggGroup, 'EGG_LOW_OVAL_CRADLE', 0.27, 0.095, [0, 1.116, -0.13], palette.gold, segments);
  const eggGeometry = new THREE.LatheGeometry(Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return new THREE.Vector2(0.248 * Math.sin(Math.PI * t) * (1.1 - 0.32 * t), t * 0.77);
  }), segments);
  const eggMaterial = new THREE.MeshPhysicalMaterial({ color: 0xe7eedb, roughness: 0.2, metalness: 0.1, clearcoat: 0.6 });
  solid(eggGroup, 'SHELTERED_LUMINOUS_EGG', eggGeometry, eggMaterial, [0, 1.163, -0.13]);

  root.userData.v2Family = 'lotus-conservatory';
  root.userData.constructionFamily = '02-connected-terrace-arcade';
  root.userData.reference = 'island-001-reimagined-20260910/02-landmark-studies.png';
  root.userData.sockets = { lift: [0.72, 0.15, 1.07], egg: [0, 1.548, -0.13] };
  root.userData.sculptRuntime = {
    parts: ['hatchery-terraces', 'hatchery-wings', 'hatchery-conservatory', 'hatchery-egg'],
    clickable: true, constructionPreview: preview,
  };
  finishPart(west, preview);
  [terraces, conservatory, eggGroup].forEach(group => finishPart(group, preview));
  return root;
}
