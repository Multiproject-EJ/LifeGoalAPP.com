export type EggHatchTier = 'common' | 'rare' | 'mythic';
export type EggHatchPhase = 'settle' | 'wiggle' | 'cracking' | 'burst' | 'peek' | 'reveal' | 'complete';
export type EggHatchPaletteId = 'verdant' | 'lagoon' | 'sunfire' | 'orchid';
export type EggHatchRuntimeQuality = 'low' | 'high';

export interface EggHatchRuntimeSignals {
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  devicePixelRatio?: number;
  prefersReducedMotion?: boolean;
}

export interface EggHatchPalette {
  id: EggHatchPaletteId;
  label: string;
  shell: string;
  shellSecondary: string;
  accent: string;
  crack: string;
  leaf: string;
}

export interface EggHatchTierProfile {
  id: EggHatchTier;
  label: string;
  shellFamily: 'ivory-gold-freckle' | 'molten-amber-gold' | 'violet-cosmic-speckle';
  fragmentCount: number;
  ornamentCount: number;
  silhouetteSignature: string;
  materialClass: 'pearl-ceramic' | 'amber-glass-metal' | 'cosmic-enamel';
  referenceArtSrc: string;
  roughness: number;
  metalness: number;
  emissiveStrength: number;
}

export interface EggHatchPose {
  phase: EggHatchPhase;
  elapsedSeconds: number;
  durationSeconds: number;
  eggLift: number;
  eggRotationX: number;
  eggRotationZ: number;
  crackProgress: number;
  burstProgress: number;
  peekProgress: number;
  revealProgress: number;
  creatureRise: number;
  creatureScale: number;
  leafBounce: number;
  complete: boolean;
}

export interface EggFragmentPose {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  resting: boolean;
}

export const EGG_HATCH_DURATION_SECONDS = 7.2;
export const EGG_HATCH_REDUCED_MOTION_DURATION_SECONDS = 2.1;
export const EGG_HATCH_THREE_CREATURE_ID = 'common-sproutling';

export const EGG_HATCH_PALETTES: readonly EggHatchPalette[] = [
  { id: 'verdant', label: 'Verdant', shell: '#f1e8c8', shellSecondary: '#c7a951', accent: '#58b865', crack: '#b9fbff', leaf: '#4f913f' },
  { id: 'lagoon', label: 'Lagoon', shell: '#9de4df', shellSecondary: '#267e9f', accent: '#56d9ff', crack: '#d9ffff', leaf: '#36a48a' },
  { id: 'sunfire', label: 'Sunfire', shell: '#ffb14e', shellSecondary: '#b7322f', accent: '#ffe06a', crack: '#fff2b0', leaf: '#719b3a' },
  { id: 'orchid', label: 'Orchid', shell: '#9e78d5', shellSecondary: '#3b286f', accent: '#ed8bff', crack: '#8ff4ff', leaf: '#588c55' },
] as const;

export const EGG_HATCH_TIER_PROFILES: Record<EggHatchTier, EggHatchTierProfile> = {
  common: { id: 'common', label: 'Common', shellFamily: 'ivory-gold-freckle', fragmentCount: 8, ornamentCount: 24, silhouetteSignature: 'ivory-gold-freckled-egg-in-a-moss-stone-and-blue-crystal-nest', materialClass: 'pearl-ceramic', referenceArtSrc: '/assets/Eggs/Egg_common_lv3.webp', roughness: 0.3, metalness: 0.02, emissiveStrength: 0.02 },
  rare: { id: 'rare', label: 'Rare', shellFamily: 'molten-amber-gold', fragmentCount: 8, ornamentCount: 28, silhouetteSignature: 'luminous-amber-gold-egg-in-a-moss-stone-and-blue-crystal-nest', materialClass: 'amber-glass-metal', referenceArtSrc: '/assets/Eggs/Egg_rare_lv3.webp', roughness: 0.2, metalness: 0.3, emissiveStrength: 0.16 },
  mythic: { id: 'mythic', label: 'Mythic', shellFamily: 'violet-cosmic-speckle', fragmentCount: 8, ornamentCount: 38, silhouetteSignature: 'deep-violet-cosmic-egg-in-a-moss-stone-and-blue-crystal-nest', materialClass: 'cosmic-enamel', referenceArtSrc: '/assets/Eggs/Egg_mystery_lv3.webp', roughness: 0.14, metalness: 0.08, emissiveStrength: 0.3 },
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - (2 * t));
};
const progressBetween = (time: number, start: number, end: number) => smoothstep((time - start) / (end - start));

export function getEggHatchPalette(id: EggHatchPaletteId): EggHatchPalette {
  return EGG_HATCH_PALETTES.find((palette) => palette.id === id) ?? EGG_HATCH_PALETTES[0];
}

export function isEggHatchThreeCreature(creatureId: string | undefined): boolean {
  return creatureId === EGG_HATCH_THREE_CREATURE_ID;
}

/**
 * Selects the production renderer tier without persisting device state. The
 * hatch remains a presentation-only reward ceremony, and explicit dev/lab
 * quality props still take precedence over this device-derived default.
 */
export function resolveEggHatchRuntimeQuality(signals: EggHatchRuntimeSignals): EggHatchRuntimeQuality {
  if (signals.prefersReducedMotion) return 'low';

  const memory = signals.deviceMemoryGb;
  const cores = signals.hardwareConcurrency;
  const dpr = signals.devicePixelRatio ?? 1;
  if (typeof memory === 'number' && memory <= 3) return 'low';
  if (typeof cores === 'number' && cores <= 4) return 'low';
  if (dpr > 2.5 && typeof memory === 'number' && memory <= 4) return 'low';

  return 'high';
}

