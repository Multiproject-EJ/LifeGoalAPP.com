import * as THREE from 'three';
import { compactStaticGeometry } from './CrownCitadelThreeModel';
import type { IslandStagedRestorationPresentation } from './IslandStagedRestorationThreePresentation';

const STAGES = 8;
/** Per-section spectacle: summon (orb + ghost) → spiral rise → slam → surge. */
export const TITAN_SPINE_REPAIR_SECONDS = 4.8;
/** The eighth section plays an extended finale. */
export const TITAN_SPINE_FINALE_SECONDS = 8.6;
const SUMMON_END = 1.3;
const RISE_END = 2.5;
const SURGE_END = 4.0;
const SPARK_COUNT = 40;

/** Where each repair section sits on the bridge, in the spine root's space. */
export function titanSpineSectionPoint(stage: number, target = new THREE.Vector3()): THREE.Vector3 {
  const station = THREE.MathUtils.clamp(stage, 0, STAGES - 1) / (STAGES - 1);
  return target.set(0, THREE.MathUtils.lerp(0.24, 0.7, station), THREE.MathUtils.lerp(8.9, 4.34, station));
}

const easeOutBack = (u: number) => { const c = 2.2; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };

/** Map the authored ribs, steps and waystones to the same eight repair sections. */
export function getTitanSpinePartStage(name: string, fallbackRibCount = 8): number | null {
  const sculpt = /^TitanBridge_(VertebralBody|NeuralArch|Rib|RibBandA|RibBandB|TransverseProcessL|TransverseProcessR|CalcifiedStep|Waystone)_(\d+)/.exec(name);
  if (sculpt) {
    const count = sculpt[1] === 'CalcifiedStep' ? 28 : sculpt[1] === 'Waystone' ? 5 : 10;
    return Math.min(STAGES - 1, Math.floor((Number(sculpt[2]) - 1) * STAGES / count));
  }
  const fallback = /^ISLAND_17_RIB_BRIDGE_(TAPERED_ARCH|RIB_HEAD|RIB_WEATHER_BAND|RAISED_VERTEBRA|NEURAL_ARCH|SPINOUS_PROCESS|STERNUM_WALKWAY_SLAB|VERTEBRAL_PROCESS|SIDE_SKULL_RELIC)_(\d+)/.exec(name);
  return fallback ? Math.min(STAGES - 1, Math.floor((Number(fallback[2]) - 1) * STAGES / fallbackRibCount)) : null;
}

