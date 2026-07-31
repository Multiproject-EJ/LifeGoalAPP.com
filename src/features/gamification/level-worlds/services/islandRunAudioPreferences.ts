export interface IslandRunAudioPreferences {
  ambienceEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

interface PersistedIslandRunAudioPreferences {
  audioEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

/**
 * Resolves the three player-facing Island Run audio channels.
 *
 * `audioEnabled` is the existing persisted compatibility field. It now stores
 * the world-ambience preference, allowing the three-channel model to ship
 * without a database migration. Older records still hydrate all three channels
 * from this field through the game-state sanitizer.
 */
export function resolveIslandRunAudioPreferences(
  record: PersistedIslandRunAudioPreferences,
): IslandRunAudioPreferences {
  return {
    ambienceEnabled: record.audioEnabled,
    musicEnabled: record.musicEnabled,
    sfxEnabled: record.sfxEnabled,
  };
}
