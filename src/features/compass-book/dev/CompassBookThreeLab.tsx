import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  createCompassBookThreeModel,
  type CompassBookThreeModel,
  type CompassBookThreeQuality,
} from './CompassBookThreeModel';
import './CompassBookThreeLab.css';

type CompassBookThreePose = 'closed' | 'reading';

type LiveMetrics = {
  fps: number;
  calls: number;
  triangles: number;
};

const EMPTY_METRICS: LiveMetrics = { fps: 0, calls: 0, triangles: 0 };

const SIGNALS = [
  { id: 'know', label: 'Know', score: 3, state: 'Clear path', angle: 0 },
  { id: 'choose', label: 'Choose', score: 4, state: 'Strong signal', angle: 90 },
  { id: 'act', label: 'Act', score: 2, state: 'Taking shape', angle: 180 },
  { id: 'sustain', label: 'Sustain', score: 1, state: 'First clues', angle: 270 },
] as const;

function readInitialPose(): CompassBookThreePose {
  return new URLSearchParams(window.location.search).get('pose') === 'reading' ? 'reading' : 'closed';
}

function readInitialQuality(): CompassBookThreeQuality {
  return new URLSearchParams(window.location.search).get('quality') === 'low' ? 'low' : 'high';
}

function readInitialReducedMotion() {
  const requested = new URLSearchParams(window.location.search).get('reducedMotion');
  if (requested === '1') return true;
  if (requested === '0') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function readPhoneProof() {
  return new URLSearchParams(window.location.search).get('phoneProof') === '1';
}

function createStarField(quality: CompassBookThreeQuality) {
  const count = quality === 'high' ? 380 : 130;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const seed = index * 19.173;
    positions[index * 3] = Math.sin(seed * 0.73) * (11 + index % 9);
    positions[index * 3 + 1] = 1.2 + Math.cos(seed * 0.37) * (7 + index % 5);
    positions[index * 3 + 2] = -4 - (index % 13) * 1.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xd9ccff,
    size: quality === 'high' ? 0.045 : 0.065,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'COMPASS_BOOK_STAR_FIELD';
  return points;
}

function easeToward(current: number, target: number, deltaSeconds: number) {
  const amount = 1 - Math.exp(-deltaSeconds * 4.6);
  return THREE.MathUtils.lerp(current, target, amount);
}

function IlluminationCompass() {
  return (
    <div className="compass-book-three-lab__illumination" aria-label="Compass illumination">
      <div className="compass-book-three-lab__signal-core" aria-hidden="true">
        <span>✦</span>
      </div>
      {SIGNALS.map((signal) => (
        <div
          className={`compass-book-three-lab__signal compass-book-three-lab__signal--${signal.id}`}
          key={signal.id}
        >
          <strong>{signal.label}</strong>
          <span>{signal.score}/4</span>
          <small>{signal.state}</small>
        </div>
      ))}
      <div className="compass-book-three-lab__signal-rings" aria-hidden="true">
        {SIGNALS.map((signal) => (
          <i
            key={signal.id}
            style={{ '--signal-angle': `${signal.angle}deg`, '--signal-score': signal.score } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function ReadingSpread({ phoneProof }: { phoneProof: boolean }) {
  const [phonePage, setPhonePage] = useState<'signals' | 'summary'>('signals');
  return (
    <section
      className={`compass-book-three-lab__dom-spread compass-book-three-lab__dom-spread--${phonePage}`}
      aria-label="The Reading preview"
    >
      <article className="compass-book-three-lab__paper compass-book-three-lab__paper--left">
        <p className="compass-book-three-lab__kicker">Compass Book</p>
        <h1>The Reading</h1>
        <p className="compass-book-three-lab__subtitle">Where your four signals stand right now.</p>
        <IlluminationCompass />
        <p className="compass-book-three-lab__kind-note">
          These readings measure clarity and practice—not your worth.
        </p>
        {phoneProof ? (
          <button
            type="button"
            className="compass-book-three-lab__page-focus compass-book-three-lab__page-focus--next"
            onClick={() => setPhonePage('summary')}
          >
            Read your summary <span aria-hidden="true">›</span>
          </button>
        ) : null}
      </article>

      <article className="compass-book-three-lab__paper compass-book-three-lab__paper--right">
        {phoneProof ? (
          <button
            type="button"
            className="compass-book-three-lab__page-focus compass-book-three-lab__page-focus--back"
            onClick={() => setPhonePage('signals')}
          >
            <span aria-hidden="true">‹</span> Signals
          </button>
        ) : null}
        <p className="compass-book-three-lab__kicker">Your current bearing</p>
        <h2>Build what matters—and make it easier to continue.</h2>
        <div className="compass-book-three-lab__meters" aria-label="Book progress">
          <div><strong>92</strong><span>of 120 fragments</span></div>
          <div><strong>4</strong><span>of 6 chapters sealed</span></div>
          <div><strong>98</strong><span>islands travelled</span></div>
        </div>
        <div className="compass-book-three-lab__reading-copy">
          <span>What you know so far</span>
          <p>You create momentum through clear structure, then protect it with small repeatable rituals.</p>
        </div>
        <button type="button" className="compass-book-three-lab__continue">
          Continue Chapter V
          <span>Quest Forge · 12/20</span>
        </button>
      </article>

      <nav className="compass-book-three-lab__tabs" aria-label="Compass Book pages">
        {['I', 'II', 'III', 'IV', 'V', 'VI', '✦'].map((label, index) => (
          <button type="button" key={label} aria-label={index === 6 ? 'Quest Ledger' : `Chapter ${label}`}>
            {label}
          </button>
        ))}
      </nav>
    </section>
  );
}

export default function CompassBookThreeLab() {
  const phoneProof = useMemo(readPhoneProof, []);
  const [pose, setPose] = useState<CompassBookThreePose>(readInitialPose);
  const [quality, setQuality] = useState<CompassBookThreeQuality>(readInitialQuality);
  const [reducedMotion, setReducedMotion] = useState(readInitialReducedMotion);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [metrics, setMetrics] = useState<LiveMetrics>(EMPTY_METRICS);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<CompassBookThreeModel | null>(null);
  const poseRef = useRef(pose);
  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => {
    poseRef.current = pose;
  }, [pose]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    setError(null);
    setReady(false);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: quality === 'high',
        powerPreference: quality === 'high' ? 'high-performance' : 'default',
      });
    } catch (caught) {
      console.error('[compass-book-three-lab] WebGL initialization failed', caught);
      setError('The 3D layer could not start. The readable book remains available.');
      return undefined;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = quality === 'high';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.75 : 1.08));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    const model = createCompassBookThreeModel(quality);
    modelRef.current = model;
    scene.add(model.root);

    const stars = createStarField(quality);
    scene.add(stars);

    const hemisphere = new THREE.HemisphereLight(0xd9ddff, 0x120b28, quality === 'high' ? 2.8 : 2.2);
    scene.add(hemisphere);
    const key = new THREE.DirectionalLight(0xffe7aa, quality === 'high' ? 6.4 : 4.5);
    key.position.set(-6, 12, 8);
    key.castShadow = quality === 'high';
    key.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7957ff, quality === 'high' ? 3.6 : 2.4);
    rim.position.set(7, 5, -8);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8.4, quality === 'high' ? 64 : 28),
      new THREE.MeshPhysicalMaterial({
        color: 0x080916,
        roughness: 0.42,
        metalness: 0.12,
        transparent: true,
        opacity: 0.76,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.18;
    floor.receiveShadow = true;
    scene.add(floor);

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

    let frame = 0;
    let lastTime = performance.now();
    let openProgress = poseRef.current === 'reading' ? 1 : 0;
    let metricsStartedAt = lastTime;
    let metricsFrames = 0;
    const animate = (now: number) => {
      frame = window.requestAnimationFrame(animate);
      const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const target = poseRef.current === 'reading' ? 1 : 0;
      openProgress = reducedMotionRef.current
        ? target
        : easeToward(openProgress, target, deltaSeconds);
      model.setOpenProgress(openProgress);
      model.animate(now / 1000, reducedMotionRef.current);

      const compact = width / height < 0.62;
      const cameraDistance = THREE.MathUtils.lerp(compact ? 13.6 : 11.5, compact ? 15.4 : 16.8, openProgress);
      camera.position.set(
        0,
        cameraDistance * THREE.MathUtils.lerp(0.58, 0.64, openProgress),
        cameraDistance * THREE.MathUtils.lerp(0.74, 0.68, openProgress),
      );
      camera.lookAt(0, 0.2, 0);
      stars.rotation.y = reducedMotionRef.current ? 0 : now * 0.000012;
      renderer.render(scene, camera);

      metricsFrames += 1;
      if (now - metricsStartedAt >= 850) {
        const elapsed = Math.max(1, now - metricsStartedAt);
        setMetrics({
          fps: Math.round((metricsFrames * 1000) / elapsed),
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        });
        metricsFrames = 0;
        metricsStartedAt = now;
        setReady(true);
      }
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      model.dispose();
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      modelRef.current = null;
    };
  }, [quality]);

  const modelMetrics = modelRef.current?.metrics;

  return (
    <main
      className={`compass-book-three-lab ${phoneProof ? 'compass-book-three-lab--phone-proof' : ''} compass-book-three-lab--${pose}`}
      data-quality={quality}
      data-ready={ready ? 'true' : 'false'}
      data-fps={metrics.fps}
      data-render-calls={metrics.calls}
      data-rendered-triangles={metrics.triangles}
    >
      <canvas ref={canvasRef} className="compass-book-three-lab__canvas" aria-hidden="true" />
      <div className="compass-book-three-lab__atmosphere" aria-hidden="true" />

      {!phoneProof ? (
        <header className="compass-book-three-lab__workbench">
          <div>
            <span>Compass Book · 3D Lab</span>
            <strong>{pose === 'closed' ? 'Closed cover' : 'The Reading'}</strong>
          </div>
          <div className="compass-book-three-lab__controls">
            <button type="button" onClick={() => setPose('closed')} aria-pressed={pose === 'closed'}>Cover</button>
            <button type="button" onClick={() => setPose('reading')} aria-pressed={pose === 'reading'}>Reading</button>
            <button type="button" onClick={() => setQuality((value) => value === 'high' ? 'low' : 'high')}>{quality}</button>
            <button type="button" onClick={() => setReducedMotion((value) => !value)} aria-pressed={reducedMotion}>Reduced motion</button>
          </div>
        </header>
      ) : null}

      {pose === 'closed' ? (
        <button
          type="button"
          className="compass-book-three-lab__open-book"
          onClick={() => setPose('reading')}
        >
          <span>Compass Book</span>
          <strong>Open the Reading</strong>
          <small>Tap to open</small>
        </button>
      ) : (
        <>
          <button
            type="button"
            className="compass-book-three-lab__close compass-book-three-lab__close--floating"
            onClick={() => setPose('closed')}
            aria-label="Close the Compass Book"
          >
            ×
          </button>
          <ReadingSpread phoneProof={phoneProof} />
        </>
      )}

      {error ? <p className="compass-book-three-lab__fallback" role="status">{error}</p> : null}
      {!phoneProof ? (
        <footer className="compass-book-three-lab__metrics" aria-live="polite">
          <span className={ready ? 'is-ready' : ''}>{ready ? 'Ready' : 'Warming'}</span>
          <span>{metrics.fps} FPS</span>
          <span>{metrics.calls} calls</span>
          <span>{Math.round(metrics.triangles / 100) / 10}k rendered tris</span>
          <span>{modelMetrics?.meshes ?? 0} meshes</span>
        </footer>
      ) : null}
    </main>
  );
}
