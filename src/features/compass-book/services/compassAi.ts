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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function requestCompassHelp(request: CompassHelpRequest): Promise<CompassHelpResult> {
  if (!canUseSupabaseData()) {
    return unavailable('AI help isn’t available right now — continue on your own.');
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await withTimeout(
      supabase.functions.invoke<unknown>('compass-help', { body: request }),
      HELP_TIMEOUT_MS,
    );

    if (error) {
      return { data: null, source: 'error', message: 'AI help is unavailable right now.' };
    }

    const parsed = parseCompassHelpResponse(data);
    if (!parsed) {
      return { data: null, source: 'error', message: 'No clear suggestion — trust your own read.' };
    }

    return { data: parsed, source: 'supabase', message: null };
  } catch {
    return { data: null, source: 'error', message: 'AI help timed out — continue on your own.' };
  }
}
