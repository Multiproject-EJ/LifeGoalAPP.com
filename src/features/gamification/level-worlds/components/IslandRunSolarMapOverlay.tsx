import './IslandRunSolarMapOverlay.css';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import * as THREE from 'three';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { loadIslandArtManifest } from '../services/islandArtManifest';
import { playIslandRunSound, triggerIslandRunHaptic } from '../services/islandRunAudio';
import { getIslandDisplayName } from '../services/islandNames';
import {
  clampIslandRunOrbitNumber,
  ISLAND_RUN_ORBIT_ARM_COUNT,
  ISLAND_RUN_ORBIT_ISLANDS_PER_ARM,
  ISLAND_RUN_ORBIT_MAX_ISLANDS,
  getIslandRunOrbitArmNumbers,
  normalizeIslandRunOrbitCount,
  resolveIslandRunOrbitAddress,
  resolveIslandRunOrbitFocusEntries,
} from '../services/islandRunOrbitTopology';

type OrbitCompassCategory = 'life' | 'water' | 'heat' | 'sky' | 'absurd';
type OrbitCompassStatus = 'completed' | 'visited' | 'current' | 'unvisited' | 'locked';
type OrbitCompassView = 'overview' | 'branch' | 'archive' | 'index';
type OrbitCompassJourneyPhase = 'seal' | 'travel' | 'arrive' | 'celebrate';

interface OrbitCompassJourney {
  fromIslandNumber: number;
  toIslandNumber: number;
}

interface OrbitCompassCategoryDefinition {
  id: OrbitCompassCategory;
  label: string;
  color: number;
  terrainColor: number;
  accentColor: string;
}

interface OrbitCompassNode {
  index: number;
  armIndex: number;
  armStep: number;
  x: number;
  y: number;
  z: number;
  category: OrbitCompassCategory;
  status: OrbitCompassStatus;
  milestone: boolean;
}

interface OrbitCompassIslandVisual {
  islandNumber: number;
  thumbnailSrc: string;
  backgroundSrc?: string;
  aspectRatio?: number;
}

interface IslandRunSolarMapOverlayProps {
  currentIslandNumber: number;
  currentIslandCompletedStopCount?: number;
  maxIslandCount?: number;
  completedIslandNumbers?: readonly number[];
  visitedIslandNumbers?: readonly number[];
  onClose: () => void;
  journey?: OrbitCompassJourney;
  onJourneyComplete?: () => void;
}

interface OrbitCompassRuntime {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  orbitRoot: THREE.Group;
  ringRoot: THREE.Group;
  routeRoot: THREE.Group;
  nodeRoot: THREE.Group;
  pickMeshes: THREE.Object3D[];
  nodeGroups: Map<number, THREE.Group>;
  sunGlow: THREE.Mesh;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  frameId: number;
  resizeObserver: ResizeObserver;
  dispose: () => void;
}

const DEFAULT_MAX_ISLAND_COUNT = ISLAND_RUN_ORBIT_MAX_ISLANDS;
const CURRENT_ISLAND_LOCAL_WINDOW = 3;
const LABEL_INTERVAL = 12;
const EARLY_ISLAND_VISUAL_COUNT = 20;
const WAYSTATION_INTERVAL = 4;
const JOURNEY_DURATION_MS = 2200;

const ORBIT_COMPASS_CATEGORIES: OrbitCompassCategoryDefinition[] = [
  { id: 'water', label: 'Shores', color: 0x68dcff, terrainColor: 0x2096ba, accentColor: '#68dcff' },
  { id: 'life', label: 'Wilds', color: 0x5ee082, terrainColor: 0x2f9c55, accentColor: '#5ee082' },
  { id: 'heat', label: 'Elements', color: 0xff8a4a, terrainColor: 0xc54f25, accentColor: '#ff8a4a' },
  { id: 'sky', label: 'Legends', color: 0xf8c766, terrainColor: 0xc98f31, accentColor: '#f8c766' },
  { id: 'absurd', label: 'Absurd', color: 0xd377ff, terrainColor: 0x8e57ff, accentColor: '#d377ff' },
];

const ORBIT_CATEGORY_LANDMARK_SRC: Record<OrbitCompassCategory, string> = {
  life: '/assets/island-run/orbit-compass/life-landmark-v1.png?v=2',
  water: '/assets/island-run/orbit-compass/water-landmark-v1.png?v=2',
  heat: '/assets/island-run/orbit-compass/heat-landmark-v1.png?v=2',
  sky: '/assets/island-run/orbit-compass/sky-landmark-v1.png?v=2',
  absurd: '/assets/island-run/orbit-compass/absurd-landmark-v1.png?v=2',
};

const ORBIT_CATEGORY_ATLAS_SRC: Record<OrbitCompassCategory, string> = {
  life: '/assets/island-run/orbit-compass/life-atlas-v1.png',
  water: '/assets/island-run/orbit-compass/islands/island-013-bluewater-bay-v1.png?v=1',
  heat: '/assets/island-run/orbit-compass/heat-atlas-v1.png',
  sky: '/assets/island-run/orbit-compass/sky-atlas-v1.png',
  absurd: '/assets/island-run/orbit-compass/absurd-atlas-v1.png',
};

const ORBIT_CATEGORY_WAYSTATION_SRC: Record<OrbitCompassCategory, readonly string[]> = {
  life: [
    '/assets/island-run/orbit-compass/life-waystation-v1.png?v=1',
    '/assets/island-run/orbit-compass/life-waystation-v2.png?v=1',
  ],
  water: ['/assets/island-run/orbit-compass/water-waystation-v1.png?v=1'],
  heat: [
    '/assets/island-run/orbit-compass/heat-waystation-v1.png?v=1',
    '/assets/island-run/orbit-compass/heat-waystation-v2.png?v=1',
  ],
  sky: [
    '/assets/island-run/orbit-compass/sky-waystation-v1.png?v=1',
    '/assets/island-run/orbit-compass/sky-waystation-v2.png?v=1',
  ],
  absurd: [
    '/assets/island-run/orbit-compass/absurd-waystation-v1.png?v=1',
    '/assets/island-run/orbit-compass/absurd-waystation-v2.png?v=1',
  ],
};

const ORBIT_AUTHORED_ISLAND_SRC: Readonly<Partial<Record<number, string>>> = {
  13: '/assets/island-run/orbit-compass/islands/island-013-bluewater-bay-v1.png?v=1',
  14: '/assets/island-run/orbit-compass/islands/island-014-mango-isle-v1.png?v=1',
  15: '/assets/island-run/orbit-compass/islands/island-015-starfish-shore-v1.png?v=1',
  16: '/assets/island-run/orbit-compass/islands/island-016-windy-coast-v1.png?v=1',
  17: '/assets/island-run/orbit-compass/islands/island-017-hidden-lagoon-v1.png?v=1',
  18: '/assets/island-run/orbit-compass/islands/island-018-shrine-of-sands-v1.png?v=1',
  19: '/assets/island-run/orbit-compass/islands/island-019-bamboo-bay-v1.png?v=1',
  20: '/assets/island-run/orbit-compass/islands/island-020-golden-sands-v1.png?v=1',
};

const ORBIT_AUTHORED_ISLAND_ASPECT_RATIO: Readonly<Partial<Record<number, number>>> = {
  13: 1,
  14: 2 / 3,
  15: 1.08,
  16: 1.5,
  17: 0.96,
  18: 1.08,
  19: 0.94,
  20: 0.95,
};

const ORBIT_ARM_SHAPES = [
  { curl: 0.92, wave: 0.28, phase: 0.2, reach: 0.96 },
  { curl: 1.12, wave: -0.24, phase: 1.1, reach: 0.9 },
  { curl: 0.82, wave: 0.34, phase: 2.4, reach: 1 },
  { curl: 1.2, wave: 0.22, phase: 3.2, reach: 0.88 },
  { curl: 1.02, wave: -0.31, phase: 4.4, reach: 0.94 },
] as const;

function clampIslandNumber(value: number, maxIslandCount: number): number {
  return clampIslandRunOrbitNumber(value, maxIslandCount);
}

function getCategoryDefinition(category: OrbitCompassCategory): OrbitCompassCategoryDefinition {
  return ORBIT_COMPASS_CATEGORIES.find((definition) => definition.id === category) ?? ORBIT_COMPASS_CATEGORIES[0];
}

function getCategoryForArm(armIndex: number): OrbitCompassCategory {
  return ORBIT_COMPASS_CATEGORIES[armIndex % ORBIT_COMPASS_CATEGORIES.length]?.id ?? 'life';
}

function getPlaceholderBiomeForIsland(
  islandNumber: number,
  routeCategory: OrbitCompassCategory,
): OrbitCompassCategory {
  const name = getIslandDisplayName(islandNumber).toLowerCase();
  if (/dream|paradox|chaos|carnival|mirror|impossible|whim|strange|neon|cyber|quantum|data|ai nexus|code|hologram|pixel|digital|server|nano|synapse|starfall|cosmic|nebula|galaxy|lunar|infinity|astral|void|ascension|final horizon/.test(name)) return 'absurd';
  if (/lava|ember|flame|fire|magma|volcan|inferno|furnace|ash/.test(name)) return 'heat';
  if (/ice|frost|snow|winter|glacier|crystal/.test(name)) return 'water';
  if (/forest|grove|bamboo|mango|garden|jungle|meadow|bloom|tree|moss|blossom|vine|water|bay|lagoon|cove|shore|reef|river|tide|harbor|ocean|aqua|coral|pearl/.test(name)) return 'life';
  if (/sky|wind|cloud|star|moon|horizon|dawn|sunset|sand|gold|shrine|crown|celestial/.test(name)) return 'sky';
  return routeCategory;
}

function createCategoryLandmarkVisual(islandNumber: number, category: OrbitCompassCategory): OrbitCompassIslandVisual {
  return {
    islandNumber,
    thumbnailSrc: ORBIT_CATEGORY_LANDMARK_SRC[category],
  };
}

function createCategoryWaystationVisual(islandNumber: number, category: OrbitCompassCategory): OrbitCompassIslandVisual {
  const sources = ORBIT_CATEGORY_WAYSTATION_SRC[category];
  const variantIndex = Math.floor(Math.max(0, islandNumber - 1) / WAYSTATION_INTERVAL) % sources.length;
  return {
    islandNumber,
    thumbnailSrc: sources[variantIndex] ?? sources[0],
  };
}

function createAuthoredOrbitVisual(islandNumber: number): OrbitCompassIslandVisual | undefined {
  const thumbnailSrc = ORBIT_AUTHORED_ISLAND_SRC[islandNumber];
  return thumbnailSrc
    ? { islandNumber, thumbnailSrc, aspectRatio: ORBIT_AUTHORED_ISLAND_ASPECT_RATIO[islandNumber] }
    : undefined;
}

function getArmIndexForIsland(index: number): number {
  return resolveIslandRunOrbitAddress(index).armIndex;
}

