import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import OpenAI from 'https://esm.sh/openai@4.67.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type VisionStarSpecialRequest = {
  habitNames?: string[];
  goalTitles?: string[];
  userDisplayName?: string;
  isAvatarPOV?: boolean;
};

async function getOpenAIForUser(userId: string, supabase: ReturnType<typeof createClient>): Promise<OpenAI> {
  let apiKey: string | undefined;

  try {
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('provider, api_key')
      .eq('user_id', userId)
      .eq('provider', 'openai')
      .single();

    if (settings?.provider === 'openai' && typeof settings.api_key === 'string' && settings.api_key.trim()) {
      apiKey = settings.api_key.trim();
    }
  } catch (error) {
    console.warn('[vision-star-special] Unable to load ai_settings:', error);
  }

  if (!apiKey) {
    apiKey = Deno.env.get('OPENAI_API_KEY');
  }

  if (!apiKey?.trim()) {
    throw new Error('No OpenAI API key available. Configure ai_settings.api_key or OPENAI_API_KEY.');
  }

  return new OpenAI({ apiKey });
}

async function getUserAiModel(userId: string, supabase: ReturnType<typeof createClient>): Promise<string> {
  const defaultModel = 'gpt-4o-mini';
  try {
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('provider, model')
      .eq('user_id', userId)
      .eq('provider', 'openai')
      .single();

    if (settings?.provider === 'openai' && typeof settings.model === 'string' && settings.model.trim()) {
      return settings.model.trim();
    }
  } catch (error) {
    console.warn('[vision-star-special] Unable to load model preference:', error);
  }

  return defaultModel;
}

function safeList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, max);
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

    const body = (await req.json()) as VisionStarSpecialRequest;
    const habitNames = safeList(body.habitNames, 6);
    const goalTitles = safeList(body.goalTitles, 6);
    const userDisplayName = typeof body.userDisplayName === 'string' && body.userDisplayName.trim()
      ? body.userDisplayName.trim().slice(0, 80)
      : 'You';
    const pov = body.isAvatarPOV ? 'avatar first-person POV' : 'first-person POV';

    const openai = await getOpenAIForUser(user.id, supabase);
    const model = await getUserAiModel(user.id, supabase);

    const storyPrompt = [
      'Return strict JSON with keys: caption (string), panels (array of exactly 5 short strings), imagePrompt (string).',
      'Tone: uplifting, actionable, personal, visual.',
      `User: ${userDisplayName}`,
      `POV style: ${pov}`,
      `Habit focus: ${habitNames.join(' | ') || 'consistency and momentum'}`,
      `Goal focus: ${goalTitles.join(' | ') || 'meaningful long-term growth'}`,
      'Keep each panel max 18 words.',
      'Image prompt must describe one cinematic scene that reflects the story arc and first-person growth.',
    ].join('\n');

    const storyResult = await openai.chat.completions.create({
      model,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an inspiring storytelling assistant.' },
        { role: 'user', content: storyPrompt },
      ],
    });

    const raw = storyResult.choices?.[0]?.message?.content?.trim() || '{}';
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }

    const caption = typeof parsed.caption === 'string' && parsed.caption.trim()
      ? parsed.caption.trim().slice(0, 220)
      : '✨ Special vision star unlocked.';

    const panels = safeList(parsed.panels, 5);
    while (panels.length < 5) {
      panels.push(`Panel ${panels.length + 1}: Keep moving with intention.`);
    }

    const imagePrompt = typeof parsed.imagePrompt === 'string' && parsed.imagePrompt.trim()
      ? parsed.imagePrompt.trim().slice(0, 1000)
      : `Cinematic ${pov} of ${userDisplayName} stepping into their future goals with hope, energy, and momentum.`;

    const imageResult = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: imagePrompt,
      size: '1024x1024',
      quality: 'high',
      response_format: 'b64_json',
    });

    const b64Image = imageResult.data?.[0]?.b64_json;
    if (!b64Image) {
      throw new Error('Image generation succeeded but no base64 payload was returned.');
    }

    return new Response(
      JSON.stringify({
        caption,
        panels,
        imagePrompt,
        imageDataUrl: `data:image/png;base64,${b64Image}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[vision-star-special] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate special vision star' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
