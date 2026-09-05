import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { installVaultPremiumEnvironment } from '../features/gamification/level-worlds/dev/VaultPremiumLookdev';

interface VaultCrownDiceThreeProps {
  dice: readonly number[];
  heldIndices: readonly number[];
  selectedDie: number;
  inspectOnly: boolean;
  animationRevision: number;
  animatedIndices: readonly number[];
  onSelectDie: (index: number) => void;
}

const FACE_PIPS: Record<number, readonly [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
};

const DIE_FACE_ROTATIONS: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, 0, Math.PI / 2),
  4: new THREE.Euler(0, 0, -Math.PI / 2),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
};

const JEWEL_COLORS = ['#9e173d', '#176c9e', '#0c775e', '#703495', '#0e8190'] as const;

function addFacePips(
  group: THREE.Group,
  value: number,
  axis: 'x' | 'y' | 'z',
  sign: 1 | -1,
  material: THREE.Material,
) {
  const half = 0.286;
  const spread = 0.115;
  for (const [horizontal, vertical] of FACE_PIPS[value]) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), material);
    if (axis === 'y') {
      pip.position.set(horizontal * spread, sign * half, -vertical * spread);
      pip.scale.set(1, 0.38, 1);
    } else if (axis === 'z') {
      pip.position.set(horizontal * spread, vertical * spread, sign * half);
      pip.scale.set(1, 1, 0.38);
    } else {
      pip.position.set(sign * half, vertical * spread, -horizontal * spread);
      pip.scale.set(0.38, 1, 1);
    }
    pip.castShadow = true;
    group.add(pip);
  }
}

function createDie(index: number, pipMaterial: THREE.Material) {
  const group = new THREE.Group();
  group.name = `vault-crown-die-${index + 1}`;
  group.userData.dieIndex = index;
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: JEWEL_COLORS[index % JEWEL_COLORS.length],
    roughness: 0.13,
    metalness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.7,
    emissive: JEWEL_COLORS[index % JEWEL_COLORS.length],
    emissiveIntensity: 0.07,
  });
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.55, 0.55, 5, 0.09), bodyMaterial);
  body.name = `vault-crown-die-body-${index + 1}`;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  addFacePips(group, 1, 'y', 1, pipMaterial);
  addFacePips(group, 6, 'y', -1, pipMaterial);
  addFacePips(group, 2, 'z', 1, pipMaterial);
  addFacePips(group, 5, 'z', -1, pipMaterial);
  addFacePips(group, 3, 'x', 1, pipMaterial);
  addFacePips(group, 4, 'x', -1, pipMaterial);
  return { group, bodyMaterial };
}

function createCrown(goldMaterial: THREE.Material, gemMaterials: readonly THREE.Material[]) {
  const crown = new THREE.Group();
  crown.name = 'vault-crown-dice-sovereign-crown';
  const shape = new THREE.Shape();
  shape.moveTo(-2.05, 0);
  shape.lineTo(-1.88, 0.62);
  shape.lineTo(-1.42, 0.18);
  shape.lineTo(-0.88, 1.25);
  shape.lineTo(-0.36, 0.2);
  shape.lineTo(0.12, 1.5);
  shape.lineTo(0.66, 0.18);
  shape.lineTo(1.2, 1.12);
  shape.lineTo(1.7, 0.22);
  shape.lineTo(2.05, 0.7);
  shape.lineTo(1.88, -0.5);
  shape.lineTo(-1.82, -0.5);
  shape.closePath();
  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.04, bevelSegments: 3 }),
    goldMaterial,
  );
  plate.position.z = -0.08;
  plate.castShadow = true;
  crown.add(plate);

  const lowerRail = new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.18, 0.26, 4, 0.06), goldMaterial);
  lowerRail.position.set(0, -0.28, 0.03);
  lowerRail.castShadow = true;
  crown.add(lowerRail);

  const gemX = [-1.42, -0.72, 0, 0.72, 1.42];
  gemX.forEach((x, index) => {
    const setting = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), gemMaterials[index]);
    setting.position.set(x, -0.05, 0.22);
    setting.rotation.z = Math.PI / 4;
    setting.scale.y = 1.25;
    setting.castShadow = true;
    crown.add(setting);
  });
  return crown;
}