function createIslandRunOrbitNodes(
  currentIsland: number,
  maxIslandCount: number,
  completedIslandNumbers?: readonly number[],
  visitedIslandNumbers?: readonly number[],
): OrbitCompassNode[] {
  const safeMax = normalizeIslandRunOrbitCount(maxIslandCount);
  const completedSet = completedIslandNumbers
    ? new Set(completedIslandNumbers.map((number) => clampIslandNumber(number, safeMax)))
    : null;
  const visitedSet = visitedIslandNumbers
    ? new Set(visitedIslandNumbers.map((number) => clampIslandNumber(number, safeMax)))
    : new Set<number>();

  return Array.from({ length: safeMax }, (_, offset) => {
    const index = offset + 1;
    const { armIndex, armStep } = resolveIslandRunOrbitAddress(index, safeMax);
    const armProgress = armStep / (ISLAND_RUN_ORBIT_ISLANDS_PER_ARM - 1);
    const armShape = ORBIT_ARM_SHAPES[armIndex % ORBIT_ARM_SHAPES.length];
    const baseAngle = -2.9 + armIndex * (Math.PI * 2 / ISLAND_RUN_ORBIT_ARM_COUNT);
    const angle = baseAngle
      + armShape.curl * armProgress
      + armShape.wave
        * Math.sin(armProgress * Math.PI * 2 + armShape.phase)
        * Math.sin(armProgress * Math.PI);
    const radius = 0.88
      + Math.pow(armProgress, 0.86) * 3.55 * armShape.reach
      + Math.sin((armStep + 1) * 0.72) * 0.045;
    const milestone = index % LABEL_INTERVAL === 0 || index === currentIsland || index === safeMax;
    const completed = completedSet ? completedSet.has(index) : index < currentIsland;
    const status: OrbitCompassStatus = index === currentIsland
      ? 'current'
      : completed
        ? 'completed'
        : visitedSet.has(index)
          ? 'visited'
          : index <= currentIsland + CURRENT_ISLAND_LOCAL_WINDOW
            ? 'unvisited'
            : 'locked';

    return {
      index,
      armIndex,
      armStep,
      x: Math.cos(angle) * radius,
      y: Math.sin(index * 0.22) * 0.055 + Math.sin(armProgress * Math.PI) * 0.08 + (milestone ? 0.06 : 0),
      z: Math.sin(angle) * radius,
      category: getCategoryForArm(armIndex),
      status,
      milestone,
    };
  });
}

function getStatusLabel(status: OrbitCompassStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'visited':
      return 'Visited';
    case 'current':
      return 'Current';
    case 'unvisited':
      return 'Revealed';
    case 'locked':
      return 'Locked';
  }
}

function getActionLabel(status: OrbitCompassStatus): string {
  if (status === 'current') return 'Continue Island';
  if (status === 'completed' || status === 'visited') return 'Revisit Island';
  return 'Current Island';
}

function getRouteContextLabel(status: OrbitCompassStatus): string {
  if (status === 'completed' || status === 'visited') return 'Journey archive';
  if (status === 'current') return 'Active expedition';
  if (status === 'unvisited') return 'Preview route';
  return 'Unlocks later';
}

function disposeObject(object: THREE.Object3D) {
  const disposedTextures = new Set<THREE.Texture>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite)) return;
    if ('geometry' in child) child.geometry?.dispose();
    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => {
        if ('map' in entry && entry.map instanceof THREE.Texture && !disposedTextures.has(entry.map)) {
          disposedTextures.add(entry.map);
          entry.map.dispose();
        }
        entry.dispose();
      });
    } else {
      if ('map' in material && material.map instanceof THREE.Texture && !disposedTextures.has(material.map)) {
        disposedTextures.add(material.map);
        material.map.dispose();
      }
      material?.dispose();
    }
  });
}

function createSunCoronaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 16, 128, 128, 124);
    gradient.addColorStop(0, 'rgba(255, 246, 183, 1)');
    gradient.addColorStop(0.24, 'rgba(255, 192, 54, 0.92)');
    gradient.addColorStop(0.5, 'rgba(255, 137, 28, 0.36)');
    gradient.addColorStop(1, 'rgba(255, 111, 18, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSunSurfaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, '#fff1a1');
    gradient.addColorStop(0.42, '#ffc43d');
    gradient.addColorStop(1, '#f47c18');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 128);

    let seed = 1847;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let spotIndex = 0; spotIndex < 56; spotIndex += 1) {
      const x = random() * 256;
      const y = random() * 128;
      const radius = 3 + random() * 13;
      context.beginPath();
      context.fillStyle = spotIndex % 3 === 0
        ? `rgba(255, 246, 171, ${0.08 + random() * 0.18})`
        : `rgba(202, 70, 10, ${0.05 + random() * 0.14})`;
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function createStatusMarkerTexture(status: OrbitCompassStatus, categoryColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const fillColor = status === 'completed'
      ? '#31c96d'
      : status === 'visited'
        ? '#48cfee'
        : status === 'current'
          ? '#f8c766'
          : categoryColor;
    context.beginPath();
    context.arc(32, 32, 25, 0, Math.PI * 2);
    context.fillStyle = fillColor;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = status === 'locked' ? 'rgba(170, 194, 220, 0.68)' : 'rgba(255, 255, 255, 0.9)';
    context.stroke();

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 6;
    context.strokeStyle = status === 'locked' ? '#b2c2d4' : '#ffffff';
    if (status === 'completed') {
      context.beginPath();
      context.moveTo(20, 32);
      context.lineTo(29, 41);
      context.lineTo(45, 23);
      context.stroke();
    } else if (status === 'locked') {
      context.lineWidth = 4;
      context.strokeRect(22, 30, 20, 16);
      context.beginPath();
      context.arc(32, 30, 8, Math.PI, 0);
      context.stroke();
    } else if (status === 'visited') {
      context.beginPath();
      context.arc(32, 32, 10, 0, Math.PI * 2);
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(32, 19);
      context.lineTo(36, 28);
      context.lineTo(45, 32);
      context.lineTo(36, 36);
      context.lineTo(32, 45);
      context.lineTo(28, 36);
      context.lineTo(19, 32);
      context.lineTo(28, 28);
      context.closePath();
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addRouteTube(
  root: THREE.Group,
  points: THREE.Vector3[],
  color: number,
  radius: number,
  opacity: number,
) {
  if (points.length < 2) return;
  const path = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  material.userData.baseOpacity = opacity;
  root.add(new THREE.Mesh(
    new THREE.TubeGeometry(path, Math.max(24, points.length * 2), radius, 6, false),
    material,
  ));
}

function addRoutePulses(
  root: THREE.Group,
  points: THREE.Vector3[],
  color: number,
  armIndex: number,
) {
  if (points.length < 2) return;
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  [0, 0.46].forEach((offset, pulseIndex) => {
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(pulseIndex === 0 ? 0.065 : 0.045, 10, 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: pulseIndex === 0 ? 0.94 : 0.64,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    pulse.userData.routePulse = true;
    pulse.userData.routeCurve = curve;
    pulse.userData.routeOffset = (offset + armIndex * 0.13) % 1;
    pulse.userData.routeSpeed = 0.000035 + armIndex * 0.0000025;
    pulse.position.copy(curve.getPoint(pulse.userData.routeOffset));
    pulse.position.y += 0.055;
    root.add(pulse);
  });
}

function createOrbitArcPoints(radius: number, startAngle: number, arc: number, segments = 24): THREE.Vector3[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = startAngle + arc * index / segments;
    return new THREE.Vector3(Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius);
  });
}

function createJourneyCurve(fromNode: OrbitCompassNode, toNode: OrbitCompassNode): THREE.CatmullRomCurve3 {
  const from = new THREE.Vector3(fromNode.x, fromNode.y + 0.18, fromNode.z);
  const to = new THREE.Vector3(toNode.x, toNode.y + 0.18, toNode.z);
  if (fromNode.armIndex === toNode.armIndex) {
    const middle = from.clone().lerp(to, 0.5);
    middle.y += 0.48;
    return new THREE.CatmullRomCurve3([from, middle, to], false, 'catmullrom', 0.34);
  }

  const fromRadius = Math.max(0.001, Math.hypot(fromNode.x, fromNode.z));
  const toRadius = Math.max(0.001, Math.hypot(toNode.x, toNode.z));
  const fromHub = new THREE.Vector3(fromNode.x / fromRadius * 0.72, 0.38, fromNode.z / fromRadius * 0.72);
  const toHub = new THREE.Vector3(toNode.x / toRadius * 0.72, 0.38, toNode.z / toRadius * 0.72);
  return new THREE.CatmullRomCurve3([
    from,
    fromHub,
    new THREE.Vector3(0, 0.72, 0),
    toHub,
    to,
  ], false, 'catmullrom', 0.28);
}

function getOrbitFocusYaw(node: OrbitCompassNode): number {
  return Math.atan2(node.x, -node.z);
}

function createTerrainIsland(options: {
  node: OrbitCompassNode;
  category: OrbitCompassCategoryDefinition;
  radius: number;
  status: OrbitCompassStatus;
  visual?: OrbitCompassIslandVisual;
  markerTexture?: THREE.CanvasTexture;
  textureCache: Map<string, THREE.Texture>;
}): THREE.Group {
  const { category, markerTexture, node, radius, status, textureCache, visual } = options;
  const locked = status === 'locked';
  const waypoint = node.milestone || (node.armStep + 1) % WAYSTATION_INTERVAL === 0;
  const group = new THREE.Group();
  group.position.set(node.x, node.y, node.z);
  group.userData.index = node.index;
  group.userData.hasArtwork = Boolean(visual);

  const islandMaterial = new THREE.MeshStandardMaterial({
    color: locked ? 0x71859d : category.color,
    transparent: true,
    opacity: locked ? 0.58 : 1,
    roughness: 0.68,
    metalness: 0.05,
    emissive: status === 'current' ? category.terrainColor : status === 'completed' ? 0x123018 : 0x071422,
    emissiveIntensity: status === 'current' ? 0.42 : status === 'completed' ? 0.34 : 0.16,
  });
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: locked ? 0x465971 : 0x4a3b2c,
    transparent: true,
    opacity: locked ? 0.54 : 0.92,
    roughness: 0.82,
  });
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: locked ? 0xa8b7c9 : category.terrainColor,
    transparent: true,
    opacity: locked ? 0.58 : 0.96,
    roughness: 0.76,
    emissive: status === 'current' ? category.terrainColor : 0x000000,
    emissiveIntensity: status === 'current' ? 0.18 : 0,
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.18, radius * 1.46, radius * 0.55, waypoint ? 10 : 8),
    sideMaterial,
  );
  base.position.y = -radius * 0.22;
  base.userData.index = node.index;
  group.add(base);

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.04, radius * 0.2, waypoint ? 10 : 8),
    islandMaterial,
  );
  plate.position.y = radius * 0.1;
  plate.userData.index = node.index;
  group.add(plate);

  const pickTarget = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(radius * 1.4, 0.14), 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  pickTarget.position.y = radius * 0.5;
  pickTarget.userData.index = node.index;
  pickTarget.userData.isPickTarget = true;
  group.add(pickTarget);

  if (visual) {
    let texture = textureCache.get(visual.thumbnailSrc);
    if (!texture) {
      texture = new THREE.TextureLoader().load(visual.thumbnailSrc);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      textureCache.set(visual.thumbnailSrc, texture);
    }
    const artwork = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      color: locked ? 0xd5dfec : 0xffffff,
      transparent: true,
      opacity: locked ? 0.68 : 1,
      alphaTest: 0.025,
      depthWrite: false,
    }));
    const artworkSize = radius * (status === 'current' ? 5.4 : node.milestone ? 5.5 : waypoint ? 4.1 : 2.65);
    artwork.position.y = radius * 0.78;
    artwork.scale.set(artworkSize * (visual.aspectRatio ?? 1), artworkSize, artworkSize);
    artwork.userData.index = node.index;
    artwork.userData.isIslandArtwork = true;
    group.add(artwork);
  } else {
    const terrain = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.72, waypoint ? 12 : 9, 7),
      terrainMaterial,
    );
    terrain.position.y = radius * 0.46;
    terrain.scale.set(1, waypoint ? 0.4 : 0.3, 0.84);
    group.add(terrain);

    if (waypoint) {
      const decorationCount = node.milestone ? 3 : 2;
      for (let decorationIndex = 0; decorationIndex < decorationCount; decorationIndex += 1) {
        const decoration = new THREE.Mesh(
          new THREE.ConeGeometry(radius * 0.18, radius * (0.7 + decorationIndex * 0.14), 5),
          terrainMaterial,
        );
        const decorationAngle = decorationIndex * (Math.PI * 2 / 3) + node.index * 0.17;
        decoration.position.set(
          Math.cos(decorationAngle) * radius * 0.48,
          radius * (0.58 + decorationIndex * 0.04),
          Math.sin(decorationAngle) * radius * 0.48,
        );
        group.add(decoration);
      }

      for (let satelliteIndex = 0; satelliteIndex < 2; satelliteIndex += 1) {
        const satelliteAngle = node.index * 0.31 + satelliteIndex * Math.PI;
        const satellite = new THREE.Mesh(
          new THREE.SphereGeometry(radius * (satelliteIndex ? 0.2 : 0.26), 7, 5),
          satelliteIndex ? sideMaterial : terrainMaterial,
        );
        satellite.position.set(
          Math.cos(satelliteAngle) * radius * (1.55 + satelliteIndex * 0.28),
          radius * (0.22 + satelliteIndex * 0.12),
          Math.sin(satelliteAngle) * radius * (1.55 + satelliteIndex * 0.28),
        );
        satellite.scale.y = 0.62;
        group.add(satellite);
      }
    }

  }

  if (markerTexture) {
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({
      map: markerTexture,
      transparent: true,
      opacity: status === 'locked' ? 0.6 : 1,
      depthTest: false,
      depthWrite: false,
    }));
    const markerSize = status === 'current' ? 0.25 : node.milestone ? 0.22 : waypoint ? 0.19 : 0.16;
    marker.position.set(
      visual ? radius * (node.milestone || status === 'current' ? 1.65 : 1.25) : 0,
      visual ? radius * 0.42 : radius * 1.18,
      0.08,
    );
    marker.scale.set(markerSize, markerSize, markerSize);
    marker.renderOrder = 20;
    marker.userData.index = node.index;
    marker.userData.isStatusMarker = true;
    group.add(marker);
  }

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.62, radius * 0.075, 8, 36),
    new THREE.MeshBasicMaterial({
      color: status === 'current' ? 0xf8c766 : status === 'completed' ? 0x5ee082 : status === 'visited' ? 0x68dcff : 0x9bb2d0,
      transparent: true,
      opacity: status === 'locked' ? 0.14 : status === 'unvisited' ? 0.42 : 0.92,
    }),
  );
  halo.rotation.x = Math.PI / 2.18;
  halo.userData.halo = true;
  halo.userData.haloDirection = node.index % 2 ? 1 : -1;
  halo.userData.baseOpacity = status === 'locked' ? 0.14 : status === 'unvisited' ? 0.42 : 0.92;
  group.add(halo);

  if (status === 'current') {
    const currentHalo = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 2.2, radius * 0.032, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0x68dcff,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
      }),
    );
    currentHalo.rotation.x = Math.PI / 2.08;
    currentHalo.rotation.z = Math.PI / 5;
    currentHalo.userData.halo = true;
    currentHalo.userData.haloDirection = -1;
    currentHalo.userData.baseOpacity = 0.62;
    group.add(currentHalo);
  }

  return group;
}

