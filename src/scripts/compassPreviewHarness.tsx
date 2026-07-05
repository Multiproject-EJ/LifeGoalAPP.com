/**
 * Dev-only visual harness for the Compass Book + quick-add + pillar meter.
 * Served via compass-preview.html on the dev server only — never linked from
 * the app and excluded from the production build inputs.
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CompassBookScreen } from '../features/compass-book/components/CompassBookScreen';
import { QuickAddSheet } from '../components/QuickAddSheet';
import { GoalPillarMeter } from '../features/goals/GoalPillarMeter';
import { computeGoalPillars } from '../features/goals/goalPillars';
import '../index.css';

function Harness() {
  const [view, setView] = useState<string>(new URLSearchParams(window.location.search).get('view') ?? 'book');

  const pillars = computeGoalPillars({
    goal: {
      id: 'g1',
      title: 'Run a 10k',
      description: 'Because my health carries everything else.',
      life_wheel_category: 'health_fitness',
      target_date: '2026-10-01',
      status_tag: 'on_track',
      plan_quality_score: 4,
      environment_score: 3,
      environment_last_audited_at: '2026-06-25T00:00:00Z',
    },
    steps: [{ completed: true }, { completed: false }, { completed: false }],
    habits: [{ goal_id: 'g1', domain_key: 'health_fitness' }],
    healthState: 'on_track',
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', top: 4, left: 4, zIndex: 9999, display: 'flex', gap: 4 }}>
        {['book', 'quickadd', 'meter'].map((v) => (
          <button key={v} onClick={() => setView(v)} style={{ fontSize: 11 }}>
            {v}
          </button>
        ))}
      </div>
      {view === 'book' ? (
        <CompassBookScreen currentIslandNumber={87} session={null} onClose={() => {}} />
      ) : null}
      {view === 'quickadd' ? (
        <QuickAddSheet
          session={null}
          goalOptions={[
            { id: 'g1', title: 'Run a 10k' },
            { id: 'g2', title: 'Read 20 books' },
          ]}
          onClose={() => setView('meter')}
        />
      ) : null}
      {view === 'meter' ? (
        <div style={{ maxWidth: 420, margin: '60px auto', background: '#fff', borderRadius: 16, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Goal pillar meter</h3>
          <GoalPillarMeter pillars={pillars} size="full" />
        </div>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
