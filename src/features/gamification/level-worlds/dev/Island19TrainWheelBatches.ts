import * as THREE from 'three';

/** Render existing wheel meshes as per-car batches; sockets keep their identity. */
export function batchIsland19TrainWheels(pivots: THREE.Object3D[], name: string) {
  const batches: THREE.InstancedMesh[] = [];
  const localMatrices: THREE.Matrix4[][] = [];
  // Every wheel has the same tyre and flange geometry/material. The flange's
  // left/right offset belongs to its original child transform, not the batch.
  for (let part = 0; part < 2; part += 1) {
    const sources = pivots.map(pivot => pivot.children[part] as THREE.Mesh);
    const batch = new THREE.InstancedMesh(sources[0].geometry.clone(), sources[0].material, pivots.length);
    batch.name = `${name}_${part === 0 ? 'TYRES' : 'FLANGES'}`;
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.castShadow = sources[0].castShadow;
    batch.receiveShadow = sources[0].receiveShadow;
    batch.userData = { gameplayAuthority: false, animatedWheelBatch: true };
    // The island's existing teardown disposes mesh geometry, but instance
    // matrices are mesh-owned GPU buffers. Tie their disposal to this private
    // geometry without changing lifecycle behavior for other island modules.
    const releaseInstances = () => {
      batch.geometry.removeEventListener('dispose', releaseInstances);
      batch.dispose();
    };
    batch.geometry.addEventListener('dispose', releaseInstances);
    localMatrices.push(sources.map(mesh => {
      mesh.updateMatrix();
      return mesh.matrix.clone();
    }));
    batches.push(batch);
  }
  pivots.forEach((pivot, index) => {
    pivot.children.slice().forEach(child => {
      (child as THREE.Mesh).geometry.dispose();
      pivot.remove(child);
    });
    pivot.userData = { ...pivot.userData, renderedByWheelBatch: true, wheelInstanceIndex: index };
  });
  const matrix = new THREE.Matrix4();
  let lastSpin = Number.NaN;
  const update = (spin: number) => {
    if (spin === lastSpin) return;
    lastSpin = spin;
    pivots.forEach((pivot, index) => {
      pivot.rotation.x = spin;
      pivot.updateMatrix();
      batches.forEach((batch, part) => {
        matrix.multiplyMatrices(pivot.matrix, localMatrices[part][index]);
        batch.setMatrixAt(index, matrix);
      });
    });
    batches.forEach(batch => { batch.instanceMatrix.needsUpdate = true; });
  };
  update(0);
  // A rotation-invariant conservative bound avoids stale culling during spin.
  // Both batches and sockets stay under their physical car, including POV hiding.
  const bounds = new THREE.Box3();
  pivots.forEach(pivot => {
    const margin = new THREE.Vector3(0.2, 0.2, 0.2);
    bounds.expandByPoint(pivot.position.clone().sub(margin));
    bounds.expandByPoint(pivot.position.clone().add(margin));
  });
  batches.forEach(batch => {
    batch.boundingBox = bounds.clone();
    batch.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
  });
  return { batches, update };
}
