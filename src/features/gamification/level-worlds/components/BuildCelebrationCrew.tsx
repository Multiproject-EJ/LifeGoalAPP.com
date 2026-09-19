import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createRobotFamilyModel } from '../dev/RobotFamilyThreeModel';

/** Modal-owned presentation, never a second game state. One renderer per open panel. */
export default function BuildCelebrationCrew({ active, orbit = false }: { active: boolean; orbit?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ active, orbit });
  stateRef.current = { active, orbit };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' }); }
    catch { canvas.dataset.unavailable = 'true'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xe0f7ff, 0x324366, 2.4));
    const key = new THREE.DirectionalLight(0xffe8cf, 3.5); key.position.set(-4, 7, 8); scene.add(key);
    const family = createRobotFamilyModel({ quality: 'low', showAddonRack: false });
    family.setMotion('celebrate'); family.setEmotion('delighted'); family.setBrainState('energized');
    scene.add(family.root);
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
    camera.position.set(0, 2.5, 20); camera.lookAt(0, 1.45, 0);
    const resize = () => {
      const width = canvas.clientWidth || 390, height = canvas.clientHeight || 220;
      renderer.setSize(width, height, false); camera.aspect = width / height;
      camera.position.z = Math.max(13, 5.6 / (Math.tan(Math.PI / 12) * camera.aspect));
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = performance.now(), elapsed = 0, wasActive = false;
    const draw = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const state = stateRef.current;
      if (state.active && !document.hidden) {
        if (!wasActive) elapsed = 0;
        elapsed += dt;
        family.update(elapsed, dt, motion.matches);
        family.root.rotation.y = state.orbit && !motion.matches ? elapsed * Math.PI * 2 : 0;
        renderer.render(scene, camera);
      }
      wasActive = state.active;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); family.dispose(); renderer.dispose(); };
  }, []);
  return <canvas ref={canvasRef} className={`bm2-celebration-crew${active ? ' is-active' : ''}`} aria-label="Your three robot builders celebrating" role="img" aria-hidden={!active} />;
}
