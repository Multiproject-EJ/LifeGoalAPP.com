import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { createServer } from 'vite';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const OUT = path.resolve(ROOT, process.argv[2] ?? 'work/island-visual-library/island-014-honeycomb-kingdom/evidence/honeyfall-gooey-world-v002-r03');
const SOURCE = path.resolve(ROOT, 'docs/visual-references/island-014-honeycomb-kingdom/014-source.png');
const RUNTIME = path.resolve(ROOT, 'src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts');
const RUNTIME_DEPENDENCIES = [
  'src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx',
  'src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts',
  'src/features/gamification/level-worlds/services/islandBoardLayout.ts',
  'src/features/gamification/level-worlds/dev/Island14RoyalCathedralV7.ts',
  'src/features/gamification/level-worlds/dev/Island14SatelliteLandmarksV2.ts',
  'src/features/gamification/level-worlds/dev/Island14HoneyWorldPresentationV2.ts',
].map((relativePath) => ({ relativePath, absolutePath: path.resolve(ROOT, relativePath) }));
const ORBITS = [0, 45, 90, 180, 270, 315];
const LIGHT = new THREE.Vector3(-0.52, 0.86, 0.62).normalize();
const EVIDENCE_POLYGON_BUDGET = {
  mission: 3_200,
  palace: 6_000,
  hatchery: 2_000,
  habit: 2_000,
  archives: 2_000,
  event: 2_000,
  honeyfall: 2_400,
  garden: 5_000,
  route: 2_500,
  atmosphere: 3_000,
  world: 4_000,
};

function evidenceCategory(object) {
  const name = object.name ?? '';
  const materialColor = object.material?.color instanceof THREE.Color ? object.material.color.getHex() : null;
  if (/CANONICAL_TILE|CANONICAL_36_TILE_ROUTE/u.test(name)) return 'route';
  if (/CLOUD|HAZE|DISTANT.*ISLET|COLONY_ISLET/u.test(name)) return 'atmosphere';
  if (/CORONATION|ROYAL_NECTAR|HONEYFALL_CROWN/u.test(name)) return 'mission';
  if (/CATHEDRAL_V7|JEWEL_HIVE|PALACE|ROYAL_HONEYCOMB/u.test(name)) return 'palace';
  if (/V2_NURSERY|HATCHERY|QUEENS_NURSERY/u.test(name)) return 'hatchery';
  if (/V2_POLLINATOR|HABIT|POLLINATOR/u.test(name)) return 'habit';
  if (/V2_ARCHIVES|ARCHIVES|HIVE_ARCHIVES/u.test(name)) return 'archives';
  if (/V2_TRIALS|NECTAR_TRIALS|NECTAR_(?!SUN|RESERVOIR|CONDUIT)/u.test(name)) return 'event';
  if (/HONEYFALL/u.test(name)) return 'honeyfall';
  if ([0x405f1e, 0xf38ab4, 0xfff2c7, 0x8f4ccc].includes(materialColor)) return 'garden';
  return 'world';
}

const sha = async (file) => createHash('sha256').update(await fs.readFile(file)).digest('hex');
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function cameraFor(degrees, width, height, mode = 'orbit', viewOptions = {}) {
  const phone = mode === 'phone';
  const mission = mode === 'mission';
  const route = mode === 'route';
  const landmark = mode === 'landmark';
  const target = viewOptions.target ?? (mission
    ? new THREE.Vector3(2.24, -2.05, 5.76)
    : phone
      ? new THREE.Vector3(0, -0.75, -0.05)
      : route
        ? new THREE.Vector3(0, 0.25, 0)
        : new THREE.Vector3(0, 1.35, 0.2));
  const camera = new THREE.PerspectiveCamera(mission || route ? 34 : landmark ? 32 : phone ? 43 : 40, width / height, 0.1, 120);
  const radius = viewOptions.radius ?? (mission ? 10.8 : route ? 9.2 : landmark ? 5.4 : phone ? 27.8 : 18.5);
  const angle = THREE.MathUtils.degToRad(degrees);
  camera.position.set(
    target.x + Math.sin(angle) * radius,
    viewOptions.cameraY ?? (mission ? 7.4 : route ? 7.2 : landmark ? target.y + 2.35 : phone ? 15.8 : 10.8),
    target.z + Math.cos(angle) * radius,
  );
  camera.lookAt(target);
  if (phone) camera.zoom = 1.16;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  return camera;
}

