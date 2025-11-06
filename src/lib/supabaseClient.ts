import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let cachedClient: SupabaseClient<Database> | null = null;
let activeSession: Session | null = null;

export function hasSupabaseCredentials(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function setSupabaseSession(session: Session | null): void {
  activeSession = session;
}

export function hasActiveSupabaseSession(): boolean {
  return Boolean(activeSession);
}

export function canUseSupabaseData(): boolean {
  return hasSupabaseCredentials() && hasActiveSupabaseSession();
}

export function getActiveSupabaseSession(): Session | null {
  return activeSession;
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase credentials are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.',
    );
  }

  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cachedClient;
}

export type TypedSupabaseClient = SupabaseClient<Database>;
