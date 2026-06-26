import type { IslandConversationDefinition, IslandConversationNode, IslandInhabitantTopicDefinition } from './islandConversationTypes';
import type { IslandInhabitantDefinition } from './islandInhabitantTypes';

const ARCHETYPES = new Set(['servant_wizard']);
const BIOMES = new Set(['woodland', 'celestial', 'fire', 'underwater', 'desert', 'unknown']);
const NODE_TYPES = new Set(['npc', 'choice', 'player_text_response', 'close']);
const RETURN_TARGETS = new Set(['encounter', 'board']);
const STORAGE_INTENTS = new Set(['presentation_only', 'defer_to_compass', 'defer_to_reflection']);
const MAX_NPC_TEXT_LENGTH = 180;
const MAX_CHOICE_LABEL_LENGTH = 70;
const MAX_REACHABLE_DEPTH = 6;
const PROHIBITED_FIELDS = new Set([
  'reward', 'rewards', 'coins', 'dice', 'essence', 'tickets', 'shards', 'inventory', 'rarity', 'probability',
  'tileIndex', 'tileIndices', 'stopIndex', 'completeStop', 'completeObjective', 'spendEssence', 'build',
  'buildSpend', 'resolveBoss', 'startBoss', 'bossReward', 'travel', 'performTravel', 'grant', 'claim',
  'action', 'actionId', 'callback', 'callbacks', 'function', 'functions', 'mutation', 'mutations',
  'gameplayAction', 'canonicalGameplayMutation',
]);

export type IslandConversationValidationResult = { valid: boolean; errors: string[] };

export function validateIslandInhabitantDefinition(definition: unknown): IslandConversationValidationResult {
  const errors: string[] = [];
  rejectUnsafeContent(definition, 'inhabitant', errors);
  if (!isObject(definition)) return { valid: false, errors: ['inhabitant must be an object'] };
  if (definition.version !== 1) errors.push('inhabitant.version must be 1');
  validatePositiveIsland(definition.islandNumber, 'inhabitant.islandNumber', errors);
  validateNonEmptyString(definition.id, 'inhabitant.id', errors);
  validateNonEmptyString(definition.displayName, 'inhabitant.displayName', errors);
  validateNonEmptyString(definition.roleLabel, 'inhabitant.roleLabel', errors);
  validateNonEmptyString(definition.civilizationName, 'inhabitant.civilizationName', errors);
  if (!ARCHETYPES.has(String(definition.archetype))) errors.push(`inhabitant.archetype is unsupported: ${String(definition.archetype)}`);
  if (!BIOMES.has(String(definition.biome))) errors.push(`inhabitant.biome is unsupported: ${String(definition.biome)}`);
  if (!Array.isArray(definition.defaultTopicIds) || definition.defaultTopicIds.length === 0) errors.push('inhabitant.defaultTopicIds must be a non-empty array');
  else definition.defaultTopicIds.forEach((topicId, index) => validateNonEmptyString(topicId, `inhabitant.defaultTopicIds[${index}]`, errors));
  return { valid: errors.length === 0, errors };
}

export function validateIslandConversationDefinition(definition: unknown): IslandConversationValidationResult {
  const errors: string[] = [];
  rejectUnsafeContent(definition, 'conversation', errors);
  if (!isObject(definition)) return { valid: false, errors: ['conversation must be an object'] };
  const def = definition as Partial<IslandConversationDefinition> & Record<string, unknown>;
  if (def.version !== 1) errors.push('conversation.version must be 1');
  validatePositiveIsland(def.islandNumber, 'conversation.islandNumber', errors);
  validateNonEmptyString(def.id, 'conversation.id', errors);
  validateNonEmptyString(def.title, 'conversation.title', errors);
  validateNonEmptyString(def.inhabitantId, 'conversation.inhabitantId', errors);
  validateNonEmptyString(def.openingNodeId, 'conversation.openingNodeId', errors);
  if (!isObject(def.nodes) || Object.keys(def.nodes).length === 0) errors.push('conversation.nodes must be a non-empty object');
  if (!isObject(def.nodes)) return { valid: errors.length === 0, errors };
  if (typeof def.openingNodeId === 'string' && !(def.openingNodeId in def.nodes)) errors.push(`openingNodeId does not exist: ${def.openingNodeId}`);
  for (const [key, node] of Object.entries(def.nodes)) validateNode(key, node, def.nodes as Record<string, IslandConversationNode>, errors);
  validateGraph(def as IslandConversationDefinition, errors);
  return { valid: errors.length === 0, errors };
}

