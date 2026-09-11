import * as THREE from 'three';
import { solid } from './Island1V2Kit';

type PlanPoint = readonly [number, number];

/** X/Z footprint, rounded at the authored corners; extrusion is a continuous Y-up solid. */
export function terraceVolume(
  parent: THREE.Group, name: string, outline: readonly PlanPoint[],
  bottom: number, top: number, material: THREE.Material, round = 0.12,
) {
  const shape = new THREE.Shape();
  const mapped = outline.map(([x, z]) => new THREE.Vector2(x, -z));
  for (let i = 0; i < mapped.length; i++) {
    const previous = mapped[(i + mapped.length - 1) % mapped.length];
    const point = mapped[i];
    const next = mapped[(i + 1) % mapped.length];
    const approach = point.clone().lerp(previous, round);
    const departure = point.clone().lerp(next, round);
    if (i === 0) shape.moveTo(approach.x, approach.y);
    else shape.lineTo(approach.x, approach.y);
    shape.quadraticCurveTo(point.x, point.y, departure.x, departure.y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: top - bottom, bevelEnabled: false, steps: 1, curveSegments: 5,
  });
  geometry.rotateX(-Math.PI / 2);
  return solid(parent, name, geometry, material, [0, bottom, 0]);
}

/** One connected spandrel and pier wall, with real open arch boundaries rather than dark patches. */
export function nurseryArcade(
  parent: THREE.Group, name: string, width: number, height: number,
  bays: number, position: [number, number, number], yaw: number,
  material: THREE.Material, bow = 0,
) {
  const depth = 0.105;
  const bayWidth = width / bays;
  const pierWidth = 0.075;
  const radius = (bayWidth - pierWidth) * 0.5;
  const spring = height - radius - 0.095;
  const wall = new THREE.Shape();
  wall.moveTo(-width / 2, height);
  wall.lineTo(-width / 2, 0);
  for (let i = 0; i < bays; i++) {
    const centre = -width / 2 + bayWidth * (i + 0.5);
    wall.lineTo(centre - radius, 0);
    wall.lineTo(centre - radius, spring);
    wall.absarc(centre, spring, radius, Math.PI, 0, true);
    wall.lineTo(centre + radius, 0);
  }
  wall.lineTo(width / 2, 0);
  wall.lineTo(width / 2, height);
  wall.closePath();
  const geometry = new THREE.ExtrudeGeometry(wall, {
    depth, bevelEnabled: false, steps: 1, curveSegments: 12,
  });
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setZ(i, positions.getZ(i) - depth / 2 + bow * (1 - (x / (width / 2)) ** 2));
  }
  geometry.computeVertexNormals();
  const mesh = solid(parent, name, geometry, material, position);
  mesh.rotation.y = yaw;
  return mesh;
}

