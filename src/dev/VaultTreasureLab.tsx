import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createVaultTreasureModel,
  getVaultTreasureDefinition,
  VAULT_TREASURE_DEFINITIONS,
  type VaultTreasureId,
  type VaultTreasureModel,
} from '../features/gamification/level-worlds/dev/VaultTreasureModels';
import { VAULT_ISLAND_LAB_ROUTES } from '../features/gamification/level-worlds/dev/VaultIslandLabContract';
import { installVaultPremiumEnvironment } from '../features/gamification/level-worlds/dev/VaultPremiumLookdev';
import './VaultTreasureLab.css';

type TreasureRuntime = VaultTreasureModel & {
  id: VaultTreasureId;
  home: THREE.Vector3;
};

interface VaultTreasureLabQaSnapshot {
  selectedTreasureId: VaultTreasureId;
  inspectMode: boolean;
  revealRun: number;
  frameCount: number;
  canvasWidth: number;
  canvasHeight: number;
  treasureCount: number;
  museumValue: number;
}

function resolveTreasureHome(index: number, total: number) {
  const angle = -1.16 + (index / Math.max(1, total - 1)) * 2.32;
  return new THREE.Vector3(Math.sin(angle) * 2.75, 0, -0.22 - Math.cos(angle) * 0.52);
}

function resolveTreasureScale(id: VaultTreasureId) {
  return id === 'obelisk' || id === 'hourglass' ? 0.64 : 0.7;
}

function resolveSelectedTreasureScale(id: VaultTreasureId, inspecting: boolean) {
  const fit = id === 'key' ? 0.72 : id === 'crown' ? 1.04 : id === 'chalice' ? 1.02 : 0.96;
  return fit * (inspecting ? 1.22 : 1);
}

