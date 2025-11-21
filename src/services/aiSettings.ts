import { getSupabaseClient } from '../lib/supabaseClient';
import type { AiModel } from '../types/aiModel';

export type AiSettingsRow = {
  user_id: string;
  provider: string;
  api_key: string | null;
  model: string | null;
};

/**
 * Fetch AI settings for a user
 */
export async function fetchAiSettings(userId: string): Promise<{
  data: AiSettingsRow | null;
  error: Error | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_settings')
      .select('user_id, provider, api_key, model')
      .eq('user_id', userId)
      .eq('provider', 'openai')
      .single();

    if (error) {
      // If no row exists, that's not an error - just return null
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to fetch AI settings:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching AI settings'),
    };
  }
}

/**
 * Upsert AI model preference for a user
 */
export async function upsertAiModel(userId: string, model: AiModel): Promise<{
  data: AiSettingsRow | null;
  error: Error | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_settings')
      .upsert(
        {
          user_id: userId,
          provider: 'openai',
          model,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select('user_id, provider, api_key, model')
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Failed to upsert AI model:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error upserting AI model'),
    };
  }
}
