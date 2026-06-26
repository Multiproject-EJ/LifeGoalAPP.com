import type {
  IslandConversationDefinition,
  IslandConversationNode,
} from './islandConversationTypes';

export type IslandConversationNpcNode = Extract<IslandConversationNode, { type: 'npc' }>;
export type IslandConversationChoiceNode = Extract<IslandConversationNode, { type: 'choice' }>;
export type IslandConversationTextResponseNode = Extract<IslandConversationNode, { type: 'player_text_response' }>;

export function getConversationNode(
  conversation: IslandConversationDefinition,
  nodeId: string,
): IslandConversationNode | undefined {
  return conversation.nodes[nodeId];
}

export function resolveConversationStartNode(
  conversation: IslandConversationDefinition,
  initialNodeId?: string,
): IslandConversationNode {
  return getConversationNode(conversation, initialNodeId ?? conversation.openingNodeId)
    ?? getConversationNode(conversation, conversation.openingNodeId)
    ?? firstConversationNode(conversation);
}

export function advanceNpcNode(
  conversation: IslandConversationDefinition,
  node: IslandConversationNpcNode,
): IslandConversationNode | null {
  if (!node.nextNodeId) return null;
  return getConversationNode(conversation, node.nextNodeId) ?? null;
}

export function chooseConversationOption(
  conversation: IslandConversationDefinition,
  node: IslandConversationChoiceNode,
  choiceId: string,
): { choiceId: string; nextNode: IslandConversationNode } {
  const choice = node.choices.find((item) => item.id === choiceId);
  if (!choice) throw new Error(`Unknown conversation choice: ${choiceId}`);
  const nextNode = getConversationNode(conversation, choice.nextNodeId);
  if (!nextNode) throw new Error(`Conversation choice target does not exist: ${choice.nextNodeId}`);
  return { choiceId: choice.id, nextNode };
}

export function submitConversationTextResponse(
  conversation: IslandConversationDefinition,
  node: IslandConversationTextResponseNode,
  value: string,
): IslandConversationNode {
  void value;
  const nextNode = getConversationNode(conversation, node.nextNodeId);
  if (!nextNode) throw new Error(`Conversation text response target does not exist: ${node.nextNodeId}`);
  return nextNode;
}

function firstConversationNode(conversation: IslandConversationDefinition): IslandConversationNode {
  const firstNode = Object.values(conversation.nodes)[0];
  if (!firstNode) throw new Error(`Conversation has no nodes: ${conversation.id}`);
  return firstNode;
}
