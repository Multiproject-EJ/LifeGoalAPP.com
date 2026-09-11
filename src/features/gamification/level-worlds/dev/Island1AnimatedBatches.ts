import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PARTS_PER_BATCH = 24;
const FAMILIES = [
  'ISLAND_1_LIVING_AMBIENCE',
  'ISLAND_RUN_CANONICAL_TILE_REWARD_OBJECTS',
  'ISLAND_1_ASSEMBLY_CRATER_RUNTIME_ROOT',
  'ISLAND_001_V2_CONTINUOUS_LIMESTONE',
  'ISLAND_5_CARETAKER_BOARD_LOD',
  'ISLAND_001_V2_HATCHERY_ROOT',
  'ISLAND_001_V2_HABIT_ROOT',
  'ISLAND_001_V2_WISDOM_ROOT',
  'ISLAND_001_V2_EVENT_ROOT',
  'ISLAND_001_CARVED_CAVERN_AND_LIMESTONE_RIBS',
  'ISLAND_001_LANDMARK_ASSEMBLY_ACCESS',
];

// Geometry remains rigid in these families. Keep the authored objects as motion
// controllers and submit their surfaces together, without a multi-draw extension.
export function createIsland1AnimatedBatches(scene: THREE.Scene) {
  return createIslandRigidSurfaceBatches(scene, FAMILIES, 'ISLAND_001_ANIMATED_SURFACE_BATCHES');
}

