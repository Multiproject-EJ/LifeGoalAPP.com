import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { registerServiceWorker } from './registerServiceWorker.ts';
import { SupabaseAuthProvider } from './features/auth/SupabaseAuthProvider.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { resolveRoute } from './routes/resolveRoute.ts';
import { WorldHome } from './world/WorldHome.tsx';

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
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function Root() {
  const [showApp, setShowApp] = useState(() => resolveRoute() !== 'world');
  const [loginOnEntry, setLoginOnEntry] = useState(false);
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
        installPromptAvailable={!!installPrompt}
        onInstallPrompt={async () => {
          if (installPrompt) {
            installPrompt.prompt();
            await installPrompt.userChoice;
            setInstallPrompt(null);
          }
        }}
      />
    );
  }

  // loginOnEntry is wired up and ready for Slice 3 to pass into <App />.
  void loginOnEntry;

  return (
    <ThemeProvider>
      <SupabaseAuthProvider>
        <App />
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
