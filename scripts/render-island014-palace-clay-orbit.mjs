import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';
import * as THREE from 'three';

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.argv[2] ?? 'work/island-visual-library/island-014-honeycomb-kingdom/evidence/palace-ornament-v001-r01',
);

const WIDTH = 900;
const HEIGHT = 900;
const CAMERA_TARGET = new THREE.Vector3(0, 2.75, 0.15);
const CAMERA_RADIUS = 10.4;
const CAMERA_Y = 5.15;
const CAMERA_FOV = 38;
const ORBIT_DEGREES = [0, 45, 135, 180, 225, 315];
const LIGHT_DIRECTION = new THREE.Vector3(-0.48, 0.82, 0.62).normalize();

const isPalaceOrnamentEvidenceMesh = (object) => {
  const name = object.name ?? '';
  return name.startsWith('ISLAND_14_CATHEDRAL_V7_') || name.startsWith('ISLAND_14_ROYAL_CATHEDRAL_V7_');
};

const xmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function projectTriangle(mesh, camera, localA, localB, localC, materialsOn) {
  const a = localA.clone().applyMatrix4(mesh.matrixWorld);
  const b = localB.clone().applyMatrix4(mesh.matrixWorld);
  const c = localC.clone().applyMatrix4(mesh.matrixWorld);
  const ab = b.clone().sub(a);
  const ac = c.clone().sub(a);
  const normal = ab.cross(ac).normalize();
  const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
  if (normal.dot(camera.position.clone().sub(centroid)) <= 0.001) return null;

  const projected = [a, b, c].map((point) => point.clone().project(camera));
  if (projected.every((point) => point.z < -1 || point.z > 1)) return null;
  if (projected.every((point) => point.x < -1.15 || point.x > 1.15 || point.y < -1.15 || point.y > 1.15)) return null;

  const points = projected.map((point) => [
    (point.x * 0.5 + 0.5) * WIDTH,
    (-point.y * 0.5 + 0.5) * HEIGHT,
  ]);
  const viewCentroid = centroid.clone().applyMatrix4(camera.matrixWorldInverse);
  const light = THREE.MathUtils.clamp(normal.dot(LIGHT_DIRECTION) * 0.5 + 0.5, 0.16, 1);
  const materialColor = mesh.material?.color instanceof THREE.Color
    ? mesh.material.color.clone()
    : new THREE.Color(0xc58a2a);
  const shaded = materialsOn
    ? materialColor.multiplyScalar(0.34 + light * 0.78).convertLinearToSRGB()
    : new THREE.Color(0xd8ad55).multiplyScalar(0.42 + light * 0.66).convertLinearToSRGB();
  return {
    depth: viewCentroid.z,
    points,
    fill: `rgb(${Math.round(THREE.MathUtils.clamp(shaded.r, 0, 1) * 255)},${Math.round(THREE.MathUtils.clamp(shaded.g, 0, 1) * 255)},${Math.round(THREE.MathUtils.clamp(shaded.b, 0, 1) * 255)})`,
  };
}

function renderPalaceSvg(root, degrees, cameraOptions = {}) {
  const target = cameraOptions.target ?? CAMERA_TARGET;
  const cameraRadius = cameraOptions.radius ?? CAMERA_RADIUS;
  const cameraY = cameraOptions.y ?? CAMERA_Y;
  const cameraFov = cameraOptions.fov ?? CAMERA_FOV;
  const materialsOn = cameraOptions.materialsOn ?? true;
  const label = cameraOptions.label ?? `${degrees}°`;
  const angle = THREE.MathUtils.degToRad(degrees);
  const camera = new THREE.PerspectiveCamera(cameraFov, WIDTH / HEIGHT, 0.1, 100);
  camera.position.set(
    target.x + Math.sin(angle) * cameraRadius,
    cameraY,
    target.z + Math.cos(angle) * cameraRadius,
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

  root.updateMatrixWorld(true);
  const triangles = [];
  const localA = new THREE.Vector3();
  const localB = new THREE.Vector3();
  const localC = new THREE.Vector3();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible || !isPalaceOrnamentEvidenceMesh(object)) return;
    const geometry = object.geometry;
    const positions = geometry?.getAttribute('position');
    if (!positions) return;
    const index = geometry.index;
    const triangleCount = index ? index.count / 3 : positions.count / 3;
    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
      const readIndex = (offset) => index
        ? index.getX(triangleIndex * 3 + offset)
        : triangleIndex * 3 + offset;
      localA.fromBufferAttribute(positions, readIndex(0));
      localB.fromBufferAttribute(positions, readIndex(1));
      localC.fromBufferAttribute(positions, readIndex(2));
      const triangle = projectTriangle(object, camera, localA, localB, localC, materialsOn);
      if (triangle) triangles.push(triangle);
    }
  });
  triangles.sort((left, right) => left.depth - right.depth);

  const polygons = triangles.map((triangle) => (
    `<polygon points="${triangle.points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}" fill="${triangle.fill}" stroke="#5e431e" stroke-width="0.34" stroke-linejoin="round"/>`
  )).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#17253b"/>
  <ellipse cx="450" cy="785" rx="285" ry="48" fill="#08111f" opacity="0.48"/>
  ${polygons}
  <text x="28" y="46" fill="#fff4c8" font-family="system-ui, sans-serif" font-size="24" font-weight="700">Island 014 Palace ornament · ${xmlEscape(label)}</text>
  <text x="28" y="75" fill="#b9c9dd" font-family="system-ui, sans-serif" font-size="15">Actual V7 Palace isolated from world · materials ${materialsOn ? 'on' : 'off'}</text>