/** Shared rigid-surface renderer; callers explicitly own their selected families. */
export function createIslandRigidSurfaceBatches(scene: THREE.Scene, families: readonly string[], rootName: string) {
  const root = new THREE.Group();
  root.name = rootName;
  const groups = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[]>();
  const selected = new Set<THREE.Object3D>();
  for (const name of families) scene.getObjectByName(name)?.traverse((object) => {
    for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) {
      if (parent.name === 'ISLAND_1_ASSEMBLY_TWENTY_STAGE_EXCAVATION_VOLUME') return;
    }
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh
      || object instanceof THREE.SkinnedMesh || selected.has(object)
      || !(object.material instanceof THREE.MeshStandardMaterial)
      || object.material.transparent || object.geometry.morphAttributes.position
      || !object.geometry.attributes.position || object.geometry.drawRange.count !== Infinity) return;
    const attributes = Object.keys(object.geometry.attributes).sort();
    const key = [object.material.uuid, object.castShadow, object.receiveShadow, object.renderOrder,
      ...attributes.map((name) => `${name}:${object.geometry.attributes[name].itemSize}`)].join('/');
    const group = groups.get(key) ?? [];
    group.push(object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>);
    groups.set(key, group);
    selected.add(object);
  });
  const batches: {
    sources: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
    originals: THREE.BufferGeometry[];
    raycasts: THREE.Mesh['raycast'][];
    matrices: THREE.Matrix4[];
    visibility: boolean[];
    offsets: number[];
    counts: number[];
    planes: Float32Array;
    localEyes: THREE.Vector3[];
    shadowIndex: THREE.BufferAttribute;
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  }[] = [];
  for (const group of groups.values()) for (let start = 0; start < group.length; start += PARTS_PER_BATCH) {
    const sources = group.slice(start, start + PARTS_PER_BATCH);
    if (sources.length < 2 && sources[0].geometry.attributes.position.count < 384) continue;
    const matrices = Array.from({ length: PARTS_PER_BATCH }, () => new THREE.Matrix4());
    const offsets: number[] = [], counts: number[] = [];
    let vertexCount = 0;
    const pieces = sources.map((source, index) => {
      const geometry = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone();
      const count = geometry.attributes.position.count;
      geometry.setAttribute('islandBatchIndex', new THREE.Float32BufferAttribute(new Float32Array(count).fill(index), 1));
      offsets.push(vertexCount); counts.push(count); vertexCount += count;
      return geometry;
    });
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((piece) => piece.dispose());
    if (!geometry) continue;
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(vertexCount), 1).setUsage(THREE.DynamicDrawUsage));
    const shadowIndex = new THREE.BufferAttribute(new Uint32Array(vertexCount), 1).setUsage(THREE.DynamicDrawUsage);
    const planes = new Float32Array(vertexCount / 3 * 4);
    const positions = geometry.attributes.position;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
    for (let vertex = 0; vertex < vertexCount; vertex += 3) {
      a.fromBufferAttribute(positions, vertex); b.fromBufferAttribute(positions, vertex + 1); c.fromBufferAttribute(positions, vertex + 2);
      normal.crossVectors(b.sub(a), c.sub(a)).normalize();
      planes.set([normal.x, normal.y, normal.z, normal.dot(a)], vertex / 3 * 4);
    }
    const patch = (material: THREE.Material) => {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.islandPartMatrices = { value: matrices };
        shader.vertexShader = `attribute float islandBatchIndex;\nuniform mat4 islandPartMatrices[${PARTS_PER_BATCH}];\n${shader.vertexShader}`
          .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nmat3 islandNormalMatrix = mat3(islandPartMatrices[int(islandBatchIndex)]); if (abs(determinant(islandNormalMatrix)) > 0.00000001) objectNormal = transpose(inverse(islandNormalMatrix)) * objectNormal;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = (islandPartMatrices[int(islandBatchIndex)] * vec4(transformed, 1.0)).xyz;');
      };
      material.customProgramCacheKey = () => 'island001-rigid-surfaces-v1';
    };
    const material = sources[0].material.clone();
    patch(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${rootName}_${batches.length}`;
    mesh.frustumCulled = false;
    mesh.castShadow = sources[0].castShadow;
    mesh.receiveShadow = sources[0].receiveShadow;
    mesh.renderOrder = sources[0].renderOrder;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: material.side });
    patch(mesh.customDepthMaterial);
    mesh.customDistanceMaterial = new THREE.MeshDistanceMaterial({ side: material.side });
    patch(mesh.customDistanceMaterial);
    const originals = sources.map((source) => source.geometry);
    // Empty controllers retain all ancestor visibility and transform semantics.
    const raycasts = sources.map(source => source.raycast);
    sources.forEach((source, i) => {
      const original = originals[i];
      original.computeBoundingBox(); original.computeBoundingSphere();
      source.geometry = new THREE.BufferGeometry();
      source.geometry.boundingBox = original.boundingBox!.clone();
      source.geometry.boundingSphere = original.boundingSphere!.clone();
      source.raycast = function (raycaster, intersections) {
        const empty = this.geometry;
        this.geometry = originals[i];
        try { raycasts[i].call(this, raycaster, intersections); } finally { this.geometry = empty; }
      };
    });
    mesh.userData.sourceNames = sources.map(source => source.name);
    root.add(mesh);
    const colorIndex = geometry.index!;
    let colorCount = 0;
    mesh.onBeforeShadow = () => {
      colorCount = geometry.drawRange.count;
      geometry.setIndex(shadowIndex);
      geometry.setDrawRange(0, Number(mesh.userData.shadowCount));
    };
    mesh.onAfterShadow = () => { geometry.setIndex(colorIndex); geometry.setDrawRange(0, colorCount); };
    batches.push({ sources, originals, raycasts, matrices, visibility: [], offsets, counts, mesh, planes, shadowIndex,
      localEyes: sources.map(() => new THREE.Vector3(Infinity, Infinity, Infinity)) });
  }
  scene.add(root);
  const inverseRoot = new THREE.Matrix4();
  const eye = new THREE.Vector3(), localEye = new THREE.Vector3(), inverseSource = new THREE.Matrix4();
  const sync = (camera?: THREE.Camera) => {
    scene.updateMatrixWorld(true);
    inverseRoot.copy(root.matrixWorld).invert();
    camera?.getWorldPosition(eye);
    for (const batch of batches) {
      let visibilityChanged = batch.visibility.length === 0;
      let changed = visibilityChanged;
      batch.sources.forEach((source, i) => {
        let visible = true;
        for (let node: THREE.Object3D | null = source; node; node = node.parent) if (!node.visible) { visible = false; break; }
        visibilityChanged ||= batch.visibility[i] !== visible;
        changed ||= visibilityChanged;
        batch.visibility[i] = visible;
        batch.matrices[i].multiplyMatrices(inverseRoot, source.matrixWorld);
        if (camera && source.material.side !== THREE.DoubleSide) {
          localEye.copy(eye).applyMatrix4(inverseSource.copy(source.matrixWorld).invert());
          changed ||= localEye.distanceToSquared(batch.localEyes[i]) > 1e-16;
          batch.localEyes[i].copy(localEye);
        }
      });
      if (changed) {
        const index = batch.mesh.geometry.index!;
        const colorIndices = index.array as Uint32Array;
        const shadowIndices = batch.shadowIndex.array as Uint32Array;
        let count = 0, shadowCount = 0;
        batch.sources.forEach((_, i) => {
          if (!batch.visibility[i]) return;
          const source = batch.sources[i], e = batch.localEyes[i];
          for (let vertex = batch.offsets[i]; vertex < batch.offsets[i] + batch.counts[i]; vertex += 3) {
            if (visibilityChanged) {
              shadowIndices[shadowCount++] = vertex;
              shadowIndices[shadowCount++] = vertex + 1;
              shadowIndices[shadowCount++] = vertex + 2;
            }
            // The rasterizer would discard these faces too. Submit only the
            // camera-facing triangles; shadow passes retain the complete shell.
            const p = vertex / 3 * 4;
            const facing = batch.planes[p] * e.x + batch.planes[p + 1] * e.y + batch.planes[p + 2] * e.z - batch.planes[p + 3];
            if (camera && source.material.side !== THREE.DoubleSide
              && (source.material.side === THREE.BackSide ? facing > 1e-7 : facing < -1e-7)) continue;
            colorIndices[count++] = vertex;
            colorIndices[count++] = vertex + 1;
            colorIndices[count++] = vertex + 2;
          }
        });
        index.needsUpdate = true;
        batch.mesh.geometry.setDrawRange(0, count);
        if (visibilityChanged) {
          batch.mesh.userData.shadowCount = shadowCount;
          batch.shadowIndex.needsUpdate = true;
          batch.mesh.visible = shadowCount > 0;
        }
      }
      const original = batch.sources[0].material, material = batch.mesh.material;
      material.color.copy(original.color);
      material.emissive.copy(original.emissive);
      material.emissiveIntensity = original.emissiveIntensity;
      material.roughness = original.roughness;
      material.metalness = original.metalness;
      material.opacity = original.opacity;
    }
  };
  sync();
  return { root, sync, sourceCount: batches.reduce((sum, batch) => sum + batch.sources.length, 0), dispose() {
    for (const batch of batches) {
      batch.sources.forEach((source, i) => { source.geometry.dispose(); source.geometry = batch.originals[i]; source.raycast = batch.raycasts[i]; });
      // Register ownership only after rendering ends. An index buffer must
      // never be uploaded as an ARRAY_BUFFER during normal geometry updates.
      batch.mesh.geometry.setAttribute('islandShadowIndex', batch.shadowIndex);
      batch.mesh.geometry.dispose(); batch.mesh.material.dispose();
      batch.mesh.customDepthMaterial?.dispose(); batch.mesh.customDistanceMaterial?.dispose();
    }
    root.removeFromParent();
  } };
}
