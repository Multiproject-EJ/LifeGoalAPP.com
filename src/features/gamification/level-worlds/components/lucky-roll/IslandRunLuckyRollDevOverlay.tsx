import { useMemo, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  getIslandRunLuckyRollSessionKey,
  type IslandRunGameStateRecord,
  type IslandRunLuckyRollRewardEntry,
  type IslandRunLuckyRollSession,
} from '../../services/islandRunGameStateStore';
import type { IslandRunRuntimeState } from '../../services/islandRunRuntimeState';
import {
  getIslandRunLuckyRollBoardConfig,
  getIslandRunLuckyRollTileConfig,
  type IslandRunLuckyRollTileKind,
} from '../../services/islandRunLuckyRollBoardConfig';
import {
  advanceIslandRunLuckyRoll,
  bankIslandRunLuckyRollRewards,
  startIslandRunLuckyRoll,
} from '../../services/islandRunLuckyRollAction';
import './IslandRunLuckyRollDevOverlay.css';

const DEV_TREASURE_PATH_ROLL_SEQUENCE = [3, 4, 2, 5, 1, 6] as const;

type DevLuckyRollActionStatus = 'idle' | 'pending';

interface IslandRunLuckyRollDevOverlayProps {
  session: Session;
  client: SupabaseClient | null;
  runtimeState: IslandRunRuntimeState;
  targetIslandNumber: number;
  isDevModeEnabled: boolean;
  collectMode?: 'bank_only' | 'post_rare_collect_travel';
  onRuntimeStateChange: (record: IslandRunGameStateRecord) => void;
  onCollectPostRareTreasurePathAndTravel?: (completedIslandNumber: number, completedCycleIndex: number) => Promise<string>;
  onClose: () => void;
}

function normalizeIslandNumber(targetIslandNumber: number): number {
  return Number.isFinite(targetIslandNumber) ? Math.max(1, Math.floor(targetIslandNumber)) : 1;
}

function sumRewards(rewards: IslandRunLuckyRollRewardEntry[], rewardType: IslandRunLuckyRollRewardEntry['rewardType']): number {
  return rewards
    .filter((entry) => entry.rewardType === rewardType)
    .reduce((total, entry) => total + Math.max(0, Math.floor(entry.amount)), 0);
}

function getTreasurePathFieldIcon(kind: IslandRunLuckyRollTileKind): string {
  switch (kind) {
    case 'essence':
      return '✨';
    case 'dice':
      return '🎲';
    case 'shards':
      return '💎';
    case 'egg':
      return '🥚';
    case 'bonus_detour':
      return '↩️';
    case 'finish':
      return '🏆';
    case 'empty':
    default:
      return '🌿';
  }
}

function getTreasurePathFieldLabel(kind: IslandRunLuckyRollTileKind): string {
  switch (kind) {
    case 'essence':
      return 'Essence field';
    case 'dice':
      return 'Dice field';
    case 'shards':
      return 'Shard field';
    case 'egg':
      return 'Treasure Egg field';
    case 'bonus_detour':
      return 'Bonus path field';
    case 'finish':
      return 'Treasure gate';
    case 'empty':
    default:
      return 'Cozy field';
  }
}

function formatReward(entry: IslandRunLuckyRollRewardEntry): string {
  const icon = entry.rewardType === 'dice'
    ? '🎲'
    : entry.rewardType === 'essence'
      ? '✨'
      : entry.rewardType === 'shards'
        ? '💎'
        : entry.rewardType === 'egg'
          ? '🥚'
          : '🎁';
  const label = entry.rewardType === 'egg' ? 'Treasure Egg' : entry.rewardType;
  return `${icon} +${entry.amount} ${label} · field ${entry.tileId}`;
}

function resolveDevRoll(luckyRollSession: IslandRunLuckyRollSession | null): number {
  const rewardIndex = luckyRollSession?.rollsUsed ?? 0;
  return DEV_TREASURE_PATH_ROLL_SEQUENCE[rewardIndex % DEV_TREASURE_PATH_ROLL_SEQUENCE.length];
}

