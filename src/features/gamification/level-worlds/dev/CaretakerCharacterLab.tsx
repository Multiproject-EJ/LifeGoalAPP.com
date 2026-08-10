import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CARETAKER_ANIMATIONS,
  CARETAKER_EMOTIONS,
  CROWN_OF_TIDES_OUTFIT,
  createCaretakerMaster,
  type CaretakerAnimationId,
  type CaretakerEmotionId,
  type CaretakerModel,
  type CaretakerModelMetrics,
  type CaretakerQuality,
} from './CaretakerThreeModel';
import './CaretakerCharacterLab.css';

type CameraMode = 'full' | 'portrait' | 'face';

interface LiveMetrics extends CaretakerModelMetrics {
  fps: number;
  drawCalls: number;
  renderedTriangles: number;
}

const EMPTY_METRICS: LiveMetrics = {
  bones: 0,
  meshes: 0,
  triangles: 0,
  materials: 0,
  skinnedDrawCalls: 0,
  fps: 0,
  drawCalls: 0,
  renderedTriangles: 0,
};

const CAMERA_MODES: Record<CameraMode, { position: readonly [number, number, number]; target: readonly [number, number, number] }> = {
  full: { position: [0, 3.05, 14.7], target: [0, 1.78, 0] },
  portrait: { position: [0, 2.85, 6.45], target: [0, 2.12, 0.05] },
  face: { position: [0, 2.72, 4.7], target: [0, 2.35, 0.16] },
};

function readInitialQuality(): CaretakerQuality {
  const quality = new URLSearchParams(window.location.search).get('quality');
  return quality === 'low' ? 'low' : 'high';
}

function readPhoneProofMode() {
  return new URLSearchParams(window.location.search).get('phoneProof') === '1';
}

function readInitialAnimation(): CaretakerAnimationId {
  const requested = new URLSearchParams(window.location.search).get('animation') as CaretakerAnimationId | null;
  return requested && CARETAKER_ANIMATIONS.some((entry) => entry.id === requested) ? requested : 'idle';
}

function readInitialEmotion(): CaretakerEmotionId {
  const requested = new URLSearchParams(window.location.search).get('emotion') as CaretakerEmotionId | null;
  return requested && CARETAKER_EMOTIONS.some((entry) => entry.id === requested) ? requested : 'calm';
}

function readInitialCamera(): CameraMode {
  const requested = new URLSearchParams(window.location.search).get('camera');
  return requested === 'portrait' || requested === 'face' ? requested : 'full';
}

