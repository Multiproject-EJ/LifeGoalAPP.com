import type { AiTaskKey } from './aiTaskKeys';

export type { AiTaskKey };
export type AiCostLevel = 'level_1' | 'level_2';
export type AiExecutionTier = 'free' | 'premium';

type AiTaskDefinition = {
  level: AiCostLevel;
  description: string;
  /**
   * Whether the task may run on the device's own model (Apple Intelligence on
   * iPhone, Gemini Nano on Android) before falling back to the server. Short rewrites and structured
   * suggestions fit the small on-device model; mediation stays on the server.
   */
  onDevice: boolean;
};

const AI_TASK_REGISTRY: Record<AiTaskKey, AiTaskDefinition> = {
  habit_title_rewrite: {
    level: 'level_1',
    description: 'Shorten and clarify verbose habit titles/details.',
    onDevice: true,
  },
  habit_suggestion_structured: {
    level: 'level_1',
    description: 'Generate concise structured habit suggestion payload.',
    onDevice: true,
  },
  habit_rationale_rewrite: {
    level: 'level_1',
    description: 'Polish rationale copy with clarity and encouragement.',
    onDevice: true,
  },
  habit_chain_suggestion: {
    level: 'level_1',
    description: 'Suggest possible keystone / chain-reaction links between habits and life areas.',
    onDevice: true,
  },
  habit_tip_of_day: {
    level: 'level_2',
    description: 'Creatively reshape a struggling habit loop (cue/craving/routine/reward) into a Tip of the Day.',
    onDevice: true,
  },
  environment_idea_generation: {
    level: 'level_1',
    description: 'Produce practical environment setup ideas.',
    onDevice: true,
  },
  conflict_inner_reflection: {
    level: 'level_2',
    description: 'Deeper personal context synthesis and next-step coaching.',
    onDevice: false,
  },
  conflict_shared_mediation: {
    level: 'level_2',
    description: 'Neutral mediation analysis with fairness/safety constraints.',
    onDevice: false,
  },
};

const LEVEL_MODEL_DEFAULTS: Record<AiCostLevel, { free: string; premium: string }> = {
  level_1: {
    free: 'gpt-4o-mini',
    premium: 'gpt-5-mini',
  },
  level_2: {
    free: 'gpt-4o-mini',
    premium: 'gpt-5-pro',
  },
};

export function getAiTaskLevel(task: AiTaskKey): AiCostLevel {
  return AI_TASK_REGISTRY[task].level;
}

export function getAiTaskDefinition(task: AiTaskKey): AiTaskDefinition {
  return AI_TASK_REGISTRY[task];
}

export function resolveRuntimeAiTier(): AiExecutionTier {
  const tier = (import.meta.env.VITE_AI_TIER ?? '').toString().trim().toLowerCase();
  return tier === 'premium' ? 'premium' : 'free';
}

export function resolveModelForAiTask(task: AiTaskKey, tier: AiExecutionTier = resolveRuntimeAiTier()): string {
  const level = getAiTaskLevel(task);
  return LEVEL_MODEL_DEFAULTS[level][tier];
}

export function isOnDeviceAiTask(task: AiTaskKey): boolean {
  return AI_TASK_REGISTRY[task].onDevice;
}
