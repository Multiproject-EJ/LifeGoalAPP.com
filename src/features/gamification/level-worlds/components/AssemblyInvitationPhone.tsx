import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import './AssemblyInvitationPhone.css';

type Stage = 'compose' | 'sent' | 'typing' | 'replied';

const PLAYER_MESSAGE = 'Buildings and marina complete. Send the invites.';
const REPLY = 'ETA… NOW.';

/**
 * Island 001 finale: the Mission Phone opens, the player sends the Assembly
 * invitations, Central Command answers "ETA… NOW." and the phone closes so the
 * delegates' arrival can play. Presentation only; `onSent` is the one callback.
 */
export function AssemblyInvitationPhone({ onSent }: { onSent: () => void }) {
  const [stage, setStage] = useState<Stage>('compose');
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const onSentRef = useRef(onSent);
  onSentRef.current = onSent;
  const sendRef = useRef<HTMLButtonElement>(null);

  useEffect(() => lockPageScroll(['body', 'documentElement']), []);
  useEffect(() => { sendRef.current?.focus(); }, []);

  useEffect(() => {
    if (stage === 'compose') return undefined;
    const delays: Record<Exclude<Stage, 'compose'>, number> = reduced
      ? { sent: 250, typing: 500, replied: 1100 }
      : { sent: 450, typing: 1300, replied: 1500 };
    const timer = window.setTimeout(() => {
      if (stage === 'sent') setStage('typing');
      else if (stage === 'typing') setStage('replied');
      else onSentRef.current();
    }, delays[stage]);
    return () => window.clearTimeout(timer);
  }, [reduced, stage]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="island-run-overlay-root assembly-invite-phone-backdrop" role="presentation">
      <section className="assembly-invite-phone" role="dialog" aria-modal="true" aria-labelledby="assembly-invite-phone-title">
        <header className="assembly-invite-phone__header">
          <span className="assembly-invite-phone__avatar" aria-hidden="true">✦</span>
          <span>
            <small>Mission Phone</small>
            <strong id="assembly-invite-phone-title">Central Command</strong>
          </span>
        </header>
        <div className="assembly-invite-phone__thread" aria-live="polite">
          <p className="assembly-invite-phone__system">The Assembly hall is lit and the marina is ready for guests.</p>
          {stage !== 'compose' ? <p className="assembly-invite-phone__bubble assembly-invite-phone__bubble--mine">{PLAYER_MESSAGE}</p> : null}
          {stage === 'typing' ? (
            <p className="assembly-invite-phone__bubble assembly-invite-phone__bubble--typing" aria-label="Central Command is typing">
              <i /><i /><i />
            </p>
          ) : null}
          {stage === 'replied' ? <p className="assembly-invite-phone__bubble assembly-invite-phone__bubble--reply">{REPLY}</p> : null}
        </div>
        <footer className="assembly-invite-phone__composer">
          <span className="assembly-invite-phone__draft">{stage === 'compose' ? PLAYER_MESSAGE : 'Invitations sent'}</span>
          <button
            ref={sendRef}
            type="button"
            className="assembly-invite-phone__send"
            disabled={stage !== 'compose'}
            onClick={() => setStage('sent')}
          >
            Send invites
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
