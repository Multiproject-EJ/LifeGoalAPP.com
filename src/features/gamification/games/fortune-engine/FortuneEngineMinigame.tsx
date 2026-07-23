/**
 * FortuneEngineMinigame.tsx — The Fortune Engine, the playable event game on
 * the `lucky_spin` timed-event rotation slot.
 *
 * Flow: entry → (launch: 1 ticket, or the free daily Golden Launch) → spin
 * the route wheel → three increasingly fast circular timing rings (tap when
 * the pointer sweeps a reward node, avoid corrupted sectors) → bank or go
 * deeper after each ring → results. Run scores feed the event reward track;
 * jackpot/golden runs light up Fortune Core fragments on the 3×3 grid, and a
 * complete core unlocks the ticket-free finale ("Stabilise the Fortune
 * Core") with a one-shot final reward.
 *
 * All rules live in `services/fortuneEngineGame.ts` and campaign progression
 * in `services/fortuneEngineProgression.ts`; this file owns rendering +
 * input. Ticket authority stays canonical: launches spend through the
 * `requestLaunchSpend` launchConfig callback (`applyFortuneEngineLaunch`),
 * run results persist through `requestRunResult`, milestone claims through
 * `requestClaimMilestoneReward`, and the finale through `requestFinaleResult`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import type { FortuneEngineProgressEntry } from '../../level-worlds/services/islandRunGameStateStore';
import {
  buildFortuneRing,
  FORTUNE_FINALE_DURATION_MS,
  FORTUNE_FINALE_REVOLUTION_MS,
  FORTUNE_FINALE_TARGET_COUNT,
  FORTUNE_RING_COUNT,
  FORTUNE_RING_SEGMENT_COUNT,
  FORTUNE_RUN_HAZARD_LIMIT,
  FORTUNE_WHEEL_SLOTS,
  FORTUNE_ROUTES,
  getFortuneRouteForSlot,
  isFortunePerfectTapAngle,
  nextFortuneRng,
  resolveFortuneCrushKeepDivisor,
  resolveFortunePerfectPointsMultiplier,
  resolveFortuneRunMultiplier,
  resolveFortuneRunOutcome,
  resolveFortuneSegmentIndexForAngle,
  resolveFortuneTap,
  rollFortuneFinaleTargets,
  rollFortuneWheelSlot,
  type FortuneRing,
  type FortuneRingSegment,
  type FortuneRoute,
  type FortuneRunEnd,
  type FortuneRunOutcome,
} from '../../level-worlds/services/fortuneEngineGame';
import {
  buildFortuneEngineTrackViewModel,
  canLaunchFortuneEngine,
  FORTUNE_CORE_FRAGMENTS,
  FORTUNE_ENGINE_FINALE_REWARD_LABEL,
  FORTUNE_ENGINE_LAUNCH_TICKET_COST,
  isFortuneCoreComplete,
  isFortuneFinaleUnlocked,
  isFortuneGoldenLaunchAvailable,
  resolveFortuneCoreFragmentIds,
  resolveGoldenStreakPerks,
  type FortuneEngineTrackViewModel,
} from '../../level-worlds/services/fortuneEngineProgression';
import { playIslandRunSound, triggerIslandRunHaptic } from '../../level-worlds/services/islandRunAudio';
import './fortuneEngine.css';

type GamePhase = 'entry' | 'spin' | 'ring' | 'decision' | 'results' | 'finale' | 'finale_results';

type FortuneEngineLaunchConfig = {
  activeEventId?: string;
  /** Event departure timestamp for the "Fortune Engine departs in…" clock. */
  eventExpiresAtMs?: number;
  initialProgress?: FortuneEngineProgressEntry | null;
  getTicketsRemaining?: () => number;
  requestLaunchSpend?: () => {
    ok: boolean;
    golden: boolean;
    ticketsRemaining: number;
    progress: FortuneEngineProgressEntry | null;
    failureReason?: string;
  };
  requestRunResult?: (payload: {
    runScore: number;
    eventPoints: number;
    fragmentAwarded: boolean;
    essence: number;
  }) => {
    progress: FortuneEngineProgressEntry | null;
    awardedFragmentId: number | null;
    coreJustCompleted: boolean;
  };
  requestClaimMilestoneReward?: (milestoneId: string) => {
    ok: boolean;
    progress: FortuneEngineProgressEntry | null;
    rewardLabel: string | null;
    ticketsRemaining: number;
    failureReason?: string;
  };
  requestFinaleResult?: (success: boolean) => {
    ok: boolean;
    progress: FortuneEngineProgressEntry | null;
    rewardLabel: string | null;
    failureReason?: string;
  };
};

const CANVAS_SIZE = 480;
const CANVAS_LOGICAL_SIZE = 340;
const WHEEL_SPIN_DURATION_MS = 2600;
const ROUTE_BANNER_MS = 1600;
const SEGMENT_GLYPHS: Record<FortuneRingSegment['kind'], string> = {
  points: '★',
  dice: 'D6',
  essence: '◆',
  time: '+S',
  hazard: '!',
  empty: '',
};
const SEGMENT_SURFACES: Record<FortuneRingSegment['kind'], readonly [string, string]> = {
  points: ['#5a430f', '#d2a333'],
  dice: ['#13375e', '#438fd1'],
  essence: ['#342252', '#8557bd'],
  time: ['#10443f', '#2a9b85'],
  hazard: ['#581b25', '#b93f49'],
  empty: ['#0b172b', '#172943'],
};
const ROUTE_COLORS: Record<FortuneRoute['id'], string> = {
  treasure: '#f3d16b',
  multiplier: '#c39bff',
  risk: '#f87171',
  chrono: '#5eead4',
  jackpot: '#7cc4ff',
};
const ROUTE_GLYPHS: Record<FortuneRoute['id'], string> = {
  treasure: '◆',
  multiplier: '×2',
  risk: '!',
  chrono: '+S',
  jackpot: '★',
};
const ROUTE_SURFACES: Record<FortuneRoute['id'], readonly [string, string]> = {
  treasure: ['#553c0d', '#bf8d24'],
  multiplier: ['#302350', '#7955ac'],
  risk: ['#521a22', '#a93a43'],
  chrono: ['#103f45', '#258b91'],
  jackpot: ['#153b58', '#4388b4'],
};

