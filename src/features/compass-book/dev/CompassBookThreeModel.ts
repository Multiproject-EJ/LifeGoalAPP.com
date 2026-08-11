import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type CompassBookThreeQuality = 'low' | 'high';

export type CompassBookThreeMetrics = {
  meshes: number;
  materials: number;
  triangles: number;
};

export type CompassBookThreeModel = {
  root: THREE.Group;
  setOpenProgress: (progress: number) => void;
  animate: (elapsedSeconds: number, reducedMotion: boolean) => void;
  metrics: CompassBookThreeMetrics;
  dispose: () => void;
};

type BookMaterials = {
  leather: THREE.MeshPhysicalMaterial;
  leatherInset: THREE.MeshPhysicalMaterial;
  leatherEdge: THREE.MeshStandardMaterial;
  gilt: THREE.MeshPhysicalMaterial;
  giltDark: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  paperWarm: THREE.MeshStandardMaterial;
  pageEdge: THREE.MeshStandardMaterial;
  ink: THREE.MeshStandardMaterial;
  violet: THREE.MeshPhysicalMaterial;
  violetDark: THREE.MeshPhysicalMaterial;
  glow: THREE.MeshBasicMaterial;
};

type MaterialTextures = {
  leatherColor: THREE.CanvasTexture;
  leatherBump: THREE.CanvasTexture;
  leatherRoughness: THREE.CanvasTexture;
  paperBump: THREE.CanvasTexture;
  paperRoughness: THREE.CanvasTexture;
  giltRoughness: THREE.CanvasTexture;
};

type CompassMechanism = {
  root: THREE.Group;
  needleRoot: THREE.Group;
  glow: THREE.Mesh;
};

const COVER_WIDTH = 5.18;
const COVER_DEPTH = 7.42;
const COVER_CENTER_X = COVER_WIDTH / 2;

function seededNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function createSurfaceTexture(
  size: number,
  kind: 'leather-color' | 'leather-bump' | 'leather-roughness' | 'paper-bump' | 'paper-roughness' | 'gilt-roughness',
) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Compass Book texture canvas is unavailable.');
  const image = context.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fine = seededNoise(x, y, kind.length);
      const meso = seededNoise(Math.floor(x / 5), Math.floor(y / 5), kind.length + 9);
      const macro = seededNoise(Math.floor(x / 26), Math.floor(y / 26), kind.length + 21);
      const fibre = Math.sin((x * 0.43 + y * 0.18) + meso * 3.4) * 0.5 + 0.5;
      let red = 128;
      let green = 128;
      let blue = 128;
      if (kind === 'leather-color') {
        const crease = fibre > 0.84 ? -7 : 0;
        red = 7 + fine * 7 + meso * 5 + macro * 3 + crease;
        green = 9 + fine * 8 + meso * 6 + macro * 3 + crease;
        blue = 22 + fine * 12 + meso * 10 + macro * 6 + crease;
      }
      let value = red;
      if (kind === 'leather-bump') value = 105 + fine * 48 + meso * 22;
      if (kind === 'leather-roughness') value = 142 + fine * 38 + meso * 31;
      if (kind === 'paper-bump') value = 125 + fine * 16 + fibre * 13;
      if (kind === 'paper-roughness') value = 204 + fine * 25 + fibre * 9;
      if (kind === 'gilt-roughness') value = 60 + fine * 39 + meso * 31;
      if (kind !== 'leather-color') {
        red = value;
        green = value;
        blue = value;
      }
      const offset = (y * size + x) * 4;
      image.data[offset] = Math.max(0, Math.min(255, red));
      image.data[offset + 1] = Math.max(0, Math.min(255, green));
      image.data[offset + 2] = Math.max(0, Math.min(255, blue));
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `COMPASS_BOOK_${kind.toUpperCase().replace(/-/g, '_')}`;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (kind === 'leather-color') texture.repeat.set(2, 3);
  else texture.repeat.set(kind.startsWith('paper') ? 4 : 3, kind.startsWith('paper') ? 7 : 5);
  texture.colorSpace = kind === 'leather-color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createTextures(quality: CompassBookThreeQuality): MaterialTextures {
  const size = quality === 'high' ? 512 : 128;
  return {
    leatherColor: createSurfaceTexture(size, 'leather-color'),
    leatherBump: createSurfaceTexture(size, 'leather-bump'),
    leatherRoughness: createSurfaceTexture(size, 'leather-roughness'),
    paperBump: createSurfaceTexture(size, 'paper-bump'),
    paperRoughness: createSurfaceTexture(size, 'paper-roughness'),
    giltRoughness: createSurfaceTexture(size, 'gilt-roughness'),
  };
}

function createLetteringPlane(
  name: string,
  width: number,
  depth: number,
  canvasWidth: number,
  canvasHeight: number,
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Compass Book lettering canvas is unavailable.');
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  draw(context, canvasWidth, canvasHeight);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `${name}_TEXTURE`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.08,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 4;
  return mesh;
}

