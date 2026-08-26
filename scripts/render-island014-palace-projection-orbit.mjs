import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';
import * as THREE from 'three';

const OUT = path.resolve(process.cwd(), process.argv[2] ?? 'work/island-visual-library/island-014-honeycomb-kingdom/evidence/palace-facade-projection-v001-r01');
const ASSET = path.resolve(process.cwd(), 'src/features/gamification/level-worlds/dev/assets/island14PalaceFacadeProjectionV1Alpha.png');
const W = 900;
const H = 900;
const ORBITS = [0, 45, 315];
const TARGET = new THREE.Vector3(0, 1.68, 0.52);
const LIGHT = new THREE.Vector3(-0.48, 0.82, 0.62).normalize();

const facadeMesh = (object) => {
  const name = object.name ?? '';
  return name.startsWith('ISLAND_14_PALACE_FACADE_')
    || /^ISLAND_14_PALACE_STEP_\d+$/.test(name)
    || ['ISLAND_14_PALACE_LOWER_CIVIC_TIER', 'ISLAND_14_PALACE_MIDDLE_BASILICA_TIER', 'ISLAND_14_PALACE_ENTRANCE_BUTTRESS', 'ISLAND_14_PALACE_KEEP_LOWER', 'ISLAND_14_PALACE_KEEP_UPPER'].includes(name);
};

function cameraFor(degrees, close = false) {
  const angle = THREE.MathUtils.degToRad(degrees);
  const target = close ? new THREE.Vector3(0, 1.72, 0.92) : TARGET;
  const radius = close ? 4.25 : 7.0;
  const camera = new THREE.PerspectiveCamera(close ? 31 : 36, 1, 0.1, 100);
  camera.position.set(target.x + Math.sin(angle) * radius, close ? 2.95 : 4.25, target.z + Math.cos(angle) * radius);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  return camera;
}

function screen(point, camera) {
  const p = point.clone().project(camera);
  return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H];
}

function clayTriangles(root, camera, omitProjectionSurface) {
  root.updateMatrixWorld(true);
  const triangles = [];
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !facadeMesh(object)) return;
    if (omitProjectionSurface && object.name === 'ISLAND_14_PALACE_FACADE_PROJECTION_V1_SCULPTED_RELIEF') return;
    const position = object.geometry?.getAttribute('position');
    if (!position) return;
    const index = object.geometry.index;
    const count = index ? index.count / 3 : position.count / 3;
    for (let tri = 0; tri < count; tri += 1) {
      const read = (offset) => index ? index.getX(tri * 3 + offset) : tri * 3 + offset;
      a.fromBufferAttribute(position, read(0)).applyMatrix4(object.matrixWorld);
      b.fromBufferAttribute(position, read(1)).applyMatrix4(object.matrixWorld);
      c.fromBufferAttribute(position, read(2)).applyMatrix4(object.matrixWorld);
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      if (normal.dot(camera.position.clone().sub(centroid)) <= 0.001) continue;
      const points = [screen(a, camera), screen(b, camera), screen(c, camera)];
      const depth = centroid.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const shade = THREE.MathUtils.clamp(normal.dot(LIGHT) * 0.5 + 0.5, 0.16, 1);
      const base = 124 + Math.round(shade * 92);
      triangles.push({ depth, points, fill: `rgb(${Math.min(238, base + 16)},${Math.min(224, base + 2)},${Math.max(92, base - 38)})` });
    }
  });
  triangles.sort((left, right) => left.depth - right.depth);
  return triangles.map((triangle) => `<polygon points="${triangle.points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}" fill="${triangle.fill}" stroke="#5e431e" stroke-width="0.32"/>`).join('\n');
}

