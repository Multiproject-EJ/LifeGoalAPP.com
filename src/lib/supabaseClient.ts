import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import defaultCredentials from '../../supabase/defaultCredentials.json';
import type { Database } from './database.types';

let cachedClient: SupabaseClient<Database> | null = null;
let activeSession: Session | null = null;
const DEFAULT_AUTH_CALLBACK_PATH = '/auth/callback.html';
const SUPABASE_AUTH_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export function getSupabaseUrl(): string | null {
  return resolveSupabaseUrl();
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

export function isSupabaseAuthUserId(userId: string | null | undefined): userId is string {
  return typeof userId === 'string' && SUPABASE_AUTH_USER_ID_PATTERN.test(userId);
}

/**
 * Use this guard whenever a query writes or filters by a caller-provided user ID.
 * Besides requiring a configured, authenticated client, it rejects synthetic demo
 * IDs and prevents a preview/session mismatch from querying as another user.
 */
export function canUseSupabaseDataForUser(userId: string | null | undefined): userId is string {
  return (
    canUseSupabaseData()
    && isSupabaseAuthUserId(userId)
    && activeSession?.user?.id === userId
  );
}

export async function canUseSupabaseDataAsync(): Promise<boolean> {
  if (!hasSupabaseCredentials()) return false;
  if (activeSession) return true;
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      activeSession = data.session;
      return true;
    }
    return false;
  } catch {
    return false;
  }
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
      detectSessionInUrl: true,
      flowType: 'pkce',
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
