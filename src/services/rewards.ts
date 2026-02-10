import { getSupabaseClient, canUseSupabaseData } from '../lib/supabaseClient';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import type { RewardItem, RewardRedemption, RewardCooldownType, RewardCategory } from '../types/gamification';
import { recordTelemetryEvent } from './telemetry';
import { getEvolutionSuggestion } from '../lib/rewardEvolution';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

type RewardInput = {
  title: string;
  description: string;
  costGold: number;
  category?: RewardCategory;
  cooldownType?: RewardCooldownType;
  cooldownHours?: number;
};

const REWARD_STORAGE_KEY = 'lifegoal_rewards';
const REDEMPTION_STORAGE_KEY = 'lifegoal_reward_redemptions';

function getRewardKey(userId: string) {
  return `${REWARD_STORAGE_KEY}_${userId}`;
}

function getRedemptionKey(userId: string) {
  return `${REDEMPTION_STORAGE_KEY}_${userId}`;
}

export async function fetchRewardCatalog(userId: string): Promise<ServiceResponse<RewardItem[]>> {
  try {
    const stored = localStorage.getItem(getRewardKey(userId));
    const parsed: RewardItem[] = stored ? JSON.parse(stored) : [];
    
    // Migrate existing rewards to include evolution fields
    let needsMigration = false;
    const migrated = parsed.map((reward) => {
      const hasEvolutionFields = 
        'evolutionState' in reward &&
        'evolutionPromptedAt' in reward &&
        'evolutionDeclinedAt' in reward;
      
      if (!hasEvolutionFields) {
        needsMigration = true;
        return {
          ...reward,
          evolutionState: 0 as const,
          evolutionPromptedAt: null,
          evolutionDeclinedAt: null,
        };
      }
      return reward;
    });
    
    // Save migrated data back only if migration occurred
    if (needsMigration && migrated.length > 0) {
      localStorage.setItem(getRewardKey(userId), JSON.stringify(migrated));
    }
    
    return { data: migrated, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load rewards'),
    };
  }
}

export async function fetchRewardRedemptions(
  userId: string
): Promise<ServiceResponse<RewardRedemption[]>> {
  try {
    const stored = localStorage.getItem(getRedemptionKey(userId));
    const parsed: RewardRedemption[] = stored ? JSON.parse(stored) : [];
    return { data: parsed, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load redemptions'),
    };
  }
}

export async function createReward(
  userId: string,
  input: RewardInput
): Promise<ServiceResponse<RewardItem>> {
  const { data: rewards, error } = await fetchRewardCatalog(userId);
  if (error) {
    return { data: null, error };
  }

  const cooldownType = input.cooldownType ?? 'none';
  const cooldownHours =
    cooldownType === 'daily' ? 24 : cooldownType === 'custom' ? Math.max(0, input.cooldownHours ?? 0) : 0;
  const category = input.category ?? 'Treat';

  const newReward: RewardItem = {
    id: `reward-${Date.now()}`,
    title: input.title,
    description: input.description,
    costGold: input.costGold,
    category,
    cooldownType,
    cooldownHours,
    createdAt: new Date().toISOString(),
    redemptionCount: 0,
    lastRedeemedAt: null,
    // Evolution defaults
    evolutionState: 0,
    evolutionPromptedAt: null,
    evolutionDeclinedAt: null,
  };

  const updated = [...(rewards ?? []), newReward];
  localStorage.setItem(getRewardKey(userId), JSON.stringify(updated));
  return { data: newReward, error: null };
}

export async function redeemReward(
  userId: string,
  rewardId: string
): Promise<
  ServiceResponse<{ newGoldBalance: number; reward: RewardItem; redemption: RewardRedemption }>
