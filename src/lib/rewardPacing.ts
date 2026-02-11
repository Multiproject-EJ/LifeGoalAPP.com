/**
 * Reward Pacing Engine - Rules-based detection and suggestion system
 * 
 * Detects three pacing states: Underfed (boredom risk), Balanced, or Overfed (burnout risk)
 * Provides gentle, non-judgmental nudges to keep rewards meaningful
 */

import type { RewardItem, RewardRedemption } from '../types/gamification';

export type PacingState = 'underfed' | 'balanced' | 'overfed';

export interface PacingAnalysis {
  state: PacingState;
  signals: string[];  // which rules triggered
  suggestion: PacingSuggestion | null;
}

export interface PacingSuggestion {
  type: 'upgrade_reward' | 'add_cooldown' | 'bank_it' | 'swap_reward' | 'new_reward' | 'add_ritual';
  title: string;
  description: string;
  icon: string;
}

export interface PacingStorageData {
  state: PacingState;
  lastAnalyzedAt: string;
  lastPromptedAt: string | null;
}

const PROMPT_COOLDOWN_DAYS = 3;
const PACING_STORAGE_KEY_PREFIX = 'lifegoal_reward_pacing_';

/**
 * Get localStorage key for pacing data
 */
function getPacingStorageKey(userId: string): string {
  return `${PACING_STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * Load pacing state from localStorage
 */
export function loadPacingState(userId: string): PacingStorageData | null {
  if (typeof window === 'undefined' || !userId) return null;
  
  try {
    const key = getPacingStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    return JSON.parse(stored) as PacingStorageData;
  } catch (error) {
    console.warn('Failed to load pacing state:', error);
    return null;
  }
}

/**
 * Save pacing state to localStorage
 */
export function savePacingState(userId: string, data: PacingStorageData): void {
  if (typeof window === 'undefined' || !userId) return;
  
  try {
    const key = getPacingStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save pacing state:', error);
  }
}

/**
 * Check if we can show a prompt (respects 3-day cooldown)
 */
export function canShowPrompt(userId: string): boolean {
  const stored = loadPacingState(userId);
  if (!stored || !stored.lastPromptedAt) return true;
  
  const lastPrompted = new Date(stored.lastPromptedAt);
  const now = new Date();
  const daysSinceLastPrompt = (now.getTime() - lastPrompted.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceLastPrompt >= PROMPT_COOLDOWN_DAYS;
}

/**
 * Mark that a prompt was shown (updates lastPromptedAt)
 */
export function markPromptShown(userId: string): void {
  const stored = loadPacingState(userId);
  if (!stored) return;
  
  const updated: PacingStorageData = {
    ...stored,
    lastPromptedAt: new Date().toISOString(),
  };
  
  savePacingState(userId, updated);
}

/**
 * Analyze reward pacing and detect state
 */
export function analyzeRewardPacing(
  userId: string,
  rewards: RewardItem[],
  redemptions: RewardRedemption[],
  habitCompletionsLast7Days?: number,
  habitCompletionsLast14Days?: number
): PacingAnalysis {
  const now = new Date();
  const signals: string[] = [];
  
  // Filter recent redemptions (last 7 and 14 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const redemptionsLast7Days = redemptions.filter(r => 
    new Date(r.redeemedAt) >= sevenDaysAgo
  );
  const redemptionsLast14Days = redemptions.filter(r => 
    new Date(r.redeemedAt) >= fourteenDaysAgo
  );
  
  // ========== UNDERFED DETECTION (2+ signals) ==========
  
  // Signal 1: No redemption in 7 days despite 3+ habit completions
  const noRedemptionIn7Days = redemptionsLast7Days.length === 0;
  const hasEnoughCompletions = (habitCompletionsLast7Days ?? 0) >= 3;
  if (noRedemptionIn7Days && hasEnoughCompletions) {
    signals.push('no_redemption_7_days');
  }
  
  // Signal 2: Satisfaction weight average ≤ 2.5 (skip for now - not implemented yet)
  // Future: track satisfaction ratings on redemptions
  
  // Signal 3: Declining completions (down ≥ 40% vs. prior week)
  if (habitCompletionsLast7Days !== undefined && habitCompletionsLast14Days !== undefined) {
    const priorWeekCompletions = habitCompletionsLast14Days - habitCompletionsLast7Days;
    if (priorWeekCompletions > 0) {
      const declinePercent = ((priorWeekCompletions - habitCompletionsLast7Days) / priorWeekCompletions) * 100;
      if (declinePercent >= 40) {
        signals.push('declining_completions');
      }
    }
  }
  
  // ========== OVERFED DETECTION (2+ signals) ==========
  
  // Signal 1: Redeeming daily for 5+ consecutive days
  const consecutiveDays = calculateConsecutiveRedemptionDays(redemptions);
  if (consecutiveDays >= 5) {
    signals.push('daily_redemptions_5_plus_days');
  }
  
  // Signal 2: Reward cost trending downward (avg cost -30% vs. prior week)
  const avgCostLast7Days = calculateAverageCost(redemptionsLast7Days);
  const sevenToFourteenDaysAgo = redemptions.filter(r => {
    const date = new Date(r.redeemedAt);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  });
  const avgCostPriorWeek = calculateAverageCost(sevenToFourteenDaysAgo);
  
  if (avgCostPriorWeek > 0) {
    const costDeclinePercent = ((avgCostPriorWeek - avgCostLast7Days) / avgCostPriorWeek) * 100;
    if (costDeclinePercent >= 30) {
      signals.push('cost_trending_down');
    }
  }
  
  // Signal 3: Low variety: same reward redeemed >80% of the time
  const varietyPercent = calculateRewardVariety(redemptionsLast7Days);
  if (varietyPercent > 80) {
    signals.push('low_variety');
  }
  
  // ========== DETERMINE STATE ==========
  
  const underfedSignals = signals.filter(s => 
    s === 'no_redemption_7_days' || 
    s === 'declining_completions'
  );
  const overfedSignals = signals.filter(s => 
    s === 'daily_redemptions_5_plus_days' || 
    s === 'cost_trending_down' || 
    s === 'low_variety'
  );
  
  let state: PacingState = 'balanced';
  if (underfedSignals.length >= 2) {
    state = 'underfed';
  } else if (overfedSignals.length >= 2) {
    state = 'overfed';
  }
  
  // ========== GENERATE SUGGESTION ==========
  
  const suggestion = generateSuggestion(state, rewards, redemptions);
  
  // ========== PERSIST STATE ==========
  
  const storageData: PacingStorageData = {
    state,
    lastAnalyzedAt: now.toISOString(),
    lastPromptedAt: loadPacingState(userId)?.lastPromptedAt ?? null,
  };
  savePacingState(userId, storageData);
  
  return {
    state,
    signals,
    suggestion,
  };
}

/**
 * Calculate consecutive days of redemption
 */
function calculateConsecutiveRedemptionDays(redemptions: RewardRedemption[]): number {
  if (redemptions.length === 0) return 0;
  
  // Sort by date descending
  const sorted = [...redemptions].sort((a, b) => 
    new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
  );
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  let consecutive = 0;
  let checkDate = new Date(now);
  
  for (let i = 0; i < sorted.length; i++) {
    const redemptionDate = new Date(sorted[i].redeemedAt);
    redemptionDate.setHours(0, 0, 0, 0);
    
    if (redemptionDate.getTime() === checkDate.getTime()) {
      consecutive++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (redemptionDate.getTime() < checkDate.getTime()) {
      // Gap found
      break;
    }
  }
  
  return consecutive;
}

/**
 * Calculate average reward cost
 */
function calculateAverageCost(redemptions: RewardRedemption[]): number {
  if (redemptions.length === 0) return 0;
  
  const totalCost = redemptions.reduce((sum, r) => sum + r.costGold, 0);
  return totalCost / redemptions.length;
}

/**
 * Calculate reward variety percentage (% of most-used reward)
 */
function calculateRewardVariety(redemptions: RewardRedemption[]): number {
  if (redemptions.length === 0) return 0;
  
  const rewardCounts = new Map<string, number>();
  
  for (const redemption of redemptions) {
    const count = rewardCounts.get(redemption.rewardId) ?? 0;
    rewardCounts.set(redemption.rewardId, count + 1);
  }
  
  const maxCount = Math.max(...Array.from(rewardCounts.values()));
  return (maxCount / redemptions.length) * 100;
}

/**
 * Generate a suggestion based on pacing state
 */
function generateSuggestion(
  state: PacingState,
  rewards: RewardItem[],
  redemptions: RewardRedemption[]
): PacingSuggestion | null {
  if (state === 'balanced') {
    return null;
  }
  
  if (state === 'underfed') {
    // Randomly pick one of three suggestions for variety
    const suggestions: PacingSuggestion[] = [
      {
        type: 'upgrade_reward',
        title: 'Want a slightly bigger win?',
        description: 'Consider upgrading one of your rewards to make it more meaningful.',
        icon: '⬆️',
      },
      {
        type: 'add_ritual',
        title: 'Pair this with a quick thought?',
        description: 'Add a mini-ritual to deepen the reward experience.',
        icon: '🧘',
      },
      {
        type: 'new_reward',
        title: 'Time for a fresh reward?',
        description: 'Introduce a new reward to keep things interesting.',
        icon: '✨',
      },
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }
  
  if (state === 'overfed') {
    // Find most-used reward for targeted suggestions
    const rewardCounts = new Map<string, number>();
    for (const redemption of redemptions) {
      const count = rewardCounts.get(redemption.rewardId) ?? 0;
      rewardCounts.set(redemption.rewardId, count + 1);
    }
    
    // Randomly pick one of three suggestions
    const suggestions: PacingSuggestion[] = [
      {
        type: 'add_cooldown',
        title: "Let's make this feel special again.",
        description: 'Consider adding a cooldown to your most-used reward.',
        icon: '⏰',
      },
      {
        type: 'bank_it',
        title: "Save this for when it'll feel great.",
        description: "Store reward credits for when they'll have more impact.",
        icon: '🏦',
      },
      {
        type: 'swap_reward',
        title: 'Try a different reward this week?',
        description: 'Switch to a different reward for variety.',
        icon: '🔄',
      },
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }
  
  return null;
}
