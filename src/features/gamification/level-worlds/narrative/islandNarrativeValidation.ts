import type { IslandNarrativeDefinition } from './islandNarrativeTypes';

const PRIORITIES = new Set(['major', 'short', 'ambient']);
const REPEAT_POLICIES = new Set(['once', 'repeatable']);
const SURFACES = new Set(['story_reader', 'dialogue_sheet', 'toast']);
const STOP_IDS = new Set(['hatchery', 'habit', 'mystery', 'wisdom', 'boss']);
const TRIGGER_KINDS = new Set([
  'island_entered', 'arrival_closed', 'stop_opened', 'stop_completed',
  'landmark_level_completed', 'landmarks_restored_majority',
  'boss_challenge_started', 'boss_midpoint',
  'boss_eligible', 'boss_resolved', 'island_clear_travel_ready',
]);
const PROHIBITED_FIELDS = new Set([
  'reward', 'rewards', 'coins', 'dice', 'essence', 'tickets', 'probability', 'rarity',
  'creatureStats', 'inventory', 'tileIndex', 'tileIndices', 'completeStop', 'resolveBoss',
  'awardReward', 'travel', 'buildSpend', 'callback', 'callbacks', 'mutation', 'mutations',
  'action', 'actionId', 'gameplayAction',
]);

export type IslandNarrativeValidationResult = { valid: boolean; errors: string[] };

export function validateIslandNarrativeDefinition(definition: unknown): IslandNarrativeValidationResult {
  const errors: string[] = [];
  rejectProhibitedFields(definition, 'definition', errors);

  if (!isObject(definition)) return { valid: false, errors: ['definition must be an object'] };
  const def = definition as Partial<IslandNarrativeDefinition> & Record<string, unknown>;
  if (def.version !== 1) errors.push('version must be 1');
  if (!Number.isInteger(def.islandNumber) || Number(def.islandNumber) <= 0) errors.push('islandNumber must be a positive integer');
  if (typeof def.islandName !== 'string' || !def.islandName.trim()) errors.push('islandName must be a non-empty string');
  if (typeof def.civilizationName !== 'string' || !def.civilizationName.trim()) errors.push('civilizationName must be a non-empty string');
  if (!Array.isArray(def.characters)) errors.push('characters must be an array');
  if (!Array.isArray(def.beats)) errors.push('beats must be an array');

  const characterIds = new Set<string>();
  if (Array.isArray(def.characters)) {
    for (const [index, character] of def.characters.entries()) {
      if (!isObject(character)) { errors.push(`characters[${index}] must be an object`); continue; }
      if (typeof character.id !== 'string' || !character.id.trim()) errors.push(`characters[${index}].id must be a non-empty string`);
      else if (characterIds.has(character.id)) errors.push(`duplicate character id: ${character.id}`);
      else characterIds.add(character.id);
      if (typeof character.displayName !== 'string' || !character.displayName.trim()) errors.push(`characters[${index}].displayName must be a non-empty string`);
      if ('portraitSrc' in character && typeof character.portraitSrc !== 'string') errors.push(`characters[${index}].portraitSrc must be a string when present`);
    }
  }

  const beatIds = new Set<string>();
  if (Array.isArray(def.beats)) {
    for (const [index, beat] of def.beats.entries()) {
      if (!isObject(beat)) { errors.push(`beats[${index}] must be an object`); continue; }
      const beatId = typeof beat.id === 'string' ? beat.id : '';
      if (!beatId) errors.push(`beats[${index}].id must be a non-empty string`);
      else if (beatIds.has(beatId)) errors.push(`duplicate beat id: ${beatId}`);
      else beatIds.add(beatId);
      if (Number.isInteger(def.islandNumber) && Number(def.islandNumber) > 0 && beatId) {
        const prefix = `I${String(def.islandNumber).padStart(3, '0')}`;
        if (!new RegExp(`^${prefix}-B\\d{2}$`).test(beatId)) errors.push(`Island ${def.islandNumber} beat id must match ${prefix}-B##: ${beatId}`);
      }
      if (typeof beat.speakerId === 'string' && !characterIds.has(beat.speakerId)) errors.push(`${beatId || `beats[${index}]`} references unknown speakerId: ${beat.speakerId}`);
      if (!PRIORITIES.has(String(beat.priority))) errors.push(`${beatId || `beats[${index}]`} has unsupported priority: ${String(beat.priority)}`);
      if (!SURFACES.has(String(beat.surface))) errors.push(`${beatId || `beats[${index}]`} has unsupported surface: ${String(beat.surface)}`);
      if (!REPEAT_POLICIES.has(String(beat.repeatPolicy))) errors.push(`${beatId || `beats[${index}]`} has unsupported repeatPolicy: ${String(beat.repeatPolicy)}`);
      if (beat.surface === 'story_reader' && (typeof beat.episodePath !== 'string' || !beat.episodePath.trim())) errors.push(`${beatId} story_reader beat requires episodePath`);
      if ((beat.surface === 'dialogue_sheet' || beat.surface === 'toast') && (typeof beat.text !== 'string' || !beat.text.trim())) errors.push(`${beatId} ${String(beat.surface)} beat requires text`);
      if ('displayCtaText' in beat && typeof beat.displayCtaText !== 'string') errors.push(`${beatId} displayCtaText must be a display-only string`);
      validateTrigger(beatId || `beats[${index}]`, beat.trigger, Number(def.islandNumber), errors);
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateTrigger(label: string, trigger: unknown, islandNumber: number, errors: string[]): void {
  if (!isObject(trigger)) { errors.push(`${label}.trigger must be an object`); return; }
  if (!TRIGGER_KINDS.has(String(trigger.kind))) errors.push(`${label}.trigger.kind is unsupported: ${String(trigger.kind)}`);
  if (trigger.islandNumber !== islandNumber) errors.push(`${label}.trigger.islandNumber must match definition islandNumber`);
  if ('stopId' in trigger && !STOP_IDS.has(String(trigger.stopId))) errors.push(`${label}.trigger.stopId must be canonical`);
  if ('level' in trigger && ![1, 2, 3].includes(Number(trigger.level))) errors.push(`${label}.trigger.level must be 1, 2, or 3`);
}

function rejectProhibitedFields(value: unknown, path: string, errors: string[]): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectProhibitedFields(item, `${path}[${index}]`, errors));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PROHIBITED_FIELDS.has(key)) errors.push(`${path}.${key} is prohibited in narrative content`);
    if (typeof child !== 'function') rejectProhibitedFields(child, `${path}.${key}`, errors);
    else errors.push(`${path}.${key} must not be a gameplay callback`);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
