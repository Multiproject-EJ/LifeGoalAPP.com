import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardDice, awardGameTokens, logGameSession } from '../../../../services/gameRewards';
import { triggerCompletionHaptic } from '../../../../utils/completionHaptics';
import { useSupabaseAuth } from '../../../auth/SupabaseAuthProvider';
import type {
  IslandRunControllerInputProvider,
  IslandRunControllerIntent,
  IslandRunMinigameResult,
} from '../../level-worlds/services/islandRunMinigameTypes';
import { getBossTrialConfig } from '../../level-worlds/services/bossService';
import {
  applyShooterStrafeIntent,
  areLanesAligned,
  clampShooterLane,
  laneToPercent,
  type ShooterLane,
} from './shooterBlitzLaneLogic';
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
  /** Optional external controller input source (footer adapter bridge) */
  controllerInput?: IslandRunControllerInputProvider;
}

type PowerupKind = 'rapid_fire' | 'shield' | 'triple_shot';

const SHOOTER_REWARDS = {
  coins: 90,
  dice: 2,
  tokens: 1,
} as const;

const POWERUP_LABEL: Record<PowerupKind, string> = {
  rapid_fire: 'Rapid Fire',
  shield: 'Shield',
  triple_shot: 'Triple Shot',
};

const POWERUP_EMOJI: Record<PowerupKind, string> = {
  rapid_fire: '⚡',
  shield: '🛡️',
  triple_shot: '🔱',
};

const THEME_BY_ISLAND_MOD: Record<number, { name: string; skyClass: string; enemyEmoji: string }> = {
  0: { name: 'Nebula Rift', skyClass: 'shooter-blitz--theme-nebula', enemyEmoji: '🛸' },
  1: { name: 'Asteroid Field', skyClass: 'shooter-blitz--theme-asteroid', enemyEmoji: '🪨' },
  2: { name: 'Drone Swarm', skyClass: 'shooter-blitz--theme-drone', enemyEmoji: '🤖' },
  3: { name: 'Void Corridor', skyClass: 'shooter-blitz--theme-void', enemyEmoji: '☄️' },
};

const DAMAGE_BY_DIFFICULTY: Record<string, number> = {
  Easy: 1,
  Medium: 1,
  'Medium-Hard': 2,
  Hard: 2,
  'Very Hard': 3,
};

const MAX_HP_BY_DIFFICULTY: Record<string, number> = {
  Easy: 8,
  Medium: 7,
  'Medium-Hard': 6,
  Hard: 5,
  'Very Hard': 4,
};

const POWERUP_DURATION_SEC = 6;

