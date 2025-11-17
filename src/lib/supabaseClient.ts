import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import defaultCredentials from '../../supabase/defaultCredentials.json';
import type { Database } from './database.types';

let cachedClient: SupabaseClient<Database> | null = null;
let activeSession: Session | null = null;
const DEFAULT_AUTH_CALLBACK_PATH = '/auth/callback';

type EnvRecord = Record<string, string | undefined>;

function readEnvValue(keys: string[]): string | null {
  const env = import.meta.env as EnvRecord;
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function resolveSupabaseUrl(): string | null {
  const configuredUrl = readEnvValue(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
  if (configuredUrl) return configuredUrl;
  return defaultCredentials.url?.trim() || null;
}

function resolveSupabaseAnonKey(): string | null {
  const configuredAnonKey = readEnvValue(['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
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
  const configuredRedirect = readEnvValue(['VITE_SUPABASE_REDIRECT_URL', 'NEXT_PUBLIC_SUPABASE_REDIRECT_URL']);
  if (configuredRedirect) {
    return configuredRedirect;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${DEFAULT_AUTH_CALLBACK_PATH}`;
  }
  return null;
}
