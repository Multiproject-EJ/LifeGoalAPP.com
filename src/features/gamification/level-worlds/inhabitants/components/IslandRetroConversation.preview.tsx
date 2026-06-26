import { island001ConversationDefinitions } from '../definitions/island001Conversations';
import { island001InhabitantDefinitions } from '../definitions/island001Inhabitants';
import type { IslandConversationDefinition } from '../islandConversationTypes';
import { IslandRetroConversation, type IslandRetroConversationProps } from './IslandRetroConversation';

const caretaker = island001InhabitantDefinitions[0];
const nextStep = island001ConversationDefinitions[0];

const longTextConversation: IslandConversationDefinition = {
  ...nextStep,
  id: 'I001-preview-long-text',
  title: 'Long text wrapping preview',
  openingNodeId: 'long-text',
  nodes: {
    'long-text': { type: 'npc', id: 'long-text', speakerId: caretaker.id, text: 'A careful caretaker message wraps across the parchment box without becoming tiny, blurry, clipped, or horizontally scrollable.', nextNodeId: 'preview-close' },
    'preview-close': { type: 'close', id: 'preview-close', label: 'Close preview', returnTo: 'encounter' },
  },
};

const textResponseConversation: IslandConversationDefinition = {
  ...nextStep,
  id: 'I001-preview-text-response',
  title: 'Text response preview',
  openingNodeId: 'preview-response',
  nodes: {
    'preview-response': { type: 'player_text_response', id: 'preview-response', prompt: 'Name one small promise you want the island to remember.', placeholder: 'A small promise…', maxLength: 120, storageIntent: 'presentation_only', nextNodeId: 'preview-response-close' },
    'preview-response-close': { type: 'close', id: 'preview-response-close', label: 'Keep it local', returnTo: 'encounter' },
  },
};

export const islandRetroConversationPreviewStates: Array<Pick<IslandRetroConversationProps, 'conversation' | 'initialNodeId' | 'inhabitantSpriteSrc' | 'playerSpriteSrc' | 'typewriterEnabled'> & { label: string }> = [
  { label: 'first NPC node', conversation: nextStep, initialNodeId: 'open-hatchery-waking' },
  { label: 'choice node', conversation: nextStep, initialNodeId: 'hatchery-choice' },
  { label: 'branch response', conversation: nextStep, initialNodeId: 'new-life-remembers' },
  { label: 'close node', conversation: nextStep, initialNodeId: 'return-board' },
  { label: 'missing inhabitant sprite fallback', conversation: nextStep, initialNodeId: 'open-hatchery-waking', playerSpriteSrc: '/assets/player/retro-player.png' },
  { label: 'missing player sprite fallback', conversation: nextStep, initialNodeId: 'open-hatchery-waking', inhabitantSpriteSrc: caretaker.retroSpriteSrc },
  { label: 'long text wrapping', conversation: longTextConversation, initialNodeId: 'long-text' },
  { label: 'reduced-motion/full-text mode', conversation: nextStep, initialNodeId: 'restore-first', typewriterEnabled: false },
  { label: 'optional text response node', conversation: textResponseConversation, initialNodeId: 'preview-response' },
];

export function IslandRetroConversationPreviewFixture({ index = 0 }: { index?: number }) {
  const state = islandRetroConversationPreviewStates[index] ?? islandRetroConversationPreviewStates[0];
  return <IslandRetroConversation isOpen inhabitant={caretaker} {...state} onClose={() => undefined} onExit={() => undefined} />;
}
