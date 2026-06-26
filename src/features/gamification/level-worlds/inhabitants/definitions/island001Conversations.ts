import type { IslandConversationDefinition, IslandInhabitantTopicDefinition } from '../islandConversationTypes';

export const island001InhabitantTopicDefinitions: IslandInhabitantTopicDefinition[] = [
  { id: 'i001-topic-next-step', islandNumber: 1, inhabitantId: 'luma-caretaker', label: 'What should I do next?', iconId: 'compass', conversationId: 'I001-C01-next-step', order: 1 },
  { id: 'i001-topic-luma-isle', islandNumber: 1, inhabitantId: 'luma-caretaker', label: 'Tell me about Luma Isle.', iconId: 'book', conversationId: 'I001-C02-luma-isle', order: 2 },
  { id: 'i001-topic-caretaker', islandNumber: 1, inhabitantId: 'luma-caretaker', label: 'Who are you?', iconId: 'inhabitant', conversationId: 'I001-C03-caretaker', order: 3 },
];

export const island001ConversationDefinitions: IslandConversationDefinition[] = [
  {
    version: 1,
    id: 'I001-C01-next-step',
    islandNumber: 1,
    inhabitantId: 'luma-caretaker',
    title: 'What should I do next?',
    openingNodeId: 'open-hatchery-waking',
    nodes: {
      'open-hatchery-waking': { type: 'npc', id: 'open-hatchery-waking', speakerId: 'luma-caretaker', text: 'The Hatchery is waking…', nextNodeId: 'restore-first' },
      'restore-first': { type: 'npc', id: 'restore-first', speakerId: 'luma-caretaker', text: 'Restore it first, and the island will answer.', nextNodeId: 'hatchery-choice' },
      'hatchery-choice': { type: 'choice', id: 'hatchery-choice', prompt: 'How do you answer?', choices: [
        { id: 'why-hatchery', label: 'Why the Hatchery?', nextNodeId: 'new-life-remembers' },
        { id: 'begin-there', label: 'I’ll begin there.', nextNodeId: 'gentle-lights' },
      ] },
      'new-life-remembers': { type: 'npc', id: 'new-life-remembers', speakerId: 'luma-caretaker', text: 'New life remembers how the island once felt.', nextNodeId: 'return-board' },
      'gentle-lights': { type: 'npc', id: 'gentle-lights', speakerId: 'luma-caretaker', text: 'Then follow the gentle lights. They know the way.', nextNodeId: 'return-board' },
      'return-board': { type: 'close', id: 'return-board', label: 'Return to the island', returnTo: 'board' },
    },
  },
  {
    version: 1,
    id: 'I001-C02-luma-isle',
    islandNumber: 1,
    inhabitantId: 'luma-caretaker',
    title: 'Tell me about Luma Isle.',
    openingNodeId: 'five-places',
    nodes: {
      'five-places': { type: 'npc', id: 'five-places', speakerId: 'luma-caretaker', text: 'Luma Isle was built around five places of trust.', nextNodeId: 'places-closed' },
      'places-closed': { type: 'npc', id: 'places-closed', speakerId: 'luma-caretaker', text: 'When fear spread, each place closed itself away.', nextNodeId: 'luma-choice' },
      'luma-choice': { type: 'choice', id: 'luma-choice', prompt: 'What would you like to know?', choices: [
        { id: 'open-again', label: 'Can they open again?', nextNodeId: 'acts-of-trust' },
        { id: 'noctyra', label: 'What happened to Noctyra?', nextNodeId: 'noctyra-guards' },
      ] },
      'acts-of-trust': { type: 'npc', id: 'acts-of-trust', speakerId: 'luma-caretaker', text: 'Small acts of trust can wake them, one by one.', nextNodeId: 'continue-encounter' },
      'noctyra-guards': { type: 'npc', id: 'noctyra-guards', speakerId: 'luma-caretaker', text: 'She still guards us. She simply cannot hear that the danger has passed.', nextNodeId: 'continue-encounter' },
      'continue-encounter': { type: 'close', id: 'continue-encounter', label: 'Continue', returnTo: 'encounter' },
    },
  },
  {
    version: 1,
    id: 'I001-C03-caretaker',
    islandNumber: 1,
    inhabitantId: 'luma-caretaker',
    title: 'Who are you?',
    openingNodeId: 'paths-between-lights',
    nodes: {
      'paths-between-lights': { type: 'npc', id: 'paths-between-lights', speakerId: 'luma-caretaker', text: 'We are caretakers of the paths between the five lights.', nextNodeId: 'hats-hide-faces' },
      'hats-hide-faces': { type: 'npc', id: 'hats-hide-faces', speakerId: 'luma-caretaker', text: 'Our hats hide our faces, but not our work.', nextNodeId: 'caretaker-choice' },
      'caretaker-choice': { type: 'choice', id: 'caretaker-choice', prompt: 'What do you ask?', choices: [
        { id: 'lumin', label: 'Are you one of The Lumin?', nextNodeId: 'lumin-tend' },
        { id: 'all-islands', label: 'Do all islands have caretakers?', nextNodeId: 'helpers-differ' },
      ] },
      'lumin-tend': { type: 'npc', id: 'lumin-tend', speakerId: 'luma-caretaker', text: 'Yes. The Lumin tend places, memories, and one another.', nextNodeId: 'return-encounter' },
      'helpers-differ': { type: 'npc', id: 'helpers-differ', speakerId: 'luma-caretaker', text: 'Every island keeps its helpers differently. We listen for the same quiet call.', nextNodeId: 'return-encounter' },
      'return-encounter': { type: 'close', id: 'return-encounter', label: 'Return', returnTo: 'encounter' },
    },
  },
];
