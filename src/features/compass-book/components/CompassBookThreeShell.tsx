import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { COMPASS_BOOK_PAGE_IDS, type CompassBookPageId } from '../logic/reading';
import {
  createCompassBookThreeModel,
  type CompassBookThreeModel,
  type CompassBookThreeQuality,
} from '../three/CompassBookThreeModel';
import { parseCompassBookProfileQuality } from '../logic/deviceProfiling';

type Props = {
  activePageId: CompassBookPageId;
  open: boolean;
  turnKey: number;
  turnMs: number;
  showQuestLedger: boolean;
  celebrationKey: number;
  celebrationKind: 'fragment' | 'chapter';
  celebrationIssuedAt: number;
  islandEntranceActive: boolean;
  islandEntranceDurationMs: number;
  onAvailabilityChange: (available: boolean) => void;
  onSelectPage: (pageId: CompassBookPageId) => void;
  onBackgroundClick: () => void;
};

function selectQuality(): CompassBookThreeQuality {
  if (import.meta.env.DEV || import.meta.env.VITE_COMPASS_BOOK_PROFILE_ENABLED === 'true') {
    const forced = parseCompassBookProfileQuality(
      new URLSearchParams(window.location.search).get('compass3dQuality'),
    );
    if (forced) return forced;
  }
  const deviceMemory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8);
  const constrained = window.innerWidth < 520 || deviceMemory <= 4 || navigator.hardwareConcurrency <= 4;
  return constrained ? 'low' : 'high';
}

function easeToward(current: number, target: number, deltaSeconds: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-deltaSeconds * 5.1));
}

/**
 * Presentation-only living-book layer. The DOM book remains the sole owner of
 * content, forms, focus, scrolling, persistence, and accessible navigation.
 */
