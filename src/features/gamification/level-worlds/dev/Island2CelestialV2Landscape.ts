import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island2CelestialMaterials } from './Island2CelestialThreeWorld';
import { createCelestialTree, createCelestialPlantCluster } from './Island2CelestialV2Botany';
import { resolveCelestialMeadowEdge } from './Island2CelestialV2Terrain';
import { createCelestialFlowMaterial } from './Island2CelestialV2WaterMaterial';

type Point = [number, number, number];
interface Plot { radius: number; depth: number; seed: number; topY?: number; role: 'main' | 'district' | 'distant'; outward?: number; clearingRadius?: number; landmarkClearings?: readonly { x: number; z: number; radius: number }[] }

/** Frozen terrain's exact cap contour, consumed solely for planting/water sockets. */
function edge(plot: Plot, angle: number, inset = 0): THREE.Vector3 {
  return resolveCelestialMeadowEdge(plot.radius, plot.seed, angle, inset, plot.topY ?? .36);
}
function tube(points: THREE.Vector3[], radius: number, material: THREE.Material, segments = 16) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 5, false), material);
}

/** Keep the full plant envelope outside the parent-owned landmark terrace. */
function fitPlantToClearing(plant: THREE.Group, plot: Plot) {
  if (!plot.clearingRadius) return;
  const radial = plant.position.clone().setY(0), distance = radial.length(); radial.normalize();
  const bounds = new THREE.Box3().setFromObject(plant);
  const nearestProjection = (radial.x >= 0 ? bounds.min.x : bounds.max.x) * radial.x
    + (radial.z >= 0 ? bounds.min.z : bounds.max.z) * radial.z;
  const inwardReach = distance - nearestProjection;
  const available = distance - plot.clearingRadius;
  if (available <= 0) throw new Error('Landscape root must be outside its landmark clearing');
  const scale = inwardReach > 0 ? Math.min(1, available / inwardReach) : 1;
  plant.scale.setScalar(scale);
  plant.userData.landmarkClearingRadius = plot.clearingRadius;
}

/** Reserve neighbouring docked terraces before admitting main-meadow planting. */
function intersectsLandmarkClearing(plant: THREE.Object3D, plot: Plot) {
  if (!plot.landmarkClearings?.length) return false;
  const bounds = new THREE.Box3().setFromObject(plant);
  return plot.landmarkClearings.some(({ x, z, radius }) => {
    const dx = Math.max(bounds.min.x - x, 0, x - bounds.max.x);
    const dz = Math.max(bounds.min.z - z, 0, z - bounds.max.z);
    return dx * dx + dz * dz < radius * radius;
  });
}
function disposeUnplacedPlant(plant: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  plant.traverse(node => { if (node instanceof THREE.Mesh) geometries.add(node.geometry); });
  geometries.forEach(geometry => geometry.dispose());
}

