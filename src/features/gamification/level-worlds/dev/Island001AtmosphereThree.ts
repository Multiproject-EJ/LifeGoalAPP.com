import * as THREE from 'three';
import type { Island001LightingKeyframe } from '../services/island001Atmosphere';
import {
  ISLAND_3D_TILE_HEIGHT,
  ISLAND_3D_TILE_RADIAL_DEPTH,
  type Island3DQuality,
  type Island5TileTransform,
} from './island5ThreePilotContract';

/**
 * Island 001 atmosphere dressing: a living sky backdrop (sunrise → daylight →
 * golden hour → starry night), street lamps that arrive as the island is
 * developed, and a warm glow along both edges of the playable route.
 * Presentation only; it never reads or writes gameplay state.
 */
export interface Island001AtmosphereRuntime {
  root: THREE.Group;
  backdrop: THREE.CanvasTexture | null;
  lampCapacity: number;
  update: (state: {
    lighting: Island001LightingKeyframe;
    streetlights: number;
    pathGlow: number;
    elapsed: number;
    reducedMotion: boolean;
  }) => void;
  dispose: () => void;
}

const LAMP_POP_SECONDS = 0.55;

function drawBackdrop(context: CanvasRenderingContext2D, lighting: Island001LightingKeyframe, stars: readonly [number, number, number][]) {
  const { width, height } = context.canvas;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, lighting.skyTop);
  sky.addColorStop(0.52, lighting.skyMid);
  sky.addColorStop(1, lighting.skyHorizon);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  if (lighting.stars > 0.01) {
    context.fillStyle = `rgba(255, 252, 238, ${Math.min(1, lighting.stars) * 0.9})`;
    for (const [x, y, r] of stars) {
      context.beginPath();
      context.arc(x * width, y * height, r, 0, Math.PI * 2);
      context.fill();
    }
  }
  // Sun low at sunrise and golden hour, high at noon; a soft moon at night.
  const sunY = height * (0.62 - lighting.sunHeight * 0.5);
  const sunX = width * (lighting.stars > 0.5 ? 0.28 : 0.5);
  const halo = context.createRadialGradient(sunX, sunY, 2, sunX, sunY, width * 0.42);
  halo.addColorStop(0, `${lighting.sunDisc}f0`);
  halo.addColorStop(0.2, `${lighting.sunDisc}66`);
  halo.addColorStop(1, `${lighting.sunDisc}00`);
  context.fillStyle = halo;
  context.fillRect(0, 0, width, height);
  context.fillStyle = lighting.sunDisc;
  context.beginPath();
  context.arc(sunX, sunY, lighting.stars > 0.5 ? 11 : 9, 0, Math.PI * 2);
  context.fill();
  // Soft cloud bands that pick up the horizon colour.
  [0.66, 0.74, 0.83].forEach((band, index) => {
    const y = height * band;
    context.fillStyle = `rgba(255, 244, 228, ${0.05 + (index % 2) * 0.03})`;
    context.beginPath();
    context.ellipse(width * (0.5 + Math.sin(index * 1.8) * 0.14), y, width * 0.5, 10 + index * 3, 0, 0, Math.PI * 2);
    context.fill();
  });
}

function createGlowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255, 226, 160, 1)');
  glow.addColorStop(0.35, 'rgba(255, 196, 110, 0.45)');
  glow.addColorStop(1, 'rgba(255, 170, 80, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createIsland001AtmosphereThree(options: {
  tileTransforms: readonly Island5TileTransform[];
  quality: Island3DQuality;
}): Island001AtmosphereRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_001_ATMOSPHERE';
  root.userData.sculptRuntime = { presentationOnly: true, clickable: false };
  const disposables: { dispose: () => void }[] = [];

  // ── Sky backdrop, redrawn only when the light has visibly changed ──
  let backdrop: THREE.CanvasTexture | null = null;
  let backdropContext: CanvasRenderingContext2D | null = null;
  let backdropKey = '';
  const stars: [number, number, number][] = Array.from({ length: 90 }, (_, index) => {
    const random = (seed: number) => {
      const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
      return value - Math.floor(value);
    };
    return [random(1), random(2) * 0.6, 0.5 + random(3) * 1.1];
  });
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    backdropContext = canvas.getContext('2d');
    if (backdropContext) {
      backdrop = new THREE.CanvasTexture(canvas);
      backdrop.name = 'ISLAND_001_TIME_OF_DAY_BACKDROP';
      backdrop.colorSpace = THREE.SRGBColorSpace;
      backdrop.minFilter = THREE.LinearFilter;
      backdrop.magFilter = THREE.LinearFilter;
      disposables.push(backdrop);
    }
  }

  // ── Route edges: outer/inner points for lamps and the path glow ──
  const tiles = [...options.tileTransforms].sort((a, b) => a.index - b.index);
  const edge = (tile: Island5TileTransform, side: 1 | -1, extra = 0) => {
    const radial = new THREE.Vector3(tile.position[0], 0, tile.position[2]);
    if (radial.lengthSq() < 1e-6) radial.set(0, 0, 1);
    radial.normalize();
    return new THREE.Vector3(tile.position[0], tile.position[1] + ISLAND_3D_TILE_HEIGHT * 0.5 + 0.02, tile.position[2])
      .addScaledVector(radial, side * (ISLAND_3D_TILE_RADIAL_DEPTH * 0.5 + 0.04 + extra));
  };

  // ── Path glow: two thin warm strips hugging the route ──
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc46e,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  disposables.push(glowMaterial);
  const glowStrips: THREE.Mesh[] = [];
  if (tiles.length >= 4) {
    ([1, -1] as const).forEach((side) => {
      const curve = new THREE.CatmullRomCurve3(tiles.map((tile) => edge(tile, side)), true, 'centripetal');
      const geometry = new THREE.TubeGeometry(curve, Math.max(64, tiles.length * 6), side === 1 ? 0.075 : 0.055, 6, true);
      disposables.push(geometry);
      const strip = new THREE.Mesh(geometry, glowMaterial);
      strip.name = side === 1 ? 'ISLAND_001_PATH_GLOW_OUTER' : 'ISLAND_001_PATH_GLOW_INNER';
      strip.renderOrder = 2;
      strip.visible = false;
      glowStrips.push(strip);
      root.add(strip);
    });
  }

  // ── Street lamps beside the route, arriving in a fixed order ──
  const lampCapacity = options.quality === 'low' ? 8 : 16;
  const lampSpots = tiles.length > 0
    ? Array.from({ length: Math.min(lampCapacity, tiles.length) }, (_, index) => tiles[Math.floor((index * tiles.length) / Math.min(lampCapacity, tiles.length))]!)
    : [];
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.6, metalness: 0.55 });
  const lanternMaterial = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffbe63, emissiveIntensity: 0, roughness: 0.35 });
  const postGeometry = new THREE.CylinderGeometry(0.022, 0.03, 0.62, 6);
  const lanternGeometry = new THREE.SphereGeometry(0.065, 10, 8);
  disposables.push(postMaterial, lanternMaterial, postGeometry, lanternGeometry);
  const glowTexture = createGlowTexture();
  if (glowTexture) disposables.push(glowTexture);
  const haloMaterial = glowTexture ? new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }) : null;
  if (haloMaterial) disposables.push(haloMaterial);
  // Arrival order alternates around the ring so early lamps are spread out.
  const arrivalOrder = lampSpots.map((_, index) => index)
    .sort((a, b) => ((a % 2) - (b % 2)) || a - b);
  const lamps = lampSpots.map((tile, index) => {
    const lamp = new THREE.Group();
    lamp.name = `ISLAND_001_STREETLIGHT_${index + 1}`;
    lamp.position.copy(edge(tile, 1, 0.1));
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = 0.31;
    const lantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
    lantern.position.y = 0.66;
    lamp.add(post, lantern);
    if (haloMaterial) {
      const halo = new THREE.Sprite(haloMaterial);
      halo.position.y = 0.66;
      halo.scale.setScalar(0.62);
      lamp.add(halo);
    }
    lamp.visible = false;
    lamp.scale.setScalar(0.0001);
    root.add(lamp);
    return { lamp, arrivedAt: null as number | null };
  });

  const update: Island001AtmosphereRuntime['update'] = ({ lighting, streetlights, pathGlow, elapsed, reducedMotion }) => {
    if (backdrop && backdropContext) {
      const key = `${lighting.skyTop}${lighting.skyMid}${lighting.skyHorizon}${lighting.sunHeight.toFixed(2)}${lighting.stars.toFixed(2)}`;
      if (key !== backdropKey) {
        backdropKey = key;
        drawBackdrop(backdropContext, lighting, stars);
        backdrop.needsUpdate = true;
      }
    }
    const glow = Math.max(0, Math.min(1, pathGlow));
    glowMaterial.opacity = glow * 0.9;
    glowStrips.forEach((strip) => { strip.visible = glow > 0.01; });
    lanternMaterial.emissiveIntensity = 0.15 + lighting.lampGlow * 2.6;
    if (haloMaterial) haloMaterial.opacity = lighting.lampGlow * 0.85;
    arrivalOrder.forEach((lampIndex, order) => {
      const entry = lamps[lampIndex];
      if (!entry) return;
      const shouldShow = order < streetlights;
      if (!shouldShow) {
        entry.lamp.visible = false;
        entry.arrivedAt = null;
        return;
      }
      entry.lamp.visible = true;
      entry.arrivedAt ??= reducedMotion ? -Infinity : elapsed + order * 0.05;
      const t = Math.max(0, Math.min(1, (elapsed - entry.arrivedAt) / LAMP_POP_SECONDS));
      // Rise out of the ground with a small settle.
      const eased = t >= 1 ? 1 : 1 - (1 - t) ** 3 + Math.sin(t * Math.PI) * 0.12;
      entry.lamp.scale.setScalar(Math.max(0.0001, eased));
    });
  };

  return {
    root,
    backdrop,
    lampCapacity,
    update,
    dispose: () => {
      disposables.forEach((item) => item.dispose());
      root.clear();
    },
  };
}
