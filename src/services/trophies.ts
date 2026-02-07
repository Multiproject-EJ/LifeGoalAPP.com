import { getSupabaseClient, canUseSupabaseData } from '../lib/supabaseClient';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import type { TrophyItem, UserTrophy } from '../types/gamification';
import { recordTelemetryEvent } from './telemetry';
import { GOLD_PER_DIAMOND } from '../constants/economy';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

const TROPHY_STORAGE_KEY = 'lifegoal_trophies';

const TROPHY_CATALOG: TrophyItem[] = [
  {
    id: 'trophy-bronze-striver',
    name: 'Bronze Striver Trophy',
    description: 'Honor your earliest wins with a classic bronze trophy.',
    icon: '🏆',
    category: 'trophy',
    costDiamonds: 1,
    requiredTier: 'bronze',
  },
  {
    id: 'medal-focus-streak',
    name: 'Focus Streak Medal',
    description: 'A medal for staying locked in on the daily grind.',
    icon: '🥇',
    category: 'medal',
    costDiamonds: 1,
    requiredTier: 'bronze',
  },
  {
    id: 'plaque-momentum',
    name: 'Momentum Plaque',
    description: 'Showcase the habits that are building unstoppable momentum.',
    icon: '🪪',
    category: 'plaque',
    costDiamonds: 2,
    requiredTier: 'silver',
  },
  {
    id: 'trophy-golden-leap',
    name: 'Golden Leap Trophy',
    description: 'Celebrate a bold breakthrough with a gleaming gold trophy.',
    icon: '🏅',
    category: 'trophy',
    costDiamonds: 3,
    requiredTier: 'gold',
  },
  {
    id: 'medal-resilience',
    name: 'Resilience Medal',
    description: 'For bouncing back stronger after every challenge.',
    icon: '🎖️',
    category: 'medal',
    costDiamonds: 2,
    requiredTier: 'silver',
  },
  {
    id: 'plaque-legend',
    name: 'Legendary Legacy Plaque',
    description: 'A premium plaque for the LifeGoal legends in the making.',
    icon: '💠',
    category: 'plaque',
    costDiamonds: 5,
    requiredTier: 'diamond',
  },
];

export async function fetchTrophyCatalog(): Promise<ServiceResponse<TrophyItem[]>> {
  return { data: TROPHY_CATALOG, error: null };
}

export async function fetchUserTrophies(userId: string): Promise<ServiceResponse<UserTrophy[]>> {
  try {
    const stored = localStorage.getItem(`${TROPHY_STORAGE_KEY}_${userId}`);
    const parsed: UserTrophy[] = stored ? JSON.parse(stored) : [];
    return { data: parsed, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load trophy case'),
    };
  }
}

export async function purchaseTrophy(
  userId: string,
  trophyId: string,
  isQualified = true
): Promise<ServiceResponse<{ newGoldBalance: number; userTrophy: UserTrophy }>> {
  const { data: profile, error: profileError } = await fetchGamificationProfile(userId);

  if (profileError || !profile) {
    return { data: null, error: profileError || new Error('Profile not found') };
  }

  const trophy = TROPHY_CATALOG.find(item => item.id === trophyId);

  if (!trophy) {
    return { data: null, error: new Error('Trophy not found') };
  }

  const { data: existing } = await fetchUserTrophies(userId);
  const alreadyOwned = existing?.some(item => item.trophyId === trophyId);

  if (alreadyOwned) {
    return { data: null, error: new Error('You already own this accolade') };
  }

  if (!isQualified) {
    return { data: null, error: new Error('Unlock the required achievement tier to purchase this item') };
  }

  const costInGold = trophy.costDiamonds * GOLD_PER_DIAMOND;

  if (profile.total_points < costInGold) {
    return { data: null, error: new Error('Not enough diamonds to unlock this accolade') };
  }

  const now = new Date().toISOString();
  const newBalance = profile.total_points - costInGold;

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
    eventType: 'economy_spend',
    metadata: {
      currency: 'diamonds',
      amount: trophy.costDiamonds,
      balance: newBalance,
      sourceType: 'trophy',
      sourceId: trophy.id,
      itemName: trophy.name,
      category: trophy.category,
    },
  });

  const userTrophy: UserTrophy = {
    id: `trophy-${Date.now()}`,
    userId,
    trophyId,
    purchasedAt: now,
    trophy,
  };

  const updated = [...(existing || []), userTrophy];
  localStorage.setItem(`${TROPHY_STORAGE_KEY}_${userId}`, JSON.stringify(updated));

  return { data: { newGoldBalance: newBalance, userTrophy }, error: null };
}
