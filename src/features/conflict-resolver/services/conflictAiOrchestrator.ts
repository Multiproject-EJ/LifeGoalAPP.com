import { getSupabaseClient } from '../../../lib/supabaseClient';
import { resolveAiEntitlement } from '../../../services/aiEntitlementService';

type InnerRecommendation = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
};

type InnerContextInput = {
  sessionId?: string | null;
  userId?: string | null;
  answers: Record<string, string>;
  usedContextDomains?: string[];
};

type InnerNextStepResult = {
  recommendations: InnerRecommendation[];
  mode: 'premium' | 'free_quota' | 'fallback';
};

const ALLOWED_HREFS = new Set(['#breathing-space', '#habits', '#goals', '#journal', '#contracts']);
const MAX_RECOMMENDATIONS = 3;

const DEFAULT_RECOMMENDATIONS: InnerRecommendation[] = [
  {
    id: 'journal_first',
    title: 'Capture one clear insight',
    reason: 'Lock in one sentence that summarizes what you learned from this tension.',
    ctaLabel: 'Open Journal',
    href: '#journal',
  },
  {
    id: 'contract_step',
    title: 'Convert insight into one commitment',
    reason: 'Turn reflection into action with one clear promise and a deadline.',
    ctaLabel: 'Open Contracts',
    href: '#contracts',
  },
];

function hasApiKey(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  return typeof apiKey === 'string' && apiKey.length > 0;
}

function buildPrompt(input: InnerContextInput): string {
  return `You are an expert inner-conflict coach. Be non-judgmental, specific, and actionable.
Return strict JSON with this shape only:
{
  "recommendations": [
    { "id": "string", "title": "string", "reason": "string", "ctaLabel": "string", "href": "string" }
  ]
}

Allowed href values: #breathing-space, #habits, #goals, #journal, #contracts.
Generate exactly 3 recommendations max, no markdown.
User reflection answers: ${JSON.stringify(input.answers)}
Context domains used: ${JSON.stringify(input.usedContextDomains ?? [])}
`;
}

function normalizeRecommendation(raw: unknown, index: number): InnerRecommendation | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<InnerRecommendation>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const reason = typeof candidate.reason === 'string' ? candidate.reason.trim() : '';
  const ctaLabel = typeof candidate.ctaLabel === 'string' ? candidate.ctaLabel.trim() : '';
  const href = typeof candidate.href === 'string' ? candidate.href.trim() : '';

  if (!title || !reason || !ctaLabel || !ALLOWED_HREFS.has(href)) return null;
  return {
    id: typeof candidate.id === 'string' && candidate.id.trim().length > 0
      ? candidate.id.trim()
      : `inner_reco_${index + 1}`,
    title,
    reason,
    ctaLabel,
    href,
  };
}

function parseAiRecommendations(content: unknown): InnerRecommendation[] {
  if (typeof content !== 'string' || content.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(content) as { recommendations?: unknown[] };
    if (!Array.isArray(parsed.recommendations)) return [];
    return parsed.recommendations
      .map((item, index) => normalizeRecommendation(item, index))
      .filter((item): item is InnerRecommendation => Boolean(item))
      .slice(0, MAX_RECOMMENDATIONS);
  } catch {
    return [];
  }
}

async function persistAiRun(params: {
  sessionId?: string | null;
  stage: 'inner_tension_next_steps';
  mode: 'premium' | 'free_quota' | 'fallback';
  model: string | null;
  usedContextDomains: string[];
  fallbackUsed: boolean;
  errorMessage?: string | null;
}) {
  if (!params.sessionId) return;
  const supabase = getSupabaseClient() as any;
  await supabase.from('conflict_ai_runs').insert({
    session_id: params.sessionId,
    stage: params.stage,
    mode: params.mode,
    model: params.model,
    used_context_domains: params.usedContextDomains,
    fallback_used: params.fallbackUsed,
    error_message: params.errorMessage ?? null,
  });
}

async function persistArtifact(params: {
  sessionId?: string | null;
  stage: 'inner_tension_next_steps';
  artifact: unknown;
}) {
  if (!params.sessionId) return;
  const supabase = getSupabaseClient() as any;
  await supabase.from('conflict_ai_artifacts').insert({
    session_id: params.sessionId,
    stage: params.stage,
    artifact: params.artifact,
  });
}

async function requestOpenAiRecommendations(input: InnerContextInput, model: string, apiKey: string): Promise<InnerRecommendation[]> {
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildPrompt(input) }],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (attempt >= maxAttempts) {
        throw new Error(`OpenAI returned ${response.status}`);
      }
      continue;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = parseAiRecommendations(content);
    if (parsed.length > 0) {
      return parsed;
    }

    if (attempt >= maxAttempts) {
      throw new Error('OpenAI response schema invalid');
    }
  }
  return [];
}

export async function generateInnerNextStepRecommendations(input: InnerContextInput): Promise<InnerNextStepResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const decision = resolveAiEntitlement('conflict_inner_reflection', hasApiKey());

  if (!decision.allowed || !decision.model || !apiKey) {
    await persistAiRun({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      mode: decision.mode,
      model: decision.model,
      usedContextDomains: input.usedContextDomains ?? [],
      fallbackUsed: true,
      errorMessage: decision.reason,
    });
    await persistArtifact({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      artifact: { recommendations: DEFAULT_RECOMMENDATIONS, source: 'fallback' },
    });
    return { recommendations: DEFAULT_RECOMMENDATIONS, mode: decision.mode };
  }

  try {
    const recommendations = await requestOpenAiRecommendations(input, decision.model, apiKey);

    await persistAiRun({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      mode: decision.mode,
      model: decision.model,
      usedContextDomains: input.usedContextDomains ?? [],
      fallbackUsed: false,
    });
    await persistArtifact({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      artifact: { recommendations, source: 'ai' },
    });

    return {
      recommendations,
      mode: decision.mode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown orchestration error';
    await persistAiRun({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      mode: decision.mode,
      model: decision.model,
      usedContextDomains: input.usedContextDomains ?? [],
      fallbackUsed: true,
      errorMessage: message,
    });
    await persistArtifact({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      artifact: { recommendations: DEFAULT_RECOMMENDATIONS, source: 'fallback', error: message },
    });
    return { recommendations: DEFAULT_RECOMMENDATIONS, mode: 'fallback' };
  }
}
