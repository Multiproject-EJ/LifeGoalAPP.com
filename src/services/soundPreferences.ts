import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';

const SOUND_EFFECTS_ENABLED_STORAGE_KEY = 'lifegoal.soundEffects.enabled';

const readLocalSoundPreference = (): boolean => {
  if (typeof window === 'undefined') return true;
  const storedValue = window.localStorage.getItem(SOUND_EFFECTS_ENABLED_STORAGE_KEY);
  if (storedValue === null) return true;
  try {
    return JSON.parse(storedValue) !== false;
  } catch {
    return true;
  }
};

const writeLocalSoundPreference = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_EFFECTS_ENABLED_STORAGE_KEY, JSON.stringify(enabled));
};

export async function fetchSoundEffectsEnabled(userId: string): Promise<{
  data: boolean;
  error: Error | null;
}> {
  try {
    if (!canUseSupabaseData()) {
      return { data: readLocalSoundPreference(), error: null };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('sound_effects_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { data: data?.sound_effects_enabled ?? true, error: null };
  } catch (error) {
    return {
      data: readLocalSoundPreference(),
      error: error instanceof Error ? error : new Error('Unknown error fetching sound preference'),
    };
  }
}

export async function updateSoundEffectsEnabled(
  userId: string,
  enabled: boolean,
): Promise<{
  data: boolean;
  error: Error | null;
}> {
  writeLocalSoundPreference(enabled);

  try {
    if (!canUseSupabaseData()) {
      return { data: enabled, error: null };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          sound_effects_enabled: enabled,
        },
        { onConflict: 'user_id' },
      )
      .select('sound_effects_enabled')
      .single();

    if (error) {
      throw error;
    }

    return { data: data.sound_effects_enabled ?? enabled, error: null };
  } catch (error) {
    return {
      data: enabled,
      error: error instanceof Error ? error : new Error('Unknown error updating sound preference'),
    };
  }
}
