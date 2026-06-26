import { assert, assertDeepEqual, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import { island001ConversationDefinitions } from '../definitions/island001Conversations';
import type { IslandConversationDefinition } from '../islandConversationTypes';
import { advanceNpcNode, chooseConversationOption, resolveConversationStartNode, submitConversationTextResponse } from '../islandConversationTraversal';

const conversation = island001ConversationDefinitions[0];
const textResponseConversation: IslandConversationDefinition = {
  version: 1, id: 'text', islandNumber: 1, inhabitantId: 'luma-caretaker', title: 'Text', openingNodeId: 'text-node',
  nodes: {
    'text-node': { type: 'player_text_response', id: 'text-node', prompt: 'Say it', maxLength: 10, storageIntent: 'presentation_only', nextNodeId: 'done' },
    done: { type: 'close', id: 'done', returnTo: 'encounter' },
  },
};

function reachesClose(definition: IslandConversationDefinition): boolean {
  const stack = [resolveConversationStartNode(definition)];
  const seen = new Set<string>();
  while (stack.length) {
    const node = stack.pop();
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);
    if (node.type === 'close') return true;
    if (node.type === 'npc') { const next = advanceNpcNode(definition, node); if (next) stack.push(next); }
    if (node.type === 'choice') node.choices.forEach((choice) => stack.push(definition.nodes[choice.nextNodeId]));
    if (node.type === 'player_text_response') stack.push(submitConversationTextResponse(definition, node, 'local'));
  }
  return false;
}

export const islandConversationTraversalTests: TestCase[] = [
  { name: 'resolves opening node', run: () => assertEqual(resolveConversationStartNode(conversation).id, conversation.openingNodeId, 'Expected opening node') },
  { name: 'uses valid initialNodeId', run: () => assertEqual(resolveConversationStartNode(conversation, 'hatchery-choice').id, 'hatchery-choice', 'Expected requested initial node') },
  { name: 'falls back from invalid initialNodeId', run: () => assertEqual(resolveConversationStartNode(conversation, 'missing').id, conversation.openingNodeId, 'Expected opening fallback') },
  { name: 'NPC node advances to next node', run: () => { const node = conversation.nodes['open-hatchery-waking']; if (node.type !== 'npc') throw new Error('Expected NPC'); assertEqual(advanceNpcNode(conversation, node)?.id, 'restore-first', 'Expected next node'); } },
  { name: 'NPC node without next safely completes as null', run: () => assertEqual(advanceNpcNode(conversation, { type: 'npc', id: 'x', speakerId: 'luma-caretaker', text: 'Done' }), null, 'Expected null') },
  { name: 'valid choice resolves correct target', run: () => { const node = conversation.nodes['hatchery-choice']; if (node.type !== 'choice') throw new Error('Expected choice'); const result = chooseConversationOption(conversation, node, 'why-hatchery'); assertEqual(result.nextNode.id, 'new-life-remembers', 'Expected branch target'); } },
  { name: 'unknown choice ID fails safely', run: () => { const node = conversation.nodes['hatchery-choice']; if (node.type !== 'choice') throw new Error('Expected choice'); let failed = false; try { chooseConversationOption(conversation, node, 'unknown'); } catch { failed = true; } assert(failed, 'Expected unknown choice to throw'); } },
  { name: 'text response resolves target', run: () => { const node = textResponseConversation.nodes['text-node']; if (node.type !== 'player_text_response') throw new Error('Expected text node'); assertEqual(submitConversationTextResponse(textResponseConversation, node, 'hello').id, 'done', 'Expected close target'); } },
  { name: 'conversation definition remains unmodified', run: () => { const before = JSON.parse(JSON.stringify(conversation)); const start = resolveConversationStartNode(conversation); if (start.type === 'npc') advanceNpcNode(conversation, start); assertDeepEqual(conversation, before, 'Traversal must not mutate definitions'); } },
  { name: 'every sample conversation can traverse to a close node', run: () => island001ConversationDefinitions.forEach((definition) => assert(reachesClose(definition), `${definition.id} should reach a close node`)) },
];
