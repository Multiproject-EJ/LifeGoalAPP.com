import * as THREE from 'three';

/**
 * Island 008 (world source 18) colour and detail pass (user feedback
 * 2026-09-30: "too green and undetailed"). Heliconia clumps and bare-earth
 * clearings break up the uniform green (blossoming canopy clusters live in
 * the canopy field); everything stays outside the route ring and off the front
 * stream lane. Presentation only, instanced (2 draw calls).
 */
export function createIsland18BlossomPass(options: {
  quality: 'low' | 'medium' | 'high';
  sampleGroundY: (radius: number, angle: number) => number;
}): { root: THREE.Group; dispose: () => void } {
  const root = new THREE.Group();
  root.name = 'ISLAND_18_BLOSSOM_AND_CLEARING_PASS';
  root.userData.presentationOnly = true;
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };
  // The high profile sits just under its 180k authored-triangle budget, so
  // most colour comes from blossoming canopy clusters (no extra triangles);
  // this pass only adds cheap clearings and a few heliconia clumps.
  // High has no headroom left, so it relies on the blossoming canopy alone.
  const heliconiaCount = options.quality === 'high' ? 0 : 14;
  const clearingCount = options.quality === 'high' ? 0 : options.quality === 'low' ? 10 : 12;

  const heliconiaMaterial = track(new THREE.MeshStandardMaterial({ color: 0xff5a36, roughness: 0.5, emissive: 0x8a1c00, emissiveIntensity: 0.25, flatShading: true }));
  const clearingMaterial = track(new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));

  const heliconiaGeometry = track(new THREE.ConeGeometry(0.12, 0.42, 5));
  const clearingGeometry = track(new THREE.CircleGeometry(1, 14));

  // Keep clear of the route ring (r < 6.55) and the front stream lane.
  const usable = (x: number, z: number) => Math.hypot(x, z) >= 6.7 && !(Math.abs(x) < 3 && z > 5.2);
  const place = (index: number, salt: number, minRadius: number, spread: number) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const angle = (index + attempt * 0.37) * 2.399963 + salt;
      const radius = minRadius + (((index * 31 + attempt * 7 + salt * 13) % 17) / 17) * spread;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (usable(x, z)) return { x, z, radius, angle };
    }
    return null;
  };

  const dummy = new THREE.Object3D();
  const heliconias: THREE.Matrix4[] = [];
  for (let index = 0; index < heliconiaCount; index += 1) {
    const spot = place(index + 40, 1.9, 6.8, 4.6);
    if (!spot) continue;
    const ground = options.sampleGroundY(spot.radius, spot.angle) + 1.0;
    for (let stem = 0; stem < 3; stem += 1) {
      dummy.position.set(spot.x + (stem - 1) * 0.12, ground + 0.2 + stem * 0.05, spot.z + ((stem * 7) % 3 - 1) * 0.1);
      dummy.rotation.set((stem - 1) * 0.3, index, (stem - 1) * 0.25);
      dummy.scale.setScalar(0.9 + (index % 3) * 0.15);
      dummy.updateMatrix();
      heliconias.push(dummy.matrix.clone());
    }
  }

  const clearings: THREE.Matrix4[] = [];
  for (let index = 0; index < clearingCount; index += 1) {
    const spot = place(index + 90, 3.3, 7.0, 5.5);
    if (!spot) continue;
    const ground = options.sampleGroundY(spot.radius, spot.angle) + 1.005;
    dummy.position.set(spot.x, ground, spot.z);
    dummy.rotation.set(-Math.PI / 2, 0, index);
    dummy.scale.set(0.7 + (index % 3) * 0.3, 0.45 + (index % 2) * 0.25, 1);
    dummy.updateMatrix();
    clearings.push(dummy.matrix.clone());
  }

  const addBatch = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[], shadows = true) => {
    if (matrices.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    mesh.name = name;
    matrices.forEach((entry, index) => mesh.setMatrixAt(index, entry));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = shadows && options.quality !== 'low';
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  addBatch('ISLAND_18_BARE_EARTH_CLEARINGS', clearingGeometry, clearingMaterial, clearings, false);
  addBatch('ISLAND_18_HELICONIA_CLUMPS', heliconiaGeometry, heliconiaMaterial, heliconias);
  root.userData.blossomPass = { heliconias: heliconias.length, clearings: clearings.length };
  return { root, dispose: () => disposables.forEach((item) => item.dispose()) };
}