function createOrbitCompassScene(options: {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  nodes: OrbitCompassNode[];
  islandVisuals: ReadonlyMap<number, OrbitCompassIslandVisual>;
  selectedIslandRef: MutableRefObject<number>;
  labelRefs: MutableRefObject<Map<number, HTMLSpanElement>>;
  onSelectIsland: (islandNumber: number) => void;
  journey?: OrbitCompassJourney;
}): OrbitCompassRuntime {
  const { canvas, stage, nodes, islandVisuals, selectedIslandRef, labelRefs, onSelectIsland, journey } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 15.8, 3.15);
  camera.lookAt(0, 0.08, 0);

  scene.add(new THREE.AmbientLight(0xcce8ff, 1.92));
  const sunLight = new THREE.PointLight(0xffce66, 6.4, 30);
  sunLight.position.set(0, 2.5, 0);
  scene.add(sunLight);
  const coolLight = new THREE.PointLight(0x65dcff, 2.2, 28);
  coolLight.position.set(4.8, 4.2, -7.2);
  scene.add(coolLight);

  const orbitRoot = new THREE.Group();
  orbitRoot.rotation.x = -0.035;
  orbitRoot.rotation.y = 1.72;
  orbitRoot.position.y = 0.38;
  orbitRoot.position.z = -0.9;
  scene.add(orbitRoot);

  const ringRoot = new THREE.Group();
  const hubProgressRoot = new THREE.Group();
  const routeRoot = new THREE.Group();
  const routePulseRoot = new THREE.Group();
  const nodeRoot = new THREE.Group();
  orbitRoot.add(ringRoot, hubProgressRoot, routeRoot, routePulseRoot, nodeRoot);

  const ocean = new THREE.Mesh(
    new THREE.CircleGeometry(6.75, 96),
    new THREE.MeshBasicMaterial({
      color: 0x0a8eac,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.34;
  orbitRoot.add(ocean);

  const sunSurfaceTexture = createSunSurfaceTexture();
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 48, 32),
    new THREE.MeshBasicMaterial({
      map: sunSurfaceTexture,
      color: 0xffffff,
    }),
  );
  orbitRoot.add(sun);
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.39, 40, 28),
    new THREE.MeshBasicMaterial({ color: 0xfff0a3, transparent: true, opacity: 0.76 }),
  );
  sunCore.position.set(-0.1, 0.13, 0.27);
  orbitRoot.add(sunCore);
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0xffa83a, transparent: true, opacity: 0.16 }),
  );
  orbitRoot.add(sunGlow);
  const sunCorona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createSunCoronaTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  sunCorona.scale.set(3.05, 3.05, 1);
  orbitRoot.add(sunCorona);

  [0.66, 0.72].forEach((radius, ringIndex) => {
    const sunRim = new THREE.Mesh(
      new THREE.TorusGeometry(radius, ringIndex === 0 ? 0.026 : 0.012, 8, 72),
      new THREE.MeshBasicMaterial({
        color: ringIndex === 0 ? 0xffe181 : 0x68dcff,
        transparent: true,
        opacity: ringIndex === 0 ? 0.92 : 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sunRim.rotation.x = Math.PI / 2;
    sunRim.userData.hubRim = true;
    sunRim.userData.rimDirection = ringIndex === 0 ? 1 : -1;
    orbitRoot.add(sunRim);
  });

  const sunRayRoot = new THREE.Group();
  sunRayRoot.userData.speed = 0.00072;
  sunRayRoot.userData.rotationAxis = 'y';
  for (let rayIndex = 0; rayIndex < 20; rayIndex += 1) {
    const angle = rayIndex * (Math.PI * 2 / 20);
    const halfWidth = 0.055 + (rayIndex % 3) * 0.012;
    const innerRadius = 0.69;
    const outerRadius = 0.94 + (rayIndex % 4) * 0.06;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(angle - halfWidth) * innerRadius, 0, Math.sin(angle - halfWidth) * innerRadius),
      new THREE.Vector3(Math.cos(angle) * outerRadius, 0, Math.sin(angle) * outerRadius),
      new THREE.Vector3(Math.cos(angle + halfWidth) * innerRadius, 0, Math.sin(angle + halfWidth) * innerRadius),
    ]);
    geometry.setIndex([0, 1, 2]);
    geometry.computeVertexNormals();
    sunRayRoot.add(new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: rayIndex % 2 ? 0xffb52e : 0xffdf74,
        transparent: true,
        opacity: 0.54,
        side: THREE.DoubleSide,
      }),
    ));
  }
  ringRoot.add(sunRayRoot);

  const orbitDustPositions = new Float32Array(108 * 3);
  for (let dustIndex = 0; dustIndex < 108; dustIndex += 1) {
    const angle = dustIndex * 2.399963 + (dustIndex % 7) * 0.08;
    const radius = 1.05 + ((dustIndex * 37) % 100) / 100 * 4.25;
    orbitDustPositions[dustIndex * 3] = Math.cos(angle) * radius;
    orbitDustPositions[dustIndex * 3 + 1] = -0.12 + ((dustIndex * 19) % 31) / 31 * 0.34;
    orbitDustPositions[dustIndex * 3 + 2] = Math.sin(angle) * radius;
  }
  const orbitDustGeometry = new THREE.BufferGeometry();
  orbitDustGeometry.setAttribute('position', new THREE.BufferAttribute(orbitDustPositions, 3));
  const orbitDust = new THREE.Points(
    orbitDustGeometry,
    new THREE.PointsMaterial({
      color: 0xc8f3ff,
      size: 0.032,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  orbitDust.userData.speed = -0.00016;
  orbitDust.userData.rotationAxis = 'y';
  ringRoot.add(orbitDust);

  for (let rayIndex = 0; rayIndex < 3; rayIndex += 1) {
    const rayRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.52 + rayIndex * 0.12, 0.011 - rayIndex * 0.002, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xffdb72, transparent: true, opacity: 0.52 - rayIndex * 0.12 }),
    );
    rayRing.rotation.x = Math.PI / 2;
    rayRing.userData.speed = (rayIndex % 2 ? -1 : 1) * (0.0012 + rayIndex * 0.0004);
    ringRoot.add(rayRing);
  }

  for (let index = 0; index < 8; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9 + index * 0.62, 0.004, 8, 180),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xf8c766 : 0x68dcff,
        transparent: true,
        opacity: index % 2 ? 0.18 : 0.12,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.userData.speed = (index % 2 ? -1 : 1) * (0.00038 + index * 0.00008);
    ringRoot.add(ring);
  }

  for (let armIndex = 0; armIndex < ISLAND_RUN_ORBIT_ARM_COUNT; armIndex += 1) {
    const armNodes = nodes
      .filter((node) => node.armIndex === armIndex)
      .sort((left, right) => left.armStep - right.armStep);
    const firstNode = armNodes[0];
    if (!firstNode) continue;
    const category = getCategoryDefinition(firstNode.category);
    const completedOnArm = armNodes.filter((node) => node.status === 'completed').length;
    const completionRatio = completedOnArm / Math.max(1, armNodes.length);
    const progressArcSpan = 0.76;
    const progressArcStart = -2.9
      + armIndex * (Math.PI * 2 / ISLAND_RUN_ORBIT_ARM_COUNT)
      - progressArcSpan / 2;
    addRouteTube(
      hubProgressRoot,
      createOrbitArcPoints(0.84, progressArcStart, progressArcSpan),
      category.color,
      0.026,
      0.4,
    );
    if (completionRatio > 0) {
      const completedArc = progressArcSpan * completionRatio;
      addRouteTube(
        hubProgressRoot,
        createOrbitArcPoints(0.84, progressArcStart, completedArc),
        category.color,
        0.058,
        0.98,
      );
      const capAngle = progressArcStart + completedArc;
      const progressCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 8),
        new THREE.MeshBasicMaterial({
          color: 0xfff2b0,
          transparent: true,
          opacity: 0.96,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      progressCap.position.set(Math.cos(capAngle) * 0.84, 0.22, Math.sin(capAngle) * 0.84);
      progressCap.userData.progressCap = true;
      progressCap.userData.progressPhase = armIndex * 0.9;
      hubProgressRoot.add(progressCap);
    }
    const firstRadius = Math.max(0.001, Math.hypot(firstNode.x, firstNode.z));
    const hubPoint = new THREE.Vector3(
      firstNode.x / firstRadius * 0.58,
      0,
      firstNode.z / firstRadius * 0.58,
    );
    const armPoints = [
      hubPoint,
      ...armNodes.map((node) => new THREE.Vector3(node.x, node.y - 0.012, node.z)),
    ];
    const armRouteRoot = new THREE.Group();
    armRouteRoot.userData.armIndex = armIndex;
    routeRoot.add(armRouteRoot);
    addRouteTube(armRouteRoot, armPoints, 0x031b2c, 0.092, 0.54);
    addRouteTube(armRouteRoot, armPoints, category.color, 0.06, 0.74);
    addRouteTube(armRouteRoot, armPoints, category.color, 0.032, 1);
    addRoutePulses(routePulseRoot, armPoints, category.color, armIndex);

    const activeNodes = armNodes.filter(
      (node) => node.status === 'completed' || node.status === 'visited' || node.status === 'current',
    );
    if (activeNodes.length === 0) continue;
    const activePoints = [
      hubPoint,
      ...activeNodes.map((node) => new THREE.Vector3(node.x, node.y, node.z)),
    ];
    addRouteTube(armRouteRoot, activePoints, category.color, 0.105, 0.86);
    addRouteTube(armRouteRoot, activePoints, 0xfff1b0, 0.034, 1);
  }

  hubProgressRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshBasicMaterial)) return;
    child.material.depthTest = false;
    child.renderOrder = 8;
  });

  const pickMeshes: THREE.Object3D[] = [];
  const nodeGroups = new Map<number, THREE.Group>();
  const statusMarkerTextures = new Map<string, THREE.CanvasTexture>();
  const artworkTextureCache = new Map<string, THREE.Texture>();
  nodes.forEach((node) => {
    const category = getCategoryDefinition(node.category);
    const waypoint = (node.armStep + 1) % WAYSTATION_INTERVAL === 0;
    const radius = node.status === 'current' ? 0.25 : node.milestone ? 0.22 : waypoint ? 0.155 : 0.102;
    const placeholderBiome = getPlaceholderBiomeForIsland(node.index, node.category);
    const authoredVisual = islandVisuals.get(node.index) ?? createAuthoredOrbitVisual(node.index);
    const overviewArtworkVisible = Boolean(authoredVisual) || node.status === 'current' || node.milestone || waypoint;
    const visual = overviewArtworkVisible
      ? authoredVisual
        ?? (node.milestone || node.status === 'current'
          ? createCategoryLandmarkVisual(node.index, placeholderBiome)
          : createCategoryWaystationVisual(node.index, placeholderBiome))
      : undefined;
    const markerTextureKey = `${node.category}:${node.status}`;
    let markerTexture = statusMarkerTextures.get(markerTextureKey);
    if (!markerTexture) {
      markerTexture = createStatusMarkerTexture(node.status, category.accentColor);
      statusMarkerTextures.set(markerTextureKey, markerTexture);
    }
    const group = createTerrainIsland({
      node,
      category,
      radius,
      status: node.status,
      visual,
      markerTexture,
      textureCache: artworkTextureCache,
    });
    nodeRoot.add(group);
    nodeGroups.set(node.index, group);
    group.traverse((child) => {
      if ((child instanceof THREE.Mesh || child instanceof THREE.Sprite) && typeof child.userData.index === 'number') {
        pickMeshes.push(child);
      }
    });
  });

  const journeyRoot = new THREE.Group();
  orbitRoot.add(journeyRoot);
  let journeyCurve: THREE.CatmullRomCurve3 | null = null;
  let journeyTrailGeometry: THREE.TubeGeometry | null = null;
  let journeyTrailMaterial: THREE.MeshBasicMaterial | null = null;
  let journeyMarker: THREE.Group | null = null;
  let journeyCometTail: THREE.Group | null = null;
  let journeySeal: THREE.Group | null = null;
  let journeyArrival: THREE.Group | null = null;
  let journeyFromNode: OrbitCompassNode | undefined;
  let journeyToNode: OrbitCompassNode | undefined;

  if (journey) {
    journeyFromNode = nodes.find((node) => node.index === journey.fromIslandNumber);
    journeyToNode = nodes.find((node) => node.index === journey.toIslandNumber);
    if (journeyFromNode && journeyToNode) {
      journeyCurve = createJourneyCurve(journeyFromNode, journeyToNode);
      journeyTrailGeometry = new THREE.TubeGeometry(journeyCurve, 96, 0.048, 8, false);
      journeyTrailGeometry.setDrawRange(0, 0);
      journeyTrailMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd96f,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      journeyRoot.add(new THREE.Mesh(journeyTrailGeometry, journeyTrailMaterial));

      journeyMarker = new THREE.Group();
      const journeyGlowTexture = createSunCoronaTexture();
      const markerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: journeyGlowTexture,
        color: 0x9feaff,
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      markerGlow.scale.set(1.02, 1.02, 1);
      journeyMarker.add(markerGlow);
      journeyMarker.add(new THREE.Mesh(
        new THREE.OctahedronGeometry(0.115, 0),
        new THREE.MeshBasicMaterial({ color: 0xfff3a5 }),
      ));
      const markerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.17, 0.018, 8, 28),
        new THREE.MeshBasicMaterial({
          color: 0x68dcff,
          transparent: true,
          opacity: 0.94,
          blending: THREE.AdditiveBlending,
        }),
      );
      markerRing.rotation.x = Math.PI / 2;
      journeyMarker.add(markerRing);
      journeyMarker.visible = false;
      journeyRoot.add(journeyMarker);

      journeyCometTail = new THREE.Group();
      for (let tailIndex = 0; tailIndex < 9; tailIndex += 1) {
        const tail = new THREE.Sprite(new THREE.SpriteMaterial({
          map: journeyGlowTexture,
          color: tailIndex % 3 === 0 ? 0xffdf78 : 0x68dcff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }));
        tail.userData.tailIndex = tailIndex;
        tail.scale.setScalar(0.38 - tailIndex * 0.026);
        journeyCometTail.add(tail);
      }
      journeyCometTail.visible = false;
      journeyRoot.add(journeyCometTail);

      journeySeal = new THREE.Group();
      journeySeal.position.copy(journeyCurve.getPoint(0));
      for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.22 + ringIndex * 0.1, 0.018, 8, 40),
          new THREE.MeshBasicMaterial({
            color: ringIndex % 2 ? 0x68dcff : 0xffd96f,
            transparent: true,
            opacity: 0.82 - ringIndex * 0.16,
            blending: THREE.AdditiveBlending,
          }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.userData.ringIndex = ringIndex;
        journeySeal.add(ring);
      }
      journeyRoot.add(journeySeal);

      journeyArrival = new THREE.Group();
      journeyArrival.position.copy(journeyCurve.getPoint(1));
      const destinationCategory = getCategoryDefinition(journeyToNode.category);
      for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.26 + ringIndex * 0.16, 0.024 - ringIndex * 0.004, 8, 48),
          new THREE.MeshBasicMaterial({
            color: ringIndex === 1 ? destinationCategory.color : 0xffdf78,
            transparent: true,
            opacity: 0.9 - ringIndex * 0.18,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.userData.ringIndex = ringIndex;
        journeyArrival.add(ring);
      }
      const sparkGeometry = new THREE.SphereGeometry(0.035, 7, 5);
      for (let sparkIndex = 0; sparkIndex < 24; sparkIndex += 1) {
        const spark = new THREE.Mesh(
          sparkGeometry,
          new THREE.MeshBasicMaterial({
            color: sparkIndex % 3 === 0 ? destinationCategory.color : 0xffe28a,
            transparent: true,
            opacity: 0.94,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        spark.userData.sparkAngle = sparkIndex * (Math.PI * 2 / 24);
        spark.userData.sparkLift = 0.12 + (sparkIndex % 5) * 0.045;
        spark.userData.sparkReach = 0.52 + (sparkIndex % 4) * 0.13;
        spark.userData.journeySpark = true;
        journeyArrival.add(spark);
      }
      const arrivalBeacon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: journeyGlowTexture,
        color: destinationCategory.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      arrivalBeacon.userData.journeyBeacon = true;
      arrivalBeacon.position.y = 0.08;
      journeyArrival.add(arrivalBeacon);
      const arrivalBeam = new THREE.Sprite(new THREE.SpriteMaterial({
        map: journeyGlowTexture,
        color: destinationCategory.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      arrivalBeam.userData.journeyBeam = true;
      arrivalBeam.position.y = 0.42;
      arrivalBeam.scale.set(0.38, 2.2, 1);
      journeyArrival.add(arrivalBeam);
      journeyArrival.visible = false;
      journeyRoot.add(journeyArrival);
    }
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const labelVector = new THREE.Vector3();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const rect = stage.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }

  function updateLabels() {
    labelRefs.current.forEach((label, islandNumber) => {
      const group = nodeGroups.get(islandNumber);
      if (!group) return;
      labelVector.copy(group.position);
      group.parent?.localToWorld(labelVector);
      labelVector.project(camera);
      const x = (labelVector.x * 0.5 + 0.5) * stage.clientWidth;
      const artworkOffset = group.userData.hasArtwork
        ? islandNumber === selectedIslandRef.current ? 26 : 14
        : 0;
      const y = (-labelVector.y * 0.5 + 0.5) * stage.clientHeight + artworkOffset;
      const visible = labelVector.z > -1 && labelVector.z < 1 && x > -24 && x < stage.clientWidth + 24 && y > 70 && y < stage.clientHeight - 190;
      label.style.setProperty('--label-x', `${x.toFixed(1)}px`);
      label.style.setProperty('--label-y', `${y.toFixed(1)}px`);
      label.style.opacity = visible ? (islandNumber === selectedIslandRef.current ? '1' : '0.82') : '0';
    });
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();

  let pointerDownX = 0;
  let pointerDownY = 0;
  let moved = false;
  let dragging = false;
  const initialFocusNode = journeyFromNode
    ?? nodes.find((node) => node.index === selectedIslandRef.current)
    ?? nodes[0];
  let targetYaw = initialFocusNode ? getOrbitFocusYaw(initialFocusNode) : 1.72;
  let idleCenterYaw = targetYaw;
  let targetPitch = -0.06;
  orbitRoot.rotation.y = targetYaw;
  let focusedIsland = selectedIslandRef.current;
  let focusHoldUntil = performance.now() + 6000;
  let journeyStartedAt: number | null = null;
  const journeyFromYaw = journeyFromNode ? getOrbitFocusYaw(journeyFromNode) : targetYaw;
  const journeyToYaw = journeyToNode ? getOrbitFocusYaw(journeyToNode) : journeyFromYaw;
  const journeyYawDelta = Math.atan2(
    Math.sin(journeyToYaw - journeyFromYaw),
    Math.cos(journeyToYaw - journeyFromYaw),
  );

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = false;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    focusHoldUntil = performance.now() + 2400;
    canvas.setPointerCapture(event.pointerId);
    stage.classList.add('island-run-orbit-compass__stage--dragging');
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - pointerDownX;
    const dy = event.clientY - pointerDownY;
    if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    targetYaw += dx * 0.006;
    targetPitch = Math.max(-0.35, Math.min(0.08, targetPitch + dy * 0.004));
  });

  canvas.addEventListener('pointerup', (event) => {
    dragging = false;
    stage.classList.remove('island-run-orbit-compass__stage--dragging');
    canvas.releasePointerCapture(event.pointerId);
    if (moved) {
      idleCenterYaw = targetYaw;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickMeshes, false)[0];
    const islandNumber = hit?.object.userData.index;
    if (typeof islandNumber === 'number') onSelectIsland(islandNumber);
  });

  function animate(time: number) {
    let journeyProgress = 0;
    let journeyTravelProgress = 0;
    let journeyArrivalProgress = 0;
    if (journey && journeyCurve && journeyTrailGeometry && journeyMarker && journeyCometTail && journeySeal && journeyArrival) {
      if (journeyStartedAt === null) journeyStartedAt = time;
      const duration = prefersReducedMotion ? 900 : JOURNEY_DURATION_MS;
      journeyProgress = Math.min(1, Math.max(0, (time - journeyStartedAt) / duration));
      const travelLinear = Math.min(1, Math.max(0, (journeyProgress - 0.14) / 0.54));
      journeyTravelProgress = travelLinear < 0.5
        ? 4 * travelLinear * travelLinear * travelLinear
        : 1 - Math.pow(-2 * travelLinear + 2, 3) / 2;
      journeyArrivalProgress = Math.min(1, Math.max(0, (journeyProgress - 0.66) / 0.24));

      const trailIndexCount = journeyTrailGeometry.index?.count ?? 0;
      const visibleTrailIndexCount = Math.floor(trailIndexCount * journeyTravelProgress / 3) * 3;
      journeyTrailGeometry.setDrawRange(
        0,
        prefersReducedMotion
          ? trailIndexCount
          : Math.max(0, visibleTrailIndexCount),
      );

      targetYaw = journeyFromYaw + journeyYawDelta * journeyTravelProgress;
      targetPitch = -0.12 + Math.sin(journeyTravelProgress * Math.PI) * 0.06;
      journeyTrailMaterial!.opacity = journeyProgress < 0.14
        ? 0
        : journeyProgress < 0.72
          ? 0.68 + Math.sin(time * 0.009) * 0.18
          : Math.max(0.14, 0.76 - (journeyProgress - 0.72) * 1.2);

      const sealing = Math.min(1, journeyProgress / 0.16);
      journeySeal.scale.setScalar(0.7 + sealing * 0.68);
      journeySeal.rotation.y += prefersReducedMotion ? 0 : 0.035;
      journeySeal.children.forEach((child, ringIndex) => {
        child.rotation.z += prefersReducedMotion ? 0 : (ringIndex % 2 ? -0.028 : 0.036);
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = Math.max(0, (0.82 - ringIndex * 0.16) * (1 - Math.max(0, journeyProgress - 0.11) / 0.18));
        }
      });

      journeyMarker.visible = journeyProgress >= 0.12 && journeyProgress <= 0.74;
      journeyMarker.position.copy(journeyCurve.getPoint(journeyTravelProgress));
      journeyMarker.position.y += Math.sin(time * 0.012) * 0.045;
      journeyMarker.scale.setScalar(0.86 + Math.sin(time * 0.01) * 0.13);
      journeyMarker.rotation.y += prefersReducedMotion ? 0 : 0.05;

      journeyCometTail.visible = journeyMarker.visible && !prefersReducedMotion;
      journeyCometTail.children.forEach((child) => {
        const tailIndex = Number(child.userData.tailIndex ?? 0);
        const tailProgress = journeyTravelProgress - (tailIndex + 1) * 0.018;
        child.visible = tailProgress > 0 && journeyTravelProgress < 1;
        if (!child.visible) return;
        child.position.copy(journeyCurve!.getPoint(Math.max(0, tailProgress)));
        child.position.y += Math.sin(time * 0.012 - tailIndex * 0.48) * 0.028;
        if (child instanceof THREE.Sprite && child.material instanceof THREE.SpriteMaterial) {
          child.material.opacity = Math.max(0.08, 0.62 - tailIndex * 0.062);
        }
      });

      journeyArrival.visible = journeyProgress >= 0.64;
      const arrivalEase = 1 - Math.pow(1 - journeyArrivalProgress, 3);
      journeyArrival.children.forEach((child, childIndex) => {
        if (childIndex < 3) {
          const ringIndex = Number(child.userData.ringIndex ?? childIndex);
          const ringScale = 0.4 + arrivalEase * (1.25 + ringIndex * 0.42);
          child.scale.setScalar(ringScale);
          child.rotation.z += prefersReducedMotion ? 0 : (ringIndex % 2 ? -0.035 : 0.046);
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = Math.max(0, (0.9 - ringIndex * 0.18) * (1 - journeyArrivalProgress * 0.72));
          }
          return;
        }
        if (child.userData.journeyBeacon && child instanceof THREE.Sprite && child.material instanceof THREE.SpriteMaterial) {
          child.scale.setScalar(0.45 + arrivalEase * 2.2);
          child.material.opacity = Math.sin(Math.min(1, journeyArrivalProgress) * Math.PI) * 0.62;
          return;
        }
        if (child.userData.journeyBeam && child instanceof THREE.Sprite && child.material instanceof THREE.SpriteMaterial) {
          const beamPulse = Math.sin(Math.min(1, journeyArrivalProgress) * Math.PI);
          child.scale.set(0.34 + arrivalEase * 0.28, 1.2 + arrivalEase * 2.6, 1);
          child.position.y = 0.3 + arrivalEase * 0.48;
          child.material.opacity = beamPulse * 0.54;
          return;
        }
        if (child.userData.journeySpark) {
          const angle = Number(child.userData.sparkAngle ?? 0);
          const reach = Number(child.userData.sparkReach ?? 0.6) * arrivalEase;
          child.position.set(
            Math.cos(angle) * reach,
            Number(child.userData.sparkLift ?? 0.2) * Math.sin(arrivalEase * Math.PI),
            Math.sin(angle) * reach,
          );
          const sparkScale = Math.max(0.05, Math.sin(journeyArrivalProgress * Math.PI));
          child.scale.setScalar(sparkScale);
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = Math.max(0, 1 - journeyArrivalProgress * 0.84);
          }
        }
      });
    } else if (selectedIslandRef.current !== focusedIsland) {
      focusedIsland = selectedIslandRef.current;
      const focusNode = nodes.find((node) => node.index === focusedIsland);
      if (focusNode) {
        const rawFocusYaw = getOrbitFocusYaw(focusNode);
        targetYaw = rawFocusYaw + Math.round((orbitRoot.rotation.y - rawFocusYaw) / (Math.PI * 2)) * Math.PI * 2;
        idleCenterYaw = targetYaw;
        focusHoldUntil = time + 6000;
      }
    }
    if (!journey && !prefersReducedMotion && time > focusHoldUntil) {
      const idleElapsed = time - focusHoldUntil;
      targetYaw = idleCenterYaw
        + Math.sin(idleElapsed * 0.00025) * 0.22
        + Math.sin(idleElapsed * 0.00067) * 0.04;
    }
    orbitRoot.rotation.y += (targetYaw - orbitRoot.rotation.y) * 0.035;
    orbitRoot.rotation.x += (targetPitch - orbitRoot.rotation.x) * 0.05;
    sunGlow.scale.setScalar(prefersReducedMotion ? 1 : 1 + Math.sin(time * 0.003) * 0.04);
    hubProgressRoot.children.forEach((child) => {
      if (!child.userData.progressCap) return;
      const pulse = prefersReducedMotion
        ? 1
        : 1 + Math.sin(time * 0.005 + Number(child.userData.progressPhase ?? 0)) * 0.28;
      child.scale.setScalar(pulse);
    });
    orbitRoot.children.forEach((child) => {
      if (!child.userData.hubRim || prefersReducedMotion) return;
      child.rotation.z += Number(child.userData.rimDirection ?? 1) * 0.002;
    });
    if (!prefersReducedMotion) {
      ringRoot.children.forEach((ring) => {
        if (ring.userData.rotationAxis === 'y') {
          ring.rotation.y += Number(ring.userData.speed ?? 0);
        } else {
          ring.rotation.z += Number(ring.userData.speed ?? 0);
        }
      });
      routePulseRoot.children.forEach((pulse) => {
        if (!pulse.userData.routePulse) return;
        const curve = pulse.userData.routeCurve as THREE.CatmullRomCurve3;
        const progress = (time * Number(pulse.userData.routeSpeed) + Number(pulse.userData.routeOffset)) % 1;
        pulse.position.copy(curve.getPoint(progress));
        pulse.position.y += 0.055;
        pulse.scale.setScalar(0.78 + Math.sin(time * 0.008 + progress * Math.PI * 2) * 0.22);
      });
    }
    const selectedArmIndex = nodes[selectedIslandRef.current - 1]?.armIndex ?? 0;
    routeRoot.children.forEach((armRoute) => {
      const emphasis = armRoute.userData.armIndex === selectedArmIndex ? 1 : 0.62;
      armRoute.children.forEach((route) => {
        if (!(route instanceof THREE.Mesh) || !(route.material instanceof THREE.MeshBasicMaterial)) return;
        const baseOpacity = Number(route.material.userData.baseOpacity ?? route.material.opacity);
        const targetOpacity = baseOpacity * emphasis;
        route.material.opacity += (targetOpacity - route.material.opacity) * 0.08;
      });
    });
    nodeRoot.children.forEach((group, index) => {
      const source = nodes[index];
      if (!source) return;
      const selected = source.index === selectedIslandRef.current;
      const current = source.status === 'current';
      let scale = selected
        ? source.milestone || current ? 1.44 : 2.8
        : current ? 1.26 : 1;
      if (journey && source.index === journey?.fromIslandNumber && journeyProgress < 0.28) {
        scale = 1.12 + Math.sin(Math.min(1, journeyProgress / 0.22) * Math.PI) * 0.48;
      } else if (journey && source.index === journey?.toIslandNumber && journeyProgress >= 0.62) {
        scale = 1.18 + journeyArrivalProgress * 0.58 + Math.sin(time * 0.014) * 0.08;
      }
      const radialScale = journey ? 1 : selected && !current ? 0.64 : 1;
      group.scale.setScalar(group.scale.x + (scale - group.scale.x) * 0.08);
      group.position.x += (source.x * radialScale - group.position.x) * 0.08;
      group.position.z += (source.z * radialScale - group.position.z) * 0.08;
      group.position.y = prefersReducedMotion
        ? source.y
        : source.y + Math.sin(time * 0.0016 + index * 0.38) * (current ? 0.06 : 0.018);
      group.children.forEach((child) => {
        if (child.userData.halo) {
          if (!prefersReducedMotion) {
            child.rotation.z += (current || selected ? 0.023 : 0.009) * Number(child.userData.haloDirection ?? 1);
          }
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            const baseOpacity = Number(child.userData.baseOpacity ?? 0.5);
            child.material.opacity = prefersReducedMotion
              ? baseOpacity
              : baseOpacity * (0.86 + Math.sin(time * 0.004 + index * 0.31) * 0.14);
          }
        } else if (!prefersReducedMotion && !child.userData.isIslandArtwork && !child.userData.isStatusMarker) {
          child.rotation.y += 0.01 + (index % 3) * 0.002;
        }
      });
    });
    renderer.render(scene, camera);
    updateLabels();
    runtime.frameId = window.requestAnimationFrame(animate);
  }

  const runtime: OrbitCompassRuntime = {
    renderer,
    scene,
    camera,
    orbitRoot,
    ringRoot,
    routeRoot,
    nodeRoot,
    pickMeshes,
    nodeGroups,
    sunGlow,
    raycaster,
    pointer,
    frameId: window.requestAnimationFrame(animate),
    resizeObserver,
    dispose: () => {
      window.cancelAnimationFrame(runtime.frameId);
      resizeObserver.disconnect();
      disposeObject(scene);
      renderer.dispose();
    },
  };
  return runtime;
}

