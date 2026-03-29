import { getSupabaseClient } from '../../../lib/supabaseClient';
import { resolveAiEntitlement } from '../../../services/aiEntitlementService';
import {
  parseInnerRecommendationsFromContent,
  parseResolutionOptionsFromContent,
  parseSharedSummaryCardsFromContent,
  type InnerRecommendation,
  type ResolutionOption,
  type SharedSummaryCard,
} from './conflictAiSchemas';
import {
  lintResolutionOptionFairness,
  lintSharedSummaryFairness,
  type FairnessWarning,
} from './conflictFairnessLint';

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

type SharedSummaryResult = {
  summaryCards: SharedSummaryCard[];
  fairnessWarnings: FairnessWarning[];
  mode: 'premium' | 'free_quota' | 'fallback';
};

type ResolutionOptionsResult = {
  options: ResolutionOption[];
  fairnessWarnings: FairnessWarning[];
  mode: 'premium' | 'free_quota' | 'fallback';
};

type PrivateRewriteResult = {
  rewrittenAnswers: Record<string, string>;
  mode: 'premium' | 'free_quota' | 'fallback';
};

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

const DEFAULT_SHARED_SUMMARY_CARDS: SharedSummaryCard[] = [
  { id: 'what_happened', title: 'What happened', text: 'No summary available yet.' },
  { id: 'what_it_meant', title: 'What it meant', text: 'No emotional summary available yet.' },
  { id: 'what_is_needed', title: 'What is needed', text: 'No needs summary available yet.' },
];

const DEFAULT_RESOLUTION_OPTIONS: ResolutionOption[] = [
  {
    id: 'communicate_earlier',
    title: 'Communicate earlier when plans change',
    description: 'Set expectation to notify as soon as timing changes.',
  },
  {
    id: 'weekly_check_in',
    title: 'Run a weekly 10-minute check-in',
    description: 'Create a predictable moment for concerns before they stack.',
  },
  {
    id: 'repair_protocol',
    title: 'Use a 24-hour repair protocol',
    description: 'Agree to acknowledge and respond within 24 hours after friction.',
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

function buildSharedSummaryPrompt(input: { answers: Record<string, string> }): string {
  return `You are a neutral conflict mediator.
Return strict JSON with this shape only:
{
  "summaryCards": [
    {"id":"what_happened","title":"What happened","text":"string"},
    {"id":"what_it_meant","title":"What it meant","text":"string"},
    {"id":"what_is_needed","title":"What is needed","text":"string"}
  ]
}
Use balanced language with no blame or insults.
Input answers: ${JSON.stringify(input.answers)}
`;
}

function buildResolutionOptionsPrompt(input: { summaryCards: SharedSummaryCard[] }): string {
  return `You are a practical conflict coach.
Return strict JSON only:
{
  "options": [
    {"id":"string","title":"string","description":"string"}
  ]
}
Generate up to 3 concrete next-step resolution options that are fair to both sides.
Summary cards: ${JSON.stringify(input.summaryCards)}
`;
}

function buildPrivateRewritePrompt(input: { answers: Record<string, string> }): string {
  return `You are a supportive writing assistant for conflict reflection.
Return strict JSON only:
{
  "rewrittenAnswers": {
    "what_happened":"string",
    "what_it_meant":"string",
    "what_is_needed":"string"
  }
}
Keep user intent, improve clarity and reduce escalatory tone.
Draft answers: ${JSON.stringify(input.answers)}
`;
}

async function persistAiRun(params: {
  sessionId?: string | null;
  stage: 'private_capture_rewrite' | 'shared_read_summary' | 'resolution_options' | 'inner_tension_next_steps';
  mode: 'premium' | 'free_quota' | 'fallback';
  model: string | null;
  usedContextDomains: string[];
  fallbackUsed: boolean;
  errorMessage?: string | null;
}) {
  if (!params.sessionId) return;
  const supabase = getSupabaseClient() as any;
  const { error } = await supabase.from('conflict_ai_runs').insert({
    session_id: params.sessionId,
    stage: params.stage,
    mode: params.mode,
    model: params.model,
    used_context_domains: params.usedContextDomains,
    fallback_used: params.fallbackUsed,
    error_message: params.errorMessage ?? null,
  });
  if (error) {
    console.warn('[conflict-ai] persistAiRun failed', { stage: params.stage, error });
  }
}

async function persistArtifact(params: {
  sessionId?: string | null;
  stage: 'private_capture_rewrite' | 'shared_read_summary' | 'resolution_options' | 'inner_tension_next_steps';
  artifact: unknown;
}) {
  if (!params.sessionId) return;
  const supabase = getSupabaseClient() as any;
  const { error } = await supabase.from('conflict_ai_artifacts').insert({
    session_id: params.sessionId,
    stage: params.stage,
    artifact: params.artifact,
  });
  if (error) {
    console.warn('[conflict-ai] persistArtifact failed', { stage: params.stage, error });
  }
}

async function persistAiMessage(params: {
  sessionId?: string | null;
  stage: 'private_capture_rewrite' | 'shared_read_summary' | 'resolution_options' | 'inner_tension_next_steps';
  role: 'system' | 'user' | 'assistant';
  message: string;
  metadata?: Record<string, unknown>;
}) {
  if (!params.sessionId) return;
  const supabase = getSupabaseClient() as any;
  const { error } = await supabase.from('conflict_ai_messages').insert({
    session_id: params.sessionId,
    stage: params.stage,
    role: params.role,
    message: params.message,
    metadata: params.metadata ?? {},
  });
  if (error) {
    console.warn('[conflict-ai] persistAiMessage failed', { stage: params.stage, role: params.role, error });
  }
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
    const parsed = parseInnerRecommendationsFromContent(content, MAX_RECOMMENDATIONS);
    if (parsed.length > 0) {
      return parsed;
    }

    if (attempt >= maxAttempts) {
      throw new Error('OpenAI response schema invalid');
    }
  }
  return [];
}

async function requestOpenAiRawContent(prompt: string, model: string, apiKey: string): Promise<unknown> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 500,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content;
}

