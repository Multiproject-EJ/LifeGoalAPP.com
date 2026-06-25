import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIslandNarrativeDefinition } from './islandNarrativeRegistry';
import type { IslandNarrativeBeat } from './islandNarrativeTypes';

export type ActiveIslandStoryEpisode = {
  kind: 'global_prologue' | 'island_arrival';
  manifestPath: string;
} | null;

export type ActiveIslandNarrativeDialogue = {
  beatId: 'I001-B03' | 'I001-B04';
  speakerName: 'Miri' | 'Poko';
  text: string;
  continueLabel: string;
} | null;

type OpeningBeatId = 'I001-B02' | 'I001-B03' | 'I001-B04';

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
  activeStoryEpisode: ActiveIslandStoryEpisode;
  setActiveStoryEpisode: (episode: ActiveIslandStoryEpisode) => void;
};

export const ISLAND_001_NARRATIVE_SEEN_BEATS = {
  arrival: 'I001-B02',
  miriFirstObjective: 'I001-B03',
  pokoHatcheryIntro: 'I001-B04',
} as const;

const ISLAND_001_ARRIVAL_EPISODE_ID = 'island_1_arrival';
const ISLAND_001_ARRIVAL_MANIFEST_PATH = '/islands/001/story/arrival/manifest.json';
const QUEUE_PRIORITY: Record<OpeningBeatId, number> = { 'I001-B02': 0, 'I001-B03': 1, 'I001-B04': 2 };

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

function getOpeningBeat(beatId: OpeningBeatId): IslandNarrativeBeat | null {
  return getIslandNarrativeDefinition(1)?.beats.find((beat) => beat.id === beatId) ?? null;
}

function getDialogueForBeat(beatId: OpeningBeatId): ActiveIslandNarrativeDialogue | null {
  const beat = getOpeningBeat(beatId);
  if (!beat || beat.surface !== 'dialogue_sheet' || !beat.text) return null;
  if (beatId === 'I001-B03') {
    return { beatId, speakerName: 'Miri', text: beat.text, continueLabel: 'Return to the island' };
  }
  if (beatId === 'I001-B04') {
    return { beatId, speakerName: 'Poko', text: beat.text, continueLabel: 'Return to the island' };
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
  activeStoryEpisode,
  setActiveStoryEpisode,
}: IslandNarrativeOpeningFlowInput) {
  const storageKey = useMemo(() => getIslandNarrativeSeenStorageKey(userId), [userId]);
  const [queue, setQueue] = useState<OpeningBeatId[]>([]);
  const [activeDialogue, setActiveDialogue] = useState<ActiveIslandNarrativeDialogue>(null);
  const sessionDisplayedRef = useRef<Set<string>>(new Set());
  const previousActiveStopIdRef = useRef<string | null>(null);
  const storyReaderClosingRef = useRef(false);
  const seenStateRef = useRef<SeenState>({ beats: {}, episodes: {} });

  useEffect(() => {
    seenStateRef.current = readSeenState(storageKey);
    setQueue([]);
    setActiveDialogue(null);
    sessionDisplayedRef.current = new Set();
  }, [storageKey]);

  const isEligible = hasHydratedRuntimeState && isEligibleForIsland001OpeningFlow(currentIslandNumber, cycleIndex);

  const isSeen = useCallback((beatId: OpeningBeatId) => {
    const seen = seenStateRef.current;
    if (seen.beats[beatId]) return true;
    if (beatId === 'I001-B02' && seen.episodes[ISLAND_001_ARRIVAL_EPISODE_ID]) return true;
    return sessionDisplayedRef.current.has(beatId);
  }, []);

  const markSeen = useCallback((beatId: OpeningBeatId) => {
    const now = Date.now();
    sessionDisplayedRef.current.add(beatId);
    const next: SeenState = {
      beats: { ...seenStateRef.current.beats, [beatId]: now },
      episodes: { ...seenStateRef.current.episodes },
    };
    if (beatId === 'I001-B02') {
      next.episodes[ISLAND_001_ARRIVAL_EPISODE_ID] = now;
    }
    seenStateRef.current = next;
    writeSeenState(storageKey, next);
  }, [storageKey]);

  const enqueueBeat = useCallback((beatId: OpeningBeatId) => {
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
    if (activeStoryEpisode) return;
    if (!storyReaderClosingRef.current) return;
    storyReaderClosingRef.current = false;
  }, [activeStoryEpisode]);

  useEffect(() => {
    if (!isEligible || activeStoryEpisode || activeDialogue || isGlobalPrologueActive || isNarrativeSurfaceBlocked || storyReaderClosingRef.current) return;
    const nextBeatId = queue[0];
    if (!nextBeatId) return;
    if (!isOpeningBeatId(nextBeatId) || isSeen(nextBeatId)) {
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
  }, [activeDialogue, activeStoryEpisode, isEligible, isGlobalPrologueActive, isNarrativeSurfaceBlocked, isSeen, queue, setActiveStoryEpisode]);

  const handleStoryEpisodeClosed = useCallback((episode: Exclude<ActiveIslandStoryEpisode, null>) => {
    if (episode.kind !== 'island_arrival') return;
    markSeen('I001-B02');
    storyReaderClosingRef.current = true;
    setActiveStoryEpisode(null);
    if (!isSeen('I001-B03')) {
      enqueueBeat('I001-B03');
    }
  }, [enqueueBeat, isSeen, markSeen, setActiveStoryEpisode]);

  const handleDialogueContinue = useCallback(() => {
    if (!activeDialogue) return;
    markSeen(activeDialogue.beatId);
    setActiveDialogue(null);
  }, [activeDialogue, markSeen]);

  const handleDialogueClose = handleDialogueContinue;

  return {
    activeDialogue,
    queuedBeatIds: queue,
    handleStoryEpisodeClosed,
    handleDialogueContinue,
    handleDialogueClose,
  };
}
