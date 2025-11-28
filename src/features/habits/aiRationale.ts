/**
 * AI Rationale Enrichment Module
 * 
 * Provides optional AI-powered enhancement of habit suggestion rationale text.
 * Uses OpenAI (gpt-4o-mini) when OPENAI_API_KEY is available; otherwise falls back
 * to the baseline rationale from the classification engine.
 * 
 * Features:
 * - 3-second timeout for AI calls to ensure UI responsiveness
 * - Per-session caching to avoid repeated API calls for the same inputs
 * - Graceful fallback when AI is unavailable or fails
 */

import type { HabitSchedule } from './scheduleInterpreter';

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
 * Checks if the OpenAI API key is available via environment variable
 */
function hasOpenAIKey(): boolean {
  // Check for Vite environment variable
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  return typeof apiKey === 'string' && apiKey.length > 0;
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

  return `You are a supportive habit coach. Based on this habit performance data, provide a brief 2-3 sentence rationale explaining the recommendation in an encouraging, actionable way.

Classification: ${input.classification}
7-day adherence: ${input.adherence7}%
30-day adherence: ${input.adherence30}%
Current streak: ${input.streak} days${previewContext}

Keep the response concise, positive, and focused on helping the user succeed. Do not use markdown formatting.`;
}

/**
 * Calls the OpenAI API to generate an enhanced rationale.
 * Returns null if the call fails or times out.
 */
async function callOpenAI(prompt: string, timeoutMs: number = 3000): Promise<string | null> {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: prompt },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('OpenAI API returned non-OK status:', response.status);
        return null;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      
      if (typeof content === 'string' && content.trim().length > 0) {
        return content.trim();
      }
      
      return null;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('OpenAI API call timed out');
      } else {
        console.warn('OpenAI API call failed:', err);
      }
      return null;
    }
  } catch (err) {
    console.warn('Unexpected error calling OpenAI:', err);
    return null;
  }
}

/**
 * Builds an enhanced rationale for a habit suggestion.
 * 
 * If OPENAI_API_KEY is available, calls gpt-4o-mini to generate a 2-3 sentence
 * explanation. Uses a 3-second timeout and falls back to baseline rationale
 * on failure. Results are cached per session.
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

  // If no API key, return baseline immediately
  if (!hasOpenAIKey()) {
    const result: EnhancedRationaleResult = {
      rationale: input.baselineRationale,
      isAiEnhanced: false,
      source: 'baseline',
    };
    rationaleCache.set(cacheKey, result);
    return result;
  }

  // Build prompt and call OpenAI
  const prompt = buildPrompt(input);
  const aiResponse = await callOpenAI(prompt, 3000);

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
