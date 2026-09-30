/** Standalone, read-only QA fixtures. No account, storage, action or production route. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../LevelWorlds.css';
import { IslandMissionBriefingModal } from '../components/IslandMissionBriefingModal';
import { MandateEggBasketOverlay } from '../components/MandateEggBasketOverlay';
import { MinigameRatingModal } from '../components/MinigameRatingModal';
import { PuzzleCollectionModal } from '../components/PuzzleCollectionModal';
import { getEventRotationTemplates } from '../services/islandRunEventEngine';
import { resolvePuzzleCollectionView } from '../services/puzzleCollection';
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
// ?message=1 opens with an incoming message (fullscreen); the Messages button opens the modal.
const reviewMessages = [
  { id: 'review:incoming', islandNumber, cycleIndex: 0, sender: 'Central Command', title: 'Get ready, it’s time to kick off the Arena Games',
    body: 'The mandate is signed. Your first eggs are in the basket — now open the Arena and play your first round.',
    stepLabels: ['Set an egg at the Hatchery', 'Build Landmarks', 'Play one Arena round'], receivedAtMs: Date.now() - 60_000, readAtMs: null },
  { id: 'review:older', islandNumber, cycleIndex: 0, sender: 'Central Command', title: 'Welcome to the island',
    body: 'Build every landmark to Level 3.', stepLabels: ['Build Landmarks'], receivedAtMs: Date.now() - 3_600_000, readAtMs: 1 },
];
// ?basket=1 plays the Island 001 mandate egg basket into a stand-in egg column.
function BasketReview() {
  const [playing, setPlaying] = React.useState(true);
  return <main style={{ minHeight: '100vh', background: '#0c2336', color: '#fff', fontFamily: 'system-ui' }}>
    <div className="island-run-board__rewardbar-hatchery-tray" style={{ position: 'fixed', left: 8, top: 300, width: 44, height: 132, borderRadius: 22, background: 'rgba(255,255,255,0.16)' }} />
    <p style={{ padding: 24 }}>{playing ? 'Playing…' : 'Done — the phone would ring now.'}</p>
    {playing ? <MandateEggBasketOverlay onDone={() => setPlaying(false)} /> : null}
  </main>;
}
function CompletionReview() {
  const [open, setOpen] = React.useState(true);
  const [messages, setMessages] = React.useState(reviewMessages);
  return <>
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Completion UI check</h1><p>Isolated fixtures · no player data is read or changed.</p>
      <p>{ready ? 'Genuinely complete island' : 'L3 buildings, unfinished activities and egg'}</p>
      <a href="?case=builds-only">Built only</a> · <a href="?case=ready">Ready to travel</a>
      <p><button onClick={() => setOpen(true)}>Open mission phone</button></p>
    </main>
    <IslandMissionBriefingModal isOpen={open} presentation={tracker.briefing}
      progress={tracker.objectives} overallProgressPercent={tracker.overallProgressPercent}
      islandCompletion={tracker.islandCompletion} stats={tracker.stats} onAcknowledge={() => setOpen(false)}
      messages={messages} openMessageId={params.get('message') === '1' ? 'review:incoming' : null}
      onMessageRead={(id) => setMessages((all) => all.map((entry) => (entry.id === id ? { ...entry, readAtMs: Date.now() } : entry)))} />
  </>;
}
// ?rating=1 shows the optional event mini game rating.
function RatingReview() {
  const [result, setResult] = React.useState<string>('');
  return <main style={{ minHeight: '100vh', background: '#0c2336', color: '#fff', fontFamily: 'system-ui', padding: 24 }}>
    <p>{result || 'Rating open'}</p>
    {!result ? <MinigameRatingModal gameName="Space Excavator" gameIcon="◇" onSubmit={(rating) => setResult(`Sent ${rating}`)} onSkip={() => setResult('Skipped')} /> : null}
  </main>;
}
// ?puzzle=1 shows the Island 015 Puzzle Collection (3 of 5 pieces, two finished puzzles).
function PuzzleReview() {
  const templates = getEventRotationTemplates();
  const view = resolvePuzzleCollectionView({
    fragments: Number(params.get('pieces') ?? 3),
    stickerInventory: { [templates[0]!.stickerId]: 2, [templates[2]!.stickerId]: 1 },
    activeEventId: `${templates[1]!.eventId}:1`,
  });
  return <main style={{ minHeight: '100vh', background: '#0c2336' }}><PuzzleCollectionModal view={view} bonusDice={100} bonusMoney={50} onClose={() => undefined} /></main>;
}
createRoot(document.getElementById('root')!).render(params.get('basket') === '1' ? <BasketReview /> : params.get('rating') === '1' ? <RatingReview /> : params.get('puzzle') === '1' ? <PuzzleReview /> : <CompletionReview />);
