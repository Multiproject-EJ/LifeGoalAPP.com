import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { DailySpinState, SpinResult, SpinPrize } from '../types/gamification';
import { SPIN_PRIZES } from '../types/gamification';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import { recordTelemetryEvent } from './telemetry';
import { fetchHolidayPreferences } from './holidayPreferences';
import { isIslandRunFeatureEnabled } from '../config/islandRunFeatureFlags';
import { clampSpinsForStrictDailyLimit, STRICT_DAILY_SPIN_LIMIT } from './dailySpinLimit';
import { formatISODate } from '../utils/appDay';

export { clampSpinsForStrictDailyLimit, STRICT_DAILY_SPIN_LIMIT };

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

const DEMO_STORAGE_KEY = 'demo_daily_spin_state';
const DEMO_HISTORY_KEY = 'lifegoal_demo_spin_history';
const DAILY_FREE_SPINS = 1;

function formatDailySpinHabitBonusDate(value = new Date()): string {
  // Local-day key so the once-per-day claim agrees with the Today tab callers
  // (which pass a local date) and with the rest of the app's day boundary.
  return formatISODate(value);
}

function buildDailySpinHabitBonusClaimKey(userId: string, claimDate: string): string {
  return `lifegoal:daily-spin-habit-bonus:${userId}:${claimDate}`;
}

type DailySpinHabitBonusClaim = {
  awarded: boolean;
  alreadyClaimed: boolean;
  state: DailySpinState | null;
};


function toDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

function getStateDayKey(state: DailySpinState): string | null {
  return toDateKey(state.updatedAt) ?? toDateKey(state.createdAt);
}

