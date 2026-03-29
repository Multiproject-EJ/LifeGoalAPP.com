import type { AiCostLevel } from './aiTaskRouting';
import type { AiMode } from './aiEntitlementService';

export type AiTelemetryEventName =
  | 'ai.quota_consumed'
  | 'ai.fallback_activated'
  | 'ai.upgrade_prompt_shown'
  | 'ai.upgrade_prompt_clicked';

export type AiTelemetryPayload = {
  task: string;
  level: AiCostLevel;
  mode: AiMode;
  reason: string;
  quotaRemaining: number | null;
  sessionQuotaRemaining: number | null;
  context?: Record<string, unknown>;
};

export function trackAiTelemetry(event: AiTelemetryEventName, payload: AiTelemetryPayload): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai-analytics', { detail: { event, payload } }));
  }
  console.debug('[ai-analytics]', event, payload);
}

