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
  setActivePage: (pageId: string) => void;
  setPageTurnProgress: (progress: number, direction: -1 | 1) => void;
  setCelebrationProgress: (
    progress: number,
    strength: number,
    kind: 'fragment' | 'chapter',
    reducedMotion: boolean,
  ) => void;
  getPageTarget: (object: THREE.Object3D | null) => string | null;
  animate: (elapsedSeconds: number, reducedMotion: boolean) => void;
  metrics: CompassBookThreeMetrics;
  dispose: () => void;
};

export type CompassBookThreeModelOptions = {
  /** Runtime copy and values stay in the accessible DOM; lettering is lab-only. */
  includeLettering?: boolean;
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
  leatherAo: THREE.CanvasTexture;
  paperBump: THREE.CanvasTexture;
  paperRoughness: THREE.CanvasTexture;
  giltColor: THREE.CanvasTexture;
  giltRoughness: THREE.CanvasTexture;
  giltBump: THREE.CanvasTexture;
  giltAo: THREE.CanvasTexture;
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
  kind: 'leather-color' | 'leather-bump' | 'leather-roughness' | 'leather-ao' | 'paper-bump' | 'paper-roughness' | 'gilt-color' | 'gilt-roughness' | 'gilt-bump' | 'gilt-ao',
) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Compass Book texture canvas is unavailable.');
  const image = context.createImageData(size, size);
  const channelSeed = Array.from(kind).reduce((total, character) => total + character.charCodeAt(0), 0);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fine = seededNoise(x, y, channelSeed);
      const meso = seededNoise(Math.floor(x / 5), Math.floor(y / 5), channelSeed + 29);
      const macro = seededNoise(Math.floor(x / 26), Math.floor(y / 26), channelSeed + 71);
      const fibre = Math.sin((x * 0.43 + y * 0.18) + meso * 3.4) * 0.5 + 0.5;
      const crossFibre = Math.sin((x * -0.16 + y * 0.51) + macro * 2.8) * 0.5 + 0.5;
      const hammer = seededNoise(Math.floor(x / 11), Math.floor(y / 11), channelSeed + 113);
      let red = 128;
      let green = 128;
      let blue = 128;
      if (kind === 'leather-color') {
        const crease = fibre > 0.84 ? -7 : 0;
        red = 11 + fine * 8 + meso * 6 + macro * 4 + crease;
        green = 13 + fine * 9 + meso * 7 + macro * 4 + crease;
        blue = 31 + fine * 14 + meso * 12 + macro * 7 + crease;
      }
      if (kind === 'gilt-color') {
        const tarnish = (meso > 0.64 ? -26 : 0) + (macro < 0.2 ? -22 : 0);
        const highlight = fibre > 0.84 ? 21 : 0;
        red = 195 + fine * 32 + macro * 13 + tarnish + highlight;
        green = 139 + fine * 27 + macro * 12 + tarnish * 0.72 + highlight;
        blue = 54 + fine * 18 + macro * 8 + tarnish * 0.34 + highlight * 0.45;
      }
      let value = red;
      if (kind === 'leather-bump') value = 94 + fine * 28 + fibre * 46 + crossFibre * 34 + meso * 12;
      if (kind === 'leather-roughness') value = 139 + fine * 28 + fibre * 24 + crossFibre * 18 + meso * 24;
      if (kind === 'leather-ao') value = 207 + meso * 27 + macro * 14 - (fibre > 0.88 ? 26 : 0) - (crossFibre > 0.9 ? 18 : 0);
      if (kind === 'paper-bump') value = 125 + fine * 16 + fibre * 13;
      if (kind === 'paper-roughness') value = 204 + fine * 25 + fibre * 9;
      if (kind === 'gilt-roughness') value = 48 + fine * 34 + meso * 26 + hammer * 54;
      if (kind === 'gilt-bump') value = 92 + fine * 17 + hammer * 72 + fibre * 20;
      if (kind === 'gilt-ao') value = 205 + meso * 24 + macro * 18 - (hammer < 0.2 ? 46 : 0);
      if (kind !== 'leather-color' && kind !== 'gilt-color') {
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
  texture.colorSpace = kind.endsWith('-color') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (kind.endsWith('-ao')) texture.channel = 0;
  texture.needsUpdate = true;
  return texture;
}

function createTextures(quality: CompassBookThreeQuality): MaterialTextures {
  const colorSize = quality === 'high' ? 1024 : 128;
  const dataSize = quality === 'high' ? 512 : 128;
  return {
    leatherColor: createSurfaceTexture(colorSize, 'leather-color'),
    leatherBump: createSurfaceTexture(dataSize, 'leather-bump'),
    leatherRoughness: createSurfaceTexture(dataSize, 'leather-roughness'),
    leatherAo: createSurfaceTexture(dataSize, 'leather-ao'),
    paperBump: createSurfaceTexture(dataSize, 'paper-bump'),
    paperRoughness: createSurfaceTexture(dataSize, 'paper-roughness'),
    giltColor: createSurfaceTexture(colorSize, 'gilt-color'),
    giltRoughness: createSurfaceTexture(dataSize, 'gilt-roughness'),
    giltBump: createSurfaceTexture(dataSize, 'gilt-bump'),
    giltAo: createSurfaceTexture(dataSize, 'gilt-ao'),
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
      aoMap: textures.leatherAo,
      aoMapIntensity: 0.24,
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
      aoMap: textures.leatherAo,
      aoMapIntensity: 0.28,
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
      aoMap: textures.leatherAo,
      aoMapIntensity: 0.34,
      roughness: 0.74,
      bumpMap: textures.leatherBump,
      bumpScale: 0.035,
    }),
    gilt: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: textures.giltColor,
      aoMap: textures.giltAo,
      aoMapIntensity: 0.26,
      roughness: 0.29,
      roughnessMap: textures.giltRoughness,
      bumpMap: textures.giltBump,
      bumpScale: 0.034,
      metalness: 0.9,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.3,
    }),
    giltDark: new THREE.MeshStandardMaterial({
      color: 0x7c5427,
      aoMap: textures.giltAo,
      aoMapIntensity: 0.34,
      roughness: 0.42,
      roughnessMap: textures.giltRoughness,
      bumpMap: textures.giltBump,
      bumpScale: 0.022,
      metalness: 0.76,
    }),
    paper: new THREE.MeshStandardMaterial({
      color: 0xe4d2a6,
      roughness: 0.9,
      roughnessMap: textures.paperRoughness,
      bumpMap: textures.paperBump,
      bumpScale: 0.018,
      metalness: 0,
    }),
    paperWarm: new THREE.MeshStandardMaterial({
      color: 0xd6b981,
      roughness: 0.88,
      roughnessMap: textures.paperRoughness,
      bumpMap: textures.paperBump,
      bumpScale: 0.018,
      metalness: 0,
    }),
    pageEdge: new THREE.MeshStandardMaterial({
      color: 0xd9bb7e,
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
      color: 0x8241cf,
      emissive: 0x431278,
      emissiveIntensity: 0.82,
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

function createOrnamentalStroke(
  name: string,
  points: Array<[number, number]>,
  y: number,
  radius: number,
  material: THREE.Material,
  quality: CompassBookThreeQuality,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, y, z)),
    false,
    'centripetal',
  );
  const stroke = new THREE.Mesh(
    new THREE.TubeGeometry(
      curve,
      quality === 'high' ? 28 : 10,
      radius,
      quality === 'high' ? 6 : 4,
      false,
    ),
    material,
  );
  stroke.name = name;
  stroke.castShadow = true;
  return stroke;
}

function createCoverFiligree(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_COVER_FILIGREE';
  const sideSigns = [-1, 1];
  const endSigns = [-1, 1];

  sideSigns.forEach((xSign) => {
    endSigns.forEach((zSign) => {
      group.add(createOrnamentalStroke(
        `COMPASS_BOOK_COVER_FILIGREE_OUTER_${xSign}_${zSign}`,
        [
          [xSign * 2.0, zSign * 2.83],
          [xSign * 1.72, zSign * 2.72],
          [xSign * 1.64, zSign * 2.43],
          [xSign * 1.43, zSign * 2.27],
          [xSign * 1.18, zSign * 2.34],
        ],
        0.355,
        0.018,
        materials.gilt,
        quality,
      ));
      if (quality === 'high') {
        group.add(createOrnamentalStroke(
          `COMPASS_BOOK_COVER_FILIGREE_INNER_${xSign}_${zSign}`,
          [
            [xSign * 1.74, zSign * 2.5],
            [xSign * 1.52, zSign * 2.42],
            [xSign * 1.42, zSign * 2.16],
            [xSign * 1.15, zSign * 2.03],
            [xSign * 0.94, zSign * 2.14],
          ],
          0.352,
          0.011,
          materials.giltDark,
          quality,
        ));
      }
      const terminal = new THREE.Mesh(
        new THREE.OctahedronGeometry(quality === 'high' ? 0.075 : 0.06, 0),
        materials.gilt,
      );
      terminal.name = `COMPASS_BOOK_COVER_FILIGREE_TERMINAL_${xSign}_${zSign}`;
      terminal.position.set(xSign * 1.17, 0.39, zSign * 2.34);
      terminal.scale.set(0.7, 0.34, 1.1);
      terminal.rotation.y = Math.PI / 4;
      group.add(terminal);
    });
  });

  if (quality === 'high') {
    const beadGeometry = new THREE.SphereGeometry(0.028, 7, 5);
    const beads = new THREE.InstancedMesh(beadGeometry, materials.giltDark, 28);
    beads.name = 'COMPASS_BOOK_COVER_BEADED_INNER_RAIL';
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < 28; index += 1) {
      const side = index < 14 ? -1 : 1;
      const slot = index % 14;
      const z = -1.72 + slot * (3.44 / 13);
      matrix.makeTranslation(side * 2.06, 0.355, z);
      beads.setMatrixAt(index, matrix);
    }
    beads.instanceMatrix.needsUpdate = true;
    group.add(beads);
  }
  group.position.x = COVER_CENTER_X;
  return group;
}

function createSpineRelief(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_SPINE_RELIEF';
  const seamCount = quality === 'high' ? 3 : 1;
  for (let index = 0; index < seamCount; index += 1) {
    const x = -0.22 + index * (0.44 / Math.max(1, seamCount - 1));
    const seam = roundedBox(
      `COMPASS_BOOK_SPINE_GILT_SEAM_${index + 1}`,
      0.026,
      0.03,
      COVER_DEPTH - 0.74,
      0.012,
      1,
      index === 1 ? materials.gilt : materials.giltDark,
    );
    seam.position.set(x, 0.655 - Math.abs(x) * 0.22, 0);
    group.add(seam);
  }

  [-2.72, 2.72].forEach((z, index) => {
    const hinge = new THREE.Group();
    hinge.name = `COMPASS_BOOK_HINGE_RELIEF_${index + 1}`;
    const plate = roundedBox(
      `COMPASS_BOOK_HINGE_PLATE_${index + 1}`,
      0.64,
      0.09,
      0.5,
      0.08,
      quality === 'high' ? 3 : 1,
      materials.giltDark,
    );
    plate.position.set(0.12, 0.64, z);
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.56, quality === 'high' ? 16 : 8),
      materials.gilt,
    );
    pin.name = `COMPASS_BOOK_HINGE_PIN_${index + 1}`;
    pin.rotation.x = Math.PI / 2;
    pin.position.set(-0.25, 0.64, z);
    hinge.add(plate, pin);
    group.add(hinge);
  });
  return group;
}

function createPageEdgeRelief(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_PAGE_EDGE_RELIEF';
  const lineCount = quality === 'high' ? 12 : 5;
  for (let index = 0; index < lineCount; index += 1) {
    const ratio = index / Math.max(1, lineCount - 1);
    const y = 0.105 + ratio * 0.49;
    const foreEdge = roundedBox(
      `COMPASS_BOOK_FORE_EDGE_LINE_${index + 1}`,
      0.026,
      0.012,
      COVER_DEPTH - 0.58 - Math.sin(index * 1.4) * 0.035,
      0.006,
      1,
      index % 3 === 0 ? materials.giltDark : materials.ink,
    );
    foreEdge.position.set(COVER_WIDTH - 0.075 + Math.sin(index * 0.8) * 0.008, y, 0);
    group.add(foreEdge);

    const tailEdge = roundedBox(
      `COMPASS_BOOK_TAIL_EDGE_LINE_${index + 1}`,
      COVER_WIDTH - 0.53 - Math.cos(index * 0.9) * 0.025,
      0.011,
      0.025,
      0.005,
      1,
      index % 4 === 0 ? materials.giltDark : materials.ink,
    );
    tailEdge.position.set(COVER_CENTER_X, y, COVER_DEPTH / 2 - 0.12 + Math.cos(index * 0.7) * 0.007);
    group.add(tailEdge);
  }
  return group;
}

function createClaspReceiver(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_CLASP_RECEIVER';
  const plate = roundedBox(
    'COMPASS_BOOK_CLASP_RECEIVER_PLATE',
    0.48,
    0.16,
    0.76,
    0.1,
    quality === 'high' ? 3 : 1,
    materials.giltDark,
  );
  const socket = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.048, quality === 'high' ? 8 : 5, quality === 'high' ? 24 : 12),
    materials.gilt,
  );
  socket.name = 'COMPASS_BOOK_CLASP_RECEIVER_SOCKET';
  socket.rotation.x = Math.PI / 2;
  socket.position.y = 0.13;
  group.add(plate, socket);
  group.position.set(COVER_WIDTH + 0.14, 0.18, 0.45);
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
  const shield = roundedBox(
    `${name}_SHIELD`,
    quality === 'high' ? 0.42 : 0.36,
    0.09,
    quality === 'high' ? 0.42 : 0.36,
    0.07,
    segments,
    materials.gilt,
  );
  shield.position.y = 0.075;
  const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), materials.gilt);
  jewel.name = `${name}_JEWEL`;
  jewel.position.y = 0.16;
  jewel.scale.set(0.64, 0.4, 0.64);
  group.add(horizontal, vertical, inset, shield, jewel);
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
  const violetFacetMaterial = materials.glow.clone();
  violetFacetMaterial.name = `${name}_VIOLET_FACET_MATERIAL`;
  violetFacetMaterial.color.set(0xd2a4ff);
  violetFacetMaterial.opacity = 0.62;
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

    const violetFacet = createNeedleBlade(
      `${name}_VIOLET_FACET_${index + 1}`,
      0.91,
      0.065,
      0.024,
      violetFacetMaterial,
      quality,
    );
    violetFacet.rotation.y = index * (Math.PI / 2);
    violetFacet.position.y = 0.145;
    needleRoot.add(violetFacet);
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

  const jewelFacetGeometry = new THREE.DodecahedronGeometry(0.11, quality === 'high' ? 1 : 0);
  for (let index = 0; index < 4; index += 1) {
    const angle = index * (Math.PI / 2);
    const facet = new THREE.Mesh(jewelFacetGeometry, materials.violet);
    facet.name = `${name}_CARDINAL_JEWEL_${index + 1}`;
    facet.position.set(Math.sin(angle) * 0.64, 0.46, Math.cos(angle) * 0.64);
    facet.scale.set(0.8, 0.42, 1.08);
    facet.rotation.set(0, -angle + Math.PI / 4, 0);
    facet.castShadow = true;
    needleRoot.add(facet);
  }

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

function createReadingSignalMarkers(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_READING_SIGNAL_MARKERS';
  const placements = [
    { x: COVER_CENTER_X, z: -2.2, rotate: 0 },
    { x: COVER_CENTER_X, z: 1.72, rotate: 0 },
    { x: 0.58, z: -0.25, rotate: Math.PI / 2 },
    { x: COVER_WIDTH - 0.58, z: -0.25, rotate: Math.PI / 2 },
  ];
  placements.forEach((placement, signalIndex) => {
    const signal = new THREE.Group();
    signal.name = `COMPASS_BOOK_READING_SIGNAL_${signalIndex + 1}`;
    signal.position.set(placement.x, -0.5, placement.z);
    signal.rotation.y = placement.rotate;
    for (let index = 0; index < 5; index += 1) {
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(
          index < 3 ? 0.065 : 0.052,
          index < 3 ? 0.065 : 0.052,
          0.035,
          quality === 'high' ? 16 : 8,
        ),
        index < 3 ? materials.violet : materials.giltDark,
      );
      marker.name = `COMPASS_BOOK_READING_SIGNAL_${signalIndex + 1}_MARK_${index + 1}`;
      marker.position.x = (index - 2) * 0.18;
      signal.add(marker);
    }
    group.add(signal);
  });
  return group;
}

function createLivingWheelRelief(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const root = new THREE.Group();
  root.name = 'COMPASS_BOOK_LIVING_WHEEL_RELIEF';
  root.userData.compassPageId = 'living_wheel';
  const radialSegments = quality === 'high' ? 48 : 24;
  const wedgeSegments = quality === 'high' ? 18 : 9;

  const contactShadow = new THREE.Mesh(
    new THREE.CylinderGeometry(1.61, 1.64, 0.05, radialSegments),
    materials.leatherEdge,
  );
  contactShadow.name = 'COMPASS_BOOK_LIVING_WHEEL_CONTACT_SHADOW';
  contactShadow.position.y = 0.025;
  contactShadow.castShadow = true;
  root.add(contactShadow);

  const enamelColors = [
    0x492a78,
    0x6a368e,
    0x2c4d86,
    0x23635a,
    0x416323,
    0x873b3b,
    0xa85d16,
    0xa37a13,
  ];
  const wedgeGap = 0.035;
  const wedgeAngle = (Math.PI * 2) / enamelColors.length;
  enamelColors.forEach((color, index) => {
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.43,
      roughnessMap: materials.paper.roughnessMap,
      bumpMap: materials.paper.bumpMap,
      bumpScale: quality === 'high' ? 0.018 : 0.01,
      metalness: 0.04,
      clearcoat: quality === 'high' ? 0.58 : 0.34,
      clearcoatRoughness: 0.28,
    });
    material.name = `COMPASS_BOOK_LIVING_WHEEL_ENAMEL_${index + 1}_MATERIAL`;
    const wedge = new THREE.Mesh(
      new THREE.RingGeometry(
        0.5,
        1.47,
        wedgeSegments,
        2,
        index * wedgeAngle + wedgeGap / 2,
        wedgeAngle - wedgeGap,
      ),
      material,
    );
    wedge.name = `COMPASS_BOOK_LIVING_WHEEL_SECTOR_${index + 1}`;
    wedge.rotation.x = -Math.PI / 2;
    wedge.position.y = 0.11;
    wedge.castShadow = true;
    wedge.receiveShadow = true;
    root.add(wedge);
  });

  [1.58, 1.49, 0.52].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        radius,
        index === 0 ? 0.075 : 0.045,
        quality === 'high' ? 10 : 5,
        radialSegments,
      ),
      index === 1 ? materials.giltDark : materials.gilt,
    );
    ring.name = `COMPASS_BOOK_LIVING_WHEEL_BEZEL_${index + 1}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.17 + index * 0.018;
    ring.castShadow = true;
    root.add(ring);
  });

  for (let index = 0; index < 8; index += 1) {
    const angle = index * wedgeAngle;
    const divider = roundedBox(
      `COMPASS_BOOK_LIVING_WHEEL_DIVIDER_${index + 1}`,
      0.055,
      0.075,
      1.14,
      0.018,
      quality === 'high' ? 2 : 1,
      materials.gilt,
    );
    divider.position.set(Math.sin(angle) * 0.97, 0.205, Math.cos(angle) * 0.97);
    divider.rotation.y = angle;
    divider.castShadow = true;
    root.add(divider);

    const stud = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.095,
        quality === 'high' ? 18 : 9,
        quality === 'high' ? 10 : 6,
      ),
      materials.gilt,
    );
    stud.name = `COMPASS_BOOK_LIVING_WHEEL_STUD_${index + 1}`;
    stud.position.set(Math.sin(angle) * 1.57, 0.245, Math.cos(angle) * 1.57);
    stud.scale.y = 0.5;
    stud.castShadow = true;
    root.add(stud);
  }

  const hubShadow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.45, 0.1, radialSegments),
    materials.giltDark,
  );
  hubShadow.name = 'COMPASS_BOOK_LIVING_WHEEL_HUB_SHADOW';
  hubShadow.position.y = 0.2;
  root.add(hubShadow);

  const compassRose = new THREE.Group();
  compassRose.name = 'COMPASS_BOOK_LIVING_WHEEL_COMPASS_ROSE';
  compassRose.position.y = 0.28;
  for (let index = 0; index < 8; index += 1) {
    const longPoint = index % 2 === 0;
    const needle = createNeedleBlade(
      `COMPASS_BOOK_LIVING_WHEEL_ROSE_POINT_${index + 1}`,
      longPoint ? 0.94 : 0.68,
      longPoint ? 0.21 : 0.15,
      longPoint ? 0.045 : 0.035,
      index % 2 === 0 ? materials.gilt : materials.giltDark,
      quality,
    );
    needle.rotation.y = index * (Math.PI / 4);
    needle.castShadow = true;
    compassRose.add(needle);
  }
  root.add(compassRose);

  const hubBezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.065, quality === 'high' ? 10 : 5, radialSegments),
    materials.gilt,
  );
  hubBezel.name = 'COMPASS_BOOK_LIVING_WHEEL_HUB_BEZEL';
  hubBezel.rotation.x = Math.PI / 2;
  hubBezel.position.y = 0.43;
  root.add(hubBezel);

  const jewel = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.2, quality === 'high' ? 1 : 0),
    materials.violet,
  );
  jewel.name = 'COMPASS_BOOK_LIVING_WHEEL_VIOLET_CABOCHON';
  jewel.position.y = 0.45;
  jewel.scale.y = 0.52;
  jewel.castShadow = true;
  root.add(jewel);

  return { root, compassRose, jewel };
}

function createInnerCompassRelief(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const root = new THREE.Group();
  root.name = 'COMPASS_BOOK_INNER_COMPASS_RELIEF';
  root.userData.compassPageId = 'inner_compass';
  const radialSegments = quality === 'high' ? 48 : 24;

  const contactShadow = new THREE.Mesh(
    new THREE.CylinderGeometry(1.62, 1.65, 0.05, radialSegments),
    materials.leatherEdge,
  );
  contactShadow.name = 'COMPASS_BOOK_INNER_COMPASS_CONTACT_SHADOW';
  contactShadow.position.y = 0.025;
  contactShadow.castShadow = true;
  root.add(contactShadow);

  [1.56, 1.4, 1.12].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        radius,
        index === 0 ? 0.075 : index === 1 ? 0.04 : 0.025,
        quality === 'high' ? 10 : 5,
        radialSegments,
      ),
      index === 1 ? materials.giltDark : materials.gilt,
    );
    ring.name = `COMPASS_BOOK_INNER_COMPASS_RING_${index + 1}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.14 + index * 0.015;
    ring.castShadow = true;
    root.add(ring);
  });

  const directionColors = [0x6741a5, 0xd7a629, 0x28745f, 0xb45a28];
  // The relief is mounted on the inside face and then flipped with the opened
  // cover. These local angles therefore look inverted in model space; after
  // that hinge transform they preserve the canonical DOM mapping on screen:
  // North/value, East/energy, South/need, West/shadow pull.
  const directionAngles = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
  const directionMaterials = directionColors.map((color, index) => {
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.4,
      roughnessMap: materials.paper.roughnessMap,
      bumpMap: materials.paper.bumpMap,
      bumpScale: quality === 'high' ? 0.016 : 0.009,
      metalness: 0.08,
      clearcoat: quality === 'high' ? 0.62 : 0.34,
      clearcoatRoughness: 0.24,
    });
    material.name = `COMPASS_BOOK_INNER_COMPASS_DIRECTION_${index + 1}_MATERIAL`;
    return material;
  });

  const compassRose = new THREE.Group();
  compassRose.name = 'COMPASS_BOOK_INNER_COMPASS_ROSE';
  compassRose.position.y = 0.24;
  directionAngles.forEach((angle, index) => {
    const backing = createNeedleBlade(
      `COMPASS_BOOK_INNER_COMPASS_DIRECTION_BACKING_${index + 1}`,
      1.38,
      0.36,
      0.055,
      materials.gilt,
      quality,
    );
    backing.rotation.y = angle;
    backing.castShadow = true;
    compassRose.add(backing);

    const direction = createNeedleBlade(
      `COMPASS_BOOK_INNER_COMPASS_DIRECTION_${index + 1}`,
      1.29,
      0.27,
      0.07,
      directionMaterials[index],
      quality,
    );
    direction.rotation.y = angle;
    direction.position.y = 0.07;
    direction.castShadow = true;
    compassRose.add(direction);

    const tipBezel = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, quality === 'high' ? 18 : 9, quality === 'high' ? 10 : 6),
      materials.gilt,
    );
    tipBezel.name = `COMPASS_BOOK_INNER_COMPASS_TIP_BEZEL_${index + 1}`;
    tipBezel.position.set(-Math.sin(angle) * 1.56, 0.14, -Math.cos(angle) * 1.56);
    tipBezel.scale.y = 0.5;
    tipBezel.castShadow = true;
    root.add(tipBezel);

    const signal = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.075, quality === 'high' ? 1 : 0),
      directionMaterials[index],
    );
    signal.name = `COMPASS_BOOK_INNER_COMPASS_SIGNAL_${index + 1}`;
    signal.position.set(-Math.sin(angle) * 1.56, 0.23, -Math.cos(angle) * 1.56);
    signal.scale.y = 0.5;
    root.add(signal);
  });

  for (let index = 0; index < 4; index += 1) {
    const point = createNeedleBlade(
      `COMPASS_BOOK_INNER_COMPASS_INTERCARDINAL_${index + 1}`,
      0.91,
      0.18,
      0.04,
      index % 2 === 0 ? materials.giltDark : materials.gilt,
      quality,
    );
    point.rotation.y = Math.PI / 4 + index * (Math.PI / 2);
    point.position.y = 0.02;
    point.castShadow = true;
    compassRose.add(point);
  }
  root.add(compassRose);

  const hubShadow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.1, radialSegments),
    materials.giltDark,
  );
  hubShadow.name = 'COMPASS_BOOK_INNER_COMPASS_HUB_SHADOW';
  hubShadow.position.y = 0.25;
  root.add(hubShadow);

  const hubBezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.07, quality === 'high' ? 10 : 5, radialSegments),
    materials.gilt,
  );
  hubBezel.name = 'COMPASS_BOOK_INNER_COMPASS_HUB_BEZEL';
  hubBezel.rotation.x = Math.PI / 2;
  hubBezel.position.y = 0.43;
  root.add(hubBezel);

  const jewel = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.22, quality === 'high' ? 1 : 0),
    materials.violet,
  );
  jewel.name = 'COMPASS_BOOK_INNER_COMPASS_VIOLET_CABOCHON';
  jewel.position.y = 0.45;
  jewel.scale.y = 0.52;
  jewel.castShadow = true;
  root.add(jewel);

  return { root, compassRose, jewel };
}

