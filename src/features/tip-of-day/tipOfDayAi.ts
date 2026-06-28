/**
 * tipOfDayAi — optional AI enrichment for the Tip of the Day reshape deck.
 *
 * Mirrors the call pattern in services/habitAiSuggestions.ts: direct OpenAI fetch
 * gated by resolveAiEntitlement, a hard timeout, and strict JSON parsing. When the
 * key is missing, the user isn't entitled, or anything fails, this returns null
 * and the caller keeps the deterministic deck from tipOfDayContent.ts.
 */

import { resolveAiEntitlement } from '../../services/aiEntitlementService';
import type { TipDeck, TipHabitInput, TipHealthInput } from './tipOfDayContent';

interface ReshapeAiPayload {
  /** A short, surprising habit-science fact for the intro card. */
  didYouKnow?: string;
  /** The likely cue/trigger for this habit. */
  cue?: string;
  /** The likely reward/craving the loop is feeding. */
  reward?: string;
  /** A creative, satisfying tweak that keeps the habit but makes it acceptable. */
  suggestion?: string;
  /** Short label for the suggestion card. */
  suggestionLabel?: string;
}

function hasOpenAIKey(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  return typeof apiKey === 'string' && apiKey.length > 0;
}

function buildPrompt(habit: TipHabitInput, health: TipHealthInput, insightHint: string | null): string {
  const intent = habit.habitIntent?.trim() ? `Why it matters to them: ${habit.habitIntent.trim()}.` : '';
  const env = habit.habitEnvironment?.trim() ? `Their stated cue/where-and-how: ${habit.habitEnvironment.trim()}.` : '';
  const adherence =
    health.adherencePercent != null ? `Recent 7-day adherence: ${health.adherencePercent}%.` : '';
  const insights = insightHint ? `${insightHint}` : '';
  const state = health.assessment.state;

  return `You are a warm, creative habit coach. A user is struggling with a habit and you will craft a short "Tip of the Day".

Habit: "${habit.title}".
Health state: ${state}. ${adherence} ${intent} ${env} ${insights}

When the user has self-reported cues, anchor your cue field and suggestion to them — quote their reality back to them.

Analyse it through the habit loop (cue -> craving -> routine -> reward). The cue is the most important part — it is the algorithm/trigger that fires the routine, either an internal clock or a follow-on to a state (bored, tired, hungry, anxious...) or something in the environment.

Then suggest a path that starts by keeping the existing habit and making a small, acceptable, *satisfying* change to its loop. Be creative and specific to THIS habit. Encouraging, never judgmental.

Return ONLY a JSON object with these fields (each value max ~22 words, no markdown):
- didYouKnow (a short surprising habit-science fact relevant to this habit)
- cue (the most likely trigger, phrased as a guess they can confirm)
- reward (the payoff the loop is feeding)
- suggestionLabel (a 2-4 word title for the suggestion)
- suggestion (one concrete, satisfying tweak that keeps the habit but makes it easier)

Return JSON only.`;
}

async function callOpenAI(prompt: string, timeoutMs = 6000): Promise<ReshapeAiPayload | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;

  const decision = resolveAiEntitlement('habit_tip_of_day', Boolean(apiKey));
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
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 320,
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn('Tip of the Day AI returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;

    const parsed = JSON.parse(content) as ReshapeAiPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('Tip of the Day AI timed out');
    } else {
      console.warn('Tip of the Day AI failed:', err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function applyPayload(deck: TipDeck, payload: ReshapeAiPayload): TipDeck {
  const cards = deck.cards.map((card) => {
    switch (card.id) {
      case 'reshape-intro':
        return payload.didYouKnow ? { ...card, body: payload.didYouKnow } : card;
      case 'reshape-cue':
        return payload.cue ? { ...card, body: payload.cue } : card;
      case 'reshape-reward':
        return payload.reward ? { ...card, body: payload.reward } : card;
      case 'reshape-suggestion':
        return payload.suggestion
          ? { ...card, heading: payload.suggestionLabel?.trim() || card.heading, body: payload.suggestion }
          : card;
      default:
        return card;
    }
  });
  return { ...deck, cards };
}

export interface EnrichResult {
  deck: TipDeck;
  source: 'openai' | 'fallback';
}

/**
 * Enrich a deterministic reshape deck with AI-written, habit-specific copy.
 * Returns the original deck (source 'fallback') when AI is unavailable.
 */
export async function enrichReshapeDeck(
  deck: TipDeck,
  habit: TipHabitInput,
  health: TipHealthInput,
  insightHint: string | null = null,
): Promise<EnrichResult> {
  if (deck.variation !== 'reshape_struggling' || !hasOpenAIKey()) {
    return { deck, source: 'fallback' };
  }

  const payload = await callOpenAI(buildPrompt(habit, health, insightHint));
  if (!payload) {
    return { deck, source: 'fallback' };
  }

  return { deck: applyPayload(deck, payload), source: 'openai' };
}