> {
  const { data: profile, error: profileError } = await fetchGamificationProfile(userId);

  if (profileError || !profile) {
    return { data: null, error: profileError || new Error('Profile not found') };
  }

  const { data: rewards, error } = await fetchRewardCatalog(userId);
  if (error || !rewards) {
    return { data: null, error: error || new Error('Rewards not found') };
  }

  const rewardIndex = rewards.findIndex((item) => item.id === rewardId);
  if (rewardIndex === -1) {
    return { data: null, error: new Error('Reward not found') };
  }

  const reward = rewards[rewardIndex];
  if (profile.total_points < reward.costGold) {
    return { data: null, error: new Error('Not enough gold to redeem this reward') };
  }

  const cooldownHours = reward.cooldownHours ?? 0;
  if (cooldownHours > 0 && reward.lastRedeemedAt) {
    const cooldownEnd = new Date(reward.lastRedeemedAt).getTime() + cooldownHours * 60 * 60 * 1000;
    if (Date.now() < cooldownEnd) {
      const remainMs = cooldownEnd - Date.now();
      const remainH = Math.ceil(remainMs / (60 * 60 * 1000));
      return {
        data: null,
        error: new Error(`Cooldown active — available again in ${remainH}h.`),
      };
    }
  }

  const now = new Date().toISOString();
  const newBalance = profile.total_points - reward.costGold;

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

  const updatedReward: RewardItem = {
    ...reward,
    redemptionCount: reward.redemptionCount + 1,
    lastRedeemedAt: now,
  };

  const updatedRewards = [...rewards];
  updatedRewards[rewardIndex] = updatedReward;
  localStorage.setItem(getRewardKey(userId), JSON.stringify(updatedRewards));

  const { data: redemptions } = await fetchRewardRedemptions(userId);
  const redemption: RewardRedemption = {
    id: `reward-redemption-${Date.now()}`,
    rewardId: updatedReward.id,
    rewardTitle: updatedReward.title,
    costGold: updatedReward.costGold,
    redeemedAt: now,
  };

  const updatedRedemptions = [redemption, ...(redemptions ?? [])].slice(0, 12);
  localStorage.setItem(getRedemptionKey(userId), JSON.stringify(updatedRedemptions));

  void recordTelemetryEvent({
    userId,
    eventType: 'economy_spend',
    metadata: {
      currency: 'gold',
      amount: updatedReward.costGold,
      balance: newBalance,
      sourceType: 'reward',
      sourceId: updatedReward.id,
      itemName: updatedReward.title,
    },
  });

  return {
    data: {
      newGoldBalance: newBalance,
      reward: updatedReward,
      redemption,
    },
    error: null,
  };
}

export async function shouldPromptEvolution(
  userId: string,
  rewardId: string
): Promise<boolean> {
  const { data: rewards } = await fetchRewardCatalog(userId);
  const { data: redemptions } = await fetchRewardRedemptions(userId);
  
  if (!rewards || !redemptions) return false;

  const reward = rewards.find((r) => r.id === rewardId);
  if (!reward) return false;

  // Don't prompt if already evolved past State 0
  if (reward.evolutionState !== 0) return false;

  // Don't nag: if user declined, wait 14 days
  if (reward.evolutionDeclinedAt) {
    const declinedDate = new Date(reward.evolutionDeclinedAt);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    if (declinedDate > fourteenDaysAgo) return false;
  }

  // Count redemptions in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentRedemptions = redemptions.filter(
    (r) =>
      r.rewardId === rewardId &&
      new Date(r.redeemedAt) >= sevenDaysAgo
  );

  return recentRedemptions.length >= 3;
}

export async function evolveReward(
  userId: string,
  rewardId: string,
  accept: boolean
): Promise<ServiceResponse<RewardItem>> {
  const { data: rewards, error } = await fetchRewardCatalog(userId);
  if (error || !rewards) {
    return { data: null, error: error || new Error('Failed to load rewards') };
  }

  const reward = rewards.find((r) => r.id === rewardId);
  if (!reward) {
    return { data: null, error: new Error('Reward not found') };
  }

  let updated: RewardItem;

  if (accept) {
    const evolved = getEvolutionSuggestion(reward);
    updated = {
      ...reward,
      title: evolved.title,
      description: evolved.description,
      evolutionState: Math.min(3, reward.evolutionState + 1) as 0 | 1 | 2 | 3,
      evolutionPromptedAt: new Date().toISOString(),
    };
  } else {
    updated = {
      ...reward,
      evolutionDeclinedAt: new Date().toISOString(),
      evolutionPromptedAt: new Date().toISOString(),
    };
  }

  const allRewards = rewards.map((r) => (r.id === rewardId ? updated : r));
  localStorage.setItem(getRewardKey(userId), JSON.stringify(allRewards));

  return { data: updated, error: null };
}