export async function generateInnerNextStepRecommendations(input: InnerContextInput): Promise<InnerNextStepResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const decision = resolveAiEntitlement('conflict_inner_reflection', hasApiKey());

  if (!decision.allowed || !decision.model || !apiKey) {
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      role: 'assistant',
      message: 'Used deterministic fallback due to entitlement/API availability.',
      metadata: { reason: decision.reason, mode: decision.mode },
    });
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
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      role: 'user',
      message: buildPrompt(input),
      metadata: { model: decision.model, mode: decision.mode },
    });
    const recommendations = await requestOpenAiRecommendations(input, decision.model, apiKey);
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      role: 'assistant',
      message: JSON.stringify({ recommendations }),
      metadata: { source: 'ai' },
    });

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
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'inner_tension_next_steps',
      role: 'assistant',
      message: 'Used deterministic fallback after orchestration error.',
      metadata: { error: message, source: 'fallback' },
    });
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

export async function rewritePrivateCaptureAnswers(input: {
  sessionId?: string | null;
  answers: Record<string, string>;
}): Promise<PrivateRewriteResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const decision = resolveAiEntitlement('conflict_shared_mediation', hasApiKey());
  const fallbackRewritten = {
    what_happened: (input.answers.what_happened ?? '').trim(),
    what_it_meant: (input.answers.what_it_meant ?? '').trim(),
    what_is_needed: (input.answers.what_is_needed ?? '').trim(),
  };

  if (!decision.allowed || !decision.model || !apiKey) {
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'private_capture_rewrite',
      role: 'assistant',
      message: 'Used deterministic rewrite fallback due to entitlement/API availability.',
      metadata: { reason: decision.reason, mode: decision.mode },
    });
    await persistAiRun({
      sessionId: input.sessionId,
      stage: 'private_capture_rewrite',
      mode: decision.mode,
      model: decision.model,
      usedContextDomains: ['reflections'],
      fallbackUsed: true,
      errorMessage: decision.reason,
    });
    return { rewrittenAnswers: fallbackRewritten, mode: decision.mode };
  }

  try {
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'private_capture_rewrite',
      role: 'user',
      message: buildPrivateRewritePrompt(input),
      metadata: { model: decision.model, mode: decision.mode },
    });
    const content = await requestOpenAiRawContent(buildPrivateRewritePrompt(input), decision.model, apiKey);
    const parsed = typeof content === 'string' ? JSON.parse(content) as { rewrittenAnswers?: Record<string, string> } : null;
    const rewritten = parsed?.rewrittenAnswers ?? fallbackRewritten;
    await persistAiRun({
      sessionId: input.sessionId,
      stage: 'private_capture_rewrite',
      mode: decision.mode,
      model: decision.model,
      usedContextDomains: ['reflections'],
      fallbackUsed: false,
    });
    await persistArtifact({
      sessionId: input.sessionId,
      stage: 'private_capture_rewrite',
      artifact: { rewrittenAnswers: rewritten, source: 'ai' },
    });
    return { rewrittenAnswers: rewritten, mode: decision.mode };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown rewrite error';
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'private_capture_rewrite',
      role: 'assistant',
      message: 'Used deterministic rewrite fallback after orchestration error.',
      metadata: { error: message, source: 'fallback' },
    });
    await persistAiRun({
      sessionId: input.sessionId,
      stage: 'private_capture_rewrite',
      mode: decision.mode,
      model: decision.model,
      usedContextDomains: ['reflections'],
      fallbackUsed: true,
      errorMessage: message,
    });
    return { rewrittenAnswers: fallbackRewritten, mode: 'fallback' };
  }
}

