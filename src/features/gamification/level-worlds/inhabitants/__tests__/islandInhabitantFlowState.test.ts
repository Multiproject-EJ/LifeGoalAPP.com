import { assert, assertDeepEqual, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import { island001ConversationDefinitions, island001InhabitantTopicDefinitions } from '../definitions/island001Conversations';
import { island001InhabitantDefinitions } from '../definitions/island001Inhabitants';
import { createInitialIslandInhabitantFlowLayer, resolveIslandInhabitantTopicConversation } from '../islandInhabitantFlowState';

const caretaker = island001InhabitantDefinitions[0];
const topics = island001InhabitantTopicDefinitions;
const conversations = island001ConversationDefinitions;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const islandInhabitantFlowStateTests: TestCase[] = [
  { name: 'opens at encounter layer with usable content', run: () => assertDeepEqual(createInitialIslandInhabitantFlowLayer(caretaker, topics, conversations), { kind: 'encounter' }, 'Expected encounter') },
  { name: 'missing topics creates safe error', run: () => assertEqual(createInitialIslandInhabitantFlowLayer(caretaker, [], conversations).kind, 'error', 'Expected error') },
  { name: 'missing conversations creates safe error', run: () => assertEqual(createInitialIslandInhabitantFlowLayer(caretaker, topics, []).kind, 'error', 'Expected error') },
  { name: 'selecting a valid topic resolves the correct conversation and selected topic ID is retained', run: () => { const result = resolveIslandInhabitantTopicConversation(caretaker, topics, conversations, topics[1]); assert(result.ok, 'Expected ok'); if (result.ok) { assertEqual(result.layer.topicId, topics[1].id, 'Expected topic id'); assertEqual(result.conversation.id, topics[1].conversationId, 'Expected conversation id'); } } },
  { name: 'conversation island must match inhabitant island', run: () => { const mismatched = [{ ...conversations[0], islandNumber: 2 }]; const result = resolveIslandInhabitantTopicConversation(caretaker, [topics[0]], mismatched, topics[0]); assertEqual(result.ok, false, 'Expected rejection'); if (!result.ok) assert(result.layer.message.includes('different island'), 'Expected island error'); } },
  { name: 'conversation inhabitant must match inhabitant', run: () => { const mismatched = [{ ...conversations[0], inhabitantId: 'other' }]; const result = resolveIslandInhabitantTopicConversation(caretaker, [topics[0]], mismatched, topics[0]); assertEqual(result.ok, false, 'Expected rejection'); if (!result.ok) assert(result.layer.message.includes('different inhabitant'), 'Expected inhabitant error'); } },
  { name: 'missing conversation produces safe error state', run: () => { const result = resolveIslandInhabitantTopicConversation(caretaker, [{ ...topics[0], conversationId: 'missing' }], conversations, { ...topics[0], conversationId: 'missing' }); assertEqual(result.ok, false, 'Expected missing error'); if (!result.ok) assert(result.layer.message.includes('not ready'), 'Expected not ready'); } },
  { name: 'unknown topic is rejected safely', run: () => { const result = resolveIslandInhabitantTopicConversation(caretaker, topics, conversations, { ...topics[0], id: 'unknown' }); assertEqual(result.ok, false, 'Expected rejected'); if (!result.ok) assert(result.layer.message.includes('not available'), 'Expected unavailable'); } },
  { name: 'topic and conversation definitions remain unmodified', run: () => { const topicCopy = clone(topics); const conversationCopy = clone(conversations); resolveIslandInhabitantTopicConversation(caretaker, topics, conversations, topics[0]); assertDeepEqual(topics, topicCopy, 'Expected topics unchanged'); assertDeepEqual(conversations, conversationCopy, 'Expected conversations unchanged'); } },
];
