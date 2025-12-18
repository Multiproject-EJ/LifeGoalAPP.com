import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { DailySpinState, SpinResult, SpinPrize, PrizeType } from '../types/gamification';
import { SPIN_PRIZES, PRIZE_WEIGHTS } from '../types/gamification';
import { awardXP } from './gamification';
import { fetchGamificationProfile } from './gamificationPrefs';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

const DEMO_STORAGE_KEY = 'demo_daily_spin_state';

/**
 * Fetch or initialize daily spin state for user
 */
export async function fetchDailySpinState(userId: string): Promise<ServiceResponse<DailySpinState>> {
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
    .from('daily_spin_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    // Initialize state
    const { data: newState, error: insertError } = await supabase
      .from('daily_spin_state')
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
 * Update spins available based on habit completion
 */
export async function updateSpinsAvailable(userId: string, spinsEarned: number): Promise<ServiceResponse<DailySpinState>> {
  const { data: currentState, error: fetchError } = await fetchDailySpinState(userId);

  if (fetchError || !currentState) {
    return { data: null, error: fetchError };
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Reset spins if it's a new day
  const newSpins = currentState.lastSpinDate === today 
    ? Math.max(currentState.spinsAvailable, spinsEarned)
    : spinsEarned;

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
    .from('daily_spin_state')
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
 * Select a random prize based on weighted probabilities
 */
function selectRandomPrize(): SpinPrize {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (let i = 0; i < SPIN_PRIZES.length; i++) {
    cumulative += PRIZE_WEIGHTS[i];
    if (random <= cumulative) {
      return { ...SPIN_PRIZES[i] };
    }
  }

  // Fallback (should never reach)
  return { ...SPIN_PRIZES[0] };
}

/**
 * Generate mystery prize
 */
function generateMysteryPrize(): SpinPrize {
  const mysteryOptions = [
    { type: 'xp' as PrizeType, value: 100, label: '100 XP', icon: '✨' },
    { type: 'xp' as PrizeType, value: 200, label: '200 XP', icon: '✨' },
    { type: 'xp' as PrizeType, value: 500, label: '500 XP (JACKPOT!)', icon: '🌟' },
    { type: 'points' as PrizeType, value: 100, label: '100 Points', icon: '💎' },
    { type: 'points' as PrizeType, value: 200, label: '200 Points', icon: '💎' },
    { type: 'streak_freeze' as PrizeType, value: 3, label: '3 Streak Freezes', icon: '🛡️' },
  ];

  const randomIndex = Math.floor(Math.random() * mysteryOptions.length);
  return mysteryOptions[randomIndex];
}

/**
 * Execute a spin and award prize
 */
export async function executeSpin(userId: string): Promise<ServiceResponse<SpinResult>> {
  const { data: spinState, error: stateError } = await fetchDailySpinState(userId);

  if (stateError || !spinState) {
    return { data: null, error: stateError || new Error('Failed to fetch spin state') };
  }

  // Check if user has spins available
  if (spinState.spinsAvailable <= 0) {
    return { data: null, error: new Error('No spins available') };
  }

  const today = new Date().toISOString().split('T')[0];

  // Check cooldown (can't spin twice on same day)
  if (spinState.lastSpinDate === today) {
    return { data: null, error: new Error('Already spun today') };
  }

  // Select prize
  let prize = selectRandomPrize();

  // Handle mystery prize
  if (prize.type === 'mystery') {
    prize = generateMysteryPrize();
    prize.details = { wasMystery: true };
  }

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

    return {
      data: {
        prize,
        spinsRemaining: newSpinsAvailable,
      },
      error: null,
    };
  }

  const supabase = getSupabaseClient();

  // Update state
  await supabase
    .from('daily_spin_state')
    .update({
      last_spin_date: today,
      spins_available: newSpinsAvailable,
      total_spins_used: spinState.totalSpinsUsed + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Log spin history
  await supabase.from('spin_history').insert({
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
      if (!canUseSupabaseData()) {
        // In demo mode, we'd update localStorage, but for simplicity we'll skip
        break;
      }
      const { data: profile } = await fetchGamificationProfile(userId);
      if (profile) {
        await supabase
          .from('gamification_profiles')
          .update({
            total_points: profile.total_points + prize.value,
          })
          .eq('user_id', userId);
      }
      break;

    case 'streak_freeze':
      if (!canUseSupabaseData()) {
        break;
      }
      const { data: freezeProfile } = await fetchGamificationProfile(userId);
      if (freezeProfile) {
        await supabase
          .from('gamification_profiles')
          .update({
            streak_freezes: freezeProfile.streak_freezes + prize.value,
          })
          .eq('user_id', userId);
      }
      break;

    case 'life':
      if (!canUseSupabaseData()) {
        break;
      }
      const { data: lifeProfile } = await fetchGamificationProfile(userId);
      if (lifeProfile) {
        await supabase
          .from('gamification_profiles')
          .update({
            lives: Math.min(
              lifeProfile.lives + prize.value,
              lifeProfile.max_lives
            ),
          })
          .eq('user_id', userId);
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
