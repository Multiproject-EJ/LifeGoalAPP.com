/**
 * Dev-only visual harness for the Compass Book + quick-add + pillar meter.
 * Served via compass-preview.html on the dev server only — never linked from
 * the app and excluded from the production build inputs.
 */
import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CompassBookScreen } from '../features/compass-book/components/CompassBookScreen';
import { DEMO_ISLAND_NUMBER } from '../features/compass-book/content/demoBook';
import type { CompassBookChapterId } from '../features/compass-book/types';
import { parseCompassBookPresentationMode } from '../features/compass-book/logic/presentation';
import { QuickAddSheet } from '../components/QuickAddSheet';
import { GoalPillarMeter } from '../features/goals/GoalPillarMeter';
import { MyQuestHub } from '../features/goals/MyQuestHub';
import { createDemoSession } from '../services/demoSession';
import { computeGoalPillars } from '../features/goals/goalPillars';
import '../index.css';

function Harness() {
  const [inscribeOpen, setInscribeOpen] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const [view, setView] = useState<string>(params.get('view') ?? 'book');
  // `?demo=1` opens the book pre-filled with sample answers.
  const demo = params.get('demo') === '1';
  // `?activity=living_wheel.a01` deep-links into a fragment for interaction QA.
  const activity = params.get('activity') ?? undefined;
  // `?chapter=personal_playbook` opens a specific one-page chapter graphic.
  const chapter = (params.get('chapter') ?? undefined) as CompassBookChapterId | undefined;
  const entranceDuration = Number(params.get('entrance_ms'));
  const islandOverride = Number(params.get('island'));
  const previewIsland = Number.isFinite(islandOverride) && islandOverride > 0
    ? islandOverride
    : demo
      ? DEMO_ISLAND_NUMBER
      : 87;

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
        <CompassBookScreen
          currentIslandNumber={previewIsland}
          session={null}
          initialChapterId={chapter ?? (activity ? 'living_wheel' : undefined)}
          initialActivityId={activity}
          presentationContext={params.get('context') === 'island_run' ? 'island_run' : 'pwa'}
          initialPresentationMode={
            params.has('presentation')
              ? parseCompassBookPresentationMode(params.get('presentation'))
              : undefined
          }
          islandEntranceDurationMs={
            Number.isFinite(entranceDuration) && entranceDuration > 0
              ? entranceDuration
              : undefined
          }
          // `?page=quest_ledger` opens straight onto the Quest Ledger page.
          initialPageId={params.get('page') === 'quest_ledger' ? 'quest_ledger' : undefined}
          questLedger={{
            entries: [
              { id: 'quest-compass', title: 'Wheel Pulse', glyph: '⌁', note: 'A reading of your six life forces.', onSelect: () => {} },
              { id: 'starter-quest', title: 'Starter Quest', glyph: '✧', note: 'Shape the first ritual of a new path.', onSelect: () => {} },
              { id: 'body', title: 'Health Goals', glyph: '✚', note: 'The vessel that carries every quest.', stamp: { label: 'Soon', kind: 'soon' }, onSelect: () => {} },
              { id: 'habits', title: 'Habits', glyph: '↻', note: 'The rituals that carry your days.', onSelect: () => {} },
              { id: 'routines', title: 'Routines', glyph: '⧉', note: 'Sequences polished into ceremony.', stamp: { label: 'Demo', kind: 'demo' }, onSelect: () => {} },
              { id: 'support', title: 'Goals', glyph: '◎', note: 'The quest lines you have sworn to.', onSelect: () => {} },
              { id: 'planning', title: 'Check-ins', glyph: '✓', note: 'Take a fresh reading of the wheel.', onSelect: () => {} },
              { id: 'contracts', title: 'Contracts', glyph: '✎\uFE0E', note: 'Promises sealed in your own hand.', onSelect: () => {} },
            ],
            onInscribe: () => setInscribeOpen(true),
            // `?hub=live` mounts the real MyQuestHub (demo session, fetches may
            // land in empty states — fine for previewing the ledger reskin).
            hub:
              params.get('hub') === 'live' ? (
                <MyQuestHub
                  session={createDemoSession()}
                  onOpenStarterQuest={() => {}}
                  onOpenCheckins={() => {}}
                  onOpenGoals={() => {}}
                />
              ) : (
                <div style={{ padding: '8px 0' }}>
                  <GoalPillarMeter pillars={pillars} size="full" />
                </div>
              ),
          }}
          hasBlockingOverlay={inscribeOpen}
          allowDemo
          initialDemo={demo}
          onClose={() => {}}
        />
      ) : null}
      {inscribeOpen ? (
        <QuickAddSheet
          session={createDemoSession()}
          initialMode="habit"
          goalOptions={[{ id: 'g1', title: 'Run a 10k' }]}
          onClose={() => setInscribeOpen(false)}
        />
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

declare global {
  interface Window {
    __compassPreviewRoot?: Root;
  }
}

const previewRoot = window.__compassPreviewRoot
  ?? createRoot(document.getElementById('root')!);
window.__compassPreviewRoot = previewRoot;
previewRoot.render(<Harness />);
