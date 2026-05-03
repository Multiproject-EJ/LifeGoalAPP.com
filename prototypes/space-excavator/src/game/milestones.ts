export type MilestoneStage = 'early' | 'mid' | 'late'

export interface MilestoneVisualConfig {
  brightness: number
  textureIntensity: number
  glowStrength: number
  edgeHighlight: number
}

export const MILESTONE_CONFIGS: Record<MilestoneStage, MilestoneVisualConfig> = {
  early: {
    brightness: 1.0,
    textureIntensity: 0.3,
    glowStrength: 0,
    edgeHighlight: 0.15,
  },
  mid: {
    brightness: 1.05,
    textureIntensity: 0.5,
    glowStrength: 0.15,
    edgeHighlight: 0.25,
  },
  late: {
    brightness: 1.1,
    textureIntensity: 0.7,
    glowStrength: 0.3,
    edgeHighlight: 0.4,
  },
}

export function getMilestoneStage(progressPercent: number): MilestoneStage {
  if (progressPercent < 30) {
    return 'early'
  } else if (progressPercent < 70) {
    return 'mid'
  } else {
    return 'late'
  }
}

export function getMilestoneVisualConfig(progressPercent: number): MilestoneVisualConfig {
  const stage = getMilestoneStage(progressPercent)
  return MILESTONE_CONFIGS[stage]
}
