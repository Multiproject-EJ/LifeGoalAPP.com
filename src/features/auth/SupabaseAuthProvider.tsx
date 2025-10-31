import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, SignInWithPasswordCredentials } from '@supabase/supabase-js';
import { getSupabaseClient, hasSupabaseCredentials, type TypedSupabaseClient } from '../../lib/supabaseClient';

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  isConfigured: boolean;
  signInWithPassword: (credentials: SignInWithPasswordCredentials) => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [supabaseError, setSupabaseError] = useState<Error | null>(null);
  const [supabase, setSupabase] = useState<TypedSupabaseClient | null>(null);

  const isConfigured = hasSupabaseCredentials();

  useEffect(() => {
    if (!isConfigured) {
      setSupabase(null);
      setSupabaseError(null);
      return;
    }

    try {
      setSupabase(getSupabaseClient());
      setSupabaseError(null);
    } catch (error) {
      setSupabase(null);
      setSupabaseError(error instanceof Error ? error : new Error('Failed to initialize Supabase client.'));
    }
  }, [isConfigured]);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setInitializing(false);
      return () => {
        isMounted = false;
      };
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (isMounted) {
          setInitializing(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithPassword = useCallback(async (credentials: SignInWithPasswordCredentials) => {
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
  }, [supabase, supabaseError]);

  const signInWithOtp = useCallback(async (email: string) => {
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }, [supabase, supabaseError]);

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw supabaseError ?? new Error('Supabase credentials are not configured.');
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase, supabaseError]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, initializing, isConfigured: Boolean(supabase), signInWithPassword, signInWithOtp, signOut }),
    [session, initializing, supabase, signInWithPassword, signInWithOtp, signOut],
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
