import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCreatureById } from '../services/creatureCatalog';
import { resolveCreatureArtManifest } from '../services/creatureImageManifest';
import './compass-pairing-tip.css';

const DISMISS_PREFIX = 'lifegoal:compass-pairing-tip:dismissed';

function readDismissed(key: string): boolean {
  try { return window.localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeDismissed(key: string) {
  try { window.localStorage.setItem(key, '1'); } catch { /* private mode */ }
}

type Props = {
  playerKey: string;
  visitKey: string;
  currentCompanionName: string | null;
  suggestedCreatureId: string;
  onAccept: (creatureId: string) => void;
};

/**
 * The Compass Book leans in with a tip: a creature you own is your Perfect
 * Match. "Do you want to upgrade your pairing by match?" — Yes pairs it through
 * the Sanctuary's canonical action; No hides the tip for this island visit.
 */
export function CompassPairingTip({ playerKey, visitKey, currentCompanionName, suggestedCreatureId, onAccept }: Props) {
  const storageKey = `${DISMISS_PREFIX}:${playerKey}:${visitKey}:${suggestedCreatureId}`;
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    if (readDismissed(storageKey)) return undefined;
    const timer = window.setTimeout(() => setVisible(true), 2_600);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  const creature = getCreatureById(suggestedCreatureId);
  if (!visible || !creature || typeof document === 'undefined') return null;
  const art = resolveCreatureArtManifest(creature);
  const close = () => { writeDismissed(storageKey); setVisible(false); };
  return createPortal(
    <aside className={`compass-pairing-tip${accepted ? ' compass-pairing-tip--accepted' : ''}`} role="dialog" aria-label="Compass Book tip">
      <header>
        <span className="compass-pairing-tip__book" aria-hidden="true">📖</span>
        <small>Compass tip</small>
      </header>
      <div className="compass-pairing-tip__body">
        <img src={art.cutoutSrc} alt="" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <p>
          {accepted
            ? <><strong>{creature.name}</strong> is now your pet. Your Perfect Match bonus starts on the next island.</>
            : <><strong>{creature.name}</strong> is your <em>Perfect Match</em>{currentCompanionName ? <> — a better fit than {currentCompanionName}</> : null}. A matched pair brings an extra gift at every island start.</>}
        </p>
      </div>
      {accepted ? (
        <button type="button" className="compass-pairing-tip__yes" onClick={close}>Great!</button>
      ) : (
        <>
          <p className="compass-pairing-tip__question">Do you want to upgrade your pairing by match?</p>
          <div className="compass-pairing-tip__actions">
            <button type="button" className="compass-pairing-tip__no" onClick={close}>No</button>
            <button type="button" className="compass-pairing-tip__yes" onClick={() => { onAccept(suggestedCreatureId); writeDismissed(storageKey); setAccepted(true); }}>
              Yes, pair {creature.name}
            </button>
          </div>
        </>
      )}
    </aside>,
    document.body,
  );
}
