import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ProceduralModelOptions = {
  wireframe?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  textureSize?: number;
  textureAnisotropy?: number;
  qualityPriority?: 'reference-fidelity' | 'balanced';
};

export type ProceduralModelRuntime = {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, unknown>;
  destructionGroups: Record<string, THREE.Object3D[]>;
};

type SculptMaterialSpec = Record<string, any>;

// bevelEnabled defaults to true on THREE.ExtrudeGeometry and rounds every
// corner — sharp/pointed profiles (blades, fork tines, spikes) need
// bevelEnabled: false plus lineTo()-only path segments near the tip, since a
// curve command cannot produce a true converging point.
function buildExtrudeShape(points: [number, number][], holes?: [number, number][][]): THREE.Shape {
  const shape = new THREE.Shape();
  if (points.length > 0) {
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) {
      shape.lineTo(points[i][0], points[i][1]);
    }
  }
  // Cutouts (e.g. an oval wire-cutter hole) as THREE.Path added to shape.holes —
  // dep-free boolean subtraction via the tessellator, no CSG library needed.
  for (const loop of holes ?? []) {
    if (loop.length < 3) continue;
    const path = new THREE.Path();
    path.moveTo(loop[0][0], loop[0][1]);
    for (let i = 1; i < loop.length; i += 1) path.lineTo(loop[i][0], loop[i][1]);
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

// Build an N-gon oval loop (for hole authoring from a compact {cx,cy,rx,ry} descriptor).
function ovalLoop(cx: number, cy: number, rx: number, ry: number, seg = 24): [number, number][] {
  const loop: [number, number][] = [];
  for (let i = 0; i < seg; i += 1) {
    const a = (i / seg) * Math.PI * 2;
    loop.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return loop;
}

function buildExtrudeGeometry(profile: { points: [number, number][]; depth: number; holes?: [number, number][][]; ovalHoles?: { cx: number; cy: number; rx: number; ry: number }[] }): THREE.ExtrudeGeometry {
  const holes = [...(profile.holes ?? []), ...((profile.ovalHoles ?? []).map((o) => ovalLoop(o.cx, o.cy, o.rx, o.ry)))];
  const shape = buildExtrudeShape(profile.points, holes);
  return new THREE.ExtrudeGeometry(shape, {
    depth: profile.depth,
    bevelEnabled: false,
    steps: 1,
  });
}

// Plan 1.3 F.6 — sweep a thin 2D cross-section along a 3D spine so a curved
// form (hooked blade, handle) reads correctly from EVERY camera angle, not just
// the reference angle a flat extrude happens to match. Uses ExtrudeGeometry's
// native extrudePath; bevelEnabled: false keeps sharp tips (same rule as F.5).
function buildCurveSweepGeometry(
  sweep: { spine: [number, number, number][]; crossSection: { points: [number, number][] }; closed?: boolean },
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const cs = sweep.crossSection.points;
  if (cs.length > 0) {
    shape.moveTo(cs[0][0], cs[0][1]);
    for (let i = 1; i < cs.length; i += 1) shape.lineTo(cs[i][0], cs[i][1]);
    shape.closePath();
  }
  const spine = sweep.spine.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const path = new THREE.CatmullRomCurve3(spine, sweep.closed ?? false);
  return new THREE.ExtrudeGeometry(shape, {
    extrudePath: path,
    steps: Math.max(24, spine.length * 8),
    bevelEnabled: false,
  });
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function readLayerNumber(value: unknown, keys: string[], fallback: number): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (typeof record[key] === 'number') return record[key] as number;
    }
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{3}$/i.test(hex)
    ? '#' + hex.slice(1).split('').map((part) => part + part).join('')
    : hex;
  const value = /^#[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized.slice(1), 16) : 0x8a7a5f;
  return [clampAlbedoChannel((value >> 16) & 255), clampAlbedoChannel((value >> 8) & 255), clampAlbedoChannel(value & 255)];
}

function materialPalette(spec: SculptMaterialSpec): string[] {
  const palette = spec.colorVariation?.palette;
  if (Array.isArray(palette) && palette.length > 0) return palette.filter((value) => typeof value === 'string');
  const secondary = spec.albedo?.secondary;
  const colors = [spec.baseColor ?? spec.color ?? spec.albedo?.dominant, ...(Array.isArray(secondary) ? secondary : [])];
  return colors.filter((value): value is string => typeof value === 'string' && value.startsWith('#'));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampAlbedoChannel(value: number): number {
  return Math.max(30, Math.min(240, Math.round(value)));
}

function clampPbrF0(value: number): number {
  return Math.max(0.02, Math.min(1, value));
}

function clampPbrIor(value: number): number {
  return Math.max(1, Math.min(2.5, value));
}

function clampPbrMetalness(value: number): number {
  return value >= 0.5 ? 1 : 0;
}

function clampedAlbedoColor(spec: SculptMaterialSpec): THREE.Color {
  const source = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  const [red, green, blue] = hexToRgb(source);
  return new THREE.Color(red / 255, green / 255, blue / 255);
}

function smoothCurve(value: number): number {
  return value * value * (3 - 2 * value);
}

function periodicHash(x: number, y: number, seed: number, periodX: number, periodY: number): number {
  const wrappedX = ((x % periodX) + periodX) % periodX;
  const wrappedY = ((y % periodY) + periodY) % periodY;
  let value = Math.imul(wrappedX + seed * 17, 374761393) ^ Math.imul(wrappedY + seed * 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function periodicValueNoise(u: number, v: number, seed: number, periodX: number, periodY: number): number {
  const x = u * periodX;
  const y = v * periodY;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothCurve(x - x0);
  const ty = smoothCurve(y - y0);
  const a = periodicHash(x0, y0, seed, periodX, periodY);
  const b = periodicHash(x0 + 1, y0, seed, periodX, periodY);
  const c = periodicHash(x0, y0 + 1, seed, periodX, periodY);
  const d = periodicHash(x0 + 1, y0 + 1, seed, periodX, periodY);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}

type SurfaceBand = {
  frequency: number;
  amplitude: number;
  stretchX: number;
  stretchY: number;
  ridge: boolean;
};

function surfaceBands(spec: SculptMaterialSpec): SurfaceBand[] {
  const source = Array.isArray(spec.surfaceFrequencyBands) ? spec.surfaceFrequencyBands : [];
  const parsed = source.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const band = item as Record<string, unknown>;
    const frequency = typeof band.frequency === 'number' ? band.frequency : 0;
    const amplitude = typeof band.amplitude === 'number' ? band.amplitude : 0;
    if (frequency <= 0 || amplitude <= 0) return [];
    const stretch = Array.isArray(band.stretch) ? band.stretch : [1, 1];
    const description = `${String(band.pattern ?? '')} ${String(band.role ?? '')}`.toLowerCase();
    return [{
      frequency,
      amplitude,
      stretchX: typeof stretch[0] === 'number' ? Math.max(0.1, stretch[0]) : 1,
      stretchY: typeof stretch[1] === 'number' ? Math.max(0.1, stretch[1]) : 1,
      ridge: /(ridge|groove|grain|fiber|striated|crack)/.test(description),
    }];
  });
  return parsed.length > 0 ? parsed : [
    { frequency: 2, amplitude: 0.42, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 12, amplitude: 0.22, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 56, amplitude: 0.08, stretchX: 1, stretchY: 1, ridge: false },
  ];
}

function sampleSurface(u: number, v: number, bands: SurfaceBand[], seed: number): number {
  let value = 0;
  let weight = 0;
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    const periodX = Math.max(1, Math.round(band.frequency * band.stretchX));
    const periodY = Math.max(1, Math.round(band.frequency * band.stretchY));
    let sample = periodicValueNoise(u, v, seed + index * 1013, periodX, periodY);
    if (band.ridge) sample = 1 - Math.abs(sample * 2 - 1);
    value += sample * band.amplitude;
    weight += band.amplitude;
  }
  return weight > 0 ? clamp01(value / weight) : 0.5;
}

function mixPalette(colors: [number, number, number][], value: number): [number, number, number] {
  if (colors.length === 1) return colors[0];
  const scaled = clamp01(value) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const a = colors[index];
  const b = colors[index + 1];
  return [
    Math.round(THREE.MathUtils.lerp(a[0], b[0], mix)),
    Math.round(THREE.MathUtils.lerp(a[1], b[1], mix)),
    Math.round(THREE.MathUtils.lerp(a[2], b[2], mix)),
  ];
}

type ColorGradientStop = { offset: number; color: string };
type ColorGradientSpec = {
  type: 'linear' | 'radial';
  axis: [number, number];
  stops: ColorGradientStop[];
};

function parseRgba(value: string): [number, number, number] {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!match) return [138, 122, 95];
  return [clampAlbedoChannel(Number(match[1])), clampAlbedoChannel(Number(match[2])), clampAlbedoChannel(Number(match[3]))];
}

// Analytical per-pixel gradient sample. The extraction schema's colorGradient carries
// exact rgba(...) stop colors (see extract_part_color_recipe.py), so this samples the
// same trend directly in JS math rather than round-tripping through a Canvas 2D
// createLinearGradient/createRadialGradient object — same visual result, and it composes
// directly with the existing noise/height-correlated colorVariation blend below.
function sampleColorGradient(gradient: ColorGradientSpec, u: number, v: number): [number, number, number] {
  const stops = gradient.stops.length >= 2 ? gradient.stops : [{ offset: 0, color: 'rgba(138,122,95,1)' }, { offset: 1, color: 'rgba(138,122,95,1)' }];
  let t: number;
  if (gradient.type === 'radial') {
    const [cx, cy] = gradient.axis;
    const dx = u - cx;
    const dy = v - cy;
    const maxRadius = Math.max(0.001, Math.hypot(Math.max(cx, 1 - cx), Math.max(cy, 1 - cy)));
    t = clamp01(Math.hypot(dx, dy) / maxRadius);
  } else {
    const [ax, ay] = gradient.axis;
    const projection = (u - 0.5) * ax + (v - 0.5) * ay;
    const maxProjection = 0.5 * (Math.abs(ax) + Math.abs(ay)) || 0.5;
    t = clamp01(projection / maxProjection + 0.5);
  }
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.max(0, Math.floor(scaled)));
  const mix = scaled - index;
  const a = parseRgba(stops[index].color);
  const b = parseRgba(stops[index + 1].color);
  return [
    THREE.MathUtils.lerp(a[0], b[0], mix),
    THREE.MathUtils.lerp(a[1], b[1], mix),
    THREE.MathUtils.lerp(a[2], b[2], mix),
  ];
}

function writePixel(data: Uint8ClampedArray, offset: number, red: number, green: number, blue: number): void {
  data[offset] = Math.max(0, Math.min(255, Math.round(red)));
  data[offset + 1] = Math.max(0, Math.min(255, Math.round(green)));
  data[offset + 2] = Math.max(0, Math.min(255, Math.round(blue)));
  data[offset + 3] = 255;
}

function makeCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function createMapTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [2, 2];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 2,
    typeof repeat[1] === 'number' ? repeat[1] : 2,
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}

type ProceduralTextureSet = {
  albedo: THREE.Texture;
  roughness: THREE.Texture;
  height: THREE.Texture;
  normal: THREE.Texture;
  ao: THREE.Texture;
  source: 'reference-pixel-extraction' | 'procedural';
};

function referenceMapUrl(spec: SculptMaterialSpec, channel: string): string | null {
  const reference = spec.referencePbr;
  if (!reference || typeof reference !== 'object') return null;
  if (reference.usable === false) return null;
  const confidence = typeof reference.confidence === 'number'
    ? reference.confidence
    : (typeof reference.estimatedFidelity === 'number' ? reference.estimatedFidelity : 0);
  const threshold = typeof reference.targetThreshold === 'number' ? reference.targetThreshold : 0.7;
  if (confidence < threshold) return null;
  const maps = reference.maps;
  if (!maps || typeof maps !== 'object') return null;
  const map = (maps as Record<string, unknown>)[channel];
  if (!map || typeof map !== 'object') return null;
  const record = map as Record<string, unknown>;
  const url = typeof record.url === 'string' && record.url.trim() ? record.url : record.path;
  return typeof url === 'string' && url.trim() ? url : null;
}

function createLoadedMapTexture(
  url: string,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.Texture {
  const texture = new THREE.TextureLoader().load(url);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [1, 1];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 1,
    typeof repeat[1] === 'number' ? repeat[1] : 1,
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}

function makeReferenceTextureSet(spec: SculptMaterialSpec, options: ProceduralModelOptions): ProceduralTextureSet | null {
  const albedo = referenceMapUrl(spec, 'albedo');
  const roughness = referenceMapUrl(spec, 'roughness');
  const height = referenceMapUrl(spec, 'height');
  const normal = referenceMapUrl(spec, 'normal');
  const ao = referenceMapUrl(spec, 'ao');
  if (!albedo || !roughness || !height || !normal || !ao) return null;
  return {
    albedo: createLoadedMapTexture(albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createLoadedMapTexture(roughness, THREE.NoColorSpace, spec, options),
    height: createLoadedMapTexture(height, THREE.NoColorSpace, spec, options),
    normal: createLoadedMapTexture(normal, THREE.NoColorSpace, spec, options),
    ao: createLoadedMapTexture(ao, THREE.NoColorSpace, spec, options),
    source: 'reference-pixel-extraction',
  };
}

function makeProceduralTextureSet(
  id: string,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): ProceduralTextureSet | null {
  if (typeof document === 'undefined') return null;
  const qualityFirst = (options.qualityPriority ?? 'reference-fidelity') === 'reference-fidelity';
  const requested = options.textureSize ?? spec.textureResolution;
  const requestedSize = typeof requested === 'number' && Number.isFinite(requested)
    ? requested
    : (qualityFirst ? 1024 : 512);
  const size = Math.max(256, Math.min(2048, 2 ** Math.round(Math.log2(requestedSize))));
  const canvases = {
    albedo: makeCanvas(size),
    roughness: makeCanvas(size),
    height: makeCanvas(size),
    normal: makeCanvas(size),
    ao: makeCanvas(size),
  };
  const contexts = {
    albedo: canvases.albedo.getContext('2d'),
    roughness: canvases.roughness.getContext('2d'),
    height: canvases.height.getContext('2d'),
    normal: canvases.normal.getContext('2d'),
    ao: canvases.ao.getContext('2d'),
  };
  if (!contexts.albedo || !contexts.roughness || !contexts.height || !contexts.normal || !contexts.ao) return null;
  const images = {
    albedo: contexts.albedo.createImageData(size, size),
    roughness: contexts.roughness.createImageData(size, size),
    height: contexts.height.createImageData(size, size),
    normal: contexts.normal.createImageData(size, size),
    ao: contexts.ao.createImageData(size, size),
  };
  const seed = hashString(id);
  const bands = surfaceBands(spec);
  const heightField = new Float32Array(size * size);
  const roughnessField = new Float32Array(size * size);
  const palette = materialPalette(spec);
  const fallback = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  const colors = (palette.length >= 2 ? palette : [fallback, '#6E614B', '#A08F70']).map(hexToRgb);
  const baseRoughness = clamp01(readLayerNumber(spec.roughness, ['base'], 0.76));
  const roughnessVariation = clamp01(readLayerNumber(spec.roughness, ['variation'], 0.18));
  const colorAmplitude = clamp01(readLayerNumber(spec.colorVariation, ['amplitude', 'variation'], 0.18));
  const heightCorrelation = clamp01(readLayerNumber(spec.colorVariation, ['heightCorrelation'], 0.3));
  const colorGradient: ColorGradientSpec | undefined = spec.colorGradient;
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const index = y * size + x;
      const height = sampleSurface(u, v, bands, seed + 101);
      const roughNoise = sampleSurface(u, v, bands, seed + 7001);
      const colorNoise = sampleSurface(u, v, bands, seed + 15013);
      heightField[index] = height;
      roughnessField[index] = clamp01(baseRoughness + (roughNoise - 0.5) * roughnessVariation * 2);
      let color: [number, number, number];
      if (colorGradient) {
        // Evidence-derived spatial gradient (Plan 1.3 Workstream C) takes priority
        // over the noise-based palette blend below — it is a measured trend, not a guess.
        color = sampleColorGradient(colorGradient, u, v);
      } else {
        const paletteValue = clamp01(
          0.5 + (colorNoise - 0.5) * colorAmplitude * 2 + (height - 0.5) * heightCorrelation
        );
        color = mixPalette(colors, paletteValue);
      }
      writePixel(images.albedo.data, index * 4, color[0], color[1], color[2]);
    }
  }
  const normalStrength = Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35));
  const aoStrength = clamp01(readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35));
  for (let y = 0; y < size; y += 1) {
    const up = ((y - 1 + size) % size) * size;
    const down = ((y + 1) % size) * size;
    for (let x = 0; x < size; x += 1) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const index = y * size + x;
      const center = heightField[index];
      const dx = (heightField[y * size + right] - heightField[y * size + left]) * normalStrength * 6;
      const dy = (heightField[down + x] - heightField[up + x]) * normalStrength * 6;
      const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const normalX = -dx * inverseLength;
      const normalY = -dy * inverseLength;
      const normalZ = inverseLength;
      const neighborAverage = (
        heightField[y * size + left] + heightField[y * size + right]
        + heightField[up + x] + heightField[down + x]
      ) * 0.25;
      const cavity = Math.max(0, neighborAverage - center);
      const ao = clamp01(1 - aoStrength * (cavity * 12 + (1 - center) * 0.16));
      const offset = index * 4;
      const heightByte = center * 255;
      const roughnessByte = roughnessField[index] * 255;
      writePixel(images.height.data, offset, heightByte, heightByte, heightByte);
      writePixel(images.roughness.data, offset, roughnessByte, roughnessByte, roughnessByte);
      writePixel(
        images.normal.data, offset,
        (normalX * 0.5 + 0.5) * 255,
        (normalY * 0.5 + 0.5) * 255,
        (normalZ * 0.5 + 0.5) * 255,
      );
      writePixel(images.ao.data, offset, ao * 255, ao * 255, ao * 255);
    }
  }
  contexts.albedo.putImageData(images.albedo, 0, 0);
  contexts.roughness.putImageData(images.roughness, 0, 0);
  contexts.height.putImageData(images.height, 0, 0);
  contexts.normal.putImageData(images.normal, 0, 0);
  contexts.ao.putImageData(images.ao, 0, 0);
  return {
    albedo: createMapTexture(canvases.albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createMapTexture(canvases.roughness, THREE.NoColorSpace, spec, options),
    height: createMapTexture(canvases.height, THREE.NoColorSpace, spec, options),
    normal: createMapTexture(canvases.normal, THREE.NoColorSpace, spec, options),
    ao: createMapTexture(canvases.ao, THREE.NoColorSpace, spec, options),
    source: 'procedural',
  };
}

