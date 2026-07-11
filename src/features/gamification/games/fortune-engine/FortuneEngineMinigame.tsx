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
  FORTUNE_FRAGMENT_PITY_RUNS,
  FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS,
  FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS,
  FORTUNE_GOLDEN_STREAK_SHIELD_MIN_DAYS,
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

const CANVAS_SIZE = 340;
const WHEEL_SPIN_DURATION_MS = 2600;
const ROUTE_BANNER_MS = 1600;
/** Segment colors by kind (collected segments render dimmed). */
const SEGMENT_COLORS: Record<FortuneRingSegment['kind'], string> = {
  points: '#f3d16b',
  dice: '#7cc4ff',
  essence: '#c39bff',
  time: '#5eead4',
  hazard: '#f87171',
  empty: '#1f2f4d',
};
const SEGMENT_ICONS: Record<FortuneRingSegment['kind'], string> = {
  points: '⭐',
  dice: '🎲',
  essence: '🟣',
  time: '⏳',
  hazard: '☠️',
  empty: '',
};
const ROUTE_COLORS: Record<FortuneRoute['id'], string> = {
  treasure: '#f3d16b',
  multiplier: '#c39bff',
  risk: '#f87171',
  chrono: '#5eead4',
  jackpot: '#7cc4ff',
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
  const isFirstEverLaunch = (progress?.totalLaunches ?? 0) === 0;

  return (
    <section className={`fortune-engine${eventUnstable ? ' fortune-engine--unstable' : ''}`} aria-label="The Fortune Engine mini-game">
      {phase === 'entry' && (
        <div className="fortune-engine__panel" role="dialog" aria-label="Fortune Engine entry">
          <p className="fortune-engine__eyebrow">Island Event</p>
          <h2 className="fortune-engine__title">🎡 The Fortune Engine</h2>
          {config.eventExpiresAtMs !== undefined && (
            <p className={`fortune-engine__countdown${eventUnstable ? ' fortune-engine__countdown--unstable' : ''}`}>
              {eventUnstable ? '⚠️ The engine grows unstable — departs in ' : 'Fortune Engine departs in '}
              <strong>{formatEventCountdown(eventRemainingMs)}</strong>
            </p>
          )}
          <p className="fortune-engine__copy">
            A celestial machine hangs above the island, its rings turning with trapped
            fortune. Spin the route wheel, then ride three accelerating rings — tap when
            the pointer sweeps a glowing node, and steer clear of corrupted sectors.
          </p>

          <FragmentGrid fragmentIds={fragmentIds} lastFragmentId={null} />

          {finaleDone ? (
            <p className="fortune-engine__trophy" role="status">
              🏆 Fortune Core stabilised — the engine hums in gratitude. Trophy earned!
            </p>
          ) : finaleUnlocked ? (
            <div className="fortune-engine__finale-callout" role="status">
              <p>💠 All nine fragments glow. The core is ready to be stabilised!</p>
              {finaleFailed && <p className="fortune-engine__finale-retry">The core resisted… but nothing was lost. Try again — it costs nothing.</p>}
              <button type="button" className="fortune-engine__btn fortune-engine__btn--finale" onClick={handleStartFinale}>
                💠 Stabilise the Fortune Core (free)
              </button>
            </div>
          ) : null}

          <RewardTrack track={trackViewModel} onClaim={handleClaimMilestone} />
          {lastClaimLabel && <p className="fortune-engine__claim-note">Claimed: {lastClaimLabel} 🎉</p>}

          {bestRunScore > 0 && (
            <p className="fortune-engine__best-note">
              🏆 Best run: <strong>{bestRunScore}</strong> — beat it for +20% event points!
            </p>
          )}
          {goldenStreak >= 2 && (
            <p className="fortune-engine__streak-note">
              🔥 {goldenStreak}-day Golden streak
              {goldenStreak >= FORTUNE_GOLDEN_STREAK_SHIELD_MIN_DAYS
                ? ` — golden runs start at +${FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS}× with a 🛡 hazard shield!`
                : goldenStreak >= FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS
                  ? ` — golden runs start at +${FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS}×! (🛡 shield at ${FORTUNE_GOLDEN_STREAK_SHIELD_MIN_DAYS} days)`
                  : ` — reach ${FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS} days for a +${FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS}× boost!`}
            </p>
          )}

          <details className="fortune-engine__rules-details" open={isFirstEverLaunch}>
            <summary>ℹ️ How it works</summary>
            <ul className="fortune-engine__rules">
              <li>🎟️ 1 ticket per launch — the first launch each day is a free <strong>Golden Launch</strong> with a guaranteed fragment.</li>
              <li>🎯 Tap while the pointer crosses ⭐ points, 🎲 dice, 🟣 essence and ⏳ bonus time. Hit a segment's <strong>center</strong> for a Perfect (×2 points, combos climb to ×3.5).</li>
              <li>☠️ {FORTUNE_RUN_HAZARD_LIMIT} corrupted hits crush the run. Deeper rings keep less of a crushed run (½ → ⅓ → ¼) — but never nothing.</li>
              <li>💰 After each ring: bank it all, or go deeper for a bigger multiplier.</li>
              <li>🧩 Fragments drop from the Jackpot route, Golden Launches, full three-ring descents, reward-track milestones — and every {FORTUNE_FRAGMENT_PITY_RUNS}th fragmentless run for free. Light all 9 to unlock the finale.</li>
              <li>🔥 Golden Launch streaks upgrade golden runs: +{FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS}× at {FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS} days, a 🛡 hazard shield at {FORTUNE_GOLDEN_STREAK_SHIELD_MIN_DAYS}.</li>
            </ul>
          </details>

          <p className="fortune-engine__ticket-note">
            Tickets left: {ticketsRemaining} 🎟️
            {goldenAvailable && <span className="fortune-engine__golden-chip"> · ✨ Golden Launch ready</span>}
          </p>

          <div className="fortune-engine__actions fortune-engine__actions--sticky">
            <button
              type="button"
              className={`fortune-engine__btn fortune-engine__btn--primary${goldenAvailable ? ' fortune-engine__btn--golden' : ''}`}
              onClick={handleLaunch}
              disabled={!canLaunch}
            >
              {goldenAvailable
                ? '✨ Golden Launch (free)'
                : canLaunch
                  ? `Launch (${FORTUNE_ENGINE_LAUNCH_TICKET_COST} 🎟️)`
                  : 'No tickets — play the island loop!'}
            </button>
            <button type="button" className="fortune-engine__btn" onClick={handleReturnToIsland}>
              Return to Island
            </button>
          </div>
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
                  <span className="fortune-engine__hud-label">Points</span>
                  <span className="fortune-engine__hud-value">{rawPoints}</span>
                </div>
                <div className="fortune-engine__hud-stat">
                  <span className="fortune-engine__hud-label">Multi</span>
                  <span className="fortune-engine__hud-value">×{multiplier}</span>
                </div>
                <div className="fortune-engine__hud-stat">
                  <span className="fortune-engine__hud-label">Loot</span>
                  <span className="fortune-engine__hud-value">🎲{runDice} 🟣{runEssence}</span>
                </div>
                <div className="fortune-engine__hud-stat" aria-label={`Corruption: ${hazardsHit} of ${FORTUNE_RUN_HAZARD_LIMIT}${shieldsLeft > 0 ? `, ${shieldsLeft} shield` : ''}`}>
                  <span className="fortune-engine__hud-label">Hazards</span>
                  <span className="fortune-engine__hud-value fortune-engine__hud-value--hazard">
                    {`${'🛡'.repeat(shieldsLeft)}${'☠️'.repeat(hazardsHit)}` || '—'}
                  </span>
                </div>
              </>
            )}
          </header>

          {runGolden && phase !== 'finale' && (
            <p className="fortune-engine__golden-banner" role="status">
              ✨ Golden Launch — fragment guaranteed on a finished run!
              {runMultiplierBonus > 0 && ` +${runMultiplierBonus}× streak boost.`}
            </p>
          )}
          {phase === 'ring' && comboCount >= 2 && (
            <p className="fortune-engine__combo" role="status" key={comboCount}>
              ⚡ Perfect ×{comboCount} — next pays ×{resolveFortunePerfectPointsMultiplier(comboCount)}
            </p>
          )}
          {phase === 'ring' && hazardsHit === FORTUNE_RUN_HAZARD_LIMIT - 1 && (
            <p className="fortune-engine__danger-warning" role="alert">☠️ One more corrupted hit crushes the run!</p>
          )}
          {showRouteBanner && activeRoute && (
            <div className="fortune-engine__route-banner" role="status" style={{ borderColor: ROUTE_COLORS[activeRoute.id] }}>
              <span className="fortune-engine__route-icon" aria-hidden="true">{activeRoute.icon}</span>
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
                <p className="fortune-engine__hint">Tap anywhere to collect the segment under the pointer — center hits are Perfect!</p>
                <button type="button" className="fortune-engine__btn fortune-engine__btn--quiet" onClick={handleBank}>
                  💰 Bank now
                </button>
              </>
            ) : phase === 'finale' ? (
              <p className="fortune-engine__hint">Tap when the pointer crosses a glowing stabiliser!</p>
            ) : (
              <p className="fortune-engine__hint">The engine chooses your route…</p>
            )}
          </footer>
        </div>
      )}

      {phase === 'decision' && activeRoute && (
        <div className="fortune-engine__panel fortune-engine__decision" role="dialog" aria-label="Bank or go deeper">
          <p className="fortune-engine__eyebrow">Checkpoint — Ring {ringIndex + 1} cleared</p>
          <h2 className="fortune-engine__title">Bank or go deeper?</h2>
          <dl className="fortune-engine__result-stats">
            <div>
              <dt>Unbanked points</dt>
              <dd>{rawPoints}</dd>
            </div>
            <div>
              <dt>Current multiplier</dt>
              <dd>×{resolveFortuneRunMultiplier({ ringIndex, route: activeRoute, bonusMultiplier: runMultiplierBonus })}</dd>
            </div>
            <div>
              <dt>Next ring multiplier</dt>
              <dd>×{resolveFortuneRunMultiplier({ ringIndex: ringIndex + 1, route: activeRoute, bonusMultiplier: runMultiplierBonus })}</dd>
            </div>
          </dl>
          <p className="fortune-engine__copy">
            The next ring spins faster and hides more corruption — and a crush there keeps
            only 1/{resolveFortuneCrushKeepDivisor(ringIndex + 1)} of your points.
            Corruption carries over: {'☠️'.repeat(hazardsHit) || 'none'} so far.
          </p>
          <div className="fortune-engine__actions">
            <button type="button" className="fortune-engine__btn fortune-engine__btn--primary" onClick={handleGoDeeper}>
              🌀 Go deeper (×{resolveFortuneRunMultiplier({ ringIndex: ringIndex + 1, route: activeRoute, bonusMultiplier: runMultiplierBonus })})
            </button>
            <button type="button" className="fortune-engine__btn" onClick={handleBank}>
              💰 Bank {Math.floor(rawPoints * resolveFortuneRunMultiplier({ ringIndex, route: activeRoute, bonusMultiplier: runMultiplierBonus }))} points
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
            {lastOutcome.end === 'crushed' ? 'Run crushed by corruption!' : lastOutcome.end === 'banked' ? 'Rewards banked' : 'Full descent complete'}
          </p>
          <h2 className="fortune-engine__title">
            {lastOutcome.end === 'crushed' ? '☠️ Half saved from the wreck' : '🎉 Run complete'}
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
              🏆 New personal best! +20% event points banked.
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
          <p className="fortune-engine__ticket-note">Tickets left: {ticketsRemaining} 🎟️</p>
          <div className="fortune-engine__actions fortune-engine__actions--sticky">
            <button
              type="button"
              className="fortune-engine__btn fortune-engine__btn--primary"
              onClick={handleLaunch}
              disabled={!canLaunchFortuneEngine({ ticketsRemaining, goldenLaunchAvailable: isFortuneGoldenLaunchAvailable(progress, Date.now()) })}
            >
              {isFortuneGoldenLaunchAvailable(progress, Date.now())
                ? '✨ Golden Launch (free)'
                : `Launch again (${FORTUNE_ENGINE_LAUNCH_TICKET_COST} 🎟️)`}
            </button>
            <button type="button" className="fortune-engine__btn" onClick={() => setPhase('entry')}>
              Launch deck
            </button>
            <button type="button" className="fortune-engine__btn" onClick={handleReturnToIsland}>
              Return to Island
            </button>
          </div>
        </div>
      )}

      {phase === 'finale_results' && (
        <div className="fortune-engine__panel fortune-engine__results fortune-engine__results--finale" role="dialog" aria-label="Fortune Core stabilised">
          <p className="fortune-engine__eyebrow">The engine falls silent…</p>
          <h2 className="fortune-engine__title">💠 Fortune Core stabilised!</h2>
          <p className="fortune-engine__copy">
            The nine fragments flare as one. Great gears slow, the rings fold inward, and
            the machine bows its light toward the island — a gift, freely given. The
            Fortune Engine will drift on between the stars, but its core is yours.
          </p>
          <p className="fortune-engine__fragment-note" role="status">
            🏆 {finaleRewardLabel ?? FORTUNE_ENGINE_FINALE_REWARD_LABEL}
          </p>
          <FragmentGrid fragmentIds={fragmentIds} lastFragmentId={null} />
          <div className="fortune-engine__actions">
            <button type="button" className="fortune-engine__btn fortune-engine__btn--primary" onClick={handleReturnToIsland}>
              Return to Island
            </button>
            <button type="button" className="fortune-engine__btn" onClick={() => setPhase('entry')}>
              Launch deck
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

function FragmentGrid({ fragmentIds, lastFragmentId }: { fragmentIds: Set<number>; lastFragmentId: number | null }) {
  return (
    <div className="fortune-engine__core" aria-label={`Fortune Core: ${fragmentIds.size} of ${FORTUNE_CORE_FRAGMENTS.length} fragments collected`}>
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

function RewardTrack({ track, onClaim }: { track: FortuneEngineTrackViewModel; onClaim: (milestoneId: string) => void }) {
  return (
    <div className="fortune-engine__track" aria-label={`Reward track: ${track.eventPoints} of ${track.totalPoints} event points`}>
      <div className="fortune-engine__track-bar" role="presentation">
        <div className="fortune-engine__track-fill" style={{ width: `${Math.round(track.fillRatio * 100)}%` }} />
      </div>
      <ol className="fortune-engine__track-nodes">
        {track.nodes.map((node) => (
          <li key={node.milestone.id} className={`fortune-engine__track-node fortune-engine__track-node--${node.state}`}>
            <span className="fortune-engine__track-node-points">{node.milestone.pointsRequired}</span>
            <span className="fortune-engine__track-node-label">{node.milestone.rewardLabel}</span>
            {node.state === 'claimable' ? (
              <button type="button" className="fortune-engine__btn fortune-engine__btn--claim" onClick={() => onClaim(node.milestone.id)}>
                Claim
              </button>
            ) : (
              <span className="fortune-engine__track-node-state">{node.state === 'claimed' ? '✅' : '🔒'}</span>
            )}
          </li>
        ))}
      </ol>
      <p className="fortune-engine__track-points">⚡ {track.eventPoints} event points</p>
    </div>
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
  const size = CANVAS_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 10;
  const arc = 360 / FORTUNE_WHEEL_SLOTS.length;

  ctx.clearRect(0, 0, size, size);
  drawSpaceBackdrop(ctx, size);

  FORTUNE_WHEEL_SLOTS.forEach((routeId, index) => {
    const route = FORTUNE_ROUTES[routeId];
    const startDeg = index * arc + rotationDeg;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outer, degToRad(startDeg), degToRad(startDeg + arc));
    ctx.closePath();
    ctx.fillStyle = ROUTE_COLORS[routeId];
    ctx.globalAlpha = 0.82;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(8, 15, 34, 0.9)';
    ctx.stroke();

    const midRad = degToRad(startDeg + arc / 2);
    const labelRadius = outer * 0.68;
    ctx.save();
    ctx.font = '22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(route.icon, cx + Math.cos(midRad) * labelRadius, cy + Math.sin(midRad) * labelRadius);
    ctx.restore();
  });

  // Hub.
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1c33';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(243, 209, 107, 0.8)';
  ctx.stroke();
  ctx.font = '24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎡', cx, cy + 1);

  // Fixed pointer at the top.
  ctx.beginPath();
  ctx.moveTo(cx - 12, 4);
  ctx.lineTo(cx + 12, 4);
  ctx.lineTo(cx, 30);
  ctx.closePath();
  ctx.fillStyle = '#f3d16b';
  ctx.fill();
  ctx.strokeStyle = 'rgba(8, 15, 34, 0.9)';
  ctx.stroke();
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
  const size = CANVAS_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 8;
  const inner = outer - 62;
  const arc = 360 / FORTUNE_RING_SEGMENT_COUNT;

  ctx.clearRect(0, 0, size, size);
  drawSpaceBackdrop(ctx, size);

  for (let index = 0; index < FORTUNE_RING_SEGMENT_COUNT; index += 1) {
    const startDeg = index * arc;
    const segment = scene.segments?.[index] ?? null;
    let fill = SEGMENT_COLORS.empty;
    let alpha = 1;
    let icon = '';
    let label = '';

    if (segment) {
      fill = SEGMENT_COLORS[segment.kind];
      icon = SEGMENT_ICONS[segment.kind];
      if (segment.kind === 'points' || segment.kind === 'dice' || segment.kind === 'essence') {
        label = String(segment.value);
      }
      if (segment.collected || segment.kind === 'empty') {
        alpha = 0.22;
        label = '';
      }
    } else if (scene.highlightIndices) {
      const isTarget = scene.highlightIndices.includes(index);
      const isHit = scene.hitIndices?.has(index) ?? false;
      fill = isHit ? '#34d399' : isTarget ? '#f3d16b' : SEGMENT_COLORS.empty;
      icon = isHit ? '✅' : isTarget ? '💠' : '';
      alpha = isTarget || isHit ? 1 : 0.6;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, outer, degToRad(startDeg + 1), degToRad(startDeg + arc - 1));
    ctx.arc(cx, cy, inner, degToRad(startDeg + arc - 1), degToRad(startDeg + 1), true);
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(8, 15, 34, 0.85)';
    ctx.stroke();

    if (icon) {
      const midRad = degToRad(startDeg + arc / 2);
      const iconRadius = (outer + inner) / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, cx + Math.cos(midRad) * iconRadius, cy + Math.sin(midRad) * iconRadius - (label ? 8 : 0));
      if (label) {
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillStyle = '#0b1c33';
        ctx.fillText(label, cx + Math.cos(midRad) * iconRadius, cy + Math.sin(midRad) * iconRadius + 11);
      }
      ctx.restore();
    }
  }

  // Pointer sweep.
  const pointerRad = degToRad(scene.pointerAngleDeg);
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(pointerRad) * (inner - 8), cy + Math.sin(pointerRad) * (inner - 8));
  ctx.lineTo(cx + Math.cos(pointerRad) * (outer + 2), cy + Math.sin(pointerRad) * (outer + 2));
  ctx.stroke();
  ctx.restore();

  // Center readout.
  ctx.beginPath();
  ctx.arc(cx, cy, inner - 18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(11, 28, 51, 0.85)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(94, 234, 212, 0.4)';
  ctx.stroke();
  ctx.fillStyle = '#e7f0ff';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(scene.centerTop, cx, cy - 12);
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillStyle = '#f3d16b';
  ctx.fillText(scene.centerBottom, cx, cy + 16);
}

function drawSpaceBackdrop(ctx: CanvasRenderingContext2D, size: number): void {
  const bg = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
  bg.addColorStop(0, '#13294a');
  bg.addColorStop(1, '#070d1d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
}
