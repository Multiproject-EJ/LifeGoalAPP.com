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
  advanceCompanionFeastFever,
  applyCompanionFeastNudge,
  canStartCompanionFeastRun,
  COMPANION_FEAST_BOWL_HEIGHT,
  COMPANION_FEAST_BOWL_WIDTH,
  COMPANION_FEAST_CHAIN_WINDOW_MS,
  COMPANION_FEAST_DANGER_GRACE_MS,
  COMPANION_FEAST_DANGER_LINE_Y,
  COMPANION_FEAST_DEFAULT_PHYSICS,
  COMPANION_FEAST_FEVER_CHARGE_TARGET,
  COMPANION_FEAST_FEVER_DURATION_MS,
  COMPANION_FEAST_FEVER_IDLE,
  COMPANION_FEAST_MAX_TIER,
  createCompanionFeastBody,
  getCompanionFeastFoodTier,
  resolveCompanionFeastMergeAward,
  resolveCompanionFeastResultTier,
  rollCompanionFeastDropTier,
  rollCompanionFeastGoldenDrop,
  stepCompanionFeastPhysics,
  type CompanionFeastBody,
  type CompanionFeastFeverState,
} from '../../level-worlds/services/companionFeastGame';
import {
  createMinigameParticleBurst,
  createMinigameShake,
  MINIGAME_SHAKE_NONE,
  resolveMinigameChainCount,
  resolveMinigameComboTier,
  resolveMinigamePopScale,
  stepMinigameNumberTween,
  stepMinigameParticles,
  stepMinigameShake,
  type MinigameParticle,
  type MinigameShakeState,
} from '../../level-worlds/services/minigameJuice';
import {
  drawGlossyOrb,
  drawMinigameParticles,
  drawScorePop,
  finishMinigameCanvas,
  prefersReducedMotion,
  prepareMinigameCanvas,
  shadeColor,
  withAlpha,
  withGlow,
} from '../_shared/minigameCanvasKit';
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

type MergePop = { id: number; x: number; y: number; score: number; bornAtMs: number; golden: boolean };

/** Transient "Sweet! x2" style banner shown on a chain. */
type ChainCallout = { id: number; label: string; multiplier: number };

