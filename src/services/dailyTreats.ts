import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import { recordTelemetryEvent } from './telemetry';
import { awardHearts } from './gameRewards';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

const DAILY_HEARTS_AMOUNT = 5;
const DAILY_HEARTS_STORAGE_KEY_PREFIX = 'lifegoal:daily-hearts';

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

/**
 * Gets today's date in YYYY-MM-DD format using UTC to ensure consistency across timezones.
 * Using UTC prevents edge cases where users in different timezones could claim multiple times
 * or miss a day during date transitions.
 */
function getTodayDateKeyUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // Always returns YYYY-MM-DD in UTC
}

/**
 * Collects daily hearts for the user if they haven't collected today yet.
 * Awards exactly 5 hearts per day, not stackable (missed days don't accumulate).
 * 
 * @param userId - The user's unique identifier
 * @returns Object with success status and new hearts balance, or null if already collected today
 */
export function collectDailyHearts(userId: string): {
  collected: boolean;
  heartsAwarded: number;
  newBalance: number;
} | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const today = getTodayDateKeyUTC();
  const storageKey = `${DAILY_HEARTS_STORAGE_KEY_PREFIX}:${userId}:lastCollected`;
  
  try {
    const lastCollected = window.localStorage.getItem(storageKey);
    
    // Check if already collected today
    if (lastCollected === today) {
      return null; // Already collected today
    }
    
    // Award hearts
    const newBalance = awardHearts(
      userId,
      DAILY_HEARTS_AMOUNT,
      'daily_treats',
      'Daily treats hearts collection'
    );
    
    // Update last collected date
    window.localStorage.setItem(storageKey, today);
    
    // Record telemetry
    void recordTelemetryEvent({
      userId,
      eventType: 'economy_earn',
      metadata: {
        currency: 'hearts',
        amount: DAILY_HEARTS_AMOUNT,
        balance: newBalance.hearts,
        sourceType: 'daily_treats',
        sourceLabel: 'Daily hearts collection',
      },
    });
    
    return {
      collected: true,
      heartsAwarded: DAILY_HEARTS_AMOUNT,
      newBalance: newBalance.hearts,
    };
  } catch (error) {
    console.warn('Failed to collect daily hearts:', error);
    return null;
  }
}

/**
 * Checks if the user has already collected their daily hearts today.
 * 
 * @param userId - The user's unique identifier
 * @returns true if hearts have been collected today, false otherwise
 */
export function hasCollectedDailyHeartsToday(userId: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  const today = getTodayDateKeyUTC();
  const storageKey = `${DAILY_HEARTS_STORAGE_KEY_PREFIX}:${userId}:lastCollected`;
  
  try {
    const lastCollected = window.localStorage.getItem(storageKey);
    return lastCollected === today;
  } catch (error) {
    console.warn('Failed to check daily hearts collection status:', error);
    return false;
  }
}
