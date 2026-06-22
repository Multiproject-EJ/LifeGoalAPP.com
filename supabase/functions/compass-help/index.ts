// ========================================================
// EDGE FUNCTION: compass-help
// Purpose: A narrow, privacy-respecting "Help me think" assistant for ONE
// Compass Book question at a time. It proposes only — it never writes answers,
// goals, or habits, and it must never present interpretations as fact.
// Receives only the single question (prompt + options + the player's current
// draft), never other answers or wider Compass data.
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import OpenAI from 'https://esm.sh/openai@4.67.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompassHelpRequest {
  chapterId: string;
  questionId: string;
  blockType: string;
  prompt: string;
  options?: { id: string; label: string }[];
  currentDraft?: string;
}

interface CompassHelpResponse {
  suggestion: string;
  recommendedOptionIds?: string[];
  draftText?: string;
}

interface AiSettings {
  user_id: string;
  provider: string;
  api_key: string | null;
  model: string | null;
}

async function getOpenAIForUser(userId: string, supabase: any): Promise<OpenAI> {
  let apiKey: string | undefined;
  try {
    const { data: settings, error } = await supabase
      .from('ai_settings')
      .select('user_id, provider, api_key, model')
      .eq('user_id', userId)
      .single();
    if (!error && settings && settings.provider === 'openai' && settings.api_key?.trim()) {
      apiKey = settings.api_key.trim();
    }
  } catch (error) {
    console.warn(`[compass-help] Could not fetch user AI settings for ${userId}:`, error);
  }
  if (!apiKey) apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey || !apiKey.trim()) {
    throw new Error('No OpenAI API key available.');
  }
  return new OpenAI({ apiKey });
}

async function getUserAiModel(userId: string, supabase: any): Promise<string> {
  const DEFAULT_MODEL = 'gpt-5-nano';
  try {
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('user_id, provider, api_key, model')
      .eq('user_id', userId)
      .eq('provider', 'openai')
      .single();
    if (settings && settings.model?.trim()) return settings.model.trim();
  } catch (error) {
    console.warn(`[compass-help] Could not fetch user AI model for ${userId}:`, error);
  }
  return DEFAULT_MODEL;
}

function composePrompt(body: CompassHelpRequest): string {
  const optionLines = (body.options ?? [])
    .map((o) => `- ${o.id}: ${o.label}`)
    .join('\n');

  return `You are a gentle reflective guide helping someone answer ONE self-reflection question.
You do NOT have their other answers and must not ask for them.

Question: ${body.prompt}
${optionLines ? `Available options:\n${optionLines}` : ''}
${body.currentDraft ? `Their current draft: ${body.currentDraft}` : ''}

Respond ONLY with JSON in this shape:
{
  "suggestion": "1-3 sentences of tentative reflection to help them think",
  ${optionLines ? '"recommendedOptionIds": ["<option id they might consider>"],' : ''}
  ${!optionLines ? '"draftText": "an optional short example phrasing they could adapt",' : ''}
}

Hard rules:
- Use tentative language ("one possibility…", "you might consider…", "does this feel true?").
- NEVER state interpretations as fact. NEVER diagnose. NEVER declare their purpose.
- Only suggest option ids from the list above (if any). Keep it brief and kind.
- This is a suggestion they may ignore; do not pressure a choice.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CompassHelpRequest = await req.json();
    if (!body?.prompt || !body.prompt.trim()) {
      return new Response(JSON.stringify({ error: 'Missing required field: prompt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openai = await getOpenAIForUser(user.id, supabase);
    const model = await getUserAiModel(user.id, supabase);

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a gentle, tentative reflection guide. Always respond with valid JSON only, no extra text. Never present interpretations as fact.',
        },
        { role: 'user', content: composePrompt(body) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const responseContent = completion.choices[0]?.message?.content ?? '';
    let raw: any;
    try {
      raw = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('[compass-help] Failed to parse OpenAI response:', parseError);
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validIds = new Set((body.options ?? []).map((o) => o.id));
    const result: CompassHelpResponse = {
      suggestion: typeof raw.suggestion === 'string' ? raw.suggestion.trim() : '',
      recommendedOptionIds: Array.isArray(raw.recommendedOptionIds)
        ? raw.recommendedOptionIds.filter((id: any) => typeof id === 'string' && validIds.has(id))
        : undefined,
      draftText:
        typeof raw.draftText === 'string' && raw.draftText.trim() ? raw.draftText.trim() : undefined,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[compass-help] Exception:', error);
    return new Response(JSON.stringify({ error: 'AI help is unavailable right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
