import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createExpeditionShipThreeModel, type ExpeditionShipThreeModel } from './ExpeditionShipThreeModel';
import { createRobotFamilyModel, type RobotFamilyModel, type RobotRole } from './RobotFamilyThreeModel';
import { createPlayerPieceRelic } from './PlayerPieceRelicThree';
import { resolveDepartureDayFrame } from '../services/islandRunDepartureDay';
import type { PlayerPieceId } from '../services/islandRunPlayerPieces';

/**
 * Departure Day hangar: the enclosed garage where the crowd sends the crew
 * and their robots off on the diplomatic mission. Closed hangar (no sky or
 * planet): tiered balconies packed with cheering people, tall blue banners
 * with the gold fleet crest and the ship's name, amber practical light,
 * gantry cranes, a processional causeway with marshals, and the segmented
 * rolling door that only opens for departure.
 *
 * Budget belongs to the ship: the crowd is instanced impostor cards (one
 * atlas, per-instance phase), balconies and dressing are plain boxes, and the
 * only real lights are one hemisphere, one key and three amber fills.
 *
 * Presentation only. Never writes gameplay state.
 */

export type DepartureDayQuality = 'low' | 'high';

export interface DepartureDayHangar {
  /** Builds the heavy parts in steps; reports 0..1 so the picker can show it. */
  prepare: (onProgress?: (progress: number) => void) => Promise<void>;
  /** Swap the relic the player carries (piece picker hover/confirm). */
  setPiece: (pieceId: PlayerPieceId) => void;
  render: (timeSeconds: number, deltaSeconds: number, reducedMotion: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const smooth = (value: number, a: number, b: number) => {
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const nextFrame = () => new Promise<void>((resolve) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
  else setTimeout(resolve, 0);
});

/* ─── Textures drawn in code (original art, no assets) ─────────────────── */

function drawCrest(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.strokeStyle = '#f2c867';
  ctx.fillStyle = '#f2c867';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.035;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r * 0.62 : r * 0.26;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function createBannerTexture(shipName: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, '#1b3f8f');
  gradient.addColorStop(1, '#0d2159');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1024);
  ctx.fillStyle = '#e2b457';
  ctx.fillRect(14, 0, 6, 1024);
  ctx.fillRect(236, 0, 6, 1024);
  drawCrest(ctx, 128, 230, 86);
  ctx.save();
  ctx.translate(128, 640);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#f7e2a8';
  const label = shipName.toUpperCase();
  const size = Math.max(34, Math.min(72, Math.floor(560 / Math.max(4, label.length) * 1.4)));
  ctx.font = `800 ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0, 560);
  ctx.restore();
  // Swallow-tail cut at the bottom.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(0, 1024);
  ctx.lineTo(128, 940);
  ctx.lineTo(256, 1024);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2a2c33';
  ctx.fillRect(0, 0, 512, 1024);
  // Graphite panels.
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 3;
  for (let y = 0; y <= 1024; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  for (let x = 0; x <= 512; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke(); }
  // Processional causeway: a warm stone strip with gold edge lines.
  ctx.fillStyle = '#4a4239';
  ctx.fillRect(192, 0, 128, 1024);
  ctx.fillStyle = '#e8b85a';
  ctx.fillRect(188, 0, 6, 1024);
  ctx.fillRect(318, 0, 6, 1024);
  ctx.fillStyle = 'rgba(232,184,90,.35)';
  for (let y = 40; y < 1024; y += 96) ctx.fillRect(248, y, 16, 40);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Crowd atlas: 4 poses × 2 frames. Channels are masks the shader composes:
 * R = clothing, G = skin, B = flag or phone, A = coverage.
 */
const CROWD_POSES = 4;
function createCrowdAtlas(): THREE.CanvasTexture {
  const cell = 128;
  const canvas = document.createElement('canvas');
  canvas.width = cell * CROWD_POSES;
  canvas.height = cell * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.lineCap = 'round';
  const limb = (x1: number, y1: number, x2: number, y2: number, width: number) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  for (let pose = 0; pose < CROWD_POSES; pose += 1) {
    for (let frame = 0; frame < 2; frame += 1) {
      const ox = pose * cell;
      const oy = frame * cell;
      const cx = ox + 64;
      const clothing = 'rgb(255,0,0)';
      const skin = 'rgb(0,255,0)';
      const accent = 'rgb(0,0,255)';
      // Body.
      ctx.fillStyle = clothing;
      ctx.beginPath();
      ctx.ellipse(cx, oy + 92, 20, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 20, oy + 92, 40, 36);
      ctx.strokeStyle = clothing;
      const swing = frame === 0 ? 0 : 1;
      if (pose === 0) {
        // Both arms up, cheering.
        limb(cx - 16, oy + 66, cx - 30 - swing * 6, oy + 30 + swing * 4, 11);
        limb(cx + 16, oy + 66, cx + 30 + swing * 6, oy + 30 + swing * 4, 11);
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.arc(cx - 30 - swing * 6, oy + 26 + swing * 4, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 30 + swing * 6, oy + 26 + swing * 4, 7, 0, Math.PI * 2); ctx.fill();
      } else if (pose === 1) {
        // One arm waving.
        limb(cx - 16, oy + 68, cx - 22, oy + 106, 10);
        const hx = cx + 26 + (swing ? 12 : -2);
        limb(cx + 16, oy + 66, hx, oy + 28, 10);
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.arc(hx, oy + 24, 7, 0, Math.PI * 2); ctx.fill();
      } else if (pose === 2) {
        // Flag.
        limb(cx - 16, oy + 68, cx - 22, oy + 106, 10);
        limb(cx + 16, oy + 66, cx + 24, oy + 40, 10);
        ctx.strokeStyle = 'rgb(40,40,40)';
        limb(cx + 24, oy + 48, cx + 26, oy + 2, 3);
        ctx.fillStyle = accent;
        ctx.beginPath();
        const flap = swing ? 6 : -4;
        ctx.moveTo(cx + 26, oy + 4);
        ctx.quadraticCurveTo(cx + 44, oy + 6 + flap, cx + 62, oy + 8);
        ctx.lineTo(cx + 62, oy + 30);
        ctx.quadraticCurveTo(cx + 44, oy + 28 + flap, cx + 26, oy + 28);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.arc(cx + 24, oy + 40, 7, 0, Math.PI * 2); ctx.fill();
      } else {
        // Phone raised, filming.
        limb(cx - 16, oy + 68, cx - 22, oy + 106, 10);
        limb(cx + 16, oy + 66, cx + 10, oy + 36 - swing * 3, 10);
        ctx.fillStyle = accent;
        ctx.fillRect(cx + 2, oy + 16 - swing * 3, 14, 22);
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.arc(cx + 10, oy + 40 - swing * 3, 7, 0, Math.PI * 2); ctx.fill();
      }
      // Head.
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(cx, oy + 44 + (pose === 0 ? swing * 2 : 0), 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

function createCrowdMaterial(atlas: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      uAtlas: { value: atlas },
      uTime: { value: 0 },
      uEnergy: { value: 0.4 },
      uLight: { value: 0.3 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aVariant; // x pose, y phase, z skin, w scale jitter
      attribute vec3 aCloth;
      uniform float uTime;
      uniform float uEnergy;
      varying vec2 vUv;
      varying vec3 vCloth;
      varying float vSkin;
      varying float vFrame;
      varying float vDepth;
      void main() {
        vec3 center = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float scale = length(instanceMatrix[1].xyz) * aVariant.w;
        // Cylindrical billboard: always face the camera, stay upright.
        vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
        float rate = mix(1.6, 5.2, uEnergy);
        float wave = sin(uTime * rate + aVariant.y * 6.2831);
        float hop = max(0.0, wave) * 0.05 * uEnergy;
        vec3 world = center + right * position.x * scale + vec3(0.0, (position.y + 0.5 + hop) * scale, 0.0);
        vFrame = step(0.0, wave);
        vUv = uv;
        vCloth = aCloth;
        vSkin = aVariant.z;
        float pose = aVariant.x;
        vUv.x = (uv.x + pose) / ${CROWD_POSES.toFixed(1)};
        vec4 viewPosition = viewMatrix * vec4(world, 1.0);
        vDepth = -viewPosition.z;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      uniform float uLight;
      varying vec2 vUv;
      varying vec3 vCloth;
      varying float vSkin;
      varying float vFrame;
      varying float vDepth;
      void main() {
        vec2 uv = vec2(vUv.x, (vUv.y + (1.0 - vFrame)) * 0.5);
        vec4 mask = texture2D(uAtlas, uv);
        if (mask.a < 0.5) discard;
        vec3 skin = mix(vec3(0.94, 0.74, 0.58), vec3(0.36, 0.22, 0.14), vSkin);
        vec3 flag = vec3(0.13, 0.27, 0.62);
        vec3 color = vCloth * mask.r + skin * mask.g + flag * mask.b;
        // Warm hall light from above, fading into the dim far tiers.
        float light = mix(0.28, 1.0, uLight) * mix(1.0, 0.6, clamp(vDepth / 90.0, 0.0, 1.0));
        color *= light * vec3(1.05, 0.93, 0.78);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/* ─── Simple crew humans (the robots come from the robot family) ────────── */

interface CrewHuman {
  root: THREE.Group;
  legs: [THREE.Object3D, THREE.Object3D];
  arms: [THREE.Object3D, THREE.Object3D];
}

function createCrewHuman(materials: { uniform: THREE.Material; trim: THREE.Material; skin: THREE.Material; hair: THREE.Material; boots: THREE.Material }, height: number): CrewHuman {
  const root = new THREE.Group();
  const unit = height / 1.8;
  const limb = (length: number, radius: number, material: THREE.Material) => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius * unit, length * unit, 3, 8), material);
    mesh.position.y = -(length * unit) / 2;
    pivot.add(mesh);
    return pivot;
  };
  const legs: [THREE.Object3D, THREE.Object3D] = [limb(0.78, 0.075, materials.uniform), limb(0.78, 0.075, materials.uniform)];
  legs.forEach((leg, index) => {
    leg.position.set((index === 0 ? -0.1 : 0.1) * unit, 0.92 * unit, 0);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13 * unit, 0.1 * unit, 0.24 * unit), materials.boots);
    boot.position.set(0, -0.9 * unit, 0.04 * unit);
    leg.add(boot);
    root.add(leg);
  });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * unit, 0.42 * unit, 4, 10), materials.uniform);
  torso.position.y = 1.2 * unit;
  root.add(torso);
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.205 * unit, 0.025 * unit, 6, 16), materials.trim);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 1.02 * unit;
  root.add(sash);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12 * unit, 0.03 * unit, 6, 14), materials.trim);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.47 * unit;
  root.add(collar);
  const arms: [THREE.Object3D, THREE.Object3D] = [limb(0.56, 0.06, materials.uniform), limb(0.56, 0.06, materials.uniform)];
  arms.forEach((arm, index) => {
    arm.position.set((index === 0 ? -0.27 : 0.27) * unit, 1.42 * unit, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06 * unit, 8, 6), materials.skin);
    hand.position.y = -0.66 * unit;
    arm.add(hand);
    root.add(arm);
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13 * unit, 14, 10), materials.skin);
  head.position.y = 1.66 * unit;
  root.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.137 * unit, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.hair);
  hair.position.y = 1.67 * unit;
  hair.rotation.x = -0.25;
  root.add(hair);
  return { root, legs, arms };
}

/* ─── The hangar ───────────────────────────────────────────────────────── */

export function createDepartureDayHangar(options: {
  canvas: HTMLCanvasElement;
  shipName: string;
  pieceId: PlayerPieceId;
  quality: DepartureDayQuality;
}): DepartureDayHangar {
  const { canvas, quality } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, quality === 'high' ? 2 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d0f16');
  scene.fog = new THREE.Fog('#141620', 60, 150);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  pmrem.dispose();

  // Hall dimensions are set once the ship is measured (the ship owns the scale).
  let ship: ExpeditionShipThreeModel | null = null;
  const shipPivot = new THREE.Group();
  scene.add(shipPivot);
  let hall = { halfWidth: 30, length: 90, height: 34, shipZ: 0, shipBase: 0, span: 16, causewayStart: 40, keelZ: 8 };

  const hemi = new THREE.HemisphereLight('#ffe2b8', '#1c1a22', 0.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffe7c4', 1.2);
  key.position.set(-18, 40, 26);
  scene.add(key);
  const fills = [new THREE.PointLight('#ffb35c', 0, 70, 1.4), new THREE.PointLight('#ffb35c', 0, 70, 1.4), new THREE.PointLight('#9fd8ff', 0, 60, 1.6)];
  fills.forEach((light) => scene.add(light));

  const bannerTexture = track(createBannerTexture(options.shipName || 'Starling'));
  const crowdAtlas = track(createCrowdAtlas());
  const crowdMaterial = track(createCrowdMaterial(crowdAtlas));
  let crowd: THREE.InstancedMesh | null = null;

  const architecture = new THREE.Group();
  scene.add(architecture);
  const amberStrips: THREE.MeshBasicMaterial[] = [];
  const doorSlats: THREE.Mesh[] = [];
  const tunnelRings: THREE.Mesh[] = [];
  let doorTop = 30;
  let keelLift: THREE.Mesh | null = null;
  let gantry: THREE.Group | null = null;

  const crew: Array<{ human?: CrewHuman; robot?: RobotRole; lane: number; row: number; isPlayer?: boolean }> = [];
  let robots: RobotFamilyModel | null = null;
  const crewRoot = new THREE.Group();
  scene.add(crewRoot);
  let relic: ReturnType<typeof createPlayerPieceRelic> | null = null;
  let playerHuman: CrewHuman | null = null;
  let playerRing: THREE.Mesh | null = null;
  let currentPiece = options.pieceId;

  function buildShip() {
    ship = createExpeditionShipThreeModel(quality === 'high' ? 'high' : 'low');
    ship.update({ timeSeconds: 0, pose: 'flight', poseProgress: 0, reducedMotion: true });
    shipPivot.add(ship.root);
    shipPivot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(ship.root);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z);
    hall = {
      halfWidth: span * 1.1,
      length: span * 4.4,
      height: Math.max(size.y * 2.6, span * 1.1),
      shipZ: 0,
      shipBase: span * 0.14,
      span,
      causewayStart: span * 2.6,
      keelZ: box.max.z * 0.55,
    };
    // Stand the ship on its service column.
    shipPivot.userData.baseOffset = -box.min.y;
    shipPivot.position.set(0, hall.shipBase - box.min.y, hall.shipZ);
  }

  function box(width: number, height: number, depth: number, material: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    architecture.add(mesh);
    return mesh;
  }

  function buildHangar() {
    const { halfWidth: W, length: L, height: H, span: S } = hall;
    const back = -L * 0.32;
    const front = L * 1.05;
    const hallDepth = front - back;
    const graphite = track(new THREE.MeshStandardMaterial({ color: '#2d3039', roughness: 0.72, metalness: 0.35 }));
    const graphiteDark = track(new THREE.MeshStandardMaterial({ color: '#1b1d24', roughness: 0.8, metalness: 0.3 }));
    const steel = track(new THREE.MeshStandardMaterial({ color: '#555b66', roughness: 0.4, metalness: 0.8 }));
    const brass = track(new THREE.MeshStandardMaterial({ color: '#c9973f', roughness: 0.32, metalness: 0.85 }));
    const floorTexture = track(createFloorTexture());
    floorTexture.wrapS = THREE.ClampToEdgeWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(1, 4);
    const floorMaterial = track(new THREE.MeshStandardMaterial({ map: floorTexture, color: '#9a9aa2', roughness: 0.62, metalness: 0.08, envMapIntensity: 0.4 }));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, hallDepth), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (back + front) / 2);
    architecture.add(floor);

    // Service column / landing pad under the ship.
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.34, S * 0.4, hall.shipBase, 40), steel);
    pad.position.set(0, hall.shipBase / 2, hall.shipZ);
    architecture.add(pad);
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(S * 0.38, S * 0.012, 8, 64), track(new THREE.MeshBasicMaterial({ color: '#ffcf7a' })));
    padRing.rotation.x = Math.PI / 2;
    padRing.position.set(0, hall.shipBase + 0.02, hall.shipZ);
    amberStrips.push(padRing.material as THREE.MeshBasicMaterial);
    architecture.add(padRing);

    // Keel lift the crew board on (telescopes up into the belly).
    keelLift = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.09, S * 0.09, 0.2, 28), brass);
    keelLift.position.set(0, 0.1, hall.keelZ);
    architecture.add(keelLift);

    // Side walls and three balcony tiers per side, packed with people.
    const tiers = 3;
    const tierHeight = H * 0.18;
    const tierDepth = W * 0.2;
    [-1, 1].forEach((side) => {
      box(1, H, hallDepth, graphiteDark, side * (W + 0.5), H / 2, (back + front) / 2);
      for (let tier = 0; tier < tiers; tier += 1) {
        const y = tierHeight * (tier + 1);
        const depth = tierDepth * (1 - tier * 0.12);
        const x = side * (W - depth / 2);
        box(depth, 0.5, hallDepth * 0.95, graphite, x, y, (back + front) / 2 + L * 0.02);
        box(0.18, 1.1, hallDepth * 0.95, steel, side * (W - depth), y + 0.8, (back + front) / 2 + L * 0.02);
        const stripMaterial = track(new THREE.MeshBasicMaterial({ color: '#ffb354' }));
        amberStrips.push(stripMaterial);
        box(0.12, 0.12, hallDepth * 0.95, stripMaterial, side * (W - depth + 0.1), y - 0.3, (back + front) / 2 + L * 0.02);
      }
      // Tall banners between the tiers.
      const bannerMaterial = track(new THREE.MeshStandardMaterial({ map: bannerTexture, transparent: true, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide }));
      for (let i = 0; i < 4; i += 1) {
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.2, S * 0.8), bannerMaterial);
        banner.position.set(side * (W - 0.3), H * 0.55, back + L * (0.18 + i * 0.2));
        banner.rotation.y = -side * Math.PI / 2;
        architecture.add(banner);
      }
    });

    // Back wall with the segmented rolling door, and the launch tunnel behind.
    const doorWidth = S * 1.9;
    doorTop = H * 0.78;
    box(W - doorWidth / 2, H, 1, graphiteDark, -(W + doorWidth / 2) / 2, H / 2, back);
    box(W - doorWidth / 2, H, 1, graphiteDark, (W + doorWidth / 2) / 2, H / 2, back);
    box(doorWidth, H - doorTop, 1, graphiteDark, 0, doorTop + (H - doorTop) / 2, back);
    const slatMaterial = track(new THREE.MeshStandardMaterial({ color: '#353a44', roughness: 0.55, metalness: 0.65 }));
    const slats = 9;
    for (let i = 0; i < slats; i += 1) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorTop / slats - 0.12, 0.6), slatMaterial);
      slat.userData.baseY = (i + 0.5) * (doorTop / slats);
      slat.position.set(0, slat.userData.baseY, back + 0.2);
      architecture.add(slat);
      doorSlats.push(slat);
    }
    const doorFrameMaterial = track(new THREE.MeshBasicMaterial({ color: '#ffc36b' }));
    amberStrips.push(doorFrameMaterial);
    box(doorWidth + 1, 0.3, 0.4, doorFrameMaterial, 0, doorTop + 0.2, back + 0.5);
    // Launch tunnel: dark, with blue guide rings receding (never a vista).
    const tunnelMaterial = track(new THREE.MeshStandardMaterial({ color: '#0b0e17', roughness: 0.9, side: THREE.BackSide }));
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(doorWidth * 0.62, doorWidth * 0.62, L * 0.9, 32, 1, true), tunnelMaterial);
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.set(0, doorTop * 0.5, back - L * 0.45);
    architecture.add(tunnel);
    const ringMaterial = track(new THREE.MeshBasicMaterial({ color: '#6fd6ff', transparent: true, opacity: 0.9 }));
    for (let i = 0; i < 7; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(doorWidth * 0.58, 0.14, 6, 48), ringMaterial);
      ring.position.set(0, doorTop * 0.5, back - 4 - i * (L * 0.12));
      architecture.add(ring);
      tunnelRings.push(ring);
    }

    // Ceiling with gantry cranes and a suspended service cab.
    box(W * 2 + 2, 1, hallDepth, graphiteDark, 0, H, (back + front) / 2);
    gantry = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(W * 2, S * 0.05, S * 0.08), steel);
      beam.position.set(0, H - S * 0.12, back + L * (0.2 + i * 0.24));
      gantry.add(beam);
    }
    const cab = new THREE.Mesh(new THREE.BoxGeometry(S * 0.14, S * 0.1, S * 0.12), track(new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: 0.5, metalness: 0.4 })));
    cab.position.set(-W * 0.3, H - S * 0.32, back + L * 0.44);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, S * 0.2, 6), steel);
    cable.position.set(-W * 0.3, H - S * 0.17, back + L * 0.44);
    gantry.add(cab, cable);
    architecture.add(gantry);
    // Hanging amber practicals.
    for (let i = 0; i < 6; i += 1) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(S * 0.025, 10, 8), track(new THREE.MeshBasicMaterial({ color: '#ffd08a' })));
      amberStrips.push(lamp.material as THREE.MeshBasicMaterial);
      lamp.position.set((i % 2 === 0 ? -1 : 1) * W * 0.45, H * 0.72, back + L * (0.15 + Math.floor(i / 2) * 0.25));
      architecture.add(lamp);
    }
    fills[0]!.position.set(-W * 0.5, H * 0.6, L * 0.1);
    fills[1]!.position.set(W * 0.5, H * 0.6, L * 0.25);
    fills[2]!.position.set(0, doorTop * 0.5, back - 6);
    fills.forEach((light) => { light.distance = L * 0.9; });

    // Floor life: service carts along the sides.
    const cartMaterial = track(new THREE.MeshStandardMaterial({ color: '#d8dde4', roughness: 0.4, metalness: 0.3 }));
    const cartTrim = track(new THREE.MeshStandardMaterial({ color: '#2f6bd8', roughness: 0.5 }));
    for (let i = 0; i < 6; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * W * (0.58 + (i % 3) * 0.05);
      const z = back + L * (0.3 + i * 0.07);
      box(S * 0.12, S * 0.05, S * 0.07, cartMaterial, x, S * 0.04, z);
      box(S * 0.121, S * 0.012, S * 0.071, cartTrim, x, S * 0.05, z);
    }
    // Causeway bollard lights.
    const bollardMaterial = track(new THREE.MeshBasicMaterial({ color: '#ffcf85' }));
    amberStrips.push(bollardMaterial);
    for (let i = 0; i < 10; i += 1) {
      const bollard = S * 0.012;
      [-1, 1].forEach((side) => box(bollard, bollard * 3, bollard, bollardMaterial, side * S * 0.2, bollard * 1.5, hall.keelZ + S * 0.3 + i * (hall.causewayStart - hall.keelZ) / 9));
    }
  }

  function buildCrowd() {
    const { halfWidth: W, length: L, height: H, span: S } = hall;
    const back = -L * 0.32;
    const tierHeight = H * 0.18;
    const tierDepth = W * 0.2;
    const personHeight = S * 0.09;
    const spots: Array<{ x: number; y: number; z: number }> = [];
    const density = quality === 'high' ? 1 : 0.5;
    // Balconies.
    [-1, 1].forEach((side) => {
      for (let tier = 0; tier < 3; tier += 1) {
        const depth = tierDepth * (1 - tier * 0.12);
        const rows = 2;
        const count = Math.floor(90 * density);
        for (let i = 0; i < count; i += 1) {
          for (let row = 0; row < rows; row += 1) {
            spots.push({
              x: side * (W - depth * (0.3 + row * 0.35)) + (Math.random() - 0.5) * 0.4,
              y: tierHeight * (tier + 1) + 0.25,
              z: back + L * 0.1 + (i / count) * L * 1.2 + (Math.random() - 0.5) * 0.8,
            });
          }
        }
      }
    });
    // Floor crowds behind the marshal lines, both sides of the causeway.
    const floorCount = Math.floor(140 * density);
    for (let i = 0; i < floorCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = Math.floor(i / 2) % 4;
      spots.push({
        x: side * (S * 0.34 + lane * S * 0.07 + Math.random() * S * 0.04),
        y: 0,
        z: hall.keelZ + S * 0.4 + (Math.floor(i / 8) / (floorCount / 8)) * (hall.causewayStart + S * 0.4 - hall.keelZ) + Math.random(),
      });
    }
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geometry, crowdMaterial, spots.length);
    const variant = new Float32Array(spots.length * 4);
    const cloth = new Float32Array(spots.length * 3);
    const palette = ['#3d6fd8', '#e0b04a', '#d8dde4', '#c24f4f', '#4f9a74', '#7a5cc2', '#2a3a66', '#e98b3c'].map((hex) => new THREE.Color(hex));
    const matrix = new THREE.Matrix4();
    spots.forEach((spot, index) => {
      const height = personHeight * (0.9 + Math.random() * 0.22);
      matrix.makeScale(height * 1.0, height, 1);
      matrix.setPosition(spot.x, spot.y, spot.z);
      mesh.setMatrixAt(index, matrix);
      variant.set([Math.floor(Math.random() * CROWD_POSES), Math.random(), Math.random() * Math.random(), 1], index * 4);
      const color = palette[Math.floor(Math.random() * palette.length)]!;
      cloth.set([color.r, color.g, color.b], index * 3);
    });
    geometry.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variant, 4));
    geometry.setAttribute('aCloth', new THREE.InstancedBufferAttribute(cloth, 3));
    mesh.frustumCulled = false;
    track(geometry);
    scene.add(mesh);
    crowd = mesh;
  }

  function buildCrewAndMarshals() {
    const { span: S } = hall;
    const personHeight = S * 0.09;
    const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => track(new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra }));
    const crewMaterials = { uniform: mat('#1e2f63'), trim: mat('#e3b75c', { metalness: 0.7, roughness: 0.3 }), skin: mat('#e6b894'), hair: mat('#3a2a1e'), boots: mat('#15161b') };
    const playerMaterials = { ...crewMaterials, uniform: mat('#f1f3f7'), trim: mat('#e3b75c', { metalness: 0.7, roughness: 0.3 }) };
    const marshalMaterials = { uniform: mat('#2a2d34'), trim: mat('#ff9a2e', { emissive: '#6b2c00' }), skin: mat('#c99472'), hair: mat('#1e1612'), boots: mat('#111') };
    const skinTones = ['#f0c7a4', '#d9a27c', '#a86f4c', '#6e4630'].map((color) => mat(color));
    const hairTones = ['#2a1f18', '#6a4a2c', '#161616', '#b98a4a'].map((color) => mat(color));

    // Marshals line the causeway, facing inward.
    for (let i = 0; i < 12; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const marshal = createCrewHuman({ ...marshalMaterials, skin: skinTones[i % 4]!, hair: hairTones[(i + 1) % 4]! }, personHeight);
      marshal.root.position.set(side * S * 0.27, 0, hall.keelZ + S * 0.5 + Math.floor(i / 2) * (hall.causewayStart - hall.keelZ) / 6.5);
      marshal.root.rotation.y = side * -Math.PI / 2;
      marshal.arms[0].rotation.x = -0.25;
      marshal.arms[1].rotation.x = -0.25;
      marshal.root.userData.marshal = true;
      crewRoot.add(marshal.root);
      crew.push({ human: marshal, lane: side, row: -1 });
    }

    // The crew: six officers, the player among them, and the three robots.
    const layout: Array<{ lane: number; row: number; robot?: RobotRole; isPlayer?: boolean }> = [
      { lane: -0.5, row: 0 }, { lane: 0.5, row: 0 },
      { lane: -1, row: 1, robot: 'heavy-worker' }, { lane: 0, row: 1, isPlayer: true }, { lane: 1, row: 1, robot: 'project-manager' },
      { lane: -0.5, row: 2 }, { lane: 0.5, row: 2, robot: 'mini-artist' },
      { lane: -1, row: 3 }, { lane: 0, row: 3 }, { lane: 1, row: 3 },
    ];
    layout.forEach((slot, index) => {
      if (slot.robot) { crew.push({ robot: slot.robot, lane: slot.lane, row: slot.row }); return; }
      const materials = slot.isPlayer ? playerMaterials : { ...crewMaterials, skin: skinTones[index % 4]!, hair: hairTones[index % 4]! };
      const human = createCrewHuman(materials, personHeight * (slot.isPlayer ? 1 : 0.94 + (index % 3) * 0.04));
      crewRoot.add(human.root);
      crew.push({ human, lane: slot.lane, row: slot.row, isPlayer: slot.isPlayer });
      if (slot.isPlayer) playerHuman = human;
    });

    robots = createRobotFamilyModel({ quality: 'low', showAddonRack: false, fixtureLights: false, transmission: false });
    robots.setExternalRootMotion(true);
    robots.setEmotion('delighted');
    const robotBox = new THREE.Box3().setFromObject(robots.members['heavy-worker']);
    const robotHeight = Math.max(0.001, robotBox.getSize(new THREE.Vector3()).y);
    robots.root.scale.setScalar((personHeight * 1.25) / robotHeight);
    crewRoot.add(robots.root);

    // The player: a soft gold ring on the floor and the chosen piece carried like a relic.
    playerRing = new THREE.Mesh(new THREE.RingGeometry(personHeight * 0.3, personHeight * 0.36, 40), track(new THREE.MeshBasicMaterial({ color: '#ffd889', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })));
    playerRing.rotation.x = -Math.PI / 2;
    crewRoot.add(playerRing);
    attachRelic(currentPiece);
  }

  function attachRelic(pieceId: PlayerPieceId) {
    if (relic) { relic.root.parent?.remove(relic.root); relic.dispose(); }
    relic = createPlayerPieceRelic(pieceId);
    const personHeight = hall.span * 0.09;
    relic.root.scale.setScalar(personHeight * 0.28);
    relic.root.position.set(0, personHeight * 0.98, personHeight * 0.2);
    playerHuman?.root.add(relic.root);
  }

  function setPiece(pieceId: PlayerPieceId) {
    if (pieceId === currentPiece && relic) return;
    currentPiece = pieceId;
    if (playerHuman) attachRelic(pieceId);
  }

  function resize() {
    const width = canvas.clientWidth || 390;
    const height = canvas.clientHeight || 844;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  async function prepare(onProgress?: (progress: number) => void) {
    const steps: Array<() => void> = [buildShip, buildHangar, buildCrowd, buildCrewAndMarshals];
    for (let i = 0; i < steps.length; i += 1) {
      steps[i]!();
      onProgress?.((i + 1) / (steps.length + 1));
      await nextFrame();
    }
    resize();
    placeCrewAndCamera(0, 0, true);
    // Warm every shader now so the first transform frame does not hitch.
    const compileAsync = (renderer as unknown as { compileAsync?: (scene: THREE.Scene, camera: THREE.Camera) => Promise<unknown> }).compileAsync;
    if (typeof compileAsync === 'function') await compileAsync.call(renderer, scene, camera);
    else renderer.compile(scene, camera);
    onProgress?.(1);
  }

  const shipTarget = new THREE.Vector3();
  function placeCrewAndCamera(timeSeconds: number, deltaSeconds: number, reducedMotion: boolean) {
    const frame = resolveDepartureDayFrame(timeSeconds);
    const { span: S, height: H, length: L } = hall;
    const personHeight = S * 0.09;
    const back = -L * 0.32;

    // Lights and energy.
    amberStrips.forEach((material) => material.color.setRGB(1, 0.72 + 0.1 * frame.lights, 0.4).multiplyScalar(0.25 + 0.95 * frame.lights));
    fills[0]!.intensity = fills[1]!.intensity = 900 * frame.lights * (S / 16) ** 2;
    fills[2]!.intensity = 400 * frame.door * (S / 16) ** 2;
    key.intensity = 0.4 + 1.1 * frame.lights;
    hemi.intensity = 0.2 + 0.3 * frame.lights;
    crowdMaterial.uniforms.uTime.value = timeSeconds;
    crowdMaterial.uniforms.uEnergy.value = reducedMotion ? 0 : frame.crowd;
    crowdMaterial.uniforms.uLight.value = frame.lights;

    // Ship: closed shell → living mode → closed, then lifts out through the door.
    const liftHeight = frame.liftOff * S * 0.35;
    const exit = smooth(frame.liftOff, 0.35, 1) * (L * 0.62);
    shipPivot.position.y = hall.shipBase + ((shipPivot.userData.baseOffset as number | undefined) ?? 0) + liftHeight;
    shipPivot.position.z = hall.shipZ - exit;
    if (ship) {
      ship.update({
        timeSeconds,
        pose: 'flight',
        poseProgress: frame.shipPoseProgress,
        thrust: frame.liftOff > 0 ? 0.4 + frame.liftOff * 0.6 : 0,
        boost: frame.liftOff > 0.5 ? 1 : 0,
        hover: frame.liftOff > 0 ? 0.6 : 0,
        stabilize: 0.72,
        reducedMotion,
      });
    }
    doorSlats.forEach((slat, index) => {
      // Slats roll up from the bottom one after another.
      const lift = clamp01(frame.door * 1.4 - (index / doorSlats.length) * 0.4);
      slat.position.y = slat.userData.baseY + lift * (doorTop - slat.userData.baseY + 1);
      slat.visible = lift < 0.98;
    });
    tunnelRings.forEach((ring, index) => {
      const pulse = reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(timeSeconds * 6 - index * 0.8);
      ring.visible = frame.door > 0.02;
      ring.scale.setScalar(1 + 0.02 * pulse);
    });
    if (keelLift) {
      keelLift.scale.y = 1;
      keelLift.position.y = 0.1 + frame.boarding * hall.shipBase * 1.6;
      keelLift.visible = frame.liftOff < 0.2;
    }

    // Crew walk the causeway two by two, then ride the keel lift up.
    const walkFrom = hall.causewayStart;
    const walkTo = hall.keelZ + personHeight * 1.2;
    const stride = personHeight * 0.55;
    const rowGap = personHeight * 0.75;
    const walking = frame.crewWalk > 0 && frame.crewWalk < 1 && !reducedMotion;
    const gait = walking ? Math.sin(timeSeconds * 7.5) : 0;
    let playerPosition = new THREE.Vector3();
    crew.forEach((member, index) => {
      if (member.row < 0) {
        // Marshals: a light clap while the crew passes.
        const clap = !reducedMotion && frame.crewWalk > 0 && frame.crewWalk < 1 ? Math.abs(Math.sin(timeSeconds * 8 + index)) : 0;
        member.human!.arms[0].rotation.set(-0.25 - clap * 0.9, 0, 0.2 * clap);
        member.human!.arms[1].rotation.set(-0.25 - clap * 0.9, 0, -0.2 * clap);
        return;
      }
      const z = THREE.MathUtils.lerp(walkFrom, walkTo, frame.crewWalk) + member.row * rowGap;
      const x = member.lane * stride;
      const up = frame.boarding * hall.shipBase * 1.6;
      // Boarding: gather onto the lift, rise, then vanish into the belly.
      const gatherX = THREE.MathUtils.lerp(x, x * 0.35, frame.boarding);
      const gatherZ = THREE.MathUtils.lerp(z, hall.keelZ + member.row * rowGap * 0.3, frame.boarding);
      const visible = frame.boarding < 0.97;
      if (member.human) {
        const human = member.human;
        human.root.position.set(gatherX, up, gatherZ);
        human.root.rotation.y = Math.PI;
        human.root.visible = visible;
        const phase = index % 2 === 0 ? 1 : -1;
        human.legs[0].rotation.x = gait * 0.45 * phase;
        human.legs[1].rotation.x = -gait * 0.45 * phase;
        if (member.isPlayer) {
          // Carry the relic forward in both hands.
          human.arms[0].rotation.set(-0.95, 0, 0.35);
          human.arms[1].rotation.set(-0.95, 0, -0.35);
          playerPosition = human.root.position.clone();
          if (playerRing) {
            playerRing.position.set(gatherX, up + 0.03, gatherZ);
            playerRing.visible = visible;
          }
        } else {
          human.arms[0].rotation.set(-gait * 0.4 * phase, 0, 0.06);
          human.arms[1].rotation.set(gait * 0.4 * phase, 0, -0.06);
        }
      } else if (member.robot && robots) {
        const group = robots.members[member.robot];
        const inverse = 1 / robots.root.scale.x;
        group.position.set(gatherX * inverse, (up + personHeight * 0.1 + (reducedMotion ? 0 : Math.sin(timeSeconds * 2 + index) * personHeight * 0.03)) * inverse, gatherZ * inverse);
        group.rotation.y = Math.PI;
        group.visible = visible;
        robots.setMemberMotion(member.robot, frame.crewWalk > 0.05 && frame.crewWalk < 1 ? (member.robot === 'heavy-worker' ? 'carry' : 'celebrate') : 'listen');
      }
    });
    robots?.update(timeSeconds, deltaSeconds, reducedMotion);
    relic?.update(timeSeconds, reducedMotion);

    // Camera: one continuous move per beat, framed for a phone.
    shipTarget.set(0, shipPivot.position.y + S * 0.12, shipPivot.position.z);
    let eye: THREE.Vector3;
    let target: THREE.Vector3;
    let lens = 46;
    const u = (a: number, b: number) => smooth(timeSeconds, a, b);
    if (timeSeconds < 2) {
      // Reveal: behind the foreground crowd, pushing slowly down the causeway.
      eye = v(S * 0.1, S * 0.3, hall.causewayStart + S * 0.15 - u(0, 2) * S * 0.25);
      target = shipTarget.clone().add(v(0, S * 0.08, 0));
      lens = 56;
    } else if (timeSeconds < 6) {
      // Transform: a slow low orbit looking up at the ship opening.
      const a = THREE.MathUtils.lerp(0.6, -0.35, u(2, 6));
      const r = S * 1.7;
      eye = v(Math.sin(a) * r, S * 0.3, hall.shipZ + Math.cos(a) * r);
      target = shipTarget.clone().add(v(0, S * 0.05, 0));
      lens = 50;
    } else if (timeSeconds < 9.5) {
      // Crew walk: track beside the player at eye level, the ship ahead.
      // Behind and above the crew: their backs, the crowd either side, the ship ahead.
      eye = playerPosition.clone().add(v(S * 0.03, personHeight * 2.4, personHeight * 5.5));
      target = playerPosition.clone().lerp(shipTarget, 0.45);
      lens = 50;
    } else if (timeSeconds < 11.5) {
      // Boarding: look up the keel as the crew rise into the ship.
      eye = v(S * 0.04, S * 0.2, hall.keelZ + S * 1.15);
      target = v(0, hall.shipBase + S * 0.08 + frame.boarding * S * 0.1, hall.keelZ);
      lens = 50;
    } else {
      // Departure: wide from the floor, the door rolls up and the ship leaves.
      const pull = u(11.5, 13);
      eye = v(-S * 0.25 * pull, S * 0.1 + pull * S * 0.1, hall.causewayStart * 0.9 + pull * S * 0.2);
      target = shipTarget.clone().lerp(v(0, doorTop * 0.5, back), 0.35 + 0.4 * frame.liftOff);
      lens = 48;
    }
    // Keep the frame inside a narrow portrait screen.
    eye.sub(target).multiplyScalar(Math.max(1, 0.62 / camera.aspect)).add(target);
    camera.position.copy(eye);
    camera.lookAt(target);
    camera.fov = lens;
    camera.updateProjectionMatrix();
    renderer.toneMappingExposure = 1.05 * (1 - frame.handoff * 0.9);
  }

  function render(timeSeconds: number, deltaSeconds: number, reducedMotion: boolean) {
    placeCrewAndCamera(timeSeconds, deltaSeconds, reducedMotion);
    ship?.prepareRender();
    renderer.render(scene, camera);
  }

  function dispose() {
    ship?.dispose();
    robots?.dispose();
    relic?.dispose();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    disposables.forEach((item) => item.dispose());
    environment.dispose();
    renderer.dispose();
  }

  resize();
  return { prepare, setPiece, render, resize, dispose };
}