/** Supersampled backing store: draw in bowl units, render at 2x for crispness. */
const CANVAS_SUPERSAMPLE = 2;
/** Particle palette per merge, keyed off the produced dish colour at runtime. */
const MERGE_POP_MS = 700;
const CHAIN_CALLOUT_MS = 1100;
/** Spawn/merge squash-and-stretch window. */
const BODY_POP_MS = 320;

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
  const [chainCallout, setChainCallout] = useState<ChainCallout | null>(null);
  const [feverCharge, setFeverCharge] = useState(0);
  const [feverActive, setFeverActive] = useState(false);
  const [feverMsRemaining, setFeverMsRemaining] = useState(0);
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

  // ── Juice + momentum refs (drive the canvas loop, never re-render per frame)
  const particlesRef = useRef<MinigameParticle[]>([]);
  const particlePaletteRef = useRef<string[]>(['#f3d16b']);
  const shakeRef = useRef<MinigameShakeState>(MINIGAME_SHAKE_NONE);
  const feverRef = useRef<CompanionFeastFeverState>(COMPANION_FEAST_FEVER_IDLE);
  const chainCountRef = useRef(0);
  const lastMergeAtRef = useRef(-Infinity);
  const displayedScoreRef = useRef(0);
  const nextGoldenRef = useRef(false);
  const currentGoldenRef = useRef(false);
  const chainTimerRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const bowlFlashRef = useRef(0);

  // Resolved once per mount: reduced-motion players get the same game with
  // shake and particles suppressed, not a degraded one.
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
  }, []);

  phaseRef.current = phase;
  progressRef.current = progress;

  const rollTier = useCallback(() => {
    const [tier, nextState] = rollCompanionFeastDropTier(rngStateRef.current);
    rngStateRef.current = nextState;
    return tier;
  }, []);

  /** Roll whether the next queued fruit is blessed. */
  const rollGolden = useCallback(() => {
    const [golden, nextState] = rollCompanionFeastGoldenDrop(rngStateRef.current);
    rngStateRef.current = nextState;
    return golden;
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
    currentGoldenRef.current = rollGolden();
    nextTierRef.current = rollTier();
    nextGoldenRef.current = rollGolden();

    // Momentum resets with the run — chains and Fever never carry over.
    particlesRef.current = [];
    shakeRef.current = MINIGAME_SHAKE_NONE;
    feverRef.current = COMPANION_FEAST_FEVER_IDLE;
    chainCountRef.current = 0;
    lastMergeAtRef.current = -Infinity;
    displayedScoreRef.current = 0;
    bowlFlashRef.current = 0;

    setScore(0);
    setDangerRatio(0);
    setNudgeUsed(false);
    setLastClaimLabel(null);
    setChainCallout(null);
    setFeverCharge(0);
    setFeverActive(false);
    setFeverMsRemaining(0);
    setPhase('playing');
    refreshTickets();
    playIslandRunSound('minigame_open');
  }, [config, refreshTickets, rollGolden, rollTier]);

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
        golden: currentGoldenRef.current,
      }),
    ];
    currentTierRef.current = nextTierRef.current;
    currentGoldenRef.current = nextGoldenRef.current;
    nextTierRef.current = rollTier();
    nextGoldenRef.current = rollGolden();
    playIslandRunSound('token_move');
  }, [clampDropX, config, rollGolden, rollTier]);

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
    if (chainTimerRef.current !== null) window.clearTimeout(chainTimerRef.current);
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

      let feverChargeGained = 0;
      if (step.merges.length > 0) {
        const reduced = reducedMotionRef.current;
        let gained = 0;
        let strongestMerge = 0;
        let sawGolden = false;

        for (const merge of step.merges) {
          // Each merge either extends the live chain or starts a new one.
          chainCountRef.current = resolveMinigameChainCount({
            previousCount: chainCountRef.current,
            lastActionAtMs: lastMergeAtRef.current,
            nowMs,
            windowMs: COMPANION_FEAST_CHAIN_WINDOW_MS,
          });
          lastMergeAtRef.current = nowMs;

          const award = resolveCompanionFeastMergeAward({
            fromTier: merge.fromTier,
            chainCount: chainCountRef.current,
            feverActive: feverRef.current.activeMsRemaining > 0,
            goldenCount: merge.goldenCount,
            toTier: merge.toTier,
          });

          gained += award.score;
          feverChargeGained += award.feverCharge;
          strongestMerge = Math.max(strongestMerge, merge.toTier ?? COMPANION_FEAST_MAX_TIER);
          if (merge.goldenCount > 0) sawGolden = true;

          mergePopsRef.current.push({
            id: popIdRef.current++,
            x: merge.x,
            y: merge.y,
            score: award.score,
            bornAtMs: nowMs,
            golden: merge.goldenCount > 0,
          });

          if (!reduced) {
            // Burst tinted to the dish that was just created.
            const producedTier = getCompanionFeastFoodTier(merge.toTier ?? COMPANION_FEAST_MAX_TIER);
            particlePaletteRef.current = merge.goldenCount > 0
              ? ['#ffe17b', '#fff6d0', producedTier.color]
              : [producedTier.color, shadeColor(producedTier.color, 0.45), '#ffffff'];
            const [burst, nextRng] = createMinigameParticleBurst({
              x: merge.x,
              y: merge.y,
              count: merge.goldenCount > 0 ? 22 : 10 + strongestMerge,
              speed: 90 + strongestMerge * 14,
              lifeMs: 620,
              radius: 2.4 + strongestMerge * 0.28,
              paletteSize: particlePaletteRef.current.length,
              rngState: rngStateRef.current,
            });
            rngStateRef.current = nextRng;
            particlesRef.current = [...particlesRef.current, ...burst];
          }

          reportMerge(merge.toTier);
        }

        scoreRef.current += gained;
        setScore(scoreRef.current);

        // Shake scales with the biggest dish created this frame.
        if (!reduced) {
          shakeRef.current = createMinigameShake({
            magnitude: 1.6 + strongestMerge * 0.7 + (sawGolden ? 3 : 0),
            durationMs: 240 + strongestMerge * 12,
            rngState: rngStateRef.current,
            previous: shakeRef.current,
          });
        }
        bowlFlashRef.current = Math.min(1, bowlFlashRef.current + 0.35 + (sawGolden ? 0.4 : 0));

        // Escalating praise, only once the chain is actually a chain.
        const comboTier = resolveMinigameComboTier(chainCountRef.current);
        if (comboTier) {
          const multiplier = resolveCompanionFeastMergeAward({
            fromTier: 0,
            chainCount: chainCountRef.current,
            feverActive: feverRef.current.activeMsRemaining > 0,
            goldenCount: 0,
            toTier: 1,
          }).multiplier;
          setChainCallout({ id: popIdRef.current++, label: comboTier.label, multiplier });
          if (chainTimerRef.current !== null) window.clearTimeout(chainTimerRef.current);
          chainTimerRef.current = window.setTimeout(() => {
            setChainCallout(null);
            chainTimerRef.current = null;
          }, CHAIN_CALLOUT_MS);
        }

        playIslandRunSound(sawGolden ? 'sticker_complete' : 'reward_bar_fill');
        triggerIslandRunHaptic(sawGolden ? 'reward_claim' : 'roll');
      }

      // Chain lapses on its own once the window closes with no merges.
      if (chainCountRef.current > 0 && nowMs - lastMergeAtRef.current > COMPANION_FEAST_CHAIN_WINDOW_MS) {
        chainCountRef.current = 0;
      }

      // ── Feast Fever ────────────────────────────────────────────────────────
      const feverStep = advanceCompanionFeastFever({
        state: feverRef.current,
        dtMs,
        chargeAdded: feverChargeGained,
      });
      feverRef.current = feverStep.state;
      setFeverCharge(feverStep.state.charge);
      setFeverMsRemaining(feverStep.state.activeMsRemaining);
      if (feverStep.justActivated) {
        setFeverActive(true);
        bowlFlashRef.current = 1;
        playIslandRunSound('reward_bar_cascade');
        triggerIslandRunHaptic('reward_claim');
        if (!reducedMotionRef.current) {
          shakeRef.current = createMinigameShake({
            magnitude: 7,
            durationMs: 520,
            rngState: rngStateRef.current,
            previous: shakeRef.current,
          });
        }
      }
      if (feverStep.justEnded) {
        setFeverActive(false);
        playIslandRunSound('token_move');
      }

      // Advance juice simulations.
      particlesRef.current = stepMinigameParticles(particlesRef.current, {
        dtMs,
        gravity: 420,
        drag: 0.72,
      });
      const shakeStep = stepMinigameShake(shakeRef.current, dtMs);
      shakeRef.current = shakeStep.state;
      displayedScoreRef.current = stepMinigameNumberTween({
        current: displayedScoreRef.current,
        target: scoreRef.current,
        dtMs,
        approachPerSecond: 10,
        minUnitsPerSecond: 30,
      });
      bowlFlashRef.current = Math.max(0, bowlFlashRef.current - dtMs / 420);

      mergePopsRef.current = mergePopsRef.current.filter((pop) => nowMs - pop.bornAtMs < MERGE_POP_MS);

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
        currentGolden: currentGoldenRef.current,
        dangerRatio: Math.min(1, danger.elapsedDangerMs / COMPANION_FEAST_DANGER_GRACE_MS),
        mergePops: mergePopsRef.current,
        particles: particlesRef.current,
        particlePalette: particlePaletteRef.current,
        shakeX: shakeStep.offsetX,
        shakeY: shakeStep.offsetY,
        feverActive: feverRef.current.activeMsRemaining > 0,
        bowlFlash: bowlFlashRef.current,
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
            <div className="companion-feast__hud-stat companion-feast__hud-stat--next" aria-label={`Next food: ${nextTierInfo.name}${nextGoldenRef.current ? ', blessed' : ''}`}>
              <span className="companion-feast__hud-label">Next</span>
              <span className={`companion-feast__hud-next${nextGoldenRef.current ? ' companion-feast__hud-next--golden' : ''}`}>
                {nextTierInfo.emoji}
              </span>
            </div>
          </header>

          <div
            className={`companion-feast__fever${feverActive ? ' companion-feast__fever--active' : ''}`}
            aria-label={feverActive
              ? `Feast Fever active, ${Math.ceil(feverMsRemaining / 1000)} seconds left`
              : `Feast Fever meter ${Math.round((feverCharge / COMPANION_FEAST_FEVER_CHARGE_TARGET) * 100)}% charged`}
          >
            <span className="companion-feast__fever-label">
              {feverActive ? `🔥 FEAST FEVER ×2 · ${Math.ceil(feverMsRemaining / 1000)}s` : '🔥 Feast Fever'}
            </span>
            <div className="companion-feast__fever-track" role="presentation">
              <div
                className="companion-feast__fever-fill"
                style={{
                  width: feverActive
                    ? `${Math.max(0, (feverMsRemaining / COMPANION_FEAST_FEVER_DURATION_MS) * 100)}%`
                    : `${Math.min(100, (feverCharge / COMPANION_FEAST_FEVER_CHARGE_TARGET) * 100)}%`,
                }}
              />
            </div>
          </div>

          {chainCallout && (
            <p key={chainCallout.id} className="companion-feast__chain" role="status">
              {chainCallout.label}! ×{chainCallout.multiplier}
            </p>
          )}

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
            width={COMPANION_FEAST_BOWL_WIDTH * CANVAS_SUPERSAMPLE}
            height={COMPANION_FEAST_BOWL_HEIGHT * CANVAS_SUPERSAMPLE}
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

