import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { PowerUp, UserPowerUp, PurchaseResult, ActiveBoost } from '../types/gamification';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import { awardXP } from './gamification';
import { recordTelemetryEvent } from './telemetry';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

const DEMO_POWERUPS_KEY = 'demo_user_powerups';

/**
 * Fetch all available power-ups from catalog
 */
export async function fetchPowerUpsCatalog(): Promise<ServiceResponse<PowerUp[]>> {
  if (!canUseSupabaseData()) {
    // Return full Phase 2 demo catalog
    const demoCatalog: PowerUp[] = [
      // BOOSTS
      {
        id: 'demo-1',
        powerUpKey: 'xp_boost_1h_2x',
        name: '2x XP Boost (1 hour)',
        description: 'Double all XP gains for 1 hour',
        icon: '⚡',
        type: 'temporary',
        costGold: 50,
        effectType: 'xp_multiplier',
        effectValue: 2,
        durationMinutes: 60,
        category: 'boosts',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-2',
        powerUpKey: 'xp_boost_1h_5x',
        name: '5x XP Boost (1 hour)',
        description: 'Quintuple all XP gains for 1 hour',
        icon: '🚀',
        type: 'temporary',
        costGold: 200,
        effectType: 'xp_multiplier',
        effectValue: 5,
        durationMinutes: 60,
        category: 'boosts',
        isActive: true,
        sortOrder: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-3',
        powerUpKey: 'perfect_day',
        name: 'Perfect Day Guarantee',
        description: 'Ensures all habits count as completed today',
        icon: '✨',
        type: 'temporary',
        costGold: 300,
        effectType: 'instant_xp',
        effectValue: 100,
        durationMinutes: null,
        category: 'boosts',
        isActive: true,
        sortOrder: 3,
        createdAt: new Date().toISOString(),
      },
      // PROTECTION
      {
        id: 'demo-4',
        powerUpKey: 'streak_freeze_1',
        name: 'Streak Freeze (1 use)',
        description: 'Protects your streak for one missed day',
        icon: '🛡️',
        type: 'temporary',
        costGold: 100,
        effectType: 'streak_freeze',
        effectValue: 1,
        durationMinutes: null,
        category: 'protection',
        isActive: true,
        sortOrder: 10,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-5',
        powerUpKey: 'extra_life_1',
        name: 'Extra Life (1 heart)',
        description: 'Adds one life to your total',
        icon: '❤️',
        type: 'temporary',
        costGold: 75,
        effectType: 'extra_life',
        effectValue: 1,
        durationMinutes: null,
        category: 'protection',
        isActive: true,
        sortOrder: 11,
        createdAt: new Date().toISOString(),
      },
      // UPGRADES
      {
        id: 'demo-6',
        powerUpKey: 'max_lives_plus_1',
        name: 'Max Lives +1',
        description: 'Permanently increase maximum lives by 1',
        icon: '💪',
        type: 'permanent',
        costGold: 500,
        effectType: 'max_lives_increase',
        effectValue: 1,
        durationMinutes: null,
        category: 'upgrades',
        isActive: true,
        sortOrder: 20,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-7',
        powerUpKey: 'freeze_bank_plus_1',
        name: 'Streak Freeze Bank +1',
        description: 'Permanently increase freeze capacity by 1',
        icon: '🏦',
        type: 'permanent',
        costGold: 750,
        effectType: 'freeze_bank_increase',
        effectValue: 1,
        durationMinutes: null,
        category: 'upgrades',
        isActive: true,
        sortOrder: 21,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-8',
        powerUpKey: 'daily_spin_plus_1',
        name: 'Daily Spin +1',
        description: 'Add one extra daily spin permanently',
        icon: '🎰',
        type: 'permanent',
        costGold: 1000,
        effectType: 'daily_spin_increase',
        effectValue: 1,
        durationMinutes: null,
        category: 'upgrades',
        isActive: true,
        sortOrder: 22,
        createdAt: new Date().toISOString(),
      },
    ];
    return { data: demoCatalog, error: null };
  }

  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('power_ups' as any)
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching power-ups catalog:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.warn('No power-ups found in catalog. Run migration 0111_power_ups_store.sql');
      return { data: [], error: null };
    }

    return { data: data.map(mapRowToPowerUp), error: null };
  } catch (err) {
    console.error('Unexpected error fetching power-ups:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch user's purchased power-ups
 */
export async function fetchUserPowerUps(userId: string): Promise<ServiceResponse<UserPowerUp[]>> {
  if (!canUseSupabaseData()) {
    try {
      const stored = localStorage.getItem(`${DEMO_POWERUPS_KEY}_${userId}`);
      const powerups = stored ? JSON.parse(stored) : [];
      return { data: powerups, error: null };
    } catch (err) {
      return { data: [], error: err as Error };
    }
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_power_ups' as any)
    .select(`
      *,
      power_up:power_ups(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error };
  }

  return { data: data.map(mapRowToUserPowerUp), error: null };
}

/**
 * Get currently active power-ups for user
 */
export async function getActivePowerUps(userId: string): Promise<ServiceResponse<ActiveBoost[]>> {
  const { data: userPowerUps, error } = await fetchUserPowerUps(userId);

  if (error || !userPowerUps) {
    return { data: null, error };
  }

  const now = new Date();
  const active: ActiveBoost[] = [];

  for (const up of userPowerUps) {
    if (!up.isActive || up.isConsumed) continue;

    // Check if expired
    if (up.expiresAt) {
      const expires = new Date(up.expiresAt);
      if (expires <= now) {
        // Mark as inactive
        await deactivatePowerUp(up.id, userId);
        continue;
      }
    }

    const minutesRemaining = up.expiresAt
      ? Math.max(0, Math.floor((new Date(up.expiresAt).getTime() - now.getTime()) / 60000))
      : null;

    active.push({
      id: up.id,
      name: up.powerUp?.name || 'Unknown',
      icon: up.powerUp?.icon || '❓',
      effectType: up.powerUp?.effectType || 'instant_xp',
      effectValue: up.powerUp?.effectValue || 0,
      expiresAt: up.expiresAt,
      minutesRemaining,
    });
  }

  return { data: active, error: null };
}

/**
 * Get active XP multiplier (for use in awardXP)
 */
export async function getActiveXPMultiplier(userId: string): Promise<number> {
  const { data: active } = await getActivePowerUps(userId);

  if (!active || active.length === 0) return 1.0;

  // Find highest XP multiplier
  const multipliers = active
    .filter(boost => boost.effectType === 'xp_multiplier')
    .map(boost => boost.effectValue);

  if (multipliers.length === 0) return 1.0;

  return Math.max(...multipliers);
}

/**
 * Purchase a power-up
 */
export async function purchasePowerUp(
  userId: string,
  powerUpId: string
): Promise<ServiceResponse<PurchaseResult>> {
  const { data: profile, error: profileError } = await fetchGamificationProfile(userId);

  if (profileError || !profile) {
    return { data: null, error: profileError || new Error('Profile not found') };
  }

  const { data: catalog, error: catalogError } = await fetchPowerUpsCatalog();

  if (catalogError || !catalog) {
    return { data: null, error: catalogError || new Error('Catalog not found') };
  }

  const powerUp = catalog.find(p => p.id === powerUpId);

  if (!powerUp) {
    return { data: null, error: new Error('Power-up not found') };
  }

  // Check if user has enough gold
  if (profile.total_points < powerUp.costGold) {
    return { data: null, error: new Error('Not enough gold') };
  }

  // Handle instant effects vs activatable items
  // Instant: immediately applied and consumed (permanent upgrades, instant XP, extra life, etc.)
  // Timed: activated with duration (XP multipliers)
  const isInstant = [
    'instant_xp', 
    'extra_life', 
    'streak_freeze',
    'spin_token', 
    'mystery',
    'max_lives_increase',
    'freeze_bank_increase',
    'daily_spin_increase'
  ].includes(powerUp.effectType);

  const now = new Date();
  const activatedAt = isInstant ? now.toISOString() : null;
  const expiresAt = isInstant
    ? null
    : powerUp.durationMinutes
    ? new Date(now.getTime() + powerUp.durationMinutes * 60000).toISOString()
    : null;

  // Create user power-up record
  if (!canUseSupabaseData()) {
    const userPowerUp: UserPowerUp = {
      id: `demo-${Date.now()}`,
      userId,
      powerUpId,
      purchasedAt: now.toISOString(),
      activatedAt,
      expiresAt,
      isActive: isInstant,
      isConsumed: false,
      createdAt: now.toISOString(),
      powerUp,
    };

    // Save to localStorage
    const stored = localStorage.getItem(`${DEMO_POWERUPS_KEY}_${userId}`);
    const existing = stored ? JSON.parse(stored) : [];
    existing.push(userPowerUp);
    localStorage.setItem(`${DEMO_POWERUPS_KEY}_${userId}`, JSON.stringify(existing));

    // Deduct gold
    const newBalance = profile.total_points - powerUp.costGold;
    saveDemoProfile({ ...profile, total_points: newBalance });

    // Apply instant effect
    let effectApplied = '';
    if (isInstant) {
      effectApplied = await applyInstantEffect(userId, powerUp, profile);
    }

    void recordTelemetryEvent({
      userId,
      eventType: 'economy_spend',
      metadata: {
        currency: 'gold',
        amount: powerUp.costGold,
        balance: newBalance,
        sourceType: 'power_up',
        sourceId: powerUp.id,
        itemName: powerUp.name,
        effectType: powerUp.effectType,
      },
    });

    return {
      data: {
        success: true,
        userPowerUp,
        newGoldBalance: newBalance,
        effectApplied,
      },
      error: null,
    };
  }

  const supabase = getSupabaseClient();

  // Insert user power-up
  const { data: newUserPowerUp, error: insertError } = await supabase
    .from('user_power_ups' as any)
    .insert({
      user_id: userId,
      power_up_id: powerUpId,
      activated_at: activatedAt,
      expires_at: expiresAt,
      is_active: isInstant,
      is_consumed: false,
    })
    .select()
    .single();

  if (insertError) {
    return { data: null, error: insertError };
  }

  // Deduct gold
  const { error: updateError } = await supabase
    .from('gamification_profiles')
    .update({ total_points: profile.total_points - powerUp.costGold })
    .eq('user_id', userId);

  if (updateError) {
    return { data: null, error: updateError };
  }

  // Log transaction
  await supabase.from('power_up_transactions' as any).insert({
    user_id: userId,
    power_up_id: powerUpId,
    action: 'purchase',
    points_spent: powerUp.costGold,
  });

  void recordTelemetryEvent({
    userId,
    eventType: 'economy_spend',
    metadata: {
      currency: 'gold',
      amount: powerUp.costGold,
      balance: profile.total_points - powerUp.costGold,
      sourceType: 'power_up',
      sourceId: powerUp.id,
      itemName: powerUp.name,
      effectType: powerUp.effectType,
    },
  });

  // Apply instant effect
  let effectApplied = '';
  if (isInstant) {
    effectApplied = await applyInstantEffect(userId, powerUp, profile);
  }

  return {
    data: {
      success: true,
      userPowerUp: mapRowToUserPowerUp({ ...(newUserPowerUp as any), power_up: powerUp }),
      newGoldBalance: profile.total_points - powerUp.costGold,
      effectApplied,
    },
    error: null,
  };
}

/**
 * Apply instant effect (XP, life, spin token, etc.)
 */
async function applyInstantEffect(userId: string, powerUp: PowerUp, profile: any): Promise<string> {
  const supabase = getSupabaseClient();

  switch (powerUp.effectType) {
    case 'instant_xp':
      await awardXP(userId, powerUp.effectValue, 'daily_login', undefined, `Power-up: ${powerUp.name}`);
      return `Awarded ${powerUp.effectValue} XP`;

    case 'extra_life':
      if (!canUseSupabaseData()) {
        saveDemoProfile({
          ...profile,
          lives: Math.min(profile.lives + powerUp.effectValue, profile.max_lives),
        });
      } else {
        await supabase
          .from('gamification_profiles')
          .update({
            lives: Math.min(profile.lives + powerUp.effectValue, profile.max_lives),
          })
          .eq('user_id', userId);
      }
      return `Added ${powerUp.effectValue} life`;

    case 'spin_token':
      // Add spin token
      if (!canUseSupabaseData()) {
        // Demo mode - skip
      } else {
        // Get current spin state
        const { data: spinState } = await supabase
          .from('daily_spin_state' as any)
          .select('spins_available')
          .eq('user_id', userId)
          .single();

        if (spinState) {
          await supabase
            .from('daily_spin_state' as any)
            .update({
              spins_available: (spinState as any).spins_available + powerUp.effectValue,
            })
            .eq('user_id', userId);
        }
      }
      return `Added ${powerUp.effectValue} spin token`;

    case 'mystery':
      // Generate random reward
      const rewards = [
        { type: 'xp', value: 200, label: '200 XP' },
        { type: 'xp', value: 500, label: '500 XP' },
        { type: 'xp', value: 1000, label: '1000 XP (JACKPOT!)' },
        { type: 'gold', value: 100, label: '100 Gold' },
        { type: 'gold', value: 300, label: '300 Gold' },
        { type: 'freeze', value: 5, label: '5 Streak Freezes' },
      ];
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];

      if (randomReward.type === 'xp') {
        await awardXP(userId, randomReward.value, 'daily_login', undefined, 'Mystery Chest');
      } else if (randomReward.type === 'gold') {
        if (!canUseSupabaseData()) {
          saveDemoProfile({ ...profile, total_points: profile.total_points + randomReward.value });
        } else {
          await supabase
            .from('gamification_profiles')
            .update({ total_points: profile.total_points + randomReward.value })
            .eq('user_id', userId);
        }
      } else if (randomReward.type === 'freeze') {
        if (!canUseSupabaseData()) {
          saveDemoProfile({
            ...profile,
            streak_freezes: profile.streak_freezes + randomReward.value,
          });
        } else {
          await supabase
            .from('gamification_profiles')
            .update({
              streak_freezes: profile.streak_freezes + randomReward.value,
            })
            .eq('user_id', userId);
        }
      }

      return `Mystery Chest: ${randomReward.label}!`;

    case 'streak_freeze':
      if (!canUseSupabaseData()) {
        const capacity = profile.freeze_bank_capacity || 3;
        saveDemoProfile({
          ...profile,
          streak_freezes: Math.min(profile.streak_freezes + powerUp.effectValue, capacity),
        });
      } else {
        // Get capacity from profile
        const { data: currentProfile } = await supabase
          .from('gamification_profiles')
          .select('streak_freezes, freeze_bank_capacity')
          .eq('user_id', userId)
          .single();
        
        const capacity = (currentProfile as any)?.freeze_bank_capacity || 3;
        await supabase
          .from('gamification_profiles')
          .update({
            streak_freezes: Math.min(
              ((currentProfile as any)?.streak_freezes || 0) + powerUp.effectValue,
              capacity
            ),
          })
          .eq('user_id', userId);
      }
      return `Added ${powerUp.effectValue} streak freeze`;

    case 'max_lives_increase':
    case 'freeze_bank_increase':
    case 'daily_spin_increase':
      // Apply permanent upgrade
      await applyPermanentUpgrade(userId, powerUp.effectType, powerUp.effectValue);
      return `Permanently upgraded: ${powerUp.name}`;

    default:
      return 'Effect applied';
  }
}

/**
 * Activate a purchased power-up (for non-instant items)
 */
export async function activatePowerUp(userPowerUpId: string, userId: string): Promise<ServiceResponse<boolean>> {
  if (!canUseSupabaseData()) {
    // Demo mode - mark as active in localStorage
    const stored = localStorage.getItem(`${DEMO_POWERUPS_KEY}_${userId}`);
    if (stored) {
      const powerups = JSON.parse(stored);
      const updated = powerups.map((p: any) =>
        p.id === userPowerUpId
          ? {
              ...p,
              isActive: true,
              activatedAt: new Date().toISOString(),
              expiresAt: p.powerUp?.durationMinutes
                ? new Date(Date.now() + p.powerUp.durationMinutes * 60000).toISOString()
                : null,
            }
          : p
      );
      localStorage.setItem(`${DEMO_POWERUPS_KEY}_${userId}`, JSON.stringify(updated));
    }
    return { data: true, error: null };
  }

  const supabase = getSupabaseClient();

  // Get power-up details to calculate expiration
  const { data: userPowerUp } = await supabase
    .from('user_power_ups' as any)
    .select('*, power_up:power_ups(*)')
    .eq('id', userPowerUpId)
    .eq('user_id', userId)
    .single();

  if (!userPowerUp) {
    return { data: null, error: new Error('Power-up not found') };
  }

  const now = new Date();
  const expiresAt = (userPowerUp as any).power_up.duration_minutes
    ? new Date(now.getTime() + (userPowerUp as any).power_up.duration_minutes * 60000).toISOString()
    : null;

  const { error } = await supabase
    .from('user_power_ups' as any)
    .update({
      is_active: true,
      activated_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .eq('id', userPowerUpId)
    .eq('user_id', userId);

  if (error) {
    return { data: null, error };
  }

  // Log activation
  await supabase.from('power_up_transactions' as any).insert({
    user_id: userId,
    power_up_id: (userPowerUp as any).power_up_id,
    action: 'activate',
    points_spent: 0,
  });

  return { data: true, error: null };
}

/**
 * Check and expire power-ups that have passed their expiration time
 */
export async function checkAndExpirePowerUps(userId: string): Promise<ServiceResponse<number>> {
  const { data: userPowerUps, error } = await fetchUserPowerUps(userId);

  if (error || !userPowerUps) {
    return { data: null, error };
  }

  const now = new Date();
  let expiredCount = 0;

  for (const up of userPowerUps) {
    if (up.isActive && !up.isConsumed && up.expiresAt) {
      const expires = new Date(up.expiresAt);
      if (expires <= now) {
        await deactivatePowerUp(up.id, userId);
        expiredCount++;
      }
    }
  }

  return { data: expiredCount, error: null };
}

/**
 * Apply permanent upgrade effect to user profile
 */
export async function applyPermanentUpgrade(
  userId: string,
  effectType: string,
  value: number
): Promise<ServiceResponse<boolean>> {
  const supabase = getSupabaseClient();

  if (!canUseSupabaseData()) {
    // Demo mode
    const { data: profile, error: profileError } = await fetchGamificationProfile(userId);
    if (profileError || !profile) {
      return { data: null, error: profileError || new Error('Profile not found') };
    }

    let updatedProfile = { ...profile };

    switch (effectType) {
      case 'max_lives_increase':
        updatedProfile = { ...updatedProfile, max_lives: profile.max_lives + value };
        break;
      case 'freeze_bank_increase':
        updatedProfile = { 
          ...updatedProfile, 
          freeze_bank_capacity: (profile.freeze_bank_capacity || 3) + value 
        };
        break;
      case 'daily_spin_increase':
        // In demo mode, we can't directly modify spin state
        // This would be handled by the spin wheel service
        break;
      default:
        return { data: null, error: new Error(`Unknown effect type: ${effectType}`) };
    }

    saveDemoProfile(updatedProfile);
    return { data: true, error: null };
  }

  // Supabase mode - use the database function
  try {
    const { error } = await supabase.rpc('apply_permanent_upgrade' as any, {
      p_user_id: userId,
      p_effect_type: effectType,
      p_effect_value: value,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Deactivate expired power-up
 */
async function deactivatePowerUp(userPowerUpId: string, userId: string): Promise<void> {
  if (!canUseSupabaseData()) return;

  const supabase = getSupabaseClient();

  await supabase
    .from('user_power_ups' as any)
    .update({ is_active: false })
    .eq('id', userPowerUpId)
    .eq('user_id', userId);

  // Log expiration
  const { data } = await supabase
    .from('user_power_ups' as any)
    .select('power_up_id')
    .eq('id', userPowerUpId)
    .single();

  if (data) {
    await supabase.from('power_up_transactions' as any).insert({
      user_id: userId,
      power_up_id: (data as any).power_up_id,
      action: 'expire',
      points_spent: 0,
    });
  }
}

/**
 * Map database row to frontend type
 */
function mapRowToPowerUp(row: any): PowerUp {
  return {
    id: row.id,
    powerUpKey: row.power_up_key,
    name: row.name,
    description: row.description,
    icon: row.icon,
    type: row.type || 'temporary',
    costGold: row.cost_points,
    effectType: row.effect_type,
    effectValue: row.effect_value,
    durationMinutes: row.duration_minutes,
    category: row.category || 'boosts',
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function mapRowToUserPowerUp(row: any): UserPowerUp {
  return {
    id: row.id,
    userId: row.user_id,
    powerUpId: row.power_up_id,
    purchasedAt: row.purchased_at,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    isConsumed: row.is_consumed,
    createdAt: row.created_at,
    powerUp: row.power_up ? mapRowToPowerUp(row.power_up) : undefined,
  };
}