function createRouteBorderGeometry(tileGeometry) {
  const edges = new THREE.EdgesGeometry(tileGeometry, 28);
  const positions = edges.getAttribute('position');
  const segments = [];
  const up = new THREE.Vector3(0, 1, 0);
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const midpoint = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  for (let index = 0; index < positions.count; index += 2) {
    start.fromBufferAttribute(positions, index);
    end.fromBufferAttribute(positions, index + 1);
    const length = start.distanceTo(end);
    if (length <= 0.001) continue;
    midpoint.copy(start).add(end).multiplyScalar(0.5);
    direction.copy(end).sub(start).normalize();
    quaternion.setFromUnitVectors(up, direction);
    matrix.compose(midpoint, quaternion, new THREE.Vector3(1, 1, 1));
    const segment = new THREE.CylinderGeometry(0.018, 0.018, length, 4, 1, false);
    segment.applyMatrix4(matrix);
    segments.push(segment);
  }
  edges.dispose();
  const merged = mergeGeometries(segments, false);
  segments.forEach((segment) => segment.dispose());
  if (!merged) throw new Error('Unable to build canonical route border geometry');
  return merged;
}

function screen(point, camera, width, height) {
  const projected = point.clone().project(camera);
  return [(projected.x * 0.5 + 0.5) * width, (-projected.y * 0.5 + 0.5) * height, projected.z];
}

function materialRgb(material, light, materialsOn) {
  if (!materialsOn) {
    const clay = new THREE.Color(0xd8ad55).multiplyScalar(0.42 + light * 0.66);
    clay.setRGB(THREE.MathUtils.clamp(clay.r, 0, 1), THREE.MathUtils.clamp(clay.g, 0, 1), THREE.MathUtils.clamp(clay.b, 0, 1)).convertLinearToSRGB();
    return [clay.r, clay.g, clay.b];
  }
  const source = material?.color instanceof THREE.Color ? material.color : new THREE.Color(0xb77924);
  const color = source.clone().multiplyScalar(0.27 + light * 0.86);
  if (material?.emissive instanceof THREE.Color && material.emissiveIntensity > 0) {
    color.add(material.emissive.clone().multiplyScalar(Math.min(0.54, material.emissiveIntensity * 0.24)));
  }
  color.setRGB(THREE.MathUtils.clamp(color.r, 0, 1), THREE.MathUtils.clamp(color.g, 0, 1), THREE.MathUtils.clamp(color.b, 0, 1)).convertLinearToSRGB();
  return [color.r, color.g, color.b];
}

