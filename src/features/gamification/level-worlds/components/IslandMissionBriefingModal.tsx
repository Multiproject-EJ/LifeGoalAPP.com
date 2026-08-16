import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import type { IslandMissionBriefingPresentation } from '../services/islandRunMissionBriefing';

export interface IslandMissionBriefingModalProps {
  isOpen: boolean;
  presentation: IslandMissionBriefingPresentation | null;
  caretakerName: string;
  caretakerArtSrc?: string;
  onAcknowledge: () => void;
}
export function IslandMissionBriefingModal({
  isOpen,
  presentation,
  caretakerName,
  caretakerArtSrc,
  onAcknowledge,
}: IslandMissionBriefingModalProps): React.JSX.Element | null {
  const titleId = React.useId();
  const copyId = React.useId();
  const acknowledgeRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const unlockScroll = lockPageScroll();
    const focusTimer = window.setTimeout(() => acknowledgeRef.current?.focus(), 180);
    return () => {
      window.clearTimeout(focusTimer);
      unlockScroll();
    };
  }, [isOpen]);

  if (!isOpen || !presentation || typeof document === 'undefined') return null;

  return createPortal(
    <div className="island-mission-briefing" role="presentation">
      <div className="island-mission-briefing__atmosphere" aria-hidden="true" />
      <section
        className="island-mission-briefing__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={copyId}
      >
        <header className="island-mission-briefing__header">
          <div>
            <p>{presentation.organization}</p>
            <h2 id={titleId}>Secure field briefing</h2>
          </div>
          <span>Island {String(presentation.islandNumber).padStart(3, '0')} · first circuit</span>
        </header>

        <div className="island-mission-briefing__devices" aria-label="Expedition Phone and The Concord linked to the island caretaker">
          <figure className="island-mission-briefing__device island-mission-briefing__device--phone">
            <img src="/tech/ExpeditionPhone_v11_open_front.webp" alt="Open Expedition Phone receiving a secure Central Command call" />
            <figcaption>Command uplink</figcaption>
          </figure>
          <div className="island-mission-briefing__signal" aria-hidden="true"><i /><i /><i /></div>
          <figure className="island-mission-briefing__device island-mission-briefing__device--concord">
            <img src="/tech/Concord_v4_front.webp" alt="The restored Concord translating the caretaker's signal" />
            <figcaption>Meaning channel</figcaption>
          </figure>
          <aside className="island-mission-briefing__caretaker">
            <div className="island-mission-briefing__caretaker-portrait">
              {caretakerArtSrc ? <img src={caretakerArtSrc} alt={`${caretakerName}, caretaker of ${presentation.islandName}`} /> : <span aria-hidden="true">✦</span>}
            </div>
            <div>
              <small>Local signal · translated live</small>
              <strong>{caretakerName}</strong>
              <q>{presentation.caretakerSignal}</q>
            </div>
          </aside>
        </div>

        <div className="island-mission-briefing__body">
          <div className="island-mission-briefing__statement">
            <p className="island-mission-briefing__kicker">Mission statement · {presentation.islandName}</p>
            <h3>{presentation.headline}</h3>
            <p id={copyId}>{presentation.missionStatement}</p>
          </div>

          <div className="island-mission-briefing__objectives">
            <article>
              <small>Primary objective</small>
              <strong>{presentation.primaryObjective}</strong>
            </article>
            <article>
              <small>Supporting objective</small>
              <strong>{presentation.supportingObjective}</strong>
            </article>
            <article>
              <small>Field protocol</small>
              <strong>{presentation.fieldProtocol}</strong>
            </article>
          </div>
        </div>

        <div className="island-mission-briefing__command">
          <p>Command council · secure participants</p>
          <div className="island-mission-briefing__officers">
            {presentation.commandTeam.map((officer) => (
              <article key={officer.id} className={`island-mission-briefing__officer island-mission-briefing__officer--${officer.id}`}>
                <div>
                  {officer.portraitSrc ? <img src={officer.portraitSrc} alt="" aria-hidden="true" /> : <span aria-hidden="true">{officer.initials}</span>}
                </div>
                <strong>{officer.name}</strong>
                <small>{officer.role}</small>
              </article>
            ))}
          </div>
        </div>

        <button ref={acknowledgeRef} type="button" className="island-mission-briefing__accept" onClick={onAcknowledge}>
          <span aria-hidden="true">◎</span>
          Accept field order
        </button>
      </section>
    </div>,
    document.body,
  );
}
