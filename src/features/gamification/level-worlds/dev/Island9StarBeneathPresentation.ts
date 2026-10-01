import * as THREE from 'three';
import { compactStaticGeometry } from './CrownCitadelThreeModel';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { IslandStagedRestorationThreeRuntime } from './IslandStagedRestorationThreePresentation';
import { createStarBeneathPlayback, type StarBeneathPose } from './Island9StarBeneathTimeline';

/** Authored, centre-contained scenery. The canonical mission ledger is its only input. */
export function createIsland9StarBeneathPresentation(scene: THREE.Scene, quality: Island3DQuality): IslandStagedRestorationThreeRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_9_STAR_BENEATH_PRESENTATION';
  root.userData.missionPresentationActive = false;
  const segments = quality === 'high' ? 32 : quality === 'medium' ? 24 : 16;
  const copper = new THREE.MeshStandardMaterial({ color: 0x754325, metalness: .78, roughness: .34 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xeab965, metalness: .82, roughness: .27 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x182c35, metalness: .65, roughness: .48 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x9bedfa, emissive: 0x34b8dc, emissiveIntensity: .7, metalness: .3, roughness: .24 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffd082, emissive: 0xff9d35, emissiveIntensity: .65, roughness: .4 });
  const starlight = new THREE.MeshStandardMaterial({ color: 0xf3fdff, emissive: 0x92dcff, emissiveIntensity: 1.8, roughness: .17, metalness: .15 });
  const thread = new THREE.LineBasicMaterial({ color: 0xe6bc75, transparent: true, opacity: .8, depthWrite: false });
  const stages = Array.from({ length: 8 }, (_, index) => {
    const group = new THREE.Group(); group.name = `ISLAND_9_CONTAINMENT_STAGE_${index + 1}`;
    root.add(group); return group;
  });
  const vec = (radius: number, angle: number, y: number) => new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position = new THREE.Vector3()) => {
    const item = new THREE.Mesh(geometry, material); item.position.copy(position); parent.add(item); return item;
  };
  const rod = (parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) => {
    const delta = b.clone().sub(a);
    const item = mesh(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), 6), material, a.clone().add(b).multiplyScalar(.5));
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return item;
  };
  scene.updateMatrixWorld(true);
  const wall = scene.getObjectByName('V4_UNCAPPED_VERTICAL_BORE') ?? scene.getObjectByName('ISLAND_9_DEEP_SHAFT_WALL');
  const wallPoint = (angle: number, y: number, inset = .015) => {
    const direction = vec(1, angle, 0);
    const ray = new THREE.Raycaster(new THREE.Vector3(0, y, 0), direction, 0, 2.68);
    const hit = wall ? ray.intersectObject(wall, true)[0] : undefined;
    const radius = hit ? Math.hypot(hit.point.x, hit.point.z) : 2.5;
    return vec(Math.min(2.64, radius - inset), angle, y);
  };
  const wallAttachments: Array<{ angle: number; anchor: number[]; deck: number[] }> = [];
  // Six compact instruments are seated on discrete wall-rooted corbels.

  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + .2;
    const point = vec(2.04, angle, .23);
    const plinth = mesh(stages[0], new THREE.BoxGeometry(.19, .2, .24), copper, point);
    plinth.rotation.y = -angle;
    const deck = vec(2.04, angle, .23), upper = wallPoint(angle, .12, -.018), lower = wallPoint(angle, -.62, -.018);
    rod(stages[0], deck, upper, .055, copper);
    rod(stages[0], deck, lower, .045, copper);
    rod(stages[0], upper, lower, .045, copper);
    wallAttachments.push({ angle, anchor: lower.toArray(), deck: deck.toArray() });
    rod(stages[0], vec(2.04, angle, .28), vec(2.04, angle, .62), .035, gold);
    mesh(stages[0], new THREE.OctahedronGeometry(.075, 0), amber, vec(2.04, angle, .64));
    // Narrow illuminated stitches descend into the shaft, leaving its centre open.
    const stitch = new THREE.CatmullRomCurve3([wallPoint(angle, .12), wallPoint(angle + .07, -.45), wallPoint(angle - .05, -1.0), wallPoint(angle + .05, -1.55)]);
    mesh(stages[1], new THREE.TubeGeometry(stitch, 12, .013, 4, false), blue);
    const weight = mesh(stages[2], new THREE.BoxGeometry(.13, .28, .18), dark, vec(1.94, angle, .98));
    weight.rotation.y = -angle;
    rod(stages[2], deck, vec(1.94, angle, .36), .032, copper);
    rod(stages[2], vec(1.94, angle, .36), vec(1.94, angle, 1.15), .018, gold);
    mesh(stages[2], new THREE.CylinderGeometry(.1, .1, .045, 10), gold, vec(1.94, angle, 1.18));
    const tether = new THREE.CatmullRomCurve3([vec(1.94, angle, 1.2), vec(1.55, angle, 1.02), vec(.92, angle, .78)]);
    mesh(stages[3], new THREE.TubeGeometry(tether, 10, .012, 4, false), blue);
  }
  const petals: THREE.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const pivot = new THREE.Group(); pivot.position.copy(vec(.83, angle, .74)); pivot.rotation.y = -angle;
    const blade = mesh(pivot, new THREE.BoxGeometry(.39, .045, .18), gold, new THREE.Vector3(.13, 0, 0));
    blade.rotation.y = .12;
    mesh(pivot, new THREE.BoxGeometry(.23, .015, .075), blue, new THREE.Vector3(.16, .032, 0));
    stages[4].add(pivot); petals.push(pivot);
    const tooth = mesh(stages[5], new THREE.ConeGeometry(.075, .32, 4), copper, vec(.62, angle, .57));
    tooth.rotation.z = -.3; tooth.rotation.y = -angle;
  }
  // A single articulated meridian, open at its crown; no nested halo stack.
  const armillary = new THREE.Group(); stages[6].add(armillary);
  const arcPoints = Array.from({ length: segments + 1 }, (_, i) => {
    const a = -.82 * Math.PI + i / segments * 1.64 * Math.PI;
    return new THREE.Vector3(Math.sin(a) * .91, Math.cos(a) * .91, 0);
  });
  mesh(armillary, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPoints), segments, .042, 6, false), gold);
  for (const sign of [-1, 1]) {
    mesh(armillary, new THREE.CylinderGeometry(.12, .12, .11, 12), copper, new THREE.Vector3(sign * .88, 0, 0)).rotation.z = Math.PI / 2;
    mesh(armillary, new THREE.OctahedronGeometry(.065), blue, new THREE.Vector3(sign * .97, 0, 0));
  }
  const star = new THREE.Group(); star.name = 'ISLAND_9_UNFOLDED_ARTIFICIAL_STAR'; stages[7].add(star);
  const core = mesh(star, new THREE.IcosahedronGeometry(.27, quality === 'high' ? 2 : 1), starlight);
  // Identical shards retain their authored transforms in two material batches.
  const facetGeometry = new THREE.OctahedronGeometry(.12, 0);
  const facetBatches = [blue, gold].map((material, index) => {
    const batch = new THREE.InstancedMesh(facetGeometry, material, 4);
    batch.name = `ISLAND_9_STAR_FACETS_${index}`;
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    star.add(batch); return batch;
  });
  const facets = Array.from({ length: 8 }, (_, i) => {
    const shard = new THREE.Object3D();
    shard.scale.set(.6, 2.4, .6); shard.rotation.z = -.35; shard.rotation.y = -i * Math.PI / 4;
    return shard;
  });
  const constellation = new THREE.Group(); constellation.name = 'ISLAND_9_DAWN_CONSTELLATION'; stages[7].add(constellation);
  const stars = [new THREE.Vector3(0, 3.52, 0), new THREE.Vector3(-.65, 3.08, .12), new THREE.Vector3(-1.24, 3.32, -.18), new THREE.Vector3(-1.77, 2.85, .04), new THREE.Vector3(.68, 3.04, -.09), new THREE.Vector3(1.22, 3.35, .16), new THREE.Vector3(1.78, 2.88, -.03), new THREE.Vector3(0, 2.68, .38)];
  const links = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [1, 7], [7, 4]];
  const linePositions = links.flatMap(([a, b]) => [...stars[a].toArray(), ...stars[b].toArray()]);
  const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  constellation.add(new THREE.LineSegments(lineGeometry, thread));
  const constellationGold = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1), gold, stars.length);
  const constellationWhite = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.026), starlight, stars.length);
  constellationGold.name = 'ISLAND_9_CONSTELLATION_GOLD';
  constellationWhite.name = 'ISLAND_9_CONSTELLATION_WHITE';
  for (const batch of [constellationGold, constellationWhite]) {
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage); constellation.add(batch);
  }
  const constellationTransform = new THREE.Object3D();
  for (const index of [0, 1, 2, 3, 5]) compactStaticGeometry(stages[index], `HEARTSHAFT_STAGE_${index + 1}`);
  compactStaticGeometry(armillary, 'HEARTSHAFT_MERIDIAN');
  const light = new THREE.PointLight(0x88dfff, 0, 4.6, 2); light.name = 'ISLAND_9_CONTAINED_STAR_LIGHT'; root.add(light);
  const existingHeart = scene.getObjectByName('V4_OPEN_BORE_HEART') ?? scene.getObjectByName('ISLAND_9_MAGMA_HEART');
  const originalHeartVisible = existingHeart?.visible ?? false;
  const ring = scene.getObjectByName('ISLAND_9_IGNITION_RING_PIVOT');
  const ringRestY = ring?.position.y ?? 0;
  const suspension: Array<{ mesh: THREE.Mesh; original: THREE.BufferGeometry; from: THREE.Object3D; to: THREE.Object3D; replacement: THREE.BufferGeometry }> = [];
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.userData.endpoints) return;
    const from = scene.getObjectByName(object.userData.endpoints.from), to = scene.getObjectByName(object.userData.endpoints.to);
    if (!from || !to || !object.name.startsWith('F5_TAUT_SUSPENSION_')) return;
    const replacement = new THREE.CylinderGeometry(.025, .025, 1, 6);
    suspension.push({ mesh: object, original: object.geometry, from, to, replacement });
    object.geometry = replacement;
  });
  const updateSuspension = () => {
    scene.updateMatrixWorld(true);
    suspension.forEach(({ mesh: cable, from, to }) => {
      const a = cable.parent!.worldToLocal(from.getWorldPosition(new THREE.Vector3()));
      const b = cable.parent!.worldToLocal(to.getWorldPosition(new THREE.Vector3()));
      const delta = b.clone().sub(a);
      cable.position.copy(a).add(b).multiplyScalar(.5);
      cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
      cable.scale.set(1, delta.length(), 1);
    });
  };
  root.userData.wallAttachments = wallAttachments;
  const apply = (pose: StarBeneathPose) => {
    stages.forEach((group, index) => {
      group.visible = index < pose.stage;
      group.scale.setScalar(index === pose.stage - 1 && pose.stage < 8 ? .85 + pose.stageReveal * .15 : 1);
    });
    const ringLift = pose.stage >= 7 ? .22 + pose.starRise * .25 : 0;
    if (ring && suspension.length === 3) { ring.position.y = ringRestY + ringLift; updateSuspension(); }
    stages[4].position.y = ringLift;
    stages[5].position.y = ringLift;
    petals.forEach((pivot, i) => { pivot.rotation.z = -.08 - pose.ringUnfold * .68; pivot.rotation.y = -i * Math.PI / 4; });
    armillary.position.y = .88 + (pose.stage >= 7 ? .32 : 0) + pose.starRise * .85;
    armillary.rotation.set(.24 + pose.ringUnfold * .35, -.4, .12);
    star.position.y = -2.58 + pose.starRise * 4.48;
    star.rotation.y = pose.ringUnfold * .7;
    core.scale.setScalar(1 + pose.pulse * .16);
    facets.forEach((item, i) => {
      item.position.copy(vec(.32 + pose.ringUnfold * .19, i * Math.PI / 4, i % 2 ? .06 : -.06));
      item.updateMatrix(); facetBatches[i % 2].setMatrixAt(Math.floor(i / 2), item.matrix);
    });
    for (const batch of facetBatches) { batch.instanceMatrix.needsUpdate = true; batch.computeBoundingSphere(); }
    constellation.visible = pose.stage === 8 && pose.constellation > 0;
    constellation.scale.setScalar(.96 + pose.constellation * .04);
    thread.opacity = .72 * pose.constellation;
    stars.forEach((point, i) => {
      const reveal = Math.max(.001, Math.min(1, pose.constellation * 1.7 - i * .085));
      constellationTransform.position.copy(point);
      constellationTransform.scale.setScalar(reveal * (i === 0 ? .09 : .055));
      constellationTransform.updateMatrix(); constellationGold.setMatrixAt(i, constellationTransform.matrix);
      constellationTransform.scale.setScalar(reveal);
      constellationTransform.updateMatrix(); constellationWhite.setMatrixAt(i, constellationTransform.matrix);
    });
    for (const batch of [constellationGold, constellationWhite]) { batch.instanceMatrix.needsUpdate = true; batch.computeBoundingSphere(); }
    light.position.copy(star.position); light.intensity = pose.stage === 8 ? 2.4 * pose.starRise : 0;
    blue.emissiveIntensity = .7 + pose.cooling * .35;
    if (existingHeart) existingHeart.visible = pose.stage === 8 ? false : originalHeartVisible;
    root.userData.missionPresentationActive = pose.active;
    root.userData.starBeneathPose = { ...pose };
  };
  const playback = createStarBeneathPlayback(apply);
  const missionHitTarget = mesh(root, new THREE.SphereGeometry(.85, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), new THREE.Vector3(0, .9, 0));
  missionHitTarget.name = 'ISLAND_9_STAGED_RESTORATION_MISSION_HIT_TARGET';
  // Caller may invoke this before scene disposal; no heart transform or material is mutated.
  let disposed = false;
  root.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    // Instance attributes are renderer-owned buffers, separate from shared geometry.
    for (const batch of [...facetBatches, constellationGold, constellationWhite]) batch.dispose();
    if (existingHeart) existingHeart.visible = originalHeartVisible;
    if (ring) ring.position.y = ringRestY;
    suspension.forEach(({ mesh: cable, original, replacement }) => {
      cable.geometry = original; cable.position.set(0, 0, 0); cable.quaternion.identity(); cable.scale.set(1, 1, 1); replacement.dispose();
    });
  };
  playback.update({ activatedStages: 0 }, true);
  return {
    root, missionHitTarget,
    update: (presentation, immediate = false) => {
      playback.update(presentation, immediate);
      root.userData.missionPresentationActive = playback.active;
    },
    animate: (elapsed, reducedMotion) => { playback.animate(elapsed, reducedMotion); },
  };
}
