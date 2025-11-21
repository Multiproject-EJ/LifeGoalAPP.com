/**
 * Supported AI models for goal suggestions
 */
export type AiModel = 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5-pro';

/**
 * AI model options with display labels and descriptions
 */
export const AI_MODEL_OPTIONS: Array<{
  value: AiModel;
  label: string;
  description: string;
}> = [
  {
    value: 'gpt-5-nano',
    label: 'GPT‑5 nano (fastest, cheapest)',
    description: 'Best for quick suggestions with minimal cost',
  },
  {
    value: 'gpt-5-mini',
    label: 'GPT‑5 mini (better quality, still affordable)',
    description: 'Balanced quality and performance',
  },
  {
    value: 'gpt-5-pro',
    label: 'GPT‑5 pro (highest quality, most expensive)',
    description: 'Premium suggestions with the best quality',
  },
];

/**
 * Default AI model
 */
export const DEFAULT_AI_MODEL: AiModel = 'gpt-5-nano';
