import { getAiTaskLevel, resolveModelForAiTask, type AiTaskKey } from './aiTaskRouting';
import { consumeQuota, getQuotaSnapshot } from './aiQuotaService';
import { trackAiTelemetry } from './aiTelemetry';

export type AiMode = 'premium' | 'free_quota' | 'fallback';

export type AiEntitlementDecision = {
  mode: AiMode;
  allowed: boolean;
  model: string | null;
  reason: string;
  quotaRemaining: number | null;
  sessionQuotaRemaining: number | null;
};

export function resolveAiEntitlement(task: AiTaskKey, apiKeyPresent: boolean): AiEntitlementDecision {
  const level = getAiTaskLevel(task);

  if (!apiKeyPresent) {
    trackAiTelemetry('ai.fallback_activated', {
      task,
      level,
      mode: 'fallback',
      reason: 'No API key configured',
      quotaRemaining: null,
      sessionQuotaRemaining: null,
    });
    return {
      mode: 'fallback',
      allowed: false,
      model: null,
      reason: 'No API key configured',
      quotaRemaining: null,
      sessionQuotaRemaining: null,
    };
  }

  const tier = (import.meta.env.VITE_AI_TIER ?? '').toString().trim().toLowerCase();
  if (tier === 'premium') {
    return {
      mode: 'premium',
      allowed: true,
      model: resolveModelForAiTask(task, 'premium'),
      reason: 'Premium entitlement',
      quotaRemaining: null,
      sessionQuotaRemaining: null,
    };
  }

  const snapshot = getQuotaSnapshot(level);
  if (snapshot.dailyRemaining <= 0 || snapshot.sessionRemaining <= 0) {
    const reason = snapshot.dailyRemaining <= 0
      ? `Free daily quota exhausted for ${level}`
      : `Free session quota exhausted for ${level}`;
    trackAiTelemetry('ai.fallback_activated', {
      task,
      level,
      mode: 'fallback',
      reason,
      quotaRemaining: snapshot.dailyRemaining,
      sessionQuotaRemaining: snapshot.sessionRemaining,
    });
    return {
      mode: 'fallback',
      allowed: false,
      model: null,
      reason,
      quotaRemaining: snapshot.dailyRemaining,
      sessionQuotaRemaining: snapshot.sessionRemaining,
    };
  }

  const updatedSnapshot = consumeQuota(level);
  trackAiTelemetry('ai.quota_consumed', {
    task,
    level,
    mode: 'free_quota',
    reason: 'Free quota consumed',
    quotaRemaining: updatedSnapshot.dailyRemaining,
    sessionQuotaRemaining: updatedSnapshot.sessionRemaining,
  });

  return {
    mode: 'free_quota',
    allowed: true,
    model: resolveModelForAiTask(task, 'free'),
    reason: 'Free quota available',
    quotaRemaining: updatedSnapshot.dailyRemaining,
    sessionQuotaRemaining: updatedSnapshot.sessionRemaining,
  };
}

export function trackAiUpgradePromptShown(task: AiTaskKey, context?: Record<string, unknown>): void {
  const level = getAiTaskLevel(task);
  trackAiTelemetry('ai.upgrade_prompt_shown', {
    task,
    level,
    mode: 'fallback',
    reason: 'Upgrade prompt shown',
    quotaRemaining: null,
    sessionQuotaRemaining: null,
    context,
  });
}

export function trackAiUpgradePromptClicked(task: AiTaskKey, context?: Record<string, unknown>): void {
  const level = getAiTaskLevel(task);
  trackAiTelemetry('ai.upgrade_prompt_clicked', {
    task,
    level,
    mode: 'fallback',
    reason: 'Upgrade prompt clicked',
    quotaRemaining: null,
    sessionQuotaRemaining: null,
    context,
  });
}
