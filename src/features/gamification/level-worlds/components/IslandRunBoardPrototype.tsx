import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  CANONICAL_BOARD_SIZE,
  TILE_ANCHORS,
  TOKEN_START_TILE_INDEX,
  OUTER_STOP_ANCHORS,
  type TileAnchor,
} from '../services/islandBoardLayout';
import { convertHeartToDicePool, getDicePerHeartForIsland } from '../services/islandRunEconomy';
import { generateIslandStopPlan } from '../services/islandRunStops';
import { planDailyHeartReward } from '../services/islandRunDailyRewards';
import { recordTelemetryEvent } from '../../../../services/telemetry';
import {
  ISLAND_RUN_RUNTIME_HYDRATION_FAILED_STAGE,
  ISLAND_RUN_RUNTIME_HYDRATION_STAGE,
  shouldEmitIslandRunRuntimeHydrationTelemetry,
} from '../services/islandRunRuntimeTelemetry';
import { useSupabaseAuth } from '../../../auth/SupabaseAuthProvider';
import {
  hydrateIslandRunRuntimeStateWithSource,
  persistIslandRunRuntimeStatePatch,
  readIslandRunRuntimeState,
} from '../services/islandRunRuntimeState';
import { logIslandRunEntryDebug } from '../services/islandRunEntryDebug';
import { awardHearts, logGameSession } from '../../../../services/gameRewards';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import {
  playIslandRunSound,
  triggerIslandRunHaptic,
  getIslandRunAudioEnabled,
  setIslandRunAudioEnabled,
} from '../services/islandRunAudio';

const ISLAND_SCENES = [1, 2, 3] as const;
const ROLL_MIN = 1;
const ROLL_MAX = 3;
const DEV_ISLAND_DURATION_SEC = 45;
const DEV_EGG_DURATION_SEC = 40;
const ENCOUNTER_TILE_INDEX = 6;
const BOSS_TRIAL_REWARD_HEARTS = 2;
const BOSS_TRIAL_REWARD_COINS = 120;
const MARKET_DICE_BUNDLE_COST = 30;
const MARKET_DICE_BUNDLE_REWARD = 6;
const MARKET_HEART_BUNDLE_COST = 40;

type EggTier = 'common' | 'rare' | 'mythic';

interface ActiveEgg {
  tier: EggTier;
  setAtMs: number;
  hatchAtMs: number;
}

type StopProgressState = 'pending' | 'active' | 'completed' | 'locked';



type IslandRunMarketPurchaseStatus = 'attempt' | 'insufficient_coins' | 'success' | 'already_owned';

type IslandRunMarketStatusCoverageReport = {
  generatedAt: string;
  passed: boolean;
  expectedStatuses: IslandRunMarketPurchaseStatus[];
  coveredStatuses: IslandRunMarketPurchaseStatus[];
  missingStatuses: IslandRunMarketPurchaseStatus[];
  markerCount: number;
  baselineApplied: boolean;
  baselineIso?: string;
};

type IslandRunMarketPurchaseSnapshotRow = {
  status?: 'attempt' | 'insufficient_coins' | 'success' | 'already_owned';
  bundle?: 'dice_bundle' | 'heart_bundle';
  costCoins?: number;
  rewardDice?: number;
  rewardHearts?: number;
  coinsBefore?: number;
  coinsAfter?: number;
  ownedDiceBundle?: boolean;
  ownedHeartBundle?: boolean;
  timestamp: string;
};

declare global {
  interface Window {
    __islandRunMarketDebugExportMarkers?: (limit?: number) => {
      generatedAt: string;
      totalMarkers: number;
      baselineApplied: boolean;
      baselineIso?: string;
      rows: IslandRunMarketPurchaseSnapshotRow[];
    };
    __islandRunMarketDebugResetState?: () => {
      resetAt: string;
      baselineApplied: boolean;
      ownedBundles: string[];
      feedbackCleared: boolean;
    };
    __islandRunMarketDebugAssertStatusCoverage?: (
      expectedStatuses?: IslandRunMarketPurchaseStatus[],
      limit?: number,
    ) => IslandRunMarketStatusCoverageReport;
  }
}

type OrbitStopVisual = {
  id: string;
  label: string;
  x: number;
  y: number;
  state: StopProgressState | 'shop';
  icon: string;
  labelOffsetY: number;
  stopId?: string;
};

const ZBAND_COLORS: Record<TileAnchor['zBand'], string> = {
  back: '#50a5ff',
  mid: '#ffe066',
  front: '#ff4ff5',
};

