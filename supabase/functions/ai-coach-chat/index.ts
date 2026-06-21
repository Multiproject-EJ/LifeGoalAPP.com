import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import OpenAI from 'https://esm.sh/openai@4.67.3';

type ChatRole = 'user' | 'assistant' | 'system';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type AiCoachChatRequest = {
  messages: ChatMessage[];
  systemPrompt?: string;
  accessSummary?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MODEL = 'gpt-5-nano';
const MAX_TURNS = 18;
const MAX_MESSAGE_CHARS = 1600;
const MAX_SYSTEM_CHARS = 5000;

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
    .filter((msg) => msg.role !== 'system')
    .slice(-MAX_TURNS);
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

    const body = (await req.json()) as AiCoachChatRequest;
    const messages = normalizeMessages(body.messages);

    if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
      return new Response(JSON.stringify({ error: 'A latest user message is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openai = await getOpenAIForUser(user.id, supabase);
    const model = await getUserModel(user.id, supabase);
    const clientSystemPrompt = safeText(body.systemPrompt, MAX_SYSTEM_CHARS);
    const accessSummary = safeText(body.accessSummary, 600);
    const systemPrompt = [
      clientSystemPrompt || 'You are the LifeGoalApp AI Coach: calm, grounded, pragmatic, privacy-aware, and focused on tiny next steps.',
      'Ask short reflective questions before prescribing actions. Offer 2-3 small options when useful. Never shame the user or promise guaranteed outcomes.',
      'Do not claim you changed goals, habits, journals, or gameplay state. If an action would modify app data, present it as a suggestion for the user to confirm in the UI.',
      accessSummary ? `Visible privacy summary: ${accessSummary}` : null,
      'Reply as plain text. Keep the response concise: usually 2-5 short paragraphs or bullets.',
    ].filter(Boolean).join('\n\n');

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const assistantMessage = completion.choices?.[0]?.message?.content?.trim();
    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    return new Response(JSON.stringify({ assistant_message: safeText(assistantMessage, 4000) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ai-coach-chat] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error in ai-coach-chat.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
