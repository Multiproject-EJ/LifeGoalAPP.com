import { island001ConversationDefinitions, island001InhabitantTopicDefinitions } from './definitions/island001Conversations';
import { island001InhabitantDefinitions } from './definitions/island001Inhabitants';
import type { IslandConversationDefinition, IslandInhabitantTopicDefinition } from './islandConversationTypes';
import type { IslandInhabitantDefinition } from './islandInhabitantTypes';

const ISLAND_INHABITANTS: readonly IslandInhabitantDefinition[] = island001InhabitantDefinitions;
const ISLAND_CONVERSATIONS: readonly IslandConversationDefinition[] = island001ConversationDefinitions;
const ISLAND_TOPICS: readonly IslandInhabitantTopicDefinition[] = island001InhabitantTopicDefinitions;

export function getIslandInhabitantDefinition(inhabitantId: string): IslandInhabitantDefinition | undefined {
  return ISLAND_INHABITANTS.find((inhabitant) => inhabitant.id === inhabitantId);
}

export function getIslandInhabitants(islandNumber: number): IslandInhabitantDefinition[] {
  return ISLAND_INHABITANTS.filter((inhabitant) => inhabitant.islandNumber === islandNumber);
}

export function getIslandConversationDefinition(conversationId: string): IslandConversationDefinition | undefined {
  return ISLAND_CONVERSATIONS.find((conversation) => conversation.id === conversationId);
}

export function getIslandInhabitantTopics(islandNumber: number, inhabitantId: string): IslandInhabitantTopicDefinition[] {
  return ISLAND_TOPICS
    .filter((topic) => topic.islandNumber === islandNumber && topic.inhabitantId === inhabitantId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function getAllIslandInhabitantDefinitions(): IslandInhabitantDefinition[] {
  return [...ISLAND_INHABITANTS];
}

export function getAllIslandConversationDefinitions(): IslandConversationDefinition[] {
  return [...ISLAND_CONVERSATIONS];
}

export function getAllIslandInhabitantTopicDefinitions(): IslandInhabitantTopicDefinition[] {
  return [...ISLAND_TOPICS];
}
