import type { IslandConversationDefinition, IslandInhabitantTopicDefinition } from './islandConversationTypes';
import type { IslandInhabitantDefinition } from './islandInhabitantTypes';

export type IslandInhabitantFlowLayer =
  | { kind: 'encounter' }
  | { kind: 'conversation'; topicId: string; conversationId: string }
  | { kind: 'error'; message: string; topicId?: string };

export type IslandInhabitantTopicResolution =
  | { ok: true; layer: Extract<IslandInhabitantFlowLayer, { kind: 'conversation' }>; conversation: IslandConversationDefinition }
  | { ok: false; layer: Extract<IslandInhabitantFlowLayer, { kind: 'error' }> };

export function createInitialIslandInhabitantFlowLayer(
  inhabitant: IslandInhabitantDefinition,
  topics: IslandInhabitantTopicDefinition[],
  conversations: IslandConversationDefinition[],
): IslandInhabitantFlowLayer {
  if (!inhabitant?.id) return { kind: 'error', message: 'This inhabitant is missing required content.' };
  const validTopic = topics.some((topic) => topic.inhabitantId === inhabitant.id && topic.islandNumber === inhabitant.islandNumber);
  const validConversation = conversations.some((conversation) => conversation.inhabitantId === inhabitant.id && conversation.islandNumber === inhabitant.islandNumber);
  if (!validTopic || !validConversation) return { kind: 'error', message: 'This inhabitant does not have conversation content ready yet.' };
  return { kind: 'encounter' };
}

export function resolveIslandInhabitantTopicConversation(
  inhabitant: IslandInhabitantDefinition,
  topics: IslandInhabitantTopicDefinition[],
  conversations: IslandConversationDefinition[],
  topic: IslandInhabitantTopicDefinition,
): IslandInhabitantTopicResolution {
  const registeredTopic = topics.find((candidate) => candidate.id === topic.id);
  if (!registeredTopic || registeredTopic.inhabitantId !== inhabitant.id || registeredTopic.islandNumber !== inhabitant.islandNumber) {
    return { ok: false, layer: { kind: 'error', topicId: topic.id, message: 'That topic is not available for this inhabitant.' } };
  }
  const conversation = conversations.find((candidate) => candidate.id === registeredTopic.conversationId);
  if (!conversation) {
    return { ok: false, layer: { kind: 'error', topicId: registeredTopic.id, message: 'That conversation is not ready yet.' } };
  }
  if (conversation.islandNumber !== inhabitant.islandNumber) {
    return { ok: false, layer: { kind: 'error', topicId: registeredTopic.id, message: 'That conversation belongs to a different island.' } };
  }
  if (conversation.inhabitantId !== inhabitant.id) {
    return { ok: false, layer: { kind: 'error', topicId: registeredTopic.id, message: 'That conversation belongs to a different inhabitant.' } };
  }
  return { ok: true, conversation, layer: { kind: 'conversation', topicId: registeredTopic.id, conversationId: conversation.id } };
}
