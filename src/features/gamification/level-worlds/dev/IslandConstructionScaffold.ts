import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Island3DQuality } from './island5ThreePilotContract';

export type IslandConstructionScaffoldMotif = 'crystal' | 'cloud' | 'icicle' | 'rope' | 'bamboo' | 'arc' | 'coral' | 'bloom' | 'forge' | 'root';

export interface IslandConstructionScaffoldProfile {
  id: string;
  label: string;
  primary: number;
  secondary: number;
  accent: number;
  motif: IslandConstructionScaffoldMotif;
  metallic: boolean;
}

/**
 * World-source keyed rather than island-number keyed so variant islands reuse
 * the construction language of the authored world they actually render.
 */
export const ISLAND_CONSTRUCTION_SCAFFOLD_PROFILES: Readonly<Record<number, IslandConstructionScaffoldProfile>> = {
  1: { id: 'luma-crystal-brass', label: 'Moonstone crystal and brass', primary: 0xc58b2b, secondary: 0xdceff3, accent: 0x65e8ff, motif: 'crystal', metallic: true },
  2: { id: 'celestial-cloudglass', label: 'Cloudglass and sky silver', primary: 0xb9d6e8, secondary: 0xf1f8ff, accent: 0x7cc8ff, motif: 'cloud', metallic: true },
  3: { id: 'frostmoon-icewood', label: 'Icewood and frost crystal', primary: 0x9eb8c6, secondary: 0xdff5ff, accent: 0x78d9ff, motif: 'icicle', metallic: false },
  4: { id: 'driftwood-ropeworks', label: 'Patched driftwood and sail rope', primary: 0x76503a, secondary: 0xd5b77e, accent: 0x72d5d0, motif: 'rope', metallic: false },
  5: { id: 'sunshore-bamboo', label: 'Sun-warmed bamboo and turquoise lashings', primary: 0xa66c32, secondary: 0xe8c97a, accent: 0x4ed6c4, motif: 'bamboo', metallic: false },
  6: { id: 'moonveil-arcframe', label: 'Moonveil alloy and arc-light braces', primary: 0x304b72, secondary: 0x7d93b8, accent: 0x69eaff, motif: 'arc', metallic: true },
  7: { id: 'abyssal-coral-frame', label: 'Pearl alloy and living coral braces', primary: 0x3a8c91, secondary: 0xc7e6dc, accent: 0xff8e77, motif: 'coral', metallic: false },
  8: { id: 'everblossom-vineframe', label: 'Living vine, pale wood, and blossom knots', primary: 0x477c49, secondary: 0xcaa86d, accent: 0xff8fc8, motif: 'bloom', metallic: false },
  9: { id: 'heartshaft-forgeframe', label: 'Black iron and ember-gold forge staging', primary: 0x30333a, secondary: 0x8f5b2d, accent: 0xff713c, motif: 'forge', metallic: true },
  10: { id: 'rootheart-living-frame', label: 'Rootwood and saplight bindings', primary: 0x5e4630, secondary: 0x4f7d4a, accent: 0x7cf2ae, motif: 'root', metallic: false },
  18: { id: 'jungle-ruin-vineworks', label: 'Dark rootwood, moss bronze, and emerald vine lashings', primary: 0x3d321d, secondary: 0x748044, accent: 0x55e89a, motif: 'root', metallic: false },
  20: { id: 'lava-labyrinth-forgeframe', label: 'Black iron, aged brass, and ember forge staging', primary: 0x202226, secondary: 0x9a5d21, accent: 0xff4b0a, motif: 'forge', metallic: true },
};

export interface IslandConstructionScaffold {
  root: THREE.Group;
  profile: IslandConstructionScaffoldProfile;
  triangles: number;
  drawCalls: number;
  dispose: () => void;
}

function beamBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, radialSegments: number) {
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  geometry.applyMatrix4(new THREE.Matrix4().compose(midpoint, quaternion, new THREE.Vector3(1, 1, 1)));
  return geometry;
}

function transformedBox(
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  rotationY = 0,
) {
  const geometry = new THREE.BoxGeometry(...size);
  geometry.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  return geometry;
}

function mergeAndDispose(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts, false);
  parts.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error('Could not merge Island Run construction scaffold geometry');
  return merged;
}

function triangleCount(geometry: THREE.BufferGeometry) {
  return Math.round(geometry.index
    ? geometry.index.count / 3
    : (geometry.getAttribute('position')?.count ?? 0) / 3);
}

export function resolveIslandConstructionScaffoldProfile(worldSourceNumber: number) {
  return ISLAND_CONSTRUCTION_SCAFFOLD_PROFILES[worldSourceNumber]
    ?? ISLAND_CONSTRUCTION_SCAFFOLD_PROFILES[1];
}