function formatEventCountdown(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(remainingMs / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function FortuneEngineMinigame({ onComplete, launchConfig }: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as FortuneEngineLaunchConfig;

  const [phase, setPhase] = useState<GamePhase>('entry');
  const [progress, setProgress] = useState<FortuneEngineProgressEntry | null>(() => config.initialProgress ?? null);
  const [ticketsRemaining, setTicketsRemaining] = useState(() => config.getTicketsRemaining?.() ?? 0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastClaimLabel, setLastClaimLabel] = useState<string | null>(null);

  // Per-run state (React state only where it drives DOM; refs drive the canvas loop).
  const [activeRoute, setActiveRoute] = useState<FortuneRoute | null>(null);
  const [showRouteBanner, setShowRouteBanner] = useState(false);
  const [runGolden, setRunGolden] = useState(false);
  const [ringIndex, setRingIndex] = useState(0);
  const [rawPoints, setRawPoints] = useState(0);
  const [runDice, setRunDice] = useState(0);
  const [runEssence, setRunEssence] = useState(0);
  const [hazardsHit, setHazardsHit] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [shieldsLeft, setShieldsLeft] = useState(0);
  const [runMultiplierBonus, setRunMultiplierBonus] = useState(0);
  const [ringTimeLeftMs, setRingTimeLeftMs] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<FortuneRunOutcome | null>(null);
  const [lastFragmentId, setLastFragmentId] = useState<number | null>(null);
  const [runsFinished, setRunsFinished] = useState(0);
  const [sessionDiceTotal, setSessionDiceTotal] = useState(0);
  const [finaleHitCount, setFinaleHitCount] = useState(0);
  const [finaleFailed, setFinaleFailed] = useState(false);
  const [finaleRewardLabel, setFinaleRewardLabel] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rngRef = useRef(((Date.now() % 2147483646) + 1) | 0);
  const ringRef = useRef<FortuneRing | null>(null);
  const segmentsRef = useRef<FortuneRingSegment[]>([]);
  const ringStartedAtRef = useRef(0);
  const ringTimeLeftRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pointerAngleRef = useRef(0);
  const phaseRef = useRef<GamePhase>('entry');
  const routeRef = useRef<FortuneRoute | null>(null);
  const runTotalsRef = useRef({ rawPoints: 0, dice: 0, essence: 0, hazards: 0 });
  const comboRef = useRef(0);
  const shieldsRef = useRef(0);
  const runBonusRef = useRef(0);
  const wheelSpinRef = useRef<{ startAtMs: number; fromDeg: number; toDeg: number; slotIndex: number } | null>(null);
  const finaleTargetsRef = useRef<number[]>([]);
  const finaleHitsRef = useRef<Set<number>>(new Set());
  const bannerTimerRef = useRef<number | null>(null);

  phaseRef.current = phase;
  routeRef.current = activeRoute;

  const refreshTickets = useCallback(() => {
    setTicketsRemaining(config.getTicketsRemaining?.() ?? 0);
  }, [config]);

  // Event departure clock + golden-launch day rollover.
  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => {
    if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const goldenAvailable = isFortuneGoldenLaunchAvailable(progress, nowMs);
  const canLaunch = canLaunchFortuneEngine({ ticketsRemaining, goldenLaunchAvailable: goldenAvailable });
  const coreComplete = isFortuneCoreComplete(progress);
  const finaleUnlocked = isFortuneFinaleUnlocked(progress);
  const finaleDone = progress?.finaleCompleted === true;
  const fragmentIds = useMemo(() => new Set(resolveFortuneCoreFragmentIds(progress?.fragmentIds ?? [])), [progress]);
  const trackViewModel = useMemo(() => buildFortuneEngineTrackViewModel(progress), [progress]);
  const eventRemainingMs = Math.max(0, (config.eventExpiresAtMs ?? 0) - nowMs);
  const eventUnstable = config.eventExpiresAtMs !== undefined && eventRemainingMs > 0 && eventRemainingMs < 24 * 60 * 60 * 1000;

  // ── Run lifecycle ──────────────────────────────────────────────────────────

  const handleLaunch = useCallback(() => {
    const spend = config.requestLaunchSpend?.();
    let goldenRun = false;
    if (spend) {
      setTicketsRemaining(spend.ticketsRemaining);
      if (spend.progress) setProgress(spend.progress);
      if (!spend.ok) {
        triggerIslandRunHaptic('roll');
        return;
      }
      goldenRun = spend.golden;
      setRunGolden(spend.golden);
    } else {
      setRunGolden(false);
    }

    // Golden Launch streak perks apply to the whole golden run.
    const perks = goldenRun
      ? resolveGoldenStreakPerks(spend?.progress?.goldenStreakCount ?? 0)
      : { startMultiplierBonus: 0, hazardShields: 0 };
    runBonusRef.current = perks.startMultiplierBonus;
    setRunMultiplierBonus(perks.startMultiplierBonus);
    shieldsRef.current = perks.hazardShields;
    setShieldsLeft(perks.hazardShields);
    comboRef.current = 0;
    setComboCount(0);

    const [slotIndex, nextState] = rollFortuneWheelSlot(rngRef.current);
    rngRef.current = nextState;
    const slotArcDeg = 360 / FORTUNE_WHEEL_SLOTS.length;
    const slotCenterDeg = slotIndex * slotArcDeg + slotArcDeg / 2;
    wheelSpinRef.current = {
      startAtMs: performance.now(),
      fromDeg: 0,
      toDeg: 360 * 4 + (360 - slotCenterDeg),
      slotIndex,
    };
    runTotalsRef.current = { rawPoints: 0, dice: 0, essence: 0, hazards: 0 };
    setRawPoints(0);
    setRunDice(0);
    setRunEssence(0);
    setHazardsHit(0);
    setRingIndex(0);
    setLastOutcome(null);
    setLastFragmentId(null);
    setLastClaimLabel(null);
    setActiveRoute(null);
    setShowRouteBanner(false);
    setPhase('spin');
    playIslandRunSound('minigame_open');
    triggerIslandRunHaptic('roll');
  }, [config]);

  const startRing = useCallback((index: number, route: FortuneRoute) => {
    const [ring, nextState] = buildFortuneRing({ ringIndex: index, route, rngState: rngRef.current });
    rngRef.current = nextState;
    ringRef.current = ring;
    segmentsRef.current = ring.segments;
    ringStartedAtRef.current = performance.now();
    ringTimeLeftRef.current = ring.durationMs;
    setRingTimeLeftMs(ring.durationMs);
    setRingIndex(index);
    setPhase('ring');
  }, []);

  const finishRun = useCallback((end: FortuneRunEnd, endedRingIndex: number) => {
    const route = routeRef.current ?? FORTUNE_ROUTES.treasure;
    const totals = runTotalsRef.current;
    const outcome = resolveFortuneRunOutcome({
      rawPoints: totals.rawPoints,
      dice: totals.dice,
      essence: totals.essence,
      ringIndex: endedRingIndex,
      route,
      end,
      goldenLaunch: runGolden,
      bonusMultiplier: runBonusRef.current,
      previousBestScore: progress?.bestRunScore ?? 0,
    });
    const persisted = config.requestRunResult?.({
      runScore: outcome.runScore,
      eventPoints: outcome.eventPoints,
      fragmentAwarded: outcome.fragmentAwarded,
      essence: outcome.essence,
    });
    if (persisted?.progress) setProgress(persisted.progress);
    setLastFragmentId(persisted?.awardedFragmentId ?? null);
    setLastOutcome(outcome);
    setSessionDiceTotal((total) => total + outcome.dice);
    setRunsFinished((count) => count + 1);
    refreshTickets();
    setPhase('results');
    playIslandRunSound(end === 'crushed' ? 'token_move' : 'minigame_complete');
    triggerIslandRunHaptic(end === 'crushed' ? 'roll' : 'reward_claim');
  }, [config, progress, refreshTickets, runGolden]);

  const handleBank = useCallback(() => {
    finishRun('banked', ringIndex);
  }, [finishRun, ringIndex]);

  const handleGoDeeper = useCallback(() => {
    const route = routeRef.current;
    if (!route) return;
    startRing(Math.min(FORTUNE_RING_COUNT - 1, ringIndex + 1), route);
    playIslandRunSound('minigame_open');
  }, [ringIndex, startRing]);

  const handleStartFinale = useCallback(() => {
    const [targets, nextState] = rollFortuneFinaleTargets(rngRef.current);
    rngRef.current = nextState;
    finaleTargetsRef.current = targets;
    finaleHitsRef.current = new Set();
    setFinaleHitCount(0);
    setFinaleFailed(false);
    ringStartedAtRef.current = performance.now();
    ringTimeLeftRef.current = FORTUNE_FINALE_DURATION_MS;
    setRingTimeLeftMs(FORTUNE_FINALE_DURATION_MS);
    setPhase('finale');
    playIslandRunSound('minigame_open');
    triggerIslandRunHaptic('roll');
  }, []);

  const handleReturnToIsland = useCallback(() => {
    if (runsFinished > 0 || finaleRewardLabel) {
      onComplete({
        completed: true,
        reward: sessionDiceTotal > 0 ? { dice: sessionDiceTotal } : undefined,
      });
    } else {
      onComplete({ completed: false });
    }
  }, [finaleRewardLabel, onComplete, runsFinished, sessionDiceTotal]);

  const handleClaimMilestone = useCallback((milestoneId: string) => {
    const claim = config.requestClaimMilestoneReward?.(milestoneId);
    if (!claim) return;
    if (claim.progress) setProgress(claim.progress);
    if (claim.ok) {
      setLastClaimLabel(claim.rewardLabel);
      setTicketsRemaining(claim.ticketsRemaining);
      playIslandRunSound('reward_bar_fill');
      triggerIslandRunHaptic('reward_claim');
    }
  }, [config]);

  // ── Tap input (ring + finale) ──────────────────────────────────────────────

  const handleRingTap = useCallback(() => {
    if (phaseRef.current === 'ring') {
      const segmentIndex = resolveFortuneSegmentIndexForAngle(pointerAngleRef.current);
      const perfect = isFortunePerfectTapAngle(pointerAngleRef.current);
      const outcome = resolveFortuneTap(segmentsRef.current, segmentIndex, {
        perfect,
        comboBefore: comboRef.current,
      });
      segmentsRef.current = outcome.segments;
      comboRef.current = outcome.comboAfter;
      setComboCount(outcome.comboAfter);
      if (!outcome.collectedSomething) return;
      if (outcome.hazardHit && shieldsRef.current > 0) {
        // Golden-streak shield absorbs one corrupted hit for free.
        shieldsRef.current -= 1;
        setShieldsLeft(shieldsRef.current);
        playIslandRunSound('coin_flip');
        triggerIslandRunHaptic('reward_claim');
        return;
      }
      const totals = runTotalsRef.current;
      totals.rawPoints += outcome.points;
      totals.dice += outcome.dice;
      totals.essence += outcome.essence;
      if (outcome.timeBonusMs > 0) {
        ringTimeLeftRef.current += outcome.timeBonusMs;
      }
      if (outcome.hazardHit) {
        totals.hazards += 1;
        setHazardsHit(totals.hazards);
        triggerIslandRunHaptic('roll');
        playIslandRunSound('token_move');
        if (totals.hazards >= FORTUNE_RUN_HAZARD_LIMIT) {
          finishRun('crushed', ringRef.current?.ringIndex ?? 0);
        }
        return;
      }
      setRawPoints(totals.rawPoints);
      setRunDice(totals.dice);
      setRunEssence(totals.essence);
      playIslandRunSound(outcome.perfect ? 'coin_flip' : 'reward_bar_fill');
      triggerIslandRunHaptic('reward_claim');
      return;
    }

    if (phaseRef.current === 'finale') {
      const segmentIndex = resolveFortuneSegmentIndexForAngle(pointerAngleRef.current);
      if (!finaleTargetsRef.current.includes(segmentIndex) || finaleHitsRef.current.has(segmentIndex)) {
        triggerIslandRunHaptic('roll');
        return;
      }
      finaleHitsRef.current.add(segmentIndex);
      setFinaleHitCount(finaleHitsRef.current.size);
      playIslandRunSound('reward_bar_fill');
      triggerIslandRunHaptic('reward_claim');
      if (finaleHitsRef.current.size >= FORTUNE_FINALE_TARGET_COUNT) {
        const result = config.requestFinaleResult?.(true);
        if (result?.progress) setProgress(result.progress);
        setFinaleRewardLabel(result?.rewardLabel ?? FORTUNE_ENGINE_FINALE_REWARD_LABEL);
        setPhase('finale_results');
        playIslandRunSound('minigame_complete');
        triggerIslandRunHaptic('reward_claim');
      }
    }
  }, [config, finishRun]);

  // ── Animation loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'spin' && phase !== 'ring' && phase !== 'finale') return undefined;
    lastFrameAtRef.current = performance.now();

    const frame = (frameNowMs: number) => {
      const dtMs = Math.min(64, frameNowMs - lastFrameAtRef.current);
      lastFrameAtRef.current = frameNowMs;
      const canvas = canvasRef.current;

      if (phaseRef.current === 'spin') {
        const spin = wheelSpinRef.current;
        if (spin) {
          const t = Math.min(1, (frameNowMs - spin.startAtMs) / WHEEL_SPIN_DURATION_MS);
          const eased = 1 - Math.pow(1 - t, 3);
          const rotationDeg = spin.fromDeg + (spin.toDeg - spin.fromDeg) * eased;
          drawRouteWheel(canvas, rotationDeg);
          if (t >= 1) {
            const route = getFortuneRouteForSlot(spin.slotIndex);
            setActiveRoute(route);
            routeRef.current = route;
            setShowRouteBanner(true);
            playIslandRunSound('coin_flip');
            triggerIslandRunHaptic('reward_claim');
            if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = window.setTimeout(() => {
              setShowRouteBanner(false);
              bannerTimerRef.current = null;
              startRing(0, route);
            }, ROUTE_BANNER_MS);
            wheelSpinRef.current = null;
            return;
          }
        }
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      if (phaseRef.current === 'ring') {
        const ring = ringRef.current;
        if (!ring) return;
        pointerAngleRef.current = (((frameNowMs - ringStartedAtRef.current) / ring.revolutionMs) * 360) % 360;
        ringTimeLeftRef.current -= dtMs;
        setRingTimeLeftMs(Math.max(0, ringTimeLeftRef.current));
        drawTimingRing(canvas, {
          segments: segmentsRef.current,
          pointerAngleDeg: pointerAngleRef.current,
          centerTop: `Ring ${ring.ringIndex + 1}/${FORTUNE_RING_COUNT}`,
          centerBottom: `${Math.ceil(Math.max(0, ringTimeLeftRef.current) / 1000)}s`,
          highlightIndices: null,
          hitIndices: null,
        });
        if (ringTimeLeftRef.current <= 0) {
          if (ring.ringIndex >= FORTUNE_RING_COUNT - 1) {
            finishRun('completed', ring.ringIndex);
          } else {
            setPhase('decision');
            playIslandRunSound('coin_flip');
          }
          return;
        }
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      if (phaseRef.current === 'finale') {
        pointerAngleRef.current = (((frameNowMs - ringStartedAtRef.current) / FORTUNE_FINALE_REVOLUTION_MS) * 360) % 360;
        ringTimeLeftRef.current -= dtMs;
        setRingTimeLeftMs(Math.max(0, ringTimeLeftRef.current));
        drawTimingRing(canvas, {
          segments: null,
          pointerAngleDeg: pointerAngleRef.current,
          centerTop: 'Stabilise',
          centerBottom: `${Math.ceil(Math.max(0, ringTimeLeftRef.current) / 1000)}s`,
          highlightIndices: finaleTargetsRef.current,
          hitIndices: finaleHitsRef.current,
        });
        if (ringTimeLeftRef.current <= 0) {
          const result = config.requestFinaleResult?.(false);
          if (result?.progress) setProgress(result.progress);
          setFinaleFailed(true);
          setPhase('entry');
          playIslandRunSound('token_move');
          return;
        }
        rafRef.current = requestAnimationFrame(frame);
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [phase, config, finishRun, startRing]);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const multiplier = activeRoute
    ? resolveFortuneRunMultiplier({ ringIndex, route: activeRoute, bonusMultiplier: runMultiplierBonus })
    : 1;
  const bestRunScore = progress?.bestRunScore ?? 0;
  const goldenStreak = progress?.goldenStreakCount ?? 0;
  const bankedPoints = activeRoute
    ? Math.floor(
      rawPoints * resolveFortuneRunMultiplier({ ringIndex, route: activeRoute, bonusMultiplier: runMultiplierBonus }),
    )
    : 0;
  const nextRingMultiplier = activeRoute
    ? resolveFortuneRunMultiplier({ ringIndex: ringIndex + 1, route: activeRoute, bonusMultiplier: runMultiplierBonus })
    : 1;

  return (
    <section className={`fortune-engine${eventUnstable ? ' fortune-engine--unstable' : ''}`} aria-label="The Fortune Engine mini-game">
      {phase === 'entry' && (
        <div className="fortune-engine__panel fortune-engine__panel--entry" role="dialog" aria-label="Fortune Engine entry">
          <header className="fortune-engine__entry-header">
            <div>
              <p className="fortune-engine__eyebrow">Island event</p>
              <h2 className="fortune-engine__title">Fortune Engine</h2>
            </div>
            <button
              type="button"
              className="fortune-engine__close"
              onClick={handleReturnToIsland}
              aria-label="Return to Island"
            >
              ×
            </button>
          </header>
          {config.eventExpiresAtMs !== undefined && (
            <p className={`fortune-engine__countdown${eventUnstable ? ' fortune-engine__countdown--unstable' : ''}`}>
              {eventUnstable ? '⚠️ Leaving soon · ' : 'Ends in '}
              <strong>{formatEventCountdown(eventRemainingMs)}</strong>
            </p>
          )}

          <div className="fortune-engine__hero" aria-label="How to play: tap the light and avoid the red slice">
            <div className="fortune-engine__engine-stage" aria-hidden="true">
              <img
                className="fortune-engine__engine-art"
                src="/assets/fortune-engine/fortune-engine-wheel.webp"
                alt=""
                decoding="async"
                draggable={false}
              />
            </div>
            <div className="fortune-engine__instruction-strip">
              <span>
                <FortuneInstructionIcon kind="target" />
                Tap the light.
              </span>
              <span>
                <FortuneInstructionIcon kind="hazard" />
                Avoid the red.
              </span>
            </div>
          </div>

          {finaleDone ? (
            <p className="fortune-engine__trophy" role="status">
              🏆 Fortune Core complete
            </p>
          ) : finaleUnlocked ? (
            <div className="fortune-engine__finale-callout" role="status">
              <strong>💠 Finale unlocked</strong>
              <p>{finaleFailed ? 'Try again — nothing was lost.' : 'Your Fortune Core is ready.'}</p>
              <button
                type="button"
                className="fortune-engine__btn fortune-engine__btn--finale"
                onClick={handleStartFinale}
              >
                Play the free finale
              </button>
            </div>
          ) : (
            <div className="fortune-engine__launch-card">
              <div className="fortune-engine__launch-meta">
                <span>{goldenAvailable ? 'Golden play ready' : `${ticketsRemaining} ticket${ticketsRemaining === 1 ? '' : 's'} available`}</span>
                {goldenAvailable && <span>Core piece guaranteed</span>}
              </div>
              <button
                type="button"
                className={`fortune-engine__btn fortune-engine__btn--primary fortune-engine__btn--launch fortune-engine__btn--hero${goldenAvailable ? ' fortune-engine__btn--golden' : ''}`}
                onClick={handleLaunch}
                disabled={!canLaunch}
              >
                <strong>
                  {goldenAvailable
                    ? 'Play free'
                    : canLaunch
                      ? 'Play now'
                      : 'Earn a ticket on the island'}
                </strong>
                <small>
                  {goldenAvailable
                    ? 'Golden play • Core piece guaranteed'
                    : canLaunch
                      ? `${FORTUNE_ENGINE_LAUNCH_TICKET_COST} ticket`
                      : 'Return to the island to continue'}
                </small>
              </button>
            </div>
          )}

          <div className="fortune-engine__progress-grid">
            <EntryCoreProgress fragmentIds={fragmentIds} />
            <RewardTrack track={trackViewModel} onClaim={handleClaimMilestone} />
          </div>

          {lastClaimLabel && <p className="fortune-engine__claim-note">🎁 {lastClaimLabel} claimed</p>}

          <details className="fortune-engine__rules-details">
            <summary>View rewards and run details</summary>
            <RewardTrackDetails track={trackViewModel} />
            {(bestRunScore > 0 || goldenStreak > 1) && (
              <div className="fortune-engine__records" aria-label="Your Fortune Engine records">
                {bestRunScore > 0 && <span>Best run {bestRunScore}</span>}
                {goldenStreak > 1 && <span>{goldenStreak}-day streak</span>}
              </div>
            )}
            <ul className="fortune-engine__rules">
              <li>Hit the middle of a bright slice for a Perfect and a bigger combo.</li>
              <li>{FORTUNE_RUN_HAZARD_LIMIT} red hits end the run, but you still keep some points.</li>
              <li>After each ring, take the safe reward or risk a faster ring for more.</li>
            </ul>
          </details>

          {finaleUnlocked && (
            <button
              type="button"
              className="fortune-engine__btn fortune-engine__btn--text"
              onClick={handleReturnToIsland}
            >
              Return to Island
            </button>
          )}
        </div>
      )}

      {(phase === 'spin' || phase === 'ring' || phase === 'finale') && (
        <div className="fortune-engine__play-area">
          <header className="fortune-engine__hud">
            {phase === 'finale' ? (
              <>
                <div className="fortune-engine__hud-stat">
                  <span className="fortune-engine__hud-label">Stabilisers</span>
                  <span className="fortune-engine__hud-value">{finaleHitCount}/{FORTUNE_FINALE_TARGET_COUNT}</span>
                </div>
                <div className="fortune-engine__hud-stat">
                  <span className="fortune-engine__hud-label">Time</span>
                  <span className="fortune-engine__hud-value">{Math.ceil(ringTimeLeftMs / 1000)}s</span>
                </div>
              </>
            ) : (
              <>
                <div className="fortune-engine__hud-stat">
                  <span className="fortune-engine__hud-label">Score</span>
                  <span className="fortune-engine__hud-value">{rawPoints}</span>
                </div>
                <div className="fortune-engine__hud-stat">
                  <span className="fortune-engine__hud-label">Boost</span>
                  <span className="fortune-engine__hud-value">×{multiplier}</span>
                </div>
                <div className="fortune-engine__hud-stat" aria-label={`Corruption: ${hazardsHit} of ${FORTUNE_RUN_HAZARD_LIMIT}${shieldsLeft > 0 ? `, ${shieldsLeft} shield` : ''}`}>
                  <span className="fortune-engine__hud-label">Danger</span>
                  <span className="fortune-engine__hud-value fortune-engine__hud-value--hazard">
                    {`${'🛡'.repeat(shieldsLeft)}${'●'.repeat(hazardsHit)}${'○'.repeat(Math.max(0, FORTUNE_RUN_HAZARD_LIMIT - hazardsHit))}`}
                  </span>
                </div>
              </>
            )}
          </header>

          {runGolden && phase !== 'finale' && (
            <p className="fortune-engine__golden-banner" role="status">
              Golden play · core piece guaranteed{runMultiplierBonus > 0 ? ` · +${runMultiplierBonus}×` : ''}
            </p>
          )}
          {phase === 'ring' && comboCount >= 2 && (
            <p className="fortune-engine__combo" role="status" key={comboCount}>
              Perfect ×{comboCount} — next pays ×{resolveFortunePerfectPointsMultiplier(comboCount)}
            </p>
          )}
          {phase === 'ring' && hazardsHit === FORTUNE_RUN_HAZARD_LIMIT - 1 && (
            <p className="fortune-engine__danger-warning" role="alert">Danger · one more corrupted hit crushes the run!</p>
          )}
          {showRouteBanner && activeRoute && (
            <div className="fortune-engine__route-banner" role="status" style={{ borderColor: ROUTE_COLORS[activeRoute.id] }}>
              <span className="fortune-engine__route-icon" aria-hidden="true">{ROUTE_GLYPHS[activeRoute.id]}</span>
              <div>
                <p className="fortune-engine__route-name">{activeRoute.name}</p>
                <p className="fortune-engine__route-flavor">{activeRoute.flavor}</p>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`fortune-engine__canvas${phase === 'ring' && hazardsHit >= FORTUNE_RUN_HAZARD_LIMIT - 1 ? ' fortune-engine__canvas--danger' : ''}`}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            role="img"
            aria-label={phase === 'spin'
              ? 'Route wheel spinning'
              : phase === 'finale'
                ? `Finale ring. ${finaleHitCount} of ${FORTUNE_FINALE_TARGET_COUNT} stabilisers active.`
                : `Timing ring ${ringIndex + 1}. ${rawPoints} points collected.`}
            onPointerDown={handleRingTap}
          />

          <footer className="fortune-engine__controls">
            {phase === 'ring' ? (
              <>
                <div className="fortune-engine__loot-pill" aria-label={`${runDice} dice and ${runEssence} essence collected`}>
                  <span>Dice {runDice}</span><span>Essence {runEssence}</span>
                </div>
                <p className="fortune-engine__hint"><strong>Tap the lit slices</strong><span>Gold · Dice · Essence · Time &nbsp; / &nbsp; avoid red</span></p>
                <button type="button" className="fortune-engine__btn fortune-engine__btn--quiet" onClick={handleBank}>
                  Finish and keep rewards
                </button>
              </>
            ) : phase === 'finale' ? (
              <p className="fortune-engine__hint"><strong>Tap the glowing diamonds</strong></p>
            ) : (
              <p className="fortune-engine__hint"><strong>Choosing your bonus…</strong></p>
            )}
          </footer>
        </div>
      )}

      {phase === 'decision' && activeRoute && (
        <div className="fortune-engine__panel fortune-engine__decision" role="dialog" aria-label="Bank or go deeper">
          <p className="fortune-engine__eyebrow">Ring {ringIndex + 1} complete</p>
          <h2 className="fortune-engine__title">Choose your reward</h2>
          <p className="fortune-engine__decision-status">Danger: <strong>{hazardsHit}/{FORTUNE_RUN_HAZARD_LIMIT}</strong></p>
          <div className="fortune-engine__choice-grid">
            <button type="button" className="fortune-engine__choice fortune-engine__choice--safe" onClick={handleBank}>
              <span className="fortune-engine__choice-kicker">Safe</span>
              <strong>💰 Keep {bankedPoints}</strong>
              <small>Finish this run</small>
            </button>
            <button type="button" className="fortune-engine__choice fortune-engine__choice--risk" onClick={handleGoDeeper}>
              <span className="fortune-engine__choice-kicker">Risk</span>
              <strong>🌀 Play for ×{nextRingMultiplier}</strong>
              <small>Faster ring · keep 1/{resolveFortuneCrushKeepDivisor(ringIndex + 1)} if crushed</small>
            </button>
          </div>
        </div>
      )}

      {phase === 'results' && lastOutcome && (
        <div
          className={`fortune-engine__panel fortune-engine__results${lastOutcome.end === 'crushed' ? ' fortune-engine__panel--crushed' : ''}`}
          role="dialog"
          aria-label="Fortune Engine results"
        >
          <p className="fortune-engine__eyebrow">
            {lastOutcome.end === 'crushed' ? 'Run ended' : lastOutcome.end === 'banked' ? 'Safe reward' : 'All rings complete'}
          </p>
          <h2 className="fortune-engine__title">
            {lastOutcome.end === 'crushed' ? 'Some rewards saved' : 'Rewards collected!'}
          </h2>
          <dl className="fortune-engine__result-stats">
            <div>
              <dt>Run score</dt>
              <dd>{lastOutcome.runScore}</dd>
            </div>
            <div>
              <dt>Event points</dt>
              <dd>+{lastOutcome.eventPoints}</dd>
            </div>
            <div>
              <dt>Loot</dt>
              <dd>🎲 +{lastOutcome.dice} · 🟣 +{lastOutcome.essence}</dd>
            </div>
          </dl>
          {lastOutcome.newBest && (
            <p className="fortune-engine__best-note" role="status">
              🏆 New best score!
            </p>
          )}
          {lastFragmentId !== null && (
            <p className="fortune-engine__fragment-note" role="status">
              🧩 Fragment recovered: {FORTUNE_CORE_FRAGMENTS[lastFragmentId]?.icon} {FORTUNE_CORE_FRAGMENTS[lastFragmentId]?.name}!
            </p>
          )}
          <FragmentGrid fragmentIds={fragmentIds} lastFragmentId={lastFragmentId} />
          {coreComplete && !finaleDone && (
            <p className="fortune-engine__finale-callout" role="status">💠 The core is complete — the finale awaits on the launch deck!</p>
          )}
          <RewardTrack track={trackViewModel} onClaim={handleClaimMilestone} />
          {lastClaimLabel && <p className="fortune-engine__claim-note">Claimed: {lastClaimLabel} 🎉</p>}
          <div className="fortune-engine__actions">
            <button
              type="button"
              className="fortune-engine__btn fortune-engine__btn--primary fortune-engine__btn--launch"
              onClick={handleLaunch}
              disabled={!canLaunchFortuneEngine({ ticketsRemaining, goldenLaunchAvailable: isFortuneGoldenLaunchAvailable(progress, Date.now()) })}
            >
              {isFortuneGoldenLaunchAvailable(progress, Date.now())
                ? 'Play again free'
                : `Play again · ${FORTUNE_ENGINE_LAUNCH_TICKET_COST} ticket`}
            </button>
            <button type="button" className="fortune-engine__btn" onClick={handleReturnToIsland}>
              Done
            </button>
            <button type="button" className="fortune-engine__btn fortune-engine__btn--text" onClick={() => setPhase('entry')}>
              View event progress
            </button>
          </div>
        </div>
      )}

      {phase === 'finale_results' && (
        <div className="fortune-engine__panel fortune-engine__results fortune-engine__results--finale" role="dialog" aria-label="Fortune Core stabilised">
          <p className="fortune-engine__eyebrow">Finale complete</p>
          <h2 className="fortune-engine__title">💠 Core stabilised!</h2>
          <p className="fortune-engine__copy">All nine pieces now shine as one.</p>
          <p className="fortune-engine__fragment-note" role="status">
            🏆 {finaleRewardLabel ?? FORTUNE_ENGINE_FINALE_REWARD_LABEL}
          </p>
          <FragmentGrid fragmentIds={fragmentIds} lastFragmentId={null} />
          <div className="fortune-engine__actions">
            <button type="button" className="fortune-engine__btn fortune-engine__btn--primary" onClick={handleReturnToIsland}>
              Collect and return
            </button>
            <button type="button" className="fortune-engine__btn fortune-engine__btn--text" onClick={() => setPhase('entry')}>
              View event progress
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Fragment grid + reward track (presentation only)
// ---------------------------------------------------------------------------

function FortuneInstructionIcon({ kind }: { kind: 'target' | 'hazard' }) {
  if (kind === 'target') {
    return (
      <svg className="fortune-engine__instruction-icon fortune-engine__instruction-icon--target" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5c.6 4.4 3.1 7 7.5 7.5-4.4.5-6.9 3.1-7.5 7.5-.6-4.4-3.1-7-7.5-7.5 4.4-.5 6.9-3.1 7.5-7.5Z" />
      </svg>
    );
  }

  return (
    <svg className="fortune-engine__instruction-icon fortune-engine__instruction-icon--hazard" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 16.8c-1.9-1.5-3-3.7-3-6.1A7.8 7.8 0 0 1 12 3a7.8 7.8 0 0 1 7.8 7.7c0 2.4-1.1 4.6-3 6.1v3.1h-2.7v-2h-1.2v2h-1.8v-2H9.9v2H7.2v-3.1Zm2.1-5.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Zm5.4 0a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z" />
    </svg>
  );
}

function EntryCoreProgress({ fragmentIds }: { fragmentIds: Set<number> }) {
  return (
    <section
      className="fortune-engine__core-summary"
      aria-label={`Fortune Core: ${fragmentIds.size} of ${FORTUNE_CORE_FRAGMENTS.length} pieces`}
    >
      <div className="fortune-engine__summary-label">
        <span>Core</span>
        <strong>{fragmentIds.size}/{FORTUNE_CORE_FRAGMENTS.length}</strong>
      </div>
      <div className="fortune-engine__core-dots" aria-hidden="true">
        {FORTUNE_CORE_FRAGMENTS.map((fragment) => (
          <span
            key={fragment.fragmentId}
            className={fragmentIds.has(fragment.fragmentId) ? 'fortune-engine__core-dot fortune-engine__core-dot--lit' : 'fortune-engine__core-dot'}
          />
        ))}
      </div>
    </section>
  );
}

function formatEntryRewardLabel(label: string): string {
  return label.replace(/\s*\+🧩 Fragment/g, ' + Core piece');
}

function FortuneRewardIcon({ label }: { label: string }) {
  if (label.includes('Essence')) {
    return (
      <img
        className="fortune-engine__reward-art"
        src="/assets/fortune-engine/fortune-essence-vial.webp"
        alt=""
        decoding="async"
        draggable={false}
      />
    );
  }

  if (label.includes('Dice')) {
    return (
      <svg className="fortune-engine__reward-glyph" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="7" y="7" width="34" height="34" rx="9" />
        <circle cx="17" cy="17" r="2.5" />
        <circle cx="31" cy="17" r="2.5" />
        <circle cx="24" cy="24" r="2.5" />
        <circle cx="17" cy="31" r="2.5" />
        <circle cx="31" cy="31" r="2.5" />
      </svg>
    );
  }

  return (
    <svg className="fortune-engine__reward-glyph" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 14h32l-4 20H12L8 14Zm4-6h24v6H12V8Zm8 10 4 4 4-4-4 12-4-12Z" />
    </svg>
  );
}

function FragmentGrid({
  fragmentIds,
  lastFragmentId,
}: {
  fragmentIds: Set<number>;
  lastFragmentId: number | null;
}) {
  return (
    <div
      className="fortune-engine__core"
      aria-label={`Fortune Core: ${fragmentIds.size} of ${FORTUNE_CORE_FRAGMENTS.length} fragments collected`}
    >
      {FORTUNE_CORE_FRAGMENTS.map((fragment) => {
        const lit = fragmentIds.has(fragment.fragmentId);
        const justLit = lastFragmentId === fragment.fragmentId;
        return (
          <div
            key={fragment.fragmentId}
            className={`fortune-engine__core-cell${lit ? ' fortune-engine__core-cell--lit' : ''}${justLit ? ' fortune-engine__core-cell--new' : ''}`}
            title={fragment.name}
          >
            <span aria-hidden="true">{lit ? fragment.icon : '▫️'}</span>
          </div>
        );
      })}
    </div>
  );
}

function RewardTrack({
  track,
  onClaim,
}: {
  track: FortuneEngineTrackViewModel;
  onClaim: (milestoneId: string) => void;
}) {
  const claimableNodes = track.nodes.filter((node) => node.state === 'claimable');
  const nextNode = track.nodes.find((node) => node.state === 'upcoming') ?? null;
  const featuredNode = claimableNodes[0] ?? nextNode;
  const featuredLabel = featuredNode ? formatEntryRewardLabel(featuredNode.milestone.rewardLabel) : 'Reward path complete';

  return (
    <section
      className="fortune-engine__track"
      aria-label={`Reward path: ${track.eventPoints} of ${track.totalPoints} event points`}
    >
      <FortuneRewardIcon label={featuredLabel} />
      <div className="fortune-engine__reward-copy">
        <span>{claimableNodes.length > 0 ? 'Ready reward' : 'Next reward'}</span>
        <strong>{featuredLabel}</strong>
        {nextNode && claimableNodes.length === 0 && <small>{nextNode.milestone.pointsRequired - track.eventPoints} points to go</small>}
      </div>
      {claimableNodes.length > 0 && (
        <button
          type="button"
          className="fortune-engine__btn fortune-engine__btn--claim"
          onClick={() => onClaim(claimableNodes[0].milestone.id)}
        >
          Claim
        </button>
      )}
      <div className="fortune-engine__track-bar" role="presentation">
        <div className="fortune-engine__track-fill" style={{ width: `${Math.round(track.fillRatio * 100)}%` }} />
      </div>
    </section>
  );
}

function RewardTrackDetails({ track }: { track: FortuneEngineTrackViewModel }) {
  return (
    <ol className="fortune-engine__track-nodes">
      {track.nodes.map((node) => (
        <li key={node.milestone.id} className={`fortune-engine__track-node fortune-engine__track-node--${node.state}`}>
          <span className="fortune-engine__track-node-state" aria-label={node.state}>
            {node.state === 'claimed' ? '✓' : node.state === 'claimable' ? '!' : '·'}
          </span>
          <span className="fortune-engine__track-node-label">{formatEntryRewardLabel(node.milestone.rewardLabel)}</span>
          <span className="fortune-engine__track-node-points">{node.milestone.pointsRequired}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Canvas renderers (no gameplay logic)
// ---------------------------------------------------------------------------

function degToRad(deg: number): number {
  return ((deg - 90) * Math.PI) / 180;
}

function drawRouteWheel(canvas: HTMLCanvasElement | null, rotationDeg: number): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = CANVAS_LOGICAL_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 7;
  const segmentOuter = outer - 17;
  const inner = 61;
  const arc = 360 / FORTUNE_WHEEL_SLOTS.length;

  prepareFortuneCanvas(canvas, ctx);
  drawSpaceBackdrop(ctx, size);
  drawEngineFrameBase(ctx, cx, cy, outer);

  FORTUNE_WHEEL_SLOTS.forEach((routeId, index) => {
    const startDeg = index * arc + rotationDeg;
    const [innerColor, outerColor] = ROUTE_SURFACES[routeId];
    const surface = ctx.createRadialGradient(cx, cy, inner, cx, cy, segmentOuter);
    surface.addColorStop(0, innerColor);
    surface.addColorStop(1, outerColor);

    traceRingSegment(ctx, cx, cy, inner, segmentOuter, startDeg + 0.8, startDeg + arc - 0.8);
    ctx.fillStyle = surface;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(241, 199, 94, 0.58)';
    ctx.stroke();

    const midRad = degToRad(startDeg + arc / 2);
    const labelRadius = (inner + segmentOuter) / 2 + 2;
    const glyph = ROUTE_GLYPHS[routeId];
    ctx.save();
    ctx.fillStyle = routeId === 'risk' ? '#ffb4a6' : '#ffe9a8';
    ctx.shadowColor = ROUTE_COLORS[routeId];
    ctx.shadowBlur = 9;
    ctx.font = `800 ${glyph.length > 1 ? 13 : 20}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, cx + Math.cos(midRad) * labelRadius, cy + Math.sin(midRad) * labelRadius + 1);
    ctx.restore();
  });

  drawEngineFrameDetails(ctx, cx, cy, outer, inner, segmentOuter);
  drawEngineHub(ctx, cx, cy, 54, null, null);
  drawFixedPointer(ctx, cx);
  ctx.restore();
}

function drawTimingRing(
  canvas: HTMLCanvasElement | null,
  scene: {
    segments: readonly FortuneRingSegment[] | null;
    pointerAngleDeg: number;
    centerTop: string;
    centerBottom: string;
    /** Finale: indices of stabiliser targets. */
    highlightIndices: readonly number[] | null;
    /** Finale: already-activated targets. */
    hitIndices: ReadonlySet<number> | null;
  },
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = CANVAS_LOGICAL_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 7;
  const segmentOuter = outer - 17;
  const inner = segmentOuter - 57;
  const arc = 360 / FORTUNE_RING_SEGMENT_COUNT;

  prepareFortuneCanvas(canvas, ctx);
  drawSpaceBackdrop(ctx, size);
  drawEngineFrameBase(ctx, cx, cy, outer);

  for (let index = 0; index < FORTUNE_RING_SEGMENT_COUNT; index += 1) {
    const startDeg = index * arc;
    const segment = scene.segments?.[index] ?? null;
    let surfaceColors = SEGMENT_SURFACES.empty;
    let alpha = 1;
    let glyph = '';

    if (segment) {
      surfaceColors = SEGMENT_SURFACES[segment.kind];
      glyph = SEGMENT_GLYPHS[segment.kind];
      if (segment.collected || segment.kind === 'empty') {
        alpha = 0.28;
      }
    } else if (scene.highlightIndices) {
      const isTarget = scene.highlightIndices.includes(index);
      const isHit = scene.hitIndices?.has(index) ?? false;
      surfaceColors = isHit
        ? ['#124438', '#2aaa78']
        : isTarget
          ? SEGMENT_SURFACES.points
          : SEGMENT_SURFACES.empty;
      glyph = isHit ? '✓' : isTarget ? '◆' : '';
      alpha = isTarget || isHit ? 1 : 0.6;
    }

    const fill = ctx.createRadialGradient(cx, cy, inner, cx, cy, segmentOuter);
    fill.addColorStop(0, surfaceColors[0]);
    fill.addColorStop(1, surfaceColors[1]);
    traceRingSegment(ctx, cx, cy, inner, segmentOuter, startDeg + 0.9, startDeg + arc - 0.9);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = 'rgba(230, 193, 108, 0.48)';
    ctx.stroke();

    if (glyph) {
      const midRad = degToRad(startDeg + arc / 2);
      const iconRadius = (segmentOuter + inner) / 2 + 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = glyph === '!' ? '#ffd0c7' : '#fff0b6';
      ctx.shadowColor = glyph === '!' ? '#ff5266' : '#ffd76a';
      ctx.shadowBlur = 8;
      ctx.font = `800 ${glyph.length > 1 ? 12 : 18}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, cx + Math.cos(midRad) * iconRadius, cy + Math.sin(midRad) * iconRadius + 1);
      ctx.restore();
    }
  }

  drawEngineFrameDetails(ctx, cx, cy, outer, inner, segmentOuter);

  // Pointer sweep.
  const pointerRad = degToRad(scene.pointerAngleDeg);
  const pointerInner = inner - 8;
  const pointerOuter = segmentOuter - 3;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(91, 226, 215, 0.48)';
  ctx.shadowColor = '#65e6ca';
  ctx.shadowBlur = 13;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(pointerRad) * pointerInner, cy + Math.sin(pointerRad) * pointerInner);
  ctx.lineTo(cx + Math.cos(pointerRad) * pointerOuter, cy + Math.sin(pointerRad) * pointerOuter);
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#fff3b3';
  ctx.shadowColor = '#ffd76a';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(pointerRad) * pointerInner, cy + Math.sin(pointerRad) * pointerInner);
  ctx.lineTo(cx + Math.cos(pointerRad) * pointerOuter, cy + Math.sin(pointerRad) * pointerOuter);
  ctx.stroke();
  drawFourPointStar(
    ctx,
    cx + Math.cos(pointerRad) * pointerOuter,
    cy + Math.sin(pointerRad) * pointerOuter,
    7,
    2.4,
    '#fff4b0',
  );
  ctx.restore();

  drawEngineHub(ctx, cx, cy, inner - 8, scene.centerTop, scene.centerBottom);
  ctx.restore();
}

function drawSpaceBackdrop(ctx: CanvasRenderingContext2D, size: number): void {
  const bg = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
  bg.addColorStop(0, '#17304e');
  bg.addColorStop(0.55, '#0a1a31');
  bg.addColorStop(1, '#030914');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const stars: readonly [number, number, number, number][] = [
    [45, 54, 1.1, 0.7], [282, 46, 0.8, 0.6], [302, 111, 1.2, 0.48], [35, 244, 0.8, 0.5],
    [287, 280, 1, 0.55], [61, 302, 1.1, 0.48], [236, 29, 0.7, 0.45], [20, 164, 0.8, 0.4],
  ];
  stars.forEach(([x, y, radius, alpha]) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 234, 173, ${alpha})`;
    ctx.fill();
  });
}

function prepareFortuneCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(canvas.width / CANVAS_LOGICAL_SIZE, canvas.height / CANVAS_LOGICAL_SIZE);
}

function traceRingSegment(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  startDeg: number,
  endDeg: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, outer, degToRad(startDeg), degToRad(endDeg));
  ctx.arc(cx, cy, inner, degToRad(endDeg), degToRad(startDeg), true);
  ctx.closePath();
}

function drawEngineFrameBase(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy + 4, outer + 1, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#02060c';
  ctx.fill();
  ctx.restore();

  const metal = ctx.createRadialGradient(cx - 32, cy - 38, 22, cx, cy, outer);
  metal.addColorStop(0, '#ffe58b');
  metal.addColorStop(0.28, '#c88d23');
  metal.addColorStop(0.62, '#6f4210');
  metal.addColorStop(0.84, '#d59d31');
  metal.addColorStop(1, '#42270b');
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fillStyle = metal;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, outer - 9, 0, Math.PI * 2);
  ctx.fillStyle = '#101b2b';
  ctx.fill();
}

function drawEngineFrameDetails(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  segmentOuter: number,
): void {
  [outer - 2, outer - 9, segmentOuter + 2, inner - 2].forEach((radius, index) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = index === 0 ? 2.2 : 1.2;
    ctx.strokeStyle = index % 2 === 0 ? 'rgba(255, 220, 126, 0.72)' : 'rgba(62, 34, 8, 0.92)';
    ctx.stroke();
  });

  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const radius = outer - 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.arc(x, y, index % 4 === 0 ? 4.2 : 2.2, 0, Math.PI * 2);
    if (index % 4 === 0) {
      const gem = ctx.createRadialGradient(x - 1, y - 1, 0.4, x, y, 4.2);
      gem.addColorStop(0, '#e6fffb');
      gem.addColorStop(0.3, '#65e6ca');
      gem.addColorStop(1, '#0c626a');
      ctx.fillStyle = gem;
      ctx.shadowColor = '#65e6ca';
      ctx.shadowBlur = 7;
    } else {
      ctx.fillStyle = '#d4a341';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawEngineHub(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  topLabel: string | null,
  bottomLabel: string | null,
): void {
  const metal = ctx.createRadialGradient(cx - 13, cy - 16, 7, cx, cy, radius);
  metal.addColorStop(0, '#ffe790');
  metal.addColorStop(0.35, '#bb7c1d');
  metal.addColorStop(0.72, '#4b2c0d');
  metal.addColorStop(1, '#d6a13a');
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = metal;
  ctx.fill();

  const enamel = ctx.createRadialGradient(cx - 9, cy - 10, 4, cx, cy, radius - 8);
  enamel.addColorStop(0, '#24436a');
  enamel.addColorStop(0.58, '#0b1e38');
  enamel.addColorStop(1, '#050d1a');
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
  ctx.fillStyle = enamel;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(101, 230, 202, 0.52)';
  ctx.stroke();

  if (topLabel && bottomLabel) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#dce8f5';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(topLabel, cx, cy - 11);
    ctx.fillStyle = '#ffe17b';
    ctx.shadowColor = 'rgba(255, 215, 106, 0.5)';
    ctx.shadowBlur = 7;
    ctx.font = '800 22px Georgia, serif';
    ctx.fillText(bottomLabel, cx, cy + 15);
    ctx.shadowBlur = 0;
    return;
  }

  ctx.save();
  ctx.shadowColor = '#ffd76a';
  ctx.shadowBlur = 15;
  drawFourPointStar(ctx, cx, cy, radius * 0.43, radius * 0.13, '#fff0a4');
  ctx.restore();
}

function drawFixedPointer(ctx: CanvasRenderingContext2D, cx: number): void {
  const pointer = ctx.createLinearGradient(cx, 3, cx, 42);
  pointer.addColorStop(0, '#fff0a2');
  pointer.addColorStop(0.48, '#d99e2e');
  pointer.addColorStop(1, '#70400e');
  ctx.beginPath();
  ctx.moveTo(cx, 4);
  ctx.lineTo(cx + 13, 24);
  ctx.lineTo(cx + 5, 23);
  ctx.lineTo(cx, 42);
  ctx.lineTo(cx - 5, 23);
  ctx.lineTo(cx - 13, 24);
  ctx.closePath();
  ctx.fillStyle = pointer;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#3b2208';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, 15, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#65e6ca';
  ctx.shadowColor = '#65e6ca';
  ctx.shadowBlur = 9;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  fill: string,
): void {
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / 4;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
