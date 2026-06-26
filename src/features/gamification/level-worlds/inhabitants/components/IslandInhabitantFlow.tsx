import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../../utils/scrollLock';
import type { IslandConversationDefinition, IslandInhabitantTopicDefinition } from '../islandConversationTypes';
import { createInitialIslandInhabitantFlowLayer, resolveIslandInhabitantTopicConversation, type IslandInhabitantFlowLayer } from '../islandInhabitantFlowState';
import type { IslandInhabitantDefinition } from '../islandInhabitantTypes';
import { IslandInhabitantEncounter } from './IslandInhabitantEncounter';
import { IslandRetroConversation, type IslandRetroConversationResult } from './IslandRetroConversation';
import './IslandInhabitantFlow.css';

export type IslandInhabitantFlowCloseReason = 'user_closed' | 'conversation_returned_to_board' | 'missing_content';

// conversation result shape marker: conversationId: string
export type IslandInhabitantFlowResult = {
  inhabitantId: string;
  closeReason: IslandInhabitantFlowCloseReason;
  lastTopicId?: string;
  conversationResult?: IslandRetroConversationResult;
};

export type IslandInhabitantFlowProps = {
  isOpen: boolean;
  inhabitant: IslandInhabitantDefinition;
  topics: IslandInhabitantTopicDefinition[];
  conversations: IslandConversationDefinition[];
  greeting?: string;
  characterArtSrc?: string;
  backgroundArtSrc?: string;
  playerSpriteSrc?: string;
  sceneBackgroundSrc?: string;
  islandName?: string;
  islandStatusLabel?: string;
  islandEmblemSrc?: string;
  initialLayer?: IslandInhabitantFlowLayer;
  onClose: (result: IslandInhabitantFlowResult) => void;
};

let islandInhabitantFlowId = 0;
function useStableId(prefix: string) {
  const idRef = React.useRef<string>();
  if (!idRef.current) idRef.current = `${prefix}-${++islandInhabitantFlowId}`;
  return idRef.current;
}

export function IslandInhabitantFlow({
  isOpen, inhabitant, topics, conversations, greeting, characterArtSrc, backgroundArtSrc,
  playerSpriteSrc, sceneBackgroundSrc, islandName, islandStatusLabel, islandEmblemSrc, initialLayer, onClose,
}: IslandInhabitantFlowProps): React.JSX.Element | null {
  const titleId = useStableId('island-inhabitant-flow-title');
  const descriptionId = useStableId('island-inhabitant-flow-description');
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);
  const [layer, setLayer] = React.useState<IslandInhabitantFlowLayer>(() => initialLayer ?? { kind: 'encounter' });
  const [lastTopicId, setLastTopicId] = React.useState<string | undefined>();
  const [conversationResult, setConversationResult] = React.useState<IslandRetroConversationResult | undefined>();
  const [discussedTopicIds, setDiscussedTopicIds] = React.useState<string[]>([]);

  const resetFlow = React.useCallback(() => {
    setLayer(initialLayer ?? createInitialIslandInhabitantFlowLayer(inhabitant, topics, conversations));
    setLastTopicId(undefined);
    setConversationResult(undefined);
    setDiscussedTopicIds([]);
  }, [initialLayer, inhabitant, topics, conversations]);

  React.useEffect(() => { if (isOpen) resetFlow(); }, [isOpen, inhabitant.id, topics, conversations, resetFlow]);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = lockPageScroll(['body', 'documentElement']);
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => { releaseScroll(); lastFocusedRef.current?.focus?.(); };
  }, [isOpen, inhabitant.id]);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (layer.kind === 'conversation') { setLayer({ kind: 'encounter' }); return; }
      onClose({ inhabitantId: inhabitant.id, closeReason: layer.kind === 'error' ? 'missing_content' : 'user_closed', lastTopicId, conversationResult });
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, layer, inhabitant.id, lastTopicId, conversationResult, onClose]);

  if (!isOpen) return null;

  const selectedConversation = layer.kind === 'conversation' ? conversations.find((item) => item.id === layer.conversationId) : undefined;
  const handleSelectTopic = (topic: IslandInhabitantTopicDefinition) => {
    const resolution = resolveIslandInhabitantTopicConversation(inhabitant, topics, conversations, topic);
    setLastTopicId(topic.id);
    setLayer(resolution.layer);
  };
  const handleEncounterClose = () => onClose({ inhabitantId: inhabitant.id, closeReason: 'user_closed', lastTopicId, conversationResult });
  const handleConversationClose = (result: IslandRetroConversationResult) => {
    setConversationResult(result);
    if (result.returnTo === 'board') {
      onClose({ inhabitantId: inhabitant.id, closeReason: 'conversation_returned_to_board', lastTopicId: layer.kind === 'conversation' ? layer.topicId : lastTopicId, conversationResult: result });
      return;
    }
    const topicId = layer.kind === 'conversation' ? layer.topicId : lastTopicId;
    if (topicId) setDiscussedTopicIds((current) => current.includes(topicId) ? current : [...current, topicId]);
    setLayer({ kind: 'encounter' });
  };
  const handleErrorClose = () => onClose({ inhabitantId: inhabitant.id, closeReason: 'missing_content', lastTopicId, conversationResult });

  const layerTitle = layer.kind === 'conversation' ? 'Conversation' : layer.kind === 'error' ? 'Conversation unavailable' : `${inhabitant.displayName} topics`;
  const body = <div className="island-run-overlay-root island-inhabitant-flow" data-flow-layer={layer.kind} data-reduced-motion-safe="true">
    <div className="island-inhabitant-flow__backdrop" aria-hidden="true" />
    <div className="island-inhabitant-flow__viewport">
      <div ref={dialogRef} className="island-inhabitant-flow__dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}>
        <h2 id={titleId} className="island-inhabitant-flow__sr-title">{layerTitle}</h2>
        <p id={descriptionId} className="island-inhabitant-flow__sr-title">Two-stage inhabitant communication flow.</p>
        <div className={`island-inhabitant-flow__layer island-inhabitant-flow__layer--${layer.kind}`}>
          {layer.kind === 'encounter' ? <IslandInhabitantEncounter isOpen presentationMode="embedded" inhabitant={inhabitant} topics={topics} greeting={greeting} characterArtSrc={characterArtSrc ?? inhabitant.premiumArtSrc} backgroundArtSrc={backgroundArtSrc} islandName={islandName} islandStatusLabel={islandStatusLabel} islandEmblemSrc={islandEmblemSrc} discussedTopicIds={discussedTopicIds} onSelectTopic={handleSelectTopic} onClose={handleEncounterClose} /> : null}
          {layer.kind === 'conversation' && selectedConversation ? <IslandRetroConversation isOpen presentationMode="embedded" conversation={selectedConversation} inhabitant={inhabitant} inhabitantSpriteSrc={inhabitant.retroSpriteSrc} playerSpriteSrc={playerSpriteSrc} sceneBackgroundSrc={sceneBackgroundSrc} onClose={handleConversationClose} onExit={() => setLayer({ kind: 'encounter' })} /> : null}
          {layer.kind === 'error' ? <section className="island-inhabitant-flow__error" role="alert" aria-live="assertive"><h3>Conversation unavailable</h3><p>{layer.message}</p><div><button type="button" onClick={() => setLayer({ kind: 'encounter' })}>Back to topics</button><button type="button" onClick={handleErrorClose}>Close</button></div></section> : null}
        </div>
      </div>
    </div>
  </div>;
  if (typeof document === 'undefined') return body;
  return createPortal(body, document.body);
}
