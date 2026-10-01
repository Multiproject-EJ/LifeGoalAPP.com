/** Runtime/route invariants, not a visual approval or physical-device performance claim. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import * as THREE from 'three';

const modules = new Map();
function moduleUrl(file) {
  const absolute = path.resolve(file);
  if (modules.has(absolute)) return modules.get(absolute);
  const source = readFileSync(absolute, 'utf8');
  let code = absolute.endsWith('.json') ? `export default ${source}` : ts.transpileModule(source, {
    fileName: absolute,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  code = code.replace(/from ['"]([^'"]+)['"]/g, (_, specifier) => {
    const resolved = specifier.startsWith('.')
      ? moduleUrl(path.resolve(path.dirname(absolute), specifier + (specifier.endsWith('.json') ? '' : '.ts')))
      : import.meta.resolve(specifier);
    return `from '${resolved}'`;
  });
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  modules.set(absolute, url);
  return url;
}
const { createIsland9StarBeneathPresentation: create } = await import(moduleUrl(
  'src/features/gamification/level-worlds/dev/Island9StarBeneathPresentation.ts',
));
const stageInput = (stage, sequence = stage) => ({ islandNumber: 9, stageCount: 8, activatedStages: stage, constructionSequence: sequence });
function snapshot(root) {
  root.updateMatrixWorld(true);
  const result = [];
  root.traverse(node => result.push({ name: node.name, visible: node.visible,
    matrix: node.matrix.toArray(), instances: node.isInstancedMesh ? Array.from(node.instanceMatrix.array) : undefined, intensity: node.isLight ? node.intensity : undefined,
    opacity: node.isLineSegments ? node.material.opacity : undefined }));
  return result;
}
function geometryStats(root) {
  root.updateMatrixWorld(true);
  let maxRadius = 0, triangles = 0, meshes = 0;
  root.traverse(node => {
    if (!node.isMesh) return;
    meshes++;
    const positions = node.geometry.getAttribute('position');
    triangles += (node.geometry.index?.count ?? positions.count) / 3 * (node.isInstancedMesh ? node.count : 1);
    for (let instance = 0; instance < (node.isInstancedMesh ? node.count : 1); instance++) {
      const matrix = node.matrixWorld.clone();
      if (node.isInstancedMesh) { const local = new THREE.Matrix4(); node.getMatrixAt(instance, local); matrix.multiply(local); }
    for (let i = 0; i < positions.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(matrix);
      assert(point.toArray().every(Number.isFinite), 'geometry coordinates remain finite');
      maxRadius = Math.max(maxRadius, Math.hypot(point.x, point.z));
    }
    }
  });
  assert(maxRadius < 2.70, 'mission geometry must not enter the protected route gutter');
  assert(meshes <= 120 && triangles <= 12000, 'mission stays within its bounded geometry budget');
  return { maxRadius, meshes, triangles };
}
const checks = [];
for (const quality of ['low', 'medium', 'high']) {
  for (const heartName of ['V4_OPEN_BORE_HEART', 'ISLAND_9_MAGMA_HEART']) {
    const scene = new THREE.Scene();
    const heart = new THREE.Mesh(new THREE.SphereGeometry(.3, 8, 6), new THREE.MeshStandardMaterial());
    heart.name = heartName; heart.position.set(0, -2.58, 0); scene.add(heart);
    const originalPosition = heart.position.toArray(), originalMaterial = heart.material, originalParent = heart.parent;
    const runtime = create(scene, quality); scene.add(runtime.root);
    assert.equal(runtime.missionHitTarget.material.opacity, 0, 'hit target cannot render as a solid sphere');
    assert.equal(runtime.missionHitTarget.material.depthWrite, false, 'hit target cannot occlude the star');
    let maxRadius = 0;
    for (let stage = 0; stage <= 8; stage++) {
      runtime.update(stageInput(stage), true);
      assert.equal(runtime.root.userData.missionPresentationActive, false, 'loaded stages never acquire animation ownership');
      for (let index = 1; index <= 8; index++) {
        assert.equal(runtime.root.getObjectByName(`ISLAND_9_CONTAINMENT_STAGE_${index}`).visible, index <= stage,
          'durable groups match exactly the canonical stage count');
      }
      assert.equal(heart.visible, stage !== 8, 'original and rising heart never appear together');
      maxRadius = Math.max(maxRadius, geometryStats(runtime.root).maxRadius);
      const settled = snapshot(runtime.root);
      runtime.animate(500, true);
      assert.deepEqual(snapshot(runtime.root), settled, 'reduced motion preserves loaded geometry');
    }
    runtime.update(stageInput(8, 99));
    assert.equal(runtime.root.userData.missionPresentationActive, true, 'playback arms before its first frame');
    runtime.animate(100, false);
    runtime.animate(106, false);
    assert.equal(runtime.root.userData.missionPresentationActive, true, 'finale remains active at its midpoint');
    const midpoint = snapshot(runtime.root);
    runtime.animate(106, false);
    assert.deepEqual(snapshot(runtime.root), midpoint, 'same absolute time cannot accumulate transforms');
    runtime.update(stageInput(8, 99));
    runtime.animate(111.9, false);
    assert.equal(runtime.root.userData.missionPresentationActive, true, 'same input does not restart or prematurely end playback');
    runtime.animate(112, false);
    assert.equal(runtime.root.userData.missionPresentationActive, false, 'finale relinquishes ownership after twelve seconds');
    const final = snapshot(runtime.root);
    runtime.update(stageInput(8, 100)); runtime.animate(200, false); runtime.animate(206, false);
    assert.deepEqual(snapshot(runtime.root), midpoint, 'replay reconstructs the same midpoint without accumulation');
    runtime.animate(212, false);
    assert.deepEqual(snapshot(runtime.root), final, 'replay reaches the same final geometry');
    runtime.update(stageInput(8, 101)); runtime.animate(300, true);
    assert.equal(runtime.root.userData.missionPresentationActive, false, 'reduced-motion replay immediately releases ownership');
    assert.deepEqual(snapshot(runtime.root), final, 'reduced-motion finale equals the animated final pose');
    runtime.update(stageInput(6, 102));
    runtime.update(stageInput(3, 103), true); runtime.animate(400, false);
    assert.equal(runtime.root.userData.starBeneathPose.stage, 3, 'immediate visit/reset input cancels pending playback');
    assert.equal(runtime.root.userData.missionPresentationActive, false, 'cancelled playback cannot reactivate');
    runtime.update(stageInput(6, 104)); runtime.animate(500, false); runtime.animate(501, false);
    assert.equal(runtime.root.userData.missionPresentationActive, true, 'ordinary stage animates');
    runtime.update(stageInput(8, 105), true); runtime.animate(501, false);
    assert.equal(runtime.root.userData.missionPresentationActive, false, 'immediate input cancels active playback');
    assert.deepEqual(snapshot(runtime.root), final, 'cancel-to-final lands at the canonical completed pose');
    assert.deepEqual(heart.position.toArray(), originalPosition, 'source heart transform is untouched');
    assert.equal(heart.material, originalMaterial, 'source heart material is untouched');
    assert.equal(heart.parent, originalParent, 'source heart ownership is untouched');
    const instanceDisposals = new Map();
    runtime.root.traverse(node => {
      if (!node.isInstancedMesh) return;
      instanceDisposals.set(node, 0);
      node.addEventListener('dispose', () => instanceDisposals.set(node, instanceDisposals.get(node) + 1));
    });
    assert.equal(instanceDisposals.size, 4, 'four instance batches own separate GPU buffers');
    runtime.root.userData.dispose(); runtime.root.userData.dispose();
    for (const count of instanceDisposals.values()) assert.equal(count, 1, 'each instance buffer releases exactly once');
    assert.equal(heart.visible, true, 'disposal restores source heart idempotently');
    checks.push({ quality, heartName, ...geometryStats(runtime.root), maxRadius });
  }
  const hiddenScene = new THREE.Scene();
  const hiddenHeart = new THREE.Mesh(new THREE.SphereGeometry(.3));
  hiddenHeart.name = 'V4_OPEN_BORE_HEART'; hiddenHeart.visible = false; hiddenScene.add(hiddenHeart);
  const hiddenRuntime = create(hiddenScene, quality); hiddenScene.add(hiddenRuntime.root);
  hiddenRuntime.update(stageInput(8), true); hiddenRuntime.root.userData.dispose();
  assert.equal(hiddenHeart.visible, false, 'disposal preserves a source heart that was already hidden');
  const scene = new THREE.Scene();
  const absentHeart = create(scene, quality); scene.add(absentHeart.root);
  absentHeart.update(stageInput(8), true); absentHeart.animate(0, true); absentHeart.root.userData.dispose();
  assert.equal(absentHeart.root.userData.missionPresentationActive, false, 'missing source heart is a safe supported fallback');
}
console.log(JSON.stringify({ status: 'pass', scope: 'Presentation lifecycle, deterministic poses, restoration and route geometry only; visual review remains separate.', checks }, null, 2));