function projectionImage(root, camera) {
  const relief = root.getObjectByName('ISLAND_14_PALACE_FACADE_PROJECTION_V1_SCULPTED_RELIEF');
  if (!relief) throw new Error('projection relief mesh missing');
  relief.updateMatrixWorld(true);
  const tl = screen(new THREE.Vector3(-1.41, 1.57, 0.02).applyMatrix4(relief.matrixWorld), camera);
  const tr = screen(new THREE.Vector3(1.41, 1.57, 0.02).applyMatrix4(relief.matrixWorld), camera);
  const bl = screen(new THREE.Vector3(-1.41, -1.57, 0.02).applyMatrix4(relief.matrixWorld), camera);
  const br = screen(new THREE.Vector3(1.41, -1.57, 0.02).applyMatrix4(relief.matrixWorld), camera);
  const iw = 1183; const ih = 1330;
  const cropX = iw * 0.054100;
  const cropTop = ih * (1.0 - 0.971429);
  const cropWidth = iw * (0.939983 - 0.054100);
  const cropHeight = ih * (0.971429 - 0.036090);
  const a = (tr[0]-tl[0])/cropWidth;
  const b = (tr[1]-tl[1])/cropWidth;
  const c = (bl[0]-tl[0])/cropHeight;
  const d = (bl[1]-tl[1])/cropHeight;
  const matrix = [a, b, c, d, tl[0] - a*cropX - c*cropTop, tl[1] - b*cropX - d*cropTop];
  return `<image width="${iw}" height="${ih}" href="island14PalaceFacadeProjectionV1Alpha.png" transform="matrix(${matrix.map((v) => v.toFixed(7)).join(' ')})"/>`;
}

function svg(root, degrees, pngData, materialsOn, close = false) {
  const camera = cameraFor(degrees, close);
  const clay = clayTriangles(root, camera, materialsOn);
  const image = materialsOn ? projectionImage(root, camera) : '';
  const label = close ? 'close' : `${degrees}°`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#17253b"/>
  <ellipse cx="450" cy="785" rx="285" ry="48" fill="#08111f" opacity="0.48"/>
  ${clay}
  ${image}
  <text x="28" y="46" fill="#fff4c8" font-family="system-ui,sans-serif" font-size="24" font-weight="700">Island 014 projection relief · ${label}</text>
  <text x="28" y="75" fill="#b9c9dd" font-family="system-ui,sans-serif" font-size="15">actual subdivided relief + sealed host · materials ${materialsOn ? 'on' : 'off'}</text>
</svg>`;
}

await fs.mkdir(OUT, { recursive: true });
const png = await fs.readFile(ASSET);
await fs.copyFile(ASSET, path.join(OUT, 'island14PalaceFacadeProjectionV1Alpha.png'));
const server = await createServer({ appType: 'custom', configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false } });
try {
  const module = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts');
  const palace = module.buildIsland14HoneycombLandmark({ id:'boss', label:'Royal Honeycomb Palace', subtitle:'Boss', position:[0,0,0], accent:0xf6ba22 }, 3, 'high', module.createIsland14HoneycombMaterials());
  const files = [];
  for (const degrees of ORBITS) {
    for (const materialsOn of [true, false]) {
      const mode = materialsOn ? 'materials-on' : 'materials-off';
      const file = `island-014-palace-projection-${String(degrees).padStart(3,'0')}-${mode}-v001.svg`;
      await fs.writeFile(path.join(OUT, file), svg(palace, degrees, null, materialsOn), 'utf8');
      files.push({ view: degrees, mode, file });
    }
  }
  const closeFile = 'island-014-palace-projection-close-materials-on-v001.svg';
  await fs.writeFile(path.join(OUT, closeFile), svg(palace, 0, null, true, true), 'utf8');
  files.push({ view:'close', mode:'materials-on', file:closeFile });
  for (const item of files) item.sha256 = createHash('sha256').update(await fs.readFile(path.join(OUT,item.file))).digest('hex');
  const relief = palace.getObjectByName('ISLAND_14_PALACE_FACADE_PROJECTION_V1_RELIEF_ASSEMBLY');
  const manifest = { schemaVersion:1, constructionFamily:'threejs-chroma-projected-sculpted-honey-cathedral-relief', source:'actual L3 high palace mesh', originalTexture:{ file:'island14PalaceFacadeProjectionV1.png', bytes:2009757, sha256:'52a6179e2f68e9d7baab280c01eab085d7a66d9bcaa346c9d924436f07d65dd8' }, preparedAlphaTexture:{ file:'island14PalaceFacadeProjectionV1Alpha.png', bytes:png.byteLength, sha256:createHash('sha256').update(png).digest('hex'), process:'deterministic RGB distance to sampled cyan + smoothstep alpha + edge cyan decontamination' }, metrics:{ addedTriangles:relief?.userData.addedTriangles, addedDrawCalls:relief?.userData.addedDrawCalls }, correctionsUsed:0, views:files };
  await fs.writeFile(path.join(OUT,'capture-manifest.v1.json'), `${JSON.stringify(manifest,null,2)}\n`);
  console.log(`Rendered ${files.length} projection evidence views to ${OUT}`);
} finally { await server.close(); }
