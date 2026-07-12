import React, { useMemo, useState } from 'react';
import type { PersonalityScores } from '../personalityScoring';
import {
  MICRO_TEST_REGISTRY,
  type MicroTestDefinition,
} from '../microTests/microTestData';
import { SELF_SERVE_MICRO_TEST_IDS } from '../microTests/microTestTriggers';
import { MicroTestFlow } from '../microTests/MicroTestFlow';
import { MicroTestResults } from '../microTests/MicroTestResults';
import type { HandChange, MicroTestResult } from '../microTests/microTestScoring';
import { analyzeMicroTestImpact } from '../microTests/microTestApply';
import { getCompletedMicroTestIds, saveMicroTestResult } from '../microTests/microTestStore';

type MicroTestPanelProps = {
  userId: string | null;
  foundationScores: PersonalityScores;
  results: MicroTestResult[];
  dominantName: string;
  onResultsChange: (results: MicroTestResult[]) => void;
};

/**
 * Results-screen entry point for micro-tests. Offers the self-serve tests the
 * player can take right now (the same SELF_SERVE_MICRO_TEST_IDS the badge keys
 * off, so the two never diverge), mounts the shared MicroTestFlow, then
 * persists the result and shows what changed in the archetype hand.
 */
export function MicroTestPanel({
  userId,
  foundationScores,
  results,
  dominantName,
  onResultsChange,
}: MicroTestPanelProps) {
  const [activeTest, setActiveTest] = useState<MicroTestDefinition | null>(null);
  const [changes, setChanges] = useState<HandChange[] | null>(null);

  const offeredTests = useMemo<MicroTestDefinition[]>(() => {
    const completed = new Set(getCompletedMicroTestIds(results));
    return Array.from(SELF_SERVE_MICRO_TEST_IDS)
      .filter((id) => !completed.has(id))
      .map((id) => MICRO_TEST_REGISTRY[id])
      .filter((def): def is MicroTestDefinition => Boolean(def));
  }, [results]);

  const completedCount = getCompletedMicroTestIds(results).length;

  const handleComplete = (result: MicroTestResult) => {
    const handChanges = analyzeMicroTestImpact(foundationScores, results, result);
    if (userId) {
      const next = saveMicroTestResult(userId, result);
      onResultsChange(next);
    } else {
      onResultsChange([...results, result]);
    }
    setActiveTest(null);
    setChanges(handChanges);
  };

  if (activeTest) {
    return (
      <div className="identity-hub__microtest-host">
        <MicroTestFlow
          microTest={activeTest}
          onComplete={handleComplete}
          onCancel={() => setActiveTest(null)}
        />
      </div>
    );
  }

  if (changes) {
    return (
      <div className="identity-hub__microtest-host">
        <MicroTestResults changes={changes} onClose={() => setChanges(null)} />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: '2px solid rgba(59, 130, 246, 0.4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
          🔬 Deepen your deck
        </h3>
        {completedCount > 0 && (
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            {completedCount} micro-test{completedCount === 1 ? '' : 's'} done
          </span>
        )}
      </div>

      {offeredTests.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#ccc', margin: 0 }}>
          You've taken every micro-test available right now. New ones unlock as you keep building
          habits and streaks — check back later.
        </p>
      ) : (
        <>
          <p style={{ fontSize: '13px', color: '#ccc', marginTop: 0, marginBottom: '14px', lineHeight: 1.5 }}>
            Quick optional quizzes that sharpen your hand. Take one to reveal hidden dimensions or
            confirm your {dominantName}.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {offeredTests.map((test) => (
              <button
                key={test.id}
                type="button"
                onClick={() => setActiveTest(test)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  background: 'rgba(59, 130, 246, 0.08)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '24px' }}>{test.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                    {test.title}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: '#aaa' }}>
                    {test.subtitle} · ~{test.estimatedSeconds}s
                  </span>
                </span>
                <span style={{ fontSize: '18px', color: '#3b82f6' }}>→</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
