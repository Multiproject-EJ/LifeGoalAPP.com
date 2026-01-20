// Service for managing gamification preferences (toggle enabled/disabled)
// Supports both demo mode (localStorage) and Supabase mode

import { getSupabaseClient, canUseSupabaseData } from '../lib/supabaseClient';
import type { GamificationProfile } from '../types/gamification';
import { DEMO_ENABLED_KEY } from '../types/gamification';

/**
 * Fetch whether gamification is enabled for the user
 */
export async function fetchGamificationEnabled(userId: string): Promise<{
  data: boolean | null;
  error: Error | null;
}> {
  try {
    // Demo mode: use localStorage
    if (!canUseSupabaseData()) {
      const enabled = localStorage.getItem(DEMO_ENABLED_KEY);
      // Default to true if not set, otherwise parse the stored value
      const isEnabled = enabled === null ? true : JSON.parse(enabled);
      return { 
        data: isEnabled, 
        error: null 
      };
    }

    // Supabase mode: fetch from database
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('gamification_profiles')
      .select('gamification_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // If no profile exists yet, default to enabled
    if (!data) {
      return { data: true, error: null };
    }

    return { data: data.gamification_enabled, error: null };
  } catch (error) {
    console.error('Failed to fetch gamification enabled status:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching gamification status'),
    };
  }
}

/**
 * Update whether gamification is enabled for the user
 */
export async function updateGamificationEnabled(
  userId: string,
  enabled: boolean
): Promise<{
  data: boolean | null;
  error: Error | null;
}> {
  try {
    // Demo mode: use localStorage
    if (!canUseSupabaseData()) {
      localStorage.setItem(DEMO_ENABLED_KEY, JSON.stringify(enabled));
      return { data: enabled, error: null };
    }

    // Supabase mode: upsert to database
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('gamification_profiles')
      .upsert(
        {
          user_id: userId,
          gamification_enabled: enabled,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select('gamification_enabled')
      .single();

    if (error) {
      throw error;
    }

    return { data: data.gamification_enabled, error: null };
  } catch (error) {
    console.error('Failed to update gamification enabled status:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating gamification status'),
    };
  }
}

/**
 * Fetch full gamification profile for the user
 */
export async function fetchGamificationProfile(userId: string): Promise<{
  data: GamificationProfile | null;
  error: Error | null;
}> {
  try {
    // Demo mode: use localStorage
    if (!canUseSupabaseData()) {
      const profileJson = localStorage.getItem('lifegoal_demo_gamification_profile');
      if (!profileJson) {
        // Return default profile
        const defaultProfile: GamificationProfile = {
          user_id: userId,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
          lives: 5,
          max_lives: 5,
          last_life_refill: null,
          streak_freezes: 0,
          freeze_bank_capacity: 3,
          total_points: 0,
          zen_tokens: 0,
          gamification_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return { data: defaultProfile, error: null };
      }
      
      const profile = JSON.parse(profileJson) as GamificationProfile;
      return { data: { ...profile, user_id: userId }, error: null };
    }

    // Supabase mode: fetch from database
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('gamification_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // If no profile exists yet, create a default one
    if (!data) {
      const { data: newProfile, error: insertError } = await supabase
        .from('gamification_profiles')
        .insert({
          user_id: userId,
          gamification_enabled: true,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return { data: newProfile as GamificationProfile, error: null };
    }

    return { data: data as GamificationProfile, error: null };
  } catch (error) {
    console.error('Failed to fetch gamification profile:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching gamification profile'),
    };
  }
}

/**
 * Save demo profile to localStorage
 */
export function saveDemoProfile(profile: Partial<GamificationProfile>): void {
  const profileJson = localStorage.getItem('lifegoal_demo_gamification_profile');
  const currentProfile = profileJson ? JSON.parse(profileJson) : {};
  const updatedProfile = { ...currentProfile, ...profile };
  localStorage.setItem('lifegoal_demo_gamification_profile', JSON.stringify(updatedProfile));
}
