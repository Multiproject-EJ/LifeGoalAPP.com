import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ROBOT_ADDONS,
  ROBOT_BRAIN_STATES,
  ROBOT_EMOTIONS,
  ROBOT_MOTIONS,
  ROBOT_ROLES,
  createRobotFamilyModel,
  type RobotAddonId,
  type RobotBrainState,
  type RobotEmotion,
  type RobotFamilyMetrics,
  type RobotFamilyModel,
  type RobotMotion,
  type RobotQuality,
  type RobotRole,
} from './RobotFamilyThreeModel';
import {
  CONSTRUCTION_PHASES,
  createRobotConstructionTheatre,
  type ConstructionPhase,
  type ConstructionTheatreMetrics,
  type RobotConstructionTheatre,
} from './RobotConstructionTheatre';
import './RobotFamilyThreeLab.css';

type ViewId = 'reference' | 'front-right' | 'right' | 'rear-right' | 'rear' | 'rear-left' | 'left' | 'front-left' | 'opposite' | 'top' | 'underside' | 'construction' | 'phone';
type SceneMode = 'family' | 'construction';

declare global {
  interface Window {
    __IMG2THREEJS_READY__?: boolean;
    __IMG2THREEJS_CAPTURE__?: Record<string, unknown>;
    __IMG2THREEJS_CAPTURE_FRAME__?: () => string;
  }
}

const VIEWS: Record<ViewId, { label: string; position: readonly [number, number, number]; target: readonly [number, number, number] }> = {
  reference: { label: '0° · Front reference', position: [0, 3.45, 11.4], target: [0, 1.45, 0] },
  'front-right': { label: '45° · Front right', position: [8.05, 3.45, 8.05], target: [0, 1.45, 0] },
  right: { label: '90° · Right profile', position: [11.4, 3.45, 0], target: [0, 1.45, 0] },
  'rear-right': { label: '135° · Rear right', position: [8.05, 3.45, -8.05], target: [0, 1.45, 0] },
  rear: { label: '180° · Rear', position: [0, 3.45, -11.4], target: [0, 1.45, 0] },
  'rear-left': { label: '225° · Rear left', position: [-8.05, 3.45, -8.05], target: [0, 1.45, 0] },
  left: { label: '270° · Left profile', position: [-11.4, 3.45, 0], target: [0, 1.45, 0] },
  'front-left': { label: '315° · Front left', position: [-8.05, 3.45, 8.05], target: [0, 1.45, 0] },
  opposite: { label: 'Opposite 3/4 alias', position: [-8.05, 3.45, 8.05], target: [0, 1.45, 0] },
  top: { label: 'Top closure', position: [0, 12.8, 0.01], target: [0, 1.45, 0] },
  underside: { label: 'Underside closure', position: [0, -8.8, 0.01], target: [0, 1.45, 0] },
  construction: { label: 'Construction theatre', position: [8.8, 5.1, 12.8], target: [0, 1.2, 0] },
  phone: { label: 'Phone proof', position: [-0.45, 3.5, 17.2], target: [-0.35, 1.7, 0] },
};

function readParam<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const requested = new URLSearchParams(window.location.search).get(name) as T | null;
  return requested && allowed.includes(requested) ? requested : fallback;
}