async function persistDailySpinState(options: {
  userId: string;
  currentState: DailySpinState;
  spinsAvailable: number;
}): Promise<ServiceResponse<DailySpinState>> {
  const { userId, currentState, spinsAvailable } = options;
  if (!canUseSupabaseData()) {
    const updated: DailySpinState = {
      ...currentState,
      spinsAvailable,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    return { data: updated, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('daily_spin_state' as any)
    .update({
      spins_available: spinsAvailable,
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
 * Includes streak bonus logic: +1 spin for 7+ day streaks (legacy; disabled
 * when the strict-1/day flag is on — see `clampSpinsForStrictDailyLimit`).
 */
export async function getDailySpinState(userId: string): Promise<ServiceResponse<DailySpinState>> {
  const { data: spinState, error } = await fetchDailySpinState(userId);

  if (error || !spinState) {
    return { data: null, error };
  }

  // Today's Offer Daily Spin mode: seed one free daily spin at day rollover
  // and skip legacy streak-bonus logic.
  if (isIslandRunFeatureEnabled('todaysOfferSpinEntryEnabled')) {
    const today = new Date().toISOString().split('T')[0];
    const stateDayKey = getStateDayKey(spinState);
    const shouldSeedFirstEverFreeSpin = spinState.spinsAvailable < DAILY_FREE_SPINS
      && (spinState.totalSpinsUsed ?? 0) <= 0
      && !spinState.lastSpinDate;
    const shouldSeedDailyFreeSpin = stateDayKey !== today || shouldSeedFirstEverFreeSpin;
    if (!shouldSeedDailyFreeSpin) {
      return { data: spinState, error: null };
    }
    return persistDailySpinState({
      userId,
      currentState: spinState,
      spinsAvailable: DAILY_FREE_SPINS,
    });
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

  // Strict-1/day clamp for Phase 2 unified Today's Offer rollout. No-op when
  // the `todaysOfferSpinEntryEnabled` flag is off.
  const clampedSpinsEarned = clampSpinsForStrictDailyLimit(spinsEarned);

  const today = new Date().toISOString().split('T')[0];

  // Reset to the free daily baseline on day rollover, then apply the delta.
  const isNewDay = getStateDayKey(currentState) !== today;
  const baseSpins = isNewDay ? DAILY_FREE_SPINS : currentState.spinsAvailable;
  const rawNewSpins = baseSpins + clampedSpinsEarned;
  const newSpins = clampSpinsForStrictDailyLimit(rawNewSpins);
  return persistDailySpinState({
    userId,
    currentState,
    spinsAvailable: newSpins,
  });
}


/**
 * Check whether the once-per-day habit bonus spin has already been claimed.
 * Authenticated users read the server idempotency ledger; demo/offline mode uses
 * the legacy local marker as a fallback/cache.
 */
export async function hasClaimedDailySpinHabitBonus(userId: string, claimDate = formatDailySpinHabitBonusDate()): Promise<boolean> {
  const claimKey = buildDailySpinHabitBonusClaimKey(userId, claimDate);

  if (!canUseSupabaseData()) {
    return typeof window !== 'undefined' && window.localStorage.getItem(claimKey) === '1';
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('daily_spin_habit_bonus_claims')
      .select('user_id')
      .eq('user_id', userId)
      .eq('claim_date', claimDate)
      .maybeSingle();

    if (error) {
      console.warn('Failed to check daily spin habit bonus claim:', error);
      return typeof window !== 'undefined' && window.localStorage.getItem(claimKey) === '1';
    }

    if (data && typeof window !== 'undefined') {
      window.localStorage.setItem(claimKey, '1');
    }

    return Boolean(data);
  } catch (error) {
    console.warn('Failed to check daily spin habit bonus claim:', error);
    return typeof window !== 'undefined' && window.localStorage.getItem(claimKey) === '1';
  }
}

/**
 * Claim the habit-completion bonus spin once per user/day.
 *
 * Authenticated users go through a Postgres RPC so iPad/iPhone cannot double
 * award by racing separate localStorage markers. Demo/offline mode preserves the
 * existing local marker behavior.
 */
export async function claimDailySpinHabitBonusOncePerDay(
  userId: string,
  claimDate = formatDailySpinHabitBonusDate(),
): Promise<ServiceResponse<DailySpinHabitBonusClaim>> {
  const claimKey = buildDailySpinHabitBonusClaimKey(userId, claimDate);

  if (!canUseSupabaseData()) {
    const alreadyClaimed = typeof window !== 'undefined' && window.localStorage.getItem(claimKey) === '1';
    if (alreadyClaimed) {
      const { data: state, error } = await fetchDailySpinState(userId);
      return { data: { awarded: false, alreadyClaimed: true, state }, error };
    }

    const { data: state, error } = await updateSpinsAvailable(userId, 1);
    if (!error && typeof window !== 'undefined') {
      window.localStorage.setItem(claimKey, '1');
    }
    return { data: { awarded: !error, alreadyClaimed: false, state }, error };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('claim_daily_spin_habit_bonus', {
      p_claim_date: claimDate,
    });

    if (error) {
      return { data: null, error };
    }

    const result = Array.isArray(data) ? data[0] : data;
    const awarded = Boolean(result?.claimed);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(claimKey, '1');
    }

    const { data: state, error: stateError } = await fetchDailySpinState(userId);
    return {
      data: {
        awarded,
        alreadyClaimed: !awarded,
        state,
      },
      error: stateError,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Execute a spin and award prize
 */
export type SpinRewardMultiplier = 1 | 2 | 3;

export const SPIN_REWARD_MULTIPLIER_OPTIONS: Array<{ multiplier: SpinRewardMultiplier; essenceCost: number; label: string }> = [
  { multiplier: 1, essenceCost: 0, label: 'Free' },
  { multiplier: 2, essenceCost: 25, label: 'Boost ×2' },
  { multiplier: 3, essenceCost: 60, label: 'Mega ×3' },
];

export async function getDailySpinEssenceBalance(userId: string): Promise<ServiceResponse<number>> {
  if (!canUseSupabaseData()) {
    return { data: 0, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('island_run_runtime_state' as any)
    .select('essence, essence_lifetime_spent')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  const row = data as { essence?: number } | null;
  return { data: Math.max(0, Number(row?.essence ?? 0)), error: null };
}

async function spendDailySpinEssence(userId: string, amount: number): Promise<ServiceResponse<number>> {
  if (amount <= 0) {
    return getDailySpinEssenceBalance(userId);
  }

  if (!canUseSupabaseData()) {
    return { data: 0, error: null };
  }

  const balanceResult = await getDailySpinEssenceBalance(userId);
  if (balanceResult.error || balanceResult.data === null) {
    return { data: null, error: balanceResult.error ?? new Error('Could not check essence balance') };
  }

  if (balanceResult.data < amount) {
    return { data: null, error: new Error('Not enough essence for this reward boost') };
  }

  const nextBalance = balanceResult.data - amount;
  const supabase = getSupabaseClient();
  const { data: currentRow } = await supabase
    .from('island_run_runtime_state' as any)
    .select('essence_lifetime_spent')
    .eq('user_id', userId)
    .maybeSingle();
  const lifetimeRow = currentRow as { essence_lifetime_spent?: number } | null;
  const nextLifetimeSpent = Math.max(0, Number(lifetimeRow?.essence_lifetime_spent ?? 0)) + amount;
  const { error } = await supabase
    .from('island_run_runtime_state' as any)
    .update({
      essence: nextBalance,
      essence_lifetime_spent: nextLifetimeSpent,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('user_id', userId);

  if (error) {
    return { data: null, error };
  }

  void recordTelemetryEvent({
    userId,
    eventType: 'economy_spend',
    metadata: {
      currency: 'essence',
      amount,
      balance: nextBalance,
      sourceType: 'daily_spin_multiplier',
    },
  });

  return { data: nextBalance, error: null };
}

export async function executeSpin(
  userId: string,
  options: { rewardMultiplier?: SpinRewardMultiplier; essenceCost?: number } = {},
): Promise<ServiceResponse<SpinResult>> {
  const { data: spinState, error: stateError } = await getDailySpinState(userId);

  if (stateError || !spinState) {
    return { data: null, error: stateError || new Error('Failed to fetch spin state') };
  }

  // Check if user has spins available
  if (spinState.spinsAvailable <= 0) {
    return { data: null, error: new Error('No spins available') };
  }

  const today = new Date().toISOString().split('T')[0];

  const rewardMultiplier = options.rewardMultiplier ?? 1;
  const essenceCost = options.essenceCost ?? 0;
  const multiplierOption = SPIN_REWARD_MULTIPLIER_OPTIONS.find(
    (entry) => entry.multiplier === rewardMultiplier && entry.essenceCost === essenceCost,
  );

  if (!multiplierOption) {
    return { data: null, error: new Error('Invalid spin reward multiplier') };
  }

  const spendResult = await spendDailySpinEssence(userId, essenceCost);
  if (spendResult.error) {
    return { data: null, error: spendResult.error };
  }

  // Select prize using new weighted algorithm
  const prizePool = await getSpinPrizesForUser(userId);
  const prize = getRandomPrizeFromPool(prizePool);

  // Award prize
  await awardPrize(userId, prize, rewardMultiplier);

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
 * - game_tokens → gamification_profiles.total_points (gold equivalent; not event tickets)
 * - treasure_chest → multi-currency bundle (essence + shards + dice)
 * - mystery → 1.5× random single-currency award
 * - gold (legacy) → gamification_profiles.total_points
 */
async function awardPrize(userId: string, prize: SpinPrize, rewardMultiplier = 1): Promise<void> {
  const supabase = getSupabaseClient();

  const addToProfile = async (field: string, amount: number) => {
    const { data: profile } = await fetchGamificationProfile(userId);
    if (!profile) return;
    const current = (profile as unknown as Record<string, number>)[field] ?? 0;
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
        rewardMultiplier,
      },
    });
  };

  const addToIslandRun = async (field: string, amount: number) => {
    if (!canUseSupabaseData()) {
      // Demo mode – no island_run table; fall back to profile points
      await addToProfile('total_points', amount);
      return;
    }

    const { error: rpcError } = await supabase.rpc('island_run_add_currency' as any, {
      p_user_id: userId,
      p_field: field,
      p_amount: amount,
    });

    if (rpcError) {
      // If the RPC doesn't exist yet, fall back to profile points (properly incremented)
      console.warn(`island_run_add_currency RPC failed (${field}), falling back to profile:`, rpcError.message);
      await addToProfile('total_points', amount);
    }

    void recordTelemetryEvent({
      userId,
      eventType: 'economy_earn',
      metadata: {
        currency: field,
        amount,
        sourceType: 'daily_spin',
        sourceId: prize.label,
        rewardType: prize.type,
        rewardMultiplier,
      },
    });
  };

  const scaledValue = Math.max(0, Math.floor(prize.value * rewardMultiplier));

  switch (prize.type) {
    case 'gold':
      await addToProfile('total_points', scaledValue);
      break;

    case 'essence':
      await addToIslandRun('essence', scaledValue);
      break;

    case 'shards':
      await addToIslandRun('shards', scaledValue);
      break;

    case 'dice':
      await addToIslandRun('dice_pool', scaledValue);
      break;

    case 'game_tokens':
      // Game tokens are stored as gold-equivalent for now (not timed-event tickets).
      await addToProfile('total_points', scaledValue * 10);
      break;

    case 'treasure_chest':
      // Multi-currency bundle: 20 essence + 3 shards + 10 dice
      await addToIslandRun('essence', 20 * rewardMultiplier);
      await addToIslandRun('shards', 3 * rewardMultiplier);
      await addToIslandRun('dice_pool', 10 * rewardMultiplier);
      break;

    case 'mystery': {
      // 1.5× random single-currency award
      const mysteryOptions: Array<{ field: string; amount: number; table: 'profile' | 'island' }> = [
        { field: 'essence', amount: 40 * rewardMultiplier, table: 'island' },
        { field: 'shards', amount: 5 * rewardMultiplier, table: 'island' },
        { field: 'dice_pool', amount: 18 * rewardMultiplier, table: 'island' },
        { field: 'total_points', amount: 50 * rewardMultiplier, table: 'profile' },
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
