const ISLAND_RUN_MUSIC_VOLUME = 0.28;

const ISLAND_RUN_MUSIC_TRACKS = {
  'island-board-ambient': '/assets/audio/music/Island dreamy relaxing night islands.mp3',
  'market-lounge': '/assets/audio/music/Lantern Tide.mp3',
  'luxury-reward': '/assets/audio/music/luxury-reward-loop-v1.mp3',
  'new-island-celebration': '/assets/audio/music/new-island-celebration-loop-v1.mp3',
  'event-jackpot': '/assets/audio/music/event-jackpot-loop-v1.mp3',
  'boss-rhythm-duel': '/assets/audio/music/boss-rhythm-duel-loop-v1.mp3',
} as const;

export type IslandRunMusicTrackId = keyof typeof ISLAND_RUN_MUSIC_TRACKS;

const islandRunMusicAudioByTrack = new Map<IslandRunMusicTrackId, HTMLAudioElement>();
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

function resetIslandRunMusicAudio(trackId: IslandRunMusicTrackId): void {
  const audio = islandRunMusicAudioByTrack.get(trackId);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
}

function stopOwnedIslandRunMusic(): void {
  const trackId = ownedIslandRunMusicTrackId;
  if (!trackId) return;

  stopOwnedIslandRunMusicPlaylist();

  islandRunMusicPlayAttemptId += 1;
  const audio = islandRunMusicAudioByTrack.get(trackId);
  if (audio) audio.onended = null;
  resetIslandRunMusicAudio(trackId);
  ownedIslandRunMusicTrackId = null;
  if (playingIslandRunMusicTrackId === trackId) playingIslandRunMusicTrackId = null;
}


function stopOwnedIslandRunMusicPlaylist(): void {
  ownedIslandRunMusicPlaylistToken += 1;
}

export function playIslandRunMusicPlaylist(trackIds: IslandRunMusicTrackId[]): void {
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
      stopOwnedIslandRunMusic();
    }

    if (ownedIslandRunMusicTrackId !== trackId) {
      islandRunMusicPlayAttemptId += 1;
      ownedIslandRunMusicTrackId = trackId;
    }

    const playAttemptId = islandRunMusicPlayAttemptId;

    audio.onended = () => {
      playTrackAt(normalizedIndex + 1);
    };
    audio.loop = false;

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

export function playIslandRunMusic(trackId: IslandRunMusicTrackId): void {
  stopOwnedIslandRunMusicPlaylist();

  const audio = getIslandRunMusicAudio(trackId);
  if (!audio) return;

  audio.onended = null;
  audio.loop = true;

  if (ownedIslandRunMusicTrackId && ownedIslandRunMusicTrackId !== trackId) {
    stopOwnedIslandRunMusic();
  }

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
    })
    .catch(() => {
      // Browser autoplay policy can reject playback even after some interactions.
      if (playAttemptId !== islandRunMusicPlayAttemptId) return;

      if (ownedIslandRunMusicTrackId === trackId) ownedIslandRunMusicTrackId = null;
      if (playingIslandRunMusicTrackId === trackId) playingIslandRunMusicTrackId = null;
    });
}

export function stopIslandRunMusic(trackId?: IslandRunMusicTrackId): void {
  if (!trackId) {
    stopOwnedIslandRunMusicPlaylist();
    stopOwnedIslandRunMusic();
    return;
  }

  if (ownedIslandRunMusicTrackId !== trackId && playingIslandRunMusicTrackId !== trackId) return;

  stopOwnedIslandRunMusicPlaylist();

  islandRunMusicPlayAttemptId += 1;
  const audio = islandRunMusicAudioByTrack.get(trackId);
  if (audio) audio.onended = null;
  resetIslandRunMusicAudio(trackId);
  if (ownedIslandRunMusicTrackId === trackId) ownedIslandRunMusicTrackId = null;
  if (playingIslandRunMusicTrackId === trackId) playingIslandRunMusicTrackId = null;
}
