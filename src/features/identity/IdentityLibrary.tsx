import React, { useState } from 'react';
import type { PersonalityScores } from './personalityScoring';
import type { IdentityTestEntry } from './identityTestLibrary';
import { MICRO_TEST_REGISTRY } from './microTests/microTestData';
import { MicroTestFlow } from './microTests/MicroTestFlow';
import { MicroTestResults } from './microTests/MicroTestResults';
import type { HandChange, MicroTestResult } from './microTests/microTestScoring';
import { analyzeMicroTestImpact } from './microTests/microTestApply';
import { saveMicroTestResult } from './microTests/microTestStore';

type IdentityLibraryProps = {
  userId: string | null;
  entries: IdentityTestEntry[];
  /** Foundation scores, used to compute what a micro-test changed in the hand. */
  foundationScores: PersonalityScores | null;
  microResults: MicroTestResult[];
  onResultsChange: (results: MicroTestResult[]) => void;
  onTakeFoundation: () => void;
};

/**
 * The Identity Library: every test that builds or sharpens the card, in one
 * list with its real state. Also hosts the micro-test flow, so taking a test
 * happens in place rather than on some other screen.
 */
export function IdentityLibrary({
  userId,
  entries,
  foundationScores,
  microResults,
  onResultsChange,
  onTakeFoundation,
}: IdentityLibraryProps) {
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [changes, setChanges] = useState<HandChange[] | null>(null);

  const activeTest = activeTestId ? MICRO_TEST_REGISTRY[activeTestId] ?? null : null;

  const handleComplete = (result: MicroTestResult) => {
    // The quarterly recheck re-runs a test that was already taken, so results
    // must accumulate rather than replace — the blend is decay-weighted and
    // wants the history.
    const alreadyTaken = microResults.some((entry) => entry.microTestId === result.microTestId);
    const handChanges = foundationScores
      ? analyzeMicroTestImpact(foundationScores, microResults, result)
      : [];

    if (userId) {
      onResultsChange(saveMicroTestResult(userId, result, { repeatable: alreadyTaken }));
    } else {
      onResultsChange([...microResults, result]);
    }

    setActiveTestId(null);
    setChanges(handChanges.length > 0 ? handChanges : null);
  };

  if (activeTest) {
    return (
      <div className="identity-hub__card">
        <MicroTestFlow
          microTest={activeTest}
          onComplete={handleComplete}
          onCancel={() => setActiveTestId(null)}
        />
      </div>
    );
  }

  if (changes) {
    return (
      <div className="identity-hub__card">
        <MicroTestResults changes={changes} onClose={() => setChanges(null)} />
      </div>
    );
  }

  return (
    <div className="identity-hub__library">
      <div className="identity-hub__library-head">
        <h3 className="identity-hub__card-title">Tests &amp; check-ins</h3>
        <p className="identity-hub__card-text identity-hub__card-text--compact">
          Everything that builds or sharpens your card. New check-ins unlock as you play.
        </p>
      </div>

      <ul className="identity-hub__library-list">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`identity-hub__library-row identity-hub__library-row--${entry.status}`}
          >
            <span className="identity-hub__library-icon" aria-hidden="true">
              {entry.icon}
            </span>
            <span className="identity-hub__library-body">
              <span className="identity-hub__library-title">{entry.title}</span>
              <span className="identity-hub__library-subtitle">{entry.subtitle}</span>
              <span className="identity-hub__library-meta">
                <span
                  className={`identity-hub__library-status identity-hub__library-status--${entry.status}`}
                >
                  {entry.statusLabel}
                </span>
                <span className="identity-hub__library-duration">{entry.durationLabel}</span>
              </span>
            </span>
            {entry.actionLabel ? (
              <button
                type="button"
                className={
                  entry.status === 'available'
                    ? 'identity-hub__cta identity-hub__cta--compact'
                    : 'identity-hub__secondary identity-hub__secondary--compact'
                }
                onClick={() =>
                  entry.kind === 'foundation' ? onTakeFoundation() : setActiveTestId(entry.id)
                }
              >
                {entry.actionLabel}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
