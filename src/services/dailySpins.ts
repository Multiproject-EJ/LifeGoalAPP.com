// Service for managing daily spins (one spin per day, resets at midnight)

import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { 
  SpinWheelPrize, 
  DailySpinRecord, 
  SpinAvailability 
} from '../features/spin-wheel/types';
import { DAILY_SPIN_PRIZES } from '../features/spin-wheel/types';
import { awardXP } from './gamification';

const DEMO_STORAGE_KEY = 'demo_daily_spins';

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if user can spin today and get today's spin if it exists
 */
export async function checkSpinAvailable(
  userId: string
): Promise<{ data: SpinAvailability | null; error: Error | null }> {
  const today = getTodayDate();

  if (!canUseSupabaseData()) {
    // Demo mode: use localStorage
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      const spins: DailySpinRecord[] = stored ? JSON.parse(stored) : [];
      const todaysSpin = spins.find((s) => s.user_id === userId && s.spin_date === today);

      return {
        data: {
          available: !todaysSpin,
          lastSpinDate: todaysSpin?.spin_date || null,
          todaysSpin: todaysSpin || null,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  try {
    const supabase = getSupabaseClient();
    
    // Check if user has already spun today
    // Note: daily_spins table will be created separately via SQL migration
    const { data: todaysSpin, error } = await supabase
      .from('daily_spins' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('spin_date', today)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return {
      data: {
        available: !todaysSpin,
        lastSpinDate: (todaysSpin as any)?.spin_date || null,
        todaysSpin: todaysSpin as unknown as DailySpinRecord | null,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Get today's spin if it exists
 */
export async function getTodaysSpin(
  userId: string
): Promise<{ data: DailySpinRecord | null; error: Error | null }> {
  const today = getTodayDate();

  if (!canUseSupabaseData()) {
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      const spins: DailySpinRecord[] = stored ? JSON.parse(stored) : [];
      const todaysSpin = spins.find((s) => s.user_id === userId && s.spin_date === today);
      return { data: todaysSpin || null, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('daily_spins' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('spin_date', today)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return { data: data as DailySpinRecord | null, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Select a random prize based on weighted probabilities
 */
function selectRandomPrize(): SpinWheelPrize {
  const random = Math.random() * 100; // 0-100
  let cumulative = 0;

  for (const prize of DAILY_SPIN_PRIZES) {
    cumulative += prize.probability;
    if (random <= cumulative) {
      return prize;
    }
  }

  // Fallback (should never reach if probabilities sum to 100)
  return DAILY_SPIN_PRIZES[0];
}

/**
 * Record a spin and award the prize
 */
export async function recordSpin(
  userId: string,
  prize: SpinWheelPrize
): Promise<{ data: DailySpinRecord | null; error: Error | null }> {
  const today = getTodayDate();

  // Check if user already spun today
  const { data: availability } = await checkSpinAvailable(userId);
  if (availability && !availability.available) {
    return { 
      data: null, 
      error: new Error('Already spun today. Come back tomorrow!') 
    };
  }

  if (!canUseSupabaseData()) {
    // Demo mode
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      const spins: DailySpinRecord[] = stored ? JSON.parse(stored) : [];

      const newSpin: DailySpinRecord = {
        id: `demo-${Date.now()}`,
        user_id: userId,
        spin_date: today,
        prize_id: prize.id,
        prize_type: prize.type,
        prize_value: prize.value,
        claimed: false,
        created_at: new Date().toISOString(),
      };

      spins.push(newSpin);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(spins));

      // Award prize
      await awardPrize(userId, prize);

      return { data: newSpin, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('daily_spins' as any)
      .insert({
        user_id: userId,
        spin_date: today,
        prize_id: prize.id,
        prize_type: prize.type,
        prize_value: prize.value,
        claimed: false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Award prize
    await awardPrize(userId, prize);

    return { data: data as unknown as DailySpinRecord, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Execute a complete spin: select prize and record it
 */
export async function executeDailySpin(
  userId: string
): Promise<{ data: { spin: DailySpinRecord; prize: SpinWheelPrize } | null; error: Error | null }> {
  // Select random prize
  const prize = selectRandomPrize();

  // Record spin
  const { data: spin, error } = await recordSpin(userId, prize);

  if (error || !spin) {
    return { data: null, error: error || new Error('Failed to record spin') };
  }

  return {
    data: { spin, prize },
    error: null,
  };
}

/**
 * Award prize to user based on prize type
 */
async function awardPrize(userId: string, prize: SpinWheelPrize): Promise<void> {
  switch (prize.type) {
    case 'XP':
      // Award XP using existing gamification system
      await awardXP(userId, prize.value, 'daily_login', undefined, `Daily spin: ${prize.name}`);
      break;

    case 'CASH':
      // Virtual currency - would need to add to user profile if currency system exists
      // For now, just log it
      console.log(`Awarded ${prize.value} cash to user ${userId}`);
      // TODO: Implement virtual currency system
      break;

    case 'GAME_LIVES':
      // Add lives to gamification profile
      if (canUseSupabaseData()) {
        const supabase = getSupabaseClient();
        const { data: profile } = await supabase
          .from('gamification_profiles')
          .select('lives, max_lives')
          .eq('user_id', userId)
          .single();

        if (profile) {
          const newLives = Math.min(profile.lives + prize.value, profile.max_lives);
          await supabase
            .from('gamification_profiles')
            .update({ lives: newLives })
            .eq('user_id', userId);
        }
      }
      break;

    case 'FEATURE_UNLOCK':
      // Track feature unlocks - could store in user preferences
      console.log(`Unlocked feature: ${prize.name} for user ${userId}`);
      // TODO: Implement feature unlock tracking
      break;

    case 'TASK_BONUS':
      // Special task reward - could give bonus XP or special task
      console.log(`Task bonus awarded to user ${userId}`);
      // TODO: Implement task bonus system
      break;

    case 'EMPTY':
      // No reward
      break;

    default:
      console.warn(`Unknown prize type: ${prize.type}`);
  }
}
