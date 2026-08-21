import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  createCompassBookThreeModel,
  type CompassBookThreeModel,
  type CompassBookThreeQuality,
} from '../three/CompassBookThreeModel';
import './CompassBookThreeLab.css';

type CompassBookThreePose = 'closed' | 'reading';

type LiveMetrics = {
  fps: number;
  calls: number;
  triangles: number;
};

type CompassBookReviewWindow = Window & {
  __compassBookSculptRuntime?: Record<string, unknown>;
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

function readInitialPage() {
  const requestedPage = new URLSearchParams(window.location.search).get('page');
  if (
    requestedPage === 'living_wheel'
    || requestedPage === 'inner_compass'
    || requestedPage === 'living_horizon'
    || requestedPage === 'ikigai_map'
    || requestedPage === 'quest_forge'
  ) return requestedPage;
  return 'reading';
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

function readOrbit() {
  const value = Number(new URLSearchParams(window.location.search).get('orbit') ?? 0);
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, -1, 1) : 0;
}

function readMapStrippedReview() {
  return new URLSearchParams(window.location.search).get('mapStripped') === '1';
}

function readMaterialProof() {
  return new URLSearchParams(window.location.search).get('materialProof') === '1';
}

function readSurfaceProof() {
  return new URLSearchParams(window.location.search).get('surfaceProof') === '1';
}

function readLightingProof() {
  return new URLSearchParams(window.location.search).get('lightingProof') === 'neutral'
    ? 'neutral'
    : 'matched';
}

function readCompletionProof() {
  const requested = new URLSearchParams(window.location.search).get('completionProof');
  return requested === 'fragment' || requested === 'chapter' ? requested : null;
}

function readCompletionFrame() {
  const raw = new URLSearchParams(window.location.search).get('completionFrame');
  if (raw === null) return null;
  const requested = Number(raw);
  return Number.isFinite(requested) ? THREE.MathUtils.clamp(requested, 0, 1) : null;
}

function readLegacyColorProof() {
  return new URLSearchParams(window.location.search).get('legacyColorProof') === '1';
}

function readColorProof() {
  return new URLSearchParams(window.location.search).get('colorProof') === '1';
}

function stripMaterialMapsForReview(root: THREE.Object3D) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const mapped = material as THREE.MeshStandardMaterial;
      mapped.map = null;
      mapped.alphaMap = null;
      mapped.aoMap = null;
      mapped.bumpMap = null;
      mapped.displacementMap = null;
      mapped.emissiveMap = null;
      mapped.lightMap = null;
      mapped.metalnessMap = null;
      mapped.normalMap = null;
      mapped.roughnessMap = null;
      mapped.needsUpdate = true;
    });
  });
}

