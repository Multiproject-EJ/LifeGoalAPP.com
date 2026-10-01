import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';

/**
 * Island 001 excavation site dressing (user request 2026-09-30): right after
 * the first blast the crew rings the hole with a wooden fence, puts up yellow
 * warning signs, and the ground around it reads as broken dirt with a few
 * rocks and surviving grass tufts. Presentation only.
 *
 * Coordinates are the Assembly crater root's: the hole is centred at the
 * origin and `mouthAt(angle)` gives its lumpy rim radius at a world angle
 * (x = cos, z = sin).
 */
export interface Island1ExcavationSafety {
  root: THREE.Group;
  /** Re-fit the dressing to the current mouth; `visible` while the dig is open. */
  update: (options: { mouthAt: (angle: number) => number; visible: boolean; maxRadius: number; surfaceY: number }) => void;
  animate: (elapsed: number, reducedMotion: boolean) => void;
  dispose: () => void;
}

const FENCE_SETUP_SECONDS = 1.6;

function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function createWarningSignTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, 128, 128);
  ctx.translate(64, 64);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#1d1a12';
  ctx.fillRect(-44, -44, 88, 88);
  ctx.fillStyle = '#ffcc1f';
  ctx.fillRect(-39, -39, 78, 78);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1d1a12';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 64, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createIsland1ExcavationSafety(quality: Island3DQuality): Island1ExcavationSafety {
  const root = new THREE.Group();
  root.name = 'ISLAND_001_EXCAVATION_SAFETY';
  root.userData.presentationOnly = true;
  root.visible = false;
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };

  const postCount = quality === 'low' ? 22 : 30;
  const rockCount = quality === 'low' ? 10 : 16;
  const tuftCount = quality === 'low' ? 18 : 30;
  const signAngles = [0.35, 0.35 + Math.PI / 2, 0.35 + Math.PI, 0.35 + Math.PI * 1.5];

  const woodMaterial = track(new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.9 }));
  const darkWoodMaterial = track(new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.92 }));
  const rockMaterial = track(new THREE.MeshStandardMaterial({ color: 0x8b8578, roughness: 0.95, flatShading: true }));
  const grassMaterial = track(new THREE.MeshStandardMaterial({ color: 0x6f9d45, roughness: 0.9 }));
  const signTexture = createWarningSignTexture();
  if (signTexture) track(signTexture);
  const signMaterial = track(new THREE.MeshStandardMaterial({
    map: signTexture ?? undefined, color: signTexture ? 0xffffff : 0xffcc1f, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6,
  }));

  const postGeometry = track(new THREE.BoxGeometry(0.05, 0.3, 0.05));
  const railGeometry = track(new THREE.BoxGeometry(1, 0.032, 0.022));
  const rockGeometry = track(new THREE.DodecahedronGeometry(0.075, 0));
  const tuftGeometry = track(new THREE.ConeGeometry(0.035, 0.11, 5));
  const signGeometry = track(new THREE.PlaneGeometry(0.26, 0.26));
  const signPostGeometry = track(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 6));

  const posts = new THREE.InstancedMesh(postGeometry, woodMaterial, postCount);
  const rails = new THREE.InstancedMesh(railGeometry, darkWoodMaterial, postCount * 2);
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
  const tufts = new THREE.InstancedMesh(tuftGeometry, grassMaterial, tuftCount);
  [posts, rails, rocks, tufts].forEach((mesh) => { mesh.castShadow = quality !== 'low'; mesh.receiveShadow = true; root.add(mesh); });
  posts.name = 'ISLAND_001_EXCAVATION_FENCE_POSTS';
  rails.name = 'ISLAND_001_EXCAVATION_FENCE_RAILS';
  rocks.name = 'ISLAND_001_EXCAVATION_ROCKS';
  tufts.name = 'ISLAND_001_EXCAVATION_GRASS_TUFTS';

  const signs = signAngles.map((_, index) => {
    const group = new THREE.Group();
    group.name = `ISLAND_001_EXCAVATION_WARNING_SIGN_${index + 1}`;
    const pole = new THREE.Mesh(signPostGeometry, woodMaterial);
    pole.position.y = 0.18;
    const board = new THREE.Mesh(signGeometry, signMaterial);
    board.position.y = 0.4;
    group.add(pole, board);
    root.add(group);
    return group;
  });

  // Fitted layout (local XZ positions, recomputed when the mouth changes).
  const postPositions: THREE.Vector3[] = Array.from({ length: postCount }, () => new THREE.Vector3());
  const rockLayout = Array.from({ length: rockCount }, (_, i) => ({ angle: seeded(i, 1) * Math.PI * 2, t: 0.25 + seeded(i, 2) * 0.6, scale: 0.6 + seeded(i, 3) * 0.9, spin: seeded(i, 4) * Math.PI }));
  const tuftLayout = Array.from({ length: tuftCount }, (_, i) => ({ angle: seeded(i, 5) * Math.PI * 2, t: 0.62 + seeded(i, 6) * 0.36, scale: 0.7 + seeded(i, 7) * 0.8 }));
  let surfaceY = 0;
  let setupStartedAt: number | null = null;
  let wasVisible = false;
  let lastElapsed = 0;
  const dummy = new THREE.Object3D();

  const writeFence = (setup: number) => {
    for (let i = 0; i < postCount; i += 1) {
      // Posts pop up one after another as the crew goes round.
      const local = THREE.MathUtils.clamp(setup * 1.4 - (i / postCount) * 0.4, 0, 1);
      const rise = THREE.MathUtils.smoothstep(local, 0, 1);
      dummy.position.set(postPositions[i]!.x, surfaceY + 0.15 * rise - 0.15 * (1 - rise), postPositions[i]!.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, Math.max(0.001, rise), 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < postCount; i += 1) {
      const a = postPositions[i]!;
      const b = postPositions[(i + 1) % postCount]!;
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const local = THREE.MathUtils.clamp(setup * 1.4 - ((i + 1) / postCount) * 0.4 - 0.15, 0, 1);
      const shown = THREE.MathUtils.smoothstep(local, 0, 1);
      [0.1, 0.22].forEach((height, row) => {
        dummy.position.set((a.x + b.x) / 2, surfaceY + height, (a.z + b.z) / 2);
        dummy.rotation.set(0, -Math.atan2(b.z - a.z, b.x - a.x), 0);
        dummy.scale.set(Math.max(0.001, length * shown), 1, 1);
        dummy.updateMatrix();
        rails.setMatrixAt(i * 2 + row, dummy.matrix);
      });
    }
    rails.instanceMatrix.needsUpdate = true;
    signs.forEach((sign, index) => {
      const local = THREE.MathUtils.clamp(setup * 1.4 - 0.5 - index * 0.06, 0, 1);
      sign.scale.setScalar(Math.max(0.001, THREE.MathUtils.smoothstep(local, 0, 1)));
    });
  };

  const update: Island1ExcavationSafety['update'] = (options) => {
    surfaceY = options.surfaceY;
    const max = options.maxRadius;
    const fenceRadiusAt = (angle: number) => Math.min(max - 0.12, options.mouthAt(angle) + 0.32);
    for (let i = 0; i < postCount; i += 1) {
      const angle = (i / postCount) * Math.PI * 2;
      const r = fenceRadiusAt(angle);
      postPositions[i]!.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    }
    signs.forEach((sign, index) => {
      const angle = signAngles[index]!;
      const r = fenceRadiusAt(angle) + 0.1;
      sign.position.set(Math.cos(angle) * r, surfaceY, Math.sin(angle) * r);
      sign.rotation.y = -angle + Math.PI / 2;
    });
    rockLayout.forEach((rock, i) => {
      const inner = options.mouthAt(rock.angle) + 0.06;
      const outer = Math.min(max - 0.05, fenceRadiusAt(rock.angle) + 0.35);
      const r = inner + (outer - inner) * rock.t;
      dummy.position.set(Math.cos(rock.angle) * r, surfaceY + 0.02, Math.sin(rock.angle) * r);
      dummy.rotation.set(rock.spin, rock.spin * 2, 0);
      dummy.scale.set(rock.scale, rock.scale * 0.6, rock.scale);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    });
    rocks.instanceMatrix.needsUpdate = true;
    tuftLayout.forEach((tuft, i) => {
      const inner = fenceRadiusAt(tuft.angle) + 0.08;
      const r = inner + (max - 0.04 - inner) * tuft.t;
      dummy.position.set(Math.cos(tuft.angle) * r, surfaceY + 0.05 * tuft.scale, Math.sin(tuft.angle) * r);
      dummy.rotation.set(0, tuft.angle, 0);
      dummy.scale.setScalar(tuft.scale);
      dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
    });
    tufts.instanceMatrix.needsUpdate = true;
    if (options.visible && !wasVisible) setupStartedAt = null;
    wasVisible = options.visible;
    root.visible = options.visible;
    writeFence(setupStartedAt === null ? 0 : Math.min(1, (lastElapsed - setupStartedAt) / FENCE_SETUP_SECONDS));
  };

  const animate: Island1ExcavationSafety['animate'] = (elapsed, reducedMotion) => {
    lastElapsed = elapsed;
    if (!root.visible) return;
    if (setupStartedAt === null) setupStartedAt = reducedMotion ? elapsed - FENCE_SETUP_SECONDS : elapsed;
    const setup = Math.min(1, (elapsed - setupStartedAt) / FENCE_SETUP_SECONDS);
    if (setup < 1 || root.userData.fenceSettled !== true) {
      writeFence(setup);
      root.userData.fenceSettled = setup >= 1;
    }
  };

  return {
    root,
    update,
    animate,
    dispose() {
      root.parent?.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}
