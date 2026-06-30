import type { CreatureDefinition } from './creatureCatalog';

export type CreatureDialogueFamily = 'steady' | 'curious' | 'brave' | 'caring' | 'generic';

const STEADY_AFFINITIES = new Set(['steady', 'grounded', 'builder', 'architect']);
const CURIOUS_AFFINITIES = new Set(['curious', 'visionary', 'explorer', 'oracle', 'sage', 'dreamer', 'creator', 'cosmic']);
const BRAVE_AFFINITIES = new Set(['brave', 'challenger', 'champion', 'guardian', 'commander', 'rebel', 'radiant', 'catalyst', 'strategist']);
const CARING_AFFINITIES = new Set(['caring', 'caregiver', 'nurturer', 'mentor', 'peacemaker']);

export function getCreatureDialogueFamily(creature: Pick<CreatureDefinition, 'affinity'> | null | undefined): CreatureDialogueFamily {
  const affinity = String(creature?.affinity ?? '').trim().toLowerCase();
  if (STEADY_AFFINITIES.has(affinity)) return 'steady';
  if (CURIOUS_AFFINITIES.has(affinity)) return 'curious';
  if (BRAVE_AFFINITIES.has(affinity)) return 'brave';
  if (CARING_AFFINITIES.has(affinity)) return 'caring';
  return 'generic';
}

export function getCreatureChannelLine(creature: Pick<CreatureDefinition, 'affinity'> | null | undefined): string {
  switch (getCreatureDialogueFamily(creature)) {
    case 'steady': return 'I have been trying to tell you which places feel safe.';
    case 'curious': return 'I have so many questions. You were only hearing the chirping part.';
    case 'brave': return 'Good. Now we can stop pretending every warning means run.';
    case 'caring': return 'I knew you understood some of it. Just not the words.';
    default: return 'The signal is new, but I am glad it finally reaches you.';
  }
}