function createSculptMaterial(id: string, spec: SculptMaterialSpec, options: ProceduralModelOptions, denseComponent = false): THREE.MeshPhysicalMaterial {
  const textures = makeReferenceTextureSet(spec, options) ?? makeProceduralTextureSet(id, spec, options);
  const material = new THREE.MeshPhysicalMaterial({
    color: textures ? 0xffffff : clampedAlbedoColor(spec),
    roughness: textures ? 1 : clamp01(readLayerNumber(spec.roughness, ['base'], 0.76)),
    metalness: clampPbrMetalness(readLayerNumber(spec.metalness, ['base'], 0.0)),
    clearcoat: clamp01(readLayerNumber(spec.clearcoat, ['base', 'amount'], 0)),
    clearcoatRoughness: clamp01(readLayerNumber(spec.clearcoatRoughness, ['base'], 0.25)),
    transmission: clamp01(readLayerNumber(spec.transmission, ['base', 'amount'], 0)),
    ior: clampPbrIor(readLayerNumber(spec.ior, ['base', 'value'], 1.5)),
    thickness: Math.max(0, readLayerNumber(spec.thickness, ['base', 'amount'], 0)),
    attenuationDistance: Math.max(0.001, readLayerNumber(spec.attenuationDistance, ['base', 'value'], Infinity)),
    attenuationColor: new THREE.Color(typeof spec.attenuationColor === 'string' ? spec.attenuationColor : '#ffffff'),
    sheen: clamp01(readLayerNumber(spec.sheen, ['base', 'amount'], 0)),
    sheenColor: new THREE.Color(typeof spec.sheenColor === 'string' ? spec.sheenColor : '#ffffff'),
    sheenRoughness: clamp01(readLayerNumber(spec.sheenRoughness, ['base'], 1.0)),
    iridescence: clamp01(readLayerNumber(spec.iridescence, ['base', 'amount'], 0)),
    iridescenceIOR: clampPbrIor(readLayerNumber(spec.iridescenceIOR, ['base', 'value'], 1.3)),
    anisotropy: clamp01(readLayerNumber(spec.anisotropy, ['base', 'amount'], 0)),
    anisotropyRotation: readLayerNumber(spec.anisotropy, ['rotation'], 0),
    specularIntensity: clampPbrF0(readLayerNumber(spec.specularF0 ?? spec.f0 ?? spec.specularIntensity, ['base', 'value'], 1.0)),
    specularColor: new THREE.Color(typeof spec.specularColor === 'string' ? spec.specularColor : '#ffffff'),
    emissive: new THREE.Color(typeof spec.emissive === 'string' ? spec.emissive : '#000000'),
    emissiveIntensity: Math.max(0, readLayerNumber(spec.emissiveIntensity, ['base'], 1.0)),
    opacity: clamp01(readLayerNumber(spec.opacity, ['base'], 1)),
    transparent: readLayerNumber(spec.transmission, ['base', 'amount'], 0) > 0 || readLayerNumber(spec.opacity, ['base'], 1) < 1,
    alphaTest: Math.max(0, readLayerNumber(spec.alpha, ['cutoff', 'alphaTest'], 0)),
    wireframe: options.wireframe ?? false,
    side: spec.doubleSided === true ? THREE.DoubleSide : THREE.FrontSide,
    flatShading: spec.flatShading === true,
  });
  if (textures) {
    material.map = textures.albedo;
    material.roughnessMap = textures.roughness;
    material.normalMap = textures.normal;
    material.normalScale.setScalar(Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35)));
    material.aoMap = textures.ao;
    material.aoMap.channel = 0;
    material.aoMapIntensity = readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35);
    const denseMesh = denseComponent || spec.denseMesh === true || spec.geometryDensity === 'dense' || spec.topologyClass === 'dense';
    const bumpScale = Math.max(0, readLayerNumber(spec.bump, ['amplitude', 'strength'], 0));
    const effectiveBumpScale = denseMesh ? Math.max(0.05, bumpScale) : bumpScale;
    if (effectiveBumpScale > 0) {
      material.bumpMap = textures.height;
      material.bumpScale = effectiveBumpScale;
    }
    const displacementScale = Math.max(0, readLayerNumber(spec.displacement, ['amplitude', 'strength'], 0));
    const effectiveDisplacementScale = denseMesh ? Math.max(0.005, displacementScale) : displacementScale;
    if (effectiveDisplacementScale > 0) {
      material.displacementMap = textures.height;
      material.displacementScale = effectiveDisplacementScale;
      material.displacementBias = -effectiveDisplacementScale * 0.5;
    }
  }
  material.envMapIntensity = readLayerNumber(spec, ['envMapIntensity'], 0.8);
  material.userData.sculptMaterial = spec;
  material.userData.proceduralMapsIndependent = true;
  material.userData.pbrConstraints = { albedoRange: [30, 240], binaryMetalness: true, f0Range: [0.02, 1], iorRange: [1, 2.5] };
  material.userData.pbrTextureSource = textures?.source ?? 'flat-fallback';
  material.userData.referencePbr = spec.referencePbr ?? null;
  material.userData.referenceMaterialId = spec.referenceMaterialId ?? spec.materialReference?.profileId ?? null;
  material.userData.materialEvidence = spec.materialEvidence ?? null;
  material.userData.validationViews = spec.materialReference?.validationViews ?? [];
  material.needsUpdate = true;
  return material;
}

type AttachmentEndpoint = {
  start: THREE.Vector3;
  midpoint: THREE.Vector3;
  quaternion: THREE.Quaternion;
  length: number;
  baseRadius: number;
  endRadius: number;
};