function readInitialReducedMotion() {
  const requested = new URLSearchParams(window.location.search).get('reducedMotion');
  if (requested === '1') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function readInitialRotation() {
  const requested = Number(new URLSearchParams(window.location.search).get('rotation'));
  return Number.isFinite(requested) ? Math.max(-180, Math.min(180, requested)) : 0;
}

function readProofPoseTime() {
  const requested = Number(new URLSearchParams(window.location.search).get('poseTime'));
  return Number.isFinite(requested) && requested >= 0 ? requested : null;
}

type EvidencePart = 'cape' | 'arms' | 'shoes' | 'hat' | 'undergarment' | null;

function readPartEvidenceMode() {
  const params = new URLSearchParams(window.location.search);
  const requestedPart = params.get('part');
  return {
    part: requestedPart === 'cape' || requestedPart === 'arms' || requestedPart === 'shoes' || requestedPart === 'hat' || requestedPart === 'undergarment'
      ? requestedPart
      : null as EvidencePart,
    mapStripped: params.get('mapStripped') === '1',
  };
}

export default function CaretakerCharacterLab() {
  const phoneProof = useMemo(readPhoneProofMode, []);
  const proofPoseTime = useMemo(readProofPoseTime, []);
  const partEvidence = useMemo(readPartEvidenceMode, []);
  const [quality, setQuality] = useState<CaretakerQuality>(readInitialQuality);
  const [animation, setAnimation] = useState<CaretakerAnimationId>(readInitialAnimation);
  const [emotion, setEmotion] = useState<CaretakerEmotionId>(readInitialEmotion);
  const [cameraMode, setCameraMode] = useState<CameraMode>(readInitialCamera);
  const [autoRotate, setAutoRotate] = useState(!phoneProof);
  const [wireframe, setWireframe] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(readInitialReducedMotion);
  const [isPlaying, setIsPlaying] = useState(proofPoseTime == null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [manualRotation, setManualRotation] = useState(readInitialRotation);
  const [metrics, setMetrics] = useState<LiveMetrics>(EMPTY_METRICS);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<CaretakerModel | null>(null);
  const animationTimeRef = useRef(proofPoseTime ?? 0);
  const animationRef = useRef(animation);
  const emotionRef = useRef(emotion);
  const cameraModeRef = useRef(cameraMode);
  const autoRotateRef = useRef(autoRotate);
  const reducedMotionRef = useRef(reducedMotion);
  const isPlayingRef = useRef(isPlaying);
  const playbackSpeedRef = useRef(playbackSpeed);
  const manualRotationRef = useRef(manualRotation);

  const currentAnimationLabel = useMemo(
    () => CARETAKER_ANIMATIONS.find((entry) => entry.id === animation)?.label ?? animation,
    [animation],
  );

  useEffect(() => {
    animationRef.current = animation;
    modelRef.current?.setAnimation(animation, animationTimeRef.current);
  }, [animation]);

  useEffect(() => {
    emotionRef.current = emotion;
    modelRef.current?.setEmotion(emotion);
  }, [emotion]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    manualRotationRef.current = manualRotation;
  }, [manualRotation]);

  useEffect(() => {
    modelRef.current?.setWireframe(wireframe);
  }, [wireframe]);

  useEffect(() => {
    modelRef.current?.setSkeletonVisible(showSkeleton);
  }, [showSkeleton]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    setError(null);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: quality === 'high',
        alpha: false,
        powerPreference: quality === 'high' ? 'high-performance' : 'default',
      });
    } catch (caught) {
      console.error('[caretaker-character-lab] WebGL initialization failed', caught);
      setError('This device could not start the caretaker character lab.');
      return undefined;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.25));
    renderer.shadowMap.enabled = quality === 'high';
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc9d9dd);
    scene.fog = new THREE.Fog(0xc9d9dd, 10, 18);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    const fullCamera = CAMERA_MODES.full;
    camera.position.set(...fullCamera.position);
    camera.lookAt(...fullCamera.target);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...fullCamera.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2.1;
    controls.maxDistance = 10;
    controls.minPolarAngle = 40 * Math.PI / 180;
    controls.maxPolarAngle = 82 * Math.PI / 180;

    const hemisphere = new THREE.HemisphereLight(0xe8fbff, 0x243b55, 2.15);
    scene.add(hemisphere);
    const keyLight = new THREE.DirectionalLight(0xffe6b0, 4.8);
    keyLight.position.set(-4.5, 7.5, 5.5);
    keyLight.castShadow = quality === 'high';
    keyLight.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -1;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x4ddfff, 2.35);
    rimLight.position.set(4, 4.5, -5);
    scene.add(rimLight);
    const faceFill = new THREE.PointLight(0x7cf8ff, 1.25, 5.5, 2);
    faceFill.position.set(0, 2.45, 2.1);
    scene.add(faceFill);

    const stage = new THREE.Group();
    stage.name = 'CARETAKER_LAB_STAGE';
    scene.add(stage);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.78, 0.25, quality === 'high' ? 64 : 24),
      new THREE.MeshPhysicalMaterial({
        color: 0x173449,
        roughness: 0.28,
        metalness: 0.3,
        clearcoat: 0.6,
      }),
    );
    platform.position.y = -0.31;
    platform.receiveShadow = true;
    stage.add(platform);
    const platformTrim = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.045, 8, quality === 'high' ? 64 : 24),
      new THREE.MeshStandardMaterial({ color: 0xe8ad38, roughness: 0.24, metalness: 0.86 }),
    );
    platformTrim.rotation.x = Math.PI / 2;
    platformTrim.position.y = -0.21;
    stage.add(platformTrim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, quality === 'high' ? 80 : 32),
      new THREE.MeshStandardMaterial({ color: 0x9fb4ba, roughness: 0.92 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.45;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(12, 24, 0x4d7688, 0x8aa2aa);
    grid.position.y = -0.44;
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    (grid.material as THREE.LineBasicMaterial).opacity = 0.24;
    scene.add(grid);

    const model = createCaretakerMaster({
      quality,
      outfit: CROWN_OF_TIDES_OUTFIT,
      preservePartMeshes: Boolean(partEvidence.part),
    });
    model.root.name = 'CARETAKER_LAB_MODEL';
    if (phoneProof) model.root.scale.setScalar(0.9);
    model.setAnimation(animationRef.current, 0);
    model.setEmotion(emotionRef.current);
    model.setWireframe(wireframe);
    model.setSkeletonVisible(showSkeleton);
    model.root.rotation.y = manualRotationRef.current * Math.PI / 180;
    if (partEvidence.part) {
      const flatEvidenceMaterial = partEvidence.mapStripped
        ? new THREE.MeshBasicMaterial({ color: 0x2d69aa, toneMapped: false })
        : null;
      model.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const belongsToCape = object.name.includes('CAPE') || object.name.includes('MANTLE');
        const belongsToArms = object.name.includes('_SLEEVE') || object.name.includes('_HAND');
        const belongsToShoes = object.name.includes('_BOOT');
        const belongsToHat = object.name.includes('HOOD') || object.name.includes('_HAT_');
        const belongsToUndergarment = object.name.includes('_UNDER_ROBE')
          || object.name.includes('_TUNIC_')
          || object.name.includes('_QUILT_')
          || object.name.includes('_UNDERGARMENT_');
        const belongsToPart = partEvidence.part === 'cape'
          ? belongsToCape
          : partEvidence.part === 'arms'
            ? belongsToArms
            : partEvidence.part === 'shoes'
              ? belongsToShoes
              : partEvidence.part === 'hat'
                ? belongsToHat
                : belongsToUndergarment;
        object.visible = belongsToPart;
        if (belongsToPart && flatEvidenceMaterial) object.material = flatEvidenceMaterial;
      });
      platform.visible = false;
      platformTrim.visible = false;
      floor.visible = false;
      grid.visible = false;
    }
    stage.add(model.root);
    modelRef.current = model;

    const timer = new THREE.Timer();
    timer.connect(document);
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas);

    let animationFrame = 0;
    let metricStartedAt = performance.now();
    let frameCount = 0;
    let currentAngle = manualRotationRef.current * Math.PI / 180;
    const desiredCameraPosition = new THREE.Vector3();
    const desiredCameraTarget = new THREE.Vector3();
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      timer.update();
      const delta = Math.min(0.05, timer.getDelta());
      if (isPlayingRef.current && !reducedMotionRef.current) {
        animationTimeRef.current += delta * playbackSpeedRef.current;
      }
      const elapsed = animationTimeRef.current;
      model.update(elapsed, delta, reducedMotionRef.current);

      if (autoRotateRef.current && !reducedMotionRef.current) {
        currentAngle += delta * 0.23;
      } else {
        const targetAngle = manualRotationRef.current * Math.PI / 180;
        currentAngle = THREE.MathUtils.lerp(currentAngle, targetAngle, 1 - Math.exp(-delta * 8));
      }
      model.root.rotation.y = currentAngle;

      const cameraPreset = CAMERA_MODES[cameraModeRef.current];
      desiredCameraPosition.set(...cameraPreset.position);
      desiredCameraTarget.set(...cameraPreset.target);
      if (partEvidence.part) {
        // Part proofs remove most of the body, so use a tighter deterministic
        // frame for silhouette and clearance comparison across rotations.
        if (partEvidence.part === 'cape') {
          desiredCameraPosition.set(0, 1.75, 9.8);
          desiredCameraTarget.set(0, 1.05, 0);
        } else if (partEvidence.part === 'arms') {
          desiredCameraPosition.set(0, 1.2, 12.2);
          desiredCameraTarget.set(0.18, 1.08, 0);
        } else if (partEvidence.part === 'shoes') {
          // Shoes occupy less than one head-unit, so a real close-up is
          // required for judging instep continuity, welt construction and
          // leather response.  The former 4.5-unit camera hid those failures
          // in a large empty phone frame.
          desiredCameraPosition.set(0, 0.07, 2.72);
          desiredCameraTarget.set(0, 0.055, 0.16);
        } else if (partEvidence.part === 'hat') {
          // The crown-to-tail throat is visible only from above and oblique
          // angles. Keep the whole hat large in the phone proof so a pinched
          // transition or background leak cannot hide in a full-body frame.
          desiredCameraPosition.set(0, 2.88, 4.75);
          desiredCameraTarget.set(0, 2.72, -0.04);
        } else {
          desiredCameraPosition.set(0, 0.78, 4.45);
          desiredCameraTarget.set(0, 0.79, 0.16);
        }
      }
      if (
        !partEvidence.part
        &&
        cameraModeRef.current === 'full'
        && (animationRef.current === 'greet' || animationRef.current === 'point' || animationRef.current === 'celebrate')
      ) {
        // Expressive arm silhouettes are wider than idle. Ease the proof and
        // encounter camera back just enough to keep the hand inside a phone
        // safe area instead of cropping the gesture at the viewport edge.
        desiredCameraPosition.z += 2;
      }
      const cameraAlpha = reducedMotionRef.current ? 1 : 1 - Math.exp(-delta * 4.8);
      camera.position.lerp(desiredCameraPosition, cameraAlpha);
      controls.target.lerp(desiredCameraTarget, cameraAlpha);
      controls.update();
      renderer.render(scene, camera);

      frameCount += 1;
      const now = performance.now();
      if (now - metricStartedAt >= 750) {
        setMetrics({
          ...model.metrics,
          fps: Math.round((frameCount * 1000) / (now - metricStartedAt)),
          drawCalls: renderer.info.render.calls,
          renderedTriangles: renderer.info.render.triangles,
        });
        frameCount = 0;
        metricStartedAt = now;
      }
    };
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      timer.dispose();
      controls.dispose();
      model.dispose();
      modelRef.current = null;
      platform.geometry.dispose();
      (platform.material as THREE.Material).dispose();
      platformTrim.geometry.dispose();
      (platformTrim.material as THREE.Material).dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [quality]);

  const selectAnimation = (nextAnimation: CaretakerAnimationId) => {
    setAnimation(nextAnimation);
    setIsPlaying(true);
  };

  const restartAnimation = () => {
    const now = animationTimeRef.current;
    modelRef.current?.setAnimation(animationRef.current, now, true);
    setIsPlaying(true);
  };

  return (
    <main className="caretaker-lab" data-phone-proof={phoneProof ? 'true' : undefined}>
      <header className="caretaker-lab__header">
        <div>
          <p>GAUNTLET M1–M3 · CHARACTER LAB</p>
          <h1>The Caretaker</h1>
          <span>{partEvidence.part === 'cape'
            ? 'Isolated construction proof · Crown of Tides cape'
            : partEvidence.part === 'arms'
              ? 'Isolated construction proof · Crown of Tides arms'
              : partEvidence.part === 'shoes'
                ? 'Isolated construction proof · Crown of Tides shoes'
                : partEvidence.part === 'hat'
                  ? 'Isolated construction proof · Crown of Tides hat'
                  : 'Reusable master rig · Island 005 outfit: Crown of Tides'}</span>
        </div>
        <div className="caretaker-lab__gate" data-pass={metrics.bones > 0 && metrics.fps >= (quality === 'high' ? 45 : 28)}>
          <strong>{metrics.bones > 0 && metrics.fps >= (quality === 'high' ? 45 : 28) ? 'LIVE' : 'CHECKING'}</strong>
          <span>{quality.toUpperCase()} LOD · {metrics.fps || '—'} FPS</span>
        </div>
      </header>

      <section className="caretaker-lab__workspace">
        <aside className="caretaker-lab__controls" aria-label="Character controls">
          <section>
            <h2>Master model</h2>
            <label>
              LOD quality
              <select value={quality} onChange={(event) => setQuality(event.target.value as CaretakerQuality)}>
                <option value="high">High · close-up</option>
                <option value="low">Low · board view</option>
              </select>
            </label>
            <div className="caretaker-lab__button-row">
              <button type="button" aria-pressed={wireframe} onClick={() => setWireframe((value) => !value)}>Wireframe</button>
              <button type="button" aria-pressed={showSkeleton} onClick={() => setShowSkeleton((value) => !value)}>Skeleton</button>
            </div>
          </section>

          <section>
            <h2>Performance</h2>
            <dl className="caretaker-lab__metrics">
              <div><dt>Model tris</dt><dd>{Math.round(metrics.triangles / 1000)}k</dd></div>
              <div><dt>Meshes</dt><dd>{metrics.meshes}</dd></div>
              <div><dt>Bones</dt><dd>{metrics.bones}</dd></div>
              <div><dt>Materials</dt><dd>{metrics.materials}</dd></div>
              <div><dt>Draw calls</dt><dd>{metrics.drawCalls}</dd></div>
              <div><dt>Skinned calls</dt><dd>{metrics.skinnedDrawCalls}</dd></div>
            </dl>
          </section>

          <section>
            <h2>View</h2>
            <div className="caretaker-lab__segmented">
              {(['full', 'portrait', 'face'] as CameraMode[]).map((mode) => (
                <button key={mode} type="button" aria-pressed={cameraMode === mode} onClick={() => setCameraMode(mode)}>{mode}</button>
              ))}
            </div>
            <label className="caretaker-lab__toggle"><input type="checkbox" checked={autoRotate} onChange={(event) => setAutoRotate(event.target.checked)} />Turntable</label>
            <label>
              Rotation · {manualRotation}°
              <input type="range" min="-180" max="180" step="1" value={manualRotation} disabled={autoRotate} onChange={(event) => setManualRotation(Number(event.target.value))} />
            </label>
            <label className="caretaker-lab__toggle"><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} />Reduced motion preview</label>
          </section>
        </aside>

        <div className="caretaker-lab__phone" data-quality={quality}>
          <div className="caretaker-lab__phone-notch" />
          <canvas ref={canvasRef} aria-label="Interactive 3D caretaker character model" />
          <div className="caretaker-lab__canvas-caption">
            <span>{currentAnimationLabel}</span>
            <strong>{CROWN_OF_TIDES_OUTFIT.label}</strong>
          </div>
          {error ? <div className="caretaker-lab__error" role="alert">{error}</div> : null}
        </div>

        <aside className="caretaker-lab__controls caretaker-lab__controls--performance" aria-label="Animation and expression controls">
          <section>
            <h2>Shared animation</h2>
            <div className="caretaker-lab__playback-row">
              <button type="button" aria-pressed={isPlaying} onClick={() => setIsPlaying((value) => !value)}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" onClick={restartAnimation}>Restart clip</button>
              <label>
                Speed · {playbackSpeed.toFixed(2)}×
                <input
                  type="range"
                  min="0.5"
                  max="1.25"
                  step="0.05"
                  value={playbackSpeed}
                  onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
                />
              </label>
            </div>
            {proofPoseTime != null && !isPlaying ? (
              <p className="caretaker-lab__proof-note">Gauntlet still frame · press Play to inspect live motion.</p>
            ) : null}
            <div className="caretaker-lab__animation-grid">
              {CARETAKER_ANIMATIONS.map((entry) => (
                <button key={entry.id} type="button" aria-pressed={animation === entry.id} onClick={() => selectAnimation(entry.id)}>{entry.label}</button>
              ))}
            </div>
          </section>

          <section>
            <h2>Emissive expression</h2>
            <div className="caretaker-lab__emotion-grid">
              {CARETAKER_EMOTIONS.map((entry) => (
                <button key={entry.id} type="button" aria-pressed={emotion === entry.id} onClick={() => setEmotion(entry.id)}>{entry.label}</button>
              ))}
            </div>
          </section>

          <section className="caretaker-lab__architecture">
            <h2>Reusable architecture</h2>
            <p><strong>Shared:</strong> body, 17-bone hierarchy, shadow face, expression rig and all seven animation states.</p>
            <p><strong>Island 005 module:</strong> blue fabrics, tide embroidery, gold trim, pearls, crystals, cape and staff.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}
