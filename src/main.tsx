import './index.css';
import './styles/theme.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { registerServiceWorker } from './registerServiceWorker.ts';
import { SupabaseAuthProvider } from './features/auth/SupabaseAuthProvider.tsx';

if (typeof window !== 'undefined') {
  window.__LifeGoalAppDebugger?.log('Initializing React root.', {
    mode: import.meta.env.MODE,
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SupabaseAuthProvider>
      <App />
    </SupabaseAuthProvider>
  </React.StrictMode>,
);

if (typeof window !== 'undefined') {
  window.__LifeGoalAppDebugger?.log('React root rendered successfully.', {
    strictMode: true,
  });
}

if (import.meta.env.PROD) {
  registerServiceWorker();
}
