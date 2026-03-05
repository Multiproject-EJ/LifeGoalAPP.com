import React, { useState } from 'react';
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

function Root() {
  const [showApp, setShowApp] = useState(() => resolveRoute() !== 'world');

  if (!showApp) {
    return <WorldHome onContinue={() => setShowApp(true)} />;
  }

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
