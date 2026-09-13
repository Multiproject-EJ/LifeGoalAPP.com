import React from 'react';
import { createRoot } from 'react-dom/client';
import { IslandMissionBriefingModal } from '/src/features/gamification/level-worlds/components/IslandMissionBriefingModal';
import { resolveIslandMissionTrackerPresentation } from '/src/features/gamification/level-worlds/services/islandRunMissionTracker';
import '/src/features/gamification/level-worlds/LevelWorlds.css';
const tracker = resolveIslandMissionTrackerPresentation({ islandNumber: 3, state: {
  currentIslandNumber: 3, cycleIndex: 0, bossTrialResolvedIslandNumber: null, perIslandEggs: {}, signatureMissionProgressByIsland: {},
  stopStatesByIndex: Array.from({length: 5}, () => ({ objectiveComplete: false, buildComplete: false })),
  stopBuildStateByIndex: Array.from({length: 5}, () => ({requiredEssence: 100, spentEssence: 100, buildLevel: 3})),
}});
function Preview() {
  const [open, setOpen] = React.useState(true);
  return <><p>Read-only fixture: five L3 buildings, activities unfinished.</p><IslandMissionBriefingModal isOpen={open} presentation={tracker.briefing} progress={tracker.objectives} overallProgressPercent={tracker.overallProgressPercent} objectiveDetails={['Land on drill symbols to earn spins.', 'All five buildings are level 3.', 'Complete the activities and collect or sell all Hatchery eggs.']} onObjectiveSelect={() => undefined} onAcknowledge={() => setOpen(false)} /></>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