function drawGoldText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
) {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = font;
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(48, 25, 8, 0.94)';
  context.shadowColor = 'rgba(0, 0, 0, 0.72)';
  context.shadowBlur = 9;
  context.shadowOffsetY = 5;
  context.strokeText(text, x, y);
  const gradient = context.createLinearGradient(0, y - 45, 0, y + 45);
  gradient.addColorStop(0, '#fff0a7');
  gradient.addColorStop(0.42, '#e8b95e');
  gradient.addColorStop(1, '#a66c25');
  context.fillStyle = gradient;
  context.fillText(text, x, y);
  context.restore();
}

function createCoverTitleLettering() {
  return createLetteringPlane(
    'COMPASS_BOOK_COVER_TITLE_LETTERING',
    3.75,
    1.55,
    1024,
    440,
    (context, width) => {
      drawGoldText(context, 'H A B I T G A M E', width / 2, 56, '600 28px Georgia, serif');
      drawGoldText(context, 'COMPASS', width / 2, 178, '700 118px Georgia, serif');
      drawGoldText(context, 'BOOK', width / 2, 302, '700 124px Georgia, serif');
      context.strokeStyle = 'rgba(222, 172, 75, 0.9)';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(245, 382);
      context.lineTo(width - 245, 382);
      context.stroke();
      drawGoldText(context, '✦', width / 2, 382, '700 40px Georgia, serif');
    },
  );
}

function createCoverCardinalLettering() {
  return createLetteringPlane(
    'COMPASS_BOOK_COVER_CARDINAL_LETTERING',
    3.75,
    3.75,
    1024,
    1024,
    (context, width, height) => {
      const labelFont = '700 38px Georgia, serif';
      drawGoldText(context, 'KNOW', width / 2, 76, labelFont);
      drawGoldText(context, 'CHOOSE', width - 116, height / 2, labelFont);
      drawGoldText(context, 'ACT', width / 2, height - 70, labelFont);
      drawGoldText(context, 'SUSTAIN', 118, height / 2, labelFont);
    },
  );
}

function createTabLettering(label: string, index: number) {
  return createLetteringPlane(
    `COMPASS_BOOK_TAB_${index + 1}_LETTERING`,
    index === 6 ? 0.58 : 0.43,
    index === 6 ? 0.34 : 0.28,
    256,
    160,
    (context, width, height) => {
      drawGoldText(context, label, width / 2, height / 2, index === 6 ? '700 50px Georgia, serif' : '700 76px Georgia, serif');
    },
  );
}

