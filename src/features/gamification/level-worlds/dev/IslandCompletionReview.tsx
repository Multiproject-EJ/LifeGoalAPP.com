/** Standalone, read-only QA fixtures. No account, storage, action or production route. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../LevelWorlds.css';
import { IslandMissionBriefingModal } from '../components/IslandMissionBriefingModal';
import { resolveIslandMissionTrackerPresentation } from '../services/islandRunMissionTracker';

const ready = new URLSearchParams(location.search).get('case') === 'ready';
const tracker = resolveIslandMissionTrackerPresentation({ islandNumber: 2, state: {
  currentIslandNumber: 2, cycleIndex: 0, bossTrialResolvedIslandNumber: ready ? 2 : null,
  stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: ready, buildComplete: true })),
  stopBuildStateByIndex: Array.from({ length: 5 }, () => ({ buildLevel: 3, requiredEssence: 100, spentEssence: 100 })),
  perIslandEggs: ready ? { '2': { tier: 'common', status: 'collected', setAtMs: 1, hatchAtMs: 2 } } : {},
  signatureMissionProgressByIsland: {},
} });
function CompletionReview() {
  const [open, setOpen] = React.useState(true);
  return <>
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Completion UI check</h1><p>Isolated fixtures · no player data is read or changed.</p>
      <p>{ready ? 'Genuinely complete island' : 'L3 buildings, unfinished activities and egg'}</p>
      <a href="?case=builds-only">Built only</a> · <a href="?case=ready">Ready to travel</a>
      <p><button onClick={() => setOpen(true)}>Open mission phone</button></p>
    </main>
    <IslandMissionBriefingModal isOpen={open} presentation={tracker.briefing}
      progress={tracker.objectives} overallProgressPercent={tracker.overallProgressPercent}
      islandCompletion={tracker.islandCompletion} onAcknowledge={() => setOpen(false)} />
  </>;
}
createRoot(document.getElementById('root')!).render(<CompletionReview />);