export default function VaultTreasureLab() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const selectedRef = useRef<VaultTreasureId>('crown');
  const revealRunRef = useRef(0);
  const inspectingRef = useRef(false);
  const [selectedId, setSelectedId] = useState<VaultTreasureId>('crown');
  const [revealRun, setRevealRun] = useState(0);
  const [isInspecting, setIsInspecting] = useState(false);
  const selectedTreasure = useMemo(() => getVaultTreasureDefinition(selectedId), [selectedId]);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    revealRunRef.current = revealRun;
  }, [revealRun]);

  useEffect(() => {
    inspectingRef.current = isInspecting;
  }, [isInspecting]);

  useEffect(() => {
    const dock = dockRef.current;
    const active = dock?.querySelector<HTMLButtonElement>('.is-active');
    if (!dock || !active) return;
    dock.scrollTo({
      left: active.offsetLeft - (dock.clientWidth - active.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }, [selectedId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eff5f3');
    scene.fog = new THREE.Fog('#eff5f3', 8, 16);

    const camera = new THREE.PerspectiveCamera(34, 390 / 844, 0.1, 50);
    camera.position.set(0, 2.9, 7.15);
    camera.lookAt(0, 0.98, 0.12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const premiumEnvironment = installVaultPremiumEnvironment(renderer, scene, 0.46);

    const hemi = new THREE.HemisphereLight('#fff8e6', '#1b3152', 1.55);
    const key = new THREE.DirectionalLight('#fff1c8', 4.2);
    key.position.set(-3.5, 5.8, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    const rim = new THREE.DirectionalLight('#92eaff', 1.25);
    rim.position.set(3.2, 2.2, -3.8);
    scene.add(hemi, key, rim);

    const floorMaterial = new THREE.MeshStandardMaterial({ color: '#d8d0bd', roughness: 0.48, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.12, 72), floorMaterial);
    floor.name = 'treasure-lab-marble-floor';
    floor.position.y = -0.06;
    floor.receiveShadow = true;
    scene.add(floor);

    const backdropMaterial = new THREE.MeshStandardMaterial({ color: '#172942', roughness: 0.34, metalness: 0.08, side: THREE.DoubleSide });
    const goldMaterial = new THREE.MeshPhysicalMaterial({ color: '#f3b72e', roughness: 0.16, metalness: 0.8, clearcoat: 0.72, clearcoatRoughness: 0.08, emissive: '#5f2300', emissiveIntensity: 0.1, envMapIntensity: 1.62 });
    const sapphireMaterial = new THREE.MeshPhysicalMaterial({
      color: '#2d7cff',
      roughness: 0.07,
      metalness: 0,
      transmission: 0.12,
      thickness: 0.28,
      clearcoat: 1,
      emissive: '#082a68',
      emissiveIntensity: 0.28,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: '#ffdf86',
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const backdrop = new THREE.Group();
    backdrop.name = 'treasure-lab-vault-backdrop';
    const rearPanel = new THREE.Mesh(new THREE.CircleGeometry(2.18, 72), backdropMaterial);
    rearPanel.name = 'treasure-lab-deep-vault-rear-panel';
    rearPanel.position.set(0, 1.62, -1.48);
    rearPanel.receiveShadow = true;
    backdrop.add(rearPanel);

    const rearPanelRim = new THREE.Mesh(new THREE.TorusGeometry(2.04, 0.04, 8, 96), goldMaterial);
    rearPanelRim.name = 'treasure-lab-rear-panel-gold-rim';
    rearPanelRim.position.set(0, 1.62, -1.45);
    rearPanelRim.castShadow = true;
    backdrop.add(rearPanelRim);

    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.46, 0.018), goldMaterial);
      ray.name = 'treasure-lab-rear-panel-gold-ray';
      ray.position.set(Math.sin(angle) * 1.35, 1.62 + Math.cos(angle) * 1.35, -1.42);
      ray.rotation.z = -angle;
      ray.castShadow = true;
      backdrop.add(ray);
    }

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 2.7, 3.2, 64, 1, true, Math.PI * 0.18, Math.PI * 0.64),
      backdropMaterial,
    );
    shell.name = 'treasure-lab-curved-gallery-wall';
    shell.position.set(0, 1.35, -0.28);
    shell.receiveShadow = true;
    backdrop.add(shell);

    for (let index = 0; index < 11; index += 1) {
      const angle = Math.PI * 0.23 + (index / 10) * Math.PI * 0.54;
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 2.65, 8), goldMaterial);
      rib.name = 'treasure-lab-gallery-gold-rib';
      rib.position.set(Math.sin(angle) * 2.58, 1.42, Math.cos(angle) * 2.58 - 0.28);
      rib.rotation.z = Math.sin(angle) * 0.24;
      rib.castShadow = true;
      backdrop.add(rib);
    }

    for (const x of [-2.35, 2.35]) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 2.9, 18), backdropMaterial);
      column.name = 'treasure-lab-side-column';
      column.position.set(x, 1.35, -1.15);
      column.castShadow = true;
      column.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.32), goldMaterial);
      cap.name = 'treasure-lab-column-gold-cap';
      cap.position.set(x, 2.82, -1.15);
      cap.castShadow = true;
      backdrop.add(column, cap);

      for (let row = 0; row < 4; row += 1) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.055, 0.18), goldMaterial);
        shelf.name = 'treasure-lab-side-relic-shelf';
        shelf.position.set(x * 0.82, 0.86 + row * 0.38, -1.0);
        shelf.rotation.y = x < 0 ? 0.24 : -0.24;
        shelf.castShadow = true;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + (row % 2) * 0.02, 0), sapphireMaterial);
        gem.name = 'treasure-lab-side-shelf-sapphire';
        gem.position.set(x * 0.82, 0.96 + row * 0.38, -0.9);
        gem.castShadow = true;
        backdrop.add(shelf, gem);
      }
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.64, 0.055, 8, 64, Math.PI), goldMaterial);
    arch.name = 'treasure-lab-gold-arch';
    arch.position.set(0, 2.25, -1.15);
    arch.rotation.z = Math.PI;
    backdrop.add(arch);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), glowMaterial);
    glow.name = 'treasure-lab-arch-gold-glow';
    glow.position.set(0, 1.62, -1.2);
    backdrop.add(glow);
    scene.add(backdrop);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const treasures: TreasureRuntime[] = VAULT_TREASURE_DEFINITIONS.map(({ id }, index) => {
      const model = createVaultTreasureModel(id);
      const home = resolveTreasureHome(index, VAULT_TREASURE_DEFINITIONS.length);
      model.root.position.copy(home);
      model.root.scale.setScalar(resolveTreasureScale(id));
      scene.add(model.root);
      return { ...model, id, home };
    });

    const sparkleGeometry = new THREE.OctahedronGeometry(0.04, 0);
    const sparkleMaterial = new THREE.MeshBasicMaterial({
      color: '#fff0a6',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparkles = new THREE.Group();
    sparkles.name = 'treasure-reveal-sparkle-burst';
    sparkles.visible = false;
    for (let index = 0; index < 28; index += 1) {
      const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
      sparkle.name = 'treasure-reveal-sparkle';
      sparkle.userData.angle = (index / 28) * Math.PI * 2;
      sparkle.userData.height = (index % 7) * 0.08 - 0.18;
      sparkle.userData.speed = 0.9 + (index % 5) * 0.13;
      sparkles.add(sparkle);
    }
    scene.add(sparkles);

    const revealRingMaterial = new THREE.MeshBasicMaterial({
      color: '#d99b20',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const revealRings = new THREE.Group();
    revealRings.name = 'treasure-lab-luxury-reveal-rings';
    revealRings.visible = false;
    for (let index = 0; index < 4; index += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48 + index * 0.11, 0.012, 6, 72), revealRingMaterial);
      ring.name = 'treasure-lab-luxury-reveal-gold-ring';
      ring.rotation.set(index * 0.46, index * 0.62, index * 0.34);
      revealRings.add(ring);
    }
    scene.add(revealRings);

    const revealLight = new THREE.PointLight('#ffd36b', 0, 5.2, 2);
    revealLight.name = 'treasure-lab-luxury-reveal-light';
    scene.add(revealLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3.8;
    controls.maxDistance = 8;
    controls.minPolarAngle = 0.58;
    controls.maxPolarAngle = 1.25;
    controls.target.set(0, 0.9, 0);

    const resize = () => {
      const width = mount.clientWidth || 390;
      const height = mount.clientHeight || 844;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const handlePointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find((entry) => entry.object.userData.treasureId);
      const nextId = hit?.object.userData.treasureId as VaultTreasureId | undefined;
      if (nextId) {
        if (nextId === selectedRef.current) {
          setIsInspecting((value) => !value);
        } else {
          setSelectedId(nextId);
          setIsInspecting(true);
        }
        setRevealRun((value) => value + 1);
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const clock = new THREE.Clock();
    let raf = 0;
    let lastRevealRun = revealRunRef.current;
    let revealStartedAt = -10;
    let frameCount = 0;
    const galleryTarget = new THREE.Vector3(0, 0.06, 0.26);
    const inspectTarget = new THREE.Vector3(0, 0.08, 1.08);
    const sparkleCenter = new THREE.Vector3();
    const galleryControlTarget = new THREE.Vector3(0, 1.0, 0.12);
    const inspectControlTarget = new THREE.Vector3(0, 1.08, 0.82);
    const scaleTarget = new THREE.Vector3();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      if (lastRevealRun !== revealRunRef.current) {
        lastRevealRun = revealRunRef.current;
        revealStartedAt = elapsed;
      }
      const revealT = Math.min(1, (elapsed - revealStartedAt) / 1.4);
      const easedReveal = 1 - Math.pow(1 - revealT, 3);
      const selected = selectedRef.current;
      const inspecting = inspectingRef.current;
      const selectedTarget = inspecting ? inspectTarget : galleryTarget;

      treasures.forEach((model, index) => {
        const isSelected = model.id === selected;
        const target = isSelected ? selectedTarget : model.home;
        model.root.position.lerp(target, isSelected ? 0.1 : 0.08);
        const baseScale = resolveTreasureScale(model.id);
        const selectedPulse = revealT < 1 && isSelected ? 0.22 * Math.sin(easedReveal * Math.PI) : 0;
        const targetScale = isSelected
          ? resolveSelectedTreasureScale(model.id, inspecting) + selectedPulse
          : baseScale * (inspecting ? 0.58 : 1);
        scaleTarget.set(targetScale, targetScale, targetScale);
        model.root.scale.lerp(scaleTarget, 0.08);
        model.treasure.rotation.y = isSelected
          ? Math.sin(elapsed * (inspecting ? 0.48 : 0.8) + index * 0.12) * (inspecting ? 0.28 : 0.18)
          : elapsed * 0.35 + index * 0.45;
        model.treasure.position.y = 0.03 + Math.sin(elapsed * 1.6 + index) * (isSelected ? 0.035 : 0.014);
      });

      const sparkleOpacity = revealT < 1 ? Math.sin(revealT * Math.PI) * 0.82 : 0;
      sparkleMaterial.opacity = sparkleOpacity;
      sparkles.visible = sparkleOpacity > 0.02;
      sparkleCenter.copy(selectedTarget);
      sparkleCenter.y += 1.04;
      sparkles.position.copy(sparkleCenter);
      sparkles.rotation.y += 0.018;
      revealRings.position.copy(sparkleCenter);
      revealRings.visible = sparkleOpacity > 0.02;
      revealRings.scale.setScalar(0.48 + easedReveal * 1.36);
      revealRingMaterial.opacity = sparkleOpacity * 0.68;
      revealRings.rotation.set(elapsed * 0.54, elapsed * 0.82, elapsed * 0.4);
      revealLight.position.copy(sparkleCenter);
      revealLight.intensity = sparkleOpacity * 3.8;
      sparkles.children.forEach((sparkle, index) => {
        const angle = Number(sparkle.userData.angle) + elapsed * Number(sparkle.userData.speed);
        const radius = 0.38 + easedReveal * 0.9 + (index % 4) * 0.025;
        sparkle.position.set(
          Math.sin(angle) * radius,
          Number(sparkle.userData.height) + Math.sin(elapsed * 3.2 + index) * 0.08,
          Math.cos(angle) * radius,
        );
        sparkle.rotation.set(elapsed * 1.7 + index, elapsed * 2.1, angle);
        const sparkleScale = 1.3 - easedReveal * 0.55 + (index % 3) * 0.16;
        sparkle.scale.setScalar(sparkleScale);
      });

      controls.enabled = !inspecting;
      controls.target.lerp(inspecting ? inspectControlTarget : galleryControlTarget, 0.06);
      controls.update();
      renderer.render(scene, camera);
      frameCount += 1;
      if (frameCount === 2 || frameCount % 30 === 0) {
        const snapshot: VaultTreasureLabQaSnapshot = {
          selectedTreasureId: selected,
          inspectMode: inspecting,
          revealRun: revealRunRef.current,
          frameCount,
          canvasWidth: renderer.domElement.width,
          canvasHeight: renderer.domElement.height,
          treasureCount: treasures.length,
          museumValue: getVaultTreasureDefinition(selected).value,
        };
        (window as unknown as { __vaultTreasureLabQa?: VaultTreasureLabQaSnapshot }).__vaultTreasureLabQa = snapshot;
      }
      raf = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      observer.disconnect();
      controls.dispose();
      treasures.forEach((treasure) => treasure.dispose());
      floor.geometry.dispose();
      floorMaterial.dispose();
      backdrop.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
      backdropMaterial.dispose();
      goldMaterial.dispose();
      sapphireMaterial.dispose();
      glowMaterial.dispose();
      sparkleGeometry.dispose();
      sparkleMaterial.dispose();
      revealRings.children.forEach((ring) => {
        if (ring instanceof THREE.Mesh) ring.geometry.dispose();
      });
      revealRingMaterial.dispose();
      premiumEnvironment.dispose();
      delete (window as unknown as { __vaultTreasureLabQa?: VaultTreasureLabQaSnapshot }).__vaultTreasureLabQa;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <main className="vault-treasure-lab">
      <section className={`vault-treasure-lab__phone${isInspecting ? ' is-inspecting' : ''}`} aria-label="Vault treasure 3D lab">
        <div ref={mountRef} className="vault-treasure-lab__stage" />
        <header className="vault-treasure-lab__top">
          <span>Treasure Lab</span>
          <strong>{selectedTreasure.rarity}</strong>
        </header>
        <article className="vault-treasure-lab__card" aria-live="polite">
          <p>{selectedTreasure.origin}</p>
          <h1>{selectedTreasure.name}</h1>
          <div className="vault-treasure-lab__value">
            <span>museum value</span>
            <strong>{selectedTreasure.value.toLocaleString()}</strong>
          </div>
          <small>{selectedTreasure.materialStory}</small>
        </article>
        <nav ref={dockRef} className="vault-treasure-lab__dock" aria-label="Select treasure">
          {VAULT_TREASURE_DEFINITIONS.map((treasure) => (
            <button
              key={treasure.id}
              type="button"
              className={treasure.id === selectedId ? 'is-active' : ''}
              onClick={() => {
                setSelectedId(treasure.id);
                setIsInspecting(false);
                setRevealRun((value) => value + 1);
              }}
            >
              {treasure.name.split(' ')[0]}
            </button>
          ))}
        </nav>
        <button type="button" className="vault-treasure-lab__island-link" onClick={() => { window.location.href = VAULT_ISLAND_LAB_ROUTES.interior; }}>
          Vault room
        </button>
        <button
          type="button"
          className="vault-treasure-lab__inspect"
          aria-pressed={isInspecting}
          onClick={() => setIsInspecting((value) => !value)}
        >
          {isInspecting ? 'Gallery' : 'Inspect'}
        </button>
        <button type="button" className="vault-treasure-lab__reveal" onClick={() => setRevealRun((value) => value + 1)}>
          Reveal shine
        </button>
      </section>
    </main>
  );
}
