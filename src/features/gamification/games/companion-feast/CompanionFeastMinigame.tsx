/**
 * CompanionFeastMinigame.tsx — playable drop-and-merge feast bowl for the
 * Companion Feast timed event.
 *
 * Three states only: entry → playing → results. All rules/physics live in
 * `services/companionFeastGame.ts`; this file owns rendering + input.
 *
 * Ticket authority stays canonical: the first run is pre-paid by the board
 * launch path (`applyTimedEventTicketSpend`), replays spend one more ticket
 * through the `requestRunTicketSpend` launchConfig callback.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import {
  advanceCompanionFeastDangerTimer,
  applyCompanionFeastNudge,
  canStartCompanionFeastRun,
  COMPANION_FEAST_BOWL_HEIGHT,
  COMPANION_FEAST_BOWL_WIDTH,
  COMPANION_FEAST_DANGER_GRACE_MS,
  COMPANION_FEAST_DANGER_LINE_Y,
  COMPANION_FEAST_DEFAULT_PHYSICS,
  COMPANION_FEAST_RUN_TICKET_COST,
  createCompanionFeastBody,
  getCompanionFeastFoodTier,
  resolveCompanionFeastResultTier,
  rollCompanionFeastDropTier,
  stepCompanionFeastPhysics,
  type CompanionFeastBody,
} from '../../level-worlds/services/companionFeastGame';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../level-worlds/services/islandRunAudio';
import './companionFeast.css';

type GamePhase = 'entry' | 'playing' | 'results';

type CompanionFeastLaunchConfig = {
  getTicketsRemaining?: () => number;
  requestRunTicketSpend?: () => { ok: boolean; ticketsRemaining: number };
};

type MergePop = { id: number; x: number; y: number; score: number; bornAtMs: number };

const DROP_COOLDOWN_MS = 420;

/** Session-scoped best score (resets on app reload by design). */
let sessionBestScore = 0;