function renderSvg(root, degrees, options) {
  const { width, height, materialsOn, mode = 'orbit' } = options;
  const camera = cameraFor(degrees, width, height, mode, options);
  root.updateMatrixWorld(true);
  const triangles = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const instanceMatrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible || !object.geometry) return;
    const positions = object.geometry.getAttribute('position');
    if (!positions) return;
    const index = object.geometry.index;
    const triangleCount = index ? index.count / 3 : positions.count / 3;
    const instanceCount = object instanceof THREE.InstancedMesh ? object.count : 1;
    for (let instanceIndex = 0; instanceIndex < instanceCount; instanceIndex += 1) {
      if (object instanceof THREE.InstancedMesh) {
        object.getMatrixAt(instanceIndex, instanceMatrix);
        worldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);
      } else {
        worldMatrix.copy(object.matrixWorld);
      }
      for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
        const read = (offset) => index ? index.getX(triangleIndex * 3 + offset) : triangleIndex * 3 + offset;
        a.fromBufferAttribute(positions, read(0)).applyMatrix4(worldMatrix);
        b.fromBufferAttribute(positions, read(1)).applyMatrix4(worldMatrix);
        c.fromBufferAttribute(positions, read(2)).applyMatrix4(worldMatrix);
        const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
        toCamera.copy(camera.position).sub(centroid);
        const facing = normal.dot(toCamera);
        if (facing <= 0.001 && object.material?.side !== THREE.DoubleSide) continue;
        if (facing < 0) normal.negate();
        const projected = [screen(a, camera, width, height), screen(b, camera, width, height), screen(c, camera, width, height)];
        if (projected.every((point) => point[2] < -1 || point[2] > 1)) continue;
        const screenArea = Math.abs(
          (projected[1][0] - projected[0][0]) * (projected[2][1] - projected[0][1])
          - (projected[2][0] - projected[0][0]) * (projected[1][1] - projected[0][1]),
        ) * 0.5;
        if (screenArea < 0.12) continue;
        const depth = centroid.clone().applyMatrix4(camera.matrixWorldInverse).z;
        const light = THREE.MathUtils.clamp(normal.dot(LIGHT) * 0.5 + 0.5, 0.12, 1);
        const [r, g, blue] = materialRgb(object.material, light, materialsOn);
        triangles.push({
          depth,
          screenArea,
          evidenceCategory: evidenceCategory(object),
          opacity: materialsOn && object.material?.transparent ? Math.max(0.68, object.material.opacity ?? 1) : 1,
          fill: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(blue * 255)})`,
          points: projected.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
        });
      }
    }
  });
  const retainedTriangles = [];
  for (const [category, budget] of Object.entries(EVIDENCE_POLYGON_BUDGET)) {
    const categoryTriangles = triangles
      .filter((triangle) => triangle.evidenceCategory === category)
      .sort((left, right) => right.screenArea - left.screenArea)
      .slice(0, budget);
    retainedTriangles.push(...categoryTriangles);
  }
  retainedTriangles.sort((left, right) => left.depth - right.depth);
  const polygons = retainedTriangles.map((triangle) => `<polygon points="${triangle.points}" fill="${triangle.fill}" fill-opacity="${triangle.opacity.toFixed(3)}" stroke="${materialsOn ? '#4c1d05' : '#70511d'}" stroke-opacity="${materialsOn ? '0.12' : '0.28'}" stroke-width="0.18" stroke-linejoin="round"/>`).join('\n');
  const label = mode === 'mission'
    ? 'Great Honeyfall stage 4 · travelling nectar + hex network + garden bloom + royal honeyburst'
    : mode === 'landmark'
      ? `Pollinator Yard isolated actual geometry · ${String(degrees).padStart(3, '0')}° · materials ${materialsOn ? 'on' : 'off'}`
    : `actual Island 014 world geometry · ${String(degrees).padStart(3, '0')}° · materials ${materialsOn ? 'on' : 'off'}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><radialGradient id="bg" cx="50%" cy="30%" r="78%"><stop offset="0" stop-color="#2b79ad"/><stop offset="0.6" stop-color="#123857"/><stop offset="1" stop-color="#06131f"/></radialGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <ellipse cx="${width / 2}" cy="${height * 0.88}" rx="${width * 0.34}" ry="${mode === 'phone' ? 24 : 42}" fill="#030912" opacity="0.42"/>
  ${polygons}
  <text x="18" y="${height - 18}" fill="#f8e8bd" opacity="0.82" font-family="system-ui,sans-serif" font-size="${mode === 'phone' ? 11 : 14}">${xml(label)}</text>
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
  <rect x="${(x - 11).toFixed(2)}" y="${(y - 11).toFixed(2)}" width="${(390 * scale + 22).toFixed(2)}" height="${(844 * scale + 22).toFixed(2)}" rx="28" fill="#02060b" stroke="#d99b27" stroke-width="3"/>
  <defs><clipPath id="phone-screen-clip"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(390 * scale).toFixed(2)}" height="${(844 * scale).toFixed(2)}" rx="18"/></clipPath></defs>
  <g clip-path="url(#phone-screen-clip)"><g transform="translate(${x.toFixed(4)} ${y.toFixed(4)}) scale(${scale})">${inner}</g></g>
  <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(390 * scale).toFixed(2)}" height="${(150 * scale).toFixed(2)}" fill="#07111e" opacity="0.08" stroke="#f4c04d" stroke-opacity="0.22"/>
  <rect x="${x.toFixed(2)}" y="${(y + (844 - 150) * scale).toFixed(2)}" width="${(390 * scale).toFixed(2)}" height="${(150 * scale).toFixed(2)}" fill="#07111e" opacity="0.08" stroke="#f4c04d" stroke-opacity="0.22"/>
  <text x="24" y="876" fill="#f8e8bd" opacity="0.76" font-family="system-ui,sans-serif" font-size="14">390×844 source-return phone composition proof</text>