export function IslandRunLuckyRollDevOverlay({
  session,
  client,
  runtimeState,
  targetIslandNumber,
  isDevModeEnabled,
  collectMode = 'bank_only',
  onRuntimeStateChange,
  onCollectPostRareTreasurePathAndTravel,
  onClose,
}: IslandRunLuckyRollDevOverlayProps) {
  const [actionStatus, setActionStatus] = useState<DevLuckyRollActionStatus>('idle');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const normalizedTargetIslandNumber = normalizeIslandNumber(targetIslandNumber ?? runtimeState.currentIslandNumber);
  const sessionKey = getIslandRunLuckyRollSessionKey(runtimeState.cycleIndex, normalizedTargetIslandNumber);
  const luckyRollSession = runtimeState.luckyRollSessionsByMilestone[sessionKey] ?? null;
  const isActionPending = actionStatus === 'pending';
  const pendingRewards = luckyRollSession?.pendingRewards ?? [];
  const bankedRewards = luckyRollSession?.bankedRewards ?? [];
  const pendingDice = sumRewards(pendingRewards, 'dice');
  const pendingEssence = sumRewards(pendingRewards, 'essence');
  const pendingShards = sumRewards(pendingRewards, 'shards');
  const pendingEggs = sumRewards(pendingRewards, 'egg');
  const bankedDice = sumRewards(luckyRollSession?.bankedRewards ?? [], 'dice');
  const bankedEssence = sumRewards(luckyRollSession?.bankedRewards ?? [], 'essence');
  const bankedShards = sumRewards(bankedRewards, 'shards');
  const bankedEggs = sumRewards(bankedRewards, 'egg');
  const boardConfig = useMemo(() => getIslandRunLuckyRollBoardConfig({
    islandNumber: normalizedTargetIslandNumber,
    cycleIndex: runtimeState.cycleIndex,
  }), [normalizedTargetIslandNumber, runtimeState.cycleIndex]);
  const finishFieldConfig = useMemo(() => getIslandRunLuckyRollTileConfig(boardConfig.finishTileId, {
    islandNumber: normalizedTargetIslandNumber,
    cycleIndex: runtimeState.cycleIndex,
  }), [boardConfig.finishTileId, normalizedTargetIslandNumber, runtimeState.cycleIndex]);
  const finishFieldId = finishFieldConfig?.tileId ?? boardConfig.finishTileId;
  const claimedTileIds = useMemo(() => new Set(luckyRollSession?.claimedTileIds ?? []), [luckyRollSession?.claimedTileIds]);
  const nextDevRoll = resolveDevRoll(luckyRollSession);
  const canAdvance = luckyRollSession?.status === 'active';
  const usesPostRareCollectTravel = collectMode === 'post_rare_collect_travel';
  const isOverlayEnabled = isDevModeEnabled || usesPostRareCollectTravel;
  const canCollectAndTravel = Boolean(
    luckyRollSession
      && usesPostRareCollectTravel
      && (luckyRollSession.status === 'completed' || luckyRollSession.status === 'banked'),
  );
  const canBank = Boolean(
    luckyRollSession
      && !usesPostRareCollectTravel
      && luckyRollSession.status !== 'banked'
      && luckyRollSession.status !== 'expired'
      && (luckyRollSession.pendingRewards.length > 0 || luckyRollSession.status === 'completed'),
  );

  if (!isOverlayEnabled) {
    return null;
  }

  const runAction = async (action: () => Promise<string>) => {
    if (isActionPending) return;
    setActionStatus('pending');
    setActionMessage(null);
    try {
      setActionMessage(await action());
    } catch (err) {
      setActionMessage(`Treasure Path action failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionStatus('idle');
    }
  };

  const handleStartOrResume = () => runAction(async () => {
    if (luckyRollSession) {
      return `Treasure Path is ready for this session.`;
    }
    const result = await startIslandRunLuckyRoll({
      session,
      client,
      cycleIndex: runtimeState.cycleIndex,
      targetIslandNumber: normalizedTargetIslandNumber,
      triggerSource: 'dev_lucky_roll_overlay_start',
    });
    onRuntimeStateChange(result.record);
    return result.status === 'started'
      ? `Treasure Path is ready.`
      : `Treasure Path is already ready.`;
  });

  const handleAdvance = () => runAction(async () => {
    const result = await advanceIslandRunLuckyRoll({
      session,
      client,
      cycleIndex: runtimeState.cycleIndex,
      targetIslandNumber: normalizedTargetIslandNumber,
      roll: nextDevRoll,
      mode: 'production_board',
      triggerSource: 'dev_lucky_roll_overlay_advance',
    });
    onRuntimeStateChange(result.record);
    if (!result.luckyRollSession) {
      return `Roll skipped: ${result.status}. Start Treasure Path first.`;
    }
    const rewardLabel = result.rewardAdded
      ? ' New reward added.'
      : ' This field was already collected.';
    return `Rolled ${result.roll} to field ${result.landedTileId ?? '—'} (${result.status}).${rewardLabel}`;
  });

  const handleBank = () => runAction(async () => {
    const result = await bankIslandRunLuckyRollRewards({
      session,
      client,
      cycleIndex: runtimeState.cycleIndex,
      targetIslandNumber: normalizedTargetIslandNumber,
      triggerSource: 'dev_lucky_roll_overlay_bank',
    });
    onRuntimeStateChange(result.record);
    const eggsAwarded = result.rewardsBanked
      .filter((entry) => entry.rewardType === 'egg')
      .reduce((total, entry) => total + Math.max(0, Math.floor(entry.amount)), 0);
    return `Treasure collected (${result.status}): 🎲 +${result.diceAwarded}, ✨ +${result.essenceAwarded}, 💎 +${result.shardsAwarded}, 🥚 +${eggsAwarded}.`;
  });

  const handleCollectAndTravel = () => runAction(async () => {
    if (!onCollectPostRareTreasurePathAndTravel) {
      return 'Treasure Path collect + travel is not available.';
    }
    return onCollectPostRareTreasurePathAndTravel(normalizedTargetIslandNumber, runtimeState.cycleIndex);
  });

  const handlePrimaryAction = () => {
    if (!luckyRollSession) {
      if (usesPostRareCollectTravel) return;
      handleStartOrResume();
      return;
    }
    if (canAdvance) {
      handleAdvance();
      return;
    }
    if (canCollectAndTravel) {
      handleCollectAndTravel();
      return;
    }
    if (canBank) {
      handleBank();
    }
  };

  const primaryActionLabel = !luckyRollSession
    ? (usesPostRareCollectTravel ? 'Treasure Path preparing…' : 'Start Treasure Path')
    : canAdvance
      ? 'Roll'
      : canCollectAndTravel && luckyRollSession.status === 'banked'
        ? 'Travel to next island'
      : canCollectAndTravel
        ? 'Collect'
      : canBank
        ? 'Collect treasure'
        : luckyRollSession.status === 'banked'
          ? 'Treasure collected'
          : 'Treasure Path paused';
  const isPrimaryActionDisabled = isActionPending
    || (usesPostRareCollectTravel && !luckyRollSession)
    || (!canAdvance && !canBank && !canCollectAndTravel && Boolean(luckyRollSession));

  return (
    <div className="island-run-lucky-roll-dev-overlay" role="presentation">
      <section
        className="island-run-lucky-roll-dev-overlay__card"
        role="dialog"
        aria-modal="true"
          aria-label={usesPostRareCollectTravel ? 'Treasure Path overlay' : 'Dev Treasure Path overlay'}
      >
        <header className="island-run-lucky-roll-dev-overlay__header">
          <div>
            <p className="island-run-lucky-roll-dev-overlay__eyebrow">
              {usesPostRareCollectTravel ? 'Milestone reward' : 'DEV ONLY'}
            </p>
            <h2 className="island-run-lucky-roll-dev-overlay__title">✨ Treasure Path</h2>
            <p className="island-run-lucky-roll-dev-overlay__subtitle">
              Roll for free across glowing treasure fields.
              Reach the treasure gate to collect everything you found.
            </p>
          </div>
          <div className="island-run-lucky-roll-dev-overlay__header-actions">
            <button
              type="button"
              className="island-run-lucky-roll-dev-overlay__info-button"
              onClick={() => setShowDetails(true)}
              aria-label="Open Treasure Path details"
            >
              ?
            </button>
            <button
              type="button"
              className="island-run-lucky-roll-dev-overlay__close"
              onClick={onClose}
              aria-label="Close Treasure Path dev overlay"
            >
              ×
            </button>
          </div>
        </header>

        <div className="island-run-lucky-roll-dev-overlay__path" aria-label="Treasure Path field board">
          {boardConfig.tiles.map((field) => {
            const isCurrent = luckyRollSession?.position === field.tileId;
            const isClaimed = claimedTileIds.has(field.tileId);
            const isFinish = field.tileId === finishFieldId || field.kind === 'finish';
            const fieldLabel = getTreasurePathFieldLabel(field.kind);
            return (
              <div
                key={field.tileId}
                className={[
                  'island-run-lucky-roll-dev-overlay__tile',
                  `island-run-lucky-roll-dev-overlay__tile--${field.kind}`,
                  isCurrent ? 'island-run-lucky-roll-dev-overlay__tile--current' : '',
                  isClaimed ? 'island-run-lucky-roll-dev-overlay__tile--claimed' : '',
                  isFinish ? 'island-run-lucky-roll-dev-overlay__tile--finish' : '',
                ].filter(Boolean).join(' ')}
                title={`Field ${field.tileId} · ${fieldLabel}`}
              >
                <span>{getTreasurePathFieldIcon(field.kind)}</span>
                <small>{field.tileId}</small>
              </div>
            );
          })}
        </div>

        <div className="island-run-lucky-roll-dev-overlay__pending-row" aria-label="Pending Treasure Path rewards">
          <span>🎲 Dice <strong>{pendingDice}</strong></span>
          <span>✨ Essence <strong>{pendingEssence}</strong></span>
          <span>💎 Shards <strong>{pendingShards}</strong></span>
          <span>🥚 Treasure Eggs <strong>{pendingEggs}</strong></span>
        </div>

        {usesPostRareCollectTravel && luckyRollSession?.status === 'completed' && (
          <div className="island-run-lucky-roll-dev-overlay__message" role="status">
            Treasure Path complete. Collect to bank your rewards and travel to the next island.
          </div>
        )}

        <footer className="island-run-lucky-roll-dev-overlay__controls">
          <button
            type="button"
            className="island-run-lucky-roll-dev-overlay__primary-button"
            onClick={handlePrimaryAction}
            disabled={isPrimaryActionDisabled}
          >
            {isActionPending ? 'Working…' : primaryActionLabel}
          </button>
        </footer>

        {showDetails && (
          <div className="island-run-lucky-roll-dev-overlay__details-backdrop" role="presentation">
            <div
              className="island-run-lucky-roll-dev-overlay__details"
              role="dialog"
              aria-modal="true"
              aria-label="Treasure Path details"
            >
              <header>
                <div>
                  <p className="island-run-lucky-roll-dev-overlay__eyebrow">DEV DETAILS</p>
                  <h3>Treasure Path details</h3>
                </div>
                <button type="button" onClick={() => setShowDetails(false)} aria-label="Close Treasure Path details">×</button>
              </header>
              <dl className="island-run-lucky-roll-dev-overlay__details-grid">
                <div>
                  <dt>Session key</dt>
                  <dd>{sessionKey}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{luckyRollSession?.status ?? 'none'}</dd>
                </div>
                <div>
                  <dt>Run id</dt>
                  <dd>{luckyRollSession?.runId ?? '—'}</dd>
                </div>
                <div>
                  <dt>Current field</dt>
                  <dd>{luckyRollSession ? `${luckyRollSession.position}/${boardConfig.finishTileId}` : '—'}</dd>
                </div>
                <div>
                  <dt>Rolls used</dt>
                  <dd>{luckyRollSession?.rollsUsed ?? 0}</dd>
                </div>
                <div>
                  <dt>Next dev roll</dt>
                  <dd>{nextDevRoll}</dd>
                </div>
                <div>
                  <dt>Claimed field ids</dt>
                  <dd>{luckyRollSession?.claimedTileIds.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Canonical dice / essence / shards</dt>
                  <dd>{runtimeState.dicePool} / {runtimeState.essence} / {runtimeState.shards}</dd>
                </div>
                <div>
                  <dt>Stored rewards</dt>
                  <dd>🎲 {bankedDice} · ✨ {bankedEssence} · 💎 {bankedShards} · 🥚 {bankedEggs}</dd>
                </div>
              </dl>
              <section className="island-run-lucky-roll-dev-overlay__details-section">
                <h4>Pending rewards</h4>
                <ul>
                  {pendingRewards.map((entry) => <li key={entry.rewardId}>{formatReward(entry)}</li>)}
                  {pendingRewards.length === 0 && <li>No pending rewards yet.</li>}
                </ul>
              </section>
              <section className="island-run-lucky-roll-dev-overlay__details-section">
                <h4>Stored reward entries</h4>
                <ul>
                  {bankedRewards.map((entry) => <li key={entry.rewardId}>{formatReward(entry)}</li>)}
                  {bankedRewards.length === 0 && <li>No stored rewards yet.</li>}
                </ul>
              </section>
              {actionMessage && (
                <div className="island-run-lucky-roll-dev-overlay__message" role="status">
                  {actionMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
