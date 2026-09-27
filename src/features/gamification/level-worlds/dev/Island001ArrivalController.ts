import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Island 001 opening: the real game controller shell flies in — buttons off,
 * its roll window showing the treetop inside — then suits up in white armour
 * plates and flashes into the expedition ship's white expansion phase.
 * Presentation only; never touches gameplay state.
 */
const SHELL_URL = new URL('../components/living-controller/controller-shell.glb', import.meta.url).href;
/** Controller → white-phase transformation window (seconds of the arrival). */
export const ARRIVAL_CONTROLLER_SUIT_START = 13.4;
export const ARRIVAL_CONTROLLER_SUIT_END = 14.4;
/** Share of the suit-up at which the white flash hands over to the ship. */
export const ARRIVAL_CONTROLLER_HANDOFF = 0.7;

const smooth = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * (3 - 2 * x); };

function drawTreetopWindow(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 196;
  const c = canvas.getContext('2d')!;
  const r = 60;
  c.beginPath();
  c.moveTo(r, 0); c.lineTo(512 - r, 0); c.quadraticCurveTo(512, 0, 512, r); c.lineTo(512, 196 - r);
  c.quadraticCurveTo(512, 196, 512 - r, 196); c.lineTo(r, 196); c.quadraticCurveTo(0, 196, 0, 196 - r);
  c.lineTo(0, r); c.quadraticCurveTo(0, 0, r, 0); c.closePath(); c.clip();
  const sky = c.createLinearGradient(0, 0, 0, 196);
  sky.addColorStop(0, '#0b2a4a'); sky.addColorStop(0.55, '#1f6f8b'); sky.addColorStop(1, '#f6c77a');
  c.fillStyle = sky; c.fillRect(0, 0, 512, 196);
  // Treetop: layered canopy rising from the bottom of the window.
  const blobs: [number, number, number, string][] = [
    [256, 250, 150, '#0d4a2c'], [170, 236, 92, '#12643a'], [345, 232, 96, '#12643a'],
    [256, 190, 88, '#1c8a4a'], [205, 176, 60, '#27a85a'], [312, 172, 64, '#27a85a'], [258, 132, 52, '#3fcf73'],
  ];
  for (const [x, y, radius, color] of blobs) {
    const g = c.createRadialGradient(x - radius * 0.3, y - radius * 0.4, radius * 0.1, x, y, radius);
    g.addColorStop(0, '#8ef0a8'); g.addColorStop(0.35, color); g.addColorStop(1, '#06301b');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
  }
  // Fireflies / life sparks above the canopy.
  for (let i = 0; i < 14; i += 1) {
    const x = 60 + ((i * 97) % 390), y = 20 + ((i * 53) % 90), s = 2 + (i % 3);
    const g = c.createRadialGradient(x, y, 0, x, y, s * 4);
    g.addColorStop(0, 'rgba(255,245,190,0.95)'); g.addColorStop(1, 'rgba(255,245,190,0)');
    c.fillStyle = g; c.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
  }
  // Glass reflection streak.
  const glass = c.createLinearGradient(0, 0, 512, 196);
  glass.addColorStop(0.18, 'rgba(255,255,255,0)'); glass.addColorStop(0.28, 'rgba(255,255,255,0.22)'); glass.addColorStop(0.36, 'rgba(255,255,255,0)');
  c.fillStyle = glass; c.fillRect(0, 0, 512, 196);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createIsland001ArrivalController() {
  const root = new THREE.Group();
  root.name = 'ISLAND_001_ARRIVAL_CONTROLLER';
  // Face up, top edge toward the ship's nose (+z), matching the ship's frame.
  const faceUp = new THREE.Group();
  faceUp.rotation.set(-Math.PI / 2, 0, 0);
  const heading = new THREE.Group();
  heading.rotation.y = Math.PI;
  heading.scale.setScalar(0.9);
  heading.add(faceUp);
  root.add(heading);

  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: '#eef5fb', roughness: 0.28, metalness: 0.06, clearcoat: 1, clearcoatRoughness: 0.18,
    emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0,
  });
  const windowTexture = typeof document === 'undefined' ? null : drawTreetopWindow();
  const windowMaterial = new THREE.MeshBasicMaterial({ map: windowTexture, transparent: true, toneMapped: false });
  const plateMaterial = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, clearcoat: 1, emissive: new THREE.Color('#dff6ff'), emissiveIntensity: 0.4, transparent: true, opacity: 0 });
  const flashTexture = typeof document === 'undefined' ? null : (() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d')!;
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(235,250,255,0.85)');
    g.addColorStop(0.6, 'rgba(190,235,255,0.25)'); g.addColorStop(1, 'rgba(190,235,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  })();
  // Soft white bloom, not a hard sphere.
  const flashMaterial = new THREE.SpriteMaterial({ map: flashTexture, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const flash = new THREE.Sprite(flashMaterial);
  flash.name = 'ARRIVAL_CONTROLLER_WHITE_FLASH';
  root.add(flash);

  // White armour plates that snap onto the controller during the suit-up.
  const plateGeometry = new THREE.BoxGeometry(1.1, 0.12, 0.7);
  const plates = Array.from({ length: 12 }, (_, i) => {
    const mesh = new THREE.Mesh(plateGeometry, plateMaterial);
    const angle = (i / 12) * Math.PI * 2;
    mesh.userData.from = new THREE.Vector3(Math.cos(angle) * 5.2, (i % 3 - 1) * 1.6, Math.sin(angle) * 5.2);
    mesh.userData.to = new THREE.Vector3(Math.cos(angle) * 1.9, 0.35 + (i % 2) * 0.18, Math.sin(angle) * 1.1);
    mesh.userData.spin = angle;
    mesh.visible = false;
    root.add(mesh);
    return mesh;
  });

  let loaded = false;
  let disposed = false;
  let shell: THREE.Object3D | null = null;
  void new GLTFLoader().loadAsync(SHELL_URL).then((gltf) => {
    if (disposed) return;
    shell = gltf.scene;
    shell.scale.z = 1.25;
    shell.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      old.forEach((m) => m.dispose());
      mesh.material = shellMaterial;
    });
    shell.updateMatrixWorld(true);
    // Seat the roll window on the curved face at its real position.
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 0.9, 20), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(shell, true)[0];
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.98, 0.76), windowMaterial);
    windowMesh.name = 'ARRIVAL_CONTROLLER_TREETOP_WINDOW';
    windowMesh.position.set(0, 0.9, (hit?.point.z ?? 0.5) + 0.03);
    faceUp.add(shell, windowMesh);
    loaded = true;
  }).catch(() => { loaded = false; });

  /**
   * @returns whether the controller currently stands in for the ship.
   * `suit` is 0 before the transformation and 1 after it.
   */
  function update(t: number, reduced: boolean): boolean {
    if (!loaded) { root.visible = false; return false; }
    const suit = smooth((t - ARRIVAL_CONTROLLER_SUIT_START) / (ARRIVAL_CONTROLLER_SUIT_END - ARRIVAL_CONTROLLER_SUIT_START));
    const handedOff = reduced ? t >= ARRIVAL_CONTROLLER_SUIT_START : suit >= ARRIVAL_CONTROLLER_HANDOFF;
    root.visible = t < ARRIVAL_CONTROLLER_SUIT_END;
    heading.visible = !handedOff;
    // Suit-up: plates fly in and lock on, the shell glows white, then a flash.
    const lock = smooth(suit / ARRIVAL_CONTROLLER_HANDOFF);
    plateMaterial.opacity = reduced ? 0 : Math.min(1, suit * 4) * (1 - smooth((suit - ARRIVAL_CONTROLLER_HANDOFF) / 0.2));
    plates.forEach((plate) => {
      plate.visible = !reduced && suit > 0 && suit < 0.95;
      plate.position.copy(plate.userData.from).lerp(plate.userData.to, lock);
      plate.rotation.set(0, plate.userData.spin + (1 - lock) * 3, (1 - lock) * 1.4);
    });
    shellMaterial.emissiveIntensity = suit * 1.6;
    heading.scale.setScalar(0.9 * (1 + Math.sin(Math.min(1, suit / ARRIVAL_CONTROLLER_HANDOFF) * Math.PI) * 0.1));
    const flashAmount = reduced ? 0 : Math.max(0, 1 - Math.abs(suit - ARRIVAL_CONTROLLER_HANDOFF) / 0.22);
    flashMaterial.opacity = flashAmount * 0.95;
    flash.scale.setScalar(3 + flashAmount * 9);
    flash.visible = flashAmount > 0.001;
    return !handedOff;
  }

  function dispose() {
    disposed = true;
    shell?.traverse((object) => { const mesh = object as THREE.Mesh; if (mesh.isMesh) mesh.geometry.dispose(); });
    faceUp.traverse((object) => { const mesh = object as THREE.Mesh; if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose(); });
    plateGeometry.dispose(); flashTexture?.dispose();
    [shellMaterial, windowMaterial, plateMaterial, flashMaterial].forEach((m) => m.dispose());
    windowTexture?.dispose();
  }

  return { root, update, dispose, isLoaded: () => loaded };
}
