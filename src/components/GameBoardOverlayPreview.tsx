import { useState } from 'react';
import { GameBoardOverlay } from './GameBoardOverlay';
import type { TwoTracksToday } from '../features/gamification/level-worlds/services/twoTracksDaily';
import '../styles/game-board-overlay.css';

/** Development-only preview of the Two Tracks overlay. Never reads or writes player data. */
export default function GameBoardOverlayPreview() {
  const params = new URLSearchParams(window.location.search);
  const island = Number.parseInt(params.get('island') ?? '4', 10) || 4;
  const log = (what: string) => () => console.info(`[overlay preview] ${what}`);
  // ?today=none|life|game|both &spark=1 &done=N (habits checked today) &chest=1 &nudge=life|game
  const todayMode = params.get('today') ?? 'none';
  const habitsDone = Number.parseInt(params.get('done') ?? (todayMode === 'life' || todayMode === 'both' ? '2' : '0'), 10);
  const [sparkPending, setSparkPending] = useState(params.get('spark') === '1');
  const today: TwoTracksToday = {
    lifeDone: todayMode === 'life' || todayMode === 'both',
    gameDone: todayMode === 'game' || todayMode === 'both',
    bothDone: todayMode === 'both',
    sparkPending: todayMode === 'both' && sparkPending,
    streak: todayMode === 'both' ? 3 : 0,
    sparkXpToday: todayMode === 'both' ? 14 : 0,
    balanceNudge: params.get('nudge') === 'life' || params.get('nudge') === 'game'
      ? { lane: params.get('nudge') as 'life' | 'game', daysBehind: 3 }
      : null,
  };
  return (
    <GameBoardOverlay
      isOpen
      onClose={log('close')}
      onPlayClick={log('play')}
      onTopbarClick={log('today')}
      onActionsClick={log('actions')}
      onCreatureCollectionClick={log('breathe')}
      onSpinWinClick={log('score')}
      onGarageClick={log('garage')}
      onCompassClick={log('menu')}
      islandNumber={island}
      islandDisplayName={`Island ${String(island).padStart(3, '0')}`}
      essenceBalance={1240}
      spotlightPlay={params.get('spotlight') === '1'}
      realLife={{
        isAuthenticated: true,
        goals: [
          { id: 'g1', title: 'Run a half marathon', status: 'active' },
          { id: 'g2', title: 'Read 12 books', status: 'active' },
          { id: 'g3', title: 'Save a travel fund', status: 'completed' },
        ],
        habits: [
          { id: 'h1', title: 'Morning walk' },
          { id: 'h2', title: 'Read 10 pages' },
          { id: 'h3', title: 'Stretch' },
        ],
        habitCheckInsToday: habitsDone,
        habitCheckInsTotal: 40,
      }}
      twoTracksToday={today}
      twoTracksSparkXp={60}
      onTwoTracksSparkSeen={() => setSparkPending(false)}
      journeyChest={params.get('chest') === '1'
        ? { claimableThreshold: 5, rewardPreviewLabel: '10 dice', ctaLabel: 'Claim Lv 5 chest' } : null}
    />
  );
}
