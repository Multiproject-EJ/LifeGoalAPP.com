import * as THREE from 'three';
import {
  EGG_HATCH_TIER_PROFILES,
  getEggHatchPalette,
  resolveEggFragmentPose,
  resolveEggHatchPose,
  type EggHatchPaletteId,
  type EggHatchPhase,
  type EggHatchTier,
} from '../services/eggHatchThreePresentation';

export type EggHatchQuality = 'low' | 'high';

export interface EggHatchModelMetrics {
  meshes: number;
  completePoseDrawCalls: number;
  triangles: number;
  materials: number;
  fragments: number;
}

export interface EggHatchThreeModel {
  root: THREE.Group;
  metrics: EggHatchModelMetrics;
  update: (elapsedSeconds: number, reducedMotion?: boolean) => EggHatchPhase;
  setWireframe: (wireframe: boolean) => void;
  dispose: () => void;
}

interface CreateEggHatchThreeModelOptions {
  tier: EggHatchTier;
  paletteId: EggHatchPaletteId;
  quality?: EggHatchQuality;
}

const TWO_PI = Math.PI * 2;

interface ProceduralSurfaceMaps {
  color: THREE.DataTexture;
  normal: THREE.DataTexture;
  roughness: THREE.DataTexture;
}

function makeProceduralSurfaceMaps(
  kind: 'plant' | 'leaf' | 'stone',
  size = 128,
): ProceduralSurfaceMaps {
  const heights = new Float32Array(size * size);
  const colorData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);
  const hash = (x: number, y: number) => {
    const value = Math.sin((x * 127.1) + (y * 311.7) + (kind === 'stone' ? 41.7 : kind === 'leaf' ? 19.3 : 7.1)) * 43758.5453;
    return value - Math.floor(value);
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / Math.max(1, size - 1);
      const v = y / Math.max(1, size - 1);
      const noise = (hash(x, y) * 0.55) + (hash(Math.floor(x / 4), Math.floor(y / 4)) * 0.45);
      const index = (y * size) + x;
      let height = (noise - 0.5) * 0.08;
      let tone = 0.94 + ((noise - 0.5) * 0.075);
      let roughness = 0.58 + ((noise - 0.5) * 0.16);

      if (kind === 'leaf') {
        const midrib = Math.exp(-Math.abs(u - 0.5) * 72);
        const branchFrequency = 7;
        const branchPhase = ((v * branchFrequency) % 1) - 0.5;
        const branchPath = Math.abs(Math.abs(u - 0.5) - (Math.abs(branchPhase) * (0.42 - (v * 0.13))));
        const branch = Math.exp(-branchPath * 120) * (v > 0.14 && v < 0.9 ? 1 : 0);
        height += (midrib * 0.32) + (branch * 0.16);
        tone -= (midrib * 0.075) + (branch * 0.045);
        roughness = 0.5 + ((noise - 0.5) * 0.12) + (branch * 0.08);
      } else if (kind === 'stone') {
        const cellCrack = (frequency: number, phase: number) => {
          const cellX = Math.floor((u * frequency) + phase);
          const cellY = Math.floor((v * frequency) - phase);
          const localX = ((u * frequency) + phase) - cellX;
          const localY = ((v * frequency) - phase) - cellY;
          let nearest = 2;
          let second = 2;
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              const px = ox + (hash(cellX + ox, cellY + oy) * 0.78) + 0.11;
              const py = oy + (hash(cellX + ox + 71, cellY + oy + 29) * 0.78) + 0.11;
              const distance = Math.hypot(localX - px, localY - py);
              if (distance < nearest) {
                second = nearest;
                nearest = distance;
              } else if (distance < second) second = distance;
            }
          }
          return Math.exp(-Math.abs(second - nearest) * 36);
        };
        const crack = Math.max(cellCrack(5.2, 0.18), cellCrack(9.7, 0.53) * 0.64);
        const cavity = Math.pow(Math.max(0, noise - 0.52), 2) * 0.18;
        const mossEdge = THREE.MathUtils.clamp((cellCrack(3.4, 0.81) - 0.58) * 1.6, 0, 0.24);
        height -= (crack * 0.22) + cavity;
        tone -= (crack * 0.2) + cavity;
        tone += mossEdge * 0.055;
        roughness = 0.76 + ((noise - 0.5) * 0.12) + (crack * 0.16) - (mossEdge * 0.08);
      } else {
        const mottling = Math.sin((u * 18.3) + Math.sin(v * 15.7)) * Math.sin((v * 16.1) - Math.cos(u * 13.9));
        height += mottling * 0.018;
        tone += mottling * 0.018;
        roughness = 0.56 + ((noise - 0.5) * 0.11);
      }

      heights[index] = height;
      const byte = Math.round(THREE.MathUtils.clamp(tone, kind === 'stone' ? 0.6 : 0.72, 1) * 255);
      colorData[(index * 4)] = byte;
      colorData[(index * 4) + 1] = byte;
      colorData[(index * 4) + 2] = kind === 'stone' ? Math.round(byte * 0.96) : byte;
      colorData[(index * 4) + 3] = 255;
      const roughnessByte = Math.round(THREE.MathUtils.clamp(roughness, 0.2, 1) * 255);
      roughnessData[(index * 4)] = roughnessByte;
      roughnessData[(index * 4) + 1] = roughnessByte;
      roughnessData[(index * 4) + 2] = roughnessByte;
      roughnessData[(index * 4) + 3] = 255;
    }
  }

  const normalData = new Uint8Array(size * size * 4);
  const sampleHeight = (x: number, y: number) => heights[(((y + size) % size) * size) + ((x + size) % size)];
  const normalStrength = kind === 'stone' ? 4.2 : kind === 'leaf' ? 5.5 : 2.2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (sampleHeight(x - 1, y) - sampleHeight(x + 1, y)) * normalStrength;
      const dy = (sampleHeight(x, y - 1) - sampleHeight(x, y + 1)) * normalStrength;
      const normal = new THREE.Vector3(dx, dy, 1).normalize();
      const index = ((y * size) + x) * 4;
      normalData[index] = Math.round((normal.x * 0.5 + 0.5) * 255);
      normalData[index + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      normalData[index + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      normalData[index + 3] = 255;
    }
  }

  const makeTexture = (data: Uint8Array, colorSpace?: THREE.ColorSpace) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    if (colorSpace) texture.colorSpace = colorSpace;
    texture.needsUpdate = true;
    return texture;
  };
  return {
    color: makeTexture(colorData, THREE.SRGBColorSpace),
    normal: makeTexture(normalData),
    roughness: makeTexture(roughnessData),
  };
}

const smooth = (geometry: THREE.BufferGeometry) => {
  geometry.computeVertexNormals();
  return geometry;
};

function mesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  castShadow = true,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = castShadow;
  result.receiveShadow = true;
  return result;
}

function makeLeafGeometry(width = 0.5, height = 1, depth = 0.11, segments = 18): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.7, height * 0.18, width * 0.68, height * 0.68, 0, height);
  shape.bezierCurveTo(-width * 0.68, height * 0.68, -width * 0.7, height * 0.18, 0, 0);
  return smooth(new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: depth * 0.45,
    bevelThickness: depth * 0.38,
    bevelSegments: 2,
    curveSegments: segments,
  }).translate(0, 0, -depth / 2));
}

