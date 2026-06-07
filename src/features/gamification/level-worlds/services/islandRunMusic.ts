const ISLAND_RUN_MUSIC_VOLUME = 0.28;
const ISLAND_RUN_MUSIC_FADE_MS = 650;

const ISLAND_RUN_MUSIC_TRACKS = {
  'island-board-ambient': '/assets/audio/music/Island dreamy relaxing night islands.mp3',
  'market-lounge': '/assets/audio/music/Lantern Tide.mp3',
  'luxury-reward': '/assets/audio/music/luxury-reward-loop-v1.mp3',
  'new-island-celebration': '/assets/audio/music/new-island-celebration-loop-v1.mp3',
  'event-jackpot': '/assets/audio/music/event-jackpot-loop-v1.mp3',
  'boss-rhythm-duel': '/assets/audio/music/boss-rhythm-duel-loop-v1.mp3',
} as const;

export type IslandRunMusicTrackId = keyof typeof ISLAND_RUN_MUSIC_TRACKS;

export type IslandRunMusicContext =
  | { kind: 'none' }
  | { kind: 'playlist'; trackIds: IslandRunMusicTrackId[] }
  | { kind: 'track'; trackId: IslandRunMusicTrackId };

export interface ResolveIslandRunMusicContextOptions {
  musicEnabled: boolean;
  effectiveIslandNumber: number;
  showShopPanel: boolean;
  showIslandClearCelebration: boolean;
}

export interface IslandRunMusicTransitionOptions {
  fadeMs?: number;
}

const ISLAND_RUN_DREAMT_ISLAND_INTERVAL = 10;

export function isIslandRunDreamtIsland(islandNumber: number): boolean {
  if (!Number.isFinite(islandNumber)) return false;

  const normalizedIslandNumber = Math.trunc(islandNumber);
  return normalizedIslandNumber > 0 && normalizedIslandNumber % ISLAND_RUN_DREAMT_ISLAND_INTERVAL === 0;
}

export function getIslandRunBoardMusicPlaylist(islandNumber: number): IslandRunMusicTrackId[] {
  if (isIslandRunDreamtIsland(islandNumber)) {
    return ['island-board-ambient', 'luxury-reward', 'boss-rhythm-duel'];
  }

  return ['luxury-reward', 'event-jackpot', 'boss-rhythm-duel'];
}

export function resolveIslandRunMusicContext(options: ResolveIslandRunMusicContextOptions): IslandRunMusicContext {
  const {
    musicEnabled,
    effectiveIslandNumber,
    showShopPanel,
    showIslandClearCelebration,
  } = options;

  if (!musicEnabled) return { kind: 'none' };

  if (showIslandClearCelebration) {
    return { kind: 'track', trackId: 'new-island-celebration' };
  }

  if (showShopPanel) {
    return { kind: 'track', trackId: 'market-lounge' };
  }

  return { kind: 'playlist', trackIds: getIslandRunBoardMusicPlaylist(effectiveIslandNumber) };
}

const islandRunMusicAudioByTrack = new Map<IslandRunMusicTrackId, HTMLAudioElement>();
const islandRunMusicFadeTimerByTrack = new Map<IslandRunMusicTrackId, number>();
let ownedIslandRunMusicTrackId: IslandRunMusicTrackId | null = null;
let playingIslandRunMusicTrackId: IslandRunMusicTrackId | null = null;
let islandRunMusicPlayAttemptId = 0;
let ownedIslandRunMusicPlaylistToken = 0;

function getIslandRunMusicAudio(trackId: IslandRunMusicTrackId): HTMLAudioElement | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const existingAudio = islandRunMusicAudioByTrack.get(trackId);
  if (existingAudio) {
    return existingAudio;
  }

  const audio = new Audio(ISLAND_RUN_MUSIC_TRACKS[trackId]);
  audio.volume = ISLAND_RUN_MUSIC_VOLUME;
  audio.preload = 'none';
  islandRunMusicAudioByTrack.set(trackId, audio);

  return audio;
}

function clearIslandRunMusicFade(trackId: IslandRunMusicTrackId): void {
  const timerId = islandRunMusicFadeTimerByTrack.get(trackId);
  if (typeof timerId !== 'number' || typeof window === 'undefined') return;

  window.clearInterval(timerId);
  islandRunMusicFadeTimerByTrack.delete(trackId);
}

function setIslandRunMusicVolume(audio: HTMLAudioElement, volume: number): void {
  audio.volume = Math.min(1, Math.max(0, volume));
}

