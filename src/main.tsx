import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { registerServiceWorker } from './registerServiceWorker.ts';
import { SupabaseAuthProvider } from './features/auth/SupabaseAuthProvider.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { resolveRoute } from './routes/resolveRoute.ts';
import { WorldHome } from './world/WorldHome.tsx';
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

function Root() {
  const initialRoute = useMemo(() => resolveRoute(), []);
  const [showApp, setShowApp] = useState(() => initialRoute !== 'world');
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

  if (!showApp) {
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

  return (
    <ThemeProvider>
      <SupabaseAuthProvider>
        <App forceAuthOnMount={loginOnEntry} />
      </SupabaseAuthProvider>
    </ThemeProvider>
  );
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
