import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { registerServiceWorker } from './registerServiceWorker.ts';
import { SupabaseAuthProvider, useSupabaseAuth } from './features/auth/SupabaseAuthProvider.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { resolveRoute } from './routes/resolveRoute.ts';
import { WorldHome } from './world/WorldHome.tsx';
import { Lobby } from './world/Lobby.tsx';
import { TrustPage } from './world/TrustPage.tsx';
import type { BeforeInstallPromptEvent } from './world/useInstallState.ts';

if (typeof window !== 'undefined') {
  window.__LifeGoalAppDebugger?.log('Initializing React root.', {
    mode: import.meta.env.MODE,
  });

  const isIpadSizedTouchDevice =
    /iPad/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  if (isIpadSizedTouchDevice) {
    document.documentElement.classList.add('platform-ipad');
  }
}

// Extend the global Window interface for the BeforeInstallPromptEvent which is
// not yet part of the standard TypeScript lib.
// (Type is exported from ./world/useInstallState.ts and imported above.)

// Routes that render public (non-app) views.
const NON_APP_ROUTES = new Set(['world', 'lobby', 'privacy', 'terms', 'support']);

function Root() {
  const initialRoute = useMemo(() => resolveRoute(), []);
  const [showApp, setShowApp] = useState(() => {
    const shouldRenderAppByDefault = !NON_APP_ROUTES.has(initialRoute);
    if (shouldRenderAppByDefault) return true;

    if (typeof window === 'undefined') return false;
    const host = window.location.hostname.toLowerCase();
    const isPeacebetweenHost = host === 'peacebetween.com' || host === 'www.peacebetween.com';
    const isRootPath = window.location.pathname === '/';
    if (isPeacebetweenHost && isRootPath && initialRoute === 'world') {
      return true;
    }
    return false;
  });
  const [showLobby, setShowLobby] = useState(() => initialRoute === 'lobby');
  const [loginOnEntry, setLoginOnEntry] = useState(() => initialRoute === 'login');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!showApp && !showLobby) {
    if (initialRoute === 'privacy' || initialRoute === 'terms' || initialRoute === 'support') {
      return <TrustPage page={initialRoute} />;
    }
    return (
      <WorldHome
        onContinue={() => setShowApp(true)}
        onLogin={() => {
          setLoginOnEntry(true);
          setShowApp(true);
        }}
        beforeInstallPromptEvent={installPrompt}
      />
    );
  }

  if (showLobby) {
    return (
      <ThemeProvider>
        <SupabaseAuthProvider>
          <LobbyRoute
            onEnterApp={() => {
              setShowLobby(false);
              setShowApp(true);
            }}
          />
        </SupabaseAuthProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SupabaseAuthProvider>
        <App forceAuthOnMount={loginOnEntry} />
      </SupabaseAuthProvider>
    </ThemeProvider>
  );
}

/**
 * LobbyRoute — renders Lobby when authenticated, redirects to /login when not.
 * Must be rendered inside SupabaseAuthProvider.
 */
function LobbyRoute({ onEnterApp }: { onEnterApp: () => void }) {
  const { isAuthenticated, initializing, session } = useSupabaseAuth();

  useEffect(() => {
    if (!initializing && !isAuthenticated) {
      window.location.replace('/login?next=%2Flobby');
    }
  }, [initializing, isAuthenticated]);

  if (initializing) {
    // Minimal loading state — avoid flash of unauthenticated content.
    return null;
  }

  if (!isAuthenticated) {
    // Redirect is in-flight via useEffect above.
    return null;
  }

  const username = session?.user?.user_metadata?.full_name as string | undefined
    ?? session?.user?.email?.split('@')[0]
    ?? null;

  return <Lobby onEnterApp={onEnterApp} username={username} />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

if (typeof window !== 'undefined') {
  window.__LifeGoalAppDebugger?.log('React root rendered successfully.', {
    strictMode: true,
  });
}

if (import.meta.env.PROD) {
  registerServiceWorker();
}
