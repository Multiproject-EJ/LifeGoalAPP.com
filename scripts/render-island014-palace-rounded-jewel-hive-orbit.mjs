import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { createServer } from 'vite';
import * as THREE from 'three';

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const DEFAULT_OUT = path.resolve(ROOT, 'work/island-visual-library/island-014-honeycomb-kingdom/evidence/palace-rounded-jewel-hive-cathedral-v001-r01');
const OUT = path.resolve(ROOT, process.argv[2] ?? path.relative(ROOT, DEFAULT_OUT));
const IS_FREEZE = OUT === DEFAULT_OUT;
const VALIDATION = path.resolve(ROOT, '.gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-rounded-jewel-hive-cathedral/build-validation.v1.json');
const SOURCE = path.resolve(ROOT, 'docs/visual-references/island-014-honeycomb-kingdom/014-source.png');
const CROP = path.resolve(ROOT, '.gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-lower-cathedral-body/isolation/derived-crops/palace-visible-source-crop-v001.png');
const MULTIVIEW = path.resolve(ROOT, '.gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-front-facade/isolation/generated-references/palace-multiview-turnaround-v001.png');
const RUNTIME = path.resolve(ROOT, 'src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts');
const CONTRACT = path.resolve(ROOT, '.gauntlet/island-014-honeycomb-kingdom-parts/parts/palace-rounded-jewel-hive-cathedral/build-contract.v1.json');
const ORBITS = [0, 45, 90, 135, 180, 225, 270, 315];
const LIGHT = new THREE.Vector3(-0.52, 0.86, 0.62).normalize();
const EXPECTED = {
  source: '3c1dfccaf52ee596a6488e844d53b51414693d6dbd400513ee52fa06132a580e',
  crop: 'f0cb00739957d5789199a28d0bc4c9d770e346dd836bda3a112c7061a518b932',
  multiview: 'cf8486e879a188b3a00db9b1e65bd99b6b940f567161664b4f8136734f9425a3',
  contract: '8c036996bb3b545364af21a2a5cc333b5a5edc6b10971b1c165b5dd103dff46d',
};

const sha = async (file) => createHash('sha256').update(await fs.readFile(file)).digest('hex');
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function cameraFor(degrees, width, height, mode = 'orbit') {
  const close = mode === 'close';
  const phone = mode === 'phone';
  const honey = mode === 'honey';
  const target = honey
    ? new THREE.Vector3(-1.13, 1.48, 1.18)
    : new THREE.Vector3(0, close ? 2.22 : 2.48, close ? 0.34 : 0.02);
  const camera = new THREE.PerspectiveCamera(honey ? 27 : close ? 31 : phone ? 42 : 35, width / height, 0.1, 100);
  if (honey) {
    camera.position.set(-1.02, 2.05, 4.55);
  } else {
    const radius = close ? 6.55 : phone ? 15.3 : 9.35;
    const angle = THREE.MathUtils.degToRad(degrees);
    camera.position.set(target.x + Math.sin(angle) * radius, close ? 4.20 : phone ? 9.15 : 5.72, target.z + Math.cos(angle) * radius);
  }
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  return camera;
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
  const color = source.clone().multiplyScalar(0.29 + light * 0.84);
  if (material?.emissive instanceof THREE.Color && material.emissiveIntensity > 0) {
    color.add(material.emissive.clone().multiplyScalar(Math.min(0.42, material.emissiveIntensity * 0.28)));
  }
  color.setRGB(THREE.MathUtils.clamp(color.r, 0, 1), THREE.MathUtils.clamp(color.g, 0, 1), THREE.MathUtils.clamp(color.b, 0, 1)).convertLinearToSRGB();
  return [color.r, color.g, color.b];
}

