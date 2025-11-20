// Copilot, create an auth helper for this app.
//
// Requirements:
// - Export a function `getUserIdFromRequest` that works with Supabase auth.
// - For Supabase Edge Functions (Deno), this should extract the user from the Authorization header.
// - For potential Next.js API routes (Node.js), this should work with NextRequest.
// - Uses @supabase/supabase-js to verify the JWT token.
// - Returns the user ID if valid, null otherwise.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
      'Missing NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL environment variable'
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
 * Extract user ID from a request with Supabase authentication
 * 
 * This function works with both Next.js API routes and generic HTTP requests.
 * It extracts the JWT token from the Authorization header and verifies it with Supabase.
 * 
 * @param req - Request object (can be NextRequest or a generic Request with headers)
 * @returns User ID if authenticated, null otherwise
 */
export async function getUserIdFromRequest(
  req: { headers: Headers | Map<string, string> | { get(name: string): string | null } }
): Promise<string | null> {
  try {
    // Extract Authorization header
    let authHeader: string | null = null;
    
    if (req.headers instanceof Headers) {
      authHeader = req.headers.get('Authorization');
    } else if (typeof (req.headers as any).get === 'function') {
      authHeader = (req.headers as any).get('Authorization');
    }

    if (!authHeader) {
      return null;
    }

    // Extract JWT token (format: "Bearer <token>")
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return null;
    }

    // Verify token with Supabase
    const supabase = getSupabaseServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn('Failed to authenticate user:', error?.message);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error in getUserIdFromRequest:', error);
    return null;
  }
}

/**
 * Alternative helper for Supabase Edge Functions (Deno environment)
 * 
 * This is a simpler version that can be used directly in Edge Functions.
 * It's exported for documentation purposes, but Edge Functions typically
 * use supabase.auth.getUser() directly.
 * 
 * Example usage in Edge Function:
 * ```typescript
 * const supabase = createClient(supabaseUrl, supabaseKey, {
 *   global: { headers: { Authorization: req.headers.get('Authorization') } }
 * });
 * const { data: { user }, error } = await supabase.auth.getUser();
 * const userId = user?.id ?? null;
 * ```
 */
export async function getUserIdFromEdgeFunctionRequest(
  authHeader: string | null,
  supabase: SupabaseClient
): Promise<string | null> {
  if (!authHeader) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting user from Edge Function request:', error);
    return null;
  }
}
