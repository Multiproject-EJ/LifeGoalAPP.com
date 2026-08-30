import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  createVaultTreasureIslandModel,
  type VaultIslandQuality,
  type VaultTreasureIslandRuntime,
} from '../features/gamification/level-worlds/dev/VaultTreasureIslandModel';
import {
  createVaultTreasureGardenGalleryModel,
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
import type { VaultCasinoGameId } from '../features/gamification/level-worlds/services/islandRunVaultCasino';
import type { PurchaseVaultIslandUpgradeResult } from '../features/gamification/level-worlds/services/islandRunVaultProgressAction';
import {
  VAULT_ISLAND_UPGRADES,
  areVaultIslandUpgradePrerequisitesMet,
  getVaultIslandTotalInvested,
  resolveVaultIslandExteriorFill,
  sanitizeVaultIslandProgress,
  type VaultIslandProgress,
  type VaultIslandUpgradeId,
} from '../features/gamification/level-worlds/services/islandRunVaultProgress';
import {
  loadVaultIslandPerimeterStyle,
  normalizeVaultIslandPerimeterStyle,
  saveVaultIslandPerimeterStyle,
  type VaultIslandPerimeterStyle,
} from '../features/gamification/level-worlds/services/islandRunVaultCustomization';
import { VaultIslandBuildTuner } from './VaultIslandBuildTuner';
import './VaultIslandLab.css';

const SOURCE_SRC = '/assets/dev/vault-island-lab/treasure-island-source.png';
const FALLBACK_SRC = '/assets/islands/special/vault-island/vault-island-fallback.png';
export type VaultIslandLabView = 'exterior' | 'atrium' | 'garden' | 'vault';

export interface VaultIslandLabProps {
  embedded?: boolean;
  onClose?: () => void;
  unlockedTreasureIds?: readonly VaultTreasureId[];
  collectionEntries?: readonly VaultIslandCollectionEntry[];
  initialView?: VaultIslandLabView;
  featuredTreasureId?: VaultTreasureId;
  featuredSourceIslandNumber?: number;
  holdingsValue?: number;
  casinoAvailableGameId?: VaultCasinoGameId | null;
  onOpenCasino?: () => void;
  vaultProgress?: VaultIslandProgress;
  onPurchaseVaultUpgrade?: (upgradeId: VaultIslandUpgradeId) => PurchaseVaultIslandUpgradeResult;
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
  perimeterStyle: VaultIslandPerimeterStyle;
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
  if (params.get('view') === 'garden') return 'garden';
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

function readInitialPerimeterStyle(): VaultIslandPerimeterStyle {
  if (typeof window === 'undefined') return 'charms';
  const requested = new URLSearchParams(window.location.search).get('perimeter');
  return requested === null
    ? loadVaultIslandPerimeterStyle()
    : normalizeVaultIslandPerimeterStyle(requested);
}

function readCleanPresentationMode() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('clean') === '1';
}

function readQaStillMode() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('still') === '1';
}

function readBuildTunerMode() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1';
}

function readBuildFill(name: string, fallback = 100) {
  if (typeof window === 'undefined') return fallback;
  const value = new URLSearchParams(window.location.search).get(name);
  if (value === null) return fallback;
  const raw = Number(value);
  return Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : fallback;
}