function createLivingHorizonRelief(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const root = new THREE.Group();
  root.name = 'COMPASS_BOOK_LIVING_HORIZON_RELIEF';
  root.userData.compassPageId = 'living_horizon';
  const high = quality === 'high';
  const radialSegments = high ? 24 : 16;
  const curveSegments = high ? 48 : 28;

  const terrainDark = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_DARK_MATERIAL',
    color: 0x34391f,
    roughness: 0.83,
    roughnessMap: materials.paper.roughnessMap,
    bumpMap: materials.paper.bumpMap,
    bumpScale: high ? 0.024 : 0.012,
  });
  const terrainMid = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_MID_MATERIAL',
    color: 0x545a31,
    roughness: 0.76,
    roughnessMap: materials.paper.roughnessMap,
    bumpMap: materials.paper.bumpMap,
    bumpScale: high ? 0.02 : 0.01,
  });
  const terrainLight = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_LIGHT_MATERIAL',
    color: 0x74734a,
    roughness: 0.72,
    roughnessMap: materials.paper.roughnessMap,
    bumpMap: materials.paper.bumpMap,
    bumpScale: high ? 0.018 : 0.009,
  });
  const timber = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_TIMBER_MATERIAL',
    color: 0x6b4024,
    roughness: 0.66,
    roughnessMap: materials.paper.roughnessMap,
    bumpMap: materials.paper.bumpMap,
    bumpScale: high ? 0.014 : 0.007,
  });
  const timberDark = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_TIMBER_DARK_MATERIAL',
    color: 0x38231a,
    roughness: 0.76,
  });
  const teal = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_TEAL_ENAMEL_MATERIAL',
    color: 0x1c7477,
    roughness: 0.3,
    roughnessMap: materials.paper.roughnessMap,
    bumpMap: materials.paper.bumpMap,
    bumpScale: high ? 0.009 : 0.004,
    metalness: 0.08,
    clearcoat: high ? 0.52 : 0.3,
    clearcoatRoughness: 0.24,
  });
  const water = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_WATER_ENAMEL_MATERIAL',
    color: 0x167e84,
    emissive: 0x063c43,
    emissiveIntensity: 0.2,
    roughness: 0.17,
    metalness: 0.05,
    clearcoat: high ? 0.78 : 0.48,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.1,
  });
  const violetPath = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_VIOLET_PATH_MATERIAL',
    color: 0x512d73,
    emissive: 0x25103f,
    emissiveIntensity: 0.3,
    roughness: 0.27,
    roughnessMap: materials.paper.roughnessMap,
    bumpMap: materials.paper.bumpMap,
    bumpScale: high ? 0.008 : 0.004,
    metalness: 0.05,
    clearcoat: high ? 0.58 : 0.36,
    clearcoatRoughness: 0.18,
  });
  const amber = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_LIVING_HORIZON_AMBER_MATERIAL',
    color: 0xe37b1f,
    emissive: 0x8f300b,
    emissiveIntensity: 0.68,
    roughness: 0.3,
    metalness: 0.03,
    clearcoat: 0.48,
    clearcoatRoughness: 0.18,
  });

  const createTerrainPlate = (
    name: string,
    points: Array<[number, number]>,
    height: number,
    y: number,
    material: THREE.Material,
  ) => {
    const shape = new THREE.Shape();
    points.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelSegments: high ? 2 : 1,
      bevelSize: high ? 0.045 : 0.025,
      bevelThickness: high ? 0.025 : 0.014,
      curveSegments: high ? 12 : 8,
      steps: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const addPitchedRoof = (
    group: THREE.Group,
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
  ) => {
    const halfWidth = width * 0.58;
    const left = roundedBox(`${name}_LEFT`, halfWidth, 0.085, depth, 0.025, high ? 2 : 1, teal);
    const right = roundedBox(`${name}_RIGHT`, halfWidth, 0.085, depth, 0.025, high ? 2 : 1, teal);
    left.position.set(x - width * 0.22, y, z);
    right.position.set(x + width * 0.22, y, z);
    left.rotation.z = -0.46;
    right.rotation.z = 0.46;
    group.add(left, right);
  };

  const contactPlate = roundedBox(
    'COMPASS_BOOK_LIVING_HORIZON_CONTACT_PLATE',
    3.82,
    0.055,
    5.66,
    0.16,
    high ? 4 : 2,
    materials.leatherEdge,
  );
  contactPlate.position.y = 0.025;
  root.add(contactPlate);

  const outerFrame = createFrame(
    'COMPASS_BOOK_LIVING_HORIZON_OUTER_FRAME',
    3.72,
    5.54,
    0.095,
    materials.gilt,
    quality,
  );
  const innerFrame = createFrame(
    'COMPASS_BOOK_LIVING_HORIZON_INNER_FRAME',
    3.5,
    5.3,
    0.105,
    materials.giltDark,
    quality,
  );
  root.add(outerFrame, innerFrame);
  const medallionGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.075, radialSegments);
  const medallionLight = new THREE.InstancedMesh(medallionGeometry, materials.gilt, 2);
  medallionLight.name = 'COMPASS_BOOK_LIVING_HORIZON_FRAME_MEDALLIONS_LIGHT';
  const medallionDark = new THREE.InstancedMesh(medallionGeometry, materials.giltDark, 2);
  medallionDark.name = 'COMPASS_BOOK_LIVING_HORIZON_FRAME_MEDALLIONS_DARK';
  const medallionMatrix = new THREE.Matrix4();
  ([[-1.72, -2.63], [1.72, -2.63], [-1.72, 2.63], [1.72, 2.63]] as Array<[number, number]>).forEach(
    ([x, z], index) => {
      medallionMatrix.makeTranslation(x, 0.145, z);
      (index % 2 === 0 ? medallionLight : medallionDark).setMatrixAt(Math.floor(index / 2), medallionMatrix);
    },
  );
  medallionLight.instanceMatrix.needsUpdate = true;
  medallionDark.instanceMatrix.needsUpdate = true;
  root.add(medallionLight, medallionDark);

  const terrainField = new THREE.Group();
  terrainField.name = 'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_FIELD';
  terrainField.userData.sculptPartId = 'terrain-field';
  const horizonTerrain = createTerrainPlate(
    'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_HORIZON',
    [[-1.55, -2.35], [-0.75, -2.58], [0.3, -2.48], [1.52, -2.28], [1.62, -1.25], [0.72, -1.08], [-0.28, -1.24], [-1.58, -1.12]],
    0.1,
    0.075,
    terrainDark,
  );
  const workshopTerrain = createTerrainPlate(
    'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_WORKSHOP',
    [[-1.6, -1.18], [-0.52, -1.34], [0.25, -0.7], [0.08, 0.28], [-0.62, 0.78], [-1.6, 0.55]],
    0.12,
    0.105,
    terrainMid,
  );
  const gatheringTerrain = createTerrainPlate(
    'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_GATHERING',
    [[0.15, -0.82], [1.52, -1.02], [1.62, 0.72], [0.88, 1.17], [0.02, 0.66]],
    0.15,
    0.13,
    terrainMid,
  );
  const sanctuaryTerrain = createTerrainPlate(
    'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_SANCTUARY',
    [[-1.56, 0.46], [-0.56, 0.58], [0.34, 1.1], [1.2, 1.52], [1.46, 2.34], [0.48, 2.55], [-0.75, 2.5], [-1.62, 2.1]],
    0.19,
    0.155,
    terrainLight,
  );
  terrainField.add(horizonTerrain, workshopTerrain, gatheringTerrain, sanctuaryTerrain);
  root.add(terrainField);

  const pathPoints: Array<[number, number]> = [
    [0.42, 2.42], [0.02, 1.78], [-0.12, 1.1], [0.44, 0.48], [0.18, -0.16], [-0.35, -0.78], [0.03, -1.5], [0.03, -2.18],
  ];
  const createPathCurve = (offsetX: number, y: number) => new THREE.CatmullRomCurve3(
    pathPoints.map(([x, z]) => new THREE.Vector3(x + offsetX, y, z)),
    false,
    'centripetal',
  );
  const vitalPath = new THREE.Group();
  vitalPath.name = 'COMPASS_BOOK_LIVING_HORIZON_VITAL_PATH';
  vitalPath.userData.sculptPartId = 'vital-path';
  const pathCurve = createPathCurve(0, 0.38);
  const pathCore = new THREE.Mesh(
    new THREE.TubeGeometry(pathCurve, curveSegments, 0.12, high ? 8 : 6, false),
    violetPath,
  );
  pathCore.name = 'COMPASS_BOOK_LIVING_HORIZON_PATH_CORE';
  pathCore.castShadow = true;
  vitalPath.add(pathCore);
  const pathRails = new THREE.Group();
  pathRails.name = 'COMPASS_BOOK_LIVING_HORIZON_PATH_RAILS';
  [-0.145, 0.145].forEach((offset, index) => {
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(createPathCurve(offset, 0.405), curveSegments, 0.031, high ? 6 : 5, false),
      materials.gilt,
    );
    rail.name = `COMPASS_BOOK_LIVING_HORIZON_PATH_RAIL_${index + 1}`;
    rail.castShadow = true;
    pathRails.add(rail);
  });
  vitalPath.add(pathRails);
  const milestoneGeometry = new THREE.SphereGeometry(0.055, high ? 10 : 7, high ? 7 : 5);
  const milestoneGilt = new THREE.InstancedMesh(milestoneGeometry, materials.gilt, 6);
  milestoneGilt.name = 'COMPASS_BOOK_LIVING_HORIZON_PATH_MILESTONES_GILT';
  const milestoneAmber = new THREE.InstancedMesh(milestoneGeometry, amber, 2);
  milestoneAmber.name = 'COMPASS_BOOK_LIVING_HORIZON_PATH_MILESTONES_AMBER';
  const milestoneMatrix = new THREE.Matrix4();
  const milestoneQuaternion = new THREE.Quaternion();
  const milestoneScale = new THREE.Vector3(1, 0.55, 1);
  let giltMilestoneIndex = 0;
  let amberMilestoneIndex = 0;
  for (let index = 1; index <= 8; index += 1) {
    const point = pathCurve.getPointAt(index / 9);
    point.y += 0.095;
    milestoneMatrix.compose(point, milestoneQuaternion, milestoneScale);
    if (index % 3 === 0) {
      milestoneAmber.setMatrixAt(amberMilestoneIndex, milestoneMatrix);
      amberMilestoneIndex += 1;
    } else {
      milestoneGilt.setMatrixAt(giltMilestoneIndex, milestoneMatrix);
      giltMilestoneIndex += 1;
    }
  }
  milestoneGilt.instanceMatrix.needsUpdate = true;
  milestoneAmber.instanceMatrix.needsUpdate = true;
  vitalPath.add(milestoneGilt, milestoneAmber);
  root.add(vitalPath);

  const sanctuary = new THREE.Group();
  sanctuary.name = 'COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_ZONE';
  sanctuary.userData.sculptPartId = 'sanctuary-zone';
  const inlet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.63, 0.075, radialSegments),
    water,
  );
  inlet.name = 'COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_INLET';
  inlet.position.set(-0.82, 0.38, 1.68);
  inlet.scale.set(1.18, 1, 0.82);
  sanctuary.add(inlet);
  const cottage = roundedBox(
    'COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_COTTAGE',
    0.72,
    0.32,
    0.64,
    0.08,
    high ? 3 : 1,
    timber,
  );
  cottage.position.set(-0.92, 0.55, 1.35);
  sanctuary.add(cottage);
  addPitchedRoof(sanctuary, 'COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_ROOF', -0.92, 0.78, 1.35, 0.84, 0.76);
  const cottageGable = new THREE.Mesh(
    new THREE.CircleGeometry(0.23, 3),
    materials.giltDark,
  );
  cottageGable.name = 'COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_GABLE';
  cottageGable.rotation.x = -Math.PI / 2;
  cottageGable.rotation.z = Math.PI / 2;
  cottageGable.position.set(-0.92, 0.86, 1.64);
  sanctuary.add(cottageGable);
  const cottageWindow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.045, radialSegments),
    amber,
  );
  cottageWindow.name = 'COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_WINDOW';
  cottageWindow.position.set(-0.92, 0.91, 1.62);
  sanctuary.add(cottageWindow);
  const cottageChimney = roundedBox(
    'COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_CHIMNEY',
    0.12,
    0.31,
    0.12,
    0.025,
    high ? 2 : 1,
    materials.giltDark,
  );
  cottageChimney.position.set(-1.16, 0.86, 1.16);
  sanctuary.add(cottageChimney);
  const doorway = roundedBox(
    'COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_DOORWAY',
    0.18,
    0.08,
    0.24,
    0.035,
    high ? 2 : 1,
    amber,
  );
  doorway.position.set(-0.72, 0.755, 1.58);
  sanctuary.add(doorway);
  for (let index = 0; index < 3; index += 1) {
    const plank = roundedBox(
      `COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_JETTY_${index + 1}`,
      0.12,
      0.07,
      0.66,
      0.02,
      1,
      timberDark,
    );
    plank.position.set(-0.61 + index * 0.13, 0.51, 1.85);
    plank.rotation.y = -0.14;
    sanctuary.add(plank);
  }
  root.add(sanctuary);

  const workshop = new THREE.Group();
  workshop.name = 'COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ZONE';
  workshop.userData.sculptPartId = 'workshop-zone';
  const workshopBody = roundedBox(
    'COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_BODY',
    0.86,
    0.34,
    0.72,
    0.09,
    high ? 3 : 1,
    timber,
  );
  workshopBody.position.set(-0.9, 0.48, -0.18);
  workshop.add(workshopBody);
  const workshopAnnex = roundedBox(
    'COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ANNEX',
    0.48,
    0.25,
    0.52,
    0.07,
    high ? 2 : 1,
    timberDark,
  );
  workshopAnnex.position.set(-0.42, 0.43, 0.02);
  workshop.add(workshopAnnex);
  addPitchedRoof(workshop, 'COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ROOF', -0.9, 0.72, -0.18, 0.98, 0.82);
  addPitchedRoof(workshop, 'COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ANNEX_ROOF', -0.42, 0.61, 0.02, 0.56, 0.6);
  const workshopWindow = roundedBox(
    'COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_WINDOW',
    0.24,
    0.075,
    0.16,
    0.03,
    high ? 2 : 1,
    amber,
  );
  workshopWindow.position.set(-0.84, 0.85, 0.15);
  workshop.add(workshopWindow);
  for (let index = 0; index < 3; index += 1) {
    const step = roundedBox(
      `COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_STEP_${index + 1}`,
      0.44 - index * 0.08,
      0.055,
      0.12,
      0.02,
      1,
      index === 0 ? materials.giltDark : timberDark,
    );
    step.position.set(-0.78, 0.67 + index * 0.045, 0.25 + index * 0.09);
    workshop.add(step);
  }
  const chimney = roundedBox(
    'COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_CHIMNEY',
    0.16,
    0.38,
    0.16,
    0.03,
    high ? 2 : 1,
    materials.giltDark,
  );
  chimney.position.set(-1.18, 0.79, -0.32);
  workshop.add(chimney);
  const gear = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.045, high ? 8 : 5, high ? 24 : 12),
    materials.gilt,
  );
  gear.name = 'COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_GEAR';
  gear.rotation.x = Math.PI / 2;
  gear.position.set(-0.73, 0.84, 0.05);
  workshop.add(gear);
  root.add(workshop);

  const gathering = new THREE.Group();
  gathering.name = 'COMPASS_BOOK_LIVING_HORIZON_GATHERING_ZONE';
  gathering.userData.sculptPartId = 'gathering-zone';
  const arenaFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.67, 0.73, 0.13, radialSegments),
    terrainLight,
  );
  arenaFloor.name = 'COMPASS_BOOK_LIVING_HORIZON_GATHERING_FLOOR';
  arenaFloor.position.set(0.91, 0.43, 0.3);
  gathering.add(arenaFloor);
  const arenaRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.07, high ? 9 : 5, radialSegments),
    materials.giltDark,
  );
  arenaRing.name = 'COMPASS_BOOK_LIVING_HORIZON_GATHERING_RING';
  arenaRing.rotation.x = Math.PI / 2;
  arenaRing.position.set(0.91, 0.54, 0.3);
  gathering.add(arenaRing);
  const seatGeometry = new THREE.TorusGeometry(0.47, 0.055, high ? 7 : 5, high ? 9 : 6, Math.PI / 5);
  const seatsLight = new THREE.InstancedMesh(seatGeometry, materials.gilt, 3);
  seatsLight.name = 'COMPASS_BOOK_LIVING_HORIZON_GATHERING_SEATS_LIGHT';
  const seatsDark = new THREE.InstancedMesh(seatGeometry, materials.giltDark, 3);
  seatsDark.name = 'COMPASS_BOOK_LIVING_HORIZON_GATHERING_SEATS_DARK';
  const seatPosition = new THREE.Vector3(0.91, 0.6, 0.3);
  const seatScale = new THREE.Vector3(1, 1, 1);
  const seatMatrix = new THREE.Matrix4();
  for (let index = 0; index < 6; index += 1) {
    const seatQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.PI / 2, 0, index * (Math.PI / 3) + 0.12),
    );
    seatMatrix.compose(seatPosition, seatQuaternion, seatScale);
    (index % 2 === 0 ? seatsLight : seatsDark).setMatrixAt(Math.floor(index / 2), seatMatrix);
  }
  seatsLight.instanceMatrix.needsUpdate = true;
  seatsDark.instanceMatrix.needsUpdate = true;
  gathering.add(seatsLight, seatsDark);
  const hearth = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.17, high ? 1 : 0),
    amber,
  );
  hearth.name = 'COMPASS_BOOK_LIVING_HORIZON_GATHERING_HEARTH';
  hearth.position.set(0.91, 0.69, 0.3);
  hearth.scale.y = 0.58;
  hearth.castShadow = true;
  gathering.add(hearth);
  root.add(gathering);

  const horizon = new THREE.Group();
  horizon.name = 'COMPASS_BOOK_LIVING_HORIZON_GATE_SYSTEM';
  horizon.userData.sculptPartId = 'horizon-system';
  const rayFan = new THREE.Group();
  rayFan.name = 'COMPASS_BOOK_LIVING_HORIZON_RAY_FAN';
  rayFan.position.set(0, 0.37, -2.31);
  const rayGeometry = new RoundedBoxGeometry(0.038, 0.045, 0.58, 1, 0.012);
  const rays = new THREE.InstancedMesh(rayGeometry, materials.giltDark, 9);
  rays.name = 'COMPASS_BOOK_LIVING_HORIZON_SUN_RAYS';
  const rayMatrix = new THREE.Matrix4();
  for (let index = 0; index < 9; index += 1) {
    const angle = -1.08 + index * 0.27;
    rayMatrix.compose(
      new THREE.Vector3(Math.sin(angle) * 0.34, 0, Math.cos(angle) * 0.34),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0)),
      new THREE.Vector3(1, 1, index % 2 === 0 ? 1 : 0.45 / 0.58),
    );
    rays.setMatrixAt(index, rayMatrix);
  }
  rays.instanceMatrix.needsUpdate = true;
  rayFan.add(rays);
  horizon.add(rayFan);
  const sun = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.37, 0.11, radialSegments),
    amber,
  );
  sun.name = 'COMPASS_BOOK_LIVING_HORIZON_SUN';
  sun.position.set(0, 0.47, -2.31);
  sun.castShadow = true;
  horizon.add(sun);
  [-0.4, 0.4].forEach((x, index) => {
    const post = roundedBox(
      `COMPASS_BOOK_LIVING_HORIZON_GATE_POST_${index + 1}`,
      0.13,
      0.28,
      0.92,
      0.035,
      high ? 2 : 1,
      materials.gilt,
    );
    post.position.set(x, 0.51, -1.87);
    horizon.add(post);
    const finial = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.13, high ? 1 : 0),
      materials.gilt,
    );
    finial.name = `COMPASS_BOOK_LIVING_HORIZON_GATE_FINIAL_${index + 1}`;
    finial.position.set(x, 0.7, -2.34);
    finial.scale.y = 0.62;
    horizon.add(finial);
  });
  const createGateLeaf = (side: -1 | 1) => {
    const leaf = new THREE.Group();
    leaf.name = `COMPASS_BOOK_LIVING_HORIZON_GATE_LEAF_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    leaf.position.set(side * 0.38, 0.55, -1.87);
    leaf.rotation.y = side * -0.7;
    for (let index = 0; index < 3; index += 1) {
      const bar = roundedBox(
        `${leaf.name}_BAR_${index + 1}`,
        0.045,
        0.07,
        0.66,
        0.012,
        1,
        materials.gilt,
      );
      bar.position.x = side * (0.08 + index * 0.13);
      leaf.add(bar);
    }
    [-0.25, 0.02, 0.29].forEach((z, index) => {
      const brace = roundedBox(
        `${leaf.name}_BRACE_${index + 1}`,
        0.43,
        0.065,
        0.045,
        0.012,
        1,
        index === 1 ? materials.gilt : materials.giltDark,
      );
      brace.position.z = z;
      leaf.add(brace);
    });
    horizon.add(leaf);
    return leaf;
  };
  const gateLeft = createGateLeaf(-1);
  const gateRight = createGateLeaf(1);
  root.add(horizon);

  const clusterPlacements: Array<[number, number, number]> = [
    [-1.36, -1.62, 0.68], [-1.43, 0.72, 0.62], [1.33, -1.33, 0.6],
    [1.42, 1.1, 0.68], [-0.15, 2.1, 0.64], [0.92, -1.58, 0.58],
  ];
  const treeGeometry = new THREE.ConeGeometry(0.12, 0.42, high ? 7 : 5);
  const treesDark = new THREE.InstancedMesh(treeGeometry, terrainDark, 3);
  treesDark.name = 'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_TREES_DARK';
  const treesMid = new THREE.InstancedMesh(treeGeometry, terrainMid, 3);
  treesMid.name = 'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_TREES_MID';
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.11, 0), terrainLight, 6);
  rocks.name = 'COMPASS_BOOK_LIVING_HORIZON_TERRAIN_ROCKS';
  const clusterMatrix = new THREE.Matrix4();
  const clusterQuaternion = new THREE.Quaternion();
  clusterPlacements.forEach(([x, z, scale], index) => {
    clusterMatrix.compose(
      new THREE.Vector3(x, 0.38 + 0.18 * scale, z),
      clusterQuaternion,
      new THREE.Vector3(scale, scale, scale),
    );
    (index % 2 === 0 ? treesDark : treesMid).setMatrixAt(Math.floor(index / 2), clusterMatrix);
    clusterMatrix.compose(
      new THREE.Vector3(x + 0.14 * scale, 0.4, z + 0.1 * scale),
      clusterQuaternion,
      new THREE.Vector3(scale, 0.58 * scale, scale),
    );
    rocks.setMatrixAt(index, clusterMatrix);
  });
  treesDark.instanceMatrix.needsUpdate = true;
  treesMid.instanceMatrix.needsUpdate = true;
  rocks.instanceMatrix.needsUpdate = true;
  terrainField.add(treesDark, treesMid, rocks);

  const reliefNodes: Record<string, THREE.Object3D> = {};
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      // One directional shadow pass can nearly double relief draw calls. Keep
      // receiving on every solid, but reserve casting for the large forms that
      // materially communicate terrace and building depth.
      node.castShadow = false;
      node.receiveShadow = true;
    }
    if (node.name) reliefNodes[node.name] = node;
  });
  const requireReliefNode = (name: string) => {
    const node = reliefNodes[name];
    if (!node) throw new Error(`[compass-book-three-model] Missing Living Horizon part ${name}`);
    return node;
  };
  if (high) {
    [
      horizonTerrain,
      workshopTerrain,
      gatheringTerrain,
      sanctuaryTerrain,
      pathCore,
      cottage,
      workshopBody,
      workshopAnnex,
      arenaFloor,
      sun,
      requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_ROOF_LEFT'),
      requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_ROOF_RIGHT'),
      requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ROOF_LEFT'),
      requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ROOF_RIGHT'),
      requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ANNEX_ROOF_LEFT'),
      requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ANNEX_ROOF_RIGHT'),
      requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_GATE_POST_1'),
      requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_GATE_POST_2'),
    ].forEach((node) => {
      node.castShadow = true;
    });
  }
  const reliefParts: Record<string, THREE.Object3D> = {
    root,
    'contact-frame': outerFrame,
    'terrain-field': terrainField,
    'vital-path': vitalPath,
    'sanctuary-zone': sanctuary,
    'workshop-zone': workshop,
    'gathering-zone': gathering,
    'horizon-system': horizon,
    'terrain-lower': sanctuaryTerrain,
    'terrain-middle-left': workshopTerrain,
    'terrain-middle-right': gatheringTerrain,
    'terrain-horizon': horizonTerrain,
    'path-core': pathCore,
    'path-rails': pathRails,
    'sanctuary-inlet': inlet,
    'sanctuary-cottage-body': cottage,
    'sanctuary-cottage-roof': requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_ROOF_LEFT'),
    'sanctuary-jetty': requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_SANCTUARY_JETTY_1'),
    'workshop-body': workshopBody,
    'workshop-roofs': requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_WORKSHOP_ROOF_LEFT'),
    'workshop-gear': gear,
    'gathering-floor': arenaFloor,
    'gathering-seats': arenaRing,
    'gathering-hearth': hearth,
    'gate-posts': requireReliefNode('COMPASS_BOOK_LIVING_HORIZON_GATE_POST_1'),
    'gate-leaves': gateLeft,
    'horizon-sun': sun,
    'horizon-rays': rayFan,
  };
  Object.entries(reliefParts).forEach(([partId, part]) => {
    part.userData.sculptPartId = partId;
  });
  root.userData.sculptRuntime = {
    nodes: reliefNodes,
    parts: reliefParts,
    sockets: {
      pathOrigin: vitalPath,
      sanctuary: sanctuary,
      workshop,
      gathering,
      horizon,
    },
    colliders: {
      relief: { type: 'box', center: [0, 0.25, 0], size: [3.82, 0.7, 5.66] },
    },
    destructionGroups: {
      landscape: [terrainField, vitalPath],
      lifeZones: [sanctuary, workshop, gathering],
      horizon: [horizon],
    },
    presentationOnly: true,
  };

  return { root, violetPath, amber, rayFan, sun, hearth, gateLeft, gateRight };
}

function createIkigaiMapRelief(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const root = new THREE.Group();
  root.name = 'COMPASS_BOOK_IKIGAI_MAP_RELIEF';
  root.userData.compassPageId = 'ikigai_map';
  const high = quality === 'high';
  const radialSegments = high ? 24 : 14;
  const tubeSegments = high ? 36 : 20;
  const createEnamelTexture = (
    kind: 'albedo' | 'roughness' | 'bump' | 'ao',
    profile: 'glaze' | 'mirage' | 'crystal' = 'glaze',
  ) => {
    const size = high ? (profile === 'glaze' ? 1024 : 512) : 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Ikigai enamel texture canvas is unavailable.');
    const pixels = context.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const profileSeed = profile === 'mirage' ? 401 : profile === 'crystal' ? 733 : 0;
        const seed = (kind === 'albedo' ? 137 : kind === 'roughness' ? 151 : kind === 'bump' ? 173 : 197) + profileSeed;
        const fine = seededNoise(x, y, seed);
        const meso = seededNoise(Math.floor(x / 9), Math.floor(y / 9), seed + 60);
        const macro = seededNoise(Math.floor(x / 41), Math.floor(y / 41), seed + 116);
        const orangePeel = (
          Math.sin(x * 0.12 + meso * 4.2)
          + Math.sin(y * 0.14 + macro * 3.4)
        ) * 0.25 + 0.5;
        const miragePit = profile === 'mirage' && meso < 0.16 ? -52 : 0;
        const crystalScratch = profile === 'crystal'
          ? (Math.sin(x * 0.2 + y * 0.075 + fine * 1.8) * 0.5 + 0.5) * 24
          : 0;
        const value = kind === 'albedo'
          ? 226 + fine * 14 + macro * 12
          : kind === 'roughness'
            ? 172 + fine * 46 + meso * 24
            : kind === 'bump'
              ? 94 + fine * 18 + meso * 14 + orangePeel * 64 + miragePit + crystalScratch
              : 220 + meso * 22 + macro * 13;
        const offset = (y * size + x) * 4;
        pixels.data[offset] = value;
        pixels.data[offset + 1] = value;
        pixels.data[offset + 2] = value;
        pixels.data[offset + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = `COMPASS_BOOK_IKIGAI_${profile.toUpperCase()}_${kind.toUpperCase()}`;
    texture.colorSpace = kind === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(
      kind === 'albedo' ? 1.7 : kind === 'ao' ? 1.35 : kind === 'bump' ? 3.2 : 2.4,
      kind === 'albedo' ? 1.7 : kind === 'ao' ? 1.35 : kind === 'bump' ? 3.2 : 2.4,
    );
    if (kind === 'ao') texture.channel = 0;
    texture.needsUpdate = true;
    return texture;
  };
  const enamelAlbedo = createEnamelTexture('albedo');
  const enamelRoughness = createEnamelTexture('roughness');
  const enamelBump = createEnamelTexture('bump');
  const enamelAo = createEnamelTexture('ao');
  const mirageBump = createEnamelTexture('bump', 'mirage');
  const crystalBump = createEnamelTexture('bump', 'crystal');

  const chart = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_IKIGAI_CHART_MATERIAL',
    color: 0xe4e6f4,
    map: materials.leatherInset.map,
    aoMap: materials.leatherInset.aoMap,
    aoMapIntensity: 0.38,
    roughness: 0.82,
    roughnessMap: materials.leatherInset.roughnessMap,
    bumpMap: materials.leatherInset.bumpMap,
    bumpScale: high ? 0.028 : 0.012,
    metalness: 0.08,
  });
  const chartLine = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_IKIGAI_CHART_LINE_MATERIAL',
    color: 0x6d5732,
    map: materials.gilt.map,
    aoMap: materials.gilt.aoMap,
    aoMapIntensity: 0.3,
    roughness: 0.56,
    roughnessMap: materials.gilt.roughnessMap,
    bumpMap: materials.gilt.bumpMap,
    bumpScale: high ? 0.009 : 0.004,
    metalness: 0.28,
  });
  const curiosity = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_IKIGAI_CURIOSITY_MATERIAL',
    color: 0x7139b6,
    map: enamelAlbedo,
    aoMap: enamelAo,
    aoMapIntensity: 0.24,
    emissive: 0x24103f,
    emissiveIntensity: 0.28,
    roughness: 0.25,
    roughnessMap: enamelRoughness,
    bumpMap: enamelBump,
    bumpScale: high ? 0.022 : 0.009,
    metalness: 0.08,
    clearcoat: high ? 0.76 : 0.44,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.95,
    specularIntensity: 0.92,
  });
  const capability = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_IKIGAI_CAPABILITY_MATERIAL',
    color: 0x147985,
    map: enamelAlbedo,
    aoMap: enamelAo,
    aoMapIntensity: 0.22,
    emissive: 0x082f36,
    emissiveIntensity: 0.23,
    roughness: 0.28,
    roughnessMap: enamelRoughness,
    bumpMap: enamelBump,
    bumpScale: high ? 0.018 : 0.008,
    metalness: 0.08,
    clearcoat: high ? 0.7 : 0.4,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.9,
    specularIntensity: 0.88,
  });
  const contribution = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_IKIGAI_CONTRIBUTION_MATERIAL',
    color: 0xa85f45,
    map: enamelAlbedo,
    aoMap: enamelAo,
    aoMapIntensity: 0.26,
    emissive: 0x3c1912,
    emissiveIntensity: 0.18,
    roughness: 0.38,
    roughnessMap: enamelRoughness,
    bumpMap: enamelBump,
    bumpScale: high ? 0.017 : 0.007,
    metalness: 0.54,
    clearcoat: high ? 0.42 : 0.24,
    clearcoatRoughness: 0.24,
    envMapIntensity: 0.88,
  });
  const viability = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_IKIGAI_VIABILITY_MATERIAL',
    color: 0xb27a18,
    map: enamelAlbedo,
    aoMap: enamelAo,
    aoMapIntensity: 0.25,
    emissive: 0x4b2805,
    emissiveIntensity: 0.2,
    roughness: 0.34,
    roughnessMap: enamelRoughness,
    bumpMap: enamelBump,
    bumpScale: high ? 0.016 : 0.007,
    metalness: 0.64,
    clearcoat: high ? 0.4 : 0.22,
    clearcoatRoughness: 0.24,
    envMapIntensity: 0.96,
  });
  const willingness = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_IKIGAI_WILLINGNESS_MATERIAL',
    color: 0xd84b10,
    map: enamelAlbedo,
    aoMap: enamelAo,
    aoMapIntensity: 0.22,
    emissive: 0x7b1d04,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    roughnessMap: enamelRoughness,
    bumpMap: enamelBump,
    bumpScale: high ? 0.022 : 0.009,
    metalness: 0.05,
    clearcoat: high ? 0.72 : 0.42,
    clearcoatRoughness: 0.13,
    envMapIntensity: 0.92,
    specularIntensity: 0.9,
  });
  const mirageMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_IKIGAI_MIRAGE_MATERIAL',
    color: 0x30283e,
    map: enamelAlbedo,
    aoMap: enamelAo,
    aoMapIntensity: 0.34,
    emissive: 0x0c0912,
    emissiveIntensity: 0.08,
    roughness: 0.66,
    roughnessMap: enamelRoughness,
    bumpMap: mirageBump,
    bumpScale: high ? 0.02 : 0.009,
    metalness: 0.12,
    clearcoat: high ? 0.18 : 0.08,
    clearcoatRoughness: 0.52,
    envMapIntensity: 0.42,
  });
  const mirageTetherMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_IKIGAI_MIRAGE_TETHER_MATERIAL',
    color: 0x6f5d86,
    emissive: 0x21172e,
    emissiveIntensity: 0.16,
    roughness: 0.52,
    metalness: 0.18,
    clearcoat: high ? 0.22 : 0.1,
    clearcoatRoughness: 0.46,
  });
  const trialMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_IKIGAI_TRIAL_CRYSTAL_MATERIAL',
    color: 0x8e48f1,
    map: enamelAlbedo,
    aoMap: enamelAo,
    aoMapIntensity: 0.2,
    emissive: 0x48208f,
    emissiveIntensity: 0.88,
    roughness: 0.14,
    roughnessMap: enamelRoughness,
    bumpMap: crystalBump,
    bumpScale: high ? 0.006 : 0.003,
    metalness: 0.06,
    clearcoat: high ? 0.9 : 0.52,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.16,
    specularIntensity: 1,
  });

  const contactPlate = roundedBox(
    'COMPASS_BOOK_IKIGAI_CONTACT_PLATE',
    3.82,
    0.055,
    5.66,
    0.16,
    high ? 4 : 2,
    materials.leatherEdge,
  );
  contactPlate.position.y = 0.025;
  contactPlate.receiveShadow = true;
  root.add(contactPlate);

  const chartField = roundedBox(
    'COMPASS_BOOK_IKIGAI_CHART_FIELD',
    3.48,
    0.075,
    5.26,
    0.2,
    high ? 4 : 2,
    chart,
  );
  chartField.position.y = 0.075;
  chartField.receiveShadow = true;
  root.add(chartField);
  const contactFrame = new THREE.Group();
  contactFrame.name = 'COMPASS_BOOK_IKIGAI_CONTACT_FRAME';
  const frameBezel = createFrame(
    'COMPASS_BOOK_IKIGAI_OUTER_FRAME',
    3.72,
    5.54,
    0.1,
    materials.gilt,
    quality,
  );
  const frameInset = createFrame(
    'COMPASS_BOOK_IKIGAI_INNER_FRAME',
    3.5,
    5.3,
    0.115,
    materials.giltDark,
    quality,
  );
  contactFrame.add(frameBezel, frameInset);
  root.add(contactFrame);

  const orbitGroup = new THREE.Group();
  orbitGroup.name = 'COMPASS_BOOK_IKIGAI_CHART_ORBITS';
  [0.58, 1.08, 1.54].forEach((radius, index) => {
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 2 ? 0.012 : 0.016, high ? 6 : 4, high ? 56 : 28),
      chartLine,
    );
    orbit.name = `COMPASS_BOOK_IKIGAI_CHART_ORBIT_${index + 1}`;
    orbit.rotation.x = Math.PI / 2;
    orbit.position.set(index === 1 ? -0.12 : 0.04, 0.145 + index * 0.004, index === 2 ? -0.05 : 0.18);
    orbit.scale.z = 1.28 - index * 0.08;
    orbitGroup.add(orbit);
  });
  root.add(orbitGroup);

  const starPositions: Array<[number, number, number]> = [
    [-1.48, -2.14, 0.03], [-0.94, -1.95, 0.02], [-0.34, -2.32, 0.035],
    [0.42, -2.06, 0.025], [1.32, -1.84, 0.03], [-1.52, -1.05, 0.022],
    [1.48, -0.96, 0.025], [-1.35, 0.18, 0.03], [1.5, 0.28, 0.022],
    [-1.52, 1.12, 0.028], [1.46, 1.22, 0.035], [-1.36, 2.18, 0.024],
    [-0.36, 2.34, 0.03], [0.62, 2.2, 0.026], [1.34, 2.48, 0.02],
  ];
  const starStuds = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.035, 0),
    materials.gilt,
    starPositions.length,
  );
  starStuds.name = 'COMPASS_BOOK_IKIGAI_CHART_STAR_STUDS';
  const instanceMatrix = new THREE.Matrix4();
  const instanceQuaternion = new THREE.Quaternion();
  const instanceScale = new THREE.Vector3();
  starPositions.forEach(([x, z, scaleOffset], index) => {
    instanceScale.setScalar(0.8 + scaleOffset * 8 + (index % 3) * 0.08);
    instanceMatrix.compose(new THREE.Vector3(x, 0.175, z), instanceQuaternion, instanceScale);
    starStuds.setMatrixAt(index, instanceMatrix);
  });
  starStuds.instanceMatrix.needsUpdate = true;
  root.add(starStuds);

  const nodeData = [
    { id: 'CURIOSITY', x: 0, z: -1.72, material: curiosity },
    { id: 'CAPABILITY', x: 1.34, z: -0.48, material: capability },
    { id: 'CONTRIBUTION', x: 0.88, z: 1.28, material: contribution },
    { id: 'VIABILITY', x: -0.88, z: 1.28, material: viability },
    { id: 'WILLINGNESS', x: -1.34, z: -0.48, material: willingness },
  ] as const;

  const graph = new THREE.Group();
  graph.name = 'COMPASS_BOOK_IKIGAI_FIVE_FORCE_GRAPH';
  const railSystem = new THREE.Group();
  railSystem.name = 'COMPASS_BOOK_IKIGAI_RAIL_SYSTEM';
  const railGeometry = new RoundedBoxGeometry(1, 0.07, 0.075, high ? 2 : 1, 0.018);
  const outerRails = new THREE.InstancedMesh(railGeometry, materials.giltDark, 5);
  outerRails.name = 'COMPASS_BOOK_IKIGAI_OUTER_RAILS';
  const hubSpokes = new THREE.InstancedMesh(railGeometry, materials.gilt, 5);
  hubSpokes.name = 'COMPASS_BOOK_IKIGAI_HUB_SPOKES';
  const setRail = (
    mesh: THREE.InstancedMesh,
    index: number,
    start: { x: number; z: number },
    end: { x: number; z: number },
    y: number,
    inset: number,
  ) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.max(0.01, Math.hypot(dx, dz) - inset);
    const angle = -Math.atan2(dz, dx);
    instanceQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    instanceScale.set(length, 1, 1);
    instanceMatrix.compose(
      new THREE.Vector3((start.x + end.x) * 0.5, y, (start.z + end.z) * 0.5),
      instanceQuaternion,
      instanceScale,
    );
    mesh.setMatrixAt(index, instanceMatrix);
  };
  nodeData.forEach((node, index) => {
    const next = nodeData[(index + 1) % nodeData.length];
    setRail(outerRails, index, node, next, 0.19, 0.64);
    setRail(hubSpokes, index, node, { x: 0, z: 0.06 }, 0.205, 0.56);
  });
  outerRails.instanceMatrix.needsUpdate = true;
  hubSpokes.instanceMatrix.needsUpdate = true;
  railSystem.add(outerRails, hubSpokes);

  const bezelGeometry = new THREE.TorusGeometry(0.36, 0.045, high ? 8 : 5, radialSegments);
  const bezelInnerGeometry = new THREE.TorusGeometry(0.285, 0.024, high ? 7 : 4, radialSegments);
  const bezels = new THREE.InstancedMesh(bezelGeometry, materials.gilt, 5);
  bezels.name = 'COMPASS_BOOK_IKIGAI_NODE_BEZELS';
  const innerBezels = new THREE.InstancedMesh(bezelInnerGeometry, materials.giltDark, 5);
  innerBezels.name = 'COMPASS_BOOK_IKIGAI_NODE_INNER_BEZELS';
  instanceQuaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  instanceScale.set(1, 1, 1);
  nodeData.forEach((node, index) => {
    instanceMatrix.compose(new THREE.Vector3(node.x, 0.28, node.z), instanceQuaternion, instanceScale);
    bezels.setMatrixAt(index, instanceMatrix);
    instanceMatrix.compose(new THREE.Vector3(node.x, 0.3, node.z), instanceQuaternion, instanceScale);
    innerBezels.setMatrixAt(index, instanceMatrix);
  });
  bezels.instanceMatrix.needsUpdate = true;
  innerBezels.instanceMatrix.needsUpdate = true;
  graph.add(bezels, innerBezels);

  const socketGeometry = new THREE.CylinderGeometry(0.075, 0.085, 0.055, high ? 10 : 7);
  const socketCollars = new THREE.InstancedMesh(socketGeometry, materials.gilt, 10);
  socketCollars.name = 'COMPASS_BOOK_IKIGAI_SOCKET_COLLARS';
  nodeData.forEach((node, index) => {
    const direction = new THREE.Vector2(node.x, node.z - 0.06).normalize();
    const nodeSocket = new THREE.Vector3(node.x - direction.x * 0.31, 0.25, node.z - direction.y * 0.31);
    instanceMatrix.compose(nodeSocket, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    socketCollars.setMatrixAt(index * 2, instanceMatrix);
    const hubSocket = new THREE.Vector3(direction.x * 0.43, 0.25, 0.06 + direction.y * 0.43);
    instanceMatrix.compose(hubSocket, new THREE.Quaternion(), new THREE.Vector3(0.84, 1, 0.84));
    socketCollars.setMatrixAt(index * 2 + 1, instanceMatrix);
  });
  socketCollars.instanceMatrix.needsUpdate = true;
  railSystem.add(socketCollars);
  graph.add(railSystem);

  const forceNodes: THREE.Group[] = [];
  const forceInserts: THREE.Group[] = [];
  const createIconShape = (points: Array<[number, number]>) => {
    const shape = new THREE.Shape();
    points.forEach(([x, y], index) => index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: high ? 0.07 : 0.05,
      bevelEnabled: true,
      bevelSegments: high ? 2 : 1,
      bevelSize: 0.018,
      bevelThickness: 0.012,
      curveSegments: high ? 8 : 4,
    });
    geometry.center();
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  };
  const starPoints = Array.from({ length: 16 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 8;
    const radius = index % 2 === 0 ? 0.2 : 0.085;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number];
  });
  const flameGeometry = createIconShape([
    [0, -0.22], [0.14, -0.07], [0.09, 0.03], [0.18, 0.1], [0.04, 0.23],
    [-0.02, 0.1], [-0.12, 0.18], [-0.16, 0.02], [-0.1, -0.1],
  ]);
  const innerFlameGeometry = createIconShape([
    [0, -0.12], [0.075, -0.025], [0.04, 0.04], [0.085, 0.1],
    [-0.015, 0.145], [-0.075, 0.035], [-0.06, -0.045],
  ]);
  const cometTailGeometry = createIconShape([
    [-0.23, 0.13], [-0.12, -0.06], [0.04, -0.09], [-0.02, 0.04],
    [0.08, 0.12], [-0.09, 0.08],
  ]);
  nodeData.forEach((node, index) => {
    const group = new THREE.Group();
    group.name = `COMPASS_BOOK_IKIGAI_${node.id}_NODE`;
    group.position.set(node.x, 0, node.z);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.32, 0.105, radialSegments),
      node.material,
    );
    disc.name = `COMPASS_BOOK_IKIGAI_${node.id}_DISC`;
    disc.position.y = 0.275;
    disc.castShadow = high;
    group.add(disc);
    const insertPart = new THREE.Group();
    insertPart.name = `COMPASS_BOOK_IKIGAI_${node.id}_INSERT`;
    group.add(insertPart);

    if (index === 0) {
      const cometCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.135, 0), materials.gilt);
      cometCore.name = 'COMPASS_BOOK_IKIGAI_CURIOSITY_COMET_CORE';
      cometCore.position.set(0.075, 0.405, -0.055);
      cometCore.scale.set(1, 0.72, 1);
      cometCore.rotation.y = Math.PI / 4;
      const cometTail = new THREE.Mesh(cometTailGeometry, materials.giltDark);
      cometTail.name = 'COMPASS_BOOK_IKIGAI_CURIOSITY_COMET_TAIL';
      cometTail.position.set(-0.035, 0.39, 0.035);
      insertPart.add(cometCore, cometTail);
    } else if (index === 1) {
      const star = new THREE.Mesh(createIconShape(starPoints), materials.gilt);
      star.name = 'COMPASS_BOOK_IKIGAI_CAPABILITY_STAR';
      star.position.y = 0.39;
      insertPart.add(star);
    } else if (index === 2) {
      const beacon = new THREE.Mesh(createIconShape(starPoints), materials.gilt);
      beacon.name = 'COMPASS_BOOK_IKIGAI_CONTRIBUTION_BEACON';
      beacon.position.set(0, 0.405, -0.085);
      beacon.scale.setScalar(0.58);
      const hands = [-1, 1].map((direction) => {
        const hand = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 18, Math.PI * 0.7), materials.giltDark);
        hand.name = `COMPASS_BOOK_IKIGAI_CONTRIBUTION_HAND_${direction < 0 ? 'LEFT' : 'RIGHT'}`;
        hand.rotation.set(Math.PI / 2, 0, direction * 0.45);
        hand.position.set(direction * 0.09, 0.385, 0.08);
        return hand;
      });
      insertPart.add(beacon, ...hands);
    } else if (index === 3) {
      const deck = roundedBox('COMPASS_BOOK_IKIGAI_VIABILITY_BRIDGE_DECK', 0.34, 0.055, 0.07, 0.018, 1, materials.gilt);
      deck.position.set(0, 0.4, -0.04);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.034, 6, 20, Math.PI), materials.giltDark);
      arch.name = 'COMPASS_BOOK_IKIGAI_VIABILITY_BRIDGE_ARCH';
      arch.rotation.set(Math.PI / 2, 0, Math.PI);
      arch.position.set(0, 0.385, 0.08);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.018, 5, 14), materials.gilt);
      wheel.name = 'COMPASS_BOOK_IKIGAI_VIABILITY_WHEEL_INSET';
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, 0.405, 0.08);
      insertPart.add(deck, arch, wheel);
    } else {
      const flame = new THREE.Mesh(flameGeometry, materials.gilt);
      flame.name = 'COMPASS_BOOK_IKIGAI_WILLINGNESS_FLAME';
      flame.position.y = 0.4;
      const innerFlame = new THREE.Mesh(innerFlameGeometry, materials.giltDark);
      innerFlame.name = 'COMPASS_BOOK_IKIGAI_WILLINGNESS_INNER_FLAME';
      innerFlame.position.y = 0.448;
      insertPart.add(flame, innerFlame);
    }
    forceInserts.push(insertPart);
    forceNodes.push(group);
    graph.add(group);
  });
  root.add(graph);

  const trial = new THREE.Group();
  trial.name = 'COMPASS_BOOK_IKIGAI_TRIAL_SYSTEM';
  trial.position.set(0, 0, 0.06);
  const trialRingStack = new THREE.Group();
  trialRingStack.name = 'COMPASS_BOOK_IKIGAI_TRIAL_RING_STACK';
  [0.49, 0.38, 0.285, 0.205].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.035 - index * 0.006, high ? 8 : 5, radialSegments),
      index % 2 === 1 ? materials.giltDark : materials.gilt,
    );
    ring.name = `COMPASS_BOOK_IKIGAI_TRIAL_RING_${index + 1}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.29 + index * 0.035;
    ring.castShadow = high && index === 0;
    trialRingStack.add(ring);
  });
  trial.add(trialRingStack);
  const trialCrystal = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.205, 0),
    trialMaterial,
  );
  trialCrystal.name = 'COMPASS_BOOK_IKIGAI_TRIAL_CRYSTAL';
  trialCrystal.position.y = 0.46;
  trialCrystal.scale.y = 1.28;
  trialCrystal.castShadow = true;
  trial.add(trialCrystal);
  const trialProngGeometry = new RoundedBoxGeometry(0.045, 0.19, 0.12, 1, 0.018);
  const trialProngs = new THREE.InstancedMesh(trialProngGeometry, materials.giltDark, 8);
  trialProngs.name = 'COMPASS_BOOK_IKIGAI_TRIAL_PRONGS';
  Array.from({ length: 8 }, (_, index) => index * Math.PI / 4).forEach((angle, index) => {
    const x = Math.cos(angle) * 0.29;
    const z = Math.sin(angle) * 0.29;
    instanceQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
    instanceMatrix.compose(new THREE.Vector3(x, 0.39, z), instanceQuaternion, new THREE.Vector3(1, 1, 1));
    trialProngs.setMatrixAt(index, instanceMatrix);
  });
  trialProngs.instanceMatrix.needsUpdate = true;
  trial.add(trialProngs);
  root.add(trial);

  const candidatePaths = new THREE.Group();
  candidatePaths.name = 'COMPASS_BOOK_IKIGAI_CANDIDATE_PATHS';
  const candidatePathMaterials = [curiosity.clone(), capability.clone(), willingness.clone()];
  const candidateStarts: Array<[number, number]> = [[-1.18, 0.46], [0, 1.18], [1.18, 0.46]];
  candidateStarts.forEach(([x, z], index) => {
    const midpoint = new THREE.Vector3(x * 0.58, 0.255, z * 0.58 + 0.08);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, 0.24, z),
      midpoint,
      new THREE.Vector3((index - 1) * 0.15, 0.285, 0.45),
    );
    candidatePathMaterials[index].name = `COMPASS_BOOK_IKIGAI_CANDIDATE_PATH_${index + 1}_MATERIAL`;
    candidatePathMaterials[index].emissiveIntensity = 0.38;
    const path = new THREE.Mesh(
      new THREE.TubeGeometry(curve, tubeSegments, 0.035, high ? 7 : 5, false),
      candidatePathMaterials[index],
    );
    path.name = `COMPASS_BOOK_IKIGAI_CANDIDATE_PATH_${index + 1}`;
    candidatePaths.add(path);
  });
  root.add(candidatePaths);

  const mirage = new THREE.Group();
  mirage.name = 'COMPASS_BOOK_IKIGAI_MIRAGE_NODE';
  mirage.position.set(1.38, 0, 2.1);
  const mirageRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.035, high ? 7 : 5, radialSegments),
    materials.giltDark,
  );
  mirageRing.name = 'COMPASS_BOOK_IKIGAI_MIRAGE_BEZEL';
  mirageRing.rotation.x = Math.PI / 2;
  mirageRing.position.y = 0.24;
  const mirageDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, 0.085, radialSegments),
    mirageMaterial,
  );
  mirageDisc.name = 'COMPASS_BOOK_IKIGAI_MIRAGE_DISC';
  mirageDisc.position.y = 0.22;
  const mirageShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), chartLine);
  mirageShard.name = 'COMPASS_BOOK_IKIGAI_MIRAGE_SHARD';
  mirageShard.position.y = 0.34;
  mirage.add(mirageRing, mirageDisc, mirageShard);
  const tether = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.048, high ? 8 : 6, high ? 6 : 4),
    mirageTetherMaterial,
    6,
  );
  tether.name = 'COMPASS_BOOK_IKIGAI_MIRAGE_BROKEN_TETHER';
  for (let index = 0; index < 6; index += 1) {
    instanceScale.setScalar(1 - index * 0.07);
    instanceMatrix.compose(
      new THREE.Vector3(-0.29 - index * 0.12, 0.255, -0.13 - index * 0.1),
      new THREE.Quaternion(),
      instanceScale,
    );
    tether.setMatrixAt(index, instanceMatrix);
  }
  tether.instanceMatrix.needsUpdate = true;
  mirage.add(tether);
  root.add(mirage);

  const rivetPositions: Array<[number, number]> = [];
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
    rivetPositions.push([Math.cos(angle) * 0.42, Math.sin(angle) * 0.42]);
  }
  [[-1.68, -2.54], [1.68, -2.54], [-1.68, 2.54], [1.68, 2.54]].forEach((point) => rivetPositions.push(point as [number, number]));
  const rivets = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.052, high ? 10 : 7, high ? 7 : 5),
    materials.gilt,
    rivetPositions.length,
  );
  rivets.name = 'COMPASS_BOOK_IKIGAI_RADIAL_RIVETS';
  rivetPositions.forEach(([x, z], index) => {
    const localX = index < 5 ? nodeData[index].x + x : x;
    const localZ = index < 5 ? nodeData[index].z + z : z;
    instanceMatrix.compose(new THREE.Vector3(localX, 0.355, localZ), new THREE.Quaternion(), new THREE.Vector3(1, 0.62, 1));
    rivets.setMatrixAt(index, instanceMatrix);
  });
  rivets.instanceMatrix.needsUpdate = true;
  contactFrame.add(rivets);

  const reliefParts: Record<string, THREE.Object3D> = {
    root,
    'contact-frame': contactFrame,
    'chart-field': chartField,
    'force-graph': graph,
    'rail-system': railSystem,
    'outer-rails': outerRails,
    'hub-spokes': hubSpokes,
    'frame-bezel': frameBezel,
    'node-bezel-system': bezels,
    'socket-collars': socketCollars,
    'curiosity-node': forceNodes[0],
    'capability-node': forceNodes[1],
    'contribution-node': forceNodes[2],
    'viability-node': forceNodes[3],
    'willingness-node': forceNodes[4],
    'trial-system': trial,
    'trial-rings': trialRingStack,
    'trial-crystal': trialCrystal,
    'candidate-paths': candidatePaths,
    'mirage-node': mirage,
    'mirage-tether': tether,
    'chart-stars': starStuds,
    'chart-orbits': orbitGroup,
    'curiosity-insert': forceInserts[0],
    'capability-insert': forceInserts[1],
    'contribution-insert': forceInserts[2],
    'viability-insert': forceInserts[3],
    'willingness-insert': forceInserts[4],
    'radial-rivets': rivets,
  };
  Object.entries(reliefParts).forEach(([partId, part]) => {
    part.userData.sculptPartId = partId;
  });
  root.userData.sculptRuntime = {
    parts: reliefParts,
    sockets: {
      trial,
      curiosity: forceNodes[0],
      capability: forceNodes[1],
      contribution: forceNodes[2],
      viability: forceNodes[3],
      willingness: forceNodes[4],
      mirage,
    },
    colliders: {
      relief: { type: 'box', center: [0, 0.25, 0], size: [3.82, 0.72, 5.66] },
    },
    destructionGroups: {
      validGraph: [graph, trial, candidatePaths],
      invalidSatellite: [mirage],
    },
    presentationOnly: true,
  };

  return {
    root,
    forceNodes,
    trialCrystal,
    trialRingStack,
    candidatePathMaterials,
    mirage,
    willingness,
  };
}

