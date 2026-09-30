import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LivingController } from '../../features/gamification/level-worlds/components/living-controller/LivingController';
import { createRobotFamilyModel, type RobotMotion, type RobotRole } from '../../features/gamification/level-worlds/dev/RobotFamilyThreeModel';

/**
 * Dev-only: renders one landing-hero character from the game's own 3D models
 * onto a transparent canvas, for capturing the hero animation sprites.
 * /dev/hero-sprite-studio?subject=robot&role=heavy-worker&motion=carry&t=0.6
 * /dev/hero-sprite-studio?subject=controller&yaw=-30&pitch=24
 * See public/landing-page-assets/hero/README.md for the capture recipe.
 */
const noop = () => undefined;

/** The real in-game living controller, idle, for the "controller" subject. */
function ControllerSubject() {
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const timer = window.setTimeout(() => {
      const host = document.getElementById('hero-sprite-studio');
      if (host) host.dataset.ready = 'true';
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div id="hero-sprite-studio" className="hero-sprite-studio--controller" style={{ width: 420, position: 'relative', paddingTop: 40 }}>
      <style>{'.hero-sprite-studio--controller .living-controller-dock{position:relative!important;inset:auto!important;transform:none!important}.hero-sprite-studio--controller .living-controller-label,.hero-sprite-studio--controller .living-controller-hit{opacity:0!important}'}</style>
      <LivingController
        dark={false} dev={false} dice={30} multiplier={1} maximum={5} cost={1} islandNumber={1}
        rolling={false} autoRolling={false} jackpot={false} buildReady={false} tutorial={false}
        blocked={false} rollDisabled={false} multiplierDisabled={false} canHold={false}
        rollTitle="Roll" regenLabel="" concordLabel="Story"
        onRoll={noop} onHoldStart={noop} onHoldEnd={noop} onStopAuto={noop}
        onMultiplier={noop} onShop={noop} onBuild={noop} onCreatures={noop} onConcord={noop}
        fallback={null}
      />
    </div>
  );
}

export default function HeroSpriteStudio() {
  const subject = new URLSearchParams(window.location.search).get('subject');
  return subject === 'controller' ? <ControllerSubject /> : <RobotSubject />;
}

function RobotSubject() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const params = new URLSearchParams(window.location.search);
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const size = Number(params.get('size') ?? 768);
    const yaw = Number(params.get('yaw') ?? 0) * (Math.PI / 180);
    const pitch = Number(params.get('pitch') ?? 8) * (Math.PI / 180);
    const poseTime = Number(params.get('t') ?? 0.6);
    const margin = Number(params.get('margin') ?? 1.12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.HemisphereLight(0xf2fcff, 0x334555, 2.2));
    const key = new THREE.DirectionalLight(0xfff2d6, 4.6);
    key.position.set(3, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bdcff, 1.8);
    fill.position.set(-5, 2, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xbdeaff, 3.2);
    rim.position.set(-2, 4, -6);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
    const pivot = new THREE.Group();
    scene.add(pivot);

    const frame = (subjectRoot: THREE.Object3D) => {
      pivot.rotation.set(0, yaw, 0);
      pivot.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(subjectRoot, true);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const distance = (sphere.radius * margin) / Math.sin((camera.fov * Math.PI) / 360);
      camera.position.set(
        sphere.center.x,
        sphere.center.y + Math.sin(pitch) * distance,
        sphere.center.z + Math.cos(pitch) * distance,
      );
      camera.lookAt(sphere.center);
      renderer.render(scene, camera);
      host.dataset.ready = 'true';
    };

    const role = (params.get('role') ?? 'heavy-worker') as RobotRole;
    const motion = (params.get('motion') ?? 'idle') as RobotMotion;
    const family = createRobotFamilyModel({ quality: 'high', showAddonRack: false, fixtureLights: false, transmission: false });
    (Object.keys(family.members) as RobotRole[]).forEach((member) => {
      family.members[member].visible = member === role;
    });
    family.setExternalRootMotion(true);
    family.members[role].position.set(0, 0, 0);
    family.setMotion(motion);
    family.setEmotion('delighted');
    // Advance the motion to a readable pose.
    for (let step = 0; step <= 30; step += 1) family.update((poseTime * step) / 30, poseTime / 30);
    pivot.add(family.root);
    frame(family.members[role]);

    return () => {
      family.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} id="hero-sprite-studio" style={{ display: 'inline-block', background: 'transparent' }} />;
}
