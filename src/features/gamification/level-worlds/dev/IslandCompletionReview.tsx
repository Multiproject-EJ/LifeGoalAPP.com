/** Standalone, read-only QA fixtures. No account, storage, action or production route. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../LevelWorlds.css';
import { IslandMissionBriefingModal } from '../components/IslandMissionBriefingModal';
import { resolveIslandMissionTrackerPresentation } from '../services/islandRunMissionTracker';
import type { PerIslandEggEntry, PerIslandEggsLedger } from '../services/islandRunGameStateStore';

const params = new URLSearchParams(location.search);
const ready = params.get('case') === 'ready';
// ?island=115&egg=mythic previews other phone stats (stance, difficulty, egg tier).
const islandNumber = Math.max(1, Number(params.get('island')) || 2);
const eggParam = params.get('egg');
const eggTier: PerIslandEggEntry['tier'] | null = eggParam === 'common' || eggParam === 'rare' || eggParam === 'mythic' ? eggParam : null;
const reviewEggs: PerIslandEggsLedger = eggTier
  ? { [String(islandNumber)]: { tier: eggTier, status: 'incubating', setAtMs: 1, hatchAtMs: 2 } }
  : ready ? { [String(islandNumber)]: { tier: 'common', status: 'collected', setAtMs: 1, hatchAtMs: 2 } } : {};
const tracker = resolveIslandMissionTrackerPresentation({ islandNumber, state: {
  currentIslandNumber: islandNumber, cycleIndex: 0, bossTrialResolvedIslandNumber: ready ? islandNumber : null,
  stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: ready, buildComplete: true })),
  stopBuildStateByIndex: Array.from({ length: 5 }, () => ({ buildLevel: 3, requiredEssence: 100, spentEssence: 100 })),
  perIslandEggs: reviewEggs,
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
      islandCompletion={tracker.islandCompletion} stats={tracker.stats} onAcknowledge={() => setOpen(false)} />
  </>;
}
createRoot(document.getElementById('root')!).render(<CompletionReview />);
