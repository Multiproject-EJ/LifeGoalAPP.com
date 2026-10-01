import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import {
  resolveTravelInterludeRouteProgress,
  type TravelInterludePlan,
} from '../services/islandTravelInterlude';
import { createShipTravelInteriorScene } from '../dev/ShipTravelInteriorScene';
import { ISLAND_3D_LEARNED_TIER_STORAGE_KEY, parseIsland3DLearnedTier } from '../services/islandRun3DAdaptiveQuality';
import { useControllerShopScrollLock } from './living-controller/useControllerShopScrollLock';
import './IslandTravelInterlude.css';

/**
 * Cozy travel interlude: a calm cut inside the expedition ship between
 * islands, with a route strip linking where you were to where you're going.
 * Presentation only — the parent runs the canonical travel underneath and
 * finishes when this calls `onComplete` (end of scene or Skip).
 */
export function IslandTravelInterlude({ plan, onComplete, previewProgress }: {
  plan: TravelInterludePlan;
  onComplete: () => void;
  /** Dev capture seam: freeze the interlude at this progress (0..1). */
  previewProgress?: number;
}) {
  useControllerShopScrollLock();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);
  const [webglFailed, setWebglFailed] = useState(false);

  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return undefined;
    let renderer: THREE.WebGLRenderer | null = null;
    let interior: ReturnType<typeof createShipTravelInteriorScene> | null = null;
    try {
      // Follow the board's remembered device tier when there is one.
      let learnedTier: string | null = null;
      try { learnedTier = parseIsland3DLearnedTier(window.localStorage.getItem(ISLAND_3D_LEARNED_TIER_STORAGE_KEY), Date.now())?.tier ?? null; } catch { learnedTier = null; }
      const lowEnd = learnedTier ? learnedTier === 'low' : typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, alpha: false, powerPreference: 'high-performance' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      interior = createShipTravelInteriorScene(plan.vignette, lowEnd ? 'low' : 'high');
    } catch {
      renderer?.dispose();
      renderer = null;
      setWebglFailed(true);
    }

    const litPath = root.querySelector<SVGPathElement>('.island-travel-interlude__path-lit');
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsedMs = previewProgress === undefined ? now - start : previewProgress * plan.durationMs;
      const progress = Math.min(1, elapsedMs / plan.durationMs);
      const route = resolveTravelInterludeRouteProgress(elapsedMs, plan.durationMs);
      root.style.setProperty('--travel-route-progress', String(route));
      // The track arcs up between the islands; lift the ship to follow it.
      root.style.setProperty('--travel-route-lift', String(4 * route * (1 - route)));
      if (litPath) litPath.style.strokeDashoffset = String(100 - route * 100);
      root.style.setProperty('--travel-interlude-progress', String(progress));
      if (renderer && interior) {
        const rect = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
        const width = Math.max(1, Math.round(rect.width * pixelRatio));
        const height = Math.max(1, Math.round(rect.height * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) renderer.setSize(width, height, false);
        interior.update({
          elapsedSeconds: elapsedMs / 1000,
          progress,
          reducedMotion: plan.reducedMotion,
          aspect: rect.width / Math.max(1, rect.height),
        });
        renderer.render(interior.scene, interior.camera);
      }
      if (progress >= 1 && previewProgress === undefined) {
        complete();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      interior?.dispose();
      renderer?.dispose();
    };
    // The plan is fixed for the lifetime of one interlude.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={rootRef}
      className="island-travel-interlude"
      data-vignette={plan.vignette}
      data-reduced-motion={plan.reducedMotion ? 'true' : 'false'}
      data-webgl={webglFailed ? 'failed' : 'ok'}
      role="dialog"
      aria-modal="true"
      aria-label={`Traveling to Island ${plan.to.islandNumber}`}
    >
      <canvas ref={canvasRef} className="island-travel-interlude__canvas" aria-hidden="true" />
      <div className="island-travel-interlude__vignette" aria-hidden="true" />
      <button type="button" className="island-travel-interlude__skip" onClick={complete}>Skip ›</button>
      <p className="island-travel-interlude__caption">{plan.caption}</p>
      <div className="island-travel-interlude__route" aria-label={`Route from ${plan.from.name} to ${plan.to.name}`}>
        <figure className="island-travel-interlude__node island-travel-interlude__node--from" style={{ ['--node-tint' as string]: plan.from.eraTint }}>
          <img src={plan.from.art} alt="" />
          <figcaption><small>Island {plan.from.islandNumber}</small>{plan.from.name}</figcaption>
        </figure>
        <div className="island-travel-interlude__track" aria-hidden="true">
          <svg viewBox="0 0 100 24" preserveAspectRatio="none">
            <path className="island-travel-interlude__path" d="M2 18 C 30 2, 70 2, 98 18" pathLength={100} />
            <path className="island-travel-interlude__path-lit" d="M2 18 C 30 2, 70 2, 98 18" pathLength={100} />
          </svg>
          <span className="island-travel-interlude__ship">🚀</span>
        </div>
        <figure className="island-travel-interlude__node island-travel-interlude__node--to" style={{ ['--node-tint' as string]: plan.to.eraTint }}>
          <img src={plan.to.art} alt="" />
          <figcaption><small>Island {plan.to.islandNumber}</small>{plan.to.name}</figcaption>
        </figure>
      </div>
    </div>,
    document.body,
  );
}
