import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIslandNarrativeDefinition } from './islandNarrativeRegistry';
import type { IslandNarrativeBeat } from './islandNarrativeTypes';
import {
  type IslandNarrativeSeenState,
  mergeIslandNarrativeSeenState,
} from './islandNarrativeSeenState';
import {
  type IslandNarrativeReactionSnapshot,
  type ReactionDialoguePayload,
  type ReactionToastPayload,
  buildReactionDialogue,
  buildReactionToast,
  diffIslandNarrativeReactionTriggers,
  islandHasReactionBeats,
  reactionBeatPriorityRank,
  resolveReactionBeat,
} from './islandNarrativeReactionDispatch';

export type ActiveIslandStoryEpisode = {
  kind: 'global_prologue' | 'island_arrival' | 'island_resolution';
  manifestPath: string;
} | null;

export type ActiveIslandNarrativeDialogue = {
  beatId: 'I001-B03' | 'I001-B04' | 'I001-B26' | 'I001-B30';
  speakerName: 'Miri' | 'Poko' | 'Elder Sava';
  text: string;
  secondaryText?: string;
  continueLabel: string;
  tone?: 'standard' | 'wisdom' | 'guardian';
} | null;

type OpeningBeatId = 'I001-B02' | 'I001-B03' | 'I001-B04';
type AmbientBeatId = 'I001-B24';
type BossEligibleBeatId = 'I001-B26';
type BossResolutionBeatId = 'I001-B29';
type TravelReadyClosingBeatId = 'I001-B30';
export type IslandNarrativeControllerBeatId = OpeningBeatId | AmbientBeatId | BossEligibleBeatId | BossResolutionBeatId | TravelReadyClosingBeatId;

export type ActiveIslandNarrativeToast = {
  beatId: AmbientBeatId;
  speakerName: 'Miri';
  text: string;
  supportingLabel: string;
  durationMs: number;
} | null;

type SeenState = IslandNarrativeSeenState;

export type IslandNarrativeOpeningFlowInput = {
  userId?: string | null;
  currentIslandNumber: number;
  cycleIndex: number;
  hasHydratedRuntimeState: boolean;
  isGlobalPrologueActive: boolean;
  isGlobalPrologueSeen: boolean;
  isNarrativeSurfaceBlocked: boolean;
  canDisplayTravelReadyClosingOverClaimedCelebration: boolean;
  activeStopId: string | null;
  hatcheryBuildLevel: number | null | undefined;
  /**
   * Build level (0..3) per stop, indexed by canonical stop order
   * (hatchery, habit, mystery, wisdom, boss). Drives the data-driven reaction
   * beats (stop completions, landmark level reactions, majority-restored).
   */
  landmarkBuildLevels?: readonly number[];
  /** Stop ids whose objective is complete on the current island. */
  completedStopIds?: readonly string[];
  /** True while the boss trial is actively in progress (boss-challenge framing). */
  bossChallengeActive?: boolean;
  /** True once the in-progress boss trial reaches its halfway score (midpoint reveal). */
  bossChallengeMidpoint?: boolean;
  canChallengeCurrentBoss: boolean;
  isCurrentIslandBossDefeated: boolean;
  bossTrialResolvedIslandNumber: number | null | undefined;
  isIslandClearTravelReady: boolean;
  activeStoryEpisode: ActiveIslandStoryEpisode;
  setActiveStoryEpisode: (episode: ActiveIslandStoryEpisode) => void;
  /**
   * Canonical cross-device seen-ledger from the runtime record. Unioned with
   * the local (localStorage) ledger so a beat seen on another device stays
   * suppressed here.
   */
  persistedNarrativeSeenState?: IslandNarrativeSeenState | null;
  /**
   * Persist the (local) seen-ledger to the canonical record. The board wires
   * this to the canonical seen-state action so story memory follows the player
   * across devices. The hook itself stays free of gameplay/persistence imports.
   */
  onPersistNarrativeSeen?: (next: IslandNarrativeSeenState) => void;
};

