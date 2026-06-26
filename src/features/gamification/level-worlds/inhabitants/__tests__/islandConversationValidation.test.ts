import { island001ConversationDefinitions, island001InhabitantTopicDefinitions } from '../definitions/island001Conversations';
import { island001InhabitantDefinitions } from '../definitions/island001Inhabitants';
import { validateIslandConversationDefinition, validateIslandInhabitantContentSet } from '../islandConversationValidation';
import { assert, type TestCase } from '../../services/__tests__/testHarness';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const validConversation = () => clone(island001ConversationDefinitions[0]) as any;
const contentSet = () => ({ inhabitants: clone(island001InhabitantDefinitions) as any, topics: clone(island001InhabitantTopicDefinitions) as any, conversations: clone(island001ConversationDefinitions) as any });

function expectConversationInvalid(mutator: (definition: any) => void, message: string): void {
  const definition = validConversation();
  mutator(definition);
  const result = validateIslandConversationDefinition(definition);
  assert(!result.valid, `Expected invalid conversation for ${message}`);
  assert(result.errors.some((error) => error.includes(message)), `Expected error containing "${message}", received: ${result.errors.join('; ')}`);
}

function expectContentInvalid(mutator: (set: ReturnType<typeof contentSet>) => void, message: string): void {
  const set = contentSet();
  mutator(set);
  const result = validateIslandInhabitantContentSet(set);
  assert(!result.valid, `Expected invalid content for ${message}`);
  assert(result.errors.some((error) => error.includes(message)), `Expected error containing "${message}", received: ${result.errors.join('; ')}`);
}

export const islandConversationValidationTests: TestCase[] = [
  { name: 'all Island 1 conversations pass validation', run: () => island001ConversationDefinitions.forEach((conversation) => assert(validateIslandConversationDefinition(conversation).valid, validateIslandConversationDefinition(conversation).errors.join('; '))) },
  { name: 'unsupported version fails', run: () => expectConversationInvalid((definition) => { definition.version = 2; }, 'version must be 1') },
  { name: 'invalid island number fails', run: () => expectConversationInvalid((definition) => { definition.islandNumber = 0; }, 'positive integer') },
  { name: 'empty inhabitant ID fails', run: () => expectConversationInvalid((definition) => { definition.inhabitantId = ''; }, 'inhabitantId must be a non-empty string') },
  { name: 'duplicate inhabitant ID fails', run: () => expectContentInvalid((set) => { set.inhabitants.push({ ...set.inhabitants[0] }); }, 'duplicate inhabitant id') },
  { name: 'missing default topic fails', run: () => expectContentInvalid((set) => { set.inhabitants[0].defaultTopicIds = ['missing']; }, 'default topic does not exist') },
  { name: 'topic references unknown conversation fails', run: () => expectContentInvalid((set) => { set.topics[0].conversationId = 'missing'; }, 'unknown conversation') },
  { name: 'conversation references unknown inhabitant fails', run: () => expectContentInvalid((set) => { set.conversations[0].inhabitantId = 'missing'; }, 'unknown inhabitant') },
  { name: 'island mismatch fails', run: () => expectContentInvalid((set) => { set.conversations[0].islandNumber = 2; }, 'must match inhabitant islandNumber') },
  { name: 'missing opening node fails', run: () => expectConversationInvalid((definition) => { definition.openingNodeId = 'missing'; }, 'openingNodeId does not exist') },
  { name: 'unknown node type fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'].type = 'quest'; }, 'unsupported node type') },
  { name: 'node key ID mismatch fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'].id = 'other'; }, 'key/id mismatch') },
  { name: 'empty NPC text fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'].text = ''; }, 'text must be a non-empty string') },
  { name: 'NPC text over 180 characters fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'].text = 'x'.repeat(181); }, '180 characters or fewer') },
  { name: 'missing nextNodeId target fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'].nextNodeId = 'missing'; }, 'target does not exist') },
  { name: 'choice with fewer than two items fails', run: () => expectConversationInvalid((definition) => { definition.nodes['hatchery-choice'].choices = [definition.nodes['hatchery-choice'].choices[0]]; }, 'between 2 and 4') },
  { name: 'choice with more than four items fails', run: () => expectConversationInvalid((definition) => { definition.nodes['hatchery-choice'].choices = [1, 2, 3, 4, 5].map((index) => ({ id: `c${index}`, label: `Choice ${index}`, nextNodeId: 'return-board' })); }, 'between 2 and 4') },
  { name: 'duplicate choice ID fails', run: () => expectConversationInvalid((definition) => { definition.nodes['hatchery-choice'].choices[1].id = definition.nodes['hatchery-choice'].choices[0].id; }, 'duplicate choice id') },
  { name: 'choice label over 70 characters fails', run: () => expectConversationInvalid((definition) => { definition.nodes['hatchery-choice'].choices[0].label = 'x'.repeat(71); }, '70 characters or fewer') },
  { name: 'invalid close target fails', run: () => expectConversationInvalid((definition) => { definition.nodes['return-board'].returnTo = 'shop'; }, 'returnTo must be encounter or board') },
  { name: 'invalid text-response max length fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'] = { type: 'player_text_response', id: 'restore-first', prompt: 'Say it', maxLength: 0, nextNodeId: 'hatchery-choice', storageIntent: 'presentation_only' }; }, 'maxLength must be between 1 and 500') },
  { name: 'invalid storage intent fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'] = { type: 'player_text_response', id: 'restore-first', prompt: 'Say it', maxLength: 100, nextNodeId: 'hatchery-choice', storageIntent: 'save_to_profile' }; }, 'storageIntent is unsupported') },
  { name: 'unreachable node fails', run: () => expectConversationInvalid((definition) => { definition.nodes.unused = { type: 'close', id: 'unused', returnTo: 'encounter' }; }, 'unreachable node') },
  { name: 'cycle fails', run: () => expectConversationInvalid((definition) => { definition.nodes['return-board'] = { type: 'npc', id: 'return-board', speakerId: 'luma-caretaker', text: 'Again', nextNodeId: 'restore-first' }; }, 'cycle') },
  { name: 'path without close fails', run: () => expectConversationInvalid((definition) => { delete definition.nodes['return-board']; definition.nodes['new-life-remembers'].nextNodeId = undefined; definition.nodes['gentle-lights'].nextNodeId = undefined; }, 'no path to a close node') },
  { name: 'path deeper than six nodes fails', run: () => expectConversationInvalid((definition) => { definition.openingNodeId = 'n1'; definition.nodes = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [`n${i}`, i === 7 ? { type: 'close', id: `n${i}`, returnTo: 'board' } : { type: 'npc', id: `n${i}`, speakerId: 'luma-caretaker', text: `Node ${i}`, nextNodeId: `n${i + 1}` }])); }, 'maximum depth') },
  { name: 'sample paths terminate', run: () => island001ConversationDefinitions.forEach((conversation) => assert(validateIslandConversationDefinition(conversation).valid, `${conversation.id} should terminate`)) },
  ...['reward', 'essence', 'dice', 'tileIndex', 'build', 'resolveBoss', 'travel', 'actionId'].map((field) => ({ name: `${field} field fails`, run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'][field] = true; }, `${field} is prohibited`) })),
  { name: 'callback function fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'].callback = () => undefined; }, 'callback is prohibited') },
  { name: 'nested prohibited field fails', run: () => expectConversationInvalid((definition) => { definition.nodes['restore-first'].nested = { rewards: [] }; }, 'rewards is prohibited') },
];
