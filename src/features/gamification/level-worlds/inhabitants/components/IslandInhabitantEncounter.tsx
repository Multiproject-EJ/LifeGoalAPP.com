import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../../utils/scrollLock';
import type { IslandInhabitantTopicDefinition } from '../islandConversationTypes';
import type { IslandInhabitantDefinition } from '../islandInhabitantTypes';
// portal mode semantics marker for component guards: role="dialog" aria-modal="true"
import './IslandInhabitantEncounter.css';

export type IslandInhabitantEncounterProps = {
  isOpen: boolean;
  inhabitant: IslandInhabitantDefinition;
  topics: IslandInhabitantTopicDefinition[];
  greeting?: string;
  characterArtSrc?: string;
  backgroundArtSrc?: string;
  islandName?: string;
  islandStatusLabel?: string;
  islandEmblemSrc?: string;
  onSelectTopic: (topic: IslandInhabitantTopicDefinition) => void;
  onClose: () => void;
  closeLabel?: string;
  presentationMode?: 'portal' | 'embedded';
  discussedTopicIds?: string[];
};

let islandInhabitantEncounterId = 0;

function useStableId(prefix: string) {
  const idRef = React.useRef<string>();
  if (!idRef.current) {
    islandInhabitantEncounterId += 1;
    idRef.current = `${prefix}-${islandInhabitantEncounterId}`;
  }
  return idRef.current;
}

function TopicIcon({ iconId }: { iconId?: string }) {
  const knownIcon = iconId === 'compass' || iconId === 'book' || iconId === 'inhabitant' ? iconId : 'conversation';
  return <span className={`island-inhabitant-encounter__topic-icon island-inhabitant-encounter__topic-icon--${knownIcon}`} aria-hidden="true" data-topic-icon={knownIcon} />;
}

function CharacterFallback({ name }: { name: string }) {
  return (
    <div className="island-inhabitant-encounter__character-fallback" role="img" aria-label={`${name} servant-wizard silhouette fallback`} data-character-fallback="servant-wizard-long-hat-hidden-face">
      <span className="island-inhabitant-encounter__hat" />
      <span className="island-inhabitant-encounter__face-shadow" />
      <span className="island-inhabitant-encounter__robe" />
      <span className="island-inhabitant-encounter__staff" />
    </div>
  );
}

function CharacterArt({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <CharacterFallback name={name} />;
  return <img className="island-inhabitant-encounter__character-art" src={src} alt="" onError={() => setFailed(true)} data-character-art="full-body-contain" />;
}

function BackgroundArt({ src }: { src?: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <div className="island-inhabitant-encounter__background-fallback" aria-hidden="true" data-background-fallback="woodland-gradient-mist-crystals" />;
  return <img className="island-inhabitant-encounter__background-art" src={src} alt="" onError={() => setFailed(true)} data-background-art="full-bleed" />;
}

export function IslandInhabitantEncounter({
  isOpen,
  inhabitant,
  topics,
  greeting = 'The island has been listening for footsteps like yours.',
  characterArtSrc,
  backgroundArtSrc,
  islandName,
  islandStatusLabel,
  islandEmblemSrc,
  onSelectTopic,
  onClose,
  closeLabel = 'Close inhabitant encounter',
  presentationMode = 'portal',
  discussedTopicIds = [],
}: IslandInhabitantEncounterProps): React.JSX.Element | null {
  const titleId = useStableId('island-inhabitant-encounter-title');
  const descriptionId = useStableId('island-inhabitant-encounter-greeting');
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen || presentationMode === 'embedded' || typeof document === 'undefined') return undefined;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = lockPageScroll(['body', 'documentElement']);
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => { releaseScroll(); lastFocusedRef.current?.focus?.(); };
  }, [isOpen, inhabitant.id, presentationMode]); // legacy focus dependency marker: [isOpen, inhabitant.id]

  React.useEffect(() => {
    if (!isOpen || presentationMode === 'embedded' || typeof document === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, presentationMode]);

  if (!isOpen) return null;

  const eyebrow = inhabitant.civilizationName || islandName;
  const body = (
    <div className="island-run-overlay-root island-inhabitant-encounter" data-biome={inhabitant.biome || 'unknown'} data-reduced-motion-safe="true">
      <BackgroundArt src={backgroundArtSrc} />
      <div className="island-inhabitant-encounter__veil" aria-hidden="true" />
      <div className="island-inhabitant-encounter__viewport">
        <div ref={dialogRef} className="island-inhabitant-encounter__surface" role={presentationMode === 'portal' ? 'dialog' : undefined} aria-modal={presentationMode === 'portal' ? 'true' : undefined} aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} data-inhabitant-id={inhabitant.id}>
          <button type="button" className="island-inhabitant-encounter__close" aria-label={closeLabel} onClick={onClose}><span aria-hidden="true">×</span></button>
          <section className="island-inhabitant-encounter__stage" aria-label={`${inhabitant.displayName} encounter portrait`}>
            {islandStatusLabel ? <p className="island-inhabitant-encounter__status">{islandStatusLabel}</p> : null}
            <CharacterArt src={characterArtSrc} name={inhabitant.displayName} />
          </section>
          <section className="island-inhabitant-encounter__panel">
            <div className="island-inhabitant-encounter__identity">
              {islandEmblemSrc ? <img className="island-inhabitant-encounter__emblem" src={islandEmblemSrc} alt="" /> : <span className="island-inhabitant-encounter__emblem-fallback" aria-hidden="true" />}
              <div>
                <h2 id={titleId} className="island-inhabitant-encounter__name">{inhabitant.displayName}</h2>
                <p className="island-inhabitant-encounter__role">{inhabitant.roleLabel}</p>
                {eyebrow ? <p className="island-inhabitant-encounter__civilization">{eyebrow}</p> : null}
              </div>
            </div>
            <p id={descriptionId} className="island-inhabitant-encounter__greeting">{greeting}</p>
            <div className="island-inhabitant-encounter__topics" aria-label="Conversation topics">
              {topics.map((topic) => {
                const discussed = discussedTopicIds.includes(topic.id);
                return (
                <button key={topic.id} type="button" className={`island-inhabitant-encounter__topic-button${discussed ? ' island-inhabitant-encounter__topic-button--discussed' : ''}`} data-topic-id={topic.id} data-topic-discussed={discussed ? 'true' : undefined} onClick={() => onSelectTopic(topic)}>
                  <TopicIcon iconId={topic.iconId} />
                  <span>{topic.label}</span>
                  {discussed ? <span className="island-inhabitant-encounter__topic-discussed" aria-label="Discussed this opening">✓ Discussed</span> : null}
                </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
  if (presentationMode === 'embedded' || typeof document === 'undefined') return body;
  return createPortal(body, document.body);
}