export default function VaultCrownDiceThree({
  dice,
  heldIndices,
  selectedDie,
  inspectOnly,
  animationRevision,
  animatedIndices,
  onSelectDie,
}: VaultCrownDiceThreeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const diceRef = useRef(dice);
  const heldRef = useRef(heldIndices);
  const selectedRef = useRef(selectedDie);
  const inspectRef = useRef(inspectOnly);
  const selectRef = useRef(onSelectDie);
  const rollStartedAtRef = useRef(0);
  const rollingIndicesRef = useRef(new Set<number>());

  useEffect(() => { diceRef.current = dice; }, [dice]);
  useEffect(() => { heldRef.current = heldIndices; }, [heldIndices]);
  useEffect(() => { selectedRef.current = selectedDie; }, [selectedDie]);
  useEffect(() => { inspectRef.current = inspectOnly; }, [inspectOnly]);
  useEffect(() => { selectRef.current = onSelectDie; }, [onSelectDie]);
  useEffect(() => {
    rollingIndicesRef.current = new Set(animatedIndices);
    rollStartedAtRef.current = typeof performance === 'undefined' ? 0 : performance.now();
  }, [animatedIndices, animationRevision]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#06142b');
    scene.fog = new THREE.Fog('#06142b', 7.2, 14);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    camera.position.set(0, 3.7, 7.5);
    camera.lookAt(0, 0.82, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', 'Five three-dimensional gemstone dice in the Crown Dice casting bowl');
    renderer.domElement.setAttribute('role', 'img');
    mount.appendChild(renderer.domElement);
    const environment = installVaultPremiumEnvironment(renderer, scene, 0.58);

    const warm = new THREE.DirectionalLight('#ffd791', 5.4);
    warm.position.set(-3.5, 6.2, 4.5);
    warm.castShadow = true;
    warm.shadow.mapSize.set(1024, 1024);
    warm.shadow.camera.left = -4;
    warm.shadow.camera.right = 4;
    warm.shadow.camera.top = 4;
    warm.shadow.camera.bottom = -4;
    const cool = new THREE.DirectionalLight('#5bdcff', 2.1);
    cool.position.set(3.8, 2.8, -3.5);
    const fill = new THREE.HemisphereLight('#fff1ca', '#061329', 1.55);
    const crownGlow = new THREE.PointLight('#f7bb3c', 13, 6, 2);
    crownGlow.position.set(0, 2.55, 0.3);
    scene.add(warm, cool, fill, crownGlow);

    const gold = new THREE.MeshPhysicalMaterial({
      color: '#e6a92f',
      roughness: 0.13,
      metalness: 0.94,
      clearcoat: 0.55,
      clearcoatRoughness: 0.08,
      envMapIntensity: 2.15,
    });
    const darkMarble = new THREE.MeshPhysicalMaterial({
      color: '#092544',
      roughness: 0.2,
      metalness: 0.16,
      clearcoat: 0.92,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    });
    const ivory = new THREE.MeshPhysicalMaterial({ color: '#fff4d2', roughness: 0.24, metalness: 0.08, envMapIntensity: 1.1 });
    const gemMaterials = JEWEL_COLORS.map((color) => new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.8,
      emissive: color,
      emissiveIntensity: 0.16,
    }));

    const crown = createCrown(gold, gemMaterials);
    crown.position.set(0, 2.18, -1.48);
    crown.scale.setScalar(0.92);
    crown.rotation.x = -0.08;
    scene.add(crown);

    const rearDisc = new THREE.Mesh(new THREE.CircleGeometry(2.65, 72), darkMarble);
    rearDisc.position.set(0, 1.72, -1.68);
    rearDisc.receiveShadow = true;
    scene.add(rearDisc);
    const rearRim = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.045, 10, 96), gold);
    rearRim.position.set(0, 1.72, -1.62);
    rearRim.castShadow = true;
    scene.add(rearRim);

    const basin = new THREE.Mesh(new THREE.SphereGeometry(2.5, 72, 30, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), darkMarble);
    basin.scale.set(1.12, 0.36, 0.72);
    basin.position.set(0, 0.64, 0.05);
    basin.castShadow = true;
    basin.receiveShadow = true;
    scene.add(basin);
    const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.095, 16, 96), gold);
    bowlRim.rotation.x = Math.PI / 2;
    bowlRim.scale.set(1.12, 0.72, 1);
    bowlRim.position.set(0, 0.72, 0.05);
    bowlRim.castShadow = true;
    scene.add(bowlRim);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.7, 0.28, 72), darkMarble);
    pedestal.position.set(0, -0.12, 0.18);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
    const pedestalBand = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.055, 10, 72), gold);
    pedestalBand.rotation.x = Math.PI / 2;
    pedestalBand.position.set(0, 0.02, 0.18);
    scene.add(pedestalBand);

    const dieHomes = [
      new THREE.Vector3(-1.05, 0.78, 0.1),
      new THREE.Vector3(0, 0.78, -0.32),
      new THREE.Vector3(1.05, 0.78, 0.1),
      new THREE.Vector3(-0.52, 0.78, 0.7),
      new THREE.Vector3(0.52, 0.78, 0.7),
    ];
    const diceRuntime = dieHomes.map((home, index) => {
      const die = createDie(index, ivory);
      die.group.position.copy(home);
      scene.add(die.group);
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.025, 8, 40),
        new THREE.MeshBasicMaterial({ color: '#63f5dc', transparent: true, opacity: 0 }),
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.copy(home).add(new THREE.Vector3(0, -0.3, 0));
      scene.add(halo);
      return { ...die, home, halo };
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointer = (event: PointerEvent) => {
      if (inspectRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(diceRuntime.map((die) => die.group), true)[0]?.object;
      let target: THREE.Object3D | null = hit ?? null;
      while (target && typeof target.userData.dieIndex !== 'number') target = target.parent;
      if (target && typeof target.userData.dieIndex === 'number') selectRef.current(target.userData.dieIndex);
    };
    renderer.domElement.addEventListener('pointerup', handlePointer);

    let frameId = 0;
    const clock = new THREE.Clock();
    const renderFrame = () => {
      const now = performance.now();
      const elapsed = clock.getElapsedTime();
      const rollingElapsed = now - rollStartedAtRef.current;
      diceRuntime.forEach((die, index) => {
        const value = Math.max(1, Math.min(6, Math.floor(diceRef.current[index] ?? 1)));
        const selected = selectedRef.current === index;
        const held = heldRef.current.includes(index);
        const rolling = rollingIndicesRef.current.has(index) && rollingElapsed < 720;
        if (rolling) {
          const progress = Math.max(0, Math.min(1, rollingElapsed / 720));
          die.group.rotation.set(
            progress * Math.PI * (3.2 + index * 0.36),
            progress * Math.PI * (2.6 + index * 0.42),
            progress * Math.PI * (2.1 + index * 0.28),
          );
          die.group.position.y = die.home.y + Math.sin(progress * Math.PI) * (0.68 + index * 0.035);
        } else {
          const targetRotation = DIE_FACE_ROTATIONS[value];
          die.group.rotation.set(targetRotation.x, targetRotation.y, targetRotation.z);
          die.group.position.y += ((die.home.y + (selected ? 0.16 : 0)) - die.group.position.y) * 0.18;
        }
        die.group.position.x = die.home.x;
        die.group.position.z = die.home.z;
        die.bodyMaterial.emissiveIntensity = held ? 0.3 : selected ? 0.18 : 0.07;
        const haloMaterial = die.halo.material as THREE.MeshBasicMaterial;
        haloMaterial.opacity += ((held ? 0.88 : selected ? 0.38 : 0) - haloMaterial.opacity) * 0.16;
        die.halo.scale.setScalar(1 + Math.sin(elapsed * 3.4 + index) * (held ? 0.035 : 0));
      });
      crown.rotation.y = Math.sin(elapsed * 0.35) * 0.018;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderFrame);
    };

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();
    renderFrame();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerup', handlePointer);
      environment.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="crown-dice-three" />;
}
