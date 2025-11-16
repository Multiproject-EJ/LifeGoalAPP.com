import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import defaultCredentials from '../../supabase/defaultCredentials.json';
import type { Database } from './database.types';

let cachedClient: SupabaseClient<Database> | null = null;
let activeSession: Session | null = null;
const DEFAULT_AUTH_CALLBACK_PATH = '/auth/callback';

function resolveSupabaseUrl(): string | null {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (configuredUrl) return configuredUrl;
  return defaultCredentials.url?.trim() || null;
}

function resolveSupabaseAnonKey(): string | null {
  const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (configuredAnonKey) return configuredAnonKey;
  return defaultCredentials.anonKey?.trim() || null;
}

export function hasSupabaseCredentials(): boolean {
  return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey());
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

  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = resolveSupabaseAnonKey();

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

export function getSupabaseRedirectUrl(): string | null {
  const configuredRedirect = import.meta.env.VITE_SUPABASE_REDIRECT_URL?.trim();
  if (configuredRedirect) {
    return configuredRedirect;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${DEFAULT_AUTH_CALLBACK_PATH}`;
  }
  return null;
}
