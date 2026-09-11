import * as THREE from 'three';
import { addCelestialV2Finish } from './Island2CelestialV2Finish';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';

type Point = [number, number, number];

/** Open practice court. The world owns its existing board-facing placement. */
export function createCelestialV2ResolveCourt(
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  materials: Island2CelestialMaterials,
): THREE.Group {
  const root = new THREE.Group();
  root.name = `ISLAND_2_RESOLVE_COURT_V2_L${level}`;
  const segments = quality === 'high' ? 36 : quality === 'medium' ? 28 : 20;
  function phase(value: number) {
    const group = new THREE.Group();
    group.name = `RESOLVE_FUNDED_L${value}`;
    root.add(group);
    return group;
  }
  function mesh(parent: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, at: Point = [0, 0, 0], stage = 2) {
    const item = new THREE.Mesh(geometry, material);
    item.name = name;
    item.position.set(...at);
    item.userData.constructionStage = stage;
    item.castShadow = quality === 'high';
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function drum(parent: THREE.Group, name: string, radius: number, height: number, at: Point, material: THREE.Material = materials.ivory, stage = 1) {
    return mesh(parent, name, new THREE.CylinderGeometry(radius, radius, height, segments), material, at, stage);
  }
  function tube(parent: THREE.Group, name: string, points: THREE.Vector3[], radius: number, material: THREE.Material = materials.gold, stage = 3) {
    return mesh(parent, name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), quality === 'low' ? 12 : 20, radius, quality === 'low' ? 5 : 7, false), material, [0, 0, 0], stage);
  }
  function torus(parent: THREE.Group, name: string, radius: number, thickness: number, at: Point, stage = 3) {
    return mesh(parent, name, new THREE.TorusGeometry(radius, thickness, quality === 'low' ? 6 : 8, segments), materials.gold, at, stage);
  }
  function arcade(parent: THREE.Group, name: string, width: number, height: number, at: Point, angle: number) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0); shape.lineTo(-width / 2, height); shape.lineTo(width / 2, height); shape.lineTo(width / 2, 0);
    shape.lineTo(width * 0.32, 0); shape.lineTo(width * 0.32, height * 0.52);
    shape.quadraticCurveTo(width * 0.32, height * 0.87, 0, height * 0.90);
    shape.quadraticCurveTo(-width * 0.32, height * 0.87, -width * 0.32, height * 0.52);
    shape.lineTo(-width * 0.32, 0); shape.closePath();
    const item = mesh(parent, name, new THREE.ExtrudeGeometry(shape, { depth: 0.11, bevelEnabled: false, curveSegments: 7 }), materials.ivory, at, 1);
    item.rotation.y = angle;
  }

  // A sculpted blade is a closed volume swept along an authored curved spine.
  // Cross-sections have true front/rear thickness and rounded edge transitions.
  function featherGeometry(curve: THREE.CubicBezierCurve3, halfWidth: number, halfDepth: number) {
    const rows = quality === 'high' ? 16 : quality === 'medium' ? 12 : 9;
    const sides = quality === 'low' ? 6 : 8;
    const position: number[] = [], index: number[] = [];
    for (let row = 0; row <= rows; row += 1) {
      const t = row / rows;
      const center = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const sideways = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
      const swell = Math.max(0.025, Math.pow(Math.sin(Math.PI * t), 0.64));
      const width = halfWidth * (0.30 + 0.70 * swell) * (1 - Math.pow(t, 7)) + 0.001;
      const depth = halfDepth * (0.42 + 0.58 * swell) * (1 - Math.pow(t, 8)) + 0.001;
      for (let side = 0; side < sides; side += 1) {
        const angle = side / sides * Math.PI * 2;
        position.push(center.x + sideways.x * Math.cos(angle) * width,
          center.y + sideways.y * Math.cos(angle) * width,
          center.z + Math.sin(angle) * depth);
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let side = 0; side < sides; side += 1) {
        const a = row * sides + side, b = row * sides + (side + 1) % sides;
        const c = (row + 1) * sides + (side + 1) % sides, d = (row + 1) * sides + side;
        index.push(a, b, c, a, c, d);
      }
    }
    for (let side = 1; side < sides - 1; side += 1) {
      index.push(0, side + 1, side);
      const cap = rows * sides;
      index.push(cap, cap + side, cap + side + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    return geometry;
  }

  const footings = [
    { id: 'WEST_REAR', x: -0.88, z: -0.70, heightScale: 1.20 },
    { id: 'EAST_REAR', x: 0.88, z: -0.70, heightScale: 1.14 },
    { id: 'WEST_FRONT', x: -0.92, z: 0.60, heightScale: 1.00 },
    { id: 'EAST_FRONT', x: 0.92, z: 0.60, heightScale: 1.04 },
  ];

  function wingPylon(parent: THREE.Group, footing: typeof footings[number]) {
    const group = new THREE.Group();
    group.name = `RESOLVE_${footing.id}_SCULPTED_WING`;
    group.position.set(footing.x, 0.54, footing.z);
    group.rotation.y = Math.atan2(-footing.z, footing.x);
    parent.add(group);
    const height = footing.heightScale;
    // The architectural standard and the wing are different masses. The first
    // blockout made all seven feathers rise from the ground, hiding their fan
    // behind the longest blade and producing a two-pronged tusk silhouette.
    const pier = new THREE.Shape();
    pier.moveTo(-0.125, -0.015); pier.lineTo(0.125, -0.015);
    pier.lineTo(0.11, 1.20 * height); pier.lineTo(0, 1.44 * height);
    pier.lineTo(-0.11, 1.20 * height); pier.closePath();
    mesh(group, `${group.name}_ARCHITECTURAL_PIER`, new THREE.ExtrudeGeometry(pier, {
      depth: 0.22, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.012, bevelThickness: 0.012,
    }), materials.ivory, [0, 0, -0.11], 2);
    mesh(group, `${group.name}_PIER_CAPITAL`, new THREE.BoxGeometry(0.285, 0.07, 0.25), materials.gold,
      [0, 1.12 * height, 0], 2);

    // A continuous upper wing web embeds into the pier and carries the outer
    // primaries. Both faces have the same real feather thickness and relief.
    const web = new THREE.Shape();
    web.moveTo(0.06, 0.73 * height);
    web.bezierCurveTo(0.27, 0.83 * height, 0.45, 1.00 * height, 0.49, 1.25 * height);
    web.bezierCurveTo(0.53, 1.49 * height, 0.48, 1.68 * height, 0.42, 1.79 * height);
    web.bezierCurveTo(0.20, 1.61 * height, 0.10, 1.22 * height, 0.06, 0.73 * height);
    web.closePath();
    mesh(group, `${group.name}_ATTACHED_WING_WEB`, new THREE.ExtrudeGeometry(web, {
      depth: 0.082, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.016, bevelThickness: 0.012, curveSegments: quality === 'low' ? 8 : 12,
    }), materials.ivory, [0, 0, -0.041], 3);
    const primaryTips: Array<[number, number]> = [
      [0.58, 1.04], [0.63, 1.18], [0.65, 1.33], [0.645, 1.48],
      [0.61, 1.63], [0.55, 1.79], [0.43, 1.92],
    ];
    primaryTips.forEach(([tipX, relativeTipY], i) => {
      const startX = 0.075 + i * 0.023;
      const startY = (0.76 + i * 0.074) * height;
      const tipY = relativeTipY * height;
      const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(startX, startY, 0),
        new THREE.Vector3(startX + (tipX - startX) * 0.23, startY + (tipY - startY) * 0.49, 0.012),
        new THREE.Vector3(tipX - 0.075, tipY - 0.075 * height, 0.005), new THREE.Vector3(tipX, tipY, 0));
      mesh(group, `${group.name}_THICK_FEATHER_${i}`, featherGeometry(curve, 0.061 + i * 0.002, 0.061), materials.ivory, [0, 0, 0], 3);
    });
    const collar = drum(group, `${group.name}_GOLD_ROOT_COLLAR`, 0.16, 0.11, [0, 0.10, 0], materials.gold, 2);
    collar.scale.z = 0.85;
    // Recessed sapphire faces continue on both sides of each stone standard.
    for (const side of [-1, 1]) {
      mesh(group, `${group.name}_SAPPHIRE_INSET_${side}`, new THREE.BoxGeometry(0.070, 0.69 * height, 0.016), materials.sapphire,
        [0, 0.63 * height, side * 0.123], 4);
    }
  }

  const first = phase(1);
  drum(first, 'RESOLVE_LOWER_FOUNDATION', 1.58, 0.12, [0, 0.06, 0], materials.ivoryShade);
  drum(first, 'RESOLVE_COURT_INNER_SUPPORT', 1.19, 0.29, [0, 0.275, 0], materials.ivoryShade);
  for (let i = 0; i < 14; i += 1) {
    const angle = (i + 0.5) / 14 * Math.PI * 2;
    arcade(first, `RESOLVE_TERRACE_ARCADE_${i}`, 0.60, 0.32, [Math.sin(angle) * 1.32, 0.13, Math.cos(angle) * 1.32], angle);
  }
  drum(first, 'RESOLVE_IVORY_TERRACE', 1.51, 0.11, [0, 0.485, 0]);
  // A walkable stone inlay needs a broad, subdued highlight; the roof's
  // clear coat otherwise washes its blue identity white at the rear survey.
  const practiceFloor = materials.sapphire.clone();
  practiceFloor.name = 'RESOLVE_SAPPHIRE_STONE_INLAY';
  practiceFloor.roughness = .72; practiceFloor.clearcoat = 0;
  drum(first, 'RESOLVE_OPEN_SAPPHIRE_PRACTICE_FLOOR', 1.15, 0.034, [0, 0.557, 0], practiceFloor, 2);
  const rim = torus(first, 'RESOLVE_PRACTICE_FLOOR_GOLD_RIM', 1.13, 0.018, [0, 0.578, 0], 2);
  rim.rotation.x = Math.PI / 2;
  const center = torus(first, 'RESOLVE_COMPASS_CENTRE', 0.21, 0.011, [0, 0.582, 0], 2);
  center.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i += 1) {
    const angle = i / 8 * Math.PI * 2;
    const line = mesh(first, `RESOLVE_FLOOR_RADIAL_INLAY_${i}`, new THREE.BoxGeometry(i % 2 ? 0.013 : 0.023, 0.008, i % 2 ? 0.64 : 0.78), materials.gold,
      [Math.sin(angle) * 0.61, 0.584, Math.cos(angle) * 0.61], 2);
    line.rotation.y = angle;
  }
  for (let i = 0; i < 7; i += 1) {
    const front = 1.77 - i * 0.104, height = 0.059 * (i + 1);
    mesh(first, `RESOLVE_ARRIVAL_STEP_${i}`, new THREE.BoxGeometry(0.79, height, front - 1.02), materials.ivory,
      [0, 0.12 + height / 2, (front + 1.02) / 2], 1);
  }
  for (const side of [-1, 1]) tube(first, `RESOLVE_ARRIVAL_RAIL_${side}`, [new THREE.Vector3(side * 0.43, 0.36, 1.71), new THREE.Vector3(side * 0.43, 0.73, 1.13)], 0.027, materials.ivory, 2);
  for (const footing of footings) {
    drum(first, `RESOLVE_${footing.id}_PERMANENT_FOOTING`, 0.23, 0.12, [footing.x, 0.535, footing.z], materials.ivoryShade);
  }

  if (level >= 2) {
    const second = phase(2);
    wingPylon(second, footings[0]);
    wingPylon(second, footings[1]);
    // Fixed yoke bearings carry the outer frame; only its inner instruments
    // rotate, preserving real contacts throughout the animation.
    for (const side of [-1, 1]) {
      tube(second, `RESOLVE_ORRERY_BEARING_ARM_${side}`, [new THREE.Vector3(side * 0.88, 1.83, -0.70),
        new THREE.Vector3(side * 0.98, 1.93, -0.38), new THREE.Vector3(side * 0.91, 2.02, -0.05)], 0.034);
      mesh(second, `RESOLVE_ORRERY_BEARING_${side}`, new THREE.SphereGeometry(0.065, 12, 8), materials.gold, [side * 0.91, 2.02, -0.05], 3);
    }
    const outer = torus(second, 'RESOLVE_SUPPORTED_OUTER_ASTRONOMICAL_FRAME', 0.91, 0.032, [0, 2.02, -0.05]);
    outer.rotation.x = Math.PI / 2;
  }

  if (level >= 3) {
    const third = phase(3);
    wingPylon(third, footings[2]);
    wingPylon(third, footings[3]);
    const rotating = new THREE.Group();
    rotating.name = 'RESOLVE_INNER_ARMILLARY_PIVOT';
    rotating.position.set(0, 2.02, -0.05);
    rotating.rotation.z = 0.28;
    rotating.userData.celestialMotion = true;
    rotating.userData.celestialSpin = { axis: 'y', speed: 0.10 };
    rotating.userData.constructionStage = 4;
    third.add(rotating);
    torus(rotating, 'RESOLVE_ROTATING_MERIDIAN', 0.51, 0.021, [0, 0, 0], 4);
    const cross = torus(rotating, 'RESOLVE_ROTATING_CROSS_MERIDIAN', 0.43, 0.018, [0, 0, 0], 4);
    cross.rotation.y = Math.PI / 2;
    mesh(rotating, 'RESOLVE_WHITE_CELESTIAL_SPHERE', new THREE.SphereGeometry(0.16, quality === 'low' ? 12 : 20, 12), materials.egg, [0, 0, 0], 4);
    const axle = mesh(rotating, 'RESOLVE_ARMILLARY_CONTINUOUS_AXLE', new THREE.CylinderGeometry(0.013, 0.013, 1.05, 8), materials.gold, [0, 0, 0], 4);
    axle.rotation.z = 0;
    const spindleTop = new THREE.Vector3(-Math.sin(0.28) * 0.525, 2.02 + Math.cos(0.28) * 0.525, -0.05);
    tube(third, 'RESOLVE_ARMILLARY_SUSPENSION_YOKE', [new THREE.Vector3(0, 2.02, -0.96), new THREE.Vector3(0, 2.37, -0.58), spindleTop], 0.022, materials.gold, 4);
    mesh(third, 'RESOLVE_ARMILLARY_FIXED_SPINDLE_BEARING', new THREE.SphereGeometry(0.034, 10, 8), materials.gold, [spindleTop.x, spindleTop.y, spindleTop.z], 4);
    const orbit = new THREE.Group();
    orbit.name = 'RESOLVE_SMALL_PLANET_ORBIT';
    orbit.position.set(0, 2.02, -0.05);
    orbit.userData.celestialMotion = true;
    orbit.userData.celestialSpin = { axis: 'y', speed: -0.14 };
    third.add(orbit);
    const orbitalRing = torus(orbit, 'RESOLVE_PLANET_GUIDE_RING', 0.72, 0.015, [0, 0, 0], 4);
    orbitalRing.rotation.x = Math.PI / 2;
    mesh(orbit, 'RESOLVE_GUIDED_PLANET', new THREE.SphereGeometry(0.054, 10, 8), materials.gold, [0.72, 0, 0], 4);
    for (let i = 0; i < 3; i += 1) {
      const angle = i / 3 * Math.PI * 2;
      const inner = new THREE.Vector3(Math.sin(angle) * 0.72, 0, Math.cos(angle) * 0.72);
      const outer = new THREE.Vector3(Math.sin(angle) * 0.89, 0, Math.cos(angle) * 0.89);
      tube(orbit, `RESOLVE_ORBIT_GUIDE_SPOKE_${i}`, [inner, outer], 0.011, materials.gold, 4);
      mesh(orbit, `RESOLVE_ORBIT_TRACK_ROLLER_${i}`, new THREE.SphereGeometry(0.023, 8, 6), materials.gold, [outer.x, outer.y, outer.z], 4);
    }
  }
  addCelestialV2Finish(root, 'court', materials);
  return root;
}
