export type AiCostLevel = 'level_1' | 'level_2';
export type AiExecutionTier = 'free' | 'premium';

export type AiTaskKey =
  | 'habit_title_rewrite'
  | 'habit_suggestion_structured'
  | 'habit_rationale_rewrite'
  | 'environment_idea_generation'
  | 'conflict_inner_reflection'
  | 'conflict_shared_mediation';

type AiTaskDefinition = {
  level: AiCostLevel;
  description: string;
};

const AI_TASK_REGISTRY: Record<AiTaskKey, AiTaskDefinition> = {
  habit_title_rewrite: {
    level: 'level_1',
    description: 'Shorten and clarify verbose habit titles/details.',
  },
  habit_suggestion_structured: {
    level: 'level_1',
    description: 'Generate concise structured habit suggestion payload.',
  },
  habit_rationale_rewrite: {
    level: 'level_1',
    description: 'Polish rationale copy with clarity and encouragement.',
  },
  environment_idea_generation: {
    level: 'level_1',
    description: 'Produce practical environment setup ideas.',
  },
  conflict_inner_reflection: {
    level: 'level_2',
    description: 'Deeper personal context synthesis and next-step coaching.',
  },
  conflict_shared_mediation: {
    level: 'level_2',
    description: 'Neutral mediation analysis with fairness/safety constraints.',
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
