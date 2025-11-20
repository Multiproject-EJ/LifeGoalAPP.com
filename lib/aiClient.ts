// Copilot, build a small AI client helper for this app.
//
// Requirements:
// - TypeScript file exporting a function `getOpenAIForUser(userId?: string)`.
// - Uses @supabase/supabase-js with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY.
// - Looks up an `ai_settings` table in Supabase with columns:
//     user_id uuid (pk, fk to auth.users),
//     provider text,
//     api_key text,
//     model text.
// - If there is a row for the user and provider === 'openai' and api_key is not null,
//   create an OpenAI client with that key.
// - Otherwise, fall back to process.env.OPENAI_API_KEY.
// - Throw a clear error if neither user key nor app key is available.
// - Export a helper `getUserAiModel(userId?: string): Promise<string>` that returns
//   the model from ai_settings if present, otherwise a sane default like 'gpt-4.1-mini'.
// - Use the official `openai` npm package.
// - This file will be used only server-side (API routes / server components).

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Type definition for ai_settings table
interface AiSettings {
  user_id: string;
  provider: string;
  api_key: string | null;
  model: string | null;
}

// Cache for Supabase service client
let serviceClient: SupabaseClient | null = null;

/**
 * Get Supabase service client for server-side operations
 */
function getSupabaseServiceClient(): SupabaseClient {
  if (serviceClient) {
    return serviceClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL environment variable',
    );
  }

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
  }

  serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}

/**
 * Fetch AI settings for a specific user
 */
async function fetchUserAiSettings(userId: string): Promise<AiSettings | null> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('ai_settings')
    .select('user_id, provider, api_key, model')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If no row found, return null (not an error)
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch AI settings: ${error.message}`);
  }

  return data as AiSettings;
}

/**
 * Get OpenAI client for a specific user or fallback to app-level key
 * 
 * @param userId - Optional user ID to look up custom API key
 * @returns OpenAI client instance
 * @throws Error if no valid API key is found
 */
export async function getOpenAIForUser(userId?: string): Promise<OpenAI> {
  let apiKey: string | undefined;

  // Try to get user-specific API key if userId is provided
  if (userId) {
    try {
      const settings = await fetchUserAiSettings(userId);
      
      if (
        settings &&
        settings.provider === 'openai' &&
        settings.api_key &&
        settings.api_key.trim()
      ) {
        apiKey = settings.api_key.trim();
      }
    } catch (error) {
      // Log but don't fail - we'll try the fallback
      console.warn(`Could not fetch user AI settings for ${userId}:`, error);
    }
  }

  // Fall back to app-level API key
  if (!apiKey) {
    apiKey = process.env.OPENAI_API_KEY;
  }

  // Throw clear error if no key is available
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'No OpenAI API key available. Either configure a user-specific key in ai_settings or set OPENAI_API_KEY environment variable.',
    );
  }

  return new OpenAI({ apiKey });
}

/**
 * Get the AI model for a specific user or return default
 * 
 * @param userId - Optional user ID to look up custom model
 * @returns Model name (e.g., 'gpt-4.1-mini')
 */
export async function getUserAiModel(userId?: string): Promise<string> {
  const DEFAULT_MODEL = 'gpt-4.1-mini';

  if (!userId) {
    return DEFAULT_MODEL;
  }

  try {
    const settings = await fetchUserAiSettings(userId);
    
    if (
      settings &&
      settings.provider === 'openai' &&
      settings.model &&
      settings.model.trim()
    ) {
      return settings.model.trim();
    }
  } catch (error) {
    console.warn(`Could not fetch user AI model for ${userId}:`, error);
  }

  return DEFAULT_MODEL;
}
