import React, { useState } from 'react';
import { isPushSupported, subscribeToPush, sendSubscriptionToServer } from '../../../../services/pushNotifications';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

type NotifyChannel = 'email' | 'push';

type DemoWaitlistModalProps = {
  open: boolean;
  userEmail?: string;
  accessToken?: string;
  onClose: () => void;
};

export default function DemoWaitlistModal({
  open,
  userEmail,
  accessToken,
  onClose,
}: DemoWaitlistModalProps) {
  const [selected, setSelected] = useState<NotifyChannel | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const pushAvailable = isPushSupported();

  const handleNotify = async () => {
    if (!selected) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      if (selected === 'push') {
        if (!accessToken || !SUPABASE_URL) throw new Error('Session not ready.');
        const sub = await subscribeToPush();
        await sendSubscriptionToServer(sub, SUPABASE_URL, accessToken);
      }
      setStatus('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <div className="demo-waitlist-modal" role="dialog" aria-modal="true" aria-label="Demo complete — join the waitlist">
      <button
        type="button"
        className="demo-waitlist-modal__backdrop"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="demo-waitlist-modal__panel">
        <div className="demo-waitlist-modal__header">
          <div className="demo-waitlist-modal__island-badge" aria-hidden="true">🏝️</div>
          <p className="demo-waitlist-modal__eyebrow">Island 3 complete</p>
          <h2 className="demo-waitlist-modal__title">You've reached the end of the demo</h2>
          <p className="demo-waitlist-modal__body-text">
            More islands are coming. Be the first to know when the full game unlocks — choose how you want to hear about it.
          </p>
        </div>

        {status === 'done' ? (
          <div className="demo-waitlist-modal__success">
            <span className="demo-waitlist-modal__success-icon" aria-hidden="true">✅</span>
            <p className="demo-waitlist-modal__success-text">
              {selected === 'push'
                ? "You're signed up for push alerts. We'll notify you the moment new islands drop."
                : `We'll send an update to ${userEmail ?? 'your email'} when the full game is ready.`}
            </p>
            <button type="button" className="demo-waitlist-modal__btn demo-waitlist-modal__btn--ghost" onClick={onClose}>
              Back to game
            </button>
          </div>
        ) : (
          <>
            <div className="demo-waitlist-modal__options" role="radiogroup" aria-label="Notify me via">
              {userEmail && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected === 'email'}
                  className={`demo-waitlist-modal__option${selected === 'email' ? ' demo-waitlist-modal__option--selected' : ''}`}
                  onClick={() => setSelected('email')}
                >
                  <span className="demo-waitlist-modal__option-icon" aria-hidden="true">✉️</span>
                  <span className="demo-waitlist-modal__option-info">
                    <span className="demo-waitlist-modal__option-label">Email me</span>
                    <span className="demo-waitlist-modal__option-sub">{userEmail}</span>
                  </span>
                  <span className="demo-waitlist-modal__option-check" aria-hidden="true" />
                </button>
              )}

              {pushAvailable && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected === 'push'}
                  className={`demo-waitlist-modal__option${selected === 'push' ? ' demo-waitlist-modal__option--selected' : ''}`}
                  onClick={() => setSelected('push')}
                >
                  <span className="demo-waitlist-modal__option-icon" aria-hidden="true">🔔</span>
                  <span className="demo-waitlist-modal__option-info">
                    <span className="demo-waitlist-modal__option-label">App alerts</span>
                    <span className="demo-waitlist-modal__option-sub">Push notification on this device</span>
                  </span>
                  <span className="demo-waitlist-modal__option-check" aria-hidden="true" />
                </button>
              )}
            </div>

            {status === 'error' && (
              <p className="demo-waitlist-modal__error" role="alert">{errorMsg}</p>
            )}

            <div className="demo-waitlist-modal__actions">
              <button
                type="button"
                className={`demo-waitlist-modal__btn demo-waitlist-modal__btn--primary${!selected ? ' demo-waitlist-modal__btn--disabled' : ''}`}
                onClick={handleNotify}
                disabled={!selected || status === 'loading'}
                aria-busy={status === 'loading'}
              >
                {status === 'loading' ? 'Signing up…' : 'Notify me'}
              </button>
              <button type="button" className="demo-waitlist-modal__btn demo-waitlist-modal__btn--ghost" onClick={onClose}>
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
