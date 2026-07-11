/**
 * Compass AI — client wrapper around the dedicated `compass-help` edge function.
 *
 * Best-effort and non-blocking: never throws, always returns a result with a
 * source/message so the UI can degrade to fixed-guided silently. AI proposes
 * only; it never writes, confirms, or auto-applies anything (the caller applies
 * a suggestion only on an explicit player action).
 *
 * Privacy: only the single-question request from `compassAiCore` is sent — never
 * other answers or wider Compass data.
 */

import { canUseSupabaseData, getSupabaseClient } from '../../../lib/supabaseClient';
import {
  getFeatureAvailability,
  getServiceHealthManager,
  guardedCloudCall,
} from '../../../services/service-health';
import {
  parseCompassHelpResponse,
  type CompassHelpRequest,
  type CompassHelpResult,
} from './compassAiCore';

export * from './compassAiCore';

const HELP_TIMEOUT_MS = 12000;

/** Whether the per-question "Help me think" affordance should be offered. */
export function isCompassAiAvailable(): boolean {
  return canUseSupabaseData();
}

function unavailable(message: string): CompassHelpResult {
  return { data: null, source: 'unavailable', message };
}

export async function requestCompassHelp(request: CompassHelpRequest): Promise<CompassHelpResult> {
  if (!canUseSupabaseData()) {
    return unavailable('AI help isn’t available right now — continue on your own.');
  }

  const availability = getFeatureAvailability('ai_coach', getServiceHealthManager().getSnapshot());
  if (availability.status !== 'available') {
    return unavailable(availability.reason);
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall(
    'edgeFunctions',
    async () => {
      const { data, error } = await supabase.functions.invoke<unknown>('compass-help', { body: request });
      if (error) throw error;
      return data;
    },
    { timeoutMs: HELP_TIMEOUT_MS },
  );

  if (!result.ok) {
    return { data: null, source: 'error', message: 'AI help is unavailable right now.' };
  }

  const parsed = parseCompassHelpResponse(result.data);
  if (!parsed) {
    return { data: null, source: 'error', message: 'No clear suggestion — trust your own read.' };
  }

  return { data: parsed, source: 'supabase', message: null };
}
