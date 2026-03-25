import type { CreatureFitConfig } from './creatureFitEngine';

export interface PerfectCompanionRuntimeConfig {
  fit: CreatureFitConfig & {
    maxPerfectCount: number;
  };
  gameplay: {
    pityIslandThreshold: number;
    softBiasPercent: number;
    startupBonusByEffect: Record<'bonus_dice' | 'bonus_heart' | 'bonus_spin', number>;
    encounterBonusCaps: {
      coins: number;
      hearts: number;
      dice: number;
      spinTokens: number;
    };
  };
}

export const DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG: PerfectCompanionRuntimeConfig = {
  fit: {
    strengthWeight: 0.6,
    healingWeight: 0.4,
    zoneWeight: 0.1,
    rarityBonusByTier: {
      common: 0,
      rare: 4,
      mythic: 8,
    },
    maxPerfectCount: 3,
  },
  gameplay: {
    pityIslandThreshold: 5,
    softBiasPercent: 35,
    startupBonusByEffect: {
      bonus_dice: 2,
      bonus_heart: 1,
      bonus_spin: 1,
    },
    encounterBonusCaps: {
      coins: 4,
      hearts: 1,
      dice: 2,
      spinTokens: 1,
    },
  },
};

function getStorageKey(userId: string): string {
  return `perfect_companion_runtime_config:${userId}`;
}

function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(value)));
}

function clampInt(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function sanitizeConfig(candidate: Partial<PerfectCompanionRuntimeConfig>): PerfectCompanionRuntimeConfig {
  return {
    fit: {
      strengthWeight: typeof candidate.fit?.strengthWeight === 'number' ? candidate.fit.strengthWeight : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.fit.strengthWeight,
      healingWeight: typeof candidate.fit?.healingWeight === 'number' ? candidate.fit.healingWeight : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.fit.healingWeight,
      zoneWeight: typeof candidate.fit?.zoneWeight === 'number' ? candidate.fit.zoneWeight : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.fit.zoneWeight,
      rarityBonusByTier: {
        common: typeof candidate.fit?.rarityBonusByTier?.common === 'number'
          ? candidate.fit.rarityBonusByTier.common
          : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.fit.rarityBonusByTier.common,
        rare: typeof candidate.fit?.rarityBonusByTier?.rare === 'number'
          ? candidate.fit.rarityBonusByTier.rare
          : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.fit.rarityBonusByTier.rare,
        mythic: typeof candidate.fit?.rarityBonusByTier?.mythic === 'number'
          ? candidate.fit.rarityBonusByTier.mythic
          : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.fit.rarityBonusByTier.mythic,
      },
      maxPerfectCount: clampInt(
        typeof candidate.fit?.maxPerfectCount === 'number' ? candidate.fit.maxPerfectCount : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.fit.maxPerfectCount,
        DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.fit.maxPerfectCount,
        1,
        3,
      ),
    },
    gameplay: {
      pityIslandThreshold: clampInt(
        typeof candidate.gameplay?.pityIslandThreshold === 'number' ? candidate.gameplay.pityIslandThreshold : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.pityIslandThreshold,
        DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.pityIslandThreshold,
        1,
        120,
      ),
      softBiasPercent: clampPercent(
        typeof candidate.gameplay?.softBiasPercent === 'number' ? candidate.gameplay.softBiasPercent : DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.softBiasPercent,
        DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.softBiasPercent,
      ),
      startupBonusByEffect: {
        bonus_dice: clampInt(
          candidate.gameplay?.startupBonusByEffect?.bonus_dice ?? DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.startupBonusByEffect.bonus_dice,
          DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.startupBonusByEffect.bonus_dice,
          0,
          5,
        ),
        bonus_heart: clampInt(
          candidate.gameplay?.startupBonusByEffect?.bonus_heart ?? DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.startupBonusByEffect.bonus_heart,
          DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.startupBonusByEffect.bonus_heart,
          0,
          3,
        ),
        bonus_spin: clampInt(
          candidate.gameplay?.startupBonusByEffect?.bonus_spin ?? DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.startupBonusByEffect.bonus_spin,
          DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.startupBonusByEffect.bonus_spin,
          0,
          3,
        ),
      },
      encounterBonusCaps: {
        coins: clampInt(
          candidate.gameplay?.encounterBonusCaps?.coins ?? DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.encounterBonusCaps.coins,
          DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.encounterBonusCaps.coins,
          0,
          10,
        ),
        hearts: clampInt(
          candidate.gameplay?.encounterBonusCaps?.hearts ?? DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.encounterBonusCaps.hearts,
          DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.encounterBonusCaps.hearts,
          0,
          3,
        ),
        dice: clampInt(
          candidate.gameplay?.encounterBonusCaps?.dice ?? DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.encounterBonusCaps.dice,
          DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.encounterBonusCaps.dice,
          0,
          5,
        ),
        spinTokens: clampInt(
          candidate.gameplay?.encounterBonusCaps?.spinTokens ?? DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.encounterBonusCaps.spinTokens,
          DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG.gameplay.encounterBonusCaps.spinTokens,
          0,
          3,
        ),
      },
    },
  };
}

export function readPerfectCompanionRuntimeConfig(userId: string): PerfectCompanionRuntimeConfig {
  if (typeof window === 'undefined') return DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG;
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG;
    return sanitizeConfig(JSON.parse(raw) as Partial<PerfectCompanionRuntimeConfig>);
  } catch {
    return DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG;
  }
}

export function writePerfectCompanionRuntimeConfig(userId: string, config: Partial<PerfectCompanionRuntimeConfig>): PerfectCompanionRuntimeConfig {
  const next = sanitizeConfig(config);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  }
  return next;
}

export function resetPerfectCompanionRuntimeConfig(userId: string): PerfectCompanionRuntimeConfig {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(getStorageKey(userId));
  }
  return DEFAULT_PERFECT_COMPANION_RUNTIME_CONFIG;
}