function createQuestForgeRelief(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const root = new THREE.Group();
  root.name = 'COMPASS_BOOK_QUEST_FORGE_RELIEF';
  root.userData.compassPageId = 'quest_forge';
  const high = quality === 'high';
  const radialSegments = high ? 28 : 14;
  const questTextureLoader = new THREE.TextureLoader();
  const loadQuestPbrMap = (
    directory: string,
    fileName: string,
    channel: 'albedo' | 'roughness' | 'normal' | 'ao',
    repeat = 3,
  ) => {
    if (!high) return null;
    const texture = questTextureLoader.load(
      `/assets/compass-book/quest-forge/materials/${directory}/${fileName}`,
    );
    texture.name = `COMPASS_BOOK_QUEST_FORGE_${directory}_${channel}`.toUpperCase();
    texture.colorSpace = channel === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = 8;
    if (channel === 'ao') texture.channel = 0;
    return texture;
  };
  const questPbr = high ? {
    field: {
      roughness: loadQuestPbrMap('pbr-00-indigo-field-grain', 'indigo-field_roughness.png', 'roughness', 4),
      normal: loadQuestPbrMap('pbr-00-indigo-field-grain', 'indigo-field_normal.png', 'normal', 5),
      ao: loadQuestPbrMap('pbr-00-indigo-field-grain', 'indigo-field_ao.png', 'ao', 4),
    },
    brass: {
      roughness: loadQuestPbrMap('pbr-01-aged-brass-ring', 'aged-brass_roughness.png', 'roughness', 3),
      normal: loadQuestPbrMap('pbr-01-aged-brass-ring', 'aged-brass_normal.png', 'normal', 4),
      ao: loadQuestPbrMap('pbr-01-aged-brass-ring', 'aged-brass_ao.png', 'ao', 3),
    },
    crystal: {
      roughness: loadQuestPbrMap('pbr-02-violet-crystal-facet', 'violet-crystal_roughness.png', 'roughness', 2),
      normal: loadQuestPbrMap('pbr-02-violet-crystal-facet', 'violet-crystal_normal.png', 'normal', 2),
      ao: loadQuestPbrMap('pbr-02-violet-crystal-facet', 'violet-crystal_ao.png', 'ao', 2),
    },
    gold: {
      roughness: loadQuestPbrMap('pbr-03-polished-gold-primary', 'gold-primary_roughness.png', 'roughness', 2),
      normal: loadQuestPbrMap('pbr-03-polished-gold-primary', 'gold-primary_normal.png', 'normal', 2),
      ao: loadQuestPbrMap('pbr-03-polished-gold-primary', 'gold-primary_ao.png', 'ao', 2),
    },
    teal: {
      roughness: loadQuestPbrMap('pbr-04-teal-support-enamel', 'teal-enamel_roughness.png', 'roughness', 2),
      normal: loadQuestPbrMap('pbr-04-teal-support-enamel', 'teal-enamel_normal.png', 'normal', 2),
      ao: loadQuestPbrMap('pbr-04-teal-support-enamel', 'teal-enamel_ao.png', 'ao', 2),
    },
    vault: {
      roughness: loadQuestPbrMap('pbr-05-charcoal-vault-panel', 'vault-charcoal_roughness.png', 'roughness', 3),
      normal: loadQuestPbrMap('pbr-05-charcoal-vault-panel', 'vault-charcoal_normal.png', 'normal', 3),
      ao: loadQuestPbrMap('pbr-05-charcoal-vault-panel', 'vault-charcoal_ao.png', 'ao', 3),
    },
    flame: {
      roughness: loadQuestPbrMap('pbr-06-amber-emissive-solid', 'flame-amber_roughness.png', 'roughness', 2),
      normal: loadQuestPbrMap('pbr-06-amber-emissive-solid', 'flame-amber_normal.png', 'normal', 2),
      ao: loadQuestPbrMap('pbr-06-amber-emissive-solid', 'flame-amber_ao.png', 'ao', 2),
    },
  } : null;

  const forgeBrassMaterial = materials.gilt.clone();
  forgeBrassMaterial.name = 'COMPASS_BOOK_QUEST_FORGE_AGED_BRASS_MATERIAL';
  forgeBrassMaterial.color.setHex(0xbc8135);
  forgeBrassMaterial.map = null;
  forgeBrassMaterial.roughness = 0.34;
  forgeBrassMaterial.metalness = 0.9;
  if (questPbr) {
    forgeBrassMaterial.roughnessMap = questPbr.brass.roughness;
    forgeBrassMaterial.normalMap = questPbr.brass.normal;
    forgeBrassMaterial.normalScale.setScalar(0.18);
    forgeBrassMaterial.aoMap = questPbr.brass.ao;
    forgeBrassMaterial.aoMapIntensity = 0.42;
  }
  const forgeBrassDarkMaterial = materials.giltDark.clone();
  forgeBrassDarkMaterial.name = 'COMPASS_BOOK_QUEST_FORGE_AGED_BRASS_DARK_MATERIAL';
  forgeBrassDarkMaterial.color.setHex(0x6e451e);
  forgeBrassDarkMaterial.map = null;
  forgeBrassDarkMaterial.roughness = 0.5;
  forgeBrassDarkMaterial.metalness = 0.78;
  if (questPbr) {
    forgeBrassDarkMaterial.roughnessMap = questPbr.brass.roughness;
    forgeBrassDarkMaterial.normalMap = questPbr.brass.normal;
    forgeBrassDarkMaterial.normalScale.setScalar(0.13);
    forgeBrassDarkMaterial.aoMap = questPbr.brass.ao;
    forgeBrassDarkMaterial.aoMapIntensity = 0.5;
  }
  const primaryGoldMaterial = materials.gilt.clone();
  primaryGoldMaterial.name = 'COMPASS_BOOK_QUEST_FORGE_PRIMARY_GOLD_MATERIAL';
  primaryGoldMaterial.color.setHex(0xe3b65f);
  primaryGoldMaterial.map = null;
  primaryGoldMaterial.roughness = 0.22;
  primaryGoldMaterial.metalness = 0.94;
  if (questPbr) {
    primaryGoldMaterial.roughnessMap = questPbr.gold.roughness;
    primaryGoldMaterial.normalMap = questPbr.gold.normal;
    primaryGoldMaterial.normalScale.setScalar(0.11);
    primaryGoldMaterial.aoMap = questPbr.gold.ao;
    primaryGoldMaterial.aoMapIntensity = 0.32;
  }

  const fieldMaterial = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_QUEST_FORGE_FIELD_MATERIAL',
    color: 0x141426,
    map: materials.leatherInset.map,
    aoMap: materials.leatherInset.aoMap,
    aoMapIntensity: 0.42,
    roughness: 0.76,
    roughnessMap: materials.leatherInset.roughnessMap,
    bumpMap: materials.leatherInset.bumpMap,
    bumpScale: high ? 0.025 : 0.01,
    metalness: 0.04,
  });
  if (questPbr) {
    fieldMaterial.roughnessMap = questPbr.field.roughness;
    fieldMaterial.normalMap = questPbr.field.normal;
    fieldMaterial.normalScale.setScalar(0.16);
    fieldMaterial.aoMap = questPbr.field.ao;
    fieldMaterial.aoMapIntensity = 0.42;
  }
  const crestMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_QUEST_FORGE_CREST_MATERIAL',
    color: 0x5d2b91,
    emissive: 0x2d0d56,
    emissiveIntensity: 0.14,
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: high ? 0.82 : 0.48,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.05,
  });
  if (questPbr) {
    crestMaterial.roughnessMap = questPbr.crystal.roughness;
    crestMaterial.normalMap = questPbr.crystal.normal;
    crestMaterial.normalScale.setScalar(0.2);
    crestMaterial.aoMap = questPbr.crystal.ao;
    crestMaterial.aoMapIntensity = 0.28;
  }
  const crestDarkMaterial = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_QUEST_FORGE_FRACTURE_MATERIAL',
    color: 0x241831,
    roughness: 0.68,
    metalness: 0.08,
  });
  const tealMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_QUEST_FORGE_SUPPORT_MATERIAL',
    color: 0x127d82,
    emissive: 0x052b2f,
    emissiveIntensity: 0.2,
    roughness: 0.18,
    metalness: 0.05,
    clearcoat: high ? 0.78 : 0.42,
    clearcoatRoughness: 0.13,
    envMapIntensity: 0.92,
  });
  if (questPbr) {
    tealMaterial.roughnessMap = questPbr.teal.roughness;
    tealMaterial.normalMap = questPbr.teal.normal;
    tealMaterial.normalScale.setScalar(0.13);
    tealMaterial.aoMap = questPbr.teal.ao;
    tealMaterial.aoMapIntensity = 0.25;
  }
  const vaultMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_QUEST_FORGE_VAULT_MATERIAL',
    color: 0x29263b,
    emissive: 0x080711,
    emissiveIntensity: 0.06,
    roughness: 0.56,
    metalness: 0.46,
    clearcoat: high ? 0.18 : 0.08,
    clearcoatRoughness: 0.44,
  });
  if (questPbr) {
    vaultMaterial.roughnessMap = questPbr.vault.roughness;
    vaultMaterial.normalMap = questPbr.vault.normal;
    vaultMaterial.normalScale.setScalar(0.19);
    vaultMaterial.aoMap = questPbr.vault.ao;
    vaultMaterial.aoMapIntensity = 0.48;
  }
  const flameMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_QUEST_FORGE_FLAME_MATERIAL',
    color: 0xff5a00,
    emissive: 0xe12600,
    emissiveIntensity: 0.46,
    roughness: 0.28,
    metalness: 0.01,
    clearcoat: high ? 0.62 : 0.36,
    clearcoatRoughness: 0.14,
  });
  if (questPbr) {
    flameMaterial.roughnessMap = questPbr.flame.roughness;
    flameMaterial.normalMap = questPbr.flame.normal;
    flameMaterial.normalScale.setScalar(0.12);
    flameMaterial.aoMap = questPbr.flame.ao;
    flameMaterial.aoMapIntensity = 0.18;
  }
  const releasedMaterial = crestMaterial.clone();
  releasedMaterial.name = 'COMPASS_BOOK_QUEST_FORGE_RELEASED_MATERIAL';
  releasedMaterial.color.setHex(0x674388);
  releasedMaterial.emissive.setHex(0x160b25);
  releasedMaterial.emissiveIntensity = 0.08;
  releasedMaterial.roughness = 0.38;

  const makePlate = (
    name: string,
    points: Array<[number, number]>,
    depth: number,
    material: THREE.Material,
    bevel = 0.03,
  ) => {
    const shape = new THREE.Shape();
    points.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: high ? 2 : 1,
      bevelSize: bevel,
      bevelThickness: Math.min(depth * 0.35, bevel),
      curveSegments: high ? 10 : 5,
      steps: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, depth * 0.45, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const contactPlate = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_CONTACT_PLATE',
    3.82,
    0.055,
    5.66,
    0.16,
    high ? 4 : 2,
    materials.leatherEdge,
  );
  contactPlate.position.y = 0.025;
  root.add(contactPlate);
  const contactField = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_CONTACT_FIELD',
    3.48,
    0.075,
    5.26,
    0.2,
    high ? 4 : 2,
    fieldMaterial,
  );
  contactField.position.y = 0.075;
  root.add(contactField);
  const contactFrame = new THREE.Group();
  contactFrame.name = 'COMPASS_BOOK_QUEST_FORGE_CONTACT_FRAME';
  const outerFrame = createFrame(
    'COMPASS_BOOK_QUEST_FORGE_OUTER_FRAME',
    3.72,
    5.54,
    0.115,
    forgeBrassMaterial,
    quality,
  );
  const innerFrame = createFrame(
    'COMPASS_BOOK_QUEST_FORGE_INNER_FRAME',
    3.48,
    5.3,
    0.126,
    forgeBrassDarkMaterial,
    quality,
  );
  contactFrame.add(outerFrame, innerFrame);
  root.add(contactFrame);

  const frameFasteners = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.055, high ? 10 : 6, high ? 7 : 4),
    forgeBrassMaterial,
    8,
  );
  frameFasteners.name = 'COMPASS_BOOK_QUEST_FORGE_FRAME_FASTENERS';
  const instanceMatrix = new THREE.Matrix4();
  const instanceScale = new THREE.Vector3(1, 0.6, 1);
  const framePoints: Array<[number, number]> = [
    [-1.68, -2.54], [1.68, -2.54], [-1.68, 2.54], [1.68, 2.54],
    [0, -2.58], [0, 2.58], [-1.73, 0], [1.73, 0],
  ];
  framePoints.forEach(([x, z], index) => {
    instanceMatrix.compose(new THREE.Vector3(x, 0.2, z), new THREE.Quaternion(), instanceScale);
    frameFasteners.setMatrixAt(index, instanceMatrix);
  });
  frameFasteners.instanceMatrix.needsUpdate = true;
  contactFrame.add(frameFasteners);

  const maintenanceSystem = new THREE.Group();
  maintenanceSystem.name = 'COMPASS_BOOK_QUEST_FORGE_MAINTENANCE_SYSTEM';
  maintenanceSystem.position.z = -0.62;
  const maintenanceRing = new THREE.Group();
  maintenanceRing.name = 'COMPASS_BOOK_QUEST_FORGE_MAINTENANCE_RING';
  [1.36, 1.03].forEach((radius, index) => {
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 0 ? 0.085 : 0.04, high ? 9 : 5, high ? 72 : 32),
      index === 0 ? forgeBrassMaterial : forgeBrassDarkMaterial,
    );
    rail.name = `COMPASS_BOOK_QUEST_FORGE_RING_RAIL_${index + 1}`;
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.23 + index * 0.012;
    rail.castShadow = true;
    maintenanceRing.add(rail);
  });
  const ringMarks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.025, 0.025, 0.09),
    forgeBrassDarkMaterial,
    high ? 32 : 16,
  );
  ringMarks.name = 'COMPASS_BOOK_QUEST_FORGE_RING_MARK_ARRAY';
  const markCount = high ? 32 : 16;
  for (let index = 0; index < markCount; index += 1) {
    const angle = index / markCount * Math.PI * 2;
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle, 0));
    instanceMatrix.compose(
      new THREE.Vector3(Math.cos(angle) * 1.36, 0.325, Math.sin(angle) * 1.36),
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    ringMarks.setMatrixAt(index, instanceMatrix);
  }
  ringMarks.instanceMatrix.needsUpdate = true;
  maintenanceRing.add(ringMarks);
  const ringRivets = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.045, high ? 9 : 6, high ? 6 : 4),
    forgeBrassMaterial,
    8,
  );
  ringRivets.name = 'COMPASS_BOOK_QUEST_FORGE_RING_RIVET_ARRAY';
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2 + Math.PI / 8;
    instanceMatrix.compose(
      new THREE.Vector3(Math.cos(angle) * 1.02, 0.31, Math.sin(angle) * 1.02),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 0.65, 1),
    );
    ringRivets.setMatrixAt(index, instanceMatrix);
  }
  ringRivets.instanceMatrix.needsUpdate = true;
  maintenanceRing.add(ringRivets);
  maintenanceSystem.add(maintenanceRing);
  root.add(maintenanceSystem);

  const reviewSocket = new THREE.Group();
  reviewSocket.name = 'COMPASS_BOOK_QUEST_FORGE_REVIEW_SOCKET';
  reviewSocket.position.set(0, 0, -1.98);
  reviewSocket.scale.setScalar(1.08);
  const reviewBezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.055, high ? 9 : 5, radialSegments),
    forgeBrassMaterial,
  );
  reviewBezel.name = 'COMPASS_BOOK_QUEST_FORGE_REVIEW_BEZEL';
  reviewBezel.rotation.x = Math.PI / 2;
  reviewBezel.position.y = 0.29;
  const reviewFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.255, 0.27, 0.085, radialSegments),
    vaultMaterial,
  );
  reviewFace.name = 'COMPASS_BOOK_QUEST_FORGE_REVIEW_FACE';
  reviewFace.position.y = 0.245;
  const reviewHands = new THREE.Group();
  reviewHands.name = 'COMPASS_BOOK_QUEST_FORGE_REVIEW_HANDS';
  const hourHand = box('COMPASS_BOOK_QUEST_FORGE_REVIEW_HOUR', 0.045, 0.035, 0.16, primaryGoldMaterial);
  hourHand.position.set(0.035, 0.345, -0.035);
  hourHand.rotation.y = -0.55;
  const minuteHand = box('COMPASS_BOOK_QUEST_FORGE_REVIEW_MINUTE', 0.038, 0.035, 0.22, primaryGoldMaterial);
  minuteHand.position.set(0, 0.348, -0.07);
  reviewHands.add(hourHand, minuteHand);
  const reviewMarkers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.026, 0.025, 0.09),
    primaryGoldMaterial,
    12,
  );
  reviewMarkers.name = 'COMPASS_BOOK_QUEST_FORGE_REVIEW_MARKERS';
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle, 0));
    instanceMatrix.compose(
      new THREE.Vector3(Math.cos(angle) * 0.205, 0.34, Math.sin(angle) * 0.205),
      quaternion,
      new THREE.Vector3(1, 1, index % 3 === 0 ? 1.28 : 0.82),
    );
    reviewMarkers.setMatrixAt(index, instanceMatrix);
  }
  reviewMarkers.instanceMatrix.needsUpdate = true;
  reviewSocket.add(reviewBezel, reviewFace, reviewMarkers, reviewHands);
  const reviewBridge = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_REVIEW_BRIDGE',
    0.22,
    0.09,
    0.34,
    0.035,
    high ? 2 : 1,
    forgeBrassDarkMaterial,
  );
  reviewBridge.position.set(0, 0.245, 0.29);
  const reviewBridgePin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.1, high ? 12 : 7),
    forgeBrassMaterial,
  );
  reviewBridgePin.name = 'COMPASS_BOOK_QUEST_FORGE_REVIEW_BRIDGE_PIN';
  reviewBridgePin.position.set(0, 0.31, 0.21);
  reviewSocket.add(reviewBridge, reviewBridgePin);
  maintenanceSystem.add(reviewSocket);

  const supportingToken = new THREE.Group();
  supportingToken.name = 'COMPASS_BOOK_QUEST_FORGE_SUPPORTING_TOKEN';
  supportingToken.position.set(1.22, 0, -0.72);
  const supportBezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.065, high ? 9 : 5, radialSegments),
    forgeBrassMaterial,
  );
  supportBezel.name = 'COMPASS_BOOK_QUEST_FORGE_SUPPORT_BEZEL';
  supportBezel.rotation.x = Math.PI / 2;
  supportBezel.position.y = 0.3;
  const supportDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.285, 0.3, 0.11, radialSegments),
    tealMaterial,
  );
  supportDisc.name = 'COMPASS_BOOK_QUEST_FORGE_SUPPORT_DISC';
  supportDisc.position.y = 0.25;
  const supportDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), primaryGoldMaterial);
  supportDiamond.name = 'COMPASS_BOOK_QUEST_FORGE_SUPPORT_DIAMOND';
  supportDiamond.position.y = 0.37;
  supportDiamond.scale.set(0.85, 0.38, 0.85);
  const supportClamp = new THREE.Group();
  supportClamp.name = 'COMPASS_BOOK_QUEST_FORGE_SUPPORT_CLAMP';
  [-1, 1].forEach((side, index) => {
    const clasp = roundedBox(
      `COMPASS_BOOK_QUEST_FORGE_SUPPORT_CLASP_${index + 1}`,
      0.13,
      0.1,
      0.2,
      0.035,
      high ? 2 : 1,
      forgeBrassDarkMaterial,
    );
    clasp.position.set(side * 0.33, 0.31, 0);
    supportClamp.add(clasp);
  });
  supportingToken.add(supportBezel, supportDisc, supportDiamond, supportClamp);
  maintenanceSystem.add(supportingToken);

  const forgeSpine = new THREE.Group();
  forgeSpine.name = 'COMPASS_BOOK_QUEST_FORGE_SPINE';
  const crestPoints: Array<[number, number]> = [
    [-0.72, -0.45], [-0.3, -0.76], [0.24, -0.7], [0.66, -0.42],
    [0.72, -0.08], [0.28, -0.01], [0.59, 0.29], [0.36, 0.58],
    [0, 0.77], [-0.46, 0.58], [-0.72, 0.12],
  ];
  const crestSocket = makePlate(
    'COMPASS_BOOK_QUEST_FORGE_CREST_SOCKET',
    crestPoints.map(([x, z]) => [x * 1.06, z * 1.05] as [number, number]),
    high ? 0.1 : 0.075,
    forgeBrassDarkMaterial,
    high ? 0.035 : 0.022,
  );
  crestSocket.position.set(-0.12, 0.18, -0.68);
  crestSocket.scale.set(0.98, 1, 1.38);
  forgeSpine.add(crestSocket);
  const crest = makePlate(
    'COMPASS_BOOK_QUEST_FORGE_CREST',
    crestPoints,
    high ? 0.22 : 0.16,
    crestMaterial,
    high ? 0.045 : 0.028,
  );
  crest.position.set(-0.12, 0.24, -0.68);
  crest.scale.set(0.98, 1, 1.38);
  forgeSpine.add(crest);
  const crestBrightFacetMaterial = crestMaterial.clone();
  crestBrightFacetMaterial.name = 'COMPASS_BOOK_QUEST_FORGE_CREST_BRIGHT_FACET_MATERIAL';
  crestBrightFacetMaterial.color.setHex(0xa15ae0);
  const crestShadeFacetMaterial = crestMaterial.clone();
  crestShadeFacetMaterial.name = 'COMPASS_BOOK_QUEST_FORGE_CREST_SHADE_FACET_MATERIAL';
  crestShadeFacetMaterial.color.setHex(0x3e1d5e);
  crestShadeFacetMaterial.roughness = 0.31;
  const crestFacetGroup = new THREE.Group();
  crestFacetGroup.name = 'COMPASS_BOOK_QUEST_FORGE_CREST_FACETS';
  const crestLeftFacet = makePlate(
    'COMPASS_BOOK_QUEST_FORGE_CREST_LEFT_FACET',
    [[-0.63, -0.4], [-0.14, -0.7], [-0.14, 0.66], [-0.48, 0.52], [-0.66, 0.12]],
    high ? 0.055 : 0.038,
    crestBrightFacetMaterial,
    high ? 0.018 : 0.01,
  );
  const crestUpperFacet = makePlate(
    'COMPASS_BOOK_QUEST_FORGE_CREST_UPPER_FACET',
    [[-0.14, -0.7], [0.24, -0.64], [0.58, -0.4], [0.48, -0.08], [-0.14, 0.06]],
    high ? 0.06 : 0.04,
    crestMaterial,
    high ? 0.018 : 0.01,
  );
  const crestLowerFacet = makePlate(
    'COMPASS_BOOK_QUEST_FORGE_CREST_LOWER_FACET',
    [[-0.14, 0.06], [0.34, 0.54], [0, 0.72], [-0.44, 0.54], [-0.14, 0.66]],
    high ? 0.065 : 0.042,
    crestShadeFacetMaterial,
    high ? 0.018 : 0.01,
  );
  [crestLeftFacet, crestUpperFacet, crestLowerFacet].forEach((facet, index) => {
    facet.position.set(-0.12, 0.47 + index * 0.01, -0.68);
    facet.scale.set(0.98, 1, 1.38);
    crestFacetGroup.add(facet);
  });
  forgeSpine.add(crestFacetGroup);
  const fractureFace = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_ACCEPTED_COST_FRACTURE',
    0.18,
    0.11,
    0.32,
    0.025,
    high ? 2 : 1,
    crestDarkMaterial,
  );
  fractureFace.position.set(0.48, 0.42, -0.69);
  fractureFace.rotation.z = -0.16;
  forgeSpine.add(fractureFace);
  const fractureGrooves = new THREE.Group();
  fractureGrooves.name = 'COMPASS_BOOK_QUEST_FORGE_ACCEPTED_COST_GROOVES';
  [
    { x: 0.33, z: -0.38, length: 0.38, angle: -0.52 },
    { x: 0.27, z: -0.18, length: 0.32, angle: 0.44 },
    { x: 0.18, z: 0.03, length: 0.28, angle: -0.38 },
    { x: -0.28, z: -0.31, length: 0.34, angle: 0.32 },
    { x: -0.4, z: 0.06, length: 0.29, angle: -0.46 },
    { x: 0.02, z: 0.31, length: 0.3, angle: 0.28 },
  ].forEach((grooveData, index) => {
    const groove = roundedBox(
      `COMPASS_BOOK_QUEST_FORGE_FRACTURE_GROOVE_${index + 1}`,
      index < 3 ? 0.045 : 0.018,
      index < 3 ? 0.035 : 0.022,
      grooveData.length,
      0.012,
      1,
      crestDarkMaterial,
    );
    groove.position.set(-0.12 + grooveData.x, 0.56 + index * 0.008, -0.68 + grooveData.z);
    groove.rotation.y = grooveData.angle;
    fractureGrooves.add(groove);
  });
  forgeSpine.add(fractureGrooves);
  const primaryToken = new THREE.Group();
  primaryToken.name = 'COMPASS_BOOK_QUEST_FORGE_PRIMARY_TOKEN';
  primaryToken.position.set(-0.12, 0, -0.74);
  const primaryBezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.065, high ? 9 : 5, radialSegments),
    primaryGoldMaterial,
  );
  primaryBezel.name = 'COMPASS_BOOK_QUEST_FORGE_PRIMARY_BEZEL';
  primaryBezel.rotation.x = Math.PI / 2;
  primaryBezel.position.y = 0.57;
  const primaryDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.33, 0.35, 0.09, radialSegments),
    materials.violetDark,
  );
  primaryDisc.name = 'COMPASS_BOOK_QUEST_FORGE_PRIMARY_SOCKET_DISC';
  primaryDisc.position.y = 0.515;
  const primaryDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.29, 0), primaryGoldMaterial);
  primaryDiamond.name = 'COMPASS_BOOK_QUEST_FORGE_PRIMARY_DIAMOND';
  primaryDiamond.position.y = 0.66;
  primaryDiamond.scale.set(0.78, 0.6, 0.78);
  primaryToken.add(primaryBezel, primaryDisc, primaryDiamond);
  forgeSpine.add(primaryToken);

  const anvilPoints: Array<[number, number]> = [
    [-0.52, -0.22], [0.54, -0.22], [0.42, -0.04], [0.24, 0.02],
    [0.22, 0.5], [0.42, 0.62], [0.34, 0.78], [-0.34, 0.78],
    [-0.42, 0.62], [-0.22, 0.5], [-0.24, 0.02], [-0.42, -0.04],
  ];
  const milestoneAnvil = makePlate(
    'COMPASS_BOOK_QUEST_FORGE_MILESTONE_ANVIL',
    anvilPoints,
    high ? 0.16 : 0.12,
    forgeBrassDarkMaterial,
    high ? 0.035 : 0.022,
  );
  milestoneAnvil.position.set(-0.12, 0.2, 0.56);
  milestoneAnvil.scale.x = 0.82;
  forgeSpine.add(milestoneAnvil);
  const anvilTop = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_ANVIL_GOLD_TOP',
    1.05,
    0.13,
    0.24,
    0.055,
    high ? 3 : 1,
    primaryGoldMaterial,
  );
  anvilTop.position.set(-0.12, 0.43, 0.4);
  const anvilInset = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_ANVIL_VIOLET_INSET',
    0.16,
    0.1,
    0.48,
    0.03,
    high ? 2 : 1,
    materials.violetDark,
  );
  anvilInset.position.set(-0.12, 0.42, 0.68);
  forgeSpine.add(anvilTop, anvilInset);
  const anvilHornGroup = new THREE.Group();
  anvilHornGroup.name = 'COMPASS_BOOK_QUEST_FORGE_ANVIL_HORNS';
  [-1, 1].forEach((side, index) => {
    const horn = makePlate(
      `COMPASS_BOOK_QUEST_FORGE_ANVIL_HORN_${index + 1}`,
      side < 0
        ? [[-0.58, -0.14], [-0.16, -0.18], [-0.12, 0.12], [-0.38, 0.08]]
        : [[0.16, -0.18], [0.62, -0.08], [0.4, 0.09], [0.12, 0.12]],
      high ? 0.11 : 0.08,
      forgeBrassMaterial,
      high ? 0.025 : 0.016,
    );
    horn.position.set(-0.12, 0.43, 0.47);
    anvilHornGroup.add(horn);
  });
  forgeSpine.add(anvilHornGroup);
  const anvilCollar = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_ANVIL_COLLAR',
    0.7,
    0.12,
    0.22,
    0.04,
    high ? 3 : 1,
    forgeBrassMaterial,
  );
  anvilCollar.position.set(-0.12, 0.4, 1.12);
  const anvilFoot = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_ANVIL_FOOT',
    0.76,
    0.13,
    0.26,
    0.045,
    high ? 3 : 1,
    forgeBrassDarkMaterial,
  );
  anvilFoot.position.set(-0.12, 0.34, 1.27);
  const anvilBrace = new THREE.Group();
  anvilBrace.name = 'COMPASS_BOOK_QUEST_FORGE_ANVIL_BRACE';
  [-1, 1].forEach((side, index) => {
    const brace = roundedBox(
      `COMPASS_BOOK_QUEST_FORGE_ANVIL_BRACE_${index + 1}`,
      0.12,
      0.12,
      0.48,
      0.035,
      high ? 2 : 1,
      forgeBrassDarkMaterial,
    );
    brace.position.set(-0.12 + side * 0.3, 0.34, 0.91);
    brace.rotation.y = side * 0.22;
    anvilBrace.add(brace);
  });
  forgeSpine.add(anvilCollar, anvilFoot, anvilBrace);

  const protectedFlame = new THREE.Group();
  protectedFlame.name = 'COMPASS_BOOK_QUEST_FORGE_PROTECTED_FLAME';
  protectedFlame.position.set(-0.12, 0, 2.02);
  const brazierBase = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.055, high ? 9 : 5, radialSegments),
    forgeBrassMaterial,
  );
  brazierBase.name = 'COMPASS_BOOK_QUEST_FORGE_BRAZIER_BASE';
  brazierBase.rotation.x = Math.PI / 2;
  brazierBase.position.y = 0.25;
  const brazierStem = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_BRAZIER_STEM',
    0.18,
    0.1,
    0.42,
    0.04,
    high ? 2 : 1,
    forgeBrassDarkMaterial,
  );
  brazierStem.position.set(0, 0.22, -0.34);
  const brazierCoupler = roundedBox(
    'COMPASS_BOOK_QUEST_FORGE_BRAZIER_COUPLER',
    0.42,
    0.12,
    0.18,
    0.045,
    high ? 2 : 1,
    forgeBrassMaterial,
  );
  brazierCoupler.position.set(0, 0.27, -0.53);
  const flame = makePlate(
    'COMPASS_BOOK_QUEST_FORGE_FLAME_CORE',
    [[0, -0.42], [0.2, -0.15], [0.1, 0.02], [0.24, 0.2], [0.03, 0.43], [-0.06, 0.22], [-0.2, 0.34], [-0.24, 0.05], [-0.14, -0.18]],
    high ? 0.12 : 0.085,
    flameMaterial,
    high ? 0.025 : 0.016,
  );
  flame.position.y = 0.28;
  flame.scale.setScalar(0.62);
  protectedFlame.add(brazierBase, brazierStem, brazierCoupler, flame);
  const flameCage = new THREE.Group();
  flameCage.name = 'COMPASS_BOOK_QUEST_FORGE_FLAME_CAGE';
  const cageBarGeometry = new THREE.CylinderGeometry(0.018, 0.024, 0.5, high ? 7 : 5);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const bar = new THREE.Mesh(cageBarGeometry, forgeBrassDarkMaterial);
    bar.name = `COMPASS_BOOK_QUEST_FORGE_CAGE_BAR_${index + 1}`;
    bar.position.set(Math.cos(angle) * 0.28, 0.38, Math.sin(angle) * 0.28);
    bar.rotation.z = Math.cos(angle) * 0.12;
    bar.rotation.x = Math.sin(angle) * 0.12;
    flameCage.add(bar);
  }
  const cageCrown = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.022, high ? 7 : 4, radialSegments),
    forgeBrassMaterial,
  );
  cageCrown.name = 'COMPASS_BOOK_QUEST_FORGE_CAGE_CROWN';
  cageCrown.rotation.x = Math.PI / 2;
  cageCrown.position.y = 0.6;
  flameCage.add(cageCrown);
  protectedFlame.add(flameCage);
  forgeSpine.add(protectedFlame);
  root.add(forgeSpine);

  const vaultSystem = new THREE.Group();
  vaultSystem.name = 'COMPASS_BOOK_QUEST_FORGE_VAULT_SYSTEM';
  const notNowVault = new THREE.Group();
  notNowVault.name = 'COMPASS_BOOK_QUEST_FORGE_NOT_NOW_VAULT';
  notNowVault.position.set(1.16, 0, 1.5);
  notNowVault.scale.z = 1.12;
  const vaultBezel = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.07, high ? 9 : 5, radialSegments),
    forgeBrassDarkMaterial,
  );
  vaultBezel.name = 'COMPASS_BOOK_QUEST_FORGE_VAULT_BEZEL';
  vaultBezel.rotation.x = Math.PI / 2;
  vaultBezel.position.y = 0.25;
  const vaultDoor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.52, 0.12, radialSegments),
    vaultMaterial,
  );
  vaultDoor.name = 'COMPASS_BOOK_QUEST_FORGE_VAULT_DOOR';
  vaultDoor.position.y = 0.2;
  const vaultInnerRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.035, high ? 8 : 5, radialSegments),
    forgeBrassDarkMaterial,
  );
  vaultInnerRim.name = 'COMPASS_BOOK_QUEST_FORGE_VAULT_INNER_RIM';
  vaultInnerRim.rotation.x = Math.PI / 2;
  vaultInnerRim.position.y = 0.305;
  notNowVault.add(vaultBezel, vaultDoor, vaultInnerRim);
  const vaultHardware = new THREE.Group();
  vaultHardware.name = 'COMPASS_BOOK_QUEST_FORGE_VAULT_HARDWARE';
  const vaultGrainMaterial = vaultMaterial.clone();
  vaultGrainMaterial.name = 'COMPASS_BOOK_QUEST_FORGE_VAULT_GRAIN_MATERIAL';
  vaultGrainMaterial.color.setHex(0x171522);
  vaultGrainMaterial.roughness = 0.78;
  const vaultGrain = new THREE.Group();
  vaultGrain.name = 'COMPASS_BOOK_QUEST_FORGE_VAULT_GRAIN';
  [-0.3, -0.15, 0, 0.15, 0.3].forEach((x, index) => {
    const groove = roundedBox(
      `COMPASS_BOOK_QUEST_FORGE_VAULT_GRAIN_${index + 1}`,
      0.014,
      0.018,
      index % 2 === 0 ? 0.68 : 0.58,
      0.005,
      1,
      vaultGrainMaterial,
    );
    groove.position.set(x, 0.325, (index % 2 === 0 ? -1 : 1) * 0.025);
    vaultGrain.add(groove);
  });
  vaultHardware.add(vaultGrain);
  [-0.18, 0, 0.18].forEach((x, index) => {
    const seam = roundedBox(
      `COMPASS_BOOK_QUEST_FORGE_VAULT_SEAM_${index + 1}`,
      0.022,
      0.035,
      index === 1 ? 0.74 : 0.68,
      0.008,
      1,
      forgeBrassDarkMaterial,
    );
    seam.position.set(x, 0.31, 0);
    vaultHardware.add(seam);
  });
  [-0.24, 0.24].forEach((z, index) => {
    const hinge = roundedBox(
      `COMPASS_BOOK_QUEST_FORGE_VAULT_HINGE_${index + 1}`,
      0.14,
      0.09,
      0.22,
      0.025,
      high ? 2 : 1,
      forgeBrassMaterial,
    );
    hinge.position.set(0.46, 0.34, z);
    vaultHardware.add(hinge);
    const hingePin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.24, high ? 10 : 6),
      forgeBrassDarkMaterial,
    );
    hingePin.name = `COMPASS_BOOK_QUEST_FORGE_VAULT_HINGE_PIN_${index + 1}`;
    hingePin.rotation.x = Math.PI / 2;
    hingePin.position.set(0.49, 0.39, z);
    vaultHardware.add(hingePin);
  });
  const vaultLatch = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), primaryGoldMaterial);
  vaultLatch.name = 'COMPASS_BOOK_QUEST_FORGE_VAULT_LATCH';
  vaultLatch.position.y = 0.35;
  vaultLatch.scale.set(0.78, 0.34, 0.78);
  vaultHardware.add(vaultLatch);
  for (let index = 0; index < 4; index += 1) {
    const spoke = roundedBox(
      `COMPASS_BOOK_QUEST_FORGE_VAULT_LOCK_SPOKE_${index + 1}`,
      0.035,
      0.035,
      0.32,
      0.01,
      1,
      forgeBrassDarkMaterial,
    );
    spoke.position.y = 0.34;
    spoke.rotation.y = index * (Math.PI / 2);
    vaultHardware.add(spoke);
  }
  notNowVault.add(vaultHardware);
  vaultSystem.add(notNowVault);

  const releasedFragment = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), releasedMaterial);
  releasedFragment.name = 'COMPASS_BOOK_QUEST_FORGE_RELEASED_FRAGMENT';
  releasedFragment.position.set(0.45, 0.35, 1.5);
  releasedFragment.scale.set(0.82, 0.62, 1);
  vaultSystem.add(releasedFragment);
  const releasePathMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_QUEST_FORGE_RELEASE_PATH_MATERIAL',
    color: 0xc58b32,
    emissive: 0x5d2808,
    emissiveIntensity: 0.24,
    roughness: 0.44,
    metalness: 0.72,
    clearcoat: high ? 0.28 : 0.14,
    clearcoatRoughness: 0.3,
  });
  const releasePath = createOrnamentalStroke(
    'COMPASS_BOOK_QUEST_FORGE_RELEASE_PATH',
    [[0.35, 1.5], [0.65, 1.5], [0.86, 1.5]],
    0.24,
    high ? 0.045 : 0.032,
    releasePathMaterial,
    quality,
  );
  const releaseTerminal = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.025, high ? 7 : 4, high ? 20 : 10),
    forgeBrassMaterial,
  );
  releaseTerminal.name = 'COMPASS_BOOK_QUEST_FORGE_RELEASE_TERMINAL';
  releaseTerminal.rotation.x = Math.PI / 2;
  releaseTerminal.position.set(0.88, 0.26, 1.5);
  vaultSystem.add(releasePath, releaseTerminal);
  root.add(vaultSystem);

  const flameBounceLight = new THREE.PointLight(
    0xff6a18,
    high ? 0.72 : 0.34,
    high ? 2.7 : 2.1,
    2,
  );
  flameBounceLight.name = 'COMPASS_BOOK_QUEST_FORGE_FLAME_BOUNCE_LIGHT';
  flameBounceLight.position.set(-0.12, 0.78, 1.82);
  const crystalRimLight = new THREE.PointLight(
    0x9b6cff,
    high ? 0.34 : 0.16,
    high ? 2.5 : 1.9,
    2,
  );
  crystalRimLight.name = 'COMPASS_BOOK_QUEST_FORGE_CRYSTAL_RIM_LIGHT';
  crystalRimLight.position.set(-0.52, 0.72, -0.72);
  root.add(flameBounceLight, crystalRimLight);

  const reliefParts: Record<string, THREE.Object3D> = {
    root,
    'contact-frame': contactFrame,
    'contact-field': contactField,
    'maintenance-system': maintenanceSystem,
    'maintenance-ring': maintenanceRing,
    'review-socket': reviewSocket,
    'supporting-token': supportingToken,
    'forge-spine': forgeSpine,
    'quest-crest': crest,
    'primary-token': primaryToken,
    'milestone-anvil': milestoneAnvil,
    'protected-flame': protectedFlame,
    'not-now-vault-system': vaultSystem,
    'not-now-vault': notNowVault,
    'released-fragment': releasedFragment,
    'release-path': releasePath,
    'frame-fasteners': frameFasteners,
    'ring-mark-array': ringMarks,
    'ring-rivet-array': ringRivets,
    'flame-cage': flameCage,
    'vault-hardware': vaultHardware,
  };
  Object.entries(reliefParts).forEach(([partId, part]) => {
    part.userData.sculptPartId = partId;
  });
  const attachmentContracts = {
    'primary-token': {
      parentSocket: 'quest-crest.primary-seat',
      localStart: [-0.12, 0.515, -0.74],
      localEnd: [-0.12, 0.66, -0.74],
      contactType: 'embedded-bezel',
      overlap: 0.06,
      gapTolerance: 0.012,
    },
    'supporting-token': {
      parentSocket: 'maintenance-ring.support-clamp',
      localStart: [1.22, 0.25, -0.72],
      localEnd: [1.22, 0.37, -0.72],
      contactType: 'clamped-socket',
      overlap: 0.05,
      gapTolerance: 0.012,
    },
    'review-socket': {
      parentSocket: 'maintenance-ring.review-bridge',
      localStart: [0, 0.245, -1.69],
      localEnd: [0, 0.31, -1.98],
      contactType: 'pinned-bridge',
      overlap: 0.045,
      gapTolerance: 0.01,
    },
    'milestone-anvil': {
      parentSocket: 'quest-crest.forge-throat',
      localStart: [-0.12, 0.2, 0.34],
      localEnd: [-0.12, 0.4, 1.27],
      contactType: 'braced-mortise',
      overlap: 0.055,
      gapTolerance: 0.012,
    },
    'protected-flame': {
      parentSocket: 'milestone-anvil.brazier-coupler',
      localStart: [-0.12, 0.27, 1.49],
      localEnd: [-0.12, 0.6, 2.02],
      contactType: 'coupled-brazier',
      overlap: 0.05,
      gapTolerance: 0.012,
    },
    'not-now-vault': {
      parentSocket: 'contact-field.vault-recess',
      localStart: [1.16, 0.2, 1.5],
      localEnd: [1.16, 0.39, 1.5],
      contactType: 'recessed-hinged-door',
      overlap: 0.04,
      gapTolerance: 0.012,
    },
    'released-fragment': {
      parentSocket: 'release-path.fragment-seat',
      localStart: [0.45, 0.24, 1.5],
      localEnd: [0.45, 0.35, 1.5],
      contactType: 'resting-token',
      overlap: 0.03,
      gapTolerance: 0.015,
    },
    'release-path': {
      parentSocket: 'not-now-vault.release-terminal',
      localStart: [0.35, 0.24, 1.5],
      localEnd: [0.88, 0.26, 1.5],
      contactType: 'overlapping-rail',
      overlap: 0.04,
      gapTolerance: 0.01,
    },
  } as const;
  Object.entries(attachmentContracts).forEach(([partId, attachment]) => {
    reliefParts[partId].userData.attachment = attachment;
  });
  root.userData.sculptRuntime = {
    parts: reliefParts,
    attachmentContracts,
    sockets: {
      primary: primaryToken,
      supporting: supportingToken,
      released: releasedFragment,
      review: reviewSocket,
      flame: protectedFlame,
      vault: notNowVault,
    },
    colliders: {
      relief: { type: 'box', center: [0, 0.25, 0], size: [3.82, 0.75, 5.66] },
    },
    destructionGroups: {
      forge: [forgeSpine, crest, milestoneAnvil, protectedFlame],
      maintenance: [maintenanceSystem, supportingToken, reviewSocket],
      release: [vaultSystem, releasedFragment, notNowVault],
    },
    presentationOnly: true,
  };

  return {
    root,
    crest,
    primaryToken,
    supportingToken,
    releasedFragment,
    maintenanceRing,
    reviewHands,
    flame,
    flameMaterial,
    releasePathMaterial,
  };
}

