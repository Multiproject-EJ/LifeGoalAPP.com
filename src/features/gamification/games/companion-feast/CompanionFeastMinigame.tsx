/**
 * CompanionFeastMinigame.tsx — playable fruit-drop-and-merge feast bowl for
 * the Companion Feast timed event.
 *
 * Three states only: entry → playing → results. All rules/physics live in
 * `services/companionFeastGame.ts` and campaign progression in
 * `services/companionFeastProgression.ts`; this file owns rendering + input.
 *
 * Ticket authority stays canonical: every fruit dropped spends 1 event
 * ticket through the `requestDropSpend` launchConfig callback
 * (`applyCompanionFeastDrop`), merges report through `requestMergeResult`
 * (level clears + rewards-bar feast points), and rewards-bar milestones are
 * claimed through `requestClaimMilestoneReward`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import type { CompanionFeastProgressEntry } from '../../level-worlds/services/islandRunGameStateStore';
import {
  advanceCompanionFeastDangerTimer,
  applyCompanionFeastNudge,
  canStartCompanionFeastRun,
  COMPANION_FEAST_BOWL_HEIGHT,
  COMPANION_FEAST_BOWL_WIDTH,
  COMPANION_FEAST_DANGER_GRACE_MS,
  COMPANION_FEAST_DANGER_LINE_Y,
  COMPANION_FEAST_DEFAULT_PHYSICS,
  COMPANION_FEAST_MAX_TIER,
  createCompanionFeastBody,
  getCompanionFeastFoodTier,
  resolveCompanionFeastResultTier,
  rollCompanionFeastDropTier,
  stepCompanionFeastPhysics,
  type CompanionFeastBody,
} from '../../level-worlds/services/companionFeastGame';
import {
  buildCompanionFeastRewardBarViewModel,
  COMPANION_FEAST_DROP_TICKET_COST,
  getCompanionFeastLevel,
  isCompanionFeastCampaignComplete,
  type CompanionFeastLevel,
  type CompanionFeastRewardBarViewModel,
} from '../../level-worlds/services/companionFeastProgression';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../level-worlds/services/islandRunAudio';
import './companionFeast.css';

type GamePhase = 'entry' | 'playing' | 'results';

type CompanionFeastLaunchConfig = {
  initialProgress?: CompanionFeastProgressEntry | null;
  getTicketsRemaining?: () => number;
  requestDropSpend?: () => {
    ok: boolean;
    ticketsRemaining: number;
    progress: CompanionFeastProgressEntry | null;
    failureReason?: string;
  };
  requestMergeResult?: (mergedToTier: number | null, runScore: number) => {
    progress: CompanionFeastProgressEntry | null;
    clearedLevels: CompanionFeastLevel[];
  };
  requestClaimMilestoneReward?: (milestoneId: string) => {
    ok: boolean;
    progress: CompanionFeastProgressEntry | null;
    rewardLabel: string | null;
    failureReason?: string;
  };
};

type MergePop = { id: number; x: number; y: number; score: number; bornAtMs: number };

const DROP_COOLDOWN_MS = 420;
const LEVEL_CLEAR_BANNER_MS = 2600;
/**
 * Tier reported when only the run score should be recorded (tier 0 can never
 * clear a level, so this is a safe "score-only" merge report).
 */
const SCORE_ONLY_REPORT_TIER = 0;

/**
 * Session best score. Intentionally module-level (not React state) so the
 * best survives the game component unmounting between event launches within
 * the same app session, and intentionally not persisted — it resets on app
 * reload by design ("session best").
 */
let sessionBestScore = 0;