/** Each returned planted plot belongs to precisely one static or docking frame. */
export function addCelestialV2Gardens(owner: THREE.Group, plot: Plot, quality: Island3DQuality, materials: Island2CelestialMaterials) {
  const root = new THREE.Group(); root.name = `CELESTIAL_V2_${plot.role.toUpperCase()}_GARDENS_${plot.seed}`;
  const y = plot.topY ?? .36;
  const treeAngles = plot.role === 'main' ? [-.1, .18, 1.27, 1.86, 2.97, 3.29, 4.48, 4.99]
    : plot.role === 'district' ? [(plot.outward ?? 0) - .68, (plot.outward ?? 0) + .72] : [plot.seed * 1.7];
  treeAngles.forEach((angle, index) => {
    if (quality === 'low' && index % 2 && plot.role === 'main') return;
    const tree = createCelestialTree({ kind: index % 4 === 1 ? 'cloud-blossom' : 'windswept',
      seed: Math.round(plot.seed * 997) + index * 37, height: plot.role === 'distant' ? .55 : 1.05 + index % 3 * .23,
      spread: plot.role === 'distant' ? .35 : .62 + index % 2 * .12 }, 'low', materials);
    const at = plot.role === 'distant' ? edge(plot, angle, plot.radius * .48) : edge(plot, angle, plot.role === 'main' ? .96 : plot.clearingRadius ? .10 : .36);
    tree.position.copy(at); tree.rotation.y = angle + .6; fitPlantToClearing(tree, plot);
    if (intersectsLandmarkClearing(tree, plot)) { disposeUnplacedPlant(tree); return; }
    root.add(tree);
  });
  const patches = plot.role === 'main' ? (quality === 'low' ? 32 : 48) : plot.role === 'district' ? (quality === 'low' ? 12 : 18) : 4;
  for (let i = 0; i < patches; i++) {
    const angle = i / patches * Math.PI * 2 + plot.seed * .19;
    if (plot.role === 'main' && Math.abs(Math.atan2(Math.sin(angle - Math.PI / 2), Math.cos(angle - Math.PI / 2))) < .27) continue;
    if (plot.role === 'district' && Math.cos(angle - (plot.outward ?? 0)) < -.66) continue;
    const flower = i % 5 === 1 || i % 5 === 2;
    const patch = createCelestialPlantCluster({ kind: flower ? 'flowers' : 'shrub', seed: Math.round(plot.seed * 701) + i,
      radius: plot.role === 'distant' ? .19 : (plot.role === 'main' ? .46 : .32) + i % 3 * .045, height: flower ? .23 : .32 + i % 3 * .09 }, 'low', materials);
    patch.position.copy(edge(plot, angle, plot.role === 'main' ? .36 + i % 2 * .19 : plot.clearingRadius ? .10 : .24));
    fitPlantToClearing(patch, plot);
    if (intersectsLandmarkClearing(patch, plot)) { disposeUnplacedPlant(patch); continue; }
    if (flower && i % 2 === 0) patch.traverse(node => { if (node instanceof THREE.Mesh) node.material = materials.blossomWhite; });
    root.add(patch);
    if (flower && quality === 'high' && i % 5 === 1) {
      for (let j = 0; j < 3; j++) {
        const blossom = new THREE.Mesh(new THREE.SphereGeometry(.035, 5, 3), materials.warmGlow);
        blossom.position.copy(patch.position).add(new THREE.Vector3(Math.cos(j * 2.4) * .1, .13, Math.sin(j * 2.4) * .1));
        blossom.scale.y = .55; root.add(blossom);
      }
    }
  }
  const vines = plot.role === 'main' ? 9 : plot.role === 'district' ? 5 : 2;
  for (let i = 0; i < vines; i++) {
    if (quality === 'low' && i % 2) continue;
    const a = (plot.outward ?? plot.seed) + i / vines * Math.PI * 2;
    const start = edge(plot, a, .04);
    const direction = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const length = Math.min(plot.depth * .56, (plot.role === 'main' ? 2.4 : 1.0) + (i % 3) * .42);
    const points = [start.clone().addScaledVector(direction, -.15).add(new THREE.Vector3(0, .07, 0)),
      start.clone().addScaledVector(direction, .05).add(new THREE.Vector3(0, -.20, 0)),
      start.clone().addScaledVector(direction, -.18).add(new THREE.Vector3(.06 * Math.sin(a), -length * .55, 0)),
      start.clone().addScaledVector(direction, -.43).add(new THREE.Vector3(0, -length, 0))];
    const stem = tube(points, .018, materials.foliageDark, 12); stem.name = 'CELESTIAL_ROOTED_CLIFF_VINE'; root.add(stem);
    const curve = new THREE.CatmullRomCurve3(points);
    // Overlapping lobed sprays form a rooted hanging garden, tapering into vines.
    const leaves = quality === 'low' ? 8 : 13;
    for (let leaf = 0; leaf < leaves; leaf++) {
      const t = leaf / leaves;
      const leafMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), leaf % 5 === 0 ? materials.blossomLilac : leaf % 3 === 0 ? materials.foliageLight : materials.foliageMid);
      leafMesh.name = 'CELESTIAL_VINE_ATTACHED_LEAF'; leafMesh.position.copy(curve.getPoint(t));
      const side = leaf % 2 ? 1 : -1;
      const reach = (plot.role === 'main' ? .29 : .20) * (1 - t * .7);
      leafMesh.position.x += -Math.sin(a) * reach * side; leafMesh.position.z += Math.cos(a) * reach * side;
      leafMesh.scale.set((.35 - t * .23) * (plot.role === 'distant' ? .5 : 1), .25 - t * .10, .19 - t * .10);
      leafMesh.rotation.set(.1, -a + Math.PI / 2, side * .32); root.add(leafMesh);
    }
  }
  owner.add(root);
  return root;
}