export function validateIslandInhabitantContentSet(params: {
  inhabitants: IslandInhabitantDefinition[];
  topics: IslandInhabitantTopicDefinition[];
  conversations: IslandConversationDefinition[];
}): IslandConversationValidationResult {
  const errors: string[] = [];
  const inhabitantIds = new Set<string>();
  const topicIds = new Set<string>();
  const conversationIds = new Set<string>();
  for (const inhabitant of params.inhabitants) {
    errors.push(...validateIslandInhabitantDefinition(inhabitant).errors);
    if (inhabitantIds.has(inhabitant.id)) errors.push(`duplicate inhabitant id: ${inhabitant.id}`);
    inhabitantIds.add(inhabitant.id);
  }
  for (const conversation of params.conversations) {
    errors.push(...validateIslandConversationDefinition(conversation).errors);
    if (conversationIds.has(conversation.id)) errors.push(`duplicate conversation id: ${conversation.id}`);
    conversationIds.add(conversation.id);
    const inhabitant = params.inhabitants.find((item) => item.id === conversation.inhabitantId);
    if (!inhabitant) errors.push(`${conversation.id} references unknown inhabitant: ${conversation.inhabitantId}`);
    else if (inhabitant.islandNumber !== conversation.islandNumber) errors.push(`${conversation.id} islandNumber must match inhabitant islandNumber`);
  }
  for (const topic of params.topics) {
    rejectUnsafeContent(topic, `topic.${topic.id || 'unknown'}`, errors);
    if (topicIds.has(topic.id)) errors.push(`duplicate topic id: ${topic.id}`);
    topicIds.add(topic.id);
    validatePositiveIsland(topic.islandNumber, `${topic.id}.islandNumber`, errors);
    validateNonEmptyString(topic.id, 'topic.id', errors);
    validateNonEmptyString(topic.inhabitantId, `${topic.id}.inhabitantId`, errors);
    validateNonEmptyString(topic.label, `${topic.id}.label`, errors);
    validateNonEmptyString(topic.conversationId, `${topic.id}.conversationId`, errors);
    if (!Number.isInteger(topic.order) || topic.order < 0) errors.push(`${topic.id}.order must be a non-negative integer`);
    const conversation = params.conversations.find((item) => item.id === topic.conversationId);
    if (!conversation) errors.push(`${topic.id} references unknown conversation: ${topic.conversationId}`);
    else {
      if (topic.islandNumber !== conversation.islandNumber) errors.push(`${topic.id} islandNumber must match conversation islandNumber`);
      if (topic.inhabitantId !== conversation.inhabitantId) errors.push(`${topic.id} inhabitantId must match conversation inhabitantId`);
    }
  }
  for (const inhabitant of params.inhabitants) {
    for (const topicId of inhabitant.defaultTopicIds) if (!topicIds.has(topicId)) errors.push(`${inhabitant.id} default topic does not exist: ${topicId}`);
  }
  return { valid: errors.length === 0, errors };
}