export async function generateSharedSummaryCards(input: {
  sessionId?: string | null;
  answers: Record<string, string>;
}): Promise<SharedSummaryResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const decision = resolveAiEntitlement('conflict_shared_mediation', hasApiKey());
  if (!decision.allowed || !decision.model || !apiKey) {
    const fairnessWarnings = lintSharedSummaryFairness(DEFAULT_SHARED_SUMMARY_CARDS);
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'shared_read_summary',
      role: 'assistant',
      message: JSON.stringify({ summaryCards: DEFAULT_SHARED_SUMMARY_CARDS }),
      metadata: { source: 'fallback', reason: decision.reason, fairnessWarnings },
    });
    return { summaryCards: DEFAULT_SHARED_SUMMARY_CARDS, fairnessWarnings, mode: decision.mode };
  }
  try {
    const prompt = buildSharedSummaryPrompt(input);
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'shared_read_summary',
      role: 'user',
      message: prompt,
      metadata: { model: decision.model, mode: decision.mode },
    });
    const content = await requestOpenAiRawContent(prompt, decision.model, apiKey);
    const cards = parseSharedSummaryCardsFromContent(content);
    const summaryCards = cards.length > 0 ? cards : DEFAULT_SHARED_SUMMARY_CARDS;
    const fairnessWarnings = lintSharedSummaryFairness(summaryCards);
    await persistAiRun({
      sessionId: input.sessionId,
      stage: 'shared_read_summary',
      mode: decision.mode,
      model: decision.model,
      usedContextDomains: ['reflections'],
      fallbackUsed: cards.length === 0 || fairnessWarnings.length > 0,
      errorMessage: cards.length === 0
        ? 'Shared summary schema invalid'
        : fairnessWarnings.length > 0
          ? `Fairness warnings: ${fairnessWarnings.map((warning) => warning.code).join(',')}`
          : null,
    });
    await persistArtifact({
      sessionId: input.sessionId,
      stage: 'shared_read_summary',
      artifact: { summaryCards, fairnessWarnings, source: cards.length > 0 ? 'ai' : 'fallback' },
    });
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'shared_read_summary',
      role: 'assistant',
      message: JSON.stringify({ summaryCards }),
      metadata: { source: cards.length > 0 ? 'ai' : 'fallback', fairnessWarnings },
    });
    return { summaryCards, fairnessWarnings, mode: cards.length > 0 ? decision.mode : 'fallback' };
  } catch {
    const fairnessWarnings = lintSharedSummaryFairness(DEFAULT_SHARED_SUMMARY_CARDS);
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'shared_read_summary',
      role: 'assistant',
      message: JSON.stringify({ summaryCards: DEFAULT_SHARED_SUMMARY_CARDS }),
      metadata: { source: 'fallback', fairnessWarnings },
    });
    return { summaryCards: DEFAULT_SHARED_SUMMARY_CARDS, fairnessWarnings, mode: 'fallback' };
  }
}