export function ShooterBlitz({
  session: sessionProp,
  onClose,
  onComplete,
  islandNumber = 1,
  controllerInput,
}: ShooterBlitzProps) {
  const { session: contextSession } = useSupabaseAuth();
  const session = sessionProp ?? contextSession;

  const [isMissionStarted, setIsMissionStarted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isMissionOver, setIsMissionOver] = useState(false);
  const [targetsHit, setTargetsHit] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(60);
  const [hp, setHp] = useState(8);
  const [activePowerup, setActivePowerup] = useState<PowerupKind | null>(null);
  const [powerupExpiresInSec, setPowerupExpiresInSec] = useState(0);
  const [lastControllerIntent, setLastControllerIntent] = useState<IslandRunControllerIntent | null>(null);
  const [shipTargetLane, setShipTargetLane] = useState<ShooterLane>(0);
  const [shipVisualLane, setShipVisualLane] = useState(0);
  const [enemyLane, setEnemyLane] = useState<ShooterLane>(0);
  const [lastCombatEvent, setLastCombatEvent] = useState<'hit' | 'miss' | 'dodge' | 'hurt' | null>(null);

  const userId = session?.user.id;

  const trial = useMemo(() => getBossTrialConfig(islandNumber), [islandNumber]);

  const theme = useMemo(() => THEME_BY_ISLAND_MOD[islandNumber % 4] ?? THEME_BY_ISLAND_MOD[0], [islandNumber]);

  const maxHp = useMemo(() => MAX_HP_BY_DIFFICULTY[trial.difficulty] ?? 6, [trial.difficulty]);
  const incomingDamage = useMemo(() => DAMAGE_BY_DIFFICULTY[trial.difficulty] ?? 1, [trial.difficulty]);

  useEffect(() => {
    setTimeLeftSec(trial.trialDurationSec);
    setHp(maxHp);
    setTargetsHit(0);
    setActivePowerup(null);
    setPowerupExpiresInSec(0);
    setIsMissionStarted(false);
    setIsMissionOver(false);
    setIsCompleting(false);
    setShipTargetLane(0);
    setShipVisualLane(0);
    setEnemyLane(0);
    setLastCombatEvent(null);
  }, [maxHp, trial.trialDurationSec]);

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

  useEffect(() => {
    logGameSession(userId, {
      gameId: 'shooter_blitz',
      action: 'enter',
      timestamp: new Date().toISOString(),
      metadata: {
        islandNumber,
        scoreTarget: trial.scoreTarget,
        durationSec: trial.trialDurationSec,
      },
    });
  }, [islandNumber, trial.scoreTarget, trial.trialDurationSec, userId]);

  useEffect(() => {
    if (!isMissionStarted || isMissionOver || isCompleting) return;

    const enemyLaneLoop = window.setInterval(() => {
      const roll = Math.floor(Math.random() * 3) - 1;
      setEnemyLane(clampShooterLane(roll));
    }, 950);

    const timer = window.setInterval(() => {
      setTimeLeftSec((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });

      setPowerupExpiresInSec((current) => {
        if (current <= 1) {
          setActivePowerup(null);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isMissionOver, isMissionStarted, isCompleting]);

  useEffect(() => {
    if (!isMissionStarted || isMissionOver || isCompleting) return;

    const cadenceMs = trial.difficulty === 'Easy' ? 1800 : trial.difficulty === 'Medium' ? 1600 : 1300;

    const attackLoop = window.setInterval(() => {
      setHp((current) => {
        if (activePowerup === 'shield') return current;
        if (!areLanesAligned(shipTargetLane, enemyLane)) {
          setLastCombatEvent('dodge');
          return current;
        }
        setLastCombatEvent('hurt');
        return Math.max(0, current - incomingDamage);
      });
    }, cadenceMs);

    return () => {
      window.clearInterval(attackLoop);
      window.clearInterval(enemyLaneLoop);
    };
  }, [activePowerup, enemyLane, incomingDamage, isMissionOver, isMissionStarted, isCompleting, shipTargetLane, trial.difficulty]);

  useEffect(() => {
    if (!isMissionStarted || isMissionOver) {
      setShipVisualLane(shipTargetLane);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      setShipVisualLane((current) => {
        const delta = shipTargetLane - current;
        if (Math.abs(delta) < 0.02) return shipTargetLane;
        return current + delta * 0.35;
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isMissionOver, isMissionStarted, shipTargetLane, shipVisualLane]);

  useEffect(() => {
    if (!isMissionStarted || isMissionOver || isCompleting) return;
    if (targetsHit >= trial.scoreTarget) {
      setIsMissionOver(true);
      return;
    }

    if (hp <= 0 || timeLeftSec <= 0) {
      setIsMissionOver(true);
    }
  }, [hp, isCompleting, isMissionOver, isMissionStarted, targetsHit, timeLeftSec, trial.scoreTarget]);

  const isWin = isMissionOver && targetsHit >= trial.scoreTarget;

  const progressPercent = Math.round((targetsHit / trial.scoreTarget) * 100);
  const hpPercent = Math.max(0, Math.round((hp / maxHp) * 100));

  const maybeGrantPowerup = (nextTargetsHit: number) => {
    if (nextTargetsHit === 0 || nextTargetsHit % 3 !== 0) return;

    const pool: PowerupKind[] = ['rapid_fire', 'shield', 'triple_shot'];
    const kind = pool[nextTargetsHit % pool.length];
    setActivePowerup(kind);
    setPowerupExpiresInSec(POWERUP_DURATION_SEC);
  };

  const handleFire = useCallback(() => {
    if (!isMissionStarted || isMissionOver || isCompleting) return;
    if (!areLanesAligned(shipTargetLane, enemyLane)) {
      setLastCombatEvent('miss');
      return;
    }

    const baseHits = activePowerup === 'rapid_fire' ? 2 : 1;
    const bonusHits = activePowerup === 'triple_shot' ? 1 : 0;
    const totalHits = baseHits + bonusHits;

    setTargetsHit((current) => {
      const next = Math.min(trial.scoreTarget, current + totalHits);
      maybeGrantPowerup(next);
      setLastCombatEvent('hit');
      return next;
    });
  }, [activePowerup, enemyLane, isCompleting, isMissionOver, isMissionStarted, shipTargetLane, trial.scoreTarget]);

  useEffect(() => {
    if (!controllerInput) return;
    return controllerInput.subscribe((intent) => {
      setLastControllerIntent(intent);
      if (intent === 'left' || intent === 'right') {
        setShipTargetLane((current) => applyShooterStrafeIntent(current, intent));
      }
      if (intent === 'fire') {
        handleFire();
      }
    });
  }, [controllerInput, handleFire]);

  const handleCompleteMission = () => {
    if (isCompleting || !isWin) return;

    setIsCompleting(true);

    awardGold(userId, SHOOTER_REWARDS.coins, 'shooter_blitz', 'Shooter Blitz: mission complete');
    awardDice(userId, SHOOTER_REWARDS.dice, 'shooter_blitz', 'Shooter Blitz: mission complete');
    awardGameTokens(userId, SHOOTER_REWARDS.tokens, 'shooter_blitz', 'Shooter Blitz: mission complete');

    logGameSession(userId, {
      gameId: 'shooter_blitz',
      action: 'complete',
      timestamp: new Date().toISOString(),
      metadata: {
        islandNumber,
        scoreTarget: trial.scoreTarget,
        targetsHit,
        hpRemaining: hp,
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
        islandNumber,
        targetsHit,
        hp,
        started: isMissionStarted,
        missionOver: isMissionOver,
      },
    });

    if (onClose) {
      onClose();
      return;
    }

    onComplete({ completed: false });
  };

  return (
    <div className={`shooter-blitz game-board ${theme.skyClass}`} role="dialog" aria-label="Shooter Blitz mini-game">
      <div className="shooter-blitz__panel">
        <header className="shooter-blitz__header">
          <h2>🚀 Shooter Blitz</h2>
          <p>
            {theme.name} • {trial.difficulty} • Island {islandNumber}
          </p>
        </header>

        {!isMissionStarted ? (
          <div className="shooter-blitz__setup">
            <p>
              <strong>{playerName}</strong>, destroy {trial.scoreTarget} hostiles before the timer expires.
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
            <div className="shooter-blitz__reward-row" aria-label="Trial configuration">
              <span>⏱️ {trial.trialDurationSec}s</span>
              <span>🎯 {trial.scoreTarget} hits</span>
              <span>❤️ {maxHp} HP</span>
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
            <div className="shooter-blitz__arena" aria-label="Shooter arena">
              <span className="shooter-blitz__ship" style={{ left: `${laneToPercent(clampShooterLane(shipVisualLane))}%` }}>🛸</span>
              <span className="shooter-blitz__enemy" style={{ left: `${laneToPercent(enemyLane)}%` }}>{theme.enemyEmoji}</span>
            </div>

            <div className="shooter-blitz__hud-grid">
              <p>
                Score: <strong>{targetsHit}</strong> / {trial.scoreTarget}
              </p>
              <p>
                Time: <strong>{timeLeftSec}s</strong>
              </p>
              <p>
                Hull: <strong>{hp}</strong> / {maxHp}
              </p>
            </div>

            <div className="shooter-blitz__progress" aria-label="Mission progress">
              <div className="shooter-blitz__progress-track">
                <div className="shooter-blitz__progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span>{progressPercent}%</span>
            </div>
            <div className="shooter-blitz__progress" aria-label="Hull integrity">
              <div className="shooter-blitz__progress-track shooter-blitz__progress-track--hp">
                <div className="shooter-blitz__progress-fill shooter-blitz__progress-fill--hp" style={{ width: `${hpPercent}%` }} />
              </div>
              <span>{hpPercent}% HP</span>
            </div>

            {activePowerup ? (
              <p className="shooter-blitz__phase">
                {POWERUP_EMOJI[activePowerup]} {POWERUP_LABEL[activePowerup]} active ({powerupExpiresInSec}s)
              </p>
            ) : (
              <p className="shooter-blitz__phase">Destroy every 3rd enemy to trigger a power-up drop.</p>
            )}

            {lastControllerIntent ? (
              <p className="shooter-blitz__phase" aria-live="polite">
                Controller: {lastControllerIntent === 'fire' ? 'fire' : `strafe ${lastControllerIntent}`}
              </p>
            ) : null}

            {lastCombatEvent ? (
              <p className="shooter-blitz__phase" aria-live="polite">
                {lastCombatEvent === 'hit'
                  ? 'Direct hit!'
                  : lastCombatEvent === 'miss'
                    ? 'Shot missed — line up with target lane.'
                    : lastCombatEvent === 'dodge'
                      ? 'Enemy volley dodged.'
                      : 'Direct damage taken.'}
              </p>
            ) : null}

            {isMissionOver ? (
              <p className={`shooter-blitz__result ${isWin ? 'shooter-blitz__result--win' : 'shooter-blitz__result--lose'}`}>
                {isWin ? 'Mission clear — extract now!' : 'Mission failed — ship down or timer expired.'}
              </p>
            ) : null}

            <div className="shooter-blitz__actions">
              <button type="button" className="btn btn-primary" onClick={handleFire} disabled={isMissionOver || isCompleting}>
                Fire Blaster
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleCompleteMission}
                disabled={!isWin || isCompleting}
              >
                Complete Mission
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleExit} disabled={isCompleting}>
                {isMissionOver && !isWin ? 'Retreat' : 'Abort'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