export default function CompanionFeastMinigame({ onComplete, launchConfig }: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as CompanionFeastLaunchConfig;

  const [phase, setPhase] = useState<GamePhase>('entry');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(sessionBestScore);
  const [nudgeUsed, setNudgeUsed] = useState(false);
  const [dangerRatio, setDangerRatio] = useState(0);
  const [ticketsRemaining, setTicketsRemaining] = useState(() => config.getTicketsRemaining?.() ?? 0);
  /** The launch-time ticket spend pre-pays the first run. */
  const [entryRunAvailable, setEntryRunAvailable] = useState(true);
  const [runsFinished, setRunsFinished] = useState(0);
  const [rewardDiceTotal, setRewardDiceTotal] = useState(0);
  const [lastRunScore, setLastRunScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bodiesRef = useRef<CompanionFeastBody[]>([]);
  const scoreRef = useRef(0);
  const dangerMsRef = useRef(0);
  const rngStateRef = useRef((Date.now() % 2147483646) + 1);
  const dropXRef = useRef(COMPANION_FEAST_BOWL_WIDTH / 2);
  const currentTierRef = useRef(0);
  const nextTierRef = useRef(0);
  const lastDropAtRef = useRef(0);
  const mergePopsRef = useRef<MergePop[]>([]);
  const phaseRef = useRef<GamePhase>('entry');
  const rafRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef(0);
  const popIdRef = useRef(1);

  phaseRef.current = phase;

  const rollTier = useCallback(() => {
    const [tier, nextState] = rollCompanionFeastDropTier(rngStateRef.current);
    rngStateRef.current = nextState;
    return tier;
  }, []);

  const refreshTickets = useCallback(() => {
    setTicketsRemaining(config.getTicketsRemaining?.() ?? 0);
  }, [config]);

  const endRun = useCallback(() => {
    const finalScore = scoreRef.current;
    const tier = resolveCompanionFeastResultTier(finalScore);
    if (finalScore > sessionBestScore) sessionBestScore = finalScore;
    setBestScore(sessionBestScore);
    setLastRunScore(finalScore);
    setRunsFinished((n) => n + 1);
    setRewardDiceTotal((total) => total + tier.rewardDice);
    setPhase('results');
    refreshTickets();
    playIslandRunSound('minigame_complete');
    triggerIslandRunHaptic('reward_claim');
  }, [refreshTickets]);

  const startRun = useCallback(() => {
    if (!canStartCompanionFeastRun({
      entryRunAvailable,
      ticketsRemaining: config.getTicketsRemaining?.() ?? 0,
    })) {
      refreshTickets();
      return;
    }
    if (entryRunAvailable) {
      setEntryRunAvailable(false);
    } else {
      const spend = config.requestRunTicketSpend?.();
      if (!spend?.ok) {
        refreshTickets();
        return;
      }
      setTicketsRemaining(spend.ticketsRemaining);
    }
    bodiesRef.current = [];
    scoreRef.current = 0;
    dangerMsRef.current = 0;
    mergePopsRef.current = [];
    lastDropAtRef.current = 0;
    dropXRef.current = COMPANION_FEAST_BOWL_WIDTH / 2;
    currentTierRef.current = rollTier();
    nextTierRef.current = rollTier();
    setScore(0);
    setDangerRatio(0);
    setNudgeUsed(false);
    setPhase('playing');
    playIslandRunSound('minigame_open');
  }, [config, entryRunAvailable, refreshTickets, rollTier]);

  const handleReturnToIsland = useCallback(() => {
    if (runsFinished > 0) {
      onComplete({
        completed: true,
        reward: rewardDiceTotal > 0 ? { dice: rewardDiceTotal } : undefined,
      });
    } else {
      onComplete({ completed: false });
    }
  }, [onComplete, rewardDiceTotal, runsFinished]);

  const clampDropX = useCallback((x: number) => {
    const radius = getCompanionFeastFoodTier(currentTierRef.current).radius;
    return Math.max(radius + 2, Math.min(COMPANION_FEAST_BOWL_WIDTH - radius - 2, x));
  }, []);

  const pointerToBowlX = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return COMPANION_FEAST_BOWL_WIDTH / 2;
    const rect = canvas.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return clampDropX(ratio * COMPANION_FEAST_BOWL_WIDTH);
  }, [clampDropX]);

  const dropFood = useCallback(() => {
    const now = performance.now();
    if (now - lastDropAtRef.current < DROP_COOLDOWN_MS) return;
    lastDropAtRef.current = now;
    const tier = currentTierRef.current;
    bodiesRef.current = [
      ...bodiesRef.current,
      createCompanionFeastBody({
        tier,
        x: clampDropX(dropXRef.current),
        y: getCompanionFeastFoodTier(tier).radius + 4,
      }),
    ];
    currentTierRef.current = nextTierRef.current;
    nextTierRef.current = rollTier();
    playIslandRunSound('token_move');
  }, [clampDropX, rollTier]);

  const handleNudge = useCallback(() => {
    if (nudgeUsed || phaseRef.current !== 'playing') return;
    setNudgeUsed(true);
    bodiesRef.current = applyCompanionFeastNudge(bodiesRef.current, rngStateRef.current);
    rngStateRef.current = (rngStateRef.current * 48271) % 2147483647 || 1;
    triggerIslandRunHaptic('roll');
    playIslandRunSound('coin_flip');
  }, [nudgeUsed]);

  // Main simulation + render loop, active only while playing.
  useEffect(() => {
    if (phase !== 'playing') return undefined;
    lastFrameAtRef.current = performance.now();

    const frame = (nowMs: number) => {
      const dtMs = Math.min(48, nowMs - lastFrameAtRef.current);
      lastFrameAtRef.current = nowMs;

      const step = stepCompanionFeastPhysics(bodiesRef.current, COMPANION_FEAST_DEFAULT_PHYSICS, dtMs);
      bodiesRef.current = step.bodies;
      if (step.merges.length > 0) {
        let gained = 0;
        for (const merge of step.merges) {
          gained += merge.score;
          mergePopsRef.current.push({
            id: popIdRef.current++,
            x: merge.x,
            y: merge.y,
            score: merge.score,
            bornAtMs: nowMs,
          });
        }
        scoreRef.current += gained;
        setScore(scoreRef.current);
        playIslandRunSound('reward_bar_fill');
      }
      mergePopsRef.current = mergePopsRef.current.filter((pop) => nowMs - pop.bornAtMs < 700);

      const danger = advanceCompanionFeastDangerTimer({
        dangerActive: step.dangerActive,
        elapsedDangerMs: dangerMsRef.current,
        dtMs,
      });
      dangerMsRef.current = danger.elapsedDangerMs;
      setDangerRatio(Math.min(1, danger.elapsedDangerMs / COMPANION_FEAST_DANGER_GRACE_MS));

      drawBowl(canvasRef.current, {
        bodies: bodiesRef.current,
        dropX: dropXRef.current,
        currentTier: currentTierRef.current,
        dangerRatio: Math.min(1, danger.elapsedDangerMs / COMPANION_FEAST_DANGER_GRACE_MS),
        mergePops: mergePopsRef.current,
        nowMs,
      });

      if (danger.gameOver) {
        endRun();
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [phase, endRun]);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  const currentTierInfo = getCompanionFeastFoodTier(currentTierRef.current);
  const nextTierInfo = getCompanionFeastFoodTier(nextTierRef.current);
  const resultTier = useMemo(() => resolveCompanionFeastResultTier(lastRunScore), [lastRunScore]);
  const canPlayAgain = canStartCompanionFeastRun({ entryRunAvailable, ticketsRemaining });

  return (
    <section className="companion-feast" aria-label="Companion Feast mini-game">
      {phase === 'entry' && (
        <div className="companion-feast__panel companion-feast__entry" role="dialog" aria-label="Companion Feast entry">
          <p className="companion-feast__eyebrow">Island Event</p>
          <h2 className="companion-feast__title">🐾 Companion Feast</h2>
          <p className="companion-feast__copy">
            The island creatures are gathering for a magical feast! Drop food into the
            enchanted bowl — matching dishes merge into grander ones.
          </p>
          <ul className="companion-feast__rules">
            <li>🍒 Drag to aim, release to drop food.</li>
            <li>✨ Two matching dishes merge and score.</li>
            <li>⚠️ Keep the bowl below the glow line — overflow ends the run.</li>
            <li>🐾 Creature Nudge gently shakes the bowl, once per run.</li>
          </ul>
          <p className="companion-feast__ticket-note">
            Entry ticket spent — this run is ready to serve. Tickets left: {ticketsRemaining} 🎟️
          </p>
          <div className="companion-feast__actions">
            <button type="button" className="companion-feast__btn companion-feast__btn--primary" onClick={startRun}>
              Start the Feast
            </button>
            <button type="button" className="companion-feast__btn" onClick={handleReturnToIsland}>
              Return to Island
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="companion-feast__play-area">
          <header className="companion-feast__hud">
            <div className="companion-feast__hud-stat">
              <span className="companion-feast__hud-label">Score</span>
              <span className="companion-feast__hud-value">{score}</span>
            </div>
            <div className="companion-feast__hud-stat">
              <span className="companion-feast__hud-label">Best</span>
              <span className="companion-feast__hud-value">{Math.max(bestScore, score)}</span>
            </div>
            <div className="companion-feast__hud-stat companion-feast__hud-stat--next" aria-label={`Next food: ${nextTierInfo.name}`}>
              <span className="companion-feast__hud-label">Next</span>
              <span className="companion-feast__hud-next">{nextTierInfo.emoji}</span>
            </div>
          </header>

          <canvas
            ref={canvasRef}
            className={`companion-feast__canvas${dangerRatio > 0 ? ' companion-feast__canvas--danger' : ''}`}
            width={COMPANION_FEAST_BOWL_WIDTH}
            height={COMPANION_FEAST_BOWL_HEIGHT}
            role="img"
            aria-label={`Feast bowl. Current food: ${currentTierInfo.name}. Score ${score}.`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dropXRef.current = pointerToBowlX(event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.buttons > 0 || event.pointerType === 'touch') {
                dropXRef.current = pointerToBowlX(event.clientX);
              }
            }}
            onPointerUp={(event) => {
              dropXRef.current = pointerToBowlX(event.clientX);
              dropFood();
            }}
          />

          <footer className="companion-feast__controls">
            <button
              type="button"
              className="companion-feast__btn companion-feast__btn--nudge"
              onClick={handleNudge}
              disabled={nudgeUsed}
            >
              🐾 Creature Nudge {nudgeUsed ? '(used)' : ''}
            </button>
            <button type="button" className="companion-feast__btn companion-feast__btn--quiet" onClick={endRun}>
              End Run
            </button>
          </footer>
        </div>
      )}

      {phase === 'results' && (
        <div className="companion-feast__panel companion-feast__results" role="dialog" aria-label="Companion Feast results">
          <p className="companion-feast__eyebrow">Feast Complete</p>
          <h2 className="companion-feast__title">
            {resultTier.emoji} {resultTier.label}
          </h2>
          <dl className="companion-feast__result-stats">
            <div>
              <dt>Run score</dt>
              <dd>{lastRunScore}</dd>
            </div>
            <div>
              <dt>Session best</dt>
              <dd>{bestScore}</dd>
            </div>
            <div>
              <dt>Reward</dt>
              <dd>🎲 +{resultTier.rewardDice} dice</dd>
            </div>
          </dl>
          <p className="companion-feast__ticket-note">Tickets left: {ticketsRemaining} 🎟️</p>
          <div className="companion-feast__actions">
            <button
              type="button"
              className="companion-feast__btn companion-feast__btn--primary"
              onClick={startRun}
              disabled={!canPlayAgain}
            >
              {canPlayAgain
                ? `Play Again (${COMPANION_FEAST_RUN_TICKET_COST} 🎟️)`
                : 'No tickets left'}
            </button>
            <button type="button" className="companion-feast__btn" onClick={handleReturnToIsland}>
              Return to Island
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Canvas renderer (no gameplay logic)
// ---------------------------------------------------------------------------

function drawBowl(
  canvas: HTMLCanvasElement | null,
  scene: {
    bodies: readonly CompanionFeastBody[];
    dropX: number;
    currentTier: number;
    dangerRatio: number;
    mergePops: readonly MergePop[];
    nowMs: number;
  },
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = COMPANION_FEAST_BOWL_WIDTH;
  const height = COMPANION_FEAST_BOWL_HEIGHT;

  // Bowl background — deep navy with a soft teal glow.
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#0b1c33');
  bg.addColorStop(1, '#132c4c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Danger line.
  ctx.save();
  ctx.setLineDash([9, 7]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = scene.dangerRatio > 0
    ? `rgba(248, 113, 113, ${0.55 + scene.dangerRatio * 0.45})`
    : 'rgba(45, 212, 191, 0.6)';
  ctx.beginPath();
  ctx.moveTo(0, COMPANION_FEAST_DANGER_LINE_Y);
  ctx.lineTo(width, COMPANION_FEAST_DANGER_LINE_Y);
  ctx.stroke();
  ctx.restore();

  // Drop guide + held food.
  const heldTier = getCompanionFeastFoodTier(scene.currentTier);
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = 'rgba(148, 233, 217, 0.35)';
  ctx.beginPath();
  ctx.moveTo(scene.dropX, heldTier.radius * 2 + 8);
  ctx.lineTo(scene.dropX, height);
  ctx.stroke();
  ctx.restore();
  drawFood(ctx, scene.dropX, heldTier.radius + 4, heldTier.radius, heldTier.color, heldTier.emoji, 0.92);

  // Bodies.
  for (const body of scene.bodies) {
    const tier = getCompanionFeastFoodTier(body.tier);
    drawFood(ctx, body.x, body.y, body.radius, tier.color, tier.emoji, 1);
  }

  // Merge score pops.
  for (const pop of scene.mergePops) {
    const age = (scene.nowMs - pop.bornAtMs) / 700;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - age);
    ctx.fillStyle = '#f3d16b';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${pop.score}`, pop.x, pop.y - age * 34);
    ctx.restore();
  }
}

function drawFood(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  emoji: string,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.stroke();
  ctx.font = `${Math.max(12, Math.floor(radius * 1.15))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y + 1);
  ctx.restore();
}
