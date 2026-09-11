import * as THREE from 'three';

type PlantMesh = THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material>;
interface SourceState {
  source: PlantMesh;
  geometry: THREE.BufferGeometry;
  empty: THREE.BufferGeometry;
  raycast: THREE.Object3D['raycast'];
  matrix: THREE.Matrix4;
  nextMatrix: THREE.Matrix4;
  version: number;
  attribute: THREE.InstancedBufferAttribute;
  uploadRange: { start: number; count: number };
  visible: boolean;
  count: number;
  capacity: number;
  layerMask: number;
  offset: number;
}
interface PlantBatch {
  mesh: PlantMesh;
  sources: SourceState[];
  ranges: Array<{ name: string; offset: number; count: number }>;
}

/** Runtime consolidation only: authored plant controllers and their buffers remain intact. */
export function createCelestialPlantRuntimeBatches(scene: THREE.Scene) {
  const root = new THREE.Group(); root.name = 'ISLAND_2_CELESTIAL_RUNTIME_PLANT_BATCHES';
  const groups: PlantMesh[][] = [];
  function equalArray(a: ArrayLike<number>, b: ArrayLike<number>) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
    return true;
  }
  function equalGeometry(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
    const keys = Object.keys(a.attributes).sort();
    if (keys.join('/') !== Object.keys(b.attributes).sort().join('/')) return false;
    if (Boolean(a.index) !== Boolean(b.index)) return false;
    if (a.index && b.index && (a.index.array.constructor !== b.index.array.constructor || !equalArray(a.index.array, b.index.array))) return false;
    if (a.drawRange.start !== b.drawRange.start || a.drawRange.count !== b.drawRange.count || a.groups.length !== b.groups.length) return false;
    if (a.groups.some((group, i) => group.start !== b.groups[i].start || group.count !== b.groups[i].count || group.materialIndex !== b.groups[i].materialIndex)) return false;
    return keys.every(key => {
      const x = a.attributes[key], y = b.attributes[key];
      return x.itemSize === y.itemSize && x.normalized === y.normalized && x.array.constructor === y.array.constructor && equalArray(x.array, y.array);
    });
  }
  scene.traverse(object => {
    if (!(object instanceof THREE.InstancedMesh) || Array.isArray(object.material) || object.instanceColor
      || object.morphTexture || !/_BOTANICAL_INSTANCES_\d+$/.test(object.name)
      || !object.geometry.attributes.position || Object.keys(object.geometry.morphAttributes).length) return;
    let inAmbience = false;
    for (let parent = object.parent; parent; parent = parent.parent) {
      if (parent.name === 'ISLAND_2_CELESTIAL_LIVING_AMBIENCE') { inAmbience = true; break; }
    }
    if (!inAmbience) return;
    const source = object as PlantMesh;
    const group = groups.find(items => {
      const first = items[0];
      return first.material === source.material && first.castShadow === source.castShadow
        && first.receiveShadow === source.receiveShadow && first.renderOrder === source.renderOrder
        && first.layers.mask === source.layers.mask && equalGeometry(first.geometry, source.geometry);
    });
    if (group) group.push(source); else groups.push([source]);
  });
  const batches: PlantBatch[] = [];
  for (const group of groups) {
    if (group.length < 2) continue;
    const first = group[0];
    const capacity = group.reduce((sum, source) => sum + source.instanceMatrix.count, 0);
    const mesh = new THREE.InstancedMesh(first.geometry.clone(), first.material, capacity);
    mesh.name = `ISLAND_2_RUNTIME_BOTANICAL_MATERIAL_${batches.length}`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow; mesh.renderOrder = first.renderOrder; mesh.layers.mask = first.layers.mask;
    mesh.frustumCulled = false;
    const ranges = group.map(source => ({ name: source.name, offset: 0, count: 0 }));
    mesh.userData.sourceNames = group.map(source => source.name); mesh.userData.sourceRanges = ranges;
    const sources = group.map(source => {
      const geometry = source.geometry, raycast = source.raycast;
      // No position attribute: Three skips submission entirely (a zero-length
      // attribute would still issue and count an empty instanced draw).
      const empty = new THREE.BufferGeometry();
      const layerMask = source.layers.mask;
      // The original remains a transform/visibility controller. The global
      // batch supplies its rendered and raycast surface, avoiding empty draws.
      source.layers.disableAll();
      source.geometry = empty;
      source.raycast = function (raycaster, intersections) {
        const previous = this.geometry, previousSphere = this.boundingSphere; this.geometry = geometry; this.boundingSphere = null;
        try { raycast.call(this, raycaster, intersections); } finally { this.geometry = previous; this.boundingSphere = previousSphere; }
      };
      return { source, geometry, empty, raycast, layerMask, matrix: new THREE.Matrix4(), nextMatrix: new THREE.Matrix4(), version: -1, attribute: source.instanceMatrix, uploadRange: { start: 0, count: 0 }, visible: false, count: -1, capacity: source.instanceMatrix.count, offset: 0 };
    });
    root.add(mesh); batches.push({ mesh, sources, ranges });
  }
  scene.add(root);
  const inverseRoot = new THREE.Matrix4(), instance = new THREE.Matrix4();
  let disposed = false;
  function sync(worldMatricesCurrent = false) {
    if (disposed) return;
    if (!worldMatricesCurrent) scene.updateMatrixWorld(true);
    inverseRoot.copy(root.matrixWorld).invert();
    for (const batch of batches) {
      let repack = false, dirty = false;
      for (const state of batch.sources) {
        let visible = true;
        for (let node: THREE.Object3D | null = state.source; node; node = node.parent) if (!node.visible) { visible = false; break; }
        const count = Math.min(state.capacity, Math.max(0, state.source.count));
        if (visible !== state.visible || count !== state.count) repack = true;
        state.visible = visible; state.count = count;
        state.nextMatrix.multiplyMatrices(inverseRoot, state.source.matrixWorld);
      }
      if (repack) batch.mesh.instanceMatrix.clearUpdateRanges();
      let offset = 0;
      for (let i = 0; i < batch.sources.length; i += 1) {
        const state = batch.sources[i];
        const changed = repack || state.version !== state.source.instanceMatrix.version || state.attribute !== state.source.instanceMatrix || !state.matrix.equals(state.nextMatrix);
        const count = state.visible ? state.count : 0;
        state.offset = offset; batch.ranges[i].offset = offset; batch.ranges[i].count = count;
        if (changed && count > 0) {
          for (let j = 0; j < count; j += 1) {
            state.source.getMatrixAt(j, instance); instance.premultiply(state.nextMatrix); batch.mesh.setMatrixAt(offset + j, instance);
          }
          state.uploadRange.start = offset * 16; state.uploadRange.count = count * 16;
          if (!batch.mesh.instanceMatrix.updateRanges.includes(state.uploadRange)) batch.mesh.instanceMatrix.updateRanges.push(state.uploadRange);
          dirty = true;
        }
        state.matrix.copy(state.nextMatrix); state.version = state.source.instanceMatrix.version; state.attribute = state.source.instanceMatrix; offset += count;
      }
      batch.mesh.count = offset; batch.mesh.visible = offset > 0;
      if (dirty) {
        batch.mesh.instanceMatrix.needsUpdate = true;
        batch.mesh.boundingSphere = null; batch.mesh.boundingBox = null;
      }
    }
  }
  sync();
  return {
    root, sync, sourceCount: batches.reduce((sum, batch) => sum + batch.sources.length, 0),
    dispose() {
      if (disposed) return; disposed = true;
      for (const batch of batches) {
        for (const state of batch.sources) { state.source.geometry = state.geometry; state.source.raycast = state.raycast; state.source.layers.mask = state.layerMask; state.empty.dispose(); }
        batch.mesh.geometry.dispose(); batch.mesh.dispose();
      }
      root.removeFromParent();
    },
  };
}