export const ISLAND_001_NARRATIVE_SEEN_BEATS = {
  arrival: 'I001-B02',
  miriFirstObjective: 'I001-B03',
  pokoHatcheryIntro: 'I001-B04',
  hatcheryLevel1Restoration: 'I001-B24',
  finaleSetup: 'I001-B26',
  bossResolution: 'I001-B29',
  travelReadyClosing: 'I001-B30',
} as const;

const ISLAND_001_ARRIVAL_EPISODE_ID = 'island_1_arrival';
const ISLAND_001_ARRIVAL_MANIFEST_PATH = '/islands/001/story/arrival/manifest.json';
const ISLAND_001_RESOLUTION_EPISODE_ID = 'island_1_resolution';
const ISLAND_001_RESOLUTION_MANIFEST_PATH = '/islands/001/story/resolution/manifest.json';
const QUEUE_PRIORITY: Record<IslandNarrativeControllerBeatId, number> = { 'I001-B02': 0, 'I001-B03': 1, 'I001-B04': 2, 'I001-B26': 3, 'I001-B29': 3, 'I001-B30': 4, 'I001-B24': 5 };
const HATCHERY_LEVEL_1_TOAST_DURATION_MS = 3600;

export function getIslandNarrativeSeenStorageKey(userId?: string | null): string {
  return `island_run_narrative_seen_v1_${userId || 'anonymous'}_island_1`;
}

export function parseIslandNarrativeSeenState(raw: string | null): SeenState {
  if (!raw) return { beats: {}, episodes: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<SeenState> | null;
    const beats = parsed && typeof parsed === 'object' && parsed.beats && typeof parsed.beats === 'object' ? parsed.beats : {};
    const episodes = parsed && typeof parsed === 'object' && parsed.episodes && typeof parsed.episodes === 'object' ? parsed.episodes : {};
    return { beats: { ...beats }, episodes: { ...episodes } };
  } catch {
    return { beats: {}, episodes: {} };
  }
}

function readSeenState(storageKey: string): SeenState {
  if (typeof window === 'undefined') return { beats: {}, episodes: {} };
  try {
    return parseIslandNarrativeSeenState(window.localStorage.getItem(storageKey));
  } catch {
    return { beats: {}, episodes: {} };
  }
}

function writeSeenState(storageKey: string, state: SeenState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Non-critical local suppression only. In-memory guards still prevent loops.
  }
}

export function isEligibleForIsland001OpeningFlow(currentIslandNumber: number, cycleIndex: number): boolean {
  return currentIslandNumber === 1 && cycleIndex === 0;
}

function isOpeningBeatId(beatId: string): beatId is OpeningBeatId {
  return beatId === 'I001-B02' || beatId === 'I001-B03' || beatId === 'I001-B04';
}

function getIsland001Beat(beatId: IslandNarrativeControllerBeatId): IslandNarrativeBeat | null {
  return getIslandNarrativeDefinition(1)?.beats.find((beat) => beat.id === beatId) ?? null;
}

function getOpeningBeat(beatId: OpeningBeatId): IslandNarrativeBeat | null {
  return getIsland001Beat(beatId);
}

export function didHatcheryReachLevelOne(previousBuildLevel: number | null | undefined, currentBuildLevel: number | null | undefined): boolean {
  return typeof previousBuildLevel === 'number' && previousBuildLevel < 1 && typeof currentBuildLevel === 'number' && currentBuildLevel >= 1;
}

function getToastForBeat(beatId: AmbientBeatId): ActiveIslandNarrativeToast {
  const beat = getIsland001Beat(beatId);
  if (beatId === 'I001-B24' && beat?.surface === 'toast' && beat.text === 'The island noticed.') {
    return { beatId, speakerName: 'Miri', text: beat.text, supportingLabel: 'Hatchery restored to Level 1', durationMs: HATCHERY_LEVEL_1_TOAST_DURATION_MS };
  }
  return null;
}

