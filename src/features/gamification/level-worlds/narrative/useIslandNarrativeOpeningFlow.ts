import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIslandNarrativeDefinition } from './islandNarrativeRegistry';
import type { IslandNarrativeBeat } from './islandNarrativeTypes';

export type ActiveIslandStoryEpisode = {
  kind: 'global_prologue' | 'island_arrival' | 'island_resolution';
  manifestPath: string;
} | null;

export type ActiveIslandNarrativeDialogue = {
  beatId: 'I001-B03' | 'I001-B04' | 'I001-B26';
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
type IslandNarrativeControllerBeatId = OpeningBeatId | AmbientBeatId | BossEligibleBeatId | BossResolutionBeatId;

export type ActiveIslandNarrativeToast = {
  beatId: AmbientBeatId;
  speakerName: 'Miri';
  text: string;
  supportingLabel: string;
  durationMs: number;
} | null;

type SeenState = {
  beats: Record<string, number>;
  episodes: Record<string, number>;
};

export type IslandNarrativeOpeningFlowInput = {
  userId?: string | null;
  currentIslandNumber: number;
  cycleIndex: number;
  hasHydratedRuntimeState: boolean;
  isGlobalPrologueActive: boolean;
  isGlobalPrologueSeen: boolean;
  isNarrativeSurfaceBlocked: boolean;
  activeStopId: string | null;
  hatcheryBuildLevel: number | null | undefined;
  canChallengeCurrentBoss: boolean;
  isCurrentIslandBossDefeated: boolean;
  bossTrialResolvedIslandNumber: number | null | undefined;
  activeStoryEpisode: ActiveIslandStoryEpisode;
  setActiveStoryEpisode: (episode: ActiveIslandStoryEpisode) => void;
};

export const ISLAND_001_NARRATIVE_SEEN_BEATS = {
  arrival: 'I001-B02',
  miriFirstObjective: 'I001-B03',
  pokoHatcheryIntro: 'I001-B04',
  hatcheryLevel1Restoration: 'I001-B24',
  finaleSetup: 'I001-B26',
  bossResolution: 'I001-B29',
} as const;

const ISLAND_001_ARRIVAL_EPISODE_ID = 'island_1_arrival';
const ISLAND_001_ARRIVAL_MANIFEST_PATH = '/islands/001/story/arrival/manifest.json';
const ISLAND_001_RESOLUTION_EPISODE_ID = 'island_1_resolution';
const ISLAND_001_RESOLUTION_MANIFEST_PATH = '/islands/001/story/resolution/manifest.json';
const QUEUE_PRIORITY: Record<IslandNarrativeControllerBeatId, number> = { 'I001-B02': 0, 'I001-B03': 1, 'I001-B04': 2, 'I001-B26': 3, 'I001-B29': 3, 'I001-B24': 4 };
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

function getDialogueForBeat(beatId: OpeningBeatId | BossEligibleBeatId): ActiveIslandNarrativeDialogue | null {
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
  return null;
}

export function useIslandNarrativeOpeningFlow({
  userId,
  currentIslandNumber,
  cycleIndex,
  hasHydratedRuntimeState,
  isGlobalPrologueActive,
  isGlobalPrologueSeen,
  isNarrativeSurfaceBlocked,
  activeStopId,
  hatcheryBuildLevel,
  canChallengeCurrentBoss,
  isCurrentIslandBossDefeated,
  bossTrialResolvedIslandNumber,
  activeStoryEpisode,
  setActiveStoryEpisode,
}: IslandNarrativeOpeningFlowInput) {
  const storageKey = useMemo(() => getIslandNarrativeSeenStorageKey(userId), [userId]);
  const [queue, setQueue] = useState<IslandNarrativeControllerBeatId[]>([]);
  const [activeDialogue, setActiveDialogue] = useState<ActiveIslandNarrativeDialogue>(null);
  const [activeToast, setActiveToast] = useState<ActiveIslandNarrativeToast>(null);
  const sessionDisplayedRef = useRef<Set<string>>(new Set());
  const previousActiveStopIdRef = useRef<string | null>(null);
  const previousHatcheryBuildLevelRef = useRef<number | null>(null);
  const previousCanChallengeBossRef = useRef<boolean | null>(null);
  const previousIsland1BossResolvedRef = useRef<boolean | null>(null);
  const storyReaderClosingRef = useRef(false);
  const seenStateRef = useRef<SeenState>({ beats: {}, episodes: {} });

  useEffect(() => {
    seenStateRef.current = readSeenState(storageKey);
    setQueue([]);
    setActiveDialogue(null);
    setActiveToast(null);
    previousHatcheryBuildLevelRef.current = null;
    previousCanChallengeBossRef.current = null;
    previousIsland1BossResolvedRef.current = null;
    sessionDisplayedRef.current = new Set();
  }, [storageKey]);

  const isEligible = hasHydratedRuntimeState && isEligibleForIsland001OpeningFlow(currentIslandNumber, cycleIndex);

  useEffect(() => {
    if (isEligible) return;
    setQueue((current) => current.filter((beatId) => beatId !== 'I001-B26' && beatId !== 'I001-B29'));
  }, [isEligible]);

  const isSeen = useCallback((beatId: IslandNarrativeControllerBeatId) => {
    const seen = seenStateRef.current;
    if (seen.beats[beatId]) return true;
    if (beatId === 'I001-B02' && seen.episodes[ISLAND_001_ARRIVAL_EPISODE_ID]) return true;
    if (beatId === 'I001-B29' && seen.episodes[ISLAND_001_RESOLUTION_EPISODE_ID]) return true;
    return sessionDisplayedRef.current.has(beatId);
  }, []);

  const markSeen = useCallback((beatId: IslandNarrativeControllerBeatId) => {
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
  }, [storageKey]);

  const enqueueBeat = useCallback((beatId: IslandNarrativeControllerBeatId) => {
    if (!isEligible || isSeen(beatId)) return;
    setQueue((current) => {
      if (current.includes(beatId)) return current;
      return [...current, beatId].sort((a, b) => QUEUE_PRIORITY[a] - QUEUE_PRIORITY[b]);
    });
  }, [isEligible, isSeen]);

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
    if (activeStoryEpisode) return;
    if (!storyReaderClosingRef.current) return;
    storyReaderClosingRef.current = false;
  }, [activeStoryEpisode]);

  useEffect(() => {
    if (!isEligible || activeStoryEpisode || activeDialogue || activeToast || isGlobalPrologueActive || isNarrativeSurfaceBlocked || storyReaderClosingRef.current) return;
    const nextBeatId = queue[0];
    if (!nextBeatId) return;
    if (isSeen(nextBeatId)) {
      setQueue((current) => current.slice(1));
      return;
    }

    if (nextBeatId === 'I001-B26' && (!canChallengeCurrentBoss || isCurrentIslandBossDefeated || currentIslandNumber !== 1 || cycleIndex !== 0)) {
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

    if (nextBeatId !== 'I001-B26' && !isOpeningBeatId(nextBeatId)) {
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
  }, [activeDialogue, activeStoryEpisode, activeToast, canChallengeCurrentBoss, currentIslandNumber, cycleIndex, isCurrentIslandBossDefeated, isEligible, isGlobalPrologueActive, isNarrativeSurfaceBlocked, isSeen, queue, setActiveStoryEpisode, bossTrialResolvedIslandNumber]);

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

  return {
    activeDialogue,
    activeToast,
    queuedBeatIds: queue,
    handleStoryEpisodeClosed,
    handleDialogueContinue,
    handleDialogueClose,
    handleToastDismiss,
  };
}