function wealthFromBuildFill(fill: number) {
  const normalized = Math.min(100, Math.max(0, fill));
  if (normalized === 0) return 0;
  if (normalized <= 25) return Math.max(1, Math.round((normalized / 25) * 499));
  if (normalized <= 50) return Math.round(500 + ((normalized - 25) / 25) * 1_999);
  if (normalized <= 75) return Math.round(2_500 + ((normalized - 50) / 25) * 7_499);
  return Math.round(10_000 + ((normalized - 75) / 25) * 90_000);
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
  casinoAvailableGameId = null,
  onOpenCasino,
  vaultProgress,
  onPurchaseVaultUpgrade,
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
  const perimeterStyleRef = useRef<VaultIslandPerimeterStyle>(readInitialPerimeterStyle());
  const [quality, setQuality] = useState<VaultIslandQuality>(() => (embedded ? 'high' : readInitialQuality()));
  const [view, setView] = useState<VaultIslandLabView>(() => initialView ?? (embedded ? 'exterior' : readInitialView()));
  const [selectedTreasureId, setSelectedTreasureId] = useState<VaultTreasureId>(initialTreasureId);
  const [revealRun, setRevealRun] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [showReference, setShowReference] = useState(false);
  const [isMuseumCardExpanded, setIsMuseumCardExpanded] = useState(false);
  const [showDevelopment, setShowDevelopment] = useState(false);
  const [developmentNotice, setDevelopmentNotice] = useState<string | null>(null);
  const [perimeterStyle, setPerimeterStyle] = useState<VaultIslandPerimeterStyle>(() => perimeterStyleRef.current);
  const [isReady, setIsReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [qaSnapshot, setQaSnapshot] = useState<VaultIslandLabQaSnapshot | null>(null);
  const [exteriorFill, setExteriorFill] = useState(() => readBuildFill('exteriorFill'));
  const [vaultInteriorFill, setVaultInteriorFill] = useState(() => readBuildFill('interiorFill'));
  const [gigaCharmFill, setGigaCharmFill] = useState(() => readBuildFill('charmFill'));
  const requestedYaw = useMemo(() => (embedded ? -0.08 : readRequestedYaw()), [embedded]);
  const cleanPresentationMode = useMemo(() => embedded || readCleanPresentationMode(), [embedded]);
  const qaStillMode = useMemo(() => !embedded && readQaStillMode(), [embedded]);
  const buildTunerMode = useMemo(() => !embedded && readBuildTunerMode(), [embedded]);
  const cameraPreset = useMemo(() => (embedded ? 'phone' : readCameraPreset()), [embedded]);
  const qualityOptions = useMemo<VaultIslandQuality[]>(() => ['low', 'medium', 'high'], []);
  const perimeterOptions = useMemo<Array<{ id: VaultIslandPerimeterStyle; label: string }>>(() => [
    { id: 'charms', label: 'Charms' },
    { id: 'garden', label: 'Garden' },
    { id: 'gold-castle', label: 'Gold' },
  ], []);
  const selectedTreasure = useMemo(() => getVaultTreasureDefinition(selectedTreasureId), [selectedTreasureId]);
  const selectedCollectionEntry = useMemo(
    () => collectionEntries.find((entry) => entry.treasureId === selectedTreasureId) ?? null,
    [collectionEntries, selectedTreasureId],
  );
  const effectiveHoldingsValue = buildTunerMode
    ? wealthFromBuildFill(vaultInteriorFill)
    : normalizedHoldingsValue;
  const normalizedVaultProgress = useMemo(
    () => sanitizeVaultIslandProgress(vaultProgress),
    [vaultProgress],
  );
  const ownedUpgradeKey = normalizedVaultProgress.purchasedUpgradeIds.join('|');
  const effectiveExteriorFill = buildTunerMode
    ? exteriorFill
    : vaultProgress === undefined
      ? exteriorFill
      : resolveVaultIslandExteriorFill(normalizedVaultProgress);
  const vaultTotalInvested = getVaultIslandTotalInvested(normalizedVaultProgress);
  const ownedVaultUpgradeIds = new Set(normalizedVaultProgress.purchasedUpgradeIds);
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
  const openCasino = () => {
    if (onOpenCasino) {
      onOpenCasino();
      return;
    }
    window.location.href = '/dev/vault-casino-lab?mode=inspect';
  };
  const purchaseUpgrade = (upgradeId: VaultIslandUpgradeId) => {
    if (!onPurchaseVaultUpgrade) return;
    const upgrade = VAULT_ISLAND_UPGRADES.find((candidate) => candidate.id === upgradeId);
    const result = onPurchaseVaultUpgrade(upgradeId);
    const notice = result.status === 'purchased'
      ? `${upgrade?.name ?? 'Upgrade'} constructed`
      : result.status === 'insufficient_essence'
        ? 'More Essence is required'
        : result.status === 'prerequisite_locked'
          ? 'Complete the earlier works first'
          : result.status === 'already_owned'
            ? 'Already installed'
            : 'Complete Island 004 to receive the Vault';
    setDevelopmentNotice(notice);
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
    perimeterStyleRef.current = saveVaultIslandPerimeterStyle(perimeterStyle);
    modelRef.current?.setPerimeterStyle?.(perimeterStyleRef.current);
  }, [perimeterStyle]);

  useEffect(() => {
    modelRef.current?.setExteriorFill?.(effectiveExteriorFill);
  }, [effectiveExteriorFill]);

  useEffect(() => {
    if (vaultProgress === undefined) return;
    modelRef.current?.setOwnedUpgradeIds?.(normalizedVaultProgress.purchasedUpgradeIds);
  }, [ownedUpgradeKey, vaultProgress]);

  useEffect(() => {
    modelRef.current?.setGigaCharmFill?.(gigaCharmFill);
  }, [gigaCharmFill]);

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
    const backgroundColor = view === 'vault' ? '#10192b' : view === 'garden' ? '#b66f34' : view === 'atrium' ? '#244b57' : '#d6a14e';
    scene.background = new THREE.Color(backgroundColor);
    const fogColor = view === 'exterior' ? '#e0ad59' : view === 'garden' ? '#d89a55' : backgroundColor;
    scene.fog = new THREE.Fog(
      fogColor,
      view === 'vault' ? 7 : view === 'atrium' ? 18 : view === 'garden' ? 42 : 36,
      view === 'vault' ? 18 : view === 'atrium' ? 38 : view === 'garden' ? 132 : 78,
    );

    const camera = new THREE.PerspectiveCamera(view === 'atrium' ? 56 : view === 'garden' ? 54 : isInteriorView ? 52 : 38, 390 / 844, 0.1, view === 'garden' ? 140 : 80);
    if (view === 'vault') {
      camera.position.set(0, 2.12, 7.62);
      camera.lookAt(0, 2.62, -3.32);
    } else if (view === 'garden') {
      camera.position.set(0.15, 5.65, 11.4);
      camera.lookAt(0, 1.55, -5.4);
    } else if (view === 'atrium') {
      camera.position.set(0.2, 1.58, 10.62);
      camera.lookAt(0, 4.72, -2.88);
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
    const phoneSizedViewport = mount.clientWidth <= 480 || window.innerWidth <= 480;
    const pixelRatioCap = phoneSizedViewport
      ? quality === 'high' ? 1.35 : quality === 'medium' ? 1.2 : 1
      : quality === 'high' ? 2 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = view === 'atrium' ? 0.68 : view === 'garden' ? 0.69 : isInteriorView ? 0.78 : 0.9;
    renderer.shadowMap.enabled = quality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const premiumEnvironment = installVaultPremiumEnvironment(renderer, scene, view === 'garden' ? 0.6 : isInteriorView ? 0.46 : 0.32);

    const hemi = new THREE.HemisphereLight(
      isInteriorView ? '#fff1c3' : '#ffca69',
      isInteriorView ? '#081326' : '#17465b',
      view === 'atrium' ? 0.48 : isInteriorView ? 0.62 : 0.66,
    );
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(isInteriorView ? '#ffc56d' : '#ffb13f', view === 'atrium' ? 1.08 : view === 'garden' ? 1.42 : isInteriorView ? 1.52 : 3.3);
    sun.position.set(isInteriorView ? -3.8 : 7.2, view === 'atrium' ? 9.4 : isInteriorView ? 7.2 : 7.6, isInteriorView ? 7.8 : -8.8);
    sun.castShadow = quality !== 'low';
    const shadowMapSize = quality === 'high' && !phoneSizedViewport ? 2048 : 1024;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 18;
    sun.shadow.camera.left = -5;
    sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    scene.add(sun);

    const rim = new THREE.DirectionalLight('#68cde0', isInteriorView ? 0.58 : 0.24);
    rim.position.set(4, 2.2, -4);
    scene.add(rim);

    if (!isInteriorView) {
      const goldenBounce = new THREE.DirectionalLight('#ffc86c', 0.78);
      goldenBounce.name = 'vault-island-golden-hour-front-bounce';
      goldenBounce.position.set(-5.5, 4.2, 8.5);
      scene.add(goldenBounce);
    }

    const model = view === 'vault'
      ? createVaultTreasureVaultInteriorModel({
        quality,
        animated: true,
        unlockedTreasureIds: hasOwnershipFilter ? availableTreasureIds : undefined,
        holdingsValue: effectiveHoldingsValue ?? undefined,
      })
      : view === 'garden'
        ? createVaultTreasureGardenGalleryModel({ quality, animated: true })
        : view === 'atrium'
        ? createVaultTreasurePalaceAtriumModel({ quality, animated: true })
        : createVaultTreasureIslandModel({
          quality,
          animated: true,
          perimeterStyle: perimeterStyleRef.current,
          exteriorFill: effectiveExteriorFill,
          gigaCharmFill,
          ownedUpgradeIds: vaultProgress === undefined
            ? undefined
            : normalizedVaultProgress.purchasedUpgradeIds,
        });
    model.root.rotation.y = view === 'exterior' ? -0.08 : 0;
    scene.add(model.root);
    modelRef.current = model;

    const composer = quality === 'high' && isInteriorView ? new EffectComposer(renderer) : null;
    if (composer) {
      composer.addPass(new RenderPass(scene, camera));
      const ssao = new SSAOPass(scene, camera, 390, 844);
      ssao.kernelRadius = view === 'exterior' ? 0.2 : 0.13;
      ssao.minDistance = 0.001;
      ssao.maxDistance = view === 'exterior' ? 0.15 : 0.1;
      composer.addPass(ssao);
      if (isInteriorView) {
        const bloom = new UnrealBloomPass(new THREE.Vector2(390, 844), view === 'vault' ? 0.12 : 0.08, 0.2, 0.94);
        composer.addPass(bloom);
      }
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
        const heroTreasure = child.children.find((candidate) => candidate.userData.vaultInteriorHeroTreasure === true);
        if (heroTreasure) {
          heroTreasure.userData.baseHeroScale = heroTreasure.scale.clone();
          child.userData.heroTreasure = heroTreasure;
        }
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
    for (let index = 0; index < 2; index += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38 + index * 0.1, 0.009, 6, 64), revealRingMaterial);
      ring.name = 'vault-room-luxury-reveal-gold-ring';
      ring.rotation.set(index * 0.52, index * 0.68, index * 0.44);
      revealRings.add(ring);
    }
    scene.add(revealRings);

    const revealLight = new THREE.PointLight('#ffd77d', 0, 4.6, 2);
    revealLight.name = 'vault-room-luxury-reveal-light';
    scene.add(revealLight);
    const revealRimLight = new THREE.PointLight('#86e8ff', 0, 4.2, 2);
    revealRimLight.name = 'vault-room-luxury-reveal-crystal-rim-light';
    scene.add(revealRimLight);
    const presentationLights: THREE.Light[] = [];
    scene.traverse((child) => {
      if (!(child instanceof THREE.Light) || child === revealLight || child === revealRimLight) return;
      child.userData.presentationBaseIntensity = child.intensity;
      presentationLights.push(child);
    });

    const revealBackdropMaterial = new THREE.MeshBasicMaterial({
      color: '#020713',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const revealBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), revealBackdropMaterial);
    revealBackdrop.name = 'vault-room-luxury-reveal-backdrop';
    revealBackdrop.position.set(0, 3.2, 0.74);
    revealBackdrop.renderOrder = 10;
    revealBackdropMaterial.depthTest = false;
    revealBackdrop.visible = false;
    scene.add(revealBackdrop);

    const presentationGold = new THREE.MeshBasicMaterial({
      color: '#f4bd3e',
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    const presentationFrame = new THREE.Group();
    presentationFrame.name = 'vault-room-dedicated-luxury-presentation-frame';
    presentationFrame.position.set(0, 1.62, 0.9);
    presentationFrame.renderOrder = 11;
    const presentationHalo = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.012, 8, 96), presentationGold);
    presentationHalo.scale.y = 1.36;
    presentationHalo.renderOrder = 11;
    presentationFrame.add(presentationHalo);
    presentationFrame.visible = false;
    scene.add(presentationFrame);

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
    controls.minDistance = view === 'garden' ? 8.4 : view === 'vault' ? 7.2 : view === 'atrium' ? 10.4 : 8.4;
    controls.maxDistance = view === 'garden' ? 20 : view === 'vault' ? 12.2 : view === 'atrium' ? 13.5 : 30;
    controls.minPolarAngle = isInteriorView ? 0.38 : 0.48;
    controls.maxPolarAngle = view === 'vault' ? 1.46 : view === 'atrium' ? 1.4 : 1.18;
    controls.minAzimuthAngle = isInteriorView ? -0.82 : -Infinity;
    controls.maxAzimuthAngle = isInteriorView ? 0.82 : Infinity;
    controls.target.set(0, view === 'garden' ? 1.15 : view === 'vault' ? 2.66 : view === 'atrium' ? 4.72 : 2.65, view === 'garden' ? -4.8 : view === 'vault' ? -3.28 : view === 'atrium' ? -2.88 : 0.28);

    const clock = new THREE.Clock();
    let raf = 0;
    let stagedFrameTimer = 0;
    let lastRevealRun = revealRunRef.current;
    let revealStartedAt = -10;
    let frameCount = 0;
    const selectedWorld = new THREE.Vector3();
    const haloTarget = new THREE.Vector3();
    const inspectionTarget = new THREE.Vector3(0, 1.24, 1.14);
    const presentationCameraPosition = new THREE.Vector3(0.08, 1.72, 4.72);
    const presentationCameraTarget = new THREE.Vector3(0, 1.34, 1.12);
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
        holdingsValue: effectiveHoldingsValue,
        wealthTier: String(model.root.userData.sculptRuntime?.wealthTier ?? 'showcase'),
        wealthIngotCount,
        wealthCoinCount,
        wealthGemCount,
        perimeterStyle: perimeterStyleRef.current,
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
      setCharmCamera: (preset: 'front' | 'left' | 'right') => {
        if (view !== 'exterior') return;
        controls.minDistance = 0.8;
        camera.fov = 50;
        camera.position.set(
          preset === 'left' ? -1.85 : preset === 'right' ? 1.85 : 0,
          preset === 'front' ? 1.6 : 1.72,
          preset === 'front' ? 7.8 : 7.45,
        );
        controls.target.set(0, 1.1, 3.42);
        camera.lookAt(controls.target);
        camera.updateProjectionMatrix();
        controls.update();
      },
      setInteriorCamera: (preset: 'front' | 'left' | 'right') => {
        if (view === 'atrium') {
          if (preset === 'left') {
            controls.minDistance = 1.2;
            camera.fov = 52;
            camera.position.set(-4.45, 1.7, 2.88);
            controls.target.set(-4.18, 1.1, -1.48);
          } else if (preset === 'right') {
            controls.minDistance = 1.2;
            camera.fov = 52;
            camera.position.set(4.45, 1.7, 2.88);
            controls.target.set(4.18, 1.1, -1.48);
          } else {
            controls.minDistance = 10.4;
            camera.fov = 56;
            camera.position.set(0.2, 1.58, 10.62);
            controls.target.set(0, 4.72, -2.88);
          }
          camera.updateProjectionMatrix();
        } else if (view === 'garden') {
          camera.fov = preset === 'front' ? 54 : 61;
          camera.position.set(
            preset === 'left' ? -0.48 : preset === 'right' ? 0.48 : 0.15,
            preset === 'front' ? 5.65 : 5.25,
            preset === 'front' ? 11.4 : 12.45,
          );
          controls.target.set(
            preset === 'left' ? -0.38 : preset === 'right' ? 0.38 : 0,
            preset === 'front' ? 1.55 : 1.65,
            preset === 'front' ? -5.4 : -6.4,
          );
          camera.updateProjectionMatrix();
        } else if (view === 'vault') {
          if (preset === 'left') {
            camera.position.set(-4.5, 2.42, 6.78);
            controls.target.set(-1.72, 2.22, -3.02);
          } else if (preset === 'right') {
            camera.position.set(4.5, 2.42, 6.78);
            controls.target.set(1.72, 2.22, -3.02);
          } else {
            camera.position.set(0, 2.12, 7.62);
            controls.target.set(0, 2.62, -3.32);
          }
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
          : view === 'garden'
            ? Math.sin(elapsed * 0.11) * 0.018
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
        const revealActive = revealRunRef.current > 0;
        const revealT = Math.min(1, Math.max(0, (elapsed - revealStartedAt) / 0.82));
        const easedReveal = 1 - Math.pow(1 - revealT, 3);
        treasureDisplays.forEach((display) => {
          const baseScale = Number(display.userData.baseScale) || 0.64;
          const isSelected = display === selectedDisplay;
          const basePosition = display.userData.basePosition as THREE.Vector3 | undefined;
          if (basePosition) {
            if (isSelected && revealActive) display.position.lerpVectors(basePosition, inspectionTarget, easedReveal);
            else display.position.lerp(basePosition, 0.09);
          }
          const targetScale = isSelected && revealActive ? baseScale * 1.24 : revealActive ? baseScale * 0.54 : baseScale;
          scaleTarget.set(targetScale, targetScale, targetScale);
          display.scale.lerp(scaleTarget, 0.08);
          const heroTreasure = display.userData.heroTreasure as THREE.Object3D | undefined;
          const baseHeroScale = heroTreasure?.userData.baseHeroScale as THREE.Vector3 | undefined;
          if (heroTreasure && baseHeroScale) {
            const selectedTreasureId = display.userData.treasureId as VaultTreasureId | undefined;
            const heroMultiplier = isSelected && revealActive
              ? selectedTreasureId === 'obelisk'
                ? 1.38
                : selectedTreasureId === 'key' || selectedTreasureId === 'medallion'
                  ? 1.82
                  : 1.68
              : 1;
            scaleTarget.copy(baseHeroScale).multiplyScalar(heroMultiplier);
            heroTreasure.scale.lerp(scaleTarget, 0.1);
          }
          const baseRotationY = Number(display.userData.baseRotationY) || 0;
          display.rotation.y = isSelected && revealActive
            ? elapsed * 0.42
            : THREE.MathUtils.lerp(display.rotation.y, baseRotationY, 0.08);
          display.traverse((child) => {
            if (child instanceof THREE.Mesh) child.renderOrder = isSelected && revealActive ? 12 : 0;
          });
        });

        revealBackdrop.visible = revealActive;
        revealBackdropMaterial.opacity = THREE.MathUtils.lerp(revealBackdropMaterial.opacity, revealActive ? 0.7 : 0, 0.1);
        presentationFrame.visible = false;
        presentationGold.opacity = THREE.MathUtils.lerp(presentationGold.opacity, 0, 0.09);
        presentationLights.forEach((light) => {
          const baseIntensity = Number(light.userData.presentationBaseIntensity) || 0;
          light.intensity = THREE.MathUtils.lerp(light.intensity, baseIntensity * (revealActive ? 0.42 : 1), 0.08);
        });

        if (selectedDisplay) {
          if (revealActive) {
            camera.position.lerp(presentationCameraPosition, 0.075);
            controls.target.lerp(presentationCameraTarget, 0.075);
          }
          selectedDisplay.getWorldPosition(selectedWorld);
          haloTarget.set(selectedWorld.x, 0.31, selectedWorld.z);
          selectedHalo.visible = true;
          selectedHalo.position.lerp(haloTarget, 0.16);
          selectedHalo.rotation.z += 0.016;
          selectedHaloMaterial.opacity = 0.26 + Math.sin(elapsed * 2.4) * 0.08;

          const sparkleOpacity = revealT < 1
            ? Math.sin(revealT * Math.PI) * 0.86
            : revealActive
              ? 0.14 + Math.sin(elapsed * 2.2) * 0.05
              : 0;
          sparkleMaterial.opacity = sparkleOpacity;
          revealSparkles.visible = sparkleOpacity > 0.02;
          revealSparkles.position.copy(selectedWorld);
          revealSparkles.position.y += 0.74;
          revealRings.position.copy(revealSparkles.position);
          revealRings.visible = revealT < 0.92 && sparkleOpacity > 0.02;
          revealRings.scale.setScalar(0.36 + easedReveal * 0.88);
          revealRingMaterial.opacity = revealT < 0.92 ? sparkleOpacity * 0.5 : 0;
          revealRings.rotation.set(elapsed * 0.58, elapsed * 0.78, elapsed * 0.36);
          presentationFrame.rotation.z = Math.sin(elapsed * 0.35) * 0.025;
          revealLight.position.copy(revealSparkles.position);
          revealLight.position.z += 0.72;
          revealLight.intensity = revealActive ? 3.15 + sparkleOpacity * 1.45 : 0;
          revealRimLight.position.copy(revealSparkles.position);
          revealRimLight.position.setX(revealRimLight.position.x - 1.15);
          revealRimLight.position.y += 0.45;
          revealRimLight.position.z += 0.3;
          revealRimLight.intensity = revealActive ? 2.15 : 0;
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
      if (qaStillMode) {
        if (frameCount < 3) {
          stagedFrameTimer = window.setTimeout(() => {
            raf = window.requestAnimationFrame(render);
          }, frameCount === 2 ? 1_200 : 180);
        }
      } else {
        raf = window.requestAnimationFrame(render);
      }
    };
    // Let React finish committing the view transition before the first heavy shader compile.
    raf = window.requestAnimationFrame(render);
    setIsReady(true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(stagedFrameTimer);
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
      revealBackdrop.geometry.dispose();
      revealBackdropMaterial.dispose();
      presentationFrame.children.forEach((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
      presentationGold.dispose();
      premiumEnvironment.dispose();
      composer?.dispose();
      delete (window as unknown as { __vaultIslandLabQa?: VaultIslandLabQaSnapshot }).__vaultIslandLabQa;
      delete (window as unknown as { __vaultIslandLabQaControls?: typeof qaControls }).__vaultIslandLabQaControls;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [autoOrbit, availableTreasureIds, cameraPreset, effectiveExteriorFill, effectiveHoldingsValue, hasOwnershipFilter, ownedUpgradeKey, qaStillMode, quality, requestedYaw, vaultProgress, view]);

  return (
    <main className={`vault-island-lab${embedded ? ' vault-island-lab--embedded' : ''}${cleanPresentationMode ? ' vault-island-lab--clean' : ''}`}>
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
          <strong>{view === 'vault' ? 'Vault Room' : view === 'garden' ? 'Garden Gallery' : view === 'atrium' ? 'Palace Atrium' : 'Vault Island'}</strong>
          <span>{view === 'vault'
            ? effectiveHoldingsValue === null
              ? `${availableTreasureIds.length}/${VAULT_TREASURE_DEFINITIONS.length} relics · ${collectionValue.toLocaleString()}`
              : `${availableTreasureIds.length}/${VAULT_TREASURE_DEFINITIONS.length} relics · ${effectiveHoldingsValue.toLocaleString()} reserve`
            : view === 'garden' ? 'Royal gardens' : view === 'atrium' ? 'Descent' : 'Special'}</span>
          {embedded && onClose ? (
            <button type="button" className="vault-island-lab__close" aria-label="Close Vault Island" onClick={onClose} autoFocus>
              ×
            </button>
          ) : null}
        </div>
        {view === 'exterior' && !renderError ? (
          <div className="vault-island-lab__perimeter-selector" role="group" aria-label="Vault perimeter style">
            {perimeterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={option.id === perimeterStyle ? 'is-active' : ''}
                aria-pressed={option.id === perimeterStyle}
                title={`${option.label} perimeter`}
                onClick={() => setPerimeterStyle(option.id)}
              >
                <span className={`vault-island-lab__perimeter-swatch is-${option.id}`} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {view === 'exterior' && showDevelopment && vaultProgress !== undefined ? (
          <section className="vault-island-lab__development" aria-label="Develop Vault Island">
            <header>
              <div>
                <span>Estate ledger</span>
                <strong>Develop the Vault</strong>
              </div>
              <button type="button" aria-label="Close development ledger" onClick={() => setShowDevelopment(false)}>×</button>
            </header>
            <div className="vault-island-lab__development-balance">
              <span>{effectiveHoldingsValue?.toLocaleString() ?? 0} Essence available</span>
              <span>{vaultTotalInvested.toLocaleString()} invested</span>
            </div>
            <div className="vault-island-lab__development-list">
              {(['construction', 'security'] as const).map((category) => (
                <div key={category} className="vault-island-lab__development-group">
                  <h2>{category === 'construction' ? 'Palace works' : 'Royal security'}</h2>
                  {VAULT_ISLAND_UPGRADES.filter((upgrade) => upgrade.category === category).map((upgrade) => {
                    const owned = ownedVaultUpgradeIds.has(upgrade.id);
                    const prerequisitesMet = areVaultIslandUpgradePrerequisitesMet(normalizedVaultProgress, upgrade.id);
                    const affordable = (effectiveHoldingsValue ?? 0) >= upgrade.cost;
                    return (
                      <button
                        key={upgrade.id}
                        type="button"
                        className={owned ? 'is-owned' : ''}
                        disabled={owned || !prerequisitesMet || !onPurchaseVaultUpgrade}
                        onClick={() => purchaseUpgrade(upgrade.id)}
                      >
                        <span className="vault-island-lab__development-mark" aria-hidden="true">{owned ? '✓' : category === 'security' ? '◆' : '▲'}</span>
                        <span className="vault-island-lab__development-copy">
                          <strong>{upgrade.name}</strong>
                          <small>{upgrade.description}</small>
                        </span>
                        <span className="vault-island-lab__development-price">
                          {owned ? 'Built' : prerequisitesMet ? `${upgrade.cost.toLocaleString()} E` : 'Locked'}
                          {!owned && prerequisitesMet && !affordable ? <small>Need more</small> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            {developmentNotice ? <p className="vault-island-lab__development-notice" aria-live="polite">{developmentNotice}</p> : null}
          </section>
        ) : null}
        {!renderError ? <div className="vault-island-lab__hud vault-island-lab__hud--bottom">
          <button type="button" onClick={() => setView((value) => (value === 'exterior' ? 'atrium' : value === 'atrium' ? 'vault' : 'atrium'))}>
            {view === 'exterior' ? 'Enter palace' : view === 'atrium' ? 'Descend to vault' : 'Palace atrium'}
          </button>
          {view === 'atrium' ? <button type="button" onClick={() => setView('garden')}>Gardens</button> : null}
          {view !== 'exterior' ? <button type="button" onClick={() => setView('exterior')}>Exterior</button> : null}
          <button
            type="button"
            className="vault-island-lab__casino-button"
            onClick={openCasino}
            aria-label={casinoAvailableGameId ? 'Casino, a Vault game is available' : 'Casino'}
          >
            <span className="vault-island-lab__casino-icon" aria-hidden="true"><i /><i /><i /></span>
            Casino
            {casinoAvailableGameId ? <span className="vault-island-lab__casino-dot" aria-hidden="true" /> : null}
          </button>
          {view === 'exterior' && vaultProgress !== undefined ? (
            <button
              type="button"
              className="vault-island-lab__develop-button"
              aria-expanded={showDevelopment}
              onClick={() => setShowDevelopment((value) => !value)}
            >
              Develop
              <span>{normalizedVaultProgress.purchasedUpgradeIds.length}/7</span>
            </button>
          ) : null}
          {!cleanPresentationMode ? <button type="button" onClick={() => setAutoOrbit((value) => !value)}>
            {autoOrbit ? 'Orbit on' : 'Orbit off'}
          </button> : null}
          {!cleanPresentationMode ? (
            <button type="button" onClick={() => setShowReference((value) => !value)}>
              {showReference ? '3D view' : 'Source'}
            </button>
          ) : null}
          {!cleanPresentationMode ? (
            <button type="button" onClick={() => { window.location.href = VAULT_ISLAND_LAB_ROUTES.treasureLab; }}>
              Treasure lab
            </button>
          ) : null}
        </div> : (
          <div className="vault-island-lab__hud vault-island-lab__hud--bottom vault-island-lab__hud--fallback">
            <button type="button" onClick={() => setView((value) => (value === 'vault' ? 'exterior' : 'vault'))}>
              {view === 'vault' ? 'Back to palace' : 'Collection register'}
            </button>
            <button
              type="button"
              className="vault-island-lab__casino-button"
              onClick={openCasino}
              aria-label={casinoAvailableGameId ? 'Casino, a Vault game is available' : 'Casino'}
            >
              <span className="vault-island-lab__casino-icon" aria-hidden="true"><i /><i /><i /></span>
              Casino
              {casinoAvailableGameId ? <span className="vault-island-lab__casino-dot" aria-hidden="true" /> : null}
            </button>
          </div>
        )}
        {view === 'vault' && availableTreasureIds.length > 0 ? (
          <article className={`vault-island-lab__treasure-card${isMuseumCardExpanded ? ' is-expanded' : ''}${featuredTreasureId === selectedTreasureId ? ' is-featured-relic' : ''}${revealRun > 0 ? ' is-reveal-active' : ''}`} aria-live="polite">
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
            {isMuseumCardExpanded ? (
              <div className="vault-island-lab__treasure-meta">
                <span>{selectedTreasure.rarity}</span>
                <span>{selectedCollectionEntry?.accessionNumber ?? 'Museum value'}</span>
              </div>
            ) : null}
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
        <div className="vault-island-lab__quality vault-island-lab__quality--perimeter" role="group" aria-label="Perimeter style">
          {perimeterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={option.id === perimeterStyle ? 'is-active' : ''}
              onClick={() => setPerimeterStyle(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {buildTunerMode ? (
          <VaultIslandBuildTuner
            exteriorFill={exteriorFill}
            vaultInteriorFill={vaultInteriorFill}
            gigaCharmFill={gigaCharmFill}
            onExteriorFillChange={setExteriorFill}
            onVaultInteriorFillChange={setVaultInteriorFill}
            onGigaCharmFillChange={setGigaCharmFill}
          />
        ) : null}
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
            <dd>{view === 'vault' ? 'vault interior' : view === 'garden' ? 'garden gallery' : view === 'atrium' ? 'palace descent' : 'island exterior'}</dd>
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