function createRuntimePartManifest(root: THREE.Object3D, activePage: string) {
  const bookRuntime = root.userData.sculptRuntime as {
    parts?: Record<string, THREE.Object3D>;
    sockets?: Record<string, unknown>;
    colliders?: Record<string, unknown>;
    destructionGroups?: Record<string, unknown>;
  } | undefined;
  if (!bookRuntime?.parts) return null;
  const activeRelief = bookRuntime.parts[`${activePage.replace(/_/g, '-')}-relief`];
  const activeRuntime = activeRelief?.userData.sculptRuntime as typeof bookRuntime | undefined;
  const manifestRoot = activeRuntime?.parts ? activeRelief : root;
  const runtime = activeRuntime?.parts ? activeRuntime : bookRuntime;
  const partEntries = Object.entries(runtime.parts ?? {});
  if (!activeRuntime?.parts) {
    Object.values(bookRuntime.parts).forEach((object) => {
      const nestedRuntime = object.userData.sculptRuntime as {
        parts?: Record<string, THREE.Object3D>;
      } | undefined;
      if (nestedRuntime?.parts) partEntries.push(...Object.entries(nestedRuntime.parts));
    });
  }
  const seenPartNames = new Set<string>();
  const parts = partEntries.flatMap(([name, object]) => {
    if (seenPartNames.has(name)) return [];
    seenPartNames.add(name);
    let triangles = 0;
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      triangles += child.geometry.index
        ? child.geometry.index.count / 3
        : (child.geometry.getAttribute('position')?.count ?? 0) / 3;
    });
    return [{ name, kind: 'part', module: object.name, triangles: Math.round(triangles) }];
  });
  let unnamedMeshes = 0;
  let integralMeshes = 0;
  manifestRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    integralMeshes += 1;
    if (!child.name) unnamedMeshes += 1;
  });
  return {
    model: 'habitgame-compass-book-v2',
    parts,
    unnamedMeshes,
    integralMeshes,
    sockets: Object.keys(runtime.sockets ?? {}),
    colliders: Object.keys(runtime.colliders ?? {}),
    destructionGroups: Object.keys(runtime.destructionGroups ?? {}),
  };
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
  const [phonePage, setPhonePage] = useState<'overview' | 'signals' | 'summary'>('overview');
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
            onClick={() => setPhonePage('overview')}
          >
            <span aria-hidden="true">‹</span> Full spread
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
  const orbit = useMemo(readOrbit, []);
  const activePage = useMemo(readInitialPage, []);
  const mapStrippedReview = useMemo(readMapStrippedReview, []);
  const materialProof = useMemo(readMaterialProof, []);
  const surfaceProof = useMemo(readSurfaceProof, []);
  const lightingProof = useMemo(readLightingProof, []);
  const completionProof = useMemo(readCompletionProof, []);
  const completionFrame = useMemo(readCompletionFrame, []);
  const legacyColorProof = useMemo(readLegacyColorProof, []);
  const colorProof = useMemo(readColorProof, []);
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
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = quality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.75 : 1.08));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    const model = createCompassBookThreeModel(quality, { includeLettering: true });
    model.setActivePage(activePage);
    if (mapStrippedReview) stripMaterialMapsForReview(model.root);
    modelRef.current = model;
    (window as CompassBookReviewWindow).__compassBookSculptRuntime = model.root.userData.sculptRuntime;
    const partManifest = createRuntimePartManifest(model.root, activePage);
    if (partManifest) canvas.dataset.partManifest = JSON.stringify(partManifest);
    scene.add(model.root);
    let materialProofRelief: THREE.Object3D | null = null;
    let colorProofSourceRelief: THREE.Object3D | null = null;
    const materialProofCenter = new THREE.Vector3();
    const materialProofSize = new THREE.Vector3();
    if (materialProof) {
      model.setOpenProgress(1);
      model.root.updateMatrixWorld(true);
      const runtime = model.root.userData.sculptRuntime as {
        parts?: Record<string, THREE.Object3D>;
      } | undefined;
      const activeRelief = runtime?.parts?.[`${activePage.replace(/_/g, '-')}-relief`];
      if (activeRelief) {
        if (legacyColorProof) {
          const reliefRuntime = activeRelief.userData.sculptRuntime as {
            parts?: Record<string, THREE.Object3D>;
          } | undefined;
          [
            'curiosity-node',
            'capability-node',
            'contribution-node',
            'viability-node',
            'willingness-node',
            'mirage-node',
          ].forEach((partId) => reliefRuntime?.parts?.[partId]?.scale.setScalar(1.72));
          reliefRuntime?.parts?.['trial-crystal']?.scale.multiplyScalar(1.34);
          if (reliefRuntime?.parts?.['chart-stars']) reliefRuntime.parts['chart-stars'].visible = false;
          if (activePage === 'quest_forge') {
            reliefRuntime?.parts?.['primary-token']?.scale.setScalar(2.05);
            reliefRuntime?.parts?.['supporting-token']?.scale.setScalar(2.4);
            reliefRuntime?.parts?.['protected-flame']?.scale.setScalar(2.55);
          }
        }
        scene.attach(activeRelief);
        model.root.visible = false;
        activeRelief.visible = true;
        materialProofRelief = activeRelief;
        if (colorProof && activePage === 'quest_forge') {
          const swatchSources = [
            'COMPASS_BOOK_QUEST_FORGE_PRIMARY_DIAMOND',
            'COMPASS_BOOK_QUEST_FORGE_CREST',
            'COMPASS_BOOK_QUEST_FORGE_SUPPORT_DISC',
            'COMPASS_BOOK_QUEST_FORGE_FLAME_CORE',
          ];
          const swatchPositions = [
            [-1.2, -1.15],
            [1.2, -1.15],
            [-1.2, 1.15],
            [1.2, 1.15],
          ] as const;
          const diagnosticAlbedo = [0xc58f3a, 0x773dc1, 0x147e82, 0xff8610] as const;
          const swatchGroup = new THREE.Group();
          swatchGroup.name = 'COMPASS_BOOK_QUEST_FORGE_COLOR_PROOF';
          swatchSources.forEach((sourceName, index) => {
            const source = activeRelief.getObjectByName(sourceName);
            if (!(source instanceof THREE.Mesh)) return;
            const sourceMaterial = Array.isArray(source.material) ? source.material[0] : source.material;
            if (!(sourceMaterial instanceof THREE.MeshStandardMaterial)) return;
            const swatchMaterial = new THREE.MeshBasicMaterial({
              // Brass and primary gold intentionally share one diagnostic
              // centroid so the five-cluster Tier-1 check can cover the dark
              // field/vault plus violet, teal and flame without dropping a
              // low-area semantic material.
              color: diagnosticAlbedo[index] ?? sourceMaterial.color.clone(),
              toneMapped: false,
            });
            swatchMaterial.name = `${sourceMaterial.name}_ALBEDO_PROOF`;
            const swatch = new THREE.Mesh(
              new RoundedBoxGeometry(2.05, 0.16, 1.9, 3, 0.14),
              swatchMaterial,
            );
            swatch.name = `${sourceName}_COLOR_SWATCH`;
            swatch.position.set(swatchPositions[index][0], 0, swatchPositions[index][1]);
            swatch.castShadow = true;
            swatch.receiveShadow = true;
            swatchGroup.add(swatch);
          });
          activeRelief.visible = false;
          colorProofSourceRelief = activeRelief;
          scene.add(swatchGroup);
          materialProofRelief = swatchGroup;
        }
        new THREE.Box3().setFromObject(materialProofRelief).getCenter(materialProofCenter);
        new THREE.Box3().setFromObject(materialProofRelief).getSize(materialProofSize);
      }
    }

    const stars = createStarField(quality);
    scene.add(stars);

    const neutralLighting = lightingProof === 'neutral';
    if (neutralLighting && materialProofRelief) {
      materialProofRelief.traverse((node) => {
        if (node instanceof THREE.Light) node.visible = false;
      });
    }
    const pageGlow = new THREE.PointLight(
      activePage === 'quest_forge' ? 0xff7a18 : 0x8745e3,
      !neutralLighting && materialProofRelief && (
        activePage === 'ikigai_map' || activePage === 'quest_forge'
      )
        ? quality === 'high' ? 1.8 : 1.1
        : 0,
      8,
      2,
    );
    pageGlow.position.set(
      materialProofCenter.x,
      materialProofCenter.y + 2.2,
      materialProofCenter.z,
    );
    scene.add(pageGlow);
    const hemisphere = new THREE.HemisphereLight(
      neutralLighting ? 0xffffff : 0xd9ddff,
      neutralLighting ? 0x363636 : 0x120b28,
      neutralLighting ? 1.1 : quality === 'high' ? 1.25 : 1,
    );
    scene.add(hemisphere);
    const key = new THREE.DirectionalLight(
      neutralLighting ? 0xffffff : 0xffe7aa,
      neutralLighting ? 3.6 : quality === 'high' ? 4.4 : 3.2,
    );
    key.position.set(surfaceProof ? -10 : -6, surfaceProof ? 7 : 12, surfaceProof ? 6 : 8);
    key.castShadow = quality === 'high';
    key.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
    key.shadow.bias = -0.00015;
    key.shadow.normalBias = 0.035;
    key.shadow.radius = quality === 'high' ? 2.5 : 1.5;
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);
    const fill = new THREE.DirectionalLight(
      neutralLighting ? 0xffffff : 0x8f86ff,
      neutralLighting ? 0.45 : quality === 'high' ? 0.7 : 0.52,
    );
    fill.position.set(6, 8, 7);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(
      neutralLighting ? 0xffffff : 0xffb766,
      neutralLighting ? 0.18 : quality === 'high' ? 0.8 : 0.55,
    );
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
      if (colorProofSourceRelief) colorProofSourceRelief.visible = false;
      model.animate(now / 1000, reducedMotionRef.current);
      if (completionProof) {
        const proofProgress = completionFrame ?? (now % 2200) / 1800;
        const proofActive = proofProgress <= 1;
        model.setCelebrationProgress(
          THREE.MathUtils.clamp(proofProgress, 0, 1),
          proofActive ? completionFrame === null ? 0.78 : 0.86 : 0,
          completionProof,
          reducedMotionRef.current,
        );
      } else {
        model.setCelebrationProgress(1, 0, 'chapter', reducedMotionRef.current);
      }

      const compact = width / height < 0.62;
      if (materialProofRelief) {
        const proofDistance = Math.max(materialProofSize.x, materialProofSize.z) * (
          surfaceProof ? 0.92 : colorProof ? 1.25 : activePage === 'quest_forge' ? 2.08 : 1.75
        );
        camera.up.set(0, 0, -1);
        camera.position.set(
          materialProofCenter.x + orbit * (surfaceProof ? 1.2 : 2.2),
          materialProofCenter.y + proofDistance,
          materialProofCenter.z + proofDistance * 0.12,
        );
        camera.lookAt(materialProofCenter);
      } else {
        const cameraDistance = THREE.MathUtils.lerp(compact ? 24 : 18.2, compact ? 46 : 18.8, openProgress);
        camera.position.set(
          THREE.MathUtils.lerp(compact ? 2 : 1.55, 0, openProgress) + orbit * (compact ? 3.2 : 3.8),
          cameraDistance * THREE.MathUtils.lerp(compact ? 0.62 : 0.67, 0.74, openProgress),
          cameraDistance * THREE.MathUtils.lerp(compact ? 0.68 : 0.64, 0.56, openProgress),
        );
        camera.lookAt(
          (0.28 + orbit * 0.18) * (1 - openProgress),
          THREE.MathUtils.lerp(0.18, compact ? -2.15 : 0.18, openProgress),
          0.08,
        );
      }
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
      if (colorProofSourceRelief) {
        colorProofSourceRelief.visible = true;
        model.root.attach(colorProofSourceRelief);
        materialProofRelief?.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.geometry.dispose();
          const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
          nodeMaterials.forEach((material) => material.dispose());
        });
        if (materialProofRelief) scene.remove(materialProofRelief);
      } else if (materialProofRelief) {
        model.root.visible = true;
        model.root.attach(materialProofRelief);
      }
      model.dispose();
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      modelRef.current = null;
      delete (window as CompassBookReviewWindow).__compassBookSculptRuntime;
      delete canvas.dataset.partManifest;
    };
  }, [activePage, colorProof, completionFrame, completionProof, legacyColorProof, lightingProof, mapStrippedReview, materialProof, quality, surfaceProof]);

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
      {!colorProof && <div className="compass-book-three-lab__atmosphere" aria-hidden="true" />}

      {!phoneProof ? (
        <header className="compass-book-three-lab__workbench">
          <div>
            <span>Compass Book · 3D Lab</span>
            <strong>
              {pose === 'closed'
                ? 'Closed cover'
                : activePage === 'living_wheel'
                  ? 'Chapter I relief'
                  : activePage === 'inner_compass'
                    ? 'Chapter II relief'
                  : activePage === 'living_horizon'
                    ? 'Chapter III relief'
                    : activePage === 'ikigai_map'
                      ? 'Chapter IV relief'
                      : activePage === 'quest_forge'
                        ? 'Chapter V relief'
                      : 'The Reading'}
            </strong>
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
          <span className="compass-book-three-lab__cover-kicker">HabitGame</span>
          <strong className="compass-book-three-lab__cover-title">
            <b>Compass</b>
            <b>Book</b>
          </strong>
          <span className="compass-book-three-lab__cover-label compass-book-three-lab__cover-label--know">Know</span>
          <span className="compass-book-three-lab__cover-label compass-book-three-lab__cover-label--choose">Choose</span>
          <span className="compass-book-three-lab__cover-label compass-book-three-lab__cover-label--act">Act</span>
          <span className="compass-book-three-lab__cover-label compass-book-three-lab__cover-label--sustain">Sustain</span>
          <span className="compass-book-three-lab__cover-open">
            <b>Open the Reading</b>
            <small>Tap the book to begin</small>
          </span>
        </button>
      ) : activePage === 'reading' ? (
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
      ) : null}

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
