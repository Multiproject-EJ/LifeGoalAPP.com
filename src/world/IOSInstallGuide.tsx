import React, { useEffect } from 'react';
import './world.css';

interface IOSInstallGuideProps {
  onDismiss: () => void;
}

export function IOSInstallGuide({ onDismiss }: IOSInstallGuideProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);
  return (
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
        <h2 className="ios-install-guide__title">Install HabitGame</h2>
        <p className="ios-install-guide__subtitle">Add to your Home Screen for the best experience.</p>

        <ol className="ios-install-guide__steps" aria-label="Installation steps">
          <li className="ios-install-guide__step">
            <span className="ios-install-guide__step-num" aria-hidden="true">1</span>
            <span className="ios-install-guide__step-text">
              Tap the <strong>Share</strong> button
              <span className="ios-install-guide__share-icon" aria-label="share icon"> ↑</span>
            </span>
          </li>
          <li className="ios-install-guide__step">
            <span className="ios-install-guide__step-num" aria-hidden="true">2</span>
            <span className="ios-install-guide__step-text">
              Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>
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
    </div>
  );
}