function fadeIslandRunMusicAudio(
  trackId: IslandRunMusicTrackId,
  targetVolume: number,
  fadeMs: number,
  onComplete?: () => void,
): void {
  const audio = islandRunMusicAudioByTrack.get(trackId);
  if (!audio) return;

  clearIslandRunMusicFade(trackId);

  if (fadeMs <= 0 || typeof window === 'undefined') {
    setIslandRunMusicVolume(audio, targetVolume);
    onComplete?.();
    return;
  }

  const startVolume = audio.volume;
  const startedAt = Date.now();

  const tick = () => {
    const progress = Math.min(1, (Date.now() - startedAt) / fadeMs);
    setIslandRunMusicVolume(audio, startVolume + (targetVolume - startVolume) * progress);

    if (progress >= 1) {
      clearIslandRunMusicFade(trackId);
      onComplete?.();
    }
  };

  const timerId = window.setInterval(tick, 50);
  islandRunMusicFadeTimerByTrack.set(trackId, timerId);
  tick();
}

function resetIslandRunMusicAudio(
  trackId: IslandRunMusicTrackId,
  options: IslandRunMusicTransitionOptions = {},
): void {
  const audio = islandRunMusicAudioByTrack.get(trackId);
  if (!audio) return;

  const fadeMs = options.fadeMs ?? 0;
  const finishReset = () => {
    audio.pause();
    audio.currentTime = 0;
    setIslandRunMusicVolume(audio, ISLAND_RUN_MUSIC_VOLUME);
  };

  if (fadeMs > 0 && !audio.paused) {
    fadeIslandRunMusicAudio(trackId, 0, fadeMs, finishReset);
    return;
  }

  clearIslandRunMusicFade(trackId);
  finishReset();
}

function stopOtherIslandRunMusicTracks(activeTrackId: IslandRunMusicTrackId): void {
  for (const trackId of islandRunMusicAudioByTrack.keys()) {
    if (trackId === activeTrackId) continue;

    const audio = islandRunMusicAudioByTrack.get(trackId);
    if (audio) audio.onended = null;
    resetIslandRunMusicAudio(trackId, { fadeMs: 0 });
    if (ownedIslandRunMusicTrackId === trackId) ownedIslandRunMusicTrackId = null;
    if (playingIslandRunMusicTrackId === trackId) playingIslandRunMusicTrackId = null;
  }
}

function stopOwnedIslandRunMusic(
  options: IslandRunMusicTransitionOptions = {},
  shouldStopPlaylist = true,
): void {
  const trackId = ownedIslandRunMusicTrackId;
  if (!trackId) return;

  if (shouldStopPlaylist) {
    stopOwnedIslandRunMusicPlaylist();
  }

  islandRunMusicPlayAttemptId += 1;
  const audio = islandRunMusicAudioByTrack.get(trackId);
  if (audio) audio.onended = null;
  resetIslandRunMusicAudio(trackId, options);
  ownedIslandRunMusicTrackId = null;
  if (playingIslandRunMusicTrackId === trackId) playingIslandRunMusicTrackId = null;
}


function stopOwnedIslandRunMusicPlaylist(): void {
  ownedIslandRunMusicPlaylistToken += 1;
}

export function playIslandRunMusicPlaylist(
  trackIds: IslandRunMusicTrackId[],
  options: IslandRunMusicTransitionOptions = {},
): void {
  if (trackIds.length === 0) return;

  stopOwnedIslandRunMusicPlaylist();
  const playlistToken = ownedIslandRunMusicPlaylistToken;

  const playTrackAt = (trackIndex: number): void => {
    if (playlistToken !== ownedIslandRunMusicPlaylistToken) return;

    const normalizedIndex = ((trackIndex % trackIds.length) + trackIds.length) % trackIds.length;
    const trackId = trackIds[normalizedIndex];
    const audio = getIslandRunMusicAudio(trackId);
    if (!audio) return;

    if (ownedIslandRunMusicTrackId && ownedIslandRunMusicTrackId !== trackId) {
      stopOwnedIslandRunMusic({ fadeMs: 0 }, false);
    }
    stopOtherIslandRunMusicTracks(trackId);

    if (ownedIslandRunMusicTrackId !== trackId) {
      islandRunMusicPlayAttemptId += 1;
      ownedIslandRunMusicTrackId = trackId;
    }

    const playAttemptId = islandRunMusicPlayAttemptId;

    audio.onended = () => {
      playTrackAt(normalizedIndex + 1);
    };
    audio.loop = false;
    clearIslandRunMusicFade(trackId);
    setIslandRunMusicVolume(audio, options.fadeMs && options.fadeMs > 0 ? 0 : ISLAND_RUN_MUSIC_VOLUME);

    void audio
      .play()
      .then(() => {
        if (playlistToken !== ownedIslandRunMusicPlaylistToken) {
          resetIslandRunMusicAudio(trackId);
          return;
        }

        if (playAttemptId !== islandRunMusicPlayAttemptId || ownedIslandRunMusicTrackId !== trackId) {
          resetIslandRunMusicAudio(trackId);
          return;
        }

        playingIslandRunMusicTrackId = trackId;
        if (options.fadeMs && options.fadeMs > 0) {
          fadeIslandRunMusicAudio(trackId, ISLAND_RUN_MUSIC_VOLUME, options.fadeMs);
        }
      })
      .catch(() => {
        if (playlistToken !== ownedIslandRunMusicPlaylistToken) return;
        if (playAttemptId !== islandRunMusicPlayAttemptId) return;

        if (ownedIslandRunMusicTrackId === trackId) ownedIslandRunMusicTrackId = null;
        if (playingIslandRunMusicTrackId === trackId) playingIslandRunMusicTrackId = null;
      });
  };

  playTrackAt(0);
}

