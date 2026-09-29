/**
 * AI Rationale Enrichment Module
 * 
 * Provides optional AI-powered enhancement of habit suggestion rationale text.
 * Uses the shared AI runtime (on-device Apple Intelligence first, then the
 * server); otherwise falls back to the baseline rationale from the
 * classification engine.
 * 
 * Features:
 * - Short timeouts for AI calls to keep the UI responsive
 * - Per-session caching to avoid repeated API calls for the same inputs
 * - Graceful fallback when AI is unavailable or fails
 */

import type { HabitSchedule } from './scheduleInterpreter';
import { runAiTask } from '../../services/ai/aiRuntime';

/**
 * Input parameters for building enhanced rationale
 */
export interface EnhanceRationaleInput {
  /** The habit's performance classification (underperforming, stable, high, observe) */
  classification: string;
  /** 7-day adherence percentage (0-100) */
  adherence7: number;
  /** 30-day adherence percentage (0-100) */
  adherence30: number;
  /** Current streak length in days */
  streak: number;
  /** Preview of proposed changes (optional) */
  preview?: {
    schedule?: HabitSchedule;
    target_num?: number;
  };
  /** The baseline rationale from the classifier */
  baselineRationale: string;
}

/**
 * Result of the enhanced rationale generation
 */
export interface EnhancedRationaleResult {
  /** The enhanced rationale text (AI-generated or baseline fallback) */
  rationale: string;
  /** Whether the rationale was AI-enhanced */
  isAiEnhanced: boolean;
  /** Source of the rationale */
  source: 'ai' | 'cache' | 'baseline';
}

// Session cache for AI-enhanced rationales (keyed by input hash)
const rationaleCache = new Map<string, EnhancedRationaleResult>();

/**
 * Generates a cache key from the input parameters
 */
function getCacheKey(input: EnhanceRationaleInput): string {
  return JSON.stringify({
    classification: input.classification,
    adherence7: input.adherence7,
    adherence30: input.adherence30,
    streak: input.streak,
    preview: input.preview,
  });
}

/**
 * Builds a prompt for the AI to enhance the rationale
 */
function buildPrompt(input: EnhanceRationaleInput): string {
  let previewContext = '';
  if (input.preview) {
    const changes: string[] = [];
    if (input.preview.schedule) {
      const schedule = input.preview.schedule;
      if (schedule.mode === 'times_per_week' && schedule.timesPerWeek) {
        changes.push(`change frequency to ${schedule.timesPerWeek}x per week`);
      } else if (schedule.mode === 'every_n_days' && schedule.intervalDays) {
        changes.push(`change to every ${schedule.intervalDays} days`);
      }
    }
    if (input.preview.target_num !== undefined) {
      changes.push(`adjust target to ${input.preview.target_num}`);
    }
    if (changes.length > 0) {
      previewContext = ` The proposed adjustment would ${changes.join(' and ')}.`;
    }
  }

  return `Classification: ${input.classification}
7-day adherence: ${input.adherence7}%
30-day adherence: ${input.adherence30}%
Current streak: ${input.streak} days${previewContext}`;
}

const RATIONALE_INSTRUCTIONS = `You are a supportive habit coach. Based on the habit performance data, provide a brief 2-3 sentence rationale explaining the recommendation in an encouraging, actionable way.
Keep the response concise, positive, and focused on helping the user succeed. Do not use markdown formatting.`;

/**
 * Builds an enhanced rationale for a habit suggestion.
 * 
 * Asks the shared AI runtime (on-device first, then the server) for a 2-3
 * sentence explanation, and falls back to the baseline rationale when no AI
 * source is available or it fails. Results are cached per session.
 * 
 * @param input - Parameters including classification, adherence, streak, and preview
 * @returns Promise with enhanced rationale and metadata
 */
export async function buildEnhancedRationale(
  input: EnhanceRationaleInput
): Promise<EnhancedRationaleResult> {
  // Check cache first
  const cacheKey = getCacheKey(input);
  const cached = rationaleCache.get(cacheKey);
  if (cached) {
    return { ...cached, source: 'cache' };
  }

  const ai = await runAiTask({
    task: 'habit_rationale_rewrite',
    instructions: RATIONALE_INSTRUCTIONS,
    prompt: buildPrompt(input),
    maxTokens: 150,
    temperature: 0.7,
    timeoutMs: 5000,
  });
  const aiResponse = ai?.text ?? null;

  if (aiResponse) {
    const result: EnhancedRationaleResult = {
      rationale: aiResponse,
      isAiEnhanced: true,
      source: 'ai',
    };
    rationaleCache.set(cacheKey, result);
    return result;
  }

  // Fallback to baseline
  const result: EnhancedRationaleResult = {
    rationale: input.baselineRationale,
    isAiEnhanced: false,
    source: 'baseline',
  };
  rationaleCache.set(cacheKey, result);
  return result;
}

/**
 * Clears the rationale cache. Useful for testing or when forcing refresh.
 */
export function clearRationaleCache(): void {
  rationaleCache.clear();
}

/**
 * Gets the current size of the rationale cache.
 */
export function getRationaleCacheSize(): number {
  return rationaleCache.size;
}
