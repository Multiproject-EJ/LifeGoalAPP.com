import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type PersonalityRecommendationRow =
  Database['public']['Tables']['personality_recommendations']['Row'];

export async function fetchPersonalityRecommendations(): Promise<
  PersonalityRecommendationRow[]
> {
  if (!canUseSupabaseData()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('personality_recommendations').select('*');

  if (error || !data) {
    return [];
  }

  return data;
}