function toScreen(anchor: TileAnchor, width: number, height: number) {
  return {
    x: (anchor.x / CANONICAL_BOARD_SIZE.width) * width,
    y: (anchor.y / CANONICAL_BOARD_SIZE.height) * height,
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function getStopIcon(kind: string, stopId: string) {
  if (stopId === 'boss') return '👑';
  if (stopId === 'hatchery') return '🥚';

  switch (kind) {
    case 'habit_action':
      return '✅';
    case 'checkin_reflection':
      return '🧭';
    case 'utility_support':
      return '🧰';
    case 'event_challenge':
      return '⚡';
    case 'mini_game':
      return '🎮';
    default:
      return '📍';
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface IslandRunBoardPrototypeProps {
  session: Session;
}

export function IslandRunBoardPrototype({ session }: IslandRunBoardPrototypeProps) {
  const { client } = useSupabaseAuth();
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDebug, setShowDebug] = useState(() => new URLSearchParams(window.location.search).get('debugBoard') === '1');
  const showQaHooks = useMemo(() => new URLSearchParams(window.location.search).get('islandRunQa') === '1', []);
  const [activeScene, setActiveScene] = useState<(typeof ISLAND_SCENES)[number]>(1);
  const [boardSize, setBoardSize] = useState({ width: 360, height: 640 });

  const [hearts, setHearts] = useState(5);
  const [dicePool, setDicePool] = useState(() => convertHeartToDicePool(1));
  const [tokenIndex, setTokenIndex] = useState(TOKEN_START_TILE_INDEX);
  const [rollValue, setRollValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [landingText, setLandingText] = useState('Ready to roll');
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [islandNumber, setIslandNumber] = useState(1);
  const [timeLeftSec, setTimeLeftSec] = useState(DEV_ISLAND_DURATION_SEC);
  const [showTravelOverlay, setShowTravelOverlay] = useState(false);
  const [activeEgg, setActiveEgg] = useState<ActiveEgg | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [showOnboardingBooster, setShowOnboardingBooster] = useState(false);
  const [boosterName, setBoosterName] = useState('');
  const [boosterError, setBoosterError] = useState<string | null>(null);
  const [isDisplayNameLoopCompleted, setIsDisplayNameLoopCompleted] = useState(false);
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [encounterResolved, setEncounterResolved] = useState(false);
  const [bossTrialResolved, setBossTrialResolved] = useState(false);
  const [bossRewardSummary, setBossRewardSummary] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);
  const [marketPurchaseFeedback, setMarketPurchaseFeedback] = useState<string | null>(null);
  const [marketOwnedBundles, setMarketOwnedBundles] = useState<Record<'dice_bundle' | 'heart_bundle', boolean>>({
    dice_bundle: false,
    heart_bundle: false,
  });
  const [marketMarkerBaselineMs, setMarketMarkerBaselineMs] = useState<number | null>(null);
  const [showFirstRunCelebration, setShowFirstRunCelebration] = useState(false);
  const [firstRunStep, setFirstRunStep] = useState<'celebration' | 'launch'>('celebration');
  const [isPersistingFirstRunCompletion, setIsPersistingFirstRunCompletion] = useState(false);
  const [dailyHeartsClaimed, setDailyHeartsClaimed] = useState(false);
  const [hasHydratedRuntimeState, setHasHydratedRuntimeState] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(() => getIslandRunAudioEnabled());

  const onboardingStorageKey = `gol_onboarding_${session.user.id}`;
  const dailyRewardPlan = planDailyHeartReward(session.user.id);
  const [runtimeState, setRuntimeState] = useState(() => readIslandRunRuntimeState(session));
  const isOnboardingComplete = Boolean(session.user.user_metadata?.onboarding_complete);
  const isFirstRunClaimed = runtimeState.firstRunClaimed;

  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      return;
    }

    const persistedIsland = runtimeState.currentIslandNumber;
    setIslandNumber((current) => (current === persistedIsland ? current : persistedIsland));
    setDicePool(convertHeartToDicePool(persistedIsland));
    setBossTrialResolved(runtimeState.bossTrialResolvedIslandNumber === persistedIsland);
  }, [hasHydratedRuntimeState, runtimeState.bossTrialResolvedIslandNumber, runtimeState.currentIslandNumber]);

  useEffect(() => {
    logIslandRunEntryDebug('island_run_board_mount', {
      userId: session.user.id,
    });

    return () => {
      logIslandRunEntryDebug('island_run_board_unmount', {
        userId: session.user.id,
      });
    };
  }, [session.user.id]);

  useEffect(() => {
    const defaultName =
      (typeof session.user.user_metadata?.full_name === 'string' && session.user.user_metadata.full_name.trim()) ||
      session.user.email ||
      'Game of Life Player';
    setBoosterName(defaultName);
  }, [session.user.email, session.user.user_metadata]);

  useEffect(() => {
    if (activeStopId === 'market') {
      setMarketPurchaseFeedback('Prototype inventory ready.');
    }
  }, [activeStopId]);

  useEffect(() => {
    if (!showDebug && !showQaHooks) {
      return;
    }

    window.__islandRunMarketDebugExportMarkers = (limit = 12) => {
      const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 12;
      const evidence = window.__islandRunEntryDebugEvidence?.();
      const events = evidence?.events ?? [];

      const filteredEvents = events.filter((event) => {
        if (event.stage !== 'island_run_market_purchase') {
          return false;
        }

        if (!marketMarkerBaselineMs) {
          return true;
        }

        const eventMs = Date.parse(event.timestamp);
        return Number.isFinite(eventMs) && eventMs >= marketMarkerBaselineMs;
      });

      const rows = filteredEvents.slice(-safeLimit).map((event) => ({
        status: event.payload?.status as IslandRunMarketPurchaseSnapshotRow['status'],
        bundle: event.payload?.bundle as IslandRunMarketPurchaseSnapshotRow['bundle'],
        costCoins: event.payload?.costCoins as number | undefined,
        rewardDice: event.payload?.rewardDice as number | undefined,
        rewardHearts: event.payload?.rewardHearts as number | undefined,
        coinsBefore: event.payload?.coinsBefore as number | undefined,
        coinsAfter: event.payload?.coinsAfter as number | undefined,
        ownedDiceBundle: event.payload?.ownedDiceBundle as boolean | undefined,
        ownedHeartBundle: event.payload?.ownedHeartBundle as boolean | undefined,
        timestamp: event.timestamp,
      }));

      const snapshot = {
        generatedAt: new Date().toISOString(),
        totalMarkers: rows.length,
        baselineApplied: Boolean(marketMarkerBaselineMs),
        baselineIso: marketMarkerBaselineMs ? new Date(marketMarkerBaselineMs).toISOString() : undefined,
        rows,
      };

      console.info('[IslandRunMarketDebugMarkers]', snapshot);
      return snapshot;
    };

    window.__islandRunMarketDebugAssertStatusCoverage = (expectedStatuses, limit = 32) => {
      const normalizedExpected = (Array.isArray(expectedStatuses) && expectedStatuses.length
        ? expectedStatuses
        : ['attempt', 'insufficient_coins', 'success', 'already_owned']) as IslandRunMarketPurchaseStatus[];
      const snapshot = window.__islandRunMarketDebugExportMarkers?.(limit);
      const coveredStatuses = Array.from(
        new Set(snapshot?.rows.map((row) => row.status).filter((status): status is IslandRunMarketPurchaseStatus => Boolean(status))),
      );
      const missingStatuses = normalizedExpected.filter((status) => !coveredStatuses.includes(status));

      const report: IslandRunMarketStatusCoverageReport = {
        generatedAt: new Date().toISOString(),
        passed: missingStatuses.length === 0,
        expectedStatuses: normalizedExpected,
        coveredStatuses,
        missingStatuses,
        markerCount: snapshot?.rows.length ?? 0,
        baselineApplied: snapshot?.baselineApplied ?? false,
        baselineIso: snapshot?.baselineIso,
      };

      console.info('[IslandRunMarketStatusCoverage]', report.passed ? 'PASS' : 'FAIL', report);
      return report;
    };

    window.__islandRunMarketDebugResetState = () => {
      const resetAt = new Date().toISOString();
      const resetMs = Date.parse(resetAt);

      setMarketPurchaseFeedback(null);
      setMarketOwnedBundles({
        dice_bundle: false,
        heart_bundle: false,
      });
      setMarketMarkerBaselineMs(resetMs);

      const result = {
        resetAt,
        baselineApplied: true,
        ownedBundles: [],
        feedbackCleared: true,
      };

      console.info('[IslandRunMarketDebugReset]', result);
      return result;
    };

    return () => {
      delete window.__islandRunMarketDebugExportMarkers;
      delete window.__islandRunMarketDebugResetState;
      delete window.__islandRunMarketDebugAssertStatusCoverage;
    };
  }, [marketMarkerBaselineMs, showDebug, showQaHooks]);


  useEffect(() => {
    let isActive = true;

    setHasHydratedRuntimeState(false);
    setRuntimeState(readIslandRunRuntimeState(session));

    void hydrateIslandRunRuntimeStateWithSource({ session, client })
      .then((hydrationResult) => {
        if (!isActive) return;
        setRuntimeState(hydrationResult.state);

        logIslandRunEntryDebug('island_run_runtime_hydration_result', {
          userId: session.user.id,
          source: hydrationResult.source,
        });

        if (hydrationResult.source !== 'table') {
          setLandingText('Using local runtime fallback while server runtime state is unavailable.');
        }

        if (shouldEmitIslandRunRuntimeHydrationTelemetry({
          userId: session.user.id,
          eventType: 'runtime_state_hydrated',
          source: hydrationResult.source,
        })) {
          void recordTelemetryEvent({
            userId: session.user.id,
            eventType: 'runtime_state_hydrated',
            metadata: {
              stage: ISLAND_RUN_RUNTIME_HYDRATION_STAGE,
              source: hydrationResult.source,
            },
          });
        }
      })
      .catch((error: unknown) => {
        logIslandRunEntryDebug('island_run_runtime_hydration_error', {
          userId: session.user.id,
          errorMessage: error instanceof Error ? error.message : 'unknown_error',
        });
        if (isActive) {
          setLandingText('Using local runtime fallback while runtime hydration failed unexpectedly.');
        }

        if (shouldEmitIslandRunRuntimeHydrationTelemetry({
          userId: session.user.id,
          eventType: 'runtime_state_hydration_failed',
        })) {
          void recordTelemetryEvent({
            userId: session.user.id,
            eventType: 'runtime_state_hydration_failed',
            metadata: {
              stage: ISLAND_RUN_RUNTIME_HYDRATION_FAILED_STAGE,
              error_message: error instanceof Error ? error.message : 'unknown_error',
            },
          });
        }
      })
      .finally(() => {
        if (!isActive) return;
        setHasHydratedRuntimeState(true);
      });

    return () => {
      isActive = false;
    };
  }, [client, session.user.id]);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(onboardingStorageKey);
    if (!storedValue) {
      setIsDisplayNameLoopCompleted(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as { stepIndex?: number };
      setIsDisplayNameLoopCompleted((parsed.stepIndex ?? 0) >= 1);
    } catch {
      setIsDisplayNameLoopCompleted(false);
    }
  }, [onboardingStorageKey]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || isOnboardingComplete) return;

    if (!isFirstRunClaimed) {
      setShowFirstRunCelebration(true);
      setFirstRunStep('celebration');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
        metadata: { stage: 'island_run_first_run_started', island: islandNumber },
      });
    }
  }, [hasHydratedRuntimeState, isFirstRunClaimed, isOnboardingComplete, islandNumber, session.user.id]);

  useEffect(() => {
    setDailyHeartsClaimed(runtimeState.dailyHeartsClaimedDayKey === dailyRewardPlan.dayKey);
  }, [dailyRewardPlan.dayKey, runtimeState.dailyHeartsClaimedDayKey]);

  useEffect(() => {
    const ticker = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(ticker);
  }, []);

  useEffect(() => {
    const updateBoardSize = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      setBoardSize({ width: rect.width, height: rect.height });
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(boardSize.width * ratio);
    canvas.height = Math.floor(boardSize.height * ratio);
    canvas.style.width = `${boardSize.width}px`;
    canvas.style.height = `${boardSize.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, boardSize.width, boardSize.height);

    const points = TILE_ANCHORS.map((anchor) => toScreen(anchor, boardSize.width, boardSize.height));
    if (!points.length) return;

    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const current = points[i];
      const midX = (prev.x + current.x) / 2;
      const midY = (prev.y + current.y) / 2;
      context.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }

    const last = points[points.length - 1];
    const first = points[0];
    const closeMidX = (last.x + first.x) / 2;
    const closeMidY = (last.y + first.y) / 2;
    context.quadraticCurveTo(last.x, last.y, closeMidX, closeMidY);

    const glowGradient = context.createLinearGradient(0, 0, 0, boardSize.height);
    glowGradient.addColorStop(0, 'rgba(161, 236, 255, 0.28)');
    glowGradient.addColorStop(0.5, 'rgba(247, 218, 138, 0.42)');
    glowGradient.addColorStop(1, 'rgba(214, 174, 92, 0.65)');

    context.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    context.lineWidth = 26;
    context.stroke();

    context.strokeStyle = glowGradient;
    context.lineWidth = 13;
    context.stroke();

    if (showDebug) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      context.setLineDash([8, 8]);
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
    }
  }, [boardSize, showDebug]);

  const islandStopPlan = useMemo(() => generateIslandStopPlan(islandNumber), [islandNumber]);

  const [completedStops, setCompletedStops] = useState<string[]>([]);

  const stopStateMap = useMemo(() => {
    const map = new Map<string, StopProgressState>();
    const nonBossStops = islandStopPlan.filter((stop) => stop.stopId !== 'boss');
    const allNonBossCompleted = nonBossStops.every((stop) => completedStops.includes(stop.stopId));

    for (const stop of islandStopPlan) {
      if (completedStops.includes(stop.stopId)) {
        map.set(stop.stopId, 'completed');
        continue;
      }

      if (stop.stopId === 'boss') {
        map.set(stop.stopId, allNonBossCompleted ? 'active' : 'locked');
        continue;
      }

      map.set(stop.stopId, 'active');
    }

    return map;
  }, [completedStops, islandStopPlan]);

  const stopMap = useMemo(() => {
    const map = new Map<number, string>();
    islandStopPlan.forEach((stop) => map.set(stop.tileIndex, stop.stopId));
    return map;
  }, [islandStopPlan]);

  const tokenPosition = toScreen(TILE_ANCHORS[tokenIndex], boardSize.width, boardSize.height);
  const activeStop = activeStopId ? islandStopPlan.find((stop) => stop.stopId === activeStopId) ?? null : null;

  const orbitStopVisuals = useMemo<OrbitStopVisual[]>(() => {
    const orderedAnchors = OUTER_STOP_ANCHORS.filter((anchor) => anchor.id !== 'shop');

    const planVisuals = islandStopPlan.map((stop, index) => {
      const anchor = orderedAnchors[index] ?? orderedAnchors[orderedAnchors.length - 1];
      const position = toScreen({
        id: `orbit_${anchor.id}`,
        x: anchor.x,
        y: anchor.y,
        zBand: 'front',
        tangentDeg: 0,
        scale: 1,
      }, boardSize.width, boardSize.height);

      const horizontalPadding = 44;
      const verticalPadding = 44;
      const labelOffsetY = index % 2 === 0 ? -38 : 38;

      return {
        id: stop.stopId,
        label: stop.title.replace(/^\S+\s/, ''),
        x: clamp(position.x, horizontalPadding, boardSize.width - horizontalPadding),
        y: clamp(position.y, verticalPadding, boardSize.height - verticalPadding),
        state: stopStateMap.get(stop.stopId) ?? 'active',
        icon: getStopIcon(stop.kind, stop.stopId),
        labelOffsetY,
        stopId: stop.stopId,
      } satisfies OrbitStopVisual;
    });

    const shopAnchor = OUTER_STOP_ANCHORS.find((anchor) => anchor.id === 'shop');
    const shopPosition = shopAnchor
      ? toScreen(
          {
            id: 'orbit_shop',
            x: shopAnchor.x,
            y: shopAnchor.y,
            zBand: 'front',
            tangentDeg: 0,
            scale: 1,
          },
          boardSize.width,
          boardSize.height,
        )
      : { x: boardSize.width * 0.14, y: boardSize.height * 0.5 };

    return [
      ...planVisuals,
      {
        id: 'shop',
        label: 'Shop',
        x: clamp(shopPosition.x, 44, boardSize.width - 44),
        y: clamp(shopPosition.y, 44, boardSize.height - 44),
        state: 'shop',
        icon: '🛒',
        labelOffsetY: -38,
      },
    ];
  }, [boardSize.height, boardSize.width, islandStopPlan, stopStateMap]);

  const eggStage = useMemo(() => {
    if (!activeEgg) return 0;
    const total = Math.max(1, activeEgg.hatchAtMs - activeEgg.setAtMs);
    const progress = Math.min(1, Math.max(0, (nowMs - activeEgg.setAtMs) / total));
    return Math.min(4, Math.max(1, Math.ceil(progress * 4)));
  }, [activeEgg, nowMs]);

  const eggRemainingSec = activeEgg ? Math.max(0, Math.ceil((activeEgg.hatchAtMs - nowMs) / 1000)) : 0;

  useEffect(() => {
    if (showTravelOverlay) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftSec((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showTravelOverlay, islandNumber]);

  useEffect(() => {
    if (timeLeftSec > 0 || showTravelOverlay) {
      return;
    }

    setShowTravelOverlay(true);
    setLandingText('Island expired. Traveling to next island...');
    // M10A: island_travel sound + haptic on travel start
    playIslandRunSound('island_travel');
    triggerIslandRunHaptic('island_travel');

    const timeout = window.setTimeout(() => {
      const nextIsland = islandNumber + 1;
      setIslandNumber(nextIsland);
      setDicePool(convertHeartToDicePool(nextIsland));
      setTokenIndex(TOKEN_START_TILE_INDEX);
      setHearts(5);
      setRollValue(null);
      setActiveStopId(null);
      setShowEncounterModal(false);
      setEncounterResolved(false);
      setCompletedStops([]);
      setBossTrialResolved(false);
      setBossRewardSummary(null);
      setTimeLeftSec(DEV_ISLAND_DURATION_SEC);
      setLandingText('Arrived at next island. Ready to roll. Egg progress carried over (prototype).');
      setShowTravelOverlay(false);

      void persistIslandRunRuntimeStatePatch({
        session,
        client,
        patch: {
          currentIslandNumber: nextIsland,
          bossTrialResolvedIslandNumber: null,
        },
      });
      setRuntimeState((current) => ({
        ...current,
        currentIslandNumber: nextIsland,
        bossTrialResolvedIslandNumber: null,
      }));
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [client, islandNumber, session, showTravelOverlay, timeLeftSec]);

  const timerDisplay = formatClock(timeLeftSec);
  const dicePerHeart = getDicePerHeartForIsland(islandNumber);

  const handleRoll = async () => {
    if (showFirstRunCelebration) return;

    if (isRolling) {
      return;
    }

    if (dicePool < 1) {
      if (hearts < 1) {
        return;
      }

      setHearts((current) => Math.max(0, current - 1));
      setDicePool((current) => current + convertHeartToDicePool(islandNumber));
      setLandingText(`Converted 1 heart into ${convertHeartToDicePool(islandNumber)} dice rolls.`);
      return;
    }

    setIsRolling(true);
    setActiveStopId(null);
    setDicePool((current) => Math.max(0, current - 1));

    // M10A: roll sound + haptic
    playIslandRunSound('roll');
    triggerIslandRunHaptic('roll');

    const nextRoll = Math.floor(Math.random() * (ROLL_MAX - ROLL_MIN + 1)) + ROLL_MIN;
    setRollValue(nextRoll);
    setLandingText(`Rolling ${nextRoll}...`);

    let currentIndex = tokenIndex;
    for (let step = 0; step < nextRoll; step += 1) {
      currentIndex = (currentIndex + 1) % TILE_ANCHORS.length;
      setTokenIndex(currentIndex);
      // M10A: token_move sound on each hop
      playIslandRunSound('token_move');
      await wait(240);
    }

    const landedStop = stopMap.get(currentIndex);
    if (landedStop) {
      const stopConfig = islandStopPlan.find((stop) => stop.stopId === landedStop);
      const stopTitle = stopConfig?.title ?? landedStop.toUpperCase();
      const state = stopStateMap.get(landedStop) ?? 'active';

      if (state === 'locked') {
        setLandingText(`Boss stop locked: complete all 5 stops before boss.`);
        setActiveStopId(null);
      } else {
        setLandingText(`Landed on STOP: ${stopTitle} (#${currentIndex})`);
        setActiveStopId(landedStop);
        // M10A: stop_land sound + haptic
        playIslandRunSound('stop_land');
        triggerIslandRunHaptic('stop_land');
      }

      setShowEncounterModal(false);
      setEncounterResolved(false);
    } else if (currentIndex === ENCOUNTER_TILE_INDEX) {
      setLandingText(`Encounter tile reached (#${currentIndex}). Bonus challenge available.`);
      setShowEncounterModal(true);
      setEncounterResolved(false);
    } else {
      setLandingText(`Landed on tile #${currentIndex}`);
      setShowEncounterModal(false);
      setEncounterResolved(false);
    }

    setIsRolling(false);
  };

  const handleSetEgg = (tier: EggTier) => {
    const start = Date.now();
    setActiveEgg({ tier, setAtMs: start, hatchAtMs: start + DEV_EGG_DURATION_SEC * 1000 });
  };

  const handleClaimOnboardingBooster = () => {
    const trimmedName = boosterName.trim();
    if (!trimmedName) {
      setBoosterError('Display name is required.');
      return;
    }

    let nextStepIndex = 1;
    let tokens = 0;
    let unlockedItemIds: string[] = [];

    const existingState = window.localStorage.getItem(onboardingStorageKey);
    if (existingState) {
      try {
        const parsed = JSON.parse(existingState) as {
          stepIndex?: number;
          tokens?: number;
          unlockedItemIds?: string[];
        };
        nextStepIndex = Math.max(1, parsed.stepIndex ?? 0);
        tokens = parsed.tokens ?? 0;
        unlockedItemIds = parsed.unlockedItemIds ?? [];
      } catch {
        // ignore broken storage and write a fresh payload
      }
    }

    window.localStorage.setItem(
      onboardingStorageKey,
      JSON.stringify({
        stepIndex: nextStepIndex,
        tokens,
        unlockedItemIds,
      }),
    );

    setIsDisplayNameLoopCompleted(true);
    setHearts((current) => current + 1);
    setLandingText(`Onboarding display-name loop complete for ${trimmedName}. +1 heart rewarded.`);
    setShowOnboardingBooster(false);
    setBoosterError(null);
  };

  const handleResolveEncounter = () => {
    if (encounterResolved) return;
    setEncounterResolved(true);
    setHearts((current) => current + 1);
    // M10A: reward_claim haptic on encounter reward
    triggerIslandRunHaptic('reward_claim');
    setLandingText('Encounter resolved: +1 heart reward (prototype).');
  };

  const handleResolveBossTrial = () => {
    if (bossTrialResolved) {
      return;
    }

    awardHearts(session.user.id, BOSS_TRIAL_REWARD_HEARTS, 'shooter_blitz', 'Island Run boss trial resolved');
    awardGold(session.user.id, BOSS_TRIAL_REWARD_COINS, 'shooter_blitz', 'Island Run boss trial resolved');

    logGameSession(session.user.id, {
      gameId: 'shooter_blitz',
      action: 'reward',
      timestamp: new Date().toISOString(),
      metadata: {
        stage: 'island_run_boss_trial_resolved',
        reward_hearts: BOSS_TRIAL_REWARD_HEARTS,
        reward_coins: BOSS_TRIAL_REWARD_COINS,
        island_number: islandNumber,
      },
    });

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_boss_trial_resolved',
        source: 'shooter_blitz',
        hearts: BOSS_TRIAL_REWARD_HEARTS,
        coins: BOSS_TRIAL_REWARD_COINS,
        island_number: islandNumber,
      },
    });

    setBossTrialResolved(true);
    setHearts((current) => current + BOSS_TRIAL_REWARD_HEARTS);
    setCoins((current) => current + BOSS_TRIAL_REWARD_COINS);
    // M10A: reward_claim haptic on boss trial reward
    triggerIslandRunHaptic('reward_claim');

    const rewardText = `Boss challenge resolved: +${BOSS_TRIAL_REWARD_HEARTS} hearts, +${BOSS_TRIAL_REWARD_COINS} coins.`;
    setBossRewardSummary(rewardText);
    setLandingText(`${rewardText} Claim island clear to travel.`);

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: islandNumber,
        bossTrialResolvedIslandNumber: islandNumber,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: islandNumber,
      bossTrialResolvedIslandNumber: islandNumber,
    }));
  };

  const emitMarketPurchaseMarker = (payload: {
    bundle: 'dice_bundle' | 'heart_bundle';
    status: 'attempt' | 'insufficient_coins' | 'success' | 'already_owned';
    costCoins: number;
    rewardDice?: number;
    rewardHearts?: number;
    coinsBefore: number;
    coinsAfter: number;
    ownedDiceBundle?: boolean;
    ownedHeartBundle?: boolean;
  }) => {
    logIslandRunEntryDebug('island_run_market_purchase', {
      islandNumber,
      ...payload,
    });

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_market_purchase',
        island_number: islandNumber,
        bundle: payload.bundle,
        status: payload.status,
        cost_coins: payload.costCoins,
        reward_dice: payload.rewardDice ?? 0,
        reward_hearts: payload.rewardHearts ?? 0,
        coins_before: payload.coinsBefore,
        coins_after: payload.coinsAfter,
        owned_dice_bundle: payload.ownedDiceBundle,
        owned_heart_bundle: payload.ownedHeartBundle,
      },
    });
  };

  const handleQaTriggerMarketAlreadyOwnedMarker = (bundle: 'dice_bundle' | 'heart_bundle' = 'dice_bundle') => {
    const costCoins = bundle === 'dice_bundle' ? MARKET_DICE_BUNDLE_COST : MARKET_HEART_BUNDLE_COST;
    const rewardDice = bundle === 'dice_bundle' ? MARKET_DICE_BUNDLE_REWARD : undefined;
    const rewardHearts = bundle === 'heart_bundle' ? 1 : undefined;

    setActiveStopId('market');
    setMarketOwnedBundles((current) => ({
      ...current,
      [bundle]: true,
    }));

    emitMarketPurchaseMarker({
      bundle,
      status: 'already_owned',
      costCoins,
      rewardDice,
      rewardHearts,
      coinsBefore: coins,
      coinsAfter: coins,
      ownedDiceBundle: bundle === 'dice_bundle' ? true : marketOwnedBundles.dice_bundle,
      ownedHeartBundle: bundle === 'heart_bundle' ? true : marketOwnedBundles.heart_bundle,
    });

    const message =
      bundle === 'dice_bundle'
        ? 'QA marker: Dice Bundle already owned path emitted.'
        : 'QA marker: Heart Bundle already owned path emitted.';

    setMarketPurchaseFeedback(message);
    setLandingText(message);
  };

  const handleMarketPrototypePurchase = (bundle: 'dice_bundle' | 'heart_bundle') => {
    if (marketOwnedBundles[bundle]) {
      emitMarketPurchaseMarker({
        bundle,
        status: 'already_owned',
        costCoins: bundle === 'dice_bundle' ? MARKET_DICE_BUNDLE_COST : MARKET_HEART_BUNDLE_COST,
        rewardDice: bundle === 'dice_bundle' ? MARKET_DICE_BUNDLE_REWARD : undefined,
        rewardHearts: bundle === 'heart_bundle' ? 1 : undefined,
        coinsBefore: coins,
        coinsAfter: coins,
        ownedDiceBundle: marketOwnedBundles.dice_bundle,
        ownedHeartBundle: marketOwnedBundles.heart_bundle,
      });

      const ownedMessage =
        bundle === 'dice_bundle'
          ? 'Dice Bundle already owned for this island run.'
          : 'Heart Bundle already owned for this island run.';
      setMarketPurchaseFeedback(ownedMessage);
      setLandingText(ownedMessage);
      return;
    }
    if (bundle === 'dice_bundle') {
      emitMarketPurchaseMarker({
        bundle,
        status: 'attempt',
        costCoins: MARKET_DICE_BUNDLE_COST,
        rewardDice: MARKET_DICE_BUNDLE_REWARD,
        coinsBefore: coins,
        coinsAfter: coins,
      });

      if (coins < MARKET_DICE_BUNDLE_COST) {
        const message = `Not enough coins for Dice Bundle (${MARKET_DICE_BUNDLE_COST} required).`;
        emitMarketPurchaseMarker({
          bundle,
          status: 'insufficient_coins',
          costCoins: MARKET_DICE_BUNDLE_COST,
          rewardDice: MARKET_DICE_BUNDLE_REWARD,
          coinsBefore: coins,
          coinsAfter: coins,
        });
        setMarketPurchaseFeedback(message);
        setLandingText(message);
        return;
      }

      setCoins((current) => current - MARKET_DICE_BUNDLE_COST);
      setDicePool((current) => current + MARKET_DICE_BUNDLE_REWARD);

      emitMarketPurchaseMarker({
        bundle,
        status: 'success',
        costCoins: MARKET_DICE_BUNDLE_COST,
        rewardDice: MARKET_DICE_BUNDLE_REWARD,
        coinsBefore: coins,
        coinsAfter: coins - MARKET_DICE_BUNDLE_COST,
      });

      const message = `Purchased Dice Bundle: -${MARKET_DICE_BUNDLE_COST} coins, +${MARKET_DICE_BUNDLE_REWARD} dice.`;
      setMarketOwnedBundles((current) => ({ ...current, dice_bundle: true }));
      setMarketPurchaseFeedback(message);
      setLandingText(message);
      return;
    }

    emitMarketPurchaseMarker({
      bundle,
      status: 'attempt',
      costCoins: MARKET_HEART_BUNDLE_COST,
      rewardHearts: 1,
      coinsBefore: coins,
      coinsAfter: coins,
    });

    if (coins < MARKET_HEART_BUNDLE_COST) {
      const message = `Not enough coins for Heart Bundle (${MARKET_HEART_BUNDLE_COST} required).`;
      emitMarketPurchaseMarker({
        bundle,
        status: 'insufficient_coins',
        costCoins: MARKET_HEART_BUNDLE_COST,
        rewardHearts: 1,
        coinsBefore: coins,
        coinsAfter: coins,
      });
      setMarketPurchaseFeedback(message);
      setLandingText(message);
      return;
    }

    setCoins((current) => current - MARKET_HEART_BUNDLE_COST);
    setHearts((current) => current + 1);

    emitMarketPurchaseMarker({
      bundle,
      status: 'success',
      costCoins: MARKET_HEART_BUNDLE_COST,
      rewardHearts: 1,
      coinsBefore: coins,
      coinsAfter: coins - MARKET_HEART_BUNDLE_COST,
    });

    const message = `Purchased Heart Bundle: -${MARKET_HEART_BUNDLE_COST} coins, +1 heart.`;
    setMarketOwnedBundles((current) => ({ ...current, heart_bundle: true }));
    setMarketPurchaseFeedback(message);
    setLandingText(message);
  };

  const handleCompleteActiveStop = () => {
    if (!activeStopId) return;

    if (activeStopId === 'boss') {
      if (!bossTrialResolved) {
        setLandingText('Boss challenge is still pending. Resolve the boss trial before clearing the island.');
        return;
      }

      setLandingText('Boss stop complete! Island clear. Next island unlocked.');
      setCompletedStops((current) => (current.includes('boss') ? current : [...current, 'boss']));

      logGameSession(session.user.id, {
        gameId: 'shooter_blitz',
        action: 'complete',
        timestamp: new Date().toISOString(),
        metadata: {
          stage: 'island_run_boss_island_cleared',
          island_number: islandNumber,
          rewards_granted: {
            hearts: BOSS_TRIAL_REWARD_HEARTS,
            coins: BOSS_TRIAL_REWARD_COINS,
          },
        },
      });

      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'island_run_boss_island_cleared',
          source: 'shooter_blitz',
          island_number: islandNumber,
          boss_trial_resolved: true,
        },
      });

      setShowTravelOverlay(true);
      window.setTimeout(() => {
        const nextIsland = islandNumber + 1;
        setShowTravelOverlay(false);
        setIslandNumber(nextIsland);
        setDicePool(convertHeartToDicePool(nextIsland));
        setTokenIndex(TOKEN_START_TILE_INDEX);
        setHearts(5);
        setRollValue(null);
        setActiveStopId(null);
        setEncounterResolved(false);
        setCompletedStops([]);
        setBossTrialResolved(false);
        setBossRewardSummary(null);
        setMarketPurchaseFeedback(null);
        setMarketOwnedBundles({
          dice_bundle: false,
          heart_bundle: false,
        });
        setTimeLeftSec(DEV_ISLAND_DURATION_SEC);

        void persistIslandRunRuntimeStatePatch({
          session,
          client,
          patch: {
            currentIslandNumber: nextIsland,
            bossTrialResolvedIslandNumber: null,
          },
        });
        setRuntimeState((current) => ({
          ...current,
          currentIslandNumber: nextIsland,
          bossTrialResolvedIslandNumber: null,
        }));
      }, 1400);
      return;
    }

    setCompletedStops((current) => (current.includes(activeStopId) ? current : [...current, activeStopId]));
    setLandingText(`${activeStopId.toUpperCase()} stop completed.`);
    if (activeStopId === 'market') {
      setMarketPurchaseFeedback(null);
      setMarketOwnedBundles({
        dice_bundle: false,
        heart_bundle: false,
      });
    }
    setActiveStopId(null);
  };

  const markOnboardingComplete = async () => {
    if (isOnboardingComplete && isFirstRunClaimed) return true;

    const result = await persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        onboardingComplete: true,
        firstRunClaimed: true,
      },
    });

    if (!result.ok) {
      setLandingText(`Could not complete first-run setup: ${result.errorMessage}`);
      return false;
    }

    setRuntimeState((current) => ({
      ...current,
      firstRunClaimed: true,
    }));

    return true;
  };

  const handleClaimDailyHearts = async (source: 'spin_of_the_day' | 'daily_hatch') => {
    if (!hasHydratedRuntimeState || dailyHeartsClaimed || dailyRewardPlan.source !== source) return;

    const result = await persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        dailyHeartsClaimedDayKey: dailyRewardPlan.dayKey,
      },
    });

    if (!result.ok) {
      setLandingText(`Could not claim daily hearts: ${result.errorMessage}`);
      return;
    }

    setRuntimeState((current) => ({
      ...current,
      dailyHeartsClaimedDayKey: dailyRewardPlan.dayKey,
    }));
    setHearts((current) => current + dailyRewardPlan.hearts);
    setDailyHeartsClaimed(true);
    // M10A: reward_claim haptic on daily hearts claimed
    triggerIslandRunHaptic('reward_claim');
    setLandingText(`Morning reward claimed from ${source === 'spin_of_the_day' ? 'Spin of the Day' : 'Daily Hatch'}: +${dailyRewardPlan.hearts} hearts.`);

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        source,
        hearts: dailyRewardPlan.hearts,
        day_key: dailyRewardPlan.dayKey,
        stage: 'island_run_daily_hearts_claimed',
      },
    });
  };

  const handleQaMarkBossResolved = () => {
    setBossTrialResolved(true);
    setBossRewardSummary(`QA marker set for island ${islandNumber}.`);
    setLandingText(`QA: boss marker set for island ${islandNumber}.`);

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: islandNumber,
        bossTrialResolvedIslandNumber: islandNumber,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: islandNumber,
      bossTrialResolvedIslandNumber: islandNumber,
    }));
  };

  const handleQaAdvanceIsland = () => {
    const nextIsland = islandNumber + 1;
    setIslandNumber(nextIsland);
    setDicePool(convertHeartToDicePool(nextIsland));
    setTokenIndex(TOKEN_START_TILE_INDEX);
    setBossTrialResolved(false);
    setBossRewardSummary(null);
    setLandingText(`QA: advanced to island ${nextIsland}.`);

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: nextIsland,
        bossTrialResolvedIslandNumber: null,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: nextIsland,
      bossTrialResolvedIslandNumber: null,
    }));
  };

  const handleQaResetProgression = () => {
    setIslandNumber(1);
    setDicePool(convertHeartToDicePool(1));
    setTokenIndex(TOKEN_START_TILE_INDEX);
    setBossTrialResolved(false);
    setBossRewardSummary(null);
    setLandingText('QA: progression markers reset to island 1.');

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: 1,
        bossTrialResolvedIslandNumber: null,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: 1,
      bossTrialResolvedIslandNumber: null,
    }));
  };

  const handleClaimFirstRunRewards = async () => {
    if (firstRunStep === 'celebration') {
      setHearts((current) => current + 5);
      setCoins((current) => current + 250);
      setDicePool((current) => current + convertHeartToDicePool(islandNumber));
      setLandingText('Starter claim complete: +5 hearts, +250 coins, +1 heart worth of dice.');
      setFirstRunStep('launch');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
        metadata: {
          stage: 'island_run_first_run_rewards_claimed',
          island: islandNumber,
          rewards: { hearts: 5, coins: 250, dice_bonus: convertHeartToDicePool(islandNumber) },
        },
      });
      return;
    }

    setIsPersistingFirstRunCompletion(true);
    const completionSaved = await markOnboardingComplete();
    setIsPersistingFirstRunCompletion(false);
    if (!completionSaved) return;

    setShowFirstRunCelebration(false);
    setLandingText('Island Run started. Reach each stop and unlock the boss.');
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'onboarding_completed',
      metadata: { stage: 'island_run_first_run_launch_confirmed', island: islandNumber },
    });
  };

  return (
    <section className="island-run-prototype">
      <header className="island-run-prototype__header">
        <h2 className="island-run-prototype__title">🏝️ Island Run • M7F Regression QA Hooks</h2>
        <div className="island-run-prototype__hud-grid">
          <div className="island-run-prototype__hud-section">
            <p className="island-run-prototype__hud-label">Run status</p>
            <div className="island-run-prototype__status-row">
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--hearts">Hearts: <strong>{hearts}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">Dice: <strong>{dicePool}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--coins">Coins: <strong>{coins}</strong></span>
              <span className="island-run-prototype__stat-chip">Tile: <strong>{tokenIndex}</strong></span>
              <span className="island-run-prototype__stat-chip">Island: <strong>{islandNumber}</strong></span>
              <span className="island-run-prototype__stat-chip">Last roll: <strong>{rollValue ?? '-'}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--timer">Ends in: <strong>{timerDisplay}</strong></span>
            </div>
          </div>
          <div className="island-run-prototype__hud-section island-run-prototype__hud-section--landing">
            <p className="island-run-prototype__hud-label">Live feed</p>
            <p className="island-run-prototype__landing island-run-prototype__landing--info">{landingText}</p>
            <p className="island-run-prototype__landing island-run-prototype__landing--plan">
              Stop plan: {islandStopPlan.map((stop) => stop.title.split(' ').slice(1).join(' ') || stop.title).join(' → ')}
            </p>
            <p className="island-run-prototype__landing island-run-prototype__landing--states">
              Stop states: {islandStopPlan.map((stop) => `${stop.stopId}:${stopStateMap.get(stop.stopId) ?? 'active'}`).join(' | ')}
            </p>
          </div>
        </div>
        <div className="island-run-prototype__home-panel" role="group" aria-label="Home hatchery prototype summary">
          <p className="island-run-prototype__landing" role="note">
            <strong>Home Island Hatchery (M9A prototype):</strong> always available, supports one home egg slot (v1), and ready home eggs
            can be collected anytime without landing movement.
          </p>
          <p className="island-run-prototype__landing island-run-prototype__landing--success" role="status">
            Home hatchery status (M9B prototype): slot usage <strong>0/1</strong> (available) · ready home eggs <strong>0</strong>.
          </p>
          <p className="island-run-prototype__landing island-run-prototype__landing--info" role="note">
            Home hatchery actions (M9C prototype): if the slot is empty, set one egg; if an egg is ready (stage 4), open/collect immediately from
            Home Island without tile movement.
          </p>
          <p className="island-run-prototype__landing island-run-prototype__landing--warn" role="note">
            Home hatchery progression (M9D prototype): island eggs that become ready but uncollected can carry as dormant eggs, and dormant/home eggs
            are opened from hatchery surfaces when available.
          </p>
        </div>
        <div className="island-run-prototype__controls">
          {ISLAND_SCENES.map((sceneId) => (
            <button
              key={sceneId}
              type="button"
              className={`island-run-prototype__scene-btn ${activeScene === sceneId ? 'island-run-prototype__scene-btn--active' : ''}`}
              onClick={() => setActiveScene(sceneId)}
            >
              BG {sceneId}
            </button>
          ))}
          <button type="button" className="island-run-prototype__debug-btn" onClick={() => setShowDebug((value) => !value)}>
            {showDebug ? 'Hide' : 'Show'} anchor/depth debug
          </button>
          {/* M10A: audio toggle — persists to localStorage */}
          <button
            type="button"
            className="island-run-prototype__audio-toggle"
            aria-label={audioEnabled ? 'Mute audio and haptics' : 'Unmute audio and haptics'}
            aria-pressed={audioEnabled}
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              setIslandRunAudioEnabled(next);
            }}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            className={`island-run-prototype__roll-btn island-run-prototype__roll-btn--cta ${dicePool > 0 ? 'island-run-prototype__roll-btn--primary' : 'island-run-prototype__roll-btn--convert'}`}
            onClick={handleRoll}
            disabled={showFirstRunCelebration || isRolling || (dicePool < 1 && hearts < 1) || showTravelOverlay}
          >
            {isRolling
              ? 'Rolling...'
              : dicePool > 0
                ? 'Roll (1 dice)'
                : `Convert 1 heart → ${dicePerHeart} dice`}
          </button>

          {(showDebug || showQaHooks) && (
            <div className="island-run-prototype__qa-controls" role="group" aria-label="QA and debug controls">
              <p className="island-run-prototype__qa-label">QA / Debug tools</p>
              <button type="button" className="island-run-prototype__debug-btn" onClick={handleQaMarkBossResolved}>
                QA: Mark boss resolved
              </button>
              <button type="button" className="island-run-prototype__debug-btn" onClick={handleQaAdvanceIsland}>
                QA: Advance island
              </button>
              <button type="button" className="island-run-prototype__debug-btn" onClick={handleQaResetProgression}>
                QA: Reset progression
              </button>
              <button
                type="button"
                className="island-run-prototype__debug-btn"
                onClick={() => handleQaTriggerMarketAlreadyOwnedMarker('dice_bundle')}
              >
                QA: Market already-owned (dice)
              </button>
              <button
                type="button"
                className="island-run-prototype__debug-btn"
                onClick={() => handleQaTriggerMarketAlreadyOwnedMarker('heart_bundle')}
              >
                QA: Market already-owned (heart)
              </button>
              <button
                type="button"
                className="island-run-prototype__debug-btn"
                onClick={() => window.__islandRunMarketDebugResetState?.()}
              >
                QA: Market reset marker baseline
              </button>
              <p className="island-run-prototype__landing island-run-prototype__qa-note" role="note">
                Market debug helpers: <code>window.__islandRunMarketDebugExportMarkers()</code> ·{' '}
                <code>window.__islandRunMarketDebugResetState()</code> ·{' '}
                <code>window.__islandRunMarketDebugAssertStatusCoverage()</code>
              </p>
            </div>
          )}
          {dailyRewardPlan.source === 'spin_of_the_day' && (
            <button
              type="button"
              className="island-run-prototype__booster-btn"
              onClick={() => void handleClaimDailyHearts('spin_of_the_day')}
              disabled={!hasHydratedRuntimeState || dailyHeartsClaimed}
            >
              {dailyHeartsClaimed ? 'Spin reward claimed' : `Spin of the Day (+${dailyRewardPlan.hearts} hearts)`}
            </button>
          )}

          {hearts < 1 && dicePool < 1 && (
            <button
              type="button"
              className="island-run-prototype__booster-btn"
              onClick={() => {
                setBoosterError(null);
                setShowOnboardingBooster(true);
              }}
              disabled={isDisplayNameLoopCompleted}
            >
              {isDisplayNameLoopCompleted ? 'Onboarding booster used' : 'Use onboarding booster (+1 heart)'}
            </button>
          )}
        </div>
      </header>

      <div ref={boardRef} className={`island-run-board island-run-board--framed island-run-board--focus island-run-board--scene-${activeScene}`}>
        <canvas ref={canvasRef} className="island-run-board__path" />

        <div className="island-run-board__lap-label">17-tile lap</div>

        <div className="island-run-board__orbit-stops">
          {orbitStopVisuals.map((stopVisual) => (
            <button
              key={stopVisual.id}
              type="button"
              className={`island-orbit-stop island-orbit-stop--${stopVisual.state} island-orbit-stop--scene-${activeScene} ${
                stopVisual.stopId && stopVisual.stopId === activeStopId ? 'island-orbit-stop--selected' : ''
              }`}
              style={{ left: stopVisual.x, top: stopVisual.y }}
              onClick={() => {
                if (stopVisual.stopId) setActiveStopId(stopVisual.stopId);
              }}
              disabled={!stopVisual.stopId}
            >
              <span className="island-orbit-stop__icon" aria-hidden="true">{stopVisual.icon}</span>
              <span
                className="island-orbit-stop__label"
                style={{ transform: `translate(-50%, calc(-50% + ${stopVisual.labelOffsetY}px))` }}
                title={stopVisual.label}
              >
                {stopVisual.label}
              </span>
            </button>
          ))}
        </div>

        <div className="island-run-board__tiles">
          {TILE_ANCHORS.map((anchor, index) => {
            const position = toScreen(anchor, boardSize.width, boardSize.height);
            const isStop = stopMap.has(index);
            const isEncounter = index === ENCOUNTER_TILE_INDEX;

            return (
              <div
                key={anchor.id}
                className={`island-tile island-tile--${anchor.zBand} ${isStop ? 'island-tile--stop' : ''} ${isEncounter ? 'island-tile--encounter' : ''} ${
                  index === tokenIndex ? 'island-tile--token-current' : ''
                }`}
                style={{
                  left: position.x,
                  top: position.y,
                  transform: `translate(-50%, -50%) scale(${anchor.scale})`,
                }}
              >
                <span className="island-tile__value">{isEncounter ? '⚔️' : index + 1}</span>
                {showDebug && <small className="island-tile__anchor-id">{anchor.id}</small>}
              </div>
            );
          })}

          <div
            className={`island-token ${isRolling ? 'island-token--moving' : ''}`}
            style={{
              left: tokenPosition.x,
              top: tokenPosition.y,
            }}
          >
            🚀
          </div>
        </div>

        <img
          className="island-run-board__depth-mask"
          src={`/assets/islands/depth/depth_mask_00${activeScene}.svg`}
          alt=""
          aria-hidden="true"
        />

        {showDebug && (
          <svg className="island-debug-overlay" viewBox={`0 0 ${boardSize.width} ${boardSize.height}`}>
            {TILE_ANCHORS.map((anchor, index) => {
              const position = toScreen(anchor, boardSize.width, boardSize.height);
              const tangentLength = 28;
              const tangentX = position.x + Math.cos((anchor.tangentDeg * Math.PI) / 180) * tangentLength;
              const tangentY = position.y + Math.sin((anchor.tangentDeg * Math.PI) / 180) * tangentLength;

              return (
                <g key={`${anchor.id}_debug`}>
                  <circle cx={position.x} cy={position.y} r="17" fill="none" stroke={ZBAND_COLORS[anchor.zBand]} strokeWidth="2" />
                  <line x1={position.x} y1={position.y} x2={tangentX} y2={tangentY} stroke={ZBAND_COLORS[anchor.zBand]} strokeWidth="2" />
                  <text x={position.x + 10} y={position.y - 12} fill="#fff" fontSize="10">#{index}</text>
                  {stopMap.has(index) && (
                    <text x={position.x + 10} y={position.y + 18} fill="#9ef0ff" fontSize="10">
                      {stopMap.get(index)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>


      {showFirstRunCelebration && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--onboarding" role="dialog" aria-modal="true" aria-label="First run celebration">
            {firstRunStep === 'celebration' ? (
              <>
                <div className="island-stop-modal__context">
                  <p className="island-stop-modal__eyebrow">First-run setup</p>
                  <h3 className="island-stop-modal__title">🎉 Welcome to Island Run</h3>
                  <p className="island-stop-modal__copy">Claim your starter gifts to begin your first island.</p>
                  <p><strong>Starter gifts:</strong> 💎 1 equivalent + 🪙 250 + ❤️ 5</p>
                  <p>✨ 🎊 ✨</p>
                </div>
                <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
                  <button
                    type="button"
                    className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action"
                    onClick={() => void handleClaimFirstRunRewards()}
                    disabled={isPersistingFirstRunCompletion}
                  >
                    Claim starter gifts
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="island-stop-modal__context">
                  <p className="island-stop-modal__eyebrow">Launch confirmation</p>
                  <h3 className="island-stop-modal__title">🚀 Launch sequence ready</h3>
                  <p className="island-stop-modal__copy">Your ship is landing on Island 1. Your player piece deploys at the first stop.</p>
                  <p className="island-stop-modal__copy">Tip: spend dice to move tile-to-tile and complete all stops before boss.</p>
                </div>
                <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
                  <button
                    type="button"
                    className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action"
                    onClick={() => void handleClaimFirstRunRewards()}
                    disabled={isPersistingFirstRunCompletion}
                  >
                    {isPersistingFirstRunCompletion ? 'Saving profile...' : 'Start Island Run'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showTravelOverlay && (
        <div className="island-travel-overlay" role="status" aria-live="polite">
          <div className="island-travel-overlay__card">
            <p className="island-travel-overlay__eyebrow">Island transfer</p>
            <p className="island-travel-overlay__title island-travel-overlay__title--headline">✈️ Traveling to Island {islandNumber + 1}...</p>
            <p className="island-travel-overlay__subtitle island-travel-overlay__copy island-travel-overlay__copy--long">Preparing route, rewards, and stop plan.</p>
          </div>
        </div>
      )}

      {activeStop?.stopId === 'market' && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--market" role="dialog" aria-modal="true" aria-label="Market stop prototype">
            <h3 className="island-stop-modal__title">🛒 Market Stop</h3>
            <p>Prototype purchase modal: preview starter store actions before the full Market slice.</p>
            <p><strong>Status:</strong> {stopStateMap.get(activeStop.stopId) ?? 'active'}</p>
            <div className="island-hatchery-card">
              <p>Available prototype offers:</p>
              <div className="island-hatchery-card__actions">
                <button
                  type="button"
                  onClick={() => handleMarketPrototypePurchase('dice_bundle')}
                  disabled={marketOwnedBundles.dice_bundle}
                >
                  {marketOwnedBundles.dice_bundle
                    ? 'Dice Bundle Owned'
                    : `Buy Dice Bundle (-${MARKET_DICE_BUNDLE_COST} coins, +${MARKET_DICE_BUNDLE_REWARD} dice)`}
                </button>
                <button
                  type="button"
                  onClick={() => handleMarketPrototypePurchase('heart_bundle')}
                  disabled={marketOwnedBundles.heart_bundle}
                >
                  {marketOwnedBundles.heart_bundle
                    ? 'Heart Bundle Owned'
                    : `Buy Heart Bundle (-${MARKET_HEART_BUNDLE_COST} coins, +1 heart)`}
                </button>
              </div>
            </div>
            <p>Coins balance: <strong>{coins}</strong></p>
            <p>Owned bundles: <strong>{[marketOwnedBundles.dice_bundle ? 'dice' : null, marketOwnedBundles.heart_bundle ? 'heart' : null].filter(Boolean).join(', ') || 'none'}</strong></p>
            {marketPurchaseFeedback ? <p>{marketPurchaseFeedback}</p> : null}
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleCompleteActiveStop}>
                Complete Market Stop
              </button>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => {
                  setMarketPurchaseFeedback(null);
                  setActiveStopId(null);
                }}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {activeStop && activeStop.stopId !== 'market' && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label={activeStop.title}>
            <h3 className="island-stop-modal__title">{activeStop.title}</h3>
            <p>{activeStop.description}</p>
            <p><strong>Status:</strong> {stopStateMap.get(activeStop.stopId) ?? 'active'}</p>
            {activeStop.isBehaviorStop ? <p><strong>Behavior stop:</strong> yes (habit/check-in/reflection)</p> : null}

            {activeStopId === 'hatchery' && (
              <div className="island-hatchery-card">
                {!activeEgg ? (
                  <>
                    <p>No active island egg. Set one:</p>
                    <div className="island-hatchery-card__actions">
                      <button type="button" onClick={() => handleSetEgg('common')}>Set Common Egg</button>
                      <button type="button" onClick={() => handleSetEgg('rare')}>Set Rare Egg</button>
                      <button type="button" onClick={() => handleSetEgg('mythic')}>Set Mythic Egg</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>Tier: <strong>{activeEgg.tier}</strong></p>
                    <p>Stage: <strong>{eggStage} / 4</strong></p>
                    <p>{eggStage >= 4 ? 'Ready to open (prototype).' : `Hatches in ${formatClock(eggRemainingSec)}`}</p>
                    <div className="island-hatchery-card__actions">
                      <button type="button" onClick={() => setActiveEgg(null)}>
                        {eggStage >= 4 ? 'Open Egg (stub)' : 'Clear Egg (dev)'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeStopId === 'hatchery' && dailyRewardPlan.source === 'daily_hatch' ? (
              <button
                type="button"
                onClick={() => void handleClaimDailyHearts('daily_hatch')}
                disabled={!hasHydratedRuntimeState || dailyHeartsClaimed}
              >
                {dailyHeartsClaimed ? 'Daily hatch hearts claimed' : `Claim Daily Hatch (+${dailyRewardPlan.hearts} hearts)`}
              </button>
            ) : null}

            {activeStop.stopId === 'boss' ? (
              <div className="island-hatchery-card">
                <p>
                  Trial objective: lock focus for one short burst, then confirm mission integrity.
                </p>
                <p>
                  {bossTrialResolved
                    ? `Reward granted. ${bossRewardSummary ?? ''}`
                    : `Resolve to earn +${BOSS_TRIAL_REWARD_HEARTS} hearts and +${BOSS_TRIAL_REWARD_COINS} coins.`}
                </p>
                {!bossTrialResolved ? (
                  <button type="button" onClick={handleResolveBossTrial}>Resolve Boss Trial</button>
                ) : null}
              </div>
            ) : null}

            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              {activeStop.stopId !== 'hatchery' && activeStop.stopId !== 'boss' ? (
                <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleCompleteActiveStop}>
                  Complete Stop
                </button>
              ) : null}
              {activeStop.stopId === 'hatchery' ? (
                <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleCompleteActiveStop}>
                  Complete Hatchery Stop
                </button>
              ) : null}
              {activeStop.stopId === 'boss' ? (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                  onClick={handleCompleteActiveStop}
                  disabled={!bossTrialResolved}
                >
                  Claim Island Clear
                </button>
              ) : null}
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setActiveStopId(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}


      {showEncounterModal && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Encounter tile challenge">
            <h3 className="island-stop-modal__title">⚔️ Encounter Tile</h3>
            <p>Easy challenge stub: steady your path and claim a small reward.</p>
            <div className="island-hatchery-card">
              <p>{encounterResolved ? 'Reward granted: +1 heart.' : 'Resolve this encounter to gain +1 heart.'}</p>
            </div>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              {!encounterResolved ? (
                <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleResolveEncounter}>
                  Resolve Encounter
                </button>
              ) : null}
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setShowEncounterModal(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {showOnboardingBooster && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--onboarding" role="dialog" aria-modal="true" aria-label="Game of Life onboarding booster">
            <div className="gol-onboarding__header-row">
              <span className="gol-onboarding__step">Loop 1 of 21</span>
              <button type="button" className="gol-onboarding__close" onClick={() => setShowOnboardingBooster(false)}>
                Close
              </button>
            </div>
            <p className="gol-onboarding__eyebrow">Game of Life 2.0 onboarding</p>
            <h3>Claim your player name</h3>
            <p>Step into Game of Life 2.0 with a display name that makes every win feel personal.</p>
            <div className="gol-onboarding__progress">
              <span>Progress</span>
              <div className="gol-onboarding__progress-bar" aria-hidden="true">
                <span style={{ width: `${(1 / 21) * 100}%` }} />
              </div>
              <span>1/21</span>
            </div>
            <label className="supabase-auth__field">
              <span>Display name</span>
              <input
                type="text"
                value={boosterName}
                onChange={(event) => setBoosterName(event.target.value)}
                placeholder={session.user.email ?? 'you@example.com'}
              />
            </label>
            {boosterError && <p className="island-run-prototype__error">{boosterError}</p>}
            <div className="gol-onboarding__actions">
              <button type="button" className="supabase-auth__action" onClick={handleClaimOnboardingBooster}>
                Save name & continue
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