export default function RobotFamilyThreeLab() {
  const phoneProof = useMemo(() => new URLSearchParams(window.location.search).get('phoneProof') === '1', []);
  const captureMode = useMemo(() => new URLSearchParams(window.location.search).get('capture') === '1', []);
  const silhouetteMode = useMemo(() => new URLSearchParams(window.location.search).get('silhouette') === '1', []);
  const referenceLook = useMemo(() => new URLSearchParams(window.location.search).get('lookdev') === 'reference', []);
  const [quality, setQuality] = useState<RobotQuality>(() => readParam('quality', ['low', 'high'], 'high'));
  const [sceneMode, setSceneMode] = useState<SceneMode>(() => new URLSearchParams(window.location.search).get('construction') === '1' ? 'construction' : 'family');
  const [constructionPhase, setConstructionPhase] = useState<ConstructionPhase>(() => readParam('phase', CONSTRUCTION_PHASES, 'frame'));
  const [constructionProgress, setConstructionProgress] = useState(() => Number(new URLSearchParams(window.location.search).get('progress') ?? 0.52));
  const [autoBuild, setAutoBuild] = useState(() => new URLSearchParams(window.location.search).get('autobuild') !== '0');
  const [motion, setMotion] = useState<RobotMotion>(() => readParam('motion', ROBOT_MOTIONS.map((entry) => entry.id), 'idle'));
  const [emotion, setEmotion] = useState<RobotEmotion>(() => readParam('emotion', ROBOT_EMOTIONS.map((entry) => entry.id), 'friendly'));
  const [brainState, setBrainState] = useState<RobotBrainState>(() => readParam('brain', ROBOT_BRAIN_STATES.map((entry) => entry.id), 'calm'));
  const [view, setView] = useState<ViewId>(() => readParam('view', Object.keys(VIEWS) as ViewId[], phoneProof ? 'phone' : sceneMode === 'construction' ? 'construction' : 'reference'));
  const [selectedRole, setSelectedRole] = useState<RobotRole | 'family'>(() => readParam(
    'role',
    ['family', ...ROBOT_ROLES.map((entry) => entry.id)] as Array<RobotRole | 'family'>,
    'family',
  ));
  const [autoRotate, setAutoRotate] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [clay, setClay] = useState(() => silhouetteMode || new URLSearchParams(window.location.search).get('clay') === '1');
  const [reducedMotion, setReducedMotion] = useState(() => (
    silhouetteMode
      || new URLSearchParams(window.location.search).get('reduced') === '1'
      || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  ));
  const [explode, setExplode] = useState(() => Number(new URLSearchParams(window.location.search).get('explode') ?? 0));
  const [showAddonRack, setShowAddonRack] = useState(() => new URLSearchParams(window.location.search).get('addons') === '1');
  const [addonVisibility, setAddonVisibility] = useState<Record<RobotAddonId, boolean>>(() => Object.fromEntries(ROBOT_ADDONS.map((entry) => [entry.id, true])) as Record<RobotAddonId, boolean>);
  const [metrics, setMetrics] = useState<RobotFamilyMetrics | null>(null);
  const [constructionMetrics, setConstructionMetrics] = useState<ConstructionTheatreMetrics | null>(null);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<RobotFamilyModel | null>(null);
  const theatreRef = useRef<RobotConstructionTheatre | null>(null);
  const motionRef = useRef(motion);
  const emotionRef = useRef(emotion);
  const brainStateRef = useRef(brainState);
  const viewRef = useRef(view);
  const autoRotateRef = useRef(autoRotate);
  const reducedMotionRef = useRef(reducedMotion);
  const selectedRoleRef = useRef(selectedRole);
  const sceneModeRef = useRef(sceneMode);
  const constructionPhaseRef = useRef(constructionPhase);
  const constructionProgressRef = useRef(constructionProgress);
  const autoBuildRef = useRef(autoBuild);

  useEffect(() => { motionRef.current = motion; if (sceneModeRef.current === 'family') modelRef.current?.setMotion(motion); }, [motion]);
  useEffect(() => { emotionRef.current = emotion; modelRef.current?.setEmotion(emotion); }, [emotion]);
  useEffect(() => { brainStateRef.current = brainState; modelRef.current?.setBrainState(brainState); }, [brainState]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);
  useEffect(() => { selectedRoleRef.current = selectedRole; }, [selectedRole]);
  useEffect(() => {
    sceneModeRef.current = sceneMode;
    if (sceneMode === 'family') modelRef.current?.setMotion(motionRef.current);
    theatreRef.current?.setPresentation({ active: sceneMode === 'construction', phase: constructionPhaseRef.current, progress: constructionProgressRef.current });
  }, [sceneMode]);
  useEffect(() => {
    constructionPhaseRef.current = constructionPhase;
    theatreRef.current?.setPresentation({ active: sceneModeRef.current === 'construction', phase: constructionPhase, progress: constructionProgressRef.current });
  }, [constructionPhase]);
  useEffect(() => {
    constructionProgressRef.current = constructionProgress;
    theatreRef.current?.setPresentation({ active: sceneModeRef.current === 'construction', phase: constructionPhaseRef.current, progress: constructionProgress });
  }, [constructionProgress]);
  useEffect(() => { autoBuildRef.current = autoBuild; }, [autoBuild]);
  useEffect(() => { modelRef.current?.setWireframe(wireframe); }, [wireframe]);
  useEffect(() => { modelRef.current?.setClay(clay); }, [clay]);
  useEffect(() => { modelRef.current?.setExploded(explode); }, [explode]);
  useEffect(() => {
    const rack = modelRef.current?.root.getObjectByName('robot-addon-rack');
    if (rack) rack.visible = showAddonRack;
  }, [showAddonRack]);
  useEffect(() => {
    Object.entries(addonVisibility).forEach(([id, visible]) => modelRef.current?.setAddonVisible(id as RobotAddonId, visible));
  }, [addonVisibility]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    setError(null);
    window.__IMG2THREEJS_READY__ = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: quality === 'high',
        powerPreference: quality === 'high' ? 'high-performance' : 'default',
        preserveDrawingBuffer: captureMode,
      });
    } catch (caught) {
      console.error('[robot-family-lab] WebGL initialization failed', caught);
      setError('This device could not start the robot family lab.');
      return undefined;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = referenceLook ? 0.78 : 1.02;
    renderer.setPixelRatio(captureMode ? 1 : Math.min(window.devicePixelRatio, quality === 'high' ? 1.75 : 1.1));
    renderer.shadowMap.enabled = quality === 'high' && !silhouetteMode;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    window.__IMG2THREEJS_CAPTURE_FRAME__ = captureMode ? () => {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = 320;
      captureCanvas.height = 180;
      captureCanvas.getContext('2d')?.drawImage(canvas, 0, 0, captureCanvas.width, captureCanvas.height);
      return captureCanvas.toDataURL('image/jpeg', 0.76);
    } : undefined;

    const scene = new THREE.Scene();
    const studioBackground = referenceLook ? 0x121720 : 0xd9e4e7;
    scene.background = new THREE.Color(silhouetteMode ? 0xffffff : studioBackground);
    scene.fog = silhouetteMode ? null : new THREE.Fog(studioBackground, 13, 22);
    const environmentGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = environmentGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    environmentGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(captureMode ? 34 : phoneProof ? (view === 'construction' ? 58 : 38) : 34, 1, 0.1, 60);
    const applyView = (viewId: ViewId) => {
      const config = VIEWS[viewId];
      const phoneConstructionScale = phoneProof && viewId === 'construction' ? 1.05 : 1;
      const constructionAngleScale = sceneMode === 'construction' && !['construction', 'phone'].includes(viewId) ? 1.42 : 1;
      const viewScale = phoneConstructionScale * constructionAngleScale;
      camera.position.set(
        config.position[0] * viewScale,
        config.position[1] * (viewScale === 1 ? 1 : 1.02),
        config.position[2] * viewScale,
      );
      controls?.target.set(...config.target);
      camera.lookAt(...config.target);
    };
    camera.position.set(...VIEWS[view].position);
    const controls = new OrbitControls(camera, canvas);
    applyView(view);
    const applyInspectionView = (role: RobotRole, viewId: ViewId = 'reference') => {
      const inspectionProfiles: Record<RobotRole, { distance: number; height: number; targetY: number; threeQuarterX: number }> = {
        'heavy-worker': captureMode
          ? { distance: 10.2, height: 3.55, targetY: 2.35, threeQuarterX: 0.12 }
          : { distance: 14.4, height: 3.6, targetY: 1.72, threeQuarterX: 0.6 },
        'project-manager': referenceLook
          ? { distance: 7.65, height: 2.78, targetY: 2.12, threeQuarterX: 0.12 }
          : { distance: 6.6, height: 3, targetY: 2.1, threeQuarterX: 0.18 },
        'mini-artist': { distance: 5.7, height: 1.85, targetY: 1.08, threeQuarterX: 0.35 },
      };
      const inspection = captureMode && role === 'mini-artist'
        ? { distance: 3.35, height: 1.42, targetY: 1.08, threeQuarterX: 0.12 }
        : inspectionProfiles[role];
      const diagonal = inspection.distance * Math.SQRT1_2;
      const position: readonly [number, number, number] = viewId === 'front-right'
        ? [diagonal, inspection.height, diagonal]
        : viewId === 'right'
          ? [inspection.distance, inspection.height, 0]
          : viewId === 'rear-right'
            ? [diagonal, inspection.height, -diagonal]
            : viewId === 'rear'
              ? [0, inspection.height, -inspection.distance]
              : viewId === 'rear-left'
                ? [-diagonal, inspection.height, -diagonal]
                : viewId === 'left'
                  ? [-inspection.distance, inspection.height, 0]
                  : ['front-left', 'opposite'].includes(viewId)
                    ? [-diagonal, inspection.height, diagonal]
                    : viewId === 'top'
                      ? [0, inspection.targetY + inspection.distance, 0.001]
                      : viewId === 'underside'
                        ? [0, inspection.targetY - inspection.distance, 0.001]
                        : [inspection.threeQuarterX, inspection.height, inspection.distance];
      const target: readonly [number, number, number] = [0, inspection.targetY, 0];
      camera.up.set(0, ['top', 'underside'].includes(viewId) ? 0 : 1, viewId === 'top' ? -1 : viewId === 'underside' ? 1 : 0);
      camera.position.set(...position);
      controls.target.set(...target);
      camera.lookAt(...target);
    };
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 18;
    controls.autoRotateSpeed = 0.55;
    controls.enabled = !phoneProof;

    scene.add(new THREE.HemisphereLight(0xf2fcff, referenceLook ? 0x111926 : 0x334555, referenceLook ? 0.72 : 2.4));
    const key = new THREE.DirectionalLight(0xfff2d6, referenceLook ? 3.4 : 5.2);
    key.position.set(-5.5, 8, 6.5);
    key.castShadow = quality === 'high' && !silhouetteMode;
    key.shadow.mapSize.set(quality === 'high' ? 2048 : 512, quality === 'high' ? 2048 : 512);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -2;
    key.shadow.camera.far = 25;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bdcff, referenceLook ? 0.7 : 2.1);
    fill.position.set(6, 4, 5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xbdeaff, referenceLook ? 2.5 : 3.6);
    rim.position.set(0, 5, -7);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8.6, 96),
      referenceLook
        ? new THREE.MeshBasicMaterial({ color: 0x10161f })
        : new THREE.MeshPhysicalMaterial({ color: 0x9eafb5, roughness: 0.36, metalness: 0.34, clearcoat: 0.46, clearcoatRoughness: 0.18 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    if (!silhouetteMode) scene.add(floor);
    for (const radius of silhouetteMode || referenceLook ? [] : [2.2, 4.1, 6.4]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 6, 96), new THREE.MeshBasicMaterial({ color: 0x5edfff, transparent: true, opacity: 0.32, toneMapped: false }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.12;
      scene.add(ring);
    }

    const model = createRobotFamilyModel({ quality, showAddonRack });
    if (silhouetteMode) {
      model.root.traverse((object) => {
        if (object.userData.presentationEffect) object.visible = false;
      });
    }
    const familyMemberX: Record<RobotRole, number> = {
      'heavy-worker': model.members['heavy-worker'].position.x,
      'project-manager': model.members['project-manager'].position.x,
      'mini-artist': model.members['mini-artist'].position.x,
    };
    modelRef.current = model;
    model.setMotion(motionRef.current);
    model.setEmotion(emotionRef.current);
    model.setBrainState(brainStateRef.current);
    model.setWireframe(wireframe);
    model.setClay(clay);
    if (silhouetteMode) {
      const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
      model.root.traverse((object) => {
        if (object instanceof THREE.Mesh && !object.userData.presentationEffect) object.material = silhouetteMaterial;
      });
    }
    model.setExploded(explode);
    Object.entries(addonVisibility).forEach(([id, visible]) => model.setAddonVisible(id as RobotAddonId, visible));
    scene.add(model.root);
    const theatre = createRobotConstructionTheatre({ family: model, quality });
    theatreRef.current = theatre;
    theatre.setPresentation({ active: sceneModeRef.current === 'construction', phase: constructionPhaseRef.current, progress: constructionProgressRef.current });
    scene.add(theatre.root);
    setMetrics(model.metrics);
    setConstructionMetrics(theatre.metrics);
    canvas.dataset.robotMetrics = JSON.stringify(model.metrics);
    canvas.dataset.robotPartManifest = JSON.stringify(model.partManifest);
    canvas.dataset.constructionMetrics = JSON.stringify(theatre.metrics);
    canvas.dataset.constructionPartManifest = JSON.stringify(theatre.partManifest);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(model.root, true).find((entry) => entry.object.userData.robotPart);
      const role = hit?.object.userData.robotPart?.role as RobotRole | undefined;
      if (role) setSelectedRole(role);
    };
    canvas.addEventListener('pointerdown', handlePointer);

    const animationStartedAt = performance.now();
    let previousFrameAt = animationStartedAt;
    let frame = 0;
    let fpsFrames = 0;
    let fpsStarted = performance.now();
    let previousView = viewRef.current;
    let previousInspectedRole: RobotRole | 'family' | null = null;
    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const animate = () => {
      frame = requestAnimationFrame(animate);
      resize();
      const frameNow = performance.now();
      const delta = Math.min((frameNow - previousFrameAt) / 1000, 0.05);
      const elapsed = (frameNow - animationStartedAt) / 1000;
      previousFrameAt = frameNow;
      model.update(elapsed, delta, reducedMotionRef.current);
      const inspectedRole = selectedRoleRef.current;
      if (previousInspectedRole !== inspectedRole) {
        previousInspectedRole = inspectedRole;
        if (inspectedRole !== 'family' && !['construction', 'phone'].includes(viewRef.current)) {
          applyInspectionView(inspectedRole, viewRef.current);
        } else {
          applyView(viewRef.current);
        }
      }
      ROBOT_ROLES.forEach(({ id }) => {
        const member = model.members[id];
        member.visible = inspectedRole === 'family' || inspectedRole === id;
        const targetX = inspectedRole === id ? 0 : familyMemberX[id];
        member.position.x = inspectedRole === id
          ? targetX
          : THREE.MathUtils.lerp(member.position.x, targetX, 1 - Math.exp(-delta * 9));
      });
      canvas.dataset.inspectedRole = inspectedRole;
      canvas.dataset.inspectedMemberX = inspectedRole === 'family' ? 'family' : model.members[inspectedRole].position.x.toFixed(3);
      canvas.dataset.inspectionCamera = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;
      canvas.dataset.inspectionTarget = `${controls.target.x.toFixed(2)},${controls.target.y.toFixed(2)},${controls.target.z.toFixed(2)}`;
      canvas.dataset.robotEmotion = model.emotion;
      const heavyMouth = model.members['heavy-worker'].getObjectByName('heavy-worker-smile');
      if (heavyMouth) canvas.dataset.heavyMouthTransform = `${heavyMouth.scale.x.toFixed(2)},${heavyMouth.scale.y.toFixed(2)},${heavyMouth.rotation.x.toFixed(2)}`;
      if (sceneModeRef.current === 'construction') {
        if (autoBuildRef.current) {
          const duration = reducedMotionRef.current ? 42 : 24;
          const progress = (elapsed % duration) / duration;
          theatre.setPresentation({ active: true, progress, sequence: Math.floor(elapsed / duration) });
        }
        theatre.update(elapsed, delta, reducedMotionRef.current);
      } else {
        theatre.setPresentation({ active: false, phase: constructionPhaseRef.current, progress: constructionProgressRef.current });
        theatre.update(elapsed, delta, reducedMotionRef.current);
      }
      if (previousView !== viewRef.current) {
        previousView = viewRef.current;
        applyView(previousView);
        if (selectedRoleRef.current !== 'family' && !['construction', 'phone'].includes(previousView)) {
          applyInspectionView(selectedRoleRef.current, previousView);
        }
      }
      controls.autoRotate = controls.enabled && autoRotateRef.current && !reducedMotionRef.current;
      if (controls.enabled) controls.update(delta);
      floor.visible = !silhouetteMode && viewRef.current !== 'underside';
      renderer.render(scene, camera);
      if (captureMode && elapsed > 1.2 && !canvas.dataset.captureFrame) {
        canvas.dataset.captureFrame = window.__IMG2THREEJS_CAPTURE_FRAME__?.() ?? '';
      }
      fpsFrames += 1;
      const now = performance.now();
      if (now - fpsStarted > 700) {
        setFps(Math.round((fpsFrames * 1000) / (now - fpsStarted)));
        setConstructionMetrics({ ...theatre.metrics });
        canvas.dataset.constructionMetrics = JSON.stringify(theatre.metrics);
        if (sceneModeRef.current === 'construction' && autoBuildRef.current) setConstructionPhase(theatre.presentation.phase);
        fpsFrames = 0;
        fpsStarted = now;
      }
      if (!window.__IMG2THREEJS_READY__) {
        window.__IMG2THREEJS_READY__ = true;
        canvas.dataset.img2threejsReady = 'true';
        document.documentElement.dataset.img2threejsReady = 'true';
        window.__IMG2THREEJS_CAPTURE__ = {
          route: '/dev/robot-family-3d', quality, view: viewRef.current,
          metrics: model.metrics, scaleContract: model.root.userData.sculptRuntime.scaleContract,
          construction: { presentation: theatre.presentation, metrics: theatre.metrics, partManifest: theatre.partManifest },
          partManifest: model.partManifest,
          referenceLimitations: model.root.userData.referenceLimitations,
        };
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', handlePointer);
      controls.dispose();
      theatre.dispose();
      model.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      scene.environment?.dispose();
      renderer.dispose();
      modelRef.current = null;
      theatreRef.current = null;
      window.__IMG2THREEJS_READY__ = false;
      delete canvas.dataset.img2threejsReady;
      delete canvas.dataset.robotMetrics;
      delete canvas.dataset.robotPartManifest;
      delete canvas.dataset.constructionMetrics;
      delete canvas.dataset.constructionPartManifest;
      delete canvas.dataset.captureFrame;
      delete document.documentElement.dataset.img2threejsReady;
      delete window.__IMG2THREEJS_CAPTURE_FRAME__;
    };
  }, [captureMode, quality, phoneProof, referenceLook, silhouetteMode]);

  return (
    <main className={`robot-family-lab${phoneProof ? ' robot-family-lab--phone-proof' : ''}`}>
      <canvas ref={canvasRef} className="robot-family-lab__canvas" aria-label="Interactive 3D HabitGame robot family" />
      {!phoneProof && !captureMode && (
        <>
          <header className="robot-family-lab__header">
            <div>
              <p>HabitGame · procedural Three.js lab</p>
              <h1>{sceneMode === 'construction' ? 'Robot construction theatre' : 'Robot helper family'}</h1>
              <span>{sceneMode === 'construction' ? 'Tools · materials · controlled dust cover · finished-building reveal' : 'Heavy doer · project manager / PA · half-scale mini artist'}</span>
            </div>
            <div className="robot-family-lab__metrics" aria-label="Live model metrics">
              <strong>{fps} fps</strong>
              <span>{metrics?.triangles.toLocaleString() ?? '—'} tris</span>
              <span>{metrics?.drawCalls ?? '—'} calls</span>
              <span>{metrics?.sockets ?? '—'} sockets</span>
              {sceneMode === 'construction' && <span>+{constructionMetrics?.visibleDrawCalls ?? '—'} theatre calls</span>}
            </div>
          </header>

          <aside className="robot-family-lab__panel" aria-label="Robot family controls">
            <section>
              <h2>Scene</h2>
              <div className="robot-family-lab__segmented">
                <button className={sceneMode === 'family' ? 'is-active' : ''} onClick={() => setSceneMode('family')}>Family</button>
                <button className={sceneMode === 'construction' ? 'is-active' : ''} onClick={() => { setSceneMode('construction'); setView('construction'); }}>Build theatre</button>
              </div>
              {sceneMode === 'construction' && (
                <>
                  <select aria-label="Construction phase" value={constructionPhase} disabled={autoBuild} onChange={(event) => setConstructionPhase(event.target.value as ConstructionPhase)}>
                    {CONSTRUCTION_PHASES.map((phase) => <option key={phase} value={phase}>{phase[0].toUpperCase() + phase.slice(1)}</option>)}
                  </select>
                  <label className="robot-family-lab__check"><input type="checkbox" checked={autoBuild} onChange={(event) => setAutoBuild(event.target.checked)} /> Play full build loop</label>
                  {!autoBuild && <label>Build progress <output>{Math.round(constructionProgress * 100)}%</output><input type="range" min="0" max="1" step="0.01" value={constructionProgress} onChange={(event) => setConstructionProgress(Number(event.target.value))} /></label>}
                </>
              )}
            </section>
            <section>
              <h2>Inspect</h2>
              <div className="robot-family-lab__segmented">
                <button className={selectedRole === 'family' ? 'is-active' : ''} onClick={() => setSelectedRole('family')}>Family</button>
                {ROBOT_ROLES.map((role) => <button key={role.id} className={selectedRole === role.id ? 'is-active' : ''} onClick={() => setSelectedRole(role.id)}>{role.label.replace(' / PA', '')}</button>)}
              </div>
              {selectedRole !== 'family' && <p className="robot-family-lab__purpose">{ROBOT_ROLES.find((role) => role.id === selectedRole)?.purpose}</p>}
            </section>
            <section>
              <h2>View</h2>
              <select value={view} onChange={(event) => setView(event.target.value as ViewId)}>{Object.entries(VIEWS).map(([id, config]) => <option key={id} value={id}>{config.label}</option>)}</select>
              <label>Explode <output>{Math.round(explode * 100)}%</output><input type="range" min="0" max="1" step="0.01" value={explode} onChange={(event) => setExplode(Number(event.target.value))} /></label>
            </section>
            <section>
              <h2>Performance</h2>
              <div className="robot-family-lab__segmented"><button className={quality === 'high' ? 'is-active' : ''} onClick={() => setQuality('high')}>High</button><button className={quality === 'low' ? 'is-active' : ''} onClick={() => setQuality('low')}>Phone</button></div>
            </section>
            <section>
              <h2>Character</h2>
              <select value={motion} onChange={(event) => setMotion(event.target.value as RobotMotion)}>{ROBOT_MOTIONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select>
              <select value={emotion} onChange={(event) => setEmotion(event.target.value as RobotEmotion)}>{ROBOT_EMOTIONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select>
              <select aria-label="Manager brain state" value={brainState} onChange={(event) => setBrainState(event.target.value as RobotBrainState)}>{ROBOT_BRAIN_STATES.map((entry) => <option key={entry.id} value={entry.id}>Brain · {entry.label}</option>)}</select>
            </section>
            <section>
              <h2>Add-on rack</h2>
              <label className="robot-family-lab__check"><input type="checkbox" checked={showAddonRack} onChange={(event) => setShowAddonRack(event.target.checked)} /> Show modular rack</label>
              <div className="robot-family-lab__addon-grid">{ROBOT_ADDONS.map((addon) => <label key={addon.id}><input type="checkbox" checked={addonVisibility[addon.id]} onChange={(event) => setAddonVisibility((current) => ({ ...current, [addon.id]: event.target.checked }))} /> {addon.label}</label>)}</div>
            </section>
            <section className="robot-family-lab__switches">
              <label><input type="checkbox" checked={autoRotate} onChange={(event) => setAutoRotate(event.target.checked)} /> Auto rotate</label>
              <label><input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} /> Wireframe</label>
              <label><input type="checkbox" checked={clay} onChange={(event) => setClay(event.target.checked)} /> Clay review</label>
              <label><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduced motion</label>
            </section>
          </aside>
          <footer className="robot-family-lab__note">{sceneMode === 'construction' ? 'Heavy lifts · manager directs · mini robot details · dust hides assembly, then clears for the reveal' : 'Drag to orbit · click a robot to identify its role · rear geometry is single-view inference'}</footer>
        </>
      )}
      {error && <div role="alert" className="robot-family-lab__error">{error}</div>}
    </main>
  );
}
