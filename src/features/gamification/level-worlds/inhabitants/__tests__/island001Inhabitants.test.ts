import { island001ConversationDefinitions, island001InhabitantTopicDefinitions } from '../definitions/island001Conversations';
import { island001InhabitantDefinitions } from '../definitions/island001Inhabitants';
import { getIslandConversationDefinition, getIslandInhabitantDefinition, getIslandInhabitants, getIslandInhabitantTopics } from '../islandInhabitantRegistry';
import { validateIslandInhabitantContentSet, validateIslandInhabitantDefinition } from '../islandConversationValidation';
import { assert, assertDeepEqual, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

export const island001InhabitantTests: TestCase[] = [
  { name: 'Island 1 inhabitant passes validation', run: () => assert(validateIslandInhabitantDefinition(island001InhabitantDefinitions[0]).valid, validateIslandInhabitantDefinition(island001InhabitantDefinitions[0]).errors.join('; ')) },
  { name: 'Island 1 content set passes validation', run: () => assert(validateIslandInhabitantContentSet({ inhabitants: island001InhabitantDefinitions, topics: island001InhabitantTopicDefinitions, conversations: island001ConversationDefinitions }).valid, validateIslandInhabitantContentSet({ inhabitants: island001InhabitantDefinitions, topics: island001InhabitantTopicDefinitions, conversations: island001ConversationDefinitions }).errors.join('; ')) },
  { name: 'registry returns Island 1 caretaker', run: () => assertEqual(getIslandInhabitantDefinition('luma-caretaker')?.displayName, 'Caretaker', 'Expected Island 1 caretaker') },
  { name: 'registry returns three ordered topics', run: () => assertDeepEqual(getIslandInhabitantTopics(1, 'luma-caretaker').map((topic) => topic.id), ['i001-topic-next-step', 'i001-topic-luma-isle', 'i001-topic-caretaker'], 'Expected ordered Island 1 topics') },
  { name: 'registry returns each conversation', run: () => island001ConversationDefinitions.forEach((conversation) => assertEqual(getIslandConversationDefinition(conversation.id)?.id, conversation.id, `Expected ${conversation.id}`)) },
  { name: 'unknown inhabitant returns undefined', run: () => assertEqual(getIslandInhabitantDefinition('unknown'), undefined, 'Expected unknown inhabitant to be undefined') },
  { name: 'unknown conversation returns undefined', run: () => assertEqual(getIslandConversationDefinition('unknown'), undefined, 'Expected unknown conversation to be undefined') },
  { name: 'Island 2 returns no inhabitants', run: () => assertDeepEqual(getIslandInhabitants(2), [], 'Expected no Island 2 inhabitants') },
  { name: 'servant wizard remains within The Lumin', run: () => assertEqual(island001InhabitantDefinitions[0].civilizationName, 'The Lumin', 'Expected The Lumin civilization') },
];
