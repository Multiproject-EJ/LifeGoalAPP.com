import { buildEnvironmentRecommendations } from '../features/environment/environmentRecommendations';
import {
  environmentContextToJson,
  normalizeEnvironmentContext,
  type EnvironmentContextV1,
} from '../features/environment/environmentSchema';
import { resolveAiEntitlement } from './aiEntitlementService';

export type EnvironmentAiIdea = {
  title: string;
  why: string;
  setupSteps: string[];
  fallbackVersion: string;
};

export type EnvironmentAiSuggestionInput = {
  entityType: 'goal' | 'habit';
  title: string;
  description?: string | null;
  context: EnvironmentContextV1 | null;
};

export type EnvironmentAiSuggestionResult = {
  ideas: EnvironmentAiIdea[];
  error: string | null;
  source: 'openai' | 'fallback' | 'unavailable';
};

function hasOpenAIKey(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  return typeof apiKey === 'string' && apiKey.length > 0;
}

function buildFallbackIdeas(input: EnvironmentAiSuggestionInput): EnvironmentAiIdea[] {
  const context = normalizeEnvironmentContext(environmentContextToJson(input.context), {
    fallbackText: input.description ?? undefined,
    source: 'ai',
  });
  const recommendations = buildEnvironmentRecommendations(context);

  const topIdeas = recommendations.topHackSuggestions.slice(0, 3).map((suggestion) => ({
    title: suggestion.label,
    why: suggestion.description,
    setupSteps: [
      `Place the necessary item in view before the cue happens.`,
      `Keep the setup attached to ${input.title || 'this routine'} so it is easy to repeat.`,
    ],
    fallbackVersion: recommendations.fallbackSuggestion ?? 'Do the 2-minute version.',
  }));

  return topIdeas.length > 0
    ? topIdeas
    : [
        {
          title: 'Create a visible cue',
          why: 'A visible cue reduces forgetting and lowers the cost of getting started.',
          setupSteps: [
            'Choose one exact place where the habit will start.',
            'Put a visible reminder there today.',
          ],
          fallbackVersion: 'Do the smallest possible version for 2 minutes.',
        },
      ];
}

function buildPrompt(input: EnvironmentAiSuggestionInput): string {
  return `You are an environment design coach. Return JSON only with this exact shape:
{
  "ideas": [
    {
      "title": "string",
      "why": "string",
      "setupSteps": ["string", "string"],
      "fallbackVersion": "string"
    }
  ]
}

Generate exactly 3 practical environment ideas for this ${input.entityType}.
Title: ${input.title}
Description: ${input.description ?? 'n/a'}
Current environment context: ${JSON.stringify(input.context ?? {})}
Constraints: practical, non-judgmental, specific, short, and mobile-friendly.`;
}

async function callOpenAI(input: EnvironmentAiSuggestionInput, timeoutMs = 3500): Promise<EnvironmentAiIdea[] | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;
  const decision = resolveAiEntitlement('environment_idea_generation', Boolean(apiKey));
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
        messages: [{ role: 'user', content: buildPrompt(input) }],
        max_tokens: 350,
        temperature: 0.6,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('OpenAI environment suggestion returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;

    const parsed = JSON.parse(content) as { ideas?: EnvironmentAiIdea[] };
    if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) return null;

    return parsed.ideas
      .filter((idea) => idea && typeof idea.title === 'string' && typeof idea.why === 'string')
      .map((idea) => ({
        title: idea.title.trim(),
        why: idea.why.trim(),
        setupSteps: Array.isArray(idea.setupSteps) ? idea.setupSteps.filter(Boolean).slice(0, 3) : [],
        fallbackVersion: typeof idea.fallbackVersion === 'string' ? idea.fallbackVersion.trim() : 'Do the 2-minute version.',
      }))
      .slice(0, 3);
  } catch (error) {
    console.warn('OpenAI environment suggestion failed:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateEnvironmentAiSuggestions(
  input: EnvironmentAiSuggestionInput,
): Promise<EnvironmentAiSuggestionResult> {
  if (!input.title.trim()) {
    return { ideas: [], error: 'Add a title first so AI can tailor ideas.', source: 'unavailable' };
  }

  if (!hasOpenAIKey()) {
    return {
      ideas: buildFallbackIdeas(input),
      error: null,
      source: 'fallback',
    };
  }

  const ideas = await callOpenAI(input);
  if (!ideas || ideas.length === 0) {
    return {
      ideas: buildFallbackIdeas(input),
      error: null,
      source: 'fallback',
    };
  }

  return {
    ideas,
    error: null,
    source: 'openai',
  };
}