function makeCurvedLeafGeometry(
  width = 0.5,
  height = 1,
  depth = 0.08,
  segmentsAlong = 18,
  segmentsAcross = 7,
  bow = 0.1,
  curl = 0.04,
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const layerStride = (segmentsAlong + 1) * (segmentsAcross + 1);

  for (let layer = 0; layer < 2; layer += 1) {
    const layerSign = layer === 0 ? 1 : -1;
    for (let along = 0; along <= segmentsAlong; along += 1) {
      const v = along / segmentsAlong;
      const widthProfile = Math.pow(Math.sin(Math.PI * v), 0.72) * (1 - (v * 0.08));
      const centerBow = Math.sin(Math.PI * v) * bow;
      const tipCurl = Math.pow(v, 2.4) * curl;
      // Collapse the profile into a true leaf point instead of leaving the
      // rectangular end-cap that made the crown read like two bent boards in
      // side view. The base retains a little thickness to seat into the stem.
      const thicknessProfile = (Math.pow(Math.sin(Math.PI * v), 0.55) * 0.88)
        + ((1 - v) * 0.12);
      const localDepth = depth * thicknessProfile;
      for (let across = 0; across <= segmentsAcross; across += 1) {
        const u = (across / segmentsAcross) * 2 - 1;
        const x = u * width * widthProfile;
        const cupping = (1 - (u * u)) * localDepth * 0.72;
        const edgeRoll = Math.pow(Math.abs(u), 2.4) * localDepth * 0.36;
        vertices.push(
          x,
          v * height,
          centerBow + tipCurl + (layerSign * localDepth * 0.5) + (layer === 0 ? cupping : -edgeRoll),
        );
        uvs.push((u + 1) * 0.5, v);
      }
    }
  }

  const stride = segmentsAcross + 1;
  for (let layer = 0; layer < 2; layer += 1) {
    for (let along = 0; along < segmentsAlong; along += 1) {
      for (let across = 0; across < segmentsAcross; across += 1) {
        const a = (layer * layerStride) + (along * stride) + across;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        if (layer === 0) indices.push(a, b, c, b, d, c);
        else indices.push(a, c, b, b, c, d);
      }
    }
  }

  const connectAcrossEdge = (across: number) => {
    for (let along = 0; along < segmentsAlong; along += 1) {
      const frontA = (along * stride) + across;
      const frontB = frontA + stride;
      const backA = layerStride + frontA;
      const backB = layerStride + frontB;
      indices.push(frontA, backA, frontB, frontB, backA, backB);
    }
  };
  connectAcrossEdge(0);
  connectAcrossEdge(segmentsAcross);
  for (const along of [0, segmentsAlong]) {
    for (let across = 0; across < segmentsAcross; across += 1) {
      const frontA = (along * stride) + across;
      const frontB = frontA + 1;
      const backA = layerStride + frontA;
      const backB = backA + 1;
      if (along === 0) indices.push(frontA, frontB, backA, frontB, backB, backA);
      else indices.push(frontA, backA, frontB, frontB, backA, backB);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return smooth(geometry);
}

function colorizeLeafGeometry(
  geometry: THREE.BufferGeometry,
  baseColor: string,
  tipColor: string,
  edgeColor: string,
) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const position = geometry.getAttribute('position');
  if (!bounds || !position) return geometry;
  const height = Math.max(0.001, bounds.max.y - bounds.min.y);
  const halfWidth = Math.max(0.001, Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)));
  const base = new THREE.Color(baseColor);
  const tip = new THREE.Color(tipColor);
  const edge = new THREE.Color(edgeColor);
  const colors: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const t = THREE.MathUtils.clamp((position.getY(index) - bounds.min.y) / height, 0, 1);
    const edgeMix = Math.pow(THREE.MathUtils.clamp(Math.abs(position.getX(index)) / halfWidth, 0, 1), 1.8) * 0.34;
    const color = base.clone().lerp(tip, 0.24 + (t * 0.58)).lerp(edge, edgeMix * 0.72);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function colorizeRockGeometry(
  geometry: THREE.BufferGeometry,
  baseColor: string,
  lightColor: string,
  darkColor: string,
  seed: number,
) {
  const position = geometry.getAttribute('position');
  if (!position) return geometry;
  const base = new THREE.Color(baseColor);
  const light = new THREE.Color(lightColor);
  const dark = new THREE.Color(darkColor);
  const colors: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const variation = (Math.sin((x * 17.3) + (y * 11.7) + (z * 23.1) + seed) + 1) * 0.5;
    const upward = THREE.MathUtils.clamp((y + 0.5) * 0.7, 0, 1);
    const color = base.clone().lerp(light, (variation * 0.2) + (upward * 0.16)).lerp(dark, Math.max(0, -z) * 0.16);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function colorizeMossGeometry(geometry: THREE.BufferGeometry, seed: number) {
  const position = geometry.getAttribute('position');
  if (!position) return geometry;
  const root = new THREE.Color('#5f8420');
  const growth = new THREE.Color('#9fcf2f');
  const tip = new THREE.Color('#d2ea4d');
  const colors: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const upward = THREE.MathUtils.clamp((y + 0.3) * 1.55, 0, 1);
    const forward = THREE.MathUtils.clamp((z + 0.2) * 1.7, 0, 1);
    const facet = (Math.sin((x * 19.7) + (y * 13.1) + (z * 23.3) + seed) + 1) * 0.5;
    const color = root.clone()
      .lerp(growth, 0.38 + (forward * 0.34))
      .lerp(tip, (upward * 0.24) + (facet * 0.1));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function colorizeFaceGeometry(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position');
  if (!position) return geometry;
  const edge = new THREE.Color('#d6ef6b');
  const cheek = new THREE.Color('#f7f5a3');
  const center = new THREE.Color('#fffbc7');
  const shadow = new THREE.Color('#bddb62');
  const colors: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index) / 0.72;
    const y = position.getY(index) / 0.72;
    const z = position.getZ(index) / 0.72;
    const frontness = THREE.MathUtils.clamp((z + 0.18) / 1.08, 0, 1);
    const radial = THREE.MathUtils.clamp(Math.sqrt((x * x) + ((y + 0.08) * (y + 0.08))), 0, 1);
    const lowerCheek = THREE.MathUtils.clamp((0.35 - y) * 0.8, 0, 1) * frontness;
    const eyeSocketLift = Math.exp(-(
      (Math.pow((Math.abs(x) - 0.5) / 0.36, 2))
      + (Math.pow((y + 0.02) / 0.44, 2))
    )) * frontness;
    const color = edge.clone()
      .lerp(center, frontness * (1 - (radial * 0.25)))
      .lerp(cheek, lowerCheek * 0.18)
      .lerp(center, eyeSocketLift * 0.06)
      .lerp(shadow, (Math.max(0, -z) * 0.015) + THREE.MathUtils.clamp((-y - 0.3) * 0.06, 0, 0.035));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function colorizeIrisGeometry(geometry: THREE.BufferGeometry, radius: number) {
  const position = geometry.getAttribute('position');
  if (!position) return geometry;
  const deepAmber = new THREE.Color('#512208');
  const honey = new THREE.Color('#c87612');
  const lowerGold = new THREE.Color('#f5ad25');
  const darkRim = new THREE.Color('#1c0c04');
  const colors: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index) / radius;
    const y = position.getY(index) / radius;
    const radial = THREE.MathUtils.clamp(Math.sqrt((x * x) + (y * y)), 0, 1);
    const lowerLight = THREE.MathUtils.smoothstep(-y, -0.25, 0.9);
    const rim = THREE.MathUtils.smoothstep(radial, 0.76, 0.98);
    const color = deepAmber.clone()
      .lerp(honey, THREE.MathUtils.smoothstep(radial, 0.12, 0.62) * 0.82)
      .lerp(lowerGold, lowerLight * 0.43)
      .lerp(darkRim, rim * 0.82);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function fillGeometryVertexColor(geometry: THREE.BufferGeometry, colorValue: string) {
  const position = geometry.getAttribute('position');
  const color = new THREE.Color(colorValue);
  if (!position) return geometry;
  const colors = Array.from({ length: position.count }, () => [color.r, color.g, color.b]).flat();
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function colorizePlantGeometry(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position');
  if (!position) return geometry;
  const base = new THREE.Color('#5f982d');
  const light = new THREE.Color('#93c53c');
  const dark = new THREE.Color('#376921');
  const colors: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const frontLight = THREE.MathUtils.clamp((z + 0.4) * 0.7, 0, 1);
    const upperLight = THREE.MathUtils.clamp((y + 0.5) * 0.38, 0, 0.35);
    const sideShadow = THREE.MathUtils.clamp(Math.abs(x) * 0.22, 0, 0.2);
    const color = base.clone().lerp(light, frontLight * 0.32 + upperLight).lerp(dark, sideShadow + (Math.max(0, -z) * 0.18));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function makePearGeometry(radius: number, widthSegments: number, heightSegments: number) {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const normalizedY = position.getY(index) / radius;
    const pearWidth = 0.91 - (normalizedY * 0.12);
    position.setX(index, position.getX(index) * pearWidth);
    position.setZ(index, position.getZ(index) * (0.96 - (normalizedY * 0.055)));
    if (normalizedY < -0.78) {
      const flatten = THREE.MathUtils.smoothstep((-normalizedY - 0.78) / 0.22, 0, 1);
      position.setY(index, THREE.MathUtils.lerp(position.getY(index), -radius * 0.82, flatten));
    }
  }
  position.needsUpdate = true;
  return smooth(geometry);
}

function makeCraggyArmShellGeometry(
  radius: number,
  widthSegments: number,
  heightSegments: number,
  side: -1 | 1,
  seed: number,
) {
  const geometry = makePearGeometry(radius, widthSegments, heightSegments);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const normalizedX = x / radius;
    const normalizedY = y / radius;
    const azimuth = Math.atan2(z, x);
    const upperMass = Math.exp(-Math.pow((normalizedY - 0.28) / 0.42, 2));
    const crag = (0.065 * Math.sin((3 * azimuth) + seed))
      + (0.035 * Math.sin((5 * azimuth) - (2.6 * normalizedY) + (seed * 0.61)))
      + (0.02 * Math.sin((8.2 * normalizedY) + (1.7 * azimuth) + (seed * 0.37)));
    const outer = Math.max(0, side * normalizedX);
    const notch = outer * Math.max(0, Math.sin((9.4 * (normalizedY + 1)) + (seed * 1.3))) * 0.03;
    position.setX(index, x * (1 + crag + (0.05 * upperMass) - notch));
    position.setZ(index, z * (1 + (crag * 0.65) + (0.032 * upperMass)));
    position.setY(index, y + (radius * (
      (0.012 * Math.sin((4 * azimuth) + seed))
      + (0.009 * Math.sin((7 * azimuth) - (2 * normalizedY) + (seed * 0.43)))
    )));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeSproutlingHeadGeometry(radius: number, widthSegments: number, heightSegments: number) {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const normalizedX = position.getX(index) / radius;
    const normalizedY = position.getY(index) / radius;
    const normalizedZ = position.getZ(index) / radius;
    const frontness = THREE.MathUtils.smoothstep(normalizedZ, -0.22, 0.96);
    const lowerFace = THREE.MathUtils.smoothstep(-normalizedY, -0.05, 0.82) * frontness;
    const templeRound = 1 - (Math.abs(normalizedX) * 0.035);
    const crownTaper = 1 - (THREE.MathUtils.smoothstep(normalizedY, 0.46, 0.96) * 0.05);
    const cheekBulge = 1 + (Math.exp(-Math.pow((normalizedY + 0.28) / 0.34, 2)) * 0.13);
    const chinTaper = 1 - (THREE.MathUtils.smoothstep(-normalizedY, 0.56, 0.96) * 0.018);
    const lowerCheekVolume = Math.exp(-Math.pow((normalizedY + 0.28) / 0.38, 2));
    const frontFeatureLock = THREE.MathUtils.smoothstep(normalizedZ, 0.05, 0.72);
    const sideRearJawFill = lowerCheekVolume * (1 - frontFeatureLock);
    const depthScale = 0.88 + (0.145 * sideRearJawFill);
    position.setX(index, position.getX(index) * (1.22 * templeRound * crownTaper * cheekBulge * chinTaper));
    const shapedY = position.getY(index) * (1.015 + (lowerFace * 0.035));
    const chinFlatten = THREE.MathUtils.smoothstep(-normalizedY, 0.965, 1);
    position.setY(index, THREE.MathUtils.lerp(shapedY, -radius * 0.97, chinFlatten));
    position.setZ(index, position.getZ(index) * depthScale + (frontness * lowerFace * radius * 0.125));
  }
  position.needsUpdate = true;
  return smooth(geometry);
}

function mergeNonIndexedGeometries(geometries: THREE.BufferGeometry[]) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const includeColors = geometries.length > 0 && geometries.every((geometry) => Boolean(geometry.getAttribute('color')));
  geometries.forEach((source) => {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    const color = includeColors ? geometry.getAttribute('color') : null;
    for (let index = 0; index < position.count; index += 1) {
      positions.push(position.getX(index), position.getY(index), position.getZ(index));
      normals.push(normal?.getX(index) ?? 0, normal?.getY(index) ?? 0, normal?.getZ(index) ?? 1);
      uvs.push(uv?.getX(index) ?? 0, uv?.getY(index) ?? 0);
      if (color) colors.push(color.getX(index), color.getY(index), color.getZ(index));
    }
    geometry.dispose();
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (includeColors) merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return merged;
}

function transformGeometry(
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  rotation = new THREE.Euler(),
  scale = new THREE.Vector3(1, 1, 1),
) {
  const matrix = new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromEuler(rotation),
    scale,
  );
  geometry.applyMatrix4(matrix);
  return geometry;
}

function transformGeometryWithBasis(
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  xAxis: THREE.Vector3,
  yAxis: THREE.Vector3,
  zAxis: THREE.Vector3,
  scale = new THREE.Vector3(1, 1, 1),
) {
  const basis = new THREE.Matrix4().makeBasis(
    xAxis.clone().multiplyScalar(scale.x),
    yAxis.clone().multiplyScalar(scale.y),
    zAxis.clone().multiplyScalar(scale.z),
  );
  basis.setPosition(position);
  geometry.applyMatrix4(basis);
  return geometry;
}

function mergeGeometryBatch(geometries: THREE.BufferGeometry[]) {
  const merged = mergeNonIndexedGeometries(geometries);
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}

function makeShellWedgeGeometry(
  startAngle: number,
  endAngle: number,
  quality: EggHatchQuality,
  fragmentIndex: number,
): THREE.BufferGeometry {
  const radialSegments = quality === 'high' ? 8 + (fragmentIndex % 3) : 5 + (fragmentIndex % 2);
  const verticalSegments = quality === 'high' ? 5 + (fragmentIndex % 2) : 3;
  const vertices: number[] = [];
  const indices: number[] = [];
  const innerScale = 0.84 + ((fragmentIndex % 3) * 0.018);
  const startPolar = 0.19 + (((fragmentIndex * 7) % 5) * 0.027);
  const endPolar = Math.PI * (0.49 + (((fragmentIndex * 5) % 4) * 0.012));
  const edgeFrequency = 3 + (fragmentIndex % 4);
  const ridgePhase = fragmentIndex * 1.37;

  for (let layer = 0; layer < 2; layer += 1) {
    const layerScale = layer === 0 ? 1 : innerScale;
    for (let yIndex = 0; yIndex <= verticalSegments; yIndex += 1) {
      const v = yIndex / verticalSegments;
      for (let xIndex = 0; xIndex <= radialSegments; xIndex += 1) {
        const u = xIndex / radialSegments;
        const rimNoise = Math.sin((u * Math.PI * edgeFrequency) + ridgePhase) * (0.055 + ((fragmentIndex % 3) * 0.012));
        const sideBite = Math.sin((v * Math.PI * (2 + (fragmentIndex % 2))) + ridgePhase) * 0.016;
        const polar = startPolar + ((endPolar - startPolar) * v) + (rimNoise * (1 - v) * 0.72) + (sideBite * v);
        const edgeJitter = Math.sin((u * Math.PI * (4 + (fragmentIndex % 3))) + (yIndex * 1.7) + ridgePhase) * (0.012 + (v * 0.012));
        const asymmetricSkew = (u - 0.5) * (((fragmentIndex % 5) - 2) * 0.009) * (1 - v);
        const angle = startAngle + ((endAngle - startAngle) * u) + edgeJitter + asymmetricSkew;
        const radius = Math.sin(polar) * layerScale;
        vertices.push(
          Math.cos(angle) * radius * 0.96,
          Math.cos(polar) * layerScale * 1.34 + 0.16,
          Math.sin(angle) * radius * 0.96,
        );
      }
    }
  }

  const stride = radialSegments + 1;
  const layerStride = stride * (verticalSegments + 1);
  for (let layer = 0; layer < 2; layer += 1) {
    for (let y = 0; y < verticalSegments; y += 1) {
      for (let x = 0; x < radialSegments; x += 1) {
        const a = (layer * layerStride) + (y * stride) + x;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        if (layer === 0) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  }

  const connectEdge = (x: number) => {
    for (let y = 0; y < verticalSegments; y += 1) {
      const outerA = (y * stride) + x;
      const outerB = outerA + stride;
      const innerA = layerStride + outerA;
      const innerB = layerStride + outerB;
      indices.push(outerA, innerA, outerB, outerB, innerA, innerB);
    }
  };
  connectEdge(0);
  connectEdge(radialSegments);
  for (let x = 0; x < radialSegments; x += 1) {
    const bottomA = (verticalSegments * stride) + x;
    const bottomB = bottomA + 1;
    const innerA = layerStride + bottomA;
    const innerB = innerA + 1;
    indices.push(bottomA, innerA, bottomB, bottomB, innerA, innerB);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return smooth(geometry);
}

function makeTube(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  name: string,
  tubularSegments = 18,
): THREE.Mesh {
  return mesh(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), tubularSegments, radius, 6, false), material, false);
}

function makeSoftBeanGeometry(width = 0.28, height = 0.15): THREE.BufferGeometry {
  const halfWidth = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, -height * 0.08);
  shape.bezierCurveTo(-width * 0.33, height * 0.5, width * 0.24, height * 0.58, halfWidth, 0);
  shape.bezierCurveTo(width * 0.28, -height * 0.14, -width * 0.28, -height * 0.14, -halfWidth, -height * 0.08);
  return smooth(new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 1,
    curveSegments: 10,
  }).translate(0, 0, -0.009));
}

function makeSmileRibbonGeometry(
  width = 0.5,
  drop = 0.155,
  thickness = 0.017,
  segments = 18,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const curvePoint = (index: number, offset: number) => {
    const t = index / segments;
    const x = (t - 0.5) * width;
    const y = -0.25 - (Math.sin(t * Math.PI) * drop) + offset;
    return new THREE.Vector2(x, y);
  };
  const first = curvePoint(0, thickness * 0.5);
  shape.moveTo(first.x, first.y);
  for (let index = 1; index <= segments; index += 1) {
    const point = curvePoint(index, thickness * 0.5);
    shape.lineTo(point.x, point.y);
  }
  for (let index = segments; index >= 0; index -= 1) {
    const taper = 0.65 + (Math.sin((index / segments) * Math.PI) * 0.35);
    const point = curvePoint(index, -thickness * taper);
    shape.lineTo(point.x, point.y);
  }
  shape.closePath();
  return smooth(new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 1,
    curveSegments: 2,
  }).translate(0, 0, -0.006));
}

