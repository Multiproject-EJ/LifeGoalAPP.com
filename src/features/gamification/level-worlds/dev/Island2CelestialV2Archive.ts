import * as THREE from 'three';
import { addCelestialV2Finish } from './Island2CelestialV2Finish';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';

type Point = [number, number, number];

/** Circular inhabited library; world factory preserves its board-facing frame. */
export function createCelestialV2Archive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island2CelestialMaterials): THREE.Group {
  const root = new THREE.Group();
  root.name = `ISLAND_2_SKYBOUND_ARCHIVE_V2_L${level}`;
  const segments = quality === 'high' ? 40 : quality === 'medium' ? 30 : 24;
  const telescopePivot = new THREE.Vector3(-0.22, 2.45, 0.22);
  const telescopeAxis = new THREE.Vector3(-0.69, 0.22, 0.69).normalize();
  const telescopeRight = new THREE.Vector3(telescopeAxis.z, 0, -telescopeAxis.x).normalize();
  const telescopeUp = new THREE.Vector3().crossVectors(telescopeAxis, telescopeRight).normalize();
  const telescopeRotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(telescopeRight, telescopeUp, telescopeAxis));
  const domeRadius = 0.86, domeEquator = 2.20, domeRise = 0.78, portRadius = 0.188;

  function phase(n: number) { const group = new THREE.Group(); group.name = `ARCHIVE_FUNDED_L${n}`; root.add(group); return group; }
  function mesh(parent: THREE.Group, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, at: Point = [0, 0, 0], stage = 2) {
    const item = new THREE.Mesh(geometry, material); item.name = name; item.position.set(...at);
    item.userData.constructionStage = stage; item.castShadow = quality === 'high'; item.receiveShadow = true; parent.add(item); return item;
  }
  function box(parent: THREE.Group, name: string, size: Point, at: Point, material: THREE.Material = materials.ivory, stage = 2) {
    return mesh(parent, name, new THREE.BoxGeometry(...size), material, at, stage);
  }
  function drum(parent: THREE.Group, name: string, radius: number, height: number, at: Point, material: THREE.Material = materials.ivory, stage = 1) {
    return mesh(parent, name, new THREE.CylinderGeometry(radius, radius, height, segments), material, at, stage);
  }
  function tube(parent: THREE.Group, name: string, points: THREE.Vector3[], radius: number, material: THREE.Material = materials.gold, stage = 3) {
    return mesh(parent, name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), quality === 'low' ? 12 : 20, radius, quality === 'low' ? 5 : 7, false), material, [0, 0, 0], stage);
  }
  function ring(parent: THREE.Group, name: string, radius: number, y: number, thickness = 0.024, material: THREE.Material = materials.gold) {
    const item = mesh(parent, name, new THREE.TorusGeometry(radius, thickness, 6, segments), material, [0, y, 0], 3); item.rotation.x = Math.PI / 2; return item;
  }
  function archOutline(width: number, height: number, bottom: number) {
    const shape = new THREE.Shape(); shape.moveTo(-width / 2, bottom); shape.lineTo(width / 2, bottom);
    shape.lineTo(width / 2, bottom + height * 0.66);
    shape.bezierCurveTo(width / 2, bottom + height * 0.88, width * 0.22, bottom + height, 0, bottom + height);
    shape.bezierCurveTo(-width * 0.22, bottom + height, -width / 2, bottom + height * 0.88, -width / 2, bottom + height * 0.66);
    shape.closePath(); return shape;
  }

  function gallery(parent: THREE.Group, name: string, radius: number, y: number, height: number) {
    const bays = 12;
    const width = 2 * radius * Math.tan(Math.PI / bays);
    drum(parent, `${name}_FLOOR`, radius + 0.06, 0.10, [0, y + 0.05, 0], materials.ivoryShade);
    drum(parent, `${name}_CEILING`, radius + 0.09, 0.10, [0, y + height, 0], materials.ivory, 3);
    for (let i = 0; i < bays; i += 1) {
      const angle = i / bays * Math.PI * 2;
      const bay = new THREE.Group(); bay.name = `${name}_READING_BAY_${i}`;
      bay.position.set(Math.sin(angle) * (radius - 0.095), y + 0.08, Math.cos(angle) * (radius - 0.095)); bay.rotation.y = angle; parent.add(bay);
      const wallHeight = height - 0.08;
      const wall = new THREE.Shape(); wall.moveTo(-width / 2, 0); wall.lineTo(width / 2, 0); wall.lineTo(width / 2, wallHeight); wall.lineTo(-width / 2, wallHeight); wall.closePath();
      const doorway = i === 0 || i === 6;
      const opening = archOutline(width * (doorway ? 0.69 : 0.64), wallHeight * (doorway ? 0.91 : 0.77), doorway ? 0 : wallHeight * 0.09);
      wall.holes.push(new THREE.Path(opening.getPoints(10).reverse()));
      mesh(bay, `${bay.name}_DEEP_ARCHED_MASONRY`, new THREE.ExtrudeGeometry(wall, { depth: 0.095, bevelEnabled: false, curveSegments: 8 }), materials.ivory);
      box(bay, `${bay.name}_INHABITED_BACK_WALL`, [width * 0.80, wallHeight * 0.84, 0.035], [0, wallHeight * 0.45, -0.19], materials.wood);
      box(bay, `${bay.name}_WARM_READING_LIGHT`, [width * 0.49, 0.065, 0.014], [0, wallHeight * 0.77, -0.166], materials.warmGlow, 4);
      if (doorway && name === 'ARCHIVE_LOWER_HALL') {
        box(bay, `${bay.name}_OAK_DOOR_LEAF`, [width * 0.53, wallHeight * 0.66, 0.027], [0, wallHeight * 0.34, -0.13], materials.wood, 4);
      } else {
        for (let row = 0; row < 2; row += 1) {
          const shelfY = wallHeight * (0.22 + row * 0.31);
          box(bay, `${bay.name}_READING_SHELF_${row}`, [width * 0.71, 0.027, 0.15], [0, shelfY, -0.085], materials.wood, 4);
          for (let book = 0; book < 3; book += 1) {
            const bookHeight = wallHeight * (0.18 + ((book + i) % 2) * 0.035);
            box(bay, `${bay.name}_BOOK_${row}_${book}`, [width * 0.15, bookHeight, 0.085], [(book - 1) * width * 0.18, shelfY + bookHeight / 2 + 0.015, -0.066],
              [materials.paper, materials.sapphire, materials.gold][(book + i + row) % 3], 4);
          }
        }
      }
      box(bay, `${bay.name}_ARCH_SILL`, [width * 0.80, 0.033, 0.16], [0, 0.022, 0.045], materials.gold);
    }
  }

  function balustrade(parent: THREE.Group, name: string, radius: number, y: number, opening: number) {
    let points: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i += 1) {
      const angle = opening + i / 24 * (Math.PI * 2 - opening * 2);
      const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
      drum(parent, `${name}_POST_${i}`, 0.020, 0.19, [x, y + 0.095, z], materials.ivory, 2);
      points.push(new THREE.Vector3(x, y + 0.19, z));
    }
    tube(parent, `${name}_CONTINUOUS_RAIL`, points, 0.026, materials.ivory);
  }

  function inTelescopeOpening(point: THREE.Vector3) {
    const local = point.clone().sub(telescopePivot);
    const along = local.dot(telescopeAxis);
    return along > 0 && local.addScaledVector(telescopeAxis, -along).lengthSq() < portRadius ** 2;
  }
  function edgeOfPort(start: THREE.Vector3, end: THREE.Vector3) {
    let a = start.clone(), b = end.clone(); const startsInside = inTelescopeOpening(a);
    for (let i = 0; i < 16; i += 1) {
      const middle = a.clone().lerp(b, 0.5);
      if (inTelescopeOpening(middle) === startsInside) a = middle; else b = middle;
    }
    return a.lerp(b, 0.5);
  }
  function cutDome(parent: THREE.Group) {
    const position: number[] = [], normal: number[] = [], uv: number[] = [];
    const point = (theta: number, phi: number) => new THREE.Vector3(Math.sin(theta) * Math.cos(phi) * domeRadius,
      domeEquator + Math.sin(phi) * domeRise, Math.cos(theta) * Math.cos(phi) * domeRadius);
    function emit(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
      const input = [a, b, c], polygon: THREE.Vector3[] = [];
      for (let i = 0; i < 3; i += 1) {
        const p = input[i], q = input[(i + 1) % 3];
        if (!inTelescopeOpening(p)) polygon.push(p);
        if (inTelescopeOpening(p) !== inTelescopeOpening(q)) polygon.push(edgeOfPort(p, q));
      }
      for (let i = 1; i < polygon.length - 1; i += 1) {
        const corners = [polygon[0], polygon[i], polygon[i + 1]];
        if (corners[1].clone().sub(corners[0]).cross(corners[2].clone().sub(corners[0])).lengthSq() < 1e-12) continue;
        for (const p of corners) {
          position.push(p.x, p.y, p.z);
          const n = new THREE.Vector3(p.x / domeRadius ** 2, (p.y - domeEquator) / domeRise ** 2, p.z / domeRadius ** 2).normalize();
          normal.push(n.x, n.y, n.z); uv.push(Math.atan2(p.x, p.z) / (Math.PI * 2) + 0.5, (p.y - domeEquator) / domeRise);
        }
      }
    }
    const rows = quality === 'low' ? 10 : 16;
    for (let i = 0; i < segments; i += 1) for (let row = 0; row < rows; row += 1) {
      const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2;
      const lo = row / rows * Math.PI / 2, hi = (row + 1) / rows * Math.PI / 2;
      emit(point(a, lo), point(b, lo), point(b, hi)); emit(point(a, lo), point(b, hi), point(a, hi));
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    mesh(parent, 'ARCHIVE_CONTINUOUS_SAPPHIRE_DOME_WITH_REAL_PORT', geometry, materials.sapphire, [0, 0, 0], 3);
    for (let rib = 0; rib < 12; rib += 1) {
      const theta = rib / 12 * Math.PI * 2; let run: THREE.Vector3[] = []; let partIndex = 0;
      const finish = () => { if (run.length > 1) tube(parent, `ARCHIVE_GOLD_DOME_RIB_${rib}_${partIndex++}`, run, 0.019); run = []; };
      let previous: THREE.Vector3 | undefined;
      for (let i = 0; i <= 28; i += 1) {
        const p = point(theta, i / 28 * Math.PI / 2).multiply(new THREE.Vector3(1.009, 1, 1.009)); p.y += 0.005;
        if (previous && inTelescopeOpening(previous) !== inTelescopeOpening(p)) {
          const boundary = edgeOfPort(previous, p);
          if (inTelescopeOpening(previous)) run.push(boundary); else { run.push(boundary); finish(); }
        }
        if (!inTelescopeOpening(p)) run.push(p);
        previous = p;
      }
      finish();
    }
  }

  const first = phase(1);
  drum(first, 'ARCHIVE_FOUNDATION', 1.38, 0.12, [0, 0.06, 0], materials.ivoryShade);
  drum(first, 'ARCHIVE_LOWER_COURT', 1.23, 0.22, [0, 0.23, 0], materials.ivoryShade);
  drum(first, 'ARCHIVE_ARRIVAL_TERRACE', 1.28, 0.09, [0, 0.385, 0]);
  gallery(first, 'ARCHIVE_LOWER_HALL', 0.87, 0.43, 0.77);
  drum(first, 'ARCHIVE_LOWER_HALL_TERRACE_ROOF', 1.02, 0.10, [0, 1.25, 0], materials.ivoryShade, 3);
  for (let i = 0; i < 6; i += 1) {
    const front = 1.73 - i * 0.12, h = 0.052 * (i + 1);
    box(first, `ARCHIVE_ARRIVAL_STAIR_${i}`, [0.77, h, front - 0.93], [0, 0.12 + h / 2, (front + 0.93) / 2], materials.ivory, 1);
  }
  for (const side of [-1, 1]) tube(first, `ARCHIVE_ARRIVAL_HANDRAIL_${side}`, [new THREE.Vector3(side * 0.42, 0.35, 1.66), new THREE.Vector3(side * 0.42, 0.63, 1.05)], 0.027, materials.ivory, 2);
  balustrade(first, 'ARCHIVE_GROUND_BALCONY', 1.18, 0.43, 0.40);

  if (level >= 2) {
    const second = phase(2);
    gallery(second, 'ARCHIVE_UPPER_READING_GALLERY', 0.77, 1.30, 0.79);
    balustrade(second, 'ARCHIVE_UPPER_CIRCULAR_GALLERY', 0.98, 1.30, 0.12);
    drum(second, 'ARCHIVE_OBSERVING_FLOOR', 0.89, 0.10, [0, 2.15, 0], materials.ivoryShade, 3);
    drum(second, 'ARCHIVE_TELESCOPE_PEDESTAL', 0.235, 0.10, [telescopePivot.x, 2.245, telescopePivot.z], materials.ivory, 3);
    for (const side of [-1, 1]) {
      const bearing = telescopePivot.clone().addScaledVector(telescopeRight, side * 0.18);
      tube(second, `ARCHIVE_TELESCOPE_LOAD_BEARING_CRADLE_${side}`, [new THREE.Vector3(bearing.x, 2.24, bearing.z), new THREE.Vector3(bearing.x, 2.35, bearing.z), bearing], 0.041, materials.gold, 4);
      mesh(second, `ARCHIVE_TELESCOPE_PIVOT_BEARING_${side}`, new THREE.SphereGeometry(0.053, 12, 8), materials.gold, [bearing.x, bearing.y, bearing.z], 4);
    }
    const telescope = new THREE.Group(); telescope.name = 'ARCHIVE_MOUNTED_TELESCOPE'; telescope.position.copy(telescopePivot); telescope.quaternion.copy(telescopeRotation); second.add(telescope);
    const barrel = mesh(telescope, 'ARCHIVE_GOLD_TELESCOPE_BARREL', new THREE.CylinderGeometry(0.137, 0.098, 1.02, 20), materials.gold, [0, 0, 0.40], 4); barrel.rotation.x = Math.PI / 2;
    const eyepiece = mesh(telescope, 'ARCHIVE_TELESCOPE_OCULAR', new THREE.CylinderGeometry(0.074, 0.065, 0.18, 16), materials.sapphire, [0, 0, -0.18], 4); eyepiece.rotation.x = Math.PI / 2;
    const hood = mesh(telescope, 'ARCHIVE_HOLLOW_OBJECTIVE_HOOD', new THREE.CylinderGeometry(0.169, 0.148, 0.20, 24, 1, true), materials.gold, [0, 0, 0.99], 4); hood.rotation.x = Math.PI / 2;
    mesh(telescope, 'ARCHIVE_RECESSED_OBJECTIVE_LENS', new THREE.CircleGeometry(0.145, 24), materials.cyanCrystal, [0, 0, 1.066], 4);
    const focus = new THREE.Group(); focus.name = 'ARCHIVE_TELESCOPE_FOCUS_COLLAR_PIVOT'; focus.position.z = 0.79;
    focus.userData.celestialMotion = true; focus.userData.celestialSpin = { axis: 'z', speed: 0.16 }; telescope.add(focus);
    mesh(focus, 'ARCHIVE_ROTATING_FOCUS_COLLAR', new THREE.TorusGeometry(0.143, 0.025, 7, 24), materials.gold, [0, 0, 0], 4);
    for (let i = 0; i < 3; i += 1) {
      const angle = i / 3 * Math.PI * 2;
      const grip = box(focus, `ARCHIVE_FOCUS_COLLAR_GRIP_${i}`, [0.040, 0.040, 0.055], [Math.cos(angle) * 0.155, Math.sin(angle) * 0.155, 0], materials.gold, 4); grip.rotation.z = angle;
    }
  }

  if (level >= 3) {
    const third = phase(3);
    cutDome(third);
    ring(third, 'ARCHIVE_DOME_GOLD_EQUATOR', domeRadius, domeEquator, 0.027);
    // Solve the actual barrel/radial-dome intersection for the port collar.
    let lo = 0, hi = 1;
    for (let i = 0; i < 28; i += 1) {
      const t = (lo + hi) / 2, p = telescopePivot.clone().addScaledVector(telescopeAxis, t);
      const level = (p.x * p.x + p.z * p.z) / domeRadius ** 2 + ((p.y - domeEquator) / domeRise) ** 2;
      if (level < 1) lo = t; else hi = t;
    }
    const portCenter = telescopePivot.clone().addScaledVector(telescopeAxis, (lo + hi) / 2);
    const port = mesh(third, 'ARCHIVE_TELESCOPE_TRUE_DOME_PORT_COLLAR', new THREE.TorusGeometry(portRadius, 0.036, 8, 32), materials.gold, [portCenter.x, portCenter.y, portCenter.z], 3);
    port.quaternion.copy(telescopeRotation);
    const portSleeve = mesh(third, 'ARCHIVE_TELESCOPE_PORT_DEPTH_SLEEVE', new THREE.CylinderGeometry(portRadius + 0.01, portRadius + 0.01, 0.12, 32, 1, true), materials.ivory,
      [portCenter.x, portCenter.y, portCenter.z], 3);
    portSleeve.quaternion.copy(telescopeRotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    ring(third, 'ARCHIVE_DOME_CROWN_COLLAR', 0.12, 2.987, 0.019);
    const crown = mesh(third, 'ARCHIVE_GOLD_OBSERVATORY_CROWN', new THREE.OctahedronGeometry(0.075), materials.gold, [0, 3.10, 0], 5); crown.scale.y = 1.25;
  }
  addCelestialV2Finish(root, 'archive', materials);
  return root;
}
