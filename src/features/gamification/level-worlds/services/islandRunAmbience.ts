const ISLAND_RUN_AMBIENCE_SRC = '/assets/audio/music/Island dreamy relaxing night islands.mp3';
const ISLAND_RUN_AMBIENCE_VOLUME = 0.18;

export interface IslandRunAmbienceState {
  enabled: boolean;
  suspended?: boolean;
}

let islandRunAmbienceAudio: HTMLAudioElement | null = null;
let islandRunAmbiencePlayAttemptId = 0;

function getIslandRunAmbienceAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (islandRunAmbienceAudio) return islandRunAmbienceAudio;

  const audio = new Audio(ISLAND_RUN_AMBIENCE_SRC);
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = ISLAND_RUN_AMBIENCE_VOLUME;
  islandRunAmbienceAudio = audio;
  return audio;
}

/**
 * Owns the single continuous Island Run world bed.
 *
 * A lifecycle suspension pauses without resetting the playhead, while a player
 * preference change to off resets it. Reapplying the same active state is
 * idempotent and never creates a second loop.
 */
export function applyIslandRunAmbienceState({
  enabled,
  suspended = false,
}: IslandRunAmbienceState): void {
  const audio = getIslandRunAmbienceAudio();
  if (!audio) return;

  if (!enabled) {
    islandRunAmbiencePlayAttemptId += 1;
    audio.pause();
    audio.currentTime = 0;
    return;
  }

  if (suspended) {
    islandRunAmbiencePlayAttemptId += 1;
    audio.pause();
    return;
  }

  if (!audio.paused) return;

  islandRunAmbiencePlayAttemptId += 1;
  const playAttemptId = islandRunAmbiencePlayAttemptId;
  void audio.play().catch(() => {
    if (playAttemptId !== islandRunAmbiencePlayAttemptId) return;
    // Browser autoplay policy may reject until the entry confirmation gesture.
  });
}

export function stopIslandRunAmbience(options: { reset?: boolean } = {}): void {
  if (!islandRunAmbienceAudio) return;
  islandRunAmbiencePlayAttemptId += 1;
  islandRunAmbienceAudio.pause();
  if (options.reset ?? true) islandRunAmbienceAudio.currentTime = 0;
}

export function resetIslandRunAmbienceForTests(): void {
  stopIslandRunAmbience();
  islandRunAmbienceAudio = null;
  islandRunAmbiencePlayAttemptId += 1;
}