function createMaterials(textures: MaterialTextures): BookMaterials {
  return {
    leather: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: textures.leatherColor,
      roughness: 0.66,
      roughnessMap: textures.leatherRoughness,
      bumpMap: textures.leatherBump,
      bumpScale: 0.09,
      metalness: 0.02,
      clearcoat: 0.17,
      clearcoatRoughness: 0.58,
    }),
    leatherInset: new THREE.MeshPhysicalMaterial({
      color: 0xd7dcff,
      map: textures.leatherColor,
      roughness: 0.58,
      roughnessMap: textures.leatherRoughness,
      bumpMap: textures.leatherBump,
      bumpScale: 0.075,
      metalness: 0.03,
      clearcoat: 0.23,
      clearcoatRoughness: 0.46,
    }),
    leatherEdge: new THREE.MeshStandardMaterial({
      color: 0x090814,
      roughness: 0.74,
      bumpMap: textures.leatherBump,
      bumpScale: 0.035,
    }),
    gilt: new THREE.MeshPhysicalMaterial({
      color: 0xd7aa53,
      roughness: 0.31,
      roughnessMap: textures.giltRoughness,
      metalness: 0.9,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.3,
    }),
    giltDark: new THREE.MeshStandardMaterial({
      color: 0x66421f,
      roughness: 0.42,
      roughnessMap: textures.giltRoughness,
      metalness: 0.76,
    }),
    paper: new THREE.MeshStandardMaterial({
      color: 0xdac38f,
      roughness: 0.9,
      roughnessMap: textures.paperRoughness,
      bumpMap: textures.paperBump,
      bumpScale: 0.018,
      metalness: 0,
    }),
    paperWarm: new THREE.MeshStandardMaterial({
      color: 0xc8a96f,
      roughness: 0.88,
      roughnessMap: textures.paperRoughness,
      bumpMap: textures.paperBump,
      bumpScale: 0.018,
      metalness: 0,
    }),
    pageEdge: new THREE.MeshStandardMaterial({
      color: 0xd0ad70,
      emissive: 0x25170a,
      emissiveIntensity: 0.18,
      roughness: 0.78,
      roughnessMap: textures.paperRoughness,
      bumpMap: textures.paperBump,
      bumpScale: 0.028,
      metalness: 0.02,
    }),
    ink: new THREE.MeshStandardMaterial({ color: 0x221b31, roughness: 0.82, metalness: 0 }),
    violet: new THREE.MeshPhysicalMaterial({
      color: 0x6e2cc0,
      emissive: 0x351064,
      emissiveIntensity: 0.72,
      roughness: 0.15,
      metalness: 0.24,
      clearcoat: 0.96,
      clearcoatRoughness: 0.07,
      envMapIntensity: 1.2,
    }),
    violetDark: new THREE.MeshPhysicalMaterial({
      color: 0x26143f,
      emissive: 0x1b0735,
      emissiveIntensity: 0.25,
      roughness: 0.27,
      metalness: 0.16,
      clearcoat: 0.62,
      clearcoatRoughness: 0.18,
    }),
    glow: new THREE.MeshBasicMaterial({
      color: 0x8e48f1,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
}

function roundedBox(
  name: string,
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments: number,
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, Math.max(1, segments), Math.max(0.005, radius)),
    material,
  );
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(name: string, width: number, height: number, depth: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createFrame(
  name: string,
  width: number,
  depth: number,
  y: number,
  material: THREE.Material,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = name;
  const thickness = 0.052;
  const segments = quality === 'high' ? 3 : 1;
  const radius = quality === 'high' ? 0.035 : 0.015;
  const top = roundedBox(`${name}_TOP`, width, thickness, 0.075, radius, segments, material);
  const bottom = top.clone();
  top.name = `${name}_TOP`;
  bottom.name = `${name}_BOTTOM`;
  top.position.set(0, y, -depth / 2);
  bottom.position.set(0, y, depth / 2);
  const left = roundedBox(`${name}_LEFT`, 0.075, thickness, depth, radius, segments, material);
  const right = left.clone();
  left.name = `${name}_LEFT`;
  right.name = `${name}_RIGHT`;
  left.position.set(-width / 2, y, 0);
  right.position.set(width / 2, y, 0);
  group.add(top, bottom, left, right);
  return group;
}

function createCornerPlate(
  name: string,
  xSign: number,
  zSign: number,
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = name;
  const segments = quality === 'high' ? 3 : 1;
  const horizontal = roundedBox(`${name}_HORIZONTAL`, 0.92, 0.105, 0.34, 0.08, segments, materials.gilt);
  horizontal.scale.set(1.12, 1, 1.16);
  const vertical = roundedBox(`${name}_VERTICAL`, 0.34, 0.105, 0.92, 0.08, segments, materials.gilt);
  vertical.scale.set(1.16, 1, 1.12);
  horizontal.position.x = -xSign * 0.28;
  vertical.position.z = -zSign * 0.28;
  const inset = roundedBox(`${name}_INSET`, 0.58, 0.12, 0.58, 0.08, segments, materials.giltDark);
  inset.rotation.y = Math.PI / 4;
  const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), materials.gilt);
  jewel.name = `${name}_JEWEL`;
  jewel.position.y = 0.095;
  jewel.scale.set(0.64, 0.4, 0.64);
  group.add(horizontal, vertical, inset, jewel);
  group.position.set(xSign * (COVER_WIDTH / 2 - 0.32), 0.22, zSign * (COVER_DEPTH / 2 - 0.32));
  return group;
}

function createNeedleBlade(
  name: string,
  length: number,
  width: number,
  height: number,
  material: THREE.Material,
  quality: CompassBookThreeQuality,
) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -length * 0.14);
  shape.lineTo(width * 0.52, length * 0.18);
  shape.lineTo(width * 0.28, length * 0.47);
  shape.lineTo(0, length);
  shape.lineTo(-width * 0.28, length * 0.47);
  shape.lineTo(-width * 0.52, length * 0.18);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: quality === 'high' ? 2 : 1,
    steps: 1,
    bevelSize: width * 0.09,
    bevelThickness: height * 0.45,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height * 0.45, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  return mesh;
}

