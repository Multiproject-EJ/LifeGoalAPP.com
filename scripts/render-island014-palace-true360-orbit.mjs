import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';
import * as THREE from 'three';

const ROOT = process.cwd();
const OUT = path.resolve(ROOT, process.argv[2] ?? 'work/island-visual-library/island-014-honeycomb-kingdom/evidence/palace-true-360-shell-v001-r01');
const VALIDATION = path.resolve(ROOT, '.gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-true-360-shell/build-validation.v1.json');
const SOURCE = path.resolve(ROOT, 'docs/visual-references/island-014-honeycomb-kingdom/014-source.png');
const CROP = path.resolve(ROOT, '.gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-lower-cathedral-body/isolation/derived-crops/palace-visible-source-crop-v001.png');
const MULTIVIEW = path.resolve(ROOT, '.gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-front-facade/isolation/generated-references/palace-multiview-turnaround-v001.png');
const RUNTIME = path.resolve(ROOT, 'src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts');
const CONTRACT = path.resolve(ROOT, '.gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-true-360-shell/build-contract.v1.json');
const ORBITS = [0, 45, 90, 135, 180, 225, 270, 315];
const LIGHT = new THREE.Vector3(-0.52, 0.86, 0.62).normalize();

const sha = async (file) => createHash('sha256').update(await fs.readFile(file)).digest('hex');
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function cameraFor(degrees, width, height, mode = 'orbit') {
  const close = mode === 'close';
  const phone = mode === 'phone';
  const target = new THREE.Vector3(0, close ? 2.12 : 2.30, close ? 0.22 : 0.02);
  const radius = close ? 6.25 : phone ? 15.5 : 8.8;
  const angle = THREE.MathUtils.degToRad(degrees);
  const camera = new THREE.PerspectiveCamera(close ? 32 : phone ? 42 : 35, width / height, 0.1, 100);
  camera.position.set(
    target.x + Math.sin(angle) * radius,
    close ? 4.00 : phone ? 8.90 : 5.30,
    target.z + Math.cos(angle) * radius,
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  return { camera, target, radius };
}

function screen(point, camera, width, height) {
  const projected = point.clone().project(camera);
  return [(projected.x * 0.5 + 0.5) * width, (-projected.y * 0.5 + 0.5) * height, projected.z];
}

function materialRgb(material, light, materialsOn) {
  if (!materialsOn) {
    const clay = new THREE.Color(0xd9a743).multiplyScalar(0.48 + light * 0.60);
    clay.setRGB(THREE.MathUtils.clamp(clay.r, 0, 1), THREE.MathUtils.clamp(clay.g, 0, 1), THREE.MathUtils.clamp(clay.b, 0, 1)).convertLinearToSRGB();
    return [clay.r, clay.g, clay.b];
  }
  const source = material?.color instanceof THREE.Color ? material.color : new THREE.Color(0xb77924);
  const color = source.clone().multiplyScalar(0.30 + light * 0.78);
  if (material?.emissive instanceof THREE.Color && material.emissiveIntensity > 0) {
    color.add(material.emissive.clone().multiplyScalar(Math.min(0.34, material.emissiveIntensity * 0.24)));
  }
  color.setRGB(THREE.MathUtils.clamp(color.r, 0, 1), THREE.MathUtils.clamp(color.g, 0, 1), THREE.MathUtils.clamp(color.b, 0, 1)).convertLinearToSRGB();
  return [color.r, color.g, color.b];
}

function renderSvg(root, degrees, options) {
  const { width, height, materialsOn, mode = 'orbit' } = options;
  const { camera } = cameraFor(degrees, width, height, mode);
  root.updateMatrixWorld(true);
  const triangles = [];
  const localA = new THREE.Vector3();
  const localB = new THREE.Vector3();
  const localC = new THREE.Vector3();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible || !object.geometry) return;
    const positions = object.geometry.getAttribute('position');
    if (!positions) return;
    const index = object.geometry.index;
    const triangleCount = index ? index.count / 3 : positions.count / 3;
    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
      const read = (offset) => index ? index.getX(triangleIndex * 3 + offset) : triangleIndex * 3 + offset;
      localA.fromBufferAttribute(positions, read(0)).applyMatrix4(object.matrixWorld);
      localB.fromBufferAttribute(positions, read(1)).applyMatrix4(object.matrixWorld);
      localC.fromBufferAttribute(positions, read(2)).applyMatrix4(object.matrixWorld);
      const normal = localB.clone().sub(localA).cross(localC.clone().sub(localA)).normalize();
      const centroid = localA.clone().add(localB).add(localC).multiplyScalar(1 / 3);
      if (normal.dot(camera.position.clone().sub(centroid)) <= 0.001) continue;
      const points3 = [screen(localA, camera, width, height), screen(localB, camera, width, height), screen(localC, camera, width, height)];
      if (points3.every((point) => point[2] < -1 || point[2] > 1)) continue;
      const depth = centroid.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const light = THREE.MathUtils.clamp(normal.dot(LIGHT) * 0.5 + 0.5, 0.12, 1);
      const [r, g, b] = materialRgb(object.material, light, materialsOn);
      const opacity = materialsOn && object.material?.transparent ? Math.max(0.74, object.material.opacity ?? 1) : 1;
      triangles.push({
        depth,
        opacity,
        fill: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`,
        points: points3.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
      });
    }
  });
  triangles.sort((left, right) => left.depth - right.depth);
  const polygons = triangles.map((triangle) => (
    `<polygon points="${triangle.points}" fill="${triangle.fill}" fill-opacity="${triangle.opacity.toFixed(3)}" stroke="${materialsOn ? '#5a2a09' : '#70511d'}" stroke-opacity="${materialsOn ? '0.22' : '0.42'}" stroke-width="0.28" stroke-linejoin="round"/>`
  )).join('\n');
  const floorY = mode === 'phone' ? height * 0.80 : height * 0.87;
  const floorRx = mode === 'phone' ? width * 0.40 : width * 0.32;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="34%" r="74%"><stop offset="0" stop-color="#385c78"/><stop offset="0.58" stop-color="#17334f"/><stop offset="1" stop-color="#081525"/></radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <ellipse cx="${width / 2}" cy="${floorY}" rx="${floorRx}" ry="${mode === 'phone' ? 28 : 45}" fill="#030912" opacity="0.52"/>
  ${polygons}
  <text x="18" y="${height - 18}" fill="#dbe8f4" opacity="0.70" font-family="system-ui,sans-serif" font-size="${mode === 'phone' ? 11 : 14}">${xml(`actual runtime mesh · ${String(degrees).padStart(3, '0')}° · materials ${materialsOn ? 'on' : 'off'}`)}</text>
</svg>`;
}

function renderPhoneReviewSvg(root) {
  const portrait = renderSvg(root, 0, { width: 390, height: 844, materialsOn: true, mode: 'phone' });
  const inner = portrait
    .replace(/^<\?xml[^>]*>\s*/u, '')
    .replace(/^<svg[^>]*>/u, '')
    .replace(/<\/svg>\s*$/u, '');
  const scale = 0.92;
  const x = (900 - 390 * scale) / 2;
  const y = (900 - 844 * scale) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <rect width="900" height="900" fill="#07111e"/>
  <rect x="${(x - 11).toFixed(2)}" y="${(y - 11).toFixed(2)}" width="${(390 * scale + 22).toFixed(2)}" height="${(844 * scale + 22).toFixed(2)}" rx="28" fill="#02060b" stroke="#92702b" stroke-width="3"/>
  <g transform="translate(${x.toFixed(4)} ${y.toFixed(4)}) scale(${scale})">
    ${inner}
  </g>
  <text x="24" y="876" fill="#dbe8f4" opacity="0.72" font-family="system-ui,sans-serif" font-size="14">390×844 phone viewport · full-frame readability proof</text>
</svg>`;
}

function meshMetrics(root) {
  let meshCount = 0;
  let triangleCount = 0;
  let openSurfaceCount = 0;
  const retiredNames = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const positions = object.geometry?.getAttribute('position');
    if (positions) triangleCount += object.geometry.index ? object.geometry.index.count / 3 : positions.count / 3;
    const name = object.name ?? '';
    if (/BLENDER|PROJECTION|FACADE_V[123]/i.test(name)) retiredNames.push(name);
    if (object.geometry instanceof THREE.PlaneGeometry) openSurfaceCount += 1;
  });
  return { meshCount, triangleCount, openSurfaceCount, retiredNames };
}

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(path.dirname(VALIDATION), { recursive: true });
const server = await createServer({ appType: 'custom', configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false, host: '127.0.0.1' } });
try {
  const module = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts');
  const palace = module.buildIsland14HoneycombLandmark(
    { id: 'boss', label: 'Royal Honeycomb Palace', subtitle: 'Boss', position: [0, 0, 0], accent: 0xf6ba22 },
    3,
    'high',
    module.createIsland14HoneycombMaterials(),
  );
  const files = [];
  for (const degrees of ORBITS) {
    const file = `orbit-${String(degrees).padStart(3, '0')}-materials-on.svg`;
    await fs.writeFile(path.join(OUT, file), renderSvg(palace, degrees, { width: 900, height: 900, materialsOn: true }), 'utf8');
    files.push({ id: `orbit-${String(degrees).padStart(3, '0')}-materials-on`, degrees, mode: 'materials-on', file });
  }
  for (const degrees of [0, 45, 315]) {
    const file = `orbit-${String(degrees).padStart(3, '0')}-materials-off.svg`;
    await fs.writeFile(path.join(OUT, file), renderSvg(palace, degrees, { width: 900, height: 900, materialsOn: false }), 'utf8');
    files.push({ id: `orbit-${String(degrees).padStart(3, '0')}-materials-off`, degrees, mode: 'materials-off', file });
  }
  const closeFile = 'front-close-materials-on.svg';
  await fs.writeFile(path.join(OUT, closeFile), renderSvg(palace, 0, { width: 900, height: 900, materialsOn: true, mode: 'close' }), 'utf8');
  files.push({ id: 'front-close-materials-on', degrees: 0, mode: 'materials-on-close', file: closeFile });
  const phoneFile = 'phone-overview.svg';
  await fs.writeFile(path.join(OUT, phoneFile), renderPhoneReviewSvg(palace), 'utf8');
  files.push({ id: 'phone-overview', degrees: 0, mode: 'phone-overview', file: phoneFile });
  for (const item of files) {
    item.sha256 = await sha(path.join(OUT, item.file));
    const rasterFile = item.file.replace(/\.svg$/u, '.png');
    try {
      item.rasterFile = rasterFile;
      item.rasterSha256 = await sha(path.join(OUT, rasterFile));
    } catch {
      delete item.rasterFile;
    }
  }

  const metrics = meshMetrics(palace);
  const shell = palace.userData.true360Shell;
  const checks = {
    sourceHashMatches: await sha(SOURCE) === '3c1dfccaf52ee596a6488e844d53b51414693d6dbd400513ee52fa06132a580e',
    cropHashMatches: await sha(CROP) === 'f0cb00739957d5789199a28d0bc4c9d770e346dd836bda3a112c7061a518b932',
    multiviewHashMatches: await sha(MULTIVIEW) === 'cf8486e879a188b3a00db9b1e65bd99b6b940f567161664b4f8136734f9425a3',
    runtimeProjectionCountZero: shell?.runtimeProjectionCount === 0,
    retiredLiveMeshCountZero: metrics.retiredNames.length === 0,
    openPlaneCountZero: metrics.openSurfaceCount === 0,
    footprintDepthRatioInContract: shell?.footprintDepthRatio >= 0.72 && shell?.footprintDepthRatio <= 0.82,
    totalHeightRatioInContract: shell?.totalHeightRatio >= 1.10 && shell?.totalHeightRatio <= 1.18,
    royalDoorWidthInContract: shell?.outerDoorWidth >= 1.05 && shell?.outerDoorWidth <= 1.12,
    purpleDoorRatioInContract: shell?.purpleDoorWidthHeightRatio >= 0.60 && shell?.purpleDoorWidthHeightRatio <= 0.70,
    fourFrontBays: shell?.frontDominantBayCount === 4,
    fourQuadrantSatellites: shell?.quadrantSatelliteCount === 4,
    allElevationsAuthored: ['front', 'left', 'right', 'rear'].every((view) => shell?.authoredElevations?.includes(view)),
    runtimeDrawCallsAtMost40: metrics.meshCount <= 40,
    trianglesAtMost55000: metrics.triangleCount <= 55000,
    allFirstGateEvidencePresent: files.length === 13,
  };
  const validation = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    constructionFamily: 'threejs-closed-cross-plan-honey-cathedral-shell',
    sourceHashes: { exactSource: await sha(SOURCE), exactCrop: await sha(CROP), multiviewAid: await sha(MULTIVIEW) },
    artifactHashes: { runtime: await sha(RUNTIME), buildContract: await sha(CONTRACT) },
    shell,
    metrics,
    checks,
    passed: Object.values(checks).every(Boolean),
    note: 'Deterministic structural validation authorizes independent visual review only; it is not likeness approval.',
  };
  await fs.writeFile(VALIDATION, `${JSON.stringify(validation, null, 2)}\n`, 'utf8');
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    status: 'frozen-awaiting-independent-quality-lord',
    constructionFamily: 'threejs-closed-cross-plan-honey-cathedral-shell',
    representation: 'deterministic CPU-projected evidence of the actual batched L3 high runtime mesh; no projection texture or facade card',
    sourceAuthority: validation.sourceHashes,
    runtime: { path: path.relative(ROOT, RUNTIME), sha256: validation.artifactHashes.runtime },
    buildContract: { path: path.relative(ROOT, CONTRACT), sha256: validation.artifactHashes.buildContract },
    cameras: { orbitDegrees: ORBITS, orbit: { width: 900, height: 900, fov: 35, radius: 8.8, target: [0, 2.3, 0.02] }, phone: { simulatedViewport: [390, 844], reviewCanvas: [900, 900], fov: 42, radius: 15.5, target: [0, 2.3, 0.02] } },
    metrics,
    views: files,
    builderApproval: null,
    gateInstruction: 'Review exact source and crop first, inspect 180 rear first, then all required views. Builder does not self-approve.',
  };
  await fs.writeFile(path.join(OUT, 'capture-manifest.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Rendered ${files.length} true-360 Palace evidence views to ${OUT}`);
  console.log(`Validation ${validation.passed ? 'PASS' : 'FAIL'}: ${VALIDATION}`);
} finally {
  await server.close();
}
