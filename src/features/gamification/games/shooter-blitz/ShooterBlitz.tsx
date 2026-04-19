import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardDice, awardGameTokens, logGameSession } from '../../../../services/gameRewards';
import { triggerCompletionHaptic } from '../../../../utils/completionHaptics';
import { useSupabaseAuth } from '../../../auth/SupabaseAuthProvider';
import type { IslandRunMinigameResult } from '../../level-worlds/services/islandRunMinigameTypes';
import './shooterBlitz.css';

interface ShooterBlitzProps {
  /** Session is optional — falls back to SupabaseAuthProvider context for framework launches */
  session?: Session;
  /** Called on exit/abort — backward compat; if omitted, onComplete({ completed: false }) is called */
  onClose?: () => void;
  /** Called on game end with result; callers may ignore the result arg (backward compat) */
  onComplete: (result: IslandRunMinigameResult) => void;
  /** Island number for difficulty scaling (IslandRunMinigameProps compat) */
  islandNumber?: number;
  /** Ticket budget (IslandRunMinigameProps compat) */
  ticketBudget?: number;
}

const SHOOTER_TARGET_GOAL = 12;
const SHOOTER_REWARDS = {
  coins: 90,
  dice: 2,
  tokens: 1,
} as const;

const MISSION_PHASES = [
  { threshold: 0, label: 'Booting targeting systems' },
  { threshold: 4, label: 'Hostile swarm detected' },
  { threshold: 8, label: 'Final corridor push' },
  { threshold: SHOOTER_TARGET_GOAL, label: 'Mission clear — extract now' },
] as const;

export function ShooterBlitz({ session: sessionProp, onClose, onComplete }: ShooterBlitzProps) {
  const { session: contextSession } = useSupabaseAuth();
  const session = sessionProp ?? contextSession;
  const [isMissionStarted, setIsMissionStarted] = useState(false);
  const [targetsHit, setTargetsHit] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const userId = session?.user.id;

  if (!userId) {
    return null;
  }

  const playerName = useMemo(() => {
    const metadataName = session?.user.user_metadata?.full_name;
    if (typeof metadataName === 'string' && metadataName.trim().length > 0) {
      return metadataName.trim();
    }

    return session?.user.email ?? 'Pilot';
  }, [session?.user.email, session?.user.user_metadata?.full_name]);

  const progressPercent = Math.round((targetsHit / SHOOTER_TARGET_GOAL) * 100);

  const missionPhase = useMemo(() => {
    const ordered = [...MISSION_PHASES].reverse();
    return ordered.find((phase) => targetsHit >= phase.threshold)?.label ?? MISSION_PHASES[0].label;
  }, [targetsHit]);

  useEffect(() => {
    logGameSession(userId, {
      gameId: 'shooter_blitz',
      action: 'enter',
      timestamp: new Date().toISOString(),
    });
  }, [userId]);

  const handleHitTarget = () => {
    setTargetsHit((current) => Math.min(SHOOTER_TARGET_GOAL, current + 1));
  };

  const handleCompleteMission = () => {
    if (isCompleting || targetsHit < SHOOTER_TARGET_GOAL) return;

    setIsCompleting(true);

    awardGold(userId, SHOOTER_REWARDS.coins, 'shooter_blitz', 'Shooter Blitz: mission complete');
    awardDice(userId, SHOOTER_REWARDS.dice, 'shooter_blitz', 'Shooter Blitz: mission complete');
    awardGameTokens(userId, SHOOTER_REWARDS.tokens, 'shooter_blitz', 'Shooter Blitz: mission complete');

    logGameSession(userId, {
      gameId: 'shooter_blitz',
      action: 'complete',
      timestamp: new Date().toISOString(),
      metadata: {
        targetsHit,
        rewards: SHOOTER_REWARDS,
      },
    });

    triggerCompletionHaptic('strong', { channel: 'gamification', minIntervalMs: 2500 });
    onComplete({ completed: true, reward: {} });
  };

  const handleExit = () => {
    logGameSession(userId, {
      gameId: 'shooter_blitz',
      action: 'exit',
      timestamp: new Date().toISOString(),
      metadata: {
        targetsHit,
        started: isMissionStarted,
      },
    });
    if (onClose) {
      onClose();
    } else {
      onComplete({ completed: false });
    }
  };

  return (
    <div className="shooter-blitz game-board" role="dialog" aria-label="Shooter Blitz mini-game">
      <div className="shooter-blitz__panel">
        <header className="shooter-blitz__header">
          <h2>🚀 Shooter Blitz</h2>
          <p>Lock on and clear hostile drones to secure your Island Run path.</p>
        </header>

        {!isMissionStarted ? (
          <div className="shooter-blitz__setup">
            <p>
              <strong>{playerName}</strong>, your goal is to clear {SHOOTER_TARGET_GOAL} drones.
            </p>
            <p className="shooter-blitz__reward-copy">
              Mission reward: +{SHOOTER_REWARDS.coins} coins, +{SHOOTER_REWARDS.dice} dice, +{SHOOTER_REWARDS.tokens}{' '}
              token
            </p>
            <div className="shooter-blitz__reward-row" aria-label="Mission rewards">
              <span>🪙 {SHOOTER_REWARDS.coins}</span>
              <span>🎲 {SHOOTER_REWARDS.dice}</span>
              <span>🧿 {SHOOTER_REWARDS.tokens}</span>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setIsMissionStarted(true)}>
              Start Mission
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleExit}>
              Exit
            </button>
          </div>
        ) : (
          <div className="shooter-blitz__active">
            <p className="shooter-blitz__phase">{missionPhase}</p>
            <p>
              Targets hit: <strong>{targetsHit}</strong> / {SHOOTER_TARGET_GOAL}
            </p>
            <div className="shooter-blitz__progress" aria-label="Mission progress">
              <div className="shooter-blitz__progress-track">
                <div className="shooter-blitz__progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span>{progressPercent}%</span>
            </div>

            <div className="shooter-blitz__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleHitTarget}
                disabled={targetsHit >= SHOOTER_TARGET_GOAL || isCompleting}
              >
                Hit Target
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleCompleteMission}
                disabled={targetsHit < SHOOTER_TARGET_GOAL || isCompleting}
              >
                Complete Mission
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleExit} disabled={isCompleting}>
                Abort
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
