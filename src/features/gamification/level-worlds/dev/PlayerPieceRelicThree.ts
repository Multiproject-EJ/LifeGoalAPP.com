import * as THREE from 'three';
import { resolvePlayerPiece, type PlayerPieceId } from '../services/islandRunPlayerPieces';

/**
 * Procedural 3D player pieces (original, no image assets), about one unit
 * tall. The Departure Day crew member carries one like a relic; the same
 * models can later dress the board token. Starter pieces have their own
 * shapes; the others share a faceted keepsake in their accent colour.
 */
export function createPlayerPieceRelic(pieceId: PlayerPieceId) {
  const piece = resolvePlayerPiece(pieceId);
  const accent = new THREE.Color(piece.accentColor);
  const root = new THREE.Group();
  root.name = `PLAYER_PIECE_RELIC_${piece.id}`;
  const spinner = new THREE.Group();
  root.add(spinner);
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const mat = <T extends THREE.Material>(material: T) => { materials.push(material); return material; };
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    geometries.push(geometry);
    const m = new THREE.Mesh(geometry, material);
    spinner.add(m);
    return m;
  };
  const gold = mat(new THREE.MeshStandardMaterial({ color: '#e7b95a', metalness: 0.85, roughness: 0.28 }));
  const glow = mat(new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.4, roughness: 0.3 }));

  if (piece.id === 'explorer_ship') {
    // The flagship in miniature: white controller body, two grips, glass dome with a tiny tree.
    const shell = mat(new THREE.MeshPhysicalMaterial({ color: '#f3f6fa', roughness: 0.22, clearcoat: 1 }));
    const body = mesh(new THREE.CapsuleGeometry(0.2, 0.5, 6, 16), shell);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.42;
    [-1, 1].forEach((side) => {
      const grip = mesh(new THREE.CapsuleGeometry(0.13, 0.22, 6, 12), shell);
      grip.position.set(side * 0.34, 0.28, 0.02);
      grip.rotation.z = side * 0.5;
    });
    const dome = mesh(new THREE.SphereGeometry(0.17, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(new THREE.MeshPhysicalMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.55, roughness: 0.05 })));
    dome.position.y = 0.58;
    const tree = mesh(new THREE.SphereGeometry(0.09, 12, 8), mat(new THREE.MeshStandardMaterial({ color: '#5fbf6f', emissive: '#1f5a2a', emissiveIntensity: 0.6 })));
    tree.position.y = 0.64;
    const thruster = mesh(new THREE.ConeGeometry(0.07, 0.16, 12), glow);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, 0.42, -0.24);
  } else if (piece.id === 'ancient_egg') {
    const egg = mesh(new THREE.SphereGeometry(0.28, 28, 20), mat(new THREE.MeshStandardMaterial({ color: '#efe3c2', roughness: 0.55 })));
    egg.scale.set(1, 1.32, 1);
    egg.position.y = 0.42;
    [0.3, 0.52].forEach((y, index) => {
      const band = mesh(new THREE.TorusGeometry(index === 0 ? 0.26 : 0.27, 0.018, 8, 40), gold);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
    });
    const rune = mesh(new THREE.OctahedronGeometry(0.06, 0), glow);
    rune.position.set(0, 0.44, 0.27);
  } else if (piece.id === 'world_seed') {
    const seed = mesh(new THREE.SphereGeometry(0.24, 24, 16), mat(new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.7 })));
    seed.scale.set(1, 1.2, 1);
    seed.position.y = 0.3;
    const groove = mesh(new THREE.TorusGeometry(0.24, 0.015, 6, 36), gold);
    groove.rotation.y = Math.PI / 2;
    groove.scale.set(1, 1.2, 1);
    groove.position.y = 0.3;
    const stem = mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.22, 8), mat(new THREE.MeshStandardMaterial({ color: '#4f8f45' })));
    stem.position.y = 0.6;
    const leafMaterial = mat(new THREE.MeshStandardMaterial({ color: '#7fd07a', emissive: '#2d6a2a', emissiveIntensity: 0.5, side: THREE.DoubleSide }));
    [-1, 1].forEach((side) => {
      const leaf = mesh(new THREE.SphereGeometry(0.08, 12, 8), leafMaterial);
      leaf.scale.set(1.4, 0.35, 0.8);
      leaf.position.set(side * 0.09, 0.7, 0);
      leaf.rotation.z = side * 0.5;
    });
  } else {
    const gem = mesh(new THREE.OctahedronGeometry(0.26, 1), glow);
    gem.position.y = 0.45;
    const ring = mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 40), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.45;
  }
  // A soft halo so the relic reads from across the hangar.
  const halo = new THREE.Sprite(mat(new THREE.SpriteMaterial({ color: accent, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })));
  halo.scale.setScalar(1.1);
  halo.position.y = 0.45;
  root.add(halo);

  return {
    root,
    update(timeSeconds: number, reducedMotion: boolean) {
      if (reducedMotion) return;
      spinner.rotation.y = timeSeconds * 0.9;
      spinner.position.y = Math.sin(timeSeconds * 2.2) * 0.04;
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