export function createIslandConstructionScaffold(options: {
  worldSourceNumber: number;
  landmarkId: string;
  radius: number;
  height: number;
  quality: Island3DQuality;
}): IslandConstructionScaffold {
  const profile = resolveIslandConstructionScaffoldProfile(options.worldSourceNumber);
  const root = new THREE.Group();
  root.name = `ISLAND_RUN_${profile.id.toUpperCase().replace(/-/g, '_')}_${options.landmarkId.toUpperCase()}_SCAFFOLD`;
  root.userData.constructionScaffold = {
    profileId: profile.id,
    worldSourceNumber: options.worldSourceNumber,
    landmarkId: options.landmarkId,
    temporary: true,
  };

  const radialSegments = options.quality === 'high' ? 8 : 6;
  const halfX = Math.max(0.72, options.radius * (options.landmarkId === 'boss' ? 1.2 : 1.08));
  const halfZ = Math.max(0.58, options.radius * (options.landmarkId === 'event' ? 0.96 : 0.82));
  const height = Math.max(1.2, options.height * 0.96);
  const beamRadius = Math.max(0.022, options.radius * 0.015);
  const primaryParts: THREE.BufferGeometry[] = [];
  const secondaryParts: THREE.BufferGeometry[] = [];
  const accentParts: THREE.BufferGeometry[] = [];
  const corners = [
    new THREE.Vector3(-halfX, 0, -halfZ),
    new THREE.Vector3(halfX, 0, -halfZ),
    new THREE.Vector3(halfX, 0, halfZ),
    new THREE.Vector3(-halfX, 0, halfZ),
  ];
  const levelFractions = options.quality === 'high' ? [0.12, 0.36, 0.62, 0.88] : [0.14, 0.5, 0.86];

  corners.forEach((corner) => {
    primaryParts.push(beamBetween(
      corner,
      new THREE.Vector3(corner.x, height, corner.z),
      beamRadius,
      radialSegments,
    ));
  });
  levelFractions.forEach((fraction, levelIndex) => {
    const y = height * fraction;
    corners.forEach((corner, index) => {
      const next = corners[(index + 1) % corners.length];
      primaryParts.push(beamBetween(
        new THREE.Vector3(corner.x, y, corner.z),
        new THREE.Vector3(next.x, y, next.z),
        beamRadius * 0.78,
        radialSegments,
      ));
    });
    const deckThickness = beamRadius * 1.35;
    secondaryParts.push(
      transformedBox([halfX * 2.08, deckThickness, beamRadius * 4], [0, y - deckThickness * 0.7, halfZ]),
      transformedBox([halfX * 2.08, deckThickness, beamRadius * 4], [0, y - deckThickness * 0.7, -halfZ]),
    );
    if (levelIndex % 2 === 0) {
      secondaryParts.push(
        beamBetween(new THREE.Vector3(-halfX, y - height * 0.16, halfZ), new THREE.Vector3(halfX, y + height * 0.16, halfZ), beamRadius * 0.5, radialSegments),
        beamBetween(new THREE.Vector3(-halfX, y + height * 0.16, -halfZ), new THREE.Vector3(halfX, y - height * 0.16, -halfZ), beamRadius * 0.5, radialSegments),
      );
    }
  });

  const motifScale = Math.max(beamRadius * 3.2, options.radius * 0.055);
  corners.forEach((corner, index) => {
    const x = corner.x;
    const z = corner.z;
    if (['crystal', 'icicle', 'coral', 'root'].includes(profile.motif)) {
      const geometry = new THREE.ConeGeometry(motifScale, motifScale * (profile.motif === 'root' ? 3.8 : 2.6), radialSegments);
      geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(x, height + motifScale, z));
      accentParts.push(geometry);
    } else if (['cloud', 'bloom'].includes(profile.motif)) {
      const geometry = new THREE.SphereGeometry(motifScale * 1.25, radialSegments, Math.max(4, radialSegments - 2));
      geometry.scale(1.45, 0.72, 1);
      geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(x, height + motifScale * 0.7, z));
      accentParts.push(geometry);
    } else {
      accentParts.push(transformedBox(
        [motifScale * 1.2, motifScale * 1.8, motifScale * 1.2],
        [x, height + motifScale, z],
        index * Math.PI * 0.5,
      ));
    }
  });

  const primaryGeometry = mergeAndDispose(primaryParts);
  const secondaryGeometry = mergeAndDispose(secondaryParts);
  const accentGeometry = mergeAndDispose(accentParts);
  const primaryMaterial = new THREE.MeshStandardMaterial({
    color: profile.primary,
    roughness: profile.metallic ? 0.28 : 0.66,
    metalness: profile.metallic ? 0.72 : 0.04,
    transparent: true,
    opacity: 0.88,
  });
  const secondaryMaterial = new THREE.MeshStandardMaterial({
    color: profile.secondary,
    roughness: profile.metallic ? 0.34 : 0.72,
    metalness: profile.metallic ? 0.46 : 0.02,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: profile.accent,
    emissive: profile.accent,
    emissiveIntensity: profile.motif === 'forge' || profile.motif === 'arc' ? 1.15 : 0.42,
    roughness: 0.28,
    metalness: profile.metallic ? 0.32 : 0.02,
    toneMapped: false,
  });
  const meshes = [
    new THREE.Mesh(primaryGeometry, primaryMaterial),
    new THREE.Mesh(secondaryGeometry, secondaryMaterial),
    new THREE.Mesh(accentGeometry, accentMaterial),
  ];
  meshes.forEach((mesh, index) => {
    mesh.name = `${root.name}_${['PRIMARY_FRAME', 'BRACES_AND_DECKS', 'THEME_MARKERS'][index]}`;
    mesh.castShadow = index < 2;
    mesh.receiveShadow = index < 2;
    mesh.userData.constructionPart = { kind: 'temporary-scaffold', profileId: profile.id };
    root.add(mesh);
  });
  if (options.landmarkId === 'event') root.rotation.y = Math.PI * 0.25;
  root.userData.authoredRotationY = root.rotation.y;
  root.userData.sculptRuntime = {
    presentationOnly: true,
    profileId: profile.id,
    nodes: Object.fromEntries(meshes.map((mesh) => [mesh.name, mesh])),
  };

  return {
    root,
    profile,
    triangles: triangleCount(primaryGeometry) + triangleCount(secondaryGeometry) + triangleCount(accentGeometry),
    drawCalls: meshes.length,
    dispose() {
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
    },
  };
}
