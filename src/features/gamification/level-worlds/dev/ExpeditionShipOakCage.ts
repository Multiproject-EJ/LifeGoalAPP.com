import * as THREE from 'three';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';

type Joint = {position: [number, number, number]; radius: number; parent: number};
// Source 11's mid-trunk walk remains beneath the boughs. No sampled field,
// disconnected primitive branches, or voxel-size-dependent terminal fragments.
const JOINTS: Joint[] = [
  {position: [0, -.36, 0], radius: .70, parent: -1},
  {position: [-.025, -.16, .01], radius: .34, parent: 0},
  {position: [-.055, .22, .025], radius: .245, parent: 1},
  {position: [.035, .74, -.025], radius: .205, parent: 2},
  {position: [.025, 1.30, -.025], radius: .18, parent: 3},
  {position: [.02, 1.55, -.025], radius: .17, parent: 4},
  {position: [-.48, 1.69, .04], radius: .115, parent: 5},
  {position: [.43, 1.69, -.06], radius: .12, parent: 5},
  {position: [-.93, 1.78, .20], radius: .061, parent: 6},
  {position: [-.53, 1.83, -.48], radius: .061, parent: 6},
  {position: [-1.18, 1.88, .29], radius: .016, parent: 8},
  {position: [-.98, 1.76, .51], radius: .025, parent: 8},
  {position: [-1.17, 1.84, .65], radius: .009, parent: 11},
  {position: [-.81, 1.94, -.68], radius: .017, parent: 9},
  {position: [-.36, 1.92, -.74], radius: .024, parent: 9},
  {position: [-.41, 2.03, -.85], radius: .009, parent: 14},
  {position: [.95, 1.83, -.30], radius: .055, parent: 7},
  {position: [.51, 1.83, .50], radius: .059, parent: 7},
  {position: [1.17, 1.94, -.38], radius: .012, parent: 16},
  {position: [.96, 1.90, -.66], radius: .016, parent: 16},
  {position: [.85, 1.96, .73], radius: .015, parent: 17},
  {position: [.42, 1.91, .81], radius: .022, parent: 17},
  {position: [.55, 2.04, .88], radius: .008, parent: 21},
];

type Cage = {points: THREE.Vector3[]; faces: number[][]};
type Edge = {a: number; b: number; opposites: number[]; winding: number};

function edgesOf(faces: number[][]) {
  const edges = new Map<string, Edge>();
  for (const face of faces) for (let i = 0; i < 3; i++) {
    const a = face[i], b = face[(i + 1) % 3];
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    const edge = edges.get(key) || {a: Math.min(a, b), b: Math.max(a, b), opposites: [], winding: 0};
    edge.opposites.push(face[(i + 2) % 3]);
    edge.winding += a < b ? 1 : -1;
    edges.set(key, edge);
  }
  return edges;
}

function auditCage(cage: Cage) {
  const edges = edgesOf(cage.faces);
  const badEdges = [...edges.values()].filter(edge => edge.opposites.length !== 2 || edge.winding !== 0);
  const neighbors = cage.points.map(() => new Set<number>());
  for (const edge of edges.values()) {neighbors[edge.a].add(edge.b); neighbors[edge.b].add(edge.a);}
  const visited = new Set<number>();
  let components = 0;
  for (let i = 0; i < cage.points.length; i++) {
    if (visited.has(i)) continue;
    components++;
    const stack = [i];
    while (stack.length) {
      const n = stack.pop()!;
      if (visited.has(n)) continue;
      visited.add(n);
      for (const neighbor of neighbors[n]) if (!visited.has(neighbor)) stack.push(neighbor);
    }
  }
  return {vertices: cage.points.length, triangles: cage.faces.length, badEdges: badEdges.length, components};
}

function subdivide(cage: Cage): Cage {
  const edges = edgesOf(cage.faces);
  const neighbors = cage.points.map(() => new Set<number>());
  for (const edge of edges.values()) {neighbors[edge.a].add(edge.b); neighbors[edge.b].add(edge.a);}
  const points = cage.points.map((point, i) => {
    const n = neighbors[i].size;
    const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
    const result = point.clone().multiplyScalar(1 - n * beta);
    for (const j of neighbors[i]) result.addScaledVector(cage.points[j], beta);
    return result;
  });
  const midpoint = new Map<string, number>();
  for (const [key, edge] of edges) {
    const p = cage.points[edge.a].clone().add(cage.points[edge.b]).multiplyScalar(3 / 8);
    for (const opposite of edge.opposites) p.addScaledVector(cage.points[opposite], 1 / 8);
    midpoint.set(key, points.length); points.push(p);
  }
  const middle = (a: number, b: number) => midpoint.get(`${Math.min(a, b)}:${Math.max(a, b)}`)!;
  const faces = cage.faces.flatMap(([a, b, c]) => {
    const ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
    return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
  });
  return {points, faces};
}