/** Parses the optional deterministic screenshot time without treating a missing query as zero. */
export function parseEggHatchPreviewTime(rawValue: string | null): number | null {
  if (rawValue == null || rawValue.trim() === '') return null;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function resolveEggHatchPose(elapsedSeconds: number, reducedMotion = false): EggHatchPose {
  const rawTime = Math.max(0, elapsedSeconds);
  if (reducedMotion) {
    const time = Math.min(rawTime, EGG_HATCH_REDUCED_MOTION_DURATION_SECONDS);
    const crackProgress = progressBetween(time, 0.2, 0.72);
    const burstProgress = progressBetween(time, 0.7, 1.15);
    const revealProgress = progressBetween(time, 0.85, 1.78);
    const complete = time >= EGG_HATCH_REDUCED_MOTION_DURATION_SECONDS;
    const phase: EggHatchPhase = complete ? 'complete' : time < 0.2 ? 'settle' : time < 0.7 ? 'cracking' : time < 1.15 ? 'burst' : time < 1.55 ? 'peek' : 'reveal';
    return {
      phase,
      elapsedSeconds: time,
      durationSeconds: EGG_HATCH_REDUCED_MOTION_DURATION_SECONDS,
      eggLift: 0,
      eggRotationX: 0,
      eggRotationZ: 0,
      crackProgress,
      burstProgress,
      peekProgress: progressBetween(time, 0.88, 1.34),
      revealProgress,
      creatureRise: revealProgress,
      creatureScale: 0.92 + (0.08 * revealProgress),
      leafBounce: 0,
      complete,
    };
  }

  const time = Math.min(rawTime, EGG_HATCH_DURATION_SECONDS);
  const crackProgress = progressBetween(time, 1.7, 3.72);
  const burstProgress = progressBetween(time, 3.64, 4.86);
  const peekProgress = progressBetween(time, 4.05, 5.02);
  const revealProgress = progressBetween(time, 4.78, 6.58);
  const complete = time >= EGG_HATCH_DURATION_SECONDS;
  let phase: EggHatchPhase = 'settle';
  if (complete) phase = 'complete';
  else if (time >= 5.08) phase = 'reveal';
  else if (time >= 4.28) phase = 'peek';
  else if (time >= 3.64) phase = 'burst';
  else if (time >= 1.7) phase = 'cracking';
  else if (time >= 0.52) phase = 'wiggle';

  const wiggleEnvelope = time >= 0.52 && time < 3.72
    ? Math.sin(Math.PI * clamp01((time - 0.52) / 3.2))
    : 0;
  const acceleratingFrequency = 7.2 + (Math.max(0, time - 0.52) * 3.4);
  const shake = Math.sin(time * acceleratingFrequency) * wiggleEnvelope;
  const microShake = Math.sin(time * 22.3) * crackProgress * (1 - burstProgress);
  const revealOvershoot = revealProgress > 0
    ? Math.sin(revealProgress * Math.PI * 2.4) * (1 - revealProgress)
    : 0;

  return {
    phase,
    elapsedSeconds: time,
    durationSeconds: EGG_HATCH_DURATION_SECONDS,
    eggLift: Math.max(0, shake) * 0.045,
    eggRotationX: (shake * 0.035) + (microShake * 0.018),
    eggRotationZ: (shake * 0.115) + (microShake * 0.035),
    crackProgress,
    burstProgress,
    peekProgress,
    revealProgress,
    creatureRise: Math.max(peekProgress * 0.68, revealProgress),
    creatureScale: 0.84 + (0.16 * revealProgress) + (revealOvershoot * 0.035),
    leafBounce: revealOvershoot,
    complete,
  };
}

export function resolveEggFragmentPose(
  fragmentIndex: number,
  burstProgress: number,
  reducedMotion = false,
): EggFragmentPose {
  const t = clamp01(burstProgress);
  const angle = ((fragmentIndex % 8) / 8) * Math.PI * 2 + 0.22;
  const variation = 0.86 + (((fragmentIndex * 37) % 11) / 20);
  if (reducedMotion) {
    return {
      position: [Math.cos(angle) * t * 0.48, -t * 0.24, Math.sin(angle) * t * 0.34],
      rotation: [Math.sin(angle) * t * 0.34, angle * 0.08 * t, Math.cos(angle) * t * 0.45],
      resting: t >= 1,
    };
  }

  const flightTime = t * 1.45;
  const horizontalSpeed = 1.08 * variation;
  const verticalSpeed = 2.45 + ((fragmentIndex % 3) * 0.24);
  const gravity = 3.85;
  const x = Math.cos(angle) * horizontalSpeed * flightTime;
  const z = Math.sin(angle) * horizontalSpeed * flightTime * 0.78;
  const ballisticY = (verticalSpeed * flightTime) - (gravity * flightTime * flightTime);
  const y = Math.max(-1.42, ballisticY);
  const resting = ballisticY <= -1.42 && t > 0.72;
  return {
    position: [x, y, z],
    rotation: [flightTime * (2.1 + fragmentIndex * 0.09), flightTime * (1.45 + fragmentIndex * 0.07), flightTime * (2.7 - fragmentIndex * 0.08)],
    resting,
  };
}
