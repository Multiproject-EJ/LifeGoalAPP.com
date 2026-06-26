import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../../utils/scrollLock';
import type { IslandConversationDefinition, IslandConversationNode } from '../islandConversationTypes';
import type { IslandInhabitantDefinition } from '../islandInhabitantTypes';
import {
  advanceNpcNode,
  chooseConversationOption,
  resolveConversationStartNode,
  submitConversationTextResponse,
} from '../islandConversationTraversal';
import './IslandRetroConversation.css';

export type IslandRetroConversationResult = {
  conversationId: string;
  closeNodeId: string;
  returnTo: 'encounter' | 'board';
  selectedChoiceIds: string[];
  textResponses: Record<string, string>;
};

export type IslandRetroConversationProps = {
  isOpen: boolean;
  conversation: IslandConversationDefinition;
  inhabitant: IslandInhabitantDefinition;
  inhabitantSpriteSrc?: string;
  playerSpriteSrc?: string;
  sceneBackgroundSrc?: string;
  onClose: (result: IslandRetroConversationResult) => void;
  onExit?: () => void;
  initialNodeId?: string;
  typewriterEnabled?: boolean;
};

let islandRetroConversationId = 0;
const TYPEWRITER_STEP_MS = 18;

function useStableId(prefix: string) {
  const idRef = React.useRef<string>();
  if (!idRef.current) {
    islandRetroConversationId += 1;
    idRef.current = `${prefix}-${islandRetroConversationId}`;
  }
  return idRef.current;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);
    const handleChange = () => setPrefersReducedMotion(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);
  return prefersReducedMotion;
}

function Sprite({ src, label, player }: { src?: string; label: string; player?: boolean }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return <div className={`island-retro-conversation__sprite-fallback${player ? ' island-retro-conversation__sprite-fallback--player' : ''}`} role="img" aria-label={`${label} sprite fallback`} data-sprite-fallback={player ? 'player' : 'inhabitant'}>{player ? 'YOU' : label.charAt(0).toUpperCase()}</div>;
  }
  return <img className="island-retro-conversation__sprite-img" src={src} alt={label} onError={() => setFailed(true)} />;
}

function getSpeakerName(node: IslandConversationNode, inhabitant: IslandInhabitantDefinition) {
  if (node.type !== 'npc') return inhabitant.displayName;
  if (node.speakerId === 'player') return 'You';
  if (node.speakerId === inhabitant.id) return inhabitant.displayName;
  return String(node.speakerId);
}