export function createExpeditionOakCageGeometry(high: boolean) {
  const sides = high ? 8 : 6;
  const centers = JOINTS.map(joint => new THREE.Vector3(...joint.position));
  const children = JOINTS.map(() => [] as number[]);
  JOINTS.forEach((joint, i) => {if (joint.parent >= 0) children[joint.parent].push(i);});
  const degree = JOINTS.map((joint, i) => children[i].length + (joint.parent >= 0 ? 1 : 0));
  const cage: Cage = {points: [], faces: []};
  const ports = new Map<string, number[]>();
  const ring = (center: THREE.Vector3, normal: THREE.Vector3, radius: number, root = false) => {
    const axis = Math.abs(normal.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const u = new THREE.Vector3().crossVectors(axis, normal).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();
    return Array.from({length: sides}, (_, i) => {
      const angle = i / sides * Math.PI * 2;
      const point = center.clone().addScaledVector(u, Math.cos(angle) * radius).addScaledVector(v, Math.sin(angle) * radius);
      if (root) point.z *= .7;
      cage.points.push(point); return cage.points.length - 1;
    });
  };
  JOINTS.forEach((joint, i) => {
    const adjacent = [...children[i], ...(joint.parent >= 0 ? [joint.parent] : [])];
    if (degree[i] <= 2) {
      const from = joint.parent >= 0 ? centers[joint.parent] : centers[i];
      const to = children[i].length ? centers[children[i][0]] : centers[i];
      const normal = to.clone().sub(from).normalize();
      const indices = ring(centers[i], normal, joint.radius, i === 0);
      for (const neighbor of adjacent) ports.set(`${i}:${neighbor}`, indices);
      if (degree[i] === 1) {
        const cap = cage.points.length; cage.points.push(centers[i].clone());
        for (let k = 0; k < sides; k++) cage.faces.push(i === 0
          ? [cap, indices[(k + 1) % sides], indices[k]]
          : [cap, indices[k], indices[(k + 1) % sides]]);
      }
      return;
    }
    const junctionRings: number[][] = [];
    for (const neighbor of adjacent) {
      const delta = centers[neighbor].clone().sub(centers[i]);
      const length = delta.length();
      const direction = delta.divideScalar(length);
      const cut = Math.min(length * .42, joint.radius * 2.2);
      const radius = THREE.MathUtils.lerp(joint.radius, JOINTS[neighbor].radius, cut / length);
      const normal = direction.clone().multiplyScalar(neighbor === joint.parent ? -1 : 1);
      const indices = ring(centers[i].clone().addScaledVector(direction, cut), normal, radius);
      ports.set(`${i}:${neighbor}`, indices); junctionRings.push(indices);
    }
    const ids = junctionRings.flat();
    const byPoint = new Map(ids.map(id => [cage.points[id], id]));
    const hull = new ConvexHull().setFromPoints(ids.map(id => cage.points[id]));
    for (const face of hull.faces) {
      const triangle: number[] = [];
      let edge = face.edge;
      do {triangle.push(byPoint.get(edge.head().point)!); edge = edge.next;} while (edge !== face.edge);
      // Remove only port caps. Their exact ring vertices are reused by the limbs.
      if (!junctionRings.some(indices => triangle.every(id => indices.includes(id)))) cage.faces.push(triangle);
    }
  });
  JOINTS.forEach((joint, b) => {
    const a = joint.parent;
    if (a < 0) return;
    const start = ports.get(`${a}:${b}`)!, end = ports.get(`${b}:${a}`)!;
    let offset = 0, best = Infinity;
    for (let shift = 0; shift < sides; shift++) {
      const distance = start.reduce((sum, id, i) => sum + cage.points[id].distanceToSquared(cage.points[end[(i + shift) % sides]]), 0);
      if (distance < best) {best = distance; offset = shift;}
    }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      cage.faces.push([start[i], start[j], end[(i + offset) % sides]], [start[j], end[(j + offset) % sides], end[(i + offset) % sides]]);
    }
  });
  const cageAudit = auditCage(cage);
  if (cageAudit.badEdges || cageAudit.components !== 1) throw new Error(`Oak cage topology failed: ${JSON.stringify(cageAudit)}`);
  const surface = subdivide(cage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(surface.points.flatMap(point => point.toArray()), 3));
  geometry.setIndex(surface.faces.flat());
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.topologyAudit = auditCage(surface);
  geometry.userData.construction = 'shared-ring-convex-junction-loop-subdivision';
  return geometry;
}
