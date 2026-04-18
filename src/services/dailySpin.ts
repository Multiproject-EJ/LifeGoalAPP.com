import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { DailySpinState, SpinResult, SpinPrize } from '../types/gamification';
import { SPIN_PRIZES } from '../types/gamification';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import { recordTelemetryEvent } from './telemetry';
import { fetchHolidayPreferences } from './holidayPreferences';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

const DEMO_STORAGE_KEY = 'demo_daily_spin_state';
const DEMO_HISTORY_KEY = 'lifegoal_demo_spin_history';

function buildChristmasPrizes(basePrizes: SpinPrize[]): SpinPrize[] {
  const updatedPrizes = [...basePrizes];
  const chestIndex = updatedPrizes.findIndex((prize) => prize.type === 'treasure_chest');
  const mysteryIndex = updatedPrizes.findIndex((prize) => prize.type === 'mystery');

  if (chestIndex >= 0) {
    updatedPrizes[chestIndex] = {
      ...updatedPrizes[chestIndex],
      icon: '🎅',
      label: 'Santa Surprise',
      details: {
        ...(updatedPrizes[chestIndex].details ?? {}),
        specialReward: true,
        holiday: 'christmas',
      },
    };
  }

  if (mysteryIndex >= 0) {
    updatedPrizes[mysteryIndex] = {
      ...updatedPrizes[mysteryIndex],
      icon: '🎄',
      label: 'Holiday Magic',
      details: {
        ...(updatedPrizes[mysteryIndex].details ?? {}),
        specialReward: true,
        holiday: 'christmas',
      },
    };
  }

  return updatedPrizes;
}

export async function getSpinPrizesForUser(userId: string): Promise<SpinPrize[]> {
  const isDecember = new Date().getMonth() === 11;
  if (!isDecember || !canUseSupabaseData()) {
    return SPIN_PRIZES;
  }

  const { data: holidayPreferences } = await fetchHolidayPreferences(userId);
  const christmasEnabled = Boolean(holidayPreferences?.holidays?.christmas);

  if (!christmasEnabled) {
    return SPIN_PRIZES;
  }

  return buildChristmasPrizes(SPIN_PRIZES);
}

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
    return { type: 'gold', value: 0, label: '0 Gold', icon: '🪙' };
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

function getRandomPrizeFromPool(prizes: SpinPrize[]): SpinPrize {
  if (prizes.length === 0) {
    return { type: 'gold', value: 0, label: '0 Gold', icon: '🪙' };
  }

  const totalWeight = prizes.reduce((sum, prize) => sum + (prize.wheelWeight ?? 1), 0);
  let roll = Math.random() * totalWeight;

  for (const prize of prizes) {
    roll -= prize.wheelWeight ?? 1;
    if (roll <= 0) {
      return prize;
    }
  }

  return prizes[0];
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
  const prizePool = await getSpinPrizesForUser(userId);
  const prize = getRandomPrizeFromPool(prizePool);

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
 * Award prize to user — supports multiple currencies aligned with the island-run economy.
 *
 * - essence → island_run.essence (via gamification_profiles for now)
 * - shards → island_run.shards
 * - dice → island_run.dice_pool
 * - game_tokens → gamification_profiles.total_points (gold equivalent)
 * - treasure_chest → multi-currency bundle (essence + shards + dice)
 * - mystery → 1.5× random single-currency award
 * - gold (legacy) → gamification_profiles.total_points
 */
async function awardPrize(userId: string, prize: SpinPrize): Promise<void> {
  const supabase = getSupabaseClient();

  const addToProfile = async (field: string, amount: number) => {
    const { data: profile } = await fetchGamificationProfile(userId);
    if (!profile) return;
    const current = (profile as Record<string, number>)[field] ?? 0;
    const next = current + amount;

    if (!canUseSupabaseData()) {
      saveDemoProfile({ [field]: next, updated_at: new Date().toISOString() });
    } else {
      await supabase
        .from('gamification_profiles')
        .update({ [field]: next })
        .eq('user_id', userId);
    }

    void recordTelemetryEvent({
      userId,
      eventType: 'economy_earn',
      metadata: {
        currency: field,
        amount,
        balance: next,
        sourceType: 'daily_spin',
        sourceId: prize.label,
        rewardType: prize.type,
      },
    });
  };

  const addToIslandRun = async (field: string, amount: number) => {
    if (!canUseSupabaseData()) {
      // Demo mode – no island_run table; fall back to profile points
      await addToProfile('total_points', amount);
      return;
    }

    await supabase.rpc('island_run_add_currency' as any, {
      p_user_id: userId,
      p_field: field,
      p_amount: amount,
    }).then(({ error }) => {
      // If the RPC doesn't exist yet, fall back to a direct update
      if (error) {
        console.warn(`island_run_add_currency RPC failed (${field}), falling back:`, error.message);
        return supabase
          .from('island_run' as any)
          .update({ [field]: amount } as any)
          .eq('user_id', userId);
      }
    });

    void recordTelemetryEvent({
      userId,
      eventType: 'economy_earn',
      metadata: {
        currency: field,
        amount,
        sourceType: 'daily_spin',
        sourceId: prize.label,
        rewardType: prize.type,
      },
    });
  };

  switch (prize.type) {
    case 'gold':
      await addToProfile('total_points', prize.value);
      break;

    case 'essence':
      await addToIslandRun('essence', prize.value);
      break;

    case 'shards':
      await addToIslandRun('shards', prize.value);
      break;

    case 'dice':
      await addToIslandRun('dice_pool', prize.value);
      break;

    case 'game_tokens':
      // Game tokens are stored as gold-equivalent for now
      await addToProfile('total_points', prize.value * 10);
      break;

    case 'treasure_chest':
      // Multi-currency bundle: 20 essence + 3 shards + 10 dice
      await addToIslandRun('essence', 20);
      await addToIslandRun('shards', 3);
      await addToIslandRun('dice_pool', 10);
      break;

    case 'mystery': {
      // 1.5× random single-currency award
      const mysteryOptions: Array<{ field: string; amount: number; table: 'profile' | 'island' }> = [
        { field: 'essence', amount: 40, table: 'island' },
        { field: 'shards', amount: 5, table: 'island' },
        { field: 'dice_pool', amount: 18, table: 'island' },
        { field: 'total_points', amount: 50, table: 'profile' },
      ];
      const pick = mysteryOptions[Math.floor(Math.random() * mysteryOptions.length)];
      if (pick.table === 'profile') {
        await addToProfile(pick.field, pick.amount);
      } else {
        await addToIslandRun(pick.field, pick.amount);
      }
      break;
    }

    default:
      console.warn(`Unknown prize type: ${prize.type}`);
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