interface BowlScene {
  bodies: readonly CompanionFeastBody[];
  dropX: number;
  currentTier: number;
  currentGolden: boolean;
  dangerRatio: number;
  mergePops: readonly MergePop[];
  particles: readonly MinigameParticle[];
  particlePalette: readonly string[];
  shakeX: number;
  shakeY: number;
  feverActive: boolean;
  /** 0..1 decaying bloom applied to the bowl after a merge. */
  bowlFlash: number;
  nowMs: number;
}

function drawBowl(canvas: HTMLCanvasElement | null, scene: BowlScene): void {
  const ctx = prepareMinigameCanvas(canvas, COMPANION_FEAST_BOWL_WIDTH, COMPANION_FEAST_BOWL_HEIGHT);
  if (!ctx) return;

  const width = COMPANION_FEAST_BOWL_WIDTH;
  const height = COMPANION_FEAST_BOWL_HEIGHT;

  // Everything inside the bowl shakes together; the frame does not.
  ctx.save();
  ctx.translate(scene.shakeX, scene.shakeY);

  drawBowlInterior(ctx, width, height, scene);
  drawDangerLine(ctx, width, scene);
  drawDropGuide(ctx, height, scene);

  // Settled/falling food, painted back-to-front so bigger dishes overlap.
  const ordered = [...scene.bodies].sort((a, b) => a.radius - b.radius);
  for (const body of ordered) {
    const tier = getCompanionFeastFoodTier(body.tier);
    drawGlossyOrb(ctx, {
      x: body.x,
      y: body.y,
      radius: body.radius,
      color: tier.color,
      // Freshly spawned/merged dishes pop in rather than appearing flatly.
      scale: resolveMinigamePopScale({
        ageMs: body.ageMs ?? BODY_POP_MS,
        durationMs: BODY_POP_MS,
        amplitude: 0.28,
      }),
      glyph: tier.emoji,
      highlightRing: body.golden ? '#ffe17b' : null,
    });
  }

  drawMinigameParticles(ctx, scene.particles, scene.particlePalette);

  for (const pop of scene.mergePops) {
    drawScorePop(ctx, {
      x: pop.x,
      y: pop.y,
      text: `+${pop.score}`,
      progress: (scene.nowMs - pop.bornAtMs) / MERGE_POP_MS,
      color: pop.golden ? '#fff3c4' : '#ffe17b',
    });
  }

  ctx.restore();
  finishMinigameCanvas(ctx);
}

