export type IslandConversationSpeakerId = 'player' | string;
export type IslandConversationReturnTarget = 'encounter' | 'board';
export type IslandConversationStorageIntent = 'presentation_only' | 'defer_to_compass' | 'defer_to_reflection';

export type IslandConversationNode =
  | { type: 'npc'; id: string; speakerId: IslandConversationSpeakerId; text: string; nextNodeId?: string }
  | { type: 'choice'; id: string; prompt: string; choices: Array<{ id: string; label: string; nextNodeId: string }> }
  | { type: 'player_text_response'; id: string; prompt: string; placeholder?: string; maxLength: number; nextNodeId: string; storageIntent: IslandConversationStorageIntent }
  | { type: 'close'; id: string; label?: string; returnTo: IslandConversationReturnTarget };

export interface IslandConversationDefinition {
  version: 1;
  id: string;
  islandNumber: number;
  inhabitantId: string;
  title: string;
  openingNodeId: string;
  nodes: Record<string, IslandConversationNode>;
}

export interface IslandInhabitantTopicDefinition {
  id: string;
  islandNumber: number;
  inhabitantId: string;
  label: string;
  iconId?: string;
  conversationId: string;
  order: number;
}
