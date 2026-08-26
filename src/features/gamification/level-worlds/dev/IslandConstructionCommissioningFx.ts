import * as THREE from 'three';

export const ISLAND_CONSTRUCTION_COMMISSIONING_DURATION_SECONDS = 0.92;

export type IslandConstructionCommissioningBeat = {
  active: boolean;
  scaleMultiplier: number;
  flashIntensity: number;
  sparkleProgress: number;
};

function smooth01(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * One non-strobing commissioning beat: compress, overshoot, settle. Reduced
 * motion keeps geometry fixed and substitutes one restrained light pulse.
 */
export function resolveIslandConstructionCommissioningBeat(
  elapsedSeconds: number,
  reducedMotion = false,
): IslandConstructionCommissioningBeat {
  const progress = THREE.MathUtils.clamp(
    elapsedSeconds / ISLAND_CONSTRUCTION_COMMISSIONING_DURATION_SECONDS,
    0,
    1,
  );
  if (elapsedSeconds < 0 || progress >= 1) {
    return {
      active: false,
      scaleMultiplier: 1,
      flashIntensity: 0,
      sparkleProgress: 1,
    };
  }

  const flashWindow = reducedMotion ? 0.72 : 0.46;
  const flashProgress = THREE.MathUtils.clamp(progress / flashWindow, 0, 1);
  const flashIntensity = Math.sin(Math.PI * flashProgress) * (reducedMotion ? 0.48 : 1);
  if (reducedMotion) {
    return {
      active: true,
      scaleMultiplier: 1,
      flashIntensity,
      sparkleProgress: 1,
    };
  }

  let scaleMultiplier: number;
  if (progress < 0.24) {
    scaleMultiplier = THREE.MathUtils.lerp(0.88, 1.105, smooth01(progress / 0.24));
  } else if (progress < 0.56) {
    scaleMultiplier = THREE.MathUtils.lerp(1.105, 0.982, smooth01((progress - 0.24) / 0.32));
  } else {
    scaleMultiplier = THREE.MathUtils.lerp(0.982, 1, smooth01((progress - 0.56) / 0.44));
  }

  return {
    active: true,
    scaleMultiplier,
    flashIntensity,
    sparkleProgress: smooth01(THREE.MathUtils.clamp((progress - 0.04) / 0.78, 0, 1)),
  };
}

export interface IslandConstructionCommissioningFx {
  root: THREE.Group;
  metrics: { triangles: number; drawCalls: number };
  setTargetEnvelope: (radius: number, height: number) => void;
  trigger: (key: string) => void;
  update: (elapsedSeconds: number, reducedMotion?: boolean) => IslandConstructionCommissioningBeat;
  dispose: () => void;
}

const SPARKLE_COUNT = 18;

export function createIslandConstructionCommissioningFx(): IslandConstructionCommissioningFx {
  const root = new THREE.Group();
  root.name = 'ISLAND_RUN_CONSTRUCTION_COMMISSIONING_FX';
  root.visible = false;

  const positions = new Float32Array(SPARKLE_COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffdf72,
    size: 0.115,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const sparkles = new THREE.Points(geometry, material);
  sparkles.name = 'ISLAND_RUN_CONSTRUCTION_COMMISSIONING_SPARKLES';
  sparkles.frustumCulled = false;
  root.add(sparkles);

  const flash = new THREE.PointLight(0xffc83d, 0, 8, 2);
  flash.name = 'ISLAND_RUN_CONSTRUCTION_COMMISSIONING_FLASH';
  root.add(flash);

  let targetRadius = 1;
  let targetHeight = 2;
  let pendingTrigger = false;
  let startedAtSeconds: number | null = null;
  let activeKey = '';

  const setTargetEnvelope = (radius: number, height: number) => {
    targetRadius = Math.max(0.25, radius);
    targetHeight = Math.max(0.5, height);
    flash.position.set(0, targetHeight * 0.52, 0);
    flash.distance = Math.max(4, targetRadius * 4.2, targetHeight * 1.9);
    material.size = THREE.MathUtils.clamp(targetRadius * 0.055, 0.07, 0.18);
  };

  const trigger = (key: string) => {
    if (!key || key === activeKey) return;
    activeKey = key;
    pendingTrigger = true;
  };

  const update = (elapsedSeconds: number, reducedMotion = false) => {
    if (pendingTrigger) {
      pendingTrigger = false;
      startedAtSeconds = elapsedSeconds;
    }
    if (startedAtSeconds === null) {
      root.visible = false;
      return resolveIslandConstructionCommissioningBeat(-1, reducedMotion);
    }

    const beat = resolveIslandConstructionCommissioningBeat(elapsedSeconds - startedAtSeconds, reducedMotion);
    root.visible = beat.active && beat.flashIntensity > 0.001;
    flash.intensity = beat.flashIntensity * Math.max(1.8, targetRadius * 1.4);

    if (reducedMotion || !beat.active) {
      sparkles.visible = false;
      material.opacity = 0;
    } else {
      sparkles.visible = true;
      material.opacity = Math.sin(Math.PI * beat.sparkleProgress) * 0.92;
      for (let index = 0; index < SPARKLE_COUNT; index += 1) {
        const angle = (index / SPARKLE_COUNT) * Math.PI * 2 + (index % 3) * 0.19;
        const layer = index % 3;
        const radialProgress = THREE.MathUtils.clamp(beat.sparkleProgress * 1.18 - layer * 0.08, 0, 1);
        const radius = targetRadius * (0.34 + radialProgress * (0.8 + layer * 0.12));
        const yBase = targetHeight * (0.18 + (index % 6) * 0.12);
        positions[index * 3] = Math.cos(angle) * radius;
        positions[index * 3 + 1] = yBase + Math.sin(radialProgress * Math.PI) * targetHeight * 0.11;
        positions[index * 3 + 2] = Math.sin(angle) * radius * 0.72;
      }
      geometry.attributes.position.needsUpdate = true;
    }

    if (!beat.active) {
      startedAtSeconds = null;
      root.visible = false;
      flash.intensity = 0;
    }
    root.userData.commissioningBeat = beat;
    return beat;
  };

  return {
    root,
    metrics: { triangles: 0, drawCalls: 1 },
    setTargetEnvelope,
    trigger,
    update,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
