import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import { recordTelemetryEvent } from './telemetry';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

export async function awardDailyTreatGold(
  userId: string,
  goldAmount: number,
  sourceLabel: string
): Promise<ServiceResponse<{ newGoldBalance: number }>> {
  if (!goldAmount || goldAmount <= 0) {
    return { data: { newGoldBalance: 0 }, error: null };
  }

  const { data: profile, error: profileError } = await fetchGamificationProfile(userId);

  if (profileError || !profile) {
    return { data: null, error: profileError || new Error('Profile not found') };
  }

  const newBalance = profile.total_points + goldAmount;

  if (!canUseSupabaseData()) {
    saveDemoProfile({ ...profile, total_points: newBalance });
  } else {
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase
      .from('gamification_profiles')
      .update({ total_points: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      return { data: null, error: updateError };
    }
  }

  void recordTelemetryEvent({
    userId,
    eventType: 'economy_earn',
    metadata: {
      currency: 'gold',
      amount: goldAmount,
      balance: newBalance,
      sourceType: 'daily_treats',
      sourceLabel,
    },
  });

  return { data: { newGoldBalance: newBalance }, error: null };
}
