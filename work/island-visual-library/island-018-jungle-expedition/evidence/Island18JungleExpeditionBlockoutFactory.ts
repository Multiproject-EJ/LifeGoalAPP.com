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

// Generated from ObjectSculptSpec target: Island 018 Jungle Expedition
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createIsland018JungleExpeditionModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "Island 018 Jungle Expedition";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": {"solved": false, "fovDegrees": 40.0, "aspect": 1.0, "orientation": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}, "positionHint": [0.0, 0.0, 3.0], "note": "For likeness work, solve the reference camera (forge/stage1_intake/solve_camera_pose.py) so the review render aligns with the photo and the reference can be projected. Confirm by overlay review."}, "approximationNotes": []};
  root.userData.materialPipeline = {"schemaVersion": 1, "status": "probe", "registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "analysisArtifact": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-analysis.json", "targetThreshold": 0.68, "unresolvedNotObservedMaterials": [{"id": "hidden-rear-temple-stone", "status": "probe", "reason": "Rear and side faces are not visible in the single source view."}, {"id": "underside-cliff-wet-rock", "status": "probe", "reason": "Floating-island undersides are partially occluded by UI and cloud mist."}], "regions": [{"componentId": "lostCityTemple", "regionId": "mossy-stone-blocks", "specMaterialId": "mossyRuinStone", "profileId": "stone.natural", "status": "proceed"}, {"componentId": "jungleFoliage", "regionId": "emerald-leaf-canopy", "specMaterialId": "emeraldLeafCards", "profileId": "fabric.woven-matte", "status": "proceed"}, {"componentId": "waterfallSystem", "regionId": "turquoise-waterfall-and-pool", "specMaterialId": "turquoiseWater", "profileId": "glass.clear", "status": "proceed"}, {"componentId": "ropeBridge", "regionId": "rope-and-aged-wood", "specMaterialId": "ropeAndAgedWood", "profileId": "wood.unfinished", "status": "proceed"}, {"componentId": "ruinTrimAndRelics", "regionId": "aged-gold-brass-trim", "specMaterialId": "agedBrassTrim", "profileId": "metal.brass", "status": "proceed"}, {"componentId": "ruinLight", "regionId": "amber-window-and-torch-glow", "specMaterialId": "amberRuinLight", "profileId": "glass.clear", "status": "proceed"}, {"componentId": "explorerNest", "regionId": "green-egg-and-emerald-crystal", "specMaterialId": "emeraldEggCrystal", "profileId": "gemstone.quartz", "status": "proceed"}], "controlledViewsRequired": ["albedo-unlit", "backlight-transmission", "environment-reflection", "grazing", "neutral-studio", "reference-beauty"]};
  root.userData.materialReferenceRegistry = "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json";

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["base"] = createSculptMaterial(
    "base",
    {"id": "base", "name": "Base material", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#8A7A5F", "color": "#8A7A5F", "albedo": {"dominant": "#8A7A5F", "secondary": ["#6E614B", "#A08F70"], "samplingNotes": "Use image-observed local color zones, not a single averaged color."}, "colorVariation": {"palette": ["#8A7A5F", "#6E614B", "#A08F70"], "pattern": "mottled", "amplitude": 0.15, "heightCorrelation": 0.3}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [2.0, 2.0], "anisotropy": 8, "texelDensityIntent": "Preserve stable world/object-scale detail; do not stretch micro detail with component scale."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.42, "role": "broad color and height breakup"}, {"id": "meso", "frequency": 12.0, "amplitude": 0.22, "role": "ridges, pores, grain, dents, or equivalent visible relief"}, {"id": "micro", "frequency": 56.0, "amplitude": 0.08, "role": "highlight breakup visible under grazing light"}], "roughness": {"base": 0.75, "variation": 0.15, "map": "independent-procedural-field", "localResponse": "higher roughness in cavities, lower roughness on worn edges"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"pattern": "derived-from-independent-height-field", "strength": 0.35, "scale": 24.0, "space": "tangent"}, "bump": {"pattern": "none", "amplitude": 0.0, "scale": 1.0}, "displacement": {"pattern": "none", "amplitude": 0.0, "scale": 1.0, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.25, "contactShadowBias": 0.35, "notes": "Darken creases, seams, intersections, and recessed local features."}, "wear": {"edgeWear": 0.0, "scratches": [], "chips": []}, "dirt": {"amount": 0.0, "cavityBias": 0.0, "color": "#2F2A22"}, "localOverrides": [], "shaderNotes": ["Prefer MeshPhysicalMaterial when clearcoat, sheen, transmission, or thin-surface response is observed; otherwise use MeshStandardMaterial-compatible PBR channels.", "Generate albedo, roughness, height/normal, and AO independently; never alias albedo into roughness.", "Use normal/bump/displacement only when they map to observed surface relief.", "Use displacement geometry when the observed relief changes the close-up silhouette; texture-only relief is insufficient there."], "notes": "Utility fallback only; generated Island 018 components should use reference-derived materials.", "qualityTier": "utility"},
    options
  );
  materialMap["mossyRuinStone"] = createSculptMaterial(
    "mossyRuinStone",
    {"id": "mossyRuinStone", "baseColor": "#384E38", "referenceMaterialId": "stone.natural", "materialFamily": "stone", "materialSubtype": "natural", "materialFinish": "rough-or-polished", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "stone.natural", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-standard", "three.mesh-physical", "adobe.pbr-guide-1", "mit.material-recognition"], "requiredMaps": ["map", "roughnessMap", "normalMap"], "optionalMaps": ["aoMap", "displacementMap", "clearcoatMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "reference-beauty"]}, "metalness": {"base": 0.0, "variation": 0.0}, "roughness": {"base": 0.82, "variation": 0.148, "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-00-mossy-stone-blocks/mossyruinstone_roughness.png", "localResponse": "Roughness is independently varied from albedo; cavities/moss/crevices rougher, polished wet or gem edges lower."}, "clearcoat": {"base": 0.0, "variation": 0.0}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [1, 1], "anisotropy": 8, "colorSpace": "SRGBColorSpace for albedo; NoColorSpace for scalar/normal maps", "mapBindings": ["map", "roughnessMap", "normalMap"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/00-mossy-stone-blocks.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.68, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-00-mossy-stone-blocks/mossyruinstone_albedo.png", "url": "mossyruinstone_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-00-mossy-stone-blocks/mossyruinstone_roughness.png", "url": "mossyruinstone_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-00-mossy-stone-blocks/mossyruinstone_height.png", "url": "mossyruinstone_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-00-mossy-stone-blocks/mossyruinstone_normal.png", "url": "mossyruinstone_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-00-mossy-stone-blocks/mossyruinstone_ao.png", "url": "mossyruinstone_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 245, "sourceHeight": 260, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 245, "height": 260}, "mask": {"backgroundColor": "#765E3F", "backgroundNoise": 176.63, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9803}, "mapStats": {"valueRange": 0.7232, "heightP90Gradient": 0.20976, "roughnessBase": 0.836, "roughnessVariation": 0.167, "normalStrength": 0.402, "blurRadius": 10}, "palette": ["#2F2F0B", "#111404", "#64591D", "#B2962E", "#AFBA98"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#384E38", "#443A0D", "#43471E", "#5A4C1E", "#54542B"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 75.3, "meanSaturation": 0.726, "gradientStrength": 0.367, "mottle": 0.157, "streakRatio": 1.02, "hueSpread": 0.131, "specularFraction": 0.012}}, "materialEvidence": {"componentId": "lostCityTemple", "regionId": "mossy-stone-blocks", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/00-mossy-stone-blocks.png", "bbox": {"x": 285, "y": 430, "width": 245, "height": 260}, "sourceWidth": 853, "sourceHeight": 1844, "loaderWarnings": [], "coverage": 0.0405}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "lostCityTemple", "regionId": "mossy-stone-blocks", "materialId": "stone.natural", "family": "stone", "subtype": "natural", "finish": "rough-or-polished", "aliases": [], "confidence": 0.829, "source": "source-crop"}, "alternatives": []}, "qualityTier": "reference-derived", "color": "#384E38", "albedo": {"dominant": "#384E38", "secondary": ["#443A0D", "#43471E", "#5A4C1E", "#54542B"], "samplingNotes": "Derived from admitted Island 018 source material crop; verify under neutral and reference lighting."}, "colorVariation": {"palette": ["#384E38", "#443A0D", "#43471E", "#5A4C1E", "#54542B"], "pattern": "source-derived mottled zones with vertical value gradients", "amplitude": 0.28, "heightCorrelation": 0.36}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.34, "role": "broad light/dark breakup and large moss or water-gradient zones"}, {"id": "meso", "frequency": 13.0, "amplitude": 0.18, "role": "stone chips, leaf clumps, rope fibers, plank splits, foam streaks, or brass patina islands"}, {"id": "micro", "frequency": 58.0, "amplitude": 0.055, "role": "grazing-highlight breakup from pores, scratches, veins, pitting, and fine foam"}], "normal": {"pattern": "source-derived height gradients plus procedural meso/micro relief", "strength": 0.42, "scale": 28.0, "space": "tangent", "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-00-mossy-stone-blocks/mossyruinstone_normal.png"}, "bump": {"pattern": "fine reference-noise bump layered below normal map", "amplitude": 0.025, "scale": 44.0}, "ambientOcclusion": {"map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-00-mossy-stone-blocks/mossyruinstone_ao.png", "cavityStrength": 0.46, "contactShadowBias": 0.42, "notes": "Use darker response under overlapping leaves, stone block seams, stair risers, bridge contacts, and prop bases."}, "wear": {"edgeWear": 0.18, "scratches": ["small directional breakup on exposed edges"], "chips": ["irregular corners on temple blocks and board slabs"]}, "dirt": {"amount": 0.22, "cavityBias": 0.54, "color": "#1B170D"}, "localOverrides": [{"id": "moss-patches", "kind": "stain", "mask": "moss-patches-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.05}, {"id": "edge-chip-wear", "kind": "chip", "mask": "edge-chip-wear-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.18}, {"id": "cavity-dirt", "kind": "stain", "mask": "cavity-dirt-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.05}]},
    options
  );
  materialMap["emeraldLeafCards"] = createSculptMaterial(
    "emeraldLeafCards",
    {"id": "emeraldLeafCards", "baseColor": "#2A2816", "referenceMaterialId": "fabric.woven-matte", "materialFamily": "fabric", "materialSubtype": "woven", "materialFinish": "matte", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "fabric.woven-matte", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "three.texture", "khronos.sheen", "mit.material-recognition"], "requiredMaps": ["map", "roughnessMap", "normalMap"], "optionalMaps": ["sheenColorMap", "sheenRoughnessMap", "aoMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "reference-beauty"]}, "metalness": {"base": 0.0, "variation": 0.0}, "roughness": {"base": 0.72, "variation": 0.13, "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-01-emerald-leaf-canopy/emeraldleafcards_roughness.png", "localResponse": "Roughness is independently varied from albedo; cavities/moss/crevices rougher, polished wet or gem edges lower."}, "sheen": {"base": 0.65, "variation": 0.0}, "sheenRoughness": {"base": 0.75, "variation": 0.0}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [1, 1], "anisotropy": 8, "colorSpace": "SRGBColorSpace for albedo; NoColorSpace for scalar/normal maps", "mapBindings": ["map", "roughnessMap", "normalMap"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/01-emerald-leaf-canopy.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.68, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-01-emerald-leaf-canopy/emeraldleafcards_albedo.png", "url": "emeraldleafcards_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-01-emerald-leaf-canopy/emeraldleafcards_roughness.png", "url": "emeraldleafcards_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-01-emerald-leaf-canopy/emeraldleafcards_height.png", "url": "emeraldleafcards_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-01-emerald-leaf-canopy/emeraldleafcards_normal.png", "url": "emeraldleafcards_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-01-emerald-leaf-canopy/emeraldleafcards_ao.png", "url": "emeraldleafcards_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 360, "sourceHeight": 190, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 360, "height": 190}, "mask": {"backgroundColor": "#6F986C", "backgroundNoise": 157.369, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9342}, "mapStats": {"valueRange": 0.7128, "heightP90Gradient": 0.19854, "roughnessBase": 0.84, "roughnessVariation": 0.173, "normalStrength": 0.389, "blurRadius": 10}, "palette": ["#21270C", "#91C5D3", "#516140", "#B2A74C", "#62969C"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#2A2816", "#6C9589", "#6C7E65", "#646E47", "#61663F"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 111.4, "meanSaturation": 0.517, "gradientStrength": 0.514, "mottle": 0.164, "streakRatio": 1.28, "hueSpread": 0.428, "specularFraction": 0.011}}, "materialEvidence": {"componentId": "jungleFoliage", "regionId": "emerald-leaf-canopy", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/01-emerald-leaf-canopy.png", "bbox": {"x": 210, "y": 315, "width": 360, "height": 190}, "sourceWidth": 853, "sourceHeight": 1844, "loaderWarnings": [], "coverage": 0.0435}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "jungleFoliage", "regionId": "emerald-leaf-canopy", "materialId": "fabric.woven-matte", "family": "fabric", "subtype": "woven", "finish": "matte", "aliases": ["leaf cards", "matte foliage"], "confidence": 0.72, "source": "adapted-registry-prior"}, "alternatives": []}, "qualityTier": "reference-derived", "color": "#2A2816", "albedo": {"dominant": "#2A2816", "secondary": ["#6C9589", "#6C7E65", "#646E47", "#61663F"], "samplingNotes": "Derived from admitted Island 018 source material crop; verify under neutral and reference lighting."}, "colorVariation": {"palette": ["#2A2816", "#6C9589", "#6C7E65", "#646E47", "#61663F"], "pattern": "source-derived mottled zones with vertical value gradients", "amplitude": 0.28, "heightCorrelation": 0.36}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.34, "role": "broad light/dark breakup and large moss or water-gradient zones"}, {"id": "meso", "frequency": 13.0, "amplitude": 0.18, "role": "stone chips, leaf clumps, rope fibers, plank splits, foam streaks, or brass patina islands"}, {"id": "micro", "frequency": 58.0, "amplitude": 0.055, "role": "grazing-highlight breakup from pores, scratches, veins, pitting, and fine foam"}], "normal": {"pattern": "source-derived height gradients plus procedural meso/micro relief", "strength": 0.22, "scale": 28.0, "space": "tangent", "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-01-emerald-leaf-canopy/emeraldleafcards_normal.png"}, "bump": {"pattern": "fine reference-noise bump layered below normal map", "amplitude": 0.025, "scale": 44.0}, "ambientOcclusion": {"map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-01-emerald-leaf-canopy/emeraldleafcards_ao.png", "cavityStrength": 0.22, "contactShadowBias": 0.42, "notes": "Use darker response under overlapping leaves, stone block seams, stair risers, bridge contacts, and prop bases."}, "wear": {"edgeWear": 0.06, "scratches": ["small directional breakup on exposed edges"], "chips": []}, "dirt": {"amount": 0.22, "cavityBias": 0.54, "color": "#1B170D"}, "doubleSided": true, "localOverrides": [{"id": "leaf-vein-lines", "kind": "ridge", "mask": "leaf-vein-lines-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.18}, {"id": "yellow-green-frond-tips", "kind": "stain", "mask": "yellow-green-frond-tips-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.05}]},
    options
  );
  materialMap["turquoiseWater"] = createSculptMaterial(
    "turquoiseWater",
    {"id": "turquoiseWater", "baseColor": "#394940", "referenceMaterialId": "glass.clear", "materialFamily": "glass", "materialSubtype": "clear", "materialFinish": "polished", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "glass.clear", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "three.pmrem", "gltf.2", "khronos.transmission", "khronos.volume", "google.filament-pbr"], "requiredMaps": ["roughnessMap", "thicknessMap"], "optionalMaps": ["map", "normalMap", "transmissionMap"], "validationViews": ["neutral-studio", "environment-reflection", "backlight-transmission", "reference-beauty"]}, "metalness": {"base": 0.0, "variation": 0.0}, "roughness": {"base": 0.24, "variation": 0.12, "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-02-turquoise-waterfall-and-pool/turquoisewater_roughness.png", "localResponse": "Roughness is independently varied from albedo; cavities/moss/crevices rougher, polished wet or gem edges lower."}, "transmission": {"base": 1.0, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [1, 1], "anisotropy": 8, "colorSpace": "SRGBColorSpace for albedo; NoColorSpace for scalar/normal maps", "mapBindings": ["roughnessMap", "thicknessMap"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/02-turquoise-waterfall-and-pool.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.68, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-02-turquoise-waterfall-and-pool/turquoisewater_albedo.png", "url": "turquoisewater_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-02-turquoise-waterfall-and-pool/turquoisewater_roughness.png", "url": "turquoisewater_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-02-turquoise-waterfall-and-pool/turquoisewater_height.png", "url": "turquoisewater_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-02-turquoise-waterfall-and-pool/turquoisewater_normal.png", "url": "turquoisewater_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-02-turquoise-waterfall-and-pool/turquoisewater_ao.png", "url": "turquoisewater_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 170, "sourceHeight": 230, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 170, "height": 230}, "mask": {"backgroundColor": "#1A3E24", "backgroundNoise": 126.661, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9754}, "mapStats": {"valueRange": 0.8614, "heightP90Gradient": 0.20709, "roughnessBase": 0.818, "roughnessVariation": 0.185, "normalStrength": 0.399, "blurRadius": 10}, "palette": ["#161F11", "#AF9348", "#52481F", "#416576", "#EBDDAB"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#394940", "#596344", "#77654E", "#646C56", "#4C3E15"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 98.2, "meanSaturation": 0.59, "gradientStrength": 0.366, "mottle": 0.168, "streakRatio": 0.91, "hueSpread": 0.477, "specularFraction": 0.04}}, "materialEvidence": {"componentId": "waterfallSystem", "regionId": "turquoise-waterfall-and-pool", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/02-turquoise-waterfall-and-pool.png", "bbox": {"x": 100, "y": 730, "width": 170, "height": 230}, "sourceWidth": 853, "sourceHeight": 1844, "loaderWarnings": [], "coverage": 0.0249}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "waterfallSystem", "regionId": "turquoise-waterfall-and-pool", "materialId": "glass.clear", "family": "glass", "subtype": "clear", "finish": "polished", "aliases": ["transparent water", "waterfall sheet"], "confidence": 0.7, "source": "adapted-registry-prior"}, "alternatives": []}, "needsEnvironment": true, "qualityTier": "reference-derived", "color": "#394940", "albedo": {"dominant": "#394940", "secondary": ["#596344", "#77654E", "#646C56", "#4C3E15"], "samplingNotes": "Derived from admitted Island 018 source material crop; verify under neutral and reference lighting."}, "colorVariation": {"palette": ["#394940", "#596344", "#77654E", "#646C56", "#4C3E15"], "pattern": "source-derived mottled zones with vertical value gradients", "amplitude": 0.28, "heightCorrelation": 0.36}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.34, "role": "broad light/dark breakup and large moss or water-gradient zones"}, {"id": "meso", "frequency": 13.0, "amplitude": 0.18, "role": "stone chips, leaf clumps, rope fibers, plank splits, foam streaks, or brass patina islands"}, {"id": "micro", "frequency": 58.0, "amplitude": 0.055, "role": "grazing-highlight breakup from pores, scratches, veins, pitting, and fine foam"}], "normal": {"pattern": "source-derived height gradients plus procedural meso/micro relief", "strength": 0.5, "scale": 28.0, "space": "tangent", "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-02-turquoise-waterfall-and-pool/turquoisewater_normal.png"}, "bump": {"pattern": "fine reference-noise bump layered below normal map", "amplitude": 0.025, "scale": 44.0}, "ambientOcclusion": {"map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-02-turquoise-waterfall-and-pool/turquoisewater_ao.png", "cavityStrength": 0.16, "contactShadowBias": 0.42, "notes": "Use darker response under overlapping leaves, stone block seams, stair risers, bridge contacts, and prop bases."}, "wear": {"edgeWear": 0.06, "scratches": ["small directional breakup on exposed edges"], "chips": []}, "dirt": {"amount": 0.22, "cavityBias": 0.54, "color": "#1B170D"}, "clearcoat": {"base": 0.45, "variation": 0.12}, "doubleSided": true, "localOverrides": [{"id": "white-fall-foam", "kind": "ridge", "mask": "white-fall-foam-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.18}, {"id": "pool-depth-gradient", "kind": "gloss", "mask": "pool-depth-gradient-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": -0.18, "normalScaleDelta": 0.05}]},
    options
  );
  materialMap["ropeAndAgedWood"] = createSculptMaterial(
    "ropeAndAgedWood",
    {"id": "ropeAndAgedWood", "baseColor": "#857F46", "referenceMaterialId": "wood.unfinished", "materialFamily": "wood", "materialSubtype": "generic", "materialFinish": "unfinished", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "wood.unfinished", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-standard", "three.texture", "adobe.pbr-guide-1", "mit.material-recognition"], "requiredMaps": ["map", "roughnessMap", "normalMap"], "optionalMaps": ["aoMap", "anisotropyMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing"]}, "metalness": {"base": 0.0, "variation": 0.0}, "roughness": {"base": 0.86, "variation": 0.155, "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-03-rope-and-aged-wood/ropeandagedwood_roughness.png", "localResponse": "Roughness is independently varied from albedo; cavities/moss/crevices rougher, polished wet or gem edges lower."}, "anisotropy": {"base": 0.12, "variation": 0.0}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [1, 1], "anisotropy": 8, "colorSpace": "SRGBColorSpace for albedo; NoColorSpace for scalar/normal maps", "mapBindings": ["map", "roughnessMap", "normalMap"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/03-rope-and-aged-wood.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.68, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-03-rope-and-aged-wood/ropeandagedwood_albedo.png", "url": "ropeandagedwood_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-03-rope-and-aged-wood/ropeandagedwood_roughness.png", "url": "ropeandagedwood_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-03-rope-and-aged-wood/ropeandagedwood_height.png", "url": "ropeandagedwood_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-03-rope-and-aged-wood/ropeandagedwood_normal.png", "url": "ropeandagedwood_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-03-rope-and-aged-wood/ropeandagedwood_ao.png", "url": "ropeandagedwood_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 245, "sourceHeight": 145, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 245, "height": 145}, "mask": {"backgroundColor": "#181C12", "backgroundNoise": 174.84, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9587}, "mapStats": {"valueRange": 0.7017, "heightP90Gradient": 0.20376, "roughnessBase": 0.816, "roughnessVariation": 0.198, "normalStrength": 0.395, "blurRadius": 10}, "palette": ["#182010", "#55796C", "#4F481E", "#8FBEB1", "#B39F43"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#857F46", "#5C785A", "#4C7370", "#4C4415", "#2A3322"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 92.1, "meanSaturation": 0.512, "gradientStrength": 0.471, "mottle": 0.155, "streakRatio": 1.43, "hueSpread": 0.365, "specularFraction": 0.01}}, "materialEvidence": {"componentId": "ropeBridge", "regionId": "rope-and-aged-wood", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/03-rope-and-aged-wood.png", "bbox": {"x": 505, "y": 455, "width": 245, "height": 145}, "sourceWidth": 853, "sourceHeight": 1844, "loaderWarnings": [], "coverage": 0.0226}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "ropeBridge", "regionId": "rope-and-aged-wood", "materialId": "wood.unfinished", "family": "wood", "subtype": "generic", "finish": "unfinished", "aliases": ["rope", "aged wood", "bridge planks"], "confidence": 0.76, "source": "source-crop"}, "alternatives": []}, "qualityTier": "reference-derived", "color": "#857F46", "albedo": {"dominant": "#857F46", "secondary": ["#5C785A", "#4C7370", "#4C4415", "#2A3322"], "samplingNotes": "Derived from admitted Island 018 source material crop; verify under neutral and reference lighting."}, "colorVariation": {"palette": ["#857F46", "#5C785A", "#4C7370", "#4C4415", "#2A3322"], "pattern": "source-derived mottled zones with vertical value gradients", "amplitude": 0.28, "heightCorrelation": 0.36}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.34, "role": "broad light/dark breakup and large moss or water-gradient zones"}, {"id": "meso", "frequency": 13.0, "amplitude": 0.18, "role": "stone chips, leaf clumps, rope fibers, plank splits, foam streaks, or brass patina islands"}, {"id": "micro", "frequency": 58.0, "amplitude": 0.055, "role": "grazing-highlight breakup from pores, scratches, veins, pitting, and fine foam"}], "normal": {"pattern": "source-derived height gradients plus procedural meso/micro relief", "strength": 0.38, "scale": 28.0, "space": "tangent", "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-03-rope-and-aged-wood/ropeandagedwood_normal.png"}, "bump": {"pattern": "fine reference-noise bump layered below normal map", "amplitude": 0.025, "scale": 44.0}, "ambientOcclusion": {"map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-03-rope-and-aged-wood/ropeandagedwood_ao.png", "cavityStrength": 0.34, "contactShadowBias": 0.42, "notes": "Use darker response under overlapping leaves, stone block seams, stair risers, bridge contacts, and prop bases."}, "wear": {"edgeWear": 0.18, "scratches": ["small directional breakup on exposed edges"], "chips": []}, "dirt": {"amount": 0.22, "cavityBias": 0.54, "color": "#1B170D"}, "localOverrides": [{"id": "rope-fiber-striations", "kind": "ridge", "mask": "rope-fiber-striations-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.18}, {"id": "weathered-plank-splits", "kind": "groove", "mask": "weathered-plank-splits-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.18}]},
    options
  );
  materialMap["agedBrassTrim"] = createSculptMaterial(
    "agedBrassTrim",
    {"id": "agedBrassTrim", "baseColor": "#48430D", "referenceMaterialId": "metal.brass", "materialFamily": "metal", "materialSubtype": "brass-bronze", "materialFinish": "polished-or-aged", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "metal.brass", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-standard", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-2", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "aoMap", "metalnessMap"], "validationViews": ["albedo-unlit", "environment-reflection", "grazing", "reference-beauty"]}, "metalness": {"base": 0.68, "variation": 0.08}, "roughness": {"base": 0.42, "variation": 0.12, "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-04-aged-gold-brass-trim/agedbrasstrim_roughness.png", "localResponse": "Roughness is independently varied from albedo; cavities/moss/crevices rougher, polished wet or gem edges lower."}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [1, 1], "anisotropy": 8, "colorSpace": "SRGBColorSpace for albedo; NoColorSpace for scalar/normal maps", "mapBindings": ["map", "roughnessMap"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/04-aged-gold-brass-trim.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.68, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-04-aged-gold-brass-trim/agedbrasstrim_albedo.png", "url": "agedbrasstrim_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-04-aged-gold-brass-trim/agedbrasstrim_roughness.png", "url": "agedbrasstrim_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-04-aged-gold-brass-trim/agedbrasstrim_height.png", "url": "agedbrasstrim_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-04-aged-gold-brass-trim/agedbrasstrim_normal.png", "url": "agedbrasstrim_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-04-aged-gold-brass-trim/agedbrasstrim_ao.png", "url": "agedbrasstrim_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 150, "sourceHeight": 165, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 150, "height": 165}, "mask": {"backgroundColor": "#413104", "backgroundNoise": 65.123, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9912}, "mapStats": {"valueRange": 0.7149, "heightP90Gradient": 0.18907, "roughnessBase": 0.805, "roughnessVariation": 0.18, "normalStrength": 0.378, "blurRadius": 10}, "palette": ["#252706", "#0D0F02", "#4A4810", "#957F24", "#D7C66E"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#48430D", "#50430C", "#474F20", "#4B4112", "#373A0E"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 62.8, "meanSaturation": 0.804, "gradientStrength": 0.317, "mottle": 0.132, "streakRatio": 1.04, "hueSpread": 0.076, "specularFraction": 0.008}}, "materialEvidence": {"componentId": "ruinTrimAndRelics", "regionId": "aged-gold-brass-trim", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/04-aged-gold-brass-trim.png", "bbox": {"x": 350, "y": 560, "width": 150, "height": 165}, "sourceWidth": 853, "sourceHeight": 1844, "loaderWarnings": [], "coverage": 0.0157}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "ruinTrimAndRelics", "regionId": "aged-gold-brass-trim", "materialId": "metal.brass", "family": "metal", "subtype": "brass-bronze", "finish": "polished-or-aged", "aliases": [], "confidence": 0.78, "source": "source-crop"}, "alternatives": []}, "needsEnvironment": true, "qualityTier": "reference-derived", "color": "#48430D", "albedo": {"dominant": "#48430D", "secondary": ["#50430C", "#474F20", "#4B4112", "#373A0E"], "samplingNotes": "Derived from admitted Island 018 source material crop; verify under neutral and reference lighting."}, "colorVariation": {"palette": ["#48430D", "#50430C", "#474F20", "#4B4112", "#373A0E"], "pattern": "source-derived mottled zones with vertical value gradients", "amplitude": 0.28, "heightCorrelation": 0.36}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.34, "role": "broad light/dark breakup and large moss or water-gradient zones"}, {"id": "meso", "frequency": 13.0, "amplitude": 0.18, "role": "stone chips, leaf clumps, rope fibers, plank splits, foam streaks, or brass patina islands"}, {"id": "micro", "frequency": 58.0, "amplitude": 0.055, "role": "grazing-highlight breakup from pores, scratches, veins, pitting, and fine foam"}], "normal": {"pattern": "source-derived height gradients plus procedural meso/micro relief", "strength": 0.18, "scale": 28.0, "space": "tangent", "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-04-aged-gold-brass-trim/agedbrasstrim_normal.png"}, "bump": {"pattern": "fine reference-noise bump layered below normal map", "amplitude": 0.025, "scale": 44.0}, "ambientOcclusion": {"map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-04-aged-gold-brass-trim/agedbrasstrim_ao.png", "cavityStrength": 0.24, "contactShadowBias": 0.42, "notes": "Use darker response under overlapping leaves, stone block seams, stair risers, bridge contacts, and prop bases."}, "wear": {"edgeWear": 0.18, "scratches": ["small directional breakup on exposed edges"], "chips": []}, "dirt": {"amount": 0.22, "cavityBias": 0.54, "color": "#1B170D"}, "localOverrides": [{"id": "green-patina-crevices", "kind": "stain", "mask": "green-patina-crevices-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.05}, {"id": "bright-worn-rims", "kind": "gloss", "mask": "bright-worn-rims-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": -0.18, "normalScaleDelta": 0.05}]},
    options
  );
  materialMap["amberRuinLight"] = createSculptMaterial(
    "amberRuinLight",
    {"id": "amberRuinLight", "baseColor": "#46380D", "referenceMaterialId": "glass.clear", "materialFamily": "glass", "materialSubtype": "clear", "materialFinish": "polished", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "glass.clear", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "three.pmrem", "gltf.2", "khronos.transmission", "khronos.volume", "google.filament-pbr"], "requiredMaps": ["roughnessMap", "thicknessMap"], "optionalMaps": ["map", "normalMap", "transmissionMap"], "validationViews": ["neutral-studio", "environment-reflection", "backlight-transmission", "reference-beauty"]}, "metalness": {"base": 0.0, "variation": 0.0}, "roughness": {"base": 0.34, "variation": 0.12, "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_roughness.png", "localResponse": "Roughness is independently varied from albedo; cavities/moss/crevices rougher, polished wet or gem edges lower."}, "transmission": {"base": 1.0, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [1, 1], "anisotropy": 8, "colorSpace": "SRGBColorSpace for albedo; NoColorSpace for scalar/normal maps", "mapBindings": ["roughnessMap", "thicknessMap"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/05-amber-window-and-torch-glow.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.68, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_albedo.png", "url": "amberruinlight_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_roughness.png", "url": "amberruinlight_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_height.png", "url": "amberruinlight_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_normal.png", "url": "amberruinlight_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_ao.png", "url": "amberruinlight_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 150, "sourceHeight": 150, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 150, "height": 150}, "mask": {"backgroundColor": "#91711D", "backgroundNoise": 145.942, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9877}, "mapStats": {"valueRange": 0.6677, "heightP90Gradient": 0.1839, "roughnessBase": 0.803, "roughnessVariation": 0.177, "normalStrength": 0.372, "blurRadius": 10}, "palette": ["#252808", "#0F1103", "#46400B", "#89731B", "#CEBA57"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#46380D", "#4B4307", "#424C1C", "#35320B", "#8A7B31"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 62.2, "meanSaturation": 0.801, "gradientStrength": 0.388, "mottle": 0.126, "streakRatio": 1.1, "hueSpread": 0.063, "specularFraction": 0.006}}, "materialEvidence": {"componentId": "ruinLight", "regionId": "amber-window-and-torch-glow", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/05-amber-window-and-torch-glow.png", "bbox": {"x": 330, "y": 505, "width": 150, "height": 150}, "sourceWidth": 853, "sourceHeight": 1844, "loaderWarnings": [], "coverage": 0.0143}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "ruinLight", "regionId": "amber-window-and-torch-glow", "materialId": "glass.clear", "family": "glass", "subtype": "clear", "finish": "polished", "aliases": ["emissive amber glass", "torch glow"], "confidence": 0.74, "source": "adapted-registry-prior"}, "alternatives": []}, "needsEnvironment": true, "qualityTier": "reference-derived", "color": "#46380D", "albedo": {"dominant": "#46380D", "secondary": ["#4B4307", "#424C1C", "#35320B", "#8A7B31"], "samplingNotes": "Derived from admitted Island 018 source material crop; verify under neutral and reference lighting."}, "colorVariation": {"palette": ["#46380D", "#4B4307", "#424C1C", "#35320B", "#8A7B31"], "pattern": "source-derived mottled zones with vertical value gradients", "amplitude": 0.28, "heightCorrelation": 0.36}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.34, "role": "broad light/dark breakup and large moss or water-gradient zones"}, {"id": "meso", "frequency": 13.0, "amplitude": 0.18, "role": "stone chips, leaf clumps, rope fibers, plank splits, foam streaks, or brass patina islands"}, {"id": "micro", "frequency": 58.0, "amplitude": 0.055, "role": "grazing-highlight breakup from pores, scratches, veins, pitting, and fine foam"}], "normal": {"pattern": "source-derived height gradients plus procedural meso/micro relief", "strength": 0.08, "scale": 28.0, "space": "tangent", "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_normal.png"}, "bump": {"pattern": "fine reference-noise bump layered below normal map", "amplitude": 0.025, "scale": 44.0}, "ambientOcclusion": {"map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_ao.png", "cavityStrength": 0.1, "contactShadowBias": 0.42, "notes": "Use darker response under overlapping leaves, stone block seams, stair risers, bridge contacts, and prop bases."}, "wear": {"edgeWear": 0.06, "scratches": ["small directional breakup on exposed edges"], "chips": []}, "dirt": {"amount": 0.22, "cavityBias": 0.54, "color": "#1B170D"}, "emissive": {"color": "#F4A33A", "intensity": 1.25, "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-05-amber-window-and-torch-glow/amberruinlight_albedo.png"}, "localOverrides": [{"id": "amber-window-core", "kind": "emissive", "mask": "amber-window-core-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.05}, {"id": "torch-smoke-edge", "kind": "stain", "mask": "torch-smoke-edge-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.05}]},
    options
  );
  materialMap["emeraldEggCrystal"] = createSculptMaterial(
    "emeraldEggCrystal",
    {"id": "emeraldEggCrystal", "baseColor": "#283E1C", "referenceMaterialId": "gemstone.quartz", "materialFamily": "gemstone", "materialSubtype": "quartz-like", "materialFinish": "polished", "materialReference": {"registry": "/Users/ejmac/.codex/skills/img2threejs/docs/materials/material-reference.json", "profileId": "gemstone.quartz", "method": "explicit-material-id", "confidence": 1.0, "sourceRefs": ["three.mesh-physical", "three.pmrem", "gltf.2", "khronos.transmission", "khronos.volume", "google.filament-pbr"], "requiredMaps": ["roughnessMap", "thicknessMap"], "optionalMaps": ["map", "normalMap", "transmissionMap"], "validationViews": ["neutral-studio", "environment-reflection", "backlight-transmission", "reference-beauty"]}, "metalness": {"base": 0.0, "variation": 0.0}, "roughness": {"base": 0.3, "variation": 0.12, "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-06-green-egg-and-emerald-crystal/emeraldeggcrystal_roughness.png", "localResponse": "Roughness is independently varied from albedo; cavities/moss/crevices rougher, polished wet or gem edges lower."}, "transmission": {"base": 0.9, "variation": 0.0}, "ior": {"base": 1.54, "variation": 0.0}, "dispersion": {"base": 0.0, "variation": 0.0}, "textureResolution": 1024, "textureProjection": {"mode": "uv", "repeat": [1, 1], "anisotropy": 8, "colorSpace": "SRGBColorSpace for albedo; NoColorSpace for scalar/normal maps", "mapBindings": ["roughnessMap", "thicknessMap"]}, "referencePbr": {"version": "1.0", "sourceImage": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/06-green-egg-and-emerald-crystal.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.68, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-06-green-egg-and-emerald-crystal/emeraldeggcrystal_albedo.png", "url": "emeraldeggcrystal_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-06-green-egg-and-emerald-crystal/emeraldeggcrystal_roughness.png", "url": "emeraldeggcrystal_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-06-green-egg-and-emerald-crystal/emeraldeggcrystal_height.png", "url": "emeraldeggcrystal_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-06-green-egg-and-emerald-crystal/emeraldeggcrystal_normal.png", "url": "emeraldeggcrystal_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-06-green-egg-and-emerald-crystal/emeraldeggcrystal_ao.png", "url": "emeraldeggcrystal_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 95, "sourceHeight": 185, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 95, "height": 185}, "mask": {"backgroundColor": "#2C3612", "backgroundNoise": 59.414, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9854}, "mapStats": {"valueRange": 0.6972, "heightP90Gradient": 0.19718, "roughnessBase": 0.825, "roughnessVariation": 0.203, "normalStrength": 0.387, "blurRadius": 10}, "palette": ["#0C170B", "#5C5D23", "#2E3111", "#9C8D31", "#C9C38D"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "candy-coat", "recipe": {"metalness": 0.35, "roughness": 0.18, "clearcoat": 0.6, "clearcoatRoughness": 0.15, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "gradient-smoke"}, "palette": ["#283E1C", "#605B3A", "#626736", "#4D471F", "#404230"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 71.5, "meanSaturation": 0.637, "gradientStrength": 0.382, "mottle": 0.112, "streakRatio": 0.72, "hueSpread": 0.219, "specularFraction": 0.007}}, "materialEvidence": {"componentId": "explorerNest", "regionId": "green-egg-and-emerald-crystal", "crop": {"path": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/06-green-egg-and-emerald-crystal.png", "bbox": {"x": 35, "y": 1200, "width": 95, "height": 185}, "sourceWidth": 853, "sourceHeight": 1844, "loaderWarnings": [], "coverage": 0.0112}, "observations": ["chromatic base-colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "explorerNest", "regionId": "green-egg-and-emerald-crystal", "materialId": "gemstone.quartz", "family": "gemstone", "subtype": "quartz-like", "finish": "polished", "aliases": ["emerald egg", "green crystal"], "confidence": 0.82, "source": "source-crop"}, "alternatives": []}, "needsEnvironment": true, "qualityTier": "reference-derived", "color": "#283E1C", "albedo": {"dominant": "#283E1C", "secondary": ["#605B3A", "#626736", "#4D471F", "#404230"], "samplingNotes": "Derived from admitted Island 018 source material crop; verify under neutral and reference lighting."}, "colorVariation": {"palette": ["#283E1C", "#605B3A", "#626736", "#4D471F", "#404230"], "pattern": "source-derived mottled zones with vertical value gradients", "amplitude": 0.28, "heightCorrelation": 0.36}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 2.0, "amplitude": 0.34, "role": "broad light/dark breakup and large moss or water-gradient zones"}, {"id": "meso", "frequency": 13.0, "amplitude": 0.18, "role": "stone chips, leaf clumps, rope fibers, plank splits, foam streaks, or brass patina islands"}, {"id": "micro", "frequency": 58.0, "amplitude": 0.055, "role": "grazing-highlight breakup from pores, scratches, veins, pitting, and fine foam"}], "normal": {"pattern": "source-derived height gradients plus procedural meso/micro relief", "strength": 0.24, "scale": 28.0, "space": "tangent", "map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-06-green-egg-and-emerald-crystal/emeraldeggcrystal_normal.png"}, "bump": {"pattern": "fine reference-noise bump layered below normal map", "amplitude": 0.025, "scale": 44.0}, "ambientOcclusion": {"map": "/Users/ejmac/Documents/Mini Project - iOS and Adroid capcitor/.img2threejs/island-018-jungle-expedition/material-evidence/pbr-06-green-egg-and-emerald-crystal/emeraldeggcrystal_ao.png", "cavityStrength": 0.14, "contactShadowBias": 0.42, "notes": "Use darker response under overlapping leaves, stone block seams, stair risers, bridge contacts, and prop bases."}, "wear": {"edgeWear": 0.06, "scratches": ["small directional breakup on exposed edges"], "chips": []}, "dirt": {"amount": 0.22, "cavityBias": 0.54, "color": "#1B170D"}, "clearcoat": {"base": 0.38, "variation": 0.12}, "localOverrides": [{"id": "egg-scale-contours", "kind": "contour", "mask": "egg-scale-contours-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": 0.12, "normalScaleDelta": 0.18}, {"id": "gem-highlight-facets", "kind": "gloss", "mask": "gem-highlight-facets-source-linked-mask", "evidenceRefs": ["full-object"], "roughnessDelta": -0.18, "normalScaleDelta": 0.05}]},
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
  node_root_0.name = "Island 018 Jungle Expedition rig pivot__pivot";
  node_root_0.scale.set(1, 1, 1);
  if (endpoint_root_0) {
    node_root_0.position.copy(endpoint_root_0.start);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_root_0.position.set(0.0, 0.0, 0.0);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  }
  node_root_0.userData.sculptComponent = {"id": "root", "name": "Island 018 Jungle Expedition rig pivot", "level": "macro", "role": "body", "importance": 0.2, "confidence": 0.9, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Tiny generated pivot marker only; visible island mass is authored in child components so the root rig does not occlude the blockout.", "geometryDescriptor": {"topologyIntent": "Procedural Island 018 Jungle Expedition root rig matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": null, "attachment": null, "dimensions": {"width": 0.05, "height": 0.05, "depth": 0.05, "units": "relative", "confidence": 0.9}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [0.05, 0.05, 0.05]}, "actionProfile": {"animationRole": "body", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "body", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "world-layer-stack", "kind": "contour", "notes": "Overall stacked vertical island silhouette from source."}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Root is a rig marker, not a visible island surface."}, "evidenceRefs": ["full-object"], "details": ["non-render-identity-root"], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_root_0.userData.actionProfile = {"animationRole": "body", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "body", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["root"] ?? root).add(node_root_0);
  nodes["root"] = node_root_0;
  const mesh_root_0Geometry = endpoint_root_0
    ? new THREE.CylinderGeometry(endpoint_root_0.endRadius, endpoint_root_0.baseRadius, endpoint_root_0.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_root_0) {
    mesh_root_0Geometry.scale(0.05, 0.05, 0.05);
  }
  const mesh_root_0 = new THREE.Mesh(
    mesh_root_0Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_root_0.name = "Island 018 Jungle Expedition rig pivot";
  if (endpoint_root_0) {
    mesh_root_0.position.copy(endpoint_root_0.midpoint);
    mesh_root_0.quaternion.copy(endpoint_root_0.quaternion);
  }
  mesh_root_0.castShadow = options.castShadow ?? true;
  mesh_root_0.receiveShadow = options.receiveShadow ?? true;
  mesh_root_0.userData.sculptComponent = {"id": "root", "name": "Island 018 Jungle Expedition rig pivot", "level": "macro", "role": "body", "importance": 0.2, "confidence": 0.9, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Tiny generated pivot marker only; visible island mass is authored in child components so the root rig does not occlude the blockout.", "geometryDescriptor": {"topologyIntent": "Procedural Island 018 Jungle Expedition root rig matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": null, "attachment": null, "dimensions": {"width": 0.05, "height": 0.05, "depth": 0.05, "units": "relative", "confidence": 0.9}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [0.05, 0.05, 0.05]}, "actionProfile": {"animationRole": "body", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "body", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "world-layer-stack", "kind": "contour", "notes": "Overall stacked vertical island silhouette from source."}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Root is a rig marker, not a visible island surface."}, "evidenceRefs": ["full-object"], "details": ["non-render-identity-root"], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_root_0.add(mesh_root_0);
  meshes["root"] = mesh_root_0;
  colliders["root"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["body"] ??= [];
  destructionGroups["body"].push(node_root_0);

  const attachment_mainFloatingCliff_1 = null;
  const endpoint_mainFloatingCliff_1 = makeAttachmentEndpoint(attachment_mainFloatingCliff_1);
  const node_mainFloatingCliff_1 = new THREE.Group();
  node_mainFloatingCliff_1.name = "Tapered mossy floating cliff mass__pivot";
  node_mainFloatingCliff_1.scale.set(1, 1, 1);
  if (endpoint_mainFloatingCliff_1) {
    node_mainFloatingCliff_1.position.copy(endpoint_mainFloatingCliff_1.start);
    node_mainFloatingCliff_1.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_mainFloatingCliff_1.position.set(0.0, -1.2, 0.0);
    node_mainFloatingCliff_1.rotation.set(0.0, 0.0, 0.0);
  }
  node_mainFloatingCliff_1.userData.sculptComponent = {"id": "mainFloatingCliff", "name": "Tapered mossy floating cliff mass", "level": "macro", "role": "terrain", "importance": 0.86, "confidence": 0.78, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Tapered mossy floating cliff mass reads as terrain with material/shape identity visible in full-object, waterfall-depth.", "geometryDescriptor": {"topologyIntent": "Procedural Tapered mossy floating cliff mass matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 5.6, "height": 2.7, "depth": 4.3, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, -1.2, 0], "rotation": [0, 0, 0], "scale": [5.6, 2.7, 4.3]}, "actionProfile": {"animationRole": "terrain", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "terrain", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "undercut-cliff-silhouette", "kind": "contour"}, {"id": "wet-rock-shadow-bands", "kind": "stain"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["full-object", "waterfall-depth"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_mainFloatingCliff_1.userData.actionProfile = {"animationRole": "terrain", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "terrain", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["root"] ?? root).add(node_mainFloatingCliff_1);
  nodes["mainFloatingCliff"] = node_mainFloatingCliff_1;
  const mesh_mainFloatingCliff_1Geometry = endpoint_mainFloatingCliff_1
    ? new THREE.CylinderGeometry(endpoint_mainFloatingCliff_1.endRadius, endpoint_mainFloatingCliff_1.baseRadius, endpoint_mainFloatingCliff_1.length, 32, 12)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_mainFloatingCliff_1) {
    mesh_mainFloatingCliff_1Geometry.scale(5.6, 2.7, 4.3);
  }
  const mesh_mainFloatingCliff_1 = new THREE.Mesh(
    mesh_mainFloatingCliff_1Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_mainFloatingCliff_1.name = "Tapered mossy floating cliff mass";
  if (endpoint_mainFloatingCliff_1) {
    mesh_mainFloatingCliff_1.position.copy(endpoint_mainFloatingCliff_1.midpoint);
    mesh_mainFloatingCliff_1.quaternion.copy(endpoint_mainFloatingCliff_1.quaternion);
  }
  mesh_mainFloatingCliff_1.castShadow = options.castShadow ?? true;
  mesh_mainFloatingCliff_1.receiveShadow = options.receiveShadow ?? true;
  mesh_mainFloatingCliff_1.userData.sculptComponent = {"id": "mainFloatingCliff", "name": "Tapered mossy floating cliff mass", "level": "macro", "role": "terrain", "importance": 0.86, "confidence": 0.78, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Tapered mossy floating cliff mass reads as terrain with material/shape identity visible in full-object, waterfall-depth.", "geometryDescriptor": {"topologyIntent": "Procedural Tapered mossy floating cliff mass matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 5.6, "height": 2.7, "depth": 4.3, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, -1.2, 0], "rotation": [0, 0, 0], "scale": [5.6, 2.7, 4.3]}, "actionProfile": {"animationRole": "terrain", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "terrain", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "undercut-cliff-silhouette", "kind": "contour"}, {"id": "wet-rock-shadow-bands", "kind": "stain"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["full-object", "waterfall-depth"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_mainFloatingCliff_1.add(mesh_mainFloatingCliff_1);
  meshes["mainFloatingCliff"] = mesh_mainFloatingCliff_1;
  colliders["mainFloatingCliff"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["terrain"] ??= [];
  destructionGroups["terrain"].push(node_mainFloatingCliff_1);

  const attachment_lostCityTemple_2 = null;
  const endpoint_lostCityTemple_2 = makeAttachmentEndpoint(attachment_lostCityTemple_2);
  const node_lostCityTemple_2 = new THREE.Group();
  node_lostCityTemple_2.name = "Central lost city temple stack__pivot";
  node_lostCityTemple_2.scale.set(1, 1, 1);
  if (endpoint_lostCityTemple_2) {
    node_lostCityTemple_2.position.copy(endpoint_lostCityTemple_2.start);
    node_lostCityTemple_2.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_lostCityTemple_2.position.set(0.0, 1.0, 0.0);
    node_lostCityTemple_2.rotation.set(0.0, 0.0, 0.0);
  }
  node_lostCityTemple_2.userData.sculptComponent = {"id": "lostCityTemple", "name": "Central lost city temple stack", "level": "macro", "role": "architecture", "importance": 0.35, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Tiny generated container pivot for Central lost city temple stack; visible identity is represented by child components in the same source-evidence region.", "geometryDescriptor": {"topologyIntent": "Procedural Central lost city temple stack matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 0.05, "height": 0.05, "depth": 0.05, "units": "relative", "confidence": 0.88}, "transform": {"position": [0, 1.0, 0], "rotation": [0, 0, 0], "scale": [0.05, 0.05, 0.05]}, "actionProfile": {"animationRole": "architecture", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "stepped-temple-tier-stack", "kind": "contour"}, {"id": "amber-glowing-entries", "kind": "emissive"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Container pivot only; child components hold visible mass."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_lostCityTemple_2.userData.actionProfile = {"animationRole": "architecture", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["root"] ?? root).add(node_lostCityTemple_2);
  nodes["lostCityTemple"] = node_lostCityTemple_2;
  const mesh_lostCityTemple_2Geometry = endpoint_lostCityTemple_2
    ? new THREE.CylinderGeometry(endpoint_lostCityTemple_2.endRadius, endpoint_lostCityTemple_2.baseRadius, endpoint_lostCityTemple_2.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_lostCityTemple_2) {
    mesh_lostCityTemple_2Geometry.scale(0.05, 0.05, 0.05);
  }
  const mesh_lostCityTemple_2 = new THREE.Mesh(
    mesh_lostCityTemple_2Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_lostCityTemple_2.name = "Central lost city temple stack";
  if (endpoint_lostCityTemple_2) {
    mesh_lostCityTemple_2.position.copy(endpoint_lostCityTemple_2.midpoint);
    mesh_lostCityTemple_2.quaternion.copy(endpoint_lostCityTemple_2.quaternion);
  }
  mesh_lostCityTemple_2.castShadow = options.castShadow ?? true;
  mesh_lostCityTemple_2.receiveShadow = options.receiveShadow ?? true;
  mesh_lostCityTemple_2.userData.sculptComponent = {"id": "lostCityTemple", "name": "Central lost city temple stack", "level": "macro", "role": "architecture", "importance": 0.35, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Tiny generated container pivot for Central lost city temple stack; visible identity is represented by child components in the same source-evidence region.", "geometryDescriptor": {"topologyIntent": "Procedural Central lost city temple stack matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 0.05, "height": 0.05, "depth": 0.05, "units": "relative", "confidence": 0.88}, "transform": {"position": [0, 1.0, 0], "rotation": [0, 0, 0], "scale": [0.05, 0.05, 0.05]}, "actionProfile": {"animationRole": "architecture", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "stepped-temple-tier-stack", "kind": "contour"}, {"id": "amber-glowing-entries", "kind": "emissive"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Container pivot only; child components hold visible mass."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_lostCityTemple_2.add(mesh_lostCityTemple_2);
  meshes["lostCityTemple"] = mesh_lostCityTemple_2;
  colliders["lostCityTemple"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["architecture"] ??= [];
  destructionGroups["architecture"].push(node_lostCityTemple_2);

  const attachment_boardTerrainCorridor_3 = null;
  const endpoint_boardTerrainCorridor_3 = makeAttachmentEndpoint(attachment_boardTerrainCorridor_3);
  const node_boardTerrainCorridor_3 = new THREE.Group();
  node_boardTerrainCorridor_3.name = "Circular elevated stone board corridor__pivot";
  node_boardTerrainCorridor_3.scale.set(1, 1, 1);
  if (endpoint_boardTerrainCorridor_3) {
    node_boardTerrainCorridor_3.position.copy(endpoint_boardTerrainCorridor_3.start);
    node_boardTerrainCorridor_3.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_boardTerrainCorridor_3.position.set(0.0, 0.2, 0.0);
    node_boardTerrainCorridor_3.rotation.set(0.0, 0.0, 0.0);
  }
  node_boardTerrainCorridor_3.userData.sculptComponent = {"id": "boardTerrainCorridor", "name": "Circular elevated stone board corridor", "level": "macro", "role": "pathway", "importance": 0.86, "confidence": 0.78, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Circular elevated stone board corridor reads as pathway with material/shape identity visible in board-ring.", "geometryDescriptor": {"topologyIntent": "Procedural Circular elevated stone board corridor matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 5.2, "height": 0.32, "depth": 5.2, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 0.2, 0], "rotation": [0, 0, 0], "scale": [5.2, 0.32, 5.2]}, "actionProfile": {"animationRole": "pathway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "pathway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "quiet-live-board-corridor", "kind": "decal"}, {"id": "stone-slab-rim-bevels", "kind": "bevel"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["board-ring"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_boardTerrainCorridor_3.userData.actionProfile = {"animationRole": "pathway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "pathway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["root"] ?? root).add(node_boardTerrainCorridor_3);
  nodes["boardTerrainCorridor"] = node_boardTerrainCorridor_3;
  const mesh_boardTerrainCorridor_3Geometry = endpoint_boardTerrainCorridor_3
    ? new THREE.CylinderGeometry(endpoint_boardTerrainCorridor_3.endRadius, endpoint_boardTerrainCorridor_3.baseRadius, endpoint_boardTerrainCorridor_3.length, 32, 12)
    : new THREE.TorusGeometry(0.45, 0.08, 24, 96);
  if (!endpoint_boardTerrainCorridor_3) {
    mesh_boardTerrainCorridor_3Geometry.scale(5.2, 0.32, 5.2);
  }
  const mesh_boardTerrainCorridor_3 = new THREE.Mesh(
    mesh_boardTerrainCorridor_3Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_boardTerrainCorridor_3.name = "Circular elevated stone board corridor";
  if (endpoint_boardTerrainCorridor_3) {
    mesh_boardTerrainCorridor_3.position.copy(endpoint_boardTerrainCorridor_3.midpoint);
    mesh_boardTerrainCorridor_3.quaternion.copy(endpoint_boardTerrainCorridor_3.quaternion);
  }
  mesh_boardTerrainCorridor_3.castShadow = options.castShadow ?? true;
  mesh_boardTerrainCorridor_3.receiveShadow = options.receiveShadow ?? true;
  mesh_boardTerrainCorridor_3.userData.sculptComponent = {"id": "boardTerrainCorridor", "name": "Circular elevated stone board corridor", "level": "macro", "role": "pathway", "importance": 0.86, "confidence": 0.78, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Circular elevated stone board corridor reads as pathway with material/shape identity visible in board-ring.", "geometryDescriptor": {"topologyIntent": "Procedural Circular elevated stone board corridor matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 5.2, "height": 0.32, "depth": 5.2, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 0.2, 0], "rotation": [0, 0, 0], "scale": [5.2, 0.32, 5.2]}, "actionProfile": {"animationRole": "pathway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "pathway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "quiet-live-board-corridor", "kind": "decal"}, {"id": "stone-slab-rim-bevels", "kind": "bevel"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["board-ring"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_boardTerrainCorridor_3.add(mesh_boardTerrainCorridor_3);
  meshes["boardTerrainCorridor"] = mesh_boardTerrainCorridor_3;
  colliders["boardTerrainCorridor"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["pathway"] ??= [];
  destructionGroups["pathway"].push(node_boardTerrainCorridor_3);

  const attachment_waterfallSystem_4 = null;
  const endpoint_waterfallSystem_4 = makeAttachmentEndpoint(attachment_waterfallSystem_4);
  const node_waterfallSystem_4 = new THREE.Group();
  node_waterfallSystem_4.name = "Tiered waterfall sheets and turquoise pools__pivot";
  node_waterfallSystem_4.scale.set(1, 1, 1);
  if (endpoint_waterfallSystem_4) {
    node_waterfallSystem_4.position.copy(endpoint_waterfallSystem_4.start);
    node_waterfallSystem_4.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_waterfallSystem_4.position.set(0.0, -0.6, 0.2);
    node_waterfallSystem_4.rotation.set(0.0, 0.0, 0.0);
  }
  node_waterfallSystem_4.userData.sculptComponent = {"id": "waterfallSystem", "name": "Tiered waterfall sheets and turquoise pools", "level": "macro", "role": "water-system", "importance": 0.86, "confidence": 0.78, "primitive": "plane-card", "topologyClass": "material-only", "topologyRationale": "material-only selected from visible Island 018 source evidence: Tiered waterfall sheets and turquoise pools reads as water-system with material/shape identity visible in waterfall-depth.", "geometryDescriptor": {"topologyIntent": "Procedural Tiered waterfall sheets and turquoise pools matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 5.3, "height": 3.2, "depth": 0.12, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, -0.6, 0.2], "rotation": [0, 0, 0], "scale": [5.3, 3.2, 0.12]}, "actionProfile": {"animationRole": "water-system", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "water-system", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "turquoiseWater", "materialLayers": ["turquoiseWater"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "waterfall-tier-system", "kind": "ridge"}, {"id": "turquoise-pool-depth", "kind": "gloss"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["waterfall-depth"], "details": [], "fidelityTier": "source-fidelity-prebuild"};
  node_waterfallSystem_4.userData.actionProfile = {"animationRole": "water-system", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "water-system", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["root"] ?? root).add(node_waterfallSystem_4);
  nodes["waterfallSystem"] = node_waterfallSystem_4;
  const mesh_waterfallSystem_4Geometry = endpoint_waterfallSystem_4
    ? new THREE.CylinderGeometry(endpoint_waterfallSystem_4.endRadius, endpoint_waterfallSystem_4.baseRadius, endpoint_waterfallSystem_4.length, 32, 12)
    : new THREE.PlaneGeometry(1, 1, 24, 24);
  if (!endpoint_waterfallSystem_4) {
    mesh_waterfallSystem_4Geometry.scale(5.3, 3.2, 0.12);
  }
  const mesh_waterfallSystem_4 = new THREE.Mesh(
    mesh_waterfallSystem_4Geometry,
    materialMap["turquoiseWater"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_waterfallSystem_4.name = "Tiered waterfall sheets and turquoise pools";
  if (endpoint_waterfallSystem_4) {
    mesh_waterfallSystem_4.position.copy(endpoint_waterfallSystem_4.midpoint);
    mesh_waterfallSystem_4.quaternion.copy(endpoint_waterfallSystem_4.quaternion);
  }
  mesh_waterfallSystem_4.castShadow = options.castShadow ?? true;
  mesh_waterfallSystem_4.receiveShadow = options.receiveShadow ?? true;
  mesh_waterfallSystem_4.userData.sculptComponent = {"id": "waterfallSystem", "name": "Tiered waterfall sheets and turquoise pools", "level": "macro", "role": "water-system", "importance": 0.86, "confidence": 0.78, "primitive": "plane-card", "topologyClass": "material-only", "topologyRationale": "material-only selected from visible Island 018 source evidence: Tiered waterfall sheets and turquoise pools reads as water-system with material/shape identity visible in waterfall-depth.", "geometryDescriptor": {"topologyIntent": "Procedural Tiered waterfall sheets and turquoise pools matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 5.3, "height": 3.2, "depth": 0.12, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, -0.6, 0.2], "rotation": [0, 0, 0], "scale": [5.3, 3.2, 0.12]}, "actionProfile": {"animationRole": "water-system", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "water-system", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "turquoiseWater", "materialLayers": ["turquoiseWater"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "waterfall-tier-system", "kind": "ridge"}, {"id": "turquoise-pool-depth", "kind": "gloss"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["waterfall-depth"], "details": [], "fidelityTier": "source-fidelity-prebuild"};
  node_waterfallSystem_4.add(mesh_waterfallSystem_4);
  meshes["waterfallSystem"] = mesh_waterfallSystem_4;
  colliders["waterfallSystem"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["water-system"] ??= [];
  destructionGroups["water-system"].push(node_waterfallSystem_4);

  const attachment_landmarkRing_5 = null;
  const endpoint_landmarkRing_5 = makeAttachmentEndpoint(attachment_landmarkRing_5);
  const node_landmarkRing_5 = new THREE.Group();
  node_landmarkRing_5.name = "Four side gameplay landmark platforms__pivot";
  node_landmarkRing_5.scale.set(1, 1, 1);
  if (endpoint_landmarkRing_5) {
    node_landmarkRing_5.position.copy(endpoint_landmarkRing_5.start);
    node_landmarkRing_5.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_landmarkRing_5.position.set(0.0, -0.2, 0.0);
    node_landmarkRing_5.rotation.set(0.0, 0.0, 0.0);
  }
  node_landmarkRing_5.userData.sculptComponent = {"id": "landmarkRing", "name": "Four side gameplay landmark platforms", "level": "macro", "role": "platform-set", "importance": 0.35, "confidence": 0.78, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Tiny generated container pivot for Four side gameplay landmark platforms; visible identity is represented by child components in the same source-evidence region.", "geometryDescriptor": {"topologyIntent": "Procedural Four side gameplay landmark platforms matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 0.05, "height": 0.05, "depth": 0.05, "units": "relative", "confidence": 0.88}, "transform": {"position": [0, -0.2, 0], "rotation": [0, 0, 0], "scale": [0.05, 0.05, 0.05]}, "actionProfile": {"animationRole": "platform-set", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "platform-set", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "four-landmark-platform-rhythm", "kind": "contour"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Container pivot only; child components hold visible mass."}, "evidenceRefs": ["hatchery-crop", "habit-crop", "mystery-crop", "wisdom-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_landmarkRing_5.userData.actionProfile = {"animationRole": "platform-set", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "platform-set", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["root"] ?? root).add(node_landmarkRing_5);
  nodes["landmarkRing"] = node_landmarkRing_5;
  const mesh_landmarkRing_5Geometry = endpoint_landmarkRing_5
    ? new THREE.CylinderGeometry(endpoint_landmarkRing_5.endRadius, endpoint_landmarkRing_5.baseRadius, endpoint_landmarkRing_5.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_landmarkRing_5) {
    mesh_landmarkRing_5Geometry.scale(0.05, 0.05, 0.05);
  }
  const mesh_landmarkRing_5 = new THREE.Mesh(
    mesh_landmarkRing_5Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_landmarkRing_5.name = "Four side gameplay landmark platforms";
  if (endpoint_landmarkRing_5) {
    mesh_landmarkRing_5.position.copy(endpoint_landmarkRing_5.midpoint);
    mesh_landmarkRing_5.quaternion.copy(endpoint_landmarkRing_5.quaternion);
  }
  mesh_landmarkRing_5.castShadow = options.castShadow ?? true;
  mesh_landmarkRing_5.receiveShadow = options.receiveShadow ?? true;
  mesh_landmarkRing_5.userData.sculptComponent = {"id": "landmarkRing", "name": "Four side gameplay landmark platforms", "level": "macro", "role": "platform-set", "importance": 0.35, "confidence": 0.78, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "Tiny generated container pivot for Four side gameplay landmark platforms; visible identity is represented by child components in the same source-evidence region.", "geometryDescriptor": {"topologyIntent": "Procedural Four side gameplay landmark platforms matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 0.05, "height": 0.05, "depth": 0.05, "units": "relative", "confidence": 0.88}, "transform": {"position": [0, -0.2, 0], "rotation": [0, 0, 0], "scale": [0.05, 0.05, 0.05]}, "actionProfile": {"animationRole": "platform-set", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "platform-set", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "four-landmark-platform-rhythm", "kind": "contour"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Container pivot only; child components hold visible mass."}, "evidenceRefs": ["hatchery-crop", "habit-crop", "mystery-crop", "wisdom-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_landmarkRing_5.add(mesh_landmarkRing_5);
  meshes["landmarkRing"] = mesh_landmarkRing_5;
  colliders["landmarkRing"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["platform-set"] ??= [];
  destructionGroups["platform-set"].push(node_landmarkRing_5);

  const attachment_backgroundDepthIslands_6 = null;
  const endpoint_backgroundDepthIslands_6 = makeAttachmentEndpoint(attachment_backgroundDepthIslands_6);
  const node_backgroundDepthIslands_6 = new THREE.Group();
  node_backgroundDepthIslands_6.name = "Distant jungle ruin depth islands__pivot";
  node_backgroundDepthIslands_6.scale.set(1, 1, 1);
  if (endpoint_backgroundDepthIslands_6) {
    node_backgroundDepthIslands_6.position.copy(endpoint_backgroundDepthIslands_6.start);
    node_backgroundDepthIslands_6.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_backgroundDepthIslands_6.position.set(0.0, 0.0, -2.6);
    node_backgroundDepthIslands_6.rotation.set(0.0, 0.0, 0.0);
  }
  node_backgroundDepthIslands_6.userData.sculptComponent = {"id": "backgroundDepthIslands", "name": "Distant jungle ruin depth islands", "level": "macro", "role": "background-depth", "importance": 0.86, "confidence": 0.78, "primitive": "plane-card", "topologyClass": "material-only", "topologyRationale": "material-only selected from visible Island 018 source evidence: Distant jungle ruin depth islands reads as background-depth with material/shape identity visible in full-object, waterfall-depth.", "geometryDescriptor": {"topologyIntent": "Procedural Distant jungle ruin depth islands matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 7.0, "height": 4.5, "depth": 0.08, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 0, -2.6], "rotation": [0, 0, 0], "scale": [7.0, 4.5, 0.08]}, "actionProfile": {"animationRole": "background-depth", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "background-depth", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "emeraldLeafCards", "materialLayers": ["emeraldLeafCards"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "blue-sky-depth-cutouts", "kind": "decal"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["full-object", "waterfall-depth"], "details": [], "fidelityTier": "source-fidelity-prebuild"};
  node_backgroundDepthIslands_6.userData.actionProfile = {"animationRole": "background-depth", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "background-depth", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["root"] ?? root).add(node_backgroundDepthIslands_6);
  nodes["backgroundDepthIslands"] = node_backgroundDepthIslands_6;
  const mesh_backgroundDepthIslands_6Geometry = endpoint_backgroundDepthIslands_6
    ? new THREE.CylinderGeometry(endpoint_backgroundDepthIslands_6.endRadius, endpoint_backgroundDepthIslands_6.baseRadius, endpoint_backgroundDepthIslands_6.length, 32, 12)
    : new THREE.PlaneGeometry(1, 1, 24, 24);
  if (!endpoint_backgroundDepthIslands_6) {
    mesh_backgroundDepthIslands_6Geometry.scale(7.0, 4.5, 0.08);
  }
  const mesh_backgroundDepthIslands_6 = new THREE.Mesh(
    mesh_backgroundDepthIslands_6Geometry,
    materialMap["emeraldLeafCards"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_backgroundDepthIslands_6.name = "Distant jungle ruin depth islands";
  if (endpoint_backgroundDepthIslands_6) {
    mesh_backgroundDepthIslands_6.position.copy(endpoint_backgroundDepthIslands_6.midpoint);
    mesh_backgroundDepthIslands_6.quaternion.copy(endpoint_backgroundDepthIslands_6.quaternion);
  }
  mesh_backgroundDepthIslands_6.castShadow = options.castShadow ?? true;
  mesh_backgroundDepthIslands_6.receiveShadow = options.receiveShadow ?? true;
  mesh_backgroundDepthIslands_6.userData.sculptComponent = {"id": "backgroundDepthIslands", "name": "Distant jungle ruin depth islands", "level": "macro", "role": "background-depth", "importance": 0.86, "confidence": 0.78, "primitive": "plane-card", "topologyClass": "material-only", "topologyRationale": "material-only selected from visible Island 018 source evidence: Distant jungle ruin depth islands reads as background-depth with material/shape identity visible in full-object, waterfall-depth.", "geometryDescriptor": {"topologyIntent": "Procedural Distant jungle ruin depth islands matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": null, "dimensions": {"width": 7.0, "height": 4.5, "depth": 0.08, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 0, -2.6], "rotation": [0, 0, 0], "scale": [7.0, 4.5, 0.08]}, "actionProfile": {"animationRole": "background-depth", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "background-depth", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "emeraldLeafCards", "materialLayers": ["emeraldLeafCards"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "blue-sky-depth-cutouts", "kind": "decal"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["full-object", "waterfall-depth"], "details": [], "fidelityTier": "source-fidelity-prebuild"};
  node_backgroundDepthIslands_6.add(mesh_backgroundDepthIslands_6);
  meshes["backgroundDepthIslands"] = mesh_backgroundDepthIslands_6;
  colliders["backgroundDepthIslands"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["background-depth"] ??= [];
  destructionGroups["background-depth"].push(node_backgroundDepthIslands_6);

  const attachment_templeBaseTier_7 = null;
  const endpoint_templeBaseTier_7 = makeAttachmentEndpoint(attachment_templeBaseTier_7);
  const node_templeBaseTier_7 = new THREE.Group();
  node_templeBaseTier_7.name = "Broad lower temple block tier__pivot";
  node_templeBaseTier_7.scale.set(1, 1, 1);
  if (endpoint_templeBaseTier_7) {
    node_templeBaseTier_7.position.copy(endpoint_templeBaseTier_7.start);
    node_templeBaseTier_7.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_templeBaseTier_7.position.set(0.0, -0.9, 0.0);
    node_templeBaseTier_7.rotation.set(0.0, 0.0, 0.0);
  }
  node_templeBaseTier_7.userData.sculptComponent = {"id": "templeBaseTier", "name": "Broad lower temple block tier", "level": "meso", "role": "architecture-tier", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Broad lower temple block tier reads as architecture-tier with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Broad lower temple block tier matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 2.3, "height": 0.75, "depth": 1.9, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, -0.9, 0], "rotation": [0, 0, 0], "scale": [2.3, 0.75, 1.9]}, "actionProfile": {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "lower-tier-block-seams", "kind": "groove"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_templeBaseTier_7.userData.actionProfile = {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["lostCityTemple"] ?? root).add(node_templeBaseTier_7);
  nodes["templeBaseTier"] = node_templeBaseTier_7;
  const mesh_templeBaseTier_7Geometry = endpoint_templeBaseTier_7
    ? new THREE.CylinderGeometry(endpoint_templeBaseTier_7.endRadius, endpoint_templeBaseTier_7.baseRadius, endpoint_templeBaseTier_7.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_templeBaseTier_7) {
    mesh_templeBaseTier_7Geometry.scale(2.3, 0.75, 1.9);
  }
  const mesh_templeBaseTier_7 = new THREE.Mesh(
    mesh_templeBaseTier_7Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_templeBaseTier_7.name = "Broad lower temple block tier";
  if (endpoint_templeBaseTier_7) {
    mesh_templeBaseTier_7.position.copy(endpoint_templeBaseTier_7.midpoint);
    mesh_templeBaseTier_7.quaternion.copy(endpoint_templeBaseTier_7.quaternion);
  }
  mesh_templeBaseTier_7.castShadow = options.castShadow ?? true;
  mesh_templeBaseTier_7.receiveShadow = options.receiveShadow ?? true;
  mesh_templeBaseTier_7.userData.sculptComponent = {"id": "templeBaseTier", "name": "Broad lower temple block tier", "level": "meso", "role": "architecture-tier", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Broad lower temple block tier reads as architecture-tier with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Broad lower temple block tier matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 2.3, "height": 0.75, "depth": 1.9, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, -0.9, 0], "rotation": [0, 0, 0], "scale": [2.3, 0.75, 1.9]}, "actionProfile": {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "lower-tier-block-seams", "kind": "groove"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_templeBaseTier_7.add(mesh_templeBaseTier_7);
  meshes["templeBaseTier"] = mesh_templeBaseTier_7;
  colliders["templeBaseTier"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["architecture-tier"] ??= [];
  destructionGroups["architecture-tier"].push(node_templeBaseTier_7);

  const attachment_templeMiddleTier_8 = null;
  const endpoint_templeMiddleTier_8 = makeAttachmentEndpoint(attachment_templeMiddleTier_8);
  const node_templeMiddleTier_8 = new THREE.Group();
  node_templeMiddleTier_8.name = "Offset middle ruin rooms__pivot";
  node_templeMiddleTier_8.scale.set(1, 1, 1);
  if (endpoint_templeMiddleTier_8) {
    node_templeMiddleTier_8.position.copy(endpoint_templeMiddleTier_8.start);
    node_templeMiddleTier_8.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_templeMiddleTier_8.position.set(0.0, 0.05, 0.02);
    node_templeMiddleTier_8.rotation.set(0.0, 0.0, 0.0);
  }
  node_templeMiddleTier_8.userData.sculptComponent = {"id": "templeMiddleTier", "name": "Offset middle ruin rooms", "level": "meso", "role": "architecture-tier", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Offset middle ruin rooms reads as architecture-tier with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Offset middle ruin rooms matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 1.75, "height": 1.05, "depth": 1.45, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 0.05, 0.02], "rotation": [0, 0, 0], "scale": [1.75, 1.05, 1.45]}, "actionProfile": {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "middle-tier-window-grid", "kind": "hole"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_templeMiddleTier_8.userData.actionProfile = {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["lostCityTemple"] ?? root).add(node_templeMiddleTier_8);
  nodes["templeMiddleTier"] = node_templeMiddleTier_8;
  const mesh_templeMiddleTier_8Geometry = endpoint_templeMiddleTier_8
    ? new THREE.CylinderGeometry(endpoint_templeMiddleTier_8.endRadius, endpoint_templeMiddleTier_8.baseRadius, endpoint_templeMiddleTier_8.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_templeMiddleTier_8) {
    mesh_templeMiddleTier_8Geometry.scale(1.75, 1.05, 1.45);
  }
  const mesh_templeMiddleTier_8 = new THREE.Mesh(
    mesh_templeMiddleTier_8Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_templeMiddleTier_8.name = "Offset middle ruin rooms";
  if (endpoint_templeMiddleTier_8) {
    mesh_templeMiddleTier_8.position.copy(endpoint_templeMiddleTier_8.midpoint);
    mesh_templeMiddleTier_8.quaternion.copy(endpoint_templeMiddleTier_8.quaternion);
  }
  mesh_templeMiddleTier_8.castShadow = options.castShadow ?? true;
  mesh_templeMiddleTier_8.receiveShadow = options.receiveShadow ?? true;
  mesh_templeMiddleTier_8.userData.sculptComponent = {"id": "templeMiddleTier", "name": "Offset middle ruin rooms", "level": "meso", "role": "architecture-tier", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Offset middle ruin rooms reads as architecture-tier with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Offset middle ruin rooms matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 1.75, "height": 1.05, "depth": 1.45, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 0.05, 0.02], "rotation": [0, 0, 0], "scale": [1.75, 1.05, 1.45]}, "actionProfile": {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "middle-tier-window-grid", "kind": "hole"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_templeMiddleTier_8.add(mesh_templeMiddleTier_8);
  meshes["templeMiddleTier"] = mesh_templeMiddleTier_8;
  colliders["templeMiddleTier"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["architecture-tier"] ??= [];
  destructionGroups["architecture-tier"].push(node_templeMiddleTier_8);

  const attachment_templeCrownTier_9 = null;
  const endpoint_templeCrownTier_9 = makeAttachmentEndpoint(attachment_templeCrownTier_9);
  const node_templeCrownTier_9 = new THREE.Group();
  node_templeCrownTier_9.name = "Leaf-framed crown temple cap__pivot";
  node_templeCrownTier_9.scale.set(1, 1, 1);
  if (endpoint_templeCrownTier_9) {
    node_templeCrownTier_9.position.copy(endpoint_templeCrownTier_9.start);
    node_templeCrownTier_9.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_templeCrownTier_9.position.set(0.0, 1.18, 0.02);
    node_templeCrownTier_9.rotation.set(0.0, 0.0, 0.0);
  }
  node_templeCrownTier_9.userData.sculptComponent = {"id": "templeCrownTier", "name": "Leaf-framed crown temple cap", "level": "meso", "role": "architecture-tier", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Leaf-framed crown temple cap reads as architecture-tier with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Leaf-framed crown temple cap matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 1.28, "height": 0.9, "depth": 1.12, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 1.18, 0.02], "rotation": [0, 0, 0], "scale": [1.28, 0.9, 1.12]}, "actionProfile": {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "crown-tier-vine-frame", "kind": "stain"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_templeCrownTier_9.userData.actionProfile = {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["lostCityTemple"] ?? root).add(node_templeCrownTier_9);
  nodes["templeCrownTier"] = node_templeCrownTier_9;
  const mesh_templeCrownTier_9Geometry = endpoint_templeCrownTier_9
    ? new THREE.CylinderGeometry(endpoint_templeCrownTier_9.endRadius, endpoint_templeCrownTier_9.baseRadius, endpoint_templeCrownTier_9.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_templeCrownTier_9) {
    mesh_templeCrownTier_9Geometry.scale(1.28, 0.9, 1.12);
  }
  const mesh_templeCrownTier_9 = new THREE.Mesh(
    mesh_templeCrownTier_9Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_templeCrownTier_9.name = "Leaf-framed crown temple cap";
  if (endpoint_templeCrownTier_9) {
    mesh_templeCrownTier_9.position.copy(endpoint_templeCrownTier_9.midpoint);
    mesh_templeCrownTier_9.quaternion.copy(endpoint_templeCrownTier_9.quaternion);
  }
  mesh_templeCrownTier_9.castShadow = options.castShadow ?? true;
  mesh_templeCrownTier_9.receiveShadow = options.receiveShadow ?? true;
  mesh_templeCrownTier_9.userData.sculptComponent = {"id": "templeCrownTier", "name": "Leaf-framed crown temple cap", "level": "meso", "role": "architecture-tier", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Leaf-framed crown temple cap reads as architecture-tier with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Leaf-framed crown temple cap matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 1.28, "height": 0.9, "depth": 1.12, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 1.18, 0.02], "rotation": [0, 0, 0], "scale": [1.28, 0.9, 1.12]}, "actionProfile": {"animationRole": "architecture-tier", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "architecture-tier", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "crown-tier-vine-frame", "kind": "stain"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_templeCrownTier_9.add(mesh_templeCrownTier_9);
  meshes["templeCrownTier"] = mesh_templeCrownTier_9;
  colliders["templeCrownTier"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["architecture-tier"] ??= [];
  destructionGroups["architecture-tier"].push(node_templeCrownTier_9);

  const attachment_frontStairRun_10 = null;
  const endpoint_frontStairRun_10 = makeAttachmentEndpoint(attachment_frontStairRun_10);
  const node_frontStairRun_10 = new THREE.Group();
  node_frontStairRun_10.name = "Front stepped stair run__pivot";
  node_frontStairRun_10.scale.set(1, 1, 1);
  if (endpoint_frontStairRun_10) {
    node_frontStairRun_10.position.copy(endpoint_frontStairRun_10.start);
    node_frontStairRun_10.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_frontStairRun_10.position.set(0.0, -1.35, 0.82);
    node_frontStairRun_10.rotation.set(0.0, 0.0, 0.0);
  }
  node_frontStairRun_10.userData.sculptComponent = {"id": "frontStairRun", "name": "Front stepped stair run", "level": "meso", "role": "stairway", "importance": 0.72, "confidence": 0.78, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Front stepped stair run reads as stairway with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Front stepped stair run matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 0.88, "height": 1.15, "depth": 1.2, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, -1.35, 0.82], "rotation": [0, 0, 0], "scale": [0.88, 1.15, 1.2]}, "actionProfile": {"animationRole": "stairway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "stairway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "temple-stair-network", "kind": "ridge"}, {"id": "stair-riser-rhythm", "kind": "ridge"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_frontStairRun_10.userData.actionProfile = {"animationRole": "stairway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "stairway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["lostCityTemple"] ?? root).add(node_frontStairRun_10);
  nodes["frontStairRun"] = node_frontStairRun_10;
  const mesh_frontStairRun_10Geometry = endpoint_frontStairRun_10
    ? new THREE.CylinderGeometry(endpoint_frontStairRun_10.endRadius, endpoint_frontStairRun_10.baseRadius, endpoint_frontStairRun_10.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_frontStairRun_10) {
    mesh_frontStairRun_10Geometry.scale(0.88, 1.15, 1.2);
  }
  const mesh_frontStairRun_10 = new THREE.Mesh(
    mesh_frontStairRun_10Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_frontStairRun_10.name = "Front stepped stair run";
  if (endpoint_frontStairRun_10) {
    mesh_frontStairRun_10.position.copy(endpoint_frontStairRun_10.midpoint);
    mesh_frontStairRun_10.quaternion.copy(endpoint_frontStairRun_10.quaternion);
  }
  mesh_frontStairRun_10.castShadow = options.castShadow ?? true;
  mesh_frontStairRun_10.receiveShadow = options.receiveShadow ?? true;
  mesh_frontStairRun_10.userData.sculptComponent = {"id": "frontStairRun", "name": "Front stepped stair run", "level": "meso", "role": "stairway", "importance": 0.72, "confidence": 0.78, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Front stepped stair run reads as stairway with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Front stepped stair run matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 0.88, "height": 1.15, "depth": 1.2, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, -1.35, 0.82], "rotation": [0, 0, 0], "scale": [0.88, 1.15, 1.2]}, "actionProfile": {"animationRole": "stairway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "stairway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "temple-stair-network", "kind": "ridge"}, {"id": "stair-riser-rhythm", "kind": "ridge"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_frontStairRun_10.add(mesh_frontStairRun_10);
  meshes["frontStairRun"] = mesh_frontStairRun_10;
  colliders["frontStairRun"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["stairway"] ??= [];
  destructionGroups["stairway"].push(node_frontStairRun_10);

  const attachment_sideStairRun_11 = null;
  const endpoint_sideStairRun_11 = makeAttachmentEndpoint(attachment_sideStairRun_11);
  const node_sideStairRun_11 = new THREE.Group();
  node_sideStairRun_11.name = "Right side stepped stair run__pivot";
  node_sideStairRun_11.scale.set(1, 1, 1);
  if (endpoint_sideStairRun_11) {
    node_sideStairRun_11.position.copy(endpoint_sideStairRun_11.start);
    node_sideStairRun_11.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_sideStairRun_11.position.set(0.92, -0.25, 0.72);
    node_sideStairRun_11.rotation.set(0.0, 0.0, 0.0);
  }
  node_sideStairRun_11.userData.sculptComponent = {"id": "sideStairRun", "name": "Right side stepped stair run", "level": "meso", "role": "stairway", "importance": 0.72, "confidence": 0.78, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Right side stepped stair run reads as stairway with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Right side stepped stair run matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 0.62, "height": 1.55, "depth": 1.1, "units": "relative", "confidence": 0.74}, "transform": {"position": [0.92, -0.25, 0.72], "rotation": [0, 0, 0], "scale": [0.62, 1.55, 1.1]}, "actionProfile": {"animationRole": "stairway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "stairway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "side-stair-zigzag", "kind": "ridge"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_sideStairRun_11.userData.actionProfile = {"animationRole": "stairway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "stairway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["lostCityTemple"] ?? root).add(node_sideStairRun_11);
  nodes["sideStairRun"] = node_sideStairRun_11;
  const mesh_sideStairRun_11Geometry = endpoint_sideStairRun_11
    ? new THREE.CylinderGeometry(endpoint_sideStairRun_11.endRadius, endpoint_sideStairRun_11.baseRadius, endpoint_sideStairRun_11.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_sideStairRun_11) {
    mesh_sideStairRun_11Geometry.scale(0.62, 1.55, 1.1);
  }
  const mesh_sideStairRun_11 = new THREE.Mesh(
    mesh_sideStairRun_11Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_sideStairRun_11.name = "Right side stepped stair run";
  if (endpoint_sideStairRun_11) {
    mesh_sideStairRun_11.position.copy(endpoint_sideStairRun_11.midpoint);
    mesh_sideStairRun_11.quaternion.copy(endpoint_sideStairRun_11.quaternion);
  }
  mesh_sideStairRun_11.castShadow = options.castShadow ?? true;
  mesh_sideStairRun_11.receiveShadow = options.receiveShadow ?? true;
  mesh_sideStairRun_11.userData.sculptComponent = {"id": "sideStairRun", "name": "Right side stepped stair run", "level": "meso", "role": "stairway", "importance": 0.72, "confidence": 0.78, "primitive": "instanced-cluster", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Right side stepped stair run reads as stairway with material/shape identity visible in central-lost-city.", "geometryDescriptor": {"topologyIntent": "Procedural Right side stepped stair run matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "lostCityTemple", "attachment": null, "dimensions": {"width": 0.62, "height": 1.55, "depth": 1.1, "units": "relative", "confidence": 0.74}, "transform": {"position": [0.92, -0.25, 0.72], "rotation": [0, 0, 0], "scale": [0.62, 1.55, 1.1]}, "actionProfile": {"animationRole": "stairway", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "stairway", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "side-stair-zigzag", "kind": "ridge"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_sideStairRun_11.add(mesh_sideStairRun_11);
  meshes["sideStairRun"] = mesh_sideStairRun_11;
  colliders["sideStairRun"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["stairway"] ??= [];
  destructionGroups["stairway"].push(node_sideStairRun_11);

  const attachment_ropeBridge_12 = {"parentId": "root", "parentSocket": "right-cliff-bridge-anchor", "contactType": "anchored-span", "localStart": [-1.0, 0, 0], "localEnd": [1.0, 0.25, 0], "contactNormal": [0, 1, 0], "embedDepth": 0.04, "gapTolerance": 0.01, "evidenceRefs": ["full-object"]};
  const endpoint_ropeBridge_12 = makeAttachmentEndpoint(attachment_ropeBridge_12);
  const node_ropeBridge_12 = new THREE.Group();
  node_ropeBridge_12.name = "Suspended rope bridge arc__pivot";
  node_ropeBridge_12.scale.set(1, 1, 1);
  if (endpoint_ropeBridge_12) {
    node_ropeBridge_12.position.copy(endpoint_ropeBridge_12.start);
    node_ropeBridge_12.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_ropeBridge_12.position.set(2.15, 0.75, 0.35);
    node_ropeBridge_12.rotation.set(0.0, 0.0, 0.0);
  }
  node_ropeBridge_12.userData.sculptComponent = {"id": "ropeBridge", "name": "Suspended rope bridge arc", "level": "meso", "role": "bridge-span", "importance": 0.72, "confidence": 0.78, "primitive": "curve-sweep", "topologyClass": "fiber-strand", "topologyRationale": "fiber-strand selected from visible Island 018 source evidence: Suspended rope bridge arc reads as bridge-span with material/shape identity visible in central-lost-city, full-object.", "geometryDescriptor": {"topologyIntent": "Procedural Suspended rope bridge arc matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "right-cliff-bridge-anchor", "contactType": "anchored-span", "localStart": [-1.0, 0, 0], "localEnd": [1.0, 0.25, 0], "contactNormal": [0, 1, 0], "embedDepth": 0.04, "gapTolerance": 0.01, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 2.2, "height": 0.18, "depth": 0.18, "units": "relative", "confidence": 0.74}, "transform": {"position": [2.15, 0.75, 0.35], "rotation": [0, 0, 0], "scale": [2.2, 0.18, 0.18]}, "actionProfile": {"animationRole": "bridge-span", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "bridge-span", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "ropeAndAgedWood", "materialLayers": ["ropeAndAgedWood"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "rope-bridge-suspension", "kind": "ridge"}, {"id": "weathered-plank-splits", "kind": "groove"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city", "full-object"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(139, 91, 44, 1.0)", "secondaryAlbedo": "rgba(59, 36, 17, 1.0)", "materialClass": "wood", "materialClassConfidence": 0.82, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(59, 36, 17, 1.0)"}, {"at": 1, "color": "rgba(139, 91, 44, 1.0)"}]}}};
  node_ropeBridge_12.userData.actionProfile = {"animationRole": "bridge-span", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "bridge-span", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["root"] ?? root).add(node_ropeBridge_12);
  nodes["ropeBridge"] = node_ropeBridge_12;
  const mesh_ropeBridge_12Geometry = endpoint_ropeBridge_12
    ? new THREE.CylinderGeometry(endpoint_ropeBridge_12.endRadius, endpoint_ropeBridge_12.baseRadius, endpoint_ropeBridge_12.length, 32, 12)
    : buildCurveSweepGeometry({"spine": [[-0.5, -0.4, 0.0], [-0.1, 0.1, 0.0], [0.3, 0.2, 0.0], [0.6, -0.1, 0.0]], "crossSection": {"points": [[-0.04, -0.02], [0.04, -0.02], [0.04, 0.02], [-0.04, 0.02]]}, "closed": false});
  if (!endpoint_ropeBridge_12) {
    mesh_ropeBridge_12Geometry.scale(2.2, 0.18, 0.18);
  }
  const mesh_ropeBridge_12 = new THREE.Mesh(
    mesh_ropeBridge_12Geometry,
    materialMap["ropeAndAgedWood"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_ropeBridge_12.name = "Suspended rope bridge arc";
  if (endpoint_ropeBridge_12) {
    mesh_ropeBridge_12.position.copy(endpoint_ropeBridge_12.midpoint);
    mesh_ropeBridge_12.quaternion.copy(endpoint_ropeBridge_12.quaternion);
  }
  mesh_ropeBridge_12.castShadow = options.castShadow ?? true;
  mesh_ropeBridge_12.receiveShadow = options.receiveShadow ?? true;
  mesh_ropeBridge_12.userData.sculptComponent = {"id": "ropeBridge", "name": "Suspended rope bridge arc", "level": "meso", "role": "bridge-span", "importance": 0.72, "confidence": 0.78, "primitive": "curve-sweep", "topologyClass": "fiber-strand", "topologyRationale": "fiber-strand selected from visible Island 018 source evidence: Suspended rope bridge arc reads as bridge-span with material/shape identity visible in central-lost-city, full-object.", "geometryDescriptor": {"topologyIntent": "Procedural Suspended rope bridge arc matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "right-cliff-bridge-anchor", "contactType": "anchored-span", "localStart": [-1.0, 0, 0], "localEnd": [1.0, 0.25, 0], "contactNormal": [0, 1, 0], "embedDepth": 0.04, "gapTolerance": 0.01, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 2.2, "height": 0.18, "depth": 0.18, "units": "relative", "confidence": 0.74}, "transform": {"position": [2.15, 0.75, 0.35], "rotation": [0, 0, 0], "scale": [2.2, 0.18, 0.18]}, "actionProfile": {"animationRole": "bridge-span", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "bridge-span", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "ropeAndAgedWood", "materialLayers": ["ropeAndAgedWood"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "rope-bridge-suspension", "kind": "ridge"}, {"id": "weathered-plank-splits", "kind": "groove"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["central-lost-city", "full-object"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(139, 91, 44, 1.0)", "secondaryAlbedo": "rgba(59, 36, 17, 1.0)", "materialClass": "wood", "materialClassConfidence": 0.82, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(59, 36, 17, 1.0)"}, {"at": 1, "color": "rgba(139, 91, 44, 1.0)"}]}}};
  node_ropeBridge_12.add(mesh_ropeBridge_12);
  meshes["ropeBridge"] = mesh_ropeBridge_12;
  colliders["ropeBridge"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["bridge-span"] ??= [];
  destructionGroups["bridge-span"].push(node_ropeBridge_12);

  const attachment_explorerNest_13 = null;
  const endpoint_explorerNest_13 = makeAttachmentEndpoint(attachment_explorerNest_13);
  const node_explorerNest_13 = new THREE.Group();
  node_explorerNest_13.name = "Explorer Nest hatchery platform__pivot";
  node_explorerNest_13.scale.set(1, 1, 1);
  if (endpoint_explorerNest_13) {
    node_explorerNest_13.position.copy(endpoint_explorerNest_13.start);
    node_explorerNest_13.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_explorerNest_13.position.set(-2.65, -1.2, 0.55);
    node_explorerNest_13.rotation.set(0.0, 0.0, 0.0);
  }
  node_explorerNest_13.userData.sculptComponent = {"id": "explorerNest", "name": "Explorer Nest hatchery platform", "level": "meso", "role": "landmark-platform", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Explorer Nest hatchery platform reads as landmark-platform with material/shape identity visible in hatchery-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Explorer Nest hatchery platform matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "landmarkRing", "attachment": null, "dimensions": {"width": 1.2, "height": 0.78, "depth": 1.0, "units": "relative", "confidence": 0.74}, "transform": {"position": [-2.65, -1.2, 0.55], "rotation": [0, 0, 0], "scale": [1.2, 0.78, 1.0]}, "actionProfile": {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "moss-hidden-hatchery-perch", "kind": "stain"}, {"id": "green-egg-shrine", "kind": "contour"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["hatchery-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_explorerNest_13.userData.actionProfile = {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["landmarkRing"] ?? root).add(node_explorerNest_13);
  nodes["explorerNest"] = node_explorerNest_13;
  const mesh_explorerNest_13Geometry = endpoint_explorerNest_13
    ? new THREE.CylinderGeometry(endpoint_explorerNest_13.endRadius, endpoint_explorerNest_13.baseRadius, endpoint_explorerNest_13.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_explorerNest_13) {
    mesh_explorerNest_13Geometry.scale(1.2, 0.78, 1.0);
  }
  const mesh_explorerNest_13 = new THREE.Mesh(
    mesh_explorerNest_13Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_explorerNest_13.name = "Explorer Nest hatchery platform";
  if (endpoint_explorerNest_13) {
    mesh_explorerNest_13.position.copy(endpoint_explorerNest_13.midpoint);
    mesh_explorerNest_13.quaternion.copy(endpoint_explorerNest_13.quaternion);
  }
  mesh_explorerNest_13.castShadow = options.castShadow ?? true;
  mesh_explorerNest_13.receiveShadow = options.receiveShadow ?? true;
  mesh_explorerNest_13.userData.sculptComponent = {"id": "explorerNest", "name": "Explorer Nest hatchery platform", "level": "meso", "role": "landmark-platform", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Explorer Nest hatchery platform reads as landmark-platform with material/shape identity visible in hatchery-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Explorer Nest hatchery platform matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "landmarkRing", "attachment": null, "dimensions": {"width": 1.2, "height": 0.78, "depth": 1.0, "units": "relative", "confidence": 0.74}, "transform": {"position": [-2.65, -1.2, 0.55], "rotation": [0, 0, 0], "scale": [1.2, 0.78, 1.0]}, "actionProfile": {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "moss-hidden-hatchery-perch", "kind": "stain"}, {"id": "green-egg-shrine", "kind": "contour"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["hatchery-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_explorerNest_13.add(mesh_explorerNest_13);
  meshes["explorerNest"] = mesh_explorerNest_13;
  colliders["explorerNest"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["landmark-platform"] ??= [];
  destructionGroups["landmark-platform"].push(node_explorerNest_13);

  const attachment_junglePathHabit_14 = null;
  const endpoint_junglePathHabit_14 = makeAttachmentEndpoint(attachment_junglePathHabit_14);
  const node_junglePathHabit_14 = new THREE.Group();
  node_junglePathHabit_14.name = "Jungle Path habit platform__pivot";
  node_junglePathHabit_14.scale.set(1, 1, 1);
  if (endpoint_junglePathHabit_14) {
    node_junglePathHabit_14.position.copy(endpoint_junglePathHabit_14.start);
    node_junglePathHabit_14.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_junglePathHabit_14.position.set(2.55, 0.9, 0.4);
    node_junglePathHabit_14.rotation.set(0.0, 0.0, 0.0);
  }
  node_junglePathHabit_14.userData.sculptComponent = {"id": "junglePathHabit", "name": "Jungle Path habit platform", "level": "meso", "role": "landmark-platform", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Jungle Path habit platform reads as landmark-platform with material/shape identity visible in habit-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Jungle Path habit platform matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "landmarkRing", "attachment": null, "dimensions": {"width": 1.15, "height": 0.82, "depth": 1.0, "units": "relative", "confidence": 0.74}, "transform": {"position": [2.55, 0.9, 0.4], "rotation": [0, 0, 0], "scale": [1.15, 0.82, 1.0]}, "actionProfile": {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "habit-torch-platform", "kind": "emissive"}, {"id": "vine-framed-landmark-panel", "kind": "contour"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["habit-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_junglePathHabit_14.userData.actionProfile = {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["landmarkRing"] ?? root).add(node_junglePathHabit_14);
  nodes["junglePathHabit"] = node_junglePathHabit_14;
  const mesh_junglePathHabit_14Geometry = endpoint_junglePathHabit_14
    ? new THREE.CylinderGeometry(endpoint_junglePathHabit_14.endRadius, endpoint_junglePathHabit_14.baseRadius, endpoint_junglePathHabit_14.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_junglePathHabit_14) {
    mesh_junglePathHabit_14Geometry.scale(1.15, 0.82, 1.0);
  }
  const mesh_junglePathHabit_14 = new THREE.Mesh(
    mesh_junglePathHabit_14Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_junglePathHabit_14.name = "Jungle Path habit platform";
  if (endpoint_junglePathHabit_14) {
    mesh_junglePathHabit_14.position.copy(endpoint_junglePathHabit_14.midpoint);
    mesh_junglePathHabit_14.quaternion.copy(endpoint_junglePathHabit_14.quaternion);
  }
  mesh_junglePathHabit_14.castShadow = options.castShadow ?? true;
  mesh_junglePathHabit_14.receiveShadow = options.receiveShadow ?? true;
  mesh_junglePathHabit_14.userData.sculptComponent = {"id": "junglePathHabit", "name": "Jungle Path habit platform", "level": "meso", "role": "landmark-platform", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Jungle Path habit platform reads as landmark-platform with material/shape identity visible in habit-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Jungle Path habit platform matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "landmarkRing", "attachment": null, "dimensions": {"width": 1.15, "height": 0.82, "depth": 1.0, "units": "relative", "confidence": 0.74}, "transform": {"position": [2.55, 0.9, 0.4], "rotation": [0, 0, 0], "scale": [1.15, 0.82, 1.0]}, "actionProfile": {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "habit-torch-platform", "kind": "emissive"}, {"id": "vine-framed-landmark-panel", "kind": "contour"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["habit-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_junglePathHabit_14.add(mesh_junglePathHabit_14);
  meshes["junglePathHabit"] = mesh_junglePathHabit_14;
  colliders["junglePathHabit"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["landmark-platform"] ??= [];
  destructionGroups["landmark-platform"].push(node_junglePathHabit_14);

  const attachment_survivalTrials_15 = null;
  const endpoint_survivalTrials_15 = makeAttachmentEndpoint(attachment_survivalTrials_15);
  const node_survivalTrials_15 = new THREE.Group();
  node_survivalTrials_15.name = "Survival Trials mystery platform__pivot";
  node_survivalTrials_15.scale.set(1, 1, 1);
  if (endpoint_survivalTrials_15) {
    node_survivalTrials_15.position.copy(endpoint_survivalTrials_15.start);
    node_survivalTrials_15.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_survivalTrials_15.position.set(2.75, -0.6, 0.65);
    node_survivalTrials_15.rotation.set(0.0, 0.0, 0.0);
  }
  node_survivalTrials_15.userData.sculptComponent = {"id": "survivalTrials", "name": "Survival Trials mystery platform", "level": "meso", "role": "landmark-platform", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Survival Trials mystery platform reads as landmark-platform with material/shape identity visible in mystery-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Survival Trials mystery platform matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "landmarkRing", "attachment": null, "dimensions": {"width": 1.2, "height": 0.84, "depth": 1.0, "units": "relative", "confidence": 0.74}, "transform": {"position": [2.75, -0.6, 0.65], "rotation": [0, 0, 0], "scale": [1.2, 0.84, 1.0]}, "actionProfile": {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "survival-trials-totem-and-chest", "kind": "contour"}, {"id": "orange-pennant-accent", "kind": "decal"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["mystery-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_survivalTrials_15.userData.actionProfile = {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["landmarkRing"] ?? root).add(node_survivalTrials_15);
  nodes["survivalTrials"] = node_survivalTrials_15;
  const mesh_survivalTrials_15Geometry = endpoint_survivalTrials_15
    ? new THREE.CylinderGeometry(endpoint_survivalTrials_15.endRadius, endpoint_survivalTrials_15.baseRadius, endpoint_survivalTrials_15.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_survivalTrials_15) {
    mesh_survivalTrials_15Geometry.scale(1.2, 0.84, 1.0);
  }
  const mesh_survivalTrials_15 = new THREE.Mesh(
    mesh_survivalTrials_15Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_survivalTrials_15.name = "Survival Trials mystery platform";
  if (endpoint_survivalTrials_15) {
    mesh_survivalTrials_15.position.copy(endpoint_survivalTrials_15.midpoint);
    mesh_survivalTrials_15.quaternion.copy(endpoint_survivalTrials_15.quaternion);
  }
  mesh_survivalTrials_15.castShadow = options.castShadow ?? true;
  mesh_survivalTrials_15.receiveShadow = options.receiveShadow ?? true;
  mesh_survivalTrials_15.userData.sculptComponent = {"id": "survivalTrials", "name": "Survival Trials mystery platform", "level": "meso", "role": "landmark-platform", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Survival Trials mystery platform reads as landmark-platform with material/shape identity visible in mystery-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Survival Trials mystery platform matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "landmarkRing", "attachment": null, "dimensions": {"width": 1.2, "height": 0.84, "depth": 1.0, "units": "relative", "confidence": 0.74}, "transform": {"position": [2.75, -0.6, 0.65], "rotation": [0, 0, 0], "scale": [1.2, 0.84, 1.0]}, "actionProfile": {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "survival-trials-totem-and-chest", "kind": "contour"}, {"id": "orange-pennant-accent", "kind": "decal"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["mystery-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_survivalTrials_15.add(mesh_survivalTrials_15);
  meshes["survivalTrials"] = mesh_survivalTrials_15;
  colliders["survivalTrials"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["landmark-platform"] ??= [];
  destructionGroups["landmark-platform"].push(node_survivalTrials_15);

  const attachment_explorersCamp_16 = null;
  const endpoint_explorersCamp_16 = makeAttachmentEndpoint(attachment_explorersCamp_16);
  const node_explorersCamp_16 = new THREE.Group();
  node_explorersCamp_16.name = "Explorer Camp wisdom platform__pivot";
  node_explorersCamp_16.scale.set(1, 1, 1);
  if (endpoint_explorersCamp_16) {
    node_explorersCamp_16.position.copy(endpoint_explorersCamp_16.start);
    node_explorersCamp_16.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_explorersCamp_16.position.set(2.45, -1.65, 0.35);
    node_explorersCamp_16.rotation.set(0.0, 0.0, 0.0);
  }
  node_explorersCamp_16.userData.sculptComponent = {"id": "explorersCamp", "name": "Explorer Camp wisdom platform", "level": "meso", "role": "landmark-platform", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Explorer Camp wisdom platform reads as landmark-platform with material/shape identity visible in wisdom-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Explorer Camp wisdom platform matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "landmarkRing", "attachment": null, "dimensions": {"width": 1.25, "height": 0.72, "depth": 1.0, "units": "relative", "confidence": 0.74}, "transform": {"position": [2.45, -1.65, 0.35], "rotation": [0, 0, 0], "scale": [1.25, 0.72, 1.0]}, "actionProfile": {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "explorers-camp-map-platform", "kind": "linework"}, {"id": "lantern-glow-point", "kind": "emissive"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["wisdom-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_explorersCamp_16.userData.actionProfile = {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["landmarkRing"] ?? root).add(node_explorersCamp_16);
  nodes["explorersCamp"] = node_explorersCamp_16;
  const mesh_explorersCamp_16Geometry = endpoint_explorersCamp_16
    ? new THREE.CylinderGeometry(endpoint_explorersCamp_16.endRadius, endpoint_explorersCamp_16.baseRadius, endpoint_explorersCamp_16.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_explorersCamp_16) {
    mesh_explorersCamp_16Geometry.scale(1.25, 0.72, 1.0);
  }
  const mesh_explorersCamp_16 = new THREE.Mesh(
    mesh_explorersCamp_16Geometry,
    materialMap["mossyRuinStone"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_explorersCamp_16.name = "Explorer Camp wisdom platform";
  if (endpoint_explorersCamp_16) {
    mesh_explorersCamp_16.position.copy(endpoint_explorersCamp_16.midpoint);
    mesh_explorersCamp_16.quaternion.copy(endpoint_explorersCamp_16.quaternion);
  }
  mesh_explorersCamp_16.castShadow = options.castShadow ?? true;
  mesh_explorersCamp_16.receiveShadow = options.receiveShadow ?? true;
  mesh_explorersCamp_16.userData.sculptComponent = {"id": "explorersCamp", "name": "Explorer Camp wisdom platform", "level": "meso", "role": "landmark-platform", "importance": 0.72, "confidence": 0.78, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Explorer Camp wisdom platform reads as landmark-platform with material/shape identity visible in wisdom-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Explorer Camp wisdom platform matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "landmarkRing", "attachment": null, "dimensions": {"width": 1.25, "height": 0.72, "depth": 1.0, "units": "relative", "confidence": 0.74}, "transform": {"position": [2.45, -1.65, 0.35], "rotation": [0, 0, 0], "scale": [1.25, 0.72, 1.0]}, "actionProfile": {"animationRole": "landmark-platform", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "landmark-platform", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "mossyRuinStone", "materialLayers": ["mossyRuinStone"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "explorers-camp-map-platform", "kind": "linework"}, {"id": "lantern-glow-point", "kind": "emissive"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["wisdom-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(94, 106, 51, 1.0)", "secondaryAlbedo": "rgba(47, 47, 11, 1.0)", "materialClass": "stone", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(47, 47, 11, 1.0)"}, {"at": 1, "color": "rgba(94, 106, 51, 1.0)"}]}}};
  node_explorersCamp_16.add(mesh_explorersCamp_16);
  meshes["explorersCamp"] = mesh_explorersCamp_16;
  colliders["explorersCamp"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["landmark-platform"] ??= [];
  destructionGroups["landmark-platform"].push(node_explorersCamp_16);

  const attachment_emeraldEggShrine_17 = null;
  const endpoint_emeraldEggShrine_17 = makeAttachmentEndpoint(attachment_emeraldEggShrine_17);
  const node_emeraldEggShrine_17 = new THREE.Group();
  node_emeraldEggShrine_17.name = "Large emerald hatchery egg shrine__pivot";
  node_emeraldEggShrine_17.scale.set(1, 1, 1);
  if (endpoint_emeraldEggShrine_17) {
    node_emeraldEggShrine_17.position.copy(endpoint_emeraldEggShrine_17.start);
    node_emeraldEggShrine_17.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_emeraldEggShrine_17.position.set(0.0, 0.48, 0.1);
    node_emeraldEggShrine_17.rotation.set(0.0, 0.0, 0.0);
  }
  node_emeraldEggShrine_17.userData.sculptComponent = {"id": "emeraldEggShrine", "name": "Large emerald hatchery egg shrine", "level": "meso", "role": "egg-shrine", "importance": 0.72, "confidence": 0.78, "primitive": "ellipsoid", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Large emerald hatchery egg shrine reads as egg-shrine with material/shape identity visible in hatchery-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Large emerald hatchery egg shrine matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "explorerNest", "attachment": null, "dimensions": {"width": 0.35, "height": 0.58, "depth": 0.35, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 0.48, 0.1], "rotation": [0, 0, 0], "scale": [0.35, 0.58, 0.35]}, "actionProfile": {"animationRole": "egg-shrine", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "egg-shrine", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "emeraldEggCrystal", "materialLayers": ["emeraldEggCrystal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "egg-scale-contours", "kind": "contour"}, {"id": "gem-highlight-facets", "kind": "gloss"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["hatchery-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(70, 183, 107, 1.0)", "secondaryAlbedo": "rgba(231, 247, 169, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.78, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(231, 247, 169, 1.0)"}, {"at": 1, "color": "rgba(70, 183, 107, 1.0)"}]}}};
  node_emeraldEggShrine_17.userData.actionProfile = {"animationRole": "egg-shrine", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "egg-shrine", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}};
  (nodes["explorerNest"] ?? root).add(node_emeraldEggShrine_17);
  nodes["emeraldEggShrine"] = node_emeraldEggShrine_17;
  const mesh_emeraldEggShrine_17Geometry = endpoint_emeraldEggShrine_17
    ? new THREE.CylinderGeometry(endpoint_emeraldEggShrine_17.endRadius, endpoint_emeraldEggShrine_17.baseRadius, endpoint_emeraldEggShrine_17.length, 32, 12)
    : new THREE.SphereGeometry(0.5, 64, 40);
  if (!endpoint_emeraldEggShrine_17) {
    mesh_emeraldEggShrine_17Geometry.scale(0.35, 0.58, 0.35);
  }
  const mesh_emeraldEggShrine_17 = new THREE.Mesh(
    mesh_emeraldEggShrine_17Geometry,
    materialMap["emeraldEggCrystal"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_emeraldEggShrine_17.name = "Large emerald hatchery egg shrine";
  if (endpoint_emeraldEggShrine_17) {
    mesh_emeraldEggShrine_17.position.copy(endpoint_emeraldEggShrine_17.midpoint);
    mesh_emeraldEggShrine_17.quaternion.copy(endpoint_emeraldEggShrine_17.quaternion);
  }
  mesh_emeraldEggShrine_17.castShadow = options.castShadow ?? true;
  mesh_emeraldEggShrine_17.receiveShadow = options.receiveShadow ?? true;
  mesh_emeraldEggShrine_17.userData.sculptComponent = {"id": "emeraldEggShrine", "name": "Large emerald hatchery egg shrine", "level": "meso", "role": "egg-shrine", "importance": 0.72, "confidence": 0.78, "primitive": "ellipsoid", "topologyClass": "assembled-solid", "topologyRationale": "assembled-solid selected from visible Island 018 source evidence: Large emerald hatchery egg shrine reads as egg-shrine with material/shape identity visible in hatchery-crop.", "geometryDescriptor": {"topologyIntent": "Procedural Large emerald hatchery egg shrine matching the Jungle Expedition source silhouette and visible local structure.", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.03, "segments": 2}, "deformationStack": [], "uvStrategy": "generated triplanar/world-space coordinates", "normalStrategy": "weighted vertex normals plus authored procedural normal maps"}, "parent": "explorerNest", "attachment": null, "dimensions": {"width": 0.35, "height": 0.58, "depth": 0.35, "units": "relative", "confidence": 0.74}, "transform": {"position": [0, 0.48, 0.1], "rotation": [0, 0, 0], "scale": [0.35, 0.58, 0.35]}, "actionProfile": {"animationRole": "egg-shrine", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.7}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."}, "constraints": [], "destruction": {"breakable": false, "fractureGroup": "egg-shrine", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": "mossyRuinStone"}}, "material": "emeraldEggCrystal", "materialLayers": ["emeraldEggCrystal"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "egg-scale-contours", "kind": "contour"}, {"id": "gem-highlight-facets", "kind": "gloss"}], "surfaceDetail": {"macroRoughness": 0.28, "microRoughness": 0.12, "bumpAmplitude": 0.035, "normalPattern": "reference-derived procedural relief", "displacementPattern": "only on stone ledges and cliff edges where silhouette changes", "occlusionPattern": "contact AO under overlapping ruin blocks and props", "edgeWearPattern": "brighter worn slab corners and step noses", "notes": "Surface pass must compare neutral and grazing renders."}, "evidenceRefs": ["hatchery-crop"], "details": [], "fidelityTier": "source-fidelity-prebuild", "colorMaterialRecipe": {"dominantAlbedo": "rgba(70, 183, 107, 1.0)", "secondaryAlbedo": "rgba(231, 247, 169, 1.0)", "materialClass": "glass", "materialClassConfidence": 0.78, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(231, 247, 169, 1.0)"}, {"at": 1, "color": "rgba(70, 183, 107, 1.0)"}]}}};
  node_emeraldEggShrine_17.add(mesh_emeraldEggShrine_17);
  meshes["emeraldEggShrine"] = mesh_emeraldEggShrine_17;
  colliders["emeraldEggShrine"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Visual/reference component collider proxy; gameplay collision remains canonical elsewhere."};
  destructionGroups["egg-shrine"] ??= [];
  destructionGroups["egg-shrine"].push(node_emeraldEggShrine_17);

  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets.',
  };
  return root;
}

export function createIsland018JungleExpeditionLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "Island 018 Jungle Expedition look-dev lights";
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
  lights.userData.lightingFromPhoto = [{"id": "sunny-sky-key-light", "type": "key light", "direction": "upper-left/front", "color": "warm daylight #FFE2A0", "intensity": 1.35, "evidenceRefs": ["full-object"], "notes": "Reference has high blue-sky daylight with warm highlights on top-left stone and brass."}, {"id": "cool-cloud-fill-light", "type": "fill light", "direction": "front/right and lower cloud bounce", "color": "cool cyan #8FD9FF", "intensity": 0.55, "evidenceRefs": ["waterfall-depth"], "notes": "Fill keeps shadowed jungle readable without flattening AO in block seams."}, {"id": "amber-emerald-local-rim", "type": "rim or environment light", "direction": "local torches/windows/gems", "color": "amber plus emerald accents", "intensity": 0.85, "evidenceRefs": ["central-lost-city", "hatchery-crop"], "notes": "Small warm emissive windows and torches plus green crystal glows support island identity."}, {"id": "exposure-tone-shadow-contract", "type": "render intent", "exposure": 0.95, "toneMapping": "ACES Filmic with restrained bloom", "background": "bright tropical sky and cloud depth; no baked source UI", "contactShadow": "enable contact shadow and ambient occlusion under stairs, board slabs, bridge posts, and props", "evidenceRefs": ["full-object"], "notes": "Lighting review must include neutral, grazing, and reference-matched renders so material problems are not hidden."}];
  lights.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  return lights;
}

// PBR materials (clearcoat/iridescence/transmission/anisotropy) need an environment
// map to visually behave as intended — call this once per renderer and assign the
// result to scene.environment before rendering. No external HDR asset required.
export function createIsland018JungleExpeditionEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
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
export function frameIsland018JungleExpeditionCamera(
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
export function createIsland018JungleExpeditionPresentationComposer(
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

export function configureIsland018JungleExpeditionRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createIsland018JungleExpeditionInspectControls(
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
