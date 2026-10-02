import * as THREE from 'three';
import {
  STORMFRONT_CINEMATIC,
  resolveStormfrontCinematicFrame,
  type StormfrontCinematicBeat,
} from '../services/island2StormfrontCinematic';

const smooth = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const segment = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

/** Deterministic pseudo-random so every replay (and screenshot) matches. */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * A jagged lightning bolt as a flat ribbon facing `toCamera`, with branches.
 * Lines are 1px in WebGL, so ribbons keep bolts readable on phones.
 */
function createBoltGeometry(from: THREE.Vector3, to: THREE.Vector3, width: number, toCamera: THREE.Vector3, random: () => number, branches: number, branchReach = 0.45) {
  const positions: number[] = [];
  const addRibbon = (points: THREE.Vector3[], w: number) => {
    const side = new THREE.Vector3();
    const dir = new THREE.Vector3();
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      dir.subVectors(b, a).normalize();
      side.crossVectors(dir, toCamera).normalize();
      const wa = w * (1 - (i / points.length) * 0.55);
      const wb = w * (1 - ((i + 1) / points.length) * 0.55);
      const a1 = a.clone().addScaledVector(side, wa);
      const a2 = a.clone().addScaledVector(side, -wa);
      const b1 = b.clone().addScaledVector(side, wb);
      const b2 = b.clone().addScaledVector(side, -wb);
      positions.push(a1.x, a1.y, a1.z, a2.x, a2.y, a2.z, b1.x, b1.y, b1.z);
      positions.push(a2.x, a2.y, a2.z, b2.x, b2.y, b2.z, b1.x, b1.y, b1.z);
    }
  };
  const jag = (start: THREE.Vector3, end: THREE.Vector3, steps: number, spread: number) => {
    const points = [start.clone()];
    for (let i = 1; i < steps; i += 1) {
      const p = start.clone().lerp(end, i / steps);
      p.x += (random() - 0.5) * spread;
      p.z += (random() - 0.5) * spread;
      p.y += (random() - 0.5) * spread * 0.3;
      points.push(p);
    }
    points.push(end.clone());
    return points;
  };
  const length = from.distanceTo(to);
  const main = jag(from, to, 22, length * 0.06);
  addRibbon(main, width);
  for (let b = 0; b < branches; b += 1) {
    const start = main[2 + Math.floor(random() * (main.length - 5))];
    const end = start.clone().add(new THREE.Vector3((random() - 0.5) * length * branchReach, -length * (0.15 + random() * 0.2) * (branchReach / 0.45), (random() - 0.5) * length * branchReach));
    addRibbon(jag(start, end, 6, length * 0.05), width * 0.45);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function createStormSkyTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#0b1018');
  gradient.addColorStop(0.42, '#1d2633');
  gradient.addColorStop(0.5, '#3a4452');
  gradient.addColorStop(0.58, '#2a323d');
  gradient.addColorStop(1, '#141a22');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function sampleColor(root: THREE.Object3D, fallback: string) {
  let color: THREE.Color | null = null;
  root.traverse((node) => {
    if (color || !(node as THREE.Mesh).isMesh) return;
    const material = (node as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
    const first = Array.isArray(material) ? material[0] : material;
    if (first?.color) color = first.color.clone();
  });
  return color ?? new THREE.Color(fallback);
}

/**
 * Island 002 Stormfront cinematic. The storm rolls in, a cascading wall of
 * lightning sweeps towards the island and stops at the shore, the rain eases,
 * the sky starts to clear… then a massive strike hits the island centre and
 * pieces break off the four outer landmarks. Never writes gameplay state:
 * the strike is already committed and the landmarks show their pre-storm level
 * until the cinematic ends.
 */
export function createIsland2StormfrontCinematic(options: {
  scene: THREE.Scene;
  canvas: HTMLCanvasElement;
  start: { position: THREE.Vector3; target: THREE.Vector3; fov: number };
  /** Landmarks that lose pieces (the four outer ones). */
  damagedRoots: THREE.Object3D[];
  /** Every landmark root, used to find the island centre and size. */
  allRoots: THREE.Object3D[];
  /**
   * Island 002 opening ceremony: a short, bright, golden strike — no dark
   * build-up, rain or lightning wall; the strike lands ~1.2 s in and the
   * camera is back by ~5.5 s.
   */
  celebration?: boolean;
}) {
  const { scene, canvas, start, damagedRoots, allRoots } = options;
  const celebration = options.celebration === true;
  /** Celebration plays only the strike and its settle from the full timeline. */
  const CELEBRATION_TIME_OFFSET = STORMFRONT_CINEMATIC.boom - 1.2;
  const root = new THREE.Group();
  root.name = 'ISLAND_2_STORMFRONT_CINEMATIC';
  scene.add(root);
  const random = createRandom(20260930);

  // Island centre and radius from the landmark bounds.
  const islandBounds = new THREE.Box3();
  allRoots.forEach((entry) => islandBounds.expandByObject(entry));
  const centre = new THREE.Vector3();
  let radius = 14;
  let groundY = 0;
  if (!islandBounds.isEmpty()) {
    islandBounds.getCenter(centre);
    const size = islandBounds.getSize(new THREE.Vector3());
    radius = THREE.MathUtils.clamp(Math.max(size.x, size.z) * 0.62, 9, 30);
    groundY = islandBounds.min.y;
  }
  centre.y = groundY;

  // "Back" is the side the camera sits on; the storm comes from the far side.
  const back = new THREE.Vector3().subVectors(start.position, centre).setY(0);
  if (back.lengthSq() < 1e-4) back.set(0, 0, 1);
  back.normalize();
  const forward = back.clone().negate();
  const sideways = new THREE.Vector3(-forward.z, 0, forward.x);
  const wideEye = centre.clone().addScaledVector(back, radius * 2.35).add(new THREE.Vector3(0, radius * 0.95, 0));
  const wideTarget = centre.clone().addScaledVector(forward, radius * 0.9).add(new THREE.Vector3(0, radius * 0.35, 0));
  const boomEye = centre.clone().addScaledVector(back, radius * 1.9).add(new THREE.Vector3(0, radius * 0.75, 0)).addScaledVector(sideways, radius * 0.35);
  const boomTarget = centre.clone().add(new THREE.Vector3(0, radius * 0.18, 0));
  const toCamera = back.clone().add(new THREE.Vector3(0, 0.35, 0)).normalize();

  // Storm sky dome: dark clouds over whatever sky the island uses.
  const skyTexture = createStormSkyTexture();
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: skyTexture ? '#ffffff' : '#1d2633', map: skyTexture, side: THREE.BackSide,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  });
  // Radius stays well inside the camera far plane (210) and follows the camera,
  // so the dome is never clipped into a hole showing the clear sky behind it.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(110, 32, 16), skyMaterial);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  root.add(sky);

  // Rolling cloud bank: dark puffs that sweep in from the far side.
  const cloudMaterial = new THREE.MeshLambertMaterial({ color: '#39414d', transparent: true, opacity: 0, depthWrite: false });
  const cloudGeometry = new THREE.SphereGeometry(1, 12, 8);
  const clouds = new THREE.Group();
  const cloudHome: THREE.Vector3[] = [];
  for (let i = 0; i < 26; i += 1) {
    const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
    const s = radius * (0.35 + random() * 0.35);
    puff.scale.set(s * 1.6, s * 0.45, s);
    const home = new THREE.Vector3()
      .addScaledVector(sideways, (random() - 0.5) * radius * 5)
      .addScaledVector(forward, (random() - 0.35) * radius * 3)
      .add(new THREE.Vector3(0, radius * (1.25 + random() * 0.5), 0));
    cloudHome.push(home);
    clouds.add(puff);
  }
  clouds.position.copy(centre);
  root.add(clouds);

  // Rain: two stacked layers of slanted streaks scrolling down.
  const rainHeight = radius * 2.4;
  const rainCount = 1300;
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i += 1) {
    const x = (random() - 0.5) * radius * 4.4;
    const z = (random() - 0.5) * radius * 4.4;
    const y = random() * rainHeight;
    rainPositions.set([x, y, z, x + 0.12, y - 0.95, z + 0.05], i * 6);
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.LineBasicMaterial({ color: '#b9c8dc', transparent: true, opacity: 0, depthWrite: false });
  const rainLayers = [0, 1].map(() => {
    const layer = new THREE.LineSegments(rainGeometry, rainMaterial);
    layer.frustumCulled = false;
    root.add(layer);
    return layer;
  });

  // The cascading lightning wave: short-lived bolts along an advancing arc.
  const boltMaterial = new THREE.MeshBasicMaterial({ color: '#eef6ff', transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const boltGlowMaterial = new THREE.MeshBasicMaterial({ color: '#7fb6ff', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  type Bolt = { core: THREE.Mesh; glow: THREE.Mesh; bornAt: number; life: number; material: THREE.MeshBasicMaterial; glowMat: THREE.MeshBasicMaterial };
  const bolts: Bolt[] = [];
  const spawnBolt = (at: THREE.Vector3, height: number, width: number, t: number, life: number, branches: number, branchReach = 0.45) => {
    const from = at.clone().add(new THREE.Vector3((random() - 0.5) * height * 0.2, height, (random() - 0.5) * height * 0.2));
    const geometry = createBoltGeometry(from, at, width, toCamera, random, branches, branchReach);
    const glowGeometry = createBoltGeometry(from, at, width * 2.4, toCamera, createRandom(Math.floor(random() * 1e9)), 0);
    const material = boltMaterial.clone();
    const glowMat = boltGlowMaterial.clone();
    const core = new THREE.Mesh(geometry, material);
    const glow = new THREE.Mesh(glowGeometry, glowMat);
    core.frustumCulled = false;
    glow.frustumCulled = false;
    root.add(glow, core);
    bolts.push({ core, glow, bornAt: t, life, material, glowMat });
  };
  const disposeBolt = (bolt: Bolt) => {
    root.remove(bolt.core, bolt.glow);
    bolt.core.geometry.dispose();
    bolt.glow.geometry.dispose();
    bolt.material.dispose();
    bolt.glowMat.dispose();
  };
  const waveStartRadius = Math.min(150, radius * 5.5);
  const waveStopRadius = radius * 1.4;
  // The wave advances in rows; each row cascades left → right along the arc.
  const WAVE_ROW_SECONDS = 0.42;
  const WAVE_ROW_BOLTS = 7;
  const WAVE_CASCADE_SECONDS = 0.26;
  let waveBoltsFired = 0;

  // The storm wall: a curved, flickering curtain of light at the wave front so
  // the approach reads continuously, not only while a bolt is alive.
  const wallTexture = (() => {
    if (typeof document === 'undefined') return null;
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 8;
    wallCanvas.height = 128;
    const ctx = wallCanvas.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(160,200,255,0)');
    g.addColorStop(0.55, 'rgba(160,200,255,0.35)');
    g.addColorStop(0.85, 'rgba(225,238,255,0.9)');
    g.addColorStop(1, 'rgba(225,238,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
    return new THREE.CanvasTexture(wallCanvas);
  })();
  const wallMaterial = new THREE.MeshBasicMaterial({
    color: '#bcd6ff', map: wallTexture, transparent: true, opacity: 0, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const wallArc = Math.PI * 0.95;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, radius * 2.6, 64, 1, true, Math.atan2(forward.x, forward.z) - wallArc / 2, wallArc),
    wallMaterial,
  );
  wall.position.copy(centre).add(new THREE.Vector3(0, radius * 1.1, 0));
  wall.frustumCulled = false;
  root.add(wall);
  let nextWallBoltAt = STORMFRONT_CINEMATIC.waveStart;
  if (celebration) {
    // Golden strike for the celebration.
    boltMaterial.color.set('#fff3c4');
    boltGlowMaterial.color.set('#ffc94a');
  }

  const flashLight = new THREE.PointLight('#cfe3ff', 0, radius * 8, 1.4);
  root.add(flashLight);
  const hemi = new THREE.HemisphereLight('#9fb8ff', '#1a1f2a', 0);
  root.add(hemi);

  // Central strike: shock ring, scorch and a lingering light column.
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#dbe9ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const shockRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96), ringMaterial);
  shockRing.rotation.x = -Math.PI / 2;
  shockRing.position.copy(centre).add(new THREE.Vector3(0, 0.25, 0));
  root.add(shockRing);
  const columnMaterial = new THREE.MeshBasicMaterial({ color: '#cfe2ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 80, 20, 1, true), columnMaterial);
  column.position.copy(centre).add(new THREE.Vector3(0, 40, 0));
  root.add(column);
  if (celebration) {
    ringMaterial.color.set('#ffe9a8');
    columnMaterial.color.set('#ffe7a0');
    flashLight.color.set('#ffd77a');
  }
  let boomSpawned = false;

  // Debris: chunks break off the top of each damaged landmark and tumble down.
  type Chunk = { mesh: THREE.Mesh; velocity: THREE.Vector3; spin: THREE.Vector3; floor: number; settled: boolean };
  const chunks: Chunk[] = [];
  const chunkGeometry = new THREE.BoxGeometry(1, 1, 1);
  const chunkMaterials: THREE.MeshStandardMaterial[] = [];
  const dustMaterial = new THREE.MeshBasicMaterial({ color: '#b8b0a4', transparent: true, opacity: 0, depthWrite: false });
  const dustGeometry = new THREE.SphereGeometry(1, 12, 8);
  const dustPuffs: THREE.Mesh[] = [];
  const damagedBounds = damagedRoots.map((entry) => new THREE.Box3().setFromObject(entry)).filter((box) => !box.isEmpty());
  const spawnDebris = () => {
    damagedBounds.forEach((box, index) => {
      const size = box.getSize(new THREE.Vector3());
      const mid = box.getCenter(new THREE.Vector3());
      const material = new THREE.MeshStandardMaterial({ color: sampleColor(damagedRoots[index], '#b69a7c'), roughness: 0.85 });
      chunkMaterials.push(material);
      const chunkScale = THREE.MathUtils.clamp(Math.max(size.x, size.z) * 0.13, 0.18, 0.7);
      for (let i = 0; i < 12; i += 1) {
        const mesh = new THREE.Mesh(chunkGeometry, material);
        mesh.scale.set(chunkScale * (0.5 + random()), chunkScale * (0.4 + random() * 0.8), chunkScale * (0.5 + random()));
        mesh.position.set(
          mid.x + (random() - 0.5) * size.x * 0.7,
          box.max.y - random() * size.y * 0.3,
          mid.z + (random() - 0.5) * size.z * 0.7,
        );
        const outward = new THREE.Vector3().subVectors(mesh.position, mid).setY(0);
        if (outward.lengthSq() < 1e-4) outward.set(random() - 0.5, 0, random() - 0.5);
        outward.normalize().multiplyScalar(1.5 + random() * 2.5);
        mesh.castShadow = true;
        root.add(mesh);
        chunks.push({
          mesh,
          velocity: outward.add(new THREE.Vector3(0, 2.5 + random() * 3.5, 0)),
          spin: new THREE.Vector3(random() * 8 - 4, random() * 8 - 4, random() * 8 - 4),
          floor: box.min.y + mesh.scale.y * 0.5,
          settled: false,
        });
      }
      const puff = new THREE.Mesh(dustGeometry, dustMaterial);
      puff.position.set(mid.x, box.max.y - size.y * 0.1, mid.z);
      puff.userData.base = Math.max(size.x, size.z) * 0.35;
      root.add(puff);
      dustPuffs.push(puff);
    });
  };

  const baseRootScales = damagedRoots.map((entry) => entry.scale.clone());
  const originalFilter = canvas.style.filter;
  const eye = new THREE.Vector3();
  const target = new THREE.Vector3();
  let lastT = 0;

  function update(realT: number, camera: THREE.PerspectiveCamera, reducedMotion: boolean): boolean {
    const t = celebration ? realT + CELEBRATION_TIME_OFFSET : realT;
    const dt = THREE.MathUtils.clamp(t - lastT, 0, 0.1);
    lastT = t;
    const stormFrame = resolveStormfrontCinematicFrame(t, reducedMotion);
    const frame = celebration ? { ...stormFrame, storm: 0, rain: 0, wave: null } : stormFrame;
    const c = STORMFRONT_CINEMATIC;

    // Sky, clouds and overall grading.
    sky.position.copy(camera.position);
    skyMaterial.opacity = 0.94 * frame.storm;
    sky.visible = skyMaterial.opacity > 0.01;
    cloudMaterial.opacity = 0.9 * frame.storm;
    const sweep = 1 - segment(t, 0, c.waveStart);
    clouds.children.forEach((puff, index) => {
      puff.position.copy(cloudHome[index]).addScaledVector(forward, sweep * radius * 4)
        .addScaledVector(sideways, reducedMotion ? 0 : Math.sin(t * 0.3 + index) * 0.6);
    });
    const brightness = 1 - 0.5 * frame.storm + frame.flash * 1.4;
    canvas.style.filter = `brightness(${brightness.toFixed(3)}) saturate(${(1 - 0.5 * frame.storm).toFixed(3)}) contrast(${(1 + 0.12 * frame.storm).toFixed(3)})`;
    hemi.intensity = frame.flash * 2.2;

    // Rain.
    rainMaterial.opacity = 0.55 * frame.rain;
    const fall = ((t * (reducedMotion ? 4 : 32)) % rainHeight);
    rainLayers.forEach((layer, index) => {
      layer.visible = frame.rain > 0.01;
      layer.position.set(centre.x, centre.y - fall + index * rainHeight, centre.z);
    });

    // Lightning wave: bolts along an arc that advances and stops at the shore.
    if (frame.wave !== null) {
      const waveTime = t - c.waveStart;
      const rowCount = Math.floor((c.waveStop - c.waveStart) / WAVE_ROW_SECONDS) + 1;
      const boltsPerRow = reducedMotion ? 2 : WAVE_ROW_BOLTS;
      while (waveBoltsFired < rowCount * boltsPerRow) {
        const row = Math.floor(waveBoltsFired / boltsPerRow);
        const slot = waveBoltsFired % boltsPerRow;
        const fireAt = row * WAVE_ROW_SECONDS + (slot / Math.max(1, boltsPerRow - 1)) * WAVE_CASCADE_SECONDS;
        if (fireAt > waveTime) break;
        waveBoltsFired += 1;
        const progress = smooth(Math.min(1, (row * WAVE_ROW_SECONDS) / (c.waveStop - c.waveStart)));
        const r = THREE.MathUtils.lerp(waveStartRadius, waveStopRadius, progress);
        const angle = ((slot + 0.5) / boltsPerRow - 0.5) * Math.PI * 0.9 + (random() - 0.5) * 0.12;
        const at = centre.clone()
          .addScaledVector(forward, Math.cos(angle) * r)
          .addScaledVector(sideways, Math.sin(angle) * r * 1.15);
        at.y = groundY - radius * 0.6;
        // Far bolts are taller and wider so the wall reads from the horizon.
        const scale = r / radius;
        spawnBolt(at, radius * (1.6 + scale * 0.35 + random() * 0.6), Math.max(0.1, r * 0.005), t, reducedMotion ? 0.9 : 0.32 + random() * 0.16, 2);
      }
      // Between rows, stray bolts keep crackling along the wall.
      if (!reducedMotion && t >= nextWallBoltAt) {
        const r = THREE.MathUtils.lerp(waveStartRadius, waveStopRadius, frame.wave);
        const angle = (random() - 0.5) * Math.PI * 0.9;
        const at = centre.clone().addScaledVector(forward, Math.cos(angle) * r).addScaledVector(sideways, Math.sin(angle) * r * 1.15);
        at.y = groundY - radius * 0.6;
        spawnBolt(at, radius * (1.4 + random() * 0.8), Math.max(0.08, r * 0.004), t, 0.22 + random() * 0.12, 1);
        nextWallBoltAt = t + 0.09 + random() * 0.07;
      }
    }
    if (frame.wave !== null) {
      const r = THREE.MathUtils.lerp(waveStartRadius, waveStopRadius, frame.wave);
      wall.scale.set(r, 1, r * 1.15);
      const flicker = reducedMotion ? 0.8 : 0.7 + Math.sin(t * 23) * 0.15 + Math.sin(t * 57) * 0.15;
      wallMaterial.opacity = 0.8 * flicker * segment(t, c.waveStart, c.waveStart + 0.6);
    } else {
      wallMaterial.opacity = t < c.calmStart + 0.8 && t >= c.calmStart ? 0.8 * (1 - segment(t, c.calmStart, c.calmStart + 0.8)) : 0;
    }
    wall.visible = wallMaterial.opacity > 0.01;
    flashLight.position.copy(centre).addScaledVector(forward, frame.wave !== null
      ? THREE.MathUtils.lerp(waveStartRadius, waveStopRadius, frame.wave) : 0).add(new THREE.Vector3(0, radius, 0));
    flashLight.intensity = frame.flash * 90;

    // The BOOM.
    if (frame.boomAge !== null && !boomSpawned) {
      boomSpawned = true;
      spawnBolt(centre.clone().add(new THREE.Vector3(0, 0.2, 0)), 70, radius * 0.032, t, reducedMotion ? 1.4 : 0.9, 5, 0.18);
      spawnDebris();
    }
    if (frame.boomAge !== null) {
      const age = frame.boomAge;
      ringMaterial.opacity = 0.85 * Math.max(0, 1 - age / 1.3);
      shockRing.scale.setScalar(0.5 + smooth(age / 1.3) * radius * 1.6);
      columnMaterial.opacity = 0.55 * Math.max(0, 1 - age / 1.6);
      flashLight.position.copy(centre).add(new THREE.Vector3(0, radius * 0.6, 0));
      flashLight.intensity = Math.max(flashLight.intensity, 160 * Math.max(0, 1 - age / 1.2));
      // The struck landmarks jolt as their pieces break away.
      damagedRoots.forEach((entry, index) => {
        const jolt = reducedMotion ? 0 : Math.sin(Math.min(1, age / 0.5) * Math.PI) * 0.06;
        entry.scale.set(baseRootScales[index].x * (1 + jolt), baseRootScales[index].y * (1 - jolt), baseRootScales[index].z * (1 + jolt));
      });
    }
    for (const chunk of chunks) {
      if (chunk.settled) continue;
      chunk.velocity.y -= 14 * dt;
      chunk.mesh.position.addScaledVector(chunk.velocity, dt);
      chunk.mesh.rotation.x += chunk.spin.x * dt;
      chunk.mesh.rotation.y += chunk.spin.y * dt;
      chunk.mesh.rotation.z += chunk.spin.z * dt;
      if (chunk.mesh.position.y <= chunk.floor) {
        chunk.mesh.position.y = chunk.floor;
        if (Math.abs(chunk.velocity.y) < 1.2) { chunk.settled = true; continue; }
        chunk.velocity.y *= -0.3;
        chunk.velocity.x *= 0.5;
        chunk.velocity.z *= 0.5;
        chunk.spin.multiplyScalar(0.4);
      }
    }
    if (frame.boomAge !== null) {
      const age = frame.boomAge;
      dustMaterial.opacity = 0.55 * Math.max(0, 1 - age / 2.4) * Math.min(1, age / 0.2);
      dustPuffs.forEach((puff) => puff.scale.setScalar((puff.userData.base as number) * (0.6 + smooth(age / 2) * 1.6)));
      // Debris fades out at the end; the rebuilt scene shows the damage.
      const fade = 1 - segment(t, c.duration - 1.6, c.duration - 0.4);
      chunkMaterials.forEach((material) => { material.transparent = fade < 1; material.opacity = fade; });
    }

    // Bolt lifetimes (a short flicker, then gone).
    for (let i = bolts.length - 1; i >= 0; i -= 1) {
      const bolt = bolts[i];
      const age = t - bolt.bornAt;
      if (age > bolt.life) { disposeBolt(bolt); bolts.splice(i, 1); continue; }
      const p = age / bolt.life;
      const flicker = reducedMotion ? 1 : (p < 0.5 && Math.floor(age * 40) % 3 === 1 ? 0.35 : 1);
      bolt.material.opacity = (1 - p * p) * flicker;
      bolt.glowMat.opacity = 0.5 * (1 - p) * flicker;
    }

    // Camera: pull back for the storm, frame the centre for the strike, return.
    if (celebration && t < c.boom) {
      // Celebration: glide straight from the player's view to the strike framing.
      const u = smooth(realT / 1.2);
      eye.copy(start.position).lerp(boomEye, u);
      target.copy(start.target).lerp(boomTarget, u);
    } else if (t < c.waveStart) {
      const u = segment(t, 0, c.waveStart);
      eye.copy(start.position).lerp(wideEye, u);
      target.copy(start.target).lerp(wideTarget, u);
    } else if (t < c.boom - 0.8) {
      const creep = segment(t, c.waveStart, c.boom - 0.8);
      eye.copy(wideEye).addScaledVector(forward, creep * radius * 0.25);
      target.copy(wideTarget);
    } else if (t < c.aftermath + 0.6) {
      const u = segment(t, c.boom - 0.8, c.boom);
      eye.copy(wideEye).addScaledVector(forward, radius * 0.25).lerp(boomEye, u);
      target.copy(wideTarget).lerp(boomTarget, u);
    } else {
      const u = segment(t, c.aftermath + 0.6, c.duration);
      eye.copy(boomEye).lerp(start.position, u);
      target.copy(boomTarget).lerp(start.target, u);
    }
    if (frame.shake > 0) {
      eye.x += Math.sin(t * 73) * frame.shake * 0.5;
      eye.y += Math.sin(t * 101 + 0.7) * frame.shake * 0.35;
      eye.z += Math.cos(t * 89) * frame.shake * 0.5;
    }
    // Keep the scene inside a narrow phone frame.
    eye.sub(target).multiplyScalar(Math.max(1, 0.78 / camera.aspect)).add(target);
    camera.position.copy(eye);
    camera.lookAt(target);
    const fovIn = celebration ? segment(realT, 0, 1.2) : segment(t, 0, c.waveStart);
    camera.fov = THREE.MathUtils.lerp(start.fov, 46, fovIn * (1 - segment(t, c.aftermath + 0.6, c.duration)));
    camera.updateProjectionMatrix();
    root.userData.beat = frame.beat satisfies StormfrontCinematicBeat;
    return t >= c.duration;
  }

  return {
    root,
    update,
    dispose() {
      canvas.style.filter = originalFilter;
      damagedRoots.forEach((entry, index) => entry.scale.copy(baseRootScales[index]));
      bolts.forEach(disposeBolt);
      bolts.length = 0;
      scene.remove(root);
      sky.geometry.dispose();
      skyMaterial.dispose();
      skyTexture?.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      rainGeometry.dispose();
      rainMaterial.dispose();
      boltMaterial.dispose();
      boltGlowMaterial.dispose();
      shockRing.geometry.dispose();
      wall.geometry.dispose();
      wallMaterial.dispose();
      wallTexture?.dispose();
      ringMaterial.dispose();
      column.geometry.dispose();
      columnMaterial.dispose();
      chunkGeometry.dispose();
      chunkMaterials.forEach((material) => material.dispose());
      dustGeometry.dispose();
      dustMaterial.dispose();
      flashLight.dispose();
      hemi.dispose();
    },
  };
}
