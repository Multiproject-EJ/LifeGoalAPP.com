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
  advanceIslandRunLuckyRoll,
  bankIslandRunLuckyRollRewards,
  startIslandRunLuckyRoll,
} from '../../services/islandRunLuckyRollAction';
import { isIslandRunInternalDevToolsEnabled } from '../../services/islandRunInternalDevTools';
import './IslandRunLuckyRollDevOverlay.css';

const DEV_LUCKY_ROLL_BOARD_SIZE = 30;
const DEV_LUCKY_ROLL_ROLL_SEQUENCE = [3, 4, 2, 5, 1, 6] as const;

type DevLuckyRollActionStatus = 'idle' | 'pending';

interface IslandRunLuckyRollDevOverlayProps {
  session: Session;
  client: SupabaseClient | null;
  runtimeState: IslandRunRuntimeState;
  targetIslandNumber: number;
  isDevModeEnabled: boolean;
  onRuntimeStateChange: (record: IslandRunGameStateRecord) => void;
  onClose: () => void;
}

function normalizeIslandNumber(targetIslandNumber: number): number {
  return Number.isFinite(targetIslandNumber) ? Math.max(1, Math.floor(targetIslandNumber)) : 1;
}

function sumRewards(rewards: IslandRunLuckyRollRewardEntry[], rewardType: 'dice' | 'essence'): number {
  return rewards
    .filter((entry) => entry.rewardType === rewardType)
    .reduce((total, entry) => total + Math.max(0, Math.floor(entry.amount)), 0);
}

function formatReward(entry: IslandRunLuckyRollRewardEntry): string {
  const icon = entry.rewardType === 'dice' ? '🎲' : entry.rewardType === 'essence' ? '✨' : '🎁';
  return `${icon} +${entry.amount} ${entry.rewardType} · tile ${entry.tileId}`;
}

function getTileRewardDescription(tileId: number, rewardType: 'dice' | 'essence', isFinish: boolean): string {
  if (isFinish) return `Tile ${tileId} · finish`;
  return `Tile ${tileId} · ${rewardType} test reward`;
}

function resolveDevRewardInput(luckyRollSession: IslandRunLuckyRollSession | null): {
  roll: number;
  rewardType: 'dice' | 'essence';
  amount: number;
} {
  const rewardIndex = luckyRollSession?.rollsUsed ?? 0;
  const rewardType = rewardIndex % 2 === 0 ? 'dice' : 'essence';
  return {
    roll: DEV_LUCKY_ROLL_ROLL_SEQUENCE[rewardIndex % DEV_LUCKY_ROLL_ROLL_SEQUENCE.length],
    rewardType,
    amount: rewardType === 'dice' ? 2 : 25,
  };
}

