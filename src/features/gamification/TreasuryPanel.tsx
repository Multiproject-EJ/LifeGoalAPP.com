import type { Session } from '@supabase/supabase-js';
import type { LevelInfo } from '../../types/gamification';
import { useIslandRunState } from './level-worlds/hooks/useIslandRunState';
import { isPuzzleCollectionAvailableForIsland } from './level-worlds/services/islandRunContractV2RewardBar';
import { resolvePuzzleCollectionView } from './level-worlds/services/puzzleCollection';
import { GRADUAL_PUZZLE_INTRODUCTION_ISLAND } from './level-worlds/services/islandRunFeatureAccess';
import './TreasuryPanel.css';

/**
 * Score › Bank as a Treasury (user decision 2026-10-03): only two pockets.
 *
 * Game pocket — what the islands run on, read from the canonical Island Run
 * store. Player-facing names differ from the stored fields: Money is
 * `essence`, Essence is `shards`.
 * Life pocket — XP/level (a score, never spent) and Zen tokens (meditation).
 *
 * Gold, diamonds, old shards, spin tokens, hearts and shields are retired and
 * deliberately not shown. Read-only: nothing here writes gameplay state.
 */

interface TreasuryRow {
  id: string;
  icon: string;
  label: string;
  value: string;
  detail?: string;
  earn: string;
  spend: string;
  locked?: boolean;
}

const format = new Intl.NumberFormat();

function TreasuryTile({ row }: { row: TreasuryRow }) {
  return (
    <article className={`treasury__tile${row.locked ? ' treasury__tile--locked' : ''}`} data-currency={row.id}>
      <div className="treasury__tile-head">
        <span className="treasury__tile-icon" aria-hidden="true">{row.icon}</span>
        <h4 className="treasury__tile-label">{row.label}</h4>
        <strong className="treasury__tile-value">{row.value}</strong>
      </div>
      {row.detail && <p className="treasury__tile-detail">{row.detail}</p>}
      <dl className="treasury__tile-flow">
        <div><dt>Earn</dt><dd>{row.earn}</dd></div>
        <div><dt>Spend</dt><dd>{row.spend}</dd></div>
      </dl>
    </article>
  );
}

export function TreasuryPanel({
  session,
  totalXp,
  levelInfo,
  zenTokens,
}: {
  session: Session;
  totalXp: number;
  levelInfo: LevelInfo | null;
  zenTokens: number;
}) {
  const { state } = useIslandRunState(session, null);
  const eventId = state.activeTimedEvent?.eventId ?? null;
  const tickets = eventId ? state.minigameTicketsByEvent[eventId] ?? 0 : null;
  const puzzleOpen = isPuzzleCollectionAvailableForIsland(state.currentIslandNumber, state.signatureMissionProgressByIsland);
  const puzzle = puzzleOpen
    ? resolvePuzzleCollectionView({
      fragments: state.stickerProgress.fragments,
      stickerInventory: state.stickerInventory,
      activeEventId: eventId,
    })
    : null;

  const gameRows: TreasuryRow[] = [
    {
      id: 'money',
      icon: '💵',
      label: 'Money',
      value: format.format(state.essence),
      earn: 'Board tiles, treasure chests and events',
      spend: 'Building landmarks and island stops',
    },
    {
      id: 'essence',
      icon: '✨',
      label: 'Essence',
      value: format.format(state.shards),
      earn: 'Hatching and selling eggs, feasts, Lucky Roll and events',
      spend: 'Evolving your creatures into new forms',
    },
    {
      id: 'dice',
      icon: '🎲',
      label: 'Dice',
      value: format.format(state.dicePool),
      earn: 'Habit check-ins, the Task Tower, daily treats and the refill',
      spend: 'Rolling on the island board',
    },
    {
      id: 'tickets',
      icon: '🎟️',
      label: 'Event tickets',
      value: tickets === null ? '—' : format.format(tickets),
      detail: tickets === null ? 'No event running right now.' : 'For the event running now; they reset when it ends.',
      earn: 'Event tiles on the board',
      spend: 'Event mini-games',
    },
    puzzle
      ? {
        id: 'puzzle',
        icon: '🧩',
        label: 'Puzzle',
        value: `${puzzle.piecesPlaced}/${puzzle.piecesPerPuzzle}`,
        detail: `${format.format(puzzle.completedPuzzles)} puzzle${puzzle.completedPuzzles === 1 ? '' : 's'} finished · now: ${puzzle.current.template.icon} ${puzzle.current.template.displayName}`,
        earn: 'Event reward bars and traffic lights',
        spend: 'Finishing pictures; each one pays dice and Money',
      }
      : {
        id: 'puzzle',
        icon: '🧩',
        label: 'Puzzle',
        value: '🔒',
        detail: `Opens on Island ${GRADUAL_PUZZLE_INTRODUCTION_ISLAND}.`,
        earn: 'Event reward bars and traffic lights',
        spend: 'Finishing pictures; each one pays dice and Money',
        locked: true,
      },
  ];

  const xpToNext = levelInfo ? Math.max(0, levelInfo.xpForNextLevel - levelInfo.currentXP) : null;
  const lifeRows: TreasuryRow[] = [
    {
      id: 'xp',
      icon: '⭐',
      label: levelInfo ? `Level ${levelInfo.currentLevel}` : 'Level',
      value: `${format.format(totalXp)} XP`,
      detail: xpToNext !== null && levelInfo ? `${format.format(xpToNext)} XP to level ${levelInfo.currentLevel + 1}` : undefined,
      earn: 'Habits, goals, journaling and check-ins',
      spend: 'Never spent: it is your score',
    },
    {
      id: 'zen',
      icon: '🪷',
      label: 'Zen tokens',
      value: format.format(zenTokens),
      earn: 'Meditation sessions',
      spend: 'Your Zen Garden',
    },
  ];

  return (
    <section className="treasury" aria-labelledby="treasury-title">
      <header className="treasury__header">
        <p className="treasury__eyebrow">✦ Treasury</p>
        <h2 id="treasury-title" className="treasury__title">Everything you hold</h2>
        <p className="treasury__subtitle">
          Real-life effort feeds your game: habits and the Task Tower roll in dice, meditation grows your Zen Garden.
        </p>
      </header>

      <div className="treasury__pocket treasury__pocket--game">
        <h3 className="treasury__pocket-title"><span aria-hidden="true">🏝️</span> Game pocket</h3>
        <div className="treasury__grid">
          {gameRows.map((row) => <TreasuryTile key={row.id} row={row} />)}
        </div>
      </div>

      <div className="treasury__pocket treasury__pocket--life">
        <h3 className="treasury__pocket-title"><span aria-hidden="true">🌱</span> Life pocket</h3>
        <div className="treasury__grid">
          {lifeRows.map((row) => <TreasuryTile key={row.id} row={row} />)}
        </div>
      </div>
    </section>
  );
}
