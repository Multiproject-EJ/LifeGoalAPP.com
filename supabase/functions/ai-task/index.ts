import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Server path of the app's shared AI runtime (src/services/ai/aiRuntime.ts).
// The app tries the device's own model first (Apple Intelligence) and only
// calls this function when that is unavailable or the task is server-only.
// The OpenAI key exists only here, as the OPENAI_API_KEY function secret.
//
// Guardrails: signed-in users only, a fixed task list, capped input and output
// sizes, the model chosen here (never by the client), and a per-user daily
// quota enforced in the database (migration 20260930090000_ai_task_quota.sql).

type AiLevel = 'level_1' | 'level_2';

// Keep in sync with AI_TASK_REGISTRY in src/services/aiTaskRouting.ts.
const TASKS: Record<string, { level: AiLevel; maxTokens: number }> = {
  habit_title_rewrite: { level: 'level_1', maxTokens: 200 },
  habit_suggestion_structured: { level: 'level_1', maxTokens: 300 },
  habit_rationale_rewrite: { level: 'level_1', maxTokens: 200 },
  habit_chain_suggestion: { level: 'level_1', maxTokens: 500 },
  habit_tip_of_day: { level: 'level_2', maxTokens: 400 },
  environment_idea_generation: { level: 'level_1', maxTokens: 450 },
  conflict_inner_reflection: { level: 'level_2', maxTokens: 600 },
  conflict_shared_mediation: { level: 'level_2', maxTokens: 600 },
};

const MODELS: Record<AiLevel, string> = {
  level_1: Deno.env.get('AI_TASK_MODEL_LEVEL_1') ?? 'gpt-4o-mini',
  level_2: Deno.env.get('AI_TASK_MODEL_LEVEL_2') ?? 'gpt-4o-mini',
};

const MAX_INSTRUCTIONS_CHARS = 4000;
const MAX_PROMPT_CHARS = 8000;
const OPENAI_TIMEOUT_MS = 25000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userError || !userId) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const taskKey = typeof body.task === 'string' ? body.task : '';
  const task = TASKS[taskKey];
  if (!task) return json({ error: 'Unknown task' }, 400);

  const instructions = typeof body.instructions === 'string' ? body.instructions : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  if (!instructions.trim() || !prompt.trim()) return json({ error: 'Missing instructions or prompt' }, 400);
  if (instructions.length > MAX_INSTRUCTIONS_CHARS || prompt.length > MAX_PROMPT_CHARS) {
    return json({ error: 'Input too long' }, 413);
  }

  const requestedTokens = typeof body.maxTokens === 'number' && Number.isFinite(body.maxTokens) ? body.maxTokens : task.maxTokens;
  const maxTokens = Math.max(16, Math.min(Math.round(requestedTokens), task.maxTokens));
  const temperature = typeof body.temperature === 'number' && Number.isFinite(body.temperature)
    ? Math.max(0, Math.min(body.temperature, 1.2))
    : 0.5;
  const wantsJson = body.json === true;

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return json({ error: 'AI is not configured' }, 503);

  const { data: allowed, error: quotaError } = await supabase.rpc('consume_ai_task_quota', {
    p_user_id: userId,
    p_level: task.level,
  });
  if (quotaError) {
    console.error('ai-task quota check failed:', quotaError.message);
    return json({ error: 'Quota check failed' }, 500);
  }
  if (allowed !== true) return json({ error: 'Daily AI limit reached' }, 429);

  const model = MODELS[task.level];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
        ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`ai-task ${taskKey}: OpenAI returned ${response.status}`);
      return json({ error: 'AI provider error' }, 502);
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'Empty AI response' }, 502);
    return json({
      text,
      model,
      usage: {
        input: typeof data?.usage?.prompt_tokens === 'number' ? data.usage.prompt_tokens : null,
        output: typeof data?.usage?.completion_tokens === 'number' ? data.usage.completion_tokens : null,
      },
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error(`ai-task ${taskKey}: ${aborted ? 'timed out' : 'request failed'}`);
    return json({ error: aborted ? 'AI provider timed out' : 'AI provider error' }, 502);
  } finally {
    clearTimeout(timer);
  }
});
