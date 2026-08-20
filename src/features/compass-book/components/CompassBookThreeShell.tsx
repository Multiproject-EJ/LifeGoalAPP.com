import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { COMPASS_BOOK_PAGE_IDS, type CompassBookPageId } from '../logic/reading';
import {
  createCompassBookThreeModel,
  type CompassBookThreeModel,
  type CompassBookThreeQuality,
} from '../three/CompassBookThreeModel';

type Props = {
  activePageId: CompassBookPageId;
  open: boolean;
  turnKey: number;
  turnMs: number;
  showQuestLedger: boolean;
  onSelectPage: (pageId: CompassBookPageId) => void;
  onBackgroundClick: () => void;
};

function selectQuality(): CompassBookThreeQuality {
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
  const turnRef = useRef({ startedAt: 0, duration: 0, direction: 1 as -1 | 1 });
  const [status, setStatus] = useState<'warming' | 'ready' | 'fallback'>('warming');
  const quality = useMemo(selectQuality, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

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
      return undefined;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = quality === 'high';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.55 : 1));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    cameraRef.current = camera;
    const model = createCompassBookThreeModel(quality);
    modelRef.current = model;
    model.setActivePage(activePageRef.current);
    scene.add(model.root);

    scene.add(new THREE.HemisphereLight(0xdce1ff, 0x120a25, quality === 'high' ? 1.75 : 1.45));
    const key = new THREE.DirectionalLight(0xffe5a4, quality === 'high' ? 5.1 : 3.8);
    key.position.set(-6, 12, 8);
    key.castShadow = quality === 'high';
    key.shadow.mapSize.set(768, 768);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7755ff, quality === 'high' ? 1.3 : 0.9);
    rim.position.set(7, 5, -8);
    scene.add(rim);

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

      const pageTurn = turnRef.current;
      const rawTurn = pageTurn.duration <= 0 ? 1 : (now - pageTurn.startedAt) / pageTurn.duration;
      model.setPageTurnProgress(THREE.MathUtils.clamp(rawTurn, 0, 1), pageTurn.direction);

      const compact = width / height < 0.62;
      const distance = THREE.MathUtils.lerp(compact ? 24 : 18.2, compact ? 45 : 18.8, openProgress);
      camera.position.set(
        THREE.MathUtils.lerp(compact ? 2 : 1.55, 0, openProgress),
        distance * THREE.MathUtils.lerp(compact ? 0.62 : 0.67, 0.74, openProgress),
        distance * THREE.MathUtils.lerp(compact ? 0.68 : 0.64, 0.56, openProgress),
      );
      camera.lookAt(0.28 * (1 - openProgress), THREE.MathUtils.lerp(0.18, compact ? -2.15 : 0.18, openProgress), 0.08);
      renderer.render(scene, camera);
      warmedFrames += 1;
      metricsFrames += 1;
      if (warmedFrames === 3) setStatus('ready');
      if (now - metricsStartedAt >= 850 && shellRef.current) {
        const elapsed = Math.max(1, now - metricsStartedAt);
        shellRef.current.dataset.fps = String(Math.round((metricsFrames * 1000) / elapsed));
        shellRef.current.dataset.renderCalls = String(renderer.info.render.calls);
        shellRef.current.dataset.renderedTriangles = String(renderer.info.render.triangles);
        shellRef.current.dataset.modelTriangles = String(model.metrics.triangles);
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
      renderer.dispose();
      modelRef.current = null;
      cameraRef.current = null;
    };
  }, [onBackgroundClick, onSelectPage, quality, showQuestLedger]);

  return (
    <div
      ref={shellRef}
      className={`compass-book-three-shell compass-book-three-shell--${status}`}
      data-quality={quality}
      data-active-page={activePageId}
      data-open={open ? 'true' : 'false'}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="compass-book-three-shell__canvas" />
    </div>
  );
}
