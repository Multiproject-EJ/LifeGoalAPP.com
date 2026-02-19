import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import OpenAI from 'https://esm.sh/openai@4.67.3';

type ChatRole = 'user' | 'assistant' | 'system';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type DraftGoal = {
  title: string;
  description: string;
  life_wheel_category: string | null;
  target_date: string | null;
  status_tag: string;
  milestones: string[];
  tasks: string[];
};

type ContextGoal = {
  title?: string;
  statusTag?: string | null;
  lifeWheelCategory?: string | null;
  targetDate?: string | null;
};

type ContextEvolutionEvent = {
  snapshotType?: string;
  summary?: string;
  createdAt?: string;
};

type GoalCoachRequest = {
  messages: ChatMessage[];
  context?: {
    life_wheel_category?: string;
    personality_summary?: string;
    existing_goals?: string[];
    ai_access?: {
      goalEvolution?: boolean;
    };
    existing_goals_structured?: ContextGoal[];
    goal_evolution_summary?: string;
    goal_evolution_events?: ContextEvolutionEvent[];
  };
  finalize?: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MODEL = 'gpt-5-nano';
const MAX_TURNS = 24;
const MAX_MESSAGE_CHARS = 1200;

function safeText(value: unknown, limit = 1000): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function isChatRole(role: unknown): role is ChatRole {
  return role === 'user' || role === 'assistant' || role === 'system';
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        role: isChatRole(obj.role) ? obj.role : null,
        content: safeText(obj.content, MAX_MESSAGE_CHARS),
      };
    })
    .filter((msg): msg is ChatMessage => Boolean(msg.role) && msg.content.length > 0)
    .slice(-MAX_TURNS);
}

function normalizeDraftGoal(raw: unknown, fallbackCategory?: string): DraftGoal | null {
  if (!raw || typeof raw !== 'object') return null;

  const draft = raw as Record<string, unknown>;
  const title = safeText(draft.title, 180);
  if (!title) return null;

  const milestonesRaw = Array.isArray(draft.milestones) ? draft.milestones : [];
  const tasksRaw = Array.isArray(draft.tasks) ? draft.tasks : [];

  const milestones = milestonesRaw.map((m) => safeText(m, 180)).filter(Boolean).slice(0, 7);
  const tasks = tasksRaw.map((t) => safeText(t, 180)).filter(Boolean).slice(0, 10);

  return {
    title,
    description: safeText(draft.description, 1200),
    life_wheel_category: safeText(draft.life_wheel_category, 120) || fallbackCategory || null,
    target_date: safeText(draft.target_date, 32) || null,
    status_tag: safeText(draft.status_tag, 32) || 'active',
    milestones,
    tasks,
  };
}

async function getOpenAIForUser(userId: string, supabase: ReturnType<typeof createClient>): Promise<OpenAI> {
  let apiKey: string | undefined;

  const { data: settings } = await supabase
    .from('ai_settings')
    .select('provider, api_key')
    .eq('user_id', userId)
    .eq('provider', 'openai')
    .maybeSingle();

  if (settings?.provider === 'openai' && settings.api_key?.trim()) {
    apiKey = settings.api_key.trim();
  }

  if (!apiKey) {
    apiKey = Deno.env.get('OPENAI_API_KEY');
  }

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No OpenAI API key available. Configure ai_settings.api_key or OPENAI_API_KEY.');
  }

  return new OpenAI({ apiKey });
}

async function getUserModel(userId: string, supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: settings } = await supabase
    .from('ai_settings')
    .select('provider, model')
    .eq('user_id', userId)
    .eq('provider', 'openai')
    .maybeSingle();

  if (settings?.provider === 'openai' && settings.model?.trim()) {
    return settings.model.trim();
  }

  return DEFAULT_MODEL;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as GoalCoachRequest;
    const messages = normalizeMessages(body.messages);

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages[] is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const context = body.context ?? {};
    const openai = await getOpenAIForUser(user.id, supabase);
    const model = await getUserModel(user.id, supabase);

    const finalizeRequested = body.finalize === true;

    const systemPrompt = [
      'You are a goal-coaching assistant. Help users shape a meaningful and practical goal.',
      'Treat goal evolution as healthy adaptation, not failure.',
      'Return valid JSON only in this schema:',
      '{"assistant_message":"string","draft_goal":null|{"title":"string","description":"string","life_wheel_category":"string|null","target_date":"YYYY-MM-DD|null","status_tag":"string","milestones":["string"],"tasks":["string"]}}',
      'If finalize_requested=true, prioritize returning draft_goal with concrete fields and realistic steps.',
      'If uncertain, keep draft_goal as null and continue coaching.',
    ].join('\n');

    const contextBlock = [
      safeText(context.life_wheel_category, 120) ? `life_wheel_category: ${safeText(context.life_wheel_category, 120)}` : null,
      safeText(context.personality_summary, 400)
        ? `personality_summary: ${safeText(context.personality_summary, 400)}`
        : null,
      Array.isArray(context.existing_goals) && context.existing_goals.length > 0
        ? `existing_goals: ${context.existing_goals.map((goal) => safeText(goal, 140)).filter(Boolean).slice(0, 12).join(' | ')}`
        : null,
      Array.isArray(context.existing_goals_structured) && context.existing_goals_structured.length > 0
        ? `existing_goals_structured: ${JSON.stringify(
            context.existing_goals_structured
              .slice(0, 12)
              .map((goal) => ({
                title: safeText(goal?.title, 140),
                statusTag: safeText(goal?.statusTag, 40) || null,
                lifeWheelCategory: safeText(goal?.lifeWheelCategory, 60) || null,
                targetDate: safeText(goal?.targetDate, 32) || null,
              }))
              .filter((goal) => goal.title.length > 0),
          )}`
        : null,
      context.ai_access?.goalEvolution === true && safeText(context.goal_evolution_summary, 400)
        ? `goal_evolution_summary: ${safeText(context.goal_evolution_summary, 400)}`
        : null,
      context.ai_access?.goalEvolution === true && Array.isArray(context.goal_evolution_events) && context.goal_evolution_events.length > 0
        ? `goal_evolution_events: ${JSON.stringify(
            context.goal_evolution_events
              .slice(0, 8)
              .map((event) => ({
                snapshotType: safeText(event?.snapshotType, 40),
                summary: safeText(event?.summary, 200),
                createdAt: safeText(event?.createdAt, 40),
              }))
              .filter((event) => event.summary.length > 0),
          )}`
        : null,
      finalizeRequested ? 'finalize_requested: true' : null,
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model,
      temperature: finalizeRequested ? 0.4 : 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(contextBlock ? [{ role: 'system' as const, content: `Context:\n${contextBlock}` }] : []),
        ...messages,
      ],
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({
          assistant_message:
            'I can help refine this goal. Could you share your target timeline and first milestone so I can draft it clearly?',
          draft_goal: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const assistantMessage = safeText(parsed.assistant_message, 1200) ||
      'Thanks—tell me a little more about your timeline and what progress should look like.';

    const draftGoal = normalizeDraftGoal(parsed.draft_goal, safeText(context.life_wheel_category, 120) || undefined);

    return new Response(
      JSON.stringify({
        assistant_message: assistantMessage,
        draft_goal: draftGoal,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[goal-coach-chat] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unexpected error in goal-coach-chat.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
