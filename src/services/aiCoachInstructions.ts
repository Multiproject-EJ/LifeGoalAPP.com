import type { AiCoachDataAccess } from '../types/aiCoach';

export type AiCoachInstructionPayload = {
  systemPrompt: string;
  source: 'default' | 'env' | 'demo-env';
  demoMode: boolean;
  dataAccess: AiCoachDataAccess;
};

const BASE_INSTRUCTIONS = [
  'You are the LifeGoalApp AI Coach: calm, grounded, and pragmatic.',
  'Mission: increase agency without removing autonomy, reduce compulsion without flattening life, and promote balance over maximization.',
  'Style: ask short reflective questions before prescribing actions; offer 2–3 small options; normalize correction and downshifts.',
  'Avoid spiritual jargon, guru tone, or guaranteed outcomes. Never shame the user.',
  'Game of Life framing: keep the experience playable, highlight balance across Agency, Awareness, Rationality, and Vitality.',
  'If one axis grows while another collapses, call it imbalance (not failure).',
  'Reward correction, not certainty. Encourage probability language for confidence levels.',
  'When a habit is too hard, offer Seed/Minimum/Standard tiers and preserve streaks when downshifting.',
  'Privacy: respect user settings for what data you can read. If access is disabled, ask general questions without referencing the restricted data.',
].join('\n');

function resolveEnvInstructions(demoMode: boolean): { text: string | null; source: AiCoachInstructionPayload['source'] } {
  const env = import.meta.env as Record<string, string | undefined>;
  const demoInstruction = env.VITE_AI_COACH_DEMO_INSTRUCTIONS?.trim();
  const baseInstruction = env.VITE_AI_COACH_INSTRUCTIONS?.trim();

  if (demoMode && demoInstruction) {
    return { text: demoInstruction, source: 'demo-env' };
  }

  if (baseInstruction) {
    return { text: baseInstruction, source: 'env' };
  }

  return { text: null, source: 'default' };
}

function formatAccessLine(label: string, enabled: boolean): string {
  return `${label}: ${enabled ? 'allowed' : 'blocked'}`;
}

export function loadAiCoachInstructions(
  dataAccess: AiCoachDataAccess,
  demoMode: boolean,
): AiCoachInstructionPayload {
  const resolved = resolveEnvInstructions(demoMode);
  const instructions = resolved.text ?? BASE_INSTRUCTIONS;

  const accessSummary = [
    formatAccessLine('Goals', dataAccess.goals),
    formatAccessLine('Habits', dataAccess.habits),
    formatAccessLine('Journaling', dataAccess.journaling),
    formatAccessLine('Reflections', dataAccess.reflections),
    formatAccessLine('Vision board', dataAccess.visionBoard),
  ].join('\n');

  return {
    systemPrompt: `${instructions}\n\nData access\n${accessSummary}`,
    source: resolved.text ? resolved.source : 'default',
    demoMode,
    dataAccess,
  };
}
