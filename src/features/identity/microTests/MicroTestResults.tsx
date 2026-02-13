import React from 'react';
import type { HandChange } from './microTestScoring';

type MicroTestResultsProps = {
  changes: HandChange[];
  onClose: () => void;
};

const CHANGE_ICONS: Record<HandChange['type'], string> = {
  confirmed: '✅',
  leveled_up: '⬆️',
  shifted: '🔄',
  discovered: '✨',
  shadow_growth: '🌑',
  no_change: '🎴',
};

const CHANGE_MESSAGES: Record<HandChange['type'], string> = {
  confirmed: 'Card confirmed',
  leveled_up: 'Card leveled up',
  shifted: 'Card shifted',
  discovered: 'New card discovered',
  shadow_growth: 'Shadow card growing',
  no_change: 'Deck stable',
};

/**
 * "What changed in your deck" results view after completing a micro-test.
 * Displays hand changes with icons and messages.
 */
export function MicroTestResults({ changes, onClose }: MicroTestResultsProps) {
  return (
    <div className="micro-test-results">
      {/* Header */}
      <div className="micro-test-results__header">
        <h2 className="micro-test-results__title">Deck Updated!</h2>
        <p className="micro-test-results__subtitle">
          Here's what changed in your archetype hand
        </p>
      </div>

      {/* Changes List */}
      <div className="micro-test-results__changes">
        {changes.map((change, index) => (
          <div
            key={index}
            className={`micro-test-results__change micro-test-results__change--${change.type}`}
          >
            <div className="micro-test-results__change-icon">
              {CHANGE_ICONS[change.type]}
            </div>
            <div className="micro-test-results__change-content">
              <div className="micro-test-results__change-message">
                {change.message}
              </div>
              <div className="micro-test-results__change-detail">
                {CHANGE_MESSAGES[change.type]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="micro-test-results__action">
        <button
          className="micro-test-results__btn"
          onClick={onClose}
        >
          Back to Deck
        </button>
      </div>
    </div>
  );
}
