import React, { useState, useEffect, useMemo, type ComponentType } from 'react';
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
import { SafeErrorBoundary } from './components/SafeErrorBoundary.tsx';

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
const QUEST_VISUAL_SYSTEM_PREVIEW_PATH = '/dev/quest-journey-visual-system';

function QuestVisualSystemPreviewRoute() {
  const [Preview, setPreview] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('./features/quest-journey/QuestJourneyVisualSystemPreview').then((module) => {
      if (isMounted) {
        setPreview(() => module.default);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return Preview ? <Preview /> : null;
}


function RootCrashFallback() {
  return (
    <main
      role="alert"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#0a0e1a',
        color: '#f8fafc',
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      }}
    >
      <section
        style={{
          width: 'min(560px, 100%)',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          borderRadius: '24px',
          padding: '1.5rem',
          background: 'rgba(15, 23, 42, 0.86)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
        }}
      >
        <p style={{ margin: '0 0 0.5rem', color: '#93c5fd', fontWeight: 700 }}>
          HabitGame hit a startup snag
        </p>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem' }}>
          We kept the page from going blank.
        </h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#cbd5e1' }}>
          Refresh once to retry. If this keeps happening, open the app with <code>?debug=1</code>
          and share the latest “React root render failed” entry from the debugger.
        </p>
      </section>
    </main>
  );
}

function Root() {
  const isQuestVisualSystemPreviewRoute =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === QUEST_VISUAL_SYSTEM_PREVIEW_PATH;

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

  if (isQuestVisualSystemPreviewRoute) {
    return <QuestVisualSystemPreviewRoute />;
  }

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
    <SafeErrorBoundary
      fallback={<RootCrashFallback />}
      onError={(error, info) => {
        window.__LifeGoalAppDebugger?.error('React root render failed.', {
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
        });
      }}
    >
      <Root />
    </SafeErrorBoundary>
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
