import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { createRobotFamilyModel, type RobotRole } from '../dev/RobotFamilyThreeModel';
import { lockPageScroll } from '../../../../utils/scrollLock';
import {
  ISLAND_20_ARRIVAL_BEATS,
  ISLAND_20_ARRIVAL_DURATION_S,
  nextIsland20ArrivalBeatStart,
  resolveIsland20ArrivalBeat,
  resolveIsland20RobotPose,
} from '../services/island20ArrivalStory';
import './island20-arrival-story.css';

const ROLES: readonly RobotRole[] = ['heavy-worker', 'mini-artist', 'project-manager'];
const CAMERA_Z = 20;
const CAMERA_FOV = 30;
const ROBOT_BASE_SCALE = 0.27;

/**
 * Island 020 arrival: nobody meets the crew at the Obsidian Gate, so the
 * little robot flies over the citadel turret, flanked by the other two.
 * Viewport portal over the live island; presentation only.
 */
export function Island20ArrivalStory({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [beatIndex, setBeatIndex] = useState(0);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current();
  }, []);

  const advance = useCallback(() => {
    const next = nextIsland20ArrivalBeatStart(elapsedRef.current);
    if (next >= ISLAND_20_ARRIVAL_DURATION_S) finish();
    else elapsedRef.current = next;
  }, [finish]);

  useEffect(() => {
    const unlockScroll = lockPageScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); advance(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { unlockScroll(); window.removeEventListener('keydown', onKey); };
  }, [advance, finish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      if (canvas) renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch {
      renderer = null;
    }
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffe2c8, 0x40160a, 2.2));
    const key = new THREE.DirectionalLight(0xffc48a, 3.2);
    key.position.set(-4, 7, 8);
    scene.add(key);
    const family = createRobotFamilyModel({ quality: 'low', showAddonRack: false });
    family.setExternalRootMotion(true);
    family.setBrainState('curious');
    scene.add(family.root);
    // Original thruster glows so the crew reads as flying.
    const thrusterMaterial = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, toneMapped: false });
    const thrusters = new Map<RobotRole, THREE.Mesh>();
    ROLES.forEach((role) => {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.1, 10), thrusterMaterial);
      flame.rotation.x = Math.PI;
      flame.position.y = -0.5;
      flame.visible = false;
      family.members[role].add(flame);
      thrusters.set(role, flame);
    });
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 80);
    camera.position.set(0, 0, CAMERA_Z);
    camera.lookAt(0, 0, 0);
    const visibleHeight = 2 * CAMERA_Z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const resize = () => {
      if (!renderer || !canvas) return;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    let last = performance.now();
    let shownBeat = -1;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) elapsedRef.current += dt;
      const elapsed = elapsedRef.current;
      if (elapsed >= ISLAND_20_ARRIVAL_DURATION_S) { finish(); return; }
      const beat = resolveIsland20ArrivalBeat(elapsed);
      const index = ISLAND_20_ARRIVAL_BEATS.indexOf(beat);
      if (index !== shownBeat) { shownBeat = index; setBeatIndex(index); }
      const visibleWidth = visibleHeight * camera.aspect;
      ROLES.forEach((role) => {
        const pose = resolveIsland20RobotPose(role, elapsed, reducedMotion);
        const member = family.members[role];
        member.visible = pose.visible;
        member.position.set((pose.x - 0.5) * visibleWidth, (0.5 - pose.y) * visibleHeight, 0);
        if (!reducedMotion && !pose.flying) member.position.y += Math.sin(elapsed * 2.4 + ROLES.indexOf(role)) * 0.05;
        member.scale.setScalar(ROBOT_BASE_SCALE * pose.scale);
        member.rotation.y = pose.heading;
        member.rotation.z = pose.flying ? -pose.heading * 0.35 : 0;
        family.setMemberMotion(role, pose.motion);
        family.setMemberEmotion(role, pose.emotion);
        const flame = thrusters.get(role);
        if (flame) {
          flame.visible = pose.flying;
          if (pose.flying) flame.scale.set(1, 0.8 + Math.sin(elapsed * 30 + ROLES.indexOf(role)) * 0.2, 1);
        }
      });
      family.update(elapsed, dt, reducedMotion);
      renderer?.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      thrusters.forEach((flame) => flame.geometry.dispose());
      thrusterMaterial.dispose();
      family.dispose();
      renderer?.dispose();
    };
  }, [finish]);

  if (typeof document === 'undefined') return null;
  const beat = ISLAND_20_ARRIVAL_BEATS[beatIndex] ?? ISLAND_20_ARRIVAL_BEATS[0];
  const isOrder = beat.speaker === 'Central Command';
  return createPortal(
    <div
      className={`i20-arrival i20-arrival--${beat.phase}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="i20-arrival-title"
      onClick={advance}
    >
      <div className="i20-arrival__backdrop" aria-hidden="true" />
      <canvas ref={canvasRef} className="i20-arrival__crew" aria-hidden="true" />
      <header className="i20-arrival__header">
        <small>Island 020 · Arrival</small>
        <h2 id="i20-arrival-title">The Obsidian Gate</h2>
      </header>
      <button
        type="button"
        className="i20-arrival__skip"
        onClick={(event) => { event.stopPropagation(); finish(); }}
      >
        Skip
      </button>
      {beat.phase === 'empty' ? <div className="i20-arrival__empty-gate" aria-hidden="true"><span>no one here</span></div> : null}
      <div
        key={beatIndex}
        className={`i20-arrival__line${isOrder ? ' i20-arrival__line--order' : ''}`}
        role="status"
        aria-live="polite"
      >
        <small>{isOrder ? '📡 Central Command · earlier, en route' : beat.speaker}</small>
        <strong>{beat.text}</strong>
        <span className="i20-arrival__tap" aria-hidden="true">Tap to continue</span>
      </div>
    </div>,
    document.body,
  );
}
