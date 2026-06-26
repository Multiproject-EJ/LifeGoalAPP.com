import React from 'react';
import { island001ConversationDefinitions, island001InhabitantTopicDefinitions } from '../definitions/island001Conversations';
import { island001InhabitantDefinitions } from '../definitions/island001Inhabitants';
import type { IslandConversationDefinition } from '../islandConversationTypes';
import type { IslandInhabitantDefinition } from '../islandInhabitantTypes';
import { IslandInhabitantFlow, type IslandInhabitantFlowProps } from './IslandInhabitantFlow';

const caretaker = island001InhabitantDefinitions[0];
const topics = island001InhabitantTopicDefinitions;
const conversations = island001ConversationDefinitions;
const fireInhabitant: IslandInhabitantDefinition = { ...caretaker, id: 'fire-caretaker-preview', biome: 'fire', displayName: 'Ember Caretaker', islandNumber: 1 };
const fireTopics = topics.map((topic) => ({ ...topic, id: topic.id.replace('i001', 'fire'), inhabitantId: fireInhabitant.id, conversationId: topic.conversationId.replace('I001', 'FIRE') }));
const fireConversations: IslandConversationDefinition[] = conversations.map((conversation) => ({ ...conversation, id: conversation.id.replace('I001', 'FIRE'), inhabitantId: fireInhabitant.id }));
const missingConversationTopics = [{ ...topics[0], conversationId: 'missing-conversation-preview' }];

export const islandInhabitantFlowPreviewStates: Array<Partial<IslandInhabitantFlowProps> & { label: string }> = [
  { label: 'Initial premium encounter' },
  { label: 'First topic selected → retro conversation', initialLayer: { kind: 'conversation', topicId: topics[0].id, conversationId: topics[0].conversationId } },
  { label: 'Retro conversation returns to encounter', initialLayer: { kind: 'encounter' } },
  { label: 'Conversation returns to board', initialLayer: { kind: 'conversation', topicId: topics[0].id, conversationId: topics[0].conversationId } },
  { label: 'Missing conversation error', topics: missingConversationTopics, initialLayer: { kind: 'error', topicId: topics[0].id, message: 'That conversation is not ready yet.' } },
  { label: 'Missing character art fallback', characterArtSrc: undefined },
  { label: 'Missing retro sprite fallback', inhabitant: { ...caretaker, retroSpriteSrc: undefined } },
  { label: 'Completed/discussed topic marker', initialLayer: { kind: 'encounter' } },
  { label: 'Fire biome flow', inhabitant: fireInhabitant, topics: fireTopics, conversations: fireConversations },
  { label: 'Reduced-motion transition', initialLayer: { kind: 'encounter' } },
  { label: 'Switching inhabitants while open resets flow', inhabitant: { ...caretaker, id: 'switch-preview', displayName: 'Switched Caretaker' } },
  { label: 'Small-phone constrained-height flow', islandStatusLabel: 'Small-phone constrained-height flow' },
];

export function IslandInhabitantFlowPreviewFixture({ index = 0 }: { index?: number }) {
  const state = islandInhabitantFlowPreviewStates[index] ?? islandInhabitantFlowPreviewStates[0];
  return <IslandInhabitantFlow isOpen inhabitant={caretaker} topics={topics} conversations={conversations} greeting="Welcome, traveller. Choose what you would like to ask." backgroundArtSrc="/assets/islands/island-001/preview-background.webp" playerSpriteSrc="/assets/player/retro-player.png" islandName="Luma Isle" islandStatusLabel="Island 1 reusable two-stage communication flow" {...state} onClose={() => undefined} />;
}
