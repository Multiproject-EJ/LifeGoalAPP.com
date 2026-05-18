import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  getSupabaseRedirectUrl,
  setSupabaseSession,
  type TypedSupabaseClient,
} from '../../lib/supabaseClient';
import { AUTH_INITIALIZATION_TIMEOUT_MS, type AuthInitializationStatus } from './authInitialization';

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  initializationStatus: AuthInitializationStatus;
  initializationError: Error | null;
  isConfigured: boolean;
  isAuthenticated: boolean;
  mode: 'supabase';
  client: TypedSupabaseClient | null;
  retryAuthInitialization: () => void;
  signInWithPassword: (credentials: SignInWithPasswordCredentials) => Promise<void>;
  signUpWithPassword: (credentials: SignUpWithPasswordCredentials) => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type SupabaseLikeError = Error & { status?: number };

function mapSupabaseAuthError(error: SupabaseLikeError): Error {
  const normalizedMessage = error.message ?? '';
  const lowerMessage = normalizedMessage.toLowerCase();
  const status = typeof error.status === 'number' ? error.status : null;

  if (lowerMessage.includes('database error querying schema')) {
    return new Error(
      'Supabase returned "Database error querying schema". This means your project database is missing the latest tables or policies. Open the Supabase SQL editor and run the SQL in supabase/migrations (or sql/manual.sql) to apply the schema, then try again.',
    );
  }

  if (status === 500) {
    return new Error(
      'Supabase responded with HTTP 500 while exchanging credentials (grant_type=password). This almost always happens when the latest tables, policies, or RPCs have not been applied. Run the SQL in supabase/migrations or sql/manual.sql inside the Supabase SQL editor, then rerun the sign-in.',
    );
  }

  return error;
}

function ensureSupabaseAuthError(error: unknown): Error {
  if (error instanceof Error) {
    return mapSupabaseAuthError(error);
  }
  return mapSupabaseAuthError(new Error(String(error)));
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const mode = 'supabase' as const;

  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [initializationStatus, setInitializationStatus] = useState<AuthInitializationStatus>('loading');
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [initializationRetryKey, setInitializationRetryKey] = useState(0);
  const [supabaseError, setSupabaseError] = useState<Error | null>(null);
  const [supabase, setSupabase] = useState<TypedSupabaseClient | null>(null);

  const retryAuthInitialization = useCallback(() => {
    setInitializationRetryKey((current) => current + 1);
  }, []);

  useEffect(() => {
    try {
      setSupabase(getSupabaseClient());
      setSupabaseError(null);
    } catch (error) {
      setSupabase(null);
      setSupabaseError(error instanceof Error ? error : new Error('Failed to initialize Supabase client.'));
    }
  }, [initializationRetryKey, mode]);

  useEffect(() => {
    let isMounted = true;
    let hasTimedOut = false;
    const timeoutId = window.setTimeout(() => {
      hasTimedOut = true;
      if (!isMounted) return;
      setInitializing(false);
      setInitializationStatus('timeout');
      setInitializationError(new Error('HabitGame auth initialization timed out. Please check your connection and try again.'));
    }, AUTH_INITIALIZATION_TIMEOUT_MS);

    if (!supabase || mode !== 'supabase') {
      window.clearTimeout(timeoutId);
      setInitializing(false);
      setInitializationStatus('ready');
      setInitializationError(null);
      return () => {
        isMounted = false;
      };
    }

    setInitializing(true);
    setInitializationStatus('loading');
    setInitializationError(null);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        const nextSession = data.session ?? null;
        setSession(nextSession);
        setSupabaseSession(nextSession);
        setInitializationStatus('ready');
        setInitializationError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setInitializationStatus('error');
        setInitializationError(
          error instanceof Error ? error : new Error('Unable to initialize HabitGame auth. Please check your connection and try again.'),
        );
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (isMounted) {
          setInitializing(false);
          if (!hasTimedOut) {
            setInitializationStatus((current) => (current === 'error' ? 'error' : 'ready'));
          }
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const normalizedSession = nextSession ?? null;
      setSession(normalizedSession);
      setSupabaseSession(normalizedSession);
    });

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [initializationRetryKey, mode, supabase]);

  const signInWithPassword = useCallback(async (credentials: SignInWithPasswordCredentials) => {
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw ensureSupabaseAuthError(error);
  }, [mode, supabase, supabaseError]);

  const signUpWithPassword = useCallback(
    async (credentials: SignUpWithPasswordCredentials) => {
      if (!supabase) {
        throw supabaseError ?? new Error('Supabase credentials are not configured.');
      }
      const { error } = await supabase.auth.signUp(credentials);
      if (error) throw ensureSupabaseAuthError(error);
    },
    [mode, supabase, supabaseError],
  );

  const signInWithOtp = useCallback(
    async (email: string) => {
      if (!supabase) {
        throw supabaseError ?? new Error('Supabase credentials are not configured.');
      }
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw ensureSupabaseAuthError(error);
    },
    [mode, supabase, supabaseError],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const baseRedirectTo = getSupabaseRedirectUrl() ?? 'https://habitgame.app/auth/callback.html';
    let redirectTo = baseRedirectTo;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/conflict/join')) {
      try {
        const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const redirectUrl = new URL(baseRedirectTo, window.location.origin);
        redirectUrl.searchParams.set('next', encodeURIComponent(next));
        redirectTo = redirectUrl.toString();
      } catch {
        // Fallback keeps default redirect URL if URL parsing fails.
        redirectTo = baseRedirectTo;
      }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw ensureSupabaseAuthError(error);
  }, [mode, supabase, supabaseError]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      if (!supabase) {
        throw supabaseError ?? new Error('Supabase credentials are not configured.');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw ensureSupabaseAuthError(error);
    },
    [mode, supabase, supabaseError],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw ensureSupabaseAuthError(error);
  }, [mode, supabase, supabaseError]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      initializationStatus,
      initializationError,
      isConfigured: Boolean(supabase),
      isAuthenticated: Boolean(session),
      mode,
      client: supabase,
      retryAuthInitialization,
      signInWithPassword,
      signUpWithPassword,
      signInWithOtp,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
    }),
    [
      session,
      initializing,
      initializationStatus,
      initializationError,
      mode,
      supabase,
      retryAuthInitialization,
      signInWithPassword,
      signUpWithPassword,
      signInWithOtp,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