function createPersonalPlaybookRelief(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
) {
  const root = new THREE.Group();
  root.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_RELIEF';
  root.userData.compassPageId = 'personal_playbook';
  const high = quality === 'high';
  const radialSegments = high ? 28 : 14;
  const textureLoader = new THREE.TextureLoader();
  const loadPbrMap = (
    directory: string,
    fileName: string,
    channel: 'roughness' | 'normal' | 'ao',
    repeat = 3,
  ) => {
    if (!high) return null;
    const texture = textureLoader.load(
      `/assets/compass-book/personal-playbook/materials/${directory}/${fileName}`,
    );
    texture.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_${directory}_${channel}`.toUpperCase();
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = 8;
    if (channel === 'ao') texture.channel = 0;
    return texture;
  };
  const pbr = high ? {
    field: {
      roughness: loadPbrMap('pbr-00-indigo-field-grain', 'indigo-field_roughness.png', 'roughness', 4),
      normal: loadPbrMap('pbr-00-indigo-field-grain', 'indigo-field_normal.png', 'normal', 5),
      ao: loadPbrMap('pbr-00-indigo-field-grain', 'indigo-field_ao.png', 'ao', 4),
    },
    brass: {
      roughness: loadPbrMap('pbr-01-aged-brass-frame', 'aged-brass_roughness.png', 'roughness', 3),
      normal: loadPbrMap('pbr-01-aged-brass-frame', 'aged-brass_normal.png', 'normal', 4),
      ao: loadPbrMap('pbr-01-aged-brass-frame', 'aged-brass_ao.png', 'ao', 3),
    },
    gold: {
      roughness: loadPbrMap('pbr-02-warm-gold-rocket', 'warm-gold_roughness.png', 'roughness', 2),
      normal: loadPbrMap('pbr-02-warm-gold-rocket', 'warm-gold_normal.png', 'normal', 2),
      ao: loadPbrMap('pbr-02-warm-gold-rocket', 'warm-gold_ao.png', 'ao', 2),
    },
    violet: {
      roughness: loadPbrMap('pbr-03-violet-core-crystal', 'violet-crystal_roughness.png', 'roughness', 2),
      normal: loadPbrMap('pbr-03-violet-core-crystal', 'violet-crystal_normal.png', 'normal', 2),
      ao: loadPbrMap('pbr-03-violet-core-crystal', 'violet-crystal_ao.png', 'ao', 2),
    },
    teal: {
      roughness: loadPbrMap('pbr-04-teal-crescent-enamel', 'teal-enamel_roughness.png', 'roughness', 2),
      normal: loadPbrMap('pbr-04-teal-crescent-enamel', 'teal-enamel_normal.png', 'normal', 2),
      ao: loadPbrMap('pbr-04-teal-crescent-enamel', 'teal-enamel_ao.png', 'ao', 2),
    },
    alloy: {
      roughness: loadPbrMap('pbr-05-obsidian-engine-alloy', 'obsidian-alloy_roughness.png', 'roughness', 2),
      normal: loadPbrMap('pbr-05-obsidian-engine-alloy', 'obsidian-alloy_normal.png', 'normal', 2),
      ao: loadPbrMap('pbr-05-obsidian-engine-alloy', 'obsidian-alloy_ao.png', 'ao', 2),
    },
    earth: {
      roughness: loadPbrMap('pbr-06-earth-ocean-enamel', 'earth-enamel_roughness.png', 'roughness', 2),
      normal: loadPbrMap('pbr-06-earth-ocean-enamel', 'earth-enamel_normal.png', 'normal', 2),
      ao: loadPbrMap('pbr-06-earth-ocean-enamel', 'earth-enamel_ao.png', 'ao', 2),
    },
    cyan: {
      roughness: loadPbrMap('pbr-07-cyan-orbit-emission', 'cyan-emissive_roughness.png', 'roughness', 2),
      normal: loadPbrMap('pbr-07-cyan-orbit-emission', 'cyan-emissive_normal.png', 'normal', 2),
      ao: loadPbrMap('pbr-07-cyan-orbit-emission', 'cyan-emissive_ao.png', 'ao', 2),
    },
    amber: {
      roughness: loadPbrMap('pbr-08-amber-launch-emission', 'amber-emissive_roughness.png', 'roughness', 2),
      normal: loadPbrMap('pbr-08-amber-launch-emission', 'amber-emissive_normal.png', 'normal', 2),
      ao: loadPbrMap('pbr-08-amber-launch-emission', 'amber-emissive_ao.png', 'ao', 2),
    },
  } : null;

  const fieldMaterial = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_PERSONAL_PLAYBOOK_INDIGO_FIELD_MATERIAL',
    color: 0x11172b,
    map: materials.leatherInset.map,
    roughness: 0.78,
    roughnessMap: pbr?.field.roughness ?? materials.leatherInset.roughnessMap,
    normalMap: pbr?.field.normal ?? null,
    aoMap: pbr?.field.ao ?? materials.leatherInset.aoMap,
    aoMapIntensity: 0.48,
    metalness: 0.03,
  });
  fieldMaterial.normalScale.setScalar(high ? 0.18 : 0);
  const brassMaterial = materials.gilt.clone();
  brassMaterial.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_AGED_BRASS_MATERIAL';
  brassMaterial.color.setHex(0xa86f2c);
  brassMaterial.map = null;
  brassMaterial.roughness = 0.38;
  brassMaterial.metalness = 0.88;
  brassMaterial.roughnessMap = pbr?.brass.roughness ?? null;
  brassMaterial.normalMap = pbr?.brass.normal ?? null;
  brassMaterial.normalScale.setScalar(high ? 0.15 : 0);
  brassMaterial.aoMap = pbr?.brass.ao ?? null;
  brassMaterial.aoMapIntensity = 0.42;
  const brassDarkMaterial = materials.giltDark.clone();
  brassDarkMaterial.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_DARK_BRASS_MATERIAL';
  brassDarkMaterial.color.setHex(0x59371d);
  brassDarkMaterial.map = null;
  brassDarkMaterial.roughness = 0.54;
  brassDarkMaterial.metalness = 0.74;
  const goldMaterial = materials.gilt.clone();
  goldMaterial.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_WARM_GOLD_MATERIAL';
  goldMaterial.color.setHex(0xd6a03e);
  goldMaterial.map = null;
  goldMaterial.roughness = 0.25;
  goldMaterial.metalness = 0.92;
  goldMaterial.roughnessMap = pbr?.gold.roughness ?? null;
  goldMaterial.normalMap = pbr?.gold.normal ?? null;
  goldMaterial.normalScale.setScalar(high ? 0.12 : 0);
  goldMaterial.aoMap = pbr?.gold.ao ?? null;
  goldMaterial.aoMapIntensity = 0.3;
  const violetMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_PERSONAL_PLAYBOOK_VIOLET_CRYSTAL_MATERIAL',
    color: 0x6d35c7,
    emissive: 0x2e106f,
    emissiveIntensity: 0.52,
    roughness: 0.17,
    roughnessMap: pbr?.violet.roughness ?? null,
    normalMap: pbr?.violet.normal ?? null,
    aoMap: pbr?.violet.ao ?? null,
    aoMapIntensity: 0.24,
    metalness: 0.03,
    clearcoat: high ? 0.86 : 0.5,
    clearcoatRoughness: 0.11,
    envMapIntensity: 1.0,
  });
  violetMaterial.normalScale.setScalar(high ? 0.17 : 0);
  const tealMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_PERSONAL_PLAYBOOK_TEAL_ENAMEL_MATERIAL',
    color: 0x0e8390,
    emissive: 0x063a48,
    emissiveIntensity: 0.2,
    roughness: 0.2,
    roughnessMap: pbr?.teal.roughness ?? null,
    normalMap: pbr?.teal.normal ?? null,
    aoMap: pbr?.teal.ao ?? null,
    aoMapIntensity: 0.3,
    metalness: 0.04,
    clearcoat: high ? 0.76 : 0.4,
    clearcoatRoughness: 0.13,
  });
  tealMaterial.normalScale.setScalar(high ? 0.13 : 0);
  const alloyMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_PERSONAL_PLAYBOOK_OBSIDIAN_ALLOY_MATERIAL',
    color: 0x161826,
    roughness: 0.48,
    roughnessMap: pbr?.alloy.roughness ?? null,
    normalMap: pbr?.alloy.normal ?? null,
    aoMap: pbr?.alloy.ao ?? null,
    aoMapIntensity: 0.46,
    metalness: 0.62,
    clearcoat: high ? 0.22 : 0.1,
    clearcoatRoughness: 0.38,
  });
  alloyMaterial.normalScale.setScalar(high ? 0.16 : 0);
  const earthMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_PERSONAL_PLAYBOOK_EARTH_ENAMEL_MATERIAL',
    color: 0x0c304d,
    emissive: 0x06233b,
    emissiveIntensity: 0.16,
    roughness: 0.32,
    roughnessMap: pbr?.earth.roughness ?? null,
    normalMap: pbr?.earth.normal ?? null,
    aoMap: pbr?.earth.ao ?? null,
    aoMapIntensity: 0.38,
    metalness: 0.04,
    clearcoat: high ? 0.58 : 0.3,
    clearcoatRoughness: 0.18,
  });
  earthMaterial.normalScale.setScalar(high ? 0.15 : 0);
  const earthLandMaterial = new THREE.MeshStandardMaterial({
    name: 'COMPASS_BOOK_PERSONAL_PLAYBOOK_EARTH_LAND_MATERIAL',
    color: 0x4f716d,
    roughness: 0.68,
    metalness: 0.12,
  });
  const cyanMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_PERSONAL_PLAYBOOK_CYAN_ORBIT_MATERIAL',
    color: 0x18bcef,
    emissive: 0x0b8dd0,
    emissiveIntensity: 0.82,
    roughness: 0.2,
    roughnessMap: pbr?.cyan.roughness ?? null,
    normalMap: pbr?.cyan.normal ?? null,
    aoMap: pbr?.cyan.ao ?? null,
    metalness: 0.02,
    clearcoat: 0.62,
    clearcoatRoughness: 0.12,
  });
  cyanMaterial.normalScale.setScalar(high ? 0.1 : 0);
  const amberMaterial = new THREE.MeshPhysicalMaterial({
    name: 'COMPASS_BOOK_PERSONAL_PLAYBOOK_AMBER_LAUNCH_MATERIAL',
    color: 0xffaa20,
    emissive: 0xff6a08,
    emissiveIntensity: 0.74,
    roughness: 0.22,
    roughnessMap: pbr?.amber.roughness ?? null,
    normalMap: pbr?.amber.normal ?? null,
    aoMap: pbr?.amber.ao ?? null,
    metalness: 0.01,
    clearcoat: 0.58,
    clearcoatRoughness: 0.12,
  });
  amberMaterial.normalScale.setScalar(high ? 0.1 : 0);

  const makePlate = (
    name: string,
    points: Array<[number, number]>,
    depth: number,
    material: THREE.Material,
    bevel = 0.025,
  ) => {
    const shape = new THREE.Shape();
    points.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: high ? 2 : 1,
      bevelSize: bevel,
      bevelThickness: Math.min(depth * 0.35, bevel),
      curveSegments: high ? 10 : 5,
      steps: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, depth * 0.45, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const makeTube = (
    name: string,
    points: THREE.Vector3[],
    radius: number,
    material: THREE.Material,
  ) => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, high ? 24 : 10, radius, high ? 8 : 5, false),
      material,
    );
    tube.name = name;
    tube.castShadow = true;
    return tube;
  };
  const makeStar = (name: string, outer: number, inner: number, depth: number) => {
    const points: Array<[number, number]> = [];
    for (let index = 0; index < 16; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI / 8);
      const radius = index % 2 === 0 ? outer : inner;
      points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
    return makePlate(name, points, depth, goldMaterial, 0.018);
  };

  const contactPlate = roundedBox(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_CONTACT_PLATE',
    3.82,
    0.055,
    5.66,
    0.16,
    high ? 4 : 2,
    materials.leatherEdge,
  );
  contactPlate.position.y = 0.025;
  const contactField = roundedBox(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_CONTACT_FIELD',
    3.48,
    0.075,
    5.28,
    0.18,
    high ? 4 : 2,
    fieldMaterial,
  );
  contactField.position.y = 0.075;
  root.add(contactPlate, contactField);

  const contactFrame = new THREE.Group();
  contactFrame.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_RELIEF_FRAME';
  const frameOuter = createFrame(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_FRAME_OUTER',
    3.63,
    5.48,
    0.14,
    brassMaterial,
    quality,
  );
  const frameInner = createFrame(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_FRAME_INNER',
    3.4,
    5.22,
    0.155,
    brassDarkMaterial,
    quality,
  );
  contactFrame.add(frameOuter, frameInner);
  root.add(contactFrame);

  const frameFasteners = new THREE.Group();
  frameFasteners.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_FRAME_FASTENERS';
  const fastenerPositions: Array<[number, number]> = [
    [-1.66, -2.48], [1.66, -2.48], [-1.66, 2.48], [1.66, 2.48],
    [0, -2.52], [0, 2.52], [-1.7, 0], [1.7, 0],
  ];
  fastenerPositions.slice(0, high ? 8 : 4).forEach(([x, z], index) => {
    const fastener = new THREE.Mesh(new THREE.SphereGeometry(0.045, high ? 10 : 6, high ? 6 : 4), goldMaterial);
    fastener.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_FRAME_FASTENER_${index + 1}`;
    fastener.scale.y = 0.48;
    fastener.position.set(x, 0.2, z);
    frameFasteners.add(fastener);
  });
  root.add(frameFasteners);

  const earthHorizon = new THREE.Group();
  earthHorizon.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_EARTH_HORIZON';
  const earthPoints: Array<[number, number]> = [];
  for (let index = 0; index <= 24; index += 1) {
    const x = -1.68 + index * (3.36 / 24);
    const z = 2.02 - (1 - Math.pow(x / 1.78, 2)) * 0.42;
    earthPoints.push([x, z]);
  }
  earthPoints.push([1.68, 2.62], [-1.68, 2.62]);
  const earth = makePlate('COMPASS_BOOK_PERSONAL_PLAYBOOK_EARTH_SHELL', earthPoints, 0.09, earthMaterial, 0.018);
  earth.position.y = 0.13;
  const orbitPoints: THREE.Vector3[] = [];
  for (let index = 0; index <= 24; index += 1) {
    const x = -1.7 + index * (3.4 / 24);
    const z = 1.98 - (1 - Math.pow(x / 1.8, 2)) * 0.44;
    orbitPoints.push(new THREE.Vector3(x, 0.31, z));
  }
  const orbitRail = makeTube('COMPASS_BOOK_PERSONAL_PLAYBOOK_ORBIT_RAIL', orbitPoints, high ? 0.035 : 0.028, cyanMaterial);
  const earthContinents = new THREE.Group();
  earthContinents.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_EARTH_CONTINENTS';
  const continentShapes: Array<Array<[number, number]>> = [
    [[-1.34, 2.3], [-1.19, 2.14], [-1.02, 2.17], [-0.91, 2.3], [-1.04, 2.39], [-1.25, 2.4]],
    [[-0.87, 2.14], [-0.71, 2.03], [-0.56, 2.09], [-0.6, 2.23], [-0.77, 2.27]],
    [[-0.24, 2.14], [-0.05, 1.99], [0.14, 2.04], [0.22, 2.18], [0.05, 2.3], [-0.17, 2.27]],
    [[0.5, 2.13], [0.68, 2.04], [0.86, 2.13], [0.79, 2.27], [0.58, 2.29]],
    [[1.0, 2.25], [1.18, 2.14], [1.37, 2.28], [1.23, 2.4], [1.07, 2.37]],
  ];
  continentShapes.slice(0, high ? 5 : 3).forEach((points, index) => {
    const continent = makePlate(
      `COMPASS_BOOK_PERSONAL_PLAYBOOK_EARTH_CONTINENT_${index + 1}`,
      points,
      0.025,
      earthLandMaterial,
      0.008,
    );
    continent.position.y = 0.245;
    earthContinents.add(continent);
  });
  earthHorizon.add(earth, earthContinents, orbitRail);
  root.add(earthHorizon);

  const rocket = new THREE.Group();
  rocket.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_ASSEMBLY';
  const rocketHull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.34, 1.68, radialSegments, 2),
    goldMaterial,
  );
  rocketHull.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_HULL';
  rocketHull.rotation.x = Math.PI / 2;
  rocketHull.position.set(0.1, 0.44, -0.25);
  rocketHull.castShadow = true;
  const rocketNose = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.74, radialSegments, 2),
    goldMaterial,
  );
  rocketNose.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_NOSE';
  rocketNose.rotation.x = -Math.PI / 2;
  rocketNose.position.set(0.1, 0.44, -1.45);
  rocketNose.castShadow = true;
  const rocketCoreFrame = makePlate(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_CORE_FRAME',
    [[-0.17, -0.5], [0, -0.59], [0.17, -0.5], [0.18, 0.34], [0, 0.5], [-0.18, 0.34]],
    0.095,
    brassDarkMaterial,
    0.035,
  );
  rocketCoreFrame.position.set(0.1, 0.68, -0.28);
  const rocketCore = makePlate(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_CORE',
    [[-0.115, -0.43], [0, -0.51], [0.115, -0.43], [0.125, 0.29], [0, 0.42], [-0.125, 0.29]],
    0.15,
    violetMaterial,
    0.04,
  );
  rocketCore.position.set(0.1, 0.77, -0.28);
  const leftFin = makePlate(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_FIN_LEFT',
    [[-0.28, 0.3], [-0.85, 0.93], [-0.63, 1.28], [-0.19, 0.7]],
    0.12,
    goldMaterial,
  );
  leftFin.position.set(0.1, 0.31, 0);
  const rightFin = makePlate(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_FIN_RIGHT',
    [[0.28, 0.3], [0.85, 0.93], [0.63, 1.28], [0.19, 0.7]],
    0.12,
    goldMaterial,
  );
  rightFin.position.set(0.1, 0.31, 0);
  const engineCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.34, 0.38, radialSegments, 1),
    alloyMaterial,
  );
  engineCollar.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_ENGINE_COLLAR';
  engineCollar.rotation.x = Math.PI / 2;
  engineCollar.position.set(0.1, 0.48, 0.85);
  const exhaustCrystal = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.25, high ? 1 : 0),
    violetMaterial,
  );
  exhaustCrystal.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_EXHAUST_CRYSTAL';
  exhaustCrystal.scale.set(0.78, 0.6, 1.2);
  exhaustCrystal.position.set(0.1, 0.62, 1.14);
  const rocketSegmentation = new THREE.Group();
  rocketSegmentation.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_SEGMENTATION';
  [-0.94, 0.35].forEach((z, index) => {
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(index === 0 ? 0.3 : 0.34, 0.035, high ? 8 : 5, radialSegments),
      brassDarkMaterial,
    );
    seam.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_HULL_SEAM_${index + 1}`;
    seam.position.set(0.1, 0.44, z);
    seam.castShadow = true;
    rocketSegmentation.add(seam);
  });
  const noseCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.315, 0.315, 0.12, radialSegments, 1),
    brassDarkMaterial,
  );
  noseCollar.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_ROCKET_NOSE_COLLAR';
  noseCollar.rotation.x = Math.PI / 2;
  noseCollar.position.set(0.1, 0.44, -1.08);
  noseCollar.castShadow = true;
  rocketSegmentation.add(noseCollar);
  rocket.add(rocketHull, rocketNose, rocketCoreFrame, rocketCore, leftFin, rightFin, engineCollar, exhaustCrystal, rocketSegmentation);
  root.add(rocket);

  const systemCluster = new THREE.Group();
  systemCluster.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_FLIGHT_SYSTEMS';
  const moduleRoots: THREE.Group[] = [];
  const modulePositions: Array<[string, number, number]> = [
    ['IGNITION', -1.03, -1.72],
    ['MOMENTUM', 1.17, -1.72],
    ['MINIMUM_POWER', 1.48, -0.42],
    ['WARNING_RADAR', 1.36, 1.12],
    ['ENVIRONMENT_SHIELD', 0.1, 1.72],
    ['RECOVERY_ROUTE', -1.2, 1.12],
    ['WEEKLY_NAVIGATION', -1.45, -0.36],
  ];
  const makeBezel = (label: string, x: number, z: number) => {
    const module = new THREE.Group();
    module.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_MODULE_${label}`;
    module.position.set(x, 0, z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.52, 0.18, radialSegments, 1),
      brassDarkMaterial,
    );
    base.name = `${module.name}_BODY`;
    base.position.y = 0.23;
    base.castShadow = true;
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.41, 0.11, radialSegments, 1),
      label === 'ENVIRONMENT_SHIELD'
        ? tealMaterial
        : fieldMaterial,
    );
    face.name = `${module.name}_FACE`;
    face.position.y = 0.37;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.055, high ? 8 : 5, radialSegments),
      brassMaterial,
    );
    ring.name = `${module.name}_BEZEL`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.43;
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.355, 0.018, high ? 7 : 5, radialSegments),
      goldMaterial,
    );
    innerRing.name = `${module.name}_INNER_BEZEL`;
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.475;
    module.add(base, face, ring, innerRing);
    const clampCount = high ? 4 : 2;
    for (let index = 0; index < clampCount; index += 1) {
      const angle = (index / clampCount) * Math.PI * 2;
      const clamp = roundedBox(
        `${module.name}_BEZEL_CLAMP_${index + 1}`,
        0.11,
        0.07,
        0.055,
        0.012,
        1,
        brassMaterial,
      );
      clamp.position.set(Math.cos(angle) * 0.47, 0.47, Math.sin(angle) * 0.47);
      clamp.rotation.y = -angle;
      module.add(clamp);
    }
    const rivetCount = high ? 4 : 2;
    for (let index = 0; index < rivetCount; index += 1) {
      const angle = (index / rivetCount) * Math.PI * 2 + Math.PI / 4;
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 5), goldMaterial);
      rivet.name = `${module.name}_RIVET_${index + 1}`;
      rivet.scale.y = 0.45;
      rivet.position.set(Math.cos(angle) * 0.43, 0.46, Math.sin(angle) * 0.43);
      module.add(rivet);
    }
    systemCluster.add(module);
    moduleRoots.push(module);
    return module;
  };
  const ignition = makeBezel(...modulePositions[0]);
  const momentum = makeBezel(...modulePositions[1]);
  const minimumPower = makeBezel(...modulePositions[2]);
  const warningRadar = makeBezel(...modulePositions[3]);
  const environmentShield = makeBezel(...modulePositions[4]);
  const recoveryRoute = makeBezel(...modulePositions[5]);
  const weeklyNavigation = makeBezel(...modulePositions[6]);

  const ignitionDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, radialSegments, high ? 14 : 8, 0, Math.PI * 2, 0, Math.PI * 0.72),
    violetMaterial,
  );
  ignitionDome.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_IGNITION_DOME';
  ignitionDome.scale.set(0.72, 0.62, 1.25);
  ignitionDome.position.y = 0.55;
  const ignitionCoils = new THREE.Group();
  ignitionCoils.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_IGNITION_COILS';
  for (let index = 0; index < (high ? 3 : 2); index += 1) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.21 + index * 0.065, 0.018, 6, radialSegments), goldMaterial);
    coil.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_IGNITION_COIL_${index + 1}`;
    coil.rotation.x = Math.PI / 2;
    coil.position.y = 0.5;
    ignitionCoils.add(coil);
  }
  ignition.add(ignitionDome, ignitionCoils);
  const momentumStar = makeStar('COMPASS_BOOK_PERSONAL_PLAYBOOK_MOMENTUM_STAR', 0.34, 0.13, 0.11);
  momentumStar.position.y = 0.47;
  const momentumCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, high ? 14 : 8, high ? 9 : 6),
    amberMaterial,
  );
  momentumCore.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_MOMENTUM_CORE';
  momentumCore.scale.y = 0.52;
  momentumCore.position.y = 0.59;
  momentum.add(momentumStar, momentumCore);
  const crescent = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.09, high ? 8 : 5, radialSegments, Math.PI * 1.55),
    cyanMaterial,
  );
  crescent.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_MINIMUM_CRESCENT';
  crescent.rotation.x = Math.PI / 2;
  crescent.rotation.z = -0.35;
  crescent.position.y = 0.49;
  minimumPower.add(crescent);

  const radarLines = new THREE.Group();
  radarLines.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_WARNING_RADAR_LINES';
  for (let index = 1; index <= (high ? 3 : 2); index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(index * 0.1, 0.012, 5, radialSegments), goldMaterial);
    ring.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_RADAR_RING_${index}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.49;
    radarLines.add(ring);
  }
  for (let index = 0; index < 4; index += 1) {
    const spoke = roundedBox(
      `COMPASS_BOOK_PERSONAL_PLAYBOOK_RADAR_SPOKE_${index + 1}`,
      0.012,
      0.04,
      0.62,
      0.005,
      1,
      goldMaterial,
    );
    spoke.position.y = 0.48;
    spoke.rotation.y = index * Math.PI / 4;
    radarLines.add(spoke);
  }
  const radarNeedle = roundedBox(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_RADAR_NEEDLE',
    0.035,
    0.055,
    0.27,
    0.01,
    1,
    amberMaterial,
  );
  radarNeedle.position.set(0, 0.53, -0.1);
  warningRadar.add(radarLines, radarNeedle);

  const shieldCells = new THREE.Group();
  shieldCells.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_SHIELD_HEX_CELLS';
  const hexPositions: Array<[number, number]> = [
    [0, 0], [-0.17, -0.1], [0.17, -0.1], [-0.17, 0.1], [0.17, 0.1], [0, -0.2], [0, 0.2],
  ];
  hexPositions.forEach(([x, z], index) => {
    const cell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.08, 6),
      index % 2 === 0 ? cyanMaterial : tealMaterial,
    );
    cell.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_SHIELD_HEX_${index + 1}`;
    cell.position.set(x, 0.5, z);
    shieldCells.add(cell);
  });
  environmentShield.add(shieldCells);
  const recoveryCurve: THREE.Vector3[] = [];
  for (let index = 0; index <= (high ? 40 : 20); index += 1) {
    const t = (index / (high ? 40 : 20)) * Math.PI * 2;
    recoveryCurve.push(new THREE.Vector3(Math.sin(t) * 0.3, 0.5, Math.sin(t) * Math.cos(t) * 0.2));
  }
  const recoveryLoops = makeTube(
    'COMPASS_BOOK_PERSONAL_PLAYBOOK_RECOVERY_ROUTE_LOOPS',
    recoveryCurve,
    high ? 0.035 : 0.03,
    goldMaterial,
  );
  recoveryRoute.add(recoveryLoops);
  const navArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.035, high ? 7 : 5, radialSegments, Math.PI),
    goldMaterial,
  );
  navArc.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_NAVIGATION_ARC';
  navArc.rotation.x = Math.PI / 2;
  navArc.rotation.z = Math.PI;
  navArc.position.y = 0.49;
  const navArmLeft = roundedBox('COMPASS_BOOK_PERSONAL_PLAYBOOK_NAV_ARM_LEFT', 0.04, 0.07, 0.52, 0.01, 1, goldMaterial);
  navArmLeft.position.set(-0.13, 0.5, -0.02);
  navArmLeft.rotation.y = -0.35;
  const navArmRight = navArmLeft.clone();
  navArmRight.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_NAV_ARM_RIGHT';
  navArmRight.position.x = 0.13;
  navArmRight.rotation.y = 0.35;
  const navGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.075, 0),
    tealMaterial,
  );
  navGem.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_NAVIGATION_GEM';
  navGem.scale.y = 0.62;
  navGem.position.y = 0.57;
  weeklyNavigation.add(navArc, navArmLeft, navArmRight, navGem);
  root.add(systemCluster);

  const connectorHarness = new THREE.Group();
  connectorHarness.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_CONNECTOR_HARNESS';
  const connectorCollars = new THREE.Group();
  connectorCollars.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_CONNECTOR_COLLARS';
  const connectorGrommets = new THREE.Group();
  connectorGrommets.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_CONNECTOR_GROMMETS';
  modulePositions.forEach(([label, x, z], index) => {
    const modulePoint = new THREE.Vector3(x * 0.72, 0.34, z * 0.72);
    const rocketPoint = new THREE.Vector3(0.1 + Math.sign(x || 1) * 0.28, 0.38, THREE.MathUtils.clamp(z * 0.38, -0.92, 0.72));
    const midpoint = modulePoint.clone().lerp(rocketPoint, 0.5);
    midpoint.y += 0.05;
    const cable = makeTube(
      `COMPASS_BOOK_PERSONAL_PLAYBOOK_CONNECTOR_${index + 1}_${label}`,
      [modulePoint, midpoint, rocketPoint],
      high ? 0.045 : 0.035,
      brassMaterial,
    );
    connectorHarness.add(cable);
    [modulePoint, rocketPoint].forEach((point, collarIndex) => {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.08, high ? 12 : 7),
        goldMaterial,
      );
      collar.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_CONNECTOR_COLLAR_${index + 1}_${collarIndex + 1}`;
      collar.position.copy(point);
      connectorCollars.add(collar);
      const grommet = new THREE.Mesh(
        new THREE.TorusGeometry(0.082, 0.018, high ? 7 : 5, high ? 14 : 8),
        brassDarkMaterial,
      );
      grommet.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_CONNECTOR_GROMMET_${index + 1}_${collarIndex + 1}`;
      grommet.rotation.x = Math.PI / 2;
      grommet.position.copy(point);
      grommet.position.y += 0.055;
      connectorGrommets.add(grommet);
    });
  });
  root.add(connectorHarness, connectorCollars, connectorGrommets);

  const launchWindow = new THREE.Group();
  launchWindow.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_LAUNCH_WINDOW_ASSEMBLY';
  const launchRailPoints: THREE.Vector3[] = [];
  for (let index = 0; index <= 24; index += 1) {
    const x = -1.45 + index * (2.9 / 24);
    launchRailPoints.push(new THREE.Vector3(x, 0.29, 2.45 + Math.pow(x / 1.5, 2) * 0.12));
  }
  const launchRail = makeTube('COMPASS_BOOK_PERSONAL_PLAYBOOK_LAUNCH_WINDOW_ARC', launchRailPoints, 0.055, brassMaterial);
  launchWindow.add(launchRail);
  const launchCells: THREE.Mesh[] = [];
  const launchCellMaterials: THREE.MeshPhysicalMaterial[] = [];
  for (let index = 0; index < 7; index += 1) {
    const x = -1.18 + index * (2.36 / 6);
    const z = 2.46 + Math.pow(x / 1.5, 2) * 0.12;
    const cellMaterial = amberMaterial.clone();
    cellMaterial.name = `COMPASS_BOOK_PERSONAL_PLAYBOOK_LAUNCH_CELL_MATERIAL_${index + 1}`;
    const cell = roundedBox(
      `COMPASS_BOOK_PERSONAL_PLAYBOOK_LAUNCH_CELL_${index + 1}`,
      0.28,
      0.12,
      0.16,
      0.035,
      high ? 3 : 1,
      cellMaterial,
    );
    cell.position.set(x, 0.38, z);
    cell.rotation.y = -Math.atan2(x * 0.14, 1);
    launchCells.push(cell);
    launchCellMaterials.push(cellMaterial);
    launchWindow.add(cell);
  }
  root.add(launchWindow);

  const cyanBounce = new THREE.PointLight(0x20bfff, high ? 0.46 : 0.2, 2.8, 2);
  cyanBounce.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_CYAN_BOUNCE_LIGHT';
  cyanBounce.position.set(0, 0.82, 1.85);
  const violetBounce = new THREE.PointLight(0x8c54ff, high ? 0.42 : 0.18, 2.4, 2);
  violetBounce.name = 'COMPASS_BOOK_PERSONAL_PLAYBOOK_VIOLET_BOUNCE_LIGHT';
  violetBounce.position.set(0.1, 0.92, -0.2);
  root.add(cyanBounce, violetBounce);

  const reliefParts: Record<string, THREE.Object3D> = {
    root,
    'relief-frame': contactFrame,
    'contact-field': contactField,
    'rocket-assembly': rocket,
    'rocket-nose': rocketNose,
    'rocket-hull': rocketHull,
    'rocket-core': rocketCore,
    'rocket-core-frame': rocketCoreFrame,
    'rocket-segmentation': rocketSegmentation,
    'rocket-fin-left': leftFin,
    'rocket-fin-right': rightFin,
    'engine-collar': engineCollar,
    'exhaust-crystal': exhaustCrystal,
    'flight-systems': systemCluster,
    'module-ignition': ignition,
    'ignition-dome': ignitionDome,
    'module-momentum': momentum,
    'momentum-star': momentumStar,
    'momentum-core': momentumCore,
    'module-minimum-power': minimumPower,
    'minimum-crescent': crescent,
    'module-warning-radar': warningRadar,
    'warning-radar-grid': radarLines,
    'module-environment-shield': environmentShield,
    'shield-hex-array': shieldCells,
    'module-recovery-route': recoveryRoute,
    'recovery-route-tubes': recoveryLoops,
    'module-weekly-navigation': weeklyNavigation,
    'navigation-sextant': navArc,
    'navigation-gem': navGem,
    'connector-harness': connectorHarness,
    'connector-collars': connectorCollars,
    'connector-grommets': connectorGrommets,
    'horizon-assembly': earthHorizon,
    'earth-horizon': earth,
    'earth-continents': earthContinents,
    'orbit-rail': orbitRail,
    'launch-window-assembly': launchWindow,
    'launch-window-arc': launchRail,
    'launch-window-cells': launchWindow,
    'frame-fasteners': frameFasteners,
    'warning-radar-lines': radarLines,
    'shield-hex-cells': shieldCells,
    'navigation-ticks': weeklyNavigation,
    'recovery-ridges': recoveryLoops,
  };
  Object.entries(reliefParts).forEach(([partId, part]) => {
    part.userData.sculptPartId = partId;
  });
  const attachmentContracts = Object.fromEntries(modulePositions.map(([label, x, z], index) => [
    `module-${label.toLowerCase().replace(/_/g, '-')}`,
    {
      parentSocket: `flight-systems.socket-${index + 1}`,
      localStart: [x * 0.72, 0.34, z * 0.72],
      localEnd: [0.1 + Math.sign(x || 1) * 0.28, 0.38, THREE.MathUtils.clamp(z * 0.38, -0.92, 0.72)],
      contactType: 'tube-and-collar',
      overlap: 0.045,
      gapTolerance: 0.01,
    },
  ]));
  Object.entries(attachmentContracts).forEach(([partId, attachment]) => {
    reliefParts[partId].userData.attachment = attachment;
  });
  root.userData.sculptRuntime = {
    parts: reliefParts,
    attachmentContracts,
    sockets: {
      rocket,
      ignition,
      momentum,
      minimumPower,
      warningRadar,
      environmentShield,
      recoveryRoute,
      weeklyNavigation,
      earthHorizon,
      launchWindow,
    },
    colliders: {
      relief: { type: 'box', center: [0, 0.28, 0], size: [3.82, 0.82, 5.66] },
    },
    destructionGroups: {
      rocket: [rocket],
      systems: moduleRoots,
      environment: [earthHorizon, launchWindow],
    },
    presentationOnly: true,
  };

  return {
    root,
    rocket,
    rocketCore,
    exhaustCrystal,
    moduleRoots,
    momentumStar,
    radarNeedle,
    shieldCells,
    orbitRail,
    launchCells,
    launchCellMaterials,
    violetMaterial,
    cyanMaterial,
  };
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
  includeLettering: boolean,
) {
  const group = new THREE.Group();
  group.name = 'COMPASS_BOOK_CHAPTER_TAB_RAIL';
  const colors = [0x8f765d, 0x693a91, 0x2d5696, 0x285e53, 0x814729, 0x3a326d, 0x395a35];
  const positions = [-2.65, -1.78, -0.91, -0.04, 0.83, 1.7, 2.62];
  const pageIds = [
    'living_wheel',
    'inner_compass',
    'living_horizon',
    'ikigai_map',
    'quest_forge',
    'personal_playbook',
    'quest_ledger',
  ];
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
    tab.userData.compassPageId = pageIds[index];
    tab.userData.baseScaleY = tab.scale.y;
    material.userData.baseEmissiveIntensity = material.emissiveIntensity;
    tab.position.set(COVER_WIDTH + (index === 6 ? 0.34 : 0.28), 0.61, z);
    group.add(tab);
    if (includeLettering) {
      const label = createTabLettering(index === 6 ? 'QUEST' : ['I', 'II', 'III', 'IV', 'V', 'VI'][index], index);
      label.position.set(COVER_WIDTH + (index === 6 ? 0.38 : 0.32), 0.69, z);
      group.add(label);
    }
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
  options: CompassBookThreeModelOptions = {},
): CompassBookThreeModel {
  const includeLettering = options.includeLettering ?? false;
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
  const pageEdgeRelief = createPageEdgeRelief(materials, quality);
  root.add(pageEdgeRelief);

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
  const rightPageBorder = createFrame(
    'COMPASS_BOOK_RIGHT_READING_PAGE_BORDER',
    COVER_WIDTH - 0.68,
    COVER_DEPTH - 0.69,
    0.69,
    materials.giltDark,
    quality,
  );
  rightPageBorder.position.x = COVER_CENTER_X;
  root.add(rightPageBorder);

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
  const spineRelief = createSpineRelief(materials, quality);
  root.add(spineRelief);

  const spineMedallion = createCompassMechanism(materials, quality, 'COMPASS_BOOK_SPINE_MEDALLION', 0.23);
  spineMedallion.root.rotation.z = Math.PI / 2;
  spineMedallion.root.position.set(-0.39, 0.28, 0.65);
  root.add(spineMedallion.root);

  const tabs = createChapterTabs(materials, quality, includeLettering);
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

  const coverFiligree = createCoverFiligree(materials, quality);
  frontPivot.add(coverFiligree);

  const coverCompass = createCompassMechanism(materials, quality, 'COMPASS_BOOK_COVER_COMPASS', 0.86);
  coverCompass.root.userData.compassPageId = 'reading';
  coverCompass.root.position.set(COVER_CENTER_X, 0.37, 0.68);
  frontPivot.add(coverCompass.root);

  const coverTitleLettering = includeLettering ? createCoverTitleLettering() : null;
  if (coverTitleLettering) {
    coverTitleLettering.position.set(COVER_CENTER_X, 0.6, -1.76);
    frontPivot.add(coverTitleLettering);
  }
  if (includeLettering) {
    const cardinalLettering = createCoverCardinalLettering();
    cardinalLettering.position.set(COVER_CENTER_X, 0.68, 0.68);
    frontPivot.add(cardinalLettering);
  }

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
  const claspReceiver = createClaspReceiver(materials, quality);
  root.add(claspReceiver);

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
  const leftPageBorder = createFrame(
    'COMPASS_BOOK_LEFT_READING_PAGE_BORDER',
    COVER_WIDTH - 0.68,
    COVER_DEPTH - 0.69,
    -0.39,
    materials.giltDark,
    quality,
  );
  leftPageBorder.position.x = COVER_CENTER_X;
  frontPivot.add(leftPageBorder);
  const readingCompass = createCompassMechanism(materials, quality, 'COMPASS_BOOK_READING_COMPASS', 0.76);
  readingCompass.root.userData.compassPageId = 'reading';
  readingCompass.root.position.set(COVER_CENTER_X, -0.48, -0.25);
  // The left page is the inside face of the hinged cover. Its local +Y becomes
  // world -Y after the cover rotates 180°, so flip the relief stack once here
  // to keep rings/needles above the opened parchment instead of under it.
  readingCompass.root.rotation.z = Math.PI;
  frontPivot.add(readingCompass.root);
  const readingSignalMarkers = createReadingSignalMarkers(materials, quality);
  frontPivot.add(readingSignalMarkers);
  const livingWheel = createLivingWheelRelief(materials, quality);
  livingWheel.root.position.set(COVER_CENTER_X, -0.48, -0.22);
  livingWheel.root.rotation.z = Math.PI;
  livingWheel.root.visible = false;
  frontPivot.add(livingWheel.root);
  const innerCompass = createInnerCompassRelief(materials, quality);
  innerCompass.root.position.set(COVER_CENTER_X, -0.48, -0.22);
  innerCompass.root.rotation.z = Math.PI;
  innerCompass.root.visible = false;
  frontPivot.add(innerCompass.root);
  const livingHorizon = createLivingHorizonRelief(materials, quality);
  livingHorizon.root.position.set(COVER_CENTER_X, -0.48, -0.22);
  livingHorizon.root.rotation.z = Math.PI;
  livingHorizon.root.visible = false;
  frontPivot.add(livingHorizon.root);
  const ikigaiMap = createIkigaiMapRelief(materials, quality);
  ikigaiMap.root.position.set(COVER_CENTER_X, -0.48, -0.22);
  ikigaiMap.root.rotation.z = Math.PI;
  ikigaiMap.root.visible = false;
  frontPivot.add(ikigaiMap.root);
  const questForge = createQuestForgeRelief(materials, quality);
  questForge.root.position.set(COVER_CENTER_X, -0.48, -0.22);
  questForge.root.rotation.z = Math.PI;
  questForge.root.visible = false;
  frontPivot.add(questForge.root);
  const personalPlaybook = createPersonalPlaybookRelief(materials, quality);
  personalPlaybook.root.position.set(COVER_CENTER_X, -0.48, -0.22);
  personalPlaybook.root.rotation.z = Math.PI;
  personalPlaybook.root.visible = false;
  frontPivot.add(personalPlaybook.root);

  const openGlow = new THREE.PointLight(0x8745e3, quality === 'high' ? 3.2 : 2.1, 8, 2);
  openGlow.name = 'COMPASS_BOOK_VIOLET_PAGE_LIGHT';
  openGlow.position.set(0, 2.2, 0.15);
  root.add(openGlow);

  const pageTurnSocket = new THREE.Object3D();
  pageTurnSocket.name = 'COMPASS_BOOK_PAGE_TURN_SOCKET';
  pageTurnSocket.position.set(COVER_CENTER_X, 0.7, COVER_DEPTH * 0.38);
  root.add(pageTurnSocket);

  const pageTurnPivot = new THREE.Group();
  pageTurnPivot.name = 'COMPASS_BOOK_PAGE_TURN_PIVOT';
  pageTurnPivot.position.set(0.1, 0.74, 0);
  const pageTurnLeaf = roundedBox(
    'COMPASS_BOOK_PAGE_TURN_LEAF',
    COVER_WIDTH - 0.42,
    0.025,
    COVER_DEPTH - 0.42,
    0.11,
    quality === 'high' ? 3 : 1,
    materials.paper,
  );
  pageTurnLeaf.position.x = COVER_CENTER_X;
  pageTurnPivot.add(pageTurnLeaf);
  pageTurnPivot.visible = false;
  root.add(pageTurnPivot);

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
    'title-relief': coverTitleLettering ?? titleUnderline,
    'cover-studs': requireNode('COMPASS_BOOK_COVER_STUD_1'),
    'cover-compass': coverCompass.root,
    'compass-rings': requireNode('COMPASS_BOOK_COVER_COMPASS_BEZEL_1'),
    'compass-ticks': requireNode('COMPASS_BOOK_COVER_COMPASS_DIAL_TICKS'),
    'compass-needle-system': coverCompass.needleRoot,
    'compass-cabochon': requireNode('COMPASS_BOOK_COVER_COMPASS_CABOCHON'),
    'chapter-tab-rail': tabs,
    'chapter-tabs': requireNode('COMPASS_BOOK_TAB_1'),
    'fore-edge-clasp': clasp,
    'clasp-receiver': claspReceiver,
    bookmark,
    'left-reading-page': leftPage,
    'reading-compass': readingCompass.root,
    'reading-signal-markers': readingSignalMarkers,
    'living-wheel-relief': livingWheel.root,
    'inner-compass-relief': innerCompass.root,
    'living-horizon-relief': livingHorizon.root,
    'ikigai-map-relief': ikigaiMap.root,
    'quest-forge-relief': questForge.root,
    'personal-playbook-relief': personalPlaybook.root,
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
  let selectedPageId = 'reading';
  function setOpenProgress(progress: number) {
    openProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = easeInOutCubic(openProgress);
    frontPivot.rotation.z = Math.PI * eased;
    frontPivot.position.y = THREE.MathUtils.lerp(0.82, 0.17, eased);
    root.rotation.y = THREE.MathUtils.lerp(0.025, 0, eased);
    root.position.x = THREE.MathUtils.lerp(-COVER_CENTER_X, 0, eased);
    root.rotation.z = THREE.MathUtils.lerp(-0.03, 0, eased);
    bookmark.position.x = THREE.MathUtils.lerp(COVER_WIDTH * 0.42, 0.22, eased);
    // The exterior compass turns face-down beneath the opened cover. Hiding it
    // after the hinge crosses the page plane prevents its emissive relief from
    // leaking around the inner-page edge while retaining the opening reveal.
    coverCompass.root.visible = eased < 0.72;
    spineMedallion.root.visible = eased < 0.72;
    clasp.visible = eased < 0.72;
    // The accessible DOM rail occupies the exposed fore-edge in the open
    // spread. Keep the physical rail for the closed prop, then hand off to the
    // DOM rail so Chapter I never shows duplicate tab systems at the gutter.
    tabs.visible = eased < 0.72;
    const readingPageVisible = eased > 0.43 && selectedPageId === 'reading';
    const livingWheelVisible = eased > 0.43 && selectedPageId === 'living_wheel';
    const innerCompassVisible = eased > 0.43 && selectedPageId === 'inner_compass';
    const livingHorizonVisible = eased > 0.43 && selectedPageId === 'living_horizon';
    const ikigaiMapVisible = eased > 0.43 && selectedPageId === 'ikigai_map';
    const questForgeVisible = eased > 0.43 && selectedPageId === 'quest_forge';
    const personalPlaybookVisible = eased > 0.43 && selectedPageId === 'personal_playbook';
    readingCompass.root.visible = readingPageVisible;
    readingSignalMarkers.visible = readingPageVisible;
    livingWheel.root.visible = livingWheelVisible;
    innerCompass.root.visible = innerCompassVisible;
    livingHorizon.root.visible = livingHorizonVisible;
    ikigaiMap.root.visible = ikigaiMapVisible;
    questForge.root.visible = questForgeVisible;
    personalPlaybook.root.visible = personalPlaybookVisible;
    openGlow.intensity = THREE.MathUtils.lerp(0.08, quality === 'high' ? 3.2 : 2.1, eased);
  }

  function setActivePage(pageId: string) {
    selectedPageId = pageId;
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || !node.userData.compassPageId) return;
      const active = node.userData.compassPageId === pageId;
      node.scale.y = active ? 1.2 : Number(node.userData.baseScaleY ?? 1);
      const meshMaterial = Array.isArray(node.material) ? node.material[0] : node.material;
      if (!(meshMaterial instanceof THREE.MeshStandardMaterial)) return;
      meshMaterial.emissive.set(active ? 0x5e2aa8 : 0x000000);
      meshMaterial.emissiveIntensity = active
        ? 0.62
        : Number(meshMaterial.userData.baseEmissiveIntensity ?? 0);
    });
    const readingActive = pageId === 'reading';
    readingCompass.root.visible = openProgress > 0.43 && readingActive;
    readingSignalMarkers.visible = openProgress > 0.43 && readingActive;
    livingWheel.root.visible = openProgress > 0.43 && pageId === 'living_wheel';
    innerCompass.root.visible = openProgress > 0.43 && pageId === 'inner_compass';
    livingHorizon.root.visible = openProgress > 0.43 && pageId === 'living_horizon';
    ikigaiMap.root.visible = openProgress > 0.43 && pageId === 'ikigai_map';
    questForge.root.visible = openProgress > 0.43 && pageId === 'quest_forge';
    personalPlaybook.root.visible = openProgress > 0.43 && pageId === 'personal_playbook';
    (coverCompass.glow.material as THREE.MeshBasicMaterial).opacity = readingActive ? 0.28 : 0.12;
    (readingCompass.glow.material as THREE.MeshBasicMaterial).opacity = readingActive ? 0.28 : 0.12;
  }

  function setCelebrationProgress(
    progress: number,
    strength: number,
    kind: 'fragment' | 'chapter',
    reducedMotion: boolean,
  ) {
    const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const clampedStrength = THREE.MathUtils.clamp(strength, 0, 1);
    const chapterCelebration = kind === 'chapter' && selectedPageId === 'ikigai_map';
    const fragmentCelebration = kind === 'fragment' && selectedPageId === 'ikigai_map';
    const questChapterCelebration = kind === 'chapter' && selectedPageId === 'quest_forge';
    const questFragmentCelebration = kind === 'fragment' && selectedPageId === 'quest_forge';
    const playbookChapterCelebration = kind === 'chapter' && selectedPageId === 'personal_playbook';
    const playbookFragmentCelebration = kind === 'fragment' && selectedPageId === 'personal_playbook';

    ikigaiMap.forceNodes.forEach((node, index) => {
      const staggeredProgress = THREE.MathUtils.clamp(clampedProgress * 1.8 - index * 0.14, 0, 1);
      const nodeWave = chapterCelebration
        ? Math.sin(staggeredProgress * Math.PI) * clampedStrength
        : 0;
      const nodeScale = reducedMotion ? 1 : 1 + nodeWave * 0.11;
      node.scale.setScalar(nodeScale);
      if (!reducedMotion) node.position.y += nodeWave * 0.065;
    });

    const trialPulse = chapterCelebration || fragmentCelebration
      ? Math.sin(clampedProgress * Math.PI) * clampedStrength
      : 0;
    if (!reducedMotion) {
      ikigaiMap.trialCrystal.scale.x *= 1 + trialPulse * 0.12;
      ikigaiMap.trialCrystal.scale.y *= 1 + trialPulse * 0.16;
      ikigaiMap.trialCrystal.scale.z *= 1 + trialPulse * 0.12;
      ikigaiMap.trialRingStack.rotation.y += trialPulse * 0.18;
    }
    ikigaiMap.candidatePathMaterials.forEach((material, index) => {
      const pathFill = chapterCelebration
        ? THREE.MathUtils.clamp(clampedProgress * 1.65 - index * 0.18, 0, 1)
        : fragmentCelebration ? trialPulse : 0;
      material.emissiveIntensity += pathFill * clampedStrength * 0.46;
    });

    const mirageRecession = chapterCelebration ? clampedStrength * 0.06 : 0;
    ikigaiMap.mirage.scale.setScalar(reducedMotion ? 1 : 1 - mirageRecession);
    ikigaiMap.mirage.position.y = reducedMotion ? 0 : -mirageRecession * 0.45;

    const questPulse = questChapterCelebration || questFragmentCelebration
      ? Math.sin(clampedProgress * Math.PI) * clampedStrength
      : 0;
    questForge.crest.scale.setScalar(reducedMotion ? 1 : 1 + questPulse * 0.08);
    questForge.primaryToken.scale.setScalar(reducedMotion ? 1 : 1 + questPulse * 0.12);
    questForge.supportingToken.scale.setScalar(
      reducedMotion ? 1 : 1 + (questChapterCelebration ? questPulse * 0.06 : 0),
    );
    questForge.releasedFragment.position.x = 0.45 + (
      reducedMotion
        ? 0
        : questFragmentCelebration
          ? questPulse * 0.18
          : questChapterCelebration
            ? questPulse * 0.07
            : 0
    );
    questForge.flameMaterial.emissiveIntensity = 0.46 + questPulse * 0.5;
    questForge.releasePathMaterial.emissiveIntensity = 0.18 + questPulse * 0.48;

    const playbookPulse = playbookChapterCelebration || playbookFragmentCelebration
      ? Math.sin(clampedProgress * Math.PI) * clampedStrength
      : 0;
    personalPlaybook.rocket.position.y = reducedMotion ? 0 : playbookPulse * 0.16;
    personalPlaybook.rocket.scale.setScalar(reducedMotion ? 1 : 1 + playbookPulse * 0.07);
    personalPlaybook.moduleRoots.forEach((node, index) => {
      const stagger = THREE.MathUtils.clamp(clampedProgress * 1.75 - index * 0.12, 0, 1);
      const wave = playbookChapterCelebration ? Math.sin(stagger * Math.PI) * clampedStrength : playbookPulse * 0.42;
      node.scale.setScalar(reducedMotion ? 1 : 1 + wave * 0.07);
    });
    personalPlaybook.launchCellMaterials.forEach((material, index) => {
      const fill = playbookChapterCelebration
        ? THREE.MathUtils.clamp(clampedProgress * 1.8 - index * 0.12, 0, 1)
        : playbookFragmentCelebration ? playbookPulse : 0;
      material.emissiveIntensity = 0.62 + fill * clampedStrength * 0.58;
    });
  }

  function setPageTurnProgress(progress: number, direction: -1 | 1) {
    const clamped = THREE.MathUtils.clamp(progress, 0, 1);
    pageTurnPivot.visible = clamped > 0.001 && clamped < 0.999;
    pageTurnPivot.rotation.z = direction * Math.PI * clamped;
    pageTurnLeaf.position.y = Math.sin(Math.PI * clamped) * 0.22;
  }

  function getPageTarget(object: THREE.Object3D | null) {
    let current = object;
    while (current) {
      if (typeof current.userData.compassPageId === 'string') {
        return current.userData.compassPageId;
      }
      current = current.parent;
    }
    return null;
  }
  setOpenProgress(0);

  function animate(elapsedSeconds: number, reducedMotion: boolean) {
    const coverNeedleAngle = reducedMotion ? 0.03 : Math.sin(elapsedSeconds * 0.34) * 0.055;
    const readingNeedleAngle = reducedMotion ? -0.05 : Math.sin(elapsedSeconds * 0.29 + 0.8) * 0.09;
    coverCompass.needleRoot.rotation.y = coverNeedleAngle;
    readingCompass.needleRoot.rotation.y = readingNeedleAngle;
    livingWheel.compassRose.rotation.y = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.24 + 0.5) * 0.025;
    livingWheel.jewel.rotation.y = reducedMotion ? Math.PI / 8 : elapsedSeconds * 0.08;
    innerCompass.jewel.rotation.y = reducedMotion ? Math.PI / 8 : elapsedSeconds * 0.08;
    livingHorizon.rayFan.rotation.y = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.16) * 0.025;
    livingHorizon.sun.scale.setScalar(
      reducedMotion ? 1 : 1 + (Math.sin(elapsedSeconds * 0.82) + 1) * 0.025,
    );
    livingHorizon.hearth.rotation.y = reducedMotion ? 0 : elapsedSeconds * 0.14;
    livingHorizon.gateLeft.rotation.y = 0.7 + (reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.22) * 0.018);
    livingHorizon.gateRight.rotation.y = -0.7 - (reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.22) * 0.018);
    livingHorizon.violetPath.emissiveIntensity = reducedMotion
      ? 0.3
      : 0.25 + (Math.sin(elapsedSeconds * 0.9) + 1) * 0.08;
    livingHorizon.amber.emissiveIntensity = reducedMotion
      ? 0.68
      : 0.58 + (Math.sin(elapsedSeconds * 0.76 + 0.4) + 1) * 0.1;
    ikigaiMap.trialCrystal.rotation.y = reducedMotion ? Math.PI / 4 : elapsedSeconds * 0.24;
    ikigaiMap.trialCrystal.scale.set(
      1,
      reducedMotion ? 1.28 : 1.28 + Math.sin(elapsedSeconds * 1.05) * 0.045,
      1,
    );
    ikigaiMap.trialRingStack.rotation.y = reducedMotion ? 0 : elapsedSeconds * 0.06;
    ikigaiMap.candidatePathMaterials.forEach((material, index) => {
      material.emissiveIntensity = reducedMotion
        ? 0.38
        : 0.28 + (Math.sin(elapsedSeconds * 0.9 - index * 0.7) + 1) * 0.1;
    });
    ikigaiMap.forceNodes.forEach((node, index) => {
      node.position.y = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.46 + index * 0.72) * 0.006;
    });
    ikigaiMap.mirage.rotation.y = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.2) * 0.035;
    ikigaiMap.willingness.emissiveIntensity = reducedMotion
      ? 0.5
      : 0.42 + (Math.sin(elapsedSeconds * 0.82 + 1.2) + 1) * 0.08;
    questForge.crest.rotation.y = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.22) * 0.022;
    questForge.primaryToken.rotation.y = reducedMotion ? 0 : elapsedSeconds * 0.08;
    questForge.maintenanceRing.rotation.y = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.12) * 0.008;
    questForge.reviewHands.rotation.y = reducedMotion ? 0 : elapsedSeconds * 0.06;
    questForge.flame.scale.setScalar(
      reducedMotion ? 0.62 : 0.62 + (Math.sin(elapsedSeconds * 1.15) + 1) * 0.015,
    );
    questForge.flameMaterial.emissiveIntensity = reducedMotion
      ? 0.46
      : 0.4 + (Math.sin(elapsedSeconds * 1.05) + 1) * 0.1;
    questForge.releasedFragment.rotation.y = reducedMotion
      ? Math.PI / 7
      : elapsedSeconds * 0.18;
    questForge.releasedFragment.position.y = reducedMotion
      ? 0.35
      : 0.35 + Math.sin(elapsedSeconds * 0.5) * 0.012;
    questForge.releasePathMaterial.emissiveIntensity = reducedMotion
      ? 0.18
      : 0.14 + (Math.sin(elapsedSeconds * 0.7 - 0.4) + 1) * 0.08;
    personalPlaybook.momentumStar.rotation.y = reducedMotion ? 0 : elapsedSeconds * 0.08;
    personalPlaybook.radarNeedle.rotation.y = reducedMotion ? 0 : elapsedSeconds * 0.16;
    personalPlaybook.exhaustCrystal.rotation.y = reducedMotion ? Math.PI / 7 : elapsedSeconds * 0.2;
    personalPlaybook.rocketCore.scale.y = reducedMotion
      ? 1
      : 1 + (Math.sin(elapsedSeconds * 0.92) + 1) * 0.025;
    personalPlaybook.violetMaterial.emissiveIntensity = reducedMotion
      ? 0.52
      : 0.43 + (Math.sin(elapsedSeconds * 0.95) + 1) * 0.09;
    personalPlaybook.cyanMaterial.emissiveIntensity = reducedMotion
      ? 0.82
      : 0.7 + (Math.sin(elapsedSeconds * 0.62 - 0.3) + 1) * 0.12;
    personalPlaybook.launchCellMaterials.forEach((material, index) => {
      material.emissiveIntensity = reducedMotion
        ? 0.62
        : 0.5 + (Math.sin(elapsedSeconds * 0.72 - index * 0.38) + 1) * 0.12;
    });
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
    setActivePage,
    setPageTurnProgress,
    setCelebrationProgress,
    getPageTarget,
    animate,
    metrics: countMetrics(root),
    dispose: () => disposeObject(root),
  };
}