export function IslandRunSolarMapOverlay({
  currentIslandNumber,
  currentIslandCompletedStopCount = 0,
  maxIslandCount = DEFAULT_MAX_ISLAND_COUNT,
  completedIslandNumbers,
  visitedIslandNumbers,
  onClose,
  journey,
  onJourneyComplete,
}: IslandRunSolarMapOverlayProps) {
  const safeMax = normalizeIslandRunOrbitCount(maxIslandCount);
  const currentIsland = clampIslandNumber(currentIslandNumber, safeMax);
  const journeyFromIsland = journey ? clampIslandNumber(journey.fromIslandNumber, safeMax) : null;
  const journeyToIsland = journey ? clampIslandNumber(journey.toIslandNumber, safeMax) : null;
  const [selectedIsland, setSelectedIsland] = useState(journeyFromIsland ?? currentIsland);
  const [view, setView] = useState<OrbitCompassView>(() => journey ? 'overview' : 'branch');
  const [journeyPhase, setJourneyPhase] = useState<OrbitCompassJourneyPhase>('seal');
  const [indexArm, setIndexArm] = useState(() => getArmIndexForIsland(currentIsland));
  const [indexReturnView, setIndexReturnView] = useState<'overview' | 'branch'>('branch');
  const [islandQuery, setIslandQuery] = useState('');
  const [islandVisuals, setIslandVisuals] = useState<Map<number, OrbitCompassIslandVisual>>(() => new Map());
  const [islandVisualsReady, setIslandVisualsReady] = useState(() => !journey);
  const visualSelectionTarget = journey ? currentIsland : selectedIsland;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const selectedIslandRef = useRef(selectedIsland);
  const labelRefs = useRef(new Map<number, HTMLSpanElement>());
  const requestedIslandVisualsRef = useRef(new Set<number>());
  const onJourneyCompleteRef = useRef(onJourneyComplete);
  const journeyCompletionSentRef = useRef(false);
  const previousJourneyRef = useRef(Boolean(journey));

  const handleSelectIsland = useCallback((islandNumber: number) => {
    if (selectedIslandRef.current === islandNumber) return;
    selectedIslandRef.current = islandNumber;
    setSelectedIsland(islandNumber);
    playIslandRunSound('token_move');
    triggerIslandRunHaptic('stop_land');
  }, []);

  const handleViewChange = useCallback((nextView: OrbitCompassView) => {
    if (nextView === 'branch') {
      playIslandRunSound('island_travel');
      triggerIslandRunHaptic('island_travel');
    } else if (nextView === 'archive') {
      playIslandRunSound('shop_open');
      triggerIslandRunHaptic('stop_land');
    } else if (nextView === 'index') {
      playIslandRunSound('minigame_open');
    } else {
      playIslandRunSound('token_move');
    }
    setView(nextView);
  }, []);

  const handleOpenIndex = useCallback((returnView: 'overview' | 'branch') => {
    setIndexReturnView(returnView);
    setIslandQuery('');
    handleViewChange('index');
  }, [handleViewChange]);

  const nodes = useMemo(
    () => createIslandRunOrbitNodes(currentIsland, safeMax, completedIslandNumbers, visitedIslandNumbers),
    [completedIslandNumbers, currentIsland, safeMax, visitedIslandNumbers],
  );
  const resolveJourneyVisual = (islandNumber: number | null): OrbitCompassIslandVisual | null => {
    if (!islandNumber) return null;
    const node = nodes[islandNumber - 1];
    const category = getCategoryDefinition(node?.category ?? 'life');
    return islandVisuals.get(islandNumber)
      ?? createAuthoredOrbitVisual(islandNumber)
      ?? (node?.milestone
        ? createCategoryLandmarkVisual(
          islandNumber,
          getPlaceholderBiomeForIsland(islandNumber, category.id),
        )
        : createCategoryWaystationVisual(
          islandNumber,
          getPlaceholderBiomeForIsland(islandNumber, category.id),
        ));
  };
  const journeyFromVisual = resolveJourneyVisual(journeyFromIsland);
  const journeyToVisual = resolveJourneyVisual(journeyToIsland);
  const currentNode = nodes[currentIsland - 1] ?? nodes[0];
  const currentCategory = getCategoryDefinition(currentNode?.category ?? 'life');
  const currentVisual = islandVisuals.get(currentIsland)
    ?? createAuthoredOrbitVisual(currentIsland)
    ?? createCategoryLandmarkVisual(
      currentIsland,
      getPlaceholderBiomeForIsland(currentIsland, currentCategory.id),
    );
  const selectedNode = nodes.find((node) => node.index === selectedIsland) ?? nodes[currentIsland - 1] ?? nodes[0];
  const selectedCategory = getCategoryDefinition(selectedNode?.category ?? 'life');
  const selectedVisualIslandNumber = selectedNode?.index ?? currentIsland;
  const selectedVisual = islandVisuals.get(selectedVisualIslandNumber)
    ?? createAuthoredOrbitVisual(selectedVisualIslandNumber)
    ?? createCategoryLandmarkVisual(
      selectedVisualIslandNumber,
      getPlaceholderBiomeForIsland(selectedVisualIslandNumber, selectedCategory.id),
    );
  const selectedName = getIslandDisplayName(selectedNode?.index ?? currentIsland);
  const selectedCompletedStopCount = selectedNode.status === 'completed'
    ? 5
    : selectedNode.status === 'current'
      ? Math.min(5, Math.max(0, Math.floor(currentIslandCompletedStopCount)))
      : 0;
  const focusEntries = useMemo(
    () => resolveIslandRunOrbitFocusEntries(selectedIsland, safeMax),
    [safeMax, selectedIsland],
  );
  const armSummaries = ORBIT_COMPASS_CATEGORIES.map((category, armIndex) => {
    const armNodes = nodes.filter((node) => node.armIndex === armIndex);
    return {
      ...category,
      armIndex,
      completedCount: armNodes.filter((node) => node.status === 'completed').length,
      totalCount: armNodes.length,
    };
  });
  const normalizedIslandQuery = islandQuery.trim().toLowerCase();
  const numericIslandQuery = /^\d+$/.test(normalizedIslandQuery)
    ? Number(normalizedIslandQuery)
    : null;
  const indexedNodes = nodes.filter((node) => {
    if (!normalizedIslandQuery) return node.armIndex === indexArm;
    if (numericIslandQuery !== null) return node.index === numericIslandQuery;
    return getIslandDisplayName(node.index).toLowerCase().includes(normalizedIslandQuery);
  });
  const completedCount = nodes.filter((node) => node.status === 'completed').length;
  const completedPercent = safeMax > 0 ? (completedCount / safeMax) * 100 : 0;

  useEffect(() => lockPageScroll(), []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, []);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, [view]);

  useEffect(() => {
    if (!journey) playIslandRunSound('shop_open');
  }, [journey]);

  useEffect(() => {
    selectedIslandRef.current = selectedIsland;
  }, [selectedIsland]);

  useEffect(() => {
    onJourneyCompleteRef.current = onJourneyComplete;
  }, [onJourneyComplete]);

  useEffect(() => {
    setSelectedIsland((islandNumber) => clampIslandNumber(islandNumber, safeMax));
  }, [safeMax]);

  useEffect(() => {
    const wasJourney = previousJourneyRef.current;
    previousJourneyRef.current = Boolean(journey);
    if (journey) {
      setView('overview');
      return;
    }
    if (wasJourney) {
      setSelectedIsland(currentIsland);
      setIndexArm(getArmIndexForIsland(currentIsland));
      setView('branch');
    }
  }, [currentIsland, journey]);

  useEffect(() => {
    let cancelled = false;
    const settledTargets = new Set<number>();
    const earlyIslandCount = journey ? 0 : Math.min(EARLY_ISLAND_VISUAL_COUNT, safeMax);
    const focusVisualTargets = resolveIslandRunOrbitFocusEntries(visualSelectionTarget, safeMax)
      .filter((entry): entry is number => typeof entry === 'number');
    const milestoneVisualTargets = nodes.filter((node) => node.milestone).map((node) => node.index);
    const targets = new Set<number>([
      ...Array.from({ length: earlyIslandCount }, (_, index) => index + 1),
      ...milestoneVisualTargets,
      ...focusVisualTargets,
      currentIsland,
      visualSelectionTarget,
      ...(journeyFromIsland ? [journeyFromIsland] : []),
      ...(journeyToIsland ? [journeyToIsland] : []),
    ]);
    const unloadedTargets = [...targets].filter((islandNumber) => {
      if (requestedIslandVisualsRef.current.has(islandNumber)) return false;
      requestedIslandVisualsRef.current.add(islandNumber);
      return true;
    });
    if (unloadedTargets.length === 0) {
      setIslandVisualsReady(true);
      return undefined;
    }
    if (journey) setIslandVisualsReady(false);

    const loadVisual = async (islandNumber: number): Promise<OrbitCompassIslandVisual | null> => {
      const manifest = await loadIslandArtManifest(islandNumber);
      const scene = manifest?.scene;
      const thumbnailSrc = [scene?.boardOuterCircle, scene?.boardPlate,
        manifest?.assetCameraMode === 'final-angle' ? scene?.boardCircle : null]
        .find(src => src && !src.includes('/placeholder'));
      return thumbnailSrc
        ? {
          islandNumber,
          thumbnailSrc,
          backgroundSrc: manifest?.scene?.ambientBackground,
        }
        : createAuthoredOrbitVisual(islandNumber) ?? null;
    };
    void Promise.allSettled(unloadedTargets.map(loadVisual)).then(async (results) => {
      unloadedTargets.forEach((islandNumber) => settledTargets.add(islandNumber));
      if (cancelled) return;
      const loadedVisuals = results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
      if (journey) {
        // Only the two travel images gate the cutscene, with a bounded offline fallback.
        await Promise.all(loadedVisuals.filter(visual => visual.islandNumber === journeyFromIsland || visual.islandNumber === journeyToIsland).map(visual => new Promise<void>(resolve => {
          const image = new Image();
          const timeout = window.setTimeout(resolve, 1200);
          image.onload = image.onerror = () => { window.clearTimeout(timeout); resolve(); };
          image.src = visual.thumbnailSrc;
        })));
      }
      if (cancelled) return;
      if (loadedVisuals.length > 0) {
        setIslandVisuals((currentVisuals) => {
          const nextVisuals = new Map(currentVisuals);
          loadedVisuals.forEach((visual) => nextVisuals.set(visual.islandNumber, visual));
          return nextVisuals;
        });
      }
      setIslandVisualsReady(true);
    });

    return () => {
      cancelled = true;
      unloadedTargets
        .filter((islandNumber) => !settledTargets.has(islandNumber))
        .forEach((islandNumber) => requestedIslandVisualsRef.current.delete(islandNumber));
    };
  }, [currentIsland, journey, journeyFromIsland, journeyToIsland, nodes, safeMax, visualSelectionTarget]);

  const finishJourney = useCallback(() => {
    if (journeyCompletionSentRef.current) return;
    journeyCompletionSentRef.current = true;
    onJourneyCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (!journey || !journeyFromIsland || !journeyToIsland || !islandVisualsReady) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    journeyCompletionSentRef.current = false;
    setView('overview');
    setJourneyPhase('seal');
    setSelectedIsland(journeyFromIsland);
    playIslandRunSound('island_travel');
    triggerIslandRunHaptic('island_travel');

    const phaseTimes = reducedMotion
      ? { travel: 80, arrive: 220, celebrate: 340, complete: 520 }
      : { travel: 260, arrive: 1450, celebrate: 1800, complete: JOURNEY_DURATION_MS + 150 };
    const timers = [
      window.setTimeout(() => setJourneyPhase('travel'), phaseTimes.travel),
      window.setTimeout(() => {
        setSelectedIsland(journeyToIsland);
        setJourneyPhase('arrive');
        playIslandRunSound('stop_land');
        triggerIslandRunHaptic('stop_land');
      }, phaseTimes.arrive),
      window.setTimeout(() => setJourneyPhase('celebrate'), phaseTimes.celebrate),
      window.setTimeout(finishJourney, phaseTimes.complete),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [finishJourney, islandVisualsReady, journey, journeyFromIsland, journeyToIsland]);

  useEffect(() => {
    if (journey) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [journey, onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || nodes.length === 0 || !islandVisualsReady) return undefined;
    const runtime = createOrbitCompassScene({
      canvas,
      stage,
      nodes,
      islandVisuals,
      selectedIslandRef,
      labelRefs,
      onSelectIsland: handleSelectIsland,
      journey,
    });
    return runtime.dispose;
  }, [handleSelectIsland, islandVisuals, islandVisualsReady, journey, nodes, view]);

  const setLabelRef = useCallback((islandNumber: number, element: HTMLSpanElement | null) => {
    if (element) {
      labelRefs.current.set(islandNumber, element);
    } else {
      labelRefs.current.delete(islandNumber);
    }
  }, []);

  return (
    <div className="island-run-solar-map-overlay island-run-overlay-root" role="presentation">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={`island-run-orbit-compass${journey ? ` island-run-orbit-compass--journey island-run-orbit-compass--journey-${journeyPhase}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="island-run-orbit-compass-title"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]')];
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) {
            event.preventDefault(); first.focus();
          }
        }}
      >
        <div className="island-run-orbit-compass__stars" aria-hidden="true" />
        <div className="island-run-orbit-compass__world" aria-hidden="true" />
        <div className="island-run-orbit-compass__sweep" aria-hidden="true" />
        <header className="island-run-orbit-compass__topbar">
          <div className="island-run-orbit-compass__title">
            <span className="island-run-orbit-compass__compass" aria-hidden="true" />
            <div>
              <span>{journey ? 'Route Awakening' : 'Orbit Compass'}</span>
              <h2 id="island-run-orbit-compass-title">{journey ? 'New Island' : 'Island Run'}</h2>
            </div>
          </div>
          <div
            className="island-run-orbit-compass__progress"
            aria-label={`Island ${currentIsland} of ${safeMax}, ${completedCount} completed`}
          >
            <strong>{currentIsland}</strong>
            <span>/ {safeMax}</span>
            <i><b style={{ width: `${completedPercent}%` }} /></i>
          </div>
          {!journey ? (
            <button
              type="button"
              className="island-run-orbit-compass__close"
              onClick={onClose}
              aria-label="Close orbit compass"
            >
              x
            </button>
          ) : null}
        </header>

        {view === 'overview' ? (
          journey && journeyFromIsland && journeyToIsland ? (
            <>
              <div className="island-run-orbit-compass__journey-scene" aria-hidden="true">
                <span className="island-run-orbit-compass__journey-arc" />
                <div className="island-run-orbit-compass__journey-island island-run-orbit-compass__journey-island--from">
                  {journeyFromVisual ? <img src={journeyFromVisual.thumbnailSrc} alt="" /> : null}
                  <b>{journeyFromIsland}</b>
                </div>
                <div className="island-run-orbit-compass__journey-island island-run-orbit-compass__journey-island--to">
                  <span />
                  {journeyToVisual ? <img src={journeyToVisual.thumbnailSrc} alt="" /> : null}
                  <b>{journeyToIsland}</b>
                </div>
                <i className="island-run-orbit-compass__journey-light"><span /></i>
              </div>
              <div className="island-run-orbit-compass__journey-ui" aria-live="polite">
                <CelebrationFireworks
                  active={journeyPhase === 'arrive' || journeyPhase === 'celebrate'}
                  variant="rapid"
                  fit="contain"
                  className="island-run-orbit-compass__journey-fireworks"
                />
                <div key={journeyPhase} className="island-run-orbit-compass__journey-copy">
                  <span>
                    {journeyPhase === 'seal'
                      ? `Leaving Island ${journeyFromIsland}`
                      : journeyPhase === 'travel'
                        ? `Traveling to Island ${journeyToIsland}`
                        : journeyPhase === 'arrive'
                          ? `Island ${journeyToIsland} awakened`
                          : 'Ready to explore'}
                  </span>
                  <h3>
                    {journeyPhase === 'seal'
                      ? getIslandDisplayName(journeyFromIsland)
                      : getIslandDisplayName(journeyToIsland)}
                  </h3>
                  <div
                    className="island-run-orbit-compass__journey-route"
                    aria-label={`Traveling from Island ${journeyFromIsland} to Island ${journeyToIsland}`}
                  >
                    <b>{journeyFromIsland}</b>
                    <i aria-hidden="true"><span /></i>
                    <b>{journeyToIsland}</b>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <section className="island-run-orbit-compass__atlas" aria-label="Island category atlas">
              <header className="island-run-orbit-compass__atlas-header">
                <button type="button" onClick={() => handleViewChange('branch')} aria-label="Back to nearby islands" title="Nearby islands">&#8592;</button>
                <div>
                  <span>{completedCount} of {safeMax} completed</span>
                  <h3>World Atlas</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenIndex('overview')}
                  aria-label="Open searchable island index"
                  title="Find an island"
                >
                  <span className="island-run-orbit-compass__search-icon" aria-hidden="true" />
                </button>
              </header>

              <div className="island-run-orbit-compass__atlas-worlds" aria-label="Five island categories">
                <span className="island-run-orbit-compass__atlas-orbit" aria-hidden="true" />
                <span className="island-run-orbit-compass__atlas-sun" aria-hidden="true" />
                <svg className="island-run-orbit-compass__atlas-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {armSummaries.map((category) => {
                    const endpoints = [[50, 18], [20, 43], [80, 40], [27, 78], [74, 77]];
                    const [x, y] = endpoints[category.armIndex];
                    return <g key={category.id}>
                      <path d={`M50 52 Q${x < 50 ? x - 10 : x + 10} 56 ${x} ${y}`} fill="none" stroke={category.accentColor} strokeOpacity=".3" strokeWidth=".35" />
                      {Array.from({ length: category.totalCount }, (_, index) => {
                        const t = (index + 1) / (category.totalCount + 1);
                        const controlX = x < 50 ? x - 10 : x + 10;
                        return <circle key={index} cx={(1 - t) ** 2 * 50 + 2 * (1 - t) * t * controlX + t * t * x} cy={(1 - t) ** 2 * 52 + 2 * (1 - t) * t * 56 + t * t * y} r=".38" fill={index < category.completedCount ? category.accentColor : '#83979d'} />;
                      })}
                    </g>;
                  })}
                </svg>
                {armSummaries.map((category) => {
                  const progress = category.totalCount > 0 ? category.completedCount / category.totalCount : 0;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`island-run-orbit-compass__atlas-world island-run-orbit-compass__atlas-world--slot-${category.armIndex} island-run-orbit-compass__atlas-world--${category.id}${category.armIndex === indexArm ? ' is-selected' : ''}${category.armIndex === getArmIndexForIsland(currentIsland) ? ' is-current-route' : ''}`}
                      aria-current={category.armIndex === indexArm ? 'true' : undefined}
                      aria-label={`${category.label}, ${category.completedCount} of ${category.totalCount} islands completed`}
                      onClick={() => {
                        const armNodes = nodes.filter((node) => node.armIndex === category.armIndex);
                        const destination = category.armIndex === getArmIndexForIsland(currentIsland)
                          ? currentIsland
                          : [...armNodes].reverse().find((node) => node.status === 'completed' || node.status === 'visited')?.index
                            ?? armNodes[0]?.index
                            ?? currentIsland;
                        setIndexArm(category.armIndex);
                        handleSelectIsland(destination);
                        handleViewChange('branch');
                      }}
                    >
                      <span
                        className="island-run-orbit-compass__atlas-world-ring"
                        style={{ background: `conic-gradient(${category.accentColor} ${Math.max(2, progress * 100)}%, rgba(255, 255, 255, 0.14) 0)` }}
                        aria-hidden="true"
                      />
                      <img src={ORBIT_CATEGORY_ATLAS_SRC[category.id]} alt="" aria-hidden="true" />
                      <b>{category.label}</b>
                      <small>{category.completedCount}/{category.totalCount} complete</small>
                    </button>
                  );
                })}
              </div>

              <aside
                className={`island-run-orbit-compass__atlas-detail island-run-orbit-compass__atlas-detail--${currentCategory.id}`}
              >
                <img src={currentVisual.thumbnailSrc} alt="" aria-hidden="true" />
                <div>
                  <span className="island-run-orbit-compass__status island-run-orbit-compass__status--current">
                    You are here · Island {currentIsland}
                  </span>
                  <h3>{getIslandDisplayName(currentIsland)}</h3>
                </div>
                <button
                  type="button"
                  aria-label={`Return to current island ${currentIsland}`}
                  title="Current island"
                  onClick={() => { handleSelectIsland(currentIsland); handleViewChange('branch'); }}
                >
                  &#8594;
                </button>
              </aside>
            </section>
          )
        ) : view === 'branch' ? (
          <section className="island-run-orbit-compass__focus" aria-label="Focused island branch">
            <div
              className="island-run-orbit-compass__focus-world"
              style={selectedVisual?.backgroundSrc ? { backgroundImage: `url("${selectedVisual.backgroundSrc}")` } : undefined}
              aria-hidden="true"
            />
            <header className="island-run-orbit-compass__focus-header">
              <button type="button" onClick={() => { setIndexArm(getArmIndexForIsland(selectedIsland)); handleViewChange('overview'); }} aria-label="Open world atlas">
                Atlas
              </button>
              <div>
                <span>{selectedCategory.label}</span>
                <h3>Your journey</h3>
              </div>
              <button type="button" onClick={() => { setIndexArm(getArmIndexForIsland(selectedIsland)); handleOpenIndex('branch'); }} aria-label="Find an island" title="Find an island">
                <span className="island-run-orbit-compass__search-icon" aria-hidden="true" />
              </button>
            </header>

            <div className="island-run-orbit-compass__focus-route" aria-label="Five nearby islands">
              <svg className="island-run-orbit-compass__focus-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M14 86 C13 74 28 73 50 49 S88 28 86 12" fill="none" stroke="rgba(153, 218, 219, .36)" strokeWidth=".55" strokeDasharray="1 1.6" />
              </svg>
              {focusEntries.map((entry, slot) => {
                if (entry === null) {
                  return (
                    <span
                      key={`empty-${slot}`}
                      className={`island-run-orbit-compass__focus-node island-run-orbit-compass__focus-node--slot-${slot} island-run-orbit-compass__focus-node--empty`}
                      aria-hidden="true"
                    />
                  );
                }
                const islandNumber = entry;
                const node = nodes[islandNumber - 1];
                const status = node?.status ?? 'locked';
                const category = getCategoryDefinition(node?.category ?? 'life');
                const placeholderBiome = getPlaceholderBiomeForIsland(islandNumber, category.id);
                const visual = islandVisuals.get(islandNumber)
                  ?? createAuthoredOrbitVisual(islandNumber)
                  ?? (islandNumber === selectedIsland || node?.milestone
                    ? createCategoryLandmarkVisual(islandNumber, placeholderBiome)
                    : createCategoryWaystationVisual(islandNumber, placeholderBiome));
                return (
                  <button
                    key={islandNumber}
                    type="button"
                    className={`island-run-orbit-compass__focus-node island-run-orbit-compass__focus-node--slot-${slot} island-run-orbit-compass__focus-node--${status}${islandNumber === selectedIsland ? ' is-selected' : ''}`}
                    aria-current={status === 'current' ? 'step' : undefined}
                    aria-pressed={islandNumber === selectedIsland}
                    aria-label={`Island ${islandNumber}, ${getIslandDisplayName(islandNumber)}, ${getStatusLabel(status)}`}
                    onClick={() => handleSelectIsland(islandNumber)}
                  >
                    <span
                      className={`island-run-orbit-compass__focus-art island-run-orbit-compass__focus-art--${category.id}${visual ? ' has-art' : ''}`}
                      aria-hidden="true"
                    >
                      {visual ? <img src={visual.thumbnailSrc} alt="" /> : null}
                    </span>
                    <b>{islandNumber}</b>
                    <span className={`island-run-orbit-compass__node-state island-run-orbit-compass__node-state--${status}`} aria-hidden="true">
                      {status === 'completed' ? <>&#10003;</> : status === 'current' ? 'You are here' : status === 'visited' ? 'Visited' : islandNumber === currentIsland + 1 ? 'Next' : <span className="island-run-orbit-compass__lock-icon" />}
                    </span>
                  </button>
                );
              })}
              {selectedIsland !== currentIsland ? <button type="button" className="island-run-orbit-compass__current-shortcut" onClick={() => handleSelectIsland(currentIsland)}>Back to Island {currentIsland}</button> : null}
            </div>

            <aside
              key={`focus-detail-${selectedIsland}`}
              className={`island-run-orbit-compass__focus-detail island-run-orbit-compass__focus-detail--${selectedNode.status} island-run-orbit-compass__focus-detail--${selectedCategory.id}`}
              aria-live="polite"
            >
              <div>
                <span className={`island-run-orbit-compass__status island-run-orbit-compass__status--${selectedNode.status}`}>
                  Island {selectedIsland} · {getStatusLabel(selectedNode.status)}
                </span>
                <h3>{selectedName}</h3>
                <p>{selectedNode.status === 'current' ? `${selectedCompletedStopCount} of 5 objectives complete` : getRouteContextLabel(selectedNode.status)}</p>
              </div>
              <div className="island-run-orbit-compass__focus-checks" aria-label={`${selectedCompletedStopCount} of 5 objectives completed`}>
                {[0, 1, 2, 3, 4].map((slot) => (
                  <span
                    key={slot}
                    className={slot < selectedCompletedStopCount ? 'is-complete' : ''}
                  />
                ))}
              </div>
              <button
                type="button"
                className={`island-run-orbit-compass__focus-action island-run-orbit-compass__focus-action--${selectedNode.status}`}
                onClick={() => {
                  if (selectedNode.status === 'current') {
                    playIslandRunSound('island_travel');
                    triggerIslandRunHaptic('island_travel');
                    onClose();
                    return;
                  }
                  if (selectedNode.status === 'completed' || selectedNode.status === 'visited') {
                    handleViewChange('archive');
                    return;
                  }
                  handleSelectIsland(currentIsland);
                }}
              >
                {selectedNode.status === 'completed' || selectedNode.status === 'visited' ? 'View Island' : getActionLabel(selectedNode.status)} <span aria-hidden="true">&#8594;</span>
              </button>
            </aside>
          </section>
        ) : view === 'archive' ? (
          <section
            className={`island-run-orbit-compass__archive island-run-orbit-compass__archive--${selectedCategory.id}`}
            aria-label={`Visiting ${selectedName}`}
          >
            <div
              className="island-run-orbit-compass__archive-world"
              style={selectedVisual?.backgroundSrc ? { backgroundImage: `url("${selectedVisual.backgroundSrc}")` } : undefined}
              aria-hidden="true"
            />
            <header className="island-run-orbit-compass__archive-header">
              <button type="button" onClick={() => handleViewChange('branch')} aria-label="Return to focused route">
                Route
              </button>
              <div>
                <span>Journey Archive</span>
                <h3>{selectedName}</h3>
              </div>
              <strong>{selectedIsland}</strong>
            </header>

            <div className="island-run-orbit-compass__archive-scene">
              <div className="island-run-orbit-compass__archive-orbits" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="island-run-orbit-compass__archive-island" aria-hidden="true">
                <span />
                <img src={selectedVisual.thumbnailSrc} alt="" />
              </div>
              <div className="island-run-orbit-compass__archive-seal">
                <span className={`island-run-orbit-compass__status island-run-orbit-compass__status--${selectedNode.status}`}>
                  {getStatusLabel(selectedNode.status)}
                </span>
                <strong>{selectedCategory.label} Route</strong>
                <div className="island-run-orbit-compass__archive-checks" aria-label={`${selectedCompletedStopCount} of 5 objectives completed`}>
                  {[0, 1, 2, 3, 4].map((slot) => (
                    <span key={slot} className={slot < selectedCompletedStopCount ? 'is-complete' : ''} />
                  ))}
                </div>
              </div>
            </div>

            <footer className="island-run-orbit-compass__archive-actions">
              <button type="button" onClick={() => handleViewChange('branch')}>
                Back to Route
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelectIsland(currentIsland);
                  handleViewChange('branch');
                }}
              >
                Current Island {currentIsland}
              </button>
            </footer>
          </section>
        ) : (
          <section className="island-run-orbit-compass__index" aria-label="Island route index">
            <header className="island-run-orbit-compass__index-header">
              <button type="button" onClick={() => handleViewChange(indexReturnView)} aria-label="Back from island search" title="Back">
                &#8592;
              </button>
              <div>
                <span>Route Index</span>
                <h3>Find an island</h3>
              </div>
              <button
                type="button"
                className="island-run-orbit-compass__locate"
                onClick={() => {
                  handleSelectIsland(currentIsland);
                  setIndexArm(getArmIndexForIsland(currentIsland));
                  setIslandQuery('');
                  handleViewChange('branch');
                }}
                aria-label={`Locate current island ${currentIsland}`}
                title="Current island"
              />
            </header>

            <div className="island-run-orbit-compass__index-search">
              <span aria-hidden="true" />
              <input
                type="search"
                value={islandQuery}
                onChange={(event) => setIslandQuery(event.target.value)}
                placeholder="Island number or name"
                aria-label="Search islands"
              />
            </div>

            <nav className="island-run-orbit-compass__index-tabs" aria-label="Island routes">
              {armSummaries.map((arm) => (
                <button
                  key={arm.id}
                  type="button"
                  className={`island-run-orbit-compass__index-tab island-run-orbit-compass__index-tab--${arm.id}`}
                  aria-current={!normalizedIslandQuery && arm.armIndex === indexArm ? 'page' : undefined}
                  onClick={() => {
                    playIslandRunSound('token_move');
                    setIndexArm(arm.armIndex);
                    setIslandQuery('');
                  }}
                >
                  <i aria-hidden="true" />
                  <span>{arm.label}<small>{arm.completedCount}/{arm.totalCount}</small></span>
                </button>
              ))}
            </nav>

            <div
              className={`island-run-orbit-compass__index-grid${normalizedIslandQuery ? ' is-searching' : ''}`}
              aria-live="polite"
            >
              {indexedNodes.map((node) => {
                const islandName = getIslandDisplayName(node.index);
                const category = getCategoryDefinition(node.category);
                const featured = node.index <= EARLY_ISLAND_VISUAL_COUNT || node.milestone || node.status === 'current';
                const placeholderBiome = getPlaceholderBiomeForIsland(node.index, category.id);
                const indexVisual = featured
                  ? islandVisuals.get(node.index)
                    ?? createAuthoredOrbitVisual(node.index)
                    ?? createCategoryLandmarkVisual(node.index, placeholderBiome)
                  : undefined;
                return (
                  <button
                    key={node.index}
                    type="button"
                    className={`island-run-orbit-compass__index-island island-run-orbit-compass__index-island--${node.status}${featured ? ' island-run-orbit-compass__index-island--featured' : ''}`}
                    aria-label={`${islandName}, Island ${node.index}, ${getStatusLabel(node.status)}`}
                    onClick={() => {
                      handleSelectIsland(node.index);
                      setIndexArm(node.armIndex);
                      setIslandQuery('');
                      handleViewChange('branch');
                    }}
                  >
                    <strong>{node.index}</strong>
                    <span>{islandName}</span>
                    {indexVisual ? <img src={indexVisual.thumbnailSrc} alt="" aria-hidden="true" /> : null}
                    <i aria-hidden="true" />
                  </button>
                );
              })}
              {indexedNodes.length === 0 ? (
                <p className="island-run-orbit-compass__index-empty">No islands found</p>
              ) : null}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
