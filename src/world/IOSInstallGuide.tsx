import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './world.css';

interface IOSInstallGuideProps {
  onDismiss: () => void;
  platform?: 'android' | 'ios' | 'installed' | 'unavailable';
}

export function IOSInstallGuide({ onDismiss, platform = 'ios' }: IOSInstallGuideProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onDismiss]);

  const isIOS = platform === 'ios';
  const isGeneric = platform === 'unavailable';

  return createPortal(
    <div className="ios-install-guide" role="dialog" aria-modal="true" aria-label="Install HabitGame">
      {/* Backdrop */}
      <div className="ios-install-guide__backdrop" onClick={onDismiss} aria-hidden="true" />

      {/* Card */}
      <div className="ios-install-guide__card">
        <button
          className="ios-install-guide__close"
          onClick={onDismiss}
          type="button"
          aria-label="Close install guide"
        >
          ✕
        </button>

        <div className="ios-install-guide__icon" aria-hidden="true">📱</div>
        <h2 className="ios-install-guide__title">Add HabitGame to your Home Screen</h2>
        <p className="ios-install-guide__subtitle">
          Use HabitGame like an app today—no App Store download needed.
        </p>

        <ol className="ios-install-guide__steps" aria-label="Installation steps">
          <li className="ios-install-guide__step">
            <span className="ios-install-guide__step-num" aria-hidden="true">1</span>
            <span className="ios-install-guide__step-text">
              {isGeneric ? (
                <>On iPhone use <strong>Safari</strong>; on Android use <strong>Chrome</strong></>
              ) : isIOS ? (
                <>Open this page in <strong>Safari</strong></>
              ) : (
                <>Open this page in <strong>Chrome</strong> on Android</>
              )}
            </span>
          </li>
          <li className="ios-install-guide__step">
            <span className="ios-install-guide__step-num" aria-hidden="true">2</span>
            <span className="ios-install-guide__step-text">
              {isGeneric ? (
                <>
                  iPhone: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>. Android: open the menu and tap <strong>Install app</strong>.
                </>
              ) : isIOS ? (
                <>
                  Tap <strong>Share</strong>
                  <span className="ios-install-guide__share-icon" aria-label="share icon"> ↑</span>, then{' '}
                  <strong>Add to Home Screen</strong>
                </>
              ) : (
                <>Open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong></>
              )}
            </span>
          </li>
          <li className="ios-install-guide__step">
            <span className="ios-install-guide__step-num" aria-hidden="true">3</span>
            <span className="ios-install-guide__step-text">
              Tap <strong>&ldquo;Add&rdquo;</strong> to confirm
            </span>
          </li>
        </ol>

        <button
          className="ios-install-guide__got-it"
          onClick={onDismiss}
          type="button"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}