export function CompassBookThreeShell({
  activePageId,
  open,
  turnKey,
  turnMs,
  showQuestLedger,
  celebrationKey,
  celebrationKind,
  celebrationIssuedAt,
  islandEntranceActive,
  islandEntranceDurationMs,
  onAvailabilityChange,
  onSelectPage,
  onBackgroundClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<CompassBookThreeModel | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const openRef = useRef(open);
  const activePageRef = useRef(activePageId);
  const reducedMotionRef = useRef(false);
  const celebrationRef = useRef({ key: 0, startedAt: -Infinity });
  const celebrationKindRef = useRef(celebrationKind);
  const islandEntranceRef = useRef({ active: islandEntranceActive, startedAt: 0 });
  const turnRef = useRef({ startedAt: 0, duration: 0, direction: 1 as -1 | 1 });
  const [status, setStatus] = useState<'warming' | 'ready' | 'fallback'>('warming');
  const [celebrating, setCelebrating] = useState(false);
  const quality = useMemo(selectQuality, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    celebrationKindRef.current = celebrationKind;
  }, [celebrationKind]);

  useEffect(() => {
    const entrance = islandEntranceRef.current;
    if (islandEntranceActive && !entrance.active) entrance.startedAt = performance.now();
    if (islandEntranceActive && entrance.startedAt === 0) entrance.startedAt = performance.now();
    entrance.active = islandEntranceActive;
  }, [islandEntranceActive]);

  useEffect(() => {
    if (celebrationKey <= 0 || celebrationKey === celebrationRef.current.key) return undefined;
    const age = performance.now() - celebrationIssuedAt;
    if (age > 2200) return undefined;
    celebrationRef.current = { key: celebrationKey, startedAt: celebrationIssuedAt };
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), Math.max(0, 1800 - age));
    return () => window.clearTimeout(timer);
  }, [celebrationIssuedAt, celebrationKey]);

  useEffect(() => {
    const previous = activePageRef.current;
    activePageRef.current = activePageId;
    modelRef.current?.setActivePage(activePageId);
    if (previous === activePageId) return;
    const from = COMPASS_BOOK_PAGE_IDS.indexOf(previous);
    const to = COMPASS_BOOK_PAGE_IDS.indexOf(activePageId);
    turnRef.current = {
      startedAt: performance.now(),
      duration: reducedMotionRef.current ? 0 : Math.max(420, turnMs || 520),
      direction: to < from ? -1 : 1,
    };
  }, [activePageId, turnKey, turnMs]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotionRef.current = media?.matches ?? false; };
    update();
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (
      import.meta.env.DEV
      && new URLSearchParams(window.location.search).get('compass3d') === 'fallback'
    ) {
      setStatus('fallback');
      onAvailabilityChange(false);
      return undefined;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: quality === 'high',
        powerPreference: quality === 'high' ? 'high-performance' : 'default',
      });
    } catch (error) {
      console.warn('[compass-book-three] WebGL unavailable; using the complete DOM book.', error);
      setStatus('fallback');
      onAvailabilityChange(false);
      return undefined;
    }
    onAvailabilityChange(true);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = quality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.55 : 1));
    if (
      (import.meta.env.DEV || import.meta.env.VITE_COMPASS_BOOK_PROFILE_ENABLED === 'true')
      && shellRef.current
    ) {
      const gl = renderer.getContext();
      const debugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info') as {
        UNMASKED_VENDOR_WEBGL: number;
        UNMASKED_RENDERER_WEBGL: number;
      } | null;
      shellRef.current.dataset.gpuVendor = String(
        gl.getParameter(debugRendererInfo?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR),
      );
      shellRef.current.dataset.gpuRenderer = String(
        gl.getParameter(debugRendererInfo?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
      );
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    cameraRef.current = camera;
    const model = createCompassBookThreeModel(quality);
    modelRef.current = model;
    model.setActivePage(activePageRef.current);
    // A separate presentation root lets the Island Run entrance lift and turn
    // the artifact without interfering with the model's canonical open/page
    // transforms or its hit targets.
    const presentationRoot = new THREE.Group();
    presentationRoot.add(model.root);
    scene.add(presentationRoot);

    scene.add(new THREE.HemisphereLight(0xdce1ff, 0x120a25, quality === 'high' ? 1.25 : 1));
    const key = new THREE.DirectionalLight(0xffe5a4, quality === 'high' ? 4.4 : 3.2);
    key.position.set(-6, 12, 8);
    key.castShadow = quality === 'high';
    key.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
    key.shadow.bias = -0.00015;
    key.shadow.normalBias = 0.035;
    key.shadow.radius = quality === 'high' ? 2.5 : 1.5;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8f86ff, quality === 'high' ? 0.7 : 0.52);
    fill.position.set(6, 8, 7);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffb766, quality === 'high' ? 0.8 : 0.55);
    rim.position.set(7, 5, -8);
    scene.add(rim);
    const completionGlow = new THREE.PointLight(0xffcf58, 0, 11, 2);
    completionGlow.position.set(0.5, 4.8, 1.2);
    scene.add(completionGlow);
    const summonGlow = new THREE.PointLight(0xffc95c, 0, 14, 1.8);
    summonGlow.position.set(0, -1.4, 1.2);
    scene.add(summonGlow);
    const sigilGeometry = new THREE.RingGeometry(3.04, 3.11, quality === 'high' ? 72 : 40);
    const innerSigilGeometry = new THREE.RingGeometry(2.25, 2.3, quality === 'high' ? 64 : 36);
    const sigilMaterial = new THREE.MeshBasicMaterial({
      color: 0xf0bd50,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const summonSigil = new THREE.Mesh(sigilGeometry, sigilMaterial);
    summonSigil.rotation.x = -Math.PI / 2;
    summonSigil.position.set(0, -3.25, 0.5);
    scene.add(summonSigil);
    const innerSummonSigil = new THREE.Mesh(innerSigilGeometry, sigilMaterial);
    innerSummonSigil.rotation.x = -Math.PI / 2;
    innerSummonSigil.position.copy(summonSigil.position);
    scene.add(innerSummonSigil);

    let width = 1;
    let height = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const findTarget = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObject(model.root, true)) {
        const pageId = model.getPageTarget(hit.object);
        if (!pageId) continue;
        if (pageId === 'quest_ledger' && !showQuestLedger) return null;
        return COMPASS_BOOK_PAGE_IDS.includes(pageId as CompassBookPageId)
          ? pageId as CompassBookPageId
          : null;
      }
      return null;
    };
    const onPointerMove = (event: PointerEvent) => {
      canvas.style.cursor = findTarget(event) ? 'pointer' : 'default';
    };
    const onPointerUp = (event: PointerEvent) => {
      const target = findTarget(event);
      if (target) onSelectPage(target);
      else onBackgroundClick();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setStatus('fallback');
      onAvailabilityChange(false);
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('webglcontextlost', onContextLost);

    let frame = 0;
    let lastTime = performance.now();
    let openProgress = openRef.current ? 1 : 0;
    let warmedFrames = 0;
    let metricsStartedAt = lastTime;
    let metricsFrames = 0;
    const animate = (now: number) => {
      frame = window.requestAnimationFrame(animate);
      const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const target = openRef.current ? 1 : 0;
      openProgress = reducedMotionRef.current ? target : easeToward(openProgress, target, deltaSeconds);
      model.setOpenProgress(openProgress);
      model.animate(now / 1000, reducedMotionRef.current);

      const celebrationAge = now - celebrationRef.current.startedAt;
      const celebrationProgress = THREE.MathUtils.clamp(celebrationAge / 1800, 0, 1);
      const celebrationStrength = celebrationAge >= 0 && celebrationAge < 1800
        ? (1 - celebrationProgress) * (0.58 + Math.sin(celebrationProgress * Math.PI * 5) * 0.22)
        : 0;
      model.setCelebrationProgress(
        celebrationProgress,
        celebrationStrength,
        celebrationKindRef.current,
        reducedMotionRef.current,
      );
      completionGlow.intensity = reducedMotionRef.current
        ? celebrationStrength * 2.2
        : celebrationStrength * (celebrationKindRef.current === 'chapter' ? 8.5 : 5.8);

      const pageTurn = turnRef.current;
      const rawTurn = pageTurn.duration <= 0 ? 1 : (now - pageTurn.startedAt) / pageTurn.duration;
      model.setPageTurnProgress(THREE.MathUtils.clamp(rawTurn, 0, 1), pageTurn.direction);

      const compact = width / height < 0.62;
      const entrance = islandEntranceRef.current;
      const entranceAge = Math.max(0, now - entrance.startedAt);
      const entranceRaw = entrance.active
        ? THREE.MathUtils.clamp(entranceAge / (islandEntranceDurationMs * 0.81), 0, 1)
        : 1;
      const entranceProgress = 1 - (1 - entranceRaw) ** 3;
      const entranceLift = 1 - entranceProgress;
      presentationRoot.scale.setScalar(THREE.MathUtils.lerp(0.68, 1, entranceProgress));
      presentationRoot.position.set(
        THREE.MathUtils.lerp(compact ? 0 : 4.2, 0, entranceProgress),
        THREE.MathUtils.lerp(-2.35, 0, entranceProgress),
        THREE.MathUtils.lerp(-1.4, 0, entranceProgress),
      );
      presentationRoot.rotation.set(
        THREE.MathUtils.lerp(-0.08, 0, entranceProgress),
        THREE.MathUtils.lerp(-0.26, 0, entranceProgress),
        THREE.MathUtils.lerp(0.065, 0, entranceProgress),
      );
      sigilMaterial.opacity = entrance.active
        ? Math.sin(entranceProgress * Math.PI) * 0.58
        : 0;
      summonSigil.scale.setScalar(THREE.MathUtils.lerp(0.72, 1.22, entranceProgress));
      summonSigil.rotation.z = entranceProgress * -0.34;
      innerSummonSigil.scale.copy(summonSigil.scale);
      innerSummonSigil.rotation.z = summonSigil.rotation.z + 0.16;
      summonGlow.intensity = entrance.active ? entranceLift * 7.2 : 0;

      const distance = THREE.MathUtils.lerp(compact ? 24 : 18.2, compact ? 45 : 18.8, openProgress)
        + entranceLift * (compact ? 6.2 : 3.8);
      camera.position.set(
        THREE.MathUtils.lerp(compact ? 2 : 1.55, 0, openProgress) + entranceLift * 1.2,
        distance * THREE.MathUtils.lerp(compact ? 0.62 : 0.67, 0.74, openProgress)
          - entranceLift * 1.1,
        distance * THREE.MathUtils.lerp(compact ? 0.68 : 0.64, 0.56, openProgress),
      );
      camera.lookAt(
        0.28 * (1 - openProgress),
        THREE.MathUtils.lerp(0.18, compact ? -2.15 : 0.18, openProgress)
          - entranceLift * 0.9,
        0.08,
      );
      renderer.render(scene, camera);
      warmedFrames += 1;
      metricsFrames += 1;
      if (warmedFrames === 3) setStatus('ready');
      if (now - metricsStartedAt >= 850 && shellRef.current) {
        const elapsed = Math.max(1, now - metricsStartedAt);
        const rendererSize = renderer.getSize(new THREE.Vector2());
        shellRef.current.dataset.fps = String(Math.round((metricsFrames * 1000) / elapsed));
        shellRef.current.dataset.renderCalls = String(renderer.info.render.calls);
        shellRef.current.dataset.renderedTriangles = String(renderer.info.render.triangles);
        shellRef.current.dataset.modelTriangles = String(model.metrics.triangles);
        shellRef.current.dataset.rendererWidth = String(Math.round(rendererSize.x * renderer.getPixelRatio()));
        shellRef.current.dataset.rendererHeight = String(Math.round(rendererSize.y * renderer.getPixelRatio()));
        metricsStartedAt = now;
        metricsFrames = 0;
      }
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      model.dispose();
      sigilGeometry.dispose();
      innerSigilGeometry.dispose();
      sigilMaterial.dispose();
      renderer.dispose();
      modelRef.current = null;
      cameraRef.current = null;
    };
  }, [islandEntranceDurationMs, onAvailabilityChange, onBackgroundClick, onSelectPage, quality, showQuestLedger]);

  return (
    <div
      ref={shellRef}
      className={`compass-book-three-shell compass-book-three-shell--${status}`}
      data-quality={quality}
      data-active-page={activePageId}
      data-open={open ? 'true' : 'false'}
      data-celebrating={celebrating ? 'true' : 'false'}
      data-celebration-kind={celebrationKind}
      data-entrance={islandEntranceActive ? 'island_summon' : 'idle'}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="compass-book-three-shell__canvas" />
      <div className="compass-book-three-shell__ceremony">
        <span>{celebrationKind === 'chapter' ? 'Chapter sealed' : 'Fragment inscribed'}</span>
      </div>
    </div>
  );
}