</svg>`;
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
  const worldModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/Island14HoneycombKingdomThreeWorld.ts');
  const contractModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/dev/island5ThreePilotContract.ts');
  const boardLayoutModule = await server.ssrLoadModule('/src/features/gamification/level-worlds/services/islandBoardLayout.ts');
  const materials = worldModule.createIsland14HoneycombMaterials();
  const scene = new THREE.Scene();
  const ambience = worldModule.createIsland14HoneycombLivingAmbience(scene, contractModule.ISLAND_3D_QUALITY_PROFILES.high, materials);
  for (const landmark of contractModule.ISLAND_5_LANDMARKS) {
    const model = worldModule.buildIsland14HoneycombLandmark(landmark, 3, 'high', materials);
    ambience.root.add(model);
  }
  // Render the exact canonical 36-stop route used by the live world. The
  // transforms and trapezoid mesh data come from the same production helpers;
  // this is evidence of the real board contract rather than an artistic proxy.
  const tileTransforms = contractModule.buildIsland5TileTransforms(boardLayoutModule.TILE_ANCHORS_36);
  const tileMeshData = contractModule.buildIsland3DRadialTileMeshData(tileTransforms.length);
  const tileGeometry = new THREE.BufferGeometry();
  tileGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tileMeshData.positions, 3));
  tileGeometry.setIndex(Array.from(tileMeshData.indices));
  const routeGeometry = tileGeometry.toNonIndexed();
  tileGeometry.dispose();
  routeGeometry.computeVertexNormals();
  const routeMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xffedbd, roughness: 0.62, metalness: 0.03 }),
    new THREE.MeshStandardMaterial({ color: 0xe7a31d, roughness: 0.4, metalness: 0.28, emissive: 0x7a3d05, emissiveIntensity: 0.08 }),
    new THREE.MeshStandardMaterial({ color: 0xffcf4e, roughness: 0.29, metalness: 0.58, emissive: 0x9d5107, emissiveIntensity: 0.18 }),
  ];
  const routeBorderGeometry = createRouteBorderGeometry(routeGeometry);
  const routeBorderMaterial = new THREE.MeshBasicMaterial({ color: 0x5b2605 });
  const routeRoot = new THREE.Group();
  routeRoot.name = 'ISLAND_14_CANONICAL_36_TILE_ROUTE_EVIDENCE';
  for (const transform of tileTransforms) {
    const tile = new THREE.Mesh(routeGeometry, routeMaterials[transform.isKeyTile ? 2 : transform.index % 2]);
    tile.name = `ISLAND_14_CANONICAL_TILE_${String(transform.index).padStart(2, '0')}`;
    tile.position.set(transform.position[0], transform.position[1] + 0.08, transform.position[2]);
    tile.rotation.y = transform.rotationYRad;
    const border = new THREE.Mesh(routeBorderGeometry, routeBorderMaterial);
    border.name = `ISLAND_14_CANONICAL_TILE_${String(transform.index).padStart(2, '0')}_GILDED_BORDER`;
    border.position.copy(tile.position);
    border.position.y += 0.006;
    border.rotation.copy(tile.rotation);
    routeRoot.add(tile, border);
  }
  ambience.root.add(routeRoot);
  ambience.setGreatHoneyfallStage?.(4, false);
  ambience.animate(9.5);
  ambience.root.updateMatrixWorld(true);

  const views = [];
  for (const degrees of ORBITS) {
    const file = `orbit-${String(degrees).padStart(3, '0')}-materials-on.svg`;
    await fs.writeFile(path.join(OUT, file), renderSvg(ambience.root, degrees, { width: 900, height: 900, materialsOn: true }), 'utf8');
    views.push({ id: file.replace(/\.svg$/u, ''), degrees, mode: 'materials-on', file });
  }
  const clayFile = 'orbit-180-materials-off.svg';
  await fs.writeFile(path.join(OUT, clayFile), renderSvg(ambience.root, 180, { width: 900, height: 900, materialsOn: false }), 'utf8');
  views.push({ id: 'orbit-180-materials-off', degrees: 180, mode: 'materials-off', file: clayFile });
  const pollinatorSource = ambience.root.getObjectByName('ISLAND_14_V2_POLLINATOR_YARD');
  if (!pollinatorSource) throw new Error('Pollinator Yard root missing from Island 014 world');
  const pollinatorRoot = pollinatorSource.clone(true);
  pollinatorRoot.position.set(0, 0, 0);
  pollinatorRoot.rotation.set(0, 0, 0);
  pollinatorRoot.scale.set(1, 1, 1);
  pollinatorRoot.updateMatrixWorld(true);
  const pollinatorBounds = new THREE.Box3().setFromObject(pollinatorRoot);
  const pollinatorTarget = pollinatorBounds.getCenter(new THREE.Vector3());
  const pollinatorSize = pollinatorBounds.getSize(new THREE.Vector3());
  const pollinatorRadius = Math.max(pollinatorSize.x, pollinatorSize.y, pollinatorSize.z) * 1.72;
  for (const degrees of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const file = `pollinator-${String(degrees).padStart(3, '0')}-materials-on.svg`;
    await fs.writeFile(path.join(OUT, file), renderSvg(pollinatorRoot, degrees, {
      width: 900,
      height: 900,
      materialsOn: true,
      mode: 'landmark',
      target: pollinatorTarget,
      radius: pollinatorRadius,
      cameraY: pollinatorTarget.y + pollinatorSize.y * 0.68,
    }), 'utf8');
    views.push({ id: file.replace(/\.svg$/u, ''), degrees, mode: 'pollinator-isolated-materials-on', file });
  }
  const pollinatorClayFile = 'pollinator-180-materials-off.svg';
  await fs.writeFile(path.join(OUT, pollinatorClayFile), renderSvg(pollinatorRoot, 180, {
    width: 900,
    height: 900,
    materialsOn: false,
    mode: 'landmark',
    target: pollinatorTarget,
    radius: pollinatorRadius,
    cameraY: pollinatorTarget.y + pollinatorSize.y * 0.68,
  }), 'utf8');
  views.push({ id: 'pollinator-180-materials-off', degrees: 180, mode: 'pollinator-isolated-materials-off', file: pollinatorClayFile });
  const missionFile = 'great-honeyfall-stage-4-close.svg';
  const greatHoneyfallRoot = ambience.root.getObjectByName('ISLAND_14_GREAT_HONEYFALL_CORONATION');
  if (!greatHoneyfallRoot) throw new Error('Great Honeyfall presentation root missing from Island 014 world');
  await fs.writeFile(path.join(OUT, missionFile), renderSvg(greatHoneyfallRoot, 35, { width: 900, height: 900, materialsOn: true, mode: 'mission' }), 'utf8');
  views.push({ id: 'great-honeyfall-stage-4-close', degrees: 0, mode: 'mission-close', file: missionFile });
  const routeFile = 'canonical-36-tile-route.svg';
  await fs.writeFile(path.join(OUT, routeFile), renderSvg(routeRoot, 0, { width: 900, height: 900, materialsOn: true, mode: 'route' }), 'utf8');
  views.push({ id: 'canonical-36-tile-route', degrees: 0, mode: 'canonical-route', file: routeFile });
  await fs.writeFile(path.join(OUT, 'phone-overview.svg'), renderPhoneReviewSvg(ambience.root), 'utf8');
  views.push({ id: 'phone-overview', degrees: 0, mode: 'phone-overview', file: 'phone-overview.svg' });

  for (const view of views) {
    view.sha256 = await sha(path.join(OUT, view.file));
    view.rasterFile = view.file.replace(/\.svg$/u, '.png');
    await rasterize(path.join(OUT, view.file), path.join(OUT, view.rasterFile), rasterDir);
    view.rasterSha256 = await sha(path.join(OUT, view.rasterFile));
  }
  await fs.rm(rasterDir, { recursive: true });
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    status: 'candidate-awaiting-source-return-review',
    source: { path: path.relative(ROOT, SOURCE), sha256: await sha(SOURCE) },
    runtime: { path: path.relative(ROOT, RUNTIME), sha256: await sha(RUNTIME) },
    runtimeDependencies: await Promise.all(RUNTIME_DEPENDENCIES.map(async ({ relativePath, absolutePath }) => ({
      path: relativePath,
      sha256: await sha(absolutePath),
    }))),
    missionStage: 4,
    evidenceMethod: 'CPU triangle projection of actual Three.js meshes, exact canonical 36-tile transforms/geometry, and InstancedMesh transforms; materials approximated without WebGL',
    renderLimit: `Does not reproduce physical refraction, environment reflections, post-processing, HUD/controller overlays, or GPU transparency ordering. Screen-space evidence uses semantic polygon budgets so the canonical route, all five named landmarks, and the Great Honeyfall remain represented.`,
    views,
  };
  await fs.writeFile(path.join(OUT, 'capture-manifest.v1.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ out: path.relative(ROOT, OUT), viewCount: views.length, sourceSha256: manifest.source.sha256, runtimeSha256: manifest.runtime.sha256 }, null, 2));
} finally {
  await server.close();
}
