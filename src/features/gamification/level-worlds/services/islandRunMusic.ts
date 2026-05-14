const ISLAND_RUN_MUSIC_VOLUME = 0.28;

const ISLAND_RUN_MUSIC_TRACKS = {
  'market-lounge': '/assets/audio/music/market-lounge-loop-v1.mp3',
  'luxury-reward': '/assets/audio/music/luxury-reward-loop-v1.mp3',
  'new-island-celebration': '/assets/audio/music/new-island-celebration-loop-v1.mp3',
  'event-jackpot': '/assets/audio/music/event-jackpot-loop-v1.mp3',
  'boss-rhythm-duel': '/assets/audio/music/boss-rhythm-duel-loop-v1.mp3',
} as const;

export type IslandRunMusicTrackId = keyof typeof ISLAND_RUN_MUSIC_TRACKS;

const islandRunMusicAudioByTrack = new Map<IslandRunMusicTrackId, HTMLAudioElement>();
let activeIslandRunMusicTrackId: IslandRunMusicTrackId | null = null;

function getIslandRunMusicAudio(trackId: IslandRunMusicTrackId): HTMLAudioElement | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const existingAudio = islandRunMusicAudioByTrack.get(trackId);
  if (existingAudio) {
    return existingAudio;
  }

  const audio = new Audio(ISLAND_RUN_MUSIC_TRACKS[trackId]);
  audio.loop = true;
  audio.volume = ISLAND_RUN_MUSIC_VOLUME;
  audio.preload = 'none';
  islandRunMusicAudioByTrack.set(trackId, audio);

  return audio;
}

function stopIslandRunActiveMusic(): void {
  if (!activeIslandRunMusicTrackId) return;

  const activeAudio = islandRunMusicAudioByTrack.get(activeIslandRunMusicTrackId);
  if (!activeAudio) {
    activeIslandRunMusicTrackId = null;
    return;
  }

  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeIslandRunMusicTrackId = null;
}

export function playIslandRunMusic(trackId: IslandRunMusicTrackId): void {
  const audio = getIslandRunMusicAudio(trackId);
  if (!audio) return;

  if (activeIslandRunMusicTrackId && activeIslandRunMusicTrackId !== trackId) {
    stopIslandRunActiveMusic();
  }

  activeIslandRunMusicTrackId = trackId;

  void audio.play().catch(() => {
    // Browser autoplay policy can reject playback even after some interactions.
  });
}

export function stopIslandRunMusic(trackId?: IslandRunMusicTrackId): void {
  if (!trackId) {
    stopIslandRunActiveMusic();
    return;
  }

  if (activeIslandRunMusicTrackId !== trackId) return;

  const audio = islandRunMusicAudioByTrack.get(trackId);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  activeIslandRunMusicTrackId = null;
}