function createCompassMechanism(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
  name: string,
  scale = 1,
): CompassMechanism {
  const root = new THREE.Group();
  root.name = name;
  root.scale.setScalar(scale);
  const radialSegments = quality === 'high' ? 64 : 24;

  const shadowDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(1.43, 1.46, 0.075, radialSegments),
    materials.leatherEdge,
  );
  shadowDisk.name = `${name}_SHADOW_DISK`;
  shadowDisk.position.y = 0.02;
  shadowDisk.castShadow = true;
  root.add(shadowDisk);

  const dial = new THREE.Mesh(
    new THREE.CylinderGeometry(1.31, 1.31, 0.11, radialSegments),
    materials.violetDark,
  );
  dial.name = `${name}_DIAL`;
  dial.position.y = 0.12;
  dial.castShadow = true;
  root.add(dial);

  [1.42, 1.19, 0.92].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 0 ? 0.065 : 0.035, quality === 'high' ? 10 : 5, radialSegments),
      index === 1 ? materials.giltDark : materials.gilt,
    );
    ring.name = `${name}_BEZEL_${index + 1}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2 + index * 0.018;
    ring.castShadow = true;
    root.add(ring);
  });

  const ticks = new THREE.Group();
  ticks.name = `${name}_DIAL_TICKS`;
  const tickCount = quality === 'high' ? 32 : 16;
  for (let index = 0; index < tickCount; index += 1) {
    const major = index % Math.max(1, tickCount / 4) === 0;
    const tick = roundedBox(
      `${name}_TICK_${index + 1}`,
      major ? 0.055 : 0.028,
      major ? 0.045 : 0.025,
      major ? 0.18 : 0.1,
      0.012,
      1,
      major ? materials.gilt : materials.giltDark,
    );
    const angle = (index / tickCount) * Math.PI * 2;
    tick.position.set(Math.sin(angle) * 1.05, 0.245, Math.cos(angle) * 1.05);
    tick.rotation.y = angle;
    ticks.add(tick);
  }
  root.add(ticks);

  const needleRoot = new THREE.Group();
  needleRoot.name = `${name}_NEEDLE_SYSTEM`;
  needleRoot.position.y = 0.3;
  for (let index = 0; index < 8; index += 1) {
    const minorNeedle = createNeedleBlade(
      `${name}_MINOR_GOLD_NEEDLE_${index + 1}`,
      0.76,
      0.12,
      0.035,
      materials.gilt,
      quality,
    );
    minorNeedle.rotation.y = Math.PI / 8 + index * (Math.PI / 4);
    minorNeedle.position.y = -0.005;
    needleRoot.add(minorNeedle);
  }
  for (let index = 0; index < 4; index += 1) {
    const goldNeedle = createNeedleBlade(
      `${name}_GOLD_NEEDLE_${index + 1}`,
      0.96,
      0.22,
      0.045,
      materials.gilt,
      quality,
    );
    goldNeedle.rotation.y = Math.PI / 4 + index * (Math.PI / 2);
    needleRoot.add(goldNeedle);

    const violetBacking = createNeedleBlade(
      `${name}_VIOLET_BACKING_${index + 1}`,
      1.22,
      0.24,
      0.04,
      materials.giltDark,
      quality,
    );
    violetBacking.rotation.y = index * (Math.PI / 2);
    violetBacking.position.y = 0.015;
    needleRoot.add(violetBacking);

    const violetNeedle = createNeedleBlade(
      `${name}_VIOLET_NEEDLE_${index + 1}`,
      1.16,
      0.18,
      0.075,
      materials.violet,
      quality,
    );
    violetNeedle.rotation.y = index * (Math.PI / 2);
    violetNeedle.position.y = 0.07;
    needleRoot.add(violetNeedle);
  }
  root.add(needleRoot);

  const centerBezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, 0.075, quality === 'high' ? 10 : 5, radialSegments),
    materials.gilt,
  );
  centerBezel.name = `${name}_CENTER_BEZEL`;
  centerBezel.rotation.x = Math.PI / 2;
  centerBezel.position.y = 0.43;
  root.add(centerBezel);

  const cabochon = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, quality === 'high' ? 32 : 14, quality === 'high' ? 18 : 8),
    materials.gilt,
  );
  cabochon.name = `${name}_CABOCHON`;
  cabochon.scale.y = 0.52;
  cabochon.position.y = 0.45;
  cabochon.castShadow = true;
  root.add(cabochon);
  const cabochonCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, quality === 'high' ? 24 : 10, quality === 'high' ? 12 : 6),
    materials.violet,
  );
  cabochonCore.name = `${name}_CABOCHON_CORE`;
  cabochonCore.scale.y = 0.48;
  cabochonCore.position.y = 0.57;
  root.add(cabochonCore);

  const finials = new THREE.Group();
  finials.name = `${name}_CARDINAL_FINIALS`;
  for (let index = 0; index < 4; index += 1) {
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), materials.gilt);
    finial.name = `${name}_FINIAL_${index + 1}`;
    const angle = index * (Math.PI / 2);
    finial.position.set(Math.sin(angle) * 1.58, 0.26, Math.cos(angle) * 1.58);
    finial.scale.set(0.72, 0.36, 1.16);
    finial.rotation.y = angle;
    finials.add(finial);
  }
  root.add(finials);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.67, radialSegments),
    materials.glow.clone(),
  );
  glow.name = `${name}_HALO`;
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.075;
  root.add(glow);

  return { root, needleRoot, glow };
}

function createPageBlock(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_PAGE_BLOCK_ASSEMBLY';
  const core = roundedBox(
    'COMPASS_BOOK_PAGE_BLOCK_CORE',
    COVER_WIDTH - 0.28,
    0.52,
    COVER_DEPTH - 0.28,
    0.15,
    quality === 'high' ? 4 : 2,
    materials.pageEdge,
  );
  core.position.y = 0.3;
  group.add(core);

  const leafCount = quality === 'high' ? 18 : 7;
  for (let index = 0; index < leafCount; index += 1) {
    const ratio = index / Math.max(1, leafCount - 1);
    const leaf = roundedBox(
      `COMPASS_BOOK_PAGE_LEAF_${index + 1}`,
      COVER_WIDTH - 0.34 - Math.sin(index * 1.7) * 0.018,
      0.03,
      COVER_DEPTH - 0.34 - Math.cos(index * 1.3) * 0.022,
      0.11,
      quality === 'high' ? 2 : 1,
      index % 4 === 0 ? materials.paperWarm : materials.paper,
    );
    leaf.position.set(Math.sin(index * 2.1) * 0.008, 0.1 + ratio * 0.49, Math.cos(index * 1.4) * 0.008);
    group.add(leaf);
  }
  return group;
}

function createChapterTabs(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_CHAPTER_TAB_RAIL';
  const colors = [0x8f765d, 0x693a91, 0x2d5696, 0x285e53, 0x814729, 0x3a326d, 0x395a35];
  const positions = [-2.65, -1.78, -0.91, -0.04, 0.83, 1.7, 2.62];
  positions.forEach((z, index) => {
    const backing = roundedBox(
      `COMPASS_BOOK_TAB_${index + 1}_GOLD_EDGE`,
      index === 6 ? 1.05 : 0.94,
      0.12,
      index === 6 ? 0.72 : 0.62,
      0.08,
      quality === 'high' ? 3 : 1,
      materials.gilt,
    );
    backing.position.set(COVER_WIDTH + (index === 6 ? 0.29 : 0.23), 0.54, z);
    group.add(backing);
    const material = new THREE.MeshPhysicalMaterial({
      color: colors[index],
      roughness: 0.42,
      metalness: 0.07,
      clearcoat: 0.48,
      clearcoatRoughness: 0.25,
    });
    const tab = roundedBox(
      `COMPASS_BOOK_TAB_${index + 1}`,
      index === 6 ? 0.91 : 0.8,
      0.13,
      index === 6 ? 0.61 : 0.51,
      0.07,
      quality === 'high' ? 3 : 1,
      material,
    );
    tab.position.set(COVER_WIDTH + (index === 6 ? 0.34 : 0.28), 0.61, z);
    group.add(tab);
    const label = createTabLettering(index === 6 ? 'QUEST' : ['I', 'II', 'III', 'IV', 'V', 'VI'][index], index);
    label.position.set(COVER_WIDTH + (index === 6 ? 0.38 : 0.32), 0.69, z);
    group.add(label);
  });
  return group;
}

function createBookmark(materials: BookMaterials, quality: CompassBookThreeQuality) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_BOOKMARK';
  const ribbon = roundedBox(
    'COMPASS_BOOK_BOOKMARK_RIBBON',
    0.62,
    0.055,
    1.5,
    0.08,
    quality === 'high' ? 3 : 1,
    materials.violetDark,
  );
  ribbon.position.z = 0.48;
  group.add(ribbon);
  const edgeLeft = box('COMPASS_BOOK_BOOKMARK_EDGE_LEFT', 0.035, 0.07, 1.45, materials.gilt);
  const edgeRight = edgeLeft.clone();
  edgeRight.name = 'COMPASS_BOOK_BOOKMARK_EDGE_RIGHT';
  edgeLeft.position.set(-0.29, 0.01, 0.48);
  edgeRight.position.set(0.29, 0.01, 0.48);
  group.add(edgeLeft, edgeRight);
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), materials.gilt);
  finial.name = 'COMPASS_BOOK_BOOKMARK_FINIAL';
  finial.scale.set(0.65, 0.25, 1.25);
  finial.position.set(0, 0.08, 1.22);
  group.add(finial);
  return group;
}

function countMetrics(root: THREE.Object3D): CompassBookThreeMetrics {
  let meshes = 0;
  let triangles = 0;
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    meshes += 1;
    triangles += child.geometry.index
      ? child.geometry.index.count / 3
      : (child.geometry.getAttribute('position')?.count ?? 0) / 3;
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
    meshMaterials.forEach((material) => materials.add(material));
  });
  return { meshes, materials: materials.size, triangles: Math.round(triangles) };
}

function disposeObject(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
    meshMaterials.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function createCompassBookThreeModel(
  quality: CompassBookThreeQuality,
): CompassBookThreeModel {
  const textures = createTextures(quality);
  const materials = createMaterials(textures);
  const root = new THREE.Group();
  root.name = 'COMPASS_BOOK_THREE_MODEL';

  const backCover = roundedBox(
    'COMPASS_BOOK_BACK_COVER',
    COVER_WIDTH + 0.16,
    0.24,
    COVER_DEPTH + 0.16,
    0.16,
    quality === 'high' ? 5 : 2,
    materials.leather,
  );
  backCover.position.set(COVER_CENTER_X, -0.02, 0);
  root.add(backCover);
  const backEdge = roundedBox(
    'COMPASS_BOOK_BACK_COVER_EDGE',
    COVER_WIDTH + 0.05,
    0.11,
    COVER_DEPTH + 0.05,
    0.14,
    quality === 'high' ? 4 : 2,
    materials.leatherEdge,
  );
  backEdge.position.set(COVER_CENTER_X, 0.12, 0);
  root.add(backEdge);

  const pageBlock = createPageBlock(materials, quality);
  pageBlock.position.x = COVER_CENTER_X;
  root.add(pageBlock);

  const topRightPage = roundedBox(
    'COMPASS_BOOK_RIGHT_READING_PAGE',
    COVER_WIDTH - 0.35,
    0.055,
    COVER_DEPTH - 0.35,
    0.13,
    quality === 'high' ? 4 : 2,
    materials.paper,
  );
  topRightPage.position.set(COVER_CENTER_X, 0.64, 0);
  root.add(topRightPage);

  const gutterShadow = roundedBox(
    'COMPASS_BOOK_GUTTER_SHADOW',
    0.16,
    0.08,
    COVER_DEPTH - 0.5,
    0.05,
    2,
    materials.giltDark,
  );
  gutterShadow.position.set(0.12, 0.66, 0);
  root.add(gutterShadow);

  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, COVER_DEPTH - 0.08, quality === 'high' ? 36 : 16),
    materials.leather,
  );
  spine.name = 'COMPASS_BOOK_SPINE_SHELL';
  spine.rotation.x = Math.PI / 2;
  spine.position.set(0, 0.27, 0);
  spine.castShadow = true;
  root.add(spine);

  const spineRibs = new THREE.Group();
  spineRibs.name = 'COMPASS_BOOK_SPINE_RIBS';
  const ribCount = quality === 'high' ? 6 : 4;
  for (let index = 0; index < ribCount; index += 1) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.045, quality === 'high' ? 9 : 5, quality === 'high' ? 30 : 14),
      index === 0 || index === ribCount - 1 ? materials.gilt : materials.giltDark,
    );
    rib.name = `COMPASS_BOOK_SPINE_RIB_${index + 1}`;
    rib.position.set(0, 0.27, -3.05 + index * (6.1 / Math.max(1, ribCount - 1)));
    rib.castShadow = true;
    spineRibs.add(rib);
  }
  root.add(spineRibs);

  const spineMedallion = createCompassMechanism(materials, quality, 'COMPASS_BOOK_SPINE_MEDALLION', 0.23);
  spineMedallion.root.rotation.z = Math.PI / 2;
  spineMedallion.root.position.set(-0.39, 0.28, 0.65);
  root.add(spineMedallion.root);

  const tabs = createChapterTabs(materials, quality);
  root.add(tabs);

  const bookmark = createBookmark(materials, quality);
  bookmark.position.set(COVER_WIDTH * 0.42, 0.05, COVER_DEPTH / 2 + 0.55);
  root.add(bookmark);

  const frontPivot = new THREE.Group();
  frontPivot.name = 'COMPASS_BOOK_FRONT_COVER_HINGE';
  frontPivot.position.set(0, 0.82, 0);
  root.add(frontPivot);

  const frontCover = roundedBox(
    'COMPASS_BOOK_FRONT_COVER',
    COVER_WIDTH + 0.18,
    0.26,
    COVER_DEPTH + 0.18,
    0.16,
    quality === 'high' ? 5 : 2,
    materials.leather,
  );
  frontCover.position.set(COVER_CENTER_X, 0, 0);
  frontPivot.add(frontCover);
  const frontEdge = roundedBox(
    'COMPASS_BOOK_FRONT_COVER_EDGE',
    COVER_WIDTH + 0.06,
    0.1,
    COVER_DEPTH + 0.06,
    0.14,
    quality === 'high' ? 4 : 2,
    materials.leatherEdge,
  );
  frontEdge.position.set(COVER_CENTER_X, 0.15, 0);
  frontPivot.add(frontEdge);
  const frontInset = roundedBox(
    'COMPASS_BOOK_FRONT_PANEL_FIELD',
    COVER_WIDTH - 0.34,
    0.08,
    COVER_DEPTH - 0.36,
    0.12,
    quality === 'high' ? 4 : 2,
    materials.leatherInset,
  );
  frontInset.position.set(COVER_CENTER_X, 0.23, 0);
  frontPivot.add(frontInset);

  const outerFrame = createFrame(
    'COMPASS_BOOK_COVER_FRAME_OUTER',
    COVER_WIDTH - 0.54,
    COVER_DEPTH - 0.56,
    0.31,
    materials.gilt,
    quality,
  );
  outerFrame.position.x = COVER_CENTER_X;
  frontPivot.add(outerFrame);
  const innerFrame = createFrame(
    'COMPASS_BOOK_COVER_FRAME_INNER',
    COVER_WIDTH - 0.79,
    COVER_DEPTH - 0.81,
    0.3,
    materials.giltDark,
    quality,
  );
  innerFrame.position.x = COVER_CENTER_X;
  frontPivot.add(innerFrame);

  frontPivot.add(
    createCornerPlate('COMPASS_BOOK_CORNER_NW', -1, -1, materials, quality),
    createCornerPlate('COMPASS_BOOK_CORNER_NE', 1, -1, materials, quality),
    createCornerPlate('COMPASS_BOOK_CORNER_SW', -1, 1, materials, quality),
    createCornerPlate('COMPASS_BOOK_CORNER_SE', 1, 1, materials, quality),
  );
  frontPivot.children.slice(-4).forEach((corner) => { corner.position.x += COVER_CENTER_X; });

  const coverCompass = createCompassMechanism(materials, quality, 'COMPASS_BOOK_COVER_COMPASS', 0.86);
  coverCompass.root.position.set(COVER_CENTER_X, 0.37, 0.68);
  frontPivot.add(coverCompass.root);

  const coverTitleLettering = createCoverTitleLettering();
  coverTitleLettering.position.set(COVER_CENTER_X, 0.6, -1.76);
  frontPivot.add(coverTitleLettering);
  const cardinalLettering = createCoverCardinalLettering();
  cardinalLettering.position.set(COVER_CENTER_X, 0.68, 0.68);
  frontPivot.add(cardinalLettering);

  const titleUnderline = roundedBox(
    'COMPASS_BOOK_TITLE_UNDERLINE',
    2.6,
    0.055,
    0.06,
    0.025,
    2,
    materials.gilt,
  );
  titleUnderline.position.set(COVER_CENTER_X, 0.35, -1.83);
  frontPivot.add(titleUnderline);
  const titleCrown = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), materials.gilt);
  titleCrown.name = 'COMPASS_BOOK_TITLE_STAR';
  titleCrown.position.set(COVER_CENTER_X, 0.4, -2.02);
  titleCrown.scale.set(0.7, 0.35, 1.18);
  frontPivot.add(titleCrown);

  const studPositions = [
    [-1.82, -2.4], [1.82, -2.4], [-1.86, 2.4], [1.86, 2.4],
    [-2.05, -0.55], [2.05, -0.55], [-2.05, 1.65], [2.05, 1.65],
  ];
  const studCount = quality === 'high' ? studPositions.length : 4;
  for (let index = 0; index < studCount; index += 1) {
    const [x, z] = studPositions[index];
    const stud = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), materials.gilt);
    stud.name = `COMPASS_BOOK_COVER_STUD_${index + 1}`;
    stud.position.set(COVER_CENTER_X + x, 0.35, z);
    stud.scale.set(0.62, 0.3, 1.05);
    frontPivot.add(stud);
  }

  const clasp = new THREE.Group();
  clasp.name = 'COMPASS_BOOK_FORE_EDGE_CLASP';
  const claspPlate = roundedBox(
    'COMPASS_BOOK_CLASP_PLATE',
    0.78,
    0.18,
    1.0,
    0.12,
    quality === 'high' ? 4 : 2,
    materials.gilt,
  );
  const claspInset = roundedBox(
    'COMPASS_BOOK_CLASP_INSET',
    0.48,
    0.2,
    0.66,
    0.1,
    quality === 'high' ? 3 : 1,
    materials.giltDark,
  );
  claspInset.position.y = 0.08;
  const claspRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.047, quality === 'high' ? 9 : 5, quality === 'high' ? 28 : 12),
    materials.gilt,
  );
  claspRing.name = 'COMPASS_BOOK_CLASP_COMPASS_RING';
  claspRing.rotation.x = Math.PI / 2;
  claspRing.position.y = 0.23;
  clasp.add(claspPlate, claspInset, claspRing);
  for (let index = 0; index < 4; index += 1) {
    const claspNeedle = createNeedleBlade(
      `COMPASS_BOOK_CLASP_NEEDLE_${index + 1}`,
      0.21,
      0.08,
      0.026,
      index % 2 === 0 ? materials.gilt : materials.violet,
      quality,
    );
    claspNeedle.rotation.y = index * (Math.PI / 2);
    claspNeedle.position.y = 0.25;
    clasp.add(claspNeedle);
  }
  const claspCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 8), materials.violet);
  claspCore.name = 'COMPASS_BOOK_CLASP_COMPASS_CORE';
  claspCore.scale.y = 0.45;
  claspCore.position.y = 0.31;
  clasp.add(claspCore);
  clasp.position.set(COVER_WIDTH + 0.14, 0.18, 0.45);
  frontPivot.add(clasp);

  const leftPage = roundedBox(
    'COMPASS_BOOK_LEFT_READING_PAGE',
    COVER_WIDTH - 0.34,
    0.06,
    COVER_DEPTH - 0.35,
    0.13,
    quality === 'high' ? 4 : 2,
    materials.paper,
  );
  leftPage.position.set(COVER_CENTER_X, -0.39, 0);
  frontPivot.add(leftPage);
  const readingCompass = createCompassMechanism(materials, quality, 'COMPASS_BOOK_READING_COMPASS', 0.76);
  readingCompass.root.position.set(COVER_CENTER_X, -0.48, -0.25);
  frontPivot.add(readingCompass.root);

  const openGlow = new THREE.PointLight(0x8745e3, quality === 'high' ? 5.4 : 3.2, 8, 2);
  openGlow.name = 'COMPASS_BOOK_VIOLET_PAGE_LIGHT';
  openGlow.position.set(0, 2.2, 0.15);
  root.add(openGlow);

  const pageTurnSocket = new THREE.Object3D();
  pageTurnSocket.name = 'COMPASS_BOOK_PAGE_TURN_SOCKET';
  pageTurnSocket.position.set(COVER_CENTER_X, 0.7, COVER_DEPTH * 0.38);
  root.add(pageTurnSocket);

  const nodes: Record<string, THREE.Object3D> = {};
  root.traverse((child) => {
    if (child.name) nodes[child.name] = child;
    if (child instanceof THREE.Mesh && child.parent?.name) child.userData.explodeWithParent = true;
  });
  const requireNode = (name: string) => {
    const node = nodes[name];
    if (!node) throw new Error(`[compass-book-three-model] Missing runtime part ${name}`);
    return node;
  };
  const parts: Record<string, THREE.Object3D> = {
    'back-cover': backCover,
    'back-panel-field': backEdge,
    'page-block': pageBlock,
    'page-leaf-system': requireNode('COMPASS_BOOK_PAGE_LEAF_1'),
    'right-reading-page': topRightPage,
    'spine-shell': spine,
    'spine-ribs': spineRibs,
    'spine-medallion': spineMedallion.root,
    'front-cover-hinge': frontPivot,
    'front-cover': frontCover,
    'front-panel-field': frontInset,
    'cover-frame': outerFrame,
    'corner-plates': requireNode('COMPASS_BOOK_CORNER_NW'),
    'title-relief': coverTitleLettering,
    'cover-studs': requireNode('COMPASS_BOOK_COVER_STUD_1'),
    'cover-compass': coverCompass.root,
    'compass-rings': requireNode('COMPASS_BOOK_COVER_COMPASS_BEZEL_1'),
    'compass-ticks': requireNode('COMPASS_BOOK_COVER_COMPASS_DIAL_TICKS'),
    'compass-needle-system': coverCompass.needleRoot,
    'compass-cabochon': requireNode('COMPASS_BOOK_COVER_COMPASS_CABOCHON'),
    'chapter-tab-rail': tabs,
    'chapter-tabs': requireNode('COMPASS_BOOK_TAB_1'),
    'fore-edge-clasp': clasp,
    'clasp-receiver': claspInset,
    bookmark,
    'left-reading-page': leftPage,
    'reading-compass': readingCompass.root,
    'page-turn-socket': pageTurnSocket,
  };
  Object.entries(parts).forEach(([partId, part]) => {
    part.userData.sculptPartId = partId;
  });
  root.userData.sculptRuntime = {
    nodes,
    parts,
    sockets: {
      coverHinge: frontPivot,
      coverNeedles: coverCompass.needleRoot,
      readingNeedles: readingCompass.needleRoot,
      chapterTabs: tabs,
      bookmark,
      pageTurn: pageTurnSocket,
    },
    colliders: {
      closedBook: { type: 'box', center: [0, 0.42, 0], size: [COVER_WIDTH + 0.8, 1, COVER_DEPTH + 0.3] },
    },
    destructionGroups: { binding: [backCover, spine, frontCover], pages: [pageBlock], interaction: [tabs, clasp, bookmark] },
    presentationOnly: true,
  };

  let openProgress = 0;
  function setOpenProgress(progress: number) {
    openProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = easeInOutCubic(openProgress);
    frontPivot.rotation.z = Math.PI * eased;
    frontPivot.position.y = THREE.MathUtils.lerp(0.82, 0.17, eased);
    root.rotation.y = THREE.MathUtils.lerp(0.025, 0, eased);
    root.position.x = THREE.MathUtils.lerp(-COVER_CENTER_X, 0, eased);
    root.rotation.z = THREE.MathUtils.lerp(-0.03, 0, eased);
    bookmark.position.x = THREE.MathUtils.lerp(COVER_WIDTH * 0.42, 0.22, eased);
    readingCompass.root.visible = eased > 0.43;
    openGlow.intensity = THREE.MathUtils.lerp(0.08, quality === 'high' ? 5.4 : 3.2, eased);
  }
  setOpenProgress(0);

  function animate(elapsedSeconds: number, reducedMotion: boolean) {
    const coverNeedleAngle = reducedMotion ? 0.03 : Math.sin(elapsedSeconds * 0.34) * 0.055;
    const readingNeedleAngle = reducedMotion ? -0.05 : Math.sin(elapsedSeconds * 0.29 + 0.8) * 0.09;
    coverCompass.needleRoot.rotation.y = coverNeedleAngle;
    readingCompass.needleRoot.rotation.y = readingNeedleAngle;
    spineMedallion.needleRoot.rotation.y = coverNeedleAngle * 0.5;
    bookmark.rotation.y = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.42) * 0.025;
    const pulse = reducedMotion ? 0.14 : 0.12 + (Math.sin(elapsedSeconds * 1.05) + 1) * 0.04;
    (coverCompass.glow.material as THREE.MeshBasicMaterial).opacity = pulse;
    (readingCompass.glow.material as THREE.MeshBasicMaterial).opacity = pulse * (0.72 + openProgress * 0.52);
    (spineMedallion.glow.material as THREE.MeshBasicMaterial).opacity = pulse * 0.45;
  }

  return {
    root,
    setOpenProgress,
    animate,
    metrics: countMetrics(root),
    dispose: () => disposeObject(root),
  };
}