export default function CompanionFeastMinigame({ onComplete, launchConfig }: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as CompanionFeastLaunchConfig;

  const [phase, setPhase] = useState<GamePhase>('entry');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(sessionBestScore);
  const [nudgeUsed, setNudgeUsed] = useState(false);
  const [dangerRatio, setDangerRatio] = useState(0);
  const [ticketsRemaining, setTicketsRemaining] = useState(() => config.getTicketsRemaining?.() ?? 0);
  const [progress, setProgress] = useState<CompanionFeastProgressEntry | null>(() => config.initialProgress ?? null);
  const [levelClearBanner, setLevelClearBanner] = useState<CompanionFeastLevel | null>(null);
  const [runsFinished, setRunsFinished] = useState(0);
  const [rewardDiceTotal, setRewardDiceTotal] = useState(0);
  const [lastRunScore, setLastRunScore] = useState(0);
  const [lastClaimLabel, setLastClaimLabel] = useState<string | null>(null);

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
  const progressRef = useRef<CompanionFeastProgressEntry | null>(config.initialProgress ?? null);
  const bannerTimerRef = useRef<number | null>(null);

  phaseRef.current = phase;
  progressRef.current = progress;

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
    // Record the run score against the campaign best (score-only report).
    const outcome = config.requestMergeResult?.(SCORE_ONLY_REPORT_TIER, finalScore);
    if (outcome?.progress) setProgress(outcome.progress);
    setPhase('results');
    refreshTickets();
    playIslandRunSound('minigame_complete');
    triggerIslandRunHaptic('reward_claim');
  }, [config, refreshTickets]);

  const startRun = useCallback(() => {
    if (!canStartCompanionFeastRun({
      ticketsRemaining: config.getTicketsRemaining?.() ?? 0,
    })) {
      refreshTickets();
      return;
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
    setLastClaimLabel(null);
    setPhase('playing');
    refreshTickets();
    playIslandRunSound('minigame_open');
  }, [config, refreshTickets, rollTier]);

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
    // Every drop is a ticket: spend through the canonical action first.
    const spend = config.requestDropSpend?.();
    if (spend) {
      setTicketsRemaining(spend.ticketsRemaining);
      if (spend.progress) setProgress(spend.progress);
      if (!spend.ok) {
        triggerIslandRunHaptic('roll');
        return;
      }
    }
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
  }, [clampDropX, config, rollTier]);

  const showLevelClearBanner = useCallback((level: CompanionFeastLevel) => {
    setLevelClearBanner(level);
    if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      setLevelClearBanner(null);
      bannerTimerRef.current = null;
    }, LEVEL_CLEAR_BANNER_MS);
  }, []);

  useEffect(() => () => {
    if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
  }, []);

  const reportMerge = useCallback((mergedToTier: number | null) => {
    // `null` marks a max-tier celebration merge (see CompanionFeastMergeEvent).
    const producedTier = mergedToTier === null ? COMPANION_FEAST_MAX_TIER : mergedToTier;
    const known = progressRef.current;
    // Only escalate merges that can move the campaign (new highest tier).
    if (known && producedTier <= known.highestTierReached) return;
    const outcome = config.requestMergeResult?.(mergedToTier, scoreRef.current);
    if (!outcome) return;
    if (outcome.progress) setProgress(outcome.progress);
    if (outcome.clearedLevels.length > 0) {
      showLevelClearBanner(outcome.clearedLevels[outcome.clearedLevels.length - 1]);
      playIslandRunSound('minigame_complete');
      triggerIslandRunHaptic('reward_claim');
    }
  }, [config, showLevelClearBanner]);

  const handleClaimMilestone = useCallback((milestoneId: string) => {
    const claim = config.requestClaimMilestoneReward?.(milestoneId);
    if (!claim) return;
    if (claim.progress) setProgress(claim.progress);
    if (claim.ok) {
      setLastClaimLabel(claim.rewardLabel);
      playIslandRunSound('reward_bar_fill');
      triggerIslandRunHaptic('reward_claim');
    }
  }, [config]);

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
        for (const merge of step.merges) {
          reportMerge(merge.toTier);
        }
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
  }, [phase, endRun, reportMerge]);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  const currentTierInfo = getCompanionFeastFoodTier(currentTierRef.current);
  const nextTierInfo = getCompanionFeastFoodTier(nextTierRef.current);
  const resultTier = useMemo(() => resolveCompanionFeastResultTier(lastRunScore), [lastRunScore]);
  const canPlayRun = canStartCompanionFeastRun({ ticketsRemaining });
  const campaignComplete = isCompanionFeastCampaignComplete(progress);
  const activeLevel = getCompanionFeastLevel(progress?.levelIndex ?? 0);
  const activeGoalTierInfo = getCompanionFeastFoodTier(activeLevel.goalTier);
  const rewardBar = useMemo(() => buildCompanionFeastRewardBarViewModel(progress), [progress]);

  return (
    <section className="companion-feast" aria-label="Companion Feast mini-game">
      {phase === 'entry' && (
        <div className="companion-feast__panel companion-feast__entry" role="dialog" aria-label="Companion Feast entry">
          <p className="companion-feast__eyebrow">Island Event</p>
          <h2 className="companion-feast__title">🐾 Companion Feast</h2>
          <p className="companion-feast__copy">
            The island creatures are gathering for a magical feast! Drop fruit into the
            enchanted bowl — matching dishes merge into grander ones.
          </p>
          <div className="companion-feast__level-card" aria-label={`Level ${activeLevel.levelNumber}: ${activeLevel.name}`}>
            <span className="companion-feast__level-goal-emoji" aria-hidden="true">{activeGoalTierInfo.emoji}</span>
            <div>
              <p className="companion-feast__level-name">
                {campaignComplete ? 'Campaign complete — encore feasts!' : `Level ${activeLevel.levelNumber} · ${activeLevel.name}`}
              </p>
              <p className="companion-feast__level-flavor">
                {campaignComplete
                  ? 'Every dish has been forged. Keep merging for the joy of the feast!'
                  : activeLevel.flavor}
              </p>
            </div>
          </div>
          <RewardBar rewardBar={rewardBar} onClaim={handleClaimMilestone} />
          <ul className="companion-feast__rules">
            <li>🍒 Drag to aim, release to drop fruit.</li>
            <li>🎟️ Every fruit dropped spends {COMPANION_FEAST_DROP_TICKET_COST} ticket — earn more on the island loop.</li>
            <li>✨ Two matching dishes merge and score. Forge the goal dish to clear the level!</li>
            <li>⚠️ Keep the bowl below the glow line — overflow ends the run.</li>
            <li>🐾 Creature Nudge gently shakes the bowl, once per run.</li>
          </ul>
          <p className="companion-feast__ticket-note">Tickets left: {ticketsRemaining} 🎟️</p>
          {lastClaimLabel && (
            <p className="companion-feast__claim-note">Claimed: {lastClaimLabel} 🎉</p>
          )}
          <div className="companion-feast__actions">
            <button
              type="button"
              className="companion-feast__btn companion-feast__btn--primary"
              onClick={startRun}
              disabled={!canPlayRun}
            >
              {canPlayRun ? 'Start the Feast' : 'No tickets — play the island loop!'}
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
            <div
              className="companion-feast__hud-stat"
              aria-label={campaignComplete
                ? 'Campaign complete'
                : `Level ${activeLevel.levelNumber}. Goal: ${activeGoalTierInfo.name}`}
            >
              <span className="companion-feast__hud-label">
                {campaignComplete ? 'Encore' : `Lv ${activeLevel.levelNumber}`}
              </span>
              <span className="companion-feast__hud-next">{campaignComplete ? '👑' : activeGoalTierInfo.emoji}</span>
            </div>
            <div className="companion-feast__hud-stat" aria-label={`Tickets remaining: ${ticketsRemaining}`}>
              <span className="companion-feast__hud-label">Tickets</span>
              <span className="companion-feast__hud-value">{ticketsRemaining} 🎟️</span>
            </div>
            <div className="companion-feast__hud-stat companion-feast__hud-stat--next" aria-label={`Next food: ${nextTierInfo.name}`}>
              <span className="companion-feast__hud-label">Next</span>
              <span className="companion-feast__hud-next">{nextTierInfo.emoji}</span>
            </div>
          </header>

          {levelClearBanner && (
            <div className="companion-feast__level-clear" role="status">
              🎉 Level {levelClearBanner.levelNumber} cleared — {levelClearBanner.name}!
            </div>
          )}
          {!canPlayRun && (
            <div className="companion-feast__no-tickets" role="status">
              🎟️ Out of tickets — earn more on the island loop, then keep feasting!
            </div>
          )}

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
          <div className="companion-feast__level-card">
            <span className="companion-feast__level-goal-emoji" aria-hidden="true">{campaignComplete ? '👑' : activeGoalTierInfo.emoji}</span>
            <div>
              <p className="companion-feast__level-name">
                {campaignComplete
                  ? 'Campaign complete — encore feasts!'
                  : `Next up: Level ${activeLevel.levelNumber} · ${activeLevel.name}`}
              </p>
              <p className="companion-feast__level-flavor">
                {campaignComplete
                  ? 'Every dish has been forged. Keep merging for the joy of the feast!'
                  : activeLevel.flavor}
              </p>
            </div>
          </div>
          <RewardBar rewardBar={rewardBar} onClaim={handleClaimMilestone} />
          {lastClaimLabel && (
            <p className="companion-feast__claim-note">Claimed: {lastClaimLabel} 🎉</p>
          )}
          <p className="companion-feast__ticket-note">Tickets left: {ticketsRemaining} 🎟️</p>
          <div className="companion-feast__actions">
            <button
              type="button"
              className="companion-feast__btn companion-feast__btn--primary"
              onClick={startRun}
              disabled={!canPlayRun}
            >
              {canPlayRun
                ? `Play Again (${COMPANION_FEAST_DROP_TICKET_COST} 🎟️ per fruit)`
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
// Rewards bar (visible upcoming rewards along the campaign)
// ---------------------------------------------------------------------------

function RewardBar({
  rewardBar,
  onClaim,
}: {
  rewardBar: CompanionFeastRewardBarViewModel;
  onClaim: (milestoneId: string) => void;
}) {
  return (
    <div className="companion-feast__reward-bar" aria-label={`Rewards bar: ${rewardBar.feastPoints} of ${rewardBar.totalPoints} feast points`}>
      <div className="companion-feast__reward-track" role="presentation">
        <div className="companion-feast__reward-fill" style={{ width: `${Math.round(rewardBar.fillRatio * 100)}%` }} />
      </div>
      <ol className="companion-feast__reward-nodes">
        {rewardBar.nodes.map((node) => (
          <li
            key={node.milestone.id}
            className={`companion-feast__reward-node companion-feast__reward-node--${node.state}`}
          >
            <span className="companion-feast__reward-node-emoji" aria-hidden="true">{node.goalEmoji}</span>
            <span className="companion-feast__reward-node-label">{node.milestone.rewardLabel}</span>
            {node.state === 'claimable' ? (
              <button
                type="button"
                className="companion-feast__btn companion-feast__btn--claim"
                onClick={() => onClaim(node.milestone.id)}
              >
                Claim
              </button>
            ) : (
              <span className="companion-feast__reward-node-state">
                {node.state === 'claimed' ? '✅' : `Lv ${node.milestone.pointsRequired}`}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
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
