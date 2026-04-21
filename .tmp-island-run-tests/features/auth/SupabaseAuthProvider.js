"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthProvider = SupabaseAuthProvider;
exports.useSupabaseAuth = useSupabaseAuth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const supabaseClient_1 = require("../../lib/supabaseClient");
const AuthContext = (0, react_1.createContext)(undefined);
function mapSupabaseAuthError(error) {
    const normalizedMessage = error.message ?? '';
    const lowerMessage = normalizedMessage.toLowerCase();
    const status = typeof error.status === 'number' ? error.status : null;
    if (lowerMessage.includes('database error querying schema')) {
        return new Error('Supabase returned "Database error querying schema". This means your project database is missing the latest tables or policies. Open the Supabase SQL editor and run the SQL in supabase/migrations (or sql/manual.sql) to apply the schema, then try again.');
    }
    if (status === 500) {
        return new Error('Supabase responded with HTTP 500 while exchanging credentials (grant_type=password). This almost always happens when the latest tables, policies, or RPCs have not been applied. Run the SQL in supabase/migrations or sql/manual.sql inside the Supabase SQL editor, then rerun the sign-in.');
    }
    return error;
}
function ensureSupabaseAuthError(error) {
    if (error instanceof Error) {
        return mapSupabaseAuthError(error);
    }
    return mapSupabaseAuthError(new Error(String(error)));
}
function SupabaseAuthProvider({ children }) {
    const mode = 'supabase';
    const [session, setSession] = (0, react_1.useState)(null);
    const [initializing, setInitializing] = (0, react_1.useState)(true);
    const [supabaseError, setSupabaseError] = (0, react_1.useState)(null);
    const [supabase, setSupabase] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        try {
            setSupabase((0, supabaseClient_1.getSupabaseClient)());
            setSupabaseError(null);
        }
        catch (error) {
            setSupabase(null);
            setSupabaseError(error instanceof Error ? error : new Error('Failed to initialize Supabase client.'));
        }
    }, [mode]);
    (0, react_1.useEffect)(() => {
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
            if (!isMounted)
                return;
            const nextSession = data.session ?? null;
            setSession(nextSession);
            (0, supabaseClient_1.setSupabaseSession)(nextSession);
        })
            .finally(() => {
            if (isMounted) {
                setInitializing(false);
            }
        });
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            const normalizedSession = nextSession ?? null;
            setSession(normalizedSession);
            (0, supabaseClient_1.setSupabaseSession)(normalizedSession);
        });
        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [mode, supabase]);
    const signInWithPassword = (0, react_1.useCallback)(async (credentials) => {
        if (!supabase) {
            throw supabaseError ?? new Error('Supabase credentials are not configured.');
        }
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error)
            throw ensureSupabaseAuthError(error);
    }, [mode, supabase, supabaseError]);
    const signUpWithPassword = (0, react_1.useCallback)(async (credentials) => {
        if (!supabase) {
            throw supabaseError ?? new Error('Supabase credentials are not configured.');
        }
        const { error } = await supabase.auth.signUp(credentials);
        if (error)
            throw ensureSupabaseAuthError(error);
    }, [mode, supabase, supabaseError]);
    const signInWithOtp = (0, react_1.useCallback)(async (email) => {
        if (!supabase) {
            throw supabaseError ?? new Error('Supabase credentials are not configured.');
        }
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error)
            throw ensureSupabaseAuthError(error);
    }, [mode, supabase, supabaseError]);
    const signInWithGoogle = (0, react_1.useCallback)(async () => {
        if (!supabase) {
            throw supabaseError ?? new Error('Supabase credentials are not configured.');
        }
        const baseRedirectTo = (0, supabaseClient_1.getSupabaseRedirectUrl)() ?? 'https://habitgame.app/auth/callback.html';
        let redirectTo = baseRedirectTo;
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/conflict/join')) {
            try {
                const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                const redirectUrl = new URL(baseRedirectTo, window.location.origin);
                redirectUrl.searchParams.set('next', encodeURIComponent(next));
                redirectTo = redirectUrl.toString();
            }
            catch {
                // Fallback keeps default redirect URL if URL parsing fails.
                redirectTo = baseRedirectTo;
            }
        }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo },
        });
        if (error)
            throw ensureSupabaseAuthError(error);
    }, [mode, supabase, supabaseError]);
    const sendPasswordReset = (0, react_1.useCallback)(async (email) => {
        if (!supabase) {
            throw supabaseError ?? new Error('Supabase credentials are not configured.');
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error)
            throw ensureSupabaseAuthError(error);
    }, [mode, supabase, supabaseError]);
    const signOut = (0, react_1.useCallback)(async () => {
        if (!supabase) {
            throw supabaseError ?? new Error('Supabase credentials are not configured.');
        }
        const { error } = await supabase.auth.signOut();
        if (error)
            throw ensureSupabaseAuthError(error);
    }, [mode, supabase, supabaseError]);
    const value = (0, react_1.useMemo)(() => ({
        session,
        initializing,
        isConfigured: Boolean(supabase),
        isAuthenticated: Boolean(session),
        mode,
        client: supabase,
        signInWithPassword,
        signUpWithPassword,
        signInWithOtp,
        signInWithGoogle,
        sendPasswordReset,
        signOut,
    }), [
        session,
        initializing,
        mode,
        supabase,
        signInWithPassword,
        signUpWithPassword,
        signInWithOtp,
        signInWithGoogle,
        sendPasswordReset,
        signOut,
    ]);
    return (0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: value, children: children });
}
function useSupabaseAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (!context) {
        throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
    }
    return context;
}
