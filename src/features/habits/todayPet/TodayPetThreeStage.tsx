import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createSproutlingPetThreeModel } from '../../gamification/level-worlds/dev/EggHatchThreeModel';
import { createGardenPuffThreeModel } from '../../gamification/level-worlds/dev/GardenPuffThreeModel';
import { createCrownDrifterModel } from '../../gamification/level-worlds/dev/CrownDrifterThreeModel';
import { resolveTodayPetPose, type TodayPetMood } from './todayPetBehaviour';

type Props = {
  creatureId: string;
  mood: TodayPetMood;
  facing: 1 | -1;
  sizePx: number;
  reduced: boolean;
  /** WebGL unavailable or lost: the caller falls back to the 2D cutout. */
  onFail: () => void;
};

const FRAME_MS = 1000 / 30;

/** The pose rig every Today pet model provides (the Sproutling's rig shape). */
type TodayPetRig = {
  root: THREE.Object3D;
  head: THREE.Object3D;
  armPivots: THREE.Object3D[];
  leafPivots: THREE.Object3D[];
  eyePivots: THREE.Object3D[];
  /** Fit the model into the stage by its bounds (models not built for it). */
  fitToStage?: boolean;
  update?: (elapsedSeconds: number, deltaSeconds: number, reducedMotion: boolean) => void;
  dispose: () => void;
};

function createPetModel(creatureId: string): TodayPetRig | null {
  if (creatureId === 'common-sproutling') return createSproutlingPetThreeModel('low');
  if (creatureId === 'common-garden-puff') {
    const puff = createGardenPuffThreeModel('low');
    return { ...puff, update: (t, _dt, reduced) => puff.update(t, reduced) };
  }
  if (creatureId === 'rare-crown-drifter') {
    // The same Crown Drifter that lives on Island 005.
    const drifter = createCrownDrifterModel({ lod: 'board', quality: 'low' });
    return {
      root: drifter.root,
      head: drifter.bodyPivot,
      armPivots: [drifter.leftWingPivot, drifter.rightWingPivot],
      leafPivots: drifter.finPivots,
      eyePivots: [],
      fitToStage: true,
      update: (t, dt, reduced) => drifter.update(t, dt, reduced, 1),
      dispose: drifter.dispose,
    };
  }
  return null;
}

/**
 * Real-time 3D body for the Today pet. Presentation only: a tiny transparent
 * canvas that renders the canonical creature rig at 30 fps, pauses while the
 * tab is hidden, and never touches gameplay state.
 */
export default function TodayPetThreeStage({ creatureId, mood, facing, sizePx, reduced, onFail }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  const facingRef = useRef(facing);
  const moodStartRef = useRef(0);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => {
    if (moodRef.current !== mood) moodStartRef.current = performance.now();
    moodRef.current = mood;
  }, [mood]);
  useEffect(() => { facingRef.current = facing; }, [facing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      onFailRef.current();
      return undefined;
    }
    const model = createPetModel(creatureId);
    if (!model) {
      renderer.dispose();
      onFailRef.current();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(sizePx, sizePx, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(0, 0.5, 7.4);
    camera.lookAt(0, 0.12, 0);
    scene.add(new THREE.HemisphereLight('#f6f5ed', '#596044', 1.25));
    const key = new THREE.DirectionalLight('#fff4e2', 2.5);
    key.position.set(-3, 5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#e6ffd8', 1.4);
    rim.position.set(2, 3, -4);
    scene.add(rim);

    const pivot = new THREE.Group();
    pivot.add(model.root);
    // Rig origin sits mid-body; the feet rest near y = -1.35.
    model.root.position.y = 0.1;
    if (model.fitToStage) {
      // Scale any other rig to the Sproutling's ~3 unit height, centred.
      const bounds = new THREE.Box3().setFromObject(model.root);
      const size = bounds.getSize(new THREE.Vector3());
      const fit = 2.9 / Math.max(0.001, Math.max(size.x, size.y, size.z));
      model.root.scale.setScalar(fit);
      const centre = bounds.getCenter(new THREE.Vector3()).multiplyScalar(fit);
      model.root.position.set(-centre.x, 0.1 - centre.y, -centre.z);
    }
    scene.add(pivot);
    const restLeaf = model.leafPivots.map((leaf) => leaf.rotation.z);
    const restArm = model.armPivots.map((arm) => arm.rotation.z);
    const restEye = model.eyePivots.map((eye) => eye.scale.y);
    let yaw = facingRef.current === 1 ? 0.55 : -0.55;

    const handleLost = (event: Event) => { event.preventDefault(); onFailRef.current(); };
    canvas.addEventListener('webglcontextlost', handleLost, false);

    let frame = 0;
    let last = 0;
    const started = performance.now();
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (document.visibilityState === 'hidden' || now - last < FRAME_MS) return;
      const delta = last ? (now - last) / 1000 : FRAME_MS / 1000;
      last = now;
      const t = (now - started) / 1000;
      model.update?.(t, delta, reduced);
      const pose = resolveTodayPetPose(moodRef.current, t, reduced);
      const targetYaw = (facingRef.current === 1 ? 0.55 : -0.55) + pose.spin;
      yaw += (targetYaw - yaw) * (reduced ? 1 : 0.18);
      pivot.rotation.y = yaw;
      pivot.position.y = pose.lift - 0.05;
      pivot.scale.set(1 / Math.sqrt(pose.stretch), pose.stretch, 1 / Math.sqrt(pose.stretch));
      model.head.rotation.x = pose.nod;
      model.head.rotation.z = pose.tilt;
      model.armPivots.forEach((arm, index) => { arm.rotation.z = restArm[index]! + (index === 0 ? -pose.arms : pose.arms); });
      model.leafPivots.forEach((leaf, index) => { leaf.rotation.z = restLeaf[index]! + (leaf.position.x < 0 ? pose.leaves : -pose.leaves); });
      model.eyePivots.forEach((eye, index) => { eye.scale.y = restEye[index]! * Math.max(0.05, 1 - pose.eyesClosed); });
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('webglcontextlost', handleLost);
      model.dispose();
      renderer.dispose();
    };
  }, [creatureId, sizePx, reduced]);

  return <canvas ref={canvasRef} className="today-pet__canvas" width={sizePx} height={sizePx} aria-hidden="true" />;
}