function pondGeometry(radiusX: number, radiusZ: number, seed: number) {
  const positions = [0, 0, 0], uv = [.5, .5], indices: number[] = [];
  for (let i = 0; i < 40; i++) {
    const angle = i / 40 * Math.PI * 2, r = 1 + .10 * Math.sin(angle * 3 + seed) + .04 * Math.cos(angle * 7);
    positions.push(Math.cos(angle) * radiusX * r, 0, Math.sin(angle) * radiusZ * r);
    uv.push(.5 + Math.cos(angle) * r * .48, .5 + Math.sin(angle) * r * .48);
    indices.push(0, 1 + (i + 1) % 40, i + 1);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/** Thick curved water ribbons have side surfaces and a physical spill socket. */
function streamGeometry(points: THREE.Vector3[], width: number, falling: boolean) {
  const curve = new THREE.CatmullRomCurve3(points), rows = falling ? 32 : 20;
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, p = curve.getPoint(t), tangent = curve.getTangent(t);
    const across = falling ? new THREE.Vector3(points[0].z, 0, -points[0].x).normalize()
      : new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const widthAt = width * (falling ? 1.0 + .16 * Math.sin(t * 11) - t * .30 : 1 + .06 * Math.sin(t * 14));
    const thickness = falling ? .055 : .035;
    for (let corner = 0; corner < 4; corner++) {
      const side = corner === 0 || corner === 3 ? -1 : 1;
      const q = p.clone().addScaledVector(across, side * widthAt / 2);
      const down = corner < 2 ? 0 : thickness;
      if (falling) { const out = new THREE.Vector3(points[0].x, 0, points[0].z).normalize(); q.addScaledVector(out, -down); }
      else q.y -= down;
      positions.push(q.x, q.y, q.z); uv.push(side < 0 ? .055 : .945, t);
    }
    if (i < rows) for (let side = 0; side < 4; side++) {
      const a = i * 4 + side, b = i * 4 + (side + 1) % 4;
      indices.push(a, b + 4, b, a, a + 4, b + 4);
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function addCelestialV2Waterways(owner: THREE.Group, plot: Plot, quality: Island3DQuality, materials: Island2CelestialMaterials) {
  const root = new THREE.Group(); root.name = `CELESTIAL_V2_${plot.role.toUpperCase()}_WATERWAY_${plot.seed}`;
  const y = (plot.topY ?? .36) + .024;
  const angle = plot.role === 'main' ? Math.PI / 2 : plot.outward ?? 0;
  const lip = edge(plot, angle, -.07); lip.y = y;
  const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const across = new THREE.Vector3(-radial.z, 0, radial.x);
  const centre = lip.clone().addScaledVector(radial, plot.role === 'main' ? -.75 : -.25);
  const poolMaterial = createCelestialFlowMaterial('pool'), fallMaterial = createCelestialFlowMaterial('fall');
  const pond = new THREE.Mesh(pondGeometry(plot.role === 'main' ? 1.32 : .49, plot.role === 'main' ? .59 : .27, plot.seed), poolMaterial);
  pond.name = 'CELESTIAL_TERRACE_POOL'; pond.position.copy(centre); pond.rotation.y = -angle + Math.PI / 2; root.add(pond);
  // The last approach is radial so its terminal cross-section meets the fall's lip.
  const runnelPoints = [centre.clone(), centre.clone().lerp(lip, .55).addScaledVector(across, .11),
    lip.clone().addScaledVector(radial, plot.role === 'main' ? -.25 : -.075), lip.clone()];
  const runnel = new THREE.Mesh(streamGeometry(runnelPoints, plot.role === 'main' ? .95 : .46, false), poolMaterial);
  runnel.name = 'CELESTIAL_CONNECTED_SPILL_RUNNEL'; root.add(runnel);
  const drop = plot.role === 'main' ? plot.depth * .94 : plot.depth * .90;
  const streams = quality === 'low' ? 1 : 3;
  for (let i = 0; i < streams; i++) {
    const offset = (i - (streams - 1) / 2) * (plot.role === 'main' ? .29 : .14);
    const start = lip.clone().addScaledVector(across, offset);
    const streamDrop = drop * (i === Math.floor(streams / 2) ? 1 : i === 0 ? .78 : .88);
    const fallingPoints = [start, start.clone().addScaledVector(radial, .09).add(new THREE.Vector3(0, -.25, 0)),
      start.clone().addScaledVector(radial, .15).add(new THREE.Vector3(0, -streamDrop * .36, 0)),
      start.clone().addScaledVector(radial, .32).add(new THREE.Vector3(offset * .45, -streamDrop * .75, 0)),
      start.clone().addScaledVector(radial, .45).add(new THREE.Vector3(offset, -streamDrop, 0))];
    const fall = new THREE.Mesh(streamGeometry(fallingPoints, i === Math.floor(streams / 2) ? (plot.role === 'main' ? 1.02 : .51) : (plot.role === 'main' ? .20 : .13), true), fallMaterial);
    fall.name = 'CELESTIAL_CONNECTED_VOLUME_WATERFALL'; root.add(fall);
  }
  // Rounded stones sit on the meadow around the pool, leaving the outlet open.
  for (let i = 0; i < (quality === 'low' ? 9 : 17); i++) {
    const a = i / (quality === 'low' ? 9 : 17) * Math.PI * 2;
    if (Math.cos(a - angle) > .72) continue;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), i % 3 === 0 ? materials.ivoryShade : materials.cliff);
    stone.name = 'CELESTIAL_POOL_MARGIN_STONE';
    stone.position.copy(centre).addScaledVector(across, Math.cos(a) * (plot.role === 'main' ? 1.34 : .52)).addScaledVector(radial, Math.sin(a) * (plot.role === 'main' ? .61 : .29)); stone.position.y += .015;
    stone.scale.set(.11 + i % 3 * .03, .075, .10); stone.rotation.y = i * .8; root.add(stone);
  }
  for (let i = 0; i < (quality === 'low' ? 3 : 7); i++) {
    const foam = new THREE.Mesh(new THREE.SphereGeometry(.085, 6, 4), materials.cloud);
    foam.name = 'CELESTIAL_SPILL_LIP_FOAM'; foam.position.copy(lip).addScaledVector(across, (i - (quality === 'low' ? 1 : 3)) * (plot.role === 'main' ? .13 : .07)); foam.position.y += .015;
    foam.scale.set(1.1, .38, .7); root.add(foam);
  }
  root.userData.spillSocket = lip.toArray(); root.userData.waterOwner = owner.name;
  owner.add(root); return root;
}

/** One telescopic walkway consumes the fixed mainland and moving stair sockets. */
export function createCelestialDockingBridge(materials: Island2CelestialMaterials, quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'CELESTIAL_V2_TELESCOPIC_SKYBRIDGE'; root.userData.celestialMotion = true;
  const span = new THREE.Group(); span.name = 'CELESTIAL_SKYBRIDGE_EXTENDING_SPAN'; root.add(span);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(.66, .07, 1), materials.ivory); deck.position.set(0, .385, .5); span.add(deck);
  const inlay = new THREE.Mesh(new THREE.BoxGeometry(.075, .006, 1), materials.sapphire); inlay.position.set(0, .424, .5); span.add(inlay);
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(.032, .018, 1), materials.gold); rim.position.set(side * .32, .429, .5); span.add(rim);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.032, .032, 1), materials.ivory); rail.position.set(side * .32, .70, .5); span.add(rail);
    const arch = tube([new THREE.Vector3(side * .28, -.16, 0), new THREE.Vector3(side * .28, .22, .5), new THREE.Vector3(side * .28, -.16, 1)], .047, materials.ivoryShade, 16); span.add(arch);
    for (let i = 0; i < 6; i++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, .27, 5), materials.gold); pole.position.set(side * .32, .56, i / 5); span.add(pole);
    }
  }
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(.115, .14, .18, quality === 'low' ? 8 : 12), materials.ivoryShade);
    socket.position.set(side * .40, .39, 0); root.add(socket);
    const hub = new THREE.Mesh(new THREE.TorusGeometry(.085, .022, 5, 12), materials.gold); hub.position.set(side * .40, .49, 0); hub.rotation.x = Math.PI / 2; root.add(hub);
  }
  return { root, setLength: (length: number) => {
    span.scale.z = Math.max(.10, length); root.userData.spanLength = span.scale.z;
  } };
}