function renderSvg(root, degrees, options) {
  const { width, height, materialsOn, mode = 'orbit' } = options;
  const camera = cameraFor(degrees, width, height, mode);
  root.updateMatrixWorld(true);
  const triangles = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible || !object.geometry) return;
    const positions = object.geometry.getAttribute('position');
    if (!positions) return;
    const index = object.geometry.index;
    const count = index ? index.count / 3 : positions.count / 3;
    for (let triangleIndex = 0; triangleIndex < count; triangleIndex += 1) {
      const read = (offset) => index ? index.getX(triangleIndex * 3 + offset) : triangleIndex * 3 + offset;
      a.fromBufferAttribute(positions, read(0)).applyMatrix4(object.matrixWorld);
      b.fromBufferAttribute(positions, read(1)).applyMatrix4(object.matrixWorld);
      c.fromBufferAttribute(positions, read(2)).applyMatrix4(object.matrixWorld);
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      toCamera.copy(camera.position).sub(centroid);
      if (normal.dot(toCamera) <= 0.001) continue;
      const projected = [screen(a, camera, width, height), screen(b, camera, width, height), screen(c, camera, width, height)];
      if (projected.every((point) => point[2] < -1 || point[2] > 1)) continue;
      const depth = centroid.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const light = THREE.MathUtils.clamp(normal.dot(LIGHT) * 0.5 + 0.5, 0.12, 1);
      const [r, g, blue] = materialRgb(object.material, light, materialsOn);
      triangles.push({
        depth,
        opacity: materialsOn && object.material?.transparent ? Math.max(0.80, object.material.opacity ?? 1) : 1,
        fill: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(blue * 255)})`,
        points: projected.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
      });
    }
  });
  triangles.sort((left, right) => left.depth - right.depth);
  const polygons = triangles.map((triangle) => `<polygon points="${triangle.points}" fill="${triangle.fill}" fill-opacity="${triangle.opacity.toFixed(3)}" stroke="${materialsOn ? '#4c1d05' : '#70511d'}" stroke-opacity="${materialsOn ? '0.18' : '0.34'}" stroke-width="0.22" stroke-linejoin="round"/>`).join('\n');
  const floorY = mode === 'phone' ? height * 0.80 : mode === 'honey' ? height * 0.91 : height * 0.87;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><radialGradient id="bg" cx="50%" cy="34%" r="74%"><stop offset="0" stop-color="#416884"/><stop offset="0.58" stop-color="#17334f"/><stop offset="1" stop-color="#071321"/></radialGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <ellipse cx="${width / 2}" cy="${floorY}" rx="${mode === 'honey' ? width * 0.44 : width * 0.34}" ry="${mode === 'phone' ? 28 : 45}" fill="#030912" opacity="0.48"/>
  ${polygons}
  <text x="18" y="${height - 18}" fill="#dbe8f4" opacity="0.70" font-family="system-ui,sans-serif" font-size="${mode === 'phone' ? 11 : 14}">${xml(mode === 'honey' ? 'actual runtime honey material proof · attached shelf + curtain + strands + drops' : `actual rounded jewel-hive runtime mesh · ${String(degrees).padStart(3, '0')}° · materials ${materialsOn ? 'on' : 'off'}`)}</text>
</svg>`;
}

