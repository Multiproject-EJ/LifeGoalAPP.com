export interface LevelTheme {
  id: string
  name: string
  tiles: {
    hidden: string
    damaged: string
    revealed: string
  }
  background: string
  accent: string
}

export const LEVEL_THEMES: Record<string, LevelTheme> = {
  soft_sand: {
    id: 'soft_sand',
    name: 'Soft Sand',
    tiles: {
      hidden: 'oklch(0.75 0.08 60)',
      damaged: 'oklch(0.68 0.10 55)',
      revealed: 'oklch(0.85 0.04 65)',
    },
    background: 'oklch(0.96 0.015 60)',
    accent: 'oklch(0.72 0.15 50)',
  },
  
  warm_rich: {
    id: 'warm_rich',
    name: 'Warm Rich',
    tiles: {
      hidden: 'oklch(0.55 0.12 40)',
      damaged: 'oklch(0.48 0.14 38)',
      revealed: 'oklch(0.70 0.08 45)',
    },
    background: 'oklch(0.92 0.025 45)',
    accent: 'oklch(0.68 0.18 35)',
  },
  
  deep_stone: {
    id: 'deep_stone',
    name: 'Deep Stone',
    tiles: {
      hidden: 'oklch(0.42 0.06 260)',
      damaged: 'oklch(0.36 0.08 265)',
      revealed: 'oklch(0.58 0.04 270)',
    },
    background: 'oklch(0.88 0.015 270)',
    accent: 'oklch(0.58 0.16 250)',
  },
  
  neon_transition: {
    id: 'neon_transition',
    name: 'Neon Transition',
    tiles: {
      hidden: 'oklch(0.48 0.16 300)',
      damaged: 'oklch(0.42 0.18 305)',
      revealed: 'oklch(0.65 0.10 310)',
    },
    background: 'oklch(0.90 0.030 310)',
    accent: 'oklch(0.62 0.22 295)',
  },
  
  neon_peak: {
    id: 'neon_peak',
    name: 'Neon Peak',
    tiles: {
      hidden: 'oklch(0.52 0.20 330)',
      damaged: 'oklch(0.45 0.22 335)',
      revealed: 'oklch(0.70 0.12 340)',
    },
    background: 'oklch(0.94 0.035 340)',
    accent: 'oklch(0.65 0.25 325)',
  },
}

export function getThemeForLevel(levelId: number): LevelTheme {
  if (levelId >= 1 && levelId <= 5) {
    return LEVEL_THEMES.soft_sand
  } else if (levelId >= 6 && levelId <= 10) {
    return LEVEL_THEMES.warm_rich
  } else if (levelId >= 11 && levelId <= 15) {
    return LEVEL_THEMES.deep_stone
  } else if (levelId >= 16 && levelId <= 20) {
    return LEVEL_THEMES.neon_transition
  } else if (levelId >= 21 && levelId <= 25) {
    return LEVEL_THEMES.neon_peak
  }
  
  return LEVEL_THEMES.soft_sand
}