function readVector3(value: unknown, fallback: [number, number, number]): THREE.Vector3 {
  if (Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number')) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function makeAttachmentEndpoint(attachment: unknown): AttachmentEndpoint | null {
  if (!attachment || typeof attachment !== 'object') return null;
  const record = attachment as Record<string, unknown>;
  const start = readVector3(record.localStart, [0, 0, 0]);
  const end = readVector3(record.localEnd, [0, 1, 0]);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (length <= 0.0001) return null;
  const direction = delta.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const baseRadius = Math.max(0.005, readNumber(record.baseRadius, 0.06));
  const endRadius = Math.max(0.003, readNumber(record.endRadius, baseRadius * 0.55));
  return {
    start,
    midpoint: delta.multiplyScalar(0.5),
    quaternion,
    length,
    baseRadius,
    endRadius,
  };
}

// Generated from ObjectSculptSpec target: Fisherfolk Guild Hall
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createFisherfolkGuildHallModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "Fisherfolk Guild Hall";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": {"solved": false, "fovDegrees": 40, "aspect": 1, "orientation": {"yaw": 0, "pitch": 0, "roll": 0}, "positionHint": [0, 0, 3], "note": "For likeness work, solve the reference camera (forge/stage1_intake/solve_camera_pose.py) so the review render aligns with the photo and the reference can be projected. Confirm by overlay review."}, "approximationNotes": []};
  root.userData.materialPipeline = {};
  root.userData.materialReferenceRegistry = null;

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["weathered-slate"] = createSculptMaterial(
    "weathered-slate",
    {"id": "weathered-slate", "name": "Weathered Slate", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#405864", "color": "#405864", "albedo": {"dominant": "#405864", "secondary": ["#D59A58"], "samplingNotes": "De-lit procedural intent derived from the approved Guild Hall reference packet."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.58, "variation": 0.11, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "weathered-slate-independent-normal", "strength": 0.2, "scale": 26, "space": "tangent"}, "bump": {"pattern": "weathered-slate-independent-height", "amplitude": 0.022, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.42, "notes": "Concentrate in roof courses, timber joints, masonry courses and window recesses."}, "wear": {"edgeWear": 0.08, "scratches": ["salt-facing directional wear"], "chips": ["sparse exposed construction edges"]}, "dirt": {"amount": 0.07, "cavityBias": 0.78, "color": "#252B2B"}, "localOverrides": [{"id": "weathering", "region": "observed weathered-slate identity zones", "roughness": 0.58, "strength": 0.72, "evidenceRefs": ["guild-hall-primary"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45, "evidenceRefs": ["guild-hall-primary"]},
    options
  );
  materialMap["cedar-timber"] = createSculptMaterial(
    "cedar-timber",
    {"id": "cedar-timber", "name": "Cedar Timber", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#70462E", "color": "#70462E", "albedo": {"dominant": "#70462E", "secondary": ["#D59A58"], "samplingNotes": "De-lit procedural intent derived from the approved Guild Hall reference packet."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.52, "variation": 0.11, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "cedar-timber-independent-normal", "strength": 0.2, "scale": 26, "space": "tangent"}, "bump": {"pattern": "cedar-timber-independent-height", "amplitude": 0.022, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.42, "notes": "Concentrate in roof courses, timber joints, masonry courses and window recesses."}, "wear": {"edgeWear": 0.08, "scratches": ["salt-facing directional wear"], "chips": ["sparse exposed construction edges"]}, "dirt": {"amount": 0.07, "cavityBias": 0.78, "color": "#252B2B"}, "localOverrides": [{"id": "grain-cavity", "region": "observed cedar-timber identity zones", "roughness": 0.52, "strength": 0.72, "evidenceRefs": ["guild-hall-primary"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45, "evidenceRefs": ["guild-hall-primary"]},
    options
  );
  materialMap["warm-plaster"] = createSculptMaterial(
    "warm-plaster",
    {"id": "warm-plaster", "name": "Warm Plaster", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#D6B07A", "color": "#D6B07A", "albedo": {"dominant": "#D6B07A", "secondary": ["#D59A58"], "samplingNotes": "De-lit procedural intent derived from the approved Guild Hall reference packet."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.72, "variation": 0.11, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "warm-plaster-independent-normal", "strength": 0.2, "scale": 26, "space": "tangent"}, "bump": {"pattern": "warm-plaster-independent-height", "amplitude": 0.022, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.42, "notes": "Concentrate in roof courses, timber joints, masonry courses and window recesses."}, "wear": {"edgeWear": 0.08, "scratches": ["salt-facing directional wear"], "chips": ["sparse exposed construction edges"]}, "dirt": {"amount": 0.07, "cavityBias": 0.78, "color": "#252B2B"}, "localOverrides": [{"id": "salt-stain", "region": "observed warm-plaster identity zones", "roughness": 0.72, "strength": 0.72, "evidenceRefs": ["guild-hall-primary"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45, "evidenceRefs": ["guild-hall-primary"]},
    options
  );
  materialMap["coastal-stone"] = createSculptMaterial(
    "coastal-stone",
    {"id": "coastal-stone", "name": "Coastal Stone", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#7B8078", "color": "#7B8078", "albedo": {"dominant": "#7B8078", "secondary": ["#D59A58"], "samplingNotes": "De-lit procedural intent derived from the approved Guild Hall reference packet."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.84, "variation": 0.11, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "coastal-stone-independent-normal", "strength": 0.2, "scale": 26, "space": "tangent"}, "bump": {"pattern": "coastal-stone-independent-height", "amplitude": 0.022, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.42, "notes": "Concentrate in roof courses, timber joints, masonry courses and window recesses."}, "wear": {"edgeWear": 0.08, "scratches": ["salt-facing directional wear"], "chips": ["sparse exposed construction edges"]}, "dirt": {"amount": 0.07, "cavityBias": 0.78, "color": "#252B2B"}, "localOverrides": [{"id": "block-cavity", "region": "observed coastal-stone identity zones", "roughness": 0.84, "strength": 0.72, "evidenceRefs": ["guild-hall-primary"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45, "evidenceRefs": ["guild-hall-primary"]},
    options
  );
  materialMap["aged-brass"] = createSculptMaterial(
    "aged-brass",
    {"id": "aged-brass", "name": "Aged Brass", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#B77833", "color": "#B77833", "albedo": {"dominant": "#B77833", "secondary": ["#D59A58"], "samplingNotes": "De-lit procedural intent derived from the approved Guild Hall reference packet."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.36, "variation": 0.11, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "aged-brass-independent-normal", "strength": 0.2, "scale": 26, "space": "tangent"}, "bump": {"pattern": "aged-brass-independent-height", "amplitude": 0.022, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.42, "notes": "Concentrate in roof courses, timber joints, masonry courses and window recesses."}, "wear": {"edgeWear": 0.08, "scratches": ["salt-facing directional wear"], "chips": ["sparse exposed construction edges"]}, "dirt": {"amount": 0.07, "cavityBias": 0.78, "color": "#252B2B"}, "localOverrides": [{"id": "edge-patina", "region": "observed aged-brass identity zones", "roughness": 0.36, "strength": 0.72, "evidenceRefs": ["guild-hall-primary"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45, "evidenceRefs": ["guild-hall-primary"]},
    options
  );
  materialMap["amber-glass"] = createSculptMaterial(
    "amber-glass",
    {"id": "amber-glass", "name": "Amber Glass", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#FFB240", "color": "#FFB240", "albedo": {"dominant": "#FFB240", "secondary": ["#D59A58"], "samplingNotes": "De-lit procedural intent derived from the approved Guild Hall reference packet."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.16, "variation": 0.11, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "amber-glass-independent-normal", "strength": 0.2, "scale": 26, "space": "tangent"}, "bump": {"pattern": "amber-glass-independent-height", "amplitude": 0.022, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.42, "notes": "Concentrate in roof courses, timber joints, masonry courses and window recesses."}, "wear": {"edgeWear": 0.08, "scratches": ["salt-facing directional wear"], "chips": ["sparse exposed construction edges"]}, "dirt": {"amount": 0.07, "cavityBias": 0.78, "color": "#252B2B"}, "localOverrides": [{"id": "recessed-emission", "region": "observed amber-glass identity zones", "roughness": 0.16, "strength": 0.72, "evidenceRefs": ["guild-hall-primary"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#7A2C05", "emissiveIntensity": 1.15, "transparent": true, "opacity": 0.78, "transmission": 0, "ior": 1.45, "evidenceRefs": ["guild-hall-primary"]},
    options
  );
  materialMap["striped-cloth"] = createSculptMaterial(
    "striped-cloth",
    {"id": "striped-cloth", "name": "Striped Cloth", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#A74635", "color": "#A74635", "albedo": {"dominant": "#A74635", "secondary": ["#D59A58"], "samplingNotes": "De-lit procedural intent derived from the approved Guild Hall reference packet."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.7, "variation": 0.11, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "striped-cloth-independent-normal", "strength": 0.2, "scale": 26, "space": "tangent"}, "bump": {"pattern": "striped-cloth-independent-height", "amplitude": 0.022, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.42, "notes": "Concentrate in roof courses, timber joints, masonry courses and window recesses."}, "wear": {"edgeWear": 0.08, "scratches": ["salt-facing directional wear"], "chips": ["sparse exposed construction edges"]}, "dirt": {"amount": 0.07, "cavityBias": 0.78, "color": "#252B2B"}, "localOverrides": [{"id": "cloth-fade", "region": "observed striped-cloth identity zones", "roughness": 0.7, "strength": 0.72, "evidenceRefs": ["guild-hall-primary"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45, "evidenceRefs": ["guild-hall-primary"]},
    options
  );
  materialMap["rope-fiber"] = createSculptMaterial(
    "rope-fiber",
    {"id": "rope-fiber", "name": "Rope Fiber", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#9A7149", "color": "#9A7149", "albedo": {"dominant": "#9A7149", "secondary": ["#D59A58"], "samplingNotes": "De-lit procedural intent derived from the approved Guild Hall reference packet."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.88, "variation": 0.11, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "rope-fiber-independent-normal", "strength": 0.2, "scale": 26, "space": "tangent"}, "bump": {"pattern": "rope-fiber-independent-height", "amplitude": 0.022, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.42, "notes": "Concentrate in roof courses, timber joints, masonry courses and window recesses."}, "wear": {"edgeWear": 0.08, "scratches": ["salt-facing directional wear"], "chips": ["sparse exposed construction edges"]}, "dirt": {"amount": 0.07, "cavityBias": 0.78, "color": "#252B2B"}, "localOverrides": [{"id": "fiber-fray", "region": "observed rope-fiber identity zones", "roughness": 0.88, "strength": 0.72, "evidenceRefs": ["guild-hall-primary"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45, "evidenceRefs": ["guild-hall-primary"]},
    options
  );

  const nodes: Record<string, THREE.Object3D> = { root };
  const meshes: Record<string, THREE.Mesh> = {};
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = {};

  const attachment_root_0 = null;
  const endpoint_root_0 = makeAttachmentEndpoint(attachment_root_0);
  const node_root_0 = new THREE.Group();
  node_root_0.name = "Root__pivot";
  node_root_0.scale.set(1, 1, 1);
  if (endpoint_root_0) {
    node_root_0.position.copy(endpoint_root_0.start);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_root_0.position.set(0.0, 0.0, 0.0);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  }
  node_root_0.userData.sculptComponent = {"id": "root", "name": "Root", "level": "macro", "role": "Guild Hall action-ready root", "importance": 1, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": null, "attachment": null, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "coastal-stone", "materialLayers": ["coastal-stone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "focus-socket", "placement": "Observed focus socket on root.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "entry-socket", "placement": "Observed entry socket on root.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "build-socket", "placement": "Observed build socket on root.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["focus-socket", "entry-socket", "build-socket"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_root_0.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_root_0);
  nodes["root"] = node_root_0;
  const mesh_root_0Geometry = endpoint_root_0
    ? new THREE.CylinderGeometry(endpoint_root_0.endRadius, endpoint_root_0.baseRadius, endpoint_root_0.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_root_0) {
    mesh_root_0Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_root_0 = new THREE.Mesh(
    mesh_root_0Geometry,
    materialMap["coastal-stone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_root_0.name = "Root";
  if (endpoint_root_0) {
    mesh_root_0.position.copy(endpoint_root_0.midpoint);
    mesh_root_0.quaternion.copy(endpoint_root_0.quaternion);
  }
  mesh_root_0.castShadow = options.castShadow ?? true;
  mesh_root_0.receiveShadow = options.receiveShadow ?? true;
  mesh_root_0.userData.sculptComponent = {"id": "root", "name": "Root", "level": "macro", "role": "Guild Hall action-ready root", "importance": 1, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": null, "attachment": null, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "coastal-stone", "materialLayers": ["coastal-stone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "focus-socket", "placement": "Observed focus socket on root.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "entry-socket", "placement": "Observed entry socket on root.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "build-socket", "placement": "Observed build socket on root.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["focus-socket", "entry-socket", "build-socket"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_root_0.add(mesh_root_0);
  meshes["root"] = mesh_root_0;
  colliders["root"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_root_0);
  const socket_root_camera_exterior_0 = new THREE.Object3D();
  socket_root_camera_exterior_0.name = "camera-exterior";
  socket_root_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_root_camera_exterior_0.rotation.set(0, 0, 0);
  socket_root_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_root_0.add(socket_root_camera_exterior_0);
  sockets["root:camera-exterior"] = socket_root_camera_exterior_0;
  const socket_root_environment_downwash_origin_1 = new THREE.Object3D();
  socket_root_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_root_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_root_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_root_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_root_0.add(socket_root_environment_downwash_origin_1);
  sockets["root:environment-downwash-origin"] = socket_root_environment_downwash_origin_1;

  const attachment_stone_foundation_1 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_stone_foundation_1 = makeAttachmentEndpoint(attachment_stone_foundation_1);
  const node_stone_foundation_1 = new THREE.Group();
  node_stone_foundation_1.name = "Stone Foundation__pivot";
  node_stone_foundation_1.scale.set(1, 1, 1);
  if (endpoint_stone_foundation_1) {
    node_stone_foundation_1.position.copy(endpoint_stone_foundation_1.start);
    node_stone_foundation_1.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_stone_foundation_1.position.set(0.0, 0.0, 0.0);
    node_stone_foundation_1.rotation.set(0.0, 0.0, 0.0);
  }
  node_stone_foundation_1.userData.sculptComponent = {"id": "stone-foundation", "name": "Stone Foundation", "level": "macro", "role": "stepped coastal masonry footing", "importance": 1, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "coastal-stone", "materialLayers": ["coastal-stone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "block-courses", "placement": "Observed block courses on stone foundation.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["block-courses"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_stone_foundation_1.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_stone_foundation_1);
  nodes["stone-foundation"] = node_stone_foundation_1;
  const mesh_stone_foundation_1Geometry = endpoint_stone_foundation_1
    ? new THREE.CylinderGeometry(endpoint_stone_foundation_1.endRadius, endpoint_stone_foundation_1.baseRadius, endpoint_stone_foundation_1.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_stone_foundation_1) {
    mesh_stone_foundation_1Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_stone_foundation_1 = new THREE.Mesh(
    mesh_stone_foundation_1Geometry,
    materialMap["coastal-stone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_stone_foundation_1.name = "Stone Foundation";
  if (endpoint_stone_foundation_1) {
    mesh_stone_foundation_1.position.copy(endpoint_stone_foundation_1.midpoint);
    mesh_stone_foundation_1.quaternion.copy(endpoint_stone_foundation_1.quaternion);
  }
  mesh_stone_foundation_1.castShadow = options.castShadow ?? true;
  mesh_stone_foundation_1.receiveShadow = options.receiveShadow ?? true;
  mesh_stone_foundation_1.userData.sculptComponent = {"id": "stone-foundation", "name": "Stone Foundation", "level": "macro", "role": "stepped coastal masonry footing", "importance": 1, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "coastal-stone", "materialLayers": ["coastal-stone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "block-courses", "placement": "Observed block courses on stone foundation.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["block-courses"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_stone_foundation_1.add(mesh_stone_foundation_1);
  meshes["stone-foundation"] = mesh_stone_foundation_1;
  colliders["stone-foundation"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_stone_foundation_1);
  const socket_stone_foundation_camera_exterior_0 = new THREE.Object3D();
  socket_stone_foundation_camera_exterior_0.name = "camera-exterior";
  socket_stone_foundation_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_stone_foundation_camera_exterior_0.rotation.set(0, 0, 0);
  socket_stone_foundation_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_stone_foundation_1.add(socket_stone_foundation_camera_exterior_0);
  sockets["stone-foundation:camera-exterior"] = socket_stone_foundation_camera_exterior_0;
  const socket_stone_foundation_environment_downwash_origin_1 = new THREE.Object3D();
  socket_stone_foundation_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_stone_foundation_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_stone_foundation_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_stone_foundation_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_stone_foundation_1.add(socket_stone_foundation_environment_downwash_origin_1);
  sockets["stone-foundation:environment-downwash-origin"] = socket_stone_foundation_environment_downwash_origin_1;

  const attachment_main_hall_volume_2 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_main_hall_volume_2 = makeAttachmentEndpoint(attachment_main_hall_volume_2);
  const node_main_hall_volume_2 = new THREE.Group();
  node_main_hall_volume_2.name = "Main Hall Volume__pivot";
  node_main_hall_volume_2.scale.set(1, 1, 1);
  if (endpoint_main_hall_volume_2) {
    node_main_hall_volume_2.position.copy(endpoint_main_hall_volume_2.start);
    node_main_hall_volume_2.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_main_hall_volume_2.position.set(0.0, 0.0, 0.0);
    node_main_hall_volume_2.rotation.set(0.0, 0.0, 0.0);
  }
  node_main_hall_volume_2.userData.sculptComponent = {"id": "main-hall-volume", "name": "Main Hall Volume", "level": "macro", "role": "inhabited plaster and timber hall volume", "importance": 1, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "warm-plaster", "materialLayers": ["warm-plaster"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "asymmetric-wall-bays", "placement": "Observed asymmetric wall bays on main hall volume.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["asymmetric-wall-bays"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_main_hall_volume_2.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_main_hall_volume_2);
  nodes["main-hall-volume"] = node_main_hall_volume_2;
  const mesh_main_hall_volume_2Geometry = endpoint_main_hall_volume_2
    ? new THREE.CylinderGeometry(endpoint_main_hall_volume_2.endRadius, endpoint_main_hall_volume_2.baseRadius, endpoint_main_hall_volume_2.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_main_hall_volume_2) {
    mesh_main_hall_volume_2Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_main_hall_volume_2 = new THREE.Mesh(
    mesh_main_hall_volume_2Geometry,
    materialMap["warm-plaster"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_main_hall_volume_2.name = "Main Hall Volume";
  if (endpoint_main_hall_volume_2) {
    mesh_main_hall_volume_2.position.copy(endpoint_main_hall_volume_2.midpoint);
    mesh_main_hall_volume_2.quaternion.copy(endpoint_main_hall_volume_2.quaternion);
  }
  mesh_main_hall_volume_2.castShadow = options.castShadow ?? true;
  mesh_main_hall_volume_2.receiveShadow = options.receiveShadow ?? true;
  mesh_main_hall_volume_2.userData.sculptComponent = {"id": "main-hall-volume", "name": "Main Hall Volume", "level": "macro", "role": "inhabited plaster and timber hall volume", "importance": 1, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "warm-plaster", "materialLayers": ["warm-plaster"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "asymmetric-wall-bays", "placement": "Observed asymmetric wall bays on main hall volume.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["asymmetric-wall-bays"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_main_hall_volume_2.add(mesh_main_hall_volume_2);
  meshes["main-hall-volume"] = mesh_main_hall_volume_2;
  colliders["main-hall-volume"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_main_hall_volume_2);
  const socket_main_hall_volume_camera_exterior_0 = new THREE.Object3D();
  socket_main_hall_volume_camera_exterior_0.name = "camera-exterior";
  socket_main_hall_volume_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_main_hall_volume_camera_exterior_0.rotation.set(0, 0, 0);
  socket_main_hall_volume_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_main_hall_volume_2.add(socket_main_hall_volume_camera_exterior_0);
  sockets["main-hall-volume:camera-exterior"] = socket_main_hall_volume_camera_exterior_0;
  const socket_main_hall_volume_environment_downwash_origin_1 = new THREE.Object3D();
  socket_main_hall_volume_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_main_hall_volume_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_main_hall_volume_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_main_hall_volume_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_main_hall_volume_2.add(socket_main_hall_volume_environment_downwash_origin_1);
  sockets["main-hall-volume:environment-downwash-origin"] = socket_main_hall_volume_environment_downwash_origin_1;

  const attachment_roof_shell_3 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_roof_shell_3 = makeAttachmentEndpoint(attachment_roof_shell_3);
  const node_roof_shell_3 = new THREE.Group();
  node_roof_shell_3.name = "Roof Shell__pivot";
  node_roof_shell_3.scale.set(1, 1, 1);
  if (endpoint_roof_shell_3) {
    node_roof_shell_3.position.copy(endpoint_roof_shell_3.start);
    node_roof_shell_3.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_roof_shell_3.position.set(0.0, 0.0, 0.0);
    node_roof_shell_3.rotation.set(0.0, 0.0, 0.0);
  }
  node_roof_shell_3.userData.sculptComponent = {"id": "roof-shell", "name": "Roof Shell", "level": "macro", "role": "continuous swept mansard roof silhouette", "importance": 1, "confidence": 0.9, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "swept-eave", "placement": "Observed swept eave on roof shell.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "curl-caps", "placement": "Observed curl caps on roof shell.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["swept-eave", "curl-caps"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_roof_shell_3.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_roof_shell_3);
  nodes["roof-shell"] = node_roof_shell_3;
  const mesh_roof_shell_3Geometry = endpoint_roof_shell_3
    ? new THREE.CylinderGeometry(endpoint_roof_shell_3.endRadius, endpoint_roof_shell_3.baseRadius, endpoint_roof_shell_3.length, 32, 12)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_roof_shell_3) {
    mesh_roof_shell_3Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_roof_shell_3 = new THREE.Mesh(
    mesh_roof_shell_3Geometry,
    materialMap["weathered-slate"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_roof_shell_3.name = "Roof Shell";
  if (endpoint_roof_shell_3) {
    mesh_roof_shell_3.position.copy(endpoint_roof_shell_3.midpoint);
    mesh_roof_shell_3.quaternion.copy(endpoint_roof_shell_3.quaternion);
  }
  mesh_roof_shell_3.castShadow = options.castShadow ?? true;
  mesh_roof_shell_3.receiveShadow = options.receiveShadow ?? true;
  mesh_roof_shell_3.userData.sculptComponent = {"id": "roof-shell", "name": "Roof Shell", "level": "macro", "role": "continuous swept mansard roof silhouette", "importance": 1, "confidence": 0.9, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "swept-eave", "placement": "Observed swept eave on roof shell.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "curl-caps", "placement": "Observed curl caps on roof shell.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["swept-eave", "curl-caps"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_roof_shell_3.add(mesh_roof_shell_3);
  meshes["roof-shell"] = mesh_roof_shell_3;
  colliders["roof-shell"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_roof_shell_3);
  const socket_roof_shell_camera_exterior_0 = new THREE.Object3D();
  socket_roof_shell_camera_exterior_0.name = "camera-exterior";
  socket_roof_shell_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_roof_shell_camera_exterior_0.rotation.set(0, 0, 0);
  socket_roof_shell_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_roof_shell_3.add(socket_roof_shell_camera_exterior_0);
  sockets["roof-shell:camera-exterior"] = socket_roof_shell_camera_exterior_0;
  const socket_roof_shell_environment_downwash_origin_1 = new THREE.Object3D();
  socket_roof_shell_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_roof_shell_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_roof_shell_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_roof_shell_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_roof_shell_3.add(socket_roof_shell_environment_downwash_origin_1);
  sockets["roof-shell:environment-downwash-origin"] = socket_roof_shell_environment_downwash_origin_1;

  const attachment_pointed_entry_4 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_pointed_entry_4 = makeAttachmentEndpoint(attachment_pointed_entry_4);
  const node_pointed_entry_4 = new THREE.Group();
  node_pointed_entry_4.name = "Pointed Entry__pivot";
  node_pointed_entry_4.scale.set(1, 1, 1);
  if (endpoint_pointed_entry_4) {
    node_pointed_entry_4.position.copy(endpoint_pointed_entry_4.start);
    node_pointed_entry_4.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_pointed_entry_4.position.set(0.0, 0.0, 0.0);
    node_pointed_entry_4.rotation.set(0.0, 0.0, 0.0);
  }
  node_pointed_entry_4.userData.sculptComponent = {"id": "pointed-entry", "name": "Pointed Entry", "level": "macro", "role": "deep pointed guild entry portal", "importance": 1, "confidence": 0.9, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "portal", "placement": "Observed portal on pointed entry.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "structural-overlap", "placement": "Observed structural overlap on pointed entry.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["portal", "structural-overlap"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_pointed_entry_4.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_pointed_entry_4);
  nodes["pointed-entry"] = node_pointed_entry_4;
  const mesh_pointed_entry_4Geometry = endpoint_pointed_entry_4
    ? new THREE.CylinderGeometry(endpoint_pointed_entry_4.endRadius, endpoint_pointed_entry_4.baseRadius, endpoint_pointed_entry_4.length, 32, 12)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_pointed_entry_4) {
    mesh_pointed_entry_4Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_pointed_entry_4 = new THREE.Mesh(
    mesh_pointed_entry_4Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_pointed_entry_4.name = "Pointed Entry";
  if (endpoint_pointed_entry_4) {
    mesh_pointed_entry_4.position.copy(endpoint_pointed_entry_4.midpoint);
    mesh_pointed_entry_4.quaternion.copy(endpoint_pointed_entry_4.quaternion);
  }
  mesh_pointed_entry_4.castShadow = options.castShadow ?? true;
  mesh_pointed_entry_4.receiveShadow = options.receiveShadow ?? true;
  mesh_pointed_entry_4.userData.sculptComponent = {"id": "pointed-entry", "name": "Pointed Entry", "level": "macro", "role": "deep pointed guild entry portal", "importance": 1, "confidence": 0.9, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "portal", "placement": "Observed portal on pointed entry.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "structural-overlap", "placement": "Observed structural overlap on pointed entry.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["portal", "structural-overlap"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_pointed_entry_4.add(mesh_pointed_entry_4);
  meshes["pointed-entry"] = mesh_pointed_entry_4;
  colliders["pointed-entry"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_pointed_entry_4);
  const socket_pointed_entry_camera_exterior_0 = new THREE.Object3D();
  socket_pointed_entry_camera_exterior_0.name = "camera-exterior";
  socket_pointed_entry_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_pointed_entry_camera_exterior_0.rotation.set(0, 0, 0);
  socket_pointed_entry_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_pointed_entry_4.add(socket_pointed_entry_camera_exterior_0);
  sockets["pointed-entry:camera-exterior"] = socket_pointed_entry_camera_exterior_0;
  const socket_pointed_entry_environment_downwash_origin_1 = new THREE.Object3D();
  socket_pointed_entry_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_pointed_entry_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_pointed_entry_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_pointed_entry_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_pointed_entry_4.add(socket_pointed_entry_environment_downwash_origin_1);
  sockets["pointed-entry:environment-downwash-origin"] = socket_pointed_entry_environment_downwash_origin_1;

  const attachment_rear_service_5 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_rear_service_5 = makeAttachmentEndpoint(attachment_rear_service_5);
  const node_rear_service_5 = new THREE.Group();
  node_rear_service_5.name = "Rear Service__pivot";
  node_rear_service_5.scale.set(1, 1, 1);
  if (endpoint_rear_service_5) {
    node_rear_service_5.position.copy(endpoint_rear_service_5.start);
    node_rear_service_5.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_rear_service_5.position.set(0.0, 0.0, 0.0);
    node_rear_service_5.rotation.set(0.0, 0.0, 0.0);
  }
  node_rear_service_5.userData.sculptComponent = {"id": "rear-service", "name": "Rear Service", "level": "macro", "role": "supported rear service wing and balcony", "importance": 1, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "supported-balcony", "placement": "Observed supported balcony on rear service.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["supported-balcony"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_rear_service_5.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_rear_service_5);
  nodes["rear-service"] = node_rear_service_5;
  const mesh_rear_service_5Geometry = endpoint_rear_service_5
    ? new THREE.CylinderGeometry(endpoint_rear_service_5.endRadius, endpoint_rear_service_5.baseRadius, endpoint_rear_service_5.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_rear_service_5) {
    mesh_rear_service_5Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_rear_service_5 = new THREE.Mesh(
    mesh_rear_service_5Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_rear_service_5.name = "Rear Service";
  if (endpoint_rear_service_5) {
    mesh_rear_service_5.position.copy(endpoint_rear_service_5.midpoint);
    mesh_rear_service_5.quaternion.copy(endpoint_rear_service_5.quaternion);
  }
  mesh_rear_service_5.castShadow = options.castShadow ?? true;
  mesh_rear_service_5.receiveShadow = options.receiveShadow ?? true;
  mesh_rear_service_5.userData.sculptComponent = {"id": "rear-service", "name": "Rear Service", "level": "macro", "role": "supported rear service wing and balcony", "importance": 1, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "supported-balcony", "placement": "Observed supported balcony on rear service.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["supported-balcony"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_rear_service_5.add(mesh_rear_service_5);
  meshes["rear-service"] = mesh_rear_service_5;
  colliders["rear-service"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_rear_service_5);
  const socket_rear_service_camera_exterior_0 = new THREE.Object3D();
  socket_rear_service_camera_exterior_0.name = "camera-exterior";
  socket_rear_service_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_rear_service_camera_exterior_0.rotation.set(0, 0, 0);
  socket_rear_service_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_rear_service_5.add(socket_rear_service_camera_exterior_0);
  sockets["rear-service:camera-exterior"] = socket_rear_service_camera_exterior_0;
  const socket_rear_service_environment_downwash_origin_1 = new THREE.Object3D();
  socket_rear_service_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_rear_service_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_rear_service_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_rear_service_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_rear_service_5.add(socket_rear_service_environment_downwash_origin_1);
  sockets["rear-service:environment-downwash-origin"] = socket_rear_service_environment_downwash_origin_1;

  const attachment_roof_crown_6 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_roof_crown_6 = makeAttachmentEndpoint(attachment_roof_crown_6);
  const node_roof_crown_6 = new THREE.Group();
  node_roof_crown_6.name = "Roof Crown__pivot";
  node_roof_crown_6.scale.set(1, 1, 1);
  if (endpoint_roof_crown_6) {
    node_roof_crown_6.position.copy(endpoint_roof_crown_6.start);
    node_roof_crown_6.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_roof_crown_6.position.set(0.0, 0.0, 0.0);
    node_roof_crown_6.rotation.set(0.0, 0.0, 0.0);
  }
  node_roof_crown_6.userData.sculptComponent = {"id": "roof-crown", "name": "Roof Crown", "level": "meso", "role": "square crown deck and finials", "importance": 0.82, "confidence": 0.9, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "finials", "placement": "Observed finials on roof crown.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "crown-deck", "placement": "Observed crown deck on roof crown.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["finials", "crown-deck"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_roof_crown_6.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_roof_crown_6);
  nodes["roof-crown"] = node_roof_crown_6;
  const mesh_roof_crown_6Geometry = endpoint_roof_crown_6
    ? new THREE.CylinderGeometry(endpoint_roof_crown_6.endRadius, endpoint_roof_crown_6.baseRadius, endpoint_roof_crown_6.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_roof_crown_6) {
    mesh_roof_crown_6Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_roof_crown_6 = new THREE.Mesh(
    mesh_roof_crown_6Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_roof_crown_6.name = "Roof Crown";
  if (endpoint_roof_crown_6) {
    mesh_roof_crown_6.position.copy(endpoint_roof_crown_6.midpoint);
    mesh_roof_crown_6.quaternion.copy(endpoint_roof_crown_6.quaternion);
  }
  mesh_roof_crown_6.castShadow = options.castShadow ?? true;
  mesh_roof_crown_6.receiveShadow = options.receiveShadow ?? true;
  mesh_roof_crown_6.userData.sculptComponent = {"id": "roof-crown", "name": "Roof Crown", "level": "meso", "role": "square crown deck and finials", "importance": 0.82, "confidence": 0.9, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "finials", "placement": "Observed finials on roof crown.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "crown-deck", "placement": "Observed crown deck on roof crown.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["finials", "crown-deck"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_roof_crown_6.add(mesh_roof_crown_6);
  meshes["roof-crown"] = mesh_roof_crown_6;
  colliders["roof-crown"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_roof_crown_6);
  const socket_roof_crown_camera_exterior_0 = new THREE.Object3D();
  socket_roof_crown_camera_exterior_0.name = "camera-exterior";
  socket_roof_crown_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_roof_crown_camera_exterior_0.rotation.set(0, 0, 0);
  socket_roof_crown_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_roof_crown_6.add(socket_roof_crown_camera_exterior_0);
  sockets["roof-crown:camera-exterior"] = socket_roof_crown_camera_exterior_0;
  const socket_roof_crown_environment_downwash_origin_1 = new THREE.Object3D();
  socket_roof_crown_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_roof_crown_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_roof_crown_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_roof_crown_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_roof_crown_6.add(socket_roof_crown_environment_downwash_origin_1);
  sockets["roof-crown:environment-downwash-origin"] = socket_roof_crown_environment_downwash_origin_1;

  const attachment_roof_ribs_7 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_roof_ribs_7 = makeAttachmentEndpoint(attachment_roof_ribs_7);
  const node_roof_ribs_7 = new THREE.Group();
  node_roof_ribs_7.name = "Roof Ribs__pivot";
  node_roof_ribs_7.scale.set(1, 1, 1);
  if (endpoint_roof_ribs_7) {
    node_roof_ribs_7.position.copy(endpoint_roof_ribs_7.start);
    node_roof_ribs_7.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_roof_ribs_7.position.set(0.0, 0.0, 0.0);
    node_roof_ribs_7.rotation.set(0.0, 0.0, 0.0);
  }
  node_roof_ribs_7.userData.sculptComponent = {"id": "roof-ribs", "name": "Roof Ribs", "level": "meso", "role": "embedded warm ribs following roof slope", "importance": 0.82, "confidence": 0.82, "primitive": "curve-sweep", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "embedded-ribs", "placement": "Observed embedded ribs on roof ribs.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["embedded-ribs"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "metal", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_roof_ribs_7.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_roof_ribs_7);
  nodes["roof-ribs"] = node_roof_ribs_7;
  const mesh_roof_ribs_7Geometry = endpoint_roof_ribs_7
    ? new THREE.CylinderGeometry(endpoint_roof_ribs_7.endRadius, endpoint_roof_ribs_7.baseRadius, endpoint_roof_ribs_7.length, 32, 12)
    : buildCurveSweepGeometry({"spine": [[-0.5, -0.4, 0.0], [-0.1, 0.1, 0.0], [0.3, 0.2, 0.0], [0.6, -0.1, 0.0]], "crossSection": {"points": [[-0.04, -0.02], [0.04, -0.02], [0.04, 0.02], [-0.04, 0.02]]}, "closed": false});
  if (!endpoint_roof_ribs_7) {
    mesh_roof_ribs_7Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_roof_ribs_7 = new THREE.Mesh(
    mesh_roof_ribs_7Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_roof_ribs_7.name = "Roof Ribs";
  if (endpoint_roof_ribs_7) {
    mesh_roof_ribs_7.position.copy(endpoint_roof_ribs_7.midpoint);
    mesh_roof_ribs_7.quaternion.copy(endpoint_roof_ribs_7.quaternion);
  }
  mesh_roof_ribs_7.castShadow = options.castShadow ?? true;
  mesh_roof_ribs_7.receiveShadow = options.receiveShadow ?? true;
  mesh_roof_ribs_7.userData.sculptComponent = {"id": "roof-ribs", "name": "Roof Ribs", "level": "meso", "role": "embedded warm ribs following roof slope", "importance": 0.82, "confidence": 0.82, "primitive": "curve-sweep", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "embedded-ribs", "placement": "Observed embedded ribs on roof ribs.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["embedded-ribs"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "metal", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_roof_ribs_7.add(mesh_roof_ribs_7);
  meshes["roof-ribs"] = mesh_roof_ribs_7;
  colliders["roof-ribs"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_roof_ribs_7);
  const socket_roof_ribs_camera_exterior_0 = new THREE.Object3D();
  socket_roof_ribs_camera_exterior_0.name = "camera-exterior";
  socket_roof_ribs_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_roof_ribs_camera_exterior_0.rotation.set(0, 0, 0);
  socket_roof_ribs_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_roof_ribs_7.add(socket_roof_ribs_camera_exterior_0);
  sockets["roof-ribs:camera-exterior"] = socket_roof_ribs_camera_exterior_0;
  const socket_roof_ribs_environment_downwash_origin_1 = new THREE.Object3D();
  socket_roof_ribs_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_roof_ribs_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_roof_ribs_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_roof_ribs_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_roof_ribs_7.add(socket_roof_ribs_environment_downwash_origin_1);
  sockets["roof-ribs:environment-downwash-origin"] = socket_roof_ribs_environment_downwash_origin_1;

  const attachment_chimney_8 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_chimney_8 = makeAttachmentEndpoint(attachment_chimney_8);
  const node_chimney_8 = new THREE.Group();
  node_chimney_8.name = "Chimney__pivot";
  node_chimney_8.scale.set(1, 1, 1);
  if (endpoint_chimney_8) {
    node_chimney_8.position.copy(endpoint_chimney_8.start);
    node_chimney_8.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_chimney_8.position.set(0.0, 0.0, 0.0);
    node_chimney_8.rotation.set(0.0, 0.0, 0.0);
  }
  node_chimney_8.userData.sculptComponent = {"id": "chimney", "name": "Chimney", "level": "meso", "role": "asymmetric banded chimney", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "coastal-stone", "materialLayers": ["coastal-stone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "banded-stack", "placement": "Observed banded stack on chimney.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "cap", "placement": "Observed cap on chimney.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["banded-stack", "cap"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_chimney_8.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_chimney_8);
  nodes["chimney"] = node_chimney_8;
  const mesh_chimney_8Geometry = endpoint_chimney_8
    ? new THREE.CylinderGeometry(endpoint_chimney_8.endRadius, endpoint_chimney_8.baseRadius, endpoint_chimney_8.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_chimney_8) {
    mesh_chimney_8Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_chimney_8 = new THREE.Mesh(
    mesh_chimney_8Geometry,
    materialMap["coastal-stone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_chimney_8.name = "Chimney";
  if (endpoint_chimney_8) {
    mesh_chimney_8.position.copy(endpoint_chimney_8.midpoint);
    mesh_chimney_8.quaternion.copy(endpoint_chimney_8.quaternion);
  }
  mesh_chimney_8.castShadow = options.castShadow ?? true;
  mesh_chimney_8.receiveShadow = options.receiveShadow ?? true;
  mesh_chimney_8.userData.sculptComponent = {"id": "chimney", "name": "Chimney", "level": "meso", "role": "asymmetric banded chimney", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "coastal-stone", "materialLayers": ["coastal-stone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "banded-stack", "placement": "Observed banded stack on chimney.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "cap", "placement": "Observed cap on chimney.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["banded-stack", "cap"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_chimney_8.add(mesh_chimney_8);
  meshes["chimney"] = mesh_chimney_8;
  colliders["chimney"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_chimney_8);
  const socket_chimney_camera_exterior_0 = new THREE.Object3D();
  socket_chimney_camera_exterior_0.name = "camera-exterior";
  socket_chimney_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_chimney_camera_exterior_0.rotation.set(0, 0, 0);
  socket_chimney_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_chimney_8.add(socket_chimney_camera_exterior_0);
  sockets["chimney:camera-exterior"] = socket_chimney_camera_exterior_0;
  const socket_chimney_environment_downwash_origin_1 = new THREE.Object3D();
  socket_chimney_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_chimney_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_chimney_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_chimney_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_chimney_8.add(socket_chimney_environment_downwash_origin_1);
  sockets["chimney:environment-downwash-origin"] = socket_chimney_environment_downwash_origin_1;

  const attachment_front_window_system_9 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_front_window_system_9 = makeAttachmentEndpoint(attachment_front_window_system_9);
  const node_front_window_system_9 = new THREE.Group();
  node_front_window_system_9.name = "Front Window System__pivot";
  node_front_window_system_9.scale.set(1, 1, 1);
  if (endpoint_front_window_system_9) {
    node_front_window_system_9.position.copy(endpoint_front_window_system_9.start);
    node_front_window_system_9.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_front_window_system_9.position.set(0.0, 0.0, 0.0);
    node_front_window_system_9.rotation.set(0.0, 0.0, 0.0);
  }
  node_front_window_system_9.userData.sculptComponent = {"id": "front-window-system", "name": "Front Window System", "level": "meso", "role": "hero arched entry glazing", "importance": 0.82, "confidence": 0.9, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "amber-glass", "materialLayers": ["amber-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "hero-window", "placement": "Observed hero window on front window system.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "recessed-mullions", "placement": "Observed recessed mullions on front window system.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["hero-window", "recessed-mullions"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "glass", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_front_window_system_9.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_front_window_system_9);
  nodes["front-window-system"] = node_front_window_system_9;
  const mesh_front_window_system_9Geometry = endpoint_front_window_system_9
    ? new THREE.CylinderGeometry(endpoint_front_window_system_9.endRadius, endpoint_front_window_system_9.baseRadius, endpoint_front_window_system_9.length, 32, 12)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_front_window_system_9) {
    mesh_front_window_system_9Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_front_window_system_9 = new THREE.Mesh(
    mesh_front_window_system_9Geometry,
    materialMap["amber-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_front_window_system_9.name = "Front Window System";
  if (endpoint_front_window_system_9) {
    mesh_front_window_system_9.position.copy(endpoint_front_window_system_9.midpoint);
    mesh_front_window_system_9.quaternion.copy(endpoint_front_window_system_9.quaternion);
  }
  mesh_front_window_system_9.castShadow = options.castShadow ?? true;
  mesh_front_window_system_9.receiveShadow = options.receiveShadow ?? true;
  mesh_front_window_system_9.userData.sculptComponent = {"id": "front-window-system", "name": "Front Window System", "level": "meso", "role": "hero arched entry glazing", "importance": 0.82, "confidence": 0.9, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "amber-glass", "materialLayers": ["amber-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "hero-window", "placement": "Observed hero window on front window system.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "recessed-mullions", "placement": "Observed recessed mullions on front window system.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["hero-window", "recessed-mullions"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "glass", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_front_window_system_9.add(mesh_front_window_system_9);
  meshes["front-window-system"] = mesh_front_window_system_9;
  colliders["front-window-system"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_front_window_system_9);
  const socket_front_window_system_camera_exterior_0 = new THREE.Object3D();
  socket_front_window_system_camera_exterior_0.name = "camera-exterior";
  socket_front_window_system_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_front_window_system_camera_exterior_0.rotation.set(0, 0, 0);
  socket_front_window_system_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_front_window_system_9.add(socket_front_window_system_camera_exterior_0);
  sockets["front-window-system:camera-exterior"] = socket_front_window_system_camera_exterior_0;
  const socket_front_window_system_environment_downwash_origin_1 = new THREE.Object3D();
  socket_front_window_system_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_front_window_system_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_front_window_system_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_front_window_system_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_front_window_system_9.add(socket_front_window_system_environment_downwash_origin_1);
  sockets["front-window-system:environment-downwash-origin"] = socket_front_window_system_environment_downwash_origin_1;

  const attachment_dormer_left_10 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_dormer_left_10 = makeAttachmentEndpoint(attachment_dormer_left_10);
  const node_dormer_left_10 = new THREE.Group();
  node_dormer_left_10.name = "Dormer Left__pivot";
  node_dormer_left_10.scale.set(1, 1, 1);
  if (endpoint_dormer_left_10) {
    node_dormer_left_10.position.copy(endpoint_dormer_left_10.start);
    node_dormer_left_10.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_dormer_left_10.position.set(0.0, 0.0, 0.0);
    node_dormer_left_10.rotation.set(0.0, 0.0, 0.0);
  }
  node_dormer_left_10.userData.sculptComponent = {"id": "dormer-left", "name": "Dormer Left", "level": "meso", "role": "left embedded roof dormer", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "embedded-dormer", "placement": "Observed embedded dormer on dormer left.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["embedded-dormer"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_dormer_left_10.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_dormer_left_10);
  nodes["dormer-left"] = node_dormer_left_10;
  const mesh_dormer_left_10Geometry = endpoint_dormer_left_10
    ? new THREE.CylinderGeometry(endpoint_dormer_left_10.endRadius, endpoint_dormer_left_10.baseRadius, endpoint_dormer_left_10.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_dormer_left_10) {
    mesh_dormer_left_10Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_dormer_left_10 = new THREE.Mesh(
    mesh_dormer_left_10Geometry,
    materialMap["weathered-slate"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_dormer_left_10.name = "Dormer Left";
  if (endpoint_dormer_left_10) {
    mesh_dormer_left_10.position.copy(endpoint_dormer_left_10.midpoint);
    mesh_dormer_left_10.quaternion.copy(endpoint_dormer_left_10.quaternion);
  }
  mesh_dormer_left_10.castShadow = options.castShadow ?? true;
  mesh_dormer_left_10.receiveShadow = options.receiveShadow ?? true;
  mesh_dormer_left_10.userData.sculptComponent = {"id": "dormer-left", "name": "Dormer Left", "level": "meso", "role": "left embedded roof dormer", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "embedded-dormer", "placement": "Observed embedded dormer on dormer left.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["embedded-dormer"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_dormer_left_10.add(mesh_dormer_left_10);
  meshes["dormer-left"] = mesh_dormer_left_10;
  colliders["dormer-left"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_dormer_left_10);
  const socket_dormer_left_camera_exterior_0 = new THREE.Object3D();
  socket_dormer_left_camera_exterior_0.name = "camera-exterior";
  socket_dormer_left_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_dormer_left_camera_exterior_0.rotation.set(0, 0, 0);
  socket_dormer_left_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_dormer_left_10.add(socket_dormer_left_camera_exterior_0);
  sockets["dormer-left:camera-exterior"] = socket_dormer_left_camera_exterior_0;
  const socket_dormer_left_environment_downwash_origin_1 = new THREE.Object3D();
  socket_dormer_left_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_dormer_left_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_dormer_left_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_dormer_left_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_dormer_left_10.add(socket_dormer_left_environment_downwash_origin_1);
  sockets["dormer-left:environment-downwash-origin"] = socket_dormer_left_environment_downwash_origin_1;

  const attachment_dormer_right_11 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_dormer_right_11 = makeAttachmentEndpoint(attachment_dormer_right_11);
  const node_dormer_right_11 = new THREE.Group();
  node_dormer_right_11.name = "Dormer Right__pivot";
  node_dormer_right_11.scale.set(1, 1, 1);
  if (endpoint_dormer_right_11) {
    node_dormer_right_11.position.copy(endpoint_dormer_right_11.start);
    node_dormer_right_11.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_dormer_right_11.position.set(0.0, 0.0, 0.0);
    node_dormer_right_11.rotation.set(0.0, 0.0, 0.0);
  }
  node_dormer_right_11.userData.sculptComponent = {"id": "dormer-right", "name": "Dormer Right", "level": "meso", "role": "right embedded roof dormer", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "embedded-dormer", "placement": "Observed embedded dormer on dormer right.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["embedded-dormer"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_dormer_right_11.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_dormer_right_11);
  nodes["dormer-right"] = node_dormer_right_11;
  const mesh_dormer_right_11Geometry = endpoint_dormer_right_11
    ? new THREE.CylinderGeometry(endpoint_dormer_right_11.endRadius, endpoint_dormer_right_11.baseRadius, endpoint_dormer_right_11.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_dormer_right_11) {
    mesh_dormer_right_11Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_dormer_right_11 = new THREE.Mesh(
    mesh_dormer_right_11Geometry,
    materialMap["weathered-slate"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_dormer_right_11.name = "Dormer Right";
  if (endpoint_dormer_right_11) {
    mesh_dormer_right_11.position.copy(endpoint_dormer_right_11.midpoint);
    mesh_dormer_right_11.quaternion.copy(endpoint_dormer_right_11.quaternion);
  }
  mesh_dormer_right_11.castShadow = options.castShadow ?? true;
  mesh_dormer_right_11.receiveShadow = options.receiveShadow ?? true;
  mesh_dormer_right_11.userData.sculptComponent = {"id": "dormer-right", "name": "Dormer Right", "level": "meso", "role": "right embedded roof dormer", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "embedded-dormer", "placement": "Observed embedded dormer on dormer right.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["embedded-dormer"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_dormer_right_11.add(mesh_dormer_right_11);
  meshes["dormer-right"] = mesh_dormer_right_11;
  colliders["dormer-right"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_dormer_right_11);
  const socket_dormer_right_camera_exterior_0 = new THREE.Object3D();
  socket_dormer_right_camera_exterior_0.name = "camera-exterior";
  socket_dormer_right_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_dormer_right_camera_exterior_0.rotation.set(0, 0, 0);
  socket_dormer_right_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_dormer_right_11.add(socket_dormer_right_camera_exterior_0);
  sockets["dormer-right:camera-exterior"] = socket_dormer_right_camera_exterior_0;
  const socket_dormer_right_environment_downwash_origin_1 = new THREE.Object3D();
  socket_dormer_right_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_dormer_right_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_dormer_right_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_dormer_right_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_dormer_right_11.add(socket_dormer_right_environment_downwash_origin_1);
  sockets["dormer-right:environment-downwash-origin"] = socket_dormer_right_environment_downwash_origin_1;

  const attachment_window_bays_12 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_window_bays_12 = makeAttachmentEndpoint(attachment_window_bays_12);
  const node_window_bays_12 = new THREE.Group();
  node_window_bays_12.name = "Window Bays__pivot";
  node_window_bays_12.scale.set(1, 1, 1);
  if (endpoint_window_bays_12) {
    node_window_bays_12.position.copy(endpoint_window_bays_12.start);
    node_window_bays_12.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_window_bays_12.position.set(0.0, 0.0, 0.0);
    node_window_bays_12.rotation.set(0.0, 0.0, 0.0);
  }
  node_window_bays_12.userData.sculptComponent = {"id": "window-bays", "name": "Window Bays", "level": "meso", "role": "repeated arched occupied window bays", "importance": 0.82, "confidence": 0.82, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "amber-glass", "materialLayers": ["amber-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "arched-bays", "placement": "Observed arched bays on window bays.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["arched-bays"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "glass", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_window_bays_12.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_window_bays_12);
  nodes["window-bays"] = node_window_bays_12;
  const mesh_window_bays_12Geometry = endpoint_window_bays_12
    ? new THREE.CylinderGeometry(endpoint_window_bays_12.endRadius, endpoint_window_bays_12.baseRadius, endpoint_window_bays_12.length, 32, 12)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_window_bays_12) {
    mesh_window_bays_12Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_window_bays_12 = new THREE.Mesh(
    mesh_window_bays_12Geometry,
    materialMap["amber-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_window_bays_12.name = "Window Bays";
  if (endpoint_window_bays_12) {
    mesh_window_bays_12.position.copy(endpoint_window_bays_12.midpoint);
    mesh_window_bays_12.quaternion.copy(endpoint_window_bays_12.quaternion);
  }
  mesh_window_bays_12.castShadow = options.castShadow ?? true;
  mesh_window_bays_12.receiveShadow = options.receiveShadow ?? true;
  mesh_window_bays_12.userData.sculptComponent = {"id": "window-bays", "name": "Window Bays", "level": "meso", "role": "repeated arched occupied window bays", "importance": 0.82, "confidence": 0.82, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "amber-glass", "materialLayers": ["amber-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "arched-bays", "placement": "Observed arched bays on window bays.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["arched-bays"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "glass", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_window_bays_12.add(mesh_window_bays_12);
  meshes["window-bays"] = mesh_window_bays_12;
  colliders["window-bays"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_window_bays_12);
  const socket_window_bays_camera_exterior_0 = new THREE.Object3D();
  socket_window_bays_camera_exterior_0.name = "camera-exterior";
  socket_window_bays_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_window_bays_camera_exterior_0.rotation.set(0, 0, 0);
  socket_window_bays_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_window_bays_12.add(socket_window_bays_camera_exterior_0);
  sockets["window-bays:camera-exterior"] = socket_window_bays_camera_exterior_0;
  const socket_window_bays_environment_downwash_origin_1 = new THREE.Object3D();
  socket_window_bays_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_window_bays_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_window_bays_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_window_bays_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_window_bays_12.add(socket_window_bays_environment_downwash_origin_1);
  sockets["window-bays:environment-downwash-origin"] = socket_window_bays_environment_downwash_origin_1;

  const attachment_timber_bays_13 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_timber_bays_13 = makeAttachmentEndpoint(attachment_timber_bays_13);
  const node_timber_bays_13 = new THREE.Group();
  node_timber_bays_13.name = "Timber Bays__pivot";
  node_timber_bays_13.scale.set(1, 1, 1);
  if (endpoint_timber_bays_13) {
    node_timber_bays_13.position.copy(endpoint_timber_bays_13.start);
    node_timber_bays_13.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_timber_bays_13.position.set(0.0, 0.0, 0.0);
    node_timber_bays_13.rotation.set(0.0, 0.0, 0.0);
  }
  node_timber_bays_13.userData.sculptComponent = {"id": "timber-bays", "name": "Timber Bays", "level": "meso", "role": "coherent facade timber structure", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "vertical-posts", "placement": "Observed vertical posts on timber bays.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "diagonal-braces", "placement": "Observed diagonal braces on timber bays.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["vertical-posts", "diagonal-braces"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_timber_bays_13.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_timber_bays_13);
  nodes["timber-bays"] = node_timber_bays_13;
  const mesh_timber_bays_13Geometry = endpoint_timber_bays_13
    ? new THREE.CylinderGeometry(endpoint_timber_bays_13.endRadius, endpoint_timber_bays_13.baseRadius, endpoint_timber_bays_13.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_timber_bays_13) {
    mesh_timber_bays_13Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_timber_bays_13 = new THREE.Mesh(
    mesh_timber_bays_13Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_timber_bays_13.name = "Timber Bays";
  if (endpoint_timber_bays_13) {
    mesh_timber_bays_13.position.copy(endpoint_timber_bays_13.midpoint);
    mesh_timber_bays_13.quaternion.copy(endpoint_timber_bays_13.quaternion);
  }
  mesh_timber_bays_13.castShadow = options.castShadow ?? true;
  mesh_timber_bays_13.receiveShadow = options.receiveShadow ?? true;
  mesh_timber_bays_13.userData.sculptComponent = {"id": "timber-bays", "name": "Timber Bays", "level": "meso", "role": "coherent facade timber structure", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "vertical-posts", "placement": "Observed vertical posts on timber bays.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "diagonal-braces", "placement": "Observed diagonal braces on timber bays.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["vertical-posts", "diagonal-braces"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_timber_bays_13.add(mesh_timber_bays_13);
  meshes["timber-bays"] = mesh_timber_bays_13;
  colliders["timber-bays"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_timber_bays_13);
  const socket_timber_bays_camera_exterior_0 = new THREE.Object3D();
  socket_timber_bays_camera_exterior_0.name = "camera-exterior";
  socket_timber_bays_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_timber_bays_camera_exterior_0.rotation.set(0, 0, 0);
  socket_timber_bays_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_timber_bays_13.add(socket_timber_bays_camera_exterior_0);
  sockets["timber-bays:camera-exterior"] = socket_timber_bays_camera_exterior_0;
  const socket_timber_bays_environment_downwash_origin_1 = new THREE.Object3D();
  socket_timber_bays_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_timber_bays_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_timber_bays_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_timber_bays_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_timber_bays_13.add(socket_timber_bays_environment_downwash_origin_1);
  sockets["timber-bays:environment-downwash-origin"] = socket_timber_bays_environment_downwash_origin_1;

  const attachment_front_stalls_14 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_front_stalls_14 = makeAttachmentEndpoint(attachment_front_stalls_14);
  const node_front_stalls_14 = new THREE.Group();
  node_front_stalls_14.name = "Front Stalls__pivot";
  node_front_stalls_14.scale.set(1, 1, 1);
  if (endpoint_front_stalls_14) {
    node_front_stalls_14.position.copy(endpoint_front_stalls_14.start);
    node_front_stalls_14.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_front_stalls_14.position.set(0.0, 0.0, 0.0);
    node_front_stalls_14.rotation.set(0.0, 0.0, 0.0);
  }
  node_front_stalls_14.userData.sculptComponent = {"id": "front-stalls", "name": "Front Stalls", "level": "meso", "role": "occupied fishers guild terrace stalls", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "striped-cloth", "materialLayers": ["striped-cloth"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "awnings", "placement": "Observed awnings on front stalls.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "counter-depth", "placement": "Observed counter depth on front stalls.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["awnings", "counter-depth"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "fabric", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_front_stalls_14.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_front_stalls_14);
  nodes["front-stalls"] = node_front_stalls_14;
  const mesh_front_stalls_14Geometry = endpoint_front_stalls_14
    ? new THREE.CylinderGeometry(endpoint_front_stalls_14.endRadius, endpoint_front_stalls_14.baseRadius, endpoint_front_stalls_14.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_front_stalls_14) {
    mesh_front_stalls_14Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_front_stalls_14 = new THREE.Mesh(
    mesh_front_stalls_14Geometry,
    materialMap["striped-cloth"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_front_stalls_14.name = "Front Stalls";
  if (endpoint_front_stalls_14) {
    mesh_front_stalls_14.position.copy(endpoint_front_stalls_14.midpoint);
    mesh_front_stalls_14.quaternion.copy(endpoint_front_stalls_14.quaternion);
  }
  mesh_front_stalls_14.castShadow = options.castShadow ?? true;
  mesh_front_stalls_14.receiveShadow = options.receiveShadow ?? true;
  mesh_front_stalls_14.userData.sculptComponent = {"id": "front-stalls", "name": "Front Stalls", "level": "meso", "role": "occupied fishers guild terrace stalls", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "striped-cloth", "materialLayers": ["striped-cloth"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "awnings", "placement": "Observed awnings on front stalls.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}, {"id": "counter-depth", "placement": "Observed counter depth on front stalls.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["awnings", "counter-depth"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "fabric", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_front_stalls_14.add(mesh_front_stalls_14);
  meshes["front-stalls"] = mesh_front_stalls_14;
  colliders["front-stalls"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_front_stalls_14);
  const socket_front_stalls_camera_exterior_0 = new THREE.Object3D();
  socket_front_stalls_camera_exterior_0.name = "camera-exterior";
  socket_front_stalls_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_front_stalls_camera_exterior_0.rotation.set(0, 0, 0);
  socket_front_stalls_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_front_stalls_14.add(socket_front_stalls_camera_exterior_0);
  sockets["front-stalls:camera-exterior"] = socket_front_stalls_camera_exterior_0;
  const socket_front_stalls_environment_downwash_origin_1 = new THREE.Object3D();
  socket_front_stalls_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_front_stalls_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_front_stalls_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_front_stalls_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_front_stalls_14.add(socket_front_stalls_environment_downwash_origin_1);
  sockets["front-stalls:environment-downwash-origin"] = socket_front_stalls_environment_downwash_origin_1;

  const attachment_entry_stairs_15 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_entry_stairs_15 = makeAttachmentEndpoint(attachment_entry_stairs_15);
  const node_entry_stairs_15 = new THREE.Group();
  node_entry_stairs_15.name = "Entry Stairs__pivot";
  node_entry_stairs_15.scale.set(1, 1, 1);
  if (endpoint_entry_stairs_15) {
    node_entry_stairs_15.position.copy(endpoint_entry_stairs_15.start);
    node_entry_stairs_15.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_entry_stairs_15.position.set(0.0, 0.0, 0.0);
    node_entry_stairs_15.rotation.set(0.0, 0.0, 0.0);
  }
  node_entry_stairs_15.userData.sculptComponent = {"id": "entry-stairs", "name": "Entry Stairs", "level": "meso", "role": "three broad worn entry steps", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "coastal-stone", "materialLayers": ["coastal-stone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "treads", "placement": "Observed treads on entry stairs.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["treads"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_entry_stairs_15.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_entry_stairs_15);
  nodes["entry-stairs"] = node_entry_stairs_15;
  const mesh_entry_stairs_15Geometry = endpoint_entry_stairs_15
    ? new THREE.CylinderGeometry(endpoint_entry_stairs_15.endRadius, endpoint_entry_stairs_15.baseRadius, endpoint_entry_stairs_15.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_entry_stairs_15) {
    mesh_entry_stairs_15Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_entry_stairs_15 = new THREE.Mesh(
    mesh_entry_stairs_15Geometry,
    materialMap["coastal-stone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_entry_stairs_15.name = "Entry Stairs";
  if (endpoint_entry_stairs_15) {
    mesh_entry_stairs_15.position.copy(endpoint_entry_stairs_15.midpoint);
    mesh_entry_stairs_15.quaternion.copy(endpoint_entry_stairs_15.quaternion);
  }
  mesh_entry_stairs_15.castShadow = options.castShadow ?? true;
  mesh_entry_stairs_15.receiveShadow = options.receiveShadow ?? true;
  mesh_entry_stairs_15.userData.sculptComponent = {"id": "entry-stairs", "name": "Entry Stairs", "level": "meso", "role": "three broad worn entry steps", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "coastal-stone", "materialLayers": ["coastal-stone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "treads", "placement": "Observed treads on entry stairs.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["treads"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_entry_stairs_15.add(mesh_entry_stairs_15);
  meshes["entry-stairs"] = mesh_entry_stairs_15;
  colliders["entry-stairs"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_entry_stairs_15);
  const socket_entry_stairs_camera_exterior_0 = new THREE.Object3D();
  socket_entry_stairs_camera_exterior_0.name = "camera-exterior";
  socket_entry_stairs_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_entry_stairs_camera_exterior_0.rotation.set(0, 0, 0);
  socket_entry_stairs_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_entry_stairs_15.add(socket_entry_stairs_camera_exterior_0);
  sockets["entry-stairs:camera-exterior"] = socket_entry_stairs_camera_exterior_0;
  const socket_entry_stairs_environment_downwash_origin_1 = new THREE.Object3D();
  socket_entry_stairs_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_entry_stairs_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_entry_stairs_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_entry_stairs_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_entry_stairs_15.add(socket_entry_stairs_environment_downwash_origin_1);
  sockets["entry-stairs:environment-downwash-origin"] = socket_entry_stairs_environment_downwash_origin_1;

  const attachment_terrace_16 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_terrace_16 = makeAttachmentEndpoint(attachment_terrace_16);
  const node_terrace_16 = new THREE.Group();
  node_terrace_16.name = "Terrace__pivot";
  node_terrace_16.scale.set(1, 1, 1);
  if (endpoint_terrace_16) {
    node_terrace_16.position.copy(endpoint_terrace_16.start);
    node_terrace_16.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_terrace_16.position.set(0.0, 0.0, 0.0);
    node_terrace_16.rotation.set(0.0, 0.0, 0.0);
  }
  node_terrace_16.userData.sculptComponent = {"id": "terrace", "name": "Terrace", "level": "meso", "role": "working waterfront terrace", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "working-apron", "placement": "Observed working apron on terrace.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["working-apron"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_terrace_16.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_terrace_16);
  nodes["terrace"] = node_terrace_16;
  const mesh_terrace_16Geometry = endpoint_terrace_16
    ? new THREE.CylinderGeometry(endpoint_terrace_16.endRadius, endpoint_terrace_16.baseRadius, endpoint_terrace_16.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_terrace_16) {
    mesh_terrace_16Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_terrace_16 = new THREE.Mesh(
    mesh_terrace_16Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_terrace_16.name = "Terrace";
  if (endpoint_terrace_16) {
    mesh_terrace_16.position.copy(endpoint_terrace_16.midpoint);
    mesh_terrace_16.quaternion.copy(endpoint_terrace_16.quaternion);
  }
  mesh_terrace_16.castShadow = options.castShadow ?? true;
  mesh_terrace_16.receiveShadow = options.receiveShadow ?? true;
  mesh_terrace_16.userData.sculptComponent = {"id": "terrace", "name": "Terrace", "level": "meso", "role": "working waterfront terrace", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "working-apron", "placement": "Observed working apron on terrace.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["working-apron"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_terrace_16.add(mesh_terrace_16);
  meshes["terrace"] = mesh_terrace_16;
  colliders["terrace"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_terrace_16);
  const socket_terrace_camera_exterior_0 = new THREE.Object3D();
  socket_terrace_camera_exterior_0.name = "camera-exterior";
  socket_terrace_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_terrace_camera_exterior_0.rotation.set(0, 0, 0);
  socket_terrace_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_terrace_16.add(socket_terrace_camera_exterior_0);
  sockets["terrace:camera-exterior"] = socket_terrace_camera_exterior_0;
  const socket_terrace_environment_downwash_origin_1 = new THREE.Object3D();
  socket_terrace_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_terrace_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_terrace_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_terrace_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_terrace_16.add(socket_terrace_environment_downwash_origin_1);
  sockets["terrace:environment-downwash-origin"] = socket_terrace_environment_downwash_origin_1;

  const attachment_guild_crest_17 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_guild_crest_17 = makeAttachmentEndpoint(attachment_guild_crest_17);
  const node_guild_crest_17 = new THREE.Group();
  node_guild_crest_17.name = "Guild Crest__pivot";
  node_guild_crest_17.scale.set(1, 1, 1);
  if (endpoint_guild_crest_17) {
    node_guild_crest_17.position.copy(endpoint_guild_crest_17.start);
    node_guild_crest_17.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_guild_crest_17.position.set(0.0, 0.0, 0.0);
    node_guild_crest_17.rotation.set(0.0, 0.0, 0.0);
  }
  node_guild_crest_17.userData.sculptComponent = {"id": "guild-crest", "name": "Guild Crest", "level": "meso", "role": "carved fish guild identity mark", "importance": 0.82, "confidence": 0.82, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "fish-mark", "placement": "Observed fish mark on guild crest.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["fish-mark"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "metal", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_guild_crest_17.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_guild_crest_17);
  nodes["guild-crest"] = node_guild_crest_17;
  const mesh_guild_crest_17Geometry = endpoint_guild_crest_17
    ? new THREE.CylinderGeometry(endpoint_guild_crest_17.endRadius, endpoint_guild_crest_17.baseRadius, endpoint_guild_crest_17.length, 32, 12)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_guild_crest_17) {
    mesh_guild_crest_17Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_guild_crest_17 = new THREE.Mesh(
    mesh_guild_crest_17Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_guild_crest_17.name = "Guild Crest";
  if (endpoint_guild_crest_17) {
    mesh_guild_crest_17.position.copy(endpoint_guild_crest_17.midpoint);
    mesh_guild_crest_17.quaternion.copy(endpoint_guild_crest_17.quaternion);
  }
  mesh_guild_crest_17.castShadow = options.castShadow ?? true;
  mesh_guild_crest_17.receiveShadow = options.receiveShadow ?? true;
  mesh_guild_crest_17.userData.sculptComponent = {"id": "guild-crest", "name": "Guild Crest", "level": "meso", "role": "carved fish guild identity mark", "importance": 0.82, "confidence": 0.82, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "fish-mark", "placement": "Observed fish mark on guild crest.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["fish-mark"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "metal", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_guild_crest_17.add(mesh_guild_crest_17);
  meshes["guild-crest"] = mesh_guild_crest_17;
  colliders["guild-crest"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_guild_crest_17);
  const socket_guild_crest_camera_exterior_0 = new THREE.Object3D();
  socket_guild_crest_camera_exterior_0.name = "camera-exterior";
  socket_guild_crest_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_guild_crest_camera_exterior_0.rotation.set(0, 0, 0);
  socket_guild_crest_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_guild_crest_17.add(socket_guild_crest_camera_exterior_0);
  sockets["guild-crest:camera-exterior"] = socket_guild_crest_camera_exterior_0;
  const socket_guild_crest_environment_downwash_origin_1 = new THREE.Object3D();
  socket_guild_crest_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_guild_crest_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_guild_crest_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_guild_crest_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_guild_crest_17.add(socket_guild_crest_environment_downwash_origin_1);
  sockets["guild-crest:environment-downwash-origin"] = socket_guild_crest_environment_downwash_origin_1;

  const attachment_library_wing_18 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_library_wing_18 = makeAttachmentEndpoint(attachment_library_wing_18);
  const node_library_wing_18 = new THREE.Group();
  node_library_wing_18.name = "Library Wing__pivot";
  node_library_wing_18.scale.set(1, 1, 1);
  if (endpoint_library_wing_18) {
    node_library_wing_18.position.copy(endpoint_library_wing_18.start);
    node_library_wing_18.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_library_wing_18.position.set(0.0, 0.0, 0.0);
    node_library_wing_18.rotation.set(0.0, 0.0, 0.0);
  }
  node_library_wing_18.userData.sculptComponent = {"id": "library-wing", "name": "Library Wing", "level": "meso", "role": "small occupied archive wing", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "warm-plaster", "materialLayers": ["warm-plaster"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "book-window", "placement": "Observed book window on library wing.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["book-window"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_library_wing_18.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_library_wing_18);
  nodes["library-wing"] = node_library_wing_18;
  const mesh_library_wing_18Geometry = endpoint_library_wing_18
    ? new THREE.CylinderGeometry(endpoint_library_wing_18.endRadius, endpoint_library_wing_18.baseRadius, endpoint_library_wing_18.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_library_wing_18) {
    mesh_library_wing_18Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_library_wing_18 = new THREE.Mesh(
    mesh_library_wing_18Geometry,
    materialMap["warm-plaster"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_library_wing_18.name = "Library Wing";
  if (endpoint_library_wing_18) {
    mesh_library_wing_18.position.copy(endpoint_library_wing_18.midpoint);
    mesh_library_wing_18.quaternion.copy(endpoint_library_wing_18.quaternion);
  }
  mesh_library_wing_18.castShadow = options.castShadow ?? true;
  mesh_library_wing_18.receiveShadow = options.receiveShadow ?? true;
  mesh_library_wing_18.userData.sculptComponent = {"id": "library-wing", "name": "Library Wing", "level": "meso", "role": "small occupied archive wing", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "warm-plaster", "materialLayers": ["warm-plaster"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "book-window", "placement": "Observed book window on library wing.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["book-window"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_library_wing_18.add(mesh_library_wing_18);
  meshes["library-wing"] = mesh_library_wing_18;
  colliders["library-wing"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_library_wing_18);
  const socket_library_wing_camera_exterior_0 = new THREE.Object3D();
  socket_library_wing_camera_exterior_0.name = "camera-exterior";
  socket_library_wing_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_library_wing_camera_exterior_0.rotation.set(0, 0, 0);
  socket_library_wing_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_library_wing_18.add(socket_library_wing_camera_exterior_0);
  sockets["library-wing:camera-exterior"] = socket_library_wing_camera_exterior_0;
  const socket_library_wing_environment_downwash_origin_1 = new THREE.Object3D();
  socket_library_wing_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_library_wing_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_library_wing_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_library_wing_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_library_wing_18.add(socket_library_wing_environment_downwash_origin_1);
  sockets["library-wing:environment-downwash-origin"] = socket_library_wing_environment_downwash_origin_1;

  const attachment_service_porch_19 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_service_porch_19 = makeAttachmentEndpoint(attachment_service_porch_19);
  const node_service_porch_19 = new THREE.Group();
  node_service_porch_19.name = "Service Porch__pivot";
  node_service_porch_19.scale.set(1, 1, 1);
  if (endpoint_service_porch_19) {
    node_service_porch_19.position.copy(endpoint_service_porch_19.start);
    node_service_porch_19.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_service_porch_19.position.set(0.0, 0.0, 0.0);
    node_service_porch_19.rotation.set(0.0, 0.0, 0.0);
  }
  node_service_porch_19.userData.sculptComponent = {"id": "service-porch", "name": "Service Porch", "level": "meso", "role": "rear loading porch with posts", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "support-posts", "placement": "Observed support posts on service porch.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["support-posts"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_service_porch_19.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_service_porch_19);
  nodes["service-porch"] = node_service_porch_19;
  const mesh_service_porch_19Geometry = endpoint_service_porch_19
    ? new THREE.CylinderGeometry(endpoint_service_porch_19.endRadius, endpoint_service_porch_19.baseRadius, endpoint_service_porch_19.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_service_porch_19) {
    mesh_service_porch_19Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_service_porch_19 = new THREE.Mesh(
    mesh_service_porch_19Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_service_porch_19.name = "Service Porch";
  if (endpoint_service_porch_19) {
    mesh_service_porch_19.position.copy(endpoint_service_porch_19.midpoint);
    mesh_service_porch_19.quaternion.copy(endpoint_service_porch_19.quaternion);
  }
  mesh_service_porch_19.castShadow = options.castShadow ?? true;
  mesh_service_porch_19.receiveShadow = options.receiveShadow ?? true;
  mesh_service_porch_19.userData.sculptComponent = {"id": "service-porch", "name": "Service Porch", "level": "meso", "role": "rear loading porch with posts", "importance": 0.82, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "support-posts", "placement": "Observed support posts on service porch.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["support-posts"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_service_porch_19.add(mesh_service_porch_19);
  meshes["service-porch"] = mesh_service_porch_19;
  colliders["service-porch"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_service_porch_19);
  const socket_service_porch_camera_exterior_0 = new THREE.Object3D();
  socket_service_porch_camera_exterior_0.name = "camera-exterior";
  socket_service_porch_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_service_porch_camera_exterior_0.rotation.set(0, 0, 0);
  socket_service_porch_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_service_porch_19.add(socket_service_porch_camera_exterior_0);
  sockets["service-porch:camera-exterior"] = socket_service_porch_camera_exterior_0;
  const socket_service_porch_environment_downwash_origin_1 = new THREE.Object3D();
  socket_service_porch_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_service_porch_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_service_porch_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_service_porch_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_service_porch_19.add(socket_service_porch_environment_downwash_origin_1);
  sockets["service-porch:environment-downwash-origin"] = socket_service_porch_environment_downwash_origin_1;

  const attachment_lantern_gallery_20 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_lantern_gallery_20 = makeAttachmentEndpoint(attachment_lantern_gallery_20);
  const node_lantern_gallery_20 = new THREE.Group();
  node_lantern_gallery_20.name = "Lantern Gallery__pivot";
  node_lantern_gallery_20.scale.set(1, 1, 1);
  if (endpoint_lantern_gallery_20) {
    node_lantern_gallery_20.position.copy(endpoint_lantern_gallery_20.start);
    node_lantern_gallery_20.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_lantern_gallery_20.position.set(0.0, 0.0, 0.0);
    node_lantern_gallery_20.rotation.set(0.0, 0.0, 0.0);
  }
  node_lantern_gallery_20.userData.sculptComponent = {"id": "lantern-gallery", "name": "Lantern Gallery", "level": "meso", "role": "warm entry lantern gallery", "importance": 0.82, "confidence": 0.82, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "lantern-bays", "placement": "Observed lantern bays on lantern gallery.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["lantern-bays"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "metal", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_lantern_gallery_20.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_lantern_gallery_20);
  nodes["lantern-gallery"] = node_lantern_gallery_20;
  const mesh_lantern_gallery_20Geometry = endpoint_lantern_gallery_20
    ? new THREE.CylinderGeometry(endpoint_lantern_gallery_20.endRadius, endpoint_lantern_gallery_20.baseRadius, endpoint_lantern_gallery_20.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_lantern_gallery_20) {
    mesh_lantern_gallery_20Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_lantern_gallery_20 = new THREE.Mesh(
    mesh_lantern_gallery_20Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_lantern_gallery_20.name = "Lantern Gallery";
  if (endpoint_lantern_gallery_20) {
    mesh_lantern_gallery_20.position.copy(endpoint_lantern_gallery_20.midpoint);
    mesh_lantern_gallery_20.quaternion.copy(endpoint_lantern_gallery_20.quaternion);
  }
  mesh_lantern_gallery_20.castShadow = options.castShadow ?? true;
  mesh_lantern_gallery_20.receiveShadow = options.receiveShadow ?? true;
  mesh_lantern_gallery_20.userData.sculptComponent = {"id": "lantern-gallery", "name": "Lantern Gallery", "level": "meso", "role": "warm entry lantern gallery", "importance": 0.82, "confidence": 0.82, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "lantern-bays", "placement": "Observed lantern bays on lantern gallery.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["lantern-bays"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "metal", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_lantern_gallery_20.add(mesh_lantern_gallery_20);
  meshes["lantern-gallery"] = mesh_lantern_gallery_20;
  colliders["lantern-gallery"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_lantern_gallery_20);
  const socket_lantern_gallery_camera_exterior_0 = new THREE.Object3D();
  socket_lantern_gallery_camera_exterior_0.name = "camera-exterior";
  socket_lantern_gallery_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_lantern_gallery_camera_exterior_0.rotation.set(0, 0, 0);
  socket_lantern_gallery_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_lantern_gallery_20.add(socket_lantern_gallery_camera_exterior_0);
  sockets["lantern-gallery:camera-exterior"] = socket_lantern_gallery_camera_exterior_0;
  const socket_lantern_gallery_environment_downwash_origin_1 = new THREE.Object3D();
  socket_lantern_gallery_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_lantern_gallery_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_lantern_gallery_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_lantern_gallery_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_lantern_gallery_20.add(socket_lantern_gallery_environment_downwash_origin_1);
  sockets["lantern-gallery:environment-downwash-origin"] = socket_lantern_gallery_environment_downwash_origin_1;

  const attachment_eave_curl_left_21 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_eave_curl_left_21 = makeAttachmentEndpoint(attachment_eave_curl_left_21);
  const node_eave_curl_left_21 = new THREE.Group();
  node_eave_curl_left_21.name = "Eave Curl Left__pivot";
  node_eave_curl_left_21.scale.set(1, 1, 1);
  if (endpoint_eave_curl_left_21) {
    node_eave_curl_left_21.position.copy(endpoint_eave_curl_left_21.start);
    node_eave_curl_left_21.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_eave_curl_left_21.position.set(0.0, 0.0, 0.0);
    node_eave_curl_left_21.rotation.set(0.0, 0.0, 0.0);
  }
  node_eave_curl_left_21.userData.sculptComponent = {"id": "eave-curl-left", "name": "Eave Curl Left", "level": "meso", "role": "left curled eave silhouette cap", "importance": 0.82, "confidence": 0.82, "primitive": "curve-sweep", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "curl-profile", "placement": "Observed curl profile on eave curl left.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["curl-profile"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_eave_curl_left_21.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_eave_curl_left_21);
  nodes["eave-curl-left"] = node_eave_curl_left_21;
  const mesh_eave_curl_left_21Geometry = endpoint_eave_curl_left_21
    ? new THREE.CylinderGeometry(endpoint_eave_curl_left_21.endRadius, endpoint_eave_curl_left_21.baseRadius, endpoint_eave_curl_left_21.length, 32, 12)
    : buildCurveSweepGeometry({"spine": [[-0.5, -0.4, 0.0], [-0.1, 0.1, 0.0], [0.3, 0.2, 0.0], [0.6, -0.1, 0.0]], "crossSection": {"points": [[-0.04, -0.02], [0.04, -0.02], [0.04, 0.02], [-0.04, 0.02]]}, "closed": false});
  if (!endpoint_eave_curl_left_21) {
    mesh_eave_curl_left_21Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_eave_curl_left_21 = new THREE.Mesh(
    mesh_eave_curl_left_21Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_eave_curl_left_21.name = "Eave Curl Left";
  if (endpoint_eave_curl_left_21) {
    mesh_eave_curl_left_21.position.copy(endpoint_eave_curl_left_21.midpoint);
    mesh_eave_curl_left_21.quaternion.copy(endpoint_eave_curl_left_21.quaternion);
  }
  mesh_eave_curl_left_21.castShadow = options.castShadow ?? true;
  mesh_eave_curl_left_21.receiveShadow = options.receiveShadow ?? true;
  mesh_eave_curl_left_21.userData.sculptComponent = {"id": "eave-curl-left", "name": "Eave Curl Left", "level": "meso", "role": "left curled eave silhouette cap", "importance": 0.82, "confidence": 0.82, "primitive": "curve-sweep", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "curl-profile", "placement": "Observed curl profile on eave curl left.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["curl-profile"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_eave_curl_left_21.add(mesh_eave_curl_left_21);
  meshes["eave-curl-left"] = mesh_eave_curl_left_21;
  colliders["eave-curl-left"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_eave_curl_left_21);
  const socket_eave_curl_left_camera_exterior_0 = new THREE.Object3D();
  socket_eave_curl_left_camera_exterior_0.name = "camera-exterior";
  socket_eave_curl_left_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_eave_curl_left_camera_exterior_0.rotation.set(0, 0, 0);
  socket_eave_curl_left_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_eave_curl_left_21.add(socket_eave_curl_left_camera_exterior_0);
  sockets["eave-curl-left:camera-exterior"] = socket_eave_curl_left_camera_exterior_0;
  const socket_eave_curl_left_environment_downwash_origin_1 = new THREE.Object3D();
  socket_eave_curl_left_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_eave_curl_left_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_eave_curl_left_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_eave_curl_left_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_eave_curl_left_21.add(socket_eave_curl_left_environment_downwash_origin_1);
  sockets["eave-curl-left:environment-downwash-origin"] = socket_eave_curl_left_environment_downwash_origin_1;

  const attachment_eave_curl_right_22 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_eave_curl_right_22 = makeAttachmentEndpoint(attachment_eave_curl_right_22);
  const node_eave_curl_right_22 = new THREE.Group();
  node_eave_curl_right_22.name = "Eave Curl Right__pivot";
  node_eave_curl_right_22.scale.set(1, 1, 1);
  if (endpoint_eave_curl_right_22) {
    node_eave_curl_right_22.position.copy(endpoint_eave_curl_right_22.start);
    node_eave_curl_right_22.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_eave_curl_right_22.position.set(0.0, 0.0, 0.0);
    node_eave_curl_right_22.rotation.set(0.0, 0.0, 0.0);
  }
  node_eave_curl_right_22.userData.sculptComponent = {"id": "eave-curl-right", "name": "Eave Curl Right", "level": "meso", "role": "right curled eave silhouette cap", "importance": 0.82, "confidence": 0.82, "primitive": "curve-sweep", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "curl-profile", "placement": "Observed curl profile on eave curl right.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["curl-profile"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_eave_curl_right_22.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_eave_curl_right_22);
  nodes["eave-curl-right"] = node_eave_curl_right_22;
  const mesh_eave_curl_right_22Geometry = endpoint_eave_curl_right_22
    ? new THREE.CylinderGeometry(endpoint_eave_curl_right_22.endRadius, endpoint_eave_curl_right_22.baseRadius, endpoint_eave_curl_right_22.length, 32, 12)
    : buildCurveSweepGeometry({"spine": [[-0.5, -0.4, 0.0], [-0.1, 0.1, 0.0], [0.3, 0.2, 0.0], [0.6, -0.1, 0.0]], "crossSection": {"points": [[-0.04, -0.02], [0.04, -0.02], [0.04, 0.02], [-0.04, 0.02]]}, "closed": false});
  if (!endpoint_eave_curl_right_22) {
    mesh_eave_curl_right_22Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_eave_curl_right_22 = new THREE.Mesh(
    mesh_eave_curl_right_22Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_eave_curl_right_22.name = "Eave Curl Right";
  if (endpoint_eave_curl_right_22) {
    mesh_eave_curl_right_22.position.copy(endpoint_eave_curl_right_22.midpoint);
    mesh_eave_curl_right_22.quaternion.copy(endpoint_eave_curl_right_22.quaternion);
  }
  mesh_eave_curl_right_22.castShadow = options.castShadow ?? true;
  mesh_eave_curl_right_22.receiveShadow = options.receiveShadow ?? true;
  mesh_eave_curl_right_22.userData.sculptComponent = {"id": "eave-curl-right", "name": "Eave Curl Right", "level": "meso", "role": "right curled eave silhouette cap", "importance": 0.82, "confidence": 0.82, "primitive": "curve-sweep", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "curl-profile", "placement": "Observed curl profile on eave curl right.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["curl-profile"], "fidelityTier": "final", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_eave_curl_right_22.add(mesh_eave_curl_right_22);
  meshes["eave-curl-right"] = mesh_eave_curl_right_22;
  colliders["eave-curl-right"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_eave_curl_right_22);
  const socket_eave_curl_right_camera_exterior_0 = new THREE.Object3D();
  socket_eave_curl_right_camera_exterior_0.name = "camera-exterior";
  socket_eave_curl_right_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_eave_curl_right_camera_exterior_0.rotation.set(0, 0, 0);
  socket_eave_curl_right_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_eave_curl_right_22.add(socket_eave_curl_right_camera_exterior_0);
  sockets["eave-curl-right:camera-exterior"] = socket_eave_curl_right_camera_exterior_0;
  const socket_eave_curl_right_environment_downwash_origin_1 = new THREE.Object3D();
  socket_eave_curl_right_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_eave_curl_right_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_eave_curl_right_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_eave_curl_right_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_eave_curl_right_22.add(socket_eave_curl_right_environment_downwash_origin_1);
  sockets["eave-curl-right:environment-downwash-origin"] = socket_eave_curl_right_environment_downwash_origin_1;

  const attachment_slate_course_system_23 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_slate_course_system_23 = makeAttachmentEndpoint(attachment_slate_course_system_23);
  const node_slate_course_system_23 = new THREE.Group();
  node_slate_course_system_23.name = "Slate Course System__pivot";
  node_slate_course_system_23.scale.set(1, 1, 1);
  if (endpoint_slate_course_system_23) {
    node_slate_course_system_23.position.copy(endpoint_slate_course_system_23.start);
    node_slate_course_system_23.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_slate_course_system_23.position.set(0.0, 0.0, 0.0);
    node_slate_course_system_23.rotation.set(0.0, 0.0, 0.0);
  }
  node_slate_course_system_23.userData.sculptComponent = {"id": "slate-course-system", "name": "Slate Course System", "level": "micro", "role": "staggered slate relief system", "importance": 0.62, "confidence": 0.82, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "slate-courses", "placement": "Observed slate courses on slate course system.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["slate-courses"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_slate_course_system_23.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_slate_course_system_23);
  nodes["slate-course-system"] = node_slate_course_system_23;
  const mesh_slate_course_system_23Geometry = endpoint_slate_course_system_23
    ? new THREE.CylinderGeometry(endpoint_slate_course_system_23.endRadius, endpoint_slate_course_system_23.baseRadius, endpoint_slate_course_system_23.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_slate_course_system_23) {
    mesh_slate_course_system_23Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_slate_course_system_23 = new THREE.Mesh(
    mesh_slate_course_system_23Geometry,
    materialMap["weathered-slate"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_slate_course_system_23.name = "Slate Course System";
  if (endpoint_slate_course_system_23) {
    mesh_slate_course_system_23.position.copy(endpoint_slate_course_system_23.midpoint);
    mesh_slate_course_system_23.quaternion.copy(endpoint_slate_course_system_23.quaternion);
  }
  mesh_slate_course_system_23.castShadow = options.castShadow ?? true;
  mesh_slate_course_system_23.receiveShadow = options.receiveShadow ?? true;
  mesh_slate_course_system_23.userData.sculptComponent = {"id": "slate-course-system", "name": "Slate Course System", "level": "micro", "role": "staggered slate relief system", "importance": 0.62, "confidence": 0.82, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "slate-courses", "placement": "Observed slate courses on slate course system.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["slate-courses"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_slate_course_system_23.add(mesh_slate_course_system_23);
  meshes["slate-course-system"] = mesh_slate_course_system_23;
  colliders["slate-course-system"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_slate_course_system_23);
  const socket_slate_course_system_camera_exterior_0 = new THREE.Object3D();
  socket_slate_course_system_camera_exterior_0.name = "camera-exterior";
  socket_slate_course_system_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_slate_course_system_camera_exterior_0.rotation.set(0, 0, 0);
  socket_slate_course_system_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_slate_course_system_23.add(socket_slate_course_system_camera_exterior_0);
  sockets["slate-course-system:camera-exterior"] = socket_slate_course_system_camera_exterior_0;
  const socket_slate_course_system_environment_downwash_origin_1 = new THREE.Object3D();
  socket_slate_course_system_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_slate_course_system_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_slate_course_system_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_slate_course_system_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_slate_course_system_23.add(socket_slate_course_system_environment_downwash_origin_1);
  sockets["slate-course-system:environment-downwash-origin"] = socket_slate_course_system_environment_downwash_origin_1;

  const attachment_mullion_system_24 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_mullion_system_24 = makeAttachmentEndpoint(attachment_mullion_system_24);
  const node_mullion_system_24 = new THREE.Group();
  node_mullion_system_24.name = "Mullion System__pivot";
  node_mullion_system_24.scale.set(1, 1, 1);
  if (endpoint_mullion_system_24) {
    node_mullion_system_24.position.copy(endpoint_mullion_system_24.start);
    node_mullion_system_24.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_mullion_system_24.position.set(0.0, 0.0, 0.0);
    node_mullion_system_24.rotation.set(0.0, 0.0, 0.0);
  }
  node_mullion_system_24.userData.sculptComponent = {"id": "mullion-system", "name": "Mullion System", "level": "micro", "role": "deep window mullion system", "importance": 0.62, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "mullion-depth", "placement": "Observed mullion depth on mullion system.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["mullion-depth"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_mullion_system_24.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_mullion_system_24);
  nodes["mullion-system"] = node_mullion_system_24;
  const mesh_mullion_system_24Geometry = endpoint_mullion_system_24
    ? new THREE.CylinderGeometry(endpoint_mullion_system_24.endRadius, endpoint_mullion_system_24.baseRadius, endpoint_mullion_system_24.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_mullion_system_24) {
    mesh_mullion_system_24Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_mullion_system_24 = new THREE.Mesh(
    mesh_mullion_system_24Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_mullion_system_24.name = "Mullion System";
  if (endpoint_mullion_system_24) {
    mesh_mullion_system_24.position.copy(endpoint_mullion_system_24.midpoint);
    mesh_mullion_system_24.quaternion.copy(endpoint_mullion_system_24.quaternion);
  }
  mesh_mullion_system_24.castShadow = options.castShadow ?? true;
  mesh_mullion_system_24.receiveShadow = options.receiveShadow ?? true;
  mesh_mullion_system_24.userData.sculptComponent = {"id": "mullion-system", "name": "Mullion System", "level": "micro", "role": "deep window mullion system", "importance": 0.62, "confidence": 0.82, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "mullion-depth", "placement": "Observed mullion depth on mullion system.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["mullion-depth"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_mullion_system_24.add(mesh_mullion_system_24);
  meshes["mullion-system"] = mesh_mullion_system_24;
  colliders["mullion-system"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_mullion_system_24);
  const socket_mullion_system_camera_exterior_0 = new THREE.Object3D();
  socket_mullion_system_camera_exterior_0.name = "camera-exterior";
  socket_mullion_system_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_mullion_system_camera_exterior_0.rotation.set(0, 0, 0);
  socket_mullion_system_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_mullion_system_24.add(socket_mullion_system_camera_exterior_0);
  sockets["mullion-system:camera-exterior"] = socket_mullion_system_camera_exterior_0;
  const socket_mullion_system_environment_downwash_origin_1 = new THREE.Object3D();
  socket_mullion_system_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_mullion_system_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_mullion_system_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_mullion_system_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_mullion_system_24.add(socket_mullion_system_environment_downwash_origin_1);
  sockets["mullion-system:environment-downwash-origin"] = socket_mullion_system_environment_downwash_origin_1;

  const attachment_terrace_props_25 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_terrace_props_25 = makeAttachmentEndpoint(attachment_terrace_props_25);
  const node_terrace_props_25 = new THREE.Group();
  node_terrace_props_25.name = "Terrace Props__pivot";
  node_terrace_props_25.scale.set(1, 1, 1);
  if (endpoint_terrace_props_25) {
    node_terrace_props_25.position.copy(endpoint_terrace_props_25.start);
    node_terrace_props_25.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_terrace_props_25.position.set(0.0, 0.0, 0.0);
    node_terrace_props_25.rotation.set(0.0, 0.0, 0.0);
  }
  node_terrace_props_25.userData.sculptComponent = {"id": "terrace-props", "name": "Terrace Props", "level": "micro", "role": "barrel crate bucket and rope clusters", "importance": 0.62, "confidence": 0.82, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "occupied-props", "placement": "Observed occupied props on terrace props.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["occupied-props"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_terrace_props_25.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_terrace_props_25);
  nodes["terrace-props"] = node_terrace_props_25;
  const mesh_terrace_props_25Geometry = endpoint_terrace_props_25
    ? new THREE.CylinderGeometry(endpoint_terrace_props_25.endRadius, endpoint_terrace_props_25.baseRadius, endpoint_terrace_props_25.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_terrace_props_25) {
    mesh_terrace_props_25Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_terrace_props_25 = new THREE.Mesh(
    mesh_terrace_props_25Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_terrace_props_25.name = "Terrace Props";
  if (endpoint_terrace_props_25) {
    mesh_terrace_props_25.position.copy(endpoint_terrace_props_25.midpoint);
    mesh_terrace_props_25.quaternion.copy(endpoint_terrace_props_25.quaternion);
  }
  mesh_terrace_props_25.castShadow = options.castShadow ?? true;
  mesh_terrace_props_25.receiveShadow = options.receiveShadow ?? true;
  mesh_terrace_props_25.userData.sculptComponent = {"id": "terrace-props", "name": "Terrace Props", "level": "micro", "role": "barrel crate bucket and rope clusters", "importance": 0.62, "confidence": 0.82, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "occupied-props", "placement": "Observed occupied props on terrace props.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["occupied-props"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_terrace_props_25.add(mesh_terrace_props_25);
  meshes["terrace-props"] = mesh_terrace_props_25;
  colliders["terrace-props"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_terrace_props_25);
  const socket_terrace_props_camera_exterior_0 = new THREE.Object3D();
  socket_terrace_props_camera_exterior_0.name = "camera-exterior";
  socket_terrace_props_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_terrace_props_camera_exterior_0.rotation.set(0, 0, 0);
  socket_terrace_props_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_terrace_props_25.add(socket_terrace_props_camera_exterior_0);
  sockets["terrace-props:camera-exterior"] = socket_terrace_props_camera_exterior_0;
  const socket_terrace_props_environment_downwash_origin_1 = new THREE.Object3D();
  socket_terrace_props_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_terrace_props_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_terrace_props_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_terrace_props_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_terrace_props_25.add(socket_terrace_props_environment_downwash_origin_1);
  sockets["terrace-props:environment-downwash-origin"] = socket_terrace_props_environment_downwash_origin_1;

  const attachment_rope_posts_26 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_rope_posts_26 = makeAttachmentEndpoint(attachment_rope_posts_26);
  const node_rope_posts_26 = new THREE.Group();
  node_rope_posts_26.name = "Rope Posts__pivot";
  node_rope_posts_26.scale.set(1, 1, 1);
  if (endpoint_rope_posts_26) {
    node_rope_posts_26.position.copy(endpoint_rope_posts_26.start);
    node_rope_posts_26.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_rope_posts_26.position.set(0.0, 0.0, 0.0);
    node_rope_posts_26.rotation.set(0.0, 0.0, 0.0);
  }
  node_rope_posts_26.userData.sculptComponent = {"id": "rope-posts", "name": "Rope Posts", "level": "micro", "role": "rope-wrapped working posts", "importance": 0.62, "confidence": 0.82, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "rope-fiber", "materialLayers": ["rope-fiber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "rope-wrap", "placement": "Observed rope wrap on rope posts.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["rope-wrap"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "fabric", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_rope_posts_26.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_rope_posts_26);
  nodes["rope-posts"] = node_rope_posts_26;
  const mesh_rope_posts_26Geometry = endpoint_rope_posts_26
    ? new THREE.CylinderGeometry(endpoint_rope_posts_26.endRadius, endpoint_rope_posts_26.baseRadius, endpoint_rope_posts_26.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_rope_posts_26) {
    mesh_rope_posts_26Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_rope_posts_26 = new THREE.Mesh(
    mesh_rope_posts_26Geometry,
    materialMap["rope-fiber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_rope_posts_26.name = "Rope Posts";
  if (endpoint_rope_posts_26) {
    mesh_rope_posts_26.position.copy(endpoint_rope_posts_26.midpoint);
    mesh_rope_posts_26.quaternion.copy(endpoint_rope_posts_26.quaternion);
  }
  mesh_rope_posts_26.castShadow = options.castShadow ?? true;
  mesh_rope_posts_26.receiveShadow = options.receiveShadow ?? true;
  mesh_rope_posts_26.userData.sculptComponent = {"id": "rope-posts", "name": "Rope Posts", "level": "micro", "role": "rope-wrapped working posts", "importance": 0.62, "confidence": 0.82, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "rope-fiber", "materialLayers": ["rope-fiber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "rope-wrap", "placement": "Observed rope wrap on rope posts.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["rope-wrap"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "fabric", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_rope_posts_26.add(mesh_rope_posts_26);
  meshes["rope-posts"] = mesh_rope_posts_26;
  colliders["rope-posts"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_rope_posts_26);
  const socket_rope_posts_camera_exterior_0 = new THREE.Object3D();
  socket_rope_posts_camera_exterior_0.name = "camera-exterior";
  socket_rope_posts_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_rope_posts_camera_exterior_0.rotation.set(0, 0, 0);
  socket_rope_posts_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_rope_posts_26.add(socket_rope_posts_camera_exterior_0);
  sockets["rope-posts:camera-exterior"] = socket_rope_posts_camera_exterior_0;
  const socket_rope_posts_environment_downwash_origin_1 = new THREE.Object3D();
  socket_rope_posts_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_rope_posts_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_rope_posts_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_rope_posts_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_rope_posts_26.add(socket_rope_posts_environment_downwash_origin_1);
  sockets["rope-posts:environment-downwash-origin"] = socket_rope_posts_environment_downwash_origin_1;

  const attachment_slate_wear_27 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_slate_wear_27 = makeAttachmentEndpoint(attachment_slate_wear_27);
  const node_slate_wear_27 = new THREE.Group();
  node_slate_wear_27.name = "Slate Wear__pivot";
  node_slate_wear_27.scale.set(1, 1, 1);
  if (endpoint_slate_wear_27) {
    node_slate_wear_27.position.copy(endpoint_slate_wear_27.start);
    node_slate_wear_27.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_slate_wear_27.position.set(0.0, 0.0, 0.0);
    node_slate_wear_27.rotation.set(0.0, 0.0, 0.0);
  }
  node_slate_wear_27.userData.sculptComponent = {"id": "slate-wear", "name": "Slate Wear", "level": "micro", "role": "sparse warm slate edge wear", "importance": 0.62, "confidence": 0.82, "primitive": "plane-card", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "weathering", "placement": "Observed weathering on slate wear.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["weathering"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_slate_wear_27.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_slate_wear_27);
  nodes["slate-wear"] = node_slate_wear_27;
  const mesh_slate_wear_27Geometry = endpoint_slate_wear_27
    ? new THREE.CylinderGeometry(endpoint_slate_wear_27.endRadius, endpoint_slate_wear_27.baseRadius, endpoint_slate_wear_27.length, 32, 12)
    : new THREE.PlaneGeometry(1, 1, 24, 24);
  if (!endpoint_slate_wear_27) {
    mesh_slate_wear_27Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_slate_wear_27 = new THREE.Mesh(
    mesh_slate_wear_27Geometry,
    materialMap["weathered-slate"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_slate_wear_27.name = "Slate Wear";
  if (endpoint_slate_wear_27) {
    mesh_slate_wear_27.position.copy(endpoint_slate_wear_27.midpoint);
    mesh_slate_wear_27.quaternion.copy(endpoint_slate_wear_27.quaternion);
  }
  mesh_slate_wear_27.castShadow = options.castShadow ?? true;
  mesh_slate_wear_27.receiveShadow = options.receiveShadow ?? true;
  mesh_slate_wear_27.userData.sculptComponent = {"id": "slate-wear", "name": "Slate Wear", "level": "micro", "role": "sparse warm slate edge wear", "importance": 0.62, "confidence": 0.82, "primitive": "plane-card", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "weathered-slate", "materialLayers": ["weathered-slate"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "weathering", "placement": "Observed weathering on slate wear.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["weathering"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(69, 83, 89, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "stone", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_slate_wear_27.add(mesh_slate_wear_27);
  meshes["slate-wear"] = mesh_slate_wear_27;
  colliders["slate-wear"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_slate_wear_27);
  const socket_slate_wear_camera_exterior_0 = new THREE.Object3D();
  socket_slate_wear_camera_exterior_0.name = "camera-exterior";
  socket_slate_wear_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_slate_wear_camera_exterior_0.rotation.set(0, 0, 0);
  socket_slate_wear_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_slate_wear_27.add(socket_slate_wear_camera_exterior_0);
  sockets["slate-wear:camera-exterior"] = socket_slate_wear_camera_exterior_0;
  const socket_slate_wear_environment_downwash_origin_1 = new THREE.Object3D();
  socket_slate_wear_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_slate_wear_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_slate_wear_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_slate_wear_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_slate_wear_27.add(socket_slate_wear_environment_downwash_origin_1);
  sockets["slate-wear:environment-downwash-origin"] = socket_slate_wear_environment_downwash_origin_1;

  const attachment_cedar_grain_28 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_cedar_grain_28 = makeAttachmentEndpoint(attachment_cedar_grain_28);
  const node_cedar_grain_28 = new THREE.Group();
  node_cedar_grain_28.name = "Cedar Grain__pivot";
  node_cedar_grain_28.scale.set(1, 1, 1);
  if (endpoint_cedar_grain_28) {
    node_cedar_grain_28.position.copy(endpoint_cedar_grain_28.start);
    node_cedar_grain_28.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_cedar_grain_28.position.set(0.0, 0.0, 0.0);
    node_cedar_grain_28.rotation.set(0.0, 0.0, 0.0);
  }
  node_cedar_grain_28.userData.sculptComponent = {"id": "cedar-grain", "name": "Cedar Grain", "level": "micro", "role": "cedar grain shading contrast", "importance": 0.62, "confidence": 0.82, "primitive": "plane-card", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "grain-cavity", "placement": "Observed grain cavity on cedar grain.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["grain-cavity"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_cedar_grain_28.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_cedar_grain_28);
  nodes["cedar-grain"] = node_cedar_grain_28;
  const mesh_cedar_grain_28Geometry = endpoint_cedar_grain_28
    ? new THREE.CylinderGeometry(endpoint_cedar_grain_28.endRadius, endpoint_cedar_grain_28.baseRadius, endpoint_cedar_grain_28.length, 32, 12)
    : new THREE.PlaneGeometry(1, 1, 24, 24);
  if (!endpoint_cedar_grain_28) {
    mesh_cedar_grain_28Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_cedar_grain_28 = new THREE.Mesh(
    mesh_cedar_grain_28Geometry,
    materialMap["cedar-timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_cedar_grain_28.name = "Cedar Grain";
  if (endpoint_cedar_grain_28) {
    mesh_cedar_grain_28.position.copy(endpoint_cedar_grain_28.midpoint);
    mesh_cedar_grain_28.quaternion.copy(endpoint_cedar_grain_28.quaternion);
  }
  mesh_cedar_grain_28.castShadow = options.castShadow ?? true;
  mesh_cedar_grain_28.receiveShadow = options.receiveShadow ?? true;
  mesh_cedar_grain_28.userData.sculptComponent = {"id": "cedar-grain", "name": "Cedar Grain", "level": "micro", "role": "cedar grain shading contrast", "importance": 0.62, "confidence": 0.82, "primitive": "plane-card", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "cedar-timber", "materialLayers": ["cedar-timber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "grain-cavity", "placement": "Observed grain cavity on cedar grain.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["grain-cavity"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "wood", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_cedar_grain_28.add(mesh_cedar_grain_28);
  meshes["cedar-grain"] = mesh_cedar_grain_28;
  colliders["cedar-grain"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_cedar_grain_28);
  const socket_cedar_grain_camera_exterior_0 = new THREE.Object3D();
  socket_cedar_grain_camera_exterior_0.name = "camera-exterior";
  socket_cedar_grain_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_cedar_grain_camera_exterior_0.rotation.set(0, 0, 0);
  socket_cedar_grain_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_cedar_grain_28.add(socket_cedar_grain_camera_exterior_0);
  sockets["cedar-grain:camera-exterior"] = socket_cedar_grain_camera_exterior_0;
  const socket_cedar_grain_environment_downwash_origin_1 = new THREE.Object3D();
  socket_cedar_grain_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_cedar_grain_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_cedar_grain_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_cedar_grain_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_cedar_grain_28.add(socket_cedar_grain_environment_downwash_origin_1);
  sockets["cedar-grain:environment-downwash-origin"] = socket_cedar_grain_environment_downwash_origin_1;

  const attachment_hardware_fasteners_29 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_hardware_fasteners_29 = makeAttachmentEndpoint(attachment_hardware_fasteners_29);
  const node_hardware_fasteners_29 = new THREE.Group();
  node_hardware_fasteners_29.name = "Hardware Fasteners__pivot";
  node_hardware_fasteners_29.scale.set(1, 1, 1);
  if (endpoint_hardware_fasteners_29) {
    node_hardware_fasteners_29.position.copy(endpoint_hardware_fasteners_29.start);
    node_hardware_fasteners_29.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_hardware_fasteners_29.position.set(0.0, 0.0, 0.0);
    node_hardware_fasteners_29.rotation.set(0.0, 0.0, 0.0);
  }
  node_hardware_fasteners_29.userData.sculptComponent = {"id": "hardware-fasteners", "name": "Hardware Fasteners", "level": "micro", "role": "brass fastener clusters", "importance": 0.62, "confidence": 0.82, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "fasteners", "placement": "Observed fasteners on hardware fasteners.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["fasteners"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "metal", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_hardware_fasteners_29.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_hardware_fasteners_29);
  nodes["hardware-fasteners"] = node_hardware_fasteners_29;
  const mesh_hardware_fasteners_29Geometry = endpoint_hardware_fasteners_29
    ? new THREE.CylinderGeometry(endpoint_hardware_fasteners_29.endRadius, endpoint_hardware_fasteners_29.baseRadius, endpoint_hardware_fasteners_29.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_hardware_fasteners_29) {
    mesh_hardware_fasteners_29Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_hardware_fasteners_29 = new THREE.Mesh(
    mesh_hardware_fasteners_29Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_hardware_fasteners_29.name = "Hardware Fasteners";
  if (endpoint_hardware_fasteners_29) {
    mesh_hardware_fasteners_29.position.copy(endpoint_hardware_fasteners_29.midpoint);
    mesh_hardware_fasteners_29.quaternion.copy(endpoint_hardware_fasteners_29.quaternion);
  }
  mesh_hardware_fasteners_29.castShadow = options.castShadow ?? true;
  mesh_hardware_fasteners_29.receiveShadow = options.receiveShadow ?? true;
  mesh_hardware_fasteners_29.userData.sculptComponent = {"id": "hardware-fasteners", "name": "Hardware Fasteners", "level": "micro", "role": "brass fastener clusters", "importance": 0.62, "confidence": 0.82, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "fasteners", "placement": "Observed fasteners on hardware fasteners.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["fasteners"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "metal", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_hardware_fasteners_29.add(mesh_hardware_fasteners_29);
  meshes["hardware-fasteners"] = mesh_hardware_fasteners_29;
  colliders["hardware-fasteners"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_hardware_fasteners_29);
  const socket_hardware_fasteners_camera_exterior_0 = new THREE.Object3D();
  socket_hardware_fasteners_camera_exterior_0.name = "camera-exterior";
  socket_hardware_fasteners_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_hardware_fasteners_camera_exterior_0.rotation.set(0, 0, 0);
  socket_hardware_fasteners_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_hardware_fasteners_29.add(socket_hardware_fasteners_camera_exterior_0);
  sockets["hardware-fasteners:camera-exterior"] = socket_hardware_fasteners_camera_exterior_0;
  const socket_hardware_fasteners_environment_downwash_origin_1 = new THREE.Object3D();
  socket_hardware_fasteners_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_hardware_fasteners_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_hardware_fasteners_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_hardware_fasteners_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_hardware_fasteners_29.add(socket_hardware_fasteners_environment_downwash_origin_1);
  sockets["hardware-fasteners:environment-downwash-origin"] = socket_hardware_fasteners_environment_downwash_origin_1;

  const attachment_window_glow_30 = {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02};
  const endpoint_window_glow_30 = makeAttachmentEndpoint(attachment_window_glow_30);
  const node_window_glow_30 = new THREE.Group();
  node_window_glow_30.name = "Window Glow__pivot";
  node_window_glow_30.scale.set(1, 1, 1);
  if (endpoint_window_glow_30) {
    node_window_glow_30.position.copy(endpoint_window_glow_30.start);
    node_window_glow_30.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_window_glow_30.position.set(0.0, 0.0, 0.0);
    node_window_glow_30.rotation.set(0.0, 0.0, 0.0);
  }
  node_window_glow_30.userData.sculptComponent = {"id": "window-glow", "name": "Window Glow", "level": "micro", "role": "amber occupied light plane", "importance": 0.62, "confidence": 0.82, "primitive": "plane-card", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "amber-glass", "materialLayers": ["amber-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "recessed-emission", "placement": "Observed recessed emission on window glow.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["recessed-emission"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "glass", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_window_glow_30.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_window_glow_30);
  nodes["window-glow"] = node_window_glow_30;
  const mesh_window_glow_30Geometry = endpoint_window_glow_30
    ? new THREE.CylinderGeometry(endpoint_window_glow_30.endRadius, endpoint_window_glow_30.baseRadius, endpoint_window_glow_30.length, 32, 12)
    : new THREE.PlaneGeometry(1, 1, 24, 24);
  if (!endpoint_window_glow_30) {
    mesh_window_glow_30Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_window_glow_30 = new THREE.Mesh(
    mesh_window_glow_30Geometry,
    materialMap["amber-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_window_glow_30.name = "Window Glow";
  if (endpoint_window_glow_30) {
    mesh_window_glow_30.position.copy(endpoint_window_glow_30.midpoint);
    mesh_window_glow_30.quaternion.copy(endpoint_window_glow_30.quaternion);
  }
  mesh_window_glow_30.castShadow = options.castShadow ?? true;
  mesh_window_glow_30.receiveShadow = options.receiveShadow ?? true;
  mesh_window_glow_30.userData.sculptComponent = {"id": "window-glow", "name": "Window Glow", "level": "micro", "role": "amber occupied light plane", "importance": 0.62, "confidence": 0.82, "primitive": "plane-card", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentSocket": "root-build-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.1, 0], "contactType": "overlap", "embedDepth": 0.08, "gapTolerance": 0.02}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-150m-living-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "amber-glass", "materialLayers": ["amber-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "recessed-emission", "placement": "Observed recessed emission on window glow.", "size": "phone-readable meso relief or silhouette-changing feature", "orientation": "local to the Guild Hall front +z coordinate frame", "materialEffect": "independent roughness, AO and colour response tied to its owning material", "geometryEffect": "real procedural geometry when it changes silhouette, depth or attachment", "confidence": 0.88, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["guild-hall-primary", "guild-hall-three-quarter"], "details": ["recessed-emission"], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 72, 43, 1)", "secondaryAlbedo": "rgba(203, 145, 76, 1)", "materialClass": "glass", "materialClassConfidence": 0.86, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(49, 63, 70, 1)"}, {"at": 1, "color": "rgba(203, 145, 76, 1)"}]}, "evidenceRefs": ["guild-hall-primary"]}};
  node_window_glow_30.add(mesh_window_glow_30);
  meshes["window-glow"] = mesh_window_glow_30;
  colliders["window-glow"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_window_glow_30);
  const socket_window_glow_camera_exterior_0 = new THREE.Object3D();
  socket_window_glow_camera_exterior_0.name = "camera-exterior";
  socket_window_glow_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_window_glow_camera_exterior_0.rotation.set(0, 0, 0);
  socket_window_glow_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_window_glow_30.add(socket_window_glow_camera_exterior_0);
  sockets["window-glow:camera-exterior"] = socket_window_glow_camera_exterior_0;
  const socket_window_glow_environment_downwash_origin_1 = new THREE.Object3D();
  socket_window_glow_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_window_glow_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_window_glow_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_window_glow_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_window_glow_30.add(socket_window_glow_environment_downwash_origin_1);
  sockets["window-glow:environment-downwash-origin"] = socket_window_glow_environment_downwash_origin_1;

  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "phone-runtime-balanced", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": false, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets.',
  };
  return root;
}

export function createFisherfolkGuildHallLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "Fisherfolk Guild Hall look-dev lights";
  const hemi = new THREE.HemisphereLight(
    mode === 'reference' ? 0xfff0d6 : 0xf2f4ff,
    0x363b42,
    mode === 'grazing' ? 0.28 : mode === 'reference' ? 0.72 : 0.85,
  );
  lights.add(hemi);
  const key = new THREE.DirectionalLight(
    mode === 'reference' ? 0xffcf8a : 0xfff4e8,
    mode === 'grazing' ? 4.2 : mode === 'reference' ? 2.6 : 2.15,
  );
  if (mode === 'grazing') key.position.set(7.5, 1.1, 4.0);
  else if (mode === 'reference') key.position.set(-4.5, 7.5, 5.0);
  else key.position.set(-4.0, 6.0, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.018;
  key.shadow.radius = 7;
  key.shadow.blurSamples = 24;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -2.6;
  key.shadow.camera.right = 2.6;
  key.shadow.camera.top = 2.6;
  key.shadow.camera.bottom = -2.6;
  key.shadow.camera.updateProjectionMatrix();
  lights.add(key);
  const fill = new THREE.DirectionalLight(0xa8c4ff, mode === 'grazing' ? 0.12 : 0.42);
  fill.position.set(4.0, 3.0, 3.5);
  lights.add(fill);
  const rim = new THREE.DirectionalLight(0xfff1c4, mode === 'grazing' ? 0.28 : 0.85);
  rim.position.set(0.5, 4.5, -6.0);
  lights.add(rim);
  lights.userData.reviewMode = mode;
  lights.userData.lightingFromPhoto = ["Warm key light from upper front-left at intensity 2.4 with soft shadows.", "Cool sea fill from front-right at intensity 0.9 separates slate from timber.", "Restrained cyan rim at intensity 1.0 outlines crown finials and curled eaves.", "Amber occupied windows use emissiveIntensity 1.15 without lifting global exposure.", "ACES filmic tone mapping at exposure 1.0 against the Island 016 pale-blue sky.", "Soft contact shadows ground foundation, stairs, porch posts and terrace props."];
  lights.userData.lookDevTargets = {"qualityPriority": "phone-runtime-balanced", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": false, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  return lights;
}

// PBR materials (clearcoat/iridescence/transmission/anisotropy) need an environment
// map to visually behave as intended — call this once per renderer and assign the
// result to scene.environment before rendering. No external HDR asset required.
export function createFisherfolkGuildHallEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return texture;
}

// Plan 1.3 §3.2 — auto-framing by bounding box. The Divine Eye can only compare a
// render to the reference if the object is FRAMED consistently (an object framed
// differently scores as wrong even when its shape is right). This positions the camera
// deterministically from the object's bounding box so it fills the frame at a stable
// margin, and sets near/far to the object scale. Call after adding the model to the
// scene, and again on resize (after updating camera.aspect).
export function frameFisherfolkGuildHallCamera(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  options: { margin?: number; azimuthDeg?: number; elevationDeg?: number } = {},
): void {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const margin = options.margin ?? 1.15;
  const maxDim = Math.max(size.x, size.y, size.z) * margin;
  const fov = (camera.fov * Math.PI) / 180;
  // distance so the largest object dimension fits vertically in the frame
  const distance = (maxDim / 2) / Math.tan(fov / 2);
  const az = ((options.azimuthDeg ?? 0) * Math.PI) / 180;
  const el = ((options.elevationDeg ?? 0) * Math.PI) / 180;
  const dir = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  );
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.near = Math.max(0.01, distance - maxDim);
  camera.far = distance + maxDim * 2;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

// Plan 1.3 §3.2c — PRESENTATION composer (DOF + bloom). CRITICAL (R-POSTFX): this is
// for the showcase/hero render ONLY. The Divine Eye's EVALUATION render MUST use a
// plain renderer with NO composer — bloom blows highlights and DOF blurs edges, which
// would corrupt the deterministic IoU/DCD/edge/blowout signals. Enable dof/bloom ONLY
// when the reference photo actually exhibits them (detect_reference_effects.py authorizes).
export function createFisherfolkGuildHallPresentationComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: { dof?: boolean; bloom?: boolean; bloomStrength?: number; dofFocus?: number; dofAperture?: number } = {},
): EffectComposer {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (options.dof) {
    composer.addPass(new BokehPass(scene, camera, {
      focus: options.dofFocus ?? 10.0,
      aperture: options.dofAperture ?? 0.0002,
      maxblur: 0.01,
    }));
  }
  if (options.bloom) {
    const size = new THREE.Vector2();
    renderer.getSize(size);
    composer.addPass(new UnrealBloomPass(size, options.bloomStrength ?? 0.4, 0.4, 0.85));
  }
  return composer;
}

export function configureFisherfolkGuildHallRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createFisherfolkGuildHallInspectControls(
  camera: THREE.Camera,
  domElement: HTMLElement,
): OrbitControls {
  // View-dependent finishes only read correctly once the user orbits — their color
  // comes from the environment reflection, not albedo, so free rotation matters here.
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.0;
  controls.maxDistance = 8.0;
  controls.autoRotate = false;
  return controls;
}
