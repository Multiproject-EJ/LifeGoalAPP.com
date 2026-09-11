import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch one rigid frame at a time; excluded roots retain their motion ownership. */
export function batchCelestialStatic(root: THREE.Group, exclusions: readonly THREE.Object3D[] = []) {
  const excluded = new Set(exclusions);
  const batches = new Map<string, { material: THREE.Material; sources: THREE.Mesh[]; pieces: THREE.BufferGeometry[]; cast: boolean; receive: boolean; order: number }>();
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object instanceof THREE.SkinnedMesh
      || Array.isArray(object.material) || !object.geometry.attributes.position || object.geometry.morphAttributes.position) return;
    for (let node: THREE.Object3D | null = object; node && node !== root; node = node.parent) {
      if (excluded.has(node) || node.userData.celestialMotion || !node.visible) return;
    }
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    // Standard-material meshes without UVs already sample the renderer's (0,0)
    // default. Normalize only batching copies so equal surfaces can share a draw.
    if (!geometry.hasAttribute('uv') && !(object.material instanceof THREE.ShaderMaterial)) {
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    }
    const attributes = Object.keys(geometry.attributes).sort().map(key => `${key}:${geometry.attributes[key].itemSize}`).join('/');
    const key = `${object.material.uuid}/${object.castShadow}/${object.receiveShadow}/${object.renderOrder}/${attributes}`;
    const batch = batches.get(key) ?? { material: object.material, sources: [] as THREE.Mesh[], pieces: [] as THREE.BufferGeometry[], cast: object.castShadow, receive: object.receiveShadow, order: object.renderOrder };
    batch.sources.push(object); batch.pieces.push(geometry); batches.set(key, batch);
  });
  let count = 0;
  for (const batch of batches.values()) {
    if (batch.pieces.length < 2) { batch.pieces.forEach(piece => piece.dispose()); continue; }
    const geometry = mergeGeometries(batch.pieces, false);
    batch.pieces.forEach(piece => piece.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.name = `${root.name}_STATIC_BATCH_${count++}`;
    mesh.castShadow = batch.cast; mesh.receiveShadow = batch.receive; mesh.renderOrder = batch.order;
    mesh.userData.sourceNames = batch.sources.map(source => source.name);
    for (const source of batch.sources) {
      // Preserve named sockets and semantic anchors; presentation hit proxies are separate.
      const anchor = new THREE.Group();
      anchor.name = source.name; anchor.position.copy(source.position); anchor.quaternion.copy(source.quaternion);
      anchor.scale.copy(source.scale); anchor.userData = { ...source.userData, batchedInto: mesh.name };
      const parent = source.parent;
      while (source.children.length) anchor.add(source.children[0]);
      parent?.add(anchor); source.removeFromParent();
    }
    root.add(mesh);
  }
  root.userData.celestialStaticBatches = count;
}

/** Consolidate immobile botanical instances within one docking/landmark frame.
 * Geometry equality is byte-exact: similar-looking leaves never share a shape
 * accidentally. Construction previews keep the original funded part objects.
 */
export function batchCelestialPlantInstances(root: THREE.Group, exclusions: readonly THREE.Object3D[] = []) {
  const excluded = new Set(exclusions);
  const groups: THREE.InstancedMesh[][] = [];
  const sameArray = (a: ArrayLike<number>, b: ArrayLike<number>) => a.length === b.length && Array.prototype.every.call(a, (v: number, i: number) => v === b[i]);
  const sameGeometry = (a: THREE.BufferGeometry, b: THREE.BufferGeometry) => {
    const keys = Object.keys(a.attributes).sort();
    if (keys.join('/') !== Object.keys(b.attributes).sort().join('/')) return false;
    if (Boolean(a.index) !== Boolean(b.index) || (a.index && b.index && !sameArray(a.index.array, b.index.array))) return false;
    return keys.every(key => {
      const aa = a.attributes[key], bb = b.attributes[key];
      return aa.itemSize === bb.itemSize && aa.normalized === bb.normalized && sameArray(aa.array, bb.array);
    });
  };
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  root.traverse(object => {
    if (!(object instanceof THREE.InstancedMesh) || Array.isArray(object.material) || object.instanceColor
      || !/^(TREE_.*_BRANCH_CROWNS_|CELESTIAL_PLANT_)/.test(object.name)) return;
    for (let node: THREE.Object3D | null = object; node; node = node.parent) {
      if (excluded.has(node) || node.userData.celestialMotion || !node.visible) return;
      if (node === root) break;
    }
    const existing = groups.find(group => {
      const first = group[0];
      return first.material === object.material && first.castShadow === object.castShadow
        && first.receiveShadow === object.receiveShadow && first.renderOrder === object.renderOrder
        && sameGeometry(first.geometry, object.geometry);
    });
    if (existing) existing.push(object); else groups.push([object]);
  });
  const local = new THREE.Matrix4(), instance = new THREE.Matrix4();
  let batchIndex = 0;
  for (const sources of groups) {
    if (sources.length < 2) continue;
    const first = sources[0];
    const merged = new THREE.InstancedMesh(first.geometry.clone(), first.material, sources.reduce((sum, source) => sum + source.count, 0));
    merged.name = `${root.name}_BOTANICAL_INSTANCES_${batchIndex++}`;
    merged.castShadow = first.castShadow; merged.receiveShadow = first.receiveShadow; merged.renderOrder = first.renderOrder;
    merged.userData.sourceNames = sources.map(source => source.name);
    let offset = 0;
    for (const source of sources) {
      local.multiplyMatrices(inverse, source.matrixWorld);
      for (let i = 0; i < source.count; i++) {
        source.getMatrixAt(i, instance); instance.premultiply(local); merged.setMatrixAt(offset + i, instance);
      }
      const anchor = new THREE.Group();
      anchor.name = source.name; anchor.position.copy(source.position); anchor.quaternion.copy(source.quaternion); anchor.scale.copy(source.scale);
      anchor.userData = { ...source.userData, batchedInto: merged.name, instanceOffset: offset, instanceCount: source.count };
      while (source.children.length) anchor.add(source.children[0]);
      source.parent?.add(anchor); source.removeFromParent(); offset += source.count;
    }
    merged.instanceMatrix.needsUpdate = true;
    merged.computeBoundingBox(); merged.computeBoundingSphere(); root.add(merged);
  }
  root.userData.celestialBotanicalBatches = batchIndex;
}