/** Glass vessel: depth gradient, inner walls, floor pooling and Fever wash. */
function drawBowlInterior(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: BowlScene,
): void {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  if (scene.feverActive) {
    bg.addColorStop(0, '#3a2708');
    bg.addColorStop(0.5, '#22305a');
    bg.addColorStop(1, '#132c4c');
  } else {
    bg.addColorStop(0, '#091729');
    bg.addColorStop(0.55, '#0e2340');
    bg.addColorStop(1, '#15304f');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Soft vignette so the centre reads brighter than the walls.
  const vignette = ctx.createRadialGradient(width / 2, height * 0.55, width * 0.2, width / 2, height * 0.55, width * 0.78);
  vignette.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  vignette.addColorStop(1, 'rgba(2, 7, 16, 0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Merge bloom.
  if (scene.bowlFlash > 0) {
    ctx.fillStyle = withAlpha(scene.feverActive ? '#ffd76a' : '#8fe3ff', scene.bowlFlash * 0.13);
    ctx.fillRect(0, 0, width, height);
  }

  // Inner glass walls catching the key light from the upper-left.
  const leftWall = ctx.createLinearGradient(0, 0, 26, 0);
  leftWall.addColorStop(0, 'rgba(190, 235, 255, 0.16)');
  leftWall.addColorStop(1, 'rgba(190, 235, 255, 0)');
  ctx.fillStyle = leftWall;
  ctx.fillRect(0, 0, 26, height);

  const rightWall = ctx.createLinearGradient(width, 0, width - 18, 0);
  rightWall.addColorStop(0, 'rgba(120, 190, 230, 0.1)');
  rightWall.addColorStop(1, 'rgba(120, 190, 230, 0)');
  ctx.fillStyle = rightWall;
  ctx.fillRect(width - 18, 0, 18, height);

  // Floor pooling.
  const floor = ctx.createLinearGradient(0, height - 46, 0, height);
  floor.addColorStop(0, 'rgba(3, 10, 22, 0)');
  floor.addColorStop(1, 'rgba(3, 10, 22, 0.5)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, height - 46, width, 46);

  if (scene.feverActive) {
    withGlow(ctx, '#ffd76a', 26, () => {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.55)';
      ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
    });
  }
}

function drawDangerLine(ctx: CanvasRenderingContext2D, width: number, scene: BowlScene): void {
  const y = COMPANION_FEAST_DANGER_LINE_Y;
  // Heartbeat: the closer to overflow, the harder the line pulses.
  const pulse = scene.dangerRatio > 0
    ? 0.55 + 0.45 * Math.abs(Math.sin(scene.nowMs / (240 - scene.dangerRatio * 120)))
    : 0.4;
  const color = scene.dangerRatio > 0 ? '#f87171' : '#2dd4bf';

  ctx.save();
  if (scene.dangerRatio > 0) {
    const wash = ctx.createLinearGradient(0, 0, 0, y);
    wash.addColorStop(0, withAlpha('#f87171', 0.26 * scene.dangerRatio));
    wash.addColorStop(1, 'rgba(248, 113, 113, 0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, y);
  }
  ctx.setLineDash([9, 7]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(color, pulse);
  ctx.shadowColor = withAlpha(color, pulse * 0.8);
  ctx.shadowBlur = scene.dangerRatio > 0 ? 12 : 5;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.restore();
}

function drawDropGuide(ctx: CanvasRenderingContext2D, height: number, scene: BowlScene): void {
  const heldTier = getCompanionFeastFoodTier(scene.currentTier);

  const guide = ctx.createLinearGradient(0, 0, 0, height);
  guide.addColorStop(0, 'rgba(148, 233, 217, 0.4)');
  guide.addColorStop(1, 'rgba(148, 233, 217, 0.03)');
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = guide;
  ctx.beginPath();
  ctx.moveTo(scene.dropX, heldTier.radius * 2 + 8);
  ctx.lineTo(scene.dropX, height);
  ctx.stroke();
  ctx.restore();

  // Landing marker so aiming reads at a glance.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(scene.dropX, height - 8, heldTier.radius * 0.8, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(148, 233, 217, 0.5)';
  ctx.fill();
  ctx.restore();

  drawGlossyOrb(ctx, {
    x: scene.dropX,
    y: heldTier.radius + 4,
    radius: heldTier.radius,
    color: heldTier.color,
    alpha: 0.95,
    glyph: heldTier.emoji,
    highlightRing: scene.currentGolden ? '#ffe17b' : null,
    shadow: false,
  });
}
