import { useMemo, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import {
  getNextSpaceExcavatorCampaignMilestone,
  SPACE_EXCAVATOR_CAMPAIGN_MILESTONES,
  SPACE_EXCAVATOR_CAMPAIGN_TOTAL_POINTS,
} from '../../level-worlds/services/spaceExcavatorCampaignProgress';
import { resolveSpaceExcavatorClue, type SpaceExcavatorClueResult } from '../../level-worlds/services/spaceExcavatorClues';
import { resolveSpaceExcavatorDepthForBoard } from '../../level-worlds/services/spaceExcavatorDepths';
import { resolveSpaceExcavatorObjectTileIds } from '../../level-worlds/services/spaceExcavatorObjects';
import './spaceExcavator.css';

type Tile = { dug: boolean; objectPiece: boolean; bonusBomb: boolean; clueType: SpaceExcavatorClueResult['type'] };

type SpaceExcavatorProgressStatus = 'active' | 'board_complete' | 'completed';
type SpaceExcavatorProgress = {
  boardIndex: number;
  completedBoardCount: number;
  boardSize: number;
  treasureCount: number;
  treasureTileIds: number[];
  objectId?: string;
  objectName?: string;
  objectIcon?: string;
  objectTileIds?: number[];
  bonusBombTileIds?: number[];
  triggeredBonusBombTileIds?: number[];
  revealedObjectTileIds?: number[];
  dugTileIds: number[];
  foundTreasureTileIds: number[];
  status: SpaceExcavatorProgressStatus;
  eventProgressPoints?: number;
  claimedMilestoneIds?: string[];
};
type DigSpendResult = {
  ok: boolean;
  ticketsRemaining: number;
  progress?: SpaceExcavatorProgress | null;
  boardComplete?: boolean;
  canAdvanceBoard?: boolean;
  triggeredBomb?: boolean;
  revealedTileIds?: number[];
  bonusRevealCount?: number;
  failureReason?: 'missing_progress' | 'insufficient_tickets' | 'board_complete' | 'invalid_tile' | 'already_dug';
};
type AdvanceBoardResult = { ok: boolean; ticketsRemaining: number; progress?: SpaceExcavatorProgress | null };
type ClaimMilestoneRewardResult =
  | { ok: true; progress: SpaceExcavatorProgress; rewardLabel: string; failureReason?: never }
  | { ok: false; progress?: SpaceExcavatorProgress | null; rewardLabel?: string | null; failureReason?: string };

type SpaceExcavatorLaunchConfig = {
  requestDigSpend?: (tileId: number) => DigSpendResult;
  requestAdvanceBoard?: () => AdvanceBoardResult;
  requestClaimMilestoneReward?: (milestoneId: string) => ClaimMilestoneRewardResult;
  getTicketsRemaining?: () => number;
  initialProgress?: SpaceExcavatorProgress | null;
  totalBoards?: number;
};

function getProgressObjectTileIds(progress: SpaceExcavatorProgress | null | undefined): number[] {
  return progress ? resolveSpaceExcavatorObjectTileIds(progress) : [];
}

function getProgressBonusBombTileIds(progress: SpaceExcavatorProgress | null | undefined): number[] {
  return progress?.bonusBombTileIds ?? [];
}

function getObjectPieceCount(options: {
  progress: SpaceExcavatorProgress | null;
  initial: SpaceExcavatorProgress | null | undefined;
  islandNumber: number;
}): number {
  const { progress, initial, islandNumber } = options;
  const objectTileIds = getProgressObjectTileIds(progress).length > 0
    ? getProgressObjectTileIds(progress)
    : getProgressObjectTileIds(initial);
  return Math.max(1, Math.floor(objectTileIds.length || progress?.treasureCount || initial?.treasureCount || Math.max(3, Math.min(8, 3 + Math.floor(islandNumber / 8)))));
}

export function SpaceExcavatorMinigame({ onComplete, islandNumber, launchConfig }: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as SpaceExcavatorLaunchConfig;
  const initial = config.initialProgress;
  const totalBoards = Math.max(1, Math.floor(config.totalBoards ?? 10));
  const [progress, setProgress] = useState<SpaceExcavatorProgress | null>(initial ?? null);
  const size = Math.max(1, Math.floor(progress?.boardSize ?? initial?.boardSize ?? 5));
  const objectPieceCount = getObjectPieceCount({ progress, initial, islandNumber });

  const activeProgress = progress ?? initial ?? null;
  const activeObjectTileIds = useMemo(() => getProgressObjectTileIds(activeProgress), [activeProgress]);
  const activeBonusBombTileIds = useMemo(() => getProgressBonusBombTileIds(activeProgress), [activeProgress]);
  const tiles = useMemo<Tile[]>(() => {
    const activeDugTileIds = activeProgress?.dugTileIds ?? [];
    return Array.from({ length: size * size }, (_, i) => {
      const dug = activeDugTileIds.includes(i);
      const objectPiece = activeObjectTileIds.includes(i);
      const bonusBomb = activeBonusBombTileIds.includes(i);
      return {
        dug,
        objectPiece,
        bonusBomb,
        clueType: dug ? resolveSpaceExcavatorClue({ tileId: i, boardSize: size, objectTileIds: activeObjectTileIds }).type : 'cold',
      };
    });
  }, [activeBonusBombTileIds, activeObjectTileIds, activeProgress, size]);
  const [ticketsRemaining, setTicketsRemaining] = useState<number>(() => Math.max(0, Math.floor(config.getTicketsRemaining?.() ?? 0)));
  const [finished, setFinished] = useState(false);
  const [sentResult, setSentResult] = useState(false);
  const [showOutOfTickets, setShowOutOfTickets] = useState(false);
  const [claimPendingId, setClaimPendingId] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [latestClue, setLatestClue] = useState<SpaceExcavatorClueResult | null>(null);
  const [latestBombFeedback, setLatestBombFeedback] = useState<string | null>(null);

  const syncProgress = (nextProgress: SpaceExcavatorProgress) => {
    setProgress(nextProgress);
  };

  const found = useMemo(() => tiles.filter((t) => t.dug && t.objectPiece).length, [tiles]);
  const progressStatus = progress?.status ?? 'active';
  const boardComplete = progressStatus === 'board_complete' || progressStatus === 'completed';
  const canAdvanceBoard = progressStatus === 'board_complete';
  const currentBoard = (progress?.boardIndex ?? 0) + 1;
  const depth = resolveSpaceExcavatorDepthForBoard(currentBoard);
  const boardLabel = `Board ${currentBoard}${totalBoards > 1 ? ` / ${totalBoards}` : ''}`;
  const eventProgressPoints = Math.max(0, Math.floor(activeProgress?.eventProgressPoints ?? activeProgress?.completedBoardCount ?? 0));
  const eventProgressTotal = SPACE_EXCAVATOR_CAMPAIGN_TOTAL_POINTS;
  const eventProgressPercent = Math.min(100, Math.round((eventProgressPoints / eventProgressTotal) * 100));
  const nextMilestone = getNextSpaceExcavatorCampaignMilestone({ eventProgressPoints });
  const claimedMilestoneIds = activeProgress?.claimedMilestoneIds ?? [];
  const claimableMilestones = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.filter(
    (milestone) => eventProgressPoints >= milestone.pointsRequired && !claimedMilestoneIds.includes(milestone.id),
  );
  const firstClaimableMilestone = claimableMilestones[0] ?? null;
  const relicIcon = progress?.objectIcon ?? initial?.objectIcon ?? '❔';
  const relicName = progress?.objectName ?? initial?.objectName ?? 'Hidden Relic';

  const sendOnce = (completed: boolean) => {
    if (sentResult) return;
    setSentResult(true);
    setFinished(true);
    onComplete({ completed });
  };

  const onDig = (index: number) => {
    if (finished || boardComplete) return;
    if (tiles[index]?.dug) return;

    const spend = config.requestDigSpend?.(index) ?? { ok: false, ticketsRemaining, failureReason: ticketsRemaining < 1 ? 'insufficient_tickets' : undefined };
    setTicketsRemaining(spend.ticketsRemaining);

    if (spend.ok && spend.progress) {
      if (spend.triggeredBomb) {
        const bonusRevealCount = Math.max(0, Math.floor(spend.bonusRevealCount ?? 0));
        setLatestBombFeedback(`Bonus Bomb! ${bonusRevealCount} nearby tile${bonusRevealCount === 1 ? '' : 's'} cleared.`);
        setLatestClue(null);
      } else {
        setLatestBombFeedback(null);
        setLatestClue(resolveSpaceExcavatorClue({
          tileId: index,
          boardSize: spend.progress.boardSize,
          objectTileIds: getProgressObjectTileIds(spend.progress),
        }));
      }
      syncProgress(spend.progress);
      return;
    }
    if (!spend.ok && (spend.failureReason === 'insufficient_tickets' || spend.ticketsRemaining < 1)) {
      setShowOutOfTickets(true);
      return;
    }
  };

  const dismissOutOfTickets = () => {
    setShowOutOfTickets(false);
  };

  const onAdvanceBoard = () => {
    const advance = config.requestAdvanceBoard?.() ?? { ok: false, ticketsRemaining };
    setTicketsRemaining(advance.ticketsRemaining);
    if (advance.ok && advance.progress) {
      setLatestClue(null);
      setLatestBombFeedback(null);
      syncProgress(advance.progress);
    }
  };

  const onClaimMilestone = (milestoneId: string) => {
    if (claimPendingId) return;
    setClaimPendingId(milestoneId);
    setClaimMessage(null);
    const claim = config.requestClaimMilestoneReward?.(milestoneId) ?? { ok: false };
    if (claim.ok) {
      syncProgress(claim.progress);
      setClaimMessage(`Reward claimed: ${claim.rewardLabel}`);
    } else if (claim.failureReason === 'already_claimed') {
      if (claim.progress) syncProgress(claim.progress);
      setClaimMessage('Reward already claimed.');
    } else if (claim.failureReason === 'not_achieved') {
      if (claim.progress) syncProgress(claim.progress);
      setClaimMessage('Clear more boards to unlock this reward.');
    } else if (claim.failureReason === 'missing_event' || claim.failureReason === 'progress_not_found') {
      setClaimMessage('Progress data is temporarily unavailable. Please close and reopen Space Excavator.');
    } else if (claim.failureReason === 'missing_milestone') {
      if (claim.progress) syncProgress(claim.progress);
      setClaimMessage('This reward is unavailable.');
    } else {
      if (claim.progress) syncProgress(claim.progress);
      setClaimMessage('Could not claim this reward right now. Please try again.');
    }
    setClaimPendingId(null);
  };

  return (
    <section className={`space-excavator space-excavator--${depth.theme}`} aria-label="Space Excavator">
      <div className="space-excavator__hud">
        <span className="space-excavator__hud-chip">
          <small>Island</small>
          <strong>{islandNumber}</strong>
        </span>
        <span className="space-excavator__hud-chip">
          <small>Site</small>
          <strong>{boardLabel}</strong>
        </span>
        <span className="space-excavator__hud-chip space-excavator__hud-chip--accent">
          <small>Tickets</small>
          <strong>{ticketsRemaining}</strong>
        </span>
        <span className="space-excavator__hud-chip">
          <small>Pieces</small>
          <strong>{found}/{objectPieceCount}</strong>
        </span>
      </div>

      <div className="space-excavator__depth-banner" aria-label={`Depth ${depth.depthNumber}: ${depth.name}`}>
        <span className="space-excavator__depth-label">Depth {depth.depthNumber}: {depth.name}</span>
        <span className="space-excavator__depth-subtitle">{depth.subtitle}</span>
      </div>

      <div className="space-excavator__preview" aria-label="Hidden object preview">
        <div className="space-excavator__silhouette" aria-hidden="true">
          {relicIcon}
        </div>
        <div className="space-excavator__preview-copy">
          <p className="space-excavator__preview-title">Find: {relicName}</p>
          <p className="space-excavator__preview-progress">{found} / {objectPieceCount} pieces found</p>
          <div className="space-excavator__progress-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.round((found / objectPieceCount) * 100))}%` }} />
          </div>
        </div>
      </div>

      {latestBombFeedback ? (
        <div
          className="space-excavator__clue space-excavator__clue--bomb"
          role="status"
          aria-live="polite"
        >
          <span className="space-excavator__clue-label">Bonus Bomb!</span>
          <span className="space-excavator__clue-message">{latestBombFeedback}</span>
        </div>
      ) : latestClue && (
        <div
          className={`space-excavator__clue space-excavator__clue--${latestClue.tone}`}
          role="status"
          aria-live="polite"
        >
          <span className="space-excavator__clue-label">{latestClue.label}</span>
          <span className="space-excavator__clue-message">{latestClue.shortMessage}</span>
        </div>
      )}

      <div className="space-excavator__board-shell">
        <div className="space-excavator__board" style={{ gridTemplateColumns: `repeat(${size}, minmax(42px, clamp(48px, 15vmin, 68px)))` }}>
          {tiles.map((tile, i) => (
            <button
              key={i}
              type="button"
              className={`space-excavator__tile ${tile.dug ? (tile.objectPiece ? 'space-excavator__tile--object' : tile.bonusBomb ? 'space-excavator__tile--bomb' : `space-excavator__tile--dug space-excavator__tile--${tile.clueType}`) : ''}`}
              onClick={() => onDig(i)}
              disabled={finished || boardComplete || tile.dug}
              aria-label={`Tile ${i + 1}`}
            >
              {tile.dug ? (tile.objectPiece ? (progress?.objectIcon ?? initial?.objectIcon ?? '✦') : tile.bonusBomb ? '💣' : <span className="space-excavator__tile-marker" aria-hidden="true" />) : '⬛'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-excavator__event-progress" aria-label="Event progress">
        <div className="space-excavator__event-progress-header">
          <strong>Event progress</strong>
          <span>{eventProgressPoints} / {eventProgressTotal} boards cleared</span>
        </div>
        <div className="space-excavator__event-progress-bar" aria-hidden="true">
          <span style={{ width: `${eventProgressPercent}%` }} />
        </div>
        <div className="space-excavator__milestones" aria-label="Milestones">
          {SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.map((milestone) => {
            const achieved = eventProgressPoints >= milestone.pointsRequired;
            const claimed = claimedMilestoneIds.includes(milestone.id);
            const claimable = achieved && !claimed;
            const stateLabel = claimed ? 'Claimed' : claimable ? 'Claimable' : 'Locked';
            return (
              <div
                key={milestone.id}
                className={`space-excavator__milestone space-excavator__milestone--${claimed ? 'claimed' : claimable ? 'claimable' : 'locked'}`}
                title={`${milestone.pointsRequired} board${milestone.pointsRequired === 1 ? '' : 's'} cleared: ${milestone.rewardLabel}`}
              >
                <span>{milestone.pointsRequired} board{milestone.pointsRequired === 1 ? '' : 's'}</span>
                <small>{stateLabel}</small>
                <strong>{milestone.rewardLabel}</strong>
                {claimable && (
                  <button
                    type="button"
                    className="space-excavator__claim-button"
                    onClick={() => onClaimMilestone(milestone.id)}
                    disabled={claimPendingId === milestone.id}
                  >
                    Claim
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {claimMessage && (
          <p className="space-excavator__claim-message" role="status" aria-live="polite">{claimMessage}</p>
        )}
        <p className="space-excavator__next-reward">
          {nextMilestone ? `Next: ${nextMilestone.rewardLabel}` : 'All event milestones reached'}
        </p>
      </div>

      {showOutOfTickets && (
        <div
          className="space-excavator__modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) dismissOutOfTickets();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') dismissOutOfTickets();
          }}
        >
          <div
            className="space-excavator__ticket-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="space-excavator-out-of-tickets-title"
          >
            <p id="space-excavator-out-of-tickets-title" className="space-excavator__ticket-sheet-title">
              Out of Dig Tickets
            </p>
            <p className="space-excavator__ticket-sheet-body">
              Your dig site is saved. Return to Island Run, fill the reward bar, and earn more Space Excavator tickets to keep digging.
            </p>
            <p className="space-excavator__ticket-sheet-note">Every event ticket gives you one dig.</p>
            <p className="space-excavator__ticket-sheet-hint">Tip: Event tickets come from the Island Run reward bar.</p>
            <div className="space-excavator__ticket-sheet-actions">
              <button type="button" className="space-excavator__button space-excavator__button--primary" onClick={() => sendOnce(false)}>
                Back to Island Run
              </button>
              <button type="button" className="space-excavator__button" onClick={dismissOutOfTickets}>
                Stay here
              </button>
            </div>
          </div>
        </div>
      )}

      {boardComplete && (
        <div className="space-excavator__notice space-excavator__notice--success" role="status" aria-live="polite">
          <div className="space-excavator__relic-found">
            <div className="space-excavator__relic-found-icon" aria-hidden="true">{relicIcon}</div>
            <div>
              <p className="space-excavator__notice-title">Relic Found!</p>
              <p>{relicName}</p>
            </div>
          </div>
          <div className="space-excavator__clear-summary" aria-label="Board clear summary">
            <span>{progressStatus === 'completed' ? 'All boards cleared' : `Board ${currentBoard} cleared`}</span>
            <span>Event progress +1</span>
            {firstClaimableMilestone ? (
              <span className="space-excavator__clear-summary-claimable">
                New reward available: {firstClaimableMilestone.rewardLabel}
              </span>
            ) : (
              <span>No new reward available yet</span>
            )}
          </div>
          {canAdvanceBoard && (
            <div className="space-excavator__actions">
              <button type="button" className="space-excavator__button" onClick={onAdvanceBoard}>Continue to next board</button>
            </div>
          )}
        </div>
      )}

      <div className="space-excavator__actions">
        <button type="button" className="space-excavator__button" onClick={() => sendOnce(false)} disabled={finished}>Close</button>
      </div>
    </section>
  );
}
