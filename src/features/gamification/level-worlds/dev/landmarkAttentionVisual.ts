import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { LandmarkAttention } from '../services/islandRunLandmarkAttention';

/** Two bounded draw calls. Copies major surfaces only; never changes authored materials. */
export function createLandmarkAttentionVisual(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const candidates: Array<{ mesh: THREE.Mesh; size: number }> = [];
  root.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object instanceof THREE.SkinnedMesh) return;
    const position = object.geometry.getAttribute('position');
    if (!position || position.count > 240000) return;
    object.geometry.computeBoundingBox();
    const size = object.geometry.boundingBox!.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld)).getSize(new THREE.Vector3());
    candidates.push({ mesh: object, size: Math.max(size.x * size.y, size.x * size.z, size.y * size.z) });
  });
  candidates.sort((a, b) => b.size - a.size);
  const major = candidates.filter(item => item.size >= (candidates[0]?.size ?? 0) * .12).slice(0, 12);
  const surfaces: THREE.BufferGeometry[] = [], edges: THREE.BufferGeometry[] = [];
  let vertexBudget = 240000;
  for (const { mesh } of major) {
    const count = mesh.geometry.getAttribute('position').count;
    if (count > vertexBudget) continue;
    vertexBudget -= count;
    const transform = inverse.clone().multiply(mesh.matrixWorld);
    const source = mesh.geometry.clone().applyMatrix4(transform);
    const outline = new THREE.EdgesGeometry(source, 55);
    const positions = outline.getAttribute('position');
    source.computeBoundingBox();
    const minimumLength = source.boundingBox!.getSize(new THREE.Vector3()).length() * .025;
    const lines: number[] = [];
    for (let i = 0; i + 1 < positions.count && lines.length < 24000; i += 2) {
      const a = new THREE.Vector3().fromBufferAttribute(positions, i), b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
      if (a.distanceTo(b) >= minimumLength) lines.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    edges.push(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)));
    outline.dispose();
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    for (const key of Object.keys(geometry.attributes)) if (key !== 'position') geometry.deleteAttribute(key);
    surfaces.push(geometry);
    source.dispose();
  }
  const group = new THREE.Group();
  group.name = 'landmark-attention';
  const softMaterial = new THREE.MeshBasicMaterial({ color: 0xbbe7ff, transparent: true, opacity: .09, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, blending: THREE.AdditiveBlending });
  const blueMaterial = new THREE.LineBasicMaterial({ color: 0x32adff, transparent: true, opacity: .95, depthWrite: false });
  const softGeometry = surfaces.length ? mergeGeometries(surfaces) : new THREE.BufferGeometry();
  const blueGeometry = edges.length ? mergeGeometries(edges) : new THREE.BufferGeometry();
  const soft = new THREE.Mesh(softGeometry!, softMaterial);
  const blue = new THREE.LineSegments(blueGeometry!, blueMaterial);
  // Decorative overlays must never intercept building selection.
  soft.raycast = () => {}; blue.raycast = () => {};
  group.add(soft, blue);
  let attached = false;
  surfaces.forEach(g => g.dispose()); edges.forEach(g => g.dispose());
  return {
    set(state: LandmarkAttention, visible: boolean) {
      if (!attached) { root.add(group); group.updateWorldMatrix(true, true); attached = true; }
      group.visible = visible && state !== 'none';
      soft.visible = state === 'soft'; blue.visible = state === 'blue';
    },
    dispose() {
      group.removeFromParent(); softGeometry?.dispose(); blueGeometry?.dispose();
      softMaterial.dispose(); blueMaterial.dispose();
    },
  };
}