function renderPhoneReviewSvg(root) {
  const portrait = renderSvg(root, 0, { width: 390, height: 844, materialsOn: true, mode: 'phone' });
  const inner = portrait.replace(/^<\?xml[^>]*>\s*/u, '').replace(/^<svg[^>]*>/u, '').replace(/<\/svg>\s*$/u, '');
  const scale = 0.92;
  const x = (900 - 390 * scale) / 2;
  const y = (900 - 844 * scale) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <rect width="900" height="900" fill="#07111e"/>
  <rect x="${(x - 11).toFixed(2)}" y="${(y - 11).toFixed(2)}" width="${(390 * scale + 22).toFixed(2)}" height="${(844 * scale + 22).toFixed(2)}" rx="28" fill="#02060b" stroke="#92702b" stroke-width="3"/>
  <g transform="translate(${x.toFixed(4)} ${y.toFixed(4)}) scale(${scale})">${inner}</g>
  <text x="24" y="876" fill="#dbe8f4" opacity="0.72" font-family="system-ui,sans-serif" font-size="14">390×844 isolated phone-scale readability proof</text>
</svg>`;
}

function meshMetrics(root) {
  let meshCount = 0;
  let triangleCount = 0;
  let openPlaneCount = 0;
  const forbiddenLiveNames = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const positions = object.geometry?.getAttribute('position');
    if (positions) triangleCount += object.geometry.index ? object.geometry.index.count / 3 : positions.count / 3;
    if (object.geometry instanceof THREE.PlaneGeometry) openPlaneCount += 1;
    if (/PROJECTION|FACADE_CARD|TRUE_360|CROSS_PLAN|DOME_SHELL|ROSE_BACKPLANE|SIMPLE_CONE/i.test(object.name ?? '')) forbiddenLiveNames.push(object.name);
  });
  return { meshCount, triangleCount, openPlaneCount, forbiddenLiveNames };
}

async function rasterize(svgPath, pngPath, rasterDir) {
  await execFileAsync('/usr/bin/qlmanage', ['-t', '-s', '900', '-o', rasterDir, svgPath], { maxBuffer: 1024 * 1024 * 4 });
  await fs.copyFile(path.join(rasterDir, `${path.basename(svgPath)}.png`), pngPath);
}

const existing = await fs.readdir(OUT).catch(() => []);
if (existing.length > 0) throw new Error(`Immutable evidence target is not empty: ${OUT}`);
await fs.mkdir(OUT, { recursive: true });
const rasterDir = path.join(OUT, '.raster-tmp');
await fs.mkdir(rasterDir, { recursive: true });

const server = await createServer({ appType: 'custom', configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false, host: '127.0.0.1' } });
try {
  const module = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts');
  const palace = module.buildIsland14HoneycombLandmark(
    { id: 'boss', label: 'Royal Honeycomb Palace', subtitle: 'Boss', position: [0, 0, 0], accent: 0xf6ba22 },
    3,
    'high',
    module.createIsland14HoneycombMaterials(),
  );
  const views = [];
  for (const degrees of ORBITS) {
    const file = `orbit-${String(degrees).padStart(3, '0')}-materials-on.svg`;
    await fs.writeFile(path.join(OUT, file), renderSvg(palace, degrees, { width: 900, height: 900, materialsOn: true }), 'utf8');
    views.push({ id: file.replace(/\.svg$/u, ''), degrees, mode: 'materials-on', file });
  }
  for (const degrees of [0, 45, 315]) {
    const file = `orbit-${String(degrees).padStart(3, '0')}-materials-off.svg`;
    await fs.writeFile(path.join(OUT, file), renderSvg(palace, degrees, { width: 900, height: 900, materialsOn: false }), 'utf8');
    views.push({ id: file.replace(/\.svg$/u, ''), degrees, mode: 'materials-off', file });
  }
  await fs.writeFile(path.join(OUT, 'front-close-materials-on.svg'), renderSvg(palace, 0, { width: 900, height: 900, materialsOn: true, mode: 'close' }), 'utf8');
  views.push({ id: 'front-close-materials-on', degrees: 0, mode: 'materials-on-close', file: 'front-close-materials-on.svg' });
  await fs.writeFile(path.join(OUT, 'front-close-honey-material-proof.svg'), renderSvg(palace, 0, { width: 900, height: 900, materialsOn: true, mode: 'honey' }), 'utf8');
  views.push({ id: 'front-close-honey-material-proof', degrees: 0, mode: 'honey-material-proof', file: 'front-close-honey-material-proof.svg' });
  await fs.writeFile(path.join(OUT, 'phone-overview.svg'), renderPhoneReviewSvg(palace), 'utf8');
  views.push({ id: 'phone-overview', degrees: 0, mode: 'phone-overview', file: 'phone-overview.svg' });

  for (const view of views) {
    view.sha256 = await sha(path.join(OUT, view.file));
    view.rasterFile = view.file.replace(/\.svg$/u, '.png');
    await rasterize(path.join(OUT, view.file), path.join(OUT, view.rasterFile), rasterDir);
    view.rasterSha256 = await sha(path.join(OUT, view.rasterFile));
  }
  await fs.rm(rasterDir, { recursive: true });

  const sourceHashes = { exactSource: await sha(SOURCE), exactCrop: await sha(CROP), sideRearInferenceAid: await sha(MULTIVIEW) };
  const artifactHashes = { runtime: await sha(RUNTIME), buildContract: await sha(CONTRACT), renderer: await sha(import.meta.filename) };
  const metrics = meshMetrics(palace);
  const cathedral = palace.userData.roundedJewelHiveCathedral;
  const checks = {
    sourceHashMatches: sourceHashes.exactSource === EXPECTED.source,
    cropHashMatches: sourceHashes.exactCrop === EXPECTED.crop,
    multiviewHashMatches: sourceHashes.sideRearInferenceAid === EXPECTED.multiview,
    contractHashMatches: artifactHashes.buildContract === EXPECTED.contract,
    correctConstructionFamily: cathedral?.constructionFamily === 'threejs-rounded-layered-jewel-hive-cathedral',
    subassemblyOrderComplete: cathedral?.subassemblyOrder?.length === 8,
    runtimeProjectionCountZero: cathedral?.runtimeProjectionCount === 0,
    facadeCardCountZero: cathedral?.facadeCardCount === 0,
    simpleConeRoofCountZero: cathedral?.simpleConeRoofCount === 0,
    smoothOnionRoofCountZero: cathedral?.smoothOnionRoofCount === 0,
    forbiddenLiveMeshCountZero: metrics.forbiddenLiveNames.length === 0,
    openPlaneCountZero: metrics.openPlaneCount === 0,
    footprintDepthRatioInContract: cathedral?.footprintDepthRatio >= 0.72 && cathedral?.footprintDepthRatio <= 0.82,
    totalHeightInContract: cathedral?.totalHeight >= 3.72 && cathedral?.totalHeight <= 3.99,
    royalDoorWidthInContract: cathedral?.outerDoorWidth >= 1.05 && cathedral?.outerDoorWidth <= 1.12,
    purpleDoorWidthInContract: cathedral?.purpleDoorWidth >= 0.45 && cathedral?.purpleDoorWidth <= 0.50,
    embeddedRoseWidthInContract: cathedral?.embeddedRoseWidth >= 0.76 && cathedral?.embeddedRoseWidth <= 0.84,
    fourFrontBays: cathedral?.frontDominantBayCount === 4,
    frontCoverageAtLeast065: cathedral?.frontExoskeletonCoverage >= 0.65,
    sideCoverageAtLeast040: cathedral?.sideExoskeletonCoverage >= 0.40,
    fiveScallopedCupolas: cathedral?.scallopedCupolaCount === 5,
    fiveAttachedHoneyCurtains: cathedral?.honeyCurtainCount === 5,
    authoredHoneyAssembly: cathedral?.honeyAssembly === 'attached-shelf+sagging-curtain+tapering-strands+convex-highlight+weighted-teardrops',
    allElevationsAuthored: ['front', 'left', 'right', 'rear'].every((view) => cathedral?.authoredElevations?.includes(view)),
    runtimeDrawCallsAtMost64: metrics.meshCount <= 64,
    trianglesAtMost120000: metrics.triangleCount <= 120000,
    allRequiredEvidencePresent: views.length === 14,
    allRasterEvidencePresent: views.every((view) => Boolean(view.rasterSha256)),
  };
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    status: 'frozen-awaiting-independent-quality-lord',
    constructionFamily: cathedral.constructionFamily,
    representation: 'actual batched L3 high runtime mesh; rounded closed volumes, thick jewel tracery, scalloped cage cupolas, and attached honey assemblies; zero image projection',
    sourceAuthority: sourceHashes,
    runtime: { path: path.relative(ROOT, RUNTIME), sha256: artifactHashes.runtime },
    buildContract: { path: path.relative(ROOT, CONTRACT), sha256: artifactHashes.buildContract },
    renderer: { path: path.relative(ROOT, import.meta.filename), sha256: artifactHashes.renderer },
    cameras: {
      orbitDegrees: ORBITS,
      orbit: { width: 900, height: 900, fov: 35, radius: 9.35, target: [0, 2.48, 0.02] },
      honeyProof: { width: 900, height: 900, fov: 27, position: [-1.02, 2.05, 4.55], target: [-1.13, 1.48, 1.18] },
      phone: { simulatedViewport: [390, 844], reviewCanvas: [900, 900], fov: 42, radius: 15.3, target: [0, 2.48, 0.02] },
    },
    cathedral,
    metrics,
    views,
    builderApproval: null,
    gateInstruction: 'Review exact source and crop first, then least-flattering rear/side, front obliques, honey proof, close front, clay, and phone. Builder does not self-approve.',
  };
  await fs.writeFile(path.join(OUT, 'capture-manifest.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const verifiedViews = [];
  for (const view of views) {
    const svgSha256 = await sha(path.join(OUT, view.file));
    const rasterSha256 = await sha(path.join(OUT, view.rasterFile));
    verifiedViews.push({ id: view.id, svgSha256, rasterSha256, svgMatches: svgSha256 === view.sha256, rasterMatches: rasterSha256 === view.rasterSha256 });
  }
  const verification = {
    runtimeSha256: await sha(RUNTIME),
    runtimeMatches: await sha(RUNTIME) === artifactHashes.runtime,
    captureManifestSha256: await sha(path.join(OUT, 'capture-manifest.v1.json')),
    evidenceFileCount: verifiedViews.length * 2,
    evidenceMismatchCount: verifiedViews.filter((view) => !view.svgMatches || !view.rasterMatches).length,
    views: verifiedViews,
  };
  const validation = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    status: 'structurally-validated-awaiting-independent-visual-review',
    constructionFamily: cathedral.constructionFamily,
    sourceHashes,
    artifactHashes,
    cathedral,
    metrics,
    checks,
    verification,
    passed: Object.values(checks).every(Boolean) && verification.runtimeMatches && verification.evidenceMismatchCount === 0 && verification.evidenceFileCount === 28,
    note: 'Deterministic structural validation and hash verification authorize independent visual review only; they are not likeness approval.',
  };
  if (IS_FREEZE) {
    await fs.mkdir(path.dirname(VALIDATION), { recursive: true });
    await fs.writeFile(VALIDATION, `${JSON.stringify(validation, null, 2)}\n`, 'utf8');
  } else {
    await fs.writeFile(path.join(OUT, 'draft-validation.v1.json'), `${JSON.stringify(validation, null, 2)}\n`, 'utf8');
  }
  console.log(`Rendered and rasterized ${views.length} rounded jewel-hive evidence views to ${OUT}`);
  console.log(`Validation ${validation.passed ? 'PASS' : 'FAIL'} · ${metrics.meshCount} draw calls · ${metrics.triangleCount} triangles · ${verification.evidenceFileCount} verified evidence files`);
  if (!validation.passed) process.exitCode = 1;
} finally {
  await server.close();
}
