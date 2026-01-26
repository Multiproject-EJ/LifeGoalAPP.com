import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { DailySpinState, SpinResult, SpinPrize } from '../types/gamification';
import { SPIN_PRIZES } from '../types/gamification';
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
  if (SPIN_PRIZES.length === 0) {
    return { type: 'points', value: 0, label: '0 Points', icon: '💎' };
  }

  const totalWeight = SPIN_PRIZES.reduce((sum, prize) => sum + (prize.wheelWeight ?? 1), 0);
  let roll = Math.random() * totalWeight;

  for (const prize of SPIN_PRIZES) {
    roll -= prize.wheelWeight ?? 1;
    if (roll <= 0) {
      return prize;
    }
  }

  return SPIN_PRIZES[0];
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
    case 'points':
    case 'treasure_chest':
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
            rewardType: prize.type,
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
