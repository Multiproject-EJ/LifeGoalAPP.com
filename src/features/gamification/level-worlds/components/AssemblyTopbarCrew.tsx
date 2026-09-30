import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createRobotFamilyModel, type RobotMotion, type RobotRole } from '../dev/RobotFamilyThreeModel';
import { ASSEMBLY_TOPBAR_BLAST_MS, resolveAssemblyTopbarCrewPoses } from '../services/assemblyTopbarBlast';

/**
 * The game's own three robots repairing the top bar after the Island 001
 * shockwave: Heavy Worker lifts, Project Manager rewires, Mini Artist sweeps.
 * One short-lived renderer, disposed when the sequence ends. Presentation only.
 */
export default function AssemblyTopbarCrew({ startedAtMs }: { startedAtMs: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xe0f7ff, 0x324366, 2.4));
    const key = new THREE.DirectionalLight(0xffe8cf, 3.4);
    key.position.set(-4, 7, 8);
    scene.add(key);
    const family = createRobotFamilyModel({ quality: 'low', showAddonRack: false });
    family.setEmotion('focused');
    scene.add(family.root);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    camera.position.set(0, 1.1, 17);
    camera.lookAt(0, 1.1, 0);
    let visibleWidth = 20;
    const resize = () => {
      const width = canvas.clientWidth || 390;
      const height = canvas.clientHeight || 170;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      visibleWidth = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const appliedMotion = new Map<RobotRole, RobotMotion>();
    // Shared clock with the CSS sequence, even if this module loaded late.
    const started = startedAtMs;
    let last = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const t = (now - started) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      family.update(t, dt, false);
      for (const pose of resolveAssemblyTopbarCrewPoses(t)) {
        const member = family.members[pose.role];
        member.visible = pose.visible;
        if (appliedMotion.get(pose.role) !== pose.motion) {
          appliedMotion.set(pose.role, pose.motion);
          family.setMemberMotion(pose.role, pose.motion);
          if (pose.motion === 'celebrate') family.setMemberEmotion(pose.role, 'delighted');
        }
        // Scale the crew to the bar: x across the bar, dropping in from below.
        member.position.x = (pose.x - 0.5) * visibleWidth * 0.92;
        member.position.y += -pose.drop * 3.4;
      }
      renderer.render(scene, camera);
      if (t * 1000 < ASSEMBLY_TOPBAR_BLAST_MS) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      family.dispose();
      renderer.dispose();
    };
  }, [startedAtMs]);
  return <canvas ref={canvasRef} className="assembly-topbar-blast__crew" aria-hidden="true" />;
}
