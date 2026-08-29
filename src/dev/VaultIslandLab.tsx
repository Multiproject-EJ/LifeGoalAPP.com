import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import {
  createVaultTreasureIslandModel,
  type VaultIslandQuality,
  type VaultTreasureIslandRuntime,
} from '../features/gamification/level-worlds/dev/VaultTreasureIslandModel';
import {
  createVaultTreasurePalaceAtriumModel,
  createVaultTreasureVaultInteriorModel,
} from '../features/gamification/level-worlds/dev/VaultTreasureVaultInteriorModel';
import { installVaultPremiumEnvironment } from '../features/gamification/level-worlds/dev/VaultPremiumLookdev';
import {
  VAULT_ISLAND_LAB_ROUTES,
  VAULT_ISLAND_SOURCE_SHA256,
  VAULT_TREASURE_CADENCE,
  VAULT_TREASURE_DISCOVERY_RULES,
} from '../features/gamification/level-worlds/dev/VaultIslandLabContract';
import {
  getVaultTreasureDefinition,
  VAULT_TREASURE_DEFINITIONS,
  type VaultTreasureId,
} from '../features/gamification/level-worlds/dev/VaultTreasureModels';
import type { VaultIslandCollectionEntry } from '../features/gamification/level-worlds/services/islandRunVaultCollection';
import './VaultIslandLab.css';

const SOURCE_SRC = '/assets/dev/vault-island-lab/treasure-island-source.png';
const FALLBACK_SRC = '/assets/islands/special/vault-island/vault-island-fallback.png';
export type VaultIslandLabView = 'exterior' | 'atrium' | 'vault';

export interface VaultIslandLabProps {
  embedded?: boolean;
  onClose?: () => void;
  unlockedTreasureIds?: readonly VaultTreasureId[];
  collectionEntries?: readonly VaultIslandCollectionEntry[];
  initialView?: VaultIslandLabView;
  featuredTreasureId?: VaultTreasureId;
  featuredSourceIslandNumber?: number;
  holdingsValue?: number;
}

interface VaultIslandLabQaSnapshot {
  view: VaultIslandLabView;
  quality: VaultIslandQuality;
  isReady: boolean;
  palaceReady: boolean;
  requestedYaw: number | null;
  frameCount: number;
  canvasWidth: number;
  canvasHeight: number;
  sampledAtMs: number;
  sampledPixels: number;
  variedPixelPairs: number;
  clickableDisplays: number;
  selectedTreasureId: VaultTreasureId;
  revealRun: number;
  inspectedDisplay: VaultTreasureId | 'none';
  collectionValue: number;
  holdingsValue: number | null;
  wealthTier: string;
  wealthIngotCount: number;
  wealthCoinCount: number;
  wealthGemCount: number;
  lastPointerHit: VaultTreasureId | 'none';
  route: string;
}

function readInitialQuality(): VaultIslandQuality {
  if (typeof window === 'undefined') return 'medium';
  const quality = new URLSearchParams(window.location.search).get('quality');
  return quality === 'low' || quality === 'medium' || quality === 'high' ? quality : 'high';
}

function readInitialView(): VaultIslandLabView {
  if (typeof window === 'undefined') return 'exterior';
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'vault' || params.get('vault') === '1') return 'vault';
  return params.get('view') === 'atrium' ? 'atrium' : 'exterior';
}