export function createTitanSpineRestoration(root: THREE.Group, bonePalette: THREE.MeshStandardMaterial[] = []) {
  const batchedBone = bonePalette[0]?.clone();
  if (batchedBone) {
    batchedBone.name = 'Titan spine bone palette';
    batchedBone.color.set(0xffffff);
    batchedBone.vertexColors = true;
  }
  let activatedStages = 0;
  let previousStages = 0;
  let sequence = 0;
  let initialized = false;
  let lastElapsed = 0;
  let repairStartedAt: number | null = null;
  const bindings: Array<{ group: THREE.Group; stage: number; up: THREE.Vector3 }> = [];
  // One bone material per section so flashes and the energy surge can travel.
  const stageMaterials = new Map<number, THREE.MeshStandardMaterial>();
  const stageMaterial = (stage: number) => {
    let material = stageMaterials.get(stage);
    if (!material && batchedBone) {
      material = batchedBone.clone();
      material.name = `Titan spine section ${stage + 1}`;
      material.emissive = new THREE.Color(0x000000);
      stageMaterials.set(stage, material);
    }
    return material;
  };

  // ── Spectacle rig (additive, depth-write off, hidden when idle) ──
  const fx = new THREE.Group();
  fx.name = 'ISLAND_17_SPINE_REPAIR_SPECTACLE';
  fx.visible = false;
  fx.userData.keepSeparate = true;
  root.add(fx);
  const additive = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const orbMaterial = additive(0xe6fffb);
  const orbHaloMaterial = additive(0x3ef2e0, 0.45);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), orbMaterial);
  const orbHalo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 12), orbHaloMaterial);
  orb.add(orbHalo);
  fx.add(orb);
  const orbLight = new THREE.PointLight(0x5ffff0, 0, 7);
  orb.add(orbLight);
  const trailMaterial = additive(0x7dfdf2, 0.6);
  const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6), trailMaterial, 14);
  trail.frustumCulled = false;
  fx.add(trail);
  const ringMaterials = [additive(0xffd76a, 0.9), additive(0x62fff0, 0.8)];
  const rings = ringMaterials.map((material) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 48), material);
    ring.rotation.x = -Math.PI / 2;
    fx.add(ring);
    return ring;
  });
  const sparkMaterial = additive(0xffe9a8);
  const sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.11, 0), sparkMaterial, SPARK_COUNT);
  sparks.frustumCulled = false;
  fx.add(sparks);
  const sparkDirections = Array.from({ length: SPARK_COUNT }, (_, index) => {
    const angle = index * 2.39996;
    const lift = 0.35 + ((index * 37) % 11) / 11;
    return new THREE.Vector3(Math.cos(angle) * (0.8 + (index % 3) * 0.35), lift * 2.2, Math.sin(angle) * (0.8 + (index % 4) * 0.25));
  });
  // A pillar of soul-light erupts from the section on the slam.
  const pillarMaterial = additive(0x9ffcf4, 0);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 7, 24, 1, true), pillarMaterial);
  pillar.geometry.translate(0, 3.5, 0);
  fx.add(pillar);
  const ghostMaterial = additive(0x46f7ff, 0);
  let ghost: THREE.Object3D | null = null;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const point = new THREE.Vector3();
  const spin = new THREE.Quaternion();
  const trailHistory: THREE.Vector3[] = Array.from({ length: 14 }, () => new THREE.Vector3());

  const clearGhost = () => {
    if (ghost) ghost.parent?.remove(ghost);
    ghost = null;
  };
  const makeGhost = (stage: number) => {
    clearGhost();
    const binding = bindings.find((entry) => entry.stage === stage);
    if (!binding) return;
    const copy = binding.group.clone(true);
    copy.name = `ISLAND_17_SPINE_GHOST_${stage + 1}`;
    // A ghost is presentation only: never counted as a restored section.
    copy.traverse((node) => { node.userData = { spineGhost: true }; });
    copy.visible = true;
    copy.position.set(0, 0, 0);
    copy.quaternion.identity();
    copy.scale.set(1, 1, 1);
    copy.traverse((node) => { if (node instanceof THREE.Mesh) node.material = ghostMaterial; });
    binding.group.parent?.add(copy);
    ghost = copy;
  };

  const bind = (model: THREE.Group, fallbackRibCount = 8) => {
    const candidates: Array<{ node: THREE.Object3D; stage: number }> = [];
    model.traverse((node) => {
      const stage = getTitanSpinePartStage(node.name, fallbackRibCount);
      if (stage !== null && node.parent) candidates.push({ node, stage });
    });
    const byParent = new Map<THREE.Object3D, Map<number, THREE.Group>>();
    model.updateWorldMatrix(true, true);
    candidates.forEach(({ node, stage }) => {
      const parent = node.parent!;
      let groups = byParent.get(parent);
      if (!groups) { groups = new Map(); byParent.set(parent, groups); }
      let group = groups.get(stage);
      if (!group) {
        group = new THREE.Group();
        group.name = `ISLAND_17_SPINE_REPAIR_SECTION_${stage + 1}`;
        group.userData.restorationStage = stage + 1;
        parent.add(group);
        groups.set(stage, group);
        const up = parent.worldToLocal(new THREE.Vector3(0, 1, 0))
          .sub(parent.worldToLocal(new THREE.Vector3()));
        bindings.push({ group, stage, up });
      }
      // The new group has the same parent and an identity transform.
      group.add(node);
    });
    byParent.forEach((groups) => groups.forEach((group) => {
      // These bone variants share texture maps. Vertex colors retain their
      // ivory/aged tones while reducing each section to one bone draw call.
      group.traverse(node => {
        if (!(node instanceof THREE.Mesh) || !batchedBone || Array.isArray(node.material)
          || !bonePalette.includes(node.material as THREE.MeshStandardMaterial)) return;
        const source = node.material as THREE.MeshStandardMaterial;
        const count = node.geometry.getAttribute('position').count;
        const colors = new Float32Array(count * 3);
        for (let index = 0; index < count; index += 1) source.color.toArray(colors, index * 3);
        node.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        node.material = batchedBone;
      });
      compactStaticGeometry(group, `${group.name}_BATCH`, { preserveKeepSeparate: true });
      const sectionMaterial = stageMaterial(Number(group.userData.restorationStage) - 1);
      if (sectionMaterial) {
        group.traverse(node => {
          if (node instanceof THREE.Mesh && node.material === batchedBone) node.material = sectionMaterial;
        });
      }
      group.userData.keepSeparate = true;
      group.traverse(node => { if (node instanceof THREE.Mesh) node.userData.keepSeparate = true; });
      group.visible = Number(group.userData.restorationStage) <= activatedStages;
    }));
  };

  const unbind = (model: THREE.Group) => {
    for (let index = bindings.length - 1; index >= 0; index -= 1) {
      let parent: THREE.Object3D | null = bindings[index].group;
      while (parent && parent !== model) parent = parent.parent;
      if (parent) bindings.splice(index, 1);
    }
  };

  const update = (presentation: IslandStagedRestorationPresentation, immediate = false) => {
    if (presentation.islandNumber !== 17) return;
    const next = Number.isFinite(presentation.activatedStages)
      ? THREE.MathUtils.clamp(Math.floor(presentation.activatedStages), 0, STAGES) : 0;
    const nextSequence = presentation.constructionSequence ?? 0;
    const shouldAnimate = initialized && !immediate
      && (next > activatedStages || (next === STAGES && nextSequence !== sequence));
    // A finale replay (already 8/8) plays the whole finale again from the last section.
    previousStages = shouldAnimate && next === STAGES && activatedStages === STAGES ? STAGES - 1 : activatedStages;
    activatedStages = next;
    sequence = nextSequence;
    repairStartedAt = shouldAnimate ? lastElapsed : null;
    if (shouldAnimate && next > previousStages) makeGhost(next - 1);
    else clearGhost();
    initialized = true;
    root.userData.activatedStages = activatedStages;
    bindings.forEach(({ group, stage }) => {
      group.visible = stage < activatedStages;
      group.position.set(0, 0, 0);
    });
  };

  const animate = (elapsed: number, reducedMotion: boolean) => {
    lastElapsed = elapsed;
    const age = repairStartedAt === null ? Infinity : Math.max(0, elapsed - repairStartedAt);
    if (reducedMotion && repairStartedAt !== null) { repairStartedAt = null; clearGhost(); }
    const finale = activatedStages === STAGES && previousStages < STAGES;
    const duration = finale ? TITAN_SPINE_FINALE_SECONDS : TITAN_SPINE_REPAIR_SECONDS;
    const active = !reducedMotion && age <= duration;
    const newStage = activatedStages - 1;
    fx.visible = active;

    // Summon: the soul orb streaks down from the storm into the gap.
    if (active) {
      const target = titanSpineSectionPoint(newStage, point);
      const summon = THREE.MathUtils.clamp(age / SUMMON_END, 0, 1);
      const fall = summon * summon;
      orb.visible = age < SUMMON_END + 0.15;
      orb.position.set(
        target.x + Math.sin(summon * Math.PI * 3) * (1 - summon) * 1.6,
        target.y + (1 - fall) * 7.5,
        target.z + Math.cos(summon * Math.PI * 3) * (1 - summon) * 1.2,
      );
      const flare = age > SUMMON_END ? Math.max(0, 1 - (age - SUMMON_END) / 0.15) * 3 : 1;
      orb.scale.setScalar(0.8 + summon * 0.5 + flare * 0.2);
      orbLight.intensity = orb.visible ? 2.4 + flare * 3 : 0;
      trailHistory.pop();
      trailHistory.unshift(orb.position.clone());
      trailHistory.forEach((position, index) => {
        const shrink = 1 - index / trailHistory.length;
        scale.setScalar(orb.visible ? shrink : 0);
        matrix.compose(position, quaternion.identity(), scale);
        trail.setMatrixAt(index, matrix);
      });
      trail.instanceMatrix.needsUpdate = true;
      // Ghost of the missing section pulses until the bones arrive.
      ghostMaterial.opacity = age < RISE_END
        ? (0.25 + 0.25 * Math.sin(age * 12)) * THREE.MathUtils.smoothstep(age, 0, 0.5)
        : Math.max(0, 0.5 * (1 - (age - RISE_END) / 0.4));
      if (age > RISE_END + 0.45) clearGhost();

      // Slam: shockwave rings, a spark fountain.
      const sinceSlam = age - RISE_END;
      rings.forEach((ring, index) => {
        const ringAge = sinceSlam - index * 0.16;
        const visible = ringAge >= 0 && ringAge < 1.1;
        ring.visible = visible;
        if (!visible) return;
        const u = ringAge / 1.1;
        ring.position.set(target.x, target.y + 0.05, target.z);
        ring.scale.setScalar(0.4 + u * (finale ? 9 : 5.5));
        ringMaterials[index].opacity = (1 - u) * (index === 0 ? 0.95 : 0.8);
      });
      pillar.visible = sinceSlam >= 0 && sinceSlam < 1.3;
      if (pillar.visible) {
        const u = sinceSlam / 1.3;
        pillar.position.set(target.x, target.y, target.z);
        pillar.scale.set(1 - u * 0.6, 0.3 + Math.min(1, u * 4) * 0.7, 1 - u * 0.6);
        pillarMaterial.opacity = (1 - u) * (finale ? 0.85 : 0.6);
      }
      const sparkAge = sinceSlam;
      sparks.visible = sparkAge >= 0 && sparkAge < 1.6;
      if (sparks.visible) {
        sparkDirections.forEach((direction, index) => {
          const t = sparkAge * (0.9 + (index % 5) * 0.08);
          scale.setScalar(Math.max(0, 1 - sparkAge / 1.6) * (0.7 + (index % 3) * 0.3));
          matrix.compose(
            point.set(target.x + direction.x * t, target.y + direction.y * t - 2.6 * t * t, target.z + direction.z * t),
            quaternion.setFromEuler(new THREE.Euler(t * 9, t * 7, 0)),
            scale,
          );
          sparks.setMatrixAt(index, matrix);
        });
        sparks.instanceMatrix.needsUpdate = true;
        sparkMaterial.opacity = Math.max(0, 1 - sparkAge / 1.6);
      }
    }

    // Bones: rise from the abyss spiralling, overshoot, slam into place.
    bindings.forEach(({ group, stage, up }) => {
      group.visible = stage < activatedStages;
      const isNew = stage >= previousStages && stage < activatedStages;
      group.scale.set(1, 1, 1);
      group.quaternion.identity();
      if (active && isNew && age < RISE_END + 0.35) {
        if (age < SUMMON_END) {
          group.visible = false;
        } else if (age < RISE_END) {
          const u = (age - SUMMON_END) / (RISE_END - SUMMON_END);
          const rise = easeOutBack(u);
          group.position.copy(up).multiplyScalar(-3.4 * (1 - rise));
          group.quaternion.copy(spin.setFromAxisAngle(up, (1 - u) * Math.PI * 3));
          group.scale.setScalar(0.55 + 0.45 * Math.min(1, u * 1.4));
        } else {
          // Squash on impact, then settle.
          const u = (age - RISE_END) / 0.35;
          group.position.set(0, 0, 0);
          const squash = Math.sin(Math.PI * u) * 0.14;
          group.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
        }
      } else if (active && finale && age > SURGE_END) {
        // Finale: the whole spine breathes.
        const breath = Math.sin((age - SURGE_END) * 5 - stage * 0.6) * 0.035 * (1 - (age - SURGE_END) / (duration - SURGE_END));
        group.position.set(0, 0, 0);
        group.scale.setScalar(1 + breath);
      } else {
        group.position.set(0, 0, 0);
      }
      // Flash on slam + an energy surge racing head-to-tail (three laps in the finale).
      const material = stageMaterials.get(stage);
      if (!material) return;
      let glow = 0;
      if (active && stage < activatedStages) {
        const sinceSlam = age - RISE_END;
        if (isNew && sinceSlam >= 0) glow = Math.max(glow, 3.2 * Math.exp(-sinceSlam * 2.6));
        const laps = finale ? 3 : 1;
        const lapSeconds = (SURGE_END - RISE_END) / 1.1;
        for (let lap = 0; lap < laps; lap += 1) {
          const wave = (sinceSlam - lap * lapSeconds) / lapSeconds * (STAGES + 1);
          const distance = Math.abs(wave - stage);
          if (sinceSlam - lap * lapSeconds >= 0 && distance < 1.4) glow = Math.max(glow, 1.6 * (1 - distance / 1.4));
        }
      }
      material.emissive.setRGB(glow * 0.35, glow * 0.85, glow * 0.8);
      material.emissiveIntensity = glow > 0 ? 1 : 0;
    });

    const burst = active ? Math.sin(Math.PI * THREE.MathUtils.clamp(age / duration, 0, 1)) : 0;
    root.userData.missionRepairActive = active;
    return { activatedStages, burst, finale: finale && active };
  };

  return { bind, unbind, update, animate };
}