function getDialogueForBeat(beatId: OpeningBeatId | BossEligibleBeatId | TravelReadyClosingBeatId): ActiveIslandNarrativeDialogue | null {
  const beat = getIsland001Beat(beatId);
  if (!beat || beat.surface !== 'dialogue_sheet' || !beat.text) return null;
  if (beatId === 'I001-B03') {
    return { beatId, speakerName: 'Miri', text: beat.text, continueLabel: 'Return to the island' };
  }
  if (beatId === 'I001-B04') {
    return { beatId, speakerName: 'Poko', text: beat.text, continueLabel: 'Return to the island' };
  }
  if (beatId === 'I001-B26') {
    return {
      beatId,
      speakerName: 'Elder Sava',
      text: beat.text,
      secondaryText: beat.secondaryText,
      continueLabel: 'Face Noctyra',
      tone: 'wisdom',
    };
  }
  if (beatId === 'I001-B30') {
    return {
      beatId,
      speakerName: 'Miri',
      text: beat.text,
      continueLabel: beat.displayCtaText ?? 'Follow the restored route',
      tone: 'standard',
    };
  }
  return null;
}

export function didIslandClearTravelReadyTransition(previous: boolean | null, current: boolean): boolean {
  return previous === false && current;
}

export function isNarrativeSurfaceBlockingBeat(
  beatId: IslandNarrativeControllerBeatId | undefined,
  isNarrativeSurfaceBlocked: boolean,
  canDisplayTravelReadyClosingOverClaimedCelebration: boolean,
): boolean {
  if (!isNarrativeSurfaceBlocked) return false;
  return beatId !== 'I001-B30' || !canDisplayTravelReadyClosingOverClaimedCelebration;
}