function addSproutlingEye(parent: THREE.Group, x: number, materials: Record<string, THREE.Material>, segments: number) {
  const eyeRoot = new THREE.Group();
  eyeRoot.name = x < 0 ? 'left-eye-assembly' : 'right-eye-assembly';
  const eyeYaw = (x < 0 ? -1 : 1) * 0.08;
  eyeRoot.position.set(x, -0.04, 0.575);
  eyeRoot.rotation.y = eyeYaw;
  eyeRoot.userData.openScaleY = 1;
  parent.add(eyeRoot);

  const cream = mesh('eye-cream', new THREE.SphereGeometry(0.218, segments, Math.max(12, segments - 4)), materials.eyeWhite);
  cream.position.set(x < 0 ? -0.025 : 0.035, x < 0 ? -0.006 : 0.012, 0);
  cream.scale.set(1.22, 1.16, 0.16);
  cream.userData.restScaleY = cream.scale.y;
  eyeRoot.add(cream);
  const inward = x < 0 ? 1 : -1;
  const outline = mesh('eye-dark-outline', new THREE.SphereGeometry(0.178, segments, Math.max(12, segments - 4)), materials.eyeDark);
  outline.position.set(x < 0 ? 0.02 : -0.028, x < 0 ? 0.002 : -0.016, 0.02);
  outline.scale.set(1.18, 1.1, 0.12);
  outline.userData.restScaleY = outline.scale.y;
  eyeRoot.add(outline);

  const gazePivot = new THREE.Group();
  gazePivot.name = 'eye-gaze-pivot';
  gazePivot.position.set(x < 0 ? 0.05 : -0.06, x < 0 ? 0.01 : -0.03, 0);
  eyeRoot.add(gazePivot);
  const iris = mesh('eye-amber-iris', colorizeIrisGeometry(new THREE.SphereGeometry(0.163, segments, Math.max(12, segments - 4)), 0.163), materials.eyeAmber);
  iris.position.set(0, -0.012, 0.04);
  iris.scale.set(1.3, 1.2, 0.095);
  iris.userData.restScaleY = iris.scale.y;
  gazePivot.add(iris);
  const pupil = mesh('eye-pupil', new THREE.SphereGeometry(0.11, Math.max(14, segments - 4), 12), materials.eyeDark);
  pupil.position.set(0, 0.002, 0.054);
  pupil.scale.set(1.24, 1.23, 0.072);
  pupil.userData.restScaleY = pupil.scale.y;
  gazePivot.add(pupil);

  const catchlight = mesh('eye-catchlight', new THREE.SphereGeometry(0.04, 10, 7), materials.catchlight, false);
  catchlight.position.set(x < 0 ? 0.055 : -0.052, x < 0 ? 0.09 : 0.075, 0.08);
  catchlight.scale.z = 0.08;
  eyeRoot.add(catchlight);
  const cornea = mesh('eye-cornea-lens', new THREE.SphereGeometry(0.173, segments, Math.max(12, segments - 4)), materials.cornea, false);
  cornea.position.z = 0.067;
  cornea.scale.set(1.32, 1.21, 0.055);
  cornea.userData.restScaleY = cornea.scale.y;
  eyeRoot.add(cornea);

  eyeRoot.userData.gazePivot = gazePivot;
  eyeRoot.userData.cream = cream;
  eyeRoot.userData.outline = outline;
  eyeRoot.userData.iris = iris;
  eyeRoot.userData.pupil = pupil;
  eyeRoot.userData.cornea = cornea;
  eyeRoot.userData.catchlight = catchlight;
}

function addLeafVeinSet(
  parent: THREE.Group,
  name: string,
  height: number,
  width: number,
  material: THREE.Material,
  quality: EggHatchQuality,
  bow = 0.1,
  curl = 0.04,
  depth = 0.08,
) {
  const veinGeometries: THREE.BufferGeometry[] = [];
  const frontDepth = (v: number, u = 0) => (
    (Math.sin(Math.PI * v) * bow)
    + (Math.pow(v, 2.4) * curl)
    + (depth * ((Math.pow(Math.sin(Math.PI * v), 0.55) * 0.88) + ((1 - v) * 0.12)) * 0.5)
    + ((1 - (u * u)) * depth * ((Math.pow(Math.sin(Math.PI * v), 0.55) * 0.88) + ((1 - v) * 0.12)) * 0.72)
    + 0.008
  );
  const centralPoints = Array.from({ length: 7 }, (_, index) => {
    const v = 0.08 + ((index / 6) * 0.84);
    return new THREE.Vector3(0, v * height, frontDepth(v));
  });
  veinGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(centralPoints), 14, 0.014, 6, false));
  const branchCount = quality === 'high' ? 4 : 2;
  for (let index = 0; index < branchCount; index += 1) {
    const y = height * (0.24 + (index * 0.13));
    const reach = width * (0.52 - (index * 0.07));
    [-1, 1].forEach((side) => {
      const branchV = y / height;
      const branch = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, y, frontDepth(branchV)),
        new THREE.Vector3(side * reach * 0.48, y + (height * 0.055), frontDepth(branchV + 0.055, side * 0.36)),
        new THREE.Vector3(side * reach, y + (height * 0.09), frontDepth(branchV + 0.09, side * 0.72)),
      ]), 8, 0.007, 5, false);
      veinGeometries.push(branch);
    });
  }
  parent.add(mesh(`${name}-vein-relief`, mergeNonIndexedGeometries(veinGeometries), material, false));
  veinGeometries.forEach((geometry) => geometry.dispose());
}

