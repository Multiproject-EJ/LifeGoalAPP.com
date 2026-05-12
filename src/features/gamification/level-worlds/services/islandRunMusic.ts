const ISLAND_RUN_LUXURY_REWARD_MUSIC_SRC = '/assets/audio/music/luxury-reward-loop-v1.mp3';
const ISLAND_RUN_LUXURY_REWARD_MUSIC_VOLUME = 0.28;

let luxuryRewardMusicAudio: HTMLAudioElement | null = null;

function getLuxuryRewardMusicAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!luxuryRewardMusicAudio) {
    luxuryRewardMusicAudio = new Audio(ISLAND_RUN_LUXURY_REWARD_MUSIC_SRC);
    luxuryRewardMusicAudio.loop = true;
    luxuryRewardMusicAudio.volume = ISLAND_RUN_LUXURY_REWARD_MUSIC_VOLUME;
    luxuryRewardMusicAudio.preload = 'none';
  }

  return luxuryRewardMusicAudio;
}

export function playIslandRunLuxuryRewardMusic(): void {
  const audio = getLuxuryRewardMusicAudio();
  if (!audio) return;

  audio.loop = true;
  audio.volume = ISLAND_RUN_LUXURY_REWARD_MUSIC_VOLUME;

  void audio.play().catch(() => {
    // Browser autoplay policy can reject playback even after some interactions.
  });
}

export function stopIslandRunLuxuryRewardMusic(): void {
  const audio = luxuryRewardMusicAudio;
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
}