export function useIslandNarrativeOpeningFlow({
  userId,
  currentIslandNumber,
  cycleIndex,
  hasHydratedRuntimeState,
  isGlobalPrologueActive,
  isGlobalPrologueSeen,
  isNarrativeSurfaceBlocked,
  canDisplayTravelReadyClosingOverClaimedCelebration,
  activeStopId,
  hatcheryBuildLevel,
  landmarkBuildLevels,
  completedStopIds,
  bossChallengeActive,
  bossChallengeMidpoint,
  canChallengeCurrentBoss,
  isCurrentIslandBossDefeated,
  bossTrialResolvedIslandNumber,
  isIslandClearTravelReady,
  activeStoryEpisode,
  setActiveStoryEpisode,
  persistedNarrativeSeenState,
  onPersistNarrativeSeen,
}: IslandNarrativeOpeningFlowInput) {
  const storageKey = useMemo(() => getIslandNarrativeSeenStorageKey(userId), [userId]);
  const [queue, setQueue] = useState<IslandNarrativeControllerBeatId[]>([]);
  const [activeDialogue, setActiveDialogue] = useState<ActiveIslandNarrativeDialogue>(null);
  const [activeToast, setActiveToast] = useState<ActiveIslandNarrativeToast>(null);
  // Data-driven "reaction" layer (additive; legacy beats above are untouched).
  const [reactionQueue, setReactionQueue] = useState<string[]>([]);
  const [activeReactionDialogue, setActiveReactionDialogue] = useState<ReactionDialoguePayload | null>(null);
  const [activeReactionToast, setActiveReactionToast] = useState<ReactionToastPayload | null>(null);
  const previousReactionSnapshotRef = useRef<IslandNarrativeReactionSnapshot | null>(null);
  const previousBossChallengeActiveRef = useRef<boolean | null>(null);
  const sessionDisplayedRef = useRef<Set<string>>(new Set());
  const previousActiveStopIdRef = useRef<string | null>(null);
  const previousHatcheryBuildLevelRef = useRef<number | null>(null);
  const previousCanChallengeBossRef = useRef<boolean | null>(null);
  const previousIsland1BossResolvedRef = useRef<boolean | null>(null);
  const previousIslandClearTravelReadyRef = useRef<boolean | null>(null);
  const storyReaderClosingRef = useRef(false);
  const seenStateRef = useRef<SeenState>({ beats: {}, episodes: {} });

  useEffect(() => {
    seenStateRef.current = readSeenState(storageKey);
    setQueue([]);
    setActiveDialogue(null);
    setActiveToast(null);
    setReactionQueue([]);
    setActiveReactionDialogue(null);
    setActiveReactionToast(null);
    previousReactionSnapshotRef.current = null;
    previousBossChallengeActiveRef.current = null;
    previousHatcheryBuildLevelRef.current = null;
    previousCanChallengeBossRef.current = null;
    previousIsland1BossResolvedRef.current = null;
    previousIslandClearTravelReadyRef.current = null;
    sessionDisplayedRef.current = new Set();
  }, [storageKey]);

  const isEligible = hasHydratedRuntimeState && isEligibleForIsland001OpeningFlow(currentIslandNumber, cycleIndex);
  // The legacy opening flow (prologue/arrival/finale/travel) is Island 1 only.
  // The reaction layer is island-agnostic: it runs on any first-cycle island that
  // has authored reaction beats (today, still only Island 1 — but content-driven).
  const reactionEligible = hasHydratedRuntimeState && cycleIndex === 0 && islandHasReactionBeats(currentIslandNumber);

  useEffect(() => {
    if (isEligible) return;
    setQueue((current) => current.filter((beatId) => beatId !== 'I001-B26' && beatId !== 'I001-B29' && beatId !== 'I001-B30'));
  }, [isEligible]);

  // Drop reaction state when the island/cycle leaves reaction scope.
  useEffect(() => {
    if (reactionEligible) return;
    setReactionQueue([]);
    setActiveReactionDialogue(null);
    setActiveReactionToast(null);
    previousReactionSnapshotRef.current = null;
  }, [reactionEligible]);

  const isSeen = useCallback((beatId: string) => {
    const seen = seenStateRef.current;
    if (seen.beats[beatId]) return true;
    if (beatId === 'I001-B02' && seen.episodes[ISLAND_001_ARRIVAL_EPISODE_ID]) return true;
    if (beatId === 'I001-B29' && seen.episodes[ISLAND_001_RESOLUTION_EPISODE_ID]) return true;
    return sessionDisplayedRef.current.has(beatId);
  }, []);

  const markSeen = useCallback((beatId: string) => {
    const now = Date.now();
    sessionDisplayedRef.current.add(beatId);
    const next: SeenState = {
      beats: { ...seenStateRef.current.beats, [beatId]: now },
      episodes: { ...seenStateRef.current.episodes },
    };
    if (beatId === 'I001-B02') {
      next.episodes[ISLAND_001_ARRIVAL_EPISODE_ID] = now;
    }
    if (beatId === 'I001-B29') {
      next.episodes[ISLAND_001_RESOLUTION_EPISODE_ID] = now;
    }
    seenStateRef.current = next;
    writeSeenState(storageKey, next);
    // Mirror to the canonical record so story memory follows the player across
    // devices. Local write above keeps the offline-immediate guarantee.
    onPersistNarrativeSeen?.(next);
  }, [storageKey, onPersistNarrativeSeen]);

  const enqueueBeat = useCallback((beatId: IslandNarrativeControllerBeatId) => {
    if (!isEligible || isSeen(beatId)) return;
    setQueue((current) => {
      if (current.includes(beatId)) return current;
      return [...current, beatId].sort((a, b) => QUEUE_PRIORITY[a] - QUEUE_PRIORITY[b]);
    });
  }, [isEligible, isSeen]);

  // Cross-device merge: when the canonical seen-ledger hydrates or updates from
  // another device, union it into the local ref, mirror to localStorage, and
  // drop any now-seen beats still waiting in the queue.
  useEffect(() => {
    if (!persistedNarrativeSeenState) return;
    const merged = mergeIslandNarrativeSeenState(seenStateRef.current, persistedNarrativeSeenState);
    seenStateRef.current = merged;
    writeSeenState(storageKey, merged);
    setQueue((current) => current.filter((beatId) => !isSeen(beatId)));
    setReactionQueue((current) => current.filter((beatId) => !isSeen(beatId)));
  }, [persistedNarrativeSeenState, storageKey, isSeen]);

  useEffect(() => {
    if (!isEligible || !isGlobalPrologueSeen || isGlobalPrologueActive) return;
    if (!isSeen('I001-B02')) {
      enqueueBeat('I001-B02');
      return;
    }
    if (!isSeen('I001-B03')) {
      enqueueBeat('I001-B03');
    }
  }, [enqueueBeat, isEligible, isGlobalPrologueActive, isGlobalPrologueSeen, isSeen]);

  useEffect(() => {
    const previous = previousActiveStopIdRef.current;
    previousActiveStopIdRef.current = activeStopId;
    if (!isEligible || previous === activeStopId || activeStopId !== 'hatchery') return;
    enqueueBeat('I001-B04');
  }, [activeStopId, enqueueBeat, isEligible]);


  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      previousHatcheryBuildLevelRef.current = null;
      return;
    }

    const previous = previousHatcheryBuildLevelRef.current;
    const current = typeof hatcheryBuildLevel === 'number' ? hatcheryBuildLevel : null;
    previousHatcheryBuildLevelRef.current = current;

    // Hydration/old-save rule: seed the baseline on first hydrated observation,
    // but do not emit a stale catch-up reaction for saves already at Level 1+.
    if (previous === null) return;
    if (!isEligible || !didHatcheryReachLevelOne(previous, current)) return;
    enqueueBeat('I001-B24');
  }, [enqueueBeat, hasHydratedRuntimeState, hatcheryBuildLevel, isEligible]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      previousCanChallengeBossRef.current = null;
      return;
    }

    const previous = previousCanChallengeBossRef.current;
    const current = Boolean(canChallengeCurrentBoss);
    previousCanChallengeBossRef.current = current;

    // Hydration/old-save rule for I001-B26: the first hydrated canonical
    // canChallengeCurrentBoss value is only a baseline. Queue the finale setup
    // solely for a live false -> true transition observed in this session.
    if (previous === null) return;
    if (!isEligible || isCurrentIslandBossDefeated || previous || !current) return;
    enqueueBeat('I001-B26');
  }, [canChallengeCurrentBoss, enqueueBeat, hasHydratedRuntimeState, isCurrentIslandBossDefeated, isEligible]);


  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      previousIsland1BossResolvedRef.current = null;
      return;
    }

    // Hydration/old-save rule for I001-B29: the canonical baseline is the
    // persisted bossTrialResolvedIslandNumber marker. The first hydrated
    // observation seeds this ref only; stale saves already resolved for Island 1
    // do not auto-play the resolution episode.
    const previous = previousIsland1BossResolvedRef.current;
    const current = bossTrialResolvedIslandNumber === 1;
    previousIsland1BossResolvedRef.current = current;

    if (previous === null) return;
    if (!isEligible || previous || !current || currentIslandNumber !== 1 || cycleIndex !== 0) return;
    setQueue((queued) => queued.filter((beatId) => beatId !== 'I001-B26'));
    enqueueBeat('I001-B29');
  }, [bossTrialResolvedIslandNumber, currentIslandNumber, cycleIndex, enqueueBeat, hasHydratedRuntimeState, isEligible]);



  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      previousIslandClearTravelReadyRef.current = null;
      return;
    }

    // Hydration/old-save rule for I001-B30: seed the first hydrated
    // travel-ready value as a baseline. Only a live false -> true transition
    // queues the closing dialogue, but the queued beat may wait behind B29 and
    // gameplay blockers without being lost.
    const previous = previousIslandClearTravelReadyRef.current;
    const current = Boolean(isIslandClearTravelReady);
    previousIslandClearTravelReadyRef.current = current;

    if (previous === null) return;
    if (!isEligible || !didIslandClearTravelReadyTransition(previous, current) || currentIslandNumber !== 1 || cycleIndex !== 0) return;
    enqueueBeat('I001-B30');
  }, [currentIslandNumber, cycleIndex, enqueueBeat, hasHydratedRuntimeState, isEligible, isIslandClearTravelReady]);

  useEffect(() => {
    if (activeStoryEpisode) return;
    if (!storyReaderClosingRef.current) return;
    storyReaderClosingRef.current = false;
  }, [activeStoryEpisode]);

  useEffect(() => {
    if (!isEligible || activeStoryEpisode || activeDialogue || activeToast || isGlobalPrologueActive || storyReaderClosingRef.current) return;
    const nextBeatId = queue[0];
    if (!nextBeatId) return;
    if (isNarrativeSurfaceBlockingBeat(nextBeatId, isNarrativeSurfaceBlocked, canDisplayTravelReadyClosingOverClaimedCelebration)) return;
    if (isSeen(nextBeatId)) {
      setQueue((current) => current.slice(1));
      return;
    }

    if (nextBeatId === 'I001-B26' && (!canChallengeCurrentBoss || isCurrentIslandBossDefeated || currentIslandNumber !== 1 || cycleIndex !== 0)) {
      setQueue((current) => current.slice(1));
      return;
    }

    if (nextBeatId === 'I001-B30' && (!isIslandClearTravelReady || currentIslandNumber !== 1 || cycleIndex !== 0)) {
      setQueue((current) => current.slice(1));
      return;
    }

    if (nextBeatId === 'I001-B29') {
      const beat = getIsland001Beat(nextBeatId);
      if (beat?.surface !== 'story_reader' || beat.episodePath !== ISLAND_001_RESOLUTION_MANIFEST_PATH || bossTrialResolvedIslandNumber !== 1 || currentIslandNumber !== 1 || cycleIndex !== 0) {
        setQueue((current) => current.slice(1));
        return;
      }
      sessionDisplayedRef.current.add(nextBeatId);
      setQueue((current) => current.slice(1));
      setActiveStoryEpisode({ kind: 'island_resolution', manifestPath: ISLAND_001_RESOLUTION_MANIFEST_PATH });
      return;
    }

    if (nextBeatId === 'I001-B24') {
      const toast = getToastForBeat(nextBeatId);
      if (!toast) {
        setQueue((current) => current.slice(1));
        return;
      }
      sessionDisplayedRef.current.add(nextBeatId);
      setQueue((current) => current.slice(1));
      setActiveToast(toast);
      return;
    }

    if (nextBeatId !== 'I001-B26' && nextBeatId !== 'I001-B30' && !isOpeningBeatId(nextBeatId)) {
      setQueue((current) => current.slice(1));
      return;
    }

    if (nextBeatId === 'I001-B02') {
      const beat = getOpeningBeat(nextBeatId);
      if (beat?.surface !== 'story_reader' || beat.episodePath !== ISLAND_001_ARRIVAL_MANIFEST_PATH) {
        setQueue((current) => current.slice(1));
        return;
      }
      sessionDisplayedRef.current.add(nextBeatId);
      setQueue((current) => current.slice(1));
      setActiveStoryEpisode({ kind: 'island_arrival', manifestPath: ISLAND_001_ARRIVAL_MANIFEST_PATH });
      return;
    }

    const dialogue = getDialogueForBeat(nextBeatId);
    if (!dialogue) {
      setQueue((current) => current.slice(1));
      return;
    }
    sessionDisplayedRef.current.add(nextBeatId);
    setQueue((current) => current.slice(1));
    setActiveDialogue(dialogue);
  }, [activeDialogue, activeStoryEpisode, activeToast, canChallengeCurrentBoss, canDisplayTravelReadyClosingOverClaimedCelebration, currentIslandNumber, cycleIndex, isCurrentIslandBossDefeated, isEligible, isGlobalPrologueActive, isIslandClearTravelReady, isNarrativeSurfaceBlocked, isSeen, queue, setActiveStoryEpisode, bossTrialResolvedIslandNumber]);

  // --- Reaction layer (data-driven; stop/landmark/majority/boss-start beats) ---
  // Stable string keys keep the watcher from running on unrelated re-renders.
  const completedStopsKey = (completedStopIds ?? []).join(',');
  const landmarkLevelsKey = (landmarkBuildLevels ?? []).join(',');

  const reactionBeatRank = useCallback((beatId: string): number => {
    const beat = getIslandNarrativeDefinition(currentIslandNumber)?.beats.find((entry) => entry.id === beatId);
    return beat ? reactionBeatPriorityRank(beat) : 99;
  }, [currentIslandNumber]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      previousReactionSnapshotRef.current = null;
      return;
    }
    const nextSnapshot: IslandNarrativeReactionSnapshot = {
      activeStopId: activeStopId ?? null,
      completedStopIds: completedStopIds ?? [],
      landmarkBuildLevels: landmarkBuildLevels ?? [],
      bossChallengeActive: Boolean(bossChallengeActive),
      bossChallengeMidpoint: Boolean(bossChallengeMidpoint),
    };
    const previous = previousReactionSnapshotRef.current;
    previousReactionSnapshotRef.current = nextSnapshot;
    // Hydration baseline: the first hydrated snapshot seeds the ref only — never
    // replay reactions for progress an existing save already made.
    if (!reactionEligible || previous === null) return;

    const triggers = diffIslandNarrativeReactionTriggers(previous, nextSnapshot, currentIslandNumber);
    if (triggers.length === 0) return;

    const newBeatIds: string[] = [];
    for (const trigger of triggers) {
      const beat = resolveReactionBeat(trigger, currentIslandNumber);
      if (beat && !isSeen(beat.id) && !newBeatIds.includes(beat.id)) newBeatIds.push(beat.id);
    }
    if (newBeatIds.length === 0) return;

    setReactionQueue((current) => {
      const merged = [...current];
      for (const id of newBeatIds) if (!merged.includes(id)) merged.push(id);
      return merged.sort((a, b) => reactionBeatRank(a) - reactionBeatRank(b));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStopId, bossChallengeActive, bossChallengeMidpoint, completedStopsKey, landmarkLevelsKey, currentIslandNumber, hasHydratedRuntimeState, reactionEligible, isSeen, reactionBeatRank]);

  // Boss-framing reactions (B27 start / B28 midpoint) are moment-specific. If the
  // trial ends before they surface, drop them so they never appear post-fight.
  useEffect(() => {
    const previous = previousBossChallengeActiveRef.current;
    const active = Boolean(bossChallengeActive);
    previousBossChallengeActiveRef.current = active;
    if (previous && !active) {
      setReactionQueue((current) => current.filter((id) => id !== 'I001-B27' && id !== 'I001-B28'));
    }
  }, [bossChallengeActive]);

  // Reaction display — yields to every legacy surface and the legacy queue.
  // Exception: non-blocking toasts may overlay an in-progress boss trial so the
  // boss-framing beats land in the moment instead of after the fight.
  useEffect(() => {
    if (!reactionEligible) return;
    // Story reader, legacy surfaces, and the legacy queue always take priority.
    if (activeStoryEpisode || isGlobalPrologueActive) return;
    if (activeDialogue || activeToast || queue.length > 0) return;
    if (activeReactionDialogue || activeReactionToast) return;
    const nextId = reactionQueue[0];
    if (!nextId) return;
    if (isSeen(nextId)) {
      setReactionQueue((current) => current.slice(1));
      return;
    }
    const definition = getIslandNarrativeDefinition(currentIslandNumber) ?? null;
    const beat = definition?.beats.find((entry) => entry.id === nextId) ?? null;
    if (!beat) {
      setReactionQueue((current) => current.slice(1));
      return;
    }
    // Board modals block reactions — except a non-blocking toast may overlay an
    // in-progress boss trial (the boss-framing beats are meant for that moment).
    if (isNarrativeSurfaceBlocked) {
      const toastOverlayDuringBoss = Boolean(bossChallengeActive) && beat.surface === 'toast';
      if (!toastOverlayDuringBoss) return;
    }
    if (beat.surface === 'dialogue_sheet') {
      const dialogue = buildReactionDialogue(beat, definition);
      if (!dialogue) {
        setReactionQueue((current) => current.slice(1));
        return;
      }
      sessionDisplayedRef.current.add(nextId);
      setReactionQueue((current) => current.slice(1));
      setActiveReactionDialogue(dialogue);
      return;
    }
    if (beat.surface === 'toast') {
      const toast = buildReactionToast(beat, definition);
      if (!toast) {
        setReactionQueue((current) => current.slice(1));
        return;
      }
      sessionDisplayedRef.current.add(nextId);
      setReactionQueue((current) => current.slice(1));
      setActiveReactionToast(toast);
      return;
    }
    // Unsupported surface for a reaction (e.g. story_reader) — drop safely.
    setReactionQueue((current) => current.slice(1));
  }, [activeDialogue, activeReactionDialogue, activeReactionToast, activeStoryEpisode, activeToast, bossChallengeActive, currentIslandNumber, reactionEligible, isGlobalPrologueActive, isNarrativeSurfaceBlocked, isSeen, queue, reactionQueue]);

  const handleStoryEpisodeClosed = useCallback((episode: Exclude<ActiveIslandStoryEpisode, null>) => {
    if (episode.kind === 'island_arrival') {
      markSeen('I001-B02');
      storyReaderClosingRef.current = true;
      setActiveStoryEpisode(null);
      if (!isSeen('I001-B03')) {
        enqueueBeat('I001-B03');
      }
      return;
    }
    if (episode.kind === 'island_resolution') {
      markSeen('I001-B29');
      storyReaderClosingRef.current = true;
      setActiveStoryEpisode(null);
    }
  }, [enqueueBeat, isSeen, markSeen, setActiveStoryEpisode]);

  const handleDialogueContinue = useCallback(() => {
    if (!activeDialogue) return;
    markSeen(activeDialogue.beatId);
    setActiveDialogue(null);
  }, [activeDialogue, markSeen]);

  const handleDialogueClose = handleDialogueContinue;

  const handleToastDismiss = useCallback(() => {
    if (!activeToast) return;
    markSeen(activeToast.beatId);
    setActiveToast(null);
  }, [activeToast, markSeen]);

  const handleReactionDialogueContinue = useCallback(() => {
    if (!activeReactionDialogue) return;
    markSeen(activeReactionDialogue.beatId);
    setActiveReactionDialogue(null);
  }, [activeReactionDialogue, markSeen]);

  const handleReactionToastDismiss = useCallback(() => {
    if (!activeReactionToast) return;
    markSeen(activeReactionToast.beatId);
    setActiveReactionToast(null);
  }, [activeReactionToast, markSeen]);

  return {
    activeDialogue,
    activeToast,
    activeReactionDialogue,
    activeReactionToast,
    queuedBeatIds: queue,
    reactionQueuedBeatIds: reactionQueue,
    handleStoryEpisodeClosed,
    handleDialogueContinue,
    handleDialogueClose,
    handleToastDismiss,
    handleReactionDialogueContinue,
    handleReactionToastDismiss,
  };
}
