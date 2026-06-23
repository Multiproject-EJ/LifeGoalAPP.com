/**
 * habitChainAnalysis — Supabase CRUD + optional AI suggestions for keystone /
 * chain-reaction habit links. Pure classification + response validation lives in
 * `features/habits/habitChainLogic.ts` so it can be unit-tested without IO.
 */

import { getSupabaseClient } from '../lib/supabaseClient';
import { resolveAiEntitlement } from './aiEntitlementService';
import {
  validateChainSuggestionResponse,
  type ChainSuggestion,
  type HabitChainLink,
  type HabitLinkConsistency,
  type HabitLinkDirection,
  type HabitLinkLifeArea,
  type HabitLinkStatus,
  type HabitLinkStrength,
} from '../features/habits/habitChainLogic';

type HabitLinkRow = {
  id: string;
  source_habit_id: string;
  target_habit_id: string | null;
  life_area: string | null;
  direction: HabitLinkDirection;
  strength: HabitLinkStrength;
  consistency: HabitLinkConsistency;
  evidence_type: HabitChainLink['evidence'];
  status: HabitLinkStatus;
  note: string | null;
};

function getUntypedSupabase() {
  // The chain-link tables (like the sibling habit_analysis_* tables) are not in the
  // generated Database types, so we use an untyped client — matching habitImprovementAnalysis.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

function mapRow(row: HabitLinkRow): HabitChainLink {
  return {
    id: row.id,
    sourceHabitId: row.source_habit_id,
    targetHabitId: row.target_habit_id,
    lifeArea: (row.life_area as HabitLinkLifeArea | null) ?? null,
    direction: row.direction,
    strength: row.strength,
    consistency: row.consistency,
    evidence: row.evidence_type,
    status: row.status,
    note: row.note,
  };
}

export async function listHabitLinks(
  sourceHabitId: string,
): Promise<{ links: HabitChainLink[]; error: string | null }> {
  const supabase = getUntypedSupabase();

  const { data, error } = await supabase
    .from('habit_links')
    .select('id,source_habit_id,target_habit_id,life_area,direction,strength,consistency,evidence_type,status,note')
    .eq('source_habit_id', sourceHabitId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true });

  if (error) return { links: [], error: error.message };
  return { links: ((data as HabitLinkRow[] | null) ?? []).map(mapRow), error: null };
}

export type CreateHabitLinkInput = {
  userId: string;
  sourceHabitId: string;
  targetHabitId?: string | null;
  lifeArea?: HabitLinkLifeArea | null;
  direction: HabitLinkDirection;
  strength?: HabitLinkStrength;
  consistency?: HabitLinkConsistency;
  evidence?: HabitChainLink['evidence'];
  note?: string | null;
};

export async function createHabitLink(
  input: CreateHabitLinkInput,
): Promise<{ link: HabitChainLink | null; error: string | null }> {
  const supabase = getUntypedSupabase();

  const hasHabitTarget = Boolean(input.targetHabitId);
  const hasAreaTarget = Boolean(input.lifeArea);
  if (hasHabitTarget === hasAreaTarget) {
    return { link: null, error: 'Pick exactly one ripple target (a habit or a life area).' };
  }

  const { data, error } = await supabase
    .from('habit_links')
    .insert({
      user_id: input.userId,
      source_habit_id: input.sourceHabitId,
      target_habit_id: input.targetHabitId ?? null,
      life_area: input.lifeArea ?? null,
      direction: input.direction,
      strength: input.strength ?? 'medium',
      consistency: input.consistency ?? 'sometimes',
      evidence_type: input.evidence ?? 'user_confirmed',
      note: input.note ?? null,
    })
    .select('id,source_habit_id,target_habit_id,life_area,direction,strength,consistency,evidence_type,status,note')
    .single();

  if (error) return { link: null, error: error.message };
  return { link: data ? mapRow(data as HabitLinkRow) : null, error: null };
}

export async function updateHabitLinkStatus(
  id: string,
  status: HabitLinkStatus,
): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const { error } = await supabase.from('habit_links').update({ status }).eq('id', id);
  return { error: error ? error.message : null };
}

export async function deleteHabitLink(id: string): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const { error } = await supabase.from('habit_links').delete().eq('id', id);
  return { error: error ? error.message : null };
}

/* ------------------------------------------------------------------ */
/* AI suggestions (optional, gracefully degrades)                      */
/* ------------------------------------------------------------------ */

export type ChainSuggestionInput = {
  habitName: string;
  /** Names of the user's other active habits, for habit-to-habit ripples. */
  otherHabitNames: string[];
  /** Life Wheel area short labels available for area ripples. */
  lifeAreaLabels: string[];
};

export type ChainSuggestionResult = {
  suggestions: ChainSuggestion[];
  safetyNote: string | null;
  source: 'openai' | 'fallback' | 'unavailable';
  error: string | null;
};

function hasOpenAIKey(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  return typeof apiKey === 'string' && apiKey.length > 0;
}

function buildChainPrompt(input: ChainSuggestionInput): string {
  return `You are helping someone notice how one habit may ripple into other habits or life areas.
Speak only in terms of *possible association*, never causation. Be gentle and non-clinical.

Habit being explored: "${input.habitName}"
Their other habits: ${input.otherHabitNames.slice(0, 20).map((name) => `"${name}"`).join(', ') || 'none provided'}
Life areas: ${input.lifeAreaLabels.join(', ')}

Return JSON only (no markdown) with this exact shape:
{
  "suggestions": [
    {
      "target_label": "a habit name from the list, or a life area",
      "target_kind": "habit" | "life_area",
      "direction": "positive" | "negative",
      "rationale": "one short, non-causal sentence (e.g. 'On days you do this, X may feel easier')",
      "confidence": "low" | "medium" | "high"
    }
  ],
  "safety_note": null
}
Rules: max 4 suggestions, prefer "low"/"medium" confidence, never claim certainty, never give medical or mental-health advice.`;
}

async function callOpenAIChainSuggestions(
  input: ChainSuggestionInput,
  timeoutMs = 4000,
): Promise<{ suggestions: ChainSuggestion[]; safetyNote: string | null } | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;

  const decision = resolveAiEntitlement('habit_chain_suggestion', Boolean(apiKey));
  if (!decision.allowed || !decision.model) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: decision.model,
        messages: [{ role: 'user', content: buildChainPrompt(input) }],
        max_tokens: 400,
        temperature: 0.5,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('OpenAI chain suggestion returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.warn('Failed to parse OpenAI chain suggestion JSON:', err);
      return null;
    }

    const validated = validateChainSuggestionResponse(parsed);
    if (!validated) return null;
    return { suggestions: validated.suggestions, safetyNote: validated.safetyNote };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('OpenAI chain suggestion timed out');
    } else {
      console.warn('OpenAI chain suggestion failed:', err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate possible chain-reaction links for a habit. Always resolves; when AI is
 * unavailable or fails, returns an empty suggestion list (we never fabricate links
 * deterministically — the user adds those themselves).
 */
export async function generateChainSuggestions(
  input: ChainSuggestionInput,
): Promise<ChainSuggestionResult> {
  if (!hasOpenAIKey()) {
    return { suggestions: [], safetyNote: null, source: 'fallback', error: null };
  }

  const ai = await callOpenAIChainSuggestions(input);
  if (!ai) {
    return { suggestions: [], safetyNote: null, source: 'fallback', error: null };
  }

  return {
    suggestions: ai.suggestions,
    safetyNote: ai.safetyNote,
    source: 'openai',
    error: null,
  };
}
