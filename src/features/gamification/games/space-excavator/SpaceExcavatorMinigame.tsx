import { useMemo, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import {
  getNextSpaceExcavatorCampaignMilestone,
  SPACE_EXCAVATOR_CAMPAIGN_MILESTONES,
  SPACE_EXCAVATOR_CAMPAIGN_TOTAL_POINTS,
} from '../../level-worlds/services/spaceExcavatorCampaignProgress';
import { resolveSpaceExcavatorObjectTileIds } from '../../level-worlds/services/spaceExcavatorObjects';
import './spaceExcavator.css';

type Tile = { dug: boolean; objectPiece: boolean };

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
  revealedObjectTileIds?: number[];
  dugTileIds: number[];
  foundTreasureTileIds: number[];
  status: SpaceExcavatorProgressStatus;
  eventProgressPoints?: number;
  claimedMilestoneIds?: string[];
};
type DigSpendResult = { ok: boolean; ticketsRemaining: number; progress?: SpaceExcavatorProgress | null; boardComplete?: boolean; canAdvanceBoard?: boolean };
type AdvanceBoardResult = { ok: boolean; ticketsRemaining: number; progress?: SpaceExcavatorProgress | null };
type ClaimMilestoneRewardResult = { ok: boolean; progress?: SpaceExcavatorProgress | null; rewardLabel?: string | null; failureReason?: string };

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
  const tiles = useMemo<Tile[]>(() => {
    const activeObjectTileIds = getProgressObjectTileIds(activeProgress);
    const activeDugTileIds = activeProgress?.dugTileIds ?? [];
    return Array.from({ length: size * size }, (_, i) => ({ dug: activeDugTileIds.includes(i), objectPiece: activeObjectTileIds.includes(i) }));
  }, [activeProgress, size]);
  const [ticketsRemaining, setTicketsRemaining] = useState<number>(() => Math.max(0, Math.floor(config.getTicketsRemaining?.() ?? 0)));
  const [finished, setFinished] = useState(false);
  const [sentResult, setSentResult] = useState(false);
  const [showOutOfTickets, setShowOutOfTickets] = useState(false);
  const [claimPendingId, setClaimPendingId] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const syncProgress = (nextProgress: SpaceExcavatorProgress) => {
    setProgress(nextProgress);
  };

  const found = useMemo(() => tiles.filter((t) => t.dug && t.objectPiece).length, [tiles]);
  const progressStatus = progress?.status ?? 'active';
  const boardComplete = progressStatus === 'board_complete' || progressStatus === 'completed';
  const canAdvanceBoard = progressStatus === 'board_complete';
  const boardLabel = `Board ${Math.max(1, Math.floor((progress?.boardIndex ?? 0) + 1))}${totalBoards > 1 ? ` / ${totalBoards}` : ''}`;
  const eventProgressPoints = Math.max(0, Math.floor(activeProgress?.eventProgressPoints ?? activeProgress?.completedBoardCount ?? 0));
  const eventProgressTotal = SPACE_EXCAVATOR_CAMPAIGN_TOTAL_POINTS;
  const eventProgressPercent = Math.min(100, Math.round((eventProgressPoints / eventProgressTotal) * 100));
  const nextMilestone = getNextSpaceExcavatorCampaignMilestone({ eventProgressPoints });
  const claimedMilestoneIds = activeProgress?.claimedMilestoneIds ?? [];

  const sendOnce = (completed: boolean) => {
    if (sentResult) return;
    setSentResult(true);
    setFinished(true);
    onComplete({ completed });
  };

  const onDig = (index: number) => {
    if (finished || boardComplete) return;
    if (tiles[index]?.dug) return;

    const spend = config.requestDigSpend?.(index) ?? { ok: false, ticketsRemaining };
    setTicketsRemaining(spend.ticketsRemaining);

    if (spend.ok && spend.progress) {
      syncProgress(spend.progress);
      return;
    }
    if (!spend.ok) {
      setShowOutOfTickets(true);
      return;
    }
  };

  const onAdvanceBoard = () => {
    const advance = config.requestAdvanceBoard?.() ?? { ok: false, ticketsRemaining };
    setTicketsRemaining(advance.ticketsRemaining);
    if (advance.ok && advance.progress) {
      syncProgress(advance.progress);
    }
  };

  const onClaimMilestone = (milestoneId: string) => {
    if (claimPendingId) return;
    setClaimPendingId(milestoneId);
    const claim = config.requestClaimMilestoneReward?.(milestoneId) ?? { ok: false };
    if (claim.progress) {
      syncProgress(claim.progress);
    }
    if (claim.ok) {
      setClaimMessage(`Claimed ${claim.rewardLabel ?? 'reward'}!`);
    } else if (claim.failureReason === 'already_claimed') {
      setClaimMessage('Reward already claimed.');
    } else if (claim.failureReason === 'not_achieved') {
      setClaimMessage('Clear more boards to unlock this reward.');
    }
    setClaimPendingId(null);
  };

  return (
    <section className="space-excavator" aria-label="Space Excavator">
      <div className="space-excavator__hud">
        <span>Island {islandNumber}</span>
        <span>{boardLabel}</span>
        <span>Tickets: {ticketsRemaining}</span>
        <span>Pieces found: {found}/{objectPieceCount}</span>
      </div>

      <div className="space-excavator__preview" aria-label="Hidden object preview">
        <div className="space-excavator__silhouette" aria-hidden="true">
          {progress?.objectIcon ?? initial?.objectIcon ?? '❔'}
        </div>
        <div>
          <p className="space-excavator__preview-title">Find: {progress?.objectName ?? initial?.objectName ?? 'Hidden Relic'}</p>
          <p className="space-excavator__preview-progress">{found} / {objectPieceCount} pieces found</p>
          <div className="space-excavator__progress-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.round((found / objectPieceCount) * 100))}%` }} />
          </div>
        </div>
      </div>

      <div className="space-excavator__event-progress" aria-label="Event progress">
        <div className="space-excavator__event-progress-header">
          <strong>Event progress</strong>
          <span>{eventProgressPoints} / {eventProgressTotal}</span>
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
                title={`${milestone.pointsRequired}: ${milestone.rewardLabel}`}
              >
                <span>{milestone.pointsRequired}</span>
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

      <div className="space-excavator__board" style={{ gridTemplateColumns: `repeat(${size}, 44px)` }}>
        {tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            className={`space-excavator__tile ${tile.dug ? (tile.objectPiece ? 'space-excavator__tile--object' : 'space-excavator__tile--dug') : ''}`}
            onClick={() => onDig(i)}
            disabled={finished || boardComplete || tile.dug}
            aria-label={`Tile ${i + 1}`}
          >
            {tile.dug ? (tile.objectPiece ? (progress?.objectIcon ?? initial?.objectIcon ?? '✦') : '·') : '⬛'}
          </button>
        ))}
      </div>

      {showOutOfTickets && (
        <div className="space-excavator__notice" role="status" aria-live="polite">
          <p><strong>Out of Space Excavator tickets</strong></p>
          <p>Earn more from the Island Run reward bar, then come back and keep digging.</p>
          <div className="space-excavator__actions">
            <button type="button" className="space-excavator__button" onClick={() => sendOnce(false)}>Back to Island Run</button>
            <button type="button" className="space-excavator__button" onClick={() => setShowOutOfTickets(false)}>Keep looking</button>
          </div>
        </div>
      )}

      {boardComplete && (
        <div className="space-excavator__notice space-excavator__notice--success" role="status" aria-live="polite">
          <p><strong>{progressStatus === 'completed' ? 'All boards cleared' : 'Board cleared'}</strong></p>
          <p>{progress?.objectName ?? initial?.objectName ?? 'Hidden Relic'} found {found}/{objectPieceCount}.</p>
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