</svg>`;
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
});

try {
  const module = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts');
  const materials = module.createIsland14HoneycombMaterials();
  const palace = module.buildIsland14HoneycombLandmark(
    { id: 'boss', label: 'Royal Honeycomb Palace', subtitle: 'Boss', position: [0, 0, 0], accent: 0xf6ba22 },
    3,
    'high',
    materials,
  );
  palace.updateMatrixWorld(true);
  const palaceBounds = new THREE.Box3().setFromObject(palace);
  const palaceCenter = palaceBounds.getCenter(new THREE.Vector3());
  palace.position.x -= palaceCenter.x;
  palace.position.y -= palaceBounds.min.y;
  palace.position.z -= palaceCenter.z;
  palace.updateMatrixWorld(true);
  const evidenceMeshNames = [];
  const allMeshNames = [];
  palace.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    allMeshNames.push(object.name);
    if (isPalaceOrnamentEvidenceMesh(object)) evidenceMeshNames.push(object.name);
  });
  if (evidenceMeshNames.length === 0) throw new Error(`No V7 Palace evidence meshes matched the isolation filter: ${JSON.stringify(allMeshNames.slice(0, 20))}`);
  for (const degrees of ORBIT_DEGREES) {
    const fileName = `palace-ornament-${String(degrees).padStart(3, '0')}-materials-on.svg`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), renderPalaceSvg(palace, degrees), 'utf8');
  }
  const closeFileName = 'palace-ornament-facade-close-materials-on.svg';
  await fs.writeFile(path.join(OUTPUT_DIR, closeFileName), renderPalaceSvg(palace, 0, {
    target: new THREE.Vector3(0, 2.35, 0.55),
    radius: 7.25,
    y: 4.15,
    fov: 33,
    label: 'close',
  }), 'utf8');
  const rearCloseFileName = 'palace-ornament-rear-close-materials-on.svg';
  await fs.writeFile(path.join(OUTPUT_DIR, rearCloseFileName), renderPalaceSvg(palace, 180, {
    target: new THREE.Vector3(0, 2.35, -0.52),
    radius: 7.25,
    y: 4.15,
    fov: 33,
    label: 'rear close',
  }), 'utf8');
  const clayFileName = 'palace-ornament-180-materials-off.svg';
  await fs.writeFile(path.join(OUTPUT_DIR, clayFileName), renderPalaceSvg(palace, 180, {
    label: '180° clay',
    materialsOn: false,
  }), 'utf8');
  const manifest = {
    schemaVersion: 1,
    source: 'actual buildIsland14HoneycombLandmark boss L3 high V7 mesh',
    constructionFamily: 'procedural-threejs-deep-honeycomb-cathedral-ornament',
    representation: 'deterministic CPU-projected Palace-isolated actual-mesh SVG; materials-on and materials-off evidence',
    isolation: 'Actual V7 Palace only; world, terrain, route, mission, and other landmarks omitted',
    width: WIDTH,
    height: HEIGHT,
    target: CAMERA_TARGET.toArray(),
    cameraRadius: CAMERA_RADIUS,
    cameraY: CAMERA_Y,
    cameraFov: CAMERA_FOV,
    views: ORBIT_DEGREES.map((degrees) => ({
      degrees,
      file: `palace-ornament-${String(degrees).padStart(3, '0')}-materials-on.svg`,
    })).concat([
      { degrees: 0, view: 'facade-closeup', file: closeFileName },
      { degrees: 180, view: 'rear-closeup', file: rearCloseFileName },
      { degrees: 180, view: 'materials-off', file: clayFileName },
    ]),
  };
  for (const view of manifest.views) {
    const bytes = await fs.readFile(path.join(OUTPUT_DIR, view.file));
    view.sha256 = createHash('sha256').update(bytes).digest('hex');
  }
  await fs.writeFile(path.join(OUTPUT_DIR, 'manifest.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Rendered ${ORBIT_DEGREES.length + 3} Palace ornament views to ${OUTPUT_DIR}`);
} finally {
  await server.close();
}