function ribbonGeometry(
  path: THREE.CatmullRomCurve3, width: number,
  bottomAt: (t: number) => number, topAt: (t: number) => number, count: number,
) {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const centre = path.getPoint(t);
    const tangent = path.getTangent(t).setY(0).normalize();
    const lateral = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width / 2);
    for (const [edge, y] of [[-1, bottomAt(t)], [1, bottomAt(t)], [1, topAt(t)], [-1, topAt(t)]]) {
      vertices.push(centre.x + lateral.x * edge, y, centre.z + lateral.z * edge);
    }
    if (i < count) {
      const a = i * 4;
      for (let face = 0; face < 4; face++) {
        const next = (face + 1) % 4;
        indices.push(a + face, a + next, a + next + 4, a + face, a + next + 4, a + face + 4);
      }
    }
  }
  indices.push(0, 2, 1, 0, 3, 2);
  const last = count * 4;
  indices.push(last, last + 1, last + 2, last, last + 2, last + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  // Cross sections are ordered around the forward path; reverse to point all six faces out.
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Rising, wound stair with an uninterrupted load-bearing mass and continuous side parapets. */
export function windingStair(
  parent: THREE.Group, name: string, controls: readonly PlanPoint[],
  from: number, to: number, width: number, material: THREE.Material, count = 18,
) {
  const path = new THREE.CatmullRomCurve3(controls.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const rise = (to - from) / count;
  // The support sits directly below the stepped tops; both ends are buried into their landings.
  solid(parent, `${name}_CONTINUOUS_SUPPORT`, ribbonGeometry(path, width, () => 0.205, t => from + (to - from) * t - 0.025, count * 3), material);
  for (let i = 0; i < count; i++) {
    const a = i / count;
    const b = (i + 1) / count;
    const top = from + rise * (i + 1);
    const p0 = path.getPoint(a), p1 = path.getPoint(b);
    const n0 = path.getTangent(a).setY(0).normalize();
    const n1 = path.getTangent(b).setY(0).normalize();
    const half = width / 2;
    const outline: PlanPoint[] = [
      [p0.x + n0.z * half, p0.z - n0.x * half],
      [p1.x + n1.z * half, p1.z - n1.x * half],
      [p1.x - n1.z * half, p1.z + n1.x * half],
      [p0.x - n0.z * half, p0.z + n0.x * half],
    ];
    terraceVolume(parent, `${name}_TREAD_${i}`, outline, top - rise - 0.04, top, material, 0);
  }
  for (const edge of [-1, 1]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= count * 2; i++) {
      const t = i / (count * 2);
      const point = path.getPoint(t);
      const tangent = path.getTangent(t).setY(0).normalize();
      point.x -= tangent.z * width * 0.5 * edge;
      point.z += tangent.x * width * 0.5 * edge;
      points.push(point);
    }
    const parapetPath = new THREE.CatmullRomCurve3(points);
    solid(parent, `${name}_PARAPET_${edge}`, ribbonGeometry(parapetPath, 0.055,
      t => from + (to - from) * t - 0.04,
      t => from + (to - from) * t + 0.13, count * 3), material);
  }
}

/** A pointed, bowed petal with exterior, interior and sealed edge faces. */
export function enclosedPetal(theta: number, height: number, rows: number) {
  const across = 12;
  const stride = across + 1;
  const layerSize = (rows + 1) * stride;
  const vertices: number[] = [];
  const indices: number[] = [];
  const sample = (t: number, u: number, thickness = 0) => {
    const radial = 0.445 + 0.46 * Math.sin(Math.PI * t) - 0.275 * t + thickness;
    const angularSpread = 0.89 * Math.pow(Math.sin(Math.PI * t), 0.73);
    const angle = theta + u * angularSpread;
    return new THREE.Vector3(Math.sin(angle) * radial, 1.065 + height * t, Math.cos(angle) * radial - 0.13);
  };
  for (let layer = 0; layer < 2; layer++) {
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= across; col++) {
        vertices.push(...sample(row / rows, col / across * 2 - 1, layer ? -0.012 : 0).toArray());
      }
    }
  }
  const triangle = (a: number, b: number, c: number) => {
    const pa = new THREE.Vector3().fromArray(vertices, a * 3);
    const pb = new THREE.Vector3().fromArray(vertices, b * 3);
    const pc = new THREE.Vector3().fromArray(vertices, c * 3);
    if (pb.sub(pa).cross(pc.sub(pa)).lengthSq() > 1e-18) indices.push(a, b, c);
  };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < across; col++) {
      const a = row * stride + col;
      triangle(a, a + 1, a + stride);
      triangle(a + 1, a + stride + 1, a + stride);
      triangle(a + layerSize, a + stride + layerSize, a + 1 + layerSize);
      triangle(a + 1 + layerSize, a + stride + layerSize, a + stride + 1 + layerSize);
    }
    for (const edge of [0, across]) {
      const a = row * stride + edge, b = a + stride;
      if (edge === 0) {
        triangle(a, b, a + layerSize); triangle(b, b + layerSize, a + layerSize);
      } else {
        triangle(a, a + layerSize, b); triangle(b, a + layerSize, b + layerSize);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, sample };
}
