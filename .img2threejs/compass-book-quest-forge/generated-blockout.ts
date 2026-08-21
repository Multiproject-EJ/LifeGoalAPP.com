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

function buildLatheGeometry(profile: { points: [number, number][]; segments?: number }): THREE.LatheGeometry {
  const points = profile.points.map(([x, y]) => new THREE.Vector2(Math.max(0.0001, x), y));
  return new THREE.LatheGeometry(points, profile.segments ?? 24);
}

function buildTubeGeometry(
  path: { points: [number, number, number][]; radius?: number; radialSegments?: number; closed?: boolean },
): THREE.TubeGeometry {
  const vectors = path.points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(vectors, path.closed ?? false);
  const tubularSegments = Math.max(8, path.points.length * 6);
  return new THREE.TubeGeometry(curve, tubularSegments, path.radius ?? 0.05, path.radialSegments ?? 8, path.closed ?? false);
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

// Generated from ObjectSculptSpec target: Compass Book Quest Forge Relief
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createCompassBookQuestForgeReliefModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "Compass Book Quest Forge Relief";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": {"solved": false, "fovDegrees": 39, "aspect": 1.777, "orientation": {"yaw": -4, "pitch": -48, "roll": 0}, "positionHint": [0, 13, 18], "note": "Wide three-quarter top reference; fixed production book camera is authoritative and orbit views expose hidden thickness."}, "approximationNotes": []};
  root.userData.materialPipeline = {"schemaVersion": 1, "status": "proceed", "registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "analysisArtifact": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-analysis.json", "targetThreshold": 0.7, "unresolvedNotObservedMaterials": [], "regions": [{"componentId": "contact-field", "regionId": "indigo-field-grain", "specMaterialId": "indigo-field", "profileId": "leather.matte", "status": "proceed"}, {"componentId": "maintenance-ring", "regionId": "aged-brass-ring", "specMaterialId": "aged-brass", "profileId": "metal.brass", "status": "proceed"}, {"componentId": "quest-crest", "regionId": "violet-crystal-facet", "specMaterialId": "violet-crystal", "profileId": "gemstone.quartz", "status": "proceed"}, {"componentId": "primary-token", "regionId": "polished-gold-primary", "specMaterialId": "gold-primary", "profileId": "metal.gold", "status": "proceed"}, {"componentId": "supporting-token", "regionId": "teal-support-enamel", "specMaterialId": "teal-enamel", "profileId": "ceramic.glazed", "status": "proceed"}, {"componentId": "not-now-vault", "regionId": "charcoal-vault-panel", "specMaterialId": "vault-charcoal", "profileId": "coating.painted-metal", "status": "proceed"}, {"componentId": "protected-flame", "regionId": "amber-emissive-solid", "specMaterialId": "flame-amber", "profileId": "ceramic.glazed", "status": "proceed"}], "controlledViewsRequired": ["albedo-unlit", "backlight-transmission", "environment-reflection", "grazing", "neutral-studio", "reference-beauty"]};
  root.userData.materialReferenceRegistry = "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json";

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["indigo-field"] = createSculptMaterial(
    "indigo-field",
    {"id": "indigo-field", "name": "indigo field", "type": "standard", "shaderModel": "MeshStandardMaterial", "baseColor": "#111326", "color": "#111326", "albedo": {"dominant": "#111326", "secondary": ["#111326", "#090A13"], "samplingNotes": "Reference-guided base values separated from baked key/rim lighting."}, "colorVariation": {"palette": ["#111326", "#090A13", "#C58A3A"], "pattern": "fine leather grain with sparse recessed page-instrument marks; deterministic object-space variation", "amplitude": 0.1, "heightCorrelation": 0.24}, "textureResolution": 1024, "textureProjection": {"mode": "object-space", "repeat": [4, 4], "anisotropy": 8, "texelDensityIntent": "Stable page-scale detail without stretching across relief parts."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 1.4, "amplitude": 0.12, "role": "broad patina/value variation"}, {"id": "meso", "frequency": 14, "amplitude": 0.075, "role": "fine leather grain with sparse recessed page-instrument marks"}, {"id": "micro", "frequency": 72, "amplitude": 0.024, "role": "grazing-highlight breakup"}], "roughness": {"base": 0.62, "variation": 0.12, "map": "independent-procedural-roughness", "localResponse": "rougher cavities and fracture faces, smoother worn crests"}, "metalness": {"base": 0.0, "variation": 0}, "normal": {"pattern": "fine leather grain with sparse recessed page-instrument marks independent normal", "strength": 0.22, "scale": 54, "space": "tangent"}, "bump": {"pattern": "fine leather grain with sparse recessed page-instrument marks independent height", "amplitude": 0.055, "scale": 48}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.44, "notes": "Concentrated beneath ring rails, bezels, cage ribs, hinges, frame and crest socket."}, "wear": {"edgeWear": 0.04, "scratches": ["short restrained directional marks"], "chips": []}, "dirt": {"amount": 0.03, "cavityBias": 0.72, "color": "#09070A"}, "localOverrides": [{"id": "indigo-field-cavity-patina", "region": "recesses, seams, contact zones and selected worn crests", "roughness": 0.86, "strength": 0.32, "evidenceRefs": ["quest-forge-goal"]}], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "fine leather grain with sparse recessed page-instrument marks; albedo, roughness, height/normal and AO remain independent channels.", "clearcoat": {"base": 0.08, "variation": 0.0}, "clearcoatRoughness": {"base": 0.45, "variation": 0.0}, "emissive": "#000000", "emissiveIntensity": 0.03, "referenceMaterialId": "leather.matte", "materialFamily": "leather", "materialSubtype": "natural-or-synthetic", "materialFinish": "matte-worn", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "leather.matte", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "three.mesh-standard", "adobe.pbr-guide-2", "mit.material-recognition"], "requiredMaps": ["map", "roughnessMap", "normalMap"], "optionalMaps": ["aoMap", "clearcoatMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "reference-beauty"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/00-indigo-field-grain.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.86, "estimatedFidelity": 0.86, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-00-indigo-field-grain/indigo-field_albedo.png", "url": "indigo-field_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-00-indigo-field-grain/indigo-field_roughness.png", "url": "indigo-field_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-00-indigo-field-grain/indigo-field_height.png", "url": "indigo-field_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-00-indigo-field-grain/indigo-field_normal.png", "url": "indigo-field_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-00-indigo-field-grain/indigo-field_ao.png", "url": "indigo-field_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 150, "sourceHeight": 125, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 150, "height": 125}, "mask": {"backgroundColor": "#1F1C1D", "backgroundNoise": 24.556, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.6579}, "mapStats": {"valueRange": 0.417, "heightP90Gradient": 0.05564, "roughnessBase": 0.719, "roughnessVariation": 0.081, "normalStrength": 0.221, "blurRadius": 10}, "palette": ["#16131A", "#1E1A20", "#A7702C", "#09070D", "#75481B"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#7F5B2D", "#151218", "#1D1B1F", "#1B191F", "#1B1920"], "paletteHueRisk": [{"stop": "#151218", "hueRisk": "blue-collapse", "suggestedRgb": [24, 18, 21]}, {"stop": "#1B191F", "hueRisk": "blue-collapse", "suggestedRgb": [31, 25, 27]}, {"stop": "#1B1920", "hueRisk": "blue-collapse", "suggestedRgb": [32, 25, 27]}], "gradientAxis": "horizontal", "stats": {"meanLum": 40.0, "meanSaturation": 0.297, "gradientStrength": 0.418, "mottle": 0.051, "streakRatio": 1.52, "hueSpread": 0.566, "specularFraction": 0.002}}, "materialEvidence": {"componentId": "contact-field", "regionId": "indigo-field-grain", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/00-indigo-field-grain.png", "bbox": {"x": 205, "y": 560, "width": 150, "height": 125}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0119}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "contact-field", "regionId": "indigo-field-grain", "materialId": "leather.matte", "family": null, "subtype": null, "finish": null, "aliases": [], "confidence": 0.86, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["aged-brass"] = createSculptMaterial(
    "aged-brass",
    {"id": "aged-brass", "name": "aged brass", "type": "standard", "shaderModel": "MeshStandardMaterial", "baseColor": "#9A6327", "color": "#9A6327", "albedo": {"dominant": "#9A6327", "secondary": ["#9A6327", "#090A13"], "samplingNotes": "Reference-guided base values separated from baked key/rim lighting."}, "colorVariation": {"palette": ["#9A6327", "#090A13", "#C58A3A"], "pattern": "brushed gilt with cavity-darkened patina and restrained worn crests; deterministic object-space variation", "amplitude": 0.1, "heightCorrelation": 0.24}, "textureResolution": 1024, "textureProjection": {"mode": "object-space", "repeat": [4, 4], "anisotropy": 8, "texelDensityIntent": "Stable page-scale detail without stretching across relief parts."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 1.4, "amplitude": 0.12, "role": "broad patina/value variation"}, {"id": "meso", "frequency": 14, "amplitude": 0.075, "role": "brushed gilt with cavity-darkened patina and restrained worn crests"}, {"id": "micro", "frequency": 72, "amplitude": 0.024, "role": "grazing-highlight breakup"}], "roughness": {"base": 0.3, "variation": 0.12, "map": "independent-procedural-roughness", "localResponse": "rougher cavities and fracture faces, smoother worn crests"}, "metalness": {"base": 1.0, "variation": 0.06}, "normal": {"pattern": "brushed gilt with cavity-darkened patina and restrained worn crests independent normal", "strength": 0.1, "scale": 54, "space": "tangent"}, "bump": {"pattern": "brushed gilt with cavity-darkened patina and restrained worn crests independent height", "amplitude": 0.025, "scale": 48}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.44, "notes": "Concentrated beneath ring rails, bezels, cage ribs, hinges, frame and crest socket."}, "wear": {"edgeWear": 0.14, "scratches": ["short restrained directional marks"], "chips": []}, "dirt": {"amount": 0.11, "cavityBias": 0.72, "color": "#09070A"}, "localOverrides": [{"id": "aged-brass-cavity-patina", "region": "recesses, seams, contact zones and selected worn crests", "roughness": 0.49, "strength": 0.32, "evidenceRefs": ["quest-forge-goal"]}], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "brushed gilt with cavity-darkened patina and restrained worn crests; albedo, roughness, height/normal and AO remain independent channels.", "clearcoat": 0.18, "clearcoatRoughness": 0.32, "emissive": "#160A02", "emissiveIntensity": 0.03, "referenceMaterialId": "metal.brass", "materialFamily": "metal", "materialSubtype": "brass-bronze", "materialFinish": "polished-or-aged", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "metal.brass", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-standard", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-2", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "aoMap", "metalnessMap"], "validationViews": ["albedo-unlit", "environment-reflection", "grazing", "reference-beauty"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/01-aged-brass-ring.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.86, "estimatedFidelity": 0.86, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-01-aged-brass-ring/aged-brass_albedo.png", "url": "aged-brass_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-01-aged-brass-ring/aged-brass_roughness.png", "url": "aged-brass_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-01-aged-brass-ring/aged-brass_height.png", "url": "aged-brass_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-01-aged-brass-ring/aged-brass_normal.png", "url": "aged-brass_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-01-aged-brass-ring/aged-brass_ao.png", "url": "aged-brass_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 250, "sourceHeight": 52, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 250, "height": 52}, "mask": {"backgroundColor": "#31211C", "backgroundNoise": 137.364, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.8779}, "mapStats": {"valueRange": 0.4318, "heightP90Gradient": 0.14867, "roughnessBase": 0.73, "roughnessVariation": 0.188, "normalStrength": 0.33, "blurRadius": 10}, "palette": ["#19151B", "#7C4D1D", "#0B0708", "#3F2816", "#C8A159"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#80521F", "#181310", "#221A1A", "#3A2D22", "#35261D"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 41.0, "meanSaturation": 0.446, "gradientStrength": 0.279, "mottle": 0.063, "streakRatio": 1.49, "hueSpread": 0.391, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "maintenance-ring", "regionId": "aged-brass-ring", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/01-aged-brass-ring.png", "bbox": {"x": 294, "y": 104, "width": 250, "height": 52}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0083}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "maintenance-ring", "regionId": "aged-brass-ring", "materialId": "metal.brass", "family": null, "subtype": null, "finish": null, "aliases": [], "confidence": 0.86, "source": "vision"}, "alternatives": []}, "needsEnvironment": true},
    options
  );
  materialMap["violet-crystal"] = createSculptMaterial(
    "violet-crystal",
    {"id": "violet-crystal", "name": "violet crystal", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#6F35B5", "color": "#6F35B5", "albedo": {"dominant": "#6F35B5", "secondary": ["#6F35B5", "#090A13"], "samplingNotes": "Reference-guided base values separated from baked key/rim lighting."}, "colorVariation": {"palette": ["#6F35B5", "#090A13", "#C58A3A"], "pattern": "faceted violet enamel-crystal with independent micro scratches; deterministic object-space variation", "amplitude": 0.1, "heightCorrelation": 0.24}, "textureResolution": 1024, "textureProjection": {"mode": "object-space", "repeat": [4, 4], "anisotropy": 8, "texelDensityIntent": "Stable page-scale detail without stretching across relief parts."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 1.4, "amplitude": 0.12, "role": "broad patina/value variation"}, {"id": "meso", "frequency": 14, "amplitude": 0.075, "role": "faceted violet enamel-crystal with independent micro scratches"}, {"id": "micro", "frequency": 72, "amplitude": 0.024, "role": "grazing-highlight breakup"}], "roughness": {"base": 0.06, "variation": 0.12, "map": "independent-procedural-roughness", "localResponse": "rougher cavities and fracture faces, smoother worn crests"}, "metalness": {"base": 0.0, "variation": 0}, "normal": {"pattern": "faceted violet enamel-crystal with independent micro scratches independent normal", "strength": 0.1, "scale": 54, "space": "tangent"}, "bump": {"pattern": "faceted violet enamel-crystal with independent micro scratches independent height", "amplitude": 0.025, "scale": 48}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.44, "notes": "Concentrated beneath ring rails, bezels, cage ribs, hinges, frame and crest socket."}, "wear": {"edgeWear": 0.04, "scratches": ["short restrained directional marks"], "chips": ["accepted-cost fracture face is geometry-owned"]}, "dirt": {"amount": 0.03, "cavityBias": 0.72, "color": "#09070A"}, "localOverrides": [{"id": "violet-crystal-cavity-patina", "region": "recesses, seams, contact zones and selected worn crests", "roughness": 0.33999999999999997, "strength": 0.32, "evidenceRefs": ["quest-forge-goal"]}], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "faceted violet enamel-crystal with independent micro scratches; albedo, roughness, height/normal and AO remain independent channels.", "clearcoat": 0.72, "clearcoatRoughness": 0.15, "emissive": "#36106E", "emissiveIntensity": 0.16, "referenceMaterialId": "gemstone.quartz", "materialFamily": "gemstone", "materialSubtype": "quartz-like", "materialFinish": "polished", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "gemstone.quartz", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "three.pmrem", "gltf.2", "khronos.transmission", "khronos.volume", "google.filament-pbr"], "requiredMaps": ["roughnessMap", "thicknessMap"], "optionalMaps": ["map", "normalMap", "transmissionMap"], "validationViews": ["neutral-studio", "environment-reflection", "backlight-transmission", "reference-beauty"]}, "transmission": {"base": 0.9, "variation": 0.0}, "ior": {"base": 1.54, "variation": 0.0}, "dispersion": {"base": 0.0, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/02-violet-crystal-facet.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-02-violet-crystal-facet/violet-crystal_albedo.png", "url": "violet-crystal_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-02-violet-crystal-facet/violet-crystal_roughness.png", "url": "violet-crystal_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-02-violet-crystal-facet/violet-crystal_height.png", "url": "violet-crystal_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-02-violet-crystal-facet/violet-crystal_normal.png", "url": "violet-crystal_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-02-violet-crystal-facet/violet-crystal_ao.png", "url": "violet-crystal_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 126, "sourceHeight": 94, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 126, "height": 94}, "mask": {"backgroundColor": "#4B232C", "backgroundNoise": 86.406, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9604}, "mapStats": {"valueRange": 0.6492, "heightP90Gradient": 0.13748, "roughnessBase": 0.739, "roughnessVariation": 0.192, "normalStrength": 0.317, "blurRadius": 10}, "palette": ["#9558A3", "#201314", "#5A2B6F", "#95652F", "#D7B7B1"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#180F0B", "#4E3451", "#8B559F", "#6E455F", "#764953"], "paletteHueRisk": [{"stop": "#4E3451", "hueRisk": "blue-collapse", "suggestedRgb": [81, 52, 78]}, {"stop": "#8B559F", "hueRisk": "blue-collapse", "suggestedRgb": [159, 85, 139]}], "gradientAxis": "vertical", "stats": {"meanLum": 78.3, "meanSaturation": 0.513, "gradientStrength": 0.37, "mottle": 0.078, "streakRatio": 1.04, "hueSpread": 0.336, "specularFraction": 0.005}}, "materialEvidence": {"componentId": "quest-crest", "regionId": "violet-crystal-facet", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/02-violet-crystal-facet.png", "bbox": {"x": 447, "y": 175, "width": 126, "height": 94}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0075}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "quest-crest", "regionId": "violet-crystal-facet", "materialId": "gemstone.quartz", "family": null, "subtype": null, "finish": null, "aliases": [], "confidence": 0.829, "source": "vision"}, "alternatives": []}, "needsEnvironment": true},
    options
  );
  materialMap["gold-primary"] = createSculptMaterial(
    "gold-primary",
    {"id": "gold-primary", "name": "gold primary", "type": "standard", "shaderModel": "MeshStandardMaterial", "baseColor": "#D6A13B", "color": "#D6A13B", "albedo": {"dominant": "#D6A13B", "secondary": ["#D6A13B", "#090A13"], "samplingNotes": "Reference-guided base values separated from baked key/rim lighting."}, "colorVariation": {"palette": ["#D6A13B", "#090A13", "#C58A3A"], "pattern": "polished gold diamond with sharp bevel highlights; deterministic object-space variation", "amplitude": 0.1, "heightCorrelation": 0.24}, "textureResolution": 1024, "textureProjection": {"mode": "object-space", "repeat": [4, 4], "anisotropy": 8, "texelDensityIntent": "Stable page-scale detail without stretching across relief parts."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 1.4, "amplitude": 0.12, "role": "broad patina/value variation"}, {"id": "meso", "frequency": 14, "amplitude": 0.075, "role": "polished gold diamond with sharp bevel highlights"}, {"id": "micro", "frequency": 72, "amplitude": 0.024, "role": "grazing-highlight breakup"}], "roughness": {"base": 0.22, "variation": 0.12, "map": "independent-procedural-roughness", "localResponse": "rougher cavities and fracture faces, smoother worn crests"}, "metalness": {"base": 1.0, "variation": 0.06}, "normal": {"pattern": "polished gold diamond with sharp bevel highlights independent normal", "strength": 0.1, "scale": 54, "space": "tangent"}, "bump": {"pattern": "polished gold diamond with sharp bevel highlights independent height", "amplitude": 0.025, "scale": 48}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.44, "notes": "Concentrated beneath ring rails, bezels, cage ribs, hinges, frame and crest socket."}, "wear": {"edgeWear": 0.04, "scratches": ["short restrained directional marks"], "chips": []}, "dirt": {"amount": 0.03, "cavityBias": 0.72, "color": "#09070A"}, "localOverrides": [{"id": "gold-primary-cavity-patina", "region": "recesses, seams, contact zones and selected worn crests", "roughness": 0.32, "strength": 0.32, "evidenceRefs": ["quest-forge-goal"]}], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "polished gold diamond with sharp bevel highlights; albedo, roughness, height/normal and AO remain independent channels.", "clearcoat": 0.32, "clearcoatRoughness": 0.32, "emissive": "#2A1302", "emissiveIntensity": 0.03, "referenceMaterialId": "metal.gold", "materialFamily": "metal", "materialSubtype": "gold", "materialFinish": "polished", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "metal.gold", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-standard", "three.pmrem", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-2", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "metalnessMap"], "validationViews": ["albedo-unlit", "environment-reflection", "grazing", "reference-beauty"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/03-polished-gold-primary.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-03-polished-gold-primary/gold-primary_albedo.png", "url": "gold-primary_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-03-polished-gold-primary/gold-primary_roughness.png", "url": "gold-primary_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-03-polished-gold-primary/gold-primary_height.png", "url": "gold-primary_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-03-polished-gold-primary/gold-primary_normal.png", "url": "gold-primary_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-03-polished-gold-primary/gold-primary_ao.png", "url": "gold-primary_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 75, "sourceHeight": 92, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 75, "height": 92}, "mask": {"backgroundColor": "#4F2540", "backgroundNoise": 54.009, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9977}, "mapStats": {"valueRange": 0.6282, "heightP90Gradient": 0.12954, "roughnessBase": 0.731, "roughnessVariation": 0.193, "normalStrength": 0.308, "blurRadius": 10}, "palette": ["#392231", "#221111", "#794A21", "#D2A86B", "#553564"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#604130", "#9E783E", "#452A21", "#4A3139", "#2F1F49"], "paletteHueRisk": [{"stop": "#2F1F49", "hueRisk": "blue-collapse", "suggestedRgb": [73, 31, 47]}], "gradientAxis": "horizontal", "stats": {"meanLum": 62.5, "meanSaturation": 0.602, "gradientStrength": 0.427, "mottle": 0.077, "streakRatio": 0.93, "hueSpread": 0.345, "specularFraction": 0.004}}, "materialEvidence": {"componentId": "primary-token", "regionId": "polished-gold-primary", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/03-polished-gold-primary.png", "bbox": {"x": 530, "y": 233, "width": 75, "height": 92}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0044}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "primary-token", "regionId": "polished-gold-primary", "materialId": "metal.gold", "family": null, "subtype": null, "finish": null, "aliases": [], "confidence": 0.829, "source": "vision"}, "alternatives": []}, "needsEnvironment": true},
    options
  );
  materialMap["teal-enamel"] = createSculptMaterial(
    "teal-enamel",
    {"id": "teal-enamel", "name": "teal enamel", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#147E82", "color": "#147E82", "albedo": {"dominant": "#147E82", "secondary": ["#147E82", "#090A13"], "samplingNotes": "Reference-guided base values separated from baked key/rim lighting."}, "colorVariation": {"palette": ["#147E82", "#090A13", "#C58A3A"], "pattern": "deep teal enamel disc with controlled clearcoat; deterministic object-space variation", "amplitude": 0.1, "heightCorrelation": 0.24}, "textureResolution": 1024, "textureProjection": {"mode": "object-space", "repeat": [4, 4], "anisotropy": 8, "texelDensityIntent": "Stable page-scale detail without stretching across relief parts."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 1.4, "amplitude": 0.12, "role": "broad patina/value variation"}, {"id": "meso", "frequency": 14, "amplitude": 0.075, "role": "deep teal enamel disc with controlled clearcoat"}, {"id": "micro", "frequency": 72, "amplitude": 0.024, "role": "grazing-highlight breakup"}], "roughness": {"base": 0.26, "variation": 0.12, "map": "independent-procedural-roughness", "localResponse": "rougher cavities and fracture faces, smoother worn crests"}, "metalness": {"base": 0.0, "variation": 0}, "normal": {"pattern": "deep teal enamel disc with controlled clearcoat independent normal", "strength": 0.1, "scale": 54, "space": "tangent"}, "bump": {"pattern": "deep teal enamel disc with controlled clearcoat independent height", "amplitude": 0.025, "scale": 48}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.44, "notes": "Concentrated beneath ring rails, bezels, cage ribs, hinges, frame and crest socket."}, "wear": {"edgeWear": 0.04, "scratches": ["short restrained directional marks"], "chips": []}, "dirt": {"amount": 0.03, "cavityBias": 0.72, "color": "#09070A"}, "localOverrides": [{"id": "support-token-clearcoat", "region": "supporting token face only", "roughness": 0.13, "strength": 0.32, "evidenceRefs": ["quest-forge-goal"]}], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "deep teal enamel disc with controlled clearcoat; albedo, roughness, height/normal and AO remain independent channels.", "clearcoat": {"base": 0.7, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "emissive": "#06282B", "emissiveIntensity": 0.03, "referenceMaterialId": "ceramic.glazed", "materialFamily": "ceramic", "materialSubtype": "glazed", "materialFinish": "glossy", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "ceramic.glazed", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "adobe.pbr-guide-1", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/04-teal-support-enamel.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-04-teal-support-enamel/teal-enamel_albedo.png", "url": "teal-enamel_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-04-teal-support-enamel/teal-enamel_roughness.png", "url": "teal-enamel_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-04-teal-support-enamel/teal-enamel_height.png", "url": "teal-enamel_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-04-teal-support-enamel/teal-enamel_normal.png", "url": "teal-enamel_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-04-teal-support-enamel/teal-enamel_ao.png", "url": "teal-enamel_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 98, "sourceHeight": 98, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 98, "height": 98}, "mask": {"backgroundColor": "#17100A", "backgroundNoise": 24.062, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9759}, "mapStats": {"valueRange": 0.5669, "heightP90Gradient": 0.17942, "roughnessBase": 0.763, "roughnessVariation": 0.207, "normalStrength": 0.367, "blurRadius": 10}, "palette": ["#121212", "#3C584D", "#372916", "#744C23", "#BBAE84"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#291D16", "#412D1B", "#4C4933", "#373E30", "#3A2F1D"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 57.1, "meanSaturation": 0.534, "gradientStrength": 0.208, "mottle": 0.101, "streakRatio": 1.06, "hueSpread": 0.569, "specularFraction": 0.001}}, "materialEvidence": {"componentId": "supporting-token", "regionId": "teal-support-enamel", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/04-teal-support-enamel.png", "bbox": {"x": 746, "y": 250, "width": 98, "height": 98}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0061}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "supporting-token", "regionId": "teal-support-enamel", "materialId": "ceramic.glazed", "family": null, "subtype": null, "finish": null, "aliases": [], "confidence": 0.829, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["vault-charcoal"] = createSculptMaterial(
    "vault-charcoal",
    {"id": "vault-charcoal", "name": "vault charcoal", "type": "standard", "shaderModel": "MeshStandardMaterial", "baseColor": "#242338", "color": "#242338", "albedo": {"dominant": "#242338", "secondary": ["#242338", "#090A13"], "samplingNotes": "Reference-guided base values separated from baked key/rim lighting."}, "colorVariation": {"palette": ["#242338", "#090A13", "#C58A3A"], "pattern": "charcoal-indigo satin metal with vertical panel seams; deterministic object-space variation", "amplitude": 0.1, "heightCorrelation": 0.24}, "textureResolution": 1024, "textureProjection": {"mode": "object-space", "repeat": [4, 4], "anisotropy": 8, "texelDensityIntent": "Stable page-scale detail without stretching across relief parts."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 1.4, "amplitude": 0.12, "role": "broad patina/value variation"}, {"id": "meso", "frequency": 14, "amplitude": 0.075, "role": "charcoal-indigo satin metal with vertical panel seams"}, {"id": "micro", "frequency": 72, "amplitude": 0.024, "role": "grazing-highlight breakup"}], "roughness": {"base": 0.45, "variation": 0.12, "map": "independent-procedural-roughness", "localResponse": "rougher cavities and fracture faces, smoother worn crests"}, "metalness": {"base": 0.0, "variation": 0.06}, "normal": {"pattern": "charcoal-indigo satin metal with vertical panel seams independent normal", "strength": 0.1, "scale": 54, "space": "tangent"}, "bump": {"pattern": "charcoal-indigo satin metal with vertical panel seams independent height", "amplitude": 0.025, "scale": 48}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.44, "notes": "Concentrated beneath ring rails, bezels, cage ribs, hinges, frame and crest socket."}, "wear": {"edgeWear": 0.14, "scratches": ["short restrained directional marks"], "chips": []}, "dirt": {"amount": 0.11, "cavityBias": 0.72, "color": "#09070A"}, "localOverrides": [{"id": "vault-charcoal-cavity-patina", "region": "recesses, seams, contact zones and selected worn crests", "roughness": 0.68, "strength": 0.32, "evidenceRefs": ["quest-forge-goal"]}], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "charcoal-indigo satin metal with vertical panel seams; albedo, roughness, height/normal and AO remain independent channels.", "clearcoat": {"base": 0.75, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "emissive": "#03030A", "emissiveIntensity": 0.03, "referenceMaterialId": "coating.painted-metal", "materialFamily": "coating", "materialSubtype": "paint-over-metal", "materialFinish": "gloss-or-satin", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "coating.painted-metal", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-1", "adobe.pbr-guide-2"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap", "metalnessMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/05-charcoal-vault-panel.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.794, "estimatedFidelity": 0.794, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-05-charcoal-vault-panel/vault-charcoal_albedo.png", "url": "vault-charcoal_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-05-charcoal-vault-panel/vault-charcoal_roughness.png", "url": "vault-charcoal_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-05-charcoal-vault-panel/vault-charcoal_height.png", "url": "vault-charcoal_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-05-charcoal-vault-panel/vault-charcoal_normal.png", "url": "vault-charcoal_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-05-charcoal-vault-panel/vault-charcoal_ao.png", "url": "vault-charcoal_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 112, "sourceHeight": 112, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 112, "height": 112}, "mask": {"backgroundColor": "#1B161C", "backgroundNoise": 17.72, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9532}, "mapStats": {"valueRange": 0.3407, "heightP90Gradient": 0.17608, "roughnessBase": 0.77, "roughnessVariation": 0.191, "normalStrength": 0.363, "blurRadius": 10}, "palette": ["#1C171A", "#322726", "#080607", "#614651", "#C3A68B"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#352535", "#251D2D", "#271E1A", "#1E1719", "#231C19"], "paletteHueRisk": [{"stop": "#251D2D", "hueRisk": "blue-collapse", "suggestedRgb": [45, 29, 37]}], "gradientAxis": "horizontal", "stats": {"meanLum": 32.5, "meanSaturation": 0.37, "gradientStrength": 0.13, "mottle": 0.073, "streakRatio": 1.45, "hueSpread": 0.511, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "not-now-vault", "regionId": "charcoal-vault-panel", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/05-charcoal-vault-panel.png", "bbox": {"x": 650, "y": 555, "width": 112, "height": 112}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.008}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "not-now-vault", "regionId": "charcoal-vault-panel", "materialId": "coating.painted-metal", "family": null, "subtype": null, "finish": null, "aliases": [], "confidence": 0.794, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["flame-amber"] = createSculptMaterial(
    "flame-amber",
    {"id": "flame-amber", "name": "flame amber", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#FF8A18", "color": "#FF8A18", "albedo": {"dominant": "#FF8A18", "secondary": ["#FF8A18", "#090A13"], "samplingNotes": "Reference-guided base values separated from baked key/rim lighting."}, "colorVariation": {"palette": ["#FF8A18", "#090A13", "#C58A3A"], "pattern": "opaque stylized ember solid with hot core and cooler outer lobes; deterministic object-space variation", "amplitude": 0.1, "heightCorrelation": 0.24}, "textureResolution": 1024, "textureProjection": {"mode": "object-space", "repeat": [4, 4], "anisotropy": 8, "texelDensityIntent": "Stable page-scale detail without stretching across relief parts."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 1.4, "amplitude": 0.12, "role": "broad patina/value variation"}, {"id": "meso", "frequency": 14, "amplitude": 0.075, "role": "opaque stylized ember solid with hot core and cooler outer lobes"}, {"id": "micro", "frequency": 72, "amplitude": 0.024, "role": "grazing-highlight breakup"}], "roughness": {"base": 0.26, "variation": 0.12, "map": "independent-procedural-roughness", "localResponse": "rougher cavities and fracture faces, smoother worn crests"}, "metalness": {"base": 0.0, "variation": 0}, "normal": {"pattern": "opaque stylized ember solid with hot core and cooler outer lobes independent normal", "strength": 0.1, "scale": 54, "space": "tangent"}, "bump": {"pattern": "opaque stylized ember solid with hot core and cooler outer lobes independent height", "amplitude": 0.025, "scale": 48}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.38, "contactShadowBias": 0.44, "notes": "Concentrated beneath ring rails, bezels, cage ribs, hinges, frame and crest socket."}, "wear": {"edgeWear": 0.04, "scratches": ["short restrained directional marks"], "chips": []}, "dirt": {"amount": 0.03, "cavityBias": 0.72, "color": "#09070A"}, "localOverrides": [{"id": "flame-amber-cavity-patina", "region": "recesses, seams, contact zones and selected worn crests", "roughness": 0.36, "strength": 0.32, "evidenceRefs": ["quest-forge-goal"]}], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "opaque stylized ember solid with hot core and cooler outer lobes; albedo, roughness, height/normal and AO remain independent channels.", "clearcoat": {"base": 0.7, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "emissive": "#FF5A0A", "emissiveIntensity": 1.9, "referenceMaterialId": "ceramic.glazed", "materialFamily": "ceramic", "materialSubtype": "glazed", "materialFinish": "glossy", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "ceramic.glazed", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "adobe.pbr-guide-1", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/06-amber-emissive-solid.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-06-amber-emissive-solid/flame-amber_albedo.png", "url": "flame-amber_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-06-amber-emissive-solid/flame-amber_roughness.png", "url": "flame-amber_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-06-amber-emissive-solid/flame-amber_height.png", "url": "flame-amber_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-06-amber-emissive-solid/flame-amber_normal.png", "url": "flame-amber_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/pbr-06-amber-emissive-solid/flame-amber_ao.png", "url": "flame-amber_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 116, "sourceHeight": 114, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 116, "height": 114}, "mask": {"backgroundColor": "#20160A", "backgroundNoise": 26.87, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9958}, "mapStats": {"valueRange": 0.8062, "heightP90Gradient": 0.09942, "roughnessBase": 0.729, "roughnessVariation": 0.18, "normalStrength": 0.273, "blurRadius": 10}, "palette": ["#140A02", "#371A06", "#C6701F", "#F3B84F", "#713A11"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#8B531F", "#AD6F26", "#582C0A", "#1F0F02", "#2A1908"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 75.7, "meanSaturation": 0.828, "gradientStrength": 0.462, "mottle": 0.076, "streakRatio": 1.09, "hueSpread": 0.01, "specularFraction": 0.002}}, "materialEvidence": {"componentId": "protected-flame", "regionId": "amber-emissive-solid", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/06-amber-emissive-solid.png", "bbox": {"x": 472, "y": 630, "width": 116, "height": 114}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0084}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "protected-flame", "regionId": "amber-emissive-solid", "materialId": "ceramic.glazed", "family": null, "subtype": null, "finish": null, "aliases": [], "confidence": 0.829, "source": "vision"}, "alternatives": []}},
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
  node_root_0.name = "Quest Forge relief root__pivot";
  node_root_0.scale.set(1, 1, 1);
  if (endpoint_root_0) {
    node_root_0.position.copy(endpoint_root_0.start);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_root_0.position.set(0.0, 0.0, 0.0);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  }
  node_root_0.userData.sculptComponent = {"id": "root", "name": "Quest Forge relief root", "level": "macro", "role": "root", "importance": 1, "confidence": 1, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": null, "attachment": null, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "root-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "indigo-field", "materialLayers": ["indigo-field"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "page-bound-relief", "placement": "Observed feature on Quest Forge relief root", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "indigo-field-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(17, 19, 38, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(17, 19, 38, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_root_0.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "root-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["root"] ?? root).add(node_root_0);
  nodes["root"] = node_root_0;
  const mesh_root_0Geometry = endpoint_root_0
    ? new THREE.CylinderGeometry(endpoint_root_0.endRadius, endpoint_root_0.baseRadius, endpoint_root_0.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_root_0) {
    mesh_root_0Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_root_0 = new THREE.Mesh(
    mesh_root_0Geometry,
    materialMap["indigo-field"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_root_0.name = "Quest Forge relief root";
  if (endpoint_root_0) {
    mesh_root_0.position.copy(endpoint_root_0.midpoint);
    mesh_root_0.quaternion.copy(endpoint_root_0.quaternion);
  }
  mesh_root_0.castShadow = options.castShadow ?? true;
  mesh_root_0.receiveShadow = options.receiveShadow ?? true;
  mesh_root_0.userData.sculptComponent = {"id": "root", "name": "Quest Forge relief root", "level": "macro", "role": "root", "importance": 1, "confidence": 1, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": null, "attachment": null, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "root-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "indigo-field", "materialLayers": ["indigo-field"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "page-bound-relief", "placement": "Observed feature on Quest Forge relief root", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "indigo-field-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(17, 19, 38, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(17, 19, 38, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_root_0.add(mesh_root_0);
  meshes["root"] = mesh_root_0;
  colliders["root"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_root_0);
  const socket_root_root_socket_0 = new THREE.Object3D();
  socket_root_root_socket_0.name = "root-socket";
  socket_root_root_socket_0.position.set(0.0, 0.0, 0.0);
  socket_root_root_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_root_root_socket_0.userData.socket = {"id": "root-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_root_0.add(socket_root_root_socket_0);
  sockets["root:root-socket"] = socket_root_root_socket_0;

  const attachment_contact_frame_1 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_contact_frame_1 = makeAttachmentEndpoint(attachment_contact_frame_1);
  const node_contact_frame_1 = new THREE.Group();
  node_contact_frame_1.name = "Contact plate and double gilt frame__pivot";
  node_contact_frame_1.scale.set(1, 1, 1);
  if (endpoint_contact_frame_1) {
    node_contact_frame_1.position.copy(endpoint_contact_frame_1.start);
    node_contact_frame_1.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_contact_frame_1.position.set(0.0, 0.0, 0.0);
    node_contact_frame_1.rotation.set(0.0, 0.0, 0.0);
  }
  node_contact_frame_1.userData.sculptComponent = {"id": "contact-frame", "name": "Contact plate and double gilt frame", "level": "macro", "role": "static-frame", "importance": 1, "confidence": 0.94, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-frame", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "contact-frame-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "double-bevel", "placement": "Observed feature on Contact plate and double gilt frame", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}, {"id": "corner-fasteners", "placement": "Observed feature on Contact plate and double gilt frame", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_contact_frame_1.userData.actionProfile = {"animationRole": "static-frame", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "contact-frame-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["root"] ?? root).add(node_contact_frame_1);
  nodes["contact-frame"] = node_contact_frame_1;
  const mesh_contact_frame_1Geometry = endpoint_contact_frame_1
    ? new THREE.CylinderGeometry(endpoint_contact_frame_1.endRadius, endpoint_contact_frame_1.baseRadius, endpoint_contact_frame_1.length, 16, 6)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_contact_frame_1) {
    mesh_contact_frame_1Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_contact_frame_1 = new THREE.Mesh(
    mesh_contact_frame_1Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_contact_frame_1.name = "Contact plate and double gilt frame";
  if (endpoint_contact_frame_1) {
    mesh_contact_frame_1.position.copy(endpoint_contact_frame_1.midpoint);
    mesh_contact_frame_1.quaternion.copy(endpoint_contact_frame_1.quaternion);
  }
  mesh_contact_frame_1.castShadow = options.castShadow ?? true;
  mesh_contact_frame_1.receiveShadow = options.receiveShadow ?? true;
  mesh_contact_frame_1.userData.sculptComponent = {"id": "contact-frame", "name": "Contact plate and double gilt frame", "level": "macro", "role": "static-frame", "importance": 1, "confidence": 0.94, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-frame", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "contact-frame-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "double-bevel", "placement": "Observed feature on Contact plate and double gilt frame", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}, {"id": "corner-fasteners", "placement": "Observed feature on Contact plate and double gilt frame", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_contact_frame_1.add(mesh_contact_frame_1);
  meshes["contact-frame"] = mesh_contact_frame_1;
  colliders["contact-frame"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_contact_frame_1);
  const socket_contact_frame_contact_frame_socket_0 = new THREE.Object3D();
  socket_contact_frame_contact_frame_socket_0.name = "contact-frame-socket";
  socket_contact_frame_contact_frame_socket_0.position.set(0.0, 0.0, 0.0);
  socket_contact_frame_contact_frame_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_contact_frame_contact_frame_socket_0.userData.socket = {"id": "contact-frame-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_contact_frame_1.add(socket_contact_frame_contact_frame_socket_0);
  sockets["contact-frame:contact-frame-socket"] = socket_contact_frame_contact_frame_socket_0;

  const attachment_maintenance_system_2 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_maintenance_system_2 = makeAttachmentEndpoint(attachment_maintenance_system_2);
  const node_maintenance_system_2 = new THREE.Group();
  node_maintenance_system_2.name = "Maintenance ring and review system__pivot";
  node_maintenance_system_2.scale.set(1, 1, 1);
  if (endpoint_maintenance_system_2) {
    node_maintenance_system_2.position.copy(endpoint_maintenance_system_2.start);
    node_maintenance_system_2.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_maintenance_system_2.position.set(0.0, 0.0, 0.0);
    node_maintenance_system_2.rotation.set(0.0, 0.0, 0.0);
  }
  node_maintenance_system_2.userData.sculptComponent = {"id": "maintenance-system", "name": "Maintenance ring and review system", "level": "macro", "role": "maintenance-state-owner", "importance": 1, "confidence": 0.94, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "maintenance-state-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "maintenance-system-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "complete-ring-hierarchy", "placement": "Observed feature on Maintenance ring and review system", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_maintenance_system_2.userData.actionProfile = {"animationRole": "maintenance-state-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "maintenance-system-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["root"] ?? root).add(node_maintenance_system_2);
  nodes["maintenance-system"] = node_maintenance_system_2;
  const mesh_maintenance_system_2Geometry = endpoint_maintenance_system_2
    ? new THREE.CylinderGeometry(endpoint_maintenance_system_2.endRadius, endpoint_maintenance_system_2.baseRadius, endpoint_maintenance_system_2.length, 16, 6)
    : new THREE.TorusGeometry(0.45, 0.08, 12, 48);
  if (!endpoint_maintenance_system_2) {
    mesh_maintenance_system_2Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_maintenance_system_2 = new THREE.Mesh(
    mesh_maintenance_system_2Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_maintenance_system_2.name = "Maintenance ring and review system";
  if (endpoint_maintenance_system_2) {
    mesh_maintenance_system_2.position.copy(endpoint_maintenance_system_2.midpoint);
    mesh_maintenance_system_2.quaternion.copy(endpoint_maintenance_system_2.quaternion);
  }
  mesh_maintenance_system_2.castShadow = options.castShadow ?? true;
  mesh_maintenance_system_2.receiveShadow = options.receiveShadow ?? true;
  mesh_maintenance_system_2.userData.sculptComponent = {"id": "maintenance-system", "name": "Maintenance ring and review system", "level": "macro", "role": "maintenance-state-owner", "importance": 1, "confidence": 0.94, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "maintenance-state-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "maintenance-system-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "complete-ring-hierarchy", "placement": "Observed feature on Maintenance ring and review system", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_maintenance_system_2.add(mesh_maintenance_system_2);
  meshes["maintenance-system"] = mesh_maintenance_system_2;
  colliders["maintenance-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_maintenance_system_2);
  const socket_maintenance_system_maintenance_system_socket_0 = new THREE.Object3D();
  socket_maintenance_system_maintenance_system_socket_0.name = "maintenance-system-socket";
  socket_maintenance_system_maintenance_system_socket_0.position.set(0.0, 0.0, 0.0);
  socket_maintenance_system_maintenance_system_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_maintenance_system_maintenance_system_socket_0.userData.socket = {"id": "maintenance-system-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_maintenance_system_2.add(socket_maintenance_system_maintenance_system_socket_0);
  sockets["maintenance-system:maintenance-system-socket"] = socket_maintenance_system_maintenance_system_socket_0;

  const attachment_forge_spine_3 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_forge_spine_3 = makeAttachmentEndpoint(attachment_forge_spine_3);
  const node_forge_spine_3 = new THREE.Group();
  node_forge_spine_3.name = "Protected flame to milestone to crest spine__pivot";
  node_forge_spine_3.scale.set(1, 1, 1);
  if (endpoint_forge_spine_3) {
    node_forge_spine_3.position.copy(endpoint_forge_spine_3.start);
    node_forge_spine_3.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_forge_spine_3.position.set(0.0, 0.0, 0.0);
    node_forge_spine_3.rotation.set(0.0, 0.0, 0.0);
  }
  node_forge_spine_3.userData.sculptComponent = {"id": "forge-spine", "name": "Protected flame to milestone to crest spine", "level": "macro", "role": "forge-celebration-owner", "importance": 1, "confidence": 0.94, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "forge-celebration-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "forge-spine-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "vertical-forge-path", "placement": "Observed feature on Protected flame to milestone to crest spine", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_forge_spine_3.userData.actionProfile = {"animationRole": "forge-celebration-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "forge-spine-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["root"] ?? root).add(node_forge_spine_3);
  nodes["forge-spine"] = node_forge_spine_3;
  const mesh_forge_spine_3Geometry = endpoint_forge_spine_3
    ? new THREE.CylinderGeometry(endpoint_forge_spine_3.endRadius, endpoint_forge_spine_3.baseRadius, endpoint_forge_spine_3.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_forge_spine_3) {
    mesh_forge_spine_3Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_forge_spine_3 = new THREE.Mesh(
    mesh_forge_spine_3Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_forge_spine_3.name = "Protected flame to milestone to crest spine";
  if (endpoint_forge_spine_3) {
    mesh_forge_spine_3.position.copy(endpoint_forge_spine_3.midpoint);
    mesh_forge_spine_3.quaternion.copy(endpoint_forge_spine_3.quaternion);
  }
  mesh_forge_spine_3.castShadow = options.castShadow ?? true;
  mesh_forge_spine_3.receiveShadow = options.receiveShadow ?? true;
  mesh_forge_spine_3.userData.sculptComponent = {"id": "forge-spine", "name": "Protected flame to milestone to crest spine", "level": "macro", "role": "forge-celebration-owner", "importance": 1, "confidence": 0.94, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "forge-celebration-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "forge-spine-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "vertical-forge-path", "placement": "Observed feature on Protected flame to milestone to crest spine", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_forge_spine_3.add(mesh_forge_spine_3);
  meshes["forge-spine"] = mesh_forge_spine_3;
  colliders["forge-spine"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_forge_spine_3);
  const socket_forge_spine_forge_spine_socket_0 = new THREE.Object3D();
  socket_forge_spine_forge_spine_socket_0.name = "forge-spine-socket";
  socket_forge_spine_forge_spine_socket_0.position.set(0.0, 0.0, 0.0);
  socket_forge_spine_forge_spine_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_forge_spine_forge_spine_socket_0.userData.socket = {"id": "forge-spine-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_forge_spine_3.add(socket_forge_spine_forge_spine_socket_0);
  sockets["forge-spine:forge-spine-socket"] = socket_forge_spine_forge_spine_socket_0;

  const attachment_not_now_vault_system_4 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_not_now_vault_system_4 = makeAttachmentEndpoint(attachment_not_now_vault_system_4);
  const node_not_now_vault_system_4 = new THREE.Group();
  node_not_now_vault_system_4.name = "Released path and closed Not-Now vault__pivot";
  node_not_now_vault_system_4.scale.set(1, 1, 1);
  if (endpoint_not_now_vault_system_4) {
    node_not_now_vault_system_4.position.copy(endpoint_not_now_vault_system_4.start);
    node_not_now_vault_system_4.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_not_now_vault_system_4.position.set(0.0, 0.0, 0.0);
    node_not_now_vault_system_4.rotation.set(0.0, 0.0, 0.0);
  }
  node_not_now_vault_system_4.userData.sculptComponent = {"id": "not-now-vault-system", "name": "Released path and closed Not-Now vault", "level": "macro", "role": "release-state-owner", "importance": 1, "confidence": 0.94, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "release-state-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "not-now-vault-system-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "vault-charcoal", "materialLayers": ["vault-charcoal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "respectful-storage-hierarchy", "placement": "Observed feature on Released path and closed Not-Now vault", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "vault-charcoal-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 35, 56, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(36, 35, 56, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_not_now_vault_system_4.userData.actionProfile = {"animationRole": "release-state-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "not-now-vault-system-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["root"] ?? root).add(node_not_now_vault_system_4);
  nodes["not-now-vault-system"] = node_not_now_vault_system_4;
  const mesh_not_now_vault_system_4Geometry = endpoint_not_now_vault_system_4
    ? new THREE.CylinderGeometry(endpoint_not_now_vault_system_4.endRadius, endpoint_not_now_vault_system_4.baseRadius, endpoint_not_now_vault_system_4.length, 16, 6)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_not_now_vault_system_4) {
    mesh_not_now_vault_system_4Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_not_now_vault_system_4 = new THREE.Mesh(
    mesh_not_now_vault_system_4Geometry,
    materialMap["vault-charcoal"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_not_now_vault_system_4.name = "Released path and closed Not-Now vault";
  if (endpoint_not_now_vault_system_4) {
    mesh_not_now_vault_system_4.position.copy(endpoint_not_now_vault_system_4.midpoint);
    mesh_not_now_vault_system_4.quaternion.copy(endpoint_not_now_vault_system_4.quaternion);
  }
  mesh_not_now_vault_system_4.castShadow = options.castShadow ?? true;
  mesh_not_now_vault_system_4.receiveShadow = options.receiveShadow ?? true;
  mesh_not_now_vault_system_4.userData.sculptComponent = {"id": "not-now-vault-system", "name": "Released path and closed Not-Now vault", "level": "macro", "role": "release-state-owner", "importance": 1, "confidence": 0.94, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "release-state-owner", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "not-now-vault-system-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "vault-charcoal", "materialLayers": ["vault-charcoal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "respectful-storage-hierarchy", "placement": "Observed feature on Released path and closed Not-Now vault", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "vault-charcoal-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 35, 56, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(36, 35, 56, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_not_now_vault_system_4.add(mesh_not_now_vault_system_4);
  meshes["not-now-vault-system"] = mesh_not_now_vault_system_4;
  colliders["not-now-vault-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_not_now_vault_system_4);
  const socket_not_now_vault_system_not_now_vault_system_socket_0 = new THREE.Object3D();
  socket_not_now_vault_system_not_now_vault_system_socket_0.name = "not-now-vault-system-socket";
  socket_not_now_vault_system_not_now_vault_system_socket_0.position.set(0.0, 0.0, 0.0);
  socket_not_now_vault_system_not_now_vault_system_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_not_now_vault_system_not_now_vault_system_socket_0.userData.socket = {"id": "not-now-vault-system-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_not_now_vault_system_4.add(socket_not_now_vault_system_not_now_vault_system_socket_0);
  sockets["not-now-vault-system:not-now-vault-system-socket"] = socket_not_now_vault_system_not_now_vault_system_socket_0;

  const attachment_contact_field_5 = {"parentId": "contact-frame", "parentSocket": "contact-frame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_contact_field_5 = makeAttachmentEndpoint(attachment_contact_field_5);
  const node_contact_field_5 = new THREE.Group();
  node_contact_field_5.name = "Dark inset field behind the instrument__pivot";
  node_contact_field_5.scale.set(1, 1, 1);
  if (endpoint_contact_field_5) {
    node_contact_field_5.position.copy(endpoint_contact_field_5.start);
    node_contact_field_5.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_contact_field_5.position.set(0.0, 0.0, 0.0);
    node_contact_field_5.rotation.set(0.0, 0.0, 0.0);
  }
  node_contact_field_5.userData.sculptComponent = {"id": "contact-field", "name": "Dark inset field behind the instrument", "level": "meso", "role": "static-surface", "importance": 0.9, "confidence": 0.94, "primitive": "box", "topologyClass": "conforming-shell", "topologyRationale": "Thin field conforms to the page and frame footprint.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "contact-frame", "attachment": {"parentId": "contact-frame", "parentSocket": "contact-frame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-surface", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "contact-field-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "indigo-field", "materialLayers": ["indigo-field"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "field-grain", "placement": "Observed feature on Dark inset field behind the instrument", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "indigo-field-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(17, 19, 38, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(17, 19, 38, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "indigo-field"}, "materialRegions": [{"regionId": "indigo-field-grain", "materialId": "indigo-field", "profileId": "leather.matte", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/00-indigo-field-grain.png", "bbox": {"x": 205, "y": 560, "width": 150, "height": 125}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0119}}]};
  node_contact_field_5.userData.actionProfile = {"animationRole": "static-surface", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "contact-field-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["contact-frame"] ?? root).add(node_contact_field_5);
  nodes["contact-field"] = node_contact_field_5;
  const mesh_contact_field_5Geometry = endpoint_contact_field_5
    ? new THREE.CylinderGeometry(endpoint_contact_field_5.endRadius, endpoint_contact_field_5.baseRadius, endpoint_contact_field_5.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_contact_field_5) {
    mesh_contact_field_5Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_contact_field_5 = new THREE.Mesh(
    mesh_contact_field_5Geometry,
    materialMap["indigo-field"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_contact_field_5.name = "Dark inset field behind the instrument";
  if (endpoint_contact_field_5) {
    mesh_contact_field_5.position.copy(endpoint_contact_field_5.midpoint);
    mesh_contact_field_5.quaternion.copy(endpoint_contact_field_5.quaternion);
  }
  mesh_contact_field_5.castShadow = options.castShadow ?? true;
  mesh_contact_field_5.receiveShadow = options.receiveShadow ?? true;
  mesh_contact_field_5.userData.sculptComponent = {"id": "contact-field", "name": "Dark inset field behind the instrument", "level": "meso", "role": "static-surface", "importance": 0.9, "confidence": 0.94, "primitive": "box", "topologyClass": "conforming-shell", "topologyRationale": "Thin field conforms to the page and frame footprint.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "contact-frame", "attachment": {"parentId": "contact-frame", "parentSocket": "contact-frame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-surface", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "contact-field-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "indigo-field", "materialLayers": ["indigo-field"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "field-grain", "placement": "Observed feature on Dark inset field behind the instrument", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "indigo-field-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(17, 19, 38, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(17, 19, 38, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "indigo-field"}, "materialRegions": [{"regionId": "indigo-field-grain", "materialId": "indigo-field", "profileId": "leather.matte", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/00-indigo-field-grain.png", "bbox": {"x": 205, "y": 560, "width": 150, "height": 125}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0119}}]};
  node_contact_field_5.add(mesh_contact_field_5);
  meshes["contact-field"] = mesh_contact_field_5;
  colliders["contact-field"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_contact_field_5);
  const socket_contact_field_contact_field_socket_0 = new THREE.Object3D();
  socket_contact_field_contact_field_socket_0.name = "contact-field-socket";
  socket_contact_field_contact_field_socket_0.position.set(0.0, 0.0, 0.0);
  socket_contact_field_contact_field_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_contact_field_contact_field_socket_0.userData.socket = {"id": "contact-field-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_contact_field_5.add(socket_contact_field_contact_field_socket_0);
  sockets["contact-field:contact-field-socket"] = socket_contact_field_contact_field_socket_0;

  const attachment_maintenance_ring_6 = {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_maintenance_ring_6 = makeAttachmentEndpoint(attachment_maintenance_ring_6);
  const node_maintenance_ring_6 = new THREE.Group();
  node_maintenance_ring_6.name = "Double circular maintenance rail__pivot";
  node_maintenance_ring_6.scale.set(1, 1, 1);
  if (endpoint_maintenance_ring_6) {
    node_maintenance_ring_6.position.copy(endpoint_maintenance_ring_6.start);
    node_maintenance_ring_6.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_maintenance_ring_6.position.set(0.0, 0.0, 0.0);
    node_maintenance_ring_6.rotation.set(0.0, 0.0, 0.0);
  }
  node_maintenance_ring_6.userData.sculptComponent = {"id": "maintenance-ring", "name": "Double circular maintenance rail", "level": "meso", "role": "ring-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-system", "attachment": {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "ring-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "maintenance-ring-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "radial-engravings", "placement": "Observed feature on Double circular maintenance rail", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}, {"id": "socket-rivets", "placement": "Observed feature on Double circular maintenance rail", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "aged-brass"}, "materialRegions": [{"regionId": "aged-brass-ring", "materialId": "aged-brass", "profileId": "metal.brass", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/01-aged-brass-ring.png", "bbox": {"x": 294, "y": 104, "width": 250, "height": 52}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0083}}]};
  node_maintenance_ring_6.userData.actionProfile = {"animationRole": "ring-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "maintenance-ring-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["maintenance-system"] ?? root).add(node_maintenance_ring_6);
  nodes["maintenance-ring"] = node_maintenance_ring_6;
  const mesh_maintenance_ring_6Geometry = endpoint_maintenance_ring_6
    ? new THREE.CylinderGeometry(endpoint_maintenance_ring_6.endRadius, endpoint_maintenance_ring_6.baseRadius, endpoint_maintenance_ring_6.length, 16, 6)
    : new THREE.TorusGeometry(0.45, 0.08, 12, 48);
  if (!endpoint_maintenance_ring_6) {
    mesh_maintenance_ring_6Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_maintenance_ring_6 = new THREE.Mesh(
    mesh_maintenance_ring_6Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_maintenance_ring_6.name = "Double circular maintenance rail";
  if (endpoint_maintenance_ring_6) {
    mesh_maintenance_ring_6.position.copy(endpoint_maintenance_ring_6.midpoint);
    mesh_maintenance_ring_6.quaternion.copy(endpoint_maintenance_ring_6.quaternion);
  }
  mesh_maintenance_ring_6.castShadow = options.castShadow ?? true;
  mesh_maintenance_ring_6.receiveShadow = options.receiveShadow ?? true;
  mesh_maintenance_ring_6.userData.sculptComponent = {"id": "maintenance-ring", "name": "Double circular maintenance rail", "level": "meso", "role": "ring-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-system", "attachment": {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "ring-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "maintenance-ring-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "radial-engravings", "placement": "Observed feature on Double circular maintenance rail", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}, {"id": "socket-rivets", "placement": "Observed feature on Double circular maintenance rail", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "aged-brass"}, "materialRegions": [{"regionId": "aged-brass-ring", "materialId": "aged-brass", "profileId": "metal.brass", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/01-aged-brass-ring.png", "bbox": {"x": 294, "y": 104, "width": 250, "height": 52}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0083}}]};
  node_maintenance_ring_6.add(mesh_maintenance_ring_6);
  meshes["maintenance-ring"] = mesh_maintenance_ring_6;
  colliders["maintenance-ring"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_maintenance_ring_6);
  const socket_maintenance_ring_maintenance_ring_socket_0 = new THREE.Object3D();
  socket_maintenance_ring_maintenance_ring_socket_0.name = "maintenance-ring-socket";
  socket_maintenance_ring_maintenance_ring_socket_0.position.set(0.0, 0.0, 0.0);
  socket_maintenance_ring_maintenance_ring_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_maintenance_ring_maintenance_ring_socket_0.userData.socket = {"id": "maintenance-ring-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_maintenance_ring_6.add(socket_maintenance_ring_maintenance_ring_socket_0);
  sockets["maintenance-ring:maintenance-ring-socket"] = socket_maintenance_ring_maintenance_ring_socket_0;

  const attachment_review_socket_7 = {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_review_socket_7 = makeAttachmentEndpoint(attachment_review_socket_7);
  const node_review_socket_7 = new THREE.Group();
  node_review_socket_7.name = "Upper review clock socket__pivot";
  node_review_socket_7.scale.set(1, 1, 1);
  if (endpoint_review_socket_7) {
    node_review_socket_7.position.copy(endpoint_review_socket_7.start);
    node_review_socket_7.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_review_socket_7.position.set(0.0, 0.0, 0.0);
    node_review_socket_7.rotation.set(0.0, 0.0, 0.0);
  }
  node_review_socket_7.userData.sculptComponent = {"id": "review-socket", "name": "Upper review clock socket", "level": "meso", "role": "review-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-system", "attachment": {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "review-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "review-socket-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "clock-markers", "placement": "Observed feature on Upper review clock socket", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_review_socket_7.userData.actionProfile = {"animationRole": "review-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "review-socket-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["maintenance-system"] ?? root).add(node_review_socket_7);
  nodes["review-socket"] = node_review_socket_7;
  const mesh_review_socket_7Geometry = endpoint_review_socket_7
    ? new THREE.CylinderGeometry(endpoint_review_socket_7.endRadius, endpoint_review_socket_7.baseRadius, endpoint_review_socket_7.length, 16, 6)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_review_socket_7) {
    mesh_review_socket_7Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_review_socket_7 = new THREE.Mesh(
    mesh_review_socket_7Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_review_socket_7.name = "Upper review clock socket";
  if (endpoint_review_socket_7) {
    mesh_review_socket_7.position.copy(endpoint_review_socket_7.midpoint);
    mesh_review_socket_7.quaternion.copy(endpoint_review_socket_7.quaternion);
  }
  mesh_review_socket_7.castShadow = options.castShadow ?? true;
  mesh_review_socket_7.receiveShadow = options.receiveShadow ?? true;
  mesh_review_socket_7.userData.sculptComponent = {"id": "review-socket", "name": "Upper review clock socket", "level": "meso", "role": "review-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-system", "attachment": {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "review-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "review-socket-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "clock-markers", "placement": "Observed feature on Upper review clock socket", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_review_socket_7.add(mesh_review_socket_7);
  meshes["review-socket"] = mesh_review_socket_7;
  colliders["review-socket"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_review_socket_7);
  const socket_review_socket_review_socket_socket_0 = new THREE.Object3D();
  socket_review_socket_review_socket_socket_0.name = "review-socket-socket";
  socket_review_socket_review_socket_socket_0.position.set(0.0, 0.0, 0.0);
  socket_review_socket_review_socket_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_review_socket_review_socket_socket_0.userData.socket = {"id": "review-socket-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_review_socket_7.add(socket_review_socket_review_socket_socket_0);
  sockets["review-socket:review-socket-socket"] = socket_review_socket_review_socket_socket_0;

  const attachment_quest_crest_8 = {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_quest_crest_8 = makeAttachmentEndpoint(attachment_quest_crest_8);
  const node_quest_crest_8 = new THREE.Group();
  node_quest_crest_8.name = "Faceted violet Quest Crest__pivot";
  node_quest_crest_8.scale.set(1, 1, 1);
  if (endpoint_quest_crest_8) {
    node_quest_crest_8.position.copy(endpoint_quest_crest_8.start);
    node_quest_crest_8.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_quest_crest_8.position.set(0.0, 0.0, 0.0);
    node_quest_crest_8.rotation.set(0.0, 0.0, 0.0);
  }
  node_quest_crest_8.userData.sculptComponent = {"id": "quest-crest", "name": "Faceted violet Quest Crest", "level": "meso", "role": "crest-lift", "importance": 0.9, "confidence": 0.94, "primitive": "extrude", "topologyClass": "continuous-sculpt", "topologyRationale": "Visible faceted/curved mass requires a closed varying profile rather than stacked cards.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "forge-spine", "attachment": {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "crest-lift", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "quest-crest-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "violet-crystal", "materialLayers": ["violet-crystal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "facet-ridges", "placement": "Observed feature on Faceted violet Quest Crest", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}, {"id": "accepted-cost-notch", "placement": "Observed feature on Faceted violet Quest Crest", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "violet-crystal-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 53, 181, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(111, 53, 181, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "violet-crystal"}, "materialRegions": [{"regionId": "violet-crystal-facet", "materialId": "violet-crystal", "profileId": "gemstone.quartz", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/02-violet-crystal-facet.png", "bbox": {"x": 447, "y": 175, "width": 126, "height": 94}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0075}}]};
  node_quest_crest_8.userData.actionProfile = {"animationRole": "crest-lift", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "quest-crest-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["forge-spine"] ?? root).add(node_quest_crest_8);
  nodes["quest-crest"] = node_quest_crest_8;
  const mesh_quest_crest_8Geometry = endpoint_quest_crest_8
    ? new THREE.CylinderGeometry(endpoint_quest_crest_8.endRadius, endpoint_quest_crest_8.baseRadius, endpoint_quest_crest_8.length, 16, 6)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_quest_crest_8) {
    mesh_quest_crest_8Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_quest_crest_8 = new THREE.Mesh(
    mesh_quest_crest_8Geometry,
    materialMap["violet-crystal"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_quest_crest_8.name = "Faceted violet Quest Crest";
  if (endpoint_quest_crest_8) {
    mesh_quest_crest_8.position.copy(endpoint_quest_crest_8.midpoint);
    mesh_quest_crest_8.quaternion.copy(endpoint_quest_crest_8.quaternion);
  }
  mesh_quest_crest_8.castShadow = options.castShadow ?? true;
  mesh_quest_crest_8.receiveShadow = options.receiveShadow ?? true;
  mesh_quest_crest_8.userData.sculptComponent = {"id": "quest-crest", "name": "Faceted violet Quest Crest", "level": "meso", "role": "crest-lift", "importance": 0.9, "confidence": 0.94, "primitive": "extrude", "topologyClass": "continuous-sculpt", "topologyRationale": "Visible faceted/curved mass requires a closed varying profile rather than stacked cards.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "forge-spine", "attachment": {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "crest-lift", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "quest-crest-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "violet-crystal", "materialLayers": ["violet-crystal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "facet-ridges", "placement": "Observed feature on Faceted violet Quest Crest", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}, {"id": "accepted-cost-notch", "placement": "Observed feature on Faceted violet Quest Crest", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "violet-crystal-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 53, 181, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(111, 53, 181, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "violet-crystal"}, "materialRegions": [{"regionId": "violet-crystal-facet", "materialId": "violet-crystal", "profileId": "gemstone.quartz", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/02-violet-crystal-facet.png", "bbox": {"x": 447, "y": 175, "width": 126, "height": 94}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0075}}]};
  node_quest_crest_8.add(mesh_quest_crest_8);
  meshes["quest-crest"] = mesh_quest_crest_8;
  colliders["quest-crest"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_quest_crest_8);
  const socket_quest_crest_quest_crest_socket_0 = new THREE.Object3D();
  socket_quest_crest_quest_crest_socket_0.name = "quest-crest-socket";
  socket_quest_crest_quest_crest_socket_0.position.set(0.0, 0.0, 0.0);
  socket_quest_crest_quest_crest_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_quest_crest_quest_crest_socket_0.userData.socket = {"id": "quest-crest-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_quest_crest_8.add(socket_quest_crest_quest_crest_socket_0);
  sockets["quest-crest:quest-crest-socket"] = socket_quest_crest_quest_crest_socket_0;

  const attachment_primary_token_9 = {"parentId": "quest-crest", "parentSocket": "quest-crest-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_primary_token_9 = makeAttachmentEndpoint(attachment_primary_token_9);
  const node_primary_token_9 = new THREE.Group();
  node_primary_token_9.name = "Embedded primary quest diamond__pivot";
  node_primary_token_9.scale.set(1, 1, 1);
  if (endpoint_primary_token_9) {
    node_primary_token_9.position.copy(endpoint_primary_token_9.start);
    node_primary_token_9.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_primary_token_9.position.set(0.0, 0.0, 0.0);
    node_primary_token_9.rotation.set(0.0, 0.0, 0.0);
  }
  node_primary_token_9.userData.sculptComponent = {"id": "primary-token", "name": "Embedded primary quest diamond", "level": "meso", "role": "primary-token-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "quest-crest", "attachment": {"parentId": "quest-crest", "parentSocket": "quest-crest-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "primary-token-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "primary-token-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "gold-primary", "materialLayers": ["gold-primary"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "pronged-bezel", "placement": "Observed feature on Embedded primary quest diamond", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "gold-primary-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(214, 161, 59, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(214, 161, 59, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "gold-primary"}, "materialRegions": [{"regionId": "polished-gold-primary", "materialId": "gold-primary", "profileId": "metal.gold", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/03-polished-gold-primary.png", "bbox": {"x": 530, "y": 233, "width": 75, "height": 92}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0044}}]};
  node_primary_token_9.userData.actionProfile = {"animationRole": "primary-token-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "primary-token-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["quest-crest"] ?? root).add(node_primary_token_9);
  nodes["primary-token"] = node_primary_token_9;
  const mesh_primary_token_9Geometry = endpoint_primary_token_9
    ? new THREE.CylinderGeometry(endpoint_primary_token_9.endRadius, endpoint_primary_token_9.baseRadius, endpoint_primary_token_9.length, 16, 6)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_primary_token_9) {
    mesh_primary_token_9Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_primary_token_9 = new THREE.Mesh(
    mesh_primary_token_9Geometry,
    materialMap["gold-primary"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_primary_token_9.name = "Embedded primary quest diamond";
  if (endpoint_primary_token_9) {
    mesh_primary_token_9.position.copy(endpoint_primary_token_9.midpoint);
    mesh_primary_token_9.quaternion.copy(endpoint_primary_token_9.quaternion);
  }
  mesh_primary_token_9.castShadow = options.castShadow ?? true;
  mesh_primary_token_9.receiveShadow = options.receiveShadow ?? true;
  mesh_primary_token_9.userData.sculptComponent = {"id": "primary-token", "name": "Embedded primary quest diamond", "level": "meso", "role": "primary-token-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "quest-crest", "attachment": {"parentId": "quest-crest", "parentSocket": "quest-crest-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "primary-token-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "primary-token-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "gold-primary", "materialLayers": ["gold-primary"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "pronged-bezel", "placement": "Observed feature on Embedded primary quest diamond", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "gold-primary-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(214, 161, 59, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(214, 161, 59, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "gold-primary"}, "materialRegions": [{"regionId": "polished-gold-primary", "materialId": "gold-primary", "profileId": "metal.gold", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/03-polished-gold-primary.png", "bbox": {"x": 530, "y": 233, "width": 75, "height": 92}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0044}}]};
  node_primary_token_9.add(mesh_primary_token_9);
  meshes["primary-token"] = mesh_primary_token_9;
  colliders["primary-token"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_primary_token_9);
  const socket_primary_token_primary_token_socket_0 = new THREE.Object3D();
  socket_primary_token_primary_token_socket_0.name = "primary-token-socket";
  socket_primary_token_primary_token_socket_0.position.set(0.0, 0.0, 0.0);
  socket_primary_token_primary_token_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_primary_token_primary_token_socket_0.userData.socket = {"id": "primary-token-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_primary_token_9.add(socket_primary_token_primary_token_socket_0);
  sockets["primary-token:primary-token-socket"] = socket_primary_token_primary_token_socket_0;

  const attachment_milestone_anvil_10 = {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_milestone_anvil_10 = makeAttachmentEndpoint(attachment_milestone_anvil_10);
  const node_milestone_anvil_10 = new THREE.Group();
  node_milestone_anvil_10.name = "First Milestone anvil plate__pivot";
  node_milestone_anvil_10.scale.set(1, 1, 1);
  if (endpoint_milestone_anvil_10) {
    node_milestone_anvil_10.position.copy(endpoint_milestone_anvil_10.start);
    node_milestone_anvil_10.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_milestone_anvil_10.position.set(0.0, 0.0, 0.0);
    node_milestone_anvil_10.rotation.set(0.0, 0.0, 0.0);
  }
  node_milestone_anvil_10.userData.sculptComponent = {"id": "milestone-anvil", "name": "First Milestone anvil plate", "level": "meso", "role": "milestone-strike", "importance": 0.9, "confidence": 0.94, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "forge-spine", "attachment": {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "milestone-strike", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "milestone-anvil-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "stepped-bevels", "placement": "Observed feature on First Milestone anvil plate", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_milestone_anvil_10.userData.actionProfile = {"animationRole": "milestone-strike", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "milestone-anvil-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["forge-spine"] ?? root).add(node_milestone_anvil_10);
  nodes["milestone-anvil"] = node_milestone_anvil_10;
  const mesh_milestone_anvil_10Geometry = endpoint_milestone_anvil_10
    ? new THREE.CylinderGeometry(endpoint_milestone_anvil_10.endRadius, endpoint_milestone_anvil_10.baseRadius, endpoint_milestone_anvil_10.length, 16, 6)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_milestone_anvil_10) {
    mesh_milestone_anvil_10Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_milestone_anvil_10 = new THREE.Mesh(
    mesh_milestone_anvil_10Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_milestone_anvil_10.name = "First Milestone anvil plate";
  if (endpoint_milestone_anvil_10) {
    mesh_milestone_anvil_10.position.copy(endpoint_milestone_anvil_10.midpoint);
    mesh_milestone_anvil_10.quaternion.copy(endpoint_milestone_anvil_10.quaternion);
  }
  mesh_milestone_anvil_10.castShadow = options.castShadow ?? true;
  mesh_milestone_anvil_10.receiveShadow = options.receiveShadow ?? true;
  mesh_milestone_anvil_10.userData.sculptComponent = {"id": "milestone-anvil", "name": "First Milestone anvil plate", "level": "meso", "role": "milestone-strike", "importance": 0.9, "confidence": 0.94, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "forge-spine", "attachment": {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "milestone-strike", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "milestone-anvil-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "stepped-bevels", "placement": "Observed feature on First Milestone anvil plate", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_milestone_anvil_10.add(mesh_milestone_anvil_10);
  meshes["milestone-anvil"] = mesh_milestone_anvil_10;
  colliders["milestone-anvil"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_milestone_anvil_10);
  const socket_milestone_anvil_milestone_anvil_socket_0 = new THREE.Object3D();
  socket_milestone_anvil_milestone_anvil_socket_0.name = "milestone-anvil-socket";
  socket_milestone_anvil_milestone_anvil_socket_0.position.set(0.0, 0.0, 0.0);
  socket_milestone_anvil_milestone_anvil_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_milestone_anvil_milestone_anvil_socket_0.userData.socket = {"id": "milestone-anvil-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_milestone_anvil_10.add(socket_milestone_anvil_milestone_anvil_socket_0);
  sockets["milestone-anvil:milestone-anvil-socket"] = socket_milestone_anvil_milestone_anvil_socket_0;

  const attachment_protected_flame_11 = {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_protected_flame_11 = makeAttachmentEndpoint(attachment_protected_flame_11);
  const node_protected_flame_11 = new THREE.Group();
  node_protected_flame_11.name = "Protected amber flame solid__pivot";
  node_protected_flame_11.scale.set(1, 1, 1);
  if (endpoint_protected_flame_11) {
    node_protected_flame_11.position.copy(endpoint_protected_flame_11.start);
    node_protected_flame_11.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_protected_flame_11.position.set(0.0, 0.0, 0.0);
    node_protected_flame_11.rotation.set(0.0, 0.0, 0.0);
  }
  node_protected_flame_11.userData.sculptComponent = {"id": "protected-flame", "name": "Protected amber flame solid", "level": "meso", "role": "protected-flame-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "lathe", "topologyClass": "continuous-sculpt", "topologyRationale": "Visible faceted/curved mass requires a closed varying profile rather than stacked cards.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "forge-spine", "attachment": {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "protected-flame-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "protected-flame-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "flame-amber", "materialLayers": ["flame-amber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "cage-ribs", "placement": "Observed feature on Protected amber flame solid", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "flame-amber-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 138, 24, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 138, 24, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "flame-amber"}, "materialRegions": [{"regionId": "amber-emissive-solid", "materialId": "flame-amber", "profileId": "ceramic.glazed", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/06-amber-emissive-solid.png", "bbox": {"x": 472, "y": 630, "width": 116, "height": 114}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0084}}]};
  node_protected_flame_11.userData.actionProfile = {"animationRole": "protected-flame-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "protected-flame-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["forge-spine"] ?? root).add(node_protected_flame_11);
  nodes["protected-flame"] = node_protected_flame_11;
  const mesh_protected_flame_11Geometry = endpoint_protected_flame_11
    ? new THREE.CylinderGeometry(endpoint_protected_flame_11.endRadius, endpoint_protected_flame_11.baseRadius, endpoint_protected_flame_11.length, 16, 6)
    : buildLatheGeometry({"points": [[0.3, -0.5], [0.15, 0.0], [0.3, 0.5]], "segments": 24});
  if (!endpoint_protected_flame_11) {
    mesh_protected_flame_11Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_protected_flame_11 = new THREE.Mesh(
    mesh_protected_flame_11Geometry,
    materialMap["flame-amber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_protected_flame_11.name = "Protected amber flame solid";
  if (endpoint_protected_flame_11) {
    mesh_protected_flame_11.position.copy(endpoint_protected_flame_11.midpoint);
    mesh_protected_flame_11.quaternion.copy(endpoint_protected_flame_11.quaternion);
  }
  mesh_protected_flame_11.castShadow = options.castShadow ?? true;
  mesh_protected_flame_11.receiveShadow = options.receiveShadow ?? true;
  mesh_protected_flame_11.userData.sculptComponent = {"id": "protected-flame", "name": "Protected amber flame solid", "level": "meso", "role": "protected-flame-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "lathe", "topologyClass": "continuous-sculpt", "topologyRationale": "Visible faceted/curved mass requires a closed varying profile rather than stacked cards.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "forge-spine", "attachment": {"parentId": "forge-spine", "parentSocket": "forge-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "protected-flame-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "protected-flame-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "flame-amber", "materialLayers": ["flame-amber"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "cage-ribs", "placement": "Observed feature on Protected amber flame solid", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "flame-amber-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 138, 24, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 138, 24, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "flame-amber"}, "materialRegions": [{"regionId": "amber-emissive-solid", "materialId": "flame-amber", "profileId": "ceramic.glazed", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/06-amber-emissive-solid.png", "bbox": {"x": 472, "y": 630, "width": 116, "height": 114}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0084}}]};
  node_protected_flame_11.add(mesh_protected_flame_11);
  meshes["protected-flame"] = mesh_protected_flame_11;
  colliders["protected-flame"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_protected_flame_11);
  const socket_protected_flame_protected_flame_socket_0 = new THREE.Object3D();
  socket_protected_flame_protected_flame_socket_0.name = "protected-flame-socket";
  socket_protected_flame_protected_flame_socket_0.position.set(0.0, 0.0, 0.0);
  socket_protected_flame_protected_flame_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_protected_flame_protected_flame_socket_0.userData.socket = {"id": "protected-flame-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_protected_flame_11.add(socket_protected_flame_protected_flame_socket_0);
  sockets["protected-flame:protected-flame-socket"] = socket_protected_flame_protected_flame_socket_0;

  const attachment_supporting_token_12 = {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_supporting_token_12 = makeAttachmentEndpoint(attachment_supporting_token_12);
  const node_supporting_token_12 = new THREE.Group();
  node_supporting_token_12.name = "Single supporting teal token__pivot";
  node_supporting_token_12.scale.set(1, 1, 1);
  if (endpoint_supporting_token_12) {
    node_supporting_token_12.position.copy(endpoint_supporting_token_12.start);
    node_supporting_token_12.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_supporting_token_12.position.set(0.0, 0.0, 0.0);
    node_supporting_token_12.rotation.set(0.0, 0.0, 0.0);
  }
  node_supporting_token_12.userData.sculptComponent = {"id": "supporting-token", "name": "Single supporting teal token", "level": "meso", "role": "support-token-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-system", "attachment": {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "support-token-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "supporting-token-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "teal-enamel", "materialLayers": ["teal-enamel"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "double-bezel", "placement": "Observed feature on Single supporting teal token", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "teal-enamel-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 126, 130, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 126, 130, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "teal-enamel"}, "materialRegions": [{"regionId": "teal-support-enamel", "materialId": "teal-enamel", "profileId": "ceramic.glazed", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/04-teal-support-enamel.png", "bbox": {"x": 746, "y": 250, "width": 98, "height": 98}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0061}}]};
  node_supporting_token_12.userData.actionProfile = {"animationRole": "support-token-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "supporting-token-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["maintenance-system"] ?? root).add(node_supporting_token_12);
  nodes["supporting-token"] = node_supporting_token_12;
  const mesh_supporting_token_12Geometry = endpoint_supporting_token_12
    ? new THREE.CylinderGeometry(endpoint_supporting_token_12.endRadius, endpoint_supporting_token_12.baseRadius, endpoint_supporting_token_12.length, 16, 6)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_supporting_token_12) {
    mesh_supporting_token_12Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_supporting_token_12 = new THREE.Mesh(
    mesh_supporting_token_12Geometry,
    materialMap["teal-enamel"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_supporting_token_12.name = "Single supporting teal token";
  if (endpoint_supporting_token_12) {
    mesh_supporting_token_12.position.copy(endpoint_supporting_token_12.midpoint);
    mesh_supporting_token_12.quaternion.copy(endpoint_supporting_token_12.quaternion);
  }
  mesh_supporting_token_12.castShadow = options.castShadow ?? true;
  mesh_supporting_token_12.receiveShadow = options.receiveShadow ?? true;
  mesh_supporting_token_12.userData.sculptComponent = {"id": "supporting-token", "name": "Single supporting teal token", "level": "meso", "role": "support-token-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-system", "attachment": {"parentId": "maintenance-system", "parentSocket": "maintenance-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "support-token-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "supporting-token-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "teal-enamel", "materialLayers": ["teal-enamel"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "double-bezel", "placement": "Observed feature on Single supporting teal token", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "teal-enamel-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 126, 130, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 126, 130, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "teal-enamel"}, "materialRegions": [{"regionId": "teal-support-enamel", "materialId": "teal-enamel", "profileId": "ceramic.glazed", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/04-teal-support-enamel.png", "bbox": {"x": 746, "y": 250, "width": 98, "height": 98}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.0061}}]};
  node_supporting_token_12.add(mesh_supporting_token_12);
  meshes["supporting-token"] = mesh_supporting_token_12;
  colliders["supporting-token"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_supporting_token_12);
  const socket_supporting_token_supporting_token_socket_0 = new THREE.Object3D();
  socket_supporting_token_supporting_token_socket_0.name = "supporting-token-socket";
  socket_supporting_token_supporting_token_socket_0.position.set(0.0, 0.0, 0.0);
  socket_supporting_token_supporting_token_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_supporting_token_supporting_token_socket_0.userData.socket = {"id": "supporting-token-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_supporting_token_12.add(socket_supporting_token_supporting_token_socket_0);
  sockets["supporting-token:supporting-token-socket"] = socket_supporting_token_supporting_token_socket_0;

  const attachment_not_now_vault_13 = {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_not_now_vault_13 = makeAttachmentEndpoint(attachment_not_now_vault_13);
  const node_not_now_vault_13 = new THREE.Group();
  node_not_now_vault_13.name = "Closed circular Not-Now vault__pivot";
  node_not_now_vault_13.scale.set(1, 1, 1);
  if (endpoint_not_now_vault_13) {
    node_not_now_vault_13.position.copy(endpoint_not_now_vault_13.start);
    node_not_now_vault_13.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_not_now_vault_13.position.set(0.0, 0.0, 0.0);
    node_not_now_vault_13.rotation.set(0.0, 0.0, 0.0);
  }
  node_not_now_vault_13.userData.sculptComponent = {"id": "not-now-vault", "name": "Closed circular Not-Now vault", "level": "meso", "role": "vault-door-static", "importance": 0.9, "confidence": 0.94, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "not-now-vault-system", "attachment": {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "vault-door-static", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "not-now-vault-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "vault-charcoal", "materialLayers": ["vault-charcoal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "hinges-latch-seams", "placement": "Observed feature on Closed circular Not-Now vault", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "vault-charcoal-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 35, 56, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(36, 35, 56, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "vault-charcoal"}, "materialRegions": [{"regionId": "charcoal-vault-panel", "materialId": "vault-charcoal", "profileId": "coating.painted-metal", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/05-charcoal-vault-panel.png", "bbox": {"x": 650, "y": 555, "width": 112, "height": 112}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.008}}]};
  node_not_now_vault_13.userData.actionProfile = {"animationRole": "vault-door-static", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "not-now-vault-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["not-now-vault-system"] ?? root).add(node_not_now_vault_13);
  nodes["not-now-vault"] = node_not_now_vault_13;
  const mesh_not_now_vault_13Geometry = endpoint_not_now_vault_13
    ? new THREE.CylinderGeometry(endpoint_not_now_vault_13.endRadius, endpoint_not_now_vault_13.baseRadius, endpoint_not_now_vault_13.length, 16, 6)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 8);
  if (!endpoint_not_now_vault_13) {
    mesh_not_now_vault_13Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_not_now_vault_13 = new THREE.Mesh(
    mesh_not_now_vault_13Geometry,
    materialMap["vault-charcoal"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_not_now_vault_13.name = "Closed circular Not-Now vault";
  if (endpoint_not_now_vault_13) {
    mesh_not_now_vault_13.position.copy(endpoint_not_now_vault_13.midpoint);
    mesh_not_now_vault_13.quaternion.copy(endpoint_not_now_vault_13.quaternion);
  }
  mesh_not_now_vault_13.castShadow = options.castShadow ?? true;
  mesh_not_now_vault_13.receiveShadow = options.receiveShadow ?? true;
  mesh_not_now_vault_13.userData.sculptComponent = {"id": "not-now-vault", "name": "Closed circular Not-Now vault", "level": "meso", "role": "vault-door-static", "importance": 0.9, "confidence": 0.94, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "not-now-vault-system", "attachment": {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "vault-door-static", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "not-now-vault-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "vault-charcoal", "materialLayers": ["vault-charcoal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "hinges-latch-seams", "placement": "Observed feature on Closed circular Not-Now vault", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "vault-charcoal-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(36, 35, 56, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(36, 35, 56, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}, "uvContract": {"status": "unwrapped", "strategy": "generated procedural coordinates", "materialId": "vault-charcoal"}, "materialRegions": [{"regionId": "charcoal-vault-panel", "materialId": "vault-charcoal", "profileId": "coating.painted-metal", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/worktrees/compass-book-launch-3d-20260820/.img2threejs/compass-book-quest-forge/material-evidence/05-charcoal-vault-panel.png", "bbox": {"x": 650, "y": 555, "width": 112, "height": 112}, "sourceWidth": 1672, "sourceHeight": 941, "loaderWarnings": [], "coverage": 0.008}}]};
  node_not_now_vault_13.add(mesh_not_now_vault_13);
  meshes["not-now-vault"] = mesh_not_now_vault_13;
  colliders["not-now-vault"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_not_now_vault_13);
  const socket_not_now_vault_not_now_vault_socket_0 = new THREE.Object3D();
  socket_not_now_vault_not_now_vault_socket_0.name = "not-now-vault-socket";
  socket_not_now_vault_not_now_vault_socket_0.position.set(0.0, 0.0, 0.0);
  socket_not_now_vault_not_now_vault_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_not_now_vault_not_now_vault_socket_0.userData.socket = {"id": "not-now-vault-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_not_now_vault_13.add(socket_not_now_vault_not_now_vault_socket_0);
  sockets["not-now-vault:not-now-vault-socket"] = socket_not_now_vault_not_now_vault_socket_0;

  const attachment_released_fragment_14 = {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_released_fragment_14 = makeAttachmentEndpoint(attachment_released_fragment_14);
  const node_released_fragment_14 = new THREE.Group();
  node_released_fragment_14.name = "Single cooling released fragment__pivot";
  node_released_fragment_14.scale.set(1, 1, 1);
  if (endpoint_released_fragment_14) {
    node_released_fragment_14.position.copy(endpoint_released_fragment_14.start);
    node_released_fragment_14.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_released_fragment_14.position.set(0.0, 0.0, 0.0);
    node_released_fragment_14.rotation.set(0.0, 0.0, 0.0);
  }
  node_released_fragment_14.userData.sculptComponent = {"id": "released-fragment", "name": "Single cooling released fragment", "level": "meso", "role": "release-transfer", "importance": 0.9, "confidence": 0.94, "primitive": "extrude", "topologyClass": "continuous-sculpt", "topologyRationale": "Visible faceted/curved mass requires a closed varying profile rather than stacked cards.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "not-now-vault-system", "attachment": {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "release-transfer", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": true, "visibility": true, "materialState": false}, "sockets": [{"id": "released-fragment-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "violet-crystal", "materialLayers": ["violet-crystal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "cooling-facets", "placement": "Observed feature on Single cooling released fragment", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "violet-crystal-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 53, 181, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(111, 53, 181, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_released_fragment_14.userData.actionProfile = {"animationRole": "release-transfer", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": true, "visibility": true, "materialState": false}, "sockets": [{"id": "released-fragment-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["not-now-vault-system"] ?? root).add(node_released_fragment_14);
  nodes["released-fragment"] = node_released_fragment_14;
  const mesh_released_fragment_14Geometry = endpoint_released_fragment_14
    ? new THREE.CylinderGeometry(endpoint_released_fragment_14.endRadius, endpoint_released_fragment_14.baseRadius, endpoint_released_fragment_14.length, 16, 6)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_released_fragment_14) {
    mesh_released_fragment_14Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_released_fragment_14 = new THREE.Mesh(
    mesh_released_fragment_14Geometry,
    materialMap["violet-crystal"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_released_fragment_14.name = "Single cooling released fragment";
  if (endpoint_released_fragment_14) {
    mesh_released_fragment_14.position.copy(endpoint_released_fragment_14.midpoint);
    mesh_released_fragment_14.quaternion.copy(endpoint_released_fragment_14.quaternion);
  }
  mesh_released_fragment_14.castShadow = options.castShadow ?? true;
  mesh_released_fragment_14.receiveShadow = options.receiveShadow ?? true;
  mesh_released_fragment_14.userData.sculptComponent = {"id": "released-fragment", "name": "Single cooling released fragment", "level": "meso", "role": "release-transfer", "importance": 0.9, "confidence": 0.94, "primitive": "extrude", "topologyClass": "continuous-sculpt", "topologyRationale": "Visible faceted/curved mass requires a closed varying profile rather than stacked cards.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "not-now-vault-system", "attachment": {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "release-transfer", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": true, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": true, "visibility": true, "materialState": false}, "sockets": [{"id": "released-fragment-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "violet-crystal", "materialLayers": ["violet-crystal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "cooling-facets", "placement": "Observed feature on Single cooling released fragment", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "violet-crystal-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(111, 53, 181, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(111, 53, 181, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_released_fragment_14.add(mesh_released_fragment_14);
  meshes["released-fragment"] = mesh_released_fragment_14;
  colliders["released-fragment"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_released_fragment_14);
  const socket_released_fragment_released_fragment_socket_0 = new THREE.Object3D();
  socket_released_fragment_released_fragment_socket_0.name = "released-fragment-socket";
  socket_released_fragment_released_fragment_socket_0.position.set(0.0, 0.0, 0.0);
  socket_released_fragment_released_fragment_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_released_fragment_released_fragment_socket_0.userData.socket = {"id": "released-fragment-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_released_fragment_14.add(socket_released_fragment_released_fragment_socket_0);
  sockets["released-fragment:released-fragment-socket"] = socket_released_fragment_released_fragment_socket_0;

  const attachment_release_path_15 = {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_release_path_15 = makeAttachmentEndpoint(attachment_release_path_15);
  const node_release_path_15 = new THREE.Group();
  node_release_path_15.name = "Short page-contact release path__pivot";
  node_release_path_15.scale.set(1, 1, 1);
  if (endpoint_release_path_15) {
    node_release_path_15.position.copy(endpoint_release_path_15.start);
    node_release_path_15.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_release_path_15.position.set(0.0, 0.0, 0.0);
    node_release_path_15.rotation.set(0.0, 0.0, 0.0);
  }
  node_release_path_15.userData.sculptComponent = {"id": "release-path", "name": "Short page-contact release path", "level": "meso", "role": "release-path-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "tube", "topologyClass": "fiber-strand", "topologyRationale": "The release path follows a bounded attached curve.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "not-now-vault-system", "attachment": {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "release-path-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "release-path-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "vault-contact-rail", "placement": "Observed feature on Short page-contact release path", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_release_path_15.userData.actionProfile = {"animationRole": "release-path-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "release-path-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["not-now-vault-system"] ?? root).add(node_release_path_15);
  nodes["release-path"] = node_release_path_15;
  const mesh_release_path_15Geometry = endpoint_release_path_15
    ? new THREE.CylinderGeometry(endpoint_release_path_15.endRadius, endpoint_release_path_15.baseRadius, endpoint_release_path_15.length, 16, 6)
    : buildTubeGeometry({"points": [[0.0, -0.5, 0.0], [0.0, 0.5, 0.0]], "radius": 0.05, "closed": false});
  if (!endpoint_release_path_15) {
    mesh_release_path_15Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_release_path_15 = new THREE.Mesh(
    mesh_release_path_15Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_release_path_15.name = "Short page-contact release path";
  if (endpoint_release_path_15) {
    mesh_release_path_15.position.copy(endpoint_release_path_15.midpoint);
    mesh_release_path_15.quaternion.copy(endpoint_release_path_15.quaternion);
  }
  mesh_release_path_15.castShadow = options.castShadow ?? true;
  mesh_release_path_15.receiveShadow = options.receiveShadow ?? true;
  mesh_release_path_15.userData.sculptComponent = {"id": "release-path", "name": "Short page-contact release path", "level": "meso", "role": "release-path-pulse", "importance": 0.9, "confidence": 0.94, "primitive": "tube", "topologyClass": "fiber-strand", "topologyRationale": "The release path follows a bounded attached curve.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "not-now-vault-system", "attachment": {"parentId": "not-now-vault-system", "parentSocket": "not-now-vault-system-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "release-path-pulse", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "release-path-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "vault-contact-rail", "placement": "Observed feature on Short page-contact release path", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_release_path_15.add(mesh_release_path_15);
  meshes["release-path"] = mesh_release_path_15;
  colliders["release-path"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_release_path_15);
  const socket_release_path_release_path_socket_0 = new THREE.Object3D();
  socket_release_path_release_path_socket_0.name = "release-path-socket";
  socket_release_path_release_path_socket_0.position.set(0.0, 0.0, 0.0);
  socket_release_path_release_path_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_release_path_release_path_socket_0.userData.socket = {"id": "release-path-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_release_path_15.add(socket_release_path_release_path_socket_0);
  sockets["release-path:release-path-socket"] = socket_release_path_release_path_socket_0;

  const attachment_frame_fasteners_16 = {"parentId": "contact-frame", "parentSocket": "contact-frame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_frame_fasteners_16 = makeAttachmentEndpoint(attachment_frame_fasteners_16);
  const node_frame_fasteners_16 = new THREE.Group();
  node_frame_fasteners_16.name = "Instanced frame fasteners__pivot";
  node_frame_fasteners_16.scale.set(1, 1, 1);
  if (endpoint_frame_fasteners_16) {
    node_frame_fasteners_16.position.copy(endpoint_frame_fasteners_16.start);
    node_frame_fasteners_16.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_frame_fasteners_16.position.set(0.0, 0.0, 0.0);
    node_frame_fasteners_16.rotation.set(0.0, 0.0, 0.0);
  }
  node_frame_fasteners_16.userData.sculptComponent = {"id": "frame-fasteners", "name": "Instanced frame fasteners", "level": "micro", "role": "static-detail", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "surface-relief", "topologyRationale": "Repeated marks alter highlights and shallow relief without owning the macro volume.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "contact-frame", "attachment": {"parentId": "contact-frame", "parentSocket": "contact-frame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "frame-fasteners-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "corner-studs-and-screws", "placement": "Observed feature on Instanced frame fasteners", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_frame_fasteners_16.userData.actionProfile = {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "frame-fasteners-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["contact-frame"] ?? root).add(node_frame_fasteners_16);
  nodes["frame-fasteners"] = node_frame_fasteners_16;
  const mesh_frame_fasteners_16Geometry = endpoint_frame_fasteners_16
    ? new THREE.CylinderGeometry(endpoint_frame_fasteners_16.endRadius, endpoint_frame_fasteners_16.baseRadius, endpoint_frame_fasteners_16.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_frame_fasteners_16) {
    mesh_frame_fasteners_16Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_frame_fasteners_16 = new THREE.Mesh(
    mesh_frame_fasteners_16Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_frame_fasteners_16.name = "Instanced frame fasteners";
  if (endpoint_frame_fasteners_16) {
    mesh_frame_fasteners_16.position.copy(endpoint_frame_fasteners_16.midpoint);
    mesh_frame_fasteners_16.quaternion.copy(endpoint_frame_fasteners_16.quaternion);
  }
  mesh_frame_fasteners_16.castShadow = options.castShadow ?? true;
  mesh_frame_fasteners_16.receiveShadow = options.receiveShadow ?? true;
  mesh_frame_fasteners_16.userData.sculptComponent = {"id": "frame-fasteners", "name": "Instanced frame fasteners", "level": "micro", "role": "static-detail", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "surface-relief", "topologyRationale": "Repeated marks alter highlights and shallow relief without owning the macro volume.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "contact-frame", "attachment": {"parentId": "contact-frame", "parentSocket": "contact-frame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "frame-fasteners-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "corner-studs-and-screws", "placement": "Observed feature on Instanced frame fasteners", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_frame_fasteners_16.add(mesh_frame_fasteners_16);
  meshes["frame-fasteners"] = mesh_frame_fasteners_16;
  colliders["frame-fasteners"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_frame_fasteners_16);
  const socket_frame_fasteners_frame_fasteners_socket_0 = new THREE.Object3D();
  socket_frame_fasteners_frame_fasteners_socket_0.name = "frame-fasteners-socket";
  socket_frame_fasteners_frame_fasteners_socket_0.position.set(0.0, 0.0, 0.0);
  socket_frame_fasteners_frame_fasteners_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_frame_fasteners_frame_fasteners_socket_0.userData.socket = {"id": "frame-fasteners-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_frame_fasteners_16.add(socket_frame_fasteners_frame_fasteners_socket_0);
  sockets["frame-fasteners:frame-fasteners-socket"] = socket_frame_fasteners_frame_fasteners_socket_0;

  const attachment_ring_mark_array_17 = {"parentId": "maintenance-ring", "parentSocket": "maintenance-ring-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_ring_mark_array_17 = makeAttachmentEndpoint(attachment_ring_mark_array_17);
  const node_ring_mark_array_17 = new THREE.Group();
  node_ring_mark_array_17.name = "Instanced radial ring engravings__pivot";
  node_ring_mark_array_17.scale.set(1, 1, 1);
  if (endpoint_ring_mark_array_17) {
    node_ring_mark_array_17.position.copy(endpoint_ring_mark_array_17.start);
    node_ring_mark_array_17.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_ring_mark_array_17.position.set(0.0, 0.0, 0.0);
    node_ring_mark_array_17.rotation.set(0.0, 0.0, 0.0);
  }
  node_ring_mark_array_17.userData.sculptComponent = {"id": "ring-mark-array", "name": "Instanced radial ring engravings", "level": "micro", "role": "static-detail", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "surface-relief", "topologyRationale": "Repeated marks alter highlights and shallow relief without owning the macro volume.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-ring", "attachment": {"parentId": "maintenance-ring", "parentSocket": "maintenance-ring-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "ring-mark-array-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "radial-mark-array", "placement": "Observed feature on Instanced radial ring engravings", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_ring_mark_array_17.userData.actionProfile = {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "ring-mark-array-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["maintenance-ring"] ?? root).add(node_ring_mark_array_17);
  nodes["ring-mark-array"] = node_ring_mark_array_17;
  const mesh_ring_mark_array_17Geometry = endpoint_ring_mark_array_17
    ? new THREE.CylinderGeometry(endpoint_ring_mark_array_17.endRadius, endpoint_ring_mark_array_17.baseRadius, endpoint_ring_mark_array_17.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_ring_mark_array_17) {
    mesh_ring_mark_array_17Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_ring_mark_array_17 = new THREE.Mesh(
    mesh_ring_mark_array_17Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_ring_mark_array_17.name = "Instanced radial ring engravings";
  if (endpoint_ring_mark_array_17) {
    mesh_ring_mark_array_17.position.copy(endpoint_ring_mark_array_17.midpoint);
    mesh_ring_mark_array_17.quaternion.copy(endpoint_ring_mark_array_17.quaternion);
  }
  mesh_ring_mark_array_17.castShadow = options.castShadow ?? true;
  mesh_ring_mark_array_17.receiveShadow = options.receiveShadow ?? true;
  mesh_ring_mark_array_17.userData.sculptComponent = {"id": "ring-mark-array", "name": "Instanced radial ring engravings", "level": "micro", "role": "static-detail", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "surface-relief", "topologyRationale": "Repeated marks alter highlights and shallow relief without owning the macro volume.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-ring", "attachment": {"parentId": "maintenance-ring", "parentSocket": "maintenance-ring-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "ring-mark-array-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "radial-mark-array", "placement": "Observed feature on Instanced radial ring engravings", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_ring_mark_array_17.add(mesh_ring_mark_array_17);
  meshes["ring-mark-array"] = mesh_ring_mark_array_17;
  colliders["ring-mark-array"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_ring_mark_array_17);
  const socket_ring_mark_array_ring_mark_array_socket_0 = new THREE.Object3D();
  socket_ring_mark_array_ring_mark_array_socket_0.name = "ring-mark-array-socket";
  socket_ring_mark_array_ring_mark_array_socket_0.position.set(0.0, 0.0, 0.0);
  socket_ring_mark_array_ring_mark_array_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_ring_mark_array_ring_mark_array_socket_0.userData.socket = {"id": "ring-mark-array-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_ring_mark_array_17.add(socket_ring_mark_array_ring_mark_array_socket_0);
  sockets["ring-mark-array:ring-mark-array-socket"] = socket_ring_mark_array_ring_mark_array_socket_0;

  const attachment_ring_rivet_array_18 = {"parentId": "maintenance-ring", "parentSocket": "maintenance-ring-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_ring_rivet_array_18 = makeAttachmentEndpoint(attachment_ring_rivet_array_18);
  const node_ring_rivet_array_18 = new THREE.Group();
  node_ring_rivet_array_18.name = "Instanced maintenance socket rivets__pivot";
  node_ring_rivet_array_18.scale.set(1, 1, 1);
  if (endpoint_ring_rivet_array_18) {
    node_ring_rivet_array_18.position.copy(endpoint_ring_rivet_array_18.start);
    node_ring_rivet_array_18.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_ring_rivet_array_18.position.set(0.0, 0.0, 0.0);
    node_ring_rivet_array_18.rotation.set(0.0, 0.0, 0.0);
  }
  node_ring_rivet_array_18.userData.sculptComponent = {"id": "ring-rivet-array", "name": "Instanced maintenance socket rivets", "level": "micro", "role": "static-detail", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "surface-relief", "topologyRationale": "Repeated marks alter highlights and shallow relief without owning the macro volume.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-ring", "attachment": {"parentId": "maintenance-ring", "parentSocket": "maintenance-ring-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "ring-rivet-array-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "ring-rivet-array", "placement": "Observed feature on Instanced maintenance socket rivets", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_ring_rivet_array_18.userData.actionProfile = {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "ring-rivet-array-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["maintenance-ring"] ?? root).add(node_ring_rivet_array_18);
  nodes["ring-rivet-array"] = node_ring_rivet_array_18;
  const mesh_ring_rivet_array_18Geometry = endpoint_ring_rivet_array_18
    ? new THREE.CylinderGeometry(endpoint_ring_rivet_array_18.endRadius, endpoint_ring_rivet_array_18.baseRadius, endpoint_ring_rivet_array_18.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_ring_rivet_array_18) {
    mesh_ring_rivet_array_18Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_ring_rivet_array_18 = new THREE.Mesh(
    mesh_ring_rivet_array_18Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_ring_rivet_array_18.name = "Instanced maintenance socket rivets";
  if (endpoint_ring_rivet_array_18) {
    mesh_ring_rivet_array_18.position.copy(endpoint_ring_rivet_array_18.midpoint);
    mesh_ring_rivet_array_18.quaternion.copy(endpoint_ring_rivet_array_18.quaternion);
  }
  mesh_ring_rivet_array_18.castShadow = options.castShadow ?? true;
  mesh_ring_rivet_array_18.receiveShadow = options.receiveShadow ?? true;
  mesh_ring_rivet_array_18.userData.sculptComponent = {"id": "ring-rivet-array", "name": "Instanced maintenance socket rivets", "level": "micro", "role": "static-detail", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "surface-relief", "topologyRationale": "Repeated marks alter highlights and shallow relief without owning the macro volume.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "maintenance-ring", "attachment": {"parentId": "maintenance-ring", "parentSocket": "maintenance-ring-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "ring-rivet-array-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "ring-rivet-array", "placement": "Observed feature on Instanced maintenance socket rivets", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_ring_rivet_array_18.add(mesh_ring_rivet_array_18);
  meshes["ring-rivet-array"] = mesh_ring_rivet_array_18;
  colliders["ring-rivet-array"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_ring_rivet_array_18);
  const socket_ring_rivet_array_ring_rivet_array_socket_0 = new THREE.Object3D();
  socket_ring_rivet_array_ring_rivet_array_socket_0.name = "ring-rivet-array-socket";
  socket_ring_rivet_array_ring_rivet_array_socket_0.position.set(0.0, 0.0, 0.0);
  socket_ring_rivet_array_ring_rivet_array_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_ring_rivet_array_ring_rivet_array_socket_0.userData.socket = {"id": "ring-rivet-array-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_ring_rivet_array_18.add(socket_ring_rivet_array_ring_rivet_array_socket_0);
  sockets["ring-rivet-array:ring-rivet-array-socket"] = socket_ring_rivet_array_ring_rivet_array_socket_0;

  const attachment_flame_cage_19 = {"parentId": "protected-flame", "parentSocket": "protected-flame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_flame_cage_19 = makeAttachmentEndpoint(attachment_flame_cage_19);
  const node_flame_cage_19 = new THREE.Group();
  node_flame_cage_19.name = "Guarding brazier cage ribs__pivot";
  node_flame_cage_19.scale.set(1, 1, 1);
  if (endpoint_flame_cage_19) {
    node_flame_cage_19.position.copy(endpoint_flame_cage_19.start);
    node_flame_cage_19.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_flame_cage_19.position.set(0.0, 0.0, 0.0);
    node_flame_cage_19.rotation.set(0.0, 0.0, 0.0);
  }
  node_flame_cage_19.userData.sculptComponent = {"id": "flame-cage", "name": "Guarding brazier cage ribs", "level": "micro", "role": "cage-glow-response", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "protected-flame", "attachment": {"parentId": "protected-flame", "parentSocket": "protected-flame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "cage-glow-response", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "flame-cage-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "six-cage-ribs", "placement": "Observed feature on Guarding brazier cage ribs", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_flame_cage_19.userData.actionProfile = {"animationRole": "cage-glow-response", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "flame-cage-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["protected-flame"] ?? root).add(node_flame_cage_19);
  nodes["flame-cage"] = node_flame_cage_19;
  const mesh_flame_cage_19Geometry = endpoint_flame_cage_19
    ? new THREE.CylinderGeometry(endpoint_flame_cage_19.endRadius, endpoint_flame_cage_19.baseRadius, endpoint_flame_cage_19.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_flame_cage_19) {
    mesh_flame_cage_19Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_flame_cage_19 = new THREE.Mesh(
    mesh_flame_cage_19Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_flame_cage_19.name = "Guarding brazier cage ribs";
  if (endpoint_flame_cage_19) {
    mesh_flame_cage_19.position.copy(endpoint_flame_cage_19.midpoint);
    mesh_flame_cage_19.quaternion.copy(endpoint_flame_cage_19.quaternion);
  }
  mesh_flame_cage_19.castShadow = options.castShadow ?? true;
  mesh_flame_cage_19.receiveShadow = options.receiveShadow ?? true;
  mesh_flame_cage_19.userData.sculptComponent = {"id": "flame-cage", "name": "Guarding brazier cage ribs", "level": "micro", "role": "cage-glow-response", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "protected-flame", "attachment": {"parentId": "protected-flame", "parentSocket": "protected-flame-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "cage-glow-response", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "flame-cage-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "six-cage-ribs", "placement": "Observed feature on Guarding brazier cage ribs", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_flame_cage_19.add(mesh_flame_cage_19);
  meshes["flame-cage"] = mesh_flame_cage_19;
  colliders["flame-cage"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_flame_cage_19);
  const socket_flame_cage_flame_cage_socket_0 = new THREE.Object3D();
  socket_flame_cage_flame_cage_socket_0.name = "flame-cage-socket";
  socket_flame_cage_flame_cage_socket_0.position.set(0.0, 0.0, 0.0);
  socket_flame_cage_flame_cage_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_flame_cage_flame_cage_socket_0.userData.socket = {"id": "flame-cage-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_flame_cage_19.add(socket_flame_cage_flame_cage_socket_0);
  sockets["flame-cage:flame-cage-socket"] = socket_flame_cage_flame_cage_socket_0;

  const attachment_vault_hardware_20 = {"parentId": "not-now-vault", "parentSocket": "not-now-vault-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]};
  const endpoint_vault_hardware_20 = makeAttachmentEndpoint(attachment_vault_hardware_20);
  const node_vault_hardware_20 = new THREE.Group();
  node_vault_hardware_20.name = "Vault hinge, latch and bezel hardware__pivot";
  node_vault_hardware_20.scale.set(1, 1, 1);
  if (endpoint_vault_hardware_20) {
    node_vault_hardware_20.position.copy(endpoint_vault_hardware_20.start);
    node_vault_hardware_20.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_vault_hardware_20.position.set(0.0, 0.0, 0.0);
    node_vault_hardware_20.rotation.set(0.0, 0.0, 0.0);
  }
  node_vault_hardware_20.userData.sculptComponent = {"id": "vault-hardware", "name": "Vault hinge, latch and bezel hardware", "level": "micro", "role": "static-detail", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "not-now-vault", "attachment": {"parentId": "not-now-vault", "parentSocket": "not-now-vault-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "vault-hardware-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "hinge-straps-and-latch", "placement": "Observed feature on Vault hinge, latch and bezel hardware", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_vault_hardware_20.userData.actionProfile = {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "vault-hardware-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}};
  (nodes["not-now-vault"] ?? root).add(node_vault_hardware_20);
  nodes["vault-hardware"] = node_vault_hardware_20;
  const mesh_vault_hardware_20Geometry = endpoint_vault_hardware_20
    ? new THREE.CylinderGeometry(endpoint_vault_hardware_20.endRadius, endpoint_vault_hardware_20.baseRadius, endpoint_vault_hardware_20.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_vault_hardware_20) {
    mesh_vault_hardware_20Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_vault_hardware_20 = new THREE.Mesh(
    mesh_vault_hardware_20Geometry,
    materialMap["aged-brass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_vault_hardware_20.name = "Vault hinge, latch and bezel hardware";
  if (endpoint_vault_hardware_20) {
    mesh_vault_hardware_20.position.copy(endpoint_vault_hardware_20.midpoint);
    mesh_vault_hardware_20.quaternion.copy(endpoint_vault_hardware_20.quaternion);
  }
  mesh_vault_hardware_20.castShadow = options.castShadow ?? true;
  mesh_vault_hardware_20.receiveShadow = options.receiveShadow ?? true;
  mesh_vault_hardware_20.userData.sculptComponent = {"id": "vault-hardware", "name": "Vault hinge, latch and bezel hardware", "level": "micro", "role": "static-detail", "importance": 0.74, "confidence": 0.94, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Discrete hard-surface part with countable closed faces and real thickness.", "geometryDescriptor": {"topologyIntent": "low-poly blockout with bevel-ready edges", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "vertex normals from generated geometry"}, "parent": "not-now-vault", "attachment": {"parentId": "not-now-vault", "parentSocket": "not-now-vault-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.08, "endRadius": 0.06, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.01, "evidenceRefs": ["quest-forge-goal"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative", "confidence": 0.5}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "static-detail", "pivot": {"mode": "custom", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.9}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": false}, "sockets": [{"id": "vault-hardware-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "root", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "base"}}, "material": "aged-brass", "materialLayers": ["aged-brass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "hinge-straps-and-latch", "placement": "Observed feature on Vault hinge, latch and bezel hardware", "size": "phone-readable macro/meso form or disciplined micro repetition", "orientation": "aligned to local page-relief frame", "materialEffect": "independent roughness, patina, enamel, crystal or emissive response", "geometryEffect": "real closed geometry whenever silhouette/contact changes; shallow relief otherwise", "confidence": 0.95, "evidenceRefs": ["quest-forge-goal"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.08, "bumpAmplitude": 0.035, "normalPattern": "aged-brass-independent-normal", "displacementPattern": "silhouette-changing detail owned by geometry", "occlusionPattern": "bezels, sockets, seams, cage ribs and page contacts", "edgeWearPattern": "restrained handled crests and cavity patina", "notes": "Macro/meso/micro frequency separation remains legible under grazing light."}, "evidenceRefs": ["quest-forge-goal"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(154, 99, 39, 1.0)", "secondaryAlbedo": "rgba(9, 10, 19, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.93, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(154, 99, 39, 1.0)"}, {"at": 1, "color": "rgba(9, 10, 19, 1.0)"}]}, "evidenceRefs": ["quest-forge-goal"]}};
  node_vault_hardware_20.add(mesh_vault_hardware_20);
  meshes["vault-hardware"] = mesh_vault_hardware_20;
  colliders["vault-hardware"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Replace with sphere/capsule/compound proxy when the object shape demands it."};
  destructionGroups["root"] ??= [];
  destructionGroups["root"].push(node_vault_hardware_20);
  const socket_vault_hardware_vault_hardware_socket_0 = new THREE.Object3D();
  socket_vault_hardware_vault_hardware_socket_0.name = "vault-hardware-socket";
  socket_vault_hardware_vault_hardware_socket_0.position.set(0.0, 0.0, 0.0);
  socket_vault_hardware_vault_hardware_socket_0.rotation.set(0.0, 0.0, 0.0);
  socket_vault_hardware_vault_hardware_socket_0.userData.socket = {"id": "vault-hardware-socket", "position": [0, 0, 0], "rotation": [0, 0, 0], "purpose": "local child attachment and effect target"};
  node_vault_hardware_20.add(socket_vault_hardware_vault_hardware_socket_0);
  sockets["vault-hardware:vault-hardware-socket"] = socket_vault_hardware_vault_hardware_socket_0;

  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "procedural-reference-guided", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "minimumConfidence": 0.7}}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim light", "exposure", "tone mapping", "background", "contact shadow"]}, "screenshotReview": ["fixed high tier", "fixed low tier", "map-stripped fixed", "orbit left", "orbit right", "neutral", "grazing", "reference-match"]};
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets.',
  };
  return root;
}

export function createCompassBookQuestForgeReliefLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "Compass Book Quest Forge Relief look-dev lights";
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
  lights.userData.lightingFromPhoto = ["Warm amber practical light rises from the compact protected flame.", "Soft warm key from upper left explains brass bevels and crest facets.", "Cool indigo rim from the upper-right separates the book and vault silhouette.", "Restrained fill preserves the indigo field without flattening cavities.", "ACES filmic tone mapping and contact shadows protect page attachment."];
  lights.userData.lookDevTargets = {"qualityPriority": "procedural-reference-guided", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "minimumConfidence": 0.7}}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim light", "exposure", "tone mapping", "background", "contact shadow"]}, "screenshotReview": ["fixed high tier", "fixed low tier", "map-stripped fixed", "orbit left", "orbit right", "neutral", "grazing", "reference-match"]};
  return lights;
}

// PBR materials (clearcoat/iridescence/transmission/anisotropy) need an environment
// map to visually behave as intended — call this once per renderer and assign the
// result to scene.environment before rendering. No external HDR asset required.
export function createCompassBookQuestForgeReliefEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
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
export function frameCompassBookQuestForgeReliefCamera(
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
export function createCompassBookQuestForgeReliefPresentationComposer(
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

export function configureCompassBookQuestForgeReliefRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createCompassBookQuestForgeReliefInspectControls(
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
