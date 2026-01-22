import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { DailySpinState, SpinResult, SpinPrize, PrizeType } from '../types/gamification';
import { awardXP } from './gamification';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import { recordTelemetryEvent } from './telemetry';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

const DEMO_STORAGE_KEY = 'demo_daily_spin_state';
const DEMO_HISTORY_KEY = 'lifegoal_demo_spin_history';

/**
 * Fetch or initialize daily spin state for user
 * Includes streak bonus logic: +1 spin for 7+ day streaks
 */
export async function getDailySpinState(userId: string): Promise<ServiceResponse<DailySpinState>> {
  const { data: spinState, error } = await fetchDailySpinState(userId);
  
  if (error || !spinState) {
    return { data: null, error };
  }

  // Check for streak bonus
  const { data: profile } = await fetchGamificationProfile(userId);
  if (profile && profile.current_streak >= 7) {
    // Add bonus spin for 7+ day streak
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = !spinState.lastSpinDate || spinState.lastSpinDate !== today;
    
    if (isNewDay && spinState.spinsAvailable === 0) {
      // Initialize daily spins with bonus
      const baseSpins = 1;
      const bonusSpins = 1;
      const totalSpins = baseSpins + bonusSpins;
      
      if (!canUseSupabaseData()) {
        const updated: DailySpinState = {
          ...spinState,
          spinsAvailable: totalSpins,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
        return { data: updated, error: null };
      }

      const supabase = getSupabaseClient();
      const { data: updatedState, error: updateError } = await supabase
        .from('daily_spin_state' as any)
        .update({
          spins_available: totalSpins,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        return { data: spinState, error: null }; // Return original state if update fails
      }

      return { data: mapRowToState(updatedState), error: null };
    }
  }

  return { data: spinState, error: null };
}

/**
 * Fetch or initialize daily spin state for user (internal)
 */
async function fetchDailySpinState(userId: string): Promise<ServiceResponse<DailySpinState>> {
  if (!canUseSupabaseData()) {
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        return { data: JSON.parse(stored), error: null };
      }
      
      const defaultState: DailySpinState = {
        userId,
        lastSpinDate: null,
        spinsAvailable: 0,
        totalSpinsUsed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return { data: defaultState, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('daily_spin_state' as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    // Initialize state
    const { data: newState, error: insertError } = await supabase
      .from('daily_spin_state' as any)
      .insert({
        user_id: userId,
        spins_available: 0,
        total_spins_used: 0,
      })
      .select()
      .single();

    if (insertError) {
      return { data: null, error: insertError };
    }

    return { data: mapRowToState(newState), error: null };
  }

  return { data: mapRowToState(data), error: null };
}

/**
 * Check if user can spin today
 */
export async function canSpinToday(userId: string): Promise<boolean> {
  const { data: spinState, error } = await getDailySpinState(userId);
  
  if (error || !spinState) {
    return false;
  }

  return spinState.spinsAvailable > 0;
}

/**
 * Get spin history for user
 */
export async function getSpinHistory(userId: string, limit: number = 10): Promise<ServiceResponse<any[]>> {
  if (!canUseSupabaseData()) {
    try {
      const stored = localStorage.getItem(DEMO_HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        return { data: history.slice(0, limit), error: null };
      }
      return { data: [], error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spin_history' as any)
    .select('*')
    .eq('user_id', userId)
    .order('spun_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error };
  }

  return { data: data || [], error: null };
}

/**
 * Get a random prize based on weighted probabilities
 * Implements the prize selection algorithm from the spec
 */
export function getRandomPrize(): SpinPrize {
  const roll = Math.random() * 100;
  
  // Legendary: 0-3 (3%)
  if (roll < 3) {
    return getLegendaryPrize();
  }
  // Epic: 3-15 (12%)
  else if (roll < 15) {
    return getEpicPrize();
  }
  // Rare: 15-40 (25%)
  else if (roll < 40) {
    return getRarePrize();
  }
  // Common: 40-100 (60%)
  else {
    return getCommonPrize();
  }
}

/**
 * Get a common prize (60%)
 */
function getCommonPrize(): SpinPrize {
  const commonPrizes = [
    { type: 'xp' as PrizeType, value: 50, label: '50 XP', icon: '💰' },
    { type: 'xp' as PrizeType, value: 75, label: '75 XP', icon: '💰' },
    { type: 'xp' as PrizeType, value: 100, label: '100 XP', icon: '💰' },
    { type: 'points' as PrizeType, value: 5, label: '5 Points', icon: '💎' },
    { type: 'points' as PrizeType, value: 10, label: '10 Points', icon: '💎' },
  ];
  return commonPrizes[Math.floor(Math.random() * commonPrizes.length)];
}

/**
 * Get a rare prize (25%)
 */
function getRarePrize(): SpinPrize {
  const rarePrizes = [
    { type: 'xp' as PrizeType, value: 200, label: '200 XP', icon: '💰' },
    { type: 'streak_freeze' as PrizeType, value: 1, label: '1 Streak Freeze', icon: '🛡️' },
    { type: 'points' as PrizeType, value: 20, label: '20 Points', icon: '💎' },
  ];
  return rarePrizes[Math.floor(Math.random() * rarePrizes.length)];
}

/**
 * Get an epic prize (12%)
 */
function getEpicPrize(): SpinPrize {
  const epicPrizes = [
    { type: 'xp' as PrizeType, value: 500, label: '500 XP', icon: '🌟' },
    { type: 'life' as PrizeType, value: 1, label: '1 Extra Life', icon: '❤️' },
    { type: 'life' as PrizeType, value: 2, label: '2 Extra Lives', icon: '❤️' },
    { type: 'points' as PrizeType, value: 50, label: '50 Points', icon: '💎' },
  ];
  return epicPrizes[Math.floor(Math.random() * epicPrizes.length)];
}

/**
 * Get a legendary prize (3%)
 */
function getLegendaryPrize(): SpinPrize {
  const legendaryPrizes = [
    { type: 'xp' as PrizeType, value: 1000, label: '1000 XP', icon: '🔥' },
    { type: 'streak_freeze' as PrizeType, value: 3, label: '3 Streak Freezes', icon: '🛡️' },
    { type: 'points' as PrizeType, value: 100, label: '100 Points', icon: '💎' },
  ];
  return legendaryPrizes[Math.floor(Math.random() * legendaryPrizes.length)];
}

/**
 * Update spins available based on habit completion
 */
export async function updateSpinsAvailable(userId: string, spinsEarned: number): Promise<ServiceResponse<DailySpinState>> {
  const { data: currentState, error: fetchError } = await fetchDailySpinState(userId);

  if (fetchError || !currentState) {
    return { data: null, error: fetchError };
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Reset spins if it's a new day, otherwise add to existing
  const isNewDay = !currentState.lastSpinDate || currentState.lastSpinDate !== today;
  const newSpins = isNewDay 
    ? spinsEarned
    : Math.max(currentState.spinsAvailable, spinsEarned);

  if (!canUseSupabaseData()) {
    const updated: DailySpinState = {
      ...currentState,
      spinsAvailable: newSpins,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    return { data: updated, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('daily_spin_state' as any)
    .update({
      spins_available: newSpins,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: mapRowToState(data), error: null };
}

/**
 * Execute a spin and award prize
 */
export async function executeSpin(userId: string): Promise<ServiceResponse<SpinResult>> {
  const { data: spinState, error: stateError } = await getDailySpinState(userId);

  if (stateError || !spinState) {
    return { data: null, error: stateError || new Error('Failed to fetch spin state') };
  }

  // Check if user has spins available
  if (spinState.spinsAvailable <= 0) {
    return { data: null, error: new Error('No spins available') };
  }

  const today = new Date().toISOString().split('T')[0];

  // Select prize using new weighted algorithm
  const prize = getRandomPrize();

  // Award prize
  await awardPrize(userId, prize);

  // Update spin state
  const newSpinsAvailable = spinState.spinsAvailable - 1;

  if (!canUseSupabaseData()) {
    const updated: DailySpinState = {
      ...spinState,
      lastSpinDate: today,
      spinsAvailable: newSpinsAvailable,
      totalSpinsUsed: spinState.totalSpinsUsed + 1,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));

    // Log to demo history
    const historyEntry = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      prizeType: prize.type,
      prizeValue: prize.value,
      prizeDetails: prize.details || {},
      spunAt: new Date().toISOString(),
    };
    const history = JSON.parse(localStorage.getItem(DEMO_HISTORY_KEY) || '[]');
    history.unshift(historyEntry);
    localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));

    return {
      data: {
        prize,
        spinsRemaining: newSpinsAvailable,
      },
      error: null,
    };
  }

  const supabase = getSupabaseClient();

  // Update state with error handling
  const { error: updateError } = await supabase
    .from('daily_spin_state' as any)
    .update({
      last_spin_date: today,
      spins_available: newSpinsAvailable,
      total_spins_used: spinState.totalSpinsUsed + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    return { data: null, error: updateError };
  }

  // Log spin history
  await supabase.from('spin_history' as any).insert({
    user_id: userId,
    prize_type: prize.type,
    prize_value: prize.value,
    prize_details: prize.details || {},
  });

  return {
    data: {
      prize,
      spinsRemaining: newSpinsAvailable,
    },
    error: null,
  };
}

/**
 * Award prize to user
 */
async function awardPrize(userId: string, prize: SpinPrize): Promise<void> {
  const supabase = getSupabaseClient();

  switch (prize.type) {
    case 'xp':
      await awardXP(userId, prize.value, 'daily_login', undefined, `Daily spin: ${prize.label}`);
      break;

    case 'points':
      {
        const { data: profile } = await fetchGamificationProfile(userId);
        if (!profile) break;
        const nextBalance = profile.total_points + prize.value;

        if (!canUseSupabaseData()) {
          saveDemoProfile({ total_points: nextBalance, updated_at: new Date().toISOString() });
        } else {
          await supabase
            .from('gamification_profiles')
            .update({
              total_points: nextBalance,
            })
            .eq('user_id', userId);
        }

        void recordTelemetryEvent({
          userId,
          eventType: 'economy_earn',
          metadata: {
            currency: 'points',
            amount: prize.value,
            balance: nextBalance,
            sourceType: 'daily_spin',
            sourceId: prize.label,
          },
        });
      }
      break;

    case 'streak_freeze':
      {
        const { data: freezeProfile } = await fetchGamificationProfile(userId);
        if (!freezeProfile) break;
        const nextFreezeCount = freezeProfile.streak_freezes + prize.value;

        if (!canUseSupabaseData()) {
          saveDemoProfile({ streak_freezes: nextFreezeCount, updated_at: new Date().toISOString() });
        } else {
          await supabase
            .from('gamification_profiles')
            .update({
              streak_freezes: nextFreezeCount,
            })
            .eq('user_id', userId);
        }

        void recordTelemetryEvent({
          userId,
          eventType: 'economy_earn',
          metadata: {
            currency: 'streak_freeze',
            amount: prize.value,
            balance: nextFreezeCount,
            sourceType: 'daily_spin',
            sourceId: prize.label,
          },
        });
      }
      break;

    case 'life':
      {
        const { data: lifeProfile } = await fetchGamificationProfile(userId);
        if (!lifeProfile) break;
        const nextLives = Math.min(lifeProfile.lives + prize.value, lifeProfile.max_lives);

        if (!canUseSupabaseData()) {
          saveDemoProfile({ lives: nextLives, updated_at: new Date().toISOString() });
        } else {
          await supabase
            .from('gamification_profiles')
            .update({
              lives: nextLives,
            })
            .eq('user_id', userId);
        }

        void recordTelemetryEvent({
          userId,
          eventType: 'economy_earn',
          metadata: {
            currency: 'lives',
            amount: prize.value,
            balance: nextLives,
            sourceType: 'daily_spin',
            sourceId: prize.label,
          },
        });
      }
      break;
  }
}

/**
 * Map database row to frontend type
 */
function mapRowToState(row: any): DailySpinState {
  return {
    userId: row.user_id,
    lastSpinDate: row.last_spin_date,
    spinsAvailable: row.spins_available,
    totalSpinsUsed: row.total_spins_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
