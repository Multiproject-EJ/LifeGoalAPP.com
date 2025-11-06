import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { getSupabaseClient, hasSupabaseCredentials, setSupabaseSession, type TypedSupabaseClient } from '../../lib/supabaseClient';
import { DEMO_USER_EMAIL, DEMO_USER_NAME } from '../../services/demoData';
import { createDemoSession } from '../../services/demoSession';

type AuthProviderMode = 'supabase' | 'demo';

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  isConfigured: boolean;
  isAuthenticated: boolean;
  mode: AuthProviderMode;
  client: TypedSupabaseClient | null;
  signInWithPassword: (credentials: SignInWithPasswordCredentials) => Promise<void>;
  signUpWithPassword: (credentials: SignUpWithPasswordCredentials) => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const mode: AuthProviderMode = hasSupabaseCredentials() ? 'supabase' : 'demo';

  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(mode === 'supabase');
  const [supabaseError, setSupabaseError] = useState<Error | null>(null);
  const [supabase, setSupabase] = useState<TypedSupabaseClient | null>(null);

  useEffect(() => {
    if (mode === 'demo') {
      setSupabase(null);
      setSupabaseError(null);
      setSession(null);
      setSupabaseSession(null);
      setInitializing(false);
      return;
    }

    try {
      setSupabase(getSupabaseClient());
      setSupabaseError(null);
    } catch (error) {
      setSupabase(null);
      setSupabaseError(error instanceof Error ? error : new Error('Failed to initialize Supabase client.'));
    }
  }, [mode]);

  useEffect(() => {
    let isMounted = true;

    if (!supabase || mode !== 'supabase') {
      setInitializing(false);
      return () => {
        isMounted = false;
      };
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        const nextSession = data.session ?? null;
        setSession(nextSession);
        setSupabaseSession(nextSession);
      })
      .finally(() => {
        if (isMounted) {
          setInitializing(false);
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
      subscription.unsubscribe();
    };
  }, [mode, supabase]);

  const signInWithPassword = useCallback(async (credentials: SignInWithPasswordCredentials) => {
    if (mode === 'demo') {
      setSession(createDemoSession());
      setSupabaseSession(null);
      return;
    }
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
  }, [mode, supabase, supabaseError]);

  const signUpWithPassword = useCallback(
    async (credentials: SignUpWithPasswordCredentials) => {
      if (mode === 'demo') {
        setSession(createDemoSession());
        setSupabaseSession(null);
        return;
      }
      if (!supabase) {
        throw supabaseError ?? new Error('Supabase credentials are not configured.');
      }
      const { error } = await supabase.auth.signUp(credentials);
      if (error) throw error;
    },
    [mode, supabase, supabaseError],
  );

  const signInWithOtp = useCallback(async (email: string) => {
      if (mode === 'demo') {
        setSession(createDemoSession());
        setSupabaseSession(null);
        return;
      }
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }, [mode, supabase, supabaseError]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      if (mode === 'demo') {
        return;
      }
      if (!supabase) {
        throw supabaseError ?? new Error('Supabase credentials are not configured.');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
    [mode, supabase, supabaseError],
  );

  const signOut = useCallback(async () => {
    if (mode === 'demo') {
      setSession(null);
      setSupabaseSession(null);
      return;
    }
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [mode, supabase, supabaseError]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      isConfigured: mode === 'demo' ? true : Boolean(supabase),
      isAuthenticated: Boolean(session),
      mode,
      client: supabase,
      signInWithPassword,
      signUpWithPassword,
      signInWithOtp,
      sendPasswordReset,
      signOut,
    }),
    [
      session,
      initializing,
      mode,
      supabase,
      signInWithPassword,
      signUpWithPassword,
      signInWithOtp,
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
