import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Session,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
  User,
} from '@supabase/supabase-js';
import { getSupabaseClient, hasSupabaseCredentials, type TypedSupabaseClient } from '../../lib/supabaseClient';
import { DEMO_USER_EMAIL, DEMO_USER_ID, DEMO_USER_NAME } from '../../services/demoData';

type AuthProviderMode = 'supabase' | 'demo';

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  isConfigured: boolean;
  mode: AuthProviderMode;
  client: TypedSupabaseClient | null;
  signInWithPassword: (credentials: SignInWithPasswordCredentials) => Promise<void>;
  signUpWithPassword: (credentials: SignUpWithPasswordCredentials) => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createDemoSession(): Session {
  const isoNow = new Date().toISOString();
  const unixNow = Math.floor(Date.now() / 1000);
  const demoUser: User = {
    id: DEMO_USER_ID,
    app_metadata: { provider: 'demo', providers: ['demo'] },
    user_metadata: { full_name: DEMO_USER_NAME, onboarding_complete: true },
    aud: 'authenticated',
    confirmation_sent_at: isoNow,
    confirmed_at: isoNow,
    created_at: isoNow,
    email: DEMO_USER_EMAIL,
    email_confirmed_at: isoNow,
    factors: [],
    identities: [],
    invited_at: isoNow,
    last_sign_in_at: isoNow,
    phone: '',
    phone_confirmed_at: null,
    recovery_sent_at: isoNow,
    role: 'authenticated',
    updated_at: isoNow,
    raw_app_meta_data: { provider: 'demo', providers: ['demo'] },
    raw_user_meta_data: { full_name: DEMO_USER_NAME, onboarding_complete: true },
  } as unknown as User;

  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    token_type: 'bearer',
    user: demoUser,
    expires_in: 3600,
    expires_at: unixNow + 3600,
    provider_refresh_token: null,
    provider_token: null,
  } as Session;
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const mode: AuthProviderMode = hasSupabaseCredentials() ? 'supabase' : 'demo';

  const [session, setSession] = useState<Session | null>(mode === 'demo' ? createDemoSession() : null);
  const [initializing, setInitializing] = useState(mode === 'supabase');
  const [supabaseError, setSupabaseError] = useState<Error | null>(null);
  const [supabase, setSupabase] = useState<TypedSupabaseClient | null>(null);

  useEffect(() => {
    if (mode === 'demo') {
      setSupabase(null);
      setSupabaseError(null);
      setSession(createDemoSession());
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
  }, [mode, supabase]);

  const signInWithPassword = useCallback(async (credentials: SignInWithPasswordCredentials) => {
    if (mode === 'demo') {
      setSession(createDemoSession());
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
      setSession(createDemoSession());
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