function readRequestedYaw() {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('yaw');
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function readCameraPreset() {
  if (typeof window === 'undefined') return 'phone';
  return new URLSearchParams(window.location.search).get('camera') === 'top' ? 'top' : 'phone';
}

export default function VaultIslandLab({
  embedded = false,
  onClose,
  unlockedTreasureIds,
  collectionEntries = [],
  initialView,
  featuredTreasureId,
  featuredSourceIslandNumber,
  holdingsValue,
}: VaultIslandLabProps = {}) {
  const unlockedTreasureKey = unlockedTreasureIds?.join('|') ?? 'all';
  const availableTreasureIds = useMemo(
    () => unlockedTreasureIds === undefined
      ? VAULT_TREASURE_DEFINITIONS.map((treasure) => treasure.id)
      : VAULT_TREASURE_DEFINITIONS
        .filter((treasure) => unlockedTreasureIds.includes(treasure.id))
        .map((treasure) => treasure.id),
    [unlockedTreasureKey],
  );
  const hasOwnershipFilter = unlockedTreasureIds !== undefined;
  const normalizedHoldingsValue = holdingsValue === undefined
    ? null
    : Math.max(0, Math.floor(Number.isFinite(holdingsValue) ? holdingsValue : 0));
  const initialTreasureId = featuredTreasureId && availableTreasureIds.includes(featuredTreasureId)
    ? featuredTreasureId
    : availableTreasureIds[0] ?? 'crown';
  const mountRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<VaultTreasureIslandRuntime | null>(null);
  const hasPlayedFeaturedRevealRef = useRef(false);
  const selectedTreasureRef = useRef<VaultTreasureId>(initialTreasureId);
  const revealRunRef = useRef(0);
  const lastPointerHitRef = useRef<VaultTreasureId | 'none'>('none');
  const qaYawOverrideRef = useRef<number | null>(null);
  const [quality, setQuality] = useState<VaultIslandQuality>(() => (embedded ? 'high' : readInitialQuality()));
  const [view, setView] = useState<VaultIslandLabView>(() => initialView ?? (embedded ? 'exterior' : readInitialView()));
  const [selectedTreasureId, setSelectedTreasureId] = useState<VaultTreasureId>(initialTreasureId);
  const [revealRun, setRevealRun] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [showReference, setShowReference] = useState(false);
  const [isMuseumCardExpanded, setIsMuseumCardExpanded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [qaSnapshot, setQaSnapshot] = useState<VaultIslandLabQaSnapshot | null>(null);
  const requestedYaw = useMemo(() => (embedded ? -0.08 : readRequestedYaw()), [embedded]);
  const cameraPreset = useMemo(() => (embedded ? 'phone' : readCameraPreset()), [embedded]);
  const qualityOptions = useMemo<VaultIslandQuality[]>(() => ['low', 'medium', 'high'], []);
  const selectedTreasure = useMemo(() => getVaultTreasureDefinition(selectedTreasureId), [selectedTreasureId]);
  const selectedCollectionEntry = useMemo(
    () => collectionEntries.find((entry) => entry.treasureId === selectedTreasureId) ?? null,
    [collectionEntries, selectedTreasureId],
  );
  const collectionValue = useMemo(
    () => VAULT_TREASURE_DEFINITIONS
      .filter((treasure) => availableTreasureIds.includes(treasure.id))
      .reduce((total, treasure) => total + treasure.value, 0),
    [availableTreasureIds],
  );
  const selectNextTreasure = () => {
    if (availableTreasureIds.length < 2) return;
    const selectedIndex = availableTreasureIds.indexOf(selectedTreasureId);
    setSelectedTreasureId(availableTreasureIds[(selectedIndex + 1) % availableTreasureIds.length]);
    setIsMuseumCardExpanded(false);
  };

  useEffect(() => {
    if (availableTreasureIds.length > 0 && !availableTreasureIds.includes(selectedTreasureId)) {
      setSelectedTreasureId(availableTreasureIds[0]);
    }
  }, [availableTreasureIds, selectedTreasureId]);

  useEffect(() => {
    selectedTreasureRef.current = selectedTreasureId;
  }, [selectedTreasureId]);

  useEffect(() => {
    revealRunRef.current = revealRun;
  }, [revealRun]);

  useEffect(() => {
    if (
      !featuredTreasureId
      || !availableTreasureIds.includes(featuredTreasureId)
      || view !== 'vault'
      || !isReady
      || hasPlayedFeaturedRevealRef.current
    ) return undefined;
    hasPlayedFeaturedRevealRef.current = true;
    setSelectedTreasureId(featuredTreasureId);
    const frame = window.requestAnimationFrame(() => {
      setRevealRun((value) => value + 1);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [availableTreasureIds, featuredTreasureId, isReady, view]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    qaYawOverrideRef.current = requestedYaw;

    setIsReady(false);
    setRenderError(null);
    lastPointerHitRef.current = 'none';
    const scene = new THREE.Scene();
    const isInteriorView = view !== 'exterior';
    const backgroundColor = view === 'vault' ? '#10192b' : view === 'atrium' ? '#1a3044' : '#c8a984';
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = new THREE.Fog(
      view === 'exterior' ? '#d3b184' : backgroundColor,
      view === 'vault' ? 7 : view === 'atrium' ? 18 : 36,
      view === 'vault' ? 18 : view === 'atrium' ? 38 : 78,
    );

    const camera = new THREE.PerspectiveCamera(38, 390 / 844, 0.1, 80);
    if (view === 'vault') {
      camera.position.set(0, 3.45, 9.65);
      camera.lookAt(0, 1.75, -0.72);
    } else if (view === 'atrium') {
      camera.position.set(0, 4.55, 19.2);
      camera.lookAt(0, 4.0, -0.55);
    } else {
      if (cameraPreset === 'top') {
        camera.position.set(5.4, 12.4, 14.2);
        camera.lookAt(0, 2.25, 0.1);
      } else {
        camera.position.set(4.4, 7.7, 18.5);
        camera.lookAt(0, 2.65, 0.28);
      }
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setRenderError('Interactive 3D is unavailable on this device.');
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = view === 'atrium' ? 0.94 : isInteriorView ? 0.95 : 0.9;
    renderer.shadowMap.enabled = quality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const premiumEnvironment = installVaultPremiumEnvironment(renderer, scene, isInteriorView ? 0.52 : 0.32);

    const hemi = new THREE.HemisphereLight(
      isInteriorView ? '#fff1c3' : '#ffd18b',
      isInteriorView ? '#081326' : '#17465b',
      view === 'atrium' ? 1.02 : isInteriorView ? 0.92 : 0.58,
    );
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(isInteriorView ? '#fff0c7' : '#ffc05a', view === 'atrium' ? 3.2 : isInteriorView ? 2.95 : 3.25);
    sun.position.set(isInteriorView ? -2.2 : 7.2, view === 'atrium' ? 7.2 : isInteriorView ? 5.6 : 7.6, isInteriorView ? 4.8 : -8.8);
    sun.castShadow = quality !== 'low';
    sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 18;
    sun.shadow.camera.left = -5;
    sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    scene.add(sun);

    const rim = new THREE.DirectionalLight('#79d7df', isInteriorView ? 1.28 : 0.24);
    rim.position.set(4, 2.2, -4);
    scene.add(rim);

    if (!isInteriorView) {
      const goldenBounce = new THREE.DirectionalLight('#ffd69a', 0.62);
      goldenBounce.name = 'vault-island-golden-hour-front-bounce';
      goldenBounce.position.set(-5.5, 4.2, 8.5);
      scene.add(goldenBounce);
    }

    const model = view === 'vault'
      ? createVaultTreasureVaultInteriorModel({
        quality,
        animated: true,
        unlockedTreasureIds: hasOwnershipFilter ? availableTreasureIds : undefined,
        holdingsValue: normalizedHoldingsValue ?? undefined,
      })
      : view === 'atrium'
        ? createVaultTreasurePalaceAtriumModel({ quality, animated: true })
        : createVaultTreasureIslandModel({ quality, animated: true });
    model.root.rotation.y = view === 'exterior' ? -0.08 : 0;
    scene.add(model.root);
    modelRef.current = model;

    const composer = quality === 'high' ? new EffectComposer(renderer) : null;
    if (composer) {
      composer.addPass(new RenderPass(scene, camera));
      const ssao = new SSAOPass(scene, camera, 390, 844);
      ssao.kernelRadius = view === 'exterior' ? 0.2 : 0.08;
      ssao.minDistance = 0.001;
      ssao.maxDistance = view === 'exterior' ? 0.15 : 0.06;
      composer.addPass(ssao);
      composer.addPass(new OutputPass());
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const treasureDisplays: THREE.Object3D[] = [];
    let wealthIngotCount = 0;
    let wealthCoinCount = 0;
    let wealthGemCount = 0;
    model.root.traverse((child) => {
      if (child.userData.vaultInteriorDisplay && child.userData.treasureId) {
        child.userData.baseScale = child.scale.x;
        child.userData.basePosition = child.position.clone();
        child.userData.baseRotationY = child.rotation.y;
        treasureDisplays.push(child);
      }
      if (child.name === 'vault-interior-stacked-essence-ingot') wealthIngotCount += 1;
      if (child.name === 'vault-interior-floor-loose-coin') wealthCoinCount += 1;
      if (
        child.name === 'vault-interior-loose-premium-gem'
        || child.name === 'vault-interior-floor-loose-cut-gem'
      ) wealthGemCount += 1;
    });

    const sparkleGeometry = new THREE.OctahedronGeometry(0.035, 0);
    const sparkleMaterial = new THREE.MeshBasicMaterial({
      color: '#fff0a4',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const revealSparkles = new THREE.Group();
    revealSparkles.name = 'vault-room-selected-treasure-sparkles';
    revealSparkles.visible = false;
    for (let index = 0; index < 34; index += 1) {
      const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
      sparkle.name = 'vault-room-reveal-sparkle';
      sparkle.userData.angle = (index / 34) * Math.PI * 2;
      sparkle.userData.height = (index % 9) * 0.07 - 0.24;
      sparkle.userData.speed = 0.78 + (index % 6) * 0.11;
      revealSparkles.add(sparkle);
    }
    scene.add(revealSparkles);

    const revealRingMaterial = new THREE.MeshBasicMaterial({
      color: '#d99b20',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const revealRings = new THREE.Group();
    revealRings.name = 'vault-room-luxury-reveal-rings';
    revealRings.visible = false;
    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 + index * 0.12, 0.012, 6, 64), revealRingMaterial);
      ring.name = 'vault-room-luxury-reveal-gold-ring';
      ring.rotation.set(index * 0.52, index * 0.68, index * 0.44);
      revealRings.add(ring);
    }
    scene.add(revealRings);

    const revealLight = new THREE.PointLight('#ffd77d', 0, 4.6, 2);
    revealLight.name = 'vault-room-luxury-reveal-light';
    scene.add(revealLight);

    const selectedHaloMaterial = new THREE.MeshBasicMaterial({
      color: '#ffe18b',
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const selectedHalo = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.54, 48), selectedHaloMaterial);
    selectedHalo.name = 'vault-room-selected-treasure-halo';
    selectedHalo.rotation.x = -Math.PI / 2;
    selectedHalo.visible = view === 'vault';
    scene.add(selectedHalo);

    const handlePointerDown = (event: PointerEvent) => {
      if (view !== 'vault') return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(model.root.children, true);
      const hit = hits.find((entry) => entry.object.userData.treasureId);
      const nextId = hit?.object.userData.treasureId as VaultTreasureId | undefined;
      if (nextId) {
        lastPointerHitRef.current = nextId;
        setSelectedTreasureId(nextId);
        setRevealRun((value) => value + 1);
      } else {
        lastPointerHitRef.current = 'none';
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = view === 'vault' ? 7.2 : view === 'atrium' ? 15.2 : 8.4;
    controls.maxDistance = view === 'vault' ? 11.4 : view === 'atrium' ? 22.6 : 30;
    controls.minPolarAngle = isInteriorView ? 0.5 : 0.48;
    controls.maxPolarAngle = view === 'vault' ? 1.3 : view === 'atrium' ? 1.22 : 1.18;
    controls.target.set(0, view === 'vault' ? 1.75 : view === 'atrium' ? 4.0 : 2.65, view === 'vault' ? -0.72 : view === 'atrium' ? -0.55 : 0.28);

    const clock = new THREE.Clock();
    let raf = 0;
    let lastRevealRun = revealRunRef.current;
    let revealStartedAt = -10;
    let frameCount = 0;
    const selectedWorld = new THREE.Vector3();
    const haloTarget = new THREE.Vector3();
    const inspectionTarget = new THREE.Vector3(0, 0.2, 1.52);
    const scaleTarget = new THREE.Vector3();
    const samplePixels = new Uint8Array(4 * 9);
    const sampleCanvas = () => {
      const gl = renderer.getContext();
      const canvas = renderer.domElement;
      const width = canvas.width;
      const height = canvas.height;
      const points = [
        [Math.floor(width * 0.5), Math.floor(height * 0.5)],
        [Math.floor(width * 0.5), Math.floor(height * 0.16)],
        [Math.floor(width * 0.28), Math.floor(height * 0.34)],
        [Math.floor(width * 0.72), Math.floor(height * 0.34)],
        [Math.floor(width * 0.14), Math.floor(height * 0.52)],
        [Math.floor(width * 0.86), Math.floor(height * 0.52)],
        [Math.floor(width * 0.3), Math.floor(height * 0.68)],
        [Math.floor(width * 0.7), Math.floor(height * 0.68)],
        [Math.floor(width * 0.5), Math.floor(height * 0.82)],
      ] as const;

      points.forEach(([x, y], index) => {
        gl.readPixels(x, Math.max(0, height - y - 1), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, samplePixels, index * 4);
      });

      let variedPixelPairs = 0;
      for (let index = 4; index < samplePixels.length; index += 4) {
        const delta =
          Math.abs(samplePixels[index] - samplePixels[0]) +
          Math.abs(samplePixels[index + 1] - samplePixels[1]) +
          Math.abs(samplePixels[index + 2] - samplePixels[2]);
        if (delta > 18) variedPixelPairs += 1;
      }

      const snapshot: VaultIslandLabQaSnapshot = {
        view,
        quality,
        isReady: true,
        palaceReady: view !== 'exterior' || model.root.userData.palaceReady === true,
        requestedYaw: qaYawOverrideRef.current,
        frameCount,
        canvasWidth: width,
        canvasHeight: height,
        sampledAtMs: Math.round(performance.now()),
        sampledPixels: points.length,
        variedPixelPairs,
        clickableDisplays: treasureDisplays.length,
        selectedTreasureId: selectedTreasureRef.current,
        revealRun: revealRunRef.current,
        inspectedDisplay: view === 'vault' ? selectedTreasureRef.current : 'none',
        collectionValue,
        holdingsValue: normalizedHoldingsValue,
        wealthTier: String(model.root.userData.sculptRuntime?.wealthTier ?? 'showcase'),
        wealthIngotCount,
        wealthCoinCount,
        wealthGemCount,
        lastPointerHit: lastPointerHitRef.current,
        route: window.location.pathname + window.location.search,
      };
      setQaSnapshot(snapshot);
      (window as unknown as { __vaultIslandLabQa?: VaultIslandLabQaSnapshot }).__vaultIslandLabQa = snapshot;
    };
    const resize = () => {
      const width = mount.clientWidth || 390;
      const height = mount.clientHeight || 844;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      composer?.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const qaControls = {
      setYaw: (yaw: number) => {
        qaYawOverrideRef.current = Number.isFinite(yaw) ? yaw : null;
      },
      setCamera: (preset: 'phone' | 'top') => {
        if (view !== 'exterior') return;
        if (preset === 'top') {
          camera.position.set(5.4, 12.4, 14.2);
          controls.target.set(0, 2.25, 0.1);
        } else {
          camera.position.set(4.4, 7.7, 18.5);
          controls.target.set(0, 2.65, 0.28);
        }
        camera.lookAt(controls.target);
        controls.update();
      },
    };
    (window as unknown as { __vaultIslandLabQaControls?: typeof qaControls }).__vaultIslandLabQaControls = qaControls;

    const render = () => {
      const elapsed = clock.getElapsedTime();
      if (view === 'exterior' && qaYawOverrideRef.current !== null) {
        model.root.rotation.y = qaYawOverrideRef.current;
      } else if (autoOrbit) {
        model.root.rotation.y = view === 'vault'
          ? Math.sin(elapsed * 0.18) * 0.06
          : view === 'atrium'
            ? Math.sin(elapsed * 0.14) * 0.035
            : -0.08 + Math.sin(elapsed * 0.22) * 0.04;
      }
      model.update(elapsed);
      if (view === 'vault') {
        if (lastRevealRun !== revealRunRef.current) {
          lastRevealRun = revealRunRef.current;
          revealStartedAt = elapsed;
        }
        const selectedId = selectedTreasureRef.current;
        const selectedDisplay = treasureDisplays.find((display) => display.userData.treasureId === selectedId);
        treasureDisplays.forEach((display) => {
          const baseScale = Number(display.userData.baseScale) || 0.64;
          const isSelected = display === selectedDisplay;
          const basePosition = display.userData.basePosition as THREE.Vector3 | undefined;
          if (basePosition) display.position.lerp(isSelected ? inspectionTarget : basePosition, isSelected ? 0.12 : 0.09);
          const targetScale = isSelected ? baseScale * 1.55 : baseScale * 0.78;
          scaleTarget.set(targetScale, targetScale, targetScale);
          display.scale.lerp(scaleTarget, 0.08);
          const baseRotationY = Number(display.userData.baseRotationY) || 0;
          display.rotation.y = isSelected
            ? Math.sin(elapsed * 0.52) * 0.28
            : THREE.MathUtils.lerp(display.rotation.y, baseRotationY, 0.08);
        });

        if (selectedDisplay) {
          selectedDisplay.getWorldPosition(selectedWorld);
          haloTarget.set(selectedWorld.x, 0.31, selectedWorld.z);
          selectedHalo.visible = true;
          selectedHalo.position.lerp(haloTarget, 0.16);
          selectedHalo.rotation.z += 0.016;
          selectedHaloMaterial.opacity = 0.26 + Math.sin(elapsed * 2.4) * 0.08;

          const revealT = Math.min(1, (elapsed - revealStartedAt) / 1.25);
          const easedReveal = 1 - Math.pow(1 - revealT, 3);
          const sparkleOpacity = revealT < 1 ? Math.sin(revealT * Math.PI) * 0.86 : 0;
          sparkleMaterial.opacity = sparkleOpacity;
          revealSparkles.visible = sparkleOpacity > 0.02;
          revealSparkles.position.copy(selectedWorld);
          revealSparkles.position.y += 0.74;
          revealRings.position.copy(revealSparkles.position);
          revealRings.visible = sparkleOpacity > 0.02;
          revealRings.scale.setScalar(0.42 + easedReveal * 1.18);
          revealRingMaterial.opacity = sparkleOpacity * 0.68;
          revealRings.rotation.set(elapsed * 0.58, elapsed * 0.78, elapsed * 0.36);
          revealLight.position.copy(revealSparkles.position);
          revealLight.intensity = sparkleOpacity * 3.4;
          revealSparkles.children.forEach((sparkle, index) => {
            const angle = Number(sparkle.userData.angle) + elapsed * Number(sparkle.userData.speed);
            const radius = 0.18 + easedReveal * 0.62 + (index % 4) * 0.025;
            sparkle.position.set(
              Math.sin(angle) * radius,
              Number(sparkle.userData.height) + Math.sin(elapsed * 3 + index) * 0.055,
              Math.cos(angle) * radius,
            );
            sparkle.rotation.set(elapsed * 1.5 + index, elapsed * 2.2, angle);
            sparkle.scale.setScalar(1.15 - easedReveal * 0.45 + (index % 3) * 0.12);
          });
        }
      }
      controls.update();
      if (composer) composer.render();
      else renderer.render(scene, camera);
      frameCount += 1;
      if (frameCount === 2 || frameCount % 45 === 0) sampleCanvas();
      raf = window.requestAnimationFrame(render);
    };
    // Let React finish committing the view transition before the first heavy shader compile.
    raf = window.requestAnimationFrame(render);
    setIsReady(true);

    return () => {
      window.cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      observer.disconnect();
      controls.dispose();
      model.dispose();
      modelRef.current = null;
      sparkleGeometry.dispose();
      sparkleMaterial.dispose();
      revealRings.children.forEach((ring) => {
        if (ring instanceof THREE.Mesh) ring.geometry.dispose();
      });
      revealRingMaterial.dispose();
      selectedHalo.geometry.dispose();
      selectedHaloMaterial.dispose();
      premiumEnvironment.dispose();
      composer?.dispose();
      delete (window as unknown as { __vaultIslandLabQa?: VaultIslandLabQaSnapshot }).__vaultIslandLabQa;
      delete (window as unknown as { __vaultIslandLabQaControls?: typeof qaControls }).__vaultIslandLabQaControls;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [autoOrbit, availableTreasureIds, cameraPreset, hasOwnershipFilter, normalizedHoldingsValue, quality, requestedYaw, view]);

  return (
    <main className={`vault-island-lab${embedded ? ' vault-island-lab--embedded' : ''}`}>
      <section className="vault-island-lab__phone" aria-label={embedded ? 'Vault Island collection' : 'Vault island 3D lab'}>
        <div ref={mountRef} className="vault-island-lab__stage" />
        {renderError ? (
          <>
            <img className="vault-island-lab__fallback" src={FALLBACK_SRC} alt="Vault Island palace rising above its treasure galleries" />
            <p className="vault-island-lab__fallback-note">
              {view === 'vault' ? 'Collection register mode' : renderError}
            </p>
          </>
        ) : null}
        {!isReady && !renderError ? <div className="vault-island-lab__loading">Loading</div> : null}
        {showReference ? (
          <img
            className="vault-island-lab__reference"
            src={SOURCE_SRC}
            alt="Vault treasure island source reference"
          />
        ) : null}
        <div className="vault-island-lab__hud vault-island-lab__hud--top">
          <strong>{view === 'vault' ? 'Vault Room' : view === 'atrium' ? 'Palace Atrium' : 'Vault Island'}</strong>
          <span>{view === 'vault'
            ? normalizedHoldingsValue === null
              ? `${availableTreasureIds.length}/${VAULT_TREASURE_DEFINITIONS.length} relics · ${collectionValue.toLocaleString()}`
              : `${availableTreasureIds.length}/${VAULT_TREASURE_DEFINITIONS.length} relics · ${normalizedHoldingsValue.toLocaleString()} reserve`
            : view === 'atrium' ? 'Descent' : 'Special'}</span>
          {embedded && onClose ? (
            <button type="button" className="vault-island-lab__close" aria-label="Close Vault Island" onClick={onClose} autoFocus>
              ×
            </button>
          ) : null}
        </div>
        {!renderError ? <div className="vault-island-lab__hud vault-island-lab__hud--bottom">
          <button type="button" onClick={() => setView((value) => (value === 'exterior' ? 'atrium' : value === 'atrium' ? 'vault' : 'atrium'))}>
            {view === 'exterior' ? 'Enter palace' : view === 'atrium' ? 'Descend to vault' : 'Palace atrium'}
          </button>
          {view !== 'exterior' ? <button type="button" onClick={() => setView('exterior')}>Exterior</button> : null}
          {!embedded ? <button type="button" onClick={() => setAutoOrbit((value) => !value)}>
            {autoOrbit ? 'Orbit on' : 'Orbit off'}
          </button> : null}
          {!embedded ? (
            <button type="button" onClick={() => setShowReference((value) => !value)}>
              {showReference ? '3D view' : 'Source'}
            </button>
          ) : null}
          {!embedded ? (
            <button type="button" onClick={() => { window.location.href = VAULT_ISLAND_LAB_ROUTES.treasureLab; }}>
              Treasure lab
            </button>
          ) : null}
        </div> : (
          <div className="vault-island-lab__hud vault-island-lab__hud--bottom vault-island-lab__hud--fallback">
            <button type="button" onClick={() => setView((value) => (value === 'vault' ? 'exterior' : 'vault'))}>
              {view === 'vault' ? 'Back to palace' : 'Collection register'}
            </button>
          </div>
        )}
        {view === 'vault' && availableTreasureIds.length > 0 ? (
          <article className={`vault-island-lab__treasure-card${isMuseumCardExpanded ? ' is-expanded' : ''}${featuredTreasureId === selectedTreasureId ? ' is-featured-relic' : ''}`} aria-live="polite">
            <header>
              <div>
                <p>{featuredTreasureId === selectedTreasureId && featuredSourceIslandNumber
                  ? `New relic · Island ${featuredSourceIslandNumber}`
                  : selectedCollectionEntry
                    ? `Recovered · Island ${selectedCollectionEntry.sourceIslandNumber}`
                    : selectedTreasure.origin}</p>
                <h2>{selectedTreasure.name}</h2>
              </div>
              <strong>{selectedTreasure.value.toLocaleString()}</strong>
            </header>
            <div className="vault-island-lab__treasure-meta">
              <span>{selectedTreasure.rarity}</span>
              <span>{selectedCollectionEntry?.accessionNumber ?? 'Museum value'}</span>
            </div>
            {isMuseumCardExpanded ? (
              <div className="vault-island-lab__treasure-details">
                <small>{selectedTreasure.materialStory}</small>
                {selectedCollectionEntry ? (
                  <small>
                    Recovered through Vault Rush on Island {selectedCollectionEntry.sourceIslandNumber}.
                    {' '}Registry {selectedCollectionEntry.accessionNumber}.
                  </small>
                ) : null}
              </div>
            ) : null}
            <footer>
              {renderError ? (
                <button type="button" onClick={selectNextTreasure} disabled={availableTreasureIds.length < 2}>
                  Next relic
                </button>
              ) : (
                <button type="button" onClick={() => setRevealRun((value) => value + 1)}>
                  Reveal
                </button>
              )}
              <button
                type="button"
                aria-expanded={isMuseumCardExpanded}
                onClick={() => setIsMuseumCardExpanded((value) => !value)}
              >
                {isMuseumCardExpanded ? 'Less' : 'Details'}
              </button>
            </footer>
          </article>
        ) : view === 'vault' ? (
          <article className="vault-island-lab__treasure-card vault-island-lab__treasure-card--empty" aria-live="polite">
            <p>Private collection</p>
            <h2>The treasury awaits</h2>
            <small>Claim a Vault Rush reward on an island to place your first relic in the museum.</small>
          </article>
        ) : null}
      </section>

      {!embedded ? <aside className="vault-island-lab__panel" aria-label="Vault island lab controls">
        <p className="vault-island-lab__eyebrow">Phone lab</p>
        <h1>Special Vault Island</h1>
        <div className="vault-island-lab__quality" role="group" aria-label="Render quality">
          {qualityOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={option === quality ? 'is-active' : ''}
              onClick={() => setQuality(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <dl>
          <div>
            <dt>Source</dt>
            <dd>treasure island.png</dd>
          </div>
          <div>
            <dt>Hash</dt>
            <dd>{VAULT_ISLAND_SOURCE_SHA256.slice(0, 8)}...</dd>
          </div>
          <div>
            <dt>Pass</dt>
            <dd>{view === 'vault' ? 'vault interior' : view === 'atrium' ? 'palace descent' : 'island exterior'}</dd>
          </div>
          <div>
            <dt>Cadence</dt>
            <dd>~1 per {VAULT_TREASURE_CADENCE.majorTreasureEveryApproxIslands} islands</dd>
          </div>
        </dl>
        <section className="vault-island-lab__contract" aria-label="Treasure discovery contract">
          <h2>Treasure paths</h2>
          {VAULT_TREASURE_DISCOVERY_RULES.map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => {
                setView('vault');
                setSelectedTreasureId(rule.targetTreasureId);
                setRevealRun((value) => value + 1);
              }}
            >
              <span>{rule.mode}</span>
              <strong>{rule.label}</strong>
            </button>
          ))}
        </section>
        <section className="vault-island-lab__qa" aria-label="Vault lab runtime QA">
          <h2>Runtime QA</h2>
          <dl>
            <div>
              <dt>Frames</dt>
              <dd>{qaSnapshot?.frameCount ?? 0}</dd>
            </div>
            <div>
              <dt>Canvas</dt>
              <dd>{qaSnapshot ? `${qaSnapshot.canvasWidth}x${qaSnapshot.canvasHeight}` : 'pending'}</dd>
            </div>
            <div>
              <dt>Pixels</dt>
              <dd>{qaSnapshot ? `${qaSnapshot.variedPixelPairs}/${Math.max(1, qaSnapshot.sampledPixels - 1)}` : 'pending'}</dd>
            </div>
            <div>
              <dt>Targets</dt>
              <dd>{qaSnapshot?.clickableDisplays ?? 0}</dd>
            </div>
            <div>
              <dt>Last hit</dt>
              <dd>{qaSnapshot?.lastPointerHit ?? 'none'}</dd>
            </div>
          </dl>
        </section>
      </aside> : null}
    </main>
  );
}