export async function generateResolutionOptions(input: {
  sessionId?: string | null;
  summaryCards: SharedSummaryCard[];
}): Promise<ResolutionOptionsResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const decision = resolveAiEntitlement('conflict_shared_mediation', hasApiKey());
  if (!decision.allowed || !decision.model || !apiKey) {
    const fairnessWarnings = lintResolutionOptionFairness(DEFAULT_RESOLUTION_OPTIONS);
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'resolution_options',
      role: 'assistant',
      message: JSON.stringify({ options: DEFAULT_RESOLUTION_OPTIONS }),
      metadata: { source: 'fallback', reason: decision.reason, fairnessWarnings },
    });
    return { options: DEFAULT_RESOLUTION_OPTIONS, fairnessWarnings, mode: decision.mode };
  }
  try {
    const prompt = buildResolutionOptionsPrompt(input);
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'resolution_options',
      role: 'user',
      message: prompt,
      metadata: { model: decision.model, mode: decision.mode },
    });
    const content = await requestOpenAiRawContent(prompt, decision.model, apiKey);
    const parsed = parseResolutionOptionsFromContent(content, 3);
    const options = parsed.length > 0 ? parsed : DEFAULT_RESOLUTION_OPTIONS;
    const fairnessWarnings = lintResolutionOptionFairness(options);
    await persistAiRun({
      sessionId: input.sessionId,
      stage: 'resolution_options',
      mode: decision.mode,
      model: decision.model,
      usedContextDomains: ['reflections'],
      fallbackUsed: parsed.length === 0 || fairnessWarnings.length > 0,
      errorMessage: parsed.length === 0
        ? 'Resolution options schema invalid'
        : fairnessWarnings.length > 0
          ? `Fairness warnings: ${fairnessWarnings.map((warning) => warning.code).join(',')}`
          : null,
    });
    await persistArtifact({
      sessionId: input.sessionId,
      stage: 'resolution_options',
      artifact: { options, fairnessWarnings, source: parsed.length > 0 ? 'ai' : 'fallback' },
    });
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'resolution_options',
      role: 'assistant',
      message: JSON.stringify({ options }),
      metadata: { source: parsed.length > 0 ? 'ai' : 'fallback', fairnessWarnings },
    });
    return { options, fairnessWarnings, mode: parsed.length > 0 ? decision.mode : 'fallback' };
  } catch {
    const fairnessWarnings = lintResolutionOptionFairness(DEFAULT_RESOLUTION_OPTIONS);
    await persistAiMessage({
      sessionId: input.sessionId,
      stage: 'resolution_options',
      role: 'assistant',
      message: JSON.stringify({ options: DEFAULT_RESOLUTION_OPTIONS }),
      metadata: { source: 'fallback', fairnessWarnings },
    });
    return { options: DEFAULT_RESOLUTION_OPTIONS, fairnessWarnings, mode: 'fallback' };
  }
}
