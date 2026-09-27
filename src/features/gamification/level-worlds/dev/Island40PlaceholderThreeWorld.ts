import * as THREE from 'three';
import { ISLAND_5_LANDMARKS, type Island5LandmarkDefinition } from './island5ThreePilotContract';

/**
 * Temporary massing only, NOT the source-led Cosmic Outpost production world.
 * No missions, wallets, portal ownership or progress are written here.
 * All geometry is original; no textures or copied world assets are required.
 */
export const ISLAND_40_PLACEHOLDER_LABEL = 'Island 040 · temporary 3D setting';
const PALETTE = { hull: 0x334762, deck: 0x7186a0, trim: 0xa6bed0, light: 0x7de7df, amber: 0xf2c779 };

function material(color: number, glow = false) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.65, metalness: 0.24,
    emissive: glow ? color : 0x000000, emissiveIntensity: glow ? 0.45 : 0,
  });
}

function mesh(root: THREE.Object3D, name: string, geometry: THREE.BufferGeometry,
  surface: THREE.Material, position: readonly [number, number, number]) {
  const part = new THREE.Mesh(geometry, surface);
  part.name = name;
  part.position.set(...position);
  part.receiveShadow = true;
  root.add(part);
  return part;
}

export function createIsland40PlaceholderWorld(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = 'ISLAND_40_TEMPORARY_SPACE_PLATFORM';
  root.userData.productionStatus = 'placeholder';
  const hull = material(PALETTE.hull);
  const deck = material(PALETTE.deck);
  const light = material(PALETTE.light, true);
  // Shared tiles are mounted above this low deck; never manufacture another route.
  mesh(root, 'CENTRAL_DECK', new THREE.CylinderGeometry(6.2, 5.8, 0.52, 48), deck, [0, -0.15, 0]);
  mesh(root, 'UNDERHULL', new THREE.CylinderGeometry(5.8, 3.8, 1.5, 12), hull, [0, -1.16, 0]);
  for (const landmark of ISLAND_5_LANDMARKS.filter(item => item.id !== 'boss')) {
    const [x, , z] = landmark.position;
    mesh(root, `PLOT_${landmark.id}`, new THREE.CylinderGeometry(2.1, 1.8, 0.52, 12), deck, [x, -0.15, z]);
    const length = Math.hypot(x, z);
    const bridge = mesh(root, `BRIDGE_${landmark.id}`,
      new THREE.BoxGeometry(0.75, 0.3, Math.max(0.1, length - 5.8)), hull,
      [x * ((length + 5.8) / 2) / length, -0.26, z * ((length + 5.8) / 2) / length]);
    bridge.rotation.y = Math.atan2(x, z);
  }
  // A reserved, visibly inactive portal mock-up sits behind the route.
  // It is neither the central arena nor an interactable/unlocked gameplay object.
  const council = new THREE.Group();
  council.name = 'ISLAND_40_COUNCIL_AREA_PLACEHOLDER';
  council.position.set(0, 0, -8.9);
  root.add(council);
  mesh(council, 'COUNCIL_DECK', new THREE.CylinderGeometry(2.0, 1.7, 0.4, 24), deck, [0, -0.2, 0]);
  mesh(council, 'PORTAL_FRAME_INACTIVE', new THREE.TorusGeometry(0.8, 0.12, 8, 32), hull, [0, 1.15, -0.4]);
  mesh(council, 'PORTAL_INNER_TRIM', new THREE.TorusGeometry(0.8, 0.025, 6, 32), light, [0, 1.15, -0.39]);
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI * index / 5;
    mesh(council, `COUNCIL_SEAT_${index}`, new THREE.CylinderGeometry(0.22, 0.28, 0.25, 8),
      hull, [Math.cos(angle) * 1.4, 0.12, Math.sin(angle) * 1.15]);
  }
  const stars = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i += 1) {
    const angle = i * 2.399963;
    const radius = 28 + (i % 9) * 1.5;
    stars.set([Math.cos(angle) * radius, 5 + (i % 17), Math.sin(angle) * radius], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  const starfield = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb7cde4, size: 0.09 }));
  starfield.name = 'PLACEHOLDER_STARFIELD';
  root.add(starfield);
  scene.add(root);
  return { root, animate: (_elapsed: number) => { /* intentionally static, reduced-motion safe */ } };
}

/** Additive, compact blockout buildings. Stable names preserve construction diffs. */
export function buildIsland40PlaceholderLandmark(definition: Island5LandmarkDefinition, level: 0 | 1 | 2 | 3) {
  const root = new THREE.Group();
  root.name = `ISLAND_40_PLACEHOLDER_${definition.id.toUpperCase()}`;
  root.position.set(...definition.position);
  const hull = material(PALETTE.hull);
  const trim = material(PALETTE.trim);
  const light = material(definition.id === 'boss' ? PALETTE.amber : definition.accent, true);
  const radius = definition.id === 'boss' ? 1.8 : 0.9;
  mesh(root, 'FOUNDATION', new THREE.CylinderGeometry(radius, radius, 0.18, 16), hull, [0, 0.2, 0]);
  if (level >= 1) {
    if (definition.id === 'boss') {
      // Keep the arena's central floor free; council scenery never replaces it.
      const ring = mesh(root, 'ARENA_RIM', new THREE.TorusGeometry(1.55, 0.16, 8, 32), trim, [0, 0.45, 0]);
      ring.rotation.x = -Math.PI / 2;
    } else {
      const geometry = definition.id === 'hatchery'
        ? new THREE.SphereGeometry(0.65, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)
        : definition.id === 'wisdom'
          ? new THREE.CylinderGeometry(0.45, 0.7, 1.2, 6)
          : new THREE.BoxGeometry(1.25, definition.id === 'event' ? 0.45 : 0.8, 1.05);
      mesh(root, 'CORE', geometry, trim, [0, definition.id === 'wisdom' ? 0.9 : 0.65, 0]);
    }
  }
  if (level >= 2) {
    for (const x of [-radius * 0.65, radius * 0.65]) {
      mesh(root, `MAST_${x}`, new THREE.BoxGeometry(0.14, 1.3, 0.14), hull, [x, 0.95, -0.45]);
    }
    mesh(root, 'SIGNAL', new THREE.BoxGeometry(radius * 1.5, 0.1, 0.16), light, [0, 1.6, -0.45]);
  }
  if (level >= 3) {
    const beacon = mesh(root, 'COMMISSIONED_BEACON', new THREE.OctahedronGeometry(0.22), light, [0, 1.98, -0.45]);
    beacon.rotation.z = Math.PI / 4;
    mesh(root, 'ENTRANCE', new THREE.BoxGeometry(radius, 0.08, 0.42), light, [0, 0.34, radius * 0.7]);
  }
  root.traverse(child => { child.userData.landmarkId = definition.id; });
  root.userData.productionStatus = 'placeholder';
  return root;
}