function createSproutling(
  quality: EggHatchQuality,
  paletteLeaf: string,
): { root: THREE.Group; leafPivots: THREE.Group[]; armPivots: THREE.Group[]; eyePivots: THREE.Group[]; head: THREE.Group } {
  const segments = quality === 'high' ? 28 : 16;
  const detail = quality === 'high' ? 2 : 1;
  const root = new THREE.Group();
  root.name = 'sproutling';
  root.userData.sculptComponentId = 'sproutling';
  root.userData.clickable = true;

  const plantGeometry = (geometry: THREE.BufferGeometry) => colorizePlantGeometry(geometry);

  const canonicalLeafColor = new THREE.Color(paletteLeaf).lerp(new THREE.Color('#8ec52e'), 0.72);
  const leafBaseHex = `#${canonicalLeafColor.getHexString()}`;
  const plantMaps = makeProceduralSurfaceMaps('plant');
  const leafMaps = makeProceduralSurfaceMaps('leaf');
  const stoneMaps = makeProceduralSurfaceMaps('stone');
  const materials = {
    skin: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: plantMaps.color, normalMap: plantMaps.normal, normalScale: new THREE.Vector2(0.17, 0.17), roughnessMap: plantMaps.roughness, roughness: 0.58, metalness: 0, clearcoat: 0.16, clearcoatRoughness: 0.4, vertexColors: true }),
    skinLight: new THREE.MeshPhysicalMaterial({ color: '#fffdea', map: plantMaps.color, normalMap: plantMaps.normal, normalScale: new THREE.Vector2(0.07, 0.07), roughnessMap: plantMaps.roughness, roughness: 0.62, metalness: 0, clearcoat: 0.1, vertexColors: true }),
    belly: new THREE.MeshPhysicalMaterial({ color: '#e7eaa6', map: plantMaps.color, normalMap: plantMaps.normal, normalScale: new THREE.Vector2(0.1, 0.1), roughnessMap: plantMaps.roughness, roughness: 0.62, metalness: 0, clearcoat: 0.08 }),
    toe: new THREE.MeshPhysicalMaterial({ color: '#b7d840', roughness: 0.58, metalness: 0, clearcoat: 0.16 }),
    leaf: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: leafMaps.color, normalMap: leafMaps.normal, normalScale: new THREE.Vector2(0.2, 0.2), roughnessMap: leafMaps.roughness, roughness: 0.62, metalness: 0, clearcoat: 0.14, clearcoatRoughness: 0.44, vertexColors: true }),
    leafLight: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: leafMaps.color, normalMap: leafMaps.normal, normalScale: new THREE.Vector2(0.2, 0.2), roughnessMap: leafMaps.roughness, roughness: 0.56, metalness: 0, clearcoat: 0.16, clearcoatRoughness: 0.4, vertexColors: true }),
    heroLeaf: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: leafMaps.color, normalMap: leafMaps.normal, normalScale: new THREE.Vector2(0.27, 0.27), roughnessMap: leafMaps.roughness, roughness: 0.46, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.28, vertexColors: true }),
    leafDark: new THREE.MeshStandardMaterial({ color: '#416f1e', roughness: 0.75, metalness: 0 }),
    leafVein: new THREE.MeshStandardMaterial({ color: '#8db63a', roughness: 0.66, metalness: 0 }),
    brow: new THREE.MeshPhysicalMaterial({ color: '#68a61c', roughness: 0.44, metalness: 0, clearcoat: 0.24, clearcoatRoughness: 0.38 }),
    stone: new THREE.MeshStandardMaterial({ color: '#ffffff', map: stoneMaps.color, normalMap: stoneMaps.normal, normalScale: new THREE.Vector2(0.28, 0.28), roughnessMap: stoneMaps.roughness, roughness: 0.82, metalness: 0, vertexColors: true }),
    stoneLight: new THREE.MeshStandardMaterial({ color: '#ffffff', map: stoneMaps.color, normalMap: stoneMaps.normal, normalScale: new THREE.Vector2(0.24, 0.24), roughnessMap: stoneMaps.roughness, roughness: 0.76, metalness: 0, vertexColors: true }),
    stoneDark: new THREE.MeshStandardMaterial({ color: '#624b36', roughness: 0.9, metalness: 0 }),
    moss: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, metalness: 0, vertexColors: true }),
    eyeWhite: new THREE.MeshPhysicalMaterial({ color: '#eee5c8', roughness: 0.46, clearcoat: 0.12 }),
    eyeAmber: new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.02, emissive: '#150600', emissiveIntensity: 0.015 }),
    eyeDark: new THREE.MeshPhysicalMaterial({ color: '#241307', roughness: 0.09, clearcoat: 1 }),
    cornea: new THREE.MeshPhysicalMaterial({ color: '#fffaf0', transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.025, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.015, ior: 1.38 }),
    catchlight: new THREE.MeshBasicMaterial({ color: '#fffdf0' }),
  };

  const body = mesh('sproutling-pear-body', colorizePlantGeometry(makePearGeometry(0.74, segments, Math.max(14, segments - 6))), materials.skin);
  body.position.set(0, -0.51, 0);
  body.scale.set(1.08, 1.27, 0.84);
  root.add(body);
  const belly = mesh('sproutling-cream-belly', new THREE.SphereGeometry(0.48, segments, Math.max(12, segments - 8)), materials.belly);
  belly.position.set(0, -0.52, 0.63);
  belly.scale.set(0.9, 1.3, 0.055);
  root.add(belly);
  const bellySpiral = makeTube([
    new THREE.Vector3(-0.11, -0.34, 0.667),
    new THREE.Vector3(0.16, -0.33, 0.673),
    new THREE.Vector3(0.18, -0.55, 0.676),
    new THREE.Vector3(-0.04, -0.66, 0.679),
    new THREE.Vector3(-0.18, -0.48, 0.675),
    new THREE.Vector3(-0.08, -0.37, 0.679),
    new THREE.Vector3(0.015, -0.43, 0.681),
  ], 0.034, materials.leafDark, 'belly-emblem', quality === 'high' ? 34 : 18);
  bellySpiral.position.y = -0.055;
  root.add(bellySpiral);

  const head = new THREE.Group();
  head.name = 'sproutling-head';
  head.position.set(0, 0.5, 0.08);
  head.userData.sculptComponentId = 'head';
  root.add(head);
  const headMesh = mesh('sproutling-round-head-volume', colorizeFaceGeometry(makeSproutlingHeadGeometry(0.72, segments, Math.max(14, segments - 6))), materials.skinLight);
  head.add(headMesh);
  const faceRoot = new THREE.Group();
  faceRoot.name = 'sproutling-face';
  faceRoot.userData.sculptComponentId = 'face';
  head.add(faceRoot);
  addSproutlingEye(faceRoot, -0.345, materials, segments);
  addSproutlingEye(faceRoot, 0.345, materials, segments);
  const eyePivots = faceRoot.children.filter((child): child is THREE.Group => child instanceof THREE.Group && child.name.endsWith('-eye-assembly'));
  if (eyePivots[0]) {
    eyePivots[0].scale.set(1.05, 1.03, 0.82);
    eyePivots[0].userData.restScaleY = eyePivots[0].scale.y;
  }
  if (eyePivots[1]) {
    eyePivots[1].position.y += 0.075;
    eyePivots[1].scale.set(0.89, 1.03, 0.82);
    eyePivots[1].userData.restScaleY = eyePivots[1].scale.y;
  }
  const smile = mesh('friendly-smile', makeSmileRibbonGeometry(0.43, 0.082, 0.0075), materials.eyeDark, false);
  smile.position.set(0.025, -0.055, 0.688);
  head.add(smile);
  const cheekDotGeometries: THREE.BufferGeometry[] = [];
  [-1, 1].forEach((side) => {
    const eyebrow = mesh(
      `${side < 0 ? 'left' : 'right'}-soft-leaf-eyebrow`,
      makeSoftBeanGeometry(0.33, 0.18),
      materials.brow,
      false,
    );
    eyebrow.position.set(side < 0 ? -0.345 : 0.36, side < 0 ? 0.265 : 0.315, 0.712);
    eyebrow.rotation.z = side < 0 ? 0.16 : -0.14;
    eyebrow.scale.y = 0.96;
    if (side > 0) eyebrow.scale.x = 0.94;
    head.add(eyebrow);
    const cheekDefinitions = side < 0
      ? [
          { x: 0.58, y: -0.18, radius: 0.052 },
          { x: 0.53, y: -0.255, radius: 0.044 },
          { x: 0.48, y: -0.325, radius: 0.034 },
        ]
      : [
          { x: 0.58, y: -0.18, radius: 0.046 },
          { x: 0.53, y: -0.255, radius: 0.039 },
          { x: 0.48, y: -0.325, radius: 0.03 },
        ];
    cheekDefinitions.forEach((definition) => {
      cheekDotGeometries.push(transformGeometry(
        plantGeometry(new THREE.SphereGeometry(definition.radius, 9, 7)),
        new THREE.Vector3(side * definition.x, definition.y, 0.58 + ((0.61 - definition.x) * 0.22)),
        new THREE.Euler(),
        new THREE.Vector3(1.12, 0.94, 0.045),
      ));
    });
  });
  head.add(mesh('cheek-dot-batch', mergeGeometryBatch(cheekDotGeometries), materials.leafLight, false));

  const leafPivots: THREE.Group[] = [];
  // The cap is one wrapped radial assembly, not a frontal feather fan. Each
  // leaf is authored in its local tangent plane, then the static layers are
  // merged by material so profile/rear coverage costs only two draw calls.
  const crownCapGeometries: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
  const addCrownCapLeaf = (
    angle: number,
    y: number,
    embedFactor: number,
    width: number,
    height: number,
    layer: 0 | 1,
    scale = 1,
  ) => {
    const geometry = colorizeLeafGeometry(
      makeCurvedLeafGeometry(width, height, 0.065, quality === 'high' ? 11 : 7, quality === 'high' ? 4 : 3, 0.045, 0.018),
      layer === 0 ? leafBaseHex : '#6fa52d',
      layer === 0 ? '#b4dc43' : '#97c83a',
      '#355f1c',
    );
    const xRadius = 0.878;
    const yRadius = 0.706;
    const zRadius = 0.605;
    const section = Math.sqrt(Math.max(0.04, 1 - ((y / yRadius) ** 2)));
    const position = new THREE.Vector3(
      Math.sin(angle) * xRadius * section * embedFactor,
      y,
      Math.cos(angle) * zRadius * section * embedFactor,
    );
    const outward = new THREE.Vector3(
      position.x / (xRadius * xRadius),
      position.y / (yRadius * yRadius),
      position.z / (zRadius * zRadius),
    ).normalize();
    const down = new THREE.Vector3(0, -1, 0);
    const downhill = down.sub(outward.clone().multiplyScalar(down.dot(outward))).normalize();
    const across = downhill.clone().cross(outward).normalize();
    const layerTwist = Math.sin(angle) * 0.16;
    const twist = new THREE.Quaternion().setFromAxisAngle(outward, layerTwist);
    downhill.applyQuaternion(twist);
    across.applyQuaternion(twist);
    crownCapGeometries[layer].push(transformGeometryWithBasis(
      geometry,
      position,
      across,
      downhill,
      outward,
      new THREE.Vector3(scale, scale, 1),
    ));
  };
  [
    { angle: -0.86, y: 0.6, embedFactor: 0.965, width: 0.145, height: 0.32, layer: 0 as const, scale: 0.92 },
    { angle: -0.44, y: 0.66, embedFactor: 0.965, width: 0.155, height: 0.35, layer: 1 as const, scale: 0.96 },
    { angle: 0, y: 0.69, embedFactor: 0.965, width: 0.16, height: 0.38, layer: 0 as const, scale: 1 },
    { angle: 0.44, y: 0.66, embedFactor: 0.965, width: 0.155, height: 0.35, layer: 1 as const, scale: 0.96 },
    { angle: 0.86, y: 0.6, embedFactor: 0.965, width: 0.145, height: 0.32, layer: 0 as const, scale: 0.92 },
  ].forEach((definition) => addCrownCapLeaf(
    definition.angle,
    definition.y,
    definition.embedFactor,
    definition.width,
    definition.height,
    definition.layer,
    definition.scale,
  ));
  for (let index = 0; index < 10; index += 1) {
    const angle = 1.1 + ((index / 9) * (TWO_PI - 2.2));
    const sideDrop = Math.pow(Math.abs(Math.sin(angle)), 1.3);
    const stagger = ((index % 3) - 1) * 0.026;
    addCrownCapLeaf(angle, 0.44 - (sideDrop * 0.16) + stagger, 0.97 + ((index % 2) * 0.02), 0.13, 0.37, index % 2 as 0 | 1, 0.9 + ((index % 3) * 0.035));
  }
  for (let index = 0; index < 11; index += 1) {
    const angle = 1.25 + ((index / 10) * (5.03 - 1.25));
    addCrownCapLeaf(angle, 0.18 + (((index % 3) - 1) * 0.028), 0.97 + ((index % 2) * 0.02), 0.135, 0.39, index % 2 as 0 | 1, 0.9 + ((index % 3) * 0.04));
  }
  for (let index = 0; index < 7; index += 1) {
    const angle = 1.95 + ((index / 6) * (4.33 - 1.95));
    addCrownCapLeaf(angle, -0.1 + (((index % 3) - 1) * 0.025), 0.97 + ((index % 2) * 0.02), 0.125, 0.4, index % 2 as 0 | 1, 0.88 + ((index % 2) * 0.04));
  }
  head.add(mesh('crown-leaf-cap-batch-dark', mergeGeometryBatch(crownCapGeometries[0]), materials.leaf));
  head.add(mesh('crown-leaf-cap-batch-light', mergeGeometryBatch(crownCapGeometries[1]), materials.leafLight));

  const stemMaterial = new THREE.MeshPhysicalMaterial({ color: '#629528', roughness: 0.57, clearcoat: 0.18 });
  const stemFork = new THREE.Group();
  stemFork.name = 'sproutling-bifurcating-stem';
  stemFork.position.set(0, 0.64, -0.02);
  head.add(stemFork);
  stemFork.add(makeTube([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(-0.035, 0.13, 0.02),
    new THREE.Vector3(-0.13, 0.2, 0.12),
  ], 0.07, stemMaterial, 'left-crown-stem', 14));
  stemFork.add(makeTube([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(0.035, 0.13, 0.025),
    new THREE.Vector3(0.11, 0.18, -0.1),
  ], 0.063, stemMaterial, 'right-crown-stem', 14));

  const heroLeaves = [
    { name: 'left-crown-leaf', x: -0.13, y: 0.83, z: 0.1, rz: 1.16, ry: -0.36, width: 0.4, height: 1.13, sx: 1.04, bow: 0.11, curl: 0.045, depth: 0.12 },
    { name: 'right-crown-leaf', x: 0.11, y: 0.81, z: -0.04, rz: -1.12, ry: 0.34, width: 0.28, height: 0.98, sx: 1.02, bow: 0.09, curl: 0.035, depth: 0.12 },
  ];
  heroLeaves.forEach((definition) => {
    const pivot = new THREE.Group();
    pivot.name = definition.name;
    pivot.position.set(definition.x, definition.y, definition.z);
    pivot.rotation.set(0, definition.ry, definition.rz);
    pivot.userData.restRotationZ = definition.rz;
    pivot.userData.swayAmplitude = 0.025;
    pivot.userData.sculptComponentId = definition.name;
    const heroGeometry = colorizeLeafGeometry(
      makeCurvedLeafGeometry(
        definition.width,
        definition.height,
        definition.depth,
        quality === 'high' ? 22 : 13,
        quality === 'high' ? 8 : 5,
        definition.bow,
        definition.curl,
      ),
      '#8bc32b',
      '#d0ef50',
      '#4d7c19',
    );
    const heroLeaf = mesh(`${definition.name}-volume`, heroGeometry, materials.heroLeaf);
    heroLeaf.scale.x = definition.sx;
    pivot.add(heroLeaf);
    addLeafVeinSet(
      pivot,
      definition.name,
      definition.height,
      definition.width,
      materials.leafVein,
      quality,
      definition.bow,
      definition.curl,
      definition.depth,
    );
    head.add(pivot);
    leafPivots.push(pivot);
  });

  const collarDefinitions = Array.from({ length: 18 }, (_, index) => ({
    angle: (((index % 9) + (index < 9 ? 0 : 0.5)) / 9) * TWO_PI,
    layer: (index < 9 ? 0 : 1) as 0 | 1,
    scale: index < 9 ? 0.96 + ((index % 3) * 0.035) : 0.89 + ((index % 2) * 0.04),
  }));
  const collarGeometries: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
  collarDefinitions.forEach((definition) => {
    const collarGeometry = colorizeLeafGeometry(
      makeCurvedLeafGeometry(0.145, 0.325, 0.03, quality === 'high' ? 9 : 6, quality === 'high' ? 4 : 3, 0.018, 0.008),
      definition.layer === 0 ? '#447a20' : '#5d9426',
      '#8fc332',
      '#3b681c',
    );
    const radius = 0.63 + (definition.layer * 0.07);
    const position = new THREE.Vector3(
      Math.sin(definition.angle) * radius,
      -0.065 - (definition.layer * 0.065),
      Math.cos(definition.angle) * radius,
    );
    const outward = new THREE.Vector3(Math.sin(definition.angle), 0.12, Math.cos(definition.angle)).normalize();
    const downhill = new THREE.Vector3(0, -1, 0)
      .sub(outward.clone().multiplyScalar(-outward.y))
      .normalize();
    const across = downhill.clone().cross(outward).normalize();
    collarGeometries[definition.layer].push(transformGeometryWithBasis(
      collarGeometry,
      position,
      across,
      downhill,
      outward,
      new THREE.Vector3(definition.scale, definition.scale, 1),
    ));
  });
  root.add(mesh('leaf-collar-batch-dark', mergeGeometryBatch(collarGeometries[0]), materials.leaf));
  root.add(mesh('leaf-collar-batch-light', mergeGeometryBatch(collarGeometries[1]), materials.leafLight));

  const armPivots: THREE.Group[] = [];
  ([-1, 1] as const).forEach((side) => {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'left-rock-arm' : 'right-rock-arm';
    if (side < 0) {
      arm.position.set(-0.88, -0.19, -0.14);
      arm.rotation.set(0, -0.06, 0.07);
    } else {
      arm.position.set(0.82, -0.18, -0.26);
      arm.rotation.set(0, 0.16, -0.08);
    }
    arm.scale.y = 1.15;
    arm.userData.restRotationZ = arm.rotation.z;
    arm.userData.sculptComponentId = arm.name;
    arm.userData.attachment = { parentSocket: 'torso-shoulder', contactType: 'embedded', embedDepth: 0.18 };

    // The organic socket is deliberately buried in both the pear torso and
    // the stone shell. It makes the gauntlet read as a living limb instead of
    // a separate boulder parked behind the character.
    const shoulderSocket = mesh(
      `${arm.name}-organic-shoulder-socket`,
      colorizePlantGeometry(new THREE.DodecahedronGeometry(0.34, detail)),
      materials.skin,
    );
    shoulderSocket.position.set(side < 0 ? 0.27 : -0.25, side < 0 ? 0.23 : 0.22, side < 0 ? 0.01 : 0);
    shoulderSocket.scale.set(side < 0 ? 0.96 : 0.82, side < 0 ? 0.8 : 0.72, side < 0 ? 0.82 : 0.74);
    arm.add(shoulderSocket);

    const armShellGeometry = colorizeRockGeometry(
      makeCraggyArmShellGeometry(0.53, quality === 'high' ? 22 : 14, quality === 'high' ? 18 : 12, side, side < 0 ? 13.7 : 14.9),
      '#916b45',
      '#bd9160',
      '#5d4430',
      side < 0 ? 13.7 : 14.9,
    );
    const armShell = mesh(`${arm.name}-continuous-shell`, armShellGeometry, materials.stone);
    armShell.position.set(side < 0 ? -0.03 : 0.02, -0.14, side < 0 ? 0 : -0.02);
    armShell.rotation.set(side < 0 ? 0.02 : -0.02, side < 0 ? -0.03 : 0.04, side < 0 ? 0.04 : -0.05);
    armShell.scale.set(side < 0 ? 1.06 : 0.9, side < 0 ? 1.18 : 1.1, side < 0 ? 0.8 : 0.7);
    arm.add(armShell);
    const armourPlateDefinitions = side < 0 ? [
      { position: new THREE.Vector3(-0.1, 0.13, 0.425), scale: new THREE.Vector3(1.34, 0.92, 0.18), rotation: new THREE.Euler(0.04, -0.1, -0.16), seed: 21.1 },
      { position: new THREE.Vector3(-0.01, -0.1, 0.42), scale: new THREE.Vector3(1.16, 0.5, 0.15), rotation: new THREE.Euler(-0.03, -0.02, -0.27), seed: 22.4 },
      { position: new THREE.Vector3(-0.29, -0.27, 0.365), scale: new THREE.Vector3(0.66, 1.02, 0.16), rotation: new THREE.Euler(0.06, 0.14, 0.18), seed: 23.8 },
    ] : [
      { position: new THREE.Vector3(0.09, 0.12, 0.395), scale: new THREE.Vector3(1.06, 0.74, 0.17), rotation: new THREE.Euler(-0.04, 0.12, 0.15), seed: 24.8 },
      { position: new THREE.Vector3(0.01, -0.09, 0.395), scale: new THREE.Vector3(0.94, 0.48, 0.14), rotation: new THREE.Euler(0.03, 0.02, 0.25), seed: 26.1 },
      { position: new THREE.Vector3(0.25, -0.27, 0.345), scale: new THREE.Vector3(0.58, 0.88, 0.15), rotation: new THREE.Euler(-0.05, -0.14, -0.16), seed: 27.5 },
    ];
    const armourPlateGeometries = armourPlateDefinitions.map((plate) => transformGeometry(
      colorizeRockGeometry(new THREE.DodecahedronGeometry(0.25, 1), '#a47a50', '#c79b67', '#604530', plate.seed),
      plate.position,
      plate.rotation,
      plate.scale,
    ));
    arm.add(mesh(`${arm.name}-segmented-armour-plates`, mergeGeometryBatch(armourPlateGeometries), materials.stoneLight));
    for (let index = 0; index < 3; index += 1) {
      const knuckle = mesh(`${arm.name}-knuckle-${index}`, colorizeRockGeometry(
        new THREE.DodecahedronGeometry(0.13 - (index * 0.008), detail),
        index === 1 ? '#8c6844' : '#a57c50',
        '#c29a67',
        '#5c432f',
        (side < 0 ? 11.2 : 12.6) + index,
      ), index === 1 ? materials.stone : materials.stoneLight);
      const knuckleDefinition = (side < 0 ? [
        { position: new THREE.Vector3(0.14, -0.49, 0.61), scale: new THREE.Vector3(1.2, 1.45, 0.95), rotationZ: 0.12 },
        { position: new THREE.Vector3(0.2, -0.29, 0.6), scale: new THREE.Vector3(1.07, 1.12, 0.9), rotationZ: 0.04 },
        { position: new THREE.Vector3(0.25, -0.08, 0.58), scale: new THREE.Vector3(0.9, 0.88, 0.82), rotationZ: -0.12 },
      ] : [
        { position: new THREE.Vector3(-0.13, -0.48, 0.58), scale: new THREE.Vector3(1.12, 1.35, 0.9), rotationZ: -0.12 },
        { position: new THREE.Vector3(-0.19, -0.29, 0.58), scale: new THREE.Vector3(1.02, 1.1, 0.86), rotationZ: -0.04 },
        { position: new THREE.Vector3(-0.24, -0.1, 0.56), scale: new THREE.Vector3(0.88, 0.86, 0.78), rotationZ: 0.12 },
      ])[index];
      knuckle.position.copy(knuckleDefinition.position);
      knuckle.scale.copy(knuckleDefinition.scale);
      knuckle.rotation.z = knuckleDefinition.rotationZ;
      arm.add(knuckle);
    }
    const mossPatch = mesh(`${arm.name}-moss-inlay`, colorizeMossGeometry(new THREE.DodecahedronGeometry(0.28, 1), side < 0 ? 5.2 : 8.7), materials.moss, false);
    mossPatch.position.set(side < 0 ? 0.055 : -0.03, side < 0 ? -0.29 : -0.26, side < 0 ? 0.505 : 0.47);
    mossPatch.scale.set(side < 0 ? 0.68 : 0.57, side < 0 ? 1.02 : 0.88, side < 0 ? 0.16 : 0.145);
    mossPatch.rotation.set(side < 0 ? 0.08 : -0.06, side < 0 ? -0.1 : 0.12, side < 0 ? -0.18 : 0.16);
    arm.add(mossPatch);
    const mossPatchLower = mesh(`${arm.name}-moss-inlay-lower`, colorizeMossGeometry(new THREE.DodecahedronGeometry(0.18, 1), side < 0 ? 11.3 : 14.6), materials.moss, false);
    mossPatchLower.position.set(side < 0 ? -0.31 : -0.2, side < 0 ? -0.12 : -0.08, side < 0 ? 0.43 : 0.425);
    mossPatchLower.scale.set(side < 0 ? 0.55 : 0.42, side < 0 ? 0.42 : 0.32, side < 0 ? 0.14 : 0.13);
    mossPatchLower.rotation.z = side < 0 ? 0.25 : -0.22;
    arm.add(mossPatchLower);
    const carving = makeTube(side < 0 ? [
      new THREE.Vector3(-0.27, 0.16, 0.482),
      new THREE.Vector3(-0.19, 0.25, 0.486),
      new THREE.Vector3(-0.05, 0.24, 0.489),
      new THREE.Vector3(0.01, 0.13, 0.492),
      new THREE.Vector3(-0.08, 0.04, 0.492),
      new THREE.Vector3(-0.18, 0.09, 0.492),
      new THREE.Vector3(-0.13, 0.15, 0.493),
    ] : [
      new THREE.Vector3(0.23, 0.14, 0.452),
      new THREE.Vector3(0.16, 0.21, 0.456),
      new THREE.Vector3(0.05, 0.2, 0.459),
      new THREE.Vector3(-0.01, 0.12, 0.462),
      new THREE.Vector3(0.07, 0.05, 0.462),
      new THREE.Vector3(0.15, 0.09, 0.462),
      new THREE.Vector3(0.11, 0.14, 0.463),
    ], side < 0 ? 0.021 : 0.018, materials.stoneDark, `${arm.name}-spiral-carving`, 18);
    arm.add(carving);
    const armLeaf = mesh(`${arm.name}-shoulder-leaf`, colorizeLeafGeometry(makeLeafGeometry(0.2, 0.36, 0.05, 10), '#64982b', '#a8d43e', '#3b681c'), materials.leaf, false);
    armLeaf.position.set(-side * 0.12, 0.32, 0);
    armLeaf.rotation.z = side * -0.58;
    armLeaf.scale.setScalar(side < 0 ? 1.22 : 1.08);
    arm.add(armLeaf);
    const cuffLeaf = mesh(`${arm.name}-cuff-leaf`, colorizeLeafGeometry(makeLeafGeometry(0.155, 0.28, 0.045, 9), '#568a25', '#9ecb39', '#315c19'), materials.leafLight, false);
    cuffLeaf.position.set(-side * 0.01, 0.27, -0.08);
    cuffLeaf.rotation.z = side * -1.02;
    cuffLeaf.rotation.y = side * 0.18;
    cuffLeaf.scale.setScalar(side < 0 ? 1.12 : 1.02);
    arm.add(cuffLeaf);
    root.add(arm);
    armPivots.push(arm);
  });

  [-1, 1].forEach((side) => {
    const footRoot = new THREE.Group();
    footRoot.name = side < 0 ? 'left-foot' : 'right-foot';
    footRoot.position.set(side * 0.4, -1.02, 0.2);
    footRoot.rotation.y = side * -0.11;
    const leg = mesh(`${side < 0 ? 'left' : 'right'}-short-leg`, colorizePlantGeometry(makePearGeometry(0.29, segments, Math.max(10, segments - 8))), materials.skin);
    leg.position.set(0, 0.06, -0.05);
    leg.scale.set(0.98, 1.16, 0.94);
    footRoot.add(leg);
    const foot = mesh(`${footRoot.name}-sole`, colorizePlantGeometry(new THREE.SphereGeometry(0.32, segments, Math.max(10, segments - 8))), materials.skin);
    foot.position.set(0, -0.09, 0.15);
    foot.scale.set(1.28, 0.78, 1.24);
    footRoot.add(foot);
    root.add(footRoot);
    for (let toeIndex = 0; toeIndex < 3; toeIndex += 1) {
      const toe = mesh(`${side < 0 ? 'left' : 'right'}-toe-${toeIndex}`, new THREE.SphereGeometry(0.112 - (toeIndex * 0.007), 12, 9), materials.toe);
      const lateral = (toeIndex - 1) * 0.13;
      toe.position.set(lateral, -0.11, 0.52 - (Math.abs(lateral) * 0.07));
      toe.scale.set(toeIndex === 1 ? 1.08 : 0.96, toeIndex === 1 ? 0.78 : 0.72, 0.72);
      footRoot.add(toe);
    }
  });

  return { root, leafPivots, armPivots, eyePivots, head };
}

