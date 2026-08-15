import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { createEggHatchThreeModel, type EggHatchQuality, type EggHatchThreeModel } from '../dev/EggHatchThreeModel';
import { applyCreatureArtFallback } from './creatureArtFallback';
import {
  EGG_HATCH_PALETTES,
  getEggHatchPalette,
  resolveEggHatchRuntimeQuality,
  resolveEggHatchPose,
  type EggHatchPaletteId,
  type EggHatchPhase,
  type EggHatchTier,
} from '../services/eggHatchThreePresentation';

export interface CreatureHatchThreeExperienceProps {
  tier: EggHatchTier;
  initialPaletteId?: EggHatchPaletteId;
  quality?: EggHatchQuality;
  /** Dev/evidence seam. Omit in production to preserve the device preference. */
  reducedMotionOverride?: boolean;
  /** Dev/evidence seam. Profiles completed renderer.render calls, never raw rAF callbacks. */
  profile?: boolean;
  showPaletteControls?: boolean;
  showReplayControl?: boolean;
  fallbackImageSrc?: string;
  fallbackPngSrc?: string;
  fallbackSilhouetteSrc?: string;
  fallbackAlt?: string;
  pausedAtSeconds?: number | null;
  previewOrbitDegrees?: number;
  isolateCreature?: boolean;
  onPhaseChange?: (phase: EggHatchPhase) => void;
  className?: string;
}

export interface EggHatchRenderProfileSummary {
  durationMs: number;
  sampleCount: number;
  averageFps: number;
  p95FrameMs: number;
  worstFrameMs: number;
  slowFrameCount: number;
  slowFramePercent: number;
  slowFrameThresholdMs: number;
}

export interface EggHatchRenderProfileReport extends EggHatchRenderProfileSummary {
  schema: 'egg-hatch-3d-profile-v1';
  tier: EggHatchTier;
  quality: EggHatchQuality;
  reducedMotion: boolean;
  pausedAtSeconds: number | null;
  warmupMs: number;
  targetDurationMs: number;
  drawCalls: number;
  triangles: number;
  maxDrawCalls: number;
  maxTriangles: number;
  rendererWidth: number;
  rendererHeight: number;
  pixelRatio: number;
  capturedAt: string;
}

export const EGG_HATCH_PROFILE_EVENT_NAME = 'habitgame:egg-hatch-profile';
export const EGG_HATCH_PROFILE_WARMUP_MS = 2_000;
export const EGG_HATCH_PROFILE_DURATION_MS = 10_000;

const EGG_HATCH_PROFILE_SLOW_FRAME_MS: Record<EggHatchQuality, number> = {
  low: 40,
  high: 25,
};

const roundProfileMetric = (value: number) => Math.round(value * 10) / 10;

export function summarizeEggHatchRenderProfile(
  frameTimesMs: readonly number[],
  quality: EggHatchQuality,
): EggHatchRenderProfileSummary {
  const samples = frameTimesMs
    .filter((sample) => Number.isFinite(sample) && sample > 0)
    .slice()
    .sort((left, right) => left - right);
  const slowFrameThresholdMs = EGG_HATCH_PROFILE_SLOW_FRAME_MS[quality];
  if (samples.length === 0) {
    return {
      durationMs: 0,
      sampleCount: 0,
      averageFps: 0,
      p95FrameMs: 0,
      worstFrameMs: 0,
      slowFrameCount: 0,
      slowFramePercent: 0,
      slowFrameThresholdMs,
    };
  }

  const durationMs = samples.reduce((total, sample) => total + sample, 0);
  const p95Index = Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1);
  const slowFrameCount = samples.filter((sample) => sample > slowFrameThresholdMs).length;
  return {
    durationMs: Math.round(durationMs),
    sampleCount: samples.length,
    averageFps: roundProfileMetric((samples.length * 1000) / durationMs),
    p95FrameMs: roundProfileMetric(samples[p95Index]),
    worstFrameMs: roundProfileMetric(samples[samples.length - 1]),
    slowFrameCount,
    slowFramePercent: roundProfileMetric((slowFrameCount / samples.length) * 100),
    slowFrameThresholdMs,
  };
}

