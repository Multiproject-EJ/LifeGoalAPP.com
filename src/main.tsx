import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './themes.css';
import { registerServiceWorker } from './registerServiceWorker.ts';
import { SupabaseAuthProvider } from './features/auth/SupabaseAuthProvider.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';

if (typeof window !== 'undefined') {
  window.__LifeGoalAppDebugger?.log('Initializing React root.', {
    mode: import.meta.env.MODE,
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <SupabaseAuthProvider>
        <App />
      </SupabaseAuthProvider>
    </ThemeProvider>
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