export function playIslandRunMusic(
  trackId: IslandRunMusicTrackId,
  options: IslandRunMusicTransitionOptions = {},
): void {
  stopOwnedIslandRunMusicPlaylist();

  const audio = getIslandRunMusicAudio(trackId);
  if (!audio) return;

  audio.onended = null;
  audio.loop = true;
  clearIslandRunMusicFade(trackId);
  setIslandRunMusicVolume(audio, options.fadeMs && options.fadeMs > 0 ? 0 : ISLAND_RUN_MUSIC_VOLUME);

  if (ownedIslandRunMusicTrackId && ownedIslandRunMusicTrackId !== trackId) {
    stopOwnedIslandRunMusic({ fadeMs: 0 });
  }
  stopOtherIslandRunMusicTracks(trackId);

  if (ownedIslandRunMusicTrackId !== trackId) {
    islandRunMusicPlayAttemptId += 1;
    ownedIslandRunMusicTrackId = trackId;
  }
  const playAttemptId = islandRunMusicPlayAttemptId;

  void audio
    .play()
    .then(() => {
      if (playAttemptId !== islandRunMusicPlayAttemptId || ownedIslandRunMusicTrackId !== trackId) {
        resetIslandRunMusicAudio(trackId);
        return;
      }

      playingIslandRunMusicTrackId = trackId;
      if (options.fadeMs && options.fadeMs > 0) {
        fadeIslandRunMusicAudio(trackId, ISLAND_RUN_MUSIC_VOLUME, options.fadeMs);
      }
    })
    .catch(() => {
      // Browser autoplay policy can reject playback even after some interactions.
      if (playAttemptId !== islandRunMusicPlayAttemptId) return;

      if (ownedIslandRunMusicTrackId === trackId) ownedIslandRunMusicTrackId = null;
      if (playingIslandRunMusicTrackId === trackId) playingIslandRunMusicTrackId = null;
    });
}

export function stopIslandRunMusic(
  trackId?: IslandRunMusicTrackId,
  options: IslandRunMusicTransitionOptions = {},
): void {
  if (!trackId) {
    stopOwnedIslandRunMusicPlaylist();
    stopOwnedIslandRunMusic(options, false);
    return;
  }

  if (ownedIslandRunMusicTrackId !== trackId && playingIslandRunMusicTrackId !== trackId) return;

  stopOwnedIslandRunMusicPlaylist();

  islandRunMusicPlayAttemptId += 1;
  const audio = islandRunMusicAudioByTrack.get(trackId);
  if (audio) audio.onended = null;
  resetIslandRunMusicAudio(trackId, options);
  if (ownedIslandRunMusicTrackId === trackId) ownedIslandRunMusicTrackId = null;
  if (playingIslandRunMusicTrackId === trackId) playingIslandRunMusicTrackId = null;
}

export function resetIslandRunMusicForTests(): void {
  for (const trackId of islandRunMusicAudioByTrack.keys()) {
    clearIslandRunMusicFade(trackId);
    const audio = islandRunMusicAudioByTrack.get(trackId);
    if (audio) {
      audio.onended = null;
      audio.pause();
      audio.currentTime = 0;
      setIslandRunMusicVolume(audio, ISLAND_RUN_MUSIC_VOLUME);
    }
  }

  islandRunMusicAudioByTrack.clear();
  islandRunMusicFadeTimerByTrack.clear();
  ownedIslandRunMusicTrackId = null;
  playingIslandRunMusicTrackId = null;
  islandRunMusicPlayAttemptId += 1;
  ownedIslandRunMusicPlaylistToken += 1;
}

export function applyIslandRunMusicContext(
  context: IslandRunMusicContext,
  options: IslandRunMusicTransitionOptions = { fadeMs: ISLAND_RUN_MUSIC_FADE_MS },
): void {
  if (context.kind === 'none') {
    stopIslandRunMusic(undefined, options);
    return;
  }

  if (context.kind === 'track') {
    playIslandRunMusic(context.trackId, options);
    return;
  }

  playIslandRunMusicPlaylist(context.trackIds, options);
}