export function createEggHatchThreeModel(options: CreateEggHatchThreeModelOptions): EggHatchThreeModel {
  const quality = options.quality ?? 'high';
  const palette = getEggHatchPalette(options.paletteId);
  const profile = EGG_HATCH_TIER_PROFILES[options.tier];
  const root = new THREE.Group();
  root.name = 'egg-hatch-experience-root';
  root.userData.sculptRuntime = {
    targetId: 'sproutling-3d-egg-hatch-pilot',
    tier: options.tier,
    paletteId: options.paletteId,
    referenceArtSrc: profile.referenceArtSrc,
    clickableRoots: ['egg-root', 'intact-shell', 'lower-shell', 'nest-platform', 'sproutling'],
    explodableRoots: Array.from({ length: profile.fragmentCount }, (_, index) => `shell-fragment-${index}`),
  };

  const rarityBaseColor = options.tier === 'rare' ? '#e3a51d' : options.tier === 'mythic' ? '#25136f' : '#f1e8cc';
  const paletteTintStrength = options.tier === 'common' ? 0.16 : options.tier === 'rare' ? 0.06 : 0.05;
  const shellColor = new THREE.Color(rarityBaseColor).lerp(new THREE.Color(palette.shell), paletteTintStrength);
  const shellSecondary = options.tier === 'rare' ? '#7c3e08' : options.tier === 'mythic' ? '#42158f' : '#b98d2e';
  const crackColor = new THREE.Color(palette.crack);
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: shellColor,
    roughness: options.tier === 'rare' ? 0.13 : profile.roughness,
    metalness: options.tier === 'rare' ? 0.62 : profile.metalness,
    clearcoat: options.tier === 'common' ? 0.68 : options.tier === 'rare' ? 0.88 : 0.94,
    clearcoatRoughness: options.tier === 'rare' ? 0.045 : options.tier === 'mythic' ? 0.1 : 0.16,
    emissive: options.tier === 'rare' ? new THREE.Color('#6f2700') : new THREE.Color(shellColor).multiplyScalar(profile.emissiveStrength),
    emissiveIntensity: options.tier === 'rare' ? 0.38 : 1,
    envMapIntensity: options.tier === 'rare' ? 2.2 : 1,
    side: THREE.DoubleSide,
  });
  const shellInnerMaterial = new THREE.MeshStandardMaterial({ color: '#fff4d8', roughness: 0.78, side: THREE.DoubleSide });
  const rarityAccentColor = options.tier === 'rare' ? '#ffd157' : options.tier === 'mythic' ? '#55dcff' : '#c6962f';
  const accentMaterial = new THREE.MeshPhysicalMaterial({
    color: rarityAccentColor,
    roughness: options.tier === 'mythic' ? 0.18 : 0.12,
    metalness: options.tier === 'mythic' ? 0.08 : 0.72,
    clearcoat: options.tier === 'mythic' ? 0.64 : 0.9,
    clearcoatRoughness: 0.05,
    emissive: new THREE.Color(rarityAccentColor).multiplyScalar(options.tier === 'mythic' ? 0.55 : options.tier === 'rare' ? 0.2 : 0.025),
    emissiveIntensity: 0.92,
    envMapIntensity: options.tier === 'mythic' ? 1 : 2.4,
  });
  const secondaryMaterial = new THREE.MeshStandardMaterial({ color: shellSecondary, roughness: 0.48, metalness: 0.18 });
  const crackMaterial = new THREE.MeshBasicMaterial({ color: crackColor, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#77756a', roughness: 0.96, metalness: 0 });
  const stoneDarkMaterial = new THREE.MeshStandardMaterial({ color: '#4b514b', roughness: 0.98, metalness: 0 });
  const mossMaterial = new THREE.MeshStandardMaterial({ color: '#6e8f28', roughness: 1, metalness: 0 });
  const grassMaterial = new THREE.MeshStandardMaterial({ color: '#739a32', roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const crystalMaterial = new THREE.MeshPhysicalMaterial({
    color: '#62d8ff',
    roughness: 0.1,
    metalness: 0.05,
    transmission: quality === 'high' ? 0.24 : 0,
    thickness: 0.55,
    clearcoat: 0.88,
    emissive: new THREE.Color('#149fd4').multiplyScalar(0.42),
    emissiveIntensity: 1.15,
  });
  const crystalCoreMaterial = new THREE.MeshBasicMaterial({ color: '#b9f8ff', transparent: true, opacity: 0.56 });

  const eggRoot = new THREE.Group();
  eggRoot.name = 'egg-root';
  eggRoot.position.y = -0.04;
  eggRoot.userData.sculptComponentId = 'egg-root';
  eggRoot.userData.clickable = true;
  root.add(eggRoot);
  if (options.tier === 'rare') {
    const rareWarmGlow = new THREE.PointLight('#ffb224', 3.4, 4.8, 2);
    rareWarmGlow.name = 'rare-egg-warm-glow';
    rareWarmGlow.position.set(0, 0.35, 0.35);
    eggRoot.add(rareWarmGlow);
  }

  // The shipped 2D eggs all share one authored environment: an irregular
  // double stone ring, moss/grass pockets, and asymmetric cyan crystal fans.
  // Keeping it real geometry gives the close hatch camera the same grounded
  // read as the inventory art instead of presenting a floating generic egg.
  const nestRoot = new THREE.Group();
  nestRoot.name = 'nest-platform';
  nestRoot.userData.sculptComponentId = 'repo-authored-egg-nest';
  nestRoot.userData.clickable = true;
  root.add(nestRoot);
  const nestStoneGeometries: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
  const stoneCount = quality === 'high' ? 22 : 15;
  for (let index = 0; index < stoneCount; index += 1) {
    const angle = (index / stoneCount) * TWO_PI + 0.06;
    const frontBias = Math.sin(angle) > 0 ? 0.1 : 0;
    const radius = 1.08 + ((index % 4) * 0.055) + frontBias;
    nestStoneGeometries[index % 5 === 0 ? 1 : 0].push(transformGeometry(
      new THREE.DodecahedronGeometry(0.28 + ((index % 3) * 0.035), quality === 'high' ? 1 : 0),
      new THREE.Vector3(Math.cos(angle) * radius, -1.27 + ((index % 3) * 0.055), Math.sin(angle) * radius * 0.72),
      new THREE.Euler(index * 0.31, index * 0.47, index * 0.19),
      new THREE.Vector3(1.18 + ((index % 2) * 0.16), 0.64 + ((index % 4) * 0.04), 0.86),
    ));
  }
  const innerStoneCount = quality === 'high' ? 13 : 9;
  for (let index = 0; index < innerStoneCount; index += 1) {
    const angle = (index / innerStoneCount) * TWO_PI + 0.22;
    const frontOpening = Math.sin(angle) > 0.35;
    const innerRadius = frontOpening ? 0.98 : 0.82;
    nestStoneGeometries[index % 4 === 0 ? 1 : 0].push(transformGeometry(
      new THREE.DodecahedronGeometry(0.2 + ((index % 3) * 0.03), quality === 'high' ? 1 : 0),
      new THREE.Vector3(Math.cos(angle) * innerRadius, -1.13 - (frontOpening ? 0.1 : 0) + ((index % 2) * 0.035), Math.sin(angle) * (frontOpening ? 0.72 : 0.57)),
      new THREE.Euler(index * 0.27, index * 0.38, index * -0.17),
      new THREE.Vector3(frontOpening ? 1.02 : 1.16, frontOpening ? 0.46 : 0.58, 0.82),
    ));
  }
  nestRoot.add(mesh('nest-stone-batch', mergeGeometryBatch(nestStoneGeometries[0]), stoneMaterial));
  nestRoot.add(mesh('nest-dark-stone-batch', mergeGeometryBatch(nestStoneGeometries[1]), stoneDarkMaterial));

  const nestMossGeometries: THREE.BufferGeometry[] = [];
  const mossCount = quality === 'high' ? 17 : 10;
  for (let index = 0; index < mossCount; index += 1) {
    const angle = (index / mossCount) * TWO_PI + 0.15;
    nestMossGeometries.push(transformGeometry(
      new THREE.DodecahedronGeometry(0.16 + ((index % 4) * 0.02), quality === 'high' ? 1 : 0),
      new THREE.Vector3(Math.cos(angle) * (0.88 + ((index % 3) * 0.11)), -1.08 + ((index % 2) * 0.055), Math.sin(angle) * (0.55 + ((index % 2) * 0.09))),
      new THREE.Euler(),
      new THREE.Vector3(1.4, 0.34, 0.9),
    ));
  }
  nestRoot.add(mesh('nest-moss-batch', mergeGeometryBatch(nestMossGeometries), mossMaterial, false));

  const nestGrassGeometries: THREE.BufferGeometry[] = [];
  const grassCount = quality === 'high' ? 16 : 9;
  for (let index = 0; index < grassCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    nestGrassGeometries.push(transformGeometry(
      makeLeafGeometry(0.11, 0.52 + ((index % 3) * 0.08), 0.025, 7),
      new THREE.Vector3(side * (0.56 + ((row % 4) * 0.16)), -1.11, 0.27 - ((row % 3) * 0.18)),
      new THREE.Euler(-0.36, side * 0.25, side * (-0.38 - ((index % 3) * 0.13))),
    ));
  }
  nestRoot.add(mesh('nest-grass-batch', mergeGeometryBatch(nestGrassGeometries), grassMaterial, false));

  const crystalDefinitions = [
    { x: -1.04, y: -0.77, z: -0.08, h: 1.08, r: -0.22, s: 1 },
    { x: -1.32, y: -0.94, z: 0.03, h: 0.72, r: -0.42, s: 0.76 },
    { x: -0.82, y: -1.02, z: 0.2, h: 0.54, r: 0.12, s: 0.66 },
    { x: 1.07, y: -0.78, z: -0.08, h: 1.03, r: 0.24, s: 0.98 },
    { x: 1.34, y: -0.96, z: 0.04, h: 0.69, r: 0.4, s: 0.74 },
    { x: 0.8, y: -1.01, z: 0.22, h: 0.57, r: -0.1, s: 0.65 },
  ];
  const crystalGeometries: THREE.BufferGeometry[] = [];
  const crystalCoreGeometries: THREE.BufferGeometry[] = [];
  crystalDefinitions.forEach((definition, index) => {
    const position = new THREE.Vector3(definition.x, definition.y, definition.z);
    const rotation = new THREE.Euler(0, index * 0.37, definition.r);
    crystalGeometries.push(transformGeometry(
      new THREE.ConeGeometry(0.24 * definition.s, definition.h, 5),
      position,
      rotation,
    ));
    crystalCoreGeometries.push(transformGeometry(
      new THREE.ConeGeometry(0.09 * definition.s, definition.h * 0.72, 5),
      position,
      rotation,
    ));
  });
  nestRoot.add(mesh('nest-blue-crystal-batch', mergeGeometryBatch(crystalGeometries), crystalMaterial));
  nestRoot.add(mesh('nest-blue-crystal-core-batch', mergeGeometryBatch(crystalCoreGeometries), crystalCoreMaterial, false));

  const intactShell = mesh('intact-shell', new THREE.SphereGeometry(1, quality === 'high' ? 48 : 28, quality === 'high' ? 36 : 20), shellMaterial);
  intactShell.scale.set(0.96, 1.34, 0.96);
  intactShell.position.y = 0.16;
  intactShell.userData.sculptComponentId = 'intact-shell';
  intactShell.userData.clickable = true;
  eggRoot.add(intactShell);
  const shellDecorationRoot = new THREE.Group();
  shellDecorationRoot.name = 'shell-surface-marks';
  eggRoot.add(shellDecorationRoot);

  const lowerShell = new THREE.Group();
  lowerShell.name = 'lower-shell';
  lowerShell.userData.sculptComponentId = 'lower-shell';
  lowerShell.userData.clickable = true;
  eggRoot.add(lowerShell);
  const lowerOuter = mesh('lower-shell-outer', new THREE.SphereGeometry(1, quality === 'high' ? 40 : 24, quality === 'high' ? 22 : 14, 0, TWO_PI, Math.PI * 0.48, Math.PI * 0.52), shellMaterial);
  lowerOuter.scale.set(0.96, 1.34, 0.96);
  lowerOuter.position.y = 0.16;
  lowerShell.add(lowerOuter);
  const lowerInner = mesh('lower-shell-inner', new THREE.SphereGeometry(0.87, quality === 'high' ? 36 : 20, 14, 0, TWO_PI, Math.PI * 0.48, Math.PI * 0.52), shellInnerMaterial);
  lowerInner.scale.set(0.96, 1.34, 0.96);
  lowerInner.position.y = 0.16;
  lowerShell.add(lowerInner);
  const rimCount = quality === 'high' ? 16 : 10;
  const rimChipGeometries: THREE.BufferGeometry[] = [];
  for (let index = 0; index < rimCount; index += 1) {
    const angle = (index / rimCount) * TWO_PI;
    const height = 0.1 + ((index % 3) * 0.035);
    rimChipGeometries.push(transformGeometry(
      new THREE.ConeGeometry(0.09, height, 5),
      new THREE.Vector3(Math.cos(angle) * 0.87, 0.16 + (height * 0.2), Math.sin(angle) * 0.87),
      new THREE.Euler(Math.sin(angle) * -0.42, 0, Math.cos(angle) * 0.42),
    ));
  }
  lowerShell.add(mesh('lower-rim-chip-batch', mergeGeometryBatch(rimChipGeometries), shellMaterial));

  const fragmentPivots: THREE.Group[] = [];
  for (let index = 0; index < profile.fragmentCount; index += 1) {
    const segmentAngle = TWO_PI / profile.fragmentCount;
    const centerAngle = (index + 0.5) * segmentAngle;
    const pivot = new THREE.Group();
    pivot.name = `shell-fragment-${index}`;
    pivot.userData.sculptComponentId = 'shell-fragment-set';
    pivot.userData.detachable = true;
    pivot.userData.clickable = true;
    const widthInset = 0.008 + ((index % 3) * 0.006);
    const angleSkew = (((index * 13) % 7) - 3) * 0.008;
    const fragment = mesh(`shell-fragment-volume-${index}`, makeShellWedgeGeometry((index * segmentAngle) + widthInset + angleSkew, ((index + 1) * segmentAngle) - widthInset + angleSkew, quality, index), shellMaterial);
    fragment.scale.set(0.98 + ((index % 3) * 0.012), 0.96 + (((index * 3) % 4) * 0.017), 0.98 + (((index * 5) % 3) * 0.01));
    pivot.add(fragment);
    const innerCap = mesh(`shell-fragment-inner-${index}`, makeShellWedgeGeometry((index * segmentAngle) + widthInset + 0.005 + angleSkew, ((index + 1) * segmentAngle) - widthInset - 0.005 + angleSkew, quality, index), shellInnerMaterial);
    innerCap.scale.set(0.966 + ((index % 2) * 0.008), 0.958 + (((index * 3) % 3) * 0.006), 0.966);
    pivot.add(innerCap);
    eggRoot.add(pivot);
    fragmentPivots.push(pivot);
  }

  const surfaceMarkCount = quality === 'high'
    ? profile.ornamentCount
    : Math.max(10, Math.round(profile.ornamentCount * 0.56));
  for (let index = 0; index < surfaceMarkCount; index += 1) {
    const normalizedY = -0.78 + (((index * 11) % surfaceMarkCount) / Math.max(1, surfaceMarkCount - 1)) * 2.18;
    const angle = ((index * 0.6180339887) % 1) * TWO_PI + 0.15;
    const ellipsoidRadius = Math.sqrt(Math.max(0.08, 1 - ((normalizedY - 0.16) / 1.34) ** 2));
    const isCosmic = options.tier === 'mythic';
    const baseRadius = isCosmic
      ? 0.025 + ((index % 5) * 0.014)
      : options.tier === 'rare'
        ? 0.055 + ((index % 5) * 0.019)
        : 0.05 + ((index % 5) * 0.018);
    const markGeometry = isCosmic
      ? new THREE.OctahedronGeometry(baseRadius, 0)
      : new THREE.SphereGeometry(baseRadius, quality === 'high' ? 10 : 7, quality === 'high' ? 8 : 5);
    const mark = mesh(`${options.tier}-shell-mark-${index}`, markGeometry, index % 5 === 0 ? secondaryMaterial : accentMaterial, false);
    mark.position.set(
      Math.cos(angle) * ellipsoidRadius * 0.972,
      normalizedY,
      Math.sin(angle) * ellipsoidRadius * 0.972,
    );
    if (!isCosmic) mark.scale.set(1.22 + ((index % 4) * 0.2), 0.72 + ((index % 5) * 0.12), options.tier === 'rare' ? 0.34 : 0.29);
    shellDecorationRoot.add(mark);
  }

  const crackRoot = new THREE.Group();
  crackRoot.name = 'crack-network';
  crackRoot.userData.sculptComponentId = 'crack-network';
  eggRoot.add(crackRoot);
  const crackLines = [
    { revealAt: 0.05, width: 0.013, points: [[0.01, 1.36, 0.69], [-0.06, 1.21, 0.78], [0.03, 1.08, 0.83], [-0.1, 0.92, 0.87], [0.01, 0.75, 0.91]] },
    { revealAt: 0.18, width: 0.01, points: [[-0.03, 1.18, 0.79], [-0.24, 1.13, 0.76], [-0.34, 0.98, 0.77], [-0.51, 0.91, 0.7]] },
    { revealAt: 0.28, width: 0.011, points: [[0.02, 1.06, 0.84], [0.2, 0.96, 0.84], [0.27, 0.79, 0.87], [0.47, 0.67, 0.8]] },
    { revealAt: 0.39, width: 0.009, points: [[-0.09, 0.91, 0.88], [-0.29, 0.8, 0.83], [-0.42, 0.64, 0.79], [-0.63, 0.56, 0.67]] },
    { revealAt: 0.48, width: 0.009, points: [[0.01, 0.77, 0.92], [0.13, 0.62, 0.92], [0.08, 0.43, 0.94], [0.25, 0.27, 0.89], [0.22, 0.08, 0.88]] },
    { revealAt: 0.58, width: 0.008, points: [[0.25, 0.67, 0.87], [0.49, 0.57, 0.78], [0.58, 0.39, 0.7]] },
    { revealAt: 0.68, width: 0.007, points: [[-0.4, 0.65, 0.79], [-0.51, 0.43, 0.72], [-0.7, 0.31, 0.57]] },
    { revealAt: 0.77, width: 0.007, points: [[0.09, 0.43, 0.94], [-0.1, 0.3, 0.93], [-0.22, 0.11, 0.88]] },
    { revealAt: 0.85, width: 0.006, points: [[0.23, 0.27, 0.89], [0.43, 0.16, 0.81], [0.55, -0.04, 0.71]] },
  ];
  const crackMeshes = crackLines.map((definition, index) => {
    const crack = makeTube(definition.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), definition.width, crackMaterial, `crack-line-${index}`, quality === 'high' ? 28 : 14);
    crack.userData.revealAt = definition.revealAt;
    crackRoot.add(crack);
    return crack;
  });

  const looseChips: { mesh: THREE.Mesh; revealAt: number; launchAngle: number; basePosition: THREE.Vector3 }[] = [];
  const chipCount = quality === 'high' ? 13 : 7;
  for (let index = 0; index < chipCount; index += 1) {
    const chipGeometry = index % 2 === 0
      ? new THREE.TetrahedronGeometry(0.055 + ((index % 4) * 0.012), 0)
      : new THREE.OctahedronGeometry(0.047 + ((index % 3) * 0.011), 0);
    const chip = mesh(`loose-shell-chip-${index}`, chipGeometry, index % 3 === 0 ? shellInnerMaterial : shellMaterial);
    const launchAngle = (index / chipCount) * TWO_PI + 0.24;
    chip.position.set(Math.cos(launchAngle) * (0.42 + ((index % 4) * 0.09)), 0.56 + ((index % 5) * 0.14), 0.82 - ((index % 3) * 0.04));
    chip.scale.set(1 + ((index % 3) * 0.25), 0.6 + ((index % 4) * 0.16), 0.52 + ((index % 2) * 0.24));
    chip.visible = false;
    root.add(chip);
    looseChips.push({ mesh: chip, revealAt: 0.24 + ((index % 7) * 0.08), launchAngle, basePosition: chip.position.clone() });
  }

  const sparks: THREE.Mesh[] = [];
  for (let index = 0; index < (quality === 'high' ? 18 : 9); index += 1) {
    const spark = mesh(`crack-spark-${index}`, new THREE.OctahedronGeometry(0.035 + ((index % 4) * 0.007), 0), crackMaterial, false);
    spark.visible = false;
    root.add(spark);
    sparks.push(spark);
  }

  const sproutling = createSproutling(quality, palette.leaf);
  sproutling.root.position.set(0, -1.48, -0.03);
  sproutling.root.scale.setScalar(0.84);
  sproutling.root.visible = false;
  root.add(sproutling.root);

  const floorShadow = mesh('egg-contact-shadow', new THREE.CircleGeometry(1.45, quality === 'high' ? 48 : 24), new THREE.MeshBasicMaterial({ color: '#05080e', transparent: true, opacity: 0.42, depthWrite: false }), false);
  floorShadow.rotation.x = -Math.PI / 2;
  floorShadow.position.y = -1.46;
  root.add(floorShadow);

  const allMaterials = new Set<THREE.Material>();
  const allTextures = new Set<THREE.Texture>();
  const allGeometries = new Set<THREE.BufferGeometry>();
  let meshes = 0;
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes += 1;
    allGeometries.add(object.geometry);
    const count = object.geometry.index?.count ?? object.geometry.getAttribute('position')?.count ?? 0;
    triangles += Math.floor(count / 3);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => {
      allMaterials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) allTextures.add(value);
      });
    });
  });
  const metrics: EggHatchModelMetrics = {
    meshes,
    completePoseDrawCalls: 0,
    triangles,
    materials: allMaterials.size,
    fragments: fragmentPivots.length,
  };

  const update = (elapsedSeconds: number, reducedMotion = false): EggHatchPhase => {
    const pose = resolveEggHatchPose(elapsedSeconds, reducedMotion);
    eggRoot.position.y = -0.04 + pose.eggLift;
    eggRoot.rotation.x = pose.eggRotationX;
    eggRoot.rotation.z = pose.eggRotationZ;
    const shellOpacity = 1 - Math.max(0, pose.revealProgress - 0.58) * 0.15;
    shellMaterial.opacity = shellOpacity;
    shellMaterial.transparent = shellOpacity < 0.999;
    const crackPulse = 0.74 + (Math.sin(elapsedSeconds * 24) * 0.18 * pose.crackProgress);
    crackMaterial.opacity = Math.min(1, pose.crackProgress * 1.18) * crackPulse * (1 - pose.burstProgress);
    crackRoot.scale.setScalar(0.82 + (pose.crackProgress * 0.22));
    crackMeshes.forEach((crack) => {
      const revealAt = Number(crack.userData.revealAt ?? 0);
      const localProgress = Math.max(0, Math.min(1, (pose.crackProgress - revealAt) / 0.19));
      crack.visible = localProgress > 0 && pose.burstProgress < 0.08;
      crack.scale.setScalar(0.65 + (localProgress * 0.35));
    });
    looseChips.forEach((chip, index) => {
      const release = Math.max(0, Math.min(1, (pose.crackProgress - chip.revealAt) / 0.16));
      const flight = Math.max(release * 0.35, pose.burstProgress);
      chip.mesh.visible = release > 0 && flight < 0.92;
      if (!chip.mesh.visible) return;
      chip.mesh.position.set(
        chip.basePosition.x + (Math.cos(chip.launchAngle) * flight * (0.34 + ((index % 3) * 0.09))),
        chip.basePosition.y + (0.34 * release) - (0.42 * pose.burstProgress * pose.burstProgress),
        chip.basePosition.z + (Math.sin(chip.launchAngle) * flight * (0.2 + ((index % 2) * 0.07))),
      );
      chip.mesh.rotation.set(flight * (2.1 + index * 0.08), flight * (1.3 + index * 0.11), flight * (2.7 - index * 0.07));
    });

    const hasBurstOpened = pose.burstProgress > 0.012;
    intactShell.visible = !hasBurstOpened;
    shellDecorationRoot.visible = !hasBurstOpened;
    lowerShell.visible = hasBurstOpened;

    fragmentPivots.forEach((fragment, index) => {
      const fragmentPose = resolveEggFragmentPose(index, pose.burstProgress, reducedMotion);
      fragment.position.set(...fragmentPose.position);
      fragment.rotation.set(...fragmentPose.rotation);
      fragment.visible = hasBurstOpened && pose.burstProgress < 1 && (!fragmentPose.resting || pose.revealProgress < 0.45);
    });
    lowerShell.rotation.z = Math.sin(pose.burstProgress * Math.PI) * 0.055;
    // Let the rear cup become a nest rather than a full-height foreground
    // wall. The peek-driven lead starts only after the crown has cleared, then
    // gives the first eye room before the main body reveal takes over.
    const shellPeekLead = (THREE.MathUtils.smoothstep(pose.peekProgress, 0.22, 0.55) * 0.12)
      + (THREE.MathUtils.smoothstep(pose.peekProgress, 0.55, 1) * 0.36);
    const shellNestProgress = Math.max(pose.revealProgress, shellPeekLead);
    lowerShell.position.y = -shellNestProgress * 1.66;
    lowerShell.position.z = -shellNestProgress * 0.96;
    lowerShell.scale.set(1 + (shellNestProgress * 0.05), 1 - (shellNestProgress * 0.34), 1 + (shellNestProgress * 0.03));

    sproutling.root.visible = pose.peekProgress > 0 || pose.revealProgress > 0;
    const revealDamping = reducedMotion
      ? 0
      : pose.revealProgress * Math.pow(1 - pose.revealProgress, 1.65);
    const revealSpring = Math.sin(pose.revealProgress * Math.PI * 3.6) * revealDamping;
    const revealPush = Math.sin(pose.revealProgress * Math.PI) * (reducedMotion ? 0 : 0.045);
    const peekCompression = reducedMotion
      ? 0
      : Math.sin(pose.peekProgress * Math.PI) * (1 - pose.revealProgress) * 0.035;
    sproutling.root.position.y = -1.48 + (pose.creatureRise * 1.52) + revealPush + (revealSpring * 0.035);
    const idleBreath = pose.complete && !reducedMotion ? Math.sin(elapsedSeconds * 1.85) * 0.008 : 0;
    const pushStretch = revealSpring * 0.048;
    sproutling.root.scale.set(
      pose.creatureScale * 0.84 * (1 + peekCompression - (pushStretch * 0.34) - (idleBreath * 0.36)),
      pose.creatureScale * 0.84 * (1 - peekCompression + pushStretch + idleBreath),
      pose.creatureScale * 0.84 * (1 + (peekCompression * 0.42) - (pushStretch * 0.22) - (idleBreath * 0.2)),
    );
    const settleYaw = reducedMotion ? 0 : Math.sin(elapsedSeconds * 1.15) * 0.018 * pose.revealProgress;
    const leadEyeOpen = reducedMotion
      ? Math.max(pose.peekProgress, pose.revealProgress)
      : Math.max(pose.revealProgress, THREE.MathUtils.smoothstep(pose.peekProgress, 0.05, 0.48));
  const followEyeOpen = reducedMotion
      ? leadEyeOpen
      : Math.max(pose.revealProgress, THREE.MathUtils.smoothstep(pose.revealProgress, 0.16, 0.42));
    const peekHeadTurn = reducedMotion ? 0 : (leadEyeOpen - followEyeOpen) * 0.15;
    sproutling.root.rotation.y = settleYaw;
    sproutling.head.rotation.x = -(revealSpring * 0.105) - (pose.leafBounce * 0.035);
    sproutling.head.rotation.y = peekHeadTurn - (settleYaw * 0.5);
    sproutling.head.rotation.z = revealSpring * 0.028;
    const leadLeafPoke = THREE.MathUtils.smoothstep(pose.peekProgress, 0.02, 0.5)
      * (1 - THREE.MathUtils.smoothstep(pose.revealProgress, 0.08, 0.62));
    const followLeafPoke = THREE.MathUtils.smoothstep(pose.peekProgress, 0.34, 0.86)
      * (1 - THREE.MathUtils.smoothstep(pose.revealProgress, 0.16, 0.68));
    sproutling.leafPivots.forEach((leaf, index) => {
      const rest = Number(leaf.userData.restRotationZ ?? 0);
      const swayAmplitude = Number(leaf.userData.swayAmplitude ?? 0.012);
      const idleLeafSway = pose.complete && !reducedMotion
        ? Math.sin((elapsedSeconds * 1.42) + (index * 0.67)) * swayAmplitude
        : 0;
      const outwardDirection = leaf.position.x < 0 ? 1 : -1;
      const isHeroLeaf = leaf.name === 'left-crown-leaf' || leaf.name === 'right-crown-leaf';
      const springAmplitude = isHeroLeaf ? 0.34 : leaf.name.startsWith('rear-') ? 0.09 : 0.15;
      const staggeredSpring = reducedMotion
        ? 0
        : Math.sin((pose.revealProgress * Math.PI * 3.6) + (index * 0.12)) * revealDamping;
      const asymmetricPoke = leaf.name === 'left-crown-leaf'
        ? leadLeafPoke * -0.3
        : leaf.name === 'right-crown-leaf'
          ? (leadLeafPoke * (1 - followLeafPoke) * -0.14) + (followLeafPoke * 0.2)
          : 0;
      leaf.rotation.z = rest
        + asymmetricPoke
        + (staggeredSpring * outwardDirection * springAmplitude)
        + (pose.leafBounce * outwardDirection * springAmplitude * 0.45)
        + idleLeafSway;
    });
    sproutling.armPivots.forEach((arm, index) => {
      const rest = Number(arm.userData.restRotationZ ?? 0);
      const direction = index === 0 ? -1 : 1;
      const idleArmSway = pose.complete && !reducedMotion ? Math.sin((elapsedSeconds * 1.18) + index) * 0.006 : 0;
      const peekBrace = reducedMotion ? 0 : leadLeafPoke * direction * 0.055;
      arm.rotation.z = rest + peekBrace + (revealSpring * direction * 0.16) + idleArmSway;
    });
    sproutling.eyePivots.forEach((eye, index) => {
      const eyeOpen = index === 0 ? leadEyeOpen : followEyeOpen;
      const blinkStart = 7.55 + (index * 0.012);
      const sinceBlinkStart = elapsedSeconds - blinkStart;
      const blinkCycle = sinceBlinkStart >= 0 ? sinceBlinkStart % 3.6 : -1;
      const blinkClosure = !reducedMotion && pose.complete && blinkCycle >= 0 && blinkCycle < 0.2
        ? Math.sin((blinkCycle / 0.2) * Math.PI) ** 2
        : 0;
      const closure = Math.max(1 - THREE.MathUtils.clamp(eyeOpen, 0, 1), blinkClosure);
      const gazePivot = eye.userData.gazePivot as THREE.Group | undefined;
      const catchlight = eye.userData.catchlight as THREE.Mesh | undefined;
      const cream = eye.userData.cream as THREE.Mesh | undefined;
      const outline = eye.userData.outline as THREE.Mesh | undefined;
      const iris = eye.userData.iris as THREE.Mesh | undefined;
      const pupil = eye.userData.pupil as THREE.Mesh | undefined;
      const cornea = eye.userData.cornea as THREE.Mesh | undefined;
      const apertureScale = Math.max(0.035, 1 - closure);
      eye.scale.y = Number(eye.userData.restScaleY ?? 1) * apertureScale;
      [cream, outline, iris, pupil, cornea].forEach((part) => {
        if (part) part.scale.y = Number(part.userData.restScaleY);
      });
      if (gazePivot) {
        gazePivot.scale.y = 1;
        gazePivot.position.y = -0.004;
      }
      if (catchlight) {
        const glintScale = 1 - THREE.MathUtils.smoothstep(closure, 0.35, 0.7);
        catchlight.visible = glintScale > 0.01;
        catchlight.scale.set(glintScale, glintScale, 0.08);
      }
    });

    sparks.forEach((spark, index) => {
      const visible = pose.burstProgress > 0 && pose.burstProgress < 0.82;
      spark.visible = visible;
      if (!visible) return;
      const angle = (index / sparks.length) * TWO_PI + 0.2;
      const distance = pose.burstProgress * (0.85 + ((index % 5) * 0.17));
      spark.position.set(Math.cos(angle) * distance, 0.38 + (Math.sin(pose.burstProgress * Math.PI) * 1.2) + ((index % 3) * 0.12), Math.sin(angle) * distance * 0.64);
      spark.scale.setScalar((1 - pose.burstProgress) * 1.4);
    });
    floorShadow.scale.setScalar(1 - (pose.eggLift * 0.9));
    return pose.phase;
  };

  update(7.2, false);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh)) return;
    let cursor: THREE.Object3D | null = object;
    while (cursor && cursor.visible) cursor = cursor.parent;
    if (cursor == null) metrics.completePoseDrawCalls += 1;
  });
  update(0, false);
  return {
    root,
    metrics,
    update,
    setWireframe: (wireframe) => {
      allMaterials.forEach((material) => {
        if ('wireframe' in material) (material as THREE.MeshStandardMaterial).wireframe = wireframe;
      });
    },
    dispose: () => {
      allGeometries.forEach((geometry) => geometry.dispose());
      allTextures.forEach((texture) => texture.dispose());
      allMaterials.forEach((material) => material.dispose());
      root.clear();
    },
  };
}