function validateNode(key: string, node: unknown, nodes: Record<string, IslandConversationNode>, errors: string[]): void {
  if (!isObject(node)) { errors.push(`node ${key} must be an object`); return; }
  if (node.id !== key) errors.push(`node key/id mismatch: ${key}`);
  if (!NODE_TYPES.has(String(node.type))) { errors.push(`${key} has unsupported node type: ${String(node.type)}`); return; }
  if (node.type === 'npc') {
    validateNonEmptyString(node.speakerId, `${key}.speakerId`, errors);
    validateNonEmptyString(node.text, `${key}.text`, errors);
    if (typeof node.text === 'string' && node.text.length > MAX_NPC_TEXT_LENGTH) errors.push(`${key}.text must be ${MAX_NPC_TEXT_LENGTH} characters or fewer`);
    if ('nextNodeId' in node && typeof node.nextNodeId === 'string' && !(node.nextNodeId in nodes)) errors.push(`${key}.nextNodeId target does not exist: ${node.nextNodeId}`);
  } else if (node.type === 'choice') {
    validateNonEmptyString(node.prompt, `${key}.prompt`, errors);
    if (!Array.isArray(node.choices) || node.choices.length < 2 || node.choices.length > 4) errors.push(`${key}.choices must contain between 2 and 4 choices`);
    const ids = new Set<string>();
    if (Array.isArray(node.choices)) for (const choice of node.choices) {
      validateNonEmptyString(choice.id, `${key}.choices.id`, errors);
      if (ids.has(choice.id)) errors.push(`${key} has duplicate choice id: ${choice.id}`);
      ids.add(choice.id);
      validateNonEmptyString(choice.label, `${key}.${choice.id}.label`, errors);
      if (typeof choice.label === 'string' && choice.label.length > MAX_CHOICE_LABEL_LENGTH) errors.push(`${key}.${choice.id}.label must be ${MAX_CHOICE_LABEL_LENGTH} characters or fewer`);
      if (!(choice.nextNodeId in nodes)) errors.push(`${key}.${choice.id}.nextNodeId target does not exist: ${choice.nextNodeId}`);
    }
  } else if (node.type === 'player_text_response') {
    validateNonEmptyString(node.prompt, `${key}.prompt`, errors);
    if (!Number.isInteger(node.maxLength) || Number(node.maxLength) < 1 || Number(node.maxLength) > 500) errors.push(`${key}.maxLength must be between 1 and 500`);
    if (!STORAGE_INTENTS.has(String(node.storageIntent))) errors.push(`${key}.storageIntent is unsupported: ${String(node.storageIntent)}`);
    if (!(String(node.nextNodeId) in nodes)) errors.push(`${key}.nextNodeId target does not exist: ${String(node.nextNodeId)}`);
  } else if (node.type === 'close') {
    if (!RETURN_TARGETS.has(String(node.returnTo))) errors.push(`${key}.returnTo must be encounter or board`);
  }
}

function validateGraph(definition: IslandConversationDefinition, errors: string[]): void {
  if (!isObject(definition.nodes) || !(definition.openingNodeId in definition.nodes)) return;
  const reachable = new Set<string>();
  const visit = (nodeId: string, path: Set<string>, depth: number): void => {
    if (depth > MAX_REACHABLE_DEPTH) { errors.push(`conversation path exceeds maximum depth of ${MAX_REACHABLE_DEPTH}`); return; }
    if (path.has(nodeId)) { errors.push(`conversation graph contains a cycle at ${nodeId}`); return; }
    const node = definition.nodes[nodeId];
    if (!node) return;
    reachable.add(nodeId);
    if (node.type === 'close') return;
    const nextIds = getNextNodeIds(node);
    if (nextIds.length === 0) { errors.push(`${nodeId} has no path to a close node`); return; }
    const nextPath = new Set(path).add(nodeId);
    nextIds.forEach((nextId) => visit(nextId, nextPath, depth + 1));
  };
  visit(definition.openingNodeId, new Set(), 1);
  for (const nodeId of Object.keys(definition.nodes)) if (!reachable.has(nodeId)) errors.push(`unreachable node: ${nodeId}`);
}

function getNextNodeIds(node: IslandConversationNode): string[] {
  if (node.type === 'npc') return node.nextNodeId ? [node.nextNodeId] : [];
  if (node.type === 'choice') return node.choices.map((choice) => choice.nextNodeId);
  if (node.type === 'player_text_response') return [node.nextNodeId];
  return [];
}

function rejectUnsafeContent(value: unknown, path: string, errors: string[]): void {
  if (typeof value === 'function') { errors.push(`${path} must not contain functions`); return; }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((item, index) => rejectUnsafeContent(item, `${path}[${index}]`, errors)); return; }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PROHIBITED_FIELDS.has(key)) errors.push(`${path}.${key} is prohibited in inhabitant conversation content`);
    rejectUnsafeContent(child, `${path}.${key}`, errors);
  }
}

function validatePositiveIsland(value: unknown, label: string, errors: string[]): void {
  if (!Number.isInteger(value) || Number(value) <= 0) errors.push(`${label} must be a positive integer`);
}

function validateNonEmptyString(value: unknown, label: string, errors: string[]): void {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${label} must be a non-empty string`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