const PHASE_COPY: Record<EggHatchPhase, string> = {
  settle: 'Something is moving inside…',
  wiggle: 'The shell is wobbling!',
  cracking: 'Cracks are spreading',
  burst: 'The egg is hatching!',
  peek: 'A bright eye peeks out…',
  reveal: 'Sproutling!',
  complete: 'Meet your new Sproutling',
};

export function CreatureHatchThreeExperience({
  tier,
  initialPaletteId = 'verdant',
  quality,
  reducedMotionOverride,
  profile = false,
  showPaletteControls = false,
  showReplayControl = false,
  fallbackImageSrc,
  fallbackPngSrc,
  fallbackSilhouetteSrc,
  fallbackAlt = 'Revealed creature',
  pausedAtSeconds = null,
  previewOrbitDegrees = 0,
  isolateCreature = false,
  onPhaseChange,
  className = '',
}: CreatureHatchThreeExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<EggHatchThreeModel | null>(null);
  const animationStartRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<EggHatchPhase>('settle');
  const onPhaseChangeRef = useRef(onPhaseChange);
  const [paletteId, setPaletteId] = useState<EggHatchPaletteId>(initialPaletteId);
  const [replayKey, setReplayKey] = useState(0);
  const [contextRetryKey, setContextRetryKey] = useState(0);
  const [phase, setPhase] = useState<EggHatchPhase>(() => resolveEggHatchPose(pausedAtSeconds ?? 0).phase);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
    [],
  );
  const usesReducedMotion = reducedMotionOverride ?? prefersReducedMotion;
  const resolvedQuality = useMemo<EggHatchQuality>(() => {
    if (quality) return quality;
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'low';
    const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
    return resolveEggHatchRuntimeQuality({
      deviceMemoryGb: navigatorWithMemory.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      prefersReducedMotion: usesReducedMotion,
    });
  }, [quality, usesReducedMotion]);

  useEffect(() => {
    setPaletteId(initialPaletteId);
  }, [initialPaletteId]);

  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  }, [onPhaseChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    setError(null);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: resolvedQuality === 'high',
        alpha: true,
        powerPreference: 'default',
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      setError('3D preview is unavailable on this device.');
      return undefined;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.01;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setError('The 3D scene paused to protect graphics memory.');
    };
    const handleContextRestored = () => {
      setError(null);
      setContextRetryKey((value) => value + 1);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.48, 6.45);
    camera.lookAt(0, 0.14, 0);

    const hemisphere = new THREE.HemisphereLight('#f6f5ed', '#596044', 1.08);
    scene.add(hemisphere);
    const key = new THREE.DirectionalLight('#fff4e2', 2.72);
    key.position.set(-3.6, 6.8, 5.4);
    key.castShadow = true;
    key.shadow.mapSize.set(resolvedQuality === 'high' ? 1024 : 512, resolvedQuality === 'high' ? 1024 : 512);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -4;
    scene.add(key);
    const fill = new THREE.PointLight('#d9edff', 1.72, 12, 2);
    fill.position.set(3.4, 1.1, 3.5);
    scene.add(fill);
    const rim = new THREE.SpotLight('#efffdf', 2.65, 14, Math.PI / 5, 0.65, 1.5);
    rim.position.set(0.7, 5.5, -4.4);
    rim.target.position.set(0, 0.4, 0);
    scene.add(rim, rim.target);

    const model = createEggHatchThreeModel({ tier, paletteId, quality: resolvedQuality });
    modelRef.current = model;
    scene.add(model.root);
    animationStartRef.current = null;

    let animationFrame = 0;
    let lastRenderTime = 0;
    const clearProfileResultDataset = () => {
      delete canvas.dataset.profileSampleCount;
      delete canvas.dataset.profileAverageFps;
      delete canvas.dataset.profileP95FrameMs;
      delete canvas.dataset.profileWorstFrameMs;
      delete canvas.dataset.profileSlowFramePercent;
      delete canvas.dataset.profileDrawCalls;
      delete canvas.dataset.profileTriangles;
      delete canvas.dataset.profileReport;
    };
    let activeProfile = profile ? {
      firstRenderedAt: null as number | null,
      sampleStartedAt: null as number | null,
      lastSampledRenderAt: null as number | null,
      frameTimesMs: [] as number[],
      maxDrawCalls: 0,
      maxTriangles: 0,
    } : null;
    if (activeProfile) {
      canvas.dataset.profileStatus = 'warming';
      canvas.dataset.profileSchema = 'egg-hatch-3d-profile-v1';
      canvas.dataset.profileQuality = resolvedQuality;
      canvas.dataset.profileReducedMotion = String(usesReducedMotion);
      clearProfileResultDataset();
    } else {
      delete canvas.dataset.profileStatus;
      delete canvas.dataset.profileSchema;
      delete canvas.dataset.profileQuality;
      delete canvas.dataset.profileReducedMotion;
      clearProfileResultDataset();
    }

    const recordRenderedFrame = (renderedAt: number) => {
      if (!activeProfile) return;
      if (activeProfile.firstRenderedAt == null) {
        activeProfile.firstRenderedAt = renderedAt;
        return;
      }
      if (activeProfile.sampleStartedAt == null) {
        if (renderedAt - activeProfile.firstRenderedAt < EGG_HATCH_PROFILE_WARMUP_MS) return;
        activeProfile.sampleStartedAt = renderedAt;
        activeProfile.lastSampledRenderAt = renderedAt;
        activeProfile.maxDrawCalls = renderer.info.render.calls;
        activeProfile.maxTriangles = renderer.info.render.triangles;
        canvas.dataset.profileStatus = 'measuring';
        return;
      }

      if (activeProfile.lastSampledRenderAt != null) {
        activeProfile.frameTimesMs.push(renderedAt - activeProfile.lastSampledRenderAt);
      }
      activeProfile.lastSampledRenderAt = renderedAt;
      activeProfile.maxDrawCalls = Math.max(activeProfile.maxDrawCalls, renderer.info.render.calls);
      activeProfile.maxTriangles = Math.max(activeProfile.maxTriangles, renderer.info.render.triangles);
      if (renderedAt - activeProfile.sampleStartedAt < EGG_HATCH_PROFILE_DURATION_MS) return;

      const rendererSize = renderer.getSize(new THREE.Vector2());
      const summary = summarizeEggHatchRenderProfile(activeProfile.frameTimesMs, resolvedQuality);
      const report: EggHatchRenderProfileReport = {
        schema: 'egg-hatch-3d-profile-v1',
        tier,
        quality: resolvedQuality,
        reducedMotion: usesReducedMotion,
        pausedAtSeconds,
        warmupMs: EGG_HATCH_PROFILE_WARMUP_MS,
        targetDurationMs: EGG_HATCH_PROFILE_DURATION_MS,
        ...summary,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        maxDrawCalls: activeProfile.maxDrawCalls,
        maxTriangles: activeProfile.maxTriangles,
        rendererWidth: Math.round(rendererSize.x * renderer.getPixelRatio()),
        rendererHeight: Math.round(rendererSize.y * renderer.getPixelRatio()),
        pixelRatio: roundProfileMetric(renderer.getPixelRatio()),
        capturedAt: new Date().toISOString(),
      };
      canvas.dataset.profileStatus = 'complete';
      canvas.dataset.profileSampleCount = String(report.sampleCount);
      canvas.dataset.profileAverageFps = String(report.averageFps);
      canvas.dataset.profileP95FrameMs = String(report.p95FrameMs);
      canvas.dataset.profileWorstFrameMs = String(report.worstFrameMs);
      canvas.dataset.profileSlowFramePercent = String(report.slowFramePercent);
      canvas.dataset.profileDrawCalls = String(report.drawCalls);
      canvas.dataset.profileTriangles = String(report.triangles);
      canvas.dataset.profileReport = JSON.stringify(report);
      canvas.dispatchEvent(new CustomEvent<EggHatchRenderProfileReport>(EGG_HATCH_PROFILE_EVENT_NAME, {
        detail: report,
        bubbles: true,
        composed: true,
      }));
      console.info('[egg-hatch-3d-profile]', report);
      activeProfile = null;
    };

    const render = (now: number) => {
      animationFrame = window.requestAnimationFrame(render);
      if (now - lastRenderTime < (resolvedQuality === 'high' ? 16 : 30)) return;
      lastRenderTime = now;
      if (animationStartRef.current == null) animationStartRef.current = now;
      const elapsedSeconds = pausedAtSeconds ?? Math.max(0, (now - animationStartRef.current) / 1000);
      const nextPhase = model.update(elapsedSeconds, usesReducedMotion);
      if (isolateCreature) {
        model.root.children.forEach((child) => {
          child.visible = child.name === 'sproutling';
        });
      }
      if (nextPhase !== lastPhaseRef.current) {
        lastPhaseRef.current = nextPhase;
        setPhase(nextPhase);
        onPhaseChangeRef.current?.(nextPhase);
      }
      model.root.rotation.y = THREE.MathUtils.degToRad(previewOrbitDegrees);
      renderer.render(scene, camera);
      recordRenderedFrame(performance.now());
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const dprCap = resolvedQuality === 'high' ? 1.75 : 1.15;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
      scene.remove(model.root);
      model.dispose();
      modelRef.current = null;
      renderer.dispose();
    };
  }, [contextRetryKey, isolateCreature, paletteId, pausedAtSeconds, previewOrbitDegrees, profile, replayKey, resolvedQuality, tier, usesReducedMotion]);

  const replay = () => {
    lastPhaseRef.current = 'settle';
    setPhase('settle');
    setReplayKey((value) => value + 1);
  };

  return (
    <div className={`creature-hatch-three${isolateCreature ? ' creature-hatch-three--isolated' : ''} ${className}`.trim()} data-phase={phase} data-tier={tier}>
      <div className={`creature-hatch-three__stage creature-hatch-three__stage--${tier}`}>
        <div className="creature-hatch-three__aura" aria-hidden="true" />
        <canvas ref={canvasRef} className="creature-hatch-three__canvas" aria-label={`3D ${tier} egg hatching into Sproutling`} />
        {error ? (
          <div className="creature-hatch-three__fallback" role="status">
            {fallbackImageSrc ? (
              <img
                className="creature-hatch-three__fallback-art"
                src={fallbackImageSrc}
                alt={fallbackAlt}
                onError={(event) => {
                  applyCreatureArtFallback(event, { pngSrc: fallbackPngSrc, silhouetteSrc: fallbackSilhouetteSrc });
                }}
              />
            ) : <span aria-hidden="true">🥚</span>}
            <p>{error} Showing the creature artwork instead.</p>
            <button type="button" onClick={() => setContextRetryKey((value) => value + 1)}>Retry 3D</button>
          </div>
        ) : null}
        <p className="creature-hatch-three__phase" aria-live="polite">{PHASE_COPY[phase]}</p>
      </div>
      {(showPaletteControls || showReplayControl) ? (
        <div className="creature-hatch-three__controls">
          {showPaletteControls ? (
            <div className="creature-hatch-three__palette" aria-label="Egg colour">
              <span>Shell colour</span>
              <div className="creature-hatch-three__swatches">
                {EGG_HATCH_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    className={`creature-hatch-three__swatch${palette.id === paletteId ? ' is-selected' : ''}`}
                    style={{ '--hatch-swatch': getEggHatchPalette(palette.id).shell } as CSSProperties}
                    aria-label={`${palette.label} shell`}
                    aria-pressed={palette.id === paletteId}
                    onClick={() => setPaletteId(palette.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {showReplayControl ? (
            <button type="button" className="creature-hatch-three__replay" onClick={replay}>
              ↻ Replay hatch
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