export function IslandRunLuckyRollDevOverlay({
  session,
  client,
  runtimeState,
  targetIslandNumber,
  isDevModeEnabled,
  onRuntimeStateChange,
  onClose,
}: IslandRunLuckyRollDevOverlayProps) {
  const [actionStatus, setActionStatus] = useState<DevLuckyRollActionStatus>('idle');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const normalizedTargetIslandNumber = normalizeIslandNumber(targetIslandNumber ?? runtimeState.currentIslandNumber);
  const sessionKey = getIslandRunLuckyRollSessionKey(runtimeState.cycleIndex, normalizedTargetIslandNumber);
  const luckyRollSession = runtimeState.luckyRollSessionsByMilestone[sessionKey] ?? null;
  const isActionPending = actionStatus === 'pending';
  const pendingDice = sumRewards(luckyRollSession?.pendingRewards ?? [], 'dice');
  const pendingEssence = sumRewards(luckyRollSession?.pendingRewards ?? [], 'essence');
  const bankedDice = sumRewards(luckyRollSession?.bankedRewards ?? [], 'dice');
  const bankedEssence = sumRewards(luckyRollSession?.bankedRewards ?? [], 'essence');
  const claimedTileIds = useMemo(() => new Set(luckyRollSession?.claimedTileIds ?? []), [luckyRollSession?.claimedTileIds]);
  const nextDevReward = resolveDevRewardInput(luckyRollSession);
  const canAdvance = luckyRollSession?.status === 'active';
  const canBank = Boolean(
    luckyRollSession
      && luckyRollSession.status !== 'banked'
      && luckyRollSession.status !== 'expired'
      && (luckyRollSession.pendingRewards.length > 0 || luckyRollSession.status === 'completed'),
  );

  if (!isIslandRunInternalDevToolsEnabled(session, isDevModeEnabled)) {
    return null;
  }

  const runAction = async (action: () => Promise<string>) => {
    if (isActionPending) return;
    setActionStatus('pending');
    setActionMessage(null);
    try {
      setActionMessage(await action());
    } catch (err) {
      setActionMessage(`Lucky Roll overlay action failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionStatus('idle');
    }
  };

  const handleStartOrResume = () => runAction(async () => {
    if (luckyRollSession) {
      return `Resuming canonical Lucky Roll session ${sessionKey}.`;
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
      ? `Started canonical Lucky Roll for island ${normalizedTargetIslandNumber}.`
      : `Resumed existing Lucky Roll for island ${normalizedTargetIslandNumber}.`;
  });

  const handleAdvance = () => runAction(async () => {
    const result = await advanceIslandRunLuckyRoll({
      session,
      client,
      cycleIndex: runtimeState.cycleIndex,
      targetIslandNumber: normalizedTargetIslandNumber,
      roll: nextDevReward.roll,
      boardSize: DEV_LUCKY_ROLL_BOARD_SIZE,
      reward: {
        rewardType: nextDevReward.rewardType,
        amount: nextDevReward.amount,
        metadata: { source: 'dev_lucky_roll_overlay' },
      },
      triggerSource: 'dev_lucky_roll_overlay_advance',
    });
    onRuntimeStateChange(result.record);
    if (!result.luckyRollSession) {
      return `Advance skipped: ${result.status}. Start a session first.`;
    }
    const rewardLabel = result.rewardAdded
      ? ` Pending +${nextDevReward.amount} ${nextDevReward.rewardType}.`
      : ' Tile was already claimed; no duplicate reward added.';
    return `Rolled ${result.roll} to tile ${result.landedTileId ?? '—'} (${result.status}).${rewardLabel}`;
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
    return `Bank ${result.status}: +${result.diceAwarded} dice, +${result.essenceAwarded} essence.`;
  });

  return (
    <div className="island-run-lucky-roll-dev-overlay" role="presentation">
      <section
        className="island-run-lucky-roll-dev-overlay__card"
        role="dialog"
        aria-modal="true"
        aria-label="Dev Lucky Roll overlay"
      >
        <header className="island-run-lucky-roll-dev-overlay__header">
          <div>
            <p className="island-run-lucky-roll-dev-overlay__eyebrow">DEV ONLY · Canonical Island Run</p>
            <h2 className="island-run-lucky-roll-dev-overlay__title">🍀 Lucky Roll reward path</h2>
            <p className="island-run-lucky-roll-dev-overlay__subtitle">
              Start or resume a test session for Island {normalizedTargetIslandNumber}. Rewards bank into canonical dice and essence only.
            </p>
          </div>
          <button
            type="button"
            className="island-run-lucky-roll-dev-overlay__close"
            onClick={onClose}
            aria-label="Close Lucky Roll dev overlay"
          >
            ×
          </button>
        </header>

        <div className="island-run-lucky-roll-dev-overlay__summary-grid">
          <div className="island-run-lucky-roll-dev-overlay__stat">
            <span>Status</span>
            <strong>{luckyRollSession?.status ?? 'none'}</strong>
          </div>
          <div className="island-run-lucky-roll-dev-overlay__stat">
            <span>Position</span>
            <strong>{luckyRollSession ? `${luckyRollSession.position}/${DEV_LUCKY_ROLL_BOARD_SIZE - 1}` : '—'}</strong>
          </div>
          <div className="island-run-lucky-roll-dev-overlay__stat">
            <span>Rolls used</span>
            <strong>{luckyRollSession?.rollsUsed ?? 0}</strong>
          </div>
          <div className="island-run-lucky-roll-dev-overlay__stat">
            <span>Claimed tiles</span>
            <strong>{luckyRollSession?.claimedTileIds.length ?? 0}</strong>
          </div>
          <div className="island-run-lucky-roll-dev-overlay__stat">
            <span>Canonical dice</span>
            <strong>{runtimeState.dicePool}</strong>
          </div>
          <div className="island-run-lucky-roll-dev-overlay__stat">
            <span>Canonical essence</span>
            <strong>{runtimeState.essence}</strong>
          </div>
        </div>

        <div className="island-run-lucky-roll-dev-overlay__path" aria-label="Lucky Roll reward path">
          {Array.from({ length: DEV_LUCKY_ROLL_BOARD_SIZE }, (_, tileId) => {
            const isCurrent = luckyRollSession?.position === tileId;
            const isClaimed = claimedTileIds.has(tileId);
            const isFinish = tileId === DEV_LUCKY_ROLL_BOARD_SIZE - 1;
            const rewardType = tileId % 2 === 0 ? 'dice' : 'essence';
            return (
              <div
                key={tileId}
                className={[
                  'island-run-lucky-roll-dev-overlay__tile',
                  isCurrent ? 'island-run-lucky-roll-dev-overlay__tile--current' : '',
                  isClaimed ? 'island-run-lucky-roll-dev-overlay__tile--claimed' : '',
                  isFinish ? 'island-run-lucky-roll-dev-overlay__tile--finish' : '',
                ].filter(Boolean).join(' ')}
                title={getTileRewardDescription(tileId, rewardType, isFinish)}
              >
                <span>{isFinish ? '🏁' : rewardType === 'dice' ? '🎲' : '✨'}</span>
                <small>{tileId}</small>
              </div>
            );
          })}
        </div>

        <div className="island-run-lucky-roll-dev-overlay__banks">
          <section>
            <h3>Pending rewards</h3>
            <p>🎲 +{pendingDice} dice · ✨ +{pendingEssence} essence</p>
            <ul>
              {(luckyRollSession?.pendingRewards ?? []).map((entry) => (
                <li key={entry.rewardId}>{formatReward(entry)}</li>
              ))}
              {(!luckyRollSession || luckyRollSession.pendingRewards.length === 0) && <li>No pending rewards yet.</li>}
            </ul>
          </section>
          <section>
            <h3>Banked rewards</h3>
            <p>🎲 +{bankedDice} dice · ✨ +{bankedEssence} essence</p>
            <ul>
              {(luckyRollSession?.bankedRewards ?? []).map((entry) => (
                <li key={entry.rewardId}>{formatReward(entry)}</li>
              ))}
              {(!luckyRollSession || luckyRollSession.bankedRewards.length === 0) && <li>No banked rewards yet.</li>}
            </ul>
          </section>
        </div>

        <footer className="island-run-lucky-roll-dev-overlay__controls">
          <button type="button" onClick={handleStartOrResume} disabled={isActionPending}>
            {luckyRollSession ? 'Resume session' : 'Start session'}
          </button>
          <button type="button" onClick={handleAdvance} disabled={isActionPending || !canAdvance}>
            Roll / advance · next {nextDevReward.roll}
          </button>
          <button type="button" onClick={handleBank} disabled={isActionPending || !canBank}>
            Bank rewards
          </button>
          <button type="button" onClick={onClose} disabled={isActionPending}>
            Close
          </button>
        </footer>

        {actionMessage && (
          <div className="island-run-lucky-roll-dev-overlay__message" role="status">
            {actionMessage}
          </div>
        )}
        <p className="island-run-lucky-roll-dev-overlay__session-key">Session key: {sessionKey}</p>
      </section>
    </div>
  );
}
