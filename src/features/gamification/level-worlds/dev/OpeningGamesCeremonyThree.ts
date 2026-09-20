import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sampleOpeningCeremony, type OpeningCeremonyPresentation } from '../services/islandRunOpeningCeremonyPresentation';

/** Small, bounded presentation layer on the existing palace. No renderer,
 * camera, gameplay authority or persisted progress lives in this module. */
export function createOpeningGamesCeremonyThree() {
  const root = new THREE.Group();
  root.name = 'OPENING_GAMES_CEREMONY';
  root.visible = false;
  const gold = new THREE.MeshStandardMaterial({ color: 0xeab957, metalness: .65, roughness: .3 });
  const flameMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false,
    transparent: true, depthWrite: false });
  const particleMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false,
    transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
  const pedestalParts = [
    new THREE.CylinderGeometry(.13, .15, .045, 12).translate(0, .023, 0),
    new THREE.CylinderGeometry(.04, .06, .18, 8).translate(0, .13, 0),
    new THREE.CylinderGeometry(.16, .065, .09, 12).translate(0, .255, 0),
  ];
  const pedestalGeometry = mergeGeometries(pedestalParts, false)!;
  pedestalParts.forEach(geometry => geometry.dispose());
  const pedestal = new THREE.Mesh(pedestalGeometry, gold);
  pedestal.name = 'OPENING_BEACON_BRAZIER';
  const beacon = new THREE.Group();
  beacon.name = 'OPENING_BEACON';
  beacon.add(pedestal);
  const flameGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(.07, .01), new THREE.Vector2(.15, .07),
    new THREE.Vector2(.12, .15), new THREE.Vector2(.06, .24), new THREE.Vector2(0, .34),
  ], 8);
  const flameColors = new Float32Array(flameGeometry.attributes.position.count * 3);
  const flameBase = new THREE.Color(0xfff6b0), flameTip = new THREE.Color(0xff671b);
  for (let i = 0; i < flameGeometry.attributes.position.count; i++) {
    flameBase.clone().lerp(flameTip, flameGeometry.attributes.position.getY(i) / .34).toArray(flameColors, i * 3);
  }
  flameGeometry.setAttribute('color', new THREE.BufferAttribute(flameColors, 3));
  const flame = new THREE.Mesh(flameGeometry, flameMaterial);
  flame.name = 'OPENING_BEACON_FLAME';
  flame.position.y = .29;
  flame.scale.set(.75, 1.8, .75);
  beacon.add(flame);
  root.add(beacon);

  const particleCount = 96;
  // Two triangles per spark make a visible tapered trail, not subpixel dots.
  const positions = new Float32Array(particleCount * 6 * 3);
  const colors = new Float32Array(particleCount * 6 * 3);
  const palette = [new THREE.Color(0xffbc36), new THREE.Color(0x20e6c7), new THREE.Color(0xff4698)];
  for (let i = 0; i < particleCount; i++) {
    for (let vertex = 0; vertex < 6; vertex++) palette[i % palette.length].toArray(colors, (i * 6 + vertex) * 3);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const fireworks = new THREE.Mesh(particleGeometry, particleMaterial);
  fireworks.name = 'OPENING_OFFSHORE_FIREWORKS';
  fireworks.frustumCulled = false;
  root.add(fireworks);
  const windows = new Map<THREE.MeshStandardMaterial, number>();

  const bindPalace = (palace: THREE.Object3D | undefined, arenaPosition?: readonly [number, number, number]) => {
    windows.clear();
    // A completed palace is not a mission prerequisite. At L0, host the
    // beacon on the already-funded arena's playing field, not an empty plot.
    if (palace) beacon.position.set(.45, 1.88, 1.48);
    else if (arenaPosition) beacon.position.set(arenaPosition[0], arenaPosition[1] + .704, arenaPosition[2]);
    else beacon.position.set(0, .24, 0);
    palace?.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material instanceof THREE.MeshStandardMaterial && material.userData.openingCeremonyWindow) {
          windows.set(material, material.emissiveIntensity);
        }
      }
    });
  };
  const reset = () => {
    root.visible = false;
    for (const [material, intensity] of windows) material.emissiveIntensity = intensity;
  };
  const update = (presentation: OpeningCeremonyPresentation | null) => {
    if (!presentation?.active) { reset(); return; }
    const sample = sampleOpeningCeremony(presentation.elapsedMs, presentation.reducedMotion);
    if (sample.done) { reset(); return; }
    root.visible = true;
    const seconds = Math.max(0, Number.isFinite(presentation.elapsedMs) ? presentation.elapsedMs / 1000 : 0);
    flame.visible = sample.beacon > 0;
    flameMaterial.opacity = sample.beacon;
    flame.scale.y = 1.8 * (presentation.reducedMotion ? 1 : 1 + Math.sin(seconds * 3) * .06);
    for (const [material, intensity] of windows) material.emissiveIntensity = intensity + sample.windowWarmth * .5;
    fireworks.visible = sample.fireworks;
    if (sample.fireworks) {
      // Two slow, deterministic bursts beyond the coast, never over the board.
      const age = seconds - 4.8;
      for (let i = 0; i < particleCount; i++) {
        const burst = i < particleCount / 2 ? 0 : 1;
        const t = Math.max(0, Math.min(1, (age - burst * 1.1) / 3.2));
        const angle = (i % 48) * Math.PI * 2 / 48;
        const spread = Math.sin(t * Math.PI / 2) * (1.5 + (i % 3) * .15);
        // Keep both offshore bursts inside the locked portrait overview.
        // Far-side x=±8 clipped the entire show on a 390px phone viewport.
        const x = (burst ? 3.6 : -3.6) + Math.cos(angle) * spread;
        const y = 5 + Math.sin(angle) * spread - t * t * .8;
        const z = -8 + Math.sin(i * 2.4) * spread * .35;
        const length = Math.min(spread, .45 + (i % 3) * .12);
        const width = Math.min(.10, spread * .15);
        const tailX = x - Math.cos(angle) * length, tailY = y - Math.sin(angle) * length;
        const sideX = -Math.sin(angle) * width, sideY = Math.cos(angle) * width;
        // A narrow tail and broad luminous head, with continuous volume in
        // the projected plane. No new draw call, light or shadow pass.
        positions.set([
          tailX - sideX * .2, tailY - sideY * .2, z, x - sideX, y - sideY, z, x + sideX, y + sideY, z,
          tailX - sideX * .2, tailY - sideY * .2, z, x + sideX, y + sideY, z, tailX + sideX * .2, tailY + sideY * .2, z,
        ], i * 18);
      }
      particleGeometry.attributes.position.needsUpdate = true;
      particleMaterial.opacity = Math.min(1, Math.max(0, (4.7 - age) / 1.1));
    }
  };
  return { root, bindPalace, update, reset,
    dispose() { reset(); pedestalGeometry.dispose(); flame.geometry.dispose(); particleGeometry.dispose();
      gold.dispose(); flameMaterial.dispose(); particleMaterial.dispose(); root.removeFromParent(); windows.clear(); },
  };
}
