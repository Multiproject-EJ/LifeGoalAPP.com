// ========================================================
// EDGE FUNCTION: suggest-goal
// Purpose: AI-powered goal suggestion with milestones and tasks
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import OpenAI from 'https://esm.sh/openai@4.67.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestGoalRequest {
  description: string;
  timeframe?: string;
  category?: string;
}

interface SuggestGoalResponse {
  goal: string;
  milestones: string[];
  tasks: string[];
}

interface AiSettings {
  user_id: string;
  provider: string;
  api_key: string | null;
  model: string | null;
}

/**
 * Get OpenAI client for a specific user or fallback to app-level key
 */
async function getOpenAIForUser(userId: string, supabase: any): Promise<OpenAI> {
  let apiKey: string | undefined;

  // Try to get user-specific API key
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
    console.warn(`Could not fetch user AI settings for ${userId}:`, error);
  }

  // Fall back to app-level API key
  if (!apiKey) {
    apiKey = Deno.env.get('OPENAI_API_KEY');
  }

  // Throw clear error if no key is available
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'No OpenAI API key available. Either configure a user-specific key in ai_settings or set OPENAI_API_KEY environment variable.'
    );
  }

  return new OpenAI({ apiKey });
}

/**
 * Get the AI model for a specific user or return default
 */
async function getUserAiModel(userId: string, supabase: any): Promise<string> {
  const DEFAULT_MODEL = 'gpt-5-nano';

  try {
    const { data: settings, error } = await supabase
      .from('ai_settings')
      .select('user_id, provider, api_key, model')
      .eq('user_id', userId)
      .eq('provider', 'openai')
      .single();

    if (!error && settings && settings.model?.trim()) {
      const modelName = settings.model.trim();
      console.log(`[suggest-goal] Using user-configured model: ${modelName} for user ${userId}`);
      return modelName;
    }
  } catch (error) {
    console.warn(`[suggest-goal] Could not fetch user AI model for ${userId}:`, error);
  }

  console.log(`[suggest-goal] Using default model: ${DEFAULT_MODEL} for user ${userId}`);
  return DEFAULT_MODEL;
}

/**
 * Compose a prompt for AI goal suggestion
 */
function composeGoalPrompt(description: string, timeframe?: string, category?: string): string {
  let prompt = `You are a professional goal-setting coach. Based on the following information, suggest a clear, actionable goal with specific milestones and tasks.

Description: ${description}`;

  if (timeframe) {
    prompt += `\nTimeframe: ${timeframe}`;
  }

  if (category) {
    prompt += `\nCategory: ${category}`;
  }

  prompt += `

Please provide a response in the following JSON format:
{
  "goal": "A clear, specific, and measurable goal statement",
  "milestones": ["milestone 1", "milestone 2", "milestone 3"],
  "tasks": ["task 1", "task 2", "task 3", "task 4", "task 5"]
}

Guidelines:
- The goal should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Milestones should be major checkpoints toward the goal (3-5 milestones)
- Tasks should be concrete actions that can be started immediately (3-7 tasks)
- Keep language motivating and actionable`;

  return prompt;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please sign in.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: SuggestGoalRequest = await req.json();
    const { description, timeframe, category } = body;

    // Validate required fields
    if (!description || !description.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: description' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get OpenAI client and model for this user
    const openai = await getOpenAIForUser(user.id, supabase);
    const model = await getUserAiModel(user.id, supabase);

    // Compose the prompt
    const prompt = composeGoalPrompt(description, timeframe, category);

    console.log(`Generating goal suggestion for user ${user.id} with model ${model}`);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional goal-setting coach. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    // Extract and parse the response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Log raw OpenAI content before parsing
    const content = completion.choices[0]?.message?.content ?? "";
    console.log("[suggest-goal] Raw OpenAI content:", content);

    // Parse the raw response from OpenAI
    let raw: any;
    try {
      raw = JSON.parse(responseContent);
      // Log parsed OpenAI JSON
      console.log("[suggest-goal] Parsed OpenAI JSON:", JSON.stringify(raw));
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'AI returned invalid JSON' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normalize the response to ensure it matches the expected format
    // Ensure goal is a non-empty string
    const safeGoal = typeof raw.goal === 'string' && raw.goal.trim() ? raw.goal.trim() : '';

    // Ensure milestones is an array of strings
    const safeMilestones = Array.isArray(raw.milestones)
      ? raw.milestones
          .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
          .map((item: string) => item.trim())
      : [];

    // Ensure tasks is an array of strings
    const safeTasks = Array.isArray(raw.tasks)
      ? raw.tasks
          .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
          .map((item: string) => item.trim())
      : [];

    // Validate that we have complete data after normalization
    if (!safeGoal || safeMilestones.length === 0 || safeTasks.length === 0) {
      console.error("[suggest-goal] Incomplete AI data:", JSON.stringify({
        raw,
        safeGoal,
        safeMilestones,
        safeTasks,
      }));
      return new Response(
        JSON.stringify({ error: 'AI returned incomplete data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build the normalized result
    const result: SuggestGoalResponse = {
      goal: safeGoal,
      milestones: safeMilestones,
      tasks: safeTasks,
    };

    // Log normalized result before returning
    console.log("[suggest-goal] Normalized result:", JSON.stringify(result));

    // Return the normalized suggestion to the client
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in suggest-goal function:', error);
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