export function IslandRetroConversation({
  isOpen,
  conversation,
  inhabitant,
  inhabitantSpriteSrc,
  playerSpriteSrc,
  sceneBackgroundSrc,
  onClose,
  onExit,
  initialNodeId,
  typewriterEnabled = true,
}: IslandRetroConversationProps): React.JSX.Element | null {
  const titleId = useStableId('island-retro-conversation-title');
  const descriptionId = useStableId('island-retro-conversation-description');
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [node, setNode] = React.useState<IslandConversationNode>(() => resolveConversationStartNode(conversation, initialNodeId));
  const [selectedChoiceIds, setSelectedChoiceIds] = React.useState<string[]>([]);
  const [textResponses, setTextResponses] = React.useState<Record<string, string>>({});
  const [draftText, setDraftText] = React.useState('');
  const [textError, setTextError] = React.useState('');
  const [visibleCharacters, setVisibleCharacters] = React.useState(0);

  React.useEffect(() => {
    if (!isOpen) return;
    setNode(resolveConversationStartNode(conversation, initialNodeId));
    setSelectedChoiceIds([]);
    setTextResponses({});
    setDraftText('');
    setTextError('');
    setVisibleCharacters(0);
  }, [conversation, initialNodeId, isOpen]);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = lockPageScroll(['body', 'documentElement']);
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => { releaseScroll(); lastFocusedRef.current?.focus?.(); };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined' || !onExit) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onExit(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onExit]);

  const fullText = node.type === 'npc' ? node.text : node.type === 'choice' ? node.prompt : node.type === 'player_text_response' ? node.prompt : 'Conversation complete.';
  const shouldType = node.type === 'npc' && typewriterEnabled && !reducedMotion;

  React.useEffect(() => {
    if (!shouldType) { setVisibleCharacters(fullText.length); return undefined; }
    setVisibleCharacters(0);
    const timer = window.setInterval(() => {
      setVisibleCharacters((current) => current >= fullText.length ? current : current + 1);
    }, TYPEWRITER_STEP_MS);
    return () => window.clearInterval(timer);
  }, [fullText, shouldType]);

  if (!isOpen) return null;

  const speakerName = getSpeakerName(node, inhabitant);
  const shownText = shouldType ? fullText.slice(0, visibleCharacters) : fullText;
  const fullyRevealed = visibleCharacters >= fullText.length;

  const handleNpcContinue = () => {
    if (shouldType && !fullyRevealed) { setVisibleCharacters(fullText.length); return; }
    if (node.type !== 'npc') return;
    const nextNode = advanceNpcNode(conversation, node);
    if (nextNode) setNode(nextNode);
  };
  const handleChoice = (choiceId: string) => {
    if (node.type !== 'choice') return;
    const result = chooseConversationOption(conversation, node, choiceId);
    setSelectedChoiceIds((current) => current.includes(result.choiceId) ? current : [...current, result.choiceId]);
    setNode(result.nextNode);
  };
  const handleTextSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (node.type !== 'player_text_response') return;
    if (draftText.length > node.maxLength) { setTextError(`Use ${node.maxLength} characters or fewer.`); return; }
    setTextResponses((current) => ({ ...current, [node.id]: draftText }));
    setDraftText('');
    setTextError('');
    setNode(submitConversationTextResponse(conversation, node, draftText));
  };
  const handleClose = () => {
    if (node.type !== 'close') return;
    onClose({ conversationId: conversation.id, closeNodeId: node.id, returnTo: node.returnTo, selectedChoiceIds, textResponses });
  };

  const body = <div className="island-run-overlay-root island-retro-conversation" data-reduced-motion-safe="true">
    <div className="island-retro-conversation__backdrop" aria-hidden="true" />
    <div className="island-retro-conversation__viewport">
      <div ref={dialogRef} className="island-retro-conversation__frame" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}>
        <button type="button" className="island-retro-conversation__exit" aria-label="Exit conversation" onClick={onExit}>×</button>
        <div className="island-retro-conversation__scene" aria-label={`${inhabitant.displayName} retro conversation scene`}>
          {sceneBackgroundSrc ? <img className="island-retro-conversation__scene-bg" src={sceneBackgroundSrc} alt="" /> : null}
          <div className="island-retro-conversation__ground" aria-hidden="true" />
          <div className="island-retro-conversation__sprite-row"><Sprite src={playerSpriteSrc} label="Player" player /><Sprite src={inhabitantSpriteSrc} label={inhabitant.displayName} /></div>
        </div>
        <section className="island-retro-conversation__dialogue" id={descriptionId} aria-live="polite" aria-atomic="true">
          <h2 id={titleId} className="island-retro-conversation__speaker">{speakerName}</h2>
          {node.type === 'npc' ? <><p className="island-retro-conversation__text" aria-hidden={shouldType && !fullyRevealed ? true : undefined}>{shownText}</p>{shouldType && !fullyRevealed ? <p className="island-retro-conversation__sr-full">{fullText}</p> : null}<button type="button" className="island-retro-conversation__continue" onClick={handleNpcContinue}>{fullyRevealed ? 'Continue' : 'Reveal full text'} <span className="island-retro-conversation__continue-arrow" aria-hidden="true">▼</span></button></> : null}
          {node.type === 'choice' ? <><p className="island-retro-conversation__prompt">{node.prompt}</p><div className="island-retro-conversation__choices">{node.choices.map((choice) => <button key={choice.id} type="button" className="island-retro-conversation__choice" aria-label={`Choose ${choice.label}`} onClick={() => handleChoice(choice.id)}>{choice.label}</button>)}</div></> : null}
          {node.type === 'player_text_response' ? <form className="island-retro-conversation__text-form" onSubmit={handleTextSubmit}><label className="island-retro-conversation__prompt" htmlFor={`${titleId}-response`}>{node.prompt}</label><textarea id={`${titleId}-response`} className="island-retro-conversation__textarea" value={draftText} maxLength={node.maxLength} placeholder={node.placeholder} aria-describedby={`${titleId}-count ${textError ? `${titleId}-error` : ''}`} onChange={(event) => setDraftText(event.target.value)} /><span id={`${titleId}-count`} className="island-retro-conversation__meta">{draftText.length}/{node.maxLength} characters</span>{textError ? <span id={`${titleId}-error`} className="island-retro-conversation__error">{textError}</span> : null}<button type="submit" className="island-retro-conversation__submit">Submit response</button></form> : null}
          {node.type === 'close' ? <><p className="island-retro-conversation__text">This conversation is complete.</p><button type="button" className="island-retro-conversation__finish" onClick={handleClose}>{node.label ?? 'Finish conversation'}</button></> : null}
        </section>
      </div>
    </div>
  </div>;
  if (typeof document === 'undefined') return body;
  return createPortal(body, document.body);
}
